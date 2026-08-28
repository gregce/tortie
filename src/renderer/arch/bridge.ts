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

/**
 * Phase 160. THE ONE SEAM the map surfaces read the model type through. The
 * shape itself lives in the shared ipc contract beside every other arch
 * answer; re-exported here so the store, the tab body and the probe all name
 * it from one place.
 */
export type { ArchMapResult } from '@shared/ipc';

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

/**
 * The MAP half (Phase 160), or null when this build cannot compose one.
 *
 * Feature detected like every other method here: an older preload has no
 * `map` at all, and the map surfaces then say one sentence instead of
 * breaking, which is the same doctrine the whole file states at its head.
 */
export function mapBridge(): ArchBridgeApi | null {
  const api = archBridge();
  return typeof api?.map === 'function' ? api : null;
}

/** Can this build draw the architecture map at all? */
export function mapAvailable(): boolean {
  return mapBridge() !== null;
}

// ---------------------------------------------------------------------------
// Phase 161, the drill's two scoped reads
// ---------------------------------------------------------------------------

/**
 * The scoped shapes, re-exported through the same seam the level 1 model
 * travels, so the store, the tab and the pane name them from one place.
 */
export type {
  ArchMapCrossing,
  ArchMapPartInput,
  ArchMapPartResult,
  ArchModuleFilesInput,
  ArchModuleFilesResult
} from '@shared/ipc';

/**
 * The scoped part read (level 2 of the drill), or null when this build
 * cannot look inside a part. Feature detected like every other method here:
 * an older preload has no `mapPart`, the boxes then stop being buttons, and
 * the level 1 picture still draws.
 */
export function mapPartBridge(): ArchBridgeApi | null {
  const api = archBridge();
  return typeof api?.mapPart === 'function' ? api : null;
}

/** Can this build open a part up at all? */
export function mapPartAvailable(): boolean {
  return mapPartBridge() !== null;
}

// ---------------------------------------------------------------------------
// Phase 162, the canvas: the camera and the kept layout
// ---------------------------------------------------------------------------

/**
 * The canvas shapes, re-exported through the same seam every other arch
 * answer travels, so the store, the tab and the camera name them from one
 * place.
 */
export type {
  ArchCameraState,
  ArchCanvasStateResult,
  ArchNodePosition
} from '@shared/ipc';

/**
 * The canvas half (Phase 162), or null when this build cannot keep a camera
 * or a layout. Feature detected like every other method here: an older
 * preload has none of the four calls, and the map then simply computes its
 * fit and its layout fresh on every open, which is exactly what a lost
 * database costs. Persistence is a convenience, never a load-bearing wall.
 */
export function canvasBridge(): ArchBridgeApi | null {
  const api = archBridge();
  return typeof api?.canvasState === 'function' &&
    typeof api?.setCamera === 'function' &&
    typeof api?.setLayout === 'function' &&
    typeof api?.clearLayout === 'function'
    ? api
    : null;
}

/** Can this build keep the map's camera and layout between runs? */
export function canvasAvailable(): boolean {
  return canvasBridge() !== null;
}
