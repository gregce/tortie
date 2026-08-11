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
  type ReconcileResult
} from './store';

export {
  buildLaunchSpec,
  claudeResumeArgv,
  codexResumeArgv,
  watchForRollout,
  type AgentLaunchSpec,
  type IdCaptureMode,
  type CodexRolloutInfo,
  type RolloutWatch,
  type RolloutWatchOptions
} from './agents';
