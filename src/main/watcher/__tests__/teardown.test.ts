/**
 * Phase 36 — the quit-time watcher-close drain.
 *
 * The properties pinned here are exactly the ones the before-quit handler
 * leans on: the drain waits for tracked closes, it includes closes tracked
 * after it started, it treats a rejection as settled, and the deadline
 * fires instead of wedging.
 */

import { describe, expect, it } from 'vitest';
import { drainWatcherCloses, trackWatcherClose } from '../teardown';

/** A promise plus the handles to settle it from the test body. */
function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
} {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('watcher teardown drain', () => {
  it('resolves immediately at 0 when nothing is tracked', async () => {
    await expect(drainWatcherCloses(1_000)).resolves.toBe(0);
  });

  it('waits for a tracked close and returns 0 once it settles', async () => {
    const d = deferred();
    trackWatcherClose(d.promise);

    let drained = false;
    const drain = drainWatcherCloses(2_000).then((left) => {
      drained = true;
      return left;
    });

    // Give the drain a beat: it must NOT resolve while the close is open.
    await new Promise((r) => setTimeout(r, 30));
    expect(drained).toBe(false);

    d.resolve();
    await expect(drain).resolves.toBe(0);
  });

  it('treats a rejected close as settled and stays quiet about it', async () => {
    const d = deferred();
    void trackWatcherClose(d.promise.catch(() => undefined));
    d.reject(new Error('fsevents said no'));
    await expect(drainWatcherCloses(2_000)).resolves.toBe(0);
  });

  it('includes a close tracked while the drain is already running', async () => {
    const first = deferred();
    const late = deferred();
    trackWatcherClose(first.promise);

    const drain = drainWatcherCloses(2_000);

    // Track the second close BEFORE the first settles — the drain must
    // re-read the set and wait for this one too.
    trackWatcherClose(late.promise);
    first.resolve();

    await new Promise((r) => setTimeout(r, 30));
    let drained = false;
    void drain.then(() => {
      drained = true;
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(drained).toBe(false);

    late.resolve();
    await expect(drain).resolves.toBe(0);
  });

  it('gives up at the deadline and reports what is left', async () => {
    const stuck = deferred();
    trackWatcherClose(stuck.promise);

    const started = Date.now();
    const left = await drainWatcherCloses(80);
    const elapsed = Date.now() - started;

    expect(left).toBe(1);
    expect(elapsed).toBeGreaterThanOrEqual(70);
    expect(elapsed).toBeLessThan(1_500);

    // Settle it so the module-level set is empty for the other tests.
    stuck.resolve();
    await drainWatcherCloses(1_000);
  });
});
