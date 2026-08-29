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
import type { DiagnosticsHeapTarget } from '@shared/ipc';
import { gmuxError } from '../errors';
import { redactString } from '../log/redact';
import { handle } from '../typed-ipc';
import { saveHeapSnapshot } from './heap';
import { beginCapture, finishCapture } from './report';

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
