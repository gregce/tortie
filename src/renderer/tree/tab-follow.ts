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
 * PHASE 102 ADDED THE MACHINE. A rename on another machine moves paths over
 * there, and a remote tab's `id` is not an absolute path: it is
 * `machine:<machineId>:<repoPath>:<relPath>`, composed by `remoteTabId` in
 * editor/tab-identity.ts. Two rules follow and both are here rather than in the
 * caller. A move that names a machine matches only tabs on that machine and in
 * that folder, and a move that names none matches only tabs on this Mac. A
 * matched remote tab is rekeyed through `remoteTabId` rather than onto the bare
 * path, which would collide with a local tab holding that same path here.
 *
 * HISTORY TABS ARE NEVER TOUCHED. A `<sha>:<relPath>` tab shows one file as it
 * was at one commit; renaming the working copy does not change history, and
 * those bytes still live in the object database under the old name.
 */

import type { EditorTab } from '../editor/store';
import { remoteTabId } from '../editor/tab-identity';

/** One completed move, in absolute paths on whichever computer holds them. */
export interface FollowMove {
  from: string;
  to: string;
  /**
   * PHASE 102. Whether descendants move too.
   *
   * `pathAfterMove` does prefix arithmetic for descendants only when this reads
   * `'dir'`, so a folder rename reported as `'file'` leaves every open tab
   * beneath it pointing at a path that is no longer there.
   *
   * WHERE IT COMES FROM on a remote rename, stated plainly. The renderer reads
   * it off the tree row, main echoes that same value back in the answer, and no
   * program on the machine measures it. So this field is as fresh as the last
   * read of that folder and no fresher.
   */
  kind: 'file' | 'dir';
  /**
   * PHASE 102. The machine and the folder this move happened on, or absent for
   * a move on this Mac.
   *
   * It decides two things. Which tabs the move may touch at all, and how a
   * touched tab's identity is composed. Both are in `planTabFollow` below.
   */
  machine?: { machineId: string; repoPath: string };
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
 *
 * PHASE 102 ADDED THE THIRD ARGUMENT. A tab on another machine keeps a machine
 * shaped id, composed by the one function that owns that format. Passing no
 * machine gives the tab the bare absolute path, which is what a tab on this Mac
 * has always had.
 */
export function retargetTab(
  tab: EditorTab,
  toAbs: string,
  machine?: { machineId: string; repoPath: string }
): EditorTab {
  const relPath = relOf(machine?.repoPath ?? tab.repoPath, toAbs);
  return {
    ...tab,
    id:
      machine === undefined
        ? toAbs
        : remoteTabId(machine.machineId, machine.repoPath, relPath),
    path: toAbs,
    relPath,
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

/**
 * PHASE 102. May this move touch this tab at all, before any path is compared?
 *
 * THE ANSWER IS THE COMPUTER FIRST AND THE PATH SECOND. In the probes for these
 * phases the far side IS this Mac, so `/tmp/p102/a.ts` names a real file here
 * as well as there, and comparing paths first would move a local tab for a
 * rename that happened on a machine. A remote move also has to name the same
 * folder as the tab, because two folders on one machine can both hold
 * `src/a.ts`.
 */
function moveTouches(tab: EditorTab, move: FollowMove): boolean {
  if (move.machine === undefined) return tab.remote === undefined;
  return (
    tab.remote !== undefined &&
    tab.remote.machineId === move.machine.machineId &&
    tab.remote.repoPath === move.machine.repoPath
  );
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
      if (!moveTouches(tab, move)) continue;
      const next = pathAfterMove(tab.path, move);
      if (next === null || next === tab.path) continue;
      const retargetedTab = retargetTab(tab, next, move.machine);
      if (retargetedTab.id === tab.id) continue;
      rekeys.push({ from: tab.id, to: retargetedTab.id });
      movedIndices.add(index);
      return retargetedTab;
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
