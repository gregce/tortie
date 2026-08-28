/**
 * The inertial release (Phase 162), run on a fake clock so the suite needs
 * no display. The decay curve is checked against its own closed form, not
 * against the loop that produced it: at v(t) = v0 * DECAY^t the total glide
 * distance is v0 / -ln(DECAY), and the simulated glide must land within a
 * frame's worth of that.
 */

import { describe, expect, it } from 'vitest';
import {
  GLIDE_DECAY,
  GLIDE_MAX_SPEED,
  GLIDE_STOP_SPEED,
  startGlide,
  trackVelocity,
  VELOCITY_WINDOW_MS,
  type GlideDriver
} from '../inertia';

/** A hand cranked 120 Hz clock: every raf advances one 8.33 ms frame. */
function fakeDriver(): GlideDriver & { run(maxFrames?: number): number } {
  let t = 0;
  let pending: (() => void) | null = null;
  let cancelled = false;
  return {
    now: () => t,
    raf(cb) {
      pending = cb;
      cancelled = false;
      return 1;
    },
    caf() {
      cancelled = true;
    },
    run(maxFrames = 100000) {
      let frames = 0;
      while (pending !== null && !cancelled && frames < maxFrames) {
        const cb = pending;
        pending = null;
        t += 25 / 3;
        cb();
        frames += 1;
      }
      return frames;
    }
  };
}

describe('the velocity tracker', () => {
  it('reads velocity from the last window only', () => {
    const tracker = trackVelocity();
    // A long slow drag, then a fast finish.
    for (let t = 0; t <= 400; t += 20) tracker.push(t * 0.1, 0, t);
    for (let t = 420; t <= 500; t += 20) tracker.push(40 + (t - 400) * 2, 0, t);
    const v = tracker.release(500);
    expect(v.vx).toBeCloseTo(2, 5);
    expect(v.vy).toBe(0);
  });

  it('a drag that stopped moving before release glides nowhere', () => {
    const tracker = trackVelocity();
    tracker.push(0, 0, 0);
    tracker.push(300, 0, 100);
    // The hand then sits still past the whole window.
    const v = tracker.release(100 + VELOCITY_WINDOW_MS + 50);
    expect(v).toEqual({ vx: 0, vy: 0 });
  });

  it('a wild flick is capped at the named maximum speed', () => {
    const tracker = trackVelocity();
    tracker.push(0, 0, 0);
    tracker.push(9000, 0, 50);
    const v = tracker.release(50);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(GLIDE_MAX_SPEED, 10);
  });
});

describe('the glide', () => {
  it('total distance matches the closed form of the decay family', () => {
    const driver = fakeDriver();
    let distance = 0;
    let done = 0;
    startGlide(
      { vx: 1.5, vy: 0 },
      (dx) => {
        distance += dx;
      },
      () => {
        done += 1;
      },
      driver
    );
    driver.run();
    expect(done).toBe(1);
    // v0 / -ln(decay): 1.5 / -ln(0.998) = 749.2 px, within one frame's px.
    const closedForm = 1.5 / -Math.log(GLIDE_DECAY);
    expect(Math.abs(distance - closedForm)).toBeLessThan(1.5 * (25 / 3) + 6);
  });

  it('rests below the stop speed rather than crawling forever', () => {
    const driver = fakeDriver();
    let done = false;
    startGlide(
      { vx: 1, vy: 1 },
      () => undefined,
      () => {
        done = true;
      },
      driver
    );
    const frames = driver.run();
    expect(done).toBe(true);
    // Time to decay from |v|=sqrt(2) to the stop speed, in 8.33 ms frames.
    const restMs =
      Math.log(GLIDE_STOP_SPEED / Math.SQRT2) / Math.log(GLIDE_DECAY);
    expect(frames).toBeLessThan(restMs / (25 / 3) + 3);
  });

  it('a release under the stop speed settles immediately, zero frames', () => {
    const driver = fakeDriver();
    let applied = 0;
    let done = false;
    startGlide(
      { vx: 0.001, vy: 0 },
      () => {
        applied += 1;
      },
      () => {
        done = true;
      },
      driver
    );
    expect(done).toBe(true);
    expect(applied).toBe(0);
    expect(driver.run()).toBe(0);
  });

  it('cancel stops the frames and still reports done exactly once', () => {
    const driver = fakeDriver();
    let done = 0;
    const cancel = startGlide(
      { vx: 2, vy: 0 },
      () => undefined,
      () => {
        done += 1;
      },
      driver
    );
    driver.run(5);
    cancel();
    cancel();
    driver.run();
    expect(done).toBe(1);
  });
});
