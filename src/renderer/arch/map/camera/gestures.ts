/**
 * The camera's gesture layer (Phase 162), hand written per research 68
 * section 7: wheel and two finger scroll pan, trackpad pinch (which arrives
 * as ctrlKey+wheel, the `editor/image/ImageView.tsx` precedent) and
 * command+wheel zoom toward the cursor, drag pans with a named slop
 * threshold so the drill click survives, Space holds the hand tool, and a
 * release at speed hands its velocity to the engine's glide.
 *
 * ## The two halves
 *
 * The DOM half, {@link attachCameraGestures}, owns the listeners: wheel is
 * attached BY HAND and non-passively (React registers its root wheel
 * listener passively, where preventDefault is a silent no-op — ImageView
 * documents the same trap), pointer events ride pointer capture on the svg,
 * and the Space claim is a capture phase keydown so the hand tool wins the
 * key before a focused box's own Space-activates-the-drill handler sees it.
 * Enter remains the drill's keyboard activation, stated in the phase brief
 * as the accessibility trade.
 *
 * The pure half, {@link createPanSession} and {@link wheelIntent}, is the
 * whole decision logic as plain arithmetic on plain objects, which is what
 * the test suite drives, because this repository carries no jsdom.
 *
 * ## Click against drag, the named threshold
 *
 * A press that moves less than CAMERA_DRAG_SLOP (4 screen pixels, named in
 * geometry.ts) before release is a click and propagates to the drill; one
 * that crosses the slop becomes a pan, and the following click event is
 * swallowed in the capture phase so a pan that started on a box never opens
 * it.
 */

import { CAMERA_DRAG_SLOP } from '../geometry';
import {
  cameraPanBy,
  cameraZoomTo,
  wheelZoomDelta,
  type Camera
} from './transform';
import { trackVelocity, type Velocity } from './inertia';
import { isEditableTarget } from './keys';

/** Pixels one wheel "line" scrolls when a device reports line deltas. */
export const WHEEL_LINE_PX = 16;
/** Pixels one wheel "page" scrolls when a device reports page deltas. */
export const WHEEL_PAGE_PX = 800;
/** A wheel gesture has no end event; this long a silence is the end. */
export const WHEEL_REST_MS = 150;

/** What the engine must offer the gesture layer. `useCamera` implements it. */
export interface CameraGestureEngine {
  /** The live camera, gesture in flight included. */
  camera(): Camera;
  scaleExtent(): readonly [number, number];
  /** Apply one live camera step. The engine clamps and writes the attribute. */
  applyLive(next: Camera): void;
  /** The gesture is over; commit and save. */
  settle(): void;
  /** A release at speed: glide, then settle. */
  startGlide(v: Velocity): void;
  /** A new press: stop any glide or flight mid path. */
  stopMotion(): void;
}

// ---------------------------------------------------------------------------
// The pure half
// ---------------------------------------------------------------------------

/** Which move a wheel event asks for. Pinch is ctrlKey by Chromium's own
 *  encoding; command+wheel is the deliberate zoom chord. */
export function wheelIntent(e: {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}): 'zoom' | 'pan' {
  return e.ctrlKey || e.metaKey ? 'zoom' : 'pan';
}

/** A wheel delta in screen pixels whatever the device's delta mode. */
export function wheelPanPx(delta: number, deltaMode: number): number {
  if (deltaMode === 1) return delta * WHEEL_LINE_PX;
  if (deltaMode === 2) return delta * WHEEL_PAGE_PX;
  return delta;
}

/** One pointer step handed to the pan session. */
export interface PanPoint {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/**
 * One press-to-release, as a pure state machine. `hand` presses (Space held
 * or middle button) pan from the first pixel; plain presses become a pan
 * only past the slop.
 */
export interface PanSession {
  /** Feed a move; the delta to pan by, or null while this is still a click. */
  move(p: PanPoint): { dx: number; dy: number } | null;
  /** Did this press ever cross the slop? Decides click suppression. */
  panned(): boolean;
  /** Release: the glide velocity (zero for a clean click). */
  release(t: number): Velocity;
}

export function createPanSession(start: PanPoint, hand: boolean): PanSession {
  const tracker = trackVelocity();
  tracker.push(start.x, start.y, start.t);
  let last = start;
  let panning = hand;
  return {
    move(p) {
      tracker.push(p.x, p.y, p.t);
      if (!panning) {
        if (
          Math.hypot(p.x - start.x, p.y - start.y) < CAMERA_DRAG_SLOP
        ) {
          return null;
        }
        panning = true;
        // The first pan step carries the whole accumulated slop distance,
        // so the picture never jumps a threshold's worth behind the hand.
      }
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      last = p;
      return { dx, dy };
    },
    panned: () => panning,
    release: (t) => (panning ? tracker.release(t) : { vx: 0, vy: 0 })
  };
}

// ---------------------------------------------------------------------------
// The DOM half
// ---------------------------------------------------------------------------

/**
 * Wire the gesture set onto the map's own svg. Never the window: nothing
 * here can take a keystroke or a wheel from a terminal pane. Returns the
 * detach.
 */
export function attachCameraGestures(
  el: SVGSVGElement,
  engine: CameraGestureEngine
): () => void {
  let session: PanSession | null = null;
  let pointerId: number | null = null;
  let spaceHeld = false;
  let suppressClick = false;
  let wheelTimer: ReturnType<typeof setTimeout> | null = null;

  const setClass = (name: string, on: boolean): void => {
    el.classList.toggle(name, on);
  };

  const wheelSettleSoon = (): void => {
    if (wheelTimer !== null) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelTimer = null;
      engine.settle();
    }, WHEEL_REST_MS);
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    engine.stopMotion();
    const camera = engine.camera();
    if (wheelIntent(e) === 'zoom') {
      const rect = el.getBoundingClientRect();
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Command+wheel is a mouse chord, not a pinch: it takes the base
      // multiplier, so the ctrl flag alone decides the fine pinch rate.
      const k = camera.k * 2 ** wheelZoomDelta(e);
      engine.applyLive(
        cameraZoomTo(camera, k, p, engine.scaleExtent())
      );
    } else {
      engine.applyLive(
        cameraPanBy(
          camera,
          -wheelPanPx(e.deltaX, e.deltaMode),
          -wheelPanPx(e.deltaY, e.deltaMode)
        )
      );
    }
    wheelSettleSoon();
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 1) return;
    engine.stopMotion();
    suppressClick = false;
    const hand = spaceHeld || e.button === 1;
    if (hand) e.preventDefault();
    session = createPanSession(
      { x: e.clientX, y: e.clientY, t: e.timeStamp },
      hand
    );
    pointerId = e.pointerId;
    el.setPointerCapture(e.pointerId);
    if (hand) setClass('arch-map-panning', true);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (session === null || e.pointerId !== pointerId) return;
    const step = session.move({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (step === null) return;
    setClass('arch-map-panning', true);
    engine.applyLive(cameraPanBy(engine.camera(), step.dx, step.dy));
  };

  const endSession = (e: PointerEvent, glide: boolean): void => {
    if (session === null || e.pointerId !== pointerId) return;
    const wasPan = session.panned();
    const v = glide ? session.release(e.timeStamp) : { vx: 0, vy: 0 };
    session = null;
    pointerId = null;
    setClass('arch-map-panning', false);
    if (wasPan) {
      suppressClick = true;
      engine.startGlide(v);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    endSession(e, true);
  };
  const onPointerCancel = (e: PointerEvent): void => {
    endSession(e, false);
  };

  // Capture phase: a click that ended a pan never reaches the drill.
  const onClickCapture = (e: MouseEvent): void => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  // Capture phase: the hand tool claims Space before a focused box's own
  // keydown can read it as "open". Enter still opens; the brief states the
  // trade. The listener sits on the TAB container rather than the svg,
  // because a plain click on the ground focuses the tab element (it carries
  // tabIndex -1), so the svg itself never receives the keydown; a capture
  // listener on the tab hears Space at the target phase there AND before
  // any focused box's own handler. Still never the window.
  const keyHost: Element = el.closest('.arch-map-tab') ?? el;
  const onKeyDownCapture = (e: Event): void => {
    const key = e as KeyboardEvent;
    if (key.key !== ' ' || isEditableTarget(key.target)) return;
    key.preventDefault();
    key.stopPropagation();
    if (spaceHeld) return;
    spaceHeld = true;
    setClass('arch-map-hand', true);
  };
  const releaseSpace = (): void => {
    spaceHeld = false;
    setClass('arch-map-hand', false);
  };
  const onKeyUp = (e: Event): void => {
    if ((e as KeyboardEvent).key === ' ') releaseSpace();
  };

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);
  el.addEventListener('click', onClickCapture, true);
  keyHost.addEventListener('keydown', onKeyDownCapture, true);
  keyHost.addEventListener('keyup', onKeyUp);
  // Focus leaving the map mid hold would otherwise wedge the hand on.
  keyHost.addEventListener('focusout', releaseSpace);

  return () => {
    if (wheelTimer !== null) clearTimeout(wheelTimer);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerCancel);
    el.removeEventListener('click', onClickCapture, true);
    keyHost.removeEventListener('keydown', onKeyDownCapture, true);
    keyHost.removeEventListener('keyup', onKeyUp);
    keyHost.removeEventListener('focusout', releaseSpace);
  };
}
