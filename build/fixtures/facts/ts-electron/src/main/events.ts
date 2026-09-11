import { ipcMain } from 'electron';

/** A wrapper named `on`: only a BARE call of it is an IPC registration. */
export function on(channel: string, fn: () => void): void {
  ipcMain.on(channel, fn);
}
