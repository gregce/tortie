/**
 * Pointer-based drag primitive — the ONE drag engine behind every gmux
 * drag surface (round 2): project-tab reorder (S2), session tab/row reorder
 * (S4), drag-to-split (S4A), and split-header pop-out. Deliberately not
 * HTML5 drag-and-drop: pointer events give us the 4px arm threshold, a 1:1
 * ghost, Esc-cancel with zero motion, and full control over hit-testing.
 *
 * Contract (DESIGN.md §5 "Drag"):
 * - press + `threshold` px of travel arms the drag (before that, clicks and
 *   double-clicks behave exactly as without this module);
 * - the ghost tracks the pointer 1:1 (no easing);
 * - Esc cancels: onEnd(true) fires, indicators must vanish with no motion;
 * - after a real drag, the synthetic click that follows pointerup is
 *   swallowed so drop never doubles as select;
 * - a secondary (context-menu) press never arms anything, and any press that
 *   is still pending can be revoked with `cancelPointerDrag()` — see
 *   `isSecondaryPress` and `cancelPointerDrag` for why both are required.
 */

import { cssZoomOf } from '../../zoom/coords';

export interface PointerDragHandlers {
  /** Travel crossed the threshold — build ghosts, mark state. */
  onStart?(e: PointerEvent): void;
  /** Every pointermove after the drag armed. */
  onMove(e: PointerEvent): void;
  /** Pointer released after the drag armed (fires before onEnd(false)). */
  onDrop(e: PointerEvent): void;
  /** Always fires exactly once per armed drag; canceled = Esc/interrupt. */
  onEnd(canceled: boolean): void;
}

/** The press that may start a drag — a PointerEvent, narrowed to what we read. */
export interface PointerDragInit {
  clientX: number;
  clientY: number;
  button: number;
  ctrlKey: boolean;
}

/**
 * True for a press that opens a context menu and must therefore NEVER arm a
 * drag (Phase 12.2). Two shapes, and missing the second one is what caused
 * the rename bug: the obvious non-primary button, AND macOS's ctrl+click
 * secondary click — which Chromium reports as `button === 0` with `ctrlKey`,
 * so a plain button check waves it straight through.
 */
export function isSecondaryPress(press: {
  button: number;
  ctrlKey: boolean;
}): boolean {
  return press.button !== 0 || press.ctrlKey;
}

/** True while any pointer drag from this module is armed. */
let dragActive = false;

/**
 * Teardown for every outstanding press. Only one drag can be ARMED at a time
 * (`dragActive` sees to that), but several presses can sit PENDING — a second
 * pointer, or a press whose pointerup was eaten — so this is a set, not a
 * slot: cancelling has to clear all of them or the leak simply moves.
 */
const outstanding = new Set<() => void>();

export function isDragActive(): boolean {
  return dragActive;
}

/**
 * Abort the outstanding drag — armed OR merely pending (pressed, still under
 * the travel threshold). Safe to call when there is none.
 *
 * A pending drag normally tears itself down on pointerup, but a native macOS
 * menu takes an OS mouse grab, so that pointerup never reaches the renderer
 * and the listeners stay live: the next pointermove — by then the user is
 * reaching for a rename box — arms a drag from a press made seconds ago.
 * Anything that interrupts the pointer stream (opening a menu, starting a
 * rename) must call this.
 */
export function cancelPointerDrag(): void {
  for (const cancel of [...outstanding]) cancel();
}

/**
 * Call from a React onPointerDown. Listens on window so the drag survives
 * leaving the source element; arms after `threshold` px of travel.
 *
 * Secondary presses are refused here, at the source, so no caller can
 * reintroduce the Phase 12.2 defect by forgetting the check.
 */
export function armPointerDrag(
  down: PointerDragInit,
  handlers: PointerDragHandlers,
  threshold = 4
): void {
  if (isSecondaryPress(down) || dragActive) return;
  const startX = down.clientX;
  const startY = down.clientY;
  let armed = false;
  let done = false;

  const finish = (canceled: boolean): void => {
    if (done) return;
    done = true;
    outstanding.delete(cancel);
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', cancel, true);
    window.removeEventListener('keydown', onKey, true);
    if (armed) {
      dragActive = false;
      document.body.classList.remove('gmux-dragging');
      // Swallow the click synthesized from this pointerup so the drop
      // (or cancel) never also selects the dragged tab/row.
      const swallow = (e: MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(
        () => window.removeEventListener('click', swallow, true),
        0
      );
      handlers.onEnd(canceled);
    }
  };

  const onMove = (e: PointerEvent): void => {
    if (!armed) {
      const travel = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (travel < threshold) return;
      armed = true;
      dragActive = true;
      document.body.classList.add('gmux-dragging');
      handlers.onStart?.(e);
    }
    e.preventDefault();
    handlers.onMove(e);
  };

  const onUp = (e: PointerEvent): void => {
    if (armed) handlers.onDrop(e);
    finish(false);
  };

  /** pointercancel handler AND this press's entry in `outstanding`. */
  const cancel = (): void => finish(true);

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && armed) {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    }
  };

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('keydown', onKey, true);
  outstanding.add(cancel);
}

export interface DragGhost {
  move(x: number, y: number): void;
  destroy(): void;
}

/**
 * Lifted ghost: a clone of the source element at 90% opacity with
 * --shadow-2, following the pointer 1:1 (DESIGN.md §5). `lockAxis: 'x'`
 * clamps it to the source's row (project tabs stay in the titlebar).
 */
export function createGhost(
  source: HTMLElement,
  opts: { lockAxis?: 'x' } = {}
): DragGhost {
  const rect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.classList.add('drag-ghost');
  // Carry the source's effective CSS zoom (Phase 12.11): the ghost is
  // appended to <body>, outside whatever zoomed region it was lifted from,
  // and `rect` is already in VISUAL pixels. Without this the clone would be
  // sized for 150% and typeset for 100% — a big box around small text.
  // `cssZoomOf` (../../zoom/coords) is the one reader of the effective zoom in
  // the app; it answers 1 on an unzoomed source, so every existing drag stays
  // byte-identical.
  const zoom = cssZoomOf(source);
  if (zoom !== 1) ghost.style.zoom = String(zoom);
  ghost.style.width = `${rect.width / zoom}px`;
  ghost.style.height = `${rect.height / zoom}px`;
  ghost.style.left = '0';
  ghost.style.top = '0';
  // Grip offset: keep the grab point where the user pressed.
  const baseY = rect.top;
  document.body.appendChild(ghost);
  let offsetX = 0;
  let offsetY = 0;
  let placed = false;
  return {
    move(x, y) {
      if (!placed) {
        // First move sets the grip so the ghost doesn't jump.
        offsetX = x - rect.left;
        offsetY = y - rect.top;
        placed = true;
      }
      const gx = x - offsetX;
      const gy = opts.lockAxis === 'x' ? baseY : y - offsetY;
      // The pointer speaks viewport pixels; a zoomed ghost's own transform is
      // resolved in its LOCAL space, so divide back out or it would run away
      // from the cursor at 1.5× the speed.
      ghost.style.transform = `translate(${gx / zoom}px, ${gy / zoom}px)`;
    },
    destroy() {
      ghost.remove();
    }
  };
}

/**
 * Insertion index for a pointer position over a row/strip of items laid on
 * `axis` — the gap the dragged item will land in (before item i midpoints,
 * after the last otherwise).
 */
export function insertionIndex(
  items: { rect: DOMRect }[],
  pointer: { x: number; y: number },
  axis: 'x' | 'y'
): number {
  for (let i = 0; i < items.length; i++) {
    const r = items[i]?.rect;
    if (!r) continue;
    const mid = axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
    const p = axis === 'x' ? pointer.x : pointer.y;
    if (p < mid) return i;
  }
  return items.length;
}
