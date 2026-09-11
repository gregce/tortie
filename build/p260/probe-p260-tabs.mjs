#!/usr/bin/env node
/**
 * probe-p260-tabs.mjs. THE PHASE 260 APP RUN: editor tabs follow the project
 * (issue 19, research 119).
 *
 * ONE Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket, over THREE git projects it builds inside its own scratch directory.
 * It spawns no agent, spends no token, opens no keychain and makes no request.
 * The one session it creates is a plain shell, and the "agent" that prints a
 * path into it is that shell running `cat` over a file this script wrote.
 *
 * ## What it proves, and why it has to be a run
 *
 * Research 119 §2 is the reporter's own caveat: hidden is NOT closed. A tab
 * that is merely hidden keeps its Monaco undo, its view state, its rewind
 * journal and its shadow baseline, and a closed one loses all four. Nothing
 * short of driving the real editor across a real switch reads those four
 * things, so the arms are the four losses read one at a time:
 *
 *   A. THE FIRST PROJECT'S STATE. In `alpha`: a clean tab, a tab typed into
 *      and not saved (the dirty dot), and a redline with one change REWOUND
 *      (a rewind journal, and a baseline generation read off the face).
 *   B. THE SWITCH HIDES. Switch to `bravo`: the strip draws no tab and the
 *      panel is closed. At the parent commit alpha's three tabs are drawn
 *      under bravo.
 *   C. THE CAP IS PER PROJECT (research 119 §3, the trap). Ten files opened
 *      for keeps in bravo, then an ELEVENTH: bravo's strip holds ten. At the
 *      parent the global cap evicts alpha's hidden tabs first — the clean one
 *      and the rewound one, journal and all — which is read in arm D.
 *   D. THE SWITCH BACK. Every one of alpha's tabs is there, the one that was
 *      active is active, the dirty dot is still on, the baseline generation
 *      is unchanged, ⌥⇧⌫ UNDOES THE REWIND (the journal survived) and ⌘Z
 *      UNDOES THE TYPING (the Monaco model survived).
 *   E. A PATH IN ALPHA'S TERMINAL NAMING A FILE IN BRAVO opens under bravo
 *      (research 119 §5.1's first clause): the app shows bravo with the file
 *      on its strip, and alpha's strip never carries it.
 *   F. CLOSING ALPHA WITH ITS DIRTY TAB asks (research 119 §5.2): the close
 *      is confirmed, THEN the editor's own Save / Don't Save / Cancel prompt
 *      is read off the DOM, and Cancel keeps the project and every tab. At the
 *      parent the project closes with no second question.
 *   G. MEMORY at ten tabs in each of three projects, read against the Phase
 *      167 plateau rule over blocks of switching: the renderer heap after
 *      collection must not climb on every block, and DOM nodes and listeners
 *      must not grow past a budget. Printed and judged, because thirty resident
 *      Monaco models is the cost research 119 §3 named and did not measure.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` block whatever happened. The socket is handed in
 * by build/harness-socket.mjs, which names it `gmux-p260-<slug>-<pid>`, ends
 * the server afterwards and unlinks its socket and marker; `gmux` and
 * `default` are refused by name. Every other process this script starts is a
 * synchronous `git`, `tmux` or `/bin/sh` that has exited before the call
 * returns. The operator's own `-L gmux` sessions are counted before and after
 * and must not move. EVERY BYTE THIS RUN WRITES is under `GMUX_HARNESS_DIR`.
 * `--self-test` proves the grader on fixtures and launches nothing.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p260]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader, proved on fixtures under --self-test.
// ---------------------------------------------------------------------------

/** Every [label, got, want] that disagrees, by value. */
export function grade(rows) {
  return rows
    .filter(([, got, want]) => JSON.stringify(got) !== JSON.stringify(want))
    .map(([l, got, want]) => `${l}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

/**
 * The Save / Don't Save / Cancel prompt, as ConfirmDialog.tsx draws it for a
 * dirty tab (store.ts promptDirtyClose): the title names the file, the
 * confirm is Save, the alt is Don't Save, and nothing is painted destructive.
 */
export function promptFindings(dlg, name) {
  if (dlg === null || dlg.open !== true) return ['no prompt is on screen'];
  return grade([
    ['the prompt names the file', dlg.title, `Save changes to '${name}'?`],
    ['the prompt offers all three answers', dlg.buttons, ["Don't Save", 'Cancel', 'Save']],
    ['the default is Save', dlg.focused, 'Save'],
    ['nothing is painted destructive', dlg.destructive, false]
  ]);
}

/**
 * The Phase 167 plateau rule over blocks of switching, judged on EVERY
 * block-to-block pair rather than the last one (Phase 200's correction):
 * heap after collection must not climb on every pair, and nodes and listeners
 * must not grow past the budget across the run.
 */
export function plateauFindings(blocks, budgets) {
  const out = [];
  if (blocks.length < 3) return ['fewer than three blocks were read, so no plateau can be judged'];
  const heapDeltas = blocks.slice(1).map((b, i) => b.heapMb - blocks[i].heapMb);
  if (heapDeltas.every((d) => d > 0.25)) {
    out.push(
      `the renderer heap climbed on every block (${heapDeltas.map((d) => d.toFixed(2)).join(', ')} MB), which is a slope and not a plateau`
    );
  }
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  if (last.nodes - first.nodes > budgets.nodes) {
    out.push(`DOM nodes grew by ${String(last.nodes - first.nodes)} across the run, over the budget of ${String(budgets.nodes)}`);
  }
  if (last.listeners - first.listeners > budgets.listeners) {
    out.push(`event listeners grew by ${String(last.listeners - first.listeners)} across the run, over the budget of ${String(budgets.listeners)}`);
  }
  return out;
}

function selfTest() {
  const dlg = (over = {}) => ({
    open: true,
    title: "Save changes to 'notes.txt'?",
    buttons: ["Don't Save", 'Cancel', 'Save'],
    focused: 'Save',
    destructive: false,
    ...over
  });
  const b = (heapMb, nodes, listeners) => ({ heapMb, nodes, listeners });
  const fixtures = [
    ['grade: agreement is silent', () => grade([['a', [1, 'x'], [1, 'x']]]).length, 0],
    ['grade: a difference is one finding', () => grade([['a', 1, 2]]).length, 1],
    ['grade: array order matters', () => grade([['a', ['p', 'q'], ['q', 'p']]]).length, 1],
    ['prompt: the shipped prompt passes', () => promptFindings(dlg(), 'notes.txt').length, 0],
    ['prompt: no dialog is one finding', () => promptFindings({ open: false }, 'notes.txt').length, 1],
    ['prompt: a project close dialog is not the save prompt', () => promptFindings(dlg({ title: "Close 'alpha'?", buttons: ['Cancel', 'Close project'], focused: 'Close project' }), 'notes.txt').length, 3],
    ['prompt: the wrong default is one finding', () => promptFindings(dlg({ focused: "Don't Save" }), 'notes.txt').length, 1],
    ['plateau: a flat run passes', () => plateauFindings([b(80, 2400, 380), b(80.4, 2410, 381), b(80.1, 2405, 380), b(80.3, 2408, 381)], { nodes: 200, listeners: 50 }).length, 0],
    ['plateau: a heap that climbs every block is a slope', () => plateauFindings([b(80, 2400, 380), b(83, 2400, 380), b(86, 2400, 380), b(89, 2400, 380)], { nodes: 200, listeners: 50 }).length, 1],
    ['plateau: one climb then flat is a plateau', () => plateauFindings([b(80, 2400, 380), b(86, 2400, 380), b(86.1, 2400, 380), b(86, 2400, 380)], { nodes: 200, listeners: 50 }).length, 0],
    ['plateau: nodes over budget is one finding', () => plateauFindings([b(80, 2400, 380), b(80, 2500, 380), b(80, 2700, 380)], { nodes: 200, listeners: 50 }).length, 1],
    ['plateau: listeners over budget is one finding', () => plateauFindings([b(80, 2400, 380), b(80, 2400, 400), b(80, 2400, 440)], { nodes: 200, listeners: 50 }).length, 1],
    ['plateau: two blocks cannot be judged', () => plateauFindings([b(80, 2400, 380), b(80, 2400, 380)], { nodes: 200, listeners: 50 }).length, 1]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The socket wrapper, and the refusals.
// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p260', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') {
  console.error(`${TAG} no GMUX_HARNESS_DIR`);
  process.exit(2);
}
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

// ---------------------------------------------------------------------------
// The scratch world: three git projects.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p260'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p260'));
const home = join(root, 'h');
const profile = join(root, 'p');
const NAMES = ['alpha', 'bravo', 'charlie'];
const dirs = Object.fromEntries(NAMES.map((n) => [n, join(root, n)]));
for (const d of [home, profile, ...Object.values(dirs)]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** A plain shell writes the file from outside, which is what an agent's write is. */
const shellWrite = (path, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', path], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};
const disk = (path) => readFileSync(path, 'utf8');

const para = (n, w) =>
  `Paragraph ${n} of the walk, ${w}, keeps going for a while so that the document has a body worth reading and a sentence that can change.`;
const WALK_V1 = ['The application is a disposable client that gets out of the way.', '', para(1, 'first'), '', para(2, 'second'), ''].join('\n');
const WALK_V2 = WALK_V1.replace('disposable client', 'throwaway viewer').replace('second', 'rewritten by an agent');
const NOTES_V1 = 'The notes begin here.\n\nA second line of notes.\n';
const TYPED = 'PERSON ';
/** Ten files per project, named so no two projects share a tab name. */
const others = (n) => Array.from({ length: 11 }, (_, i) => `${n[0]}-other${String(i)}.md`);

for (const n of NAMES) {
  const d = dirs[n];
  writeFileSync(join(d, 'notes.txt'), NOTES_V1);
  writeFileSync(join(d, 'walk.txt'), WALK_V1);
  for (const rel of others(n)) writeFileSync(join(d, rel), `# ${rel}\n\nA paragraph in ${n}.\n`);
  writeFileSync(join(d, `${n[0]}-target.md`), `# a file in ${n}\n`);
  git(d, 'init', '-q', '-b', 'main');
  git(d, 'config', 'user.email', 'p260@example.invalid');
  git(d, 'config', 'user.name', 'p260');
  git(d, 'add', '.');
  git(d, 'commit', '-q', '-m', 'first');
}
const TARGET_IN_BRAVO = join(dirs.bravo, 'b-target.md');

// ---------------------------------------------------------------------------
// Readers, all off the LIVE DOM.
// ---------------------------------------------------------------------------
/** The editor strip: names in order, the active one, and which wear the dot. */
const STRIP = `(() => {
  const tabs = Array.from(document.querySelectorAll('.ed-tab'));
  return {
    names: tabs.map((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim()),
    active: (document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? '').trim() || null,
    dirty: tabs.filter((t) => t.querySelector('.ed-tab-close.dirty') !== null).map((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim()),
    panel: document.querySelector('.ed-tabs-list') !== null && document.querySelector('.ed-body') !== null
  };
})()`;
/** The project tabs: id, name and which is current, from either rail or titlebar. */
const PROJECTS = `(() => Array.from(document.querySelectorAll('[data-project-id]')).map((el) => ({
  id: el.getAttribute('data-project-id'),
  name: (el.querySelector('.prail-name, .ptab-name')?.textContent ?? '').trim(),
  current: el.querySelector('button[aria-current="true"]') !== null
})))()`;
const DIALOG = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return { open: false };
  const buttons = Array.from(modal.querySelectorAll('.modal-actions button'));
  return {
    open: true,
    title: modal.querySelector('.modal-title')?.textContent ?? null,
    body: modal.querySelector('.modal-body')?.textContent ?? null,
    buttons: buttons.map((b) => (b.textContent ?? '').trim()),
    focused: (document.activeElement && document.activeElement.textContent || '').trim(),
    destructive: buttons.some((b) => b.classList.contains('btn-destructive'))
  };
})()`;
const REDLINE = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const a = document.activeElement;
  return {
    mounted: doc !== null,
    changes: doc === null ? 0 : doc.querySelectorAll('.ed-redline-change').length,
    generation: doc === null ? null : (doc.querySelector('.ed-redline-change')?.getAttribute('data-change-gen') ?? null),
    active: a && a.classList && a.classList.contains('.ed-redline-change'.slice(1)) ? { ins: a.dataset.changeIns ?? '', del: a.dataset.changeDel ?? '' } : null,
    undoNote: document.querySelector('.ed-redline-view .ed-redline-undo .banner-text')?.textContent ?? null,
    skeleton: document.querySelector('.ed-redline-view .ed-skeleton') !== null
  };
})()`;
const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
const clickTab = (name) =>
  `(() => { const t = Array.from(document.querySelectorAll('.ed-tab')).find((e) => (e.querySelector('.ed-tab-name')?.textContent ?? '').trim() === ${JSON.stringify(name)}); if (!t) return false; t.click(); return true; })()`;
const clickProject = (id) =>
  `(() => { const b = document.querySelector('[data-project-id=${JSON.stringify(id)}] button.prail-open, [data-project-id=${JSON.stringify(id)}] button.ptab'); if (!b) return false; b.click(); return true; })()`;
const clickProjectClose = (id) =>
  `(() => { const b = document.querySelector('[data-project-id=${JSON.stringify(id)}] .prail-close, [data-project-id=${JSON.stringify(id)}] .ptab-close'); if (!b) return false; b.click(); return true; })()`;
const clickDialogButton = (label) =>
  `(() => { const b = Array.from(document.querySelectorAll('.modal[role="alertdialog"] .modal-actions button')).find((x) => (x.textContent ?? '').trim() === ${JSON.stringify(label)}); if (!b) return false; b.click(); return true; })()`;
const focusScroller = `(() => { const s = document.querySelector('.ed-redline-scroll'); if (!s) return false; s.focus(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null`;
const noDialog = `document.querySelector('.modal[role="alertdialog"]') === null`;
const SCREEN = `(() => {
  const screen = document.querySelector('.gmux-terminal-pane .xterm-screen');
  if (!screen) return null;
  const r = screen.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
})()`;
const ON_LINK = `document.querySelector('.xterm-cursor-pointer') !== null`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, {
            collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown']
          });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    let v = null;
    try {
      v = await cdpEval(cdp, expr, 10000);
    } catch {
      v = null;
    }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(100);
  }
};
const untilDisk = async (path, pred, ms) => {
  const s = Date.now();
  for (;;) {
    let d = '';
    try {
      d = disk(path);
    } catch {
      d = '';
    }
    if (pred(d)) return true;
    if (Date.now() - s > ms) return false;
    await sleep(100);
  }
};
const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 180000);
const read = (cdp, expr) => cdpEval(cdp, expr, 20000);

// CDP modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8.
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', {
    type: text ? 'keyDown' : 'rawKeyDown',
    ...base,
    ...(text ? { text, unmodifiedText: text } : {})
  });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(120);
}
const ALT_DOWN = { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 };
const ALT_BS = { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 };
const ALT_SHIFT_BS = { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 9 };
const CMD_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 4 };
const CMD_Z = { key: 'z', code: 'KeyZ', vk: 90, modifiers: 4 };
const CMD_E = { key: 'e', code: 'KeyE', vk: 69, modifiers: 4 };
const ESCAPE = { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 };
const typeInto = async (cdp, word) => {
  for (const ch of word) {
    await press(cdp, {
      key: ch,
      code: ch === ' ' ? 'Space' : `Key${ch.toUpperCase()}`,
      vk: ch === ' ' ? 32 : ch.toUpperCase().charCodeAt(0),
      modifiers: 0,
      text: ch
    });
  }
};
async function clickAt(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(200);
}
async function clickFirstLine(cdp) {
  const box = await read(
    cdp,
    `(() => { const l = document.querySelector('.monaco-editor .view-line'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + 3, y: r.top + r.height / 2 }; })()`
  );
  if (box === null) return false;
  await clickAt(cdp, box.x, box.y);
  return true;
}

/** Move focus to the change wrapper whose text carries `needle`, by ⌥↓. */
async function focusChangeWith(cdp, needle) {
  await read(cdp, focusScroller);
  await sleep(150);
  for (let i = 0; i < 12; i += 1) {
    await press(cdp, ALT_DOWN);
    const r = await read(cdp, REDLINE);
    if (r.active && (r.active.ins.includes(needle) || r.active.del.includes(needle))) return r.active;
  }
  return null;
}

/** Switch to a project through its own tab, the way a person does. */
async function switchTo(cdp, id) {
  const clicked = await read(cdp, clickProject(id));
  if (clicked !== true) return false;
  const ok = await until(cdp, `(${PROJECTS}).some((p) => p.id === ${JSON.stringify(id)} && p.current)`, 8000);
  await sleep(600);
  return ok;
}

/** Renderer memory after two collections, Phase 167's own reading. */
async function readRenderer(cdp) {
  await cdp.call('HeapProfiler.collectGarbage');
  await sleep(250);
  await cdp.call('HeapProfiler.collectGarbage');
  const metrics = (await cdp.call('Performance.getMetrics')).result.metrics;
  const get = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
  return {
    heapMb: get('JSHeapUsedSize') / (1024 * 1024),
    nodes: get('Nodes'),
    listeners: get('JSEventListeners')
  };
}

// The terminal side, for arm E, in the Phase 247 probe's shape.
const tmux = (...a) =>
  (spawnSync('tmux', ['-L', socket, ...a], { encoding: 'utf8' }).stdout ?? '').trimEnd();
const paneIdOf = (name) => {
  const row = tmux('list-panes', '-a', '-F', '#{session_name}\t#{pane_id}')
    .split('\n')
    .find((l) => l.startsWith(`${name}\t`));
  return row === undefined ? null : (row.split('\t')[1] ?? null);
};
const paneSize = (pane) =>
  tmux('list-panes', '-a', '-F', '#{pane_id} #{pane_width} #{pane_height}')
    .split('\n')
    .find((l) => l.startsWith(`${pane} `)) ?? '';
const capture = (pane) =>
  (spawnSync('tmux', ['-L', socket, 'capture-pane', '-p', '-t', pane], { encoding: 'utf8' }).stdout ?? '').split('\n');
async function settledCapture(pane) {
  let last = `${paneSize(pane)}\n${capture(pane).join('\n')}`;
  for (let i = 0; i < 8; i += 1) {
    await sleep(500);
    const now = `${paneSize(pane)}\n${capture(pane).join('\n')}`;
    if (now === last) return now.split('\n').slice(1);
    last = now;
  }
  return last.split('\n').slice(1);
}
async function geometryNow(cdp, pane) {
  const screen = await read(cdp, SCREEN);
  const size = paneSize(pane).split(' ').slice(1).map((n) => Number.parseInt(n, 10));
  if (screen === null || !Number.isFinite(size[0]) || size[0] <= 0) return null;
  return { left: screen.left, top: screen.top, cellW: screen.width / size[0], cellH: screen.height / size[1], cols: size[0], rows: size[1] };
}
function cellOf(rows, marker, path) {
  for (const [row, text] of rows.entries()) {
    if (!text.startsWith(`${marker} `)) continue;
    const col = text.indexOf(path);
    if (col === -1) continue;
    return { row, col, width: path.length, text };
  }
  return null;
}
async function parkPointer(cdp, geo) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4 });
  await sleep(250);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.left + geo.cellW / 2, y: geo.top + (geo.rows - 0.5) * geo.cellH });
  await sleep(400);
}
async function waitOnLink(cdp, budgetMs = 4000) {
  const started = Date.now();
  for (;;) {
    if ((await read(cdp, ON_LINK)) === true) return true;
    if (Date.now() - started >= budgetMs) return false;
    await sleep(100);
  }
}
/** Which screen row the link is really on: the captured row, or the one under it. */
async function rowOnScreen(cdp, geo, cell) {
  for (const d of [0, 1]) {
    await parkPointer(cdp, geo);
    await cdp.call('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: geo.left + (cell.col + cell.width / 2) * geo.cellW,
      y: geo.top + (cell.row + d + 0.5) * geo.cellH
    });
    if (await waitOnLink(cdp)) return cell.row + d;
  }
  return null;
}
async function pressCell(cdp, geo, row, cell) {
  const x = geo.left + (cell.col + cell.width / 2) * geo.cellW;
  const y = geo.top + (row + 0.5) * geo.cellH;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  const onLink = await waitOnLink(cdp);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(2500);
  return onLink;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const findings = {};
const problems = [];
const SESSION = 'p260-shell';
const BUDGETS = { nodes: 400, listeners: 60 };

await withElectron(
  {
    label: 'p260-tabs',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 20 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('HeapProfiler.enable');
      await cdp.call('Performance.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }

      // Three projects, opened the way the drive opens one, so the ids come
      // from main's own manifest. Each opens active; the last is charlie.
      for (const n of NAMES) {
        await drive(cdp, { projectPath: dirs[n], editorWidth: 1100 });
        await sleep(800);
      }
      const projects = await read(cdp, PROJECTS);
      const idOf = Object.fromEntries(projects.map((p) => [p.name, p.id]));
      say(`projects: ${JSON.stringify(projects)}`);
      if (NAMES.some((n) => idOf[n] === undefined)) {
        throw new Error(`the three projects are not all on the face: ${JSON.stringify(projects)}`);
      }

      // ------------------------------------------------------------- ARM A
      // Alpha: a clean tab, a dirty tab, and a redline with a change rewound.
      shellWrite(join(dirs.alpha, 'walk.txt'), WALK_V2);
      await switchTo(cdp, idOf.alpha);
      await drive(cdp, { projectPath: dirs.alpha, openRels: ['a-other0.md'], openRel: 'notes.txt', mode: 'file' });
      await until(cdp, monacoUp, 20000);
      await sleep(800);
      await clickFirstLine(cdp);
      await press(cdp, CMD_UP);
      await typeInto(cdp, TYPED);
      const dirtyLanded = await until(cdp, `document.querySelector('.ed-tab.active .ed-tab-close.dirty') !== null`, 8000);

      await drive(cdp, { projectPath: dirs.alpha, openRel: 'walk.txt', mode: 'diff' });
      await sleep(700);
      await read(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await sleep(500);
      const drawn = await read(cdp, REDLINE);
      const active = await focusChangeWith(cdp, 'throwaway viewer');
      await press(cdp, ALT_BS);
      const rewound = await untilDisk(join(dirs.alpha, 'walk.txt'), (d) => d.includes('disposable client') && d.includes('rewritten by an agent'), 15000);
      await until(cdp, docSettled, 15000);
      await sleep(600);
      const afterRewind = await read(cdp, REDLINE);
      const stripA = await read(cdp, STRIP);
      findings.A = { dirtyLanded, drawnChanges: drawn.changes, focused: active !== null, rewound, generation: afterRewind.generation, undoNote: afterRewind.undoNote, strip: stripA };
      say(`A: ${JSON.stringify(findings.A)}`);
      problems.push(
        ...grade([
          ['A typing put the dirty dot on notes.txt', dirtyLanded, true],
          ['A the redline drew the agent edits', drawn.changes >= 2, true],
          ['A a change took focus by keyboard', active !== null, true],
          ['A the rewind reached the disk with the other edit standing', rewound, true],
          ['A the face offers the undo', typeof afterRewind.undoNote === 'string' && afterRewind.undoNote.includes('this session'), true],
          ['A alpha holds three tabs', stripA.names, ['a-other0.md', 'notes.txt', 'walk.txt']],
          ['A walk.txt is the active tab', stripA.active, 'walk.txt'],
          ['A notes.txt wears the dot', stripA.dirty, ['notes.txt']]
        ])
      );

      // ------------------------------------------------------------- ARM B
      // The switch hides. At the parent alpha's tabs are drawn under bravo.
      await switchTo(cdp, idOf.bravo);
      const stripB = await read(cdp, STRIP);
      findings.B = { strip: stripB };
      say(`B: ${JSON.stringify(findings.B)}`);
      problems.push(
        ...grade([
          ['B bravo draws no tab of alpha’s', stripB.names, []],
          ['B and the panel is closed', stripB.panel, false]
        ])
      );

      // ------------------------------------------------------------- ARM C
      // Ten for keeps in bravo, then an eleventh. The cap is bravo's own.
      const bravoTen = others('bravo').slice(0, 10);
      await drive(cdp, { projectPath: dirs.bravo, openRels: bravoTen });
      await sleep(800);
      const stripC10 = await read(cdp, STRIP);
      await drive(cdp, { projectPath: dirs.bravo, openRel: 'b-other10.md', mode: 'file' });
      await sleep(1000);
      const stripC11 = await read(cdp, STRIP);
      findings.C = { atTen: stripC10.names, atEleven: stripC11.names };
      say(`C: ${JSON.stringify(findings.C)}`);
      problems.push(
        ...grade([
          ['C bravo holds ten of its own', stripC10.names, bravoTen],
          ['C the eleventh evicts one of bravo’s own and the strip holds ten', stripC11.names.length, 10],
          ['C every tab on bravo’s strip is bravo’s', stripC11.names.every((n) => n.startsWith('b-')), true],
          ['C the eleventh is on the strip', stripC11.names.includes('b-other10.md'), true]
        ])
      );

      // ------------------------------------------------------------- ARM D
      // Back to alpha: everything is where it was, and both undos work.
      await switchTo(cdp, idOf.alpha);
      await until(cdp, docSettled, 15000);
      await sleep(800);
      const stripD = await read(cdp, STRIP);
      const redlineD = await read(cdp, REDLINE);
      // ⌥⇧⌫ undoes the rewind: the agent's phrase comes back to the disk.
      await read(cdp, focusScroller);
      await sleep(150);
      await press(cdp, ALT_SHIFT_BS);
      const undone = await untilDisk(join(dirs.alpha, 'walk.txt'), (d) => d.includes('throwaway viewer') && d.includes('rewritten by an agent'), 15000);
      // ⌘Z undoes the typing: the dot goes off notes.txt.
      await read(cdp, clickTab('notes.txt'));
      await until(cdp, monacoUp, 15000);
      await sleep(600);
      await clickFirstLine(cdp);
      let cleanAgain = false;
      for (let i = 0; i < 10 && !cleanAgain; i += 1) {
        await press(cdp, CMD_Z);
        cleanAgain = await until(cdp, `document.querySelector('.ed-tab.active .ed-tab-close.dirty') === null`, 800);
      }
      const modelText = await read(cdp, `(() => { const ls = Array.from(document.querySelectorAll('.monaco-editor .view-line')); return ls.length ? ls[0].textContent : null; })()`);
      findings.D = { strip: stripD, generation: redlineD.generation, undoNote: redlineD.undoNote, undone, cleanAgain, firstLine: modelText };
      say(`D: ${JSON.stringify(findings.D)}`);
      problems.push(
        ...grade([
          ['D alpha’s three tabs are all there', stripD.names, ['a-other0.md', 'notes.txt', 'walk.txt']],
          ['D the tab that was active is active', stripD.active, 'walk.txt'],
          ['D the dirty dot is still on notes.txt', stripD.dirty, ['notes.txt']],
          ['D the baseline generation is unchanged', redlineD.generation, findings.A.generation],
          ['D the face still offers the undo', typeof redlineD.undoNote === 'string' && redlineD.undoNote.includes('this session'), true],
          ['D ⌥⇧⌫ undid the rewind, so the journal survived the switch', undone, true],
          ['D ⌘Z undid the typing, so the Monaco model survived the switch', cleanAgain, true]
        ])
      );

      // ------------------------------------------------------------- ARM E
      // A path in alpha's terminal naming a file in bravo opens under bravo.
      // The panel is HIDDEN first, with the shipped Esc from inside it, so the
      // pane is at its full width and the path cannot wrap; hiding keeps every
      // tab (store.ts hidePanel), which arm E reads again afterwards.
      await read(cdp, clickTab('walk.txt'));
      await until(cdp, docSettled, 15000);
      await read(cdp, focusScroller);
      await sleep(150);
      await press(cdp, ESCAPE);
      let hidden = await until(cdp, `document.querySelector('.ed-tabs-list') === null`, 4000);
      if (!hidden) {
        await press(cdp, CMD_E);
        hidden = await until(cdp, `document.querySelector('.ed-tabs-list') === null`, 4000);
      }
      if (!hidden) problems.push('E the panel would not hide, so the pane was pressed at a narrowed width');
      await drive(cdp, { projectPath: dirs.alpha, session: { agent: 'shell', name: SESSION } });
      await sleep(2500);
      const pane = paneIdOf(SESSION);
      if (pane === null) throw new Error('the session this run created has no pane');
      const transcript = join(dirs.alpha, 'transcript.txt');
      writeFileSync(transcript, `mkE ${TARGET_IN_BRAVO} end\n\n`);
      tmux('send-keys', '-t', pane, `cat ${transcript}`, 'Enter');
      await sleep(3000);
      const rows = await settledCapture(pane);
      const geo = await geometryNow(cdp, pane);
      const cell = cellOf(rows, 'mkE', TARGET_IN_BRAVO);
      let e = { pressed: false };
      if (geo === null || cell === null) {
        problems.push(`E the marked row was not in the pane (geo ${JSON.stringify(geo)}, rows ${JSON.stringify(rows.filter((r) => r.trim() !== '').slice(-4))})`);
      } else if (!cell.text.slice(cell.col + cell.width).includes('end')) {
        problems.push(`E the row wrapped at ${String(geo.cols)} columns, so the path could not be pressed`);
      } else {
        const row = await rowOnScreen(cdp, geo, cell);
        if (row === null) {
          problems.push('E no row within one of the captured one carries a link');
        } else {
          await parkPointer(cdp, geo);
          const onLink = await pressCell(cdp, geo, row, cell);
          const projectsE = await read(cdp, PROJECTS);
          const stripE = await read(cdp, STRIP);
          await switchTo(cdp, idOf.alpha);
          // Alpha's panel was hidden above; raising one of its tabs reopens it
          // with every tab it had (openFromRequest's existing-tab path).
          await drive(cdp, { projectPath: dirs.alpha, openRel: 'walk.txt', mode: 'diff' });
          await sleep(800);
          const stripEalpha = await read(cdp, STRIP);
          e = { pressed: true, cols: geo.cols, onLink, current: projectsE.find((p) => p.current)?.name ?? null, strip: stripE, alphaStrip: stripEalpha };
        }
      }
      findings.E = e;
      say(`E: ${JSON.stringify(findings.E)}`);
      if (e.pressed) {
        problems.push(
          ...grade([
            ['E the terminal drew a link on the path', e.onLink, true],
            ['E the app shows bravo after the press', e.current, 'bravo'],
            ['E the file is on bravo’s strip', e.strip.names.includes('b-target.md'), true],
            ['E and is not on alpha’s', e.alphaStrip.names.includes('b-target.md'), false],
            ['E alpha’s own tabs are untouched', e.alphaStrip.names, ['a-other0.md', 'notes.txt', 'walk.txt']]
          ])
        );
      }

      // ------------------------------------------------------------- ARM F
      // Close alpha with its dirty tab: the prompt, and Cancel keeps it.
      // Type again first, because arm D undid the typing.
      await read(cdp, clickTab('notes.txt'));
      await until(cdp, monacoUp, 15000);
      await sleep(500);
      await clickFirstLine(cdp);
      await press(cdp, CMD_UP);
      await typeInto(cdp, TYPED);
      await until(cdp, `document.querySelector('.ed-tab.active .ed-tab-close.dirty') !== null`, 8000);
      const closeClicked = await read(cdp, clickProjectClose(idOf.alpha));
      await until(cdp, `document.querySelector('.modal[role="alertdialog"]') !== null`, 8000);
      const closeDialog = await read(cdp, DIALOG);
      await read(cdp, clickDialogButton('Close project'));
      // The editor's own prompt, or nothing at the parent.
      await until(cdp, `(() => { const t = document.querySelector('.modal[role="alertdialog"] .modal-title'); return t !== null && (t.textContent ?? '').startsWith('Save changes'); })()`, 6000);
      const prompt = await read(cdp, DIALOG);
      if (prompt.open) await read(cdp, clickDialogButton('Cancel'));
      await until(cdp, noDialog, 5000);
      await sleep(800);
      const projectsF = await read(cdp, PROJECTS);
      const stripF = await read(cdp, STRIP);
      findings.F = { closeClicked, closeDialog, prompt, projects: projectsF.map((p) => p.name), strip: stripF };
      say(`F: ${JSON.stringify(findings.F)}`);
      problems.push(
        ...grade([
          ['F the project close asked first', closeDialog.title, "Close 'alpha'?"],
          ...promptFindings(prompt, 'notes.txt').map((f) => [`F ${f}`, false, true]),
          ['F Cancel kept the project', projectsF.map((p) => p.name).includes('alpha'), true],
          ['F and kept the dirty tab', stripF.dirty, ['notes.txt']],
          // FIX ROUND. `closeProjectTabs` asks about the dirty tabs FIRST, so
          // a Cancel keeps every tab of the project: at 8e5a5f43 the clean tab
          // before the dirty one on the strip was already closed on the way to
          // the prompt, and this line pinned that loss as the expectation.
          ['F and every tab it had', stripF.names, ['a-other0.md', 'notes.txt', 'walk.txt']]
        ])
      );

      // ------------------------------------------------------------- ARM G
      // Ten tabs in each of three projects, then blocks of switching.
      await drive(cdp, { projectPath: dirs.alpha, openRels: others('alpha').slice(0, 8) });
      await switchTo(cdp, idOf.charlie);
      await drive(cdp, { projectPath: dirs.charlie, openRels: others('charlie').slice(0, 10) });
      await sleep(1000);
      const counts = {};
      for (const n of NAMES) {
        await switchTo(cdp, idOf[n]);
        counts[n] = (await read(cdp, STRIP)).names.length;
      }
      const blocks = [];
      for (let k = 0; k < 4; k += 1) {
        for (const n of NAMES) {
          await switchTo(cdp, idOf[n]);
          await sleep(400);
        }
        blocks.push(await readRenderer(cdp));
      }
      const after = {};
      for (const n of NAMES) {
        await switchTo(cdp, idOf[n]);
        after[n] = (await read(cdp, STRIP)).names.length;
      }
      findings.G = { counts, blocks, after };
      say(`G: ${JSON.stringify(findings.G)}`);
      problems.push(
        ...grade([
          ['G ten tabs in each of three projects', counts, { alpha: 10, bravo: 10, charlie: 10 }],
          ['G and still ten each after the blocks, so nothing hidden was evicted', after, { alpha: 10, bravo: 10, charlie: 10 }]
        ]),
        ...plateauFindings(blocks, BUDGETS).map((f) => `G ${f}`)
      );
    } finally {
      try {
        await cdpEval(cdp, `window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true`, 30000);
      } catch {
        /* best effort; withElectron ends the tree anyway */
      }
      cdp.close();
    }
  }
);

writeFileSync(join(root, 'readings.json'), `${JSON.stringify(findings, null, 2)}\n`);
const opAfter = operatorCount();
say(`the operator's own -L gmux sessions: ${String(opBefore)} before, ${String(opAfter)} after`);
if (opBefore !== opAfter) problems.push('the operator’s own tmux server changed under this run');
if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say('PASS: every arm behaved.');
process.exit(0);
