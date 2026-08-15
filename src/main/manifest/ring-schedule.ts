/**
 * ring-schedule.ts — WHEN a verified generation of the manifest is taken.
 *
 * Phase 20 item 2's other half. `manifest/recovery.ts` decides HOW a generation
 * is made and proved. This module decides when, and it decides nothing else. The
 * split is deliberate: the copy engine already existed in `migrate/userdata.ts`
 * and research 33 entry 8 says the missing piece is scheduling rather than new
 * code, so the scheduling gets its own file and its own reasoning instead of
 * being three `setInterval` calls scattered through the boot path.
 *
 * ## The numbers this cadence is built on
 *
 * Measured on 2026-08-12 against the operator's real manifest, opened READ ONLY,
 * with all three files sha256'd before and after and found byte identical. The
 * file was 77,824 bytes over 20 pages with 38 sessions, and its `-wal` was
 * 2,805,752 bytes.
 *
 * | Step                                      | Median   |
 * | ----------------------------------------- | -------- |
 * | `integrity_check` on the live file        | 0.094 ms |
 * | per table content digest (`tableDigests`) | 0.334 ms |
 * | `VACUUM INTO` a fresh file                | 0.476 ms |
 * | the SQLite half, all three steps above    | 1.103 ms |
 * | publishing the body through ../durable    | 9.38 ms  |
 * | publishing the completion record          | 9.95 ms  |
 * | **one whole take**                        | **20.71 ms**, range 18.79 to 23.11 |
 *
 * The copy it produced was 73,728 bytes. CORRECTED DURING INTEGRATION, and the
 * correction is the larger half. The first four rows are what SQLite costs, and
 * an earlier draft of this table stopped there and reported 1.103 ms as the
 * whole take. The two durable publishes are 19.3 ms of the 20.71 ms, because
 * each one pays `F_FULLFSYNC` for the file and again for its directory. They
 * are not batched into one durable write on purpose: one flush of the directory
 * would let the record become durable before the body, and the body being
 * durable first is the ordering rule the ring exists to hold.
 *
 * So one generation costs about 21 ms of main process time and about 72 KB of
 * disk. That is the price every decision below is weighed against, and at
 * twelve takes an hour it is still 0.25 s an hour.
 *
 * ## The cadence
 *
 * | Trigger        | Forced | Why this moment                                   |
 * | -------------- | :----: | ------------------------------------------------- |
 * | `pre-migration`| yes    | The only copy of the OLD schema. Research 33 entry 8 names it. |
 * | `launch`       | no     | The manifest is quiescent and this is the moment after the longest gap. |
 * | `interval`     | no     | Bounds how much change a loss can take with it while the app runs. |
 * | `suspend`      | no     | The machine is about to stop and there is no next tick. |
 * | `quit`         | no     | Same, and the manifest is quiescent again. |
 * | `manual`       | yes    | The user asked for one. |
 *
 * "Forced" means the change test below is skipped. Everything else is taken only
 * when the manifest's content actually differs from the content of the last
 * generation, which costs 0.334 ms to establish.
 *
 * `interval` polls every 60 s and takes a generation at most every 5 minutes. The
 * worst hour therefore costs 60 fingerprints and 12 takes, which is 20 ms plus
 * 249 ms of main process time and twelve writes of 72 KB. On a machine where
 * nothing is happening it costs 20 ms and no writes at all, because the
 * fingerprint does not move.
 *
 * ## Where a generation is deliberately NOT taken
 *
 * - **The session create path.** The user is waiting on it, and the row that
 *   matters is written before the process is spawned precisely so a crash leaves
 *   a record. A copy there protects nothing the declaration write does not.
 * - **The restore path.** It has its own journal (Phase 19 item 7), which is a
 *   stronger record than a copy of the manifest taken beside it, and adding a
 *   file write to the path that brings a user's work back is the wrong trade.
 * - **Reconcile, the 1 Hz activity poll, rename, and every other ordinary
 *   write.** These are the churn the interval exists to summarise.
 *
 * The first two are enforced rather than only written down. `RingReason` has no
 * member for either, so a call site on those paths has nothing to pass, and the
 * optional `busy` dependency lets the integrator defer a TIMED take while a
 * create or a restore is in flight.
 *
 * ## Failure is reported, and never disables the schedule
 *
 * Research 33 §3.1 records what happened the last time this app had a verified
 * copy path: a failure was silent, and then `hasOwnPayload` permanently disabled
 * the retry. A recurring backup that behaves that way is worse than none,
 * because the user believes they have protection they do not have. So a failed
 * take here is counted, handed to `onTrouble` on the FIRST failure, and followed
 * by another attempt on the next tick. Nothing in this module can switch itself
 * off.
 */

import type Database from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { captureManifestBackup, type CaptureBackupOptions } from './recovery';
import { getLog } from '../log';

/**
 * Scope "manifest" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const manifestLog = getLog('manifest');


// ---------------------------------------------------------------------------
// The seam into the ring
// ---------------------------------------------------------------------------

/**
 * Why a generation was taken. Recorded with the generation and shown in the log.
 *
 * THE ABSENT MEMBERS ARE THE POINT. There is no `create` and no `restore`,
 * because a generation is not taken on either path, and a closed union is a
 * rule a later contributor cannot accidentally break by adding a call.
 */
export type RingReason =
  | 'pre-migration'
  | 'launch'
  | 'interval'
  | 'suspend'
  | 'quit'
  | 'manual';

/** Every reason, for a report that wants to name them all. */
export const RING_REASONS: readonly RingReason[] = [
  'pre-migration',
  'launch',
  'interval',
  'suspend',
  'quit',
  'manual'
];

/**
 * The reasons that skip the change test.
 *
 * The split is enforced by the two method signatures rather than by a runtime
 * check: `takeNow` accepts only these, and `maybeTake` accepts only the others.
 */
export const FORCED_RING_REASONS: readonly RingReason[] = ['pre-migration', 'manual'];

/**
 * What one take did, as `manifest/recovery.ts` reports it.
 *
 * `ok: false` is a take that did not happen, whatever the cause. The schedule
 * treats every cause the same way, which is to report it and try again on the
 * next tick.
 */
export interface RingTakeResult {
  ok: boolean;
  /** The generation number written, when one was. */
  generation?: number;
  /** Size of the copy on disk. */
  bytes?: number;
  /** Plain sentence for the log and for a support answer. */
  detail: string;
  ms: number;
}

/**
 * Make one verified generation and record it. Supplied by
 * `manifest/recovery.ts`.
 *
 * TWO THINGS THIS FUNCTION MUST DO, because the schedule cannot check either.
 * It must verify the copy before it records it, so the ring never holds a
 * generation nothing vouches for. And it must record nothing when verification
 * fails, so a failed take leaves the previous generation as the newest verified
 * one rather than shadowing it with a bad newer number.
 */
export type TakeGeneration = (reason: RingReason) => Promise<RingTakeResult>;

/**
 * A cheap content fingerprint of the manifest as it is right now, or null when
 * it cannot be read.
 *
 * Null always means "take one". A manifest the schedule cannot fingerprint is
 * the case where a copy is most valuable, not least.
 */
export type ManifestFingerprint = () => string | null;

/**
 * Drive `captureManifestBackup` as a `TakeGeneration`.
 *
 * The ring throws when a capture fails, and the schedule wants a result either
 * way, because "the last take failed and here is why" is a sentence a user has
 * to be able to read. This is the whole of the translation, and it lives here
 * rather than in the ring so the ring's contract stays "durable or throw".
 *
 * The `reason` comes from the schedule and is passed straight through.
 * `BackupReason` is `RingReason` plus `unknown`, so there is no mapping table
 * between two lists that could drift apart.
 */
export function ringFromRecovery(
  options: Omit<CaptureBackupOptions, 'reason'> = {}
): TakeGeneration {
  return async (reason) => {
    const started = Date.now();
    try {
      const out = await captureManifestBackup({ ...options, reason });
      return {
        ok: true,
        generation: out.capsule.generation,
        bytes: out.capsule.bytes,
        detail:
          `generation ${String(out.capsule.generation)}, ` +
          `${String(out.capsule.bytes)} bytes, integrity ${out.capsule.integrity}` +
          (out.capsule.sourceMatched ? '' : ', source and copy disagreed'),
        ms: out.capsule.ms
      };
    } catch (err) {
      return {
        ok: false,
        detail: (err as Error).message,
        ms: Date.now() - started
      };
    }
  };
}

// ---------------------------------------------------------------------------
// The dials
// ---------------------------------------------------------------------------

/**
 * How often the change test runs. 0.334 ms each, so 60 an hour is 20 ms.
 *
 * A shorter poll would not shorten the loss window, because the floor below is
 * what decides that. It would only spend more fingerprints to arrive at the same
 * answer.
 */
export const RING_POLL_MS = 60_000;

/**
 * The shortest gap between two timed takes.
 *
 * This is the number that sets the loss window: at most five minutes of manifest
 * change, plus up to one poll period, is outside the newest generation. Five
 * minutes costs at most twelve takes an hour, which is 13 ms and twelve 72 KB
 * writes, and that is affordable at the measured cost.
 *
 * The floor is skipped by `suspend` and `quit`, because those are the two moments
 * with no next tick.
 */
export const RING_MIN_GAP_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// The fingerprint
// ---------------------------------------------------------------------------
//
// The change test is `databaseFingerprint` in ../db/digest.ts, and it is NOT
// re-exported here. It was defined in this file until integration, which put a
// second name on one hash and, worse, an import cycle in front of the manifest
// store: the store needs the fingerprint of its own open connection, this
// module imports the ring, and the ring reads the manifest path out of the
// store. `ManifestStore.contentFingerprint()` is the production caller, and it
// is what the boot path hands to `RingScheduleDeps.fingerprint`.

// ---------------------------------------------------------------------------
// The schedule
// ---------------------------------------------------------------------------

export interface RingScheduleDeps {
  /** Make one verified generation. See `TakeGeneration`. */
  take: TakeGeneration;
  /** The change test. See `ManifestFingerprint`. */
  fingerprint: ManifestFingerprint;
  /**
   * True while a create or a restore is in flight. A TIMED take waits for the
   * next tick rather than running beside one. Forced takes ignore it.
   *
   * Optional, and never busy by default, so a caller that has no such signal
   * gets a schedule that still works.
   */
  busy?: () => boolean;
  /**
   * Called on the FIRST failure of a run of them, and again when the run ends.
   * This is where a notice is posted from. See the module header for why a
   * failure may not be swallowed.
   */
  onTrouble?: (state: RingScheduleState) => void;
  /** Defaults to RING_POLL_MS. */
  pollMs?: number;
  /** Defaults to RING_MIN_GAP_MS. */
  minGapMs?: number;
  /** Test seam. */
  now?: () => number;
  /** Defaults to a console line. */
  log?: (line: string) => void;
}

/** What the schedule has done, for a log line or a Recovery Centre row. */
export interface RingScheduleState {
  running: boolean;
  /** When the last successful take finished. Null when none has. */
  lastTakenAt: number | null;
  /** Why the last successful take happened. */
  lastReason: RingReason | null;
  /** The generation number of the last successful take. */
  lastGeneration: number | null;
  /** Failures since the last success. Zero when the last take worked. */
  consecutiveFailures: number;
  /** The detail of the most recent failure, kept until one succeeds. */
  lastFailure: string | null;
  /** Timed takes skipped because `busy` was true. Diagnostic only. */
  deferrals: number;
  /** Successful takes since `start`. */
  taken: number;
}

/**
 * The timer, the change test and the one in-flight flag.
 *
 * Construct it once per app run, `start()` it after the manifest has opened and
 * migrated, and `stop()` it on the way out. Every method is safe to call before
 * `start` and after `stop`.
 */
export class ManifestRingSchedule {
  private readonly deps: RingScheduleDeps;
  private readonly pollMs: number;
  private readonly minGapMs: number;
  private readonly now: () => number;
  private readonly log: (line: string) => void;

  private timer: NodeJS.Timeout | null = null;
  /** One flag, not a queue. A second take of the same file is not worth doing. */
  private inFlight = false;
  /** The fingerprint the last SUCCESSFUL take was made at. */
  private takenAtFingerprint: string | null = null;
  /** When the last take was ATTEMPTED, which is what the floor is measured from. */
  private lastAttemptAt = 0;

  private state: RingScheduleState = {
    running: false,
    lastTakenAt: null,
    lastReason: null,
    lastGeneration: null,
    consecutiveFailures: 0,
    lastFailure: null,
    deferrals: 0,
    taken: 0
  };

  constructor(deps: RingScheduleDeps) {
    this.deps = deps;
    this.pollMs = deps.pollMs ?? RING_POLL_MS;
    this.minGapMs = deps.minGapMs ?? RING_MIN_GAP_MS;
    this.now = deps.now ?? Date.now;
    this.log = deps.log ?? ((line) => console.log(line));
  }

  /** A copy, so a caller cannot edit the schedule's own record of itself. */
  snapshot(): RingScheduleState {
    return { ...this.state };
  }

  /**
   * Start the poll. Idempotent.
   *
   * It does NOT take a generation. The launch take is a separate call, so the
   * boot path decides where in its own sequence it happens rather than having
   * a constructor decide for it.
   */
  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.maybeTake('interval');
    }, this.pollMs);
    // Never hold the process open. A backup timer that stops a quit from
    // finishing would be a durability feature costing the user their quit.
    this.timer.unref?.();
    this.state.running = true;
  }

  /** Stop the poll. Idempotent. Does not wait for a take already running. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.running = false;
  }

  /**
   * Take a generation now, whatever the change test says and whatever the floor
   * says. For `pre-migration` and for the user asking.
   */
  async takeNow(
    reason: Extract<RingReason, 'pre-migration' | 'manual'>
  ): Promise<RingTakeResult> {
    return this.run(reason);
  }

  /**
   * Take a generation if the manifest has changed since the last one, and if
   * enough time has passed.
   *
   * `suspend` and `quit` skip the time floor and keep the change test, because
   * they are the moments with no next tick and a take that would copy the same
   * bytes again is still not worth doing.
   */
  async maybeTake(
    reason: Extract<RingReason, 'launch' | 'interval' | 'suspend' | 'quit'>
  ): Promise<RingTakeResult | null> {
    const honourFloor = reason === 'interval';
    if (honourFloor && this.now() - this.lastAttemptAt < this.minGapMs) return null;

    if (reason === 'interval' && this.deps.busy?.() === true) {
      this.state.deferrals += 1;
      return null;
    }

    const fingerprint = this.deps.fingerprint();
    // Null is "cannot be read", which is the case a copy is MOST wanted in.
    if (fingerprint !== null && fingerprint === this.takenAtFingerprint) return null;

    return this.run(reason, fingerprint);
  }

  /** The suspend handler, for `power/index.ts`. */
  async onSuspend(): Promise<RingTakeResult | null> {
    return this.maybeTake('suspend');
  }

  /** The quit handler, for the shutdown path. */
  async onQuit(): Promise<RingTakeResult | null> {
    this.stop();
    return this.maybeTake('quit');
  }

  private async run(
    reason: RingReason,
    fingerprint?: string | null
  ): Promise<RingTakeResult> {
    if (this.inFlight) {
      return { ok: false, detail: 'a generation is already being taken', ms: 0 };
    }
    this.inFlight = true;
    this.lastAttemptAt = this.now();
    try {
      const result = await this.deps.take(reason);
      if (result.ok) {
        this.recordSuccess(reason, result, fingerprint);
      } else {
        this.recordFailure(reason, result.detail);
      }
      return result;
    } catch (err) {
      // A throwing ring is a failed take, never a crashed app. The boot path
      // and the quit path both call in here.
      const detail = (err as Error).message;
      this.recordFailure(reason, detail);
      return { ok: false, detail, ms: 0 };
    } finally {
      this.inFlight = false;
    }
  }

  private recordSuccess(
    reason: RingReason,
    result: RingTakeResult,
    fingerprint?: string | null
  ): void {
    const recovering = this.state.consecutiveFailures > 0;
    this.state.lastTakenAt = this.now();
    this.state.lastReason = reason;
    this.state.lastGeneration = result.generation ?? null;
    this.state.consecutiveFailures = 0;
    this.state.lastFailure = null;
    this.state.taken += 1;
    // Read the fingerprint AFTER the copy when the caller did not supply one,
    // so a forced take still gets the change test right next time.
    this.takenAtFingerprint = fingerprint ?? this.deps.fingerprint();
    this.log(
      `[gmux] manifest generation ${String(result.generation ?? 0)} taken ` +
        `(${reason}) in ${String(result.ms)} ms: ${result.detail}`
    );
    // Say when protection came back, not only when it went away. A user told
    // once that backups were failing needs to be told once that they are not.
    if (recovering) this.deps.onTrouble?.(this.snapshot());
  }

  private recordFailure(reason: RingReason, detail: string): void {
    const first = this.state.consecutiveFailures === 0;
    this.state.consecutiveFailures += 1;
    this.state.lastFailure = detail;
    manifestLog.warn(
      `manifest generation (${reason}) failed: ${detail} ` +
        `(${String(this.state.consecutiveFailures)} in a row)`
    );
    // The first one, not every one. A disk that is full fails every tick, and a
    // notice per tick is a notice the user learns to dismiss.
    if (first) this.deps.onTrouble?.(this.snapshot());
  }
}

// ---------------------------------------------------------------------------
// The pre-migration generation
// ---------------------------------------------------------------------------

/** Why no pre-migration generation was taken. */
export type PreMigrationSkip =
  | 'no-manifest'
  | 'nothing-pending'
  | 'unreadable'
  | 'failed';

export type PreMigrationOutcome =
  | { taken: true; pending: string[]; result: RingTakeResult }
  | { taken: false; why: PreMigrationSkip; pending: string[]; detail: string };

/**
 * The migrations in `expected` that this database has no bookkeeping row for.
 *
 * `db` must be open READ ONLY. Research 34 §3.2 is explicit about the reason:
 * the last write connection to close checkpoints and truncates the WAL, so a
 * helper that opens read write "just to check" becomes a mutator of the user's
 * live manifest.
 *
 * A database with no `migrations` table at all has every migration pending,
 * which is the honest answer for a file written before the runner existed.
 */
export function pendingMigrationNames(
  db: Database.Database,
  expected: readonly string[]
): string[] {
  let applied: Set<string>;
  try {
    applied = new Set(
      db
        .prepare<[], { name: string }>('SELECT name FROM migrations')
        .all()
        .map((r) => r.name)
    );
  } catch {
    applied = new Set();
  }
  return expected.filter((name) => !applied.has(name));
}

export interface PreMigrationOptions {
  /** The manifest that is about to be opened and migrated. */
  dbPath: string;
  /** Every migration name the app will apply, in order. */
  expected: readonly string[];
  /** The ring. Same function the schedule is given. */
  take: TakeGeneration;
  /** Defaults to a console line. */
  log?: (line: string) => void;
}

/**
 * Take a generation before the schema changes, and only when it is about to.
 *
 * WHY THIS RUNS BEFORE THE STORE IS CONSTRUCTED RATHER THAN INSIDE IT. A
 * migration is the one change to the manifest that cannot be undone by running
 * the app again, so the copy has to be of the file as it was, and the store's
 * constructor has already migrated by the time anything inside it could ask.
 * Running it first also keeps the probe read only, which is the rule every
 * recovery path connection follows.
 *
 * WHAT IT REFUSES TO DO. It does not check integrity, quarantine, repair or
 * create anything. Those belong to the store's own gate, and a second module
 * deciding a manifest is damaged is a second module that can be wrong about it.
 * A file it cannot read is reported and left exactly as it is.
 *
 * It never throws. A pre-migration copy that fails must not stop the app
 * opening the manifest, because the alternative is a user who cannot launch.
 */
export async function takePreMigrationGeneration(
  opts: PreMigrationOptions
): Promise<PreMigrationOutcome> {
  const log = opts.log ?? ((line: string) => console.log(line));

  if (!existsSync(opts.dbPath)) {
    return {
      taken: false,
      why: 'no-manifest',
      pending: [],
      detail: 'there is no manifest yet, so there is nothing to copy'
    };
  }

  let pending: string[];
  try {
    const db = new BetterSqlite3(opts.dbPath, {
      readonly: true,
      fileMustExist: true
    });
    try {
      pending = pendingMigrationNames(db, opts.expected);
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      taken: false,
      why: 'unreadable',
      pending: [],
      detail:
        `the manifest could not be read to see which migrations are pending: ` +
        `${(err as Error).message}. Nothing was copied and nothing was changed.`
    };
  }

  if (pending.length === 0) {
    return {
      taken: false,
      why: 'nothing-pending',
      pending,
      detail: 'the schema is already current'
    };
  }

  log(
    `[gmux] ${String(pending.length)} migration(s) pending (${pending.join(', ')}); ` +
      'taking a verified copy of the manifest first'
  );

  let result: RingTakeResult;
  try {
    result = await opts.take('pre-migration');
  } catch (err) {
    result = { ok: false, detail: (err as Error).message, ms: 0 };
  }

  if (!result.ok) {
    manifestLog.warn(
      `the pre-migration copy failed: ${result.detail}. The migration ` +
        'will still run, because refusing to launch is the worse answer.'
    );
    return { taken: false, why: 'failed', pending, detail: result.detail };
  }
  return { taken: true, pending, result };
}
