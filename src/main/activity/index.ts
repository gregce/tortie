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

export { isTurnBoundary } from './state-machine';

export { toSessionStatus, type ActivityState } from './types';
