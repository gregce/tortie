/**
 * Feature-detected access to the ONE call the Explorer makes to another
 * machine (Phase 90.3).
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

import type { RemoteTreeListInput, RemoteTreeListing } from '@shared/ipc';

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
