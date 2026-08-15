/**
 * Local crash capture (Phase 35, research 42 sections 6 and 10).
 *
 * crashReporter.start({ uploadToServer: false }) runs before app ready and
 * costs 25 to 33 ms (measured). Dumps land under `<userData>/Crashpad` and
 * they STAY there: research 42's lab read a live token value out of a
 * minidump's environment block, so research 37's refusal of transmission is
 * confirmed by bytes. No code path here or anywhere may upload a dump.
 *
 * With uploads off, getLastCrashReport returns a stub (measured), so the
 * crash detection mechanism is a readdir of pending/ and completed/ diffed
 * against the run sentinel's recorded names. The sweep caps the directory
 * at the newest 5 dumps and 30 days, because Crashpad's own prune policy is
 * unverified against Electron 43 and Tortie owns its footprint budget.
 *
 * `startCrashCapture` is the one electron import in this file; the scan and
 * the sweep are pure over a directory for the unit tests.
 */

import { crashReporter } from 'electron';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/** How many dumps the sweep keeps. Worst case 5 x 1.6 MB = 8 MB. */
export const CRASH_DUMPS_KEPT = 5;
/** Dumps older than this go regardless of the count. */
export const CRASH_DUMP_MAX_AGE_DAYS = 30;

/**
 * Start local crash capture. Must run before app ready. uploadToServer is
 * false and nothing may ever flip it: the fragment below is pinned into the
 * shipped bundle by build/assert-bundle-refusals.mjs.
 */
export function startCrashCapture(): void {
  try {
    crashReporter.start({ uploadToServer: false });
  } catch (err) {
    // A run without crash capture is degraded, not broken.
    console.warn(
      `[gmux-log] crash capture did not start: ${(err as Error).message}`
    );
  }
}

export interface CrashDumpInfo {
  /** File name, e.g. "7f3a....dmp". */
  name: string;
  /** Bytes on disk. */
  bytes: number;
  /** mtime, epoch milliseconds. */
  mtimeMs: number;
  /** Absolute path, for the sweep. */
  path: string;
}

/** The two Crashpad directories dumps can sit in with uploads off. */
const DUMP_DIRS = ['pending', 'completed', 'new'] as const;

/**
 * Inventory every .dmp under the Crashpad directory's pending/, completed/
 * and new/ subdirectories. Missing directories read as empty.
 */
export function scanCrashDumps(crashpadDir: string): CrashDumpInfo[] {
  const dumps: CrashDumpInfo[] = [];
  for (const sub of DUMP_DIRS) {
    const dir = join(crashpadDir, sub);
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.dmp')) continue;
      const path = join(dir, name);
      try {
        const stat = statSync(path);
        if (!stat.isFile()) continue;
        dumps.push({ name, bytes: stat.size, mtimeMs: stat.mtimeMs, path });
      } catch {
        /* a dump that vanished mid-scan is simply not in the inventory */
      }
    }
  }
  return dumps;
}

/**
 * Cap the dump set: keep the newest `keep`, and of those only the ones
 * younger than `maxAgeDays`. Everything else is deleted. Returns the names
 * removed. Never throws.
 */
export function sweepCrashDumps(
  crashpadDir: string,
  keep: number = CRASH_DUMPS_KEPT,
  maxAgeDays: number = CRASH_DUMP_MAX_AGE_DAYS,
  now: number = Date.now()
): string[] {
  const removed: string[] = [];
  const cutoff = now - maxAgeDays * 24 * 60 * 60 * 1000;
  const dumps = scanCrashDumps(crashpadDir).sort(
    (a, b) => b.mtimeMs - a.mtimeMs
  );
  dumps.forEach((dump, index) => {
    if (index < keep && dump.mtimeMs >= cutoff) return;
    try {
      unlinkSync(dump.path);
      removed.push(dump.name);
    } catch {
      /* an undeletable dump is left for the next boot's sweep */
    }
  });
  return removed;
}
