import { ipcMain } from 'electron';
import { handle as handleTyped } from './typed-ipc';

/** A second `handle` with a second signature: (channel, fn). The caller's own declaration shadows typed-ipc's. */
function handle(channel: string, fn: () => unknown): void {
  handleTyped(ipcMain, channel, fn);
}

handle('arch:map', () => 2);
ipcMain.handle('a:b', () => 3);
ipcMain.handle('$(touch /tmp/p)', () => 4);
ipcMain.handle('a:b/../../etc/passwd', () => 5);
