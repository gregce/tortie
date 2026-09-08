#!/usr/bin/env node
/**
 * probe-p227-rewind.mjs. THE PHASE 227 APP RUN, extending probe-p225-baseline's
 * shape: one Electron on a scratch profile, a scratch HOME and this script's
 * own tmux socket. It spawns no agent, spends no token, opens no keychain,
 * makes no request and reads nothing under the person's home. The "agent" that
 * writes a file from outside is a plain `/bin/sh` running `cat`, the charter's
 * own wording, and every file a rewind writes is inside the scratch project.
 *
 * ## WHAT IT PROVES, run rather than read
 *
 *   R1  draw a redline over an agent-shaped edit, jump to a change by keyboard
 *       (⌥↓), press rewind (⌥⌫), read the file FROM DISK and prove the phrase
 *       is back and every other edit stands
 *   R2  press undo (⌥⇧⌫) and prove the file returns byte for byte
 *   R3  a plain shell writes the pressed phrase to a third value between the
 *       draw and the press; the rewind is refused, the refusal sentence is on
 *       the face, and the shell's bytes survive on disk
 *   R4  the person types and saves their own paragraph; pressing it rewinds it
 *       from disk and undo brings it back (ruling 1 driven, research 83 A8a)
 *   R5  the resting face carries nothing drawn: the wrappers have tabindex -1
 *       and the identity attributes and no button, chip or control text
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` whatever happened. The tmux socket is this
 * script's own; `gmux` and `default` are refused by name. The operator's own
 * `-L gmux` sessions are counted before and after and must not move. Every
 * other process is a synchronous `git` or `/bin/sh` that has exited before the
 * call returns. `--self-test` proves the grader on fixtures and launches
 * nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p227]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const rows = [];
function check(step, claim, pass, detail) {
  rows.push({ step, claim, pass, detail });
  if (!pass) failures.push(`${step}. ${claim} — ${detail}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}

// ---------------------------------------------------------------------------
// The grader, proved under --self-test: a rewind is right when the pressed
// phrase is back and every other named edit stands.
// ---------------------------------------------------------------------------
function rewindFindings(disk, wantBack, wantStand, wantGone) {
  const out = [];
  if (!disk.includes(wantBack)) out.push(`the rewound phrase ${JSON.stringify(wantBack)} is not back`);
  for (const s of wantStand) if (!disk.includes(s)) out.push(`a phrase that should stand is gone: ${JSON.stringify(s)}`);
  for (const s of wantGone ?? []) if (disk.includes(s)) out.push(`a phrase that should be gone stands: ${JSON.stringify(s)}`);
  return out;
}

function selfTest() {
  const fixtures = [
    { label: 'a clean rewind', disk: 'A disposable client here, quitting the app, rebuilt.', back: 'disposable client', stand: ['quitting the app', 'rebuilt'], gone: ['throwaway viewer'], want: 0 },
    { label: 'the phrase not back', disk: 'A throwaway viewer, quitting the app.', back: 'disposable client', stand: ['quitting the app'], gone: [], want: 1 },
    { label: 'another edit lost', disk: 'A disposable client, closing the window.', back: 'disposable client', stand: ['quitting the app'], gone: [], want: 1 },
    { label: 'the old phrase still there', disk: 'A disposable client and a throwaway viewer.', back: 'disposable client', stand: [], gone: ['throwaway viewer'], want: 1 }
  ];
  let ok = true;
  for (const f of fixtures) {
    const got = rewindFindings(f.disk, f.back, f.stand, f.gone).length;
    const good = got === f.want;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${f.label}: ${got} finding(s), wanted ${f.want}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${fixtures.length} fixtures, ${ok ? 'all behaved' : 'one or more did not'}`);
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p227', `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();

mkdirSync(join(harnessDir, 'p227'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p227'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'app-run-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};
const disk = (rel) => readFileSync(join(project, rel), 'utf8');

const para = (n, w) => `Paragraph ${n} of the notes, ${w}, keeps going for a while so that the document has a body worth reading and a sentence that can change.`;
// V1 committed (the baseline). V2 the agent's eight scattered edits, as p225.
const V1 = ['Tortie keeps every session alive in a private tmux server, so closing the window is safe.', '', para(1, 'first'), '', 'The application is a disposable client that gets out of the way.', '', para(3, 'third'), ''].join('\n');
const V2 = V1
  .replace('keeps every session alive', 'holds every session open')
  .replace('closing the window', 'quitting the app')
  .replace('disposable client', 'throwaway viewer')
  .replace('gets out of the way', 'stays out of the way');

writeFileSync(join(project, 'notes.txt'), V1);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p227@example.invalid');
git('config', 'user.name', 'p227');
git('add', '.');
git('commit', '-q', '-m', 'first');
if (disk('notes.txt') !== V1) throw new Error('fixture');

// ---------------------------------------------------------------------------
const READ = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const leaves = doc ? Array.from(doc.childNodes).flatMap((n) => (n.nodeType === 1 && n.classList && n.classList.contains('ed-redline-change') ? Array.from(n.childNodes) : [n])) : null;
  const runs = leaves ? leaves.map((n) => ({ kind: n.nodeType === 1 ? (n.tagName === 'DEL' ? 'del' : n.tagName === 'INS' ? 'ins' : 'same') : 'same', text: n.textContent ?? '' })) : null;
  const wraps = doc ? Array.from(doc.querySelectorAll('.ed-redline-change')).map((w) => ({ off: Number(w.dataset.changeOff), del: w.dataset.changeDel ?? '', ins: w.dataset.changeIns ?? '', gen: Number(w.dataset.changeGen), tab: w.getAttribute('tabindex'), focused: w === document.activeElement })) : [];
  const a = document.activeElement;
  const active = a && a.classList && a.classList.contains('ed-redline-change') ? { off: Number(a.dataset.changeOff), del: a.dataset.changeDel ?? '', ins: a.dataset.changeIns ?? '' } : null;
  const toast = Array.from(document.querySelectorAll('.toasts .toast-text')).map((t) => t.textContent ?? '');
  return {
    runs, wraps, active,
    inss: runs ? runs.filter((r) => r.kind === 'ins').map((r) => r.text) : null,
    dels: runs ? runs.filter((r) => r.kind === 'del').map((r) => r.text) : null,
    since: document.querySelector('.ed-redline-view .ed-redline-since .banner-text')?.textContent ?? null,
    undoNote: document.querySelector('.ed-redline-view .ed-redline-undo .banner-text')?.textContent ?? null,
    toast,
    docHTML: doc ? doc.outerHTML : null,
    skeleton: document.querySelector('.ed-redline-view .ed-skeleton') !== null,
    scrollerFocused: document.querySelector('.ed-redline-scroll') === document.activeElement
  };
})()`;
const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const focusScroller = `(() => { const s = document.querySelector('.ed-redline-scroll'); if (!s) return false; s.focus(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const docHasChange = `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelector('del,ins') !== null; })()`;
const monacoUp = `document.querySelector('.monaco-editor .view-lines') !== null`;

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
        } catch { if (cdp) { try { cdp.close(); } catch { /* closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}
const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { if ((await cdpEval(cdp, expr, 10000)) === true) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const untilDisk = async (rel, pred, ms) => { const s = Date.now(); for (;;) { let d = ''; try { d = disk(rel); } catch { d = ''; } if (pred(d)) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
const read = (cdp) => cdpEval(cdp, READ, 10000);
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}) });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const ALT_DOWN = { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 };
const ALT_BS = { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 };
const ALT_SHIFT_BS = { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 9 };
const CMD_S = { key: 's', code: 'KeyS', vk: 83, modifiers: 4 };
const CMD_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 4 };

/** Move focus to the wrapper whose ins contains `needle`, by repeated ⌥↓. */
async function focusChangeWith(cdp, needle, limit) {
  await cdpEval(cdp, focusScroller);
  await sleep(120);
  for (let i = 0; i < (limit ?? 12); i++) {
    await press(cdp, ALT_DOWN);
    await sleep(80);
    const r = await read(cdp);
    if (r.active && (r.active.ins.includes(needle) || r.active.del.includes(needle))) return r.active;
  }
  return null;
}
const readings = {};

await withElectron(
  { label: 'p227', userDataDir: profile, tmuxSocket: null, cwd: REPO, args: ['--remote-debugging-port=0', '--use-mock-keychain'], env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }), ceilingMs: 15 * 60 * 1000 },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project });
      await sleep(1200);

      // The agent's edit lands from outside, then open Diff -> Redline.
      shellWrite('notes.txt', V2);
      await sleep(400);
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff', editorWidth: 1100 });
      await sleep(700);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 15000);
      await until(cdp, docHasChange, 15000);
      await sleep(400);
      let r = readings.draw = await read(cdp);
      check('R0.draw', 'the redline drew the agent edits as changes with wrappers', r.wraps.length >= 4 && r.inss.some((t) => t.includes('throwaway viewer')), `wraps ${r.wraps.length}`);
      check('R0.tab', 'every change wrapper is tabindex -1', r.wraps.every((w) => w.tab === '-1'), JSON.stringify(r.wraps.map((w) => w.tab)));
      check('R0.rest', 'nothing is drawn on the resting face (no button, no chip)', typeof r.docHTML === 'string' && !r.docHTML.includes('<button') && !r.docHTML.includes('data-redline-tag'), '');

      // R1: jump to a change by keyboard and rewind it.
      const active = await focusChangeWith(cdp, 'throwaway viewer');
      check('R1.focus', 'a change took focus by keyboard (⌥↓)', active !== null && active.ins.includes('throwaway viewer'), JSON.stringify(active));
      await press(cdp, ALT_BS);
      const backOnDisk = await untilDisk('notes.txt', (d) => d.includes('disposable client'), 15000);
      const d1 = disk('notes.txt');
      readings.afterRewind = d1;
      const f1 = rewindFindings(d1, 'disposable client', ['quitting the app', 'holds every session open', 'stays out of the way'], ['throwaway viewer']);
      check('R1.disk', 'the pressed phrase is back on disk and every other agent edit stands', backOnDisk && f1.length === 0, f1.join('; '));

      // R2: undo brings it back.
      await until(cdp, docSettled, 15000);
      await sleep(400);
      r = await read(cdp);
      check('R2.note', 'the face offers undo for the session', typeof r.undoNote === 'string' && r.undoNote.includes('this session'), JSON.stringify(r.undoNote));
      await cdpEval(cdp, focusScroller);
      await sleep(120);
      await press(cdp, ALT_SHIFT_BS);
      const undone = await untilDisk('notes.txt', (d) => d.includes('throwaway viewer'), 15000);
      readings.afterUndo = disk('notes.txt');
      check('R2.disk', 'undo returned the file byte for byte', undone && disk('notes.txt') === V2, `equalsV2=${disk('notes.txt') === V2}`);

      // R3: a shell writes the pressed phrase to a THIRD value between the draw
      // and the press; the rewind is refused and the shell's bytes survive.
      await until(cdp, docSettled, 15000);
      await sleep(400);
      const active3 = await focusChangeWith(cdp, 'quitting');
      check('R3.focus', 'focused the closing->quitting change', active3 !== null, JSON.stringify(active3));
      const V3 = disk('notes.txt').replace('quitting', 'shutting');
      shellWrite('notes.txt', V3); // lands after the draw, before the press
      await press(cdp, ALT_BS); // no sleep: the wrapper is still the drawn one
      await sleep(700);
      r = readings.refusal = await read(cdp);
      const refused = r.toast.some((t) => t.includes('no longer in') || t.includes('already back') || t.includes('changed as you pressed'));
      check('R3.refused', 'the rewind was refused with a sentence on the face', refused, JSON.stringify(r.toast));
      check('R3.survived', "the shell's bytes survived on disk", disk('notes.txt') === V3 && disk('notes.txt').includes('shutting the app'), `equalsV3=${disk('notes.txt') === V3}`);

      // R4: the person's own paragraph. First bring the file back to the
      // committed baseline (the agent's edits away), so the person's paragraph
      // is the only edit; HEAD never moved, so the baseline is still V1.
      shellWrite('notes.txt', V1);
      await sleep(1800);
      await cdpEval(cdp, clickMode('File'));
      await until(cdp, monacoUp, 15000);
      await sleep(500);
      const box = await cdpEval(cdp, `(() => { const l = document.querySelector('.monaco-editor .view-line'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + 2, y: r.top + r.height / 2 }; })()`);
      check('R4.editor', 'Monaco drew a line to click into', box !== null, JSON.stringify(box));
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(200);
      await press(cdp, CMD_UP);
      for (const ch of 'Mine. ') await press(cdp, { key: ch, code: ch === ' ' ? 'Space' : ch === '.' ? 'Period' : 'Key' + ch.toUpperCase(), vk: ch === ' ' ? 32 : ch === '.' ? 190 : ch.toUpperCase().charCodeAt(0), modifiers: 0, text: ch });
      await sleep(300);
      await press(cdp, CMD_S);
      const savedOwn = await untilDisk('notes.txt', (d) => d.startsWith('Mine. '), 8000);
      check('R4.saved', "the person's paragraph is saved to disk", savedOwn && disk('notes.txt').startsWith('Mine. '), disk('notes.txt').slice(0, 12));
      const ownV = disk('notes.txt');
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 15000);
      await until(cdp, docHasChange, 15000);
      await sleep(400);
      const activeOwn = await focusChangeWith(cdp, 'Mine.');
      check('R4.focus', "focused the person's own inserted words", activeOwn !== null && activeOwn.ins.includes('Mine.'), JSON.stringify(activeOwn));
      await press(cdp, ALT_BS);
      const ownGone = await untilDisk('notes.txt', (d) => !d.startsWith('Mine. '), 15000);
      check('R4.rewind', "pressing the person's own paragraph rewinds it from disk (ruling 1)", ownGone && disk('notes.txt') === V1, `equalsV1=${disk('notes.txt') === V1}`);
      await until(cdp, docSettled, 15000);
      await sleep(400);
      await cdpEval(cdp, focusScroller);
      await sleep(120);
      await press(cdp, ALT_SHIFT_BS);
      const ownBack = await untilDisk('notes.txt', (d) => d.startsWith('Mine. '), 15000);
      check('R4.undo', "undo brings the person's paragraph back byte for byte", ownBack && disk('notes.txt') === ownV, `equalsOwn=${disk('notes.txt') === ownV}`);

      // R5: the resting document markup one more time, on the recomposed view.
      await until(cdp, docSettled, 15000);
      await sleep(400);
      r = readings.resting = await read(cdp);
      const onlyKnownTags = typeof r.docHTML === 'string' && /^(<span[^>]*>|<\/span>|<del[^>]*>|<\/del>|<ins[^>]*>|<\/ins>|[^<]*)*$/.test(r.docHTML.replace('<div class="ed-redline ed-redline-doc" data-redline="">', '').replace(/<\/div>$/, ''));
      check('R5.resting', 'the resting markup is spans, dels, ins and wrappers only, no control', typeof r.docHTML === 'string' && !r.docHTML.includes('<button') && !r.docHTML.includes('Rewind') && !r.docHTML.includes('Undo'), '');
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
check('X.operator', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${opBefore} -> ${opAfter}`);
say(`readings written to ${readingsFile}`);
say(`${rows.filter((r) => r.pass).length} pass, ${failures.length} fail`);
for (const f of failures) console.log(`${TAG} FAIL ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
