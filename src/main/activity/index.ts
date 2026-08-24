/**
 * Activity domain barrel (Phase 13) — per-agent activity detection, entirely
 * in the main process so HIDDEN sessions report correctly.
 *
 * src/main/ipc.ts owns the timer and the broadcast and consumes exactly this
 * surface; the tiers, the oracles and the state machine live behind it.
 */

export {
  SessionActivityMonitor,
  type ActivityMonitorDeps,
  type ActivitySession,
  type ClaudeConversation,
  type HandbackFact,
  type SessionActivityUpdate
} from './monitor';

export {
  claudeHookDir,
  claudeHookSettingsPath,
  ensureClaudeHookSettings,
  GmuxHookServer,
  hooksEnabled,
  readPreferredHookPort,
  withClaudeSettingsFlag,
  writePreferredHookPort,
  type HookServerEvents
} from './hooks';

export {
  isTurnBoundary,
  offersResume,
  type HandbackOutcome,
  type HandbackState
} from './state-machine';

export { toSessionStatus, type ActivityState } from './types';

/**
 * PHASE 141, exported at integration. The one process table reader, so the
 * session core can hand it to the monitor for the witness alone. See
 * `readProcForWitness` on ActivityMonitorDeps for what that is for and what it
 * costs.
 */
export { readProcSnapshot } from './process';
