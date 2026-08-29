/**
 * One capture, from the renderer's side (Phase 163).
 *
 * A capture is a window with two ends, because every CPU number Electron
 * can give is "since the last sample". `begin` opens the window in main,
 * the renderer gathers its own facts over it, and `finish` closes it and
 * answers with the report. The three renderer facts are gathered HERE
 * because main cannot ask this process for them: the preload reads private
 * memory, heap and Blink numbers for this very process, the terminal
 * registry knows how many surfaces are mounted, and a PerformanceObserver
 * in this window is the only thing that can see a long task in it.
 *
 * THE OBSERVER LIVES FOR THE WINDOW AND NOT ONE TICK LONGER. It is created
 * after `begin` and disconnected in a `finally`, so a `finish` that throws,
 * a bridge that is missing, or a tab that unmounted mid capture all leave
 * nothing behind. That is the fourth proof item of the audit, kept by the
 * shape of this one function rather than by a cleanup somebody remembers.
 *
 * The seams are injected so the unit suite can prove the disconnect without
 * a browser. The defaults are the real bridge, the real registry and the
 * window's own PerformanceObserver.
 */

import type {
  DiagnosticsLongTasks,
  DiagnosticsReport,
  DiagnosticsRendererFacts,
  GmuxDiagnosticsExtras
} from '@shared/ipc';
import { gmuxBridge } from '../bridge';
import { liveTerminalCount } from '../terminal/drop/registry';

/** How long the sampling window stays open. Brief on purpose. */
export const CAPTURE_WINDOW_MS = 1500;

/** A long task observer for one window: read once, then stop. */
export interface LongTaskWatch {
  read(): DiagnosticsLongTasks;
  stop(): void;
}

export interface CaptureDeps {
  api: GmuxDiagnosticsExtras['diagnostics'] | null;
  mountedSurfaces(): number;
  /** Null when this window cannot observe long tasks. */
  watchLongTasks(): LongTaskWatch | null;
  wait(ms: number): Promise<void>;
}

/**
 * The observer, on the real PerformanceObserver. `buffered: true` asks for
 * entries from before the observer existed; whether Chromium hands any back
 * is what the `buffered` flag on the result records, decided by comparing
 * each entry's start against the moment the observer was made.
 */
function realLongTaskWatch(): LongTaskWatch | null {
  const Observer = (globalThis as { PerformanceObserver?: typeof PerformanceObserver })
    .PerformanceObserver;
  if (Observer === undefined) return null;
  const supported = Observer.supportedEntryTypes;
  if (Array.isArray(supported) && !supported.includes('longtask')) return null;
  const since = performance.now();
  let count = 0;
  let totalMs = 0;
  let maxMs = 0;
  let buffered = false;
  const observer = new Observer((list) => {
    for (const entry of list.getEntries()) {
      count += 1;
      totalMs += entry.duration;
      if (entry.duration > maxMs) maxMs = entry.duration;
      if (entry.startTime < since) buffered = true;
    }
  });
  try {
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    return null;
  }
  return {
    read: () => ({
      count,
      totalMs: Math.round(totalMs),
      maxMs: Math.round(maxMs),
      buffered
    }),
    stop: () => observer.disconnect()
  };
}

export function defaultCaptureDeps(): CaptureDeps {
  return {
    api: gmuxBridge()?.diagnostics ?? null,
    mountedSurfaces: liveTerminalCount,
    watchLongTasks: realLongTaskWatch,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  };
}

/** Thrown when there is no bridge, so the tab can say so in one sentence. */
export class DiagnosticsUnavailable extends Error {
  constructor() {
    super('diagnostics bridge is not installed');
    this.name = 'DiagnosticsUnavailable';
  }
}

/**
 * Take one capture. Opens the window, holds it for `windowMs`, gathers the
 * renderer's facts, closes it. The long task observer is stopped in the
 * `finally` whatever happens in between.
 */
export async function captureReport(
  deps: CaptureDeps = defaultCaptureDeps(),
  windowMs: number = CAPTURE_WINDOW_MS
): Promise<DiagnosticsReport> {
  const api = deps.api;
  if (api === null) throw new DiagnosticsUnavailable();
  const handle = await api.begin();
  const watch = deps.watchLongTasks();
  try {
    await deps.wait(windowMs);
    const memory = await api.rendererMemory();
    const facts: DiagnosticsRendererFacts = {
      memory,
      mountedSurfaces: deps.mountedSurfaces(),
      longTasks: watch === null ? null : watch.read()
    };
    return await api.finish(handle.id, facts);
  } finally {
    watch?.stop();
  }
}
