/**
 * Session operations against the private gmux tmux server.
 *
 * Naming discipline (FINAL-REPORT §2.4 Step 0):
 *  - the user-visible DISPLAY name lives in the manifest / UI;
 *  - the tmux-side name is its sanitized form (`.`/`:`/`/` → `-`, because
 *    tmux 3.7+ accepts those verbatim and they break `-t` target syntax);
 *  - immediately after create we resolve the session's immutable `$-id`
 *    (via `new-session -P -F`) and every later command targets that id —
 *    or an `=`-prefixed exact name — never a bare name.
 *
 * All commands flow through supervisor.execTmux(), which classifies
 * failures into structured GmuxErrors.
 */

import { existsSync } from 'node:fs';
import { isControlSession } from './control-client';
import { gmuxError, isGmuxError } from './errors';
import {
  dedupeSessionName,
  formatSessionTarget,
  sanitizeSessionName
} from './names';
import { execTmux } from './supervisor';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** What tmux knows about one live session. */
export interface TmuxSessionInfo {
  /** Immutable tmux id, e.g. "$3". Target of choice for every command. */
  sessionId: string;
  /** Current tmux-side (sanitized) name. */
  tmuxName: string;
  /** Session creation time, epoch milliseconds. */
  createdAt: number;
  /** True when at least one client is attached. */
  attached: boolean;
  /** Number of windows (gmux uses exactly one per session). */
  windows: number;
  /**
   * The `@gmux-id` user option gmux stamps on every session it creates or
   * restores — the manifest row id. THE identity (Phase 12.7 / research 21
   * §6): names are mutable and reusable, this is not. Undefined for sessions
   * gmux did not create (or whose stamp failed).
   */
  gmuxId?: string;
  /**
   * `#{pane_pid}` of the session's pane, captured at create only (the create
   * format asks for it; `list-sessions` does not). Recorded in the manifest
   * so a post-mortem can correlate a death against `ps` history.
   */
  panePid?: number;
}

export interface CreateTmuxSessionInput {
  /** User-visible display name; the tmux name is derived from it. */
  displayName: string;
  /** Absolute working directory for the new session. */
  cwd: string;
  /**
   * Command argv, e.g. ["claude", "--session-id", "<uuid>"].
   * Omitted/empty → tmux default shell.
   */
  argv?: string[];
  /** Extra environment variables for the pane (tmux `-e KEY=VALUE`). */
  env?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// list-sessions format: name LAST so embedded spaces can't break parsing
// (a session really is called "zen of tortie" on this machine). Every field
// before it is space-free: ids, counts, and `@gmux-id` (a UUID, or EMPTY for
// a session gmux did not create — hence `(\S*)`, which matches the empty run
// between the two spaces tmux emits for an unset option).
//
// CREATE_FORMAT adds `#{pane_pid}`, which only resolves against a single
// unambiguous pane — true for `new-session -P -F`, not for `list-sessions`
// (research 21 §10: the pid is captured at create so a death is correlatable
// against `ps` history long after tmux has forgotten the pane).
// ---------------------------------------------------------------------------

const LIST_FORMAT =
  '#{session_id} #{session_created} #{session_attached} #{session_windows} #{@gmux-id} #{session_name}';

const CREATE_FORMAT =
  '#{session_id} #{session_created} #{session_attached} #{session_windows} #{@gmux-id} #{pane_pid} #{session_name}';

/** Exported for the format tests — every other caller goes through the ops. */
export function parseListLine(
  line: string,
  withPanePid = false
): TmuxSessionInfo | null {
  // <"$id"> <created-epoch-s> <attached> <windows> <@gmux-id> [pid] <name…>
  const re = withPanePid
    ? /^(\$\d+) (\d+) (\d+) (\d+) (\S*) (\d*) (.*)$/
    : /^(\$\d+) (\d+) (\d+) (\d+) (\S*) (.*)$/;
  const m = re.exec(line);
  if (m === null) return null;
  const gmuxId = m[5] as string;
  const info: TmuxSessionInfo = {
    sessionId: m[1] as string,
    createdAt: Number(m[2]) * 1000,
    attached: Number(m[3]) > 0,
    windows: Number(m[4]),
    tmuxName: (withPanePid ? m[7] : m[6]) as string
  };
  if (gmuxId.length > 0) info.gmuxId = gmuxId;
  if (withPanePid) {
    const pid = Number(m[6]);
    if (Number.isFinite(pid) && pid > 0) info.panePid = pid;
  }
  return info;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export interface ListSessionsOptions {
  /** Include the hidden gmux-control session (default false). */
  includeControl?: boolean;
}

/**
 * List live sessions. The pinned `gmux-control` event-bus session is
 * filtered out unless asked for — it must never reach the UI.
 * @throws GmuxError TMUX_UNREACHABLE when the server is not running.
 */
export async function listSessions(
  options: ListSessionsOptions = {}
): Promise<TmuxSessionInfo[]> {
  const stdout = await execTmux(['list-sessions', '-F', LIST_FORMAT]);
  const sessions: TmuxSessionInfo[] = [];
  for (const line of stdout.split('\n')) {
    if (line.length === 0) continue;
    const info = parseListLine(line);
    if (info === null) continue;
    if (!options.includeControl && isControlSession(info.tmuxName)) continue;
    sessions.push(info);
  }
  return sessions;
}

/**
 * Create a detached session running `argv` in `cwd`, named after the
 * sanitized display name (deduped against live sessions — "a.b" and "a:b"
 * both sanitize to "a-b"). Resolves the immutable `$-id` atomically via
 * `new-session -P -F` (verified on tmux 3.6a) — no list round-trip race.
 */
export async function createSession(
  input: CreateTmuxSessionInput
): Promise<TmuxSessionInfo> {
  if (input.displayName.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
  }
  if (!existsSync(input.cwd)) {
    throw gmuxError(
      'INVALID_INPUT',
      'The working directory for this session does not exist.',
      input.cwd
    );
  }

  const taken = new Set(
    (await listSessions({ includeControl: true })).map((s) => s.tmuxName)
  );
  const tmuxName = dedupeSessionName(
    sanitizeSessionName(input.displayName),
    taken
  );

  const args = ['new-session', '-d', '-P', '-F', CREATE_FORMAT, '-s', tmuxName];
  args.push('-c', input.cwd);
  for (const [key, value] of Object.entries(input.env ?? {})) {
    args.push('-e', `${key}=${value}`);
  }
  const argv = input.argv ?? [];
  if (argv.length > 0) {
    // tmux 3.4+ accepts the command as an argument vector (no shell quoting
    // hazards); verified against 3.6a with multi-word argv.
    args.push('--', ...argv);
  }

  const stdout = await execTmux(args);
  const firstLine = stdout.split('\n')[0] ?? '';
  const info = parseListLine(firstLine, true);
  if (info === null) {
    throw gmuxError(
      'SPAWN_FAILED',
      'tmux created the session but returned an unparseable id.',
      firstLine
    );
  }
  return info;
}

/**
 * Rename a session (target = `$-id` preferred, or exact tmux name).
 * The new tmux name is the sanitized display name, deduped against every
 * OTHER live session. Returns the tmux name actually applied — the caller
 * (manifest layer) stores both it and the display name; the control
 * client's %session-renamed event confirms the sync loop.
 */
export async function renameSession(
  target: string,
  newDisplayName: string
): Promise<{ sessionId: string; tmuxName: string }> {
  if (newDisplayName.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
  }
  const resolved = await resolveSession(target);
  const taken = new Set(
    (await listSessions({ includeControl: true }))
      .filter((s) => s.sessionId !== resolved.sessionId)
      .map((s) => s.tmuxName)
  );
  const tmuxName = dedupeSessionName(
    sanitizeSessionName(newDisplayName),
    taken
  );
  if (tmuxName !== resolved.tmuxName) {
    await execTmux(['rename-session', '-t', resolved.sessionId, tmuxName]);
  }
  return { sessionId: resolved.sessionId, tmuxName };
}

/** Kill a session. Idempotent: killing an already-gone session is a no-op. */
export async function killSession(target: string): Promise<void> {
  try {
    await execTmux(['kill-session', '-t', formatSessionTarget(target)]);
  } catch (err) {
    if (isGmuxError(err, 'SESSION_NOT_FOUND')) {
      return; // already gone — the desired state
    }
    throw err;
  }
}

/** True when the target exists on the private server. */
export async function hasSession(target: string): Promise<boolean> {
  try {
    await execTmux(['has-session', '-t', formatSessionTarget(target)]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a session reference to its immutable `$-id` before a PANE command.
 *
 * VERIFIED on tmux 3.6a: `capture-pane -t '=name'` fails with "can't find
 * pane" — the `=` exact-match prefix is honored in target-SESSION resolution
 * (has-session, kill-session) but NOT in target-PANE resolution. Promoted
 * here from src/main/restore/snapshots.ts (standing guardrail 3: one copy)
 * because terminal capture is the second caller.
 */
export async function resolvePaneTarget(target: string): Promise<string> {
  if (target.startsWith('$')) return target;
  const live = await listSessions({ includeControl: true });
  const found = live.find((s) => s.tmuxName === target);
  if (found === undefined) {
    throw new Error(`no live tmux session named "${target}"`);
  }
  return found.sessionId;
}

export interface CapturePaneOptions {
  /**
   * `-J` joins wrapped lines. Right for snapshot replay (the default, kept
   * for every existing caller); WRONG for a screenshot, which must reproduce
   * the on-screen wrapping — pass `false` there (research 17 §2.1).
   */
  join?: boolean;
}

/**
 * Capture the last `lines` of a session's active pane, ANSI colors intact
 * (`-e`). This backfills xterm.js after reattach (T1), feeds scrollback
 * snapshots at quit (FINAL-REPORT §2.4 Step 1) and sources beyond-viewport
 * terminal captures (Phase 12 item 2).
 *
 * Range: `-S -<lines>` with NO `-E`, so the capture runs to the bottom of the
 * VISIBLE screen. (`-E -1` ends at the last history line and excludes the
 * screen entirely — measured on tmux 3.6a.)
 *
 * `target` must already be a pane-addressable target — a `$-id` or a bare
 * name, never `=name`. Use resolvePaneTarget() above.
 */
export async function capturePane(
  target: string,
  lines = 10_000,
  options: CapturePaneOptions = {}
): Promise<string> {
  const { join = true } = options;
  return execTmux(
    [
      'capture-pane',
      '-p',
      '-e',
      ...(join ? ['-J'] : []),
      '-t',
      formatSessionTarget(target),
      '-S',
      `-${Math.max(0, Math.floor(lines))}`
    ],
    // Big captures (50k colored lines) can take a moment.
    { timeoutMs: 30_000 }
  );
}

/** Drop a session's server-side scrollback (the Clear action, Phase 12 #1). */
export async function clearPaneHistory(target: string): Promise<void> {
  await execTmux(['clear-history', '-t', formatSessionTarget(target)]);
}

/**
 * Mirror gmux metadata into tmux user options (`@gmux-agent`, …) so the
 * durable server is self-describing even if the manifest is lost
 * (FINAL-REPORT §2.4 Step 0.2).
 */
export async function setSessionOption(
  target: string,
  name: `@gmux-${string}`,
  value: string
): Promise<void> {
  await execTmux(['set-option', '-t', formatSessionTarget(target), name, value]);
}

/** Read back a user option; null when unset. */
export async function getSessionOption(
  target: string,
  name: `@gmux-${string}`
): Promise<string | null> {
  try {
    const out = await execTmux([
      'show-options',
      '-v',
      '-t',
      formatSessionTarget(target),
      name
    ]);
    const value = out.replace(/\n$/, '');
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Read one variable out of a session's tmux environment — the SECOND
 * identity stamp (Phase 12.7 F3 puts `GMUX_SESSION_ID` in every managed
 * pane's env). Used only to rescue a session whose `@gmux-id` option is
 * missing; a session carrying neither stamp is not ours.
 *
 * `show-environment -t <t> NAME` prints `NAME=value`, `-NAME` when the
 * variable is explicitly unset, and exits non-zero when it is unknown.
 */
export async function getSessionEnv(
  target: string,
  name: string
): Promise<string | null> {
  try {
    const out = await execTmux([
      'show-environment',
      '-t',
      formatSessionTarget(target),
      name
    ]);
    const line = out.split('\n')[0] ?? '';
    if (!line.startsWith(`${name}=`)) return null;
    const value = line.slice(name.length + 1);
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a `$-id` or exact name to the live session's current identity. */
async function resolveSession(target: string): Promise<TmuxSessionInfo> {
  const sessions = await listSessions({ includeControl: true });
  const found = target.startsWith('$')
    ? sessions.find((s) => s.sessionId === target)
    : sessions.find((s) => s.tmuxName === target);
  if (found === undefined) {
    throw gmuxError('SESSION_NOT_FOUND', 'Session not found.', target);
  }
  return found;
}
