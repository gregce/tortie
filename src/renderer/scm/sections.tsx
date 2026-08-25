/**
 * Sidebar section reordering (BACKLOG #6, DESIGN-SPEC S3 round 2 — the VS
 * Code GRAPH-drag reference media_Ncoe1XIPhD).
 *
 * The draggable unit is the SECTION (its header plus whole body). Press +
 * 4px vertical travel on a section header lifts a ghost of the header row
 * only; the sections themselves never move mid-drag; a 2px accent drop line
 * marks the candidate boundary; drop reorders; Esc cancels with zero
 * motion. Order persists PER VIEW, APP-WIDE (localStorage). Native context
 * menu on headers offers "Move section up / down" as the keyboard-free
 * alternative.
 *
 * Wiring: the composing view (ScmSection) marks each section element with
 * `data-section-root="<id>"` and its header with `data-section="<id>"`,
 * then renders the hook's ghost + drop-line elements. All pointer handling
 * is delegated from the container — the sections themselves stay dumb.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { menuGlyph } from '../icons';
// Phase 12.11: Source Control is a CSS-zoomable region, so the drag ghost and
// the drop line convert from client-rect pixels to the container's own.
import { toLocalPx } from '../zoom/coords';

/** Pointer travel (px) that turns a press into a drag (S2/S3 shared rule). */
const DRAG_THRESHOLD_PX = 4;

// ---------------------------------------------------------------------------
// Persisted order (per view, app-wide)
// ---------------------------------------------------------------------------

const orderKey = (viewId: string): string =>
  `gmux.sidebar.sectionOrder.${viewId}`;

/** Stored order sanitized against the known ids: unknown ids drop out,
 *  missing ids append in default order (safe across version drift). */
function sanitizeOrder(
  stored: readonly string[] | null,
  defaults: readonly string[]
): string[] {
  const known = new Set(defaults);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of stored ?? []) {
    if (known.has(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of defaults) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export function useSectionOrder(
  viewId: string,
  defaults: readonly string[]
): {
  order: string[];
  setOrder: (next: string[]) => void;
  moveSection: (id: string, delta: 1 | -1) => void;
} {
  const [order, setOrderState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(orderKey(viewId));
      return sanitizeOrder(
        raw === null ? null : (JSON.parse(raw) as string[]),
        defaults
      );
    } catch {
      return [...defaults];
    }
  });

  const setOrder = useCallback(
    (next: string[]): void => {
      setOrderState(next);
      try {
        localStorage.setItem(orderKey(viewId), JSON.stringify(next));
      } catch {
        /* cosmetic only */
      }
    },
    [viewId]
  );

  const moveSection = useCallback(
    (id: string, delta: 1 | -1): void => {
      const idx = order.indexOf(id);
      const to = idx + delta;
      if (idx === -1 || to < 0 || to >= order.length) return;
      const next = [...order];
      next.splice(idx, 1);
      next.splice(to, 0, id);
      setOrder(next);
    },
    [order, setOrder]
  );

  return { order, setOrder, moveSection };
}

// ---------------------------------------------------------------------------
// Drag mechanics (delegated from the sections container)
// ---------------------------------------------------------------------------

interface GhostState {
  id: string;
  label: string;
  /** Fixed-position ghost geometry (px). */
  left: number;
  top: number;
  width: number;
}

interface DragState {
  ghost: GhostState;
  /** Insertion index into `order` (0..n); null while under min travel. */
  insertion: number;
  /** Drop-line y in CONTAINER coordinates. */
  dropLineY: number;
}

interface SectionDragApi {
  /** Attach to the sections container. */
  containerProps: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) => void;
  };
  /** Render inside the container (or null). */
  overlay: React.ReactNode;
  /** True while a section drag is live (headers show `grabbing`). */
  dragging: boolean;
}

/**
 * Delegated section drag-reorder. `labels` maps section id → the ghost's
 * display label ("Changes"). The container must be `position: relative`.
 */
export function useSectionDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  order: string[],
  setOrder: (next: string[]) => void,
  moveSection: (id: string, delta: 1 | -1) => void,
  labels: Record<string, string>
): SectionDragApi {
  const setMenu = useApp((s) => s.setMenu);
  const [drag, setDrag] = useState<DragState | null>(null);
  // A completed drag swallows the click the browser fires after pointerup
  // (otherwise dropping would also toggle the section's collapse state).
  const swallowClick = useRef(false);
  const liveDrag = useRef(false);

  useEffect(() => {
    liveDrag.current = drag !== null;
    if (drag !== null) document.body.classList.add('scm-section-dragging');
    else document.body.classList.remove('scm-section-dragging');
    return () => document.body.classList.remove('scm-section-dragging');
  }, [drag]);

  /** Visible section elements, in current order. */
  const sectionRects = useCallback((): { id: string; rect: DOMRect }[] => {
    const container = containerRef.current;
    if (container === null) return [];
    const out: { id: string; rect: DOMRect }[] = [];
    for (const id of order) {
      const el = container.querySelector<HTMLElement>(
        `[data-section-root="${CSS.escape(id)}"]`
      );
      if (el !== null) out.push({ id, rect: el.getBoundingClientRect() });
    }
    return out;
  }, [containerRef, order]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Accessory buttons (fetch/refresh/…) never start a section drag.
      if (target.closest('.icon-btn') !== null) return;
      const header = target.closest<HTMLElement>('[data-section]');
      if (header === null) return;
      const id = header.dataset['section'];
      if (id === undefined || order.length < 2) return;
      const container = containerRef.current;
      if (container === null) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const headerRect = header.getBoundingClientRect();
      const grabOffsetY = startY - headerRect.top;
      let lifted = false;

      const computeInsertion = (
        clientY: number
      ): { insertion: number; dropLineY: number } => {
        const rects = sectionRects();
        const containerRect = container.getBoundingClientRect();
        let insertion = rects.length;
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i]!.rect;
          if (clientY < r.top + r.height / 2) {
            insertion = i;
            break;
          }
        }
        const lineY =
          insertion < rects.length
            ? rects[insertion]!.rect.top - containerRect.top
            : (rects[rects.length - 1]?.rect.bottom ?? containerRect.top) -
              containerRect.top;
        // The line is drawn INSIDE the container, which Phase 12.11 may have
        // CSS-zoomed; every rect above is in viewport pixels. Measured: a
        // child positioned at a local 100px lands 150 viewport px in at 150 %,
        // for `absolute` and `fixed` alike, so the style needs local pixels.
        return { insertion, dropLineY: toLocalPx(container, lineY) };
      };

      const update = (ev: PointerEvent): void => {
        if (!lifted) {
          if (
            Math.abs(ev.clientY - startY) < DRAG_THRESHOLD_PX &&
            Math.abs(ev.clientX - startX) < DRAG_THRESHOLD_PX
          ) {
            return;
          }
          lifted = true;
        }
        const containerRect = container.getBoundingClientRect();
        const top = Math.min(
          Math.max(ev.clientY - grabOffsetY, containerRect.top),
          containerRect.bottom - headerRect.height
        );
        const { insertion, dropLineY } = computeInsertion(ev.clientY);
        setDrag({
          ghost: {
            id,
            label: labels[id] ?? id,
            // Same conversion as the drop line: the ghost is `position:
            // fixed`, but it still lives inside the container's subtree and
            // Chromium scales a fixed child's used values by the inherited
            // zoom too (measured). It therefore renders at the region's own
            // size — a ghost of a zoomed header, which is what it is.
            left: toLocalPx(container, containerRect.left + 8),
            top: toLocalPx(container, top),
            width: toLocalPx(container, containerRect.width - 16)
          },
          insertion,
          dropLineY
        });
      };

      const finish = (commit: boolean, ev?: PointerEvent): void => {
        window.removeEventListener('pointermove', update);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('keydown', onKey, true);
        if (!lifted) return; // plain click — collapse toggle proceeds
        // Swallow ONLY the click the browser fires right after this
        // pointerup; if it lands outside the container (drop off-view), the
        // microtask-later reset keeps the next real click alive.
        swallowClick.current = true;
        setTimeout(() => {
          swallowClick.current = false;
        }, 0);
        setDrag(null);
        if (!commit || ev === undefined) return;
        const { insertion } = computeInsertion(ev.clientY);
        const from = order.indexOf(id);
        if (from === -1) return;
        let to = insertion;
        if (from < to) to -= 1;
        if (to === from) return;
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, id);
        setOrder(next);
      };

      const onUp = (ev: PointerEvent): void => finish(true, ev);
      const onKey = (ev: KeyboardEvent): void => {
        // Esc cancels with zero state change (S3 spec).
        if (ev.key === 'Escape' && liveDrag.current) {
          ev.preventDefault();
          ev.stopPropagation();
          finish(false);
        }
      };

      window.addEventListener('pointermove', update);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('keydown', onKey, true);
    },
    [containerRef, labels, order, sectionRects, setOrder]
  );

  const onClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (swallowClick.current) {
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    []
  );

  /** Native "Move section up / down" — the pointer-free path (S3 spec). */
  const onContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.icon-btn') !== null) return;
      const header = target.closest<HTMLElement>('[data-section]');
      if (header === null) return;
      const id = header.dataset['section'];
      if (id === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      const idx = order.indexOf(id);
      const items: (MenuItemSpec | 'sep')[] = [
        {
          label: 'Move section up',
          // TWO CHOSEN marks. No surface in the sidebar draws a reordering
          // mark, so the pair takes the arrows that name the direction each
          // label states. A drag handle would say the row is grabbable, which
          // in a menu it is not.
          ...menuGlyph('arrow-up'),
          disabled: idx <= 0,
          run: () => moveSection(id, -1)
        },
        {
          label: 'Move section down',
          ...menuGlyph('arrow-down'),
          disabled: idx === -1 || idx >= order.length - 1,
          run: () => moveSection(id, 1)
        }
      ];
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [moveSection, order, setMenu]
  );

  const overlay: React.ReactNode =
    drag === null ? null : (
      <>
        <div
          className="scm-section-dropline"
          style={{ top: drag.dropLineY }}
          aria-hidden="true"
        />
        <div
          className="scm-section-ghost"
          style={{
            left: drag.ghost.left,
            top: drag.ghost.top,
            width: drag.ghost.width
          }}
          aria-hidden="true"
        >
          {drag.ghost.label}
        </div>
      </>
    );

  return {
    containerProps: { onPointerDown, onContextMenu, onClickCapture },
    overlay,
    dragging: drag !== null
  };
}

// ---------------------------------------------------------------------------
// Shared per-section persistence (extracted by the Phase-10 integrator
// dup-scan — guardrail 4 — from the three section components)
// ---------------------------------------------------------------------------

/** Boolean persisted in localStorage (e.g. collapse state per project). */
export function usePersistedBool(
  key: string,
  fallback: boolean
): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === '1';
    } catch {
      return fallback;
    }
  });
  // Re-read when the key changes (project switch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setValue(raw === null ? fallback : raw === '1');
    } catch {
      setValue(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (v: boolean): void => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? '1' : '0');
      } catch {
        /* cosmetic only */
      }
    },
    [key]
  );
  return [value, update];
}
