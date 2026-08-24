/**
 * This project's counterpart on another machine (Phase 90.2, items 2 and 3).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

// WHERE THE REST OF THESE SENTENCES ARE. Main composes every sentence that
// reports what a machine said, in src/main/machines/remote-copy.ts, and the
// block draws them in the order main sent them. That file is on the vocabulary
// audit's list already. What is written here is the copy that belongs to the
// screen rather than to an answer: the line while Tortie is still asking, the
// labels on the controls, and the three fixed sentences a person reads BEFORE
// they press the button that writes.
//
// WHAT NONE OF THESE MAY CLAIM. None of them may say the two folders hold the
// same work. A shared git remote says the two folders came from the same
// place, and it says nothing at all about what is in them now.

/** While Tortie is asking that machine. It is one question and it is quick. */
export function counterpartLooking(label: string): string {
  return `Looking for this project on ${label}…`;
}

/**
 * The button that opens the copy confirm, drawn in the absent case only.
 *
 * It ends in an ellipsis because it opens a confirm rather than doing the
 * thing, which is the same rule the Browse button beside the Directory field
 * follows.
 */
export const COUNTERPART_CLONE_BUTTON = 'Put it on that machine…';

/** On each folder in the several case. It writes the path into the field. */
export const COUNTERPART_USE_MATCH = 'Use this folder';

/** The confirm's own title. It names the machine, because the write is there. */
export function cloneTitle(label: string): string {
  return `Put this project on ${label}`;
}

/** The label over the destination field inside the confirm. */
export function cloneDestLabel(label: string): string {
  return `New folder on ${label}`;
}

/**
 * What Tortie is about to do, said with both the address and the destination
 * in it.
 *
 * A person reads the exact address and the exact path before they press, and
 * both are on screen rather than summarised, because this is the sentence that
 * stands between them and a write on somebody else's computer.
 */
export function clonePlanLine(
  url: string,
  path: string,
  label: string
): string {
  return `Tortie will copy ${url} into ${path} on ${label}.`;
}

/** The bound on what this button can do, said before it is pressed. */
export const CLONE_ONLY_WRITE =
  'This is the only thing Tortie writes on that machine. It refuses if there ' +
  'is already something at that folder.';

/**
 * What does not cross, said in the place a person would worry about it.
 *
 * Tortie reads no password and no key for this, forwards none, keeps none and
 * asks for none. The machine signs in with what it already has, or it answers
 * that it could not and nothing is written.
 */
export function cloneNoCredential(label: string): string {
  return (
    `No password and no key leaves this Mac. ${label} signs in with what it ` +
    'already has, or Tortie stops and says so.'
  );
}

/** What is copied, which is the plainest thing git can be asked for. */
export const CLONE_PLAIN =
  'Tortie copies the default branch and nothing else. It picks no branch, no ' +
  'depth and no submodule.';

/** The confirm's own button. It is the press that writes. */
export const CLONE_CONFIRM_BUTTON = 'Copy it there';

/** The way out of the confirm that changes nothing. */
export const CLONE_CANCEL_BUTTON = 'Cancel';

/**
 * While the copy is running, with the seconds counted on this Mac.
 *
 * The elapsed count is here because a copy of a large project takes minutes
 * and a screen that says nothing for minutes reads as a screen that has hung.
 */
export function cloneRunningLine(
  label: string,
  path: string,
  seconds: number
): string {
  return (
    `Copying into ${path} on ${label}. This can take minutes. ` +
    `${String(seconds)} seconds so far.`
  );
}

/**
 * Why the sheet will not close while the copy is running.
 *
 * This is the one moment in the create sheet where Escape and the background
 * are refused, and it is refused because closing would throw away the answer
 * to a write that is happening on somebody's computer.
 */
export const CLONE_BUSY_CLOSE =
  'Tortie is copying this project onto that machine. Wait for it to finish ' +
  'before you close this.';
