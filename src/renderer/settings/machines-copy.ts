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
  'Tortie asks Tailscale which machines you own, so you pick a name rather ' +
  'than typing an address, and Tailscale carries the connection. You can ' +
  'still add a machine by typing its address below, so Tailscale is the ' +
  'easy path rather than the only one.';

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
export const MEASURED_VERSIONS: readonly string[] = ['3.6a', '3.7b'];

export const VERSION_GATE_EXPLAIN =
  'Tortie only uses versions of that program it has measured. If the ' +
  'machine runs a different version, Tortie says so and starts nothing.';

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
  refused:
    'On that Mac, open System Settings, then General, then Sharing, and turn ' +
    'on Remote Login. macOS ships with Remote Login turned off, so that is ' +
    'the usual reason. On a machine that is not a Mac, start its sign in ' +
    'service and check that it is listening on this port.',
  'auth-refused':
    'That machine did not accept your sign in. Your key may not be on it ' +
    'yet. Put your public key on that machine, then test again.',
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
  TRANSCRIPT_RUNNING_LABEL,
  PREPARE_VERSION_LABEL,
  PREPARE_SUPPORTED_LABEL,
  PREPARE_SETTINGS_LABEL
];
