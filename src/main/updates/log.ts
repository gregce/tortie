/**
 * The updater's persistent log (Phase 31, item 3).
 *
 * WHY THIS EXISTS. When the operator's first live update failed, the only
 * diagnostic record was Squirrel's own cache. Tortie logged everything to a
 * console that a packaged app does not have, so the app's side of the story
 * did not exist anywhere on disk. Every updater event now lands in a file a
 * person can read after the fact.
 *
 * WHERE THE FILE LIVES. `<userData>/logs/updates.log`, deliberately NOT
 * `~/Library/Logs/Tortie` (Electron's `app.getPath('logs')`). The Logs
 * directory is shared by every packaged build on the machine, including
 * rehearsal builds, so a rehearsal would interleave its lines into the
 * operator's evidence. That is the exact confusion this module exists to
 * end. userData follows the profile, so every harness is isolated for free.
 *
 * THE BOUND. Before a line is appended, a file over 524288 bytes is renamed
 * to `updates.log.1`, replacing any previous one. The pair stays bounded at
 * about 1 MiB.
 *
 * THE RULES.
 *
 * - `logUpdateEvent` always writes the console line with the existing
 *   `[gmux-updates]` prefix, so dev behavior is unchanged.
 * - Only packaged builds write the file. Dev has a terminal.
 * - A failed write is swallowed after one console warning. The log must
 *   never become the thing that breaks an update.
 *
 * Ownership: src/main/updates/log.ts (Builder A, Phase 31).
 */

import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export type UpdateLogLevel = 'info' | 'warn' | 'error';

/** The rotation cap. Over this, updates.log becomes updates.log.1. */
export const UPDATE_LOG_MAX_BYTES = 524288;

/**
 * Append one line to `updates.log` inside `dir`, rotating first when the
 * file is over `maxBytes`. Exported with the directory and the cap as
 * arguments so the rotation is unit tested against a temp directory.
 * Throws on failure; the caller decides what a failed write is worth.
 */
export function appendUpdateLogLine(
  dir: string,
  level: UpdateLogLevel,
  message: string,
  maxBytes: number = UPDATE_LOG_MAX_BYTES
): void {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'updates.log');
  try {
    if (statSync(path).size > maxBytes) {
      // renameSync replaces an existing updates.log.1, so the pair is the
      // whole retention policy.
      renameSync(path, `${path}.1`);
    }
  } catch {
    // No file yet. The append below creates it.
  }
  const stamp = new Date().toISOString();
  appendFileSync(path, `${stamp} ${level.toUpperCase()} ${message}\n`, 'utf8');
}

/** True after the one allowed warning about a failed file write. */
let warnedWriteFailed = false;

/**
 * The one logging call every updater module uses. Console always, and in
 * packaged builds the same line goes to `<userData>/logs/updates.log`.
 */
export function logUpdateEvent(level: UpdateLogLevel, message: string): void {
  const line = `[gmux-updates] ${message}`;
  if (level === 'info') console.log(line);
  else if (level === 'warn') console.warn(line);
  else console.error(line);
  if (!app.isPackaged) return;
  try {
    appendUpdateLogLine(join(app.getPath('userData'), 'logs'), level, message);
  } catch (err) {
    if (!warnedWriteFailed) {
      warnedWriteFailed = true;
      console.warn(
        `[gmux-updates] could not write logs/updates.log: ${(err as Error).message}. Updater events stay on the console for the rest of this run.`
      );
    }
  }
}
