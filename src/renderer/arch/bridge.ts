/**
 * The `arch:*` bridge, as the Architecture view calls it.
 *
 * FEATURE DETECTED, for the doctrine `context/bridge.ts` states in full: an
 * older preload must leave the view mounted and honest rather than crash it.
 * `archAvailable()` goes false, the view says one sentence, and the activity
 * bar item stays exactly where it is. A view that vanished would read as a
 * missing feature rather than as a build that cannot read a contract.
 *
 * TWO GROUPS, NOT ONE, and the split is the same one Context makes. `load` is
 * what a view needs to draw anything at all. `skeleton` is the DRAFTING half,
 * and a build that can read a contract but cannot compose a skeleton is an
 * ordinary state this view renders honestly: the verdicts are on screen and
 * only the Draft control is absent.
 *
 * NOTHING HERE STARTS A PROCESS. Every method is a read. `skeleton` composes
 * text in main and writes no file, which is why the drafting flow below opens
 * unsaved buffers rather than asking main to save anything.
 */

import type { InstalledGmuxApi } from '@shared/ipc';
import { gmuxBridge } from '../bridge';

/** The bridge, typed by the shared declaration rather than a local mirror. */
export type ArchBridgeApi = NonNullable<InstalledGmuxApi['arch']>;

/** The bridge, or null when this build cannot read a contract. */
export function archBridge(): ArchBridgeApi | null {
  const api = gmuxBridge()?.arch;
  return typeof api?.load === 'function' ? api : null;
}

/** Can this build read `docs/arch/` at all? */
export function archAvailable(): boolean {
  return archBridge() !== null;
}

/** The drafting half, or null when this build cannot compose a skeleton. */
export function skeletonBridge(): ArchBridgeApi | null {
  const api = archBridge();
  return typeof api?.skeleton === 'function' ? api : null;
}

/** Can this build draft a contract skeleton? */
export function skeletonAvailable(): boolean {
  return skeletonBridge() !== null;
}

/** Can this build re-check on demand? */
export function checkAvailable(): boolean {
  return typeof archBridge()?.check === 'function';
}
