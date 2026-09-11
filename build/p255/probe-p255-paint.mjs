#!/usr/bin/env node
/**
 * probe-p255-paint.mjs — PHASE 255's app run: the preview paints fast.
 *
 * WHAT IT MEASURES, off the live DOM of the running app. The person OPENS a
 * large markdown file and CHOOSES Preview on the mode chip; everything below
 * is timed from that click, over three documents:
 *
 *   A. twin A, the research 116 specstory shape (2,559,758 B), synthesized;
 *   B. twin B, the research 116 BACKLOG shape (3,262,893 B), synthesized;
 *   C. this repository's own docs/BACKLOG.md — committed product
 *      documentation, the corpus research 117 used, and the one real document
 *      here whose last megabyte is a single loose list that no cut may split.
 *      It is read at the PINNED commit `C_PIN` and never from the working
 *      tree, because the parent readings below are pinned numbers and this
 *      file grows with every phase: read live, it made `scrollHeight` differ
 *      from the parent's by 1,574 px for no reason but the four running-log
 *      lines the phase itself appended, which is a check going red for
 *      something that is not a defect. Pinned, EVERY reading of c is compared
 *      against the parent's, the drawn text digest included, which is
 *      stronger than the exemption that hid the drift.
 *
 * For each: click-to-first-paint, the worst long task and the end of the
 * last one, the delay of a PageDown pressed the moment the page first paints
 * (the input a person actually makes while the rest streams), the time the
 * DOM stops changing, and the full-document correctness readings — element
 * count, heading count, a digest of every heading id in order, a digest of
 * the whole text with whitespace collapsed, scrollHeight, a scroll to the
 * bottom, the last heading resolving by id and scrolling into view, and
 * `window.find` locating the document's last line. The preview has no find
 * command of its own, so Chromium's page find over the drawn text is the
 * find a person reaches.
 *
 * O. The OPEN of twin A itself: which surface it lands on and its first
 *    paint. At the parent Phase 254's deferral sends it to Source; at HEAD
 *    the re-derived guard lets it open rendered.
 * D. The degenerate first block the guard exists for: a blank-free GFM table
 *    from byte 0, at two sizes. At HEAD Preview is clicked and timed; at the
 *    parent it is NOT, because micromark renders that shape in minutes
 *    (research 117 §2.3: 105,947 ms for 1 MB in node), so the parent reading
 *    is the surface and the chip's title only.
 *
 * PARENT AND HEAD. Run with P255_LABEL=parent on a build of the parent
 * commit, then P255_LABEL=head. Each run writes build/p255/out-<label>.json.
 * The head run grades itself against the committed parent readings: every
 * correctness reading of A and B must equal the parent's, so a faster
 * preview that draws a different page is a failure here and not a win.
 *
 * ## SAFETY
 *
 * ONE Electron, through build/electron-run.mjs, which ends the tree it
 * started in a `finally`. A scratch profile, a scratch HOME and this script's
 * own tmux socket (gmux-p255-<slug>-<pid> via build/harness-socket.mjs,
 * killed and unlinked there); `gmux` and `default` are refused by name and
 * the operator's own -L gmux sessions are counted before and after, listed
 * only. No agent, no token, no keychain, no request, no ssh, no machine; the
 * project is a scratch git repository built inside GMUX_HARNESS_DIR.
 * `--self-test` proves the grader on fixtures and launches nothing.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { SHAPES, synthTwin, twinFindings } from '../p254/twins.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LABEL = process.env['P255_LABEL'] ?? 'head';
const TAG = `[p255-paint:${LABEL}]`;
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The phase's stated target (research 117 §6). */
export const FIRST_PAINT_MS = 250;
export const WORST_TASK_MS = 250;
const DOCS = ['a', 'b', 'c'];

// ---------------------------------------------------------------------------
// The grader. Pure, and proved under --self-test.
// ---------------------------------------------------------------------------

/**
 * Findings for one run. `parent` is the committed parent reading or null.
 * Correctness is judged against the parent; speed against the target; the
 * parent itself is expected to fail the speed half, which is what makes it
 * the honest before.
 */
export function gradePaint(run, parent) {
  const bad = [];
  for (const k of DOCS) {
    const r = run.docs?.[k];
    if (r === undefined) { bad.push(`${k}: no reading`); continue; }
    if (r.clicked !== true) { bad.push(`${k}: Preview was not clickable`); continue; }
    if (r.firstPaint === null || r.firstPaint > FIRST_PAINT_MS) bad.push(`${k}: first paint ${r.firstPaint} ms is over ${FIRST_PAINT_MS} ms`);
    if (k !== 'c' && r.worstTask > WORST_TASK_MS) bad.push(`${k}: worst task ${r.worstTask} ms is over ${WORST_TASK_MS} ms`);
    if (r.settled !== true) bad.push(`${k}: the document never finished drawing`);
    if (r.bottomReached !== true) bad.push(`${k}: a scroll to the bottom did not reach the end`);
    if (r.lastHeadingResolves !== true) bad.push(`${k}: the last heading does not resolve by id`);
    if (r.found !== true) bad.push(`${k}: find does not locate the document's last line`);
    const p = parent?.docs?.[k];
    if (p !== undefined && p !== null) {
      for (const f of ['kids', 'headings', 'idsDigest', 'scrollHeight']) {
        if (r[f] !== p[f]) bad.push(`${k}: ${f} ${r[f]} differs from the parent's ${p[f]}`);
      }
      if (r.textDigest !== p.textDigest) bad.push(`${k}: the drawn text differs from the parent's`);
    }
  }
  return bad;
}

if (process.argv.includes('--self-test')) {
  const doc = { clicked: true, firstPaint: 70, worstTask: 200, settled: true, bottomReached: true, lastHeadingResolves: true, found: true, kids: 10, headings: 3, idsDigest: 'i', textDigest: 't', scrollHeight: 900 };
  const run = (over = {}) => ({ docs: { a: { ...doc, ...over }, b: { ...doc }, c: { ...doc } } });
  const parent = { docs: { a: { ...doc, firstPaint: 2254, worstTask: 1845 }, b: { ...doc, firstPaint: 1831, worstTask: 1618 }, c: { ...doc, firstPaint: 2000, worstTask: 1900 } } };
  const cases = [
    ['the page this phase ships', run(), parent, 0],
    ['the parent itself: three slow first paints, two slow tasks', parent, null, 5],
    ['first paint over the target', run({ firstPaint: 400 }), parent, 1],
    ['a stream slice over the ceiling', run({ worstTask: 600 }), parent, 1],
    ['a block drawn twice: the element count moved', run({ kids: 11 }), parent, 1],
    ['a heading lost: ids and count moved', run({ headings: 2, idsDigest: 'x' }), parent, 2],
    ['the same elements, different words', run({ textDigest: 'x' }), parent, 1],
    ['never settled', run({ settled: false }), parent, 1],
    ['find reaches nothing past the window', run({ found: false }), parent, 1],
    ['the anchor and the bottom unreachable', run({ lastHeadingResolves: false, bottomReached: false }), parent, 2],
    ['Preview not clickable', run({ clicked: false }), parent, 1]
  ];
  let misbehaved = 0;
  for (const [name, r, p, want] of cases) {
    const got = gradePaint(r, p).length;
    if (got !== want) misbehaved += 1;
    say(`${got === want ? 'pass' : 'FAIL'}  self-test: ${name} -> ${got} finding(s), wanted ${want}`);
  }
  for (const [name, shape] of Object.entries(SHAPES)) {
    const f = twinFindings(shape, synthTwin(shape, name === 'a' ? 11 : 22));
    if (f.length !== 0) misbehaved += 1;
    say(`${f.length === 0 ? 'pass' : 'FAIL'}  self-test: twin ${name} synthesizes to its shape`);
  }
  say(`self-test ${misbehaved === 0 ? 'clean' : `${misbehaved} fixture(s) misbehaved`}`);
  process.exit(misbehaved === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p255', `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore} (listed only)`);

mkdirSync(join(harnessDir, 'p255'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p255'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};

/** A blank-free GFM table from byte 0, then ordinary prose. */
function tableFirst(bytes) {
  const rows = ['| key | value | note |', '| --- | --- | --- |'];
  let size = rows.join('\n').length + 1;
  for (let i = 0; size < bytes; i++) {
    const row = `| row ${i} | value ${i * 7} | a short note about row ${i} |`;
    rows.push(row);
    size += row.length + 1;
  }
  return `${rows.join('\n')}\n\n## After the table\n\nA closing paragraph after the table.\n`;
}

/**
 * The commit docs/BACKLOG.md is read at. It is the parent of Phase 255, which
 * is the commit build/p255/out-parent.json was recorded on, and it is on
 * origin/main so the object stays reachable. Nothing falls back to the
 * working tree: a silent fallback is the drift this pin replaced.
 */
const C_PIN = 'efb4c7ce';
const showPinned = (rev, path) => {
  const r = spawnSync('git', ['-C', REPO, 'show', `${rev}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git show ${rev}:${path}: ${r.stderr}`);
  return r.stdout;
};

const sources = {
  a: synthTwin(SHAPES.a, 11),
  b: synthTwin(SHAPES.b, 22),
  c: showPinned(C_PIN, 'docs/BACKLOG.md')
};
/**
 * Which bytes each reading was taken over. The parent JSON recorded no source
 * identity of any kind, so a document that had moved under the probe looked
 * exactly like a renderer that had changed. Recorded now, so it cannot.
 */
const sourceIds = Object.fromEntries(
  Object.entries(sources).map(([k, v]) => [k, { bytes: Buffer.byteLength(v, 'utf8'), digest: createHash('sha256').update(v).digest('hex').slice(0, 16) }])
);
const FILE = { a: 'twin-a.md', b: 'twin-b.md', c: 'backlog.md' };
const DEGENERATE = { d1: 512 * 1024, d2: 1024 * 1024 };
writeFileSync(join(project, 'warm.md'), '# warm\n\nbase\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p255@example.invalid');
git('config', 'user.name', 'p255');
git('add', '--', 'warm.md');
git('commit', '-q', '-m', 'base');
for (const k of DOCS) writeFileSync(join(project, FILE[k]), sources[k]); // untracked: opens on its prose mode
for (const [k, bytes] of Object.entries(DEGENERATE)) writeFileSync(join(project, `${k}-table.md`), tableFirst(bytes));

/**
 * The find target: the last plain line of the document that carries at least
 * six words, with the twin synthesizer's trailing x padding removed so the
 * target is words that occur once rather than a run of x that occurs
 * everywhere. Its last 48 characters.
 */
export function lastLine(src) {
  const lines = src
    .split('\n')
    .map((l) => l.trim().replace(/x+$/, '').trim())
    .filter((l) => /^[A-Za-z]/.test(l) && !/[|`*[\]<>_#]/.test(l) && l.split(/\s+/).length >= 6);
  const l = lines[lines.length - 1] ?? '';
  return l.slice(Math.max(0, l.length - 48)).replace(/^\S*\s/, '');
}
const sentinels = Object.fromEntries(DOCS.map((k) => [k, lastLine(sources[k])]));
for (const k of DOCS) say(`doc ${k}: ${sourceIds[k].bytes} bytes, sha256 ${sourceIds[k].digest}${k === 'c' ? ` (docs/BACKLOG.md at ${C_PIN})` : ''}, find target ${JSON.stringify(sentinels[k])}`);

// ---------------------------------------------------------------------------
// The in-page recorder
// ---------------------------------------------------------------------------

const RECORDER = `(() => {
  if (window.__p255 !== undefined) return true;
  const st = { t0: null, check: null, paintAt: null, tasks: [], mutAt: 0, key: null };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) st.tasks.push({ start: e.startTime, end: e.startTime + e.duration }); }).observe({ entryTypes: ['longtask'] });
  new MutationObserver((ms) => {
    for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('.md-content')) { st.mutAt = performance.now(); return; } }
  }).observe(document.body, { childList: true, subtree: true });
  const CHECKS = {
    monaco: () => document.querySelector('.monaco-editor .view-line') !== null && document.querySelector('.ed-skeleton') === null,
    preview: () => { const c = document.querySelector('.md-content'); return c !== null && c.querySelector('h1,h2,h3,p,ul,ol,table,pre') !== null && document.querySelector('.ed-skeleton') === null; }
  };
  const tick = () => {
    if (st.t0 !== null && st.paintAt === null && st.check !== null) {
      const hit = st.check === 'any' ? (CHECKS.monaco() ? 'monaco' : CHECKS.preview() ? 'preview' : null) : (CHECKS[st.check]() ? st.check : null);
      if (hit !== null) { st.paintAt = performance.now(); st.surface = hit; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.addEventListener('keydown', (e) => {
    if (st.key !== null && st.key.handled === null && e.key === 'PageDown') st.key.handled = performance.now() - e.timeStamp;
  }, true);
  window.__p255 = {
    arm(check) { st.check = check; st.paintAt = null; st.surface = null; st.tasks = []; st.mutAt = 0; st.key = null; st.t0 = performance.now(); },
    armKey() { st.key = { handled: null }; },
    read() {
      const t0 = st.t0 ?? 0;
      const after = st.tasks.filter((t) => t.end > t0);
      const c = document.querySelector('.md-content');
      return {
        firstPaint: st.paintAt === null ? null : Math.round(st.paintAt - t0),
        surface: st.surface ?? null,
        worstTask: Math.round(after.reduce((m, t) => Math.max(m, t.end - t.start), 0)),
        taskCount: after.length,
        taskTotal: Math.round(after.reduce((s, t) => s + (t.end - t.start), 0)),
        lastTaskEnd: after.length === 0 ? null : Math.round(after.reduce((m, t) => Math.max(m, t.end), 0) - t0),
        lastMutation: st.mutAt === 0 ? null : Math.round(st.mutAt - t0),
        sinceMutation: st.mutAt === 0 ? null : Math.round(performance.now() - st.mutAt),
        sinceTask: after.length === 0 ? null : Math.round(performance.now() - after.reduce((m, t) => Math.max(m, t.end), 0)),
        keyDelay: st.key === null || st.key.handled === null ? null : Math.round(st.key.handled),
        stream: c === null ? null : c.getAttribute('data-md-stream'),
        kids: c === null ? 0 : c.childElementCount
      };
    }
  };
  return true;
})()`;

const CORRECTNESS = (sentinel) => `(async () => {
  const c = document.querySelector('.md-content');
  const sc = document.querySelector('.md-scroll');
  const hs = Array.from(c.querySelectorAll('[data-md-heading]'));
  const digest = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  const ids = hs.map((h) => h.id).join('\\n');
  const text = c.textContent.replace(/\\s+/g, ' ').trim();
  sc.scrollTop = sc.scrollHeight;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bottomReached = Math.abs(sc.scrollTop + sc.clientHeight - sc.scrollHeight) <= 2;
  sc.scrollTop = 0;
  await new Promise((r) => requestAnimationFrame(r));
  const last = hs[hs.length - 1] ?? null;
  let lastHeadingResolves = false;
  if (last !== null && last.id !== '') {
    const el = document.getElementById(last.id);
    const all = c.querySelectorAll('[id="' + CSS.escape(last.id) + '"]');
    el?.scrollIntoView({ block: 'start', behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(r));
    const top = all[all.length - 1].getBoundingClientRect().top - sc.getBoundingClientRect().top;
    lastHeadingResolves = el !== null && sc.scrollTop > 0 && (all.length > 1 || Math.abs(top) < sc.clientHeight);
  }
  sc.scrollTop = 0;
  // Find BACKWARDS from the end of the page: a target that also occurs early
  // in the document can only be found in its last hundredth of blocks if the
  // end of the document was drawn.
  const sel = window.getSelection();
  const endRange = document.createRange();
  endRange.selectNodeContents(c);
  endRange.collapse(false);
  sel.removeAllRanges();
  sel.addRange(endRange);
  let found = false;
  let foundAt = null;
  if (${JSON.stringify(sentinel)} !== '' && window.find(${JSON.stringify(sentinel)}, false, true, false)) {
    const blocks = Array.from(c.children);
    foundAt = blocks.findIndex((k) => k.contains(sel.anchorNode));
    found = foundAt >= 0 && foundAt >= Math.floor(blocks.length * 0.99);
  }
  sel.removeAllRanges();
  return { kids: c.childElementCount, headings: hs.length, idsDigest: await digest(ids), textDigest: await digest(text), textLength: text.length, scrollHeight: sc.scrollHeight, bottomReached, lastHeadingResolves, found, foundAt };
})()`;

const FACE = `(() => ({
  monaco: document.querySelector('.monaco-editor .view-line') !== null,
  preview: document.querySelector('.md-content') !== null,
  previewTitle: document.querySelector('.ed-mode [aria-label="Preview"]')?.getAttribute('title') ?? null,
  modeOn: document.querySelector('.ed-mode .ed-mode-opt.on')?.getAttribute('aria-label') ?? null
}))()`;

const TREE_ROWS = `(() => {
  const host = document.querySelector('.files-tree');
  if (host === null) return null;
  const out = [];
  const walk = (node, depth) => {
    if (depth > 8 || node === null) return;
    for (const el of Array.from(node.querySelectorAll('*'))) {
      if (el.hasAttribute && el.hasAttribute('data-item-path')) {
        const r = el.getBoundingClientRect();
        out.push({ path: el.getAttribute('data-item-path'), x: r.left + Math.min(60, r.width / 2), y: r.top + r.height / 2 });
      }
      if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
    }
  };
  walk(host, 0);
  return out;
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
          cdp = await wsConnect(t.webSocketDebuggerUrl, {});
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof a === 'string') return cdp;
          cdp.close();
        } catch { if (cdp) { try { cdp.close(); } catch { /* closed */ } } }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

async function clickAt(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'mouse' });
  await sleep(40);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
}
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 90000);
const clickChip = (label) => `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    let v = null;
    try { v = await cdpEval(cdp, expr, 10000); } catch { v = null; }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(120);
  }
};

/**
 * Click a file's Explorer row and wait until ITS tab is the active one, so no
 * reading is taken off the previous tab's surface while the new one swaps in
 * (a preview tab is recycled in place, and for a moment the old page is still
 * on screen under the new tab's name).
 */
async function openRow(cdp, rel) {
  const rows = await cdpEval(cdp, TREE_ROWS, 20000);
  const row = Array.isArray(rows) ? rows.find((x) => (x.path ?? '') === rel || (x.path ?? '').endsWith(`/${rel}`)) : null;
  if (!row) throw new Error(`no Explorer row for ${rel}`);
  await clickAt(cdp, row.x, row.y);
  const name = rel.split('/').pop();
  const active = await until(cdp, `(document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? '').trim() === ${JSON.stringify(name)}`, 60000);
  if (!active) throw new Error(`the tab for ${rel} never became active`);
}

/** Settled: painted, no DOM change and no long task for 1.5 s, and at HEAD the stream says done. */
async function settle(cdp, deadlineMs) {
  const started = Date.now();
  let r = null;
  for (;;) {
    r = await cdpEval(cdp, 'window.__p255.read()', 20000);
    const quietDom = r.sinceMutation === null || r.sinceMutation > 1500;
    const quietTask = r.sinceTask === null || r.sinceTask > 1500;
    const streamDone = r.stream === null || r.stream === 'done';
    if (r.firstPaint !== null && quietDom && quietTask && streamDone && Date.now() - started > 1600) return { ...r, settled: true };
    if (Date.now() - started > deadlineMs) return { ...r, settled: false };
    await sleep(150);
  }
}

const readings = { label: LABEL, sources: sourceIds, docs: {}, open: null, degenerate: {} };
const failures = [];

await withElectron(
  {
    label: `p255-${LABEL}`,
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000
  },
  async () => {
    const cdp = await cdpForAppWindow(90000);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project, editorWidth: 1000, sidebarWidth: 300 });
      await sleep(1500);
      await cdpEval(cdp, RECORDER, 5000);
      await cdpEval(cdp, `(() => { const b = Array.from(document.querySelectorAll('.activitybar .ab-item')).find((x) => (x.getAttribute('aria-label') ?? '').startsWith('Explorer')); if (!b) return false; b.click(); return true; })()`, 10000);
      const treeUp = await until(cdp, `(() => { const r = (${TREE_ROWS}); return Array.isArray(r) && r.length >= 6; })()`, 30000);
      if (!treeUp) throw new Error('the Explorer never drew the project');

      // O. The open of twin A.
      await cdpEval(cdp, `window.__p255.arm('any')`, 5000);
      await openRow(cdp, FILE.a);
      const o = await settle(cdp, 120000);
      readings.open = { ...o, face: await cdpEval(cdp, FACE, 10000) };
      say(`O  twin A opened on ${readings.open.face.modeOn}, first paint ${o.firstPaint} ms (${o.surface}), worst task ${o.worstTask} ms`);

      for (const k of DOCS) {
        await openRow(cdp, FILE[k]);
        await until(cdp, `document.querySelector('.ed-mode[role="radiogroup"] [aria-label="Source"]') !== null`, 60000);
        // Start every arm from Source, so the click below always mounts the preview from nothing.
        await cdpEval(cdp, clickChip('Source'), 10000);
        await until(cdp, `document.querySelector('.md-content') === null && document.querySelector('.monaco-editor .view-line') !== null`, 60000);
        await sleep(1500);
        await cdpEval(cdp, `window.__p255.arm('preview')`, 5000);
        const clicked = await cdpEval(cdp, clickChip('Preview'), 10000);
        // The input a person makes while the rest streams: PageDown as soon as the page paints.
        await until(cdp, `window.__p255.read().firstPaint !== null`, 180000);
        await cdpEval(cdp, `window.__p255.armKey()`, 5000);
        await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 });
        await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 });
        const r = await settle(cdp, 240000);
        const correct = r.settled ? await cdpEval(cdp, CORRECTNESS(sentinels[k]), 60000) : {};
        readings.docs[k] = { clicked: clicked === true, ...r, ...correct };
        say(`${k}  first paint ${r.firstPaint} ms, worst task ${r.worstTask} ms (${r.taskCount} long, ${r.taskTotal} ms), last task end ${r.lastTaskEnd} ms, DOM done ${r.lastMutation} ms, PageDown delay ${r.keyDelay} ms`);
        say(`${k}  kids ${correct.kids}, headings ${correct.headings}, ids ${correct.idsDigest}, text ${correct.textDigest} (${correct.textLength}), scrollHeight ${correct.scrollHeight}, bottom ${correct.bottomReached}, last heading ${correct.lastHeadingResolves}, find ${correct.found}`);
      }

      // D. The degenerate first block.
      for (const k of Object.keys(DEGENERATE)) {
        await cdpEval(cdp, `window.__p255.arm('any')`, 5000);
        await openRow(cdp, `${k}-table.md`);
        await until(cdp, `document.querySelector('.ed-mode[role="radiogroup"] [aria-label="Source"]') !== null`, 60000);
        const opened = await settle(cdp, 240000);
        const face = await cdpEval(cdp, FACE, 10000);
        // The chip's own selected mode, read after the page settles, is where the tab opened.
        const reading = { bytes: DEGENERATE[k], openedOn: face.modeOn, openFirstPaint: opened.firstPaint, previewTitle: face.previewTitle };
        if (LABEL !== 'parent') {
          await cdpEval(cdp, clickChip('Source'), 10000);
          await until(cdp, `document.querySelector('.md-content') === null`, 60000);
          await sleep(1200);
          await cdpEval(cdp, `window.__p255.arm('preview')`, 5000);
          reading.clicked = (await cdpEval(cdp, clickChip('Preview'), 10000)) === true;
          const r = await settle(cdp, 240000);
          Object.assign(reading, { firstPaint: r.firstPaint, worstTask: r.worstTask, lastMutation: r.lastMutation, settled: r.settled });
        }
        readings.degenerate[k] = reading;
        say(`${k} ${DEGENERATE[k]} B table-first: opened on ${reading.openedOn} (title ${JSON.stringify(reading.previewTitle)})${reading.clicked ? `, Preview first paint ${reading.firstPaint} ms, worst task ${reading.worstTask} ms` : ''}`);
      }
    } finally {
      writeFileSync(join(REPO, 'build', 'p255', `out-${LABEL}.json`), `${JSON.stringify(readings, null, 2)}\n`);
      cdp.close();
    }
  }
);

const parentFile = join(REPO, 'build', 'p255', 'out-parent.json');
const parent = LABEL !== 'parent' && existsSync(parentFile) ? JSON.parse(readFileSync(parentFile, 'utf8')) : null;
const findings = gradePaint(readings, parent);
for (const f of findings) { failures.push(f); say(`FINDING ${f}`); }
if (LABEL !== 'parent' && parent === null) failures.push('no committed parent readings to compare against');
const opAfter = operatorCount();
say(`operator sessions on -L gmux after: ${opAfter} (${opBefore === opAfter ? 'unmoved' : 'MOVED'})`);
if (opBefore !== opAfter) failures.push(`operator sessions moved ${opBefore} -> ${opAfter}`);
say(`${findings.length} finding(s)${LABEL === 'parent' ? ' — the parent is expected to fail the speed half' : ''}; readings at build/p255/out-${LABEL}.json`);
process.exit(LABEL === 'parent' ? 0 : failures.length === 0 ? 0 : 1);
