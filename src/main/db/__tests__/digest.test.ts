/**
 * Per-table content digests (Phase 19 item 10).
 *
 * The headline test is `an UPDATE that changes no row count changes the
 * digest`, because that is the defect this module replaced. The rename
 * migration verified a copied database by comparing per-table row counts, and
 * research 34 §3.2 measured a copy of the operator's real manifest that had
 * identical counts in every table, passed an integrity check, and was stale on
 * all 40 rows. The stale-copy test below reproduces that exact shape with a
 * real WAL rather than by simulating it.
 *
 * Phase 357.1 adds the last block: a broken connection's error is thrown on
 * rather than folded into a table's text, and every other error keeps its
 * text. The errors there are raised by SQLite's own step inside the digest's
 * read (a function the table's generated column calls), and once by a page of
 * a real file written over.
 */

import Database from 'better-sqlite3';
import {
  closeSync,
  copyFileSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  databaseFingerprint,
  digestDifferences,
  tableDigests,
  userTableNames
} from '../digest';
import { isBrokenConnectionError } from '../integrity';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-digest-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A manifest-shaped database: a text primary key, an index, and 200 rows. */
function build(name: string, rows = 200): { path: string; db: Database.Database } {
  const path = join(dir, name);
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(
    `CREATE TABLE sessions (
       id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT, last_seen INTEGER
     );
     CREATE INDEX idx_sessions_name ON sessions(name);
     CREATE TABLE projects (path TEXT, opened_at INTEGER);`
  );
  const insert = db.prepare('INSERT INTO sessions VALUES (?,?,?,?)');
  const project = db.prepare('INSERT INTO projects VALUES (?,?)');
  db.transaction(() => {
    for (let i = 0; i < rows; i++) {
      insert.run(`s${i}`, `session ${i}`, 'running', 1_700_000_000 + i);
      project.run(`/Users/g/p${i % 7}`, 1_700_000_000 + i);
    }
  })();
  return { path, db };
}

function counts(db: Database.Database): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { name } of db
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    .all()) {
    out[name] = (
      db.prepare<[], { c: number }>(`SELECT COUNT(*) AS c FROM "${name}"`).get() ?? {
        c: -1
      }
    ).c;
  }
  return out;
}

describe('what a digest can see that a row count cannot', () => {
  it('an UPDATE that changes no row count changes the digest', () => {
    const { db } = build('a.db');
    const before = tableDigests(db);
    const beforeCounts = counts(db);

    db.prepare("UPDATE sessions SET last_seen = 99 WHERE id = 's7'").run();

    const after = tableDigests(db);
    expect(counts(db)).toEqual(beforeCounts);
    expect(after.sessions).not.toBe(before.sessions);
    // Only the table that changed changes.
    expect(after.projects).toBe(before.projects);
    expect(digestDifferences(before, after)).toEqual(['sessions: contents differ']);
    db.close();
  });

  it('a copy taken WITHOUT the write ahead log matches on counts and differs on content', () => {
    // This is the measured shape from research 34 §3.2, reproduced rather than
    // simulated. Every UPDATE below lives only in the `-wal`, so copying the
    // `.db` alone produces a database that is valid, complete and stale.
    const { path, db } = build('live.db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.transaction(() => {
      for (let i = 0; i < 200; i++) {
        db.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?').run(
          9_000_000 + i,
          `s${i}`
        );
      }
    })();

    const stalePath = join(dir, 'stale.db');
    copyFileSync(path, stalePath);
    const stale = new Database(stalePath, { readonly: true, fileMustExist: true });

    expect(counts(stale)).toEqual(counts(db));
    expect(tableDigests(stale).sessions).not.toBe(tableDigests(db).sessions);
    stale.close();
    db.close();
  });

  it('names the table that disagrees, and which side is missing it', () => {
    const a = { sessions: 'aaa', projects: 'bbb' };
    expect(digestDifferences(a, { sessions: 'zzz', projects: 'bbb' })).toEqual([
      'sessions: contents differ'
    ]);
    expect(digestDifferences(a, { sessions: 'aaa' })).toEqual([
      'projects: missing from the copy'
    ]);
    expect(digestDifferences({ sessions: 'aaa' }, a)).toEqual([
      'projects: only in the copy'
    ]);
    expect(digestDifferences(a, { ...a })).toEqual([]);
  });
});

describe('what a digest must NOT see', () => {
  it('a VACUUM INTO snapshot of a healthy database compares equal', () => {
    // `projects` has no INTEGER PRIMARY KEY, so VACUUM renumbers its rowids.
    // Ordering by every column rather than by rowid is what makes this pass.
    const { db } = build('src.db');
    const snapshot = join(dir, 'snap.db');
    db.exec(`VACUUM INTO '${snapshot}'`);
    const copy = new Database(snapshot, { readonly: true, fileMustExist: true });
    expect(tableDigests(copy)).toEqual(tableDigests(db));
    copy.close();
    db.close();
  });

  it('does not depend on the order rows were inserted in', () => {
    const forwards = new Database(join(dir, 'f.db'));
    const backwards = new Database(join(dir, 'b.db'));
    for (const db of [forwards, backwards]) {
      db.exec('CREATE TABLE t (a TEXT, b INTEGER)');
    }
    for (let i = 0; i < 50; i++) {
      forwards.prepare('INSERT INTO t VALUES (?,?)').run(`k${i}`, i);
    }
    for (let i = 49; i >= 0; i--) {
      backwards.prepare('INSERT INTO t VALUES (?,?)').run(`k${i}`, i);
    }
    expect(tableDigests(backwards)).toEqual(tableDigests(forwards));
    forwards.close();
    backwards.close();
  });
});

describe('the encoding', () => {
  it('separates a text "1" from an integer 1', () => {
    const text = new Database(join(dir, 't.db'));
    const int = new Database(join(dir, 'i.db'));
    text.exec("CREATE TABLE t (v); INSERT INTO t VALUES ('1')");
    int.exec('CREATE TABLE t (v); INSERT INTO t VALUES (1)');
    expect(tableDigests(int).t).not.toBe(tableDigests(text).t);
    text.close();
    int.close();
  });

  it('separates two rows that would run together if concatenated', () => {
    const a = new Database(join(dir, 'a.db'));
    const b = new Database(join(dir, 'b.db'));
    a.exec("CREATE TABLE t (x TEXT, y TEXT); INSERT INTO t VALUES ('ab','c')");
    b.exec("CREATE TABLE t (x TEXT, y TEXT); INSERT INTO t VALUES ('a','bc')");
    expect(tableDigests(a).t).not.toBe(tableDigests(b).t);
    a.close();
    b.close();
  });

  it('sees a dropped column even when the table is empty', () => {
    const wide = new Database(join(dir, 'w.db'));
    const narrow = new Database(join(dir, 'n.db'));
    wide.exec('CREATE TABLE t (a TEXT, b TEXT)');
    narrow.exec('CREATE TABLE t (a TEXT)');
    expect(tableDigests(wide).t).not.toBe(tableDigests(narrow).t);
    wide.close();
    narrow.close();
  });

  it('holds a blob apart from the text of its bytes', () => {
    const blob = new Database(join(dir, 'bl.db'));
    const text = new Database(join(dir, 'tx.db'));
    blob.exec('CREATE TABLE t (v)');
    blob.prepare('INSERT INTO t VALUES (?)').run(Buffer.from('hi', 'utf8'));
    text.exec("CREATE TABLE t (v); INSERT INTO t VALUES ('hi')");
    expect(tableDigests(blob).t).not.toBe(tableDigests(text).t);
    blob.close();
    text.close();
  });

  it('reports a table it cannot read rather than skipping it', () => {
    // A table the schema lists and no query can read. The digest has to say
    // so, because a table silently omitted from both sides would make two
    // different databases compare equal.
    const db = new Database(join(dir, 'ghost.db'));
    db.exec("CREATE TABLE real_one (a TEXT); INSERT INTO real_one VALUES ('x')");
    db.function('vanishing', { deterministic: true }, (v: unknown) => String(v));
    db.exec(
      'CREATE TABLE ghost (a TEXT, b TEXT GENERATED ALWAYS AS (vanishing(a)) VIRTUAL)'
    );
    db.close();

    // A second connection has never heard of `vanishing`, so every read of
    // `ghost` fails while the schema still lists it. That is SQLITE_ERROR, not
    // a broken connection, so Phase 357.1 keeps it as text.
    const again = new Database(join(dir, 'ghost.db'), { readonly: true });
    const digests = tableDigests(again);
    expect(Object.keys(digests).sort()).toEqual(['ghost', 'real_one']);
    expect(digests.ghost).toMatch(/^unreadable: /);
    again.close();
  });
});

// ---------------------------------------------------------------------------
// Phase 357.1: a broken connection is not a table it cannot read
// ---------------------------------------------------------------------------

/**
 * One plain table, and one whose every read calls a function this connection
 * registered, made to throw exactly the error under test. SQLite raises it
 * from its own step inside the digest's read, and better-sqlite3 hands the
 * very object on (measured, every shape below).
 */
function probed(name: string): { db: Database.Database; failWith: (err: unknown) => void } {
  const db = new Database(join(dir, name));
  let failure: unknown = null;
  db.function('p3571_probe', { deterministic: true }, (v: unknown) => {
    if (failure !== null) throw failure;
    return String(v);
  });
  db.exec(
    "CREATE TABLE plain (a TEXT); INSERT INTO plain VALUES ('x');" +
      'CREATE TABLE probed (a TEXT, b TEXT GENERATED ALWAYS AS (p3571_probe(a)) VIRTUAL);' +
      "INSERT INTO probed (a) VALUES ('y');"
  );
  return {
    db,
    failWith: (err) => {
      failure = err;
    }
  };
}

function caughtFrom(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw');
}

/** Write over a file, then prove the bytes changed (the house rule). */
function writeOver(path: string, offset: number, bytes: Buffer): void {
  const read = (): Buffer => {
    const fd = openSync(path, 'r');
    try {
      const buf = Buffer.alloc(bytes.length);
      readSync(fd, buf, 0, bytes.length, offset);
      return buf;
    } finally {
      closeSync(fd);
    }
  };
  const before = read();
  const fd = openSync(path, 'r+');
  try {
    writeSync(fd, bytes, 0, bytes.length, offset);
  } finally {
    closeSync(fd);
  }
  expect(read().equals(bytes)).toBe(true);
  expect(before.equals(bytes)).toBe(false);
}

/** The errors that say the connection is broken (../integrity.ts). */
const BROKEN = [
  ['SQLITE_CORRUPT', 'database disk image is malformed'],
  ['SQLITE_CORRUPT_INDEX', 'database disk image is malformed'],
  ['SQLITE_NOTADB', 'file is not a database']
] as const;

/** Errors that do not, each one way of widening the rule turned red. */
const NOT_BROKEN: readonly { name: string; make: () => Error }[] = [
  {
    name: 'SQLITE_IOERR_READ, which Phase 357 left out on purpose',
    make: () => new Database.SqliteError('disk I/O error', 'SQLITE_IOERR_READ')
  },
  {
    name: 'SQLITE_FULL',
    make: () => new Database.SqliteError('database or disk is full', 'SQLITE_FULL')
  },
  {
    name: 'a plain Error that names SQLITE_CORRUPT in SQLite’s own words',
    make: () =>
      Object.assign(new Error('database disk image is malformed'), { code: 'SQLITE_CORRUPT' })
  },
  { name: 'a TypeError', make: () => new TypeError('not a question about pages') }
];

describe('a broken connection is not a table it cannot read (Phase 357.1)', () => {
  for (const [code, message] of BROKEN) {
    it(`${code} comes out of the digest and the fingerprint as the same object`, () => {
      const { db, failWith } = probed(`broken-${code}.db`);
      expect(tableDigests(db).probed).toMatch(/^[0-9a-f]{64}$/);
      const thrown = new Database.SqliteError(message, code);
      expect(isBrokenConnectionError(thrown)).toBe(true);
      failWith(thrown);
      expect(caughtFrom(() => tableDigests(db))).toBe(thrown);
      expect(caughtFrom(() => databaseFingerprint(db))).toBe(thrown);
      db.close();
    });
  }

  NOT_BROKEN.forEach((row, i) => {
    it(`${row.name} is still the table’s text, exactly as before`, () => {
      const { db, failWith } = probed(`text-${String(i)}.db`);
      const healthy = tableDigests(db);
      const before = databaseFingerprint(db);
      const thrown = row.make();
      expect(isBrokenConnectionError(thrown)).toBe(false);
      failWith(thrown);
      expect(tableDigests(db)).toEqual({
        plain: healthy.plain,
        probed: `unreadable: ${thrown.message}`
      });
      const fingerprint = databaseFingerprint(db);
      expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(fingerprint).not.toBe(before);
      // Two databases that fail the same way still compare equal.
      expect(databaseFingerprint(db)).toBe(fingerprint);
      db.close();
    });
  });

  it('a page of a real file written over: SQLite’s own SQLITE_CORRUPT comes out where the digest used to answer text', () => {
    const { path, db } = build('damaged.db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    const pageSize = db.pragma('page_size', { simple: true }) as number;
    const leaves = db
      .prepare<[], { pageno: number }>(
        "SELECT pageno FROM dbstat WHERE name = 'projects' AND pagetype = 'leaf' ORDER BY pageno"
      )
      .all();
    db.close();
    expect(leaves.length).toBeGreaterThan(0);
    expect(leaves[0]!.pageno).toBeGreaterThan(1);
    // A b-tree page type SQLite does not know.
    writeOver(path, (leaves[0]!.pageno - 1) * pageSize, Buffer.from([0xff]));

    const fresh = new Database(path, { readonly: true, fileMustExist: true });
    // The schema still reads, so what throws is the table's read.
    expect(userTableNames(fresh)).toEqual(['projects', 'sessions']);
    const err = caughtFrom(() => tableDigests(fresh));
    expect(err).toBeInstanceOf(Database.SqliteError);
    expect((err as { code?: unknown }).code).toBe('SQLITE_CORRUPT');
    expect(isBrokenConnectionError(err)).toBe(true);
    expect(caughtFrom(() => databaseFingerprint(fresh))).toBeInstanceOf(Database.SqliteError);
    fresh.close();
  });
});
