/**
 * Phase 357. The one predicate for a connection that can no longer account
 * for its pages, `isBrokenConnectionError` in ../integrity.ts.
 *
 * It is read by class and by `err.code` and never by message, and its code
 * set is exactly `SQLITE_CORRUPT`, any `SQLITE_CORRUPT_*` and `SQLITE_NOTADB`.
 * The table below is built so that every way of widening or narrowing that
 * rule turns a row red:
 *
 *  - an `SQLITE_IOERR_*` added to the set reds the three IOERR rows (D2:
 *    measured, a vanished volume is a SIGBUS, never an error to latch on);
 *  - the `SQLITE_CORRUPT_` prefix dropped reds the three extended rows;
 *  - a prefix without its underscore reds `SQLITE_CORRUPTX`;
 *  - the message read instead of the code reds the `SQLITE_ERROR` row that
 *    carries SQLite's corrupt sentence, and the corrupt row whose message says
 *    something else;
 *  - the class check dropped reds the plain `Error` and the duck-typed rows,
 *    and the typed refusal the stopped store answers with.
 *
 * Then the same predicate over errors better-sqlite3 13.0.3 REALLY throws,
 * each made in a scratch file this test owns: a damaged table page, a header
 * that is not SQLite's, a duplicate key, a busy lock and a missing file. And
 * the property the module's header states: `looksUnreadable` and this never
 * both answer yes.
 */

import Database from 'better-sqlite3';
import {
  closeSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeFileSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { manifestStoppedError } from '../../manifest/store';
import { isBrokenConnectionError, looksUnreadable } from '../integrity';

const SqliteError = Database.SqliteError;

interface Row {
  name: string;
  value: () => unknown;
  broken: boolean;
}

const TABLE: Row[] = [
  // Measured (SPEC §2.1): every page damage came back as plain SQLITE_CORRUPT,
  // every header damage as SQLITE_NOTADB, with exactly these messages.
  {
    name: 'SQLITE_CORRUPT, the page damage M1 measured',
    value: () => new SqliteError('database disk image is malformed', 'SQLITE_CORRUPT'),
    broken: true
  },
  {
    name: 'SQLITE_NOTADB, the header damage M1 measured',
    value: () => new SqliteError('file is not a database', 'SQLITE_NOTADB'),
    broken: true
  },
  // In better-sqlite3's own code table; the prefix keeps them.
  {
    name: 'SQLITE_CORRUPT_VTAB',
    value: () => new SqliteError('database disk image is malformed', 'SQLITE_CORRUPT_VTAB'),
    broken: true
  },
  {
    name: 'SQLITE_CORRUPT_SEQUENCE',
    value: () => new SqliteError('database disk image is malformed', 'SQLITE_CORRUPT_SEQUENCE'),
    broken: true
  },
  {
    name: 'SQLITE_CORRUPT_INDEX',
    value: () => new SqliteError('database disk image is malformed', 'SQLITE_CORRUPT_INDEX'),
    broken: true
  },
  // The code, never the message: a corrupt code with other words is broken.
  {
    name: 'SQLITE_CORRUPT whose message says something else',
    value: () => new SqliteError('something unrelated', 'SQLITE_CORRUPT'),
    broken: true
  },
  // D2: an I/O error is the OS refusing one call, and today's path recovers.
  {
    name: 'SQLITE_IOERR_READ (D2: out)',
    value: () => new SqliteError('disk I/O error', 'SQLITE_IOERR_READ'),
    broken: false
  },
  {
    name: 'SQLITE_IOERR (D2: out)',
    value: () => new SqliteError('disk I/O error', 'SQLITE_IOERR'),
    broken: false
  },
  {
    name: 'SQLITE_IOERR_SHORT_READ (D2: out)',
    value: () => new SqliteError('disk I/O error', 'SQLITE_IOERR_SHORT_READ'),
    broken: false
  },
  {
    name: 'SQLITE_BUSY',
    value: () => new SqliteError('database is locked', 'SQLITE_BUSY'),
    broken: false
  },
  {
    name: 'SQLITE_LOCKED',
    value: () => new SqliteError('database table is locked', 'SQLITE_LOCKED'),
    broken: false
  },
  {
    name: 'SQLITE_FULL',
    value: () => new SqliteError('database or disk is full', 'SQLITE_FULL'),
    broken: false
  },
  {
    name: 'SQLITE_READONLY',
    value: () => new SqliteError('attempt to write a readonly database', 'SQLITE_READONLY'),
    broken: false
  },
  {
    name: 'SQLITE_CANTOPEN',
    value: () => new SqliteError('unable to open database file', 'SQLITE_CANTOPEN'),
    broken: false
  },
  {
    name: 'SQLITE_CONSTRAINT_PRIMARYKEY',
    value: () => new SqliteError('UNIQUE constraint failed: sessions.id', 'SQLITE_CONSTRAINT_PRIMARYKEY'),
    broken: false
  },
  // Never the message: SQLite's corrupt sentence under another code is not it.
  {
    name: 'SQLITE_ERROR carrying the corrupt sentence',
    value: () => new SqliteError('database disk image is malformed', 'SQLITE_ERROR'),
    broken: false
  },
  {
    name: 'SQLITE_CORRUPTX, the prefix without its underscore',
    value: () => new SqliteError('database disk image is malformed', 'SQLITE_CORRUPTX'),
    broken: false
  },
  {
    name: 'sqlite_corrupt in lower case',
    value: () => new SqliteError('database disk image is malformed', 'sqlite_corrupt'),
    broken: false
  },
  // The class, not the shape: only SQLite saying so counts.
  {
    name: 'a plain Error with code SQLITE_CORRUPT (not the class)',
    value: () => Object.assign(new Error('database disk image is malformed'), { code: 'SQLITE_CORRUPT' }),
    broken: false
  },
  {
    name: 'a plain Error with code SQLITE_NOTADB (not the class)',
    value: () => Object.assign(new Error('file is not a database'), { code: 'SQLITE_NOTADB' }),
    broken: false
  },
  {
    name: 'an object shaped like a SqliteError',
    value: () => ({
      name: 'SqliteError',
      code: 'SQLITE_CORRUPT',
      message: 'database disk image is malformed'
    }),
    broken: false
  },
  {
    name: 'a plain Error saying the corrupt sentence',
    value: () => new Error('database disk image is malformed'),
    broken: false
  },
  {
    name: 'the stopped store’s own typed refusal',
    value: () => manifestStoppedError('listSessions'),
    broken: false
  },
  { name: 'null', value: () => null, broken: false },
  { name: 'undefined', value: () => undefined, broken: false },
  { name: 'the string SQLITE_CORRUPT', value: () => 'SQLITE_CORRUPT', broken: false },
  { name: 'a number', value: () => 11, broken: false }
];

describe('isBrokenConnectionError, by class and code (D1, D2)', () => {
  for (const row of TABLE) {
    it(`${row.broken ? 'is' : 'is not'} broken: ${row.name}`, () => {
      expect(isBrokenConnectionError(row.value())).toBe(row.broken);
    });
  }

  it('never agrees with looksUnreadable on any row of the table', () => {
    for (const row of TABLE) {
      const value = row.value();
      expect(isBrokenConnectionError(value) && looksUnreadable(value)).toBe(false);
    }
  });
});

describe('isBrokenConnectionError over errors better-sqlite3 really throws', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'gmux-p357-broken-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function thrownBy(fn: () => unknown): unknown {
    try {
      fn();
    } catch (err) {
      return err;
    }
    throw new Error('expected the call to throw');
  }

  function readAt(path: string, offset: number, length: number): Buffer {
    const fd = openSync(path, 'r');
    try {
      const buf = Buffer.alloc(length);
      readSync(fd, buf, 0, length, offset);
      return buf;
    } finally {
      closeSync(fd);
    }
  }

  /** Write, then prove the bytes changed before anything is asked to notice. */
  function writeAt(path: string, offset: number, bytes: Buffer): void {
    const before = readAt(path, offset, bytes.length);
    const fd = openSync(path, 'r+');
    try {
      writeSync(fd, bytes, 0, bytes.length, offset);
    } finally {
      closeSync(fd);
    }
    const after = readAt(path, offset, bytes.length);
    expect(after.equals(bytes)).toBe(true);
    expect(before.equals(after)).toBe(false);
  }

  it('a damaged table page: SQLITE_CORRUPT, broken, and not unreadable', () => {
    const path = join(dir, 'damaged.db');
    const db = new Database(path);
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT)');
    const insert = db.prepare('INSERT INTO t (body) VALUES (?)');
    db.transaction(() => {
      for (let i = 0; i < 300; i++) insert.run(`row ${String(i)} ${'x'.repeat(200)}`);
    })();
    const pageSize = db.pragma('page_size', { simple: true }) as number;
    const leaf = db
      .prepare<[], { pageno: number }>(
        "SELECT pageno FROM dbstat WHERE name = 't' AND pagetype = 'leaf' ORDER BY pageno LIMIT 1"
      )
      .get();
    db.close();
    expect(leaf).toBeDefined();
    expect(leaf!.pageno).toBeGreaterThan(1);
    // A table leaf's type byte is 0x0D; zero is no page type at all.
    writeAt(path, (leaf!.pageno - 1) * pageSize, Buffer.from([0x00]));

    const reader = new Database(path, { readonly: true, fileMustExist: true });
    const err = thrownBy(() => reader.prepare('SELECT body FROM t').all());
    reader.close();

    expect(err).toBeInstanceOf(SqliteError);
    expect((err as { code: string }).code).toBe('SQLITE_CORRUPT');
    expect(isBrokenConnectionError(err)).toBe(true);
    expect(looksUnreadable(err)).toBe(false);
  });

  it('a header that is not SQLite’s: SQLITE_NOTADB, broken, and not unreadable', () => {
    const path = join(dir, 'not-a-database.db');
    writeFileSync(
      path,
      Buffer.concat([Buffer.from('Not a database!!', 'latin1'), Buffer.alloc(4096 - 16)])
    );
    let db: Database.Database | null = null;
    const err = thrownBy(() => {
      db = new Database(path, { fileMustExist: true });
      db.prepare('SELECT name FROM sqlite_master').all();
    });
    (db as Database.Database | null)?.close();

    expect(err).toBeInstanceOf(SqliteError);
    expect((err as { code: string }).code).toBe('SQLITE_NOTADB');
    expect(isBrokenConnectionError(err)).toBe(true);
    expect(looksUnreadable(err)).toBe(false);
  });

  it('a duplicate key: a real SqliteError that is not broken', () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE u (id TEXT PRIMARY KEY)');
    db.prepare("INSERT INTO u VALUES ('a')").run();
    const err = thrownBy(() => db.prepare("INSERT INTO u VALUES ('a')").run());
    db.close();

    expect(err).toBeInstanceOf(SqliteError);
    expect((err as { code: string }).code).toMatch(/^SQLITE_CONSTRAINT/);
    expect(isBrokenConnectionError(err)).toBe(false);
  });

  it('a busy lock: a real SQLITE_BUSY that is not broken', () => {
    const path = join(dir, 'busy.db');
    const holder = new Database(path);
    holder.pragma('journal_mode = WAL');
    holder.exec('CREATE TABLE b (x)');
    const other = new Database(path, { timeout: 0 });
    holder.exec('BEGIN IMMEDIATE');
    let err: unknown;
    try {
      err = thrownBy(() => other.exec('BEGIN IMMEDIATE'));
    } finally {
      holder.exec('ROLLBACK');
      other.close();
      holder.close();
    }

    expect(err).toBeInstanceOf(SqliteError);
    expect((err as { code: string }).code).toBe('SQLITE_BUSY');
    expect(isBrokenConnectionError(err)).toBe(false);
  });

  it('a missing file: unreadable, and never broken', () => {
    const err = thrownBy(
      () => new Database(join(dir, 'absent.db'), { readonly: true, fileMustExist: true })
    );

    expect(err).toBeInstanceOf(SqliteError);
    expect((err as { code: string }).code).toBe('SQLITE_CANTOPEN');
    expect(isBrokenConnectionError(err)).toBe(false);
    expect(looksUnreadable(err)).toBe(true);
  });
});
