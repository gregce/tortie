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

/**
 * Whether the pointer a drag is holding should be sent again, once, against an
 * answer that just arrived — Phase 294 (build/p353/SPEC.md D294-5).
 *
 * A drag held in the lowest band of the lane asks the frozen frame's bottom,
 * because the lines printed since the park are not in that frame. On a tmux
 * that names the frame's depth, main now re-freezes the frame there and keeps
 * the reader on their line (`scrollFrom` in src/main/tmux/scroll.ts), and the
 * answer comes back with a DIFFERENT frame: `historyAtEntry`, which on that
 * tmux is tmux's own depth. The same pointer then names a different line, one
 * inside what printed, so it is sent again once, and the band narrows to what
 * printed since. Once per pointer event and never on its own, so a pointer
 * held still while the agent prints re-freezes nothing after that one re-send.
 *
 * Nothing re-sends for an answer that carries a frame where the pointer was
 * sent against none (the drag that parked the pane), nor while live.
 */
export function heldPointerResend(
  sentAgainst: number | null,
  answered: number | null
): boolean {
  return sentAgainst !== null && answered !== null && answered !== sentAgainst;
}

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

  // Phase 294. The pointer the drag holds, the frame it was last sent against,
  // and whether that send may still be sent again once (`heldPointerResend`).
  const heldY = useRef<number | null>(null);
  const sentAgainst = useRef<number | null>(null);
  const resendArmed = useRef(false);

  /** Send the pointer's position, remembering the frame it was sent against. */
  const sendPointer = useCallback(
    (clientY: number) => {
      heldY.current = clientY;
      sentAgainst.current = view.historyAtEntry;
      resendArmed.current = true;
      surface.scrollTo(positionAt(clientY));
    },
    [positionAt, surface, view.historyAtEntry]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || view.history === 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      surface.setDragging(true);
      sendPointer(event.clientY);
    },
    [sendPointer, surface, view.history]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      sendPointer(event.clientY);
    },
    [dragging, sendPointer]
  );

  // Phase 294. An answer mid-drag that carries a different frame (main
  // re-froze it at the drag's band) re-sends the held pointer ONCE, against
  // the frame the answer carries.
  useEffect(() => {
    const y = heldY.current;
    if (!dragging || y === null || !resendArmed.current) return;
    if (!heldPointerResend(sentAgainst.current, view.historyAtEntry)) return;
    resendArmed.current = false;
    sentAgainst.current = view.historyAtEntry;
    surface.scrollTo(positionAt(y));
  }, [dragging, positionAt, surface, view.historyAtEntry]);

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      heldY.current = null;
      resendArmed.current = false;
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
