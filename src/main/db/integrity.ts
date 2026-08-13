/**
 * integrity.ts — look at a SQLite file before opening it for writing, and set a
 * damaged one aside instead of writing over it (Phase 19 item 5).
 *
 * ## The failure this prevents
 *
 * `new Database(path)` on a damaged file does not refuse. SQLite opens it, and
 * the first write initialises whatever it can, so the copy the user still needs
 * is gone. Before this module there was no check anywhere in the app: research
 * 33 §3.5 entry 4 records that `src/main/db/sqlite.ts` set three pragmas and
 * nothing else. For the manifest that is the whole restore story, because the
 * manifest is the only place that records which tmux session belongs to which
 * project and how to resume its conversation.
 *
 * So the sequence is check, then set aside, then open. Never open first.
 *
 * ## Why `integrity_check` and not `quick_check`, and where that flips
 *
 * Measured on the operator's real 41 session manifest, warm, median of 21
 * runs: `quick_check` costs 0.0228 ms and `integrity_check` costs 0.0390 ms.
 * The 16 microseconds buy UNIQUE constraint checking and a proof that index
 * content matches table content. Without them an index can answer a question
 * about a value the table no longer holds, which on this schema means a lookup
 * by session name returning another session's `argv` or `cwd`.
 *
 * Research 34 §3.2 said to revisit the choice above roughly 50 MB, and the
 * measurement says that threshold is real. On a 60 MB index with 400,000 rows
 * and two indexes, `integrity_check` costs 873 ms and `quick_check` costs 43
 * ms. So the check scales with the file. The manifest is 68 KB at 41 sessions
 * and will never reach the threshold. The symbol index, which shares this
 * opener, can, and 873 ms of stall on its first search is not worth a stronger
 * check on a file the app rebuilds by walking the repository.
 *
 * ## Both failure shapes are handled, because both were measured
 *
 * Research 34 §3.2 asked for this and could not reproduce the throwing half. It
 * reproduces with a LOCATED injection. Smashing the first eight bytes of the
 * cell pointer array on the root page of an index makes `integrity_check`
 * THROW `database disk image is malformed`, while `quick_check` on the same
 * file returns rows and does not throw. Both shapes are covered here, and the
 * test suite injects at a located structure and asserts the injection changed
 * the bytes before asserting that the detector fired.
 *
 * ## What this module will not do
 *
 * It never deletes. A damaged database and every sidecar beside it are RENAMED,
 * with the suffixes kept in step so `/usr/bin/sqlite3` can still read the set.
 * If the rename cannot be done, the caller is told to refuse rather than open,
 * because an app that will not start is recoverable and an overwritten manifest
 * is not.
 */

import Database from 'better-sqlite3';
import { existsSync, renameSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * How many problems the check is asked to report before it stops. The detail
 * goes into a log line and a support answer, so ten is already more than anyone
 * reads, and an unbounded check on a badly damaged file can walk the whole tree
 * twice.
 */
const MAX_ERRORS = 10;

/**
 * At or above this size the check drops to `quick_check`. See the header for
 * the two measurements that put the line here. 50 MB is research 34's number
 * and the 60 MB measurement is on the far side of it.
 */
const STRONG_CHECK_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Everything SQLite may keep beside a database file. `-wal` and `-journal` hold
 * committed data, so they travel with the database they belong to. `-shm` is
 * shared memory bookkeeping that SQLite rebuilds, and it travels anyway, so
 * that a stale one is never left pointing at a file that moved.
 */
const SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'] as const;

/** Which check ran. Recorded so a log line never overstates what was proved. */
export type IntegrityCheckKind = 'integrity_check' | 'quick_check';

export type IntegrityVerdict =
  | { ok: true; detail: 'ok'; check: IntegrityCheckKind }
  | { ok: false; detail: string; threw: boolean; check: IntegrityCheckKind }
  /**
   * The file could not be read at all, so nothing was proved about it either
   * way. The caller must NOT quarantine and must NOT rebuild.
   */
  | {
      ok: false;
      unreadable: true;
      /** Always true: this verdict is only ever produced from a throw. */
      threw: true;
      detail: string;
      check: IntegrityCheckKind;
    };

/** True when the verdict is "could not read", not "the data is damaged". */
export function isUnreadable(v: IntegrityVerdict): boolean {
  return v.ok === false && 'unreadable' in v && v.unreadable;
}

/**
 * SQLite and libuv errors that mean the file was not readable, as against
 * damaged.
 *
 * MEASURED, and this is the defect the list closes. The operator's pristine 46
 * session manifest was placed in a directory at mode 500 and the app refused to
 * start with "The database at … is damaged (attempt to write a readonly
 * database)". The file was untouched and its sha256 was unchanged, so nothing
 * was lost, but the sentence the user reads was false about their own data and
 * would send them hunting for a quarantine that does not exist.
 *
 * `SQLITE_READONLY` and `EACCES` are the permissions shapes, and `EROFS` is a
 * read only volume, e.g. a manifest opened from a mounted disk image. `EPERM`
 * and `EBUSY` are here for the same reason: they say the caller could not get
 * at the file, not that the bytes inside it are wrong.
 */
const UNREADABLE_MARKERS = [
  'SQLITE_READONLY',
  'SQLITE_CANTOPEN',
  'SQLITE_PERM',
  'SQLITE_AUTH',
  'EACCES',
  'EROFS',
  'EPERM',
  'EBUSY',
  'attempt to write a readonly database',
  'unable to open database file'
] as const;

/** True when this error says "could not read it", not "the data is wrong". */
export function looksUnreadable(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : String(err);
  return UNREADABLE_MARKERS.some(
    (marker) => code.includes(marker) || message.includes(marker)
  );
}

/**
 * Read the file and say whether SQLite can still account for every page of it.
 *
 * Opens `{ readonly: true, fileMustExist: true }`, which is the invariant every
 * recovery path in this app holds. The reason is measured rather than assumed.
 * The last WRITE connection to close checkpoints and truncates the WAL, so a
 * helper that opens read-write "just to check" becomes a mutator of the user's
 * live database (research 34 §3.2 observed a 4096 byte `.db` with a 115,392
 * byte `-wal` under a writer becoming a 106,496 byte `.db` with an empty `-wal`
 * the moment that writer closed).
 *
 * The one trace a readonly open can leave is SQLite's own `-shm`, which is
 * bookkeeping rather than data, and which the caller is about to create anyway
 * by opening the same file for writing.
 */
export function checkDatabaseIntegrity(dbPath: string): IntegrityVerdict {
  const check: IntegrityCheckKind =
    sizeOf(dbPath) >= STRONG_CHECK_MAX_BYTES ? 'quick_check' : 'integrity_check';
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db.pragma(`${check}(${MAX_ERRORS})`) as Record<string, string>[];
    const problems = rows
      .map((r) => r[check] ?? '')
      .filter((line) => line !== '' && line !== 'ok');
    if (problems.length === 0) return { ok: true, detail: 'ok', check };
    return { ok: false, detail: problems.join('; '), threw: false, check };
  } catch (err) {
    // "Could not read it" is not "it is damaged", and conflating the two tells
    // the user their session list was destroyed when in fact it is intact and
    // Tortie could not get at it. See UNREADABLE_MARKERS for the measurement.
    if (looksUnreadable(err)) {
      return {
        ok: false,
        unreadable: true,
        threw: true,
        detail: (err as Error).message,
        check
      };
    }
    // The measured shape: a located injection makes the pragma itself throw.
    // A file that is not a database at all arrives here too, as SQLITE_NOTADB.
    return { ok: false, detail: (err as Error).message, threw: true, check };
  } finally {
    try {
      db?.close();
    } catch {
      /* closing a connection to a damaged file may itself fail */
    }
  }
}

/** Zero for anything we cannot stat, which keeps the STRONGER check. */
function sizeOf(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

export interface QuarantineOutcome {
  /** Where the damaged database now lives. */
  path: string;
  /** Every file that was moved, as absolute paths, including the database. */
  moved: string[];
}

/**
 * Move a damaged database and its sidecars out of the way, keeping the set
 * together so it can still be read.
 *
 * The name is `<original>.damaged-<stamp>`, so the result does not end in
 * `.db`. That is deliberate. The rename migration treats a `.db` suffix as a
 * database and would try to snapshot the quarantined wreck on every future
 * upgrade. A `-wal` beside it keeps the matching stem, because SQLite finds a
 * write ahead log by the database's own name.
 *
 * Throws if the rename fails. The caller must then refuse to open, because
 * opening is the thing this whole path exists to prevent.
 */
export function quarantineDatabase(
  dbPath: string,
  now: () => Date = () => new Date()
): QuarantineOutcome {
  const stamp = now()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const dir = dirname(dbPath);
  const stem = basename(dbPath);

  let target = join(dir, `${stem}.damaged-${stamp}`);
  for (let n = 2; existsSync(target); n++) {
    target = join(dir, `${stem}.damaged-${stamp}-${n}`);
  }

  const moved: string[] = [];
  renameSync(dbPath, target);
  moved.push(target);
  for (const suffix of SIDECAR_SUFFIXES) {
    const sidecar = `${dbPath}${suffix}`;
    if (!existsSync(sidecar)) continue;
    renameSync(sidecar, `${target}${suffix}`);
    moved.push(`${target}${suffix}`);
  }
  return { path: target, moved };
}
