/**
 * Manifest module barrel — the surface the sessions service / ipc wiring
 * (other streams) import from.
 */

export {
  MANIFEST_APPLICATION_ID,
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION,
  ManifestStore,
  defaultManifestDbPath,
  toSession,
  type ManifestSessionRecord,
  type ManifestSessionPatch,
  type UpdateSessionOptions,
  type LiveTmuxSession,
  type ReconcileResult,
  type RestoreAttemptRecord
} from './store';

/**
 * The persistence half of the recovery contract (Phase 21, migration 008).
 * The SHAPES are exported from './agents' just below, beside the code that
 * composes them.
 */
export {
  UNRECORDED_PROVENANCE,
  isUnrecordedProvenance,
  parseAgentContract,
  parseResumeProvenance,
  provenanceOf,
  serializeAgentContract,
  serializeResumeProvenance
} from './contract';

/**
 * The persistence half of the launch context snapshot (Phase 22, migration
 * 009). The SHAPE is in `src/shared/context-snapshot.ts`, because the renderer
 * compares it.
 */
export {
  parseContextSnapshot,
  serializeContextSnapshot
} from './context-snapshot';

export {
  buildLaunchSpec,
  buildRecoveryContract,
  claudeResumeArgv,
  codexResumeArgv,
  deriveResumeConfidence,
  harvestProvenance,
  launchProvenance,
  resolveLaunchSpec,
  SESSION_CONTRACT_VERSION,
  type AgentLaunchSpec,
  type AgentRecoveryContract,
  type IdCaptureMode,
  type RecoveryContractInput,
  type ResumeConfidence,
  type ResumeIdSource,
  type ResumeProvenance
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
  type KeptPreSchemaCopy,
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
  claimConversationId,
  conversationClaimant,
  conversationClaimStrength,
  onConversationReclaimed,
  releaseConversationClaims,
  sanitizePiCwd,
  sanitizeQwenCwd,
  watchForSessionId,
  type ClaimStrength,
  type ConversationReclaim,
  type HarvestContext,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './harvest';
