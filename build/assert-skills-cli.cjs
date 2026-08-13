/**
 * assert-skills-cli.cjs — prove the bundled skills CLI is in the packed .app
 * and that it runs there.
 *
 * Phase 22. This is a gate rather than an assumption, and it exists because the
 * assumption was already wrong once. The first version of the electron-builder
 * entry copied `build/vendor/skills` whole. `npm run typecheck`, `npm run
 * build`, every unit test and the whole packaging run passed, and the shipped
 * `Contents/Resources/skills-cli` held three JSON files, 12 KB, and no CLI. The
 * cause is `app-builder-lib/out/util/filter.js` line 43, which drops a
 * directory whose path relative to the copy root is exactly `node_modules`.
 *
 * That is the same class of defect research 19 section 7.2 recorded for the
 * tree-sitter wasm files: `out/` passes, the .app is broken, and nothing in
 * between notices. So this runs from `afterPack`, before the bundle is sealed,
 * and it fails the build.
 *
 * Three checks, each of which the previous failure would have tripped:
 *
 *  1. The entry point exists at the exact path src/main/skills/resolve.ts will
 *     look for.
 *  2. `node_modules/yaml` and `node_modules/tar` are beside it, because
 *     `dist/cli.mjs` imports both by bare name and Node walks up looking for a
 *     directory named exactly `node_modules`.
 *  3. The packed Electron binary RUNS the entry point with
 *     `ELECTRON_RUN_AS_NODE=1` and prints the pinned version. This is the only
 *     check that proves the tree is loadable rather than merely present.
 *
 * Check 3 runs with an isolated HOME and `XDG_STATE_HOME`, so a build can never
 * write into the machine owner's agent configuration.
 */

const { execFileSync } = require('node:child_process');
const { existsSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { readPin } = require('./fetch-skills.cjs');

/** Where the resolver looks, relative to Contents/Resources. */
const RESOURCE_DIR = 'skills-cli';

function assertSkillsCli(context) {
  const pin = readPin();
  const appName = context.packager.appInfo.productFilename;
  const resources = join(context.appOutDir, `${appName}.app`, 'Contents', 'Resources');
  const root = join(resources, RESOURCE_DIR);
  const entry = join(root, ...pin.entry.split('/'));

  if (!existsSync(entry)) {
    throw new Error(
      `the packed app has no skills CLI at ${entry}.\n` +
        `  Contents/Resources/${RESOURCE_DIR} exists: ${existsSync(root)}\n` +
        `  This is the electron-builder extraResources entry. A directory whose path\n` +
        `  relative to the copy root is exactly "node_modules" is dropped by\n` +
        `  app-builder-lib/out/util/filter.js, so the copy root must BE that directory.`
    );
  }
  for (const dep of ['yaml', 'tar']) {
    const path = join(root, 'node_modules', dep, 'package.json');
    if (!existsSync(path)) {
      throw new Error(
        `the packed skills CLI has no node_modules/${dep}. dist/cli.mjs imports it by ` +
          `bare name, so the app would fail with ERR_MODULE_NOT_FOUND the first time a ` +
          `user tried to install a skill.`
      );
    }
  }

  const electron = join(context.appOutDir, `${appName}.app`, 'Contents', 'MacOS', appName);
  if (!existsSync(electron)) {
    throw new Error(`cannot find the packed executable at ${electron}`);
  }

  const home = mkdtempSync(join(tmpdir(), 'gmux-skills-pack-'));
  try {
    const stdout = execFileSync(electron, [entry, '--version'], {
      encoding: 'utf8',
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: home,
      env: {
        PATH: '/usr/bin:/bin',
        HOME: home,
        XDG_STATE_HOME: join(home, 'state'),
        DO_NOT_TRACK: '1',
        ELECTRON_RUN_AS_NODE: '1'
      }
    });
    const got = stdout.trim();
    if (got !== pin.version) {
      throw new Error(
        `the packed skills CLI reports "${got}", the pin says "${pin.version}"`
      );
    }
    console.log(
      `  • after-pack: skills ${pin.version} runs from Contents/Resources/${RESOURCE_DIR} ` +
        `under the packed Electron with no node on PATH`
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

module.exports = { assertSkillsCli };
