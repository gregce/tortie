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
 *
 * Phase 19 item 5 put an integrity gate in front of the open for the same
 * reason the pragmas are here. Whether a damaged file is written over or set
 * aside is a durability decision, and a durability decision is made once, in
 * the place both callers are forced through. The gate itself lives in
 * ./integrity.ts and the last resort rebuild in ./recover.ts, so this file
 * stays the opener rather than becoming the repair shop.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { getLog } from '../log';
import { dirname } from 'node:path';
import { checkDatabaseIntegrity, isUnreadable, quarantineDatabase } from './integrity';
import { recoverDatabase, type RecoverySummary } from './recover';

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

/** What the integrity gate did to the file before it was opened. */
export interface IntegrityGateReport {
  path: string;
  /**
   * - `absent`: there is no file yet, so a fresh one is being created.
   * - `ok`: SQLite accounted for every page of it.
   * - `quarantined`: it was damaged and has been moved aside.
   * - `unreadable`: it could not be read, so nothing was proved about it. It
   *   was NOT moved and NOT rebuilt. The open below will fail with the real
   *   cause, which is a permission or a read only volume rather than damage.
   */
  outcome: 'absent' | 'ok' | 'quarantined' | 'unreadable';
  /** Plain sentence for the log and for a support answer. */
  detail: string;
  /** Where the damaged file was moved to. Only set when quarantined. */
  quarantinedTo?: string;
  /** What the rebuild attempt did. Only set when quarantined and enabled. */
  recovery?: RecoverySummary;
}

export interface OpenDatabaseOptions {
  /**
   * Check the file before opening it for writing, and set a damaged one aside
   * rather than writing over it. On by default, because the default has to be
   * the safe one.
   */
  integrityGate?: boolean;
  /**
   * After a quarantine, try to rebuild the rows with `/usr/bin/sqlite3
   * .recover`. On by default. A caller whose database is disposable and cheap
   * to regenerate can turn this off and start fresh instead.
   */
  recover?: boolean;
  /** Where the gate's report goes. Defaults to a console line. */
  onGate?: (report: IntegrityGateReport) => void;
  /** Test seam for the quarantine timestamp. */
  now?: () => Date;
  /**
   * Open a rebuilt database the way THIS caller will open it, and throw if
   * that fails. Passed straight through to the recovery step, which refuses to
   * publish a rebuild that does not survive it. See recover.ts
   * `verifyOpenable` for the permanent failure this closes.
   */
  verifyRebuilt?: (dbPath: string) => void;
}

/**
 * Open (creating parent directories as needed) a SQLite database with gmux's
 * standard pragmas:
 * - WAL: crash-safe, and readers never block the (single) writer.
 * - synchronous = NORMAL: the WAL-appropriate durability/throughput point.
 * - busy_timeout: see above.
 *
 * Phase 19 item 5 added one step in front of all three. The file is checked
 * before it is opened for writing, and a damaged one is moved aside instead of
 * being written over. `new Database(path)` on a damaged file does not refuse:
 * SQLite opens it and the first write initialises what it can, which destroys
 * the copy the user still needs. For the manifest that is the whole restore
 * story. See ./integrity.ts for the check and ./recover.ts for the rebuild.
 *
 * @throws when the file is damaged AND cannot be moved aside. Refusing to open
 *         is the only safe answer left at that point, and the manifest store
 *         already turns a failed open into a friendly UI state.
 */
export function openGmuxDatabase(
  dbPath: string,
  options: OpenDatabaseOptions = {}
): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  if (options.integrityGate !== false) runIntegrityGate(dbPath, options);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  return db;
}

/**
 * Check, then set aside, then rebuild. In that order, and never opening for
 * writing at any point in it.
 *
 * A rebuild that fails is not an error here. The damaged file is already out of
 * the way and the caller goes on to create a fresh empty database, which is a
 * loss the user can see and act on rather than a silent overwrite.
 */
function runIntegrityGate(dbPath: string, options: OpenDatabaseOptions): void {
  const report = (r: IntegrityGateReport): void => {
    (options.onGate ?? reportDatabaseGate)(r);
  };

  if (!existsSync(dbPath)) {
    report({ path: dbPath, outcome: 'absent', detail: 'no file yet' });
    return;
  }

  const verdict = checkDatabaseIntegrity(dbPath);
  if (verdict.ok) {
    report({ path: dbPath, outcome: 'ok', detail: verdict.check });
    return;
  }

  // A file the check could not read is a file nothing has been proved about.
  // Moving it aside and rebuilding it would be acting on a diagnosis that was
  // never made, and it would tell the user their session list was damaged when
  // the bytes are intact. Say what happened and let the open below fail with
  // the real cause.
  if (isUnreadable(verdict)) {
    report({ path: dbPath, outcome: 'unreadable', detail: verdict.detail });
    return;
  }

  let quarantined: string;
  try {
    quarantined = quarantineDatabase(dbPath, options.now).path;
  } catch (err) {
    throw new Error(
      `The database at ${dbPath} is damaged (${verdict.detail}), and Tortie ` +
        `could not move it aside (${(err as Error).message}). It has been ` +
        'left exactly as it is. Nothing was written over it.'
    );
  }

  const recovery =
    options.recover === false
      ? undefined
      : recoverDatabase({
          damagedPath: quarantined,
          intoPath: dbPath,
          verifyOpenable: options.verifyRebuilt
        });

  report({
    path: dbPath,
    outcome: 'quarantined',
    detail: verdict.detail,
    quarantinedTo: quarantined,
    recovery
  });
}

/**
 * The log lines a quarantine produces. The default reader, and also the one a
 * caller with its own reader calls first so nothing is lost from the log.
 *
 * PHASE 35. Until now this narrative went to a console the shipped app does
 * not have, so a packaged user whose session list was quarantined got the
 * durability notice and nothing else. The notice says a file moved; this
 * narrative says which file, why, where it went, and whether the rebuild
 * worked. It is one error record now, so both halves survive.
 *
 * `scope` is "db" by default and "manifest" when the manifest store calls it,
 * because the manifest is the file whose damage costs the user their session
 * list and it should be findable on its own name.
 */
export function reportDatabaseGate(
  r: IntegrityGateReport,
  scope: 'db' | 'manifest' = 'db'
): void {
  const dbLog = getLog(scope);
  if (r.outcome === 'unreadable') {
    dbLog.error(
      `the database at ${r.path} could not be read, so nothing is known ` +
        `about it: ${r.detail}. It was left exactly where it is and nothing was ` +
        'moved or rebuilt.',
      { path: r.path, outcome: r.outcome, detail: r.detail }
    );
    return;
  }
  if (r.outcome !== 'quarantined') return;
  dbLog.error(
    `the database at ${r.path} is damaged: ${r.detail}. It was moved to ` +
      `${r.quarantinedTo ?? 'nowhere'} and nothing was written over it.`,
    {
      path: r.path,
      outcome: r.outcome,
      detail: r.detail,
      quarantinedTo: r.quarantinedTo ?? null,
      rebuilt: r.recovery?.ok ?? null,
      rebuildMs: r.recovery?.ms ?? null,
      rebuildDetail: r.recovery?.detail ?? null
    }
  );
  if (!r.recovery) {
    dbLog.error('no rebuild was attempted; starting with an empty file');
    return;
  }
  dbLog.error(
    r.recovery.ok
      ? `rebuilt from the damaged copy in ${r.recovery.ms} ms: ${r.recovery.detail}`
      : `could not rebuild it: ${r.recovery.detail}`
  );
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

/**
 * `immediateTransaction`, with the two pragmas that make the commit survive an
 * application crash raised for this one transaction and lowered again after
 * it. For the handful of writes whose whole purpose is to be readable by the
 * NEXT launch (Phase 19 item 7, the restore journal; Phase 20 item 4, the five
 * manifest commits listed in manifest/store.ts under "The durable commits").
 *
 * The numbers, measured with better-sqlite3 13.0.3 in WAL mode as the median
 * of 20 to 25 single-row `BEGIN IMMEDIATE` commits (research 34 §1.1).
 *
 * | Connection settings                   | Median commit |
 * | ------------------------------------- | ------------- |
 * | `synchronous=NORMAL` (what we open with) | 0.0116 ms  |
 * | `synchronous=FULL`, `fullfsync=0`     | 0.0512 ms     |
 * | `synchronous=NORMAL`, `fullfsync=1`   | 0.0104 ms     |
 * | `synchronous=FULL`, `fullfsync=1`     | 4.1083 ms     |
 *
 * Two things follow, and they are why this is a scoped helper rather than a
 * change to `openGmuxDatabase`.
 *
 *  - `fullfsync` alone is a placebo. Under `synchronous=NORMAL` the WAL is not
 *    synced at commit, so there is no sync for `F_FULLFSYNC` to strengthen.
 *  - Paying 4.11 ms on every commit would be paid by reconcile, by every
 *    activity verdict and by every rename. Both pragmas are per-connection and
 *    switchable with no reconnect: scoping them measured 0.0115 ms before,
 *    4.2538 ms for the scoped commit, and 0.0113 ms after.
 *
 * WHAT THIS BUYS, IN LITERAL TERMS. `synchronous=FULL` makes SQLite call
 * `fsync(2)` at commit, and `fullfsync=1` makes that call `F_FULLFSYNC`, which
 * on macOS asks the drive to flush its own cache. Without them a commit is in
 * the kernel page cache: it survives the app being killed, and it does not
 * survive power loss or a kernel panic. The restore journal is exactly the
 * record that has to survive the second case, because that is the case where
 * Tortie wakes up holding a tmux session it has no record of creating.
 *
 * The pragmas are lowered in a `finally`, so a throwing `fn` cannot leave the
 * connection paying 4 ms on every later write.
 *
 * WHY MIGRATION COMMITS ARE NOT ROUTED THROUGH HERE. Research 28 lists them as
 * a promotion candidate alongside the declaration write. They do not need it,
 * for two reasons that can both be stated. A WAL loses a contiguous run of
 * commits off the END, because recovery reads frames in order and stops at the
 * first bad checksum, so a lost migration cannot leave rows written against
 * the new schema behind it. And every schema step goes through
 * `addColumnIfMissing`, so the next launch simply runs it again. Paying 4.2 ms
 * for a commit whose loss repairs itself is a cost with nothing on the other
 * side of it.
 *
 * @throws when the connection is ALREADY inside a transaction. See the guard.
 */
export function durableTransaction<T>(db: Database.Database, fn: () => T): T {
  // A nested call cannot deliver what its name promises. better-sqlite3 turns
  // an inner transaction into a SAVEPOINT, so the commit that reaches the disk
  // is the OUTER one, and the `finally` below lowers both pragmas before that
  // outer commit happens. The write would be an ordinary commit wearing the
  // name of a durable one, which is worse than an ordinary commit: a later
  // reader of the call site would believe the row is on the drive.
  //
  // Refusing is the right answer rather than degrading quietly, because every
  // caller is in this repository and the fix is always the same one line.
  if (db.inTransaction) {
    throw new Error(
      'durableTransaction was called inside another transaction. The pragmas ' +
        'it raises are lowered again before the outer transaction commits, so ' +
        'the write would not be durable. Call it at the top level, or make ' +
        'the outer transaction the durable one.'
    );
  }
  db.pragma('synchronous = FULL');
  db.pragma('fullfsync = 1');
  try {
    return immediateTransaction(db, fn);
  } finally {
    db.pragma('fullfsync = 0');
    db.pragma('synchronous = NORMAL');
  }
}

/** One schema step. `up` runs inside a transaction with its bookkeeping row. */
export interface SqliteMigration {
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * `ALTER TABLE … ADD COLUMN`, skipped when the column is already there.
 *
 * WHY EVERY COLUMN MIGRATION HAS TO GO THROUGH THIS. `/usr/bin/sqlite3
 * .recover` rebuilds a damaged database from its FINAL schema, so a recovered
 * manifest already has all nineteen columns. What it does not always rebuild is
 * the `migrations` bookkeeping table: one measured recovery came back holding a
 * single row, `001-initial`. The next boot then decided `002-exit-code` had
 * never run, its plain `ALTER TABLE` threw `duplicate column name: exit_code`,
 * and the app could not open the manifest it had just rebuilt. Every relaunch
 * on that profile failed the same way, so the state was permanent.
 *
 * A step that describes the schema it wants rather than the change it makes is
 * safe to run against a database that is already in that state. The bookkeeping
 * row is still written, so the step is skipped from then on.
 */
export function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  declaration: string
): void {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[];
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration};`);
}

/**
 * Apply every migration this database has not seen, each one atomically with
 * the `migrations` row that records it — so a crash mid-step can never leave a
 * half-applied schema that the next boot believes is done.
 *
 * `seal` runs inside the transaction of the LAST step that is applied, and the
 * return value says whether it ran. Phase 21's fix round added it to close a
 * window a verifier measured, and the window is small enough to be worth
 * stating exactly. The compatibility statement (`PRAGMA user_version` and the
 * `meta` row) used to be written in a SECOND transaction after this function
 * returned, so a crash in between left a file carrying the new columns and no
 * statement about them. An older build would not refuse that file, because
 * there is nothing in it to refuse on. No trial out of 113 landed in the gap
 * and the next launch of the same build re-stamps, so it was never going to be
 * seen. It is also two lines to close, and a compatibility number that is
 * written by the same commit as the columns it describes cannot disagree with
 * them.
 *
 * @returns true when `seal` was given a transaction to run in. False means
 *          nothing was pending, and the caller writes the stamp itself.
 */
export function runMigrations(
  db: Database.Database,
  migrations: readonly SqliteMigration[],
  seal?: (db: Database.Database) => void
): boolean {
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
  const pending = migrations.filter((m) => !applied.has(m.name));
  const last = pending.at(-1);
  let sealed = false;
  for (const m of pending) {
    immediateTransaction(db, () => {
      m.up(db);
      insert.run(m.name, Date.now());
      if (m === last && seal !== undefined) {
        seal(db);
        sealed = true;
      }
    });
  }
  return sealed;
}
