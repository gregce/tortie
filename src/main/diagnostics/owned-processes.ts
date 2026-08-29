/**
 * owned-processes.ts — "what is gmux actually running right now?", as DATA.
 *
 * Phase 13.8 item 2, with 12.7's constraint on it. Agents are launched by BARE
 * NAME on purpose (12.7 F3: an absolute argv[0] made every durable gmux agent
 * the one process on the machine that `pkill -f "$(command -v claude)"`
 * matches), which is right for survival and terrible for identification —
 * a `claude` in Activity Monitor could be gmux's or a terminal's. Rather than
 * undo that, this module answers from OWNERSHIP instead of from the command
 * line: gmux's own pid tree, the private tmux server, and every process
 * descending from a session in THAT server. Nothing here is inferred from a
 * process's name.
 *
 * STRICTLY READ-ONLY. It runs `ps` and asks tmux to list; it signals nothing.
 * (The one thing in main that does signal — proc/orphans.ts — is separate on
 * purpose, so a diagnostics call can never be a destructive one.)
 *
 * The surface that renders these rows is Phase 13.7's diagnostics panel and
 * lives in someone else's file. This module only produces rows.
 *
 * Cost: one `ps -axo` (~5 ms for ~700 processes) plus one tmux list-panes. On
 * demand only — no timer here, by design (ZEN-OF-TORTIE: a number that rises
 * on its own is noise in a nicer font).
 *
 * PHASE 163 widened the walk by three facts and no new process. Every row
 * carries the basename of what was launched, so the report can name a helper
 * by its binary without ever carrying a command line. The event bus client
 * (`tmux -C`) is its own role. And the ssh masters Tortie persists for a
 * machine are found: they daemonize and reparent to launchd, so the app tree
 * misses them, and the honest marker is the control socket leaf in their
 * command line, which the machine's own execution hash composes. The pane
 * list also carries `@gmux-id`, the manifest id, so a session row joins the
 * manifest by identity rather than by its mutable name.
 */

import { guardedChildPids } from '../proc/guarded';
import { findStrandedPathProbes } from '../proc/orphans';
import { childIndex, descendantsOf, readPsTable, type ProcRow } from '../proc/ps';
import { CONTROL_SESSION_NAME } from '../tmux/control-client';
import { activeTmuxSocket } from '../tmux/resolve';
import { execTmux } from '../tmux/supervisor';

export type GmuxProcessRole =
  /** The gmux main process. */
  | 'app'
  /** An Electron helper (renderer / GPU / utility) under the main process. */
  | 'app-helper'
  /** The private tmux server that owns every durable session. */
  | 'session-server'
  /** A tmux client gmux runs for a visible session. */
  | 'attach-client'
  /** The `tmux -C` control client that is gmux's event bus (Phase 163). */
  | 'control-client'
  /** An ssh process gmux started for a machine, live or persisted (Phase 163). */
  | 'ssh-helper'
  /** A tmux client of ours that no live gmux owns (see proc/orphans.ts). */
  | 'orphan-client'
  /** The process a session was launched with (the agent, or a shell). */
  | 'session'
  /** Something a session process spawned (an agent's own child jobs). */
  | 'session-child'
  /** A short-lived question-asking child (PATH probe, `--version`, …). */
  | 'probe'
  /** A probe an EARLIER gmux left running (see proc/orphans.ts). */
  | 'orphan-probe';

export interface GmuxProcess {
  pid: number;
  ppid: number;
  role: GmuxProcessRole;
  /** Resident memory in bytes. */
  rssBytes: number;
  /** Percent of one core, as `ps` computes it (lifetime average). */
  cpuPercent: number;
  /** Full command line, for the detail line under a row. */
  command: string;
  /** The gmux session this belongs to, when it belongs to one. */
  sessionName?: string;
  /** The manifest id from `@gmux-id`, when the session carries one. */
  sessionId?: string;
  /**
   * Basename of argv[0]: 'tmux', 'ssh', 'rg', 'claude'. Never the argv.
   * Optional only so older fixtures still type; the walk always sets it.
   */
  binary?: string;
  /** For an ssh helper: the machine label its control path names. */
  machineLabel?: string;
}

/** `tortie-mux/m-<12 hex>` in an ssh argv names the machine it reaches. */
const SSH_CONTROL_LEAF = /tortie-mux\/(m-[0-9a-f]{12})\b/;

/**
 * True when a tmux argv names OUR socket. Phase 163 made this a word match:
 * `includes('-L gmux')` also matched `-L gmux-smoke-t1` and every scratch
 * socket a harness has ever used, and measured on 2026-08-29 it claimed the
 * operator's own 246 MB session server as an orphan of a scratch launch.
 */
export function namesSocket(command: string, socket: string): boolean {
  const at = command.indexOf(`-L ${socket}`);
  if (at === -1) return false;
  const after = command.charAt(at + 3 + socket.length);
  return after === '' || /\s/.test(after);
}

/** The basename of argv[0] from a `ps` command line. Pure. */
export function binaryOf(command: string): string {
  const trimmed = command.trimStart();
  // argv[0] may carry spaces: an Electron helper is launched from a path like
  // ".../Tortie Helper (GPU).app/Contents/MacOS/Tortie Helper (GPU) --type=".
  // That is the one shape with spaces inside argv[0], so it is read as
  // everything up to the first dash argument, and the first space free token
  // is otherwise the whole of argv[0].
  const helper = /^(.*? Helper(?: \([^)]*\))?)(?:\s+-|\s*$)/.exec(trimmed);
  const argv0 = helper?.[1] ?? trimmed.split(/\s+/, 1)[0] ?? '';
  const slash = argv0.lastIndexOf('/');
  const base = slash === -1 ? argv0 : argv0.slice(slash + 1);
  // A persisted ssh master retitles itself "ssh: <socket> [mux]"; the colon
  // is the title's, not the binary's.
  return base.endsWith(':') ? base.slice(0, -1) : base;
}

/** The control socket leaf an ssh argv names, or null. Pure. */
export function sshControlLeafOf(command: string): string | null {
  return SSH_CONTROL_LEAF.exec(command)?.[1] ?? null;
}

/**
 * The private tmux server, identified by its own command line: the process
 * running tmux with `-L gmux` that launchd owns (ppid 1 after the client that
 * started it exited) and that answers as the server.
 *
 * Used only as the FALLBACK. `listGmuxProcesses` prefers the authoritative
 * answer — asking the server for `#{pid}` — and drops to this when tmux
 * cannot be reached at all.
 */
export function findSessionServer(
  rows: Iterable<ProcRow>,
  socket: string = activeTmuxSocket()
): number | null {
  let best: ProcRow | null = null;
  for (const row of rows) {
    if (!namesSocket(row.command, socket)) continue;
    if (row.ppid !== 1) continue;
    // `start-server` is how the supervisor boots it; prefer that exact shape,
    // then fall back to the oldest matching pid.
    if (row.command.includes('start-server')) return row.pid;
    if (best === null || row.pid < best.pid) best = row;
  }
  return best?.pid ?? null;
}

export interface OwnedProcessDeps {
  /** Injectable for tests. Default: `/bin/ps` through the guarded runner. */
  psTable?(): Promise<Map<number, ProcRow>>;
  /** Injectable for tests. Default: tmux list-panes on the private socket. */
  sessionPids?(): Promise<SessionPane[]>;
  /** Injectable for tests. Default: `display-message -p '#{pid}'`. */
  serverPid?(): Promise<number | null>;
  /** The gmux main pid. Default: this process. */
  appPid?: number;
  /**
   * Control socket leaf to machine label, for naming a persisted ssh master
   * (Phase 163). Default: none, so masters are found but carry no label.
   */
  sshLeafLabels?: ReadonlyMap<string, string>;
  /** The socket name to match. Default: the active one (harness aware). */
  socket?: string;
}

export interface SessionPane {
  pid: number;
  sessionName: string;
  /** The `@gmux-id` option, or undefined when the session carries none. */
  sessionId?: string;
}

/** One line per pane: pid, name, then the id (empty when unset). */
export const PANE_FORMAT = '#{pane_pid}\t#{session_name}\t#{@gmux-id}';

/** Pure parse of `list-panes -a -F PANE_FORMAT`. */
export function parseSessionPanes(out: string): SessionPane[] {
  const sessions: SessionPane[] = [];
  for (const line of out.split('\n')) {
    const [pidText, name, id] = line.split('\t');
    const pid = Number(pidText);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const trimmedId = (id ?? '').trim();
    sessions.push({
      pid,
      sessionName: name ?? '',
      ...(trimmedId.length > 0 ? { sessionId: trimmedId } : {})
    });
  }
  return sessions;
}

async function defaultSessionPids(): Promise<SessionPane[]> {
  // Read-only. `#{pane_pid}` is the process tmux forked for that session,
  // being the agent itself or the shell that runs it.
  return parseSessionPanes(
    await execTmux(['list-panes', '-a', '-F', PANE_FORMAT])
  );
}

async function defaultServerPid(): Promise<number | null> {
  try {
    const pid = Number((await execTmux(['display-message', '-p', '#{pid}'])).trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Every process gmux owns, right now, with the role that explains WHY it is
 * ours. Ordered app → session server → sessions → strays, so the list reads
 * top-down from "the app" to "the things it started".
 *
 * Degrades rather than throws: if tmux cannot be reached the app's own tree
 * still comes back, which is the case where the user most needs an answer.
 */
export async function listGmuxProcesses(
  deps: OwnedProcessDeps = {}
): Promise<GmuxProcess[]> {
  const appPid = deps.appPid ?? process.pid;
  let rows: Map<number, ProcRow>;
  try {
    rows = await (deps.psTable ?? readPsTable)();
  } catch {
    return [];
  }
  const kids = childIndex(rows);
  const claimed = new Set<number>();
  const out: GmuxProcess[] = [];

  const leafLabels = deps.sshLeafLabels ?? new Map<string, string>();
  const socket = deps.socket ?? activeTmuxSocket();

  const push = (
    pid: number,
    role: GmuxProcessRole,
    session?: { sessionName: string; sessionId?: string }
  ): void => {
    if (claimed.has(pid)) return;
    const row = rows.get(pid);
    if (row === undefined) return;
    claimed.add(pid);
    const leaf = role === 'ssh-helper' ? sshControlLeafOf(row.command) : null;
    const machineLabel = leaf === null ? undefined : leafLabels.get(leaf);
    out.push({
      pid,
      ppid: row.ppid,
      role,
      rssBytes: row.rssKb * 1024,
      cpuPercent: row.cpuPercent,
      command: row.command,
      binary: binaryOf(row.command),
      ...(session !== undefined ? { sessionName: session.sessionName } : {}),
      ...(session?.sessionId !== undefined ? { sessionId: session.sessionId } : {}),
      ...(machineLabel !== undefined ? { machineLabel } : {})
    });
  };

  /** The role of a child inside the app tree, from its argv shape. */
  const appChildRole = (cmd: string): GmuxProcessRole => {
    if (namesSocket(cmd, socket)) {
      return / -C\b/.test(cmd) ? 'control-client' : 'attach-client';
    }
    if (binaryOf(cmd) === 'ssh') return 'ssh-helper';
    return 'app-helper';
  };

  // 1. The app and everything under it: Electron helpers, and the tmux
  //    clients gmux runs for visible sessions and for its event bus.
  push(appPid, 'app');
  // Probes first, because they are children of the app and would otherwise be
  // claimed by the helper walk below. Usually none; a probe that lingers here
  // for more than a few seconds is the leak class this phase exists to see.
  for (const pid of guardedChildPids()) push(pid, 'probe');
  for (const pid of descendantsOf(kids, appPid)) {
    push(pid, appChildRole(rows.get(pid)?.command ?? ''));
  }

  // 2. The private tmux server — the process that outlives the app and is the
  //    entire point of gmux. It is NOT a child of ours.
  const server =
    (await (deps.serverPid ?? defaultServerPid)()) ??
    findSessionServer(rows.values(), socket);
  if (server !== null) push(server, 'session-server');

  // 3. Session processes and whatever they spawned, addressed through tmux
  //    rather than by name (12.7: agents launch by bare name deliberately).
  try {
    for (const session of await (deps.sessionPids ?? defaultSessionPids)()) {
      // Phase 163: the event bus keeps a session of its own on the server
      // (`-C new-session -A -s gmux-control`), and its pane is a shell
      // Tortie owns rather than work a person started. It is claimed under
      // the app, with its session name kept so the report can say what it is.
      if (session.sessionName === CONTROL_SESSION_NAME) {
        push(session.pid, 'app-helper', session);
        for (const pid of descendantsOf(kids, session.pid)) {
          push(pid, 'app-helper', session);
        }
        continue;
      }
      push(session.pid, 'session', session);
      for (const pid of descendantsOf(kids, session.pid)) {
        push(pid, 'session-child', session);
      }
    }
  } catch {
    /* tmux unreachable — the app's own tree above is still worth showing */
  }

  // 4. Login-shell PATH probes an earlier gmux stranded. Same story as the
  //    orphaned clients: the boot reap clears them, so a row here is either
  //    pre-fix debris or a brand-new leak, and both are worth seeing.
  for (const pid of findStrandedPathProbes(rows)) push(pid, 'orphan-probe');

  // 5. Our tmux clients that nobody owns any more. Normally none: the boot
  //    reap (proc/orphans.ts) clears them. A row here means one appeared
  //    since this app started, which is worth being able to SEE.
  for (const row of rows.values()) {
    if (row.ppid !== 1) continue;
    if (!namesSocket(row.command, socket)) continue;
    push(row.pid, 'orphan-client');
  }

  // 6. Phase 163: ssh masters Tortie persisted for a machine. `ControlMaster
  //    auto` with `ControlPersist` daemonizes the master, which reparents to
  //    launchd, so the app tree walk above cannot see it. Its argv names the
  //    control socket leaf Tortie composed, and only Tortie composes that
  //    shape, so the match is ownership rather than a guess from a name.
  for (const row of rows.values()) {
    if (binaryOf(row.command) !== 'ssh') continue;
    if (sshControlLeafOf(row.command) === null) continue;
    push(row.pid, 'ssh-helper');
  }

  return out;
}
