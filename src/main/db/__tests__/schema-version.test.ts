/**
 * The three numbers, and the refusal that reads them (Phase 21, research 27
 * §4).
 *
 * Every case here is a real SQLite file on disk. The thing being tested is
 * what one build does when it meets a file another build wrote, so a mock of
 * the database would be testing the mock.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import {
  DatabaseTooNewError,
  META_MIN_COMPATIBLE,
  WrongDatabaseError,
  assertDatabaseUsable,
  assertDatabaseUsableAt,
  describeSchemaState,
  isSchemaRefusal,
  readSchemaState,
  readSchemaStateAt,
  stampSchemaVersion,
  type SchemaIdentity
} from '../schema-version';
import { runMigrations } from '../sqlite';

let dir: string;
let dbPath: string;

const BUILD: SchemaIdentity = {
  label: 'session list',
  applicationId: 0x54525445,
  version: 8,
  minCompatible: 8
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-schema-version-'));
  dbPath = join(dir, 'manifest.db');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function open(): Database.Database {
  return new Database(dbPath);
}

function stampAs(identity: SchemaIdentity, openedBy = '0.0.1'): void {
  const db = open();
  try {
    stampSchemaVersion(db, identity, openedBy);
  } finally {
    db.close();
  }
}

describe('stamping the three numbers', () => {
  it('writes application_id, user_version and the meta rows', () => {
    stampAs(BUILD, '0.1.0');
    const state = readSchemaStateAt(dbPath);
    expect(state).toEqual({
      applicationId: BUILD.applicationId,
      userVersion: 8,
      minCompatible: 8,
      lastOpenedBy: '0.1.0'
    });
  });

  it('is idempotent, and a second stamp writes nothing at all', () => {
    stampAs(BUILD);
    const db = open();
    try {
      // The proof that nothing was written is SQLite's own change counter. A
      // stamp that rewrote the same values would move it, and the backup ring
      // would then take a copy of the manifest on every single launch.
      const before = db.prepare('SELECT total_changes() AS n').get() as {
        n: number;
      };
      stampSchemaVersion(db, BUILD, '0.0.1');
      const after = db.prepare('SELECT total_changes() AS n').get() as {
        n: number;
      };
      expect(after.n).toBe(before.n);
    } finally {
      db.close();
    }
  });

  it('records the new app version when the build changes', () => {
    stampAs(BUILD, '0.0.1');
    stampAs(BUILD, '0.2.0');
    expect(readSchemaStateAt(dbPath)?.lastOpenedBy).toBe('0.2.0');
  });
});

describe('reading a file that has never been stamped', () => {
  it('reports zeros and nulls rather than throwing', () => {
    const db = open();
    try {
      db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY);');
      expect(readSchemaState(db)).toEqual({
        applicationId: 0,
        userVersion: 0,
        minCompatible: null,
        lastOpenedBy: null
      });
    } finally {
      db.close();
    }
  });

  it('accepts it, because every manifest written before Phase 21 is one', () => {
    const db = open();
    try {
      db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY);');
    } finally {
      db.close();
    }
    expect(() => {
      assertDatabaseUsableAt(dbPath, BUILD);
    }).not.toThrow();
  });

  it('says nothing about a file that is not there', () => {
    expect(readSchemaStateAt(join(dir, 'absent.db'))).toBeNull();
    expect(() => {
      assertDatabaseUsableAt(join(dir, 'absent.db'), BUILD);
    }).not.toThrow();
  });
});

describe('the refusal', () => {
  it('refuses a file whose minimum is above this build', () => {
    // What a future Tortie leaves behind after a breaking migration.
    stampAs({ ...BUILD, version: 9, minCompatible: 9 });

    let thrown: unknown;
    try {
      assertDatabaseUsableAt(dbPath, BUILD);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(DatabaseTooNewError);
    const err = thrown as DatabaseTooNewError;
    expect(err.fileMinCompatible).toBe(9);
    expect(err.buildVersion).toBe(8);
    expect(isSchemaRefusal(err)).toBe(true);
  });

  it('says the sessions are safe, because they are', () => {
    stampAs({ ...BUILD, version: 9, minCompatible: 9 });
    let message = '';
    try {
      assertDatabaseUsableAt(dbPath, BUILD);
    } catch (err) {
      message = (err as Error).message;
    }
    // The copy is the product decision, not a detail. A refusal costs the user
    // visibility and not work, because the agents are running in tmux, and the
    // sentence has to say so or the user reads it as data loss.
    expect(message).toContain('older than your session list');
    expect(message).toContain('still running');
    expect(message).toContain('Nothing was changed');
  });

  it('accepts a NEWER file whose minimum this build still satisfies', () => {
    // This is the additive case, and accepting it is the whole reason there
    // are two numbers rather than one.
    stampAs({ ...BUILD, version: 9, minCompatible: 8 });
    expect(() => {
      assertDatabaseUsableAt(dbPath, BUILD);
    }).not.toThrow();
  });

  it('refuses a file that belongs to a different application', () => {
    stampAs({ ...BUILD, applicationId: 0x41424344 });
    expect(() => {
      assertDatabaseUsableAt(dbPath, BUILD);
    }).toThrow(WrongDatabaseError);
  });

  it('does not refuse on evidence it never read', () => {
    // A file nothing could be read from proves nothing, and refusing on it
    // would report a permission problem as a version problem.
    expect(() => {
      assertDatabaseUsable(dbPath, null, BUILD);
    }).not.toThrow();
  });

  it('leaves the file exactly as it was', () => {
    stampAs({ ...BUILD, version: 9, minCompatible: 9 });
    const before = readSchemaStateAt(dbPath);
    try {
      assertDatabaseUsableAt(dbPath, BUILD);
    } catch {
      /* expected */
    }
    expect(readSchemaStateAt(dbPath)).toEqual(before);
  });
});

describe('a minimum that is not a number', () => {
  it('is read as unset rather than as zero', () => {
    stampAs(BUILD);
    const db = open();
    try {
      db.prepare<[string, string]>(
        'UPDATE meta SET value = ? WHERE key = ?'
      ).run('soon', META_MIN_COMPATIBLE);
    } finally {
      db.close();
    }
    expect(readSchemaStateAt(dbPath)?.minCompatible).toBeNull();
    expect(() => {
      assertDatabaseUsableAt(dbPath, BUILD);
    }).not.toThrow();
  });
});

describe('the support line', () => {
  it('names the schema, the minimum and the build that last opened it', () => {
    stampAs(BUILD, '0.3.1');
    expect(describeSchemaState('session list', readSchemaStateAt(dbPath))).toBe(
      'session list schema 8 (min compatible 8), last opened by 0.3.1'
    );
  });

  it('says so when there is nothing to read', () => {
    expect(describeSchemaState('session list', null)).toBe(
      'session list: not readable'
    );
  });
});

// ---------------------------------------------------------------------------
// The stamp and the migration are one commit (Phase 21 fix round)
// ---------------------------------------------------------------------------

describe('the compatibility statement is written with the migration', () => {
  it('rolls back with the step it was sealed into', () => {
    // A verifier named the window: `runMigrations` and the stamp used to be
    // two transactions, so a crash between them left a file carrying the new
    // columns and nothing to say an older build may not write them. Killing
    // a process at that instant is not reproducible in a unit test. Failing
    // the transaction the stamp now lives in is, and it proves the same
    // property: the columns and the statement about them commit together or
    // not at all.
    const db = open();
    try {
      expect(() =>
        runMigrations(
          db,
          [
            { name: 'one', up: (d) => d.exec('CREATE TABLE t (a TEXT)') },
            {
              name: 'two',
              up: (d) => d.exec('ALTER TABLE t ADD COLUMN b TEXT')
            }
          ],
          (d) => {
            stampSchemaVersion(d, BUILD, '0.0.1');
            throw new Error('the power went out');
          }
        )
      ).toThrow('the power went out');

      // The last step and its stamp are both gone. The first step stands,
      // because it was its own transaction, which is the existing guarantee.
      const state = readSchemaState(db);
      expect(state.userVersion).toBe(0);
      expect(state.minCompatible).toBeNull();
      const columns = (db.pragma('table_info(t)') as { name: string }[]).map(
        (c) => c.name
      );
      expect(columns).toEqual(['a']);
      const applied = db
        .prepare<[], { name: string }>('SELECT name FROM migrations')
        .all()
        .map((r) => r.name);
      expect(applied).toEqual(['one']);
    } finally {
      db.close();
    }
  });

  it('says when it had nothing to seal, so the caller stamps it alone', () => {
    const db = open();
    try {
      const migrations = [{ name: 'one', up: (d: Database.Database) => d.exec('CREATE TABLE t (a TEXT)') }];
      expect(runMigrations(db, migrations, () => undefined)).toBe(true);
      // Second time there is nothing pending, so there is no transaction to
      // put the stamp in and the store writes it itself.
      expect(runMigrations(db, migrations, () => undefined)).toBe(false);
    } finally {
      db.close();
    }
  });
});
