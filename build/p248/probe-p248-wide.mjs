#!/usr/bin/env node
/**
 * probe-p248-wide.mjs — PHASE 248's app run: the block that got the pane.
 *
 * The measure step (research 112, `probe-p248-table.mjs`) reproduced the
 * operator's picture and repaired nothing. THIS run drives the repair and
 * reads it off the running DOM at four pane widths on both bases.
 *
 *   A. THE PROSE MEASURE DID NOT MOVE. `.md-content` draws at the same
 *      556.8px at every pane wide enough to hold it, which is the refusal the
 *      charter names first.
 *   B. THE TABLE GOT THE PANE. Its box grows with the pane instead of sitting
 *      at 509px for ever, every one of his five columns is readable at his own
 *      width, and the box stops at the cap.
 *   C. THE DOCUMENT NEVER SCROLLS SIDEWAYS, at a pane narrower than the
 *      measure as well as at one three times it. That is `markdown.css`'s own
 *      standing promise and the first thing a full bleed done wrong breaks.
 *   D. THE FENCE AND THE TABLE ARE ONE WIDTH, which is the `@property` trap
 *      research 112 §4 named: an unregistered custom property would have
 *      resolved `136ch` against `--font-editor` inside `pre`.
 *   E. TWO ABLATIONS, injected as measurement-only stylesheets and removed in
 *      a `finally`. The parent's rule put back brings the defect back, and
 *      `container-type: normal` — the one clause that makes `100cqi` mean the
 *      pane — makes the document scroll sideways.
 *   F. THE AFFORDANCE, as the arithmetic the CSS claims: `--text-muted` on
 *      `--bg-canvas`, read off the running root on both bases, against the
 *      3:1 WCAG 1.4.11 asks and the 1.594:1 the shared thumb was drawn at.
 *   G. NOTHING ELSE MOVED. Source and Split still render, Split's preview
 *      gets the same treatment, and the heading ruler still measures.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it started
 * in a `finally`. A scratch profile, a scratch HOME and this script's own tmux
 * socket, ended and unlinked by build/harness-socket.mjs; `gmux` and `default`
 * are refused by name and the operator's own -L gmux sessions are counted
 * before and after. No agent, no token, no keychain, no request, no ssh, no
 * machine, no session created, and nothing written outside GMUX_HARNESS_DIR
 * except the readings and the log under build/p248/.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p248w]';
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
// The graders. Each answers a list of findings, so a reading that could not
// fail is never mistaken for one that passed.
// ---------------------------------------------------------------------------

/** The prose measure, at a pane wide enough to hold it. */
export function gradeMeasure(r, measurePx) {
  const bad = [];
  if (r.paneWidth < measurePx + 8) return bad; // narrower than the measure: nothing to hold
  if (Math.abs(r.contentWidth - measurePx) > 1) bad.push(`the prose column drew ${String(r.contentWidth)} px, not the measure's ${String(measurePx)} px`);
  return bad;
}

/**
 * The repair. THE CLAIM IS THE BOX AND NOT THE COLUMNS, because a pane
 * narrower than the table's own min-content cannot show every column however
 * the block is spelled: what the phase promises is that the block takes
 * whatever the pane can give, up to the cap, and that the columns follow
 * WHEREVER THE BOX IS BIG ENOUGH FOR THEM. Grading the columns at a 580 px
 * pane would fail a reading that is behaving exactly as designed.
 */
export function gradeRepair(r, measurePx) {
  const bad = [];
  const gutters = 2 * 24; // 2 * var(--space-8), the block's own margin from the pane
  const room = Math.min(r.paneWidth - gutters, r.tableMinContent);
  if (r.docScrollsSideways) bad.push('the document scrolls sideways');
  if (!(r.wrapClientWidth >= room - 1)) {
    bad.push(`the table box is ${String(r.wrapClientWidth)} px, which is neither the pane less its gutters (${String(r.paneWidth - gutters)}) nor enough for the table (${String(r.tableMinContent)})`);
  }
  if (r.wrapClientWidth >= r.tableMinContent - 1 && r.columnsUnder100 > 0) {
    bad.push(`the box is wide enough for the table and ${String(r.columnsUnder100)} column(s) are still cut`);
  }
  if (Math.abs(r.contentWidth - measurePx) > 1) bad.push(`the prose column moved to ${String(r.contentWidth)} px`);
  if (r.preClientWidth !== null && Math.abs(r.preClientWidth - r.wrapClientWidth) > 3) {
    bad.push(`the fence box is ${String(r.preClientWidth)} px against the table's ${String(r.wrapClientWidth)} px`);
  }
  return bad;
}

/** The defect, which is what an ablation has to bring back. */
export function gradeDefect(r) {
  const bad = [];
  if (!(r.paneWidth > r.contentWidth + 200)) bad.push('the pane is not much wider than the column');
  if (!(r.wrapClientWidth <= r.contentWidth + 1)) bad.push('the table box is not inside the measure');
  if (!(r.columnsUnder100 >= 1)) bad.push('every column is readable');
  return bad;
}

const ratio = (a, b) => {
  const lum = (hex) => {
    const h = hex.trim().replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    const [r, g, b2] = n.map((p) => {
      const v = parseInt(p, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const x = lum(a);
  const y = lum(b);
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 1000) / 1000;
};

if (process.argv.includes('--self-test')) {
  const M = 556.8;
  const REPAIRED = { paneWidth: 1000, contentWidth: 556.8, wrapClientWidth: 952, tableWidth: 952, tableMinContent: 759, columnsUnder100: 0, docScrollsSideways: false, preClientWidth: 952 };
  const cases = [
    ['the repair at his pane', () => gradeRepair(REPAIRED, M), 0],
    ['the prose column widened with it', () => gradeRepair({ ...REPAIRED, contentWidth: 952 }, M), 1],
    ['the document scrolls sideways', () => gradeRepair({ ...REPAIRED, docScrollsSideways: true }, M), 1],
    ['the table box never grew', () => gradeRepair({ ...REPAIRED, wrapClientWidth: 509, columnsUnder100: 2, preClientWidth: 507 }, M), 1],
    ['a pane too narrow to hold the table, behaving', () => gradeRepair({ ...REPAIRED, paneWidth: 580, wrapClientWidth: 532, tableWidth: 759, columnsUnder100: 2, preClientWidth: 530 }, M), 0],
    ['a pane too narrow AND the block did not take it', () => gradeRepair({ ...REPAIRED, paneWidth: 580, wrapClientWidth: 400, tableWidth: 759, columnsUnder100: 3, preClientWidth: 398 }, M), 1],
    ['the fence resolved ch in the mono font', () => gradeRepair({ ...REPAIRED, preClientWidth: 819 }, M), 1],
    ['the measure held', () => gradeMeasure({ paneWidth: 1000, contentWidth: 556.8 }, M), 0],
    ['the measure moved', () => gradeMeasure({ paneWidth: 1000, contentWidth: 900 }, M), 1],
    ['a pane narrower than the measure is not asked', () => gradeMeasure({ paneWidth: 420, contentWidth: 420 }, M), 0],
    ['the defect, put back', () => gradeDefect({ paneWidth: 1000, contentWidth: 556.8, wrapClientWidth: 509, columnsUnder100: 2 }), 0],
    ['the defect is gone, so the ablation did nothing', () => gradeDefect({ paneWidth: 1000, contentWidth: 556.8, wrapClientWidth: 952, columnsUnder100: 0 }), 2],
    ['the ratio arithmetic', () => (ratio('#838996', '#131417') > 4.5 ? [] : ['under']), 0],
    ['the ratio the shared thumb reads', () => (Math.abs(ratio('#353943', '#131417') - 1.594) < 0.01 ? [] : ['moved']), 0]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    const got = run().length;
    const ok = got === want;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: ${name} -> ${String(got)} finding(s), wanted ${String(want)}`);
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
say(`operator sessions on -L gmux before: ${String(opBefore)}`);

mkdirSync(join(harnessDir, 'p248w'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p248w'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(REPO, 'build', 'p248', 'out-wide-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

// The fixture is the measure step's, unchanged, so the two runs are readings
// of the same document at the parent and at HEAD.
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

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p248@example.invalid');
git('config', 'user.name', 'p248');
git('add', '-A');
git('commit', '-q', '-m', 'the document');

// ---------------------------------------------------------------------------
// The readings, all off the live DOM.
// ---------------------------------------------------------------------------

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
    return { text: (th.textContent || '').trim(), width: round(r.width), shown: round(visible), fraction: r.width > 0 ? Math.round((visible / r.width) * 100) : 0 };
  });
  let minContent = null, maxContent = null;
  if (table !== null) {
    const was = table.style.width;
    table.style.width = 'max-content';
    maxContent = round(table.getBoundingClientRect().width);
    table.style.width = 'min-content';
    minContent = round(table.getBoundingClientRect().width);
    table.style.width = was;
  }
  const root = getComputedStyle(document.documentElement);
  return {
    dpr: window.devicePixelRatio,
    innerWidth: window.innerWidth,
    scheme: document.documentElement.getAttribute('data-scheme'),
    tokens: {
      textMuted: root.getPropertyValue('--text-muted').trim(),
      textSecondary: root.getPropertyValue('--text-secondary').trim(),
      borderStrong: root.getPropertyValue('--border-strong').trim(),
      bgCanvas: root.getPropertyValue('--bg-canvas').trim()
    },
    mdWide: cs.getPropertyValue('--md-wide').trim(),
    containerType: getComputedStyle(scroll).containerType,
    pane: { clientWidth: scroll.clientWidth, offsetWidth: scroll.offsetWidth, scrollWidth: scroll.scrollWidth },
    content: {
      width: round(content.getBoundingClientRect().width),
      paddingLeft: cs.paddingLeft,
      paddingRight: cs.paddingRight,
      maxWidth: cs.maxWidth,
      inner: round(content.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    },
    wrap: wrap === null ? null : {
      clientWidth: wrap.clientWidth,
      scrollWidth: wrap.scrollWidth,
      barPx: wrap.offsetHeight - wrap.clientHeight,
      canScroll: wrap.scrollWidth > wrap.clientWidth,
      left: round(wr.left),
      right: round(wr.right)
    },
    table: table === null ? null : { width: round(table.getBoundingClientRect().width), minContent, maxContent },
    cols,
    pre: pre === null ? null : {
      clientWidth: pre.clientWidth,
      scrollWidth: pre.scrollWidth,
      width: round(pre.getBoundingClientRect().width),
      canScroll: pre.scrollWidth > pre.clientWidth,
      fontFamily: getComputedStyle(pre).fontFamily,
      mdWide: getComputedStyle(pre).getPropertyValue('--md-wide').trim()
    },
    ruler: (() => {
      const r = document.querySelector('.md-ruler');
      if (r === null) return null;
      const thumb = r.querySelector('.md-ruler-thumb');
      return { ticks: r.querySelectorAll('.md-ruler-tick').length, thumbHeight: thumb === null ? 0 : Math.round(thumb.getBoundingClientRect().height) };
    })(),
    docScrollsSideways: scroll.scrollWidth > scroll.clientWidth,
    deadCanvasPct: Math.round(((scroll.clientWidth - content.getBoundingClientRect().width) / scroll.clientWidth) * 1000) / 10
  };
})()`;

const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()); } catch { port = 0; }
    if (port > 0) {
      let list = [];
      try { list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json(); } catch { list = []; }
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

/** A MEASUREMENT-ONLY stylesheet, removed in a `finally`. */
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

const readings = { widths: {}, sweep: [], ablations: {}, light: {}, modes: {} };

await withElectron(
  {
    label: 'p248w',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${String(handle.appPid())}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }

      const setViewport = async (width, height = 960) => {
        await callOk(cdp, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 0, mobile: false });
        await sleep(500);
      };

      const paneOf = async () => {
        const v = await cdpEval(cdp, `(() => { const s = document.querySelector('.md-scroll'); return s === null ? null : s.clientWidth; })()`, 10000);
        return typeof v === 'number' ? v : 0;
      };
      const dividerAt = async () =>
        cdpEval(cdp, `(() => { const d = document.querySelector('.ed-divider'); const s = document.querySelector('.md-scroll'); if (d === null || s === null) return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), pane: s.clientWidth }; })()`, 10000);
      const mouseDrag = async (x, y, toX) => {
        await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
        for (let i = 1; i <= 6; i += 1) {
          const at = Math.round(x + ((toX - x) * i) / 6);
          await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: at, y, button: 'left', buttons: 1 });
          await sleep(30);
        }
        await callOk(cdp, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y, button: 'left', buttons: 0, clickCount: 1 });
      };
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

      await setViewport(1900);
      await drive(cdp, { projectPath: project, editorWidth: 4000, sidebarWidth: 220 });
      await sleep(1200);
      await drive(cdp, { projectPath: project, openRel: 'AS-BUILT-ARCHITECTURE.md', mode: 'file' });
      await until(cdp, `document.querySelector('.md-content') !== null`, 30000);
      await cdpEval(cdp, clickMode('Preview'));
      await sleep(1200);
      await until(cdp, `document.querySelector('.md-table-scroll table') !== null`, 30000);

      const chPx = await cdpEval(cdp, CH_PX, 10000);
      const MEASURE = Math.round(chPx * 68 * 10) / 10;
      const CAP = Math.round(chPx * 136 * 10) / 10;
      readings.chPx = chPx;
      readings.measurePx = MEASURE;
      readings.capPx = CAP;
      note('A0', 'one ch of the prose column, measured', `${String(chPx)} px, so the measure is ${String(MEASURE)} px and the cap ${String(CAP)} px`);
      note('A0b', 'the widest pane the divider reaches in this window', `${String(await paneTo(4000))} px`);

      const PANES = (process.env['P248_PANES'] ?? 'tight:580,narrow:620,his:1000,wider:1381')
        .split(',')
        .map((one) => one.split(':'))
        .map(([n, w]) => [n, Number(w)]);

      for (const [name, targetPane] of PANES) {
        const reached = await paneTo(targetPane);
        await sleep(400);
        const f = await cdpEval(cdp, FACE, 30000);
        readings.widths[name] = { targetPane, reached, face: f };
        if (f === null) { check(`A-${name}`, 'the preview is up', false, 'no .md-content'); continue; }
        const under = f.cols.filter((c) => c.fraction < 100).length;
        note(`A1-${name}`, 'what it drew', `pane ${String(f.pane.clientWidth)} · prose ${String(f.content.width)} · table box ${String(f.wrap.clientWidth)} · table ${String(f.table.width)} (min ${String(f.table.minContent)}) · fence box ${String(f.pre.clientWidth)} · ${String(under)} cut · dead canvas ${String(f.deadCanvasPct)}%`);
        note(`A1b-${name}`, 'columns', f.cols.map((c) => `${c.text}:${String(c.fraction)}%`).join(' | '));
        check(`A2-${name}`, 'THE DOCUMENT NEVER SCROLLS SIDEWAYS', f.docScrollsSideways === false, `scrollWidth ${String(f.pane.scrollWidth)} vs clientWidth ${String(f.pane.clientWidth)}`);
        const mBad = gradeMeasure({ paneWidth: f.pane.clientWidth, contentWidth: f.content.width }, MEASURE);
        check(`A3-${name}`, 'THE PROSE MEASURE DID NOT MOVE', mBad.length === 0, mBad.length === 0 ? `${String(f.content.width)} px` : mBad.join('; '));
        const r = {
          paneWidth: f.pane.clientWidth,
          contentWidth: f.content.width,
          wrapClientWidth: f.wrap.clientWidth,
          tableWidth: f.table.width,
          tableMinContent: f.table.minContent,
          columnsUnder100: under,
          docScrollsSideways: f.docScrollsSideways,
          preClientWidth: f.pre === null ? null : f.pre.clientWidth
        };
        readings.widths[name].grade = r;
        const bad = gradeRepair(r, MEASURE);
        const roomy = f.wrap.clientWidth >= f.table.minContent - 1;
        check(`A4-${name}`, 'THE BLOCK TOOK THE PANE, and the columns follow wherever the box can hold them', bad.length === 0, bad.length === 0 ? `box ${String(f.wrap.clientWidth)} px, fence ${String(f.pre.clientWidth)} px, ${roomy ? `${String(f.cols.length)} of ${String(f.cols.length)} columns whole` : `${String(f.cols.length - under)} of ${String(f.cols.length)} columns whole in a pane too narrow for ${String(f.table.minContent)} px of table`}` : bad.join('; '));
        check(`A5-${name}`, 'the fence and the table are ONE width, so 136ch resolved in the prose font', f.pre !== null && Math.abs(f.pre.clientWidth - f.wrap.clientWidth) <= 3, `fence ${String(f.pre === null ? 'none' : f.pre.clientWidth)} vs table ${String(f.wrap.clientWidth)} · --md-wide on pre ${String(f.pre === null ? '' : f.pre.mdWide)}`);
      }

      // ---- the cap, swept rather than argued ------------------------------
      {
        const sweep = [];
        for (let target = 1040; target <= 1240; target += 20) {
          await paneTo(target);
          await sleep(250);
          const got = await cdpEval(cdp, `(() => { const s = document.querySelector('.md-scroll'); const b = document.querySelector('.md-table-scroll'); return s === null || b === null ? null : { pane: s.clientWidth, box: b.clientWidth }; })()`, 20000);
          if (got !== null) sweep.push(got);
        }
        readings.sweep = sweep;
        const ordered = [...sweep].sort((a, b) => a.pane - b.pane);
        const top = ordered.length === 0 ? 0 : Math.max(...ordered.map((r) => r.box));
        const first = ordered.find((r) => r.box >= top) ?? null;
        note('B1', 'the sweep', ordered.map((r) => `${String(r.pane)}:${String(r.box)}`).join(' '));
        check('B2', 'the box STOPS at the cap rather than growing without bound', Math.abs(top - CAP) <= 2 && ordered.filter((r) => r.box >= top).length >= 3, `plateau ${String(top)} px against a cap of ${String(CAP)} px, first reached at a pane of ${first === null ? 'none' : String(first.pane)} px`);
      }

      // ---- the ablations ---------------------------------------------------
      await paneTo(1000);
      await sleep(300);
      {
        const css = `.md-content .md-table-scroll, .md-content pre { width: auto; margin-inline: 0; }`;
        const f = await withStyle(cdp, 'p248w-parent', css, () => cdpEval(cdp, FACE, 30000));
        readings.ablations.parent = f;
        const under = f === null ? 0 : f.cols.filter((c) => c.fraction < 100).length;
        const bad = f === null ? ['no face'] : gradeDefect({ paneWidth: f.pane.clientWidth, contentWidth: f.content.width, wrapClientWidth: f.wrap.clientWidth, columnsUnder100: under });
        check('C1', "THE PARENT'S RULE PUT BACK brings the defect back, so this reading can fail", bad.length === 0, bad.length === 0 ? `box ${String(f.wrap.clientWidth)} px inside a ${String(f.content.width)} px column, ${String(under)} of 5 columns cut` : bad.join('; '));
      }
      {
        // `container-type` is the one clause that makes 100cqi mean the pane.
        // Without it there is no container, cqi falls back to the viewport,
        // and the block is drawn at the WINDOW's width in a 620px pane.
        await paneTo(620);
        await sleep(300);
        const css = `.md-scroll { container-type: normal; }`;
        const f = await withStyle(cdp, 'p248w-nocontainer', css, () => cdpEval(cdp, FACE, 30000));
        readings.ablations.noContainer = f;
        check('C2', 'container-type is LOAD-BEARING: without it the document scrolls sideways', f !== null && f.docScrollsSideways === true, f === null ? 'no face' : `box ${String(f.wrap.clientWidth)} px in a ${String(f.pane.clientWidth)} px pane, scrollWidth ${String(f.pane.scrollWidth)}`);
        const back = await cdpEval(cdp, FACE, 30000);
        check('C3', 'and it comes back the moment the ablation is removed', back !== null && back.docScrollsSideways === false, back === null ? 'no face' : `scrollWidth ${String(back.pane.scrollWidth)} vs ${String(back.pane.clientWidth)}`);
      }

      // ---- the affordance, as arithmetic -----------------------------------
      await paneTo(1000);
      await sleep(300);
      const readAffordance = async (label) => {
        const f = await cdpEval(cdp, FACE, 30000);
        if (f === null) { check(`D-${label}`, 'a face to read the tokens off', false, 'none'); return; }
        const lifted = ratio(f.tokens.textMuted, f.tokens.bgCanvas);
        const shared = ratio(f.tokens.borderStrong, f.tokens.bgCanvas);
        const hover = ratio(f.tokens.textSecondary, f.tokens.bgCanvas);
        readings[`affordance-${label}`] = { ...f.tokens, lifted, shared, hover };
        note(`D0-${label}`, 'what the shared thumb was drawn at', `${f.tokens.borderStrong} on ${f.tokens.bgCanvas} = ${String(shared)}:1`);
        check(`D1-${label}`, 'the table box’s thumb clears WCAG 1.4.11’s 3:1 on the canvas', lifted >= 3, `${f.tokens.textMuted} on ${f.tokens.bgCanvas} = ${String(lifted)}:1`);
        check(`D2-${label}`, 'and hover LIFTS rather than dropping', hover >= lifted, `${f.tokens.textSecondary} = ${String(hover)}:1 against ${String(lifted)}:1`);
      };
      await readAffordance('dark');

      // ---- the neighbouring modes ------------------------------------------
      {
        await cdpEval(cdp, clickMode('Split'));
        await sleep(1500);
        const f = await cdpEval(cdp, FACE, 30000);
        readings.modes.split = f;
        check('E1', 'Split still renders and its preview does not scroll the document sideways', f !== null && f.docScrollsSideways === false, f === null ? 'no .md-content in Split' : `pane ${String(f.pane.clientWidth)} · box ${String(f.wrap.clientWidth)} · prose ${String(f.content.width)}`);
        await cdpEval(cdp, clickMode('Source'));
        await sleep(1200);
        const src = await cdpEval(cdp, `(() => document.querySelectorAll('.monaco-editor').length > 0 || document.querySelector('.md-content') === null)()`, 20000);
        check('E2', 'Source still renders', src === true, `monaco present or the preview gone: ${String(src)}`);
        await cdpEval(cdp, clickMode('Preview'));
        await sleep(1500);
        await until(cdp, `document.querySelector('.md-table-scroll table') !== null`, 30000);
        const back = await cdpEval(cdp, FACE, 30000);
        readings.modes.back = back;
        check('E3', 'and Preview comes back to the same reading', back !== null && Math.abs(back.content.width - MEASURE) <= 1 && back.docScrollsSideways === false, back === null ? 'none' : `prose ${String(back.content.width)} · box ${String(back.wrap.clientWidth)}`);
        // THE RULER IS THE ONE THING `container-type` COULD HAVE DISTURBED,
        // because inline-size containment is new on `.md-scroll` and the ruler
        // measures against `.md-content` inside it. It is off by default in a
        // scratch profile, so this arm turns it on rather than reporting that
        // it was not there.
        await drive(cdp, { minimap: true });
        await sleep(1200);
        const withRuler = await cdpEval(cdp, FACE, 30000);
        readings.modes.ruler = withRuler;
        check('E4', 'the heading ruler still measures under inline-size containment', withRuler !== null && withRuler.ruler !== null && withRuler.ruler.ticks >= 4 && withRuler.ruler.thumbHeight > 0, withRuler === null || withRuler.ruler === null ? 'the ruler did not mount' : `${String(withRuler.ruler.ticks)} ticks, thumb ${String(withRuler.ruler.thumbHeight)} px, box ${String(withRuler.wrap.clientWidth)} px, sideways ${String(withRuler.docScrollsSideways)}`);
        check('E5', 'and the block still fits the pane with the ruler taking its 13 px', withRuler !== null && withRuler.docScrollsSideways === false, withRuler === null ? 'none' : `pane ${String(withRuler.pane.clientWidth)} · box ${String(withRuler.wrap.clientWidth)}`);
        await drive(cdp, { minimap: false });
        await sleep(800);
      }

      // ---- paper -----------------------------------------------------------
      {
        await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: 'light' }).then(() => true)`, 30000);
        await sleep(1200);
        await paneTo(1000);
        await sleep(400);
        const f = await cdpEval(cdp, FACE, 30000);
        readings.light.his = f;
        if (f === null) check('F1', 'the preview is up on paper', false, 'no .md-content');
        else {
          const under = f.cols.filter((c) => c.fraction < 100).length;
          const bad = gradeRepair({ paneWidth: f.pane.clientWidth, contentWidth: f.content.width, wrapClientWidth: f.wrap.clientWidth, tableWidth: f.table.width, tableMinContent: f.table.minContent, columnsUnder100: under, docScrollsSideways: f.docScrollsSideways, preClientWidth: f.pre === null ? null : f.pre.clientWidth }, MEASURE);
          check('F1', 'the same repair on PAPER', bad.length === 0, bad.length === 0 ? `scheme ${String(f.scheme)} · box ${String(f.wrap.clientWidth)} px · prose ${String(f.content.width)} px · 5 of 5 columns whole` : bad.join('; '));
        }
        await readAffordance('light');
        await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: 'dark' }).then(() => true)`, 30000);
        await sleep(800);
      }
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

const opAfter = operatorCount();
check('X1', 'operator sessions on -L gmux unmoved', opBefore === opAfter, `${String(opBefore)} -> ${String(opAfter)}`);
say('');
say(`${String(rows.filter((r) => r.pass === true).length)} passed, ${String(failures.length)} failed, ${String(rows.filter((r) => r.pass === null).length)} notes`);
say(`readings at ${readingsFile}`);
if (failures.length > 0) { for (const f of failures) say(`FAILURE: ${f}`); process.exit(1); }
process.exit(0);
