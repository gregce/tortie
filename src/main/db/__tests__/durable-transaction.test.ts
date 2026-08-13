/**
 * `durableTransaction` — the scoped pragma raise (Phase 19 item 7).
 *
 * NEW FILE rather than an addition to sqlite.test.ts, which another stream is
 * editing in the same phase.
 *
 * WHAT THIS CAN AND CANNOT PROVE. It cannot prove that a commit survives power
 * loss, because no test can cut the power to a drive. What it proves is the
 * part that is a code defect when it is wrong: that both pragmas are raised
 * for the transaction, that both are lowered again afterwards, and that a
 * throwing body cannot leave the connection paying 4.24 ms on every later
 * write for the rest of the process's life.
 *
 * The pragma values are SQLite's own numbering: 1 is NORMAL and 2 is FULL.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { durableTransaction, openGmuxDatabase } from '../sqlite';

let dir: string;
let db: BetterSqlite3.Database;

const NORMAL = 1;
const FULL = 2;

const pragma = (name: string): unknown => db.pragma(name, { simple: true });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-durable-tx-'));
  db = openGmuxDatabase(join(dir, 'x.db'));
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('durableTransaction', () => {
  it('opens at synchronous=NORMAL, which is the point of scoping', () => {
    expect(pragma('synchronous')).toBe(NORMAL);
    expect(pragma('fullfsync')).toBe(0);
  });

  it('raises both pragmas for the body', () => {
    const seen = durableTransaction(db, () => ({
      synchronous: pragma('synchronous'),
      fullfsync: pragma('fullfsync')
    }));
    // Both, or neither is worth anything. Under NORMAL the WAL is not synced
    // at commit, so there is no sync for F_FULLFSYNC to strengthen and
    // fullfsync on its own is a placebo (research 34 §1.1).
    expect(seen).toEqual({ synchronous: FULL, fullfsync: 1 });
  });

  it('lowers both again afterwards', () => {
    durableTransaction(db, () => db.prepare("INSERT INTO t (v) VALUES ('a')").run());
    expect(pragma('synchronous')).toBe(NORMAL);
    expect(pragma('fullfsync')).toBe(0);
  });

  it('lowers both when the body throws, and rolls the write back', () => {
    expect(() =>
      durableTransaction(db, () => {
        db.prepare("INSERT INTO t (v) VALUES ('a')").run();
        throw new Error('nope');
      })
    ).toThrow('nope');
    expect(pragma('synchronous')).toBe(NORMAL);
    expect(pragma('fullfsync')).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM t').get()).toEqual({ n: 0 });
  });

  it('commits the write and returns the body value', () => {
    const id = durableTransaction(db, () =>
      Number(db.prepare("INSERT INTO t (v) VALUES ('a')").run().lastInsertRowid)
    );
    expect(id).toBe(1);
    expect(db.prepare('SELECT v FROM t WHERE id = 1').get()).toEqual({ v: 'a' });
  });
});
