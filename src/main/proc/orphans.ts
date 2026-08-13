/**
 * orphans.ts — gmux cleans up after gmux, at boot (Phase 13.8 items 1 and 3).
 *
 * Two kinds of stray, both found alive on the user's machine, both ours
 * beyond doubt: tmux clients attached to our PRIVATE socket that no live gmux
 * owns, and login-shell PATH probes carrying the `__GMUX_PATH__` marker from
 * launches that predate the 13.5.1 fix (five of them, oldest 19 h 41 m).
 * Neither can be fixed retroactively by better shutdown code — they are
 * already out there — so gmux picks them up on its way in.
 *
 * MEASURED ON THE REPORTING MACHINE 2026-08-11, and this is the finding that
 * earned the module: `tmux -L gmux list-clients` showed **13 control-mode
 * clients attached to the private server — 12 of them orphaned**, ppid 1,
 * one per app launch that had ended without a clean stop, the oldest from the
 * previous day. Each is ~1 MB of RSS, and worse than the memory: a control
 * client is a live subscriber, so the single-threaded tmux server was fanning
 * every session event out to twelve listeners nobody was reading. Phase 13.7
 * measured what a busy server costs the user; this was tax on top of it.
 *
 * WHY A REAP AND NOT JUST A BETTER SHUTDOWN. TmuxControlClient.stop() already
 * kills the child on quit, and it works: SIGTERM to a control client kills it
 * (verified), and so does closing its stdio (verified). What could NOT be
 * reproduced in isolation — a standalone parent spawning the same client with
 * the same conf, then SIGKILLed — is the survivor itself: in isolation the
 * client always died. So the orphaning needs app state we could not bottle
 * (most plausibly a client mid-write to a stdout nobody drains any more,
 * which never gets back to its stdin EOF). An unreproducible leak cannot be
 * fixed at its source with any confidence — but it CAN be made self-healing,
 * which is what this is. Every launch cleans up what previous launches left.
 *
 * THE SAFETY ARGUMENT, because this module signals processes and CLAUDE.md is
 * explicit that we never touch what we did not create. Four conditions, ALL
 * required, before anything is signalled:
 *   1. argv[0]'s basename is `tmux`;
 *   2. the command line carries `-L gmux` — OUR private socket, which no
 *      other tool on the machine uses and which the user's own tmux (default
 *      socket) never matches;
 *   3. ppid is 1 — it has been re-parented, so no live gmux is managing it.
 *      A second gmux running right now keeps its own client at ppid = its
 *      pid, so a concurrent instance is never in the blast radius;
 *   4. it is not the SERVER pid, which we ask tmux for rather than infer. If
 *      that question cannot be answered, the reap does nothing at all;
 *   5. it is not a tmux SERVER by its own command line, on any socket. Added in
 *      the Phase 23 fix round, after condition 2 and condition 4 were found to
 *      be reading two DIFFERENT sockets. See `findOrphanedClients`.
 * The old note here claimed the consequence was bounded even if the conditions
 * were wrong, because killing a tmux client only detaches it. That was not
 * true, and a harness proved it by killing a server. Condition 5 is what makes
 * the claim true, so it must not be removed.
 */

import { PATH_MARKER } from '../tmux/resolve';
import { activeTmuxSocket, execTmux } from '../tmux/supervisor';
import { readPsTable, type ProcRow } from './ps';

export interface OrphanReapResult {
  /** Orphaned tmux clients found. */
  found: number[];
  /** Stranded login-shell PATH probes found (pre-13.5.1 launches). */
  probes: number[];
  /** Everything we successfully signalled. */
  signalled: number[];
  /** Why nothing was done, when nothing was done. */
  skipped?: string;
}

/** Basename of argv[0] is `tmux` (…/bin/tmux, tmux, tmux: server). */
function isTmuxCommand(command: string): boolean {
  const argv0 = command.split(' ')[0] ?? '';
  const base = argv0.slice(argv0.lastIndexOf('/') + 1);
  return base === 'tmux';
}

/**
 * Is this row a tmux SERVER rather than a client?
 *
 * A server is started as `tmux -L <socket> -f <conf> start-server`, and the
 * verb survives in the process table. Nothing in this module may ever signal
 * one, because a server holds every session inside it.
 */
function isTmuxServer(command: string): boolean {
  return /(^|\s)start-server(\s|$)/.test(command);
}

/**
 * The pure matcher: which rows are OUR orphaned tmux clients?
 * Exported so the safety conditions are testable without a live server.
 *
 * PHASE 23 FIX ROUND, and this is the defect that cost the operator 36 live
 * sessions on 2026-08-12.
 *
 * The socket used to come from the CONSTANT `TMUX_SOCKET`, while `serverPid`
 * was asked of the socket this process is actually on. Those are the same
 * string for every launch a user makes, and they are DIFFERENT the moment a
 * harness sets `GMUX_TMUX_SOCKET`. In that state the real `-L gmux` server has
 * ppid 1, carries `-L gmux` in its command, and is not the pid the reap was
 * told to spare, so all four conditions passed and it was sent SIGTERM with
 * every session inside it.
 *
 * The module's old safety note said the blast radius was bounded because
 * "killing a tmux CLIENT detaches it". That was the wrong claim. The matcher
 * never excluded servers. It excluded ONE server, being the one it had just
 * asked about.
 *
 * Two changes, and either one alone would have prevented it.
 *  1. `socket` is now the socket THIS process is on, so a reap can only ever
 *     match processes on the server it is talking to.
 *  2. A tmux server is never a candidate, whatever socket it is on and whether
 *     or not it is the pid we were told to spare. The reap detaches clients. It
 *     has no business signalling a server at all.
 */
export function findOrphanedClients(
  rows: Iterable<ProcRow>,
  serverPid: number,
  socketName: string = activeTmuxSocket()
): number[] {
  // The socket name must match WHOLE. A plain substring test made `-L gmux`
  // match `-L gmux-verifa` as well, so a reap on the ordinary socket could
  // signal a harness's clients and a harness's reap could signal ours. The
  // token ends at a space or at the end of the line, which is what the process
  // table gives us.
  const onOurSocket = new RegExp(
    `-L ${socketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`
  );
  const orphans: number[] = [];
  for (const row of rows) {
    if (row.pid === serverPid) continue; // never the server we asked about
    if (isTmuxServer(row.command)) continue; // never ANY server
    if (row.ppid !== 1) continue; // someone live is managing it
    if (!onOurSocket.test(row.command)) continue; // not the socket we are on
    if (!isTmuxCommand(row.command)) continue; // not a tmux process
    orphans.push(row.pid);
  }
  return orphans.sort((a, b) => a - b);
}

/**
 * Login-shell PATH probes from launches that predate the 13.5.1 fix, still
 * alive. Five were on the reporting machine when 13.8 swept, the oldest 19 h
 * 41 m, and they come in PAIRS: `zsh -lic` forks a copy of itself, so the
 * table holds a leader (ppid 1, its app long gone) and a fork whose parent is
 * that leader.
 *
 * Ownership is not in doubt for one line of it: `__GMUX_PATH__` is a marker
 * gmux invented and no other program spells. The only question is whether a
 * matching process is STRANDED or belongs to a probe running right now, and
 * the answer is its topmost marker-matching ancestor: a live probe's chain
 * ends at the gmux that spawned it, a stranded one's ends at pid 1.
 */
export function findStrandedPathProbes(rows: Map<number, ProcRow>): number[] {
  const marks = new Set<number>();
  for (const row of rows.values()) {
    if (row.command.includes(PATH_MARKER)) marks.add(row.pid);
  }
  const stranded: number[] = [];
  for (const pid of marks) {
    // Climb while the parent is also a probe (the fork → leader hop).
    let top = pid;
    const seen = new Set<number>([pid]);
    for (;;) {
      const parent = rows.get(top)?.ppid;
      if (parent === undefined || !marks.has(parent) || seen.has(parent)) break;
      seen.add(parent);
      top = parent;
    }
    if (rows.get(top)?.ppid === 1) stranded.push(pid);
  }
  return stranded.sort((a, b) => a - b);
}

/** Ask the private server for its own pid. Null when it cannot be reached. */
async function serverPid(): Promise<number | null> {
  try {
    const out = await execTmux(['display-message', '-p', '#{pid}'], {
      timeoutMs: 3_000
    });
    const pid = Number(out.trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Detach every gmux tmux client that no live gmux owns. Safe to call at any
 * time; called once per boot. Never throws — a failed reap is a log line.
 */
export async function reapOrphanedTmuxClients(): Promise<OrphanReapResult> {
  let rows: Map<number, ProcRow>;
  try {
    rows = await readPsTable();
  } catch {
    return { found: [], probes: [], signalled: [], skipped: 'ps unavailable' };
  }

  // Probes first: they need no server, and their marker makes them ours
  // without any inference at all.
  const probes = findStrandedPathProbes(rows);

  const server = await serverPid();
  // No reachable server ⇒ no clients to judge. Also the fail-safe: without an
  // authoritative server pid we would be guessing which process to spare.
  const found = server === null ? [] : findOrphanedClients(rows.values(), server);

  const signalled: number[] = [];
  for (const pid of [...found, ...probes]) {
    try {
      process.kill(pid, 'SIGTERM');
      signalled.push(pid);
    } catch {
      /* already gone between ps and now — the outcome we wanted */
    }
  }
  if (found.length > 0) {
    console.log(
      `[gmux] detached ${found.length} orphaned tmux client(s) from previous runs: ${found.join(', ')}`
    );
  }
  if (probes.length > 0) {
    console.log(
      `[gmux] killed ${probes.length} stranded PATH probe(s) from previous runs: ${probes.join(', ')}`
    );
  }
  return {
    found,
    probes,
    signalled,
    ...(server === null
      ? { skipped: 'private tmux server not reachable — clients not checked' }
      : {})
  };
}
