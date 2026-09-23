#!/usr/bin/env node
/**
 * assert-simulator-teardown.mjs, `npm run gate:simulator`. Every iOS Simulator
 * a script under build/ creates is created, booted, shut down and deleted by
 * build/simulator-run.mjs, and nowhere else (Phase 316.2).
 *
 * ## Why this file exists
 *
 * A Simulator is the 2026-08-22 leak in a new shape. `simctl boot` returns at
 * once and the device runs under launchd, so nothing that ends a child process
 * ends it, and `gate:background` — which looks for a detached spawn, a shell
 * loop or a sleeper — cannot see it (build/p316/SPEC.md §2 row 19). On
 * 2026-09-22 a SIGTERM skipped a `finally` and left a device booted (§3.4
 * pitfall c). build/simulator-run.mjs owns the device's whole life for that
 * reason, and this gate is what keeps it there, built the way
 * build/assert-electron-teardown.mjs keeps an Electron in
 * build/electron-run.mjs.
 *
 * ## What it asserts, and every direction matters
 *
 *   1. FORWARD. No file under build/ but the helper names a verb that makes,
 *      boots or ends a device: `simctl create`, `boot`, `clone`, `shutdown`,
 *      `delete` or `erase`, `bootstatus -b` (which boots), `booted` or `all`
 *      as a target (a device somebody else made), `screenshot` or
 *      `recordVideo` (a photograph, which SPEC §4.0 refuses outright), or an
 *      `xcodebuild` TEST action (a test against a destination boots it). It is
 *      FAIL CLOSED: in a file that names `simctl` at all, the verb is caught as
 *      a string anywhere in the file, not only inside the call, because the
 *      shape that walks past a call-reading rule is the verb held in a
 *      variable, and that shape is one of the fixtures below.
 *   2. REVERSE. The population of files that reach the helper — import it AND
 *      call `withSimulator` — does not fall below {@link SIMULATOR_USER_FLOOR}.
 *      Adding a script never turns this red; deleting one, or taking one off
 *      the helper, does. A deliberate deletion lowers the floor in the same
 *      commit and names the file.
 *   3. THE HELPER'S FINALLY. `withSimulator` calls `teardown()` inside a
 *      `finally`, read by matching braces rather than by searching for the
 *      word, which appears in this file's prose and in the helper's header.
 *   4. THE HELPER'S SIGNALS. The helper's net registers `exit`, `SIGINT`,
 *      `SIGTERM` and `SIGHUP`, each reaching `teardownSync`, and both teardowns
 *      name `shutdown` AND `delete`. `withSimulator` installs the net BEFORE it
 *      runs `create`, so a signal that lands during the create is covered.
 *   5. THE HELPER'S TARGETS. The helper itself names no `all`, no `booted` and
 *      no `unavailable`: it ends the udid it created and nothing else.
 *   6. THE FIXTURES. Every scanner above is run over texts this gate holds
 *      itself, fifteen of them, eight of which must be caught, and the floor is
 *      driven one below itself and at itself. A checker nobody has seen fail is
 *      a checker nobody has seen work.
 *
 * ## What it does not assert
 *
 * It does not read package.json, and it does not follow a command line handed
 * to a shell or a tmux pane, the boundary gate:electron draws too. It does not
 * see a device made by a program that is not under build/, which is every
 * device a person makes in Xcode; those are his.
 *
 * It spawns nothing, starts no Simulator and needs no Xcode. About 0.14 s over
 * the 473 scripts under build/ on 2026-09-23. It runs inside `npm run build`,
 * so nothing that builds can skip it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildScriptNames } from './build-scripts.mjs';
import { blockAt, lineAt, stripComments } from './scan-source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');
const HELPER = 'simulator-run.mjs';
const SELF = 'assert-simulator-teardown.mjs';

/**
 * The fewest files that may reach the helper.
 *
 * PHASE 316.2 SET IT AT 2: build/p316/probe-p316.mjs (`probe:p316`, the app in
 * the Simulator against the door on loopback, with the iOS 18.3 floor arm and
 * the ATS arm) and build/p316/test-ios.mjs (`test:ios`, the XCTest unit
 * tests). RAISE IT WHEN YOU ADD ONE, in the same commit: adding a script
 * cannot turn this gate red, so a floor left where it was would let the new
 * one be deleted again in silence.
 */
export const SIMULATOR_USER_FLOOR = 2;

/** The verbs that make, boot or end a device. The helper's alone. */
const DEVICE_VERBS = ['create', 'boot', 'clone', 'shutdown', 'delete', 'erase'];
/** Targets naming a device somebody else made. */
const FOREIGN_TARGETS = ['booted', 'all', 'unavailable'];
/** A photograph, which SPEC §4.0 refuses: every visual claim is a frame or a label. */
const PHOTOGRAPHS = ['screenshot', 'recordVideo'];
/** The xcodebuild actions that boot their destination. */
const TEST_ACTIONS = ['test', 'test-without-building'];

// ---------------------------------------------------------------------------
// Reading source
// ---------------------------------------------------------------------------

/**
 * Every string literal in comment-stripped code, as `{ text, at }`. Template
 * literals are read whole, `${…}` and all, which is the conservative reading:
 * a verb inside one is still a verb.
 */
export function literals(code) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === "'" || c === '"' || c === '`') {
      const start = i;
      i += 1;
      let text = '';
      while (i < code.length && code[i] !== c) {
        if (code[i] === '\\') {
          text += code[i + 1] ?? '';
          i += 2;
          continue;
        }
        text += code[i];
        i += 1;
      }
      out.push({ text, at: start });
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}

/**
 * Every place in one file that makes, boots or ends a device, photographs one,
 * or tests against one, outside the helper. The real scan and the fixtures
 * both read this, so the fixtures prove the code the gate runs.
 */
export function simulatorStarts(name, source) {
  // Every finding below needs one of the two tool names somewhere in a string,
  // so a file that spells neither anywhere, prose included, has none. This is
  // what keeps the walk over build/ near a tenth of a second.
  if (!/simctl|xcodebuild/.test(source)) return [];
  const code = stripComments(source);
  const strings = literals(code);
  const hits = [];
  const hit = (at, what) => hits.push({ file: name, line: lineAt(code, at), what });
  // A file NAMES the tool when a string IS the tool: an argv element or a
  // path to it. A sentence that mentions it — a needs line in
  // verification-checks.mjs, a report line that begins "xcodebuild exited" —
  // is prose, and taking prose for a launch is the false alarm that makes
  // every pass worthless. A whole command line in one string is caught by the
  // per-string patterns below whatever the file names.
  const namesTool = (tool) => (s) => new RegExp(`^(?:\\S*/)?${tool}$`).test(s.text.trim());
  const namesSimctl = strings.some(namesTool('simctl'));
  const namesXcodebuild = strings.some(namesTool('xcodebuild'));
  for (const s of strings) {
    // A whole command line in one string: `xcrun simctl boot <udid>`.
    const line = new RegExp(`\\bsimctl\\s+(${DEVICE_VERBS.join('|')})\\b`).exec(s.text);
    if (line !== null) hit(s.at, `a command line naming simctl ${line[1]}`);
    if (/\bsimctl\s+bootstatus\b[^\n]*\s-b\b/.test(s.text)) hit(s.at, 'a command line naming simctl bootstatus -b, which boots');
    if (/\bsimctl\s+io\b[^\n]*\b(screenshot|recordVideo)\b/.test(s.text)) hit(s.at, 'a command line that photographs a device');
    if (new RegExp(`\\bxcodebuild\\b[^\\n]*\\s(${TEST_ACTIONS.join('|')})(\\s|$)`).test(s.text)) {
      hit(s.at, 'a command line running an xcodebuild test, which boots its destination');
    }
    if (namesSimctl) {
      if (DEVICE_VERBS.includes(s.text)) hit(s.at, `the simctl verb '${s.text}'`);
      if (FOREIGN_TARGETS.includes(s.text)) hit(s.at, `the simctl target '${s.text}', a device this script did not make`);
      if (PHOTOGRAPHS.includes(s.text)) hit(s.at, `'${s.text}', a photograph`);
    }
    if (namesXcodebuild && TEST_ACTIONS.includes(s.text)) {
      hit(s.at, `the xcodebuild action '${s.text}', which boots its destination`);
    }
  }
  if (namesSimctl && strings.some((s) => s.text === 'bootstatus') && strings.some((s) => s.text === '-b')) {
    const at = strings.find((s) => s.text === 'bootstatus').at;
    hit(at, "simctl 'bootstatus' with '-b', which boots");
  }
  return hits;
}

/** Whether this file reaches the helper: imports it at any depth and calls it. */
export function usesHelper(source) {
  if (!source.includes('simulator-run.mjs')) return { imported: false, called: false };
  const code = stripComments(source);
  const imported = /from\s+['"](?:\.\.?\/)+simulator-run\.mjs['"]/.test(code);
  const called = /\bwithSimulator\s*\(/.test(code);
  return { imported, called };
}

/** Every file that reaches the helper. `read` is injected for the fixtures. */
export function helperUsers(names, read) {
  return names.filter((name) => {
    if (name === SELF || name === HELPER) return false;
    const use = usesHelper(read(name));
    return use.imported && use.called;
  });
}

/** Rule 2, as a function, so the fixtures can watch it refuse. */
export function floorFinding(count, floor) {
  if (count >= floor) return null;
  return (
    `only ${String(count)} file(s) under build/ reach build/${HELPER}, and the floor is ${String(floor)}. ` +
    'A script that made a Simulator left the tree or left the helper, and the second one is a device ' +
    'booted under launchd with nothing to end it. If the deletion was deliberate, lower ' +
    'SIMULATOR_USER_FLOOR in the same commit and name the file.'
  );
}

/** The body of `function <name>(` or `export async function <name>(`, braces matched. */
function functionBody(code, name) {
  const re = new RegExp(`\\bfunction\\s+${name}\\s*\\(`);
  const m = re.exec(code);
  if (m === null) return null;
  // The parameter list can hold destructuring braces, so skip to its close.
  let depth = 0;
  let i = m.index + m[0].length - 1;
  for (; i < code.length; i += 1) {
    if (code[i] === '(') depth += 1;
    else if (code[i] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const open = code.indexOf('{', i);
  return open === -1 ? null : blockAt(code, open);
}

/** Rules 3, 4 and 5 over the helper's source. Returns findings, empty when it holds. */
export function helperShape(source) {
  const code = stripComments(source);
  const out = [];
  const body = functionBody(code, 'withSimulator');
  if (body === null) return ['withSimulator is not declared in the helper.'];
  const fin = body.lastIndexOf('finally');
  const finBody = fin === -1 ? null : blockAt(body, body.indexOf('{', fin));
  if (finBody === null) out.push('withSimulator has no finally block.');
  else if (!/\bteardown\s*\(/.test(finBody)) out.push('the finally block of withSimulator does not call teardown().');
  const netAt = body.indexOf('installNet(');
  const createAt = body.search(/['"]create['"]/);
  if (netAt === -1) out.push('withSimulator never installs the signal net.');
  else if (createAt !== -1 && netAt > createAt) out.push('withSimulator installs the signal net AFTER it runs create, so a signal during the create is not covered.');

  const net = functionBody(code, 'installNet');
  if (net === null) {
    out.push('the helper declares no installNet().');
  } else {
    if (!/process\.on\(\s*['"]exit['"]/.test(net)) out.push("the net registers no 'exit' handler, so a process.exit skips the teardown.");
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      if (!new RegExp(`['"]${signal}['"]`).test(net)) out.push(`the net does not handle ${signal}, so ${signal} leaves the device booted (SPEC §3.4 pitfall c).`);
    }
    if ((net.match(/\bendEverythingSync\s*\(|\bteardownSync\s*\(/g) ?? []).length < 2) {
      out.push('the net handlers do not reach the blocking teardown.');
    }
  }
  const every = functionBody(code, 'endEverythingSync');
  if (net !== null && /endEverythingSync\s*\(/.test(net) && (every === null || !/\bteardownSync\s*\(/.test(every))) {
    out.push('endEverythingSync does not call teardownSync.');
  }
  for (const fn of ['teardown', 'teardownSync']) {
    const b = functionBody(code, fn);
    if (b === null) {
      out.push(`the helper declares no ${fn}().`);
      continue;
    }
    for (const verb of ['shutdown', 'delete']) {
      if (!new RegExp(`['"]${verb}['"]`).test(b)) out.push(`${fn}() never runs simctl ${verb}.`);
    }
  }
  for (const s of literals(code)) {
    if (FOREIGN_TARGETS.includes(s.text)) out.push(`the helper names '${s.text}', a device it did not make.`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The fixtures. Every verb is spelled from parts, so this gate's own source
// carries no literal the forward rule looks for.
// ---------------------------------------------------------------------------

const V = (s) => s.split('|').join('');
const SIM = V('sim|ctl');
const BOOT = V('bo|ot');
const MAKE = V('cre|ate');

const FIXTURES = [
  {
    name: 'through the helper',
    caught: false,
    user: true,
    text: `import { withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x' }, async (sim) => sim.udid);\n`
  },
  {
    name: 'a device made in argv',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${MAKE}', 'p316-x', 'a', 'b']);\n`
  },
  {
    name: 'a boot as a whole command line',
    caught: true,
    text: `import { execSync } from 'node:child_process';\nexecSync('xcrun ${SIM} ${BOOT} 1234');\n`
  },
  {
    name: 'the verb held in a variable',
    caught: true,
    text: `const verb = '${BOOT}';\nconst tool = '${SIM}';\nspawn('xcrun', [tool, verb, udid]);\n`
  },
  {
    name: 'bootstatus with -b, which boots',
    caught: true,
    text: `spawn('xcrun', ['${SIM}', '${BOOT}status', udid, '-b']);\n`
  },
  {
    name: 'a device somebody else made',
    caught: true,
    text: `spawn('xcrun', ['${SIM}', 'terminate', '${BOOT}ed', 'com.x']);\n`
  },
  {
    name: 'a photograph',
    caught: true,
    text: `spawn('xcrun', ['${SIM}', 'io', udid, '${V('screen|shot')}', 'x.png']);\n`
  },
  {
    name: 'an xcodebuild test outside the helper',
    caught: true,
    text: `spawn('xcrun', ['xcodebuild', '${V('te|st')}', '-destination', 'id=x']);\n`
  },
  {
    name: 'a comment that names the verb',
    caught: false,
    text: `// xcrun ${SIM} ${BOOT} is the helper's, never this file's\nconst x = 1;\n`
  },
  {
    name: 'a read of the device list',
    caught: false,
    text: `spawn('xcrun', ['${SIM}', 'list', 'devices', '-j']);\n`
  },
  {
    name: 'an xcodebuild build, which boots nothing',
    caught: false,
    text: `spawn('xcrun', ['xcodebuild', 'build-for-testing', '-destination', 'generic/platform=iOS Simulator']);\n`
  },
  {
    name: 'the word create in a file that never names the tool',
    caught: false,
    text: `const mode = '${MAKE}';\nconsole.log(mode);\n`
  },
  {
    name: 'the tools named in a sentence beside a test entry',
    caught: false,
    text: `const needs = 'the full Xcode, its xcodebuild and ${SIM}';\nconst entry = { name: '${V('te|st')}', skip: 'never' };\nsay('xcodebuild exited 0');\n`
  },
  {
    name: 'a test action handed to the helper handle',
    caught: false,
    user: true,
    text: `import { withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x' }, (sim) => sim.xcodebuild(['${V('te|st')}-without-building', '-scheme', 'T']));\n`
  },
  {
    name: 'an xcodebuild test as one command line',
    caught: true,
    text: `execSync('xcrun xcodebuild ${V('te|st')} -scheme T -destination id=x');\n`
  }
];

/** Helper shapes that rules 3 to 5 must refuse, each a one-clause ablation. */
const HELPER_ABLATIONS = [
  {
    what: 'the teardown moved out of the finally',
    edit: (src) => src.replace(/\}\s*finally\s*\{\s*\n(\s*\/\/[^\n]*\n)*\s*await teardown\(entry\);\s*\n\s*\}/, '}\n  await teardown(entry);')
  },
  { what: 'SIGHUP taken out of the net', edit: (src) => src.replace("['SIGINT', 'SIGTERM', 'SIGHUP']", "['SIGINT', 'SIGTERM']") },
  { what: 'the exit handler taken out', edit: (src) => src.replace("process.on('exit', () => {", "process.on('beforeExit', () => {") },
  { what: 'the delete taken out of the blocking teardown', edit: (src) => src.replace("runSync('xcrun', ['simctl', 'delete', udid], 60_000);", '') },
  {
    what: 'the net installed after the create',
    edit: (src) =>
      src
        .replace('  installNet();\n  const entry = {', '  const entry = {')
        .replace('    entry.udid = udid;\n', '    entry.udid = udid;\n    installNet();\n')
  },
  { what: "a foreign target named in the helper", edit: (src) => src.replace("['simctl', 'shutdown', udid]", `['simctl', 'shutdown', '${BOOT}ed']`) }
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const failures = [];
const fail = (what, detail) => failures.push({ what, detail });

// Rule 6 first, so a scanner that stopped working is said before its verdict.
let caughtFixtures = 0;
for (const f of FIXTURES) {
  const hits = simulatorStarts(`fixture: ${f.name}`, f.text);
  if (f.caught && hits.length === 0) fail(`the fixture "${f.name}" was not caught`, 'The forward rule cannot catch that shape in the tree either.');
  if (!f.caught && hits.length > 0) fail(`the fixture "${f.name}" was reported`, `${hits.map((h) => h.what).join('; ')}. A false alarm makes every pass worthless.`);
  if (f.caught && hits.length > 0) caughtFixtures += 1;
}
const fixtureUsers = helperUsers(
  FIXTURES.map((f) => f.name),
  (name) => FIXTURES.find((f) => f.name === name).text
);
const wantUsers = FIXTURES.filter((f) => f.user === true).map((f) => f.name);
if (fixtureUsers.join('\n') !== wantUsers.join('\n')) {
  fail('the derivation did not pick out exactly the fixtures that reach the helper', `It answered [${fixtureUsers.join(', ')}] where [${wantUsers.join(', ')}] reach it.`);
}
if (floorFinding(SIMULATOR_USER_FLOOR - 1, SIMULATOR_USER_FLOOR) === null) {
  fail('the floor accepted a population one short of itself', 'Rule 2 cannot notice a script leaving the helper.');
}
if (floorFinding(SIMULATOR_USER_FLOOR, SIMULATOR_USER_FLOOR) !== null) {
  fail('the floor refused a population that meets it', 'The floor is a minimum, so adding a script must never turn this red.');
}

// Rules 3 to 5 over the real helper, then over one-clause ablations of it.
const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
for (const why of helperShape(helperSource)) fail(`build/${HELPER}: ${why}`, 'The device this helper makes could outlive the script that made it.');
let ablationsRed = 0;
for (const a of HELPER_ABLATIONS) {
  const edited = a.edit(helperSource);
  if (edited === helperSource) {
    fail(`the helper ablation "${a.what}" found nothing to edit`, 'Its anchor is gone from the helper, so this gate no longer proves that clause. Re-point it.');
    continue;
  }
  if (helperShape(edited).length === 0) fail(`the helper ablation "${a.what}" left rules 3 to 5 green`, 'That clause is not asserted by anything.');
  else ablationsRed += 1;
}

// Rule 1 and rule 2 over the tree.
const names = buildScriptNames(buildDir);
const read = (name) => readFileSync(join(buildDir, name), 'utf8');
let scanned = 0;
for (const name of names) {
  if (name === HELPER || name === SELF) continue;
  scanned += 1;
  for (const h of simulatorStarts(name, read(name))) {
    fail(
      `build/${h.file}:${String(h.line)} ${h.what}`,
      `Only build/${HELPER} makes, boots, photographs or ends a Simulator, and only inside withSimulator, whose finally and signal handlers shut it down and delete it. Call withSimulator instead.`
    );
  }
}
const users = helperUsers(names, read);
const floorWhy = floorFinding(users.length, SIMULATOR_USER_FLOOR);
if (floorWhy !== null) fail('the population reaching the helper shrank', floorWhy);

if (process.argv.includes('--list')) {
  for (const u of users) process.stdout.write(`${u}\n`);
}

if (failures.length > 0) {
  process.stderr.write('gate:simulator FAIL\n');
  for (const f of failures) process.stderr.write(`  - ${f.what}. ${f.detail}\n`);
  process.exit(1);
}
process.stdout.write(
  `gate:simulator PASS. ${String(scanned)} scripts under build/ read, none makes, boots, photographs or ends a Simulator ` +
    `outside build/${HELPER}; ${String(users.length)} reach it against a floor of ${String(SIMULATOR_USER_FLOOR)}; ` +
    `its teardown is inside a finally and its net covers exit, SIGINT, SIGTERM and SIGHUP; ` +
    `${String(caughtFixtures)} of ${String(FIXTURES.filter((f) => f.caught).length)} bad fixtures caught, ` +
    `${String(FIXTURES.filter((f) => !f.caught).length)} controls left alone, ` +
    `${String(ablationsRed)} of ${String(HELPER_ABLATIONS.length)} helper ablations red.\n`
);
