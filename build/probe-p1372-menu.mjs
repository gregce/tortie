#!/usr/bin/env node
/**
 * probe-p1372-menu.mjs. The Phase 137.2 proof for the session menu's
 * "Catch me up…" row, modelled on build/probe-p119-menu.mjs, which is the
 * probe that drives the REAL native menu from outside the app.
 *
 * ## What it proves
 *
 * One real session is created on the harness socket. The probe clicks the
 * SHIPPED ellipsis button, whose accessible name is "Session actions for
 * <name>", so the menu on screen is the app's own menu built from the app's
 * own payload. From outside the app it presses the row through the
 * accessibility interface: the open menu is found on the app's own process,
 * addressed by its unix id, the row is addressed by its exact label, and
 * the press is the menu item's own AXPress action. Nothing here types
 * keystrokes, so no input can ever reach another application, and none can
 * reach another surface of this one either. An earlier draft typed the
 * letters of the label and Return through CGEventPostToPid, and a verifier
 * photographed those keys running inside the scratch session's own
 * terminal, which is why keystrokes are banned from this file. The proof
 * of the landing is read off the live page: the Catch Me Up layer is open
 * at the one session view and its header names the session whose menu it
 * was. Nothing else in this run can open that page, so the page being open
 * IS the row having fired.
 *
 * The session is a shell on purpose. No third party agent process starts,
 * and the row is offered for a shell too, whose conversation view draws its
 * honest line, so the cheapest session is also a real case.
 *
 * ## Safety, absolute
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script
 * composed and ended afterwards, and it can never be `gmux` or `default`.
 * The app gets its own user data directory and its own scratch project.
 * Cloud sync is forced off. `-L gmux` appears in exactly one place, a read
 * only session count taken before and after, which must match. No pkill,
 * no kill-server, and the only process signalled is the pid this run
 * spawned, in a finally block whatever happened.
 *
 * Usage, from the worktree root:
 *
 *   npm run probe:p1372menu
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
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
const TAG = '[probe:p1372menu]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The socket
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      'gmux-p1372-menu',
      'node build/probe-p1372-menu.mjs'
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
const rawRoot = join(scratch, 'p1372-menu');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

// The photograph lands beside the other Phase 137.2 evidence in the
// repository's out directory, so it survives the scratch cleanup.
const shotDir = resolve(
  repoRoot,
  (process.env['P1372_OUT_DIR'] ?? '').trim() || 'out/p1372'
);
mkdirSync(shotDir, { recursive: true });
const landingShot = join(shotDir, 'p1372-menu-landing.png');
rmSync(landingShot, { force: true });

const SESSION_NAME = `p1372-menu-${String(process.pid)}`;

const drive = JSON.stringify({ projectPath: project, orientation: 'right' });

/**
 * The one expression the driven window evaluates. It creates one shell
 * session, clicks the shipped ellipsis button, and then only WATCHES: the
 * probe outside presses the menu row, and this expression reads the landing
 * off the live page. Nothing in here composes a menu payload, names a menu
 * row, or opens the overview itself.
 */
const probeJs = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.gmux;
  const name = ${JSON.stringify(SESSION_NAME)};
  const dir = ${JSON.stringify(project)};
  const out = {};
  const made = await g.sessions.create({
    name, projectPath: dir, cwd: dir, agent: 'shell', capture: false
  });
  out.id = made.id;
  // Wait for the row to be on screen, then put the keyboard on it.
  let row = null;
  for (let i = 0; i < 60; i++) {
    row = document.querySelector('[data-session-id="' + made.id + '"]');
    if (row !== null) break;
    await wait(500);
  }
  out.rowOnScreen = row !== null;
  if (row !== null) row.click();
  await wait(1500);
  const btn = document.querySelector(
    'button[aria-label="Session actions for ' + name + '"]'
  );
  out.buttonFound = btn !== null;
  if (btn === null) return out;
  // The window census outside has to happen BEFORE any menu exists, the
  // order probe-p119-menu.mjs learned, so the first mark holds the frame
  // while the probe outside raises the app and lists its windows.
  console.log('[p1372] holding the frame');
  await wait(6000);
  console.log('[p1372] menu opening');
  await wait(300);
  btn.click();
  // The native menu is now open. The probe outside presses the row through
  // the accessibility interface. Watch for the landing: the Catch Me Up
  // layer open at the one session view, its header naming this session.
  const deadline = Date.now() + 45000;
  out.opened = false;
  while (Date.now() < deadline) {
    const title = document.querySelector('.overview-layer .overview-session-title');
    if (title !== null && (title.textContent || '').includes(name)) {
      out.opened = true;
      out.headerTitle = (title.textContent || '').trim();
      break;
    }
    await wait(250);
  }
  const layer = document.querySelector('.overview-layer');
  out.layerOnScreen = layer !== null;
  out.honest = layer === null
    ? null
    : (layer.querySelector('.overview-honest')?.textContent || '').trim();
  // Hold the frame a moment so the photograph shows the landing.
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
      GMUX_SHOT: landingShot,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: drive,
      GMUX_SHOT_JS: probeJs
    }
  }
);
say(`launched the app, pid ${String(child.pid)} (recorded)`);

/**
 * Ends the recorded pid AND every process descended from it. A SIGKILL to
 * the main pid alone leaves the renderer, the GPU helper, the utility
 * helpers and crashpad alive, which a rail long run of the overview probe
 * measured: four orphans stayed up after its watchdog fired. The
 * descendants are read with pgrep -P while the parent still holds them,
 * because a dead parent's children reparent and can no longer be found this
 * way. Nothing outside this one recorded process tree can be named here.
 */
function killTree(pid) {
  const found = [];
  const stack = [pid];
  while (stack.length > 0) {
    const p = stack.pop();
    const r = spawnSync('pgrep', ['-P', String(p)], { encoding: 'utf8' });
    for (const line of (r.stdout ?? '').split('\n')) {
      const n = Number(line.trim());
      if (Number.isInteger(n) && n > 0 && !found.includes(n)) {
        found.push(n);
        stack.push(n);
      }
    }
  }
  for (const p of [...found, pid]) {
    try {
      process.kill(p, 'SIGKILL');
    } catch {
      /* already gone, which is the state we wanted */
    }
  }
}

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
 * The JXA that lists on screen windows, copied from probe-p119-menu.mjs.
 * THE PID FILTER IS INSIDE IT, so this script can never hand back a window
 * belonging to any other application. Ids, layers and sizes only, no names.
 */
const WINDOW_LIST_JS = join(root, 'p1372-window-list.js');
writeFileSync(
  WINDOW_LIST_JS,
  `ObjC.import('CoreGraphics');
ObjC.import('Foundation');
function run(argv) {
  const pid = parseInt(argv[0], 10);
  const ref = $.CGWindowListCopyWindowInfo(1 | 16, 0);
  const all = ObjC.deepUnwrap(ObjC.castRefToObject(ref));
  const mine = [];
  for (var i = 0; i < all.length; i++) {
    var w = all[i];
    if (w.kCGWindowOwnerPID !== pid) continue;
    mine.push({
      id: w.kCGWindowNumber,
      layer: w.kCGWindowLayer,
      w: w.kCGWindowBounds.Width,
      h: w.kCGWindowBounds.Height
    });
  }
  return JSON.stringify(mine);
}
`
);

/**
 * The JXA that presses the row THROUGH THE ACCESSIBILITY INTERFACE, and
 * through the raw pid addressed half of it on purpose. THE PID IS ITS
 * FIRST ARGUMENT: AXUIElementCreateApplication takes the unix id itself,
 * so there is no name lookup anywhere in this script. That is not a
 * nicety. System Events resolves a process specifier BY NAME behind the
 * scenes, every Electron app's process is named Electron, and a measured
 * run of an earlier System Events draft of this script answered questions
 * about the operator's own running Tortie while holding a specifier built
 * from this probe's pid. Raw AX cannot do that.
 *
 * The open menu is not among the application element's AX children, which
 * a controlled experiment measured against a three row test menu. The
 * route that reaches it is a position hit test: the menu's own window is
 * read from CoreGraphics filtered to this pid, AXUIElementCopyElementAtPosition
 * is asked what sits just inside that window's top edge, and the walk goes
 * up to the enclosing AXMenu. The hit test is scoped to the app element,
 * so it can only ever answer with this app's own elements. The row is then
 * matched by its exact title and pressed with its own AXPress action, so
 * nothing here types keystrokes, a label that matches no row presses
 * nothing at all, and the experiment confirmed the row the hit test
 * LANDED on does not fire, only the row the title names. The second
 * argument picks the verb: 'select' presses the row named by the third
 * argument, 'escape' performs AXCancel on the open menu so a failed run
 * does not sit under it until the watchdog. The script prints one JSON
 * line: found, pressed, closed, the items it saw, and a detail sentence.
 */
const MENU_PRESS_JS = join(root, 'p1372-menu-press.js');
writeFileSync(
  MENU_PRESS_JS,
  `ObjC.import('Cocoa');
ObjC.import('CoreGraphics');
ObjC.bindFunction('AXUIElementCreateApplication', ['id', ['int']]);
ObjC.bindFunction('AXUIElementCopyAttributeValue', ['int', ['id', 'id', 'id*']]);
ObjC.bindFunction('AXUIElementPerformAction', ['int', ['id', 'id']]);
ObjC.bindFunction('AXUIElementCopyElementAtPosition', ['int', ['id', 'float', 'float', 'id*']]);

function run(argv) {
  const pid = parseInt(argv[0], 10);
  const mode = argv[1];
  const label = argv[2] || '';
  const out = { found: false, pressed: false, closed: false, items: null, detail: '' };
  const appEl = $.AXUIElementCreateApplication(pid);

  const copyAttr = (el, attr) => {
    const ref = Ref();
    const err = $.AXUIElementCopyAttributeValue(el, attr, ref);
    if (err !== 0) return null;
    return ref[0];
  };
  const listOf = (v) => {
    if (v === null) return [];
    const arr = [];
    let n = 0;
    try { n = Number(v.count); } catch (e) { return []; }
    for (let i = 0; i < n; i++) arr.push(v.objectAtIndex(i));
    return arr;
  };
  const str = (el, attr) => {
    const v = copyAttr(el, attr);
    if (v === null) return null;
    try { return String(ObjC.unwrap(v)); } catch (e) { return null; }
  };

  // The menu's own window: the highest layer window THIS pid owns, above
  // the ordinary window layer. The pid filter is CoreGraphics' own.
  const menuWindowOf = () => {
    const ref = $.CGWindowListCopyWindowInfo(1 | 16, 0);
    const all = ObjC.deepUnwrap(ObjC.castRefToObject(ref));
    let best = null;
    for (let i = 0; i < all.length; i++) {
      const w = all[i];
      if (w.kCGWindowOwnerPID !== pid) continue;
      if (best === null || w.kCGWindowLayer > best.kCGWindowLayer) best = w;
    }
    if (best === null || best.kCGWindowLayer <= 0) return null;
    return best.kCGWindowBounds;
  };

  // The open menu, reached by asking what sits just inside the top edge of
  // the menu's own window and walking up to the enclosing AXMenu.
  const openMenu = () => {
    const b = menuWindowOf();
    if (b === null) return null;
    const hitRef = Ref();
    const err = $.AXUIElementCopyElementAtPosition(appEl, b.X + b.Width / 2, b.Y + 12, hitRef);
    if (err !== 0) return null;
    let el = hitRef[0];
    for (let i = 0; i < 5 && el !== null; i++) {
      if (str(el, 'AXRole') === 'AXMenu') return el;
      el = copyAttr(el, 'AXParent');
    }
    return null;
  };

  let menu = null;
  for (let i = 0; i < 20 && menu === null; i++) {
    menu = openMenu();
    if (menu === null) delay(0.2);
  }
  if (menu === null) {
    out.detail = 'the process has no open menu, so nothing is pressed';
    return JSON.stringify(out);
  }
  out.found = true;

  if (mode === 'escape') {
    const err = $.AXUIElementPerformAction(menu, 'AXCancel');
    out.detail = 'cancel returned AXError ' + String(err);
    return JSON.stringify(out);
  }

  const rows = listOf(copyAttr(menu, 'AXChildren'));
  out.items = [];
  let item = null;
  for (let i = 0; i < rows.length; i++) {
    const t = str(rows[i], 'AXTitle');
    out.items.push(t);
    if (t === label && item === null) item = rows[i];
  }
  if (item === null) {
    out.detail = 'no row is named ' + JSON.stringify(label) + ', so nothing is pressed';
    return JSON.stringify(out);
  }
  // The title is read back from the addressed row before the press, so what
  // fires is proven to be the named row and never a neighbour.
  out.detail = 'row ' + JSON.stringify(str(item, 'AXTitle')) + ' addressed';
  const perr = $.AXUIElementPerformAction(item, 'AXPress');
  if (perr === 0) out.pressed = true;
  else out.detail += ', and the press failed with AXError ' + String(perr);
  // The press that fires the row also closes the menu, so the menu window
  // leaving this pid's window list is the press having landed.
  if (out.pressed) {
    for (let i = 0; i < 15 && !out.closed; i++) {
      if (menuWindowOf() === null) out.closed = true;
      else delay(0.2);
    }
  }
  return JSON.stringify(out);
}
`
);

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

let frontOk = null;
let menuSeen = false;
let appPid = null;
let beforeIds = null;

/**
 * Runs on the first mark, while the driven window holds the frame and no
 * menu exists yet. Raises the app and records the windows it owns, so the
 * menu can be found as the one window the click adds.
 */
function armTheCensus() {
  appPid = guiPid();
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
    `the app owns ${before === null ? 'an unreadable number of' : String(before.length)} windows before any menu opens` +
      (frontOk ? ', and it is in front' : ', and it is NOT in front')
  );
}

/**
 * Runs on the second mark, after the click. It presses the row THROUGH THE
 * ACCESSIBILITY INTERFACE, addressed to the app's own pid, which is the
 * script MENU_PRESS_JS above. Nothing here types system wide keystrokes,
 * and nothing here types addressed keystrokes either: an earlier draft
 * posted the letters of the label and Return to the app's pid, and a
 * verifier photographed those keys running inside the scratch session's own
 * terminal, because a posted key lands wherever the app's own focus sits
 * while an AXPress can only fire the one named row.
 *
 * The window census is kept as evidence, not as a gate. A verifier's run
 * saw no added window inside the old four second window while the menu was
 * in fact open, so the press script does its own wait for the menu on the
 * process and refuses by itself when there is none. Either sighting counts
 * as the menu having been on screen, and the run says which one it got.
 */
const CATCH_ROW_LABEL = 'Catch me up…';
let clickOk = false;
let menuSeenByCensus = false;
let menuSeenByAx = false;
function pressTheRow() {
  if (appPid === null) {
    say('the census never armed, so nothing is pressed and the run will fail honestly');
    return;
  }
  if (beforeIds !== null) {
    const deadline = Date.now() + 4000;
    for (;;) {
      const after = windowsOf(appPid);
      if (after !== null) {
        const added = after.filter((w) => !beforeIds.has(w.id));
        if (added.length > 0) {
          menuSeenByCensus = true;
          added.sort((a, b) => b.layer - a.layer);
          say(
            `the menu's window is on screen, layer ${String(added[0].layer)}, ` +
              `${String(added[0].w)} by ${String(added[0].h)} points`
          );
          break;
        }
      }
      if (Date.now() >= deadline) break;
    }
  }
  if (!menuSeenByCensus) {
    say('the window census did not sight the menu, so the press script\'s own accessibility read is the sighting that counts');
  }
  for (let i = 0; i < 3 && !clickOk; i++) {
    const r = spawnSync(
      'osascript',
      ['-l', 'JavaScript', MENU_PRESS_JS, String(appPid), 'select', CATCH_ROW_LABEL],
      { encoding: 'utf8', timeout: 30_000 }
    );
    const line = `${(r.stdout ?? '').trim()} ${(r.stderr ?? '').trim()}`.trim();
    say(`accessibility press, addressed to pid ${String(appPid)}: ${line}`);
    let read = null;
    try {
      read = JSON.parse((r.stdout ?? '').trim());
    } catch {
      read = null;
    }
    if (read !== null) {
      if (read.found === true) menuSeenByAx = true;
      if (read.pressed === true && read.closed === true) clickOk = true;
    }
    if (!clickOk) spawnSync('sleep', ['0.6']);
  }
  menuSeen = menuSeenByCensus || menuSeenByAx;
  if (clickOk) {
    say('the named row was pressed through the accessibility interface and the menu closed');
  } else {
    // Close the menu the same addressed way, so the app can finish its run
    // rather than sit under an open menu until the watchdog.
    spawnSync(
      'osascript',
      ['-l', 'JavaScript', MENU_PRESS_JS, String(appPid), 'escape'],
      { encoding: 'utf8', timeout: 30_000 }
    );
    say('the row was never pressed, the menu was told to close, and the run will fail honestly');
  }
}

const HOLD_MARK = '[p1372] holding the frame';
const MARK = '[p1372] menu opening';
let seenHold = false;
let seenMark = false;
let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
  if (!seenHold && text.includes(HOLD_MARK)) {
    seenHold = true;
    setTimeout(armTheCensus, 200);
  }
  if (!seenMark && text.includes(MARK)) {
    seenMark = true;
    setTimeout(pressTheRow, 900);
  }
};
child.stdout.on('data', (b) => onText(b.toString()));
child.stderr.on('data', (b) => onText(b.toString()));

try {
  await new Promise((r) => {
    const watchdog = setTimeout(() => {
      console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
      child.kill('SIGTERM');
      // An app wedged under an open native menu shrugs off SIGTERM, which a
      // wedged run of this very probe measured, so the term escalates. The
      // escalation takes the whole recorded tree, because a SIGKILL to the
      // main pid alone orphans the helper processes.
      setTimeout(() => {
        if (child.pid !== undefined) killTree(child.pid);
      }, 15_000);
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
} finally {
  // Whatever happened above, the Electron this run started is ended here,
  // together with every process descended from it. Only the tree under the
  // pid recorded at spawn is touched.
  if (child.pid !== undefined) killTree(child.pid);
}
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
  failures.push('0. the drive printed no reading, so nothing was measured');
} else {
  check(
    1,
    'the session was created and its row reached the screen',
    typeof reading.id === 'string' && reading.rowOnScreen === true,
    `id ${JSON.stringify(reading.id)}, row ${String(reading.rowOnScreen)}`
  );
  check(
    2,
    'the shipped ellipsis button was found by its accessible name',
    reading.buttonFound === true,
    `button ${String(reading.buttonFound)}`
  );
  check(
    3,
    'the Catch Me Up layer opened at the one session view naming that session',
    reading.opened === true &&
      typeof reading.headerTitle === 'string' &&
      reading.headerTitle.includes(SESSION_NAME),
    `opened ${String(reading.opened)}, header ${JSON.stringify(reading.headerTitle ?? null)}`
  );
}

check(
  4,
  'the click put a real native menu on screen before anything was pressed',
  menuSeen === true,
  `window census ${String(menuSeenByCensus)}, accessibility read ${String(menuSeenByAx)}`
);
check(
  5,
  'the accessibility press, addressed to the named row alone, landed and closed the menu',
  clickOk === true,
  `press ${String(clickOk)}, frontmost during the raise ${String(frontOk)}`
);
check(
  6,
  'the landing photograph was written by the harness itself',
  existsSync(landingShot) && statSync(landingShot).size > 0,
  existsSync(landingShot) ? `${String(statSync(landingShot).size)} bytes -> ${landingShot}` : 'missing'
);

const operatorAfter = operatorSessionCount();
check(
  7,
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
say(`landing photograph: ${landingShot}`);
rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('PASS');
