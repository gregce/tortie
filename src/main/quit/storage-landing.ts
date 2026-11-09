/**
 * PHASE 357.1 ROUND A (build/p3571/SPEC.md "### Round A"). How the quit's hard
 * exit knows the window's remembered settings have reached the disk.
 *
 * WHY THIS EXISTS. Since Phase 357.1 a quit that held the session list open
 * ends with SIGKILL to itself at `will-quit` (src/main/index.ts), and the
 * remembered settings (zoom, the open tabs, the first-quit tip's flag: the
 * window's `localStorage`) reach the disk only if Chromium has committed them
 * by then. `session.defaultSession.flushStorageData()` only STARTS that commit:
 * a storage thread writes the profile's `Local Storage/leveldb` log a fraction
 * of a millisecond later, and a SIGKILL sent at once can land first. On a busy
 * Mac it did, 2 quits in 22 (the drop round's reverify: each a torn log record,
 * its header on disk and none of its payload), where today's orderly quit lost
 * nothing. Electron 43 reports no completion for that flush (its typings:
 * `flushStorageData(): void`; only the cookie store's `flushStore()` answers a
 * promise), so the quit reads the file itself.
 *
 * WHAT IT READS, AND WHY THAT IS A SIGNAL. LevelDB appends each commit to its
 * newest `NNNNNN.log` as records of a 7-byte header (masked CRC32C, length,
 * type) and a payload, in 32 KiB blocks, from one writer, in order. A record
 * split over a block boundary is a FIRST fragment, any MIDDLE ones and a LAST;
 * a record that fits is FULL; fewer than 7 bytes left in a block are padded with
 * zeros just before the next record's header. So the newest log's last block
 * tells whether a write is under way: it is WHOLE when every record in it
 * parses to its end with its checksum holding, the last one is FULL or LAST,
 * and the file does not end in a pad. The wait ends when, at once:
 *   - QUIET_MS have passed since the flush (round A's item W0 timed 720
 *     flushes on his Mac at load averages from 20 to 180: the write was on disk
 *     a median 0.17 ms after the flush, 5 ms at the 99th percentile and 27 ms
 *     at the worst, so a flush that has anything to write shows it well inside
 *     this);
 *   - the newest log's size has not moved for SETTLE_MS;
 *   - and its last block is whole.
 * A torn tail, a commit landing late or a second one following it keep the
 * wait going; the caller's bound ends it whatever the file says.
 *
 * WHAT IT REFUSES. It never writes, and nothing of Tortie's reads these files
 * but this wait. A log it cannot read (no folder, no log, a log rotated or
 * compacted away mid-read, a checksum it cannot match) is not a signal, so the
 * wait runs on to the caller's bound: it can cost time, never a write. It never
 * throws, it never rejects, and it never outlives the bound, which a timer
 * enforces beside the reads (they are asynchronous, so a slow file system can
 * delay a read but never the bound).
 *
 * Pure node: no electron import, so its tests drive it over real files.
 */

import { promises as fsp } from 'node:fs';
import { join } from 'node:path';

/** LevelDB's log block and record header sizes. */
const BLOCK = 32_768;
const HEADER = 7;
/** The record types: a whole record, and the first and last fragments of a split one (MIDDLE, 3, lies between). */
const FULL = 1;
const LAST = 4;

/** The least time after the flush before the wait may end (more than five times W0's worst landing, 27 ms). */
export const QUIET_MS = 150;
/** How long the newest log's size must stand still before the wait may end. */
export const SETTLE_MS = 25;
/** How often the log is read while waiting. */
export const POLL_MS = 5;

/** How the wait ended. `settled`: the log stood whole and still; `bound`: the caller's bound ended it. */
export type StorageLanding = 'settled' | 'bound';

export interface StorageWait {
  readonly landing: StorageLanding;
  /** Milliseconds from the call to the answer. */
  readonly waitedMs: number;
  /** True when the newest log changed while the wait watched it (a commit landed after the flush). */
  readonly moved: boolean;
}

/** The folder Chromium keeps a session's localStorage in, or null for a session with no disk. */
export function storageFolder(storagePath: string | null): string | null {
  return storagePath === null || storagePath === '' ? null : join(storagePath, 'Local Storage', 'leveldb');
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });

/** CRC-32C (Castagnoli), the checksum LevelDB writes, and its mask. */
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32c(type: number, data: Uint8Array): number {
  let c = 0xffffffff;
  c = CRC_TABLE[(c ^ type) & 0xff]! ^ (c >>> 8);
  for (let i = 0; i < data.length; i += 1) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const masked = (crc: number): number => (((crc >>> 15) | (crc << 17)) + 0xa282ead8) >>> 0;

/**
 * True when `bytes`, which start at `offset` (a block boundary) and end at the
 * file's end, hold only whole records with checksums that hold, the last one
 * complete, and no pad at the end. Exported for its tests.
 */
export function lastBlockWhole(bytes: Uint8Array, offset: number): boolean {
  if (offset % BLOCK !== 0) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0;
  let lastType = 0;
  while (pos < bytes.length) {
    const left = BLOCK - ((offset + pos) % BLOCK);
    if (left < HEADER) {
      // A pad is written just before the next record's header, so a file that
      // ends in one has a record on its way.
      if (pos + left >= bytes.length) return false;
      pos += left;
      continue;
    }
    if (pos + HEADER > bytes.length) return false;
    const want = view.getUint32(pos, true);
    const len = view.getUint16(pos + 4, true);
    const type = bytes[pos + 6]!;
    if (type < FULL || type > LAST || len > left - HEADER) return false;
    const end = pos + HEADER + len;
    if (end > bytes.length) return false;
    if (masked(crc32c(type, bytes.subarray(pos + HEADER, end))) !== want) return false;
    lastType = type;
    pos = end;
  }
  if (bytes.length === 0) return true;
  // A FIRST or MIDDLE fragment last means the rest of its record is still to come.
  return lastType === FULL || lastType === LAST;
}

interface LogReading {
  readonly name: string;
  readonly size: number;
}

/** The newest `NNNNNN.log` in `dir` and its size, or null when it cannot be read. */
async function newestLog(dir: string): Promise<LogReading | null> {
  try {
    let best: string | null = null;
    let bestNumber = -1;
    for (const name of await fsp.readdir(dir)) {
      const m = /^(\d+)\.log$/.exec(name);
      if (m === null) continue;
      const n = Number.parseInt(m[1]!, 10);
      if (n > bestNumber) {
        bestNumber = n;
        best = name;
      }
    }
    if (best === null) return null;
    const st = await fsp.stat(join(dir, best));
    return { name: best, size: st.size };
  } catch {
    return null;
  }
}

/** Whether the log's last block is whole, read now; false when it cannot be read. */
async function tailWhole(dir: string, log: LogReading): Promise<boolean> {
  if (log.size === 0) return true;
  const start = Math.floor((log.size - 1) / BLOCK) * BLOCK;
  let handle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  try {
    handle = await fsp.open(join(dir, log.name), 'r');
    const length = log.size - start;
    const bytes = new Uint8Array(length);
    const { bytesRead } = await handle.read(bytes, 0, length, start);
    return bytesRead === length && lastBlockWhole(bytes, start);
  } catch {
    return false;
  } finally {
    if (handle !== null) await handle.close().catch(() => undefined);
  }
}

/** The watch itself; the bound is also enforced beside it, by the caller below. */
async function watch(dir: string | null, boundMs: number, started: number): Promise<StorageWait> {
  const elapsed = (): number => performance.now() - started;
  let lastKey: string | null = null;
  let firstKey: string | null = null;
  let lastChange = 0;
  for (;;) {
    if (elapsed() >= boundMs) break;
    const log = dir === null ? null : await newestLog(dir);
    if (log !== null) {
      const key = `${log.name}:${String(log.size)}`;
      if (firstKey === null) firstKey = key;
      if (key !== lastKey) {
        lastKey = key;
        lastChange = elapsed();
      } else if (elapsed() >= QUIET_MS && elapsed() - lastChange >= SETTLE_MS && (await tailWhole(dir as string, log))) {
        return { landing: 'settled', waitedMs: elapsed(), moved: key !== firstKey };
      }
    }
    await sleep(Math.min(POLL_MS, boundMs - elapsed()));
  }
  return { landing: 'bound', waitedMs: elapsed(), moved: lastKey !== firstKey };
}

/**
 * Wait, at most `boundMs`, until Chromium's localStorage log under
 * `storagePath` stands whole and still, at least QUIET_MS after the call. Call
 * it right after `session.defaultSession.flushStorageData()`. Never throws and
 * never rejects; answers by the bound whatever the files do.
 */
export function storageWritten(storagePath: string | null, boundMs: number): Promise<StorageWait> {
  const started = performance.now();
  const bound = Number.isFinite(boundMs) && boundMs > 0 ? boundMs : 0;
  let dir: string | null = null;
  try {
    dir = storageFolder(storagePath);
  } catch {
    dir = null;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const atBound = new Promise<StorageWait>((resolve) => {
    timer = setTimeout(() => {
      resolve({ landing: 'bound', waitedMs: performance.now() - started, moved: false });
    }, bound);
  });
  const watched = watch(dir, bound, started).catch((): Promise<StorageWait> => atBound);
  return Promise.race([watched, atBound]).finally(() => {
    clearTimeout(timer);
  });
}
