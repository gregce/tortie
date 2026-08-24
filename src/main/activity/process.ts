/**
 * Tier 2 — the process subtree (Phase 13, research 18 §4.2).
 *
 * ONE `ps -axo pid=,ppid=,time=,stat=` snapshot answers for every session at
 * once (20.3 ms CPU for ~1,000 processes). Narrowing it to specific pids is
 * counterproductive on macOS: `ps -p <6 pids>` measured 34.5 ms — SLOWER —
 * because BSD ps walks the whole proc table regardless.
 *
 * Two facts come out of it, and both were measured before they were trusted:
 *
 *  - **Δ CPU-time / Δt over the subtree.** `ps -o %cpu` is useless here: it
 *    is a decayed lifetime average and was observed falling 31.9 → 0.0 across
 *    a single working turn. Only Δ TIME / Δt is a rate. The delta is clamped
 *    at zero because a reaped child makes the subtree sum go backwards
 *    (−14.9 % recorded on a codex trace), which would otherwise suppress the
 *    next tick.
 *  - **A setsid'd tool child.** Agents `setsid` the commands they run but not
 *    their own helpers, so a descendant with `s` (session leader) and without
 *    `+` (foreground) in STAT means "a real tool call is running". This is
 *    the ONLY signal that survives a blocked tool call — `sleep 25` burns no
 *    CPU and prints nothing. Zero transient children were seen across 657
 *    idle child-set observations, so it needs no ignore list. It also excludes
 *    claude's `caffeinate` (S+), which is reaped ~30 s AFTER a turn ends and
 *    would otherwise pin every claude session to "working" for half a minute.
 *
 * CPU may PROMOTE a session to working; it may never DEMOTE one to idle —
 * codex works at 0–5 % while claude idles at 0–3 %, so the distributions
 * overlap and no threshold separates them in that direction.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** CPU% over the subtree that counts as busy (0 false positives at 2 ticks). */
export const CPU_BUSY_PERCENT = 5;
/** Consecutive ticks required — a single sample must never trigger. */
export const CPU_BUSY_TICKS = 2;

export interface ProcSnapshot {
  /** Epoch ms the snapshot was taken. */
  at: number;
  ppid: Map<number, number>;
  /** Cumulative CPU seconds per pid (`ps` TIME). */
  cpu: Map<number, number>;
  stat: Map<number, string>;
  children: Map<number, number[]>;
}

/**
 * macOS `ps` TIME is `[[DD-]HH:]MM:SS.ss` and the minutes field is NOT
 * wrapped at 60 (`77:54.08` is a real reading). Resolution is 10 ms, which is
 * why the sampling interval must stay at 1 s: at 0.5 s a single idle timer
 * tick reads as 4–10 %.
 */
export function parseCpuTime(raw: string): number {
  const [daysPart, rest] = raw.includes('-')
    ? (raw.split('-') as [string, string])
    : ['0', raw];
  const parts = (rest ?? '').split(':').map((p) => Number(p));
  const days = Number(daysPart);
  if (parts.some((p) => !Number.isFinite(p)) || !Number.isFinite(days)) return 0;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  seconds += days * 86_400;
  return Number.isFinite(seconds) ? seconds : 0;
}

export function parseProcTable(stdout: string, at: number): ProcSnapshot {
  const snap: ProcSnapshot = {
    at,
    ppid: new Map(),
    cpu: new Map(),
    stat: new Map(),
    children: new Map()
  };
  for (const line of stdout.split('\n')) {
    const f = line.trim().split(/\s+/);
    if (f.length < 4) continue;
    const pid = Number(f[0]);
    const parent = Number(f[1]);
    if (!Number.isInteger(pid) || !Number.isInteger(parent)) continue;
    snap.ppid.set(pid, parent);
    snap.cpu.set(pid, parseCpuTime(f[2] ?? '0'));
    snap.stat.set(pid, f[3] ?? '');
    const siblings = snap.children.get(parent);
    if (siblings === undefined) snap.children.set(parent, [pid]);
    else siblings.push(pid);
  }
  return snap;
}

/** One snapshot for every session. Resolves null when `ps` is unusable. */
export async function readProcSnapshot(): Promise<ProcSnapshot | null> {
  try {
    const { stdout } = await execFileP(
      '/bin/ps',
      ['-axo', 'pid=,ppid=,time=,stat='],
      { timeout: 5_000, maxBuffer: 8 * 1024 * 1024 }
    );
    return parseProcTable(stdout, Date.now());
  } catch {
    return null;
  }
}

/** Depth-first walk of a pid's descendants (the root itself excluded). */
export function descendants(snap: ProcSnapshot, root: number): number[] {
  const out: number[] = [];
  const stack = [...(snap.children.get(root) ?? [])];
  // Bounded so a pathological/cyclic table can never spin the tick.
  const seen = new Set<number>([root]);
  while (stack.length > 0 && out.length < 4_096) {
    const pid = stack.pop();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    out.push(pid);
    for (const kid of snap.children.get(pid) ?? []) stack.push(kid);
  }
  return out;
}

/** Cumulative CPU seconds of a pid and everything under it. */
export function subtreeCpuSeconds(snap: ProcSnapshot, root: number): number {
  let total = snap.cpu.get(root) ?? 0;
  for (const pid of descendants(snap, root)) total += snap.cpu.get(pid) ?? 0;
  return total;
}

/**
 * A descendant that is a session leader (`s`) and NOT in the foreground
 * process group (`+`) — an agent's setsid'd tool run.
 */
export function hasToolChild(snap: ProcSnapshot, root: number): boolean {
  for (const pid of descendants(snap, root)) {
    const stat = snap.stat.get(pid) ?? '';
    if (stat.includes('s') && !stat.includes('+')) return true;
  }
  return false;
}

/** True when `pid` is `ancestor` or lives underneath it. */
export function isDescendantOf(
  snap: ProcSnapshot,
  pid: number,
  ancestor: number
): boolean {
  let cur = pid;
  for (let hops = 0; hops < 64; hops++) {
    if (cur === ancestor) return true;
    const parent = snap.ppid.get(cur);
    if (parent === undefined || parent === cur || parent <= 1) return false;
    cur = parent;
  }
  return false;
}

/**
 * Rate of a subtree between two snapshots, as a percentage of one core.
 * Negative deltas (a reaped child) clamp to 0 rather than going backwards.
 */
export function cpuPercent(
  prevSeconds: number,
  nextSeconds: number,
  deltaMs: number
): number {
  if (deltaMs <= 0) return 0;
  const delta = Math.max(0, nextSeconds - prevSeconds);
  return (100 * delta) / (deltaMs / 1000);
}

// ---------------------------------------------------------------------------
// Phase 141: the witness
// ---------------------------------------------------------------------------

/**
 * What one `ps -o stat=,ppid= -p <pid>` said about a single process.
 *
 * This is the whole of the drop edge's per-tick cost, measured in research 64
 * §4.2 at 2.5 ms, median of 15 runs. It reads ONE process id, never a tree,
 * and it is taken only for a session that already has a witness.
 */
export interface WitnessReading {
  /** `ps` printed a line for this exact pid. */
  found: boolean;
  /** The STAT column, e.g. `S+` or `T`. Empty when nothing was found. */
  stat: string;
  /** The parent it reported, or null when nothing was found. */
  ppid: number | null;
}

const WITNESS_GONE: WitnessReading = { found: false, stat: '', ppid: null };

/** Parse `ps -o stat=,ppid=` output for one process. */
export function parseWitnessLine(stdout: string): WitnessReading {
  for (const line of stdout.split('\n')) {
    const f = line.trim().split(/\s+/);
    const stat = f[0];
    const parent = Number(f[1]);
    if (stat === undefined || stat.length === 0) continue;
    if (!Number.isInteger(parent)) continue;
    return { found: true, stat, ppid: parent };
  }
  return WITNESS_GONE;
}

/**
 * Read the witnessed process. A failed read means gone: `ps` exits non-zero
 * when the pid does not exist, and a pid that does not exist is exactly the
 * fact the drop edge is looking for.
 */
export async function readWitnessProcess(pid: number): Promise<WitnessReading> {
  if (!Number.isInteger(pid) || pid <= 1) return WITNESS_GONE;
  try {
    const { stdout } = await execFileP(
      '/bin/ps',
      ['-o', 'stat=,ppid=', '-p', String(pid)],
      { timeout: 5_000, maxBuffer: 64 * 1024 }
    );
    return parseWitnessLine(stdout);
  } catch {
    return WITNESS_GONE;
  }
}

/**
 * The whole command line of one process, or null when it is gone. Measured at
 * 2.3 ms. It runs when a process first appears in a session, never per tick,
 * and it is what makes the witness a NAMED process rather than any child.
 */
export async function readProcessCommand(pid: number): Promise<string | null> {
  if (!Number.isInteger(pid) || pid <= 1) return null;
  try {
    const { stdout } = await execFileP(
      '/bin/ps',
      ['-o', 'command=', '-p', String(pid)],
      { timeout: 5_000, maxBuffer: 256 * 1024 }
    );
    const line = stdout.split('\n')[0]?.trim() ?? '';
    return line.length > 0 ? line : null;
  } catch {
    return null;
  }
}

/**
 * The direct children of one process, ascending. Measured at 14.6 ms, which
 * is why it runs once when something appears in a session that dropped and
 * never on an ordinary tick.
 */
export async function readChildPids(pid: number): Promise<number[]> {
  if (!Number.isInteger(pid) || pid <= 1) return [];
  try {
    const { stdout } = await execFileP('/usr/bin/pgrep', ['-P', String(pid)], {
      timeout: 5_000,
      maxBuffer: 64 * 1024
    });
    const pids: number[] = [];
    for (const line of stdout.split('\n')) {
      const n = Number(line.trim());
      if (Number.isInteger(n) && n > 1) pids.push(n);
    }
    return pids.sort((a, b) => a - b);
  } catch {
    // pgrep exits 1 when there are no children, which is not an error here.
    return [];
  }
}

/**
 * The direct child of a pane's own process that holds the terminal, being the
 * one whose STAT carries `+`. Ascending by pid, so the answer is the same on
 * every tick when an agent has spawned a foreground helper of its own.
 *
 * This is a CANDIDATE and never the witness on its own. Candidate C of
 * research 64 witnessed any foreground child and its card then said an agent
 * was running when `npm test` was running, which is what ended it. The caller
 * reads the candidate's command line and keeps it only when it names the
 * agent the row says this session holds.
 */
export function foregroundChildOf(
  snap: ProcSnapshot,
  panePid: number
): number | null {
  const kids = [...(snap.children.get(panePid) ?? [])].sort((a, b) => a - b);
  for (const pid of kids) {
    if ((snap.stat.get(pid) ?? '').includes('+')) return pid;
  }
  return null;
}

/**
 * Whether this pid is in the foreground process group of its terminal, being
 * `+` in its STAT, or null when the table does not know the pid at all. The
 * three answers are kept apart on purpose: research 64 §4.3 measured this as
 * a secondary check, and a check that reads "no" for a process it has never
 * heard of is not a check.
 */
export function holdsTerminal(
  snap: ProcSnapshot,
  pid: number
): boolean | null {
  const stat = snap.stat.get(pid);
  if (stat === undefined) return null;
  return stat.includes('+');
}

/**
 * The same reading, taken from a fleet snapshot that has already been read
 * this tick. Free where the targeted read costs 2.5 ms, and it answers with
 * the same three fields, so the drop edge cannot tell the two apart.
 */
export function witnessFromSnapshot(
  snap: ProcSnapshot,
  pid: number
): WitnessReading {
  const stat = snap.stat.get(pid);
  const parent = snap.ppid.get(pid);
  if (stat === undefined || parent === undefined) return WITNESS_GONE;
  return { found: true, stat, ppid: parent };
}
