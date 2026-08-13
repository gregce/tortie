/**
 * recovery.ts. The verified backup ring for the manifest (Phase 20 items 1
 * to 3).
 *
 * ## The loss this exists to prevent
 *
 * The manifest is the only single file whose loss is total across every
 * project. There is one copy of it. If it goes, every durable session is
 * stranded, because Tortie correctly refuses to adopt a live tmux session it
 * has no record of (CLAUDE.md invariant 4). The processes keep running and the
 * app cannot reach them. So this module keeps several verified copies of it
 * instead of none.
 *
 * ## Two things here, and the first one is not new code
 *
 * The first half is the COPY ENGINE, moved out of ../migrate/userdata.ts
 * rather than written again. Research 33 §4 names that module as the place the
 * engine already exists, says to generalise it into this file, and says not to
 * write a `db.backup()` path from scratch. The engine has been run against the
 * operator's real user data. `snapshotDatabase` below is that code, with three
 * changes: it is callable by anything, it retries when the source moved under
 * it, and it is honest about the difference between a source that moved and a
 * copy that is wrong.
 *
 * The second half is the RING. Several generations, each produced by
 * `VACUUM INTO`, each verified by the Phase 19 content hash in ../db/digest.ts.
 *
 * ## Why every copy is a `VACUUM INTO` and never a file copy
 *
 * Measured on the operator's manifest on 2026-08-12: the database is 77,824
 * bytes and its write ahead log is 2,599,752 bytes. A plain copy of the three
 * files would read the database, the log and the shared memory index at three
 * different instants, which is exactly the torn copy this machinery exists to
 * avoid. Research 34 §3.2 measured that shape at a 60 percent failure rate over
 * 150 attempts with a live writer. `VACUUM INTO` reads through the log from a
 * read only connection and writes one self contained file holding every
 * committed transaction. It cost 0.88 ms and produced 73,728 bytes on that same
 * manifest, and the source database, log and shared memory index were all
 * byte identical afterwards.
 *
 * The read only open is the invariant, not a preference. The last WRITE
 * connection to close checkpoints and truncates the log, so a helper that opens
 * the user's live manifest read write "just to check" becomes a mutator of it.
 *
 * ## The layout
 *
 *     <userData>/gmux/backups/manifest.db.000005   body, generation 5, newest
 *     <userData>/gmux/backups/manifest.db.000004   body, generation 4
 *     <userData>/gmux/backups/manifest.backups.json  the completion record
 *     <userData>/gmux/backups/.manifest.db.<stamp>.part   a staged copy
 *
 * No body ends in `.db`. That is deliberate and it is the same reason
 * ../db/integrity.ts gives for its quarantine names. The rename migration
 * treats a `.db` suffix as a database to snapshot, and it must not try to
 * snapshot the ring on every future upgrade.
 *
 * ## The completion record is a file, and here it has to be
 *
 * ../restore/snapshots.ts records a known deviation from research 34 §4 step 9,
 * which puts the completion record in the manifest. For the manifest's own
 * backups there is no deviation to record, because the record cannot live
 * inside the thing it is a backup of. A manifest that is gone takes its own
 * backup index with it. The index is written through the same durable sequence
 * as a body, so a reader sees either the whole previous record or the whole new
 * one.
 *
 * ## The order, which is the part that is easy to get backwards
 *
 *  1. Copy the database into a staged file with `VACUUM INTO`.
 *  2. Check the staged file, then publish it as the next generation through
 *     ../durable, which flushes the directory before it returns.
 *  3. Write the completion record naming it. The record must never become
 *     durable before the body it points at.
 *  4. Prune, and only then. Pruning before the record commits puts back the
 *     single point of failure that generations exist to remove.
 *
 * ## The pruning invariant
 *
 * Research 33 entry 8 states it and it is the part of this phase to get right.
 * A prune can never remove the current generation and its last verified
 * predecessor together. Two things enforce it here and they are independent.
 *
 *  - The completion record carries the current generation plus predecessors
 *    WHOSE BODIES VERIFY. A predecessor whose bytes no longer match its record
 *    is dropped from the record rather than occupying a slot, because a body
 *    nothing can vouch for is unreadable by design and is not a fallback.
 *  - `pruneBackupRing` protects exactly the generations the record names and
 *    deletes only outside that set, so an interrupted prune leaves every
 *    protected generation in place. The record is written before the first
 *    unlink, so a crash at any point during the prune leaves at least the
 *    current generation and its last verified predecessor on disk.
 *
 * ## What this module does NOT do
 *
 * It does not copy anything off this device. The ring sits on the same disk as
 * the thing it copies, so it does nothing about a failed drive or a stolen
 * machine. Exporting a verified copy is a separate and later item, gated behind
 * this one on purpose, because exporting unverified generations would convert an
 * integrity gap into a portable one.
 *
 * It does not reconstruct a manifest from tmux and the snapshot capsules. That
 * is Phase 20 item 5, it needs an explicit human decision, and it lives in its
 * own module.
 *
 * It does not decide WHEN to run. This module makes a generation and proves it.
 * ./ring-schedule.ts decides at which moments one is taken, and it is the only
 * place that decides. Nothing here polls, and nothing here holds a timer.
 */

import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { digestDifferences, tableDigests, tableRowCounts } from '../db/digest';
import { checkDatabaseIntegrity } from '../db/integrity';
import {
  flushDirectory,
  generationPath,
  listGenerations,
  nextGeneration,
  nodeDurableFs,
  pruneGenerations,
  sha256Of,
  writeDurable,
  PART_SUFFIX,
  type DurableFs
} from '../durable';
import { defaultManifestDbPath } from './store';

// ---------------------------------------------------------------------------
// Part one: the copy engine, generalised out of ../migrate/userdata.ts
// ---------------------------------------------------------------------------

/** How the copy was taken. `raw-copy` belongs to the caller, not to this file. */
export type DatabaseCopyMethod = 'vacuum-into' | 'raw-copy';

/** What one read only connection can say about a database's contents. */
export interface DatabaseEvidence {
  /** table to row count. What a person reads in a log line. Not the proof. */
  counts: Record<string, number>;
  /** table to sha256 over its rows in a fixed order. This is the proof. */
  digests: Record<string, string>;
  /** Set when the file could not be opened or read as a database. */
  error?: string;
}

/**
 * Row counts and per table content hashes, read from one database with a read
 * only connection.
 *
 * Both are returned empty with `error` set when the file is not a readable
 * SQLite database. That is not always a failure: the rename migration copies a
 * `.db` that is something else byte for byte and verifies it that way.
 *
 * The `-shm` this open creates is removed again when there was not one before,
 * so reading evidence from a copy does not leave a file beside it that the copy
 * did not arrive with.
 */
export function readDatabaseEvidence(path: string): DatabaseEvidence {
  const hadShm = existsSync(`${path}-shm`);
  let db: Database.Database | null = null;
  try {
    db = new Database(path, { readonly: true, fileMustExist: true });
    return { counts: tableRowCounts(db), digests: tableDigests(db) };
  } catch (err) {
    return { counts: {}, digests: {}, error: (err as Error).message };
  } finally {
    try {
      db?.close();
    } catch {
      /* closing a connection to a damaged file may itself fail */
    }
    if (!hadShm) rmSync(`${path}-shm`, { force: true });
  }
}

export interface SnapshotDatabaseOptions {
  /** The database to copy. Only ever opened read only. */
  from: string;
  /** Where the copy is written. Anything already there is removed first. */
  to: string;
  /**
   * How many times to redo the whole copy when the source moved under it.
   *
   * A source that is being written commits between the copy and the check, and
   * the check then reports tables that differ even though the copy itself is a
   * perfectly consistent snapshot. Retrying is what turns that into a clean
   * result on a busy manifest. Three attempts, because the whole operation is
   * about 1.2 ms on the real manifest and a source that has moved three times
   * inside 4 ms is a source that will still be moving on the fourth try.
   */
  attempts?: number;
}

export interface DatabaseSnapshotResult {
  method: DatabaseCopyMethod;
  from: string;
  to: string;
  /** Bytes of the file that was produced. */
  bytes: number;
  /** Row counts read from the SOURCE. */
  source: Record<string, number>;
  /** Row counts read from the COPY. */
  copy: Record<string, number>;
  /** Per table content hashes read from the SOURCE. */
  sourceDigests: Record<string, string>;
  /** Per table content hashes read from the COPY. */
  copyDigests: Record<string, string>;
  /** Tables the two sides disagree about. Empty when they hold the same rows. */
  differences: string[];
  /** True when the copy holds exactly the rows the source held. */
  ok: boolean;
  /**
   * True when the copy is consistent but the source moved on before it could
   * be compared. `ok` is false and the copy is still usable. See `attempts`.
   */
  drifted: boolean;
  /** How many copies were taken before this result. */
  attempts: number;
  /** Wall clock milliseconds for the whole call. */
  ms: number;
}

/**
 * Copy one SQLite database to a new file and prove the copy holds the same
 * rows.
 *
 * The copy is a `VACUUM INTO` from a read only connection, which reads through
 * the write ahead log and yields one consistent file. The proof is the per
 * table content hash from ../db/digest.ts, read separately from the source and
 * from the copy. Row counts are recorded because they are what a person reads,
 * and they are NOT what decides `ok`. Research 34 §3.2 measured a copy of the
 * real manifest with identical counts in every table, passing an integrity
 * check, and stale on all 40 rows, because this manifest's churn is `UPDATE`
 * against `last_seen` and `status` and a count cannot see an `UPDATE`.
 *
 * The source digests are read straight after the copy rather than before it, so
 * the two reads sit either side of nothing but the copy itself.
 *
 * Throws only when the copy could not be taken at all. A copy that was taken
 * and then disagreed with its source comes back with `ok: false`, so the caller
 * can decide what that means. It means different things: for the rename
 * migration it means abort, and for the backup ring it means the app was
 * writing at the time.
 */
export function snapshotDatabase(
  options: SnapshotDatabaseOptions
): DatabaseSnapshotResult {
  const started = Date.now();
  const attempts = Math.max(1, options.attempts ?? DEFAULT_COPY_ATTEMPTS);
  let last: Omit<DatabaseSnapshotResult, 'ms' | 'attempts'> | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    removeDatabaseFiles(options.to);
    let source: Database.Database | null = null;
    try {
      source = new Database(options.from, { readonly: true, fileMustExist: true });
      source.exec(`VACUUM INTO ${quoteSqlString(options.to)}`);
      // Read AFTER the copy, so nothing but the copy sits between the snapshot
      // the copy holds and the state the source is being compared in.
      const sourceCounts = tableRowCounts(source);
      const sourceDigests = tableDigests(source);
      source.close();
      source = null;

      const copy = readDatabaseEvidence(options.to);
      if (copy.error !== undefined) {
        throw new Error(`the copy at ${options.to} could not be read: ${copy.error}`);
      }
      const differences = digestDifferences(sourceDigests, copy.digests);
      last = {
        method: 'vacuum-into',
        from: options.from,
        to: options.to,
        bytes: sizeOf(options.to),
        source: sourceCounts,
        copy: copy.counts,
        sourceDigests,
        copyDigests: copy.digests,
        differences,
        ok: differences.length === 0,
        drifted: differences.length > 0
      };
      if (last.ok) return { ...last, attempts: attempt, ms: Date.now() - started };
    } catch (err) {
      try {
        source?.close();
      } catch {
        /* a connection that will not close must not mask the real error */
      }
      removeDatabaseFiles(options.to);
      throw err;
    }
  }

  // Unreachable with attempts >= 1: the loop either returns or sets `last`.
  if (last === null) throw new Error(`no copy of ${options.from} was attempted`);
  return { ...last, attempts, ms: Date.now() - started };
}

/** Three. See SnapshotDatabaseOptions.attempts for the reasoning. */
const DEFAULT_COPY_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Part two: the ring
// ---------------------------------------------------------------------------

/**
 * Generations kept.
 *
 * Five, and the number is a disk bill rather than a guess. One generation of
 * the operator's manifest is 73,728 bytes, so five cost 360 KB. The snapshot
 * directory on the same machine is already 1.2 MB, so the ring is a quarter of
 * what scrollback for one fleet costs.
 *
 * Say plainly what five buys, because the honest answer is smaller than it
 * sounds. The span the ring covers is five times the gap between takes, and
 * ./ring-schedule.ts takes one at most every five minutes and only when the
 * manifest's content has actually changed. So a busy hour leaves the oldest
 * generation twenty minutes old, and a quiet day leaves it a day old. Damage
 * that goes unnoticed for longer than that span is copied into every generation
 * in turn and the ring does not help. A ring spread deliberately over hours,
 * days and weeks would help, and it is not built here.
 */
export const BACKUP_GENERATIONS = 5;

/** Record shape of one capsule. Bumped when a field changes meaning. */
export const BACKUP_CAPSULE_VERSION = 1;

/** The stem every generation of the manifest backup hangs off. */
export const BACKUP_STEM = 'manifest.db';

/** Name of the completion record inside the backups directory. */
export const BACKUP_INDEX_NAME = 'manifest.backups.json';

/**
 * How long a body may be before the ring refuses to take it.
 *
 * The publish step holds the whole body in memory so that it can go through the
 * one durable write sequence the product owns rather than through a second one.
 * At 74 KB that is free. The cap is here so that pointing this at a database
 * that is not the manifest fails with a sentence rather than by allocating a
 * gigabyte.
 */
export const MAX_RING_BODY_BYTES = 64 * 1024 * 1024;

/**
 * Why a generation was taken. Recorded so a person can read the ring.
 *
 * The members are `RingReason` in ./ring-schedule.ts plus `unknown`, so the
 * schedule's reason is passed straight through and there is no mapping table
 * between two lists that can drift apart. `unknown` is for a caller outside the
 * schedule, e.g. a test or a harness.
 */
export type BackupReason =
  /** A schema migration is about to run. */
  | 'pre-migration'
  /** The app started. */
  | 'launch'
  /** The interval came round while the app was running. */
  | 'interval'
  /** The machine is suspending. */
  | 'suspend'
  /** The app is quitting. */
  | 'quit'
  /** The user asked for one. */
  | 'manual'
  /** The caller did not say. */
  | 'unknown';

/**
 * Named points a harness can turn into a crash.
 *
 * All five are members of `FAULT_POINTS` in ../fault/inject.ts, and `./boot.ts`
 * passes `onPoint: faultPoint` on both production paths, so the harness can turn
 * any of them into a real SIGKILL. This union is kept separate from that one on
 * purpose, so this module stays a leaf a unit test can drive with its own
 * function. `boot.ts` holds a compile time assertion that the five names are a
 * subset, so adding one here and forgetting it there stops the build.
 *
 * MEASURED, with `npm run smoke:fault`. After a SIGKILL at each of the four
 * points the harness arms, the ring came back with every recorded generation
 * verifying: `after-copy#5` left 4 of 4, `after-body#5` left 4 of 4 plus one
 * unrecorded body a reader ignores, `after-record#5` left 5 of 5, and
 * `prune.before-unlink` left 5 of 5 plus the body the prune had not yet removed.
 */
export type BackupFaultPoint =
  /** Nothing has been written yet. */
  | 'backup.before-copy'
  /** The staged copy exists and nothing records it. */
  | 'backup.after-copy'
  /** The body is published and flushed and nothing records it. */
  | 'backup.after-body'
  /** The record is durable and the prune has not run. */
  | 'backup.after-record'
  /** About to remove one generation during a prune. */
  | 'backup.prune.before-unlink';

/** Synchronous on purpose, so a harness can SIGKILL inside it. */
export type BackupFaultHook = (point: BackupFaultPoint) => void;

/** Everything a reader needs about one generation. */
export interface BackupCapsule {
  /** Record shape. See BACKUP_CAPSULE_VERSION. */
  version: number;
  /** This generation's number. Higher is newer. */
  generation: number;
  /** The generation this one supersedes, or null when it is the first. */
  parent: number | null;
  /** Absolute path of the body when it was written. Never followed on read. */
  path: string;
  /** The database this generation was copied from. */
  source: string;
  /** Byte length of the body. */
  bytes: number;
  /** Hex sha256 of the body. */
  sha256: string;
  /**
   * table to sha256 over its rows, read from the BODY. This is what a later
   * restore re-reads and compares, and it is the Phase 19 hash rather than a
   * second verification invented here.
   */
  digests: Record<string, string>;
  /** table to row count, read from the body. For the log line, not the proof. */
  rows: Record<string, number>;
  /** What `integrity_check` said about the body. `ok`, or the problem. */
  integrity: string;
  /** True when the source was proved to hold the same rows as the body. */
  sourceMatched: boolean;
  /** Tables the source and the body disagreed about. Empty when they agree. */
  differences: string[];
  /** Why the capture ran. */
  reason: BackupReason;
  /** When the capture completed. Epoch milliseconds. */
  capturedAt: number;
  /** Wall clock milliseconds the capture took. */
  ms: number;
}

/** The completion record file, newest capsule first. */
interface BackupIndexFile {
  version: number;
  source: string;
  capsules: BackupCapsule[];
}

/** Where the ring lives. Sibling of the manifest, inside `<userData>/gmux`. */
export function backupsDir(): string {
  return join(dirname(defaultManifestDbPath()), 'backups');
}

/** Absolute path of one generation's body. */
export function backupBodyPath(generation: number, dir: string = backupsDir()): string {
  return generationPath(dir, BACKUP_STEM, generation);
}

/** Absolute path of the completion record. */
export function backupIndexPath(dir: string = backupsDir()): string {
  return join(dir, BACKUP_INDEX_NAME);
}

/**
 * The completion record, newest capsule first.
 *
 * Anything unreadable or malformed comes back as an empty list rather than a
 * throw. A damaged record must degrade to "no verified backup", which is a
 * state the caller can report, and never to a failed launch.
 */
export function readBackupIndex(dir: string = backupsDir()): BackupCapsule[] {
  let raw: string;
  try {
    raw = readFileSync(backupIndexPath(dir), 'utf8');
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const file = parsed as Partial<BackupIndexFile> | null;
  if (file === null || typeof file !== 'object' || !Array.isArray(file.capsules)) return [];
  const capsules: BackupCapsule[] = [];
  for (const candidate of file.capsules) {
    const capsule = sanitizeCapsule(candidate);
    if (capsule !== null) capsules.push(capsule);
  }
  capsules.sort((a, b) => b.generation - a.generation);
  return capsules;
}

/**
 * Read one body back and prove it against its record.
 *
 * The length is checked first. It is free, and it rejects the truncation case
 * without hashing a file that cannot be right.
 *
 * The path is DERIVED from the generation rather than read out of the record.
 * The record is a file in a directory the app writes, and a reader that
 * followed a path out of it would open whatever a damaged or edited record
 * named. The recorded path is kept because it says where the body was written.
 */
export function backupBodyVerifies(capsule: BackupCapsule, dir: string): boolean {
  let data: Buffer;
  try {
    data = readFileSync(backupBodyPath(capsule.generation, dir));
  } catch {
    return false;
  }
  if (data.length !== capsule.bytes) return false;
  return sha256Of(data) === capsule.sha256;
}

/** What a reader should open, and how many newer generations were rejected. */
export interface BackupResolution {
  path: string;
  capsule: BackupCapsule;
  /** How many newer recorded generations failed before this one proved out. */
  rejected: number;
}

/**
 * The newest generation whose bytes prove out, or null when there is none.
 *
 * A body with no record is never returned. Nothing vouches for its bytes, and a
 * crash inside a capture leaves exactly such a body.
 */
export function resolveVerifiedBackup(
  dir: string = backupsDir(),
  capsules: readonly BackupCapsule[] = readBackupIndex(dir)
): BackupResolution | null {
  let rejected = 0;
  for (const capsule of capsules) {
    if (!backupBodyVerifies(capsule, dir)) {
      rejected += 1;
      continue;
    }
    return { path: backupBodyPath(capsule.generation, dir), capsule, rejected };
  }
  return null;
}

// ---------------------------------------------------------------------------
// The write path
// ---------------------------------------------------------------------------

export interface CaptureBackupOptions {
  /** The database to copy. Defaults to the app's manifest. */
  source?: string;
  /** Where the ring lives. Defaults to `<userData>/gmux/backups`. */
  dir?: string;
  /** Why this capture is running. Defaults to `unknown`. */
  reason?: BackupReason;
  /** How many generations to keep. Defaults to BACKUP_GENERATIONS. */
  keep?: number;
  /** Filesystem seam, for tests. Production leaves it out. */
  fs?: DurableFs;
  /** Crash points, for a harness. See BackupFaultPoint. */
  onPoint?: BackupFaultHook;
  /** Test seam for the capture timestamp. */
  now?: () => number;
}

export interface BackupCaptureResult {
  capsule: BackupCapsule;
  /** Generations the record names after this capture, newest first. */
  recorded: number[];
  /** Bodies the prune removed. */
  removed: string[];
  /** Staged files from an earlier crash the prune swept. */
  sweptParts: string[];
}

/**
 * Take one generation of the manifest and publish it.
 *
 * Durable by contract. When this returns, the bytes are on disk, they have been
 * read back and hashed, their directory has been flushed, and a record naming
 * them is itself durable. When it throws, nothing was recorded and the previous
 * generation is still the newest one a reader will find.
 *
 * The steps are numbered in the module header. The two staged files are the
 * honest cost of reusing the one durable write sequence the product owns:
 * `VACUUM INTO` writes a file rather than handing back bytes, so the copy is
 * staged once by SQLite and once by ../durable. At 74 KB that is 148 KB of
 * short lived disk and one extra read.
 */
export async function captureManifestBackup(
  options: CaptureBackupOptions = {}
): Promise<BackupCaptureResult> {
  return withRingLock(() => captureLocked(options));
}

async function captureLocked(
  options: CaptureBackupOptions
): Promise<BackupCaptureResult> {
  const started = Date.now();
  const now = options.now ?? (() => Date.now());
  const source = options.source ?? defaultManifestDbPath();
  const dir = options.dir ?? backupsDir();
  const keep = Math.max(2, options.keep ?? BACKUP_GENERATIONS);
  const fs = options.fs ?? nodeDurableFs();
  const point = options.onPoint ?? noPoint;

  point('backup.before-copy');

  // Made before the generation is chosen, because the number is read out of
  // this directory. Creating it is flushed into its parent for the same reason
  // every rename here is: a directory entry that is only in the page cache does
  // not survive a power cut, and it would take the whole ring with it.
  const created = await fs.mkdir(dir);
  if (created !== undefined) await flushDirectory(dirname(created), fs).catch(() => undefined);

  // The number comes off the DISK, so a body a crash left behind cannot be
  // written over. The parent comes off the RECORD, so the chain of capsules a
  // reader walks never points at a generation that has no capsule.
  const recordedBefore = readBackupIndex(dir);
  const generation = await nextGeneration(dir, BACKUP_STEM, fs);
  const parent = recordedBefore[0]?.generation ?? null;
  const bodyPath = backupBodyPath(generation, dir);
  // Four random bytes as well as the time, for the same reason ../durable/
  // write.ts carries them: two captures inside one millisecond would otherwise
  // stage the same file.
  const staged = join(
    dir,
    `.${BACKUP_STEM}.${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.vacuum${PART_SUFFIX}`
  );

  const copy = snapshotDatabase({ from: source, to: staged });
  point('backup.after-copy');

  let body: Buffer;
  let integrity: string;
  try {
    if (copy.bytes > MAX_RING_BODY_BYTES) {
      throw new Error(
        `${source} is ${String(copy.bytes)} bytes, and the ring refuses bodies ` +
          `over ${String(MAX_RING_BODY_BYTES)} bytes`
      );
    }
    // A copy that SQLite cannot account for is not a backup. This is the same
    // check ../db/integrity.ts runs before the app opens a database, run here
    // on the file about to be recorded as good.
    const verdict = checkDatabaseIntegrity(staged);
    integrity = verdict.ok ? 'ok' : verdict.detail;
    if (!verdict.ok) {
      throw new Error(`the copy of ${source} is damaged: ${verdict.detail}`);
    }
    body = readFileSync(staged);
  } catch (err) {
    removeDatabaseFiles(staged);
    throw err;
  }

  // Steps 1 to 8 of research 34 §4. Throws rather than publishing a file it
  // cannot prove. The staged copy goes only after the body is published, so a
  // crash between them leaves a sweepable file rather than nothing.
  const receipt = await writeDurable({ path: bodyPath, data: body }, { fs });
  removeDatabaseFiles(staged);
  point('backup.after-body');

  const capsule: BackupCapsule = {
    version: BACKUP_CAPSULE_VERSION,
    generation,
    parent,
    path: receipt.path,
    source,
    bytes: receipt.bytes,
    sha256: receipt.sha256,
    digests: copy.copyDigests,
    rows: copy.copy,
    integrity,
    sourceMatched: copy.ok,
    differences: copy.differences,
    reason: options.reason ?? 'unknown',
    capturedAt: now(),
    ms: Date.now() - started
  };

  // Step 9. The record, and it may not become durable before step 8 returned.
  // `writeDurable` returns only after the body's directory flush, so this line
  // running at all is the proof of that ordering.
  let recorded: BackupCapsule[];
  try {
    recorded = await writeBackupIndex({
      dir,
      source,
      capsule,
      recordedBefore,
      keep,
      fs
    });
  } catch (err) {
    // An unrecorded body is unreadable by design, and leaving it would let it
    // crowd a recorded generation out of the ring. Take it back out.
    await fs.unlink(bodyPath).catch(() => undefined);
    throw err;
  }
  point('backup.after-record');

  // Step 10, and only now.
  const pruned = await pruneBackupRing({
    dir,
    keep,
    fs,
    onPoint: options.onPoint,
    recorded
  });

  return {
    capsule,
    recorded: recorded.map((c) => c.generation),
    removed: pruned.removed,
    sweptParts: pruned.sweptParts
  };
}

/**
 * Write the completion record and return the capsules it names, newest first.
 *
 * THE PREDECESSORS IT CARRIES FORWARD ARE THE ONES WHOSE BODIES VERIFY. A
 * capsule whose body is missing or whose bytes no longer match is dropped
 * rather than carried, for two reasons. It is not a fallback, because a reader
 * refuses bytes it cannot prove. And carrying it would occupy a slot that a
 * body a reader could actually use has to compete for, which is the shape the
 * Phase 19 fix round measured taking the verified fallbacks from one to zero.
 */
async function writeBackupIndex(args: {
  dir: string;
  source: string;
  capsule: BackupCapsule;
  recordedBefore: readonly BackupCapsule[];
  keep: number;
  fs: DurableFs;
}): Promise<BackupCapsule[]> {
  const kept = args.recordedBefore
    .filter((old) => old.generation !== args.capsule.generation)
    .sort((a, b) => b.generation - a.generation)
    .filter((old) => backupBodyVerifies(old, args.dir))
    .slice(0, args.keep - 1);
  const file: BackupIndexFile = {
    version: BACKUP_CAPSULE_VERSION,
    source: args.source,
    capsules: [args.capsule, ...kept]
  };
  await writeDurable(
    { path: backupIndexPath(args.dir), data: `${JSON.stringify(file, null, 2)}\n` },
    { fs: args.fs }
  );
  return file.capsules;
}

// ---------------------------------------------------------------------------
// The write lock
// ---------------------------------------------------------------------------

/**
 * One capture at a time, for the whole ring.
 *
 * The generation number is read off the disk and the record is read and
 * rewritten, so two captures running at once can pick the same number, write
 * the same body and then lose one of the two capsules when the second record
 * write lands. The schedule takes one generation at a time, and the lock is
 * here so that a second caller cannot make that assumption false. It is the
 * same shape ../restore/snapshots.ts uses per session, at ring scope because
 * there is one ring.
 */
let ringLock: Promise<void> = Promise.resolve();

function withRingLock<T>(work: () => Promise<T>): Promise<T> {
  // `then(work, work)` rather than `then(work)`: a failed capture must not stop
  // the next one from running.
  const run = ringLock.then(work, work);
  ringLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

// ---------------------------------------------------------------------------
// Pruning, and the invariant it holds
// ---------------------------------------------------------------------------

export interface PruneBackupRingOptions {
  dir?: string;
  keep?: number;
  fs?: DurableFs;
  onPoint?: BackupFaultHook;
  /** The record to protect. Read from disk when the caller does not pass it. */
  recorded?: readonly BackupCapsule[];
  /** Passed through to the staged file sweep. */
  staleAfterMs?: number;
  now?: () => number;
}

export interface BackupPruneResult {
  /** Generations left in place, newest first. */
  kept: number[];
  /** Of those, the ones whose bodies verify. */
  verified: number[];
  /** Bodies removed. */
  removed: string[];
  /** Staged files from an earlier crash that were swept. */
  sweptParts: string[];
  /** Set when the prune declined to remove anything, with the reason. */
  refused?: string;
}

/**
 * Remove the generations the record does not name, and sweep staged files an
 * earlier crash left behind.
 *
 * THE INVARIANT, stated as the thing that must never happen: a prune must never
 * remove the current generation and its last verified predecessor together.
 * Three properties hold it, and they are separate so that one of them being
 * wrong does not take the other two with it.
 *
 *  1. The protected set always begins with the newest recorded generation, so
 *     the current one is never a candidate.
 *  2. It then takes recorded generations whose bodies verify, newest first, up
 *     to `keep`. The last verified predecessor is therefore always in it
 *     whenever one exists at all.
 *  3. Nothing outside the protected set is removed, and the record naming the
 *     protected set is already durable before the first removal. So a crash at
 *     any point inside this function leaves the whole protected set on disk.
 *
 * Bodies NEWER than the newest recorded generation are also left alone. Such a
 * body is either a write happening right now or the debris of a crash inside
 * one, and the next capture takes its number from the disk rather than from the
 * record, so it is never written over.
 *
 * An empty record protects everything. That is the conservative answer and it
 * is what a reader wants when the index has been lost: the bodies are still
 * there for a person to look at, and the ring has stopped deleting.
 */
export async function pruneBackupRing(
  options: PruneBackupRingOptions = {}
): Promise<BackupPruneResult> {
  const dir = options.dir ?? backupsDir();
  const keep = Math.max(2, options.keep ?? BACKUP_GENERATIONS);
  const fs = options.fs ?? nodeDurableFs();
  const recorded = options.recorded ?? readBackupIndex(dir);

  const verified = recorded
    .filter((c) => backupBodyVerifies(c, dir))
    .map((c) => c.generation);

  const protectedGenerations: number[] = [];
  const newest = recorded[0]?.generation;
  if (newest !== undefined) protectedGenerations.push(newest);
  for (const generation of verified) {
    if (protectedGenerations.length >= keep) break;
    if (!protectedGenerations.includes(generation)) protectedGenerations.push(generation);
  }

  // Property 2, asserted rather than assumed. It is unreachable while the loop
  // above is correct, and it is here so that a future edit to the loop fails
  // loudly by declining to delete instead of quietly by deleting a fallback.
  if (verified.length > 0 && !protectedGenerations.some((g) => verified.includes(g))) {
    return {
      kept: protectedGenerations,
      verified,
      removed: [],
      sweptParts: [],
      refused:
        'the survivor set held no verified generation, so nothing was removed'
    };
  }

  const hooked = options.onPoint ? withUnlinkPoint(fs, options.onPoint) : fs;
  const result = await pruneGenerations(
    dir,
    BACKUP_STEM,
    Math.max(protectedGenerations.length, 1),
    {
      fs: hooked,
      recorded: protectedGenerations,
      staleAfterMs: options.staleAfterMs,
      now: options.now?.()
    }
  );

  return {
    kept: result.kept.map((g) => g.generation),
    verified,
    removed: result.removed,
    sweptParts: result.sweptParts
  };
}

/**
 * The same filesystem, with a crash point in front of every unlink.
 *
 * A wrapper rather than a second deletion loop, because the deletion loop
 * already exists in ../durable/generations.ts and the product keeps one of it.
 */
function withUnlinkPoint(fs: DurableFs, point: BackupFaultHook): DurableFs {
  return {
    ...fs,
    unlink: async (path: string) => {
      point('backup.prune.before-unlink');
      await fs.unlink(path);
    }
  };
}

// ---------------------------------------------------------------------------
// The read path a person reaches for after something went wrong
// ---------------------------------------------------------------------------

export interface RestoreFromBackupOptions {
  /** Which generation. Defaults to the newest one that verifies. */
  generation?: number;
  /**
   * Where to write the database. It must not exist, and neither may a write
   * ahead log or a rollback journal beside it. See the note below.
   */
  to: string;
  dir?: string;
  fs?: DurableFs;
}

export interface BackupRestoreResult {
  ok: boolean;
  /** The generation that was used, or null when none could be. */
  generation: number | null;
  from: string | null;
  to: string;
  bytes: number;
  /** What `integrity_check` said about the restored file. */
  integrity: string;
  /** Tables the restored file and the record disagree about. */
  differences: string[];
  /** How many newer generations were rejected before this one. */
  rejected: number;
  /** One sentence for a person. */
  detail: string;
}

/**
 * Write a verified generation out as a database file.
 *
 * It never writes over anything. A destination that already exists is a
 * refusal, and so is a `-wal` or a `-journal` beside it, because publishing a
 * fresh database next to another database's write ahead log is a way to lose
 * both. Moving a damaged manifest out of the way is `quarantineDatabase` in
 * ../db/integrity.ts, and it stays at the call site so that the destructive
 * decision is made by the code that asked for it rather than by this function.
 *
 * The proof is done twice on purpose and the second one is the point. The body
 * is proved against its capsule by length and sha256, which says the bytes on
 * disk are the bytes that were published. Then the RESTORED file is opened and
 * its per table content hashes are compared against the ones the capsule
 * recorded, which says the database that came out holds the rows that went in.
 * The first check would pass on a file that was faithfully copied and was
 * always wrong.
 */
export async function restoreFromBackup(
  options: RestoreFromBackupOptions
): Promise<BackupRestoreResult> {
  const dir = options.dir ?? backupsDir();
  const fs = options.fs ?? nodeDurableFs();
  const base: BackupRestoreResult = {
    ok: false,
    generation: null,
    from: null,
    to: options.to,
    bytes: 0,
    integrity: 'not checked',
    differences: [],
    rejected: 0,
    detail: ''
  };

  for (const suffix of ['', '-wal', '-journal', '-shm']) {
    if (!existsSync(`${options.to}${suffix}`)) continue;
    return {
      ...base,
      detail:
        `${options.to}${suffix} already exists. Nothing was written. Move the ` +
        'existing database aside first, and never delete it.'
    };
  }

  const capsules = readBackupIndex(dir);
  const chosen =
    options.generation === undefined
      ? resolveVerifiedBackup(dir, capsules)
      : pickGeneration(capsules, options.generation, dir);
  if (chosen === null) {
    return {
      ...base,
      rejected: capsules.length,
      detail:
        options.generation === undefined
          ? `no generation in ${dir} proved out, so nothing was restored`
          : `generation ${String(options.generation)} is not in the record or ` +
            'its bytes do not match it, so nothing was restored'
    };
  }

  const body = readFileSync(chosen.path);
  const receipt = await writeDurable({ path: options.to, data: body }, { fs });

  const verdict = checkDatabaseIntegrity(options.to);
  const evidence = readDatabaseEvidence(options.to);
  const differences =
    evidence.error === undefined
      ? digestDifferences(chosen.capsule.digests, evidence.digests)
      : [`the restored file could not be read: ${evidence.error}`];
  const ok = verdict.ok && differences.length === 0;

  return {
    ok,
    generation: chosen.capsule.generation,
    from: chosen.path,
    to: options.to,
    bytes: receipt.bytes,
    integrity: verdict.ok ? 'ok' : verdict.detail,
    differences,
    rejected: chosen.rejected,
    detail: ok
      ? `restored generation ${String(chosen.capsule.generation)} of ` +
        `${new Date(chosen.capsule.capturedAt).toISOString()} into ${options.to}`
      : `generation ${String(chosen.capsule.generation)} was written to ` +
        `${options.to} and it does not hold what the record says it holds ` +
        `(${[verdict.ok ? '' : verdict.detail, ...differences].filter((s) => s !== '').join('; ')})`
  };
}

/** One named generation, when the record names it and its bytes prove out. */
function pickGeneration(
  capsules: readonly BackupCapsule[],
  generation: number,
  dir: string
): BackupResolution | null {
  const capsule = capsules.find((c) => c.generation === generation);
  if (capsule === undefined) return null;
  if (!backupBodyVerifies(capsule, dir)) return null;
  return {
    path: backupBodyPath(capsule.generation, dir),
    capsule,
    rejected: capsules.filter((c) => c.generation > generation).length
  };
}

// ---------------------------------------------------------------------------
// Saying what the ring holds
// ---------------------------------------------------------------------------

/**
 * One line a person can read about the state of the ring.
 *
 * Written here rather than at the call site so that every caller says the same
 * thing, and so that the sentence never claims more than the record proves.
 */
export function describeBackupRing(dir: string = backupsDir()): string {
  const capsules = readBackupIndex(dir);
  if (capsules.length === 0) return 'no verified backup of the manifest';
  const resolved = resolveVerifiedBackup(dir, capsules);
  if (resolved === null) {
    return (
      `${String(capsules.length)} recorded backup generations and none of them ` +
      'proved out, so there is no verified backup of the manifest'
    );
  }
  const age = Date.now() - resolved.capsule.capturedAt;
  const rows = resolved.capsule.rows['sessions'];
  return (
    `generation ${String(resolved.capsule.generation)} of ` +
    `${new Date(resolved.capsule.capturedAt).toISOString()} verified, ` +
    `${String(Math.round(age / 60000))} minutes old, ` +
    `${rows === undefined ? 'unknown' : String(rows)} sessions, ` +
    `${String(capsules.length)} generations recorded`
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function noPoint(): void {
  /* the default hook does nothing and costs one call */
}

/**
 * A database and every file SQLite may keep beside it.
 *
 * Exported for the keepsake copy in ./boot.ts, which writes to a temporary
 * name and has to clear it when the copy does not verify. One definition of
 * "the database and its sidecars", not two.
 */
export function removeDatabaseFiles(path: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    rmSync(`${path}${suffix}`, { force: true });
  }
}

function sizeOf(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sanitizeCapsule(value: unknown): BackupCapsule | null {
  if (value === null || typeof value !== 'object') return null;
  const c = value as Record<string, unknown>;
  if (typeof c['path'] !== 'string' || c['path'].length === 0) return null;
  if (typeof c['sha256'] !== 'string' || c['sha256'].length !== 64) return null;
  if (typeof c['bytes'] !== 'number' || !Number.isFinite(c['bytes']) || c['bytes'] < 0) {
    return null;
  }
  if (typeof c['generation'] !== 'number' || !Number.isInteger(c['generation'])) return null;
  const parent = c['parent'];
  return {
    version: typeof c['version'] === 'number' ? c['version'] : 0,
    generation: c['generation'],
    parent: typeof parent === 'number' && Number.isInteger(parent) ? parent : null,
    path: c['path'],
    source: typeof c['source'] === 'string' ? c['source'] : '',
    bytes: c['bytes'],
    sha256: c['sha256'],
    digests: stringMap(c['digests']),
    rows: numberMap(c['rows']),
    integrity: typeof c['integrity'] === 'string' ? c['integrity'] : 'unknown',
    sourceMatched: c['sourceMatched'] === true,
    differences: Array.isArray(c['differences'])
      ? c['differences'].filter((d): d is string => typeof d === 'string')
      : [],
    reason: typeof c['reason'] === 'string' ? (c['reason'] as BackupReason) : 'unknown',
    capturedAt: typeof c['capturedAt'] === 'number' ? c['capturedAt'] : 0,
    ms: typeof c['ms'] === 'number' ? c['ms'] : 0
  };
}

function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (value === null || typeof value !== 'object') return out;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

function numberMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (value === null || typeof value !== 'object') return out;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'number' && Number.isFinite(entry)) out[key] = entry;
  }
  return out;
}

/** Every generation body on disk, newest first. Diagnostic and test use. */
export async function listBackupBodies(
  dir: string = backupsDir(),
  fs: DurableFs = nodeDurableFs()
): Promise<number[]> {
  return (await listGenerations(dir, BACKUP_STEM, fs)).map((g) => g.generation);
}
