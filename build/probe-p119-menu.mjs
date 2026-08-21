/**
 * probe-p119-menu.mjs. The Phase 119 screenshot read of the two new rows in
 * the NATIVE session context menu, and of the ended card beside them.
 *
 * ## WHY IT EXISTS
 *
 * The spec's section 7.3 asks for two photographs. The first one, the ended
 * card with its note and its four buttons, comes out of the ordinary shot
 * harness and this probe writes it. The second one, the open native menu, was
 * not obtained. Six attempts in the build round failed, and the fix round's
 * report has to say what stopped them:
 *
 *  - a synthetic `contextmenu` event opened no menu the accessibility
 *    interface could see;
 *  - `window.gmux` is not configurable, so the menu payload cannot be read
 *    back by wrapping the bridge from the driven window;
 *  - the outside photograph caught another application's window inside the
 *    app's rectangle once, and that file was deleted immediately.
 *
 * The first two are answered below. The third is the machine's own limit and
 * is answered by measuring the menu rather than photographing it.
 *
 * This probe takes the second photograph by a different route. It clicks the
 * SHIPPED affordance, which is the ellipsis button in the session identity
 * strip, whose accessible name is "Session actions for <name>". That button
 * calls `sessionMenuItems` and `showNativeMenu`, so the menu on screen is the
 * app's own menu built from the app's own payload. Nothing about the menu is
 * supplied by this file.
 *
 * ## THE ORDER, AND WHY IT IS THIS ORDER
 *
 * A native menu is drawn by the app and read from outside it, so the census of
 * the app's own windows has to be taken BEFORE any menu exists, and the menu
 * has to be read by a process that is not the app. That gives:
 *
 *   1. open a scratch project and create TWO real sessions in it, one with
 *      capture on and one with it off
 *   2. wait until the harvest has armed the captured one's resume command
 *   3. end both, so both rows become ended rows
 *   4. read both ended cards: the note, the buttons and their order
 *   5. raise the app and list the windows it owns, before any menu exists
 *   6. click the ellipsis button for the captured row, list again, and measure
 *      the window the menu added
 *   7. press escape, select the plain row, and do the same for it
 *   8. compare the two menus, which differ only by the rows this phase added
 *
 * ## THE PHOTOGRAPH, AND THE ROUTE THAT TAKES IT
 *
 * The second photograph IS obtainable on this machine, and this probe takes
 * it. An earlier round reported that no route worked and that measuring the
 * menu was all that could be done. That report was wrong, and the reason it
 * was wrong is worth keeping, because it is the same mistake a later round
 * would make:
 *
 *  - THE RECTANGLE THAT FAILED was the APP WINDOW'S rectangle, 1440 by 888
 *    points at 36,38. A person's own running Tortie sits at those same
 *    coordinates, so a window on top of the app inside that rectangle is still
 *    in the frame. One such file came back holding the operator's own window
 *    and was deleted immediately, unread.
 *  - `screencapture -l <id>`, which asks for one window by its id, does not
 *    capture one window on this machine. It writes the whole 2880 by 1776
 *    screen for a menu window and for an ordinary app window alike, with exit
 *    status 0 and no message. Both spellings were tried.
 *  - THE RECTANGLE THAT WORKS is the MENU WINDOW'S OWN CoreGraphics bounds,
 *    which this probe already reads in order to measure the menu. A menu is
 *    333 by 285 points and is the topmost thing over its own bounds while it
 *    is open, so nothing else can be inside that frame. Measured on
 *    2026-08-21: `screencapture -x -o -R1084,103,333,285` returned status 0
 *    with empty stderr, and so did the plain menu at 199 by 175.
 *
 * So the probe both MEASURES and PHOTOGRAPHS each menu. The measurement is a
 * comparison rather than a single reading. It builds two ended sessions in one
 * app run, one captured and one not, opens each one's native menu through the
 * shipped ellipsis button, and reads from CoreGraphics the window that each
 * click added to the app's own window list. Measured on 2026-08-21:
 *
 *   captured, ended    333 by 285 points, layer 101
 *   plain, ended       199 by 175 points, layer 101
 *
 * The two rows differ in one fact, being the row's capture, so the 110 points
 * of extra height belong to the two rows this phase added and to nothing else.
 * A native row carrying a grey sublabel is about 55 points tall, and two of
 * them is 110. The 134 points of extra width are the two long labels.
 *
 * WHAT THIS DOES NOT PROVE, and the report has to say it. It does not prove
 * the two labels read as written, and it does not prove the two sublabels are
 * legible. Those are held by `src/renderer/app/__tests__/p119-bare-recovery.test.ts`
 * and by the code. What it does prove is that the native menu the app builds
 * for a captured ended row is exactly two sublabelled rows bigger than the one
 * it builds for the same row without capture.
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without `GMUX_TMUX_SOCKET` this script re-runs itself through
 * `build/harness-socket.mjs`, so the socket is always one that script composed
 * and ended afterwards, and it can never be `gmux` or `default`. The app gets
 * its own user data directory and its own scratch project, both outside the
 * repository. Cloud sync is forced off, because the session it creates is a
 * real captured one and a scratch session must never reach anyone's SpecStory
 * Cloud. `-L gmux` appears in exactly one place, a read only session count
 * taken before and after, which must match. Nothing here uses pkill, nothing
 * uses kill-server, and the only process signalled is the pid this run
 * spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   npm run probe:p119menu           (add -- --keep to keep the scratch dir)
 *
 * Exit code 0 when every row of the table passes. Exit code 1 otherwise, with
 * every failing row named. Exit code 2 when the probe refuses to run.
 *
 * Every scratch file carries a `p119-` prefix.
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
const TAG = '[probe:p119menu]';

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
  const inner = `node build/probe-p119-menu.mjs${keep ? ' --keep' : ''}`;
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [join(repoRoot, 'build', 'harness-socket.mjs'), 'gmux-p119-menu', inner],
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
// The scratch project and the isolated profile
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p119-menu');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

const cardShot = join(scratch, 'p119-ended-card.png');
rmSync(cardShot, { force: true });

const SESSION_NAME = `p119-auth-${String(process.pid)}`;

const drive = JSON.stringify({ projectPath: project, orientation: 'right' });

/**
 * The one expression the driven window evaluates. It creates the two sessions,
 * ends them, reads both ended cards, and clicks the shipped ellipsis button for
 * each. Nothing in it composes a menu payload and nothing in it names a row.
 */
const probeJs = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.gmux;
  const nameA = ${JSON.stringify(SESSION_NAME + '-kept')};
  const nameB = ${JSON.stringify(SESSION_NAME + '-plain')};
  const dir = ${JSON.stringify(project)};
  const out = {};
  const bornAt = Date.now();
  const madeA = await g.sessions.create({
    name: nameA, projectPath: dir, cwd: dir, agent: 'claude', capture: true
  });
  const madeB = await g.sessions.create({
    name: nameB, projectPath: dir, cwd: dir, agent: 'claude', capture: false
  });
  out.idA = madeA.id;
  out.idB = madeB.id;
  const rowOf = async (id) => {
    const list = await g.sessions.list();
    return list.find((s) => s.id === id) ?? null;
  };
  let rowA = null;
  for (let i = 0; i < 120; i++) {
    rowA = await rowOf(madeA.id);
    const argv0 = (rowA && rowA.resumeArgv && rowA.resumeArgv[0]) || '';
    if (argv0.includes('specstory')) break;
    await wait(500);
  }
  out.armedBeforeEnd = (rowA && rowA.resumeArgv && rowA.resumeArgv[0]) || null;
  // The ended card has a second shape for a session that died within five
  // seconds of starting, and that one is not the card under test.
  while (Date.now() - bornAt < 9000) await wait(500);
  await g.sessions.kill(madeA.id);
  await g.sessions.kill(madeB.id);
  const settle = async (id) => {
    for (let i = 0; i < 120; i++) {
      const r = await rowOf(id);
      if (r && (r.status === 'exited' || r.status === 'restorable')) return r;
      await wait(500);
    }
    return await rowOf(id);
  };
  const endedA = await settle(madeA.id);
  const endedB = await settle(madeB.id);
  out.statusA = endedA ? endedA.status : null;
  out.statusB = endedB ? endedB.status : null;
  out.captureA = endedA && endedA.capture ? endedA.capture.provider : null;
  out.captureB = endedB && endedB.capture ? endedB.capture.provider : null;
  await wait(2500);
  // The raise and the window census happen here, not at the first menu mark,
  // so the census can never accidentally include a menu that is already open.
  console.log('[p119] holding the frame');
  await wait(6000);

  const select = async (id) => {
    const row = document.querySelector('[data-session-id="' + id + '"]');
    if (row !== null) row.click();
    await wait(1200);
  };
  const openMenu = async (nm, mark) => {
    const btn = document.querySelector(
      'button[aria-label="Session actions for ' + nm + '"]'
    );
    if (btn === null) return false;
    console.log(mark);
    await wait(400);
    btn.click();
    await wait(5000);
    return true;
  };

  await select(madeA.id);
  out.cardBody = Array.from(document.querySelectorAll('.empty-body')).map(
    (p) => (p.textContent || '').trim()
  );
  out.cardButtons = Array.from(
    document.querySelectorAll('.empty-actions .btn')
  ).map((b) => (b.textContent || '').trim());
  out.openedA = await openMenu(nameA, '[p119] menu A');

  await select(madeB.id);
  out.cardBodyB = Array.from(document.querySelectorAll('.empty-body')).map(
    (p) => (p.textContent || '').trim()
  );
  out.cardButtonsB = Array.from(
    document.querySelectorAll('.empty-actions .btn')
  ).map((b) => (b.textContent || '').trim());
  out.openedB = await openMenu(nameB, '[p119] menu B');

  // Leave the captured session on screen, so the frame the harness photographs
  // is the ended card under test.
  await select(madeA.id);
  await wait(800);
  return out;
})()`;

// ---------------------------------------------------------------------------
// One run of the app
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

const child = spawn(
  electronBin,
  ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_SHOT: cardShot,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: drive,
      GMUX_SHOT_JS: probeJs
    }
  }
);
say(`launched the app, pid ${String(child.pid)} (recorded)`);

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

/**
 * The JXA that lists on screen windows. THE PID FILTER IS INSIDE IT, so this
 * script can never hand back, print or photograph a window belonging to any
 * other application. It reports a window's id, its layer and its size, and it
 * does not report window names at all.
 */
const WINDOW_LIST_JS = join(root, 'p119-window-list.js');
writeFileSync(
  WINDOW_LIST_JS,
  `ObjC.import('CoreGraphics');
ObjC.import('Foundation');
function run(argv) {
  const pid = parseInt(argv[0], 10);
  // 1 = on screen only, 16 = exclude desktop elements.
  const ref = $.CGWindowListCopyWindowInfo(1 | 16, 0);
  const all = ObjC.deepUnwrap(ObjC.castRefToObject(ref));
  const mine = [];
  for (var i = 0; i < all.length; i++) {
    var w = all[i];
    if (w.kCGWindowOwnerPID !== pid) continue;
    mine.push({
      id: w.kCGWindowNumber,
      layer: w.kCGWindowLayer,
      x: w.kCGWindowBounds.X,
      y: w.kCGWindowBounds.Y,
      w: w.kCGWindowBounds.Width,
      h: w.kCGWindowBounds.Height
    });
  }
  return JSON.stringify(mine);
}
`
);

/** Every on screen window owned by `pid`, and nothing else. */
function windowsOf(pid) {
  const r = spawnSync(
    'osascript',
    ['-l', 'JavaScript', WINDOW_LIST_JS, String(pid)],
    { encoding: 'utf8', timeout: 15_000 }
  );
  if (r.status !== 0) return null;
  try {
    return JSON.parse((r.stdout ?? '').trim());
  } catch {
    return null;
  }
}

/** The app's own windows before any menu exists, so a menu is the diff. */
let beforeIds = null;
let appPid = null;
let frontOk = null;
/** What each menu measured: label to { id, layer, w, h } or null. */
const menus = { A: null, B: null };
const menuShots = { A: null, B: null };

/** Raise the app and record the windows it owns while no menu exists yet. */
function armTheShot() {
  appPid = guiPid();
  // MEASURED: one `set frontmost` and an immediate read said the app was not
  // in front, because the activation had not landed yet. The raise is asked
  // for and then read back, up to six times.
  let front = null;
  for (let i = 0; i < 6; i++) {
    spawnSync(
      'osascript',
      [
        '-e',
        `tell application "System Events" to set frontmost of (first process whose unix id is ${String(appPid)}) to true`
      ],
      { encoding: 'utf8', timeout: 10_000 }
    );
    spawnSync('sleep', ['0.4']);
    front = frontmostPid();
    if (front === appPid) break;
  }
  frontOk = front === appPid;
  const before = windowsOf(appPid);
  beforeIds = before === null ? null : new Set(before.map((w) => w.id));
  say(
    `the app owns ${before === null ? 'an unreadable number of' : String(before.length)} on screen windows before any menu opens` +
      (frontOk ? ', and it is in front' : ', and it is NOT in front')
  );
}

/**
 * Measure the window the menu added, photograph it, and close the menu again.
 *
 * What is read here is the menu's own window: that it exists, that the app
 * owns it, what layer it sits on, and how big it is. The size is the
 * measurement that separates the two menus. The photograph is bounded to that
 * same window rectangle, which is what makes it safe to take, and the header
 * section "the photograph, and the route that takes it" says why.
 */
function measureMenu(label) {
  if (appPid === null || beforeIds === null) return;
  // POLLED RATHER THAN LOOKED AT ONCE. Measured across seven runs, the menu's
  // window appeared between about 0.4 s and 1.5 s after the click.
  let added = [];
  const deadline = Date.now() + 4000;
  for (;;) {
    const after = windowsOf(appPid);
    if (after !== null) {
      added = after.filter((w) => !beforeIds.has(w.id));
      if (added.length > 0) break;
    }
    if (Date.now() >= deadline) break;
  }
  if (added.length === 0) {
    say(`menu ${label}: the click added no window, so no menu was on screen`);
  } else {
    // A popup menu sits above the ordinary window layer, so the highest layer
    // among the added windows is the menu itself.
    added.sort((a, b) => b.layer - a.layer);
    menus[label] = added[0];
    say(
      `menu ${label}: window id ${String(added[0].id)}, layer ${String(added[0].layer)}, ` +
        `${String(added[0].w)} by ${String(added[0].h)} points`
    );
  }
  // Photograph the menu's OWN rectangle while it is still open, bounded to the
  // window CoreGraphics just reported rather than to the app's window. That is
  // the whole trick, and it is why the earlier attempts failed: the app's
  // rectangle is 1440 by 888 points at 36,38, which is where a person's own
  // running Tortie also sits, so anything on top of that area lands in the
  // frame. A menu is 333 by 285 points and is the topmost thing over its own
  // bounds for as long as it is open, so its own rectangle holds only itself.
  if (menus[label] !== null) {
    const m = menus[label];
    const shot = join(scratch, `p119-menu-${label}.png`);
    const rect = `${String(m.x)},${String(m.y)},${String(m.w)},${String(m.h)}`;
    const cap = spawnSync(
      'screencapture',
      ['-x', '-o', `-R${rect}`, shot],
      { encoding: 'utf8', timeout: 20_000 }
    );
    menuShots[label] =
      cap.status === 0 && existsSync(shot) && statSync(shot).size > 0
        ? shot
        : null;
    say(
      `menu ${label} photograph: rectangle ${rect}, status ${String(cap.status)}, ` +
        `${menuShots[label] === null ? 'no file' : `${String(statSync(shot).size)} bytes -> ${shot}`}`
    );
  }
  // Close the menu so the driver can move on.
  spawnSync(
    'osascript',
    ['-e', 'tell application "System Events" to key code 53'],
    { encoding: 'utf8', timeout: 10_000 }
  );
}

const HOLD_MARK = '[p119] holding the frame';
const MARK_A = '[p119] menu A';
const MARK_B = '[p119] menu B';
let armed = false;
let seenA = false;
let seenB = false;
let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
  if (!armed && text.includes(HOLD_MARK)) {
    armed = true;
    setTimeout(armTheShot, 200);
  }
  if (!seenA && text.includes(MARK_A)) {
    seenA = true;
    setTimeout(() => measureMenu('A'), 900);
  }
  if (!seenB && text.includes(MARK_B)) {
    seenB = true;
    setTimeout(() => measureMenu('B'), 900);
  }
};
child.stdout.on('data', (b) => onText(b.toString()));
child.stderr.on('data', (b) => onText(b.toString()));

await new Promise((r) => {
  const watchdog = setTimeout(() => {
    console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
    child.kill('SIGTERM');
  }, 300_000);
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

const BARE_RESTORE_LABEL = 'Restore without saving history';
const NOTE_TAIL = 'You can bring it back without that';

if (reading === null) {
  failures.push('0. the drive printed no reading, so nothing was measured');
} else {
  check(
    1,
    'one ended row is captured and the other is not',
    reading.statusA === 'exited' &&
      reading.statusB === 'exited' &&
      reading.captureA !== null &&
      reading.captureB === null,
    `A ${JSON.stringify(reading.statusA)}/${JSON.stringify(reading.captureA)}, ` +
      `B ${JSON.stringify(reading.statusB)}/${JSON.stringify(reading.captureB)}`
  );
  check(
    2,
    'the harvest armed the wrapped resume command before the end',
    typeof reading.armedBeforeEnd === 'string' &&
      reading.armedBeforeEnd.includes('specstory'),
    `resumeArgv[0] ${JSON.stringify(reading.armedBeforeEnd)}`
  );
  check(
    3,
    'the captured card draws the bare recovery note and the plain card does not',
    (reading.cardBody ?? []).some((p) => p.includes(NOTE_TAIL)) &&
      !(reading.cardBodyB ?? []).some((p) => p.includes(NOTE_TAIL)),
    `captured ${JSON.stringify(reading.cardBody)}, plain ${JSON.stringify(reading.cardBodyB)}`
  );
  check(
    4,
    'the captured card draws the bare button between Restore and Restart, and the plain card draws no such button',
    (reading.cardButtons ?? [])[0] === 'Restore' &&
      (reading.cardButtons ?? [])[1] === BARE_RESTORE_LABEL &&
      !(reading.cardButtonsB ?? []).includes(BARE_RESTORE_LABEL),
    `captured ${JSON.stringify(reading.cardButtons)}, plain ${JSON.stringify(reading.cardButtonsB)}`
  );
  check(
    5,
    'the shipped session actions button opened a menu for both rows',
    reading.openedA === true && reading.openedB === true,
    `A ${String(reading.openedA)}, B ${String(reading.openedB)}`
  );
}

check(
  6,
  'each click put a real native menu window on screen, owned by the app, above the ordinary window layer',
  menus.A !== null &&
    menus.B !== null &&
    menus.A.layer > 0 &&
    menus.B.layer > 0,
  `captured ${JSON.stringify(menus.A)}, plain ${JSON.stringify(menus.B)}`
);
// THE ONE THAT DECIDES THE MENU CLAIM. The two menus differ only in the row's
// capture, so every extra point of height belongs to the two rows this phase
// added. A native row with a grey sublabel is about 55 points tall, so two of
// them is about 110, and the two long labels are what widen the menu.
const grew =
  menus.A !== null && menus.B !== null
    ? { h: menus.A.h - menus.B.h, w: menus.A.w - menus.B.w }
    : null;
check(
  7,
  'the captured menu is two sublabelled rows taller than the plain one, and wider',
  grew !== null && grew.h >= 90 && grew.h <= 130 && grew.w > 0,
  grew === null
    ? 'one of the two menus was never measured'
    : `${String(menus.B.w)} by ${String(menus.B.h)} points without the rows, ` +
      `${String(menus.A.w)} by ${String(menus.A.h)} with them, so ${String(grew.w)} points wider and ${String(grew.h)} points taller`
);
check(
  8,
  'the ended card photograph was written by the harness itself',
  existsSync(cardShot) && statSync(cardShot).size > 0,
  existsSync(cardShot) ? `${String(statSync(cardShot).size)} bytes` : 'missing'
);
check(
  9,
  'the app was in front while the menus were driven',
  frontOk === true,
  `frontmost check ${String(frontOk)}`
);

const operatorAfter = operatorSessionCount();
check(
  10,
  "the operator's session count did not move",
  operatorAfter === operatorBefore,
  `${String(operatorBefore)} before, ${String(operatorAfter)} after`
);

say('');
say('  step  verdict  claim');
for (const r of results) {
  say(
    `  ${String(r.step).padStart(4)}  ${r.verdict.padEnd(7)}  ${r.claim} — ${r.detail}`
  );
}
say('');
say(`ended card photograph: ${cardShot}`);
for (const label of ['A', 'B']) {
  say(
    `menu ${label} photograph: ${menuShots[label] === null ? 'not taken' : String(menuShots[label])}`
  );
}
if (!keep) rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('PASS');
