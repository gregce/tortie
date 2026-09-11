import { ipcMain } from 'electron';
import { handle } from '../typed-ipc';

export function registerArchIpc(): void {
  handle(ipcMain, 'arch:load', () => 1);
}
