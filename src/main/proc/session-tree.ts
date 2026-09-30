/**
 * session-tree.ts — what End ends after the hang-up (Phase 323).
 *
 * THE DEFECT. `tmux kill-session` hangs up the session's terminal and does
 * nothing else. Every agent that ends on the hang-up is gone within about a
 * second and a half (build/p323/SPEC.md §3, 72 agent rows). Gemini CLI's
 * launcher, when it is the pane process, catches the hang-up and waits for a
 * child that never finishes, so both of its processes ran on with nothing
 * pointing at them: 48 of them on the operator's Mac on 2026-09-23. (Read from
 * Gemini's own bundle since: the launcher's handlers for SIGHUP, SIGTERM and
 * SIGINT do nothing, and the child is never sent the hang-up at all, because
 * the kernel sends it to the terminal's foreground group only when the session
 * leader EXITS, and the leader never does.)
 *
 * THE RULE, and it is narrower than "everything under the pane" on purpose
 * (SPEC §2 and §As built, the second fix round). A process is ended only when
 * ALL of these hold:
 *   1. the tree read recorded it under a LIVE pane of that session, whose pane
 *      process is the answering tmux server's own child and leads its own
 *      group, as every pane process does (a dead pane's pid is free for the
 *      kernel to hand out again, so it proves nothing);
 *   2. at that read it was in the pane process's OWN group, the group the
 *      hang-up was aimed at. Not the terminal's foreground group when that is
 *      another: in a restored row that is whatever a person ran in front of
 *      the shell, and ending his foreground `nohup` job there was worse than
 *      today (the verifier's attack d2), so the second fix round removed it;
 *   3. the server no longer shows its pane: a window another session still
 *      shows (a grouped session, a linked window) was never hung up, and its
 *      processes are not End's to end (the verifier's S10);
 *   4. it is still running after {@link HANGUP_GRACE_MS} with the same start
 *      time, command line and group.
 * A process that left the terminal (its own session, its own group) is never
 * signalled. That is where Codex's shared background server and Gemini's own
 * self-update live, and ending either would be worse than today. An executable
 * inside an application bundle is never signalled either.
 *
 * ONE PID AT A TIME. Every signal goes to one positive pid that the re-read
 * just before it produced. Never a group, never a negative pid, never a
 * pattern and never a name: a group id is not an identity, and a name matches a
 * stranger. `./orphans.ts` and `./guarded.ts` aim at groups for their own
 * reasons, and that shape is refused here.
 *
 * WHAT THE FIX ROUNDS CHANGED, and each because a verifier measured it worse
 * (SPEC §As built):
 *   - End's own read, the one the hang-up waits for, is the processes on the
 *     pane's TERMINAL ({@link terminalPsArgs}, about 4 ms) rather than the
 *     whole table (about 60 ms), and core.ts starts it beside the capture.
 *   - The identity re-read asks `ps` for ONE pid per call. macOS `ps -p` with
 *     two or more pids costs about 200 ms of system time and such calls run one
 *     at a time, so a batch End's re-reads ran out of time and ended nothing.
 *   - A re-read that fails proves nothing on that poll, and the next one is
 *     asked, up to {@link READ_RETRY_MS} past each grace; a signal still
 *     follows only a re-read that answered.
 *   - THE SECOND FIX ROUND: the graces are long enough for an agent's own
 *     orderly exit. At 4 s a process that ends itself on the hang-up but takes
 *     5 s to do it was cut by SIGTERM (the verifier's S9), and Claude Code's
 *     own shutdown gives a person's SessionEnd hooks up to a minute; see the
 *     two constants.
 *
 * WHAT CANNOT BE PROVED, named rather than guessed. A process that double
 * forked away before End is not under the pane, so it is not in the tree. One
 * born between the read and the hang-up is not in it either, nor one that
 * joins the group after the read. macOS offers no way to hold a pid, so a pid
 * could in principle be reused between its identity re-read and its signal:
 * the re-reads of one poll are taken one pid after another, so the gap is at
 * most one read's bound ({@link TREE_READ_TIMEOUT_MS}), and a kernel has to
 * hand the same number to a new process with the same group, command line and
 * start second inside it (the attack verifier needed 97,920 forks, about 25 s,
 * to reuse one pid at all).
 *
 * Pure plus injected: no Electron and no tmux import, so the harness runner
 * (`build/session-tree-cli.mts`) loads this file under tsx. The real reader
 * and the real signal live in {@link defaultEndDeps}; which tmux server the
 * pane check asks is the caller's, through {@link livePanesVia}.
 */

import { runGuarded } from './guarded';
import type { KillFn } from './orphans';
import { childIndex, descendantsOf } from './ps';

/** One row of the process table, C locale. */
export interface TreeRow {
  pid: number;
  ppid: number;
  pgid: number;
  /** The foreground group of the process's terminal; 0 when it has none. */
  tpgid: number;
  stat: string;
  /** The start time, C locale, whitespace collapsed: `Sun Sep 6 17:41:36 2026`. */
  lstart: string;
  command: string;
}

/** What proves a pid is still the process the tree read recorded. */
export interface TreeEntry {
  pid: number;
  pgid: number;
  lstart: string;
  command: string;
}

/** A live pane's process, the tmux server that answered for it, and the pane's terminal. */
export interface PaneRoot {
  pid: number;
  serverPid: number;
  /** `/dev/ttys012`. End reads the processes whose controlling terminal this is. */
  tty: string;
}

export interface SessionTree {
  /**
   * Every process read under the live panes, roots included. From the wide
   * table (the harness's read) that includes what left the terminal; from the
   * terminal read (End's) it is what is still on the panes' terminals.
   */
  readonly all: readonly TreeEntry[];
  /** The ones the hang-up was aimed at: in a root's own group, the group its pane process leads (SPEC §2.2, §As built). */
  readonly targets: readonly TreeEntry[];
}

/**
 * The fields, in this order. `command=` is last because it is the only field
 * that can hold spaces. `lstart` is five tokens under the C locale, which is
 * why every read here sets `LC_ALL` (SPEC §1.2: the same process reads
 * `Mar 29 sep 17:41:36 2026` under fr_FR).
 */
const TREE_FIELDS = 'pid=,ppid=,pgid=,tpgid=,stat=,lstart=,command=';

/** The one wide read: every process, full command lines (`-ww`). The harness's read. */
export const TREE_PS_ARGS: readonly string[] = Object.freeze([
  '-ww',
  '-axo',
  TREE_FIELDS
]);

/**
 * End's own read: the processes whose controlling terminal is this pane's.
 * Every process in the pane process's session has it, so every process in the
 * group the hang-up is aimed at is here. About 4 ms against the wide
 * read's 60 (measured 2026-09-30 on his Mac), because the kernel filters it.
 */
export function terminalPsArgs(tty: string): string[] {
  return ['-ww', '-o', TREE_FIELDS, '-t', tty];
}

/**
 * The identity re-read, for ONE pid. Never several: macOS `ps -p a,b` costs
 * about 200 ms of system time where `ps -p a` costs 2, and concurrent calls of
 * the first kind run one at a time (the fix round's verifier: 4 concurrent
 * re-reads took 964 ms each, 10 took 3,264), so a batch End's re-reads ran out
 * of time and ended nothing.
 */
export function identityPsArgs(pid: number): string[] {
  return ['-ww', '-o', TREE_FIELDS, '-p', String(pid)];
}

/**
 * A pane's process, whether the pane is dead, the server's own pid and the
 * pane's terminal. SPACE separated: tmux sends a tab as `_` to a client whose
 * locale is not UTF-8 (tmux 3.6a and 3.7b, measured 2026-09-29), which read as
 * no pane at all and ended nothing, and none of these four fields can hold a
 * space.
 */
export const PANE_ROOT_FORMAT = '#{pane_pid} #{pane_dead} #{pid} #{pane_tty}';

/** Every pane of one session, across its windows. `target` is already a `-t` value. */
export function sessionPanesArgv(target: string): string[] {
  return ['list-panes', '-s', '-t', target, '-F', PANE_ROOT_FORMAT];
}

/** Every pane on the server (the harness backstop reads a whole scratch server). */
export const ALL_PANES_ARGV: readonly string[] = Object.freeze([
  'list-panes',
  '-a',
  '-F',
  PANE_ROOT_FORMAT
]);

/**
 * THE PANE CHECK (the second fix round). Every pane the server still shows,
 * dead or alive, by its process. Asked before each signal: a target whose
 * pane is here was never hung up, because `kill-session` destroys only the
 * windows no other session shows. A grouped session (`new-session -t`) and a
 * linked window (`link-window`) both keep the pane, and anything in a pane can
 * make either, because `$TMUX` points at the server. Measured on the vendored
 * 3.7b on 2026-09-30: after `kill-session` of such a session its pane is still
 * listed, live, under the other session.
 */
export const LIVE_PANES_ARGV: readonly string[] = Object.freeze([
  'list-panes',
  '-a',
  '-F',
  '#{pane_pid}'
]);

/** Parse `LIVE_PANES_ARGV`'s answer. Null when a line is not a whole number: an answer not understood proves nothing. */
export function parsePanePids(stdout: string): Set<number> | null {
  const out = new Set<number>();
  for (const line of stdout.split('\n')) {
    const text = line.trim();
    if (text === '') continue;
    if (!WHOLE.test(text)) return null;
    out.add(Number(text));
  }
  return out;
}

/**
 * The pane check over one tmux server: `ask` runs a tmux argv against the
 * server that answered the tree read, within {@link TREE_READ_TIMEOUT_MS};
 * `serverGone` says whether a failure CONFIRMED that no server is running
 * (then no pane can be shown, so the answer is an empty set). Any other failure
 * is null, and a null signals nothing on that poll.
 */
export function livePanesVia(
  ask: (argv: readonly string[]) => Promise<string>,
  serverGone: (err: unknown) => boolean
): () => Promise<ReadonlySet<number> | null> {
  return async () => {
    try {
      return parsePanePids(await ask(LIVE_PANES_ARGV));
    } catch (err) {
      return serverGone(err) ? new Set<number>() : null;
    }
  };
}

/**
 * How long a target is given to end on the hang-up before it is sent SIGTERM.
 *
 * It was 4 s, 2.6 times the slowest orderly exit the census measured (1,534
 * ms, a restored Gemini under four-way concurrency). The second fix round's
 * verifier planted a process that ends itself on the hang-up in 5 s and lets
 * SIGTERM end it at once: at 4 s its exit was cut, and today it completes (S9).
 * So it is 10 s: twice that, and longer than Claude Code's own default
 * shutdown failsafe (6.5 s, read from 2.1.285: the larger of 5 s and its
 * SessionEnd hook timeout, 1.5 s by default, plus 5 s). A process that catches
 * the hang-up, lets SIGTERM end it, and needs more than this to exit is still
 * cut; that residue is named for him (SPEC §11).
 */
export const HANGUP_GRACE_MS = 10_000;
/**
 * How long after SIGTERM before SIGKILL.
 *
 * It was 2.5 s, 1.7 times the slowest SIGTERM exit measured (1,465 ms). The
 * second fix round read Claude Code 2.1.285's own shutdown: a SIGTERM that
 * arrives while it is already shutting down is ignored, and its shutdown gives
 * a person's SessionEnd hooks up to their longest configured timeout, capped at
 * 60 s, before its own failsafe at that plus 5 s. A SIGKILL before that cuts
 * an exit today completes. So the two graces together are 70 s, past the 65 s
 * an agent Tortie launches allows itself. Nothing waits for this: the End has
 * answered and a quit does not wait; only a process that ignores SIGTERM too is
 * left this long.
 */
export const TERM_GRACE_MS = 60_000;
/** The re-read interval while an orderly exit is likely, and between failed re-reads. */
export const POLL_MS = 250;
/**
 * After the hang-up, and after SIGTERM, the ending re-reads every
 * {@link POLL_MS} for this long, so a process that exits the way every agent in
 * the census did (the slowest in 1,534 ms) is seen gone and the ending returns.
 * After it, one wait to the grace's end, then one re-read: a grace this long
 * polled at 250 ms would spawn a `ps` 40 times for nothing.
 */
export const QUICK_POLLS_MS = 2_000;
/**
 * The bound on one read: End's terminal read, the wide read, and one poll's
 * re-reads taken together. 17 times the wide read's median (59 ms) and 12 times
 * its slowest (83 ms).
 */
export const TREE_READ_TIMEOUT_MS = 1_000;
/**
 * How long past each grace the ending keeps asking when re-reads fail, before
 * it gives up having signalled nothing further. Longer than the longest stall
 * the fix round's verifier measured on his Mac under load (9 s, a 1 s poll
 * that did not come back). A signal is only ever sent right after a re-read
 * that answered, however late.
 */
export const READ_RETRY_MS = 10_000;
/**
 * The longest the ending can run: each grace, overrun by its whole retry
 * window, one poll, and the two reads a signal waits for (the pane check and
 * the identity re-read), each finishing just inside its bound. The conformance
 * harness's closing check waits this long for an End it did not send
 * (`src/main/conformance/scratch.ts`), and the harness runner's `end` is given
 * longer than it (`build/harness-socket.mjs`). Nothing in the product waits for
 * it: the End answers first, and a quit does not wait (SPEC §As built).
 */
export const ENDING_WORST_MS =
  HANGUP_GRACE_MS +
  TERM_GRACE_MS +
  2 * (READ_RETRY_MS + POLL_MS + 2 * TREE_READ_TIMEOUT_MS);
/**
 * Above this many pids a poll reads the wide table once rather than one `ps -p`
 * each: 16 of those at about 2 ms is about half of one wide read.
 */
export const REREAD_ONE_BY_ONE_MAX = 16;

/** A cap on the process table's text; the measured table is about 351 KB. */
const MAX_TABLE_BYTES = 16 * 1024 * 1024;

const WHOLE = /^\d+$/;
/** A pane's terminal as tmux names it on macOS. */
const TTY = /^\/dev\/tty[A-Za-z0-9]+$/;

/**
 * Parse `list-panes -F PANE_ROOT_FORMAT`. A dead pane is dropped, and so is
 * any line that is not three whole numbers above 1 with a live flag of exactly
 * `0` and a terminal path.
 */
export function parsePaneRoots(stdout: string): PaneRoot[] {
  const roots: PaneRoot[] = [];
  for (const line of stdout.split('\n')) {
    const fields = line.trim().split(' ');
    if (fields.length !== 4) continue;
    const [pidText, dead, serverText, tty] = fields;
    if (pidText === undefined || serverText === undefined || tty === undefined) continue;
    if (!WHOLE.test(pidText) || !WHOLE.test(serverText)) continue;
    if (dead !== '0') continue;
    if (!TTY.test(tty)) continue;
    const pid = Number(pidText);
    const serverPid = Number(serverText);
    if (pid <= 1 || serverPid <= 1 || pid === serverPid) continue;
    roots.push({ pid, serverPid, tty });
  }
  return roots;
}

const DAY = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const TREE_LINE = new RegExp(
  '^\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(-?\\d+)\\s+(\\S+)\\s+' +
    `(${DAY}\\s+${MONTH}\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2}\\s+\\d{4})` +
    '(?:\\s+(.*))?$'
);

/**
 * Parse the table. Only the C locale's start time is accepted, so a read
 * taken under another locale parses to nothing rather than to a start time no
 * later read can match. Runs of whitespace inside the start time collapse to
 * one space (a day below 10 is space padded). A pid that appears twice has no
 * single identity, so it is dropped: macOS `ps` escapes a newline in a command
 * line, so this does not happen, and if it did the row is simply never ours.
 */
export function parseTreeTable(stdout: string): Map<number, TreeRow> {
  const rows = new Map<number, TreeRow>();
  const twice = new Set<number>();
  for (const line of stdout.split('\n')) {
    const m = TREE_LINE.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    if (rows.has(pid)) twice.add(pid);
    rows.set(pid, {
      pid,
      ppid: Number(m[2]),
      pgid: Number(m[3]),
      tpgid: Number(m[4]),
      stat: m[5] ?? '',
      lstart: (m[6] ?? '').replace(/\s+/g, ' '),
      command: (m[7] ?? '').trimEnd()
    });
  }
  for (const pid of twice) rows.delete(pid);
  return rows;
}

/** `pid` and every ancestor the table names for it, bounded against a cycle. */
function withAncestors(
  table: ReadonlyMap<number, TreeRow>,
  pid: number,
  into: Set<number>
): void {
  let at: number | undefined = pid;
  for (let hops = 0; at !== undefined && hops < 4_096; hops += 1) {
    if (into.has(at)) return;
    into.add(at);
    at = table.get(at)?.ppid;
  }
}

function entryOf(row: TreeRow): TreeEntry {
  return {
    pid: row.pid,
    pgid: row.pgid,
    lstart: row.lstart,
    command: row.command
  };
}

/**
 * The session's tree, read while its panes are still alive.
 *
 * A root counts only when its row exists, its parent is the server that
 * answered, which is what defeats a reused pid, and it leads its own group,
 * which every pane process does (tmux starts it with `setsid`, and a session
 * leader cannot change its group). So every target's group IS its pane's
 * process, which is what the pane check ({@link hungUpOnly}) reads. The walk is
 * `descendantsOf` from each counted root (cycle safe, capped at 4,096). Never
 * included, whatever the table claims: pid 1 and below, each answering server
 * and every ancestor of it, and `selfPid` and every ancestor of it, so the
 * reader can never select the tmux server, the process running this code, or
 * anything waiting on it.
 *
 * The targets are the root's OWN group. Not its terminal's foreground group
 * when that is another group (the second fix round): in a created or wrapped
 * row the agent is in the root's group anyway (census, SPEC §3), and in a
 * restored row the foreground group is whatever a person started in front of
 * the shell, which is his.
 */
export function readSessionTree(
  table: ReadonlyMap<number, TreeRow>,
  roots: readonly PaneRoot[],
  selfPid: number
): SessionTree {
  const kids = childIndex(table);
  const never = new Set<number>();
  withAncestors(table, selfPid, never);
  for (const root of roots) withAncestors(table, root.serverPid, never);

  const seen = new Set<number>();
  const all: TreeEntry[] = [];
  const targets: TreeEntry[] = [];
  for (const root of roots) {
    if (root.pid <= 1 || root.serverPid <= 1 || never.has(root.pid)) continue;
    // The server's own child, or it is not this pane's process at all; and
    // the leader of its own group, as every pane process is.
    const rootRow = table.get(root.pid);
    const counted =
      rootRow !== undefined &&
      rootRow.ppid === root.serverPid &&
      rootRow.pgid === root.pid;
    if (!counted) continue;
    for (const pid of [root.pid, ...descendantsOf(kids, root.pid)]) {
      if (pid <= 1 || never.has(pid) || seen.has(pid)) continue;
      const row = table.get(pid);
      if (row === undefined) continue;
      seen.add(pid);
      const entry = entryOf(row);
      all.push(entry);
      // The group the hang-up was aimed at: the pane process's own. The WHOLE
      // line is asked rather than a first token, because argv[0] can itself
      // hold a space (`/Applications/Visual Studio Code.app/…`) and the table
      // carries no argument boundaries. Asking more only spares more.
      if (
        row.pgid === rootRow.pgid &&
        !row.command.includes('.app/Contents/MacOS/')
      ) {
        targets.push(entry);
      }
    }
  }
  return { all, targets };
}

/**
 * The entries the table still shows as the same process: pid, group, start
 * time and the WHOLE command line all equal. A reused pid (a new start time), a
 * process that exec'd another program or the same one with other arguments (a
 * new command line) and one that left its group all drop out, and so does one
 * that is gone.
 */
export function stillTheSame(
  entries: readonly TreeEntry[],
  table: ReadonlyMap<number, TreeRow>
): TreeEntry[] {
  return entries.filter((e) => {
    const row = table.get(e.pid);
    return (
      row !== undefined &&
      row.pid === e.pid &&
      row.pgid === e.pgid &&
      row.lstart === e.lstart &&
      row.command === e.command
    );
  });
}

/**
 * THE PANE CHECK, applied to a re-read: the table without every recorded
 * process whose pane the server still shows. A target's group is its pane's
 * process ({@link readSessionTree} requires the root to lead its own group), so
 * a target whose group is still a pane on the server was never hung up, and
 * dropping its row makes {@link stillTheSame} drop it for good. An empty set
 * (no pane shown, or not yet asked) leaves the table as it is.
 */
export function hungUpOnly(
  table: ReadonlyMap<number, TreeRow>,
  entries: readonly TreeEntry[],
  panes: ReadonlySet<number>
): ReadonlyMap<number, TreeRow> {
  if (panes.size === 0) return table;
  const out = new Map(table);
  for (const e of entries) if (panes.has(e.pgid)) out.delete(e.pid);
  return out;
}

/** The program's file name, for a log line. Never the command line. */
export function basenameOf(command: string): string {
  const first = command.trim().split(/\s+/)[0] ?? '';
  const name = first.slice(first.lastIndexOf('/') + 1);
  return (name === '' ? '?' : name).slice(0, 64);
}

export interface EndDeps {
  /** The wide table (the harness's read). Null when `ps` failed or timed out. */
  readTable(): Promise<Map<number, TreeRow> | null>;
  /**
   * The processes on these pane terminals (End's read, the one the hang-up
   * waits for). Null when `ps` failed or timed out.
   */
  readTerminals(ttys: readonly string[]): Promise<Map<number, TreeRow> | null>;
  /** The named pids only. Null when `ps` failed or timed out; an empty map when none is running. */
  reread(pids: readonly number[]): Promise<Map<number, TreeRow> | null>;
  /**
   * The pane check: every pane the server that answered the tree read still
   * shows, by its process. Null when tmux could not be asked; an empty set
   * when the server is confirmed gone. See {@link livePanesVia}.
   */
  livePanes(): Promise<ReadonlySet<number> | null>;
  kill: KillFn;
  sleep(ms: number): Promise<void>;
  now(): number;
}

/** One `/bin/ps`, C locale, bounded. Null on anything but a clean answer. */
async function readPs(
  args: readonly string[],
  noneIsEmpty: boolean,
  timeoutMs: number = TREE_READ_TIMEOUT_MS
): Promise<Map<number, TreeRow> | null> {
  const r = await runGuarded('/bin/ps', args, {
    env: { ...process.env, LC_ALL: 'C' },
    timeoutMs,
    maxOutputBytes: MAX_TABLE_BYTES
  });
  if (r.spawnError !== null || r.timedOut || r.cancelled || r.signal !== null) {
    return null;
  }
  if (r.stdout.length >= MAX_TABLE_BYTES) return null;
  // `ps -p` and `ps -t` answer exit 1 with no output at all when nothing they
  // name is running (measured on macOS 2026-09-29 and 2026-09-30). That is an
  // answer, not a failure. A terminal that does not exist says so on stderr.
  if (
    noneIsEmpty &&
    r.code === 1 &&
    r.stdout.trim() === '' &&
    r.stderr.trim() === ''
  ) {
    return new Map();
  }
  if (r.code !== 0) return null;
  return parseTreeTable(r.stdout);
}

/** End's read: one `ps -t` per terminal, all inside one read's bound. */
async function readTerminalsOnce(
  ttys: readonly string[]
): Promise<Map<number, TreeRow> | null> {
  const until = Date.now() + TREE_READ_TIMEOUT_MS;
  const out = new Map<number, TreeRow>();
  for (const tty of new Set(ttys)) {
    if (!TTY.test(tty)) return null;
    const left = until - Date.now();
    if (left <= 0) return null;
    const one = await readPs(terminalPsArgs(tty), true, left);
    if (one === null) return null;
    for (const [pid, row] of one) out.set(pid, row);
  }
  return out;
}

/**
 * One poll's re-read: one `ps -p` per pid, all inside one read's bound, or the
 * wide table once above {@link REREAD_ONE_BY_ONE_MAX} pids. Null when any of
 * them did not answer, because a poll that proved only some pids proves
 * nothing about the rest.
 */
async function rereadPids(
  pids: readonly number[]
): Promise<Map<number, TreeRow> | null> {
  const out = new Map<number, TreeRow>();
  if (pids.length === 0) return out;
  if (pids.length > REREAD_ONE_BY_ONE_MAX) {
    const table = await readPs(TREE_PS_ARGS, false);
    if (table === null) return null;
    for (const pid of pids) {
      const row = table.get(pid);
      if (row !== undefined) out.set(pid, row);
    }
    return out;
  }
  const until = Date.now() + TREE_READ_TIMEOUT_MS;
  for (const pid of pids) {
    const left = until - Date.now();
    if (left <= 0) return null;
    const one = await readPs(identityPsArgs(pid), true, left);
    if (one === null) return null;
    const row = one.get(pid);
    if (row !== undefined) out.set(pid, row);
  }
  return out;
}

/**
 * The real reader, the real signal and the real clock. `livePanes` is the
 * caller's, because only the caller knows which tmux server answered the tree
 * read: build it with {@link livePanesVia}.
 */
export function defaultEndDeps(
  livePanes: () => Promise<ReadonlySet<number> | null>
): EndDeps {
  return {
    readTable: () => readPs(TREE_PS_ARGS, false),
    readTerminals: (ttys) => readTerminalsOnce(ttys),
    reread: (pids) => rereadPids(pids),
    livePanes,
    kill: process.kill.bind(process),
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }),
    now: () => Date.now()
  };
}

export interface EndReport {
  /** Each process a signal reached, with the last signal it was sent. */
  ended: Array<{ pid: number; name: string; signal: 'SIGTERM' | 'SIGKILL' }>;
  /** No re-read answered in time, so nothing further was signalled. */
  readFailed: boolean;
}

function pidsOf(entries: readonly TreeEntry[]): number[] {
  return entries.map((e) => e.pid);
}

/** Not a signal step: no pane is dropped (see {@link hungUpOnly}). */
const NO_PANES: ReadonlySet<number> = new Set<number>();

/**
 * How long to wait before the next re-read: every {@link POLL_MS} for
 * {@link QUICK_POLLS_MS} after `from`, then once to the grace's end `until`,
 * and every {@link POLL_MS} again past it (a re-read that failed there is asked
 * again, see {@link READ_RETRY_MS}).
 */
function nextWait(now: number, from: number, until: number): number {
  if (now >= until || now - from < QUICK_POLLS_MS) {
    return Math.max(1, Math.min(POLL_MS, until > now ? until - now : POLL_MS));
  }
  return until - now;
}

/**
 * End the targets that outlived the hang-up. The order, which
 * `conformance:endtree` pins:
 *   1. no targets: return at once. Only `tree.targets` is ever read here;
 *      `tree.all` holds what left the terminal, and none of it is signalled;
 *   2. re-read; keep only what is still the same process; nothing left: return;
 *   3. re-read every {@link POLL_MS} for {@link QUICK_POLLS_MS}, then once
 *      when {@link HANGUP_GRACE_MS} has passed since the call;
 *   4. THE PANE CHECK, then the re-read: drop every target whose pane the
 *      server still shows (it was never hung up), then SIGTERM each process
 *      the re-read that just answered still shows;
 *   5. re-read as above for up to {@link TERM_GRACE_MS};
 *   6. the pane check and the re-read again, then SIGKILL each process the
 *      re-read that just answered still shows.
 * A re-read or a pane check that fails proves nothing on that poll and the
 * next is asked; if none answers within {@link READ_RETRY_MS} of a grace's end,
 * it returns `readFailed` having signalled nothing further. Every signal is
 * sent to a list the re-read immediately before it produced, with no wait
 * between that re-read and the signal. Never throws: an unexpected error is a
 * `readFailed` report.
 */
export async function endHangupSurvivors(
  tree: SessionTree,
  deps: EndDeps
): Promise<EndReport> {
  const report: EndReport = { ended: [], readFailed: false };
  const sent = new Map<number, EndReport['ended'][number]>();
  const finish = (readFailed: boolean): EndReport => {
    report.ended = [...sent.values()];
    report.readFailed = readFailed;
    return report;
  };
  try {
    let alive: TreeEntry[] = [...tree.targets];
    if (alive.length === 0) return finish(false);

    // The hang-up's grace.
    const calledAt = deps.now();
    const hangupEnds = calledAt + HANGUP_GRACE_MS;
    for (;;) {
      const due = deps.now() >= hangupEnds;
      // Only a step that may signal asks the server for its panes.
      const panes = due ? await deps.livePanes() : NO_PANES;
      const table = panes === null ? null : await deps.reread(pidsOf(alive));
      if (table !== null && panes !== null) {
        alive = stillTheSame(alive, hungUpOnly(table, alive, panes));
        if (alive.length === 0) return finish(false);
        if (due) {
          for (const e of alive) {
            if (e.pid <= 1) continue;
            try {
              deps.kill(e.pid, 'SIGTERM');
              sent.set(e.pid, {
                pid: e.pid,
                name: basenameOf(e.command),
                signal: 'SIGTERM'
              });
            } catch {
              // ESRCH: it went between the re-read and now, which is the
              // outcome wanted. EPERM: not ours to signal. Either way nothing
              // was sent.
            }
          }
          break;
        }
      } else if (deps.now() >= hangupEnds + READ_RETRY_MS) {
        // Nothing answered in time: End as it was before Phase 323.
        return finish(true);
      }
      await deps.sleep(nextWait(deps.now(), calledAt, hangupEnds));
    }

    // SIGTERM's grace.
    const termSentAt = deps.now();
    const termEnds = termSentAt + TERM_GRACE_MS;
    for (;;) {
      await deps.sleep(nextWait(deps.now(), termSentAt, termEnds));
      const due = deps.now() >= termEnds;
      const panes = due ? await deps.livePanes() : NO_PANES;
      const table = panes === null ? null : await deps.reread(pidsOf(alive));
      if (table !== null && panes !== null) {
        alive = stillTheSame(alive, hungUpOnly(table, alive, panes));
        if (alive.length === 0) return finish(false);
        if (due) {
          for (const e of alive) {
            if (e.pid <= 1) continue;
            try {
              deps.kill(e.pid, 'SIGKILL');
              sent.set(e.pid, {
                pid: e.pid,
                name: basenameOf(e.command),
                signal: 'SIGKILL'
              });
            } catch {
              // As above: gone already, or not ours.
            }
          }
          return finish(false);
        }
      } else if (deps.now() >= termEnds + READ_RETRY_MS) {
        return finish(true);
      }
    }
  } catch {
    return finish(true);
  }
}
