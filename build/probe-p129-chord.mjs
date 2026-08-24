#!/usr/bin/env node
/**
 * probe-p129-chord.mjs. Phase 129 item 4, live.
 *
 * WHAT IT PROVES. Two claims, in five launches of the real app.
 *
 *   Shift+Cmd+Enter fills the window from whichever region the keyboard is
 *   in, puts the layout back to the pixel, draws the app chrome around a
 *   filled file, refuses out loud when the window cannot seat the split, and
 *   does nothing at all when the keyboard is in neither region.
 *
 *   The View menu row that carries that accelerator does the same thing when
 *   it is chosen with the mouse. This is the fifth launch, and it was added
 *   in the fix round because the first build left the row labelled "Focus the
 *   Session" and calling session focus while the keys beside it filled a
 *   file.
 *
 * HOW IT DRIVES. Every reading presses the SHIPPED chord. The key is a real
 * KeyboardEvent dispatched on the focused element with `bubbles: true`, so
 * App.tsx's capture phase window listener is what handles it, exactly as it
 * handles a person's keystroke. No renderer side driver module was added for
 * this phase, which is deliberate: a driver that calls the store proves the
 * store works, and this has to prove the CHORD works.
 *
 * WHAT IT DOES NOT PROVE, said plainly.
 *
 *  - The "no file is open" sentence is not reachable from a live window.
 *    EditorPanel returns null when the panel is closed or has no tabs, so
 *    `.ed-panel` is not in the document at all and the keyboard cannot be
 *    inside it. The guard stays in fill-chord.ts as the honest answer if that
 *    render gate ever changes, and it is covered by
 *    src/renderer/app/__tests__/p129-fill-chord.test.ts.
 *  - Reduced motion is not exercised here. build/probe-session-focus.mjs
 *    already covers the flight itself, and this phase changed no line of it.
 *
 * SAFETY, ABSOLUTE. The probe runs on the socket build/harness-socket.mjs
 * gave it, which that script refuses to let be `gmux` or `default`. Its own
 * user data directory, its own scratch project. It names `-L gmux` in exactly
 * one place, a read only session count taken before and after, which must
 * match. No pkill, no kill-server, and only the pids it spawned are killed.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p129-chord \
 *     'node build/probe-p129-chord.mjs'
 *
 * Add --keep to leave the scratch root and the five PNGs in place.
 *
 * Exit code 0 when every reading passes. 1 when one does not, with each
 * failing row named. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p129chord]';
const keep = process.argv.includes('--keep');

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p129-chord 'node " +
      "build/probe-p129-chord.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

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
// The scratch project
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p129-chord');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
writeFileSync(
  join(project, 'README.md'),
  ['# Phase 129', '', 'One chord, two regions.', ''].join('\n'),
  'utf8'
);

// ---------------------------------------------------------------------------
// The expressions the driven window evaluates
//
// Each one is a single async expression. GMUX_SHOT_JS awaits it and prints
// its value as JSON, so everything the reading needs must come back in the
// object it resolves to.
// ---------------------------------------------------------------------------

/** Helpers every expression opens with. */
const PRELUDE = `
const q = (s) => document.querySelector(s);
const box = (el) => { if (el === null) return null; const r = el.getBoundingClientRect();
  return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const press = () => { const el = document.activeElement ?? document.body;
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', shiftKey: true, metaKey: true, bubbles: true, cancelable: true })); };
const where = () => { const a = document.activeElement; if (a === null) return 'nothing';
  if (a.closest('.ed-panel') !== null) return 'editor';
  if (a.closest('.gmux-terminal-mount, [data-slot="session-strip"], [data-slot="session-dock"]') !== null) return 'session';
  return 'elsewhere'; };
const pointerInto = (el) => { const r = el.getBoundingClientRect();
  const init = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1,
    clientX: r.left + Math.min(24, r.width / 2), clientY: r.top + Math.min(12, r.height / 2),
    pointerId: 1, pointerType: 'mouse', isPrimary: true };
  const up = { ...init, buttons: 0 };
  el.dispatchEvent(new PointerEvent('pointerdown', init));
  el.dispatchEvent(new MouseEvent('mousedown', init));
  el.dispatchEvent(new PointerEvent('pointerup', up));
  el.dispatchEvent(new MouseEvent('mouseup', up));
  el.dispatchEvent(new MouseEvent('click', up)); };
const focusEditor = async () => {
  // Monaco first, because that is where a person's pointer lands when the
  // work row is wide enough to draw it. Monaco focuses its own hidden
  // textarea from its mousedown handler, so the pointer sequence is what
  // moves the keyboard there.
  const lines = q('.ed-panel .monaco-editor .view-lines');
  if (lines !== null) { pointerInto(lines); await wait(120); if (where() === 'editor') return 'editor'; }
  // The narrow work row draws the Pierre viewer instead, and it has no
  // textarea to focus. The editor's own tab is focusable (role="tab",
  // tabIndex 0, EditorTabs.tsx:118), it is inside .ed-panel, and a person
  // reaches it by tabbing, so the keyboard being on it IS the keyboard being
  // in the editor by the product's own rule in fill-chord.ts. A synthetic
  // mousedown does not move focus in Chromium the way a trusted one does, so
  // the pointer sequence is followed by the focus call rather than trusted to
  // imply it.
  for (const sel of ['.ed-panel .ed-tab', '.ed-panel textarea',
                     '.ed-panel [tabindex]:not([tabindex="-1"])',
                     '.ed-panel button:not([disabled])']) {
    const t = q(sel);
    if (t === null) continue;
    pointerInto(t);
    if (typeof t.focus === 'function') t.focus();
    await wait(60);
    if (where() === 'editor') return 'editor';
  }
  return where(); };
const focusTerm = () => { const t = q('.gmux-terminal-mount textarea'); if (t !== null) t.focus(); return where(); };
const toasts = () => [...document.querySelectorAll('.toast-text')].map((n) => n.textContent);
const layout = () => ({ panel: box(q('.ed-panel')), sidebar: box(q('[data-slot="sidebar"]')),
  titlebar: box(q('.titlebar')), workRow: box(q('.work-row')), shell: q('.shell')?.className ?? null,
  filled: q('.ed-panel.ed-fill') !== null });
`;

/** Launch 1 and 2: fill from the open file, then put it back. */
const EDITOR_JS = `(async () => {
${PRELUDE}
  const before = layout();
  const at = await focusEditor();
  press();
  await wait(900);
  const during = layout();
  const at2 = await focusEditor();
  press();
  await wait(900);
  const after = layout();
  return { at, at2, before, during, after, toasts: toasts() };
})()`;

/** Launch 3: fill from the session, then put it back. */
const SESSION_JS = `(async () => {
${PRELUDE}
  const at = focusTerm();
  const before = layout();
  press();
  await wait(1200);
  const during = layout();
  const at2 = focusTerm();
  press();
  await wait(1200);
  const after = layout();
  return { at, at2, before, during, after, toasts: toasts() };
})()`;

/** Launch 4: the keyboard in neither region, and the narrow window refusal. */
const ELSEWHERE_JS = `(async () => {
${PRELUDE}
  const btn = q('.activitybar-settings') ?? q('.ab-item');
  if (btn !== null && typeof btn.focus === 'function') btn.focus();
  const at = where();
  const before = layout();
  press();
  await wait(900);
  const after = layout();
  const quiet = toasts();
  const at2 = await focusEditor();
  press();
  await wait(600);
  return { at, at2, before, after, quiet, toasts: toasts(), overlay: q('.ed-panel.ed-overlay') !== null };
})()`;

/**
 * Launch 5: the View menu's own row, chosen with a real mouse click.
 *
 * WHY THIS LAUNCH EXISTS. The row carries this chord's accelerator, so the row
 * and the keys printed on it have to do the same thing. Phase 129's first
 * build left the row labelled "Focus the Session" and calling
 * toggleSessionFocus, which meant a person reading a file who PRESSED the keys
 * filled the file and the same person who CHOSE the row got session focus.
 * The label and the routing both moved in the fix round, and this launch is
 * what proves the moved routing runs in the shipped app rather than only in a
 * unit test.
 *
 * THE HANDSHAKE, and why it is built this way. Clicking a native menu item
 * needs the app to be the frontmost process, and macOS moves focus when it
 * raises a window. If the raise landed after the keyboard was put in the
 * editor, the click could arrive from a region the router correctly ignores
 * and the reading would be meaningless. So the window is raised FIRST, this
 * expression waits until document.hasFocus() is true, THEN it puts the
 * keyboard in the editor, and only then does it ask for the click. The
 * renderer cannot hear node, but node reads every line the renderer prints,
 * so each step is a printed mark.
 */
const MENU_JS = `(async () => {
${PRELUDE}
  const awaitFocus = async () => {
    for (let i = 0; i < 80; i++) { if (document.hasFocus()) return true; await wait(200); }
    return document.hasFocus();
  };
  const before = layout();
  console.log('[p129] raise me');
  const raised = await awaitFocus();
  await wait(700);
  const at = await focusEditor();
  console.log('[p129] click the row');
  await wait(9000);
  const during = layout();
  const at2 = await focusEditor();
  console.log('[p129] click the row again');
  await wait(9000);
  const after = layout();
  return { raised, at, at2, before, during, after, toasts: toasts() };
})()`;

// ---------------------------------------------------------------------------
// The launches
// ---------------------------------------------------------------------------

const failures = [];

function shotPath(name) {
  return join(scratch, `p129-chord-${name}.png`);
}

async function launch(name, drive, probeJs, onMark = null) {
  const out = shotPath(name);
  rmSync(out, { force: true });
  say(`launch ${name}`);
  return withElectron(
    {
      label: `p129-chord ${name}`,
      userDataDir: join(root, `profile-${name}`),
      cwd: repoRoot,
      env: {
        ...process.env,
        GMUX_SHOT: out,
        GMUX_SHOT_VERBOSE: '1',
        GMUX_SHOT_DELAY_MS: '9000',
        GMUX_SHOT_DRIVE: JSON.stringify(drive),
        GMUX_SHOT_JS: probeJs
      }
    },
    async (handle) => {
    const child = handle.child;
    let text = '';
    const onText = (chunk) => {
      process.stdout.write(chunk);
      text += chunk;
      if (onMark !== null) onMark(text, child);
    };
    child.stdout.on('data', (b) => {
      onText(b.toString());
    });
    child.stderr.on('data', (b) => {
      onText(b.toString());
    });
    const code = await new Promise((r) => {
      const watchdog = setTimeout(() => {
        console.error(`${TAG} ${name} passed its ceiling. Ending the pid I started.`);
        child.kill('SIGTERM');
      }, 180_000);
      child.on('error', (err) => {
        clearTimeout(watchdog);
        console.error(`${TAG} electron could not start: ${err.message}`);
        r(1);
      });
      child.on('exit', (c) => {
        clearTimeout(watchdog);
        setTimeout(() => {
          r(c ?? 1);
        }, 750);
      });
    });
    child.stdout.destroy();
    child.stderr.destroy();

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
    if (report === null) {
      failures.push(`${name}: the driven window printed no probe value (electron exited ${String(code)})`);
    }
    if (!existsSync(out)) failures.push(`${name}: no screenshot was written to ${out}`);
    else say(`${name}: screenshot ${out}`);
    return report;
  });
}

const sameBox = (a, b) =>
  a === null && b === null
    ? true
    : a !== null &&
      b !== null &&
      a.left === b.left &&
      a.top === b.top &&
      a.width === b.width &&
      a.height === b.height;

function need(condition, why) {
  if (!condition) failures.push(why);
}

// -- 1 and 2, the editor ----------------------------------------------------

const editor = await launch(
  'editor',
  { projectPath: project, openRel: 'README.md' },
  EDITOR_JS
);
if (editor !== null) {
  console.log('');
  say('the editor reading');
  console.log(`  keyboard before press 1   ${String(editor.at)}`);
  console.log(`  keyboard before press 2   ${String(editor.at2)}`);
  for (const [label, state] of [
    ['before', editor.before],
    ['filled', editor.during],
    ['after ', editor.after]
  ]) {
    console.log(
      `  ${label}  panel=${JSON.stringify(state.panel)} sidebar=${JSON.stringify(state.sidebar)} ` +
        `titlebar=${JSON.stringify(state.titlebar)} filled=${String(state.filled)}`
    );
  }
  need(editor.at === 'editor', 'editor: the keyboard was not in the panel before the first press');
  need(editor.at2 === 'editor', 'editor: the keyboard was not in the panel before the second press');
  need(editor.during.filled === true, 'editor: the chord did not fill the window from the open file');
  need(
    sameBox(editor.during.panel, editor.during.workRow),
    'editor: the filled panel does not match the work row it fills'
  );
  need(
    editor.during.titlebar !== null && editor.during.titlebar.height > 0,
    'editor: the titlebar is gone while filled. Fill is inside the app chrome, not a full screen'
  );
  need(editor.during.sidebar === null, 'editor: the sidebar is still drawn while filled');
  need(editor.after.filled === false, 'editor: the second press did not leave the fill');
  need(
    sameBox(editor.after.panel, editor.before.panel),
    `editor: the panel came back at ${JSON.stringify(editor.after.panel)}, not ${JSON.stringify(editor.before.panel)}`
  );
  need(
    sameBox(editor.after.sidebar, editor.before.sidebar),
    `editor: the sidebar came back at ${JSON.stringify(editor.after.sidebar)}, not ${JSON.stringify(editor.before.sidebar)}`
  );
  need(
    (editor.toasts ?? []).length === 0 ||
      (editor.toasts ?? []).every((t) => !String(t).includes('too narrow')),
    `editor: the chord refused instead of filling — ${JSON.stringify(editor.toasts)}`
  );
}

// -- 3, the session ---------------------------------------------------------

const session = await launch(
  'session',
  { projectPath: project, session: { agent: 'shell', name: 'p129-chord' } },
  SESSION_JS
);
if (session !== null) {
  console.log('');
  say('the session reading');
  console.log(`  keyboard before press 1   ${String(session.at)}`);
  console.log(`  shell while focused       ${String(session.during.shell)}`);
  console.log(`  shell after leaving       ${String(session.after.shell)}`);
  need(session.at === 'session', 'session: the keyboard was not in the terminal before the first press');
  need(
    String(session.during.shell).includes('session-focus'),
    'session: the chord did not put the shell into session focus'
  );
  need(
    !String(session.after.shell).includes('session-focus'),
    'session: the second press did not leave session focus'
  );
  need(session.during.filled === false, 'session: the chord filled the editor from a session');
}

// -- 4, neither region, and the refusal that speaks --------------------------

const elsewhere = await launch(
  'elsewhere',
  { projectPath: project, openRel: 'README.md', orientation: 'right', sidebarWidth: 900 },
  ELSEWHERE_JS
);
if (elsewhere !== null) {
  console.log('');
  say('the elsewhere reading');
  console.log(`  keyboard at press 1       ${String(elsewhere.at)}`);
  console.log(`  toasts after press 1      ${JSON.stringify(elsewhere.quiet)}`);
  console.log(`  editor is an overlay      ${String(elsewhere.overlay)}`);
  console.log(`  keyboard at press 2       ${String(elsewhere.at2)}`);
  console.log(`  toasts after press 2      ${JSON.stringify(elsewhere.toasts)}`);
  need(elsewhere.at === 'elsewhere', 'elsewhere: the keyboard was not outside both regions');
  need(
    sameBox(elsewhere.after.panel, elsewhere.before.panel) &&
      sameBox(elsewhere.after.sidebar, elsewhere.before.sidebar),
    'elsewhere: the chord moved the layout from a region it has no meaning in'
  );
  need(
    !String(elsewhere.after.shell).includes('session-focus') && elsewhere.after.filled === false,
    'elsewhere: the chord entered a fill from a region it has no meaning in'
  );
  need(
    (elsewhere.quiet ?? []).length === 0,
    `elsewhere: the chord said something from a region it has no meaning in — ${JSON.stringify(elsewhere.quiet)}`
  );
  // The second press is the narrow work area. A 900 px sidebar beside a right
  // hand dock leaves a work row that cannot seat the editor's 320 and the
  // terminal's 240, so editorIsOverlay is true and the chord must SAY so.
  if (elsewhere.overlay === true) {
    need(
      elsewhere.at2 === 'editor',
      `elsewhere: the keyboard was not in the panel before the narrow press, it was ${String(elsewhere.at2)}`
    );
    need(
      (elsewhere.toasts ?? []).some((t) =>
        String(t).startsWith('The window is too narrow to fill from a file.')
      ),
      `elsewhere: the narrow window refusal said nothing — ${JSON.stringify(elsewhere.toasts)}`
    );
  } else {
    say('the work row was wide enough to split, so the narrow refusal was not reached in this run');
  }
}

// -- 5, the View menu's own row ---------------------------------------------

/** The row the fix round renamed. It is read from one place so it cannot drift. */
const MENU_ROW = 'Focus the Session or File';

/**
 * The unix pid that owns the window. node_modules/.bin/electron is a Node shim
 * whose one child is the real binary, so the window belongs to that child when
 * there is one. It is read so the window can be raised and the row clicked,
 * and it is never signalled.
 */
function guiPidOf(child) {
  const out = spawnSync('pgrep', ['-P', String(child.pid)], { encoding: 'utf8' });
  const first = (out.stdout ?? '')
    .split('\n')
    .map((line) => Number(line.trim()))
    .find((n) => Number.isInteger(n) && n > 0);
  return first ?? child.pid;
}

function raiseWindow(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events" to set frontmost of (first process whose unix id is ${String(pid)}) to true`
    ],
    { encoding: 'utf8', timeout: 15_000 }
  );
  if (r.status !== 0) say(`raise failed: ${String(r.stderr ?? '').trim()}`);
  return r.status === 0;
}

/** Clicks View > Focus the Session or File through the accessibility interface. */
function clickTheRow(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  tell (first process whose unix id is ${String(pid)})
    set frontmost to true
    click menu item ${JSON.stringify(MENU_ROW)} of menu "View" of menu bar item "View" of menu bar 1
  end tell
end tell`
    ],
    { encoding: 'utf8', timeout: 20_000 }
  );
  const err = String(r.stderr ?? '').trim();
  if (r.status !== 0) say(`the menu click failed: ${err}`);
  return { ok: r.status === 0, err };
}

const menuClicks = [];
let menuSeen = 0;

const menu = await launch(
  'menu',
  { projectPath: project, openRel: 'README.md' },
  MENU_JS,
  (soFar, child) => {
    const pid = guiPidOf(child);
    if (menuSeen === 0 && soFar.includes('[p129] raise me')) {
      menuSeen = 1;
      setTimeout(() => raiseWindow(pid), 600);
      return;
    }
    if (menuSeen === 1 && soFar.includes('[p129] click the row again')) {
      // The second mark can arrive in the same chunk as the first when the
      // renderer is fast, so the ordinary case below is checked first.
      menuSeen = 3;
      setTimeout(() => menuClicks.push(clickTheRow(pid)), 800);
      return;
    }
    if (menuSeen === 1 && soFar.includes('[p129] click the row')) {
      menuSeen = 2;
      setTimeout(() => menuClicks.push(clickTheRow(pid)), 800);
      return;
    }
    if (menuSeen === 2 && soFar.includes('[p129] click the row again')) {
      menuSeen = 3;
      setTimeout(() => menuClicks.push(clickTheRow(pid)), 800);
    }
  }
);

if (menu !== null) {
  console.log('');
  say('the View menu row reading');
  console.log(`  the window took the keyboard  ${String(menu.raised)}`);
  console.log(`  keyboard before click 1       ${String(menu.at)}`);
  console.log(`  keyboard before click 2       ${String(menu.at2)}`);
  console.log(`  clicks that reached the row   ${JSON.stringify(menuClicks)}`);
  for (const [label, state] of [
    ['before', menu.before],
    ['filled', menu.during],
    ['after ', menu.after]
  ]) {
    console.log(`  ${label}  panel=${JSON.stringify(state.panel)} filled=${String(state.filled)}`);
  }
  need(
    menuClicks.length === 2 && menuClicks.every((c) => c.ok),
    `menu: the row named ${JSON.stringify(MENU_ROW)} could not be clicked twice — ${JSON.stringify(menuClicks)}`
  );
  need(menu.at === 'editor', 'menu: the keyboard was not in the panel before the row was chosen');
  need(
    menu.during.filled === true,
    'menu: choosing the row did not fill the window from the open file, so the row and the keys printed on it disagree'
  );
  need(menu.after.filled === false, 'menu: choosing the row again did not leave the fill');
  need(
    sameBox(menu.after.panel, menu.before.panel),
    `menu: the panel came back at ${JSON.stringify(menu.after.panel)}, not ${JSON.stringify(menu.before.panel)}`
  );
  need(
    (menu.toasts ?? []).every((t) => !String(t).includes('too narrow')),
    `menu: the row refused instead of filling — ${JSON.stringify(menu.toasts)}`
  );
}

// ---------------------------------------------------------------------------

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's server went from ${String(operatorBefore)} sessions to ` +
      `${String(operatorAfter)}. This probe must never touch it`
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
say('every reading passed. The chord fills from both regions, puts the layout back, and does nothing elsewhere.');
say('The View menu row that carries the chord does the same thing when it is clicked.');
