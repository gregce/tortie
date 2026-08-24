/**
 * A folder on another machine is a project (Phase 90.3).
 *
 * WHAT THIS FILE HOLDS. The label band that is drawn on every view of the tab,
 * the sheet that opens the folder, the home screen rows that offer it, and the
 * tab itself. Phase 142 kept those four together because they are one subject,
 * which is that a folder on another machine gets a project tab.
 *
 * WHY THESE WORDS ARE NOT SPREAD OVER TEN VIEW FILES. Phase 90.3 gives a folder
 * on another machine its own project tab, and eight surfaces in that tab say
 * something about the machine: the label band, the Explorer, Source Control,
 * Quick Open, the symbol palette, the editor, the sheet that opens the folder,
 * and the tab itself. Every one of those sentences is written once in this
 * directory, in the file named for the surface that draws it. The vocabulary
 * audit reads this directory, so a sentence that names the transport fails a
 * test rather than reaching a person.
 *
 * THE ONE WORD THAT NEVER APPEARS. `label` is always the name the person gave
 * the machine. No sentence below says "remote", and none of them composes a
 * host name.
 *
 * WHAT THESE SENTENCES MAY CLAIM. Tortie reads a folder on that machine, and it
 * writes there only where the person has let it save. It read and never wrote
 * until Phase 101, and three sentences in this directory still said so after
 * that phase shipped. Phase 102 rewrote all three, being the band's body, the
 * Source Control note and the home row's subtitle. Every refusal in this
 * directory is a plain statement of something Tortie does not do rather than a
 * report of a failure.
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */


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

/**
 * The band's second line. It says what Tortie does with that folder.
 *
 * PHASE 102 REWROTE IT. It read "It never writes there", and the band is drawn
 * on all four views of every tab whose folder is on a machine. So on a machine
 * a person has let Tortie save on, that sentence sat directly above a New
 * folder button they could press and above a folder Tortie had made. The
 * replacement is the same shape as `openRemoteHonesty` below, and it is true
 * on a machine with no confirmed folder as well, because there is nowhere on
 * that machine the person has let Tortie save.
 */
export const REMOTE_BAND_BODY =
  'Tortie reads what is in this folder on that machine. It writes there only ' +
  'where you have let it save.';

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
 * what it does about writing there. The second is the one people are surprised
 * by, so it is said before they press the button rather than after.
 *
 * IT SAID THREE UNTIL PHASE 98. The third was "and it does not search it", and
 * the Search view of a tab on a machine searches that folder now.
 *
 * PHASE 101 REWROTE THE SECOND. It read "It never writes there", and that
 * became false for a machine a person has let Tortie save on. After this phase
 * no part of this sentence is stale.
 */
export function openRemoteHonesty(label: string): string {
  return (
    `Tortie reads this folder on ${label}. It writes there only where you ` +
    `have let it save.`
  );
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
 * Two facts and no more. The folder stays where it is, and what Tortie does
 * about writing in it. That is the pair people are surprised by, and the sheet
 * says the same two things again before the folder is opened.
 *
 * PHASE 102 REWROTE THE SECOND FACT. It read "Tortie never writes there", and
 * that became false for a machine a person has let Tortie save on. It now says
 * the same thing `openRemoteHonesty` says, in the same words.
 */
export const OPEN_ON_MACHINE_SUBTITLE =
  'The folder stays on that machine. Tortie writes there only where you have ' +
  'let it save.';

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
