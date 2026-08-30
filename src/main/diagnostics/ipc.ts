/**
 * The diagnostics registrar (Phase 163): three channels.
 *
 * `diagnostics:begin` and `diagnostics:finish` are the two ends of one
 * capture window (./report.ts). `diagnostics:saveHeapSnapshot` is the opt in
 * artifact: it asks WHERE with a save dialog and writes only there, through
 * the gate in ./heap.ts, which refuses any path a person did not choose. The
 * snapshot never enters a report, a log or the profile, and this file is the
 * one place ./heap.ts is imported.
 *
 * None of the three runs on a timer. None sends a byte anywhere.
 */

import { BrowserWindow, dialog, type IpcMain } from 'electron';
import { homedir } from 'node:os';
import type {
  DiagnosticsHeapTarget,
  DiagnosticsRendererFacts
} from '@shared/ipc';
import { DIAGNOSTICS_LIVE_INTERVAL_MS } from '@shared/ipc';
import { gmuxError } from '../errors';
import { redactString } from '../log/redact';
import { sendEvent } from '../typed-events';
import { handle } from '../typed-ipc';
import { saveHeapSnapshot } from './heap';
import { startLiveSampling, stopLiveSampling } from './live';
import { beginCapture, finishCapture } from './report';
import { openTopStream } from './top-stream';

/**
 * Live ticks leave the renderer facts null here: main never asks a renderer
 * to run code. The renderer fills its own three facts in when the sample
 * arrives (src/renderer/diagnostics/DiagnosticsTab.tsx), and its row still
 * gets its physical footprint from the top sample every tick already takes.
 */
/**
 * How long top's own startup walk takes before its first valid sample can
 * exist, measured at 2.2 s over 985 processes on 2026-08-30 and given room.
 */
const LIVE_TOP_STARTUP_MS = 3_000;

const NULL_LIVE_FACTS: DiagnosticsRendererFacts = {
  memory: null,
  mountedSurfaces: null,
  longTasks: null
};

function stamp(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/** The file name the dialog proposes. Pure, so a test can pin it. */
export function heapSnapshotFileName(
  target: DiagnosticsHeapTarget,
  now: Date = new Date()
): string {
  return `Tortie-${target}-${stamp(now)}.heapsnapshot`;
}

export function registerDiagnosticsIpc(ipc: IpcMain): void {
  handle(ipc, 'diagnostics:begin', () => beginCapture());

  handle(ipc, 'diagnostics:finish', (event, id, facts) =>
    finishCapture(id, facts, { rendererPid: event.sender.getOSProcessId() })
  );

  // Phase 170: live mode. The timer in ./live.ts exists only between these
  // two calls (or until the subscribing window is destroyed), and a start
  // whose tab is not visible is a refusal that arms nothing. The renderer
  // calls stop on hide, on pause and on unmount; the destroyed hook is the
  // safety net for a window that closes without saying goodbye.
  handle(ipc, 'diagnostics:liveStart', (event, visible) => {
    if (!visible) {
      stopLiveSampling();
      return { started: false, intervalMs: DIAGNOSTICS_LIVE_INTERVAL_MS };
    }
    const sender = event.sender;
    const rendererPid = sender.getOSProcessId();
    // The subscription's instrument: one streaming top, opened here and
    // closed by live's stop on every path out. A tick takes one sample
    // from it and waits at most two intervals plus the startup walk for
    // one; past that the tick reads without it rather than hanging.
    const stream = openTopStream({ intervalMs: DIAGNOSTICS_LIVE_INTERVAL_MS });
    const maxWaitMs = 2 * DIAGNOSTICS_LIVE_INTERVAL_MS + LIVE_TOP_STARTUP_MS;
    startLiveSampling({
      begin: () =>
        beginCapture(Date.now(), { power: () => stream.take(maxWaitMs) }),
      finish: (id) =>
        finishCapture(id, NULL_LIVE_FACTS, { rendererPid, light: true }),
      close: () => stream.close(),
      send: (sample) => {
        if (!sender.isDestroyed()) {
          sendEvent(sender, 'diagnostics:liveSample', sample);
        }
      },
      onGone: (cb) => {
        sender.once('destroyed', cb);
        return () => {
          sender.removeListener('destroyed', cb);
        };
      }
    });
    return { started: true, intervalMs: DIAGNOSTICS_LIVE_INTERVAL_MS };
  });

  handle(ipc, 'diagnostics:liveStop', () => {
    stopLiveSampling();
  });

  handle(ipc, 'diagnostics:saveHeapSnapshot', async (event, target) => {
    if (target !== 'main' && target !== 'window') {
      throw gmuxError('INVALID_INPUT', 'Unknown heap snapshot target.');
    }
    const owner = BrowserWindow.fromWebContents(event.sender);
    const options = {
      title: 'Save a heap snapshot',
      defaultPath: heapSnapshotFileName(target),
      filters: [{ name: 'Heap snapshot', extensions: ['heapsnapshot'] }]
    };
    const picked =
      owner === null
        ? await dialog.showSaveDialog(options)
        : await dialog.showSaveDialog(owner, options);
    if (picked.canceled || picked.filePath === undefined || picked.filePath === '') {
      return { outcome: 'cancelled' as const };
    }
    const sender = event.sender;
    const outcome = await saveHeapSnapshot({
      path: picked.filePath,
      origin: 'dialog',
      write: async (path) => {
        if (target === 'main') return process.takeHeapSnapshot(path);
        await sender.takeHeapSnapshot(path);
        return true;
      }
    });
    if (!outcome.written) {
      throw gmuxError(
        'INVALID_INPUT',
        outcome.refused ?? 'The heap snapshot could not be written.'
      );
    }
    return {
      outcome: 'saved' as const,
      path: redactString(picked.filePath, homedir())
    };
  });
}
