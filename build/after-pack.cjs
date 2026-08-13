/**
 * after-pack.cjs — the afterPack hook, and the composition point for the three
 * things Tortie must do to a freshly packed .app before it gets sealed:
 *
 *   1. finish the helper rename electron-builder starts (below);
 *   2. harden/sign the nested CLI binaries (build/sign-nested-binaries.cjs);
 *   3. prove the bundled skills CLI is there and runs
 *      (build/assert-skills-cli.cjs).
 *
 * Steps 2 and 3 live in their own modules because each is a different domain
 * with a different reason to change — Appendix F's signing recipe, one entry
 * per embedded binary, and Phase 22's packaging gate — and this file stays the
 * hook, not a junk drawer.
 *
 * ---
 *
 * Phase 13.8. electron-builder renames the four helper BUNDLES and their
 * executables from productName (`Tortie Helper`, `Tortie Helper (Renderer)`,
 * `Tortie Helper (GPU)`, `Tortie Helper (Plugin)`) but leaves each helper's
 * Info.plist `CFBundleName` at Electron's default:
 *
 *   $ PlistBuddy -c 'Print :CFBundleName'    …/Tortie Helper (Renderer).app/…
 *   Electron Helper (Renderer)               ← before this hook
 *   $ PlistBuddy -c 'Print :CFBundleExecutable' …
 *   Tortie Helper (Renderer)
 *
 * Two names for one process is one too many: macOS reads the app's display
 * name from the bundle and the process name from the executable, and which
 * one wins where is not worth relying on. Chrome sets BOTH (CFBundleName
 * "Chrome Helper (Renderer)", executable "Google Chrome Helper (Renderer)")
 * and VS Code sets CFBundleName to "Code Helper (Renderer)". Cursor — also
 * electron-builder — ships the stock "Electron Helper (Renderer)", which is
 * exactly the mismatch we are removing.
 *
 * The hook rewrites CFBundleName to match the bundle's own executable, so
 * every helper answers "Tortie" however you ask. Idempotent, and a no-op on
 * non-macOS targets.
 */

const { existsSync, readdirSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { signNestedBinaries } = require('./sign-nested-binaries.cjs');
const { assertSkillsCli } = require('./assert-skills-cli.cjs');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  renameHelpers(context);
  signNestedBinaries(context);
  // Runs last, and it THROWS. A packed app with no working skills CLI is a
  // broken build, not a warning: the failure is invisible until a user tries to
  // install a skill. See build/assert-skills-cli.cjs for the one that shipped.
  assertSkillsCli(context);
};

/** Step 1: CFBundleName ← the bundle's own executable name, for all helpers. */
function renameHelpers(context) {
  const appName = context.packager.appInfo.productFilename; // "Tortie"
  const frameworks = join(
    context.appOutDir,
    `${appName}.app`,
    'Contents',
    'Frameworks'
  );
  if (!existsSync(frameworks)) return;

  for (const entry of readdirSync(frameworks)) {
    if (!entry.endsWith('.app')) continue;
    const plist = join(frameworks, entry, 'Contents', 'Info.plist');
    if (!existsSync(plist)) continue;
    // The bundle directory name IS the intended process name — electron-
    // builder derived both it and CFBundleExecutable from productName.
    const name = entry.slice(0, -'.app'.length);
    execFileSync('/usr/libexec/PlistBuddy', [
      '-c',
      `Set :CFBundleName ${name}`,
      plist
    ]);
    console.log(`  • after-pack: CFBundleName → ${name}`);
  }
}
