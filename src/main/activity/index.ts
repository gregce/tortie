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
  claudeTapStampDir,
  ensureClaudeHookSettings,
  GmuxHookServer,
  hooksEnabled,
  readPreferredHookPort,
  sweepableHookName,
  sweepableStampName,
  withClaudeSettingsFlag,
  writePreferredHookPort,
  type HookServerEvents
} from './hooks';

/**
 * PHASE 311. The question a `PermissionRequest` body is asking. The session
 * core composes it at the ONE place the hook body arrives and hands the words
 * to the monitor; nothing else in main reads a hook body.
 *
 * `QUESTION_MAX` is NOT re-exported. It is one constant with one call site, in
 * the leaf that applies it, and a domain API made out of it would invite a
 * second clip somewhere else.
 */
export { questionFromHookBody } from './question';

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
