#!/usr/bin/env node
/**
 * probe-remote-project.mjs. The Phase 90.3 fix round live probe.
 *
 * ## WHAT IT PROVES. One claim, and it is the one the fix round closes.
 *
 *   When a project tab's folder is on another machine, each sidebar that
 *   crosses reads that machine once when the tab is opened, once more each time
 *   that machine starts answering, and at no other moment.
 *
 * The second half of that sentence is the defect. MEASURED on 2026-08-19
 * against the operator's Mac Pro: on a cold boot the link read `quiet` at 1 ms,
 * the Explorer's first read was refused, it drew the sentence saying Tortie is
 * not connected to that machine, and the link read `connected` at 504 ms.
 * Nothing re-read the folder, so the sentence and zero rows were still on
 * screen at 44,694 ms. Source Control had the same race and its sentence was
 * still up at 11.5 s. Both recovered in about 200 ms when a person pressed
 * Refresh, which is what made it a lie rather than a delay.
 *
 * The third half is the opposite failure. This product has NO TIMER for a
 * folder on another machine, on purpose, because nothing counts calls in flight
 * to one machine and that machine's effective ceiling is 10 (research 56
 * section 1.5). A fix that recovered by polling would be a worse defect than
 * the one it closed, so the probe measures a moment where nothing changes and
 * requires the count to stand still.
 *
 * ## THE MATRIX, and every cell is a COUNT OF READS
 *
 * One read is one call from a sidebar store to that machine. Reads are counted
 * as they start, so a refused read still counts, because the question is when
 * Tortie decides to ask.
 *
 *   moment            what the drive did                      reads expected
 *   ----------------  --------------------------------------  --------------
 *   A quiet           opened the tab on a link that is down                1
 *   B connected       moved the link to answering                         2
 *   C settled         let 2.5 s pass with no link change                  2
 *   D second sign in  dropped the link and brought it back               3
 *
 * Before the fix every cell reads 1, which is the defect stated as a number. A
 * cell above its number at C is a timer and fails just as loudly.
 *
 * Two runs, because the sidebar mounts ONE view at a time and a store only
 * follows the tab while its view is mounted. The Explorer run measures the file
 * tree store and the Source Control run measures the remote changes store.
 *
 * ## WHAT IT DOES NOT PROVE, and the report has to say so
 *
 * The machine it injects is not a machine. Its id is one nothing is signed in
 * to, so every read is refused and no row ever arrives. What is proven here is
 * WHEN Tortie reads, not what comes back. That a real folder on a real machine
 * lists real rows is proven elsewhere:
 *
 *   npm run smoke:remote          step 19, against a real sign in server
 *   node build/probe-remote-tree.mjs   against the operator's own Mac Pro
 *
 * It also proves nothing about the eight surfaces that refuse. Those are
 * measured by `npm run probe:workspacetarget`, which this probe does not
 * duplicate.
 *
 * ## SAFETY, ABSOLUTE
 *
 * It runs on the socket build/harness-socket.mjs gave it, which that script
 * refuses to let be `gmux` or `default`. It uses its own user data directory
 * and its own scratch project, both outside the repository. It names `-L gmux`
 * in exactly one place, a read only session count taken before and after, which
 * must match. It opens no connection to any machine, starts no ssh and reads
 * nothing under the operator's home. It never uses pkill, never uses
 * kill-server, and kills only the pid it spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:remoteproject
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p903-project \
 *     'node build/probe-remote-project.mjs --keep'
 *
 * Exit code 0 when every cell passes. Exit code 1 otherwise, with every failing
 * cell named. Exit code 2 when the probe refuses to run at all.
 *
 * Every scratch file carries a `p903-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:remoteproject]';

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
      "my own: node build/harness-socket.mjs gmux-p903-project 'node " +
      "build/probe-remote-project.mjs'"
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
// The scratch project. It is a folder on THIS Mac, and the drive injects a
// second tab that claims the same path on a machine nothing is signed in to.
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p903-remote-project');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p90.3 remote project probe\n');
writeFileSync(join(project, 'src', 'alpha.ts'), 'export const alpha = 1;\n');
for (const argv of [
  ['init', '-q'],
  ['add', '-A'],
  [
    '-c',
    'user.email=probe@example.com',
    '-c',
    'user.name=probe',
    'commit',
    '-q',
    '-m',
    'seed'
  ]
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// One run of the app
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

async function runOnce(name, spec) {
  const shotPath = join(scratch, `p903-remote-project-${name}.png`);
  rmSync(shotPath, { force: true });
  const child = spawn(
    electronBin,
    [
      '.',
      `--user-data-dir=${profile}-${name}`,
      '-ApplePersistenceIgnoreState',
      'YES'
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        GMUX_SHOT: shotPath,
        GMUX_SHOT_VERBOSE: '1',
        GMUX_SHOT_DELAY_MS: '6000',
        GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project }),
        GMUX_SHOT_JS: `window.__gmuxRemoteBootProbe(${JSON.stringify(spec)})`
      }
    }
  );

  let text = '';
  const onText = (chunk) => {
    process.stdout.write(chunk);
    text += chunk;
  };
  child.stdout.on('data', (b) => onText(b.toString()));
  child.stderr.on('data', (b) => onText(b.toString()));

  const code = await new Promise((r) => {
    const watchdog = setTimeout(() => {
      console.error(
        `${TAG} run ${name} passed its ceiling. Ending the pid I started.`
      );
      child.kill('SIGTERM');
    }, 180_000);
    child.on('error', (err) => {
      clearTimeout(watchdog);
      console.error(`${TAG} electron could not start: ${err.message}`);
      r(1);
    });
    child.on('exit', (c) => {
      clearTimeout(watchdog);
      setTimeout(() => r(c ?? 1), 750);
    });
  });
  // The app starts a tmux server that inherits these two pipes, so they are
  // destroyed by hand. Without this node never exits. See the same note in
  // build/probe-session-focus.mjs.
  child.stdout.destroy();
  child.stderr.destroy();

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
// The two runs, one per crossing sidebar
// ---------------------------------------------------------------------------

/**
 * `field` is which counter this run's view owns. The other counter is printed
 * too, and it is expected to stay at 0, because a store whose view is not
 * mounted does not follow the tab.
 */
const RUNS = [
  { view: 'explorer', field: 'treeReads', store: 'the file tree' },
  { view: 'scm', field: 'changesReads', store: 'the remote changes list' }
];

/** The rule, written here rather than after the table is read. */
const EXPECTED = {
  'A quiet': 1,
  'B connected': 2,
  'C settled': 2,
  'D second sign in': 3
};

const failures = [];
const done = [];

for (const run of RUNS) {
  const out = await runOnce(run.view, {
    machineId: 'p903boot',
    label: 'Probe Machine',
    view: run.view,
    settleMs: 900,
    quietMs: 2_500
  });
  done.push({ ...run, ...out });
}

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

console.log('');
say('reads started by each store, counted as they start so a refused read');
say('still counts. The owned column is the store this run mounted.');
console.log(
  '  view       moment            tree reads  changes reads  owned  expected'
);
console.log(
  '  ---------  ----------------  ----------  -------------  -----  --------'
);
for (const run of done) {
  if (run.result === null) {
    failures.push(
      `the ${run.view} run printed no result, so nothing was measured`
    );
    continue;
  }
  if (run.result.ok !== true) {
    failures.push(`the ${run.view} run refused: ${String(run.result.why)}`);
    continue;
  }
  for (const one of run.result.readings ?? []) {
    const owned = one[run.field];
    const want = EXPECTED[one.name];
    console.log(
      `  ${run.view.padEnd(9)}  ${String(one.name).padEnd(16)}  ` +
        `${String(one.treeReads).padStart(10)}  ` +
        `${String(one.changesReads).padStart(13)}  ` +
        `${String(owned).padStart(5)}  ${String(want).padStart(8)}`
    );
    if (owned !== want) {
      failures.push(
        `${run.store} had started ${String(owned)} read(s) at moment ` +
          `"${one.name}" in the ${run.view} run, and the rule expects ` +
          `${String(want)}. ` +
          (owned < want
            ? 'A count that does not move when the machine starts answering ' +
              'is the cold boot defect: the refusal sentence stays on screen ' +
              'for the whole run.'
            : 'A count above the rule is a timer, and this product has none ' +
              'for a folder on another machine.')
      );
    }
  }
}

console.log('');
say('what the stores held, and the sentences read out of the document');
console.log(
  '  view       moment            tree status   changes failed  sentence'
);
console.log(
  '  ---------  ----------------  ------------  --------------  --------'
);
for (const run of done) {
  for (const one of run.result?.readings ?? []) {
    const mark =
      run.view === 'explorer' ? 'treeNotConnected' : 'changesUnreachable';
    console.log(
      `  ${run.view.padEnd(9)}  ${String(one.name).padEnd(16)}  ` +
        `${String(one.treeStatus ?? 'none').padEnd(12)}  ` +
        `${String(one.changesFailed).padEnd(14)}  ` +
        `${one.sentences?.[mark] === true ? 'yes' : 'no'}`
    );
  }
}

console.log('');
say(
  'the sentence stays on screen in every row above, and that is CORRECT here: ' +
    'the injected machine is one nothing is signed in to, so every read is ' +
    'refused. This probe measures WHEN Tortie reads, not what comes back.'
);

for (const run of done) {
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
  'every cell passed. Each crossing sidebar read that machine once on open, ' +
    'once more each time it started answering, and at no other moment.'
);
