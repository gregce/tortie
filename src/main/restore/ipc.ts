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
 *   - sessions:resumeInPlace → GmuxCore.resumeSessionInPlace (Phase 141, the
 *                          same verb aimed at a session that is still ALIVE:
 *                          its agent left and its shell carried on, so there
 *                          is nothing to recreate and the recorded resume is
 *                          typed onto the prompt that is already there. It is
 *                          registered beside sessions:restore because the two
 *                          are one verb in two situations, and because both
 *                          type a command and neither presses Enter.
 *   - sessions:listRemoved → GmuxCore.listRemovedSessions (Phase 29, the
 *                          Past Sessions panel's data: discarded rows,
 *                          newest removal first).
 *   - sessions:askRestoreProject → ./ask-open-project.ts (Phase 60, the
 *                          native question before a Past Sessions restore
 *                          opens a project that is not an open tab).
 *   - app:getLoginItem / app:setLoginItem → 'Launch gmux at login' toggle.
 *
 * Import direction: this module imports ../ipc (getGmuxCore). ../ipc imports
 * only the LEAF restore modules (snapshots/restore), never this file — no
 * cycle.
 */

import type { IpcMain } from 'electron';
import { getGmuxCore } from '../sessions';
import { handle } from '../typed-ipc';
import { registerAskRestoreProject } from './ask-open-project';
import { getLoginItemState, setLoginItemState } from './login-item';

export function registerRestoreIpc(ipc: IpcMain): void {
  // Phase 119: the second argument is the capture choice, and it is passed
  // straight through. An old renderer sends nothing and gets the ordinary
  // restore, which is what it has always got.
  handle(ipc, 'sessions:restore', async (_e, sessionId, options) =>
    (await getGmuxCore()).restoreSession(sessionId, options)
  );

  // Phase 141. It ALWAYS resolves. A refusal is an answer a person reads
  // rather than an error, so nothing here throws for a session that is not in
  // the state the last poll described: main re-reads that one session at the
  // moment of the press and comes back with a null landing and the token that
  // says why it typed nothing.
  handle(ipc, 'sessions:resumeInPlace', async (_e, sessionId) =>
    (await getGmuxCore()).resumeSessionInPlace(sessionId)
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

  registerAskRestoreProject(ipc);

  handle(ipc, 'app:getLoginItem', () => getLoginItemState());
  handle(ipc, 'app:setLoginItem', (_e, openAtLogin) =>
    setLoginItemState(openAtLogin)
  );
}
