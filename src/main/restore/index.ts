/**
 * Restore module barrel (Phase 6) — snapshots, tmux-side restore mechanics,
 * login item, and the extension-channel IPC registrar.
 *
 * NOTE: src/main/ipc.ts must import the LEAF modules directly
 * ('./restore/snapshots', './restore/restore') — importing this barrel from
 * there would cycle through ./restore/ipc → ../ipc.
 */

export {
  SNAPSHOT_LINES,
  SNAPSHOT_GENERATIONS,
  CAPSULE_VERSION,
  snapshotsDir,
  snapshotStem,
  snapshotBodyPath,
  snapshotPath,
  capsuleIndexPath,
  legacySnapshotPath,
  classifySnapshotFile,
  existingSnapshotPath,
  readCapsules,
  resolveSnapshot,
  captureSessionSnapshot,
  deleteSnapshot,
  type CaptureSnapshotOptions,
  type SnapshotCapsule,
  type SnapshotFileKind,
  type SnapshotReason,
  type SnapshotResolution
} from './snapshots';

export {
  armableResumeArgv,
  restoreRecordOf,
  restoreSessionInTmux,
  type RestoreOutcome,
  type RestoreSessionOptions,
  type RestoreSuccess
} from './restore';

export {
  isUnrecordedSession,
  resolveRestoreJournal,
  type JournalResolution,
  type LiveIdentity
} from './journal';

export {
  shellQuoteArg,
  shellQuoteArgv,
  buildArmedCommand,
  buildSnapshotReplayCommand,
  trimSnapshotText,
  stripAnsi
} from './command';

export {
  getLoginItemState,
  reconcileLoginItem,
  setLoginItemState,
  type LoginItemReconcile,
  type LoginItemState
} from './login-item';

export { registerRestoreIpc } from './ipc';
