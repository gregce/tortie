/**
 * One capture from the renderer's side (Phase 163), and the fourth proof
 * item of the audit: opening and closing the surface leaves no timer,
 * listener or process behind.
 *
 * The long task observer is the one thing the renderer arms for a capture.
 * These tests drive `captureReport` with a fake bridge and a fake observer
 * and prove the observer is stopped on the happy path, when `finish`
 * throws, and when the bridge is missing nothing is ever armed.
 */

import { describe, expect, it, vi } from 'vitest';
import type {
  DiagnosticsReport,
  DiagnosticsRendererFacts,
  GmuxDiagnosticsExtras
} from '@shared/ipc';
import {
  CAPTURE_WINDOW_MS,
  captureReport,
  DiagnosticsUnavailable,
  type CaptureDeps,
  type LongTaskWatch
} from '../capture';

function fakeApi(over: Partial<GmuxDiagnosticsExtras['diagnostics']> = {}): {
  api: GmuxDiagnosticsExtras['diagnostics'];
  finishedWith: DiagnosticsRendererFacts[];
} {
  const finishedWith: DiagnosticsRendererFacts[] = [];
  const api: GmuxDiagnosticsExtras['diagnostics'] = {
    begin: async () => ({ id: 'w1' }),
    finish: async (_id, facts) => {
      finishedWith.push(facts);
      return { text: 'report' } as unknown as DiagnosticsReport;
    },
    rendererMemory: async () => null,
    saveHeapSnapshot: async () => ({ outcome: 'cancelled' }),
    ...over
  };
  return { api, finishedWith };
}

function fakeWatch(): LongTaskWatch & { stopped: number } {
  const w = {
    stopped: 0,
    read: () => ({ count: 2, totalMs: 120, maxMs: 90, buffered: false }),
    stop() {
      w.stopped += 1;
    }
  };
  return w;
}

function deps(api: GmuxDiagnosticsExtras['diagnostics'] | null, watch: LongTaskWatch | null, waited: number[] = []): CaptureDeps {
  return {
    api,
    mountedSurfaces: () => 3,
    watchLongTasks: () => watch,
    wait: async (ms) => {
      waited.push(ms);
    }
  };
}

describe('captureReport', () => {
  it('opens the window, waits it out, hands the renderer facts to finish, and stops the observer', async () => {
    const { api, finishedWith } = fakeApi();
    const watch = fakeWatch();
    const waited: number[] = [];
    const report = await captureReport(deps(api, watch, waited));
    expect(report.text).toBe('report');
    expect(waited).toEqual([CAPTURE_WINDOW_MS]);
    expect(finishedWith).toEqual([
      {
        memory: null,
        mountedSurfaces: 3,
        longTasks: { count: 2, totalMs: 120, maxMs: 90, buffered: false }
      }
    ]);
    expect(watch.stopped).toBe(1);
  });

  it('stops the observer even when finish throws', async () => {
    const { api } = fakeApi({
      finish: async () => {
        throw new Error('main went away');
      }
    });
    const watch = fakeWatch();
    await expect(captureReport(deps(api, watch))).rejects.toThrow('main went away');
    expect(watch.stopped).toBe(1);
  });

  it('stops the observer even when the wait itself rejects', async () => {
    const { api } = fakeApi();
    const watch = fakeWatch();
    const d = deps(api, watch);
    d.wait = async () => {
      throw new Error('unmounted');
    };
    await expect(captureReport(d)).rejects.toThrow('unmounted');
    expect(watch.stopped).toBe(1);
  });

  it('reports no long tasks when this window cannot observe them', async () => {
    const { api, finishedWith } = fakeApi();
    await captureReport(deps(api, null));
    expect(finishedWith[0]?.longTasks).toBeNull();
  });

  it('arms nothing at all without a bridge', async () => {
    const watchLongTasks = vi.fn(() => fakeWatch());
    const d = deps(null, null);
    d.watchLongTasks = watchLongTasks;
    await expect(captureReport(d)).rejects.toBeInstanceOf(DiagnosticsUnavailable);
    expect(watchLongTasks).not.toHaveBeenCalled();
  });
});
