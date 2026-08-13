/**
 * The integrity gate, the quarantine and the rebuild (Phase 19 item 5).
 *
 * ## Corruption is injected at a located structure, and the injection is
 * ## asserted before the detector is
 *
 * Research 34 §3.2 recorded a draft claim that could not be reproduced, and
 * gave the reason: 360 bytes written at a blind offset landed in a region the
 * checker does not walk, so the file opened and both checks returned ok. Its
 * instruction for this phase was to inject at a located structure and to prove
 * the injection took effect first, because a fault test that silently fails to
 * inject is worse than no test.
 *
 * So `smashIndexRootPage` below reads the root page number out of
 * `sqlite_master`, writes over the first eight bytes of that page's cell
 * pointer array, and every test that uses it asserts the file's bytes changed.
 *
 * That injection also settles the open question. It makes `integrity_check`
 * THROW `database disk image is malformed` rather than return a non-ok row,
 * while `quick_check` on the same file returns rows and does not throw. Both
 * shapes are covered, which is what research 34 asked for.
 */

import Database from 'better-sqlite3';
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  truncateSync,
  writeFileSync,
  writeSync
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkDatabaseIntegrity,
  isUnreadable,
  looksUnreadable,
  quarantineDatabase
} from '../integrity';

/** Byte-for-byte proof that a file was not touched. */
function sha256Of(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
import { SYSTEM_SQLITE3, recoverDatabase } from '../recover';
import { openGmuxDatabase, type IntegrityGateReport } from '../sqlite';

const PAGE_SIZE = 4096;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-integrity-'));
});

afterEach(() => {
  // A test that made a directory unwritable has to hand it back before rm.
  try {
    chmodSync(dir, 0o700);
  } catch {
    /* the directory may already be gone */
  }
  rmSync(dir, { recursive: true, force: true });
});

/** A manifest-shaped database with an index and enough rows to span pages. */
function build(name = 'manifest.db', rows = 500): string {
  const path = join(dir, name);
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(
    `CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL, cwd TEXT);
     CREATE INDEX idx_sessions_name ON sessions(name);`
  );
  const insert = db.prepare('INSERT INTO sessions VALUES (?,?,?)');
  db.transaction(() => {
    for (let i = 0; i < rows; i++) {
      insert.run(`s${i}`, `session ${String(i).padStart(4, '0')}`, `/Users/g/${i}`);
    }
  })();
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  return path;
}

/**
 * Write over the first eight bytes of the cell pointer array on the root page
 * of `indexName`, and prove the file changed. Byte 8 of a page is where the
 * cell pointer array starts on a leaf page.
 */
function smashIndexRootPage(path: string, indexName = 'idx_sessions_name'): void {
  const before = readFileSync(path);
  const ro = new Database(path, { readonly: true, fileMustExist: true });
  const root = ro
    .prepare<[string], { rootpage: number }>(
      'SELECT rootpage FROM sqlite_master WHERE name = ?'
    )
    .get(indexName);
  ro.close();
  if (!root) throw new Error(`no index named ${indexName}`);

  const fd = openSync(path, 'r+');
  writeSync(
    fd,
    Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    0,
    8,
    (root.rootpage - 1) * PAGE_SIZE + 8
  );
  closeSync(fd);

  // The instruction from research 34, made executable: assert the injection
  // took effect before asserting that anything detected it.
  expect(readFileSync(path).equals(before)).toBe(false);
}

function quarantinedFiles(): string[] {
  return readdirSync(dir)
    .filter((n) => n.includes('.damaged-'))
    .sort();
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

describe('checkDatabaseIntegrity', () => {
  it('passes a healthy database', () => {
    expect(checkDatabaseIntegrity(build())).toEqual({
      ok: true,
      detail: 'ok',
      check: 'integrity_check'
    });
  });

  it('catches a located injection, and reports that the check THREW', () => {
    const path = build();
    smashIndexRootPage(path);
    const verdict = checkDatabaseIntegrity(path);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.threw).toBe(true);
    expect(verdict.detail).toContain('malformed');
  });

  it('catches a file that is not a database at all', () => {
    const path = join(dir, 'manifest.db');
    writeFileSync(path, 'this is not a database, it is a text file\n');
    const verdict = checkDatabaseIntegrity(path);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.threw).toBe(true);
  });

  it('drops to the cheap check once the file is large enough for the strong one to hurt', () => {
    // Measured: on a 60 MB index `integrity_check` costs 873 ms and
    // `quick_check` costs 43 ms. The manifest is 68 KB at 41 sessions and
    // never reaches this line. The symbol index, which shares this opener,
    // can. The file is grown sparsely, so the test costs no disk and no time.
    const path = build('big.db', 20);
    truncateSync(path, 51 * 1024 * 1024);
    expect(statSync(path).size).toBeGreaterThan(50 * 1024 * 1024);

    const verdict = checkDatabaseIntegrity(path);
    expect(verdict.check).toBe('quick_check');
    expect(verdict.ok).toBe(true);
  });

  it('leaves the database and its write ahead log byte identical', () => {
    // The invariant behind `{ readonly: true }`: the last WRITE connection to
    // close checkpoints and truncates the WAL, so a helper that opens
    // read-write "just to check" becomes a mutator of the live database.
    const path = build();
    const live = new Database(path);
    live.prepare("UPDATE sessions SET cwd = '/moved' WHERE id = 's1'").run();

    const dbBefore = readFileSync(path);
    const walBefore = readFileSync(`${path}-wal`);
    expect(walBefore.length).toBeGreaterThan(0);

    expect(checkDatabaseIntegrity(path).ok).toBe(true);

    expect(readFileSync(path).equals(dbBefore)).toBe(true);
    expect(readFileSync(`${path}-wal`).equals(walBefore)).toBe(true);
    live.close();
  });
});

// ---------------------------------------------------------------------------
// The quarantine
// ---------------------------------------------------------------------------

describe('quarantineDatabase', () => {
  it('moves the database and every sidecar, keeping the stems in step', () => {
    const path = build();
    const live = new Database(path);
    live.prepare("UPDATE sessions SET cwd = '/moved' WHERE id = 's1'").run();
    live.close();
    // A WAL survives the close here only if something else holds the file, so
    // write the sidecars directly. The point under test is the renaming.
    writeFileSync(`${path}-wal`, 'wal bytes');
    writeFileSync(`${path}-shm`, 'shm bytes');

    const out = quarantineDatabase(path, () => new Date('2026-08-12T19:30:00Z'));

    expect(existsSync(path)).toBe(false);
    expect(out.path).toBe(join(dir, 'manifest.db.damaged-20260812T193000Z'));
    expect(out.moved).toHaveLength(3);
    expect(readFileSync(`${out.path}-wal`, 'utf8')).toBe('wal bytes');
    expect(readFileSync(`${out.path}-shm`, 'utf8')).toBe('shm bytes');
  });

  it('does not end in .db, so no later pass mistakes the wreck for a database', () => {
    const out = quarantineDatabase(build());
    expect(out.path.endsWith('.db')).toBe(false);
    expect(out.path).toContain('manifest.db.damaged-');
  });

  it('never writes over an earlier quarantine', () => {
    const at = (): Date => new Date('2026-08-12T19:30:00Z');
    const first = quarantineDatabase(build(), at);
    const second = quarantineDatabase(build(), at);
    expect(second.path).not.toBe(first.path);
    expect(existsSync(first.path)).toBe(true);
    expect(existsSync(second.path)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The rebuild
// ---------------------------------------------------------------------------

describe('recoverDatabase', () => {
  it('rebuilds every row from a database whose index root page was smashed', () => {
    const path = build();
    smashIndexRootPage(path);
    const wreck = quarantineDatabase(path).path;

    const out = recoverDatabase({ damagedPath: wreck, intoPath: path });

    expect(out.ok).toBe(true);
    expect(out.rows.sessions).toBe(500);
    expect(out.sqlBytes).toBeGreaterThan(0);
    expect(checkDatabaseIntegrity(path)).toEqual({
      ok: true,
      detail: 'ok',
      check: 'integrity_check'
    });
    // The wreck is still there. Nothing on this path deletes.
    expect(existsSync(wreck)).toBe(true);
  });

  it('keeps lost_and_found when it holds rows, because those rows are the user\'s', () => {
    const path = build();
    smashIndexRootPage(path);
    const wreck = quarantineDatabase(path).path;
    const out = recoverDatabase({ damagedPath: wreck, intoPath: path });
    expect(Object.keys(out.rows).sort()).toEqual(['lost_and_found', 'sessions']);
    expect(out.rows.lost_and_found).toBeGreaterThan(0);
  });

  it('counts unplaced rows apart from the total, and says so in the sentence', () => {
    // A recovery report is read as a promise about what came back. Until Phase
    // 20 the rows `.recover` could not attribute to any table were added to the
    // total, so a rebuild that placed 500 of 540 rows said "rebuilt 540 rows"
    // and nothing in the log could tell a person otherwise.
    const path = build();
    smashIndexRootPage(path);
    const wreck = quarantineDatabase(path).path;
    const out = recoverDatabase({ damagedPath: wreck, intoPath: path });

    expect(out.ok).toBe(true);
    expect(out.unplacedRows).toBe(out.rows.lost_and_found);
    expect(out.unplacedRows).toBeGreaterThan(0);
    // The total names only the rows that landed in a table the app knows.
    expect(out.detail).toContain('rebuilt 500 rows across 1 tables');
    expect(out.detail).toContain('could not be placed');
  });

  it('says nothing about unplaced rows when there are none', () => {
    const path = build('clean-report.db', 20);
    const wreck = quarantineDatabase(path).path;
    const out = recoverDatabase({ damagedPath: wreck, intoPath: path });
    expect(out.unplacedRows).toBe(0);
    expect(out.detail).toBe('rebuilt 20 rows across 1 tables');
  });

  it('drops lost_and_found when it is empty, so it is not noise in every later check', () => {
    // A healthy source recovers cleanly, which is when the tool's holding
    // table has nothing in it.
    const path = build('healthy.db', 20);
    const wreck = quarantineDatabase(path).path;
    const out = recoverDatabase({ damagedPath: wreck, intoPath: path });
    expect(out.ok).toBe(true);
    expect(Object.keys(out.rows)).toEqual(['sessions']);
    expect(out.rows.sessions).toBe(20);
  });

  /**
   * The defect that made a manifest permanently unopenable, reproduced.
   *
   * `.recover` rebuilds from the FINAL schema, so the rebuilt file already has
   * every column while its `migrations` table can come back holding one row.
   * `integrity_check` calls that perfect. The app's own migration runner then
   * decides an early step has not run, its `ALTER TABLE` throws `duplicate
   * column name`, and the published file fails on every launch after that.
   */
  it('refuses to publish a rebuild the caller cannot open', () => {
    const path = build('gated.db', 20);
    smashIndexRootPage(path);
    const wreck = quarantineDatabase(path).path;
    const out = recoverDatabase({
      damagedPath: wreck,
      intoPath: path,
      verifyOpenable: () => {
        throw new Error('duplicate column name: exit_code');
      }
    });
    expect(out.ok).toBe(false);
    expect(out.detail).toContain('duplicate column name: exit_code');
    // Nothing was published, so the next launch starts empty rather than
    // failing forever on a file it cannot open.
    expect(existsSync(path)).toBe(false);
    expect(existsSync(wreck)).toBe(true);
  });

  it('publishes when the caller CAN open it, and hands it the staging file', () => {
    const path = build('gated2.db', 20);
    smashIndexRootPage(path);
    const wreck = quarantineDatabase(path).path;
    const seen: string[] = [];
    const out = recoverDatabase({
      damagedPath: wreck,
      intoPath: path,
      verifyOpenable: (p) => {
        seen.push(p);
      }
    });
    expect(out.ok).toBe(true);
    expect(seen).toEqual([`${path}.recovering`]);
    expect(existsSync(path)).toBe(true);
  });

  it('never opens the quarantined file, so no sidecar appears beside it', () => {
    const path = build('untouched.db', 20);
    smashIndexRootPage(path);
    const wreck = quarantineDatabase(path).path;
    const before = sha256Of(wreck);
    // Whatever sidecars the quarantine carried across are the baseline. The
    // claim is that recovery adds none and changes none.
    const sidecarsBefore = readdirSync(dir)
      .filter((f) => f.startsWith(`${basename(wreck)}-`))
      .sort();
    const out = recoverDatabase({ damagedPath: wreck, intoPath: path });
    expect(out.ok).toBe(true);
    expect(sha256Of(wreck)).toBe(before);
    expect(
      readdirSync(dir)
        .filter((f) => f.startsWith(`${basename(wreck)}-`))
        .sort()
    ).toEqual(sidecarsBefore);
    // The working copy is swept as well.
    expect(existsSync(`${path}.wreck-copy`)).toBe(false);
    expect(readdirSync(dir).filter((f) => f.includes('wreck-copy'))).toEqual([]);
  });

  it('says so, and leaves nothing behind, when the tool is not on the machine', () => {
    const path = build();
    const wreck = quarantineDatabase(path).path;
    const out = recoverDatabase({
      damagedPath: wreck,
      intoPath: path,
      sqlite3Path: join(dir, 'no-such-sqlite3')
    });
    expect(out.ok).toBe(false);
    expect(out.detail).toContain('no rebuild tool');
    expect(existsSync(`${path}.recovering`)).toBe(false);
    expect(existsSync(path)).toBe(false);
  });

  it('publishes nothing when there was nothing to recover', () => {
    // 8 KB of one repeated byte is not a database. `.recover` prints its
    // preamble and no table, and an empty file published here would be a
    // recovery claimed rather than made.
    const notADatabase = join(dir, 'garbage.bin');
    writeFileSync(notADatabase, Buffer.alloc(8192, 0x5a));
    const out = recoverDatabase({
      damagedPath: notADatabase,
      intoPath: join(dir, 'out.db')
    });
    expect(out.ok).toBe(false);
    expect(out.detail).toContain('no tables');
    expect(existsSync(join(dir, 'out.db'))).toBe(false);
    expect(existsSync(join(dir, 'out.db.recovering'))).toBe(false);
  });

  it('is present on this machine, which is the whole reason it was chosen', () => {
    expect(existsSync(SYSTEM_SQLITE3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The gate, as the opener runs it
// ---------------------------------------------------------------------------

describe('openGmuxDatabase, with the gate in front of it', () => {
  it('opens a healthy database and touches nothing', () => {
    const path = build();
    const reports: IntegrityGateReport[] = [];
    const db = openGmuxDatabase(path, { onGate: (r) => reports.push(r) });
    expect(reports).toEqual([
      { path, outcome: 'ok', detail: 'integrity_check' }
    ]);
    expect(quarantinedFiles()).toEqual([]);
    expect(
      db.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM sessions').get()?.c
    ).toBe(500);
    db.close();
  });

  it('reports a first run rather than pretending to check nothing', () => {
    const reports: IntegrityGateReport[] = [];
    const path = join(dir, 'fresh', 'manifest.db');
    const db = openGmuxDatabase(path, { onGate: (r) => reports.push(r) });
    expect(reports[0]?.outcome).toBe('absent');
    db.close();
  });

  it('sets a damaged file aside and rebuilds it, instead of writing over it', () => {
    const path = build();
    smashIndexRootPage(path);
    const damagedBytes = readFileSync(path);

    const reports: IntegrityGateReport[] = [];
    const db = openGmuxDatabase(path, { onGate: (r) => reports.push(r) });

    const report = reports[0];
    expect(report?.outcome).toBe('quarantined');
    expect(report?.recovery?.ok).toBe(true);
    // The wreck is on disk, unchanged, and it is the file the user still needs.
    expect(readFileSync(report?.quarantinedTo ?? '').equals(damagedBytes)).toBe(true);
    // And the live path holds the rows again rather than an empty schema.
    expect(
      db.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM sessions').get()?.c
    ).toBe(500);
    db.close();
  });

  it('starts fresh, with the wreck kept, when the rebuild is turned off', () => {
    const path = build();
    smashIndexRootPage(path);
    const reports: IntegrityGateReport[] = [];
    const db = openGmuxDatabase(path, {
      recover: false,
      onGate: (r) => reports.push(r)
    });
    expect(reports[0]?.outcome).toBe('quarantined');
    expect(reports[0]?.recovery).toBeUndefined();
    expect(quarantinedFiles().length).toBeGreaterThan(0);
    expect(
      db.prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all()
    ).toEqual([]);
    db.close();
  });

  it('REFUSES to open when the damaged file cannot be moved aside', () => {
    // Refusing is the only safe answer left. An app that will not start is
    // recoverable, and a manifest that has been written over is not.
    const path = build();
    smashIndexRootPage(path);
    const bytes = readFileSync(path);
    chmodSync(dir, 0o500);

    expect(() => openGmuxDatabase(path)).toThrow(/could not move it aside/);

    chmodSync(dir, 0o700);
    expect(readFileSync(path).equals(bytes)).toBe(true);
  });

  it('can be turned off entirely, for a caller that has already checked', () => {
    const path = build();
    smashIndexRootPage(path);
    const onGate = vi.fn();
    const db = openGmuxDatabase(path, { integrityGate: false, onGate });
    expect(onGate).not.toHaveBeenCalled();
    expect(quarantinedFiles()).toEqual([]);
    db.close();
  });

  it('costs a fraction of a millisecond on a healthy manifest-sized file', () => {
    // Research 34 §3.2 measured 0.0412 ms for `integrity_check` on the real 40
    // session manifest. This asserts the order of magnitude rather than the
    // number, because a shared machine's timings are not repeatable.
    const path = build('timed.db', 40);
    const started = process.hrtime.bigint();
    for (let i = 0; i < 20; i++) checkDatabaseIntegrity(path);
    const each = Number(process.hrtime.bigint() - started) / 1e6 / 20;
    expect(each).toBeLessThan(20);
    expect(statSync(path).size).toBeGreaterThan(0);
  });
});

/**
 * "I could not read it" and "it is damaged" are different answers and they
 * need different sentences.
 *
 * Measured before the fix round: the operator's pristine 46 session manifest,
 * placed in a directory at mode 500, made the app refuse to start with "The
 * database at … is damaged (attempt to write a readonly database)". The file
 * was intact and its sha256 was unchanged. The sentence was false about the
 * user's own data and sent them hunting for a quarantine that does not exist.
 */
describe('a file that could not be READ is not a damaged file', () => {
  it('recognises the permission and read-only-volume shapes', () => {
    for (const message of [
      'attempt to write a readonly database',
      'SQLITE_READONLY: attempt to write a readonly database',
      'EACCES: permission denied',
      'EROFS: read-only file system',
      'SQLITE_CANTOPEN: unable to open database file'
    ]) {
      expect(looksUnreadable(new Error(message))).toBe(true);
    }
  });

  it('does not mistake real damage for a permission problem', () => {
    for (const message of [
      'database disk image is malformed',
      'SQLITE_NOTADB: file is not a database',
      'database or disk is full'
    ]) {
      expect(looksUnreadable(new Error(message))).toBe(false);
    }
  });

  it('leaves an unreadable file exactly where it is, and does not rebuild it', () => {
    const path = build('locked.db', 20);
    const before = sha256Of(path);
    const holder = join(dir, 'locked-holder');
    // A directory the process cannot write is the measured shape. The file
    // itself is untouched; SQLite cannot create its journal beside it.
    chmodSync(dir, 0o500);
    const reports: IntegrityGateReport[] = [];
    try {
      expect(() =>
        openGmuxDatabase(path, { onGate: (r) => reports.push(r) })
      ).toThrow();
    } finally {
      chmodSync(dir, 0o700);
    }
    expect(reports).toHaveLength(1);
    expect(reports[0]?.outcome).toBe('unreadable');
    expect(sha256Of(path)).toBe(before);
    expect(readdirSync(dir).filter((f) => f.includes('damaged'))).toEqual([]);
    expect(existsSync(holder)).toBe(false);
  });

  it('narrows the verdict type so a caller cannot confuse the two', () => {
    const path = build('fine.db', 5);
    expect(isUnreadable(checkDatabaseIntegrity(path))).toBe(false);
  });
});
