/**
 * Pure SCM grouping logic — porcelain-v2 XY pairs → the four resource
 * groups. No imports with side effects: unit-testable in node (vitest).
 *
 * PHASE 103 ADDED A SECOND GROUPING RULE, for a folder on another machine.
 * It lives here rather than in the remote view for one reason: the two rules
 * read the same two characters and differ in three named ways, and a reader
 * comparing them should not have to open two files. {@link groupRemoteFiles}
 * is that rule and its differences are written above it.
 */

import type {
  GitFileState,
  GitFileStatus,
  GitStatusResult
} from '@shared/types';
import type { MachineReviewFile } from '@shared/ipc';

/** The four SCM resource groups, in render order. */
export interface ScmGroups {
  merge: GitFileStatus[];
  staged: GitFileStatus[];
  changes: GitFileStatus[];
  untracked: GitFileStatus[];
}

/**
 * True when the XY pair marks a merge conflict (porcelain v2 unmerged).
 *
 * PHASE 103 WIDENED THE PARAMETER AND CHANGED NOT ONE LINE OF THE BODY. It
 * used to take `GitFileStatus`, which is a shape from this Mac. It now takes
 * the two characters it actually reads, so a changed file on another machine
 * can be asked the same question. `GitFileStatus` still satisfies it and so
 * does `MachineReviewFile`.
 */
export function isConflict(f: {
  indexState: GitFileState;
  worktreeState: GitFileState;
}): boolean {
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

/**
 * Split the tracked rows of a folder on ANOTHER machine into Staged and
 * Changes (Phase 103).
 *
 * WHY THIS IS NOT `groupFiles`. Three differences, and each of them is a rule
 * this phase set rather than a detail.
 *
 *  1. There is no Merge group on a remote tab, and this phase does not build
 *     one. `groupFiles` sends a conflicted row to Merge and stops. Doing that
 *     here would drop the file off the panel, because nothing draws a Merge
 *     group for a machine. Dropping the branch instead would put a `UU` file
 *     in Staged and in Changes at once, because both of its characters are not
 *     `.`. So a conflicted row goes to Changes and to nowhere else, and the
 *     view offers it neither verb.
 *  2. There is no Untracked group here either. A file git is not yet tracking
 *     arrives in `MachineReviewList.untracked`, which is an array of its own
 *     with a count of its own, so this function never sees one. A row whose
 *     index character is `?` or `!` is dropped rather than grouped, because it
 *     reached the wrong array.
 *  3. It takes a readonly array, which is what the store holds.
 *
 * WHAT IT KEEPS. A file edited twice, being one edit staged and one not, is in
 * Staged AND in Changes, exactly as the local panel draws it and exactly as VS
 * Code draws it. Both arrays are sorted by path.
 */
export function groupRemoteFiles(files: readonly MachineReviewFile[]): {
  staged: MachineReviewFile[];
  changes: MachineReviewFile[];
} {
  const staged: MachineReviewFile[] = [];
  const changes: MachineReviewFile[] = [];
  for (const f of files) {
    if (isConflict(f)) {
      changes.push(f);
      continue;
    }
    if (f.indexState === '?' || f.indexState === '!') continue;
    if (f.indexState !== '.') staged.push(f);
    if (f.worktreeState !== '.') changes.push(f);
  }
  const byPath = (a: MachineReviewFile, b: MachineReviewFile): number =>
    a.path.localeCompare(b.path);
  staged.sort(byPath);
  changes.sort(byPath);
  return { staged, changes };
}
