/**
 * How an open request becomes a tab: its identity, and where its diff's LEFT
 * side lives. Pure — no store, no window, no IPC — because both answers are
 * decisions about the REQUEST, and both were round-1 defects worth pinning
 * down with tests (src/renderer/editor/__tests__/tab-identity.test.ts).
 */

import type { OpenFileRequest } from '../state/open-file';

/**
 * The identity a request opens into: one tab per absolute path for the
 * worktree, one tab per `<sha>:<relPath>` for history. Keeping those apart
 * is the whole reason the store is keyed by `id` — a historical view and the
 * live file must be two tabs with two buffers, and closing one must not
 * dispose the other's model.
 */
export function tabIdFor(req: OpenFileRequest): string {
  // Phase 22. A context detail open is keyed by the ENTRY, not by the file, for
  // the same reason history is keyed by the commit: the same `SKILL.md` reached
  // from the tree and reached from the Context view are two different readings
  // of one file, and only one of them wears the header card. `entry.id` is
  // already `${category}|${identity}` and is stable across scans.
  const entryId = contextEntryId(req.contextEntry);
  if (entryId !== null) return `context:${entryId}`;
  return req.commit !== undefined
    ? `${req.commit.sha}:${req.relPath}`
    : req.path;
}

/**
 * The `id` of a context entry carried on a request, or null when there is none.
 *
 * The request types this field as `unknown`, because the open bus is shared with
 * five emitters that have never heard of a context entry. This is the one place
 * that narrows it, and it narrows by reading the one field identity depends on
 * rather than by asserting a shape.
 */
export function contextEntryId(value: unknown): string | null {
  if (value === null || typeof value !== 'object') return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Is this file INSIDE the repository the request names? (Phase 26 item 1.)
 *
 * This is the question that decides, at tab creation, whether the diff path
 * exists for a tab at all. Most context artifacts live OUTSIDE the project —
 * `~/.claude/skills/…` is the common case — and a file outside the repository
 * has no HEAD version: asking git about it can only produce a refusal, and
 * that refusal reached the operator raw. So the answer is computed once from
 * the request's own two paths, and every git-facing reader honours it instead
 * of catching git's refusal later.
 *
 * Deliberately NOT stored on the tab: `repoPath` and `path` are the source
 * facts and both live on the tab already, so a stored copy could only ever
 * drift from them (e.g. across a retarget after a move).
 */
export function fileInRepo(repoPath: string, path: string): boolean {
  if (repoPath.length === 0) return false;
  const root = repoPath.endsWith('/') ? repoPath : `${repoPath}/`;
  return path.startsWith(root);
}

/**
 * Where the diff's LEFT side lives, when that is not `relPath` — i.e. a
 * rename's pre-rename path. Two emitters know about renames and they say so
 * differently: history carries it on `commit.origPath` (from the commit's
 * `-M` name-status), the working tree on `origPath` (from porcelain-v2).
 * Both mean the same thing to every reader downstream, so they collapse to
 * one field here rather than at four call sites.
 *
 * Returns null for the ordinary case, including an empty string from either
 * source — `''` would ask git for the repo root and get nonsense back.
 */
export function leftPathFor(req: OpenFileRequest): string | null {
  const orig = req.commit?.origPath ?? req.origPath ?? '';
  return orig.length > 0 ? orig : null;
}
