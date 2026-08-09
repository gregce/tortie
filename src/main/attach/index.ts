/**
 * gmux attach host — public surface for the ipc/session wiring.
 *
 * INTEGRATOR wiring (src/main/ipc.ts, owned by another stream):
 *
 *   const attachHost = new AttachHost({
 *     tmuxBin: tmuxSupervisor.binPath,      // optional; probes if omitted
 *     onExit: (sessionId, exitCode, expected) => {
 *       if (!expected) sessionManager.reconcile(sessionId); // → 'exited'?
 *     }
 *   });
 *
 *   ipcMain.handle('sessions:attach', (e, sessionId) => {
 *     const s = manifest.get(sessionId);            // throw SESSION_NOT_FOUND
 *     attachHost.attach({ sessionId, tmuxName: s.tmuxName, sender: e.sender });
 *   });
 *   ipcMain.handle('sessions:detach', (_e, sessionId) =>
 *     attachHost.detach(sessionId));
 *   ipcMain.handle('sessions:resize', (_e, { sessionId, cols, rows }) =>
 *     attachHost.resize(sessionId, cols, rows));
 *   app.on('before-quit', () => attachHost.disposeAll()); // sessions survive
 *
 * term:input:<id> and term:ack:<id> listeners are registered/removed by the
 * AttachHost itself — ipc.ts does not need to touch per-session channels.
 */

export { AttachHost } from './attach-host';
export type { AttachHostOptions, AttachRequest } from './attach-host';
