/**
 * The folder picker for another machine (Phase 84, item 6).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

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
