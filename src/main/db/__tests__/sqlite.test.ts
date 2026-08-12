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
import { openGmuxDatabase, runMigrations } from '../sqlite';

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
