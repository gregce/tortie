#!/usr/bin/env node
/**
 * probe-p97-untracked.mjs. The Phase 97 screenshot read.
 *
 * ## WHAT IT PROVES. One claim, and it is what this phase draws.
 *
 *   The Source Control panel for a folder on another machine draws TWO group
 *   rows, `Changes` and `Untracked`, with the rows of each under it, every
 *   untracked row carrying a green `U` badge, and the Phase 90.3 sentence
 *   saying a new file is not listed is on no part of the image.
 *
 * Before this phase the same seeded answer drew one group and three fewer
 * rows, because `parseRemoteReviewListing` threw every untracked entry away.
 *
 * ## THE TABLE, and every cell is read off the running app
 *
 *   #  what must be true                                    read from
 *   -  ---------------------------------------------------  ----------------
 *   1  the drive seeded 2 tracked files and 3 untracked      the drive
 *   2  the section header count reads 5                      the document
 *   3  a group row reads `Changes` with the count 2          the document
 *   4  a group row reads `Untracked` with the count 3        the document
 *   5  five rows are drawn, tracked first then untracked     the document
 *   6  the three untracked rows carry a green `U` badge      the document
 *   7  the deleted sentence is on no part of the screen      the document
 *   8  the rail badge reads 5, the same as the header         the document
 *   9  the rail's accessible name says 5 changed files        the document
 *  10  one image was written                                 the file system
 *
 * ## WHAT IT DOES NOT PROVE, and the report has to say so
 *
 * IT SUPPLIES THE ANSWER. Nothing is signed in to the machine it names, no far
 * side is contacted, and no git command runs on any second computer. What is
 * proven here is what Tortie DRAWS for such an answer. That a real folder on a
 * real machine produces such an answer, with a real untracked file in it and a
 * real ignored file left out of it, is proven by `npm run probe:remotereview`
 * against a loopback scratch machine.
 *
 * ## SAFETY, ABSOLUTE
 *
 * It runs on the socket build/harness-socket.mjs gave it, which that script
 * refuses to let be `gmux` or `default`. It uses its own user data directory
 * and its own scratch project, both outside the repository. It names `-L gmux`
 * in exactly one place, a read only session count taken before and after, which
 * must match. It opens no connection to any machine, starts no ssh and reads
 * nothing under the operator's home. It never uses pkill, never uses
 * kill-server, and signals only the pid it spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p97-untracked \
 *     'node build/probe-p97-untracked.mjs'
 *
 *   node build/harness-socket.mjs gmux-p97-untracked \
 *     'node build/probe-p97-untracked.mjs --keep'
 *
 * Exit code 0 when every row of the table passes. Exit code 1 otherwise, with
 * every failing row named. Exit code 2 when the probe refuses to run at all.
 *
 * Every scratch file carries a `p97-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p97]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a session ' +
      'server of my own: node build/harness-socket.mjs gmux-p97-untracked ' +
      "'node build/probe-p97-untracked.mjs'"
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
// The scratch project. It is a folder on THIS Mac. The drive injects a second
// tab that claims the same path on a machine nothing is signed in to.
// ---------------------------------------------------------------------------

const scratch = process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p97-untracked');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p97 untracked probe\n');
writeFileSync(join(project, 'src', 'auth.ts'), 'export const auth = 1;\n');
for (const argv of [
  ['init', '-q'],
  ['add', '-A'],
  [
    '-c',
    'user.email=p97@example.invalid',
    '-c',
    'user.name=p97 probe',
    'commit',
    '-q',
    '-m',
    'p97 fixture'
  ]
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}

const shotPath = join(scratch, 'p97-untracked.png');
rmSync(shotPath, { force: true });

// ---------------------------------------------------------------------------
// One run of the app, driven and photographed
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

/**
 * The sentence Phase 90.3 put under a capped list, which Phase 97 deleted.
 *
 * IT IS WRITTEN HERE AND IN NO FILE TORTIE SHIPS. The drive used to hold a
 * fragment of it, and because that drive is bundled into `out/renderer` the way
 * its siblings are, a person grepping the build output for the deleted sentence
 * got a hit off the checker rather than off the product. The drive now takes
 * these words as an argument, so the grep finds nothing and the check is
 * unchanged.
 */
const DELETED_SENTENCE = 'A file that git is not yet tracking is not listed here.';

const spec = {
  machineId: 'p97far',
  label: 'Studio',
  settleMs: 1200,
  // Both the whole sentence and the fragment that would survive a reword.
  absentMarks: [DELETED_SENTENCE, 'is not yet tracking is not listed here']
};

const child = spawn(
  electronBin,
  ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: shotPath,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project }),
      GMUX_SHOT_JS: `window.__gmuxP97Untracked(${JSON.stringify(spec)})`
    }
  }
);
say(`launched the app, pid ${String(child.pid)}`);

let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
};
child.stdout.on('data', (b) => onText(b.toString()));
child.stderr.on('data', (b) => onText(b.toString()));

await new Promise((r) => {
  const watchdog = setTimeout(() => {
    console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
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
// The app starts a session server that inherits these two pipes, so they are
// destroyed by hand. Without this node never exits. The same note is in
// build/probe-remote-project.mjs.
child.stdout.destroy();
child.stderr.destroy();

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

const marker = '[gmux-shot] probe ';
const at = text.lastIndexOf(marker);
let reading = null;
if (at !== -1) {
  const line = text.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    reading = JSON.parse(line);
  } catch {
    reading = null;
  }
}

const failures = [];
const results = [];

function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

if (reading === null) {
  failures.push(
    '0. the drive printed no result, so nothing was measured. The renderer ' +
      'half of this probe is src/renderer/scm/p97-untracked-drive.ts and ' +
      'src/renderer/scm/ScmSection.tsx registers it'
  );
} else if (reading.ok !== true) {
  failures.push(`0. the drive refused: ${String(reading.why)}`);
} else {
  const groups = reading.groups ?? [];
  const rows = reading.rows ?? [];
  const badges = reading.untrackedBadges ?? [];
  const changesRow = groups.find((one) => one.label === 'Changes') ?? null;
  const untrackedRow = groups.find((one) => one.label === 'Untracked') ?? null;

  check(
    1,
    'the drive seeded two tracked files and three untracked files',
    reading.seeded?.tracked === 2 && reading.seeded?.untracked === 3,
    `seeded ${JSON.stringify(reading.seeded)}, bridge available ` +
      `${String(reading.available)}`
  );
  check(
    2,
    'the section header counts both groups and reads 5',
    reading.headerCount === 5,
    `header count ${String(reading.headerCount)}`
  );
  check(
    3,
    'a group row reads Changes with the count 2',
    changesRow !== null && changesRow.count === 2,
    `Changes row ${JSON.stringify(changesRow)}`
  );
  check(
    4,
    'a group row reads Untracked with the count 3',
    untrackedRow !== null && untrackedRow.count === 3,
    `Untracked row ${JSON.stringify(untrackedRow)}`
  );
  check(
    5,
    'five rows are drawn, the tracked ones first',
    rows.length === 5 &&
      rows[0] === 'auth.ts' &&
      rows[1] === 'router.ts' &&
      rows[2] === 'agent-notes.md' &&
      rows[3] === 'plan.txt' &&
      rows[4] === 'p97-new.ts',
    `rows ${JSON.stringify(rows)}`
  );
  check(
    6,
    'the three untracked rows carry a green U badge and no other row does',
    badges.length === 3 &&
      badges.includes('agent-notes.md') &&
      badges.includes('plan.txt') &&
      badges.includes('p97-new.ts'),
    `rows with a U badge in scm-badge-added ${JSON.stringify(badges)}`
  );
  check(
    7,
    'the Phase 90.3 sentence saying a new file is not listed is gone',
    reading.absentMarksGiven === 2 &&
      (reading.absentMarksOnScreen ?? []).length === 0,
    `${String(reading.absentMarksGiven)} marks were checked, ` +
      `${JSON.stringify(reading.absentMarksOnScreen)} were on screen`
  );

  check(
    8,
    'the activity rail badge states the same number as the section header',
    reading.railBadge === 5 && reading.railBadge === reading.headerCount,
    `rail badge ${String(reading.railBadge)}, section header ` +
      `${String(reading.headerCount)}`
  );
  check(
    9,
    'the rail tells a screen reader that same number',
    typeof reading.railLabel === 'string' &&
      reading.railLabel.includes('5 changed files'),
    `accessible name ${JSON.stringify(reading.railLabel)}`
  );
}

const shot = existsSync(shotPath) ? shotPath : null;
check(
  10,
  'the window was photographed with both groups on the image',
  shot !== null,
  shot === null
    ? `no image was written to ${shotPath}`
    : `${shotPath}, ${String(statSync(shotPath).size)} bytes`
);

console.log('');
say('the table, one row per claim');
console.log('  step  verdict  claim');
console.log('  ----  -------  -----');
for (const r of results) {
  console.log(
    `  ${String(r.step).padStart(4)}  ${r.verdict.padEnd(7)}  ${r.claim}`
  );
  if (r.detail !== undefined && r.detail !== '') {
    console.log(`                 ${r.detail}`);
  }
}

console.log('');
if (reading !== null && reading.ok === true) {
  say('the groups the panel drew, in the order it drew them');
  console.log('  label       count');
  console.log('  ----------  -----');
  for (const one of reading.groups ?? []) {
    console.log(
      `  ${String(one.label).padEnd(10)}  ${String(one.count).padStart(5)}`
    );
  }
  console.log('');
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `11. the operator's server went from ${String(operatorBefore)} sessions ` +
      `to ${String(operatorAfter)}. This probe must never touch it. The count ` +
      'is taken while the operator is using the app, so read it again by hand ' +
      'before treating a difference as a violation'
  );
}

try {
  process.kill(child.pid, 'SIGKILL');
} catch {
  // Already gone, which is the ordinary case: the shot harness quits the app.
}
say(`signalled only the pid this run started: ${String(child.pid)}`);

if (!keep) rmSync(root, { recursive: true, force: true });

say(
  'WHAT THIS RUN DID NOT PROVE. It SUPPLIED the answer. Nothing was signed in ' +
    'to a machine and no far side was contacted, so what is measured above is ' +
    'what Tortie draws for such an answer. That a real folder on a real ' +
    'machine produces such an answer is proven by npm run probe:remotereview ' +
    'against a loopback scratch machine.'
);

const named = [...new Set(failures)];
if (named.length > 0) {
  console.error('');
  for (const failure of named) console.error(`${TAG} FAIL ${failure}`);
  process.exit(1);
}
console.log('');
say(
  'every claim passed. The panel drew two group rows for a folder on another ' +
    'machine, three of its five rows are files git is not yet tracking, and ' +
    'the sentence that used to say so is gone.'
);
