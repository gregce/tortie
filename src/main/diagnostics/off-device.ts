/**
 * off-device.ts — does anything outside this machine hold a copy of the
 * user's Tortie data? Answered by CHECKING, and by saying "unknown" when the
 * check cannot answer.
 *
 * Phase 19 item 12. Nothing in Tortie claims off-device protection today, and
 * this module exists so that nothing ever does without evidence. An earlier
 * plan cut two backup items on the premise "Time Machine already backs up
 * `~/Library/Application Support/Tortie`". The evidence offered for it was
 * `tmutil isexcluded` returning `[Included]` and `tmutil destinationinfo`
 * naming a destination. Neither statement means a backup exists. `[Included]`
 * means not excluded, and a destination means configured.
 *
 * THREE MEASUREMENTS THAT DECIDE HOW THIS IS WRITTEN, taken on the operator's
 * machine, read-only, on 2026-08-12.
 *
 *  1. **`tmutil latestbackup` exits 0 when there is no backup.** It printed
 *     `Failed to mount backup destination … Code=19` to stderr, printed
 *     nothing to stdout, and returned 0. Code that reads the exit code and
 *     stops there concludes that a backup exists. That is the false claim
 *     this module is here to prevent.
 *  2. **`tmutil latestbackup` can block for minutes.** One call sat over
 *     100 s trying to mount an unreachable SMB destination. It also causes a
 *     network mount attempt as a side effect, which is not something a
 *     diagnostics read should do to somebody's machine. So this module does
 *     not call it at all. It reads the preferences file macOS already keeps,
 *     which answers the same question in 9 ms and mounts nothing.
 *  3. **The dates in that file settle it without a network.** The newest
 *     recorded backup was 2026-04-07 and `AutoBackup` was 0. Tortie's own
 *     data directory has been written to since, so no copy of the current
 *     data exists anywhere off this machine.
 *
 * STRICTLY READ-ONLY, and ON DEMAND ONLY. It runs `plutil` against a system
 * preferences file and stats three paths. There is no timer here, and there
 * must never be one: ZEN-OF-TORTIE forbids a number that rises on its own,
 * and this is a fact a person asks for, not one the app should announce.
 *
 * The strongest verdict this module can return is `possible`. There is no
 * `protected`, and adding one would need Tortie to open the backup and find
 * its own directory inside it, which it does not do.
 */

import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** macOS keeps the answer here, and updates it whether or not it can mount. */
const TM_PREFS = '/Library/Preferences/com.apple.TimeMachine.plist';

/**
 * Bound on each `plutil` read. It is generous for a 9 ms call, and its only
 * job is to make sure a diagnostics read can never be the thing that hangs.
 */
const PLUTIL_TIMEOUT_MS = 2_000;

export type OffDeviceProtectionState =
  /**
   * Checked, and nothing outside this machine holds a copy of the CURRENT
   * data. Either no destination is configured, or the newest recorded backup
   * is older than the newest change Tortie made.
   */
  | 'none'
  /**
   * Checked, and a backup completed after the newest change Tortie made. That
   * is as far as the evidence goes. Tortie has NOT opened the backup and has
   * not confirmed that its own directory is inside it.
   */
  | 'possible'
  /**
   * The check could not answer. Not macOS, `plutil` refused, the preferences
   * file is unreadable, or the data directory could not be stat'ed. Never
   * read this as good news.
   */
  | 'unknown';

export interface OffDeviceProtection {
  state: OffDeviceProtectionState;
  /** Newest recorded backup, ISO 8601, or null when there is none. */
  latestBackupAt: string | null;
  /** Newest change to the Tortie data this check compared against. */
  dataChangedAt: string | null;
  /** Is macOS configured to back up on its own? Null when not determined. */
  automaticBackups: boolean | null;
  /** Destination volume name, when one is configured. */
  destinationName: string | null;
  /**
   * One sentence for a person. It never asserts protection that was not
   * observed, and it names what was not checked.
   */
  summary: string;
  /** What was read and what it answered, for a bug report. */
  evidence: string[];
}

export interface OffDeviceProtectionOptions {
  /** The Tortie user data root. Defaults to `app.getPath('userData')`. */
  dataRoot?: string;
  /** Overridden in tests so no real system file is read. */
  readPref?: (keyPath: string, format: 'raw' | 'xml1') => Promise<string | null>;
  /** Overridden in tests. Returns the newest write under the data root. */
  newestDataChange?: (dataRoot: string) => Promise<Date | null>;
  /** Defaults to process.platform. */
  platform?: string;
  /** Defaults to Date.now. */
  now?: () => number;
}

/** Read one key out of the Time Machine preferences file. Never throws. */
async function readTimeMachinePref(
  keyPath: string,
  format: 'raw' | 'xml1'
): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      '/usr/bin/plutil',
      ['-extract', keyPath, format, '-o', '-', TM_PREFS],
      { timeout: PLUTIL_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 }
    );
    return stdout;
  } catch {
    // Missing key, missing file, no Time Machine ever configured, or plutil
    // refusing the read. All of them mean "this key does not answer", and
    // the caller decides what that implies.
    return null;
  }
}

/**
 * The three paths whose modification time stands for "when did Tortie last
 * change the data a backup would need to hold".
 *
 * The write-ahead log is first on purpose. On the operator's machine
 * `manifest.db` was last written at 18:40 and `manifest.db-wal` at 19:32, so
 * reading only the database would have understated the data's age by 52
 * minutes and could turn a `none` into a `possible`.
 */
function dataPathsToStat(dataRoot: string): string[] {
  return [
    join(dataRoot, 'gmux', 'manifest.db-wal'),
    join(dataRoot, 'gmux', 'manifest.db'),
    join(dataRoot, 'gmux', 'snapshots')
  ];
}

/** Newest mtime across the manifest, its WAL and the snapshots directory. */
export async function newestDataChange(dataRoot: string): Promise<Date | null> {
  let newest: Date | null = null;
  for (const path of dataPathsToStat(dataRoot)) {
    try {
      const info = await stat(path);
      if (newest === null || info.mtime > newest) newest = info.mtime;
    } catch {
      // A path that is not there yet says nothing about the ones that are.
    }
  }
  return newest;
}

/** Newest `<date>` in a plutil xml1 array, or null when the array is empty. */
function newestDateIn(xml: string): Date | null {
  let newest: Date | null = null;
  for (const m of xml.matchAll(/<date>([^<]+)<\/date>/g)) {
    const raw = m[1];
    if (raw === undefined) continue;
    const when = new Date(raw);
    if (Number.isNaN(when.getTime())) continue;
    if (newest === null || when > newest) newest = when;
  }
  return newest;
}

/** Whole days between two instants, floored, never negative. */
function daysBetween(older: Date, newer: Date): number {
  const ms = newer.getTime() - older.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / 86_400_000);
}

/**
 * Answer the question, honestly.
 *
 * On demand only. Do not call this at boot and do not put it on a timer.
 */
export async function readOffDeviceProtection(
  options: OffDeviceProtectionOptions = {}
): Promise<OffDeviceProtection> {
  const platform = options.platform ?? process.platform;
  const readPref = options.readPref ?? readTimeMachinePref;
  const newestChange = options.newestDataChange ?? newestDataChange;
  const now = new Date(options.now?.() ?? Date.now());
  const evidence: string[] = [];

  const unknown = (summary: string): OffDeviceProtection => ({
    state: 'unknown',
    latestBackupAt: null,
    dataChangedAt: null,
    automaticBackups: null,
    destinationName: null,
    summary,
    evidence
  });

  if (platform !== 'darwin') {
    evidence.push(`platform ${platform}`);
    return unknown(
      'Tortie only knows how to check this on macOS, so it does not know ' +
        'whether anything outside this machine holds a copy.'
    );
  }

  let dataRoot = options.dataRoot;
  if (dataRoot === undefined) {
    try {
      // Lazy require for the same reason the rest of diagnostics is lazy:
      // this module must stay loadable in a plain-node unit test.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { app } = require('electron') as typeof import('electron');
      dataRoot = app.getPath('userData');
    } catch {
      return unknown(
        'Tortie could not find its own data directory, so it did not check ' +
          'whether anything outside this machine holds a copy.'
      );
    }
  }

  const dataChanged = await newestChange(dataRoot);
  evidence.push(
    dataChanged === null
      ? `data root ${dataRoot}: nothing to date`
      : `data root ${dataRoot}: newest change ${dataChanged.toISOString()}`
  );
  if (dataChanged === null) {
    return unknown(
      'Tortie could not read when its own data last changed, so it did not ' +
        'check whether anything outside this machine holds a copy.'
    );
  }
  const dataChangedAt = dataChanged.toISOString();

  const autoRaw = await readPref('AutoBackup', 'raw');
  const automaticBackups =
    autoRaw === null ? null : autoRaw.trim() === '1' || autoRaw.trim() === 'true';
  evidence.push(
    autoRaw === null
      ? 'AutoBackup: not readable'
      : `AutoBackup: ${autoRaw.trim()}`
  );

  const destName = (await readPref('Destinations.0.LastKnownVolumeName', 'raw'))
    ?.trim();
  const destinationName =
    destName === undefined || destName.length === 0 ? null : destName;

  const datesXml = await readPref('Destinations.0.SnapshotDates', 'xml1');
  if (autoRaw === null && datesXml === null && destinationName === null) {
    // Nothing in the preferences file answered. That is what an unconfigured
    // Time Machine looks like AND what an unreadable file looks like, and the
    // two are not distinguishable from here, so do not guess between them.
    evidence.push(`${TM_PREFS}: no key answered`);
    return {
      state: 'unknown',
      latestBackupAt: null,
      dataChangedAt,
      automaticBackups: null,
      destinationName: null,
      summary:
        'Tortie could not read the backup settings on this machine, so it ' +
        'does not know whether anything outside this machine holds a copy.',
      evidence
    };
  }

  const latest = datesXml === null ? null : newestDateIn(datesXml);
  const latestBackupAt = latest === null ? null : latest.toISOString();
  evidence.push(
    latest === null
      ? 'newest recorded backup: none'
      : `newest recorded backup: ${latestBackupAt} (${daysBetween(latest, now)} days ago)`
  );
  if (destinationName !== null) {
    evidence.push(`destination: ${destinationName} (configured, not verified)`);
  }

  const where =
    destinationName === null
      ? 'No backup destination is configured'
      : `A backup destination named "${destinationName}" is configured`;

  if (latest === null) {
    return {
      state: 'none',
      latestBackupAt: null,
      dataChangedAt,
      automaticBackups,
      destinationName,
      summary: `${where}, and no backup has ever completed. Nothing outside this machine holds a copy of your sessions.`,
      evidence
    };
  }

  if (latest <= dataChanged) {
    const age = daysBetween(latest, now);
    const autoNote =
      automaticBackups === false ? ' Automatic backups are off.' : '';
    return {
      state: 'none',
      latestBackupAt,
      dataChangedAt,
      automaticBackups,
      destinationName,
      summary:
        `The newest backup on this machine's record is ${age} days old, ` +
        `and Tortie has changed its data since then.${autoNote} ` +
        'Nothing outside this machine holds a copy of your current sessions.',
      evidence
    };
  }

  return {
    state: 'possible',
    latestBackupAt,
    dataChangedAt,
    automaticBackups,
    destinationName,
    summary:
      `A backup completed on ${latest.toISOString().slice(0, 10)}, after the ` +
      'last change Tortie made. Tortie has not opened that backup and cannot ' +
      'confirm its own files are inside it.',
    evidence
  };
}

/**
 * The block this goes in a bug report as: the verdict first, then what was
 * read to reach it, so the claim can be checked rather than believed.
 */
export function offDeviceReportLines(result: OffDeviceProtection): string[] {
  return [
    `off-device: ${result.state}. ${result.summary}`,
    ...result.evidence.map((e) => `  ${e}`)
  ];
}
