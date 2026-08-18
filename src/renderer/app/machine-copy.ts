/**
 * Every sentence the main renderer says about a session that runs on another
 * machine (Phase 70, M3).
 *
 * WHY ONE MODULE. Four surfaces draw these words, being the session dock row,
 * the tab, the identity strip and the create sheet. A vocabulary audit
 * (./__tests__/machine-vocabulary.test.ts) reads this file and the surfaces
 * that use it, and fails on any word from the transport layer. One module is
 * one file for a reviewer to read when they want to know what Tortie claims
 * about a machine it cannot see.
 *
 * WHAT THE WORDS ARE ALLOWED TO CLAIM. PHASE 72 changed this paragraph, and the
 * change is the phase. A remote session now HAS a row in Tortie's own records
 * and it has saved output on this Mac, so Tortie can start it again on that
 * machine. Two things it still does not have, and every sentence here has to
 * keep saying so: there is no conversation id for it, so the conversation does
 * not come back, and the saved output is not put back into the recreated
 * session on the other machine. There is also no launch snapshot for it, which
 * is what {@link NO_SNAPSHOT} says.
 *
 * Machines have labels and sessions have names. No sentence here names the
 * transport, the program Tortie runs on the far side, or any of its verbs.
 */

// ---------------------------------------------------------------------------
// The badge
// ---------------------------------------------------------------------------

/**
 * The badge's own sentence, on every surface that draws it.
 *
 * It is a full sentence rather than the bare label because the label alone
 * ("Studio") answers no question a person was asking. The badge shows the
 * label and this says what the label means.
 */
export function badgeTitle(label: string): string {
  return `This session runs on ${label}.`;
}

/**
 * The badge's sentence while that machine is quiet.
 *
 * It says what happened rather than what it means, because what it means is on
 * the condition bar beside it and two sentences saying the same thing on one
 * screen is the Phase 67 nit repeated.
 */
export function badgeQuietTitle(label: string): string {
  return `${label} did not answer.`;
}

/**
 * The badge's sentence for a machine that has not answered ONCE in this run
 * (Phase 71).
 *
 * `badgeQuietTitle` above is for a machine that was answering and stopped. This
 * one is for the case that used to be invisible: Tortie started, the machine
 * was already down, and there is no session row anywhere on this Mac to hang a
 * status on. So the sentence names the machine and then names the one thing a
 * person can do about it, which is the button in Settings.
 */
export function badgeSilentTitle(label: string): string {
  return (
    `${label} has not answered since Tortie started. Settings then Machines ` +
    'has a button that tries again.'
  );
}

// ---------------------------------------------------------------------------
// The condition bar for a machine Tortie holds no rows for (Phase 71)
// ---------------------------------------------------------------------------

/**
 * Several labels as one phrase, e.g. "Studio and Attic".
 *
 * The same shape main uses for its version list, written again here because the
 * renderer shares no module with main and three lines of joining does not earn
 * a place in the shared contract.
 */
function joinLabels(labels: readonly string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0] ?? '';
  const head = labels.slice(0, -1).join(', ');
  return `${head} and ${labels[labels.length - 1] ?? ''}`;
}

/**
 * The bar when a confirmed machine has not answered and Tortie holds no rows
 * for it.
 *
 * WHY THIS IS A SECOND SENTENCE AND NOT A REWORDING OF THE FIRST. The bar
 * Phase 67 shipped says "Your sessions are untouched. Tortie just cannot see
 * them", and it is about sessions that are on the screen with their status
 * dimmed. Here there is nothing on the screen at all: no record of a remote
 * session is kept on this Mac, so a machine that has never answered in this run
 * contributes no rows. Reusing the old sentence would point at rows that are
 * not there.
 *
 * WHAT IT MUST NEVER SAY. It must not say the sessions are running, because
 * nothing proved that. It must not say they ended, because nothing proved that
 * either. It says what Tortie did, which is nothing.
 */
export function machineSilentText(labels: readonly string[]): string {
  return (
    `Tortie could not reach ${joinLabels(labels)}. Sessions you started ` +
    'there are not shown here, and Tortie did not end any of them.'
  );
}

// ---------------------------------------------------------------------------
// Restore, offered and refused (Phase 72)
// ---------------------------------------------------------------------------

/**
 * What Restore does for a session on another machine, said before the click.
 *
 * PHASE 72 replaced `RESTORE_COMING` with this. That sentence said bringing a
 * session back on another machine was coming in a later release, and this is
 * that release, so the sentence became false and was deleted rather than
 * reworded.
 *
 * Three claims, in the order a person needs them. What comes back: the session,
 * on that machine, in the same folder, running the same program. What stays
 * here: the output Tortie saved, which is not put back on the other machine.
 * What does not come back: the conversation. The second and third are the
 * whole difference between a restore on this Mac and a restore on a machine,
 * and they are said here rather than discovered in an empty pane.
 */
export function restoreRemoteBody(label: string): string {
  return (
    `Restoring starts this session again on ${label}, in the same folder, ` +
    `running the same program. The output Tortie saved is kept on this Mac ` +
    `and is not put back on ${label}. The conversation does not come back.`
  );
}

/**
 * The body when Restore is NOT offered and main gave no sentence of its own.
 *
 * Main sends one sentence naming the condition that failed, and `restoreReason`
 * carries it. This is what is drawn if that field is ever null while the verb
 * is refused, which the projection should never produce. It states the general
 * rule rather than guessing at which condition failed, so it is true in every
 * case it can be reached in.
 */
export function restoreNotOfferedBody(label: string): string {
  return (
    `Tortie is not bringing this session back right now. It has to be able to ` +
    `see ${label}, and it has to check that the session is not already ` +
    `running there. Nothing was started.`
  );
}

/**
 * Drawn under the ended block for a remote row that has saved output here.
 *
 * The output is on this Mac and the restore does not put it back, so a person
 * needs to be told where it went. The menu item it names is
 * {@link SAVED_OUTPUT_ITEM}.
 */
export const RESTORE_KEPT_HERE =
  "Tortie kept a copy of this session's output on this Mac. Open it from the " +
  'session menu.';

// ---------------------------------------------------------------------------
// The saved output panel (Phase 72)
// ---------------------------------------------------------------------------

/** The session menu item that opens the panel. */
export const SAVED_OUTPUT_ITEM = 'Show saved output…';

/** The panel's own title. */
export const SAVED_OUTPUT_TITLE = 'Saved output';

/** Under the menu item, and in the panel, when there is nothing to show. */
export const SAVED_OUTPUT_NONE = 'Tortie has no saved output for this session.';

/** While the read is in flight. It is one file read and it is usually a blink. */
export const SAVED_OUTPUT_LOADING = 'Reading the saved copy…';

/** Month names in full, because "17 Aug" reads as an abbreviation of nothing. */
const MONTHS = [
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

/**
 * One instant, in this Mac's own local time, as "17 August 2026 at 14:32".
 *
 * ONE helper, so every surface says it the same way. The instant is always this
 * Mac's clock at the moment the copy finished arriving, never a clock on the
 * other machine, which is what makes it safe to read against the reader's own
 * watch.
 */
export function savedWhen(at: number): string {
  const d = new Date(at);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return (
    `${String(d.getDate())} ${MONTHS[d.getMonth()] ?? ''} ` +
    `${String(d.getFullYear())} at ${hours}:${minutes}`
  );
}

/** The clause both headers end with. */
const KEPT_HERE_TAIL = 'This is a copy Tortie kept on this Mac. It is not live.';

/**
 * The line above the saved output, for a session on another machine.
 *
 * The capture time is on screen every time, and it is the reason the line
 * exists. Saved output looks exactly like live output, so without the time a
 * person reads an hours old screen as the current one.
 *
 * `at` is 0 for a copy written before Tortie recorded capture times. That case
 * says so in a sentence of its own rather than drawing a date from nowhere.
 */
export function savedOutputHeader(label: string, at: number): string {
  if (at <= 0) {
    return `Saved from ${label}. Tortie did not record when this copy was taken. ${KEPT_HERE_TAIL}`;
  }
  return `Saved from ${label} on ${savedWhen(at)}. ${KEPT_HERE_TAIL}`;
}

/** The same line for a session on this Mac, which names no machine. */
export function savedOutputHeaderLocal(at: number): string {
  if (at <= 0) {
    return `Saved. Tortie did not record when this copy was taken. ${KEPT_HERE_TAIL}`;
  }
  return `Saved on ${savedWhen(at)}. ${KEPT_HERE_TAIL}`;
}

/**
 * Under the header when the bytes did not match what was recorded for them.
 *
 * The panel still shows them, because unproven text a person can read is worth
 * more than an empty panel, and it says what it is showing.
 */
export const SAVED_OUTPUT_UNVERIFIED =
  'Tortie could not check these bytes against what it recorded for them, so ' +
  'this copy may be incomplete.';

/**
 * The sentence under `Show what it loaded…` for a session on another machine.
 *
 * The launch snapshot is written on this Mac at create time and there is none
 * for a session created on another machine, so the verb is offered disabled
 * with the reason rather than removed. A verb that vanishes teaches nothing.
 */
export const NO_SNAPSHOT =
  'Tortie has no record of what this session loaded, because that record is ' +
  'only kept for sessions on this Mac.';

// ---------------------------------------------------------------------------
// The create sheet
// ---------------------------------------------------------------------------

/** The label over the machine choice. */
export const MACHINE_FIELD_LABEL = 'Machine';

/** The first choice in the list, and the one every create had before this. */
export const THIS_MAC = 'This Mac';

/** The directory field's label once a machine is chosen. */
export function createDirLabel(label: string): string {
  return `Directory on ${label}`;
}

/** What the empty directory field shows once a machine is chosen. */
export function createDirPlaceholder(label: string): string {
  return `Your home directory on ${label}`;
}

/** Under the directory field, once a machine is chosen. */
export const CREATE_DIR_HINT =
  'This folder is on the other machine. Tortie does not check that it is ' +
  'there, because it is not on this Mac.';

/**
 * The second half of the directory hint.
 *
 * Tortie holds no list of home directories, and this release adds no way to
 * ask for one, so an empty field is the way to say "start where I land". The
 * sentence exists so a person does not have to guess a path.
 */
export const CREATE_DIR_EMPTY_HINT =
  'Leave this empty to start in your home directory on that machine.';

/**
 * The first line of the honesty block, and the one that matters most.
 *
 * PHASE 72 rewrote it because it had become false. It used to say Tortie did
 * not save what the session printed, did not keep a record of it here, and
 * could not bring it back. Tortie now does all three, so the sentence names
 * what it does and then names the one thing it still cannot do, which is the
 * conversation.
 */
export const CREATE_HONESTY =
  'A session on another machine runs there and keeps running when you quit ' +
  'Tortie. Tortie keeps a record of it on this Mac, keeps a copy of what it ' +
  'prints, and can start it again on that machine. The conversation does not ' +
  'come back.';

/**
 * The second line. The numbers are chosen rather than measured, and no copy
 * anywhere claims otherwise.
 */
export const POLL_HONESTY =
  'Tortie asks this machine for its list every 5 seconds while this window ' +
  'is in front, and every 30 seconds when it is not. What you see can be ' +
  'that old.';

/**
 * The third line.
 *
 * The status oracles read this Mac's own disk, so none of them can run for a
 * session on another machine. What a list can report is that the session is
 * there and that it printed something, and that is what the sentence says.
 */
export const ATTENTION_HONESTY =
  'Tortie cannot yet tell you when a session on another machine is waiting ' +
  'for you. It can tell you that the session is there and whether it printed ' +
  'anything since the last check.';

/**
 * The fourth line, added while the sheet was built.
 *
 * The board above the choice says which agents are installed, and it says it
 * about this Mac, because the scan that fills it runs here. Drawing that board
 * over a create that will run somewhere else claims a fact nobody checked, so
 * the sheet says which machine the board is about. Tortie does not check the
 * other machine in this release, and a create that names an agent the machine
 * does not have fails there with the machine's own answer.
 */
export const AGENT_LOCAL_CHECK =
  'The board above says which agents are installed on this Mac. Tortie has ' +
  'not checked what is installed on the other machine.';

/**
 * The fifth line, added by Phase 72 with the copy it describes.
 *
 * The number is CHOSEN rather than measured and the sentence does not pretend
 * otherwise: it says how often Tortie asks and it says the copy can be that
 * old. It also says the one condition, which is that Tortie has to be able to
 * see the machine, because a copy stops the moment the machine goes quiet.
 */
export const CAPTURE_HONESTY =
  'While Tortie can see the machine, it copies what each session printed ' +
  'about every 2 minutes and keeps that copy on this Mac. The copy can be ' +
  'that old, and Tortie stops taking copies while it cannot see the machine.';

/** The five honesty lines in the order the sheet draws them. */
export const CREATE_HONESTY_LINES: readonly string[] = [
  CREATE_HONESTY,
  POLL_HONESTY,
  CAPTURE_HONESTY,
  ATTENTION_HONESTY,
  AGENT_LOCAL_CHECK
];
