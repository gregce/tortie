/**
 * The scrollbar gmux draws for a session (Phase 12.3).
 *
 * xterm's own scrollbar is useless here: `tmux attach` parks the client in
 * its alternate buffer, so that viewport is exactly one screen tall and its
 * thumb never appears. The real scrollback lives in tmux, so the bar is drawn
 * from the tmux geometry the ScrollSurface polls.
 *
 * It sits in the 14px lane the fit addon already reserves for xterm's
 * overview ruler, which terminal.css keeps clear of glyphs so the whole lane
 * is this bar's hit target. The thumb is minimal at rest so the affordance is
 * discoverable without competing with output, thicker on hover, draggable to
 * scrub — and ABSENT when the pane has no history, because a thumb that spans
 * the whole track is a border, not a scrollbar. Colors are tokens; motion is
 * a single width/color transition, which the global prefers-reduced-motion
 * rule collapses to 1 ms.
 *
 * WHAT THE THUMB MEANS (Phase 292): how far from live output the reader is.
 * It is NOT tmux's scroll position over tmux's history, which is what it was
 * drawn from until the text began to hold still. Those two numbers do not
 * share a zero: the position counts from the bottom of the frame tmux froze
 * when the pane was parked, and the history is the live pane's and keeps
 * growing. Dividing one by the other made a thumb that crept DOWN, toward
 * live, under a reader who was getting further from it, 531 to 601 px of an
 * 810 px lane in eight seconds with nothing moving on screen, and 390.8 to
 * 410.2 px under a stationary pointer during a drag.
 *
 *     distance from live = position + (history now − history when parked)
 *
 * MEASURED: position 100 held while the history went 375 to 515 is a distance
 * that went 100 to 240, so the thumb moves UP by the 140 lines printed. The
 * drag runs the same map backwards, a pixel to a distance and the distance to
 * the position tmux is sent, 240 − 140 = 100, so the top of the lane asks for
 * the top of the frozen frame (375) and never for a live history (515) that
 * tmux would clamp without saying so. The arithmetic and its limits are in
 * ./live-distance.ts; this file only measures the lane and hands it pixels.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  distanceFromLive,
  positionAtOffset,
  thumbOffset
} from './live-distance';
import type { ScrollSurface, ScrollView } from './surface';
import './scrollbar.css';

/** Never let the thumb shrink below a grabbable target. */
const MIN_THUMB_PX = 20;

export interface TerminalScrollbarProps {
  surface: ScrollSurface;
}

export function TerminalScrollbar({
  surface
}: TerminalScrollbarProps): React.JSX.Element {
  const [view, setView] = useState<ScrollView>(() => surface.view);
  const [dragging, setDragging] = useState(false);
  const [trackHeight, setTrackHeight] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => surface.subscribe(setView), [surface]);

  // The track is as tall as the pane, which the split grid and the window
  // both resize — measure it rather than reading a layout value during
  // render (which is 0 on the first pass and stale after every resize).
  useEffect(() => {
    const track = trackRef.current;
    if (track === null) return undefined;
    setTrackHeight(track.clientHeight);
    const observer = new ResizeObserver(() => {
      setTrackHeight(track.clientHeight);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  // A thumb only ever means "there is history above you". With nothing to
  // scroll it would size to the whole track — an unbroken 3px rule down every
  // pane, which a split surface multiplies into a grid of meaningless lines —
  // so the bar draws no thumb at all and the track goes pointer-events:none
  // (scrollbar.css) rather than absorbing the click that focuses the pane.
  const scrollable = view.history > 0;
  const total = Math.max(1, view.history + Math.max(1, view.rows));
  const thumbHeight = Math.max(
    MIN_THUMB_PX,
    (Math.max(1, view.rows) / total) * trackHeight
  );
  const travel = Math.max(0, trackHeight - thumbHeight);
  // Live parks the thumb at the BOTTOM; a distance from live equal to the
  // history is the top of the transcript. Phase 292: the distance, not tmux's
  // position, for the reason in this file's header.
  const thumbTop = thumbOffset(view, travel);
  const distance = distanceFromLive(view);

  /** Pointer y inside the track → the tmux position it selects. */
  const positionAt = useCallback(
    (clientY: number): number => {
      const track = trackRef.current;
      if (track === null || view.history === 0) return 0;
      const rect = track.getBoundingClientRect();
      const height = Math.max(MIN_THUMB_PX, rect.height);
      const thumb = Math.max(
        MIN_THUMB_PX,
        (Math.max(1, view.rows) / total) * height
      );
      const span = Math.max(1, height - thumb);
      const top = Math.min(
        span,
        Math.max(0, clientY - rect.top - thumb / 2)
      );
      // Phase 292. The pixel is a distance from live; what tmux is sent is
      // that distance less the lines printed since the park.
      return positionAtOffset(view, top, span);
    },
    [total, view]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || view.history === 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      surface.setDragging(true);
      surface.scrollTo(positionAt(event.clientY));
    },
    [positionAt, surface, view.history]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      surface.scrollTo(positionAt(event.clientY));
    },
    [dragging, positionAt, surface]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragging(false);
      surface.setDragging(false);
    },
    [dragging, surface]
  );

  return (
    <div
      ref={trackRef}
      className="gmux-terminal-scrollbar"
      data-dragging={dragging ? '' : undefined}
      data-away={view.atLive ? undefined : ''}
      data-scrollable={scrollable ? '' : undefined}
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={view.history}
      aria-valuenow={Math.max(0, view.history - distance)}
      aria-label="Session output"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {scrollable ? (
        <div
          className="gmux-terminal-scrollbar-thumb"
          style={{
            height: `${thumbHeight}px`,
            transform: `translateY(${thumbTop}px)`
          }}
        />
      ) : null}
    </div>
  );
}
