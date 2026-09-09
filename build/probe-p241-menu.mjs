#!/usr/bin/env node
/**
 * probe-p241-menu.mjs. THE PHASE 241 APP RUN for the editor's right-click
 * menu, and it is THREE Electrons one after the other and never at once, on
 * one scratch profile, a scratch HOME and this script's own tmux socket. It
 * spawns no agent, spends no token, opens no keychain, makes no request and
 * reads nothing under the person's home: the project it opens is one it builds
 * itself in the harness directory, and every reshape it drives rewrites a file
 * inside that project and nothing else.
 *
 * ## WHY THREE LAUNCHES AND NOT ONE
 *
 * `Menu.popup` opens an OS window no drive can click, so the only shipped way
 * to run a row is the Phase 198 harness knob `GMUX_SHOT_POPUP_PICK`, which
 * main reads from its own environment. One value per process, so one PRESSED
 * row per launch. Launch A picks a label no row carries, which dismisses every
 * menu and prints the labels each one drew — that is the whole menu reading.
 * Launch B presses Format Table and launch C presses Format JSON.
 *
 * ## WHAT IT ANSWERS
 *
 *  A1  the caret inside a table draws Format Table FIRST, with no separator
 *      in front of it
 *  A2  the caret in prose draws NO Group A and no leading separator
 *  A3  a JSON file draws Format JSON and Minify JSON and no Format Table
 *  A4  a JSON fence SELECTED inside a markdown file draws the two JSON rows —
 *      selection beats caret
 *  A5  the eleven Monaco rows and the four Tortie rows are all on the menu
 *  A6  the right click MOVED the caret to where it was clicked
 *  A7  the Redline view raises NO menu at all, because `.ed-mount` is not
 *      there — the structural refusal
 *  A8  a table with a HEADING GLUED DIRECTLY ABOVE IT still draws Format
 *      Table — 10 of this repository's own tables are that shape and the
 *      parent commit drew nothing on any of them
 *  B1  pressing Format Table rewrites the table in the model
 *  B2  ONE undo puts the whole reshape back
 *  B3  AND THE FENCED BLOCK GLUED DIRECTLY UNDER A TABLE SURVIVES THE PRESS,
 *      byte for byte and line for line. This is the fix round's reading: a
 *      GFM table ends at a blank line OR at the start of another block-level
 *      structure, the block scan knew only the blank line, and the press
 *      wrote the formatted table over the code block underneath it
 *  C1  pressing Format JSON rewrites the JSON document in the model
 *
 * ## SAFETY
 *
 * Every Electron is started through build/electron-run.mjs, which ends the
 * tree it started in a `finally` block whatever happened. The tmux socket is
 * this script's own, handed in by build/harness-socket.mjs; `gmux` and
 * `default` are refused by name and the operator's own `-L gmux` sessions are
 * counted before and after. NO BYTE OF THE PASTEBOARD IS TOUCHED: no row this
 * run presses reaches one, and Copy Path is read off the menu rather than
 * pressed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p241-menu]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p241m', `node ${process.argv[1]}`],
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

mkdirSync(join(harnessDir, 'p241m'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p241m'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');

const RAGGED_TABLE = [
  '| Agent | What it does | Status |',
  '|---|:--:|--:|',
  '| claude | writes code | ok |',
  '| codex | also writes a great deal of code | ok |'
].join('\n');

const NOTES = [
  '# Notes', // 1
  '', // 2
  'Some prose above the table.', // 3
  '', // 4
  RAGGED_TABLE, // 5..8
  '', // 9
  'Some prose below the table.', // 10
  '', // 11
  '```json', // 12
  '{"z":1,"a":[1,2]}', // 13
  '```', // 14
  ''
].join('\n');

/**
 * THE GLUED FIXTURE, and it is the Phase 241 fix round's own defect in one
 * file. A heading is written directly above the table and a fenced code block
 * directly under it, with no blank line at either boundary — which is the
 * shape a GFM table really ends at and the shape the old block scan could not
 * see. At the parent commit the menu drew NO Format Table row here at all, and
 * driving the row from the Edit menu instead took the fenced block off the
 * file: 8 lines to 5, silently, in the person's own document.
 */
const GLUED = [
  '### A heading glued above', // 1
  '| id | call |', // 2
  '| --- | ---: |', // 3
  '| 2 | b |', // 4
  '| 1 | a |', // 5
  '```js', // 6
  'const keep = "this line must survive";', // 7
  '```', // 8
  ''
].join('\n');

function makeProject() {
  for (const d of [home, profile, project]) {
    rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
  const git = (...a) => {
    const r = spawnSync('git', a, {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
    });
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  };
  writeFileSync(join(project, 'notes.md'), NOTES);
  writeFileSync(join(project, 'data.json'), '{"b":2,"a":[1,2,3],"c":{"d":true}}\n');
  writeFileSync(join(project, 'glued.md'), GLUED);
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'p241@example.invalid');
  git('config', 'user.name', 'p241');
  git('add', '.');
  git('commit', '-q', '-m', 'first');
}

/** The live IStandaloneCodeEditor, off the React fiber of `.ed-mount`. */
const EDITOR_HOOK = `(() => {
  const mount = document.querySelector('.ed-mount');
  if (!mount) return null;
  const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
  if (!key) return null;
  let f = mount[key];
  const isEditor = (v) => v !== null && typeof v === 'object' && typeof v.getSupportedActions === 'function' && typeof v.getModel === 'function';
  while (f) {
    for (const fib of [f, f.alternate]) {
      let h = fib && fib.memoizedState;
      let n = 0;
      while (h && n < 200) {
        const s = h.memoizedState;
        if (s && typeof s === 'object' && 'current' in s && isEditor(s.current)) return s.current;
        h = h.next; n += 1;
      }
    }
    f = f.return;
  }
  return null;
})()`;

/** Client coordinates of one (line, column), read off the live editor. */
const pointAt = (line, column) => `(() => {
  const ed = ${EDITOR_HOOK};
  if (ed === null) return null;
  ed.revealLine(${line});
  const p = ed.getScrolledVisiblePosition({ lineNumber: ${line}, column: ${column} });
  if (!p) return null;
  const r = ed.getContainerDomNode().getBoundingClientRect();
  return { x: Math.round(r.left + p.left + 2), y: Math.round(r.top + p.top + p.height / 2) };
})()`;

const modelValue = `(() => { const ed = ${EDITOR_HOOK}; return ed && ed.getModel() ? ed.getModel().getValue() : null; })()`;
const caretPos = `(() => { const ed = ${EDITOR_HOOK}; const p = ed ? ed.getPosition() : null; return p ? { line: p.lineNumber, column: p.column } : null; })()`;
const selectRange = (a, b, c, d) => `(() => {
  const ed = ${EDITOR_HOOK};
  if (ed === null) return false;
  const R = ed.getModel().getFullModelRange().constructor;
  ed.setSelection(new R(${a}, ${b}, ${c}, ${d}));
  return true;
})()`;

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
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: [] });
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof a === 'string') return cdp;
          cdp.close();
        } catch {
          if (cdp) { try { cdp.close(); } catch { /* already closed */ } }
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
    if ((await cdpEval(cdp, expr, 10000)) === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(100);
  }
};
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null && document.querySelector('.ed-mount') !== null`;

/** A REAL right click at (x, y), the way a person raises the menu. */
async function rightClick(cdp, at) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.call('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'right', clickCount: 1 });
  }
  await sleep(500);
}

/** Every `[gmux-shot] popup-pick` line main printed, in order. */
function picksIn(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.indexOf('[gmux-shot] popup-pick ');
    if (m === -1) continue;
    try { out.push(JSON.parse(line.slice(m + '[gmux-shot] popup-pick '.length))); } catch { /* not ours */ }
  }
  return out;
}

const findings = [];
const check = (ok, what, detail) => {
  console.log(`  ${(ok ? 'OK  ' : 'FAIL')} ${what}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) findings.push(what);
};

/** One launch, with one popup pick, running `body`. Returns main's output. */
async function launch(label, pick, body) {
  let text = '';
  await withElectron(
    {
      label,
      userDataDir: profile,
      tmuxSocket: null,
      cwd: REPO,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        // The Phase 198 knob is read only under GMUX_SHOT, so shot mode is
        // armed at a path inside the harness directory with a delay far past
        // the ceiling: NO PICTURE IS EVER TAKEN and the file is never written.
        // This is the shape probe-p207-hue.mjs already uses for the same knob.
        GMUX_SHOT: join(root, 'p241-unused.png'),
        GMUX_SHOT_DELAY_MS: '1500000',
        GMUX_SHOT_POPUP_PICK: pick
      }),
      ceilingMs: 8 * 60 * 1000
    },
    async (handle) => {
      const cdp = await cdpForAppWindow(60000);
      try {
        await cdp.call('Runtime.enable');
        try { await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch { /* older builds */ }
        for (;;) {
          if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
          await sleep(50);
        }
        await drive(cdp, { projectPath: project });
        await sleep(1200);
        await body(cdp);
      } finally {
        try { cdp.close(); } catch { /* already closed */ }
        text = handle.text();
      }
    }
  );
  return text;
}

/** Open one file in Source mode with Monaco really up. */
async function openSource(cdp, rel) {
  await drive(cdp, { projectPath: project, openRel: rel, mode: 'file', editorWidth: 1100 });
  await sleep(1000);
  if (rel.endsWith('.md')) {
    await cdpEval(cdp, `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="Source"]'); if (b) b.click(); return true; })()`);
  }
  const up = await until(cdp, monacoUp, 40000);
  await sleep(600);
  return up;
}

makeProject();

// ---------------------------------------------------------------------------
// LAUNCH A — read every menu. The pick names no row, so each one is dismissed
// and its labels are printed.
// ---------------------------------------------------------------------------
console.log(`\n${TAG} LAUNCH A — what each menu draws`);
let caretAfter = null;
let redlineMount = null;
const textA = await launch('p241-menu-a', 'p241 no row carries this label', async (cdp) => {
  say(`notes.md source: ${String(await openSource(cdp, 'notes.md'))}`);
  // 1. the caret inside the table's LAST body row (line 8 of notes.md)
  await rightClick(cdp, await cdpEval(cdp, pointAt(8, 3)));
  caretAfter = await cdpEval(cdp, caretPos);
  // 2. prose above the table (line 3)
  await rightClick(cdp, await cdpEval(cdp, pointAt(3, 3)));
  // 3. a JSON fence SELECTED inside the markdown file (line 13)
  await cdpEval(cdp, selectRange(13, 1, 13, 18));
  await rightClick(cdp, await cdpEval(cdp, pointAt(13, 5)));
  // 4. the JSON file itself
  say(`data.json source: ${String(await openSource(cdp, 'data.json'))}`);
  await rightClick(cdp, await cdpEval(cdp, pointAt(1, 5)));
  // 4b. THE GLUED FIXTURE. A heading sits directly above this table with no
  //     blank line, which is 10 of this repository's own tables and drew no
  //     Format Table row at all at the parent commit.
  say(`glued.md source: ${String(await openSource(cdp, 'glued.md'))}`);
  await rightClick(cdp, await cdpEval(cdp, pointAt(4, 3)));
  // 5. THE REDLINE. Its document has no `.ed-mount`, so no menu can be raised
  //    over it at all — the structural refusal, read as an absence.
  await drive(cdp, { projectPath: project, openRel: 'notes.md', mode: 'file' });
  await sleep(800);
  await cdpEval(cdp, `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="Redline"]'); if (b) b.click(); return true; })()`);
  await sleep(1500);
  redlineMount = await cdpEval(cdp, `({ mount: document.querySelector('.ed-mount') !== null, redline: document.querySelector('.ed-redline, .redline-doc, [class*="redline"]') !== null })`);
});
const picksA = picksIn(textA);
console.log(`\n${TAG} four menus were raised and dismissed; ${picksA.length} popup(s) recorded`);
for (const [i, p] of picksA.entries()) console.log(`  menu ${i + 1}: ${p.labels.join(' · ')}`);

const [inTable, inProse, overFence, inJson, inGlued] = picksA;
const MONACO = ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select All', 'Find', 'Change All Occurrences', 'Go to Line…', 'Fold', 'Unfold'];
const TORTIE = ['History', 'Copy Path', 'Copy Relative Path', 'Save'];

console.log(`\n${TAG} the readings`);
check(picksA.length === 5, 'A0 five menus were raised, and the redline raised none', `${picksA.length} popups`);
check(inTable !== undefined && inTable.labels[0] === 'Format Table', 'A1 the caret in a table draws Format Table FIRST', inTable && inTable.labels[0]);
check(inProse !== undefined && !inProse.labels.includes('Format Table') && !inProse.labels.includes('Format JSON'), 'A2 the caret in prose draws NO Group A', inProse && inProse.labels.slice(0, 2).join(' · '));
check(inProse !== undefined && inProse.labels[0] === 'Undo', 'A2b and no separator in front of it', inProse && inProse.labels[0]);
check(overFence !== undefined && overFence.labels.slice(0, 2).join('|') === 'Format JSON|Minify JSON', 'A4 a selected JSON fence in markdown draws the two JSON rows', overFence && overFence.labels.slice(0, 2).join(' · '));
check(inJson !== undefined && inJson.labels.slice(0, 2).join('|') === 'Format JSON|Minify JSON' && !inJson.labels.includes('Format Table'), 'A3 a JSON file draws the two JSON rows and no Format Table', inJson && inJson.labels.slice(0, 3).join(' · '));
check(inTable !== undefined && MONACO.every((l) => inTable.labels.includes(l)), 'A5a the eleven Monaco rows are all there');
check(inTable !== undefined && TORTIE.every((l) => inTable.labels.includes(l)), 'A5b the four Tortie rows are all there');
check(caretAfter !== null && caretAfter.line === 8, 'A6 the right click moved the caret to the line it was on', JSON.stringify(caretAfter));
check(redlineMount !== null && redlineMount.mount === false, 'A7 the Redline view has no .ed-mount, so no menu can be raised on it', JSON.stringify(redlineMount));
check(inGlued !== undefined && inGlued.labels[0] === 'Format Table', 'A8 a table with a heading glued above it still draws Format Table', inGlued && inGlued.labels.slice(0, 2).join(' · '));

// ---------------------------------------------------------------------------
// LAUNCH B — press Format Table, then ONE undo.
// ---------------------------------------------------------------------------
console.log(`\n${TAG} LAUNCH B — press Format Table`);
let before = null;
let after = null;
let undone = null;
let gluedBefore = null;
let gluedAfter = null;
await launch('p241-menu-b', 'Format Table', async (cdp) => {
  await openSource(cdp, 'notes.md');
  before = await cdpEval(cdp, modelValue);
  await rightClick(cdp, await cdpEval(cdp, pointAt(7, 3)));
  await sleep(700);
  after = await cdpEval(cdp, modelValue);
  await cdpEval(cdp, `(() => { const ed = ${EDITOR_HOOK}; ed.focus(); ed.trigger('p241-probe', 'undo', null); return true; })()`);
  await sleep(400);
  undone = await cdpEval(cdp, modelValue);
  // AND THE GLUED FIXTURE, pressed from the same native menu. This is the
  // reading that would have caught the loss: the fenced block under the table
  // must still be in the model afterwards, byte for byte.
  await openSource(cdp, 'glued.md');
  gluedBefore = await cdpEval(cdp, modelValue);
  await rightClick(cdp, await cdpEval(cdp, pointAt(4, 3)));
  await sleep(700);
  gluedAfter = await cdpEval(cdp, modelValue);
});
const tableAfter = after === null ? '' : after.split('\n').slice(4, 8).join('\n');
console.log(`  the table after the press:\n${tableAfter.split('\n').map((l) => `    ${l}`).join('\n')}`);
check(after !== null && after !== before, 'B1 pressing Format Table rewrote the model');
const tableLines = tableAfter.split('\n');
const widths = [...new Set(tableLines.map((l) => l.length))];
check(widths.length === 1 && (tableLines[0] ?? '').length > 40, 'B1b every row is padded to one width', `widths ${JSON.stringify(widths)}`);
const cellsOf = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const delim = cellsOf(tableLines[1] ?? '');
const marks = delim.map((c) => `${c.startsWith(':') ? 'l' : ''}${c.endsWith(':') ? 'r' : ''}`);
check(marks.join(',') === ',lr,r', 'B1c the alignment markers survived — none, centre, right', JSON.stringify(marks));
check(undone === before, 'B2 ONE undo put the whole reshape back');

const gluedLines = gluedAfter === null ? [] : gluedAfter.split('\n');
console.log(`  glued.md after the press:\n${gluedLines.map((l) => `    ${l}`).join('\n')}`);
check(gluedAfter !== null && gluedAfter !== gluedBefore, 'B3 Format Table ran on a table with a heading glued above it');
check(gluedLines[0] === '### A heading glued above', 'B3a the heading above the table is untouched', gluedLines[0]);
check(
  gluedLines.slice(5, 8).join('\n') === '```js\nconst keep = "this line must survive";\n```',
  'B3b THE FENCED BLOCK GLUED UNDER THE TABLE SURVIVED, byte for byte',
  JSON.stringify(gluedLines.slice(5, 8))
);
check(gluedLines.length === (gluedBefore === null ? -1 : gluedBefore.split('\n').length), 'B3c and the file has the same number of lines it started with', `${String(gluedLines.length)} lines`);

// ---------------------------------------------------------------------------
// LAUNCH C — press Format JSON on the JSON file.
// ---------------------------------------------------------------------------
console.log(`\n${TAG} LAUNCH C — press Format JSON`);
let jsonBefore = null;
let jsonAfter = null;
await launch('p241-menu-c', 'Format JSON', async (cdp) => {
  await openSource(cdp, 'data.json');
  jsonBefore = await cdpEval(cdp, modelValue);
  await rightClick(cdp, await cdpEval(cdp, pointAt(1, 5)));
  await sleep(700);
  jsonAfter = await cdpEval(cdp, modelValue);
});
console.log(`  before: ${JSON.stringify(jsonBefore)}`);
console.log(`  after:  ${JSON.stringify(jsonAfter)}`);
check(jsonAfter !== null && jsonAfter !== jsonBefore, 'C1 pressing Format JSON rewrote the model');
check(jsonAfter !== null && jsonAfter.includes('\n  "b": 2,'), 'C1b the document is indented by two');
check(jsonAfter !== null && jsonAfter.endsWith('}\n'), 'C1c the file KEPT its trailing newline');

const opAfter = operatorCount();
say(`operator -L gmux sessions: ${opBefore} before, ${opAfter} after`);
writeFileSync(join(root, 'menus.json'), JSON.stringify({ picksA, before, after, undone, gluedBefore, gluedAfter, jsonBefore, jsonAfter }, null, 2));
if (opAfter !== opBefore) findings.push('the operator session count moved');
if (findings.length > 0) {
  console.error(`\n${TAG} FAILED: ${findings.length} finding(s)`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`\n${TAG} PASS — every reading behaved.`);
