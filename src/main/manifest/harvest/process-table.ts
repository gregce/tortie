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
  const rows = new Map<number, ProcessRow>();
  try {
    const { stdout } = await execFileAsync('ps', ['-Axo', 'pid=,ppid=,comm='], {
      timeout: 5_000,
      maxBuffer: 8 * 1024 * 1024
    });
    for (const line of stdout.split('\n')) {
      // comm can hold spaces ("/Applications/Google Chrome.app/…"), so only
      // the first two fields are numeric and the rest is the command.
      const m = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
      if (m === null) continue;
      const pid = Number(m[1]);
      rows.set(pid, { pid, ppid: Number(m[2]), comm: m[3] ?? '' });
    }
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

/**
 * Is `pid` the pane's process or any descendant of it? Agents that fork a
 * launcher (qwen forks twice) record an inner pid, so equality finds nothing.
 */
export async function isDescendantOf(
  pid: number,
  ancestor: number
): Promise<boolean> {
  if (pid === ancestor) return true;
  const rows = await processTable();
  let cur = pid;
  // Bounded: a pid whose chain is longer than this is not our child tree.
  for (let hop = 0; hop < 24; hop += 1) {
    const parent = rows.get(cur)?.ppid;
    if (parent === undefined || parent <= 1) return false;
    if (parent === ancestor) return true;
    cur = parent;
  }
  return false;
}
