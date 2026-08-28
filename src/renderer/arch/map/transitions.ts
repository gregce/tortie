/**
 * The staged drill transition (Phase 162), and the gesture gate.
 *
 * Phase 161's drill swaps the model wholesale: a click renders a fresh
 * scoped layout and the old picture is simply gone. This module puts the
 * motion between the two stills. On the way down the clicked box grows to
 * become the new picture's frame while everything else fades; on the way up
 * the picture shrinks back into the box it came from. 200 to 300 ms, one
 * user gesture, one motion, then still.
 *
 * ## Object constancy, stated honestly
 *
 * Heer and Robertson's rule is that the same datum stays the same DOM node.
 * The two layouts here are separate renders, so a literally shared node is
 * impossible without rewiring the map component. What carries the constancy
 * instead is a stage box KEYED BY THE GROUP ID: an overlay painted like the
 * clicked box, carrying its `data-group`, that travels from the box's
 * rectangle to the destination frame while the old picture dims to
 * `--graph-dim` beneath it. The eye follows one keyed thing; the swap
 * happens under the motion.
 *
 * ## The FLIP shape
 *
 * The stage box is laid out at its DESTINATION and starts with a transform
 * that maps it back onto its origin, then animates to identity. Only
 * `transform` animates, the focus flight's own rule: no keyframe here names
 * a layout property. The transient border radius distortion under the scale
 * is accepted; it lasts a quarter second on an element that exists only
 * during the motion.
 *
 * ## The gesture gate, and why it is loud
 *
 * Research 68 section 5.1 measured a group level CSS filter at 15.8 ms mean
 * per frame while panning, which is two missed vsyncs at 120 Hz on every
 * frame. So the rule is mechanical: while {@link GESTURE_CLASS} is on the
 * container, NO filter and NO transition runs anywhere in the map, whatever
 * a later round adds. The `!important` in `transitions.css` is that rule's
 * teeth, deliberate and commented there.
 *
 * ## Reduced motion
 *
 * `prefers-reduced-motion` cuts the stage to its end state: the promise
 * resolves synchronously, no overlay is created, no class is added, zero
 * DOM writes. The drill lands as an instant cut, which is the end state.
 *
 * Node tests drive everything here through structural fakes, because this
 * repository runs vitest in the node environment with no jsdom. The DOM
 * types are used loosely on purpose: only the members the driver actually
 * touches are required.
 */

import { prefersReducedMotion } from './camera/animate';
import './transitions.css';

// ---------------------------------------------------------------------------
// The class vocabulary, exported so the gesture layer and the container
// toggle strings rather than importing behaviour
// ---------------------------------------------------------------------------

/** On the map container while a pointer gesture is live: filters and
 *  transitions stop dead. The gesture layer toggles it. */
export const GESTURE_CLASS = 'arch-map-gesturing';

/** On the map container while a drill stage runs: the old picture dims. */
export const STAGE_OUT_CLASS = 'arch-map-stage-out';

/** On the clicked box's own `<g>` while its stage box rides: the original
 *  hides so the datum appears exactly once. */
export const STAGE_HIDE_CLASS = 'arch-map-stage-hide';

/** The travelling overlay itself. */
export const STAGE_BOX_CLASS = 'arch-map-stage-box';

/** The stage duration in ms, inside research 68's 200 to 300 window. */
export const DRILL_STAGE_MS = 260;

/** The token curve the chrome uses, as a fallback where no computed style
 *  exists, which is unit tests. */
const EASE_FALLBACK = 'cubic-bezier(0.2, 0, 0, 1)';

// ---------------------------------------------------------------------------
// Pure geometry
// ---------------------------------------------------------------------------

/** One rectangle in container local CSS pixels. */
export interface StageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The FLIP start transform: the stage box sits at `to` and this transform
 * maps it back onto `from`. Transform origin is the top left corner, set in
 * the stylesheet. Pure string math, tested exactly.
 */
export function stageTransform(from: StageRect, to: StageRect): string {
  const sx = to.w === 0 ? 1 : from.w / to.w;
  const sy = to.h === 0 ? 1 : from.h / to.h;
  return (
    `translate(${from.x - to.x}px, ${from.y - to.y}px) ` +
    `scale(${sx}, ${sy})`
  );
}

/** The identity the stage box lands on. One string, so tests compare it. */
export const STAGE_TRANSFORM_REST = 'translate(0px, 0px) scale(1, 1)';

// ---------------------------------------------------------------------------
// Rect helpers for the caller
// ---------------------------------------------------------------------------

/** Attribute value escaping for the group id selector. `CSS.escape` where
 *  the platform has it, a quote and backslash escape where it does not. */
function escapeAttr(value: string): string {
  try {
    return CSS.escape(value);
  } catch {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}

/** The clicked box's `<g>` inside a rendered map, by its group id. */
export function boxElement(root: ParentNode, groupId: string): Element | null {
  return root.querySelector(`[data-group="${escapeAttr(groupId)}"]`);
}

/** An element's rectangle in the container's local coordinates. */
export function rectInContainer(el: Element, container: Element): StageRect {
  const a = el.getBoundingClientRect();
  const b = container.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
}

/** The container's own full rectangle, the drill-in destination. */
export function containerStageRect(container: Element): StageRect {
  const r = container.getBoundingClientRect();
  return { x: 0, y: 0, w: r.width, h: r.height };
}

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

export interface DrillStageOptions {
  /** The positioned wrapper the map draws in. Receives the stage classes
   *  and the overlay; both are removed on the way out, whatever happened. */
  container: HTMLElement;
  /** The id the stage box is keyed by. Lands on `data-group`. */
  groupId: string;
  /** Where the motion starts, in container local pixels. Drilling in this
   *  is the clicked box; drilling up it is the whole frame. */
  from: StageRect;
  /** Where the motion lands. Drilling in, the whole frame; up, the box. */
  to: StageRect;
  /** The live element the stage box stands in for, hidden while it rides.
   *  Optional because on the way up the origin picture is already gone. */
  hide?: Element | null;
  /** Defaults to {@link DRILL_STAGE_MS}. */
  durationMs?: number;
  /** Injectable for tests. Defaults to the real media query. */
  reduced?(): boolean;
}

/**
 * Run one staged drill motion and resolve when it is over. The caller swaps
 * the model whenever it likes; the stage rides above whatever is rendered,
 * so the honest sequencing is swap on resolve for the drill in, and swap
 * first then stage for the drill up.
 *
 * Cleanup is unconditional: finish and cancel both land in the same
 * `settle`, so an interrupted stage never strands an overlay or a class.
 * A platform without `Element.animate` gets the end state immediately.
 */
export function runDrillStage(opts: DrillStageOptions): Promise<void> {
  const reduced = opts.reduced ?? prefersReducedMotion;
  if (reduced()) return Promise.resolve();

  const doc = opts.container.ownerDocument;
  const box = doc.createElement('div');
  box.className = STAGE_BOX_CLASS;
  box.dataset.group = opts.groupId;
  box.style.left = `${opts.to.x}px`;
  box.style.top = `${opts.to.y}px`;
  box.style.width = `${opts.to.w}px`;
  box.style.height = `${opts.to.h}px`;

  opts.container.classList.add(STAGE_OUT_CLASS);
  opts.hide?.classList.add(STAGE_HIDE_CLASS);
  opts.container.appendChild(box);

  const cleanup = (): void => {
    opts.container.classList.remove(STAGE_OUT_CLASS);
    opts.hide?.classList.remove(STAGE_HIDE_CLASS);
    if (box.parentNode !== null) box.parentNode.removeChild(box);
  };

  if (typeof box.animate !== 'function') {
    cleanup();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const animation = box.animate(
      [
        { transform: stageTransform(opts.from, opts.to) },
        { transform: STAGE_TRANSFORM_REST }
      ],
      {
        duration: opts.durationMs ?? DRILL_STAGE_MS,
        easing: stageEasing(box),
        fill: 'both'
      }
    );
    animation.onfinish = settle;
    animation.oncancel = settle;
  });
}

/**
 * The curve, read from the token the chrome's own motion uses so the map
 * and the chrome cannot drift apart, with the same fallback rule the focus
 * flight states: the fallback is only reached where there is no computed
 * style to read, which is unit tests.
 */
function stageEasing(el: Element): string {
  try {
    const view = el.ownerDocument.defaultView;
    if (view === null) return EASE_FALLBACK;
    const raw = view
      .getComputedStyle(view.document.documentElement)
      .getPropertyValue('--ease-out')
      .trim();
    return raw.length > 0 ? raw : EASE_FALLBACK;
  } catch {
    return EASE_FALLBACK;
  }
}

// ---------------------------------------------------------------------------
// The gesture gate
// ---------------------------------------------------------------------------

/**
 * Toggle the gate. The gesture layer calls this on pointer down and on the
 * moment inertia comes to rest, so filters and transitions exist only in
 * stillness, which is the measured rule this file's header carries.
 */
export function setGesturing(container: Element, on: boolean): void {
  if (on) container.classList.add(GESTURE_CLASS);
  else container.classList.remove(GESTURE_CLASS);
}
