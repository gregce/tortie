/**
 * Private tmux server supervisor.
 *
 * gmux's durability layer is a PRIVATE tmux server on socket `-L gmux`,
 * configured ONLY by resources/gmux-tmux.conf — never the user's own tmux
 * server or ~/.tmux.conf (FINAL-REPORT §2.3). This module:
 *
 *   - locates the tmux binary (GUI-launched Electron inherits a minimal PATH)
 *   - resolves the conf path for dev vs packaged builds
 *   - starts the server idempotently (`start-server`) and health-checks it
 *   - provides `execTmux()`, the one door every other tmux module calls
 *     through, with structured error classification
 *
 * NOTE: we run the SYSTEM tmux (3.6a on this machine). Bundling a pinned
 * tmux inside gmux.app is out of scope today — see FINAL-REPORT §5 Stream A1
 * for the shipping plan.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { app } from 'electron';
import { classifyTmuxFailure, gmuxError } from './errors';

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// Context: binary + socket + conf
// ---------------------------------------------------------------------------

/** Private socket name. NEVER touch the user's default tmux server. */
export const TMUX_SOCKET = 'gmux';

export interface TmuxContext {
  /** Absolute path to the tmux binary. */
  bin: string;
  /** Socket name passed as `-L`. */
  socket: string;
  /** Absolute path to gmux-tmux.conf, passed as `-f` on every invocation. */
  confPath: string;
}

/** Resolve resources/gmux-tmux.conf for dev vs packaged builds. */
export function resolveConfPath(): string {
  // Packaged: electron-builder copies resources/gmux-tmux.conf → Resources/.
  // Dev / `electron .`: repo-root resources/.
  return app.isPackaged
    ? join(process.resourcesPath, 'gmux-tmux.conf')
    : join(app.getAppPath(), 'resources', 'gmux-tmux.conf');
}

/**
 * Locate tmux. GUI-launched Electron apps inherit a minimal PATH (no
 * /opt/homebrew/bin), so probe known locations first, then scan PATH.
 */
export function findTmuxBinary(): string | null {
  const known = [
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/usr/bin/tmux'
  ];
  for (const candidate of known) {
    if (existsSync(candidate)) return candidate;
  }
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir.length === 0) continue;
    const candidate = join(dir, 'tmux');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

let cachedContext: TmuxContext | null = null;

/**
 * Resolve (and cache) the tmux invocation context.
 * @throws GmuxError TMUX_NOT_FOUND when no tmux binary exists on this machine.
 */
export function getTmuxContext(): TmuxContext {
  if (cachedContext !== null) return cachedContext;
  const bin = findTmuxBinary();
  if (bin === null) {
    throw gmuxError(
      'TMUX_NOT_FOUND',
      'tmux is not installed. gmux needs tmux to keep sessions alive — install it with: brew install tmux',
      'probed /opt/homebrew/bin, /usr/local/bin, /usr/bin and PATH'
    );
  }
  const confPath = resolveConfPath();
  if (!existsSync(confPath)) {
    throw gmuxError(
      'TMUX_NOT_FOUND',
      'gmux-tmux.conf is missing from the application bundle.',
      `expected at ${confPath}`
    );
  }
  cachedContext = { bin, socket: TMUX_SOCKET, confPath };
  return cachedContext;
}

/** Test/reset hook (e.g. after surfacing TMUX_NOT_FOUND and a user install). */
export function resetTmuxContext(): void {
  cachedContext = null;
}

/** Build a full tmux argv: `-L gmux -f <conf> …rest`. */
export function tmuxArgs(ctx: TmuxContext, rest: readonly string[]): string[] {
  return ['-L', ctx.socket, '-f', ctx.confPath, ...rest];
}

// ---------------------------------------------------------------------------
// execTmux — the one door
// ---------------------------------------------------------------------------

export interface ExecTmuxOptions {
  /** Milliseconds before the command is killed. Default 10s. */
  timeoutMs?: number;
}

/** capture-pane of 50k colored lines can be many MB; be generous. */
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/**
 * Run one tmux command against the private server and return stdout.
 * Failures are classified into structured GmuxErrors (server down →
 * TMUX_UNREACHABLE, bad target → SESSION_NOT_FOUND, …).
 */
export async function execTmux(
  args: readonly string[],
  options: ExecTmuxOptions = {}
): Promise<string> {
  const ctx = getTmuxContext();
  const argv = tmuxArgs(ctx, args);
  try {
    const { stdout } = await execFileP(ctx.bin, argv, {
      timeout: options.timeoutMs ?? 10_000,
      maxBuffer: MAX_BUFFER_BYTES,
      env: process.env
    });
    return stdout;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    if (e.code === 'ENOENT') {
      resetTmuxContext(); // binary vanished since we cached it
      throw gmuxError('TMUX_NOT_FOUND', 'The tmux binary disappeared.', ctx.bin);
    }
    throw classifyTmuxFailure(
      e.stderr ?? '',
      `tmux ${args[0] ?? ''} failed: ${e.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

/** True when the private server answers `list-sessions` (even with zero). */
export async function isServerRunning(): Promise<boolean> {
  try {
    await execTmux(['list-sessions', '-F', '#{session_id}']);
    return true; // exit-empty off ⇒ zero sessions still answers with exit 0
  } catch {
    return false;
  }
}

let ensureInFlight: Promise<TmuxContext> | null = null;

/**
 * Ensure the private tmux server is up (idempotent, safe to call often;
 * concurrent callers share one attempt). `start-server` with `-f` applies
 * gmux-tmux.conf only when it actually creates the server — an already
 * running server keeps its config, which is exactly what we want.
 *
 * @throws GmuxError TMUX_NOT_FOUND | TMUX_UNREACHABLE
 */
export function ensureServer(): Promise<TmuxContext> {
  if (ensureInFlight !== null) return ensureInFlight;
  const attempt = (async () => {
    const ctx = getTmuxContext();
    let lastFailure = '';
    // start-server is idempotent; health-check with short retries because a
    // cold server needs a beat to create the socket.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await execTmux(['start-server']);
        await execTmux(['list-sessions', '-F', '#{session_id}']);
        return ctx;
      } catch (err) {
        lastFailure = err instanceof Error ? err.message : String(err);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw gmuxError(
      'TMUX_UNREACHABLE',
      'Could not start the gmux session server.',
      lastFailure
    );
  })();
  ensureInFlight = attempt;
  // Allow future retries after settle (a dead server can be restarted by
  // calling ensureServer again). Both arms handled ⇒ no unhandled rejection.
  attempt.then(
    () => {
      ensureInFlight = null;
    },
    () => {
      ensureInFlight = null;
    }
  );
  return attempt;
}
