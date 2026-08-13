/**
 * The recovery path's schema defect, pinned from both ends (Phase 20).
 *
 * Phase 19's fix round reported this failure. `/usr/bin/sqlite3 .recover`
 * rebuilds a damaged database from its FINAL schema, so a recovered manifest
 * arrives with every column already present. What it does not always rebuild is
 * the `migrations` bookkeeping table, and one measured recovery came back
 * holding a single row. The migration runner then decided `002-exit-code` had
 * never run, its plain `ALTER TABLE` threw `duplicate column name: exit_code`,
 * and every later launch on that profile failed the same way.
 *
 * Phase 19 closed it twice, and this file holds one test per closure so a later
 * cleanup cannot quietly remove either.
 *
 *  - `addColumnIfMissing` makes each column step describe the schema it wants
 *    rather than the change it makes, so the step is safe to run against a
 *    database that is already in that state.
 *  - `verifyManifestOpenable`, handed to the recovery step as `verifyOpenable`,
 *    opens the rebuilt file the way the app will and refuses to publish a
 *    rebuild that does not survive it.
 *
 * The first two tests build the adversarial state directly rather than hoping
 * `.recover` produces it, because whether it drops those rows on any given run
 * is a property of the damage. The state is what the fix has to survive.
 *
 * Nothing here touches tmux, the operator's manifest or the running app. Every
 * file is under a fresh temporary directory that is removed afterwards.
 */

import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

vi.mock('../../typed-events', () => ({
  broadcastEvent: () => undefined
}));

const { ManifestStore } = await import('../../manifest/store');

/** SQLite's default page size, and the one every file here is written at. */
const PAGE_SIZE = 4096;

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-recover-migrations-'));
  dbPath = join(dir, 'manifest.db');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A manifest carrying the real schema and enough rows to have a real index. */
function seed(rows = 60): void {
  const store = new ManifestStore(dbPath);
  const now = Date.now();
  for (let i = 0; i < rows; i += 1) {
    store.insertSession({
      id: `s-${String(i)}`,
      name: `session-${String(i)}`,
      tmuxName: `session-${String(i)}`,
      projectPath: dir,
      cwd: dir,
      agent: 'shell',
      status: 'running',
      createdAt: now,
      lastSeen: now,
      argv: ['/bin/zsh'],
      env: {}
    });
  }
  store.close();
  // Fold the WAL in, or damage lands in a file SQLite rebuilds from the log.
  const closer = new Database(dbPath);
  closer.pragma('wal_checkpoint(TRUNCATE)');
  closer.close();
}

/** The names in the bookkeeping table, in the order it holds them. */
function migrationNames(path: string): string[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare<[], { name: string }>('SELECT name FROM migrations ORDER BY id')
      .all()
      .map((r) => r.name);
  } finally {
    db.close();
  }
}

/** Every column of `sessions`, which `.recover` rebuilds from the final schema. */
function sessionColumns(path: string): string[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return (db.pragma('table_info(sessions)') as { name: string }[]).map(
      (c) => c.name
    );
  } finally {
    db.close();
  }
}

/**
 * Leave the schema exactly as it is and delete every bookkeeping row but the
 * first. This is the state a recovery produced, reached deterministically.
 */
function forgetMigrationsAfterFirst(path: string): void {
  const db = new Database(path);
  try {
    db.exec("DELETE FROM migrations WHERE name <> '001-initial'");
  } finally {
    db.close();
  }
}

/**
 * Write over the first eight bytes of the cell pointer array on the root page
 * of a named table or index, and prove the file changed before asserting
 * anything saw it.
 *
 * The target is named by the caller because WHICH page is lost decides what a
 * rebuild comes back holding. Measured on a 60 row fixture with Apple's SQLite
 * 3.43.2: smashing `idx_sessions_tmux_name` gave a rebuild with all 60 rows and
 * all seven bookkeeping rows, and smashing `migrations` gave a rebuild with all
 * 60 rows, all nineteen columns and NO bookkeeping rows at all. The second is
 * the shape Phase 19 reported.
 */
function smashRootPage(path: string, objectName: string): void {
  const before = readFileSync(path);
  const ro = new Database(path, { readonly: true, fileMustExist: true });
  const root = ro
    .prepare<[string], { rootpage: number }>(
      'SELECT rootpage FROM sqlite_master WHERE name = ?'
    )
    .get(objectName);
  ro.close();
  if (!root) throw new Error(`nothing named ${objectName}`);

  const fd = openSync(path, 'r+');
  writeSync(
    fd,
    Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    0,
    8,
    (root.rootpage - 1) * PAGE_SIZE + 8
  );
  closeSync(fd);
  expect(readFileSync(path).equals(before)).toBe(false);
}

describe('a recovered manifest whose bookkeeping table came back short', () => {
  it('is the state that broke the app: the column is there and the row is not', () => {
    seed(5);
    expect(sessionColumns(dbPath)).toContain('exit_code');
    forgetMigrationsAfterFirst(dbPath);
    expect(migrationNames(dbPath)).toEqual(['001-initial']);

    // The old step, run by hand against that state. This is the throw the
    // Phase 19 fix round measured, and it is reproduced here so the test below
    // is a proof rather than an assertion about a state nobody checked.
    const db = new Database(dbPath);
    try {
      expect(() =>
        db.exec('ALTER TABLE sessions ADD COLUMN exit_code INTEGER;')
      ).toThrow(/duplicate column name: exit_code/);
    } finally {
      db.close();
    }
  });

  it('opens at HEAD, and writes the missing bookkeeping rows back', () => {
    seed(5);
    forgetMigrationsAfterFirst(dbPath);

    const store = new ManifestStore(dbPath);
    try {
      expect(store.listSessions()).toHaveLength(5);
    } finally {
      store.close();
    }

    // Every step re-ran without throwing, and every one recorded itself, so the
    // next launch skips them all.
    const names = migrationNames(dbPath);
    expect(names).toContain('001-initial');
    expect(names).toContain('002-exit-code');
    expect(names).toContain('007-restore-attempts');
    expect(new Set(names).size).toBe(names.length);

    // A second open is the launch that used to fail permanently.
    const again = new ManifestStore(dbPath);
    try {
      expect(again.listSessions()).toHaveLength(5);
    } finally {
      again.close();
    }
  });

  it('survives an empty bookkeeping table, which is the worse shape', () => {
    seed(5);
    const wipe = new Database(dbPath);
    wipe.exec('DELETE FROM migrations');
    wipe.close();

    const store = new ManifestStore(dbPath);
    try {
      expect(store.listSessions()).toHaveLength(5);
    } finally {
      store.close();
    }
    expect(migrationNames(dbPath)).toHaveLength(7);
  });
});

describe('the whole recovery path, end to end, through real damage', () => {
  it('rebuilds a smashed index into a manifest the app opens twice', () => {
    seed();
    smashRootPage(dbPath, 'idx_sessions_tmux_name');

    const first = new ManifestStore(dbPath);
    const recovered = first.listSessions().length;
    first.close();

    expect(recovered).toBeGreaterThan(0);
    expect(readFileSync(dbPath).length).toBeGreaterThan(0);

    // The launch after the rebuild is where the reported defect showed itself.
    const second = new ManifestStore(dbPath);
    try {
      expect(second.listSessions()).toHaveLength(recovered);
    } finally {
      second.close();
    }
    expect(existsSync(dbPath)).toBe(true);
  });

  it('rebuilds a smashed bookkeeping table, which is the reported shape', () => {
    // This is the damage that produces the defect rather than a stand-in for
    // it. Measured: `.recover` returns every session row and every column, and
    // the `migrations` table comes back empty.
    seed();
    smashRootPage(dbPath, 'migrations');

    const first = new ManifestStore(dbPath);
    const recovered = first.listSessions().length;
    first.close();
    expect(recovered).toBeGreaterThan(0);

    // Every step ran against a schema that already had every column, and every
    // one recorded itself. Before Phase 19's fix this is where the app threw
    // `duplicate column name: exit_code` on every launch, permanently.
    expect(migrationNames(dbPath)).toHaveLength(7);

    const second = new ManifestStore(dbPath);
    try {
      expect(second.listSessions()).toHaveLength(recovered);
    } finally {
      second.close();
    }
  });
});
