#!/usr/bin/env node
/**
 * probe-p154-drop.mjs. The Phase 154 lane: a drop from outside, and a drag out.
 *
 * ## What it proves, in two launches
 *
 * LAUNCH 1, "regression", is the rule that outranks everything in this phase.
 * It drives the EXISTING probes for the two meanings a tree drag already had,
 * unchanged and with their own assertions:
 *   - `treeDrop`, the tree row dragged onto a terminal pane (the ATTACH half,
 *     src/renderer/terminal/drop/shot-probe.ts), including that a pointer over
 *     the sidebar arms nothing;
 *   - `treeOps`, the explorer's file verbs (src/renderer/tree/shot-probe.ts),
 *     which include drag-to-move into a folder, a move that would overwrite
 *     asking first, `.git` refused at both ends, and the drag contract arming
 *     with absolute paths.
 * Not one line of either was written for this phase, so a pass is a
 * measurement of the two old meanings rather than an assurance about them.
 *
 * LAUNCH 2, "phase154", drives the new probe, being the drop from outside and
 * the drag out. The gesture half uses synthetic drag events over the REAL
 * mounted tree; the effect half calls the REAL `fs:importPaths` channel with
 * REAL absolute paths this script wrote outside the project. The split is
 * forced: a script created `DataTransfer` cannot carry a path.
 *
 * ## What it changes
 *
 * Nothing that belongs to the person. Every file it writes is under its own
 * scratch directory. One caveat, stated because it is a real side effect: the
 * confirmed-overwrite path in the product uses `shell.trashItem`, so a
 * confirmed replace would put a scratch file in the Trash. This probe does NOT
 * confirm that dialog. It reads the dialog and cancels it, and the
 * trash-before-replace rule is measured in the unit lane
 * (src/main/fs/__tests__/p154-import.test.ts) where `trashItem` is injected.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory, and every launch goes through build/electron-run.mjs, which
 *    ends the whole tree it started in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file. Every rm
 *    names an absolute path inside this probe's own scratch root.
 *
 * ## WHAT THIS PROBE CANNOT PROVE, AND IT IS A CHARTER PROOF ITEM
 *
 * The charter asks for "the drag out driven to a real Finder destination with
 * the resulting file compared byte for byte against the source". This probe
 * does not do that, and no probe in this tree can. `webContents.startDrag`
 * hands the gesture to the macOS drag loop the instant it is called, and from
 * that moment the file's journey belongs to the window server and to Finder.
 * Nothing here can hold a mouse button down across that boundary, and a
 * synthetic event cannot enter it.
 *
 * So the drag out is proved in two halves that stop either side of the loop:
 *
 *   1. Up to the call. `fs:startDrag` is reached with the right absolute
 *      paths and a non empty icon, every refusal refuses, and the round trip
 *      fits inside the window where the button is still down. Measured here.
 *   2. Past the call. Nothing. It rests on macOS doing what `startDrag`
 *      documents.
 *
 * The byte for byte comparison was done on the IMPORT direction instead,
 * where the whole path is ours. That is a different claim and it is not a
 * substitute.
 *
 * This is a DECLARED limit rather than a hidden one, and the phase is not
 * done on this probe's word alone: a person drags a row from the tree to the
 * Desktop, opens what lands, and confirms it is the file. Whoever writes the
 * commit says the drag out half rests on that step.
 *
 * ## Environment it reads
 *
 *   P154_OUT_DIR   where the pictures and the JSON go. Default out/p154.
 *   P154_LABEL     a word folded into the file names, e.g. parent or after.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p154-drop 'node build/probe-p154-drop.mjs'
 *
 * Exit 0 when both launches passed every step. 1 when they did not. 2 when the
 * probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p154]';

const say = (line) => {
  console.log(`${TAG} ${line}`);
};
const refuse = (why) => {
  console.error(`${TAG} ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p154-drop 'node " +
      "build/probe-p154-drop.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const label = (process.env['P154_LABEL'] ?? '').trim() || 'run';
const outDir = resolve(
  repoRoot,
  (process.env['P154_OUT_DIR'] ?? '').trim() || 'out/p154'
);
mkdirSync(outDir, { recursive: true });

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// One scratch root. The project inside it, and the "Finder" folder OUTSIDE it.
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p154-drop');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p154-project', 'src'), { recursive: true });
mkdirSync(join(rawRoot, 'outside', 'bundle'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p154-project');
const outside = join(root, 'outside');

writeFileSync(join(project, 'README.md'), '# Phase 154\n', 'utf8');
writeFileSync(join(project, 'src', 'index.ts'), 'export const one = 1;\n', 'utf8');
// The four things the probe brings in. `notes.md` carries a distinctive body
// so a byte comparison after the copy is meaningful.
const NOTES = 'incoming notes, written outside the project\n';
writeFileSync(join(outside, 'notes.md'), NOTES, 'utf8');
writeFileSync(join(outside, 'root-drop.md'), 'lands at the root\n', 'utf8');
writeFileSync(join(outside, 'filtered.md'), 'landed while filtered\n', 'utf8');
writeFileSync(join(outside, 'multi-a.md'), 'one of two\n', 'utf8');
writeFileSync(join(outside, 'multi-b.md'), 'two of two\n', 'utf8');
writeFileSync(join(outside, 'beside.md'), 'a neighbour to aim at\n', 'utf8');
writeFileSync(join(outside, 'aimed-at-a-file.md'), 'aimed at a file row\n', 'utf8');
writeFileSync(join(outside, 'bundle', 'inner.txt'), 'inside the bundle\n', 'utf8');

const git = (...args) =>
  spawnSync('git', ['-C', project, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p154@example.invalid');
git('config', 'user.name', 'Phase 154 probe');
git('config', 'commit.gpgsign', 'false');
git('add', '-A');
git('commit', '-q', '-m', 'first');

const failures = [];

// ---------------------------------------------------------------------------
// LAUNCH 1 — the two existing meanings, driven by the probes that already
// existed for them. Their specs are copied from the phases that wrote them.
// ---------------------------------------------------------------------------

async function launchRegression() {
  const png = join(outDir, `p154-${label}-regression.png`);
  rmSync(png, { force: true });
  const drive = {
    projectPath: project,
    sidebarView: 'explorer',
    session: { agent: 'shell', name: 'p154-pane' },
    treeDrop: { rels: ['src/index.ts'] },
    treeOps: { scratchDir: 'p154-ops' }
  };
  say('launch 1: the two existing meanings');
  const { code, text } = await runElectron({
    label: 'p154 regression',
    userDataDir: join(root, 'profile-regression'),
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_SIZE: '1600x1000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      // The two old probes report through the RENDERER's console, which is
      // where their results have always gone, so this is the switch that lets
      // them be read from out here at all.
      GMUX_SHOT_VERBOSE: '1'
    },
    ceilingMs: 300_000,
    settleMs: 500
  });
  return { code, text, png: existsSync(png) ? png : null };
}

/** Pull `[shot-drive] treeOps result {...}` style lines out of the log. */
function resultsIn(text, marker) {
  const out = [];
  for (const line of text.split('\n')) {
    const at = line.indexOf(marker);
    if (at === -1) continue;
    try {
      out.push(JSON.parse(line.slice(at + marker.length).trim()));
    } catch {
      /* a line that is not the JSON one */
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// LAUNCH 2 — the drop from outside and the drag out.
// ---------------------------------------------------------------------------

function p154Js() {
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const deadline = Date.now() + 40000;
    while (Date.now() < deadline) {
      if (typeof window.__gmuxP154 === 'function') break;
      await wait(250);
    }
    if (typeof window.__gmuxP154 !== 'function') {
      return { error: 'the p154 probe never registered' };
    }
    // The tree has to be mounted before any of it can be driven.
    const treeDeadline = Date.now() + 30000;
    while (Date.now() < treeDeadline) {
      if (document.querySelector('.files-tree') !== null) break;
      await wait(250);
    }
    await wait(1500);
    const main = await window.__gmuxP154({
      outsideDir: ${JSON.stringify(outside)},
      scratchDir: 'p154-in'
    });
    // THE REMOTE CASE, in the same launch rather than a third one: one app run
    // per phase is the rule, and this drives a second tab in the same window.
    let remote = { steps: [{ name: 'the remote case ran', ok: false, detail: 'the remote drive never registered' }], passed: 0, failed: 1 };
    if (typeof window.__gmuxP154Remote === 'function') {
      remote = await window.__gmuxP154Remote();
    }
    return {
      ...main,
      steps: [...main.steps, ...remote.steps],
      passed: main.passed + remote.passed,
      failed: main.failed + remote.failed
    };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;
}

async function launchPhase() {
  const png = join(outDir, `p154-${label}-hover.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, sidebarView: 'explorer' };
  say('launch 2: the drop from outside and the drag out');
  const { code, text } = await runElectron({
    label: 'p154 phase',
    userDataDir: join(root, 'profile-phase'),
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      GMUX_SHOT_SIZE: '1600x1000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: p154Js()
    },
    ceilingMs: 360_000,
    settleMs: 500
  });
  const marker = '[gmux-shot] probe ';
  const at = text.lastIndexOf(marker);
  let report = null;
  if (at !== -1) {
    try {
      report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? '');
    } catch {
      report = null;
    }
  }
  return { code, text, report, png: existsSync(png) ? png : null };
}

/**
 * ONE photograph of ONE drop affordance. A hover lives for the length of a
 * gesture, so the only way to picture it is to hold it.
 *
 * There is ONE THEME. `src/renderer/index.html` declares `color-scheme: dark`
 * and tokens.css says the names are theme-neutral "so a light theme can be
 * added later". So this is a picture per target kind and that is the whole
 * set; the charter's "in both themes" asks for something Tortie does not have.
 */
async function launchHover(kind) {
  const png = join(outDir, `p154-${label}-hover-${kind}.png`);
  rmSync(png, { force: true });
  const js = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    if (typeof window.__gmuxP154Hover === 'function' &&
        document.querySelector('.files-tree') !== null) break;
    await wait(250);
  }
  await wait(1200);
  if (typeof window.__gmuxP154Hover !== 'function') return { ok: false, detail: 'no hover drive' };
  return await window.__gmuxP154Hover(${JSON.stringify(kind)});
})()`;
  say(`launch: the ${kind} affordance, held for the picture`);
  const { text } = await runElectron({
    label: `p154 hover ${kind}`,
    userDataDir: join(root, `profile-hover-${kind}`),
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '8000',
      GMUX_SHOT_SIZE: '1200x820',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        sidebarView: 'explorer'
      }),
      GMUX_SHOT_JS: js
    },
    ceilingMs: 120_000,
    settleMs: 400
  });
  const marker = '[gmux-shot] probe ';
  const at = text.lastIndexOf(marker);
  let report = null;
  if (at !== -1) {
    try {
      report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? '');
    } catch {
      report = null;
    }
  }
  return { png: existsSync(png) ? png : null, report };
}

function printSteps(title, steps) {
  console.log('');
  say(title);
  for (const step of steps) {
    console.log(`   ${step.ok ? 'PASS' : 'FAIL'}  ${step.name}`);
    console.log(`         ${step.detail}`);
  }
}

async function main() {
  // ---- launch 1
  const one = await launchRegression();
  const log1 = join(outDir, `p154-${label}-regression.log`);
  writeFileSync(log1, one.text, 'utf8');
  say(`launch 1 log: ${log1}`);
  const treeDropResults = resultsIn(one.text, 'treeDrop result ');
  const treeOpsResults = resultsIn(one.text, 'treeOps result ');
  const drop = treeDropResults[treeDropResults.length - 1] ?? null;
  const ops = treeOpsResults[treeOpsResults.length - 1] ?? null;

  console.log('');
  say('THE TWO EXISTING MEANINGS, driven by the probes written before this phase');
  if (drop === null) {
    failures.push('the ATTACH probe (treeDrop) printed no result');
    say('  treeDrop: no result');
  } else {
    // The treeDrop probe answers with a DATA structure rather than pass/fail
    // steps, so the assertions are made here — and they are the contract's own
    // conflict matrix, which is the strongest statement available that the two
    // old meanings are where they were.
    const c = drop.conflict ?? {};
    const checks = [
      ['the stamp is readable off the transfer', drop.stampReadable === true,
        String(drop.stampReadable)],
      ['a tree drag over the TREE arms no pane overlay and no window frame',
        drop.overTree?.leaf === null && drop.overTree?.window === false,
        JSON.stringify(drop.overTree)],
      ['a tree drag over a PANE arms that pane and not the window frame',
        typeof drop.overPane?.leaf === 'string' &&
          drop.overPane.leaf.length > 0 &&
          drop.overPane.window === false,
        JSON.stringify(drop.overPane)],
      ['over a Pierre ROW: Pierre rings the row, nothing else is armed',
        typeof c.pierreRow?.pierreRow === 'string' &&
          c.pierreRow.paneOverlay === null &&
          c.pierreRow.windowFrame === false,
        JSON.stringify(c.pierreRow)],
      ['over the EMPTY tree space: the root ring, nothing else',
        c.emptyTreeSpace?.rootRing === true &&
          c.emptyTreeSpace.paneOverlay === null &&
          c.emptyTreeSpace.windowFrame === false,
        JSON.stringify(c.emptyTreeSpace)],
      ['over a PANE: the attach overlay, and no tree affordance',
        typeof c.pane?.paneOverlay === 'string' &&
          c.pane.pierreRow === null &&
          c.pane.rootRing === false &&
          c.pane.windowFrame === false,
        JSON.stringify(c.pane)],
      ['ELSEWHERE: nothing at all is armed',
        c.elsewhere?.paneOverlay === null &&
          c.elsewhere.windowFrame === false &&
          c.elsewhere.pierreRow === null &&
          c.elsewhere.rootRing === false,
        JSON.stringify(c.elsewhere)],
      // The newlines come OUT before the match. This is a terminal render at a
      // real pane width, so a long path is hard wrapped: one run of this probe
      // read `.../src/index.t` then a newline then `s'`, and a naive substring
      // check called that a regression when the drop had landed perfectly.
      ['the dropped reference reached the pane',
        typeof drop.paneText === 'string' &&
          drop.paneText.replace(/\r?\n/g, '').includes('index.ts'),
        (drop.paneText ?? '').replace(/\r?\n/g, ' ').slice(-90)]
    ];
    printSteps(
      'ATTACH — a tree row onto a terminal pane, and the conflict matrix',
      checks.map(([name, ok, detail]) => ({ name, ok, detail }))
    );
    const bad = checks.filter(([, ok]) => !ok);
    if (bad.length > 0) {
      failures.push(
        `the ATTACH meaning regressed: ${String(bad.length)} of ${String(checks.length)} checks failed`
      );
    }
  }
  if (ops === null) {
    failures.push('the MOVE probe (treeOps) printed no result');
    say('  treeOps: no result');
  } else {
    printSteps('MOVE and the file verbs', ops.steps ?? []);
    say(`  treeOps: ${String(ops.passed)} passed, ${String(ops.failed)} failed`);
    if ((ops.failed ?? 1) > 0) {
      failures.push(`the MOVE meaning regressed: ${String(ops.failed)} steps failed`);
    }
  }

  // ---- launch 2
  const two = await launchPhase();
  if (two.report === null) {
    failures.push(`the p154 probe printed no reading (electron exited ${String(two.code)})`);
  } else if (two.report.error !== undefined) {
    failures.push(`the p154 probe reported ${String(two.report.error)}`);
  } else {
    printSteps('PHASE 154 — the drop from outside and the drag out', two.report.steps);
    console.log('');
    say(
      `p154: ${String(two.report.passed)} passed, ${String(two.report.failed)} failed`
    );
    say(
      `fs:startDrag invoke round trip: ${String(two.report.startDragRoundTripMs)} ms ` +
        '(the system icon lookup is inside that number)'
    );
    if (two.report.failed > 0) {
      failures.push(`${String(two.report.failed)} Phase 154 steps failed`);
    }
  }

  // ---- the byte comparison, done on this side where a real file exists
  const copied = join(project, 'p154-in', 'notes.md');
  if (existsSync(copied)) {
    const same = readFileSync(copied, 'utf8') === NOTES;
    say(
      `the imported file is byte identical to the source: ${String(same)} ` +
        `(${String(readFileSync(copied).length)} bytes)`
    );
    if (!same) failures.push('the imported file does not match the source byte for byte');
  } else {
    failures.push('no imported file was left on disk to compare');
  }
  // The original must still be where the person left it: this is a COPY.
  const originalIntact = readFileSync(join(outside, 'notes.md'), 'utf8') === NOTES;
  say(`the source outside the project is untouched: ${String(originalIntact)}`);
  if (!originalIntact) failures.push('the source file outside the project was changed');

  // ---- the affordance, one picture per target kind, one theme
  console.log('');
  say('THE DROP AFFORDANCE, held for a picture');
  const pictures = [];
  for (const kind of ['folder', 'root', 'refused']) {
    const shot = await launchHover(kind);
    pictures.push([kind, shot.png]);
    const detail = shot.report?.detail ?? 'no reading';
    const ok = shot.report?.ok === true && shot.png !== null;
    console.log(`   ${ok ? 'PASS' : 'FAIL'}  the ${kind} affordance was armed and photographed`);
    console.log(`         ${detail}`);
    console.log(`         ${String(shot.png)}`);
    if (!ok) failures.push(`the ${kind} affordance was not photographed`);
  }

  const jsonPath = join(outDir, `p154-${label}.json`);
  writeFileSync(
    jsonPath,
    JSON.stringify({ treeDrop: drop, treeOps: ops, p154: two.report }, null, 2),
    'utf8'
  );
  console.log('');
  say(`pictures: ${String(one.png)} and ${String(two.png)}`);
  say(`reading: ${jsonPath}`);
  if (one.png === null) failures.push('launch 1 wrote no picture');
  if (two.png === null) failures.push('launch 2 wrote no picture');
}

await main();

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}

rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. The two old meanings are unchanged and the two new ones work.');
