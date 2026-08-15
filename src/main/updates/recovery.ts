/**
 * The recovery verb (Phase 43). One action that clears what the installer
 * saved, so an update can be attempted again.
 *
 * WHAT IT REPLACES. On 2026-08-15 the operator's machine reached a state
 * where no update could ever install again. Squirrel had saved that it gave
 * up after 3 attempts, and that saved count makes every later install fail
 * at once. The orchestrator recovered by hand with four steps: delete
 * ShipItState.plist, delete the `update.*` staging directories, delete the
 * `com.itavero.tortie.ShipIt` preferences domain, and delete the updater's
 * pending download cache. This module is those four steps, in that order,
 * behind one button.
 *
 * WHAT IT NEVER REMOVES, stated here so a later cleanup does not "finish"
 * the job:
 *
 * - `ShipIt_stderr.log` and `ShipIt_stdout.log`. They are the evidence the
 *   next incident gets read from, and this module exists because of an
 *   incident that was only readable from that file.
 * - `<updater cache>/update.zip` and `<updater cache>/current.blockmap`.
 *   Those are the inputs to a differential download. Keeping them makes the
 *   next download smaller, and the sha512 check still applies to whatever
 *   arrives.
 * - Anything outside the ShipIt directory and the updater cache directory.
 * - Anything under userData.
 *
 * THE FIVE REFUSALS, all checked before the first delete. The second one is
 * the important one. The health is read again HERE, at click time, and is
 * never carried from launch, because a staging can complete while the
 * dialog sits on the screen and a recovery that deleted that staging would
 * be the exact defect this phase exists to remove.
 *
 * The third refusal was added in the fix round and is the second guard on
 * the same defect. A state file that parses and names a bundle that is not
 * this app is never Tortie's business, so the verb stops rather than
 * proceeding on the `unknown` verdict such a file produces. With the
 * symlink resolving comparison in ./shipit-state.ts this case should not be
 * reachable for our own bundle. It is here because when the comparison was
 * wrong, the fall through deleted a healthy staged update on a live run.
 *
 * THE REPAIR MARK. A successful clear writes `tortie-repair.json` into the
 * ShipIt directory, holding the epoch milliseconds of the clear.
 * ShipIt_stderr.log is kept on purpose, so without the mark the give up line
 * in it stays the newest terminal line and the next launch offers the same
 * repair again. ./shipit-state.ts skips every log line stamped at or before
 * the mark.
 *
 * IMPORTS. This module imports ./updater, ./shipit-state and ./log. It does
 * NOT import ./ui or ./refusal-check, because ./ui imports this module and
 * a cycle between them would be a load order defect waiting to happen. ./ui
 * is what runs the check after this resolves.
 *
 * Ownership: src/main/updates/recovery.ts (Phase 43).
 */

import { execFile } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';
import { logUpdateEvent } from './log';
import {
  currentUpdaterPaths,
  inspectUpdaterHealth,
  REPAIR_MARK_NAME,
  TORTIE_BUNDLE_ID,
  type UpdaterHealth,
  type UpdaterPaths
} from './shipit-state';
import { rearmUpdateChecks, setUpdaterRepairNeeded } from './updater';

/**
 * The pinned refusal. A ready update on disk is never cleared. This
 * sentence is checked in the shipped bundle by
 * build/assert-bundle-refusals.mjs.
 */
export const READY_UPDATE_REFUSAL =
  'Tortie is not clearing the updater state, because the update it prepared is still on disk and ready to install. ' +
  'It installs when you quit.';

/** The installer is doing the work right now, so nothing is taken from it. */
export const INSTALLER_RUNNING_REFUSAL =
  'The installer is running right now, so Tortie left its files alone. Wait for it to finish and try again.';

/**
 * The saved state belongs to a copy of Tortie that is not this one. Another
 * application's install is never this app's business, and the files it
 * would remove may be the ones that other copy is waiting on.
 */
export const FOREIGN_STATE_REFUSAL =
  "The installer's saved state names a different copy of Tortie, so Tortie left those files alone. Nothing was removed.";

export interface RecoveryOutcome {
  kind: 'cleared' | 'refused' | 'partial';
  /** Absolute paths removed, in the order they were removed. */
  removed: string[];
  /** Paths that could not be removed, with the reason. */
  failures: Array<{ path: string; message: string }>;
  /** Set when kind is 'refused'. The sentence the dialog shows. */
  refusal: string | null;
}

/**
 * The refusal order, pure, so the tests can prove it without a filesystem.
 * A refusal whose sentence is null is one the user never sees: there is
 * nothing worth interrupting a person for in a dev build or in a path shape
 * that never should have been reached.
 */
export function recoveryPlan(
  packaged: boolean,
  health: UpdaterHealth,
  shipItProcessRunning: boolean,
  pathsLookRight: boolean
): { proceed: boolean; refusal: string | null } {
  if (!packaged) return { proceed: false, refusal: null };
  if (health.state === 'healthy') {
    return { proceed: false, refusal: READY_UPDATE_REFUSAL };
  }
  // A state file that parses and names some other bundle is never cleared.
  // The verdict for that case is `unknown`, and `unknown` proceeds, so
  // without this line the verb would delete an install it cannot read.
  if (health.stateFilePresent && !health.targetsThisApp) {
    return { proceed: false, refusal: FOREIGN_STATE_REFUSAL };
  }
  if (shipItProcessRunning) {
    return { proceed: false, refusal: INSTALLER_RUNNING_REFUSAL };
  }
  if (!pathsLookRight) return { proceed: false, refusal: null };
  return { proceed: true, refusal: null };
}

/**
 * The path shape guard on GMUX_UPDATE_STATE_ROOT. A ShipIt directory must
 * end in `.ShipIt`, and outside a rehearsal root it must sit under the
 * user's own Caches directory. Even a gate failure therefore cannot turn
 * this verb into a general delete.
 */
export function pathsLookRight(paths: UpdaterPaths, home: string): boolean {
  if (!paths.shipItDir.endsWith('.ShipIt')) return false;
  if (paths.isRehearsalRoot) return true;
  return paths.shipItDir.startsWith(join(home, 'Library', 'Caches') + '/');
}

/** True when a ShipIt process for this bundle id is running right now. */
async function shipItIsRunning(): Promise<boolean> {
  return new Promise((resolveRunning) => {
    execFile(
      '/usr/bin/pgrep',
      ['-f', `${TORTIE_BUNDLE_ID}.ShipIt`],
      (_err, stdout) => {
        resolveRunning(String(stdout ?? '').trim() !== '');
      }
    );
  });
}

/** True when a domain cannot be read, which is what "already gone" is. */
async function defaultsDomainIsGone(domain: string): Promise<boolean> {
  return new Promise((resolveRead) => {
    execFile('/usr/bin/defaults', ['read', domain], (err) => {
      resolveRead(err !== null);
    });
  });
}

/**
 * Delete the preferences domain. This is the only way to make cfprefsd
 * forget the saved attempt count. Removing the plist file under
 * `~/Library/Preferences` does not, because cfprefsd holds it in memory and
 * writes it back.
 *
 * A domain that is ALREADY GONE is the state we want, so it counts as
 * success. The wording of that case is not stable across macOS releases,
 * which the fix round measured: on macOS 15.7.9 `defaults delete` on an
 * absent domain exits 1 and prints "Domain (com.itavero.tortie.ShipIt) not
 * found.", while older releases print "does not exist". A full repair was
 * reported to the user as partial because only the older wording was
 * accepted. Both wordings are accepted now, and any other failure is
 * confirmed by reading the domain back, so a new wording costs a wrong
 * message and nothing more.
 */
async function deleteDefaultsDomain(domain: string): Promise<string | null> {
  const said = await new Promise<string | null>((resolveDelete) => {
    execFile('/usr/bin/defaults', ['delete', domain], (err, _out, stderr) => {
      if (err === null) {
        resolveDelete(null);
        return;
      }
      resolveDelete(`${String(stderr ?? '')} ${err.message}`);
    });
  });
  if (said === null) return null;
  if (said.includes('does not exist') || said.includes('not found')) {
    return null;
  }
  if (await defaultsDomainIsGone(domain)) return null;
  return said.trim();
}

/** Remove one path recursively, recording the result. Never throws. */
function removePath(
  path: string,
  outcome: RecoveryOutcome,
  what: string
): void {
  if (!existsSync(path)) {
    logUpdateEvent('info', `repair: ${what} at ${path} was already gone`);
    return;
  }
  try {
    rmSync(path, { recursive: true, force: true });
    outcome.removed.push(path);
    logUpdateEvent('info', `repair: removed ${what} at ${path}`);
  } catch (err) {
    const message = (err as Error).message;
    outcome.failures.push({ path, message });
    logUpdateEvent('warn', `repair: could not remove ${path}. ${message}`);
  }
}

/**
 * Record that this directory was cleared, and when. The kept log is what
 * makes this necessary: without the mark its give up line stays the newest
 * terminal line for ever and the next launch reads a healed machine as
 * wrecked. A mark that cannot be written is one warning and nothing else,
 * because the clear itself already happened.
 */
function writeRepairMark(shipItDir: string, at: number): void {
  try {
    writeFileSync(
      join(shipItDir, REPAIR_MARK_NAME),
      `${JSON.stringify({ repairedAt: at }, null, 2)}\n`,
      'utf8'
    );
    logUpdateEvent(
      'info',
      `repair: marked ${shipItDir} as cleared at ${String(at)}`
    );
  } catch (err) {
    logUpdateEvent(
      'warn',
      `repair: could not write the repair mark. ${(err as Error).message}`
    );
  }
}

/** Every entry directly under the ShipIt directory named `update.*`. */
function stagingDirectories(shipItDir: string): string[] {
  try {
    return readdirSync(shipItDir, { withFileTypes: true })
      .filter((entry) => entry.name.startsWith('update.'))
      .map((entry) => join(shipItDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Clear the updater's wreckage and re-arm the check. Never throws. A step
 * that fails is collected and the run continues, because clearing three of
 * four things is better than clearing none.
 */
export async function repairUpdaterState(): Promise<RecoveryOutcome> {
  const outcome: RecoveryOutcome = {
    kind: 'cleared',
    removed: [],
    failures: [],
    refusal: null
  };
  try {
    const paths = currentUpdaterPaths();
    // Read the health AGAIN, here, at click time. A staging that finished
    // while the dialog sat open must survive this click.
    const health = app.isPackaged
      ? inspectUpdaterHealth(paths)
      : {
          state: 'unknown' as const,
          reason: null,
          stagedBundlePath: null,
          stagedBundleExists: false,
          stateFilePresent: false,
          targetsThisApp: false,
          attempts: null,
          fingerprint: null
        };
    const running = app.isPackaged ? await shipItIsRunning() : false;
    const shapeOk = pathsLookRight(paths, homedir());
    const plan = recoveryPlan(app.isPackaged, health, running, shapeOk);
    if (!plan.proceed) {
      outcome.kind = 'refused';
      outcome.refusal = plan.refusal;
      logUpdateEvent(
        'info',
        `repair refused. packaged=${String(app.isPackaged)} health=${health.state} installerRunning=${String(running)} pathsLookRight=${String(shapeOk)}`
      );
      return outcome;
    }

    logUpdateEvent(
      'info',
      `repair starting. ShipIt directory ${paths.shipItDir}, updater cache ${paths.updaterCacheDir}, defaults domain ${paths.defaultsDomain}, rehearsal root ${String(paths.isRehearsalRoot)}`
    );

    // 1. The state file that names the staged bundle.
    removePath(
      join(paths.shipItDir, 'ShipItState.plist'),
      outcome,
      'the installer state file'
    );
    // 2. Every staging directory, whether or not the state file named it.
    for (const dir of stagingDirectories(paths.shipItDir)) {
      removePath(dir, outcome, 'a staging directory');
    }
    // 3. The saved attempt count, which is what makes the wreck permanent.
    const defaultsError = await deleteDefaultsDomain(paths.defaultsDomain);
    if (defaultsError === null) {
      outcome.removed.push(`defaults domain ${paths.defaultsDomain}`);
      logUpdateEvent(
        'info',
        `repair: removed the preferences domain ${paths.defaultsDomain}`
      );
    } else {
      outcome.failures.push({
        path: `defaults domain ${paths.defaultsDomain}`,
        message: defaultsError
      });
      logUpdateEvent(
        'warn',
        `repair: could not remove the preferences domain ${paths.defaultsDomain}. ${defaultsError}`
      );
    }
    // 4. The pending download, so the next check downloads afresh. The
    //    update.zip beside it stays, because it only makes the next
    //    download smaller and the sha512 check still applies.
    removePath(
      join(paths.updaterCacheDir, 'pending'),
      outcome,
      'the pending download'
    );

    // `cleared` means every step went. Anything else is `partial`, including
    // the case where nothing could be removed at all, because the user was
    // told a clear was attempted and the honest answer is that some of it
    // did not happen.
    outcome.kind = outcome.failures.length === 0 ? 'cleared' : 'partial';
    // The mark goes down whether the clear was whole or partial. Every line
    // in the kept log is older than this moment either way, so none of them
    // may decide the next launch's verdict.
    writeRepairMark(paths.shipItDir, Date.now());
    setUpdaterRepairNeeded(false);
    rearmUpdateChecks();
    logUpdateEvent(
      'info',
      `repair finished as ${outcome.kind}. ${String(outcome.removed.length)} removed, ${String(outcome.failures.length)} failed.`
    );
    return outcome;
  } catch (err) {
    outcome.kind = outcome.removed.length === 0 ? 'refused' : 'partial';
    outcome.failures.push({
      path: '(the repair itself)',
      message: (err as Error).message
    });
    logUpdateEvent(
      'warn',
      `the repair did not finish: ${(err as Error).message}`
    );
    return outcome;
  }
}
