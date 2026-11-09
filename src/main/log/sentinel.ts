/**
 * The run sentinel (Phase 35, research 42 section 10).
 *
 * `<userData>/logs/run.json` is written after boot and marked at will-quit.
 * A sentinel that survives to the next boot unmarked means the previous run
 * did not exit cleanly, and its recorded pid, version and boot time become
 * the `prev` half of the boot.unclean_exit record. `dumpNames` is the
 * Crashpad inventory at that boot, so the next boot's readdir diff can say
 * which dumps are new. getLastCrashReport is useless with uploads off
 * (measured in the research 42 lab), so this file plus the readdir diff IS
 * the crash detection mechanism.
 *
 * A MARKED sentinel (Phase 362, build/p362/SPEC.md D4). The log's own
 * will-quit listener used to delete the file, and two quits still run Node's
 * environment teardown after will-quit: one with an update staged and one
 * that holds no session list. A crash in that teardown therefore left no
 * sentinel, and the next launch said nothing (measured at 357.1: the dump
 * sat in the inventory and no record was written). So the listener now
 * rewrites the file instead, with `quitAt`, the time of that will-quit, and
 * `dumpNames` replaced by the inventory of that moment. At the next boot a
 * marked sentinel means the run reached its quit: it reads as a clean quit
 * unless a dump is new since the mark, which is a crash after will-quit and
 * gets the unclean exit record and notice as any other crash does. A quit
 * that leaves no dump after its mark reads clean, because a claim of "your
 * app crashed" must come from evidence. The two hard exits still delete the
 * file right before their SIGKILL to self.
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
  /**
   * Crashpad dump file names seen at that boot, or, once the sentinel is
   * marked, at that run's will-quit.
   */
  dumpNames: string[];
  /**
   * Phase 362: the ISO 8601 time that run's will-quit marked the sentinel.
   * Absent on a sentinel no quit has marked: a run that never reached
   * will-quit, or one written by a build before Phase 362.
   */
  quitAt?: string;
}

/**
 * Read the sentinel, or null when there is none or it cannot be parsed.
 * An unreadable sentinel is treated as absent rather than as a crash,
 * because a claim of "your app crashed" must come from evidence. `quitAt`
 * is kept when it is a string and is otherwise left off, so an unmarked
 * sentinel reads exactly as it did before Phase 362.
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
    const sentinel: RunSentinel = {
      pid: record['pid'],
      version: record['version'],
      bootTs: record['bootTs'],
      dumpNames: names
    };
    const quitAt = record['quitAt'];
    if (typeof quitAt === 'string') sentinel.quitAt = quitAt;
    return sentinel;
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

/**
 * Mark the sentinel at will-quit (Phase 362, D4): rewrite it with `quitAt`
 * set to `nowIso` and `dumpNames` replaced by the inventory the caller read
 * at that moment, keeping the run's pid, version and boot time. Answers true
 * when it marked. A missing or unreadable sentinel answers false and nothing
 * is written: the mark says that a run which left a sentinel reached its
 * quit, and a run with none has nothing to mark. A write that fails answers
 * false too. Never throws, because it runs on the quit path.
 */
export function markRunSentinelAtQuit(
  dir: string,
  dumpNames: string[],
  nowIso: string
): boolean {
  const current = readRunSentinel(dir);
  if (current === null) return false;
  try {
    writeRunSentinel(dir, {
      ...current,
      dumpNames: [...dumpNames],
      quitAt: nowIso
    });
    return true;
  } catch {
    return false;
  }
}

/** Remove the sentinel. A missing file is a clean exit already recorded. */
export function clearRunSentinel(dir: string): void {
  try {
    unlinkSync(join(dir, RUN_SENTINEL_NAME));
  } catch {
    /* already gone, or never written — both are fine */
  }
}
