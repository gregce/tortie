/**
 * src/main/actions — the Runs section's engine room (Phase 46).
 *
 * Public surface, deliberately small:
 *  - `registerActionsIpc` / `disposeActionsIpc` — the four actions:* channels.
 *
 * Everything else (the argv allowlist, the gh spawn, the parser, the watch
 * machine, the service) is an implementation detail of this directory and is
 * imported directly by its tests.
 *
 * Nothing in here imports the sessions domain, so nothing in here can reach
 * the status path. A workflow run is not session behavior, and the frozen
 * rule that only session behavior may raise "needs input" is untouched.
 */

export { registerActionsIpc, disposeActionsIpc } from './ipc';
