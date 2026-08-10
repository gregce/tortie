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
 * costs zero subprocesses, and `--settings` MERGES with the user's and the
 * project's settings rather than replacing them. Codex hooks are deliberately
 * NOT implemented: they need `--dangerously-bypass-hook-trust`, which paints
 * a permanent yellow banner in the TUI, and codex's pane title is already a
 * perfect three-state oracle, so the banner would buy nothing.
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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { ActivityState } from './types';

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

  constructor(private readonly events: HookServerEvents) {}

  /** Bind and start listening. Resolves 0 when the channel is unavailable. */
  async start(preferredPort: number): Promise<number> {
    if (this.server !== null) return this.port;
    const server = createServer((req, res) => {
      void this.handle(req, res);
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

  stop(): void {
    this.server?.close();
    this.server = null;
    this.tokens.clear();
    this.port = 0;
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
    const host = req.headers.host ?? '';
    if (!/^127\.0\.0\.1(:\d+)?$/.test(host)) return deny();
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const m = /^\/h\/([0-9a-f]{32})$/.exec(url.pathname);
    const token = m?.[1];
    if (req.method !== 'POST' || token === undefined) return deny();
    const sessionId = this.tokens.get(token);
    if (sessionId === undefined) return deny();
    const event = url.searchParams.get('e') ?? '';

    let body = '';
    let over = false;
    req.on('data', (chunk: Buffer) => {
      if (over) return;
      if (body.length + chunk.length > MAX_BODY_BYTES) {
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
export function claudeHookSettings(port: number, token: string): string {
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
      }
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

/**
 * Guarantee the settings file for one claude session exists and points at the
 * CURRENT port, reusing the session's existing token when one can be
 * recovered (a claude that outlived a gmux restart still holds it).
 *
 * Returns the path, or null when the channel is unavailable or the write
 * failed — callers must then launch WITHOUT `--settings`.
 */
export function ensureClaudeHookSettings(
  server: GmuxHookServer,
  sessionId: string
): string | null {
  if (!hooksEnabled() || !server.listening) return null;
  const path = claudeHookSettingsPath(sessionId);
  const token = tokenFromSettingsFile(path) ?? randomBytes(16).toString('hex');
  try {
    mkdirSync(claudeHookDir(), { recursive: true });
    writeFileSync(path, claudeHookSettings(server.boundPort, token), 'utf8');
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
