/**
 * The words the clone dialog says that no other process needs (Phase 18.6).
 *
 * The ten failure sentences are NOT here. They live in `@shared/clone-copy`,
 * because main writes the same sentences into the terminal frame and two
 * copies of that table would drift. What is left is copy the renderer alone
 * produces: the name of each git phase, the line under the address while it is
 * being checked, and the line after a cancel.
 *
 * Sentence case, no exclamation marks, DESIGN.md §7.
 */

import type { ClonePhase } from '@shared/ipc';

/**
 * What Tortie calls each of git's phases (research 35 §3.10).
 *
 * Five words for seven phases, and the collapsing is deliberate on one side
 * and forbidden on the other. Enumerating and counting are one word because
 * they are one piece of work the server does before it sends anything. The
 * rest stay distinct because THE WORD CHANGING IS WHAT TELLS THE USER THE BAR
 * RESET. Collapse two phases that both carry a percentage and the bar drops
 * back to zero under a label that did not move, which reads as a fault.
 *
 * The first draft held "Connecting to github.com…" across four phases. On a
 * depth 1 clone of microsoft/TypeScript those are 208 frames of real server
 * work, and the connection was established at the first byte, so a user
 * watching "Connecting" for thirty seconds concludes their network is broken.
 */
export const CLONE_PHASE_WORDS: Readonly<Record<ClonePhase, string>> = {
  starting: 'Preparing on the server',
  enumerating: 'Preparing on the server',
  counting: 'Preparing on the server',
  compressing: 'Compressing on the server',
  receiving: 'Downloading',
  resolving: 'Setting up',
  checkingOut: 'Writing files'
};

/** One line under the Repository field while the address is being checked. */
export const CLONE_CHECKING_NOTE = 'Checking the address…';

/**
 * What the user reads after cancelling, built from what main reported it did
 * on disk (research 35 §3.11).
 *
 * The renderer must not assert a cleanup it did not perform. Main sends the
 * leftover path when the removal failed and sends nothing when the directory
 * is gone, so the claim below is only ever made about a fact main established.
 */
export function cloneCancelledNote(leftoverPath?: string): string {
  if (leftoverPath !== undefined && leftoverPath.trim().length > 0) {
    return `Clone cancelled. Tortie could not remove ${leftoverPath}. You can delete it yourself.`;
  }
  return 'Clone cancelled. Nothing was left on disk.';
}
