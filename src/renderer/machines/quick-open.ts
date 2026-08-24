/**
 * What Quick Open says about a project on another machine (Phase 99).
 *
 * The doctrine that binds these sentences is in ./presentation.ts, and the tab
 * they are drawn in is described in ./project-tab.ts.
 */

import { REMOTE_FILE_LIST_MAX_BYTES } from '@shared/ipc';
import { readClockTime } from './presentation';

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

/** The byte ceiling cut the list on that machine. */
export function quickOpenNamesTruncated(shown: number, label: string): string {
  return (
    `${label} stopped listing at ${shown.toLocaleString()} file names, ` +
    `because Tortie reads at most ` +
    `${REMOTE_FILE_LIST_MAX_BYTES.toLocaleString()} bytes of names in one ` +
    `go. A file over there may be missing from this list.`
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
