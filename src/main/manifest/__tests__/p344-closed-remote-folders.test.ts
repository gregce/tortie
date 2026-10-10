/**
 * The record of a closed tab kept by the folder itself, for a folder on another
 * machine (Phase 344, migration 020, build/p344/SPEC.md §7.1).
 *
 * ## The defect it closes
 *
 * Since Phase 306 the re-home does not open a tab again for a folder a person
 * closed, and the only record of the close was the Phase 93 stamp on the
 * folder's SESSION ROWS. A folder none of whose sessions has a row on this Mac,
 * being one a Tortie on that machine or on another Mac started, carried no
 * stamp, so its tab came back on the next pass and after every relaunch. The
 * close is now recorded in `closed_remote_folders` beside the stamps.
 *
 * ## What it proves, against a real manifest
 *
 *  M1-M4  Migration 020 is the twentieth, additive (the minimum stays 13), runs
 *         over a schema 19 file a person used, runs once, and survives a
 *         schema 19 build opening the file again in between.
 *  K1-K11 The write (only for a folder on a machine, only when the stamp names
 *         that folder, in the same durable transaction), the clear (beside the
 *         stamps, ordinary), the read (keyed on the machine AND the exact path,
 *         a planted row reading as none), a machine's removal deleting no
 *         record, and an older build's stamp still held.
 *
 * Each title is a key `build/p344/ablation.mjs` looks up, so a title is renamed
 * here and there in the same commit or the ablation reads it as an owner that
 * stayed green.
 *
 * Nothing here ends a session and nothing is sent to any machine. Every file is
 * a scratch manifest under the system's temporary directory.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClosedProjectTab } from '../codecs';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.111.0' }
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

type Store = InstanceType<typeof ManifestStore>;

let root = '';
let dbPath = '';
let opened: Store[] = [];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p344-closed-folders-'));
  userData = root;
  dbPath = join(root, 'manifest.db');
  opened = [];
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const one of opened) {
    try {
      one.close();
    } catch {
      /* already closed by the test */
    }
  }
  opened = [];
  rmSync(root, { recursive: true, force: true });
});

/** A store on this test's file, closed in `afterEach` if the test did not. */
function open(): Store {
  const store = new ManifestStore(dbPath);
  opened.push(store);
  return store;
}

const F = '/home/gdc/work/alpha';
const G = '/home/gdc/work/beta';
const H = '/home/gdc/work/hotel';
const CLOSED_AT = 1_700_000_100_000;

/** One session row, written the way a create writes it. Undefined machine is this Mac. */
function row(store: Store, id: string, projectPath: string, machineId?: string): void {
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath,
    cwd: projectPath,
    agent: 'shell',
    status: 'running',
    createdAt: 1_700_000_000_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_700_000_000_000,
    ...(machineId === undefined ? {} : { machineId })
  });
}

/** The record `removeProject` hands the close. Undefined machine is this Mac. */
function tab(
  path: string,
  machineId?: string,
  over: Partial<ClosedProjectTab> = {}
): ClosedProjectTab {
  return {
    v: 1,
    projectId: `project-${path}`,
    projectName: path.slice(path.lastIndexOf('/') + 1),
    path,
    closedAt: CLOSED_AT,
    ...(machineId === undefined ? {} : { machineId }),
    ...over
  };
}

/** Close the tab of `path` on `machineId`, as `removeProject` does. */
function close(store: Store, path: string, machineId?: string): number {
  const target = machineId === undefined ? { path } : { path, machineId };
  return store.markProjectTabClosed(target, tab(path, machineId));
}

/** The question the re-home asks. */
function held(store: Store, path: string, machineId?: string): boolean {
  return store.projectTabClosedFor(machineId === undefined ? { path } : { path, machineId });
}

/** A raw handle on this test's file, for what the store cannot be asked. */
function withRaw<T>(fn: (raw: Database.Database) => T): T {
  const raw = new Database(dbPath);
  try {
    return fn(raw);
  } finally {
    raw.close();
  }
}

/** How many folder records the file holds, read past the store. */
function recordCount(): number {
  return withRaw(
    (raw) =>
      (raw.prepare('SELECT COUNT(*) AS c FROM closed_remote_folders').get() as { c: number }).c
  );
}

// ---------------------------------------------------------------------------
// The pragma trace of a durable commit (the rig of durable-commits.test.ts)
// ---------------------------------------------------------------------------

/** Every `PRAGMA` this process ran since the spy was installed or last reset. */
let pragmas: string[] = [];
const realPragma = Database.prototype.pragma;

function spyOnPragmas(): void {
  pragmas = [];
  vi.spyOn(Database.prototype, 'pragma').mockImplementation(function (
    this: Database.Database,
    source: string,
    options?: Database.PragmaOptions
  ): unknown {
    pragmas.push(source);
    return realPragma.call(this, source, options);
  });
}

/** The raise-and-lower a scoped durable commit leaves behind, in order. */
const DURABLE = ['synchronous = FULL', 'fullfsync = 1', 'fullfsync = 0', 'synchronous = NORMAL'];

function durabilityPragmas(): string[] {
  return pragmas.filter((p) => p.startsWith('synchronous') || p.startsWith('fullfsync'));
}

// ---------------------------------------------------------------------------
// A manifest at schema 19, as the build before this phase left it
// ---------------------------------------------------------------------------

/** Every migration this build ships except the one under test. */
const UP_TO_019 = MIGRATIONS.filter((one) => one.name !== '020-closed-remote-folders');

const SCHEMA_19 = { ...MANIFEST_SCHEMA_IDENTITY, version: 19, minCompatible: 13 };

/** Open the file the way a build at schema 19 does: check, migrate its own list, stamp 19. */
function openAsSchema19(): void {
  assertDatabaseUsableAt(dbPath, SCHEMA_19);
  withRaw((raw) => {
    const seal = (inner: Database.Database): void => {
      stampSchemaVersion(inner, SCHEMA_19, '0.110.0');
    };
    if (!runMigrations(raw, UP_TO_019, seal)) seal(raw);
  });
}

/**
 * A manifest at schema 19 holding rows a person really made: a session on a
 * machine whose tab was closed (the stamp the build before wrote), the remote
 * project of another folder, its pin, and a project on this Mac.
 */
function buildSchema19(): void {
  withRaw((raw) => {
    raw.pragma(`application_id = ${String(MANIFEST_SCHEMA_IDENTITY.applicationId)}`);
    runMigrations(raw, UP_TO_019, (inner) => {
      stampSchemaVersion(inner, SCHEMA_19, '0.110.0');
    });
    raw
      .prepare(
        `INSERT INTO sessions (id, name, tmux_name, project_path, cwd, agent, argv,
                               status, created_at, last_seen, machine_id, project_tombstone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'stamped',
        'stamped',
        'stamped',
        F,
        F,
        'shell',
        JSON.stringify(['/bin/zsh']),
        'running',
        1_700_000_000_000,
        1_700_000_000_000,
        'macpro',
        JSON.stringify(tab(F, 'macpro'))
      );
    raw
      .prepare(
        `INSERT INTO remote_projects (id, machine_id, path, name, added_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run('rp-beta', 'macpro', G, 'beta', 1_700_000_000_000);
    raw
      .prepare(
        `INSERT INTO remote_folder_pins (machine_id, path, identity, pinned_at)
         VALUES (?, ?, ?, ?)`
      )
      .run('macpro', G, '16777231:756536630', 1_700_000_000_000);
    raw.prepare('INSERT INTO projects (id, path, name) VALUES (?, ?, ?)').run(
      'p-gmux',
      '/Users/gdc/gmux',
      'gmux'
    );
  });
}

/** Every row a schema 19 build wrote, by table, read past the store. */
function personRows(): Record<string, unknown[]> {
  return withRaw((raw) => ({
    sessions: raw.prepare('SELECT * FROM sessions ORDER BY id').all(),
    remote_projects: raw.prepare('SELECT * FROM remote_projects ORDER BY id').all(),
    remote_folder_pins: raw.prepare('SELECT * FROM remote_folder_pins ORDER BY machine_id, path').all(),
    projects: raw.prepare('SELECT * FROM projects ORDER BY id').all()
  }));
}

function schemaNumbers(): { version: unknown; min: unknown } {
  return withRaw((raw) => ({
    version: raw.pragma('user_version', { simple: true }),
    min: (
      raw.prepare("SELECT value FROM meta WHERE key = 'min_compatible_version'").get() as
        | { value: string }
        | undefined
    )?.value
  }));
}

function hasTable(): boolean {
  return withRaw(
    (raw) =>
      raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'closed_remote_folders'")
        .get() !== undefined
  );
}

function migrationRows(): unknown[] {
  return withRaw((raw) => raw.prepare('SELECT id, name, applied_at FROM migrations ORDER BY id').all());
}

// ---------------------------------------------------------------------------
// Migration 020
// ---------------------------------------------------------------------------

describe('migration 020, the closed_remote_folders table', () => {
  it('M1 is the twentieth migration, the version is 20 and the minimum stays 13', () => {
    expect(MIGRATIONS).toHaveLength(20);
    expect(MIGRATIONS[19]?.name).toBe('020-closed-remote-folders');
    expect(MANIFEST_MIGRATION_NAMES.at(-1)).toBe('020-closed-remote-folders');
    expect(MANIFEST_SCHEMA_VERSION).toBe(20);
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(13);
  });

  it('M2 runs over a schema 19 file, lands it on 20, keeps every row, and a schema 19 build may still open it', () => {
    buildSchema19();
    expect(hasTable()).toBe(false);
    expect(schemaNumbers()).toEqual({ version: 19, min: '13' });
    const before = personRows();
    expect(before['sessions']).toHaveLength(1);
    expect(before['remote_projects']).toHaveLength(1);
    expect(before['remote_folder_pins']).toHaveLength(1);

    open().close();

    expect(schemaNumbers()).toEqual({ version: 20, min: '13' });
    expect(hasTable()).toBe(true);
    expect(recordCount()).toBe(0);
    expect(personRows()).toEqual(before);
    // ADDITIVE: the refusal is decided by the minimum, and a build at schema 19
    // is at or above it, so it opens this file and ignores the table.
    expect(() => {
      assertDatabaseUsableAt(dbPath, SCHEMA_19);
    }).not.toThrow();
  });

  it('M3 runs once, and a second open runs nothing', () => {
    buildSchema19();
    open().close();
    const after = migrationRows();
    expect(
      (after as { name: string }[]).filter((one) => one.name === '020-closed-remote-folders')
    ).toHaveLength(1);
    open().close();
    expect(migrationRows()).toEqual(after);
  });

  it('M4 a schema 19 build opening it again moves the version back and keeps the table, and this build re-runs nothing', () => {
    buildSchema19();

    // G1: this build opens it, and closes a folder none of whose sessions has a row.
    const first = open();
    expect(close(first, H, 'macpro')).toBe(0);
    expect(held(first, H, 'macpro')).toBe(true);
    first.close();
    expect(schemaNumbers()).toEqual({ version: 20, min: '13' });
    const migrationsAtHead = migrationRows();
    const recordAtHead = withRaw((raw) => raw.prepare('SELECT * FROM closed_remote_folders').all());
    expect(recordAtHead).toEqual([
      { machine_id: 'macpro', path: H, project_name: 'hotel', closed_at: CLOSED_AT }
    ]);

    // G2: a build at schema 19 opens it again. No refusal, its own number,
    // and the table, its row and the 020 bookkeeping row all stay.
    expect(() => {
      openAsSchema19();
    }).not.toThrow();
    expect(schemaNumbers()).toEqual({ version: 19, min: '13' });
    expect(hasTable()).toBe(true);
    expect(migrationRows()).toEqual(migrationsAtHead);
    expect(withRaw((raw) => raw.prepare('SELECT * FROM closed_remote_folders').all())).toEqual(
      recordAtHead
    );

    // G3: this build again. Nothing pending, so nothing re-runs, the version
    // reads 20 again, and the record and the older build's stamp both hold.
    const again = open();
    expect(schemaNumbers()).toEqual({ version: 20, min: '13' });
    expect(migrationRows()).toEqual(migrationsAtHead);
    expect(again.closedRemoteFolder('macpro', H)).toEqual({
      machineId: 'macpro',
      path: H,
      projectName: 'hotel',
      closedAt: CLOSED_AT
    });
    expect(held(again, H, 'macpro')).toBe(true);
    expect(held(again, F, 'macpro')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The record: written, cleared, read
// ---------------------------------------------------------------------------

describe('the record of a closed folder on a machine', () => {
  it('K1 a close of a folder on a machine with no recorded session holds it', () => {
    const store = open();
    expect(close(store, F, 'm1')).toBe(0);
    expect(held(store, F, 'm1')).toBe(true);
    expect(store.closedRemoteFolder('m1', F)).toEqual({
      machineId: 'm1',
      path: F,
      projectName: 'alpha',
      closedAt: CLOSED_AT
    });
  });

  it('K2 a second close of the same folder replaces its name and instant', () => {
    const store = open();
    expect(store.markProjectTabClosed({ path: F, machineId: 'm1' }, tab(F, 'm1'))).toBe(0);
    expect(
      store.markProjectTabClosed(
        { path: F, machineId: 'm1' },
        tab(F, 'm1', { projectName: 'alpha renamed', closedAt: CLOSED_AT + 5_000 })
      )
    ).toBe(0);
    expect(recordCount()).toBe(1);
    expect(store.closedRemoteFolder('m1', F)).toEqual({
      machineId: 'm1',
      path: F,
      projectName: 'alpha renamed',
      closedAt: CLOSED_AT + 5_000
    });
  });

  it('K3 a local close writes no folder record', () => {
    const store = open();
    // A tab on this Mac with no session in it.
    expect(close(store, G)).toBe(0);
    expect(recordCount()).toBe(0);
    // A tab on this Mac with a session in it: the stamp, and still no record.
    row(store, 'here', F);
    expect(close(store, F)).toBe(1);
    expect(recordCount()).toBe(0);
    // The local folder is still held by its stamp, as it was before this phase.
    expect(held(store, F)).toBe(true);
    // A target and a tab that both spell this Mac as `local`, which the codec
    // keeps: the remote-only clause is the one thing that writes nothing here.
    expect(store.markProjectTabClosed({ path: H, machineId: 'local' }, tab(H, 'local'))).toBe(0);
    expect(recordCount()).toBe(0);
    expect(store.closedRemoteFolder('local', H)).toBeUndefined();
  });

  it('K4 a close whose record would not name the folder it closes writes no folder record', () => {
    const store = open();
    // The target names m1 and the tab names no machine, which reads as this Mac.
    expect(store.markProjectTabClosed({ path: F, machineId: 'm1' }, tab(F))).toBe(0);
    expect(recordCount()).toBe(0);
    // The tab names another folder.
    expect(store.markProjectTabClosed({ path: F, machineId: 'm1' }, tab(G, 'm1'))).toBe(0);
    expect(recordCount()).toBe(0);
    // The tab names another machine.
    expect(store.markProjectTabClosed({ path: F, machineId: 'm1' }, tab(F, 'm2'))).toBe(0);
    expect(recordCount()).toBe(0);
    // The codec drops the tab whole (an empty project id).
    expect(
      store.markProjectTabClosed({ path: F, machineId: 'm1' }, tab(F, 'm1', { projectId: '' }))
    ).toBe(0);
    expect(recordCount()).toBe(0);
    expect(held(store, F, 'm1')).toBe(false);
    expect(held(store, G, 'm1')).toBe(false);
    expect(held(store, F, 'm2')).toBe(false);
  });

  it('K5 the folder record and the stamps are one durable transaction', () => {
    const store = open();
    // (a) A close with no session rows is still exactly one durable commit.
    spyOnPragmas();
    expect(close(store, F, 'm1')).toBe(0);
    expect(durabilityPragmas()).toEqual(DURABLE);
    expect(store.closedRemoteFolder('m1', F)).toBeDefined();
    vi.restoreAllMocks();

    // (b) With the table gone the close throws, and the stamp it would have
    // written beside the record was rolled back with it.
    row(store, 's1', G, 'm1');
    withRaw((raw) => {
      raw.exec('DROP TABLE closed_remote_folders');
    });
    expect(() => close(store, G, 'm1')).toThrow();
    expect(store.getSession('s1')?.projectTombstone).toBeUndefined();
  });

  it('K6 opening the folder again clears the record and the stamps, and the clear is not durable', () => {
    const store = open();
    row(store, 's1', F, 'm1');
    expect(close(store, F, 'm1')).toBe(1);
    expect(store.closedRemoteFolder('m1', F)).toBeDefined();
    spyOnPragmas();
    // The return value counts the session rows, never the record.
    expect(store.clearProjectTabClosed({ path: F, machineId: 'm1' })).toBe(1);
    expect(store.closedRemoteFolder('m1', F)).toBeUndefined();
    expect(store.getSession('s1')?.projectTombstone).toBeUndefined();
    expect(held(store, F, 'm1')).toBe(false);
    // The clear did not raise the drive flush.
    expect(durabilityPragmas()).toEqual([]);
    // A folder held by its record alone: the clear removes it and counts 0.
    expect(close(store, G, 'm1')).toBe(0);
    pragmas = [];
    expect(store.clearProjectTabClosed({ path: G, machineId: 'm1' })).toBe(0);
    expect(store.closedRemoteFolder('m1', G)).toBeUndefined();
    expect(held(store, G, 'm1')).toBe(false);
    expect(recordCount()).toBe(0);
    expect(durabilityPragmas()).toEqual([]);
  });

  it('K7 the same path on two machines is two records', () => {
    const store = open();
    expect(close(store, F, 'm1')).toBe(0);
    expect(held(store, F, 'm1')).toBe(true);
    expect(held(store, F, 'm2')).toBe(false);
    expect(held(store, F)).toBe(false);
    expect(store.closedRemoteFolder('m2', F)).toBeUndefined();
    expect(store.closedRemoteFolder('local', F)).toBeUndefined();
    expect(close(store, F, 'm2')).toBe(0);
    expect(recordCount()).toBe(2);
    // Opening it on one machine clears that machine's record only.
    store.clearProjectTabClosed({ path: F, machineId: 'm2' });
    expect(held(store, F, 'm1')).toBe(true);
    expect(held(store, F, 'm2')).toBe(false);
  });

  it('K8 a planted row that is not in the one shape reads as no record', () => {
    const store = open();
    const plant = (machineId: unknown, path: unknown, name: unknown, at: unknown): void => {
      withRaw((raw) => {
        raw
          .prepare(
            'INSERT INTO closed_remote_folders (machine_id, path, project_name, closed_at) VALUES (?, ?, ?, ?)'
          )
          .run(machineId, path, name, at);
      });
    };
    // An empty name.
    plant('m1', F, '', CLOSED_AT);
    expect(store.closedRemoteFolder('m1', F)).toBeUndefined();
    expect(held(store, F, 'm1')).toBe(false);
    // An instant that is text: an INTEGER column keeps 'abc' as text.
    plant('m1', G, 'beta', 'abc');
    expect(store.closedRemoteFolder('m1', G)).toBeUndefined();
    expect(held(store, G, 'm1')).toBe(false);
    // An instant that is not finite.
    plant('m1', H, 'hotel', Number.POSITIVE_INFINITY);
    expect(store.closedRemoteFolder('m1', H)).toBeUndefined();
    expect(held(store, H, 'm1')).toBe(false);
    // An empty machine id or an empty path names no folder.
    plant('', F, 'alpha', CLOSED_AT);
    plant('m1', '', 'root', CLOSED_AT);
    expect(store.closedRemoteFolder('', F)).toBeUndefined();
    expect(store.closedRemoteFolder('m1', '')).toBeUndefined();
    // A missing instant is refused by the table itself.
    expect(() => {
      plant('m1', '/home/gdc/work/india', 'india', null);
    }).toThrow();
    // A row in the one shape beside them still reads.
    plant('m1', '/home/gdc/work/juliet', 'juliet', CLOSED_AT);
    expect(store.closedRemoteFolder('m1', '/home/gdc/work/juliet')).toEqual({
      machineId: 'm1',
      path: '/home/gdc/work/juliet',
      projectName: 'juliet',
      closedAt: CLOSED_AT
    });
  });

  it('K9 a closed folder holds its exact folder and no folder under it', () => {
    const store = open();
    expect(close(store, F, 'm1')).toBe(0);
    expect(held(store, F, 'm1')).toBe(true);
    expect(held(store, `${F}/sub`, 'm1')).toBe(false);
    expect(held(store, `${F}/`, 'm1')).toBe(false);
    expect(held(store, `${F}-other`, 'm1')).toBe(false);
    expect(store.closedRemoteFolder('m1', `${F}/sub`)).toBeUndefined();
    expect(store.closedRemoteFolder('m1', `${F}/`)).toBeUndefined();
  });

  it('K10 a removed machine keeps its folder records', () => {
    const store = open();
    row(store, 's1', G, 'm1');
    expect(close(store, F, 'm1')).toBe(0);
    // The machine's one row, tombstoned in its one durable transaction.
    expect(
      store.markMachinesForgotten([
        {
          sessionId: 's1',
          tombstone: {
            v: 1,
            machineId: 'm1',
            machineLabel: 'Mac Pro',
            lastStatus: 'running',
            lastSeenAt: 0,
            forgottenAt: 1_700_000_200_000
          }
        }
      ])
    ).toBe(1);
    expect(store.getSession('s1')?.status).toBe('discarded');
    expect(store.closedRemoteFolder('m1', F)).toEqual({
      machineId: 'm1',
      path: F,
      projectName: 'alpha',
      closedAt: CLOSED_AT
    });
    expect(held(store, F, 'm1')).toBe(true);
    // An empty plan opens no transaction and deletes nothing either.
    expect(store.markMachinesForgotten([])).toBe(0);
    expect(store.closedRemoteFolder('m1', F)).toBeDefined();
    expect(held(store, F, 'm1')).toBe(true);
  });

  it('K11 a close made by a build before this one is still held by its stamps', () => {
    const store = open();
    row(store, 's1', F, 'm1');
    // The stamp the build before wrote, with no folder record beside it.
    withRaw((raw) => {
      raw
        .prepare('UPDATE sessions SET project_tombstone = ? WHERE id = ?')
        .run(JSON.stringify(tab(F, 'm1')), 's1');
    });
    expect(recordCount()).toBe(0);
    expect(store.closedRemoteFolder('m1', F)).toBeUndefined();
    expect(held(store, F, 'm1')).toBe(true);
  });
});
