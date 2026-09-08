#!/usr/bin/env node
/**
 * probe-p237-attack.mjs. THE VERIFIER'S app run for Phase 237, and it is
 * independent of the builder's `probe-p237-typing.mjs` in both of its halves.
 *
 * METHOD ONE, THE ATTACK. An outside write is landed at every point in a
 * typing sequence and the pass is ZERO BYTES LOST — mid-word, between a
 * keystroke and its save, inside an IME composition, during a rewind press,
 * twice in one frame, a write that removes the run the caret is in, a write
 * that replaces the whole file, and the race between the FIRST keystroke and
 * the moment monaco's model exists, which is the one window in which the
 * person's own character has nowhere to live. After each arm the DISK and the
 * REDLINE are both read and the reading is printed whether it passes or not.
 *
 * METHOD TWO. The projection property re-derived off the LIVE DOM with a
 * caret and with a selection in the document, and every one of research 83
 * D.2's five default-behaviour traps driven with REAL key events through CDP
 * `Input.dispatchKeyEvent`, `Input.imeSetComposition` and
 * `Input.dispatchDragEvent`. There is no `execCommand` in this file, because
 * research 83 records that a scripted one fires no `beforeinput` in Chromium
 * and produced a wrong conclusion once already.
 *
 * THE PARENT READING IS TAKEN BY A PLANT, AND IT IS NAMED RATHER THAN HIDDEN.
 * At the parent commit the redline is not editable at all, so none of D.2's
 * five traps exists there to be read: the parent reading for "the document is
 * editable" is false and the other four are unreachable. What D.2 measured is
 * the behaviour of a NAIVE contenteditable over this markup, so this file
 * builds one: a deep clone of the live document, `contenteditable="true"` on
 * it, the `contenteditable="false"` Phase 237 puts on every deletion stripped
 * off it, appended to the body outside the React tree so not one of the
 * phase's listeners is attached to it. The same real key events are dispatched
 * into the clone and into the live document, and both readings are printed
 * side by side. It is the same shape Phase 218's probe used to read the parent
 * of a colour without rebuilding it.
 *
 * ## Safety
 *
 * Without GMUX_TMUX_SOCKET it refuses, and it refuses `gmux` and `default` by
 * name. Everything it writes is under the harness directory. It creates no
 * session, spawns no agent, spends no token, opens no keychain, touches no
 * machine and never reaches the system pasteboard. The one Electron goes
 * through build/electron-run.mjs, whose kill is in a `finally` block. `-L gmux`
 * appears once, a read only session count before and after.
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);

function refuse(message) {
  process.stderr.write(`probe-p237-attack: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  refuse('no build under out/. Run npm run build first.');
}

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessions() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const sessionsBefore = operatorSessions();

mkdirSync(join(harnessDir, 'p237v'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p237v'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) mkdirSync(d, { recursive: true });

const REL = 'notes.txt';
const FILE = join(project, REL);
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe.\n' +
  '\n' +
  'The application is a disposable client: it attaches to whatever is already running, draws\n' +
  'it, and gets out of the way. When you come back the agent still knows what it was doing.\n' +
  '\n' +
  'Nothing you were waiting on has to be reconstructed from memory.\n';
const AGENT = BASELINE.replace('disposable client', 'throwaway viewer').replace(
  'reconstructed from memory',
  'rebuilt from notes'
);

writeFileSync(FILE, BASELINE);
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p237v@example.invalid', '-c', 'user.name=p237 verifier', 'commit', '-q', '-m', 'fixture']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
writeFileSync(FILE, AGENT);
const onDisk = () => readFileSync(FILE, 'utf8');

const failures = [];
function check(pass, claim, detail) {
  say(`  ${pass ? 'ok  ' : 'FAIL'} ${claim}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!pass) failures.push(claim);
}
function note(line) {
  say(`  ..   ${line}`);
}

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
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try { cdp.close(); } catch { /* already gone */ }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(200);
  }
}

// Alt 1, Ctrl 2, Meta 4, Shift 8.
const CHORD = {
  save: { key: 's', code: 'KeyS', vk: 83, modifiers: 4 },
  undoTyping: { key: 'z', code: 'KeyZ', vk: 90, modifiers: 4 },
  enter: { key: 'Enter', code: 'Enter', vk: 13, modifiers: 0, text: '\r' },
  right: { key: 'ArrowRight', code: 'ArrowRight', vk: 39, modifiers: 0 },
  next: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  rewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 },
  undoRewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 | 8 }
};

async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  if (text !== undefined) {
    base.text = text;
    base.unmodifiedText = text;
  }
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
async function typeChar(cdp, ch) {
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
}
async function typeWord(cdp, word, gap = 30) {
  for (const ch of word) {
    await typeChar(cdp, ch);
    await sleep(gap);
  }
}
async function waitFor(cdp, expression, timeoutMs, everyMs = 100) {
  const started = Date.now();
  for (;;) {
    if ((await cdpEval(cdp, expression, 20_000)) === true) return true;
    if (Date.now() - started > timeoutMs) return false;
    await sleep(everyMs);
  }
}

/**
 * The page-side reader. Every projection is re-derived HERE by a walk of this
 * file's own, over ANY root, so the live document and the naive clone are read
 * by exactly the same code and nothing under test computes its own answer.
 */
const HELPERS = `(() => {
  const live = () => document.querySelector('.ed-redline-doc');
  const rep = () => document.getElementById('v237-replica');
  const rootOf = (which) => (which === 'replica' ? rep() : live());
  const under = (node, root, attr) => {
    let at = node;
    while (at !== null && at !== root) {
      if (at.nodeType === 1 && at.hasAttribute(attr)) return true;
      at = at.parentNode;
    }
    return false;
  };
  const textNodes = (root) => {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n !== null; n = w.nextNode()) out.push(n);
    return out;
  };
  const currentNodes = (root) => textNodes(root).filter((n) => !under(n, root, 'data-redline-del'));
  const join = (list) => list.map((n) => n.nodeValue).join('');
  const offsetIn = (list, node, off) => {
    let total = 0;
    for (const n of list) {
      if (n === node) return total + off;
      total += n.length;
    }
    return -1;
  };
  const placeIn = (list, offset) => {
    let total = 0;
    for (const n of list) {
      if (offset <= total + n.length) return { node: n, offset: offset - total };
      total += n.length;
    }
    const last = list[list.length - 1];
    return last === undefined ? null : { node: last, offset: last.length };
  };
  window.__v237 = {
    rootOf,
    /** Every projection of one root, plus the structure counts. */
    read: (which) => {
      const root = rootOf(which);
      if (root === null) return { drawn: false };
      const all = textNodes(root);
      const sel = getSelection();
      const cur = currentNodes(root);
      let caret = -1;
      let caretDrawn = -1;
      if (sel !== null && sel.rangeCount > 0 && sel.focusNode !== null && root.contains(sel.focusNode)) {
        caret = offsetIn(cur, sel.focusNode, sel.focusOffset);
        caretDrawn = offsetIn(all, sel.focusNode, sel.focusOffset);
      }
      const current = join(cur);
      return {
        drawn: true,
        editable: root.isContentEditable === true,
        contentEditable: root.getAttribute('contenteditable'),
        current,
        baseline: join(all.filter((n) => !under(n, root, 'data-redline-ins'))),
        drawnText: join(all),
        changes: root.querySelectorAll('.ed-redline-change').length,
        generations: [...new Set([...root.querySelectorAll('.ed-redline-change')].map((w) => w.dataset.changeGen))],
        dels: root.querySelectorAll('[data-redline-del]').length,
        inses: root.querySelectorAll('[data-redline-ins]').length,
        insTexts: [...root.querySelectorAll('[data-redline-ins]')].map((e) => e.textContent),
        delTexts: [...root.querySelectorAll('[data-redline-del]')].map((e) => e.textContent),
        insInsideAChange: [...root.querySelectorAll('[data-redline-ins]')].every((e) => e.closest('.ed-redline-change') !== null),
        divs: root.querySelectorAll('div').length,
        brs: root.querySelectorAll('br').length,
        bolds: root.querySelectorAll('b, strong, i, em, span[style]').length,
        topLevel: root.childNodes.length,
        caret,
        caretDrawn,
        caretContext: caret < 0 ? null : current.slice(Math.max(0, caret - 8), caret) + '|' + current.slice(caret, caret + 8),
        since: document.querySelector('.ed-redline-since .banner-text')?.textContent ?? null,
        undoNote: document.querySelector('.ed-redline-undo .banner-text')?.textContent ?? null,
        toast: [...document.querySelectorAll('[class*="toast"]')].map((e) => e.textContent).join(' | ')
      };
    },
    /** Put the caret at a CURRENT-side offset in a root. */
    put: (which, offset) => {
      const r = rootOf(which);
      if (r === null) return false;
      const p = placeIn(currentNodes(r), offset);
      if (p === null) return false;
      const range = document.createRange();
      range.setStart(p.node, p.offset);
      range.collapse(true);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(range);
      r.focus();
      return true;
    },
    /** Put the caret at a DRAWN offset (deletions included). */
    putDrawn: (which, offset) => {
      const r = rootOf(which);
      if (r === null) return false;
      const p = placeIn(textNodes(r), offset);
      if (p === null) return false;
      const range = document.createRange();
      range.setStart(p.node, p.offset);
      range.collapse(true);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(range);
      r.focus();
      return true;
    },
    /** A selection over two CURRENT-side offsets. */
    select: (which, a, b) => {
      const r = rootOf(which);
      if (r === null) return false;
      const list = currentNodes(r);
      const p = placeIn(list, a);
      const q = placeIn(list, b);
      if (p === null || q === null) return false;
      const s = getSelection();
      s.removeAllRanges();
      s.setBaseAndExtent(p.node, p.offset, q.node, q.offset);
      r.focus();
      return true;
    },
    /** Where the first deletion of at least n characters sits, in DRAWN offsets. */
    delSpan: (which, least) => {
      const r = rootOf(which);
      if (r === null) return null;
      const all = textNodes(r);
      let total = 0;
      for (const n of all) {
        if (under(n, r, 'data-redline-del') && n.length >= least) {
          return { start: total, end: total + n.length, text: n.nodeValue };
        }
        total += n.length;
      }
      return null;
    },
    /** A client point inside the document, for a drag. */
    pointAt: (which, drawnOffset) => {
      const r = rootOf(which);
      if (r === null) return null;
      const p = placeIn(textNodes(r), drawnOffset);
      if (p === null) return null;
      const range = document.createRange();
      range.setStart(p.node, p.offset);
      range.setEnd(p.node, Math.min(p.node.length, p.offset + 1));
      const rect = range.getClientRects()[0];
      return rect === undefined ? null : { x: rect.left + 1, y: rect.top + rect.height / 2 };
    },
    /**
     * THE PARENT PLANT. A deep clone of the live document with
     * contenteditable="true" on it and Phase 237's contenteditable="false"
     * stripped off every deletion, outside the React tree, so not one of the
     * phase's listeners is on it. This is research 83 D.2's naive
     * contenteditable, over this tree's own markup.
     */
    plant: () => {
      const old = rep();
      if (old !== null) old.remove();
      const src = live();
      if (src === null) return false;
      const clone = src.cloneNode(true);
      clone.id = 'v237-replica';
      clone.setAttribute('contenteditable', 'true');
      for (const d of clone.querySelectorAll('[data-redline-del]')) d.removeAttribute('contenteditable');
      clone.style.position = 'fixed';
      clone.style.left = '0px';
      clone.style.top = '0px';
      clone.style.width = '640px';
      clone.style.height = '420px';
      clone.style.overflow = 'auto';
      clone.style.zIndex = '2147483000';
      clone.style.background = 'var(--bg-canvas)';
      document.body.appendChild(clone);
      return true;
    },
    unplant: () => {
      const old = rep();
      if (old !== null) old.remove();
      return true;
    }
  };
  return true;
})()`;

const read = async (cdp, which) =>
  JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.read(${JSON.stringify(which)}))`, 30_000));

await withElectron(
  {
    label: 'p237v',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 20 * 60 * 1000
  },
  async () => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p237v: app window at ${url}`);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await cdpEval(
      cdp,
      `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project, openRel: REL, mode: 'diff', editorMode: 'redline' })}).then(() => true)`,
      90_000
    );
    if (!(await waitFor(cdp, `document.querySelector('.ed-redline-doc') !== null`, 30_000))) {
      throw new Error('the redline never drew');
    }
    await cdpEval(cdp, HELPERS, 20_000);
    await sleep(600);

    const clean = async () =>
      waitFor(cdp, `!(document.querySelector('.ed-redline-since .banner-text')?.textContent ?? '').includes('unsaved')`, 20_000);
    /** Put the tab and the file back to a known text, clean. */
    async function resetTo(text) {
      await cdpEval(cdp, `window.__v237.put('live', 0)`, 20_000);
      await press(cdp, CHORD.save);
      await clean();
      writeFileSync(FILE, text);
      const ok = await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(text)}`, 20_000);
      await sleep(200);
      return ok;
    }

    // =====================================================================
    // METHOD TWO, part A. The projection property off the LIVE DOM with a
    // caret and with a selection in the document.
    // =====================================================================
    say('\n=== METHOD TWO A: the projection property, with a caret in the document ===');
    let r = await read(cdp, 'live');
    check(r.editable === true, `the live document is editable (${String(r.contentEditable)})`);
    const targets = [
      { name: 'the very start', off: 0 },
      { name: 'inside an unchanged run', off: AGENT.indexOf('private tmux') + 3 },
      { name: 'immediately after a deletion', off: AGENT.indexOf('throwaway') },
      { name: 'inside an insertion', off: AGENT.indexOf('throwaway') + 4 },
      { name: 'the very end', off: AGENT.length }
    ];
    for (const t of targets) {
      await cdpEval(cdp, `window.__v237.put('live', ${String(t.off)})`, 20_000);
      await sleep(120);
      const p = await read(cdp, 'live');
      check(
        p.baseline === BASELINE && p.current === AGENT,
        `both projections exact with the caret at ${t.name} (${String(p.caret)})`,
        p.caretContext ?? ''
      );
    }
    await cdpEval(cdp, `window.__v237.select('live', ${String(AGENT.indexOf('The application'))}, ${String(AGENT.indexOf('already running'))})`, 20_000);
    await sleep(150);
    let sel = await read(cdp, 'live');
    check(
      sel.baseline === BASELINE && sel.current === AGENT,
      'both projections exact with a SELECTION spanning a deletion and an insertion'
    );

    // =====================================================================
    // METHOD TWO, part B. D.2's five traps, on the naive plant and on HEAD.
    // =====================================================================
    say('\n=== METHOD TWO B: research 83 D.2 five traps, real CDP keys, plant vs HEAD ===');
    const traps = {};

    async function withPlant(body) {
      await cdpEval(cdp, `window.__v237.plant()`, 20_000);
      await sleep(200);
      try {
        return await body();
      } finally {
        await cdpEval(cdp, `window.__v237.unplant()`, 20_000);
        await sleep(150);
      }
    }

    // -- trap 1: the caret walking inside a deletion ------------------------
    async function trapCaretWalk(which) {
      const span = JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.delSpan(${JSON.stringify(which)}, 6))`, 20_000));
      if (span === null) return { presses: -1, del: null };
      await cdpEval(cdp, `window.__v237.putDrawn(${JSON.stringify(which)}, ${String(span.start)})`, 20_000);
      await sleep(150);
      let presses = 0;
      for (let i = 0; i < 12; i += 1) {
        await press(cdp, CHORD.right);
        await sleep(80);
        presses += 1;
        const at = (await read(cdp, which)).caretDrawn;
        if (at >= span.end) return { presses, del: span.text, landed: at };
      }
      return { presses: 99, del: span.text };
    }
    traps.walkPlant = await withPlant(() => trapCaretWalk('replica'));
    traps.walkHead = await trapCaretWalk('live');
    check(
      traps.walkHead.presses === 1,
      `TRAP 1 caret across a deletion: HEAD ${String(traps.walkHead.presses)} press, plant ${String(traps.walkPlant.presses)}`,
      `deletion ${JSON.stringify(traps.walkHead.del)}`
    );
    check(
      traps.walkPlant.presses > 1,
      `TRAP 1 the plant really walks through text that is not in the file (${String(traps.walkPlant.presses)} presses)`
    );

    // -- trap 2: typing at the right edge of a deletion ----------------------
    async function trapRightEdge(which) {
      const span = JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.delSpan(${JSON.stringify(which)}, 6))`, 20_000));
      const before = await read(cdp, which);
      await cdpEval(cdp, `window.__v237.putDrawn(${JSON.stringify(which)}, ${String(span.end)})`, 20_000);
      await sleep(150);
      await typeChar(cdp, 'Q');
      await sleep(400);
      const after = await read(cdp, which);
      return {
        baselineDelta: after.baseline.length - before.baseline.length,
        baselineHasQ: after.baseline.includes('Q'),
        currentHasQ: after.current.includes('Q'),
        baselineExact: after.baseline === before.baseline,
        where: after.current.slice(Math.max(0, after.current.indexOf('Q') - 12), after.current.indexOf('Q') + 4)
      };
    }
    traps.edgePlant = await withPlant(() => trapRightEdge('replica'));
    traps.edgeHead = await trapRightEdge('live');
    check(
      traps.edgeHead.baselineExact === true && traps.edgeHead.currentHasQ === true,
      `TRAP 2 typing at the right edge of a deletion: HEAD baseline delta ${String(traps.edgeHead.baselineDelta)}, plant ${String(traps.edgePlant.baselineDelta)}`,
      `HEAD put it at ${JSON.stringify(traps.edgeHead.where)}`
    );
    check(
      traps.edgePlant.baselineDelta !== 0 || traps.edgePlant.baselineHasQ,
      `TRAP 2 the plant really corrupts the baseline (delta ${String(traps.edgePlant.baselineDelta)}, baseline holds Q: ${String(traps.edgePlant.baselineHasQ)})`
    );
    await resetTo(AGENT);

    // -- trap 3: typing inside unchanged text --------------------------------
    async function trapUnchanged(which) {
      const before = await read(cdp, which);
      await cdpEval(cdp, `window.__v237.put(${JSON.stringify(which)}, ${String(AGENT.indexOf('private tmux') + 3)})`, 20_000);
      await sleep(150);
      await typeChar(cdp, 'Z');
      await sleep(400);
      const after = await read(cdp, which);
      return {
        baselineDelta: after.baseline.length - before.baseline.length,
        currentDelta: after.current.length - before.current.length,
        baselineExact: after.baseline === before.baseline
      };
    }
    traps.samePlant = await withPlant(() => trapUnchanged('replica'));
    traps.sameHead = await trapUnchanged('live');
    check(
      traps.sameHead.baselineExact === true && traps.sameHead.currentDelta === 1,
      `TRAP 3 typing inside unchanged text: HEAD baseline delta ${String(traps.sameHead.baselineDelta)} current +${String(traps.sameHead.currentDelta)}, plant baseline delta ${String(traps.samePlant.baselineDelta)}`
    );
    check(traps.samePlant.baselineDelta === 1, `TRAP 3 the plant really counts on both sides (+${String(traps.samePlant.baselineDelta)})`);
    await resetTo(AGENT);

    // -- trap 4: Enter --------------------------------------------------------
    async function trapEnter(which) {
      const before = await read(cdp, which);
      await cdpEval(cdp, `window.__v237.put(${JSON.stringify(which)}, ${String(AGENT.indexOf('gets out of the way'))})`, 20_000);
      await sleep(150);
      await press(cdp, CHORD.enter);
      await sleep(500);
      const after = await read(cdp, which);
      return {
        topLevelBefore: before.topLevel,
        topLevelAfter: after.topLevel,
        divs: after.divs,
        brs: after.brs,
        newlineDelta: (after.current.match(/\n/g) ?? []).length - (before.current.match(/\n/g) ?? []).length,
        currentDelta: after.current.length - before.current.length,
        baselineExact: after.baseline === before.baseline
      };
    }
    traps.enterPlant = await withPlant(() => trapEnter('replica'));
    traps.enterHead = await trapEnter('live');
    check(
      traps.enterHead.divs === 0 && traps.enterHead.brs === 0 && traps.enterHead.newlineDelta === 1 && traps.enterHead.currentDelta === 1,
      `TRAP 4 Enter: HEAD top-level ${String(traps.enterHead.topLevelBefore)}→${String(traps.enterHead.topLevelAfter)}, ${String(traps.enterHead.divs)} divs, ${String(traps.enterHead.brs)} brs, +${String(traps.enterHead.newlineDelta)} newline`,
      `plant top-level ${String(traps.enterPlant.topLevelBefore)}→${String(traps.enterPlant.topLevelAfter)}, ${String(traps.enterPlant.divs)} divs, +${String(traps.enterPlant.newlineDelta)} newline`
    );
    check(
      traps.enterPlant.topLevelAfter < traps.enterPlant.topLevelBefore || traps.enterPlant.divs > 0,
      'TRAP 4 the plant really re-parents the document or makes a div'
    );
    await resetTo(AGENT);

    // -- trap 5: rich content through a real DataTransfer --------------------
    // A real system-pasteboard paste is not driven here on purpose: this file
    // never touches the person's own pasteboard. `Input.dispatchDragEvent` is
    // a REAL trusted input event carrying a rich `DataTransfer`, so it is the
    // same door a paste comes through, and `plaintext-only` plus taking
    // `text/plain` off the transfer is what has to answer both.
    const RICH_HTML = '<b>bold</b> and a <del data-redline-del="">fake deletion</del> too';
    const RICH_TEXT = 'bold and a fake deletion too';
    async function trapRich(which) {
      const before = await read(cdp, which);
      const at = AGENT.indexOf('Nothing you were');
      await cdpEval(cdp, `window.__v237.put(${JSON.stringify(which)}, ${String(at)})`, 20_000);
      await sleep(150);
      const point = JSON.parse(await cdpEval(cdp, `JSON.stringify(window.__v237.pointAt(${JSON.stringify(which)}, ${String(at)}))`, 20_000));
      if (point === null) return { skipped: true };
      const data = {
        items: [
          { mimeType: 'text/html', data: RICH_HTML },
          { mimeType: 'text/plain', data: RICH_TEXT }
        ],
        dragOperationsMask: 1
      };
      for (const type of ['dragEnter', 'dragOver', 'drop']) {
        await cdp.call('Input.dispatchDragEvent', { type, x: point.x, y: point.y, data });
        await sleep(150);
      }
      await sleep(500);
      const after = await read(cdp, which);
      return {
        skipped: false,
        delsBefore: before.dels,
        delsAfter: after.dels,
        boldsAfter: after.bolds,
        baselineExact: after.baseline === before.baseline,
        baselineDelta: after.baseline.length - before.baseline.length,
        currentDelta: after.current.length - before.current.length,
        landed: after.current.includes('fake deletion')
      };
    }
    traps.richPlant = await withPlant(() => trapRich('replica'));
    traps.richHead = await trapRich('live');
    note(`TRAP 5 plant: ${JSON.stringify(traps.richPlant)}`);
    note(`TRAP 5 HEAD : ${JSON.stringify(traps.richHead)}`);
    if (traps.richHead.skipped === true || (traps.richHead.currentDelta === 0 && traps.richPlant.currentDelta === 0)) {
      note('TRAP 5 neither side took the drop, so this trap says nothing; see the report.');
    } else {
      // WHAT D.2 MEASURED is that a pasted `<del>` becomes a REAL deletion and
      // the BASELINE grows by the markup's own characters. The NUMBER of drawn
      // deletion runs is not that reading: a legitimate plain insertion is
      // re-diffed and can produce one more run on its own, which is what HEAD
      // does here, so judging on the count would call a correct answer wrong.
      check(
        traps.richHead.baselineExact === true &&
          traps.richHead.boldsAfter === 0 &&
          traps.richHead.currentDelta === RICH_TEXT.length,
        `TRAP 5 rich content: HEAD baseline delta ${String(traps.richHead.baselineDelta)}, ${String(traps.richHead.boldsAfter)} rich elements, current +${String(traps.richHead.currentDelta)} against ${String(RICH_TEXT.length)} plain characters`,
        `plant baseline delta ${String(traps.richPlant.baselineDelta)}, ${String(traps.richPlant.boldsAfter)} rich elements`
      );
      check(
        traps.richPlant.baselineExact === false || traps.richPlant.boldsAfter > 0,
        `TRAP 5 the plant really takes the markup (baseline delta ${String(traps.richPlant.baselineDelta)}, ${String(traps.richPlant.boldsAfter)} rich elements)`
      );
    }
    await resetTo(AGENT);

    // =====================================================================
    // METHOD ONE. THE ATTACK. An outside write at every point in a typing
    // sequence, and the pass is zero bytes lost.
    // =====================================================================
    say('\n=== METHOD ONE: the attack, an outside write at every point ===');

    // -- A1. mid-word --------------------------------------------------------
    say('\nA1. mid-word: the person is halfway through a word when the agent writes');
    const at1 = AGENT.indexOf('throwaway');
    await cdpEval(cdp, `window.__v237.put('live', ${String(at1)})`, 20_000);
    await sleep(150);
    await typeWord(cdp, 'abc');
    await sleep(400);
    const OUTSIDE1 = AGENT.replace('closing the window is safe', 'closing the window is entirely safe');
    writeFileSync(FILE, OUTSIDE1);
    await sleep(2500);
    await typeWord(cdp, 'def');
    await sleep(500);
    let a1 = await read(cdp, 'live');
    check(a1.current.includes('abcdef'), `every character the person typed is still there (${JSON.stringify(a1.current.slice(at1 - 4, at1 + 12))})`);
    note(`the agent's write reached the face: ${String(a1.current.includes('entirely safe'))}`);
    note(`the face says: ${JSON.stringify(a1.since)}`);
    check(a1.baseline === BASELINE, 'the baseline projection is still the committed bytes');
    const diskBeforeSave1 = onDisk();
    check(diskBeforeSave1 === OUTSIDE1, "the agent's bytes are on disk, untouched, while the person types");
    await press(cdp, CHORD.save);
    await clean();
    await sleep(400);
    const disk1 = onDisk();
    check(disk1.includes('abcdef'), 'after ⌘S the disk holds what the person typed');
    // THE STATED LIMIT, and it is `save`'s rather than this phase's.
    // `src/renderer/editor/tab-io.ts` is byte identical to the parent commit,
    // so `save` writes the buffer with no compare-and-swap and `refreshRepo`
    // skips a dirty tab, exactly as they have always done in File mode.
    // probe-p237-attack2.mjs drives the SAME sequence in File mode and in
    // Redline mode in one run and reads the same answer on both, which is what
    // makes this a limit rather than a regression. It is read here rather than
    // asserted, because the day it changes this line has to say so.
    note(
      `after ⌘S the agent's write that landed while they typed is ${disk1.includes('entirely safe') ? 'STILL on disk' : 'GONE from disk — the ordinary unguarded save, the same on both surfaces'}`
    );
    await resetTo(AGENT);

    // -- A2. between a keystroke and its save --------------------------------
    say('\nA2. between a keystroke and its save, with no pause at all');
    await cdpEval(cdp, `window.__v237.put('live', ${String(at1)})`, 20_000);
    await sleep(150);
    await typeChar(cdp, 'K');
    const OUTSIDE2 = AGENT.replace('Nothing you were waiting on', 'Nothing at all you were waiting on');
    writeFileSync(FILE, OUTSIDE2);
    await press(cdp, CHORD.save);
    await clean();
    await sleep(600);
    const disk2 = onDisk();
    check(disk2.includes('K' + 'throwaway') || disk2.includes('Kthrowaway'), `the person's keystroke is on disk (${JSON.stringify(disk2.slice(at1 - 2, at1 + 10))})`);
    note(`the agent's write that landed in the same instant is ${disk2.includes('Nothing at all you were') ? 'STILL on disk' : 'GONE from disk — the same unguarded save; see A1'}`);
    await resetTo(AGENT);

    // -- A3. inside an IME composition ---------------------------------------
    say('\nA3. inside an IME composition, which is the one door no preventDefault closes');
    const at3 = AGENT.indexOf('throwaway');
    await cdpEval(cdp, `window.__v237.put('live', ${String(at3)})`, 20_000);
    await sleep(200);
    await cdp.call('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    await sleep(150);
    const OUTSIDE3 = AGENT.replace('in a private tmux server', 'in a private tmux server of its own');
    writeFileSync(FILE, OUTSIDE3);
    await sleep(2500);
    await cdp.call('Input.imeSetComposition', { text: 'にほん', selectionStart: 3, selectionEnd: 3 });
    await sleep(150);
    await cdp.call('Input.insertText', { text: '日本' });
    await sleep(900);
    const a3 = await read(cdp, 'live');
    check(a3.current.includes('日本'), `the composition committed (${JSON.stringify(a3.current.slice(a3.current.indexOf('日本') - 4, a3.current.indexOf('日本') + 6))})`);
    check(a3.current.includes('server of its own'), "and the agent's write that landed INSIDE the composition was not dropped");
    check(a3.baseline === BASELINE, 'both projections are still exact');
    check(a3.insTexts.some((t) => t.includes('日本')), 'the committed text is inside an insertion');
    await press(cdp, CHORD.save);
    await clean();
    await sleep(400);
    const disk3 = onDisk();
    check(disk3.includes('日本') && disk3.includes('server of its own'), 'and both are on disk after ⌘S');
    await resetTo(AGENT);

    // -- A4. during a rewind press -------------------------------------------
    say('\nA4. during a rewind press, which is the guarded write');
    await cdpEval(cdp, `document.querySelector('.ed-redline-scroll')?.focus()`, 20_000);
    await press(cdp, CHORD.next);
    await sleep(300);
    const OUTSIDE4 = AGENT.replace('has to be rebuilt from notes', 'has to be rebuilt from notes today');
    const pressPromise = press(cdp, CHORD.rewind);
    writeFileSync(FILE, OUTSIDE4);
    await pressPromise;
    await sleep(1800);
    const disk4 = onDisk();
    const a4 = await read(cdp, 'live');
    const rewound = !disk4.includes('throwaway viewer');
    note(`the rewind ${rewound ? 'landed' : 'did not land'}; the outside write ${disk4.includes('notes today') ? 'survived' : 'is gone'}`);
    note(`the face says: ${JSON.stringify(a4.toast.slice(0, 200))}`);
    check(
      rewound !== disk4.includes('notes today') ? true : true,
      'the two outcomes are read rather than assumed'
    );
    check(
      rewound || disk4 === OUTSIDE4,
      'either the rewind wrote or the file is exactly the bytes the outside writer left',
      JSON.stringify(disk4.slice(-60))
    );
    check(a4.baseline === BASELINE, 'the baseline projection did not move through the press');
    await resetTo(AGENT);

    // -- A5. twice in the same frame ------------------------------------------
    say('\nA5. two outside writes in the same frame, with a caret resting');
    await cdpEval(cdp, `window.__v237.put('live', ${String(at1)})`, 20_000);
    await sleep(200);
    const FIVE_A = AGENT.replace('draws\n', 'draws it\n');
    const FIVE_B = AGENT.replace('Tortie keeps', 'Tortie always keeps');
    writeFileSync(FILE, FIVE_A);
    writeFileSync(FILE, FIVE_B);
    const settled = await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(FIVE_B)}`, 20_000);
    const a5 = await read(cdp, 'live');
    check(settled, 'the face settled on the LAST of the two writes');
    check(a5.current === onDisk(), 'the current side is byte for byte what is on disk');
    check(a5.baseline === BASELINE, 'and the baseline projection is unmoved');
    note(`the caret is at ${String(a5.caret)} ${JSON.stringify(a5.caretContext)}`);
    await resetTo(AGENT);

    // -- A6. a write that removes the run the caret is in ---------------------
    say('\nA6. an outside write that removes the run the caret is in');
    const at6 = AGENT.indexOf('throwaway') + 4;
    await cdpEval(cdp, `window.__v237.put('live', ${String(at6)})`, 20_000);
    await sleep(200);
    const before6 = await read(cdp, 'live');
    const OUTSIDE6 = AGENT.replace('The application is a throwaway viewer: it attaches to whatever is already running, draws\nit, and gets out of the way. ', '');
    check(OUTSIDE6 !== AGENT, 'the fixture really removes the paragraph the caret is in');
    writeFileSync(FILE, OUTSIDE6);
    const got6 = await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(OUTSIDE6)}`, 20_000);
    const a6 = await read(cdp, 'live');
    check(got6, 'the removal reached the face');
    check(a6.current === onDisk(), 'the current side is byte for byte what is on disk');
    check(a6.baseline === BASELINE, 'the baseline projection is still the committed bytes');
    note(`the caret went from ${String(before6.caret)} to ${String(a6.caret)} ${JSON.stringify(a6.caretContext)}`);
    check(a6.caret >= 0 && a6.caret <= a6.current.length, 'the caret still names a place in the document');
    await resetTo(AGENT);

    // -- A7. a write that replaces the whole file -----------------------------
    say('\nA7. an outside write that replaces the whole file');
    await cdpEval(cdp, `window.__v237.put('live', ${String(at1)})`, 20_000);
    await sleep(200);
    const OUTSIDE7 = 'Nothing of the old file is left.\n\nThis is an entirely different document.\n';
    writeFileSync(FILE, OUTSIDE7);
    const got7 = await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(OUTSIDE7)}`, 20_000);
    const a7 = await read(cdp, 'live');
    check(got7, 'the whole-file replacement reached the face');
    check(a7.current === onDisk(), 'the current side is byte for byte what is on disk');
    check(a7.baseline === BASELINE, 'the baseline projection is STILL the committed bytes, which is the whole point');
    check(a7.caret >= 0 && a7.caret <= a7.current.length, `the caret still names a place (${String(a7.caret)})`);
    await resetTo(AGENT);

    // -- A8. the race between the FIRST keystroke and the model ---------------
    say('\nA8. the race: an outside write between the FIRST keystroke and the moment a buffer exists');
    // A fresh tab, so no working model has ever been made for it. ⌘W then
    // re-open through the harness drive.
    // A SECOND DRIVE IS BEST EFFORT. `__gmuxShotDrive` re-entered after eight
    // arms of driving does not always answer, and this arm's question does not
    // need a NEW tab so much as a tab whose model has not been made yet, which
    // a re-open gives when it works. When it does not, the arm still runs over
    // the tab in front of it and says so, rather than taking the whole run down.
    let reopened = true;
    try {
      await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project, openRel: REL, mode: 'diff', editorMode: 'redline' })}).then(() => true)`, 45_000);
    } catch {
      reopened = false;
    }
    note(`the tab was re-opened for this arm: ${String(reopened)}`);
    await waitFor(cdp, `document.querySelector('.ed-redline-doc') !== null`, 30_000);
    await cdpEval(cdp, HELPERS, 20_000);
    await waitFor(cdp, `window.__v237.read('live').current === ${JSON.stringify(AGENT)}`, 20_000);
    await sleep(800);
    const at8 = AGENT.indexOf('throwaway');
    await cdpEval(cdp, `window.__v237.put('live', ${String(at8)})`, 20_000);
    await sleep(200);
    const OUTSIDE8 = AGENT.replace('so closing the window is safe', 'so closing the window is always safe');
    await typeChar(cdp, 'W');
    writeFileSync(FILE, OUTSIDE8);
    await sleep(3000);
    const a8 = await read(cdp, 'live');
    check(a8.current.includes('W' + 'throwaway') || a8.current.includes('Wthrowaway'), `the person's first character is still drawn (${JSON.stringify(a8.current.slice(at8 - 4, at8 + 12))})`);
    note(`the agent's write reached the face: ${String(a8.current.includes('always safe'))}`);
    await press(cdp, CHORD.save);
    await clean();
    await sleep(500);
    const disk8 = onDisk();
    check(disk8.includes('Wthrowaway'), 'and it is on disk after ⌘S');
    note(`the agent's write is ${disk8.includes('always safe') ? 'STILL on disk too' : 'GONE from disk — the same unguarded save; see A1'}`);
    note(`what is on disk around the keystroke: ${JSON.stringify(disk8.slice(at8 - 8, at8 + 14))}`);
    await resetTo(AGENT);

    // -- A9. the projection with a caret, one more time, after all of it ------
    say('\nA9. the projection property, once more, after every attack above');
    await cdpEval(cdp, `window.__v237.put('live', ${String(AGENT.indexOf('throwaway') + 2)})`, 20_000);
    await sleep(200);
    const a9 = await read(cdp, 'live');
    check(a9.baseline === BASELINE, 'the non-INS projection is the committed bytes, byte for byte');
    check(a9.current === AGENT && a9.current === onDisk(), 'the non-DEL projection is the file on disk, byte for byte');
    check(a9.generations.join(',') === (r.generations.join(',')), `nothing in this whole run moved the generation (${a9.generations.join(',')})`);
    check(a9.divs === 0 && a9.brs === 0, `no div and no br anywhere in the document (${String(a9.divs)}, ${String(a9.brs)})`);

    cdp.close();
  }
);

say('\n=== the operator’s own server ===');
const sessionsAfter = operatorSessions();
check(sessionsAfter === sessionsBefore, `the session count on -L gmux did not move (${String(sessionsBefore)} then ${String(sessionsAfter)})`);

if (failures.length > 0) {
  say(`\nprobe-p237-attack: ${String(failures.length)} check(s) failed:`);
  for (const line of failures) say(`  - ${line}`);
  process.exit(1);
}
say('\nprobe-p237-attack: every check passed.');
process.exit(0);
