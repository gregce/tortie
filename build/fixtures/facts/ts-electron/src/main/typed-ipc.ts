import type { IpcMain } from 'electron';

/** The typed registrar: every `handle(ipc, channel, fn)` in this tree is an IPC registration. */
export function handle(ipc: IpcMain, channel: string, fn: (...args: unknown[]) => unknown): void {
  ipc.handle(channel, (_event, ...args) => fn(...args));
}
