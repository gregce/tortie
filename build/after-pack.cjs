/**
 * after-pack.cjs — finish the helper rename electron-builder starts.
 *
 * Phase 13.8. electron-builder renames the four helper BUNDLES and their
 * executables from productName (`gmux Helper`, `gmux Helper (Renderer)`,
 * `gmux Helper (GPU)`, `gmux Helper (Plugin)`) but leaves each helper's
 * Info.plist `CFBundleName` at Electron's default:
 *
 *   $ PlistBuddy -c 'Print :CFBundleName'    …/gmux Helper (Renderer).app/…
 *   Electron Helper (Renderer)               ← before this hook
 *   $ PlistBuddy -c 'Print :CFBundleExecutable' …
 *   gmux Helper (Renderer)
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
 * every helper answers "gmux" however you ask. Idempotent, and a no-op on
 * non-macOS targets.
 */

const { existsSync, readdirSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename; // "gmux"
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
};
