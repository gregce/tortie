/**
 * Phase 359, Builder C2 — the harness seam for the open path's live race.
 *
 * WHAT THIS FILE OWNS. One question: "may this launch pause the strict read
 * after its first chunk?" The answer is yes only in the exact shape the
 * conformance gate drives:
 *   - `GMUX_SMOKE === 'agentaccess'`,
 *   - an isolated launch (`GMUX_SMOKE` or `GMUX_SHOT` set),
 *   - `GMUX_HARNESS_DIR` set with the profile inside it,
 *   - the checkpoint path resolving under that directory.
 *
 * WHAT IT DOES NOT DO. It starts no process, spawns nothing, and reads or
 * writes only the fixed harness checkpoint files named here. Outside the
 * exact shape above it is a no-op: the honest arm and the refusal arm are both
 * driven by the gate.
 */

import { app } from 'electron';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** The one harness value this seam answers to. */
export const AGENT_ACCESS_HARNESS_SMOKE = 'agentaccess' as const;

/** The fixed checkpoint file the replacement race is proved through. */
export const AGENT_ACCESS_HARNESS_CHECKPOINT = 'agent-access-open' as const;

/**
 * Whether this launch may arm the read pause. Pure over the environment and
 * the profile path, so the gate can drive both arms without Electron.
 */
export function agentAccessHarnessArmed(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): boolean {
  if ((env['GMUX_SMOKE'] ?? '') !== AGENT_ACCESS_HARNESS_SMOKE) return false;
  if (!isIsolatedLaunch(env)) return false;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return false;
  if (!isInside(userDataDir, harnessDir)) return false;
  return true;
}

/**
 * The armed checkpoint direction, or null when this launch may not use the
 * seam. The caller reads/writes nothing but the path returned here.
 */
export function agentAccessHarnessCheckpoint(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (!agentAccessHarnessArmed(env, app.getPath('userData'))) return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  return `${harnessDir}/${AGENT_ACCESS_HARNESS_CHECKPOINT}`;
}
