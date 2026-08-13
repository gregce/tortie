/**
 * boot.ts — the two things that happen to the manifest BEFORE it is opened, and
 * the one thing that is started after it (Phase 20).
 *
 * Four builders left the same seam behind, and it is the seam that decides
 * whether the ring protects anything at all. `manifest/recovery.ts` can make a
 * verified generation and write one back out. `manifest/ring-schedule.ts` knows
 * when a generation should be taken. Neither is reachable from the running app
 * until something calls them, and the boot path is where the calls belong.
 *
 * ## The order, and why it is this order
 *
 *     manifest missing or damaged?
 *              |
 *              |  yes                                no
 *              v                                      |
 *     [1] restore the newest VERIFIED generation      |
 *         (quarantine the damaged file first,         |
 *          restoreFromBackup never writes over        |
 *          anything)                                  |
 *              |                                      |
 *              +--------------------+-----------------+
 *                                   v
 *     [2] pending migrations?  ->  take a generation of the OLD schema
 *                                   |
 *                                   v
 *                          new ManifestStore(path)
 *                           (Phase 19's own integrity gate, quarantine
 *                            and `.recover` rebuild run in here)
 *                                   |
 *                                   v
 *     [3] start the schedule, and take the launch generation
 *
 * **Step 1 runs before Phase 19's gate on purpose, and this is the correction
 * the integration makes.** Phase 19 already quarantines a damaged manifest and
 * rebuilds it with `/usr/bin/sqlite3 .recover`. A `.recover` page walk gives
 * back whatever it could read and has no way to say what is missing. The ring
 * holds a copy that was proved complete when it was taken, table by table,
 * against the content hash in `db/digest.ts`. When both are available the
 * proved copy is the better answer, so the ring is asked FIRST and `.recover`
 * stays as the last resort it was built to be. Until this ordering existed the
 * ring was written on every launch and read on none.
 *
 * **The damaged file is never deleted.** It is quarantined, which moves it and
 * its sidecars aside under a `.damaged-<stamp>` name, and the user is told
 * where it went. A restore from the ring can be one generation stale, so the
 * bytes it displaces are the only copy of whatever changed since.
 *
 * **Nothing here throws.** A boot path that refuses to start because a backup
 * failed is worse than the failure. Every step reports what it did and the
 * store's own constructor stays the one place that can refuse to open.
 */

import { existsSync } from 'node:fs';
import {
  checkDatabaseIntegrity,
  isUnreadable,
  quarantineDatabase
} from '../db/integrity';
import { faultPoint, type FaultPointName } from '../fault';
import { postDurabilityNotice } from '../notice';
import {
  backupsDir,
  describeBackupRing,
  resolveVerifiedBackup,
  restoreFromBackup,
  type BackupFaultPoint
} from './recovery';
import {
  ManifestRingSchedule,
  ringFromRecovery,
  takePreMigrationGeneration,
  type PreMigrationOutcome,
  type RingScheduleState
} from './ring-schedule';
import { MANIFEST_MIGRATION_NAMES, defaultManifestDbPath } from './store';
import type { ManifestStore } from './store';

/**
 * The ring's crash points are a subset of the harness's, checked at compile
 * time rather than by matching two lists by eye.
 *
 * `recovery.ts` declares its own `BackupFaultPoint` union so the ring stays a
 * leaf module a unit test can drive with its own hook. That freedom is worth
 * one assertion: add a point there and forget it in `fault/inject.ts` and this
 * line stops the build, instead of a harness silently arming nothing.
 */
type _BackupPointsAreFaultPoints = BackupFaultPoint extends FaultPointName
  ? true
  : never;
const _backupPointsAreFaultPoints: _BackupPointsAreFaultPoints = true;
void _backupPointsAreFaultPoints;

/** What happened to the manifest on the way in. One line each, for the log. */
export interface ManifestBootReport {
  /** Absolute path of the manifest that was prepared. */
  dbPath: string;
  /**
   * - `present`: the file was there and its integrity check passed.
   * - `absent`: there was no file, and no generation to put in its place.
   * - `restored`: it was missing or damaged and a verified generation was
   *   written in its place.
   * - `left-alone`: it is damaged or unreadable and the ring had nothing that
   *   proved out, so Phase 19's gate deals with it.
   */
  before: 'present' | 'absent' | 'restored' | 'left-alone';
  /** The generation that was restored, when one was. */
  restoredGeneration: number | null;
  /** Where the damaged file was moved to, when it was moved. */
  quarantinedTo: string | null;
  /** What the pre-migration copy did. */
  preMigration: PreMigrationOutcome;
  /** One sentence per step, in order. */
  lines: string[];
}

/**
 * Get the manifest ready to be opened, and say what had to be done to it.
 *
 * Call it once, immediately before `new ManifestStore(dbPath)`, with the same
 * path. It is async because writing a generation back out is, and the store's
 * constructor is synchronous, which is exactly why this cannot live inside the
 * integrity gate.
 */
export async function prepareManifestForBoot(
  dbPath: string = defaultManifestDbPath(),
  options: { dir?: string; log?: (line: string) => void } = {}
): Promise<ManifestBootReport> {
  const dir = options.dir ?? backupsDir();
  const lines: string[] = [];
  const say = (line: string): void => {
    lines.push(line);
    (options.log ?? ((l: string) => console.log(l)))(`[gmux] ${line}`);
  };

  const report: ManifestBootReport = {
    dbPath,
    before: 'present',
    restoredGeneration: null,
    quarantinedTo: null,
    preMigration: {
      taken: false,
      why: 'no-manifest',
      pending: [],
      detail: 'not reached'
    },
    lines
  };

  // ---- Step 1: is there a manifest, and is it readable? -------------------
  const present = existsSync(dbPath);
  const verdict = present ? checkDatabaseIntegrity(dbPath) : null;

  if (present && verdict !== null && verdict.ok) {
    report.before = 'present';
  } else if (present && verdict !== null && isUnreadable(verdict)) {
    // Nothing has been proved about this file. Moving it aside would be acting
    // on a diagnosis nobody made, and restoring over it is impossible anyway
    // because it is still there. Say so and let the store's gate report it.
    report.before = 'left-alone';
    say(
      `the manifest could not be read (${verdict.detail}), so nothing was ` +
        'moved and no backup was restored'
    );
  } else {
    report.before = present ? 'left-alone' : 'absent';
    const why = present
      ? `the manifest is damaged (${verdict?.detail ?? 'unknown'})`
      : 'there is no manifest';
    const resolved = resolveVerifiedBackup(dir);
    if (resolved === null) {
      say(`${why} and ${describeBackupRing(dir)}`);
    } else {
      await restoreFromRing(dbPath, dir, present, why, say, report);
    }
  }

  // ---- Step 2: the copy of the old schema ---------------------------------
  report.preMigration = await takePreMigrationGeneration({
    dbPath,
    expected: MANIFEST_MIGRATION_NAMES,
    take: ringFromRecovery({ source: dbPath, dir, onPoint: faultPoint }),
    log: (line) => {
      lines.push(line.replace(/^\[gmux\] /, ''));
      console.log(line);
    }
  });

  return report;
}

/**
 * Put a verified generation where the manifest should be, moving a damaged one
 * out of the way first.
 *
 * The quarantine has to happen here rather than inside `restoreFromBackup`,
 * which refuses to write over anything at all. Keeping the destructive half at
 * the call site is deliberate: the module that owns the bytes does not get to
 * decide that somebody else's database should move.
 */
async function restoreFromRing(
  dbPath: string,
  dir: string,
  present: boolean,
  why: string,
  say: (line: string) => void,
  report: ManifestBootReport
): Promise<void> {
  if (present) {
    try {
      const moved = quarantineDatabase(dbPath);
      report.quarantinedTo = moved.path;
      say(`${why}; it was moved to ${moved.path} and nothing was written over it`);
    } catch (err) {
      say(
        `${why}, and it could not be moved aside (${(err as Error).message}), ` +
          'so no backup was restored'
      );
      return;
    }
  }

  const result = await restoreFromBackup({ to: dbPath, dir }).catch(
    (err: unknown) => ({
      ok: false,
      generation: null,
      detail: (err as Error).message
    })
  );

  if (!result.ok) {
    say(`no verified backup could be put in its place: ${result.detail}`);
    return;
  }

  report.before = 'restored';
  report.restoredGeneration = result.generation;
  say(result.detail);

  // The user's own session records were in the file that moved, and a
  // quarantine they cannot find reads exactly like a delete. This is the same
  // notice Phase 19's gate posts for the same event, and the latch in
  // ../notice means the gate saying it again below is silent rather than
  // doubled.
  if (report.quarantinedTo !== null) {
    postDurabilityNotice({
      kind: 'manifest-quarantined',
      quarantinePath: report.quarantinedTo,
      recoveredAt: Date.now()
    });
  }
}

/**
 * Build the schedule for a store that is open, start its poll, and take the
 * launch generation.
 *
 * The launch take is awaited rather than left running, because 21 ms inside a
 * boot that spends hundreds of milliseconds in tmux is invisible and a take
 * that has definitely happened is a take a harness can assert on. `run` catches
 * everything, so a failing disk delays boot by nothing and cannot fail it.
 *
 * `busy` is the caller's, and it is the enforcement of "no generation is taken
 * on the create or restore path": those paths have no reason to pass, and a
 * TIMED take that lands beside one waits for the next tick instead.
 */
export async function startManifestRing(deps: {
  store: Pick<ManifestStore, 'contentFingerprint'>;
  /** True while a create or a restore is in flight. */
  busy: () => boolean;
  dbPath?: string;
  dir?: string;
}): Promise<ManifestRingSchedule> {
  const schedule = new ManifestRingSchedule({
    take: ringFromRecovery({
      ...(deps.dbPath !== undefined ? { source: deps.dbPath } : {}),
      ...(deps.dir !== undefined ? { dir: deps.dir } : {}),
      onPoint: faultPoint
    }),
    fingerprint: () => deps.store.contentFingerprint(),
    busy: deps.busy,
    onTrouble: reportRingTrouble
  });
  schedule.start();
  await schedule.maybeTake('launch');
  return schedule;
}

/**
 * Say once that backups of the session list are failing, and once when they
 * start working again.
 *
 * Research 33 §3.1 is the reason this is not a `console.warn`. The last time
 * this app had a verified copy path, a failure was silent and the user believed
 * they had protection they did not have. The shipped app has no terminal, so a
 * log line is silence.
 */
function reportRingTrouble(state: RingScheduleState): void {
  if (state.consecutiveFailures === 0) {
    console.log('[gmux] the manifest is being backed up again');
    return;
  }
  postDurabilityNotice({
    kind: 'backup-failing',
    detail: state.lastFailure ?? 'unknown'
  });
}
