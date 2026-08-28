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
 * VENDORED, NOT INVENTED (CLAUDE.md guardrail 2, assemble rather than
 * reimplement; the extract form is research 68 section 7 item 2, taken so
 * the four year dormant d3 packages are not argued past the house's 14
 * month rule).
 *
 * UPSTREAM FILE:  d3/d3-interpolate v3.0.1 -> src/zoom.js
 *                 (fetched verbatim from the v3.0.1 tag on 2026-08-27,
 *                 along with the LICENSE file quoted above).
 * WHAT THIS IS:   `interpolateZoom`, the van Wijk and Nuij "smooth and
 *                 efficient zooming and panning" path (INFOVIS 2003). Given
 *                 two views it returns an interpolator that pans and zooms
 *                 along the optimal path in (position, width) space, zooming
 *                 out just enough that the journey reads as one motion
 *                 rather than a slide.
 * WHAT CHANGED:   TypeScript types; the anonymous default export is the
 *                 named `interpolateZoom`; `var` became `const` and `let`;
 *                 the `duration` property is attached with `Object.assign`
 *                 so the closure stays typed. Every number, branch and
 *                 formula is upstream's, byte for byte where TypeScript
 *                 allows.
 * WHAT WAS KEPT:  the `rho` factory (`interpolateZoom.rho`), because it is
 *                 part of the upstream surface and the feel may need tuning;
 *                 the default curvature stays the paper's sqrt(2).
 *
 * A view is `[cx, cy, w]`: the world point at the centre of the viewport
 * and the width of the world the viewport shows. The camera conversion
 * lives next door in `animate.ts`; this file knows nothing about cameras,
 * screens or time, it is pure math from t in [0, 1] to a view.
 */

/** One view: centre x, centre y, visible world width. */
export type ZoomView = readonly [number, number, number];

/** The interpolator: a path over views plus its natural duration hint. */
export interface ZoomInterpolator {
  (t: number): ZoomView;
  /** Upstream's suggested duration in ms, proportional to path length. */
  readonly duration: number;
}

export interface InterpolateZoom {
  (p0: ZoomView, p1: ZoomView): ZoomInterpolator;
  /** A variant with a different curvature rho. Upstream surface, kept. */
  rho(value: number): InterpolateZoom;
}

const epsilon2 = 1e-12;

function cosh(x: number): number {
  const e = Math.exp(x);
  return (e + 1 / e) / 2;
}

function sinh(x: number): number {
  const e = Math.exp(x);
  return (e - 1 / e) / 2;
}

function tanh(x: number): number {
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

function zoomRho(rho: number, rho2: number, rho4: number): InterpolateZoom {
  // p0 = [ux0, uy0, w0]
  // p1 = [ux1, uy1, w1]
  function zoom(p0: ZoomView, p1: ZoomView): ZoomInterpolator {
    const ux0 = p0[0];
    const uy0 = p0[1];
    const w0 = p0[2];
    const ux1 = p1[0];
    const uy1 = p1[1];
    const w1 = p1[2];
    const dx = ux1 - ux0;
    const dy = uy1 - uy0;
    const d2 = dx * dx + dy * dy;
    let i: (t: number) => ZoomView;
    let S: number;

    // Special case for u0 close to u1.
    if (d2 < epsilon2) {
      S = Math.log(w1 / w0) / rho;
      i = (t: number): ZoomView => [
        ux0 + t * dx,
        uy0 + t * dy,
        w0 * Math.exp(rho * t * S)
      ];
    }

    // General case.
    else {
      const d1 = Math.sqrt(d2);
      const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
      const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
      const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
      const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      i = (t: number): ZoomView => {
        const s = t * S;
        const coshr0 = cosh(r0);
        const u =
          (w0 / (rho2 * d1)) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
        return [
          ux0 + u * dx,
          uy0 + u * dy,
          (w0 * coshr0) / cosh(rho * s + r0)
        ];
      };
    }

    return Object.assign(i, { duration: (S * 1000 * rho) / Math.SQRT2 });
  }

  zoom.rho = (value: number): InterpolateZoom => {
    const _1 = Math.max(1e-3, +value);
    const _2 = _1 * _1;
    const _4 = _2 * _2;
    return zoomRho(_1, _2, _4);
  };

  return zoom;
}

/** The path with the paper's curvature, rho equal to the square root of 2. */
export const interpolateZoom: InterpolateZoom = zoomRho(Math.SQRT2, 2, 4);
