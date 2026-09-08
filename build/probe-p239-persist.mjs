#!/usr/bin/env node
/**
 * probe-p239-persist.mjs. THE PHASE 239 VERIFIER'S SECOND APP RUN, aimed at
 * the one thing the phase is FOR: does the current change persist?
 *
 * It runs the SAME drive at HEAD and at the parent commit, so a difference is
 * a measurement rather than an opinion. Three arms, driven in the order B, C,
 * A rather than the order they are named:
 *
 *   B. AN OUTSIDE WRITE ABOVE THE PLACE, being research 99 §2.3's own drive
 *      with the write landing above the change rather than below it.
 *   C. DISMISSAL. Once the controls are drawn, is there any way to put them
 *      away short of leaving the tab?
 *   A. TYPING. The controls are drawn on a change, the person types three
 *      characters into it, and the controls must still be there.
 *
 * ## THE ORDER IS THE FIX ROUND'S AND IT IS NOT COSMETIC
 *
 * A is driven LAST because it types, and `refreshRepo` in ./tab-io skips a tab
 * with unsaved edits on purpose (research 83 A4.3) so that a person's typing is
 * never overwritten by the watcher. Driven first, it left the tab dirty and
 * every outside write in arms B and C stopped arriving: B read 4 changes before
 * and 4 after and asserted nothing at all, which is a green arm that could not
 * have gone red. Its first check is now that the write recomposed the document.
 *
 * ## WHAT EACH ARM READ AT THE PHASE'S OWN COMMIT AND AFTER THE FIX
 *
 *   A: chip GONE and 0 changes marked, 3 runs of 3, against the parent's 3 of
 *      3 — the identity carried `ins` and typing rewrites it.
 *   C: the chip still drawn on change 0 with the mark still on it, against the
 *      parent's chip GONE — persistence had been built with no other side.
 *
 * Both are checks here, so the arms that measured them can fail again.
 *
 * One Electron on a scratch profile with a scratch HOME and its own tmux
 * socket, through build/electron-run.mjs, ended in its `finally`. No agent, no
 * token, no keychain, no request. The "agent" is a plain /bin/sh.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARM = process.env['P239_ARM'] ?? 'head';
const TAG = `[p239p:${ARM}]`;
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
const failures = [];
const note = (step, claim, detail) => { rows.push({ step, claim, pass: null, detail }); say(`note  ${step}. ${claim} — ${detail}`); };
const check = (step, claim, pass, detail) => {
  rows.push({ step, claim, pass, detail });
  if (!pass) failures.push(`${step}. ${claim} — ${detail}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim} — ${detail}`);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p239p-${String(process.pid)}`, `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit', env: process.env });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p239p'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p239p'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
};
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};

const SECTIONS = [
  { a: 'keeps', b: 'holds', pa: 'quick brown foxes jumped clean across twelve tall fences', pb: 'swift crimson hounds vaulted neatly beyond thirteen wide hedges' },
  { a: 'guards', b: 'shields', pa: 'eager purple herons dived sharply beneath eleven old bridges', pb: 'patient golden storks plunged gently under fourteen new arches' }
];
const V1 = (() => {
  const out = [];
  SECTIONS.forEach((sec, n) => {
    const i = n + 1;
    out.push(`Section ${i}. Tortie ${sec.a} every session alive in a private tmux server, and the ${sec.pa} over the lazy dog while the window is closed.`);
    out.push('');
    for (let k = 1; k <= 6; k += 1) { out.push(`Paragraph ${i}.${k} of the notes runs on for a while so the document has a body worth reading.`); out.push(''); }
  });
  return out.join('\n');
})();
const V2 = SECTIONS.flatMap((s) => [[s.a, s.b], [s.pa, s.pb]]).reduce((t, [a, b]) => t.split(a).join(b), V1);
writeFileSync(join(project, 'notes.txt'), V1);
git('init', '-q', '-b', 'main'); git('config', 'user.email', 'p@example.invalid'); git('config', 'user.name', 'p'); git('add', '.'); git('commit', '-q', '-m', 'first');

/**
 * What the face says about the controls, in the ONE vocabulary both commits
 * answer: is a chip drawn, on which change, and which change would a press
 * act on. `data-current` does not exist at the parent, so the question is
 * asked of the CHIP and of the press's own reader instead.
 */
const FACE = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const view = document.querySelector('.ed-redline-view');
  const chip = document.querySelector('.ed-redline-chip');
  const wraps = doc ? Array.from(doc.querySelectorAll('.ed-redline-change')) : [];
  const v = view ? view.getBoundingClientRect() : null;
  const c = chip ? chip.getBoundingClientRect() : null;
  const idx = (c === null || v === null) ? -1 : wraps.findIndex((w) => {
    const r = w.getClientRects()[0];
    if (!r) return false;
    const want = v.left + Math.max(0, Math.min(r.left - v.left, v.width - c.width));
    const above = Math.abs(c.top - (r.top - 4 - c.height)) <= 0.6;
    const below = Math.abs(c.top - (r.bottom + 4)) <= 0.6;
    const clamped = Math.abs(c.top - v.top) <= 0.6 || Math.abs(c.bottom - (v.top + v.height)) <= 0.6;
    return Math.abs(c.left - want) <= 0.6 && (above || below || clamped);
  });
  const s = window.getSelection();
  let caretIdx = -1;
  if (s !== null && s.rangeCount > 0) {
    const n = s.getRangeAt(0).startContainer;
    const e = n.nodeType === 1 ? n : n.parentElement;
    const w = e === null ? null : e.closest('.ed-redline-change');
    caretIdx = w === null ? -1 : wraps.indexOf(w);
  }
  const marked = wraps.findIndex((w) => w.hasAttribute('data-current'));
  const name = (i) => (i < 0 || wraps[i] === undefined) ? null : ((wraps[i].dataset.changeDel || '(nothing)') + ' -> ' + (wraps[i].dataset.changeIns || '(nothing)')).slice(0, 60);
  return {
    chip: c === null ? null : { left: c.left, top: c.top, width: c.width },
    chipOn: idx, chipName: name(idx),
    marked, markedName: name(marked),
    caretOn: caretIdx, caretName: name(caretIdx),
    count: wraps.length,
    active: document.activeElement === null ? null : document.activeElement.className,
    // PAINTED, not merely present. A chip whose place has not been computed
    // is hidden for one layout pass and still answers a rectangle, so "is
    // there a chip element" is not the same question as "can a person see
    // it", and the mark's own ring is read the same way.
    chipVisible: chip === null ? null : window.getComputedStyle(chip).visibility,
    markRing: (() => {
      const w = wraps[marked];
      return w === undefined ? null : window.getComputedStyle(w).outlineStyle;
    })()
  };
})()`;

const shotDir = join(root, 'shots');
mkdirSync(shotDir, { recursive: true });
/** One PNG of the whole window, kept, because this phase is about where a thing sits. */
async function shotTo(cdp, name) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'png' }, 30000);
  const data = r.result?.data;
  if (typeof data !== 'string') return null;
  const file = join(shotDir, `${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  say(`shot ${file}`);
  return file;
}

const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const focusHost = `(() => { const d = document.querySelector('.ed-redline-doc'); if (!d) return false; d.focus(); return true; })()`;
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
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: [] });
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? 1 : null`, 5000);
          if (a === 1) return cdp;
          cdp.close();
        } catch { if (cdp) { try { cdp.close(); } catch { /* closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}
const until = async (cdp, expr, ms) => { const s = Date.now(); for (;;) { if ((await cdpEval(cdp, expr, 10000)) === true) return true; if (Date.now() - s > ms) return false; await sleep(80); } };
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);
const face = (cdp) => cdpEval(cdp, FACE, 20000);
const move = (cdp, x, y) => cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' });
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}) });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const ALT_DOWN = { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 };
const ESC = { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 };

async function remount(cdp) {
  await cdpEval(cdp, clickMode('File')); await sleep(700);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000); await until(cdp, docHasChange, 20000); await sleep(600);
}

await withElectron(
  { label: `p239p-${ARM}`, userDataDir: profile, tmuxSocket: null, cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000 },
  async () => {
    const cdp = await cdpForAppWindow(90000);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project });
      await sleep(1200);
      shellWrite('notes.txt', V2);
      await sleep(500);
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff', editorWidth: 1100 });
      await sleep(900);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000); await until(cdp, docHasChange, 20000); await sleep(700);

      // ---- ARM B. AN OUTSIDE WRITE ABOVE THE PLACE, twice ----
      // FIRST, because arm A types and a dirty tab is skipped by `refreshRepo`
      // on purpose (research 83 A4.3), so an outside write never arrives after
      // it. Run the other way round this arm reads 4 -> 4 changes and proves
      // nothing at all, which is what it did before the fix round reordered it.
      for (const round of (process.env['P239_ONLY'] === 'A' ? [] : [1, 2])) {
        shellWrite('notes.txt', V2);
        await sleep(800);
        await remount(cdp);
        await cdpEval(cdp, focusHost); await sleep(300);
        await press(cdp, ALT_DOWN); await sleep(300);
        await press(cdp, ALT_DOWN); await sleep(500);
        const before = await face(cdp);
        shellWrite('notes.txt', `A line the shell added at the very top, round ${String(round)}.\n${V2}`);
        await sleep(2500);
        const after = await face(cdp);
        check(`B${String(round)}a`, 'AN OUTSIDE WRITE ABOVE THE PLACE recomposed the document',
          after.count > before.count, `${String(before.count)} -> ${String(after.count)} changes`);
        check(`B${String(round)}b`, 'and the controls are still on the phrase the person stepped to',
          after.chip !== null && after.chipName === before.chipName && after.markedName === before.chipName,
          `before chip on ${String(before.chipOn)} "${String(before.chipName)}" -> after chip ${after.chip === null ? 'GONE' : `on ${String(after.chipOn)} "${String(after.chipName)}"`}, marked "${String(after.markedName)}", caret on ${String(after.caretOn)} "${String(after.caretName)}"`);
      }

      // ---- ARM C. DISMISSAL ----
      if (process.env['P239_ONLY'] !== 'A') {
      shellWrite('notes.txt', V2);
      await sleep(800);
      await remount(cdp);
      await cdpEval(cdp, focusHost); await sleep(300);
      await press(cdp, ALT_DOWN); await sleep(500);
      const c0 = await face(cdp);
      // Click plain prose well away from any change.
      const clicked = await cdpEval(cdp, `(() => {
        const doc = document.querySelector('.ed-redline-doc');
        const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
          if ((n.nodeValue ?? '').includes('body worth reading')) {
            const r = document.createRange(); r.setStart(n, 3); r.collapse(true);
            const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
            const rect = r.getBoundingClientRect();
            return { x: rect.left, y: rect.top + rect.height / 2 };
          }
        }
        return null;
      })()`, 20000);
      if (clicked !== null) {
        await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: clicked.x, y: clicked.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clicked.x, y: clicked.y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
      }
      await move(cdp, 4, 4);
      await sleep(900);
      const c1 = await face(cdp);
      check('C0', 'the controls were drawn when the arm started', c0.chip !== null, `chip on ${String(c0.chipOn)} "${String(c0.chipName)}"`);
      check('C1', 'DISMISSAL: a press on plain prose far from any change PUTS THEM AWAY',
        c1.chip === null && c1.marked === -1,
        `chip ${c1.chip === null ? 'GONE' : `still on ${String(c1.chipOn)} "${String(c1.chipName)}"`}, marked ${String(c1.marked)}`);
      // AND THE CHANGE ITSELF IS UNTOUCHED: letting go of the controls is not
      // letting go of the change, so the picture is exactly what it was.
      check('C2', 'and the redline itself is unchanged, so nothing was lost by dismissing',
        c1.count === c0.count, `${String(c0.count)} -> ${String(c1.count)} changes`);
      // The chord brings them straight back, so dismissal is not a dead end.
      await cdpEval(cdp, focusHost); await sleep(250);
      await press(cdp, ALT_DOWN); await sleep(600);
      const c3 = await face(cdp);
      check('C3', 'and ⌥↓ brings them straight back, so putting them away is not a dead end',
        c3.chip !== null, `chip ${c3.chip === null ? 'still GONE' : `on ${String(c3.chipOn)} "${String(c3.chipName)}"`}`);
      }

      // ---- ARM A. TYPING, three times over. LAST, because it leaves the tab
      //      dirty and `refreshRepo` skips a dirty tab on purpose. ----
      for (const round of [1, 2, 3]) {
        await remount(cdp);
        await cdpEval(cdp, focusHost); await sleep(300);
        await press(cdp, ALT_DOWN); await sleep(300);
        await press(cdp, ALT_DOWN); await sleep(500);
        const before = await face(cdp);
        // Put the caret inside the change the controls are drawn on.
        const put = await cdpEval(cdp, `(() => {
          const wraps = Array.from(document.querySelectorAll('.ed-redline-doc .ed-redline-change'));
          const w = wraps[${String(before.chipOn)}];
          if (!w) return false;
          const ins = w.querySelector('ins') ?? w;
          const t = ins.firstChild;
          if (!t) return false;
          const s = window.getSelection(); const r = document.createRange();
          r.setStart(t, Math.min(3, (t.nodeValue ?? '').length)); r.collapse(true);
          s.removeAllRanges(); s.addRange(r); return true;
        })()`, 20000);
        await sleep(300);
        for (const ch of ['z', 'q', 'x']) { await press(cdp, { key: ch, code: `Key${ch.toUpperCase()}`, vk: ch.toUpperCase().charCodeAt(0), modifiers: 0, text: ch }); await sleep(220); }
        await sleep(900);
        const after = await face(cdp);
        if (round === 3) await shotTo(cdp, 'typing');
        check(`A${String(round)}`, 'TYPING: three characters into the change do NOT take the controls off it',
          put === true && after.chip !== null && after.chipVisible === 'visible' && after.markRing === 'solid' && after.marked === before.chipOn && after.chipOn === before.chipOn,
          `caret placed ${String(put)}; chip ${String(after.chipVisible)}, ring ${String(after.markRing)}; before chip on ${String(before.chipOn)} "${String(before.chipName)}" (marked ${String(before.marked)}) -> after chip ${after.chip === null ? 'GONE' : `on ${String(after.chipOn)} "${String(after.chipName)}"`} (marked ${String(after.marked)}), caret on ${String(after.caretOn)} "${String(after.caretName)}"`);
      }

      // LAST OF ALL, because it leaves the view: what Escape does. It is a
      // note rather than a check — Escape belongs to the editor panel and this
      // phase did not touch it — and it is here at the end because closing the
      // panel takes the mode buttons every arm above remounts through with it.
      await press(cdp, ESC);
      await sleep(900);
      const esc = await face(cdp);
      note('E1', 'for the record, what Escape does', `chip ${esc.chip === null ? 'gone' : `on ${String(esc.chipOn)}`}, the redline is ${esc.count === -1 ? 'closed' : 'still up'}`);

    } finally {
      cdp.close();
    }
  }
);
const opAfter = operatorCount();
check('X1', 'the operator\'s own -L gmux sessions did not move', opBefore === opAfter, `${String(opBefore)} -> ${String(opAfter)}`);
say(`${String(rows.filter((r) => r.pass === true).length)} of ${String(rows.filter((r) => r.pass !== null).length)} checks passed`);
if (failures.length > 0) { say(`FAILURES: ${failures.length}`); for (const f of failures) say(`  ${f}`); }
process.exit(failures.length > 0 ? 1 : 0);
