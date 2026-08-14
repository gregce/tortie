/**
 * The one `updates:*` registrar (Phase 24).
 *
 * One channel, and it is a read. `updates:state` answers what is true right
 * now: the running version, what is staged, and when the last check
 * completed. The Settings window draws its one Updates caption from it when
 * the section mounts. There is deliberately no channel that starts a check,
 * no channel that installs, and no push stream: the update engine lives in
 * main and must never depend on a renderer being open, and the announcement
 * surface is one native menu item (src/main/menu.ts).
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import { getUpdateUiState } from './updater';

export function registerUpdatesIpc(ipc: IpcMain): void {
  handle(ipc, 'updates:state', () => getUpdateUiState());
}
