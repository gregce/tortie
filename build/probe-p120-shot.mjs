#!/usr/bin/env node
/**
 * probe-p120-shot.mjs. The Phase 120 screenshot read of the LOCAL Runs group.
 *
 * ## WHAT IT PROVES. One claim, and it is the entry's second evidence item.
 *
 *   The Runs section in the live app draws a queued row, two running rows
 *   with the spinning glyph, a succeeded row and a failed row SIDE BY SIDE,
 *   and one of the two running rows stands for a release run whose head
 *   branch is a tag name, which is the run Phase 120 put into the list.
 *
 * The operator's own screenshot showed only finished rows, so the claim that
 * a just launched run appears with its live state had never been
 * photographed. This probe takes that photograph.
 *
 * ## THE TABLE, and every cell is read off the running app
 *
 *   #   what must be true                                     read from
 *   --  ---------------------------------------------------   ----------------
 *    0  the drive answered with at least one reading          the drive
 *    1  the section is present and open                       the document
 *    2  the header count reads 5                              the document
 *    3  five rows are drawn, in the seeded order              the document
 *    4  row 1 draws the queued glyph, and it does not spin    the document
 *    5  rows 2 and 5 spin with the working tone, and row 5    the document
 *       is the v9.9.9 release stand in
 *    6  row 3 draws the success glyph, row 4 the failure one  the document
 *    7  the header tooltip reads "A run is queued." and       the document
 *       never says "for this branch"
 *    8  the harness wrote the driven frame to a PNG           the file system
 *    9  build/window-shot.mjs photographed the window from    the file system
 *       outside while the frame was held
 *   10  the operator's session count did not move             tmux, read only
 *
 * ## WHAT IT DOES NOT PROVE, and the report has to say so
 *
 * IT SUPPLIES THE ANSWER. The five rows are seeded into the store by
 * src/renderer/scm/p120-runs-shot.ts, no gh process starts, and GitHub is
 * asked nothing. What is proven here is what Tortie DRAWS for such an
 * answer. That the two query merge really returns a tag started run the
 * branch query alone omits is proven by `npm run probe:p120` against a real
 * repository.
 *
 * ## THE TWO PHOTOGRAPHS, and why there are two
 *
 * The GMUX_SHOT harness writes the driven frame itself through capturePage,
 * which photographs exactly the page the drive settled and can never catch
 * anything that is not this app. That PNG is the evidence of record. The
 * spec also asks for a photograph through build/window-shot.mjs, whose
 * frontmost refusal is the fleet rule for outside captures, so the driver
 * holds the drawn frame for a few seconds and this probe photographs the
 * window rectangle from outside during the hold.
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, and it can never be `gmux` or `default`. The app gets
 * its own user data directory and its own scratch project, both outside the
 * repository. `-L gmux` appears in exactly one place, a read only session
 * count taken before and after, which must match. Nothing here uses pkill,
 * nothing uses kill-server, and the only process signalled is the pid this
 * run spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   npm run probe:p120shot           (add -- --keep to keep the scratch dir)
 *
 * Exit code 0 when every row of the table passes. Exit code 1 otherwise,
 * with every failing row named. Exit code 2 when the probe refuses to run.
 *
 * Every scratch file carries a `p120-` prefix.
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

import { windowShot } from './window-shot.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p120shot]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

// ---------------------------------------------------------------------------
// The socket. Only build/harness-socket.mjs may hand one out, so a run that
// arrives without one re-runs itself through that script and inherits its
// teardown. The composed name can never be `gmux` or `default`, and the two
// checks below still refuse them in case someone exports the name by hand.
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  const inner = `node build/probe-p120-shot.mjs${keep ? ' --keep' : ''}`;
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [join(repoRoot, 'build', 'harness-socket.mjs'), 'gmux-p120-shot', inner],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/**
 * The operator's live server, listed and never written. This is the ONLY
 * place this file names it.
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
// The scratch project. A real git repository on THIS Mac with a github.com
// origin, because the Runs section is only drawn for such a repository. The
// origin URL is never contacted: the drive seeds the answer and no gh
// process starts.
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p120-shot');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p120 runs shot fixture\n');
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  [
    '-c',
    'user.email=p120@example.invalid',
    '-c',
    'user.name=p120 probe',
    'commit',
    '-q',
    '-m',
    'p120 fixture'
  ],
  ['remote', 'add', 'origin', 'https://github.com/itavero/p120-fixture.git']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}

const shotPath = join(scratch, 'p120-runs.png');
const windowShotPath = join(scratch, 'p120-runs-window.png');
rmSync(shotPath, { force: true });
rmSync(windowShotPath, { force: true });

// ---------------------------------------------------------------------------
// One run of the app, driven, held, and photographed twice
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

/**
 * How long the driver holds the drawn frame after its readings are out. The
 * outside photograph happens inside this window, and the two osascript reads
 * it needs take well under a second each.
 */
const DWELL_MS = 6000;

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
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        localRuns: { dwellMs: DWELL_MS }
      }),
      GMUX_SHOT_JS: 'window.__gmuxP120Runs'
    }
  }
);
say(`launched the app, pid ${String(child.pid)} (recorded)`);

/**
 * The pid that owns the window. node_modules/.bin/electron is a Node shim
 * that spawns the Electron binary as its one child, so the window belongs to
 * that child when there is one and to the spawned pid otherwise. The pid is
 * read so the window can be raised and photographed. It is never killed; the
 * shot harness quits the app itself, and the shim passes signals down.
 */
function guiPid() {
  const out = spawnSync('pgrep', ['-P', String(child.pid)], {
    encoding: 'utf8'
  });
  const first = (out.stdout ?? '')
    .split('\n')
    .map((line) => Number(line.trim()))
    .find((n) => Number.isInteger(n) && n > 0);
  return first ?? child.pid;
}

/** What the outside photograph attempt reported. Null until it ran. */
let outsideShot = null;

function takeOutsideShot() {
  const pid = guiPid();
  // Raise the app the way build/probe-fullscreen-menu.mjs does, by unix pid,
  // so the frontmost refusal in window-shot.mjs is satisfied by the app
  // under test and by nothing else.
  spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events" to set frontmost of (first process whose unix id is ${String(pid)}) to true`
    ],
    { encoding: 'utf8', timeout: 10_000 }
  );
  outsideShot = windowShot({
    pid,
    path: windowShotPath,
    log: (line) => say(line)
  });
}

/** The driver prints this line when the hold begins. */
const HOLD_MARK = '[p120] holding the frame';
let holdSeen = false;

let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
  if (!holdSeen && text.includes(HOLD_MARK)) {
    holdSeen = true;
    // Give the raise a moment to land before the frontmost check runs.
    setTimeout(takeOutsideShot, 700);
  }
};
child.stdout.on('data', (b) => onText(b.toString()));
child.stderr.on('data', (b) => onText(b.toString()));

await new Promise((r) => {
  const watchdog = setTimeout(() => {
    console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
    child.kill('SIGTERM');
  }, 240_000);
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
// build/probe-p97-untracked.mjs.
child.stdout.destroy();
child.stderr.destroy();

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

const marker = '[gmux-shot] probe ';
const at = text.lastIndexOf(marker);
let readings = null;
if (at !== -1) {
  const line = text.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    readings = JSON.parse(line);
  } catch {
    readings = null;
  }
}
const reading =
  Array.isArray(readings) && readings.length > 0
    ? readings[readings.length - 1]
    : null;

const failures = [];
const results = [];

function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

if (reading === null) {
  failures.push(
    '0. the drive printed no reading, so nothing was measured. The renderer ' +
      'half of this probe is src/renderer/scm/p120-runs-shot.ts and ' +
      'src/renderer/app/App.tsx wires it under the localRuns spec field'
  );
} else {
  const rows = reading.rows ?? [];
  const glyph = (i) =>
    rows[i] === undefined
      ? 'missing'
      : `${rows[i].icon}/${rows[i].tone}/${rows[i].spin ? 'spin' : 'still'}`;

  check(
    1,
    'the section is present and open',
    reading.present === true && reading.expanded === true,
    `present ${String(reading.present)}, expanded ${String(reading.expanded)}`
  );
  check(
    2,
    'the header count reads 5',
    reading.count === '5',
    `count ${JSON.stringify(reading.count)}`
  );
  check(
    3,
    'five rows are drawn, in the seeded order',
    rows.length === 5 &&
      rows[0]?.name === 'gates' &&
      rows[1]?.name === 'gates' &&
      rows[2]?.name === 'gates' &&
      rows[3]?.name === 'package' &&
      rows[4]?.name === 'release',
    `rows ${JSON.stringify(rows.map((one) => one.name))}`
  );
  check(
    4,
    'row 1 draws the queued glyph, and it does not spin',
    rows[0]?.icon === 'circle-large-outline' &&
      rows[0]?.tone === 'muted' &&
      rows[0]?.spin === false,
    `row 1 ${glyph(0)}`
  );
  check(
    5,
    'rows 2 and 5 spin with the working tone, and row 5 is the v9.9.9 release stand in',
    rows[1]?.icon === 'sync' &&
      rows[1]?.tone === 'working' &&
      rows[1]?.spin === true &&
      rows[4]?.icon === 'sync' &&
      rows[4]?.tone === 'working' &&
      rows[4]?.spin === true &&
      (reading.seededHeadBranches ?? [])[4] === 'v9.9.9',
    `row 2 ${glyph(1)}, row 5 ${glyph(4)}, seeded head branches ` +
      `${JSON.stringify(reading.seededHeadBranches)}`
  );
  check(
    6,
    'row 3 draws the success glyph and row 4 the failure glyph',
    rows[2]?.icon === 'pass-filled' &&
      rows[2]?.tone === 'success' &&
      rows[3]?.icon === 'error' &&
      rows[3]?.tone === 'error',
    `row 3 ${glyph(2)}, row 4 ${glyph(3)}`
  );
  check(
    7,
    'the header tooltip reads "A run is queued." and never says "for this branch"',
    reading.headerTooltip === 'A run is queued.' &&
      !String(reading.headerTooltip).includes('for this branch'),
    `tooltip ${JSON.stringify(reading.headerTooltip)}`
  );
}

check(
  8,
  'the harness wrote the driven frame to a PNG',
  existsSync(shotPath),
  existsSync(shotPath)
    ? `${shotPath}, ${String(statSync(shotPath).size)} bytes`
    : `no image was written to ${shotPath}`
);
check(
  9,
  'build/window-shot.mjs photographed the window from outside',
  outsideShot === 'saved' && existsSync(windowShotPath),
  outsideShot === 'saved'
    ? `${windowShotPath}, ${String(statSync(windowShotPath).size)} bytes`
    : `the attempt reported ${JSON.stringify(outsideShot)}. The helper takes ` +
        'no photograph rather than a wrong one, so the harness PNG above is ' +
        'the standing picture'
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

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `10. the operator's server went from ${String(operatorBefore)} sessions ` +
      `to ${String(operatorAfter)}. This probe must never touch it. The ` +
      'count is taken while the operator is using the app, so read it again ' +
      'by hand before treating a difference as a violation'
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
  'WHAT THIS RUN DID NOT PROVE. It SUPPLIED the five rows. No gh process ' +
    'started, GitHub was asked nothing, and the tag run on the image is a ' +
    'stand in. What is measured above is what Tortie draws for such an ' +
    'answer. That the merged query really returns a tag started run the ' +
    'branch query alone omits is proven by npm run probe:p120 against a ' +
    'real repository.'
);

const named = [...new Set(failures)];
if (named.length > 0) {
  console.error('');
  for (const failure of named) console.error(`${TAG} FAIL ${failure}`);
  process.exit(1);
}
console.log('');
say(
  'every claim passed. The section drew a queued run, two running runs with ' +
    'the spinning glyph, a succeeded run and a failed run side by side, and ' +
    'one of the running rows is the release stand in whose head branch is a ' +
    'tag name.'
);
