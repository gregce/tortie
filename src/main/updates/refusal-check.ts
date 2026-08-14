/**
 * The refusal check (Phase 31, item 2). Did the install the last run
 * promised actually happen, and if not, why not?
 *
 * THE INCIDENT THIS ANSWERS. On 2026-08-14 the operator's first live update
 * downloaded, staged, and then never installed. ShipIt aborted three times
 * with SQRLInstallerErrorDomain code -9, "there are 1 running instances of
 * the target app", because the operator relaunched into the install window
 * that follows a quit. Tortie surfaced nothing. This module reads the
 * evidence Squirrel leaves on disk and gives ./ui.ts one honest sentence to
 * show on the first launch after such a failure.
 *
 * HOW SQUIRREL COUNTS INSTANCES, from disassembly of the shipped ShipIt
 * binary (docs/research/42-shipit-instance-counting.md). An instance counts
 * only when its bundle identifier AND its standardized bundle URL both match
 * the install request. So only a process running from /Applications/Tortie.app
 * can block the installed app's update. The dev build and any rehearsal copy
 * can never be the counted instance.
 *
 * THE DECISION, restated from the phase spec section 4.2:
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
 * Ownership: src/main/updates/refusal-check.ts (Builder A, Phase 31).
 */

import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';
import { logUpdateEvent } from './log';
import { readUpdateState, writeUpdateState } from './state';

/**
 * The bundle id Squirrel derives its cache directory from. This is `appId`
 * in electron-builder.yml (line 59, `appId: com.itavero.tortie`). If that
 * line ever changes, this constant moves with it or the refusal check reads
 * the wrong directory.
 */
export const TORTIE_BUNDLE_ID = 'com.itavero.tortie';

/** How much of the tail of ShipIt_stderr.log is read. The file only grows. */
const TAIL_BYTES = 65536;

/** The recency slop between the pending record and an abort line. */
const ABORT_SLOP_MS = 60_000;

/**
 * Where Squirrel keeps its per-application state, e.g.
 * `~/Library/Caches/com.itavero.tortie.ShipIt`. Pure so the unit tests pin
 * it. Squirrel derives the directory the same way, from the job label
 * `<bundle id>.ShipIt`.
 */
export function shipItCacheDir(home: string, bundleId: string): string {
  return join(home, 'Library', 'Caches', `${bundleId}.ShipIt`);
}

/**
 * The abort line ShipIt writes, exactly as NSLog formats it. The trailing
 * "Installation cancelled" line that follows it carries the same error as
 * an Objective C description, so the count line is the one worth parsing.
 */
const SHIPIT_ABORT_LINE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+) ShipIt\[\d+:\d+\] Aborting update attempt because there are (\d+) running instances of the target app$/;

export interface ShipItAbortDecision {
  reason: 'another-copy' | 'unknown';
  /** The matched abort line verbatim, or null when no line matched. */
  line: string | null;
}

/**
 * Decide what the tail of ShipIt_stderr.log says about a broken promise
 * recorded at `sinceMs`. Pure, and unit tested against the verbatim lines
 * from the operator's machine.
 *
 * The newest line matching the abort shape is the verdict. ShipIt writes an
 * "Installation cancelled" line and untimestamped noise lines after the
 * abort line, so "the last line" means the last line OF THAT SHAPE, not the
 * last line of the file. The timestamp parses as local time, which is what
 * NSLog writes. An abort at or after `sinceMs` minus a 60 second slop means
 * another copy of the app blocked the install. An older abort belongs to
 * some earlier incident and proves nothing about this promise, so it reads
 * as unknown, which fails toward saying less.
 */
export function parseShipItAbort(
  tail: string,
  sinceMs: number
): ShipItAbortDecision {
  const lines = tail.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = (lines[i] ?? '').replace(/\r$/, '');
    const match = SHIPIT_ABORT_LINE.exec(line);
    if (match === null) continue;
    const abortedAt = new Date((match[1] ?? '').replace(' ', 'T')).getTime();
    if (Number.isNaN(abortedAt)) return { reason: 'unknown', line };
    if (abortedAt >= sinceMs - ABORT_SLOP_MS) {
      return { reason: 'another-copy', line };
    }
    return { reason: 'unknown', line };
  }
  return { reason: 'unknown', line: null };
}

/** The last TAIL_BYTES of ShipIt_stderr.log, or '' when unreadable. */
function readShipItStderrTail(): string {
  try {
    const path = join(
      shipItCacheDir(homedir(), TORTIE_BUNDLE_ID),
      'ShipIt_stderr.log'
    );
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

export interface RefusedInstall {
  version: string;
  reason: 'another-copy' | 'unknown';
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
    const decision = parseShipItAbort(readShipItStderrTail(), recordedAt);
    if (decision.reason === 'another-copy') {
      logUpdateEvent(
        'warn',
        `the install of ${pending} was refused because another copy of Tortie was running. ShipIt wrote the line "${decision.line ?? ''}"`
      );
    } else {
      logUpdateEvent(
        'warn',
        `the install of ${pending} did not happen and the ShipIt log does not say why.${decision.line !== null ? ` The newest abort line is stale. It reads "${decision.line}"` : ''}`
      );
    }
    return { version: pending, reason: decision.reason };
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
