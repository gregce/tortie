/**
 * ImageView — the image surface (Phase 12.10 item 1).
 *
 * Before this, an image tab said "gmux edits text files only", because the
 * only file reader in the app was UTF-8-and-refuses-binary. This is the
 * other reader's surface: fit to the panel by default, actual size one click
 * away, wheel to zoom, drag to pan, a transparency checkerboard behind the
 * pixels, and one quiet line of metadata under it.
 *
 * WHY THE ZOOM CONTROLS SIT IN THE FOOTER and not in the tab strip's actions
 * row with the minimap and side-by-side toggles: those two are app-wide
 * PREFERENCES that persist. Zoom is ephemeral state belonging to one picture
 * in one tab, and it needs a readout ("140%") next to it, which the actions
 * row has no room for. Every image viewer the user already knows — Preview,
 * a browser, Figma — puts the zoom near the image, so that is where it goes.
 *
 * Motion: none of its own. Zoom and pan track the input frame by frame with
 * no transition, which is both what a magnifier should feel like and what
 * prefers-reduced-motion asks for; the only thing that ever moves on its own
 * is an animated GIF, which is the image's own business.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GmuxFsExtras } from '@shared/ipc';
import { useApp } from '../../state/store';
import type { EditorTab } from '../store';
import { useLiveTabText } from '../live-text';
import { imageSourceFor } from './source';
import type { ImageSource } from './source';
import {
  clampOffset,
  clampScale,
  fitScale,
  formatBytes,
  formatZoom,
  isPannable,
  shortTypeOf,
  stepScale,
  wheelScale,
  zoomAnchoredOffset
} from './zoom';
import type { Offset, Size } from './zoom';
import './image.css';

const ZERO: Offset = { x: 0, y: 0 };
const NO_SIZE: Size = { width: 0, height: 0 };

/** Past this scale a raster image shows its pixels instead of a smear. */
const PIXELATE_FROM = 2;

export interface ImageViewProps {
  tab: EditorTab;
  /**
   * Track the unsaved buffer — Split mode on an SVG, exactly as the markdown
   * preview does it. Meaningless for a raster image, which has no buffer.
   */
  live?: boolean;
}

export function ImageView({
  tab,
  live = false
}: ImageViewProps): React.JSX.Element {
  const svg = tab.svg;
  // An SVG is text: it arrives through the ordinary reader, so Source mode
  // and ⌘S are the same code as any other file, and Split can re-render the
  // picture from the unsaved buffer.
  const svgText = useLiveTabText(tab.id, tab.savedContents, svg && live);
  const source = imageSourceFor({
    loading: tab.loading,
    error: tab.error,
    truncated: tab.truncated,
    svgText: svg ? svgText : null,
    data: tab.imageData
  });

  return (
    <ImageSurface
      source={source}
      name={tab.name}
      path={tab.path}
      // A `?v=` that changes when the watcher saw the file change: the URL is
      // otherwise stable and Chromium would keep serving the cached bitmap
      // while an agent rewrites the chart underneath it.
      revision={tab.imageRevision}
      pixelate={!svg}
      // Opening a picture is an attention switch, so ⌘0 / ⌘+ / arrows work
      // without a click first — the same reason the markdown preview takes
      // focus. In Split the source pane is the thing being used, so it keeps
      // the keyboard.
      focusOnOpen={!live}
    />
  );
}

// ---------------------------------------------------------------------------
// The surface: states, viewport, footer
// ---------------------------------------------------------------------------

export function ImageSurface({
  source,
  name,
  path,
  revision,
  pixelate,
  focusOnOpen = false
}: {
  source: ImageSource;
  name: string;
  path: string;
  revision: number;
  pixelate: boolean;
  focusOnOpen?: boolean;
}): React.JSX.Element {
  const toast = useApp((s) => s.toast);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<Size>(NO_SIZE);
  const [natural, setNatural] = useState<Size>(NO_SIZE);
  /** null = fit to the panel (recomputed on every resize). */
  const [scale, setScale] = useState<number | null>(null);
  const [offset, setOffset] = useState<Offset>(ZERO);

  const src = source.kind === 'ready' ? source.src : null;
  const versionedSrc =
    src === null || revision === 0
      ? src
      : `${src}${src.includes('?') ? '&' : '?'}v=${String(revision)}`;

  // A different picture is a different zoom: never inherit the last one.
  useEffect(() => {
    setScale(null);
    setOffset(ZERO);
    setNatural(NO_SIZE);
  }, [src]);

  useEffect(() => {
    if (!focusOnOpen || src === null) return;
    viewportRef.current?.focus({ preventScroll: true });
  }, [focusOnOpen, src]);

  // -- measurement -----------------------------------------------------------
  useEffect(() => {
    const el = viewportRef.current;
    if (el === null) return;
    const measure = (): void => {
      setView({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [source.kind]);

  const fit = fitScale(natural, view);
  const effective = scale ?? fit;
  const pannable = isPannable(natural, view, effective);

  const applyScale = useCallback(
    (next: number, anchor?: Offset): void => {
      const from = scale ?? fitScale(natural, view);
      const to = clampScale(next);
      const moved =
        anchor === undefined
          ? offset
          : zoomAnchoredOffset(offset, anchor, from, to);
      setScale(to);
      setOffset(clampOffset(moved, natural, view, to));
    },
    [scale, natural, view, offset]
  );

  const fitToPanel = useCallback((): void => {
    setScale(null);
    setOffset(ZERO);
  }, []);

  // -- wheel -----------------------------------------------------------------
  // Attached BY HAND and non-passively: React registers its root `wheel`
  // listener as passive, where preventDefault is a silent no-op — the picture
  // would simply never move. Attached ONCE per image, too: the handler reads
  // the live state through a ref rather than closing over it, so a continuous
  // wheel gesture is not also a stream of listener add/removes.
  const live = useRef({ applyScale, scale, natural, view });
  live.current = { applyScale, scale, natural, view };

  useEffect(() => {
    const el = viewportRef.current;
    if (el === null || src === null) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const now = live.current;
      const rect = el.getBoundingClientRect();
      // Anchor is measured from the viewport's CENTRE, the frame `offset`
      // itself lives in (the image is centred, then translated).
      const anchor: Offset = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      };
      // A trackpad pinch arrives as ctrlKey+wheel, so pinch-to-zoom works
      // through the same path with no extra code.
      now.applyScale(
        wheelScale(now.scale ?? fitScale(now.natural, now.view), e.deltaY),
        anchor
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [src]);

  // -- keyboard: ⌘+ / ⌘- / ⌘0, arrows pan ------------------------------------
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (src === null) return;
    if (e.metaKey && !e.ctrlKey && !e.altKey) {
      // `code` rather than `key`: ⌘+ is Shift+Equal on a US layout and the
      // produced character differs by keyboard layout.
      if (e.code === 'Equal' || e.key === '+') {
        e.preventDefault();
        applyScale(stepScale(effective, 1));
        return;
      }
      if (e.code === 'Minus' || e.key === '-') {
        e.preventDefault();
        applyScale(stepScale(effective, -1));
        return;
      }
      if (e.code === 'Digit0') {
        e.preventDefault();
        fitToPanel();
        return;
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || !pannable) return;
    const step = e.shiftKey ? 80 : 24;
    const nudge: Record<string, Offset> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step }
    };
    const delta = nudge[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    setOffset((prev) =>
      clampOffset(
        { x: prev.x + delta.x, y: prev.y + delta.y },
        natural,
        view,
        effective
      )
    );
  };

  // -- drag to pan -----------------------------------------------------------
  const drag = useRef<{ id: number; from: Offset; start: Offset } | null>(null);
  const onPointerDown = (e: React.PointerEvent): void => {
    if (!pannable || e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      from: offset,
      start: { x: e.clientX, y: e.clientY }
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = drag.current;
    if (d === null || d.id !== e.pointerId) return;
    setOffset(
      clampOffset(
        {
          x: d.from.x + (e.clientX - d.start.x),
          y: d.from.y + (e.clientY - d.start.y)
        },
        natural,
        view,
        effective
      )
    );
  };
  const endDrag = (e: React.PointerEvent): void => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // -- non-image states ------------------------------------------------------
  if (source.kind === 'error') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">Could not open this image</div>
        <div className="ed-state-body">{source.message}</div>
      </div>
    );
  }
  if (source.kind === 'missing') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">This image is not on disk</div>
        <div className="ed-state-body">
          {name} was moved or deleted, so there is nothing left to show.
        </div>
      </div>
    );
  }
  if (source.kind === 'too-large') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">This image is too large to preview</div>
        <div className="ed-state-body">
          {name} is {formatBytes(source.bytes)}. gmux previews images up to{' '}
          {formatBytes(source.capBytes)}, so opening it here would stall the
          window rather than show you anything.
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const fs = window.gmux?.fs as
              | (typeof window.gmux.fs & GmuxFsExtras)
              | undefined;
            if (typeof fs?.reveal !== 'function') return;
            void fs.reveal(path).catch(() => {
              toast('error', 'Could not reveal that file.');
            });
          }}
        >
          Reveal in Finder
        </button>
      </div>
    );
  }
  if (source.kind === 'loading' || versionedSrc === null) {
    return <div className="imgv-loading" aria-label="Opening image" />;
  }

  const dimensions =
    natural.width > 0 && natural.height > 0
      ? `${String(natural.width)} × ${String(natural.height)}`
      : null;

  return (
    <div className="imgv">
      <div
        ref={viewportRef}
        className={`imgv-viewport${pannable ? ' pannable' : ''}`}
        role="group"
        aria-label={`${name} — image`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          // The gesture every image viewer has: double-click swaps between
          // "show me all of it" and "show me it properly".
          if (scale === null) applyScale(1);
          else fitToPanel();
        }}
      >
        <img
          className="imgv-img"
          src={versionedSrc}
          alt={name}
          draggable={false}
          style={{
            ...(natural.width > 0
              ? {
                  width: Math.max(1, Math.round(natural.width * effective)),
                  height: Math.max(1, Math.round(natural.height * effective))
                }
              : {}),
            transform: `translate(${String(Math.round(offset.x))}px, ${String(
              Math.round(offset.y)
            )}px)`,
            // Sizing the element (rather than transform: scale) is what keeps
            // an SVG re-rasterizing crisply at every zoom instead of blowing
            // up one bitmap.
            imageRendering:
              pixelate && effective >= PIXELATE_FROM ? 'pixelated' : 'auto'
          }}
          onLoad={(e) => {
            const el = e.currentTarget;
            setNatural({
              width: el.naturalWidth,
              height: el.naturalHeight
            });
          }}
        />
      </div>

      <div className="imgv-foot">
        <span className="imgv-meta">
          {dimensions !== null ? <span>{dimensions}</span> : null}
          <span>{formatBytes(source.bytes)}</span>
          <span>{shortTypeOf(source.mediaType)}</span>
        </span>
        <span className="imgv-zoom">{formatZoom(effective)}</span>
        <div className="ed-mode imgv-fit" role="group" aria-label="Image size">
          <button
            type="button"
            className={`ed-mode-opt${scale === null ? ' on' : ''}`}
            aria-pressed={scale === null}
            title="Fit the whole image in the panel (⌘0)"
            onClick={fitToPanel}
          >
            Fit
          </button>
          <button
            type="button"
            className={`ed-mode-opt${
              scale !== null && Math.abs(effective - 1) < 1e-6 ? ' on' : ''
            }`}
            aria-pressed={scale !== null && Math.abs(effective - 1) < 1e-6}
            title="Show every pixel at actual size"
            onClick={() => applyScale(1)}
          >
            1:1
          </button>
        </div>
      </div>
    </div>
  );
}

