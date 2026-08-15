/**
 * The updater's own small store, kept at `<userData>/updates.json` (Phase 24,
 * two fields added in Phase 31).
 *
 * Five fields live here and nothing else does:
 *
 * - `lastSeenVersion` is the version the app last booted as. The post update
 *   self check compares it to `app.getVersion()` to know when an update has
 *   just been applied. It lives in this file and never in the manifest. The
 *   manifest holds session restore state, which is the one thing Tortie
 *   promises never to lose, and updater bookkeeping has no business inside it.
 * - `allowDowngrade` is the hidden escape hatch from research 27 section 5.7.
 *   A bad release is normally answered by publishing a higher version that
 *   contains the old bytes. This switch exists for the case where a user must
 *   be pulled back before that release exists. A human writes `true` into
 *   this file by hand. There is no UI for it anywhere, no settings row and no
 *   menu item, and only the exact boolean `true` counts.
 * - `lastCheckedAt` is when an update check last completed, in milliseconds
 *   since the epoch. The Settings row reads it through `updates:state`.
 * - `pendingVersion` and `pendingRecordedAt` (Phase 31) record the promise an
 *   update download makes. They are written together when electron-updater
 *   finishes a download, and the next launch reads them to decide whether the
 *   promised install happened. The two fields only mean something as a pair,
 *   because the refusal check compares Squirrel's abort timestamps against
 *   `pendingRecordedAt`. So the sanitizer treats them as a pair: if either
 *   reads malformed, both read as null.
 *
 * settings.json is deliberately not used. Its sanitizer whitelists fields and
 * the Settings window rewrites the file, so a hidden preference would either
 * be stripped or would need a public field, and both defeat the point.
 *
 * The write is atomic in the same way as recents.json and settings.json: the
 * new content goes to a `.tmp` file first and is renamed over the old file.
 * A missing file and a corrupt file both read as the defaults, silently. The
 * whole file is disposable. Losing it costs one self check baseline and one
 * "last checked" timestamp.
 *
 * Ownership: src/main/updates/state.ts (Builder A, Phase 24).
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import { getLog } from '../log';

/**
 * Scope "updates" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const updatesLog = getLog('updates');


export interface UpdateState {
  /** The version the app last booted as, or null before the first boot. */
  lastSeenVersion: string | null;
  /** The hidden downgrade switch. Only the exact boolean true counts. */
  allowDowngrade: boolean;
  /** When an update check last completed, or null when none has run. */
  lastCheckedAt: number | null;
  /** The version a finished download promised to install, or null. */
  pendingVersion: string | null;
  /** When that promise was recorded, epoch milliseconds, or null. */
  pendingRecordedAt: number | null;
}

const DEFAULTS: UpdateState = {
  lastSeenVersion: null,
  allowDowngrade: false,
  lastCheckedAt: null,
  pendingVersion: null,
  pendingRecordedAt: null
};

function updatesPath(): string {
  return join(app.getPath('userData'), 'updates.json');
}

/**
 * Coerce arbitrary parsed JSON into a valid state. Exported for the unit
 * tests. Every field is optional on disk and every malformed field falls back
 * to its default on its own, so one bad field never poisons the others.
 */
export function sanitizeUpdateState(raw: unknown): UpdateState {
  if (raw === null || typeof raw !== 'object') return { ...DEFAULTS };
  const row = raw as Record<string, unknown>;
  const version = row['lastSeenVersion'];
  const checked = row['lastCheckedAt'];
  const pendingV = row['pendingVersion'];
  const pendingAt = row['pendingRecordedAt'];
  // The pending pair is only meaningful together: a version with no
  // timestamp cannot be checked against Squirrel's abort log, and a
  // timestamp with no version promises nothing. If either is malformed,
  // both read as null.
  const pendingVersionClean =
    typeof pendingV === 'string' && pendingV.trim().length > 0
      ? pendingV.trim()
      : null;
  const pendingRecordedAtClean =
    typeof pendingAt === 'number' &&
    Number.isFinite(pendingAt) &&
    pendingAt > 0
      ? pendingAt
      : null;
  const pairValid = pendingVersionClean !== null && pendingRecordedAtClean !== null;
  return {
    lastSeenVersion:
      typeof version === 'string' && version.trim().length > 0
        ? version.trim()
        : null,
    // The escape hatch arms on the exact boolean and on nothing else. The
    // strings "true" and "1" stay off, so a sloppy hand edit fails safe.
    allowDowngrade: row['allowDowngrade'] === true,
    lastCheckedAt:
      typeof checked === 'number' && Number.isFinite(checked) && checked > 0
        ? checked
        : null,
    pendingVersion: pairValid ? pendingVersionClean : null,
    pendingRecordedAt: pairValid ? pendingRecordedAtClean : null
  };
}

/**
 * The state on disk, or the defaults when the file is missing or corrupt.
 * Neither case is worth a word to the user.
 */
export function readUpdateState(): UpdateState {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(updatesPath(), 'utf8'));
  } catch {
    // Missing on a first launch, and corrupt reads the same way.
  }
  return sanitizeUpdateState(parsed);
}

/**
 * Merge `patch` over the state on disk and write the result atomically. A
 * failed write is one warning in the log and never an error the user sees,
 * because nothing in this file is worth interrupting anyone for.
 */
export function writeUpdateState(patch: Partial<UpdateState>): void {
  const next: UpdateState = { ...readUpdateState(), ...patch };
  try {
    const path = updatesPath();
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    renameSync(tmp, path); // atomic on the same volume
  } catch (err) {
    updatesLog.warn(
      `could not persist updates.json: ${(err as Error).message}`
    );
  }
}
