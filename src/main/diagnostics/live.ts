/**
 * Live sampling (Phase 170): a timer that exists only while a visible
 * diagnostics tab holds a subscription, and not one tick longer.
 *
 * The operator overrode the one capture stance himself on 2026-08-30, and
 * the ruling this module keeps is exact: sampling runs WHILE THE TAB IS
 * VISIBLE and goes completely quiet the instant it is hidden or closed.
 * The mechanics that keep that true by shape rather than by discipline:
 *
 *  - Nothing in this module runs at import, at app start or on any event.
 *    The ONE way a timer comes to exist is `startLiveSampling`, which only
 *    the `diagnostics:liveStart` handler calls, and that handler refuses
 *    when the renderer says the tab is not visible.
 *  - `stopLiveSampling` clears the interval, unhooks the destroyed watcher,
 *    closes the subscription's instrument (the streaming `top` in
 *    ./top-stream.ts, ended with a synchronous SIGKILL) and forgets the
 *    subscription, and it is called from three directions: the renderer's
 *    own `diagnostics:liveStop` (hide, pause, unmount), the subscribing
 *    window being destroyed, and a replacement start.
 *  - A tick that is still running when the next one is due makes the next
 *    one skip rather than stack, and three consecutive failed ticks stop
 *    the loop entirely, so a wedged capture cannot become a background
 *    drain nobody asked for.
 *
 * Each tick closes the capture window the previous tick opened and opens
 * the next ON THE SAME BOUNDARY, so every CPU figure is a rate over one
 * interval and the window the header prints IS the interval. See the note
 * inside `runTick`: opening it after the finish RESOLVED, which is what
 * Phase 170 shipped, put the boundary on the streaming `top`'s clock rather
 * than on this timer's and made the printed window slide every tick. The
 * deps are injected so the unit suite can prove the quiet after hide with
 * fake timers and no Electron.
 */

import type { DiagnosticsLiveSample, DiagnosticsReport } from '@shared/ipc';
import { DIAGNOSTICS_LIVE_INTERVAL_MS } from '@shared/ipc';

export interface LiveSamplingDeps {
  /** Open a capture window; the next tick closes it. */
  begin(): { id: string };
  /** Close the window `id` names and build the report. */
  finish(id: string): Promise<DiagnosticsReport>;
  /** Deliver one sample to the subscriber. */
  send(sample: DiagnosticsLiveSample): void;
  /**
   * Arm a call for the moment the subscriber is gone (window destroyed).
   * Answers the disarm, called on stop so a stopped watch holds nothing.
   */
  onGone(cb: () => void): () => void;
  /**
   * End whatever instrument the subscription holds open, being the
   * streaming top. Called exactly once, from stop, on every path that
   * ends the subscription. Optional so a harness with no instrument can
   * leave it out.
   */
  close?(): void;
  intervalMs?: number;
}

interface LiveState {
  deps: LiveSamplingDeps;
  intervalMs: number;
  timer: ReturnType<typeof setInterval>;
  disarmGone: () => void;
  openId: string;
  tick: number;
  inFlight: boolean;
  failures: number;
}

let live: LiveState | null = null;

/** How many consecutive failed ticks stop the loop. */
export const LIVE_FAILURE_LIMIT = 3;

async function runTick(state: LiveState): Promise<void> {
  if (state.inFlight) return;
  state.inFlight = true;
  // Whether the next window is already open, so the failure path below does
  // not open a second one.
  let reopened = false;
  try {
    // THE NEXT WINDOW OPENS ON THE TICK BOUNDARY, NOT WHEN THE FINISH LANDS
    // (Phase 219). `finish` is invoked here and AWAITED three lines down, and
    // the order is the whole fix. `finishCapture` reads its `now`, keeps the
    // open window's `startedAt` and sets the module's `open` back to null in
    // its SYNCHRONOUS prefix, before its first await, so by the time it has
    // handed back a promise the window this tick closes is already closed and
    // the next `begin` can have the boundary instant for its own `startedAt`.
    //
    // Awaiting first is what the Phase 170 verifier reported. The promise
    // `finish` returns is resolved by the streaming `top`'s NEXT BLOCK, which
    // runs on its own two second clock and not on this timer's, so the window
    // opened after it began at the block rather than at the tick: the header's
    // number read `interval minus the wait for that block`, it slid by the
    // difference between the two clocks every tick, and it wrapped when the
    // drift passed one whole block. Driven on a virtual clock with `top` 0.4
    // percent slow it printed 3863, 3855, 3847 and on down to 1799 before
    // wrapping, and never the 2000 ms it was labelled with.
    //
    // The window may now be opened for a subscription that stops while the
    // finish is in flight. That is the same one boolean and two integers
    // `stopLiveSampling` already documents as the residue of an abandoned
    // capture, and the next `begin` replaces it.
    const pending = state.deps.finish(state.openId);
    state.openId = state.deps.begin().id;
    reopened = true;
    const report = await pending;
    // The subscription may have stopped, or been replaced, while the
    // finish was in flight; a dead subscription sends nothing.
    if (live !== state) return;
    state.tick += 1;
    state.failures = 0;
    state.deps.send({
      report,
      intervalMs: state.intervalMs,
      tick: state.tick
    });
  } catch {
    if (live !== state) return;
    state.failures += 1;
    if (state.failures >= LIVE_FAILURE_LIMIT) {
      stopLiveSampling();
      return;
    }
    // Reopen so the next tick still has a window to close, unless the line
    // above already did it.
    if (!reopened) state.openId = state.deps.begin().id;
  } finally {
    state.inFlight = false;
  }
}

/**
 * Start sampling for one subscriber. A second start replaces the first,
 * so there is never more than one timer whatever the renderer does.
 * The caller (the ipc registrar) is responsible for refusing a start
 * whose tab is not visible; this module never sees an invisible start.
 */
export function startLiveSampling(deps: LiveSamplingDeps): {
  intervalMs: number;
} {
  stopLiveSampling();
  const intervalMs = deps.intervalMs ?? DIAGNOSTICS_LIVE_INTERVAL_MS;
  const state: LiveState = {
    deps,
    intervalMs,
    timer: setInterval(() => {
      void runTick(state);
    }, intervalMs),
    disarmGone: () => undefined,
    openId: deps.begin().id,
    tick: 0,
    inFlight: false,
    failures: 0
  };
  state.disarmGone = deps.onGone(() => {
    if (live === state) stopLiveSampling();
  });
  live = state;
  return { intervalMs };
}

/**
 * Stop sampling and forget the subscriber. Idempotent. After this returns
 * there is no timer, no destroyed watcher, no instrument child and no
 * reference to the sender;
 * the capture window the loop had open is left to be replaced by the next
 * begin, which is one boolean and two integers, the same residue an
 * abandoned manual capture leaves.
 */
export function stopLiveSampling(): void {
  if (live === null) return;
  const ending = live;
  live = null;
  clearInterval(ending.timer);
  ending.disarmGone();
  try {
    ending.deps.close?.();
  } catch {
    /* an instrument that fails to close is already not our timer */
  }
}

/** True while a subscription holds the timer. Tests and the harness. */
export function liveSamplingActive(): boolean {
  return live !== null;
}

/** 0 or 1, so the quiet proof can count rather than trust. */
export function liveTimerCount(): number {
  return live === null ? 0 : 1;
}
