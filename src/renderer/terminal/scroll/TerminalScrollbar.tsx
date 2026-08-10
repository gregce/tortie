/**
 * The scrollbar gmux draws for a session (Phase 12.3).
 *
 * xterm's own scrollbar is useless here: `tmux attach` parks the client in
 * its alternate buffer, so that viewport is exactly one screen tall and its
 * thumb never appears. The real scrollback lives in tmux, so the bar is drawn
 * from the tmux geometry the ScrollSurface polls.
 *
 * It sits in the 10px lane the fit addon already reserves for xterm's
 * scrollbar (terminal.css hides that one's thumb but keeps its width, so cell
 * layout is unchanged). Always present — minimal at rest so the affordance is
 * discoverable without competing with output, thicker on hover, draggable to
 * scrub. Colors are tokens; motion is a single width/color transition, which
 * the global prefers-reduced-motion rule collapses to 1 ms.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

  const total = Math.max(1, view.history + Math.max(1, view.rows));
  const thumbHeight = Math.max(
    MIN_THUMB_PX,
    (Math.max(1, view.rows) / total) * trackHeight
  );
  const travel = Math.max(0, trackHeight - thumbHeight);
  // position 0 (live) parks the thumb at the BOTTOM; position === history is
  // the top of the transcript.
  const thumbTop =
    view.history > 0 ? (1 - view.position / view.history) * travel : travel;

  /** Pointer y inside the track → the offset it selects. */
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
      return Math.round((1 - top / span) * view.history);
    },
    [total, view.history, view.rows]
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
      data-scrollable={view.history > 0 ? '' : undefined}
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={view.history}
      aria-valuenow={view.history - view.position}
      aria-label="Session output"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="gmux-terminal-scrollbar-thumb"
        style={{
          height: `${thumbHeight}px`,
          transform: `translateY(${thumbTop}px)`
        }}
      />
    </div>
  );
}
