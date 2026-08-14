/**
 * Restore-stream IPC registration (Phase 6).
 *
 * Registers the appended extension channels the restore UI feature-detects:
 *   - sessions:restore   → GmuxCore.restoreSession (snapshot replay + armed
 *                          resume; §2.4 Step 3)
 *   - sessions:discard   → GmuxCore.removeSession (the §6.6 "Remove"
 *                          affordance the shell stream appended; wired here
 *                          because Remove is the natural exit from the
 *                          restorable state). Since Phase 29 the verb writes
 *                          the tombstone rather than deleting the row; the
 *                          CHANNEL NAME does not change, because renaming a
 *                          shipped channel breaks an old preload for nothing.
 *   - sessions:listRemoved → GmuxCore.listRemovedSessions (Phase 29, the
 *                          Past Sessions panel's data: discarded rows,
 *                          newest removal first).
 *   - app:getLoginItem / app:setLoginItem → 'Launch gmux at login' toggle.
 *
 * Import direction: this module imports ../ipc (getGmuxCore). ../ipc imports
 * only the LEAF restore modules (snapshots/restore), never this file — no
 * cycle.
 */

import type { IpcMain } from 'electron';
import { getGmuxCore } from '../sessions';
import { handle } from '../typed-ipc';
import { getLoginItemState, setLoginItemState } from './login-item';

export function registerRestoreIpc(ipc: IpcMain): void {
  handle(ipc, 'sessions:restore', async (_e, sessionId) =>
    (await getGmuxCore()).restoreSession(sessionId)
  );

  handle(ipc, 'sessions:discard', async (_e, sessionId) => {
    const core = await getGmuxCore();
    core.removeSession(sessionId);
    // What makes the removed row leave the rail immediately: listSessions
    // filters tombstones out.
    core.broadcastSessions();
  });

  handle(ipc, 'sessions:listRemoved', async () =>
    (await getGmuxCore()).listRemovedSessions()
  );

  handle(ipc, 'app:getLoginItem', () => getLoginItemState());
  handle(ipc, 'app:setLoginItem', (_e, openAtLogin) =>
    setLoginItemState(openAtLogin)
  );
}
