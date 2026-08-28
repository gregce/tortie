/*---------------------------------------------------------------------------
 *  Copyright 2010-2021 Mike Bostock
 *  Licensed under the ISC License.
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 *  WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 *  MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 *  ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 *  WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 *  ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 *  OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *--------------------------------------------------------------------------*/

/**
 * VENDORED, NOT INVENTED (CLAUDE.md guardrail 2, "assemble, never
 * reimplement", and research 68 section 7 THE RULING, which admits exactly
 * this extract). This is the zoom-toward-cursor transform algebra from
 * d3-zoom, in the `quickopen/scorer.ts` and `scm/graph/layout.ts` mould.
 *
 * UPSTREAM FILES: d3/d3-zoom v3.0.0 (ISC, header above kept intact,
 *                 fetched 2026-08-27)
 *                 → `src/transform.js`: the `Transform` class, being
 *                   `scale`, `translate`, `apply`, `applyX/Y`, `invert`,
 *                   `invertX/Y` and `toString`, and the `identity` constant.
 *                 → `src/zoom.js`: the internal `scale(transform, k)` and
 *                   `translate(transform, p0, p1)` pair that `scaleTo`
 *                   composes, and `defaultWheelDelta`.
 * WHAT WAS DROPPED: the whole event machinery (d3-selection, d3-dispatch,
 *                 d3-drag, d3-transition, gesture objects, touch handling),
 *                 `rescaleX`/`rescaleY` (they need d3-scale), `constrain`
 *                 (ours lives in geometry.ts as `clampCamera` with different
 *                 semantics) and the `__zoom` node property protocol. Our
 *                 own gesture layer next door replaces every one of them.
 * WHAT WAS CHANGED: the prototype class became a readonly `Camera` object
 *                 with pure functions, points became `{x, y}` instead of
 *                 two-element arrays, and `toString` became `cameraToSvg`
 *                 with the map's own stable number formatting, so the
 *                 at-rest markup is byte for byte reproducible. The algebra
 *                 itself is transcribed line for line.
 *
 * THE ONE INVARIANT this file exists for, verbatim from d3-zoom's
 * `scaleTo`: zooming about a pointer p is
 *
 *     translate(scale(t, k), p, invert(t, p))
 *
 * which keeps the world point that sits under the cursor exactly under the
 * cursor while the scale moves. `camera/__tests__/transform.test.ts` holds
 * that invariant executable.
 */

/** The camera: screen = world * k + (x, y). d3-zoom's ZoomTransform. */
export interface Camera {
  readonly k: number;
  readonly x: number;
  readonly y: number;
}

/** A point, in whichever space the caller says. */
export interface CameraPoint {
  readonly x: number;
  readonly y: number;
}

/** d3-zoom `identity`. */
export const CAMERA_IDENTITY: Camera = { k: 1, x: 0, y: 0 };

/** d3-zoom `Transform.apply`: world in, screen out. */
export function cameraApply(t: Camera, p: CameraPoint): CameraPoint {
  return { x: p.x * t.k + t.x, y: p.y * t.k + t.y };
}

/** d3-zoom `Transform.invert`: screen in, world out. */
export function cameraInvert(t: Camera, p: CameraPoint): CameraPoint {
  return { x: (p.x - t.x) / t.k, y: (p.y - t.y) / t.k };
}

/**
 * d3-zoom `zoom.js` internal `scale(transform, k)`: a new scale, clamped to
 * the extent, translation untouched.
 */
export function cameraScale(
  t: Camera,
  k: number,
  extent: readonly [number, number]
): Camera {
  const clamped = Math.max(extent[0], Math.min(extent[1], k));
  return clamped === t.k ? t : { k: clamped, x: t.x, y: t.y };
}

/**
 * d3-zoom `zoom.js` internal `translate(transform, p0, p1)`: the
 * translation that puts WORLD point p1 under SCREEN point p0 at the
 * transform's own scale.
 */
export function cameraTranslate(
  t: Camera,
  p0: CameraPoint,
  p1: CameraPoint
): Camera {
  const x = p0.x - p1.x * t.k;
  const y = p0.y - p1.y * t.k;
  return x === t.x && y === t.y ? t : { k: t.k, x, y };
}

/**
 * The composition d3-zoom's `scaleTo` performs, the reason this file is
 * vendored: scale to `k` about the SCREEN point `p`, so the world point
 * under the cursor stays under the cursor.
 */
export function cameraZoomTo(
  t: Camera,
  k: number,
  p: CameraPoint,
  extent: readonly [number, number]
): Camera {
  return cameraTranslate(cameraScale(t, k, extent), p, cameraInvert(t, p));
}

/**
 * Hand written, not d3: pan by a SCREEN pixel delta. (d3's
 * `Transform.translate` takes world units; the gesture layer works in
 * screen pixels, so the addition is direct.)
 */
export function cameraPanBy(t: Camera, dx: number, dy: number): Camera {
  return dx === 0 && dy === 0 ? t : { k: t.k, x: t.x + dx, y: t.y + dy };
}

/**
 * d3-zoom `defaultWheelDelta`, verbatim: a wheel event's deltaY as an
 * exponent step, mode-normalised (0 pixels, 1 lines, 2 pages), with the
 * trackpad pinch (which Chromium reports as ctrlKey+wheel) ten times
 * stronger because its deltas are ten times finer. The new scale is
 * `k * 2 ** wheelZoomDelta(e)`.
 */
export function wheelZoomDelta(e: {
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly ctrlKey: boolean;
}): number {
  return (
    -e.deltaY *
    (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) *
    (e.ctrlKey ? 10 : 1)
  );
}

/**
 * Ours, replacing d3's `toString`: the SVG transform attribute for a
 * camera, with fixed rounding so the same camera state always renders the
 * same bytes. Translation rounds to hundredths of a pixel; the scale keeps
 * four decimals because at small k a hundredth is a visible step.
 */
export function cameraToSvg(t: Camera): string {
  const f2 = (v: number): number => Math.round(v * 100) / 100;
  const f4 = (v: number): number => Math.round(v * 10000) / 10000;
  return `translate(${String(f2(t.x))} ${String(f2(t.y))}) scale(${String(f4(t.k))})`;
}

/** Two cameras that draw the same picture, to the formatted precision. */
export function cameraEquals(a: Camera, b: Camera): boolean {
  return cameraToSvg(a) === cameraToSvg(b);
}
