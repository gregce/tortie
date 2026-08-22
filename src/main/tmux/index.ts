/**
 * tmux core — public surface for the rest of the main process.
 *
 * Typical wiring (ipc.ts / app init):
 *
 *   import * as tmux from './tmux';
 *   await tmux.ensureServer();
 *   const bus = new tmux.TmuxControlClient();
 *   bus.on('sessions-changed', reconcile);
 *   bus.on('session-renamed', syncName);
 *   bus.on('server-exit', offerManifestRestore);   // T2 path
 *   await bus.start();
 *   const info = await tmux.createSession({ displayName, cwd, argv });
 *   // …always target info.sessionId ("$n") from here on.
 */

export {
  ensureServer,
  isServerRunning,
  getTmuxContext,
  resetTmuxContext,
  findTmuxBinary,
  resolveConfPath,
  execTmux,
  // Phase 81: harness only. When the captured PATH reached the server's
  // global environment, which is what GMUX_SMOKE=agent asserts on.
  serverPathPublished,
  tmuxArgs,
  TMUX_SOCKET,
  activeTmuxSocket,
  // Phase 19 item 13: the conf inside the bundle, and the proof it applied.
  assertConfUsable,
  declaredHistoryLimit,
  lastConfVerification,
  verifyHistoryLimit,
  TMUX_BUILTIN_HISTORY_LIMIT,
  type ConfVerification,
  type TmuxContext,
  type ExecTmuxOptions
} from './supervisor';

// Resolution primitives (Phase 9.2 Bug A / Phase 10 detection service) —
// login-shell PATH capture + argv[0] → absolute binary resolution.
export {
  captureLoginShellEnv,
  captureLoginShellPath,
  extraBinDirs,
  fallbackPath,
  getUserPath,
  mergePathDirs,
  resetUserPathCache,
  resolveBinary,
  resolveBinaryAgainst,
  // Phase 49: every hit for one name across the same walk, for the
  // shadowed-copies list in Settings. See src/main/agents/detection.ts.
  resolveBinaryAllAgainst,
  // Phase 48: the counter a cache keys on when its answer was computed against
  // the captured PATH. See src/main/agents/health.ts.
  userPathEpoch,
  // Phase 81: how the last capture settled, and which program it asked. The
  // fallback notice is composed from these two.
  userPathShell,
  userPathSource,
  ENV_CAPTURE_MAX_VALUE_BYTES,
  PATH_CAPTURE_TIMEOUT_MS,
  type CaptureEnvResult,
  type CapturePathOptions
} from './resolve';

// PHASE 81 — the one place this process's PATH is written, and the wait that
// everything able to start a pane takes. `restore/` and `sessions/` reach it
// through this facade, which is the one they already use.
export {
  installUserPath,
  resetUserPathInstallForTests,
  userPathInstalled
} from './user-path';

// Phase 41 — which tmux this process runs, and the one composer for the two
// "there is no tmux to run" messages.
export {
  isPackagedApp,
  planTmuxResolution,
  resetTmuxResolutionWarnings,
  resolveTmux,
  tmuxUnavailableError,
  type TmuxBinarySource,
  type TmuxResolution,
  type TmuxResolutionInput
} from './resolve';

// Phase 41 — the pinned version, the tested pairs, and the gate that runs on a
// warm server before the first attach.
export {
  assertServerVersionUsable,
  decideVersionGate,
  lastVersionGate,
  logCreatedServerVersion,
  parseTmuxVersion,
  readClientVersion,
  readServerVersion,
  resetTmuxVersionState,
  versionBlockDetail,
  versionBlockMessage,
  BUNDLED_TMUX_VERSION,
  TESTED_TMUX_PAIRS,
  TMUX_VERSION_PROBE_TIMEOUT_MS,
  type TmuxExec,
  type TmuxVersionPair,
  type VersionGate
} from './version';

// Phase 69. Which versions Tortie has measured on ANOTHER machine, and the gate
// that fails closed on one it has not. Phase 71 measured the control plane, so
// each row now carries a measurement per plane and there are TWO gates.
// Phase 83 added a third version and a fourth exec outcome, `accepted`, which
// is a version one person accepted for one machine. The control gate takes no
// acceptance and never will.
export {
  decideRemoteControlGate,
  decideRemoteVersionGate,
  joinVersionList,
  TESTED_REMOTE_TMUX_VERSIONS,
  type RemoteControlGate,
  type RemoteVersionGate,
  type TestedRemoteTmux
} from './version';

// Phase 67 — whether one failed list exec CONFIRMED that no server owns the
// socket, or proved nothing. The reconcile boundary in sessions/core.ts is
// the consumer: 'no-server' is the only verdict allowed to flip rows to
// 'restorable'; everything else produces 'unknown'.
export { serverProbeVerdict, type ServerProbeVerdict } from './errors';

// Phase 69. Every option the private server runs with, as ONE list. The local
// boot re-asserts five of them and a machine booted with -f /dev/null needs all
// of them, and both read the same rows so the two cannot drift.
export {
  localReassertOptions,
  remoteBootOptions,
  runtimeValueOf,
  setOptionArgs,
  showOptionArgs,
  SERVER_OPTIONS,
  type ServerOption
} from './server-options';

// Pane environment: the UTF-8 guard (Bug C) and the GMUX_* markers every
// managed pane carries (Phase 12.7 F3).
//
// Phase 133 added the macOS login session number. A pane takes that number from
// the tmux SERVER, which is durable and routinely months old, so a pane used to
// join whichever login session was live when the server first started. Tortie
// now puts its own number on the `new-session` line, where an explicit `-e`
// pair wins. See the measured table on `loginSessionEnv` in ./env.
export {
  managedPaneEnv,
  withUtf8Locale,
  loginSessionEnv,
  MACOS_LOGIN_SESSION_VAR
} from './env';

export {
  TmuxControlClient,
  CONTROL_SESSION_NAME,
  isControlSession,
  quoteTmuxArg,
  type ControlClientEvents
} from './control-client';

// Scrollback over tmux history (Phase 12.3) — the only scroll surface a
// tmux-attached pane has, since `tmux attach` parks xterm.js in its
// alternate buffer where it has no scrollback of its own.
export {
  readPaneScroll,
  anchorPaneScroll,
  scrollPaneBy,
  scrollPaneTo,
  exitPaneScroll,
  type PaneScrollState,
  type TmuxScrollRunner
} from './scroll';

export {
  createSession,
  listSessions,
  renameSession,
  killSession,
  hasSession,
  capturePane,
  clearPaneHistory,
  resolvePaneTarget,
  setSessionOption,
  getSessionOption,
  getSessionEnv,
  type CapturePaneOptions,
  type TmuxSessionInfo,
  type CreateTmuxSessionInput,
  type ListSessionsOptions
} from './sessions';

export {
  sanitizeSessionName,
  dedupeSessionName,
  formatSessionTarget,
  MAX_TMUX_NAME_LENGTH,
  FALLBACK_TMUX_NAME
} from './names';

export {
  parseControlLine,
  unescapeOctal,
  LineBuffer,
  type ControlEvent,
  type BlockGuard
} from './control-parser';

