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
 * the next, so every CPU figure is a rate over one interval. The deps are
 * injected so the unit suite can prove the quiet after hide with fake
 * timers and no Electron.
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
  try {
    const report = await state.deps.finish(state.openId);
    // The subscription may have stopped, or been replaced, while the
    // finish was in flight; a dead subscription sends nothing and must
    // not reopen a window.
    if (live !== state) return;
    state.openId = state.deps.begin().id;
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
    // Reopen so the next tick still has a window to close.
    state.openId = state.deps.begin().id;
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
