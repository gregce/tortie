/**
 * sign-nested-binaries.cjs — the nested Mach-O signing step of afterPack.
 *
 * Phase 15 introduced this hook for the bundled specstory CLI; Phase 27 (the
 * release lane) made it the ONE place every nested binary gets its real
 * signature. The recipe is docs/research/09-reboot-survival.md Appendix F.3:
 * notarization requires EVERY Mach-O inside the bundle to be Developer
 * ID-signed with hardened runtime and a secure timestamp, and signing is
 * inside-out — nested binary first, app last. That is precisely where this
 * hook sits: electron-builder emits `afterPack` after `extraResources` are
 * copied and the asar is packed, and before `signApp` seals the bundle
 * (app-builder-lib out/platformPackager.js: copyFiles → emitAfterPack →
 * doSignAfterPack).
 *
 * WHY THE HOOK SIGNS WITH THE REAL IDENTITY instead of leaving the files to
 * electron-builder's signing walk: @electron/osx-sign re-signs every Mach-O
 * it finds with `codesign --force` and NO `-i`, and codesign then derives the
 * identifier from the FILENAME — measured 2026-08-13, a re-sign without -i
 * turned the stable identifier com.probe.custom into rg-probe-5555… . Tortie
 * pins stable reverse-DNS identifiers (<appId>.specstory, <appId>.rg), so the
 * hook signs these files itself and `mac.signIgnore` in electron-builder.yml
 * excludes them from the walk. THE TWO LISTS MUST STAY IN STEP: an entry in
 * signIgnore that this hook does not sign ships the upstream linker ad-hoc
 * signature (Identifier=a.out) inside a Developer ID app, and notarization
 * rejects exactly that. build/verify-signed.mjs checks every entry.
 *
 * WHERE THE IDENTITY COMES FROM: the keychain search list, the same place
 * electron-builder's own discovery looks. On the dev machine that is the
 * login keychain; on the CI release lane it is the temporary keychain the
 * workflow imported the p12 into BEFORE packaging (the deadreckon pattern).
 * CSC_LINK cannot work here — electron-builder imports it only at signApp
 * time, after this hook has run — so the hook fails fast on that combination
 * rather than shipping a build notarization will reject.
 *
 * WITH NO IDENTITY (dev machines without the cert, the CI gates lane with
 * CSC_IDENTITY_AUTO_DISCOVERY=false, PR builds where electron-builder skips
 * signing on its own): the hook ad-hoc hardens the same files with the same
 * identifiers, exactly the pre-Phase-27 behaviour, so the unsigned build
 * keeps the shape notarization will want.
 *
 * ENTITLEMENTS: none for either binary, verified rather than assumed.
 * specstory is CGO-free Go (otool -L: only Apple system dylibs); ripgrep is
 * Rust with the same property. No JIT, no unsigned executable memory.
 *
 * THE SKILLS CLI TREE (Resources/skills-cli) is pure JavaScript — nothing to
 * codesign; the app's resource seal covers it. That claim is enforced, not
 * assumed: scanSkillsTreeForMachO() below fails the build if a Mach-O ever
 * appears in the tree, with instructions to add it to NESTED_BINARIES.
 */

const { existsSync, chmodSync, statSync, readdirSync, openSync, readSync, closeSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

/**
 * Nested binaries Tortie embeds, as paths relative to `Contents/`. Keep this
 * in step with `mac.signIgnore` in electron-builder.yml — every entry here
 * must be excluded there, and nothing may be excluded there that is not
 * signed here.
 */
const NESTED_BINARIES = [
  { relative: 'Resources/bin/specstory', identifierSuffix: 'specstory' },
  {
    relative:
      'Resources/app.asar.unpacked/node_modules/@vscode/ripgrep-darwin-arm64/bin/rg',
    identifierSuffix: 'rg'
  }
];

/** The skills CLI tree that must stay free of Mach-O binaries. */
const SKILLS_TREE = 'Resources/skills-cli';

function run(cmd, args) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
}

/**
 * Resolve the Developer ID identity the hook signs with, or null for the
 * ad-hoc fallback. Mirrors electron-builder's own discovery closely enough
 * that the two cannot disagree in any environment this repo builds in:
 * both grep the keychain search list for "Developer ID Application".
 */
function resolveSigningIdentity(context) {
  // The yml can still opt the whole build out the old way.
  if (context.packager.platformSpecificBuildOptions.identity === null) return null;
  // The explicit opt-out the CI gates/durability/compat lanes set.
  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') return null;
  // electron-builder skips signing on pull-request builds (isSignAllowed).
  if (
    process.env.GITHUB_EVENT_NAME === 'pull_request' &&
    process.env.CSC_FOR_PULL_REQUEST !== 'true'
  ) {
    return null;
  }

  let listing = '';
  try {
    listing = run('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning']);
  } catch {
    listing = '';
  }
  const match = listing.match(/"(Developer ID Application: [^"]+)"/);
  if (match) return match[1];

  if (process.env.CSC_LINK) {
    throw new Error(
      'after-pack: CSC_LINK is set but no "Developer ID Application" identity ' +
        'is in the keychain search list. electron-builder imports CSC_LINK only ' +
        'at signApp time — AFTER this hook — so the nested binaries would ship ' +
        'ad-hoc inside a Developer ID app and notarization would reject the ' +
        'build. Import the p12 into a temporary keychain before packaging ' +
        '(the deadreckon pattern) and unset CSC_LINK.'
    );
  }
  return null;
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
  const appId = context.packager.appInfo.id;
  const identity = resolveSigningIdentity(context);

  scanSkillsTreeForMachO(join(contents, SKILLS_TREE));

  for (const { relative, identifierSuffix } of NESTED_BINARIES) {
    const path = join(contents, relative);
    if (!existsSync(path)) {
      throw new Error(
        `after-pack: ${relative} is missing from the app bundle. ` +
          'The packaging step that copies it did not run — for specstory check ' +
          'build/vendor/specstory/bin exists (npm run vendor:specstory); for rg ' +
          'check the asarUnpack pattern in electron-builder.yml.'
      );
    }

    // The exec bit must survive the copy or the app ships a binary it cannot
    // spawn; asserting is cheaper than discovering it at runtime.
    const mode = statSync(path).mode & 0o777;
    if ((mode & 0o111) === 0) chmodSync(path, 0o755);

    // curl does not set com.apple.quarantine, but a hand-placed tarball
    // might have carried one in. Best effort.
    try {
      run('/usr/bin/xattr', ['-d', 'com.apple.quarantine', path]);
    } catch {
      /* no quarantine attribute — the normal case */
    }

    const identifier = `${appId}.${identifierSuffix}`;
    if (identity) {
      run('/usr/bin/codesign', [
        '--force',
        '--sign',
        identity,
        '--identifier',
        identifier,
        '--options',
        'runtime',
        // A secure timestamp is a notarization requirement for real
        // signatures. It needs the network; CI and the dev machine have it.
        '--timestamp',
        path
      ]);
      run('/usr/bin/codesign', ['--verify', '--strict', path]);
      console.log(
        `  • after-pack: signed ${relative} (Developer ID, runtime, ${identifier})`
      );
    } else {
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
      console.log(
        `  • after-pack: signed ${relative} (ad-hoc, runtime, ${identifier})`
      );
    }
  }
}

/** The four Mach-O magics, both byte orders, plus the universal-binary magic. */
const MACH_O_MAGICS = new Set([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe]);

function isMachO(path) {
  let fd;
  try {
    fd = openSync(path, 'r');
    const head = Buffer.alloc(4);
    const bytes = readSync(fd, head, 0, 4, 0);
    if (bytes < 4) return false;
    return MACH_O_MAGICS.has(head.readUInt32BE(0));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/**
 * Prove the skills CLI tree still has nothing to sign. fetch-skills.cjs
 * enforces this at vendor time; this re-check at pack time is what turns
 * "the tree is pure JavaScript" from a memory into a gate on every build.
 */
function scanSkillsTreeForMachO(root) {
  if (!existsSync(root)) return; // the tree is asserted separately by assert-skills-cli.cjs
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && isMachO(path)) offenders.push(path);
    }
  };
  walk(root);
  if (offenders.length > 0) {
    throw new Error(
      'after-pack: Mach-O binaries appeared in the skills CLI tree, which is ' +
        'contractually pure JavaScript. Signing would miss them and ' +
        'notarization would reject the build. Either remove them or add each ' +
        'to NESTED_BINARIES here AND to mac.signIgnore in electron-builder.yml:\n  ' +
        offenders.join('\n  ')
    );
  }
}

module.exports = { signNestedBinaries, NESTED_BINARIES, isMachO, resolveSigningIdentity };
