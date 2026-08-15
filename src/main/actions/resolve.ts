/**
 * Where gh is on this machine (Phase 46).
 *
 * One wrapper over the ONE resolver, `resolveBinary` in src/main/tmux/
 * resolve.ts (growth guardrail 3). That resolver searches the login shell
 * PATH plus the install directories a Finder launched application misses,
 * which is the same search the clone preflight's gh probe already uses.
 *
 * THE OVERRIDE, and why it exists. `resolveBinary` deliberately ignores
 * `process.env.PATH`, so a probe cannot point the app at a stub by exporting
 * PATH. Without an override the only way to exercise the degrade ladder
 * would be to uninstall gh or to sign the operator out, and both are edits
 * to the operator's own machine that this phase must never make. So
 * `GMUX_GH_BIN` names an absolute path to a gh executable.
 *
 * THE OVERRIDE IS AUTHORITATIVE WHEN IT IS SET, and this is a deliberate
 * reading of spec section 8 rather than the only one. Set and naming an
 * executable file, it is the path. Set and naming anything else, the answer
 * is that gh is missing, and a warning names the variable and the path. It
 * does NOT fall back to the resolved gh, for two reasons. The probe's first
 * launch proves the "gh is missing" rung by pointing the variable at a path
 * that does not exist, and on a machine that has gh a fallback would hide
 * that rung and make the ladder unprovable. And a person who sets the
 * variable to a wrong path is better served by one sentence about gh than by
 * a silent switch to a different binary than the one they named. Unset or
 * empty, the variable does nothing at all and the normal resolution runs.
 *
 * The answer is cached for the life of the process, as a promise, so
 * concurrent callers share one resolution.
 */

import { accessSync, constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { getLog } from '../log';
import { resolveBinary } from '../tmux/resolve';

/** Scope "actions" (Phase 35 logging). */
const actionsLog = getLog('actions');

/** The one environment name this phase adds. See the header for why. */
export const GH_BIN_ENV = 'GMUX_GH_BIN';

let cached: Promise<string | null> | null = null;

function isExecutableFile(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The absolute path to gh, or null when this machine has none.
 *
 * Null is a rung of the degrade ladder and not an error: the section says
 * one sentence about installing gh and spawns nothing.
 */
export function ghBinaryPath(): Promise<string | null> {
  if (cached !== null) return cached;
  cached = resolveGhBinary(process.env);
  return cached;
}

/** The resolution itself, with the environment passed in so a test can drive it. */
export async function resolveGhBinary(
  env: NodeJS.ProcessEnv
): Promise<string | null> {
  const named = env[GH_BIN_ENV];
  if (named === undefined || named.length === 0) return resolveBinary('gh');
  if (isAbsolute(named) && isExecutableFile(named)) return named;
  actionsLog.warn(
    `${GH_BIN_ENV} does not name an executable file, so Runs will report ` +
      `that gh is missing.`,
    { value: named }
  );
  return null;
}

/** Test seam, and the probe's seam between its five launches. */
export function resetGhBinaryPathCache(): void {
  cached = null;
}
