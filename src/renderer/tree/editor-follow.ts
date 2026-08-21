/**
 * Apply a completed file operation to the open editor tabs.
 *
 * The RULES live in tab-follow.ts (pure); this is the two-store handshake
 * that carries them out: the tab list gets the new identities, and the Monaco
 * registry — keyed by the very same id — gets its model and view state moved
 * across so the buffer, its dirty flag, its undo stack and the cursor all
 * survive a rename.
 *
 * WHY IT LIVES IN tree/ AND NOT IN editor/: the rule it encodes is "a file
 * operation must not orphan a tab", which is this stream's obligation, and
 * keeping it here means the editor stream's own files stay untouched while
 * both phases are built in parallel. It reaches the editor through the
 * store's public `setState` and one loader primitive; if the editor ever
 * grows a first-class rename verb, this becomes its caller.
 */

import { useEditor } from '../editor/store';
import { rekeyTabResources } from '../editor/monaco-loader';
import { planTabFollow } from './tab-follow';
import type { FollowMove } from './tab-follow';

export type { FollowMove } from './tab-follow';

/**
 * Carry every affected open tab across a completed set of moves.
 *
 * Called AFTER main confirms the rename/move, never optimistically: a tab
 * pointing at a file that was never renamed is worse than one that follows a
 * beat late.
 *
 * PHASE 102. A move may now carry a `machine`, and this function passes it
 * through untouched. Every rule it decides is in `planTabFollow`, being which
 * tabs the move may touch and how a touched tab's id is composed. The two
 * stores below are keyed by that id, so `rekeyTabResources` moves the Monaco
 * model across for a tab on another machine exactly as it does for one here.
 */
export function followMoves(moves: readonly FollowMove[]): void {
  if (moves.length === 0) return;

  useEditor.setState((state) => {
    const { tabs, rekeys } = planTabFollow(state.tabs, moves);
    if (rekeys.length === 0) return {};

    for (const { from, to } of rekeys) rekeyTabResources(from, to);

    const followedActive =
      rekeys.find((r) => r.from === state.activeId)?.to ?? state.activeId;
    const stillOpen = tabs.some((t) => t.id === followedActive);

    return {
      tabs,
      activeId: stillOpen ? followedActive : (tabs.at(-1)?.id ?? null)
    };
  });
}
