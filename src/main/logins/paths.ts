/**
 * The one file that knows where the logins root is (Phase 202).
 *
 * It is `<userData>/gmux/logins`, beside `config/`, `hooks/` and the
 * manifest, for the reason `../config/paths.ts` states: the inner `gmux`
 * directory is one of the identifiers live data is bound to.
 *
 * Every other module in this domain takes the root as an argument, so the
 * rules can be run under plain node by `npm run conformance:logins`.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

/**
 * The logins root.
 *
 * `userDataOverride` exists for the tests and for a harness that runs with
 * its own `--user-data-dir`. Nothing in the product passes it.
 */
export function loginsRoot(userDataOverride?: string): string {
  const root = userDataOverride ?? app.getPath('userData');
  return join(root, 'gmux', 'logins');
}

/**
 * Create the logins root when it is not there. Returns the path either way.
 *
 * It never throws, for the reason `ensureConfigDir` does not: a userData
 * directory Tortie cannot write to is a problem for the whole application
 * rather than something a meter's hover card should crash on.
 */
export function ensureLoginsRoot(userDataOverride?: string): {
  path: string;
  ready: boolean;
} {
  const path = loginsRoot(userDataOverride);
  try {
    mkdirSync(path, { recursive: true });
    return { path, ready: true };
  } catch {
    return { path, ready: false };
  }
}
