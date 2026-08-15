/**
 * The bounded watch (Phase 46, spec section 10.3).
 *
 * Pure, with an injected clock. Nothing here spawns, and nothing here sets a
 * timer. Every number comes from WATCH_LIMITS, so a change to the copy and a
 * change to the machine cannot drift apart.
 */

import { describe, expect, it } from 'vitest';
import type { ActionsRun, ActionsStatus } from '@shared/actions';
import {
  WATCH_LIMITS,
  type WatchState,
  arm,
  idleWatch,
  observeRuns,
  release,
  tick,
  toWatchView
} from '../watch';

const T0 = 1_700_000_000_000;
const SHA = '08b47570681d5204c4faa93b5cb1306e9d1c9ec8';
const OTHER_SHA = '2695a0fc8b2522e1cad9716f22f87e6f803d42c3';

function run(id: number, status: ActionsStatus): Pick<ActionsRun, 'id' | 'status'> {
  return { id, status };
}

/**
 * Drive the machine from `from` to `to` in one second steps, collecting the
 * commands it produced. One second is the driver's own wakeup interval.
 */
function drive(
  state: WatchState,
  from: number,
  to: number
): { state: WatchState; commands: string[] } {
  const commands: string[] = [];
  let current = state;
  for (let now = from; now <= to; now += 1_000) {
    const result = tick(current, now);
    current = result.state;
    if (result.command.kind !== 'none') commands.push(result.command.kind);
  }
  return { state: current, commands };
}

describe('discovery', () => {
  it('produces 24 discovery commands and then gives up quietly', () => {
    const armed = arm(idleWatch(), SHA, T0);
    const { state, commands } = drive(
      armed,
      T0,
      T0 + WATCH_LIMITS.DISCOVER_GIVE_UP_MS
    );
    // The first goes out at the arm, then one every five seconds, and the
    // 120 second mark stops the watch rather than producing a 25th.
    expect(commands).toHaveLength(24);
    expect(new Set(commands)).toEqual(new Set(['discover']));
    expect(state.phase).toBe('stopped');
    expect(state.stop).toBe('no-runs');
  });

  it('produces a discover command five seconds after the first', () => {
    const armed = arm(idleWatch(), SHA, T0);
    const first = tick(armed, T0);
    expect(first.command).toEqual({ kind: 'discover', sha: SHA });
    expect(tick(first.state, T0 + 4_000).command.kind).toBe('none');
    expect(tick(first.state, T0 + 5_000).command).toEqual({
      kind: 'discover',
      sha: SHA
    });
  });

  it('counts wall clock, so a machine that slept gets no extra tries', () => {
    const armed = arm(idleWatch(), SHA, T0);
    // One tick at the arm, then the machine sleeps past the give up mark.
    const first = tick(armed, T0);
    const after = tick(first.state, T0 + WATCH_LIMITS.DISCOVER_GIVE_UP_MS + 1);
    expect(after.state.phase).toBe('stopped');
    expect(after.state.stop).toBe('no-runs');
    expect(after.command.kind).toBe('none');
  });

  it('moves to watching on the third discovery and then polls', () => {
    let state = arm(idleWatch(), SHA, T0);
    let commands = 0;
    for (let now = T0; now <= T0 + 10_000; now += 1_000) {
      const result = tick(state, now);
      state = result.state;
      if (result.command.kind === 'discover') commands += 1;
    }
    expect(commands).toBe(3);

    state = observeRuns(state, [run(1, 'in_progress')], T0 + 10_000);
    expect(state.phase).toBe('watching');
    expect(state.runIds).toEqual([1]);
    expect(tick(state, T0 + 15_000).command).toEqual({ kind: 'poll', sha: SHA });
  });

  it('goes straight to complete when discovery finds a finished run', () => {
    let state = arm(idleWatch(), SHA, T0);
    state = tick(state, T0).state;
    state = observeRuns(state, [run(1, 'completed')], T0);
    expect(state.phase).toBe('stopped');
    expect(state.stop).toBe('complete');
  });
});

describe('polling', () => {
  function watching(): WatchState {
    let state = arm(idleWatch(), SHA, T0);
    state = tick(state, T0).state;
    return observeRuns(state, [run(1, 'in_progress'), run(2, 'queued')], T0);
  }

  it('stops with complete on the tick where every run is completed', () => {
    let state = watching();
    state = observeRuns(state, [run(1, 'completed'), run(2, 'in_progress')], T0);
    expect(state.phase).toBe('watching');
    state = observeRuns(state, [run(1, 'completed'), run(2, 'completed')], T0);
    expect(state.phase).toBe('stopped');
    expect(state.stop).toBe('complete');
  });

  it('is still polling one second before the cap and stopped at it', () => {
    const state = watching();
    const justBefore = tick(state, T0 + WATCH_LIMITS.HARD_CAP_MS - 1_000);
    expect(justBefore.command.kind).toBe('poll');
    expect(justBefore.state.phase).toBe('watching');

    const atCap = tick(justBefore.state, T0 + WATCH_LIMITS.HARD_CAP_MS);
    expect(atCap.state.phase).toBe('stopped');
    expect(atCap.state.stop).toBe('cap');
    expect(atCap.command.kind).toBe('none');
  });

  it('treats a word it does not know as incomplete, so the cap ends it', () => {
    // Dropping to complete on an unknown word would report a finish that did
    // not happen.
    let state = watching();
    state = observeRuns(state, [run(1, 'unknown'), run(2, 'completed')], T0);
    expect(state.phase).toBe('watching');
    const atCap = tick(state, T0 + WATCH_LIMITS.HARD_CAP_MS);
    expect(atCap.state.stop).toBe('cap');
  });
});

describe('arming again, and releasing', () => {
  it('a new sha while watching resets both clocks and rediscovers', () => {
    let state = arm(idleWatch(), SHA, T0);
    state = tick(state, T0).state;
    state = observeRuns(state, [run(1, 'in_progress')], T0);
    expect(state.phase).toBe('watching');

    const later = T0 + 600_000;
    state = arm(state, OTHER_SHA, later);
    expect(state.phase).toBe('discovering');
    expect(state.sha).toBe(OTHER_SHA);
    expect(state.armedAt).toBe(later);
    expect(state.runIds).toEqual([]);
    expect(tick(state, later).command).toEqual({
      kind: 'discover',
      sha: OTHER_SHA
    });
  });

  it('arming from stopped behaves the same as arming from watching', () => {
    const stopped = release(arm(idleWatch(), SHA, T0));
    const rearmed = arm(stopped, OTHER_SHA, T0 + 1_000);
    expect(rearmed.phase).toBe('discovering');
    expect(rearmed.stop).toBeNull();
    expect(rearmed.armedAt).toBe(T0 + 1_000);
  });

  it('release lands on stopped from every state', () => {
    const idle = idleWatch();
    const discovering = arm(idle, SHA, T0);
    const watching = observeRuns(
      tick(discovering, T0).state,
      [run(1, 'in_progress')],
      T0
    );
    const stopped = tick(discovering, T0 + WATCH_LIMITS.DISCOVER_GIVE_UP_MS).state;

    for (const state of [idle, discovering, watching, stopped]) {
      const released = release(state);
      expect(released.phase).toBe('stopped');
      expect(released.stop).toBe('released');
      expect(tick(released, T0 + 5_000).command.kind).toBe('none');
    }
  });

  it('an idle machine produces nothing at all', () => {
    const { commands } = drive(idleWatch(), T0, T0 + 60_000);
    expect(commands).toEqual([]);
  });
});

describe('the view the panel draws', () => {
  it('carries the phase, the sha and the reason it stopped', () => {
    expect(toWatchView(idleWatch())).toEqual({
      phase: 'idle',
      sha: null,
      stop: null
    });
    expect(toWatchView(arm(idleWatch(), SHA, T0))).toEqual({
      phase: 'discovering',
      sha: SHA,
      stop: null
    });
    expect(toWatchView(release(arm(idleWatch(), SHA, T0)))).toEqual({
      phase: 'stopped',
      sha: SHA,
      stop: 'released'
    });
  });
});
