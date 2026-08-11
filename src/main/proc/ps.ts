/**
 * ps.ts — one `ps` snapshot, parsed, shared.
 *
 * There were already two hand-rolled `ps` readers in main when Phase 13.8
 * added a third reason to want one (activity/process.ts polls pid/ppid/cpu at
 * 1 Hz; manifest/harvest/stores.ts caches pid→ppid for agent ancestry). This
 * module is NOT a merge of those — both are hot paths with their own field
 * sets and their own caches, and folding them together would couple the
 * activity poll to a diagnostics feature. It is the shared implementation for
 * the ON-DEMAND readers: "what is gmux running" (diagnostics) and "what did
 * gmux leave behind" (orphan reaping), which want RSS and the full command
 * line that neither hot path collects.
 *
 * Pure Node; the parse half is pure and exported for tests.
 */

import { runGuarded } from './guarded';

export interface ProcRow {
  pid: number;
  ppid: number;
  /** Resident set size in KB, as macOS `ps` reports it. */
  rssKb: number;
  /** Percent of one core (lifetime average, `ps` semantics). */
  cpuPercent: number;
  /** Full command line — argv[0] plus arguments. */
  command: string;
}

/**
 * Fields in this exact order. `command=` MUST be last: it is the only field
 * that can contain spaces, so it is the only one the parser can treat as
 * "everything left on the line".
 */
export const PS_ARGS = ['-axo', 'pid=,ppid=,rss=,pcpu=,command='] as const;

const PS_LINE = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/;

export function parsePsTable(stdout: string): Map<number, ProcRow> {
  const rows = new Map<number, ProcRow>();
  for (const line of stdout.split('\n')) {
    const m = PS_LINE.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    rows.set(pid, {
      pid,
      ppid: Number(m[2]),
      rssKb: Number(m[3]),
      cpuPercent: Number(m[4]),
      command: m[5] ?? ''
    });
  }
  return rows;
}

/** pid → its direct children. */
export function childIndex(rows: Map<number, ProcRow>): Map<number, number[]> {
  const kids = new Map<number, number[]>();
  for (const row of rows.values()) {
    const list = kids.get(row.ppid);
    if (list === undefined) kids.set(row.ppid, [row.pid]);
    else list.push(row.pid);
  }
  return kids;
}

/** Every descendant of `root`, root excluded. Bounded against a cyclic table. */
export function descendantsOf(
  kids: Map<number, number[]>,
  root: number
): number[] {
  const out: number[] = [];
  const seen = new Set<number>([root]);
  const stack = [...(kids.get(root) ?? [])];
  while (stack.length > 0 && out.length < 4_096) {
    const pid = stack.pop();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    out.push(pid);
    stack.push(...(kids.get(pid) ?? []));
  }
  return out;
}

/** Read and parse the process table. Empty map when `ps` is unusable. */
export async function readPsTable(): Promise<Map<number, ProcRow>> {
  const r = await runGuarded('/bin/ps', PS_ARGS, {
    timeoutMs: 5_000,
    maxOutputBytes: 8 * 1024 * 1024
  });
  return parsePsTable(r.stdout);
}
