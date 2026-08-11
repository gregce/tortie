/**
 * WHICH open editor tabs a completed file operation moves, and where to.
 *
 * Pure, and deliberately separate from the module that applies it: tab
 * identity is PATH-KEYED (editor/tab-identity.ts — a worktree tab's `id` IS
 * its absolute path), which makes a rename a genuine hazard. Leave the tab
 * alone and it keeps a handle on a path that no longer exists: the watcher
 * marks it deleted, ⌘S writes the file back into existence under the old
 * name, and re-opening from the tree mints a SECOND tab onto the same bytes.
 * All three are data-loss shapes, so the rules live where a test can reach
 * them without a store, a window, or Monaco.
 *
 * HISTORY TABS ARE NEVER TOUCHED. A `<sha>:<relPath>` tab shows one file as it
 * was at one commit; renaming the working copy does not change history, and
 * those bytes still live in the object database under the old name.
 */

import type { EditorTab } from '../editor/store';

/** One completed on-disk move, in absolute paths. */
export interface FollowMove {
  from: string;
  to: string;
  kind: 'file' | 'dir';
}

/** Absolute → root-relative, for the tab's git-facing `relPath`. */
function relOf(repoPath: string, abs: string): string {
  return abs.startsWith(repoPath + '/') ? abs.slice(repoPath.length + 1) : abs;
}

function baseName(abs: string): string {
  const slash = abs.lastIndexOf('/');
  return slash === -1 ? abs : abs.slice(slash + 1);
}

/**
 * The path a tab lands on after `move`, or null when the move does not touch
 * it. A folder move carries every descendant, so this is prefix arithmetic.
 */
export function pathAfterMove(path: string, move: FollowMove): string | null {
  if (move.kind === 'file') return path === move.from ? move.to : null;
  if (path === move.from) return move.to;
  const prefix = move.from.endsWith('/') ? move.from : move.from + '/';
  if (!path.startsWith(prefix)) return null;
  const to = move.to.endsWith('/') ? move.to.slice(0, -1) : move.to;
  return `${to}/${path.slice(prefix.length)}`;
}

/**
 * Rewrite one tab onto its new path. The buffer, its dirty state, its undo
 * stack and the cursor are untouched — the bytes did not move, only the name.
 */
export function retargetTab(tab: EditorTab, toAbs: string): EditorTab {
  return {
    ...tab,
    id: toAbs,
    path: toAbs,
    relPath: relOf(tab.repoPath, toAbs),
    name: baseName(toAbs),
    // The diff's LEFT side still lives at the OLD path in HEAD — git only
    // learns about the rename once the change is staged or committed, and
    // `git show HEAD:<new path>` would come back empty and read as a
    // whole-file addition. Recording the pre-rename path here is exactly what
    // porcelain-v2 will report for this file on the next status.
    origRelPath: tab.origRelPath ?? (tab.canDiff ? tab.relPath : null)
  };
}

export interface TabFollowPlan {
  /** The whole tab list, after following. */
  tabs: EditorTab[];
  /** Identity changes the Monaco model registry has to make too. */
  rekeys: { from: string; to: string }[];
}

/** Which tabs move where, and which one a confirmed overwrite displaced. */
export function planTabFollow(
  tabs: readonly EditorTab[],
  moves: readonly FollowMove[]
): TabFollowPlan {
  const rekeys: { from: string; to: string }[] = [];
  const movedIndices = new Set<number>();

  const retargeted = tabs.map((tab, index) => {
    if (tab.commit !== null) return tab; // history: immutable by definition
    for (const move of moves) {
      const next = pathAfterMove(tab.path, move);
      if (next === null || next === tab.path) continue;
      rekeys.push({ from: tab.id, to: next });
      movedIndices.add(index);
      return retargetTab(tab, next);
    }
    return tab;
  });

  if (rekeys.length === 0) return { tabs: [...tabs], rekeys };

  // A confirmed overwrite trashed whatever used to sit at the destination.
  // Its tab now points at bytes in the Trash AND would collide with the
  // arriving tab's identity, so it goes. The overwrite was confirmed by name,
  // so nothing here is silent.
  const arriving = new Set(rekeys.map((r) => r.to));
  const survivors = retargeted.filter(
    (tab, index) => movedIndices.has(index) || !arriving.has(tab.id)
  );

  return { tabs: survivors, rekeys };
}
