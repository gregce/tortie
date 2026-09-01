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
 *   2. REVERSE. Every file on the recorded list below still reaches the helper,
 *      being an import of ./electron-run.mjs and a call to withElectron or
 *      runElectron. Without this direction the gate would go on passing after
 *      somebody deleted every probe, which is the same lesson
 *      build/assert-probe-containment.mjs records about itself at its line 27.
 *   3. THE HELPER ITSELF. electron-run.mjs kills inside a `finally` block, read
 *      by matching braces rather than by searching for a string. A gate that
 *      greps for the word "finally" passes on a file that mentions it in a
 *      comment.
 *   4. THE FIXTURES. The scanner is run over three files this script writes
 *      itself: one that launches through the helper, one that spawns the shim
 *      directly, and one that spawns it through a variable called "bin", which
 *      is how a rule like this gets around by accident. The first must produce
 *      no finding and the other two must produce exactly one each. A checker
 *      nobody has seen fail is a checker nobody has seen work.
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
 * The files that reached the helper when Phase 140 landed. The reverse
 * direction reads this list. When a probe is deleted on purpose, delete its row
 * here in the same commit and say so in the commit body. Do not delete the row
 * to make a red gate green.
 */
const HELPER_USERS = [
  'fault-harness.mjs',
  'p117-create-unknown.mjs',
  'p118-remote-children.mjs',
  'p118-shot.mjs',
  'p132-install-sheet.mjs',
  'p134-about-shot.mjs',
  'partition-harness.mjs',
  'probe-finder-open.mjs',
  'probe-fullscreen-menu.mjs',
  'probe-home-machines.mjs',
  'probe-home-update-line.mjs',
  'probe-machines.mjs',
  'probe-p101-shot.mjs',
  'probe-p102-shot.mjs',
  'probe-p103-shot.mjs',
  'probe-p104-shot.mjs',
  'probe-p119-menu.mjs',
  'probe-p120-shot.mjs',
  'probe-p127-probes.mjs',
  'probe-p129-agents.mjs',
  'probe-p129-chord.mjs',
  'probe-p129-projects.mjs',
  'probe-p129-rail.mjs',
  'probe-p130-install-copy.mjs',
  'probe-p130-prose.mjs',
  'probe-p130-spacing.mjs',
  'probe-p131-row.mjs',
  'probe-p133-login-session.mjs',
  'probe-p135-chrome.mjs',
  'probe-p135-verify.mjs',
  'probe-p137-overview.mjs',
  'probe-p1372-columns.mjs',
  'probe-p181-usage-switch.mjs',
  'probe-p1811-strip-fit.mjs',
  'probe-p1812-bar-and-card.mjs',
  'probe-p1372-menu.mjs',
  'probe-p138-fold.mjs',
  'probe-p139-caption.mjs',
  'probe-p143-story.mjs',
  'probe-p166-cache.mjs',
  'probe-p185-drawing.mjs',
  'probe-p93-attention.mjs',
  'probe-p94-hotkey.mjs',
  'probe-p95-scroll.mjs',
  'probe-p96-remote-surfaces.mjs',
  'probe-p97-untracked.mjs',
  'probe-remote-project.mjs',
  'probe-remote-recents.mjs',
  'probe-session-focus.mjs',
  'probe-shell-open.mjs',
  'probe-shell-path.mjs',
  'probe-workspace-target.mjs',
  'remote-matrix.mjs',
  'smoke-standalone.mjs',
  'tmux-pair.mjs',
  'update-rehearsal.mjs'
];

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
    return {
      good: goodHits.length,
      bad: badHits.length,
      sly: slyHits.length
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function main() {
  const failures = [];
  const files = readdirSync(buildDir).filter(
    (n) => n.endsWith('.mjs') || n.endsWith('.cjs') || n.endsWith('.mts')
  );

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

  // Rule 2, reverse.
  for (const name of HELPER_USERS) {
    let source;
    try {
      source = readFileSync(join(buildDir, name), 'utf8');
    } catch {
      failures.push({
        what: `build/${name} is on the recorded list and is not on disk`,
        detail:
          'Either it was deleted and HELPER_USERS in this file went stale, or ' +
          'it was renamed. Edit the list on purpose rather than deleting the ' +
          'row to make this gate green.'
      });
      continue;
    }
    const use = usesHelper(source);
    if (!use.imported || !use.called) {
      failures.push({
        what: `build/${name} no longer reaches the helper`,
        detail:
          `It imports ./${HELPER}: ${String(use.imported)}. It calls ` +
          `withElectron or runElectron: ${String(use.called)}. Both must be ` +
          'true. Without this direction the gate goes on passing while ' +
          'checking nothing.'
      });
    }
  }

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
      `none starts an Electron itself. ${String(HELPER_USERS.length)} reach ` +
      `build/${HELPER}, whose kill is inside a finally block. Fixtures: the ` +
      `good one produced ${String(fixtures.good)} findings, the bad one ` +
      `produced ${String(fixtures.bad)}, and the one that hides the name ` +
      `produced ${String(fixtures.sly)}.`
  );
}

main();
