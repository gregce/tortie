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
 *   swallowed so drop never doubles as select.
 */

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

/** True while any pointer drag from this module is armed. */
let dragActive = false;

export function isDragActive(): boolean {
  return dragActive;
}

/**
 * Call from a React onPointerDown (primary button only). Listens on window
 * so the drag survives leaving the source element; arms after `threshold`
 * px of travel.
 */
export function armPointerDrag(
  down: { clientX: number; clientY: number; button: number },
  handlers: PointerDragHandlers,
  threshold = 4
): void {
  if (down.button !== 0 || dragActive) return;
  const startX = down.clientX;
  const startY = down.clientY;
  let armed = false;
  let done = false;

  const finish = (canceled: boolean): void => {
    if (done) return;
    done = true;
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onCancel, true);
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

  const onCancel = (): void => finish(true);

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && armed) {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    }
  };

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onCancel, true);
  window.addEventListener('keydown', onKey, true);
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
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
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
      ghost.style.transform = `translate(${gx}px, ${gy}px)`;
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
