/**
 * Manifest module barrel — the surface the sessions service / ipc wiring
 * (other streams) import from.
 */

export {
  ManifestStore,
  defaultManifestDbPath,
  toSession,
  type ManifestSessionRecord,
  type ManifestSessionPatch,
  type LiveTmuxSession,
  type ReconcileResult,
  type RestoreAttemptRecord
} from './store';

export {
  buildLaunchSpec,
  claudeResumeArgv,
  codexResumeArgv,
  resolveLaunchSpec,
  type AgentLaunchSpec,
  type IdCaptureMode
} from './agents';

export {
  agentHarvestsId,
  agentRescuesId,
  agentRescuesIdAfterExit,
  isDescendantOf,
  resetProcessParentCache,
  sanitizePiCwd,
  sanitizeQwenCwd,
  watchForSessionId,
  type HarvestContext,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './harvest';
