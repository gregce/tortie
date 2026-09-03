/**
 * Harness only (Phase 208). Points every `security` call the credentials
 * domain makes at ONE scratch keychain file, so a probe can drive the whole
 * macOS credential path, being the real keychain vault and the real keychain
 * stores, without a single name it composes reaching the person's own login
 * keychain.
 *
 * WHY IT EXISTS. `npm run conformance:credentials` runs the domain over a
 * `security` written from the measurement, and `GMUX_USAGE_FIXTURE` gives a
 * probe's app a FILE vault. Neither runs the real keychain code in the real
 * app, and the Phase 208 defect was in exactly that gap: the shipped vault
 * addressed the person's items from every profile on the machine, and no gate
 * could see it because no gate opened a keychain. This knob is how the app run
 * for that phase watches the real path write into a keychain the probe made
 * and then proves, by attributes, that his did not move.
 *
 * THREE REFUSALS, all hard, and the first two are the ones ./usage-fixture.ts
 * carries.
 *
 *  1. The launch must be an isolated harness launch or an armed probe run.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us.
 *  3. THE KEYCHAIN FILE ITSELF must sit under that same harness directory. A
 *     path to the person's own `~/Library/Keychains/login.keychain-db` is a
 *     path outside it, so this knob cannot be turned into a way of naming his
 *     keychain out loud.
 *
 * When any of them fires the override is not installed and the launch gets
 * whatever `keepDeps` gives a harness launch, being the file shape. Under this
 * knob the login list's presence read goes to the same file, so the whole
 * question is answered by one keychain; the usage meter is not touched here,
 * because it defaults to off and a probe that arms it carries the usage
 * fixture instead.
 */

import { app } from 'electron';
import { harnessKeychainKeepDeps, keychainHasItem, setKeepDeps } from '../credentials';
import { loginsRoot } from '../logins';
import {
  defaultLoginAccountDeps,
  setLoginAccountDeps
} from '../usage/login-accounts';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** The knob's own path, or null when this launch may not use it. */
export function harnessKeychainPath(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  const path = env['GMUX_HARNESS_KEYCHAIN'] ?? '';
  if (path === '') return null;
  if (!isIsolatedLaunch(env) && env['GMUX_PROBES'] !== '1') return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  if (!isInside(path, harnessDir)) return null;
  return path;
}

/** Install the override. Called once from the boot, before the first read. */
export function installHarnessKeychain(): void {
  const path = harnessKeychainPath(process.env, app.getPath('userData'));
  if (path === null) return;
  const root = loginsRoot();
  const { deps, runner } = harnessKeychainKeepDeps(root, app.getPath('home'), path);
  setKeepDeps(deps);
  setLoginAccountDeps({
    ...defaultLoginAccountDeps(),
    keychainHas: (service) => keychainHasItem(runner, service)
  });
  // SAID OUT LOUD, because the probe has to be able to WAIT for it. It names
  // no path and no token.
  console.log('[gmux] harness keychain installed, security answers a scratch keychain');
}
