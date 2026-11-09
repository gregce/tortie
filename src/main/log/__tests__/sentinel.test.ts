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
  chmodSync,
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
  markRunSentinelAtQuit,
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

  it('reads an unmarked sentinel with no quitAt key at all, exactly as before Phase 362', () => {
    writeRunSentinel(dir, SENTINEL);
    const read = readRunSentinel(dir);
    // toStrictEqual, not toEqual: a `quitAt: undefined` key would pass toEqual.
    expect(read).toStrictEqual(SENTINEL);
    expect(read !== null && 'quitAt' in read).toBe(false);
  });
});

/**
 * Phase 362 (build/p362/SPEC.md D4). The log's will-quit listener marks the
 * sentinel instead of deleting it, so a crash in the Node teardown that two
 * quits still run is noticed at the next boot. These hold the pure half.
 */
describe('the will-quit mark (Phase 362)', () => {
  const QUIT_AT = '2026-11-08T21:30:00.123Z';

  it('keeps quitAt when it is a string', () => {
    writeFileSync(
      join(dir, RUN_SENTINEL_NAME),
      JSON.stringify({ ...SENTINEL, quitAt: QUIT_AT }),
      'utf8'
    );
    expect(readRunSentinel(dir)).toStrictEqual({ ...SENTINEL, quitAt: QUIT_AT });
  });

  it('leaves quitAt off when it is not a string, so a damaged mark reads unmarked', () => {
    for (const bad of [1793987027, null, true, { at: QUIT_AT }, [QUIT_AT]]) {
      writeFileSync(
        join(dir, RUN_SENTINEL_NAME),
        JSON.stringify({ ...SENTINEL, quitAt: bad }),
        'utf8'
      );
      expect(readRunSentinel(dir)).toStrictEqual(SENTINEL);
    }
  });

  it('marks an existing sentinel with the time and the inventory it is handed, keeping the run', () => {
    writeRunSentinel(dir, SENTINEL);
    expect(markRunSentinelAtQuit(dir, ['7f3a.dmp', 'renderer.dmp'], QUIT_AT)).toBe(true);
    expect(readRunSentinel(dir)).toStrictEqual({
      pid: SENTINEL.pid,
      version: SENTINEL.version,
      bootTs: SENTINEL.bootTs,
      dumpNames: ['7f3a.dmp', 'renderer.dmp'],
      quitAt: QUIT_AT
    });
  });

  it('REPLACES the inventory rather than adding to it, so a dump gone since boot is not kept', () => {
    writeRunSentinel(dir, { ...SENTINEL, dumpNames: ['swept.dmp', 'kept.dmp'] });
    markRunSentinelAtQuit(dir, ['kept.dmp'], QUIT_AT);
    expect(readRunSentinel(dir)?.dumpNames).toEqual(['kept.dmp']);
    markRunSentinelAtQuit(dir, [], QUIT_AT);
    expect(readRunSentinel(dir)?.dumpNames).toEqual([]);
  });

  it('writes nothing and answers false when there is no sentinel', () => {
    expect(markRunSentinelAtQuit(dir, ['x.dmp'], QUIT_AT)).toBe(false);
    expect(existsSync(join(dir, RUN_SENTINEL_NAME))).toBe(false);
    // Nor a directory: a run that armed nothing has nothing to mark.
    const nested = join(dir, 'logs');
    expect(markRunSentinelAtQuit(nested, ['x.dmp'], QUIT_AT)).toBe(false);
    expect(existsSync(nested)).toBe(false);
  });

  it('writes nothing and answers false when the sentinel cannot be read', () => {
    const path = join(dir, RUN_SENTINEL_NAME);
    for (const damaged of ['not json at all', JSON.stringify({ pid: 'x' }), '']) {
      writeFileSync(path, damaged, 'utf8');
      expect(markRunSentinelAtQuit(dir, ['x.dmp'], QUIT_AT)).toBe(false);
      expect(readFileSync(path, 'utf8')).toBe(damaged);
    }
  });

  it('marks again on a second will-quit, the later mark winning', () => {
    writeRunSentinel(dir, SENTINEL);
    markRunSentinelAtQuit(dir, ['a.dmp'], QUIT_AT);
    markRunSentinelAtQuit(dir, ['a.dmp', 'b.dmp'], '2026-11-08T21:30:01.000Z');
    expect(readRunSentinel(dir)).toStrictEqual({
      ...SENTINEL,
      dumpNames: ['a.dmp', 'b.dmp'],
      quitAt: '2026-11-08T21:30:01.000Z'
    });
  });

  it('answers false rather than throwing when the write fails', () => {
    writeRunSentinel(dir, SENTINEL);
    const path = join(dir, RUN_SENTINEL_NAME);
    chmodSync(path, 0o400);
    try {
      let answer: boolean | undefined;
      expect(() => {
        answer = markRunSentinelAtQuit(dir, ['x.dmp'], QUIT_AT);
      }).not.toThrow();
      expect(answer).toBe(false);
      expect(readRunSentinel(dir)).toStrictEqual(SENTINEL);
    } finally {
      chmodSync(path, 0o600);
    }
  });

  it('a cleared sentinel stays cleared: the hard exit clears after the mark', () => {
    writeRunSentinel(dir, SENTINEL);
    markRunSentinelAtQuit(dir, [], QUIT_AT);
    clearRunSentinel(dir);
    expect(readRunSentinel(dir)).toBeNull();
    expect(markRunSentinelAtQuit(dir, [], QUIT_AT)).toBe(false);
    expect(existsSync(join(dir, RUN_SENTINEL_NAME))).toBe(false);
  });

  it('is still a small file once marked', () => {
    writeRunSentinel(dir, SENTINEL);
    const names = Array.from({ length: 40 }, (_, i) => `${'f'.repeat(36)}-${String(i)}.dmp`);
    markRunSentinelAtQuit(dir, names, QUIT_AT);
    expect(readFileSync(join(dir, RUN_SENTINEL_NAME), 'utf8').length).toBeLessThan(8192);
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
