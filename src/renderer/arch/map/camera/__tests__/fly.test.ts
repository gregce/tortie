/**
 * The vendored van Wijk and Nuij path (Phase 162).
 *
 * WHAT IS HELD HERE.
 *
 *  - FIDELITY: the file carries the upstream copyright and the upstream
 *    constants, so a cleanup cannot quietly de-attribute or re-tune it.
 *  - The ENDPOINTS are exact: t 0 is the first view and t 1 is the second,
 *    in both the special case and the general case.
 *  - CLOSED FORMS the paper gives are honoured, checked independently of
 *    the implementation: a pure zoom passes through the geometric mean of
 *    the two widths at t 0.5, and its duration is 1000 times the log width
 *    ratio over root 2 at the default rho.
 *  - The path is SYMMETRIC, TRANSLATION invariant and SCALE invariant, and
 *    a long pan zooms out in the middle, which is the whole point of the
 *    path.
 *  - DETERMINISM: same views, same samples, byte for byte.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { interpolateZoom, type ZoomView } from '../fly';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(HERE, '..', 'fly.ts'), 'utf8');

const close = (a: number, b: number, eps = 1e-9): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(eps);
};

const closeView = (a: ZoomView, b: ZoomView, eps = 1e-9): void => {
  close(a[0], b[0], eps);
  close(a[1], b[1], eps);
  close(a[2], b[2], eps);
};

describe('attribution and fidelity', () => {
  it('keeps the upstream copyright line first, before any code', () => {
    const at = SOURCE.indexOf('Copyright 2010-2021 Mike Bostock');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(SOURCE.indexOf('export'));
  });

  it('names the upstream file and version', () => {
    expect(SOURCE).toContain('d3/d3-interpolate v3.0.1');
    expect(SOURCE).toContain('src/zoom.js');
    expect(SOURCE).toContain('ISC');
  });

  it('keeps the upstream constants untouched', () => {
    expect(SOURCE).toContain('1e-12');
    expect(SOURCE).toContain('zoomRho(Math.SQRT2, 2, 4)');
    expect(SOURCE).toContain('Math.max(1e-3');
  });
});

describe('endpoints', () => {
  it('lands exactly on both views in the general case', () => {
    const p0: ZoomView = [100, 50, 200];
    const p1: ZoomView = [900, 700, 40];
    const i = interpolateZoom(p0, p1);
    closeView(i(0), p0);
    closeView(i(1), p1);
  });

  it('lands exactly on both views in the pure zoom special case', () => {
    const p0: ZoomView = [320, 240, 640];
    const p1: ZoomView = [320, 240, 80];
    const i = interpolateZoom(p0, p1);
    closeView(i(0), p0);
    closeView(i(1), p1);
  });
});

describe('closed forms the paper gives, checked independently', () => {
  it('a pure zoom passes through the geometric mean width at t 0.5', () => {
    const w0 = 640;
    const w1 = 10;
    const i = interpolateZoom([0, 0, w0], [0, 0, w1]);
    close(i(0.5)[2], Math.sqrt(w0 * w1), 1e-9);
  });

  it('a pure zoom duration is 1000 ln(w1/w0) over root 2 at default rho', () => {
    const w0 = 100;
    const w1 = 800;
    const i = interpolateZoom([5, 5, w0], [5, 5, w1]);
    close(i.duration, (1000 * Math.log(w1 / w0)) / Math.SQRT2, 1e-9);
  });
});

describe('path properties', () => {
  const p0: ZoomView = [0, 0, 100];
  const p1: ZoomView = [1200, 400, 100];

  it('is symmetric: the reverse path at 1 - t matches', () => {
    const forward = interpolateZoom(p0, p1);
    const backward = interpolateZoom(p1, p0);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      closeView(forward(t), backward(1 - t), 1e-6);
    }
  });

  it('is translation invariant', () => {
    const i = interpolateZoom(p0, p1);
    const shifted = interpolateZoom([50, -70, 100], [1250, 330, 100]);
    for (const t of [0.2, 0.5, 0.8]) {
      const a = i(t);
      const b = shifted(t);
      close(b[0] - a[0], 50, 1e-6);
      close(b[1] - a[1], -70, 1e-6);
      close(b[2], a[2], 1e-6);
    }
  });

  it('is scale invariant', () => {
    const i = interpolateZoom(p0, p1);
    const doubled = interpolateZoom([0, 0, 200], [2400, 800, 200]);
    for (const t of [0.2, 0.5, 0.8]) {
      const a = i(t);
      const b = doubled(t);
      close(b[0], a[0] * 2, 1e-6);
      close(b[1], a[1] * 2, 1e-6);
      close(b[2], a[2] * 2, 1e-6);
    }
  });

  it('zooms out in the middle of a long pan', () => {
    const i = interpolateZoom(p0, p1);
    expect(i(0.5)[2]).toBeGreaterThan(100);
  });

  it('is deterministic, byte for byte', () => {
    const a = interpolateZoom(p0, p1);
    const b = interpolateZoom(p0, p1);
    for (const t of [0, 0.3, 0.6, 1]) {
      expect(JSON.stringify(a(t))).toBe(JSON.stringify(b(t)));
    }
  });
});

describe('the rho factory, upstream surface kept', () => {
  it('reproduces the default at the default curvature', () => {
    const tuned = interpolateZoom.rho(Math.SQRT2);
    const a = interpolateZoom([0, 0, 100], [500, 0, 50]);
    const b = tuned([0, 0, 100], [500, 0, 50]);
    for (const t of [0.25, 0.5, 0.75]) {
      closeView(a(t), b(t), 1e-9);
    }
    close(a.duration, b.duration, 1e-9);
  });

  it('a larger rho zooms out further on the same journey', () => {
    const calm = interpolateZoom.rho(2)([0, 0, 100], [1200, 0, 100]);
    const brisk = interpolateZoom([0, 0, 100], [1200, 0, 100]);
    expect(calm(0.5)[2]).toBeGreaterThan(brisk(0.5)[2]);
  });
});
