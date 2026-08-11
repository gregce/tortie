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
 */

import { guardedChildPids } from '../proc/guarded';
import { findStrandedPathProbes } from '../proc/orphans';
import { childIndex, descendantsOf, readPsTable, type ProcRow } from '../proc/ps';
import { execTmux, TMUX_SOCKET } from '../tmux/supervisor';

export type GmuxProcessRole =
  /** The gmux main process. */
  | 'app'
  /** An Electron helper (renderer / GPU / utility) under the main process. */
  | 'app-helper'
  /** The private tmux server that owns every durable session. */
  | 'session-server'
  /** A tmux client gmux runs for a visible session or for its event bus. */
  | 'attach-client'
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
export function findSessionServer(rows: Iterable<ProcRow>): number | null {
  const marker = `-L ${TMUX_SOCKET}`;
  let best: ProcRow | null = null;
  for (const row of rows) {
    if (!row.command.includes(marker)) continue;
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
  sessionPids?(): Promise<{ pid: number; sessionName: string }[]>;
  /** Injectable for tests. Default: `display-message -p '#{pid}'`. */
  serverPid?(): Promise<number | null>;
  /** The gmux main pid. Default: this process. */
  appPid?: number;
}

async function defaultSessionPids(): Promise<
  { pid: number; sessionName: string }[]
> {
  // Read-only. `#{pane_pid}` is the process tmux forked for that session —
  // the agent itself, or the shell that runs it.
  const out = await execTmux([
    'list-panes',
    '-a',
    '-F',
    '#{pane_pid}\t#{session_name}'
  ]);
  const sessions: { pid: number; sessionName: string }[] = [];
  for (const line of out.split('\n')) {
    const [pidText, name] = line.split('\t');
    const pid = Number(pidText);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    sessions.push({ pid, sessionName: name ?? '' });
  }
  return sessions;
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

  const push = (
    pid: number,
    role: GmuxProcessRole,
    sessionName?: string
  ): void => {
    if (claimed.has(pid)) return;
    const row = rows.get(pid);
    if (row === undefined) return;
    claimed.add(pid);
    out.push({
      pid,
      ppid: row.ppid,
      role,
      rssBytes: row.rssKb * 1024,
      cpuPercent: row.cpuPercent,
      command: row.command,
      ...(sessionName !== undefined ? { sessionName } : {})
    });
  };

  // 1. The app and everything under it: Electron helpers, and the tmux
  //    clients gmux runs for visible sessions and for its event bus.
  push(appPid, 'app');
  // Probes first, because they are children of the app and would otherwise be
  // claimed by the helper walk below. Usually none; a probe that lingers here
  // for more than a few seconds is the leak class this phase exists to see.
  for (const pid of guardedChildPids()) push(pid, 'probe');
  const socketMarker = `-L ${TMUX_SOCKET}`;
  for (const pid of descendantsOf(kids, appPid)) {
    const cmd = rows.get(pid)?.command ?? '';
    push(pid, cmd.includes(socketMarker) ? 'attach-client' : 'app-helper');
  }

  // 2. The private tmux server — the process that outlives the app and is the
  //    entire point of gmux. It is NOT a child of ours.
  const server =
    (await (deps.serverPid ?? defaultServerPid)()) ??
    findSessionServer(rows.values());
  if (server !== null) push(server, 'session-server');

  // 3. Session processes and whatever they spawned, addressed through tmux
  //    rather than by name (12.7: agents launch by bare name deliberately).
  try {
    for (const session of await (deps.sessionPids ?? defaultSessionPids)()) {
      push(session.pid, 'session', session.sessionName);
      for (const pid of descendantsOf(kids, session.pid)) {
        push(pid, 'session-child', session.sessionName);
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
    if (!row.command.includes(socketMarker)) continue;
    push(row.pid, 'orphan-client');
  }

  return out;
}
