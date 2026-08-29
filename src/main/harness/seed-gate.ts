/**
 * The two refusals every harness seed carries, in one place (Phase 159).
 *
 * A seed writes a value that decides a program runs, or a row a person would
 * see as their own, so every seed refuses the same two launches: one that is
 * not an isolated harness launch, because a seed variable left in a shell
 * profile must never write a person's real settings file, and one whose
 * profile directory is not under the harness directory the runner handed us,
 * because that could be a real profile even when GMUX_SHOT is set.
 *
 * The overview seed wrote these first, the fold seed copied them, the
 * summary seed copied them again, and the arch seed would have been the
 * fourth copy. The wording is kept byte for byte, with the variable's own
 * name in front, so the tests that pin each seed's sentence still hold.
 */

import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/**
 * Why a seed named by `variable` may not run, or null when it may. Pure: it
 * reads the environment record and the profile path it is handed.
 */
export function seedRefusal(
  variable: string,
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  if (!isIsolatedLaunch(env)) {
    return `${variable} refused: this launch is not an isolated harness launch.`;
  }
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '' || !isInside(userDataDir, harnessDir)) {
    return (
      `${variable} refused: the profile directory is not under the harness ` +
      'directory, so this could be a real profile.'
    );
  }
  return null;
}
