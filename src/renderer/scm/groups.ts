/**
 * Pure SCM grouping logic — porcelain-v2 XY pairs → the four resource
 * groups. No imports with side effects: unit-testable in node (vitest).
 */

import type { GitFileStatus, GitStatusResult } from '@shared/types';

/** The four SCM resource groups, in render order. */
export interface ScmGroups {
  merge: GitFileStatus[];
  staged: GitFileStatus[];
  changes: GitFileStatus[];
  untracked: GitFileStatus[];
}

/** True when the XY pair marks a merge conflict (porcelain v2 unmerged). */
export function isConflict(f: GitFileStatus): boolean {
  return (
    f.indexState === 'U' ||
    f.worktreeState === 'U' ||
    (f.indexState === 'A' && f.worktreeState === 'A') ||
    (f.indexState === 'D' && f.worktreeState === 'D')
  );
}

/**
 * Split porcelain-v2 XY pairs into the four SCM groups. A file with both
 * staged and unstaged edits (e.g. XY = MM) appears in Staged AND Changes,
 * exactly like VS Code.
 */
export function groupFiles(files: GitFileStatus[]): ScmGroups {
  const groups: ScmGroups = {
    merge: [],
    staged: [],
    changes: [],
    untracked: []
  };
  for (const f of files) {
    if (isConflict(f)) {
      groups.merge.push(f);
      continue;
    }
    if (f.indexState === '?' || f.worktreeState === '?') {
      groups.untracked.push(f);
      continue;
    }
    if (f.indexState === '!' || f.worktreeState === '!') continue; // ignored
    if (f.indexState !== '.') groups.staged.push(f);
    if (f.worktreeState !== '.') groups.changes.push(f);
  }
  const byPath = (a: GitFileStatus, b: GitFileStatus): number =>
    a.path.localeCompare(b.path);
  groups.merge.sort(byPath);
  groups.staged.sort(byPath);
  groups.changes.sort(byPath);
  groups.untracked.sort(byPath);
  return groups;
}

/** Total dirty-file count for the branch header `● n`. */
export function dirtyCount(status: GitStatusResult | null): number {
  if (!status) return 0;
  return status.files.length;
}
