/**
 * Harness only (Phase 159). Sets the SEALED arch choice in an isolated
 * profile, so a probe can drive the drift trigger with an agent chosen and
 * prove the process count reads exactly one, and drive it again with no
 * agent and prove it reads zero.
 *
 * WHY IT EXISTS. The choice is sealed, so it can only be written by the
 * process that holds the key, and a probe outside the app cannot forge it:
 * Phase 158's verifier proved a hand written settings.json reads back as
 * None. So this module writes the choice through the SHIPPED settings path,
 * which means the seal is a real seal and `getSettings()` reads it back
 * through the same check a person's launch uses. Everything after that is
 * the shipped path: the watcher, the check, the settle window, the drift
 * reader, the runner's gate, the fold's one shot spawn against the stub
 * from ./fold-stub.ts, the validator and the one writer.
 *
 * It fires nothing itself. A fold seed fires a turn boundary because nothing
 * in a screenshot launch finishes a turn; a drift is fired by the probe
 * changing a file in the scratch repository, which is the real trigger.
 *
 * TWO REFUSALS, both hard, and both the same two ./fold-seed.ts carries.
 *
 *  1. The launch must be an isolated harness launch (GMUX_SMOKE or GMUX_SHOT).
 *     A seed variable left in a shell profile must never write a person's
 *     real settings file, because this value decides that a program runs.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us. A launch that points GMUX_ARCH_SEED at the app while using
 *     the real profile is refused even when GMUX_SHOT is set.
 */

import { app } from 'electron';
import { readFile } from 'node:fs/promises';
import { getSettings, updateSettings } from '../settings/store';
import { seedRefusal } from './seed-gate';

/** What the probe asks for, read from the file GMUX_ARCH_SEED names. */
interface ArchSeedSpec {
  /** The agent that fills the contract in, or null for None. */
  agentId: string | null;
  /** A model that agent's arch recipe offers, or null for None. */
  model: string | null;
}

/** The one line the probe parses out of the harness output. */
const MARKER = '[gmux-arch-seed]';

/**
 * Why this seed may not run, or null when it may.
 *
 * The two refusals live in one pure function so a test can drive both with an
 * environment record and a profile path rather than with an Electron.
 */
export function archSeedRefusal(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  return seedRefusal('GMUX_ARCH_SEED', env, userDataDir);
}

/** Called by dispatchHarness in the GMUX_SHOT branch, after the stub is installed. */
export async function seedArch(): Promise<void> {
  const file = process.env['GMUX_ARCH_SEED'] ?? '';
  if (file === '') return;
  const refusal = archSeedRefusal(process.env, app.getPath('userData'));
  if (refusal !== null) throw new Error(refusal);

  const spec = JSON.parse(await readFile(file, 'utf8')) as ArchSeedSpec;
  // The shipped write, which is what makes the seal real.
  updateSettings({ arch: { agentId: spec.agentId, model: spec.model } });
  const readBack = getSettings().arch;
  const wanted = spec.agentId !== null && spec.model !== null;
  const got = readBack.agentId !== null && readBack.model !== null;
  if (wanted && !got) {
    throw new Error(
      'GMUX_ARCH_SEED could not keep the choice. The OS keystore refused to ' +
        'seal it, so the pass would never run and the probe would measure ' +
        'the wrong thing.'
    );
  }
  console.log(`${MARKER} ${JSON.stringify({ choice: readBack })}`);
}
