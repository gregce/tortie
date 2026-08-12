/**
 * The ONE way gmux opens a SQLite file, and the ONE migration runner.
 *
 * Both of gmux's databases — the durability-critical `manifest.db` and the
 * disposable `symbols.db` — used to carry a byte-identical copy of the open
 * sequence and a byte-identical 24-line `migrate()`. The copies had already
 * drifted: `symbols/persist.ts` set `busy_timeout` and `manifest/store.ts` did
 * not, so the pragma set that governs the file gmux cannot afford to lose was
 * the WEAKER of the two, and the comment explaining the pragma lived only on
 * the copy that had it (research 25 §3 B2, §5 clone #27).
 *
 * Divergence is the failure mode this module exists to prevent: a pragma is a
 * durability decision, and a durability decision must be made once, in a place
 * both callers are forced through, not twice in two files that only look the
 * same.
 *
 * Callers keep their own error wrapping — the manifest turns a failure into a
 * `GmuxErrorPayload`, the symbol index lets it throw — because what a failed
 * open MEANS is a property of the caller, not of the opener.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * How long a write waits for another connection's lock before it becomes an
 * error. A concurrent writer is not an error, it is a wait. Without this a
 * parallel build in a second window throws SQLITE_BUSY and loses a batch —
 * and on the manifest side, a lost batch is a session row that was never
 * written and therefore a session that cannot be restored.
 *
 * better-sqlite3 currently defaults its `timeout` option to the same 5000 ms
 * (13.0.3, `src/objects/database.cpp:167` calls `sqlite3_busy_timeout`), so
 * stating it here is not a behaviour change today. It is stated anyway: the
 * wait that protects the manifest should be gmux's decision, visible in gmux's
 * source, and not a library default that a future `npm update` may revise.
 */
const BUSY_TIMEOUT_MS = 5000;

/**
 * Open (creating parent directories as needed) a SQLite database with gmux's
 * standard pragmas:
 * - WAL: crash-safe, and readers never block the (single) writer.
 * - synchronous = NORMAL: the WAL-appropriate durability/throughput point.
 * - busy_timeout: see above.
 */
export function openGmuxDatabase(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  return db;
}

/**
 * Run `fn` inside ONE transaction that takes the write lock up front, and
 * return whatever it returns.
 *
 * The default `db.transaction(fn)()` issues a DEFERRED `BEGIN`: the
 * transaction starts as a reader and only tries to become a writer at its
 * first write. In WAL mode that upgrade FAILS — `SQLITE_BUSY_SNAPSHOT`, whose
 * message is the innocuous-looking "database is locked" — whenever another
 * connection committed between this transaction's read snapshot and that
 * first write, because committing on a snapshot that is already stale would
 * produce a state no serial order could have produced.
 *
 * Crucially, `sqlite3_busy_timeout` does NOT retry that error class: it is not
 * a lock that will free up in a moment, the snapshot is already gone. So the
 * `busy_timeout` set in `openGmuxDatabase` above — which does make an ordinary
 * concurrent WRITE a wait rather than an error — gives read-then-write
 * transactions no protection at all. This was observed, not theorised: a
 * `smoke:t3` run printed `[gmux] refresh failed: database is locked` out of
 * `reconcile()`, and a worker thread committing mid-transaction reproduces it
 * deterministically (see `__tests__/sqlite.test.ts`).
 *
 * `BEGIN IMMEDIATE` takes the write lock before the first read, so the
 * snapshot cannot go stale underneath the transaction and the only contention
 * left is a plain lock wait — which busy_timeout does cover. Every gmux
 * transaction goes through here for the same reason every gmux pragma does:
 * this is a durability decision, and it is made once.
 */
export function immediateTransaction<T>(
  db: Database.Database,
  fn: () => T
): T {
  return db.transaction(fn).immediate();
}

/** One schema step. `up` runs inside a transaction with its bookkeeping row. */
export interface SqliteMigration {
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * Apply every migration this database has not seen, each one atomically with
 * the `migrations` row that records it — so a crash mid-step can never leave a
 * half-applied schema that the next boot believes is done.
 */
export function runMigrations(
  db: Database.Database,
  migrations: readonly SqliteMigration[]
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);
  const applied = new Set(
    db
      .prepare<[], { name: string }>('SELECT name FROM migrations')
      .all()
      .map((r) => r.name)
  );
  const insert = db.prepare<[string, number]>(
    'INSERT INTO migrations (name, applied_at) VALUES (?, ?)'
  );
  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    immediateTransaction(db, () => {
      m.up(db);
      insert.run(m.name, Date.now());
    });
  }
}
