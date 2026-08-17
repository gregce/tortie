/**
 * Hover card timing (Phase 46.1). One hook owning the open delay, the close
 * grace, the Esc dismiss and the unmount cleanup an SCM hover card needs.
 *
 * The numbers and the sequence are HistorySection's, extracted so the Runs
 * section does not grow a second copy of the same forty five lines.
 * HistorySection keeps its own inline timers this phase, because other phases
 * build in parallel against the same base. A later consolidation moves it
 * onto this hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** DESIGN.md section 3. The card opens after this many milliseconds. */
export const HOVER_DELAY_MS = 600;

/** Leave grace before the card closes. The pointer may travel into it. */
export const HOVER_CLOSE_GRACE_MS = 100;

/** The hovered row's bounding rect at trigger time. */
export interface HoverAnchor {
  top: number;
  bottom: number;
  right: number;
}

/** What is open right now. `key` names the row, e.g. a sha or a run id. */
export interface HoverState<K> {
  key: K;
  anchor: HoverAnchor;
}

export interface HoverTiming<K> {
  hover: HoverState<K> | null;
  /** The row's mouseenter. Pass the row element so the card can anchor. */
  rowEnter: (key: K, el: HTMLElement) => void;
  /** The row's mouseleave. Schedules the close after the grace. */
  rowLeave: () => void;
  /** The card's own mouseenter. Cancels a pending close. */
  cardEnter: () => void;
  /** The card's own mouseleave. Same schedule as leaving the row. */
  cardLeave: () => void;
  /** Close now. For clicks, scrolls and anything else that moves the rows. */
  close: () => void;
}

export function useHoverTiming<K>(): HoverTiming<K> {
  const [hover, setHover] = useState<HoverState<K> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The callbacks below stay stable across renders, so the open state is
  // mirrored into a ref for them to read.
  const hoverRef = useRef<HoverState<K> | null>(null);
  hoverRef.current = hover;

  const clearOpen = (): void => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    openTimer.current = null;
  };
  const clearClose = (): void => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const close = useCallback((): void => {
    clearOpen();
    clearClose();
    setHover(null);
  }, []);

  const rowEnter = useCallback((key: K, el: HTMLElement): void => {
    clearOpen();
    // Returning to the open card's own row keeps it alive. Over a different
    // row the pending close runs its course and the new row earns its own
    // card after the full delay.
    const current = hoverRef.current;
    if (current !== null && current.key === key) clearClose();
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      if (!el.isConnected) return; // the row remounted under a refresh
      const r = el.getBoundingClientRect();
      setHover({
        key,
        anchor: { top: r.top, bottom: r.bottom, right: r.right }
      });
    }, HOVER_DELAY_MS);
  }, []);

  const rowLeave = useCallback((): void => {
    clearOpen();
    clearClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setHover(null);
    }, HOVER_CLOSE_GRACE_MS);
  }, []);

  const cardEnter = useCallback((): void => {
    clearClose();
  }, []);

  // Esc dismisses the card before any other layer (capture phase).
  useEffect(() => {
    if (hover === null) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hover, close]);

  // Unmount safety. Never leave timers running.
  useEffect(
    () => () => {
      clearOpen();
      clearClose();
    },
    []
  );

  return { hover, rowEnter, rowLeave, cardEnter, cardLeave: rowLeave, close };
}
