/**
 * Phase 19 item 11 — the two power handlers.
 *
 * Nothing here waits on a real machine sleeping. `powerMonitor` is injected,
 * so the tests fire the two events by hand and assert what the app does.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installPowerHandlers,
  SUSPEND_CAPTURE_DEADLINE_MS,
  type PowerMonitorLike
} from '../index';

/** A stand-in for Electron's powerMonitor that a test can fire by hand. */
function fakeMonitor(): PowerMonitorLike & {
  fire(event: 'suspend' | 'resume'): void;
  count(event: 'suspend' | 'resume'): number;
} {
  const listeners = new Map<string, Set<() => void>>();
  return {
    on(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
      return this;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return this;
    },
    fire(event) {
      for (const listener of [...(listeners.get(event) ?? [])]) listener();
    },
    count(event) {
      return listeners.get(event)?.size ?? 0;
    }
  };
}

/** Let queued microtasks run. */
const settle = (): Promise<void> => new Promise((r) => setImmediate(r));

describe('installPowerHandlers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('captures every session when the machine suspends', async () => {
    const monitor = fakeMonitor();
    const captureAll = vi.fn().mockResolvedValue(undefined);
    installPowerHandlers({ captureAll, onResume: () => undefined, monitor });

    expect(captureAll).not.toHaveBeenCalled();
    monitor.fire('suspend');
    await settle();
    expect(captureAll).toHaveBeenCalledTimes(1);
  });

  it('runs the resume handler when the machine wakes', () => {
    const monitor = fakeMonitor();
    const onResume = vi.fn();
    installPowerHandlers({
      captureAll: async () => undefined,
      onResume,
      monitor
    });

    monitor.fire('resume');
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('does not start a second capture while one is still running', async () => {
    const monitor = fakeMonitor();
    let release: (() => void) | undefined;
    const captureAll = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    installPowerHandlers({ captureAll, onResume: () => undefined, monitor });

    // The sleep / wake / sleep flurry a lid gets on a desk.
    monitor.fire('suspend');
    await settle();
    monitor.fire('suspend');
    await settle();
    expect(captureAll).toHaveBeenCalledTimes(1);

    release?.();
    await settle();
    // Once the first pass is done, the next suspend does start one.
    monitor.fire('suspend');
    await settle();
    expect(captureAll).toHaveBeenCalledTimes(2);
  });

  it('stops waiting on a capture that outlives its deadline', async () => {
    vi.useFakeTimers();
    try {
      const monitor = fakeMonitor();
      // A capture that never resolves, which is what a wedged tmux looks like.
      const captureAll = vi.fn(() => new Promise<void>(() => undefined));
      // Phase 35 moved this line from console.log to a WARN record at scope
      // "power". A capture that missed its deadline is a warning, not
      // information: the machine is going down and those lines are gone.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      installPowerHandlers({
        captureAll,
        onResume: () => undefined,
        monitor,
        captureDeadlineMs: 50
      });

      monitor.fire('suspend');
      await vi.advanceTimersByTimeAsync(60);
      expect(
        warn.mock.calls.some(([msg]) =>
          String(msg).includes('capture still running after 50 ms')
        )
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a failed capture is logged and never thrown at the caller', async () => {
    const monitor = fakeMonitor();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const captureAll = vi.fn().mockRejectedValue(new Error('tmux is gone'));
    installPowerHandlers({ captureAll, onResume: () => undefined, monitor });

    expect(() => monitor.fire('suspend')).not.toThrow();
    await settle();
    expect(
      warn.mock.calls.some(([msg]) =>
        String(msg).includes('suspend capture failed: tmux is gone')
      )
    ).toBe(true);
  });

  it('a throwing resume handler does not escape', () => {
    const monitor = fakeMonitor();
    installPowerHandlers({
      captureAll: async () => undefined,
      onResume: () => {
        throw new Error('no window');
      },
      monitor
    });

    expect(() => monitor.fire('resume')).not.toThrow();
  });

  it('the returned function removes both listeners', async () => {
    const monitor = fakeMonitor();
    const captureAll = vi.fn().mockResolvedValue(undefined);
    const onResume = vi.fn();
    const dispose = installPowerHandlers({ captureAll, onResume, monitor });

    expect(monitor.count('suspend')).toBe(1);
    expect(monitor.count('resume')).toBe(1);
    dispose();
    expect(monitor.count('suspend')).toBe(0);
    expect(monitor.count('resume')).toBe(0);

    monitor.fire('suspend');
    monitor.fire('resume');
    await settle();
    expect(captureAll).not.toHaveBeenCalled();
    expect(onResume).not.toHaveBeenCalled();
  });

  it('the deadline is long enough for the quit-path capture shape', () => {
    // The quit path bounds the same pass at 8 s. Sleep gets less because the
    // machine is going down anyway, but it must still clear a 43-session
    // parallel pass by a wide margin.
    expect(SUSPEND_CAPTURE_DEADLINE_MS).toBeGreaterThanOrEqual(2_000);
    expect(SUSPEND_CAPTURE_DEADLINE_MS).toBeLessThan(8_000);
  });
});
