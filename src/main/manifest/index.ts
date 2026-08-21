/**
 * Manifest module barrel — the surface the sessions service / ipc wiring
 * (other streams) import from.
 */

export {
  LOCAL_MACHINE_ROW,
  MANIFEST_APPLICATION_ID,
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION,
  ManifestStore,
  defaultManifestDbPath,
  serializeMachineTombstone,
  toSession,
  type MachineTombstone,
  type ManifestSessionRecord,
  type ManifestSessionPatch,
  type UpdateSessionOptions,
  type LiveTmuxSession,
  type ReconcileResult,
  type RestoreAttemptRecord
} from './store';

/**
 * Phase 118. The remote execution journal's shapes. The machine layer composes
 * a begin, reads a record back at boot and names an outcome, so the barrel
 * carries all four rather than making that layer reach past it.
 */
export {
  JOURNALED_REMOTE_EXECUTION_KIND,
  REMOTE_EXECUTION_KINDS,
  REMOTE_EXECUTION_OUTCOMES,
  type MachineTombstoneEntry,
  type MarkMachinesForgottenHooks,
  type RemoteExecutionBegin,
  type RemoteExecutionKind,
  type RemoteExecutionOutcome,
  type RemoteExecutionRecord
} from './store';

/**
 * Phase 90.3. The shape an add of a folder on another machine takes. It is
 * exported from the barrel because the sessions core composes one.
 */
export type { RemoteProjectInput } from './projects-repository';

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
  claimRank,
  conversationClaimant,
  conversationClaimStrength,
  onConversationReclaimed,
  releaseConversationClaims,
  resolveClaimCwd,
  sanitizePiCwd,
  sanitizeQwenCwd,
  watchForSessionId,
  IDENTITY_HARVEST_KEYS,
  type ClaimStrength,
  type ConversationReclaim,
  type HarvestContext,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './harvest';
