/**
 * Unit tests for src/main/diagnostics/live.ts (Phase 170).
 *
 * The ruling under test is the operator's own: sampling runs only while
 * the tab is visible, and goes completely quiet the instant it is hidden
 * or closed. The proof here is counted with fake timers rather than
 * trusted: after a stop, zero timers exist and zero further sends happen
 * however far the clock is driven.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import type { DiagnosticsLiveSample, DiagnosticsReport } from '@shared/ipc';
import {
  LIVE_FAILURE_LIMIT,
  liveSamplingActive,
  liveTimerCount,
  startLiveSampling,
  stopLiveSampling,
  type LiveSamplingDeps
} from '../live';

const REPORT = { generatedAt: 'x' } as unknown as DiagnosticsReport;

interface Harness {
  deps: LiveSamplingDeps;
  begins: number;
  finished: string[];
  sent: DiagnosticsLiveSample[];
  goneCallbacks: (() => void)[];
  disarmed: number;
  /** How many times the instrument was closed (the fix round's stream). */
  closed: number;
  failFinish: boolean;
}

function makeHarness(intervalMs = 100): Harness {
  const h: Harness = {
    begins: 0,
    finished: [],
    sent: [],
    goneCallbacks: [],
    disarmed: 0,
    closed: 0,
    failFinish: false,
    deps: undefined as unknown as LiveSamplingDeps
  };
  h.deps = {
    begin: () => {
      h.begins += 1;
      return { id: `w${h.begins}` };
    },
    finish: (id) => {
      h.finished.push(id);
      return h.failFinish
        ? Promise.reject(new Error('wedged'))
        : Promise.resolve(REPORT);
    },
    send: (sample) => {
      h.sent.push(sample);
    },
    onGone: (cb) => {
      h.goneCallbacks.push(cb);
      return () => {
        h.disarmed += 1;
      };
    },
    close: () => {
      h.closed += 1;
    },
    intervalMs
  };
  return h;
}

/** Let the promise chain inside a tick settle under fake timers. */
async function settle(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

describe('live sampling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopLiveSampling();
    vi.useRealTimers();
  });

  it('arms nothing at import and nothing before a start', () => {
    assert.equal(liveTimerCount(), 0);
    assert.equal(liveSamplingActive(), false);
    assert.equal(vi.getTimerCount(), 0);
  });

  it('opens a window at start and samples once per interval', async () => {
    const h = makeHarness(100);
    const { intervalMs } = startLiveSampling(h.deps);
    assert.equal(intervalMs, 100);
    assert.equal(h.begins, 1);
    assert.equal(liveTimerCount(), 1);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    assert.equal(h.finished.length, 1);
    assert.equal(h.finished[0], 'w1');
    assert.equal(h.sent.length, 1);

    await vi.advanceTimersByTimeAsync(100);
    await settle();
    assert.equal(h.sent.length, 2);
    // Each tick closes the previous window and opens the next.
    assert.deepEqual(h.finished, ['w1', 'w2']);
  });

  it('states the interval and a rising tick in every payload', async () => {
    const h = makeHarness(250);
    startLiveSampling(h.deps);
    await vi.advanceTimersByTimeAsync(500);
    await settle();
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent[0]?.intervalMs, 250);
    assert.equal(h.sent[0]?.tick, 1);
    assert.equal(h.sent[1]?.tick, 2);
    assert.equal(h.sent[0]?.report, REPORT);
  });

  it('IS COMPLETELY QUIET AFTER A STOP, counted rather than trusted', async () => {
    const h = makeHarness(100);
    startLiveSampling(h.deps);
    await vi.advanceTimersByTimeAsync(300);
    await settle();
    const sentBefore = h.sent.length;
    const finishedBefore = h.finished.length;

    stopLiveSampling();
    assert.equal(liveTimerCount(), 0);
    assert.equal(liveSamplingActive(), false);
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(h.disarmed, 1);
    // The instrument went with it, once.
    assert.equal(h.closed, 1);
    stopLiveSampling();
    assert.equal(h.closed, 1);

    // Ten hides' worth of clock: not one more finish, send or begin.
    const beginsBefore = h.begins;
    await vi.advanceTimersByTimeAsync(10_000);
    await settle();
    assert.equal(h.sent.length, sentBefore);
    assert.equal(h.finished.length, finishedBefore);
    assert.equal(h.begins, beginsBefore);
  });

  it('stop is idempotent and safe with nothing running', () => {
    stopLiveSampling();
    stopLiveSampling();
    assert.equal(liveTimerCount(), 0);
  });

  it('a close that throws still leaves the timer down', async () => {
    const h = makeHarness(100);
    h.deps.close = () => {
      throw new Error('instrument already gone');
    };
    startLiveSampling(h.deps);
    stopLiveSampling();
    assert.equal(liveTimerCount(), 0);
    assert.equal(vi.getTimerCount(), 0);
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    assert.equal(h.sent.length, 0);
  });

  it('stops when the subscriber is gone (window destroyed)', async () => {
    const h = makeHarness(100);
    startLiveSampling(h.deps);
    assert.equal(h.goneCallbacks.length, 1);
    h.goneCallbacks[0]?.();
    assert.equal(liveTimerCount(), 0);
    assert.equal(h.closed, 1);
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    assert.equal(h.sent.length, 0);
  });

  it('a second start replaces the first: one timer, ever', async () => {
    const first = makeHarness(100);
    const second = makeHarness(100);
    startLiveSampling(first.deps);
    startLiveSampling(second.deps);
    assert.equal(liveTimerCount(), 1);
    assert.equal(vi.getTimerCount(), 1);
    assert.equal(first.disarmed, 1);
    assert.equal(first.closed, 1);
    assert.equal(second.closed, 0);
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    assert.equal(first.sent.length, 0);
    assert.equal(second.sent.length, 1);
  });

  it('a tick still in flight makes the next one skip, not stack', async () => {
    const h = makeHarness(100);
    const releases: (() => void)[] = [];
    h.deps.finish = (id) => {
      h.finished.push(id);
      return new Promise((resolve) => {
        releases.push(() => resolve(REPORT));
      });
    };
    startLiveSampling(h.deps);
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    assert.equal(h.finished.length, 1);
    // Three more intervals while the first finish hangs: no new finishes.
    await vi.advanceTimersByTimeAsync(300);
    await settle();
    assert.equal(h.finished.length, 1);
    releases[0]?.();
    await settle();
    assert.equal(h.sent.length, 1);
  });

  it('three consecutive failed ticks stop the loop entirely', async () => {
    const h = makeHarness(100);
    h.failFinish = true;
    startLiveSampling(h.deps);
    for (let i = 0; i < LIVE_FAILURE_LIMIT; i += 1) {
      await vi.advanceTimersByTimeAsync(100);
      await settle();
    }
    assert.equal(liveTimerCount(), 0);
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(h.sent.length, 0);
    assert.equal(h.closed, 1);
    // And it stays quiet.
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    assert.equal(h.finished.length, LIVE_FAILURE_LIMIT);
  });

  it('a failure that recovers keeps sampling without a stop', async () => {
    const h = makeHarness(100);
    h.failFinish = true;
    startLiveSampling(h.deps);
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    h.failFinish = false;
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    assert.equal(liveTimerCount(), 1);
    assert.equal(h.sent.length, 1);
  });
});
