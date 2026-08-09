/**
 * Restore-stream IPC registration (Phase 6).
 *
 * Registers the appended extension channels the restore UI feature-detects:
 *   - sessions:restore   → GmuxCore.restoreSession (snapshot replay + armed
 *                          resume; §2.4 Step 3)
 *   - sessions:discard   → GmuxCore.discardSession (the §6.6 "Remove"
 *                          affordance the shell stream appended; wired here
 *                          because Remove is the natural exit from the
 *                          restorable state)
 *   - app:getLoginItem / app:setLoginItem → 'Launch gmux at login' toggle.
 *
 * Import direction: this module imports ../ipc (getGmuxCore). ../ipc imports
 * only the LEAF restore modules (snapshots/restore), never this file — no
 * cycle.
 */

import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { AllInvokeChannel, AllInvokeReq, AllInvokeRes } from '@shared/ipc';
import { getGmuxCore } from '../ipc';
import { getLoginItemState, setLoginItemState } from './login-item';

/** Typed ipcMain.handle wrapper over the full (frozen + appended) map. */
function handle<C extends AllInvokeChannel>(
  ipc: IpcMain,
  channel: C,
  fn: (
    event: IpcMainInvokeEvent,
    ...args: AllInvokeReq<C>
  ) => Promise<AllInvokeRes<C>> | AllInvokeRes<C>
): void {
  ipc.handle(channel, (event, ...args) =>
    fn(event, ...(args as AllInvokeReq<C>))
  );
}

export function registerRestoreIpc(ipc: IpcMain): void {
  handle(ipc, 'sessions:restore', async (_e, sessionId) =>
    (await getGmuxCore()).restoreSession(sessionId)
  );

  handle(ipc, 'sessions:discard', async (_e, sessionId) => {
    const core = await getGmuxCore();
    core.discardSession(sessionId);
    core.broadcastSessions();
  });

  handle(ipc, 'app:getLoginItem', () => getLoginItemState());
  handle(ipc, 'app:setLoginItem', (_e, openAtLogin) =>
    setLoginItemState(openAtLogin)
  );
}
