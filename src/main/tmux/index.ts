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
  type TmuxContext,
  type ExecTmuxOptions
} from './supervisor';

// Resolution primitives (Phase 9.2 Bug A / Phase 10 detection service) —
// login-shell PATH capture + argv[0] → absolute binary resolution.
export {
  captureLoginShellPath,
  extraBinDirs,
  fallbackPath,
  getUserPath,
  mergePathDirs,
  resetUserPathCache,
  resolveBinary,
  resolveBinaryAgainst,
  PATH_CAPTURE_TIMEOUT_MS,
  type CapturePathOptions
} from './resolve';

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

export { GmuxError, gmuxError, isGmuxError } from './errors';
