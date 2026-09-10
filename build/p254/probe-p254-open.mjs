#!/usr/bin/env node
/**
 * probe-p254-open.mjs — PHASE 254's app run: a large prose file opens fast.
 *
 * WHAT IT MEASURES, off the live DOM of the running app, over the two
 * synthesized twins research 116 built from the operator's file SHAPES (sizes
 * and line-shape counts only — no byte of his files is here or anywhere):
 *
 *   A. THE SPECSTORY SHAPE (2,559,758 B untracked .md), single-clicked in the
 *      Explorer: click-to-first-paint and click-to-interactive. At HEAD it
 *      opens in Monaco (Source) under the budget, with the rendered preview
 *      DEFERRED to the mode chip, whose title says so in one clause. At the
 *      parent (89e96c93) the same click renders the whole document through
 *      the markdown pipeline: ~5.5 s, no first paint until the end — which is
 *      what makes this probe RED at the parent and is the honest parent
 *      measurement the phase entry demands.
 *   D. A SMALL .md still opens RENDERED by default — the deferral must not
 *      over-reach and take the readable README away.
 *   C. THE BACKLOG SHAPE (3,262,893 B tracked + modified), clicked after git
 *      status has provably loaded (a warm tracked file first): the Pierre
 *      diff, fast. Research 116 §2.3 measured it ~250 ms; it must never be
 *      the ~5 s preview.
 *   B. THE DEFERRED PROMISE, KEPT: clicking Preview on the chip over the twin
 *      A tab renders the whole document — deferred, never dropped. Its cost
 *      is PUBLISHED, not judged (research 116 §2.2 measured ~5.5 s; that is
 *      now the price of a deliberate click, not of every open).
 *
 * THE TARGET BESIDE THE READING (research 116 §5): Monaco — VS Code's own
 * editor — opened these exact byte counts at 53 ms (3.26 MB) and 136 ms
 * (2.56 MB) on the operator's machine, and VS Code's source shows both files
 * are far under its 20 MB / 300 K-line "large" thresholds, so its default
 * .md open is in the same class. The budget below (2,500 ms) is deliberately
 * loose against those numbers so machine noise cannot fail a healthy build,
 * and tight against the ~5,000 ms defect so the parent cannot pass.
 *
 * ## SAFETY
 *
 * ONE Electron, through build/electron-run.mjs, which ends the tree it
 * started in a `finally`. A scratch profile, a scratch HOME and this
 * script's own tmux socket (gmux-p254-<slug>-<pid> via
 * build/harness-socket.mjs), ended and unlinked there; `gmux` and `default`
 * are refused by name and the operator's own -L gmux sessions are counted
 * before and after, listed only. No agent, no token, no keychain, no
 * request, no ssh, no machine; the project is a scratch git repository built
 * inside GMUX_HARNESS_DIR from synthesized bytes. `--self-test` proves the
 * grader and the twin synthesizer and launches nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p254-open]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The fast-surface budget, ms — see the header for why 2,500. */
const BUDGET_MS = 2500;

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
// The twins — synthesized from research 116 §1's SHAPE table. Sizes exact to
// the byte; structural counts within a few percent. No operator content: the
// words are a seeded generator's.
// ---------------------------------------------------------------------------

const SHAPES = {
  a: { bytes: 2559758, lines: 46105, headings: 1644, fenceLines: 2392, listItems: 2783, tableRows: 884, long1k: 142, long10k: [13001, 11000] },
  b: { bytes: 3262893, lines: 26750, headings: 1468, fenceLines: 40, listItems: 3367, tableRows: 1554, long1k: 300, long10k: [] }
};

/** Deterministic words, so two runs synthesize the same twin. */
function makeWords(seed) {
  let x = seed >>> 0;
  const next = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x;
  };
  const bank = ['alpha', 'bramble', 'copper', 'delta', 'ember', 'fjord', 'garnet', 'harbor', 'indigo', 'juniper', 'kestrel', 'lantern', 'meadow', 'nimbus', 'orchard', 'pebble', 'quarry', 'russet', 'saffron', 'thicket', 'umber', 'vesper', 'willow', 'yonder'];
  return (n) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(bank[next() % bank.length]);
    return out.join(' ');
  };
}

/**
 * One markdown twin: exact byte count, exact line count, and the shape's own
 * mix of headings, fences, list items, table rows and over-long lines. The
 * mean paragraph length is solved from what the special lines leave over, and
 * the final filler line absorbs the byte remainder exactly.
 */
export function synthTwin(shape, seed) {
  const words = makeWords(seed);
  // The specials, flattened: a fence block is its TWO delimiter lines,
  // adjacent, so the ``` line count is exact and every block is closed.
  const specials = [];
  for (let i = 0; i < shape.headings; i++) specials.push('heading');
  for (let i = 0; i < shape.listItems; i++) specials.push('list');
  for (let i = 0; i < shape.tableRows; i++) specials.push('table');
  for (let i = 0; i < shape.long1k; i++) specials.push('long1k');
  for (const len of shape.long10k) specials.push(`long10k:${len}`);
  for (let i = 0; i < Math.floor(shape.fenceLines / 2); i++) specials.push('fence-open', 'fence-close');
  const planLines = shape.lines; // joined with \n and closed by one: N lines
  const plan = new Array(planLines).fill('para');
  const every = Math.max(2, Math.floor(planLines / (specials.length + 1)));
  let k = 0;
  for (let i = every; i < planLines && k < specials.length; i += 1) {
    if (i % every === 0) {
      plan[i] = specials[k];
      if (specials[k] === 'fence-open' && i + 1 < planLines && k + 1 < specials.length) {
        plan[i + 1] = specials[k + 1];
        k += 1;
        i += 1;
      }
      k += 1;
    } else if (i % 5 === 4) {
      plan[i] = 'blank';
    }
  }
  for (let i = planLines - 1; i >= 0 && k < specials.length; i--) {
    if (plan[i] === 'para' || plan[i] === 'blank') {
      plan[i] = specials[k];
      k += 1;
    }
  }
  // Render everything but the paragraphs, counting their bytes.
  const lines = new Array(planLines);
  let bytesSpecial = 0;
  let ordinary = 0;
  for (let i = 0; i < planLines; i++) {
    const kind = plan[i];
    let line = null;
    if (kind === 'para') { ordinary += 1; continue; }
    if (kind === 'blank') line = '';
    else if (kind === 'heading') line = `## ${words(4)}`;
    else if (kind === 'list') line = `- ${words(7)}`;
    else if (kind === 'table') line = `| ${words(2)} | ${words(3)} | ${words(2)} |`;
    else if (kind === 'fence-open') line = '```ts';
    else if (kind === 'fence-close') line = '```';
    else if (kind === 'long1k') line = `${words(6)} ${'longline '.repeat(134)}${words(2)}`;
    else line = 'y'.repeat(Number(kind.slice(8)));
    lines[i] = line;
    bytesSpecial += line.length + 1;
  }
  // Solve the ordinary paragraph length from the bytes left over.
  const leftover = shape.bytes - bytesSpecial - ordinary; // each para pays its \n
  const paraLen = Math.max(8, Math.floor(leftover / Math.max(1, ordinary)));
  let lastPara = -1;
  for (let i = 0; i < planLines; i++) {
    if (plan[i] !== 'para') continue;
    let ptext = words(Math.ceil(paraLen / 7));
    ptext = ptext.length > paraLen ? ptext.slice(0, paraLen).trimEnd() : ptext.padEnd(paraLen, 'x');
    lines[i] = ptext;
    lastPara = i;
  }
  let text = `${lines.join('\n')}\n`;
  // The filler: absorb the byte remainder in the LAST paragraph, exactly.
  const drift = shape.bytes - Buffer.byteLength(text, 'utf8');
  if (lastPara >= 0 && drift !== 0) {
    const cur = lines[lastPara];
    lines[lastPara] = drift > 0 ? cur + 'x'.repeat(drift) : cur.slice(0, Math.max(1, cur.length + drift));
    text = `${lines.join('\n')}\n`;
  }
  return text;
}

/** The synthesizer proves itself: exact bytes, exact lines, the mix present. */
function twinFindings(shape, text) {
  const bad = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes !== shape.bytes) bad.push(`bytes ${bytes} !== ${shape.bytes}`);
  const lineArr = text.split('\n');
  const lineCount = lineArr.length - 1;
  if (lineCount !== shape.lines) bad.push(`lines ${lineCount} !== ${shape.lines}`);
  const count = (re) => lineArr.filter((l) => re.test(l)).length;
  const near = (name, got, want, tol) => {
    if (Math.abs(got - want) > want * tol + 2) bad.push(`${name} ${got} not within ${tol * 100}% of ${want}`);
  };
  near('headings', count(/^#{1,6} /), shape.headings, 0.02);
  near('fence lines', count(/^```/), shape.fenceLines, 0.02);
  near('list items', count(/^- /), shape.listItems, 0.02);
  near('table rows', count(/^\| /), shape.tableRows, 0.02);
  near('lines over 1000', lineArr.filter((l) => l.length > 1000).length, shape.long1k + shape.long10k.length, 0.05);
  return bad;
}

// ---------------------------------------------------------------------------
// The grader, proved under --self-test so a reading that could not fail is
// not mistaken for one that passed.
// ---------------------------------------------------------------------------

export function gradeOpen(r) {
  const bad = [];
  // A. The untracked large twin opens in the fast surface, fast.
  if (r.a.surface !== 'monaco') bad.push(`twin A opened on '${r.a.surface}', not Monaco — the preview is still the default for a large file`);
  if (r.a.firstPaint === null || r.a.firstPaint > BUDGET_MS) bad.push(`twin A first paint ${r.a.firstPaint} ms is over the ${BUDGET_MS} ms budget`);
  if (r.a.interactive === null || r.a.interactive > BUDGET_MS) bad.push(`twin A interactive ${r.a.interactive} ms is over the ${BUDGET_MS} ms budget`);
  if (r.a.previewMounted) bad.push('twin A mounted the markdown preview surface on open');
  if (typeof r.a.previewTitle !== 'string' || !r.a.previewTitle.includes('deferred')) {
    bad.push(`the chip does not state the deferral: title ${JSON.stringify(r.a.previewTitle)}`);
  }
  // D. A small .md still opens rendered.
  if (r.d.surface !== 'preview') bad.push(`the small .md opened on '${r.d.surface}', not the rendered preview — the deferral over-reached`);
  // C. The tracked+modified twin is the fast diff, never the preview.
  if (r.c.surface !== 'diff') bad.push(`twin B opened on '${r.c.surface}', not the diff`);
  if (r.c.interactive === null || r.c.interactive > BUDGET_MS) bad.push(`twin B interactive ${r.c.interactive} ms is over the ${BUDGET_MS} ms budget`);
  // B. The deferred preview still renders when asked — never dropped.
  if (r.b.rendered !== true) bad.push('clicking Preview on the chip did not render the document — the promise was dropped, not deferred');
  return bad;
}

if (process.argv.includes('--self-test')) {
  const OK = {
    a: { surface: 'monaco', firstPaint: 300, interactive: 400, previewMounted: false, previewTitle: 'Rendered markdown — deferred for a file this large; it takes a few seconds to draw' },
    d: { surface: 'preview' },
    c: { surface: 'diff', interactive: 260 },
    b: { rendered: true, ms: 5200 }
  };
  const cases = [
    ['the open this phase ships', OK, 0],
    ['the parent: twin A renders the preview for ~5.5 s', { ...OK, a: { surface: 'preview', firstPaint: 5500, interactive: 5600, previewMounted: true, previewTitle: 'Rendered markdown' } }, 5],
    ['fast surface, wrong milliseconds', { ...OK, a: { ...OK.a, interactive: 4000 } }, 1],
    ['no first paint at all', { ...OK, a: { ...OK.a, firstPaint: null, interactive: null } }, 2],
    ['the chip lost its clause', { ...OK, a: { ...OK.a, previewTitle: 'Rendered markdown' } }, 1],
    ['the deferral over-reached and took the README', { ...OK, d: { surface: 'monaco' } }, 1],
    ['twin B fell into the preview', { ...OK, c: { surface: 'preview', interactive: 5000 } }, 2],
    ['the deferred preview never renders — dropped, not deferred', { ...OK, b: { rendered: false, ms: null } }, 1]
  ];
  let bad = 0;
  for (const [name, reading, want] of cases) {
    const got = gradeOpen(reading).length;
    const ok = got === want;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: ${name} -> ${got} finding(s), wanted ${want}`);
  }
  // The synthesizer proves itself on both shapes, to the byte.
  for (const [name, shape] of Object.entries(SHAPES)) {
    const findings = twinFindings(shape, synthTwin(shape, name === 'a' ? 11 : 22));
    const ok = findings.length === 0;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: twin ${name} synthesizes to its shape${ok ? '' : ' — ' + findings.join('; ')}`);
  }
  // And the twin check can itself fail.
  const broken = twinFindings(SHAPES.a, 'too small\n');
  const brokenOk = broken.length >= 2;
  if (!brokenOk) bad += 1;
  say(`${brokenOk ? 'pass' : 'FAIL'}  self-test: the twin check fails a wrong twin (${broken.length} findings)`);
  say(`self-test ${bad === 0 ? 'clean' : `${bad} fixture(s) misbehaved`}`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p254', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore} (listed only)`);

mkdirSync(join(harnessDir, 'p254'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p254'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'p254-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const git = (...a) => {
  const r = spawnSync('git', a, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};

say('synthesizing the twins from research 116 §1’s shape table');
const twinA = synthTwin(SHAPES.a, 11);
const twinB = synthTwin(SHAPES.b, 22);
for (const [name, shape, text] of [['A', SHAPES.a, twinA], ['B', SHAPES.b, twinB]]) {
  const findings = twinFindings(shape, text);
  if (findings.length > 0) { console.error(`${TAG} twin ${name} off shape: ${findings.join('; ')}`); process.exit(2); }
  say(`twin ${name}: ${Buffer.byteLength(text, 'utf8')} bytes, on shape`);
}
// Twin B is tracked and modified: commit a base, then change ~230 lines in
// the worktree (the ~250 ms diff class research 116 §2.3 measured).
const bLines = twinB.split('\n');
const baseLines = [...bLines];
let changed = 0;
for (let i = 40; i < baseLines.length - 1 && changed < 230; i += Math.floor(baseLines.length / 230)) {
  baseLines[i] = `${baseLines[i]} (before)`;
  changed += 1;
}
writeFileSync(join(project, 'twin-b.md'), baseLines.join('\n'));
writeFileSync(join(project, 'warm.md'), '# warm\n\nbase\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p254@example.invalid');
git('config', 'user.name', 'p254');
git('add', '--', 'twin-b.md', 'warm.md');
git('commit', '-q', '-m', 'the committed twin');
writeFileSync(join(project, 'twin-b.md'), twinB); // modified vs HEAD
writeFileSync(join(project, 'warm.md'), '# warm\n\nchanged\n'); // tracked + modified, tiny
writeFileSync(join(project, 'twin-a.md'), twinA); // untracked, like his history file
writeFileSync(join(project, 'small.md'), `# small\n\n${'A short readable paragraph. '.repeat(40)}\n`);

// ---------------------------------------------------------------------------
// The in-page recorder: rAF for the person-perceived first paint of a named
// surface, PerformanceObserver for the long tasks whose last end is
// "interactive" (the measure step's own method, research 116 §1).
// ---------------------------------------------------------------------------

const RECORDER = `(() => {
  if (window.__p254 !== undefined) return true;
  const st = { t0: null, check: null, surfaceAt: null, tasks: [] };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) st.tasks.push({ start: e.startTime, end: e.startTime + e.duration });
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* no longtask on this build: interactive falls back to paint */ }
  const CHECKS = {
    monaco: () => document.querySelector('.monaco-editor .view-line') !== null && document.querySelector('.ed-skeleton') === null,
    preview: () => {
      const c = document.querySelector('.md-content');
      return c !== null && c.querySelector('h1,h2,h3,p,ul,ol,table,pre') !== null && document.querySelector('.ed-skeleton') === null;
    },
    diff: () => (document.querySelector('diffs-container')?.shadowRoot?.querySelector('pre') ?? null) !== null && document.querySelector('.ed-skeleton') === null
  };
  const tick = () => {
    if (st.t0 !== null && st.surfaceAt === null && st.check !== null && CHECKS[st.check]()) st.surfaceAt = performance.now();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__p254 = {
    arm(check) { st.check = check; st.surfaceAt = null; st.tasks = []; st.t0 = performance.now(); },
    read() {
      const t0 = st.t0 ?? 0;
      const after = st.tasks.filter((t) => t.end > t0);
      const lastEnd = after.reduce((m, t) => Math.max(m, t.end), 0);
      return {
        t0,
        surfaceAt: st.surfaceAt,
        firstPaint: st.surfaceAt === null ? null : Math.round(st.surfaceAt - t0),
        interactive: st.surfaceAt === null ? null : Math.round(Math.max(st.surfaceAt, lastEnd) - t0),
        lastTaskEnd: lastEnd,
        taskTotal: Math.round(after.reduce((s, t) => s + (t.end - t.start), 0)),
        now: performance.now()
      };
    }
  };
  return true;
})()`;

const FACE = `(() => ({
  monaco: document.querySelector('.monaco-editor .view-line') !== null,
  previewMounted: document.querySelector('.md-content') !== null,
  diff: (document.querySelector('diffs-container')?.shadowRoot?.querySelector('pre') ?? null) !== null,
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
        out.push({ path: el.getAttribute('data-item-path'), x: r.left + Math.min(60, r.width / 2), y: r.top + r.height / 2, h: r.height });
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
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 90000);

async function clickAt(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'mouse' });
  await sleep(40);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
}

async function treeRowPoint(cdp, rel) {
  const rowsNow = await cdpEval(cdp, TREE_ROWS, 20000);
  if (!Array.isArray(rowsNow)) return null;
  return rowsNow.find((x) => (x.path ?? '') === rel || (x.path ?? '').endsWith(`/${rel}`)) ?? null;
}

/**
 * Arm the recorder for `checkName`, click the Explorer row for `rel`, then
 * wait until the surface has painted and the page has been QUIET (no long
 * task ending) for 1.5 s, or the deadline passes. Returns the recorder's
 * reading — `firstPaint`/`interactive` null when the surface never came.
 */
async function timedTreeOpen(cdp, rel, checkName, deadlineMs) {
  const row = await treeRowPoint(cdp, rel);
  if (row === null) throw new Error(`no Explorer row for ${rel}`);
  await cdpEval(cdp, `window.__p254.arm(${JSON.stringify(checkName)})`, 5000);
  await clickAt(cdp, row.x, row.y);
  return settle(cdp, deadlineMs);
}

async function settle(cdp, deadlineMs) {
  const started = Date.now();
  let r = null;
  for (;;) {
    r = await cdpEval(cdp, 'window.__p254.read()', 20000);
    const quiet = r.surfaceAt !== null && r.now - Math.max(r.lastTaskEnd, r.surfaceAt) > 1500;
    if (quiet) return r;
    if (Date.now() - started > deadlineMs) return r;
    await sleep(200);
  }
}

const clickChip = (label) =>
  `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;

const readings = {};

await withElectron(
  {
    label: 'p254-open',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 12 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }
      await drive(cdp, { projectPath: project, editorWidth: 1000, sidebarWidth: 300 });
      await sleep(1500);
      await cdpEval(cdp, RECORDER, 5000);

      // The file rows live on the Explorer; put the sidebar there and wait
      // for the tree to draw before anything is clicked.
      await cdpEval(cdp, `(() => {
        const b = Array.from(document.querySelectorAll('.activitybar .ab-item')).find((x) => (x.getAttribute('aria-label') ?? '').startsWith('Explorer'));
        if (!b) return false;
        b.click();
        return true;
      })()`, 10000);
      let treeCount = 0;
      for (let i = 0; i < 60; i++) {
        const rowsNow = await cdpEval(cdp, TREE_ROWS, 20000);
        treeCount = Array.isArray(rowsNow) ? rowsNow.length : 0;
        if (treeCount >= 4) break;
        await sleep(500);
      }
      check('W0', 'the Explorer draws the four files', treeCount >= 4, `${treeCount} rows`);

      // Git status must have LOADED before the tracked twin is judged, or the
      // click lands in the race research 116 §3.3 measured. The warm file is
      // tracked + modified and one paragraph long: when ITS click opens the
      // diff, `gitState.byPath` has answered.
      say('warming git status until a tracked file opens as a diff');
      let warmed = false;
      for (let i = 0; i < 40 && !warmed; i++) {
        const row = await treeRowPoint(cdp, 'warm.md');
        if (row !== null) {
          await clickAt(cdp, row.x, row.y);
          await sleep(600);
          const f = await cdpEval(cdp, FACE, 10000);
          warmed = f.diff === true;
        }
        if (!warmed) await sleep(500);
      }
      check('W1', 'git status loaded (the warm tracked file opened as a diff)', warmed, '');

      // A. THE SPECSTORY SHAPE: 2.56 MB untracked .md, one single click.
      say('arm A: twin-a.md (2.56 MB untracked prose), single click');
      const a = await timedTreeOpen(cdp, 'twin-a.md', 'monaco', 60000);
      const aFace = await cdpEval(cdp, FACE, 10000);
      readings.a = { ...a, face: aFace };
      const aSurface = aFace.monaco && !aFace.previewMounted ? 'monaco' : aFace.previewMounted ? 'preview' : 'neither';
      // At the parent the Monaco check never fires; the render's own long
      // tasks say what the open cost instead (research 116's ~5.5 s).
      const aTaskMs = a.lastTaskEnd > (a.t0 ?? 0) ? Math.round(a.lastTaskEnd - a.t0) : null;
      note('A0', 'twin A reading', `firstPaint ${a.firstPaint} ms, interactive ${a.interactive} ms, surface ${aSurface}, mode ${aFace.modeOn}, long tasks ended ${aTaskMs} ms after the click`);
      check('A1', 'twin A opens in Monaco (Source), not the rendered preview', aSurface === 'monaco', `surface ${aSurface}`);
      check('A2', `twin A first paint under ${BUDGET_MS} ms (research 116: ~5,500 ms at the parent, 136 ms in Monaco)`, a.firstPaint !== null && a.firstPaint <= BUDGET_MS, `${a.firstPaint} ms`);
      check('A3', `twin A interactive under ${BUDGET_MS} ms`, a.interactive !== null && a.interactive <= BUDGET_MS, `${a.interactive} ms`);
      check('A4', 'the chip states the deferral in one clause', typeof aFace.previewTitle === 'string' && aFace.previewTitle.includes('deferred'), JSON.stringify(aFace.previewTitle));

      // D. A SMALL .md STILL OPENS RENDERED — the deferral must not over-reach.
      say('arm D: small.md, single click');
      const d = await timedTreeOpen(cdp, 'small.md', 'preview', 30000);
      const dFace = await cdpEval(cdp, FACE, 10000);
      readings.d = { ...d, face: dFace };
      const dSurface = dFace.previewMounted ? 'preview' : dFace.monaco ? 'monaco' : 'neither';
      check('D1', 'a small .md still opens rendered by default', dSurface === 'preview', `surface ${dSurface}, mode ${dFace.modeOn}`);

      // C. THE BACKLOG SHAPE: 3.26 MB tracked + modified — the fast diff.
      say('arm C: twin-b.md (3.26 MB tracked + modified), single click');
      const c = await timedTreeOpen(cdp, 'twin-b.md', 'diff', 60000);
      const cFace = await cdpEval(cdp, FACE, 10000);
      readings.c = { ...c, face: cFace };
      const cSurface = cFace.diff ? 'diff' : cFace.previewMounted ? 'preview' : cFace.monaco ? 'monaco' : 'neither';
      note('C0', 'twin B reading', `firstPaint ${c.firstPaint} ms, interactive ${c.interactive} ms, surface ${cSurface}`);
      check('C1', 'twin B opens as the Pierre diff', cSurface === 'diff', `surface ${cSurface}, mode ${cFace.modeOn}`);
      check('C2', `twin B interactive under ${BUDGET_MS} ms (research 116: ~250 ms typical)`, c.interactive !== null && c.interactive <= BUDGET_MS, `${c.interactive} ms`);

      // B. THE DEFERRED PROMISE, KEPT: Preview on the chip still renders the
      // whole 2.56 MB document. Its cost is PUBLISHED, not judged.
      say('arm B: twin-a.md again, then Preview on the chip (the deliberate ~5 s)');
      await timedTreeOpen(cdp, 'twin-a.md', 'monaco', 60000);
      await cdpEval(cdp, `window.__p254.arm('preview')`, 5000);
      const clicked = await cdpEval(cdp, clickChip('Preview'), 10000);
      const b = clicked === true ? await settle(cdp, 120000) : { firstPaint: null, interactive: null };
      const bFace = await cdpEval(cdp, FACE, 10000);
      readings.b = { ...b, clicked, face: bFace };
      check('B1', 'Preview is offered and clickable on the large tab', clicked === true, '');
      check('B2', 'the deferred preview renders the whole document when asked', bFace.previewMounted === true && b.firstPaint !== null, `render ${b.interactive} ms`);
      note('B3', 'the price of the deliberate click (was the price of every open at the parent)', `${b.interactive} ms`);

      const grade = {
        a: { surface: aSurface, firstPaint: a.firstPaint, interactive: a.interactive, previewMounted: aFace.previewMounted, previewTitle: aFace.previewTitle },
        d: { surface: dSurface },
        c: { surface: cSurface, interactive: c.interactive },
        b: { rendered: bFace.previewMounted === true && b.firstPaint !== null, ms: b.interactive }
      };
      readings.grade = grade;
      const findings = gradeOpen(grade);
      check('Z1', 'THE WHOLE RUN: a large prose file opens fast, the promise deferred and kept', findings.length === 0, findings.length === 0 ? '' : findings.join('; '));
      say('');
      say('published beside the measure step (research 116, same machine class):');
      say(`  twin A open      HEAD ${a.firstPaint}/${a.interactive} ms (this run's render tasks ended at ${aTaskMs} ms)   parent ~5,500 ms (no paint until done)   Monaco alone 136 ms`);
      say(`  twin B open      HEAD ${c.firstPaint}/${c.interactive} ms   parent ~250 ms (diff)                    Monaco alone 53 ms`);
      say(`  Preview, chosen  HEAD ${b.interactive} ms   parent: this was the cost of EVERY open`);
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
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
