/**
 * The loopback hook channel (Phase 13, research 18 §3).
 *
 * FRAMING FIRST, because it decides how defensive this code has to be:
 * claude, codex and shells are already fully covered with ZERO injection
 * (§2 of the research). Hooks are a latency upgrade — claude's
 * `UserPromptSubmit` lands +14 ms where its pid file lands within the same
 * second — and nothing here may ever be load-bearing. Every path degrades
 * silently to the pid-file oracle and the universal floor.
 *
 * Only claude ships. It supports `type:"http"` hooks natively, so an event
 * costs zero subprocesses, and `--settings` is a SETTINGS SOURCE alongside the
 * user's and the project's rather than a replacement for them. Codex hooks are
 * deliberately NOT implemented: they need `--dangerously-bypass-hook-trust`,
 * which paints a permanent yellow banner in the TUI, and codex's pane title is
 * already a perfect three-state oracle, so the banner would buy nothing.
 *
 * PHASE 182 CORRECTED ONE WORD OF THAT PARAGRAPH, and the correction is the
 * whole reason the tap below can refuse to install. `--settings` merges ACROSS
 * KEYS and not within one: Claude Code resolves its five sources in the order
 * user, project, local, flag, policy, and for a given key the highest source
 * that names it wins outright. `hooks` blocks from several sources do run
 * together, which is why Phase 13's paragraph read true for three years of
 * this file's life. A `statusLine` is one command and one winner, measured in
 * docs/research/72 section 10.2: a flag file naming script A beside a project
 * file naming script B ran A twice and never created B's log at all.
 *
 * PHASE 182: THE USAGE TAP RIDES THIS FILE and adds nothing of its own. The
 * settings file is written here already, the loopback server is bound here
 * already, and the session's 128 bit token is in that file already, so the
 * tap is one more key in the JSON, one more route on the server, and a small
 * shell script under the same directory. The script and the wire shape are
 * src/main/usage/statusline.ts; what a post DOES is src/main/usage/service.ts;
 * what is here is the writing, the switch and the refusal.
 *
 * NOTHING outside gmux's own userData is ever written — not `~/.claude`, not
 * `~/.codex/config.toml`, not `~/.zshrc`.
 *
 * DURABILITY RULE (this one is not optional). `claude --settings <path>`
 * REFUSES TO START when the file is missing:
 *
 *     $ claude --settings /tmp/gone.json -p hi
 *     Error: Settings file not found: /tmp/gone.json
 *
 * and gmux bakes that flag into BOTH argv and the armed resumeArgv, which
 * outlive the app by design. So the file is (re)written before every launch,
 * before every restore, and for every live claude session at boot — and if
 * it cannot be written, the flag is simply left off the argv. A session's
 * ability to start must never depend on a file the app owns.
 */

import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import { getLog } from '../log';
import { getSettings } from '../settings/store';
import {
  claudeStatusLineScript,
  statusLineBlock,
  textNamesStatusLine,
  TAP_BODY_CAP_BYTES
} from '../usage/statusline';
import type { ActivityState } from './types';

/**
 * Scope "usage", the same one src/main/usage writes under, because every line
 * this file adds is about the tap. A dropped post is a provider word and a
 * fixed reason and NEVER a body, a token or a number.
 */
const log = getLog('usage');

/** Set GMUX_DISABLE_AGENT_HOOKS=1 to launch agents with no injection at all. */
export function hooksEnabled(): boolean {
  return process.env['GMUX_DISABLE_AGENT_HOOKS'] !== '1';
}

// ---------------------------------------------------------------------------
// Event mapping
// ---------------------------------------------------------------------------

/**
 * Measured latencies (PROBE A): `UserPromptSubmit` +14 ms after Enter,
 * `PermissionRequest` +43–58 ms after `PreToolUse`.
 *
 * `Notification` is deliberately absent: it is debounced ~6 s after a
 * permission request and its idle variant fires a full 60 s after `Stop`, so
 * it is a nudge, never a state.
 */
const EVENT_STATE: Readonly<Record<string, ActivityState>> = {
  UserPromptSubmit: 'working',
  PermissionRequest: 'needs_input',
  PostToolUse: 'working',
  Stop: 'idle'
};

export function stateForHookEvent(event: string): ActivityState | undefined {
  // Own-property check: the event name arrives off the wire, and a bare
  // index would hand back Object.prototype members for "toString" and friends.
  return Object.hasOwn(EVENT_STATE, event) ? EVENT_STATE[event] : undefined;
}

/**
 * Payloads carrying `agent_id` / `agent_type` come from a SUBAGENT and must
 * not move the top-level session's status.
 */
export function isSubagentPayload(body: string): boolean {
  if (body.length === 0) return false;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed === null || typeof parsed !== 'object') return false;
    const obj = parsed as Record<string, unknown>;
    return obj['agent_id'] !== undefined || obj['agent_type'] !== undefined;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The server
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 64 * 1024;

export interface HookServerEvents {
  onEvent(sessionId: string, state: ActivityState, event: string): void;
  /** SessionEnd — drop any tier-0 state held for this session. */
  onSessionEnd(sessionId: string): void;
  /**
   * Phase 182: a form encoded usage post from this session's managed status
   * line. The body is handed over RAW and unparsed, because what a sample
   * means is an ingest question and it is answered in src/main/usage/service.
   * Absent on a wiring that wants no tap, and then `/u/` is a 404 like any
   * other unknown route.
   */
  onTap?(sessionId: string, body: string): void;
}

/**
 * PHASE 200. How long `stop()` waits for the requests it had already accepted
 * before it cuts their sockets, and how long it then waits for the listener's
 * own close callback. Both are wedge guards rather than expected waits: an
 * ordinary quit has nothing in flight and pays neither.
 */
export const HOOK_STOP_JOIN_MS = 500;
export const HOOK_STOP_CLOSE_MS = 500;

/** What one `stop()` did, for the log and for the tests. */
export interface HookStopReport {
  /** Requests this server had accepted and not finished when stop began. */
  accepted: number;
  /** True when they all settled inside the bound rather than being cut. */
  joined: boolean;
  waitedMs: number;
}

/**
 * Await `work`, but never longer than `ms`. Answers true when the work won.
 * The timer is unref'd, so it is never the reason a quit stays alive.
 */
async function settleWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
    timer.unref?.();
  });
  try {
    return await Promise.race([work.then(() => true), expired]);
  } catch {
    return true;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * 127.0.0.1 only, 128-bit per-session token in the PATH, `Host` checked,
 * bodies capped, and never a line of payload in the log — hook payloads
 * contain the user's prompt text.
 */
export class GmuxHookServer {
  private server: Server | null = null;
  private readonly tokens = new Map<string, string>(); // token → sessionId
  private port = 0;
  /**
   * PHASE 200. Shutdown admission. It is set on the FIRST LINE of `stop()`,
   * before any await, and it is what makes this a resource owner rather than
   * a socket somebody closed. From that instant no request is admitted and no
   * accepted request may deliver an event, so nothing downstream, being the
   * activity store and the usage service, can be reached by work this server
   * had already taken in. Once true it never goes back: a stopped hook server
   * is not restarted, a new one is constructed.
   */
  private shuttingDown = false;
  /**
   * The requests this server has ACCEPTED and not yet finished. `stop()` joins
   * them, bounded, so a shutdown that returns has no handler still running.
   */
  private readonly inFlight = new Set<Promise<void>>();

  constructor(private readonly events: HookServerEvents) {}

  /** Bind and start listening. Resolves 0 when the channel is unavailable. */
  async start(preferredPort: number): Promise<number> {
    if (this.shuttingDown) return 0;
    if (this.server !== null) return this.port;
    const server = createServer((req, res) => {
      // PHASE 200. The handler is TRACKED from the moment the request is
      // accepted, so `stop()` has something to join. It never rejects.
      const job = this.handle(req, res).catch(() => undefined);
      this.inFlight.add(job);
      void job.finally(() => {
        this.inFlight.delete(job);
      });
    });
    server.on('error', () => undefined);
    server.maxConnections = 32;
    const bound = await new Promise<number>((resolve) => {
      const settle = (value: number): void => resolve(value);
      server.once('error', () => {
        // Preferred port taken (another gmux, or something else) — an
        // ephemeral one still works for every session launched from now on.
        if (preferredPort === 0) {
          settle(0);
          return;
        }
        server.listen(0, '127.0.0.1', () => {
          settle((server.address() as { port: number } | null)?.port ?? 0);
        });
      });
      server.listen(preferredPort, '127.0.0.1', () => {
        settle((server.address() as { port: number } | null)?.port ?? 0);
      });
    });
    if (bound === 0) {
      server.close();
      return 0;
    }
    server.unref();
    this.server = server;
    this.port = bound;
    return bound;
  }

  /**
   * PHASE 200. Shut down as ONE JOINED OPERATION, and the order is the point.
   *
   * It used to be `server.close()` with the callback thrown away, then the
   * tokens cleared, and it returned in the same tick. `close()` only stops
   * new connections: a request that had ALREADY passed the token lookup went
   * on reading its body and called `onTap` afterwards, which reached the usage
   * service, which is disposed later in the same quit. The audit of 0.98.0
   * named that as the reason a resource owner whose `stop()` returns before
   * accepted work stops does not meet the bar, even when the late callback
   * only moves an in-memory meter.
   *
   * The order now:
   *
   *  1. ADMISSION CLOSES, synchronously, before any await. From this line no
   *     request is admitted and no accepted request may deliver an event.
   *  2. The listener stops accepting, and idle keep-alive connections are cut,
   *     so `close()` can actually reach its callback.
   *  3. The accepted handlers are JOINED, bounded by HOOK_STOP_JOIN_MS.
   *  4. Anything still holding a socket after that bound is destroyed, so a
   *     client that never sends its body cannot hold a quit open.
   *  5. The tokens are cleared LAST, because clearing them first would turn a
   *     request that is still being joined into an anonymous one.
   *
   * It never throws and it always resolves. The report is for the log and the
   * tests; nothing branches on it.
   */
  async stop(): Promise<HookStopReport> {
    const startedAt = Date.now();
    this.shuttingDown = true;
    const server = this.server;
    this.server = null;
    this.port = 0;
    const accepted = this.inFlight.size;
    if (server !== null) {
      // Node keeps `close()` pending until every connection is gone, so the
      // idle ones are cut here and the rest at the bound below.
      server.closeIdleConnections?.();
      const closed = new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      const joined = await settleWithin(
        Promise.all([...this.inFlight]).then(() => undefined),
        HOOK_STOP_JOIN_MS
      );
      // Whatever is left is a client that stopped talking mid request. It gets
      // no event, because admission closed on line one; this is only about not
      // holding the process open for it.
      if (!joined) server.closeAllConnections?.();
      await settleWithin(closed, HOOK_STOP_CLOSE_MS);
      this.inFlight.clear();
      this.tokens.clear();
      return {
        accepted,
        joined,
        waitedMs: Date.now() - startedAt
      };
    }
    this.inFlight.clear();
    this.tokens.clear();
    return { accepted, joined: true, waitedMs: Date.now() - startedAt };
  }

  /** True from the first line of `stop()`. Nothing turns it back off. */
  get shutdownStarted(): boolean {
    return this.shuttingDown;
  }

  /** How many accepted requests are still running. Tests and the log. */
  get inFlightCount(): number {
    return this.inFlight.size;
  }

  get listening(): boolean {
    return this.server !== null;
  }

  get boundPort(): number {
    return this.port;
  }

  register(token: string, sessionId: string): void {
    this.tokens.set(token, sessionId);
  }

  revoke(sessionId: string): void {
    for (const [token, id] of this.tokens) {
      if (id === sessionId) this.tokens.delete(token);
    }
  }

  private async handle(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse
  ): Promise<void> {
    const deny = (): void => {
      res.statusCode = 404;
      res.end();
    };
    // PHASE 200. Admission. A request that arrives after `stop()` began is
    // refused before anything is read off it, so a token is never looked up
    // and no event can be composed for it.
    if (this.shuttingDown) return deny();
    const host = req.headers.host ?? '';
    if (!/^127\.0\.0\.1(:\d+)?$/.test(host)) return deny();
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    // Two routes, one token registry: `/h/` is Phase 13's activity hook and
    // `/u/` is Phase 182's usage tap. A tap post is refused for exactly the
    // reasons a hook post is, and it says so ONCE PER REASON PER PROCESS,
    // because a token nobody registered arriving on the usage route is the
    // shape an attack has and the shape a stale session has, and both are
    // worth seeing once and only once.
    //
    // THE ONCE IS NOT TIDINESS, and the fix round of 2026-09-01 measured why.
    // The first build wrote one `warn` per refused post with no bound at all,
    // and every check on this route happens BEFORE the token is looked up, so
    // any process on the machine could reach that line. Measured over the real
    // bound server: 500 anonymous posts produced 500 log lines in 47 ms, which
    // is 10,638 a second, and the same 500 posts to `/h/` produced none, so the
    // asymmetry arrived with this route. `src/main/log/transport.ts` caps
    // app.log at 2 MiB with one archive, so this was never disk fill; it was
    // diagnostic ERASURE. The real line is 138 bytes through the real envelope
    // builder, so 30,394 posts evict app.log and app.log.1 both, and at the
    // measured rate that is 2.9 seconds to empty the log a later incident would
    // be read out of. Bounded, the whole route can write at most one line per
    // reason, and there are four reasons.
    const isTap = url.pathname.startsWith('/u/');
    const drop = (reason: string): void => {
      if (isTap) logTapDropOnce(reason);
      deny();
    };
    const m = /^\/([hu])\/([0-9a-f]{32})$/.exec(url.pathname);
    const token = m?.[2];
    if (req.method !== 'POST') return drop('method');
    if (token === undefined) return drop('route');
    const sessionId = this.tokens.get(token);
    if (sessionId === undefined) return drop('token');
    const event = url.searchParams.get('e') ?? '';
    // The tap's body is four numbers and a uuid, so it gets its own much
    // smaller cap. An oversized one is dropped whole rather than truncated
    // and parsed, which is what `over` means below.
    const cap = isTap ? TAP_BODY_CAP_BYTES : MAX_BODY_BYTES;

    let body = '';
    let over = false;
    req.on('data', (chunk: Buffer) => {
      if (over) return;
      if (body.length + chunk.length > cap) {
        over = true;
        return;
      }
      body += chunk.toString('utf8');
    });
    await new Promise<void>((resolve) => {
      req.on('end', () => resolve());
      req.on('error', () => resolve());
    });
    // Reply first: a hook that waits on us is latency in the user's agent.
    res.statusCode = 200;
    res.end();

    // PHASE 200. Admission, again, and THIS is the check the audit's race
    // needed. The body read above is an await: a request that passed the token
    // lookup before `stop()` was called reaches this line afterwards, and
    // delivering its event here would call the usage service during, or after,
    // its own disposal. It is dropped instead. The client already has its 200,
    // because a hook that waits on Tortie is latency in the person's agent,
    // and a status line post is a convenience that may never be the thing that
    // breaks a turn.
    if (this.shuttingDown) return;

    if (isTap) {
      if (over) {
        logTapDropOnce('oversized');
        return;
      }
      this.events.onTap?.(sessionId, body);
      return;
    }
    if (event === 'SessionEnd') {
      this.events.onSessionEnd(sessionId);
      return;
    }
    const state = stateForHookEvent(event);
    if (state === undefined) return;
    if (!over && isSubagentPayload(body)) return;
    this.events.onEvent(sessionId, state, event);
  }
}

// ---------------------------------------------------------------------------
// claude — the per-session settings file
// ---------------------------------------------------------------------------

/** `<userData>/gmux/hooks/claude` — never `~/.claude`. */
export function claudeHookDir(): string {
  return join(app.getPath('userData'), 'gmux', 'hooks', 'claude');
}

export function claudeHookSettingsPath(sessionId: string): string {
  return join(claudeHookDir(), `${sessionId}.json`);
}

/**
 * The managed status line script (Phase 182), one per install rather than one
 * per session: it reads the session out of its own environment, so there is
 * nothing in it that differs between sessions.
 *
 * It lives beside the settings files and NOT in a temporary directory, for
 * the same reason they do not: research 72 section 10.7 measured that a
 * `--settings` file that has gone missing kills the session at launch, and a
 * status line whose script has gone missing is the smaller version of the
 * same fault. `<userData>/gmux` is durable state.
 */
export function claudeTapScriptPath(): string {
  return join(claudeHookDir(), 'tortie-statusline.sh');
}

/** One throttle stamp per session. `.json` sweeps never reach this directory. */
export function claudeTapStampDir(): string {
  return join(claudeHookDir(), 'stamps');
}

/** Persisted preferred port, so hooks survive a gmux restart. */
function portFilePath(): string {
  return join(app.getPath('userData'), 'gmux', 'hooks', 'port');
}

export function readPreferredHookPort(): number {
  try {
    const n = parseInt(readFileSync(portFilePath(), 'utf8').trim(), 10);
    return Number.isInteger(n) && n > 1024 && n < 65_536 ? n : 0;
  } catch {
    return 0;
  }
}

export function writePreferredHookPort(port: number): void {
  try {
    mkdirSync(join(app.getPath('userData'), 'gmux', 'hooks'), {
      recursive: true
    });
    writeFileSync(portFilePath(), String(port), 'utf8');
  } catch {
    /* preference only — a lost port just re-mints on the next boot */
  }
}

/**
 * The settings claude merges in. `allowedHttpHookUrls` is required for HTTP
 * hooks; the hooks themselves are SYNCHRONOUS on purpose — with `async:true`
 * `SessionEnd` was dropped on process exit, and a loopback POST is
 * sub-millisecond anyway.
 *
 * `SessionStart` is absent because it never arrives over HTTP in either mode
 * (measured); the pid file covers session start. `--setting-sources ""` is
 * never passed — it would suppress the user's own model, plugins and
 * permissions, and merging is the entire reason to use `--settings`.
 */
export function claudeHookSettings(
  port: number,
  token: string,
  /**
   * Phase 182: the managed status line script's path, or null for no status
   * line at all. Null is the shipped answer, because the usage switch is off
   * by default and a person who already has a status line keeps it.
   */
  statusLinePath: string | null = null
): string {
  const base = `http://127.0.0.1:${port}`;
  const hook = (event: string): unknown => ({
    hooks: [{ type: 'http', url: `${base}/h/${token}?e=${event}` }]
  });
  return JSON.stringify(
    {
      allowedHttpHookUrls: [`${base}/*`],
      hooks: {
        UserPromptSubmit: [hook('UserPromptSubmit')],
        PermissionRequest: [hook('PermissionRequest')],
        PostToolUse: [hook('PostToolUse')],
        Stop: [hook('Stop')],
        SessionEnd: [hook('SessionEnd')]
      },
      ...(statusLinePath === null ? {} : statusLineBlock(statusLinePath))
    },
    null,
    2
  );
}

/** Recover the token from a settings file gmux wrote earlier. */
export function tokenFromSettingsFile(path: string): string | null {
  try {
    const text = readFileSync(path, 'utf8');
    return /\/h\/([0-9a-f]{32})\?/.exec(text)?.[1] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 182 — the status line, and when Tortie may not install one
// ---------------------------------------------------------------------------

/**
 * Does this directory look like the root of a checkout?
 *
 * `.git` is a DIRECTORY in an ordinary clone and a FILE in a worktree or a
 * submodule, so existence is the whole test and the type is not asked. No git
 * process is started: this file spawns nothing and it is not going to start.
 */
function looksLikeRepoRoot(dir: string): boolean {
  return existsSync(join(dir, '.git'));
}

/** The checkout root at or above `cwd`, or null when there is not one. */
export function repoRootOf(
  cwd: string,
  isRepoRoot: (dir: string) => boolean = looksLikeRepoRoot
): string | null {
  let dir = cwd;
  // A hard stop rather than a while, because this walks a path a person's own
  // configuration named and a loop that cannot end has no place in a launch.
  for (let i = 0; i < 64; i++) {
    if (isRepoRoot(dir)) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

/**
 * Every place the PERSON could have named a status line that Tortie's flag
 * file would outrank, in Claude Code's own source order.
 *
 * The user file is read and NEVER written, and that is a rule that outranks
 * this whole feature. The project and local files are read only when a
 * working directory is known, which is every launch and every restore; the
 * boot pass has no cwd for a live session and checks the user file alone,
 * which is the conservative half.
 *
 * THE CHECKOUT ROOT IS IN THIS LIST BECAUSE IT WAS MEASURED THERE, and the
 * first build of this function missed it. Run against the real 2.1.252 binary
 * on 2026-09-01 with `--debug`, which names every settings path it tries, from
 * a working directory three levels below a git root: claude looked at the user
 * file, the managed file, `<cwd>/.claude/settings.json`,
 * `<cwd>/.claude/settings.local.json` AND `<gitRoot>/.claude/settings.local.json`,
 * and its own watch line named that last one too. Moving the working directory
 * deeper moved four of those and left the fifth on the root exactly, and
 * removing the `.git` made the fifth disappear, so it is the checkout root and
 * not the parent directory. Without this, a session opened in a subdirectory of
 * a repository whose root carries a status line would have had Tortie's
 * installed over it in silence, which is the one outcome this refusal exists to
 * prevent.
 *
 * `<gitRoot>/.claude/settings.json` is in the list and claude did NOT read it:
 * it is absent from the tried paths in every run, including the one where
 * nothing existed anywhere. It is checked anyway because the two costs are not
 * the same size. Refusing when claude would not have been overridden costs the
 * live meter and keeps the fifteen minute poll, which is this feature's own
 * documented fallback. Not refusing when it would have costs the person the
 * status line they wrote, silently, and they would have no way to see why.
 */
export function personStatusLineFiles(
  env: Record<string, string | undefined>,
  home: string,
  cwd: string | undefined,
  isRepoRoot: (dir: string) => boolean = looksLikeRepoRoot
): string[] {
  const configDir = env['CLAUDE_CONFIG_DIR'];
  const userDir =
    configDir !== undefined && configDir !== ''
      ? configDir
      : join(home, '.claude');
  const files = [join(userDir, 'settings.json')];
  if (cwd !== undefined && cwd !== '') {
    files.push(
      join(cwd, '.claude', 'settings.json'),
      join(cwd, '.claude', 'settings.local.json')
    );
    const root = repoRootOf(cwd, isRepoRoot);
    if (root !== null && root !== cwd) {
      files.push(
        join(root, '.claude', 'settings.json'),
        join(root, '.claude', 'settings.local.json')
      );
    }
  }
  return files;
}

/** A file's text, or null. This is the ONLY thing this file does to ~/.claude. */
function readTextOrNull(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/** Does the person already own the status line for a session in this directory? */
export function personOwnsStatusLine(
  files: readonly string[],
  read: (path: string) => string | null = readTextOrNull
): boolean {
  return files.some((f) => textNamesStatusLine(read(f)));
}

/** Why there is no status line in this session's settings file, or that there is. */
export type TapDecision =
  | { install: true; script: string }
  | { install: false; reason: 'off' | 'person-owns-it' | 'unwritable' };

/** One line per reason per process. A launch loop must not write a log a minute. */
const loggedTapReasons = new Set<string>();

function logTapReasonOnce(reason: string): void {
  if (loggedTapReasons.has(reason)) return;
  loggedTapReasons.add(reason);
  log.info('usage.tap.not-installed', { reason });
}

/**
 * The same bound for a REFUSED POST, and this one is the load bearing half.
 *
 * A post reaches `drop` before its token has been looked up, so the caller is
 * unauthenticated by construction and anything on the machine can drive this
 * line as fast as it can open sockets. The reasons are a closed set of four,
 * being `method`, `route`, `token` and `oversized`, so the whole route's
 * lifetime cost is four lines. The measurement that made this necessary is in
 * the comment beside `drop` above.
 */
const loggedTapDrops = new Set<string>();

function logTapDropOnce(reason: string): void {
  if (loggedTapDrops.has(reason)) return;
  loggedTapDrops.add(reason);
  log.warn('usage.tap.dropped', { reason });
}

/** Test seam: forget which reasons have been logged, on both sets. */
export function resetTapReasonLog(): void {
  loggedTapReasons.clear();
  loggedTapDrops.clear();
}

/**
 * Write the managed script, and make it executable. Returns its path or null.
 *
 * Rewritten on every launch on purpose. It is generated whole from one
 * function, so an older install's script is replaced rather than migrated,
 * and a person who edited it gets Tortie's version back.
 */
export function ensureClaudeTapScript(): string | null {
  const path = claudeTapScriptPath();
  try {
    mkdirSync(claudeTapStampDir(), { recursive: true });
    writeFileAtomic(
      path,
      claudeStatusLineScript({
        settingsDir: claudeHookDir(),
        stampDir: claudeTapStampDir()
      }),
      // The script is executable and holds no secret. Everything else this
      // file writes is 0600.
      0o755
    );
  } catch {
    return null;
  }
  return path;
}

/**
 * Should this session's settings file name Tortie's status line?
 *
 * THREE ANSWERS AND EACH IS A REFUSAL WORTH NAMING.
 *
 *  - `off` is the shipped one. The Claude usage switch is off until a person
 *    turns it on in Settings, and while it is off no script is written, no
 *    status line is configured and nothing runs in the person's session. The
 *    switch reaches a session at its NEXT launch or restore, because a
 *    settings file is read by claude once at process start.
 *  - `person-owns-it` is the honest one. A status line is one command and the
 *    highest source wins outright, so installing Tortie's would silently
 *    delete the person's inside Tortie launched sessions. Tortie does not
 *    compose his command inside its own either: that would be Tortie reading
 *    a command out of a configuration file and running it, which the project
 *    refuses. The meter keeps the endpoint poll it already had.
 *  - `unwritable` is the ordinary one, and it degrades the same way every
 *    other part of this file does: no status line, and the session launches.
 */
export function claudeTapDecision(cwd: string | undefined): TapDecision {
  let on = false;
  try {
    on = getSettings().usage.claude;
  } catch {
    on = false;
  }
  if (!on) return { install: false, reason: 'off' };
  const files = personStatusLineFiles(process.env, homedir(), cwd);
  if (personOwnsStatusLine(files)) {
    logTapReasonOnce('person-owns-it');
    return { install: false, reason: 'person-owns-it' };
  }
  const script = ensureClaudeTapScript();
  if (script === null) {
    logTapReasonOnce('unwritable');
    return { install: false, reason: 'unwritable' };
  }
  return { install: true, script };
}

/**
 * Write text where a half written file would be worse than no file.
 *
 * Research 72 section 10.7 measured what a malformed settings file does: a
 * "Settings Error" modal naming the file, with three choices and Enter to
 * confirm, BEFORE the session is usable, because claude's own rule is that
 * files with errors are skipped entirely. A crash between two writes of this
 * file would therefore block every claude session Tortie launches until a
 * person pressed a key. So the bytes land under a temporary name and are
 * renamed into place, and a rename on one file system is atomic.
 *
 * THE MODE IS THE FIX ROUND OF 2026-09-01. This file holds the session's 128
 * bit token, and research 72 section 10.9 names the right carrier as "a file
 * under userData at mode 0600". Phase 13 wrote it with no mode at all, and
 * under the ordinary umask 022 that is 0644, measured here and measured again
 * on the operator's own install where all 26 settings files read `-rw-r--r--`.
 * In practice the secret was protected by an ancestor, `~/Library` being
 * `drwx------`, but a mode is the thing the ruling asked for and an ancestor is
 * somebody else's decision. The chmod is separate from the write because the
 * `mode` option only applies to a file the write CREATES, and a temporary name
 * left behind by an earlier crash would otherwise keep its old mode.
 */
function writeFileAtomic(path: string, text: string, mode = 0o600): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text, { encoding: 'utf8', mode });
  chmodSync(tmp, mode);
  renameSync(tmp, path);
}

/**
 * Which names in `claudeHookDir()` a boot sweep may remove.
 *
 * FOUR SHAPES LIVE IN THAT DIRECTORY and the first build's sweep reached one.
 * `<id>.json` is a session's settings file, and one whose row is gone is dead
 * bytes. `<id>.json.<pid>.tmp` is what a crash between `writeFileAtomic`'s
 * write and its rename leaves behind, and it does not end in `.json`, so it
 * would have survived every sweep forever. `tortie-statusline.sh` is the
 * managed script and `stamps` is a directory, and neither may ever be removed
 * here, which is why this answers on the name rather than on what is left over.
 */
export function sweepableHookName(
  name: string,
  live: ReadonlySet<string>
): boolean {
  if (name.endsWith('.tmp')) return true;
  if (!name.endsWith('.json')) return false;
  return !live.has(name.slice(0, -'.json'.length));
}

/**
 * Which names in `claudeTapStampDir()` a boot sweep may remove.
 *
 * Two shapes, both named for the session that owns them: `<id>` is the throttle
 * stamp, ten bytes of epoch seconds, and `<id>.curl` is the private
 * destination file the script writes just before a post and unlinks just after,
 * so one is only ever seen after a kill in that window. A session with no
 * manifest row can produce neither again.
 */
export function sweepableStampName(
  name: string,
  live: ReadonlySet<string>
): boolean {
  const id = name.endsWith('.curl')
    ? name.slice(0, -'.curl'.length)
    : name;
  return !live.has(id);
}

/**
 * Guarantee the settings file for one claude session exists and points at the
 * CURRENT port, reusing the session's existing token when one can be
 * recovered (a claude that outlived a gmux restart still holds it).
 *
 * Returns the path, or null when the channel is unavailable or the write
 * failed — callers must then launch WITHOUT `--settings`.
 *
 * `cwd` is the session's working directory when the caller knows it, and it
 * is used for ONE thing: reading whether the person's own project settings
 * already name a status line. Nothing is written anywhere near it.
 */
export function ensureClaudeHookSettings(
  server: GmuxHookServer,
  sessionId: string,
  cwd?: string
): string | null {
  if (!hooksEnabled() || !server.listening) return null;
  const path = claudeHookSettingsPath(sessionId);
  const token = tokenFromSettingsFile(path) ?? randomBytes(16).toString('hex');
  const tap = claudeTapDecision(cwd);
  try {
    mkdirSync(claudeHookDir(), { recursive: true });
    writeFileAtomic(
      path,
      claudeHookSettings(
        server.boundPort,
        token,
        tap.install ? tap.script : null
      )
    );
  } catch {
    return null;
  }
  server.register(token, sessionId);
  return path;
}

/**
 * Splice `--settings <path>` in right after the binary, for both the launch
 * argv and the armed resume argv — `--resume` does not re-apply launch flags,
 * so the resume argv has to carry it too. Idempotent.
 */
export function withClaudeSettingsFlag(
  argv: readonly string[],
  settingsPath: string
): string[] {
  if (argv.includes('--settings')) return [...argv];
  const [bin, ...rest] = argv;
  if (bin === undefined) return [...argv];
  return [bin, '--settings', settingsPath, ...rest];
}
