/**
 * The remote execution journal and migration 017 (Phase 118).
 *
 * Exercised against a real on-disk SQLite file, migrations and all, because the
 * whole point of the journal is what the NEXT process finds when it opens the
 * file. A mocked database would test the mock.
 *
 * WHAT IS DELIBERATELY NOT TESTED HERE. That a durable commit survives power
 * loss. `synchronous=FULL` plus `fullfsync=1` is a call into the drive and no
 * unit test can cut the power. What is testable, and is tested, is that the row
 * is written before the side effect and readable afterwards by a second
 * connection that never saw the first one's memory.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../db/sqlite';
import {
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_VERSION,
  MIGRATIONS
} from '../schema';
import { ManifestStore } from '../store';
import {
  JOURNALED_REMOTE_EXECUTION_KIND,
  REMOTE_EXECUTION_KINDS,
  REMOTE_EXECUTION_OUTCOMES,
  RemoteExecutionJournal
} from '../remote-executions';

let dir: string;
let dbPath: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-remote-exec-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
});

afterEach(() => {
  try {
    store.close();
  } catch {
    /* a test that closed it already */
  }
  rmSync(dir, { recursive: true, force: true });
});

function begin(
  overrides: Partial<Parameters<ManifestStore['beginRemoteExecution']>[0]> = {},
  at = 1_700_000_000_000
): number {
  return store.beginRemoteExecution(
    {
      machineId: 'studio',
      machineLabel: 'Studio',
      kind: 'clone',
      subject: '/Users/gdc/gmux',
      ...overrides
    },
    at
  );
}

describe('the numbers', () => {
  it('is at schema 17 and still lets a build at 13 write', () => {
    expect(MANIFEST_SCHEMA_VERSION).toBe(17);
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(13);
    expect(MIGRATIONS).toHaveLength(17);
    expect(MIGRATIONS[16]?.name).toBe('017-remote-executions');
  });

  it('names one journaled kind out of five, and four outcomes', () => {
    expect([...REMOTE_EXECUTION_KINDS]).toEqual([
      'clone',
      'capture',
      'harvest',
      'store-sync',
      'command'
    ]);
    expect([...REMOTE_EXECUTION_OUTCOMES]).toEqual([
      'answered',
      'failed',
      'cutOff',
      'unjoined'
    ]);
    expect(JOURNALED_REMOTE_EXECUTION_KIND).toBe('clone');
  });
});

describe('one row, opened and closed', () => {
  it('leaves nothing unfinished once it is closed', () => {
    const id = begin();
    expect(store.listUnfinishedRemoteExecutions()).toHaveLength(1);
    store.finishRemoteExecution(id, 'answered', 1_700_000_001_000);
    expect(store.listUnfinishedRemoteExecutions()).toEqual([]);
    const row = store.getRemoteExecution(id);
    expect(row?.outcome).toBe('answered');
    expect(row?.finishedAt).toBe(1_700_000_001_000);
  });

  it('is readable by a second connection that never saw the first', () => {
    const id = begin();
    store.close();
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const row = db
        .prepare<[number], Record<string, unknown>>(
          'SELECT * FROM remote_executions WHERE id = ?'
        )
        .get(id);
      expect(row?.['machine_id']).toBe('studio');
      expect(row?.['machine_label']).toBe('Studio');
      expect(row?.['subject']).toBe('/Users/gdc/gmux');
      expect(row?.['outcome']).toBeNull();
    } finally {
      db.close();
    }
    store = new ManifestStore(dbPath);
  });

  it('keeps the label as it read at the time, not as it reads now', () => {
    // The machine may be removed before anybody reads the row, which is the
    // same reason `machine_tombstone` stores the label rather than the id
    // alone.
    const id = begin({ machineLabel: 'Studio in the loft' });
    expect(store.getRemoteExecution(id)?.machineLabel).toBe('Studio in the loft');
  });

  it('returns only unfinished rows, oldest first', () => {
    const first = begin({ subject: '/one' }, 1_700_000_000_000);
    const second = begin({ subject: '/two' }, 1_700_000_100_000);
    const third = begin({ subject: '/three' }, 1_700_000_200_000);
    store.finishRemoteExecution(second, 'failed');
    expect(
      store.listUnfinishedRemoteExecutions().map((r) => r.id)
    ).toEqual([first, third]);
  });

  it('does not reopen a row that was already closed', () => {
    const id = begin();
    store.finishRemoteExecution(id, 'answered', 1);
    store.finishRemoteExecution(id, 'cutOff', 2);
    expect(store.getRemoteExecution(id)?.outcome).toBe('answered');
  });

  it('closing a row that is not there is not an error', () => {
    expect(() => store.finishRemoteExecution(9_999, 'cutOff')).not.toThrow();
  });
});

describe('migration 017 is additive', () => {
  /**
   * The test migration 015 answered, asked again. A build that stops at 16 has
   * never heard of this table, so it writes no row into it and reads none. What
   * it writes into `sessions` must still read back byte for byte after the full
   * list runs.
   */
  it('an older build own row reads back identically after 017 runs', () => {
    store.close();
    rmSync(dbPath, { force: true });

    const old = new Database(dbPath);
    runMigrations(old, MIGRATIONS.slice(0, 16));
    old
      .prepare(
        `INSERT INTO sessions
           (id, name, tmux_name, project_path, cwd, agent, argv, status,
            created_at, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'written-at-16',
        'before 017',
        'before-017',
        '/w',
        '/w',
        'claude',
        JSON.stringify(['/opt/homebrew/bin/claude']),
        'running',
        1_700_000_000_000,
        1_700_000_000_000
      );
    const before = old
      .prepare<[string], Record<string, unknown>>(
        'SELECT * FROM sessions WHERE id = ?'
      )
      .get('written-at-16');
    expect(
      old
        .prepare<[], { name: string }>('SELECT name FROM migrations')
        .all()
        .map((r) => r.name)
    ).not.toContain('017-remote-executions');
    old.close();

    store = new ManifestStore(dbPath);
    const after = store.getSession('written-at-16');
    expect(after?.name).toBe('before 017');
    expect(after?.status).toBe('running');
    expect(after?.argv).toEqual(['/opt/homebrew/bin/claude']);
    expect(before?.['created_at']).toBe(1_700_000_000_000);
    // The new table exists and is empty, so a build that never heard of it left
    // nothing this build reads wrongly.
    expect(store.listUnfinishedRemoteExecutions()).toEqual([]);
  });
});

describe('the prune', () => {
  it('keeps every unfinished row and bounds the finished ones', () => {
    const db = new Database(dbPath);
    const journal = new RemoteExecutionJournal(db);
    const openIds: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      openIds.push(
        journal.beginRemoteExecution({
          machineId: 'studio',
          machineLabel: 'Studio',
          kind: 'clone',
          subject: `/open-${String(i)}`
        })
      );
    }
    for (let i = 0; i < 10; i += 1) {
      const id = journal.beginRemoteExecution({
        machineId: 'studio',
        machineLabel: 'Studio',
        kind: 'clone',
        subject: `/closed-${String(i)}`
      });
      journal.finishRemoteExecution(id, 'answered');
    }
    journal.pruneRemoteExecutions(3);
    expect(journal.listUnfinishedRemoteExecutions().map((r) => r.id)).toEqual(
      openIds
    );
    expect(
      db
        .prepare<[], { n: number }>(
          'SELECT COUNT(*) AS n FROM remote_executions WHERE outcome IS NOT NULL'
        )
        .get()?.n
    ).toBe(3);
    db.close();
  });
});

describe('a value this build does not know', () => {
  it('reads an unknown kind as command rather than dropping the row', () => {
    // The row is the only record that a copy was started. Dropping it whole
    // would silence exactly the case the journal exists for, so the least
    // specific known value is used and the machine, the subject and the instant
    // are read as they are.
    const id = begin();
    store.close();
    const db = new Database(dbPath);
    db.prepare('UPDATE remote_executions SET kind = ? WHERE id = ?').run(
      'something-a-later-build-added',
      id
    );
    db.close();
    store = new ManifestStore(dbPath);
    const row = store.listUnfinishedRemoteExecutions()[0];
    expect(row?.kind).toBe('command');
    expect(row?.subject).toBe('/Users/gdc/gmux');
    expect(row?.machineLabel).toBe('Studio');
  });
});
