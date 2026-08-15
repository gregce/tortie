/**
 * The updater's logging call (Phase 31, folded into the shared log in
 * Phase 35).
 *
 * WHY THIS EXISTS. When the operator's first live update failed, the only
 * diagnostic record was Squirrel's own cache. Tortie logged everything to a
 * console that a packaged app does not have, so the app's side of the story
 * did not exist anywhere on disk. Every updater event now lands in a file a
 * person can read after the fact.
 *
 * WHAT PHASE 35 CHANGED, and what it deliberately did not. The signature is
 * the same, so the 5 updater call sites did not change. The console line is
 * the same `[gmux-updates] …`, so dev terminals read the same. What moved is
 * the file: updater events are now records in `<userData>/logs/app.log` with
 * scope "updates", alongside every other domain, instead of a parallel file
 * of their own. Incident 2 of research 42 is the reason. The updater story
 * only reads in one piece when the boot before it and the boot after it are
 * in the same file.
 *
 * WHAT RETIRED. `appendUpdateLogLine`, the 524288-byte cap and the
 * `updates.log.1` rename. The shared file owns rotation now, at 2 MiB plus a
 * 2 MiB `app.log.1`, which is the same convention one size up. A legacy
 * `updates.log` pair on an existing profile is left exactly where it is and
 * ages out through the startup prune 30 days after its last write
 * (src/main/log/prune.ts). Nothing deletes it early and nothing reads it.
 *
 * THE RULES THAT DID NOT CHANGE.
 *
 * - The console line is always written, so dev behavior is unchanged.
 * - The file is written in packaged builds, or when GMUX_LOG_FILE=1. Dev
 *   without the env has a terminal and needs no file.
 * - A failed write is swallowed after one console warning. The log must
 *   never become the thing that breaks an update.
 */

import { getLog } from '../log';

export type UpdateLogLevel = 'info' | 'warn' | 'error';

const updatesLog = getLog('updates');

/**
 * The one logging call every updater module uses. Console always, and the
 * same line becomes one record with scope "updates" in the shared log.
 */
export function logUpdateEvent(level: UpdateLogLevel, message: string): void {
  updatesLog[level](message);
}
