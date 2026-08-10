/**
 * The preview pane's scroll indicator.
 *
 * Monaco's minimap is a picture of CHARACTERS; over rendered prose that
 * picture says nothing. The equivalent affordance for a document is its
 * outline, so the same toggle that gives code a minimap gives the preview a
 * heading ruler: one tick per heading, sized and dimmed by depth, with the
 * viewport as a moving block you can grab.
 *
 * The detail that bites: rendered markdown changes height AFTER first paint —
 * images decode, fonts settle, <details> opens. Without a ResizeObserver on
 * the content plus a per-image `decode()` re-measure, every tick on any README
 * with a screenshot is wrong. Both funnel into one rAF pass.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Floor for the viewport block, so it stays grabbable in a long document. */
const MIN_THUMB_FRACTION = 0.04;

interface Tick {
  /** 0..1 down the document. */
  at: number;
  depth: number;
}

export interface HeadingRulerProps {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  /** Bump to force a re-measure (source or highlighter changed). */
  revision: number;
  /** id of the scroll region, for aria-controls. */
  controls: string;
}

export function HeadingRuler({
  scrollerRef,
  contentRef,
  revision,
  controls
}: HeadingRulerProps): React.JSX.Element {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [metrics, setMetrics] = useState({ top: 0, height: 1, viewport: 1 });
  const frame = useRef<number | null>(null);

  const measure = useCallback((): void => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (scroller === null || content === null) return;
    const height = Math.max(scroller.scrollHeight, 1);
    const viewport = scroller.clientHeight;
    const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
    const next: Tick[] = [];
    for (const el of content.querySelectorAll<HTMLElement>('[data-md-heading]')) {
      const depth = Number(el.dataset['mdHeading'] ?? '1');
      next.push({
        at: Math.min(Math.max((el.getBoundingClientRect().top - base) / height, 0), 1),
        depth: Number.isFinite(depth) ? depth : 1
      });
    }
    setTicks(next);
    setMetrics({ top: scroller.scrollTop, height, viewport });
  }, [scrollerRef, contentRef]);

  const schedule = useCallback((): void => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  }, [measure]);

  // Content geometry: first paint, every resize, and every image that decodes
  // after the fact.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (scroller === null || content === null) return;
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(scroller);
    ro.observe(content);
    const images = [...content.querySelectorAll('img')];
    for (const img of images) {
      img.decode().then(schedule, schedule);
    }
    const onToggle = (): void => schedule();
    content.addEventListener('toggle', onToggle, true);
    return () => {
      ro.disconnect();
      content.removeEventListener('toggle', onToggle, true);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [scrollerRef, contentRef, schedule, revision]);

  // Scroll position only — cheap, no re-measure.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    const onScroll = (): void =>
      setMetrics((m) => ({ ...m, top: scroller.scrollTop }));
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [scrollerRef]);

  // -- dragging --------------------------------------------------------------
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const jumpTo = useCallback(
    (clientY: number): void => {
      const scroller = scrollerRef.current;
      const rail = railRef.current;
      if (scroller === null || rail === null) return;
      const box = rail.getBoundingClientRect();
      const fraction = (clientY - box.top) / Math.max(box.height, 1);
      const max = scroller.scrollHeight - scroller.clientHeight;
      // Centre the viewport on the point that was grabbed. `instant` matters:
      // the pane sets `scroll-behavior: smooth` for anchor links, and an
      // animated scroll per pointermove drags like wet rope.
      scroller.scrollTo({
        top: Math.min(
          Math.max(fraction * scroller.scrollHeight - scroller.clientHeight / 2, 0),
          Math.max(max, 0)
        ),
        behavior: 'instant'
      });
    },
    [scrollerRef]
  );

  const scrollBy = useCallback(
    (delta: number): void => {
      const scroller = scrollerRef.current;
      if (scroller === null) return;
      scroller.scrollBy({ top: delta, behavior: 'instant' });
    },
    [scrollerRef]
  );

  const scrollable = Math.max(metrics.height - metrics.viewport, 0);
  const progress = scrollable === 0 ? 0 : metrics.top / scrollable;
  const thumbHeight = Math.max(
    metrics.viewport / metrics.height,
    MIN_THUMB_FRACTION
  );
  const thumbTop = Math.min(
    (metrics.top / metrics.height) * 100,
    (1 - thumbHeight) * 100
  );

  return (
    <div
      ref={railRef}
      className="md-ruler"
      role="scrollbar"
      tabIndex={0}
      aria-label="Document position"
      aria-controls={controls}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        jumpTo(e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) jumpTo(e.clientY);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onKeyDown={(e) => {
        const page = (scrollerRef.current?.clientHeight ?? 0) * 0.9;
        if (e.key === 'ArrowDown') scrollBy(60);
        else if (e.key === 'ArrowUp') scrollBy(-60);
        else if (e.key === 'PageDown') scrollBy(page);
        else if (e.key === 'PageUp') scrollBy(-page);
        else if (e.key === 'Home') scrollBy(-metrics.height);
        else if (e.key === 'End') scrollBy(metrics.height);
        else return;
        e.preventDefault();
      }}
    >
      {ticks.map((tick, i) => (
        <span
          key={`${tick.at}-${i}`}
          className={`md-ruler-tick depth-${Math.min(tick.depth, 3)}`}
          style={{ top: `${tick.at * 100}%` }}
        />
      ))}
      <span
        className="md-ruler-thumb"
        style={{ top: `${thumbTop}%`, height: `${thumbHeight * 100}%` }}
      />
    </div>
  );
}
