/**
 * The camera flight driver (Phase 162).
 *
 * WHAT IS HELD HERE.
 *
 *  - The camera and view CONVERSIONS invert each other exactly, so a
 *    flight's rest state is the target camera and not a float neighbour.
 *  - REDUCED MOTION cuts a flight to its end state synchronously: one
 *    frame, exactly t 1, nothing scheduled. The charter's sentence made
 *    executable.
 *  - ONE MOTION, THEN STILL: frames stop at exactly 1, done fires once,
 *    cancel stops everything and swallows done because the next motion
 *    owns the ending.
 *  - The flight lands on the EXACT target object at t 1, byte for byte,
 *    which is what makes the persisted rest camera stable.
 *
 * The clock and the frame scheduler are injected, because this repository
 * runs vitest in the node environment with no DOM.
 */

import { describe, expect, it } from 'vitest';
import {
  animate,
  CAMERA_FLY_MS,
  cameraToView,
  flyCameraTo,
  flyPath,
  viewToCamera,
  type CameraState
} from '../animate';

const VIEWPORT = { width: 1200, height: 800 };

/** A hand cranked rAF: callbacks run only when the test advances time. */
function fakeScheduler(stepMs: number): {
  now(): number;
  raf(cb: () => void): number;
  caf(handle: number): void;
  run(): number;
} {
  let time = 0;
  let nextHandle = 1;
  const pending = new Map<number, () => void>();
  return {
    now: (): number => time,
    raf(cb: () => void): number {
      const handle = nextHandle;
      nextHandle += 1;
      pending.set(handle, cb);
      return handle;
    },
    caf(handle: number): void {
      pending.delete(handle);
    },
    /** Advance one frame and run what was scheduled. Returns frames run. */
    run(): number {
      time += stepMs;
      const batch = [...pending.entries()];
      pending.clear();
      for (const [, cb] of batch) cb();
      return batch.length;
    }
  };
}

describe('camera and view conversions', () => {
  it('invert each other exactly', () => {
    const cam: CameraState = { k: 2.5, x: -320, y: 148 };
    const round = viewToCamera(cameraToView(cam, VIEWPORT), VIEWPORT);
    expect(round.k).toBeCloseTo(cam.k, 12);
    expect(round.x).toBeCloseTo(cam.x, 9);
    expect(round.y).toBeCloseTo(cam.y, 9);
  });

  it('the identity camera sees the viewport itself', () => {
    const view = cameraToView({ k: 1, x: 0, y: 0 }, VIEWPORT);
    expect(view[0]).toBe(VIEWPORT.width / 2);
    expect(view[1]).toBe(VIEWPORT.height / 2);
    expect(view[2]).toBe(VIEWPORT.width);
  });
});

describe('flyPath', () => {
  const from: CameraState = { k: 1, x: 0, y: 0 };
  const to: CameraState = { k: 3, x: -900, y: -400 };

  it('starts at from and ends at to', () => {
    const path = flyPath(from, to, VIEWPORT);
    const a = path.at(0);
    const b = path.at(1);
    expect(a.k).toBeCloseTo(from.k, 9);
    expect(a.x).toBeCloseTo(from.x, 6);
    expect(a.y).toBeCloseTo(from.y, 6);
    expect(b.k).toBeCloseTo(to.k, 9);
    expect(b.x).toBeCloseTo(to.x, 6);
    expect(b.y).toBeCloseTo(to.y, 6);
  });

  it('carries the vendored duration hint', () => {
    const path = flyPath(from, to, VIEWPORT);
    expect(path.naturalMs).toBeGreaterThan(0);
    expect(Number.isFinite(path.naturalMs)).toBe(true);
  });
});

describe('animate', () => {
  it('drives t from 0 toward exactly 1 and calls done once', () => {
    const clock = fakeScheduler(50);
    const frames: number[] = [];
    let doneCount = 0;
    animate({
      durationMs: 200,
      frame: (t): void => {
        frames.push(t);
      },
      done: (): void => {
        doneCount += 1;
      },
      reduced: () => false,
      raf: clock.raf,
      caf: clock.caf,
      now: clock.now
    });
    for (let i = 0; i < 12; i += 1) clock.run();
    expect(frames.length).toBeGreaterThan(2);
    expect(frames[frames.length - 1]).toBe(1);
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]).toBeGreaterThan(frames[i - 1] as number);
    }
    expect(doneCount).toBe(1);
    expect(clock.run()).toBe(0);
  });

  it('reduced motion lands in one synchronous frame, nothing scheduled', () => {
    const clock = fakeScheduler(50);
    const frames: number[] = [];
    let done = false;
    const run = animate({
      durationMs: 200,
      frame: (t): void => {
        frames.push(t);
      },
      done: (): void => {
        done = true;
      },
      reduced: () => true,
      raf: clock.raf,
      caf: clock.caf,
      now: clock.now
    });
    expect(frames).toEqual([1]);
    expect(done).toBe(true);
    expect(run.running).toBe(false);
    expect(clock.run()).toBe(0);
  });

  it('a non positive duration is the end state too', () => {
    const frames: number[] = [];
    animate({
      durationMs: 0,
      frame: (t): void => {
        frames.push(t);
      },
      reduced: () => false
    });
    expect(frames).toEqual([1]);
  });

  it('cancel stops the frames and swallows done', () => {
    const clock = fakeScheduler(50);
    const frames: number[] = [];
    let done = false;
    const run = animate({
      durationMs: 1000,
      frame: (t): void => {
        frames.push(t);
      },
      done: (): void => {
        done = true;
      },
      reduced: () => false,
      raf: clock.raf,
      caf: clock.caf,
      now: clock.now
    });
    clock.run();
    clock.run();
    expect(run.running).toBe(true);
    run.cancel();
    expect(run.running).toBe(false);
    const before = frames.length;
    for (let i = 0; i < 5; i += 1) clock.run();
    expect(frames.length).toBe(before);
    expect(done).toBe(false);
  });
});

describe('flyCameraTo, the seam', () => {
  const from: CameraState = { k: 1, x: 0, y: 0 };
  const to: CameraState = { k: 2, x: -400, y: -200 };

  it('applies the exact target object last', () => {
    const clock = fakeScheduler(60);
    const applied: CameraState[] = [];
    flyCameraTo({
      from,
      to,
      viewport: VIEWPORT,
      apply: (cam): void => {
        applied.push(cam);
      },
      reduced: () => false,
      raf: clock.raf,
      caf: clock.caf,
      now: clock.now
    });
    for (let i = 0; i < 10; i += 1) clock.run();
    expect(applied.length).toBeGreaterThan(1);
    expect(applied[applied.length - 1]).toBe(to);
  });

  it('reduced motion applies the exact target once, synchronously', () => {
    const applied: CameraState[] = [];
    flyCameraTo({
      from,
      to,
      viewport: VIEWPORT,
      apply: (cam): void => {
        applied.push(cam);
      },
      reduced: () => true
    });
    expect(applied.length).toBe(1);
    expect(applied[0]).toBe(to);
  });

  it('defaults to the one fixed duration', () => {
    expect(CAMERA_FLY_MS).toBe(300);
    const clock = fakeScheduler(90);
    const applied: CameraState[] = [];
    flyCameraTo({
      from,
      to,
      viewport: VIEWPORT,
      apply: (cam): void => {
        applied.push(cam);
      },
      reduced: () => false,
      raf: clock.raf,
      caf: clock.caf,
      now: clock.now
    });
    clock.run();
    clock.run();
    clock.run();
    expect(applied[applied.length - 1]).not.toBe(to);
    clock.run();
    expect(applied[applied.length - 1]).toBe(to);
  });
});
