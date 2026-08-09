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

export {
  TmuxControlClient,
  CONTROL_SESSION_NAME,
  isControlSession,
  type ControlClientEvents
} from './control-client';

export {
  createSession,
  listSessions,
  renameSession,
  killSession,
  hasSession,
  capturePane,
  setSessionOption,
  getSessionOption,
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
