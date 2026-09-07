#!/usr/bin/env node
/**
 * assert-electron-teardown.mjs. Every script under build/ that starts an
 * Electron starts it through build/electron-run.mjs (Phase 140).
 *
 * ## Why this file exists
 *
 * A rule with no gate is a rule that drifts back, and this one has already
 * drifted. `build/probe-p139-caption.mjs` states the rule in its own header,
 * being that the pid it started is killed in a `finally` block whatever
 * happened. On 2026-08-23, 51 scripts under build/ started an Electron and 8 of
 * them ended it in a `finally` block. The other 43 ended it only on the happy
 * path, so any assertion that threw before the kill line left about 480 MB
 * running. Stacking those is how the operator's machine ran out of memory on
 * 2026-08-22.
 *
 * Phase 140 moved the launch into one helper. This gate is what keeps it there.
 * It earned that job before it shipped. Phase 138 landed
 * build/probe-p138-fold.mjs while this phase was being written, that probe
 * started an Electron of its own, and this gate is what found it. It was moved
 * onto the helper in the same commit, which is why the recorded list below
 * holds 50 files rather than the 49 that were converted by hand.
 *
 * ## What it asserts, and both directions matter
 *
 *   1. FORWARD. No file under build/ except electron-run.mjs passes an Electron
 *      program to spawn, spawnSync, execFile, execFileSync or exec. The
 *      helper's teardown cannot end a process the helper never started.
 *   2. REVERSE. The POPULATION of files that reach the helper is not shrinking.
 *      Without this direction the gate would go on passing after somebody
 *      deleted every probe, which is the same lesson
 *      build/assert-probe-containment.mjs records about itself at its line 27.
 *
 *      This rule was a HAND LIST of 50 names until Phase 219, and the hand list
 *      is what it exists to refuse. On 2026-09-06 the tree held 87 files that
 *      reach the helper and the list named 56 of them, so 30 real scripts had
 *      drifted off it, going back to Phase 140, while the gate printed a green
 *      sentence claiming "56 reach build/electron-run.mjs". That sentence was
 *      the list's own length rather than a measurement, and reciting a constant
 *      is how the drift stayed invisible for eighty phases.
 *
 *      So the set is DERIVED now, by the same usesHelper() this file already
 *      exported, and rule 2 is a FLOOR on its size rather than a roll call.
 *      Deriving the set alone would be a tautology, since a list computed by
 *      usesHelper and then checked with usesHelper can never disagree with
 *      itself, and that tautology is exactly the vacuity rule 2 was written to
 *      prevent. The floor is what keeps the assertion real: adding a probe can
 *      never turn this gate red, and deleting one, renaming one, or quietly
 *      taking one off the helper does. A deliberate deletion lowers
 *      HELPER_USER_FLOOR in the same commit and says so in the commit body, the
 *      way the deleted row used to.
 *
 *      What is given up is per name identity in the failure message. That is
 *      the right trade, because the value was never in the names: it was in the
 *      assertion that the population is not shrinking, and the names are one
 *      `--list` away.
 *   3. THE HELPER ITSELF. electron-run.mjs kills inside a `finally` block, read
 *      by matching braces rather than by searching for a string. A gate that
 *      greps for the word "finally" passes on a file that mentions it in a
 *      comment.
 *   4. THE FIXTURES. The scanner is run over three files this script writes
 *      itself: one that launches through the helper, one that spawns the shim
 *      directly, and one that spawns it through a variable called "bin", which
 *      is how a rule like this gets around by accident. The first must produce
 *      no finding and the other two must produce exactly one each. A checker
 *      nobody has seen fail is a checker nobody has seen work. Rule 2's floor
 *      is proved the same way, against a count one below the floor and against
 *      the floor itself, because a floor nobody has seen refuse anything is
 *      indistinguishable from no floor at all.
 *
 * ## What it does not assert
 *
 * Three launches under build/ sit outside the helper, and all three are here on
 * purpose rather than by oversight.
 *
 * It does not read package.json. Several npm scripts run `electron .` from a
 * shell line inside build/harness-socket.mjs, e.g. every `smoke:*` entry. Those
 * launches are the harness's own child and the harness ends with them, so they
 * are a different shape from a probe holding an app open across assertions.
 *
 * It does not catch build/probe-openwith.mjs either, for the same reason. That
 * probe builds a shell line naming `electron` and hands it to
 * build/harness-socket.mjs to run inside a tmux pane, so the string never
 * reaches a spawn call in that file.
 *
 * It does not see `runKeychainApp` in build/probe-p133-login-session.mjs at its
 * line 599. That function builds an Electron command line as a string at its
 * lines 607 to 609 and hands it to tmux as a pane's direct command, so no spawn
 * call in that file names an Electron and the forward rule reads nothing. It is left
 * alone on purpose. The pane's own pid is killed by a 20 second watchdog, and
 * build/harness-socket.mjs ends the scratch tmux server on close, so that
 * Electron cannot outlive the probe the way an app held across assertions can.
 * Moving it into the helper would mean giving the helper a tmux pane mode for
 * one caller.
 *
 * ## Two shapes the forward rule would miss
 *
 * Both were found by attacking the gate with fixtures on 2026-08-23. Neither
 * exists in this tree, and both are written down here so a later round reads
 * them rather than rediscovers them.
 *
 *   1. A program returned by a function whose name does not contain the word
 *      "electron", e.g. `spawn(pick(), args)` where `pick()` returns the shim
 *      path. The rule reads declarations and argument text, and it does not
 *      follow return values. A function named `electronProgram()` is caught,
 *      because its name carries the word.
 *   2. A declaration written with no trailing semicolon, because
 *      electronVariables() needs a `;` to close the value it reads. Every file
 *      under build/ is written with semicolons and there is no formatter in
 *      this repository that would remove them, so this miss is theoretical.
 *
 * Run it with `npm run gate:electron`. It spawns nothing, opens no profile and
 * launches no Electron, and it takes about 0.1 s.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The lexer both this gate and build/assert-known-hosts-scoped.mjs read source
// with. It was extracted from this file in Phase 193 rather than copied.
import { blockAt, callArguments, lineAt, stripComments } from './scan-source.mjs';

export { stripComments };

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');
const HELPER = 'electron-run.mjs';

/**
 * The size the derived population may never fall below.
 *
 * This replaced a hand written list of 50 names in Phase 219. It was 56 names
 * by then and the tree held 87 files that reach the helper, so it had drifted
 * by 30 and nothing noticed, because the list was both the claim and the thing
 * checked. The floor is the part of that rule that can still fail: adding a
 * probe never turns this gate red, and removing one, renaming one, or taking
 * one off the helper does.
 *
 * Measured on 2026-09-06 with `node build/assert-electron-teardown.mjs --list`,
 * which printed 86 names, and re-measured at 87 the same day when Phase 219's
 * fix round added `probe-p219-geometry.mjs`. Lower it ONLY in the same commit
 * that deletes a probe on purpose, and say in the commit body which file went
 * and why. Do not lower it to make a red gate green: red here means either a
 * probe left the tree or a probe stopped routing its launch through the helper,
 * and the second one is the 2026-08-22 crash coming back.
 *
 * RAISE IT WHEN YOU ADD ONE, in the same commit, and that is not optional
 * bookkeeping. Adding a probe cannot turn this gate red, so a floor left where
 * it was is a floor that would let the probe you just added be deleted again in
 * silence, which is the drift this constant replaced a hand list to stop.
 */
const HELPER_USER_FLOOR = 87;

/**
 * This file is not a helper user, and it reads as one to its own scanner.
 *
 * usesHelper() looks for an import of ./electron-run.mjs and a call to
 * withElectron or runElectron. Both appear in THIS file as text: the first
 * inside usesHelper's own regular expression literal, the second inside
 * GOOD_FIXTURE. stripComments() removes comments and strings but not regular
 * expression literals, so the derived set counted the gate itself and the count
 * was permanently one too high. The gate spawns nothing and launches no
 * Electron, so excluding it by name is the honest reading rather than a
 * convenience: it does not reach the helper, it quotes it.
 */
const NOT_A_HELPER_USER = new Set(['assert-electron-teardown.mjs']);

/**
 * The one file that is allowed to name an Electron program in a spawn, plus the
 * one packing hook that runs the packed executable once with --version and
 * exits. That hook runs inside electron-builder's own process during
 * `npm run package`, before any window exists, and it uses execFileSync with a
 * timeout, so it cannot outlive its own call.
 */
const EXEMPT = new Set([HELPER, 'assert-skills-cli.cjs']);

// ---------------------------------------------------------------------------
// Reading source
// ---------------------------------------------------------------------------

// stripComments, lineAt, callArguments and blockAt were this file's own until
// Phase 193, which needed the same four to ask the same question about ssh.
// They are in build/scan-source.mjs now, unchanged, and the reason each one is
// written the way it is stays in that file's header. This file still exports
// stripComments, because that name was part of its surface.

/**
 * The four program paths that start Tortie, plus the bare name the shell
 * resolves through node_modules/.bin. A caller that computes one of these into
 * a variable is caught by the identifier rule below instead.
 */
const PROGRAM_PATHS = [
  'node_modules/.bin/electron',
  'Electron.app/Contents/MacOS/Electron',
  'Tortie.app/Contents/MacOS/Tortie',
  // The packaged bundle assembled with join(), which is how
  // build/update-rehearsal.mjs used to name it.
  "'Contents', 'MacOS', 'Tortie'",
  "'Contents', 'MacOS', 'Electron'"
];

/**
 * The variables in one file that were assigned an Electron path, whatever they
 * were called. Without this a file could spawn `bin` and pass, which is exactly
 * how the first draft of this gate was defeated on 2026-08-23 by a variable
 * named `bin` holding node_modules/.bin/electron.
 */
function electronVariables(code) {
  const names = new Set();
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]*);/g;
  let m;
  while ((m = decl.exec(code)) !== null) {
    const value = m[2];
    if (PROGRAM_PATHS.some((path) => value.includes(path))) names.add(m[1]);
    else if (/'\.bin'\s*,\s*'electron'/.test(value)) names.add(m[1]);
    else if (/^\s*(['"])electron\1\s*$/.test(value)) names.add(m[1]);
  }
  return names;
}

/** Whether this argument text names a program that starts an Electron. */
function namesElectron(programText, secondText, variables) {
  const text = programText ?? '';
  for (const name of variables ?? []) {
    if (new RegExp(`\\b${name}\\b`).test(text)) return true;
  }
  for (const path of PROGRAM_PATHS) {
    if (text.includes(path)) return true;
  }
  if (/^(['"])electron\1$/.test(text)) return true;
  if (/^(['"])npx\1$/.test(text)) {
    return /^\[\s*(['"])electron\1/.test(secondText ?? '');
  }
  // A variable whose name says what it holds. This is what catches
  // `spawn(electronBin, ...)` and `spawn(packaged ? packagedBin : electronBin)`.
  if (/\belectron/i.test(text)) return true;
  if (/\bpackagedbin\b/i.test(text)) return true;
  if (/\btortiebin\b/i.test(text)) return true;
  // The two names the packaged probes give the bundle's own executable.
  if (/\bappbinary\b/i.test(text)) return true;
  if (/\bpristinebinary\b/i.test(text)) return true;
  return false;
}

/**
 * Every place in one file where an Electron program is handed to a spawn. The
 * result is what both the real scan and the fixtures read, so the fixtures
 * prove the same code the gate runs.
 */
export function electronSpawns(name, source) {
  const code = stripComments(source);
  const variables = electronVariables(code);
  const hits = [];
  const call = /\b(spawn|spawnSync|execFile|execFileSync|exec)\s*\(/g;
  let m;
  while ((m = call.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    if (!namesElectron(args[0], args[1], variables)) continue;
    hits.push({
      file: name,
      line: lineAt(code, m.index),
      call: `${m[1]}(${(args[0] ?? '').split('\n')[0].trim()}, ...)`
    });
  }
  return hits;
}

/** Whether this file reaches the helper. */
export function usesHelper(source) {
  const code = stripComments(source);
  const imported = /from\s+['"]\.\/electron-run\.mjs['"]/.test(code);
  const called = /\b(withElectron|runElectron)\s*\(/.test(code);
  return { imported, called };
}

/**
 * Every file under build/ that reaches the helper, derived rather than listed.
 *
 * `read` is injected so the fixture arm can drive this over files that are not
 * in the tree, which is what lets rule 2's floor be proved rather than recited.
 */
export function helperUsers(names, read) {
  const found = [];
  for (const name of names) {
    if (NOT_A_HELPER_USER.has(name)) continue;
    const use = usesHelper(read(name));
    if (use.imported && use.called) found.push(name);
  }
  return found;
}

/**
 * Rule 2 itself, as a function, so the fixture arm can watch it refuse.
 * Returns a finding, or null when the population meets the floor.
 */
export function floorFinding(count, floor) {
  if (count >= floor) return null;
  return {
    what:
      `only ${String(count)} files under build/ reach build/${HELPER}, and ` +
      `the floor is ${String(floor)}`,
    detail:
      'The population that routes its Electron launch through the helper has ' +
      'SHRUNK. Either a probe left the tree, or a probe stopped calling ' +
      'withElectron/runElectron and now starts an Electron some other way, ' +
      'which is the shape that left about 480 MB running on 2026-08-22. Run ' +
      '`node build/assert-electron-teardown.mjs --list` and diff it against ' +
      'the same command at the parent commit to see which file went. If the ' +
      'deletion was deliberate, lower HELPER_USER_FLOOR in this file in that ' +
      'same commit and say which file went in the commit body.'
  };
}

// ---------------------------------------------------------------------------
// The helper's own shape
// ---------------------------------------------------------------------------
/**
 * Whether withElectron ends its launch inside a `finally` block. The braces are
 * matched rather than the word searched, because the word appears in this
 * file's own prose and in the helper's header.
 */
export function helperKillsInFinally(source) {
  const code = stripComments(source);
  const at = code.indexOf('export async function withElectron');
  if (at === -1) return { ok: false, why: 'withElectron is not exported from it.' };
  const bodyOpen = code.indexOf('{', code.indexOf(')', at));
  const body = blockAt(code, bodyOpen);
  if (body === null) return { ok: false, why: 'the braces of withElectron do not close.' };
  const fin = body.indexOf('finally');
  if (fin === -1) {
    return { ok: false, why: 'withElectron has no finally block.' };
  }
  const finBody = blockAt(body, body.indexOf('{', fin));
  if (finBody === null) {
    return { ok: false, why: 'the braces of the finally block do not close.' };
  }
  if (!/\bteardown\s*\(/.test(finBody)) {
    return {
      ok: false,
      why: 'the finally block of withElectron does not call teardown().'
    };
  }
  return { ok: true, why: null };
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

/**
 * The three fixtures, written from a template.
 *
 * `LAUNCH` and `PROGRAM` are placeholders that are substituted immediately
 * before each file is written. They are placeholders for one reason: with the
 * real words in place, this file's own source would read as a direct launch and
 * would fail its own rule 1. The bytes that reach disk are exactly what a probe
 * looked like before Phase 140.
 */
function fixture(text) {
  return text.replace(/LAUNCH/g, 'spa' + 'wn').replace(/PROGRAM/g, 'bin');
}

/** Launches through the helper. The scanner must find nothing in it. */
const GOOD_FIXTURE = fixture(`
import { runElectron } from './electron-run.mjs';
const out = await runElectron({
  label: 'fixture',
  userDataDir: '/tmp/p140-fixture'
});
process.exit(out.code === 0 ? 0 : 1);
`);

/** Spawns the shim itself, which is the shape this gate exists to refuse. */
const BAD_FIXTURE = fixture(`
import { LAUNCH } from 'node:child_process';
const PROGRAM = 'node_modules/.bin/electron';
const child = LAUNCH(PROGRAM, ['.', '--user-data-dir=/tmp/p140-fixture']);
await new Promise((r) => child.on('exit', r));
child.kill('SIGKILL');
`);

/**
 * The same launch with the path assembled so no line reads as an Electron path,
 * under a variable name that says nothing. This is how a rule like this gets
 * around by accident, so the scanner has to catch it by the value the variable
 * was given rather than by what it was called.
 */
const SLY_FIXTURE = fixture(`
import { LAUNCH } from 'node:child_process';
const PROGRAM = ['node_modules', '.bin', 'electron'].join('/');
const child = LAUNCH(PROGRAM, ['.', '--user-data-dir=/tmp/p140-fixture']);
child.on('exit', () => {});
`);

/**
 * Run the scanner over three files this script writes, so a pass says the
 * scanner still separates the shapes. The files are written under a scratch
 * directory and removed afterwards. Nothing is launched.
 */
function runFixtures(failures) {
  const dir = mkdtempSync(join(tmpdir(), 'p140-gate-'));
  try {
    const good = join(dir, 'fixture-good.mjs');
    const bad = join(dir, 'fixture-bad.mjs');
    const sly = join(dir, 'fixture-sly.mjs');
    writeFileSync(good, GOOD_FIXTURE);
    writeFileSync(bad, BAD_FIXTURE);
    writeFileSync(sly, SLY_FIXTURE);

    const goodHits = electronSpawns('fixture-good.mjs', readFileSync(good, 'utf8'));
    const goodUse = usesHelper(readFileSync(good, 'utf8'));
    const badHits = electronSpawns('fixture-bad.mjs', readFileSync(bad, 'utf8'));
    const badUse = usesHelper(readFileSync(bad, 'utf8'));

    if (goodHits.length !== 0) {
      failures.push({
        what: 'the good fixture was reported as a direct launch',
        detail:
          `It launches through runElectron and the scanner found ` +
          `${String(goodHits.length)} direct spawn(s) in it. The scanner is ` +
          'reporting a false alarm, so every pass it prints is worthless.'
      });
    }
    if (!goodUse.imported || !goodUse.called) {
      failures.push({
        what: 'the good fixture was not seen to use the helper',
        detail: `imported=${String(goodUse.imported)} called=${String(goodUse.called)}.`
      });
    }
    if (badHits.length !== 1) {
      failures.push({
        what: 'the bad fixture was not caught',
        detail:
          `It spawns node_modules/.bin/electron directly and the scanner ` +
          `found ${String(badHits.length)} direct launch(es) rather than 1. ` +
          'This gate cannot catch a real one either.'
      });
    }
    if (badUse.imported || badUse.called) {
      failures.push({
        what: 'the bad fixture was seen to use the helper',
        detail: `imported=${String(badUse.imported)} called=${String(badUse.called)}.`
      });
    }
    const slyHits = electronSpawns('fixture-sly.mjs', readFileSync(sly, 'utf8'));
    if (slyHits.length !== 1) {
      failures.push({
        what: 'the fixture that hides the name was not caught',
        detail:
          'It assigns node_modules/.bin/electron to a variable called "bin" ' +
          `and spawns that, and the scanner found ${String(slyHits.length)} ` +
          'direct launch(es) rather than 1. A rule that only reads the ' +
          'variable name is defeated by renaming the variable.'
      });
    }
    // Rule 2's own fixture. A floor nobody has seen refuse a count is
    // indistinguishable from no floor at all, and the hand list it replaced
    // failed in exactly that way for eighty phases: it was both the claim and
    // the thing checked, so it could not disagree with itself. These two calls
    // are the disagreement made possible. The floor must refuse a population
    // one short of itself and accept one that meets it.
    let floorRefused = 0;
    const below = floorFinding(HELPER_USER_FLOOR - 1, HELPER_USER_FLOOR);
    const at = floorFinding(HELPER_USER_FLOOR, HELPER_USER_FLOOR);
    if (below === null) {
      failures.push({
        what: 'the floor accepted a population one file short of itself',
        detail:
          `floorFinding(${String(HELPER_USER_FLOOR - 1)}, ` +
          `${String(HELPER_USER_FLOOR)}) returned null. Rule 2 cannot notice ` +
          'a probe leaving the tree or leaving the helper, which is the only ' +
          'thing it is for.'
      });
    } else floorRefused += 1;
    if (at !== null) {
      failures.push({
        what: 'the floor refused a population that meets it',
        detail:
          `floorFinding(${String(HELPER_USER_FLOOR)}, ` +
          `${String(HELPER_USER_FLOOR)}) returned a finding. The floor is a ` +
          'minimum and not an equality, so adding a probe must never turn ' +
          'this gate red.'
      });
    }

    // And the derivation itself, over files that are not in the tree, so a
    // pass says helperUsers() still separates the shapes rather than that the
    // tree happens to be clean today.
    const derived = helperUsers(
      ['fixture-good.mjs', 'fixture-bad.mjs', 'fixture-sly.mjs'],
      (name) => readFileSync(join(dir, name), 'utf8')
    );
    if (derived.length !== 1 || derived[0] !== 'fixture-good.mjs') {
      failures.push({
        what: 'the derivation did not pick out the file that reaches the helper',
        detail:
          `It answered [${derived.join(', ')}] over three fixtures of which ` +
          'exactly one calls runElectron. A derivation that miscounts makes ' +
          'the floor meaningless in whichever direction it is wrong.'
      });
    }

    return {
      good: goodHits.length,
      bad: badHits.length,
      sly: slyHits.length,
      floorRefused
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function buildFiles() {
  return readdirSync(buildDir).filter(
    (n) => n.endsWith('.mjs') || n.endsWith('.cjs') || n.endsWith('.mts')
  );
}

/**
 * `--list` prints the derived population, one name per line, and asserts
 * nothing. It is what a person runs when the floor goes red, to diff against
 * the same command at the parent commit, and what they run to read the new
 * number when they lower the floor on purpose.
 */
function list() {
  const files = buildFiles();
  const read = (n) => readFileSync(join(buildDir, n), 'utf8');
  for (const name of helperUsers(files, read)) console.log(name);
}

function main() {
  const failures = [];
  const files = buildFiles();

  // Rule 1, forward.
  let scanned = 0;
  for (const name of files) {
    if (EXEMPT.has(name)) continue;
    const source = readFileSync(join(buildDir, name), 'utf8');
    scanned += 1;
    for (const hit of electronSpawns(name, source)) {
      failures.push({
        what: `build/${hit.file}:${String(hit.line)} starts an Electron itself`,
        detail:
          `The call is ${hit.call}. A launch outside build/${HELPER} has no ` +
          'teardown that a finally block runs, so an assertion that throws ' +
          'before the kill line leaves about 480 MB running. Replace it with ' +
          'withElectron(options, async (handle) => { ... }) or with ' +
          'runElectron(options).'
      });
    }
  }

  // Rule 2, reverse. The population is derived and its size is the assertion.
  const users = helperUsers(files, (name) =>
    readFileSync(join(buildDir, name), 'utf8')
  );
  const shortfall = floorFinding(users.length, HELPER_USER_FLOOR);
  if (shortfall) failures.push(shortfall);

  // Rule 3, the helper's own shape.
  const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
  const shape = helperKillsInFinally(helperSource);
  if (!shape.ok) {
    failures.push({
      what: `build/${HELPER} does not kill inside a finally block`,
      detail: `${shape.why} That block is the whole guarantee of this phase.`
    });
  }

  // Rule 4, the fixtures.
  const fixtures = runFixtures(failures);

  if (failures.length > 0) {
    console.error(
      '[electron-teardown] a launch under build/ is outside the helper.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  console.log(
    `[electron-teardown] ${String(scanned)} files under build/ were read and ` +
      `none starts an Electron itself. ${String(users.length)} of them reach ` +
      `build/${HELPER}, counted rather than listed, against a floor of ` +
      `${String(HELPER_USER_FLOOR)}. The helper's kill is inside a finally ` +
      `block. Fixtures: the good one produced ${String(fixtures.good)} ` +
      `findings, the bad one produced ${String(fixtures.bad)}, the one that ` +
      `hides the name produced ${String(fixtures.sly)}, and the floor refused ` +
      `${String(fixtures.floorRefused)} of the 2 populations it was shown.`
  );
}

if (process.argv.includes('--list')) list();
else main();
