#!/usr/bin/env node
/**
 * notarize-local.mjs — submit an already-built release to Apple, wait, staple
 * (Phase 27).
 *
 * The credential is the notarytool KEYCHAIN PROFILE "tortie-notary"
 * (created once with `xcrun notarytool store-credentials`). No password is
 * ever read, stored or printed by this script. In CI the release lane may
 * export APPLE_ID + APPLE_TEAM_ID + APPLE_APP_PWD instead (the deadreckon
 * pattern, the same five GitHub secrets); when all three are present they are
 * used, passed as argv to notarytool and never echoed.
 *
 * WHAT IT DOES, in order:
 *   1. refuses to upload anything that is not really signed (an ad-hoc or
 *      unsigned build would come back Invalid after a pointless upload);
 *   2. `xcrun notarytool submit <dmg> --wait` — the DMG covers every nested
 *      cdhash inside it, including the app and its nested binaries, so ONE
 *      submission covers the whole release;
 *   3. on any status but Accepted, fetches `notarytool log` (the issue list)
 *      and exits nonzero;
 *   4. staples the ticket to the DMG and to the loose .app, then validates
 *      both staples.
 *
 * WHAT IT DOES NOT DO, stated so nobody trips on it:
 *   - The ZIP is not stapled — a ZIP cannot carry a ticket. The app inside it
 *     shares the notarized cdhash, and electron-updater downloads carry no
 *     quarantine, so this costs nothing for updates (research 27 section 5).
 *   - The app INSIDE the already-built DMG is the pre-staple copy. Gatekeeper
 *     resolves it through the DMG's own stapled ticket, and online through
 *     Apple's ticket lookup. If a fully stapled-before-packaging release is
 *     wanted (it is, for the real release lane), run the INLINE path instead:
 *     `APPLE_KEYCHAIN_PROFILE=tortie-notary npm run package` — electron-builder
 *     then notarizes and staples the .app BETWEEN signing and DMG/ZIP
 *     creation, the order research 27 section 6.3 requires. This script is
 *     the post-hoc path for a release/ that already exists.
 *
 * Usage:
 *   node build/notarize-local.mjs [dmg-path] [--app <app-path>] [--profile <name>]
 *
 * Defaults: newest release/Tortie-*-arm64.dmg, release/mac-arm64/Tortie.app,
 * profile "tortie-notary" (override with --profile or TORTIE_NOTARY_PROFILE).
 * Afterwards, run the full gate:
 *   node build/verify-signed.mjs --expect-notarized --artifacts
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const releaseDir = join(process.cwd(), 'release');
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1]?.startsWith('--') !== true);

const dmg =
  positional.find((p) => p.endsWith('.dmg')) ??
  (existsSync(releaseDir)
    ? readdirSync(releaseDir)
        .filter((f) => f.startsWith('Tortie-') && f.endsWith('.dmg'))
        .map((f) => join(releaseDir, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
    : undefined);
const app = flagValue('--app') ?? join(releaseDir, 'mac-arm64', 'Tortie.app');
const profile = flagValue('--profile') ?? process.env.TORTIE_NOTARY_PROFILE ?? 'tortie-notary';

if (!dmg || !existsSync(dmg)) {
  console.error('notarize-local: no DMG found. Run `npm run package` first, or pass a path.');
  process.exit(1);
}

/**
 * Credential argv for notarytool. Keychain profile by default; the three CI
 * env vars when all are present. The values go straight into argv (no shell),
 * and nothing below ever prints them.
 */
function credentialArgs() {
  const { APPLE_ID, APPLE_TEAM_ID, APPLE_APP_PWD } = process.env;
  if (APPLE_ID && APPLE_TEAM_ID && APPLE_APP_PWD) {
    console.log('credentials: Apple ID from env (CI mode)');
    return ['--apple-id', APPLE_ID, '--team-id', APPLE_TEAM_ID, '--password', APPLE_APP_PWD];
  }
  console.log(`credentials: keychain profile "${profile}"`);
  return ['--keychain-profile', profile];
}

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

// 1. Refuse to upload a build that is not really signed. codesign -dvv
// writes its details to stderr, so capture both streams merged.
{
  const r = spawnSync('/usr/bin/codesign', ['-dvv', app], { encoding: 'utf8' });
  const details = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const team = (details.match(/TeamIdentifier=(\S+)/) ?? [])[1];
  if (r.status !== 0 || !team || team === 'not set') {
    console.error(
      `notarize-local: refusing to upload — the app is not Developer ID signed.\n${details}`
    );
    process.exit(1);
  }
  console.log(`preflight: ${app} signed by team ${team}`);
}

const creds = credentialArgs();

// 2. Submit and wait.
console.log(`submitting: ${dmg}`);
let submission;
try {
  const out = run('/usr/bin/xcrun', [
    'notarytool',
    'submit',
    dmg,
    ...creds,
    '--wait',
    '--timeout',
    '30m',
    '--output-format',
    'json'
  ]);
  submission = JSON.parse(out);
} catch (error) {
  console.error('notarize-local: notarytool submit failed.');
  console.error(String(error.stdout ?? ''));
  console.error(String(error.stderr ?? ''));
  process.exit(1);
}
console.log(`submission ${submission.id}: ${submission.status}`);

// 3. Anything but Accepted: fetch the issue log and stop.
if (submission.status !== 'Accepted') {
  try {
    const log = run('/usr/bin/xcrun', ['notarytool', 'log', submission.id, ...creds]);
    console.error(log);
  } catch (error) {
    console.error(`notarize-local: could not fetch the notarization log: ${error.message}`);
  }
  process.exit(1);
}

// 4. Staple and validate.
for (const target of [dmg, app]) {
  if (!existsSync(target)) continue;
  run('/usr/bin/xcrun', ['stapler', 'staple', target], { stdio: 'inherit' });
  run('/usr/bin/xcrun', ['stapler', 'validate', target], { stdio: 'inherit' });
  console.log(`stapled: ${target}`);
}

console.log('\nnotarize-local: done. The ZIP is intentionally not stapled (a ZIP cannot');
console.log('carry a ticket; the app inside it shares the notarized cdhash). Now run:');
console.log('  node build/verify-signed.mjs --expect-notarized --artifacts');
