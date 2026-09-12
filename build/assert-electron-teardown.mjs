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

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The lexer both this gate and build/assert-known-hosts-scoped.mjs read source
// with. It was extracted from this file in Phase 193 rather than copied.
import { buildScriptNames } from './build-scripts.mjs';
import {
  blockAt,
  callArguments,
  closeOf,
  functionBodyOf,
  lineAt,
  stripComments
} from './scan-source.mjs';

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
 * which printed 86 names, re-measured at 87 the same day when Phase 219's
 * fix round added `probe-p219-geometry.mjs`, and at 88 on 2026-09-07 when
 * Phase 225's fix round added `probe-p225-baseline.mjs`, and at 89 on 2026-09-08 when
 * Phase 227 added `probe-p227-rewind.mjs`, at 90 the same day when Phase 236
 * committed the verifier's own redline probe, at 91 when Phase 234 added
 * `probe-p234-arch.mjs`, the Architecture app run against the operator's Mac
 * Pro, at 92 when Phase 237 added `probe-p237-typing.mjs`, and at 95 the same
 * day when Phase 237's verifier's three attack probes were kept, and at 96 on
 * 2026-09-08 when Phase 241's measure step added `probe-p241-actions.mjs`, the
 * app run that asks the live editor which of its menu rows really do something.
 *
 * THAT PROBE WAS WRITTEN UNDER `build/p241/` FIRST AND THIS GATE COULD NOT SEE
 * IT. `buildFiles()` is a FLAT `readdirSync(buildDir)`, so a script in a phase
 * subdirectory beside it — `build/p214/`, `build/p218/`, `build/p241/` — is
 * read by neither rule 1 nor rule 2, and one of those that started an Electron
 * would be exactly the 2026-08-22 shape with nothing watching it. Today none
 * of them does, and the answer chosen here was to move the one that does up to
 * this directory rather than to widen the walk, because widening it would sweep
 * in fixture trees the rules were never written for. A round that puts an
 * Electron in a subdirectory has to make the walk recursive first.
 *
 * PHASE 240'S COMMITTER'S ROUND WIDENED THE WALK ANYWAY, and the paragraph
 * above is kept because it is the reasoning this replaced. `buildFiles()` is
 * recursive now and the import pattern is widened with it, which is what
 * finally brought `build/p240/save-loss.mjs` and `build/p240/save-choice.mjs`
 * into the population they had always been outside of. Part of the rise in the
 * floor below is therefore a measurement rather than new files, and a round
 * that puts an Electron in a subdirectory no longer has to move it up first.
 * PHASE 261 RAISED IT FROM 129 TO 131, for the two probes that round added:
 * build/p261/probe-p261-socket.mjs, the app run for the socket refusal, and
 * build/p261/probe-p261-cmdt.mjs, the app run for the name selection race.
 * Adding a probe cannot turn this gate red, so a floor left where it was is a
 * floor that would let either of them be deleted again in silence.
 *
 * Lower it ONLY in the same commit
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
const HELPER_USER_FLOOR = 131;

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

/**
 * Whether this file reaches the helper.
 *
 * THE IMPORT IS MATCHED AT ANY DEPTH since Phase 240's fix round, and that is
 * the other half of the walk above. The pattern was `./electron-run.mjs`
 * exactly, so a probe one directory down importing `../electron-run.mjs` read
 * as not reaching the helper even once the walk found it: making the walk
 * recursive ALONE would have raised the population by 51 files and left the
 * derived helper set at 95, counting neither of Phase 240's two probes and
 * moving no constant at all. Measured on 2026-09-08: 95 with the old pattern
 * over the walked population, 97 with this one.
 */
export function usesHelper(source) {
  const code = stripComments(source);
  const imported = /from\s+['"](?:\.\.?\/)+electron-run\.mjs['"]/.test(code);
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
// Rule 5 (Phase 261). The socket refusal, the announcement and the census.
// ---------------------------------------------------------------------------
/**
 * WHY RULE 5 IS HERE AND WHY IT DRIVES RATHER THAN READS.
 *
 * Twice a probe launched with `GMUX_TMUX_SOCKET` set and no harness term, the
 * app therefore ignored it, and sessions appeared on `-L gmux`, the operator's
 * live server. Phase 86.1's table says the next round touching build/ must make
 * the HARNESS refuse such a launch rather than rely on a person reading a
 * warning, because a person reading it had been measured at 0 of 2.
 *
 * The refusal lives in build/electron-run.mjs, and this rule proves it by
 * CALLING the shipping `withElectron` rather than by reading it, for the reason
 * `conformance:redline-write` gives about the guarded write: a gate on a
 * refusal has to run the refusal, because reading it is what let the defect
 * ship. Nothing is launched. Every arm here is refused BEFORE a spawn, which is
 * exactly what arm 5b establishes.
 *
 * The arms:
 *
 *   5a  a composed env naming a socket with no harness term is refused, the
 *       message names GMUX_PROBES, and a sentinel proves the body never ran.
 *   5b  the same call with GMUX_PROBES added and a program that is not there
 *       is refused for the PROGRAM. That is how this rule proves 5a passed
 *       without launching anything: a different refusal is a refusal reached
 *       later.
 *   5c  a named tmuxSocket against an env naming a different socket, and
 *       against an env naming none. Both refused, both messages naming the pair.
 *   5d  the reader and the judgement, over fixture texts.
 *   5e  build/harness-socket.mjs names a harness term inside the argument
 *       object of the same spawn() call that names GMUX_TMUX_SOCKET, read by
 *       matching brackets, proved on three planted texts.
 *   5f  every `-L gmux` argv composed in electron-run.mjs is a list-sessions,
 *       proved on two plants.
 *   5g  an env naming the operator's OWN server is refused whatever else the
 *       launch sets, with a control that must still reach the program check.
 *   5h  the two backstops are WIRED into withElectron rather than merely
 *       exported, read by matching braces and proved on seven planted texts.
 *
 * 5g AND 5h ARE THE FIX ROUND'S AND EACH CLOSES A HOLE A VERIFIER DROVE. 5g's
 * shape walked past all four layers: `GMUX_TMUX_SOCKET: 'gmux'` with a harness
 * term beside it and `tmuxSocket: null`, which is an override the app OBEYS
 * rather than one it ignores. 5h's hole was this gate's own: it drove the pure
 * `announcementFinding` and `censusFinding` and never asked whether anything
 * CALLED them, so deleting the three lines in `withElectron`'s reader that
 * reject on a disagreeing announcement, and replacing the census read with
 * `null`, each left this gate printing OK at exit 0 while the backstops did
 * nothing. A judgement nothing asks is not a backstop.
 *
 * And five ablations, one clause each, every one of which must turn a named arm
 * red. Each ablated copy is required to LOAD and answer before its arm is
 * judged, because a copy that will not load fails for the wrong reason and
 * proves nothing about the clause, which is Phase 219's rule.
 */

/** The four terms, scrubbed from a fixture env so 5a can be driven here. */
const HARNESS_TERM_NAMES = [
  'GMUX_SMOKE',
  'GMUX_SHOT',
  'GMUX_UPDATE_REHEARSAL',
  'GMUX_PROBES'
];

/**
 * A scratch profile path outside the repository and outside the home, so the
 * profile refusal is never what answers in these arms.
 */
function fixtureProfile() {
  return join(tmpdir(), 'p261-gate-profile-never-created');
}

/** Call `withElectron` and report what it did, never what it should have done. */
async function drive(helper, options) {
  let ran = false;
  try {
    await helper.withElectron(options, async () => {
      ran = true;
      return 'the body ran';
    });
    return { threw: false, message: '', ran };
  } catch (err) {
    return { threw: true, message: String(err?.message ?? err), ran };
  }
}

/**
 * The runtime arms, over one loaded copy of the helper. `tag` names which copy,
 * so an ablation's failures read as its own.
 *
 * Returns the readings rather than pushing failures, so the ablation half can
 * assert that a reading MOVED without repeating the expectations.
 */
async function socketReadings(helper) {
  const profile = fixtureProfile();
  // The process's own terms are scrubbed out of every fixture env, because this
  // gate may itself be run from inside a harness and an inherited GMUX_PROBES
  // would make 5a unable to fail.
  const scrub = {};
  for (const n of HARNESS_TERM_NAMES) scrub[n] = undefined;

  // EVERY ARM NAMES A PROGRAM THAT IS NOT THERE, and that is a safety property
  // rather than tidiness. An ablated copy of the 2a clause accepts the launch,
  // and with the default program it would then really start the operator's app
  // against -L gmux, which is the very thing this rule exists to stop. With no
  // program on disk the ablated copy is refused by the program check instead,
  // so the reading moves from one message to the other and nothing is ever
  // spawned. The ORDER, being that layer 2 sits above the profile refusal and
  // above the program check, is asked separately by the `order` arm below,
  // where the profile is the thing that is wrong.
  const dead = { program: '/nonexistent/p261', entry: false };

  const a = await drive(helper, {
    label: 'p261-5a',
    userDataDir: profile,
    ...dead,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate' }
  });
  const b = await drive(helper, {
    label: 'p261-5b',
    userDataDir: profile,
    ...dead,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate', GMUX_PROBES: '0' }
  });
  const order = await drive(helper, {
    label: 'p261-5a-order',
    userDataDir: 'not-absolute-and-not-a-profile',
    ...dead,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate' }
  });
  const cDiffers = await drive(helper, {
    label: 'p261-5c-differs',
    userDataDir: profile,
    ...dead,
    tmuxSocket: 'gmux-p261-teardown',
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-other', GMUX_PROBES: '0' }
  });
  const cAbsent = await drive(helper, {
    label: 'p261-5c-absent',
    userDataDir: profile,
    ...dead,
    tmuxSocket: 'gmux-p261-teardown',
    env: { ...scrub, GMUX_TMUX_SOCKET: undefined }
  });
  // 5g's three, and the control is what stops a clause that refuses everything
  // reading as a clause that refuses the right thing.
  const liveGmux = await drive(helper, {
    label: 'p261-5g-gmux',
    userDataDir: profile,
    ...dead,
    tmuxSocket: null,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux', GMUX_PROBES: '0' }
  });
  const liveDefault = await drive(helper, {
    label: 'p261-5g-default',
    userDataDir: profile,
    ...dead,
    tmuxSocket: null,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'default', GMUX_PROBES: '0' }
  });
  const liveControl = await drive(helper, {
    label: 'p261-5g-control',
    userDataDir: profile,
    ...dead,
    tmuxSocket: null,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate', GMUX_PROBES: '0' }
  });
  return { a, b, order, cDiffers, cAbsent, liveGmux, liveDefault, liveControl };
}

/**
 * Every driven launch that is in a shape layer 2 must refuse. The pass sentence
 * counts this list rather than quoting a number, so an arm added here moves the
 * sentence with it.
 */
const WRONG_SHAPES = (live) => [
  live.a,
  live.order,
  live.cDiffers,
  live.cAbsent,
  live.liveGmux,
  live.liveDefault
];

/** True when this reading is the layer 2 socket refusal and not a later one. */
function isSocketRefusal(reading) {
  return (
    reading.threw &&
    /GMUX_TMUX_SOCKET is |names the scratch tmux socket/.test(reading.message)
  );
}

/** 5d, over the pure reader and the pure judgement. */
function announcementReadings(helper) {
  const line = '[gmux-socket] local tmux socket: gmux-p261-1 (GMUX_TMUX_SOCKET=gmux-p261-1, harness launch: yes)';
  const wrong = '[gmux-socket] local tmux socket: gmux (GMUX_TMUX_SOCKET=gmux-p261-1, harness launch: no)';
  return {
    absent: helper.socketFromAnnouncement('nothing here at all\n'),
    present: helper.socketFromAnnouncement(`${line}\n`),
    twice: helper.announcedSockets(`${line}\n${wrong}\n`),
    leadingNoise: helper.socketFromAnnouncement(`some log\nmore log\n${line}\n`),
    // The line arriving as two chunks. The reader is asked of the accumulated
    // text, so what matters is that a half line followed by its other half
    // reads as one line once both have landed.
    chunked: helper.socketFromAnnouncement(
      '[gmux-socket] local tmux so' + 'cket: gmux-p261-1 (rest)\n'
    ),
    // A line the app quoted out of its own child's output. It is read, and that
    // is the fail-closed direction: it can only ever refuse a launch, never
    // pass one.
    quoted: helper.socketFromAnnouncement(`said: "x"\n${wrong}\n`),
    // The four combinations of the judgement.
    noWant: helper.announcementFinding({ wanted: '', announced: 'gmux' }),
    noAnswer: helper.announcementFinding({ wanted: 'gmux-p261-1', announced: null }),
    agrees: helper.announcementFinding({ wanted: 'gmux-p261-1', announced: 'gmux-p261-1' }),
    differs: helper.announcementFinding({ wanted: 'gmux-p261-1', announced: 'gmux' })
  };
}

/** 5e's scanner, and the fixture texts that prove it. */
export function harnessTermBesideSocket(source) {
  const code = stripComments(source);
  const call = /\bspawn\s*\(/g;
  let m;
  let found = false;
  let sawSocket = false;
  while ((m = call.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    const carries = args.find((a) => a.includes('GMUX_TMUX_SOCKET'));
    if (carries === undefined) continue;
    sawSocket = true;
    if (HARNESS_TERM_NAMES.some((n) => carries.includes(n))) found = true;
  }
  return { sawSocket, found };
}

const TERM_FIXTURES = [
  {
    name: 'the shape that ships',
    text: `const c = spawn(cmd, { shell: true, env: { GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '0' } });`,
    want: true
  },
  {
    name: 'the socket with no term, which is what shipped before Phase 261',
    text: `const c = spawn(cmd, { shell: true, env: { GMUX_TMUX_SOCKET: socket, GMUX_HARNESS_DIR: runDir } });`,
    want: false
  },
  {
    name: 'the term in a comment beside the socket',
    text:
      `const c = spawn(cmd, { shell: true, env: {\n` +
      `  // GMUX_PROBES would go here\n` +
      `  GMUX_TMUX_SOCKET: socket\n} });`,
    want: false
  }
];

/**
 * 5h's scanner. Are the two backstops WIRED into `withElectron`, or merely
 * exported?
 *
 * This is asked of `withElectron`'s OWN braces, because the hole it closes was
 * a judgement that still answered while nothing asked it. Two properties, and
 * each is read structurally rather than by searching the file for a word:
 *
 *   announcement  the body calls `announcementFinding(`, assigns it a name, and
 *                 the guard that decides on THAT NAME holds a call to the
 *                 rejection. `if (false) {` therefore reads as unwired, which
 *                 is the ablation, and so does a block with the reject deleted.
 *   census        `censusBefore` is read from `liveSessionNames()`, that read
 *                 sits ABOVE the spawn, and the `finally` block hands it to
 *                 `censusFinding` with a fresh reading beside it. A census read
 *                 after the spawn would miss exactly the sessions it exists to
 *                 see.
 *
 * @param {string} source
 * @returns {{announcement: boolean, census: boolean, why: string[]}}
 */
export function backstopWiring(source) {
  const why = [];
  const code = stripComments(source);
  const body = functionBodyOf(code, 'withElectron');
  if (body === null) {
    return {
      announcement: false,
      census: false,
      why: ['withElectron has no body this scanner can read']
    };
  }

  // The announcement half.
  let announcement = false;
  const call = body.indexOf('announcementFinding(');
  if (call === -1) why.push('withElectron never calls announcementFinding()');
  else {
    const named = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(
      body.slice(0, call)
    );
    if (named === null) {
      why.push('the announcementFinding() call is not assigned to a name');
    } else {
      const name = named[1];
      const guards = /if\s*\(/g;
      guards.lastIndex = call;
      let g;
      while ((g = guards.exec(body)) !== null) {
        const open = g.index + g[0].length - 1;
        const shut = closeOf(body, open);
        if (shut === -1) break;
        const condition = body.slice(open + 1, shut);
        if (!new RegExp(`\\b${name}\\b`).test(condition)) continue;
        // Both spellings of a guarded statement: a braced block, and the one
        // statement form a refactor may well produce. Taking only the braced
        // one would read a correct refactor as unwired, which is a gate that
        // cries wolf, and this scanner has to be able to fail for the right
        // reason only.
        const rest = body.slice(shut + 1);
        const lead = /^\s*/.exec(rest)?.[0].length ?? 0;
        const guarded =
          rest[lead] === '{'
            ? blockAt(body, shut + 1 + lead)
            : rest.slice(lead, rest.indexOf(';', lead) + 1);
        // `announcementRejected` is a FLAG and not the rejection: the call is
        // what has to be there, so the name is read as a call rather than as a
        // substring.
        if (guarded !== null && /announcementReject\s*\??\.?\(/.test(guarded)) {
          announcement = true;
        }
        break;
      }
      if (!announcement) {
        why.push(
          `nothing in withElectron rejects on ${name}: the guard that names ` +
            'it is gone, or it no longer holds the rejection'
        );
      }
    }
  }

  // The census half.
  let census = false;
  const assigned = /\b(?:const|let|var)\s+censusBefore\s*=\s*([^;]+);/.exec(body);
  if (assigned === null) why.push('withElectron never reads censusBefore');
  else if (!/liveSessionNames\s*\(\s*\)/.test(assigned[1])) {
    why.push(`censusBefore is ${assigned[1].trim()} rather than a live reading`);
  } else {
    // Asked as a pattern rather than as the literal text, because
    // build/assert-background-teardown.mjs discovers spawn call names by
    // scanning for exactly that literal and a string holding it reads as a
    // call this file makes.
    const spawnAt = body.search(/\bspawn\s*\(/);
    if (spawnAt !== -1 && assigned.index > spawnAt) {
      why.push('the census is read AFTER the spawn, so it cannot see the launch');
    } else {
      const fin = /\bfinally\s*\{/.exec(body);
      const block = fin === null ? null : blockAt(body, fin.index + fin[0].length - 1);
      if (block === null) why.push('withElectron has no finally block to read');
      else if (!/censusFinding\s*\(\s*censusBefore\s*,/.test(block)) {
        why.push('the finally block never hands censusBefore to censusFinding');
      } else census = true;
    }
  }
  return { announcement, census, why };
}

/**
 * 5h's fixtures. Five of the seven must make the scanner answer false, and the
 * two that pass are the shipping shape and a spelling of it a refactor might
 * reasonably produce, so the scanner is seen to fail AND seen not to be a
 * tautology.
 */
const WIRING_FIXTURES = [
  {
    name: 'the shape that ships',
    text: `export async function withElectron(options, body) {
      const censusBefore = tmuxSocket !== null ? liveSessionNames() : null;
      try {
        const child = spawn(bin, argv, {});
        const onText = (b) => {
          const finding = announcementFinding({ wanted, announced: all });
          if (finding !== null) {
            announcementRejected = true;
            announcementReject?.(new Error(finding));
          }
        };
      } finally {
        await teardown(entry, grace);
        if (censusBefore !== null) {
          const drift = censusFinding(censusBefore, liveSessionNames());
        }
      }
    }`,
    want: { announcement: true, census: true }
  },
  {
    name: 'a truthy guard spelled without the comparison',
    text: `export async function withElectron(options, body) {
      const censusBefore = liveSessionNames();
      try {
        const child = spawn(bin, argv, {});
        const say = () => {
          const finding = announcementFinding({ wanted, announced: all });
          if (finding) announcementReject?.(new Error(finding));
        };
      } finally {
        const drift = censusFinding(censusBefore, liveSessionNames());
      }
    }`,
    want: { announcement: true, census: true }
  },
  {
    name: 'the guard made constant, which is the ablation',
    text: `export async function withElectron(options, body) {
      const censusBefore = liveSessionNames();
      try {
        const child = spawn(bin, argv, {});
        const say = () => {
          const finding = announcementFinding({ wanted, announced: all });
          if (false) {
            announcementReject?.(new Error(finding));
          }
        };
      } finally {
        const drift = censusFinding(censusBefore, liveSessionNames());
      }
    }`,
    want: { announcement: false, census: true }
  },
  {
    name: 'the finding computed and thrown away',
    text: `export async function withElectron(options, body) {
      const censusBefore = liveSessionNames();
      try {
        const child = spawn(bin, argv, {});
        const say = () => {
          const finding = announcementFinding({ wanted, announced: all });
          if (finding !== null) {
            announcementRejected = true;
          }
        };
      } finally {
        const drift = censusFinding(censusBefore, liveSessionNames());
      }
    }`,
    want: { announcement: false, census: true }
  },
  {
    name: 'the census read replaced by null',
    text: `export async function withElectron(options, body) {
      const censusBefore = null;
      try {
        const child = spawn(bin, argv, {});
        const say = () => {
          const finding = announcementFinding({ wanted, announced: all });
          if (finding !== null) announcementReject?.(new Error(finding));
        };
      } finally {
        const drift = censusFinding(censusBefore, liveSessionNames());
      }
    }`,
    want: { announcement: true, census: false }
  },
  {
    name: 'the census read after the spawn',
    text: `export async function withElectron(options, body) {
      try {
        const child = spawn(bin, argv, {});
        const censusBefore = liveSessionNames();
        const say = () => {
          const finding = announcementFinding({ wanted, announced: all });
          if (finding !== null) announcementReject?.(new Error(finding));
        };
      } finally {
        const drift = censusFinding(censusBefore, liveSessionNames());
      }
    }`,
    want: { announcement: true, census: false }
  },
  {
    name: 'the census never judged in the finally',
    text: `export async function withElectron(options, body) {
      const censusBefore = liveSessionNames();
      try {
        const child = spawn(bin, argv, {});
        const say = () => {
          const finding = announcementFinding({ wanted, announced: all });
          if (finding !== null) announcementReject?.(new Error(finding));
        };
      } finally {
        await teardown(entry, grace);
      }
    }`,
    want: { announcement: true, census: false }
  }
];

/** 5f's scanner: every -L gmux argv in one file, with the verb it was given. */
export function operatorSocketVerbs(source) {
  const code = stripComments(source);
  const verbs = [];
  const re = /\[\s*'-L'\s*,\s*'gmux'\s*,\s*'([A-Za-z-]+)'/g;
  let m;
  while ((m = re.exec(code)) !== null) verbs.push(m[1]);
  return verbs;
}

const VERB_FIXTURES = [
  { name: 'the reader that ships', text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', 'x'])`, want: ['list-sessions'] },
  { name: 'a planted kill-server', text: `spawnSync('tmux', ['-L', 'gmux', 'kill-server'])`, want: ['kill-server'] },
  { name: 'a planted new-session', text: `spawnSync('tmux', ['-L', 'gmux', 'new-session', '-d'])`, want: ['new-session'] }
];

/**
 * The ablations. Each is one clause of the shipping text, removed from a copy
 * of the file in a scratch directory, and the reading it must move.
 */
const SOCKET_ABLATIONS = [
  {
    name: 'the 2a clause, the refusal of a socket with no harness term',
    file: HELPER,
    from: `  if (want !== '' && terms.length === 0) {`,
    to: `  if (false) {`,
    moved: (before, after) =>
      isSocketRefusal(before.a) &&
      !isSocketRefusal(after.a) &&
      /is not there/.test(after.a.message)
  },
  {
    name: 'the 2b clause, the refusal of a teardown socket the app is not using',
    file: HELPER,
    from: `  if (typeof tmuxSocket === 'string' && tmuxSocket !== '') {`,
    to: `  if (false) {`,
    moved: (before, after) =>
      isSocketRefusal(before.cDiffers) &&
      isSocketRefusal(before.cAbsent) &&
      !isSocketRefusal(after.cDiffers) &&
      !isSocketRefusal(after.cAbsent)
  },
  {
    name: 'the announcement comparison',
    file: HELPER,
    from: `  const wrong = announced.filter((s) => s !== wanted);`,
    to: `  const wrong = [];`,
    moved: (before, after) =>
      before.announce.differs !== null && after.announce.differs === null
  },
  {
    name: 'the census comparison',
    file: HELPER,
    from: `  const added = [...now].filter((n) => !was.has(n));`,
    to: `  const added = [];`,
    moved: (before, after) => before.censusAdded !== null && after.censusAdded === null
  },
  // ── The fix round's three. Each is a clause a verifier drove past, or one
  //    this gate could not see at all. ──
  {
    name: 'the 2c clause, the refusal of an env naming the operator\'s own server',
    file: HELPER,
    from: `    const notScratch = refuseSocketReason(want);`,
    to: `    const notScratch = null;`,
    moved: (before, after) =>
      isSocketRefusal(before.liveGmux) &&
      isSocketRefusal(before.liveDefault) &&
      !isSocketRefusal(after.liveGmux) &&
      !isSocketRefusal(after.liveDefault) &&
      /is not there/.test(after.liveGmux.message)
  },
  {
    name: 'the announcement rejection, wired into withElectron\'s own reader',
    file: HELPER,
    from: `          if (finding !== null) {`,
    to: `          if (false) {`,
    moved: (before, after) =>
      before.wiring.announcement && !after.wiring.announcement
  },
  {
    name: 'the census read that sits above the spawn',
    file: HELPER,
    from: `  const censusBefore = tmuxSocket !== null ? liveSessionNames() : null;`,
    to: `  const censusBefore = null;`,
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  {
    name: "the harness term build/harness-socket.mjs hands its child",
    file: 'harness-socket.mjs',
    from: `    GMUX_PROBES: process.env['GMUX_PROBES'] ?? '0'`,
    // The replacement is deliberately NOT a GMUX_* name. build/contract-
    // inventory.mjs sweeps build/ for that pattern, so an invented one here
    // would enter the contract baseline as a name nothing reads.
    to: `    TORTIE_ABLATED_NOT_A_HARNESS_TERM: '0'`,
    moved: (before, after) => before.term.found && !after.term.found
  }
];

/**
 * Run rule 5. Returns a one line summary for the pass sentence, or pushes
 * failures.
 */
async function runRule5(failures) {
  const helper = await import('./electron-run.mjs');
  const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
  const harnessSource = readFileSync(join(buildDir, 'harness-socket.mjs'), 'utf8');

  // 5a, 5b, 5c: the shipping refusals, driven.
  const live = await socketReadings(helper);
  if (!isSocketRefusal(live.a)) {
    failures.push({
      what: '5a: a launch naming a socket with no harness term was NOT refused',
      detail:
        'withElectron accepted it. That is the shape that put sessions on the ' +
        "operator's live -L gmux server twice, and it is what rule 5 exists for."
    });
  } else if (!/GMUX_PROBES/.test(live.a.message)) {
    failures.push({
      what: '5a: the refusal does not name GMUX_PROBES',
      detail:
        `It said "${live.a.message}". The message is the whole remedy a probe ` +
        'author gets, so it has to name the smallest correct fix.'
    });
  }
  if (live.a.ran) {
    failures.push({
      what: '5a: the body ran even though the launch was refused',
      detail:
        'The sentinel inside the body was reached, so the refusal happened ' +
        'after the launch rather than before it.'
    });
  }
  if (!isSocketRefusal(live.order)) {
    failures.push({
      what: '5a: the socket refusal is not the FIRST thing withElectron asks',
      detail:
        `A launch with a bad profile AND a socket with no harness term ` +
        `answered "${live.order.message}". Layer 2 must sit above the profile ` +
        'refusal and above the program check, so a launch in the wrong shape ' +
        'is refused before anything is created.'
    });
  }
  if (!live.b.threw || !/is not there/.test(live.b.message)) {
    failures.push({
      what: '5b: the same call with GMUX_PROBES did not reach the program check',
      detail:
        `It answered threw=${String(live.b.threw)} "${live.b.message}". This ` +
        'arm is how rule 5 proves 5a passed without launching anything: with ' +
        'a harness term set, the next refusal reached must be the program.'
    });
  }
  for (const [name, reading] of [
    ['differs', live.cDiffers],
    ['absent', live.cAbsent]
  ]) {
    if (!isSocketRefusal(reading)) {
      failures.push({
        what: `5c: a named tmuxSocket with the env socket ${name} was NOT refused`,
        detail:
          'The teardown would end one server while the app used another, ' +
          'which is build/p256/probe-explorers.mjs\'s shape exactly.'
      });
    } else if (!/gmux-p261-teardown/.test(reading.message)) {
      failures.push({
        what: `5c: the refusal for the ${name} case does not name the pair`,
        detail: `It said "${reading.message}".`
      });
    }
  }

  // 5d, the reader and the judgement.
  const announce = announcementReadings(helper);
  const expectations = [
    ['absent', announce.absent, null],
    ['present', announce.present, 'gmux-p261-1'],
    ['leadingNoise', announce.leadingNoise, 'gmux-p261-1'],
    ['chunked', announce.chunked, 'gmux-p261-1'],
    ['quoted', announce.quoted, 'gmux'],
    ['noWant', announce.noWant, null],
    ['noAnswer', announce.noAnswer, null],
    ['agrees', announce.agrees, null]
  ];
  for (const [name, got, want] of expectations) {
    if (got !== want) {
      failures.push({
        what: `5d: the ${name} fixture read ${JSON.stringify(got)}`,
        detail: `It must read ${JSON.stringify(want)}.`
      });
    }
  }
  if (announce.twice.length !== 2 || announce.twice[1] !== 'gmux') {
    failures.push({
      what: '5d: an app that announced twice was read as announcing once',
      detail:
        `The reader answered ${JSON.stringify(announce.twice)}. A second ` +
        'announcement naming a different socket must not be able to hide ' +
        'behind the first.'
    });
  }
  if (announce.differs === null || !/gmux/.test(String(announce.differs))) {
    failures.push({
      what: '5d: an announcement that disagrees was not a finding',
      detail:
        'announcementFinding answered null for a launch that asked for one ' +
        'socket and was told another, which is the reading that ends a run.'
    });
  }

  // 5d's other half, the census.
  const censusAdded = helper.censusFinding(['a', 'b'], ['a', 'b', 'shell-1-6']);
  const censusGone = helper.censusFinding(['a', 'b'], ['a']);
  const censusSame = helper.censusFinding(['a', 'b'], ['b', 'a']);
  const censusBoth = helper.censusFinding(['a', 'b'], ['a', 'claude-1-4']);
  if (censusSame !== null) {
    failures.push({
      what: '5d: an unchanged census was reported as a change',
      detail: `It said "${String(censusSame)}". Order is not a change.`
    });
  }
  for (const [name, reading, needle] of [
    ['a session that appeared', censusAdded, 'shell-1-6'],
    ['a session that went', censusGone, 'b'],
    ['both at once', censusBoth, 'claude-1-4']
  ]) {
    if (reading === null || !String(reading).includes(needle)) {
      failures.push({
        what: `5d: the census did not report ${name}`,
        detail: `It answered ${JSON.stringify(reading)}.`
      });
    }
  }

  // 5e, the harness term beside the socket.
  const term = harnessTermBesideSocket(harnessSource);
  if (!term.sawSocket) {
    failures.push({
      what: '5e: no spawn in build/harness-socket.mjs names GMUX_TMUX_SOCKET',
      detail:
        'The scanner found nothing to judge, so this rule cannot fail and is ' +
        'not a rule. Either the file moved or the scanner is broken.'
    });
  } else if (!term.found) {
    failures.push({
      what: '5e: build/harness-socket.mjs hands its child a socket and no harness term',
      detail:
        'The app ignores GMUX_TMUX_SOCKET unless one of ' +
        `${HARNESS_TERM_NAMES.join(', ')} is set, so every wrapped run that ` +
        "inherits its own environment runs on -L gmux, the operator's live " +
        "server. Put GMUX_PROBES: process.env['GMUX_PROBES'] ?? '0' back " +
        'beside GMUX_TMUX_SOCKET in that spawn.'
    });
  }
  for (const f of TERM_FIXTURES) {
    const got = harnessTermBesideSocket(f.text);
    if (got.found !== f.want) {
      failures.push({
        what: `5e: the fixture "${f.name}" read found=${String(got.found)}`,
        detail: `It must read found=${String(f.want)}. A scanner nobody has seen fail is not a scanner.`
      });
    }
  }

  // 5f, the one verb this file may aim at -L gmux.
  const verbs = operatorSocketVerbs(helperSource);
  if (verbs.length === 0) {
    failures.push({
      what: `5f: build/${HELPER} composes no -L gmux argv at all`,
      detail:
        'liveSessionNames() is the census reader and it is supposed to be ' +
        'there. Either it went or the scanner is broken, and both make rule ' +
        '5f vacuous.'
    });
  }
  for (const verb of verbs) {
    if (verb !== 'list-sessions') {
      failures.push({
        what: `5f: build/${HELPER} aims "${verb}" at -L gmux`,
        detail:
          "list-sessions is the only verb this file may ever give the " +
          "operator's private server. Everything else writes to it."
      });
    }
  }
  for (const f of VERB_FIXTURES) {
    const got = operatorSocketVerbs(f.text);
    if (JSON.stringify(got) !== JSON.stringify(f.want)) {
      failures.push({
        what: `5f: the fixture "${f.name}" read ${JSON.stringify(got)}`,
        detail: `It must read ${JSON.stringify(f.want)}.`
      });
    }
  }

  // 5g, the env that names the operator's own server. It is refused whatever
  // else the launch sets, and the control must still reach the program check,
  // because a clause that refuses everything is not this clause.
  for (const [name, reading] of [
    ['gmux', live.liveGmux],
    ['default', live.liveDefault]
  ]) {
    if (!isSocketRefusal(reading)) {
      failures.push({
        what: `5g: an env naming "${name}" with a harness term was NOT refused`,
        detail:
          `It answered threw=${String(reading.threw)} "${reading.message}". A ` +
          'harness term makes the app OBEY that name, so this launch would ' +
          "have run its sessions on the operator's live server, and with " +
          'tmuxSocket null the census never reads and layer 3 sees the app ' +
          'agree with what was asked for. Every layer passes it.'
      });
    } else if (!/OBEY/.test(reading.message)) {
      failures.push({
        what: `5g: the refusal for "${name}" does not say the app would obey it`,
        detail:
          `It said "${reading.message}". The message is the whole remedy, and ` +
          'the reason this shape is worse than the one 2a catches is that the ' +
          'override works.'
      });
    }
    if (reading.ran) {
      failures.push({
        what: `5g: the body ran for the env naming "${name}"`,
        detail: 'The sentinel inside the body was reached, so the refusal came too late.'
      });
    }
  }
  if (!live.liveControl.threw || !/is not there/.test(live.liveControl.message)) {
    failures.push({
      what: '5g: the control launch on a scratch socket did not reach the program check',
      detail:
        `It answered threw=${String(live.liveControl.threw)} ` +
        `"${live.liveControl.message}". A clause that refuses every env is ` +
        'not the clause 5g is about, and this arm is what tells the two apart.'
    });
  }

  // 5h, the wiring. The judgements above are pure and this gate drives them;
  // what nothing asked until the fix round is whether withElectron CALLS them.
  const wiring = backstopWiring(helperSource);
  if (!wiring.announcement) {
    failures.push({
      what: '5h: nothing in withElectron rejects a launch on a disagreeing announcement',
      detail:
        `${wiring.why.join('; ')}. announcementFinding can answer perfectly ` +
        'and change nothing, which is how layer 3 stops being a layer.'
    });
  }
  if (!wiring.census) {
    failures.push({
      what: '5h: withElectron does not read the census around the launch',
      detail:
        `${wiring.why.join('; ')}. The read has to happen before the spawn ` +
        'and be judged in the finally block, or layer 4 is a function nobody ' +
        'calls.'
    });
  }
  for (const f of WIRING_FIXTURES) {
    const got = backstopWiring(f.text);
    if (got.announcement !== f.want.announcement || got.census !== f.want.census) {
      failures.push({
        what: `5h: the fixture "${f.name}" read announcement=${String(got.announcement)} census=${String(got.census)}`,
        detail:
          `It must read announcement=${String(f.want.announcement)} ` +
          `census=${String(f.want.census)}. A scanner nobody has seen fail is ` +
          'not a scanner.'
      });
    }
  }

  // The ablations.
  const before = {
    ...live,
    announce,
    censusAdded,
    term,
    wiring
  };
  let ablationsRed = 0;
  const dir = mkdtempSync(join(tmpdir(), 'p261-ablate-'));
  try {
    for (const ab of SOCKET_ABLATIONS) {
      const copyDir = join(dir, `ab-${String(ablationsRed)}-${Date.now()}`);
      mkdirSync(copyDir, { recursive: true });
      const sources = {
        [HELPER]: helperSource,
        'harness-socket.mjs': harnessSource
      };
      if (!sources[ab.file].includes(ab.from)) {
        failures.push({
          what: `the ablation "${ab.name}" found nothing to edit`,
          detail:
            `It looks for ${JSON.stringify(ab.from)} in build/${ab.file} and ` +
            'that text is not there. An ablation that edits nothing proves ' +
            'nothing, so the clause moved and this list has to move with it.'
        });
        continue;
      }
      // Only the file being ablated is copied out; the other is read in place,
      // because these two do not import each other.
      const target = join(copyDir, ab.file);
      writeFileSync(target, sources[ab.file].replace(ab.from, ab.to));

      let after;
      if (ab.file === HELPER) {
        let copy;
        try {
          copy = await import(`${target}?p261=${String(Date.now())}`);
        } catch (err) {
          failures.push({
            what: `the ablated copy for "${ab.name}" would not load`,
            detail:
              `${String(err?.message ?? err)}. A copy that fails to load fails ` +
              'this gate for the wrong reason and says nothing about the ' +
              'clause, which is Phase 219\'s rule.'
          });
          continue;
        }
        if (typeof copy.withElectron !== 'function') {
          failures.push({
            what: `the ablated copy for "${ab.name}" answered nothing`,
            detail: 'It loaded but exports no withElectron, so it was not driven.'
          });
          continue;
        }
        after = {
          ...(await socketReadings(copy)),
          announce: announcementReadings(copy),
          censusAdded: copy.censusFinding(['a', 'b'], ['a', 'b', 'shell-1-6']),
          term,
          // The wiring is a property of the TEXT, so an ablation of it is read
          // off the ablated copy rather than driven. It is the one reading here
          // that no drive can take, which is exactly why it was missing.
          wiring: backstopWiring(readFileSync(target, 'utf8'))
        };
      } else {
        after = {
          ...before,
          term: harnessTermBesideSocket(readFileSync(target, 'utf8'))
        };
      }
      if (ab.moved(before, after)) ablationsRed += 1;
      else {
        failures.push({
          what: `the ablation "${ab.name}" moved no reading`,
          detail:
            'The clause was removed and rule 5 still passed, so nothing in ' +
            'this gate is holding it.'
        });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  return {
    // COUNTED, and the denominator is counted too, because a hand written
    // number beside a measured one is how this file's rule 2 used to lie.
    refusals: WRONG_SHAPES(live).filter(isSocketRefusal).length,
    shapes: WRONG_SHAPES(live).length,
    wiredBackstops: [wiring.announcement, wiring.census].filter(Boolean).length,
    ablationsRed
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * Every script under build/ this gate reads, by the name it is reported under,
 * which is relative to build/.
 *
 * IT WALKS, AND UNTIL PHASE 240'S FIX ROUND IT DID NOT. `readdirSync(buildDir)`
 * read one level, and Phase 240 was the first phase to put an Electron starter
 * in a subdirectory: `build/p240/save-loss.mjs` and `build/p240/save-choice.mjs`
 * both launch through the helper and both were invisible to every rule in this
 * file. Nothing leaked, because both go through `withElectron`; what was missing
 * was the guard that says so. build/assert-known-hosts-scoped.mjs had walked for
 * exactly this reason since Phase 193, and its own header says why: "Costing
 * nothing today is exactly when a boundary is cheap to close." Phase 240 created
 * that future and this closes it.
 *
 * The walk itself is build/build-scripts.mjs, shared with the other two gates
 * that ask a question of every script under build/ rather than copied a third
 * time, and its header carries what it refuses to walk into and why.
 */
function buildFiles() {
  return buildScriptNames(buildDir);
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

async function main() {
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

  // Rule 5, the socket refusal, driven rather than read.
  const socket = await runRule5(failures);

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
      `${String(fixtures.floorRefused)} of the 2 populations it was shown. ` +
      `The socket refusal was CALLED rather than read: ` +
      `${String(socket.refusals)} of ${String(socket.shapes)} launches in ` +
      `the wrong shape were refused before anything was spawned, an env ` +
      `naming the operator's own server among them and a control beside it, ` +
      `the announcement reader and the census judged their fixtures, ` +
      `${String(socket.wiredBackstops)} of 2 backstops are wired into ` +
      `withElectron's own braces, build/harness-socket.mjs hands its child ` +
      `a harness term beside the socket, list-sessions is the only verb aimed ` +
      `at -L gmux, and ${String(socket.ablationsRed)} of ` +
      `${String(SOCKET_ABLATIONS.length)} ablations each moved a reading.`
  );
}

if (process.argv.includes('--list')) list();
else await main();
