/**
 * The shared opener's durability contract, exercised against real files and a
 * real second writer (a worker thread holding a genuine SQLite write lock —
 * not a mock, not a stub).
 *
 * What this pins down (research 25 §3 B2): a second writer to the MANIFEST is
 * a wait, never an error. The manifest row is written BEFORE the session is
 * spawned (§2.4 Step 0); if that insert threw SQLITE_BUSY because a harvest,
 * a second window, or a conformance run held the lock for a moment, the
 * session would exist in tmux with no manifest row — i.e. it would not come
 * back after a quit. The negative control below shows exactly that failure on
 * a connection opened WITHOUT the wait, so the positive case is not vacuous.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManifestStore, type ManifestSessionRecord } from '../../manifest/store';
import {
  addColumnIfMissing,
  immediateTransaction,
  openGmuxDatabase,
  runMigrations
} from '../sqlite';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-db-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A second connection, on its own thread, that takes the write lock, tells us
 * it has it, holds it for `holdMs`, then commits. `Atomics.wait` is used for
 * the hold because it blocks the worker thread the way a real synchronous
 * better-sqlite3 write does.
 */
function lockHolder(
  dbPath: string,
  holdMs: number
): { locked: Promise<void>; done: Promise<void> } {
  const worker = new Worker(
    `
    const { workerData, parentPort } = require('node:worker_threads');
    const Database = require('better-sqlite3');
    const db = new Database(workerData.dbPath);
    db.pragma('journal_mode = WAL');
    db.exec('BEGIN IMMEDIATE');
    parentPort.postMessage('locked');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, workerData.holdMs);
    db.exec('COMMIT');
    db.close();
    `,
    { eval: true, workerData: { dbPath, holdMs } }
  );
  const locked = new Promise<void>((resolve, reject) => {
    worker.once('message', () => resolve());
    worker.once('error', reject);
  });
  const done = new Promise<void>((resolve, reject) => {
    worker.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))
    );
    worker.once('error', reject);
  });
  return { locked, done };
}

/**
 * A second connection, on its own thread, that commits ONE write exactly when
 * the main thread says so — the interleaving a read-then-write transaction
 * cannot survive when it began DEFERRED.
 *
 * The handshake is `Atomics`, not messages, because the window we need to hit
 * is *inside* a synchronous better-sqlite3 transaction on the main thread: it
 * never yields to the event loop, so a `postMessage` reply could not be
 * observed there. `Atomics.wait` blocks the main thread while the worker's own
 * thread runs, which is exactly the real-world shape (another gmux window, a
 * harvest, a conformance run) and makes the race deterministic instead of
 * timing-dependent.
 *
 * Slot 0: main -> worker, "commit your write now".
 * Slot 1: worker -> main, 1 = committed, 2 = it could not (we hold the lock).
 */
function midTransactionWriter(dbPath: string): {
  ready: Promise<void>;
  commitNow: () => 'committed' | 'blocked';
  done: Promise<void>;
} {
  const signals = new Int32Array(new SharedArrayBuffer(8));
  const worker = new Worker(
    `
    const { workerData, parentPort } = require('node:worker_threads');
    const Database = require('better-sqlite3');
    const signals = workerData.signals;
    // A short timeout so the IMMEDIATE case reports "blocked" rather than
    // deadlocking against the write lock the main thread is holding.
    const db = new Database(workerData.dbPath, { timeout: 250 });
    db.pragma('journal_mode = WAL');
    parentPort.postMessage('ready');
    Atomics.wait(signals, 0, 0);
    let outcome = 1;
    try {
      db.prepare("UPDATE sessions SET name = 'touched-by-other' WHERE id = ?")
        .run(workerData.otherId);
    } catch (err) {
      outcome = 2;
    }
    db.close();
    Atomics.store(signals, 1, outcome);
    Atomics.notify(signals, 1);
    `,
    {
      eval: true,
      workerData: { dbPath, signals, otherId: 'other' }
    }
  );
  const ready = new Promise<void>((resolve, reject) => {
    worker.once('message', () => resolve());
    worker.once('error', reject);
  });
  const done = new Promise<void>((resolve, reject) => {
    worker.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))
    );
    worker.once('error', reject);
  });
  const commitNow = (): 'committed' | 'blocked' => {
    Atomics.store(signals, 0, 1);
    Atomics.notify(signals, 0);
    Atomics.wait(signals, 1, 0);
    return Atomics.load(signals, 1) === 1 ? 'committed' : 'blocked';
  };
  return { ready, commitNow, done };
}

function record(id: string): ManifestSessionRecord {
  const now = Date.now();
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/tmp/proj',
    cwd: '/tmp/proj',
    agent: 'claude',
    status: 'running',
    createdAt: now,
    argv: ['claude'],
    lastSeen: now
  };
}

describe('openGmuxDatabase', () => {
  it('applies gmux pragmas: WAL, synchronous NORMAL, busy_timeout 5000', () => {
    const db = openGmuxDatabase(join(dir, 'nested', 'x.db'));
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(db.pragma('synchronous', { simple: true })).toBe(1);
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000);
    db.close();
  });

  it('creates missing parent directories', () => {
    const db = openGmuxDatabase(join(dir, 'a', 'b', 'c.db'));
    db.exec('CREATE TABLE t(x)');
    db.close();
  });
});

describe('runMigrations', () => {
  it('applies each migration once and records it', () => {
    const path = join(dir, 'm.db');
    let runs = 0;
    const migrations = [
      { name: '001', up: (db: Database.Database) => { runs++; db.exec('CREATE TABLE a(x)'); } }
    ];
    const first = openGmuxDatabase(path);
    runMigrations(first, migrations);
    runMigrations(first, migrations);
    first.close();
    const second = openGmuxDatabase(path);
    runMigrations(second, migrations);
    expect(runs).toBe(1);
    expect(
      second.prepare<[], { name: string }>('SELECT name FROM migrations').all()
    ).toEqual([{ name: '001' }]);
    second.close();
  });

  it('does not record a migration whose up() throws', () => {
    const path = join(dir, 'bad.db');
    const db = openGmuxDatabase(path);
    expect(() =>
      runMigrations(db, [
        {
          name: '001-bad',
          up: (d: Database.Database) => {
            d.exec('CREATE TABLE ok(x)');
            throw new Error('boom');
          }
        }
      ])
    ).toThrow('boom');
    expect(
      db.prepare<[], { name: string }>('SELECT name FROM migrations').all()
    ).toEqual([]);
    db.close();
  });
});

describe('manifest writes under a concurrent writer', () => {
  it('waits for the other writer instead of throwing SQLITE_BUSY', async () => {
    const path = join(dir, 'manifest.db');
    const store = new ManifestStore(path);
    const holdMs = 300;
    const { locked, done } = lockHolder(path, holdMs);
    await locked;

    // Negative control: the same write, on a connection with no wait, is the
    // failure this pragma exists to prevent.
    const impatient = new Database(path, { timeout: 0 });
    let busyCode: string | undefined;
    try {
      impatient
        .prepare<[string]>('DELETE FROM sessions WHERE id = ?')
        .run('nobody');
    } catch (err) {
      busyCode = (err as { code?: string }).code;
    }
    impatient.close();
    expect(busyCode).toBe('SQLITE_BUSY');

    // The manifest's own write, with the lock still held, blocks and succeeds.
    const started = Date.now();
    expect(() => store.insertSession(record('s1'))).not.toThrow();
    const waited = Date.now() - started;

    await done;
    expect(waited).toBeGreaterThan(50);
    expect(store.getSession('s1')?.name).toBe('s1');
    store.close();
  });
});

/**
 * The second, distinct failure mode busy_timeout does NOT cover: a transaction
 * that READS and then WRITES. Phase 16.1 — observed as
 * `[gmux] refresh failed: database is locked` out of reconcile() during a
 * smoke:t3 run, and reproduced here deterministically.
 */
describe('read-then-write transactions under a writer that commits mid-flight', () => {
  it('DEFERRED (the bug): the write upgrade fails SQLITE_BUSY_SNAPSHOT despite busy_timeout', async () => {
    const path = join(dir, 'manifest.db');
    const store = new ManifestStore(path);
    store.insertSession(record('s1'));
    store.insertSession(record('other'));
    store.close();

    const db = openGmuxDatabase(path);
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000);
    const writer = midTransactionWriter(path);
    await writer.ready;

    let failure: { code?: string; message: string } | undefined;
    try {
      db.transaction(() => {
        db.prepare('SELECT * FROM sessions').all(); // takes the read snapshot
        expect(writer.commitNow()).toBe('committed'); // snapshot now stale
        db.prepare<[string, string]>(
          'UPDATE sessions SET name = ? WHERE id = ?'
        ).run('mine', 's1');
      })();
    } catch (err) {
      failure = err as { code?: string; message: string };
    }
    await writer.done;

    expect(failure?.code).toBe('SQLITE_BUSY_SNAPSHOT');
    // The message is the innocuous-looking one gmux logged in production.
    expect(failure?.message).toContain('database is locked');
    db.close();
  });

  it('IMMEDIATE (the fix): the other writer waits, our transaction commits', async () => {
    const path = join(dir, 'manifest.db');
    const store = new ManifestStore(path);
    store.insertSession(record('s1'));
    store.insertSession(record('other'));
    store.close();

    const db = openGmuxDatabase(path);
    const writer = midTransactionWriter(path);
    await writer.ready;

    expect(() =>
      immediateTransaction(db, () => {
        db.prepare('SELECT * FROM sessions').all();
        // We already hold the write lock, so the other connection cannot slip
        // a commit under us — it waits out its own busy_timeout instead.
        expect(writer.commitNow()).toBe('blocked');
        db.prepare<[string, string]>(
          'UPDATE sessions SET name = ? WHERE id = ?'
        ).run('mine', 's1');
      })
    ).not.toThrow();
    await writer.done;

    expect(
      db
        .prepare<[string], { name: string }>(
          'SELECT name FROM sessions WHERE id = ?'
        )
        .get('s1')?.name
    ).toBe('mine');
    db.close();
  });

  it('reconcile() survives the same interleaving on the real path', async () => {
    const path = join(dir, 'manifest.db');
    const store = new ManifestStore(path);
    store.insertSession(record('s1'));
    store.insertSession(record('other'));
    const writer = midTransactionWriter(path);
    await writer.ready;

    // Wedge the other connection's commit into reconcile's own window —
    // between its listSessions() read and its first updateSession() write.
    const realList = store.listSessions.bind(store);
    let wedged = 0;
    store.listSessions = () => {
      const rows = realList();
      if (wedged++ === 0) expect(writer.commitNow()).toBe('blocked');
      return rows;
    };

    const result = store.reconcile([
      { tmuxId: '$1', tmuxName: 's1', gmuxId: 's1' }
    ]);
    await writer.done;

    expect(wedged).toBe(1);
    expect(result.alive.map((r) => r.id)).toEqual(['s1']);
    expect(result.restorable.map((r) => r.id)).toEqual(['other']);
    expect(store.getSession('other')?.status).toBe('restorable');
    store.close();
  });
});

/**
 * A migration step that describes the schema it wants can run against a
 * database that is already in that state.
 *
 * This is what makes a recovered manifest openable. `/usr/bin/sqlite3
 * .recover` rebuilds from the FINAL schema while the `migrations` bookkeeping
 * table can come back holding one row, so the runner re-runs early steps
 * against columns that are already there. A plain `ALTER TABLE` throws
 * `duplicate column name` and the app can never open that file again.
 */
describe('addColumnIfMissing', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'gmux-idem-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('adds the column once and is silent the second time', () => {
    const db = new Database(join(dir, 'a.db'));
    db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY)');
    addColumnIfMissing(db, 'sessions', 'exit_code', 'INTEGER');
    addColumnIfMissing(db, 'sessions', 'exit_code', 'INTEGER');
    const names = (db.pragma('table_info(sessions)') as { name: string }[]).map(
      (c) => c.name
    );
    expect(names).toEqual(['id', 'exit_code']);
    db.close();
  });

  it('reproduces the recovered-manifest shape and survives it', () => {
    const path = join(dir, 'recovered.db');
    const db = new Database(path);
    // The final schema, exactly as `.recover` would rebuild it...
    db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY, exit_code INTEGER)');
    // ...and a bookkeeping table that only remembers the first step.
    db.exec(
      'CREATE TABLE migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT NOT NULL UNIQUE, applied_at INTEGER NOT NULL)'
    );
    db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(
      '001-initial',
      Date.now()
    );

    const plain = [
      { name: '001-initial', up: () => undefined },
      {
        name: '002-exit-code',
        up: (d: Database.Database) => {
          d.exec('ALTER TABLE sessions ADD COLUMN exit_code INTEGER;');
        }
      }
    ];
    expect(() => runMigrations(db, plain)).toThrow(/duplicate column name/);

    const idempotent = [
      { name: '001-initial', up: () => undefined },
      {
        name: '002-exit-code',
        up: (d: Database.Database) => {
          addColumnIfMissing(d, 'sessions', 'exit_code', 'INTEGER');
        }
      }
    ];
    expect(() => runMigrations(db, idempotent)).not.toThrow();
    db.close();
  });

  it('a real ManifestStore opens a recovered-shape file', () => {
    const path = join(dir, 'manifest.db');
    // Build it once through the store, then rewind the bookkeeping table the
    // way a recovery does.
    new ManifestStore(path).close();
    const raw = new Database(path);
    raw.exec("DELETE FROM migrations WHERE name != '001-initial'");
    raw.close();
    expect(() => new ManifestStore(path).close()).not.toThrow();
  });
});
