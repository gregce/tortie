/**
 * useResizeHandle — the ONE divider-drag implementation for every resizable
 * region in the app (sidebar, editor split, session dock).
 *
 * It exists because the app grew three of them by hand and all three drifted
 * from the cursor in different ways (Phase 18 item 5):
 *
 *   - the sidebar drove width from `startW + (clientX - startX)` and let a
 *     clamping SETTER own the result, so the moment the clamp range moved
 *     under the drag (it now does — the max is a fraction of the LIVE window)
 *     the edge stopped tracking the cursor for the rest of the gesture;
 *   - the editor divider drove width from `window.innerWidth - clientX`,
 *     which (a) treats the cursor as the panel edge and so jumps by wherever
 *     inside the 5px handle the user actually grabbed, and (b) measures from
 *     the WINDOW's right edge, not the panel's — in "right" orientation the
 *     session dock sits to the panel's right, and the panel jumped by the
 *     dock's whole width the instant a drag started;
 *   - neither used pointer capture, so a fast drag that outran the handle
 *     dropped the gesture.
 *
 * The contract here is the fix, and it is the same three lines every time:
 *
 *   1. at pointerdown record `grabOffset = clientX - <the panel edge being
 *      dragged>` — measured from the PANEL's own rect, never the window's;
 *   2. every move computes the edge as `clientX - grabOffset` and turns that
 *      into a raw width against the panel's FIXED origin (its other edge);
 *   3. clamping applies to that raw result only. The raw value keeps
 *      accumulating past the clamp, so reversing out of a clamp puts the edge
 *      back under the cursor immediately, with none of the travel lost.
 *
 * Pointer capture keeps the gesture alive when the cursor leaves the handle;
 * `armPointerDrag` (src/renderer/app/split/pointer-drag.ts — the app's one
 * drag engine, deliberately not a second one) supplies Esc-cancel, refusal of
 * secondary presses, and the `cancelPointerDrag()` revocation a native menu
 * needs. Esc restores the width the drag started from.
 *
 * Snap-to-hidden is part of the contract rather than a caller's job: a region
 * that can be dragged shut must land in exactly the state its own toggle
 * produces (Phase 14.7 — ONE truth, several controls), so the caller hands us
 * that toggle as `onSnap` and we call it at the threshold instead of writing
 * a width. "Exactly the state" includes the STORED WIDTH: snapping rewinds
 * the width to what it was before the drag, so hiding by drag and hiding by
 * click are the same act and the region comes back the size it left.
 *
 * Snapping is pointer-only: the keyboard path stops at `min`, because a
 * keyboard user who collapsed a region would lose the focused element and
 * have no way back on the same key.
 *
 * Widths are LAYOUT pixels — the same units the stores persist. Pointer
 * coordinates are VISUAL pixels, so a region under a CSS zoom (Phase 12.11)
 * has its raw travel divided back out; `cssZoomOf` answers 1 for an unzoomed
 * panel, which is every panel today, so this is inert until it isn't.
 */

import React, { useCallback, useRef, useState } from 'react';
import { armPointerDrag, isSecondaryPress } from '../app/split/pointer-drag';
import { cssZoomOf } from '../zoom/coords';

/**
 * Which container edge the panel is pinned to, i.e. which of its own edges
 * the handle drags:
 *   'left'  — panel pinned left, handle on its RIGHT edge, grows rightward
 *             (the sidebar);
 *   'right' — panel pinned right, handle on its LEFT edge, grows leftward
 *             (the editor split, the session dock).
 */
export type ResizeAnchor = 'left' | 'right';

export interface ResizeHandleSpec {
  anchor: ResizeAnchor;
  /** The panel being resized — the element whose width `onWidth` sets. */
  panelRef: React.RefObject<HTMLElement | null>;
  /** Current rendered width in layout px (keyboard base, and Esc's target). */
  width: number;
  /** Smallest width the panel may render at. */
  min: number;
  /**
   * Largest width. Pass a FUNCTION when the limit depends on the live window
   * (`() => sidebarMaxWidth()`): it is evaluated on every move, so resizing
   * the window mid-drag cannot leave a stale ceiling behind.
   */
  max: number | (() => number);
  /** Applies a clamped width. Called only when the value actually changes. */
  onWidth: (px: number) => void;
  /**
   * Raw width (BELOW `min`, before clamping) at which the drag gives up on a
   * width and collapses the region instead. Omit for a region that cannot be
   * dragged shut. Requires `onSnap`.
   */
  snapAt?: number;
  /**
   * Collapse the region — the caller's own toggle, so drag-to-hide and
   * click-to-hide land in the identical state. Fires at most once per drag,
   * and the rest of that drag is ignored.
   */
  onSnap?: () => void;
  /** Accessible name for the separator, e.g. "Resize sidebar". */
  label: string;
  /** Keyboard resizing (default true): ←/→ by `step`, ⇧ by 1, Home/End. */
  keyboard?: boolean;
  /** Arrow-key increment in px (default 16). */
  step?: number;
}

export interface ResizeHandle {
  /** True while a pointer drag is armed — for the handle's `.dragging` class. */
  dragging: boolean;
  /** Spread onto the handle element. */
  props: {
    role: 'separator';
    'aria-orientation': 'vertical';
    'aria-label': string;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    tabIndex?: number;
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  };
}

/**
 * The whole contract, as arithmetic, so it is testable without a DOM: the
 * RAW width a pointer at `clientX` implies. Never clamped here — clamping is
 * the caller's last step, and keeping it out of this function is exactly what
 * makes reversing out of a clamp lossless.
 *
 * `fixedEdge` is the panel edge that does NOT move (its left for an
 * anchor:'left' panel, its right for anchor:'right'), in viewport px;
 * `grabOffset` is `clientX - <moving edge>` measured at pointerdown.
 */
export function rawResizeWidth(input: {
  anchor: ResizeAnchor;
  clientX: number;
  grabOffset: number;
  fixedEdge: number;
  /** Effective CSS zoom of the panel; 1 for everything today. */
  zoom?: number;
}): number {
  const { anchor, clientX, grabOffset, fixedEdge, zoom = 1 } = input;
  const edge = clientX - grabOffset;
  return (anchor === 'left' ? edge - fixedEdge : fixedEdge - edge) / zoom;
}

function clamp(px: number, min: number, max: number): number {
  // max can legitimately fall below min in a very narrow window; min wins,
  // because a region rendered under its own floor is unusable either way.
  return Math.round(Math.min(Math.max(px, min), Math.max(min, max)));
}

/** What one sampled pointer move does to the region. */
export type ResizeStep =
  /** Apply this width. */
  | { kind: 'width'; width: number }
  /** Rewind to this width, then collapse the region. */
  | { kind: 'snap'; width: number }
  /** Nothing changed. */
  | { kind: 'none' };

/**
 * The move's decision, as a pure function, so the property that matters can be
 * tested without a DOM: **a drag that ends in a snap must not change the
 * stored width.**
 *
 * It shipped doing the opposite. `onMove` clamped every sample to `min` and
 * persisted it, so dragging a 400px sidebar shut walked the stored width down
 * to the 220px floor before the snap ever fired, and re-opening it gave 220 —
 * while the activity-bar icon, which writes no width, gave 400. The two
 * controls the phase promised were "the same state" disagreed the moment you
 * looked at the width, and which one you got depended on how fast you dragged.
 *
 * `startWidth` is the gesture's rewind point: the whole drag is one act, and
 * the act is "put this away", not "make it 220 and then put it away".
 */
export function resizeStep(input: {
  /** Unclamped width implied by the cursor (`rawResizeWidth`). */
  raw: number;
  min: number;
  max: number;
  /** Width this drag last applied. */
  last: number;
  /** Width the drag started from. */
  startWidth: number;
  /** Raw width below which the region collapses; absent = cannot collapse. */
  snapAt?: number | undefined;
}): ResizeStep {
  if (input.snapAt !== undefined && input.raw < input.snapAt) {
    return { kind: 'snap', width: input.startWidth };
  }
  const width = clamp(input.raw, input.min, input.max);
  return width === input.last ? { kind: 'none' } : { kind: 'width', width };
}

export function useResizeHandle(spec: ResizeHandleSpec): ResizeHandle {
  const [dragging, setDragging] = useState(false);
  // The live spec, so the window listeners a drag installs never read a
  // stale `width`/`max` from the closure they were created in.
  const live = useRef(spec);
  live.current = spec;

  const maxOf = useCallback((): number => {
    const { max } = live.current;
    return typeof max === 'function' ? max() : max;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>): void => {
      if (isSecondaryPress(e)) return;
      const panel = live.current.panelRef.current;
      if (panel === null) return;
      e.preventDefault();

      const rect = panel.getBoundingClientRect();
      const anchor = live.current.anchor;
      // The edge under the cursor, and the edge that stays put. Both come
      // from the panel, so nothing here depends on what else is in the row.
      const movingEdge = anchor === 'left' ? rect.right : rect.left;
      const fixedEdge = anchor === 'left' ? rect.left : rect.right;
      const grabOffset = e.clientX - movingEdge;
      const zoom = cssZoomOf(panel);
      const startWidth = live.current.width;

      const handle = e.currentTarget;
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* capture is an optimisation; the window listeners are the truth */
      }

      let snapped = false;
      let last = startWidth;

      armPointerDrag(
        e.nativeEvent,
        {
          onStart: () => setDragging(true),
          onMove(ev) {
            if (snapped) return;
            // Raw, UNCLAMPED width: the whole point of the module. Visual px
            // in, layout px out.
            const raw = rawResizeWidth({
              anchor,
              clientX: ev.clientX,
              grabOffset,
              fixedEdge,
              zoom
            });

            const { snapAt, onSnap, min } = live.current;
            const step = resizeStep({
              raw,
              min,
              max: maxOf(),
              last,
              startWidth,
              // A region with no collapse toggle cannot snap, however far the
              // cursor travels.
              ...(onSnap !== undefined && snapAt !== undefined ? { snapAt } : {})
            });
            if (step.kind === 'none') return;
            if (step.kind === 'width') {
              last = step.width;
              live.current.onWidth(step.width);
              return;
            }
            // ONE GESTURE, ONE OUTCOME: "put this away". Every width this drag
            // wrote on the way down was travel, not intent, so the pre-drag
            // width goes back BEFORE the region collapses — see `resizeStep`.
            snapped = true;
            if (step.width !== last) {
              last = step.width;
              live.current.onWidth(step.width);
            }
            onSnap?.();
          },
          onDrop() {
            /* width is applied move-by-move */
          },
          onEnd(canceled) {
            setDragging(false);
            try {
              handle.releasePointerCapture(e.pointerId);
            } catch {
              /* already released with the pointer */
            }
            // No `!snapped` guard: a snap has already put `startWidth` back,
            // so this is a no-op after one, and Esc means the same thing on
            // both paths — the width you started the gesture with.
            if (canceled && last !== startWidth) {
              live.current.onWidth(startWidth);
            }
          }
        },
        // 1px, not the 4px reorder threshold: a divider should start moving
        // the instant the cursor does, and the absolute geometry above means
        // the first move lands exactly where the cursor is anyway.
        1
      );
    },
    [maxOf]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>): void => {
      const { anchor, width, min, step = 16, onWidth } = live.current;
      const max = maxOf();
      let next: number | null = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const delta = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : step);
        next = clamp(width + (anchor === 'left' ? delta : -delta), min, max);
      } else if (e.key === 'Home') {
        next = clamp(min, min, max);
      } else if (e.key === 'End') {
        next = clamp(max, min, max);
      }
      if (next === null) return;
      // Arrow keys on a focused separator are widget-local, exactly like the
      // session list's ArrowUp/Down — they are not app shortcuts and must
      // never appear in src/shared/keymap.ts.
      e.preventDefault();
      e.stopPropagation();
      if (next !== width) onWidth(next);
    },
    [maxOf]
  );

  const keyboard = spec.keyboard ?? true;
  const max = typeof spec.max === 'function' ? spec.max() : spec.max;

  return {
    dragging,
    props: {
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': spec.label,
      'aria-valuenow': Math.round(spec.width),
      'aria-valuemin': Math.round(spec.min),
      'aria-valuemax': Math.round(Math.max(spec.min, max)),
      ...(keyboard ? { tabIndex: 0, onKeyDown } : {}),
      onPointerDown
    }
  };
}
