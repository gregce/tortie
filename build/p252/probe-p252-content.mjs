#!/usr/bin/env node
/**
 * probe-p252-content.mjs — PHASE 252's app run: the box fits its content.
 *
 * The operator sent five screenshots on 2026-09-10. Three were the defect —
 * a code fence holding an ASCII flow diagram, a runstory transcript and an
 * ASCII architecture diagram, each drawn as a box spanning the whole pane
 * with most of the box empty inside its own border — and two were tables
 * whose content fills the box they were given, which he called good. His
 * sentence is the spec: "make this more dynamic, so it only expands when it
 * needs to based on the content."
 *
 * This run reproduces the five shapes as fixtures, plus a fence UNDER the
 * prose measure and a fence OVER the cap so all three width classes are
 * read, and drives them at three panes on both bases and on the zoom ladder
 * above and below 1:
 *
 *   A. THE BOX FITS ITS CONTENT: under the measure it draws at exactly the
 *      column, between the measure and the cap at ITS OWN width (±2px), over
 *      the cap at the cap with the scroller live. The document never scrolls
 *      sideways.
 *   B. THE CENTRING: every box sits on the prose column's axis (±1px) at
 *      every pane, on both bases, and at zoom stops above AND below 1 —
 *      `left: 50%` + `translate: -50%`, because the parent's negative margin
 *      assumed the used width IS the cap expression.
 *   C. THE PARENT'S RULE PUT BACK (the Phase 248 declarations injected as a
 *      measurement-only stylesheet, removed in a `finally`): the three bad
 *      shapes read AT the cap — the defect — and the two good tables are
 *      unmoved byte for byte, which is what the operator's two good
 *      screenshots ask.
 *   D. THE SCROLL CONTAINER SURVIVES THE TRANSLATE: scrollLeft 0 shows
 *      column one, the scroller is live on an over-cap block, hit-testing
 *      and caret placement land inside the drawn box.
 *   E. THE CANDIDATE THAT LOST, measured rather than dismissed: an outer
 *      grid centres too, but grid items stop sibling margins collapsing and
 *      the document grows taller; the numbers are recorded as notes and in
 *      the readings file for the stylesheet comment to cite.
 *   F. THE CENTRING ABLATED (`translate: none` injected): a box walks off
 *      the axis, so arm B is seen able to fail.
 *
 * The readings are written to build/p252/out-content-readings.json, which
 * `conformance:wideblocks` rules 14 and 15 judge on every commit that
 * touches the stylesheet.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it
 * started in a `finally`. A scratch profile, a scratch HOME and this
 * script's own tmux socket, ended and unlinked by build/harness-socket.mjs;
 * `gmux` and `default` are refused by name and the operator's own -L gmux
 * sessions are counted before and after. No agent, no token, no keychain,
 * no request, no ssh, no machine, no session created, and nothing written
 * outside GMUX_HARNESS_DIR except the readings and the log under
 * build/p252/.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p252]';
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
// The graders. Pure, exported, proved on fixtures under --self-test.
// ---------------------------------------------------------------------------

/** The clamp the stylesheet promises: content between the column and the cap. */
export function clampWidth(maxContent, mdWidePx, inner) {
  return Math.max(Math.min(maxContent, mdWidePx), inner);
}

/** Which width class a block falls in, for THIS reading's bounds. */
export function classify(b, rd) {
  if (b.maxContent <= rd.inner + 2) return 'under';
  if (b.maxContent < rd.mdWidePx - 4) return 'between';
  return 'over';
}

/**
 * One reading of the live face. Width tolerance ±2px (clientWidth is an
 * integer against a fractional intrinsic), centring tolerance ±1px (half of
 * it subpixel translate rounding).
 */
export function gradeReading(rd) {
  const bad = [];
  if (rd === null) return ['no reading'];
  if (rd.docScrollsSideways) bad.push(`the document scrolls sideways: scrollWidth ${String(rd.pane.scrollWidth)} vs clientWidth ${String(rd.pane.clientWidth)}`);
  for (const b of rd.blocks) {
    const want = clampWidth(b.maxContent, rd.mdWidePx, rd.inner);
    const cls = classify(b, rd);
    if (Math.abs(b.client - want) > 2) {
      bad.push(`${b.id} drew ${String(b.client)}px against a clamp of ${want.toFixed(1)}px (${cls}: content ${String(b.maxContent)}, cap ${String(rd.mdWidePx)}, column ${String(rd.inner)})`);
      continue;
    }
    if (cls === 'between' && b.client > rd.mdWidePx - 4) {
      bad.push(`${b.id} is at the cap (${String(b.client)}px) while its content asks ${String(b.maxContent)}px — the operator's screenshot`);
    }
    // A FENCE over the cap must scroll — its content cannot wrap. A TABLE
    // whose min-content fits inside the cap compresses its cells instead,
    // which is exactly the operator's good shape, so it is not asked.
    if (cls === 'over' && b.kind === 'pre' && b.maxContent > rd.mdWidePx + 2 && b.canScroll !== true) {
      bad.push(`${b.id} is at the cap and its scroller is dead`);
    }
    if (Math.abs(b.centreOff) > 1) bad.push(`${b.id} sits ${String(b.centreOff)}px off the prose column's axis`);
    if (b.overLeft > 0.5 || b.overRight > 0.5) bad.push(`${b.id} is ${String(b.overLeft)}px past the left pane edge and ${String(b.overRight)}px past the right`);
  }
  return bad;
}

/**
 * The parent's rule, injected: the defect must come BACK — every between
 * block at the cap — and every over block must be UNMOVED byte for byte.
 */
export function gradeParentArm(parentRd, liveRd) {
  const bad = [];
  if (parentRd === null || liveRd === null) return ['no reading'];
  let between = 0;
  let atCap = 0;
  for (const b of parentRd.blocks) {
    const live = liveRd.blocks.find((x) => x.id === b.id) ?? null;
    if (live === null) { bad.push(`${b.id} has no live twin`); continue; }
    const cls = classify(b, parentRd);
    if (cls === 'between') {
      between += 1;
      if (Math.abs(b.client - Math.max(parentRd.mdWidePx, parentRd.inner)) <= 2) atCap += 1;
      else bad.push(`under the parent's rule ${b.id} drew ${String(b.client)}px, not the cap's ${String(parentRd.mdWidePx)}px — the defect did not come back`);
    }
    if (cls === 'over' && b.client !== live.client) {
      bad.push(`${b.id} MOVED: ${String(b.client)}px under the parent's rule against ${String(live.client)}px live — the good tables must be unmoved byte for byte`);
    }
  }
  // A pane so narrow that no block is in the between class has nothing to
  // prove here; the gate requires the defect readable at SOME pane.
  if (between > 0 && atCap === 0) bad.push('no between-class box read at the cap under the parent\'s rule, so the defect reading proves nothing');
  return bad;
}

/** The centring taken off must move a box well off the axis. */
export function gradeCentreAblated(rd) {
  if (rd === null) return ['no reading'];
  return (rd.blocks ?? []).some((b) => Math.abs(b.centreOff) > 8) ? [] : ['no box moved off the axis, so the centring readings prove nothing'];
}

if (process.argv.includes('--self-test')) {
  const RD = {
    pane: { clientWidth: 1349, offsetWidth: 1359, scrollWidth: 1349 },
    inner: 508.8, mdWidePx: 1113.63, docScrollsSideways: false,
    blocks: [
      { id: 'flow', kind: 'pre', client: 594, maxContent: 593.7, centreOff: 0.1, canScroll: false, overLeft: 0, overRight: 0 },
      { id: 'short', kind: 'pre', client: 509, maxContent: 246.4, centreOff: 0, canScroll: false, overLeft: 0, overRight: 0 },
      { id: 'overcap', kind: 'pre', client: 1113, maxContent: 1290.2, centreOff: -0.2, canScroll: true, overLeft: 0, overRight: 0 },
      { id: 'tableA', kind: 'table', client: 1113, maxContent: 1400.9, centreOff: 0.3, canScroll: true, overLeft: 0, overRight: 0 }
    ]
  };
  const PARENT = {
    ...RD,
    blocks: RD.blocks.map((b) => ({ ...b, client: 1113, canScroll: b.maxContent > 1113 }))
  };
  const cases = [
    ['a behaving reading', () => gradeReading(RD), 0],
    ['a between box at the cap — the defect', () => gradeReading({ ...RD, blocks: [{ ...RD.blocks[0], client: 1113, canScroll: false }] }), 1],
    ['a box off the clamp entirely', () => gradeReading({ ...RD, blocks: [{ ...RD.blocks[0], client: 700 }] }), 1],
    ['an under box not filling the column', () => gradeReading({ ...RD, blocks: [{ ...RD.blocks[1], client: 247 }] }), 1],
    ['an over box with a dead scroller', () => gradeReading({ ...RD, blocks: [{ ...RD.blocks[2], canScroll: false }] }), 1],
    ['a box off the axis', () => gradeReading({ ...RD, blocks: [{ ...RD.blocks[0], centreOff: 4.2 }] }), 1],
    ['a box past the pane edge', () => gradeReading({ ...RD, blocks: [{ ...RD.blocks[2], overRight: 11 }] }), 1],
    ['the document scrolling sideways', () => gradeReading({ ...RD, docScrollsSideways: true }), 1],
    ['the parent arm: defect back, good tables unmoved', () => gradeParentArm(PARENT, { ...RD, blocks: RD.blocks.map((b) => (classify(b, RD) === 'over' ? { ...b, client: 1113 } : b)) }), 0],
    ['the parent arm with the defect NOT back', () => gradeParentArm({ ...PARENT, blocks: PARENT.blocks.map((b) => (b.id === 'flow' ? { ...b, client: 594 } : b)) }, RD), 2],
    ['the parent arm with a good table that moved', () => gradeParentArm(PARENT, { ...RD, blocks: RD.blocks.map((b) => (b.id === 'tableA' ? { ...b, client: 900 } : classify(b, RD) === 'over' ? { ...b, client: 1113 } : b)) }), 1],
    ['the centring ablated, off the axis', () => gradeCentreAblated({ blocks: [{ id: 'flow', centreOff: 254.4 }] }), 0],
    ['the centring ablated but nothing moved', () => gradeCentreAblated({ blocks: [{ id: 'flow', centreOff: 0.2 }] }), 1],
    ['the clamp arithmetic, all four regimes', () => (clampWidth(246, 1113, 508.8) === 508.8 && clampWidth(594, 1113, 508.8) === 594 && clampWidth(1290, 1113, 508.8) === 1113 && clampWidth(300, 271, 281) === 281 ? [] : ['moved']), 0],
    ['classify at the bounds', () => (classify({ maxContent: 508 }, { inner: 508.8, mdWidePx: 1113 }) === 'under' && classify({ maxContent: 594 }, { inner: 508.8, mdWidePx: 1113 }) === 'between' && classify({ maxContent: 1290 }, { inner: 508.8, mdWidePx: 1113 }) === 'over' ? [] : ['moved']), 0]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    const got = run().length;
    const ok = got === want;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: ${name} -> ${String(got)} finding(s), wanted ${String(want)}`);
  }
  say(`${String(cases.length - bad)} of ${String(cases.length)} grader fixtures behaved`);
  process.exit(bad === 0 ? 0 : 1);
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p252-${String(process.pid)}`, `node ${process.argv[1]}`],
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

mkdirSync(join(harnessDir, 'p252'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p252'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(REPO, 'build', 'p252', 'out-content-readings.json');
for (const d of [home, profile, project]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

// ---------------------------------------------------------------------------
// The fixture: the operator's five shapes, plus the two the classes need.
// Document order IS the id order below.
// ---------------------------------------------------------------------------

const IDS = ['flow', 'runstory', 'arch', 'tableA', 'tableB', 'short', 'overcap'];

const DOC = `# The five screenshots

The three fences below are the operator's bad shapes of 2026-09-10 — content
far narrower than the cap, drawn in a box that took the cap anyway — and the
two tables are his good ones, content that fills the box it was given.

## The ASCII flow diagram (bad shape 1)

\`\`\`text
+--------------+     +----------------+     +-----------------+     +--------+
| agent turn   | --> | markdown file  | --> | tortie preview  | --> | reader |
|              |     |                |     |                 |     |        |
+--------------+     +----------------+     +-----------------+     +--------+
        |                     |                      |
        v                     v                      v
   .specstory           the worktree           the wide box
\`\`\`

## The runstory transcript (bad shape 2)

\`\`\`text
$ runstory show latest
  14:32:07  session 0192a  claude   "rewrite the appendix in the operator's voice"   done 41s
  14:33:12  session 0192a  claude   "now tighten the second paragraph, keep the numbers"  done 12s
  14:35:40  session 0192b  codex    "sweep the fixtures directory for stale readings"     done 88s
\`\`\`

## The ASCII architecture diagram (bad shape 3)

\`\`\`text
+---------------------+      +--------------------------+      +---------------------------------+
|  renderer (React)   | ---> |  preload bridge (typed)  | ---> |  main (manifest, tmux, capture) |
+---------------------+      +--------------------------+      +---------------------------------+
           |                              |                                    |
           v                              v                                    v
      markdown.css                 shared/ipc/index                 the private tmux server
\`\`\`

## The first good table

| Surface | What it promises | What Phase 248 measured | What Phase 252 changes | Gate |
| --- | --- | --- | --- | --- |
| \`.md-table-scroll\` | wide tables scroll in their own box, the document never does | 509px at a 620, 1000 and 1381px pane alike | the box takes what the content needs, capped | \`conformance:wideblocks\` |
| \`pre\` | a fence never re-wraps, its longest line is the measure | 74.5% of fences held a line too long for the old box | the box fits the longest line between the bounds | \`conformance:wideblocks\` |

## The second good table

| Component | Language / runtime | Entry point | Documented before? | Ships via | Owner of the release gate |
| --- | --- | --- | --- | --- | --- |
| \`stoa-web/\` | Next.js 16, React 19 | \`app/layout.tsx\` | yes | Vercel, automatic on every branch push to the preview environment | the branch protection rule and the deploy check |
| \`stoa-cli/\` | Go 1.26.8 + Rust (cgo) | \`cmd/stoa/main.go\` | yes | GitHub Releases, gated on a \`[release]\` marker in the subject | the release workflow and its signing step |

## A fence under the measure

\`\`\`sh
npm run conformance:wideblocks
\`\`\`

## A fence over the cap

\`\`\`ts
const wayOverTheCap = aVeryLongCall(withAnArgument, andASecondArgument, andAThirdArgument, andAFourthArgument, andAFifthArgument, andASixthArgument, andASeventhArgument);
\`\`\`

A closing paragraph, so the last block has prose on both sides and the
column's own axis is readable in the same frame.
`;
writeFileSync(join(project, 'FIVE-SHAPES.md'), DOC);

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p252@example.invalid');
git('config', 'user.name', 'p252');
git('add', '-A');
git('commit', '-q', '-m', 'the five shapes');

// ---------------------------------------------------------------------------
// The reader, one function for every arm.
// ---------------------------------------------------------------------------

const BLOCKS252 = `(() => {
  const round = (n) => Math.round(n * 100) / 100;
  const scroll = document.querySelector('.md-scroll');
  const content = document.querySelector('.md-content');
  if (scroll === null || content === null) return null;
  const cs = getComputedStyle(content);
  const cr = content.getBoundingClientRect();
  const contentCentre = (cr.left + cr.right) / 2;
  const sr = scroll.getBoundingClientRect();
  const innerLeft = sr.left;
  const innerRight = sr.left + scroll.clientWidth;
  const els = Array.from(document.querySelectorAll('.md-content > .md-table-scroll, .md-content > pre'));
  const ids = ${JSON.stringify(IDS)};
  const intrinsic = (el) => {
    const was = el.style.cssText;
    el.style.width = 'max-content';
    el.style.minWidth = '0';
    el.style.maxWidth = 'none';
    const w = el.getBoundingClientRect().width;
    el.style.cssText = was;
    return round(w);
  };
  const blocks = els.map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      id: ids[i] ?? ('block' + String(i)),
      kind: el.classList.contains('md-table-scroll') ? 'table' : 'pre',
      // The rect width (border-box, fractional) rather than clientWidth: a
      // fence carries 1px borders that clientWidth subtracts, and the clamp
      // resolves the border-box.
      client: round(r.width),
      maxContent: intrinsic(el),
      left: round(r.left),
      right: round(r.right),
      centreOff: round((r.left + r.right) / 2 - contentCentre),
      canScroll: el.scrollWidth > el.clientWidth,
      overLeft: round(Math.max(0, innerLeft - r.left)),
      overRight: round(Math.max(0, r.right - innerRight))
    };
  });
  return {
    pane: { clientWidth: scroll.clientWidth, offsetWidth: scroll.offsetWidth, scrollWidth: scroll.scrollWidth },
    inner: round(content.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
    mdWidePx: round(parseFloat(cs.getPropertyValue('--md-wide'))),
    zoom: getComputedStyle(document.documentElement).getPropertyValue('--zoom-editor').trim(),
    scheme: document.documentElement.getAttribute('data-scheme'),
    contentCentre: round(contentCentre),
    contentWidth: round(cr.width),
    docHeight: scroll.scrollHeight,
    docScrollsSideways: scroll.scrollWidth > scroll.clientWidth,
    blocks
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

/** The Phase 248 declarations, exactly as they shipped, the new ones lifted. */
const PARENT_RULE = `.md-content > .md-table-scroll, .md-content > pre {
  width: max(100%, var(--md-wide));
  min-width: 0;
  max-width: none;
  margin-inline: calc((100% - max(100%, var(--md-wide))) / 2);
  position: static;
  left: auto;
  translate: none;
}`;

const readings = { panes: {}, parent: {}, zoom: {}, light: {}, centreAblated: null, candidates: {} };

await withElectron(
  {
    label: 'p252',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 20 * 60 * 1000
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
      await drive(cdp, { projectPath: project, openRel: 'FIVE-SHAPES.md', mode: 'file' });
      await until(cdp, `document.querySelector('.md-content') !== null`, 30000);
      await cdpEval(cdp, clickMode('Preview'));
      await sleep(1200);
      await until(cdp, `document.querySelectorAll('.md-content > .md-table-scroll, .md-content > pre').length >= ${String(IDS.length)}`, 30000);

      const PANES = (process.env['P252_PANES'] ?? 'wide:1349,mid:699,narrow:319')
        .split(',')
        .map((one) => one.split(':'))
        .map(([n, w]) => [n, Number(w)]);

      // ---- A/B: the clamp and the centring, at the three panes -------------
      for (const [name, target] of PANES) {
        const reached = await paneTo(target);
        await sleep(400);
        const rd = await cdpEval(cdp, BLOCKS252, 30000);
        readings.panes[name] = rd;
        if (rd === null) { check(`A-${name}`, 'a reading at this pane', false, 'no .md-content'); continue; }
        note(`A0-${name}`, `pane ${String(target)} reached ${String(reached)}`, rd.blocks.map((b) => `${b.id}:${String(b.client)}/${String(b.maxContent)}${b.canScroll ? ' scroll' : ''}`).join(' | ') + ` · cap ${String(rd.mdWidePx)} · column ${String(rd.inner)}`);
        check(`A1-${name}`, 'the pane is within 6px of the charter’s width', Math.abs(reached - target) <= 6, `${String(reached)} vs ${String(target)}`);
        const bad = gradeReading(rd);
        const classes = rd.blocks.map((b) => classify(b, rd));
        check(`A2-${name}`, 'EVERY BOX FITS ITS CONTENT between the column and the cap, centred on the axis, inside the pane', bad.length === 0, bad.length === 0 ? `classes ${classes.join(',')}` : bad.join('; '));
      }

      // ---- C: the parent's rule put back, per pane -------------------------
      for (const [name, target] of PANES) {
        await paneTo(target);
        await sleep(300);
        const rd = await withStyle(cdp, 'p252-parent', PARENT_RULE, () => cdpEval(cdp, BLOCKS252, 30000));
        readings.parent[name] = rd;
        const bad = gradeParentArm(rd, readings.panes[name] ?? null);
        const between = rd === null ? [] : rd.blocks.filter((b) => classify(b, rd) === 'between');
        check(`C1-${name}`, "THE PARENT'S RULE PUT BACK draws the bad shapes at the cap and leaves the good tables byte for byte", bad.length === 0, bad.length === 0 ? `${String(between.length)} between-class box(es) at ${between.map((b) => String(b.client)).join(',')}px against content ${between.map((b) => String(b.maxContent)).join(',')}px` : bad.join('; '));
      }

      // ---- D: the scroll container survives the translate ------------------
      {
        await paneTo(1349);
        await sleep(300);
        const d = await cdpEval(cdp, `(() => {
          const els = Array.from(document.querySelectorAll('.md-content > .md-table-scroll, .md-content > pre'));
          const overcap = els[6];
          if (!overcap) return null;
          // The fence is the last block in the document; bring it into the
          // viewport before any point-based question is asked of it.
          overcap.scrollIntoView({ block: 'center' });
          const r = overcap.getBoundingClientRect();
          const code = overcap.querySelector('code');
          overcap.scrollLeft = 0;
          const atZero = code === null ? null : Math.round((code.getBoundingClientRect().left - r.left) * 10) / 10;
          const maxScroll = overcap.scrollWidth - overcap.clientWidth;
          overcap.scrollLeft = 200;
          const scrolled = overcap.scrollLeft;
          overcap.scrollLeft = 0;
          const cx = Math.round((r.left + r.right) / 2);
          const cy = Math.round(r.top + Math.min(r.height / 2, 20));
          const hit = document.elementFromPoint(cx, cy);
          const hitInside = hit !== null && (hit === overcap || overcap.contains(hit));
          const caret = document.caretRangeFromPoint ? document.caretRangeFromPoint(cx, cy) : null;
          const caretInside = caret !== null && overcap.contains(caret.startContainer);
          const back = document.querySelector('.md-scroll');
          if (back !== null) back.scrollTop = 0;
          return { atZero, scrolled, maxScroll, hitInside, caretInside, canScroll: overcap.scrollWidth > overcap.clientWidth, padding: parseFloat(getComputedStyle(overcap).paddingLeft) };
        })()`, 30000);
        readings.interactions = d;
        check('D1', 'the over-cap fence still scrolls in its own box, clamped at its own content', d !== null && d.canScroll === true && d.scrolled > 0 && Math.abs(d.scrolled - Math.min(200, d.maxScroll)) <= 1, d === null ? 'no reading' : `scrollLeft set to 200 read back ${String(d.scrolled)} against a maximum of ${String(d.maxScroll)}`);
        check('D2', 'scrollLeft 0 shows column one', d !== null && d.atZero !== null && Math.abs(d.atZero - d.padding) <= 2, d === null ? 'no reading' : `first glyph ${String(d.atZero)}px from the box edge against ${String(d.padding)}px of padding`);
        check('D3', 'hit-testing and caret placement land inside the drawn box', d !== null && d.hitInside === true && d.caretInside === true, d === null ? 'no reading' : `elementFromPoint inside: ${String(d.hitInside)}, caretRangeFromPoint inside: ${String(d.caretInside)}`);
      }

      // ---- F: the centring ablated, so arm B can fail ----------------------
      {
        const rd = await withStyle(cdp, 'p252-centre-off', `.md-content > .md-table-scroll, .md-content > pre { translate: none; }`, () => cdpEval(cdp, BLOCKS252, 30000));
        readings.centreAblated = rd;
        const bad = gradeCentreAblated(rd);
        check('F1', 'THE TRANSLATE TAKEN OFF walks a box off the axis, so the centring readings can fail', bad.length === 0, bad.length === 0 ? `worst offset ${String(Math.round(Math.max(...rd.blocks.map((b) => Math.abs(b.centreOff)))))}px` : bad.join('; '));
        const back = await cdpEval(cdp, BLOCKS252, 30000);
        check('F2', 'and it comes back the moment the ablation is removed', back !== null && gradeReading(back).length === 0, back === null ? 'no reading' : `worst offset ${String(Math.max(...back.blocks.map((b) => Math.abs(b.centreOff))))}px`);
      }

      // ---- E: the candidate that lost, measured ----------------------------
      {
        const base = await cdpEval(cdp, BLOCKS252, 30000);
        const rd = await withStyle(cdp, 'p252-grid', `.md-content { display: grid; grid-template-columns: 100%; }
.md-content > .md-table-scroll, .md-content > pre { justify-self: center; position: static; left: auto; translate: none; }`, () => cdpEval(cdp, BLOCKS252, 30000));
        readings.candidates = {
          shipping: base === null ? null : { docHeight: base.docHeight, worstCentreOff: Math.max(...base.blocks.map((b) => Math.abs(b.centreOff))), docScrollsSideways: base.docScrollsSideways },
          grid: rd === null ? null : { docHeight: rd.docHeight, worstCentreOff: Math.max(...rd.blocks.map((b) => Math.abs(b.centreOff))), docScrollsSideways: rd.docScrollsSideways }
        };
        note('E1', 'the grid candidate, measured', rd === null || base === null ? 'no reading' : `document ${String(rd.docHeight)}px tall against ${String(base.docHeight)}px shipping (margins stop collapsing), worst centre offset ${String(Math.max(...rd.blocks.map((b) => Math.abs(b.centreOff))))}px, sideways ${String(rd.docScrollsSideways)}`);
      }

      // ---- B-zoom: the ladder above and below 1 ----------------------------
      {
        const zoomNow = () =>
          cdpEval(cdp, `(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--zoom-editor').trim(); return v === '' ? 1 : Number(v); })()`, 10000);
        const press = (code, key) =>
          cdpEval(cdp, `(() => { const el = document.querySelector('.ed-panel'); if (el === null) return false; el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key)}, metaKey: true, bubbles: true, cancelable: true })); return true; })()`, 10000);
        const zoomTo = async (level) => {
          for (let i = 0; i < 14; i += 1) {
            const now = await zoomNow();
            if (typeof now === 'number' && Math.abs(now - level) < 1e-6) return now;
            const up = typeof now === 'number' && now < level;
            await press(up ? 'Equal' : 'Minus', up ? '=' : '-');
            await sleep(220);
          }
          return await zoomNow();
        };
        await paneTo(1349);
        await sleep(300);
        for (const z of (process.env['P252_ZOOMS'] ?? '0.75,1.25,1.5').split(',').map(Number)) {
          const landed = await zoomTo(z);
          await sleep(600);
          const rd = await cdpEval(cdp, BLOCKS252, 30000);
          readings.zoom[String(z)] = rd;
          if (rd === null) { check(`Z1-${String(z)}`, 'a reading at this zoom', false, 'none'); continue; }
          const bad = [];
          if (Math.abs(Number(landed) - z) > 1e-6) bad.push(`the chord landed at ${String(landed)}`);
          if (rd.docScrollsSideways) bad.push('the document scrolls sideways');
          for (const b of rd.blocks) {
            if (Math.abs(b.centreOff) > 1) bad.push(`${b.id} is ${String(b.centreOff)}px off the axis`);
            if (b.overLeft > 0.5 || b.overRight > 0.5) bad.push(`${b.id} is past a pane edge`);
          }
          check(`Z1-${String(z)}`, `AT ${String(Math.round(z * 100))}% every box is centred and inside the pane`, bad.length === 0, bad.length === 0 ? `widest box ${String(Math.max(...rd.blocks.map((b) => b.right - b.left))).slice(0, 7)}px in a ${String(rd.pane.clientWidth)}px pane` : bad.join('; '));
        }
        await press('Digit0', '0');
        await sleep(700);
        const back = await cdpEval(cdp, BLOCKS252, 30000);
        check('Z2', 'and ⌘0 puts the region back to 100%', back !== null && (back.zoom === '1' || back.zoom === '') && gradeReading(back).length === 0, back === null ? 'no reading' : `--zoom-editor "${back.zoom}"`);
      }

      // ---- B-light: paper ---------------------------------------------------
      {
        await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: 'light' }).then(() => true)`, 30000);
        await sleep(1200);
        await paneTo(1349);
        await sleep(400);
        const rd = await cdpEval(cdp, BLOCKS252, 30000);
        readings.light.wide = rd;
        const bad = gradeReading(rd);
        check('L1', 'the same clamp and centring on PAPER', rd !== null && bad.length === 0 && rd.scheme === 'light', rd === null ? 'no reading' : bad.length === 0 ? `scheme ${String(rd.scheme)}, classes ${rd.blocks.map((b) => classify(b, rd)).join(',')}` : bad.join('; '));
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
