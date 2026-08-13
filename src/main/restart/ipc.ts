/**
 * The restart channel (Phase 19 item 8).
 *
 * Separate from ./restart so the transactional function stays free of Electron
 * and of the session core, which is what lets its tests drive it against a
 * fake host and force the create to throw at each step.
 */

import type { IpcMain } from 'electron';
import { getGmuxCore } from '../sessions';
import { handle } from '../typed-ipc';
import { restartSession } from './restart';

export function registerRestartIpc(ipc: IpcMain): void {
  handle(ipc, 'sessions:restart', async (_e, sessionId) => {
    const core = await getGmuxCore();
    const outcome = await restartSession(core, sessionId);
    return outcome.session;
  });
}
