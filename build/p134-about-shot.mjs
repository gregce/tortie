/**
 * p134-about-shot.mjs. The Phase 134 reading and photograph of the native
 * About panel.
 *
 * ## WHY IT EXISTS
 *
 * Phase 134 rewrote the one string the About panel draws under the version.
 * The unit test src/main/__tests__/p134-about-panel.test.ts pins what the app
 * HANDS to macOS. This probe reads what macOS actually DREW, which is a
 * different claim, and then photographs it.
 *
 * ## WHY IT DOES NOT USE THE ORDINARY SHOT HARNESS
 *
 * The About panel is a native macOS window and not a BrowserWindow, so
 * webContents.capturePage cannot see it. build/window-shot.mjs is the house
 * helper for this case and its own header states the property that makes it
 * right here: "When a dialog is up, the dialog is window 1 and the photograph
 * is of the dialog." So the panel is photographed through that helper and
 * through nothing else. `npm run shot` is forbidden here, because it attaches
 * to the operator's own server.
 *
 * ## THE ORDER, AND THE ORDER IS THE POINT
 *
 *   1. re-run through build/harness-socket.mjs when there is no socket
 *   2. refuse on socket "gmux" or "default", or with no build on disk
 *   3. count the operator's sessions, read only, the one mention of -L gmux
 *   4. launch the app on an isolated --user-data-dir under the harness dir
 *   5. raise it and read the raise back, up to six times
 *   6. click the app menu's own About row, addressed BY NAME rather than by
 *      index, so a menu that grows a row later does not break this probe
 *   7. READ the panel through the accessibility interface and assert the seven
 *      claims against the strings macOS drew
 *   8. photograph through windowShot, then write a 3x enlargement with sips so
 *      the small copyright type is readable off the picture
 *   9. press escape, end only the pid this run spawned, count sessions again
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ended afterwards, and it can never be `gmux` or `default`. The app gets
 * its own user data directory under GMUX_HARNESS_DIR. No project is opened and
 * no session is created. `-L gmux` appears in exactly one place, a read only
 * session count taken before and after, which must match. Nothing here uses
 * pkill, nothing uses kill-server, and the only process signalled is the pid
 * this run spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p134about          (add -- --keep to keep the scratch dir)
 *
 * Exit code 0 when every row of the table passes. Exit code 1 otherwise, with
 * every failing row named. Exit code 2 when the probe refuses to run.
 *
 * Every scratch file carries a `p134-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { windowShot } from './window-shot.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p134about]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

// ---------------------------------------------------------------------------
// The socket
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  const inner = `node build/p134-about-shot.mjs${keep ? ' --keep' : ''}`;
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [join(repoRoot, 'build', 'harness-socket.mjs'), 'gmux-p134-about', inner],
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

/** The operator's live server, listed and never written. Only place named. */
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
// The isolated profile
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p134-about');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
const profile = join(root, 'profile');
const shot = join(root, 'p134-about-panel.png');
const shotBig = join(root, 'p134-about-panel-3x.png');

// ---------------------------------------------------------------------------
// One run of the app. No drive, no project, no session.
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

const child = spawn(
  electronBin,
  ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
  { cwd: repoRoot, env: { ...process.env } }
);
say(`launched the app, pid ${String(child.pid)} (recorded)`);

let text = '';
child.stdout.on('data', (b) => {
  text += b.toString();
});
child.stderr.on('data', (b) => {
  text += b.toString();
});

/** The pid that owns the window: the shim's one child, or the shim itself. */
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

function frontmostPid() {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to get unix id of (first application process whose frontmost is true)'
    ],
    { encoding: 'utf8', timeout: 10_000 }
  );
  if (r.status !== 0) return null;
  const n = Number((r.stdout ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

function pause(seconds) {
  spawnSync('sleep', [String(seconds)]);
}

/** How many windows the process owns, through System Events. */
function windowCount(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events" to tell (first process whose unix id is ${String(pid)}) to return count of windows`
    ],
    { encoding: 'utf8', timeout: 10_000 }
  );
  if (r.status !== 0) return 0;
  const n = Number((r.stdout ?? '').trim());
  return Number.isInteger(n) ? n : 0;
}

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

/** End the pid this run spawned, and nothing else. */
function endTheApp() {
  spawnSync(
    'osascript',
    ['-e', 'tell application "System Events" to key code 53'],
    { encoding: 'utf8', timeout: 10_000 }
  );
  try {
    child.kill('SIGTERM');
  } catch {
    // already gone
  }
}

// ---------------------------------------------------------------------------
// Wait for the window, then raise the app and read the raise back
// ---------------------------------------------------------------------------

let appPid = null;
let frontOk = false;
const deadline = Date.now() + 90_000;
for (;;) {
  pause(1.5);
  appPid = guiPid();
  if (windowCount(appPid) > 0) break;
  if (Date.now() >= deadline) break;
}
say(`the window owning pid is ${String(appPid)}`);

/**
 * Raise the app and read the raise back, up to six times.
 *
 * MEASURED in Phase 119: one `set frontmost` and an immediate read said the
 * app was not in front, because the activation had not landed yet. MEASURED
 * again in Phase 134 on a loaded machine: another worktree's probe took the
 * front between the click and the photograph, so the raise is asked for again
 * immediately before each step that depends on it rather than once at the
 * start.
 */
function raiseTheApp() {
  for (let i = 0; i < 6; i++) {
    if (frontmostPid() === appPid) return true;
    spawnSync(
      'osascript',
      [
        '-e',
        `tell application "System Events" to set frontmost of (first process whose unix id is ${String(appPid)}) to true`
      ],
      { encoding: 'utf8', timeout: 10_000 }
    );
    pause(0.5);
  }
  return frontmostPid() === appPid;
}

frontOk = raiseTheApp();
say(frontOk ? 'the app is in front' : 'the app is NOT in front');

if (!frontOk) {
  endTheApp();
  refuse(
    'the app never came to the front, so no menu could be driven and no photograph could be taken safely'
  );
}

// ---------------------------------------------------------------------------
// Open the About panel by clicking the app's own menu row, addressed by name
// ---------------------------------------------------------------------------

const clicked = spawnSync(
  'osascript',
  [
    '-e',
    `tell application "System Events"
  tell (first process whose unix id is ${String(appPid)})
    click (first menu item of menu 1 of menu bar item 2 of menu bar 1 whose name starts with "About")
  end tell
end tell`
  ],
  { encoding: 'utf8', timeout: 20_000 }
);
const menuOk = clicked.status === 0;
say(
  `clicked the About row: status ${String(clicked.status)}${menuOk ? '' : `, ${(clicked.stderr ?? '').trim()}`}`
);
// MEASURED: at 1.5 s after the click the panel's accessibility tree came back
// empty on one run out of two, and with five elements on the other. The panel
// is on screen well before its tree is readable, so the wait here is longer
// and the read below is retried.
pause(3);

// ---------------------------------------------------------------------------
// READ the panel before photographing it
// ---------------------------------------------------------------------------

const SPLIT = '<<|>>';

/**
 * Every value the panel drew, read through the accessibility interface.
 *
 * FOUR THINGS WERE MEASURED HERE AND EACH ONE SHAPED THIS SCRIPT.
 *
 * 1. An early spelling read `entire contents of window 1` inside the System
 *    Events block and looped over the result OUTSIDE it. Outside that block
 *    `value of e` is not a term the script understands, so every read threw
 *    and the probe saw an empty panel. The whole walk stays inside one `tell`.
 * 2. Looping over the references `entire contents` hands back returned
 *    "missing value" for all five elements it found, because `repeat with e in
 *    list` binds a reference rather than the element.
 * 3. On the runs after `entire contents` was asked for, the panel came back
 *    with no elements at all, so that term is not used here at all.
 * 4. The read is therefore INDEXED, e.g. `value of static text 2 of window 1`,
 *    which asks System Events for one element at a time and never dereferences
 *    a list item. The counts are emitted too, so a run that finds no copyright
 *    still says how much of a tree it walked.
 */
function readThePanel() {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  tell (first process whose unix id is ${String(appPid)})
    set out to ""
    set n to 0
    try
      set n to count of (static texts of window 1)
    end try
    set out to out & "texts" & tab & (n as text) & "${SPLIT}"
    repeat with i from 1 to n
      set v to ""
      try
        set v to (value of static text i of window 1) as text
      end try
      if v is "" then
        try
          set v to (description of static text i of window 1) as text
        end try
      end if
      set out to out & "text" & tab & v & "${SPLIT}"
    end repeat
    set m to 0
    try
      set m to count of (UI elements of window 1)
    end try
    set out to out & "elements" & tab & (m as text) & "${SPLIT}"
    repeat with j from 1 to m
      try
        set k to count of (static texts of UI element j of window 1)
        repeat with i from 1 to k
          set v to ""
          try
            set v to (value of static text i of UI element j of window 1) as text
          end try
          set out to out & "nested" & tab & v & "${SPLIT}"
        end repeat
      end try
    end repeat
    return out
  end tell
end tell`
    ],
    { encoding: 'utf8', timeout: 30_000 }
  );
  if (r.status !== 0) {
    say(`the panel could not be read: ${(r.stderr ?? '').trim()}`);
    return [];
  }
  return (r.stdout ?? '')
    .split(SPLIT)
    .map((row) => row.trim())
    .filter((row) => row !== '' && row !== 'missing value');
}

/** The value half of a row, which is everything after the first tab. */
function valueOf(row) {
  const tab = row.indexOf('\t');
  return tab === -1 ? row : row.slice(tab + 1);
}

// The panel is read up to twelve times, about 18 s in the worst case. A read
// that lands before the panel's tree is built comes back empty, which is not
// the same as a panel with no copyright in it, so the loop stops only when the
// copyright is there or the attempts run out.
let strings = [];
for (let i = 0; i < 12; i++) {
  strings = readThePanel();
  say(
    `read ${String(i + 1)} of 12: ${String(strings.length)} readable values`
  );
  if (strings.some((row) => row.includes('Ita Vero') || row.includes('Itavero')))
    break;
  pause(1.5);
}

say('');
say(`the panel drew ${String(strings.length)} readable values:`);
for (const row of strings) {
  for (const line of row.split('\n')) say(`  | ${line}`);
  say('  |');
}
say('');

/** The one drawn string that carries the copyright, or null. */
const carrier =
  strings.find((row) => row.includes('Ita Vero') || row.includes('Itavero')) ??
  null;
const drawn = carrier === null ? null : valueOf(carrier);
const lines = drawn === null ? [] : drawn.split('\n').map((l) => l.trim());

check(
  1,
  'the app menu row named About opened the panel and the panel drew text',
  menuOk && strings.length > 0,
  `click status ${String(clicked.status)}, ${String(strings.length)} strings read`
);
check(
  2,
  'the copyright the panel drew splits into exactly three lines',
  lines.length === 3,
  drawn === null
    ? 'no drawn string carried the company name'
    : `${String(lines.length)} lines: ${JSON.stringify(lines)}`
);
check(
  3,
  'line 1 is the company line, spelled the one way',
  lines[0] === '© 2026 Ita Vero, LLC. All rights reserved.',
  JSON.stringify(lines[0] ?? null)
);
check(
  4,
  'line 2 is the source line',
  lines[1] === 'Source: github.com/gregce/tortie',
  JSON.stringify(lines[1] ?? null)
);
check(
  5,
  'line 3 carries the codicon credit word for word, as Codicon.tsx asks',
  (lines[2] ?? '').startsWith('Icons: ') &&
    (lines[2] ?? '').includes('codicons by Microsoft (CC BY 4.0)'),
  JSON.stringify(lines[2] ?? null)
);
check(
  6,
  'line 3 credits Material Icon Theme and names its licence',
  (lines[2] ?? '').includes('Material Icon Theme') &&
    (lines[2] ?? '').includes('MIT'),
  JSON.stringify(lines[2] ?? null)
);
check(
  7,
  'the drawn copyright carries no em dash, no en dash and no Itavero',
  drawn !== null &&
    !drawn.includes('—') &&
    !drawn.includes('–') &&
    !drawn.includes('Itavero'),
  drawn === null ? 'nothing drawn' : 'read from the drawn string'
);

// ---------------------------------------------------------------------------
// The photograph, taken only after the reading above
// ---------------------------------------------------------------------------

/**
 * The capture is BRACKETED by a frontmost check on both sides, and that is the
 * point of this loop rather than the retry.
 *
 * build/window-shot.mjs reads the rectangle of the app's own window and checks
 * the front BEFORE it captures. Its header states the limit that leaves: the
 * rectangle is a rectangle, so a window sitting on top of the app inside it is
 * still in the frame. MEASURED on this machine on 2026-08-22, with several
 * other phases driving their own windows: one capture came back holding a
 * terminal window that had taken the front after the check and before the
 * shutter. That file was replaced by the retry below and never read as
 * evidence.
 *
 * So the front is read again immediately after the shutter. A capture counts
 * only when the app was in front on both sides of it, which narrows the window
 * where another application can appear to the length of the screencapture call
 * itself. It does not close it, and the report says so.
 */
let verdict = 'not-frontmost';
let frontAfter = null;
for (let i = 0; i < 5; i++) {
  raiseTheApp();
  verdict = windowShot({ pid: appPid, path: shot, log: say });
  frontAfter = frontmostPid();
  if (verdict === 'saved' && frontAfter === appPid) break;
  if (verdict === 'saved') {
    say(
      `that capture is discarded: the front moved to pid ${frontAfter === null ? 'unreadable' : String(frontAfter)} while the shutter was open`
    );
    rmSync(shot, { force: true });
    verdict = 'not-frontmost';
  }
  pause(1.5);
}
const shotOk = verdict === 'saved' && existsSync(shot) && statSync(shot).size > 0;
check(
  8,
  'the panel was photographed through the house helper, with the app in front on both sides of the shutter',
  shotOk && frontAfter === appPid,
  `windowShot said "${verdict}", the front after the shutter was pid ${frontAfter === null ? 'unreadable' : String(frontAfter)} and the app is pid ${String(appPid)}` +
    (shotOk ? `, ${String(statSync(shot).size)} bytes` : '')
);

// A 3x enlargement, because the copyright type in the panel is small and the
// point of the picture is that a person can read the three lines off it.
let bigOk = false;
if (shotOk) {
  const w = spawnSync('sips', ['-g', 'pixelWidth', shot], { encoding: 'utf8' });
  const px = Number(
    /pixelWidth:\s*(\d+)/.exec(w.stdout ?? '')?.[1] ?? Number.NaN
  );
  if (Number.isInteger(px) && px > 0) {
    const r = spawnSync(
      'sips',
      ['--resampleWidth', String(px * 3), shot, '--out', shotBig],
      { encoding: 'utf8' }
    );
    bigOk = r.status === 0 && existsSync(shotBig) && statSync(shotBig).size > 0;
    say(
      bigOk
        ? `3x enlargement written to ${shotBig}, ${String(px * 3)} pixels wide`
        : `sips could not write the enlargement: ${(r.stderr ?? '').trim()}`
    );
  } else {
    say('sips could not read the width of the photograph, so no enlargement');
  }
}

// ---------------------------------------------------------------------------
// End what this run started, and count the operator's sessions again
// ---------------------------------------------------------------------------

endTheApp();
await new Promise((r) => {
  const stop = setTimeout(() => r(undefined), 15_000);
  child.on('exit', () => {
    clearTimeout(stop);
    setTimeout(() => r(undefined), 500);
  });
});
child.stdout.destroy();
child.stderr.destroy();

const operatorAfter = operatorSessionCount();
check(
  9,
  "the operator's session count did not move",
  operatorAfter === operatorBefore,
  `${String(operatorBefore)} before, ${String(operatorAfter)} after`
);

say('');
say('  step  verdict  claim');
for (const r of results) {
  say(
    `  ${String(r.step).padStart(4)}  ${r.verdict.padEnd(7)}  ${r.claim}. ${r.detail}`
  );
}
say('');
say(`photograph:      ${shotOk ? shot : 'not taken'}`);
say(`3x enlargement:  ${bigOk ? shotBig : 'not written'}`);
if (text.includes('About panel:')) {
  say('the app logged an About panel warning, which is printed above');
}
if (!keep && !shotOk) rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('PASS');
