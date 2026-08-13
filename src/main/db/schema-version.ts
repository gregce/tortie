/**
 * schema-version.ts — the three numbers that decide whether this build may
 * open this file, and the refusal that reads them (Phase 21, research 27 §4).
 *
 * ## Why the migration list is not enough
 *
 * `runMigrations` in ./sqlite.ts is name keyed. It creates a `migrations`
 * table, skips any step whose name is already recorded, and applies the rest.
 * That is the right mechanism for APPLYING steps and it stays. What it cannot
 * do is answer a different question, which is "is this file newer than me?".
 * An older build opening a newer manifest sees seven names it recognises, no
 * names it needs, and proceeds. Measured before this module existed: the live
 * manifest carried `user_version 0` and `application_id 0`, both unused, and
 * `settings.json` wrote a version field that nothing ever read.
 *
 * Research 27 §4.2 measured what happens next, with a probe that replicated
 * the real migration list and then did exactly what an older build does.
 *
 * | A newer migration…              | Old build INSERT | What the user sees        |
 * | ------------------------------- | ---------------- | ------------------------- |
 * | adds a nullable column          | works            | nothing, and that is the problem |
 * | adds `NOT NULL DEFAULT 'agent'` | works            | nothing                   |
 * | adds `NOT NULL`, no default     | throws           | a SQLite error at create  |
 * | renames a column                | throws           | a SQLite error at create  |
 *
 * The quiet row is the dangerous one. An old build writing into a newer
 * manifest succeeds and leaves the new column NULL. When that column is what
 * the restore path reads to decide whether a conversation comes back, the old
 * build has just made rows the new build cannot restore correctly, with no
 * error anywhere. That is the hazard these numbers exist to close.
 *
 * ## The three numbers
 *
 * The split is Chromium's `sql::MetaTable`, which has used it for fifteen
 * years. Check the version number when you are upgrading. Check the COMPATIBLE
 * version number to see whether you may use the file at all.
 *
 * | Number                  | Where it lives                | What it says |
 * | ----------------------- | ----------------------------- | ------------ |
 * | `application_id`        | `PRAGMA application_id`       | this file belongs to this app |
 * | `user_version`          | `PRAGMA user_version`         | the schema the file is at |
 * | `min_compatible_version`| a row in the `meta` table     | the oldest build that may still write it |
 *
 * An additive migration bumps `user_version` and leaves `min_compatible_version`
 * alone. A breaking migration bumps both. The rule for what counts as breaking
 * is stricter than SQLite's tolerance, and it is the whole point: bump
 * `min_compatible_version` whenever a new column is REQUIRED for correct
 * restore, even in the case where SQLite would happily let an old build write
 * without it.
 *
 * ## What the refusal costs the user, and why it is the right answer
 *
 * Nothing that they cannot get back by opening the newer build. Tortie's
 * sessions live in the private tmux server, not in the app, so a refusal costs
 * visibility and not work. The agents keep running and the conversations stay
 * resumable. In an app that owned its own processes refusing to open would be
 * the wrong answer. Here it is the only safe one.
 *
 * ## What this does NOT protect against, stated plainly
 *
 * A build that shipped BEFORE this module has no refusal in it, so it will
 * still open a newer file and write NULLs. The protection starts with the
 * first build that carries this code and runs forward from there. There is no
 * way to fix that retroactively, and pretending otherwise would be worse than
 * saying it.
 *
 * ## No down migrations, ever
 *
 * There is no `down` path in the runner and none is added here. Writing one
 * means writing the code that deletes the user's newest data. The downgrade
 * story is the kept copy of the old schema instead. See
 * `manifest/boot.ts` and research 27 §4.5.
 */

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

/** The table the compatibility statement lives in. */
export const META_TABLE = 'meta';

/** Key of the oldest schema version whose code may still write this file. */
export const META_MIN_COMPATIBLE = 'min_compatible_version';

/** Key of the app version that last opened this file. */
export const META_LAST_OPENED_BY = 'last_opened_by';

/**
 * What one build claims about one database.
 *
 * Declared beside the database it describes, never passed around as loose
 * numbers, so a caller cannot pair one database's version with another's
 * minimum.
 */
export interface SchemaIdentity {
  /** Human name for the file, used in the refusal the user reads. */
  label: string;
  /** `PRAGMA application_id`. A fixed constant per database, never changed. */
  applicationId: number;
  /** The schema version this build writes. */
  version: number;
  /** The oldest schema version whose code may still operate the file. */
  minCompatible: number;
}

/** What the file on disk says about itself. */
export interface SchemaStateOnDisk {
  applicationId: number;
  userVersion: number;
  /** Null when the file has no `meta` table or no row for the key. */
  minCompatible: number | null;
  /** Null for a file written before this module existed. */
  lastOpenedBy: string | null;
}

/**
 * The file needs a newer build than this one. Thrown BEFORE anything is
 * opened for writing and before any migration runs.
 *
 * It carries the numbers rather than only a sentence, so a blocking screen can
 * name them and a support answer can quote them.
 */
export class DatabaseTooNewError extends Error {
  readonly dbPath: string;
  readonly fileVersion: number;
  readonly fileMinCompatible: number;
  readonly buildVersion: number;

  constructor(args: {
    dbPath: string;
    label: string;
    fileVersion: number;
    fileMinCompatible: number;
    buildVersion: number;
  }) {
    super(
      `This copy of Tortie is older than your ${args.label}. Your sessions ` +
        'are safe and they are still running. This copy understands format ' +
        `${String(args.buildVersion)} and the file needs ` +
        `${String(args.fileMinCompatible)} or newer. Open the newer Tortie ` +
        'to see them. Nothing was changed.'
    );
    this.name = 'DatabaseTooNewError';
    this.dbPath = args.dbPath;
    this.fileVersion = args.fileVersion;
    this.fileMinCompatible = args.fileMinCompatible;
    this.buildVersion = args.buildVersion;
  }
}

/**
 * The file carries a different app's `application_id`.
 *
 * A wrong file opened by accident is caught here rather than migrated. The
 * migration runner would otherwise add Tortie's columns to somebody else's
 * database, which is a change nothing can undo.
 */
export class WrongDatabaseError extends Error {
  readonly dbPath: string;
  readonly foundApplicationId: number;
  readonly expectedApplicationId: number;

  constructor(args: {
    dbPath: string;
    label: string;
    found: number;
    expected: number;
  }) {
    super(
      `The file at ${args.dbPath} is not a Tortie ${args.label}. It carries ` +
        `application id ${String(args.found)} and Tortie writes ` +
        `${String(args.expected)}. Nothing was changed.`
    );
    this.name = 'WrongDatabaseError';
    this.dbPath = args.dbPath;
    this.foundApplicationId = args.found;
    this.expectedApplicationId = args.expected;
  }
}

/** True for either refusal, for a caller that treats them the same way. */
export function isSchemaRefusal(
  err: unknown
): err is DatabaseTooNewError | WrongDatabaseError {
  return err instanceof DatabaseTooNewError || err instanceof WrongDatabaseError;
}

/** Read the three numbers off an OPEN connection. */
export function readSchemaState(db: Database.Database): SchemaStateOnDisk {
  const applicationId = firstPragmaNumber(db, 'application_id');
  const userVersion = firstPragmaNumber(db, 'user_version');
  return {
    applicationId,
    userVersion,
    minCompatible: readMetaNumber(db, META_MIN_COMPATIBLE),
    lastOpenedBy: readMetaText(db, META_LAST_OPENED_BY)
  };
}

/**
 * Read the three numbers off a file, WITHOUT opening it for writing.
 *
 * Read only is not a detail here. Research 34 §3.2 measured the reason: the
 * last write connection to close checkpoints and truncates the write ahead
 * log, so a helper that opens read write "just to check" becomes a mutator of
 * the user's live manifest. The whole promise of the refusal is that a build
 * that must not touch the file does not touch it.
 *
 * Returns null when there is no file, or when the file cannot be read at all.
 * Both mean the same thing to the caller: nothing has been proved, so do not
 * refuse on this evidence. A damaged file is the integrity gate's job, not
 * this one's, and a second module deciding a manifest is damaged is a second
 * module that can be wrong about it.
 */
export function readSchemaStateAt(dbPath: string): SchemaStateOnDisk | null {
  if (!existsSync(dbPath)) return null;
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    return readSchemaState(db);
  } catch {
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      /* a connection that will not close must not mask the answer */
    }
  }
}

/**
 * Refuse when the file needs a newer build, or when it is not ours at all.
 *
 * Call it with the state read from a READ ONLY handle, before the writable
 * open and before any migration. A state of null means nothing was proved and
 * nothing is refused.
 *
 * A file whose `application_id` is 0 is accepted. Every manifest written
 * before this module existed is in that state, and refusing them all would
 * refuse every user Tortie already has.
 *
 * @throws DatabaseTooNewError when `min_compatible_version` exceeds this build.
 * @throws WrongDatabaseError when a non zero `application_id` is not ours.
 */
export function assertDatabaseUsable(
  dbPath: string,
  state: SchemaStateOnDisk | null,
  identity: SchemaIdentity
): void {
  if (state === null) return;

  if (state.applicationId !== 0 && state.applicationId !== identity.applicationId) {
    throw new WrongDatabaseError({
      dbPath,
      label: identity.label,
      found: state.applicationId,
      expected: identity.applicationId
    });
  }

  // Only the MINIMUM decides. A file at a higher `user_version` whose minimum
  // this build still satisfies is a file an additive migration produced, and
  // additive is exactly the case that was measured safe.
  if (state.minCompatible !== null && state.minCompatible > identity.version) {
    throw new DatabaseTooNewError({
      dbPath,
      label: identity.label,
      fileVersion: state.userVersion,
      fileMinCompatible: state.minCompatible,
      buildVersion: identity.version
    });
  }
}

/**
 * The same check, done from the path. The convenience the store's constructor
 * uses so that the read only rule cannot be forgotten at a call site.
 */
export function assertDatabaseUsableAt(
  dbPath: string,
  identity: SchemaIdentity
): void {
  assertDatabaseUsable(dbPath, readSchemaStateAt(dbPath), identity);
}

/**
 * Write the three numbers, plus the app version that last opened the file.
 *
 * Call it AFTER the migrations have run, on the writable connection. It is
 * idempotent and it writes nothing when nothing changed, which matters more
 * than it looks: the backup ring decides whether to take a generation by
 * hashing the content of every user table, so a stamp that rewrote the same
 * value on every launch would make the ring copy the manifest on every launch
 * for no reason.
 *
 * `openedBy` is the app version alone with no timestamp, for the same reason.
 * A timestamp would move on every boot and produce the same pointless copies.
 */
export function stampSchemaVersion(
  db: Database.Database,
  identity: SchemaIdentity,
  openedBy: string
): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${META_TABLE} (
       key   TEXT PRIMARY KEY,
       value TEXT NOT NULL
     );`
  );

  const state = readSchemaState(db);

  if (state.applicationId !== identity.applicationId) {
    db.pragma(`application_id = ${String(identity.applicationId)}`);
  }
  if (state.userVersion !== identity.version) {
    db.pragma(`user_version = ${String(identity.version)}`);
  }
  if (state.minCompatible !== identity.minCompatible) {
    writeMeta(db, META_MIN_COMPATIBLE, String(identity.minCompatible));
  }
  if (state.lastOpenedBy !== openedBy) {
    writeMeta(db, META_LAST_OPENED_BY, openedBy);
  }
}

/**
 * One line for the diagnostics block, e.g.
 * `manifest schema 8 (min compatible 8), last opened by 0.0.1`.
 *
 * Research 27 §4.7 puts this in the copyable support block rather than in
 * About, because it is machinery and not a product fact.
 */
export function describeSchemaState(
  label: string,
  state: SchemaStateOnDisk | null
): string {
  if (state === null) return `${label}: not readable`;
  const min =
    state.minCompatible === null ? 'unset' : String(state.minCompatible);
  const by = state.lastOpenedBy ?? 'unknown';
  return (
    `${label} schema ${String(state.userVersion)} (min compatible ${min}), ` +
    `last opened by ${by}`
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function firstPragmaNumber(db: Database.Database, name: string): number {
  const raw = db.pragma(name) as unknown;
  if (typeof raw === 'number') return raw;
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    const value = first === undefined ? undefined : Object.values(first)[0];
    if (typeof value === 'number') return value;
  }
  return 0;
}

function readMetaRow(
  db: Database.Database,
  key: string
): { value: string } | undefined {
  try {
    return db
      .prepare<[string], { value: string }>(
        `SELECT value FROM ${META_TABLE} WHERE key = ?`
      )
      .get(key);
  } catch {
    // No `meta` table. Every manifest written before this module is in that
    // state, and "no statement" is the honest reading of it.
    return undefined;
  }
}

function readMetaNumber(db: Database.Database, key: string): number | null {
  const row = readMetaRow(db, key);
  if (row === undefined) return null;
  const n = Number.parseInt(row.value, 10);
  return Number.isFinite(n) ? n : null;
}

function readMetaText(db: Database.Database, key: string): string | null {
  return readMetaRow(db, key)?.value ?? null;
}

function writeMeta(db: Database.Database, key: string, value: string): void {
  db.prepare<[string, string]>(
    `INSERT INTO ${META_TABLE} (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}
