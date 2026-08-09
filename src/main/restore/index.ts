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
  snapshotsDir,
  snapshotPath,
  existingSnapshotPath,
  captureSessionSnapshot,
  deleteSnapshot
} from './snapshots';

export { restoreSessionInTmux, type RestoreOutcome } from './restore';

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
  setLoginItemState,
  type LoginItemState
} from './login-item';

export { registerRestoreIpc } from './ipc';
