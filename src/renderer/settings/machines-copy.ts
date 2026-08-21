/**
 * Phase 68. Every user facing string Settings → Machines writes itself.
 *
 * WHY ONE MODULE. The writing rules are checked mechanically, and a check
 * needs one target. `machines-copy.test.ts` reads every export in this file
 * and fails on an em dash, an en dash, a stray colon, or any of the words a
 * person should never meet in Tortie's own copy. A string written inline in a
 * component escapes that check, so no component in this surface writes one.
 *
 * WHAT IS NOT HERE, and must never be moved here. Four kinds of text on this
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
 *  4. `MachineTestOutcome.keySheet.lines`, `warning` and `notes`, added in
 *     Phase 79.1. They are the facts the key install hash covers and the four
 *     sentences a person reads before they type a password. Main composes them
 *     beside the hash, so a line the renderer wrote could never be part of
 *     what main checks.
 *
 * WHAT PHASE 79 ADDED, and why it does not break that rule. `REMEDY` at the
 * bottom of this file is one sentence per outcome class saying what a person
 * can do next. Main still classifies and still writes what happened. The
 * renderer writes only the advice, because the advice is about settings on
 * this Mac and on the far machine rather than about the bytes that came back.
 * A test holds the key set equal to main's class list in both directions.
 * PHASE 72 ADDED TWO SENTENCES PAST SESSIONS DRAWS. They are the record a
 * removal leaves behind, and they are the other half of the removal question,
 * so they live beside it and under the same audit. The reason is written again
 * over the functions themselves.
 * WHAT PHASE 79.1 ADDED. One block of labels, buttons and hints for setting up
 * a key on one machine. Not one of them names a file, a path or any part of a
 * key, because all of those arrive from main. `REMEDY` gained one row, being
 * `key-installed`, and it is null because the surface starts the connection
 * test itself and there is nothing for a person to do while it runs.
 *
 * THE COLON RULE, and the two places it bends. House style allows a colon only
 * to introduce a list. Two shapes on this surface are neither prose nor a list:
 * a field label that stands immediately before the value drawn after it, and
 * the two list headings on a changed row. Both end in a colon and carry nothing
 * after it. `LABELS_ENDING_IN_A_COLON` names every one of them, and the test
 * asserts that set is exact, so a colon that appears in the middle of a
 * sentence fails.
 */

import type { MachineConfirmState, MachineTestClass } from '@shared/ipc';
import type { MachineColor } from '@shared/machines';

// ---------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------

export const SECTION_TITLE = 'Machines';

export const SECTION_CAPTION =
  'Tortie can keep your work running on another machine you own.';

/**
 * The second half of the old caption, moved behind the disclosure in Phase 79.
 *
 * It is still true and it is still worth reading. It left the caption because
 * the empty state is a heading, one sentence and one button, and a person who
 * has added no machine yet has nothing to confirm.
 */
export const SECTION_CONFIRM_LINE =
  'Tortie will not sign in to a machine until you have read what it runs ' +
  'and confirmed it once.';

/** The summary of the one disclosure this section has. */
export const DISCLOSURE_LABEL = 'How Tortie treats your machines';

/**
 * The first standing honesty line. Research 51 section 4.6 makes this a
 * promise rather than a note, so it is never behind a disclosure.
 *
 * Phase 79 moved it from a standing block at the top of the section onto the
 * machine row itself, directly above the Prepare button. The words are
 * unchanged. Prepare is the affordance that starts something on the other
 * machine, so that is where the promise decides something rather than being
 * read once and scrolled past.
 */
export const HONESTY_NO_ADOPTION =
  'Tortie never adopts work that is already running on your machines, and it ' +
  'never touches it. Anything Tortie runs there, it creates itself.';

/**
 * The second line Tortie writes itself, and it is here because the first build
 * of this phase did the opposite of what it says.
 *
 * When you answer the connection test, the sign in program records which
 * machine answered, so that a machine whose identity later changes can be
 * spotted. That record has to go somewhere. The first build let the program
 * choose, and it chose the file in the operator's home folder, which it then
 * added three lines to. Tortie now names a file of its own and that file is
 * the only one anything Tortie runs will add a line to. The full path is in
 * the command shown at the top of the connection test.
 *
 * Phase 79 moved it behind the disclosure. It is a fact about a file, and a
 * person needs it when they go looking rather than on every visit.
 */
export const HONESTY_OWN_RECORD =
  'Tortie keeps its own record of which machines have answered, in a file it ' +
  'owns. It reads the record you already keep in your home folder, so a ' +
  'machine you have used for years still raises the alarm if it changes. It ' +
  'never adds a line to that one.';

/**
 * WHAT PHASE 79 DELETED FROM THIS FILE, so that nobody puts it back:
 *
 *  1. `HONESTY_NO_SESSIONS_YET`, which said "You cannot open a session on a
 *     machine yet" and "Opening sessions comes later". Phase 70 shipped
 *     sessions on another machine on 2026-08-17 at 0.34.0, so the sentence
 *     was false from the day it landed. It went stale because it sat in a
 *     block nobody re-read, and the operator is the one who found it.
 *     `machines-copy.test.ts` now carries a table named RETIRED_CLAIMS. Each
 *     row holds a retired phrase, the rung that disproves it, and a thing in
 *     main whose presence proves that rung shipped. While that thing is
 *     present, no string in this file may make the claim again. Add a row
 *     there whenever a rung retires a sentence here, and the next person is
 *     told by a failing test rather than by the operator's photograph.
 *  2. `EMPTY_LINE`, which said "No machines yet." The empty state is a
 *     heading, one sentence and one button, and that line was a second
 *     sentence saying what the empty screen already showed.
 *  3. `TAILSCALE_MISSING` and `TAILSCALE_EMPTY`. Main sends those same two
 *     sentences on `TailscaleSourceResult.note` and the Add flow drew both,
 *     so a person read each one twice in a row. Main's note is drawn now and
 *     the renderer keeps no copy of it.
 */

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

// ---------------------------------------------------------------------------
// Prepare this machine (Phase 69)
// ---------------------------------------------------------------------------
//
// Labels only. Every sentence about an outcome comes from main, unchanged, per
// the rule at the top of this file. The button is enabled only for a confirmed
// row, and it says what it will do before it does it, because it is the first
// thing Tortie ever starts on another machine.

export const BTN_PREPARE = 'Prepare this machine';

export const PREPARE_EXPLAIN =
  'Tortie starts the program on that machine that keeps your work alive, and ' +
  'sets it up the way Tortie needs. This is the first thing Tortie runs there. ' +
  'Anything already running on that machine is left alone.';

export const PREPARING = 'Preparing this machine';

export const PREPARE_NEEDS_CONFIRM = 'Confirm this machine before Tortie prepares it.';

// ---------------------------------------------------------------------------
// Accepting a version Tortie has not measured (Phase 83)
// ---------------------------------------------------------------------------
//
// Labels and buttons only. Every sentence about what accepting means comes from
// main on the Prepare result, unchanged, per the rule at the top of this file.
// The block is drawn only when main sent a sheet, and a sheet is only sent for a
// machine that named a version Tortie has not measured.

export const BTN_ACCEPT_VERSION = 'Accept this version and prepare it';

export const ACCEPTING_VERSION = 'Accepting this version';

/** Stands immediately before the version a person accepted. */
export const ACCEPTED_VERSION_LABEL = 'Version you accepted:';

export const ACCEPTED_VERSION_NONE =
  'You have not accepted a version for this machine.';

export const BTN_WITHDRAW_VERSION = 'Withdraw this version';

/**
 * Drawn beside the withdraw button, because withdrawing does two things.
 *
 * The version is one of the five facts the confirmation covers, so it cannot be
 * dropped on its own. Saying so here is cheaper than a person finding out by
 * pressing the button.
 */
export const WITHDRAW_VERSION_EXPLAIN =
  'Withdrawing the version also withdraws your confirmation of this machine, ' +
  'because the version is one of the things you confirmed. Confirm the ' +
  'machine again to use it.';

// ---------------------------------------------------------------------------
// Letting Tortie save a file on one machine (Phase 101)
// ---------------------------------------------------------------------------
//
// Labels, buttons and two sentences about what this surface is for. Everything
// the AGREEMENT covers comes from main, being the sheet's lines, the confirm
// warning and the paragraph that says what a replacement costs. Not one of them
// is written here, for the reason at the top of this file: a line the renderer
// wrote could never be part of what main checks.
//
// THIS IS A HUMAN MOMENT AND IT IS THE POINT OF THE FIELD. A person turns
// saving on for one machine, once, by typing a folder and reading a sheet.
// Nothing else in Tortie can do it for them.

/** The block's heading, under the key line. */
export const SAVING_TITLE = 'Saving files';

/**
 * What the block says while Tortie may save nothing on this machine.
 *
 * It says the state first and then what turning it on would mean, including
 * the check that makes it safe, which is that Tortie reads the file and
 * compares its contents before it replaces anything.
 */
export function savingOffExplain(label: string): string {
  return (
    `Tortie does not save files on ${label}. Turn this on and Tortie may ` +
    'replace a file under one folder you name, after it has read that file ' +
    'and checked its contents match.'
  );
}

/** The button that reveals the folder field. It starts nothing. */
export const BTN_ALLOW_WRITES = 'Let Tortie save files here…';

/** The one field on this block. */
export const WRITE_ROOT_LABEL = 'Folder Tortie may save under';

/** The button on the sheet the folder field draws. */
export const BTN_CONFIRM_WRITES = 'Confirm saving on this machine';

/** While that button's call is in flight. */
export const CONFIRMING_WRITES = 'Confirming saving on this machine';

/** What the block says once a person has confirmed a folder. */
export function savingOnLine(root: string, label: string): string {
  return `Tortie may replace files under ${root} on ${label}.`;
}

/**
 * Drawn above the button that turns saving off, because it does two things.
 *
 * The folder is one of the facts the confirmation covers, so it cannot be
 * dropped on its own. This is the same shape, and the same cost, as withdrawing
 * an accepted version. The rejected alternative was a call that clears the
 * folder and records the agreement again on its own, and it is rejected because
 * Tortie would then be writing down an agreement nobody read.
 */
export const STOP_SAVING_EXPLAIN =
  'Turning saving off also withdraws your confirmation of this machine, ' +
  'because the folder is one of the things you confirmed. Confirm the ' +
  'machine again to use it.';

export const BTN_STOP_SAVING = 'Stop Tortie saving files here';

/** Stands immediately before the version the machine reported. */
export const PREPARE_VERSION_LABEL = 'Version on that machine:';

/** Stands immediately before the list of versions Tortie has measured. */
export const PREPARE_SUPPORTED_LABEL = 'Versions Tortie has measured:';

/** Stands immediately before the settings table. */
export const PREPARE_SETTINGS_LABEL = 'Settings Tortie asserted:';

export const PREPARE_SERVER_BORN =
  'Tortie started the program on that machine on this visit.';

export const PREPARE_SERVER_WARM =
  'The program was already running on that machine, so Tortie left it running.';

/** One line per setting in the table, when a value did not stick. */
export const PREPARE_OPTION_DISAGREES =
  'The machine reports a different value than Tortie asked for. Tortie did ' +
  'not write it again, because a value that will not stick is a fact about ' +
  'the machine.';

export const PREPARE_PATH_READ =
  'Tortie read the list of places that machine looks for programs.';

export const PREPARE_PATH_MISSING =
  'Tortie could not read the list of places that machine looks for programs, ' +
  'so it will not start work there.';

/**
 * Removing takes two clicks. It deletes the row and the confirmation behind
 * it, and a person who meant to press the button beside it should not lose an
 * agreement they made to a slip of the hand.
 *
 * PHASE 72. The question counts the sessions out loud. Before this rung it was
 * one fixed sentence about the row and the agreement, and it said nothing at
 * all about the work on the other computer, so a person could remove a machine
 * holding two running agents and read only that a confirmation was going away.
 * The count is a number rather than a word, because a number is a fact a
 * person can check against what they can see.
 */
export function removeQuestion(label: string, sessionCount: number): string {
  if (sessionCount <= 0) {
    return `Remove ${label}? Tortie holds no sessions for it.`;
  }
  const sessions =
    sessionCount === 1 ? 'the 1 session' : `the ${String(sessionCount)} sessions`;
  return (
    `Remove ${label}? Tortie keeps a record of ${sessions} it knows about ` +
    `there, with what it last knew and when. The conversations on that ` +
    `machine stay on that machine, and Tortie can no longer reach them.`
  );
}

export const BTN_REMOVE_CONFIRM = 'Remove it';
export const BTN_REMOVE_KEEP = 'Keep it';

// ---------------------------------------------------------------------------
// The tombstone a removal leaves behind (Phase 72)
// ---------------------------------------------------------------------------
//
// THESE TWO SENTENCES ARE DRAWN IN PAST SESSIONS, not in Settings, and they
// live here anyway. They are here because they are the other half of the
// question above: a person reads "Tortie keeps a record of the 2 sessions it
// knows about there", and these are that record, written out. Keeping them in
// one module keeps them under one copy audit and keeps the two halves of one
// promise from drifting apart. Nothing else in Tortie composes them.

/** The full month names, so a date reads the way a person says it out loud. */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

/** A day, in local time, as "17 August". Exported so the test can pin it. */
export function tombstoneDay(atMs: number): string {
  const at = new Date(atMs);
  return `${String(at.getDate())} ${MONTH_NAMES[at.getMonth()] ?? ''}`;
}

/**
 * A day and a clock time, in local time, as "17 August at 14:32".
 *
 * Local, always. The instant recorded is when the answer reached this Mac, and
 * a person reads it against the clock in front of them. No time on this
 * surface comes from the other computer.
 */
export function tombstoneMoment(atMs: number): string {
  const at = new Date(atMs);
  const hours = String(at.getHours()).padStart(2, '0');
  const minutes = String(at.getMinutes()).padStart(2, '0');
  return `${tombstoneDay(atMs)} at ${hours}:${minutes}`;
}

/**
 * One sentence about a session whose machine a person removed.
 *
 * Three shapes, and which one is used depends on what Tortie actually held.
 *
 *  1. A completed list held this session and reported it working. Tortie says
 *     it last saw the session running there, and says it did not end it.
 *  2. A completed list reached Tortie and did not hold this session. Tortie
 *     says that, and nothing more, because a list that did not name a session
 *     does not say what happened to it.
 *  3. No completed list ever held it. Tortie says it does not know.
 *
 * A status that is neither running nor idle takes shape 2 whenever a list did
 * arrive, because the only thing such a list proved is that the session was
 * not in it.
 */
export function tombstoneLine(
  label: string,
  forgottenAt: number,
  lastSeenAt: number,
  lastStatus: string
): string {
  const removed = `You removed ${label} on ${tombstoneDay(forgottenAt)}.`;
  if (lastSeenAt <= 0) {
    return (
      `${removed} Tortie never got a list from that machine while this ` +
      `session existed, so it does not know what happened to it.`
    );
  }
  if (lastStatus === 'running' || lastStatus === 'idle') {
    return (
      `${removed} Tortie last saw this session running there on ` +
      `${tombstoneMoment(lastSeenAt)}. Tortie did not end it.`
    );
  }
  return (
    `${removed} The last list from that machine did not hold this session, ` +
    `on ${tombstoneMoment(lastSeenAt)}.`
  );
}

/** Why Restore is off for a tombstoned row, said rather than hidden. */
export function tombstoneRestoreRefused(label: string): string {
  return (
    `Tortie can no longer reach ${label}, so it cannot bring this session ` +
    `back. Add the machine again to work with it.`
  );
}

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

// ---------------------------------------------------------------------------
// The Tailscale panel (Phase 79)
// ---------------------------------------------------------------------------
//
// The operator asked for the shape Settings then Agents already uses for the
// agent scan, and these are that shape's words. A title, when Tortie last
// looked, an action that looks again, and for a program that is not there the
// install command in code font with a copy control beside it.
//
// Nothing here runs anything. The panel is drawn before any look happens, and
// a person presses the button.

export const TAILSCALE_TITLE = 'Tailscale';

/**
 * Why Tortie wants Tailscale, and the sentence that stops the missing state
 * reading as a hard requirement. Typing an address always works.
 */
export const TAILSCALE_WHY =
  'Tortie asks Tailscale which machines you own, and you can type an address ' +
  'below instead.';

export const TAILSCALE_NOT_INSTALLED = 'Tailscale is not installed.';

/**
 * Drawn in code font for a person to read and copy. Tortie never runs it, and
 * no button in this surface runs anything a person has not typed.
 */
export const TAILSCALE_INSTALL_COMMAND = 'brew install --cask tailscale';

export const COPY_INSTALL_COMMAND_LABEL = 'Copy the install command';

export const TAILSCALE_NOT_LOOKED = 'Tortie has not looked yet.';

export const TAILSCALE_LOOKING = 'Looking';

export const BTN_TAILSCALE_LOOK_AGAIN = 'Look again';

/** How many other machines the last look found. */
export function tailnetCountLine(others: number): string {
  if (others === 0) return 'No other machines found.';
  if (others === 1) return '1 other machine found.';
  return `${others} other machines found.`;
}

/** When the last look happened. `age` comes from formatAge. */
export function lastLookedLine(age: string): string {
  return age === 'now'
    ? 'Tortie looked just now.'
    : `Tortie last looked ${age} ago.`;
}

export const TAILSCALE_EXPLAIN =
  'Tortie asks the Tailscale program on this Mac which machines you have. It ' +
  'runs the copy at this exact path, and nothing that a PATH could point ' +
  'somewhere else.';

/** Stands immediately before the absolute path Tortie ran. */
export const TAILSCALE_SOURCE_LABEL = 'Reading from:';

export const PEER_THIS_MAC = 'This Mac';
export const PEER_ALREADY_ADDED = 'Already added';
export const PEER_OFFLINE = 'Offline';

/**
 * The mark on a device that cannot run a session, being an iPhone, an iPad, an
 * Android device or an Apple TV.
 *
 * The row stays and its button is off. A device a person can see in the
 * Tailscale app and cannot see in Tortie reads as Tortie being broken. The
 * judgement also comes from one string another program supplied, so it narrows
 * what a person can press rather than deleting a row.
 */
export const PEER_CANNOT_HOST = 'Cannot run a session';

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

/**
 * The versions Tortie has measured on another machine, drawn before the test
 * runs rather than after it refuses.
 *
 * A renderer may not import main, so this list is a copy, and a copy going
 * stale is exactly how the deleted sentence above happened.
 * `machines-copy.test.ts` imports `TESTED_REMOTE_TMUX_VERSIONS` from main and
 * fails when the two disagree, so the list is kept honest by a test rather
 * than by a promise.
 */
export const MEASURED_VERSIONS: readonly string[] = ['3.6a', '3.7b', '3.7c'];

export const BTN_TEST = 'Test the connection';
export const TESTING = 'Testing the connection';
export const BTN_CANCEL_TEST = 'Cancel the test';

export const BTN_ADD_CONFIRM = 'Add this machine and confirm it';

/**
 * Why the confirm button is off. Phase 87 moved it onto the button itself as
 * its tooltip, so the reason is still there and it costs no standing
 * paragraph. The words did not change.
 */
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
// What to do next, one remedy per outcome class (Phase 79)
// ---------------------------------------------------------------------------
//
// MAIN CLASSIFIES AND THE RENDERER ADVISES, and that split is the reason these
// sentences may live here at all. `MachineTestOutcome.headline` and `detail`
// say what happened, they are main's words, and they are drawn unchanged. A
// remedy says what a person can do next, and what a person can do next is
// mostly about this Mac and about settings on the far machine rather than
// about the bytes that came back.
//
// The operator's own report is the reason this exists. macOS ships with Remote
// Login turned off, his connection was refused, and Tortie said "Something is
// at that address and it is not accepting connections on this port." That
// sentence is right and it left him with nothing to do.
//
// Every class has an entry, and `null` means there is nothing for a person to
// do. `machines-copy.test.ts` asserts this key set equals
// `MACHINE_OUTCOME_CLASSES`, which is exported from `src/main/machines/errors`
// rather than from `@shared/ipc`, in both directions, so a class added in main
// cannot ship with no advice and a key main no longer has cannot linger.
//
// A REMEDY DOES NOT REPEAT MAIN'S DETAIL SENTENCE. The two are drawn one line
// apart, main's first and the remedy under it, so a remedy that restates the
// detail costs a person a second reading and gives them nothing. Four of these
// did exactly that in the first build of this phase. Read the class in
// src/main/machines/errors.ts before writing one here, and write only the part
// main does not already say.

export const REMEDY_LABEL = 'What to do next';

export const REMEDY: Readonly<Record<MachineTestClass, string | null>> = {
  ok: null,
  prepared: null,
  cancelled: null,
  // PHASE 79.1. The key is on the machine and the surface has already started
  // the connection test. There is nothing for a person to do while that runs,
  // and the answer they are waiting for is the machine's own.
  'key-installed': null,
  refused:
    'On that Mac, open System Settings, then General, then Sharing, and turn ' +
    'on Remote Login. macOS ships with Remote Login turned off, so that is ' +
    'the usual reason. On a machine that is not a Mac, start its sign in ' +
    'service and check that it is listening on this port.',
  // PHASE 79.1 FIX ROUND. The machine answered and asked for a password.
  // Main's detail says that much and says Tortie stopped there. What it does
  // not say is that the way out is on this panel, and that the password is
  // asked for once rather than on every connection.
  'password-required':
    'The block under this one makes a key and puts it on that machine for ' +
    'you. It asks for that machine\'s password once. After that Tortie signs ' +
    'in with the key and never asks for that password again.',
  // PHASE 79.1. Tortie can now do this itself, so the sentence names the
  // block that does it rather than telling a person to go and do it by hand.
  // The block stands under this one, on the same panel.
  'auth-refused':
    'That machine did not accept your sign in. Your key may not be on it ' +
    'yet. The block under this one makes a key and puts it on that machine ' +
    'for you.',
  // Main's detail already says to check the address or pick from the tailnet.
  // What it does not say is why the tailnet name is the surer of the two.
  'not-resolved':
    'Tailscale gives every machine a name that resolves from any network, so ' +
    'a name picked from your tailnet works where a typed address may not.',
  // Main's detail already names both actions, being install it or type the
  // path under Advanced. What it does not say is which of the two applies to
  // you, so that is all this says.
  'no-program':
    'If that program is already on the machine under a path Tortie did not ' +
    'look in, type that path under Advanced. If it is not on the machine at ' +
    'all, install it there and test again.',
  'host-key-changed':
    'Do not confirm this machine again until you know why its identity ' +
    'changed. Ask whoever runs it, or check whether it was rebuilt. Tortie ' +
    'changed nothing on either machine.',
  unreachable:
    'Wake that machine and check that it is on the network. If you reach it ' +
    'through Tailscale, check that Tailscale shows it as online.',
  // The spec drafted this as "reinstall the command line tools". That is
  // wrong and it would send a person somewhere that cannot help. The program
  // Tortie is missing is 1,557,568 bytes at /usr/bin/ssh on this Mac and it
  // ships with macOS itself, while the command line tools install under
  // /Library/Developer/CommandLineTools and leave that path alone.
  'client-missing':
    'That program ships with macOS, so a missing one means something removed ' +
    'it or the disk is damaged. Restore this Mac from a backup, or reinstall ' +
    'macOS.',
  'timed-out':
    'Test it again. If it times out every time, that machine is answering ' +
    'too slowly to use, and a slow network or a machine under heavy load is ' +
    'the usual reason.',
  unknown:
    'Read the last line the program printed, because that is the whole of ' +
    'what Tortie knows. Change one thing on that machine, then test again.',
  // Main's detail already says to prepare it and what preparing does. What it
  // does not say is where the button is, and a person who has just read a
  // connection test is not looking at the row it sits on.
  'no-server':
    'The button that does this is named Prepare this machine, and it is on ' +
    "that machine's row.",
  // Main's detail opens with the refusal and the reason for it, and one of its
  // two shapes then says to update the program. Waiting for a Tortie release
  // is the option main never names, so it goes first.
  'version-unmeasured':
    'Wait for a Tortie release that has measured the version that machine ' +
    'runs, or put a version Tortie has already measured on it.'
};

// ---------------------------------------------------------------------------
// Setting up a key for one machine (Phase 79.1)
// ---------------------------------------------------------------------------
//
// WHAT IS HERE AND WHAT IS NOT. Every string below is a label, a button or a
// hint. Not one of them names a file, a path, a program or any part of the
// key. All of those arrive from main on the sheet and on the result, and the
// surface draws them exactly as they came, for the same reason the confirm
// sheet works that way: the lines a person agrees to are composed where the
// hash is computed, so nothing the renderer writes can drift away from what
// main will actually do.
//
// The four sentences a person reads before they type anything, being what
// Tortie is about to do, the order Remote Login comes in, what the key does
// not have and where the password goes, are main's and live in
// src/main/machines/key-install.ts.

/** The heading of the block, and what pressing the button will start. */
export const KEY_BLOCK_LABEL = 'Set up a key for this machine';

/** Stands over main's own lines, which are the facts the agreement covers. */
export const KEY_LINES_LABEL = 'What Tortie will do';

export const KEY_PASSWORD_LABEL = "That machine's password";

/**
 * What happens to what a person types, said beside the field rather than
 * after it. It is the same promise the answer field on the connection test
 * makes, and it is true for the same reason: the bytes cross one call and
 * nothing keeps a copy of them.
 */
export const KEY_PASSWORD_HINT =
  'This goes straight to the sign in program for one call. Tortie keeps no ' +
  'copy of it.';

export const BTN_INSTALL_KEY = 'Make a key and put it on this machine';

export const INSTALLING_KEY = 'Setting up the key';

/** Drawn under the button for as long as it is off. */
export const KEY_DISABLED_REASON =
  "Type that machine's password first. Tortie needs it once to put the key " +
  'on the machine.';

/** Stands over the bytes the far machine printed, which are not Tortie's. */
export const KEY_TRANSCRIPT_LABEL = 'What the machine printed';

/** Stands over main's own account of the install. */
export const KEY_RESULT_LABEL = 'What happened';

export const KEY_MADE_NEW = 'Tortie made a new key for this machine.';

/**
 * Said when the key was already there.
 *
 * A second key would leave the first public half on the machine with nothing
 * on this Mac pointing at it, so Tortie uses the one it has, and the person
 * is told which of the two happened.
 */
export const KEY_MADE_REUSED =
  'Tortie used the key it had already made for this machine.';

/** Said when the machine gained the line. It is one line and never more. */
export const KEY_WROTE_ADDED = 'That machine gained one line.';

/** Said when the line was already there, which is what running it twice does. */
export const KEY_WROTE_PRESENT =
  'That machine already had this key, so nothing was added.';

/** Stands immediately before the fingerprint main computed. */
export const KEY_FINGERPRINT_LABEL = 'Key fingerprint';

// ---------------------------------------------------------------------------
// Which key Tortie uses, said on the row (Phase 84, item 7)
// ---------------------------------------------------------------------------
//
// THE DEFECT THESE TWO SENTENCES CLOSE. Tortie has written a key of its own
// for a machine since Phase 79.1 and named it on no command it sent, so every
// sign in went through whatever key the person happened to have loaded
// themselves, and nothing on screen said so. Phase 84 names Tortie's own key on
// every command. These say which of the two states this machine is in.
//
// THE FILE NAME ARRIVES FROM MAIN. `keyNamedOnEveryCommand` takes it as an
// argument and this file writes no path, for the same reason the block above
// writes none: a path composed here could differ from the path main writes to,
// and a person would have read the wrong one.

/**
 * Said on a row whose key pair is on this Mac.
 *
 * The second sentence is the one that stops this reading as Tortie taking over
 * the sign in. Tortie names its own key IN ADDITION to whatever the person has
 * loaded, and it deliberately does not tell the sign in program to offer its
 * key and nothing else. The operator's own Mac Pro answers today through a key
 * he loaded himself, and narrowing the offer would have broken it on the first
 * run of this build.
 */
export function keyNamedOnEveryCommand(leaf: string): string {
  return (
    `Tortie names its own key for this machine, the file called ${leaf}, on ` +
    `every command it sends there. It also lets the sign in program offer any ` +
    `key you have loaded yourself.`
  );
}

/**
 * Said on a row that has no key of Tortie's, which is the ordinary case.
 *
 * THE LAST SENTENCE NAMES WHAT IS ACTUALLY ON SCREEN. The spec drafted it as
 * "The Install button makes one", and there is no button by that name: the
 * block that makes a key is drawn under the connection test, and only for the
 * three answers where a key would help. So the sentence names the test, which
 * is the control a person can actually press from here.
 */
export const KEY_NOT_MADE_YET =
  'Tortie has no key of its own for this machine, so every sign in uses ' +
  'whatever key you have loaded yourself. Run the connection test. When that ' +
  'machine asks for a password, or turns the sign in down, Tortie offers to ' +
  'make one.';

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
// Which agents each machine has (Phase 110)
// ---------------------------------------------------------------------------
//
// A READ, and never an install surface. Not one string here holds a command,
// and none of them names a provider page. The local agent row draws an install
// command beside a copy button, and those strings are piped shell one liners.
// The same string beside a machine Tortie holds an open connection to is one
// button from being sent, so this block says where installing happens and
// offers nothing that could send it.

/** The heading over the per machine blocks. */
export const AGENTS_ON_MACHINES_TITLE = 'On your other machines';

/** The one sentence block under that heading. */
export const AGENTS_ON_MACHINES_CAPTION =
  'These are the agents Tortie found on each machine the last time it asked. ' +
  'Tortie asks a machine once when it signs in, and again when you press ' +
  'Rescan. Installing an agent happens on that machine.';

/** The button that asks one machine again. */
export const BTN_RESCAN_AGENTS = 'Rescan';

/** The same button while its one read is in flight. */
export const RESCAN_AGENTS_RUNNING = 'Scanning…';

/** The words for an agent that machine answered it does not have. */
export const AGENT_ABSENT = 'Not found';

/**
 * The words for an agent nobody has asked about, or one whose answer could not
 * be trusted. It is the phrase the configured agents block already uses for
 * this idea, so the product says one thing once.
 */
export const AGENT_UNKNOWN = 'Not known yet';

/**
 * Under the head, whenever there is an answer.
 *
 * Any answer that can be stale says its age. This panel never asks on its own,
 * so without this line a person could read a year old answer as a fresh one.
 */
export function agentsAskedLine(age: string): string {
  return age === 'now'
    ? 'Tortie asked this machine less than a minute ago.'
    : `Tortie asked this machine ${age} ago.`;
}

/** Under the head, for a machine nothing has ever asked in this run. */
export const AGENTS_NEVER_ASKED =
  'Tortie has not asked this machine yet, so it knows nothing about the ' +
  'agents there.';

/**
 * Under the head, for a machine Tortie cannot ask right now.
 *
 * The rows and the age stay exactly as they were. A machine Tortie cannot
 * reach is not a machine that lost its agents.
 */
export const AGENTS_NOT_SIGNED_IN =
  'Tortie has not signed in to this machine in this run, so it cannot ask it ' +
  'anything. Open Machines and prepare this machine.';

/**
 * The Rescan button's own label, because up to 32 of them would otherwise all
 * read Rescan to anybody reading the page rather than looking at it.
 */
export function rescanAgentsLabel(label: string): string {
  return `Ask ${label} which agents it has`;
}

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
  TRANSCRIPT_RUNNING_LABEL,
  PREPARE_VERSION_LABEL,
  PREPARE_SUPPORTED_LABEL,
  PREPARE_SETTINGS_LABEL,
  // Phase 83. It stands immediately before the version a person accepted and
  // carries nothing of its own past the colon.
  ACCEPTED_VERSION_LABEL
];
