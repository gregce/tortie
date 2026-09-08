#!/usr/bin/env node
/**
 * probe-p236-chip.mjs. THE PHASE 236 VERIFIER'S APP RUN.
 *
 * Written by the VERIFIER, independent of the builder, who ran no app at all.
 * One Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket. It spawns no agent, spends no token, opens no keychain and makes no
 * request. The "agent" that writes a file from outside is a plain /bin/sh
 * running cat.
 *
 * ## THE REQUIRED INDEPENDENT METHOD: THE LAYOUT MEASUREMENT
 *
 * Research 83 D.2 measured an IN-FLOW control moving the following text
 * 45.12px sideways at every change, and D.3 measured an out-of-flow overlay
 * moving it by 0.00px. So the whole ruling is a number, and L1 takes it: the
 * document's height and EVERY change's getClientRects()[0], with nothing
 * focused and nothing hovered, then again with the chip shown, and the two
 * must be identical to the pixel.
 *
 * L2 IS THE RULER'S OWN ABLATION, and it is why L1 is a check rather than a
 * recital: the same numbers are taken a third time with a real in-flow copy of
 * the chip spliced into the document, which is the shape research 83 refused,
 * and they MUST move. A measurement that cannot register the refused shape
 * proves nothing about the accepted one.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` whatever happened. The tmux socket is this
 * script's own and is ended and unlinked by build/harness-socket.mjs; `gmux`
 * and `default` are refused by name. The operator's own -L gmux sessions are
 * counted before and after, read only, and must not move. The system
 * pasteboard is saved in every flavour before the one copy this run takes and
 * put back in a `finally` inside the main process. Every file this run writes
 * is under GMUX_HARNESS_DIR.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p236]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const rows = [];
function check(step, claim, pass, detail) {
  rows.push({ step, claim, pass, detail: detail ?? '' });
  if (!pass) failures.push(`${step}. ${claim} — ${detail ?? ''}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}
function note(step, claim, detail) {
  rows.push({ step, claim, pass: null, detail: detail ?? '' });
  say(`note  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}

// ---------------------------------------------------------------------------
// The graders, proved under --self-test.
// ---------------------------------------------------------------------------

/** Two layout readings are the same when every number matches to the pixel. */
function layoutFindings(a, b) {
  const out = [];
  if (a === null || b === null) return ['a reading is missing'];
  for (const k of ['docTop', 'docLeft', 'docWidth', 'docHeight', 'scrollHeight']) {
    if (a[k] !== b[k]) out.push(`${k} moved ${String(a[k])} -> ${String(b[k])}`);
  }
  if (a.rects.length !== b.rects.length) {
    out.push(`change count moved ${a.rects.length} -> ${b.rects.length}`);
    return out;
  }
  for (let i = 0; i < a.rects.length; i += 1) {
    const x = a.rects[i];
    const y = b.rects[i];
    for (const k of ['left', 'top', 'width', 'height']) {
      if (x[k] !== y[k]) out.push(`change ${i} first rect ${k} moved ${String(x[k])} -> ${String(y[k])}`);
    }
  }
  return out;
}

/** The chip is on the change when its box starts at the change's FIRST rect. */
function anchorFindings(chip, first, union, view, gap, tol) {
  const out = [];
  if (chip === null || chip === undefined) return ['no chip is drawn'];
  if (first === null || first === undefined) return ['the change has no client rect'];
  const wantLeft = view.left + Math.max(0, Math.min(first.left - view.left, view.width - chip.width));
  if (Math.abs(chip.left - wantLeft) > tol) {
    out.push(`chip.left ${chip.left.toFixed(2)} is not the first rect's ${wantLeft.toFixed(2)}`);
  }
  const above = Math.abs(chip.bottom - (first.top - gap)) <= tol;
  const below = Math.abs(chip.top - (first.bottom + gap)) <= tol;
  const clamped = Math.abs(chip.top - view.top) <= tol || Math.abs(chip.bottom - (view.top + view.height)) <= tol;
  if (!above && !below && !clamped) {
    out.push(`chip is neither above (${chip.bottom.toFixed(2)} vs ${(first.top - gap).toFixed(2)}) nor below (${chip.top.toFixed(2)} vs ${(first.bottom + gap).toFixed(2)}) the first rect`);
  }
  if (union !== null && Math.abs(union.left - first.left) > 1) {
    const wrongLeft = view.left + Math.max(0, Math.min(union.left - view.left, view.width - chip.width));
    if (Math.abs(chip.left - wrongLeft) <= tol) {
      out.push(`chip is at the BOUNDING BOX, ${(first.left - union.left).toFixed(2)}px from where the change starts`);
    }
  }
  return out;
}

function selfTest() {
  const R = (left, top, width, height) => ({ left, top, width, height, bottom: top + height, right: left + width });
  const base = { docTop: 1, docLeft: 2, docWidth: 3, docHeight: 4, scrollHeight: 5, rects: [R(10, 20, 30, 15), R(50, 60, 20, 15)] };
  const same = JSON.parse(JSON.stringify(base));
  const movedSide = JSON.parse(JSON.stringify(base));
  movedSide.rects[1].left = 95.12;
  const movedTall = JSON.parse(JSON.stringify(base));
  movedTall.docHeight = 5.42;
  const fewer = JSON.parse(JSON.stringify(base));
  fewer.rects.pop();
  const view = R(569, 110, 871, 775);
  const first = R(1185.82, 433.23, 44.7, 15);
  const union = R(750.09, 433.23, 480.43, 36.45);
  const good = R(1185.82, 401.23, 200, 28);
  const onUnion = R(750.09, 401.23, 200, 28);
  const fixtures = [
    ['identical readings', () => layoutFindings(base, same).length, 0],
    ['one change pushed sideways', () => layoutFindings(base, movedSide).length, 1],
    ['the document grew taller', () => layoutFindings(base, movedTall).length, 1],
    ['a change disappeared', () => layoutFindings(base, fewer).length, 1],
    ['the chip on the first rect, above', () => anchorFindings(good, first, union, view, 4, 0.6).length, 0],
    ['the chip on the bounding box', () => anchorFindings(onUnion, first, union, view, 4, 0.6).length, 2],
    ['the chip below the line', () => anchorFindings(R(1185.82, 452.23, 200, 28), first, union, view, 4, 0.6).length, 0],
    ['the chip nowhere near it', () => anchorFindings(R(1185.82, 700, 200, 28), first, union, view, 4, 0.6).length, 1]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good2 = got === want;
    ok = ok && good2;
    say(`${good2 ? 'ok  ' : 'FAIL'} self-test ${label}: ${got} finding(s), wanted ${want}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${fixtures.length} fixtures, ${ok ? 'all behaved' : 'one or more did not'}`);
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p236', `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p236'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p236'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'verifier-readings.json');
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

// TALL ON PURPOSE, and every change's bytes are UNIQUE, with no hyphen or
// digit inside a changing word: the redline tokenises on word boundaries, so
// `keeps-1` -> `holds-1` is really `keeps` -> `holds` with `-1` unchanged, and
// a grader keyed on the hyphenated form is grading its own mistake. Each
// section therefore carries its own vocabulary. One change per section is an
// EIGHT WORD phrase in which every token differs, placed mid-sentence, so at a
// narrow pane it spans several line boxes and its bounding box starts to the
// LEFT of where it really starts. That is the shape the mandatory
// getClientRects()[0] rule exists for.
const SECTIONS = [
  { a: 'keeps', b: 'holds', pa: 'quick brown foxes jumped clean across twelve tall fences', pb: 'swift crimson hounds vaulted neatly beyond thirteen wide hedges' },
  { a: 'guards', b: 'shields', pa: 'eager purple herons dived sharply beneath eleven old bridges', pb: 'patient golden storks plunged gently under fourteen new arches' },
  { a: 'tracks', b: 'follows', pa: 'noisy yellow beetles crawled slowly around nineteen grey stones', pb: 'silent orange weevils scuttled quickly beside sixteen pale pebbles' }
];
const V1 = (() => {
  const out = [];
  SECTIONS.forEach((sec, n) => {
    const i = n + 1;
    out.push(`Section ${i}. Tortie ${sec.a} every session alive in a private tmux server, and the ${sec.pa} over the lazy dog while the window is closed.`);
    out.push('');
    for (let k = 1; k <= 8; k += 1) {
      out.push(`Paragraph ${i}.${k} of the notes keeps going for a while so that the document has a body worth reading and enough height that the scroller really scrolls.`);
      out.push('');
    }
  });
  return out.join('\n');
})();
const PAIRS = SECTIONS.flatMap((sec) => [[sec.a, sec.b], [sec.pa, sec.pb]]);
const V2 = PAIRS.reduce((text, [a, b]) => text.split(a).join(b), V1);

writeFileSync(join(project, 'notes.txt'), V1);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p236@example.invalid');
git('config', 'user.name', 'p236');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// The reads, all off the LIVE DOM.
// ---------------------------------------------------------------------------

/** The independent layout ruler. Full precision, no rounding anywhere. */
const LAYOUT = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  if (doc === null) return null;
  const d = doc.getBoundingClientRect();
  const rect = (el) => { const r = el.getClientRects()[0]; return r ? { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right } : null; };
  return {
    docTop: d.top, docLeft: d.left, docWidth: d.width, docHeight: d.height,
    scrollHeight: doc.scrollHeight,
    scrollTop: document.querySelector('.ed-redline-scroll').scrollTop,
    rects: Array.from(doc.querySelectorAll('.ed-redline-change')).map(rect),
    text: doc.textContent
  };
})()`;

const FACE = `(() => {
  const view = document.querySelector('.ed-redline-view');
  const doc = document.querySelector('.ed-redline-doc');
  const chip = document.querySelector('.ed-redline-chip');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
  const wraps = doc ? Array.from(doc.querySelectorAll('.ed-redline-change')) : [];
  const idx = chip === null ? -1 : wraps.findIndex((w) => {
    const r = w.getClientRects()[0];
    if (!r) return false;
    const c = chip.getBoundingClientRect();
    const v = document.querySelector('.ed-redline-view').getBoundingClientRect();
    const want = v.left + Math.max(0, Math.min(r.left - v.left, v.width - c.width));
    return Math.abs(c.left - want) <= 0.6;
  });
  const a = document.activeElement;
  return {
    chip: box(chip),
    chipHTML: chip ? chip.outerHTML : null,
    chipText: chip ? chip.textContent : null,
    chipTagged: chip ? chip.hasAttribute('data-redline-tag') : null,
    chipInsideDoc: chip && doc ? doc.contains(chip) : null,
    chipParent: chip && chip.parentElement ? chip.parentElement.className : null,
    buttons: chip ? Array.from(chip.querySelectorAll('button')).map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label') ?? b.textContent, title: b.getAttribute('title'), tabIndex: b.tabIndex, w: r.width, h: r.height, left: r.left, top: r.top, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }) : null,
    chipOnChange: idx,
    changes: wraps.map((w) => { const r = w.getClientRects()[0]; const u = w.getBoundingClientRect(); return { rects: w.getClientRects().length, first: r ? { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right } : null, union: { left: u.left, top: u.top, width: u.width, height: u.height, bottom: u.bottom, right: u.right }, del: w.dataset.changeDel ?? '', ins: w.dataset.changeIns ?? '', off: Number(w.dataset.changeOff), focused: w === document.activeElement }; }),
    view: box(view),
    scroller: box(document.querySelector('.ed-redline-scroll')),
    activeIsChange: a !== null && a.classList !== undefined && a.classList.contains('ed-redline-change'),
    activeOff: a !== null && a.dataset ? Number(a.dataset.changeOff) : null,
    viewHTML: view ? view.outerHTML : null,
    docHTML: doc ? doc.outerHTML : null,
    notes: Array.from(document.querySelectorAll('.ed-redline-view .ed-note .banner-text')).map((n) => n.textContent),
    toast: Array.from(document.querySelectorAll('.toasts .toast-text')).map((t) => t.textContent ?? ''),
    skeleton: document.querySelector('.ed-redline-view .ed-skeleton') !== null
  };
})()`;

const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const focusScroller = `(() => { const s = document.querySelector('.ed-redline-scroll'); if (!s) return false; s.focus(); return true; })()`;
const blurAll = `(() => { const a = document.activeElement; if (a && a.blur) a.blur(); document.body.focus?.(); return document.activeElement === document.body || document.activeElement === null; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const docHasChange = `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelector('del,ins') !== null; })()`;

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
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) { try { return await wsConnect(m[1]); } catch { /* not up yet */ } }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}
async function mainEval(cdp, expression, ms = 20000) {
  const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, ms);
  if (r.result?.exceptionDetails) throw new Error(`main threw: ${JSON.stringify(r.result.exceptionDetails).slice(0, 400)}`);
  return r.result?.result?.value;
}

const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { if ((await cdpEval(cdp, expr, 10000)) === true) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const untilDisk = async (rel, pred, ms) => { const s = Date.now(); for (;;) { let d = ''; try { d = disk(rel); } catch { d = ''; } if (pred(d)) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
const face = (cdp) => cdpEval(cdp, FACE, 20000);
const layout = (cdp) => cdpEval(cdp, LAYOUT, 20000);

async function move(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, clickCount: 0, pointerType: 'mouse' });
}
async function clickAt(cdp, x, y) {
  await move(cdp, x, y);
  await sleep(60);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
}
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}) });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const ALT_DOWN = { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 };

/** A point inside a change's FIRST client rect, in viewport coordinates. */
const pointIn = (r) => ({ x: r.left + Math.min(8, r.width / 2), y: r.top + r.height / 2 });

/** Hover the change at `index` and wait for the chip to answer for it. */
async function hoverChange(cdp, index, ms = 3000) {
  const f0 = await face(cdp);
  if (f0.changes[index] === undefined) return { ok: false, why: `no change ${index}` };
  // A change below the fold has a client rect outside the scroller, so a mouse
  // move at it would land on whatever is really there. Bring it into view
  // first, the way a person scrolling to it would.
  await cdpEval(cdp, `(() => {
    const s = document.querySelector('.ed-redline-scroll');
    const w = document.querySelectorAll('.ed-redline-doc .ed-redline-change')[${String(index)}];
    if (!s || !w) return false;
    const r = w.getClientRects()[0];
    const sr = s.getBoundingClientRect();
    if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) s.scrollTop = s.scrollTop + (r.top - sr.top) - Math.round(sr.height / 2);
    return true;
  })()`, 20000);
  await sleep(300);
  const f0b = await face(cdp);
  const target = f0b.changes[index];
  if (!target || target.first === null) return { ok: false, why: `no rect for change ${index}` };
  const p = pointIn(target.first);
  await move(cdp, p.x, p.y);
  const started = Date.now();
  for (;;) {
    const f = await face(cdp);
    if (f.chip !== null) return { ok: true, face: f, point: p, index };
    if (Date.now() - started > ms) return { ok: false, why: 'no chip appeared', face: f, point: p, index };
    await sleep(100);
  }
}

const readings = {};

await withElectron(
  {
    label: 'p236',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 20 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    const main = await cdpForMain(handle, 60000);
    say('attached to the MAIN process over the node inspector');
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project });
      await sleep(1200);

      // The agent's edit lands from outside, then Diff -> Redline.
      shellWrite('notes.txt', V2);
      await sleep(500);
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff', editorWidth: 1100 });
      await sleep(900);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await until(cdp, docHasChange, 20000);
      await sleep(600);

      // -------------------------------------------------------------------
      // D. The resting face, nothing focused and nothing hovered.
      // -------------------------------------------------------------------
      await cdpEval(cdp, blurAll);
      await move(cdp, 4, 4);
      await sleep(400);
      let f = readings.resting = await face(cdp);
      check('D1', 'the redline drew the agent edits as changes', f.changes.length >= 3, `${f.changes.length} changes`);
      check('D2', 'NO chip is drawn on the resting face', f.chip === null, JSON.stringify(f.chip));
      check('D3', 'the resting VIEW carries no button of any kind', typeof f.viewHTML === 'string' && !f.viewHTML.includes('<button'), '');
      check('D4', 'the resting DOCUMENT is spans, dels, ins and wrappers only', typeof f.docHTML === 'string' && !f.docHTML.includes('<button') && !f.docHTML.includes('ed-redline-chip') && !f.docHTML.includes('data-redline-tag'), '');
      note('D5', 'the notes drawn on the resting face', JSON.stringify(f.notes));
      const hintDrawn = f.notes.some((n) => (n ?? '').includes('Hover a change'));
      check('D6', 'the first-run line is drawn once, in the note slot, as ONE sentence', hintDrawn && f.notes.filter((n) => (n ?? '').includes('Hover a change')).length === 1 && (f.notes.find((n) => (n ?? '').includes('Hover a change')) ?? '').split('.').filter((s) => s.trim() !== '').length === 1, JSON.stringify(f.notes.find((n) => (n ?? '').includes('Hover a change'))));

      // -------------------------------------------------------------------
      // L. THE INDEPENDENT METHOD: the layout, before and after the chip.
      // -------------------------------------------------------------------
      const before = readings.layoutBefore = await layout(cdp);
      const h = await hoverChange(cdp, 0);
      check('L0', 'hovering a change draws the chip', h.ok, h.ok ? '' : h.why);
      const after = readings.layoutAfter = await layout(cdp);
      const l1 = layoutFindings(before, after);
      check('L1', 'THE DOCUMENT DOES NOT MOVE BY ONE PIXEL WHEN THE CHIP APPEARS', l1.length === 0, l1.join('; ') || `${before.rects.length} changes, height ${before.docHeight}, all identical`);

      // L2: the ruler's own ablation. Splice a REAL in-flow copy of the chip
      // into the document, which is the shape research 83 D.2 refused, and the
      // same numbers MUST move. A ruler that cannot see 45px is not a ruler.
      const planted = await cdpEval(cdp, `(() => {
        const chip = document.querySelector('.ed-redline-chip');
        const doc = document.querySelector('.ed-redline-doc');
        if (chip === null || doc === null) return 0;
        let n = 0;
        for (const w of Array.from(doc.querySelectorAll('.ed-redline-change'))) {
          const copy = chip.cloneNode(true);
          copy.className = 'p236-planted';
          copy.style.position = 'static';
          copy.style.display = 'inline-flex';
          copy.style.visibility = 'visible';
          w.after(copy);
          n += 1;
        }
        return n;
      })()`, 20000);
      await sleep(400);
      const ablated = readings.layoutAblated = await layout(cdp);
      const l2 = layoutFindings(before, ablated);
      check('L2', 'THE RULER CAN FAIL: an in-flow control moves the document', planted > 0 && l2.length > 0, `${planted} planted, ${l2.length} finding(s): ${l2.slice(0, 3).join('; ')}`);
      const moves = before.rects.map((a, i) => (a && ablated.rects[i] ? { dx: ablated.rects[i].left - a.left, dy: ablated.rects[i].top - a.top } : null)).filter(Boolean);
      const maxDx = Math.max(...moves.map((m) => Math.abs(m.dx)));
      const maxDy = Math.max(...moves.map((m) => Math.abs(m.dy)));
      note('L2b', 'what the refused in-flow shape cost the document', `height +${(ablated.docHeight - before.docHeight).toFixed(2)}px, the worst change moved ${maxDx.toFixed(2)}px sideways and ${maxDy.toFixed(2)}px down`);
      await cdpEval(cdp, `(() => { for (const el of Array.from(document.querySelectorAll('.p236-planted'))) el.remove(); return true; })()`);
      await sleep(400);
      const restored = await layout(cdp);
      check('L3', 'the ablation was removed and the document is back to the pixel', layoutFindings(before, restored).length === 0, layoutFindings(before, restored).join('; '));

      // -------------------------------------------------------------------
      // C. The chip itself, read off the DOM against the FIRST client rect.
      // -------------------------------------------------------------------
      const h0 = await hoverChange(cdp, 0);
      f = readings.chipOnFirst = h0.face ?? (await face(cdp));
      const c0 = f.changes[0];
      const a0 = anchorFindings(f.chip, c0.first, c0.union, f.view, 4, 0.6);
      check('C1', "the chip is anchored on the change's FIRST client rect", f.chip !== null && a0.length === 0, a0.join('; ') || `chip.left ${f.chip?.left.toFixed(2)}, first rect left ${c0.first.left.toFixed(2)}`);
      check('C2', 'the chip carries data-redline-tag', f.chipTagged === true, '');
      check('C3', 'the chip is OUTSIDE the document element', f.chipInsideDoc === false, `parent is ${f.chipParent}`);
      check('C4', 'every chip button is 24px tall or more (WCAG 2.2 target)', (f.buttons ?? []).length > 0 && f.buttons.every((b) => b.h >= 24), JSON.stringify((f.buttons ?? []).map((b) => `${b.label}:${b.w.toFixed(1)}x${b.h.toFixed(1)}`)));
      check('C5', 'every chip button is out of the tab order', (f.buttons ?? []).every((b) => b.tabIndex === -1), JSON.stringify((f.buttons ?? []).map((b) => b.tabIndex)));
      check('C6', 'the chip says the chords', typeof f.chipText === 'string' && f.chipText.includes('⌥↓') && f.chipText.includes('⌥↑') && f.chipText.includes('⌥⌫'), JSON.stringify(f.chipText));
      check('C7', 'with no rewind yet, the chip offers no Undo', typeof f.chipText === 'string' && !f.chipText.includes('Undo'), JSON.stringify(f.chipText));

      // -------------------------------------------------------------------
      // W. The chip's Rewind, pressed with a real mouse, read from disk.
      // -------------------------------------------------------------------
      const beforeRewind = disk('notes.txt');
      const rewindButton = (f.buttons ?? []).find((b) => (b.label ?? '').includes('Rewind') || (b.title ?? '').includes('Rewind'));
      check('W0', "the chip has a Rewind button to press", rewindButton !== undefined, JSON.stringify((f.buttons ?? []).map((b) => b.label)));
      const targetDel = c0.del;
      const targetIns = c0.ins;
      await clickAt(cdp, rewindButton.cx, rewindButton.cy);
      const expected = V2.replace(targetIns, targetDel);
      const wroteBack = await untilDisk('notes.txt', (d) => d === expected, 20000);
      readings.afterChipRewind = { targetDel, targetIns, equalsExpected: disk('notes.txt') === expected };
      check('W1', "pressing the chip's Rewind put exactly that phrase back on disk, and nothing else moved", wroteBack && disk('notes.txt') === expected, `del ${JSON.stringify(targetDel)} ins ${JSON.stringify(targetIns)}; file equals the expected rewind = ${disk('notes.txt') === expected}`);
      const nowDisk = disk('notes.txt');
      const shouldStand = PAIRS.map(([, b]) => b).filter((b) => expected.includes(b));
      const missing = shouldStand.filter((b) => !nowDisk.includes(b));
      check('W2', `every agent edit the rewind did not name still stands (${String(shouldStand.length)} of ${String(PAIRS.length)})`, missing.length === 0 && shouldStand.length >= PAIRS.length - 1, JSON.stringify({ missing, kept: shouldStand.length }));
      check('W3', 'nothing was written before the press', beforeRewind === V2, `equalsV2=${beforeRewind === V2}`);

      // -------------------------------------------------------------------
      // U. The chip's Undo.
      // -------------------------------------------------------------------
      await until(cdp, docSettled, 20000);
      await sleep(700);
      await cdpEval(cdp, blurAll);
      await move(cdp, 4, 4);
      await sleep(300);
      const hu = await hoverChange(cdp, 0);
      f = readings.chipWithUndo = hu.face ?? (await face(cdp));
      const undoButton = (f.buttons ?? []).find((b) => (b.title ?? '').includes('Undo') || (b.label ?? '').includes('Undo'));
      check('U1', 'after a rewind the chip offers Undo', undoButton !== undefined, JSON.stringify((f.buttons ?? []).map((b) => b.title ?? b.label)));
      if (undoButton !== undefined) {
        await clickAt(cdp, undoButton.cx, undoButton.cy);
        const backAgain = await untilDisk('notes.txt', (d) => d === V2, 20000);
        readings.afterChipUndo = disk('notes.txt');
        check('U2', "pressing the chip's Undo returned the file byte for byte", backAgain && disk('notes.txt') === V2, `equalsV2=${disk('notes.txt') === V2}`);
      }

      // -------------------------------------------------------------------
      // K. The clipboard: select all, copy, and the chip's glyphs are not in it.
      // -------------------------------------------------------------------
      await until(cdp, docSettled, 20000);
      await sleep(600);
      const hk = await hoverChange(cdp, 0);
      const chipTextNow = (hk.face ?? (await face(cdp))).chipText ?? '';
      const selected = await cdpEval(cdp, `(() => { const s = window.getSelection(); s.removeAllRanges(); s.selectAllChildren(document.body); return s.toString().length; })()`, 20000);
      note('K0', 'a real select-all over the whole body', `${String(selected)} characters selected, chip up = ${String((hk.face ?? {}).chip !== null)}`);
      // K-a. The SHIPPING copy handler, driven by a real `copy` event over the
      // real Range, read back out of the DataTransfer it filled. This touches
      // no pasteboard at all.
      const synthetic = await cdpEval(cdp, `(() => {
        const dt = new DataTransfer();
        const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true });
        const target = document.querySelector('.ed-redline-doc');
        const delivered = target.dispatchEvent(ev);
        return JSON.stringify({ text: dt.getData('text/plain'), defaultPrevented: !delivered });
      })()`, 20000);
      const syn = JSON.parse(synthetic ?? '{}');
      readings.syntheticCopy = { length: (syn.text ?? '').length, defaultPrevented: syn.defaultPrevented };
      check('K1a', "the shipping copy handler answers, and its answer holds none of the chip's words", syn.defaultPrevented === true && !(syn.text ?? '').includes('Rewind') && !(syn.text ?? '').includes('Undo') && !/[\u2325\u232b\u2191\u2193\u21e7]/.test(syn.text ?? ''), `handled=${String(syn.defaultPrevented)}, ${String((syn.text ?? '').length)} characters`);
      check('K1b', 'and that answer is the working file byte for byte', (syn.text ?? '') === disk('notes.txt'), `handler ${String((syn.text ?? '').length)} bytes, file ${String(disk('notes.txt').length)} bytes, equal=${(syn.text ?? '') === disk('notes.txt')}`);

      // K-b. The REAL pasteboard, which is the only thing that proves what a
      // person would paste. The operator's own pasteboard is saved in every
      // flavour Electron can read and put back in a `finally`, and the restore
      // is SKIPPED when the copy never landed, so a failed copy leaves it
      // exactly as it was rather than rewriting it with a lossy round trip.
      const copied = await mainEval(main, `(async () => {
        const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
        const { BrowserWindow, clipboard } = load('electron');
        const win = BrowserWindow.getAllWindows()[0];
        const prior = { formats: clipboard.availableFormats(), text: clipboard.readText(), html: clipboard.readHTML(), rtf: clipboard.readRTF(), image: clipboard.readImage() };
        let landed = false;
        try {
          win.webContents.copy();
          for (let i = 0; i < 40; i += 1) {
            await new Promise((r) => setTimeout(r, 100));
            if (clipboard.readText() !== prior.text) { landed = true; break; }
          }
          return JSON.stringify({ text: clipboard.readText(), landed, priorFormats: prior.formats });
        } finally {
          if (landed) {
            const has = (needle) => prior.formats.some((one) => one.toLowerCase().includes(needle));
            const data = {};
            if (prior.text !== '') data.text = prior.text;
            if (has('html') && prior.html !== '') data.html = prior.html.replace(/^<meta charset='utf-8'>/, '');
            if (has('rtf') && prior.rtf !== '') data.rtf = prior.rtf;
            if (has('image/') && !prior.image.isEmpty()) data.image = prior.image;
            if (Object.keys(data).length > 0) clipboard.write(data);
            else if (prior.formats.length === 0) clipboard.clear();
          }
        }
      })()`, 40000);
      const clip = JSON.parse(copied ?? '{}');
      readings.clipboard = { length: (clip.text ?? '').length, landed: clip.landed, priorFormats: clip.priorFormats };
      const clipText = clip.landed === true ? (clip.text ?? '') : null;
      check('K0b', 'the window\'s own Copy command really reached the pasteboard', clip.landed === true, `landed=${String(clip.landed)}`);
      if (clipText !== null) {
        check('K1', "the chip's own words are NOT on the clipboard", !clipText.includes('Rewind') && !clipText.includes('Undo'), `has Rewind=${clipText.includes('Rewind')} has Undo=${clipText.includes('Undo')}`);
        check('K2', "the chip's keycap glyphs are NOT on the clipboard", !/[\u2325\u232b\u2191\u2193\u21e7]/.test(clipText), JSON.stringify((clipText.match(/[\u2325\u232b\u2191\u2193\u21e7]/g) ?? []).slice(0, 5)));
        check('K3', 'the first-run hint sentence is NOT on the clipboard', !clipText.includes('Hover a change'), '');
        check('K4', 'the clipboard is the working file, byte for byte', clipText === disk('notes.txt'), `clip ${clipText.length} bytes, file ${disk('notes.txt').length} bytes, equal=${clipText === disk('notes.txt')}`);
      }
      note('K5', 'what the chip said while the copy was taken', JSON.stringify(chipTextNow));
      await cdpEval(cdp, `(() => { window.getSelection().removeAllRanges(); return true; })()`);

      // -------------------------------------------------------------------
      // A. The attacks.
      // -------------------------------------------------------------------
      // A1: the last change and the first change.
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(300);
      const last = (await face(cdp)).changes.length - 1;
      const hl = await hoverChange(cdp, last);
      f = readings.chipOnLast = hl.face ?? (await face(cdp));
      const cl = f.changes[last];
      const al = anchorFindings(f.chip, cl.first, cl.union, f.view, 4, 0.6);
      check('A1', 'the LAST change gets its chip, on its first rect', f.chip !== null && al.length === 0, al.join('; '));
      check('A1b', 'the chip is inside the view box, not off the edge', f.chip !== null && f.chip.left >= f.view.left - 0.6 && f.chip.right <= f.view.right + 0.6 && f.chip.top >= f.view.top - 0.6 && f.chip.bottom <= f.view.bottom + 0.6, JSON.stringify({ chip: f.chip, view: f.view }));

      // A2: scrolled so the change sits at the very edge of the viewport.
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(300);
      const targetIdx = Math.max(0, (await face(cdp)).changes.length - 3);
      const scrolledTo = await cdpEval(cdp, `(() => {
        const s = document.querySelector('.ed-redline-scroll');
        const w = document.querySelectorAll('.ed-redline-doc .ed-redline-change')[${targetIdx}];
        if (!s || !w) return null;
        const r = w.getClientRects()[0];
        const sr = s.getBoundingClientRect();
        s.scrollTop = s.scrollTop + (r.top - sr.top) - 6;
        return s.scrollTop;
      })()`, 20000);
      await sleep(400);
      const he = await hoverChange(cdp, targetIdx);
      f = readings.chipScrolledEdge = he.face ?? (await face(cdp));
      const ce = f.changes[targetIdx];
      const ae = anchorFindings(f.chip, ce.first, ce.union, f.view, 4, 0.6);
      check('A2.0', 'the document is really longer than the pane, so the scroll attack is real', typeof scrolledTo === 'number' && scrolledTo > 40, `scrollTop ${String(scrolledTo)}`);
      check('A2', 'a change scrolled to the viewport edge still carries its chip', f.chip !== null && ae.length === 0, `scrollTop ${String(scrolledTo)}; ${ae.join('; ')}`);
      check('A2b', 'and the chip is still inside the view', f.chip !== null && f.chip.top >= f.view.top - 0.6 && f.chip.bottom <= f.view.bottom + 0.6, JSON.stringify(f.chip));
      const overlapsChange = f.chip !== null && ce.first !== null && !(f.chip.bottom <= ce.first.top + 0.6 || f.chip.top >= ce.first.bottom - 0.6);
      note('A2c', 'does the clamped chip sit over the change it names', overlapsChange ? 'YES, it overlaps the change at the edge' : 'no, it is clear of it');

      // A3: resize the pane while the chip is shown (a real divider drag).
      // A3-a: a live WINDOW resize with the pointer never leaving the change,
      // which is the only way to see the chip re-place itself rather than go.
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(300);
      const hres = await hoverChange(cdp, 0);
      const chipBeforeWindow = (hres.face ?? (await face(cdp))).chip;
      const bounds0 = JSON.parse((await mainEval(main, `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const { BrowserWindow } = load('electron'); return JSON.stringify(BrowserWindow.getAllWindows()[0].getBounds()); })()`)) ?? 'null');
      await mainEval(main, `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const { BrowserWindow } = load('electron'); const w = BrowserWindow.getAllWindows()[0]; const b = w.getBounds(); w.setBounds({ x: b.x, y: b.y, width: b.width - 220, height: b.height }); return true; })()`);
      await sleep(1200);
      f = readings.afterWindowResize = await face(cdp);
      const underPointer = await cdpEval(cdp, `(() => { const el = document.elementFromPoint(${JSON.stringify(hres.point?.x ?? 0)}, ${JSON.stringify(hres.point?.y ?? 0)}); return el === null ? 'nothing' : (el.closest('.ed-redline-change') !== null ? 'a change' : el.className || el.tagName); })()`, 20000);
      note('A3', 'a HOVER-driven chip through a live window resize', `chip ${f.chip === null ? 'went away' : 'stayed'}; what is under the unmoved pointer now: ${String(underPointer)}`);
      check('A3a', 'if the hover chip went, it went because the content moved out from under the pointer and not for any other reason', f.chip !== null || underPointer !== 'a change', `chip=${f.chip === null ? 'null' : 'up'}, underPointer=${String(underPointer)}`);
      note('A3b', 'the chip box before and after the window resize', JSON.stringify({ before: chipBeforeWindow, after: f.chip }));

      // A3c: the DECISIVE arm. A FOCUS-driven chip owes nothing to the pointer,
      // so if the placement machinery survives a live resize at all, it must
      // survive here. If this one goes, the chip is being detached rather than
      // un-hovered, which would be a defect.
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(300);
      await cdpEval(cdp, focusScroller); await sleep(150);
      await press(cdp, ALT_DOWN); await sleep(400);
      await move(cdp, 4, 4); await sleep(400);
      let ff = readings.focusChip = await face(cdp);
      check('A3c', 'a chip driven by FOCUS alone stands with the pointer nowhere near it', ff.chip !== null && ff.chipOnChange >= 0, `chip=${ff.chip === null ? 'null' : 'up'}, on change ${String(ff.chipOnChange)}`);
      const focusChipBefore = ff.chip;
      await mainEval(main, `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const { BrowserWindow } = load('electron'); const w = BrowserWindow.getAllWindows()[0]; const b = w.getBounds(); w.setBounds({ x: b.x, y: b.y, width: b.width - 220, height: b.height }); return true; })()`);
      await sleep(1200);
      ff = readings.focusChipAfterResize = await face(cdp);
      if (ff.chip !== null && ff.chipOnChange >= 0) {
        const cfr = ff.changes[ff.chipOnChange];
        const afr = anchorFindings(ff.chip, cfr.first, cfr.union, ff.view, 4, 0.6);
        check('A3d', 'and it RE-PLACES itself on that change through a live window resize', afr.length === 0 && ff.changes[ff.chipOnChange].focused === true, `chip on change ${ff.chipOnChange}, focused=${String(cfr.focused)}; ${afr.join('; ')}`);
      } else {
        check('A3d', 'and it RE-PLACES itself on that change through a live window resize', false, `the chip vanished on resize: chip=${JSON.stringify(ff.chip)}`);
      }
      note('A3e', 'the focus chip before and after the resize', JSON.stringify({ before: focusChipBefore, after: ff.chip }));

      // A3f: the same chip through a real SCROLL of the document, instrumented,
      // because a chip that stays where it was while the words move is a chip
      // sitting on somebody else's sentence.
      await cdpEval(cdp, `(() => {
        window.__p236 = { scrolls: 0 };
        const s = document.querySelector('.ed-redline-scroll');
        window.__p236.handler = () => { window.__p236.scrolls += 1; };
        s.addEventListener('scroll', window.__p236.handler, { passive: true });
        const chip = document.querySelector('.ed-redline-chip');
        window.__p236.styleBefore = chip ? chip.style.top + '/' + chip.style.left : null;
        return true;
      })()`, 20000);
      const scrolledBy = await cdpEval(cdp, `(() => { const s = document.querySelector('.ed-redline-scroll'); const t = s.scrollTop; s.scrollTop = t + 60; return s.scrollTop - t; })()`, 20000);
      await sleep(800);
      const scrollDiag = JSON.parse(await cdpEval(cdp, `(() => {
        const chip = document.querySelector('.ed-redline-chip');
        const w = document.querySelector('.ed-redline-doc .ed-redline-change');
        const r = w ? w.getClientRects()[0] : null;
        const s = document.querySelector('.ed-redline-scroll');
        s.removeEventListener('scroll', window.__p236.handler);
        return JSON.stringify({ scrolls: window.__p236.scrolls, styleBefore: window.__p236.styleBefore, styleAfter: chip ? chip.style.top + '/' + chip.style.left : null, changeTop: r ? r.top : null, changeVisible: r !== null && r.top > s.getBoundingClientRect().top && r.bottom < s.getBoundingClientRect().bottom });
      })()`, 20000) ?? '{}');
      note('A3f.diag', 'the scroll, instrumented', JSON.stringify(scrollDiag));
      ff = readings.focusChipAfterScroll = await face(cdp);
      if (ff.chip !== null && ff.chipOnChange >= 0) {
        const cs = ff.changes[ff.chipOnChange];
        const asr = anchorFindings(ff.chip, cs.first, cs.union, ff.view, 4, 0.6);
        check('A3f', 'and it follows its change through a real scroll', asr.length === 0, `scrolled ${String(scrolledBy)}px, ${String(scrollDiag.scrolls)} scroll event(s), chip style ${String(scrollDiag.styleBefore)} -> ${String(scrollDiag.styleAfter)}; ${asr.join('; ')}`);
      } else {
        check('A3f', 'and it follows its change through a real scroll', false, `scrolled ${String(scrolledBy)}px, chip=${JSON.stringify(ff.chip)}`);
      }
      check('A3g', 'that scroll really moved the document', scrolledBy > 0, `${String(scrolledBy)}px`);
      if (bounds0 !== null) {
        await mainEval(main, `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const { BrowserWindow } = load('electron'); BrowserWindow.getAllWindows()[0].setBounds(${JSON.stringify(bounds0)}); return true; })()`);
        await sleep(900);
      }

      const dividerBox = await cdpEval(cdp, `(() => { const d = document.querySelector('.ed-divider'); if (!d) return null; const r = d.getBoundingClientRect(); const p = document.querySelector('.ed-panel').getBoundingClientRect(); return { dx: r.left + r.width / 2, dy: r.top + r.height / 2, panelLeft: p.left, panelRight: p.right, panelWidth: p.width }; })()`, 20000);
      note('A3.0', 'the divider and the panel before the drag', JSON.stringify(dividerBox));
      const hbefore = await hoverChange(cdp, 0);
      const chipBeforeDrag = (hbefore.face ?? (await face(cdp))).chip;
      if (dividerBox !== null) {
        const wanted = 380;
        const grabOffset = dividerBox.dx - dividerBox.panelLeft;
        const targetX = dividerBox.panelRight - wanted + grabOffset;
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dividerBox.dx, y: dividerBox.dy, button: 'none', buttons: 0, pointerType: 'mouse' });
        await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: dividerBox.dx, y: dividerBox.dy, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
        for (let i = 1; i <= 8; i += 1) {
          const x = dividerBox.dx + ((targetX - dividerBox.dx) * i) / 8;
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: dividerBox.dy, button: 'left', buttons: 1, pointerType: 'mouse' });
          await sleep(40);
        }
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: targetX, y: dividerBox.dy, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
        await sleep(700);
      }
      const afterDrag = await cdpEval(cdp, `(() => { const p = document.querySelector('.ed-panel'); const r = p.getBoundingClientRect(); return { width: r.width, left: r.left, right: r.right }; })()`, 20000);
      note('A3.1', 'the panel after the drag', JSON.stringify(afterDrag));
      f = readings.afterResize = await face(cdp);
      const stillThere = f.chip !== null;
      if (stillThere && f.chipOnChange >= 0) {
        const cr = f.changes[f.chipOnChange];
        const ar = anchorFindings(f.chip, cr.first, cr.union, f.view, 4, 0.6);
        check('A4', 'the chip re-places itself on its change after a divider drag', ar.length === 0, `chip on change ${f.chipOnChange}; ${ar.join('; ')}`);
      } else {
        note('A4', 'the chip after the divider drag', stillThere ? `chip up but matched no change (chipOnChange ${f.chipOnChange})` : 'the chip went away because the pointer left the change while the divider was dragged');
      }
      note('A4b', 'the chip box before and after the drag', JSON.stringify({ before: chipBeforeDrag, after: f.chip }));

      // -------------------------------------------------------------------
      // N. THE WRAPPED CHANGE AT THE NARROW PANE — the mandatory rule.
      // -------------------------------------------------------------------
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(400);
      f = readings.narrow = await face(cdp);
      const wrapped = f.changes.map((c, i) => ({ i, c })).filter((x) => x.c.rects > 1 && Math.abs(x.c.union.left - x.c.first.left) > 20).sort((a, b) => (b.c.union.left === b.c.first.left ? 0 : Math.abs(b.c.first.left - b.c.union.left)) - Math.abs(a.c.first.left - a.c.union.left))[0];
      note('N0', 'the changes at the narrow pane', JSON.stringify(f.changes.map((c) => ({ rects: c.rects, firstLeft: Number(c.first?.left.toFixed(2)), unionLeft: Number(c.union.left.toFixed(2)), gap: Number(((c.first?.left ?? 0) - c.union.left).toFixed(2)) }))));
      check('N1', 'the narrow pane really produced a WRAPPED change whose union is left of its start', wrapped !== undefined, wrapped === undefined ? 'no wrapped change with a displaced union rect' : `change ${wrapped.i}, union is ${(wrapped.c.first.left - wrapped.c.union.left).toFixed(2)}px left of the first rect`);
      if (wrapped !== undefined) {
        const hw = await hoverChange(cdp, wrapped.i);
        f = readings.chipOnWrapped = hw.face ?? (await face(cdp));
        const cw = f.changes[wrapped.i];
        const aw = anchorFindings(f.chip, cw.first, cw.union, f.view, 4, 0.6);
        check('N2', 'THE CHIP SITS AT THE WRAPPED CHANGE\'S FIRST FRAGMENT, not at its bounding box', f.chip !== null && aw.length === 0, aw.join('; ') || `chip.left ${f.chip.left.toFixed(2)}, first rect ${cw.first.left.toFixed(2)}, bounding box ${cw.union.left.toFixed(2)} (${(cw.first.left - cw.union.left).toFixed(2)}px away)`);
      }

      // -------------------------------------------------------------------
      // F. Focus versus the pointer: which change does the chip name?
      // -------------------------------------------------------------------
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(300);
      await cdpEval(cdp, focusScroller);
      await sleep(150);
      await press(cdp, ALT_DOWN);
      await sleep(250);
      const focusedFace = await face(cdp);
      const focusedOff = focusedFace.activeOff;
      const otherIdx = focusedFace.changes.findIndex((c) => c.off !== focusedOff && c.first !== null);
      if (otherIdx >= 0) {
        const p = pointIn(focusedFace.changes[otherIdx].first);
        await move(cdp, p.x, p.y);
        await sleep(400);
        f = readings.focusVsPointer = await face(cdp);
        const chipIdx = f.chipOnChange;
        const focusIdx = f.changes.findIndex((c) => c.focused);
        check('F1', 'with focus on one change and the pointer on another, the chip names the FOCUSED one', f.chip !== null && chipIdx === focusIdx && focusIdx >= 0, `chip on ${chipIdx}, focus on ${focusIdx}, pointer on ${otherIdx}`);
        note('F2', 'is that honest', `⌥⌫ acts on document.activeElement, so the chip naming change ${focusIdx} is what the keys would act on; the pointer is on change ${otherIdx} and the chip is NOT there`);
      } else {
        note('F1', 'no second change to point at', JSON.stringify(focusedFace.changes.length));
      }

      // -------------------------------------------------------------------
      // M. The Edit menu, read out of MAIN.
      // -------------------------------------------------------------------
      const MENU_READ = `(() => {
        const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
        const { Menu } = load('electron');
        const menu = Menu.getApplicationMenu();
        if (menu === null) return null;
        const edit = menu.items.find((i) => i.label === 'Edit');
        if (edit === undefined || edit.submenu === undefined) return null;
        return JSON.stringify(edit.submenu.items.map((i) => ({ label: i.label, sublabel: i.sublabel ?? '', enabled: i.enabled === true, accelerator: i.accelerator ?? null, registerAccelerator: i.registerAccelerator })));
      })()`;
      const WANT = ['Next Change', 'Previous Change', 'Rewind Change', 'Undo Rewind'];
      const withRedline = JSON.parse((await mainEval(main, MENU_READ)) ?? 'null');
      readings.editMenuWithRedline = withRedline;
      const rowsUp = (withRedline ?? []).filter((r) => WANT.includes(r.label));
      check('M1', 'the Edit menu carries the four redline rows', rowsUp.length === 4, JSON.stringify(rowsUp.map((r) => r.label)));
      check('M2', 'with a redline mounted, all four are ENABLED', rowsUp.length === 4 && rowsUp.every((r) => r.enabled), JSON.stringify(rowsUp.map((r) => `${r.label}:${r.enabled}`)));
      check('M3', 'each row carries its chord as a hint', rowsUp.every((r) => /[⌥]/.test(r.sublabel)), JSON.stringify(rowsUp.map((r) => `${r.label}=${r.sublabel}`)));
      check('M4', 'and NONE of them registers a native accelerator', rowsUp.every((r) => r.accelerator === null || r.accelerator === undefined), JSON.stringify(rowsUp.map((r) => r.accelerator)));

      await cdpEval(cdp, clickMode('File'));
      await sleep(1500);
      const withFile = JSON.parse((await mainEval(main, MENU_READ)) ?? 'null');
      readings.editMenuWithFile = withFile;
      const rowsFile = (withFile ?? []).filter((r) => WANT.includes(r.label));
      check('M5', 'with a File tab in front, all four are DISABLED', rowsFile.length === 4 && rowsFile.every((r) => !r.enabled), JSON.stringify(rowsFile.map((r) => `${r.label}:${r.enabled}`)));
      check('M6', 'and they still carry their hints while disabled', rowsFile.every((r) => /[⌥]/.test(r.sublabel)), JSON.stringify(rowsFile.map((r) => r.sublabel)));

      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await sleep(900);
      const back = JSON.parse((await mainEval(main, MENU_READ)) ?? 'null');
      const rowsBack = (back ?? []).filter((r) => WANT.includes(r.label));
      check('M7', 'going back to the redline re-enables them', rowsBack.length === 4 && rowsBack.every((r) => r.enabled), JSON.stringify(rowsBack.map((r) => r.enabled)));

      f = readings.afterReturn = await face(cdp);
      check('H1', 'the first-run line does NOT come back on the second redline of the session', !f.notes.some((n) => (n ?? '').includes('Hover a change')), JSON.stringify(f.notes));

      // -------------------------------------------------------------------
      // R. The resting face once more, on the recomposed view.
      // -------------------------------------------------------------------
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(500);
      f = readings.restingFinal = await face(cdp);
      check('R1', 'no chip at rest, after everything', f.chip === null, JSON.stringify(f.chip));
      check('R2', 'no button in the view at rest', typeof f.viewHTML === 'string' && !f.viewHTML.includes('<button'), '');
      const shape = typeof f.docHTML === 'string' && /^<div class="ed-redline ed-redline-doc" data-redline="">(?:<span(?: [^>]*)?>|<\/span>|<del data-redline-del="">|<\/del>|<ins data-redline-ins="">|<\/ins>|[^<]*)*<\/div>$/.test(f.docHTML);
      check('R3', 'the resting document markup is the Phase 227 shape and nothing else', shape, typeof f.docHTML === 'string' ? f.docHTML.slice(0, 160) : 'no doc');
    } finally {
      writeFileSync(readingsFile, JSON.stringify({ rows, readings }, null, 2));
      try { main.close(); } catch { /* closed */ }
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
check('X1', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${opBefore} -> ${opAfter}`);
say('');
say(`${rows.filter((r) => r.pass === true).length} passed, ${failures.length} failed, ${rows.filter((r) => r.pass === null).length} notes`);
say(`readings at ${readingsFile}`);
if (failures.length > 0) { for (const f of failures) say(`FAILURE: ${f}`); process.exit(1); }
process.exit(0);
