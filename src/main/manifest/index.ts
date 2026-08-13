/**
 * Manifest module barrel — the surface the sessions service / ipc wiring
 * (other streams) import from.
 */

export {
  MANIFEST_MIGRATION_NAMES,
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
  backupBodyPath,
  backupBodyVerifies,
  backupIndexPath,
  backupsDir,
  captureManifestBackup,
  describeBackupRing,
  listBackupBodies,
  pruneBackupRing,
  readBackupIndex,
  readDatabaseEvidence,
  resolveVerifiedBackup,
  restoreFromBackup,
  snapshotDatabase,
  BACKUP_CAPSULE_VERSION,
  BACKUP_GENERATIONS,
  BACKUP_STEM,
  type BackupCapsule,
  type BackupCaptureResult,
  type BackupFaultHook,
  type BackupFaultPoint,
  type BackupPruneResult,
  type BackupReason,
  type BackupResolution,
  type BackupRestoreResult,
  type DatabaseEvidence,
  type DatabaseSnapshotResult
} from './recovery';

export {
  ManifestRingSchedule,
  RING_MIN_GAP_MS,
  RING_POLL_MS,
  RING_REASONS,
  pendingMigrationNames,
  ringFromRecovery,
  takePreMigrationGeneration,
  type PreMigrationOutcome,
  type RingReason,
  type RingScheduleState,
  type RingTakeResult,
  type TakeGeneration
} from './ring-schedule';

export {
  prepareManifestForBoot,
  startManifestRing,
  type ManifestBootReport
} from './boot';

export {
  RECONSTRUCTION_ACKNOWLEDGEMENT,
  RECONSTRUCTION_BODY_NAME,
  applyReconstruction,
  defaultReconstructionRoot,
  summarizePlan,
  surveyReconstruction,
  type CandidateDecision,
  type ReconstructionConsent,
  type ReconstructionPlan,
  type ReconstructionResult
} from './reconstruct';

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
