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

// The ceiling one read may bring back. Phase 100's cut sentence states it as a
// number rather than as a word, and it reads it from the contract so the
// sentence cannot drift away from the rule main applies.
import { REMOTE_SESSION_LINES_BYTES_MAX } from '@shared/ipc';
// The one size formatter this codebase has. Phase 100's counts sentence uses it
// so a size reads the same in the panel as it does in the session menu.
import { formatScrollbackBytes } from '@shared/scrollback';

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
// The status note on a row that runs on another machine (Phase 85)
// ---------------------------------------------------------------------------

/**
 * What the status dot on a remote row is worth, said where the dot is drawn.
 *
 * WHY THIS SENTENCE IS HERE AND NOT ON THE CREATE SHEET. Phase 87 deleted the
 * paragraph that said these same two numbers under the machine field on the
 * create sheet, and the reason it gave is still true. A person on that sheet
 * has not created anything, so a cadence describes nothing they can see yet.
 * The deleted name is recorded in ./__tests__/create-copy.test.ts, which is
 * also what stops it coming back, so it is not written again here.
 *
 * What was wrong with that sentence was never its numbers. It was its scope,
 * because those two cadences applied only to a machine Tortie was not connected
 * to. Phase 85 makes both numbers true for every machine, whatever feed it is
 * on, so the sentence is true again and it is drawn on the row whose dot it
 * explains.
 *
 * WHAT IT CLAIMS. Two things, and no more. The first is how often Tortie asks,
 * which is what tells a person how old a dot can be. The second is the one
 * thing the dot cannot say for a session on another machine, which is that the
 * session is waiting for them. Tortie works that out from files this Mac holds,
 * and a session on another machine writes those files over there.
 *
 * WHERE IT IS DRAWN. `sessionTooltip` in ./session-actions.tsx, on the second
 * line, which is the line a session on this Mac uses for its resume sentence.
 * That reaches the dock row, the tab and the rail hover card with no further
 * edit. It is drawn only for a machine that is answering, because a promise to
 * ask every 5 seconds beside a machine that answers nothing is the class of
 * claim Phase 67 existed to end.
 */
export function remoteStatusNote(label: string): string {
  return (
    `Tortie asks ${label} what its sessions are doing every 5 seconds while a ` +
    `Tortie window is in front, and every 30 seconds when none is. A session ` +
    `on another machine never says it needs input, because Tortie works that ` +
    `out from files on this Mac.`
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
 * on that machine, in the same folder. What stays here: the output Tortie
 * saved, which is not put back on the other machine. What happens to the
 * conversation, which has two answers as of Phase 89.
 *
 * PHASE 89 REWROTE THE THIRD CLAIM. It said flatly that the conversation does
 * not come back, and that is no longer true for every row. A remote restore now
 * starts that machine's own shell and types the command that continues the
 * conversation into it, for a row two answers prove, being the arming gate and
 * the composer in main. THIS FILE CANNOT KNOW WHICH ROW THAT IS. Both answers
 * are read at restore time, one of them against the machine itself. So the
 * sentence gives both outcomes and names the thing that decides between them,
 * which is whether Tortie recorded the conversation.
 *
 * It also stopped saying "running the same program", because a row that arms
 * comes back running the machine's own shell with the command waiting in it.
 */
export function restoreRemoteBody(label: string): string {
  return (
    `Restoring starts this session again on ${label}, in the same folder. The ` +
    `output Tortie saved is kept on this Mac and is not put back on ${label}. ` +
    `When Tortie recorded this conversation it types the command that ` +
    `continues it into the session and you press Enter, and otherwise the ` +
    `session comes back running the same program with no conversation.`
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

/**
 * Under the directory field, once a machine is chosen.
 *
 * PHASE 84 REWROTE IT BECAUSE IT HAD BECOME FALSE. It used to say Tortie does
 * not check that the folder is there. Tortie now asks that machine about a
 * named folder before it composes anything, and refuses when the answer is
 * that the folder is not there, is not a folder, or cannot be read.
 */
export const CREATE_DIR_HINT =
  'This folder is on the other machine. Tortie asks that machine whether the ' +
  'folder is there before it starts anything.';

/**
 * The one line of the honesty block, and the one fact that changes what a
 * person does before a session exists.
 *
 * PHASE 87 CUT THIS BLOCK FROM FIVE PARAGRAPHS TO ONE. Three of the four that
 * went said how often Tortie asks a machine for its list, how often it copies
 * what a session printed, and what it cannot yet tell you about a session that
 * is waiting for you. None of those things has happened yet on a sheet where
 * no session exists, so they belong on the surfaces where they do happen.
 *
 * The fourth said Tortie had not checked what is installed on the other
 * machine, and Phase 84 made that false. `remote-argv.ts` in
 * `src/main/machines` asks the machine itself where the named program lives
 * before anything is composed, and `noRemoteProgramRefusal` in
 * `src/main/machines/remote-copy.ts` refuses at the moment a person presses
 * Create, naming the program, the machine and how many folders were searched.
 * A false caveat is worse than a missing one, so that sentence was cut rather
 * than reworded, which is what Phase 84 did to `CREATE_DIR_HINT` above.
 *
 * What survives is the one thing a person cannot find out any other way before
 * they act, which is what happens to the conversation. The four names this
 * phase deleted are recorded in ./__tests__/create-copy.test.ts, which is also
 * what stops them coming back.
 *
 * PHASE 89 REWROTE IT. It said the conversation does not come back, and a
 * remote restore now brings it back for an agent whose conversation Tortie
 * recorded, which is seven of the thirteen. The sheet cannot promise it for the
 * agent in the picker, because the composer and the arming gate both answer at
 * restore time, so the sentence names the condition instead of the outcome.
 */
export const CREATE_HONESTY =
  'Tortie can start this session again on that machine, and it brings the ' +
  'conversation back only for an agent whose conversation it recorded.';

/** The honesty lines in the order the sheet draws them. */
export const CREATE_HONESTY_LINES: readonly string[] = [CREATE_HONESTY];

// ---------------------------------------------------------------------------
// A machine that is in the list and cannot hold a session yet (Phase 84, item 8)
// ---------------------------------------------------------------------------

/**
 * The option's own text for a machine Tortie has not signed in to in this run.
 *
 * THE OPTION STAYS IN THE LIST. A person used to pick the machine, type a
 * name, press Create and read a refusal that sent them back to the screen
 * which had just refused them. Removing the option would fix the refusal by
 * teaching nothing, which is the rule the saved output item and the review
 * item already follow. It is drawn disabled with the reason instead.
 */
export function machineNotSignedInOption(label: string): string {
  return `${label} (not signed in)`;
}

/**
 * Under the machine field, once, when at least one machine in the list cannot
 * hold a session.
 *
 * It is drawn once rather than per row, because the answer is the same for
 * every one of them and three copies of one sentence is three times the
 * reading for the same fact.
 */
export const MACHINE_NOT_SIGNED_IN_HINT =
  'Tortie has not signed in to this machine in this run, so it cannot start a ' +
  'session there. Open Settings, then Machines, then press Prepare.';

// ---------------------------------------------------------------------------
// Capture, on a session that runs on another machine (Phase 91)
// ---------------------------------------------------------------------------

/**
 * Under the Capture row, when the session will run on another machine.
 *
 * THE ROW STAYS AND IS DRAWN OFF. A row that vanishes teaches nothing, and a
 * person can reasonably read a missing checkbox as capture they turned off, as
 * capture that did not apply, or as capture that silently worked. This is the
 * same shape as {@link machineNotSignedInOption} above and as the agent tile
 * that cannot run.
 *
 * WHY IT EARNS A SENTENCE UNDER PHASE 87'S RULE. A caveat belongs on screen
 * when a person would otherwise be surprised at the moment they act. This
 * person is about to press Create. One sentence is right and a paragraph is
 * not.
 */
export function captureNotOnMachine(label: string): string {
  return `Tortie runs SpecStory on this Mac only, so a session on ${label} is not captured.`;
}

// ---------------------------------------------------------------------------
// The folder picker for another machine (Phase 84, item 6)
// ---------------------------------------------------------------------------
//
// WHY TORTIE DRAWS THIS ONE. The Choose… button beside the Directory field
// opens the panel macOS ships, and that panel walks THIS Mac's disk. A folder
// chosen in it names nothing on the other computer. So the picker for another
// machine is drawn by Tortie, out of one read of one folder at a time.
//
// WHAT IT SHOWS AND WHAT IT DOES NOT. It shows folders. It does not show
// files, it carries no file contents, and it changes nothing on that machine.

/** The button beside the Directory field, for a folder on another machine. */
export const DIR_PICKER_OPEN = 'Browse…';

/** The panel's own title. It names the machine, because the folders are there. */
export function dirPickerTitle(label: string): string {
  return `Folders on ${label}`;
}

/**
 * Said at the top of the panel, every time it is open.
 *
 * A person is told what the panel does before they use it rather than after,
 * which is the same reason the review item carries its sublabel.
 */
export const DIR_PICKER_HONESTY =
  'Tortie reads the folders on that machine. It changes nothing there.';

/** While one folder is being read. It is one question and it is usually a blink. */
export const DIR_PICKER_READING = 'Reading that folder…';

/** Goes back to that machine's own home directory, which the machine resolves. */
export const DIR_PICKER_HOME = 'Home';

/** Goes to the parent. Drawn only when the machine reported one. */
export const DIR_PICKER_UP = 'Up one folder';

/** Writes the folder on screen into the Directory field and shuts the panel. */
export const DIR_PICKER_CHOOSE = 'Use this folder';

/**
 * The label on the panel's own close control.
 *
 * Escape does the same thing, and this exists because a person using the
 * pointer needs a way out that changes nothing.
 */
export const DIR_PICKER_CLOSE = 'Close this list';

/** When the folder was read and holds no folders of its own. */
export const DIR_PICKER_EMPTY = 'There are no folders inside this one.';

/**
 * When the machine holds more folders than one listing carries.
 *
 * The count is the machine's own count of what is in there, taken separately
 * from the listing, so the sentence says how many there are rather than
 * pretending the first 500 are all of them.
 */
export function dirPickerTruncated(shown: number, total: number): string {
  return (
    `This folder holds ${String(total)} folders. Tortie is showing the first ` +
    `${String(shown)}. Type the path if the one you want is not here.`
  );
}

/** The three answers a machine gives about a folder it did not list. */
export const DIR_PICKER_MISSING =
  'There is no folder at that path on that machine.';
export const DIR_PICKER_NOTDIR =
  'That path is on that machine and it is not a folder.';
export const DIR_PICKER_DENIED =
  'That account cannot read that folder on that machine, so Tortie cannot ' +
  'show what is inside it.';

/** The fourth answer, which is that nothing came back at all. */
export function dirPickerUnreachable(label: string): string {
  return `${label} did not answer, so there is nothing to show.`;
}

// ---------------------------------------------------------------------------
// The read only review of a folder on a machine (Phase 73, M6, item 4)
// ---------------------------------------------------------------------------

/**
 * The session menu item that reads what changed in that session's folder.
 *
 * It names the machine, because the same person may have three sessions on
 * three machines open at once and the folder is on exactly one of them.
 */
export function reviewItemLabel(machineLabel: string): string {
  return `Review changes on ${machineLabel}`;
}

/**
 * Under the menu item, said every time it is offered.
 *
 * The item reads and never writes, and this is where a person is told so before
 * they press it rather than after. It is a sublabel rather than a toast because
 * a toast arrives after the act it describes.
 */
export const REVIEW_ITEM_SUBLABEL =
  'Tortie reads the folder on that machine. It changes nothing there.';

/**
 * The item's sublabel while Tortie cannot see the machine.
 *
 * The verb stays on screen and is offered disabled, which is the rule the saved
 * output item and the launch snapshot item already follow. A verb that vanishes
 * teaches nothing.
 */
export function reviewNotAnsweringSublabel(machineLabel: string): string {
  return `${machineLabel} did not answer, so there is nothing to read yet.`;
}

/** While the list is being read. It is one question and it is usually a blink. */
export const REVIEW_READING = 'Reading what changed on that machine…';

/**
 * The tooltip on a review tab.
 *
 * It says the machine and it says the tab is read only, because a diff tab in
 * Tortie is usually a file a person can edit and this one is not.
 */
export function reviewTabTooltip(name: string, machineLabel: string): string {
  return `${name} on ${machineLabel}. This view is read only.`;
}

/**
 * The title over the list of changed files.
 *
 * It names the folder rather than the repository, because the folder is what
 * the person chose when they made the session.
 */
export function reviewListTitle(machineLabel: string): string {
  return `Changed on ${machineLabel}`;
}

/**
 * The title over the new files in the same list (Phase 97).
 *
 * It is a second heading rather than more rows under the first one, because a
 * file git has never seen is a different thing from a file that changed. The
 * Source Control panel for a folder on this Mac has drawn that split since
 * Phase 4, and this menu now draws the same one.
 */
export function reviewUntrackedTitle(machineLabel: string): string {
  return `Untracked on ${machineLabel}`;
}

// ---------------------------------------------------------------------------
// The conversation copy (Phase 73, M6, item 5)
// ---------------------------------------------------------------------------

/**
 * The line under the saved output header, for the conversation copy.
 *
 * THE PROMISE IS LAST SYNC STALENESS AND NOTHING ELSE. Tortie never says a
 * conversation is current. It says when it last copied one, and the person
 * judges. A machine that has been unreachable for a day carries the same number
 * it carried a day ago, so the sentence a person reads gets older rather than
 * being refreshed. That is the same shape the header above it already uses for
 * a captured screen, which is why this line sits under that one.
 *
 * `at` is null or absent when there has never been a copy, and that case says
 * so in a sentence of its own rather than drawing a date from nowhere.
 */
export function conversationCopyLine(at: number | null | undefined): string {
  if (at === null || at === undefined) {
    return (
      'Tortie has no copy of this conversation. It copies a conversation only ' +
      'while it is connected to the machine, and it has not done so for this ' +
      'session.'
    );
  }
  return (
    `Tortie last copied this conversation on ${savedWhen(at)}. Anything the ` +
    `agent has said since then is on that machine and not on this Mac.`
  );
}

// ---------------------------------------------------------------------------
// The sidebars, when the project they are following is on another machine
// (Phase 90.1)
// ---------------------------------------------------------------------------

/**
 * WHY THIS PAIR LIVES HERE. The Context view draws one title and one body when
 * the active project is on another machine. Every other sentence this renderer
 * says about another machine is in this file, and the vocabulary audit reads
 * this file already. Putting the pair in the view file instead would mean
 * adding a module of several hundred unrelated strings to that audit's list,
 * which is the reason already recorded there for two other files.
 *
 * WHAT IT MAY CLAIM. The pair says what is true, being that the folder is on a
 * named machine, and then says what Tortie does not do, being that it reads
 * only this Mac. Neither half implies a failure, because nothing failed. There
 * is no retry offered, because there is nothing to retry.
 *
 * PHASE 90.3 DELETED THE FILES PAIR. It said "Tortie reads files on this Mac
 * only, so nothing is listed here", and from that phase the Explorer lists that
 * machine's own rows, so the sentence had become false. The Explorer's states
 * are in the Phase 90.3 block at the end of this file.
 *
 * PHASE 98 DELETED THE SEARCH PAIR, for the same reason and in the same shape.
 * It said "Search does not reach Studio" and "Tortie searches files on this Mac
 * only", and from this phase the Search view searches that machine's own folder
 * and draws that machine's own rows, so both sentences had become false. What
 * the Search view says instead is in the Phase 98 block at the end of this
 * file. The Context pair is unchanged, because Context still reads this Mac
 * only.
 */

/** The Context view, in place of its groups. */
export function contextElsewhereTitle(label: string): string {
  return `These agent files live on ${label}.`;
}

/** The Context view's second line. */
export const CONTEXT_ELSEWHERE_BODY =
  'Tortie reads skills, servers and hooks from this Mac only, so nothing is listed here.';

// ---------------------------------------------------------------------------
// This project's counterpart on another machine (Phase 90.2, items 2 and 3)
// ---------------------------------------------------------------------------
//
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

// ---------------------------------------------------------------------------
// A folder on another machine is a project (Phase 90.3)
// ---------------------------------------------------------------------------
//
// WHY THIS BLOCK IS HERE AND NOT SPREAD OVER TEN VIEW FILES. Phase 90.3 gives a
// folder on another machine its own project tab, and eight surfaces in that tab
// say something about the machine: the label band, the Explorer, Source
// Control, Quick Open, the symbol palette, the editor, the sheet that opens the
// folder, and the tab itself. Every one of those sentences is written once
// here. The vocabulary audit reads this file, so a sentence that names the
// transport fails a test rather than reaching a person.
//
// THE ONE WORD THAT NEVER APPEARS. `label` is always the name the person gave
// the machine. No sentence below says "remote", and none of them composes a
// host name.
//
// WHAT THESE SENTENCES MAY CLAIM. Tortie reads a folder on that machine and
// never writes there. That is the whole promise of the phase, and every
// refusal below is a plain statement of something Tortie does not do rather
// than a report of a failure.

/**
 * One instant on this Mac's own clock, as "14:32".
 *
 * The time of day rather than the full date, because every one of these reads
 * happens while the person is looking at the screen. The clock is this Mac's,
 * never the other machine's, so it can be read against the reader's own watch.
 */
export function readClockTime(at: number): string {
  const d = new Date(at);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// -- the label band, which is permanent --------------------------------------

/**
 * The band at the top of every view of a tab whose folder is on a machine.
 *
 * It is drawn on all four views and it never goes away. Research 54 finding 15
 * is the reason: a person looking at a sidebar had no way to tell whose files
 * they were reading, and one wrong assumption there is a change made on the
 * wrong computer.
 */
export function remoteBandTitle(label: string): string {
  return `Files live on ${label}.`;
}

/** The band's second line. It says the one thing Tortie will not do. */
export const REMOTE_BAND_BODY =
  'Tortie reads what is in this folder on that machine. It never writes there.';

// -- the Explorer ------------------------------------------------------------

/**
 * After a good read, with the time it happened.
 *
 * The time is on screen because nothing polls that machine. A file an agent
 * writes over there does not appear until Refresh is pressed, so the person is
 * told which moment they are looking at.
 */
export function remoteReadAt(at: number): string {
  return `Read at ${readClockTime(at)}. Press Refresh to read it again.`;
}

/**
 * The same sentence under the name the Explorer imports it by.
 *
 * ONE DEFINITION, TWO NAMES. The Explorer and Source Control say the same thing
 * after a good read, because it is the same fact: nothing polls that machine,
 * so the person is told which moment they are looking at. An alias rather than a
 * second copy, so the two can never drift apart.
 */
export const remoteTreeReadAt = remoteReadAt;

/** The folder named by the tab is not on that machine. */
export function remoteTreeMissingTitle(label: string): string {
  return `That folder is not on ${label}.`;
}

/** The second line, naming the exact path Tortie asked for. */
export function remoteTreeMissingBody(path: string): string {
  return `Tortie asked for ${path} and that machine says there is nothing there.`;
}

/** The path is there and it is a file. */
export function remoteTreeNotAFolder(path: string, label: string): string {
  return `${path} on ${label} is a file, not a folder.`;
}

/** That machine would not let Tortie read the folder. */
export function remoteTreeDenied(path: string, label: string): string {
  return `Tortie cannot read ${path} on ${label}.`;
}

/** The machine did not answer in time. */
export function remoteTreeUnreachable(label: string): string {
  return `${label} did not answer, so Tortie could not read that folder.`;
}

/** Tortie is not signed in to that machine in this run. */
export function remoteTreeNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it cannot read that folder.`;
}

/** The folder is there and it holds nothing. */
export function remoteTreeEmpty(label: string): string {
  return `That folder is empty on ${label}.`;
}

/**
 * The answer held more entries than one read carries.
 *
 * All three numbers are real. `shown` and `total` are the machine's own counts
 * and `max` is the cap Tortie asked under, so a person can see that the missing
 * rows exist rather than guessing that the folder is smaller than it is.
 */
export function remoteTreeTruncated(
  shown: number,
  total: number,
  max: number
): string {
  return (
    `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} files ` +
    `and folders. Tortie reads at most ${max.toLocaleString()} of them in ` +
    `one go.`
  );
}

/**
 * The one disabled row at the end of the tree's menu on a machine's file.
 *
 * The verbs that write are absent rather than disabled, because each of them
 * needs a script nobody has written. This line says once why the menu is short,
 * so the shortness is an answer instead of a puzzle.
 */
export function remoteTreeReadOnly(label: string): string {
  return `Tortie only reads files on ${label}.`;
}

/** Copy Path on a machine's file puts the machine in front of the path. */
export const REMOTE_COPIED_WITH_MACHINE =
  'Copied the path with the machine in front of it.';

// -- Source Control ----------------------------------------------------------

/** The band under the Source Control header, on a tab whose folder is there. */
export function remoteChangesBand(label: string): string {
  return (
    `These changes are on ${label}. Tortie can show them and cannot change ` +
    `them.`
  );
}

/**
 * Nothing in that folder differs from its last commit and nothing is new.
 *
 * PHASE 97 WIDENED THIS SENTENCE. Until this phase the list held tracked files
 * only, so the old wording was true about the half it could see and silent
 * about the other half. The list now holds both halves, so the sentence says
 * both.
 */
export function remoteChangesNone(label: string): string {
  return (
    `Nothing has changed in that folder on ${label}, and it holds no ` +
    `untracked files.`
  );
}

/** The machine did not answer the Source Control read. */
export function remoteChangesUnreachable(label: string): string {
  return `${label} did not answer, so Tortie could not read what changed.`;
}

/** The folder is there and git does not track it. */
export function remoteChangesNotRepo(label: string): string {
  return `That folder on ${label} is not a git repository.`;
}

/**
 * Why History and Branches are not on screen.
 *
 * Said once, under the Changes group, rather than two empty sections. Each of
 * those two needs a read Tortie does not make on another machine, and an empty
 * section would read as a repository with no history.
 *
 * PHASE 105 TOOK RUNS OUT OF THIS SENTENCE. It named three sections and Runs
 * was one of them, so the sentence became false the moment a person could
 * expand a Runs group on a tab whose folder is on another machine. The two that
 * are left are still true, and each of them is still a read Tortie does not
 * make over there.
 */
export const REMOTE_SCM_SECTIONS_ABSENT =
  'Tortie shows the changed files and the runs for a folder on another ' +
  'machine. It does not show history or branches there.';

// -- the symbol palette ------------------------------------------------------
//
// One pair, and it is a refusal. It says what does not reach that machine, then
// what Tortie does read. PHASE 99 TOOK THE QUICK OPEN PAIR OUT OF THIS BLOCK,
// because Quick Open reaches a folder on a machine now and the refusal had
// become false. The symbol palette still reads this Mac only, so this pair is
// still true and it stays.

/** The symbol palette, in place of its rows. */
export function symbolsElsewhereTitle(label: string): string {
  return `Symbols do not reach ${label}.`;
}

/** The symbol palette's second line. */
export const SYMBOLS_ELSEWHERE_BODY =
  'Tortie reads symbols from files on this Mac only.';

// -- Quick Open --------------------------------------------------------------
//
// PHASE 99 REPLACED ONE REFUSAL WITH SEVEN REPORTS. Quick Open ranks the file
// names in a folder on another machine, so the palette no longer says it cannot
// reach that machine. What it says instead is which machine the names came
// from, when they were read, and each of the four ways a read gives no names.
//
// NOTHING POLLS THAT MACHINE. The list is as fresh as the last read, so the
// sentence after a good read carries the time of that read on this Mac's clock.

/** Quick Open, while the read of that machine's file names is in flight. */
export function quickOpenReadingNames(label: string): string {
  return `Tortie is reading the file names on ${label}.`;
}

/** Under the rows, whenever the names came from a machine. */
export function quickOpenNamesFrom(label: string, at: number): string {
  return (
    `These file names came from ${label}. ` +
    `Tortie read them at ${readClockTime(at)}.`
  );
}

/** The name cap cut the list. */
export function quickOpenNamesCapped(shown: number, label: string): string {
  return (
    `Tortie read the first ${shown.toLocaleString()} file names on ${label}. ` +
    `A name past that one is not in this list.`
  );
}

/** The folder is not a git repository, so the list came from a walk. */
export function quickOpenNotRepo(label: string): string {
  return (
    `That folder on ${label} is not a git repository. Tortie listed the files ` +
    `under it, apart from the ones inside .git and node_modules.`
  );
}

/** There is no folder at that path on that machine. */
export function quickOpenFolderMissing(label: string): string {
  return (
    `There is no folder at this path on ${label}, so there are no file ` +
    `names to show.`
  );
}

/** Tortie is not signed in to that machine in this run. */
export function quickOpenNotConnected(label: string): string {
  return (
    `Tortie is not connected to ${label}, so it has no file names for this ` +
    `project.`
  );
}

/** The machine did not answer. */
export function quickOpenNoAnswer(label: string): string {
  return `${label} did not answer, so Tortie has no file names for this project.`;
}

// -- the editor --------------------------------------------------------------

/**
 * The band under a tab holding a file from another machine.
 *
 * It says two things and both are needed. The file is over there, which is why
 * the bytes on screen may be older than the file. And Tortie cannot save it,
 * which is why typing changes nothing.
 */
export function remoteFileChip(label: string): string {
  return (
    `This file is on ${label}. Tortie is showing what it read and cannot ` +
    `save changes.`
  );
}

/**
 * What a person reads when they press Save on such a tab.
 *
 * Before this phase the save was a silent no operation. A person who typed and
 * pressed Save was told nothing at all, which reads as a save that worked.
 */
export function remoteSaveRefused(label: string): string {
  return `That file is on ${label}, so Tortie cannot save it.`;
}

// -- opening a folder on a machine -------------------------------------------

/** The File menu item, directly under Open Project. */
export const OPEN_REMOTE_FOLDER_MENU_ITEM = 'Open Folder on a Machine…';

/** The sheet's title. */
export const OPEN_REMOTE_TITLE = 'Open a folder on a machine';

/** The folder field's label, which names the machine that was chosen. */
export function openRemoteFolderLabel(label: string): string {
  return `Folder on ${label}`;
}

/**
 * The honesty line, drawn every time the sheet is open.
 *
 * TWO facts, in the order a person needs them. Tortie reads that folder, and
 * Tortie never writes there. The second is the one people are surprised by, so
 * it is said before they press the button rather than after.
 *
 * IT SAID THREE UNTIL PHASE 98. The third was "and it does not search it", and
 * the Search view of a tab on a machine searches that folder now, so the
 * sentence had become false on a sheet a person reads every time they open a
 * folder over there.
 */
export function openRemoteHonesty(label: string): string {
  return `Tortie reads this folder on ${label}. It never writes there.`;
}

/** The sheet's button. */
export const OPEN_REMOTE_BUTTON = 'Open it';

/** Why an add did not happen, as main's reason word names it. */
export type AddRemoteRefusalReason =
  | 'missing'
  | 'notdir'
  | 'denied'
  | 'unreachable'
  | 'notConnected'
  | 'notAbsolute'
  | 'noSuchMachine';

/**
 * The sentence for one refusal word.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a word and this composes the
 * sentence, which is the shape `machines:listDir` already uses. It keeps every
 * sentence about a machine inside the one file the vocabulary audit reads.
 */
export function addRemoteRefusal(
  reason: AddRemoteRefusalReason,
  path: string,
  label: string
): string {
  switch (reason) {
    case 'missing':
      return `There is no folder at ${path} on ${label}.`;
    case 'notdir':
      return `${path} on ${label} is a file, not a folder.`;
    case 'denied':
      return `Tortie cannot read ${path} on ${label}.`;
    case 'unreachable':
      return `${label} did not answer, so Tortie could not check that folder.`;
    case 'notConnected':
      return `Tortie is not connected to ${label}.`;
    case 'notAbsolute':
      return 'Type the whole path, starting with a slash.';
    case 'noSuchMachine':
      return 'Tortie has no machine with that name any more.';
  }
}

/** The folder is already a tab, so the add moved to it instead of making one. */
export function remoteProjectAlreadyOpen(label: string): string {
  return `That folder on ${label} is already open. Tortie moved to its tab.`;
}

// -- the home screen (Phase 92) ----------------------------------------------

/**
 * The home screen's action row, when this person has exactly one machine.
 *
 * It names the machine, because with one machine the row is the whole verb and
 * the sheet that follows has nothing left to choose. A person reads where the
 * folder will come from before they press anything.
 */
export function openOnMachineTitle(label: string): string {
  return `Open on ${label}…`;
}

/**
 * The same row, when this person has more than one machine.
 *
 * It names no machine, because the sheet is where the machine is chosen. One
 * row per machine was refused: the home screen's height is fixed, and a list
 * that grows with the machines file pushes the recent projects off the screen.
 */
export const OPEN_ON_ANY_MACHINE_TITLE = 'Open on another machine…';

/**
 * The row's second line, in both cases.
 *
 * Two facts and no more. The folder stays where it is, and Tortie only reads
 * it. That is the pair people are surprised by, and the sheet says the same two
 * things again before the folder is opened.
 */
export const OPEN_ON_MACHINE_SUBTITLE =
  'The folder stays on that machine. Tortie never writes there.';

/**
 * A recent project on another machine, on hover.
 *
 * The path is printed exactly as that machine states it, with no `~`, because a
 * tilde is a claim about whose home folder a path is in and Tortie does not know
 * that about another computer.
 */
export function remoteRecentTooltip(path: string, label: string): string {
  return `${path} on ${label}`;
}

// -- the tab, and sessions in it ---------------------------------------------

/** A tab whose folder is on a machine, on hover. */
export function remoteTabTooltip(
  name: string,
  path: string,
  label: string
): string {
  return `${name}, ${path} on ${label}`;
}

/** The confirm title when such a tab is closed. */
export function remoteTabCloseTitle(name: string): string {
  return `Close '${name}'?`;
}

/**
 * The confirm body when such a tab is closed.
 *
 * Closing the tab ends nothing. The sessions keep running on that machine, and
 * a person who has just read the word "close" needs to be told so before they
 * press it.
 */
export function remoteTabCloseBody(label: string): string {
  return (
    `Its sessions keep running on ${label} and reappear when you open that ` +
    `folder again.`
  );
}

/** In the create sheet, when the tab's folder is on a machine. */
export function createInRemoteProject(label: string): string {
  return `This project is on ${label}, so the session runs there.`;
}

/** After a session made from a local tab lands in that machine's own tab. */
export function remoteTabOpened(path: string, label: string): string {
  return (
    `Tortie opened a tab for ${path} on ${label} and put the session in it.`
  );
}

// ---------------------------------------------------------------------------
// Reading the last lines of a session on another machine (Phase 100)
// ---------------------------------------------------------------------------

/**
 * WHAT THIS BLOCK REPLACES. Phase 95 gave both bands above the terminal a quiet
 * note saying that a person could not scroll back, and a tooltip saying that it
 * was not available for a session on another machine yet. Phase 100 makes a
 * person able to read back, so the first half of that pair stayed true and the
 * second half became false. Both constants are deleted and the sentences below
 * take their place. Neither of the two old strings is written out here, because
 * ./__tests__/p100-remote-lines.test.tsx reads every file under src and fails
 * on either of them.
 *
 * WHAT IS STILL NOT TRUE, and every sentence here has to keep saying so. There
 * is no scrollbar for a session on another machine and there is not going to
 * be one. Research 57 section 3.1 refused it, because the lane would need verbs
 * Tortie does not send and a wheel notch would cost about 32 times its budget.
 * What a person gets instead is one read at one instant, in a panel, and the
 * panel says on screen that it does not refresh.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word and a set of numbers
 * for one read, and this file holds every sentence a person reads about it.
 * That is the shape `machines:searchContent` and `machines:listFiles` already
 * use, and it keeps every sentence about a machine inside the one file the
 * vocabulary audit reads.
 */

/** The strip button, in both bands above a session on another machine. */
export const READ_LAST_LINES_HERE = 'Read last lines';

/** Its tooltip, and the whole reason the button is there. */
export const READ_LAST_LINES_HERE_TITLE =
  'Tortie cannot scroll back through a session on another machine. ' +
  'Open this to read the last lines it printed.';

/** The session menu item, beside the capture items. */
export const READ_LAST_LINES_ITEM = 'Read Last Lines…';

/**
 * The panel title, naming the session it was opened on.
 *
 * The pair below is the pair {@link SAVED_OUTPUT_TITLE} already has, and for
 * the same reason. A session can end on that machine while its panel is open,
 * and main's next push drops the row, so the panel is left holding an id and no
 * name. It draws the bare title then rather than a title with a hole in it.
 */
export function readLinesTitle(sessionName: string): string {
  return `Last lines of ${sessionName}`;
}

/** The same title with no session to name. */
export const READ_LINES_TITLE = 'Last lines';

/**
 * The first line under the title, in the read state.
 *
 * `when` is composed by the panel from {@link savedWhen}, so the instant reads
 * the same here as it does above saved output. It is always this Mac's own
 * clock at the moment the bytes finished arriving, and never a clock on the
 * other machine.
 */
export function readLinesHeader(label: string, when: string): string {
  return `Tortie read this from ${label} at ${when}.`;
}

/**
 * The second line, and it is why the panel is honest about being a snapshot.
 *
 * A screen of an agent working looks the same whether it was read a second ago
 * or ten minutes ago. Nothing refreshes this panel, so it says so rather than
 * letting a person watch a still picture and wait for it to move.
 */
export const READ_LINES_NOT_LIVE =
  'This panel does not refresh. Read again to see anything printed since.';

/** How much came back. */
export function readLinesCount(lines: number, bytes: number): string {
  return `Tortie brought back ${lines.toLocaleString()} lines and ${formatScrollbackBytes(bytes)}.`;
}

/**
 * Drawn only when Tortie cut the answer.
 *
 * PHASE 99.1 IS WHY THIS EXISTS. Phase 99 carried a cut through main and never
 * drew it, so a list that had been cut was drawn as if it were whole. This
 * sentence is the fix for that shape, and it says which end was dropped so a
 * person knows the newest lines are the ones on screen.
 *
 * IT ALSO HAS TO SURVIVE THE SENTENCE ABOVE IT. {@link readLinesCount} states
 * the size of the text on screen, and that text has had the escape sequences
 * removed, so it is smaller than the bytes the ceiling was applied to. The
 * first build of this phase said the answer was "too large to bring back
 * whole" directly under a line reading "Tortie brought back 8,552 lines and
 * 1.5 MB", against a ceiling of 8.0 MB, which reads as one claim that
 * contradicts itself. So this sentence names the ceiling as a number and says
 * why the count above is the smaller figure. The number comes from
 * {@link REMOTE_SESSION_LINES_BYTES_MAX}, which is the value main cuts at.
 */
export const READ_LINES_CUT =
  `That machine sent back more than the ${formatScrollbackBytes(REMOTE_SESSION_LINES_BYTES_MAX)} ` +
  'Tortie keeps from one read, so the oldest lines were dropped and the ' +
  'newest are shown. The size above is smaller than that because it counts ' +
  'the plain text that was left once the codes a terminal uses to colour and ' +
  'redraw were taken out.';

/**
 * Drawn only when the session has kept less than was asked for.
 *
 * It is a DIFFERENT fact from the cut above and the two are never both on
 * screen. This one means the session itself has nothing older, because the read
 * clamps to the start of what that session has kept.
 */
export const READ_LINES_ALL_THERE = 'That is everything this session has kept.';

/** While the one read is in flight. */
export function readLinesReading(label: string): string {
  return `Tortie is reading this session on ${label}.`;
}

/** The session answered and had printed nothing. */
export const READ_LINES_EMPTY = 'This session has printed nothing.';

/** The label of the depth group, and the colon introduces the list. */
export const READ_LINES_DEPTH_LABEL = 'How far back to read:';

/** The shallowest of the four depths, being what is on screen right now. */
export const READ_LINES_DEPTH_SCREEN = 'The screen';

/** The other three depths, each named by its own number. */
export function readLinesDepthLabel(lines: number): string {
  return `${lines.toLocaleString()} lines`;
}

/** Tortie is not signed in to that machine right now. */
export function readLinesNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it read nothing.`;
}

/** The machine did not answer. */
export function readLinesUnreachable(label: string): string {
  return `${label} did not answer, so there are no lines to show.`;
}

/** Tortie holds no row for this session on a machine any more. */
export const READ_LINES_NO_SESSION =
  'This session is not running on that machine any more, so there is nothing ' +
  'to read.';

/** An older preload has no way to read a session on another machine. */
export const READ_LINES_NO_BRIDGE =
  'This build cannot read a session on another machine.';

/**
 * The call was made and it was rejected.
 *
 * IT IS A DIFFERENT FACT FROM {@link READ_LINES_NO_BRIDGE} and the first build
 * of this phase drew that one for both. A build that has the bridge and whose
 * call failed was told it could not do this at all, which is untrue. The toast
 * carries the error itself and it is gone by the time a person reads the
 * panel, so this sentence says what happened and what to do about it.
 */
export const READ_LINES_FAILED =
  'Tortie could not finish reading this session. Read it again to try once ' +
  'more.';

// ---------------------------------------------------------------------------
// Searching a project on another machine (Phase 98)
// ---------------------------------------------------------------------------

/**
 * WHAT THIS BLOCK REPLACES. Phase 90.1 gave the Search view two sentences that
 * said it does not reach another machine. Phase 98 makes it reach one, so those
 * two are gone and these eleven take their place. The pair that was deleted is
 * described in the block above.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a status word and a set of counts
 * for one search, and this file holds every sentence a person reads about it.
 * That is the shape `machines:listDir` and `machines:reviewFiles` already use,
 * and it keeps every sentence about a machine inside the one file the
 * vocabulary audit reads.
 *
 * WHAT THEY MAY CLAIM. A search on this Mac and a search on another machine are
 * not the same search, and these sentences say the two differences rather than
 * hiding them. The first is the program, because the far side uses that
 * machine's own grep and can read a pattern differently. The second is the
 * three file filters, which work here and do not go there.
 */

/**
 * Under the results, whenever the folder being searched is on a machine.
 *
 * It is the LAST line the note draws, so a person reads what happened before
 * they read how it was done.
 */
export function searchOnMachineLine(label: string): string {
  return (
    `Tortie searched this project on ${label} with that machine's own grep. ` +
    `A pattern that works here can behave differently there.`
  );
}

/**
 * The folder searched is not a git repository.
 *
 * Both halves are needed. Nothing was skipped, which is the good news, and the
 * results can hold build output, which is the cost of it.
 */
export const SEARCH_NOT_A_REPOSITORY =
  'This folder is not a git repository, so Tortie searched every file in it. ' +
  'Nothing was skipped, and the results can include build output.';

/** There is no folder at that path on that machine. */
export function searchFolderMissing(label: string): string {
  return `There is no folder at this path on ${label}, so nothing was searched.`;
}

/** That machine's grep refused the pattern. */
export function searchPatternRefused(label: string): string {
  return (
    `The grep on ${label} did not accept this pattern. A search on another ` +
    `machine uses that machine's own program, and it does not read every ` +
    `pattern the search on this Mac reads.`
  );
}

/** Tortie is not signed in to that machine. */
export function searchNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it searched nothing.`;
}

/** The machine did not answer. */
export function searchNoAnswer(label: string): string {
  return `${label} did not answer, so there are no results to show.`;
}

/** The match cap cut the list. */
export function searchFirstMatches(shown: number): string {
  return `Tortie is showing the first ${shown.toLocaleString()} matching lines. There are more.`;
}

/** The size ceiling on one answer cut the list. */
export const SEARCH_ANSWER_TOO_LARGE =
  'That machine had more to send than Tortie reads in one answer, so this ' +
  'list stops early. Narrow the search to see the rest.';

/**
 * The three filters that do not reach a machine.
 *
 * IT IS THE IDLE BODY, read before a person types, which is before they can see
 * the note that says a folder is not a repository. So the second sentence has to
 * cover both answers. It said "Tortie searches the files git knows about in the
 * folder" alone, which is true of a repository and false of every other folder,
 * where `repo-search` walks the whole tree instead.
 */
export const SEARCH_FILTERS_ON_THIS_MAC =
  'Include, exclude and the ignore files toggle work on this Mac only. On ' +
  'another machine Tortie searches the files git knows about, or every file ' +
  'in the folder when it is not a repository.';

/**
 * The Stop control while a machine is being waited on.
 *
 * It says what the control does. Nothing here can stop the scan on that
 * machine, and a label reading "Stop this search" would claim that it can.
 */
export const SEARCH_STOP_WAITING = 'Stop waiting for this search';

/** An older preload has no way to ask a machine anything. */
export const SEARCH_NO_BRIDGE =
  'This build cannot search a folder on another machine.';

// ---------------------------------------------------------------------------
// The runs for the branch checked out in a folder on another machine (Phase 105)
// ---------------------------------------------------------------------------

/**
 * WHAT THIS BLOCK REPLACES. Phase 90.3 wrote one sentence saying that Tortie
 * does not show runs for a folder on another machine. Phase 105 shows them, so
 * that half of the sentence became false. `REMOTE_SCM_SECTIONS_ABSENT` above is
 * rewritten in this phase and now names History and Branches alone.
 *
 * WHERE EACH HALF OF THE ANSWER COMES FROM, because a person cannot see it and
 * it is the whole design. Tortie asks the machine two things, being which
 * branch is checked out and which repository the folder is. It then asks GitHub
 * from this Mac with the gh this Mac already has. No token, no sign in details
 * and no GitHub host name is sent to the machine. The band below is where a
 * person reads that, and it is the reason the band exists at all.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word, a branch, a commit
 * and a set of rows, and this file holds every sentence a person reads about
 * them. That is the shape `machines:listFiles` and `machines:readSessionLines`
 * already use, and it keeps every sentence about a machine inside the one file
 * the vocabulary audit reads.
 *
 * WHAT IS NOT TRUE, and four of the sentences below exist to say so. The list
 * is one read at one instant and nothing refreshes it, because main cannot see
 * a push made on another computer. The rows can be the newest few rather than
 * all of them. The branch over there can move after the read. The steps inside
 * a run are not read at all, so a row opens on GitHub instead of expanding.
 * Phase 99 carried a cut through main that the panel never drew, so a list that
 * had been cut was drawn as if it were whole. These four sentences are what
 * stops the same shape happening here.
 */

/** The band above the runs group. It says where each half of the answer came from. */
export function runsOnMachineBand(label: string): string {
  return (
    `Tortie asked ${label} which branch is checked out. It asked GitHub from ` +
    `this Mac, and it sent no sign in details to ${label}.`
  );
}

/** While the read of that machine's branch is in flight. */
export function runsReadingBranch(label: string): string {
  return `Tortie is reading the branch on ${label}.`;
}

/** Under the rows, whenever there is an answer. */
export function runsReadAt(label: string, at: number): string {
  return `Tortie read this from ${label} at ${readClockTime(at)}.`;
}

/** Under the rows, always, beside the sentence above. */
export const RUNS_NOT_LIVE =
  'This list does not refresh. Read it again to see anything that has run since.';

/** What is checked out over there, so a person can tell what the rows are for. */
export function runsBranchAt(
  branch: string,
  label: string,
  shortSha: string
): string {
  return `The branch checked out on ${label} is ${branch} at ${shortSha}.`;
}

/** The row limit was reached, so older runs exist and are not here. */
export function runsNewest(shown: number): string {
  return (
    `These are the newest ${shown.toLocaleString()} runs for that branch. ` +
    `There are older ones.`
  );
}

/** There is a repository and no branch name. Both causes are named. */
export function runsNoBranch(label: string): string {
  return (
    `Tortie read no branch name for that folder on ${label}. That happens ` +
    `when a commit is checked out directly, and when the repository has no ` +
    `commits yet. Either way there is no branch to ask GitHub about.`
  );
}

/** The folder is there and git does not track it. */
export function runsNotRepo(label: string): string {
  return `That folder on ${label} is not a git repository, so it has no runs.`;
}

/** The repository has no github.com address. */
export function runsNotGitHub(label: string): string {
  return (
    `The repository in that folder on ${label} has no GitHub address for its ` +
    `origin, so there are no runs to show.`
  );
}

/** There is no folder at that path on that machine. */
export function runsFolderMissing(label: string): string {
  return `There is no folder at this path on ${label}, so there are no runs to show.`;
}

/** The folder is there and that account cannot read it. */
export function runsFolderDenied(label: string): string {
  return `Tortie cannot read that folder on ${label}, so it has no runs to show.`;
}

/** Tortie is not signed in to that machine in this run. */
export function runsNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it could not read the branch.`;
}

/** The machine did not answer. */
export function runsNoAnswer(label: string): string {
  return `${label} did not answer, so Tortie could not read the branch.`;
}

/** A row opens on GitHub and does not expand. Said once, under the rows. */
export const RUNS_STEPS_ELSEWHERE =
  'The steps inside a run are not shown for a folder on another machine. ' +
  'Open a run on GitHub to read them.';

/** An older preload has no way to ask a machine anything. */
export const RUNS_NO_BRIDGE =
  'This build cannot read the runs for a folder on another machine.';
