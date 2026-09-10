#!/usr/bin/env node
/**
 * probe-p249.mjs — PHASE 251's APP RUN, research 114 §8.
 *
 * The room and the wash, READ OFF THE RUNNING APP at three pane widths on both
 * bases, and graded. It is the other half of `npm run conformance:redline`
 * rules 33 to 36: that gate reads the stylesheet, and a stylesheet reading
 * cannot see a face substitution, so the ONE guard on the long side of the
 * wash — where two vertically adjacent washes would overlap and paint ink over
 * the neighbouring line — is the painted-height row below and nothing else
 * (research 114 §1.4 and §7 arm 6).
 *
 * ONE Electron on a scratch profile, a scratch HOME and this run's own tmux
 * socket, all ended in a `finally`. It spawns no agent, spends no token, opens
 * no keychain, makes no request and touches no machine. The "agent" that
 * writes the new version of the file from outside is a plain /bin/sh. The
 * operator's own `-L gmux` sessions are counted before and after, read only.
 *
 * WHAT IT READS, one row per claim research 114 §2 makes:
 *   - the document box against the scroller, and the dead space as a share;
 *   - the free canvas either side of the TEXT, which is the band he pointed at;
 *   - the measure in characters, re-derived from a measured advance width;
 *   - the painted height of a mark against the line pitch, and the trailing
 *     inline padding, which is arm 6;
 *   - fragments past the column's content edge and past the table's own
 *     closing pipe;
 *   - the rows of prose the chip covers, and WHICH ARM the chip says it took,
 *     because a chip placed perfectly in the band covers 0 rows and so does a
 *     chip that was never drawn at all;
 *   - `Accept all`'s distance from the column's right content edge;
 *   - the positioned boxes the current change draws, OVER EVERY CHANGE rather
 *     than over whichever one happens to be current, which is the row the
 *     design's own first version got wrong by reading one change;
 *   - and the rail's own width at every pane, which is arm 14.
 *
 * AND THE FIX ROUND ADDED THE BAND BOUNDARY, SWEPT IN 2px STEPS, because the
 * three widths above cannot see it: 1349 is well inside the band and 699 and
 * 319 are well inside the overlay, and the window the defect lived in is 19px
 * wide and sits right beside the 1349px pane research 113 says he works in.
 * `chipPlace` was handed the scroller's BORDER box, which includes the vertical
 * scrollbar, while the page is centred in its CONTENT box, so the band arm
 * accepted a chip that hung up to a scrollbar's width past the box and
 * `.ed-redline-scroll` grew a horizontal scrollbar that appeared and
 * disappeared as the pointer moved onto and off a change. The sweep reads the
 * overhang and the scroller's own overflow at each step, and it FAILS ITSELF if
 * every width or no width took the band arm, because a sweep that never crossed
 * the boundary proves nothing.
 *
 * MEASURED AT THE PARENT COMMIT AND AT HEAD. Run it with `P249_LABEL=parent`
 * after putting `src/renderer/editor/redline.css` and `RedlineDocument.tsx`
 * back to the parent and rebuilding; the readings go to a file named for the
 * label and `--compare` prints the two side by side. That is the only honest
 * proof a defect is fixed.
 *
 * `--self-test` proves the graders on fixtures and launches nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p249]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// THE GRADERS. Pure, proved under --self-test before any app is launched.
// ---------------------------------------------------------------------------

/** Distinct line boxes a set of rects sits on, bucketed by top to 0.5px. */
export function lineBoxes(rects) {
  const tops = new Set();
  for (const r of rects) tops.add(Math.round(r.top * 2) / 2);
  return tops.size;
}

/**
 * ARM 6, AND IT IS THE ONLY GUARD ON THE LONG SIDE.
 *
 * The painted height of a mark must be inside a band BELOW the line pitch and
 * never above it. Above it, the washes of vertically adjacent lines overlap,
 * which is the tiles defect inverted into ink over the neighbouring line and
 * which no arithmetic in the stylesheet can refuse: `--redline-fontbox` is a
 * multiple of the font size and a face substitution moves it.
 *
 * The band's floor is what says the 6.45px band research 113 §2.1 measured has
 * really closed. The seam is 2px, so the painted height should be the pitch
 * less about 2px; the floor is the pitch less 4px, which admits a seam a
 * rounding or a half-pixel device ratio moved and refuses the shipped
 * 15.00px-on-21.45px by a wide margin.
 */
export function gradeWash(painted, pitch) {
  const findings = [];
  if (!(painted > 0) || !(pitch > 0)) {
    findings.push(`the painted height ${String(painted)} or the pitch ${String(pitch)} is not a length`);
    return findings;
  }
  if (painted > pitch) {
    findings.push(
      `a mark paints ${painted.toFixed(2)}px on a ${pitch.toFixed(2)}px pitch, so vertically ` +
        'adjacent washes OVERLAP: ink over the neighbouring line (research 114 §1.4)'
    );
  } else if (painted < pitch - 4) {
    findings.push(
      `a mark paints ${painted.toFixed(2)}px on a ${pitch.toFixed(2)}px pitch, a band of ` +
        `${(pitch - painted).toFixed(2)}px between stacked fragments: the tiles are back`
    );
  }
  return findings;
}

/** ARM 14. The rail is drawn and has a width at every pane. */
export function gradeRail(rail, room) {
  const findings = [];
  if (rail === null) {
    findings.push(`there is no rail at all at data-room='${String(room)}'`);
    return findings;
  }
  if (!(rail.width > 0)) {
    findings.push(`the rail has collapsed to ${String(rail.width)}px at data-room='${String(room)}'`);
  }
  return findings;
}

/** ARM 14's other half: the current change is MARKED, wherever the mark lives. */
export function gradeMark(bar, outlinedBoxes) {
  const findings = [];
  if (bar === null || !(bar.height > 0)) {
    findings.push('the current change draws no rail bar, so it is marked by nothing');
  }
  if (outlinedBoxes > 0) {
    findings.push(
      `the current change still draws ${String(outlinedBoxes)} outlined box(es) on its own wrapper`
    );
  }
  return findings;
}

/**
 * ARM 11. The document's box is the measure plus its own inline padding, so
 * the number in the stylesheet is the number of characters a line holds.
 * Answered only where the measure FITS: at a narrow pane the track is clamped
 * by the scroller and the box is smaller on purpose.
 */
export function gradeMeasure(doc, measureCh, ch, padding) {
  const findings = [];
  const want = measureCh * ch + padding * 2;
  if (doc.width > want + 0.5) {
    findings.push(
      `the document box is ${doc.width.toFixed(2)}px against a measure of ${want.toFixed(2)}px, ` +
        'so it is wider than the measure allows'
    );
  }
  if (doc.width < want - 0.5 && doc.clamped !== true) {
    findings.push(
      `the document box is ${doc.width.toFixed(2)}px against a measure of ${want.toFixed(2)}px ` +
        'with room to spare, so the padding is inside the measure again'
    );
  }
  return findings;
}

/** Which fragments cross a vertical edge, past a tolerance. */
export function crossings(fragments, edge, tol) {
  const over = [];
  for (const f of fragments) if (f.right - edge > tol) over.push(f);
  return over;
}

/** Do two rectangles overlap at all? */
export function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function selfTest() {
  const R = (left, top, width, height) => ({
    left, top, width, height, right: left + width, bottom: top + height
  });
  const fixtures = [
    ['one rect is one line box', () => lineBoxes([R(0, 10, 5, 15)]), 1],
    ['two tops are two line boxes', () => lineBoxes([R(0, 10, 5, 15), R(0, 31.45, 5, 15)]), 2],
    ['the shipped tiles are caught', () => gradeWash(15.0, 21.45).length, 1],
    ['the seam passes', () => gradeWash(19.44, 21.45).length, 0],
    ['the ribbon passes too', () => gradeWash(21.44, 21.45).length, 0],
    ['a wash TALLER than the pitch is caught', () => gradeWash(22.0, 21.45).length, 1],
    ['a wash exactly the pitch passes', () => gradeWash(21.45, 21.45).length, 0],
    ['a wash 4px short is caught', () => gradeWash(17.44, 21.45).length, 1],
    ['nonsense is caught', () => gradeWash(0, 21.45).length, 1],
    ['a collapsed rail is caught', () => gradeRail({ width: 0 }, 'narrow').length, 1],
    ['a missing rail is caught', () => gradeRail(null, 'narrow').length, 1],
    ['a 3px rail passes', () => gradeRail({ width: 3 }, 'narrow').length, 0],
    ['no bar is caught', () => gradeMark(null, 0).length, 1],
    ['a zero-height bar is caught', () => gradeMark({ height: 0 }, 0).length, 1],
    ['an outline that came back is caught', () => gradeMark({ height: 40 }, 23).length, 1],
    ['a bar and no outline passes', () => gradeMark({ height: 40 }, 0).length, 0],
    [
      'the measure delivered exactly passes',
      () => gradeMeasure({ width: 735.83 }, 84, 8.1885, 24).length,
      0
    ],
    [
      'the padding back inside the measure is caught',
      () => gradeMeasure({ width: 687.83 }, 84, 8.1885, 24).length,
      1
    ],
    [
      'a clamped column at a narrow pane is not a finding',
      () => gradeMeasure({ width: 309, clamped: true }, 84, 8.1885, 24).length,
      0
    ],
    ['a fragment past the edge crosses', () => crossings([R(0, 0, 110, 15)], 100, 0.5).length, 1],
    ['a fragment short of the edge does not', () => crossings([R(0, 0, 90, 15)], 100, 0.5).length, 0],
    ['overlapping boxes overlap', () => (overlaps(R(0, 0, 50, 20), R(10, 10, 50, 20)) ? 1 : 0), 1],
    ['touching boxes do not', () => (overlaps(R(0, 0, 50, 20), R(50, 0, 50, 20)) ? 1 : 0), 0]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good = got === want;
    ok = ok && good;
    say(`${good ? 'ok  ' : 'FAIL'} self-test ${label}: ${String(got)}, wanted ${String(want)}`);
  }
  say(`${ok ? 'ok  ' : 'FAIL'} self-test: ${fixtures.length} fixtures, ${ok ? 'all behaved' : 'one or more did not'}`);
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// --compare prints the two runs side by side and launches nothing.
if (process.argv.includes('--compare')) {
  const at = (label) => {
    const file = join(REPO, 'build', 'p249', `out-p251-${label}.json`);
    if (!existsSync(file)) {
      say(`no readings for "${label}" at ${file}`);
      return null;
    }
    return JSON.parse(readFileSync(file, 'utf8'));
  };
  const parent = at('parent');
  const head = at('head');
  if (parent === null || head === null) process.exit(2);
  const ROWS = [
    ['document box', (r) => r.doc.width.toFixed(2)],
    ['dead space (document)', (r) => `${r.deadPercent.toFixed(2)}%`],
    ['free canvas left / right of the text', (r) => `${r.freeLeft.toFixed(1)} / ${r.freeRight.toFixed(1)}`],
    ['text column', (r) => r.textColumn.toFixed(2)],
    ['marks with no wash', (r) => String(r.marks - r.washed)],
    ['lone marks drawing a bar', (r) => `${String(r.leaves?.loneBars ?? 0)} of ${String(r.leaves?.lone ?? 0)}`],
    ['dropped separator rows drawn', (r) => `${String(r.leaves?.dropDrawn ?? 0)} of ${String(r.leaves?.drop ?? 0)}`],
    ['wordless marks carrying a wash', (r) => `${String(r.leaves?.wordlessWashed ?? 0)} of ${String(r.leaves?.wordless ?? 0)}`],
    ['spacing changes keeping their wash', (r) => `${String(r.leaves?.spacingWashed ?? 0)} of ${String(r.leaves?.spacing ?? 0)}`],
    ['document text length', (r) => String(r.leaves?.textLength ?? 0)],
    ['characters', (r) => (r.textColumn / r.chWidth).toFixed(1)],
    ['document height', (r) => r.docHeight.toFixed(2)],
    ['painted / pitch', (r) => `${r.painted.toFixed(2)} / ${r.pitch.toFixed(2)}`],
    ['trailing inline padding', (r) => `${r.markPadRight.toFixed(2)}px`],
    ['marks carrying a wash', (r) => `${String(r.washed)} of ${String(r.marks)}`],
    ['fragments past the column edge', (r) => String(r.pastColumn)],
    ['of those, ending on whitespace', (r) => `${String(r.crossersOnWhitespace ?? 'n/a')} of ${String(r.pastColumn)}`],
    ['worst overhang past the column', (r) => `${Number(r.worstOverhang ?? 0).toFixed(2)}px`],
    ["fragments past the table's own pipe", (r) => String(r.pastPipe)],
    ['rows of prose the chip covers', (r) => String(r.chipCovers)],
    ['the arm the chip says it took', (r) => String(r.chipArm ?? 'no chip drawn')],
    ["`Accept all` past the column's right edge", (r) => `${r.acceptAllPast.toFixed(1)}px`],
    ['worst outlined boxes on any one change', (r) => String(r.worstOutlined)],
    ['changes drawing a rail bar', (r) => `${String(r.barsDrawn)} of ${String(r.changes)}`],
    ['rail width', (r) => `${r.railWidth.toFixed(2)}px`],
    ['changes', (r) => String(r.changes)]
  ];
  for (const scheme of ['dark', 'light']) {
    for (const width of ['1349', '699', '319']) {
      const p = parent.cells?.[`${scheme}-${width}`];
      const h = head.cells?.[`${scheme}-${width}`];
      if (p === undefined || h === undefined) continue;
      say(`--- ${scheme}, ${width}px ---`);
      for (const [name, of] of ROWS) {
        let a = 'n/a';
        let b = 'n/a';
        try { a = of(p); } catch { a = 'n/a'; }
        try { b = of(h); } catch { b = 'n/a'; }
        say(`  ${name.padEnd(42)} ${String(a).padStart(18)}  ->  ${String(b).padStart(18)}`);
      }
    }
  }
  say(`parent findings: ${String(parent.findings.length)}, HEAD findings: ${String(head.findings.length)}`);
  for (const f of head.findings) say(`  HEAD: ${f}`);
  process.exit(0);
}

if (!selfTest()) { say('the graders do not behave; refusing to launch anything'); process.exit(1); }

// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [
      join(REPO, 'build', 'harness-socket.mjs'),
      '--fresh',
      `gmux-p251-${String(process.pid)}`,
      `node ${process.argv[1]}`
    ],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const LABEL = (process.env['P249_LABEL'] ?? 'head').trim();
const outFile = join(REPO, 'build', 'p249', `out-p251-${LABEL}.json`);

const operatorCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p251'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p251'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
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
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], { input: text, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('shell write failed');
};

// ---------------------------------------------------------------------------
// THE FIXTURE, this run's own and never the operator's: no path of his, no
// content of his. It carries the three shapes the reading needs — a paragraph
// whose two sides share no word and are long enough that the word-level edit
// distance passes REDLINE_MAX_EDIT_LENGTH, so the block draws WHOLE and one
// mark spans many wrapped lines, which is the shape fault 2 is about; a
// markdown table whose columns and rows both changed, which is what the
// closing-pipe reading needs; and a LEAF SECTION carrying one of each of
// research 114 §6.5's four cases — a blank line inserted, which is the lone
// mark's own bar; three spacing changes, which keep their wash and are ruling
// 5 exactly; a separator pair, whose deleted copy is marked `drop` and is not
// drawn; and two wordless marks, being the separator rows themselves. Driven
// through the shipping composer before it was written down, that section reads
// 1 lone, 3 spacing, 1 drop and 2 wordless, so the leaf rules are exercised on
// the face rather than only in the gate.
// ---------------------------------------------------------------------------
const BIG_A = Array.from({ length: 5 }, (_, i) =>
  `Cartographers charted seventeen quiet islands beyond the northern reef in season ${i + 1}, naming each after a bird that nested there, and the youngest of them drew a whale in the margin of every chart she finished because her grandmother had told her that a map without an animal on it is only arithmetic.`
).join(' ');
const BIG_B = Array.from({ length: 5 }, (_, i) =>
  `Blacksmiths hammered eleven copper kettles before dawn in the southern quarter of year ${i + 1}, stamping each with a fish that swam nowhere, and the eldest of them scratched a comet into the base of every kettle he finished because his father had said that a vessel without a star on it is only metal.`
).join(' ');

const V1 = `# The durability note

Tortie keeps every session alive in a private tmux server, and the application in front of it is a disposable client that may be quit, crashed or updated at any moment without the work inside a session noticing that anything happened at all.

The manifest is the source of truth for restore, and it records the absolute path of every binary a session was launched with so that a machine which has been rebooted can put every one of them back exactly where it was before the power went out.

| Surface | Owner | Durable | Notes |
| --- | --- | --- | --- |
| Sessions | tmux | yes | survives a quit |
| Manifest | SQLite | yes | absolute argv |
| Editor tabs | renderer | no | rebuilt on open |
| Search index | ripgrep | no | recomputed |

The paragraph below this one is the passage the note rewrote from end to end, and it is here because a change that replaces a whole paragraph is the shape a word level reading cannot make smaller.

${BIG_A}

A session is addressed by identity and never by name, so a live session that carries neither of the two stamps is not ours, and the supervisor will neither adopt it nor end it under any circumstances whatsoever.

Every process that a script starts is ended in a finally block, whatever happened, because a script that kills only on the happy path is a defect and the verifier names it in the verdict rather than in a footnote.

## The leaf cases

Paragraph one is unchanged from end to end, so the only edit anywhere near it is the blank line below.
Paragraph two is unchanged from end to end, so the only edit anywhere near it is the blank line above.

Spaced   out   words   here.

| Slot | Owner |
| --- | --- |
| one | tmux |
| two | ripgrep |
`;

const V2 = `# The durability note

Tortie holds every conversation open in a private multiplexer, and the window in front of it is a throwaway viewer that may be closed, killed or upgraded at any moment without the work inside a session noticing that anything happened at all.
The manifest is the source of truth for restore, and it records the absolute path of every binary a session was launched with so that a machine which has been rebooted can put every one of them back exactly where it was before the power went out and the fans stopped.

| Surface | Keeper | Survives | Restored by | Remarks |
| --- | --- | --- | --- | --- |
| Ledger | SQLite | yes | boot | the whole argv |
| Conversations | multiplexer | yes | attach | outlives a close |
| Search cache | ripgrep | no | rescan | recomputed |
| Editor tabs | renderer | no | reopen | rebuilt on open |

The paragraph below this one is the passage the note rewrote from end to end, and it is here because a change that replaces a whole paragraph is the shape a word level reading cannot make smaller.

${BIG_B}

A session is addressed by identity and never by name, so a live session that carries neither of the two stamps belongs to somebody else, and the supervisor will neither adopt it nor end it under any circumstances whatsoever.

Every process that a script starts is ended in a finally block, whatever happened, because a script that kills only on the happy path is a defect and the verifier names it in the verdict rather than in a footnote.

## The leaf cases

Paragraph one is unchanged from end to end, so the only edit anywhere near it is the blank line below.

Paragraph two is unchanged from end to end, so the only edit anywhere near it is the blank line above.

Spaced out words here.

| Slot | Owner | Extra |
| --- | --- | --- |
| one | tmux | added |
| two | ripgrep | added |
`;

writeFileSync(join(project, 'note.md'), V1);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p251@example.invalid');
git('config', 'user.name', 'p251');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// THE RULER, all off the live DOM.
// ---------------------------------------------------------------------------
const RULER = String.raw`(() => {
  const view = document.querySelector('.ed-redline-view');
  const scroll = document.querySelector('.ed-redline-scroll');
  const doc = document.querySelector('.ed-redline-doc');
  const page = document.querySelector('.ed-redline-page');
  const rail = document.querySelector('.ed-redline-rail');
  const bar = document.querySelector('.ed-redline-rail-bar');
  const panel = document.querySelector('.ed-panel');
  if (doc === null || view === null || scroll === null) return null;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }; };
  const rects = (el) => Array.from(el.getClientRects()).map((r) => ({ left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }));
  const cs = getComputedStyle(doc);

  // TWO CHARACTER WIDTHS, AND THEY ARE NOT THE SAME NUMBER, which is research
  // 113 section 1's own finding: the CSS ch UNIT computes at 8.1885px in this
  // document while the measured ADVANCE of a drawn zero is 8.1123px. The
  // measure is written in ch, so the unit is what grades it; the advance is
  // what says how many characters a person really gets on a line. Reading one
  // for the other is a 6.4px error and it reads as a defect that is not there.
  const unitProbe = document.createElement('div');
  unitProbe.style.cssText = 'position:absolute;visibility:hidden;width:100ch;';
  doc.appendChild(unitProbe);
  const chUnit = unitProbe.getBoundingClientRect().width / 100;
  unitProbe.remove();
  const probe = document.createElement('span');
  probe.textContent = '0'.repeat(100);
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
  doc.appendChild(probe);
  const chWidth = probe.getBoundingClientRect().width / 100;
  probe.remove();

  const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
  const dbox = doc.getBoundingClientRect();
  const contentLeft = dbox.left + padL;
  const contentRight = dbox.right - padR;

  // THE PAINTED HEIGHT OF A MARK, which is arm 6 and the only guard on the
  // long side. Read off a real drawn mark's own client rect, at the widest
  // fragment count, and the pitch off the document's computed line-height.
  const marks = Array.from(doc.querySelectorAll('del,ins'));
  let painted = 0, markPadRight = 0, markPadLeft = 0;
  for (const m of marks) {
    const rs = m.getClientRects();
    if (rs.length === 0) continue;
    const st = getComputedStyle(m);
    if (st.backgroundImage === 'none' && st.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    painted = Math.max(painted, rs[0].height);
    markPadRight = Math.max(markPadRight, parseFloat(st.paddingRight) || 0);
    markPadLeft = Math.max(markPadLeft, parseFloat(st.paddingLeft) || 0);
  }
  const pitch = parseFloat(cs.lineHeight);

  // EVERY MARK'S FRAGMENTS against the column's content edge, and how many
  // carry a wash at all.
  let frags = 0, washed = 0, pastColumn = 0;
  const fragments = [];
  const crossers = [];
  // WHICH CHARACTER A CROSSING FRAGMENT ENDS ON, walked one character at a
  // time through a Range and bucketed by the top of its own rect. Research 113
  // section 5.3 measured fifteen crossings out of fifteen ending on WHITESPACE
  // and not one fragment ending on a visible character, and named the
  // mechanism: pre-wrap paints a preserved space or newline at a wrap point
  // past the last glyph. A crossing that ended on a LETTER is another defect
  // and this is what tells the two apart, so a number that got worse is not
  // published without knowing which of the two it is.
  // MATCHED BY CONTAINMENT AND NOT BY AN EQUAL TOP, which is this phase's own
  // change: the wash now paints the LINE PITCH rather than the font box, so a
  // fragment's rect is 19.44px tall while the character's own Range rect is
  // 15.00px and sits inside it. An earlier version of this probe bucketed by
  // an equal top and answered null for every crossing at HEAD, which read as
  // "0 of 4 end on whitespace" and would have published a defect that is not
  // there.
  const lastCharOn = (el, top, bottom) => {
    const node = el.firstChild;
    if (node === null || node.nodeType !== 3) return null;
    const text = node.nodeValue || '';
    const range = document.createRange();
    let last = null;
    for (let i = 0; i < text.length; i += 1) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (r === undefined) continue;
      if (r.top < top - 0.5 || r.bottom > bottom + 0.5) continue;
      last = { ch: text[i], right: +r.right.toFixed(2) };
    }
    return last;
  };
  for (const m of marks) {
    const st = getComputedStyle(m);
    const hasWash = st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== 'transparent';
    if (hasWash) washed += 1;
    for (const r of Array.from(m.getClientRects())) {
      frags += 1;
      const top = Math.round(r.top * 2) / 2;
      fragments.push({ top: top, right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) });
      if (r.right - contentRight > 0.5) {
        pastColumn += 1;
        const end = lastCharOn(m, r.top, r.bottom);
        crossers.push({
          kind: m.tagName.toLowerCase(),
          over: +(r.right - contentRight).toFixed(2),
          lastChar: end === null ? null : end.ch,
          whitespace: end === null ? null : /\s/.test(end.ch)
        });
      }
    }
  }

  // THE POSITIONED BOXES THE CURRENT CHANGE DRAWS, OVER EVERY CHANGE. The
  // design's own first version read whichever change happened to be current,
  // which is a fifth of the case it is about: this puts the mark on each
  // wrapper in turn and counts what Chromium would paint an outline on.
  const wraps = Array.from(doc.querySelectorAll('.ed-redline-change'));
  let worstOutlined = 0, worstFragments = 0;
  for (const w of wraps) {
    const st = getComputedStyle(w);
    const outlined = (parseFloat(st.outlineWidth) || 0) > 0 && st.outlineStyle !== 'none';
    const n = w.getClientRects().length;
    if (outlined) worstOutlined = Math.max(worstOutlined, n);
    worstFragments = Math.max(worstFragments, n);
  }

  const chip = document.querySelector('.ed-redline-chip');
  const chipBox = box(chip);
  // WHICH ARM THE CHIP TOOK, READ OFF THE FACE. chipCovers alone cannot say
  // it: a chip placed perfectly in the band covers 0 rows of prose and so does
  // a chip that was never drawn at all, so the two readings that matter most
  // are the same number. data-arm is only on an element that exists, so null
  // means no chip, and it is band or overlay otherwise. Null at the parent
  // commit too, because the attribute is Phase 251's.
  // NO BACKTICK IN THIS BLOCK: it is inside the RULER template literal.
  const chipArm = chip === null ? null : chip.getAttribute('data-arm');

  // ROWS OF PROSE THE CHIP COVERS: every drawn text row's own rectangle,
  // bucketed by top, intersected with the chip's box.
  const buckets = new Map();
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if ((n.nodeValue ?? '').trim() === '') continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width <= 0 && r.height <= 0) continue;
      const key = Math.round(r.top * 2) / 2;
      const cur = buckets.get(key);
      if (cur === undefined) buckets.set(key, { top: key, left: r.left, right: r.right, bottom: r.bottom });
      else { cur.left = Math.min(cur.left, r.left); cur.right = Math.max(cur.right, r.right); cur.bottom = Math.max(cur.bottom, r.bottom); }
    }
  }
  const lines = Array.from(buckets.values());
  let chipCovers = 0;
  if (chipBox !== null) {
    for (const l of lines) {
      if (l.left < chipBox.right && chipBox.left < l.right && l.top < chipBox.bottom && chipBox.top < l.bottom) chipCovers += 1;
    }
  }

  // EVERY CLOSING PIPE, and the mark fragments that pass the one on their own
  // row. This is the "rule" research 113 §5.2 identified: in markdown source a
  // table's closing pipes stack into the only vertical line the view draws.
  const pipes = [];
  const w3 = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = w3.nextNode(); n !== null; n = w3.nextNode()) nodes.push(n);
  for (const n of nodes) {
    const t = n.nodeValue || '';
    if (t.indexOf('|') < 0) continue;
    for (let i = 0; i < t.length; i += 1) {
      if (t.charAt(i) !== '|') continue;
      const range = document.createRange();
      range.setStart(n, i); range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (r === undefined) continue;
      pipes.push({ right: +r.right.toFixed(2), top: Math.round(r.top * 2) / 2 });
    }
  }
  const lastPipeOnRow = new Map();
  for (const p of pipes) {
    const cur = lastPipeOnRow.get(p.top);
    if (cur === undefined || p.right > cur) lastPipeOnRow.set(p.top, p.right);
  }
  let pastPipe = 0;
  for (const f of fragments) {
    const edge = lastPipeOnRow.get(f.top);
    if (edge !== undefined && f.right - edge > 0.5) pastPipe += 1;
  }

  const barEl = document.querySelector('.ed-redline-bar');
  const acceptAll = barEl ? Array.from(barEl.querySelectorAll('button')).find((b) => (b.textContent || '').indexOf('Accept all') >= 0) : null;
  const countEl = document.querySelector('.ed-redline-bar-count');

  const sbox = scroll.getBoundingClientRect();
  const pbox = page === null ? null : page.getBoundingClientRect();

  return {
    room: view.getAttribute('data-room'),
    scheme: document.documentElement.getAttribute('data-scheme'),
    panelWidth: panel ? +panel.getBoundingClientRect().width.toFixed(2) : null,
    scroll: box(scroll),
    scrollClientWidth: scroll.clientWidth,
    page: box(page),
    rail: box(rail),
    railWidth: rail ? +rail.getBoundingClientRect().width.toFixed(2) : 0,
    bar: box(bar),
    doc: box(doc),
    docMaxWidth: cs.maxWidth,
    docLineHeight: cs.lineHeight,
    docWhiteSpace: cs.whiteSpace,
    docOverflowWrap: cs.overflowWrap,
    docFontSize: cs.fontSize,
    padL: +padL.toFixed(2),
    padR: +padR.toFixed(2),
    contentLeft: +contentLeft.toFixed(2),
    contentRight: +contentRight.toFixed(2),
    chWidth: +chWidth.toFixed(4),
    chUnit: +chUnit.toFixed(4),
    leaves: (() => {
      const bare = (el) => {
        const st = getComputedStyle(el);
        return st.backgroundColor === 'rgba(0, 0, 0, 0)' || st.backgroundColor === 'transparent';
      };
      const all = (sel) => Array.from(doc.querySelectorAll(sel));
      const lone = all('[data-redline-lone]');
      return {
        wordless: all('[data-redline-wordless]').length,
        wordlessWashed: all('[data-redline-wordless]').filter((el) => !bare(el)).length,
        blank: all('[data-redline-blank]').length,
        spacing: all('[data-redline-spacing]').length,
        // RULING 5 EXACTLY AND NO WIDER: a spacing change KEEPS its wash.
        spacingWashed: all('[data-redline-spacing]').filter((el) => !bare(el)).length,
        structural: all('[data-redline-blank]:not([data-redline-spacing])').length,
        structuralWashed: all('[data-redline-blank]:not([data-redline-spacing])').filter((el) => !bare(el)).length,
        // A CHANGE MUST CARRY INK: the lone mark's bar is a pseudo-element, so
        // it is read off the computed style and it adds no node to the count.
        lone: lone.length,
        loneBars: lone.filter((el) => {
          const st = getComputedStyle(el, '::before');
          return st.content !== 'none' && parseFloat(st.width) > 0 && parseFloat(st.height) > 0;
        }).length,
        // NOT DRAWN IS NOT ABSENT: the text node is present and only the
        // stylesheet hides it.
        drop: all('[data-redline-drop]').length,
        dropDrawn: all('[data-redline-drop]').filter((el) => el.getClientRects().length > 0).length,
        dropText: all('[data-redline-drop]').filter((el) => (el.textContent || '').length > 0).length,
        // The document's own text is unchanged by every rule above, which is
        // what "none of them moves a byte" means at the leaves.
        textLength: (doc.textContent || '').length
      };
    })(),
    textColumn: +(dbox.width - padL - padR).toFixed(2),
    docHeight: +dbox.height.toFixed(2),
    deadPercent: +(((sbox.width - dbox.width) / sbox.width) * 100).toFixed(2),
    freeLeft: +(contentLeft - sbox.left).toFixed(2),
    freeRight: +(sbox.right - contentRight).toFixed(2),
    pageFreeLeft: pbox === null ? null : +(pbox.left - sbox.left).toFixed(2),
    pageFreeRight: pbox === null ? null : +(sbox.right - pbox.right).toFixed(2),
    lineBoxesDrawn: lines.length,
    marks: marks.length,
    washed: washed,
    markFragments: frags,
    painted: +painted.toFixed(2),
    pitch: +pitch.toFixed(2),
    markPadRight: +markPadRight.toFixed(2),
    markPadLeft: +markPadLeft.toFixed(2),
    pastColumn: pastColumn,
    crossers: crossers,
    crossersOnWhitespace: crossers.filter((c) => c.whitespace === true).length,
    crossersOnGlyph: crossers.filter((c) => c.whitespace === false).length,
    worstOverhang: crossers.reduce((a, c) => Math.max(a, c.over), 0),
    pastPipe: pastPipe,
    pipes: pipes.length,
    changes: wraps.length,
    worstOutlined: worstOutlined,
    worstFragments: worstFragments,
    chip: chipBox,
    chipArm: chipArm,
    chipCovers: chipCovers,
    acceptAll: box(acceptAll),
    acceptAllPast: acceptAll === null ? null : +(acceptAll.getBoundingClientRect().right - contentRight).toFixed(2),
    count: countEl ? countEl.textContent : null,
    docElements: doc.querySelectorAll('*').length,
    docTextNodes: (() => { let n = 0; const w2 = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT); while (w2.nextNode()) n += 1; return n; })()
  };
})()`;

const RULER_SAFE = `(() => { try { return ${RULER}; } catch (e) { return { ERR: String(e && e.stack ? e.stack : e) }; } })()`;

/**
 * EVERY CHANGE'S BAR, one at a time. `data-current` is what the render puts on
 * and what the stylesheet and the bar both key on, so the mark is driven with
 * the real ⌥↓ chord and the bar is read at each step.
 */
const BAR_NOW = String.raw`(() => {
  const doc = document.querySelector('.ed-redline-doc');
  if (doc === null) return null;
  const wraps = Array.from(doc.querySelectorAll('.ed-redline-change'));
  const cur = wraps.find((w) => w.hasAttribute('data-current'));
  if (cur === undefined) return null;
  const bar = document.querySelector('.ed-redline-rail-bar');
  const st = getComputedStyle(cur);
  const rs = Array.from(cur.getClientRects());
  const b = bar === null ? null : bar.getBoundingClientRect();
  const railEl = document.querySelector('.ed-redline-rail');
  const rail = railEl === null ? null : railEl.getBoundingClientRect();
  return {
    i: wraps.indexOf(cur),
    rects: rs.length,
    outlined: (parseFloat(st.outlineWidth) || 0) > 0 && st.outlineStyle !== 'none' ? rs.length : 0,
    bar: b === null ? null : { top: +b.top.toFixed(2), height: +b.height.toFixed(2), width: +b.width.toFixed(2), left: +b.left.toFixed(2) },
    changeTop: rs.length === 0 ? null : +rs[0].top.toFixed(2),
    changeBottom: rs.length === 0 ? null : +rs[rs.length - 1].bottom.toFixed(2),
    railLeft: rail === null ? null : +rail.left.toFixed(2),
    railRight: rail === null ? null : +rail.right.toFixed(2)
  };
})()`;

const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const docHasChange = `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelector('del,ins') !== null; })()`;
// THE SCROLLER AND NOT THE DOCUMENT, and it answers whether the focus really
// landed. The scroller is what carries `tabIndex={0}` and the view's own
// `onKeyDown`, so it is what the chords are dispatched to; an earlier version
// of this probe focused `.ed-redline-doc` and returned `true` whatever
// happened, which meant every pane after the first stepped exactly once and
// reported "1 of 1 changes drew a bar" — a reading that passes while proving
// nothing.
const focusHost = `(() => { const s = document.querySelector('.ed-redline-scroll'); if (!s) return false; s.focus(); return document.activeElement === s || s.contains(document.activeElement); })()`;

/**
 * THE FIX ROUND'S BAND ROW. Everything is read in ONE evaluation so the panel,
 * the scroller's two boxes, the chip's arm and the scroller's own overflow all
 * describe the same moment.
 *
 * `clientWidth` is the CONTENT box and `getBoundingClientRect().width` is the
 * BORDER box; on this machine they differ by the 10px of vertical scrollbar a
 * document taller than the pane draws. The page is centred in the content box,
 * so the content box is what the chip has to fit inside, and `scrollWidth`
 * against `clientWidth` is whether it did.
 */
const BAND_ROW = String.raw`(() => {
  const round = (n) => Math.round(n * 100) / 100;
  const panelEl = document.querySelector('.ed-panel');
  const scroll = document.querySelector('.ed-redline-scroll');
  const chip = document.querySelector('.ed-redline-chip');
  if (panelEl === null || scroll === null || chip === null) return null;
  const box = scroll.getBoundingClientRect();
  const contentRight = box.left + scroll.clientWidth;
  const c = chip.getBoundingClientRect();
  return {
    panel: round(panelEl.getBoundingClientRect().width),
    border: round(box.width),
    client: scroll.clientWidth,
    arm: chip.getAttribute('data-arm'),
    chipRight: round(c.right),
    contentRight: round(contentRight),
    overhang: round(c.right - contentRight),
    hscroll: scroll.scrollWidth - scroll.clientWidth
  };
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
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 60000);

async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const ALT_DOWN = { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 };
const ALT_UP = { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 1 };

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
  return await cdpEval(cdp, `(() => document.querySelector('.ed-panel').getBoundingClientRect().width)()`, 20000);
}

const readings = { label: LABEL, cells: {}, findings: [] };
const finding = (line) => { readings.findings.push(line); say(`FINDING ${line}`); };

await withElectron(
  {
    label: 'p251',
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
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Page.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }

      await mainEval(main, `(() => { const { BrowserWindow } = require('electron'); const w = BrowserWindow.getAllWindows()[0]; w.setBounds({ x: 0, y: 0, width: 1920, height: 1200 }); return w.getBounds(); })()`);
      await sleep(800);
      readings.windowInner = await cdpEval(cdp, `({ w: window.innerWidth, h: window.innerHeight, dpr: devicePixelRatio })`);
      say(`window inner ${JSON.stringify(readings.windowInner)}`);

      await drive(cdp, { projectPath: project });
      await sleep(1200);
      shellWrite('note.md', V2);
      await sleep(900);
      await drive(cdp, { projectPath: project, openRel: 'note.md', mode: 'diff', editorMode: 'redline' });
      await sleep(1500);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await until(cdp, docHasChange, 20000);
      await sleep(700);

      for (const scheme of ['dark', 'light']) {
        await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: ${JSON.stringify(scheme)} }).then(() => true)`, 30000);
        await sleep(900);
        for (const wanted of [1350, 700, 320]) {
          const got = await setPaneWidth(cdp, wanted);
          await sleep(500);
          const key = `${scheme}-${wanted === 1350 ? '1349' : wanted === 700 ? '699' : '319'}`;
          const rest = await cdpEval(cdp, RULER_SAFE, 120000);
          if (rest === null || rest.ERR !== undefined) {
            finding(`${key}: the ruler did not read the view (${String(rest && rest.ERR)})`);
            continue;
          }
          // WITH A CHANGE CURRENT, and over EVERY change rather than one.
          const focused = await cdpEval(cdp, focusHost);
          if (focused !== true) finding(`${key}: the scroller would not take the keyboard, so the chords drove nothing`);
          await sleep(200);
          // BACK TO THE FIRST CHANGE BEFORE EACH WALK. `stepIndex` CLAMPS at
          // the last change rather than wrapping, which is the product's own
          // rule, so a walk that started where the previous pane's walk ended
          // read one change and stopped. This is what makes the reading below
          // "over every change" rather than over whichever one is current.
          for (let k = 0; k < 40; k += 1) {
            await press(cdp, ALT_UP);
            await sleep(60);
            const at = await cdpEval(cdp, BAR_NOW, 30000);
            if (at !== null && at.i === 0) break;
          }
          await sleep(150);
          const steps = [];
          let barsDrawn = 0;
          let worstOutlined = 0;
          for (let k = 0; k < 40; k += 1) {
            await press(cdp, ALT_DOWN);
            // WAIT FOR THE STEP RATHER THAN SLEEPING THROUGH IT. A fixed sleep
            // read the SAME change twice at the narrow panes, where the step
            // scrolls the document first, and the loop then stopped at one
            // change and reported "1 of 1 drew a bar" — a reading that passes
            // while proving nothing, which is the shape this probe exists to
            // refuse.
            let now = null;
            const started = Date.now();
            for (;;) {
              now = await cdpEval(cdp, BAR_NOW, 30000);
              if (now !== null && !steps.some((s) => s.i === now.i)) break;
              if (Date.now() - started > 1500) break;
              await sleep(60);
            }
            if (now === null) continue;
            if (steps.some((s) => s.i === now.i)) break;
            steps.push(now);
            worstOutlined = Math.max(worstOutlined, now.outlined);
            if (now.bar !== null && now.bar.height > 0) {
              barsDrawn += 1;
              // The bar spans the change it names, first rect's top to last
              // rect's bottom, and sits in the rail rather than on the prose.
              if (Math.abs(now.bar.top - now.changeTop) > 1.5) {
                finding(`${key}: change ${String(now.i)}'s bar starts ${(now.bar.top - now.changeTop).toFixed(2)}px off its first line box`);
              }
              if (Math.abs(now.bar.height - (now.changeBottom - now.changeTop)) > 1.5) {
                finding(`${key}: change ${String(now.i)}'s bar is ${now.bar.height.toFixed(2)}px against a change of ${(now.changeBottom - now.changeTop).toFixed(2)}px`);
              }
              if (now.railRight !== null && now.bar.left + now.bar.width - now.railRight > 0.5) {
                finding(`${key}: change ${String(now.i)}'s bar is drawn past the rail`);
              }
            }
          }
          const current = await cdpEval(cdp, RULER_SAFE, 120000);
          const cell = {
            ...rest,
            asked: wanted,
            gotPanel: got,
            chip: current && current.ERR === undefined ? current.chip : null,
            // THE ARM COMES FROM THE SAME READ AS THE BOX, and it has to. Taken
            // from `rest` — the resting read, before a change is made current —
            // it is null at the first cell of the run and whatever the previous
            // pane's walk left behind at the others, which is a reading about a
            // different moment than the box beside it. That is the defect this
            // row was added to catch, found on itself.
            chipArm: current && current.ERR === undefined ? current.chipArm : null,
            chipCovers: current && current.ERR === undefined ? current.chipCovers : 0,
            acceptAllPast: current && current.ERR === undefined ? current.acceptAllPast : null,
            count: current && current.ERR === undefined ? current.count : null,
            steps: steps.length,
            stepIndexes: steps.map((s) => s.i),
            barsDrawn,
            worstOutlined: Math.max(worstOutlined, rest.worstOutlined)
          };
          readings.cells[key] = cell;
          say(
            `${key}: doc ${cell.doc.width}px of scroller ${cell.scroll.width}px ` +
              `(${cell.deadPercent}% dead), column ${cell.textColumn}px = ` +
              `${(cell.textColumn / cell.chWidth).toFixed(1)} chars, painted ${cell.painted}/${cell.pitch}, ` +
              `rail ${cell.railWidth}px at room=${String(cell.room)}, ` +
              `${String(barsDrawn)} of ${String(steps.length)} changes drew a bar, ` +
              `worst outlined ${String(cell.worstOutlined)}, chip covers ${String(cell.chipCovers)} row(s), ` +
              `Accept all ${String(cell.acceptAllPast)}px past the column; leaves ` +
              `${String(cell.leaves.lone)} lone (${String(cell.leaves.loneBars)} drawing a bar), ` +
              `${String(cell.leaves.spacing)} spacing (${String(cell.leaves.spacingWashed)} washed), ` +
              `${String(cell.leaves.structural)} structural (${String(cell.leaves.structuralWashed)} washed), ` +
              `${String(cell.leaves.wordless)} wordless (${String(cell.leaves.wordlessWashed)} washed), ` +
              `${String(cell.leaves.drop)} dropped (${String(cell.leaves.dropDrawn)} drawn, ${String(cell.leaves.dropText)} still carrying their bytes)`
          );

          // -- THE GRADES -----------------------------------------------------
          for (const f of gradeWash(cell.painted, cell.pitch)) finding(`${key}: ${f}`);
          if (cell.markPadRight > 0) {
            finding(`${key}: a mark carries ${cell.markPadRight}px of TRAILING inline padding, so its wash ends past its last glyph`);
          }
          for (const f of gradeRail(cell.rail, cell.room)) finding(`${key}: ${f}`);
          if (steps.length < 2) {
            finding(`${key}: the chord walk reached ${String(steps.length)} change(s) of ${String(cell.changes)}, so the bar was read on almost nothing`);
          }
          if (steps.length > 0 && barsDrawn !== steps.length) {
            finding(`${key}: ${String(barsDrawn)} of ${String(steps.length)} changes drew a rail bar`);
          }
          if (cell.worstOutlined > 0) {
            finding(`${key}: the current change still draws ${String(cell.worstOutlined)} outlined box(es) on its own wrapper`);
          }
          const clamped = cell.page !== null && cell.pageFreeLeft !== null && cell.pageFreeLeft < 1;
          for (const f of gradeMeasure({ width: cell.doc.width, clamped }, 84, cell.chUnit, cell.padL)) {
            finding(`${key}: ${f}`);
          }
          // RESEARCH 113 §5.3'S RULE, re-derived rather than quoted: every
          // fragment that passes the column's content edge ends on WHITESPACE,
          // which `pre-wrap` paints past the last glyph, and none ends on a
          // visible character. A crossing on a glyph is a different defect.
          if (cell.pastColumn > 0 && cell.crossersOnWhitespace + cell.crossersOnGlyph !== cell.pastColumn) {
            finding(`${key}: ${String(cell.pastColumn - cell.crossersOnWhitespace - cell.crossersOnGlyph)} crossing fragment(s) could not be read at all, so the reading below proves nothing`);
          }
          if (cell.crossersOnGlyph > 0) {
            finding(`${key}: ${String(cell.crossersOnGlyph)} fragment(s) pass the column's content edge ending on a VISIBLE character, which is not research 113 §5.3's mechanism: ${JSON.stringify(cell.crossers.filter((c) => c.whitespace === false))}`);
          }
          if (cell.docWhiteSpace !== 'pre-wrap') {
            finding(`${key}: the document is ${cell.docWhiteSpace} and not pre-wrap, which the projections depend on`);
          }
          // -- THE LEAF RULES, on the face (research 114 §6.5) ---------------
          const lv = cell.leaves;
          if (lv.lone < 1 || lv.wordless < 1 || lv.spacing < 1 || lv.drop < 1) {
            finding(`${key}: the fixture drew ${JSON.stringify(lv)}, so a leaf rule was never exercised`);
          }
          if (lv.loneBars !== lv.lone) {
            finding(`${key}: ${String(lv.lone - lv.loneBars)} lone mark(s) draw NOTHING AT ALL, so a change is invisible while the counter and the chords still offer it`);
          }
          if (lv.wordlessWashed > 0) {
            finding(`${key}: ${String(lv.wordlessWashed)} mark(s) with no letter and no digit still carry a wash`);
          }
          if (lv.structuralWashed > 0) {
            finding(`${key}: ${String(lv.structuralWashed)} structural whitespace mark(s) still carry a wash, which paints a bar past the last glyph on the row`);
          }
          if (lv.spacingWashed !== lv.spacing) {
            finding(`${key}: ${String(lv.spacing - lv.spacingWashed)} spacing change(s) lost their wash, which is ./redline ruling 5 broken`);
          }
          if (lv.dropDrawn > 0) {
            finding(`${key}: ${String(lv.dropDrawn)} dropped separator row(s) are still drawn`);
          }
          if (lv.drop > 0 && lv.dropText !== lv.drop) {
            finding(`${key}: a dropped separator row lost its text node, so "not drawn" became "absent"`);
          }
          if (cell.acceptAllPast !== null && cell.acceptAllPast > 1) {
            finding(`${key}: Accept all sits ${cell.acceptAllPast}px past the column's right content edge`);
          }
        }
      }
      // ---------------------------------------------------------------------
      // THE FIX ROUND'S OWN ARM: THE BAND BOUNDARY, SWEPT.
      //
      // `chipPlace` was handed `scroll.getBoundingClientRect()`, which is the
      // scroller's BORDER box and includes the vertical scrollbar, while the
      // page is centred in its CONTENT box. So the band read a scrollbar's
      // width too generous and the band arm — the one placement in this view
      // that is deliberately OUTSIDE the page — accepted a chip that then hung
      // past the content box, and `.ed-redline-scroll` grew a horizontal
      // scrollbar it has never had, appearing and disappearing as the pointer
      // moved onto and off a change.
      //
      // THE THREE WIDTHS ABOVE CANNOT SEE IT: 1349 is well inside the band,
      // 699 and 319 are well inside the overlay, and the window is 19px wide
      // and adjacent to the 1349px pane research 113 says he works in. So the
      // sweep is 2px steps across the boundary, with a change made current so
      // the chip is really drawn and a document tall enough that the vertical
      // scrollbar is really there.
      {
        await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: "dark" }).then(() => true)`, 30000);
        await sleep(700);
        await setPaneWidth(cdp, 1350);
        await sleep(400);
        await cdpEval(cdp, focusHost);
        await sleep(150);
        await press(cdp, ALT_DOWN);
        await sleep(400);
        const band = [];
        for (let panel = 1300; panel <= 1336; panel += 2) {
          await setPaneWidth(cdp, panel);
          await sleep(350);
          const row = await cdpEval(cdp, BAND_ROW, 30000);
          if (row === null) continue;
          band.push(row);
          say(
            `band: panel ${String(row.panel)} scroller ${String(row.border)}/${String(row.client)} ` +
              `arm ${String(row.arm)} overhang ${String(row.overhang)}px hscroll ${String(row.hscroll)}px`
          );
          if (row.arm === 'band' && row.overhang > 0.5) {
            finding(
              `band: at a panel of ${String(row.panel)} the chip's right edge is ` +
                `${String(row.overhang)}px past the scroller's content box, which is the box ` +
                `the page is centred in`
            );
          }
          if (row.hscroll > 0.5) {
            finding(
              `band: at a panel of ${String(row.panel)} .ed-redline-scroll has ` +
                `${String(row.hscroll)}px of horizontal overflow, so it draws a horizontal ` +
                `scrollbar the redline has never had`
            );
          }
        }
        readings.band = band;
        const armed = band.filter((r) => r.arm === 'band');
        if (armed.length === 0 || armed.length === band.length) {
          finding(
            `band: ${String(armed.length)} of ${String(band.length)} swept widths took the band ` +
              `arm, so the sweep never crossed the boundary and proves nothing`
          );
        } else {
          say(
            `band: the arm turns on between a panel of ` +
              `${String(band.filter((r) => r.arm !== 'band').pop()?.panel)} and ` +
              `${String(armed[0].panel)}, and ${String(armed.length)} of ${String(band.length)} ` +
              `widths are in the band`
          );
        }
      }
      readings.opAfter = operatorCount();
    } finally {
      try { main.close(); } catch { /* closed */ }
      try { cdp.close(); } catch { /* closed */ }
    }
  }
);

writeFileSync(outFile, JSON.stringify(readings, null, 2));
const opAfter = operatorCount();
say(`operator sessions on -L gmux after: ${opAfter} (before ${opBefore})`);
say(`${String(readings.findings.length)} finding(s); readings written to ${outFile}`);
process.exit(opAfter === opBefore ? (readings.findings.length === 0 ? 0 : 1) : 3);
