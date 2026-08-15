/**
 * Phase 35. The run sentinel lifecycle, plus the two directory sweeps it
 * boots alongside (research 42 §10 and §11).
 *
 * The sentinel is the ONLY way the app itself can know it crashed, because no
 * process can record the death of the main process. Research 42's lab proved
 * the pattern end to end across a real main-process crash: written at boot,
 * gone after a clean quit, still there after a crash. These tests hold that
 * behaviour to the three functions.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearRunSentinel,
  readRunSentinel,
  RUN_SENTINEL_NAME,
  writeRunSentinel
} from '../sentinel';
import { LOG_PRUNE_MAX_AGE_DAYS, pruneOldLogFiles } from '../prune';
import {
  CRASH_DUMPS_KEPT,
  CRASH_DUMP_MAX_AGE_DAYS,
  scanCrashDumps,
  sweepCrashDumps
} from '../crash';

let dir = '';
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-log-sentinel-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const SENTINEL = {
  pid: 66979,
  version: '0.19.1',
  bootTs: '2026-08-14T13:40:02.000Z',
  dumpNames: ['7f3a.dmp']
};

describe('the run sentinel lifecycle', () => {
  it('writes, reads back, and survives to the next read (the crash case)', () => {
    writeRunSentinel(dir, SENTINEL);
    expect(readRunSentinel(dir)).toEqual(SENTINEL);
    // Nothing cleared it, which is exactly what a crash leaves behind.
    expect(readRunSentinel(dir)).toEqual(SENTINEL);
  });

  it('creates the logs directory when it is not there yet', () => {
    const nested = join(dir, 'logs');
    writeRunSentinel(nested, SENTINEL);
    expect(existsSync(join(nested, RUN_SENTINEL_NAME))).toBe(true);
  });

  it('clears, and a cleared sentinel reads as null (the clean quit case)', () => {
    writeRunSentinel(dir, SENTINEL);
    clearRunSentinel(dir);
    expect(readRunSentinel(dir)).toBeNull();
  });

  it('clearing a sentinel that was never written is not an error', () => {
    expect(() => clearRunSentinel(dir)).not.toThrow();
    expect(() => clearRunSentinel(join(dir, 'nope'))).not.toThrow();
  });

  it('reads a missing sentinel as null rather than as a crash', () => {
    expect(readRunSentinel(dir)).toBeNull();
  });

  it('reads a damaged sentinel as null, because a crash claim needs evidence', () => {
    const path = join(dir, RUN_SENTINEL_NAME);
    writeFileSync(path, 'not json at all', 'utf8');
    expect(readRunSentinel(dir)).toBeNull();
    writeFileSync(path, JSON.stringify({ pid: 'not a number' }), 'utf8');
    expect(readRunSentinel(dir)).toBeNull();
    writeFileSync(path, JSON.stringify({ pid: 1, version: 2 }), 'utf8');
    expect(readRunSentinel(dir)).toBeNull();
  });

  it('treats a missing dumpNames as an empty inventory, not as a failure', () => {
    writeFileSync(
      join(dir, RUN_SENTINEL_NAME),
      JSON.stringify({ pid: 1, version: '0.20.2', bootTs: 't' }),
      'utf8'
    );
    expect(readRunSentinel(dir)?.dumpNames).toEqual([]);
  });

  it('is a small file, so it never competes with the log for the budget', () => {
    writeRunSentinel(dir, SENTINEL);
    const bytes = readFileSync(join(dir, RUN_SENTINEL_NAME), 'utf8').length;
    expect(bytes).toBeLessThan(8192);
  });
});

describe('the startup prune', () => {
  const ageFile = (name: string, days: number): void => {
    const path = join(dir, name);
    writeFileSync(path, 'x', 'utf8');
    const when = (Date.now() - days * DAY_MS) / 1000;
    utimesSync(path, when, when);
  };

  it('ages out at 30 days, which is what retires the legacy updates.log pair', () => {
    expect(LOG_PRUNE_MAX_AGE_DAYS).toBe(30);
    ageFile('updates.log', 45);
    ageFile('updates.log.1', 45);
    ageFile('app.log', 0);
    const removed = pruneOldLogFiles(dir);
    expect(removed.sort()).toEqual(['updates.log', 'updates.log.1']);
    expect(existsSync(join(dir, 'app.log'))).toBe(true);
  });

  it('leaves a file exactly at the boundary alone', () => {
    ageFile('app.log.1', 29);
    expect(pruneOldLogFiles(dir)).toEqual([]);
  });

  it('never walks into a subdirectory', () => {
    mkdirSync(join(dir, 'Crashpad'), { recursive: true });
    const when = (Date.now() - 90 * DAY_MS) / 1000;
    utimesSync(join(dir, 'Crashpad'), when, when);
    expect(pruneOldLogFiles(dir)).toEqual([]);
    expect(existsSync(join(dir, 'Crashpad'))).toBe(true);
  });

  it('returns nothing when the directory does not exist yet', () => {
    expect(pruneOldLogFiles(join(dir, 'never-created'))).toEqual([]);
  });
});

describe('the Crashpad sweep', () => {
  const putDump = (sub: string, name: string, days: number, bytes = 10): void => {
    mkdirSync(join(dir, sub), { recursive: true });
    const path = join(dir, sub, name);
    writeFileSync(path, 'd'.repeat(bytes), 'utf8');
    const when = (Date.now() - days * DAY_MS) / 1000;
    utimesSync(path, when, when);
  };

  it('caps at the newest 5 dumps, the 8 MB worst case of the budget', () => {
    expect(CRASH_DUMPS_KEPT).toBe(5);
    expect(CRASH_DUMP_MAX_AGE_DAYS).toBe(30);
    for (let i = 0; i < 8; i += 1) putDump('pending', `d${i}.dmp`, i);
    const removed = sweepCrashDumps(dir);
    expect(removed.sort()).toEqual(['d5.dmp', 'd6.dmp', 'd7.dmp']);
    expect(scanCrashDumps(dir)).toHaveLength(5);
  });

  it('deletes anything past 30 days even when the count is under the cap', () => {
    putDump('pending', 'fresh.dmp', 1);
    putDump('completed', 'ancient.dmp', 45);
    expect(sweepCrashDumps(dir)).toEqual(['ancient.dmp']);
    expect(scanCrashDumps(dir).map((d) => d.name)).toEqual(['fresh.dmp']);
  });

  it('reads pending, completed and new, because uploads-off placement is unverified', () => {
    putDump('pending', 'a.dmp', 0, 11);
    putDump('completed', 'b.dmp', 0, 22);
    putDump('new', 'c.dmp', 0, 33);
    const found = scanCrashDumps(dir);
    expect(found.map((d) => d.name).sort()).toEqual(['a.dmp', 'b.dmp', 'c.dmp']);
    expect(found.reduce((sum, d) => sum + d.bytes, 0)).toBe(66);
  });

  it('ignores files that are not dumps', () => {
    putDump('pending', 'settings.dat', 0);
    expect(scanCrashDumps(dir)).toEqual([]);
  });

  it('reads a missing Crashpad directory as empty rather than throwing', () => {
    expect(scanCrashDumps(join(dir, 'nothing-here'))).toEqual([]);
    expect(sweepCrashDumps(join(dir, 'nothing-here'))).toEqual([]);
  });
});
