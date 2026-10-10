/**
 * Migration 019 and the `remote_folder_pins` table, against a real manifest
 * built at schema 18 (Phase 336, build/p336/SPEC.md D7).
 *
 * ## Why it builds the older file rather than asserting on a fresh one
 *
 * The claim migration 019 makes is about a manifest that has been in use,
 * opened by a build carrying a table that build never had. So this file
 * applies the first eighteen migrations, writes a session row and a remote
 * project row the way a schema 18 build would, and only then lets the
 * nineteenth run. A fresh manifest would prove the CREATE and nothing else.
 *
 * ## What it asserts, each a clause the phase adds
 *
 *  1. 019 is the nineteenth migration and the minimum stays 13, and a build
 *     at schema 18 is still allowed to open the file afterwards (the minimum is
 *     what decides, and it did not move). Since Phase 344 it is no longer the
 *     LAST migration (020-closed-remote-folders follows it), so the file is read
 *     as landing on this build's version rather than on 19.
 *  2. 019 leaves every row a schema 18 build wrote byte for byte, runs once,
 *     and a second open runs nothing.
 *  3. A pin is set, read back, and OVERWRITTEN by a second set for the same
 *     folder, which is how a hand open re-pins.
 *  4. The key is `(machine, path)` with the path BYTE FOR BYTE: the same path
 *     on two machines is two pins, and `/a/b`, `/a/b/` and `/a/./b` are three
 *     keys, because the far side, not this table, decides what a spelling IS.
 *  5. An identity not in `^[0-9]{1,20}:[0-9]{1,20}$` is refused on the way in
 *     with nothing written, and a malformed stored identity (a planted row)
 *     reads as no pin on the way out.
 *  6. The pin survives a close and a reopen, which is the reason it is a table
 *     at all: a swap made while Tortie was closed must not be adopted.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.130.0' }
}));

const { runMigrations } = await import('../../db/sqlite');
const { assertDatabaseUsableAt, stampSchemaVersion } = await import(
  '../../db/schema-version'
);
const {
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION,
  MIGRATIONS
} = await import('../schema');
const { ManifestStore } = await import('../store');
const { REMOTE_FOLDER_IDENTITY_PATTERN, isRemoteFolderIdentity } = await import(
  '../remote-folder-pins'
);

let root = '';
let dbPath = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p336-folder-pins-'));
  userData = root;
  dbPath = join(root, 'manifest.db');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Every migration this build ships except the one under test. */
const UP_TO_018 = MIGRATIONS.filter((one) => one.name !== '019-remote-folder-pins');

/** A manifest at schema 18, holding rows a person really made. */
function buildSchema18(): void {
  const db = new Database(dbPath);
  db.pragma(`application_id = ${String(MANIFEST_SCHEMA_IDENTITY.applicationId)}`);
  runMigrations(db, UP_TO_018, (inner) => {
    stampSchemaVersion(
      inner,
      { ...MANIFEST_SCHEMA_IDENTITY, version: 18, minCompatible: 13 },
      '0.129.0'
    );
  });
  db.prepare(
    `INSERT INTO remote_projects (id, machine_id, path, name, added_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run('rp-1', 'macpro', '/Users/gdc/code/site', 'site', 1_700_000_000_000);
  db.prepare('INSERT INTO projects (id, path, name) VALUES (?, ?, ?)').run(
    'p-gmux',
    '/Users/gdc/gmux',
    'gmux'
  );
  db.close();
}

function appliedNames(): string[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    return (
      db.prepare('SELECT name FROM migrations ORDER BY id').all() as {
        name: string;
      }[]
    ).map((row) => row.name);
  } finally {
    db.close();
  }
}

function tableNames(): string[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    return (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as { name: string }[]
    ).map((row) => row.name);
  } finally {
    db.close();
  }
}

describe('migration 019, the remote_folder_pins table', () => {
  // Phase 344 appended 020-closed-remote-folders, so 019 is pinned by its own
  // position and no longer as the last migration or the version.
  it('is the nineteenth migration and the minimum stays 13', () => {
    expect(MIGRATIONS[18]?.name).toBe('019-remote-folder-pins');
    expect(MANIFEST_MIGRATION_NAMES[18]).toBe('019-remote-folder-pins');
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(13);
  });

  it("runs over a schema 18 file, lands it on this build's version, and a schema 18 build may still open it", () => {
    buildSchema18();
    expect(tableNames()).not.toContain('remote_folder_pins');
    const store = new ManifestStore(dbPath);
    store.close();
    const db = new Database(dbPath, { readonly: true });
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(MANIFEST_SCHEMA_VERSION);
      const min = db
        .prepare("SELECT value FROM meta WHERE key = 'min_compatible_version'")
        .get() as { value: string } | undefined;
      expect(min?.value).toBe('13');
    } finally {
      db.close();
    }
    expect(tableNames()).toContain('remote_folder_pins');
    // ADDITIVE: the refusal is decided by the minimum, and a build at schema
    // 18 is at or above it, so it opens this file and ignores the table.
    expect(() =>
      assertDatabaseUsableAt(dbPath, {
        ...MANIFEST_SCHEMA_IDENTITY,
        version: 18,
        minCompatible: 13
      })
    ).not.toThrow();
  });

  it('leaves every row a schema 18 build wrote exactly as it was', () => {
    buildSchema18();
    const store = new ManifestStore(dbPath);
    try {
      expect(store.listRemoteProjects()).toEqual([
        {
          id: 'rp-1',
          path: '/Users/gdc/code/site',
          name: 'site',
          machineId: 'macpro'
        }
      ]);
      expect(store.getProjectByPath('/Users/gdc/gmux')).toEqual({
        id: 'p-gmux',
        path: '/Users/gdc/gmux',
        name: 'gmux'
      });
      // A row from before this phase has no pin, which is the case the first
      // write pins (build/p336/SPEC.md D6).
      expect(store.remoteFolderPin('macpro', '/Users/gdc/code/site')).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('runs once, and a second open runs nothing', () => {
    buildSchema18();
    new ManifestStore(dbPath).close();
    const after = appliedNames();
    expect(after.filter((name) => name === '019-remote-folder-pins')).toHaveLength(1);
    new ManifestStore(dbPath).close();
    expect(appliedNames()).toEqual(after);
  });
});

describe('a pin, set and read back', () => {
  it('reads back what was set, with the instant it was taken', () => {
    const store = new ManifestStore(dbPath);
    try {
      store.setRemoteFolderPin('macpro', '/Users/gdc/code/site', '16777231:756536630', 1_700_000_000_000);
      expect(store.remoteFolderPin('macpro', '/Users/gdc/code/site')).toEqual({
        machineId: 'macpro',
        path: '/Users/gdc/code/site',
        identity: '16777231:756536630',
        pinnedAt: 1_700_000_000_000
      });
    } finally {
      store.close();
    }
  });

  it('is overwritten by a second set for the same folder, which is how a hand open re-pins', () => {
    const store = new ManifestStore(dbPath);
    try {
      store.setRemoteFolderPin('macpro', '/srv/app', '1:2', 1_000);
      store.setRemoteFolderPin('macpro', '/srv/app', '1:3', 2_000);
      expect(store.remoteFolderPin('macpro', '/srv/app')).toEqual({
        machineId: 'macpro',
        path: '/srv/app',
        identity: '1:3',
        pinnedAt: 2_000
      });
      const db = new Database(dbPath, { readonly: true });
      try {
        const count = db
          .prepare('SELECT COUNT(*) AS c FROM remote_folder_pins')
          .get() as { c: number };
        expect(count.c).toBe(1);
      } finally {
        db.close();
      }
    } finally {
      store.close();
    }
  });

  it('keys by machine, so the same path on two machines is two pins', () => {
    const store = new ManifestStore(dbPath);
    try {
      store.setRemoteFolderPin('macpro', '/srv/app', '1:2');
      store.setRemoteFolderPin('pop-os', '/srv/app', '9:9');
      expect(store.remoteFolderPin('macpro', '/srv/app')?.identity).toBe('1:2');
      expect(store.remoteFolderPin('pop-os', '/srv/app')?.identity).toBe('9:9');
      expect(store.remoteFolderPin('studio', '/srv/app')).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('keys by the stored path BYTE FOR BYTE, never by a resolved or folded spelling', () => {
    const store = new ManifestStore(dbPath);
    try {
      store.setRemoteFolderPin('macpro', '/a/b', '1:1');
      // The far side judges what a spelling IS, by identity, in the same call
      // as the write; a text rule here would be a guess about another computer.
      for (const other of ['/a/b/', '/a/./b', '/a//b', '/A/b', '/a/c/../b']) {
        expect(store.remoteFolderPin('macpro', other), other).toBeUndefined();
      }
      store.setRemoteFolderPin('macpro', '/a/./b', '2:2');
      expect(store.remoteFolderPin('macpro', '/a/b')?.identity).toBe('1:1');
      expect(store.remoteFolderPin('macpro', '/a/./b')?.identity).toBe('2:2');
    } finally {
      store.close();
    }
  });

  it('outlives a close and a reopen', () => {
    const first = new ManifestStore(dbPath);
    first.setRemoteFolderPin('macpro', '/srv/app', '42:4242', 5_000);
    first.close();
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db
        .prepare('SELECT * FROM remote_folder_pins WHERE machine_id = ? AND path = ?')
        .get('macpro', '/srv/app') as Record<string, unknown> | undefined;
      expect(row).toEqual({
        machine_id: 'macpro',
        path: '/srv/app',
        identity: '42:4242',
        pinned_at: 5_000
      });
    } finally {
      db.close();
    }
    const second = new ManifestStore(dbPath);
    try {
      expect(second.remoteFolderPin('macpro', '/srv/app')?.identity).toBe('42:4242');
    } finally {
      second.close();
    }
  });
});

describe('the one shape an identity may have', () => {
  const GOOD = ['0:0', '1:2', '16777231:756536630', `${'9'.repeat(20)}:${'9'.repeat(20)}`];
  const BAD = [
    '',
    'none',
    '1',
    '1:',
    ':1',
    '1:2:3',
    '1 :2',
    ' 1:2',
    '1:2\n',
    '1:2 ',
    '-1:2',
    '+1:2',
    '1.0:2',
    '0x1:2',
    `${'9'.repeat(21)}:1`,
    `1:${'9'.repeat(21)}`,
    '１:２',
    '1:2; rm -rf /'
  ];

  it('accepts a device and an inode in decimal and nothing else', () => {
    expect(REMOTE_FOLDER_IDENTITY_PATTERN.source).toBe('^[0-9]{1,20}:[0-9]{1,20}$');
    for (const good of GOOD) expect(isRemoteFolderIdentity(good), good).toBe(true);
    for (const bad of BAD) expect(isRemoteFolderIdentity(bad), JSON.stringify(bad)).toBe(false);
    expect(isRemoteFolderIdentity(12)).toBe(false);
    expect(isRemoteFolderIdentity(null)).toBe(false);
  });

  it('refuses a bad identity on the way in and writes nothing', () => {
    const store = new ManifestStore(dbPath);
    try {
      for (const bad of BAD) {
        expect(
          () => store.setRemoteFolderPin('macpro', '/srv/app', bad),
          JSON.stringify(bad)
        ).toThrow(/not a folder identity/);
      }
      expect(store.remoteFolderPin('macpro', '/srv/app')).toBeUndefined();
      // A bad set over a good pin leaves the good pin.
      store.setRemoteFolderPin('macpro', '/srv/app', '1:2');
      expect(() => store.setRemoteFolderPin('macpro', '/srv/app', 'none')).toThrow();
      expect(store.remoteFolderPin('macpro', '/srv/app')?.identity).toBe('1:2');
    } finally {
      store.close();
    }
  });

  it('refuses an empty machine or folder and writes nothing', () => {
    const store = new ManifestStore(dbPath);
    try {
      expect(() => store.setRemoteFolderPin('', '/srv/app', '1:2')).toThrow(/not named/);
      expect(() => store.setRemoteFolderPin('macpro', '', '1:2')).toThrow(/not named/);
      expect(store.remoteFolderPin('', '/srv/app')).toBeUndefined();
      expect(store.remoteFolderPin('macpro', '')).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('reads a malformed stored identity, a planted row, as no pin', () => {
    new ManifestStore(dbPath).close();
    const db = new Database(dbPath);
    const plant = db.prepare(
      'INSERT INTO remote_folder_pins (machine_id, path, identity, pinned_at) VALUES (?, ?, ?, ?)'
    );
    plant.run('macpro', '/planted/none', 'none', 1);
    plant.run('macpro', '/planted/newline', '1:2\n', 1);
    plant.run('macpro', '/planted/three', '1:2:3', 1);
    plant.run('macpro', '/planted/empty', '', 1);
    plant.run('macpro', '/planted/good', '7:8', 1);
    db.close();
    const store = new ManifestStore(dbPath);
    try {
      for (const path of ['/planted/none', '/planted/newline', '/planted/three', '/planted/empty']) {
        expect(store.remoteFolderPin('macpro', path), path).toBeUndefined();
      }
      // The control: the one well formed planted row reads, so the refusals
      // above are the shape rule and not a broken read.
      expect(store.remoteFolderPin('macpro', '/planted/good')?.identity).toBe('7:8');
    } finally {
      store.close();
    }
  });
});
