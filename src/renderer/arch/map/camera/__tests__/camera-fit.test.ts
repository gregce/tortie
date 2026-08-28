/**
 * The camera's map arithmetic (Phase 162): the fit that reproduces the
 * Phase 161 `meet` picture, the frame for F and Shift+2, the leash that
 * keeps the picture on screen, and the scale extent that can always reach
 * the fit.
 */

import { describe, expect, it } from 'vitest';
import {
  CAMERA_FRAME_MAX_K,
  CAMERA_KEEP_PX,
  CAMERA_MAX_K,
  CAMERA_MIN_K,
  MAP_MAX_UPSCALE,
  cameraScaleExtent,
  clampCamera,
  fitCamera,
  frameCamera
} from '../../geometry';
import { cameraApply } from '../transform';

const VP = { width: 1200, height: 800 };

describe('fitCamera reproduces the meet picture', () => {
  it('a large layout scales down to fit and centres on the loose axis', () => {
    const layout = { width: 2400, height: 800 };
    const fit = fitCamera(layout, VP);
    // Width binds: k = 1200/2400.
    expect(fit.k).toBe(0.5);
    expect(fit.x).toBe(0);
    // Height centres: (800 - 800*0.5) / 2.
    expect(fit.y).toBe(200);
    // The far corner lands inside the viewport.
    const corner = cameraApply(fit, { x: 2400, y: 800 });
    expect(corner.x).toBeLessThanOrEqual(VP.width);
    expect(corner.y).toBeLessThanOrEqual(VP.height);
  });

  it('a small layout upscales at most MAP_MAX_UPSCALE, the billboard bound', () => {
    const fit = fitCamera({ width: 100, height: 80 }, VP);
    expect(fit.k).toBe(MAP_MAX_UPSCALE);
    // Centred both ways.
    expect(fit.x).toBe((VP.width - 100 * MAP_MAX_UPSCALE) / 2);
    expect(fit.y).toBe((VP.height - 80 * MAP_MAX_UPSCALE) / 2);
  });

  it('is deterministic: same inputs, same camera', () => {
    const layout = { width: 1536, height: 1024 };
    expect(fitCamera(layout, VP)).toEqual(fitCamera(layout, VP));
  });
});

describe('the scale extent', () => {
  it('holds the named floor and ceiling for an ordinary layout', () => {
    expect(cameraScaleExtent({ width: 1000, height: 700 }, VP)).toEqual([
      CAMERA_MIN_K,
      CAMERA_MAX_K
    ]);
  });

  it('drops its floor to the fit when the picture is enormous', () => {
    const huge = { width: 100000, height: 700 };
    const [lo, hi] = cameraScaleExtent(huge, VP);
    expect(lo).toBe(fitCamera(huge, VP).k);
    expect(lo).toBeLessThan(CAMERA_MIN_K);
    expect(hi).toBe(CAMERA_MAX_K);
  });
});

describe('frameCamera, the F and Shift+2 target', () => {
  const LAYOUT = { width: 2000, height: 1500 };

  it('centres the rectangle in the viewport', () => {
    const rect = { x: 400, y: 300, w: 200, h: 100 };
    const cam = frameCamera(rect, LAYOUT, VP);
    const centre = cameraApply(cam, {
      x: rect.x + rect.w / 2,
      y: rect.y + rect.h / 2
    });
    expect(centre.x).toBeCloseTo(VP.width / 2, 8);
    expect(centre.y).toBeCloseTo(VP.height / 2, 8);
  });

  it('never zooms a small box past the frame cap', () => {
    const cam = frameCamera({ x: 0, y: 0, w: 10, h: 10 }, LAYOUT, VP);
    expect(cam.k).toBe(CAMERA_FRAME_MAX_K);
  });

  it('a huge rectangle frames out to what the viewport can hold', () => {
    const cam = frameCamera({ x: 0, y: 0, w: 4000, h: 100 }, LAYOUT, VP);
    expect(cam.k).toBeLessThan(1);
    expect(cam.k).toBeGreaterThan(0);
  });
});

describe('clampCamera, the leash', () => {
  const LAYOUT = { width: 1000, height: 700 };

  it('a camera already on screen passes through untouched, same object', () => {
    const cam = { k: 1, x: 50, y: 50 };
    expect(clampCamera(cam, LAYOUT, VP)).toBe(cam);
  });

  it('a pan far off to the right keeps the last strip visible', () => {
    const cam = clampCamera({ k: 1, x: 999999, y: 0 }, LAYOUT, VP);
    // The picture's left edge sits at viewport width minus the keep.
    expect(cam.x).toBe(VP.width - CAMERA_KEEP_PX);
  });

  it('a pan far off to the top left keeps the far corner strip visible', () => {
    const cam = clampCamera({ k: 2, x: -999999, y: -999999 }, LAYOUT, VP);
    expect(cam.x).toBe(CAMERA_KEEP_PX - LAYOUT.width * 2);
    expect(cam.y).toBe(CAMERA_KEEP_PX - LAYOUT.height * 2);
  });

  it('a picture smaller than the keep distance is kept whole', () => {
    const tiny = { width: 20, height: 20 };
    const cam = clampCamera({ k: 1, x: 999999, y: 999999 }, tiny, VP);
    // keep collapses to the drawn size: the whole picture stays inside.
    expect(cam.x).toBe(VP.width - 20);
    expect(cam.y).toBe(VP.height - 20);
  });

  it('the fit camera is always inside its own leash', () => {
    for (const layout of [
      { width: 100, height: 100 },
      { width: 5000, height: 400 },
      { width: 900, height: 3000 }
    ]) {
      const fit = fitCamera(layout, VP);
      expect(clampCamera(fit, layout, VP)).toBe(fit);
    }
  });
});
