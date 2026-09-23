/**
 * When this Mac last woke (Phase 314, SPEC §3.3).
 *
 * `WakeMark` listens to a `PowerMonitorLike` and remembers the last
 * {@link WAKE_MEMORY} wakes as `{ suspendedAt, resumedAt }`, wall-clock epoch
 * ms, the same clock `blockedSince` stamps with. It answers two readers: the
 * door's `/v1/blocked` rows, which hand the list to `blockedAge` to say which
 * waits were first seen at a wake, and the push engine, which opens its wake
 * window on `resume` and closes its connections on `suspend`.
 *
 * IT DECIDES NOTHING. Whether a stamp falls inside a wake window is
 * `blockedAge`'s question (`../tray/attention.ts`) and nobody else's; this
 * module only records when the windows opened.
 *
 * THE MONITOR IS INJECTED, so every test, gate and probe drives a wake without
 * sleeping a machine. In production the round that composes the push (Phase
 * 316) hands it Electron's `powerMonitor`, the same object
 * `installPowerHandlers` already listens to: two listeners on one event, and
 * `./index.ts` is not edited.
 *
 * ORDER. The window is recorded BEFORE the resume listeners run, so a listener
 * that reads `wakes()` sees the wake that woke it.
 */

import type { WakeWindow } from '../tray/attention';
import type { PowerMonitorLike } from './index';

/** How many wakes are remembered. Older ones are dropped, oldest first. */
export const WAKE_MEMORY = 16;

export class WakeMark {
  private readonly monitor: PowerMonitorLike;
  private readonly now: () => number;
  private readonly windows: WakeWindow[] = [];
  private suspendedAt: number | null = null;
  private readonly suspendListeners = new Set<() => void>();
  private readonly resumeListeners = new Set<(w: WakeWindow) => void>();
  private disposed = false;

  private readonly handleSuspend = (): void => {
    // The first suspend of a flurry is when the machine started going down.
    this.suspendedAt ??= this.now();
    for (const listener of [...this.suspendListeners]) {
      try {
        listener();
      } catch {
        /* one listener failing must not stop the next */
      }
    }
  };

  private readonly handleResume = (): void => {
    const opened: WakeWindow = { suspendedAt: this.suspendedAt, resumedAt: this.now() };
    this.suspendedAt = null;
    this.windows.push(opened);
    while (this.windows.length > WAKE_MEMORY) this.windows.shift();
    for (const listener of [...this.resumeListeners]) {
      try {
        listener(opened);
      } catch {
        /* one listener failing must not stop the next */
      }
    }
  };

  constructor(monitor: PowerMonitorLike, now: () => number = Date.now) {
    this.monitor = monitor;
    this.now = now;
    monitor.on('suspend', this.handleSuspend);
    monitor.on('resume', this.handleResume);
  }

  /** Oldest first, at most {@link WAKE_MEMORY}. A copy: the caller cannot edit the record. */
  wakes(): readonly WakeWindow[] {
    return [...this.windows];
  }

  /** Runs after the suspend is recorded. Returns the unsubscribe. */
  onSuspend(cb: () => void): () => void {
    this.suspendListeners.add(cb);
    return () => {
      this.suspendListeners.delete(cb);
    };
  }

  /** Runs after the window is recorded, with that window. Returns the unsubscribe. */
  onResume(cb: (w: WakeWindow) => void): () => void {
    this.resumeListeners.add(cb);
    return () => {
      this.resumeListeners.delete(cb);
    };
  }

  /** Removes both monitor listeners and every subscriber. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.monitor.removeListener('suspend', this.handleSuspend);
    this.monitor.removeListener('resume', this.handleResume);
    this.suspendListeners.clear();
    this.resumeListeners.clear();
  }
}
