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
import { readFile } from 'node:fs/promises';
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

/**
 * Phase 219, item 5. THE WINDOW THE HEADER PRINTS IS THE INTERVAL.
 *
 * The Phase 170 verifier reported that the live capture window shrinks tick by
 * tick and then resets. The cause is the ORDER inside one tick: the loop
 * awaited the finish and only then opened the next window, and the promise the
 * finish returns is resolved by the streaming `top`'s next block, which runs on
 * its own two second clock. So the window opened at the block rather than at
 * the tick, and the printed number was `interval minus the wait for that
 * block`, sliding by the difference between the two clocks every tick and
 * wrapping when the drift passed a whole block.
 *
 * This drives the SHIPPING loop over a model of exactly that world: a virtual
 * clock, a `finish` that reads its `now` synchronously the way `finishCapture`
 * does and resolves only at the stream's next block, and a `top` whose period
 * is 0.4 percent longer than the timer's. Nothing here launches an Electron,
 * spawns a process or opens a file.
 */
describe('Phase 219: the live capture window is the interval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    stopLiveSampling();
    vi.useRealTimers();
  });

  interface WindowHarness {
    deps: LiveSamplingDeps;
    /** What each tick's report says its window was, in order. */
    windows: number[];
    /** The virtual instant `begin` was called at, per window. */
    beganAt: number[];
    /** The virtual instant `finish` was invoked at, per tick. */
    finishedAt: number[];
  }

  function windowHarness(intervalMs: number, streamPeriodMs: number): WindowHarness {
    const startedAt = new Map<string, number>();
    const h: WindowHarness = {
      windows: [],
      beganAt: [],
      finishedAt: [],
      deps: undefined as unknown as LiveSamplingDeps
    };
    let opened = 0;
    let openId: string | null = null;
    h.deps = {
      begin: () => {
        opened += 1;
        const id = `w${opened}`;
        startedAt.set(id, Date.now());
        h.beganAt.push(Date.now());
        openId = id;
        return { id };
      },
      // The shape of `finishCapture`: `now` and the window are read in the
      // SYNCHRONOUS prefix and the slot is released there, and only the rest
      // of the report waits for the stream.
      finish: (id) => {
        const now = Date.now();
        h.finishedAt.push(now);
        const windowMs = now - (startedAt.get(id) ?? now);
        // The slot is released here, before the promise is handed back, which
        // is what lets the loop open the next window on this instant.
        if (openId === id) openId = null;
        const wait = streamPeriodMs - (now % streamPeriodMs);
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ windowMs } as unknown as DiagnosticsReport);
          }, wait === 0 ? streamPeriodMs : wait);
        });
      },
      send: (sample) => {
        h.windows.push((sample.report as unknown as { windowMs: number }).windowMs);
      },
      onGone: () => () => undefined,
      intervalMs
    };
    return h;
  }

  it('every tick reports the interval, not the interval minus a stream wait', async () => {
    const interval = 2_000;
    // THE CLOCK IS PINNED, because the fake clock otherwise starts at the real
    // Date.now() and the harness waits `2008 - (now % 2008)` for its block.
    // With the start residue in [8, 104) of 2008, one block lands AFTER the
    // next tick, that tick is skipped as in flight, and the window after it
    // reads 4000: measured at 2 of 30 runs on 2026-09-12, at residue 50 tick
    // 7 read 4000 on every run, and at residue 500 none did. From 0 the wait
    // is 8k at tick k, which is the 0.4 percent slow stream this harness
    // models and never a block past a tick boundary.
    vi.setSystemTime(0);
    const h = windowHarness(interval, 2_008);
    startLiveSampling(h.deps);
    for (let i = 0; i < 12; i += 1) {
      await vi.advanceTimersByTimeAsync(interval);
      await settle();
    }
    assert.ok(h.windows.length >= 10, `only ${String(h.windows.length)} ticks reported`);
    // AT THE PARENT this reads 1992, 1984, 1976 ... and wraps.
    for (const [at, windowMs] of h.windows.entries()) {
      assert.equal(
        windowMs,
        interval,
        `tick ${String(at + 1)} reported a ${String(windowMs)} ms window rather than ${String(interval)}: ${JSON.stringify(h.windows)}`
      );
    }
    // AND IT DOES NOT SLIDE, which is the shape the operator would see even if
    // one tick happened to read right.
    assert.equal(new Set(h.windows).size, 1, JSON.stringify(h.windows));
  });

  it('the next window opens on the tick boundary, not when the finish lands', async () => {
    const h = windowHarness(2_000, 2_008);
    startLiveSampling(h.deps);
    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(2_000);
      await settle();
    }
    // beganAt[0] is the start's own window. Every later one must sit exactly
    // on the instant the finish before it was invoked.
    for (const [at, when] of h.finishedAt.entries()) {
      assert.equal(
        h.beganAt[at + 1],
        when,
        `window ${String(at + 2)} opened at ${String(h.beganAt[at + 1])} for a tick at ${String(when)}`
      );
    }
  });
});

/**
 * Phase 219, item 5's other half. The loop's fix rests on `finishCapture`
 * closing its window in a SYNCHRONOUS prefix, so this reads the shipping
 * source and fails if an `await` is ever put in front of `open = null`. The
 * fallback branch above it is the one await that may precede it, and the live
 * loop never takes that branch.
 */
describe('Phase 219: finishCapture releases its window before its first await', () => {
  it('nothing is awaited between the fallback branch and open = null', async () => {
    const source = await readFile(
      new URL('../report.ts', import.meta.url),
      'utf8'
    );
    // Comments are stripped first, because the note in report.ts that explains
    // this rule uses the word itself and a scan that reads its own explanation
    // as a violation cannot pass.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const body = code.slice(code.indexOf('export async function finishCapture('));
    const afterFallback = body.indexOf('fellBack = true;');
    const release = body.indexOf('open = null;', afterFallback);
    assert.ok(afterFallback > 0 && release > afterFallback, 'finishCapture no longer has that shape');
    const prefix = body.slice(afterFallback, release);
    assert.equal(
      /\bawait\b/.test(prefix),
      false,
      `finishCapture awaits before releasing its window, so live.ts opens the next one over an open slot: ${prefix.trim().slice(0, 200)}`
    );
  });
});
