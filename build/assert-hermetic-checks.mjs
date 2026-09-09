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
 *  4. Every script that CALLS `tsxCli()` imports it where it is called, and
 *     not inside a driver template it writes out as a string. Eighteen probes
 *     carried exactly that: the import sat inside the `String.raw` block each
 *     one writes into its scratch directory as a `.ts` driver, where nothing
 *     used it and where `./ts-runner.mjs` would not have resolved anyway, and
 *     the probe's own module never had it. Every one of them started its
 *     scratch sshd, its scratch tmux server and its Electron, and then died on
 *     `ReferenceError: tsxCli is not defined` at the first `drive()`. It was
 *     invisible because a probe is not in any commit battery, so nothing ran
 *     them, and the two the Phase 242.1 verifier reached had been dead since
 *     long before that phase.
 *  3. The classification in build/verification-checks.mjs is complete in both
 *     directions: every check script in package.json (the test, smoke, probe,
 *     conformance, gate, pin, assert and verify families) has exactly one
 *     entry, no entry names a script that does not exist, every entry's type
 *     is one of the five (or `aggregate` with members that are themselves
 *     entries), and every entry states a nonempty environment requirement and
 *     skip rule.
 *  5. NO TEST SOURCE UNDER src/ RESOLVES A HOME DIRECTORY THROUGH THE PASSWD
 *     ENTRY (Phase 244, audit finding F5). `os.userInfo().homedir` reads the
 *     passwd record and does NOT honour `HOME`, so a test that has just built
 *     a scratch home reaches straight past it into the real person's home; the
 *     8 September audit found exactly that in install-roundtrip.test.ts, whose
 *     verdict was then decided by whether this machine let it read
 *     `/Users/<person>/.Trash`. `os.homedir()` honours `HOME` and is what the
 *     product itself uses everywhere, so it is not scanned for. The scanner is
 *     proved on the fixtures below, because a scan that cannot fail is not a
 *     scan that passed.
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
// 4. A script that calls the runner imports it where it is called
// ---------------------------------------------------------------------------

// The question is asked of the MODULE and not of the file, so an import that
// sits inside a driver template written out as a string does not count. The
// templates all open with `String.raw` and a backtick, and no script under
// build/ has a top level import below one, so the first of those is the line
// everything after belongs to the driver rather than to the module.
const RUNNER_IMPORT = "import { tsxCli } from './ts-runner.mjs';";
const RUNNER_DYNAMIC = "await import('./ts-runner.mjs')";
const TEMPLATE_OPEN = 'String.raw`';

/** Proved on fixtures below: does this text import the runner into ITS module? */
const importsRunnerAtModuleLevel = (text) => {
  const template = text.indexOf(TEMPLATE_OPEN);
  const wall = template < 0 ? text.length : template;
  const head = text.slice(0, wall);
  return head.includes(RUNNER_IMPORT) || head.includes(RUNNER_DYNAMIC);
};

let runnerCallers = 0;
// This gate's own file is skipped for the reason its fixtures exist: they are
// deliberately wrong texts written as string literals, and the reader is proved
// on those rather than on this file.
const RULE_4_SELF = 'assert-hermetic-checks.mjs';
for (const name of buildScripts) {
  if (name === 'ts-runner.mjs' || name === RULE_4_SELF) continue;
  const text = readFileSync(join(buildDir, name), 'utf8');
  if (!text.includes('tsxCli(')) continue;
  runnerCallers += 1;
  if (importsRunnerAtModuleLevel(text)) continue;
  fail(
    `build/${name} calls tsxCli() and does not import it into its own ` +
      `module. An import inside a driver template is written out as part of ` +
      `a .ts file in a scratch directory, where it neither resolves nor runs, ` +
      `and the probe dies on ReferenceError at its first drive() with its ` +
      `sshd, its tmux server and its Electron already started.`
  );
}

/**
 * Measured on 2026-09-09 with the sixteen misplaced imports moved, at 42, and
 * raised to 43 when this phase was rebased onto Phase 242.2, whose
 * `build/probe-p242-2-image.mjs` is the forty third caller, and to 44 by
 * Phase 247, whose `build/conformance-pathdoors.mjs` is the forty fourth. The
 * floor is
 * raised in the commit that brings a caller in for the same reason
 * `HELPER_USER_FLOOR` is: adding one can never turn this rule red, so a floor
 * left behind is a floor that would let the new probe be deleted again in
 * silence.
 */
const RUNNER_CALLER_FLOOR = 44;
if (runnerCallers < RUNNER_CALLER_FLOOR) {
  fail(
    `${String(runnerCallers)} script(s) under build/ call tsxCli() against a ` +
      `floor of ${String(RUNNER_CALLER_FLOOR)}. A deliberate deletion lowers ` +
      `the floor in the same commit and names the file.`
  );
}

// The reader, proved on four texts so a scan that cannot fail is never taken
// for a scan that passed. Two must read as imported and two must not.
const RUNNER_FIXTURES = [
  { why: 'the ordinary shape', text: `${RUNNER_IMPORT}\ntsxCli();\n`, want: true },
  {
    why: 'the dynamic shape probe-p208-vault.mjs uses',
    text: `const { tsxCli } = ${RUNNER_DYNAMIC};\ntsxCli();\n`,
    want: true
  },
  {
    why: 'the shape eighteen probes shipped, the import inside the template',
    text: `const t = ${TEMPLATE_OPEN}\n${RUNNER_IMPORT}\n\`;\ntsxCli();\n`,
    want: false
  },
  { why: 'no import at all', text: 'tsxCli();\n', want: false }
];
for (const one of RUNNER_FIXTURES) {
  if (importsRunnerAtModuleLevel(one.text) === one.want) continue;
  fail(
    `rule 4's reader got "${one.why}" wrong. It answered ` +
      `${String(!one.want)}.`
  );
}

// ---------------------------------------------------------------------------
// 5. No test under src/ reads the passwd entry's home
// ---------------------------------------------------------------------------

// Built from parts so this gate's own source does not carry the token, the way
// rule 1 keeps the npx token out of its own text.
const PASSWD_HOME_TOKEN = new RegExp(`\\buser` + `Info\\s*\\(`);
const TEST_FILE = /\.(test|spec)\.(ts|tsx)$/;

/**
 * The file's CODE, with comments and string bodies blanked out. The rule is
 * about what a test RUNS, and the file that motivated it now explains the
 * hazard in its own header; a scanner that read prose would refuse the
 * explanation of the thing it forbids. String bodies go too, so a fixture list
 * or an error message quoting the call is not a call.
 */
function codeOnly(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') i += 1;
        i += 1;
      }
      i += 1;
      out += quote + quote;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Every file under `dir`, recursively, without following symlinks. */
function filesUnder(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

/** The rule, isolated so the fixtures below can drive it. */
function readsPasswdHome(text) {
  return PASSWD_HOME_TOKEN.test(codeOnly(text));
}

// The fixtures. Seven texts, three of which must be caught, so neither a regex
// that stopped matching nor a comment stripper that ate the whole file can be
// mistaken for a clean tree. The token is spelled from parts everywhere here
// for the same reason rule 1 does it.
const U = 'user' + 'Info';
const HOME_FIXTURES = [
  {
    name: 'the shape the audit found',
    caught: true,
    text: `import { ${U} } from 'node:os';\nconst t = join(${U}().homedir, '.Trash');\n`
  },
  { name: 'spaced call', caught: true, text: `const h = os.${U} ().homedir;\n` },
  {
    name: 'reached through a namespace import',
    caught: true,
    text: `import * as os from 'node:os';\nconst who = os.${U}().username;\n`
  },
  {
    name: 'the honouring reader is left alone',
    caught: false,
    text: "import { homedir } from 'node:os';\nconst h = homedir();\n"
  },
  { name: 'a line comment is left alone', caught: false, text: `// ${U}() is the passwd entry\n` },
  { name: 'a block comment is left alone', caught: false, text: `/**\n * ${U}().homedir ignores HOME.\n */\nconst h = homedir();\n` },
  { name: 'a quoted string is left alone', caught: false, text: `const message = 'do not call ${U}() here';\n` }
];
for (const fixture of HOME_FIXTURES) {
  if (readsPasswdHome(fixture.text) !== fixture.caught) {
    fail(
      `the passwd-home scanner is broken: the fixture "${fixture.name}" ` +
        `should have been ${fixture.caught ? 'caught' : 'left alone'} and was not.`
    );
  }
}

const srcDir = join(repoRoot, 'src');
let testFilesScanned = 0;
for (const path of filesUnder(srcDir)) {
  if (!TEST_FILE.test(path)) continue;
  testFilesScanned += 1;
  if (readsPasswdHome(readFileSync(path, 'utf8'))) {
    fail(
      `${path.slice(repoRoot.length + 1)} resolves a home directory through ` +
        `the passwd entry. That reader ignores HOME, so the test observes the ` +
        `real person's home whatever scratch environment it built, and its ` +
        `verdict becomes the host's. Use os.homedir(), which honours HOME, or ` +
        `own the directory the test asserts against.`
    );
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
    `classified, no runner outside the lockfile, ` +
    `${String(runnerCallers)} script(s) that call tsxCli() import it into ` +
    `their own module against a floor of ${String(RUNNER_CALLER_FLOOR)}, ` +
    `with 4 of 4 reader fixtures behaving, and ${testFilesScanned} test ` +
    `files reach no home past HOME (${HOME_FIXTURES.length} scanner fixtures, ` +
    `${HOME_FIXTURES.filter((f) => f.caught).length} of which must be caught).\n`
);
for (const type of [...CHECK_TYPES, 'aggregate']) {
  const n = counts.get(type) ?? 0;
  if (n > 0) process.stdout.write(`  ${String(n).padStart(3)}  ${type}\n`);
}
