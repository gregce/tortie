/**
 * assert-main-requires.cjs — every module the MAIN and PRELOAD bundles require
 * must actually be inside the packed app (Phase 27 integration).
 *
 * WHY THIS EXISTS, measured rather than guessed. electron-vite externalizes
 * production dependencies (externalizeDepsPlugin), so out/main/index.js
 * contains real `require("<package>")` calls that resolve from the packed
 * node_modules at run time. electron-builder.yml carries a long denylist of
 * renderer-only packages ("!node_modules/parse5/**", ...), written when main
 * required only node-pty, better-sqlite3 and @parcel/watcher. Phase 20.5 then
 * imported parse5 into MAIN (the preview anchor rewrite), and the 0.18.0
 * package built on 2026-08-13 crashed in its first JavaScript tick with
 * "Cannot find module 'parse5'" — as a MODAL DIALOG, not a log line, because
 * that is what Electron does with an uncaught exception in a packaged app.
 * Every repo gate passed. Only launching the packed app caught it, the same
 * trap as the tree-sitter wasm (research 19 section 7.2) and the skills CLI
 * node_modules drop, which is why this now runs at afterPack on every build.
 *
 * WHAT IT DOES. Reads out/main/index.js and out/preload/index.js back OUT of
 * the packed app.asar, collects every `require("...")` of a bare package name
 * (never "./relative" paths and never node builtins), and asserts the package
 * directory exists in the asar or in app.asar.unpacked. Throws on the first
 * missing one, so the build fails HERE with the package named, instead of
 * hanging a smoke on a dialog.
 *
 * The scan is static. It cannot see a require built from a variable, and it
 * does not walk transitive dependencies (a package present but missing its
 * own dependency still crashes at run time — parse5 needs entities, so BOTH
 * had to come off the denylist). The packaged basic smoke remains the
 * dynamic proof; this is the cheap gate in front of it.
 */

const { existsSync, readFileSync } = require('node:fs');
const { builtinModules } = require('node:module');
const { join } = require('node:path');

const asar = require('@electron/asar');

const BUNDLES = ['out/main/index.js', 'out/preload/index.js'];

/** Bare package name from a require argument: "@scope/pkg/sub" -> "@scope/pkg". */
function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function assertMainRequires(context) {
  const appName = context.packager.appInfo.productFilename; // "Tortie"
  const resources = join(context.appOutDir, `${appName}.app`, 'Contents', 'Resources');
  const asarPath = join(resources, 'app.asar');
  if (!existsSync(asarPath)) {
    throw new Error(`assert-main-requires: ${asarPath} not found — asar layout changed?`);
  }

  const builtins = new Set(builtinModules);
  const missing = [];
  const checked = new Set();

  for (const bundle of BUNDLES) {
    let source;
    try {
      source = asar.extractFile(asarPath, bundle).toString('utf8');
    } catch {
      throw new Error(`assert-main-requires: ${bundle} is not in app.asar — bundle layout changed?`);
    }
    for (const match of source.matchAll(/require\("([^"]+)"\)/g)) {
      const spec = match[1];
      if (spec.startsWith('.') || spec.startsWith('node:')) continue;
      const pkg = packageName(spec);
      if (pkg === 'electron' || builtins.has(pkg)) continue;
      if (checked.has(pkg)) continue;
      checked.add(pkg);

      let inAsar = false;
      try {
        asar.statFile(asarPath, `node_modules/${pkg}`);
        inAsar = true;
      } catch {
        inAsar = false;
      }
      const unpacked = join(resources, 'app.asar.unpacked', 'node_modules', pkg);
      if (!inAsar && !existsSync(unpacked)) missing.push(`${pkg} (required by ${bundle})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `assert-main-requires: the packed app is missing ${missing.length} module(s) the ` +
        `main/preload bundles require at run time:\n  ${missing.join('\n  ')}\n` +
        `Fix: remove the package from the "!node_modules/..." denylist in electron-builder.yml ` +
        `(and bring its own dependencies with it).`
    );
  }
  console.log(
    `  • after-pack: ${checked.size} externalized main/preload requires all present in the packed app`
  );
}

module.exports = { assertMainRequires };
