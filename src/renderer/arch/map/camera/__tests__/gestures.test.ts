/**
 * The gesture decisions (Phase 162), as pure state: the click-against-drag
 * slop, the hand tool's from-the-first-pixel pan, the wheel's zoom-or-pan
 * intent and its unit normalisation. The DOM half is thin listeners over
 * exactly these functions; this repository carries no jsdom, so the
 * decisions are proved here and the wiring is proved in the phase's app
 * run.
 */

import { describe, expect, it } from 'vitest';
import { CAMERA_DRAG_SLOP } from '../../geometry';
import {
  createPanSession,
  WHEEL_LINE_PX,
  wheelIntent,
  wheelPanPx
} from '../gestures';

describe('the named slop threshold', () => {
  it('is four screen pixels, stated once in geometry', () => {
    expect(CAMERA_DRAG_SLOP).toBe(4);
  });

  it('a press that moves under the slop stays a click', () => {
    const s = createPanSession({ x: 100, y: 100, t: 0 }, false);
    expect(s.move({ x: 102, y: 101, t: 16 })).toBeNull();
    expect(s.move({ x: 101, y: 102, t: 32 })).toBeNull();
    expect(s.panned()).toBe(false);
    expect(s.release(48)).toEqual({ vx: 0, vy: 0 });
  });

  it('a press that crosses the slop becomes a pan and carries the whole distance', () => {
    const s = createPanSession({ x: 100, y: 100, t: 0 }, false);
    expect(s.move({ x: 102, y: 100, t: 16 })).toBeNull();
    // Crossing: the first step hands over everything since the press, so
    // the picture is never a threshold behind the hand.
    const step = s.move({ x: 108, y: 103, t: 32 });
    expect(step).toEqual({ dx: 8, dy: 3 });
    expect(s.panned()).toBe(true);
    // Later steps are increments.
    expect(s.move({ x: 110, y: 103, t: 48 })).toEqual({ dx: 2, dy: 0 });
  });

  it('a hand press (Space or middle button) pans from the first pixel', () => {
    const s = createPanSession({ x: 0, y: 0, t: 0 }, true);
    expect(s.move({ x: 1, y: 0, t: 8 })).toEqual({ dx: 1, dy: 0 });
    expect(s.panned()).toBe(true);
  });

  it('release velocity comes from the drag itself', () => {
    const s = createPanSession({ x: 0, y: 0, t: 0 }, false);
    for (let i = 1; i <= 10; i += 1) {
      s.move({ x: i * 10, y: 0, t: i * 10 });
    }
    const v = s.release(100);
    expect(v.vx).toBeCloseTo(1, 5);
    expect(v.vy).toBe(0);
  });

  it('a clean click releases zero velocity even after a twitch', () => {
    const s = createPanSession({ x: 50, y: 50, t: 0 }, false);
    s.move({ x: 51, y: 50, t: 5 });
    expect(s.release(10)).toEqual({ vx: 0, vy: 0 });
  });
});

describe('wheel intent and units', () => {
  it('pinch (ctrl) and the command chord zoom; a plain wheel pans', () => {
    expect(wheelIntent({ ctrlKey: true, metaKey: false })).toBe('zoom');
    expect(wheelIntent({ ctrlKey: false, metaKey: true })).toBe('zoom');
    expect(wheelIntent({ ctrlKey: false, metaKey: false })).toBe('pan');
  });

  it('line and page deltas normalise to pixels', () => {
    expect(wheelPanPx(3, 1)).toBe(3 * WHEEL_LINE_PX);
    expect(wheelPanPx(120, 0)).toBe(120);
    expect(wheelPanPx(1, 2)).toBeGreaterThan(WHEEL_LINE_PX);
  });
});
