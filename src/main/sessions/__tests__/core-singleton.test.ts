/**
 * The core singleton lives until dispose returns (Phase 77 item 2).
 *
 * What this pins, and it was measured wrong before the fix.
 * `shutdownGmuxCore` used to clear `corePromise` on its third line and then
 * race an 8,000 ms snapshot pass. For that whole window `getGmuxCore()` saw an
 * empty slot and called `GmuxCore.boot()` again, so a second core started a
 * second tmux server check, a second control client and a second manifest
 * handle while the first one was being torn down. Worse, the second core was
 * then left in the slot when the process was meant to be finished, because the
 * shutdown had already captured the first promise. Held open, the old shape
 * recorded two boots and a leaked core. This file asserts one boot.
 *
 * It is functional rather than source shape. `../core` imports cleanly outside
 * Electron, the same way `restore-status.test.ts` imports it, so
 * `GmuxCore.boot` can be replaced with a fake that records what the teardown
 * asked it to do.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmuxCore, getGmuxCore, shutdownGmuxCore } from '../core';

/** Let queued microtasks run. */
const settle = (): Promise<void> => new Promise((r) => setImmediate(r));

/**
 * A stand-in for a booted core, holding only the four things the teardown
 * touches. Every step it runs is appended to `order`, so the test reads the
 * teardown as a sentence rather than as four separate assertions.
 */
function fakeCore(
  order: string[],
  hold?: Promise<void>
): { core: GmuxCore; order: string[] } {
  const core = {
    snapshotAllSessions: async (): Promise<void> => {
      order.push('snapshot-start');
      if (hold !== undefined) await hold;
      order.push('snapshot');
    },
    captureSyncsIdle: (): Promise<void> => {
      order.push('drain');
      return Promise.resolve();
    },
    takeManifestGenerationOnQuit: (): Promise<null> => {
      order.push('ring');
      return Promise.resolve(null);
    },
    dispose: (): void => {
      order.push('dispose');
    }
  };
  return { core: core as unknown as GmuxCore, order };
}

afterEach(async () => {
  // A failed assertion must not leave a live slot for the next file.
  await shutdownGmuxCore();
  vi.restoreAllMocks();
});

describe('the core singleton across a shutdown', () => {
  it('hands back the core being torn down instead of booting a second one', async () => {
    const order: string[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = fakeCore(order, held);
    const boot = vi.spyOn(GmuxCore, 'boot').mockResolvedValue(first.core);

    const booted = await getGmuxCore();
    expect(boot).toHaveBeenCalledTimes(1);

    // The shutdown is now inside the snapshot pass and stays there.
    const shutdown = shutdownGmuxCore();
    await settle();
    expect(order).toEqual(['snapshot-start']);

    // This is the call that used to start a second core.
    const during = await getGmuxCore();
    expect(boot).toHaveBeenCalledTimes(1);
    expect(during).toBe(booted);

    release();
    await shutdown;
    expect(order).toEqual([
      'snapshot-start',
      'snapshot',
      'drain',
      'ring',
      'dispose'
    ]);

    // And the slot is empty once dispose has returned, so the next caller
    // boots for real.
    const second = fakeCore([]);
    boot.mockResolvedValue(second.core);
    const after = await getGmuxCore();
    expect(boot).toHaveBeenCalledTimes(2);
    expect(after).toBe(second.core);
  });

  it('a second caller joins the teardown in flight rather than starting one', async () => {
    const order: string[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const only = fakeCore(order, held);
    vi.spyOn(GmuxCore, 'boot').mockResolvedValue(only.core);

    await getGmuxCore();
    const a = shutdownGmuxCore();
    const b = shutdownGmuxCore();
    await settle();
    release();
    await Promise.all([a, b]);

    // One teardown, not two. A second dispose would appear here.
    expect(order).toEqual([
      'snapshot-start',
      'snapshot',
      'drain',
      'ring',
      'dispose'
    ]);
  });

  it('runs a real teardown on a second cycle in the same process', async () => {
    // This is decision 1 of the phase. Every durability harness in the tree is
    // built from boot-and-shutdown cycles, and a teardown promise that was
    // never reset would make the second cycle join a settled promise, return
    // at once, and prove nothing.
    const orderA: string[] = [];
    const orderB: string[] = [];
    const boot = vi
      .spyOn(GmuxCore, 'boot')
      .mockResolvedValueOnce(fakeCore(orderA).core)
      .mockResolvedValueOnce(fakeCore(orderB).core);

    await getGmuxCore();
    await shutdownGmuxCore();
    await getGmuxCore();
    await shutdownGmuxCore();

    expect(boot).toHaveBeenCalledTimes(2);
    const whole = ['snapshot-start', 'snapshot', 'drain', 'ring', 'dispose'];
    expect(orderA).toEqual(whole);
    expect(orderB).toEqual(whole);
  });

  it('does nothing when no core was ever booted', async () => {
    const boot = vi.spyOn(GmuxCore, 'boot');
    await shutdownGmuxCore();
    expect(boot).not.toHaveBeenCalled();
  });

  it('a boot that failed leaves nothing to tear down and does not throw', async () => {
    vi.spyOn(GmuxCore, 'boot').mockRejectedValue(new Error('tmux is missing'));
    await expect(getGmuxCore()).rejects.toThrow('tmux is missing');
    await expect(shutdownGmuxCore()).resolves.toBeUndefined();
  });
});
