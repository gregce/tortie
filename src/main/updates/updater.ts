/**
 * Self update (Phase 24). This is the ONE module that imports
 * electron-updater, and every rule about updating lives here.
 *
 * VERSION 7 MIGRATION SURFACE. electron-updater 7 is a breaking release. It
 * renames the arguments of quitAndInstall to a single options object, and it
 * renames autoInstallOnAppQuit to autoInstallEvent. This file is written
 * against the version 6 interface and is the only file that imports
 * electron-updater, so the version 7 migration is this one file. The one
 * quitAndInstall call below passes zero arguments, so the argument rename
 * costs nothing.
 *
 * THE RULES THIS MODULE AND ITS SURFACES ENFORCE.
 *
 * 1. Never check at launch. Boot is when restore replays scrollback, and an
 *    update check has no business competing for that moment. The first check
 *    runs 30 seconds after the updater init, then every 6 hours.
 * 2. A failed background check is one log line and nothing else. Only a user
 *    initiated check, through checkForUpdatesNow, may put words on a screen.
 * 3. Tortie never calls quitAndInstall on its own and never relaunches
 *    itself. An app that restarts itself is an app that decides for you. The
 *    single sanctioned call site is installStagedUpdateNow, reached only from
 *    the staged dialog's Update Now button.
 * 4. Staged means STAGED BY THE OS UPDATER, not downloaded (Phase 31). The
 *    library's public update-downloaded event fires when its own download
 *    finishes, about 1.6 seconds BEFORE Squirrel has verified, staged and
 *    submitted the ShipIt job. A quit in that gap installs nothing, which is
 *    measured, not guessed (build/update-rehearsal.mjs). So stagedVersion
 *    flips only when Electron's native autoUpdater emits update-downloaded,
 *    and the menu item and the ready dialog both appear at that honest
 *    moment. The ready dialog in ./ui.ts is a sanctioned surface, shown once
 *    and only after a check the user started.
 * 5. A failed install is said out loud once (Phase 31). The library event
 *    records the promise (pendingVersion, pendingRecordedAt) in updates.json,
 *    and the first launch after a broken promise shows one dialog naming the
 *    reason read from ShipIt's own log. That surface is ./refusal-check.ts
 *    plus ./ui.ts, and it is the second sanctioned dialog outside a user
 *    initiated check, allowed because it reports a failure.
 * 6. ONE STAGING PER RUN (Phase 43). Once an update has been handed to the
 *    OS installer, this run checks for updates no more. The reason is
 *    measured, not cautious. electron-updater clears its own download guard
 *    in a `finally` as soon as the first cycle ends, so a later check runs
 *    the whole staging path again from the cached zip and calls
 *    `nativeUpdater.checkForUpdates()` a second time. Every Squirrel
 *    staging deletes the update directories of the previous ones, including
 *    the one the pending install is waiting on. That is how the operator's
 *    machine reached a state where no update could install at all on
 *    2026-08-15. The diagnosis is docs/research/46-updater-wreckage.md. The
 *    guard is `handedToInstaller` below, and `rearmUpdateChecks()` is the
 *    one way to undo it, called by ./recovery.ts after a repair.
 *
 * LOGGING (Phase 31). Every line this module logs, including everything
 * electron-updater says through the logger hook below, goes through
 * ./log.ts, which also appends it to <userData>/logs/updates.log in
 * packaged builds. The next incident must not depend on Squirrel's cache
 * being the only record.
 *
 * THE FEED OVERRIDE GATE, for the update rehearsal and for nothing else.
 * TORTIE_UPDATE_FEED points the updater at a generic feed, and the URL is
 * honored only when every one of these holds:
 *
 * - GMUX_UPDATE_REHEARSAL=1 is set, the explicit second flag;
 * - activeTmuxSocket() returns a name other than "gmux", which itself can
 *   only happen when the supervisor's harness gate accepted an override;
 * - the userData path does not end with "/Tortie", that is, the launch
 *   carries an isolated --user-data-dir.
 *
 * If TORTIE_UPDATE_FEED is set and any condition fails, the updater logs the
 * pinned refusal and uses the release feed. Squirrel refuses anything not
 * signed with the same designated requirement, so the override cannot install
 * foreign bytes. The gate exists so a stray variable cannot even redirect the
 * check. The predicate is feedOverrideDecision, pure and exported, and the
 * unit tests cover every combination of the three conditions.
 *
 * CALLS THIS MODULE REFUSES, so nobody reaches for them later.
 *
 * - checkForUpdatesAndNotify posts an OS notification. The announcement is
 *   one menu item and nothing else.
 * - stagingPercentage is skipped on purpose. There is one user, so a
 *   percentage is theatre. Revisit when there is a population.
 * - channel and allowPrerelease are unused. There are no channels today, and
 *   setting channel also silently flips allowDowngrade, which must stay under
 *   the control of updates.json alone.
 * - downloadUpdate is unused. autoDownload already downloads, and a second
 *   path is a second policy.
 * - forceDevUpdateConfig is unused. The rehearsal runs a real packaged app,
 *   and dev builds do not update.
 * - disableDifferentialDownload is left at its default. Deltas fall back to
 *   a full download on their own.
 *
 * Ownership: src/main/updates/updater.ts (Builder A, Phase 24).
 */

// autoUpdater from 'electron' is the ELECTRON BUILTIN wrapping Squirrel.Mac,
// not electron-updater, so the one module rule for electron-updater holds.
// The native staged listener below rides beside the library's own listener
// on the same ordinary EventEmitter, so neither disturbs the other.
import { app, autoUpdater as nativeUpdater } from 'electron';
import type { UpdateInfo } from 'electron-updater';
import { autoUpdater } from 'electron-updater';
import type { UpdateUiState } from '@shared/ipc';
import { logUpdateEvent } from './log';
import { isConfirmedRehearsal } from './rehearsal';
import { readUpdateState, writeUpdateState } from './state';
import { activeTmuxSocket } from '../tmux/supervisor';

// UpdateUiState is the `updates:state` response type, so it lives in
// src/shared/ipc.ts with the channel. The outcome union below is shared only
// between this module and ./ui.ts, so it lives here.

export type UpdateCheckOutcome =
  | { kind: 'staged'; version: string }
  | { kind: 'downloading'; version: string }
  | { kind: 'none'; currentVersion: string }
  | { kind: 'failed' } // detail already logged; dialogs use fixed copy
  | { kind: 'unsupported' }; // dev build

// ---------------------------------------------------------------------------
// Timers and logging
// ---------------------------------------------------------------------------

/** First check, 30 seconds after the init and never at launch. */
const FIRST_CHECK_DELAY_MS = 30_000;
/** Then every 6 hours while the app is running. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function logInfo(message: string): void {
  logUpdateEvent('info', message);
}

function logWarn(message: string): void {
  logUpdateEvent('warn', message);
}

/** Renders whatever electron-updater hands its logger into one line. */
function line(args: unknown[]): string {
  return args
    .map((a) => (a instanceof Error ? a.message : String(a)))
    .join(' ');
}

// ---------------------------------------------------------------------------
// The feed override gate (pure, exported for the unit tests)
// ---------------------------------------------------------------------------

export interface FeedOverrideDecision {
  /** The rehearsal feed URL to use, or null to stay on the release feed. */
  url: string | null;
  /** True when TORTIE_UPDATE_FEED was set but a condition failed. */
  refused: boolean;
}

/**
 * Decide whether TORTIE_UPDATE_FEED may redirect the update check. The
 * conditions are in the module header and they are now held in one place,
 * ./rehearsal.ts, because Phase 43 added a second variable that answers to
 * the same three conditions. This function's signature, its behaviour and
 * its pinned refusal string did not change when the rule moved.
 */
export function feedOverrideDecision(
  env: NodeJS.ProcessEnv,
  socketName: string,
  userDataPath: string
): FeedOverrideDecision {
  const url = (env['TORTIE_UPDATE_FEED'] ?? '').trim();
  if (url === '') return { url: null, refused: false };
  if (isConfirmedRehearsal(env, socketName, userDataPath)) {
    return { url, refused: false };
  }
  return { url: null, refused: true };
}

// ---------------------------------------------------------------------------
// State this module holds for the surfaces (menu, dialogs, Settings row)
// ---------------------------------------------------------------------------

/**
 * Version the library finished downloading, before Squirrel stages it.
 * Internal, drives nothing visible. It exists because the native staged
 * event carries no version, so the pairing is ours.
 */
let downloadedVersion: string | null = null;
/** Version staged by the OS updater. A quit from here installs it. */
let stagedVersion: string | null = null;
/** When a check last completed in this run; falls back to updates.json. */
let lastCheckedAt: number | null = null;
/** Lazy one-time read of updates.json for the fallback above. */
let diskLastCheckedAt: number | null | undefined;
/**
 * True once this run handed an update to the OS installer (Phase 43, rule 6
 * in the module header). From that moment no check runs, because a second
 * staging deletes the copy the pending install is waiting on.
 */
let handedToInstaller = false;
/** The refusal above is worth one line per run, not one line per check. */
let noSecondStagingLogged = false;
/** True when this launch found updater state that stops any install. */
let needsUpdateRepair = false;

/**
 * The pinned refusal for rule 6. build/assert-bundle-refusals.mjs checks
 * that both halves of this sentence reach the shipped bundle, because a
 * guard the bundler removed is a guard the product only claims to have.
 */
const NO_SECOND_STAGING_REFUSAL =
  'Tortie is not checking for updates again, because it already handed an update to the installer in this run. ' +
  'A second check would delete the copy the installer is waiting on.';

function logNoSecondStagingRefusal(): void {
  if (noSecondStagingLogged) return;
  noSecondStagingLogged = true;
  logWarn(NO_SECOND_STAGING_REFUSAL);
}

type StateListener = () => void;
const listeners = new Set<StateListener>();

function notifyStateChanged(): void {
  for (const listener of listeners) listener();
}

/**
 * Fires when an update is staged and when a check completes. The menu
 * rebuilds off this, the same pattern as watchRecentsForMenu. Returns an
 * unsubscribe.
 */
export function onUpdateStateChanged(cb: StateListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * What the surfaces draw from, synchronously. Safe in dev, where it reports
 * the current version, no staged update and whatever updates.json remembers.
 */
export function getUpdateUiState(): UpdateUiState {
  if (lastCheckedAt === null && diskLastCheckedAt === undefined) {
    diskLastCheckedAt = readUpdateState().lastCheckedAt;
  }
  return {
    currentVersion: app.getVersion(),
    stagedVersion,
    lastCheckedAt: lastCheckedAt ?? diskLastCheckedAt ?? null,
    needsUpdateRepair
  };
}

/**
 * Forget this run's staging so a repaired updater can check again (Phase
 * 43). Called by ./recovery.ts after a successful clear, and by nothing
 * else. The notify rebuilds the menu, which drops the staged item that no
 * longer means anything, because the bundle it named has just been removed.
 */
export function rearmUpdateChecks(): void {
  handedToInstaller = false;
  noSecondStagingLogged = false;
  downloadedVersion = null;
  stagedVersion = null;
  logInfo(
    'the updater state was cleared, so this run may check for updates again'
  );
  notifyStateChanged();
}

/**
 * Set by ./refusal-check.ts at launch when a standing wreck is found, and
 * cleared by ./recovery.ts after a repair. The only thing it changes is
 * whether the Tortie menu carries the "Repair Updates…" item, so a user who
 * clicked "Not Now" can still reach the action.
 */
export function setUpdaterRepairNeeded(needed: boolean): void {
  if (needsUpdateRepair === needed) return;
  needsUpdateRepair = needed;
  notifyStateChanged();
}

/** A check completed. Remember when, for this run and for the next one. */
function recordCheckCompleted(): void {
  lastCheckedAt = Date.now();
  writeUpdateState({ lastCheckedAt });
  notifyStateChanged();
}

// ---------------------------------------------------------------------------
// Init and the two timers
// ---------------------------------------------------------------------------

let initialized = false;

/**
 * Wire the updater. A no-op in dev builds, and never reached by the
 * harnesses, because every harness mode returns before normal startup gets
 * here. The first check runs 30 seconds later and NEVER at launch.
 */
export function initUpdater(): void {
  if (initialized) return;
  initialized = true;
  if (!app.isPackaged) {
    // Dev builds do not update. forceDevUpdateConfig stays unused on
    // purpose, because the rehearsal runs a real packaged app.
    return;
  }

  autoUpdater.logger = {
    info: (...args: unknown[]) => logInfo(line(args)),
    warn: (...args: unknown[]) => logWarn(line(args)),
    error: (...args: unknown[]) => logWarn(line(args)),
    debug: (...args: unknown[]) => logInfo(line(args))
  };

  // The defaults, stated explicitly so the intent survives a default change.
  // Staged means downloaded, and the install rides the user's own quit.
  // autoInstallOnAppQuit is the version 6 name. Version 7 renames it to
  // autoInstallEvent, and this line is where that migration lands.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // The hidden escape hatch. False unless updates.json says exactly true.
  // See state.ts for when a human would ever write that.
  autoUpdater.allowDowngrade = readUpdateState().allowDowngrade;

  // The feed override gate. The conditions are in the module header, the
  // predicate is pure and tested, and the refusal wording is pinned by
  // build/assert-bundle-refusals.mjs.
  const decision = feedOverrideDecision(
    process.env,
    activeTmuxSocket(),
    app.getPath('userData')
  );
  if (decision.refused) {
    logWarn(
      'TORTIE_UPDATE_FEED is set, but this launch is not a confirmed rehearsal, so the override is ignored. The update feed stays the release feed.'
    );
  } else if (decision.url !== null) {
    // Only ever under the gate. Never on any other path.
    autoUpdater.setFeedURL({ provider: 'generic', url: decision.url });
    logInfo(`rehearsal feed override accepted: ${decision.url}`);
  }

  // The library's update-downloaded fires when its zip is verified and its
  // loopback proxy is up. Squirrel has NOT staged anything yet, and a quit
  // here installs nothing (Phase 24 measured about 1.6 seconds between this
  // event and the native one, and a quit 0.2 seconds after this one
  // installed nothing). So this event flips nothing visible. It records the
  // pending promise to disk, which is what the next launch reads if the
  // install never happens (Phase 31, the refusal check).
  // update-available deliberately surfaces nothing, because the announcement
  // is the staged menu item and an undownloaded update is not staged.
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    downloadedVersion = info.version;
    // Phase 43, rule 6. This is the moment the library's loopback proxy went
    // up and Squirrel was told to fetch, so it is the moment after which
    // another check would re-stage and delete the copy the pending install
    // is waiting on.
    handedToInstaller = true;
    writeUpdateState({
      pendingVersion: info.version,
      pendingRecordedAt: Date.now()
    });
    logInfo(`update ${info.version} is downloaded and staging has started`);
  });

  // Electron's own native autoUpdater emits update-downloaded when Squirrel
  // has verified the signature, staged the bundle and submitted the ShipIt
  // job. THIS is the honest ready moment: a quit from here installs. The
  // native event carries no version this module trusts, so it is paired
  // with the version the library event above recorded. The staged menu item
  // and the ready dialog in ./ui.ts both follow the notify below.
  nativeUpdater.on('update-downloaded', () => {
    if (downloadedVersion === null) {
      logWarn(
        'the OS updater reported a staged update this run never downloaded, so it is ignored'
      );
      return;
    }
    stagedVersion = downloadedVersion;
    logInfo(`update ${stagedVersion} is staged and installs when you quit`);
    notifyStateChanged();
  });

  // A background failure lands here and in the logger above, and nowhere the
  // user sees. The listener must exist either way, because an 'error' event
  // with no listener would throw.
  autoUpdater.on('error', (err: Error) => {
    logWarn(`update check failed: ${err.message}`);
  });

  setTimeout(() => {
    void backgroundCheck();
  }, FIRST_CHECK_DELAY_MS);
  setInterval(() => {
    void backgroundCheck();
  }, CHECK_INTERVAL_MS);
}

/** The timer path. Failures are already logged; nothing else happens. */
async function backgroundCheck(): Promise<void> {
  if (handedToInstaller) {
    logNoSecondStagingRefusal();
    return;
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result !== null) recordCheckCompleted();
  } catch {
    // The 'error' listener above already wrote the one allowed line.
  }
}

// ---------------------------------------------------------------------------
// The interactive check and the one install call
// ---------------------------------------------------------------------------

/**
 * The menu item's check. Never rejects. This is the only path that is
 * allowed to report success or failure to the user, and the dialogs that do
 * the reporting live in ./ui.ts with fixed copy.
 */
export async function checkForUpdatesNow(): Promise<UpdateCheckOutcome> {
  if (!app.isPackaged) return { kind: 'unsupported' };
  // Phase 43, rule 6. Answer from what this run already knows rather than
  // calling the library. The user still gets the ordinary dialog, so the
  // menu item is not dead, and lastCheckedAt stops moving, which is honest,
  // because no check is running.
  if (handedToInstaller && downloadedVersion !== null) {
    logNoSecondStagingRefusal();
    return stagedVersion !== null
      ? { kind: 'staged', version: stagedVersion }
      : { kind: 'downloading', version: downloadedVersion };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result === null) return { kind: 'unsupported' };
    recordCheckCompleted();
    if (!result.isUpdateAvailable) {
      return { kind: 'none', currentVersion: app.getVersion() };
    }
    const version = result.updateInfo.version;
    if (stagedVersion === version) return { kind: 'staged', version };
    // autoDownload is on, so the download is already in flight. Between the
    // library's download finishing and Squirrel staging it, "downloading" is
    // the literal truth, and the native staged event flips the state and
    // tells the menu when a quit really installs.
    return { kind: 'downloading', version };
  } catch {
    // The 'error' listener logged the detail. The dialog uses fixed copy.
    return { kind: 'failed' };
  }
}

/**
 * The ONE quitAndInstall call site in the whole codebase, reached only from
 * the staged dialog's Update Now button. Zero arguments, so the version 7
 * argument rename costs nothing. Tortie never calls this on its own
 * initiative. A no-op unless an update really is staged.
 */
export function installStagedUpdateNow(): void {
  if (stagedVersion === null) return;
  autoUpdater.quitAndInstall();
}
