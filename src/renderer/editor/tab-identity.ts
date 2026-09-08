/**
 * How an open request becomes a tab: its identity, and where its diff's LEFT
 * side lives. Pure — no store, no window, no IPC — because both answers are
 * decisions about the REQUEST, and both were round-1 defects worth pinning
 * down with tests (src/renderer/editor/__tests__/tab-identity.test.ts).
 */

import { targetOfRootKey } from '@shared/workspace-target';
import type { OpenFileRequest } from '../state/open-file';
import type { EditorTab } from './tab-types';
import { reviewTabTooltip } from '../machines/review';
import { compareTabTooltip } from './save-sentences';

/**
 * The identity a request opens into: one tab per absolute path for the
 * worktree, one tab per `<sha>:<relPath>` for history. Keeping those apart
 * is the whole reason the store is keyed by `id` — a historical view and the
 * live file must be two tabs with two buffers, and closing one must not
 * dispose the other's model.
 */
export function tabIdFor(req: OpenFileRequest): string {
  // Phase 160. The map tab is keyed by the REPOSITORY, because the map is a
  // reading of the whole repository rather than of any file in it. One
  // repository has exactly one map tab, so pressing the pane's control a
  // second time focuses the tab that is already open instead of opening a
  // twin, which is the same rule `context:` and `machine:` ids follow.
  if (req.archMap !== undefined) return archMapTabId(req.archMap.repoPath);
  // Phase 163. The diagnostics report is about the whole app, not about any
  // repository or file, so it has one identity for the whole app. A second
  // ask from the Help menu or from Settings focuses the tab that is open.
  if (req.diagnostics !== undefined) return DIAGNOSTICS_TAB_ID;
  // Phase 22. A context detail open is keyed by the ENTRY, not by the file, for
  // the same reason history is keyed by the commit: the same `SKILL.md` reached
  // from the tree and reached from the Context view are two different readings
  // of one file, and only one of them wears the header card. `entry.id` is
  // already `${category}|${identity}` and is stable across scans.
  // PHASE 240. A comparison of two strings is keyed by the FILE they are two
  // versions of, so pressing Compare a second time on the same refused save
  // replaces the sides in the tab that is already open rather than stacking a
  // second one. It is asked before the context rule because a Compare of a
  // context detail tab's file is still a comparison and never a detail card.
  if (req.compare !== undefined) return compareTabId(req.path);
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
 * PHASE 233. The identity of a tab showing one file OF ONE COMMIT on another
 * machine.
 *
 * It is `remoteTabId` with the commit in it, for the reason the local history
 * id carries the sha: a file as it was at one commit and the same file's
 * working copy on that machine are two readings with two buffers, and the
 * review tab of `src/a.ts` must not be replaced by the history tab of it.
 * The tab follower never rekeys a commit tab, so a rename over there leaves
 * this id alone, which is right, because history is immutable.
 */
export function remoteCommitTabId(
  machineId: string,
  repoPath: string,
  sha: string,
  relPath: string
): string {
  return `machine:${machineId}:${repoPath}:${sha}:${relPath}`;
}

/**
 * The identity of a repository's ARCHITECTURE MAP tab (Phase 160), and the
 * name the strip shows on it.
 *
 * The id carries the repository root for the reason `remoteTabId` carries one:
 * two project tabs are two repositories, and each one's map is its own tab.
 * The name is a constant rather than the folder's name because the tab shows a
 * drawing of the repository, not a file called anything, and the tooltip below
 * names the repository in full for the case where two projects both have a map
 * open.
 */
export const ARCH_MAP_TAB_NAME = 'Architecture map';

export function archMapTabId(repoPath: string): string {
  return `arch-map:${repoPath}`;
}

/**
 * The identity of the DIAGNOSTICS REPORT tab (Phase 163), and the name the
 * strip shows on it.
 *
 * One id for the whole app rather than one per repository, because the report
 * describes Tortie's own processes and every session it runs, none of which
 * belongs to a project. The name is a constant for the reason the map's is:
 * the tab shows a report, not a file called anything.
 */
export const DIAGNOSTICS_TAB_NAME = 'Diagnostics report';

export const DIAGNOSTICS_TAB_ID = 'diagnostics:report';

/**
 * The identity of a COMPARE tab (Phase 240), one file's disk version against
 * the unsaved version in the editor.
 *
 * Keyed by the file, for the reason the map tab is keyed by the repository: a
 * person who presses Compare, reads it, presses Cancel, types more and presses
 * Save again wants the SAME tab to say the new answer, not a pile of them. The
 * `compare:` prefix keeps it away from the worktree tab of that path, whose id
 * is the bare path, exactly as `context:` and `machine:` do.
 */
export function compareTabId(path: string): string {
  return `compare:${path}`;
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
  // PHASE 240. A compare tab's `path` names the live file, and the tab is not
  // that file: it is two versions of it, neither of which is on disk. Asked
  // first, for the map tab's reason.
  if (tab.compare !== undefined) return compareTabTooltip(tab.compare.fileName);
  // Phase 160. The map tab's `path` is a repository root rather than a file,
  // so the tooltip says what the tab is and which repository it draws instead
  // of showing a directory path that reads as a file that will not open.
  if (tab.archMap !== undefined) {
    // PHASE 234. The map tab is keyed by folder AND computer, so the tooltip
    // reads the folder back out of the key rather than printing the key. A
    // folder on this Mac reads as its own path, which is what it always was.
    const folder = targetOfRootKey(tab.archMap.repoPath).path;
    return `The architecture map of ${folder}. Redrawn from the code, so closing it loses nothing.`;
  }
  // Phase 163. The report tab's `path` is whatever project was active when it
  // opened, which says nothing about the tab. The tooltip says what it is.
  if (tab.diagnostics !== undefined) {
    return 'What Tortie is running right now. One capture, taken when you asked for it, so closing it loses nothing.';
  }
  // PHASE 233. A tab carrying BOTH is one file of one COMMIT on that machine,
  // and it wears the history line rather than the review one. The review
  // line's second sentence says the view is read only, which is true of a
  // commit tab on either computer and which the local commit tab does not
  // say; drawing it here and not there would be a sentence a person reads
  // only because the folder is on another machine.
  if (tab.remote !== undefined && tab.commit === null) {
    return reviewTabTooltip(tab.name, tab.remote.machineLabel);
  }
  if (tab.commit !== null) {
    const subject =
      tab.commit.subject !== undefined ? ` · ${tab.commit.subject}` : '';
    return `${tab.relPath} — ${tab.commit.shortSha}${subject}`;
  }
  if (tab.deleted) return 'Deleted on disk';
  if (tab.mode === 'diff' && tab.canDiff) return `${tab.name} — changes vs HEAD`;
  if (tab.mode === 'redline' && tab.canDiff) return `${tab.name}, redline vs HEAD`;
  return tab.path;
}
