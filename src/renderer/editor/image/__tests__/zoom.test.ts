/**
 * The image viewer's arithmetic (Phase 12.10 item 1).
 *
 * These are the behaviours a screenshot cannot prove: that fit never
 * enlarges, that zoom stays anchored under the pointer, and that an image
 * can never be panned off the edge and lost.
 */

import { describe, expect, it } from 'vitest';
import {
  clampOffset,
  clampScale,
  fitScale,
  formatBytes,
  formatZoom,
  isPannable,
  MAX_SCALE,
  MIN_SCALE,
  shortTypeOf,
  stepScale,
  wheelScale,
  zoomAnchoredOffset
} from '../zoom';

describe('fit', () => {
  it('shrinks something too big for the panel', () => {
    expect(fitScale({ width: 2000, height: 1000 }, { width: 500, height: 500 }))
      .toBe(0.25);
  });

  it('binds on the tighter axis', () => {
    expect(fitScale({ width: 1000, height: 4000 }, { width: 500, height: 500 }))
      .toBe(0.125);
  });

  it('NEVER enlarges — a 16px favicon stays a 16px favicon', () => {
    expect(fitScale({ width: 16, height: 16 }, { width: 900, height: 700 }))
      .toBe(1);
  });

  it('is 1 before anything has been measured', () => {
    expect(fitScale({ width: 0, height: 0 }, { width: 0, height: 0 })).toBe(1);
  });
});

describe('scale bounds', () => {
  it('clamps to the range and survives nonsense', () => {
    expect(clampScale(1000)).toBe(MAX_SCALE);
    expect(clampScale(0.0001)).toBe(MIN_SCALE);
    expect(clampScale(Number.NaN)).toBe(1);
    expect(clampScale(-2)).toBe(1);
  });
});

describe('the ⌘+ / ⌘- ladder', () => {
  it('lands on the round numbers people reason about', () => {
    expect(stepScale(1, 1)).toBe(1.5);
    expect(stepScale(1, -1)).toBe(0.75);
    expect(stepScale(0.5, 1)).toBe(0.75);
  });

  it('moves off a value BETWEEN stops in the direction asked', () => {
    expect(stepScale(1.2, 1)).toBe(1.5);
    expect(stepScale(1.2, -1)).toBe(1);
  });

  it('is strictly monotonic even at a stop reached by wheel', () => {
    const almostOne = 1.0000000002;
    expect(stepScale(almostOne, 1)).toBe(1.5);
    expect(stepScale(almostOne, -1)).toBe(0.75);
  });

  it('stops at the ends instead of wrapping', () => {
    expect(stepScale(MAX_SCALE, 1)).toBe(MAX_SCALE);
    expect(stepScale(MIN_SCALE, -1)).toBe(MIN_SCALE);
  });
});

describe('wheel zoom', () => {
  it('changes the picture by the same PROPORTION at every scale', () => {
    const a = wheelScale(1, -100) / 1;
    const b = wheelScale(8, -100) / 8;
    expect(a).toBeCloseTo(b, 10);
  });

  it('zooms in on a negative delta and out on a positive one', () => {
    expect(wheelScale(1, -100)).toBeGreaterThan(1);
    expect(wheelScale(1, 100)).toBeLessThan(1);
  });

  it('cannot escape the bounds', () => {
    expect(wheelScale(MAX_SCALE, -100000)).toBe(MAX_SCALE);
    expect(wheelScale(MIN_SCALE, 100000)).toBe(MIN_SCALE);
  });
});

describe('anchored zoom', () => {
  it('keeps the point under the pointer under the pointer', () => {
    // Viewport centre is (0,0); the pointer is 100px right of it. Whatever
    // image pixel sits there must still sit there after zooming 2×.
    const before = { x: 0, y: 0 };
    const after = zoomAnchoredOffset(before, { x: 100, y: 0 }, 1, 2);
    // The image point at pointer-x 100 was at image coordinate 100 (offset
    // 0, scale 1); after 2× it is at 200, so the offset must pull back 100.
    expect(after.x).toBe(-100);
  });

  it('is the identity at the centre', () => {
    expect(zoomAnchoredOffset({ x: 0, y: 0 }, { x: 0, y: 0 }, 1, 4)).toEqual({
      x: 0,
      y: 0
    });
  });

  it('round-trips: zoom in at a point, zoom back out, same offset', () => {
    const p = { x: 40, y: -25 };
    const inward = zoomAnchoredOffset({ x: 0, y: 0 }, p, 1, 3);
    const back = zoomAnchoredOffset(inward, p, 3, 1);
    expect(back.x).toBeCloseTo(0, 10);
    expect(back.y).toBeCloseTo(0, 10);
  });
});

describe('pan limits', () => {
  const natural = { width: 1000, height: 1000 };
  const view = { width: 400, height: 400 };

  it('lets an overflowing image travel exactly its overflow', () => {
    // 1000×1 vs 400 → 600 of overflow, half each way.
    const clamped = clampOffset({ x: 9999, y: -9999 }, natural, view, 1);
    expect(clamped).toEqual({ x: 300, y: -300 });
  });

  it('pins a small image to the centre — it can never be flicked away', () => {
    expect(clampOffset({ x: 500, y: 500 }, natural, view, 0.2)).toEqual({
      x: 0,
      y: 0
    });
  });

  it('knows when there is anywhere to pan to', () => {
    expect(isPannable(natural, view, 1)).toBe(true);
    expect(isPannable(natural, view, 0.4)).toBe(false);
    // One axis overflowing is enough.
    expect(isPannable({ width: 1000, height: 10 }, view, 1)).toBe(true);
  });
});

describe('the metadata line', () => {
  it('reads zoom the way a person says it', () => {
    expect(formatZoom(1)).toBe('100%');
    expect(formatZoom(0.25)).toBe('25%');
    expect(formatZoom(8)).toBe('800%');
    // Below 10% a whole number would round several stops to "0%".
    expect(formatZoom(0.056)).toBe('5.6%');
  });

  it('reads size the way Finder does', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(412 * 1024)).toBe('412 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(48 * 1024 * 1024)).toBe('48 MB');
    expect(formatBytes(-1)).toBe('—');
  });

  it('names the type in the words on the file, not the wire', () => {
    expect(shortTypeOf('image/png')).toBe('PNG');
    expect(shortTypeOf('image/svg+xml')).toBe('SVG');
    expect(shortTypeOf('image/x-icon')).toBe('ICON');
    expect(shortTypeOf('image/jpeg')).toBe('JPEG');
  });
});
