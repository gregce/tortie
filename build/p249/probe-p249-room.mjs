#!/usr/bin/env node
/**
 * probe-p249-room.mjs — PHASE 249's MEASURE STEP, off the running app.
 *
 * Phase 249 is RESEARCH ONLY and builds nothing. This script changes no
 * product file and asserts no verdict about a design: it READS the five faults
 * the operator's screenshot shows, at three pane widths, over a prose document
 * that carries a markdown table, and prints numbers.
 *
 * ONE Electron on a scratch profile, a scratch HOME and this script's own tmux
 * socket. It spawns no agent, spends no token, opens no keychain, makes no
 * request and touches no machine. The "agent" that writes the new version of
 * the file from outside is a plain /bin/sh.
 *
 * SAFETY. The Electron is started through build/electron-run.mjs, which ends
 * the tree it started in a `finally` whatever happened. The tmux socket is this
 * script's own, ended and unlinked by build/harness-socket.mjs; `gmux` and
 * `default` are refused by name. The operator's own -L gmux sessions are
 * counted before and after, read only, and must not move. Every file this run
 * writes is under GMUX_HARNESS_DIR.
 *
 * WHAT IT READS, one reading per fault:
 *   1. MEASURE   — the panel, the scroller, the document box, the padding, the
 *                  free space either side, the dead space as a percentage, and
 *                  the column in `ch` re-derived from a measured advance width.
 *   2. WRAPPING  — every `.ed-redline-change`, every `del` and every `ins`:
 *                  how many client rects, how many DISTINCT line boxes, and the
 *                  computed `box-decoration-break`, which is what decides
 *                  whether a wrapped mark draws one shape or one per line.
 *   3. THE TABLE — which changes are table lines, what they cost in changes,
 *                  in fragments, in height and in mounted elements.
 *   4. CONTROLS  — the chip's rectangle against the document's first line box
 *                  and against every line box it overlaps, and the accept-all
 *                  bar's button against the column it belongs to.
 *   5. THE EDGE  — every mark fragment's right edge against the column's own
 *                  content edge, and every vertical hairline drawn in the view,
 *                  so "crosses the rule" is a measured set rather than an
 *                  impression.
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
// The graders. Pure, proved under --self-test before any app is launched.
// ---------------------------------------------------------------------------

/** Distinct line boxes a set of rects sits on, bucketed by top to 0.5px. */
export function lineBoxes(rects) {
  const tops = new Set();
  for (const r of rects) tops.add(Math.round(r.top * 2) / 2);
  return tops.size;
}

/** Dead space either side of a centred column, as a percentage of the pane. */
export function deadPercent(paneWidth, columnWidth) {
  if (paneWidth <= 0) return 0;
  return ((paneWidth - columnWidth) / paneWidth) * 100;
}

/**
 * Which fragments cross a vertical edge. A fragment crosses when its right
 * edge is past `edge` by more than the tolerance; a fragment that stops short
 * of it does not. Answers the two sets so a reading that found neither, or
 * found everything, cannot be mistaken for a finding.
 */
export function crossings(fragments, edge, tol) {
  const over = [];
  const under = [];
  for (const f of fragments) {
    if (f.right - edge > tol) over.push(f);
    else under.push(f);
  }
  return { over, under };
}

/** A markdown table line, by the shape the composer will have kept verbatim. */
export function looksLikeTableLine(text) {
  const t = text.trim();
  if (!t.startsWith('|')) return false;
  return t.endsWith('|') || t.includes('|');
}

/** A separator row, being the one a reader gets nothing from. */
export function looksLikeSeparatorRow(text) {
  return /^\s*\|[\s:|-]*\|\s*$/.test(text) && text.includes('-');
}

/** Do two rectangles overlap at all? */
export function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function selfTest() {
  const R = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  const fixtures = [
    ['one rect is one line box', () => lineBoxes([R(0, 10, 5, 15)]), 1],
    ['three rects on one top are one line box', () => lineBoxes([R(0, 10, 5, 15), R(6, 10, 5, 15), R(12, 10.2, 5, 15)]), 1],
    ['two tops are two line boxes', () => lineBoxes([R(0, 10, 5, 15), R(0, 31.45, 5, 15)]), 2],
    ['eight tops are eight line boxes', () => lineBoxes(Array.from({ length: 8 }, (_, i) => R(0, i * 21.45, 5, 15))), 8],
    ['a full-width column is 0% dead', () => Math.round(deadPercent(800, 800)), 0],
    ['a half-width column is 50% dead', () => Math.round(deadPercent(800, 400)), 50],
    ['68ch in a 1350px pane', () => Math.round(deadPercent(1350, 556.816)), 59],
    ['a zero pane is 0%', () => deadPercent(0, 100), 0],
    ['a fragment past the edge crosses', () => crossings([R(0, 0, 110, 15)], 100, 0.5).over.length, 1],
    ['a fragment short of the edge does not', () => crossings([R(0, 0, 90, 15)], 100, 0.5).over.length, 0],
    ['a fragment inside tolerance does not', () => crossings([R(0, 0, 100.3, 15)], 100, 0.5).over.length, 0],
    ['both sets are answered', () => crossings([R(0, 0, 110, 15), R(0, 0, 90, 15)], 100, 0.5).under.length, 1],
    ['a table row is a table line', () => (looksLikeTableLine('| a | b |') ? 1 : 0), 1],
    ['prose is not a table line', () => (looksLikeTableLine('The quick brown fox.') ? 1 : 0), 0],
    ['a separator row is one', () => (looksLikeSeparatorRow('| --- | :--- |') ? 1 : 0), 1],
    ['a data row is not a separator', () => (looksLikeSeparatorRow('| a | b |') ? 1 : 0), 0],
    ['overlapping boxes overlap', () => (overlaps(R(0, 0, 50, 20), R(10, 10, 50, 20)) ? 1 : 0), 1],
    ['touching boxes do not overlap', () => (overlaps(R(0, 0, 50, 20), R(50, 0, 50, 20)) ? 1 : 0), 0],
    ['boxes on different rows do not overlap', () => (overlaps(R(0, 0, 50, 20), R(0, 20, 50, 20)) ? 1 : 0), 0]
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
if (!selfTest()) { say('the graders do not behave; refusing to launch anything'); process.exit(1); }

// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(process.execPath, [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', `gmux-p249-${String(process.pid)}`, `node ${process.argv[1]}`], { cwd: REPO, stdio: 'inherit' });
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') { console.error(`${TAG} refusing socket ${socket}`); process.exit(2); }
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') { console.error(`${TAG} no GMUX_HARNESS_DIR`); process.exit(2); }
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) { console.error(`${TAG} out/main/index.js is missing. Run npm run build.`); process.exit(2); }

const operatorCount = () => (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
const opBefore = operatorCount();
say(`operator sessions on -L gmux before: ${opBefore}`);

mkdirSync(join(harnessDir, 'p249'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p249'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const shots = join(root, 'shots');
const outFile = join(REPO, 'build', 'p249', 'out-room.json');
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

// ---------------------------------------------------------------------------
// THE FIXTURE. A prose document with a markdown table in it, of the shape the
// operator's own screenshot shows: long paragraphs whose changed passages are
// long enough to wrap at every pane width, and a table whose every row really
// did change, which is fault 3's own condition (Phase 246 correctly does not
// help when the whole block changed).
// ---------------------------------------------------------------------------
// A paragraph whose two sides share no word at all, long enough that the word
// level edit distance passes REDLINE_MAX_EDIT_LENGTH (200) and ./redline-document
// draws the block whole: the old text struck through, then the new text
// inserted. That is the shape of the operator's screenshot, and it is the only
// shape in which one marked run spans many wrapped lines.
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

The paragraph below this one is the passage the operator rewrote from end to end, and it is here because a change that replaces a whole paragraph is the shape his screenshot shows and the shape a word level reading cannot make smaller.

Sessions live in the private server and the app is a disposable client, so a person may quit the window at any time and every agent goes on working exactly as it was, which is the property the whole product is built on and the one nobody may trade away for a nicer picture.

${BIG_A}

A session is addressed by identity and never by name, so a live session that carries neither of the two stamps is not ours, and the supervisor will neither adopt it nor end it under any circumstances whatsoever.

Every process that a script starts is ended in a finally block, whatever happened, because a script that kills only on the happy path is a defect and the verifier names it in the verdict rather than in a footnote.
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

The paragraph below this one is the passage the operator rewrote from end to end, and it is here because a change that replaces a whole paragraph is the shape his screenshot shows and the shape a word level reading cannot make smaller.

Nothing durable belongs to the viewer. The multiplexer holds the work, the ledger remembers how each one was started, and the picture on the screen is a reading of both that may be thrown away and drawn again at any moment without a single agent noticing that it went.

${BIG_B}

A session is addressed by identity and never by name, so a live session that carries neither of the two stamps belongs to somebody else, and the supervisor will neither adopt it nor end it under any circumstances whatsoever.

Every process that a script starts is ended in a finally block, whatever happened, because a script that kills only on the happy path is a defect and the verifier names it in the verdict rather than in a footnote.
`;

writeFileSync(join(project, 'note.md'), V1);
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p249@example.invalid');
git('config', 'user.name', 'p249');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// THE RULER, all off the live DOM.
// ---------------------------------------------------------------------------
const RULER = String.raw`(() => {
  const view = document.querySelector('.ed-redline-view');
  const scroll = document.querySelector('.ed-redline-scroll');
  const doc = document.querySelector('.ed-redline-doc');
  const panel = document.querySelector('.ed-panel');
  if (doc === null || view === null) return null;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }; };
  const rects = (el) => Array.from(el.getClientRects()).map((r) => ({ left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }));
  const cs = getComputedStyle(doc);

  // The measured advance of one "0" in the document's own font, which is what
  // a ch really is, so the column can be reported in ch without assuming one.
  const probe = document.createElement('span');
  probe.textContent = '0'.repeat(100);
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
  doc.appendChild(probe);
  const chWidth = probe.getBoundingClientRect().width / 100;
  probe.remove();

  const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
  const contentLeft = doc.getBoundingClientRect().left + padL;
  const contentRight = doc.getBoundingClientRect().right - padR;

  // Every drawn text row's own extent, bucketed by top, so "the column's
  // rendered right edge" is a measurement rather than the max-width.
  const buckets = new Map();
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if ((n.nodeValue ?? '') === '') continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width <= 0 && r.height <= 0) continue;
      const key = Math.round(r.top * 2) / 2;
      const cur = buckets.get(key);
      if (cur === undefined) buckets.set(key, { top: key, left: r.left, right: r.right, bottom: r.bottom, text: n.nodeValue ?? '' });
      else { cur.left = Math.min(cur.left, r.left); cur.right = Math.max(cur.right, r.right); cur.bottom = Math.max(cur.bottom, r.bottom); cur.text += n.nodeValue ?? ''; }
    }
  }
  const lines = Array.from(buckets.values()).sort((a, b) => a.top - b.top).map((l) => ({ top: +l.top.toFixed(2), left: +l.left.toFixed(2), right: +l.right.toFixed(2), bottom: +l.bottom.toFixed(2), text: l.text.slice(0, 60) }));

  // WHICH CHARACTER EACH FRAGMENT ENDS ON. A Range is walked one character at
  // a time and every character is bucketed by the top of its own rect, so the
  // last character of each drawn fragment is a MEASUREMENT rather than a guess
  // about where the browser broke the line. That is what makes "some runs
  // cross the edge and some stop at it" a rule instead of an impression.
  const fragmentEnds = (el) => {
    const node = el.firstChild;
    if (node === null || node.nodeType !== 3) return null;
    const text = node.nodeValue ?? '';
    const seen = new Map();
    const range = document.createRange();
    for (let i = 0; i < text.length; i += 1) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (r === undefined) continue;
      const key = Math.round(r.top * 2) / 2;
      seen.set(key, { ch: text[i], right: +r.right.toFixed(2), index: i });
    }
    return Array.from(seen.entries()).sort((a, b) => a[0] - b[0]).map(([top, v]) => ({ top, lastChar: v.ch, lastRight: v.right }));
  };

  const markInfo = (el, kind) => {
    const rs = rects(el);
    const st = getComputedStyle(el);
    return {
      kind,
      text: (el.textContent ?? '').slice(0, 60),
      rects: rs,
      ends: rs.length > 1 ? fragmentEnds(el) : null,
      rectCount: rs.length,
      decoBreak: st.getPropertyValue('-webkit-box-decoration-break') || st.boxDecorationBreak || '',
      radius: st.borderTopLeftRadius,
      bg: st.backgroundColor
    };
  };

  const changes = Array.from(doc.querySelectorAll('.ed-redline-change')).map((w, i) => {
    const rs = rects(w);
    const st = getComputedStyle(w);
    return {
      i,
      del: w.dataset.changeDel ?? '',
      ins: w.dataset.changeIns ?? '',
      off: Number(w.dataset.changeOff),
      current: w.hasAttribute('data-current'),
      rects: rs,
      union: box(w),
      outline: st.outlineWidth + ' ' + st.outlineStyle,
      boxShadow: st.boxShadow,
      elements: w.querySelectorAll('*').length,
      markCount: w.querySelectorAll('del,ins').length
    };
  });

  const dels = Array.from(doc.querySelectorAll('del')).map((m) => markInfo(m, 'del'));
  const inss = Array.from(doc.querySelectorAll('ins')).map((m) => markInfo(m, 'ins'));

  // Every vertical hairline drawn anywhere in the view, so "the rule" is a
  // measured element rather than a guess about what he is looking at.
  const hairlines = [];
  for (const el of Array.from(view.querySelectorAll('*'))) {
    const s = getComputedStyle(el);
    const l = parseFloat(s.borderLeftWidth) || 0;
    const r = parseFloat(s.borderRightWidth) || 0;
    if (l > 0 || r > 0) {
      const b = el.getBoundingClientRect();
      hairlines.push({ cls: el.className && el.className.toString ? el.className.toString() : '', tag: el.tagName, left: +b.left.toFixed(2), right: +b.right.toFixed(2), l, r, colorL: s.borderLeftColor, colorR: s.borderRightColor });
    }
  }

  const chip = document.querySelector('.ed-redline-chip');
  const bar = document.querySelector('.ed-redline-bar');
  const barButtons = bar ? Array.from(bar.querySelectorAll('button')).map((b) => ({ label: b.getAttribute('aria-label') ?? b.textContent, box: box(b) })) : null;

  return {
    panel: box(panel),
    panelClientWidth: panel ? panel.clientWidth : null,
    view: box(view),
    scroll: box(scroll),
    scrollClientWidth: scroll ? scroll.clientWidth : null,
    scrollHeight: scroll ? scroll.scrollHeight : null,
    doc: box(doc),
    docMaxWidth: cs.maxWidth,
    docFontSize: cs.fontSize,
    docLineHeight: cs.lineHeight,
    docFontFamily: cs.fontFamily,
    docWhiteSpace: cs.whiteSpace,
    docPad: { top: cs.paddingTop, right: cs.paddingRight, bottom: cs.paddingBottom, left: cs.paddingLeft },
    chWidth: +chWidth.toFixed(4),
    contentLeft: +contentLeft.toFixed(2),
    contentRight: +contentRight.toFixed(2),
    lines,
    changes,
    dels,
    inss,
    hairlines,
    chip: box(chip),
    chipText: chip ? chip.textContent : null,
    bar: box(bar),
    barButtons,
    docElements: doc.querySelectorAll('*').length,
    docTextNodes: (() => { let n = 0; const w2 = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT); while (w2.nextNode()) n += 1; return n; })(),
    viewElements: view.querySelectorAll('*').length,
    notes: Array.from(document.querySelectorAll('.ed-redline-view .ed-note .banner-text')).map((n) => n.textContent),
    textLength: (doc.textContent ?? '').length
  };
})()`;



/**
 * EVERY PIPE GLYPH, AS ITS OWN EVALUATION.
 *
 * In a markdown-source redline a table's closing `|` characters stack into a
 * vertical rule down the right of the text column, and that is the only
 * vertical line the view draws anywhere near a mark. Their boxes are read one
 * character at a time through a Range, so "the rule" is a measured set of
 * glyph rectangles rather than a guess about what the operator is looking at.
 *
 * IT IS A SEPARATE EXPRESSION FOR A MEASURED REASON. Folded into the ruler
 * above, `Runtime.evaluate` came back with the number 0 rather than the
 * object the function returns, at every pane width, with the whole body inside
 * a try/catch that never fired and with the same code returning the right
 * answer under plain node. Standalone it answers correctly. Whatever that is,
 * it is the instrument and not the product, and splitting the reading in two
 * costs nothing.
 */
const PIPES = String.raw`(() => {
  const doc = document.querySelector('.ed-redline-doc');
  if (doc === null) return null;
  const out = [];
  const w3 = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = w3.nextNode(); n !== null; n = w3.nextNode()) nodes.push(n);
  for (const n of nodes) {
    const t = n.nodeValue || '';
    if (t.indexOf('|') < 0) continue;
    const parent = n.parentElement;
    const kind = parent === null ? '' : parent.tagName.toLowerCase();
    for (let i = 0; i < t.length; i += 1) {
      if (t.charAt(i) !== '|') continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (r === undefined) continue;
      out.push({ left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: Math.round(r.top * 2) / 2, kind: kind });
    }
  }
  return out;
})()`;


/**
 * WHAT MORE MEASURE WOULD BUY, read rather than argued.
 *
 * The document's `max-width` is set INLINE on the live element, one value at a
 * time, and the document is re-measured at each. Nothing under src/ is touched
 * and the inline style is removed at the end, so this is a reading of the
 * shipped view under a hypothesis rather than a change to it.
 */
const SWEEP = String.raw`((value) => {
  const doc = document.querySelector('.ed-redline-doc');
  const scroll = document.querySelector('.ed-redline-scroll');
  if (doc === null) return null;
  if (value === 'RESET') doc.style.removeProperty('max-width');
  else doc.style.maxWidth = value;
  doc.getBoundingClientRect();
  const d = doc.getBoundingClientRect();
  const cs = getComputedStyle(doc);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const buckets = new Map();
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if ((n.nodeValue || '').trim() === '') continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width <= 0 && r.height <= 0) continue;
      const key = Math.round(r.top * 2) / 2;
      const cur = buckets.get(key);
      if (cur === undefined) buckets.set(key, { left: r.left, right: r.right });
      else { cur.left = Math.min(cur.left, r.left); cur.right = Math.max(cur.right, r.right); }
    }
  }
  const lines = Array.from(buckets.values());
  const inner = d.width - pad;
  const fill = lines.length === 0 ? 0 : lines.reduce((a, l) => a + (l.right - l.left), 0) / lines.length / inner;
  let frag = 0, wrapped = 0;
  for (const el of Array.from(doc.querySelectorAll('del,ins'))) {
    const rs = el.getClientRects();
    frag += rs.length;
    const tops = new Set();
    for (const r of Array.from(rs)) tops.add(Math.round(r.top * 2) / 2);
    if (tops.size > 1) wrapped += 1;
  }
  return {
    value: value,
    docWidth: +d.width.toFixed(2),
    textColumn: +inner.toFixed(2),
    docHeight: +d.height.toFixed(2),
    lineBoxes: lines.length,
    meanFill: +(fill * 100).toFixed(1),
    markFragments: frag,
    wrappedMarks: wrapped,
    scrollerWidth: scroll === null ? 0 : scroll.clientWidth
  };
})(VALUE)`;

const RULER_SAFE = `(() => { try { return ${RULER}; } catch (e) { return { ERR: String(e && e.stack ? e.stack : e) }; } })()`;

/**
 * THE DIFF VIEW'S OWN READING. Phase 191's redline is an ANNOTATION ROW under
 * Pierre's two rows, and Pierre draws a gutter beside it. This is the only
 * place in the product where a redline sits next to a vertical rule at all, so
 * fault 5 is asked here as well as in the standalone view.
 */
const DIFF_RULER = String.raw`(() => {
  const host = document.querySelector('diffs-container');
  const rows = Array.from(document.querySelectorAll('.ed-redline'));
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }; };
  const rects = (el) => Array.from(el.getClientRects()).map((r) => ({ left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }));
  const sr = host ? host.shadowRoot : null;
  const gutters = sr ? Array.from(sr.querySelectorAll('[data-gutter]')).map((g) => { const s = getComputedStyle(g); return { box: box(g), borderRight: s.borderRightWidth + ' ' + s.borderRightStyle + ' ' + s.borderRightColor, bg: s.backgroundColor }; }) : [];
  const shadowRules = [];
  if (sr) {
    for (const el of Array.from(sr.querySelectorAll('*'))) {
      const s = getComputedStyle(el);
      const l = parseFloat(s.borderLeftWidth) || 0, r = parseFloat(s.borderRightWidth) || 0;
      if ((l > 0 && s.borderLeftStyle !== 'none') || (r > 0 && s.borderRightStyle !== 'none')) {
        const b = el.getBoundingClientRect();
        if (b.height > 4) shadowRules.push({ tag: el.tagName, attrs: Array.from(el.attributes).map((a) => a.name).join(','), left: +b.left.toFixed(2), right: +b.right.toFixed(2), l, r, colorL: s.borderLeftColor, colorR: s.borderRightColor });
      }
    }
  }
  return {
    host: box(host),
    annotationRows: rows.length,
    rows: rows.slice(0, 6).map((row) => {
      const marks = Array.from(row.querySelectorAll('del,ins')).map((m) => ({ kind: m.tagName.toLowerCase(), text: (m.textContent ?? '').slice(0, 40), rects: rects(m) }));
      const wrapper = row.parentElement;
      return { box: box(row), slot: wrapper ? wrapper.getAttribute('slot') : null, wrapperBox: box(wrapper), marks, whiteSpace: getComputedStyle(row).whiteSpace };
    }),
    gutters: gutters.slice(0, 4),
    shadowRules: shadowRules.slice(0, 8)
  };
})()`;


/** A LIGHT reading for the stepping loop: only the current change's rects. */
const CURRENT_RECTS = String.raw`(() => {
  const doc = document.querySelector('.ed-redline-doc');
  if (doc === null) return null;
  const wraps = Array.from(doc.querySelectorAll('.ed-redline-change'));
  const cur = wraps.find((w) => w.hasAttribute('data-current'));
  if (cur === undefined) return null;
  const chip = document.querySelector('.ed-redline-chip');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) }; };
  const st = getComputedStyle(cur);
  return {
    i: wraps.indexOf(cur),
    del: cur.dataset.changeDel ?? '',
    ins: cur.dataset.changeIns ?? '',
    rects: Array.from(cur.getClientRects()).map((r) => ({ left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) })),
    union: box(cur),
    outline: st.outlineWidth + ' ' + st.outlineStyle + ' ' + st.outlineColor,
    outlineOffset: st.outlineOffset,
    boxShadow: st.boxShadow,
    chip: box(chip)
  };
})()`;

const clickMode = (label) => `(() => { const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label="${label}"]'); if (!b) return false; b.click(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const docHasChange = `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelector('del,ins') !== null; })()`;
const focusHost = `(() => { const d = document.querySelector('.ed-redline-doc'); if (!d) return false; d.focus(); return document.activeElement === d; })()`;

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

async function shot(cdp, name) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'png' }, 30000);
  const data = r.result?.data;
  if (typeof data !== 'string') return null;
  const file = join(shots, `${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

const readings = { widths: {} };

await withElectron(
  {
    label: 'p249',
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
    say('attached to the MAIN process over the node inspector');
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Page.enable');
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (;;) { if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break; await sleep(50); }

      // A wide window, so the WIDE pane really is the pane he works in.
      await mainEval(main, `(() => { const { BrowserWindow } = require('electron'); const w = BrowserWindow.getAllWindows()[0]; w.setBounds({ x: 0, y: 0, width: 1920, height: 1200 }); return w.getBounds(); })()`);
      await sleep(800);
      readings.windowInner = await cdpEval(cdp, `({ w: window.innerWidth, h: window.innerHeight, dpr: devicePixelRatio })`);
      say(`window inner ${JSON.stringify(readings.windowInner)}`);

      await drive(cdp, { projectPath: project });
      await sleep(1200);

      // The agent's version lands from OUTSIDE, after the app is up.
      shellWrite('note.md', V2);
      await sleep(900);

      await drive(cdp, { projectPath: project, openRel: 'note.md', mode: 'diff', editorMode: 'redline' });
      await sleep(1500);
      await cdpEval(cdp, clickMode('Redline'));
      await until(cdp, docSettled, 20000);
      await until(cdp, docHasChange, 20000);
      await sleep(700);

      readings.modeLabels = await cdpEval(cdp, `Array.from(document.querySelectorAll('.ed-tabs-actions .ed-mode button')).map((b) => b.getAttribute('aria-label'))`);
      say(`modes: ${JSON.stringify(readings.modeLabels)}`);

      for (const wanted of [1350, 700, 320]) {
        const got = await setPaneWidth(cdp, wanted);
        await sleep(500);
        say(`--- pane asked ${wanted}, got ${got === null ? 'null' : got.toFixed(2)} ---`);
        // RESTING: nothing current, nothing focused.
        const rest = await cdpEval(cdp, RULER_SAFE, 120000);
        const pipes = await cdpEval(cdp, PIPES, 60000);
        if (rest !== null && typeof rest === 'object') rest.pipes = pipes;
        say(`rest: ${rest === null ? 'null' : String(rest.changes.length)} changes, ${pipes === null ? 0 : pipes.length} pipe glyphs`);
        await shot(cdp, `w${wanted}-rest`);
        // WITH A CHANGE CURRENT: focus the host and step once, which is the
        // state fault 2 and fault 4 are read in.
        await cdpEval(cdp, focusHost);
        await sleep(200);
        await press(cdp, ALT_DOWN);
        await sleep(500);
        const current = await cdpEval(cdp, RULER_SAFE, 120000);
        await shot(cdp, `w${wanted}-current`);
        // Step to the widest wrapped change so the ring is read where it hurts.
        let widest = null;
        const steps = [];
        for (let k = 0; k < 24; k += 1) {
          await press(cdp, ALT_DOWN);
          await sleep(200);
          const cur = await cdpEval(cdp, CURRENT_RECTS, 30000);
          if (cur === null) continue;
          const boxes = lineBoxes(cur.rects);
          steps.push({ i: cur.i, boxes, rects: cur.rects.length, del: cur.del.slice(0, 30), ins: cur.ins.slice(0, 30), chip: cur.chip });
          if (widest === null || boxes > widest.boxes) widest = { boxes, reading: cur };
        }
        if (widest !== null) await shot(cdp, `w${wanted}-widest`);
        readings.widths[String(wanted)] = { asked: wanted, got, rest, current, steps, widest };
      }

      // THE MEASURE SWEEP, at the wide pane.
      await setPaneWidth(cdp, 1350);
      await sleep(500);
      readings.sweep = [];
      for (const v of ['68ch', '76ch', '84ch', '92ch', '100ch', '120ch', 'none', 'RESET']) {
        const one = await cdpEval(cdp, SWEEP.replace('VALUE', JSON.stringify(v)), 60000);
        readings.sweep.push(one);
        if (one !== null) say(`sweep ${v}: column ${one.textColumn}px, ${one.lineBoxes} line boxes, ${one.docHeight}px tall, fill ${one.meanFill}%, ${one.wrappedMarks} wrapped marks over ${one.markFragments} fragments`);
      }

      // THE DIFF VIEW, at the wide pane, because that is the only surface in
      // the product where a redline sits beside a gutter.
      await setPaneWidth(cdp, 1350);
      await sleep(400);
      await cdpEval(cdp, clickMode('Diff'));
      await sleep(2500);
      readings.diff = await cdpEval(cdp, DIFF_RULER, 30000);
      await shot(cdp, 'diff-1350');
      say(`diff: ${readings.diff === null ? 'null' : String(readings.diff.annotationRows)} annotation rows, ${readings.diff === null ? 0 : readings.diff.gutters.length} gutters`);

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
say(`readings written to ${outFile}`);
process.exit(opAfter === opBefore ? 0 : 3);
