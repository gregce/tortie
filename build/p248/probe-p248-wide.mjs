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
 * The used width the clamp promises (Phase 252): the content's own
 * max-content, floored at the column and capped at `--md-wide`. CSS resolves
 * min-width AFTER max-width, so the floor wins a conflict, which is what
 * `Math.max` outermost spells.
 */
export function clampWidth(maxContent, mdWidePx, inner) {
  return Math.max(Math.min(maxContent, mdWidePx), inner);
}

/**
 * The repair. THE CLAIM IS THE BOX AND NOT THE COLUMNS, because a pane
 * narrower than the table's own min-content cannot show every column however
 * the block is spelled: what the phase promises is that the block takes
 * WHAT ITS CONTENT NEEDS, floored at the prose column, capped at `--md-wide`
 * (Phase 252 — before it, the box took the cap unconditionally and the
 * emptiness sat inside its own border), and that the columns follow WHEREVER
 * THE BOX IS BIG ENOUGH FOR THEM. Grading the columns at a 580 px pane would
 * fail a reading that is behaving exactly as designed.
 */
export function gradeRepair(r, measurePx) {
  const bad = [];
  if (r.docScrollsSideways) bad.push('the document scrolls sideways');
  const want = clampWidth(r.wrapMaxContent, r.mdWidePx, r.contentInner);
  if (Math.abs(r.wrapClientWidth - want) > 2) {
    bad.push(`the table box is ${String(r.wrapClientWidth)} px against a clamp of ${want.toFixed(1)} px (content ${String(r.wrapMaxContent)}, cap ${String(r.mdWidePx)}, column ${String(r.contentInner)})`);
  }
  if (r.wrapClientWidth >= r.tableMinContent - 1 && r.columnsUnder100 > 0) {
    bad.push(`the box is wide enough for the table and ${String(r.columnsUnder100)} column(s) are still cut`);
  }
  if (Math.abs(r.contentWidth - measurePx) > 1) bad.push(`the prose column moved to ${String(r.contentWidth)} px`);
  if (r.preClientWidth !== null) {
    const wantPre = clampWidth(r.preMaxContent, r.mdWidePx, r.contentInner);
    if (Math.abs(r.preClientWidth - wantPre) > 2) {
      bad.push(`the fence box is ${String(r.preClientWidth)} px against a clamp of ${wantPre.toFixed(1)} px (content ${String(r.preMaxContent)})`);
    }
  }
  return bad;
}

/**
 * THE BLEED, read of EVERY wide block in the document rather than of the
 * first one. A block whose containing block is not `.md-content` itself —
 * one under a bullet, one inside a quote — is centred on THAT box, which is
 * inset from the prose column, so a full bleed computed from it walks off the
 * pane by half the inset per level. The reading is the block's own rect
 * against the scroller's content box, on BOTH edges, plus the scroller's own
 * scrollWidth, which is the promise itself.
 */
export function gradeBleed(r) {
  const bad = [];
  if (r === null) return ['no reading'];
  if (r.docScrollsSideways) bad.push(`the document scrolls sideways: scrollWidth ${String(r.pane.scrollWidth)} vs clientWidth ${String(r.pane.clientWidth)}`);
  for (const b of r.blocks) {
    if (b.overRight > 0.5 || b.overLeft > 0.5) {
      bad.push(`${b.kind} at depth ${String(b.depth)} is ${String(b.overLeft)} px past the left edge and ${String(b.overRight)} px past the right`);
    }
  }
  return bad;
}

/**
 * A TABLE NARROWER THAN ITS BOX. The break-out cannot ask how wide a table
 * wants to be, so a table that already fitted the measure is handed a box
 * three times its width; centred, it keeps the axis the prose column is on,
 * and left in the corner it hangs 302 px off to the left of every paragraph.
 */
export function gradeAxis(r) {
  const bad = [];
  if (r === null) return ['no reading'];
  let narrow = 0;
  for (const b of r.blocks) {
    if (b.kind !== 'table' || b.inner === null || b.depth !== 0) continue;
    if (b.inner.width >= b.width - 1) continue; // it fills its box: nothing to place
    narrow += 1;
    const boxCentre = (b.left + b.right) / 2;
    const tableCentre = (b.inner.left + b.inner.right) / 2;
    if (Math.abs(boxCentre - tableCentre) > 1) {
      bad.push(`a ${String(b.inner.width)} px table in a ${String(b.width)} px box is ${String(Math.round(boxCentre - tableCentre))} px off its box's axis`);
    }
  }
  if (narrow === 0) bad.push('no table in the document is narrower than the box it was given, so this arm read nothing');
  return bad;
}

/**
 * What a table left in the corner of its box looks like. Since Phase 252 the
 * box FITS its content, so the widest box a narrow table gets is the prose
 * column — the corner is the BOX's left edge, no longer 100px left of the
 * column the way the cap-wide box put it.
 */
export function gradeAxisIsBroken(r) {
  const bad = [];
  if (r === null) return ['no reading'];
  const off = r.blocks.filter((b) =>
    b.kind === 'table' && b.depth === 0 && b.inner !== null &&
    b.inner.width < b.width - 50 &&
    Math.abs(b.inner.left - b.left) < 2 &&
    (b.left + b.right) / 2 - (b.inner.left + b.inner.right) / 2 > 20);
  if (off.length === 0) bad.push('no narrow table hugs the left corner of a meaningfully wider box');
  return bad;
}

/** What a bleed computed from the WRONG box looks like, so the arm can fail. */
export function gradeBleedIsBroken(r) {
  const bad = [];
  if (r === null) return ['no reading'];
  const over = r.blocks.filter((b) => b.overRight > 0.5 || b.overLeft > 0.5);
  if (over.length === 0) bad.push('no block is past either pane edge');
  if (!r.docScrollsSideways) bad.push('the document does not scroll sideways');
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
  const BLEED_OK = { pane: { clientWidth: 1000, scrollWidth: 1000 }, docScrollsSideways: false, blocks: [{ kind: 'table', depth: 0, overLeft: 0, overRight: 0 }] };
  // The clamp's shape at his pane: the table asks 1041 px, the cap is 962,
  // the column 508.8 — the box takes 962. The fence asks 901 and takes 901.
  const REPAIRED = { paneWidth: 1000, contentWidth: 556.8, contentInner: 508.8, mdWidePx: 962, wrapClientWidth: 962, wrapMaxContent: 1041.1, tableWidth: 962, tableMinContent: 759.1, columnsUnder100: 0, docScrollsSideways: false, preClientWidth: 901, preMaxContent: 901.2 };
  const NARROW = { ...REPAIRED, paneWidth: 580, contentWidth: 556.8, contentInner: 508.8, mdWidePx: 542, wrapClientWidth: 542, tableWidth: 542, columnsUnder100: 2, preClientWidth: 542, preMaxContent: 901.2 };
  const cases = [
    ['the repair at his pane', () => gradeRepair(REPAIRED, M), 0],
    ['the prose column widened with it', () => gradeRepair({ ...REPAIRED, contentWidth: 952 }, M), 1],
    ['the document scrolls sideways', () => gradeRepair({ ...REPAIRED, docScrollsSideways: true }, M), 1],
    ['the table box never grew', () => gradeRepair({ ...REPAIRED, wrapClientWidth: 509, columnsUnder100: 2, preClientWidth: 507 }, M), 2],
    ['the box OUTGREW its content — the Phase 252 defect', () => gradeRepair({ ...REPAIRED, preClientWidth: 962 }, M), 1],
    ['a pane too narrow to hold the table, behaving', () => gradeRepair(NARROW, M), 0],
    ['a pane too narrow AND the block did not take it', () => gradeRepair({ ...NARROW, wrapClientWidth: 400, columnsUnder100: 3, preClientWidth: 398 }, M), 2],
    ['the fence resolved ch in the mono font', () => gradeRepair({ ...REPAIRED, preClientWidth: 819 }, M), 1],
    ['the clamp arithmetic: floor wins a narrower cap', () => (clampWidth(300, 271, 271) === 271 && clampWidth(1200, 962, 508.8) === 962 && clampWidth(700, 962, 508.8) === 700 && clampWidth(400, 962, 508.8) === 508.8 ? [] : ['clamp moved']), 0],
    ['the measure held', () => gradeMeasure({ paneWidth: 1000, contentWidth: 556.8 }, M), 0],
    ['the measure moved', () => gradeMeasure({ paneWidth: 1000, contentWidth: 900 }, M), 1],
    ['a pane narrower than the measure is not asked', () => gradeMeasure({ paneWidth: 420, contentWidth: 420 }, M), 0],
    ['the defect, put back', () => gradeDefect({ paneWidth: 1000, contentWidth: 556.8, wrapClientWidth: 509, columnsUnder100: 2 }), 0],
    ['the defect is gone, so the ablation did nothing', () => gradeDefect({ paneWidth: 1000, contentWidth: 556.8, wrapClientWidth: 952, columnsUnder100: 0 }), 2],
    ['every block inside the pane', () => gradeBleed(BLEED_OK), 0],
    ['a nested block one level past the right edge', () => gradeBleed({ ...BLEED_OK, docScrollsSideways: true, blocks: [BLEED_OK.blocks[0], { kind: 'table', depth: 2, overLeft: 0, overRight: 11 }] }), 2],
    ['a block past the LEFT edge only, which one edge would miss', () => gradeBleed({ ...BLEED_OK, blocks: [{ kind: 'pre', depth: 1, overLeft: 9, overRight: 0 }] }), 1],
    ['the broken bleed, put back', () => gradeBleedIsBroken({ ...BLEED_OK, docScrollsSideways: true, blocks: [{ kind: 'table', depth: 3, overLeft: 0, overRight: 11 }] }), 0],
    ['the broken bleed is gone, so the ablation did nothing', () => gradeBleedIsBroken(BLEED_OK), 2],
    ['a narrow table centred in its box', () => gradeAxis({ contentLeft: 400, blocks: [{ kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 600, right: 700, width: 100 } }] }), 0],
    ['a narrow table left in the corner', () => gradeAxis({ contentLeft: 400, blocks: [{ kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 100, right: 200, width: 100 } }] }), 1],
    ['a table that fills its box is not asked', () => gradeAxis({ contentLeft: 400, blocks: [{ kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 100, right: 1200, width: 1100 } }, { kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 600, right: 700, width: 100 } }] }), 0],
    ['a document with nothing narrow in it cannot pass this arm', () => gradeAxis({ contentLeft: 400, blocks: [{ kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 100, right: 1200, width: 1100 } }] }), 1],
    ['the corner, put back', () => gradeAxisIsBroken({ contentLeft: 400, blocks: [{ kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 100, right: 200, width: 100 } }] }), 0],
    ['the corner is gone, so the ablation did nothing', () => gradeAxisIsBroken({ contentLeft: 400, blocks: [{ kind: 'table', depth: 0, left: 100, right: 1200, width: 1100, inner: { left: 600, right: 700, width: 100 } }] }), 1],
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

## Nested blocks

A wide block under a bullet has a different containing block from one at the
top level, and a full bleed computed from the wrong one walks off the pane.

- A bullet at depth one, with his shape of table under it.

  | Component | Language / runtime | Entry point | Documented before? | Ships via |
  | --- | --- | --- | --- | --- |
  | \`stoa-web/\` | Next.js 16, React 19 | \`app/layout.tsx\` | yes | Vercel, automatic on branch push |

  - A bullet at depth two.

    | Component | Language / runtime | Entry point | Documented before? | Ships via |
    | --- | --- | --- | --- | --- |
    | \`stoa-cli/\` | Go 1.26.8 + Rust (cgo) | \`cmd/stoa/main.go\` | yes | GitHub Releases, gated on a marker |

    - A bullet at depth three.

      | Component | Language / runtime | Entry point | Documented before? | Ships via |
      | --- | --- | --- | --- | --- |
      | \`cloudflare-worker/\` | Cloudflare Worker | \`src/worker.ts\` | no | \`wrangler deploy\`, manual |

      \`\`\`ts
      const aLineOfCodeThreeListsDeepThatIsLongerThanTheMeasureCanSeat = fn(a, b);
      \`\`\`

## A fence wider than the cap (Phase 252)

The clamp sizes a box by its content between the column and the cap, so the
cap sweep needs one block whose longest line is wider than the cap itself —
without it the sweep would plateau at the widest CONTENT and the cap would be
asserted by nothing.

\`\`\`ts
const wayOverTheCap = aVeryLongCall(withAnArgument, andASecondArgument, andAThirdArgument, andAFourthArgument, andAFifthArgument, andASixthArgument, andASeventhArgument);
\`\`\`
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
  // The box's OWN intrinsic width, with the clamp's three declarations lifted
  // for the read: min-width would floor the answer at the column and
  // max-width would cap it, and the whole point is to learn what the content
  // asks for before either bound is applied (Phase 252).
  const intrinsic = (el) => {
    if (el === null) return null;
    const was = el.style.cssText;
    el.style.width = 'max-content';
    el.style.minWidth = '0';
    el.style.maxWidth = 'none';
    const w = round(el.getBoundingClientRect().width);
    el.style.cssText = was;
    return w;
  };
  const wrapMaxContent = intrinsic(wrap);
  const preMaxContent = intrinsic(pre);
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
      right: round(wr.right),
      maxContent: wrapMaxContent
    },
    table: table === null ? null : { width: round(table.getBoundingClientRect().width), minContent, maxContent },
    cols,
    pre: pre === null ? null : {
      clientWidth: pre.clientWidth,
      scrollWidth: pre.scrollWidth,
      width: round(pre.getBoundingClientRect().width),
      canScroll: pre.scrollWidth > pre.clientWidth,
      fontFamily: getComputedStyle(pre).fontFamily,
      mdWide: getComputedStyle(pre).getPropertyValue('--md-wide').trim(),
      maxContent: preMaxContent
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

/**
 * EVERY wide block in the document, not the first one, with its rect against
 * the scroller's own content box. `depth` counts the list items and quotes
 * between the block and `.md-content`, because that is exactly what changes
 * the containing block a percentage and a negative margin resolve against.
 */
const BLOCKS = `(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const scroll = document.querySelector('.md-scroll');
  const content = document.querySelector('.md-content');
  if (scroll === null || content === null) return null;
  const sr = scroll.getBoundingClientRect();
  const innerLeft = sr.left;
  const innerRight = sr.left + scroll.clientWidth;
  const depthOf = (el) => {
    let d = 0;
    let p = el.parentElement;
    while (p !== null && !p.classList.contains('md-content')) {
      if (p.tagName === 'LI' || p.tagName === 'BLOCKQUOTE') d += 1;
      p = p.parentElement;
    }
    return d;
  };
  const blocks = Array.from(content.querySelectorAll('.md-table-scroll, pre')).map((el, i) => {
    const r = el.getBoundingClientRect();
    const t = el.classList.contains('md-table-scroll') ? el.querySelector('table') : null;
    const tr = t === null ? null : t.getBoundingClientRect();
    return {
      i,
      kind: el.classList.contains('md-table-scroll') ? 'table' : 'pre',
      depth: depthOf(el),
      left: round(r.left),
      right: round(r.right),
      width: round(r.width),
      overLeft: round(Math.max(0, innerLeft - r.left)),
      overRight: round(Math.max(0, r.right - innerRight)),
      inner: tr === null ? null : { left: round(tr.left), right: round(tr.right), width: round(tr.width) }
    };
  });
  const cs = getComputedStyle(content);
  return {
    pane: { clientWidth: scroll.clientWidth, offsetWidth: scroll.offsetWidth, scrollWidth: scroll.scrollWidth, left: round(sr.left) },
    zoom: getComputedStyle(document.documentElement).getPropertyValue('--zoom-editor').trim(),
    mdWide: cs.getPropertyValue('--md-wide').trim(),
    candidate: cs.getPropertyValue('--p248-candidate').trim(),
    fontSize: cs.fontSize,
    contentWidth: round(content.getBoundingClientRect().width),
    contentLeft: round(content.getBoundingClientRect().left + parseFloat(cs.paddingLeft)),
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

const readings = { widths: {}, sweep: [], ablations: {}, light: {}, modes: {}, nested: {}, zoom: {} };

await withElectron(
  {
    label: 'p248w',
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
          contentInner: f.content.inner,
          mdWidePx: Number.parseFloat(f.mdWide),
          wrapClientWidth: f.wrap.clientWidth,
          wrapMaxContent: f.wrap.maxContent,
          tableWidth: f.table.width,
          tableMinContent: f.table.minContent,
          columnsUnder100: under,
          docScrollsSideways: f.docScrollsSideways,
          // The fence carries 1px borders, so its rect width (border-box) is
          // the number the clamp resolves; clientWidth would sit a systematic
          // 2px under it.
          preClientWidth: f.pre === null ? null : f.pre.width,
          preMaxContent: f.pre === null ? null : f.pre.maxContent
        };
        readings.widths[name].grade = r;
        const bad = gradeRepair(r, MEASURE);
        const roomy = f.wrap.clientWidth >= f.table.minContent - 1;
        check(`A4-${name}`, 'THE BLOCK TOOK WHAT ITS CONTENT NEEDS, between the column and the cap, and the columns follow wherever the box can hold them', bad.length === 0, bad.length === 0 ? `box ${String(f.wrap.clientWidth)} px for ${String(f.wrap.maxContent)} px of table under a ${String(r.mdWidePx)} px cap, fence ${String(f.pre.clientWidth)} px for ${String(f.pre.maxContent)} px of code, ${roomy ? `${String(f.cols.length)} of ${String(f.cols.length)} columns whole` : `${String(f.cols.length - under)} of ${String(f.cols.length)} columns whole in a pane too narrow for ${String(f.table.minContent)} px of table`}` : bad.join('; '));
        check(`A5-${name}`, 'the fence and the table clamp to ONE --md-wide, resolved once in the prose font', f.pre !== null && f.pre.mdWide === f.mdWide && Number.parseFloat(f.mdWide) > 0, `--md-wide on pre "${String(f.pre === null ? '' : f.pre.mdWide)}" vs on content "${String(f.mdWide)}"`);

        // -- G. EVERY block, not the first one. A table or a fence under a
        // bullet has the LIST ITEM as its containing block, and a bleed
        // computed from that box is centred on a box the prose column does
        // not share.
        const b = await cdpEval(cdp, BLOCKS, 30000);
        readings.nested[name] = b;
        if (b === null) check(`G1-${name}`, 'every wide block was read', false, 'no reading');
        else {
          note(`G0-${name}`, 'the blocks', b.blocks.map((x) => `${x.kind}@${String(x.depth)}:${String(x.width)}${x.overRight > 0.5 ? ` +${String(x.overRight)}R` : ''}${x.overLeft > 0.5 ? ` +${String(x.overLeft)}L` : ''}`).join(' | '));
          const bleed = gradeBleed(b);
          check(`G1-${name}`, 'NO BLOCK AT ANY NESTING DEPTH IS PAST EITHER PANE EDGE, and the document does not scroll sideways', bleed.length === 0, bleed.length === 0 ? `${String(b.blocks.length)} blocks at depths ${[...new Set(b.blocks.map((x) => x.depth))].join(',')}, all inside a ${String(b.pane.clientWidth)} px pane` : bleed.join('; '));
        }
      }

      // ---- the cap, swept rather than argued ------------------------------
      {
        const sweep = [];
        for (let target = 1040; target <= 1240; target += 20) {
          await paneTo(target);
          await sleep(250);
          // THE WIDEST top-level block, not the first: the clamp sizes every
          // box by its own content, so only the block whose longest line is
          // wider than the cap can show where the cap is (Phase 252).
          const got = await cdpEval(cdp, `(() => { const s = document.querySelector('.md-scroll'); const bs = Array.from(document.querySelectorAll('.md-content > .md-table-scroll, .md-content > pre')); return s === null || bs.length === 0 ? null : { pane: s.clientWidth, box: Math.max(...bs.map((b) => b.clientWidth)) }; })()`, 20000);
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
        const css = `.md-content .md-table-scroll, .md-content pre { width: auto; min-width: 0; max-width: none; margin-inline: 0; position: static; left: auto; translate: none; }`;
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

      // ---- the nesting ablation, and the zoom ------------------------------
      {
        // THE DESCENDANT-SCOPED RULE PUT BACK, which is what shipped at
        // 772235b2: the same declarations reaching a block whose containing
        // block is a list item. It is the proof arm G can fail.
        await paneTo(1000);
        await sleep(300);
        const css = `.md-content .md-table-scroll, .md-content pre { width: max(100%, var(--md-wide)); margin-inline: calc((100% - max(100%, var(--md-wide))) / 2); }`;
        const b = await withStyle(cdp, 'p248w-descendant', css, () => cdpEval(cdp, BLOCKS, 30000));
        readings.nestedAblated = b;
        const bad = gradeBleedIsBroken(b);
        note('G2a', 'what the descendant-scoped rule drew', b === null ? 'nothing' : b.blocks.map((x) => `${x.kind}@${String(x.depth)}:+${String(x.overRight)}R`).join(' | '));
        check('G2', 'THE DESCENDANT-SCOPED RULE PUT BACK walks a nested block off the pane, so arm G can fail', bad.length === 0, bad.length === 0 ? `${String(b.blocks.filter((x) => x.overRight > 0.5).length)} block(s) past the right edge, scrollWidth ${String(b.pane.scrollWidth)} vs ${String(b.pane.clientWidth)}` : bad.join('; '));
        const back = await cdpEval(cdp, BLOCKS, 30000);
        check('G3', 'and it comes back the moment the ablation is removed', gradeBleed(back).length === 0, back === null ? 'no reading' : `scrollWidth ${String(back.pane.scrollWidth)} vs ${String(back.pane.clientWidth)}`);
      }
      {
        // -- I. THE NARROW TABLE'S AXIS. `## A narrow table` in the fixture
        // is 105 px of natural width in a box the break-out made 962 px
        // wide, which is the 11.9% of this repository's tables that gain
        // nothing from the room and would otherwise be drawn 302 px left of
        // every paragraph around them.
        await paneTo(1000);
        await sleep(300);
        const b = await cdpEval(cdp, BLOCKS, 30000);
        readings.axis = b;
        const axis = gradeAxis(b);
        const narrow = b === null ? [] : b.blocks.filter((x) => x.kind === 'table' && x.depth === 0 && x.inner !== null && x.inner.width < x.width - 1);
        check('I1', 'A TABLE NARROWER THAN ITS BOX IS ON THE PAGE\u2019S OWN AXIS rather than in the corner of it', axis.length === 0, axis.length === 0 ? `${String(narrow.length)} narrow table(s), ${narrow.map((x) => `${String(x.inner.width)} px in ${String(x.width)} px`).join(', ')}, prose column at ${String(b.contentLeft)} px` : axis.join('; '));
        const css = `.md-content > .md-table-scroll > table { margin-inline: 0; }`;
        const off = await withStyle(cdp, 'p248w-corner', css, () => cdpEval(cdp, BLOCKS, 30000));
        readings.axisAblated = off;
        const broken = gradeAxisIsBroken(off);
        const corneredTable = off === null ? null : off.blocks.find((x) => x.kind === 'table' && x.depth === 0 && x.inner !== null && x.inner.width < x.width - 50) ?? null;
        check('I2', 'THE CENTRING TAKEN OFF leaves it in the corner of its box, so arm I1 can fail', broken.length === 0, broken.length === 0 ? `the ${String(corneredTable.inner.width)} px table sits ${String(Math.round((corneredTable.left + corneredTable.right) / 2 - (corneredTable.inner.left + corneredTable.inner.right) / 2))} px left of its ${String(corneredTable.width)} px box's axis` : broken.join('; '));
      }

      {
        // ⌘+ SCALES THE SUBTREE AND NOT THE PANE. `zoom` on `.md-content`
        // (zoom.css:90) multiplies every used length under it, so a term
        // measured OUTSIDE the zoomed subtree — `100cqi`, the scroller's own
        // box — is in the wrong coordinate space and is multiplied a second
        // time. The candidate stylesheet carries the repair's own expression,
        // so the run says whether the browser accepts it before it is shipped.
        //
        // THE CHORD IS DISPATCHED HERE rather than through the harness's own
        // zoom drive: that hook does terminal work this probe has no session
        // for, and it hung this run's Runtime.evaluate for its whole 120 s
        // budget. This is the same real KeyboardEvent the shipped capture
        // listener reads (zoom/keys.ts), on the region's own element.
        const zoomNow = () =>
          cdpEval(cdp, `(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--zoom-editor').trim(); return v === '' ? 1 : Number(v); })()`, 10000);
        const press = (code, key, shift) =>
          cdpEval(cdp, `(() => { const el = document.querySelector('.ed-panel'); if (el === null) return false; el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key)}, metaKey: true, shiftKey: ${shift ? 'true' : 'false'}, bubbles: true, cancelable: true })); return true; })()`, 10000);
        const zoomTo = async (level) => {
          for (let i = 0; i < 14; i += 1) {
            const now = await zoomNow();
            if (typeof now === 'number' && Math.abs(now - level) < 1e-6) return now;
            const up = typeof now === 'number' && now < level;
            await press(up ? 'Equal' : 'Minus', up ? '=' : '-', false);
            await sleep(220);
          }
          return await zoomNow();
        };
        const CAND = `@property --p248-candidate { syntax: '<length>'; inherits: true; initial-value: 0px; }\n.md-content { --p248-candidate: min(136ch, 100cqi / var(--zoom-editor, 1) - 2 * var(--space-8)); }`;
        await paneTo(1381);
        await sleep(400);
        await withStyle(cdp, 'p248w-candidate', CAND, async () => {
          for (const z of (process.env['P248_ZOOMS'] ?? '1,1.1,1.25,1.5,2').split(',').map(Number)) {
            const landed = await zoomTo(z);
            await sleep(600);
            const b = await cdpEval(cdp, BLOCKS, 30000);
            readings.zoom[String(z)] = b;
            if (b === null) { check(`H1-${String(z)}`, 'a reading at this zoom', false, 'none'); continue; }
            check(`H0-${String(z)}`, `⌘+ REACHED ${String(Math.round(z * 100))}%, pressed as the real chord`, Math.abs(Number(landed) - z) < 1e-6, `--zoom-editor ${b.zoom} · font ${b.fontSize} · --md-wide ${b.mdWide} · candidate ${b.candidate} · widest block ${String(Math.max(...b.blocks.map((x) => x.width)))} px in a ${String(b.pane.clientWidth)} px pane`);
            const bleed = gradeBleed(b);
            check(`H1-${String(z)}`, `AT ${String(Math.round(z * 100))}% THE DOCUMENT DOES NOT SCROLL SIDEWAYS and no block is past a pane edge`, bleed.length === 0, bleed.length === 0 ? `scrollWidth ${String(b.pane.scrollWidth)} vs ${String(b.pane.clientWidth)}` : bleed.join('; '));
          }
          // THE UNDIVIDED PANE TERM PUT BACK, at whatever zoom the loop ended
          // on. It is the expression that shipped at 772235b2, and it is the
          // proof arm H1 can fail rather than passing because zoom changes
          // nothing.
          const z = await zoomNow();
          const css = `.md-content { --md-wide: min(136ch, 100cqi - 2 * var(--space-8)); }`;
          const b = await withStyle(cdp, 'p248w-undivided', css, () => cdpEval(cdp, BLOCKS, 30000));
          const bad = gradeBleedIsBroken(b);
          readings.zoomAblated = b;
          check('H3', 'THE UNDIVIDED PANE TERM PUT BACK walks the block off the pane under zoom, so arm H1 can fail', bad.length === 0, bad.length === 0 ? `at ${String(z)}x the block drew ${String(Math.max(...b.blocks.map((x) => x.width)))} px in a ${String(b.pane.clientWidth)} px pane, ${String(Math.max(...b.blocks.map((x) => x.overRight)))} px past the right edge, scrollWidth ${String(b.pane.scrollWidth)}` : `at ${String(z)}x: ${bad.join('; ')}`);
          const after = await cdpEval(cdp, BLOCKS, 30000);
          check('H4', 'and it comes back the moment the ablation is removed', gradeBleed(after).length === 0, after === null ? 'no reading' : `scrollWidth ${String(after.pane.scrollWidth)} vs ${String(after.pane.clientWidth)}`);
        });
        await press('Digit0', '0', false);
        await sleep(700);
        const back = await cdpEval(cdp, BLOCKS, 30000);
        check('H2', 'and ⌘0 puts the region back to 100%', back !== null && (back.zoom === '1' || back.zoom === '') && gradeBleed(back).length === 0, back === null ? 'no reading' : `--zoom-editor "${back.zoom}", scrollWidth ${String(back.pane.scrollWidth)} vs ${String(back.pane.clientWidth)}`);
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
        // THE RULER MEASURES IN A `requestAnimationFrame`, AND A WINDOW
        // NOBODY IS LOOKING AT DOES NOT PRODUCE FRAMES. Every window this
        // probe opens is behind whatever the operator has in front of it, and
        // Chromium stops driving rAF for an occluded page — React is unharmed
        // because its scheduler is a MessageChannel, so everything else in
        // this run behaves while the one rAF consumer on the surface never
        // runs. A screencast is what makes the compositor produce frames
        // again; `probe:p213` grades its crossfade under one for the same
        // reason. It is stopped in a `finally`, and the liveness of rAF is
        // READ rather than assumed, so a ruler that really did not measure
        // still fails the check below and says which of the two it was.
        let rafAlive = null;
        try {
          await callOk(cdp, 'Page.enable', {});
          try { await callOk(cdp, 'Page.setWebLifecycleState', { state: 'active' }); } catch { /* not everywhere */ }
          try { await callOk(cdp, 'Emulation.setFocusEmulationEnabled', { enabled: true }); } catch { /* not everywhere */ }
          await callOk(cdp, 'Page.startScreencast', { format: 'jpeg', quality: 1, maxWidth: 64, maxHeight: 64, everyNthFrame: 1 });
          rafAlive = await cdpEval(cdp, `new Promise((r) => { const t = setTimeout(() => r(false), 3000); requestAnimationFrame(() => { clearTimeout(t); r(true); }); })`, 15000);
          if (rafAlive === true) await until(cdp, `document.querySelectorAll('.md-ruler-tick').length > 0`, 8000);
        } finally {
          try { await callOk(cdp, 'Page.stopScreencast', {}); } catch { /* the page is going away */ }
        }
        note('E3b', 'the page produces frames while the ruler is read', `requestAnimationFrame fired: ${String(rafAlive)}`);
        const headings = await cdpEval(cdp, `document.querySelectorAll('.md-content [data-md-heading]').length`, 10000);
        const withRuler = await cdpEval(cdp, FACE, 30000);
        readings.modes.ruler = withRuler;
        // WHICH QUESTION THIS ARM ASKS DEPENDS ON WHETHER THE WINDOW PAINTED,
        // and it says which. The ruler's own measure runs in a rAF, and a
        // window on a busy display is occluded, which pauses rAF outright —
        // React is unharmed, so every other reading in this run is honest
        // while this one cannot be taken at all. With frames, the drawn ticks
        // are the claim. Without them, what is still checkable is that the
        // ruler MOUNTED and that the outline it measures is in the DOM under
        // containment, and the run says the ticks were unread rather than
        // reporting a pass it did not earn.
        if (rafAlive === true) {
          check('E4', 'the heading ruler still measures under inline-size containment', withRuler !== null && withRuler.ruler !== null && withRuler.ruler.ticks >= 4 && withRuler.ruler.thumbHeight > 0, withRuler === null || withRuler.ruler === null ? 'the ruler did not mount' : `${String(withRuler.ruler.ticks)} ticks, thumb ${String(withRuler.ruler.thumbHeight)} px, box ${String(withRuler.wrap.clientWidth)} px, sideways ${String(withRuler.docScrollsSideways)}`);
        } else {
          check('E4', 'the heading ruler mounted and its outline is there to measure — in a window that produced no frames, so the DRAWN ticks are unread', withRuler !== null && withRuler.ruler !== null && Number(headings) >= 4, withRuler === null || withRuler.ruler === null ? 'the ruler did not mount' : `${String(headings)} headings carry data-md-heading under containment, thumb ${String(withRuler.ruler.thumbHeight)} px, box ${String(withRuler.wrap.clientWidth)} px; requestAnimationFrame never fired, so the ruler's own measure could not run (background throttling, Phase 190)`);
        }
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
          const bad = gradeRepair({ paneWidth: f.pane.clientWidth, contentWidth: f.content.width, contentInner: f.content.inner, mdWidePx: Number.parseFloat(f.mdWide), wrapClientWidth: f.wrap.clientWidth, wrapMaxContent: f.wrap.maxContent, tableWidth: f.table.width, tableMinContent: f.table.minContent, columnsUnder100: under, docScrollsSideways: f.docScrollsSideways, preClientWidth: f.pre === null ? null : f.pre.width, preMaxContent: f.pre === null ? null : f.pre.maxContent }, MEASURE);
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
