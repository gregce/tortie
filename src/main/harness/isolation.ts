/**
 * The safety guard every destructive in-app harness runs before it does
 * anything (Phase 19, integrator).
 *
 * Two harnesses need it. `GMUX_SMOKE=fault-*` kills the app with SIGKILL part
 * way through a write, and `GMUX_SMOKE=power` forces a whole capture pass.
 * Pointed at the real profile or the real tmux socket, either one costs the
 * user their live work. Both were carrying their own copy of this check, the
 * copies had already drifted, and the copy that had drifted was the one in
 * front of the SIGKILL.
 *
 * Two questions, both fatal, both asked before a single session exists.
 *  1. Is this app running on a profile inside the harness's own scratch root?
 *  2. Is it talking to a tmux socket that is not the real one?
 */

import { app } from 'electron';
import { realpathSync, rmSync } from 'node:fs';
import * as tmux from '../tmux';

/** What the guard proved, for the harness to log and to tear down. */
export interface HarnessIsolation {
  /** The scratch root, resolved through symlinks. */
  root: string;
  /** The tmux socket name in use. Never the real one. */
  socket: string;
  /** This launch's userData directory, resolved through symlinks. */
  userData: string;
}

/**
 * Resolve symlinks before comparing two paths.
 *
 * This is load bearing and it is not tidying. On macOS `os.tmpdir()` and
 * `$TMPDIR` answer `/var/folders/…` while Electron reports the same directory
 * as `/private/var/folders/…`, because `/var` is a symlink to `/private/var`.
 * A plain string compare refuses a run that is in fact isolated, which is how
 * `npm run smoke:fault` came to fail all ten of its cases.
 *
 * Resolving does not weaken the guard. A path that cannot be resolved is
 * returned unchanged and still has to pass the same comparison.
 */
function resolvePath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Refuse to run against anything the user owns.
 *
 * @param rootEnvVar the environment variable naming this harness's scratch
 *                   root, e.g. `GMUX_FAULT_ROOT`. It appears in the refusal
 *                   so the person reading it knows which one to set.
 * @throws Error when the root is unset, when this launch's profile is outside
 *         it, or when tmux is pointed at the real socket.
 */
export function assertHarnessIsolation(rootEnvVar: string): HarnessIsolation {
  const rootRaw = process.env[rootEnvVar] ?? '';
  if (rootRaw === '') {
    throw new Error(`${rootEnvVar} is not set. Refusing to run.`);
  }
  const root = resolvePath(rootRaw);
  const userData = resolvePath(app.getPath('userData'));
  if (!userData.startsWith(root)) {
    throw new Error(
      `userData ${userData} is outside ${rootEnvVar} ${root}. Refusing to run.`
    );
  }
  const socket = tmux.getTmuxContext().socket;
  if (socket === tmux.TMUX_SOCKET) {
    throw new Error(
      `tmux socket is "${socket}", the real one. Set GMUX_TMUX_SOCKET and try again.`
    );
  }
  return { root, socket, userData };
}

/**
 * End the server this harness started, and remove the socket file it leaves.
 *
 * THE ORDER IS THE WHOLE POINT, and getting it backwards is what cost the
 * operator 48 live sessions. The socket is resolved and CHECKED first. Only a
 * socket that is not the real one is killed. The earlier copy of this function
 * killed first and checked the name afterwards on the line that unlinks the
 * socket file, so a harness whose isolation guard had already refused went on
 * to end the server it was refusing to touch.
 *
 * Two independent refusals stand between this function and the real server.
 * `execTmux` refuses `kill-server` on socket `gmux` for every caller in the
 * product. This function refuses before it gets there. Either one alone is
 * enough, and both are cheap.
 *
 * A dead server leaves its socket file behind, so the path is read out of tmux
 * itself before the kill and unlinked by exact path afterwards.
 */
export async function teardownHarnessServer(): Promise<void> {
  const socket = tmux.getTmuxContext().socket;
  if (socket === tmux.TMUX_SOCKET) {
    console.error(
      `[gmux] not ending the tmux server: the socket is "${socket}", the real one.`
    );
    return;
  }
  let socketPath = '';
  try {
    socketPath = (
      await tmux.execTmux(['display-message', '-p', '#{socket_path}'])
    ).trim();
  } catch {
    /* server already gone; there may still be a stale file, see below */
  }
  await tmux.execTmux(['kill-server']).catch(() => undefined);
  if (socketPath === '' || !socketPath.endsWith(`/${socket}`)) return;
  rmSync(socketPath, { force: true });
}
