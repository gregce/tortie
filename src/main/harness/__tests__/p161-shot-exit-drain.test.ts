/**
 * Phase 161 fix round. The shot harness exit drains tracked watcher closes
 * before it calls `app.exit`.
 *
 * Why this is pinned: `app.exit()` never reaches before-quit, so the shot
 * harness used to end a driven capture with `@parcel/watcher` unsubscribe
 * completions still queued behind a busy uv threadpool. That state is the
 * measured Phase 36 abort, `napi_fatal_error` out of
 * `PromiseRunner::onWorkComplete` during `node::FreeEnvironment`, and on
 * 2026-08-27 a verifier run that quit within two seconds of a re-scan burst
 * died exactly that way while three runs without a burst at quit exited 0.
 * The race cannot be made deterministic from a test, so what the test pins is
 * the order: a close the tracked set can see has settled before `app.exit`
 * runs. The last-resort SIGKILL branch is not driven here because its 8 s
 * deadline belongs to the product, not to a test; its shape is the same one
 * src/main/capabilities.ts already carries for the real quit door.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  pendingWatcherCloseCount,
  trackWatcherClose
} from '../../watcher/teardown';

const exitSpy = vi.fn();

vi.mock('electron', () => ({
  app: { exit: (code: number) => exitSpy(code) },
  BrowserWindow: class {}
}));
vi.mock('../../capture', () => ({ saveLastCaptureTo: vi.fn() }));
vi.mock('../../settings', () => ({ openSettingsWindow: vi.fn() }));
vi.mock('../../typed-events', () => ({ broadcastEvent: vi.fn() }));

afterEach(() => {
  exitSpy.mockClear();
});

describe('exitShot', () => {
  it('with nothing pending, exits at once with the given code', async () => {
    const { exitShot } = await import('../shot');
    expect(pendingWatcherCloseCount()).toBe(0);
    await exitShot(3);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(3);
  });

  it('waits for a tracked close to settle before calling app.exit', async () => {
    const { exitShot } = await import('../shot');
    let settle: (() => void) | undefined;
    let settled = false;
    const close = new Promise<void>((resolve) => {
      settle = () => {
        settled = true;
        resolve();
      };
    });
    void trackWatcherClose(close);
    expect(pendingWatcherCloseCount()).toBe(1);

    let exitReturned = false;
    const running = exitShot(0).then(() => {
      exitReturned = true;
    });

    // Give the drain plenty of turns. The close has not settled, so the
    // exit must not have happened.
    for (let i = 0; i < 20; i += 1) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(exitSpy).not.toHaveBeenCalled();
    expect(exitReturned).toBe(false);

    settle?.();
    await running;
    expect(settled).toBe(true);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(pendingWatcherCloseCount()).toBe(0);
  });

  it('includes a close tracked between the beat and the drain', async () => {
    const { exitShot } = await import('../shot');
    // A dispose path that has been started but has not issued its
    // unsubscribe yet does so one loop turn later. The setImmediate beat in
    // exitShot exists for exactly this shape.
    let settle: (() => void) | undefined;
    setImmediate(() => {
      void trackWatcherClose(
        new Promise<void>((resolve) => {
          settle = () => resolve();
        })
      );
      setTimeout(() => settle?.(), 20);
    });
    const before = exitSpy.mock.calls.length;
    await exitShot(0);
    expect(exitSpy.mock.calls.length).toBe(before + 1);
    expect(pendingWatcherCloseCount()).toBe(0);
  });
});
