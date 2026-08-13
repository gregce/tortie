/**
 * The verified backup ring (Phase 20 items 1 to 3).
 *
 * The headline tests are the two the phase is judged on.
 *
 *  - `an interrupted prune leaves the current generation and a verified
 *    predecessor`, which is research 33 entry 8's invariant. The interruption is
 *    modelled at the filesystem seam: the fake stops deleting part way through,
 *    which is what a process that was killed looks like from the disk's side.
 *  - `a hot writer never produces a copy that will not open`, which is why every
 *    copy is a `VACUUM INTO` and never a file copy. Research 34 §3.2 measured a
 *    three file copy under a live writer failing 90 times out of 150.
 *
 * Everything here runs against real SQLite files in a temporary directory.
 * Nothing mocks a database.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nodeDurableFs, type DurableFs } from '../../durable';
import {
  backupBodyPath,
  backupIndexPath,
  captureManifestBackup,
  describeBackupRing,
  listBackupBodies,
  pruneBackupRing,
  readBackupIndex,
  readDatabaseEvidence,
  resolveVerifiedBackup,
  restoreFromBackup,
  snapshotDatabase,
  type BackupFaultPoint
} from '../recovery';

let root: string;
let source: string;
let dir: string;
/**
 * The app's own connection, held open for the whole test.
 *
 * It is not scenery. The LAST connection to close checkpoints the write ahead
 * log and truncates it, so a fixture that opens and closes a connection has no
 * live log by the time anything reads it, and the interesting case disappears.
 * Holding one open is also what the real manifest looks like the whole time
 * Tortie is running, which is when the ring takes its copies.
 */
let live: Database.Database | null = null;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-ring-'));
  source = join(root, 'manifest.db');
  dir = join(root, 'backups');
  live = buildManifest(source, 40);
});

afterEach(() => {
  try {
    live?.close();
  } catch {
    /* a fixture that will not close must not fail the test that passed */
  }
  live = null;
  rmSync(root, { recursive: true, force: true });
});

/**
 * A manifest-shaped database with a live write ahead log, returned with its
 * write connection still open.
 */
function buildManifest(path: string, rows: number): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(
    `CREATE TABLE sessions (
       id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT, last_seen INTEGER
     );
     CREATE INDEX idx_sessions_name ON sessions(name);
     CREATE TABLE projects (path TEXT PRIMARY KEY, opened_at INTEGER);`
  );
  const insert = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)');
  const many = db.transaction(() => {
    for (let i = 0; i < rows; i += 1) {
      insert.run(`s-${String(i)}`, `session ${String(i)}`, 'running', 1000 + i);
    }
  });
  many();
  db.prepare('INSERT INTO projects VALUES (?, ?)').run('/tmp/one', 1);
  return db;
}

/** One `UPDATE`, which is the churn this manifest actually sees. */
function touchSource(): void {
  live?.prepare('UPDATE sessions SET last_seen = last_seen + 1 WHERE id = ?').run('s-0');
}

function fingerprint(path: string): string {
  const data = readFileSync(path);
  return `${String(data.length)}:${createHash('sha256').update(data).digest('hex').slice(0, 16)}`;
}

/** A filesystem that stops deleting after `after` unlinks, like a killed process. */
function stopsDeletingAfter(after: number): { fs: DurableFs; unlinks: string[] } {
  const real = nodeDurableFs();
  const unlinks: string[] = [];
  return {
    unlinks,
    fs: {
      ...real,
      unlink: async (path: string) => {
        if (unlinks.length >= after) throw new Error('the process died here');
        unlinks.push(path);
        await real.unlink(path);
      }
    }
  };
}

describe('snapshotDatabase, the engine moved out of migrate/userdata.ts', () => {
  it('copies a database that has a live write ahead log, and proves the rows', () => {
    const to = join(root, 'copy.db');
    const result = snapshotDatabase({ from: source, to });

    expect(result.method).toBe('vacuum-into');
    expect(result.ok).toBe(true);
    expect(result.drifted).toBe(false);
    expect(result.differences).toEqual([]);
    expect(result.attempts).toBe(1);
    expect(result.source['sessions']).toBe(40);
    expect(result.copy['sessions']).toBe(40);
    // The digest, not the count, is what says the two agree.
    expect(result.copyDigests['sessions']).toBe(result.sourceDigests['sessions']);
  });

  it('leaves the source database and its write ahead log byte identical', () => {
    // The log has to be non-empty or this test proves nothing. It is the file a
    // three file copy reads at a different instant from the database.
    expect(statSync(`${source}-wal`).size).toBeGreaterThan(0);
    const before = ['', '-wal'].map((s) => `${s}=${fingerprint(`${source}${s}`)}`);

    snapshotDatabase({ from: source, to: join(root, 'copy.db') });

    const after = ['', '-wal'].map((s) => `${s}=${fingerprint(`${source}${s}`)}`);
    expect(after).toEqual(before);
  });

  it('leaves the source unchanged in every way except a read mark', () => {
    // SQLite records a read mark for the read only connection inside the shared
    // memory index. That is bookkeeping and never data, it is the one trace the
    // migrate module's header already names, and the size does not move. Stated
    // as a test so nobody later claims the source is untouched full stop.
    const sizeBefore = statSync(`${source}-shm`).size;
    snapshotDatabase({ from: source, to: join(root, 'copy.db') });
    expect(statSync(`${source}-shm`).size).toBe(sizeBefore);
  });

  it('leaves no shared memory index beside the copy', () => {
    const to = join(root, 'copy.db');
    snapshotDatabase({ from: source, to });
    expect(existsSync(`${to}-shm`)).toBe(false);
    expect(existsSync(`${to}-wal`)).toBe(false);
  });

  it('sees an UPDATE that changes no row count', () => {
    const first = snapshotDatabase({ from: source, to: join(root, 'a.db') });
    touchSource();
    const second = snapshotDatabase({ from: source, to: join(root, 'b.db') });
    expect(second.copy['sessions']).toBe(first.copy['sessions']);
    expect(second.copyDigests['sessions']).not.toBe(first.copyDigests['sessions']);
  });

  it('writes over whatever was at the destination rather than refusing', () => {
    const to = join(root, 'copy.db');
    writeFileSync(to, Buffer.alloc(5000, 0x5a));
    const result = snapshotDatabase({ from: source, to });
    expect(result.ok).toBe(true);
    expect(readDatabaseEvidence(to).counts['sessions']).toBe(40);
  });

  it('removes a partial copy and throws when the source cannot be read', () => {
    const to = join(root, 'copy.db');
    expect(() => snapshotDatabase({ from: join(root, 'nope.db'), to })).toThrow();
    expect(existsSync(to)).toBe(false);
  });
});

describe('snapshotDatabase, under a writer that never stops', () => {
  it('never produces a copy that will not open', async () => {
    const worker = new Worker(
      `
      const { workerData, parentPort } = require('node:worker_threads');
      const Database = require('better-sqlite3');
      const db = new Database(workerData.dbPath, { timeout: 5000 });
      db.pragma('journal_mode = WAL');
      const up = db.prepare('UPDATE sessions SET last_seen = last_seen + 1');
      const ins = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)');
      let n = 0;
      let stop = false;
      parentPort.on('message', () => { stop = true; });
      const tick = () => {
        if (stop) { db.close(); parentPort.postMessage(n); return; }
        up.run();
        ins.run('w-' + n, 'worker ' + n, 'running', n);
        n += 1;
        setImmediate(tick);
      };
      tick();
      `,
      { eval: true, workerData: { dbPath: source } }
    );
    await new Promise<void>((r) => setTimeout(r, 150));

    const verdicts: string[] = [];
    for (let i = 0; i < 15; i += 1) {
      const to = join(root, `hot-${String(i)}.db`);
      const result = snapshotDatabase({ from: source, to });
      const evidence = readDatabaseEvidence(to);
      const db = new Database(to, { readonly: true, fileMustExist: true });
      const check = (db.pragma('integrity_check') as { integrity_check: string }[])[0];
      db.close();
      rmSync(`${to}-shm`, { force: true });
      verdicts.push(
        `${check?.integrity_check ?? 'no answer'}/${String(evidence.error === undefined)}/${String(result.bytes > 0)}`
      );
    }

    worker.postMessage('stop');
    await new Promise<void>((r) => worker.on('message', () => r()));
    await worker.terminate();

    // Every one of the fifteen. Not most of them.
    expect(new Set(verdicts)).toEqual(new Set(['ok/true/true']));
  });
});

describe('captureManifestBackup, the ring', () => {
  it('publishes generation 1, records it, and the body proves out', async () => {
    const result = await captureManifestBackup({ source, dir, reason: 'launch' });

    expect(result.capsule.generation).toBe(1);
    expect(result.capsule.parent).toBeNull();
    expect(result.capsule.integrity).toBe('ok');
    expect(result.capsule.sourceMatched).toBe(true);
    expect(result.capsule.rows['sessions']).toBe(40);
    expect(result.recorded).toEqual([1]);
    expect(existsSync(backupBodyPath(1, dir))).toBe(true);

    const resolved = resolveVerifiedBackup(dir);
    expect(resolved?.capsule.generation).toBe(1);
    expect(resolved?.rejected).toBe(0);
  });

  it('the published body is a database holding the rows the record claims', async () => {
    const { capsule } = await captureManifestBackup({ source, dir });
    const evidence = readDatabaseEvidence(backupBodyPath(1, dir));
    expect(evidence.error).toBeUndefined();
    expect(evidence.digests).toEqual(capsule.digests);
  });

  it('numbers each generation off the disk and keeps at most `keep` records', async () => {
    for (let i = 0; i < 5; i += 1) {
      touchSource();
      await captureManifestBackup({ source, dir, keep: 3 });
    }
    expect(readBackupIndex(dir).map((c) => c.generation)).toEqual([5, 4, 3]);
    expect(await listBackupBodies(dir)).toEqual([5, 4, 3]);
    expect(readBackupIndex(dir)[0]?.parent).toBe(4);
  });

  it('leaves the source untouched across a whole ring of captures', async () => {
    const before = ['', '-wal'].map((s) => fingerprint(`${source}${s}`));
    for (let i = 0; i < 4; i += 1) await captureManifestBackup({ source, dir });
    const after = ['', '-wal'].map((s) => fingerprint(`${source}${s}`));
    expect(after).toEqual(before);
  });

  it('leaves no staged copy behind', async () => {
    await captureManifestBackup({ source, dir });
    expect(readdirSync(dir).filter((n) => n.startsWith('.'))).toEqual([]);
  });

  it('drops a predecessor whose body no longer matches its record', async () => {
    await captureManifestBackup({ source, dir, keep: 3 });
    touchSource();
    await captureManifestBackup({ source, dir, keep: 3 });

    // Generation 2's bytes are damaged behind the record's back.
    const damaged = backupBodyPath(2, dir);
    const bytes = readFileSync(damaged);
    bytes[3000] = bytes[3000] === 0 ? 1 : 0;
    writeFileSync(damaged, bytes);

    touchSource();
    await captureManifestBackup({ source, dir, keep: 3 });

    // 3 is current, 1 is the last predecessor whose bytes prove out. 2 is not a
    // fallback, so it does not occupy a slot.
    expect(readBackupIndex(dir).map((c) => c.generation)).toEqual([3, 1]);
    expect(await listBackupBodies(dir)).toEqual([3, 1]);
  });

  it('falls back past a newest generation that no longer proves out', async () => {
    await captureManifestBackup({ source, dir });
    touchSource();
    await captureManifestBackup({ source, dir });
    writeFileSync(backupBodyPath(2, dir), Buffer.alloc(10, 0));

    const resolved = resolveVerifiedBackup(dir);
    expect(resolved?.capsule.generation).toBe(1);
    expect(resolved?.rejected).toBe(1);
  });

  it('never returns a body that no record names', async () => {
    await captureManifestBackup({ source, dir });
    // What a crash inside a capture leaves: a body, and nothing vouching for it.
    writeFileSync(backupBodyPath(9, dir), readFileSync(backupBodyPath(1, dir)));
    expect(resolveVerifiedBackup(dir)?.capsule.generation).toBe(1);
  });

  it('keeps an unrecorded body that is newer than everything recorded', async () => {
    await captureManifestBackup({ source, dir, keep: 2 });
    // A body newer than every record is either a write happening right now or
    // the debris of a crash inside one. A prune may not judge it either way.
    writeFileSync(backupBodyPath(9, dir), readFileSync(backupBodyPath(1, dir)));
    await pruneBackupRing({ dir, keep: 2 });
    expect(await listBackupBodies(dir)).toEqual([9, 1]);
  });

  it('removes an unrecorded body once a newer generation has been recorded', async () => {
    await captureManifestBackup({ source, dir, keep: 2 });
    writeFileSync(backupBodyPath(9, dir), readFileSync(backupBodyPath(1, dir)));
    touchSource();
    // Generation 10 is now recorded, so 9 is no longer a write in flight. It is
    // an orphan that nothing vouches for, and keeping it would let it crowd out
    // a generation a reader could use.
    await captureManifestBackup({ source, dir, keep: 2 });
    expect(await listBackupBodies(dir)).toEqual([10, 1]);
  });

  it('a crash after the body and before the record leaves the old newest in place', async () => {
    await captureManifestBackup({ source, dir });
    touchSource();
    const boom = (point: BackupFaultPoint): void => {
      if (point === 'backup.after-body') throw new Error('SIGKILL stand-in');
    };
    await expect(
      captureManifestBackup({ source, dir, onPoint: boom })
    ).rejects.toThrow('SIGKILL stand-in');

    // The record still names only generation 1, and that is what a reader gets.
    expect(readBackupIndex(dir).map((c) => c.generation)).toEqual([1]);
    expect(resolveVerifiedBackup(dir)?.capsule.generation).toBe(1);
  });

  it('serialises captures that are started at the same moment', async () => {
    const results = await Promise.all([
      captureManifestBackup({ source, dir, keep: 4 }),
      captureManifestBackup({ source, dir, keep: 4 }),
      captureManifestBackup({ source, dir, keep: 4 })
    ]);
    // Three distinct generations, three bodies, and a record naming all three.
    expect(results.map((r) => r.capsule.generation).sort()).toEqual([1, 2, 3]);
    expect(await listBackupBodies(dir)).toEqual([3, 2, 1]);
    expect(readBackupIndex(dir).map((c) => c.generation)).toEqual([3, 2, 1]);
    for (const capsule of readBackupIndex(dir)) {
      expect(existsSync(backupBodyPath(capsule.generation, dir))).toBe(true);
    }
  });

  it('reports a malformed record as no backup rather than throwing', async () => {
    await captureManifestBackup({ source, dir });
    writeFileSync(backupIndexPath(dir), '{ this is not json');
    expect(readBackupIndex(dir)).toEqual([]);
    expect(resolveVerifiedBackup(dir)).toBeNull();
    expect(describeBackupRing(dir)).toBe('no verified backup of the manifest');
  });
});

describe('pruneBackupRing, the invariant', () => {
  it('an interrupted prune leaves the current generation and a verified predecessor', async () => {
    // Every place the process can die inside one prune, not one of them. Six
    // generations shrinking to two means four deletions, so the interruption is
    // tried before the first, between each pair, and after the last.
    const outcomes: string[] = [];
    for (let stopAfter = 0; stopAfter <= 4; stopAfter += 1) {
      rmSync(dir, { recursive: true, force: true });
      for (let i = 0; i < 6; i += 1) {
        touchSource();
        await captureManifestBackup({ source, dir, keep: 6 });
      }
      expect(await listBackupBodies(dir)).toEqual([6, 5, 4, 3, 2, 1]);

      const killed = stopsDeletingAfter(stopAfter);
      await pruneBackupRing({ dir, keep: 2, fs: killed.fs });

      const left = await listBackupBodies(dir);
      const record = readBackupIndex(dir);
      // The invariant, in its own words. The current generation is 6 and its
      // last verified predecessor is 5, and no interruption may take both.
      const current = record[0];
      const predecessors = record.filter(
        (c) => c.generation !== current?.generation
      );
      const verifiedPredecessors = predecessors.filter((c) =>
        existsSync(backupBodyPath(c.generation, dir))
      );
      outcomes.push(
        [
          `stopAfter=${String(stopAfter)}`,
          `deleted=${String(killed.unlinks.length)}`,
          `current=${String(current?.generation)}`,
          `currentOnDisk=${String(left.includes(6))}`,
          `verifiedPredecessors=${String(verifiedPredecessors.length > 0)}`,
          `newestVerified=${String(resolveVerifiedBackup(dir)?.capsule.generation)}`
        ].join(' ')
      );
    }

    expect(outcomes).toEqual([
      'stopAfter=0 deleted=0 current=6 currentOnDisk=true verifiedPredecessors=true newestVerified=6',
      'stopAfter=1 deleted=1 current=6 currentOnDisk=true verifiedPredecessors=true newestVerified=6',
      'stopAfter=2 deleted=2 current=6 currentOnDisk=true verifiedPredecessors=true newestVerified=6',
      'stopAfter=3 deleted=3 current=6 currentOnDisk=true verifiedPredecessors=true newestVerified=6',
      'stopAfter=4 deleted=4 current=6 currentOnDisk=true verifiedPredecessors=true newestVerified=6'
    ]);
  });

  it('a prune redone after an interrupted one finishes the job', async () => {
    for (let i = 0; i < 6; i += 1) {
      touchSource();
      await captureManifestBackup({ source, dir, keep: 6 });
    }
    await pruneBackupRing({ dir, keep: 2, fs: stopsDeletingAfter(1).fs });
    const afterCrash = await listBackupBodies(dir);
    expect(afterCrash.length).toBeGreaterThan(2);

    await pruneBackupRing({ dir, keep: 2 });
    expect(await listBackupBodies(dir)).toEqual([6, 5]);
    expect(resolveVerifiedBackup(dir)?.capsule.generation).toBe(6);
  });

  it('stops at every deletion, so a harness can kill inside one', async () => {
    for (let i = 0; i < 4; i += 1) {
      touchSource();
      await captureManifestBackup({ source, dir, keep: 4 });
    }
    const points: BackupFaultPoint[] = [];
    const result = await pruneBackupRing({
      dir,
      keep: 2,
      onPoint: (p) => points.push(p)
    });
    expect(points).toEqual([
      'backup.prune.before-unlink',
      'backup.prune.before-unlink'
    ]);
    expect(result.kept).toEqual([4, 3]);
    expect(result.removed.length).toBe(2);
  });

  it('protects the newest generation even when its own body is damaged', async () => {
    for (let i = 0; i < 3; i += 1) {
      touchSource();
      await captureManifestBackup({ source, dir, keep: 3 });
    }
    writeFileSync(backupBodyPath(3, dir), Buffer.alloc(4, 0));

    const result = await pruneBackupRing({ dir, keep: 2 });
    // 3 is current and stays whatever state it is in, 2 is the last verified
    // predecessor. Both survive, which is the invariant in one line.
    expect(result.kept).toEqual([3, 2]);
    expect(existsSync(backupBodyPath(2, dir))).toBe(true);
    expect(resolveVerifiedBackup(dir)?.capsule.generation).toBe(2);
  });

  it('protects everything when the record has been lost', async () => {
    for (let i = 0; i < 3; i += 1) {
      touchSource();
      await captureManifestBackup({ source, dir, keep: 3 });
    }
    rmSync(backupIndexPath(dir), { force: true });

    const result = await pruneBackupRing({ dir, keep: 2 });
    expect(result.removed).toEqual([]);
    expect(await listBackupBodies(dir)).toEqual([3, 2, 1]);
  });

  it('sweeps a staged file an earlier crash left behind', async () => {
    await captureManifestBackup({ source, dir });
    const stray = join(dir, '.manifest.db.abandoned.part');
    writeFileSync(stray, 'half a copy');
    // A minute into the future, because the sweep deliberately spares a staged
    // file that may belong to a write happening right now.
    const result = await pruneBackupRing({
      dir,
      staleAfterMs: 60_000,
      now: () => Date.now() + 120_000
    });
    expect(result.sweptParts).toEqual([stray]);
    expect(existsSync(stray)).toBe(false);
  });
});

describe('restoreFromBackup', () => {
  it('writes a working database that holds the rows the record claims', async () => {
    await captureManifestBackup({ source, dir });
    const to = join(root, 'restored', 'manifest.db');

    const result = await restoreFromBackup({ to, dir });

    expect(result.ok).toBe(true);
    expect(result.generation).toBe(1);
    expect(result.integrity).toBe('ok');
    expect(result.differences).toEqual([]);
    const db = new Database(to, { readonly: true, fileMustExist: true });
    expect(db.prepare('SELECT COUNT(*) AS c FROM sessions').get()).toEqual({ c: 40 });
    db.close();
    rmSync(`${to}-shm`, { force: true });
  });

  it('refuses when the destination exists, and writes nothing', async () => {
    await captureManifestBackup({ source, dir });
    const to = join(root, 'occupied.db');
    writeFileSync(to, 'someone else lives here');

    const result = await restoreFromBackup({ to, dir });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('already exists');
    expect(readFileSync(to, 'utf8')).toBe('someone else lives here');
  });

  it('refuses when only a write ahead log is beside the destination', async () => {
    await captureManifestBackup({ source, dir });
    const to = join(root, 'lonely.db');
    writeFileSync(`${to}-wal`, 'a log with no database');

    const result = await restoreFromBackup({ to, dir });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('-wal already exists');
    expect(existsSync(to)).toBe(false);
  });

  it('restores a named generation, not only the newest', async () => {
    await captureManifestBackup({ source, dir });
    touchSource();
    await captureManifestBackup({ source, dir });

    const result = await restoreFromBackup({
      to: join(root, 'older.db'),
      dir,
      generation: 1
    });
    expect(result.ok).toBe(true);
    expect(result.generation).toBe(1);
    expect(result.rejected).toBe(1);
  });

  it('refuses a named generation whose bytes do not match the record', async () => {
    await captureManifestBackup({ source, dir });
    writeFileSync(backupBodyPath(1, dir), Buffer.alloc(6, 0));

    const result = await restoreFromBackup({ to: join(root, 'x.db'), dir, generation: 1 });
    expect(result.ok).toBe(false);
    expect(existsSync(join(root, 'x.db'))).toBe(false);
  });

  it('says there is nothing to restore rather than inventing something', async () => {
    const result = await restoreFromBackup({ to: join(root, 'y.db'), dir });
    expect(result.ok).toBe(false);
    expect(result.generation).toBeNull();
    expect(result.detail).toContain('nothing was restored');
  });
});

describe('describeBackupRing', () => {
  it('names the generation, its age and how many sessions it holds', async () => {
    await captureManifestBackup({ source, dir });
    const line = describeBackupRing(dir);
    expect(line).toContain('generation 1');
    expect(line).toContain('40 sessions');
    expect(line).toContain('verified');
  });

  it('says so when every recorded generation has stopped proving out', async () => {
    await captureManifestBackup({ source, dir });
    writeFileSync(backupBodyPath(1, dir), Buffer.alloc(3, 0));
    expect(describeBackupRing(dir)).toContain('no verified backup');
  });
});
