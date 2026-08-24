/**
 * ts-runner.mjs. One place that says how a TypeScript probe is run (Phase 145
 * stage 5).
 *
 * Before this file, 28 scripts under build/ started their probe with
 * `spawnSync('npx', ['tsx', ...])`, and tsx was not in package-lock.json. On a
 * machine whose npx cache had never held tsx, a conformance gate's first act
 * was an npm registry request to fetch its own runner. That was measured on
 * 2026-08-24 by pointing the registry at a closed local port and running
 * `node build/conformance-context.mjs` with an empty npm cache: the gate
 * printed `request to http://127.0.0.1:9/tsx failed` before it checked a
 * single thing. A verification command must never reach the network to find
 * its runner, so tsx is now pinned in package-lock.json as an exact
 * devDependency, and every script resolves it from node_modules through this
 * function.
 *
 * The rule this file carries: a check either finds its runner in the
 * repository's installed dependencies or it refuses with a sentence naming the
 * fix. It never falls back to npx, a global install, or anything else that
 * could resolve differently on another machine.
 *
 * Usage, replacing the old npx form byte for byte in spirit:
 *
 *   spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json',
 *     'build/some-probe.mts'], ...)
 *
 * `node build/assert-hermetic-checks.mjs` is the gate that keeps 'npx' out of
 * build/ so the old form cannot come back.
 */

import { createRequire } from 'node:module';

/**
 * Absolute path of the tsx command line entry inside this repository's
 * node_modules, for running a .mts probe under `process.execPath`.
 */
export function tsxCli() {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve('tsx/cli');
  } catch {
    throw new Error(
      'tsx is not installed under node_modules. Run npm install. The runner ' +
        'is pinned in package-lock.json and is never fetched from the network.'
    );
  }
}
