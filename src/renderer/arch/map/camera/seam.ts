/**
 * THE CAMERA SEAM (Phase 162): the named interface between the map's
 * container, which owns persistence and the key set, and the camera itself,
 * which owns the transform math, the gestures and the fly-to.
 *
 * The container (`ArchMapTab.tsx`) holds a ref of {@link ArchCameraHandle}
 * and drives it from keyboard commands; the drawing populates the ref when
 * it mounts its camera and clears it when it unmounts. The persisted state
 * travels the other way as plain props. This file deliberately holds ONLY
 * types: it is the one file both halves of the phase name, so it can never
 * import from either.
 */

import type { MutableRefObject } from 'react';
import type { ArchCameraState, ArchNodePosition } from '@shared/ipc';

/**
 * What the container can ask the live camera to do. Every verb is one of the
 * Figma key set's targets; the camera decides the motion (the fly-to, or the
 * `prefers-reduced-motion` cut to the end state) and the container never
 * animates anything itself.
 */
export interface ArchCameraHandle {
  /** One zoom step in, about the view centre, the panel chord's ⌘+. */
  zoomIn(): void;
  /** One zoom step out, the panel chord's ⌘−. */
  zoomOut(): void;
  /** Back to the fit transform, the panel chord's ⌘0. */
  zoomReset(): void;
  /** Fit the whole drawing, Shift+1. */
  fitAll(): void;
  /** Fit the current selection, Shift+2; the whole drawing when none. */
  fitSelection(): void;
  /** Centre then fit the selection per Perfetto, F; fit all when none. */
  frame(): void;
}

/**
 * Everything the container hands the drawing about the canvas, in one
 * optional prop, so the drawing's props grow by one name rather than six.
 *
 * `camera` and `positions` are the KEPT state out of `arch.db`, null when
 * nothing was kept: the drawing then computes its fit and its layout fresh,
 * the first-run path. `onCameraRest` reports a camera worth keeping — at
 * gesture end, at inertia end, at fly-to end, never per frame — and
 * `onLayoutChange` reports the scope's positions whole after a node was
 * moved.
 */
export interface ArchCanvasSeam {
  /** The live camera, populated by the drawing while it is mounted. */
  cameraRef: MutableRefObject<ArchCameraHandle | null>;
  /** The kept camera to restore, or null to compute the fit. */
  camera: ArchCameraState | null;
  /** The kept positions, or null to compute the layout. */
  positions: readonly ArchNodePosition[] | null;
  /** A camera at rest, worth keeping. */
  onCameraRest(camera: ArchCameraState): void;
  /** The scope's positions, whole, after an explicit move. */
  onLayoutChange(positions: readonly ArchNodePosition[]): void;
}
