/**
 * after-pack.cjs — the afterPack hook, and the composition point for the six
 * things Tortie must do to a freshly packed .app before it gets sealed:
 *
 *   1. refuse an app that carries Intel-only code, before anything below
 *      writes or signs (build/assert-arm64-only.mjs);
 *   2. finish the helper rename electron-builder starts (below);
 *   3. harden/sign the nested CLI binaries (build/sign-nested-binaries.cjs);
 *   4. prove every package the main and preload bundles require is in the
 *      packed app (build/assert-main-requires.cjs);
 *   5. prove the bundled skills CLI is there and runs
 *      (build/assert-skills-cli.cjs);
 *   6. prove the first-party agent skill is there, byte for byte, with no
 *      extra entry and no executable bit (build/assert-agent-skills.cjs).
 *
 * Steps 1, 3, 4, 5 and 6 live in their own modules because each is a different
 * domain with a different reason to change — Phase 351's arm64 gate,
 * Appendix F's signing recipe, one entry per embedded binary, Phase 27's
 * require check, Phase 22's packaging gate, and Phase 359's bundled skill
 * assertion — and this file stays the hook, not a junk drawer.
 *
 * SEAL WARNING (Phase 27, research 27 section 6.3): everything in this hook
 * is safe ONLY because afterPack runs BEFORE signApp seals the bundle.
 * NOTHING may write inside the .app after signing — a hook placed after
 * signApp (afterSign, afterAllArtifactBuild touching the .app) invalidates
 * the seal, and the symptom is a Gatekeeper failure on the user's machine
 * rather than a build error here. If you need a new packaging step that
 * writes into the bundle, it goes in THIS hook, before the sign.
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
const { assertAgentSkills } = require('./assert-agent-skills.cjs');
const { assertSkillsCli } = require('./assert-skills-cli.cjs');
const { assertMainRequires } = require('./assert-main-requires.cjs');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  // Phase 351, issue 43: macOS warns "Support Ending for Intel-based Apps" on
  // an app that carries code with no arm64 slice. This only reads, and it is
  // FIRST, so an app with Intel-only code stops before this hook writes or
  // signs anything and before electron-builder signs, notarizes, cuts the DMG
  // and ZIP or publishes. It THROWS, naming every such file. See
  // build/assert-arm64-only.mjs.
  const { assertArm64Only } = await import('./assert-arm64-only.mjs');
  const arm64 = assertArm64Only(
    join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  );
  console.log(`  • after-pack: ${arm64.machO} Mach-O files, every one holds arm64 code`);
  renameHelpers(context);
  signNestedBinaries(context);
  // THROWS if a module the main/preload bundles require is not in the packed
  // app. The 0.18.0 rehearsal build passed every repo gate and then died in
  // its first JavaScript tick ("Cannot find module 'parse5'") because the
  // electron-builder.yml denylist had outlived what main actually imports.
  // See build/assert-main-requires.cjs for the shipped failure.
  assertMainRequires(context);
  // Runs last, and it THROWS. A packed app with no working skills CLI is a
  // broken build, not a warning: the failure is invisible until a user tries to
  // install a skill. See build/assert-skills-cli.cjs for the one that shipped.
  assertSkillsCli(context);
  // Phase 359. THROWS when the first-party `tortie` skill is absent from
  // the bundle: every enabled launch hands the agent a flag that points at
  // nothing, and the failure is invisible until a person asks an agent to
  // use it. See build/assert-agent-skills.cjs.
  assertAgentSkills(context);
};

/** Step 2: CFBundleName ← the bundle's own executable name, for all helpers. */
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
