/**
 * The startup prune (Phase 35, research 42 section 11).
 *
 * At every boot, any regular file under `<userData>/logs` older than 30
 * days is deleted. This is Signal's age rule, and it is also what ages out
 * the legacy Phase 31 updates.log pair: those files stopped being written
 * when their scope moved into app.log, so 30 days later they go. An active
 * profile's app.log is written constantly, so its mtime keeps it alive; an
 * abandoned profile decays to the sentinel and the current file.
 *
 * Pure over a directory. No electron import.
 */

import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export const LOG_PRUNE_MAX_AGE_DAYS = 30;

/**
 * Delete files in `dir` (not subdirectories) whose mtime is older than
 * `maxAgeDays`. Returns the names removed. Never throws: a prune failure
 * costs disk, not correctness.
 */
export function pruneOldLogFiles(
  dir: string,
  maxAgeDays: number = LOG_PRUNE_MAX_AGE_DAYS,
  now: number = Date.now()
): string[] {
  const removed: string[] = [];
  const cutoff = now - maxAgeDays * 24 * 60 * 60 * 1000;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return removed; // no directory yet — nothing to prune
  }
  for (const name of names) {
    const path = join(dir, name);
    try {
      const stat = statSync(path);
      if (!stat.isFile()) continue;
      if (stat.mtimeMs >= cutoff) continue;
      unlinkSync(path);
      removed.push(name);
    } catch {
      /* a file that vanished or refuses to stat is not this prune's problem */
    }
  }
  return removed;
}
