/**
 * What Squirrel left on disk, and what it means (Phase 43).
 *
 * This module reads. It never deletes anything. ./recovery.ts is the only
 * module that removes a file, and it asks this one what the state is before
 * it does.
 *
 * THE INCIDENT THIS ANSWERS, in one line. Every update check that runs after
 * a download has finished re-stages the update, and every Squirrel staging
 * deletes the staged bundle the pending install is waiting on. The full
 * diagnosis, with the operator's own log lines and the two disassembled call
 * sites inside Squirrel, is docs/research/46-updater-wreckage.md.
 *
 * WHAT SQUIRREL LEAVES BEHIND, in `~/Library/Caches/<bundle id>.ShipIt`:
 *
 * - `ShipItState.plist`, which parses as JSON despite its name. It holds
 *   `bundleIdentifier`, `targetBundleURL` and `updateBundleURL`. It SURVIVES
 *   a successful install, which research 42 section 4 observed on the
 *   operator's machine, so the plist alone never proves an install is
 *   waiting.
 * - `update.XXXXXXX` directories, one per staging, each holding the copy of
 *   the new app the install will move into place.
 * - `ShipIt_stderr.log`, plain NSLog text, which is the only record of what
 *   the installer actually did.
 *
 * And in the preferences domain `<bundle id>.ShipIt`, a saved count of how
 * many times an install has been attempted. Squirrel stops at 3 and writes
 * "Too many attempts to install, aborting update". From that moment every
 * later install fails at once, for ever, until the domain is cleared.
 *
 * THE STATE ROOT OVERRIDE. `GMUX_UPDATE_STATE_ROOT` moves all three of those
 * locations under a scratch directory. It is honoured only when
 * ./rehearsal.ts says the launch is a confirmed rehearsal. It exists so a
 * live probe can wreck and heal a copy of Squirrel's state without going
 * near the operator's. The rehearsal builds carry the production bundle id,
 * so the preferences domain gets a `.rehearsal` suffix under the override;
 * without the suffix a probe would delete the domain the installed app
 * shares.
 *
 * THE REPAIR MARK, added in the Phase 43 fix round after a live run showed
 * a false alarm. A repair deletes the state file and the staging
 * directories and keeps `ShipIt_stderr.log`, because that log is the only
 * evidence the next incident can be read from. The give up line in that
 * kept log stays the newest terminal line for ever, so the launch after a
 * SUCCESSFUL repair read the machine as wrecked again and offered the same
 * repair a second time. ./recovery.ts therefore writes `tortie-repair.json`
 * into the ShipIt directory when it clears, and every read below ignores a
 * log line stamped at or before that moment. The mark sits beside the state
 * it describes rather than in userData, so a fresh profile reading a healed
 * ShipIt directory reads it as healed.
 *
 * Ownership: src/main/updates/shipit-state.ts (Phase 43).
 */

import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';
import { logUpdateEvent } from './log';
import { isConfirmedRehearsal } from './rehearsal';
import { activeTmuxSocket } from '../tmux/supervisor';

/**
 * The bundle id Squirrel derives its cache directory and its preferences
 * domain from. This is `appId` in electron-builder.yml (line 59,
 * `appId: com.itavero.tortie`). If that line ever changes, this constant
 * moves with it or every read below reads the wrong directory.
 */
export const TORTIE_BUNDLE_ID = 'com.itavero.tortie';

/**
 * The directory electron-updater downloads into, under
 * `~/Library/Caches`. electron-builder writes `updaterCacheDirName` into
 * `app-update.yml` from the product name rather than from a line anyone
 * sets in electron-builder.yml, so a product name change would move it
 * silently. `resolveUpdaterPaths` reads the real file when it can and only
 * falls back to this value.
 */
export const UPDATER_CACHE_DIR_NAME = 'tortie-updater';

/** What a rehearsal's preferences domain gets, so it is never the real one. */
export const REHEARSAL_DEFAULTS_SUFFIX = '.rehearsal';

/**
 * The file ./recovery.ts writes into the ShipIt directory when it clears.
 * It holds one number, the epoch milliseconds of the clear. Squirrel never
 * reads it and its prune only removes `update.*` directories, so it
 * survives every later staging.
 */
export const REPAIR_MARK_NAME = 'tortie-repair.json';

/** How much of the tail of ShipIt_stderr.log is read. The file only grows. */
const TAIL_BYTES = 65536;

/**
 * Where Squirrel keeps its per-application state, e.g.
 * `~/Library/Caches/com.itavero.tortie.ShipIt`. Pure so the unit tests pin
 * it. Squirrel derives the directory the same way, from the job label
 * `<bundle id>.ShipIt`.
 */
export function shipItCacheDir(home: string, bundleId: string): string {
  return join(home, 'Library', 'Caches', `${bundleId}.ShipIt`);
}

// ---------------------------------------------------------------------------
// Where the state lives
// ---------------------------------------------------------------------------

export interface UpdaterPaths {
  /** e.g. ~/Library/Caches/com.itavero.tortie.ShipIt */
  shipItDir: string;
  /** e.g. ~/Library/Caches/tortie-updater */
  updaterCacheDir: string;
  /** The preferences domain holding Squirrel's install attempt counter. */
  defaultsDomain: string;
  /** True when the three paths above came from GMUX_UPDATE_STATE_ROOT. */
  isRehearsalRoot: boolean;
}

/**
 * Read `updaterCacheDirName` out of app-update.yml text. Pure. One regex,
 * because a YAML dependency for one scalar is a dependency for one scalar.
 */
export function parseUpdaterCacheDirName(text: string): string | null {
  const match = /^updaterCacheDirName:[ \t]*(\S+)[ \t]*$/m.exec(text);
  if (match === null) return null;
  const name = (match[1] ?? '').replace(/^["']|["']$/g, '').trim();
  return name === '' ? null : name;
}

/**
 * The cache directory name the packaged build actually carries, checked
 * rather than assumed. A missing, unreadable or keyless file reads as the
 * constant, and a disagreement is one warning naming both values.
 */
function updaterCacheDirName(): string {
  let text: string | null = null;
  try {
    const resources = process.resourcesPath;
    if (typeof resources === 'string' && resources !== '') {
      text = readFileSync(join(resources, 'app-update.yml'), 'utf8');
    }
  } catch {
    // A dev run has no app-update.yml, and an unreadable one is the same
    // answer as a missing one.
  }
  if (text === null) return UPDATER_CACHE_DIR_NAME;
  const parsed = parseUpdaterCacheDirName(text);
  if (parsed === null) return UPDATER_CACHE_DIR_NAME;
  if (parsed !== UPDATER_CACHE_DIR_NAME) {
    logUpdateEvent(
      'warn',
      `app-update.yml names the updater cache directory "${parsed}" and this build expects "${UPDATER_CACHE_DIR_NAME}". Using the name from app-update.yml.`
    );
  }
  return parsed;
}

/**
 * The three locations the updater's state lives in. The override is refused
 * unless every rehearsal condition holds, and a refused override is one
 * warning followed by the real paths.
 */
export function resolveUpdaterPaths(
  env: NodeJS.ProcessEnv,
  home: string,
  socketName: string,
  userDataPath: string
): UpdaterPaths {
  const cacheName = updaterCacheDirName();
  const root = (env['GMUX_UPDATE_STATE_ROOT'] ?? '').trim();
  const real: UpdaterPaths = {
    shipItDir: shipItCacheDir(home, TORTIE_BUNDLE_ID),
    updaterCacheDir: join(home, 'Library', 'Caches', cacheName),
    defaultsDomain: `${TORTIE_BUNDLE_ID}.ShipIt`,
    isRehearsalRoot: false
  };
  if (root === '') return real;
  if (!isConfirmedRehearsal(env, socketName, userDataPath)) {
    logUpdateEvent(
      'warn',
      'GMUX_UPDATE_STATE_ROOT is set, but this launch is not a confirmed rehearsal, so the override is ignored. The updater reads the real Squirrel state.'
    );
    return real;
  }
  return {
    shipItDir: join(root, `${TORTIE_BUNDLE_ID}.ShipIt`),
    updaterCacheDir: join(root, cacheName),
    defaultsDomain: `${TORTIE_BUNDLE_ID}.ShipIt${REHEARSAL_DEFAULTS_SUFFIX}`,
    isRehearsalRoot: true
  };
}

/** The paths for this running process. The one effectful wrapper. */
export function currentUpdaterPaths(): UpdaterPaths {
  return resolveUpdaterPaths(
    process.env,
    homedir(),
    activeTmuxSocket(),
    app.getPath('userData')
  );
}

// ---------------------------------------------------------------------------
// Squirrel's state file
// ---------------------------------------------------------------------------

export interface ShipItState {
  bundleIdentifier: string | null;
  targetBundleURL: string | null;
  updateBundleURL: string | null;
}

/** A field that is not a non empty string reads as null. */
function stringField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * Parse ShipItState.plist, which is JSON despite its name (research 42
 * section 4). Anything that does not parse, or parses to something that is
 * not an object, reads as null.
 */
export function parseShipItState(text: string): ShipItState | null {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const row = parsed as Record<string, unknown>;
  return {
    bundleIdentifier: stringField(row, 'bundleIdentifier'),
    targetBundleURL: stringField(row, 'targetBundleURL'),
    updateBundleURL: stringField(row, 'updateBundleURL')
  };
}

/** A `file://` URL as a filesystem path, or null when it is neither. */
export function bundlePathFromUrl(url: string | null): string | null {
  if (url === null) return null;
  try {
    return fileURLToPath(url);
  } catch {
    return null;
  }
}

/**
 * True when two bundle paths name the same bundle as written, trailing
 * slash and all. Pure string comparison. `sameBundleOnDisk` is what callers
 * with a filesystem should use.
 */
export function sameBundlePath(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  const strip = (s: string): string => s.replace(/\/+$/, '');
  return strip(a) === strip(b);
}

/** A path with every symlink resolved, or the path itself when it will not. */
export function resolveBundlePath(path: string | null): string | null {
  if (path === null) return null;
  try {
    return realpathSync(path.replace(/\/+$/, ''));
  } catch {
    // A bundle that is not on disk cannot be resolved, and the raw string is
    // then the only answer there is.
    return path;
  }
}

/**
 * True when two bundle paths name the same bundle on disk.
 *
 * WHY THIS RESOLVES SYMLINKS, measured in the Phase 43 fix round. The first
 * cut of this module compared raw strings only, and the comparison it fed
 * is `targetBundleURL` from Squirrel's state file against `process.execPath`
 * from the running app. libuv resolves `process.execPath` through symlinks
 * and macOS does not standardize the two sides the same way, so an app under
 * `/var/folders/...` read as `/private/var/folders/...` on one side and
 * `/var/folders/...` on the other. The two strings disagreed, the state file
 * read as another application's, the health verdict fell to `unknown`, and
 * the recovery then deleted a HEALTHY staged update. That is the exact
 * defect this phase exists to remove, so both sides are resolved before they
 * are compared. The raw comparison runs first, so a path that is already
 * equal costs no filesystem call.
 */
export function sameBundleOnDisk(a: string | null, b: string | null): boolean {
  if (sameBundlePath(a, b)) return true;
  return sameBundlePath(resolveBundlePath(a), resolveBundlePath(b));
}

/** This app's own bundle, from the running binary. */
export function thisAppBundlePath(): string {
  return resolve(process.execPath, '..', '..', '..');
}

/**
 * When the last repair cleared this ShipIt directory, or null. Any log line
 * stamped at or before that moment describes a wreck that has already been
 * cleared, and the reads below skip it.
 *
 * Both numbers are wall clock. A clock that moves backwards between a repair
 * and a later failure would put the newer line before the mark, and the
 * failure would then be ignored until the next repair or the next failure
 * after the clock settles. That fails toward saying nothing, which is the
 * direction this whole module fails in.
 */
export function readRepairMarkAt(shipItDir: string): number | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(shipItDir, REPAIR_MARK_NAME), 'utf8')
    );
    if (parsed === null || typeof parsed !== 'object') return null;
    const at = (parsed as Record<string, unknown>)['repairedAt'];
    return typeof at === 'number' && Number.isFinite(at) && at > 0 ? at : null;
  } catch {
    // No mark is the ordinary case. It means no repair has ever run here.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Squirrel's log
// ---------------------------------------------------------------------------

/** The last 65536 bytes of ShipIt_stderr.log, or '' when unreadable. */
export function readShipItLogTail(shipItDir: string): string {
  try {
    const path = join(shipItDir, 'ShipIt_stderr.log');
    const size = statSync(path).size;
    const fd = openSync(path, 'r');
    try {
      const start = Math.max(0, size - TAIL_BYTES);
      const buf = Buffer.alloc(Math.min(size, TAIL_BYTES));
      readSync(fd, buf, 0, buf.length, start);
      return buf.toString('utf8');
    } finally {
      closeSync(fd);
    }
  } catch {
    // Missing or unreadable both read as no evidence.
    return '';
  }
}

/**
 * The four terminal shapes the log can end on. `none` means the tail holds
 * no line of any of the four shapes, which is what an empty log and a log
 * of noise both read as.
 */
export type ShipItTerminal =
  | 'installed'
  | 'gave-up'
  | 'staged-bundle-missing'
  | 'another-copy'
  | 'none';

export interface ShipItOutcome {
  terminal: ShipItTerminal;
  /** The matched line verbatim, or null. */
  line: string | null;
  /** Epoch ms parsed from the NSLog local timestamp, or null. */
  at: number | null;
  /** The highest "Resuming installation attempt N" seen in the tail, or null. */
  attempts: number | null;
}

/**
 * The NSLog prefix every real ShipIt line carries. The untimestamped noise
 * lines that begin "ERROR: Unrecognized attribute string flag" do not match
 * it, so they can never hide a terminal line.
 */
const NSLOG_PREFIX =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+) ShipIt\[\d+:\d+\] (.*)$/;

const INSTALLED_REST = 'Installation completed successfully';
const GAVE_UP_REST = 'Too many attempts to install, aborting update';
const STAGED_MISSING_PREFIX =
  'Installation error: Error Domain=SQRLInstallerErrorDomain Code=-1 "Failed to copy bundle ';
const STAGED_MISSING_CAUSE = 'there is no such file.';
const ANOTHER_COPY_REST =
  /^Aborting update attempt because there are (\d+) running instances of the target app$/;
const RESUMING_ATTEMPT = /Resuming installation attempt (\d+)/;

/** Epoch ms for an NSLog timestamp, which is local time, or null. */
function parseNsLogTime(stamp: string): number | null {
  const at = new Date(stamp.replace(' ', 'T')).getTime();
  return Number.isNaN(at) ? null : at;
}

/** Which terminal shape a line's rest is, or null when it is none of them. */
function terminalOf(rest: string): ShipItTerminal | null {
  if (rest === INSTALLED_REST) return 'installed';
  if (rest === GAVE_UP_REST) return 'gave-up';
  if (rest.startsWith(STAGED_MISSING_PREFIX) && rest.includes(STAGED_MISSING_CAUSE)) {
    return 'staged-bundle-missing';
  }
  if (ANOTHER_COPY_REST.test(rest)) return 'another-copy';
  return null;
}

/** One parsed NSLog line. Shared by both readers, so the shapes exist once. */
export interface ShipItLogLine {
  /** The line verbatim, carriage return stripped. */
  line: string;
  /** Epoch ms from the local NSLog timestamp, or null when it will not parse. */
  at: number | null;
  /** The terminal shape, or null when the line is not one of the four. */
  terminal: ShipItTerminal | null;
  /** N from "Resuming installation attempt N", or null. */
  attempt: number | null;
}

/**
 * Read one line. Returns null for anything without the NSLog prefix, which
 * is how the untimestamped "ERROR: Unrecognized attribute string flag" noise
 * lines are skipped and can never hide a terminal line.
 */
export function readShipItLogLine(raw: string): ShipItLogLine | null {
  const line = raw.replace(/\r$/, '');
  const match = NSLOG_PREFIX.exec(line);
  if (match === null) return null;
  const rest = match[2] ?? '';
  const attempt = RESUMING_ATTEMPT.exec(rest);
  const n = attempt === null ? Number.NaN : Number(attempt[1]);
  return {
    line,
    at: parseNsLogTime(match[1] ?? ''),
    terminal: terminalOf(rest),
    attempt: Number.isFinite(n) ? n : null
  };
}

/**
 * Walk the tail newest line first and stop at the first terminal shape. The
 * newest one wins, so a machine that gave up once and then installed
 * successfully reads as installed. `attempts` is the highest attempt number
 * anywhere in the tail.
 *
 * `ignoreAtOrBeforeMs` is the repair mark. Every line stamped at or before
 * it describes a wreck a repair has already cleared, and the log is kept on
 * purpose, so those lines must not decide anything. A line whose timestamp
 * will not parse is skipped too once a mark is set, because a line that
 * cannot be placed in time cannot be shown to be newer than the repair.
 */
export function classifyShipItOutcome(
  tail: string,
  ignoreAtOrBeforeMs: number | null = null
): ShipItOutcome {
  const lines = tail.split('\n');
  let attempts: number | null = null;
  let found: ShipItLogLine | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const parsed = readShipItLogLine(lines[i] ?? '');
    if (parsed === null) continue;
    if (
      ignoreAtOrBeforeMs !== null &&
      (parsed.at === null || parsed.at <= ignoreAtOrBeforeMs)
    ) {
      continue;
    }
    if (
      parsed.attempt !== null &&
      (attempts === null || parsed.attempt > attempts)
    ) {
      attempts = parsed.attempt;
    }
    if (found === null && parsed.terminal !== null) found = parsed;
  }
  if (found === null) {
    return { terminal: 'none', line: null, at: null, attempts };
  }
  return {
    terminal: found.terminal ?? 'none',
    line: found.line,
    at: found.at,
    attempts
  };
}

// ---------------------------------------------------------------------------
// The health verdict
// ---------------------------------------------------------------------------

export type UpdaterHealthState = 'unknown' | 'healthy' | 'wrecked';

export interface UpdaterHealth {
  state: UpdaterHealthState;
  /** Why it is wrecked, or null. */
  reason: 'staged-bundle-missing' | 'gave-up' | null;
  /** The bundle path the state file names, or null. */
  stagedBundlePath: string | null;
  stagedBundleExists: boolean;
  /** True when a ShipItState.plist was there and parsed. */
  stateFilePresent: boolean;
  /** True when the state file targets this app's own bundle. */
  targetsThisApp: boolean;
  attempts: number | null;
  /** The terminal line verbatim. The announce once key. */
  fingerprint: string | null;
}

/**
 * The seven rules, in this order. The ORDER IS THE DESIGN, for two reasons.
 *
 * Rule 3 runs before rule 5 so that a machine which gave up on one update
 * and has since staged another reads as healthy. Clearing there would
 * delete a staged bundle that is about to install, which is the exact
 * defect this phase exists to remove.
 *
 * Rule 4 runs before rules 5 and 6 because Squirrel leaves ShipItState.plist
 * behind after a SUCCESS, still naming a bundle the install consumed
 * (research 42 section 4). Without rule 4 every launch after a successful
 * update would look wrecked and offer to clear something that is already
 * gone.
 */
export function decideUpdaterHealth(
  state: ShipItState | null,
  outcome: ShipItOutcome,
  stagedBundleExists: boolean,
  targetsThisApp: boolean
): UpdaterHealth {
  const base = {
    stagedBundlePath: bundlePathFromUrl(state?.updateBundleURL ?? null),
    stagedBundleExists,
    stateFilePresent: state !== null,
    targetsThisApp,
    attempts: outcome.attempts,
    fingerprint: outcome.line
  };
  const unknown: UpdaterHealth = { state: 'unknown', reason: null, ...base };

  // 1. No state file to anchor on, and no give up line either.
  if (state === null && outcome.terminal !== 'gave-up') return unknown;
  // 2. Another application's install is never Tortie's business.
  if (state !== null && !targetsThisApp) return unknown;
  // 3. The in flight test from research 42 section 4, unchanged.
  if (state !== null && targetsThisApp && stagedBundleExists) {
    return { state: 'healthy', reason: null, ...base };
  }
  // 4. A success leaves the plist behind. That is not a wreck.
  if (outcome.terminal === 'installed') return unknown;
  // 5. The saved attempt count stops every later install until it is cleared.
  if (outcome.terminal === 'gave-up') {
    return { state: 'wrecked', reason: 'gave-up', ...base };
  }
  // 6. The installer went looking for a bundle that is not there.
  if (outcome.terminal === 'staged-bundle-missing' && !stagedBundleExists) {
    return { state: 'wrecked', reason: 'staged-bundle-missing', ...base };
  }
  // 7. Anything else says nothing, and saying nothing offers nothing.
  return unknown;
}

/**
 * Tie the reads together for one launch. Never throws. Any read that fails
 * reads as absent, which lands on `unknown` and offers the user nothing.
 */
export function inspectUpdaterHealth(paths: UpdaterPaths): UpdaterHealth {
  try {
    let state: ShipItState | null = null;
    try {
      state = parseShipItState(
        readFileSync(join(paths.shipItDir, 'ShipItState.plist'), 'utf8')
      );
    } catch {
      // A missing state file is the ordinary case on a machine that has
      // never updated.
    }
    const outcome = classifyShipItOutcome(
      readShipItLogTail(paths.shipItDir),
      readRepairMarkAt(paths.shipItDir)
    );
    const stagedPath = bundlePathFromUrl(state?.updateBundleURL ?? null);
    const stagedExists = stagedPath !== null && existsSync(stagedPath);
    const targetsThisApp = sameBundleOnDisk(
      bundlePathFromUrl(state?.targetBundleURL ?? null),
      thisAppBundlePath()
    );
    return decideUpdaterHealth(state, outcome, stagedExists, targetsThisApp);
  } catch {
    return {
      state: 'unknown',
      reason: null,
      stagedBundlePath: null,
      stagedBundleExists: false,
      stateFilePresent: false,
      targetsThisApp: false,
      attempts: null,
      fingerprint: null
    };
  }
}
