/**
 * Restarting a session (Phase 19 item 8).
 *
 * The rule the whole module exists for: nothing is discarded until the
 * replacement exists.
 */

export { recoverLaunchExtras } from './extras';
export { registerRestartIpc } from './ipc';
export { restartSession } from './restart';
export type { RestartHost, RestartOutcome } from './restart';
