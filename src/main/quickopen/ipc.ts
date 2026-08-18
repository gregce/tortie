/**
 * quickopen:* IPC — the ⌘P bridge. Registration is self-contained, the way
 * every other domain registrar in this codebase is:
 *
 *     import { registerQuickOpenIpc } from './quickopen';
 *     registerQuickOpenIpc(ipcMain);
 *
 * and, on quit:
 *
 *     await disposeQuickOpenIpc();
 *
 * Phase 77 made that await real. The quit path fired this disposer with
 * `void` until then, so the ranking worker could still be terminating when
 * the process tore its environment down.
 *
 * Two channels only. `warm` is fire-and-forget indexing; `query` is a plain
 * request/response because the whole round trip is p50 4-13 ms at 50,000
 * files — there is nothing worth streaming.
 */

import type { IpcMain } from 'electron';
import { join } from 'node:path';
import { rgBinaryPath } from '../search/resolve';
import { onRepoChanged } from '../watcher';
import { handle } from '../typed-ipc';
import { createQuickOpenCoordinator } from './coordinator';
import type { QuickOpenCoordinator } from './coordinator';

/**
 * The built worker sits beside the main bundle: electron.vite.config.ts adds
 * `src/main/quickopen/worker.ts` as a second `main` rollup input, which emits
 * `out/main/quickopen-worker.js`. In a packaged app that path is inside
 * app.asar, and `new Worker()` reads it there without help — the measurement
 * behind that claim lives in electron.vite.config.ts beside the two entries.
 */
function workerEntry(): string {
  return join(__dirname, 'quickopen-worker.js');
}

let coordinator: QuickOpenCoordinator | null = null;

function ensureCoordinator(): QuickOpenCoordinator {
  coordinator ??= createQuickOpenCoordinator({
    rgPath: rgBinaryPath,
    workerEntry,
    onRepoChanged
  });
  return coordinator;
}

export function registerQuickOpenIpc(ipc: IpcMain): void {
  handle(ipc, 'quickopen:warm', (_e, repoPath) => {
    ensureCoordinator().warm(repoPath);
  });

  handle(ipc, 'quickopen:query', (_e, input) => ensureCoordinator().query(input));
}

/** Quit-time teardown: stop the worker, drop the indexes. */
export async function disposeQuickOpenIpc(): Promise<void> {
  const current = coordinator;
  coordinator = null;
  if (current !== null) await current.dispose();
}
