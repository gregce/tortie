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

import { existsSync, renameSync, statSync, type Stats } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  checkDatabaseIntegrity,
  isUnreadable,
  quarantineDatabase
} from '../db/integrity';
import { readSchemaStateAt } from '../db/schema-version';
import { faultPoint, type FaultPointName } from '../fault';
import { postDurabilityNotice } from '../notice';
import {
  backupsDir,
  describeBackupRing,
  readDatabaseEvidence,
  removeDatabaseFiles,
  resolveVerifiedBackup,
  restoreFromBackup,
  snapshotDatabase,
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
  /** What the kept copy of the old schema did. See keepPreSchemaCopy. */
  keptPreSchema: KeptPreSchemaCopy;
  /** One sentence per step, in order. */
  lines: string[];
}

/**
 * Migrations that change the session list in a way an older build cannot
 * safely write, by the rule in research 27 §4.3.
 *
 * The rule is stricter than SQLite's tolerance. A migration is on this list
 * whenever a new column is REQUIRED for correct restore, even in the case
 * where SQLite would happily let an older build insert rows without it. That
 * quiet case is the dangerous one: the insert works, the column is NULL, and
 * the rows cannot be restored correctly afterwards with no error anywhere.
 *
 * Adding a name here is what makes the keepsake copy happen. It is a
 * deliberate, reviewable act and it belongs beside the reasoning rather than
 * inside the migration list, where it would read as a detail.
 */
const BREAKING_MIGRATIONS: ReadonlySet<string> = new Set([
  // Phase 21. `agent_contract` is what the restore path reads to decide
  // whether a conversation comes back. A build that does not know the column
  // leaves it NULL, and those rows fall back to asking the live registry,
  // which is the defect Phase 21 removes.
  '008-agent-recovery-contract'
]);

/** What happened to the kept copy of the last openable schema. */
export interface KeptPreSchemaCopy {
  taken: boolean;
  /**
   * - `breaking`: a breaking migration was pending and a copy was kept.
   * - `additive`: the pending migrations are all additive, so none is needed.
   * - `nothing-pending`: the schema is already current.
   * - `already-kept`: a copy for this schema number is already there AND it
   *   opens, so the older file is the one worth having. One that does not open
   *   is not a copy, and it is taken again as `breaking`.
   * - `failed`: the copy could not be taken or did not verify.
   */
  why: 'breaking' | 'additive' | 'nothing-pending' | 'already-kept' | 'failed';
  /** Where the copy is, when there is one. */
  path: string | null;
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
    keptPreSchema: { taken: false, why: 'nothing-pending', path: null },
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

  // ---- Step 2b: the kept copy, for a BREAKING migration only --------------
  report.keptPreSchema = keepPreSchemaCopy(dbPath, report.preMigration, say);

  return report;
}

/**
 * Keep one copy of the last schema an older build can open, before a BREAKING
 * migration runs (research 27 §4.5).
 *
 * WHY THE RING IS NOT ENOUGH ON ITS OWN. Step 2 above takes a verified
 * generation and that generation is the right protection against a migration
 * that goes wrong. It is the wrong protection against a DOWNGRADE, because the
 * ring is a ring: it keeps five generations and prunes the oldest, and it takes
 * one at launch, every five minutes, on sleep and on quit. Twenty five minutes
 * after the upgrade the copy of the old schema has been rotated out. The
 * downgrade story needs a file that is still there next month.
 *
 * So this is a second copy with a different lifetime, and the difference is the
 * whole reason it exists.
 *
 *  - It is taken ONLY for a breaking migration. Additive migrations do not need
 *    it, measured: research 27 §4.2 ran an older build's INSERT against a
 *    manifest with an added nullable column and it worked.
 *  - A copy that OPENS is never overwritten. If a readable file for this schema
 *    number is already there, the older one is the one worth keeping, because
 *    it is the one from before the first upgrade. One that cannot be opened is
 *    not a copy of anything and is taken again. See the note at that check.
 *  - It is NEVER deleted automatically. Nothing in Tortie removes it. Deleting
 *    the user's last openable copy on their behalf is the move this whole
 *    section exists to avoid.
 *  - It appears at its final name complete, or it does not appear. The copy is
 *    written to a temporary name and renamed on top after it verifies.
 *
 * It never throws. A boot that refuses to start because a copy failed is worse
 * than the failure it is reporting.
 */
function keepPreSchemaCopy(
  dbPath: string,
  preMigration: PreMigrationOutcome,
  say: (line: string) => void
): KeptPreSchemaCopy {
  if (preMigration.pending.length === 0) {
    return { taken: false, why: 'nothing-pending', path: null };
  }

  const breaking = preMigration.pending.filter((name) =>
    BREAKING_MIGRATIONS.has(name)
  );
  if (breaking.length === 0) {
    return { taken: false, why: 'additive', path: null };
  }

  // The number the file is AT, which is the number an older build understands.
  // Not the number this build is about to write.
  //
  // `user_version` is preferred and the migration count is the fallback,
  // because every manifest written before Phase 21 carries `user_version 0`:
  // the pragma existed and nothing had ever written it. Measured on the
  // operator's own 38 session manifest, which is at seven migrations and says
  // 0. Naming its keepsake `pre-schema-0` would be a filename that tells the
  // user nothing about which build can open it.
  const stamped = readSchemaStateAt(dbPath)?.userVersion ?? 0;
  const applied = MANIFEST_MIGRATION_NAMES.length - preMigration.pending.length;
  const from = stamped > 0 ? stamped : applied;

  // Named after the file it is a copy OF, not after the string "manifest".
  // In the shipping app those are the same word, because the path is always
  // `<userData>/gmux/manifest.db`. They are not the same word for a caller
  // that passes another path, and a keepsake named for a file it is not a
  // copy of is the kind of quiet wrongness this phase exists to remove.
  const stem = basename(dbPath).replace(/\.db$/, '');
  const path = join(dirname(dbPath), `${stem}.pre-schema-${String(from)}.db`);

  // A regular file, specifically. Something else sitting at that path is not
  // a copy of anything, and reporting it as one would tell the user they have
  // a downgrade route they do not have.
  const occupant = statOrNull(path);
  if (occupant !== null && !occupant.isFile()) {
    say(
      `${path} is not a file, so no copy of the session list could be kept ` +
        'there. It was left exactly as it is and the migration still runs.'
    );
    return { taken: false, why: 'failed', path: null };
  }
  // A FILE IS NOT A COPY UNTIL IT READS. This is the fix round's correction,
  // and a verifier measured why it was needed. `already-kept` used to be
  // decided by `statSync().isFile()` alone, so a copy torn by a crash part way
  // through passed the check, was reported as "already there and left exactly
  // as it is", and was never replaced, by design, because nothing here ever
  // deletes a keepsake. Out of 60 boots killed at a random point between 50 ms
  // and 70 ms the keepsake was present 39 times and 3 of those 39 could not be
  // opened. The user was then told they had a downgrade route that did not
  // exist, and the ring rotates the old schema away about 25 minutes later.
  if (occupant !== null) {
    if (keepsakeReads(path)) {
      say(
        `a copy of the session list from before schema ${String(from)} is ` +
          `already at ${path}, and it was left exactly as it is`
      );
      return { taken: false, why: 'already-kept', path };
    }
    // Replacing it is safe here in a way it would not be at any other moment.
    // Reaching this line means a breaking migration is still PENDING, so the
    // file being copied is still at the old schema, and a fresh copy of it is
    // the same thing the torn one was trying to be. The rule that the older
    // copy is the one worth keeping applies to copies that can be opened.
    say(
      `the copy of the session list at ${path} cannot be opened, so it is ` +
        'being taken again from the session list as it is now.'
    );
  }

  // ONE FILE APPEARS AT THE FINAL NAME, AND IT IS ALREADY COMPLETE. The copy
  // goes to a temporary name and is renamed on top only after it has been
  // verified against the source, so a crash during the copy leaves a partial
  // file with a name nothing believes in, and the next boot takes the copy
  // again. `renameSync` within one directory is atomic.
  const partial = `${path}.partial`;
  // Clearing the temporary file must never be the reason a boot fails. It is
  // best effort by construction: whatever is left behind carries a name no
  // later boot reads, and the next attempt writes over it.
  const discardPartial = (): void => {
    try {
      removeDatabaseFiles(partial);
    } catch {
      /* something else is at that name; the next attempt will say so */
    }
  };
  try {
    const result = snapshotDatabase({ from: dbPath, to: partial });
    if (!result.ok) {
      discardPartial();
      say(
        `the keepsake copy at ${path} did not match the session list ` +
          `(${result.differences.join('; ')}), so it is not being relied on. ` +
          'The migration still runs, because refusing to launch is worse.'
      );
      return { taken: false, why: 'failed', path: null };
    }
    renameSync(partial, path);
    say(
      `${breaking.join(', ')} changes the session list in a way an older ` +
        `Tortie cannot write. A copy of it as it is now was kept at ${path}, ` +
        'and nothing will ever delete it.'
    );
    return { taken: true, why: 'breaking', path };
  } catch (err) {
    discardPartial();
    say(
      `the keepsake copy of the session list could not be taken ` +
        `(${(err as Error).message}). The migration still runs.`
    );
    return { taken: false, why: 'failed', path: null };
  }
}

/**
 * Can this keepsake still be opened and read as a session list?
 *
 * Two questions, because a torn SQLite file can fail either. The pages have to
 * hold together, and the one table the copy exists for has to be selectable.
 * A file that passes both is a file an older Tortie can open, which is the
 * whole promise being made about it.
 */
function keepsakeReads(path: string): boolean {
  if (!checkDatabaseIntegrity(path).ok) return false;
  // The same read the ring uses to prove a generation, so there is one way in
  // this codebase to ask whether a copy of the manifest opens. `counts` comes
  // from the file's own table list, so a missing `sessions` means the bytes
  // are readable and are not a session list.
  const evidence = readDatabaseEvidence(path);
  return evidence.error === undefined && evidence.counts.sessions !== undefined;
}

/** `statSync`, with "there is nothing there" as a value rather than a throw. */
function statOrNull(path: string): Stats | null {
  try {
    return statSync(path);
  } catch {
    return null;
  }
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
