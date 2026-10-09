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
 * WHAT PHASE 340 CHANGED (build/p340/SPEC.md section 8). Adding a machine is
 * pick, check and add, and a machine row is a name, a status chip, one line of
 * facts and one button, with the rest in a native menu. So most of the words
 * this file held moved behind a hover, a menu row or a disclosure, and the
 * ones nothing described any more were deleted. The words that stayed did not
 * change unless the spec names the change. The check a person reads is a list
 * of ticks composed here from facts main read, being the address, the account,
 * the program and its version, and every one of those values arrives from
 * main; this file writes only the words around them.
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
 * The first standing honesty line. The words have not changed since Phase 68.
 *
 * WHERE IT LIVES, AND THE CORRECTION PHASE 131 MADE. Phase 79 moved it from a
 * standing block at the top of the section onto the machine row, directly
 * above the Prepare button, and wrote here that research 51 section 4.6 makes
 * it a promise that is never behind a disclosure. Section 4.6 of
 * docs/research/51-remote-machines.md is the failure case table and this
 * sentence is not in it. The sentence is in section 0, line 44, in the list of
 * three sentences of FIRST RUN copy. Research 51 asks that a person meets it,
 * not that every row repeats it forever.
 *
 * Phase 131 put it behind the row's own disclosure, because the row said the
 * same thing three times and the answer a person came for sat at block 9 of
 * 15. The other two tellings were deleted. This one is the survivor and it is
 * one press away on every row.
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
 * PHASE 340. The chip beside a machine's name, one word or two for each of the
 * ten answers `machineStatusOf` in ./machine-status.ts gives (D11 as revised).
 *
 * The chip says what a person needs to know at a glance and nothing else. The
 * sentence that explains it is its hover, being `STATE_SENTENCE` for the three
 * confirmation states and main's own sentence for the rest, so nothing here
 * says why. `Ready` is drawn only for a machine that is prepared AND answering
 * now, because a machine that went to sleep keeps its registered context and
 * would otherwise read Ready while it does not answer.
 */
export const CHIP_WORDS: Readonly<
  Record<
    | 'not-usable'
    | 'not-confirmed'
    | 'changed'
    | 'identity-changed'
    | 'needs-key'
    | 'new-version'
    | 'connecting'
    | 'ready'
    | 'offline'
    | 'not-ready',
    string
  >
> = {
  'not-usable': 'Not usable',
  'not-confirmed': 'Not confirmed',
  changed: 'Changed',
  'identity-changed': 'Identity changed',
  'needs-key': 'Needs a key',
  'new-version': 'New version',
  connecting: 'Connecting',
  ready: 'Ready',
  offline: 'Offline',
  'not-ready': 'Not ready'
};

/**
 * One sentence about a row's confirmation, written for the moment before, where
 * the person still has the button in front of them. `MachineRowView.refusal` is
 * main's sentence for the moment after, and it is drawn too, unchanged.
 *
 * PHASE 340. These are the chip's hover now, and the review panel draws main's
 * refusal beside the button. The words did not change.
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

export const BTN_CONFIRM = 'Confirm this machine';
export const BTN_CONFIRM_CHANGED = 'Confirm the new details';

// ---------------------------------------------------------------------------
// The row's one next step and its native menu (Phase 340)
// ---------------------------------------------------------------------------
//
// WHAT PHASE 340 DELETED HERE. `Show what it runs`, `Hide what it runs`,
// `Withdraw confirmation`, `Test the connection again` and `Remove this machine`
// were the row's buttons. The row has one button now, for the next thing, and
// the rest are rows of the native menu behind the ellipsis, drawn through
// `ui:popupMenu` and never in the DOM. The menu rows are below, in the order
// the menu draws them.

/** The next step of a row whose agreement a person has to read first. */
export const BTN_REVIEW = 'Review…';

/** The next step of a row whose machine asked for a password or a key. */
export const BTN_SET_UP_SIGN_IN = 'Set up sign-in…';

/** The next step of a row that is ready, and the Add flow's last button. */
export const BTN_OPEN_FOLDER = 'Open a folder on it…';

/** Said when main refuses to open a folder on a row nobody confirmed. */
export const OPEN_FOLDER_NEEDS_CONFIRM =
  'Confirm this machine before Tortie opens a folder on it.';

/** The menu row that runs the connection test on a saved machine. */
export const MENU_TEST = 'Test the connection';

/** The menu row that opens what a machine runs, and everything beside it. */
export const MENU_WHAT = 'What Tortie runs there…';

/**
 * The menu row that withdraws the confirmation. It is the same call the old
 * Withdraw button made, and it is the only row that also takes back an
 * accepted version, which its sub-line says.
 */
export const MENU_FORGET = 'Stop trusting this machine';

/** The sub-line under that row while an acceptance of a version stands. */
export function alsoTakesBackVersion(version: string): string {
  return `Also takes back version ${version}`;
}

/** The menu row that asks the removal question under the row. */
export const MENU_REMOVE = 'Remove…';

/** Closes the panel open under a row. */
export const BTN_CLOSE = 'Close';

/**
 * The ellipsis button's own label, because up to 32 of them would otherwise
 * read the same to anybody reading the page rather than looking at it.
 */
export function moreLabel(label: string): string {
  return `More for ${label}`;
}

// ---------------------------------------------------------------------------
// Prepare this machine (Phase 69)
// ---------------------------------------------------------------------------
//
// Labels only. Every sentence about an outcome comes from main, unchanged, per
// the rule at the top of this file. The button is enabled only for a confirmed
// row, and it says what it will do before it does it, because it is the first
// thing Tortie ever starts on another machine.

export const BTN_PREPARE = 'Prepare this machine';

/**
 * The hover of Prepare this machine.
 *
 * PHASE 340 deleted the second sentence, which said this is the first thing
 * Tortie runs there. It stopped being true when the check began asking the one
 * program it found for its version before the Add press.
 */
export const PREPARE_EXPLAIN =
  'Tortie starts the program on that machine that keeps your work alive, and ' +
  'sets it up the way Tortie needs.';

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

/**
 * Drawn above the sheet that accepts the version a machine reports.
 *
 * PHASE 324, the ruled round. It said "a version", which was false on the one
 * refusal that is about an acceptance: a machine whose acceptance names
 * another version. A sheet is only ever drawn for a version that is not the
 * accepted one, so "this version" is true wherever it is drawn.
 */
export const ACCEPTED_VERSION_NONE =
  'You have not accepted this version for this machine.';

// PHASE 340 DELETED `Withdraw this version` and the paragraph beside it. The
// button made the same call Withdraw made, so it is the one menu row Stop
// trusting this machine now, and the paragraph became that row's sub-line.

// ---------------------------------------------------------------------------
// Letting Tortie save a file on one machine (Phase 101), removed (Phase 336)
// ---------------------------------------------------------------------------
//
// PHASE 336 REMOVED the block's heading, its folder field's label, its four
// button labels and its two sentences, nine exports in all (build/p336/SPEC.md
// section 5 names them). A project open on a confirmed machine is a folder
// Tortie may write under, as a project open on this Mac is (research 138, his
// ruling of 4 October 2026: "Zero presses ... I don't want any grants."), so
// nothing is turned on here any more. A folder typed in an earlier build is
// still drawn by main in the row's confirmed lines, and Withdraw still clears
// it.

/** Stands immediately before the version the machine reported. */
export const PREPARE_VERSION_LABEL = 'Version on that machine:';

/** Stands immediately before the list of versions Tortie has measured. */
export const PREPARE_SUPPORTED_LABEL = 'Versions Tortie has measured:';

/**
 * Stands immediately before the settings table, which Phase 131 moved behind
 * the row's disclosure. "asserted" was the word the mechanism uses. A person
 * reading this panel is not reading about the mechanism.
 */
export const PREPARE_SETTINGS_LABEL = 'Settings Tortie set on that machine:';

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

// ---------------------------------------------------------------------------
// What Tortie runs there (Phase 131, moved by Phase 340)
// ---------------------------------------------------------------------------
//
// Phase 131 put four things behind a disclosure named "More about this
// machine". Phase 340 moved them, with the row's lines, warning and key line,
// into the panel the menu row What Tortie runs there… opens, so the disclosure
// and its label are gone.

/**
 * Stands immediately before the first twelve characters of the confirm hash.
 *
 * The hash used to sit in the button row with nothing at all saying what it
 * was. The operator read `5fbded51f334` and could not tell what it referred
 * to. It is the fingerprint of the facts the agreement covers, so the label
 * says that in the words a person would use.
 */
export const ROW_HASH_LABEL = 'Fingerprint of what you confirmed:';

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
// Add a machine (Phase 340: pick, check, add)
// ---------------------------------------------------------------------------
//
// THREE STEPS AND ONE PRESS. A person picks a machine from the tailnet or types
// its address, Tortie checks it by itself, and one press, Add <name>, confirms
// the same hashed lines and prepares it. At rest the sheet is twelve words
// besides the tailnet's own rows (build/p340/SPEC.md section 8.1), and every
// sentence that used to stand on it is a hover, a disclosure or gone.
//
// WHAT PHASE 340 DELETED HERE. `Find machines on your tailnet` (the sheet looks
// when it opens), `Tortie has not looked yet.`, the count of other machines,
// `Test the connection`, `Testing the connection`, `Cancel the test`,
// `Add this machine and confirm it` and the paragraph that said why that button
// was off (no Add is drawn until the check has answered).

export const ADD_TITLE = 'Add a machine';
export const BTN_ADD_CANCEL = 'Cancel';

// ---------------------------------------------------------------------------
// The tailnet list (Phase 79, reshaped by Phase 340)
// ---------------------------------------------------------------------------
//
// The panel's head is two words and one button. What Tailscale is for, where
// Tortie read it from and when it last looked are the hover of the head, so a
// person who wants them has them and a person who does not reads two words.
// For a Mac with no Tailscale the install command is still drawn in code font
// with a copy control beside it, and Tortie never runs it.

/**
 * The head of the list. Its hover carries the sentences below. PHASE 340 put it
 * in place of the one word `Tailscale` the head read until then.
 */
export const TAILNET_TITLE = 'Your tailnet';

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

export const TAILSCALE_LOOKING = 'Looking';

export const BTN_TAILSCALE_LOOK_AGAIN = 'Look again';

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

/** Stands immediately before the absolute path Tortie ran, in the hover. */
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

// ---------------------------------------------------------------------------
// Typing an address, and the fields behind Advanced
// ---------------------------------------------------------------------------

/** Reveals the address field and Check. */
export const BTN_TYPE_ADDRESS = 'Type an address…';

/** Checks a typed address. Return in the field does the same. */
export const BTN_CHECK = 'Check';

export const FIELD_HOST = 'Machine address';
/** Spelled the way the app spells it everywhere a person reads it (Phase 197 item 20). */
export const FIELD_COLOR = 'Color';
export const FIELD_USER = 'Sign in as';
export const FIELD_USER_HINT =
  'Leave this empty to use the same name you use on this Mac.';

export const ADVANCED = 'Advanced';

export const FIELD_PORT = 'Port';
export const FIELD_PORT_HINT = 'Leave this empty for the usual port.';

export const FIELD_REMOTE_PATH = 'Program path on that machine';

/**
 * PHASE 340. The hint was three sentences about what the program is for. The
 * check now looks through that machine's own shell and the usual install
 * folders by itself, so the field is for an odd place only, and the hint says
 * the one thing a person needs to know about leaving it empty.
 */
export const FIELD_REMOTE_PATH_HINT = 'Leave this empty and Tortie finds it.';

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
// The check (Phase 340), a list of ticks
// ---------------------------------------------------------------------------
//
// Every value these compose arrives from main: the address the check ran
// against, the account the machine said it signed in as, the path the machine
// reported and the version that program printed. This file writes the words
// around them and nothing else, so a later edit here cannot change what the
// agreement binds.

/**
 * The versions Tortie has measured on another machine, drawn inside What it
 * runs beside the Add button.
 *
 * A renderer may not import main, so this list is a copy, and a copy going
 * stale is exactly how the deleted sentence above happened.
 * `machines-copy.test.ts` imports `TESTED_REMOTE_TMUX_VERSIONS` from main and
 * fails when the two disagree, so the list is kept honest by a test rather
 * than by a promise.
 */
export const MEASURED_VERSIONS: readonly string[] = [
  // PHASE 342 (build/p342/SPEC.md D1, D17). The four rows before 3.6, each
  // measured on the copy a package manager installs on a scratch machine
  // Tortie made for the measurement, oldest first.
  '3.2a',
  '3.3a',
  '3.4',
  '3.5a',
  '3.6',
  '3.6a',
  '3.6b',
  '3.7b',
  '3.7c'
];

/** The one row drawn while the check runs. `label` is the machine's name. */
export function checkingLine(label: string): string {
  return `Checking ${label}…`;
}

export const BTN_STOP = 'Stop';

/** Runs the same check again, against the same machine. */
export const BTN_RECHECK = 'Check again';

/** The first tick: the address the check reached, with the port when one is set. */
export function reachedLine(host: string, port: number | null): string {
  return port === null ? `Reached ${host}` : `Reached ${host}:${String(port)}`;
}

/** The second tick: the account the machine said it signed in as. */
export function signedInLine(account: string): string {
  return `Signed in as ${account}`;
}

/** The third tick: the program the machine reported, by its path. */
export function foundLine(path: string): string {
  return `Found ${path}`;
}

/**
 * How the check found the program, as the hover of the third tick. Keyed by
 * the source main names on `MachineCheckView.program`.
 */
export const FOUND_SOURCE_HOVER: Readonly<
  Record<'login' | 'path' | 'install' | 'typed', string>
> = {
  login: 'Found by its login shell.',
  path: 'Found on the list a command uses there.',
  install: 'Found in a usual install folder.',
  typed: 'The path you typed.'
};

/** The fourth tick, for a version Tortie has measured. */
export function versionLine(version: string): string {
  return `Version ${version}`;
}

/** The fourth tick, for a version Tortie read and has not measured. */
export function versionUnmeasuredLine(version: string): string {
  return `Version ${version}, not yet measured`;
}

/**
 * The fourth tick, for a program found only in a usual install folder. The
 * check does not run such a program before the Add press, because nothing says
 * that machine's own shell would run it under that name, so Prepare reads its
 * version afterwards.
 */
export const VERSION_NOT_READ = 'Version: read when it is added';

/** The fourth tick, for a program whose answer was not a version. */
export const VERSION_UNREADABLE = 'It did not say its version.';

/** Stands over the programs a check found when it found more than one. */
export const CHOOSE_PROGRAM = 'Which one should Tortie run?';

/** The question a first-seen machine raises, beside its fingerprint. */
export const HOST_KEY_ASK = 'Tortie has not met this machine before.';

/** The fingerprint the machine presented, as the program printed it. */
export function fingerprintLine(fingerprint: string): string {
  return `Fingerprint ${fingerprint}`;
}

/** Answers the first-seen question yes, and nothing else. */
export const BTN_TRUST = 'Trust it';

/** Opens Advanced on the program path, after a check found no program. */
export const BTN_TYPE_PATH = 'Type its path…';

/** The disclosure that holds the transcript, main's detail and the answer field. */
export const DETAILS_LABEL = 'Details';

export const BTN_SEND = 'Send';

// ---------------------------------------------------------------------------
// The Add step, and what follows it
// ---------------------------------------------------------------------------

/** The name a machine carries in Tortie. Presentation, never hashed. */
export const FIELD_NAME = 'Name';

/** The one press that confirms the machine and prepares it. */
export function addLabel(label: string): string {
  return `Add ${label}`;
}

/** The one line on that button for a version Tortie has not measured. */
export function acceptsVersionLine(version: string): string {
  return `Accepts version ${version}`;
}

/** The disclosure beside the button that holds every line the press binds. */
export const WHAT_IT_RUNS = 'What it runs';

/** The button while the add and the prepare after it are in flight. */
export const ADDING = 'Adding…';

/** Said when the add and the prepare both answered. */
export function readyLine(label: string): string {
  return `${label} is ready.`;
}

/** Stands immediately before the agents the scan found on that machine. */
export const AGENTS_ON_IT = 'Agents on it:';

/** Closes the Add flow once the machine is ready. */
export const BTN_DONE = 'Done';

/**
 * Returned by the store when the Add press arrives with no sheet to bind, which
 * the surface never draws a button for. It is a sentence rather than silence,
 * because a call that did nothing should say so.
 */
export const ADD_NEEDS_CHECK =
  'Tortie adds a machine only after it has checked it.';

/**
 * The first of the two lines Tortie writes into the transcript. It stands
 * immediately before the absolute path of the program Tortie started.
 */
export const TRANSCRIPT_RUNNING_LABEL = 'Tortie is running:';

/**
 * The second. Everything drawn after it is another program's bytes.
 *
 * PHASE 130. This said "Tortie does not change it" and that was not exactly
 * true. Main removes the ANSI control sequences and strips the marker pair
 * Tortie asked the program to print, which the header of
 * ConnectionTestView.tsx states in as many words. A promise that is not exact
 * is worse than a promise that is not made, so that half is gone. The two
 * promises that ARE exact, being that Tortie does not store the bytes and does
 * not answer them for the person, both stay.
 */
export const TRANSCRIPT_SOURCE_LINE =
  'Everything below this line comes from that program and from the machine. ' +
  'Tortie does not store it and does not answer it for you.';

export const ANSWER_LABEL = 'Answer';
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
  // PHASE 130. Two sentences went. "macOS ships with Remote Login turned off,
  // so that is the usual reason" explains why the machine refused, and a
  // person reading a refusal with the action above it does not need the
  // background. "and check that it is listening on this port" is already said
  // by main's own detail one line up, which reads "Something is at that
  // address and it is not accepting connections on this port." The first
  // sentence, the one the operator could not find, is unchanged word for word.
  refused:
    'On that Mac, open System Settings, then General, then Sharing, and turn ' +
    'on Remote Login. On a machine that is not a Mac, start its sign in ' +
    'service.',
  // PHASE 79.1 FIX ROUND. The machine answered and asked for a password.
  // Main's detail says that much and says Tortie stopped there. What it does
  // not say is that the way out is on this panel, and that the password is
  // asked for once rather than on every connection.
  //
  // PHASE 130. "It asks for that machine's password once" went, because
  // KEY_PASSWORD_HINT says what becomes of the password beside the field that
  // takes it, one block down, and main's third note says it again there. A
  // person reads it next to the thing it is about. "for you" was filler.
  'password-required':
    'The block under this one makes a key and puts it on that machine. After ' +
    'that Tortie signs in with the key and never asks for that password ' +
    'again.',
  // PHASE 79.1. Tortie can now do this itself, so the sentence names the
  // block that does it rather than telling a person to go and do it by hand.
  // The block stands under this one, on the same panel.
  //
  // PHASE 130. The opening sentence went. It restated main's headline for this
  // class, which reads "The machine refused your sign in." The rule at the top
  // of this block says a remedy does not repeat main's detail sentence, and
  // repeating the headline is the same defect one line higher.
  'auth-refused':
    'Your key may not be on that machine yet. The block under this one makes ' +
    'a key and puts it there.',
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
  // PHASE 340 (D14). The program is on this Mac and macOS would not start it.
  // Main's detail names the reason when there is one. What a person can do is
  // the same whatever the reason, and it is not what `client-missing` says,
  // which is why the two classes were split.
  'client-failed':
    'Quit Tortie and open it again. If this keeps happening, restart this Mac.',
  // PHASE 340 (D4). The check found more than one program and ran none. The
  // buttons under the question are the next step, so there is nothing to add.
  'program-choice': null,
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
    'runs, or put a version Tortie has already measured on it.',
  // PHASE 342 (build/p342/SPEC.md D18). No advice: main's detail says what
  // is true (a setting that tmux is too old for, a program updated beside a
  // server that kept running, a server that is not the version it says), and
  // Tortie names no install command (the rule in src/main/machines/errors.ts).
  'program-refused': null
};

/**
 * PHASE 340's fix round. The advice under a check that signed in and whose
 * answer Tortie could not read, being an `unknown` outcome main marks
 * `signedIn`. REMEDY's `unknown` row tells a person to read the last line the
 * program printed, which here is Tortie's own marker or a line of something
 * else, so these name the usual cause and the way past it instead. A check
 * whose path was typed reads the one answer that names that path, so the
 * first, beside Type its path…, says so; the second is for a check that
 * already carried a path, where typing one again would change nothing.
 */
export const CHECK_UNREAD_REMEDY =
  'A file that machine reads when you sign in printed into the answer. Type ' +
  "the program's path and Tortie reads past it, or quiet that file and check " +
  'again.';

export const CHECK_UNREAD_REMEDY_TYPED =
  'A file that machine reads when you sign in printed into the answer. Quiet ' +
  'that file, then check again.';

// PHASE 340 DELETED `REMEDY_ALREADY_SAYS_REMOTE_LOGIN`. It decided which of
// main's key notes stood on the face of the key block and which stood behind
// its disclosure. Every one of main's lines, its warning and its five notes now
// stands behind What this does, so there is nothing left for it to decide.

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

// PHASE 340 DELETED `Set up a key for this machine` and `What Tortie will do`,
// the block's two headings. The key step is a password field, one hint and one
// button, and main's lines, warning and notes stand behind What this does.

export const KEY_PASSWORD_LABEL = "That machine's password";

/**
 * What happens to what a person types, said beside the field rather than
 * after it. The bytes cross one call and nothing keeps a copy of them.
 *
 * PHASE 340 shortened it from seventeen words to eight, because the key step
 * is now one line on the check rather than a block of its own.
 */
export const KEY_PASSWORD_HINT = 'Sent once to sign in. Tortie keeps no copy.';

/** Makes a key, puts its public half on that machine, then checks again. */
export const BTN_INSTALL_KEY = "Put Tortie's key on it";

/**
 * The disclosure that holds main's own lines, warning and five notes, drawn
 * byte for byte, one press away (PHASE 340, D10).
 */
export const KEY_WHAT_THIS_DOES = 'What this does';

export const INSTALLING_KEY = 'Setting up the key';

/**
 * The button's hover for as long as it is off. PHASE 340 moved it from a line
 * under the button onto the button, the shape the Add flow's button has.
 *
 * PHASE 130. The second sentence went. KEY_PASSWORD_HINT stands immediately
 * above the button and already says the password crosses one call and that
 * Tortie keeps no copy of it. The sentence a control that is off needs is the
 * one that says how to turn it on.
 */
export const KEY_DISABLED_REASON = "Type that machine's password first.";

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

// PHASE 340 DELETED `More about this key`. Its two notes stand behind What
// this does with the other three, and that disclosure has one label.

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

/**
 * PHASE 129. The pages the Agents tab is now divided into.
 *
 * The heading that used to sit over the per machine blocks is deleted. One
 * page draws one machine and the page's own tab already names it, so a heading
 * above that card said the same thing twice.
 */

/** The first page, which is the Mac Tortie is running on. */
export const AGENTS_PAGE_THIS_MAC = 'This Mac';

/** What the row of pages is, for a person reading the page rather than looking at it. */
export const AGENTS_PAGES_LABEL = 'Which machine these agents are on';

/**
 * The one sentence block a machine page opens with.
 *
 * PHASE 129. It used to say "each machine", because Phase 110 drew every
 * machine's card in one scroll under one caption. A page draws exactly one
 * machine now, so the caption says "this machine". The last sentence is
 * unchanged and is pinned by a test, because it is the refusal: it says where
 * installing happens and this surface offers nothing that could do it.
 */
export const AGENTS_ON_MACHINES_CAPTION =
  'These are the agents Tortie found on this machine the last time it asked. ' +
  'Tortie asks once when the machine signs in, and again when you press ' +
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
  ACCEPTED_VERSION_LABEL,
  // Phase 131. It stands immediately before the first twelve characters of the
  // confirm hash and carries nothing of its own past the colon.
  ROW_HASH_LABEL,
  // Phase 340. It stands immediately before the agents the scan found on a
  // machine that was just added, and carries nothing of its own past the colon.
  AGENTS_ON_IT
];

/**
 * PHASE 340. The one string whose colon follows its first word, being a fact
 * row's label and the value that row reads. It is named here so the colon check
 * stays exact: a colon anywhere else in any string still fails.
 */
export const LINES_WITH_A_LABEL_COLON: readonly string[] = [VERSION_NOT_READ];
