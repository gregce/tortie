/**
 * The cached process table and the id pattern — the shared leaves of the
 * harvest layer (Phase 42 stage 8, re-homed out of ./stores.ts).
 *
 * Both ./stores.ts (qwen's descendant check, muse's fallback, every UUID
 * gate) and ./agy-owner.ts (the antigravity ownership probe) need these.
 * While they lived in stores.ts the two files imported each other, which was
 * the one production import cycle in main. This module imports neither of
 * them, so the direction is now stores -> agy-owner -> here.
 *
 * Ownership: src/main/manifest/**. Pure Node (no Electron import).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** One row of the cached `ps` snapshot. */
export interface ProcessRow {
  pid: number;
  ppid: number;
  /** The executable as ps reports `comm` — a path or a bare name. */
  comm: string;
}

interface ProcessTable {
  rows: Map<number, ProcessRow>;
  readAt: number;
}

let processTableCache: ProcessTable | null = null;
const PROCESS_TABLE_TTL_MS = 1_000;

/**
 * The one read of the raw table: `ps -Axo pid=,ppid=,comm=` over PATH. A
 * missing or refusing `ps` rejects, and processTable() turns that into an
 * empty table so every caller degrades to 'unknown'.
 */
async function readLiveTable(): Promise<string> {
  const { stdout } = await execFileAsync('ps', ['-Axo', 'pid=,ppid=,comm='], {
    timeout: 5_000,
    maxBuffer: 8 * 1024 * 1024
  });
  return stdout;
}

/** What answers for `ps`. Production reads the live table; a test scripts one. */
export type ProcessTableReader = () => Promise<string>;

let readTable: ProcessTableReader = readLiveTable;

/**
 * Test seam (Phase 171). The hermetic lane must never read this machine's
 * process table, and before this seam the only way to prove the ppid walk was
 * to ask the live `ps` about the test runner's own parent. A test hands in the
 * text `ps` would have printed, being the measured qwen shape or a chain built
 * on purpose, and `null` restores the live reader. Setting it also forgets the
 * cached snapshot, so the next read is the scripted one.
 */
export function setProcessTableReader(reader: ProcessTableReader | null): void {
  readTable = reader ?? readLiveTable;
  processTableCache = null;
}

/**
 * Parse `ps -Axo pid=,ppid=,comm=` output. Pure, and exported so the parse
 * half is provable without a process table.
 */
export function parseProcessTable(stdout: string): Map<number, ProcessRow> {
  const rows = new Map<number, ProcessRow>();
  for (const line of stdout.split('\n')) {
    // comm can hold spaces ("/Applications/Google Chrome.app/…"), so only
    // the first two fields are numeric and the rest is the command.
    const m = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    rows.set(pid, { pid, ppid: Number(m[2]), comm: m[3] ?? '' });
  }
  return rows;
}

/**
 * pid → {pid, ppid, comm} for every process, refreshed at most once a second.
 *
 * Phase 32 widened the old pid → ppid table to carry `comm` too, so ONE `ps`
 * call serves the ancestry checks in ./stores.ts AND the agy ownership probe
 * in ./agy-owner.ts. A directory holding several candidates must not multiply
 * process-table reads, so the cache and its TTL stay exactly as they were.
 */
export async function processTable(): Promise<Map<number, ProcessRow>> {
  const now = Date.now();
  if (
    processTableCache !== null &&
    now - processTableCache.readAt < PROCESS_TABLE_TTL_MS
  ) {
    return processTableCache.rows;
  }
  let rows = new Map<number, ProcessRow>();
  try {
    rows = parseProcessTable(await readTable());
  } catch {
    /* ps unavailable — callers degrade to 'unknown', never to a wrong match */
  }
  processTableCache = { rows, readAt: now };
  return rows;
}

/** Test hook: forget the cached ps snapshot. */
export function resetProcessParentCache(): void {
  processTableCache = null;
}

/** The maximum ppid hops walked. A chain longer than this is not our child tree. */
const MAX_ANCESTRY_HOPS = 24;

/**
 * The pure half of isDescendantOf: is `pid` the ancestor itself or below it
 * in `rows`? Bounded, so a table with a cycle can never spin.
 */
export function isDescendantIn(
  rows: ReadonlyMap<number, ProcessRow>,
  pid: number,
  ancestor: number
): boolean {
  if (pid === ancestor) return true;
  let cur = pid;
  for (let hop = 0; hop < MAX_ANCESTRY_HOPS; hop += 1) {
    const parent = rows.get(cur)?.ppid;
    if (parent === undefined || parent <= 1) return false;
    if (parent === ancestor) return true;
    cur = parent;
  }
  return false;
}

/**
 * Is `pid` the pane's process or any descendant of it? Agents that fork a
 * launcher (qwen forks twice) record an inner pid, so equality finds nothing.
 */
export async function isDescendantOf(
  pid: number,
  ancestor: number
): Promise<boolean> {
  if (pid === ancestor) return true;
  return isDescendantIn(await processTable(), pid, ancestor);
}
