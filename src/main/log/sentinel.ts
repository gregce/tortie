/**
 * The run sentinel (Phase 35, research 42 section 10).
 *
 * `<userData>/logs/run.json` is written after boot and deleted at will-quit.
 * A sentinel that survives to the next boot means the previous run did not
 * exit cleanly, and its recorded pid, version and boot time become the
 * `prev` half of the boot.unclean_exit record. `dumpNames` is the Crashpad
 * inventory at that boot, so the next boot's readdir diff can say which
 * dumps are new. getLastCrashReport is useless with uploads off (measured
 * in the research 42 lab), so this file plus the readdir diff IS the crash
 * detection mechanism.
 *
 * Pure functions over a directory. No electron import; the wrapper module
 * binds the logs directory.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';

export const RUN_SENTINEL_NAME = 'run.json';

export interface RunSentinel {
  /** The main process pid of the run that wrote this. */
  pid: number;
  /** app.getVersion() of that run. */
  version: string;
  /** ISO 8601 timestamp of that run's boot. */
  bootTs: string;
  /** Crashpad dump file names seen at that boot. */
  dumpNames: string[];
}

/**
 * Read the sentinel, or null when there is none or it cannot be parsed.
 * An unreadable sentinel is treated as absent rather than as a crash,
 * because a claim of "your app crashed" must come from evidence.
 */
export function readRunSentinel(dir: string): RunSentinel | null {
  const path = join(dir, RUN_SENTINEL_NAME);
  try {
    if (!existsSync(path)) return null;
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed === null || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record['pid'] !== 'number') return null;
    if (typeof record['version'] !== 'string') return null;
    if (typeof record['bootTs'] !== 'string') return null;
    const names = Array.isArray(record['dumpNames'])
      ? record['dumpNames'].filter((n): n is string => typeof n === 'string')
      : [];
    return {
      pid: record['pid'],
      version: record['version'],
      bootTs: record['bootTs'],
      dumpNames: names
    };
  } catch {
    return null;
  }
}

/** Write a fresh sentinel, creating the directory when needed. */
export function writeRunSentinel(dir: string, sentinel: RunSentinel): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, RUN_SENTINEL_NAME),
    `${JSON.stringify(sentinel)}\n`,
    'utf8'
  );
}

/** Remove the sentinel. A missing file is a clean exit already recorded. */
export function clearRunSentinel(dir: string): void {
  try {
    unlinkSync(join(dir, RUN_SENTINEL_NAME));
  } catch {
    /* already gone, or never written — both are fine */
  }
}
