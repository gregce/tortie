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
 * ## What it asserts, in under a second, spawning nothing
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
 *     is one of the six (or `aggregate` with members that are themselves
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
 *  6. THE RUNTIME RANGE IS ONE RANGE, SAID IN THREE FILES (Phase 262). The
 *     TypeScript checks run on whatever `node` npm found first on PATH, and
 *     below a measured floor tsx installs an async ESM hook and a separate CJS
 *     path instead of one synchronous `module.registerHooks()` loader, so
 *     `import` and `require` reach two instances of every module and two
 *     copies of every module-level Map. A check then passes or fails for the
 *     wrong reason. This clause asserts, statically: that
 *     build/verification-checks.mjs still exports `SUPPORTED_NODE`,
 *     `nodeIsSupported` and `assertSupportedRuntime`; that
 *     build/ts-runner.mjs still calls the preflight INSIDE `tsxCli()`, which
 *     is the one place every TypeScript check resolves its runner; that
 *     package.json's `engines.node` names the same floors as the table; and
 *     that `.nvmrc` holds one bare version the table admits, because every CI
 *     lane reads that file through .github/actions/setup. Its three readers
 *     are proved on fixtures, for the same reason rules 4 and 5 prove theirs.
 *
 *  7. THE SIXTH TYPE REFUSES OUT LOUD (Phase 316.2). "Xcode harness" is
 *     the one type a CI runner cannot run, so every entry of it says out loud
 *     that it cannot run. Every entry of it states exactly `XCODE_SKIP`, and the
 *     script its package.json line runs imports build/simulator-run.mjs, calls
 *     its preflight `simulatorHarnessMissing(` and exits 2: a sentence naming
 *     what is absent, never a green line. The reader is proved on four texts.
 *     Its Go half (Phase 316.3, `vendor:tailscalekit`, with its own skip rule
 *     `GO_SKIP`) left with TailscaleKit in Phase 330.
 *
 *  8. NOTHING UNDER build/ RUNS GO (Phase 330). From Phase 316.3 this clause
 *     required every Go-running script to set seven variables, because with
 *     `GOTELEMETRY=off` exported cmd/go still wrote telemetry into `HOME`
 *     (build/p316/SPEC.md §3.7). Phase 330 deleted the one script that ran
 *     Go, and a clause asking seven questions of no script at all would pass
 *     on nothing. So the clause is now a ceiling of zero, green by
 *     construction: its reader is proved on fixtures to find Go where Go is,
 *     and any script it finds fails here. A round that brings Go back
 *     restores the seven settings and their fixtures from git history
 *     (build/assert-hermetic-checks.mjs at 217f47e5) in the same commit.
 *
 *  9. A GATE AN ABLATION HARNESS READS THROUGH A PIPE FINISHES ITS WRITES, OR
 *     WAS MEASURED UNDER THE PIPE (Phase 361.1). A spawnSync pipe holds 65,000
 *     to 65,536 bytes unread. A gate that writes more and then calls
 *     process.exit loses the rest whenever its reader is behind, which is how
 *     ablation:p313 read 14 arms as red on nothing. Every gate a file behind
 *     ablation:* names either reaches process.exit only inside a copy of
 *     conformance-pocket.mjs's exitWhenWritten, which exits once stdout and
 *     stderr have both handed on every byte, or has a measured row of at most
 *     49,152 bytes. The helper is compared byte for byte, because one that
 *     exits on its first callback loses stdout. It reads no output, so a
 *     measured gate that grows is not seen until its row is measured again.
 *
 * Run it with `npm run gate:checks`. It also runs inside `npm run build`, so
 * nothing that builds can skip it.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS, CHECK_TYPES, XCODE_HARNESS, XCODE_SKIP } from './verification-checks.mjs';
// The namespace too, so clause 6 can say which export is missing rather
// than dying on a named import before it prints anything.
import * as verificationChecks from './verification-checks.mjs';

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
        `build/verification-checks.mjs. Classify it as one of the six types ` +
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
 * Phase 247, whose `build/conformance-pathdoors.mjs` is the forty fourth. It
 * was read at 47 when Phase 262 arrived — three callers had come in without
 * the floor following them — and was raised to 48 there, whose
 * `build/conformance-runtime.mjs` is the forty eighth. It read 49 when Phase
 * 276 arrived, so ONE more caller had come in without the floor following it,
 * and is raised to 50 here, whose `build/conformance-shellenv.mjs` is the
 * fiftieth. Phase 314 raises it to 51, whose `build/conformance-push.mjs` is
 * the fifty first, and Phase 342 to 52, whose `build/p342/measure-p342.mjs`
 * is the fifty second. Phase 333.11 raises it to 53, whose
 * `build/assert-door-only-adds.mjs` is the fifty third, and Phase 346's
 * ruled round to 54, whose `build/scratch-login.mjs` is the fifty fourth. The floor is
 * raised in the commit that brings a caller in for the same reason
 * `HELPER_USER_FLOOR` is: adding one can never turn this rule red, so a floor
 * left behind is a floor that would let the new probe be deleted again in
 * silence.
 */
const RUNNER_CALLER_FLOOR = 54;
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
// 6. One runtime range, said once, and the preflight that refuses below it
// ---------------------------------------------------------------------------

const runtimeExports = {
  SUPPORTED_NODE: 'object',
  nodeIsSupported: 'function',
  assertSupportedRuntime: 'function'
};
let runtimeTableReadable = true;
for (const [name, kind] of Object.entries(runtimeExports)) {
  if (typeof verificationChecks[name] === kind) continue;
  runtimeTableReadable = false;
  fail(
    `build/verification-checks.mjs does not export ${name}. The runtime the ` +
      `checks may run on is declared there and nowhere else, and ` +
      `build/ts-runner.mjs refuses through it.`
  );
}

// 6a. The preflight is called where every TypeScript check passes through.
// `tsxCli()` is the one place a check resolves its runner, so the question is
// asked of that function's body and not of the file: a call anywhere else in
// build/ts-runner.mjs would not be reached by the 40-odd probes that import it.
const RUNNER_PATH = join(buildDir, 'ts-runner.mjs');
const PREFLIGHT_CALL = 'assertSupportedRuntime(';

/** The body of `function <name>(...)` in `text`, brace matched, or null. */
function functionBody(text, name) {
  const code = codeOnly(text);
  const at = code.indexOf(`function ${name}(`);
  if (at < 0) return null;
  const open = code.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return null;
}

const runnerText = readFileSync(RUNNER_PATH, 'utf8');
const tsxCliBody = functionBody(runnerText, 'tsxCli');
if (tsxCliBody === null) {
  fail(
    'build/ts-runner.mjs no longer declares tsxCli(), so this gate cannot ' +
      'see whether the runtime preflight is still reached.'
  );
} else if (!tsxCliBody.includes(PREFLIGHT_CALL)) {
  fail(
    `build/ts-runner.mjs does not call assertSupportedRuntime() inside ` +
      `tsxCli(). Without it a TypeScript check runs on a Node where the ` +
      `runner loads two copies of every module: a registration made through ` +
      `one is invisible to the other, so the check passes or fails for the ` +
      `wrong reason, and it does so after the probe has already spent its ` +
      `minutes.`
  );
}

// The body reader, proved on three texts, so a reader that stopped finding
// anything is never mistaken for a preflight that is still there.
const BODY_FIXTURES = [
  { why: 'the shipping shape', text: 'export function tsxCli() {\n  assertSupportedRuntime();\n}\n', want: true },
  { why: 'the call moved out of the function', text: 'assertSupportedRuntime();\nexport function tsxCli() {\n  return 1;\n}\n', want: false },
  { why: 'the call left only in prose', text: '// assertSupportedRuntime() used to be here\nexport function tsxCli() {\n  return 1;\n}\n', want: false }
];
for (const one of BODY_FIXTURES) {
  const body = functionBody(one.text, 'tsxCli');
  const found = body !== null && body.includes(PREFLIGHT_CALL);
  if (found === one.want) continue;
  fail(
    `clause 6's body reader got "${one.why}" wrong. It answered ` +
      `${String(found)}.`
  );
}

// 6b. package.json's engines.node says the same thing as the table.
// npm's language and the table are two spellings of one range, and the point
// of this clause is that neither can move without the other.

/** The comparator floors of a `^a.b.c || ... || >=x.y.z` string, or null. */
function enginesFloors(spec) {
  const parts = String(spec)
    .split('||')
    .map((one) => one.trim())
    .filter((one) => one !== '');
  if (parts.length === 0) return null;
  const floors = [];
  for (let i = 0; i < parts.length; i += 1) {
    const match = /^(\^|>=)(\d+)\.(\d+)\.(\d+)$/.exec(parts[i]);
    if (match === null) return null;
    // Only the last line is open ended; a caret line is closed at its major.
    if ((match[1] === '>=') !== (i === parts.length - 1)) return null;
    floors.push([Number(match[2]), Number(match[3]), Number(match[4])]);
  }
  return floors;
}

const declaredRange = pkg.engines?.node;
if (typeof declaredRange !== 'string' || declaredRange.trim() === '') {
  fail(
    'package.json declares no engines.node. The runtime range is declared ' +
      'there and in build/verification-checks.mjs, and this gate is what ' +
      'keeps the two the same range.'
  );
} else if (runtimeTableReadable) {
  const floors = enginesFloors(declaredRange);
  if (floors === null) {
    fail(
      `package.json's engines.node reads "${declaredRange}", which this ` +
        `gate's matcher cannot read. It understands ` +
        `"^a.b.c || ... || >=x.y.z" only, with exactly one open ended line ` +
        `last. Widen the matcher deliberately rather than leaving the ` +
        `agreement unchecked.`
    );
  } else if (
    JSON.stringify(floors) !== JSON.stringify(verificationChecks.SUPPORTED_NODE)
  ) {
    fail(
      `package.json's engines.node reads "${declaredRange}", and ` +
        `build/verification-checks.mjs's SUPPORTED_NODE reads ` +
        `${JSON.stringify(verificationChecks.SUPPORTED_NODE)}. They are one ` +
        `range in two languages and they disagree. The table is tsx's own ` +
        `and is the measurement; change engines to match it, or re-measure ` +
        `with npm run conformance:runtime.`
    );
  }
}

// The matcher, proved on four strings, two of which must be refused.
const RANGE_FIXTURES = [
  { why: 'the shipping string', text: '^22.22.3 || ^24.11.1 || ^25.1.0 || >=26.0.0', want: '[[22,22,3],[24,11,1],[25,1,0],[26,0,0]]' },
  { why: 'a single open ended line', text: '>=22.0.0', want: '[[22,0,0]]' },
  { why: 'an open ended line that is not last', text: '>=22.0.0 || ^24.11.1', want: null },
  { why: 'a range npm allows and this matcher must refuse rather than pass', text: '>=22.22.3 <23', want: null }
];
for (const one of RANGE_FIXTURES) {
  const got = enginesFloors(one.text);
  const seen = got === null ? null : JSON.stringify(got);
  if (seen === one.want) continue;
  fail(
    `clause 6's engines matcher got "${one.why}" wrong. It answered ` +
      `${String(seen)}.`
  );
}

// 6c. .nvmrc names a version inside the range.
// This is the clause that binds the three files: every CI lane reaches
// actions/setup-node through .github/actions/setup, which reads this file, so
// a version outside the range would send every lane to a runtime the checks
// refuse — and it would do it silently, because nothing else compares them.
let nvmrcVersion = null;
try {
  const raw = readFileSync(join(repoRoot, '.nvmrc'), 'utf8');
  const lines = raw.split('\n');
  const body = lines.filter((line) => line.trim() !== '');
  if (body.length !== 1) {
    fail(
      `.nvmrc holds ${String(body.length)} non-empty lines. It holds exactly ` +
        `one, the bare version, because it has no comment syntax every ` +
        `consumer honours.`
    );
  } else {
    nvmrcVersion = body[0].trim();
    if (nvmrcVersion !== body[0]) {
      fail(`.nvmrc's line is "${body[0]}"; it carries surrounding whitespace.`);
    }
    if (/^v/.test(nvmrcVersion)) {
      fail(
        `.nvmrc reads "${nvmrcVersion}". Write the bare version with no v ` +
          `prefix; a prefix is a routine cause of a silent CI fallback to the ` +
          `runner image's own Node.`
      );
    }
  }
} catch {
  fail(
    '.nvmrc is missing. It names the one version this repository develops ' +
      'against, every CI lane reads it through .github/actions/setup, and ' +
      'without it the lanes run on whatever Node the runner image ships.'
  );
}
if (nvmrcVersion !== null && runtimeTableReadable) {
  if (!verificationChecks.nodeIsSupported(nvmrcVersion)) {
    fail(
      `.nvmrc names ${nvmrcVersion}, which is outside ` +
        `${verificationChecks.supportedNodeRange()}. Every CI lane reads that ` +
        `file, so every lane would run on a Node the TypeScript checks refuse.`
    );
  }
}

// ---------------------------------------------------------------------------
// 7. The sixth type refuses with a sentence, and never passes quietly
// ---------------------------------------------------------------------------

/** The script file a package.json line runs with `node`, or null. */
function scriptFileOf(line) {
  const m = /(?:^|&&\s*|\s)node\s+(build\/[^\s'"]+\.mjs)\b/.exec(String(line ?? ''));
  return m === null ? null : m[1];
}

/**
 * Proved on fixtures below: does this script refuse by name when Xcode is
 * absent? The FIRST exit after the preflight's call must be exit 2, so an exit
 * 2 elsewhere in the file cannot stand in for the one the preflight takes.
 */
function refusesWhenAbsent(text) {
  const code = codeOnly(text);
  if (!/from\s+['"](?:\.\.?\/)+simulator-run\.mjs['"]/.test(text)) return false;
  const at = code.search(/\bsimulatorHarnessMissing\s*\(/);
  if (at === -1) return false;
  const next = /\bprocess\.exit\s*\(\s*(\d+)\s*\)/.exec(code.slice(at));
  return next !== null && next[1] === '2';
}

const XCODE_FIXTURES = [
  {
    why: 'the shipping shape',
    text: "import { simulatorHarnessMissing } from '../simulator-run.mjs';\nconst why = simulatorHarnessMissing();\nif (why !== null) { console.error(why); process.exit(2); }\n",
    want: true
  },
  {
    why: 'a script that exits 0 when Xcode is absent',
    text: "import { simulatorHarnessMissing } from '../simulator-run.mjs';\nif (simulatorHarnessMissing() !== null) process.exit(0);\n",
    want: false
  },
  {
    why: 'an exit 2 elsewhere standing in for the preflight, which exits 0',
    text: "import { simulatorHarnessMissing } from '../simulator-run.mjs';\nif (simulatorHarnessMissing() !== null) process.exit(0);\nif (badScratch) process.exit(2);\n",
    want: false
  },
  {
    why: 'the preflight named only in prose',
    text: "import { withSimulator } from '../simulator-run.mjs';\n// simulatorHarnessMissing() would say what is absent\nprocess.exit(2);\n",
    want: false
  }
];
for (const one of XCODE_FIXTURES) {
  if (refusesWhenAbsent(one.text) === one.want) continue;
  fail(`clause 7's reader got "${one.why}" wrong. It answered ${String(!one.want)}.`);
}

let xcodeEntries = 0;
for (const entry of CHECKS) {
  if (entry.type !== XCODE_HARNESS) continue;
  xcodeEntries += 1;
  if (entry.skip !== XCODE_SKIP) {
    fail(
      `"${entry.name}" is an ${XCODE_HARNESS} and states the skip rule ` +
        `"${entry.skip}". Every entry of that type states XCODE_SKIP: it ` +
        `refuses with a sentence naming what is absent and never passes quietly.`
    );
  }
  const file = scriptFileOf(pkg.scripts?.[entry.name]);
  if (file === null) {
    fail(`"${entry.name}" runs no build/*.mjs script this gate can read, so nothing proves it refuses when Xcode is absent.`);
    continue;
  }
  let text = '';
  try {
    text = readFileSync(join(repoRoot, file), 'utf8');
  } catch {
    fail(`"${entry.name}" runs ${file}, which does not exist.`);
    continue;
  }
  if (!refusesWhenAbsent(text)) {
    fail(
      `${file} ("${entry.name}") does not import build/simulator-run.mjs, call ` +
        `simulatorHarnessMissing() and exit 2 with its sentence. On a machine ` +
        `with no Xcode it would pass or fail for a reason nobody named.`
    );
  }
}

// ---------------------------------------------------------------------------
// 8. Nothing under build/ runs Go
// ---------------------------------------------------------------------------

// Built from parts, so this file's own text is never read as a Go script.
const TOOLCHAIN_VAR = 'GO' + 'TOOLCHAIN';

/** A script's text with its comments removed and its strings kept. */
function withoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|(^|[^:\\'"`])\/\/[^\n]*/g, (m, lead) => (m.startsWith('/*') ? '' : lead ?? ''));
}

/** Does this script run Go? It names the toolchain variable in code, hands `go` to a spawn, or runs `ios-fat`. */
function runsGo(text) {
  const kept = withoutComments(text);
  return new RegExp(`\\b${TOOLCHAIN_VAR}\\b`).test(codeOnly(text)) || /['"]go['"]\s*,\s*\[/.test(kept) || /['"]ios-fat['"]/.test(kept);
}

const GO_FIXTURES = [
  { why: 'the Phase 316.3 vendoring shape', text: `env.${TOOLCHAIN_VAR} = 'local';\nspawnSync('go', ['version'], { env });\n`, goes: true },
  { why: 'go handed to a spawn', text: "spawnSync('go', ['build']);\n", goes: true },
  { why: 'make ios-fat', text: "spawnSync('make', ['ios-fat'], { env });\n", goes: true },
  { why: 'a script that runs no Go', text: "spawnSync('git', ['status']);\n", goes: false },
  { why: 'Go named only in a comment', text: `// ${TOOLCHAIN_VAR}=local would be set here\nconst x = 1;\n`, goes: false }
];
for (const one of GO_FIXTURES) {
  if (runsGo(one.text) === one.goes) continue;
  fail(`clause 8's reader got "${one.why}" wrong: it read runs-go ${String(!one.goes)}.`);
}

/** Every script under build/, recursively, never entering build/vendor/ or a node_modules. */
function buildScriptsDeep(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      if (path === join(buildDir, 'vendor') || e.name === 'node_modules') continue;
      out.push(...buildScriptsDeep(path));
    } else if (/\.(mjs|cjs|mts|js)$/.test(e.name)) out.push(path);
  }
  return out;
}

const RULE_8_SELF = join(buildDir, 'assert-hermetic-checks.mjs');
let goRead = 0;
for (const path of buildScriptsDeep(buildDir)) {
  if (path === RULE_8_SELF) continue;
  goRead += 1;
  if (!runsGo(readFileSync(path, 'utf8'))) continue;
  const rel = path.slice(repoRoot.length + 1).split('\\').join('/');
  fail(
    `${rel} runs Go. Nothing under build/ has run Go since Phase 330 deleted ` +
      `the TailscaleKit vendoring. A script that brings Go back restores clause ` +
      `8's seven settings (HOME, GOPATH, GOMODCACHE and GOCACHE under a directory ` +
      `the script owns, ${TOOLCHAIN_VAR}=local, GOTELEMETRY=off, GOFLAGS=-modcacherw) ` +
      `and its classification in the same commit.`
  );
}

// ---------------------------------------------------------------------------
// 9. A gate an ablation harness reads through a pipe finishes its writes, or
//    was measured under the pipe
// ---------------------------------------------------------------------------

// A spawnSync pipe holds 65,000 to 65,536 bytes unread, by write size
// (build/p3611/SPEC.md §2.2). A quarter is kept back for an arm that reddens
// several rules and for growth between measurements.
const PIPE_HOLDS_BYTES = 65_536;
const PIPE_MARGIN_BYTES = 16_384;
const PIPE_CEILING_BYTES = PIPE_HOLDS_BYTES - PIPE_MARGIN_BYTES;
const PIPED_HARNESS_FLOOR = 23;
const PIPED_GATE_FLOOR = 18;

// A row is the most bytes one run of the gate wrote, stdout and stderr together, under its harness.
const PIPED_MEASURED = [
  ['build/p313/hostile-client.mjs', 42_917, 'ablation:p313 A4s, 02739f4d'],
  ['build/conformance-machines.mjs', 38_890, 'green, direct, 02739f4d (red 38,790, ablation:p340 a010a, d87d414c)'],
  ['build/conformance-ios.mjs', 38_488, '--json green, direct, 02739f4d (red 38,369, ablation:p316 a1, d87d414c)'],
  ['build/p293/conformance-manager.mjs', 13_089, 'ablation:p293 arm 1, d87d414c'],
  ['build/conformance-agents.mjs', 10_600, 'ablation:p275 arm 0, d87d414c'],
  ['build/assert-door-only-adds.mjs', 7_836, 'ablation:p33311 F1, --json, d87d414c'],
  ['build/conformance-save.mjs', 5_988, 'ablation:p268, d87d414c'],
  ['build/conformance-push.mjs', 5_773, 'ablation:p314 H1, d87d414c'],
  ['build/conformance-handback.mjs', 4_867, 'ablation:p296 A1, d87d414c'],
  ['build/conformance-choices.mjs', 3_550, 'ablation:p312, d87d414c'],
  ['build/conformance-endtree.mjs', 2_570, 'ablation:p323 A1, --root, d87d414c'],
  ['build/p274/conformance-samefolder.mjs', 2_500, 'ablation:p274, P274_SOURCE_ONLY, d87d414c'],
  ['build/assert-known-hosts-scoped.mjs', 1_138, 'ablation:p307 R1, d87d414c'],
  ['build/assert-bundle-refusals.mjs', 806, 'green, direct, 02739f4d (named by ablation:p326, which copies it and runs it not)'],
  ['build/conformance-shellenv.mjs', 303, 'ablation:p276 R10, d87d414c'],
  ['build/conformance-farattach.mjs', 254, 'ablation:p326 A1, --json, d87d414c'],
  ['build/assert-background-teardown.mjs', 176, 'ablation:p307 R1, green only, d87d414c']
];

const withCommas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// The compiler is loaded here rather than imported at the top, so a missing
// install is a finding with a sentence rather than a crash before any output.
let ts = null;
try {
  ts = createRequire(import.meta.url)('typescript');
} catch (err) {
  fail(
    `clause 9 could not load typescript from the repository install ` +
      `(${err instanceof Error ? err.message : String(err)}), so no gate an ` +
      `ablation harness reads was checked.`
  );
}

const SK = ts?.SyntaxKind;
// A slash after one of these ends an operand, so it divides; after any other
// punctuation it opens a regular expression, and so it does after these words.
// After break, continue or debugger a slash can only be on the next line,
// where it begins a statement.
const OPERAND_ENDS = ts === null ? null : new Set([SK.CloseParenToken, SK.CloseBracketToken, SK.CloseBraceToken, SK.PlusPlusToken, SK.MinusMinusToken]);
const REGEX_AFTER = ts === null ? null : new Set([
  SK.ReturnKeyword, SK.TypeOfKeyword, SK.InstanceOfKeyword, SK.InKeyword, SK.OfKeyword, SK.NewKeyword, SK.DeleteKeyword,
  SK.VoidKeyword, SK.ThrowKeyword, SK.CaseKeyword, SK.DoKeyword, SK.ElseKeyword, SK.YieldKeyword, SK.AwaitKeyword,
  SK.ExtendsKeyword, SK.DefaultKeyword, SK.BreakKeyword, SK.ContinueKeyword, SK.DebuggerKeyword
]);

// After `)` a slash opens a regular expression only when the bracket closed
// the head of one of these, as in `if (x) /re/`; after any other `)` it divides.
const HEADS = ts === null ? null : new Set([SK.IfKeyword, SK.ForKeyword, SK.WhileKeyword, SK.WithKeyword]);
const TEXT_KINDS = ts === null ? null : new Set([SK.StringLiteral, SK.NoSubstitutionTemplateLiteral, SK.TemplateHead, SK.TemplateMiddle, SK.TemplateTail]);

/** Is a slash after a token of this kind the start of a regular expression? */
function slashOpensRegex(prev) {
  if (prev === null || prev === SK.TemplateHead || prev === SK.TemplateMiddle) return true;
  if (prev >= SK.FirstPunctuation && prev <= SK.LastPunctuation) return !OPERAND_ENDS.has(prev);
  return REGEX_AFTER.has(prev);
}

/**
 * Walks the tokens of `text`'s code with TypeScript's scanner, deciding each
 * slash and closing brace as the parser does: a `}` that closes a template
 * substitution continues the template, a slash after `)` opens a regular
 * expression only when the bracket closed one of HEADS, and a slash after a
 * word that follows . or ?. divides, because there the word is a name
 * (`it.new / 2`). Comments are trivia and never seen. `visit(kind, scanner,
 * prev)` is called per token. Answers whether the walk was exact: not when a
 * slash came after `}`, `of`, `++` or `--`, where only the grammar can say,
 * or the scanner met an error.
 */
function walkCode(text, visit) {
  let exact = true;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text, () => {
    exact = false;
  });
  const depths = []; // one brace depth per open template substitution
  const heads = []; // one flag per open `(`: did it open one of HEADS?
  let closedHead = false;
  let prev = null;
  let before = null;
  for (let kind = scanner.scan(); kind !== SK.EndOfFileToken; kind = scanner.scan()) {
    if (kind === SK.SlashToken || kind === SK.SlashEqualsToken) {
      if (prev === SK.CloseBraceToken || prev === SK.OfKeyword || prev === SK.PlusPlusToken || prev === SK.MinusMinusToken) exact = false;
      if (prev === SK.CloseParenToken ? closedHead : !(before === SK.DotToken || before === SK.QuestionDotToken) && slashOpensRegex(prev)) kind = scanner.reScanSlashToken();
    } else if (kind === SK.CloseBraceToken && depths.length > 0 && depths[depths.length - 1] === 0) {
      kind = scanner.reScanTemplateToken(false);
      if (kind === SK.TemplateTail) depths.pop();
    } else if (kind === SK.OpenBraceToken && depths.length > 0) {
      depths[depths.length - 1] += 1;
    } else if (kind === SK.CloseBraceToken && depths.length > 0) {
      depths[depths.length - 1] -= 1;
    } else if (kind === SK.TemplateHead) {
      depths.push(0);
    } else if (kind === SK.OpenParenToken) {
      const named = before === SK.DotToken || before === SK.QuestionDotToken; // obj.if(...) is a call
      heads.push((HEADS.has(prev) && !named) || (prev === SK.AwaitKeyword && before === SK.ForKeyword));
    } else if (kind === SK.CloseParenToken) {
      if (heads.length === 0) exact = false;
      closedHead = heads.pop() === true;
    }
    visit(kind, scanner, prev);
    before = prev;
    prev = kind;
  }
  return exact;
}

/**
 * The last path segment of every string literal and template part in `text`'s
 * code that ends in .mjs, as every gate does. Comments are never read. When the
 * walk is not exact, the parser reads the literals instead.
 */
function literalTails(text) {
  const tails = new Set();
  const add = (value) => {
    if (value.endsWith('.mjs')) tails.add(value.slice(value.lastIndexOf('/') + 1));
  };
  const exact = walkCode(text, (kind, scanner) => {
    if (TEXT_KINDS.has(kind)) add(scanner.getTokenValue());
  });
  if (exact) return tails;
  tails.clear();
  const visit = (node) => {
    if (TEXT_KINDS.has(node.kind)) add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile('names.mjs', text, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS));
  return tails;
}

/** Each gate under its basename. */
function byBasename(gates) {
  const byBase = new Map();
  for (const gate of gates) {
    const base = gate.slice(gate.lastIndexOf('/') + 1);
    byBase.set(base, [...(byBase.get(base) ?? []), gate]);
  }
  return byBase;
}

/** The gates whose basename is one of `tails`. */
function gatesEndingIn(tails, byBase) {
  const named = new Set();
  for (const tail of tails) for (const gate of byBase.get(tail) ?? []) named.add(gate);
  return named;
}

/** The gates `text` names in its code: a literal or template part ending in a gate's basename. Proved on fixtures below. */
const gatesNamedIn = (text, gates) => gatesEndingIn(literalTails(text), byBasename(gates));

const unwrapped = (node) => (ts.isParenthesizedExpression(node) ? unwrapped(node.expression) : node);
const isProcess = (node) => {
  const e = unwrapped(node);
  return (ts.isIdentifier(e) && e.text === 'process') || (ts.isPropertyAccessExpression(e) && e.name.text === 'process');
};

// The one way a gate with no row may reach process.exit: conformance-pocket.mjs's
// exitWhenWritten, pinned here byte for byte. It exits from the callback of an
// empty write to stdout and to stderr, and only on the second call, so both
// streams have handed on every byte. A copy that differs at all is read as not
// finishing, because a counter taken out, or the callback handed to anything
// else as well, exits while stdout still holds the report (the Phase 361.1
// verifier's V2 and V3; build/p3611/SPEC.md, the fix round).
const HELPER_COUNTED = '  let open = 2;\n  const done = () => {\n    open -= 1;\n    if (open === 0) process.exit(code);\n  };\n';
const HELPER_HANDED = "  process.stdout.write('', done);\n  process.stderr.write('', done);\n";
const HELPER_TEXT =
  `function exitWhenWritten(code) {\n  process.exitCode = code;\n${HELPER_COUNTED}${HELPER_HANDED}` +
  '  return new Promise(() => {});\n}\n';
// The two changes the verifier showed losing the report, kept for the fixtures and ablations below.
const HELPER_UNCOUNTED = '  const done = () => {\n    process.exit(code);\n  };\n';
const HELPER_HANDED_TO_A_TIMER = `${HELPER_HANDED}  setTimeout(done, 5);\n`;

/** Is `fn` a function declaration whose text is the pinned helper's? */
const isTheHelper = (fn, source) => `${source.text.slice(fn.getStart(source), fn.end)}\n` === HELPER_TEXT;

/**
 * The 1-based lines at which a parsed gate reaches process.exit anywhere but
 * inside the pinned helper. Empty means the gate finishes its writes. Each
 * reach is judged by its own nearest function declaration alone. Proved on
 * fixtures below.
 */
function exitsOutsideTheHelper(source) {
  const text = source.text;
  const lines = [];
  // Lines are counted by \n alone, as grep -n and an editor count them. The
  // compiler also breaks lines at U+2028 and U+2029, and conformance-pocket.mjs
  // holds one in a string, so its own numbering is one line late after it.
  const at = (node) => {
    const start = node.getStart(source);
    let line = 1;
    for (let i = text.indexOf('\n'); i !== -1 && i < start; i = text.indexOf('\n', i + 1)) line += 1;
    lines.push(line);
  };
  const exitNamed = (element) => (element.propertyName ?? element.name)?.text === 'exit';
  const ancestors = [];
  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'exit' && isProcess(node.expression)) {
      const fn = ancestors.findLast((one) => ts.isFunctionDeclaration(one));
      if (fn === undefined || !isTheHelper(fn, source)) at(node);
    } else if (ts.isElementAccessExpression(node) && isProcess(node.expression)) {
      const key = node.argumentExpression;
      if (!(ts.isStringLiteralLike(key) || ts.isNumericLiteral(key)) || key.text === 'exit') at(node);
    } else if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer !== undefined && isProcess(node.initializer)) {
      for (const element of node.name.elements) if (exitNamed(element)) at(element);
    } else if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && ['process', 'node:process'].includes(node.moduleSpecifier.text)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) for (const element of bindings.elements) if (exitNamed(element)) at(element);
    }
    ancestors.push(node);
    ts.forEachChild(node, visit);
    ancestors.pop();
  };
  visit(source);
  return lines;
}

// After one of these a `function` begins a statement, so a copy of the helper
// there is a declaration, as the parser reads it.
const STATEMENT_ENDS = ts === null ? null : new Set([null, SK.SemicolonToken, SK.OpenBraceToken, SK.CloseBraceToken]);

/**
 * Whether `text` may reach process.exit outside the pinned helper, read with
 * walkCode at about a third of a parse's cost. It may when, outside a copy of
 * the helper that begins a statement, a token spells exit (a name, or a string
 * such as an element's key), or process is followed by anything but a dot and
 * another name; and whenever the walk was not exact. Every reach the parser
 * would flag holds such a token outside a copy, so a text that may not reaches
 * process.exit nowhere else, provided the walk splits it into the parser's
 * tokens: a slash it misplaces hides the code it swallows, as `it.new / 2` did
 * before the ruled round (build/p3611/SPEC.md), so each placement is a flush
 * fixture read both ways below. Only a text that may is parsed. `spans` are
 * the copies.
 */
function mayReachExit(text) {
  const helper = HELPER_TEXT.slice(0, -1);
  const spans = [];
  let may = false;
  let after = 0; // the end of the copy of the helper the walk last entered
  let processAt = 0; // 1: process was the token before, 2: then a dot
  const exact = walkCode(text, (kind, scanner, prev) => {
    const start = scanner.getTokenStart();
    if (start < after) return;
    if (kind === SK.FunctionKeyword && STATEMENT_ENDS.has(prev) && text.startsWith(helper, start)) {
      spans.push([start, start + helper.length]);
      after = start + helper.length;
      return;
    }
    if (may) return;
    if (processAt === 1) {
      processAt = kind === SK.DotToken ? 2 : 0;
      may = processAt === 0;
      return;
    }
    if (processAt === 2) {
      processAt = 0;
      if (kind !== SK.Identifier && !(kind >= SK.FirstKeyword && kind <= SK.LastKeyword)) {
        may = true;
        return;
      }
    }
    if (kind === SK.Identifier) {
      const name = scanner.getTokenValue();
      if (name === 'exit') may = true;
      else if (name === 'process') processAt = 1;
    } else if ((kind === SK.StringLiteral || kind === SK.NoSubstitutionTemplateLiteral) && scanner.getTokenValue() === 'exit') {
      may = true;
    }
  });
  return { may: may || !exact, spans };
}

/**
 * What the reader finds in each text, kept by text so an ablation reads again
 * only the text it changed: the walk always, the parse (TypeScript's parser,
 * no parent pointers, since the reader keeps its own ancestors and the pointers
 * cost a fifth of the parse) only when the walk says the text may reach exit.
 */
const readKept = new Map();
function readExits(path, text) {
  if (!readKept.has(text)) {
    const { may, spans } = mayReachExit(text);
    const lines = may ? exitsOutsideTheHelper(ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS)) : [];
    readKept.set(text, { lines, spans });
  }
  return readKept.get(text);
}

/** The newlines in `text` from `from` to `to`, and nothing else, so a blanked span keeps its lines. */
function newlinesIn(text, from, to) {
  let n = 0;
  for (let i = text.indexOf('\n', from); i !== -1 && i < to; i = text.indexOf('\n', i + 1)) n += 1;
  return '\n'.repeat(n);
}

/** `text` with everything outside the disjoint `ranges` blanked to its newlines, so every line keeps its number. */
function keepOnly(text, ranges) {
  let out = '';
  let from = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    out += newlinesIn(text, from, start) + text.slice(start, end);
    from = end;
  }
  return out + newlinesIn(text, from, text.length);
}

/**
 * 9a and 9b over one set of inputs, so the ablations below can run it again
 * over texts changed in memory. `textOf` answers null for a file that is not
 * there. What the scan and the parse found is kept per text, so an ablation
 * reads again only the file it changed.
 */
const tailsKept = new Map();
function readPipedGates(scripts, textOf, rows) {
  const findings = [];
  const gates = new Set();
  for (const [name, command] of Object.entries(scripts)) {
    if (/^(conformance|gate):/.test(name)) {
      const m = /^node (build\/\S+\.mjs)(?:\s|$)/.exec(String(command));
      if (m !== null) gates.add(m[1]);
    } else if (name === 'build') {
      for (const m of String(command).matchAll(/(?:^|&&)\s*node (build\/\S+\.mjs)(?=\s|$)/g)) gates.add(m[1]);
    }
  }
  const harnesses = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (!name.startsWith('ablation:')) continue;
    const m = /^node (\S+)/.exec(String(command));
    if (m !== null) harnesses.push([name, m[1]]);
  }
  const byBase = byBasename(gates);
  const piped = new Map();
  let naming = 0;
  for (const [script, path] of harnesses) {
    const text = textOf(path);
    if (text === null) {
      findings.push(`"${script}" runs ${path}, which does not exist.`);
      continue;
    }
    if (!tailsKept.has(text)) tailsKept.set(text, literalTails(text));
    const named = [...gatesEndingIn(tailsKept.get(text), byBase)];
    if (named.length > 0) naming += 1;
    for (const gate of named) piped.set(gate, [...(piped.get(gate) ?? []), script]);
  }
  if (naming < PIPED_HARNESS_FLOOR) {
    findings.push(`only ${String(naming)} file(s) behind ablation:* name a gate, under the floor of ${String(PIPED_HARNESS_FLOOR)}.`);
  }
  if (piped.size < PIPED_GATE_FLOOR) {
    findings.push(`only ${String(piped.size)} gate(s) are named by a file behind ablation:*, under the floor of ${String(PIPED_GATE_FLOOR)}.`);
  }
  const rowFor = new Map(rows.map((row) => [row[0], row]));
  let flushing = 0;
  let measured = 0;
  let largest = 0;
  for (const [gate, by] of [...piped].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const row = rowFor.get(gate);
    if (row !== undefined) {
      measured += 1;
      largest = Math.max(largest, row[1]);
      if (row[1] > PIPE_CEILING_BYTES) {
        findings.push(
          `${gate} (read through a pipe by ${by.join(', ')}) was measured at ${withCommas(row[1])} bytes, more than ` +
            `the ${withCommas(PIPE_CEILING_BYTES)} a row may hold. It must finish its writes before it exits.`
        );
      }
      continue;
    }
    const text = textOf(gate);
    if (text === null) {
      findings.push(`${gate} is read through a pipe by ${by.join(', ')} and does not exist.`);
      continue;
    }
    const { lines } = readExits(gate, text);
    if (lines.length === 0) flushing += 1;
    for (const line of lines) {
      findings.push(
        `${gate} is read through a pipe by ${by.join(', ')}, has no measured row, and ${gate}:${String(line)} reaches ` +
          `process.exit outside exitWhenWritten, the helper this check pins byte for byte. End through that helper, ` +
          `copied from conformance-pocket.mjs, or measure its largest output under its harness and add a row.`
      );
    }
  }
  for (const gate of rowFor.keys()) {
    if (!piped.has(gate)) findings.push(`the row for ${gate} names a gate no file behind ablation:* names. Remove the row.`);
  }
  return { findings, piped: piped.size, naming, flushing, measured, largest };
}

// 9c. The two readers, proved on fixtures before they read the tree.
const NAMES_FIXTURE_GATES = ['build/conformance-save.mjs', 'build/conformance-machines.mjs'];
const NAMES_FIXTURES = [
  { why: 'a gate path in a string', text: "spawnSync(process.execPath, ['build/conformance-save.mjs']);\n", want: ['build/conformance-save.mjs'] },
  { why: 'a gate path in a template with a substitution', text: 'const gate = `${scratch}/build/conformance-save.mjs`;\n', want: ['build/conformance-save.mjs'] },
  { why: 'a basename alone', text: "const name = 'conformance-machines.mjs';\n", want: ['build/conformance-machines.mjs'] },
  {
    why: 'a regular expression holding a quote, then a string naming a gate on the same line',
    text: "const quote = /'/; const gate = 'build/conformance-save.mjs';\n",
    want: ['build/conformance-save.mjs']
  },
  {
    why: 'a division, then a string naming a gate',
    text: "const half = total / 2; const gate = 'build/conformance-save.mjs'; const third = total / 3;\n",
    want: ['build/conformance-save.mjs']
  },
  {
    why: 'a gate named only in a line comment and in a block comment',
    text: '// build/conformance-save.mjs\n/* conformance-machines.mjs */\nconst x = 1;\n',
    want: []
  },
  {
    why: 'a keyword read as a name and divided, then a string naming a gate',
    text: "const n = { new: 4 }; const h = n.new / 2; const g = ['build/conformance-save.mjs']; const z = h / 2;\n",
    want: ['build/conformance-save.mjs']
  },
  {
    why: 'a slash after a closing brace opening a regular expression holding a quote, then a string naming a gate',
    text: "function f() {}\n/'/.test(s); const g = 'build/conformance-save.mjs'; // it's\n",
    want: ['build/conformance-save.mjs']
  }
];
const FLUSH_FIXTURES = [
  { why: 'the helper', text: `${HELPER_TEXT}await exitWhenWritten(1);\n`, finishes: true },
  {
    why: 'the helper exiting on its first callback',
    text: `${HELPER_TEXT.replace(HELPER_COUNTED, () => HELPER_UNCOUNTED)}await exitWhenWritten(1);\n`,
    finishes: false
  },
  {
    why: "the helper's callback handed to a timer too",
    text: `${HELPER_TEXT.replace(HELPER_HANDED, () => HELPER_HANDED_TO_A_TIMER)}await exitWhenWritten(1);\n`,
    finishes: false
  },
  { why: 'no process.exit', text: "process.stdout.write('PASS\\n');\nprocess.exitCode = 0;\n", finishes: true },
  {
    why: 'process.exit only in a comment and only in a string',
    text: "// process.exit(1) is not called here\nprocess.stdout.write('then process.exit(1)');\n",
    finishes: true
  },
  { why: 'a write then process.exit(1)', text: 'process.stdout.write(report);\nprocess.exit(1);\n', finishes: false },
  { why: 'a callback handed to one stream', text: "process.stdout.write('', () => process.exit(1));\n", finishes: false },
  { why: 'a const callback handed to stdout alone', text: "const done = () => process.exit(1);\nprocess.stdout.write('', done);\n", finishes: false },
  { why: 'process.exit read as a value', text: 'const exit = process.exit;\nexit(1);\n', finishes: false },
  { why: "process['exit']", text: "process['exit'](1);\n", finishes: false },
  { why: 'a key that spells exit only when computed', text: "process['ex' + 'it'](1);\n", finishes: false },
  { why: 'exit taken from process by destructuring', text: 'const { exit } = process;\nexit(1);\n', finishes: false },
  { why: 'exit imported from node:process', text: "import { exit } from 'node:process';\nexit(1);\n", finishes: false },
  { why: 'process reached through globalThis', text: 'globalThis.process.exit(1);\n', finishes: false },
  // The walk's own shapes: each must reach the parser, and the helper after other code must not need it.
  { why: 'process in brackets', text: "(process)['exit'](1);\n", finishes: false },
  { why: 'exit spelled with an escape', text: 'process.\\u0065xit(1);\n', finishes: false },
  { why: 'the helper exported', text: `export ${HELPER_TEXT}await exitWhenWritten(1);\n`, finishes: false },
  { why: 'a division after a bracket, then process.exit', text: 'const s = (a - b) / 1000; process.exit(1);\n', finishes: false },
  { why: 'an if head, then a regular expression holding a quote, then process.exit', text: "if (x) /'/.test(y); process.exit(1);\n", finishes: false },
  { why: 'a slash after a closing brace, then process.exit', text: "function f() {}\n/'/.test(y); process.exit(1);\n", finishes: false },
  { why: 'a name of divided, then a computed key', text: "const of = 4; const h = of / 2; process['ex' + 'it'](1); const t = h / 2;\n", finishes: false },
  { why: 'the helper after other code', text: `const half = (a + b) / 2;\n${HELPER_TEXT}await exitWhenWritten(half > 1 ? 1 : 0);\n`, finishes: true },
  // Each slash the walk once misplaced, hiding the reach after it (build/p3611/SPEC.md, the ruled round).
  { why: 'a keyword read as a name and divided, then a comment holding a slash', text: 'const it = { new: red };\nif (it.new / 1 > 0) process.exit(1); // https://example.com/why\n', finishes: false },
  { why: 'the same name read through ?.', text: 'const it = { new: red };\nif (it?.new / 1 > 0) process.exit(1); // https://example.com/why\n', finishes: false },
  { why: 'a keyword read as a name and divided, then a comment with no slash', text: 'const it = { new: red };\nif (it.new / 1 > 0) process.exit(1); // why\n', finishes: false },
  { why: 'a class extending a regular expression holding a quote', text: "class A extends /'/.constructor {} process.exit(1); // it's\n", finishes: false },
  { why: 'export default, then a regular expression holding a quote', text: "export default /'/; process.exit(1); // it's\n", finishes: false },
  { why: 'break, then a regular expression holding a quote on the next line', text: "for (;;) { break\n/'/.test(s); process.exit(1); // it's\n}\n", finishes: false },
  { why: 'continue, then a regular expression holding a quote on the next line', text: "for (;;) { continue\n/'/.test(s); process.exit(1); // it's\n}\n", finishes: false },
  { why: 'debugger, then a regular expression holding a quote on the next line', text: "debugger\n/'/.test(s); process.exit(1); // it's\n", finishes: false },
  { why: 'a prefix ++ before a regular expression holding a quote', text: "++/'/.lastIndex; process.exit(1); // it's\n", finishes: false },
  { why: 'a prefix -- before a regular expression holding a quote', text: "--/'/.lastIndex; process.exit(1); // it's\n", finishes: false }
];
let readerFixtures = 0;
if (ts !== null) {
  for (const one of NAMES_FIXTURES) {
    readerFixtures += 1;
    const got = [...gatesNamedIn(one.text, NAMES_FIXTURE_GATES)].sort();
    if (JSON.stringify(got) === JSON.stringify([...one.want].sort())) continue;
    fail(`clause 9's reader got "${one.why}" wrong. It answered ${JSON.stringify(got)}.`);
  }
  // Each read as the tree is read (the walk, then the parse only if the walk
  // says so) and by the parser alone, which must answer the same lines.
  for (const one of FLUSH_FIXTURES) {
    readerFixtures += 1;
    const read = readExits('fixture.mjs', one.text).lines;
    const parsed = exitsOutsideTheHelper(ts.createSourceFile('fixture.mjs', one.text, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS));
    const finishes = read.length === 0;
    if (finishes === one.finishes && JSON.stringify(read) === JSON.stringify(parsed)) continue;
    fail(`clause 9's reader got "${one.why}" wrong. It answered finishes ${String(finishes)} at ${JSON.stringify(read)}, the parser alone ${JSON.stringify(parsed)}.`);
  }
}

// 9a and 9b over the tree.
const textsRead = new Map();
const treeText = (path) => {
  if (!textsRead.has(path)) {
    let text = null;
    try {
      text = readFileSync(join(repoRoot, path), 'utf8');
    } catch {
      text = null;
    }
    textsRead.set(path, text);
  }
  return textsRead.get(path);
};
let pipedRead = null;
if (ts !== null) {
  pipedRead = readPipedGates(pkg.scripts ?? {}, treeText, PIPED_MEASURED);
  for (const message of pipedRead.findings) fail(message);
}

// 9d. The clause, run again over the shipping texts changed in memory, must go
// red each time. Nothing here is written to disk.
if (ts !== null) {
  const POCKET = 'build/conformance-pocket.mjs';
  const MACHINES = 'build/conformance-machines.mjs';
  // The row removed and the gate named anew are small files, so the reader
  // parses tens of kilobytes rather than conformance-machines.mjs's 830 KB and
  // conformance-redline.mjs's 380 KB (build/p3611/SPEC.md §As built).
  const NEAREST = 'build/p313/hostile-client.mjs';
  const HARNESS = 'build/ablation-p313.mjs';
  const NEW_GATE = 'build/conformance-installs.mjs';
  const changed = (path, text) => (asked) => (asked === path ? text : treeText(asked));
  // Three changes to conformance-pocket.mjs, each read over the gate with all
  // but its helper and its red exit blanked to newlines, so each keeps its own
  // line and a change is read in a millisecond where the whole file takes a
  // hundred. Every reach is judged by its own function declaration, so the
  // blanks change no judgement; the helper and the red exit must read clean
  // alone first. Each change must then be red on exactly the line of the
  // process.exit it leaves outside the pinned helper.
  const plants = [
    { what: "conformance-pocket.mjs's red exit was put back as process.exit(1)", from: '  await exitWhenWritten(1);\n', to: '  process.exit(1);\n', red: 'process.exit(1);', inHelper: false },
    { what: 'exitWhenWritten exited on its first callback', from: HELPER_COUNTED, to: HELPER_UNCOUNTED, red: 'process.exit(code);', inHelper: true },
    { what: "exitWhenWritten's callback was handed to a timer too", from: HELPER_HANDED, to: HELPER_HANDED_TO_A_TIMER, red: 'process.exit(code);', inHelper: true }
  ];
  const once = (text, part) => text.indexOf(part) >= 0 && text.indexOf(part) === text.lastIndexOf(part);
  const pocketText = treeText(POCKET);
  const planted = new Map();
  let clean = true;
  if (pocketText !== null) {
    const { spans } = readExits(POCKET, pocketText);
    const helper = spans.length === 1 ? spans[0] : null;
    const ranges = helper === null ? [] : [helper];
    const plantable = [];
    for (const plant of plants) {
      const at = pocketText.indexOf(plant.from);
      const inside = helper !== null && helper[0] <= at && at + plant.from.length <= helper[1];
      if (!once(pocketText, plant.from) || inside !== plant.inHelper) continue;
      if (!plant.inHelper) ranges.push([at, at + plant.from.length]);
      plantable.push(plant);
    }
    const text = keepOnly(pocketText, ranges);
    clean = readExits(POCKET, text).lines.length === 0;
    if (clean) for (const plant of plantable) planted.set(plant, text.replace(plant.from, () => plant.to));
    else fail("clause 9's changes to conformance-pocket.mjs were not run: its helper and red exit, read alone, already reach process.exit.");
  }
  const lineOf = (text, part) => text.slice(0, text.indexOf(part)).split('\n').length;
  const ablations = [
    ...plants
      .filter(() => clean)
      .map((plant) => {
        const text = planted.get(plant) ?? null;
        return {
          what: plant.what,
          run: () => (text === null ? null : readPipedGates(pkg.scripts ?? {}, changed(POCKET, text), PIPED_MEASURED)),
          red: (all) => {
            const mine = all.filter((f) => f.startsWith(`${POCKET} is read through a pipe by`));
            return mine.length === 1 && mine[0].includes(`${POCKET}:${String(lineOf(text, plant.red))} reaches`);
          }
        };
      }),
    {
      what: 'package.json lost its ablation: names',
      run: () =>
        readPipedGates(Object.fromEntries(Object.entries(pkg.scripts ?? {}).filter(([name]) => !name.startsWith('ablation:'))), treeText, PIPED_MEASURED),
      red: (all) => all.some((f) => f.endsWith(`floor of ${String(PIPED_HARNESS_FLOOR)}.`)) && all.some((f) => f.endsWith(`floor of ${String(PIPED_GATE_FLOOR)}.`))
    },
    {
      what: "conformance-machines.mjs's row was raised to 91,383 bytes",
      run: () => readPipedGates(pkg.scripts ?? {}, treeText, PIPED_MEASURED.map((row) => (row[0] === MACHINES ? [row[0], 91_383, row[2]] : row))),
      red: (all) => all.some((f) => f.startsWith(`${MACHINES} (read through a pipe by`) && f.includes('91,383 bytes'))
    },
    {
      what: "hostile-client.mjs's row, the one nearest the pipe, was removed",
      run: () => readPipedGates(pkg.scripts ?? {}, treeText, PIPED_MEASURED.filter((row) => row[0] !== NEAREST)),
      red: (all) => all.some((f) => f.startsWith(`${NEAREST} is read through a pipe by`))
    },
    {
      what: `ablation-p313.mjs also named ${NEW_GATE}`,
      run: () => readPipedGates(pkg.scripts ?? {}, changed(HARNESS, `${treeText(HARNESS) ?? ''}\nconst P3611_PLANT = ['${NEW_GATE}'];\n`), PIPED_MEASURED),
      red: (all) => all.some((f) => f.startsWith(`${NEW_GATE} is read through a pipe by ablation:p313, has no measured row`))
    }
  ];
  for (const one of ablations) {
    const result = one.run();
    if (result !== null && one.red(result.findings)) continue;
    fail(`clause 9 did not go red when ${one.what}.`);
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
process.stdout.write(
  `  the runtime range is one range: engines.node "${String(declaredRange)}", ` +
    `SUPPORTED_NODE ${JSON.stringify(verificationChecks.SUPPORTED_NODE)} and ` +
    `.nvmrc ${String(nvmrcVersion)}, with tsxCli() calling the preflight ` +
    `(${String(BODY_FIXTURES.length)} body fixtures and ` +
    `${String(RANGE_FIXTURES.length)} range fixtures behaving).\n`
);
process.stdout.write(
  `  ${String(xcodeEntries)} ${XCODE_HARNESS} entr${xcodeEntries === 1 ? 'y' : 'ies'} ` +
    `refuse by name when Xcode is absent (${String(XCODE_FIXTURES.length)} reader fixtures behaving).\n`
);
process.stdout.write(
  `  0 of ${String(goRead)} scripts under build/ run Go (${String(GO_FIXTURES.length)} reader fixtures behaving).\n`
);
process.stdout.write(
  `  ${String(pipedRead.piped)} gates are read through a pipe by ${String(pipedRead.naming)} ablation harnesses: ` +
    `${String(pipedRead.flushing)} ${pipedRead.flushing === 1 ? 'finishes its writes before it exits' : 'finish their writes before they exit'} and ` +
    `${String(pipedRead.measured)} ${pipedRead.measured === 1 ? 'was' : 'were'} measured at most ${withCommas(pipedRead.largest)} bytes ` +
    `against ${withCommas(PIPE_CEILING_BYTES)} (${String(readerFixtures)} reader fixtures behaving).\n`
);
for (const type of [...CHECK_TYPES, 'aggregate']) {
  const n = counts.get(type) ?? 0;
  if (n > 0) process.stdout.write(`  ${String(n).padStart(3)}  ${type}\n`);
}
