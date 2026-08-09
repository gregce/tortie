/**
 * Git decorations for the file tree — VS Code decorationProvider model,
 * as pure functions over the porcelain-v2 status list.
 *
 * - File badge: ONE letter + git color derived from the XY pair.
 * - Folder propagation: every ancestor directory of a decorated file gets a
 *   4px `--git-modified` dot (ignored files do not propagate).
 *
 * The status source is pluggable: `buildStatusIndex` accepts any
 * `GitFileStatus[]`, so the SCM store's status map drops in unchanged
 * (see git-status.ts for the integrator note).
 */

import type { GitFileStatus } from '@shared/types';

export interface TreeDecoration {
  /** Single status letter shown at the row's right edge (mono 11px). */
  letter: string;
  /** CSS custom property name carrying the git color (e.g. '--git-modified'). */
  colorVar: string;
  /** Strike the filename (deletions). */
  strike: boolean;
}

export interface StatusIndex {
  /** repo-relative file path → status. */
  byPath: ReadonlyMap<string, GitFileStatus>;
  /** repo-relative directory paths that contain decorated descendants. */
  dirtyDirs: ReadonlySet<string>;
}

export const EMPTY_STATUS_INDEX: StatusIndex = {
  byPath: new Map(),
  dirtyDirs: new Set()
};

/** True when the file is ignored (dim name, no badge, no propagation). */
export function isIgnored(status: GitFileStatus): boolean {
  return status.indexState === '!' || status.worktreeState === '!';
}

/** True when the file is untracked (badge U, opens plain — no HEAD side). */
export function isUntracked(status: GitFileStatus): boolean {
  return status.worktreeState === '?' || status.indexState === '?';
}

/** Badge + color for one file, or null (unchanged / ignored). */
export function decorationFor(
  status: GitFileStatus | undefined
): TreeDecoration | null {
  if (status === undefined || isIgnored(status)) return null;
  const { indexState: x, worktreeState: y } = status;

  // Merge conflicts first: any U side, or the both-added / both-deleted pairs.
  if (
    x === 'U' ||
    y === 'U' ||
    (x === 'A' && y === 'A') ||
    (x === 'D' && y === 'D')
  ) {
    return { letter: '!', colorVar: '--git-conflict', strike: false };
  }
  if (isUntracked(status)) {
    return { letter: 'U', colorVar: '--git-added', strike: false };
  }
  if (x === 'D' || y === 'D') {
    return { letter: 'D', colorVar: '--git-deleted', strike: true };
  }
  if (x === 'R' || y === 'R') {
    return { letter: 'R', colorVar: '--git-renamed', strike: false };
  }
  if (x === 'C' || y === 'C') {
    return { letter: 'C', colorVar: '--git-renamed', strike: false };
  }
  if (x === 'A') {
    return { letter: 'A', colorVar: '--git-added', strike: false };
  }
  if (x === 'M' || y === 'M') {
    return { letter: 'M', colorVar: '--git-modified', strike: false };
  }
  return null; // '.' on both sides — unchanged
}

/**
 * How clicking the file should open it (P4): tracked changes diff against
 * HEAD; untracked/ignored/clean files open plain.
 */
export function openModeFor(
  status: GitFileStatus | undefined
): 'diff' | 'plain' {
  if (status === undefined || isIgnored(status) || isUntracked(status)) {
    return 'plain';
  }
  return decorationFor(status) === null ? 'plain' : 'diff';
}

/** Every ancestor directory of `relPath` ('' excluded — the root has no row). */
function ancestorDirs(relPath: string): string[] {
  const out: string[] = [];
  let end = relPath.lastIndexOf('/');
  while (end > 0) {
    out.push(relPath.slice(0, end));
    end = relPath.lastIndexOf('/', end - 1);
  }
  return out;
}

/** Index a porcelain status list for O(1) row lookups. */
export function buildStatusIndex(files: readonly GitFileStatus[]): StatusIndex {
  const byPath = new Map<string, GitFileStatus>();
  const dirtyDirs = new Set<string>();
  for (const file of files) {
    byPath.set(file.path, file);
    if (isIgnored(file) || decorationFor(file) === null) continue;
    for (const dir of ancestorDirs(file.path)) dirtyDirs.add(dir);
  }
  return { byPath, dirtyDirs };
}
