#!/usr/bin/env node
/**
 * probe-p248-table.mjs — PHASE 248's MEASURE step, in the running app.
 *
 * The operator opened a `.md` file in Preview with a five column table and
 * the table was cut off at the fourth column, with several hundred pixels of
 * empty canvas either side. This run answers the five questions the Phase 248
 * entry asks, all off the running DOM, and IT REPAIRS NOTHING.
 *
 *   A. REPRODUCE. His shape of table at THREE pane widths: the drawn width of
 *      `.md-content`, of the table, of the pane, how many columns cannot be
 *      read without scrolling, and whether a scrollbar is drawn at all.
 *   B. THE CEILING. Every GFM table in this repository — 1,901 of them, read
 *      out of the tracked `.md` files by build/p248/corpus.mjs — rendered by
 *      the real pipeline, with each one's MIN-CONTENT width (the width below
 *      which a column is cut) and MAX-CONTENT width (the width past which
 *      more room buys nothing) read off the layout engine.
 *   C. THE CODE BLOCK. The same readings for a `pre`, whose overflow-x is the
 *      same line, plus what the corpus says about how long real code lines
 *      here actually are.
 *   D. DISCOVERABILITY. Whether the horizontal scrollbar takes layout space,
 *      what its thumb is drawn in, and where the cut falls.
 *   E. WHAT BREAKS FIRST. Three spellings of a full bleed injected as
 *      MEASUREMENT-ONLY stylesheets, one at a time and removed after: the
 *      viewport recipe, a flat negative margin, and a pane-relative cap. For
 *      each, whether the DOCUMENT scrolls sideways — the promise
 *      markdown.css:207 already makes, and the thing a full bleed done wrong
 *      breaks first.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it started
 * in a `finally`. A scratch profile, a scratch HOME and this script's own tmux
 * socket, ended and unlinked by build/harness-socket.mjs; `gmux` and `default`
 * are refused by name and the operator's own -L gmux sessions are counted
 * before and after. No agent, no token, no keychain, no request, no ssh, no
 * machine, no session created, and nothing written outside GMUX_HARNESS_DIR.
 * No product file is touched: the two style injections live in the page for
 * the length of one reading and are removed in a `finally` of their own.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p248]';
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

/**
 * The grader. A reading is THE OPERATOR'S PICTURE when, at his own pane width,
 * the prose column is capped at the measure, the table's own box is capped
 * with it, the table wants more room than that box has, at least one column
 * cannot be read without scrolling, and the pane has room to spare. Proved
 * under --self-test so a reading that could not fail is not read as one that
 * passed.
 */
function gradeReproduction(r) {
  const bad = [];
  if (!(r.paneWidth > r.contentWidth + 200)) bad.push(`the pane is not much wider than the column (${String(r.paneWidth)} vs ${String(r.contentWidth)})`);
  if (!(r.wrapClientWidth <= r.contentWidth + 1)) bad.push(`the table box is not inside the measure (${String(r.wrapClientWidth)} vs ${String(r.contentWidth)})`);
  if (!(r.tableWidth > r.wrapClientWidth)) bad.push('the table is not wider than its box, so nothing is cut off');
  if (!(r.columnsCut >= 1)) bad.push('every column is readable, so this is not his picture');
  if (r.docScrollsSideways) bad.push('the document itself scrolls sideways, which is a different defect');
  return bad;
}

if (process.argv.includes('--self-test')) {
  const OK = { paneWidth: 1000, contentWidth: 497, wrapClientWidth: 449, tableWidth: 812, columnsCut: 2, docScrollsSideways: false };
  const cases = [
    ['the operator’s picture', OK, 0],
    ['a narrow pane where the column already fills it', { ...OK, paneWidth: 560 }, 1],
    ['a table box that already breaks out', { ...OK, wrapClientWidth: 900 }, 2],
    ['a table that fits', { ...OK, tableWidth: 300, columnsCut: 0 }, 2],
    ['a document that scrolls sideways too', { ...OK, docScrollsSideways: true }, 1],
    ['everything wrong at once', { paneWidth: 500, contentWidth: 497, wrapClientWidth: 900, tableWidth: 300, columnsCut: 0, docScrollsSideways: true }, 5]
  ];
  let bad = 0;
  for (const [name, reading, want] of cases) {
    const got = gradeReproduction(reading).length;
    const ok = got === want;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: ${name} -> ${got} finding(s), wanted ${want}`);
  }
  say(`${cases.length - bad} of ${cases.length} grader fixtures behaved`);
  process.exit(bad === 0 ? 0 : 1);
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p248-${String(process.pid)}`, `node ${process.argv[1]}`],
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
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p248'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p248'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(REPO, 'build', 'p248', 'out-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

// ---------------------------------------------------------------------------
// The fixture. His shape: an AS-BUILT-ARCHITECTURE five column table whose
// cells carry paths and code spans, which is what makes a table's min-content
// width exceed a prose measure. Prose above and below it, so the measure is
// visible in the same reading, and a code fence with real line lengths.
// ---------------------------------------------------------------------------
const ARCH = `# As-built architecture

This document is the shape the operator was reading when the table below was
cut off. The paragraph exists so the prose measure can be read in the same
frame as the table, because the two numbers are the whole finding.

## Components

| Component | Language / runtime | Entry point | Documented before? | Ships via |
| --- | --- | --- | --- | --- |
| \`stoa-web/\` | Next.js 16, React 19 | \`app/layout.tsx\` | yes | Vercel, automatic on branch push |
| \`stoa-cli/\` | Go 1.26.8 + Rust (cgo) | \`cmd/stoa/main.go\` | yes | GitHub Releases, gated on a \`[release]\` marker |
| \`stoa-desktop-mac/\` | Swift / WKWebView | \`StoaApp.swift\` | yes | GitHub Actions on path change |
| \`stoa-desktop-windows/\` | Tauri v2 / WebView2 | \`src-tauri/main.rs\` | yes | GitHub Actions on path change |
| \`stoa-web/livekit-agent/\` | Node worker | \`agent/index.ts\` | no | \`lk agent deploy\`, manual |
| \`stoa-web/supabase/functions/\` | Deno, 20 functions | \`functions/_shared.ts\` | yes | \`supabase functions deploy\`, manual |
| \`packages/agent-sandbox/\` | TypeScript workspace pkg | \`src/index.ts\` | no | consumed by \`stoa-web\` |
| \`cloudflare-worker/\` | Cloudflare Worker | \`src/worker.ts\` | no | \`wrangler deploy\`, manual |

A second paragraph under the table, so the reading can tell the table's own
box from the prose column around it without guessing which rectangle is which.

## A fence

\`\`\`ts
const short = 1;
export function aLineOfAboutSixtyCharactersLongForTheMeasure(x: number) {
  return x * 2;
}
const eighty = someFunction(withAnArgument, andASecondArgument, andAThirdOne);
const oneHundred = anotherFunction(withAnArgument, andASecondArgument, andAThird, andAFourthArgument);
const oneHundredAndTwenty = yetAnotherFunction(withAnArgument, andASecondArgument, andAThirdArgument, andAFourthOne, five);
\`\`\`

## A narrow table

| Key | Value |
| --- | --- |
| one | 1 |
| two | 2 |
`;
writeFileSync(join(project, 'AS-BUILT-ARCHITECTURE.md'), ARCH);

// The corpus: every GFM table in this repository, emitted as documents the
// preview can be pointed at.
const emit = spawnSync(process.execPath, [join(REPO, 'build', 'p248', 'corpus.mjs'), '--emit', project], { encoding: 'utf8' });
if (emit.status !== 0) { console.error(emit.stderr); process.exit(2); }
const corpusIndex = JSON.parse(readFileSync(join(project, 'corpus-index.json'), 'utf8'));
say(`corpus: ${String(corpusIndex.tables.length)} real tables in ${String(corpusIndex.chunks)} document(s)`);

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p248@example.invalid');
git('config', 'user.name', 'p248');
git('add', '-A');
git('commit', '-q', '-m', 'the documents');

// ---------------------------------------------------------------------------
// The readings, all off the live DOM.
// ---------------------------------------------------------------------------

/** One ch of the prose column's own font, measured rather than assumed. */
const CH_PX = `(() => {
  const c = document.querySelector('.md-content');
  if (c === null) return null;
  const probe = document.createElement('div');
  probe.style.cssText = 'width:100ch;position:absolute;visibility:hidden;';
  c.appendChild(probe);
  const w = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return Math.round(w * 1000) / 1000;
})()`;

/** One ch of the CODE fence's own font, and the colours the affordance is drawn in. */
const FENCE_CH = `(() => {
  const pre = document.querySelector('.md-content pre');
  if (pre === null) return null;
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:100ch;position:absolute;visibility:hidden;';
  pre.appendChild(probe);
  const w = probe.getBoundingClientRect().width / 100;
  probe.remove();
  const cs = getComputedStyle(document.documentElement);
  const wrap = document.querySelector('.md-table-scroll');
  const table = wrap === null ? null : wrap.querySelector('table');
  const wr = wrap === null ? null : wrap.getBoundingClientRect();
  const tr = table === null ? null : table.getBoundingClientRect();
  const lastVisibleCell = (() => {
    if (table === null || wr === null) return null;
    const cells = Array.from(table.querySelectorAll('tbody tr:first-child td'));
    for (let i = cells.length - 1; i >= 0; i -= 1) {
      const r = cells[i].getBoundingClientRect();
      if (r.left < wr.right) return { index: i, right: Math.round(r.right), borderRight: getComputedStyle(cells[i]).borderRightWidth, clipped: r.right > wr.right };
    }
    return null;
  })();
  return {
    chPx: Math.round(w * 1000) / 1000,
    borderStrong: cs.getPropertyValue('--border-strong').trim(),
    bgCanvas: cs.getPropertyValue('--bg-canvas').trim(),
    border: cs.getPropertyValue('--border').trim(),
    boxRight: wr === null ? null : Math.round(wr.right),
    tableRight: tr === null ? null : Math.round(tr.right),
    lastVisibleCell,
    thumbPx: wrap === null ? null : Math.round((wrap.clientWidth * wrap.clientWidth) / wrap.scrollWidth)
  };
})()`;

/**
 * The face of the fixture document. Everything a rectangle can say about the
 * measure, the table's own box, the table, its columns and the code fence.
 */
const FACE = `(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const scroll = document.querySelector('.md-scroll');
  const content = document.querySelector('.md-content');
  const wrap = document.querySelector('.md-table-scroll');
  const table = wrap === null ? null : wrap.querySelector('table');
  const pre = document.querySelector('.md-content pre');
  if (scroll === null || content === null) return null;
  const cs = getComputedStyle(content);
  const wr = wrap === null ? null : wrap.getBoundingClientRect();
  const headers = table === null ? [] : Array.from(table.querySelectorAll('thead th'));
  const cols = headers.map((th) => {
    const r = th.getBoundingClientRect();
    const visible = wr === null ? 0 : Math.max(0, Math.min(r.right, wr.right) - Math.max(r.left, wr.left));
    return {
      text: (th.textContent || '').trim(),
      width: round(r.width),
      shown: round(visible),
      fraction: r.width > 0 ? Math.round((visible / r.width) * 100) : 0
    };
  });
  // Natural widths: set, read, restore. A measurement, not a change.
  let minContent = null, maxContent = null;
  if (table !== null) {
    const was = table.style.width;
    table.style.width = 'max-content';
    maxContent = round(table.getBoundingClientRect().width);
    table.style.width = 'min-content';
    minContent = round(table.getBoundingClientRect().width);
    table.style.width = was;
  }
  return {
    dpr: window.devicePixelRatio,
    innerWidth: window.innerWidth,
    pane: { clientWidth: scroll.clientWidth, offsetWidth: scroll.offsetWidth, scrollWidth: scroll.scrollWidth },
    content: {
      width: round(content.getBoundingClientRect().width),
      left: round(content.getBoundingClientRect().left),
      right: round(content.getBoundingClientRect().right),
      paddingLeft: cs.paddingLeft,
      paddingRight: cs.paddingRight,
      maxWidth: cs.maxWidth,
      inner: round(content.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    },
    wrap: wrap === null ? null : {
      clientWidth: wrap.clientWidth,
      offsetWidth: wrap.offsetWidth,
      scrollWidth: wrap.scrollWidth,
      offsetHeight: wrap.offsetHeight,
      clientHeight: wrap.clientHeight,
      barPx: wrap.offsetHeight - wrap.clientHeight,
      scrollLeft: wrap.scrollLeft,
      canScroll: wrap.scrollWidth > wrap.clientWidth
    },
    table: table === null ? null : { width: round(table.getBoundingClientRect().width), minContent, maxContent },
    cols,
    pre: pre === null ? null : {
      clientWidth: pre.clientWidth,
      scrollWidth: pre.scrollWidth,
      offsetHeight: pre.offsetHeight,
      clientHeight: pre.clientHeight,
      barPx: pre.offsetHeight - pre.clientHeight,
      canScroll: pre.scrollWidth > pre.clientWidth
    },
    docScrollsSideways: scroll.scrollWidth > scroll.clientWidth,
    deadCanvasPct: Math.round(((scroll.clientWidth - content.getBoundingClientRect().width) / scroll.clientWidth) * 1000) / 10
  };
})()`;

/** Every table in the open corpus document, with its natural widths. */
const CORPUS = `(() => {
  const tables = Array.from(document.querySelectorAll('.md-content .md-table-scroll > table'));
  const box = document.querySelector('.md-content .md-table-scroll');
  const was = tables.map((t) => t.style.width);
  for (const t of tables) t.style.width = 'max-content';
  const max = tables.map((t) => Math.round(t.getBoundingClientRect().width));
  for (const t of tables) t.style.width = 'min-content';
  const min = tables.map((t) => Math.round(t.getBoundingClientRect().width));
  for (let i = 0; i < tables.length; i += 1) tables[i].style.width = was[i];
  const drawn = tables.map((t) => Math.round(t.getBoundingClientRect().width));
  const cols = tables.map((t) => { const r = t.querySelector('tr'); return r === null ? 0 : r.children.length; });
  return { count: tables.length, box: box === null ? null : box.clientWidth, max, min, drawn, cols };
})()`;

const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
const FILL_STATE = `(() => { const b = document.querySelector('[aria-label="Fill the window"]'); return b === null ? null : b.getAttribute('aria-pressed') === 'true'; })()`;
const FILL_PRESS = `(() => { const b = document.querySelector('[aria-label="Fill the window"]'); if (b === null) return false; b.click(); return true; })()`;

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
    try { v = await cdpEval(cdp, expr, 20000); } catch { v = null; }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(150);
  }
};
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 120000);

async function callOk(cdp, method, params) {
  const msg = await cdp.call(method, params);
  if (msg?.error) throw new Error(`${method}: ${msg.error.message ?? JSON.stringify(msg.error)}`);
  return msg?.result ?? {};
}

/** The viewport, resized the way p189 resizes it: the real window if it can. */
async function makeResizer(cdp) {
  return {
    how: 'Emulation.setDeviceMetricsOverride',
    async set(width, height = 960) {
      await callOk(cdp, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 0, mobile: false });
      await sleep(500);
      const inner = await cdpEval(cdp, 'window.innerWidth', 8000);
      if (typeof inner !== 'number' || Math.abs(inner - width) > 2) throw new Error(`asked for ${String(width)}px and the window reports ${String(inner)}px`);
    }
  };
}

/**
 * A MEASUREMENT-ONLY stylesheet. It lives in the page for the length of one
 * reading and is removed in a `finally` — no product file is touched.
 */
async function withStyle(cdp, id, css, body) {
  await cdpEval(cdp, `(() => { const s = document.createElement('style'); s.id = ${JSON.stringify(id)}; s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); return true; })()`, 10000);
  try {
    await sleep(400);
    return await body();
  } finally {
    await cdpEval(cdp, `(() => { const s = document.getElementById(${JSON.stringify(id)}); if (s) s.remove(); return true; })()`, 10000);
    await sleep(300);
  }
}

const readings = { widths: {}, corpus: [], bleed: {} };
const widePanesReached = [];

await withElectron(
  {
    label: 'p248',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 20 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${handle.appPid()}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }

      const resize = await makeResizer(cdp);

      /**
       * THE PANE IS SET BY DRAGGING THE EDITOR'S OWN DIVIDER, and the window
       * is set once and never touched again.
       *
       * The first version of this probe resized the window instead, and it was
       * not reproducible: the sidebar and the project rail collapse and return
       * with the window, so the chrome to the left of the pane is not a
       * constant, and a run that walks through a narrow window on its way to a
       * wide one leaves Fill behind for good — EditorPanel.tsx says so in as
       * many words, "Fill mode cannot outlive the thing it was filling with".
       * Three readings landed at three different panes across three runs. The
       * divider is the control a person actually uses, it is absolute rather
       * than relative, and a drag never changes the chrome around it.
       */
      const paneOf = async () => {
        const v = await cdpEval(cdp, `(() => { const s = document.querySelector('.md-scroll'); return s === null ? null : s.clientWidth; })()`, 10000);
        return typeof v === 'number' ? v : 0;
      };
      const dividerAt = async () =>
        cdpEval(cdp, `(() => { const d = document.querySelector('.ed-divider'); const s = document.querySelector('.md-scroll'); if (d === null || s === null) return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), pane: s.clientWidth }; })()`, 10000);
      const mouseDrag = async (x, y, toX) => {
        await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
        const steps = 6;
        for (let i = 1; i <= steps; i += 1) {
          const at = Math.round(x + ((toX - x) * i) / steps);
          await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: at, y, button: 'left', buttons: 1 });
          await sleep(30);
        }
        await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y, button: 'left', buttons: 0, clickCount: 1 });
      };
      /** Drag until the pane is the width asked for; answer what it reached. */
      const paneTo = async (target) => {
        for (let i = 0; i < 8; i += 1) {
          const g = await dividerAt();
          if (g === null) return 0;
          if (Math.abs(g.pane - target) <= 2) return g.pane;
          await mouseDrag(g.x, g.y, g.x + (g.pane - target));
          await sleep(280);
        }
        return await paneOf();
      };

      // The window is set ONCE, wide enough that every pane below is reachable
      // by the divider alone, and never touched again.
      await resize.set(1900);
      await sleep(400);
      await drive(cdp, { projectPath: project, editorWidth: 4000, sidebarWidth: 220 });
      await sleep(1200);
      await drive(cdp, { projectPath: project, openRel: 'AS-BUILT-ARCHITECTURE.md', mode: 'file' });
      await until(cdp, `document.querySelector('.md-content') !== null`, 30000);
      await cdpEval(cdp, clickMode('Preview'));
      await sleep(1200);
      await until(cdp, `document.querySelector('.md-table-scroll table') !== null`, 30000);

      const chPx = await cdpEval(cdp, CH_PX, 10000);
      readings.chPx = chPx;
      note('A0', 'one ch of the prose column, measured', `${String(chPx)} px, so 68ch is ${String(Math.round(chPx * 68))} px`);
      const fence = await cdpEval(cdp, FENCE_CH, 10000);
      readings.fence = fence;
      if (fence !== null) {
        note('A0b', 'one ch of the code fence, measured', `${String(fence.chPx)} px`);
        note('A0c', 'the affordance and the cut', JSON.stringify(fence));
      }

      const PANES = (process.env['P248_PANES'] ?? 'narrow:620,his:1000,wider:1400')
        .split(',')
        .map((one) => one.split(':'))
        .map(([n, w]) => [n, Number(w)]);
      note('A0d', 'the widest pane the divider can reach in this window', `${String(await paneTo(4000))} px`);
      for (const [name, targetPane] of PANES) {
        const reached = await paneTo(targetPane);
        await sleep(400);
        const f = await cdpEval(cdp, FACE, 30000);
        readings.widths[name] = { targetPane, reached, face: f };
        if (f === null) { check(`A-${name}`, 'the preview is up', false, 'no .md-content'); continue; }
        const cut = f.cols.filter((c) => c.fraction < 100).length;
        const unread = f.cols.filter((c) => c.fraction < 50).length;
        note(`A1-${name}`, 'pane, prose column, table', `window ${String(f.innerWidth)} css px (dpr ${String(f.dpr)}) fixed · pane ${String(f.pane.clientWidth)} · .md-content ${String(f.content.width)} (text ${String(f.content.inner)}) · table ${String(f.table.width)} · dead canvas ${String(f.deadCanvasPct)}%`);
        note(`A2-${name}`, 'the table box and what the table wants', `box ${String(f.wrap.clientWidth)} · scrollWidth ${String(f.wrap.scrollWidth)} · min-content ${String(f.table.minContent)} · max-content ${String(f.table.maxContent)}`);
        note(`A3-${name}`, 'columns', f.cols.map((c) => `${c.text}:${String(c.fraction)}%`).join(' | '));
        note(`A4-${name}`, 'the scrollbar', `it takes ${String(f.wrap.barPx)}px of layout height, canScroll ${String(f.wrap.canScroll)}`);
        check(`A5-${name}`, 'the document never scrolls sideways', f.docScrollsSideways === false, `scrollWidth ${String(f.pane.scrollWidth)} vs clientWidth ${String(f.pane.clientWidth)}`);
        const grade = {
          paneWidth: f.pane.clientWidth,
          contentWidth: f.content.width,
          wrapClientWidth: f.wrap.clientWidth,
          tableWidth: f.table.width,
          columnsCut: cut,
          docScrollsSideways: f.docScrollsSideways
        };
        readings.widths[name].grade = grade;
        // The picture is graded at any width that really reached a wide pane,
        // and a width that did not is reported rather than graded, because a
        // reading taken at a pane the run could not reach proves nothing about
        // the pane he was looking at.
        if (f.pane.clientWidth >= 900) {
          widePanesReached.push(f.pane.clientWidth);
          const bad = gradeReproduction(grade);
          check(`A6-${name}`, 'THE OPERATOR’S PICTURE: room to spare and a column that cannot be read', bad.length === 0, bad.length === 0 ? `pane ${String(f.pane.clientWidth)}, ${String(cut)} column(s) cut, ${String(unread)} under half shown` : bad.join('; '));
        } else if (name !== 'narrow') {
          note(`A6-${name}`, 'this width did not reach the pane it asked for', `wanted ${String(targetPane)}, got ${String(f.pane.clientWidth)}`);
        }
      }

      // ---- E. WHAT BREAKS FIRST ------------------------------------------
      // The cap under test is TWICE THE MEASURE, spelled in the same unit the
      // measure is spelled in, so it tracks the prose column under a font
      // change instead of drifting away from it. 136ch is 1,113.6 px at the
      // shipped face, measured above.
      const CAP = '136ch';
      const spellings = [
        ['viewport', `.md-content .md-table-scroll, .md-content pre { width: 100vw; margin-left: calc(50% - 50vw); }`],
        ['flat-negative', `.md-content .md-table-scroll, .md-content pre { margin-inline: calc(-1 * var(--space-10)); }`],
        ['pane-relative', `.md-scroll { container-type: inline-size; }
.md-content .md-table-scroll, .md-content pre {
  --md-wide: min(${CAP}, 100cqi - 2 * var(--space-8));
  width: max(100%, var(--md-wide));
  margin-inline: calc((100% - max(100%, var(--md-wide))) / 2);
}`]
      ];
      for (const [name, css] of spellings) {
        readings.bleed[name] = {};
        for (const [wname, targetPane] of [['tight', 580], ...PANES]) {
          await paneTo(targetPane);
          await sleep(300);
          const f = await withStyle(cdp, `p248-${name}`, css, () => cdpEval(cdp, FACE, 30000));
          readings.bleed[name][wname] = f;
          if (f === null) { check(`E-${name}-${wname}`, 'the preview is up', false, 'no .md-content'); continue; }
          const cut = f.cols.filter((c) => c.fraction < 100).length;
          note(`E1-${name}-${wname}`, 'what it drew', `pane ${String(f.pane.clientWidth)} · prose ${String(f.content.width)} · table box ${String(f.wrap.clientWidth)} · table ${String(f.table.width)} · ${String(cut)} cut · pre box ${String(f.pre.clientWidth)}`);
          note(`E2-${name}-${wname}`, 'does the DOCUMENT scroll sideways', `${String(f.docScrollsSideways)} (scrollWidth ${String(f.pane.scrollWidth)} vs clientWidth ${String(f.pane.clientWidth)})`);
        }
      }
      // WHERE THE GROWTH STOPS, swept rather than argued: the first pane width
      // at which the table's box reaches the cap and stops.
      {
        const capCssOnly = spellings[2][1];
        const sweep = [];
        for (let target = 1040; target <= 1240; target += 20) {
          await paneTo(target);
          await sleep(250);
          const got = await withStyle(cdp, 'p248-sweep', capCssOnly, () =>
            cdpEval(cdp, `(() => { const s = document.querySelector('.md-scroll'); const b = document.querySelector('.md-table-scroll'); return s === null || b === null ? null : { pane: s.clientWidth, box: b.clientWidth }; })()`, 20000)
          );
          if (got !== null) sweep.push(got);
        }
        readings.sweep = sweep;
        const ordered = [...sweep].sort((a, b) => a.pane - b.pane);
        const top = ordered.length === 0 ? 0 : Math.max(...ordered.map((r) => r.box));
        const first = ordered.find((r) => r.box >= top) ?? null;
        note('E4', 'where the box stops growing', `${ordered.map((r) => `${String(r.pane)}:${String(r.box)}`).join(' ')}`);
        note('E4b', 'the cap and the pane that first reaches it', `${String(top)} px, first reached at a pane of ${first === null ? 'none' : String(first.pane)} px`);
      }

      // And the pane-relative spelling at all three widths, so the cap and the
      // pane width at which the table stops growing are read rather than argued.
      readings.bleedByWidth = {};
      const [, capCss] = spellings[2];
      for (const [name, targetPane] of [...PANES, ['very-wide', 1600]]) {
        await paneTo(targetPane);
        await sleep(350);
        const f = await withStyle(cdp, 'p248-cap', capCss, () => cdpEval(cdp, FACE, 30000));
        readings.bleedByWidth[name] = { targetPane, face: f };
        if (f === null) continue;
        const cut = f.cols.filter((c) => c.fraction < 100).length;
        note(`E3-${name}`, 'the capped spelling', `pane ${String(f.pane.clientWidth)} · prose ${String(f.content.width)} · table box ${String(f.wrap.clientWidth)} · table ${String(f.table.width)} · ${String(cut)} cut · sideways ${String(f.docScrollsSideways)}`);
      }

      // ---- B/C. THE CORPUS ------------------------------------------------
      if ((process.env['P248_CORPUS'] ?? '1') === '0') {
        note('B0', 'the corpus arm is off', 'P248_CORPUS=0');
      } else {
      await paneTo(1000);
      for (let c = 0; c < corpusIndex.chunks; c += 1) {
        await drive(cdp, { projectPath: project, openRel: `corpus-${String(c)}.md`, mode: 'file' });
        await sleep(800);
        await cdpEval(cdp, clickMode('Preview'));
        await sleep(1500);
        const got = await until(cdp, `document.querySelectorAll('.md-content .md-table-scroll > table').length > 1`, 60000);
        if (!got) { note(`B0-${String(c)}`, 'corpus document did not render', 'skipped'); continue; }
        await sleep(1200);
        const r = await cdpEval(cdp, CORPUS, 120000);
        readings.corpus.push({ chunk: c, ...r });
        note(`B1-${String(c)}`, 'corpus document read', `${String(r.count)} tables, box ${String(r.box)} px`);
      }
      }
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

// ---------------------------------------------------------------------------
// The corpus arithmetic, printed here rather than in the page.
// ---------------------------------------------------------------------------
const all = [];
for (const c of readings.corpus) {
  for (let i = 0; i < c.count; i += 1) all.push({ chunk: c.chunk, i, min: c.min[i], max: c.max[i], drawn: c.drawn[i], cols: c.cols[i] });
}
readings.corpusFlat = all;
if (all.length > 0) {
  const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
  const mins = all.map((t) => t.min);
  const maxs = all.map((t) => t.max);
  say('');
  say(`CORPUS: ${String(all.length)} real tables measured in the real pipeline`);
  for (const p of [50, 75, 90, 95, 99, 100]) say(`  min-content p${String(p).padStart(3)}: ${String(pct(mins, p))} px    max-content p${String(p).padStart(3)}: ${String(pct(maxs, p))} px`);
  for (const cap of [509, 600, 720, 840, 960, 1080, 1114, 1200, 1400, 1751]) {
    const noCut = all.filter((t) => t.min <= cap).length;
    const whole = all.filter((t) => t.max <= cap).length;
    say(`  a box of ${String(cap).padStart(4)} px: ${String(noCut).padStart(4)} of ${String(all.length)} tables cut no column (${((noCut / all.length) * 100).toFixed(1)}%), ${String(whole).padStart(4)} drawn at their natural width (${((whole / all.length) * 100).toFixed(1)}%)`);
  }
}
writeFileSync(readingsFile, JSON.stringify(readings, null, 2));

check('X2', 'at least one reading was taken at a pane of 1,000 px or more, which is his', widePanesReached.some((p) => p >= 1000), widePanesReached.join(', '));

const opAfter = operatorCount();
check('X1', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${opBefore} -> ${opAfter}`);
say('');
say(`${rows.filter((r) => r.pass === true).length} passed, ${failures.length} failed, ${rows.filter((r) => r.pass === null).length} notes`);
say(`readings at ${readingsFile}`);
if (failures.length > 0) { for (const f of failures) say(`FAILURE: ${f}`); process.exit(1); }
process.exit(0);
