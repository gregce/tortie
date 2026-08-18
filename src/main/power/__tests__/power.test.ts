/**
 * Phase 19 item 11 — the two power handlers.
 *
 * Nothing here waits on a real machine sleeping. `powerMonitor` is injected,
 * so the tests fire the two events by hand and assert what the app does.
 *
 * Phase 77 added the second step of a suspend, which is a manifest generation
 * taken after the capture. Every call site below passes it, because the
 * dependency is required rather than optional: an optional one is a call site
 * that can forget.
 *
 * Phase 73.1, row 19. That step answers with one of three outcomes rather than
 * a boolean. The old false meant both `unchanged` and `failed`, and the line
 * the handler printed said the manifest had not changed for both of them. The
 * last three tests in this file are the ones that hold the three lines apart.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installPowerHandlers,
  SUSPEND_CAPTURE_DEADLINE_MS,
  type PowerMonitorLike,
  type SuspendTakeOutcome
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

/**
 * A take that reports the manifest had not changed, which is the common answer.
 *
 * The tests that care about the take pass their own.
 */
const noTake = (): Promise<SuspendTakeOutcome> => Promise.resolve('unchanged');

describe('installPowerHandlers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('captures every session when the machine suspends', async () => {
    const monitor = fakeMonitor();
    const captureAll = vi.fn().mockResolvedValue(undefined);
    installPowerHandlers({
      captureAll,
      takeManifestGeneration: noTake,
      onResume: () => undefined,
      monitor
    });

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
      takeManifestGeneration: noTake,
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
    installPowerHandlers({
      captureAll,
      takeManifestGeneration: noTake,
      onResume: () => undefined,
      monitor
    });

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
        takeManifestGeneration: noTake,
        onResume: () => undefined,
        monitor,
        captureDeadlineMs: 50
      });

      monitor.fire('suspend');
      await vi.advanceTimersByTimeAsync(60);
      expect(
        warn.mock.calls.some(([msg]) =>
          String(msg).includes('still working after 50 ms')
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
    installPowerHandlers({
      captureAll,
      takeManifestGeneration: noTake,
      onResume: () => undefined,
      monitor
    });

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
      takeManifestGeneration: noTake,
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
    const dispose = installPowerHandlers({
      captureAll,
      takeManifestGeneration: noTake,
      onResume,
      monitor
    });

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

  it('takes a manifest generation on the same suspend as the capture', async () => {
    const monitor = fakeMonitor();
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const captureAll = vi.fn().mockResolvedValue(undefined);
    const takeManifestGeneration = vi.fn().mockResolvedValue('taken');
    installPowerHandlers({
      captureAll,
      takeManifestGeneration,
      onResume: () => undefined,
      monitor
    });

    monitor.fire('suspend');
    await settle();
    expect(captureAll).toHaveBeenCalledTimes(1);
    expect(takeManifestGeneration).toHaveBeenCalledTimes(1);
    expect(
      info.mock.calls.some(([msg]) =>
        String(msg).includes('suspend: took a manifest generation')
      )
    ).toBe(true);
  });

  it('takes it AFTER the capture, so the copy holds what the capture wrote', async () => {
    const monitor = fakeMonitor();
    const order: string[] = [];
    installPowerHandlers({
      captureAll: async () => {
        order.push('capture');
      },
      takeManifestGeneration: async () => {
        order.push('take');
        return 'taken';
      },
      onResume: () => undefined,
      monitor
    });

    monitor.fire('suspend');
    await settle();
    expect(order).toEqual(['capture', 'take']);
  });

  it('says so when the manifest had not changed, which is the common case', async () => {
    const monitor = fakeMonitor();
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    installPowerHandlers({
      captureAll: async () => undefined,
      takeManifestGeneration: async () => 'unchanged',
      onResume: () => undefined,
      monitor
    });

    monitor.fire('suspend');
    await settle();
    expect(
      info.mock.calls.some(([msg]) =>
        String(msg).includes(
          'suspend: the manifest has not changed, so no generation was taken'
        )
      )
    ).toBe(true);
  });

  /**
   * PHASE 73.1, ROW 19. A take that did not work says so.
   *
   * The old shape was a boolean, so a take that returned not ok and a take that
   * threw both printed the sentence about the manifest not changing. The ring's
   * own warning naming the real reason printed on the line above it, so the log
   * held a true line and a false one about the same event.
   */
  it('a take that did not work never says the manifest had not changed', async () => {
    const monitor = fakeMonitor();
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // console.log is already spied in beforeEach, so spying again hands back
    // the same recorder with every earlier test's line still in it. The point
    // of this test is which lines are ABSENT, so it starts from empty.
    info.mockClear();
    installPowerHandlers({
      captureAll: async () => undefined,
      takeManifestGeneration: async () => 'failed',
      onResume: () => undefined,
      monitor
    });

    monitor.fire('suspend');
    await settle();
    const lines = info.mock.calls.map(([msg]) => String(msg));
    expect(
      lines.some((line) =>
        line.includes(
          'suspend: no manifest generation was taken, and the warning above names the reason'
        )
      )
    ).toBe(true);
    expect(
      lines.some((line) => line.includes('the manifest has not changed'))
    ).toBe(false);
    expect(lines.some((line) => line.includes('took a manifest generation'))).toBe(
      false
    );
  });

  it('a take that threw prints the same third line, and not the other two', async () => {
    const monitor = fakeMonitor();
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    info.mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    installPowerHandlers({
      captureAll: async () => undefined,
      takeManifestGeneration: async () => {
        throw new Error('the disk is full');
      },
      onResume: () => undefined,
      monitor
    });

    monitor.fire('suspend');
    await settle();
    const lines = info.mock.calls.map(([msg]) => String(msg));
    expect(
      lines.some((line) =>
        line.includes('suspend: no manifest generation was taken')
      )
    ).toBe(true);
    expect(
      lines.some((line) => line.includes('the manifest has not changed'))
    ).toBe(false);
  });

  it('a failed take is logged, swallowed, and leaves the next suspend free', async () => {
    const monitor = fakeMonitor();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const captureAll = vi.fn().mockResolvedValue(undefined);
    const takeManifestGeneration = vi
      .fn()
      .mockRejectedValue(new Error('the disk is full'));
    installPowerHandlers({
      captureAll,
      takeManifestGeneration,
      onResume: () => undefined,
      monitor
    });

    expect(() => monitor.fire('suspend')).not.toThrow();
    await settle();
    expect(
      warn.mock.calls.some(([msg]) =>
        String(msg).includes(
          'suspend: taking a manifest generation failed: the disk is full'
        )
      )
    ).toBe(true);

    // The in-flight flag has to clear, or the lid closing twice would leave
    // the app doing nothing on the second one for the rest of the run.
    monitor.fire('suspend');
    await settle();
    expect(captureAll).toHaveBeenCalledTimes(2);
  });

  it('a failed capture still lets the generation be taken', async () => {
    const monitor = fakeMonitor();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const takeManifestGeneration = vi.fn().mockResolvedValue('taken');
    installPowerHandlers({
      captureAll: async () => {
        throw new Error('tmux is gone');
      },
      takeManifestGeneration,
      onResume: () => undefined,
      monitor
    });

    monitor.fire('suspend');
    await settle();
    // A scrollback capture that failed is not a reason to skip the manifest
    // copy. They protect different things.
    expect(takeManifestGeneration).toHaveBeenCalledTimes(1);
  });

  it('the deadline is long enough for the quit-path capture shape', () => {
    // The quit path bounds the same pass at 8 s. Sleep gets less because the
    // machine is going down anyway, but it must still clear a 43-session
    // parallel pass by a wide margin.
    expect(SUSPEND_CAPTURE_DEADLINE_MS).toBeGreaterThanOrEqual(2_000);
    expect(SUSPEND_CAPTURE_DEADLINE_MS).toBeLessThan(8_000);
  });
});
