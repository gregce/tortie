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
 *      itself, thirty-three of them, eighteen of which must be caught, and the floor is
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
 *      removed. PHASE 333.4 WIDENED IT for Touch ID (build/p3334/SPEC.md
 *      §5.2): the loop iterates `notifies`, assigned exactly once as
 *      `biometryKind === 'touchID' && Object.hasOwn(TOUCH_ID_ANSWERS, step) ?
 *      TOUCH_ID_ANSWERS[step] : BIOMETRY_STEPS[step]`; the step check AND the
 *      refusal of a device of neither kind both come before the first `run(`;
 *      `BIOMETRY_STEPS`' `match` and `nomatch` post exactly Face ID's
 *      `com.apple.BiometricKit_Sim.pearl.<step>`; and `TOUCH_ID_ANSWERS` is a
 *      frozen table of exactly `match` and `nomatch`, each posting exactly
 *      Touch ID's `com.apple.BiometricKit_Sim.fingerTouch.<step>` and nothing
 *      else. Eight one-clause ablations prove the widening, the first being
 *      the kind test dropped, which no drive can see: the Simulator answers
 *      either name on either kind (SPEC D5), so this rule is the only proof
 *      that a Touch ID device is answered by Touch ID's name.
 *   9. THE HELPER'S PASTEBOARD (Phase 337, build/p337/SPEC.md §6.5 and §7.8
 *      PS6). Reading a device's pasteboard is a verb only the helper names: in
 *      a file that names `simctl`, the strings `pbpaste`, `pbcopy` and
 *      `pbsync` are caught like `boot`, and a whole command line `simctl
 *      pbpaste …` (or `pbcopy`, `pbsync`) is caught in any file. The Mac's own
 *      `pbpaste`, in a file that never names `simctl`, is not a device and is
 *      left alone. In the helper, the handle's `pasteboard` takes NO parameter,
 *      runs exactly `['simctl', 'pbpaste', udid]` with the udid the call
 *      CREATED as one of the handle's owned children, and neither writes a
 *      pasteboard (`pbcopy`, `pbsync`) nor names `pbpaste` anywhere else in
 *      the helper. Five one-clause ablations prove it, the first being the
 *      device check removed.
 *  10. A DEVICE'S BIOMETRY IS ITS DEVICE TYPE'S (Phase 333.4,
 *      build/p3334/SPEC.md §5.2). In `withSimulator`, `biometryKind` is
 *      assigned once in the whole helper (compound assignments counted), as
 *      `biometryOf(<read>.code === 0 ? parseJson(<read>.stdout)?.capabilities
 *      : null)` over `<read>`, the `plutil -convert json -o -` read of
 *      `Contents/Resources/capabilities.plist` under the `bundlePath` of the
 *      row `pickDeviceType` picked, and both the read and the assignment come
 *      BEFORE the `'create'` run. So nothing a caller hands in decides it: the
 *      caller's `options` cannot reach that shape. The handle exposes
 *      `biometryKind` and `deviceType` as getters, read only. And
 *      `biometryOf` is DRIVEN twice over eight capabilities (the SPEC's six,
 *      then the two shapes every real device type has, which name both keys
 *      with the other `false`): as the helper exports it, imported here, and
 *      as its own text compiled, so an ablation of the text is driven rather
 *      than read. Nine one-clause ablations prove it. Since the fix round the
 *      read's ONE condition is the bundle path guard and its statement names
 *      no `options`, so a caller cannot switch the read off either (which left
 *      every caller naming no device type with a null kind and a refused
 *      `biometry()`, probe:p316 among them, with this gate green); two more
 *      ablations prove it, eleven in all.
 *
 * ## Phase 333.4, the devices App Review uses
 *
 * build/simulator-run.mjs gained the iPad Air 11-inch (M3) and the iPhone SE
 * (3rd generation) as named device types, a kind read from each device type's
 * own capabilities.plist, and Touch ID's own answers. Rules 8 and 10 hold them;
 * the fixtures gained an iPad and a Touch ID answer through the helper (two
 * controls) and both outside it (two caught); the floor rose to 3 for
 * build/p3334/probe-p3334.mjs.
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
 * so nothing that builds can skip it. Since Phase 333.4 it imports the
 * helper's pure `biometryOf`; the helper creates, spawns and installs nothing
 * on import, so that changes neither.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildScriptNames } from './build-scripts.mjs';
import { blockAt, lineAt, stripComments } from './scan-source.mjs';
// Phase 333.4: the one function rule 10 drives, imported from the helper. The
// helper creates nothing on import, so this gate still spawns nothing.
import { biometryOf } from './simulator-run.mjs';

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
 * tests). PHASE 333.4 RAISED IT TO 3 for build/p3334/probe-p3334.mjs
 * (`probe:p3334`, the app driven on the devices App Review uses: the iPad, a
 * Touch ID iPhone and an iPhone with nothing enrolled). PHASE 345 RAISED IT
 * TO 4 for build/p345/probe-p345.mjs (`probe:p345`, one iPhone and several
 * Macs: the order device on iOS 26.3 and the floor device on 18.3, one at a
 * time, the parent's app installed over HEAD's and back through the handle's
 * own `install`). RAISE IT WHEN YOU ADD ONE, in the same commit: adding a script cannot turn this gate red, so a
 * floor left where it was would let the new one be deleted again in silence.
 */
export const SIMULATOR_USER_FLOOR = 4;

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
/**
 * Reading or writing a device's pasteboard (Phase 337, PS6). It makes and
 * ends nothing, but it names a device, and only the helper's handle may: the
 * handle's `pasteboard` reads (`pbpaste`) only the udid its own call created,
 * and nothing in build/ writes one.
 */
const PASTEBOARD_VERBS = ['pbpaste', 'pbcopy', 'pbsync'];

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
    const board = new RegExp(`\\bsimctl\\s+(${PASTEBOARD_VERBS.join('|')})\\b`).exec(s.text);
    if (board !== null) hit(s.at, `a command line naming simctl ${board[1]}, a device's pasteboard, which is the helper handle's pasteboard alone`);
    if (new RegExp(`\\bxcodebuild\\b[^\\n]*\\s(${TEST_ACTIONS.join('|')})(\\s|$)`).test(s.text)) {
      hit(s.at, 'a command line running an xcodebuild test, which boots its destination');
    }
    if (namesSimctl) {
      if (DEVICE_VERBS.includes(s.text)) hit(s.at, `the simctl verb '${s.text}'`);
      if (DELIVERY_VERBS.includes(s.text)) hit(s.at, `the simctl verb '${s.text}', which delivers to a device and is the helper handle's alone`);
      if (BIOMETRY_VERBS.includes(s.text)) hit(s.at, `'${s.text}', which runs Face ID's notifications inside a device and is the helper handle's biometry alone`);
      if (PASTEBOARD_VERBS.includes(s.text)) hit(s.at, `the simctl verb '${s.text}', a device's pasteboard, which is the helper handle's pasteboard alone`);
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

/** Rules 3, 4, 5, 7, 8, 9 and 10 over the helper's source. Returns findings, empty when it holds. */
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
  out.push(...pasteboardShape(code));
  out.push(...deviceKindShape(code));
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
 * The entries of a frozen table `<name> = Object.freeze({ key: Object.freeze([
 * … ]), … })` in comment-stripped source, as a map from each key to the string
 * literals its entry holds, in order; or null when no such frozen table is
 * declared.
 */
function frozenTable(code, name) {
  const table = new RegExp(`\\b${name}\\s*=\\s*Object\\.freeze\\(\\s*\\{`).exec(code);
  if (table === null) return null;
  const body = blockAt(code, code.indexOf('{', table.index)) ?? '';
  const keys = [...body.matchAll(/(?:^|\n)\s*([A-Za-z]+)\s*:\s*Object\.freeze\(\s*\[/g)];
  const entries = new Map();
  keys.forEach((m, i) => {
    const end = i + 1 < keys.length ? keys[i + 1].index : body.length;
    entries.set(m[1], literals(body.slice(m.index, end)).map((l) => l.text));
  });
  return entries;
}

/**
 * Every assignment to the identifier `name`, compound ones included (`??=`,
 * `||=`, `+=` and the rest), and never a comparison (`===`, `!==`, `<=`, `>=`).
 */
function assignmentsTo(text, name) {
  return (text.match(new RegExp(`\\b${name}\\s*(?:\\?\\?|\\|\\||&&|\\*\\*|<<|>>>?|[-+*/%&|^])?=(?!=)`, 'g')) ?? []).length;
}

/** BiometricKit's answer names: Face ID's `pearl` and Touch ID's `fingerTouch` (Phase 333.4). */
const FACE_ID_ANSWER = 'com.apple.BiometricKit_Sim.pearl.';
const TOUCH_ID_ANSWER = 'com.apple.BiometricKit_Sim.fingerTouch.';

/**
 * The one statement that chooses a step's arguments (Phase 333.4,
 * build/p3334/SPEC.md §5.1.6): Touch ID's own answer on a Touch ID device, and
 * the closed Face ID table for everything else.
 */
const NOTIFIES_RE =
  /\bconst\s+notifies\s*=\s*biometryKind\s*===\s*['"]touchID['"]\s*&&\s*Object\.hasOwn\s*\(\s*TOUCH_ID_ANSWERS\s*,\s*step\s*\)\s*\?\s*TOUCH_ID_ANSWERS\s*\[\s*step\s*\]\s*:\s*BIOMETRY_STEPS\s*\[\s*step\s*\]\s*;/;

/**
 * Rule 8 over the helper's comment-stripped source: the handle's `biometry`
 * (Phase 317, widened by Phase 333.4 for Touch ID). Returns findings, empty
 * when it holds.
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
  // Phase 333.4: a device of neither kind is refused before anything runs.
  const nullAt = bio.body.search(/\bif\s*\(\s*biometryKind\s*===\s*null\s*\)\s*\{\s*throw\s+new\s+Error\s*\(/);
  if (nullAt === -1 || (runAt !== -1 && nullAt > runAt)) out.push('biometry() does not refuse a device that has neither Face ID nor Touch ID before it runs anything.');
  // Phase 333.4: the loop iterates `notifies`, chosen once by the kind.
  if (!/\bof\s+notifies\s*\)/.test(bio.body)) out.push('biometry() does not take its notifyutil arguments from notifies, the one choice of table.');
  const chosen = assignmentsTo(bio.body, 'notifies');
  if (chosen !== 1 || !NOTIFIES_RE.test(bio.body)) {
    out.push(
      "biometry() does not choose its arguments once, as biometryKind === 'touchID' && Object.hasOwn(TOUCH_ID_ANSWERS, step) ? " +
        'TOUCH_ID_ANSWERS[step] : BIOMETRY_STEPS[step], so a Touch ID device could be answered by Face ID\'s name.'
    );
  }
  if (!/\brun\s*\([^;]*\bowner\s*:\s*entry\.children\b/.test(bio.body)) out.push("biometry() does not run its steps as the handle's owned children.");
  const steps = frozenTable(code, 'BIOMETRY_STEPS');
  if (steps === null) out.push('the helper declares no frozen BIOMETRY_STEPS table.');
  else {
    const keys = [...steps.keys()].sort();
    if (keys.join(',') !== 'enrol,match,nomatch,unenrol') out.push(`BIOMETRY_STEPS holds the steps ${keys.join(', ') || 'none'}; the closed set is enrol, unenrol, match and nomatch.`);
    for (const strings of steps.values()) {
      for (const t of strings) {
        if (t.startsWith('com.') && !t.startsWith('com.apple.BiometricKit')) out.push(`BIOMETRY_STEPS names ${t}, which is not BiometricKit's.`);
      }
    }
    // Phase 333.4: its answers are Face ID's own, each for its own step.
    for (const key of ['match', 'nomatch']) {
      const got = steps.get(key);
      if (got !== undefined && JSON.stringify(got) !== JSON.stringify(['-p', `${FACE_ID_ANSWER}${key}`])) {
        out.push(`BIOMETRY_STEPS.${key} posts ${got.join(' ')}; Face ID's ${key} is -p ${FACE_ID_ANSWER}${key} and nothing else.`);
      }
    }
  }
  const touch = frozenTable(code, 'TOUCH_ID_ANSWERS');
  if (touch === null) out.push('the helper declares no frozen TOUCH_ID_ANSWERS table, so a Touch ID device has no answer of its own.');
  else {
    const keys = [...touch.keys()].sort();
    if (keys.join(',') !== 'match,nomatch') out.push(`TOUCH_ID_ANSWERS holds ${keys.join(', ') || 'nothing'}; it holds exactly match and nomatch, because enrolment is the one notification both kinds share.`);
    for (const [key, got] of touch) {
      if (JSON.stringify(got) !== JSON.stringify(['-p', `${TOUCH_ID_ANSWER}${key}`])) {
        out.push(`TOUCH_ID_ANSWERS.${key} posts ${got.join(' ')}; Touch ID's ${key} is -p ${TOUCH_ID_ANSWER}${key} and nothing else.`);
      }
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

/**
 * Rule 10's capabilities and what each must answer (Phase 333.4,
 * build/p3334/SPEC.md §5.2): the six the SPEC names, then the two shapes every
 * real device type has, which name BOTH keys with the other one `false`. The
 * last two are why a reading that asked for the other key to be ABSENT would
 * fail here: it answers the six and null on every device on this Mac.
 */
export const BIOMETRY_OF_FIXTURES = Object.freeze([
  Object.freeze({ why: 'Face ID alone', capabilities: { 'pearl-id': true }, want: 'faceID' }),
  Object.freeze({ why: 'Touch ID alone', capabilities: { 'touch-id': true }, want: 'touchID' }),
  Object.freeze({ why: 'both', capabilities: { 'pearl-id': true, 'touch-id': true }, want: null }),
  Object.freeze({ why: 'neither', capabilities: {}, want: null }),
  Object.freeze({ why: 'no dictionary at all', capabilities: null, want: null }),
  Object.freeze({ why: 'a number where the boolean belongs', capabilities: { 'pearl-id': 1 }, want: null }),
  Object.freeze({ why: "the iPhone 16 Pro's own shape", capabilities: { 'pearl-id': true, 'touch-id': false }, want: 'faceID' }),
  Object.freeze({ why: "the iPad Air 11-inch (M3)'s and the iPhone SE's own shape", capabilities: { 'pearl-id': false, 'touch-id': true }, want: 'touchID' })
]);

/** Rule 10's drive of one `biometryOf`, the helper's imported one or its text. Findings, empty when it holds. */
export function biometryOfFindings(fn, where) {
  const out = [];
  for (const f of BIOMETRY_OF_FIXTURES) {
    let got;
    try {
      got = fn(f.capabilities);
    } catch (err) {
      out.push(`${where} threw on ${f.why}: ${String(err?.message ?? err)}.`);
      continue;
    }
    if (got !== f.want) out.push(`${where} answered ${JSON.stringify(got)} for ${f.why}, where the device type's own answer is ${JSON.stringify(f.want)}.`);
  }
  return out;
}

/**
 * `biometryOf` compiled from the helper's own text, so an ablation of its text
 * is driven rather than read. It is pure and self-contained by its own
 * header's promise, which this compile also holds: a body naming anything
 * outside itself throws when it runs and reads as a finding.
 */
function biometryOfFromText(code) {
  const m = /\bexport\s+function\s+biometryOf\s*\(([^)]*)\)\s*\{/.exec(code);
  if (m === null) return null;
  const body = blockAt(code, m.index + m[0].length - 1);
  if (body === null) return null;
  try {
    return new Function(m[1], body);
  } catch {
    return null;
  }
}

/**
 * The read rule 10 asks for: plutil over capabilities.plist in the PICKED type's own bundle. Group 2 is
 * everything between the `=` and the `await run(`, which rule 10 holds to the bundle path guard alone.
 */
const CAPABILITIES_READ_RE =
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=([^;]*?)\bawait\s+run\s*\(\s*['"]plutil['"]\s*,\s*\[\s*['"]-convert['"]\s*,\s*['"]json['"]\s*,\s*['"]-o['"]\s*,\s*['"]-['"]\s*,\s*join\s*\(\s*deviceType\.bundlePath\s*,\s*['"]Contents['"]\s*,\s*['"]Resources['"]\s*,\s*['"]capabilities\.plist['"]\s*\)\s*\]/;

/** Rule 10's one admitted condition on the capabilities read: simctl named an absolute bundle path. */
const CAPABILITIES_GUARD_RE =
  /^\s*typeof\s+deviceType\.bundlePath\s*===\s*['"]string['"]\s*&&\s*deviceType\.bundlePath\.startsWith\s*\(\s*['"]\/['"]\s*\)\s*\?\s*$/;

/**
 * Rule 10 over the helper's comment-stripped source (Phase 333.4,
 * build/p3334/SPEC.md §5.2): a device's biometry is its device type's. Returns
 * findings, empty when it holds.
 */
export function deviceKindShape(code) {
  const out = [];
  const body = functionBody(code, 'withSimulator');
  if (body === null) return ['withSimulator is not declared in the helper.'];
  if (!/\bconst\s+deviceType\s*=\s*pickDeviceType\s*\(/.test(body)) {
    out.push("withSimulator's deviceType is not the row pickDeviceType picked from simctl's own list, so nothing says whose capabilities.plist is read.");
  }
  const read = CAPABILITIES_READ_RE.exec(body);
  if (read === null) {
    out.push("withSimulator does not read Contents/Resources/capabilities.plist in the picked device type's own bundlePath with plutil -convert json, so the device's biometry is not its type's.");
  } else {
    // The fix round (Phase 333.4's attack lens): the read is made whatever the
    // caller handed in. Its one condition is the bundle path guard, and the
    // whole statement names no `options`, so no caller can switch the read off
    // (and the kind to null) or stand in for it.
    if (!CAPABILITIES_GUARD_RE.test(read[2])) {
      out.push(`withSimulator makes its capabilities read on a condition other than the bundle path guard (${read[2].trim().slice(0, 120)}), so something besides the device type decides whether the kind is read at all.`);
    }
    const statementEnd = body.indexOf(';', read.index);
    const statement = statementEnd === -1 ? body.slice(read.index) : body.slice(read.index, statementEnd);
    if (/\boptions\b/.test(statement)) {
      out.push("withSimulator's capabilities read names the caller's options, so a caller can reach the device's biometry.");
    }
  }
  const kind =
    read === null
      ? null
      : new RegExp(
          `\\bconst\\s+biometryKind\\s*=\\s*biometryOf\\s*\\(\\s*${read[1]}\\.code\\s*===\\s*0\\s*\\?\\s*parseJson\\s*\\(\\s*${read[1]}\\.stdout\\s*\\)\\s*\\?\\.\\s*capabilities\\s*:\\s*null\\s*\\)\\s*;`
        ).exec(body);
  if (read !== null && kind === null) {
    out.push('withSimulator does not take biometryKind from biometryOf over that read and nothing else, so something other than the device type decides it.');
  }
  const assigned = assignmentsTo(code, 'biometryKind');
  if (assigned !== 1) out.push(`biometryKind is assigned ${String(assigned)} time(s) in the helper; it is assigned once, from the device type's own read.`);
  const createAt = body.search(/['"]create['"]/);
  if (createAt === -1) out.push('withSimulator runs no create, so rule 10 cannot say the kind is read before it.');
  else {
    if (read !== null && read.index > createAt) out.push('withSimulator reads the capabilities AFTER the create, so a device exists before its biometry is known.');
    if (kind !== null && kind.index > createAt) out.push('withSimulator decides biometryKind AFTER the create.');
  }
  if (!/\bget\s+biometryKind\s*\(\s*\)\s*\{\s*return\s+biometryKind\s*;?\s*\}/.test(body)) {
    out.push("the handle does not expose biometryKind read only, as a getter of the kind the device type's read decided.");
  }
  if (!/\bget\s+deviceType\s*\(\s*\)\s*\{\s*return\s+(?:String\s*\(\s*deviceType\.name\s*\)|deviceTypeName)\s*;?\s*\}/.test(body)) {
    out.push('the handle does not expose deviceType read only, as a getter of the device type it was made from.');
  }
  const fromText = biometryOfFromText(code);
  if (fromText === null) out.push('the helper declares no biometryOf(capabilities) this gate can drive.');
  else out.push(...biometryOfFindings(fromText, "the helper's biometryOf"));
  return out;
}

/**
 * Rule 9 over the helper's comment-stripped source: the handle's `pasteboard`
 * (Phase 337). Returns findings, empty when it holds.
 */
export function pasteboardShape(code) {
  const out = [];
  const board = methodBody(code, 'pasteboard');
  if (board === null) return ['the handle declares no pasteboard(), so nothing holds whose pasteboard may be read.'];
  if (board.params.trim() !== '') {
    out.push(`pasteboard() takes (${board.params.trim()}), so its caller can name something; it must take nothing and read its own udid.`);
  }
  const argv = /\[\s*['"]simctl['"]\s*,\s*['"]pbpaste['"]\s*,\s*([A-Za-z_$][\w$]*)\s*\]/.exec(board.body);
  if (argv === null) out.push('pasteboard() runs no simctl argv of the shape [simctl, pbpaste, <device>].');
  else if (argv[1] !== 'udid') out.push(`pasteboard() names '${argv[1]}' as its device, not the udid this call created.`);
  if (!/\brun\s*\([^;]*\bowner\s*:\s*entry\.children\b/.test(board.body)) out.push("pasteboard() does not run its read as one of the handle's owned children.");
  for (const verb of PASTEBOARD_VERBS) {
    const re = new RegExp(`['"]${verb}['"]`, 'g');
    const everywhere = (code.match(re) ?? []).length;
    const inside = verb === 'pbpaste' ? (board.body.match(re) ?? []).length : 0;
    if (everywhere !== inside) {
      out.push(
        verb === 'pbpaste'
          ? `the verb pbpaste is named ${String(everywhere - inside)} time(s) in the helper outside the handle's pasteboard().`
          : `the helper names ${verb}, which writes a device's pasteboard; the handle only reads one.`
      );
    }
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
const PBPASTE = V('pb|paste');
const PBCOPY = V('pb|copy');

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
  },
  {
    name: "a device's pasteboard read in argv, outside the helper",
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${PBPASTE}', udid]);\n`
  },
  {
    name: "the booted device's pasteboard read as a whole command line",
    caught: true,
    text: `import { execSync } from 'node:child_process';\nexecSync('xcrun ${SIM} ${PBPASTE} ${BOOT}ed');\n`
  },
  {
    name: "a device's pasteboard written in argv, outside the helper",
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${PBCOPY}', udid], { input: 'x' });\n`
  },
  {
    name: "a device's pasteboard read through the helper handle",
    caught: false,
    user: true,
    text: `import { withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x' }, (sim) => sim.pasteboard());\n`
  },
  {
    name: "the Mac's own pasteboard in a file that never names the tool",
    caught: false,
    text: `import { execFileSync } from 'node:child_process';\nexecFileSync('${PBPASTE}', []);\n`
  },
  // Phase 333.4: another device type and Touch ID, through the helper and not.
  {
    name: 'an iPad made through the helper',
    caught: false,
    user: true,
    text: `import { withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x', deviceType: 'iPad Air 11-inch (M3)' }, async (sim) => sim.udid);\n`
  },
  {
    name: 'Touch ID answered through the helper handle',
    caught: false,
    user: true,
    text: `import { DEVICE_TYPE_TOUCH_ID, withSimulator } from './${HELPER}';\nawait withSimulator({ label: 'x', deviceType: DEVICE_TYPE_TOUCH_ID }, (sim) => sim.biometry('match'));\n`
  },
  {
    name: 'Touch ID answered in argv outside the helper',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${SPAWN}', udid, '${NOTIFY}', '-p', 'com.apple.BiometricKit_Sim.fingerTouch.match']);\n`
  },
  {
    name: 'an iPad made in argv outside the helper',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('xcrun', ['${SIM}', '${MAKE}', 'p316-x', 'com.apple.CoreSimulator.SimDeviceType.iPad-Air-11-inch-M3', rt]);\n`
  }
];

/** The refusal of a device of neither kind, as `biometry()` spells it (Phase 333.4). */
const NEITHER_REFUSAL = /\n {8}if \(biometryKind === null\) \{\n {10}throw [^\n]*\n {8}\}\n/;

/** Helper shapes that rules 3 to 5 and 7 to 10 must refuse, each a one-clause ablation. */
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
  { what: 'the handle has no biometry()', edit: (src) => src.replace('async biometry(step) {', 'async faceId(step) {') },
  // Rule 9, the handle's pasteboard (Phase 337). The first is the one that
  // matters most: the device check removed, so a caller could name any device.
  {
    what: 'the pasteboard device check removed: a caller names the device',
    edit: (src) =>
      src
        .replace('async pasteboard() {', 'async pasteboard(device = udid) {')
        .replace("['simctl', 'pbpaste', udid]", "['simctl', 'pbpaste', device]")
  },
  { what: 'the pasteboard read of the booted device', edit: (src) => src.replace("['simctl', 'pbpaste', udid]", `['simctl', 'pbpaste', '${BOOT}ed']`) },
  {
    what: 'the pasteboard read not owned by the handle',
    edit: (src) => src.replace("['simctl', 'pbpaste', udid], { timeoutMs: 30_000, owner: entry.children }", "['simctl', 'pbpaste', udid], { timeoutMs: 30_000 }")
  },
  { what: 'the pasteboard written as well as read', edit: (src) => src.replace("['simctl', 'pbpaste', udid]", "['simctl', 'pbcopy', udid]") },
  { what: 'the handle has no pasteboard()', edit: (src) => src.replace('async pasteboard() {', 'async clipboard() {') },
  // Rule 8 widened (Phase 333.4): Touch ID answered by its own name. The
  // first is the one that matters most, and the one no drive can see, because
  // the Simulator answers either name on either kind (build/p3334/SPEC.md D5).
  {
    what: "the kind test dropped: Face ID's name posted on a Touch ID device",
    edit: (src) =>
      src.replace(
        "const notifies = biometryKind === 'touchID' && Object.hasOwn(TOUCH_ID_ANSWERS, step) ? TOUCH_ID_ANSWERS[step] : BIOMETRY_STEPS[step];",
        'const notifies = BIOMETRY_STEPS[step];'
      )
  },
  { what: 'the biometry loop not iterating the chosen table', edit: (src) => src.replace('for (const notify of notifies) {', 'for (const notify of BIOMETRY_STEPS[step]) {') },
  {
    what: 'a third key in TOUCH_ID_ANSWERS',
    edit: (src) =>
      src.replace(
        "  nomatch: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.nomatch'])])\n});",
        "  nomatch: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.nomatch'])]),\n  enrol: Object.freeze([Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.enrol'])])\n});"
      )
  },
  {
    what: "a Touch ID answer swapped for Face ID's name",
    edit: (src) => src.replace("Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.match'])", "Object.freeze(['-p', 'com.apple.BiometricKit_Sim.pearl.match'])")
  },
  {
    what: "a Face ID answer swapped for Touch ID's name",
    edit: (src) => src.replace("Object.freeze(['-p', 'com.apple.BiometricKit_Sim.pearl.nomatch'])", "Object.freeze(['-p', 'com.apple.BiometricKit_Sim.fingerTouch.nomatch'])")
  },
  { what: 'TOUCH_ID_ANSWERS not frozen', edit: (src) => src.replace('export const TOUCH_ID_ANSWERS = Object.freeze({', 'export const TOUCH_ID_ANSWERS = ({') },
  { what: 'the refusal of a device of neither kind removed', edit: (src) => src.replace(NEITHER_REFUSAL, '\n') },
  {
    what: 'the refusal of a device of neither kind moved after the run',
    edit: (src) => {
      const m = NEITHER_REFUSAL.exec(src);
      if (m === null) return src;
      return src.replace(NEITHER_REFUSAL, '\n').replace('          if (last.code !== 0) return last;\n', `${m[0].slice(1).replace(/^ {8}/gm, '          ')}          if (last.code !== 0) return last;\n`);
    }
  },
  // Rule 10 (Phase 333.4): a device's biometry is its device type's.
  {
    // The attack lens's own ablation: every caller that names no device type,
    // probe:p316 among them, would get a null kind and a refused biometry().
    what: "the capabilities read made only when the caller names a device type",
    edit: (src) =>
      src.replace(
        "    typeof deviceType.bundlePath === 'string' && deviceType.bundlePath.startsWith('/')\n      ? await run('plutil'",
        "    options?.deviceType !== undefined && typeof deviceType.bundlePath === 'string' && deviceType.bundlePath.startsWith('/')\n      ? await run('plutil'"
      )
  },
  {
    what: "the failed read's stand-in taken from the caller's options",
    edit: (src) => src.replace("      : { code: 127, stdout: '', stderr: 'simctl names no bundle path for it'", "      : options?.capabilitiesRead ?? { code: 127, stdout: '', stderr: 'simctl names no bundle path for it'")
  },
  { what: "the biometry taken from the caller's options", edit: (src) => src.replace('const biometryKind = biometryOf(', 'const biometryKind = options?.biometry ?? biometryOf(') },
  {
    what: 'the capabilities read moved after the create',
    edit: (src) => {
      const from = src.indexOf('  const capabilitiesRead =');
      const to = src.indexOf('  // Devices this run did NOT make');
      if (from === -1 || to === -1 || to < from) return src;
      const block = src.slice(from, to);
      return `${src.slice(0, from)}${src.slice(to)}`.replace('    entry.udid = udid;\n', `    entry.udid = udid;\n${block}`);
    }
  },
  {
    what: 'the kind read from another file of the device type',
    edit: (src) => src.replace("'capabilities.plist')], { timeoutMs: 30_000 })", "'profile.plist')], { timeoutMs: 30_000 })")
  },
  {
    what: "the device type row taken from the caller's options",
    edit: (src) =>
      src.replace(
        'const deviceType = pickDeviceType(parseJson(types.stdout), deviceTypeName);',
        'const deviceType = options?.deviceTypeRow ?? pickDeviceType(parseJson(types.stdout), deviceTypeName);'
      )
  },
  { what: 'the kind assigned a second time', edit: (src) => src.replace('  if (biometryKind === null) {\n    const why =', "  biometryKind ??= 'faceID';\n  if (biometryKind === null) {\n    const why =") },
  { what: 'the handle without its biometryKind', edit: (src) => src.replace('      get biometryKind() {\n        return biometryKind;\n      },\n', '') },
  { what: 'the handle without its deviceType', edit: (src) => src.replace('      get deviceType() {\n        return String(deviceType.name);\n      },\n', '') },
  { what: 'biometryOf answering Face ID when both are true', edit: (src) => src.replace("  if (face && !touch) return 'faceID';", "  if (face) return 'faceID';") },
  { what: 'biometryOf accepting 1 for true', edit: (src) => src.replace("const face = capabilities['pearl-id'] === true;", "const face = capabilities['pearl-id'] == true;") }
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

// Rules 3 to 5 and 7 to 10 over the real helper, then over one-clause ablations of it.
const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
for (const why of helperShape(helperSource)) fail(`build/${HELPER}: ${why}`, 'The device this helper makes could outlive the script that made it, or be answered as another device.');
// Rule 10's drive of the function itself, as every caller imports it (Phase 333.4).
for (const why of biometryOfFindings(biometryOf, `build/${HELPER}'s exported biometryOf`)) {
  fail(why, "A device would be answered by the wrong kind's name, or by none.");
}
let ablationsRed = 0;
for (const a of HELPER_ABLATIONS) {
  const edited = a.edit(helperSource);
  if (edited === helperSource) {
    fail(`the helper ablation "${a.what}" found nothing to edit`, 'Its anchor is gone from the helper, so this gate no longer proves that clause. Re-point it.');
    continue;
  }
  if (helperShape(edited).length === 0) fail(`the helper ablation "${a.what}" left rules 3 to 5 and 7 to 10 green`, 'That clause is not asserted by anything.');
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
    `its handle's push, biometry and pasteboard name only the device its call created; ` +
    `a device's biometry is its device type's, ${String(BIOMETRY_OF_FIXTURES.length)} of ${String(BIOMETRY_OF_FIXTURES.length)} capabilities read as the type's own, and Touch ID is answered by Touch ID's name; ` +
    `${String(caughtFixtures)} of ${String(FIXTURES.filter((f) => f.caught).length)} bad fixtures caught, ` +
    `${String(FIXTURES.filter((f) => !f.caught).length)} controls left alone, ` +
    `${String(ablationsRed)} of ${String(HELPER_ABLATIONS.length)} helper ablations red.\n`
);
