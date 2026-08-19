/**
 * Migration 016 and the `project_tombstone` column, against a real manifest
 * built at schema 15 (Phase 93).
 *
 * ## Why it builds the older file rather than asserting on a fresh one
 *
 * The claim migration 016 makes is about a manifest that has been in use for
 * months, holding sessions in every shape the product can produce, opened by a
 * build carrying a column that build never had. A test that opens a fresh
 * manifest and finds the column proves the ALTER, which is the easy half. So
 * this file applies the first fifteen migrations, writes session rows through
 * SQL, and only then lets the sixteenth run.
 *
 * ## What it asserts, in order
 *
 *  1. `PRAGMA user_version` reads 16 and the minimum stays at 13.
 *  2. A row written before the column existed reads back with no record of a
 *     closed tab, and its projection carries no `closedProject`.
 *  3. `markProjectTabClosed` stamps every live session in the folder and
 *     returns how many it stamped.
 *  4. It leaves a discarded row alone, and a row carrying a machine tombstone
 *     keeps that tombstone untouched.
 *  5. It matches on the machine as well as the path, so the same path on this
 *     Mac and on another computer are two different folders.
 *  6. A column value that cannot be parsed reads back as no record at all, and
 *     nothing throws.
 *  7. `clearProjectTabClosed` clears exactly the rows for that folder on that
 *     machine.
 *  8. The stamp survives closing the manifest and opening it again.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.48.0' }
}));

const { runMigrations } = await import('../../db/sqlite');
const { stampSchemaVersion } = await import('../../db/schema-version');
const {
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION,
  MIGRATIONS
} = await import('../schema');
const { ManifestStore } = await import('../store');
const { toSession } = await import('../codecs');

let root = '';
let dbPath = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p93-project-tombstone-'));
  userData = root;
  dbPath = join(root, 'manifest.db');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Every migration this build ships except the one under test. */
const UP_TO_015 = MIGRATIONS.filter(
  (one) => one.name !== '016-project-tombstone'
);

/**
 * The removal instant on the discarded row.
 *
 * It is RECENT rather than a fixed old date, because opening the store runs
 * `pruneDiscardedSessions`, which hard deletes a tombstone older than ninety
 * days. A 2023 timestamp would make the row vanish at open and the test would
 * be asserting against a row the store correctly threw away.
 */
const REMOVED_AT = Date.now() - 60_000;

/** One machine tombstone, so the test can prove it is not overwritten. */
const MACHINE_GONE = JSON.stringify({
  v: 1,
  machineId: 'macpro',
  machineLabel: 'Mac Pro',
  lastStatus: 'running',
  lastSeenAt: REMOVED_AT - 1000,
  forgottenAt: REMOVED_AT
});

/**
 * A manifest at schema 15, holding the five session shapes this phase has to be
 * right about.
 *
 * Two live sessions in one folder on this Mac, one discarded row in the same
 * folder carrying a machine tombstone, one live session in the SAME PATH on
 * another machine, and one live session in a different folder entirely.
 */
function buildSchema15(): Database.Database {
  const db = new Database(dbPath);
  db.pragma(`application_id = ${String(MANIFEST_SCHEMA_IDENTITY.applicationId)}`);
  runMigrations(db, UP_TO_015, (inner) => {
    stampSchemaVersion(
      inner,
      { ...MANIFEST_SCHEMA_IDENTITY, version: 15, minCompatible: 13 },
      '0.47.0'
    );
  });
  const insert = db.prepare(
    `INSERT INTO sessions
       (id, name, tmux_name, project_path, cwd, agent, argv, status,
        created_at, last_seen, machine_id, machine_tombstone, removed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const argv = JSON.stringify(['/usr/local/bin/claude']);
  insert.run(
    'live-a', 'claude-1', 'claude-1', '/Users/gdc/gmux', '/Users/gdc/gmux',
    'claude', argv, 'running', 1_787_000_000_000, 1_787_000_000_000,
    'local', null, null
  );
  insert.run(
    'live-b', 'claude-2', 'claude-2', '/Users/gdc/gmux', '/Users/gdc/gmux',
    'claude', argv, 'needs_input', 1_787_000_000_001, 1_787_000_000_001,
    'local', null, null
  );
  insert.run(
    'gone-c', 'claude-3', 'claude-3', '/Users/gdc/gmux', '/Users/gdc/gmux',
    'claude', argv, 'discarded', 1_787_000_000_002, 1_787_000_000_002,
    'macpro', MACHINE_GONE, REMOVED_AT
  );
  insert.run(
    'remote-d', 'api', 'api', '/Users/gdc/gmux', '/Users/gdc/gmux',
    'claude', argv, 'running', 1_787_000_000_003, 1_787_000_000_003,
    'macpro', null, null
  );
  insert.run(
    'other-e', 'shell-1', 'shell-1', '/Users/gdc/other', '/Users/gdc/other',
    'shell', argv, 'running', 1_787_000_000_004, 1_787_000_000_004,
    'local', null, null
  );
  return db;
}

/** The record this phase writes, for the folder on this Mac. */
const LOCAL_TAB = {
  v: 1 as const,
  projectId: 'p-gmux',
  projectName: 'gmux',
  path: '/Users/gdc/gmux',
  closedAt: 1_787_100_000_000
};

/** The same record for the folder of the same name on the other machine. */
const REMOTE_TAB = {
  v: 1 as const,
  projectId: 'p-gmux-macpro',
  projectName: 'gmux',
  machineId: 'macpro',
  path: '/Users/gdc/gmux',
  closedAt: 1_787_100_000_500
};

describe('migration 016, the project_tombstone column', () => {
  it('moves the version to 16 and leaves the minimum at 13', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      const db = new Database(dbPath, { readonly: true });
      const version = (db.pragma('user_version') as { user_version: number }[])[0];
      expect(version?.user_version).toBe(16);
      db.close();
      expect(MANIFEST_SCHEMA_VERSION).toBe(16);
      expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(13);
    } finally {
      store.close();
    }
  });

  it('adds the column, and every row written before it reads as no record', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      const db = new Database(dbPath, { readonly: true });
      const columns = (
        db.pragma('table_info(sessions)') as { name: string }[]
      ).map((c) => c.name);
      expect(columns).toContain('project_tombstone');
      db.close();
      for (const id of ['live-a', 'live-b', 'remote-d', 'other-e']) {
        const record = store.getSession(id);
        expect(record?.projectTombstone).toBeUndefined();
        expect(record && toSession(record).closedProject).toBeUndefined();
      }
    } finally {
      store.close();
    }
  });

  it('runs once, and a second open runs nothing', () => {
    buildSchema15().close();
    const applied = (): string[] => {
      const db = new Database(dbPath, { readonly: true });
      const names = db
        .prepare('SELECT name FROM migrations ORDER BY id')
        .all() as { name: string }[];
      db.close();
      return names.map((n) => n.name);
    };
    const first = new ManifestStore(dbPath);
    const afterFirst = applied();
    first.close();
    const second = new ManifestStore(dbPath);
    const afterSecond = applied();
    second.close();
    expect(afterFirst).toEqual(afterSecond);
    expect(afterFirst.filter((n) => n === '016-project-tombstone')).toHaveLength(1);
  });
});

describe('markProjectTabClosed', () => {
  it('stamps every live session in the folder and returns the count', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB))
        .toBe(2);
      expect(store.getSession('live-a')?.projectTombstone).toEqual(LOCAL_TAB);
      expect(store.getSession('live-b')?.projectTombstone).toEqual(LOCAL_TAB);
    } finally {
      store.close();
    }
  });

  it('never moves a status, because those sessions are still running', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      store.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB);
      expect(store.getSession('live-a')?.status).toBe('running');
      expect(store.getSession('live-b')?.status).toBe('needs_input');
      expect(store.getSession('live-a')?.removedAt).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('skips a discarded row and leaves its machine tombstone untouched', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      store.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB);
      const gone = store.getSession('gone-c');
      expect(gone?.projectTombstone).toBeUndefined();
      expect(gone?.machineTombstone?.machineLabel).toBe('Mac Pro');
      expect(gone?.status).toBe('discarded');
    } finally {
      store.close();
    }
  });

  it('leaves a session in a different folder alone', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      store.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB);
      expect(store.getSession('other-e')?.projectTombstone).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('matches on the machine, so one path on two computers is two folders', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB))
        .toBe(2);
      expect(store.getSession('remote-d')?.projectTombstone).toBeUndefined();

      expect(
        store.markProjectTabClosed(
          { path: '/Users/gdc/gmux', machineId: 'macpro' },
          REMOTE_TAB
        )
      ).toBe(1);
      expect(store.getSession('remote-d')?.projectTombstone).toEqual(REMOTE_TAB);
      expect(store.getSession('live-a')?.projectTombstone).toEqual(LOCAL_TAB);
    } finally {
      store.close();
    }
  });

  it('stamps nothing, and says so, when the folder holds no session', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.markProjectTabClosed({ path: '/Users/gdc/empty' }, LOCAL_TAB))
        .toBe(0);
    } finally {
      store.close();
    }
  });

  it('projects the tab into the renderer view, with no machine id in it', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      store.markProjectTabClosed(
        { path: '/Users/gdc/gmux', machineId: 'macpro' },
        REMOTE_TAB
      );
      const record = store.getSession('remote-d');
      const projected = record === undefined ? undefined : toSession(record);
      expect(projected?.closedProject).toEqual({
        name: 'gmux',
        path: '/Users/gdc/gmux',
        closedAt: REMOTE_TAB.closedAt
      });
    } finally {
      store.close();
    }
  });

  it('survives closing the manifest and opening it again', () => {
    buildSchema15().close();
    const first = new ManifestStore(dbPath);
    first.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB);
    first.close();
    const second = new ManifestStore(dbPath);
    try {
      expect(second.getSession('live-a')?.projectTombstone).toEqual(LOCAL_TAB);
    } finally {
      second.close();
    }
  });
});

describe('a column value nobody could parse', () => {
  it('reads back as no record at all, and nothing throws', () => {
    buildSchema15().close();
    const opened = new ManifestStore(dbPath);
    opened.close();
    const db = new Database(dbPath);
    db.prepare('UPDATE sessions SET project_tombstone = ? WHERE id = ?')
      .run('{"projectId":"p-gmux","projectName":', 'live-a');
    db.prepare('UPDATE sessions SET project_tombstone = ? WHERE id = ?')
      .run(JSON.stringify({ v: 1, projectId: 'p', path: '/x' }), 'live-b');
    db.close();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.getSession('live-a')?.projectTombstone).toBeUndefined();
      expect(store.getSession('live-b')?.projectTombstone).toBeUndefined();
      expect(store.listSessions()).toHaveLength(5);
    } finally {
      store.close();
    }
  });
});

describe('clearProjectTabClosed', () => {
  it('clears exactly the rows for that folder on that machine', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      store.markProjectTabClosed({ path: '/Users/gdc/gmux' }, LOCAL_TAB);
      store.markProjectTabClosed(
        { path: '/Users/gdc/gmux', machineId: 'macpro' },
        REMOTE_TAB
      );

      expect(store.clearProjectTabClosed({ path: '/Users/gdc/gmux' })).toBe(2);
      expect(store.getSession('live-a')?.projectTombstone).toBeUndefined();
      expect(store.getSession('live-b')?.projectTombstone).toBeUndefined();
      expect(store.getSession('remote-d')?.projectTombstone).toEqual(REMOTE_TAB);

      expect(
        store.clearProjectTabClosed({
          path: '/Users/gdc/gmux',
          machineId: 'macpro'
        })
      ).toBe(1);
      expect(store.getSession('remote-d')?.projectTombstone).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('clears nothing, and says so, when no row carries a stamp', () => {
    buildSchema15().close();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.clearProjectTabClosed({ path: '/Users/gdc/gmux' })).toBe(0);
    } finally {
      store.close();
    }
  });
});
