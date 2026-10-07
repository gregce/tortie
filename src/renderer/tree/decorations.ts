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

import type {
  FileTreeRowDecoration,
  FileTreeRowDecorationContext,
  GitStatus,
  GitStatusEntry
} from '@pierre/trees';
import type { GitFileStatus } from '@shared/types';
import { toCanonical, toRel } from './tree-paths';

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
 *  - PHASE 343. Git lists a link as a FILE (`?? newLink`), and the tree draws
 *    a link to a folder as the folder row `newLink/`. `linkFolders`, REQUIRED,
 *    is the canonical spelling of every such row, and a porcelain path that
 *    names one is keyed onto it, so the mark lands on the row that is drawn.
 *    `byPath` keeps git's own spelling, because the open-mode rule asks it by
 *    the rel path. Git never lists a path under a link, so nothing else moves.
 */
export function treeGitLane(
  statusFiles: readonly GitFileStatus[],
  ignoredPaths: Iterable<string>,
  linkFolders: ReadonlySet<string>
): TreeGitLane {
  const entries: GitStatusEntry[] = [];
  const conflicts = new Set<string>();
  const byPath = new Map<string, GitFileStatus>();
  const changed: string[] = [];
  const laned = new Set<string>();
  for (const file of statusFiles) {
    byPath.set(file.path, file);
    const status = pierreGitStatus(file);
    if (status === null) continue;
    const path = linkFolders.has(file.path + '/') ? file.path + '/' : file.path;
    entries.push({ path, status });
    laned.add(path);
    changed.push(path);
    if (isConflicted(file)) conflicts.add(path);
  }
  for (const path of ignoredPaths) {
    if (byPath.has(path) || laned.has(path)) continue;
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

/**
 * PHASE 343. The mark a link row wears, VS Code's own letter for a link
 * (`explorerDecorationsProvider.ts`): U+2937, ARROW POINTING DOWNWARDS THEN
 * CURVING RIGHTWARDS.
 */
export const LINK_MARK = '\u2937';

/**
 * The one custom decoration a row may carry (the library gives it one lane).
 *
 * A merge conflict's `!` in `--git-conflict` wins the lane, as it always has.
 * Otherwise (PHASE 343) every LINK row, folder or leaf, carries `⤷` in the
 * muted text colour, titled `Link`. A chain row (`.claude/skills` drawn as one
 * row) is marked when any folder it names is a link. `linkRows` is the
 * canonical spelling of every link row (`TreeLinks.rows`).
 */
export function treeRowDecoration(
  ctx: Pick<FileTreeRowDecorationContext, 'item'> & {
    row: Pick<FileTreeRowDecorationContext['row'], 'flattenedSegments'>;
  },
  conflicts: ReadonlySet<string>,
  linkRows: ReadonlySet<string>
): FileTreeRowDecoration | null {
  if (conflicts.has(ctx.item.path)) {
    return {
      text: '!',
      title: 'Merge conflict',
      parts: [{ text: '!', color: 'var(--git-conflict)' }]
    };
  }
  if (linkRows.size === 0) return null;
  const named = [
    ctx.item.path,
    ...(ctx.row.flattenedSegments ?? []).map((segment) => segment.path)
  ];
  const isLink = named.some(
    (path) =>
      linkRows.has(path) ||
      linkRows.has(toCanonical(toRel(path), ctx.item.kind === 'directory'))
  );
  if (!isLink) return null;
  return {
    text: LINK_MARK,
    title: 'Link',
    parts: [{ text: LINK_MARK, color: 'var(--text-muted)' }]
  };
}
