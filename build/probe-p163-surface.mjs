#!/usr/bin/env node
/**
 * probe-p163-surface.mjs. One app run of the diagnostics report SURFACE
 * (Phase 163): the Help menu's door, the tab, the two tables, and the
 * photograph.
 *
 * ## WHAT IT PROVES, and every cell is read off the running app
 *
 *   #   what must be true                                        read from
 *   --  ------------------------------------------------------   -----------
 *    0  the drive answered with a reading                        the drive
 *    1  the tab opened under the name the strip shows            the document
 *    2  the capture landed: two groups, Tortie then Your sessions the document
 *    3  each group carries its own total                         the document
 *    4  NO figure on the face is the sum of the two totals       the document
 *    5  the Tortie table has a main row and at least one child   the document
 *    6  every session on the scratch server is a session row     the document
 *    7  the startup row shows a time for app ready and window    the document
 *       shown, never 0 ms
 *    8  the Electron proof names every listed pid                the document
 *    9  the three controls are drawn                             the document
 *   10  the harness wrote the frame to a PNG                     the file system
 *   11  the operator's session count did not move                tmux, read only
 *
 * ## WHAT IT DOES NOT PROVE
 *
 * The numbers themselves. That is the capture harness's job
 * (`npm run probe:p163`), which grades the report over zero and twenty five
 * sessions. This probe proves what the surface DRAWS for one real capture.
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory and its own scratch project under the harness directory.
 * `-L gmux` appears in exactly one place, a read only session count taken
 * before and after, which must match. Every Electron goes through
 * build/electron-run.mjs, which ends the tree it started in a finally block.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   node build/harness-socket.mjs --fresh gmux-p163-surface 'node build/probe-p163-surface.mjs'
 *
 * Exit code 0 when every row passes, 1 otherwise with every failing row
 * named, 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p163surface]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p163-surface',
      'node build/probe-p163-surface.mjs'
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p163-surface');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p163 surface fixture\n');
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p163@example.invalid', '-c', 'user.name=p163 probe', 'commit', '-q', '-m', 'p163 fixture']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}

/**
 * Two sessions on the scratch server BEFORE the app starts, so the Your
 * sessions table has rows to draw. They are plain shells running a date
 * loop: no agent, no token. They carry no @gmux-id, so the report names
 * them by the server's own name and the agent reads unknown, which is the
 * honest answer for a session Tortie did not create.
 */
const SESSIONS = ['p163-a', 'p163-b'];
for (const name of SESSIONS) {
  spawnSync('tmux', ['-L', socket, 'new-session', '-d', '-s', name, 'while true; do date; sleep 1; done'], { encoding: 'utf8' });
}

const shotPath = join(scratch, 'p163-surface.png');
rmSync(shotPath, { force: true });

let reading = null;
let text = '';
await withElectron(
  {
    label: 'p163-surface',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    env: {
      GMUX_SHOT: shotPath,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        editorWidth: 1100,
        diagnosticsReport: true
      }),
      GMUX_SHOT_JS: 'window.__gmuxP163Surface'
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await new Promise((r) => {
      const ceiling = setTimeout(() => {
        console.error(`${TAG} the run passed its ceiling; the teardown ends it.`);
        r(1);
      }, 180_000);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        r(c);
      });
    });
    text = handle.text();
    say(`the app exited with ${String(code)}`);
    const marker = '[gmux-shot] probe ';
    const at = text.lastIndexOf(marker);
    if (at !== -1) {
      const line = text.slice(at + marker.length).split('\n')[0] ?? '';
      try {
        reading = JSON.parse(line);
      } catch {
        reading = null;
      }
    }
  }
);

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
  const tail = text.split('\n').slice(-30).join('\n');
  console.error(tail);
} else {
  const r = reading;
  check(0, 'the drive answered with a reading', true, JSON.stringify(r));
  check(1, 'the tab opened under its name', Array.isArray(r.tabName) && r.tabName.includes('Diagnostics report'), `tabs ${JSON.stringify(r.tabName)}`);
  check(2, 'the capture landed with Tortie then Your sessions', Array.isArray(r.groups) && r.groups[0] === 'Tortie' && r.groups[1] === 'Your sessions' && (r.note ?? []).length === 0, `groups ${JSON.stringify(r.groups)}, note ${JSON.stringify(r.note)}`);
  check(3, 'each group carries its own total', Array.isArray(r.totals) && r.totals.length === 2 && r.totals.every((t) => /MB|none|not read/.test(t)), `totals ${JSON.stringify(r.totals)}`);
  check(4, 'no figure on the face is the sum of the two totals', r.sumAppearsOnFace === false, `sum ${String(r.sumOfTotalsMb)} MB, on face ${String(r.sumAppearsOnFace)}`);
  check(5, 'the Tortie table has a main row and at least one child row', Array.isArray(r.kinds) && r.kinds.includes('Main') && r.childRows > 0, `kinds ${JSON.stringify(r.kinds)}, children ${String(r.childRows)}`);
  check(6, 'every session on the scratch server is a session row', r.sessionRows >= SESSIONS.length, `rows ${String(r.sessionRows)} for ${String(SESSIONS.length)} sessions`);
  check(7, 'app ready and window shown show a time, never 0 ms', Array.isArray(r.milestones) && /ms|s$/.test(r.milestones[0] ?? '') && /ms|s$/.test(r.milestones[1] ?? '') && !r.milestones.slice(0, 2).includes('0 ms'), `milestones ${JSON.stringify(r.milestones)}`);
  check(8, 'the Electron proof names every listed pid', typeof r.electronProof === 'string' && /(\d+) listed, \1 named/.test(r.electronProof) && r.unnamed === 0, `${String(r.electronProof)}, unnamed ${String(r.unnamed)}`);
  check(9, 'the three controls are drawn', Array.isArray(r.buttons) && r.buttons.length === 3, `buttons ${JSON.stringify(r.buttons)}`);
  // The independent method the verdict names: the exact bytes Copy report
  // carries, scanned for a secret. A report over a real profile must name no
  // home directory, no command line, no token shape and no environment value.
  const copy = typeof r.copyText === 'string' ? r.copyText : '';
  const patterns = [
    [/\/Users\/[A-Za-z0-9]/, 'a home directory that was not redacted to ~'],
    [/--[a-z][a-z-]{4,}/, 'a long double dash flag, which reads as a command line'],
    [/sk-[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{8,}|xox[baprs]-/, 'an API token shape'],
    [/[A-Za-z0-9]=[A-Za-z0-9]{12,}/, 'an environment assignment'],
    [/eyJ[A-Za-z0-9_-]{10,}/, 'a JWT']
  ];
  const hits = patterns.filter(([re]) => re.test(copy)).map(([, w]) => w);
  check(12, 'the copied report carries no secret', copy.length > 0 && hits.length === 0, copy.length === 0 ? 'the drive read no copy text' : hits.length === 0 ? `${String(copy.length)} bytes, clean` : hits.join('; '));
}
const shotOk = existsSync(shotPath) && statSync(shotPath).size > 10_000;
check(10, 'the harness wrote the frame to a PNG', shotOk, shotOk ? `${shotPath}, ${String(statSync(shotPath).size)} bytes` : 'no PNG');
const operatorAfter = operatorSessionCount();
check(11, 'the operator session count did not move', operatorAfter === operatorBefore, `${String(operatorBefore)} before, ${String(operatorAfter)} after`);

for (const row of results) say(`${String(row.step).padStart(2)}  ${row.verdict.padEnd(4)}  ${row.claim}  (${row.detail})`);
if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} row(s) failed:`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say(`every row passed. Photograph: ${shotPath}`);
process.exit(0);
