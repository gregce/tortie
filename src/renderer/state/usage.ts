/**
 * The usage meter's renderer state (Phase 181).
 *
 * ONE STORE, one cadence, however many meters are mounted. The dock's foot,
 * the collapsed rail and the top strip all draw the same snapshot, and only
 * one of the three is on screen at a time, but a person can also have several
 * windows open. Each window runs its own cadence and main holds the interval
 * anyway, so an extra window costs an IPC round trip and no request.
 *
 * THE CADENCE, from research 72 section 4: fifteen minutes, and ONLY while
 * this window is visible and focused. A window in the background asks for
 * nothing at all, and asks once when it comes back if the interval has passed
 * while it was away. Main enforces the same interval, so nothing here can
 * poll a vendor harder than that even if it tried.
 */

import { create } from 'zustand';
import type { UsageSnapshot } from '@shared/usage';
import { USAGE_PROVIDERS, emptyUsageProvider } from '@shared/usage';
import { gmuxBridge } from '../bridge';

/** The renderer's copy of main's interval. Main holds the authoritative one. */
export const USAGE_POLL_MS = 15 * 60 * 1000;

function emptySnapshot(): UsageSnapshot {
  return {
    at: 0,
    providers: USAGE_PROVIDERS.map((p) => emptyUsageProvider(p))
  };
}

export interface UsageStoreState {
  snapshot: UsageSnapshot;
  /** A refresh the person asked for is in flight. */
  refreshing: boolean;
  /** False on a build whose preload has no `usage` member. */
  available: boolean;
  /** Milliseconds since epoch of this window's last ask. */
  askedAt: number;
  /** Read once and start the cadence. Idempotent, safe from every meter. */
  ensurePolling(): void;
  /** The refresh control. Skips this window's interval; main keeps its floor. */
  refresh(): Promise<void>;
}

let started = false;
let timer: number | undefined;

export const useUsage = create<UsageStoreState>((set, get) => ({
  snapshot: emptySnapshot(),
  refreshing: false,
  available: true,
  askedAt: 0,

  ensurePolling(): void {
    if (started) return;
    started = true;
    const bridge = gmuxBridge();
    if (bridge?.usage === undefined) {
      set({ available: false });
      return;
    }
    const ask = (): void => {
      const api = gmuxBridge()?.usage;
      if (api === undefined) return;
      set({ askedAt: Date.now() });
      void api
        .read()
        .then((snapshot) => set({ snapshot }))
        // A read that fails leaves the last snapshot on screen. Main already
        // decides what a failed VENDOR call looks like; this catch is only
        // about the bridge itself, and flapping the face for it would be
        // exactly the noise the stale policy exists to avoid.
        .catch(() => undefined);
    };
    /** Awake means this window can see the answer and the person is here. */
    const awake = (): boolean =>
      document.visibilityState === 'visible' && document.hasFocus();
    const tick = (): void => {
      if (!awake()) return;
      if (Date.now() - get().askedAt < USAGE_POLL_MS) return;
      ask();
    };
    ask();
    timer = window.setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
  },

  async refresh(): Promise<void> {
    const api = gmuxBridge()?.usage;
    if (api === undefined || get().refreshing) return;
    set({ refreshing: true });
    try {
      const snapshot = await api.refresh();
      set({ snapshot, askedAt: Date.now() });
    } catch {
      // Same reasoning as the read above: keep what is on screen.
    } finally {
      set({ refreshing: false });
    }
  }
}));

/** Test seam: forget that the cadence was started. */
export function resetUsagePolling(): void {
  started = false;
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}
