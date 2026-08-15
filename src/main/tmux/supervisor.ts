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
 *   - refuses a conf path that will not do what the caller believes, and then
 *     READS BACK the depth tmux actually set instead of trusting that `-f`
 *     applied (Phase 19 item 13 — see the block above `TmuxContext`)
 *   - provides `execTmux()`, the one door every other tmux module calls
 *     through, with structured error classification
 *
 * WHICH TMUX RUNS (Phase 41). A packaged Tortie runs the pinned tmux inside
 * its own bundle, so a fresh Mac needs nothing installed first. A development
 * build runs the machine's own tmux, which is 3.6a here. ./resolve decides,
 * and it is the only module that does. On a WARM server this module reads the
 * server's version before the first attach and stops the boot when the pair of
 * versions is one this release never tested. See ./version for the
 * measurements behind that.
 */

import { execFile } from 'node:child_process';
import { accessSync, constants, readFileSync, statSync } from 'node:fs';
import { promisify } from 'node:util';
import { DEFAULT_UTF8_LANG, hasUtf8Locale } from './env';
import { gmuxError } from '../errors';
import { classifyTmuxFailure } from './errors';
import { postDurabilityNotice } from '../notice';
import {
  getUserPath,
  resolveConfPath,
  resolveTmux,
  tmuxUnavailableError,
  type TmuxBinarySource
} from './resolve';
import {
  assertServerVersionUsable,
  logCreatedServerVersion,
  resetTmuxVersionState
} from './version';

import { getLog } from '../log';

/**
 * Scope "tmux" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const tmuxLog = getLog('tmux');

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

/**
 * The socket this process will actually use.
 *
 * It is `TMUX_SOCKET` for every launch a user ever makes. `GMUX_TMUX_SOCKET`
 * moves it, and ONLY on a harness launch, because the fault harness has to be
 * able to crash the app mid-write without a single one of the user's live
 * sessions being on the server it is crashing against.
 *
 * The harness gate is the safety property. A `GMUX_TMUX_SOCKET` left in a shell
 * profile would otherwise start the real app against a second, empty server:
 * no sessions listed, hours of agent work alive and unreachable. A normal
 * launch ignores the variable entirely, so that cannot happen.
 *
 * A HARNESS LAUNCH IS `GMUX_SMOKE`, `GMUX_SHOT` OR `GMUX_UPDATE_REHEARSAL`
 * (Phase 24). The first two terms match the definition `src/main/index.ts`
 * uses for the single-instance lock, and those two must keep matching. The
 * definitions disagreed until Phase 22: this function honoured only
 * `GMUX_SMOKE`, so a shot-harness run that created a session put it on the
 * socket carrying the user's live work while printing that the override had
 * been ignored. A Phase 22 verifier hit exactly that and had to remove a
 * session from the real server by hand. `src/renderer/context/shot-probe.ts`
 * ships a shot driver for this view, so the smoke and shot terms have to
 * agree from here on.
 *
 * `GMUX_UPDATE_REHEARSAL` is the deliberate exception, present HERE and
 * absent from the single-instance definition in index.ts. A rehearsal launch
 * must still take the lock. The lock lives in the isolated profile the
 * rehearsal always passes, so it protects the rehearsal without touching the
 * operator's instance. A rehearsal launched WITHOUT `--user-data-dir` is
 * refused by the operator's own running copy, and that refusal is the
 * protective direction.
 *
 * `default` is refused by name. That is the socket of the user's OWN tmux
 * server, which this app never touches.
 */
export function activeTmuxSocket(
  env: NodeJS.ProcessEnv = process.env
): string {
  const want = (env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (want === '') return TMUX_SOCKET;
  const harnessLaunch =
    (env['GMUX_SMOKE'] ?? '') !== '' ||
    (env['GMUX_SHOT'] ?? '') !== '' ||
    (env['GMUX_UPDATE_REHEARSAL'] ?? '') !== '';
  if (!harnessLaunch) {
    tmuxLog.warn(
      'GMUX_TMUX_SOCKET is set but this is not a harness launch, so it is ignored.'
    );
    return TMUX_SOCKET;
  }
  if (want === 'default' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(want)) {
    tmuxLog.warn(
      `GMUX_TMUX_SOCKET="${want}" is not a socket name this app will use.`
    );
    return TMUX_SOCKET;
  }
  return want;
}

// ---------------------------------------------------------------------------
// The conf inside the bundle, and proving it applied (Phase 19 item 13)
// ---------------------------------------------------------------------------
//
// `tmuxArgs` puts `-f <confPath>` on every invocation, and that path is inside
// the application bundle an update replaces. tmux reads the file ONLY when it
// creates the server, and it reports nothing at all when the file is not
// there. MEASURED on tmux 3.6a, on a scratch socket, 2026-08-12:
//
//   $ tmux -L scratch -f /nonexistent/x.conf new-session -d -s probe
//   exit 0, and the session is created
//   $ tmux -L scratch show-options -gv history-limit  →  2000
//                                    -gv exit-empty   →  on
//                                    -gv status       →  on
//                                    -gv remain-on-exit → off
//
// So the loss is not one option, it is four, and the two that are not
// cosmetic are the dangerous ones. `history-limit 2000` throws away 92 % of
// the scrollback depth the product promises. `exit-empty on` makes the whole
// private server exit when the last session closes, which is the durability
// daemon quietly turning itself off.
//
// Passing the real conf afterwards does not repair it. In the same run,
// `tmux -L scratch -f <the real conf> show-options -gv history-limit` still
// answered 2000, because the file is read at server creation and never again.
//
// Two defences, and the second is the one a reviewer would skip. Assert the
// file is usable BEFORE the path is ever passed, and then READ BACK what tmux
// actually set instead of trusting that `-f` applied.

/** tmux's own built-in depth, which is what a server without our conf runs at. */
export const TMUX_BUILTIN_HISTORY_LIMIT = 2000;

/**
 * `set -g history-limit N` as the conf declares it.
 *
 * Parsed from the file rather than hardcoded, because the number in
 * resources/gmux-tmux.conf is the first-boot default and it has already moved
 * once (50,000 to 25,000, Phase 13.7). A constant here would go stale silently
 * and the read-back would then police the wrong number.
 */
export function declaredHistoryLimit(confPath: string): number | null {
  let text: string;
  try {
    text = readFileSync(confPath, 'utf8');
  } catch {
    return null;
  }
  // `set`, `set-option` and `setw` all reach the same option; the flags in
  // between (-g, -s, -gq) vary and none of them changes the value we want.
  const m = /^[ \t]*set(?:-option|w)?[ \t]+(?:-[A-Za-z]+[ \t]+)*history-limit[ \t]+(\d+)/m.exec(
    text
  );
  if (m?.[1] === undefined) return null;
  const value = Number.parseInt(m[1], 10);
  return Number.isFinite(value) ? value : null;
}

/**
 * Refuse to pass a conf path that will not do what the caller believes.
 *
 * `existsSync` alone is not the check. A botched update can leave a zero-byte
 * file, and a zero-byte conf produces exactly the same silent tmux defaults as
 * a missing one while passing an existence test. A directory at that path
 * passes it too.
 *
 * READABILITY IS PART OF THE CHECK, and it was missing until the Phase 19 fix
 * round. Measured: a conf at mode 000 and 3,886 bytes passed a stat plus size
 * test, `tmux start-server -f <it>` exited 0, the server came up on the built
 * in defaults, `exit-empty on` then ended it the moment it was empty, and the
 * app failed with TMUX_UNREACHABLE. The user was told the server would not
 * start, which is the wrong diagnosis for the exact fault this function exists
 * to name. One `accessSync` gives the right one.
 *
 * @throws GmuxError TMUX_NOT_FOUND
 */
export function assertConfUsable(confPath: string): void {
  // Reaches a toast verbatim through errorText() (renderer store), so the
  // message is product copy: it names Tortie, not the protected filename. The
  // path and the reason travel in `detail`, where a bug report finds them.
  const refuse = (detail: string): never => {
    throw gmuxError(
      'TMUX_NOT_FOUND',
      "Tortie's tmux configuration is missing from the application bundle. " +
        'Reinstalling Tortie will restore it.',
      detail
    );
  };
  let info: ReturnType<typeof statSync>;
  try {
    info = statSync(confPath);
  } catch {
    return refuse(`expected at ${confPath}`);
  }
  if (!info.isFile()) return refuse(`${confPath} is not a file`);
  if (info.size === 0) return refuse(`${confPath} is empty (0 bytes)`);
  try {
    accessSync(confPath, constants.R_OK);
  } catch {
    return refuse(`${confPath} exists but cannot be read (permissions)`);
  }
}

/** What the read-back found. */
export interface ConfVerification {
  /** `set -g history-limit N` in the conf, or null when it could not be read. */
  declared: number | null;
  /** What `show-options -gv history-limit` answered, or null when it failed. */
  observed: number | null;
  /** True when the server is running the depth the conf declares. */
  applied: boolean;
  /** True when this call put the declared value back on a server missing it. */
  repaired: boolean;
  /** One line for a log or a bug report. */
  detail: string;
}

let lastVerification: ConfVerification | null = null;

/** The most recent read-back, for a harness or a bug report. Null before boot. */
export function lastConfVerification(): ConfVerification | null {
  return lastVerification;
}

/** One global server option, as a number. Null when tmux would not answer. */
async function readServerOptionNumber(name: string): Promise<number | null> {
  try {
    const out = await execTmux(['show-options', '-gv', name]);
    const value = Number.parseInt(out.trim(), 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** The two tmux calls the read-back makes, injected so it can be tested. */
export interface ConfVerifyDeps {
  readLimit: () => Promise<number | null>;
  setLimit: (lines: number) => Promise<void>;
}

/**
 * Read back the depth tmux actually set, and repair the one case that is
 * provably a lost conf.
 *
 * The repair is deliberately narrow. It fires only when the server was created
 * by THIS call and the depth it came up with is tmux's own built-in 2000 while
 * the conf declares something else. Any other mismatch is a warm server whose
 * depth almost certainly came from the user's own Settings value, and
 * overwriting that would be this function inventing a preference. A warm
 * mismatch is logged and left alone.
 *
 * Note the ordering with the settings value. `GmuxCore` re-asserts
 * `history-limit` from Settings at every boot (BOOT_SERVER_OPTIONS,
 * sessions/core.ts), and it runs after this. So on a cold start this puts the
 * conf's number on a server that lost it, and the user's own number lands a
 * moment later and wins, which is the right order.
 *
 * HOW REACHABLE THE REPAIR IS, stated because a verifier asked and could not
 * make it fire in a whole-app run. It is defence in depth against one narrow
 * race, and that is on purpose.
 *
 *  - A conf that is missing, empty, a directory or unreadable is refused by
 *    `assertConfUsable` before the path is ever passed, so no server is
 *    created and this function is not the thing that reports it.
 *  - A WARM server is excluded by design, because there the observed depth is
 *    the user's own Settings value.
 *  - What is left is the case the whole block is written for: macOS replaces
 *    the .app directory underneath a running process, so the conf can vanish
 *    in the milliseconds between `assertConfUsable` and `start-server`. That
 *    window is real and it is small.
 *
 * The repair is exercised through the injected `ConfVerifyDeps`, which is the
 * seam this function was given for exactly that reason. The one option that IS
 * repaired on every boot, warm or cold, is `exit-empty`, and that one is
 * driven in a real app run. See BOOT_SERVER_OPTIONS in sessions/core.ts.
 */
export async function verifyHistoryLimitWith(
  confPath: string,
  serverWasAlreadyRunning: boolean,
  deps: ConfVerifyDeps
): Promise<ConfVerification> {
  const declared = declaredHistoryLimit(confPath);
  let observed = await deps.readLimit();
  let repaired = false;

  const coldStartLostItsConf =
    !serverWasAlreadyRunning &&
    declared !== null &&
    declared !== TMUX_BUILTIN_HISTORY_LIMIT &&
    observed === TMUX_BUILTIN_HISTORY_LIMIT;

  if (coldStartLostItsConf) {
    tmuxLog.error(
      `the tmux server started WITHOUT ${confPath}: it came up at ` +
        `history-limit ${TMUX_BUILTIN_HISTORY_LIMIT} instead of ${declared}. ` +
        'Setting the declared depth on it now.'
    );
    try {
      await deps.setLimit(declared);
    } catch (err) {
      tmuxLog.warn(
        `could not repair history-limit: ${(err as Error).message}`
      );
    }
    observed = await deps.readLimit();
    repaired = observed === declared;
  }

  const applied = declared !== null && observed === declared;
  const detail =
    observed === null
      ? 'tmux would not report history-limit'
      : `history-limit declared ${declared ?? 'unknown'}, server reports ${observed}` +
        (repaired ? ' (repaired on this boot)' : '') +
        (serverWasAlreadyRunning ? ' (server was already running)' : '');

  // Said out loud on every boot, pass or fail. A verification nobody can read
  // is not evidence, and this is the one line that shows the depth the server
  // is ACTUALLY running at rather than the one the conf asked for.
  //
  // The one silent case is a warm server that stopped answering between the
  // health check and this read. That is the control client's reconnect loop
  // racing a server that has gone away, it says nothing about the conf, and
  // logging it would put a scary line in front of a user for a transient.
  if (applied) {
    console.log(`[gmux] tmux conf verified: ${detail}`);
  } else if (!serverWasAlreadyRunning) {
    tmuxLog.warn(`tmux conf did not apply: ${detail}`);
    // Items 9 and 13. Told to the user, not only to the log, because the
    // consequence is that every session on this boot keeps a fraction of the
    // scrollback the product promises and nothing else would say so.
    //
    // A WARM server is deliberately excluded. There the observed depth is the
    // user's own Settings value, so calling it degraded would be an alarm
    // about a preference they set. The cold case that reaches here is one the
    // repair above already tried and failed to fix, so it is a real loss.
    if (declared !== null && observed !== null && observed !== declared) {
      postDurabilityNotice({
        kind: 'depth-degraded',
        actualLines: observed,
        requestedLines: declared
      });
    }
  } else if (observed !== null) {
    console.log(`[gmux] tmux conf read-back: ${detail}`);
  }
  lastVerification = { declared, observed, applied, repaired, detail };
  return lastVerification;
}

/** `verifyHistoryLimitWith` against the private server. */
export function verifyHistoryLimit(
  confPath: string,
  serverWasAlreadyRunning: boolean
): Promise<ConfVerification> {
  return verifyHistoryLimitWith(confPath, serverWasAlreadyRunning, {
    readLimit: () => readServerOptionNumber('history-limit'),
    setLimit: async (lines) => {
      await execTmux(['set-option', '-g', 'history-limit', String(lines)]);
    }
  });
}

export interface TmuxContext {
  /** Absolute path to the tmux binary. */
  bin: string;
  /** Socket name passed as `-L`. */
  socket: string;
  /** Absolute path to gmux-tmux.conf, passed as `-f` on every invocation. */
  confPath: string;
  /** Where that binary came from (Phase 41), for the log and the error copy. */
  binSource: TmuxBinarySource;
  /** True when this is a packaged Tortie. */
  packaged: boolean;
}

let cachedContext: TmuxContext | null = null;

/**
 * Resolve (and cache) the tmux invocation context.
 *
 * @throws GmuxError TMUX_BUNDLE_INCOMPLETE when a packaged Tortie has no tmux
 *   inside its own bundle, TMUX_NOT_FOUND when a development build finds none
 *   on the machine. The sentence for each is composed in ./resolve, which is
 *   the one place both of them are written.
 */
export function getTmuxContext(): TmuxContext {
  if (cachedContext !== null) return cachedContext;
  const res = resolveTmux();
  if (res.path === null) throw tmuxUnavailableError(res);
  const confPath = resolveConfPath();
  // Phase 19 item 13: exists, is a file, and is not empty. A zero-byte conf
  // left by a half-written update starts a tmux server on the built-in
  // defaults exactly as a missing one does, and passes an existence test.
  assertConfUsable(confPath);
  cachedContext = {
    bin: res.path,
    socket: activeTmuxSocket(),
    confPath,
    binSource: res.source,
    packaged: res.packaged
  };
  return cachedContext;
}

/** Test/reset hook (e.g. after surfacing TMUX_NOT_FOUND and a user install). */
export function resetTmuxContext(): void {
  cachedContext = null;
  // Phase 41: the version gate remembers a PASS for the life of the process,
  // and a reset means the next boot resolves a binary again, so the remembered
  // answer is about a world that may no longer be the current one.
  resetTmuxVersionState();
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

/**
 * tmux verbs that end the whole server and every session on it at once.
 *
 * `kill-server` is the only one today. It is listed as a set rather than a
 * string compare so a later verb of the same weight is added in one place.
 */
const SERVER_DESTROYING_VERBS = new Set(['kill-server']);

/**
 * Refuse a verb that would end the real server (Phase 19 fix round).
 *
 * THE INCIDENT THIS CLOSES. `src/main/power/smoke.ts` called `kill-server` from
 * its own failure path and checked the socket name AFTERWARDS, on the line that
 * unlinks the socket file. So a harness that had already printed "refusing to
 * run" went on to kill the server it was refusing to touch. Reproduced on a
 * scratch socket by two verifiers, and the operator lost 48 live sessions the
 * same evening.
 *
 * The check belongs here rather than in the caller. `execTmux` is the one door
 * every tmux command in the product goes through, and it already resolves the
 * socket, so this is the only place that can answer the question for every
 * caller including the ones written after today.
 *
 * The shipped app never needs this verb. Sessions are killed one at a time, by
 * identity. A harness that genuinely wants a whole server gone is on its own
 * socket, and there the check passes.
 */
function assertVerbAllowedOnSocket(verb: string, socket: string): void {
  if (!SERVER_DESTROYING_VERBS.has(verb) || socket !== TMUX_SOCKET) return;
  throw gmuxError(
    'INVALID_INPUT',
    'Tortie does not end the session server.',
    `refused "tmux ${verb}" on the real socket -L ${socket}: it would end every ` +
      'session on this machine. Move the harness to its own socket with ' +
      'GMUX_TMUX_SOCKET.'
  );
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
  // Asked BEFORE the context is resolved, because the refusal must not depend
  // on the conf being present or on Electron being up. Asked again below
  // against the resolved socket, because the context is cached and a cached
  // answer is the one the command will actually use.
  assertVerbAllowedOnSocket(args[0] ?? '', activeTmuxSocket());
  const ctx = getTmuxContext();
  assertVerbAllowedOnSocket(args[0] ?? '', ctx.socket);
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
      // The binary vanished since we cached it. Phase 41: which sentence the
      // user gets depends on which build this is, so the one composer decides
      // rather than a second literal here. A packaged Tortie has lost part of
      // its own install; a development build has lost the machine's tmux.
      const gone = {
        path: null,
        source: ctx.binSource,
        packaged: ctx.packaged,
        detail: `${ctx.bin} was there when Tortie started and it is gone now`
      };
      resetTmuxContext();
      throw tmuxUnavailableError(gone);
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
    // Phase 19 item 13. `getTmuxContext` caches, and it asserts the conf once
    // at the instant it first resolves the path. That is not enough on its
    // own: on macOS an update replaces the .app directory underneath a
    // running process, so a path that was there at boot can be gone by the
    // time a later ensureServer creates a server with it. Re-assert against
    // the disk every time, immediately before the path is used. One statSync.
    assertConfUsable(ctx.confPath);
    // Was there a server before we touched it? The read-back below repairs a
    // lost conf only on a COLD start, because on a warm server a differing
    // depth is the user's own Settings value and not a defect.
    const serverWasAlreadyRunning = await isServerRunning();

    // PHASE 41, and where this block sits is the design.
    //
    // A tmux server outlives the app that made it, so the copy of Tortie
    // starting now can meet a server an older copy created. Across a version
    // boundary tmux can hang rather than fail: MEASURED, a 3.7b control client
    // against a 3.5a server prints "%exit" and then sits there, still running
    // after 8 s. The first thing GmuxCore.boot does after this function
    // returns is exactly that control mode attach, so the read has to happen
    // HERE, before the start loop, or it happens after the freeze.
    //
    // It runs on a warm server only. A server this process is about to create
    // will run the binary this process resolved, so there is no pair to check.
    if (serverWasAlreadyRunning) {
      await assertServerVersionUsable({
        exec: execTmux,
        bin: ctx.bin,
        socket: ctx.socket,
        packaged: ctx.packaged
      });
    }

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
        // Phase 19 item 13, the half a reviewer skips: `-f` exiting 0 is not
        // evidence that the conf applied. Ask the server what depth it is
        // actually running at.
        await verifyHistoryLimit(ctx.confPath, serverWasAlreadyRunning);
        // Phase 41. On the cold path only, say which tmux is now holding this
        // user's sessions. It also means every ordinary development run
        // exercises the same `#{version}` read the warm path depends on.
        if (!serverWasAlreadyRunning) {
          await logCreatedServerVersion({
            exec: execTmux,
            bin: ctx.bin,
            source: ctx.binSource
          });
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
