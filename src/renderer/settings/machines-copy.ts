/**
 * Phase 68. Every user facing string Settings → Machines writes itself.
 *
 * WHY ONE MODULE. The writing rules are checked mechanically, and a check
 * needs one target. `machines-copy.test.ts` reads every export in this file
 * and fails on an em dash, an en dash, a stray colon, or any of the words a
 * person should never meet in Tortie's own copy. A string written inline in a
 * component escapes that check, so no component in this surface writes one.
 *
 * WHAT IS NOT HERE, and must never be moved here. Three kinds of text on this
 * surface come from main and are drawn exactly as they arrive:
 *
 *  1. `MachinesResult.honesty` and `MachinesResult.warning`, the two sentences
 *     the confirm gate owns. They ride on the result so no surface can omit or
 *     reword them.
 *  2. `MachineRowView.lines`, `confirmedLines` and `refusal`. The lines are
 *     what a person agreed to, recorded verbatim behind the button.
 *  3. `MachineTestOutcome.headline` and `detail`. The taxonomy lives in main
 *     precisely so a later edit to a renderer file cannot draw the changed
 *     host key calmly.
 *
 * THE COLON RULE, and the two places it bends. House style allows a colon only
 * to introduce a list. Two shapes on this surface are neither prose nor a list:
 * a field label that stands immediately before the value drawn after it, and
 * the two list headings on a changed row. Both end in a colon and carry nothing
 * after it. `LABELS_ENDING_IN_A_COLON` names every one of them, and the test
 * asserts that set is exact, so a colon that appears in the middle of a
 * sentence fails.
 */

import type { MachineConfirmState } from '@shared/ipc';
import type { MachineColor } from '@shared/machines';

// ---------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------

export const SECTION_TITLE = 'Machines';

export const SECTION_CAPTION =
  'Tortie can keep your work running on another machine you own. Add one ' +
  'here, and confirm it once, before Tortie will sign in to it.';

/**
 * The first standing honesty line. Research 51 section 4.6 makes this a
 * promise rather than a note, so it is drawn on every visit and not behind a
 * disclosure.
 */
export const HONESTY_NO_ADOPTION =
  'Tortie never adopts work that is already running on your machines, and it ' +
  'never touches it. Anything Tortie runs there, it creates itself.';

/** The second. It names what this release cannot do yet. */
export const HONESTY_NO_SESSIONS_YET =
  'You cannot open a session on a machine yet. This release records the ' +
  'machine and proves Tortie can reach it. Opening sessions comes later.';

/**
 * The third line Tortie writes itself, and it is here because the first build
 * of this phase did the opposite of what it says.
 *
 * When you answer the connection test, the sign in program records which
 * machine answered, so that a machine whose identity later changes can be
 * spotted. That record has to go somewhere. The first build let the program
 * choose, and it chose the file in the operator's home folder, which it then
 * added three lines to. Tortie now names a file of its own and that file is
 * the only one anything Tortie runs will add a line to. The full path is in
 * the command shown at the top of the connection test.
 */
export const HONESTY_OWN_RECORD =
  'Tortie keeps its own record of which machines have answered, in a file it ' +
  'owns. It reads the record you already keep in your home folder, so a ' +
  'machine you have used for years still raises the alarm if it changes. It ' +
  'never adds a line to that one.';

export const EMPTY_LINE = 'No machines yet.';

/** Drawn when the preload of this build has no machines surface at all. */
export const BRIDGE_MISSING =
  'Machines are not available in this build. Quit and reopen Tortie. If this ' +
  'keeps happening, reinstall it.';

// ---------------------------------------------------------------------------
// One row's state
// ---------------------------------------------------------------------------

/**
 * The chip beside a machine's name. Three of the four states read the same,
 * because they mean the same thing to the person standing in front of them,
 * which is that Tortie will not sign in. The sentence under the chip says
 * which of the three it is.
 */
export const STATE_CHIP: Readonly<Record<MachineConfirmState, string>> = {
  confirmed: 'Confirmed',
  never: 'Not usable',
  changed: 'Not usable',
  unknown: 'Not usable'
};

/**
 * One sentence under the chip, written for the moment before, where the
 * person still has the button in front of them. `MachineRowView.refusal` is
 * main's sentence for the moment after, and it is drawn too, unchanged.
 */
export const STATE_SENTENCE: Readonly<Record<MachineConfirmState, string>> = {
  confirmed:
    'You confirmed this machine. Tortie may sign in to it when you ask it to.',
  never:
    'Tortie will not sign in to this machine until you read what it will run ' +
    'and confirm it.',
  changed:
    'The details changed after you confirmed them, so Tortie will not sign in ' +
    'to this machine. Read what changed and confirm it again.',
  unknown:
    'Tortie could not read the confirmation record from the system keychain, ' +
    'so it will not sign in to this machine yet.'
};

/** The heading over the lines the person agreed to, on a changed row. */
export const CONFIRMED_LIST_LABEL = 'You confirmed:';

/** The heading over the lines the file carries now, on a changed row. */
export const CURRENT_LIST_LABEL = 'It now says:';

// ---------------------------------------------------------------------------
// Row buttons
// ---------------------------------------------------------------------------

export const BTN_SHOW = 'Show what it runs';
export const BTN_HIDE = 'Hide what it runs';
export const BTN_CONFIRM = 'Confirm this machine';
export const BTN_CONFIRM_CHANGED = 'Confirm the new details';
export const BTN_WITHDRAW = 'Withdraw confirmation';
export const BTN_TEST_AGAIN = 'Test the connection again';
export const BTN_REMOVE = 'Remove this machine';

/**
 * Removing takes two clicks. It deletes the row and the confirmation behind
 * it, and a person who meant to press the button beside it should not lose an
 * agreement they made to a slip of the hand.
 */
export const REMOVE_QUESTION =
  'This deletes the machine and the confirmation you gave it.';
export const BTN_REMOVE_CONFIRM = 'Remove it';
export const BTN_REMOVE_KEEP = 'Keep it';

// ---------------------------------------------------------------------------
// The rows Tortie dropped
// ---------------------------------------------------------------------------

/**
 * The dropped rows heading. A row that failed a check is dropped entire, and
 * this block is the only place a person can read why.
 */
export function droppedRowsLine(count: number): string {
  return count === 1
    ? 'Tortie dropped 1 row whole. Nothing from it was used.'
    : `Tortie dropped ${count} rows whole. Nothing from them was used.`;
}

export const BTN_CHECK_AGAIN = 'Check the file again';

// ---------------------------------------------------------------------------
// Add a machine
// ---------------------------------------------------------------------------

export const ADD_TITLE = 'Add a machine';
export const BTN_ADD_CANCEL = 'Cancel';

export const BTN_FIND_TAILNET = 'Find machines on your tailnet';

export const TAILSCALE_EXPLAIN =
  'Tortie asks the Tailscale program on this Mac which machines you have. It ' +
  'runs the copy at this exact path, and nothing that a PATH could point ' +
  'somewhere else.';

/** Stands immediately before the absolute path Tortie ran. */
export const TAILSCALE_SOURCE_LABEL = 'Reading from:';

export const TAILSCALE_MISSING =
  'Tortie found no Tailscale program on this Mac at the places it looks. ' +
  'Type the machine address yourself below.';

export const TAILSCALE_EMPTY =
  'Tailscale answered and listed no other machines. Type the machine address ' +
  'yourself below.';

export const PEER_THIS_MAC = 'This Mac';
export const PEER_ALREADY_ADDED = 'Already added';
export const PEER_OFFLINE = 'Offline';

export const FIELD_HOST = 'Machine address';
export const FIELD_LABEL = 'Name in Tortie';
export const FIELD_COLOUR = 'Colour';
export const FIELD_USER = 'Sign in as';
export const FIELD_USER_HINT =
  'Leave this empty to use the same name you use on this Mac.';

export const ADVANCED = 'Advanced';

export const FIELD_PORT = 'Port';
export const FIELD_PORT_HINT = 'Leave this empty for the usual port.';

export const FIELD_REMOTE_PATH = 'Program path on that machine';
export const FIELD_REMOTE_PATH_HINT =
  'Tortie runs one program on the machine you add, and that program is what ' +
  'keeps your work alive after you close the lid. Leave this empty and the ' +
  'connection test will find it.';

/** The six colour names, for the picker. Identity, never state. */
export const COLOUR_LABEL: Readonly<Record<MachineColor, string>> = {
  blue: 'Blue',
  red: 'Red',
  cyan: 'Cyan',
  orange: 'Orange',
  magenta: 'Magenta',
  green: 'Green'
};

// ---------------------------------------------------------------------------
// The connection test
// ---------------------------------------------------------------------------

export const BTN_TEST = 'Test the connection';
export const TESTING = 'Testing the connection';
export const BTN_CANCEL_TEST = 'Cancel the test';

export const BTN_ADD_CONFIRM = 'Add this machine and confirm it';

/** Drawn under the confirm button for as long as it is disabled. */
export const ADD_DISABLED_REASON =
  'Run the connection test first. Tortie needs to see the machine answer, ' +
  'and it needs the program path the machine reports.';

/**
 * The first of the two lines Tortie writes into the transcript. It stands
 * immediately before the absolute path of the program Tortie started.
 */
export const TRANSCRIPT_RUNNING_LABEL = 'Tortie is running:';

/** The second. Everything drawn after it is another program's bytes. */
export const TRANSCRIPT_SOURCE_LINE =
  'Everything below this line comes from that program and from the machine. ' +
  'Tortie does not change it, does not store it, and does not answer it for ' +
  'you.';

export const ANSWER_LABEL = 'Answer';
export const BTN_SEND = 'Send';
export const ANSWER_HINT =
  'What you type here goes straight to the program above and nowhere else.';

/**
 * The two lines above are the ONLY text Tortie writes inside the transcript.
 * `machines-copy.test.ts` asserts this set has exactly two members, so a
 * later edit cannot slip a third Tortie sentence in among another program's
 * output where a person would read it as the program's own.
 */
export const TRANSCRIPT_TORTIE_LINES: readonly string[] = [
  TRANSCRIPT_RUNNING_LABEL,
  TRANSCRIPT_SOURCE_LINE
];

// ---------------------------------------------------------------------------
// The sheet the Add flow records, and why no label for it is in this file
// ---------------------------------------------------------------------------

/**
 * NOTHING HERE WRITES THE CONFIRM SHEET. The lines a person reads before they
 * agree are composed in main, by `describeMachine` in
 * src/main/machines/confirm.ts, and they arrive on
 * `MachineTestOutcome.sheet.lines` beside the hash the agreement binds to.
 * The surface draws those lines and sends that hash back untouched.
 *
 * An earlier build did keep four labels here and composed the sheet in the
 * renderer. It could not work, and it is worth saying why so nobody puts them
 * back. The hash covers the machine id and the program path, and the program
 * path is not known until the machine itself answers, so the renderer had no
 * hash to send. It sent an empty string, main compared it against the hash it
 * had just computed, and every add was refused with the sentence about a
 * machine that changed after it was shown. Lines the renderer writes and a
 * hash main computes cannot be made to agree by writing the labels more
 * carefully.
 */

// ---------------------------------------------------------------------------
// The colon exemption, named so the test can be exact
// ---------------------------------------------------------------------------

/**
 * Every string in this file that ends in a colon, and the only ones allowed
 * to carry one at all. Each stands immediately before a value or a list drawn
 * after it and carries no text of its own past the colon.
 */
export const LABELS_ENDING_IN_A_COLON: readonly string[] = [
  CONFIRMED_LIST_LABEL,
  CURRENT_LIST_LABEL,
  TAILSCALE_SOURCE_LABEL,
  TRANSCRIPT_RUNNING_LABEL
];
