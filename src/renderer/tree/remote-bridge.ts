/**
 * Feature-detected access to the calls the Explorer makes to another machine.
 *
 * PHASE 90.3 SHIPPED ONE, being the folder read. PHASE 102 ADDED TWO WRITES,
 * being make a folder and rename an entry. All three are feature detected the
 * same way, so a build whose preload predates a call answers false for it and
 * the surfaces that would use it stay off rather than throwing at the person.
 *
 * It is the same shape `./fs-bridge.ts` has for this Mac's own reads. A preload
 * that predates this phase leaves `canListTree()` false, and the Explorer then
 * says the folder could not be read rather than throwing.
 *
 * THERE IS NO SECOND CALL HERE AND NO TIMER. This module has one read and
 * nothing that schedules it. The store above it calls it when a tab is opened,
 * when a folder is expanded past the fetched depth, and when a person presses
 * Refresh.
 */

import type {
  MachineMakeDirInput,
  MachineMakeDirResult,
  MachineRenameInput,
  MachineRenameResult,
  RemoteTreeListInput,
  RemoteTreeListing
} from '@shared/ipc';

/** True when the preload exposes machines.listTree. */
export function canListTree(): boolean {
  return typeof window.gmux?.machines?.listTree === 'function';
}

/**
 * Read one folder tree on one machine.
 *
 * @returns the listing, or a `notConnected` answer when this build's preload
 *   has no such call. A rejected promise is the caller's own business; nothing
 *   here composes a sentence.
 */
export async function listTree(
  input: RemoteTreeListInput
): Promise<RemoteTreeListing> {
  const api = window.gmux?.machines;
  if (api === undefined || typeof api.listTree !== 'function') {
    return { status: 'notConnected', root: input.root };
  }
  return api.listTree(input);
}

/**
 * PHASE 102. True when this build can reach BOTH entry writes.
 *
 * One flag for two calls, because the two verbs ship together and a build that
 * has one and not the other has never existed. A false answer turns New Folder
 * and Rename off on every folder on another machine, which is what every build
 * before this phase did.
 */
export function canWriteEntries(): boolean {
  const api = window.gmux?.machines;
  return (
    typeof api?.makeDir === 'function' &&
    typeof api.renameEntry === 'function'
  );
}

/**
 * Make one folder on one machine.
 *
 * It carries the absolute path on that machine and no folder of its own. The
 * folder Tortie may write under is read in main, off the row a person
 * confirmed, so nothing chosen here can widen what may be written.
 *
 * @returns the answer word and, after a `made`, the mode the folder was given.
 *   It rejects only when this build cannot reach the call, and when the machine
 *   did not answer. Everything the machine said comes back as a word.
 */
export async function makeDir(
  input: MachineMakeDirInput
): Promise<MachineMakeDirResult> {
  const api = window.gmux?.machines;
  if (api === undefined || typeof api.makeDir !== 'function') {
    throw new Error('This build cannot make a folder on another machine.');
  }
  return api.makeDir(input);
}

/**
 * Rename one file or folder on one machine.
 *
 * BOTH paths are checked against the confirmed folder in main and either one
 * outside it refuses the whole call. Nothing here decides that.
 */
export async function renameEntry(
  input: MachineRenameInput
): Promise<MachineRenameResult> {
  const api = window.gmux?.machines;
  if (api === undefined || typeof api.renameEntry !== 'function') {
    throw new Error('This build cannot rename a file on another machine.');
  }
  return api.renameEntry(input);
}
