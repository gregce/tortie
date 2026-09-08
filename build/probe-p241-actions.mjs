#!/usr/bin/env node
/**
 * probe-p241-actions.mjs. THE PHASE 241 MEASURE STEP'S APP RUN, and it is ONE
 * Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket. It spawns no agent, spends no token, opens no keychain, makes no
 * request, touches no pasteboard and reads nothing under the person's home:
 * the project it opens is one it builds itself in the harness directory.
 *
 * ## WHAT IT ANSWERS
 *
 * The Phase 241 entry names ten Monaco actions for Group B of the editor's new
 * right-click menu and says the round must re-derive which of them actually
 * exist in the shipped standalone build BY ASKING THE LIVE EDITOR rather than
 * by reading a docs page, because a row that names an action the build does not
 * carry does nothing when it is pressed and no document can catch that.
 *
 * So it opens a real file in the real editor and calls
 * `editor.getSupportedActions()` on the live IStandaloneCodeEditor, prints the
 * whole list, and then asks `editor.getAction(id)` for every id the entry
 * names. The editor is reached through the React fiber of the `.ed-mount`
 * container, so NOTHING in the shipping tree was changed to expose it.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` block whatever happened. The tmux socket is this
 * script's own, handed in by build/harness-socket.mjs; `gmux` and `default` are
 * refused by name and the operator's own `-L gmux` sessions are counted before
 * and after. The only other process it starts is a synchronous `git` that has
 * exited before the call returns.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p241]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The ten ids the Phase 241 entry names for Group B. */
const NAMED = [
  ['Cut', 'editor.action.clipboardCutAction'],
  ['Copy', 'editor.action.clipboardCopyAction'],
  ['Paste', 'editor.action.clipboardPasteAction'],
  ['Select All', 'editor.action.selectAll'],
  ['Undo', 'undo'],
  ['Redo', 'redo'],
  ['Find', 'actions.find'],
  ['Change All Occurrences', 'editor.action.changeAll'],
  ['Go to Line', 'editor.action.gotoLine'],
  ['Fold', 'editor.fold'],
  ['Unfold', 'editor.unfold']
];

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p241', `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

mkdirSync(join(harnessDir, 'p241'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p241'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
writeFileSync(join(project, 'notes.md'), [
  '# Notes', '',
  'Some prose above the table.', '',
  '| Agent | What it does | Status |',
  '|---|:--:|--:|',
  '| claude | writes code | ok |',
  '| codex | also writes code | ok |', '',
  'Some prose below the table.', ''
].join('\n'));
writeFileSync(join(project, 'data.json'), '{"a":1,"b":[1,2,3],"c":{"d":true}}\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p241@example.invalid');
git('config', 'user.name', 'p241');
git('add', '.');
git('commit', '-q', '-m', 'first');

/**
 * The live IStandaloneCodeEditor, off the React fiber of `.ed-mount`.
 * MonacoHost.tsx holds it in a `useRef`, so the hook chain of the owning
 * fiber carries a `{ current: <editor> }` — found by DUCK TYPE rather than by
 * counting hooks, so adding a ref above it cannot move the answer.
 */
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

const READ_ACTIONS = `(() => {
  const ed = ${EDITOR_HOOK};
  if (ed === null) return { error: 'no editor found on the fiber' };
  const all = ed.getSupportedActions().map((a) => ({ id: a.id, label: a.label, alias: a.alias ?? null }));
  const named = ${JSON.stringify(NAMED)}.map(([row, id]) => {
    const viaGet = ed.getAction(id);
    const viaList = all.find((a) => a.id === id) ?? null;
    return { row, id, getAction: viaGet !== null && viaGet !== undefined, listed: viaList !== null, label: viaList ? viaList.label : (viaGet ? viaGet.label : null) };
  });
  return { count: all.length, all, named, uri: String(ed.getModel() ? ed.getModel().uri : ''), language: ed.getModel() ? ed.getModel().getLanguageId() : null };
})()`;

/**
 * THE SECOND READING, and it is the one that answers the entry's question.
 *
 * `getSupportedActions()` lists only what `registerEditorAction` registered.
 * Monaco's Cut, Copy, Paste, Select All, Undo and Redo are NOT editor actions:
 * cut/copy/paste are `MultiCommand`s registered straight into the command
 * registry (clipboard.js lines 31, 66, 103) and undo/redo/selectAll are core
 * editor commands, and `CodeEditorWidget.trigger` falls through to BOTH of
 * those registries after `getAction` misses (codeEditorWidget.js 816-827). So
 * a row can be perfectly live while the action list has never heard of it, and
 * the only honest question is whether PRESSING IT DOES ANYTHING.
 *
 * So this drives each row through the shipping call, `editor.trigger(...)`, and
 * reads the effect off the model, the selection or the widget.
 *
 * NO BYTE OF THE PERSON'S PASTEBOARD IS TOUCHED. Every clipboard path in
 * Monaco ends at `document.execCommand`, at `navigator.clipboard.writeText` on
 * the Electron-bug fallback, or at `navigator.clipboard.readText` for a read
 * (clipboard.js 171-185, 226-234). All three are replaced by recorders for the
 * length of the clipboard arm and put back in a `finally`, and capture-phase
 * cut/copy/paste listeners cancel anything that gets past them. What the row
 * reached is the RECORD, not the pasteboard.
 */
const TRIGGER_TEST = `(async () => {
  const ed = ${EDITOR_HOOK};
  if (ed === null) return { error: 'no editor found on the fiber' };
  const model = ed.getModel();
  const M = ${JSON.stringify(NAMED)};
  const out = [];
  const seed = 'alpha beta alpha\\ngamma alpha delta\\n{\\n  "k": [\\n    1,\\n    2\\n  ]\\n}\\n';
  const reset = () => {
    model.setValue(seed);
    ed.setSelection(new (model.getFullModelRange().constructor)(1, 1, 1, 1));
    ed.focus();
  };
  // The view model is behind a mangled private in the shipped bundle, so the
  // fold is read off the DRAWN face instead: the collapsed chevron in the
  // gutter, and the number of contiguous model ranges the viewport covers.
  const foldMarks = () => document.querySelectorAll('.monaco-editor .codicon-folding-collapsed').length;
  const visRanges = () => { try { return ed.getVisibleRanges().length; } catch (e) { return null; } };
  const note = (row, id, worked, how) => out.push({ row, id, worked, how });

  // ---- undo / redo, read off the model -------------------------------------
  reset();
  model.pushEditOperations([], [{ range: new (model.getFullModelRange().constructor)(1, 1, 1, 1), text: 'ZZZ ' }], () => null);
  const afterEdit = model.getValue();
  ed.trigger('p241-menu', 'undo', null);
  const afterUndo = model.getValue();
  note('Undo', 'undo', afterUndo === seed && afterEdit !== seed, 'model ' + (afterUndo === seed ? 'went back to the seed' : 'did not change'));
  ed.trigger('p241-menu', 'redo', null);
  const afterRedo = model.getValue();
  note('Redo', 'redo', afterRedo === afterEdit && afterEdit !== seed, 'model ' + (afterRedo === afterEdit ? 'came forward again' : 'did not change'));

  // ---- select all ----------------------------------------------------------
  reset();
  ed.trigger('p241-menu', 'editor.action.selectAll', null);
  let sel = ed.getSelection();
  let full = model.getFullModelRange();
  const selAllA = sel.startLineNumber === full.startLineNumber && sel.endLineNumber === full.endLineNumber && sel.endColumn === full.endColumn;
  let selAllB = false;
  if (!selAllA) {
    reset();
    ed.trigger('p241-menu', 'selectAll', null);
    sel = ed.getSelection(); full = model.getFullModelRange();
    selAllB = sel.startLineNumber === full.startLineNumber && sel.endLineNumber === full.endLineNumber && sel.endColumn === full.endColumn;
  }
  note('Select All', selAllA ? 'editor.action.selectAll' : 'selectAll', selAllA || selAllB, selAllA ? 'editor.action.selectAll selected the whole model' : selAllB ? 'editor.action.selectAll did NOTHING; the bare core id selectAll selected the whole model' : 'neither id selected anything');

  // ---- change all occurrences ---------------------------------------------
  reset();
  ed.setSelection(new (model.getFullModelRange().constructor)(1, 1, 1, 6)); // "alpha"
  ed.trigger('p241-menu', 'editor.action.changeAll', null);
  const cursors = ed.getSelections().length;
  note('Change All Occurrences', 'editor.action.changeAll', cursors > 1, cursors + ' cursor(s) after the press');

  // ---- fold / unfold -------------------------------------------------------
  // A foldable seed the JSON folding provider really answers for: the seed
  // above is not valid JSON, and a provider that returns no ranges is not the
  // same finding as a row that does nothing.
  model.setValue('{\\n  "a": {\\n    "b": 1,\\n    "c": 2\\n  },\\n  "d": 3\\n}\\n');
  ed.setPosition({ lineNumber: 2, column: 1 });
  ed.focus();
  await new Promise((r) => setTimeout(r, 1200)); // folding ranges are computed async
  const linesBefore = document.querySelectorAll('.monaco-editor .view-line').length;
  const markBefore = foldMarks();
  ed.trigger('p241-menu', 'editor.fold', null);
  await new Promise((r) => setTimeout(r, 400));
  const markFolded = foldMarks();
  const linesFolded = document.querySelectorAll('.monaco-editor .view-line').length;
  note('Fold', 'editor.fold', markFolded > markBefore || linesFolded < linesBefore, markBefore + ' collapsed chevron(s) and ' + linesBefore + ' drawn lines before, ' + markFolded + ' and ' + linesFolded + ' after');
  ed.trigger('p241-menu', 'editor.unfold', null);
  await new Promise((r) => setTimeout(r, 400));
  const markUnfolded = foldMarks();
  const linesUnfolded = document.querySelectorAll('.monaco-editor .view-line').length;
  note('Unfold', 'editor.unfold', (markFolded > markBefore || linesFolded < linesBefore) && linesUnfolded === linesBefore, linesFolded + ' drawn lines after the fold, ' + linesUnfolded + ' after the unfold');

  // ---- cut / copy / paste, with every clipboard door recorded and shut -----
  const doc = ed.getContainerDomNode().ownerDocument;
  const realExec = doc.execCommand;
  const realWrite = navigator.clipboard ? navigator.clipboard.writeText : null;
  const realRead = navigator.clipboard ? navigator.clipboard.readText : null;
  const seen = [];
  const cancel = (e) => { e.preventDefault(); e.stopPropagation(); };
  const clip = { cut: 0, copy: 0, paste: 0, writeText: 0, readText: 0 };
  try {
    for (const t of ['cut', 'copy', 'paste']) doc.addEventListener(t, cancel, true);
    doc.execCommand = function (cmd) { seen.push(cmd); if (clip[cmd] !== undefined) clip[cmd] += 1; return true; };
    if (navigator.clipboard) {
      navigator.clipboard.writeText = function () { clip.writeText += 1; return Promise.resolve(); };
      navigator.clipboard.readText = function () { clip.readText += 1; return Promise.resolve('p241 sentinel'); };
    }
    for (const [row, id, cmd] of [['Cut', 'editor.action.clipboardCutAction', 'cut'], ['Copy', 'editor.action.clipboardCopyAction', 'copy'], ['Paste', 'editor.action.clipboardPasteAction', 'paste']]) {
      reset();
      ed.setSelection(new (model.getFullModelRange().constructor)(1, 1, 1, 6));
      ed.focus();
      const n = seen.length;
      const readsBefore = clip.readText;
      const writesBefore = clip.writeText;
      let thrown = null;
      let rejected = null;
      try { ed.trigger('p241-menu', id, null); } catch (e) { thrown = String(e && e.message ? e.message : e); }
      // The same id straight at the command service, so a command that is not
      // registered says so instead of failing silently.
      try {
        const cs = ed._commandService;
        if (cs && typeof cs.executeCommand === 'function') {
          await Promise.resolve(cs.executeCommand(id)).then(() => { rejected = 'resolved'; }, (e) => { rejected = String(e && e.message ? e.message : e); });
        } else rejected = 'no _commandService on the editor';
      } catch (e) { rejected = String(e && e.message ? e.message : e); }
      await new Promise((r) => setTimeout(r, 200));
      const reached = seen.slice(n);
      const reads = clip.readText - readsBefore;
      const writes = clip.writeText - writesBefore;
      // PASTE never reaches execCommand in this build. clipboardService.triggerPaste
      // is undefined in standalone Monaco, so the code-editor implementation falls to
      // its isWeb branch and reads navigator.clipboard.readText() instead
      // (clipboard.js 279-303). Counting only execCommand called that row dead.
      const doors = [];
      for (const c of reached) doors.push("document.execCommand('" + c + "')");
      if (reads > 0) doors.push('navigator.clipboard.readText() x' + reads);
      if (writes > 0) doors.push('navigator.clipboard.writeText() x' + writes);
      const worked = reached.includes(cmd) || (cmd === 'cut' && reached.includes('copy')) || (cmd === 'paste' && reads > 0);
      const detail = (doors.length === 0 ? 'reached no clipboard door' : 'reached ' + doors.join(' then '))
        + '; textFocus=' + String(ed.hasTextFocus()) + '; commandService says ' + rejected + (thrown ? '; trigger threw ' + thrown : '');
      note(row, id, worked, detail);
    }
  } finally {
    doc.execCommand = realExec;
    if (navigator.clipboard && realWrite) navigator.clipboard.writeText = realWrite;
    if (navigator.clipboard && realRead) navigator.clipboard.readText = realRead;
    for (const t of ['cut', 'copy', 'paste']) doc.removeEventListener(t, cancel, true);
    model.setValue(seed);
  }
  // ---- find ---------------------------------------------------------------
  reset();
  ed.trigger('p241-menu', 'actions.find', null);
  await new Promise((r) => setTimeout(r, 250));
  const findUp = document.querySelector('.monaco-editor .find-widget.visible') !== null;
  note('Find', 'actions.find', findUp, findUp ? 'the find widget is visible' : 'no visible find widget');
  ed.trigger('p241-menu', 'closeFindWidget', null);
  await new Promise((r) => setTimeout(r, 150));

  // ---- go to line ---------------------------------------------------------
  reset();
  ed.trigger('p241-menu', 'editor.action.gotoLine', null);
  await new Promise((r) => setTimeout(r, 250));
  const quick = document.querySelector('.quick-input-widget') !== null && getComputedStyle(document.querySelector('.quick-input-widget')).display !== 'none';
  note('Go to Line', 'editor.action.gotoLine', quick, quick ? 'the quick input widget opened' : 'no quick input widget');
  // Deliberately NOT an Escape dispatched at the document: this app answers
  // Escape itself and closing the editor would take Monaco off the page under
  // the arms that follow. The widget's own close command is the honest exit.
  ed.trigger('p241-menu', 'workbench.action.closeQuickOpen', null);
  await new Promise((r) => setTimeout(r, 200));

  return { rows: out, clipboardDoorsReached: clip, language: model.getLanguageId() };
})()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
    if (port > 0) {
      let list = [];
      try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { list = []; }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown'] });
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch { if (cdp) { try { cdp.close(); } catch { /* already closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}
const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { if ((await cdpEval(cdp, expr, 10000)) === true) return true; if (Date.now() - s > ms) return false; await sleep(100); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null && document.querySelector('.ed-mount') !== null`;

let out = null;
await withElectron(
  {
    label: 'p241',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 10 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      // Without this the page never has real focus while a driver holds it, so
      // Monaco's hasTextFocus() reads false and the clipboard commands take
      // their generic-dom branch instead of the editor one. The menu row a
      // person presses runs with the editor focused, so the reading has to.
      try { await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch { /* older builds */ }
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project });
      await sleep(1200);
      await drive(cdp, { projectPath: project, openRel: 'data.json', mode: 'file', editorWidth: 1100 });
      let up = await until(cdp, monacoUp, 40000);
      say(`monaco up on data.json: ${String(up)}`);
      await sleep(800);
      const json = await cdpEval(cdp, READ_ACTIONS, 20000);
      // A REAL click on a real line, so Monaco's own focus tracker says the
      // editor has TEXT focus. Three of the eleven rows branch on that.
      const box = await cdpEval(cdp, `(() => { const l = document.querySelector('.monaco-editor .view-line'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: Math.round(r.left + 4), y: Math.round(r.top + r.height / 2) }; })()`);
      if (box !== null) {
        for (const type of ['mousePressed', 'mouseReleased']) {
          await cdp.call('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
        }
        await sleep(300);
      }
      say(`clicked into the editor at ${JSON.stringify(box)}; hasTextFocus=${String(await cdpEval(cdp, `(() => { const e = ${EDITOR_HOOK}; return e ? e.hasTextFocus() : null; })()`))}`);
      const triggers = await cdpEval(cdp, TRIGGER_TEST, 90000);
      // The same action reading on a MARKDOWN tab, because the menu has to be
      // honest on the file the person's tables live in as well.
      await drive(cdp, { projectPath: project, openRel: 'notes.md', mode: 'file' });
      await sleep(1200);
      const modes = await cdpEval(cdp, `(() => { const bs = Array.from(document.querySelectorAll('.ed-tabs-actions .ed-mode [role="radio"]')); return { options: bs.map((b) => b.getAttribute('aria-label')), checked: bs.filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.getAttribute('aria-label')), mount: document.querySelector('.ed-mount') !== null }; })()`);
      say(`notes.md mode control: ${JSON.stringify(modes)}`);
      await cdpEval(cdp, `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="Source"]'); if (!b) return false; b.click(); return true; })()`);
      up = await until(cdp, monacoUp, 40000);
      say(`monaco up on notes.md: ${String(up)}`);
      await sleep(800);
      const md = await cdpEval(cdp, READ_ACTIONS, 20000);
      out = { md, json, triggers };
    } finally {
      try { cdp.close(); } catch { /* already closed */ }
    }
  }
);

const opAfter = operatorCount();
say(`operator -L gmux sessions: ${opBefore} before, ${opAfter} after`);
if (out === null || out.json === undefined || out.json.error !== undefined) {
  console.error(`${TAG} FAILED: ${JSON.stringify(out).slice(0, 400)}`);
  process.exit(1);
}
writeFileSync(join(root, 'actions.json'), JSON.stringify(out, null, 2));
say(`json tab:     ${out.json.count} supported actions, language ${out.json.language}`);
say(`markdown tab: ${out.md.error ?? `${out.md.count} supported actions, language ${out.md.language}`}`);
console.log('\nEVERY ACTION getSupportedActions() LISTS ON THE JSON TAB');
console.log('id                                                  label');
for (const a of out.json.all.slice().sort((x, y) => x.id.localeCompare(y.id))) {
  console.log(`${a.id.padEnd(51)} ${a.label}`);
}
console.log('\nTHE ELEVEN ROWS THE ENTRY NAMES — READING 1, getSupportedActions()/getAction()');
console.log('row                       id                                        getAction  listed  label');
for (const n of out.json.named) {
  console.log(`${n.row.padEnd(25)} ${n.id.padEnd(41)} ${String(n.getAction).padEnd(10)} ${String(n.listed).padEnd(7)} ${n.label ?? '-'}`);
}
console.log('\nTHE ELEVEN ROWS — READING 2, WHAT PRESSING IT ACTUALLY DID');
if (out.triggers.error !== undefined) console.log(`  ${out.triggers.error}`);
else {
  console.log('row                       id                                        pressed?  what happened');
  for (const r of out.triggers.rows) console.log(`${r.row.padEnd(25)} ${r.id.padEnd(41)} ${(r.worked ? 'WORKS' : 'DEAD').padEnd(9)} ${r.how}`);
  console.log(`\nclipboard doors reached (all recorded, none real): ${JSON.stringify(out.triggers.clipboardDoorsReached)}`);
}
if (out.md.error === undefined) {
  const mdIds = new Set(out.md.all.map((a) => a.id));
  const jsonIds = new Set(out.json.all.map((a) => a.id));
  console.log(`\nonly on the JSON tab: ${[...jsonIds].filter((i) => !mdIds.has(i)).join(', ') || 'none'}`);
  console.log(`only on the markdown tab: ${[...mdIds].filter((i) => !jsonIds.has(i)).join(', ') || 'none'}`);
}
say(`written to ${join(root, 'actions.json')}`);
