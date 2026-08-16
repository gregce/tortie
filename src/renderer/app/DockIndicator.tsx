/**
 * The dock's 2px accent insertion line between rows (S4 drag spec, dock
 * flavor). Extracted from SessionDock.tsx in Phase 60 so the collapsed rail
 * (./SessionRail.tsx) can render the same indicator without importing the
 * dock itself, which would be a SessionDock -> SessionRail -> SessionDock
 * cycle. Both densities position it against their own list, so the
 * `toLocalPx` zoom conversion below serves the rail exactly as it served
 * the dock.
 */

import React, { useLayoutEffect, useState } from 'react';
// Phase 12.11: the dock list is a CSS-zoomable region, so a client-rect
// measurement written back into it has to change coordinate space first.
import { toLocalPx } from '../zoom/coords';

/** 2px accent insertion line between rows (S4 drag spec, dock flavor). */
export function DockIndicator({
  index,
  listRef
}: {
  index: number;
  listRef: React.RefObject<HTMLUListElement | null>;
}): React.JSX.Element | null {
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      setTop(null);
      return;
    }
    const items = Array.from(
      list.querySelectorAll<HTMLElement>('[data-surface-id]')
    );
    if (items.length === 0) {
      setTop(null);
      return;
    }
    const at = items[index];
    const last = items[items.length - 1];
    const offsetOf = (el: HTMLElement): number => {
      // Rows nest inside <li>; measure against the list's box. The two client
      // rects are in VIEWPORT pixels and the `top` below is written back into
      // the list, which Phase 12.11 may have CSS-zoomed — so their difference
      // is converted to the list's own pixels before it meets `scrollTop`,
      // which was already in them. At 100 % this is an identity.
      const listRect = list.getBoundingClientRect();
      return (
        toLocalPx(list, el.getBoundingClientRect().top - listRect.top) +
        list.scrollTop
      );
    };
    setTop(
      at !== undefined
        ? offsetOf(at) - 1
        : last !== undefined
          ? offsetOf(last) + last.offsetHeight - 1
          : null
    );
  }, [index, listRef]);

  if (top === null) return null;
  return <div className="drop-indicator-h" style={{ top }} />;
}
