/**
 * The `shell:*` registrar (Phase 51). Four channels, none with arguments.
 *
 * Nothing to dispose: no watcher, no timer, no child process. Nothing here
 * spawns anything, ever — install writes one file, remove deletes one file
 * it can prove is ours, and the pending pull reads one module-level slot.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import { takePendingShellOpen } from './pending';
import { installShim, removeShim, shimStatus } from './shim';

export function registerShellIpc(ipc: IpcMain): void {
  handle(ipc, 'shell:commandStatus', () => shimStatus());
  handle(ipc, 'shell:installCommand', () => installShim());
  handle(ipc, 'shell:removeCommand', () => removeShim());
  handle(ipc, 'shell:takePendingOpen', () => takePendingShellOpen());
}
