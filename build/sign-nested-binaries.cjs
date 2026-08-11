/**
 * sign-nested-binaries.cjs — the nested Mach-O signing step of afterPack.
 *
 * Phase 15, and the first instance of the recipe docs/research/
 * 09-reboot-survival.md Appendix F.3 pins for every CLI gmux embeds (tmux is
 * the next one). Notarization requires EVERY Mach-O inside the bundle to be
 * Developer ID-signed with hardened runtime and a secure timestamp; a missed
 * nested binary is the canonical rejection. Signing is inside-out: nested
 * binary first, app last — which is precisely where this hook sits, because
 * electron-builder emits `afterPack` after `extraResources` are copied and
 * before `signApp` (app-builder-lib out/platformPackager.js: copyFiles →
 * emitAfterPack → doSignAfterPack).
 *
 * WHY THIS EXISTS AT ALL WHEN `mac.binaries` ALREADY LISTS THE BINARY:
 * `mac.binaries` is how electron-builder signs extra binaries — but with
 * `identity: null` (today: no distributable cert on this machine) it never
 * runs; `sign()` returns at `handleNullIdentity()` before it reads `binaries`.
 * The result would be an app whose nested CLI still carries the UPSTREAM
 * ad-hoc linker signature with `Identifier=a.out` and no hardened runtime.
 * This step makes today's unsigned build carry a signature gmux authored —
 * ad-hoc, hardened runtime on, stable identifier — so the shape we ship now is
 * the shape notarization will want later, and the recipe is exercised on every
 * package instead of being a promise in a doc.
 *
 * ENTITLEMENTS: none, and that is verified rather than assumed. The bundled
 * specstory is CGO-free Go whose only dynamic dependencies are Apple system
 * libraries (`otool -L`: libSystem, libresolv, CoreFoundation, Security), so
 * hardened-runtime library validation is satisfied trivially — no JIT, no
 * unsigned executable memory, none of the exceptions Postgres.app needs.
 */

const { existsSync, chmodSync, statSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

/**
 * Nested binaries gmux embeds, as paths relative to `Contents/`. Keep this in
 * step with `mac.binaries` in electron-builder.yml — that list is what signs
 * them once a real identity exists, this one is what hardens them meanwhile.
 */
const NESTED_BINARIES = ['Resources/bin/specstory'];

function run(cmd, args) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
}

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
function signNestedBinaries(context) {
  const contents = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents'
  );
  // null identity ⇒ electron-builder skips signing entirely, so we harden the
  // nested binaries ourselves. A real identity ⇒ leave them for `mac.binaries`,
  // which signs them with the Developer ID before sealing the app.
  const identity = context.packager.platformSpecificBuildOptions.identity;
  const willElectronBuilderSign = identity !== null;
  const appId = context.packager.appInfo.id;

  for (const relative of NESTED_BINARIES) {
    const path = join(contents, relative);
    if (!existsSync(path)) {
      throw new Error(
        `after-pack: ${relative} is missing from the app bundle. ` +
          'The extraResources entry that copies it did not run — check ' +
          'build/vendor/specstory/bin exists (npm run vendor:specstory).'
      );
    }

    // The exec bit must survive the copy or the app ships a binary it cannot
    // spawn; asserting is cheaper than discovering it at runtime.
    const mode = statSync(path).mode & 0o777;
    if ((mode & 0o111) === 0) chmodSync(path, 0o755);

    // curl does not set com.apple.quarantine, but a hand-placed
    // GMUX_SPECSTORY_TARBALL might have carried one in. Best effort.
    try {
      run('/usr/bin/xattr', ['-d', 'com.apple.quarantine', path]);
    } catch {
      /* no quarantine attribute — the normal case */
    }

    if (willElectronBuilderSign) {
      console.log(
        `  • after-pack: ${relative} left for electron-builder's mac.binaries pass`
      );
      continue;
    }

    const identifier = `${appId}.${relative.split('/').pop()}`;
    run('/usr/bin/codesign', [
      '--force',
      '--sign',
      '-',
      '--identifier',
      identifier,
      // Hardened runtime now, so the notarized build is not the first time
      // this binary has ever run under it.
      '--options',
      'runtime',
      // A secure timestamp needs a real identity; ad-hoc cannot have one.
      '--timestamp=none',
      path
    ]);
    run('/usr/bin/codesign', ['--verify', '--strict', path]);
    console.log(`  • after-pack: signed ${relative} (ad-hoc, runtime, ${identifier})`);
  }
}

module.exports = { signNestedBinaries, NESTED_BINARIES };
