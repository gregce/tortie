/**
 * When a generation is taken, and when it deliberately is not (Phase 20).
 *
 * The ring itself is proved elsewhere. What is proved here is the schedule: the
 * change test, the time floor, the in-flight flag, the failure reporting that
 * cannot switch itself off, and the pre-migration take that has to happen before
 * the schema moves.
 *
 * The ring is a stub in every test. That is on purpose. A schedule test that
 * also copies a database is a test that fails for two reasons and tells you
 * neither.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  ManifestRingSchedule,
  RING_MIN_GAP_MS,
  RING_POLL_MS,
  pendingMigrationNames,
  ringFromRecovery,
  takePreMigrationGeneration,
  type RingReason,
  type RingTakeResult
} from '../ring-schedule';
import { databaseFingerprint } from '../../db/digest';
import { backupBodyVerifies, readBackupIndex } from '../recovery';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-ring-schedule-'));
  dbPath = join(dir, 'manifest.db');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** A ring that always works, and a log of what it was asked to do. */
function goodRing(): { take: (r: RingReason) => Promise<RingTakeResult>; calls: RingReason[] } {
  const calls: RingReason[] = [];
  let generation = 0;
  return {
    calls,
    take: (reason) => {
      calls.push(reason);
      generation += 1;
      return Promise.resolve({
        ok: true,
        generation,
        bytes: 73_728,
        detail: 'copied and verified',
        ms: 1
      });
    }
  };
}

/** A clock the test moves by hand. */
function clock(start = 1_000_000): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('the change test', () => {
  it('skips a timed take when the manifest has not changed', async () => {
    const ring = goodRing();
    const c = clock();
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => 'same',
      now: c.now
    });

    expect(await schedule.maybeTake('launch')).not.toBeNull();
    c.advance(RING_MIN_GAP_MS + 1);
    expect(await schedule.maybeTake('interval')).toBeNull();
    c.advance(RING_MIN_GAP_MS + 1);
    expect(await schedule.maybeTake('interval')).toBeNull();

    expect(ring.calls).toEqual(['launch']);
  });

  it('takes one as soon as the manifest changes', async () => {
    const ring = goodRing();
    const c = clock();
    let fp = 'a';
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => fp,
      now: c.now
    });

    await schedule.maybeTake('launch');
    c.advance(RING_MIN_GAP_MS + 1);
    fp = 'b';
    expect(await schedule.maybeTake('interval')).not.toBeNull();
    expect(ring.calls).toEqual(['launch', 'interval']);
  });

  it('takes one when the manifest cannot be fingerprinted at all', async () => {
    // Null is the case a copy is most wanted in, not least.
    const ring = goodRing();
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => null,
      now: clock().now
    });
    expect(await schedule.maybeTake('launch')).not.toBeNull();
    expect(ring.calls).toEqual(['launch']);
  });

  it('is skipped entirely by a forced take', async () => {
    const ring = goodRing();
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => 'same',
      now: clock().now
    });
    await schedule.maybeTake('launch');
    await schedule.takeNow('pre-migration');
    await schedule.takeNow('manual');
    expect(ring.calls).toEqual(['launch', 'pre-migration', 'manual']);
  });
});

describe('the time floor', () => {
  it('holds an interval take back until the gap has passed', async () => {
    const ring = goodRing();
    const c = clock();
    let n = 0;
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => `fp-${String((n += 1))}`,
      now: c.now
    });

    await schedule.maybeTake('launch');
    c.advance(RING_MIN_GAP_MS - 1);
    expect(await schedule.maybeTake('interval')).toBeNull();
    c.advance(2);
    expect(await schedule.maybeTake('interval')).not.toBeNull();
    expect(ring.calls).toEqual(['launch', 'interval']);
  });

  it('does not hold suspend or quit back, because there is no next tick', async () => {
    const ring = goodRing();
    const c = clock();
    let n = 0;
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => `fp-${String((n += 1))}`,
      now: c.now
    });

    await schedule.maybeTake('launch');
    // No time passes at all between these three.
    expect(await schedule.onSuspend()).not.toBeNull();
    expect(await schedule.onQuit()).not.toBeNull();
    expect(ring.calls).toEqual(['launch', 'suspend', 'quit']);
  });
});

describe('the paths a generation is never taken on', () => {
  it('defers a timed take while a create or restore is in flight', async () => {
    const ring = goodRing();
    const c = clock();
    let busy = true;
    let n = 0;
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => `fp-${String((n += 1))}`,
      busy: () => busy,
      now: c.now
    });

    expect(await schedule.maybeTake('interval')).toBeNull();
    expect(schedule.snapshot().deferrals).toBe(1);
    expect(ring.calls).toEqual([]);

    busy = false;
    c.advance(RING_MIN_GAP_MS + 1);
    expect(await schedule.maybeTake('interval')).not.toBeNull();
    expect(ring.calls).toEqual(['interval']);
  });

  it('lets a forced take through even while busy, because a migration cannot wait', async () => {
    const ring = goodRing();
    const schedule = new ManifestRingSchedule({
      take: ring.take,
      fingerprint: () => 'x',
      busy: () => true,
      now: clock().now
    });
    expect((await schedule.takeNow('pre-migration')).ok).toBe(true);
    expect(ring.calls).toEqual(['pre-migration']);
  });
});

describe('failure', () => {
  it('reports the first failure, not every one, and never stops trying', async () => {
    const troubles: number[] = [];
    const c = clock();
    let n = 0;
    const schedule = new ManifestRingSchedule({
      take: () => Promise.resolve({ ok: false, detail: 'no space left on device', ms: 0 }),
      fingerprint: () => `fp-${String((n += 1))}`,
      onTrouble: (s) => troubles.push(s.consecutiveFailures),
      now: c.now
    });

    for (let i = 0; i < 4; i += 1) {
      await schedule.maybeTake('interval');
      c.advance(RING_MIN_GAP_MS + 1);
    }

    expect(schedule.snapshot().consecutiveFailures).toBe(4);
    expect(schedule.snapshot().lastFailure).toBe('no space left on device');
    // One notice for the run, not four.
    expect(troubles).toEqual([1]);
  });

  it('says so when protection comes back', async () => {
    const troubles: number[] = [];
    const c = clock();
    let n = 0;
    let broken = true;
    const schedule = new ManifestRingSchedule({
      take: () =>
        broken
          ? Promise.resolve({ ok: false, detail: 'no space left on device', ms: 0 })
          : Promise.resolve({ ok: true, generation: 9, detail: 'copied', ms: 1 }),
      fingerprint: () => `fp-${String((n += 1))}`,
      onTrouble: (s) => troubles.push(s.consecutiveFailures),
      now: c.now
    });

    await schedule.maybeTake('interval');
    c.advance(RING_MIN_GAP_MS + 1);
    broken = false;
    await schedule.maybeTake('interval');

    expect(troubles).toEqual([1, 0]);
    expect(schedule.snapshot().lastGeneration).toBe(9);
    expect(schedule.snapshot().lastFailure).toBeNull();
  });

  it('turns a throwing ring into a failed take rather than a crash', async () => {
    const schedule = new ManifestRingSchedule({
      take: () => Promise.reject(new Error('the disk went away')),
      fingerprint: () => 'x',
      now: clock().now
    });
    const out = await schedule.takeNow('manual');
    expect(out.ok).toBe(false);
    expect(out.detail).toBe('the disk went away');
    expect(schedule.snapshot().consecutiveFailures).toBe(1);
  });
});

describe('the in-flight flag', () => {
  it('refuses a second take while one is running', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => { release = r; });
    let calls = 0;
    const schedule = new ManifestRingSchedule({
      take: async () => {
        calls += 1;
        await gate;
        return { ok: true, generation: calls, detail: 'copied', ms: 1 };
      },
      fingerprint: () => 'x',
      now: clock().now
    });

    const first = schedule.takeNow('manual');
    const second = await schedule.takeNow('manual');
    expect(second.ok).toBe(false);
    expect(second.detail).toContain('already being taken');
    release?.();
    expect((await first).ok).toBe(true);
    expect(calls).toBe(1);
  });
});

describe('the timer', () => {
  it('starts, stops, and does not hold the process open', () => {
    const schedule = new ManifestRingSchedule({
      take: () => Promise.resolve({ ok: true, generation: 1, detail: 'copied', ms: 1 }),
      fingerprint: () => 'x'
    });
    expect(schedule.snapshot().running).toBe(false);
    schedule.start();
    schedule.start();
    expect(schedule.snapshot().running).toBe(true);
    schedule.stop();
    schedule.stop();
    expect(schedule.snapshot().running).toBe(false);
  });

  it('polls at a rate that costs less than a millisecond a minute', () => {
    // 0.334 ms per fingerprint, measured on the real manifest. The assertion is
    // on the dial rather than on the measurement, so a later change to the dial
    // has to come back through this reasoning.
    expect(RING_POLL_MS).toBe(60_000);
    expect(RING_MIN_GAP_MS).toBe(300_000);
  });
});

// ---------------------------------------------------------------------------
// The pre-migration take
// ---------------------------------------------------------------------------

const EXPECTED = ['001-initial', '002-exit-code', '003-death-forensics'];

/** sha256 and size of the database and of its write ahead log. */
function fingerprintFiles(): {
  db: string;
  wal: string;
  walBytes: number;
} {
  const of = (suffix: string): { hash: string; bytes: number } => {
    const path = `${dbPath}${suffix}`;
    if (!existsSync(path)) return { hash: 'absent', bytes: -1 };
    const bytes = readFileSync(path);
    return {
      hash: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length
    };
  };
  const db = of('');
  const wal = of('-wal');
  return {
    db: `${db.hash}:${String(db.bytes)}`,
    wal: `${wal.hash}:${String(wal.bytes)}`,
    walBytes: Math.max(wal.bytes, 0)
  };
}

/** A manifest with a bookkeeping table holding `names`. */
function seedManifest(names: readonly string[]): void {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
    CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  `);
  const insert = db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)');
  for (const n of names) insert.run(n, Date.now());
  db.prepare('INSERT INTO sessions (id, name) VALUES (?, ?)').run('s-1', 'one');
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
}

describe('the pre-migration generation', () => {
  it('takes one when the schema is about to change', async () => {
    seedManifest(['001-initial']);
    const ring = goodRing();
    const out = await takePreMigrationGeneration({
      dbPath,
      expected: EXPECTED,
      take: ring.take
    });
    expect(out.taken).toBe(true);
    expect(out.pending).toEqual(['002-exit-code', '003-death-forensics']);
    expect(ring.calls).toEqual(['pre-migration']);
  });

  it('takes none when the schema is already current', async () => {
    seedManifest(EXPECTED);
    const ring = goodRing();
    const out = await takePreMigrationGeneration({
      dbPath,
      expected: EXPECTED,
      take: ring.take
    });
    expect(out).toMatchObject({ taken: false, why: 'nothing-pending' });
    expect(ring.calls).toEqual([]);
  });

  it('takes none on a first launch, because there is nothing to copy', async () => {
    const ring = goodRing();
    const out = await takePreMigrationGeneration({
      dbPath,
      expected: EXPECTED,
      take: ring.take
    });
    expect(out).toMatchObject({ taken: false, why: 'no-manifest' });
    expect(ring.calls).toEqual([]);
  });

  it('leaves the database byte for byte as it found it', async () => {
    seedManifest(['001-initial']);
    // The probe opens READ ONLY. Research 34 §3.2: a read write open would
    // checkpoint and truncate the WAL of the user's live manifest, so the
    // claim is checked by bytes rather than by reading the option.
    const before = fingerprintFiles();
    await takePreMigrationGeneration({
      dbPath,
      expected: EXPECTED,
      take: goodRing().take
    });
    const after = fingerprintFiles();

    // The database itself is the claim, and it holds exactly.
    expect(after.db).toBe(before.db);

    // WHAT IS NOT TRUE, stated so nobody reads more into the line above.
    // Opening a WAL database read only creates SQLite's own scratch files when
    // they are absent. Research 34 §3.2 recorded the `-shm`; measured here, a
    // zero length `-wal` appears as well. Neither carries data. What must never
    // happen is a `-wal` LOSING frames, which is what a read write open does at
    // close, so the assertion is that the log is either untouched or empty.
    expect(after.wal === before.wal || after.walBytes === 0).toBe(true);
  });

  it('takes no frames out of a live write ahead log', async () => {
    // The case that actually matters. The operator's manifest carries a
    // 2,805,752 byte `-wal` while the app is running, and every committed
    // transaction that is not yet checkpointed lives in it. A probe that
    // checkpointed would be writing to the user's live database.
    seedManifest(['001-initial']);
    const writer = new Database(dbPath);
    try {
      writer.pragma('journal_mode = WAL');
      const insert = writer.prepare('INSERT INTO sessions (id, name) VALUES (?, ?)');
      for (let i = 0; i < 200; i += 1) insert.run(`w-${String(i)}`, `n-${String(i)}`);
      const before = fingerprintFiles();
      expect(before.walBytes).toBeGreaterThan(0);

      await takePreMigrationGeneration({
        dbPath,
        expected: EXPECTED,
        take: goodRing().take
      });

      const after = fingerprintFiles();
      expect(after.db).toBe(before.db);
      expect(after.wal).toBe(before.wal);
      // And the rows the log holds are still readable through the writer.
      expect(
        writer.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM sessions').get()?.c
      ).toBe(201);
    } finally {
      writer.close();
    }
  });

  it('reports a manifest it cannot read, and copies nothing', async () => {
    // A directory where a database should be: readable path, unopenable file.
    const ring = goodRing();
    const out = await takePreMigrationGeneration({
      dbPath: dir,
      expected: EXPECTED,
      take: ring.take
    });
    expect(out).toMatchObject({ taken: false, why: 'unreadable' });
    expect(ring.calls).toEqual([]);
  });

  it('lets the migration run anyway when the copy fails', async () => {
    seedManifest(['001-initial']);
    const out = await takePreMigrationGeneration({
      dbPath,
      expected: EXPECTED,
      take: () => Promise.resolve({ ok: false, detail: 'no space left on device', ms: 0 })
    });
    // Refusing to launch would be the worse answer, so the outcome says the
    // copy failed and nothing throws.
    expect(out).toMatchObject({ taken: false, why: 'failed' });
  });

  it('treats a database with no bookkeeping table as fully pending', () => {
    const db = new Database(dbPath);
    db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY)');
    db.close();
    const ro = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      expect(pendingMigrationNames(ro, EXPECTED)).toEqual(EXPECTED);
    } finally {
      ro.close();
    }
  });
});

describe('the schedule driving the real ring', () => {
  it('takes a generation the ring can verify, and skips the next one', async () => {
    seedManifest(EXPECTED);
    const ringDir = join(dir, 'backups');
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const schedule = new ManifestRingSchedule({
        take: ringFromRecovery({ source: dbPath, dir: ringDir }),
        fingerprint: () => databaseFingerprint(db),
        now: clock().now
      });

      const first = await schedule.maybeTake('launch');
      expect(first?.ok).toBe(true);
      expect(first?.generation).toBe(1);

      // The record names it and the body on disk proves out against the record.
      const capsules = readBackupIndex(ringDir);
      expect(capsules).toHaveLength(1);
      const capsule = capsules[0];
      expect(capsule?.reason).toBe('launch');
      expect(capsule?.integrity).toBe('ok');
      expect(capsule?.sourceMatched).toBe(true);
      expect(capsule && backupBodyVerifies(capsule, ringDir)).toBe(true);

      // Nothing changed, so the next one is not spent.
      expect(await schedule.maybeTake('quit')).toBeNull();
      expect(readBackupIndex(ringDir)).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  it('takes a pre-migration generation, and none when the schema is current', async () => {
    seedManifest(['001-initial']);
    const ringDir = join(dir, 'backups');
    const take = ringFromRecovery({ source: dbPath, dir: ringDir });

    const first = await takePreMigrationGeneration({ dbPath, expected: EXPECTED, take });
    expect(first.taken).toBe(true);
    expect(readBackupIndex(ringDir)[0]?.reason).toBe('pre-migration');

    // Pretend the migration ran.
    const w = new Database(dbPath);
    const insert = w.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)');
    insert.run('002-exit-code', Date.now());
    insert.run('003-death-forensics', Date.now());
    w.close();

    const second = await takePreMigrationGeneration({ dbPath, expected: EXPECTED, take });
    expect(second).toMatchObject({ taken: false, why: 'nothing-pending' });
    expect(readBackupIndex(ringDir)).toHaveLength(1);
  });
});

describe('the fingerprint', () => {
  it('moves on an UPDATE, which a row count cannot see', () => {
    seedManifest(EXPECTED);
    const db = new Database(dbPath);
    try {
      const before = databaseFingerprint(db);
      db.prepare('UPDATE sessions SET name = ? WHERE id = ?').run('two', 's-1');
      const after = databaseFingerprint(db);
      expect(after).not.toBe(before);
      // And it is stable when nothing changes.
      expect(databaseFingerprint(db)).toBe(after);
    } finally {
      db.close();
    }
  });
});
