/**
 * ONE FOLDER, ON ONE COMPUTER, AS ONE STRING (Phase 234).
 *
 * Every map in this store is keyed by a repository: `maps`, `partMaps`,
 * `modules`, `drills`, `canvas` and `passes`. Until this phase that key was an
 * absolute path on this Mac, which was right while Architecture only ever read
 * a folder here. It is wrong the moment a folder on a machine draws, because
 * both of the operator's computers put his home at `/Users/gdc`: a project on
 * his Mac Pro and a project of the same name here would share a picture, a
 * drill and a camera.
 *
 * So the key is `rootKeyOf`, the pair `src/shared/workspace-target.ts` already
 * carries for exactly this collision. A folder on this Mac keys as its own
 * absolute path, BYTE FOR BYTE what every build before this phase wrote, so
 * nothing local moves; a folder on a machine keys as `machine:<id>:<path>` and
 * can never collide with one here.
 *
 * The two functions below are the only places the key is composed and the only
 * place it is taken apart, so there is one answer to "what does main get asked"
 * rather than one per call site.
 */

import {
  rootKeyOf,
  targetOfRootKey,
  workspaceTarget,
  type WorkspaceTarget
} from '@shared/workspace-target';

/** The key for one target, or null when there is no project. */
export function archRepoKeyOf(target: WorkspaceTarget | null | undefined): string | null {
  return target === null || target === undefined ? null : rootKeyOf(target);
}

/**
 * What main is asked about one key: the folder's own path, and the machine it
 * is on when it is not this Mac.
 *
 * `machineId` is left OUT for a folder on this Mac rather than sent as null, so
 * the object a local read composes is the object every build before Phase 234
 * composed and no local answer can move.
 */
export function archRepoInputOf(key: string): {
  cwd: string;
  machineId?: string;
} {
  const target = targetOfRootKey(key);
  const machineId = archMachineOf(key);
  return machineId === null ? { cwd: target.path } : { cwd: target.path, machineId };
}

/** The machine one key names, or null for this Mac. */
export function archMachineOf(key: string): string | null {
  const target = targetOfRootKey(key);
  return rootKeyOf(target) === target.path ? null : target.machineId;
}

/** The key one of main's three pushes belongs to. */
export function archKeyOfEvent(event: {
  cwd: string;
  machineId?: string | null;
}): string {
  return rootKeyOf(workspaceTarget(event.cwd, event.machineId));
}
