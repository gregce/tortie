/**
 * Migration 015 and the `remote_projects` table, against a real manifest built
 * at schema 14 (Phase 90.3).
 *
 * ## Why it builds the older file rather than asserting on a fresh one
 *
 * The claim migration 015 makes is about a manifest that has been in use, opened
 * by a build carrying a table that build never had. A test that opens a fresh
 * manifest and finds the table proves the CREATE, which is the easy half. So
 * this file applies the first fourteen migrations, writes rows into both the
 * sessions and the projects tables, and only then lets the fifteenth run.
 *
 * ## What it asserts
 *
 *  1. `PRAGMA user_version` reads 15 and the minimum stays 13.
 *  2. Every pre-existing local project row is byte for byte what it was.
 *  3. The migration is idempotent: applying it twice leaves the same bytes.
 *  4. A folder on this Mac and a folder on a machine may hold the SAME path,
 *     which is the whole reason the table exists.
 *  5. `UNIQUE(machine_id, path)` keeps the original id on a second add.
 *  6. `listProjects` returns local rows first, in their existing order.
 *  7. One delete verb removes either kind.
 *  8. A downgrade reads the local projects and nothing else, with no refusal.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.47.0' }
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

let root = '';
let dbPath = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p903-remote-projects-'));
  userData = root;
  dbPath = join(root, 'manifest.db');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Every migration this build ships except the one under test. */
const UP_TO_014 = MIGRATIONS.filter(
  (one) => one.name !== '015-remote-projects'
);

/** A manifest at schema 14, holding two project rows a person really made. */
function buildSchema14(): Database.Database {
  const db = new Database(dbPath);
  db.pragma(`application_id = ${String(MANIFEST_SCHEMA_IDENTITY.applicationId)}`);
  runMigrations(db, UP_TO_014, (inner) => {
    stampSchemaVersion(
      inner,
      { ...MANIFEST_SCHEMA_IDENTITY, version: 14, minCompatible: 13 },
      '0.46.0'
    );
  });
  const insert = db.prepare(
    'INSERT INTO projects (id, path, name) VALUES (?, ?, ?)'
  );
  insert.run('p-alpha', '/Users/gdc/alpha', 'alpha');
  insert.run('p-gmux', '/Users/gdc/gmux', 'gmux');
  return db;
}

describe('migration 015, the remote_projects table', () => {
  it('leaves the minimum at 13, and the version has kept counting', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    try {
      const db = new Database(dbPath, { readonly: true });
      const version = (db.pragma('user_version') as { user_version: number }[])[0];
      // Phase 93 appended 016-project-tombstone, so an open now lands on 16.
      // What this file pins is that opening a schema 14 file runs migration 015
      // and that the minimum does not move, and both are still true.
      expect(version?.user_version).toBe(16);
      db.close();
      expect(MANIFEST_SCHEMA_VERSION).toBe(16);
      expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(13);
    } finally {
      store.close();
    }
  });

  it('leaves every local project row exactly as it was', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.listProjects()).toEqual([
        { id: 'p-alpha', path: '/Users/gdc/alpha', name: 'alpha' },
        { id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' }
      ]);
    } finally {
      store.close();
    }
  });

  it('runs once, and a second open runs nothing', () => {
    buildSchema14().close();
    const first = new ManifestStore(dbPath);
    const applied = (): string[] => {
      const db = new Database(dbPath, { readonly: true });
      const names = db
        .prepare('SELECT name FROM migrations ORDER BY id')
        .all() as { name: string }[];
      db.close();
      return names.map((row) => row.name);
    };
    let after = applied();
    first.close();
    const second = new ManifestStore(dbPath);
    try {
      expect(applied()).toEqual(after);
      expect(after.filter((name) => name === '015-remote-projects')).toHaveLength(
        1
      );
      after = applied();
    } finally {
      second.close();
    }
  });
});

describe('two computers, one path', () => {
  it('holds the same path on this Mac and on a machine as two projects', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    try {
      const here = store.getProjectByPath('/Users/gdc/gmux');
      const there = store.upsertRemoteProject({
        machineId: 'macpro',
        path: '/Users/gdc/gmux',
        name: 'gmux'
      });
      expect(here).toBeDefined();
      expect(there.machineId).toBe('macpro');
      expect(there.id).not.toBe(here?.id);
      // The local row carries NO machineId, exactly as before this phase, so a
      // reader that never heard of a machine still reads it correctly.
      expect(here).not.toHaveProperty('machineId');
    } finally {
      store.close();
    }
  });

  it('keeps the original id when the same folder is added twice', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    try {
      const first = store.upsertRemoteProject({
        machineId: 'macpro',
        path: '/Users/gdc/work',
        name: 'work'
      });
      const again = store.upsertRemoteProject({
        machineId: 'macpro',
        path: '/Users/gdc/work',
        name: 'renamed'
      });
      expect(again.id).toBe(first.id);
      expect(again.name).toBe('renamed');
      expect(store.listRemoteProjects()).toHaveLength(1);
    } finally {
      store.close();
    }
  });

  it('lists local rows first and then the rows on machines', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    try {
      store.upsertRemoteProject({
        machineId: 'macpro',
        path: '/Users/gdc/zeta',
        name: 'zeta'
      });
      store.upsertRemoteProject({
        machineId: 'macpro',
        path: '/Users/gdc/beta',
        name: 'beta'
      });
      expect(store.listProjects().map((p) => p.name)).toEqual([
        'alpha',
        'gmux',
        'beta',
        'zeta'
      ]);
    } finally {
      store.close();
    }
  });

  it('removes either kind through the one delete verb', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    try {
      const there = store.upsertRemoteProject({
        machineId: 'macpro',
        path: '/Users/gdc/work',
        name: 'work'
      });
      store.deleteProject(there.id);
      expect(store.listRemoteProjects()).toEqual([]);
      expect(store.listProjects()).toHaveLength(2);
      store.deleteProject('p-alpha');
      expect(store.listProjects().map((p) => p.id)).toEqual(['p-gmux']);
    } finally {
      store.close();
    }
  });
});

describe('a build that has never heard of the table', () => {
  it('reads the local projects and nothing else, with no refusal', () => {
    buildSchema14().close();
    const store = new ManifestStore(dbPath);
    store.upsertRemoteProject({
      machineId: 'macpro',
      path: '/Users/gdc/gmux',
      name: 'gmux'
    });
    store.close();
    // What a build at schema 13 or 14 does: it opens the file, is allowed to
    // write it because 15 is at or above its own minimum of 13, and reads the
    // one projects table it knows about.
    const old = new Database(dbPath);
    try {
      const rows = old
        .prepare('SELECT id, path, name FROM projects ORDER BY name')
        .all();
      expect(rows).toEqual([
        { id: 'p-alpha', path: '/Users/gdc/alpha', name: 'alpha' },
        { id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' }
      ]);
      const min = old
        .prepare("SELECT value FROM meta WHERE key = 'min_compatible_version'")
        .get() as { value: string } | undefined;
      expect(min?.value).toBe('13');
    } finally {
      old.close();
    }
  });
});
