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
 *      itself, twenty-four of them, thirteen of which must be caught, and the floor is
 *      driven one below itself and at itself. A checker nobody has seen fail is
 *      a checker nobody has seen work.
 *   7. THE HELPER'S PUSH (Phase 316.5). Delivering a notification is a verb
 *      only the helper names too: in a file that names `simctl`, the string
 *      `push` is caught like `boot`, and a whole command line `simctl push …`
 *      is caught in any file. In the helper, the handle's `push` names the
 *      udid the call CREATED as its device and takes no device from its
 *      caller, refuses a bundle id that is not dotted and a body that is not a
 *      JSON object with an `aps` object of at most 4096 bytes before it writes
 *      anything, writes the body 0600, runs the delivery as one of the
 *      handle's owned children, and deletes the file in a `finally`. The verb
 *      appears nowhere else in the helper. Sixteen one-clause ablations, one
 *      or more per clause, prove it, the first being the device check removed.
 *   8. THE HELPER'S FACE ID (Phase 317, build/p317/SPEC.md §6.4). Enrolling
 *      or answering Face ID is a verb only the helper names: in a file that
 *      names `simctl`, the strings `spawn` and `notifyutil` are caught like
 *      `boot`, and a whole command line `simctl spawn …` or `notifyutil -s|-p
 *      …` is caught in any file. In the helper, the handle's `biometry` takes
 *      ONE parameter, the step, and no device; it refuses a step that is not
 *      an own key of `BIOMETRY_STEPS` before it runs anything; it runs
 *      `['simctl', 'spawn', udid, 'notifyutil', …]` with the udid the call
 *      CREATED, as one of the handle's owned children; `BIOMETRY_STEPS` is
 *      exactly `enrol`, `unenrol`, `match` and `nomatch`, each naming
 *      BiometricKit; and neither verb is named anywhere else in the helper.
 *      Six one-clause ablations prove it, the first being the device check
 *      removed.
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
/**
 * Handing a notification to a device (Phase 316.5). It makes and ends
 * nothing, but it names a device, and only the helper's handle may name one:
 * the handle's `push` can only ever name the udid its own call created.
 */
const DELIVERY_VERBS = ['push'];
/**
 * Enrolling or answering Face ID on a device (Phase 317): `simctl spawn` runs
 * `notifyutil` inside it. It makes and ends nothing, but it names a device and
 * runs a program inside it, and only the helper's handle may: the handle's
 * `biometry` names only the udid its own call created, with a closed step.
 */
const BIOMETRY_VERBS = ['spawn', 'notifyutil'];

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
    const delivery = new RegExp(`\\bsimctl\\s+(${DELIVERY_VERBS.join('|')})\\b`).exec(s.text);
    if (delivery !== null) hit(s.at, `a command line delivering a notification with simctl ${delivery[1]}, which is the helper handle's alone`);
    if (/\bsimctl\s+spawn\b/.test(s.text)) hit(s.at, "a command line running a program inside a device with simctl spawn, which is the helper handle's biometry alone");
    if (/\bnotifyutil\s+-[sp]\b/.test(s.text)) hit(s.at, "a command line posting a notification inside a device with notifyutil, which is the helper handle's biometry alone");
    if (new RegExp(`\\bxcodebuild\\b[^\\n]*\\s(${TEST_ACTIONS.join('|')})(\\s|$)`).test(s.text)) {
      hit(s.at, 'a command line running an xcodebuild test, which boots its destination');
    }
    if (namesSimctl) {
      if (DEVICE_VERBS.includes(s.text)) hit(s.at, `the simctl verb '${s.text}'`);
      if (DELIVERY_VERBS.includes(s.text)) hit(s.at, `the simctl verb '${s.text}', which delivers to a device and is the helper handle's alone`);
      if (BIOMETRY_VERBS.includes(s.text)) hit(s.at, `'${s.text}', which runs Face ID's notifications inside a device and is the helper handle's biometry alone`);
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

/** Rules 3, 4, 5 and 7 over the helper's source. Returns findings, empty when it holds. */
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
  out.push(...pushShape(code));
  out.push(...biometryShape(code));
  return out;
}

/**
 * The body of the object method `async <name>(` (a handle's method), braces
 * matched, with its parameter text, or null.
 */
function methodBody(code, name) {
  const m = new RegExp(`\\basync\\s+${name}\\s*\\(`).exec(code);
  if (m === null) return null;
  let depth = 0;
  let i = m.index + m[0].length - 1;
  const paramsFrom = i + 1;
  for (; i < code.length; i += 1) {
    if (code[i] === '(') depth += 1;
    else if (code[i] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const params = code.slice(paramsFrom, i);
  const open = code.indexOf('{', i);
  const body = open === -1 ? null : blockAt(code, open);
  return body === null ? null : { params, body };
}

/**
 * Rule 7 over the helper's comment-stripped source: the handle's `push`
 * (Phase 316.5). Returns findings, empty when it holds.
 */
export function pushShape(code) {
  const out = [];
  const push = methodBody(code, DELIVERY_VERBS[0]);
  if (push === null) return ['the handle declares no push(), so nothing holds where a notification may go.'];
  const params = push.params.split(',').map((p) => p.trim()).filter((p) => p !== '');
  if (params.length !== 2 || /\budid\b|device|target/i.test(push.params)) {
    out.push(`push() takes (${push.params.trim()}), so its caller can name the device; it must take (bundleId, payloadText) and name its own udid.`);
  }
  const argv = /\[\s*['"]simctl['"]\s*,\s*['"]push['"]\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*bundleId\s*,/.exec(push.body);
  if (argv === null) out.push('push() runs no simctl argv of the shape [simctl, push, <device>, bundleId, <file>].');
  else if (argv[1] !== 'udid') out.push(`push() names '${argv[1]}' as its device, not the udid this call created.`);
  const writeAt = push.body.search(/\bwriteFileSync\s*\(/);
  const bundleAt = push.body.search(/\bBUNDLE_ID_RE\.test\s*\(/);
  const bodyAt = push.body.search(/\bpushPayloadRefusal\s*\(/);
  if (writeAt === -1) out.push('push() writes no file for the body.');
  if (bundleAt === -1 || (writeAt !== -1 && bundleAt > writeAt)) out.push('push() does not refuse a bundle id that is not dotted before it writes.');
  if (bodyAt === -1 || (writeAt !== -1 && bodyAt > writeAt)) out.push('push() does not ask pushPayloadRefusal before it writes.');
  const refusal = functionBody(code, 'pushPayloadRefusal');
  if (refusal === null) out.push('the helper declares no pushPayloadRefusal().');
  else {
    if (!/>\s*PUSH_PAYLOAD_MAX_BYTES\b/.test(refusal)) out.push('pushPayloadRefusal() does not refuse a body over PUSH_PAYLOAD_MAX_BYTES.');
    if (!/\.aps\b/.test(refusal) || !/Array\.isArray\s*\(\s*aps\s*\)/.test(refusal)) out.push('pushPayloadRefusal() does not refuse a body whose aps is not an object.');
  }
  if (!/\bPUSH_PAYLOAD_MAX_BYTES\s*=\s*4_?096\s*;/.test(code)) out.push('PUSH_PAYLOAD_MAX_BYTES is not 4096, the most a notification may hold.');
  const write = /\bwriteFileSync\s*\(([^;]*)\);/.exec(push.body);
  if (write !== null && !/\bmode\s*:\s*0o600\b/.test(write[1])) out.push('push() writes the body without mode 0o600.');
  const fin = push.body.lastIndexOf('finally');
  const finBody = fin === -1 ? null : blockAt(push.body, push.body.indexOf('{', fin));
  if (finBody === null || !/\b(?:rmSync|unlinkSync)\s*\(\s*file\b/.test(finBody)) out.push('push() does not delete the body file in a finally.');
  if (!/\brun\s*\([^;]*\bowner\s*:\s*entry\.children\b/.test(push.body)) out.push('push() does not run the delivery as one of the handle\'s owned children.');
  const everywhere = (code.match(/['"]push['"]/g) ?? []).length;
  const inside = (push.body.match(/['"]push['"]/g) ?? []).length;
  if (everywhere !== inside) out.push(`the verb push is named ${String(everywhere - inside)} time(s) in the helper outside the handle's push().`);
  return out;
}

/**
 * Rule 8 over the helper's comment-stripped source: the handle's `biometry`
 * (Phase 317). Returns findings, empty when it holds.
 */
export function biometryShape(code) {
  const out = [];
  const bio = methodBody(code, 'biometry');
  if (bio === null) return ['the handle declares no biometry(), so nothing holds where Face ID may be answered.'];
  const params = bio.params.split(',').map((p) => p.trim()).filter((p) => p !== '');
  if (params.length !== 1 || /\budid\b|device|target/i.test(bio.params)) {
    out.push(`biometry() takes (${bio.params.trim()}), so its caller can name more than a step; it must take (step) and name its own udid.`);
  }
  const argv = /\[\s*['"]simctl['"]\s*,\s*['"]spawn['"]\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*['"]notifyutil['"]\s*,\s*\.\.\.\s*([A-Za-z_$][\w$]*)\s*\]/.exec(bio.body);
  if (argv === null) out.push('biometry() runs no simctl argv of the shape [simctl, spawn, <device>, notifyutil, ...<step arguments>].');
  else if (argv[1] !== 'udid') out.push(`biometry() names '${argv[1]}' as its device, not the udid this call created.`);
  const runAt = bio.body.search(/\brun\s*\(/);
  const checkAt = bio.body.search(/\bObject\.hasOwn\s*\(\s*BIOMETRY_STEPS\s*,\s*step\s*\)/);
  if (checkAt === -1 || (runAt !== -1 && checkAt > runAt)) out.push('biometry() does not refuse a step that is not one of BIOMETRY_STEPS before it runs anything.');
  if (!/\bof\s+BIOMETRY_STEPS\s*\[\s*step\s*\]/.test(bio.body)) out.push('biometry() does not take its notifyutil arguments from BIOMETRY_STEPS[step].');
  if (!/\brun\s*\([^;]*\bowner\s*:\s*entry\.children\b/.test(bio.body)) out.push("biometry() does not run its steps as the handle's owned children.");
  const table = /\bBIOMETRY_STEPS\s*=\s*Object\.freeze\(\s*\{/.exec(code);
  if (table === null) out.push('the helper declares no frozen BIOMETRY_STEPS table.');
  else {
    const body = blockAt(code, code.indexOf('{', table.index)) ?? '';
    const keys = [...body.matchAll(/(?:^|\n)\s*([A-Za-z]+)\s*:\s*Object\.freeze\(\s*\[/g)].map((m) => m[1]).sort();
    if (keys.join(',') !== 'enrol,match,nomatch,unenrol') out.push(`BIOMETRY_STEPS holds the steps ${keys.join(', ') || 'none'}; the closed set is enrol, unenrol, match and nomatch.`);
    for (const m of body.matchAll(/['"](com\.[^'"]*)['"]/g)) {
      if (!m[1].startsWith('com.apple.BiometricKit')) out.push(`BIOMETRY_STEPS names ${m[1]}, which is not BiometricKit's.`);
    }
  }
  for (const verb of BIOMETRY_VERBS) {
    const re = new RegExp(`['"]${verb}['"]`, 'g');
    const everywhere = (code.match(re) ?? []).length;
    const inside = (bio.body.match(re) ?? []).length;
    if (everywhere !== inside) out.push(`the verb ${verb} is named ${String(everywhere - inside)} time(s) in the helper outside the handle's biometry().`);
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
const PUSH = V('pu|sh');
const SPAWN = V('spa|wn');
const NOTIFY = V('notify|util');

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
  },
  {
    name: 'a notification delivered in argv, outside the helper',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${PUSH}', udid, 'com.x.y', 'p.json']);\n`
  },
  {
    name: 'a notification delivered as a whole command line',
    caught: true,
    text: `import { execSync } from 'node:child_process';\nexecSync('xcrun ${SIM} ${PUSH} 1234 com.x.y p.json');\n`
  },
  {
    name: 'a notification handed to the helper handle',
    caught: false,
    user: true,
    text: `import { withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x' }, (sim) => sim.${PUSH}('com.x.y', '{"aps":{}}'));\n`
  },
  {
    name: 'an array grown in a file that names the tool',
    caught: false,
    text: `const tool = '${SIM}';\nconst rows = [];\nrows.${PUSH}(tool);\n`
  },
  {
    name: 'Face ID answered in argv, outside the helper',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${SPAWN}', udid, '${NOTIFY}', '-p', 'com.apple.BiometricKit_Sim.pearl.match']);\n`
  },
  {
    name: 'Face ID enrolled as a whole command line',
    caught: true,
    text: `import { execSync } from 'node:child_process';\nexecSync('xcrun ${SIM} ${SPAWN} 1234 ${NOTIFY} -s com.apple.BiometricKit.enrollmentChanged 1');\n`
  },
  {
    name: 'the Face ID program held in a variable',
    caught: true,
    text: `const tool = '${SIM}';\nconst inside = '${NOTIFY}';\nrunIn(tool, udid, inside, '-p', 'com.apple.BiometricKit_Sim.pearl.nomatch');\n`
  },
  {
    name: 'Face ID answered through the helper handle',
    caught: false,
    user: true,
    text: `import { withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x' }, (sim) => sim.biometry('match'));\n`
  },
  {
    name: 'node spawn imported in a file that never names the tool',
    caught: false,
    text: `import { ${SPAWN} } from 'node:child_process';\nconst names = ['${SPAWN}', 'exec'];\n`
  }
];

/** Helper shapes that rules 3 to 5 and 7 must refuse, each a one-clause ablation. */
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
  { what: "a foreign target named in the helper", edit: (src) => src.replace("['simctl', 'shutdown', udid]", `['simctl', 'shutdown', '${BOOT}ed']`) },
  // Rule 7, the handle's push (Phase 316.5). The first is the one SPEC §5.8
  // names: the device check removed, so a caller could name any device.
  {
    what: 'the push device check removed: a caller names the device',
    edit: (src) =>
      src
        .replace('async push(bundleId, payloadText) {', 'async push(bundleId, payloadText, device = udid) {')
        .replace("['simctl', 'push', udid, bundleId, file]", "['simctl', 'push', device, bundleId, file]")
  },
  {
    what: 'the push size refusal removed',
    edit: (src) => src.replace('  if (bytes > PUSH_PAYLOAD_MAX_BYTES) {', '  if (false) {')
  },
  { what: 'the push body file left behind', edit: (src) => src.replace('          rmSync(file, { force: true });\n', '          void file;\n') },
  { what: 'the push body written readable by others', edit: (src) => src.replace("{ encoding: 'utf8', mode: 0o600 }", "{ encoding: 'utf8', mode: 0o644 }") },
  {
    what: 'the push delivery not owned by the handle',
    edit: (src) => src.replace("['simctl', 'push', udid, bundleId, file], { timeoutMs: 60_000, owner: entry.children }", "['simctl', 'push', udid, bundleId, file], { timeoutMs: 60_000 }")
  },
  // One more per clause of rule 7, so no clause of it is one nobody has seen
  // fail. The two halves of the first, each on its own: a parameter a caller
  // could fill, and a device named by something other than the udid.
  { what: 'the push taking a third parameter', edit: (src) => src.replace('async push(bundleId, payloadText) {', 'async push(bundleId, payloadText, extra) {') },
  { what: 'the push naming the device by its name', edit: (src) => src.replace("['simctl', 'push', udid, bundleId, file]", "['simctl', 'push', name, bundleId, file]") },
  { what: 'the handle has no push()', edit: (src) => src.replace('async push(bundleId, payloadText) {', 'async deliver(bundleId, payloadText) {') },
  {
    what: 'the push argv in another shape',
    edit: (src) => src.replace("['simctl', 'push', udid, bundleId, file]", "['simctl', 'push', udid, file, bundleId]")
  },
  { what: 'the push body never written', edit: (src) => src.replace("writeFileSync(file, payloadText, { encoding: 'utf8', mode: 0o600 });", 'void payloadText;') },
  {
    what: 'the push bundle id not checked',
    edit: (src) => src.replace("if (typeof bundleId !== 'string' || !BUNDLE_ID_RE.test(bundleId)) {", 'if (typeof bundleId !== \'string\') {')
  },
  { what: 'the push body not asked about', edit: (src) => src.replace('const why = pushPayloadRefusal(payloadText);', 'const why = null;') },
  { what: 'the push refusal not declared', edit: (src) => src.replace('export function pushPayloadRefusal(payloadText) {', 'export function payloadRefusal(payloadText) {') },
  {
    what: 'the push aps check removed',
    edit: (src) => src.replace("  if (aps === null || typeof aps !== 'object' || Array.isArray(aps)) return 'the notification body has no aps object.';\n", '')
  },
  { what: 'the push cap raised', edit: (src) => src.replace('export const PUSH_PAYLOAD_MAX_BYTES = 4096;', 'export const PUSH_PAYLOAD_MAX_BYTES = 8192;') },
  { what: 'push added to the verbs a handle runs for its caller', edit: (src) => src.replace("  'listapps'\n]);", "  'listapps',\n  'push'\n]);") },
  // Rule 8, the handle's Face ID (Phase 317). The first is the one that
  // matters most: the device check removed, so a caller could name any device.
  {
    what: 'the biometry device check removed: a caller names the device',
    edit: (src) =>
      src
        .replace('async biometry(step) {', 'async biometry(step, device = udid) {')
        .replace("['simctl', 'spawn', udid, 'notifyutil', ...notify]", "['simctl', 'spawn', device, 'notifyutil', ...notify]")
  },
  {
    what: 'the biometry step not checked against the closed set',
    edit: (src) => src.replace("if (typeof step !== 'string' || !Object.hasOwn(BIOMETRY_STEPS, step)) {", "if (typeof step !== 'string') {")
  },
  {
    what: 'the biometry steps not owned by the handle',
    edit: (src) => src.replace("['simctl', 'spawn', udid, 'notifyutil', ...notify], { timeoutMs: 30_000, owner: entry.children }", "['simctl', 'spawn', udid, 'notifyutil', ...notify], { timeoutMs: 30_000 }")
  },
  {
    what: 'a fifth Face ID step that is not a closed one',
    edit: (src) => src.replace("  nomatch: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.pearl.nomatch'])])\n});", "  nomatch: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.pearl.nomatch'])]),\n  any: Object.freeze([Object.freeze(['-p', 'com.apple.springboard.lockstate'])])\n});")
  },
  {
    what: 'spawn named in the helper outside biometry',
    edit: (src) => src.replace("  'listapps'\n]);", "  'listapps',\n  'spawn'\n]);")
  },
  { what: 'the handle has no biometry()', edit: (src) => src.replace('async biometry(step) {', 'async faceId(step) {') }
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

// Rules 3 to 5 and 7 over the real helper, then over one-clause ablations of it.
const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
for (const why of helperShape(helperSource)) fail(`build/${HELPER}: ${why}`, 'The device this helper makes could outlive the script that made it.');
let ablationsRed = 0;
for (const a of HELPER_ABLATIONS) {
  const edited = a.edit(helperSource);
  if (edited === helperSource) {
    fail(`the helper ablation "${a.what}" found nothing to edit`, 'Its anchor is gone from the helper, so this gate no longer proves that clause. Re-point it.');
    continue;
  }
  if (helperShape(edited).length === 0) fail(`the helper ablation "${a.what}" left rules 3 to 5 and 7 green`, 'That clause is not asserted by anything.');
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
    `its handle's push and biometry name only the device its call created; ` +
    `${String(caughtFixtures)} of ${String(FIXTURES.filter((f) => f.caught).length)} bad fixtures caught, ` +
    `${String(FIXTURES.filter((f) => !f.caught).length)} controls left alone, ` +
    `${String(ablationsRed)} of ${String(HELPER_ABLATIONS.length)} helper ablations red.\n`
);
