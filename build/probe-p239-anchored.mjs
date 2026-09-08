#!/usr/bin/env node
/**
 * probe-p239-anchored.mjs. THE PHASE 239 VERIFIER'S APP RUN.
 *
 * Written by the VERIFIER, independent of the builder, who ran NO app of its
 * own at all (its report says so: "What I could not do — no screenshots at the
 * four pane widths"; the only app run it took was Phase 236's committed probe).
 *
 * ONE Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket. It spawns no agent, spends no token, opens no keychain and makes no
 * request. The "agent" that writes a file from outside is a plain /bin/sh.
 *
 * ## THE INDEPENDENT METHOD, AND WHAT IS NEW IN IT
 *
 * Phase 236's ruler reads the document's height and every change's
 * getClientRects()[0]. Research 99 §1.2 measured that ruler going BLIND to one
 * real decoration and CRYING WOLF on one non-event, and named two rules for a
 * Phase 239 verifier: take both readings in the SAME focus state, and pair the
 * change-rect ruler with a LINE-EDGE reading, because that is the reading that
 * says whether a glyph moved. A `border-left` rail moved a line's right edge by
 * 2.00px while every change rect but its own stood still.
 *
 * So this ruler is Phase 236's PLUS a bucketed line-edge reading of its own:
 * every text node's Range rects, bucketed by their top to 0.5px, reduced to one
 * min-left and one max-right per row. It is proved on the refused shape before
 * it is trusted, at every width, and it is proved on the `border-left` rail the
 * change ruler cannot see.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` whatever happened. The tmux socket is this script's
 * own, ended and unlinked by build/harness-socket.mjs; `gmux` and `default` are
 * refused by name. The operator's own -L gmux sessions are counted before and
 * after, read only, and must not move. The system pasteboard is saved before
 * the one copy this run takes and put back in a `finally` inside main. Every
 * file this run writes is under GMUX_HARNESS_DIR.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p239v]';
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
// The graders. Proved under --self-test before any app is launched.
// ---------------------------------------------------------------------------

/** Phase 236's half: the document box and every change's FIRST client rect. */
function changeFindings(a, b) {
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
    if (x === null || y === null) { if (x !== y) out.push(`change ${i} rect appeared or vanished`); continue; }
    for (const k of ['left', 'top', 'width', 'height']) {
      if (x[k] !== y[k]) out.push(`change ${i} first rect ${k} moved ${String(x[k])} -> ${String(y[k])}`);
    }
  }
  return out;
}

/**
 * THE NEW HALF, and it is the thing Phase 236's ruler cannot see. Every drawn
 * row's own left and right edge. Research 99 §5 measured a `border-left` rail
 * at 2.00px on a line's right edge with no other change rect moving at all.
 */
function lineFindings(a, b) {
  const out = [];
  if (a === null || b === null) return ['a reading is missing'];
  if (a.lines.length !== b.lines.length) {
    out.push(`line box count moved ${a.lines.length} -> ${b.lines.length}`);
    return out;
  }
  for (let i = 0; i < a.lines.length; i += 1) {
    for (const k of ['left', 'right', 'top']) {
      if (a.lines[i][k] !== b.lines[i][k]) {
        out.push(`line ${i} ${k} moved ${String(a.lines[i][k])} -> ${String(b.lines[i][k])}`);
      }
    }
  }
  return out;
}

/**
 * IS THIS SET OF CHANGE FINDINGS THE FRAGMENT COALESCING, AND NOTHING ELSE?
 *
 * The Phase 239 verifier recorded it as an instrument note rather than a
 * defect and this is that note made mechanical. Putting `data-current` on an
 * UNFOCUSED wrapper merges that change's two inline fragments into ONE client
 * rect — 37.95 -> 72.98px at every one of the four widths, which is exactly
 * the sum of the two — while every line edge stands perfectly still, and it
 * does not come back when the attribute is removed. No glyph moved: what
 * changed is how many rectangles Chromium reports for one inline box once a
 * paint property lands on it. So the CHANGE ruler is one-way here and the LINE
 * ruler is the reading that answers "did anything move", which is exactly the
 * pairing research 99 §1.2 asked a Phase 239 verifier to build.
 *
 * The narrowest shape that can be it: no document box moved, no change
 * appeared or vanished, and every finding is a first rect WIDTH that GREW.
 * A rect that moved sideways, a taller document or a width that SHRANK is a
 * real finding and this answers false for all three.
 */
function fragmentCoalescingOnly(findings) {
  return findings.every((f) => {
    const m = /^change \d+ first rect width moved ([\d.]+) -> ([\d.]+)$/.exec(f);
    return m !== null && Number(m[2]) > Number(m[1]);
  });
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
  if (!above && !below && !clamped) out.push('chip is neither above nor below the first rect');
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
  const L = (left, right, top) => ({ left, right, top });
  const base = {
    docTop: 1, docLeft: 2, docWidth: 3, docHeight: 4, scrollHeight: 5,
    rects: [R(10, 20, 30, 15), R(50, 60, 20, 15)],
    lines: [L(100, 500, 20), L(100, 480, 40)]
  };
  const clone = () => JSON.parse(JSON.stringify(base));
  const same = clone();
  const side = clone(); side.rects[1].left = 95.12;
  const tall = clone(); tall.docHeight = 5.42;
  const fewer = clone(); fewer.rects.pop();
  // The border-left rail: no other change rect moved, one line's RIGHT edge did.
  const rail = clone(); rail.lines[0].right = 502;
  const railChange = clone(); railChange.lines[0].right = 502; railChange.rects[0].left = 12;
  // The mark's own artifact: one first rect grew to the sum of two fragments.
  const merged = clone(); merged.rects[0].width = 72.984375;
  const shrunk = clone(); shrunk.rects[0].width = 12;
  const view = R(569, 110, 871, 775);
  const first = R(1185.82, 433.23, 44.7, 15);
  const union = R(750.09, 433.23, 480.43, 36.45);
  const fixtures = [
    ['identical readings, change ruler', () => changeFindings(base, same).length, 0],
    ['identical readings, line ruler', () => lineFindings(base, same).length, 0],
    ['one change pushed sideways', () => changeFindings(base, side).length, 1],
    ['the document grew taller', () => changeFindings(base, tall).length, 1],
    ['a change disappeared', () => changeFindings(base, fewer).length, 1],
    ['THE RAIL: the change ruler is blind to it', () => changeFindings(base, rail).length, 0],
    ['THE RAIL: the line ruler names it', () => lineFindings(base, rail).length, 1],
    ['the rail that also widens its own change', () => changeFindings(base, railChange).length, 1],
    ['a line box vanished', () => lineFindings(base, { ...base, lines: [base.lines[0]] }).length, 1],
    ['THE MARK\'S ARTIFACT: a first rect width that only grew is coalescing', () => fragmentCoalescingOnly(changeFindings(base, merged)) ? 1 : 0, 1],
    ['a first rect that moved sideways is NOT coalescing', () => fragmentCoalescingOnly(changeFindings(base, side)) ? 1 : 0, 0],
    ['a document that grew taller is NOT coalescing', () => fragmentCoalescingOnly(changeFindings(base, tall)) ? 1 : 0, 0],
    ['a first rect width that SHRANK is NOT coalescing', () => fragmentCoalescingOnly(changeFindings(base, shrunk)) ? 1 : 0, 0],
    ['a change that vanished is NOT coalescing', () => fragmentCoalescingOnly(changeFindings(base, fewer)) ? 1 : 0, 0],
    ['nothing moved at all reads as coalescing, being no reflow', () => fragmentCoalescingOnly(changeFindings(base, same)) ? 1 : 0, 1],
    ['the chip on the first rect, above', () => anchorFindings(R(1185.82, 401.23, 200, 28), first, union, view, 4, 0.6).length, 0],
    ['the chip on the bounding box', () => anchorFindings(R(750.09, 401.23, 200, 28), first, union, view, 4, 0.6).length, 2],
    ['no chip at all', () => anchorFindings(null, first, union, view, 4, 0.6).length, 1]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good = got === want;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${label}: ${got} finding(s), wanted ${want}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${fixtures.length} fixtures, ${ok ? 'all behaved' : 'one or more did not'}`);
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
if (!selfTest()) { say('the graders do not behave; refusing to launch anything'); process.exit(1); }

// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p239v-${String(process.pid)}`, `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p239v'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p239v'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const shots = join(root, 'shots');
const readingsFile = join(root, 'verifier-readings.json');
for (const d of [home, profile, project, shots]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

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

// The prose fixture. Nine changes, every changing word unique and free of
// hyphens and digits so the word tokeniser cannot be graded on its own mistake.
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
// THE THREE OPENING SHAPES. A is committed and untouched; B is untracked and
// written before the app launches; C is written by a plain /bin/sh AFTER the
// app is up and before anybody opens it, which is research 83 A1.2 property 2.
writeFileSync(join(project, 'tracked.txt'), 'A tracked file that nobody has touched since the commit.\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p239v@example.invalid');
git('config', 'user.name', 'p239v');
git('add', '.');
git('commit', '-q', '-m', 'first');
writeFileSync(join(project, 'loose.txt'), 'A loose file that git has never heard of.\n');

// ---------------------------------------------------------------------------
// The reads, all off the LIVE DOM.
// ---------------------------------------------------------------------------

/**
 * THE RULER. Phase 236's half plus the line-edge half research 99 §1.2 asked
 * for. Full precision on the change rects; the line rows are bucketed by their
 * top to 0.5px so a fragmented inline box cannot be mistaken for a moved glyph.
 */
const LAYOUT = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  if (doc === null) return null;
  const d = doc.getBoundingClientRect();
  const rect = (el) => { const r = el.getClientRects()[0]; return r ? { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right } : null; };
  // Every TEXT node's own rects, bucketed into rows. A row's left is the
  // leftmost glyph on it and its right the rightmost, whatever the inline
  // fragmentation is doing above them.
  const buckets = new Map();
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if ((n.nodeValue ?? '').trim() === '') continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width <= 0 && r.height <= 0) continue;
      const key = Math.round((r.top - d.top) * 2) / 2;
      const cur = buckets.get(key);
      if (cur === undefined) buckets.set(key, { top: key, left: r.left, right: r.right });
      else { cur.left = Math.min(cur.left, r.left); cur.right = Math.max(cur.right, r.right); }
    }
  }
  const lines = Array.from(buckets.values()).sort((a, b) => a.top - b.top);
  return {
    docTop: d.top, docLeft: d.left, docWidth: d.width, docHeight: d.height,
    scrollHeight: doc.scrollHeight,
    scrollTop: document.querySelector('.ed-redline-scroll').scrollTop,
    rects: Array.from(doc.querySelectorAll('.ed-redline-change')).map(rect),
    lines,
    activeClass: document.activeElement === null ? null : document.activeElement.className,
    text: doc.textContent
  };
})()`;

const FACE = `(() => {
  const view = document.querySelector('.ed-redline-view');
  const doc = document.querySelector('.ed-redline-doc');
  const chip = document.querySelector('.ed-redline-chip');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
  const wraps = doc ? Array.from(doc.querySelectorAll('.ed-redline-change')) : [];
  const v = view ? view.getBoundingClientRect() : null;
  const idx = (chip === null || v === null) ? -1 : wraps.findIndex((w) => {
    const r = w.getClientRects()[0];
    if (!r) return false;
    const c = chip.getBoundingClientRect();
    const want = v.left + Math.max(0, Math.min(r.left - v.left, v.width - c.width));
    const wantTop = r.top - 4 - c.height;
    const wantBelow = r.bottom + 4;
    const near = Math.abs(c.top - wantTop) <= 0.6 || Math.abs(c.top - wantBelow) <= 0.6 || Math.abs(c.top - v.top) <= 0.6 || Math.abs(c.bottom - (v.top + v.height)) <= 0.6;
    return Math.abs(c.left - want) <= 0.6 && near;
  });
  const a = document.activeElement;
  const noteButton = document.querySelector('.ed-redline-note-button');
  return {
    chip: box(chip),
    chipText: chip ? chip.textContent : null,
    chipTagged: chip ? chip.hasAttribute('data-redline-tag') : null,
    chipInsideDoc: chip && doc ? doc.contains(chip) : null,
    buttons: chip ? Array.from(chip.querySelectorAll('button')).map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label') ?? b.textContent, title: b.getAttribute('title'), tabIndex: b.tabIndex, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }) : null,
    chipOnChange: idx,
    currentIndex: wraps.findIndex((w) => w.hasAttribute('data-current')),
    currentCount: wraps.filter((w) => w.hasAttribute('data-current')).length,
    changes: wraps.map((w) => { const r = w.getClientRects()[0]; const u = w.getBoundingClientRect(); return { rects: w.getClientRects().length, first: r ? { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right } : null, union: { left: u.left, top: u.top, width: u.width, height: u.height, bottom: u.bottom, right: u.right }, del: w.dataset.changeDel ?? '', ins: w.dataset.changeIns ?? '', off: Number(w.dataset.changeOff), current: w.hasAttribute('data-current'), focused: w === document.activeElement }; }),
    view: box(view),
    panel: box(document.querySelector('.ed-panel')),
    activeClass: a === null ? null : a.className,
    activeIsChange: a !== null && a.classList !== undefined && a.classList.contains('ed-redline-change'),
    viewHTML: view ? view.outerHTML : null,
    docHTML: doc ? doc.outerHTML : null,
    notes: Array.from(document.querySelectorAll('.ed-redline-view .ed-note .banner-text')).map((n) => n.textContent),
    noteTitles: Array.from(document.querySelectorAll('.ed-redline-view .ed-note')).map((n) => n.getAttribute('title')),
    noteButton: noteButton === null ? null : { label: noteButton.getAttribute('aria-label'), title: noteButton.getAttribute('title'), text: noteButton.textContent, tagged: noteButton.hasAttribute('data-redline-tag'), box: box(noteButton) },
    modeLabels: Array.from(document.querySelectorAll('.ed-tabs-actions .ed-mode button')).map((b) => b.getAttribute('aria-label')),
    scrollerLabel: (document.querySelector('.ed-redline-scroll') ?? {}).ariaLabel ?? null,
    changeCount: wraps.length,
    delCount: doc ? doc.querySelectorAll('del').length : 0,
    insCount: doc ? doc.querySelectorAll('ins').length : 0,
    docChars: doc ? (doc.textContent ?? '').length : 0,
    toast: Array.from(document.querySelectorAll('.toasts .toast-text')).map((t) => t.textContent ?? ''),
    skeleton: document.querySelector('.ed-redline-view .ed-skeleton') !== null
  };
})()`;

const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const focusHost = `(() => { const d = document.querySelector('.ed-redline-doc'); if (!d) return false; d.focus(); return document.activeElement === d; })()`;
const blurAll = `(() => { const a = document.activeElement; if (a && a.blur) a.blur(); document.body.focus?.(); return true; })()`;
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
const ALT_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 1 };
const ALT_BACK = { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 };
const ALT_SHIFT_BACK = { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 9 };

/** Drag the editor divider so the panel lands on `wanted` CSS px. */
async function setPaneWidth(cdp, wanted) {
  const d = await cdpEval(cdp, `(() => { const d = document.querySelector('.ed-divider'); if (!d) return null; const r = d.getBoundingClientRect(); const p = document.querySelector('.ed-panel').getBoundingClientRect(); return { dx: r.left + r.width / 2, dy: r.top + r.height / 2, panelLeft: p.left, panelRight: p.right, panelWidth: p.width }; })()`, 20000);
  if (d === null) return null;
  const grabOffset = d.dx - d.panelLeft;
  const targetX = d.panelRight - wanted + grabOffset;
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: d.dx, y: d.dy, button: 'none', buttons: 0, pointerType: 'mouse' });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: d.dx, y: d.dy, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  for (let i = 1; i <= 8; i += 1) {
    const x = d.dx + ((targetX - d.dx) * i) / 8;
    await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: d.dy, button: 'left', buttons: 1, pointerType: 'mouse' });
    await sleep(30);
  }
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: targetX, y: d.dy, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
  await sleep(600);
  return await cdpEval(cdp, `(() => { const r = document.querySelector('.ed-panel').getBoundingClientRect(); return r.width; })()`, 20000);
}

/** Remount the redline so the current change goes back to nothing. */
async function remountRedline(cdp) {
  await cdpEval(cdp, clickMode('File'));
  await sleep(700);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await until(cdp, docHasChange, 20000);
  await sleep(500);
}

async function shot(cdp, name) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'png' }, 30000);
  const data = r.result?.data;
  if (typeof data !== 'string') return null;
  const file = join(shots, `${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

const readings = {};

await withElectron(
  {
    label: 'p239v',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 25 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    const main = await cdpForMain(handle, 60000);
    say('attached to the MAIN process over the node inspector');
    let restorePasteboard = null;
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Page.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project });
      await sleep(1200);

      // =================================================================
      // O. THE THREE OPENING FACES, at HEAD, read off the running app.
      // C is written NOW, after the app is up and before anybody opens it.
      // =================================================================
      shellWrite('made.txt', 'A file an agent wrote and finished before anybody opened it.\n');
      await sleep(600);
      const OPENING = [
        { key: 'A', rel: 'tracked.txt', what: 'a file with a HEAD version, opened cold and unchanged', mode: 'diff' },
        { key: 'B', rel: 'loose.txt', what: 'a file with no HEAD version, opened cold', mode: 'file' },
        { key: 'C', rel: 'made.txt', what: 'a file an agent created and finished before it was ever opened', mode: 'file' }
      ];
      readings.opening = {};
      for (const o of OPENING) {
        await drive(cdp, { projectPath: project, openRel: o.rel, mode: o.mode, editorWidth: 900 });
        await sleep(900);
        await cdpEval(cdp, clickMode('Redline'));
        await until(cdp, docSettled, 20000);
        await sleep(700);
        await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(400);
        const f = await face(cdp);
        readings.opening[o.key] = { cold: f };
        const visible = f.notes.filter((n) => (n ?? '').trim() !== '');
        note(`O${o.key}1`, `${o.key} (${o.rel}), ${o.what} — EVERY WORD ON THE FACE`, JSON.stringify(visible));
        note(`O${o.key}2`, `${o.key} the hover explanation`, JSON.stringify(f.noteTitles.filter((t) => t !== null)));
        note(`O${o.key}3`, `${o.key} mode rows, changes, del, ins, chars`, `${JSON.stringify(f.modeLabels)} ${String(f.changeCount)}/${String(f.delCount)}/${String(f.insCount)}/${String(f.docChars)}`);
        check(`O${o.key}4`, `${o.key} draws an empty picture and the face says the picture is empty`, f.changeCount === 0 && visible.some((n) => n.startsWith('Nothing has changed')), JSON.stringify(visible));
        check(`O${o.key}5`, `${o.key}'s resting face is ONE sentence, not a paragraph`, visible.length === 1 && visible[0].split('.').filter((s) => s.trim() !== '').length === 1 && visible[0].length <= 70, `${String(visible.length)} line(s), ${String((visible[0] ?? '').length)} chars, ${String((visible[0] ?? '').split(/\s+/).length)} words`);
        await shot(cdp, `opening-${o.key}`);
      }
      const sentA = (readings.opening.A.cold.notes.filter((n) => (n ?? '').trim() !== '')[0]) ?? '';
      const sentB = (readings.opening.B.cold.notes.filter((n) => (n ?? '').trim() !== '')[0]) ?? '';
      const sentC = (readings.opening.C.cold.notes.filter((n) => (n ?? '').trim() !== '')[0]) ?? '';
      check('O1', 'A and B no longer read alike, and A names the commit', sentA !== sentB && sentA.includes('the last commit'), `${JSON.stringify(sentA)} vs ${JSON.stringify(sentB)}`);
      check('O2', 'B carries a CLOCK TIME, which no face had before', /\bat \d\d:\d\d\./.test(sentB), JSON.stringify(sentB));
      check('O3', 'B and C are the same sentence, which the builder says is deliberate', sentB === sentC, `${JSON.stringify(sentB)} vs ${JSON.stringify(sentC)}`);
      check('O4', 'no face claims an agent did anything', ![sentA, sentB, sentC].some((s) => /agent/i.test(s)), '');

      // Then a plain shell writes to each, and the face must change.
      for (const o of OPENING) {
        shellWrite(o.rel, `${disk(o.rel).replace('file', 'FILE').replace('A ', 'One ')}A line the shell added.\n`);
      }
      await sleep(900);
      for (const o of OPENING) {
        await drive(cdp, { projectPath: project, openRel: o.rel, mode: o.mode });
        await sleep(800);
        await cdpEval(cdp, clickMode('Redline'));
        await until(cdp, docSettled, 20000);
        await sleep(800);
        await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(400);
        const f = await face(cdp);
        readings.opening[o.key].written = f;
        const visible = f.notes.filter((n) => (n ?? '').trim() !== '');
        note(`W${o.key}1`, `${o.key} after the shell wrote to it`, `${String(f.changeCount)} change(s); ${JSON.stringify(visible)}`);
        check(`W${o.key}2`, `${o.key}'s face goes back to "Marked since …" once there is something to draw`, f.changeCount > 0 && visible.some((n) => n.startsWith('Marked since')), JSON.stringify(visible));
      }

      // =================================================================
      // The control work, on the nine-change fixture.
      // =================================================================
      shellWrite('notes.txt', V2);
      await sleep(600);
      await drive(cdp, { projectPath: project, openRel: 'notes.txt', mode: 'diff', editorWidth: 1100 });
      await sleep(900);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await until(cdp, docHasChange, 20000);
      await sleep(700);

      // -----------------------------------------------------------------
      // L. THE INDEPENDENT METHOD, at four pane widths.
      // -----------------------------------------------------------------
      readings.widths = {};
      for (const wanted of [900, 700, 520, 380]) {
        const got = await setPaneWidth(cdp, wanted);
        await remountRedline(cdp);
        note(`L${wanted}.0`, `the pane after a real divider drag to ${String(wanted)}px`, String(got));

        // BOTH readings in the SAME focus state (research 99 §1.2): the editing
        // host holds the focus for both, so the inline-box merge cannot show up
        // as a finding.
        await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(250);
        await cdpEval(cdp, focusHost); await sleep(350);
        const f0 = await face(cdp);
        check(`L${wanted}.1`, `at ${String(wanted)}px nothing is current and no chip is drawn before the step`, f0.chip === null && f0.currentCount === 0, `chip ${JSON.stringify(f0.chip)}, current ${String(f0.currentCount)}`);
        // ---- ISOLATION 1: THE MARK, with the focus state held constant ----
        // Research 99 §1.2: a change's inline boxes MERGE when the editing
        // host takes focus, with no glyph moving, so a reading taken before a
        // press and one taken after are not comparable. The mark is therefore
        // isolated with NOTHING focused on either side, planted by hand on a
        // wrapper the render did not mark.
        const m0 = await layout(cdp);
        const markedOn = await cdpEval(cdp, `(() => { const w = document.querySelectorAll('.ed-redline-doc .ed-redline-change')[3]; if (!w) return false; w.setAttribute('data-current', ''); return true; })()`, 20000);
        await sleep(350);
        const m1 = await layout(cdp);
        const mcf = changeFindings(m0, m1);
        const mlf = lineFindings(m0, m1);
        // THE MARK IS JUDGED ON THE LINE EDGES, which is the reading that says
        // whether a glyph moved, with the change ruler held to the ONE shape
        // it is allowed to report — the fragment coalescing the verifier
        // recorded as an instrument note. `fragmentCoalescingOnly` refuses a
        // sideways move, a taller document, a vanished change and a width that
        // shrank, so this is narrower than dropping the change ruler.
        check(`L${wanted}.3`, `THE MARK MOVES NO GLYPH at ${String(wanted)}px, on the line ruler, with the focus held still`, markedOn === true && mlf.length === 0 && fragmentCoalescingOnly(mcf), mlf.concat(mcf).join('; ') || `${String(m0.rects.length)} changes, ${String(m0.lines.length)} line boxes, height ${String(m0.docHeight)}, identical`);
        note(`L${wanted}.3a`, `and what the change ruler reported for the mark at ${String(wanted)}px`, mcf.join('; ') || 'nothing at all');
        await cdpEval(cdp, `(() => { const w = document.querySelector('.ed-redline-doc .ed-redline-change[data-current]'); if (w) w.removeAttribute('data-current'); return true; })()`, 20000);
        await sleep(300);

        // THE RULER'S ABLATION FOR THE MARK: the `border-left` rail research
        // 99 §5 priced at 2.00px, planted on the SAME wrapper in the SAME
        // focus state, which only the line ruler can see.
        await cdpEval(cdp, `(() => { const w = document.querySelectorAll('.ed-redline-doc .ed-redline-change')[3]; if (!w) return false; w.style.borderLeft = '2px solid red'; return true; })()`, 20000);
        await sleep(350);
        const railed = await layout(cdp);
        const rcf = changeFindings(m0, railed);
        const rlf = lineFindings(m0, railed);
        check(`L${wanted}.3b`, `THE RULER CAN FAIL ON A MARK at ${String(wanted)}px: a border-left rail moves a line edge`, rlf.length > 0, `${String(rcf.length)} change finding(s), ${String(rlf.length)} line finding(s): ${rlf.slice(0, 2).join('; ')}`);
        await cdpEval(cdp, `(() => { const w = document.querySelectorAll('.ed-redline-doc .ed-redline-change')[3]; if (w) w.style.borderLeft = ''; return true; })()`, 20000);
        await sleep(300);
        const unrailed = await layout(cdp);
        const ucf = changeFindings(m0, unrailed);
        check(`L${wanted}.3c`, `and the rail came off, every line edge back to the pixel at ${String(wanted)}px`, lineFindings(m0, unrailed).length === 0 && fragmentCoalescingOnly(ucf), lineFindings(m0, unrailed).concat(ucf).join('; ') || 'identical');

        // The shipped shape: ⌥↓ makes change 0 current, marks it, draws the chip.
        await press(cdp, ALT_DOWN);
        await sleep(500);
        const f1 = await face(cdp);
        check(`L${wanted}.2`, `THE FIRST ⌥↓ LANDS: one change is current and the chip is drawn`, f1.currentCount === 1 && f1.currentIndex === 0 && f1.chip !== null, `current ${String(f1.currentIndex)} of ${String(f1.currentCount)}, chip ${f1.chip === null ? 'none' : 'drawn'}`);

        // ---- ISOLATION 2: THE CHIP, again with the focus held constant ----
        const before = await layout(cdp);
        await cdpEval(cdp, `(() => { const c = document.querySelector('.ed-redline-chip'); if (!c) return false; c.style.display = 'none'; return true; })()`, 20000);
        await sleep(350);
        const noChip = await layout(cdp);
        const ccf = changeFindings(before, noChip);
        const clf = lineFindings(before, noChip);
        check(`L${wanted}.4a`, `THE CONTROLS COST NOTHING at ${String(wanted)}px: the document is identical with them and without`, ccf.length === 0 && clf.length === 0, ccf.concat(clf).join('; ') || `${String(before.rects.length)} changes, ${String(before.lines.length)} line boxes, height ${String(before.docHeight)}, identical`);
        await cdpEval(cdp, `(() => { const c = document.querySelector('.ed-redline-chip'); if (c) c.style.display = ''; return true; })()`, 20000);
        await sleep(300);

        // The chip is on the change's FIRST client rect, never its bounding box.
        const cr = f1.changes[f1.chipOnChange >= 0 ? f1.chipOnChange : 0];
        const ar = anchorFindings(f1.chip, cr.first, cr.union, f1.view, 4, 0.6);
        check(`L${wanted}.4`, `the controls sit on the change's FIRST client rect at ${String(wanted)}px`, ar.length === 0 && f1.chipOnChange === f1.currentIndex, `chip on ${String(f1.chipOnChange)}, current ${String(f1.currentIndex)}; ${ar.join('; ')}`);

        // PERSISTENCE, which is the half of his ask that matters.
        await move(cdp, 4, 4);
        await sleep(500);
        const f2 = await face(cdp);
        const stayed = f2.chip !== null && f1.chip !== null && Math.abs(f2.chip.left - f1.chip.left) < 0.6 && Math.abs(f2.chip.top - f1.chip.top) < 0.6;
        check(`L${wanted}.5`, `HOVER AWAY AND THE CONTROLS STAY, unmoved, at ${String(wanted)}px`, stayed && f2.currentIndex === f1.currentIndex, f2.chip === null ? 'the chip vanished' : `${JSON.stringify(f1.chip)} -> ${JSON.stringify(f2.chip)}`);

        // THE RULER'S ABLATION FOR THE CONTROLS: the refused in-flow shape.
        const planted = await cdpEval(cdp, `(() => {
          const chip = document.querySelector('.ed-redline-chip');
          const doc = document.querySelector('.ed-redline-doc');
          if (chip === null || doc === null) return 0;
          let n = 0;
          for (const w of Array.from(doc.querySelectorAll('.ed-redline-change'))) {
            const copy = chip.cloneNode(true);
            copy.className = 'p239v-planted';
            copy.style.position = 'static';
            copy.style.display = 'inline-flex';
            copy.style.visibility = 'visible';
            w.after(copy);
            n += 1;
          }
          return n;
        })()`, 20000);
        await sleep(400);
        const ablated = await layout(cdp);
        const acf = changeFindings(before, ablated);
        const alf = lineFindings(before, ablated);
        const moves = before.rects.map((a, i) => (a && ablated.rects[i] ? { dx: ablated.rects[i].left - a.left, dy: ablated.rects[i].top - a.top } : null)).filter(Boolean);
        const maxDx = moves.length === 0 ? 0 : Math.max(...moves.map((m) => Math.abs(m.dx)));
        const maxDy = moves.length === 0 ? 0 : Math.max(...moves.map((m) => Math.abs(m.dy)));
        check(`L${wanted}.6`, `THE RULER CAN FAIL at ${String(wanted)}px: the refused in-flow control moves the document`, planted > 0 && acf.length > 0 && alf.length > 0, `${String(planted)} planted, ${String(acf.length)} change finding(s), ${String(alf.length)} line finding(s)`);
        note(`L${wanted}.6b`, `what the refused in-flow shape cost at ${String(wanted)}px`, `height +${(ablated.docHeight - before.docHeight).toFixed(2)}px, worst change moved ${maxDx.toFixed(2)}px sideways and ${maxDy.toFixed(2)}px down`);
        await cdpEval(cdp, `(() => { for (const el of Array.from(document.querySelectorAll('.p239v-planted'))) el.remove(); return true; })()`);
        await sleep(400);
        const restored = await layout(cdp);
        check(`L${wanted}.7`, `the ablation was removed and the document is back to the pixel at ${String(wanted)}px`, changeFindings(before, restored).length === 0 && lineFindings(before, restored).length === 0, changeFindings(before, restored).concat(lineFindings(before, restored)).join('; '));

        readings.widths[wanted] = { got, m0, m1, before, noChip, ablated, railed, f1, f2 };
        await shot(cdp, `width-${String(wanted)}`);
      }

      // -----------------------------------------------------------------
      // S. Stepping, and the mark following it.
      // -----------------------------------------------------------------
      await setPaneWidth(cdp, 900);
      await remountRedline(cdp);
      await cdpEval(cdp, focusHost); await sleep(300);
      const walk = [];
      for (let i = 0; i < 3; i += 1) { await press(cdp, ALT_DOWN); await sleep(350); walk.push((await face(cdp)).currentIndex); }
      check('S1', 'THREE ⌥↓ FROM A FRESH VIEW WALK 0, 1, 2 (research 99 §2.2 read 0, 0, 0 at the parent)', JSON.stringify(walk) === '[0,1,2]', JSON.stringify(walk));
      await press(cdp, ALT_UP); await sleep(350);
      const fUp = await face(cdp);
      check('S2', '⌥↑ walks back, and exactly one change is marked at a time', fUp.currentIndex === 1 && fUp.currentCount === 1, `current ${String(fUp.currentIndex)}, ${String(fUp.currentCount)} marked`);
      const arS = anchorFindings(fUp.chip, fUp.changes[fUp.currentIndex].first, fUp.changes[fUp.currentIndex].union, fUp.view, 4, 0.6);
      check('S3', 'and the controls moved with it, onto the new change\'s first rect', fUp.chipOnChange === fUp.currentIndex && arS.length === 0, `chip on ${String(fUp.chipOnChange)}; ${arS.join('; ')}`);

      // -----------------------------------------------------------------
      // -----------------------------------------------------------------
      // K. THE RECOMPOSE, IN TWO SHAPES. Research 99 §2.3 measured an outside
      // write taking the person's place away and named holding the change as
      // an IDENTITY as the whole of the fix. So: does it survive, and does it
      // survive a write that lands ABOVE the place as well as below it?
      // -----------------------------------------------------------------
      const caretAt = `(() => {
        const s = window.getSelection();
        if (s === null || s.rangeCount === 0) return null;
        const n = s.getRangeAt(0).startContainer;
        const e = n.nodeType === 1 ? n : n.parentElement;
        const w = e === null ? null : e.closest('.ed-redline-change');
        const all = Array.from(document.querySelectorAll('.ed-redline-doc .ed-redline-change'));
        return { index: w === null ? -1 : all.indexOf(w), inChange: w !== null };
      })()`;
      const held = fUp.changes[fUp.currentIndex];
      note('K0', 'the change the person stepped to', `index ${String(fUp.currentIndex)}, off ${String(held.off)}, "${held.del}" -> "${held.ins}"`);

      // K-A, the control arm: a write BELOW the place.
      const VA = `${V2}\nA paragraph the shell appended at the very end.\n`;
      shellWrite('notes.txt', VA);
      await untilDisk('notes.txt', (d) => d.includes('appended at the very end'), 8000);
      await sleep(2000);
      const fA = await face(cdp);
      const atA = fA.changes.findIndex((c) => c.off === held.off && c.del === held.del && c.ins === held.ins);
      readings.recomposeBelow = { held, after: fA, caret: await cdpEval(cdp, caretAt, 20000) };
      check('KA1', 'a write BELOW the place recomposed the document', fA.changeCount !== fUp.changeCount, `${String(fUp.changeCount)} -> ${String(fA.changeCount)} changes`);
      check('KA2', 'and THE PLACE SURVIVED IT: the same phrase is still the current change', atA >= 0 && fA.currentIndex === atA && fA.currentCount === 1, `held is at ${String(atA)}, current is ${String(fA.currentIndex)}`);
      check('KA3', 'and its controls are still drawn on its own first rect', fA.chip !== null && atA >= 0 && anchorFindings(fA.chip, fA.changes[atA].first, fA.changes[atA].union, fA.view, 4, 0.6).length === 0, fA.chip === null ? 'no chip' : JSON.stringify(fA.chip));

      // K-B, THE SHAPE RESEARCH 99 §2.3 ACTUALLY DROVE: a write ABOVE the
      // place, which is what an agent editing prose does most of the time.
      const VB = `A line the shell added at the very top.\n${VA}`;
      shellWrite('notes.txt', VB);
      await untilDisk('notes.txt', (d) => d.startsWith('A line the shell added'), 8000);
      await sleep(2000);
      const fB = await face(cdp);
      const atB = fB.changes.findIndex((c) => c.off === held.off && c.del === held.del && c.ins === held.ins);
      const caretB = await cdpEval(cdp, caretAt, 20000);
      readings.recomposeAbove = { held, after: fB, caret: caretB };
      check('KB1', 'a write ABOVE the place recomposed the document', fB.changeCount !== fA.changeCount, `${String(fA.changeCount)} -> ${String(fB.changeCount)} changes`);
      check('KB2', 'the change itself is still drawn with the same identity', atB >= 0, `off ${String(held.off)} "${held.del}" -> "${held.ins}" found at ${String(atB)}`);
      check('KB3', 'AND THE PLACE SURVIVED IT TOO: the controls still belong to that change', atB >= 0 && fB.currentIndex === atB && fB.currentCount === 1, `held is at ${String(atB)}, current is ${String(fB.currentIndex)}${fB.currentIndex >= 0 ? ` which is "${fB.changes[fB.currentIndex].del}" -> "${fB.changes[fB.currentIndex].ins}"` : ''}`);
      note('KB4', 'where the caret landed after the recompose, and what the focus did', `caret ${JSON.stringify(caretB)}, activeElement ${JSON.stringify(fB.activeClass)}`);
      // AND WHAT ⌥⌫ WOULD ACT ON, which is the reason KB3 matters: the press
      // reads the MARKED wrapper, so a mark that moved moves the write target.
      const pressWould = fB.currentIndex >= 0 ? `${fB.changes[fB.currentIndex].del} -> ${fB.changes[fB.currentIndex].ins}` : 'nothing';
      check('KB5', 'so the write verb still points at the phrase the person chose', pressWould === `${held.del} -> ${held.ins}`, `⌥⌫ would rewind "${pressWould}"`);

      // -----------------------------------------------------------------
      // R. The resting face: no control drawn at all.
      // -----------------------------------------------------------------
      await remountRedline(cdp);
      await cdpEval(cdp, blurAll); await move(cdp, 4, 4); await sleep(600);
      const fRest = await face(cdp);
      readings.resting = fRest;
      check('R1', 'the resting face draws NO chip', fRest.chip === null, JSON.stringify(fRest.chip));
      check('R2', 'the resting face marks NO change', fRest.currentCount === 0, String(fRest.currentCount));
      check('R3', 'the resting VIEW carries no button of any kind', typeof fRest.viewHTML === 'string' && !fRest.viewHTML.includes('<button'), '');
      check('R4', 'the resting DOCUMENT carries no control and no data-current', typeof fRest.docHTML === 'string' && !fRest.docHTML.includes('<button') && !fRest.docHTML.includes('data-redline-tag') && !fRest.docHTML.includes('data-current'), '');
      note('R5', 'the notes on the resting face of a document WITH changes', JSON.stringify(fRest.notes.filter((n) => (n ?? '').trim() !== '')));
      await shot(cdp, 'resting');

      // -----------------------------------------------------------------
      // P. THE POINTER: hover still draws controls when nothing is current.
      // -----------------------------------------------------------------
      const target = fRest.changes[2];
      await move(cdp, target.first.left + Math.min(8, target.first.width / 2), target.first.top + target.first.height / 2);
      await sleep(600);
      const fHover = await face(cdp);
      check('P1', 'with nothing current, hovering a change still draws its controls there', fHover.chip !== null && fHover.chipOnChange === 2, `chip on ${String(fHover.chipOnChange)}`);
      await move(cdp, 4, 4); await sleep(600);
      const fOff = await face(cdp);
      check('P2', 'and a hover with no step behind it still lets go, so the resting face comes back', fOff.chip === null, JSON.stringify(fOff.chip));

      // -----------------------------------------------------------------
      // C. Select all and copy: no control text may reach the clipboard.
      // -----------------------------------------------------------------
      await cdpEval(cdp, focusHost); await sleep(200);
      await press(cdp, ALT_DOWN); await sleep(400);
      const fBeforeCopy = await face(cdp);
      check('C0', 'the controls are drawn while the copy is taken', fBeforeCopy.chip !== null, '');
      const SAVE = `(async () => {
        const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
        const { clipboard } = load('electron');
        const out = {};
        for (const f of clipboard.availableFormats()) { try { out[f] = clipboard.readBuffer(f).toString('base64'); } catch { /* skip */ } }
        return JSON.stringify(out);
      })()`;
      const saved = await mainEval(main, SAVE);
      restorePasteboard = async () => {
        await mainEval(main, `(() => {
          const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
          const { clipboard } = load('electron');
          const saved = JSON.parse(${JSON.stringify(saved)});
          clipboard.clear();
          for (const [f, b64] of Object.entries(saved)) { try { clipboard.writeBuffer(f, Buffer.from(b64, 'base64')); } catch { /* skip */ } }
          return true;
        })()`);
      };
      await cdpEval(cdp, `(() => { const d = document.querySelector('.ed-redline-doc'); const s = window.getSelection(); const r = document.createRange(); r.selectNodeContents(d); s.removeAllRanges(); s.addRange(r); return s.toString().length; })()`, 20000);
      await sleep(200);
      await mainEval(main, `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const { BrowserWindow } = load('electron'); BrowserWindow.getAllWindows()[0].webContents.copy(); return true; })()`);
      await sleep(700);
      const pasted = await mainEval(main, `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const { clipboard } = load('electron'); return clipboard.readText(); })()`);
      readings.clipboard = pasted;
      const controlWords = ['Rewind', 'Undo', '⌥↓', '⌥↑', '⌥⌫', '⌥⇧⌫'];
      const leaked = controlWords.filter((w) => String(pasted).includes(w));
      check('C1', 'NO CONTROL TEXT reaches the clipboard with the controls drawn', leaked.length === 0, leaked.length === 0 ? `${String(String(pasted).length)} chars pasted` : `leaked ${JSON.stringify(leaked)}`);
      const onDisk = disk('notes.txt');
      check('C2', 'and what it did paste is the working file, byte for byte', String(pasted) === onDisk, `${String(String(pasted).length)} chars against the file's ${String(onDisk.length)}`);
      await restorePasteboard();
      restorePasteboard = null;

      // -----------------------------------------------------------------
      // V. Press every control and read the file, or the baseline, back.
      // -----------------------------------------------------------------
      await cdpEval(cdp, `(() => { const s = window.getSelection(); s.removeAllRanges(); return true; })()`);
      await remountRedline(cdp);
      await cdpEval(cdp, focusHost); await sleep(300);
      await press(cdp, ALT_DOWN); await sleep(400);
      let fv = await face(cdp);
      const chipLabels = (fv.buttons ?? []).map((b) => String(b.label).replace(/\s+/g, ''));
      check('V1', 'the chip carries THREE buttons and Undo is no longer among them', chipLabels.length === 3 && !chipLabels.some((l) => /Undo/i.test(l)), JSON.stringify(chipLabels));
      check('V2', 'the chip is tagged out of the clipboard and lives outside the document', fv.chipTagged === true && fv.chipInsideDoc === false, `${String(fv.chipTagged)}, insideDoc ${String(fv.chipInsideDoc)}`);
      note('V2b', 'the chip box', JSON.stringify(fv.chip));

      // The chip's own step buttons.
      const nextBtn = (fv.buttons ?? []).find((b) => /next/i.test(String(b.label)));
      await clickAt(cdp, nextBtn.cx, nextBtn.cy); await sleep(500);
      const fNext = await face(cdp);
      check('V3', 'the chip\'s next button steps the current change', fNext.currentIndex === fv.currentIndex + 1, `${String(fv.currentIndex)} -> ${String(fNext.currentIndex)}`);

      // Rewind, with the file read from disk.
      const targetChange = fNext.changes[fNext.currentIndex];
      const diskBefore = disk('notes.txt');
      await press(cdp, ALT_BACK);
      await untilDisk('notes.txt', (d) => d !== diskBefore, 10000);
      await sleep(1400);
      const diskAfterRewind = disk('notes.txt');
      check('V4', 'REWIND wrote the file, and it put back exactly the phrase the controls were on', diskAfterRewind !== diskBefore && diskAfterRewind.includes(targetChange.del) && !diskAfterRewind.includes(targetChange.ins), `"${targetChange.ins}" -> "${targetChange.del}"`);
      const fUndo = await face(cdp);
      readings.afterRewind = fUndo;
      check('V5', 'the note row appears with its sentence AND its Undo button', fUndo.noteButton !== null && fUndo.notes.some((n) => (n ?? '').includes('Undo the last rewind with')), JSON.stringify(fUndo.notes.filter((n) => (n ?? '').trim() !== '')));
      check('V6', 'the Undo button is tagged, labelled for what it does, and outside the document', fUndo.noteButton !== null && fUndo.noteButton.tagged === true && fUndo.noteButton.label === 'Undo the last rewind' && !String(fUndo.docHTML).includes('ed-redline-note-button'), JSON.stringify(fUndo.noteButton));
      const chipAfterRewind = (fUndo.buttons ?? []).map((b) => String(b.label).replace(/\s+/g, ''));
      check('V7', 'and the CHANGE chip still carries no Undo, which is Phase 236\'s finding closed', !chipAfterRewind.some((l) => /Undo/i.test(l)), JSON.stringify(chipAfterRewind));
      await shot(cdp, 'after-rewind');

      // Press the note row's Undo, and read the file back.
      await clickAt(cdp, fUndo.noteButton.box.left + fUndo.noteButton.box.width / 2, fUndo.noteButton.box.top + fUndo.noteButton.box.height / 2);
      await untilDisk('notes.txt', (d) => d === diskBefore, 10000);
      await sleep(1200);
      check('V8', 'UNDO put the file back byte for byte', disk('notes.txt') === diskBefore, `${String(disk('notes.txt').length)} chars against ${String(diskBefore.length)}`);
      const fAfterUndo = await face(cdp);
      check('V9', 'and with nothing left to undo the button goes away again', fAfterUndo.noteButton === null, JSON.stringify(fAfterUndo.noteButton));

      // -----------------------------------------------------------------
      // T. Typing with the controls drawn.
      // -----------------------------------------------------------------
      await remountRedline(cdp);
      await cdpEval(cdp, focusHost); await sleep(300);
      await press(cdp, ALT_DOWN); await sleep(450);
      const fT0 = await face(cdp);
      const before0 = await layout(cdp);
      check('T1', 'the controls are drawn before the typing starts', fT0.chip !== null && fT0.currentCount === 1, '');
      // Put the caret INSIDE the current change and type a word.
      await cdpEval(cdp, `(() => {
        const w = document.querySelector('.ed-redline-doc .ed-redline-change[data-current] ins');
        if (!w) return false;
        const s = window.getSelection(); const r = document.createRange();
        r.setStart(w.firstChild, Math.min(3, (w.textContent ?? '').length)); r.collapse(true);
        s.removeAllRanges(); s.addRange(r); return true;
      })()`, 20000);
      await sleep(250);
      for (const ch of ['z', 'q', 'x']) {
        await press(cdp, { key: ch, code: `Key${ch.toUpperCase()}`, vk: ch.toUpperCase().charCodeAt(0), modifiers: 0, text: ch });
        await sleep(180);
      }
      await sleep(700);
      const fT1 = await face(cdp);
      readings.typing = { before: fT0, after: fT1 };
      check('T2', 'typing landed in the document', String(fT1.docHTML).includes('zqx') || String(fT1.changes.map((c) => c.ins).join('')).includes('zqx'), `docChars ${String(fT0.docChars)} -> ${String(fT1.docChars)}`);
      check('T3', 'the controls are STILL drawn after typing, and still on one change', fT1.chip !== null && fT1.currentCount === 1, `chip ${fT1.chip === null ? 'gone' : 'drawn'}, ${String(fT1.currentCount)} marked`);
      const caretIn = await cdpEval(cdp, `(() => { const s = window.getSelection(); if (s.rangeCount === 0) return null; const n = s.getRangeAt(0).startContainer; const e = n.nodeType === 1 ? n : n.parentElement; const w = e.closest('.ed-redline-change'); return w === null ? null : { current: w.hasAttribute('data-current'), del: w.dataset.changeDel }; })()`, 20000);
      check('T4', 'THE CONTROLS DO NOT FIGHT THE CARET: the caret is inside the change they are drawn on', caretIn !== null && caretIn.current === true, JSON.stringify(caretIn));
      const focusable = await cdpEval(cdp, `(() => { const c = document.querySelector('.ed-redline-chip'); if (!c) return null; return Array.from(c.querySelectorAll('button')).map((b) => b.tabIndex); })()`, 20000);
      check('T5', 'and no control is reachable by the caret or the tab order', Array.isArray(focusable) && focusable.every((t) => t === -1), JSON.stringify(focusable));
      await shot(cdp, 'typing');
      note('T6', 'the layout before the typing, for the record', `${String(before0.rects.length)} changes, ${String(before0.lines.length)} line boxes`);
    } finally {
      try { if (restorePasteboard !== null) await restorePasteboard(); } catch { /* best effort */ }
      writeFileSync(readingsFile, JSON.stringify({ rows, readings }, null, 2));
      try { main.close(); } catch { /* closed */ }
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
check('X1', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${String(opBefore)} -> ${String(opAfter)}`);
say('');
say(`${String(rows.filter((r) => r.pass === true).length)} passed, ${String(failures.length)} failed, ${String(rows.filter((r) => r.pass === null).length)} notes`);
say(`readings at ${readingsFile}`);
say(`screenshots under ${shots}`);
if (failures.length > 0) { for (const f of failures) say(`FAILURE: ${f}`); process.exit(1); }
process.exit(0);
