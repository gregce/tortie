#!/usr/bin/env node
/**
 * verify-signed.mjs — the release gate on code signing (Phase 27).
 *
 * Research 27 section 1.2 measured that the pre-Phase-27 build FAILED
 * `codesign --verify --deep --strict` and nothing noticed, because no gate
 * ran the command. This script is that gate. It produces evidence, not
 * assurance: every check runs the real tool against the real artifact and
 * prints what came back.
 *
 * Usage:
 *   node build/verify-signed.mjs [app-path] [--expect-notarized] [--artifacts]
 *
 *   app-path             defaults to release/mac-arm64/Tortie.app
 *   --expect-notarized   require spctl "Notarized Developer ID" and a stapled
 *                        ticket (the state after notarization; the final
 *                        release gate). Without it, a signed-but-not-yet-
 *                        notarized app passes the signing checks and spctl
 *                        must still name the signature "Unnotarized Developer
 *                        ID" — any other rejection is a broken signature.
 *   --artifacts          also verify the app INSIDE the newest ZIP and on the
 *                        mounted newest DMG (research 27 section 6.3: gate
 *                        all three, not just the loose .app).
 *
 * What is checked on each app bundle:
 *   1. codesign --verify --deep --strict --verbose=2   (the measured gap)
 *   2. the designated requirement is identifier+anchor, NOT a cdhash — the
 *      research calls this line the one that matters most; a cdhash
 *      requirement can never match a future build, so self-update is
 *      impossible until this check passes (section 1.3)
 *   3. TeamIdentifier is set and the hardened-runtime flag is on
 *   4. the main executable's entitlements carry allow-jit and never
 *      disable-library-validation (CLAUDE.md refusal 6)
 *   5. every NESTED_BINARIES entry (kept in build/sign-nested-binaries.cjs)
 *      verifies strictly, carries the same TeamIdentifier, hardened runtime,
 *      and its stable reverse-DNS identifier. THREE binaries are expected
 *      since Phase 41: specstory, the unpacked ripgrep, and the pinned tmux at
 *      Resources/bin/tmux with identifier <appId>.tmux. The check walks the
 *      list, so the third row needed no code change here. Since Phase 115 each
 *      row's sealed entitlement set must also EQUAL the expectation on its
 *      row, in both directions: specstory carries exactly
 *      allow-unsigned-executable-memory (the wazero kill, research 59), rg and
 *      tmux carry the empty set, and disable-library-validation fails outright
 *      on any binary. Set equality rather than containment is the point; a
 *      containment check would pass a blob that also smuggled a broader key
 *      in. Via --artifacts this same check runs on the ZIP and DMG copies in
 *      release.yml with no workflow edit, and it catches signIgnore drift that
 *      strips the blob after the after-pack hook ran.
 *   6. the skills CLI tree contains no Mach-O (nothing unsigned to smuggle)
 *   7. spctl --assess, interpreted per the flag above
 *   8. stapler validate (only with --expect-notarized)
 *
 * No credential is read or needed; everything here is public verification.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const require = createRequire(import.meta.url);
const { NESTED_BINARIES, isMachO, decodeEntitlementKeys } = require('./sign-nested-binaries.cjs');

/** The key refusal 6 forbids anywhere in the bundle, checked on every binary. */
const DISABLE_LIBRARY_VALIDATION = 'com.apple.security.cs.disable-library-validation';

const args = process.argv.slice(2);
const expectNotarized = args.includes('--expect-notarized');
const checkArtifacts = args.includes('--artifacts');
const positional = args.filter((a) => !a.startsWith('--'));
const appPath = positional[0] ?? join(process.cwd(), 'release', 'mac-arm64', 'Tortie.app');
const releaseDir = join(process.cwd(), 'release');

let failures = 0;
let warnings = 0;

function pass(name, detail) {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  failures += 1;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function warn(name, detail) {
  warnings += 1;
  console.log(`  WARN  ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Run a tool and return {status, output} with stdout and stderr MERGED —
 * codesign and spctl write their details to stderr even on success, so
 * capturing stdout alone reads back empty.
 */
function tryRun(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  return { status: r.status ?? 1, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
/** Like tryRun(), but a nonzero exit is a hard error (setup steps). */
function run(cmd, cmdArgs) {
  const r = tryRun(cmd, cmdArgs);
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} failed:\n${r.output}`);
  return r.output;
}
function codesignInfo(target, extra = []) {
  return tryRun('/usr/bin/codesign', ['-dvv', ...extra, target]).output;
}

/**
 * @param stapleMode 'required' — the loose .app must carry a stapled ticket;
 *   'inner' — an app copy inside a ZIP or DMG. The post-hoc notarization path
 *   (build/notarize-local.mjs) cannot staple those copies, because the
 *   archives were cut before the ticket existed; spctl still accepts them via
 *   Apple's online ticket lookup, and only OFFLINE first launch from that
 *   artifact would prompt. The inline path (notarize credentials in the env
 *   at package time) staples the .app before the DMG and ZIP are built, and
 *   then this reports PASS. WARN, not FAIL, so the post-hoc flow stays
 *   usable — but the release workflow should use the inline path and see
 *   zero warnings.
 */
function verifyApp(app, label, stapleMode = 'required') {
  console.log(`\n${label}: ${app}`);
  if (!existsSync(app)) {
    fail('bundle exists', `${app} not found`);
    return;
  }

  // 1. The measured gap: deep strict verification.
  {
    const r = tryRun('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
    if (r.status === 0) pass('codesign --verify --deep --strict');
    else fail('codesign --verify --deep --strict', r.output.trim().split('\n')[0]);
  }

  // 2. Designated requirement: identifier+anchor, never a cdhash.
  {
    const r = tryRun('/usr/bin/codesign', ['-d', '-r-', app]);
    const designated = r.output.split('\n').find((l) => l.startsWith('designated =>')) ?? '';
    if (/cdhash/.test(designated)) {
      fail('designated requirement', `still a cdhash — self-update impossible: ${designated}`);
    } else if (/anchor apple generic/.test(designated) && /identifier/.test(designated)) {
      pass('designated requirement', designated.replace('designated => ', ''));
    } else {
      fail('designated requirement', designated || 'no designated requirement at all (unsigned?)');
    }
    // The identifier must be the bundle id, so every future build matches it.
    const bundleId = tryRun('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleIdentifier',
      join(app, 'Contents', 'Info.plist')
    ]).output.trim();
    if (bundleId && designated.includes(`"${bundleId}"`)) {
      pass('requirement identifier matches CFBundleIdentifier', bundleId);
    } else if (bundleId) {
      fail('requirement identifier matches CFBundleIdentifier', `${bundleId} not in: ${designated}`);
    }
  }

  // 3. Team identifier + hardened runtime on the app itself.
  const appInfo = codesignInfo(app);
  const team = (appInfo.match(/TeamIdentifier=(\S+)/) ?? [])[1] ?? 'not set';
  if (team !== 'not set') pass('TeamIdentifier', team);
  else fail('TeamIdentifier', 'not set (ad-hoc or unsigned)');
  if (/flags=.*\bruntime\b/.test(appInfo)) pass('hardened runtime flag');
  else fail('hardened runtime flag', appInfo.match(/flags=[^\n]*/)?.[0] ?? 'no flags line');

  // 4. Entitlements on the main executable.
  {
    const r = tryRun('/usr/bin/codesign', ['-d', '--entitlements', '-', '--xml', app]);
    if (r.output.includes('com.apple.security.cs.allow-jit')) pass('entitlements carry allow-jit');
    else fail('entitlements carry allow-jit', 'V8 cannot JIT without it under hardened runtime');
    if (r.output.includes(DISABLE_LIBRARY_VALIDATION)) {
      fail('no disable-library-validation (app)', 'refusal 6: the key must appear nowhere');
    } else {
      pass('no disable-library-validation (app)');
    }
  }

  // 5. Nested binaries: the signIgnore/NESTED_BINARIES contract, checked.
  for (const { relative, identifierSuffix, entitlements } of NESTED_BINARIES) {
    const nested = join(app, 'Contents', relative);
    const name = `nested ${identifierSuffix}`;
    if (!existsSync(nested)) {
      fail(name, `${relative} missing`);
      continue;
    }
    const strict = tryRun('/usr/bin/codesign', ['--verify', '--strict', nested]);
    const info = codesignInfo(nested);
    const nestedTeam = (info.match(/TeamIdentifier=(\S+)/) ?? [])[1] ?? 'not set';
    const identifier = (info.match(/Identifier=(\S+)/) ?? [])[1] ?? '';
    const problems = [];
    if (strict.status !== 0) problems.push('strict verify failed');
    if (nestedTeam !== team) problems.push(`TeamIdentifier ${nestedTeam} != app's ${team}`);
    if (!/flags=.*\bruntime\b/.test(info)) problems.push('no hardened runtime');
    if (!identifier.endsWith(`.${identifierSuffix}`)) problems.push(`identifier drifted: ${identifier}`);
    // Phase 115: the sealed entitlement set must EQUAL the row's expectation,
    // in both directions. The expectation is imported from NESTED_BINARIES,
    // the one home of it, so this gate and the after-pack hook cannot drift
    // apart. This is what catches signIgnore drift that strips or rewrites
    // the blob after the hook ran, and it runs on the ZIP and DMG copies too.
    let sealed;
    try {
      sealed = decodeEntitlementKeys(nested);
    } catch (err) {
      sealed = null;
      problems.push(`entitlement decode failed: ${String(err).split('\n')[0]}`);
    }
    if (sealed !== null) {
      const expected = new Set(entitlements?.keys ?? []);
      const missing = [...expected].filter((k) => !sealed.has(k));
      const extra = [...sealed].filter((k) => !expected.has(k));
      if (missing.length > 0) problems.push(`entitlements missing: ${missing.join(', ')}`);
      if (extra.length > 0) problems.push(`entitlements beyond the expectation: ${extra.join(', ')}`);
      if (sealed.has(DISABLE_LIBRARY_VALIDATION)) {
        problems.push('carries disable-library-validation (refusal 6)');
      }
    }
    if (problems.length === 0) {
      const entNote =
        entitlements === undefined ? 'no entitlements' : (entitlements.keys ?? []).join(', ');
      pass(name, `${identifier}, ${nestedTeam}, runtime, ${entNote}`);
    } else {
      fail(name, problems.join('; '));
    }
  }

  // 6. Nothing signable hiding in the skills tree.
  {
    const skillsRoot = join(app, 'Contents', 'Resources', 'skills-cli');
    let offenders = 0;
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.isFile() && isMachO(p)) offenders += 1;
      }
    };
    if (existsSync(skillsRoot)) walk(skillsRoot);
    if (offenders === 0) pass('skills CLI tree is Mach-O free');
    else fail('skills CLI tree is Mach-O free', `${offenders} Mach-O file(s) found`);
  }

  // 7. Gatekeeper's own verdict.
  {
    const r = tryRun('/usr/sbin/spctl', ['-a', '-vvv', '-t', 'exec', app]);
    const oneLine = r.output.trim().replace(/\s+/g, ' ');
    if (expectNotarized) {
      if (r.status === 0 && /Notarized Developer ID/.test(r.output)) {
        pass('spctl assessment', 'accepted, source=Notarized Developer ID');
      } else {
        fail('spctl assessment', oneLine || `exit ${r.status}`);
      }
    } else {
      if (r.status === 0) {
        pass('spctl assessment', oneLine);
      } else if (/Unnotarized Developer ID/.test(r.output)) {
        pass(
          'spctl assessment (signing stage)',
          'rejected only for missing notarization — the signature chain itself is good'
        );
      } else {
        fail('spctl assessment', oneLine || `exit ${r.status}`);
      }
    }
  }

  // 8. The stapled ticket, once notarization has happened.
  if (expectNotarized) {
    const r = tryRun('/usr/bin/xcrun', ['stapler', 'validate', app]);
    if (r.status === 0) {
      pass('stapler validate (app)');
    } else if (stapleMode === 'inner') {
      warn(
        'stapler validate (app)',
        'no ticket in this copy — the archive was cut before the staple ' +
          '(post-hoc flow). Offline first launch from this artifact prompts; ' +
          'the inline notarization path staples before packaging.'
      );
    } else {
      fail('stapler validate (app)', r.output.trim().split('\n').pop());
    }
  }
}

function newestArtifact(suffix) {
  if (!existsSync(releaseDir)) return null;
  const candidates = readdirSync(releaseDir)
    .filter((f) => f.startsWith('Tortie-') && f.endsWith(suffix))
    .map((f) => join(releaseDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0] ?? null;
}

console.log(`verify-signed: ${expectNotarized ? 'release gate (notarized)' : 'signing gate'}`);
verifyApp(appPath, 'app');

if (checkArtifacts) {
  const zip = newestArtifact('.zip');
  if (zip) {
    const scratch = mkdtempSync(join(tmpdir(), 'tortie-verify-zip-'));
    try {
      run('/usr/bin/ditto', ['-x', '-k', zip, scratch]);
      const inner = readdirSync(scratch).find((f) => f.endsWith('.app'));
      if (inner) verifyApp(join(scratch, inner), `app inside ${basename(zip)}`, 'inner');
      else fail('zip contains an .app', zip);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  } else {
    fail('zip artifact present', 'no Tortie-*.zip under release/');
  }

  const dmg = newestArtifact('.dmg');
  if (dmg) {
    if (expectNotarized) {
      const r = tryRun('/usr/bin/xcrun', ['stapler', 'validate', dmg]);
      if (r.status === 0) pass(`stapler validate (${basename(dmg)})`);
      else fail(`stapler validate (${basename(dmg)})`, r.output.trim().split('\n').pop());
    }
    const mountRoot = mkdtempSync(join(tmpdir(), 'tortie-verify-dmg-'));
    let mounted = false;
    try {
      run('/usr/bin/hdiutil', ['attach', dmg, '-nobrowse', '-readonly', '-mountpoint', mountRoot]);
      mounted = true;
      const inner = readdirSync(mountRoot).find((f) => f.endsWith('.app'));
      if (inner) verifyApp(join(mountRoot, inner), `app on mounted ${basename(dmg)}`, 'inner');
      else fail('dmg contains an .app', dmg);
    } finally {
      if (mounted) tryRun('/usr/bin/hdiutil', ['detach', mountRoot, '-force']);
      rmSync(mountRoot, { recursive: true, force: true });
    }
  } else {
    fail('dmg artifact present', 'no Tortie-*.dmg under release/');
  }

  // Informational, not a failure here: the feed file the updater will need.
  const feed = join(releaseDir, 'latest-mac.yml');
  console.log(
    existsSync(feed)
      ? `\n  note: ${feed} present (updater feed, published with the artifacts)`
      : `\n  note: ${feed} MISSING — publish config absent at package time?`
  );
}

const wtail = warnings > 0 ? ` with ${warnings} warning(s)` : '';
console.log(failures === 0 ? `\nverify-signed: PASS${wtail}` : `\nverify-signed: FAIL (${failures})${wtail}`);
process.exit(failures === 0 ? 0 : 1);
