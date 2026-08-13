/**
 * The notice channel's one invoke handler (Phase 19 item 9).
 *
 * Separate from ./index so that the emitter — which snapshots, the manifest
 * opener and the tmux supervisor all import — never drags Electron's `ipcMain`
 * into their import graph, and so a unit test of the latch does not have to
 * mock a registrar it is not testing.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import { takePendingNotices } from './index';

export function registerNoticeIpc(ipc: IpcMain): void {
  handle(ipc, 'notice:pending', () => takePendingNotices());
}
