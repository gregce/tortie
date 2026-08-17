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
 * WHAT THE WORDS ARE ALLOWED TO CLAIM. A remote session in this release has no
 * row in Tortie's own records, no saved output, no resume command and no launch
 * snapshot. The machine holds all of it, beside the processes. So every
 * sentence here either states something the machine itself just reported, or
 * names something Tortie cannot do yet. None of them promises a recovery.
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
// Restore, refused
// ---------------------------------------------------------------------------

/**
 * Drawn where Restore and Restart would be, for a session on another machine
 * that has ended.
 *
 * Main refuses the verb as well, so this label is the honest half of a refusal
 * that exists in two places. It names the release rather than a date, because
 * nobody has set a date.
 */
export const RESTORE_COMING =
  'Bringing a session back on another machine is coming in a later release. ' +
  'Tortie will not offer it here until it can prove what came back.';

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
 * It states the property this release buys and the three it does not, in that
 * order, because the property is why a person would use this at all.
 */
export const CREATE_HONESTY =
  'A session on another machine runs there and keeps running when you quit ' +
  'Tortie. Tortie does not save what it prints, does not keep a record of it ' +
  'here, and cannot bring it back yet.';

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

/** The four honesty lines in the order the sheet draws them. */
export const CREATE_HONESTY_LINES: readonly string[] = [
  CREATE_HONESTY,
  POLL_HONESTY,
  ATTENTION_HONESTY,
  AGENT_LOCAL_CHECK
];
