/**
 * Git status mapping for the file tree — pure functions over the
 * porcelain-v2 XY pairs.
 *
 * Phase 11: rendering (badge letter, name tint, folder dot propagation)
 * moved into @pierre/trees' built-in git lane. What lives here is the
 * mapping from gmux's `GitFileStatus` onto Pierre's `GitStatus` vocabulary
 * plus the open-mode rule (diff vs plain) the click gesture needs.
 *
 * Pierre has no 'conflict' state: conflicted files ride the modified lane
 * (tint + folder propagation) and PierreFileTree adds a '!' row decoration
 * in --git-conflict on top (see FileTree.tsx).
 */

import type { GitStatus, GitStatusEntry } from '@pierre/trees';
import type { GitFileStatus } from '@shared/types';

/** True when the file is ignored (dim row, no badge — Pierre 'ignored'). */
export function isIgnored(status: GitFileStatus): boolean {
  return status.indexState === '!' || status.worktreeState === '!';
}

/** True when the file is untracked (opens plain — there is no HEAD side). */
function isUntracked(status: GitFileStatus): boolean {
  return status.worktreeState === '?' || status.indexState === '?';
}

/** Merge conflicts: any U side, or the both-added / both-deleted pairs. */
export function isConflicted(status: GitFileStatus): boolean {
  const { indexState: x, worktreeState: y } = status;
  return (
    x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')
  );
}

/**
 * Pierre git-lane status for one file, or null (unchanged — '.' both sides).
 * Precedence mirrors the old badge logic: conflict, untracked, D, R/C, A, M.
 */
export function pierreGitStatus(
  status: GitFileStatus | undefined
): GitStatus | null {
  if (status === undefined) return null;
  if (isIgnored(status)) return 'ignored';
  if (isConflicted(status)) return 'modified';
  if (isUntracked(status)) return 'untracked';
  const { indexState: x, worktreeState: y } = status;
  if (x === 'D' || y === 'D') return 'deleted';
  if (x === 'R' || y === 'R' || x === 'C' || y === 'C') return 'renamed';
  if (x === 'A') return 'added';
  if (x === 'M' || y === 'M') return 'modified';
  return null;
}

/** Everything the tree feeds @pierre/trees' git lane for one render. */
export interface TreeGitLane {
  /** What `model.setGitStatus` is given. */
  entries: GitStatusEntry[];
  /** Files that get the '!' overlay (Pierre has no conflict status). */
  conflicts: Set<string>;
  /** Porcelain row per path, for the open-mode rule. */
  byPath: Map<string, GitFileStatus>;
  /** Paths carrying a real change, for the dirty-descendant dot. */
  changed: string[];
}

/**
 * Build the git lane from the porcelain list and the ignored set (Phase 47).
 *
 * Two rules, both pinned by tests rather than by reading a tree:
 *  - Porcelain wins any collision. In practice there is none: `check-ignore`
 *    never reports a tracked file and `git status -uall` never lists an
 *    ignored one, so the guard is only here so a future change cannot make
 *    an ignored entry quietly outrank a modified one.
 *  - Ignored paths keep the spelling they were asked in, which for a
 *    directory means the trailing '/'. That slash is what tells the library
 *    the entry is a directory, and a directory is what lets it dim the whole
 *    subtree without a single further question to git.
 */
export function treeGitLane(
  statusFiles: readonly GitFileStatus[],
  ignoredPaths: Iterable<string>
): TreeGitLane {
  const entries: GitStatusEntry[] = [];
  const conflicts = new Set<string>();
  const byPath = new Map<string, GitFileStatus>();
  const changed: string[] = [];
  for (const file of statusFiles) {
    byPath.set(file.path, file);
    const status = pierreGitStatus(file);
    if (status === null) continue;
    entries.push({ path: file.path, status });
    changed.push(file.path);
    if (isConflicted(file)) conflicts.add(file.path);
  }
  for (const path of ignoredPaths) {
    if (byPath.has(path)) continue;
    entries.push({ path, status: 'ignored' });
  }
  return { entries, conflicts, byPath, changed };
}

/**
 * How clicking the file should open it (P4): tracked changes diff against
 * HEAD; untracked/ignored/clean files open plain.
 */
export function openModeFor(
  status: GitFileStatus | undefined
): 'diff' | 'plain' {
  const mapped = pierreGitStatus(status);
  return mapped === null || mapped === 'untracked' || mapped === 'ignored'
    ? 'plain'
    : 'diff';
}
