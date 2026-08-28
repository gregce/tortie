/**
 * The camera in motion (Phase 162): one fixed duration flight along the van
 * Wijk and Nuij path, driven by requestAnimationFrame, then still.
 *
 * This file is the animate-to-camera seam the phase brief names. The gesture
 * layer and the container call {@link flyCameraTo} with an `apply` callback
 * and never touch time themselves; the vendored path math lives next door in
 * `fly.ts` and knows nothing about cameras or clocks. The house motion rule
 * binds every line here, and it reads: one user gesture drives one motion,
 * then still. Nothing in this module loops, idles or replays.
 *
 * ## The camera convention
 *
 * A camera is `{ k, x, y }` and maps a world point to the screen as
 * `sx = wx * k + x` and `sy = wy * k + y`, the d3-zoom convention, so the
 * vendored transform algebra in `transform.ts` is structurally compatible
 * without either file importing the other. The type here is structural on
 * purpose, exactly like the map model in `../types.ts`, so the parallel
 * build reconciles by shape rather than by import.
 *
 * ## Why the flight runs on LINEAR t
 *
 * The van Wijk and Nuij path is the optimal path in (position, width) space
 * and holds perceived velocity constant by construction (section 5 of the
 * paper). An easing curve on top would distort the property the path was
 * chosen for, so t maps to the path linearly and the duration is one fixed
 * constant, {@link CAMERA_FLY_MS}, per the charter's "fixed duration".
 *
 * ## Reduced motion
 *
 * `prefers-reduced-motion` cuts every flight to its end state: the camera
 * lands in one frame, synchronously, and no rAF is ever scheduled. The gate
 * is read at the moment the flight starts, never cached, the same rule the
 * house helper in `src/renderer/app/focus-flight.ts` states. That helper is
 * not imported because it sits in a module that imports the whole app
 * store, and the map modules are deliberately store free; the eight line
 * read is duplicated here verbatim instead, with this sentence as the
 * grep-found-it record.
 */

import type { MapViewport } from '../layout';
import { interpolateZoom, type ZoomView } from './fly';

/** The camera: scale then translate, screen = world * k + (x, y). */
export interface CameraState {
  k: number;
  x: number;
  y: number;
}

/** The one fixed flight duration, in ms. Drill and F both ride it. */
export const CAMERA_FLY_MS = 300;

/**
 * Read at the moment a motion starts, never cached, because a person can
 * turn the setting on while the app is open. Verbatim from
 * `src/renderer/app/focus-flight.ts`, duplicated for the reason the module
 * comment gives.
 */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Camera to view and back, the bridge into the vendored path
// ---------------------------------------------------------------------------

/**
 * The view a camera shows of a viewport: the world point under the screen
 * centre and the world width the viewport spans.
 */
export function cameraToView(cam: CameraState, viewport: MapViewport): ZoomView {
  return [
    (viewport.width / 2 - cam.x) / cam.k,
    (viewport.height / 2 - cam.y) / cam.k,
    viewport.width / cam.k
  ];
}

/** The camera that shows a view in a viewport. Inverse of {@link cameraToView}. */
export function viewToCamera(view: ZoomView, viewport: MapViewport): CameraState {
  const k = viewport.width / view[2];
  return {
    k,
    x: viewport.width / 2 - view[0] * k,
    y: viewport.height / 2 - view[1] * k
  };
}

/** One flight, ready to be sampled: cameras at t, plus upstream's hint. */
export interface FlightPath {
  at(t: number): CameraState;
  /** The vendored interpolator's own duration suggestion, in ms. Unused by
   *  the fixed duration flight, kept so a probe can compare. */
  naturalMs: number;
}

/**
 * The van Wijk and Nuij path between two cameras over one viewport. Pure:
 * no clock, no DOM, same inputs same path.
 */
export function flyPath(
  from: CameraState,
  to: CameraState,
  viewport: MapViewport
): FlightPath {
  const i = interpolateZoom(cameraToView(from, viewport), cameraToView(to, viewport));
  return {
    at: (t: number): CameraState => viewToCamera(i(t), viewport),
    naturalMs: i.duration
  };
}

// ---------------------------------------------------------------------------
// The rAF driver
// ---------------------------------------------------------------------------

/** What a started animation hands back: a way to stop, and whether it runs. */
export interface RunningAnimation {
  cancel(): void;
  readonly running: boolean;
}

/** A finished or refused animation, so callers hold one shape always. */
const STILL: RunningAnimation = {
  cancel(): void {},
  get running(): boolean {
    return false;
  }
};

export interface AnimateOptions {
  durationMs: number;
  /** Called with t in [0, 1], linear in time. Called with exactly 1 last. */
  frame(t: number): void;
  /** Called once, after the final frame, on natural completion only. */
  done?(): void;
  /** Injectable for tests. Defaults read the real environment. */
  reduced?(): boolean;
  raf?(cb: () => void): number;
  caf?(handle: number): void;
  now?(): number;
}

/**
 * Drive `frame` from 0 to 1 over a fixed duration. Under reduced motion, or
 * a non positive duration, `frame(1)` runs synchronously and nothing is
 * scheduled. Cancel stops the frames and swallows `done`, because a cancel
 * means another motion took over and it owns the ending.
 */
export function animate(opts: AnimateOptions): RunningAnimation {
  const reduced = opts.reduced ?? prefersReducedMotion;
  if (reduced() || opts.durationMs <= 0) {
    opts.frame(1);
    opts.done?.();
    return STILL;
  }

  const raf = opts.raf ?? ((cb): number => window.requestAnimationFrame(cb));
  const caf = opts.caf ?? ((handle): void => window.cancelAnimationFrame(handle));
  const now = opts.now ?? ((): number => performance.now());

  let live = true;
  let handle = 0;
  const start = now();

  const step = (): void => {
    if (!live) return;
    const t = Math.min(1, (now() - start) / opts.durationMs);
    opts.frame(t);
    if (t >= 1) {
      live = false;
      opts.done?.();
      return;
    }
    handle = raf(step);
  };
  handle = raf(step);

  return {
    cancel(): void {
      if (!live) return;
      live = false;
      caf(handle);
    },
    get running(): boolean {
      return live;
    }
  };
}

// ---------------------------------------------------------------------------
// The seam: fly the camera somewhere, then be still
// ---------------------------------------------------------------------------

export interface FlyToOptions {
  from: CameraState;
  to: CameraState;
  viewport: MapViewport;
  /** The one writer: receives every intermediate camera and, last, `to`
   *  itself, exactly, so the rest state is the target byte for byte. */
  apply(cam: CameraState): void;
  done?(): void;
  /** Defaults to {@link CAMERA_FLY_MS}. */
  durationMs?: number;
  reduced?(): boolean;
  raf?(cb: () => void): number;
  caf?(handle: number): void;
  now?(): number;
}

/**
 * One flight from camera to camera along the van Wijk and Nuij path. The
 * caller keeps at most one of these alive: starting a new motion means
 * cancelling the handle it already holds, which is the one-gesture-one-
 * motion rule made mechanical.
 */
export function flyCameraTo(opts: FlyToOptions): RunningAnimation {
  const path = flyPath(opts.from, opts.to, opts.viewport);
  return animate({
    durationMs: opts.durationMs ?? CAMERA_FLY_MS,
    frame: (t): void => {
      opts.apply(t >= 1 ? opts.to : path.at(t));
    },
    done: opts.done,
    reduced: opts.reduced,
    raf: opts.raf,
    caf: opts.caf,
    now: opts.now
  });
}
