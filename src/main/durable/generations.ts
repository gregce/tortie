/**
 * Generations, pruning, and the read path that refuses to hand back bytes it
 * cannot prove.
 *
 * A destructive replace is a single point of failure however carefully it is
 * flushed. There is one moment where the old copy is gone and the new one is
 * not yet published, and a power cut inside that moment leaves neither. Two
 * generations remove the moment: the previous copy is still there under its
 * own name while the next one is being written.
 *
 * The names are `<stem>.<generation>`, with the generation a zero padded
 * decimal so a directory listing reads in order. Nothing here sorts by that
 * padding: the number is parsed and compared as a number, so a generation
 * past the padding width is still ordered correctly.
 *
 * Order of operations, which is the part that is easy to get backwards.
 *  - Write the new generation and flush the directory (write.ts).
 *  - Commit the completion record naming it (the caller, into the manifest).
 *  - Only then prune. Pruning before the record commits puts back the single
 *    point of failure that generations exist to remove.
 */

import { join } from 'node:path';
import type { DurableFs } from './fs';
import { nodeDurableFs } from './fs';
import { PART_SUFFIX, sha256Of } from './write';

/** Digits in a generation suffix. Cosmetic: ordering is numeric either way. */
export const GENERATION_DIGITS = 6;

/** How old a staged file must be before a prune pass will sweep it. */
export const STALE_PART_MS = 60_000;

/** One generation of one stem, on disk. */
export interface Generation {
  /** The whole number in the suffix. Higher is newer. */
  generation: number;
  /** Absolute path. */
  path: string;
}

/** The name of one generation. */
export function generationName(stem: string, generation: number): string {
  return `${stem}.${String(generation).padStart(GENERATION_DIGITS, '0')}`;
}

/** The path of one generation. */
export function generationPath(dir: string, stem: string, generation: number): string {
  return join(dir, generationName(stem, generation));
}

/** The generation a file name carries for this stem, or null when it is not one. */
export function parseGeneration(fileName: string, stem: string): number | null {
  const prefix = `${stem}.`;
  if (!fileName.startsWith(prefix)) return null;
  const suffix = fileName.slice(prefix.length);
  if (suffix.length === 0 || !/^\d+$/.test(suffix)) return null;
  return Number(suffix);
}

/** Every generation of one stem, newest first. A missing directory is empty. */
export async function listGenerations(
  dir: string,
  stem: string,
  fs: DurableFs = nodeDurableFs()
): Promise<Generation[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const found: Generation[] = [];
  for (const name of names) {
    const generation = parseGeneration(name, stem);
    if (generation === null) continue;
    found.push({ generation, path: join(dir, name) });
  }
  found.sort((a, b) => b.generation - a.generation);
  return found;
}

/**
 * The number to give the next generation of this stem.
 *
 * Taken from the directory rather than from a counter in memory, so it is
 * still right after a crash and still right when the manifest is behind.
 */
export async function nextGeneration(
  dir: string,
  stem: string,
  fs: DurableFs = nodeDurableFs()
): Promise<number> {
  const existing = await listGenerations(dir, stem, fs);
  const newest = existing[0];
  return newest ? newest.generation + 1 : 1;
}

export interface PruneResult {
  /** Generations left in place, newest first. */
  kept: Generation[];
  /** Generation files removed. */
  removed: string[];
  /** Staged files from an earlier crash that were swept. */
  sweptParts: string[];
}

/**
 * Keep the newest `keep` generations of one stem and remove the rest, then
 * sweep staged files older than `staleAfterMs`.
 *
 * PASS `recorded` WHENEVER THE CALLER HAS A COMPLETION RECORD, and every caller
 * that writes one does. Without it this function keeps the newest bodies on
 * DISK, and a body on disk that nothing records is unreadable by design because
 * nothing vouches for its bytes. A crash inside a write leaves exactly such a
 * body. Measured with one recorded generation, two crash orphans and one good
 * capture: the ring kept the three orphans and deleted the one generation a
 * reader could actually verify, taking the verified fallbacks from one to zero.
 *
 * With `recorded` given the rule is:
 *  - keep the newest `keep` RECORDED generations,
 *  - keep any body NEWER than the newest recorded one, because it may be a
 *    write that is happening right now,
 *  - remove everything else.
 *
 * The age gate on the staged-file sweep is deliberate for the same reason. A
 * staged file that is minutes old belongs to a crashed run. A staged file that
 * is seconds old may belong to a write happening right now, and deleting it
 * turns a healthy write into a failed one.
 */
export async function pruneGenerations(
  dir: string,
  stem: string,
  keep: number,
  options: {
    fs?: DurableFs;
    staleAfterMs?: number;
    now?: number;
    /** Generation numbers the completion record names. Any order. */
    recorded?: readonly number[];
  } = {}
): Promise<PruneResult> {
  const fs = options.fs ?? nodeDurableFs();
  const staleAfterMs = options.staleAfterMs ?? STALE_PART_MS;
  const now = options.now ?? Date.now();

  const all = await listGenerations(dir, stem, fs);
  const kept = options.recorded
    ? keptByRecord(all, options.recorded, Math.max(keep, 1))
    : all.slice(0, Math.max(keep, 1));
  const keptPaths = new Set(kept.map((g) => g.path));
  const removed: string[] = [];
  for (const doomed of all.filter((g) => !keptPaths.has(g.path))) {
    try {
      await fs.unlink(doomed.path);
      removed.push(doomed.path);
    } catch {
      // A generation that will not delete is not a failure of the write. The
      // next pass tries again.
    }
  }

  const sweptParts: string[] = [];
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    names = [];
  }
  for (const name of names) {
    if (!name.startsWith('.') || !name.endsWith(PART_SUFFIX)) continue;
    const path = join(dir, name);
    try {
      const st = await fs.stat(path);
      if (now - st.mtimeMs < staleAfterMs) continue;
      await fs.unlink(path);
      sweptParts.push(path);
    } catch {
      // Same reasoning as above.
    }
  }

  return { kept, removed, sweptParts };
}

/**
 * The bodies to keep when the caller has a completion record.
 *
 * Newest first, like `listGenerations`. See `pruneGenerations` for the rule and
 * for the measurement that put it there.
 */
function keptByRecord(
  all: readonly Generation[],
  recorded: readonly number[],
  keep: number
): Generation[] {
  const wanted = new Set([...recorded].sort((a, b) => b - a).slice(0, keep));
  const newestRecorded = recorded.length === 0 ? -Infinity : Math.max(...recorded);
  return all.filter(
    (g) => wanted.has(g.generation) || g.generation > newestRecorded
  );
}

/** What the completion record says about one generation. */
export interface DurableRecord {
  path: string;
  bytes: number;
  sha256: string;
}

export interface VerifiedRead {
  record: DurableRecord;
  data: Buffer;
}

/**
 * Steps 11 to 13. Read the newest generation that proves out, falling back
 * through the older ones.
 *
 * Pass the records newest first. Returns null when nothing verifies, and the
 * caller reports "no verified snapshot" rather than replaying bytes it cannot
 * vouch for. Replaying an unverified file is how a user gets shown a
 * scrollback that is half of one session and half of another.
 */
export async function readVerified(
  records: readonly DurableRecord[],
  fs: DurableFs = nodeDurableFs()
): Promise<VerifiedRead | null> {
  for (const record of records) {
    let data: Buffer;
    try {
      data = await fs.readFile(record.path);
    } catch {
      continue;
    }
    // Length first. It is free, and it rejects the truncation case without
    // hashing a file that cannot be right.
    if (data.length !== record.bytes) continue;
    if (sha256Of(data) !== record.sha256) continue;
    return { record, data };
  }
  return null;
}
