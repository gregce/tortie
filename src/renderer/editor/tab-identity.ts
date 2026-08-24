/**
 * How an open request becomes a tab: its identity, and where its diff's LEFT
 * side lives. Pure — no store, no window, no IPC — because both answers are
 * decisions about the REQUEST, and both were round-1 defects worth pinning
 * down with tests (src/renderer/editor/__tests__/tab-identity.test.ts).
 */

import type { OpenFileRequest } from '../state/open-file';
import type { EditorTab } from './tab-types';
import { reviewTabTooltip } from '../machines/review';

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
 * The identity of a tab showing a file on another machine.
 *
 * PHASE 102 MOVED THIS RULE HERE. It was spelled inline in
 * `../editor/store.ts`, and Phase 102 gave a rename a second place that has to
 * compose the same string: a remote rename that rekeyed a tab to a bare
 * absolute path would collide with a local tab holding that path on this Mac
 * and destroy the rule below. Two copies of one rule is how one of them goes
 * stale, so there is one copy and both callers read it.
 *
 * THE THREE PARTS AND WHY EACH IS THERE. The machine is in the key because the
 * same path on two machines is two files. The repository root is in the key
 * because two folders on ONE machine can both hold `src/a.ts`, which research
 * 55 section 9.2 measured as one tab whose bytes were replaced by the second
 * read. The relative path is what is left.
 */
export function remoteTabId(
  machineId: string,
  repoPath: string,
  relPath: string
): string {
  return `machine:${machineId}:${repoPath}:${relPath}`;
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

/**
 * The line a tab's tooltip leads with, and its accessible identity.
 *
 * PHASE 73 FIX ROUND put it here, out of the tab strip's markup, for one
 * reason: a REVIEW tab's `path` is a path on ANOTHER COMPUTER, and the strip
 * showed it. That names a file this Mac may not have, and it may name a
 * different file this Mac does have. So a review tab is asked about FIRST, and
 * it answers with the machine and with the fact that the tab is read only,
 * because a diff tab in Tortie is usually a file a person can edit and this one
 * is not.
 *
 * The other four answers are the ones the strip has drawn since Phase 12 and
 * they are unchanged: a history tab wears its short SHA, a file that went away
 * says so, a working tree diff says what it is against, and everything else is
 * its own absolute path on this Mac.
 */
export function tabTooltipIdentity(tab: EditorTab): string {
  if (tab.remote !== undefined) {
    return reviewTabTooltip(tab.name, tab.remote.machineLabel);
  }
  if (tab.commit !== null) {
    const subject =
      tab.commit.subject !== undefined ? ` · ${tab.commit.subject}` : '';
    return `${tab.relPath} — ${tab.commit.shortSha}${subject}`;
  }
  if (tab.deleted) return 'Deleted on disk';
  if (tab.mode === 'diff' && tab.canDiff) return `${tab.name} — changes vs HEAD`;
  return tab.path;
}
