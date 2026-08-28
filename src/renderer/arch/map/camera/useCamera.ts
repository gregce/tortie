/**
 * THE CAMERA ENGINE (Phase 162): one React hook that owns the single source
 * of motion truth for the map's `<g class="arch-map-camera">`.
 *
 * ## Why the hook writes the DOM attribute itself
 *
 * Research 68 section 6.4 measured exactly one mechanism vsync locked at
 * every product scale: rewriting ONE `<g transform>` attribute per frame.
 * So while a gesture, a glide or a flight is live, this hook writes the
 * attribute imperatively and React is not asked to render at 120 Hz. At
 * rest the camera is committed as ordinary React state, the component
 * renders the identical attribute (same formatter, same bytes), and the
 * container hears `onCameraRest` exactly once, which is where the debounced
 * arch.db write hangs. A React render that lands MID motion re-applies the
 * live transform in an effect, so a store push cannot snap the picture
 * back.
 *
 * Because the transform is an SVG ATTRIBUTE and not a CSS transform on a
 * composited layer, there is no raster snapshot anywhere: every frame is a
 * fresh vector paint at the current scale, so there is nothing to blur at
 * rest and nothing to re-rasterize. That is the no-blur-at-rest property,
 * held by construction.
 *
 * ## Motion arbitration, the one-motion rule
 *
 * At most one motion lives at a time: a gesture, a glide or a flight. A new
 * press stops whatever runs and SETTLES it (commits the live camera), so an
 * interrupted glide still saves where it stopped and the picture never
 * snaps. The fly-to comes from `animate.ts` (the vendored van Wijk and Nuij
 * path), which already cuts to the end state under `prefers-reduced-motion`;
 * the glide checks the same preference and rests immediately, because a
 * decorative coast is exactly what that setting turns off.
 *
 * ## Rest state, three-valued
 *
 * The rest camera is `'follow'` (track the fit: first run, and after ⌘0 or
 * Shift+1, so a resize keeps fitting), a concrete camera (the person moved
 * it, or a kept one arrived through the seam), or unset (use the seam's
 * kept camera, else the fit). Every concrete rest camera is clamped through
 * the leash before it draws, so a camera kept under a larger window can
 * never restore to an empty surface.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapLayout, MapViewport } from '../layout';
import {
  CAMERA_KEY_STEP,
  cameraScaleExtent,
  clampCamera,
  fitCamera,
  frameCamera
} from '../geometry';
import {
  cameraPanBy,
  cameraToSvg,
  cameraZoomTo,
  type Camera
} from './transform';
import type { ArchCameraHandle, ArchCanvasSeam } from './seam';
import { attachCameraGestures, type CameraGestureEngine } from './gestures';
import {
  displayGlideDriver,
  startGlide,
  type Velocity
} from './inertia';
import { flyCameraTo, prefersReducedMotion } from './animate';
import { setGesturing } from '../transitions';

/** What the drawing needs back: the attribute, and the two bind points. */
export interface ArchMapCamera {
  /** True when a seam is present: listeners attach and boxes may glide. */
  interactive: boolean;
  /** The at-rest transform attribute for `<g class="arch-map-camera">`. */
  transform: string;
  /** Ref callback for the svg: gestures attach here. */
  bindSvg: (el: SVGSVGElement | null) => void;
  /** Ref callback for the camera `<g>`: live frames write here. */
  bindScene: (el: SVGGElement | null) => void;
}

type RestSource = Camera | 'follow' | null;

export function useCamera(
  layout: MapLayout,
  viewport: MapViewport,
  seam: ArchCanvasSeam | undefined
): ArchMapCamera {
  const interactive = seam !== undefined;
  const [rest, setRest] = useState<RestSource>(null);

  // The values the stable engine reads through refs, refreshed per render,
  // so the listeners attached once per svg never close over stale props.
  const layoutRef = useRef(layout);
  const viewportRef = useRef(viewport);
  const seamRef = useRef(seam);
  layoutRef.current = layout;
  viewportRef.current = viewport;
  seamRef.current = seam;

  // The rest camera this render draws: committed, else kept, else the fit.
  const kept = seam?.camera ?? null;
  const restCamera = useMemo<Camera>(() => {
    const fit = fitCamera(layout, viewport);
    if (rest === 'follow' || rest === null) {
      const base = rest === null && kept !== null ? kept : fit;
      return clampCamera(base, layout, viewport);
    }
    return clampCamera(rest, layout, viewport);
  }, [rest, kept, layout, viewport]);
  const restRef = useRef(restCamera);
  restRef.current = restCamera;

  const sceneRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const liveRef = useRef<Camera | null>(null);
  const stopGlideRef = useRef<(() => void) | null>(null);
  const stopFlightRef = useRef<(() => void) | null>(null);

  // The engine: one stable object closing over refs only.
  const engine = useMemo(() => {
    const write = (c: Camera): void => {
      sceneRef.current?.setAttribute('transform', cameraToSvg(c));
    };
    const current = (): Camera => liveRef.current ?? restRef.current;
    const setMoving = (on: boolean): void => {
      const svg = svgRef.current;
      if (svg === null) return;
      // Two classes, one moment: `arch-map-moving` on the svg turns box and
      // stub pointer events off (map.css), and the gesture gate on the
      // containing fill div stops every filter and transition for the
      // duration (transitions.css), the research 68 rule that dress is for
      // rest. Idempotent, so the per-frame applyLive call is free.
      svg.classList.toggle('arch-map-moving', on);
      const fill = svg.parentElement;
      if (fill !== null) setGesturing(fill, on);
    };

    const applyLive = (next: Camera): void => {
      const clamped = clampCamera(next, layoutRef.current, viewportRef.current);
      liveRef.current = clamped;
      setMoving(true);
      write(clamped);
    };

    /** Commit the live camera (or an explicit source) and report the rest. */
    const settleTo = (source: Camera | 'follow'): void => {
      liveRef.current = null;
      setMoving(false);
      setRest(source);
      const restNow =
        source === 'follow'
          ? fitCamera(layoutRef.current, viewportRef.current)
          : source;
      write(clampCamera(restNow, layoutRef.current, viewportRef.current));
      seamRef.current?.onCameraRest({
        k: restNow.k,
        x: restNow.x,
        y: restNow.y
      });
    };

    const settle = (): void => {
      const live = liveRef.current;
      if (live === null) return;
      settleTo(live);
    };

    const stopMotion = (): void => {
      stopGlideRef.current?.();
      stopGlideRef.current = null;
      // A flight's cancel swallows its `done`, so the settle is owed here.
      const stopFlight = stopFlightRef.current;
      stopFlightRef.current = null;
      if (stopFlight !== null) {
        stopFlight();
        settle();
      }
    };

    /** Move to a target: the fly-to when one is possible, else the cut. */
    const goTo = (target: Camera, source: Camera | 'follow'): void => {
      stopMotion();
      const from = current();
      const flight = flyCameraTo({
        from,
        to: target,
        viewport: viewportRef.current,
        apply: applyLive,
        done: () => {
          stopFlightRef.current = null;
          settleTo(source);
        }
      });
      if (flight.running) {
        stopFlightRef.current = () => flight.cancel();
      }
      // Not running means reduced motion or a zero duration cut the flight
      // to its end state synchronously; `done` already settled.
    };

    /** The world rectangle of the focused box, when a box has focus. */
    const focusRect = (): { x: number; y: number; w: number; h: number } | null => {
      if (typeof document === 'undefined') return null;
      const svg = svgRef.current;
      const active = document.activeElement;
      if (svg === null || active === null || !svg.contains(active)) {
        return null;
      }
      const id = active.closest('[data-group]')?.getAttribute('data-group');
      if (id == null) return null;
      const box = layoutRef.current.boxById.get(id);
      if (box === undefined) return null;
      return { x: box.x, y: box.y, w: box.w, h: box.h };
    };

    const fitAll = (): void => {
      goTo(fitCamera(layoutRef.current, viewportRef.current), 'follow');
    };
    const frameFocus = (): void => {
      const rect = focusRect();
      if (rect === null) {
        fitAll();
        return;
      }
      const target = frameCamera(rect, layoutRef.current, viewportRef.current);
      goTo(target, target);
    };
    const zoomStep = (direction: 1 | -1): void => {
      stopMotion();
      const from = current();
      const vp = viewportRef.current;
      const target = cameraZoomTo(
        from,
        from.k * CAMERA_KEY_STEP ** direction,
        { x: vp.width / 2, y: vp.height / 2 },
        cameraScaleExtent(layoutRef.current, vp)
      );
      applyLive(target);
      settle();
    };

    const gestureEngine: CameraGestureEngine = {
      camera: current,
      scaleExtent: () =>
        cameraScaleExtent(layoutRef.current, viewportRef.current),
      applyLive,
      settle,
      startGlide: (v: Velocity) => {
        if (prefersReducedMotion()) {
          settle();
          return;
        }
        stopGlideRef.current = startGlide(
          v,
          (dx, dy) => {
            applyLive(cameraPanBy(current(), dx, dy));
          },
          () => {
            stopGlideRef.current = null;
            settle();
          },
          displayGlideDriver()
        );
      },
      stopMotion
    };

    const handle: ArchCameraHandle = {
      zoomIn: () => zoomStep(1),
      zoomOut: () => zoomStep(-1),
      zoomReset: fitAll,
      fitAll,
      fitSelection: frameFocus,
      frame: frameFocus
    };

    return { gestureEngine, handle, stopMotion };
  }, []);

  // The container's key set drives the handle through the seam's ref.
  useEffect(() => {
    const ref = seam?.cameraRef;
    if (ref === undefined) return undefined;
    ref.current = engine.handle;
    return () => {
      ref.current = null;
    };
  }, [seam?.cameraRef, engine]);

  // A React render that lands mid motion must not snap the picture back to
  // the rest attribute it just rendered.
  useEffect(() => {
    const live = liveRef.current;
    if (live !== null) {
      sceneRef.current?.setAttribute('transform', cameraToSvg(live));
    }
  });

  // Unmount: stop the clocks. No settle — the scene is gone.
  useEffect(
    () => () => {
      stopGlideRef.current?.();
      stopFlightRef.current?.();
    },
    []
  );

  const detachRef = useRef<(() => void) | null>(null);
  const bindSvg = useCallback(
    (el: SVGSVGElement | null): void => {
      detachRef.current?.();
      detachRef.current = null;
      svgRef.current = el;
      if (el !== null && interactive) {
        detachRef.current = attachCameraGestures(el, engine.gestureEngine);
      }
    },
    [interactive, engine]
  );

  const bindScene = useCallback((el: SVGGElement | null): void => {
    sceneRef.current = el;
  }, []);

  return {
    interactive,
    transform: cameraToSvg(restCamera),
    bindSvg,
    bindScene
  };
}
