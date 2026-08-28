/**
 * The inertial release (Phase 162), hand written per research 68 section 7:
 * a pan let go at speed glides on and decays at the Apple deceleration
 * family, about 0.998 per millisecond. No package, no easing library, just
 * velocity and decay, and the whole thing is driven through an injectable
 * clock so the test suite can run it without a display.
 *
 * Shape: `trackVelocity` samples the pointer while a pan is live and
 * answers the release velocity from the last VELOCITY_WINDOW_MS of motion,
 * so a drag that STOPPED before release glides nowhere. `startGlide` then
 * advances the camera by `v * dt` each frame while `v` decays by
 * `GLIDE_DECAY ** dt`, and rests once the speed falls under
 * GLIDE_STOP_SPEED. The caller applies each step and hears `done` exactly
 * once, at rest or at cancel.
 */

/** Velocity decay per millisecond. 0.998 is the Apple deceleration family:
 *  speed halves about every 347 ms. */
export const GLIDE_DECAY = 0.998;
/** The glide rests below this speed, in screen pixels per millisecond. */
export const GLIDE_STOP_SPEED = 0.01;
/** Release speed is capped here, px/ms, so a wild flick stays on the map. */
export const GLIDE_MAX_SPEED = 4;
/** Only the last this-many milliseconds of a drag decide release velocity. */
export const VELOCITY_WINDOW_MS = 100;

/** The clock and frame source, injectable so tests need no display. */
export interface GlideDriver {
  now(): number;
  raf(cb: () => void): number;
  caf(id: number): void;
}

export interface Velocity {
  vx: number;
  vy: number;
}

interface Sample {
  x: number;
  y: number;
  t: number;
}

/** Samples a live pointer and answers the velocity at release. */
export interface VelocityTracker {
  push(x: number, y: number, t: number): void;
  /** Velocity over the last window, capped, or zero when the pointer sat
   *  still past the window's end. */
  release(t: number): Velocity;
}

export function trackVelocity(): VelocityTracker {
  const samples: Sample[] = [];
  return {
    push(x, y, t) {
      samples.push({ x, y, t });
      // Keep only the window plus one sample before it, so the oldest kept
      // sample brackets the window edge.
      while (samples.length > 2) {
        const second = samples[1];
        if (second === undefined || t - second.t <= VELOCITY_WINDOW_MS) break;
        samples.shift();
      }
    },
    release(t) {
      const recent = samples.filter((s) => t - s.t <= VELOCITY_WINDOW_MS);
      const first = recent[0];
      const last = recent[recent.length - 1];
      if (first === undefined || last === undefined || last.t <= first.t) {
        return { vx: 0, vy: 0 };
      }
      const dt = last.t - first.t;
      let vx = (last.x - first.x) / dt;
      let vy = (last.y - first.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > GLIDE_MAX_SPEED) {
        vx *= GLIDE_MAX_SPEED / speed;
        vy *= GLIDE_MAX_SPEED / speed;
      }
      return { vx, vy };
    }
  };
}

/**
 * Run one glide. `apply` receives each frame's pixel delta; `done` fires
 * once, when the glide rests OR when the returned cancel is called (a new
 * press interrupts the glide, and the camera must still settle and save).
 * A release under the stop speed rests immediately.
 */
export function startGlide(
  v0: Velocity,
  apply: (dx: number, dy: number) => void,
  done: () => void,
  driver: GlideDriver
): () => void {
  let vx = v0.vx;
  let vy = v0.vy;
  let last = driver.now();
  let id = 0;
  let ended = false;
  const end = (): void => {
    if (ended) return;
    ended = true;
    driver.caf(id);
    done();
  };
  const frame = (): void => {
    if (ended) return;
    const t = driver.now();
    const dt = Math.max(0, t - last);
    last = t;
    apply(vx * dt, vy * dt);
    const decay = GLIDE_DECAY ** dt;
    vx *= decay;
    vy *= decay;
    if (Math.hypot(vx, vy) < GLIDE_STOP_SPEED) {
      end();
      return;
    }
    id = driver.raf(frame);
  };
  if (Math.hypot(vx, vy) < GLIDE_STOP_SPEED) {
    end();
  } else {
    id = driver.raf(frame);
  }
  return end;
}

/** The real driver, split out so the tests can hand in a fake one. */
export function displayGlideDriver(): GlideDriver {
  return {
    now: () => performance.now(),
    raf: (cb) => requestAnimationFrame(cb),
    caf: (id) => cancelAnimationFrame(id)
  };
}
