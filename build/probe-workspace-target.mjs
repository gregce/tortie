#!/usr/bin/env node
/**
 * probe-workspace-target.mjs. The Phase 90.1 live probe.
 *
 * WHAT IT PROVES. One claim, at Tier 3.
 *
 *   When the active project tab moves to a project with the SAME path on a
 *   DIFFERENT machine, all four sidebar stores re-target, clear what they hold
 *   and do no local work. When it moves back, each does its local work once.
 *
 * WHAT IT CANNOT PROVE, and the report has to say so. No product surface can
 * create a project tab on another machine yet, so the second tab is INJECTED by
 * the renderer drive in src/renderer/app/target-shot-drive.ts. What is proven is
 * what the four stores do on a switch. What is not proven, because it cannot
 * exist yet, is a person creating a project tab on another machine. There is
 * also no before number for the switch to another machine, because no build
 * before this one can be driven into that state. The before state is a reading
 * of four lines of code and it is not a measurement.
 *
 * HOW IT READS. Each run launches the app under GMUX_SHOT with a scratch git
 * repository as its project, calls `window.__gmuxTargetProbe` through
 * GMUX_SHOT_JS, and prints the JSON that comes back. It takes two readings that
 * do not share a code path. The first is the store numbers. The second is the
 * three sentences, read out of the document by their text.
 *
 * THE THREE RUNS. The sidebar mounts ONE view at a time, and a store follows
 * the active project only while the view that owns it is mounted. So there is
 * one run per view. The Explorer run measures the file tree and its git
 * decorations, the Search run measures the search store, and the Context run
 * measures the Context store.
 *
 * THE SCREENSHOTS. Each run also writes one PNG, through the GMUX_SHOT capture,
 * which photographs the app's own web contents and nothing else. Each run ends
 * on the injected tab, so each PNG shows one of the three sentences.
 *
 * SAFETY, ABSOLUTE. The probe runs on the socket build/harness-socket.mjs gave
 * it, which that script refuses to let be `gmux` or `default`. It uses its own
 * user data directory and its own scratch project, both outside the repository.
 * It names `-L gmux` in exactly one place, a read only session count taken
 * before and after, which must match. It never uses pkill, never uses
 * kill-server, and kills only the pid it spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:workspacetarget
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p901-target \
 *     'node build/probe-workspace-target.mjs --keep'
 *
 * Exit code 0 when every cell passes. Exit code 1 otherwise, with every failing
 * cell named. Exit code 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:workspacetarget]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p901-target 'node " +
      "build/probe-workspace-target.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/**
 * The operator's live server, listed and never written. This is the ONLY place
 * this file names it.
 */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// The scratch project
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p901-target');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p90.1 target probe\n', 'utf8');
writeFileSync(
  join(project, 'src', 'alpha.ts'),
  'export const alpha = "needle";\n',
  'utf8'
);
writeFileSync(
  join(project, 'src', 'beta.ts'),
  'export const beta = "needle";\n',
  'utf8'
);
for (const argv of [
  ['init', '-q'],
  ['add', '-A'],
  ['-c', 'user.email=probe@example.com', '-c', 'user.name=probe', 'commit', '-q', '-m', 'seed']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
writeFileSync(join(project, 'src', 'gamma.ts'), 'export const gamma = 1;\n', 'utf8');

// ---------------------------------------------------------------------------
// One run of the app
// ---------------------------------------------------------------------------


/**
 * Launch the app once, drive it to the scratch project, call the probe through
 * GMUX_SHOT_JS, and return the parsed result plus the screenshot path.
 */
async function runOnce(name, spec) {
  const shotPath = join(scratch, `p90.1-target-${name}.png`);
  rmSync(shotPath, { force: true });
  const drive = { projectPath: project };
  const { code, text } = await runElectron({
    label: 'workspace-target',
    userDataDir: `${profile}-${name}`,
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: shotPath,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: `window.__gmuxTargetProbe(${JSON.stringify(spec)})`
    },
    ceilingMs: 180_000,
    settleMs: 750,
    echo: true
  });

  const marker = '[gmux-shot] probe ';
  const at = text.lastIndexOf(marker);
  let result = null;
  if (at !== -1) {
    const line = text.slice(at + marker.length).split('\n')[0] ?? '';
    try {
      result = JSON.parse(line);
    } catch {
      result = null;
    }
  }
  return { code, result, shotPath: existsSync(shotPath) ? shotPath : null };
}

// ---------------------------------------------------------------------------
// The three runs, one per sidebar view
// ---------------------------------------------------------------------------

/**
 * The sidebar mounts ONE view at a time, and a store follows the active project
 * only while the view that owns it is mounted. So each run holds one view open
 * and the cells checked for that run are the stores that view owns.
 */
const RUNS = [
  { view: 'explorer', stores: ['fileTree', 'gitStatus'], mark: 'filesElsewhere' },
  { view: 'search', stores: ['search'], mark: 'searchElsewhere' },
  { view: 'context', stores: ['context'], mark: 'contextElsewhere' }
];

const failures = [];
const done = [];

for (const run of RUNS) {
  const out = await runOnce(run.view, {
    settleMs: 1200,
    resetCount: 50,
    hold: 'elsewhere',
    view: run.view,
    query: 'needle'
  });
  done.push({ ...run, ...out });
}

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

console.log('');
console.log('');
say('the no-op count, 50 re-sets of a freshly composed EQUAL target');
say('it counts a change of the target field, which only the setter writes');
console.log('  view       store       target changes');
console.log('  ---------  ----------  --------------');
for (const run of done) {
  const noOp = run.result?.noOpSets ?? {};
  for (const store of ['fileTree', 'gitStatus', 'search', 'context']) {
    const n = noOp[store];
    console.log(
      `  ${run.view.padEnd(9)}  ${store.padEnd(10)}  ${String(n ?? 'not read').padStart(14)}`
    );
    if (n !== 0) {
      failures.push(
        `${store} replaced its target ${String(n)} times across 50 re-sets of ` +
          'an equal target in the ' + run.view + ' run, expected 0. A non zero ' +
          'count is a re-render storm'
      );
    }
  }
}

console.log('');
say('the matrix, one row per store per moment. A cell is checked only in the');
say('run whose view mounts that store, because nothing else follows the tab');
console.log('  view       moment            store       machine  content');
console.log('  ---------  ----------------  ----------  -------  ------------------------');
for (const run of done) {
  const readings = run.result?.readings ?? [];
  for (const one of readings) {
    for (const store of ['fileTree', 'gitStatus', 'search', 'context']) {
      const r = one[store] ?? {};
      const machine =
        r.target === null || r.target === undefined ? 'none' : r.target.machineId;
      const owned = run.stores.includes(store) ? ' ' : '.';
      console.log(
        `  ${run.view.padEnd(9)}${owned} ${String(one.name).padEnd(16)}  ` +
          `${store.padEnd(10)}  ${String(machine).padEnd(7)}  ` +
          `${JSON.stringify(r.counts ?? {})}`
      );
    }
  }
}

for (const run of done) {
  const readings = run.result?.readings ?? [];
  if (run.result === null) {
    failures.push(`the ${run.view} run printed no result, so nothing was measured`);
    continue;
  }
  if (run.result.ok !== true) {
    failures.push(`the ${run.view} run refused: ${String(run.result.why)}`);
    continue;
  }
  const A = readings.find((r) => r.name === 'A local') ?? null;
  const B = readings.find((r) => r.name === 'B elsewhere') ?? null;
  const C = readings.find((r) => r.name === 'C local again') ?? null;
  const D = readings.find((r) => r.name === 'D elsewhere held') ?? null;
  if (A === null || B === null || C === null || D === null) {
    failures.push(`the ${run.view} run did not read all four moments`);
    continue;
  }
  for (const store of run.stores) {
    // Moment A: the local tab holds this Mac's content.
    if (A[store].localPath === null) {
      failures.push(`${store} had no local path on the local tab in the ${run.view} run`);
    }
    // Moment B: the store re-targeted and holds nothing.
    const b = B[store];
    if (b.target === null || b.target.machineId !== run.result.machineId) {
      failures.push(
        `${store} still reports machine ` +
          `${String(b.target === null ? 'none' : b.target.machineId)} on the ` +
          'injected tab. The badge moved and the store did not'
      );
    }
    if (b.localPath !== null) {
      failures.push(`${store} produced a local path for a target on another machine`);
    }
    // Moment C: the local content came back.
    if (C[store].localPath === null) {
      failures.push(`${store} did not come back on the local tab in the ${run.view} run`);
    }
  }
  if (run.stores.includes('fileTree')) {
    if (Number(A.fileTree.counts.listedDirs) < 1) {
      failures.push('reading A listed no directories, so the probe measured an empty app');
    }
    if (B.fileTree.counts.listedDirs !== 0) {
      failures.push(
        `the file tree still holds ${String(B.fileTree.counts.listedDirs)} ` +
          "directories of this Mac's content on the injected tab"
      );
    }
    if (Number(C.fileTree.counts.listedDirs) < 1) {
      failures.push('the file tree did not come back on the local tab');
    }
  }
  if (run.stores.includes('gitStatus')) {
    if (B.gitStatus.counts.isRepo !== false || B.gitStatus.counts.statusFiles !== 0) {
      failures.push('the git decorations survived the switch to another machine');
    }
  }
  if (run.stores.includes('search')) {
    if (B.search.counts.searchFiles !== 0) {
      failures.push('search still holds results from this Mac on the injected tab');
    }
  }
  if (run.stores.includes('context')) {
    if (B.context.counts.status !== 'elsewhere') {
      failures.push(
        `Context reports ${String(B.context.counts.status)} on the injected ` +
          "tab, expected 'elsewhere'"
      );
    }
    if (B.context.counts.entries !== 0) {
      failures.push('Context still holds entries from this Mac on the injected tab');
    }
  }
  // The second reading, and it does not share a code path with the first: the
  // sentence is read out of the document rather than out of a store.
  if (D.sentences?.[run.mark] !== true) {
    failures.push(
      `the ${run.view} sentence was not in the document on the injected tab`
    );
  }
  if (B.sentences?.[run.mark] !== true) {
    failures.push(
      `the ${run.view} sentence was not in the document at moment B`
    );
  }
  if (C.sentences?.[run.mark] === true) {
    failures.push(
      `the ${run.view} sentence was still in the document back on the local tab`
    );
  }
}

console.log('');
say('the sentences, read out of the document rather than out of a store');
console.log('  view       moment            on screen');
console.log('  ---------  ----------------  ---------');
for (const run of done) {
  for (const one of run.result?.readings ?? []) {
    console.log(
      `  ${run.view.padEnd(9)}  ${String(one.name).padEnd(16)}  ` +
        `${one.sentences?.[run.mark] === true ? 'yes' : 'no'}`
    );
  }
  if (run.shotPath === null) {
    failures.push(`no screenshot was written for the ${run.view} run`);
  } else {
    say(`screenshot ${run.shotPath}`);
  }
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's server went from ${String(operatorBefore)} sessions to ` +
      `${String(operatorAfter)}. This probe must never touch it. The count is ` +
      'taken while the operator is using the app, so read it again by hand ' +
      'before treating a difference as a violation'
  );
}

if (!keep) rmSync(root, { recursive: true, force: true });

const named = [...new Set(failures)];
if (named.length > 0) {
  console.error('');
  for (const failure of named) console.error(`${TAG} FAIL ${failure}`);
  process.exit(1);
}
console.log('');
say(
  'every cell passed. The stores re-targeted, held nothing on the other ' +
    'machine, said so in a sentence, and came back on the local tab'
);
