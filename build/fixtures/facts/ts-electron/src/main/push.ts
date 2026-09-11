import type { BrowserWindow } from 'electron';

export function push(win: BrowserWindow): void {
  win.webContents.send('push:x', 1);
}
