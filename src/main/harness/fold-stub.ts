/**
 * Harness only (Phase 138). Substitutes a stub binary for the fold's resolved
 * one, so a probe can drive the whole fold path and spend nothing.
 *
 * WHY IT EXISTS. Everything the phase must prove except the twenty fold cost
 * proof can be proved without a real model: the trigger, the settle timer, the
 * caps, the version chain, the crash behaviour, the ten refusals, and that
 * every other view is byte identical. Driving those against a real
 * subscription would spend real money on every re-run, and a fix round re-runs
 * the probe. So the probe points GMUX_FOLD_BIN at a script that prints one
 * `result` line and the same probe can run again for nothing.
 *
 * TWO REFUSALS, both hard, and both the same two ./overview-seed.ts carries.
 *
 *  1. The launch must be an isolated harness launch (GMUX_SMOKE or GMUX_SHOT).
 *     A GMUX_FOLD_BIN left in a shell profile must never reach a person's real
 *     app, because it decides what binary runs.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us. A launch that points GMUX_FOLD_BIN at the app while using the
 *     real profile is refused even when GMUX_SHOT is set.
 *
 * When either refusal fires, the override returns null and the fold resolves
 * its real binary exactly as it would in an ordinary launch. It never throws
 * into a fold, because a fold that throws would be one sentence lost rather
 * than a problem worth a crash.
 */

import { app } from 'electron';
import { realpathSync } from 'node:fs';
import { sep } from 'node:path';
import { setFoldBinaryOverride } from '../overview/fold';
import { isIsolatedLaunch } from './launch-gate';

function real(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Is `child` the directory `parent` or something inside it?
 *
 * The separator is what makes this a containment test rather than a string
 * prefix test. Without it a harness directory called `x` would also match a
 * real profile at `x-elsewhere`, which is the whole failure this refusal
 * exists to stop.
 *
 * Exported since the fix round, because ./fold-seed.ts needs the same test and
 * a second copy of it would be a second chance to write the weaker one.
 */
export function isInside(child: string, parent: string): boolean {
  const a = real(child);
  const b = real(parent);
  return a === b || a.startsWith(b.endsWith(sep) ? b : `${b}${sep}`);
}

/**
 * The override itself, exported so a unit test can drive both refusals with an
 * environment record and a profile path rather than an Electron.
 */
export function foldStubBinary(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  const bin = env['GMUX_FOLD_BIN'] ?? '';
  if (bin === '') return null;
  if (!isIsolatedLaunch(env)) return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  return bin;
}

/**
 * Install the override. Called once from the harness dispatch, and never in an
 * ordinary launch.
 */
export function installFoldStub(): void {
  setFoldBinaryOverride(() =>
    foldStubBinary(process.env, app.getPath('userData'))
  );
}
