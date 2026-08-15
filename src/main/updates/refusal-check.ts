/**
 * The refusal check (Phase 31, item 2, widened in Phase 43). Did the install
 * the last run promised actually happen, and if not, why not?
 *
 * THE FIRST INCIDENT THIS ANSWERS. On 2026-08-14 the operator's first live
 * update downloaded, staged, and then never installed. ShipIt aborted three
 * times with SQRLInstallerErrorDomain code -9, "there are 1 running
 * instances of the target app", because the operator relaunched into the
 * install window that follows a quit. Tortie surfaced nothing.
 *
 * THE SECOND INCIDENT, one day later. On 2026-08-15 the same machine reached
 * a worse state. Two stagings ran 5.609 s apart, the second deleted the
 * staged bundle the first had left the pending install pointing at, and
 * ShipIt failed with SQRLInstallerErrorDomain code -1, "Failed to copy
 * bundle", POSIX error 2. launchd retried, Squirrel counted 3 attempts in
 * its own preferences domain and wrote "Too many attempts to install,
 * aborting update". From that moment no install could ever succeed until
 * someone cleared the saved count. Tortie again surfaced nothing, and the
 * running 0.19.1 predated Phase 31, so it had neither the pending record nor
 * this check. The full diagnosis is docs/research/46-updater-wreckage.md.
 *
 * HOW SQUIRREL COUNTS INSTANCES, from disassembly of the shipped ShipIt
 * binary (docs/research/42-shipit-instance-counting.md). An instance counts
 * only when its bundle identifier AND its standardized bundle URL both match
 * the install request. So only a process running from /Applications/Tortie.app
 * can block the installed app's update. The dev build and any rehearsal copy
 * can never be the counted instance.
 *
 * THE DECISION, restated from the Phase 31 spec section 4.2:
 *
 *  1. Not packaged, or no pending promise on disk: nothing to say.
 *  2. Clear the pending fields FIRST, before any surface, so a crash loop
 *     can never repeat the dialog.
 *  3. Running version equals the promised version: the install happened.
 *  4. Version changed to something else: some other install happened.
 *  5. Otherwise the promise was broken. Read ShipIt's log, pick the reason.
 *
 * ORDERING CONTRACT. Step 4 compares against the stored `lastSeenVersion`,
 * and the post update self check REWRITES that field to the current version
 * on the same launch. `detectRefusedInstall` must therefore run before
 * `runPostUpdateSelfCheck` writes, which src/main/index.ts guarantees by
 * calling `announceRefusedInstallIfAny()` on the line before the self check,
 * and `announceRefusedInstallIfAny` must call this function before its first
 * await.
 *
 * THE SECOND ENTRY POINT (Phase 43). `detectStandingWreck` answers the case
 * the pending record cannot: a wreck that is on disk with no promise
 * attached to it. That covers a user who clicked "Not Now" last launch, and
 * it covers a machine wrecked by a build older than Phase 31, which is
 * exactly what the operator was running. It reads Squirrel's state directly
 * and announces one fingerprint at most once.
 *
 * Ownership: src/main/updates/refusal-check.ts (Builder A, Phase 31).
 */

import { app } from 'electron';
import { logUpdateEvent } from './log';
import {
  currentUpdaterPaths,
  inspectUpdaterHealth,
  readRepairMarkAt,
  readShipItLogLine,
  readShipItLogTail,
  type UpdaterHealth
} from './shipit-state';
import { readUpdateState, writeUpdateState } from './state';
import { setUpdaterRepairNeeded } from './updater';

/** The recency slop between the pending record and a cause line. */
const ABORT_SLOP_MS = 60_000;

export interface ShipItEvidence {
  /** The newest cause line inside the window. */
  reason: 'another-copy' | 'staged-bundle-missing' | 'unknown';
  /** True when the installer gave up inside the window. */
  gaveUp: boolean;
  /** Attempts counted, or null. */
  attempts: number | null;
  /** The cause line verbatim, or null. */
  line: string | null;
}

/**
 * Decide what the tail of ShipIt_stderr.log says about a broken promise
 * recorded at `sinceMs`. Pure, and unit tested against the verbatim lines
 * from both of the operator's incidents.
 *
 * The window is `sinceMs` minus 60 seconds and newer. That slop is Phase
 * 31's and it does not move. The rules:
 *
 * - `reason` is the newest `another-copy` or `staged-bundle-missing` line
 *   inside the window. Giving up is a consequence, not a cause, so it never
 *   becomes the reason on its own.
 * - `gaveUp` is true when a give up line sits inside the window.
 * - `attempts` is the highest "Resuming installation attempt N" inside the
 *   window. The limit of 3 is Squirrel's, so the copy states the number it
 *   counted rather than a number this codebase assumes.
 * - Nothing inside the window means `unknown` and `gaveUp: false`, which
 *   fails toward saying less. That is Phase 31's rule and it does not move.
 * - `ignoreAtOrBeforeMs` is the repair mark, added in the fix round. The
 *   repair keeps ShipIt_stderr.log, and the window's 60 seconds of slop
 *   reaches back past a repair that was followed at once by a download. A
 *   line from before the clear would then be read as this install's cause,
 *   so lines stamped at or before the mark are skipped.
 *
 * ShipIt writes an "Installation cancelled" line and untimestamped noise
 * lines after a cause line, so "the last line" means the last line OF A
 * KNOWN SHAPE, never the last line of the file. The timestamps parse as
 * local time, which is what NSLog writes.
 */
export function readShipItEvidence(
  tail: string,
  sinceMs: number,
  ignoreAtOrBeforeMs: number | null = null
): ShipItEvidence {
  const floor =
    ignoreAtOrBeforeMs === null
      ? sinceMs - ABORT_SLOP_MS
      : Math.max(sinceMs - ABORT_SLOP_MS, ignoreAtOrBeforeMs + 1);
  const lines = tail.split('\n');
  const evidence: ShipItEvidence = {
    reason: 'unknown',
    gaveUp: false,
    attempts: null,
    line: null
  };
  // Newest first, so the first cause line inside the window is the verdict.
  for (let i = lines.length - 1; i >= 0; i--) {
    const parsed = readShipItLogLine(lines[i] ?? '');
    if (parsed === null) continue;
    if (parsed.at === null || parsed.at < floor) continue;
    if (
      parsed.attempt !== null &&
      (evidence.attempts === null || parsed.attempt > evidence.attempts)
    ) {
      evidence.attempts = parsed.attempt;
    }
    if (parsed.terminal === 'gave-up') {
      evidence.gaveUp = true;
      continue;
    }
    if (
      evidence.reason === 'unknown' &&
      (parsed.terminal === 'another-copy' ||
        parsed.terminal === 'staged-bundle-missing')
    ) {
      evidence.reason = parsed.terminal;
      evidence.line = parsed.line;
    }
  }
  return evidence;
}

export interface RefusedInstall {
  version: string;
  reason: 'another-copy' | 'staged-bundle-missing' | 'unknown';
  gaveUp: boolean;
  attempts: number | null;
}

/**
 * Run the launch decision. Returns the broken promise to announce, or null
 * when there is nothing to say. Synchronous, never throws, and clears the
 * pending fields on disk before returning anything, so the announcement can
 * happen at most once per failed attempt.
 */
export function detectRefusedInstall(): RefusedInstall | null {
  try {
    if (!app.isPackaged) return null;
    const state = readUpdateState();
    if (state.pendingVersion === null || state.pendingRecordedAt === null) {
      return null;
    }
    const pending = state.pendingVersion;
    const recordedAt = state.pendingRecordedAt;
    // Clear FIRST, before any surface, so a crash between here and the
    // dialog cannot make the next launch say it again.
    writeUpdateState({ pendingVersion: null, pendingRecordedAt: null });
    const current = app.getVersion();
    if (current === pending) {
      logUpdateEvent(
        'info',
        `the promised install of ${pending} happened. This launch runs it.`
      );
      return null;
    }
    if (current !== state.lastSeenVersion) {
      logUpdateEvent(
        'info',
        `an install to ${pending} was promised, and this launch runs ${current}. Some other install happened, so there is nothing to announce.`
      );
      return null;
    }
    // The version did not change, so the promised install did not happen.
    const paths = currentUpdaterPaths();
    const evidence = readShipItEvidence(
      readShipItLogTail(paths.shipItDir),
      recordedAt,
      readRepairMarkAt(paths.shipItDir)
    );
    logRefusal(pending, evidence);
    return {
      version: pending,
      reason: evidence.reason,
      gaveUp: evidence.gaveUp,
      attempts: evidence.attempts
    };
  } catch (err) {
    // The check reports on a failed install. It must never become the
    // thing that fails a working launch.
    try {
      logUpdateEvent(
        'warn',
        `the refusal check did not finish: ${(err as Error).message}`
      );
    } catch {
      // Even the log line is optional here.
    }
    return null;
  }
}

/** One warning naming what the log said, whatever it said. */
function logRefusal(pending: string, evidence: ShipItEvidence): void {
  const gaveUp = evidence.gaveUp
    ? ` The installer then gave up after ${evidence.attempts === null ? 'an unrecorded number of' : String(evidence.attempts)} attempts, so it will not try again until the saved state is cleared.`
    : '';
  if (evidence.reason === 'another-copy') {
    logUpdateEvent(
      'warn',
      `the install of ${pending} was refused because another copy of Tortie was running. ShipIt wrote the line "${evidence.line ?? ''}"${gaveUp}`
    );
    return;
  }
  if (evidence.reason === 'staged-bundle-missing') {
    logUpdateEvent(
      'warn',
      `the install of ${pending} failed because the staged copy was gone from disk. ShipIt wrote the line "${evidence.line ?? ''}"${gaveUp}`
    );
    return;
  }
  logUpdateEvent(
    'warn',
    `the install of ${pending} did not happen and the ShipIt log does not say why.${gaveUp}`
  );
}

// ---------------------------------------------------------------------------
// The standing wreck (Phase 43)
// ---------------------------------------------------------------------------

export interface StandingWreck {
  reason: 'staged-bundle-missing' | 'gave-up';
  attempts: number | null;
  /** The health verdict, so the recovery can refuse on a stale one. */
  health: UpdaterHealth;
}

/**
 * A wreck on disk that no pending record explains, announced at most once.
 *
 * The rules, in order:
 *
 * 1. Not packaged: null. There is no updater state in a dev build.
 * 2. The health verdict is anything but `wrecked`: null.
 * 3. The verdict IS wrecked, so arm the menu item. This happens whether or
 *    not a dialog follows. The dialog is once per wreck, but the wreck
 *    itself outlives a "Not Now" and outlives the quit after it, so the
 *    menu item has to follow the disk rather than the announcement. Without
 *    this line a person who answered "Not Now" and quit would have no
 *    surface at all on the next launch.
 * 4. `wreckAnnouncedFor` already equals this wreck's fingerprint: null, so
 *    no dialog. The same wreck is offered once and does not nag every
 *    launch. The fingerprint is the terminal log line verbatim, timestamp
 *    and all, so a later incident never matches an earlier one.
 * 5. Otherwise write the fingerprint BEFORE returning, which is the same
 *    "clear first, then surface" discipline the pending path uses, and
 *    return the wreck.
 *
 * Never throws.
 */
export function detectStandingWreck(): StandingWreck | null {
  try {
    if (!app.isPackaged) return null;
    const health = inspectUpdaterHealth(currentUpdaterPaths());
    if (health.state !== 'wrecked' || health.reason === null) {
      // One line per launch, so the next incident can be read from the log
      // rather than guessed at. It is also what the healthy probe asserts.
      logUpdateEvent(
        'info',
        `the updater state on disk reads ${health.state}. Nothing to repair.`
      );
      return null;
    }
    // The menu item follows the disk, not the dialog. See rule 3 above.
    setUpdaterRepairNeeded(true);
    const fingerprint = health.fingerprint;
    if (fingerprint === null) return null;
    if (readUpdateState().wreckAnnouncedFor === fingerprint) {
      logUpdateEvent(
        'info',
        'the updater is still wrecked and this launch already offered to repair it, so nothing is shown again'
      );
      return null;
    }
    writeUpdateState({ wreckAnnouncedFor: fingerprint });
    logUpdateEvent(
      'warn',
      `the updater state on disk stops any install. Reason ${health.reason}, attempts ${health.attempts === null ? 'not recorded' : String(health.attempts)}. ShipIt wrote the line "${fingerprint}"`
    );
    return {
      reason: health.reason,
      attempts: health.attempts,
      health
    };
  } catch (err) {
    try {
      logUpdateEvent(
        'warn',
        `the standing wreck check did not finish: ${(err as Error).message}`
      );
    } catch {
      // Even the log line is optional here.
    }
    return null;
  }
}
