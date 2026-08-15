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
  ENV_CAPTURE_MAX_VALUE_BYTES,
  PATH_CAPTURE_TIMEOUT_MS,
  type CaptureEnvResult,
  type CapturePathOptions
} from './resolve';

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

// Pane environment: the UTF-8 guard (Bug C) and the GMUX_* markers every
// managed pane carries (Phase 12.7 F3).
export { managedPaneEnv, withUtf8Locale } from './env';

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

