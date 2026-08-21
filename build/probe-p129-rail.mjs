#!/usr/bin/env node
/**
 * probe-p129-rail.mjs. Phase 129 item 2, driven in the live app.
 *
 * ## WHAT IT PROVES
 *
 * Two defects the operator reported on 2026-08-21, with the sessions pane on
 * the right:
 *
 *   1. up and down move the keyboard INTO the terminal instead of moving from
 *      session to session;
 *   2. collapsed to the rail, switching to a session takes two clicks.
 *
 * The probe MEASURES both rather than describing them. It presses real keys on
 * the shipped list element, and it presses each of three click shapes on a real
 * rail item, counting how many presses each shape needs before the selection
 * and the drawn leaf both move.
 *
 * ## THE THREE CLICK SHAPES, and why there are three
 *
 * `element.click()` dispatches a click and nothing else. A person's click is a
 * pointerdown, some travel, a pointerup and then a click, and the travel is
 * what a trackpad adds. The app's drag engine arms at 4 px of travel and then
 * swallows the click that follows the release, so the shape with travel is the
 * only one that can reproduce what the operator sees. All three are measured so
 * the report can say which one is the defect.
 *
 *   A  click only, no pointer events
 *   B  pointerdown, pointerup, click, all at one point (0 px of travel)
 *   C  pointerdown, two moves totalling 8 px, pointerup, click
 *
 * ## THE TABLE, and every cell is read off the running app
 *
 * Two MEASUREMENT blocks are printed before the table, whatever the verdicts
 * say. The first is how many presses each click shape needed. The second is
 * where the keyboard sat after each arrow press. Run this probe against the
 * UNMODIFIED build to read them, and expect rows 4, 5 and 7 to fail there.
 * That failure is the defect. After the change every row passes.
 *
 *   #   what must be true                                     read from
 *   --  ---------------------------------------------------   ----------------
 *    0  the drive answered with a reading                     the drive
 *    1  three session rows were drawn                         the document
 *    3  expanded. ArrowDown, ArrowDown, ArrowUp on the dock   the document
 *       list select the second, third and second row
 *    4  after every one of those presses the keyboard is      the document
 *       still inside the session dock
 *    5  one of those presses lands on a session with a live   the document
 *       terminal, and row 4 still holds for it
 *    6  collapsed. the same three presses give the same       the document
 *       three answers on the rail list
 *    7  one click switches, in every one of the three click   the document
 *       shapes, and the count printed is 1
 *    8  after that one click the keyboard is in the terminal  the document
 *    9  no row gained or lost the needs input state           the document
 *   10  two PNGs, one expanded and one collapsed              the file system
 *   11  the operator's session count did not move             tmux, read only
 *
 * There is no row 2. The numbering is the spec's and it is kept, so a reader
 * can put a printed line beside the row the spec asked for.
 *
 * ## WHAT IT DOES NOT PROVE, and the report has to say so
 *
 * The synthetic pointer sequence moves no DOM focus, because a dispatched
 * event has no default action. A person's press also focuses the list, and
 * that half is covered by the unit tests in
 * src/renderer/app/__tests__/p129-session-rail.test.ts and by row 8, which
 * reads where the keyboard ended up after the click path ran.
 *
 * All three sessions are REAL shell sessions on the harness socket, created
 * through the shipped bridge. The drive's own `fakeTabs` was tried first and
 * cannot be used here: it injects two renderer only rows once, and the next
 * sessions:changed from main replaces the session array and takes them with
 * it, so the list was measured with one row in it. Real sessions also make row
 * 5 stronger, because every press lands on a session with a live terminal.
 *
 * ## THE ORDER OF THE RUN, and why the photograph is last
 *
 * Every keyboard reading finishes before anything outside the window is
 * touched. The outside photograph needs the app to be frontmost, so the node
 * half raises the window with System Events, and that raise is macOS moving
 * focus. The first build of this probe raised the window BETWEEN the expanded
 * and the collapsed arrow readings, and one run in eight ended with the
 * keyboard leaving the rail in the middle of the collapsed reading, which is
 * the exact defect item 2 exists to fix. That run could not be told apart
 * from a product failure. The photograph now happens after the last arrow and
 * the last click, with the dock put back to expanded through its own button
 * for the frame and collapsed again afterwards.
 *
 * The sessions are left running when the readings are out, because the
 * screenshot is taken after this expression returns and an empty list is not
 * the frame under test. build/harness-socket.mjs ends the whole server on the
 * composed socket afterwards, which is what takes them away.
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, and it can never be `gmux` or `default`. The app gets
 * its own user data directory and its own scratch project, both outside the
 * repository. `-L gmux` appears in exactly one place, a read only session count
 * taken before and after, which must match. Nothing here uses pkill, nothing
 * uses kill-server, and the only process signalled is the pid this run spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   node build/probe-p129-rail.mjs          (add --keep to keep the scratch dir)
 *
 * Exit code 0 when every row of the table passes. Exit code 1 otherwise, with
 * every failing row named. Exit code 2 when the probe refuses to run.
 *
 * Every scratch file carries a `p129-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { windowShot } from './window-shot.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p129rail]';

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
  const inner = `node build/probe-p129-rail.mjs${keep ? ' --keep' : ''}`;
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [join(repoRoot, 'build', 'harness-socket.mjs'), 'gmux-p129-rail', inner],
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
const rawRoot = join(scratch, 'p129-rail');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

const expandedShot = join(scratch, 'p129-rail-expanded.png');
const collapsedShot = join(scratch, 'p129-rail-collapsed.png');
for (const path of [expandedShot, collapsedShot]) rmSync(path, { force: true });

const REAL_NAME = `p129-real-${String(process.pid)}`;

const drive = JSON.stringify({
  projectPath: project,
  session: { agent: 'shell', name: REAL_NAME },
  orientation: 'right'
});

/**
 * The one expression the driven window evaluates. It presses the shipped
 * controls and reads the shipped DOM. Nothing in it reaches into a store, and
 * nothing in it adds a driver module to the renderer.
 */
const probeJs = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { shapes: {}, arrows: {}, notes: [] };

  const list = () => document.querySelector('.dock-list, .rail-list');
  const rows = () => Array.from(document.querySelectorAll(
    '[data-slot="session-dock"] [role="option"]'
  ));
  const selected = () => {
    const el = document.querySelector(
      '[data-slot="session-dock"] [role="option"][aria-selected="true"]'
    );
    return el === null ? null : el.getAttribute('aria-label');
  };
  const leaf = () => {
    const el = document.querySelector('.surface-single[data-split-leaf]');
    return el === null ? null : el.getAttribute('data-split-leaf');
  };
  const dots = () => rows().map((el) => {
    const dot = el.querySelector('.dot');
    return {
      label: el.getAttribute('aria-label'),
      dot: dot === null ? '' : dot.className,
      attention: el.classList.contains('attention')
    };
  });
  const inADockList = () => {
    const el = document.activeElement;
    return el !== null && el.closest('[data-slot="session-dock"]') !== null;
  };
  const inATerminal = () => {
    const el = document.activeElement;
    return el !== null && el.closest('.gmux-terminal-mount') !== null;
  };

  // The key goes to WHATEVER HAS THE KEYBOARD, never to the list by name.
  // Dispatching at the list element would hide the defect: the first press
  // takes the keyboard out of the list, and a probe that keeps aiming at the
  // list would keep moving a selection the person can no longer move.
  const press = async (key) => {
    const target = document.activeElement ?? list();
    if (target === null) return;
    target.dispatchEvent(new KeyboardEvent('keydown', {
      key, bubbles: true, cancelable: true
    }));
    await wait(600);
  };

  // The three click shapes. Each one acts on one element at its own centre.
  const pointerAt = (el, type, x, y, target) => {
    (target ?? el).dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      button: 0, buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 1, pointerType: 'mouse', isPrimary: true
    }));
  };
  const clickAt = (el, x, y) => {
    el.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0
    }));
  };
  const shapeA = async (el) => { el.click(); };
  const shapeB = async (el) => {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    pointerAt(el, 'pointerdown', x, y);
    pointerAt(el, 'pointerup', x, y);
    clickAt(el, x, y);
  };
  const shapeC = async (el) => {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    pointerAt(el, 'pointerdown', x, y);
    await wait(20);
    pointerAt(el, 'pointermove', x + 5, y + 2, window);
    await wait(20);
    pointerAt(el, 'pointermove', x + 8, y + 3, window);
    await wait(20);
    pointerAt(el, 'pointerup', x + 8, y + 3, window);
    clickAt(el, x + 8, y + 3);
  };

  /**
   * Presses one shape on the row at \`index\` until the selection AND the drawn
   * leaf both move, up to three presses. Returns the count, and 0 when the row
   * never took the selection.
   */
  const countPresses = async (shape, index, reset) => {
    await reset();
    const before = { sel: selected(), leaf: leaf() };
    for (let n = 1; n <= 3; n++) {
      const el = rows()[index];
      if (el === undefined) return { presses: 0, why: 'no such row' };
      await shape(el);
      await wait(700);
      if (selected() !== before.sel && leaf() !== before.leaf) {
        return { presses: n, from: before.sel, to: selected() };
      }
    }
    return { presses: 0, from: before.sel, to: selected() };
  };

  // Three rows, all of them real, made through the shipped bridge on the
  // harness socket. The drive's own fakeTabs field was tried first and is not
  // usable here: it injects renderer only rows once, and the next
  // sessions:changed from main replaces the array and takes them with it.
  const g = window.gmux;
  out.made = [];
  for (const suffix of ['b', 'c']) {
    const made = await g.sessions.create({
      name: ${JSON.stringify(REAL_NAME)} + '-' + suffix,
      projectPath: ${JSON.stringify(project)},
      cwd: ${JSON.stringify(project)},
      agent: 'shell'
    });
    out.made.push(made.id);
    await wait(1200);
  }
  await wait(2500);
  out.rowsAtStart = rows().map((el) => el.getAttribute('aria-label'));
  out.dotsBefore = dots();

  // ---- expanded: the arrow keys -----------------------------------------
  const dock = list();
  if (dock === null) { out.notes.push('no session list was drawn'); return out; }
  out.density = dock.className;
  dock.focus();
  await wait(300);
  // Put the selection on the first row without using the keyboard.
  const first = rows()[0];
  if (first !== undefined) { first.click(); await wait(900); }
  dock.focus();
  await wait(300);

  /**
   * What the project chrome is drawing right now, recorded beside every arrow
   * press.
   *
   * One run in eight of the first build of this probe ended with the keyboard
   * on .ptab-chip and then on .prail-collapse, and both of those are drawn
   * only while the project tabs are COLLAPSED, which is a state this probe
   * never asks for. That run could not be explained, so it could not be told
   * apart from the defect item 2 exists to fix. This reading is what makes the
   * next such run explain itself: if the project chrome collapsed underneath
   * the arrow keys, the row that recorded it says so.
   */
  const projectChrome = () => ({
    chip: document.querySelector('.ptab-chip') !== null,
    topTabs: document.querySelectorAll('.titlebar-tabs .ptab').length,
    rail: document.querySelector('.prail') !== null
  });

  const arrowRun = async () => {
    const seen = [];
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp']) {
      await press(key);
      const el = document.activeElement;
      seen.push({
        key,
        selected: selected(),
        keyboardInDock: inADockList(),
        keyboardInTerminal: inATerminal(),
        active: el === null ? null : el.className || el.tagName,
        // Only when the keyboard has LEFT the list, because that is the only
        // case a later reader has to explain, and the rest would be noise.
        strayed: el === null || el.closest('[data-slot="session-dock"]') !== null
          ? null
          : { html: el.outerHTML.slice(0, 140), chrome: projectChrome() }
      });
    }
    return seen;
  };
  out.arrows.expanded = await arrowRun();
  out.realName = ${JSON.stringify(REAL_NAME)};

  // ---- collapse through the shipped control ------------------------------
  const chevron = document.querySelector(
    '[data-slot="session-dock"] button[aria-label="Collapse session list"]'
  );
  out.collapsedByButton = chevron !== null;
  if (chevron !== null) { chevron.click(); await wait(900); }
  out.railDrawn = document.querySelector('.rail-list') !== null;

  const rail = list();
  if (rail !== null) {
    rail.focus();
    await wait(300);
    const firstRail = rows()[0];
    if (firstRail !== undefined) { firstRail.click(); await wait(900); }
    rail.focus();
    await wait(300);
    out.arrows.collapsed = await arrowRun();
  }

  // ---- the three click shapes, on the collapsed rail ---------------------
  const resetToFirst = async () => {
    const el = rows()[0];
    if (el !== undefined) { el.click(); await wait(900); }
  };
  out.shapes.A = await countPresses(shapeA, 1, resetToFirst);
  out.shapes.B = await countPresses(shapeB, 1, resetToFirst);
  out.shapes.C = await countPresses(shapeC, 1, resetToFirst);

  // Where the keyboard sits after the last click path ran.
  await wait(600);
  out.keyboardAfterClick = {
    inTerminal: inATerminal(),
    inDock: inADockList(),
    active: document.activeElement === null
      ? null
      : document.activeElement.className || document.activeElement.tagName
  };

  out.dotsAfter = dots();

  // ---- the outside photograph, and why it is LAST -------------------------
  //
  // The node half photographs the window from outside while the hold below
  // runs, which is the only way to get a second PNG out of one launch: the
  // harness itself writes exactly one capturePage image, and that one is the
  // collapsed frame at the end.
  //
  // WHY IT SITS HERE RATHER THAN BETWEEN THE TWO ARROW READINGS, which is
  // where Phase 129 first put it. The outside photograph needs the app to be
  // the frontmost process, so the node half raises the window with System
  // Events first. That raise is macOS moving focus, and macOS restores a key
  // view when it does. One run in eight ended with the keyboard leaving
  // .rail-list in the middle of the COLLAPSED arrow reading and the
  // selection stopping, which is the exact defect item 2 exists to fix, so
  // the run could not be told apart from a product failure. Every keyboard
  // reading now finishes before anything outside this window is touched.
  // Nothing raises the window while an arrow key is being pressed.
  //
  // The dock is put back to expanded for the photograph and collapsed again
  // afterwards, both through the shipped buttons, so the last frame the
  // harness captures is still the collapsed rail.
  const back = document.querySelector(
    '[data-slot="session-dock"] button[aria-label="Show session names"]'
  );
  out.reExpandedForShot = back !== null;
  if (back !== null) { back.click(); await wait(900); }
  console.log('[p129] expanded shot');
  await wait(7000);

  const chevronAgain = document.querySelector(
    '[data-slot="session-dock"] button[aria-label="Collapse session list"]'
  );
  if (chevronAgain !== null) { chevronAgain.click(); await wait(900); }
  out.railDrawnForFinalShot = document.querySelector('.rail-list') !== null;
  console.log('[p129] collapsed shot');
  await wait(400);
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
      GMUX_SHOT: collapsedShot,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SHOT_DRIVE: drive,
      GMUX_SHOT_JS: probeJs
    }
  }
);
say(`launched the app, pid ${String(child.pid)} (recorded)`);

/**
 * The pid that owns the window. node_modules/.bin/electron is a Node shim that
 * spawns the Electron binary as its one child, so the window belongs to that
 * child when there is one and to the spawned pid otherwise. It is read so the
 * window can be raised and photographed, and it is never killed.
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

/** What the outside photograph reported. Null until it ran. */
let outsideShot = null;

function takeExpandedShot() {
  const pid = guiPid();
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
    path: expandedShot,
    log: (line) => say(line)
  });
}

const HOLD_MARK = '[p129] expanded shot';
let holdSeen = false;

let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
  if (!holdSeen && text.includes(HOLD_MARK)) {
    holdSeen = true;
    setTimeout(takeExpandedShot, 700);
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

check(
  0,
  'the drive answered with a reading',
  reading !== null,
  reading === null ? 'no [gmux-shot] probe line was printed' : 'read back'
);

if (reading !== null) {
  // ---- the measurement block, printed whatever the verdicts say ----------
  console.log('');
  console.log(`${TAG} MEASUREMENT, the three click shapes on the collapsed rail`);
  for (const name of ['A', 'B', 'C']) {
    const shape = reading.shapes?.[name] ?? null;
    const presses = shape === null ? '-' : String(shape.presses);
    console.log(
      `${TAG}   shape ${name}: ${presses} press(es) before the selection and ` +
        `the drawn leaf both moved` +
        (shape && shape.presses === 0 ? ' (never moved in three)' : '')
    );
  }
  console.log(`${TAG} MEASUREMENT, where the keyboard sits after each arrow`);
  for (const density of ['expanded', 'collapsed']) {
    for (const step of reading.arrows?.[density] ?? []) {
      console.log(
        `${TAG}   ${density} ${step.key}: selected=${String(step.selected)} ` +
          `inDock=${String(step.keyboardInDock)} ` +
          `inTerminal=${String(step.keyboardInTerminal)} ` +
          `active=${String(step.active)}`
      );
      // Printed only when the keyboard left the dock, which is the only case
      // a later reader has to explain. It names the element it went to and
      // what the project chrome was drawing at that moment.
      if (step.strayed) {
        console.log(`${TAG}     strayed to ${step.strayed.html}`);
        console.log(
          `${TAG}     project chrome then: ${JSON.stringify(step.strayed.chrome)}`
        );
      }
    }
  }
  console.log('');

  const labels = reading.rowsAtStart ?? [];
  check(
    1,
    'three session rows were drawn, so the arrows have somewhere to go',
    labels.length === 3,
    `rows: ${JSON.stringify(labels)}`
  );

  const expandedArrows = reading.arrows?.expanded ?? [];
  const collapsedArrows = reading.arrows?.collapsed ?? [];

  const secondThirdSecond = (steps) => {
    if (steps.length !== 3) return false;
    return (
      steps[0].selected === labels[1] &&
      steps[1].selected === labels[2] &&
      steps[2].selected === labels[1]
    );
  };

  check(
    3,
    'expanded, ArrowDown ArrowDown ArrowUp select the second, third and second row',
    secondThirdSecond(expandedArrows),
    JSON.stringify(expandedArrows.map((s) => s.selected))
  );
  check(
    4,
    'expanded, the keyboard stays inside the session dock after every press',
    expandedArrows.length === 3 && expandedArrows.every((s) => s.keyboardInDock),
    JSON.stringify(
      expandedArrows.map((s) => ({ key: s.key, active: s.active }))
    )
  );
  const realName = reading.realName ?? '';
  const landedOnReal = expandedArrows.some(
    (s) => typeof s.selected === 'string' && s.selected.startsWith(realName)
  );
  check(
    5,
    'at least one press landed on the real session and the keyboard stayed put',
    landedOnReal &&
      expandedArrows
        .filter((s) => typeof s.selected === 'string' && s.selected.startsWith(realName))
        .every((s) => s.keyboardInDock),
    `real session name: ${realName}`
  );
  check(
    6,
    'collapsed, the same three presses give the same three answers',
    reading.railDrawn === true && secondThirdSecond(collapsedArrows),
    JSON.stringify(collapsedArrows.map((s) => s.selected))
  );

  const shapes = reading.shapes ?? {};
  for (const name of ['A', 'B', 'C']) {
    const shape = shapes[name] ?? null;
    check(
      7,
      `click shape ${name} switches the session in exactly one press`,
      shape !== null && shape.presses === 1,
      shape === null ? 'not measured' : `presses: ${String(shape.presses)}`
    );
  }

  check(
    8,
    'after the click path the keyboard is in the terminal',
    reading.keyboardAfterClick?.inTerminal === true,
    JSON.stringify(reading.keyboardAfterClick ?? null)
  );

  // The outside photograph is taken last, after every keyboard reading, so
  // the dock is put back to expanded through the shipped button first. If
  // that button was not there, the expanded PNG is not of an expanded dock
  // and the photograph proves nothing, so it is a row rather than a note.
  check(
    8.5,
    'the dock was put back to expanded before the outside photograph',
    reading.reExpandedForShot === true && reading.railDrawnForFinalShot === true,
    `re-expanded: ${String(reading.reExpandedForShot)} / rail back for the final frame: ${String(reading.railDrawnForFinalShot)}`
  );

  const attentionSet = (list) =>
    (list ?? [])
      .filter((row) => row.attention)
      .map((row) => row.label)
      .sort()
      .join(' | ');
  check(
    9,
    'no row gained or lost the needs input state across the run',
    attentionSet(reading.dotsBefore) === attentionSet(reading.dotsAfter),
    `before: ${attentionSet(reading.dotsBefore)} / after: ${attentionSet(reading.dotsAfter)}`
  );
}

const collapsedOk =
  existsSync(collapsedShot) && statSync(collapsedShot).size > 1000;
const expandedOk =
  existsSync(expandedShot) && statSync(expandedShot).size > 1000;
check(
  10,
  'two PNGs were written, one expanded and one collapsed',
  collapsedOk && expandedOk,
  `collapsed: ${collapsedOk ? collapsedShot : 'missing'} / expanded: ${
    expandedOk ? expandedShot : `missing (${JSON.stringify(outsideShot)})`
  }`
);

const operatorAfter = operatorSessionCount();
check(
  11,
  "the operator's session count did not move",
  operatorAfter === operatorBefore,
  `before ${String(operatorBefore)}, after ${String(operatorAfter)}`
);

console.log('');
for (const row of results) {
  console.log(`${TAG} ${row.verdict.padEnd(4)} ${String(row.step)}. ${row.claim}`);
  console.log(`${TAG}      ${row.detail}`);
}

if (!keep) rmSync(root, { recursive: true, force: true });
else say(`kept the scratch directory at ${root}`);

if (failures.length > 0) {
  console.error('');
  for (const line of failures) console.error(`${TAG} FAIL ${line}`);
  process.exit(1);
}
say('every row passed');
process.exit(0);
