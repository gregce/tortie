/**
 * Private tmux server supervisor.
 *
 * gmux's durability layer is a PRIVATE tmux server on socket `-L gmux`,
 * configured ONLY by resources/gmux-tmux.conf — never the user's own tmux
 * server or ~/.tmux.conf (FINAL-REPORT §2.3). This module:
 *
 *   - resolves binary + conf via ./resolve (the ONE resolution module)
 *   - injects the user's real login-shell PATH into the server environment
 *     at boot, BEFORE any session ops — so agent CLIs in ~/.local/bin etc.
 *     spawn correctly inside panes (Phase 9.2 Bug A)
 *   - guarantees a UTF-8 locale in the server environment (Phase 9.2 Bug C:
 *     launchd launches carry no LANG, tmux then draws every non-ASCII cell
 *     as `_` and pane apps degrade to ASCII — see ./env.ts)
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
import { promisify } from 'node:util';
import { DEFAULT_UTF8_LANG, hasUtf8Locale } from './env';
import { gmuxError } from '../errors';
import { classifyTmuxFailure } from './errors';
import { findTmuxBinary, getUserPath, resolveConfPath } from './resolve';

// Re-exported so the barrel (index.ts) and existing callers keep one import
// surface; the implementations live in ./resolve (growth guardrail 3).
export { findTmuxBinary, resolveConfPath } from './resolve';

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// Context: binary + socket + conf
// ---------------------------------------------------------------------------

/**
 * Private socket name. NEVER touch the user's default tmux server.
 *
 * **It stays `gmux` forever — the Tortie rename did not touch it, and nothing
 * later may** (Phase 16.5 hazard 2, CLAUDE.md). This string is not a name, it
 * is an ADDRESS: every session the user has running is on `/tmp/tmux-<uid>/gmux`
 * right now. Change it and the app starts a second, empty server, reports no
 * sessions, and leaves hours of agent work alive but unreachable on a socket
 * nothing connects to any more. There is no upside to weigh against that —
 * the socket name is never shown in the UI.
 */
export const TMUX_SOCKET = 'gmux';

export interface TmuxContext {
  /** Absolute path to the tmux binary. */
  bin: string;
  /** Socket name passed as `-L`. */
  socket: string;
  /** Absolute path to gmux-tmux.conf, passed as `-f` on every invocation. */
  confPath: string;
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
      'tmux is not installed. Tortie needs tmux to keep sessions alive — install it with: brew install tmux',
      'probed /opt/homebrew/bin, /usr/local/bin, /usr/bin and PATH'
    );
  }
  const confPath = resolveConfPath();
  if (!existsSync(confPath)) {
    throw gmuxError(
      'TMUX_NOT_FOUND',
      // Reaches a toast verbatim through errorText() (renderer store), so it
      // is product copy, not a log line: it names Tortie, not the protected
      // filename. The path still travels in `detail`, where a bug report can
      // find it.
      "Tortie's tmux configuration is missing from the application bundle. " +
        'Reinstalling Tortie will restore it.',
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
 * Bug A (Phase 9.2): before any session can be created, the user's real
 * login-shell PATH is captured and injected — into THIS process (so probes
 * and PTYs inherit it) and into the tmux server's global environment (so
 * every pane, and everything agents spawn inside panes, sees it).
 *
 * @throws GmuxError TMUX_NOT_FOUND | TMUX_UNREACHABLE
 */
export function ensureServer(): Promise<TmuxContext> {
  if (ensureInFlight !== null) return ensureInFlight;
  const attempt = (async () => {
    // PATH first: findTmuxBinary/getTmuxContext scan PATH too, and a tmux
    // in an exotic login-shell dir should still be found.
    const userPath = await getUserPath();
    process.env['PATH'] = userPath;

    // Bug C: guarantee a UTF-8 locale BEFORE the server exists — a server
    // spawned from a locale-less launchd env passes C/POSIX to every pane,
    // so zsh/vim/agent TUIs degrade to ASCII and tmux substitutes `_` for
    // non-ASCII glyphs on locale-less clients. Never overrides a real one.
    if (!hasUtf8Locale(process.env)) {
      process.env['LANG'] = DEFAULT_UTF8_LANG;
    }
    const lang = process.env['LANG'];

    const ctx = getTmuxContext();
    let lastFailure = '';
    // start-server is idempotent; health-check with short retries because a
    // cold server needs a beat to create the socket.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await execTmux(['start-server']);
        await execTmux(['list-sessions', '-F', '#{session_id}']);
        // BEFORE any session op: new panes inherit the server's global
        // environment, so agents (and their child git/node/etc.) resolve.
        // Idempotent; also repairs long-lived servers started pre-fix.
        await execTmux(['set-environment', '-g', 'PATH', userPath]);
        // Bug C, same repair logic: future panes must see a UTF-8 locale
        // even on a server that booted from a locale-less launchd env.
        if (lang !== undefined && lang.length > 0) {
          await execTmux(['set-environment', '-g', 'LANG', lang]);
        }
        return ctx;
      } catch (err) {
        lastFailure = err instanceof Error ? err.message : String(err);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw gmuxError(
      'TMUX_UNREACHABLE',
      'Could not start the Tortie session server.',
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
