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
