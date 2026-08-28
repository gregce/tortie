/**
 * The vendored zoom algebra (Phase 162), held executable.
 *
 * The one invariant the extract exists for: zooming about a screen point
 * keeps the world point under it exactly under it. The suite re-derives
 * that from the definitions rather than trusting the transcription, plus
 * the round trips and the clamps, and the byte stability of the attribute
 * formatter that the map's determinism leans on.
 */

import { describe, expect, it } from 'vitest';
import {
  CAMERA_IDENTITY,
  cameraApply,
  cameraInvert,
  cameraPanBy,
  cameraScale,
  cameraToSvg,
  cameraTranslate,
  cameraZoomTo,
  wheelZoomDelta,
  type Camera
} from '../transform';

const EXTENT: readonly [number, number] = [0.1, 8];

describe('the vendored transform algebra', () => {
  it('apply and invert are inverses at any camera', () => {
    const t: Camera = { k: 2.5, x: -321.5, y: 77.25 };
    const world = { x: 123.4, y: -56.7 };
    const back = cameraInvert(t, cameraApply(t, world));
    expect(back.x).toBeCloseTo(world.x, 10);
    expect(back.y).toBeCloseTo(world.y, 10);
  });

  it('THE INVARIANT: the world point under the cursor stays under the cursor', () => {
    const t: Camera = { k: 1.5, x: 40, y: -20 };
    const cursor = { x: 300, y: 200 };
    const before = cameraInvert(t, cursor);
    const zoomed = cameraZoomTo(t, 3, cursor, EXTENT);
    const after = cameraInvert(zoomed, cursor);
    expect(zoomed.k).toBe(3);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });

  it('the invariant survives the clamp: at the extent edge only the scale stops', () => {
    const t: Camera = { k: 4, x: 0, y: 0 };
    const cursor = { x: 100, y: 100 };
    const zoomed = cameraZoomTo(t, 100, cursor, EXTENT);
    expect(zoomed.k).toBe(EXTENT[1]);
    const before = cameraInvert(t, cursor);
    const after = cameraInvert(zoomed, cursor);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });

  it('scale clamps both ways and returns the same object when nothing moves', () => {
    const t: Camera = { k: 1, x: 5, y: 5 };
    expect(cameraScale(t, 0.0001, EXTENT).k).toBe(EXTENT[0]);
    expect(cameraScale(t, 1000, EXTENT).k).toBe(EXTENT[1]);
    expect(cameraScale(t, 1, EXTENT)).toBe(t);
  });

  it('translate puts the named world point under the named screen point', () => {
    const t: Camera = { k: 2, x: 0, y: 0 };
    const moved = cameraTranslate(t, { x: 50, y: 60 }, { x: 10, y: 20 });
    const where = cameraApply(moved, { x: 10, y: 20 });
    expect(where.x).toBeCloseTo(50, 10);
    expect(where.y).toBeCloseTo(60, 10);
  });

  it('panBy is screen pixels whatever the scale', () => {
    const t: Camera = { k: 4, x: 10, y: 10 };
    const moved = cameraPanBy(t, -7, 3);
    expect(moved).toEqual({ k: 4, x: 3, y: 13 });
    expect(cameraPanBy(t, 0, 0)).toBe(t);
  });

  it('the identity is the identity', () => {
    const p = { x: 12.5, y: -8 };
    expect(cameraApply(CAMERA_IDENTITY, p)).toEqual(p);
    expect(cameraInvert(CAMERA_IDENTITY, p)).toEqual(p);
  });

  it('wheel delta: pixels are fine, lines are coarser, pinch is ten times finer deltas', () => {
    const px = wheelZoomDelta({ deltaY: -100, deltaMode: 0, ctrlKey: false });
    const line = wheelZoomDelta({ deltaY: -3, deltaMode: 1, ctrlKey: false });
    const pinch = wheelZoomDelta({ deltaY: -10, deltaMode: 0, ctrlKey: true });
    expect(px).toBeCloseTo(0.2, 10);
    expect(line).toBeCloseTo(0.15, 10);
    expect(pinch).toBeCloseTo(0.2, 10);
    // Scroll away zooms out.
    expect(
      wheelZoomDelta({ deltaY: 100, deltaMode: 0, ctrlKey: false })
    ).toBeLessThan(0);
  });

  it('the attribute formatter is byte stable and short', () => {
    const t: Camera = { k: 1.234567, x: 10.008, y: -0.002 };
    expect(cameraToSvg(t)).toBe(cameraToSvg({ ...t }));
    expect(cameraToSvg(t)).toBe('translate(10.01 0) scale(1.2346)');
    // The float tail can never leak into the markup.
    expect(cameraToSvg({ k: 0.1 + 0.2, x: 0.1 + 0.2, y: 0 })).toBe(
      'translate(0.3 0) scale(0.3)'
    );
  });
});
