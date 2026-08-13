/**
 * recover.ts — the last resort after a database has been set aside (Phase 19
 * item 5).
 *
 * ## Why this shells out instead of linking something
 *
 * The rebuild is done by `/usr/bin/sqlite3 .recover`, which is already on
 * macOS. Research 34 §3.2 verified it present and working at Apple's SQLite
 * 3.43.2. It costs zero bundled bytes and it adds nothing to the signed
 * bundle, which matters because everything else Tortie could have used here is
 * a native module that would have to be notarised.
 *
 * `.recover` does not repair the damaged file. It walks whatever pages it can
 * still read and prints the SQL that rebuilds their content. Rows whose table
 * cannot be identified go into a table it creates called `lost_and_found`. So
 * the sequence is copy the wreck, read the copy, write a fresh database from
 * the SQL, check the fresh one, prove the app can open it, and only then put it
 * where the app will look. The wreck itself is never opened by anything here,
 * and it stays exactly where `quarantineDatabase` left it.
 *
 * Measured on a 500 row fixture with the root page of an index smashed, the
 * recovery produced 92,217 bytes of SQL in 15.5 ms and rebuilt all 500 rows
 * with `integrity_check` returning ok.
 *
 * ## Why it is bounded
 *
 * This runs at boot, on the path that opens the manifest, and it runs only
 * when the file was already found damaged. A hung child would be a hung app,
 * so each of the two steps has its own timeout and the output has a size cap.
 * Exceeding either is a failed recovery, not a crash, and a failed recovery
 * leaves the app starting with an empty manifest and the wreck still on disk.
 *
 * ## This is the SECOND choice, and Phase 20 is what made that true
 *
 * A page walk is a best effort. It reads what it can still read, it puts rows
 * it cannot attribute into `lost_and_found`, and nothing it produces was ever
 * checked against the database as it was before the damage. The backup ring in
 * ../manifest/recovery.ts holds something strictly better: a copy that was
 * proved complete at the moment it was taken, by `integrity_check` on the copy
 * and by a per table content hash against the source.
 *
 * So the order on the manifest's boot path is the ring first and this second,
 * and the two answers are not the same kind of answer. `restoreFromBackup`
 * gives back every row of an earlier instant. This gives back as much as could
 * be read of the latest instant, with no way to say what is missing.
 *
 * INTEGRATION SEAM, because that ordering crosses three files this module does
 * not own. The boot path in main/index.ts calls the ring's restore BEFORE it
 * constructs `ManifestStore`, in the same place it calls
 * `takePreMigrationGeneration`, and only when the manifest is absent or fails
 * `checkDatabaseIntegrity`. `openGmuxDatabase` then finds a healthy file and
 * this module is never reached. Nothing here changes: the fallback has to keep
 * working for the case where the ring is empty, which is every profile that
 * has not launched since Phase 20.
 */

import Database from 'better-sqlite3';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, renameSync, rmSync } from 'node:fs';
import { tableRowCounts } from './digest';

/**
 * Everything SQLite may keep beside a database file. The same list
 * `quarantineDatabase` moves, kept in step for the same reason: `-wal` and
 * `-journal` hold committed data, and a recovery that reads the database
 * without them recovers a database that is missing its last transactions.
 */
const SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'] as const;

/** Apple ships this. Nothing is bundled and nothing is signed for it. */
export const SYSTEM_SQLITE3 = '/usr/bin/sqlite3';

/** The table `.recover` puts rows in when it cannot say which table they came from. */
const LOST_AND_FOUND = 'lost_and_found';

/** Per step. The whole path only runs on a file already found damaged. */
const STEP_TIMEOUT_MS = 20_000;

/** SQL bigger than this is treated as a failed recovery rather than buffered. */
const MAX_SQL_BYTES = 256 * 1024 * 1024;

export interface RecoveryOptions {
  /** The quarantined file to read. Never written to. */
  damagedPath: string;
  /** Where the rebuilt database is published on success. Must not exist. */
  intoPath: string;
  /** Test seam, and the guard for a machine that does not have the tool. */
  sqlite3Path?: string;
  /**
   * Open the rebuilt file the way the APP will open it, and throw if that
   * fails. Called on the staging file, before it is published.
   *
   * THIS IS THE GATE THAT MATTERS, and it was missing until the Phase 19 fix
   * round. `pragma integrity_check` on the rebuilt file says every page adds
   * up. It says nothing about whether the caller's own schema work will
   * succeed. Measured: a recovered manifest came back with all nineteen
   * columns and a `migrations` table holding one row, the migration runner
   * decided `002-exit-code` had not run, its `ALTER TABLE` threw `duplicate
   * column name: exit_code`, and every launch on that profile then failed with
   * "Could not open the session manifest". The file was published, so the state
   * was permanent.
   *
   * The caller passes the real open path. A rebuild the app cannot open is a
   * FAILED rebuild, and a failed rebuild leaves the wreck quarantined and the
   * app starting empty, which the user can see and act on.
   */
  verifyOpenable?: (dbPath: string) => void;
}

export interface RecoverySummary {
  ok: boolean;
  /** Plain sentence naming what happened, for the log and a support answer. */
  detail: string;
  /** Bytes of SQL `.recover` produced. Zero when it produced nothing. */
  sqlBytes: number;
  /** table -> row count, read from the rebuilt database. Empty on failure. */
  rows: Record<string, number>;
  /**
   * Rows `.recover` read but could not attribute to a table. They are in
   * `lost_and_found`, they are the user's, and they are NOT part of the
   * recovered total.
   *
   * SEPARATE FROM THE TOTAL BECAUSE THE TOTAL IS READ AS A PROMISE. Until
   * Phase 20 these rows were counted with everything else, so a rebuild that
   * could not place 40 of 500 rows reported "rebuilt 500 rows" and a person
   * reading the log had no way to learn otherwise. A recovery is the one place
   * a report may not round in its own favour.
   */
  unplacedRows: number;
  ms: number;
}

/**
 * Rebuild `intoPath` from `damagedPath`, or say why it could not be done.
 *
 * Never throws. Every failure is a `RecoverySummary` with `ok: false`, because
 * the caller is the boot path and the alternative to a failed recovery is a
 * fresh empty database rather than an app that will not start.
 */
export function recoverDatabase(opts: RecoveryOptions): RecoverySummary {
  const started = Date.now();
  const sqlite3 = opts.sqlite3Path ?? SYSTEM_SQLITE3;
  const staging = `${opts.intoPath}.recovering`;
  // The wreck is read through a COPY, never in place. See readCopy below.
  const wreckCopy = `${opts.intoPath}.wreck-copy`;
  const sweep = (stem: string): void => {
    rmSync(stem, { force: true });
    for (const suffix of SIDECAR_SUFFIXES) rmSync(`${stem}${suffix}`, { force: true });
  };
  const fail = (detail: string, sqlBytes = 0): RecoverySummary => {
    sweep(staging);
    sweep(wreckCopy);
    return {
      ok: false,
      detail,
      sqlBytes,
      rows: {},
      unplacedRows: 0,
      ms: Date.now() - started
    };
  };

  if (!existsSync(sqlite3)) {
    return fail(`no rebuild tool at ${sqlite3}, so nothing was rebuilt`);
  }

  sweep(staging);
  sweep(wreckCopy);

  /**
   * Copy the quarantined set beside the target, so `.recover` reads a file this
   * module owns.
   *
   * THE MODULE'S PROMISE IS THAT THE QUARANTINED COPY IS NEVER TOUCHED, and
   * until the Phase 19 fix round nothing enforced it. `sqlite3 <wreck>
   * .recover` opens read-write and was observed creating a `-shm` and a `-wal`
   * beside the wreck in a real run.
   *
   * `-readonly` looked like the one line answer and it is NOT, which was
   * measured rather than assumed. On a WAL mode database with its sidecars
   * beside it, `sqlite3 -readonly <db> .recover` produced 36 bytes of SQL and
   * no tables at all where the read-write form recovered every row. A recovery
   * that silently returns nothing is worse than a stray `-shm`.
   *
   * A copy costs one file write on a path that only runs after the database was
   * already found damaged. The sidecars travel with it because `-wal` and
   * `-journal` hold committed rows.
   */
  try {
    copyFileSync(opts.damagedPath, wreckCopy);
    for (const suffix of SIDECAR_SUFFIXES) {
      const sidecar = `${opts.damagedPath}${suffix}`;
      if (existsSync(sidecar)) copyFileSync(sidecar, `${wreckCopy}${suffix}`);
    }
  } catch (err) {
    return fail(`the damaged file could not be copied: ${(err as Error).message}`);
  }

  const dumped = spawnSync(sqlite3, [wreckCopy, '.recover'], {
    timeout: STEP_TIMEOUT_MS,
    maxBuffer: MAX_SQL_BYTES,
    encoding: 'buffer'
  });
  if (dumped.error) {
    return fail(`reading the damaged file failed: ${dumped.error.message}`);
  }
  const sql = dumped.stdout;
  if (dumped.status !== 0 && (!sql || sql.length === 0)) {
    return fail(
      `reading the damaged file exited ${String(dumped.status)}: ` +
        `${describeStderr(dumped.stderr)}`
    );
  }
  if (!sql || sql.length === 0) {
    return fail('the damaged file yielded no readable rows');
  }

  const built = spawnSync(sqlite3, [staging], {
    input: sql,
    timeout: STEP_TIMEOUT_MS,
    maxBuffer: MAX_SQL_BYTES,
    encoding: 'buffer'
  });
  if (built.error) {
    return fail(`rebuilding failed: ${built.error.message}`, sql.length);
  }
  if (!existsSync(staging)) {
    return fail(
      `rebuilding produced no file: ${describeStderr(built.stderr)}`,
      sql.length
    );
  }

  // The rebuilt file is checked with the same gate the damaged one failed.
  // Publishing a second damaged database would be the same defect twice.
  let rows: Record<string, number> = {};
  try {
    const db = new Database(staging, { readonly: false, fileMustExist: true });
    try {
      const verdict = db.pragma('integrity_check(10)') as {
        integrity_check?: string;
      }[];
      const bad = verdict
        .map((r) => r.integrity_check ?? '')
        .filter((line) => line !== '' && line !== 'ok');
      if (bad.length > 0) {
        db.close();
        return fail(`the rebuilt database is also damaged: ${bad.join('; ')}`, sql.length);
      }
      dropEmptyLostAndFound(db);
      rows = tableRowCounts(db);
    } finally {
      db.close();
    }
  } catch (err) {
    return fail(
      `the rebuilt database could not be read: ${(err as Error).message}`,
      sql.length
    );
  }

  // A rebuild with no tables in it is not a rebuild, and this has to be
  // decided BEFORE the rename. Publishing it would put an empty file where the
  // caller expects either the user's rows or nothing, and it would make the log
  // claim a recovery that did not happen.
  if (Object.keys(rows).length === 0) {
    return fail('the damaged file yielded no tables', sql.length);
  }

  // The last gate, and the one `integrity_check` cannot stand in for: open the
  // rebuilt file the way the app will, including its migrations. A file that
  // throws here would be published and would then fail on EVERY launch. See
  // `verifyOpenable`.
  if (opts.verifyOpenable) {
    try {
      opts.verifyOpenable(staging);
    } catch (err) {
      return fail(
        `the rebuilt database is not one this app can open: ${(err as Error).message}`,
        sql.length
      );
    }
  }

  // `sqlite3` leaves no `-wal` behind for a file it opened and closed, but a
  // stale one beside a published database is worse than a missing one. The
  // openability gate above opens the staging file for writing, so this runs
  // after it rather than before.
  for (const suffix of SIDECAR_SUFFIXES) rmSync(`${staging}${suffix}`, { force: true });
  renameSync(staging, opts.intoPath);
  // The working copy of the wreck has done its job. The quarantined original
  // stays exactly where `quarantineDatabase` left it.
  sweep(wreckCopy);

  // `lost_and_found` is counted apart from the rest. See `unplacedRows`.
  const unplacedRows = Math.max(rows[LOST_AND_FOUND] ?? 0, 0);
  const placed = Object.entries(rows)
    .filter(([table]) => table !== LOST_AND_FOUND)
    .reduce((a, [, count]) => a + count, 0);
  const tables = Object.keys(rows).filter((t) => t !== LOST_AND_FOUND).length;
  return {
    ok: true,
    detail:
      `rebuilt ${placed} rows across ${tables} tables` +
      (unplacedRows > 0
        ? `, and ${unplacedRows} more rows that could not be placed in any ` +
          `table are in ${LOST_AND_FOUND}`
        : ''),
    sqlBytes: sql.length,
    rows,
    unplacedRows,
    ms: Date.now() - started
  };
}

/**
 * `.recover` always creates `lost_and_found` for rows whose table it could not
 * identify. When it holds nothing it is noise in every later count and digest,
 * so it goes. When it holds anything at all it stays, because those rows are
 * the user's and nothing here may decide they are not worth keeping.
 */
function dropEmptyLostAndFound(db: Database.Database): void {
  try {
    const present = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='lost_and_found'"
      )
      .get();
    if (!present) return;
    const count = db
      .prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM lost_and_found')
      .get();
    if ((count?.c ?? 0) === 0) db.exec('DROP TABLE lost_and_found');
  } catch {
    /* a table we cannot inspect is a table we leave alone */
  }
}


function describeStderr(stderr: Buffer | string | null | undefined): string {
  if (!stderr) return 'no error text';
  const text = (Buffer.isBuffer(stderr) ? stderr.toString('utf8') : stderr).trim();
  return text === '' ? 'no error text' : text.slice(0, 400);
}
