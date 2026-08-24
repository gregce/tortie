/**
 * assert-hermetic-checks.mjs, no check reaches the network for its runner,
 * and every check says what it needs (Phase 145 stage 5).
 *
 * ## Why this gate exists
 *
 * On 2026-08-24 the conformance gates were audited for runners that are not
 * in package-lock.json, and every one of them had one: 28 scripts under
 * build/ started their TypeScript probe with `npx tsx`, and tsx was not in
 * the lockfile. On a machine whose npx cache had never held tsx, a
 * conformance gate's first act was an npm registry request. That was measured
 * by pointing the registry at a closed local port and running
 * `node build/conformance-context.mjs` with an empty npm cache: it printed
 * `request to http://127.0.0.1:9/tsx failed` before checking anything. The
 * fix pinned tsx as an exact devDependency and routed every call through
 * `build/ts-runner.mjs`. This gate is what keeps both halves true.
 *
 * ## What it asserts, in about 0.1 seconds, spawning nothing
 *
 *  1. No file under build/ hands the npx program to a spawn, so no script can
 *     go back to resolving its runner outside the lockfile. Two files are
 *     allowed to carry the token: assert-electron-teardown.mjs matches it in
 *     a regex to catch `npx electron`, and ts-runner.mjs names it in prose to
 *     say why it is banned.
 *  2. tsx is pinned: package.json carries it as an EXACT devDependency and
 *     package-lock.json resolves it with an integrity hash.
 *  3. The classification in build/verification-checks.mjs is complete in both
 *     directions: every check script in package.json (the test, smoke, probe,
 *     conformance, gate, pin, assert and verify families) has exactly one
 *     entry, no entry names a script that does not exist, every entry's type
 *     is one of the five (or `aggregate` with members that are themselves
 *     entries), and every entry states a nonempty environment requirement and
 *     skip rule.
 *
 * Run it with `npm run gate:checks`. It also runs inside `npm run build`, so
 * nothing that builds can skip it.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS, CHECK_TYPES } from './verification-checks.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// 1. No spawn resolves its program through npx
// ---------------------------------------------------------------------------

// Built from parts so this gate's own source does not carry the token.
const NPX_TOKEN = new RegExp(`['"]np` + `x['"]`);
const ALLOWED_TO_NAME_NPX = new Set([
  'assert-electron-teardown.mjs', // matches it in a regex, to catch npx electron
  'ts-runner.mjs' // names it in prose, to say why it is banned
]);

const buildDir = join(repoRoot, 'build');
const buildScripts = readdirSync(buildDir).filter(
  (name) => name.endsWith('.mjs') || name.endsWith('.cjs')
);
for (const name of buildScripts) {
  if (ALLOWED_TO_NAME_NPX.has(name)) continue;
  const text = readFileSync(join(buildDir, name), 'utf8');
  if (NPX_TOKEN.test(text)) {
    fail(
      `build/${name} names the npx program. A check resolves its runner ` +
        `from the lockfile install through build/ts-runner.mjs, never ` +
        `through npx.`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. The TypeScript runner is pinned
// ---------------------------------------------------------------------------

const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const lock = JSON.parse(
  readFileSync(join(repoRoot, 'package-lock.json'), 'utf8')
);

const declared = pkg.devDependencies?.tsx;
if (typeof declared !== 'string') {
  fail('package.json does not carry tsx as a devDependency.');
} else if (!/^\d/.test(declared)) {
  fail(
    `package.json pins tsx as "${declared}"; the pin must be exact, with no ` +
      `range prefix, so every machine resolves the same runner.`
  );
}
const locked = lock.packages?.['node_modules/tsx'];
if (locked === undefined) {
  fail('package-lock.json does not resolve node_modules/tsx.');
} else if (
  typeof locked.resolved !== 'string' ||
  typeof locked.integrity !== 'string'
) {
  fail(
    'package-lock.json resolves tsx without a resolved url and integrity ' +
      'hash, so the install cannot be verified.'
  );
}

// ---------------------------------------------------------------------------
// 3. Every check is classified, and every classification names a check
// ---------------------------------------------------------------------------

const CHECK_FAMILY = /^(test|smoke|probe|conformance|gate|pin|assert|verify)(:|$)/;
const scriptNames = Object.keys(pkg.scripts ?? {});
const checkScripts = scriptNames.filter((name) => CHECK_FAMILY.test(name));

const byName = new Map();
for (const entry of CHECKS) {
  if (byName.has(entry.name)) fail(`duplicate entry for ${entry.name}`);
  byName.set(entry.name, entry);
}

for (const name of checkScripts) {
  if (!byName.has(name)) {
    fail(
      `the check script "${name}" has no entry in ` +
        `build/verification-checks.mjs. Classify it as one of the five types ` +
        `and state its environment requirement and skip rule.`
    );
  }
}
for (const entry of CHECKS) {
  if (!scriptNames.includes(entry.name)) {
    fail(
      `build/verification-checks.mjs names "${entry.name}", which is not a ` +
        `script in package.json. Remove the stale entry.`
    );
  }
  const typeOk =
    CHECK_TYPES.includes(entry.type) || entry.type === 'aggregate';
  if (!typeOk) fail(`"${entry.name}" has the unknown type "${entry.type}".`);
  if (entry.type === 'aggregate') {
    if (!Array.isArray(entry.members) || entry.members.length === 0) {
      fail(`the aggregate "${entry.name}" names no members.`);
    } else {
      for (const member of entry.members) {
        if (!byName.has(member)) {
          fail(
            `the aggregate "${entry.name}" names "${member}", which has no ` +
              `entry of its own.`
          );
        }
      }
    }
  }
  if (typeof entry.needs !== 'string' || entry.needs.trim() === '') {
    fail(`"${entry.name}" states no environment requirement.`);
  }
  if (typeof entry.skip !== 'string' || entry.skip.trim() === '') {
    fail(`"${entry.name}" states no skip rule.`);
  }
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  process.stderr.write('assert-hermetic-checks: FAIL\n\n');
  for (const message of failures) process.stderr.write(`  - ${message}\n`);
  process.exit(1);
}

const counts = new Map();
for (const entry of CHECKS) {
  counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);
}
process.stdout.write(
  `assert-hermetic-checks: PASS. ${checkScripts.length} check scripts ` +
    `classified, no runner outside the lockfile.\n`
);
for (const type of [...CHECK_TYPES, 'aggregate']) {
  const n = counts.get(type) ?? 0;
  if (n > 0) process.stdout.write(`  ${String(n).padStart(3)}  ${type}\n`);
}
