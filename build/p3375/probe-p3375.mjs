#!/usr/bin/env node
/**
 * probe:p3375 — selecting text on the phone's Terminal the iPhone way, driven
 * in the Simulator over See a sample (Phase 337.5, build/p3375/SPEC.md §7.3).
 * Verifiers only, under ONE lock slot. It is run as `npm run probe:p3375`.
 *
 * WHAT IS REAL IN A RUN
 *   - THE PHONE ALONE. HEAD's DEBUG app, and with P3375_PARENT_IOS the
 *     parent's, each built for testing by build/simulator-run.mjs's
 *     xcodebuildRun into this run's scratch: the parent's ios/ is COPIED into
 *     the run directory with HEAD's ios/TortieUITests/P3375SelectUITests.swift
 *     added, so both builds are read by one instrument. Simulators through
 *     withSimulator, ONE AT A TIME: an iPhone 16 Pro on iOS 26.3, then one on
 *     the iOS 18.3 floor, each shut down and deleted in the helper's `finally`.
 *     On each, HEAD's arms run first, then the parent's, the parent's app
 *     installed over HEAD's.
 *   - THE SAMPLE. Every UI test method launches the app with
 *     -TortieDebugForgetPairing and -TortieDebugStill, presses
 *     `pairing-see-sample`, selects the Sessions tab by its Copy.swift word,
 *     opens `row-sample-1` (80 × 30, one page of 60 rows of history, its
 *     first variant) and drives its Terminal. The sample's world is in the app:
 *     NO DOOR, NO MAC, NO ELECTRON, no tmux, no Tailscale, no DNS, no APNs, no
 *     model turn, no vendor agent, no photograph. A visual claim is a frame or
 *     a label XCUITest read.
 *   - THE PASTEBOARD is read inside each arm that copies (N1 to N6) by the
 *     handle's own `pasteboard()` and nothing else in this file: the UI test
 *     prints a `pasteboard` line and waits for this file's acknowledgement (a
 *     file in the run's acks directory), once BEFORE the arm's gestures and
 *     once after its Copy. An empty read after Copy is asked twice more a second apart
 *     and is then UNREADABLE (SPEC §13 item 6), never a pass or a fail; a
 *     read before the arm that already holds the arm's text makes the arm
 *     UNREADABLE, because Copy could not be told from it.
 *   - EVERY EXPECTED TEXT IS RE-DERIVED HERE from ios/Tortie/Sample/sample.json
 *     by the app's own rules, never read from the app: a run's cells per
 *     column (ScreenLayout.cells), a row's label, a word as the run of
 *     non-blank cells around a column (SPEC D4), the selection's text by
 *     absolute index (ScreenSelecting.text: rows joined by a line break,
 *     trailing blanks dropped), a live row `n` at index `depth + n` and a row
 *     of history at its own index. The UI test picks the first candidate word
 *     of this file's plan that is drawn in view and prints the labels of the
 *     rows it took; a label that is not the sample's own for that index makes
 *     the arm UNREADABLE.
 *
 * WHAT IT REFUSES
 *   No `simctl` verb of its own (gate:simulator), no Simulator.app, no
 *   screenshot, no device it did not make, no read of the pasteboard but the
 *   handle's, no shell started (xcodebuild and the helper's simctl alone, with
 *   HISTFILE=/dev/null, a scratch ZDOTDIR and no TERM_SESSION_ID handed down),
 *   nothing installed. Never `-L gmux`, never his profile, keychain or history:
 *   ~/.zsh_history and ~/.bash_history are stat'd before and after (size and
 *   time, nothing else) and a move fails RUN.
 *
 * THE ARMS (SPEC §7.3; exit 0 every arm passed, 1 an arm failed, 2 the run
 * could not start or an arm could not be READ). Each on 26.3 and on 18.3.
 *   HEAD
 *   N1 a long press on a word: the edit menu up with exactly ONE item, Copy;
 *      none of Share…, Translate, Look Up, Search Web, Speak, Writing Tools,
 *      Select All, Cut or Paste anywhere in the app's elements; Copy pressed,
 *      the pasteboard the sample's word. NARROWED BY PHASE 348 (build/p348/
 *      SPEC.md §6, D39 to D42; his ruling of 2026-10-18, "paste natively"):
 *      iOS's own Paste is ADMITTED, and only beside Copy, right after it,
 *      carrying `screen-paste`, exactly where the Mac takes a paste (the
 *      sample's picture says `paste` and `typable`, read from sample.json) and
 *      the clipboard holds text (the handle's own read before the arm). There
 *      the menu is [Copy, Paste]; anywhere else it is [Copy] and Paste stays
 *      forbidden as before. An arm that reads the pasteboard before nothing
 *      (N7) admits either. Every other forbidden word stays
 *   N2 a press that slides along its row: the word to the end column
 *   N3 the end handle dragged three rows down: those rows by absolute index
 *   N4 dragged down into history, a word of history, its end handle dragged
 *      into the live rows: the history rows then the live rows (a wide
 *      character once where the sample holds one; it holds none, said)
 *   N5 the keyboard raised by a tap, then a long press: the selection made,
 *      the key bar still up, Copy works
 *   N6 sideways (the FIRST sideways reading of the menu: anything but Copy
 *      there stops the phase at Tier 3, SPEC §13 item 5): Copy present and
 *      hittable, the pasteboard as N1, no `screen-copy` BUTTON anywhere
 *   N7 a tap on the selection shows the menu; a tap elsewhere leaves no menu,
 *      no selection and no keyboard (a tap where the selection was then
 *      raises the keyboard, which a held selection would not)
 *   SINCE THE FIX ROUND (the verifier's majors, and its minor on this file)
 *   N8 dragged down into history, a word of a live row, its START handle up
 *      onto a row of history: from there to the word
 *   N9 a word, its end handle three rows down, then each handle taken again
 *      and RESTED ON a second (longer than the long press's 0.45 s) before it
 *      moves: the end two rows further, the start two up; every menu Copy
 *      alone, the pasteboard the rows between
 *   N10 on the probe's own COPY of HEAD's ios/, whose every sample page
 *      arrives SLOW_PAGE_SECONDS late (planted in the copy's
 *      SampleReader.swift; the app ships no seam for it): dragged down over
 *      rows not yet fetched, a word of a live row, its start handle up onto
 *      the third row of history: no menu item at the lift (those rows
 *      UNDRAWN then, or UNREADABLE), the menu by itself once they land, Copy
 *      pressed the moment it comes, the pasteboard their text
 *   Every N arm's menu readings also refuse a screen-copy BUTTON beside the
 *   menu, upright as sideways (SPEC D16, replaced, never doubled).
 *   HEAD AND THE PARENT, each graded HEAD against the parent within a pixel
 *   (an iPhone 16 Pro's pixel is a third of a point)
 *   G0 the Terminal's rows are its accessibility elements (since the fix
 *      round, SPEC D20): no text view under the grid and no element carrying
 *      more than a row's text as its value; every live and history row that
 *      is an element reads the sample's own label; the same rows, by
 *      identifier and frame, as the parent
 *   G1 a tap raises the key bar (its frame, the keyboard's and the grid's)
 *   G2 a double tap zooms and a second one zooms back (the cell's size)
 *   G3 a pinch widens the cells
 *   G4 a swipe down draws rows of history and the button back to live, which
 *      returns to the live rows (its frame, the live rows' frames after)
 *   G5 a tap with a selection clears it and raises no keyboard
 *   RUN 0 of this run's devices left, none booted; his history unmoved
 *
 * ENVIRONMENT
 *   P3375_PARENT_IOS=<dir>        the directory holding the parent's ios/
 *                                 (0b87d0af's checkout, build 11); without it
 *                                 G0 to G5 read UNREADABLE and the run exits 2
 *   P3375_ARMS=<ids>              which arms run (default N1 to N10, G0 to G5;
 *                                 RUN is always graded)
 *   P3375_KEEP=1                  keep the run directory: the plan, every line
 *                                 the UI test printed, the acks and the
 *                                 result bundles
 *   P3375_RUNTIMES=26.3,18.3      which devices (default both, in that order)
 *   P3375_RUN_DIR=<dir>           where the run makes its own folder,
 *                                 p3375-probe-<pid> (default /private/tmp;
 *                                 never in the repository or under his
 *                                 home); that folder alone is removed at the
 *                                 end, unless P3375_KEEP=1
 *   P3375_DERIVED_DATA=<dir>      HEAD's derived data (default <run>/dd)
 *   P3375_PARENT_DERIVED_DATA=<dir>  the parent's (default <run>/dd-parent).
 *   P3375_SLOW_DERIVED_DATA=<dir> the slow copy's, for N10 (default
 *                                 <run>/dd-slow). Derived data these three
 *                                 name is the caller's to remove; the
 *                                 defaults go with the run
 *
 *   node build/p3375/probe-p3375.mjs --grader-self-test   (boots nothing)
 *   node build/p3375/probe-p3375.mjs --preflight          (Xcode, the sample; boots nothing)
 *   npm run probe:p3375                                   (the run, under one lock slot)
 *
 * The report is written to out/p3375/probe-p3375.json.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUNTIME_CURRENT, RUNTIME_FLOOR, countDevicesNamed, refuseScratchReason, simulatorHarnessMissing, withSimulator, xcodebuildRun } from '../simulator-run.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p3375]';
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const say = (line) => console.log(`${TAG} ${line}`);
const PID = String(process.pid);

// ---------------------------------------------------------------------------
// The names
// ---------------------------------------------------------------------------

/** The sample's session the arms drive (SPEC §7.3). */
export const SESSION = 'sample-1';
export const SAMPLE_FILE = join(ROOT, 'ios', 'Tortie', 'Sample', 'sample.json');
export const UI_TEST_FILE = join(ROOT, 'ios', 'TortieUITests', 'P3375SelectUITests.swift');
const UI_CLASS = 'TortieUITests/P3375SelectUITests';
/** One XCTest method per arm, so the pasteboard is read inside each. */
export const ARM_METHODS = Object.freeze({
  N1: 'testN1WordPress',
  N2: 'testN2PressAndSlide',
  N3: 'testN3EndHandle',
  N4: 'testN4HistoryIntoLive',
  N5: 'testN5KeyboardUp',
  N6: 'testN6Sideways',
  N7: 'testN7TapInsideThenOutside',
  N8: 'testN8StartHandleIntoHistory',
  N9: 'testN9HandlesHeldBeforeTheyMove',
  N10: 'testN10ReservedRowsWait',
  G0: 'testG0RowsAreTheElements',
  G1: 'testG1TapRaisesKeyBar',
  G2: 'testG2DoubleTapZoom',
  G3: 'testG3Pinch',
  G4: 'testG4SwipeAndBack',
  G5: 'testG5TapClearsSelection'
});
export const ARM_TITLES = Object.freeze({
  N1: 'a long press on a word: the menu is Copy alone, and Copy copies the word',
  N2: 'a press that slides along its row copies the word to the end column',
  N3: 'the end handle dragged three rows down copies those rows',
  N4: 'a word of history, its end handle dragged into the live rows, copies both',
  N5: 'with the keyboard up, a long press selects, the key bar stays, Copy works',
  N6: 'sideways, the menu is Copy alone, and no Copy button is drawn',
  N7: 'a tap on the selection shows the menu; a tap elsewhere clears it, no keyboard',
  N8: 'the start handle dragged up into history copies from there to the word',
  N9: 'each handle rested on a second before it moves still moves only its own end',
  N10: 'over rows not yet fetched no Copy, then the menu by itself, then their text',
  G0: "the Terminal's rows are its accessibility elements, no text view over them, as the parent",
  G1: 'a tap raises the key bar, as the parent',
  G2: 'a double tap zooms and zooms back, as the parent',
  G3: 'a pinch widens the cells, as the parent',
  G4: 'a swipe shows history and the arrow back to live, as the parent',
  G5: 'a tap with a selection clears it without the keyboard, as the parent'
});
export const HEAD_ARMS = Object.freeze(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10', 'G0', 'G1', 'G2', 'G3', 'G4', 'G5']);
export const PARENT_ARMS = Object.freeze(['G0', 'G1', 'G2', 'G3', 'G4', 'G5']);
/** The arm driven on the probe's own copy of HEAD whose sample pages arrive late (the fix round). */
export const SLOW_ARMS = Object.freeze(['N10']);
/** How late the copy's every page arrives, in seconds: past the open, the scroll, the press and the lift. */
export const SLOW_PAGE_SECONDS = 20;
/** The sample's one page read, in ios/Tortie/Sample/SampleReader.swift, as the copy finds it and plants its wait before. */
export const SLOW_ANCHOR = '        try await world.page(sessionId, from: from, count: count, depth: depth, wrap: wrap)\n';
export const SLOW_PLANTED = `        try await Task.sleep(nanoseconds: ${String(SLOW_PAGE_SECONDS)}_000_000_000)\n        return try await world.page(sessionId, from: from, count: count, depth: depth, wrap: wrap)\n`;
/** The copy's SampleReader.swift with the wait planted, or null when its one page read is not there exactly once. */
export function slowSample(text) {
  const t = String(text ?? '');
  return t.split(SLOW_ANCHOR).length === 2 ? t.replace(SLOW_ANCHOR, SLOW_PLANTED) : null;
}
/**
 * What the menu must never offer, nor the app draw anywhere (SPEC D9, §7.3
 * N1). PHASE 348 NARROWED IT (build/p348/SPEC.md §6): `Paste` stays on the
 * list and is forbidden everywhere but in ONE place, the menu's item right
 * after Copy where {@link pasteAdmitted} says the Mac takes a paste and the
 * clipboard holds text (D39: an app-built UICommand with the standard
 * selector, `screen-paste`). Every other word stays forbidden everywhere.
 */
export const FORBIDDEN = Object.freeze(['Share…', 'Translate', 'Look Up', 'Search Web', 'Speak', 'Writing Tools', 'Select All', 'Cut', 'Paste']);
/** The one forbidden word Phase 348 admits, and where: the menu's second item, after Copy (D39). */
export const ADMITTED_BESIDE_COPY = 'Paste';
/** The menu's Paste carries Identifiers.swift's `screen-paste` (build/p348/SPEC.md §5.3). */
export const PASTE_ID = 'screen-paste';
/** An iPhone 16 Pro draws three pixels to a point: "within a pixel" is a third of a point. */
export const PIXEL_PT = 1 / 3 + 1e-6;
/** UIDeviceOrientation's landscapeLeft and landscapeRight. */
const LANDSCAPE = new Set([3, 4]);

/** A word of ios/Tortie/Style/Copy.swift, read as text, or null. */
function copyWordOf(name) {
  let text = '';
  try {
    text = readFileSync(join(ROOT, 'ios', 'Tortie', 'Style', 'Copy.swift'), 'utf8');
  } catch {
    return null;
  }
  const m = new RegExp(`static let ${name}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(text);
  return m === null ? null : m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
export const WORDS = Object.freeze({
  copy: copyWordOf('copy') ?? 'Copy',
  sessions: copyWordOf('sessions') ?? 'Sessions',
  // PHASE 348 (build/p348/SPEC.md §5.2): `paste`, folded into Copy.swift by the integrator.
  paste: copyWordOf('paste') ?? ADMITTED_BESIDE_COPY
});

// ---------------------------------------------------------------------------
// The sample, by the app's own rules
// ---------------------------------------------------------------------------

const SEGMENTER = new Intl.Segmenter('en', { granularity: 'grapheme' });
/** A Swift `Array(String)`: its characters, each a grapheme cluster. */
const characters = (text) => Array.from(SEGMENTER.segment(String(text ?? '')), (s) => s.segment);

/**
 * Each column's character, as ScreenLayout.cells: a run whose characters are
 * as many as its cells gives one each; any other run gives its whole text in
 * its first column and nothing ('') in each one after (a wide cell).
 */
export function cellsOf(runs) {
  const out = [];
  for (const run of runs ?? []) {
    const chars = characters(run?.text);
    const span = Number(run?.cells ?? 0);
    if (chars.length === span) {
      out.push(...chars);
    } else {
      out.push(String(run?.text ?? ''));
      for (let i = 1; i < span; i += 1) out.push('');
    }
  }
  return out;
}

/** A row's label, as ScreenRowModel's: its runs' text, trailing blanks dropped. */
export function labelOf(runs) {
  return (runs ?? []).map((r) => String(r?.text ?? '')).join('').replace(/ +$/u, '');
}

/** A cell is blank when it is a space or past the row's cells (SPEC D4); a wide cell's '' is not. */
export const blankAt = (cells, i) => i >= cells.length || cells[i] === ' ';

/** SPEC D4: the run of non-blank cells around `column`; a blank cell alone. */
export function wordAt(cells, column) {
  if (blankAt(cells, column)) return { start: column, end: column };
  let start = column;
  while (start > 0 && !blankAt(cells, start - 1)) start -= 1;
  let end = column;
  while (!blankAt(cells, end + 1)) end += 1;
  return { start, end };
}

/** Every word of a row, in order. */
export function wordsOf(cells) {
  const out = [];
  let i = 0;
  while (i < cells.length) {
    if (blankAt(cells, i)) {
      i += 1;
      continue;
    }
    const w = wordAt(cells, i);
    out.push(w);
    i = w.end + 1;
  }
  return out;
}

const before = (a, b) => a.row < b.row || (a.row === b.row && a.column < b.column);
/** ScreenSelectionRange.normalised: two cells in reading order. */
export const normalised = (a, b) => (before(b, a) ? { start: b, end: a } : { start: a, end: b });
/** SPEC D3: a press that slides grows the pressed word: before it moves the start, after it the end. */
export function extending(range, p) {
  if (before(p, range.start)) return { start: p, end: range.end };
  if (before(range.end, p)) return { start: range.start, end: p };
  return range;
}
/** SPEC D5: the end moved to `p`, the start held; crossing it swaps which end moves. */
export const movingEnd = (range, p) => normalised(range.start, p);
/** The START handle moved to `p`: crossing the end swaps the ends (D5). */
export const movingStart = (range, p) => normalised(p, range.end);

/** ScreenSelectionRange.columns(on:of:). */
export function columnsOn(range, row, width) {
  if (row < range.start.row || row > range.end.row || width <= 0) return null;
  const last = width - 1;
  const first = row === range.start.row ? Math.min(range.start.column, last) : 0;
  const final = row === range.end.row ? Math.min(range.end.column, last) : last;
  return first <= final ? [first, final] : null;
}

/**
 * ScreenSelecting.text: each row's selected cells joined, trailing blanks
 * dropped, rows joined by a line break, every row by its absolute index; a
 * row with no model is left out, a row with no selected column is empty.
 */
export function selectionText(range, columns, cellsAt) {
  const lines = [];
  for (let row = range.start.row; row <= range.end.row; row += 1) {
    const cells = cellsAt(row);
    if (cells === null) continue;
    const sel = columnsOn(range, row, columns);
    if (sel === null) {
      lines.push('');
      continue;
    }
    let taken = '';
    for (let c = sel[0]; c <= sel[1]; c += 1) if (c < cells.length) taken += cells[c];
    lines.push(taken.replace(/ +$/u, ''));
  }
  return lines.join('\n');
}

/**
 * The sample's session as its Terminal opens it: its first variant's live
 * picture at indices `depth + n`, and its page of history at `from + i`.
 */
export function sampleWorld(sample, id = SESSION) {
  const at = Array.isArray(sample?.ids) ? sample.ids.indexOf(id) : -1;
  const variant = at >= 0 ? (sample?.variants?.[at]?.[0] ?? null) : null;
  const picture = variant === null ? null : (sample?.screen?.[id]?.[variant]?.answer?.screen ?? null);
  const hist = sample?.history?.[id] ?? null;
  if (picture === null || hist === null || !Array.isArray(picture.lines) || !Array.isArray(hist.rows)) {
    throw new Error(`the sample holds no live picture and history for ${id}`);
  }
  const rows = new Map();
  hist.rows.forEach((runs, i) => rows.set(Number(hist.from) + i, runs));
  picture.lines.forEach((runs, n) => rows.set(Number(picture.depth) + n, runs));
  return {
    id,
    variant,
    columns: Number(picture.cols),
    depth: Number(picture.depth),
    liveCount: picture.lines.length,
    histFrom: Number(hist.from),
    histCount: hist.rows.length,
    // PHASE 348 (D30, §4.6 step 6): whether the Terminal this arm opens takes a
    // paste, by the phone's own rule (`pasteOffered`: the picture's `paste` true
    // and it typable), read from the sample's picture rather than the app.
    pastes: samplePastes(picture),
    runsAt: (abs) => rows.get(abs) ?? null
  };
}

/**
 * PHASE 348 (build/p348/SPEC.md D30, §4.6 steps 5 and 6): whether a picture
 * takes a paste, by the phone's `pasteOffered()`: `paste` exactly true and the
 * picture `typable`. A picture with no `paste` key (build 11's sample, a Mac
 * older than this phase) takes none.
 */
export function samplePastes(picture) {
  return picture !== null && typeof picture === 'object' && picture.paste === true && picture.typable === true;
}

/** A row's absolute index: live row n at `depth + n`, a row of history at its own. */
export const absOf = (world, ref) => (ref?.kind === 'live' ? world.depth + Number(ref.n) : ref?.kind === 'history' ? Number(ref.n) : null);
const cellsAtOf = (world) => (abs) => {
  const runs = world.runsAt(abs);
  return runs === null ? null : cellsOf(runs);
};

/** The text an arm's Copy must put on the pasteboard, re-derived from the sample. */
export function expectedText(arm, world, c) {
  const cellsAt = cellsAtOf(world);
  const row = absOf(world, c);
  const cells = cellsAt(row);
  if (cells === null) return null;
  const w = wordAt(cells, Number(c.col));
  let range = { start: { row, column: w.start }, end: { row, column: w.end } };
  if (arm === 'N2') range = extending(range, { row, column: Number(c.toCol) });
  if (arm === 'N3' || arm === 'N4') range = movingEnd(range, { row: absOf(world, c.to), column: Number(c.to.col) });
  if (arm === 'N8') range = movingStart(range, { row: absOf(world, c.to), column: Number(c.to.col) });
  if (arm === 'N9') {
    range = movingEnd(range, { row: absOf(world, c.to), column: Number(c.to.col) });
    range = movingEnd(range, { row: absOf(world, c.hold), column: Number(c.hold.col) });
    range = movingStart(range, { row: absOf(world, c.up), column: Number(c.up.col) });
  }
  if (arm === 'N10') range = movingStart(range, { row: row - Number(c.above), column: Number(c.aboveCol) });
  return selectionText(range, world.columns, cellsAt);
}

/** Whether a selection's text holds a wide cell (a character followed by ''). */
export function wideIn(arm, world, c) {
  const cellsAt = cellsAtOf(world);
  const from = absOf(world, c);
  const to = arm === 'N3' || arm === 'N4' ? absOf(world, c.to) : from;
  for (let row = from; row <= to; row += 1) {
    const cells = cellsAt(row) ?? [];
    if (cells.some((x, i) => x !== '' && x !== ' ' && cells[i + 1] === '')) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The plan: candidate words per arm, each a row in view and a column
// ---------------------------------------------------------------------------

const middle = (w) => Math.floor((w.start + w.end) / 2);
const span = (w) => w.end - w.start + 1;
const wordsOn = (world, abs) => {
  const runs = world.runsAt(abs);
  return runs === null ? [] : wordsOf(cellsOf(runs));
};
/** Where a handle lands on a row: the middle of its longest word, or column 10 on a blank row. */
function landing(world, abs) {
  const ws = wordsOn(world, abs).sort((a, b) => span(b) - span(a) || a.start - b.start);
  return ws.length === 0 ? 10 : middle(ws[0]);
}

/**
 * Live candidates nearest row `pref` first, each row's two longest words of
 * at least `min` cells; `shape` adds the arm's own fields, or drops one.
 */
function liveCandidates(world, pref, min, shape = (c) => c) {
  const out = [];
  const order = [...Array(world.liveCount).keys()].sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref) || a - b);
  for (const n of order) {
    const ws = wordsOn(world, world.depth + n)
      .filter((w) => span(w) >= min)
      .sort((a, b) => span(b) - span(a) || a.start - b.start)
      .slice(0, 2);
    for (const w of ws) {
      const c = shape({ kind: 'live', n, col: middle(w) }, w, n);
      if (c !== null) out.push(c);
    }
  }
  return out;
}

/**
 * Each arm's candidates, in the order the UI test tries them. Each arm
 * prefers a different row, so no two arms copy the same text.
 */
export function buildPlan(sample, words = WORDS) {
  const world = sampleWorld(sample);
  const last = world.liveCount - 1;
  const outside = (c, w, n) => {
    const o = n + 5 <= last ? n + 5 : n - 5;
    return o < 0 ? null : { ...c, outside: { kind: 'live', n: o, col: 40 } };
  };
  const history = [];
  const top = world.histFrom + world.histCount - 1;
  for (let h = top; h >= Math.max(world.histFrom, top - 19); h -= 1) {
    const w = wordsOn(world, h)
      .filter((x) => span(x) >= 6)
      .sort((a, b) => span(b) - span(a) || a.start - b.start)[0];
    if (w === undefined) continue;
    for (const t of [2, 1, 3, 0, 4]) {
      if (t > last) continue;
      history.push({ kind: 'history', n: h, col: middle(w), endCaret: w.end + 1, to: { kind: 'live', n: t, col: landing(world, world.depth + t) } });
    }
  }
  return {
    session: world.id,
    variant: world.variant,
    columns: world.columns,
    depth: world.depth,
    copyWord: words.copy,
    sessionsWord: words.sessions,
    // PHASE 348: the word the menu's admitted Paste carries.
    pasteWord: words.paste ?? ADMITTED_BESIDE_COPY,
    arms: {
      N1: { candidates: liveCandidates(world, 7, 6) },
      N2: {
        candidates: liveCandidates(world, 10, 4, (c, w) => {
          const toCol = Math.min(world.columns - 1, w.end + 15);
          return toCol > w.end ? { ...c, toCol } : null;
        })
      },
      N3: {
        candidates: liveCandidates(world, 2, 6, (c, w, n) =>
          n + 3 <= last ? { ...c, endCaret: w.end + 1, to: { kind: 'live', n: n + 3, col: landing(world, world.depth + n + 3) } } : null
        )
      },
      N4: { scrollRows: 8, candidates: history },
      N5: { candidates: liveCandidates(world, last - 2, 4) },
      N6: { candidates: liveCandidates(world, 20, 4) },
      N7: { candidates: liveCandidates(world, 13, 4, outside) },
      // N8: after a drag of 14 rows into history, a word of one of the first
      // live rows and its START handle up onto a row of history above it.
      N8: { scrollRows: 14, candidates: liveCandidates(world, 0, 6, (c, w, n) => (n > 5 ? null : c)).flatMap((c) => {
        const w = wordAt(cellsOf(world.runsAt(world.depth + c.n)), c.col);
        return [4, 5, 3, 6].filter((t) => world.depth + c.n - t >= world.histFrom && c.n - t < 0).map((t) => ({ ...c, startCaret: w.start, to: { kind: 'history', n: world.depth + c.n - t, col: landing(world, world.depth + c.n - t) } }));
      }) },
      // N9: a word, its end handle three rows down, then each handle taken
      // again and rested on: the end to two rows further, the start two up.
      N9: {
        candidates: liveCandidates(world, 10, 6, (c, w, n) =>
          n - 2 >= 0 && n + 5 <= last
            ? { ...c, startCaret: w.start, endCaret: w.end + 1, to: { kind: 'live', n: n + 3, col: landing(world, world.depth + n + 3) }, hold: { kind: 'live', n: n + 5, col: landing(world, world.depth + n + 5) }, up: { kind: 'live', n: n - 2, col: landing(world, world.depth + n - 2) } }
            : null
        )
      },
      // N10 (the slow copy): after a drag of 14 rows over the rows not yet
      // fetched, a word of one of the first live rows and its START handle
      // up onto the third row of history above live row 0, by arithmetic.
      N10: { scrollRows: 14, candidates: liveCandidates(world, 0, 4, (c, w, n) => (n > 5 ? null : { ...c, startCaret: w.start, above: n + 3, aboveCol: 5 })) },
      G0: { candidates: [] },
      G1: { candidates: [] },
      G2: { candidates: [] },
      G3: { candidates: [] },
      G4: { candidates: [] },
      G5: { candidates: liveCandidates(world, 16, 4, outside) }
    }
  };
}

/** JSON with every object's keys sorted, so the UI test's echo compares with the plan. */
export function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${J(k)}:${canon(value[k])}`)
      .join(',')}}`;
  }
  return J(value);
}

// ---------------------------------------------------------------------------
// Reading one arm's lines
// ---------------------------------------------------------------------------

/**
 * One arm's lines, read into what its grader asks: `pb` maps `<arm>-<seq>` of
 * each `pasteboard` line to what the handle read then.
 */
export function readArm(arm, events, pb) {
  const ev = events.filter((e) => e?.arm === arm).sort((a, b) => Number(a.seq) - Number(b.seq));
  const one = (step, test = () => true) => ev.find((e) => e.step === step && test(e)) ?? null;
  const menus = {};
  for (const e of ev) if (e.step === 'menu' && menus[e.tag] === undefined) menus[e.tag] = e;
  const pbOf = (when) => {
    const line = one('pasteboard', (e) => e.when === when);
    if (line === null) return null;
    return pb.get(`${arm}-${String(line.seq)}`) ?? { missing: true };
  };
  return {
    arm,
    lines: ev.length,
    open: one('open'),
    missing: one('missing'),
    chose: one('chose'),
    menus,
    copy: one('copy'),
    before: pbOf('before'),
    after: pbOf('after'),
    keyboard: one('keyboard'),
    rotated: one('rotated'),
    scrolled: one('scrolled'),
    back: one('back'),
    lifted: one('lifted'),
    appeared: one('appeared'),
    g: one(arm.toLowerCase()),
    done: one('done')
  };
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

/** One verdict: `ok` true, false, or null for UNREADABLE (exit 2, never a pass). */
const verdict = (ok, said) => ({ ok, said });
/** Problems first (a FAIL), then what could not be read (UNREADABLE), then the pass. */
const decide = (problems, unreadable, green) =>
  problems.length > 0 ? verdict(false, problems.join('; ')) : unreadable.length > 0 ? verdict(null, unreadable.join('; ')) : verdict(true, green);

const normalWord = (s) => String(s ?? '').trim().replace(/(?:…|\.\.\.)$/u, '').trim().toLowerCase();
const FORBIDDEN_NORMAL = new Set(FORBIDDEN.map(normalWord));
const PASTE_NORMAL = normalWord(ADMITTED_BESIDE_COPY);
/**
 * Every label in a menu reading (its items and every element of the app) that
 * is a forbidden word. PHASE 348: with `pasteAdmitted`, the word Paste is not
 * counted, because the menu's own Paste is one of the app's elements and the
 * UI test's label list is de-duplicated; where it stands is the menu grader's
 * question ({@link pasteStanding}). Without it, Paste anywhere is forbidden,
 * as it was.
 */
export function forbiddenIn(menu, { pasteAdmitted = false } = {}) {
  const labels = [...(menu?.items ?? []).map((i) => i?.label), ...(menu?.labels ?? [])];
  return [...new Set(labels.filter((l) => FORBIDDEN_NORMAL.has(normalWord(l)) && !(pasteAdmitted && normalWord(l) === PASTE_NORMAL)))];
}

/**
 * PHASE 348 (build/p348/SPEC.md §6): whether Paste is admitted in this arm's
 * menus. `true` where the sample's picture takes a paste and the handle read
 * text on the pasteboard before the arm; `false` where either is not so;
 * `null` where the sample takes one but the arm read the pasteboard before
 * nothing (N7), so either menu is right.
 */
export function pasteAdmitted(r, world) {
  if (world?.pastes !== true) return false;
  if (r?.before === null || r?.before === undefined || r.before.missing === true) return null;
  return typeof r.before.text === 'string' && r.before.text.length > 0;
}

/**
 * Where a menu's Paste stands, when it is admitted: right after Copy, ONE of
 * it, carrying `screen-paste`, and (when the UI test reports elements by that
 * id, `pastes`) drawn as the menu's item and never as a button. The problems,
 * or none.
 */
export function pasteStanding(menu, words, tag = '') {
  const p = [];
  const items = menu?.items ?? [];
  const when = tag === '' ? '' : ` ${tag}`;
  const at = items.findIndex((i) => normalWord(i?.label) === normalWord(words.paste));
  if (at === -1) return p;
  if (items.filter((i) => normalWord(i?.label) === normalWord(words.paste)).length > 1) p.push(`the menu${when} offered ${words.paste} twice`);
  if (at !== 1 || normalWord(items[0]?.label) !== normalWord(words.copy)) p.push(`the menu's ${words.paste}${when} is not the item right after ${words.copy}`);
  if (items[at]?.id !== PASTE_ID) p.push(`the menu's ${words.paste}${when} is identified ${J(items[at]?.id ?? null)}, not ${PASTE_ID} (build/p348/SPEC.md §5.3)`);
  if ((menu?.pastes ?? []).some((x) => x?.button === true || x?.menuItem === false)) p.push(`${PASTE_ID} is drawn${when} as something other than the menu's item (no Paste key, build/p348/SPEC.md §12)`);
  return p;
}
const itemLabels = (menu) => (menu?.items ?? []).map((i) => String(i?.label ?? ''));
const copyAlone = (menu, word) => J(itemLabels(menu)) === J([word]);
/** The edit menu's Copy carries Identifiers.swift's `screen-copy` (SPEC D8, D18; §14 M8). */
const COPY_ID = 'screen-copy';
const copyHittable = (menu, word) => (menu?.items ?? []).some((i) => i?.label === word && i?.hittable === true);

/** The arm reached the Terminal, or why not. */
function reached(r, u) {
  if (r.lines === 0) u.push('the UI test printed no line for this arm');
  else if (r.missing !== null) u.push(`the drive could not reach ${String(r.missing.at)}`);
  else if (r.open === null || r.open.ok !== true) u.push('the Terminal never drew');
  return u.length === 0;
}

/** The candidate the drive took: one of the plan's, its rows the sample's own. */
function taken(r, plan, world, u) {
  if (r.chose === null) {
    u.push('the drive printed no choice');
    return null;
  }
  const c = r.chose.candidate;
  if (c === null || c === undefined) {
    u.push('no candidate word of the plan was drawn in view');
    return null;
  }
  const listed = plan?.arms?.[r.arm]?.candidates ?? [];
  if (!listed.some((x) => canon(x) === canon(c))) {
    u.push(`the drive pressed ${canon(c)}, which the plan did not name`);
    return null;
  }
  for (const key of ['start', 'to', 'outside', 'hold', 'up']) {
    const ref = key === 'start' ? c : c[key];
    if (ref === undefined) continue;
    const abs = absOf(world, ref);
    const want = labelOf(world.runsAt(abs));
    const got = r.chose.labels?.[key];
    if (got !== want) {
      u.push(`the ${key} row the drive pressed reads ${J(got)} where the sample's row ${String(abs)} reads ${J(want)}`);
      return null;
    }
  }
  return c;
}

/** The pasteboard after Copy against the sample's own text. */
function clipboard(r, expected, p, u) {
  if (r.after === null || r.after.missing === true) {
    u.push('the pasteboard was not read after Copy');
    return;
  }
  if (r.before !== null && r.before.missing !== true && r.before.text === expected) {
    u.push(`the pasteboard already held ${J(expected)} before the arm, so its Copy cannot be told from it`);
    return;
  }
  if (r.after.text === '') {
    u.push(`the pasteboard read back empty ${String(r.after.reads ?? 1)} time(s) after Copy (an empty read is UNREADABLE, SPEC §13 item 6)`);
    return;
  }
  if (r.after.text !== expected) p.push(`the pasteboard held ${J(r.after.text)} where the sample's own text is ${J(expected)}`);
}

/**
 * Every menu the arm read must offer Copy, hittable, with nothing forbidden
 * anywhere: Copy alone, or (PHASE 348) Copy then Paste exactly where
 * {@link pasteAdmitted} admits it, either where it cannot say.
 */
function menusClean(r, tags, word, p, u, ctx = {}) {
  const words = { copy: word, paste: ctx.pasteWord ?? WORDS.paste };
  const admitted = ctx.world === undefined ? false : pasteAdmitted(r, ctx.world);
  for (const tag of tags) {
    const m = r.menus[tag];
    if (m === undefined) {
      u.push(`the menu was not read ${tag}`);
      continue;
    }
    const withPaste = J(itemLabels(m)) === J([word, words.paste]);
    const shapeOk = admitted === true ? withPaste : admitted === false ? copyAlone(m, word) : copyAlone(m, word) || withPaste;
    const wanted = admitted === true ? `${word} then ${words.paste}` : admitted === false ? `${word} alone` : `${word}, or ${word} then ${words.paste}`;
    const why = admitted === true ? ' (the Mac takes a paste and the clipboard holds text)' : admitted === false && ctx.world?.pastes === true ? ' (the clipboard was empty before the arm)' : '';
    if (!shapeOk) p.push(`the menu ${tag} offered ${J(itemLabels(m))}, not ${wanted}${why}`);
    else if (!copyHittable(m, word)) p.push(`the menu's ${word} ${tag} could not be pressed`);
    else if (m.items[0]?.id !== COPY_ID) p.push(`the menu's ${word} ${tag} is identified ${J(m.items[0]?.id ?? null)}, not ${COPY_ID} (SPEC D8, D18)`);
    if (shapeOk && withPaste) p.push(...pasteStanding(m, words, tag));
    const bad = forbiddenIn(m, { pasteAdmitted: admitted !== false && withPaste });
    if (bad.length > 0) p.push(`with the menu up ${tag} the app drew ${J(bad)}`);
    // Upright as sideways: the menu's Copy REPLACES the button (SPEC D16).
    if ((m.copies ?? []).some((x) => x?.button === true)) p.push(`a screen-copy BUTTON is drawn beside the menu ${tag} (SPEC D16: replaced, never doubled)`);
  }
}

const MENUS = Object.freeze({ N1: ['pressed'], N2: ['pressed'], N3: ['pressed', 'dragged'], N4: ['pressed', 'dragged'], N5: ['pressed'], N6: ['pressed'], N7: ['pressed', 'inside'], N8: ['pressed', 'dragged'], N9: ['pressed', 'dragged', 'end-rested', 'start-rested'], N10: ['pressed', 'came'] });

/** N1 to N10 at HEAD: `ctx` is { plan, world }. */
export function gradeN(r, ctx) {
  const p = [];
  const u = [];
  const { plan, world } = ctx;
  const word = plan.copyWord;
  if (!reached(r, u)) return decide(p, u, '');
  // What must hold before the arm's own choice is read.
  if (r.arm === 'N5') {
    if (r.keyboard === null || r.keyboard.up !== true || r.keyboard.reading?.keyBar == null) u.push('a tap on the Terminal raised no keyboard and key bar, so the long press was not made with them up');
  }
  if (r.arm === 'N6') {
    const o = r.rotated?.reading;
    if (r.rotated === null || !LANDSCAPE.has(Number(o?.orientation)) || !(Number(o?.window?.[0]) > Number(o?.window?.[1]))) u.push('the device did not turn sideways');
    else if ((r.rotated.copies ?? []).length > 0) p.push('sideways with no selection the app drew screen-copy');
  }
  if (r.arm === 'N4' || r.arm === 'N8') {
    if (r.scrolled === null) u.push('the drag into history was not read');
    else if ((r.scrolled.reading?.history ?? []).length === 0) p.push('dragging the Terminal down drew no row of history');
  }
  if (r.arm === 'N10' && r.scrolled === null) u.push('the drag over the rows not yet fetched was not read');
  if (u.length > 0) return decide(p, u, '');
  const c = taken(r, plan, world, u);
  if (c === null) return decide(p, u, '');
  menusClean(r, MENUS[r.arm] ?? ['pressed'], word, p, u, { world, pasteWord: plan.pasteWord });
  // The first sideways reading of the menu: anything but Copy there takes the
  // phase out of Tier 2 (SPEC §1.1, §13 item 5), and the verdict says so.
  if (r.arm === 'N6' && p.some((x) => x.startsWith('the menu ') || x.startsWith('with the menu up'))) p.unshift('TIER 3: the menu sideways is not Copy alone, which stops the phase (SPEC §13 item 5)');
  // N10: the rows the handle reached were not yet fetched when it lifted,
  // the menu offered nothing then, and came by itself once they landed.
  if (r.arm === 'N10') {
    if (r.lifted === null) u.push('the lift over the rows not yet fetched was not read');
    else if ((r.lifted.drawnAtLift ?? []).length > 0) u.push(`the rows the handle reached were already drawn at the lift (${J(r.lifted.drawnAtLift)}), so nothing was waited for`);
    else if (Number(r.lifted.menuItems) > 0) p.push(`the menu offered ${String(r.lifted.menuItems)} item(s) at the lift, over rows not yet fetched (SPEC D10: Copy never copies a blank where a line of his was)`);
    if (r.appeared === null) u.push('the wait for the menu was not read');
    else if (r.appeared.after === null || r.appeared.after === undefined) p.push('the menu never came by itself once the rows landed (SPEC D10: an owed menu is shown by the layout pass that finds them drawn)');
  }
  const pressed = r.menus.pressed;
  if (r.arm === 'N5' && pressed !== undefined) {
    if (pressed.reading?.keyBar == null || pressed.reading?.keyboard == null) p.push('the long press put the keyboard or its key bar away');
    const after = r.menus['after-copy'];
    if (after === undefined) u.push('the Terminal was not read after Copy');
    else if (after.reading?.keyBar == null) p.push('the key bar went after Copy');
  }
  if (r.arm === 'N6' && pressed !== undefined) {
    const copies = pressed.copies ?? [];
    if (copies.some((x) => x?.button === true)) p.push('a screen-copy BUTTON is drawn sideways');
    else if (copies.some((x) => x?.menuItem !== true)) p.push('screen-copy is drawn sideways as something other than the menu\'s item');
  }
  if (r.arm === 'N7') {
    const out = r.menus.outside;
    const again = r.menus.again;
    if (out === undefined) u.push('the Terminal was not read after the tap elsewhere');
    else {
      if (itemLabels(out).length > 0) p.push(`a tap elsewhere left the menu up (${J(itemLabels(out))})`);
      if (out.reading?.keyboard != null) p.push('a tap elsewhere with a selection raised the keyboard');
    }
    if (again === undefined) u.push('the Terminal was not read after the tap where the selection was');
    else {
      if (itemLabels(again).length > 0) p.push('a tap where the selection was showed the menu: the selection was still held');
      if (again.reading?.keyboard == null) p.push('a tap where the selection was raised no keyboard: the selection was still held');
    }
  } else {
    if (r.copy === null) u.push(`the drive printed no ${word} line`);
    else if (r.copy.pressed !== true) p.push(`${word} was not in the menu to press`);
    const expected = expectedText(r.arm, world, c);
    if (expected === null) u.push('the sample holds no row for the word the drive took');
    else clipboard(r, expected, p, u);
  }
  const where = `${c.kind} row ${String(c.n)} column ${String(c.col)}`;
  // PHASE 348: what the menu offered, in the words the arm's admission asks for.
  const pasteNow = pasteAdmitted(r, world);
  const menuWords = pasteNow === true ? `${word} then ${plan.pasteWord ?? WORDS.paste}` : pasteNow === false ? `${word} alone` : `${word} (with ${plan.pasteWord ?? WORDS.paste} admitted)`;
  const wide = r.arm === 'N4' ? (wideIn(r.arm, world, c) ? '; its wide character copied once' : '; the sample holds no wide character on those rows') : '';
  const green = {
    N1: `the word at ${where}: the menu ${menuWords}, nothing forbidden drawn, the pasteboard the sample's word`,
    N2: `the word at ${where} slid to column ${String(c.toCol)}: the pasteboard the sample's cells`,
    N3: `the word at ${where}, its end handle to live row ${String(c.to?.n)}: the pasteboard the sample's rows`,
    N4: `the word at ${where}, its end handle to live row ${String(c.to?.n)}: the history rows then the live rows${wide}`,
    N5: `keyboard up, the word at ${where}: the key bar stayed, the menu ${menuWords}, the pasteboard the word`,
    N6: `sideways, the word at ${where}: the menu ${menuWords} and hittable, no screen-copy button, the pasteboard the word`,
    N7: `the word at ${where}: a tap on it showed the menu, a tap elsewhere left no menu and no keyboard, and a tap where it was raised the keyboard`,
    N8: `the word at ${where}, its start handle up to history row ${String(c.to?.n)}: the pasteboard the sample's rows from there`,
    N9: `the word at ${where}: its end handle to live row ${String(c.to?.n)}, then each handle rested on a second, the end to live row ${String(c.hold?.n)} and the start to live row ${String(c.up?.n)}: the pasteboard the sample's rows, every menu ${menuWords}`,
    N10: `the word at ${where}, its start handle ${String(c.above)} row(s) up onto rows not yet fetched: no menu at the lift, the menu by itself ${Number(r.appeared?.after).toFixed(1)} s later, the pasteboard their text`
  }[r.arm];
  return decide(p, u, green);
}

const near = (a, b, px = PIXEL_PT) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= px;
/** Two frames ([x, y, w, h]) within a pixel, both absent, or neither. */
export function sameFrame(a, b, px = PIXEL_PT) {
  if (a == null || b == null) return a == null && b == null;
  return Array.isArray(a) && Array.isArray(b) && a.length === 4 && b.length === 4 && a.every((x, i) => near(Number(x), Number(b[i]), px));
}
const sameCell = (a, b, px = PIXEL_PT) => Array.isArray(a) && Array.isArray(b) && near(Number(a[0]), Number(b[0]), px) && near(Number(a[1]), Number(b[1]), px);
/** The absolute index of the topmost row drawn. */
function topIndex(reading, depth) {
  const rows = [...(reading?.history ?? []).map((h) => ({ abs: Number(h.i), y: Number(h.frame?.[1]) })), ...(reading?.live ?? []).map((l) => ({ abs: depth + Number(l.n), y: Number(l.frame?.[1]) }))];
  if (rows.length === 0) return null;
  return rows.sort((a, b) => a.y - b.y)[0].abs;
}

/** What G0 to G5 hold of HEAD alone, before it is compared with the parent. */
function headClauses(arm, g, depth, p, u, world = null) {
  if (arm === 'G0') {
    // D20 (the fix round): iOS's accessibility read the content, a
    // UITextInput, as ONE text view whose value was every row laid out, and
    // no row was found under it.
    if (g.read !== true) {
      u.push('the grid was not read');
      return;
    }
    if (Number(g.textViews) > 0) p.push(`${String(g.textViews)} text view(s) under the grid, where the rows are the elements (SPEC D20)`);
    const most = world === null ? 160 : 2 * world.columns;
    if (Number(g.longestValue) > most) p.push(`an element under the grid carries a value of ${String(g.longestValue)} characters, more than any row (SPEC D20)`);
    const live = g.reading?.live ?? [];
    const history = g.reading?.history ?? [];
    if (live.length === 0) p.push('no live row is an accessibility element (SPEC D20)');
    if (world !== null) {
      for (const l of live) {
        const want = labelOf(world.runsAt(world.depth + Number(l.n)));
        if (l.label !== want) p.push(`live row ${String(l.n)} reads ${J(l.label)} where the sample's reads ${J(want)}`);
      }
      for (const h of history) {
        const want = labelOf(world.runsAt(Number(h.i)));
        if (h.label !== want) p.push(`history row ${String(h.i)} reads ${J(h.label)} where the sample's reads ${J(want)}`);
      }
    }
  } else if (arm === 'G1') {
    if (g.up !== true || g.after?.keyBar == null || g.after?.keyboard == null) p.push('a tap raised no keyboard and key bar');
  } else if (arm === 'G2') {
    if (!Array.isArray(g.before) || !Array.isArray(g.zoomed) || !Array.isArray(g.back)) u.push('the cells were not read at each step');
    else {
      if (near(Number(g.zoomed[1]), Number(g.before[1]))) p.push('a double tap did not change the row height');
      if (!sameCell(g.back, g.before)) p.push('a second double tap did not zoom back');
    }
  } else if (arm === 'G3') {
    if (!Array.isArray(g.before) || !Array.isArray(g.pinched)) u.push('the cells were not read before and after the pinch');
    else if (!(Number(g.pinched[0]) > Number(g.before[0]) + PIXEL_PT)) p.push('a pinch did not widen the cells');
  } else if (arm === 'G4') {
    if ((g.swiped?.history ?? []).length === 0) p.push('a swipe down drew no row of history');
    const a = topIndex(g.before, depth);
    const b = topIndex(g.swiped, depth);
    if (a === null || b === null) u.push('no row was read before or after the swipe');
    else if (!(b < a)) p.push('a swipe down did not scroll the Terminal up');
    if (g.toLiveFound !== true || g.swiped?.toLive == null) p.push('no button back to live after the swipe');
    else if (g.back?.toLive != null) p.push('the button back to live did not return to the live rows');
    if ((g.back?.live ?? []).length === 0) p.push('no live row drawn after the button back to live');
  } else if (arm === 'G5') {
    if (g.held?.copy !== true) p.push('a long press drew no Copy');
    if (g.cleared?.copy !== false || g.cleared?.menu === true) p.push('a tap elsewhere left the selection');
    if (g.cleared?.keyboard !== false) p.push('a tap with a selection raised the keyboard');
    if (g.again?.keyboard !== true) p.push('a tap after the selection cleared raised no keyboard');
  }
}

/** Whether a frame ([x, y, w, h]) meets another by more than nothing. */
const meets = (f, g) => Array.isArray(f) && Array.isArray(g) && Number(f[1]) < Number(g[1]) + Number(g[3]) && Number(f[1]) + Number(f[3]) > Number(g[1]) && Number(f[0]) < Number(g[0]) + Number(g[2]) && Number(f[0]) + Number(f[2]) > Number(g[0]);
/** A reading's rows of `kind` ('live' or 'history') whose elements meet the grid's frame: the rows in view. */
export const inView = (reading, kind) => (reading?.[kind] ?? []).filter((x) => meets(x.frame, reading?.grid));
/** The rows of `kind` a reading exposes wholly outside the grid's frame, by index. */
export const outOfView = (reading, kind, key) => (reading?.[kind] ?? []).filter((x) => !meets(x.frame, reading?.grid)).map((x) => Number(x[key]));

/** Where HEAD and the parent differ by more than a pixel, or in what they did. */
function compareG(arm, h, q, p) {
  const differ = (what, a, b) => p.push(`${what}: HEAD ${J(a)}, the parent ${J(b)}`);
  if (arm === 'G0') {
    // The rows IN VIEW, each one whose element meets the grid's frame: a row
    // wholly outside it is seen by no one (337: only the rows in view are
    // spoken), and the parent exposes one such row above the grid that HEAD
    // does not (measured by the fix round on iOS 26.3), so it is said by
    // gradeG and not graded here.
    for (const [kind, key] of [['live', 'n'], ['history', 'i']]) {
      const hm = new Map(inView(h.reading, kind).map((x) => [Number(x[key]), x.frame]));
      const qm = new Map(inView(q.reading, kind).map((x) => [Number(x[key]), x.frame]));
      if (J([...hm.keys()].sort((a, b) => a - b)) !== J([...qm.keys()].sort((a, b) => a - b))) differ(`the ${kind} rows in view that are elements`, [...hm.keys()], [...qm.keys()]);
      else for (const [n, f] of hm) if (!sameFrame(f, qm.get(n))) differ(`${kind} row ${String(n)}'s element`, f, qm.get(n));
    }
  } else if (arm === 'G1') {
    if (!sameFrame(h.after?.keyBar, q.after?.keyBar)) differ('the key bar', h.after?.keyBar, q.after?.keyBar);
    if (!sameFrame(h.after?.keyboard, q.after?.keyboard)) differ('the keyboard', h.after?.keyboard, q.after?.keyboard);
    if (!sameFrame(h.before?.grid, q.before?.grid)) differ('the grid at rest', h.before?.grid, q.before?.grid);
    if (!sameFrame(h.after?.grid, q.after?.grid)) differ('the grid with the keyboard up', h.after?.grid, q.after?.grid);
  } else if (arm === 'G2' || arm === 'G3') {
    for (const k of arm === 'G2' ? ['before', 'zoomed', 'back'] : ['before', 'pinched', 'back']) if (!sameCell(h[k], q[k])) differ(`the cell ${k}`, h[k], q[k]);
  } else if (arm === 'G4') {
    if (!sameFrame(h.swiped?.toLive, q.swiped?.toLive)) differ('the button back to live', h.swiped?.toLive, q.swiped?.toLive);
    const hl = new Map((h.back?.live ?? []).map((l) => [Number(l.n), l.frame]));
    const ql = new Map((q.back?.live ?? []).map((l) => [Number(l.n), l.frame]));
    if (J([...hl.keys()]) !== J([...ql.keys()])) differ('the live rows drawn after the return', [...hl.keys()], [...ql.keys()]);
    else for (const [n, f] of hl) if (!sameFrame(f, ql.get(n))) differ(`live row ${String(n)} after the return`, f, ql.get(n));
  }
  // G5 has no frame to compare: HEAD and the parent each hold its four facts
  // (a Copy drawn, cleared by the tap, no keyboard, a keyboard on the next
  // tap) through headClauses, so the two are equal exactly when both hold.
}

/** G0 to G5: HEAD's clauses, then HEAD against the parent on the same runtime. */
export function gradeG(arm, head, parent, ctx) {
  const p = [];
  const u = [];
  const depth = ctx.plan.depth;
  if (head === null) u.push('HEAD was not driven');
  else if (reached(head, u)) {
    if (head.g === null) u.push(`HEAD's drive printed no ${arm} reading`);
    else headClauses(arm, head.g, depth, p, u, ctx.world ?? null);
  }
  // A HEAD reading that could not be read is compared with nothing.
  const headRead = u.length === 0;
  if (ctx.parentNamed !== true) u.push('P3375_PARENT_IOS names no parent, so HEAD was not compared with it');
  else if (parent === null) u.push(`the parent was not driven${ctx.parentWhy ? ` (${ctx.parentWhy})` : ''}`);
  else {
    const pu = [];
    if (!reached(parent, pu)) u.push(...pu.map((x) => `the parent: ${x}`));
    else if (parent.g === null) u.push(`the parent's drive printed no ${arm} reading`);
    else {
      // The parent is the reference: one that does not hold its own clauses
      // is no measure of HEAD, so the arm is UNREADABLE rather than a FAIL.
      const pp = [];
      headClauses(arm, parent.g, depth, pp, pp, ctx.world ?? null);
      if (pp.length > 0) u.push(`the parent's own reading does not hold (${pp.join('; ')}), so it is no measure of HEAD`);
      else if (headRead) compareG(arm, head.g, parent.g, p);
    }
  }
  let note = '';
  if (arm === 'G0' && head?.g?.reading && parent?.g?.reading) {
    const side = (g) => [...outOfView(g.reading, 'history', 'i').map((i) => `history ${String(i)}`), ...outOfView(g.reading, 'live', 'n').map((n) => `live ${String(n)}`)];
    const ho = side(head.g);
    const qo = side(parent.g);
    if (ho.length > 0 || qo.length > 0) note = `; rows exposed wholly outside the grid, seen by no one and not graded: HEAD ${J(ho)}, the parent ${J(qo)}`;
  }
  return decide(p, u, `${ARM_TITLES[arm]}: HEAD equal to the parent within a pixel${note}`);
}

/** RUN: no device of this run left, none booted, his history unmoved. */
export function gradeRun(r) {
  const p = [];
  const u = [];
  if (r.devices === null) u.push('the Simulator list could not be read');
  else if (r.devices.named > 0 || r.devices.booted > 0) p.push(`${String(r.devices.named)} of this run's device(s) left, ${String(r.devices.booted)} booted`);
  if (r.history === null) u.push("his shell history could not be stat'd");
  else if (r.history.moved) p.push(`his shell history moved across the run: ${J(r.history.before)} then ${J(r.history.after)}`);
  return decide(p, u, `0 of this run's devices left, none booted; ${String(r.pasteboardReads ?? 0)} pasteboard read(s), every one the handle's; his history unmoved`);
}

/**
 * How each test method ended, by its name, from what the run printed: both
 * spellings Xcode prints a case's end in, `-[Module.Class method]` and
 * `Class.method()`. Said beside the verdicts, never graded.
 */
export function outcomesOf(stdout) {
  const out = {};
  for (const m of String(stdout ?? '').matchAll(/Test [Cc]ase '(?:-\[)?(?:TortieUITests\.)?P3375SelectUITests[ .](test\w+)(?:\(\))?\]?' (passed|failed|skipped)/g)) out[m[1]] = m[2];
  return out;
}

/** Which arms the run asked for and never graded, per runtime. */
export function ungradedArms(runtimes, arms, graded) {
  const out = [];
  for (const rt of runtimes) for (const id of HEAD_ARMS) if (arms.has(id) && !(graded[rt] ?? new Set()).has(id)) out.push({ rt, id });
  return out;
}

// ---------------------------------------------------------------------------
// --grader-self-test: every rule on readings written here; boots nothing
// ---------------------------------------------------------------------------

function selfTest() {
  const results = [];
  const check = (name, got, want) => {
    const ok = got.ok === want;
    results.push(ok);
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(66)} ${got.ok === null ? 'UNREADABLE' : got.ok ? 'PASS' : 'FAIL'}: ${String(got.said).slice(0, 140)}`);
  };
  const is = (name, cond, said = '') => {
    results.push(cond === true);
    console.log(`${cond === true ? 'ok  ' : 'FAIL'} ${name.padEnd(66)} ${said}`);
  };
  const clone = (x) => structuredClone(x);

  // The app's rules, on rows written here.
  const run = (text, cells = characters(text).length) => ({ text, style: 0, cells });
  is('cellsOf: a narrow run is one cell a character', J(cellsOf([run('ab c')])) === J(['a', 'b', ' ', 'c']));
  is('cellsOf: a wide character is its text then an empty cell', J(cellsOf([run('x'), run('中', 2), run('y')])) === J(['x', '中', '', 'y']));
  const path = cellsOf([run('  /usr/local/bin/tool-1205 --flag=2')]);
  is('wordAt: a path is one word, whole', J(wordAt(path, 10)) === J({ start: 2, end: 25 }));
  is('wordAt: a blank cell selects itself alone', J(wordAt(path, 0)) === J({ start: 0, end: 0 }));
  is('wordAt: a cell past the row selects itself alone', J(wordAt(path, 70)) === J({ start: 70, end: 70 }));
  const wide = cellsOf([run('W1133 '), run('中文', 4), run(' wide')]);
  is("wordAt: a wide cell's second column belongs to its word", J(wordAt(wide, 7)) === J({ start: 6, end: 9 }));
  const rows = { 0: wide, 1: cellsOf([run('next   ')]), 2: [] };
  const at = (i) => rows[i] ?? null;
  is('selectionText: a wide character once, trailing blanks dropped, rows by line breaks', selectionText({ start: { row: 0, column: 6 }, end: { row: 2, column: 3 } }, 80, at) === '中文 wide\nnext\n');
  is('selectionText: a row with no model is left out', selectionText({ start: { row: 1, column: 0 }, end: { row: 3, column: 3 } }, 80, at) === 'next\n');
  is('extending: a point after the word moves its end', J(extending({ start: { row: 5, column: 4 }, end: { row: 5, column: 8 } }, { row: 5, column: 20 })) === J({ start: { row: 5, column: 4 }, end: { row: 5, column: 20 } }));
  is('extending: a point before it moves its start, inside keeps it', J(extending({ start: { row: 5, column: 4 }, end: { row: 5, column: 8 } }, { row: 5, column: 1 }).start) === J({ row: 5, column: 1 }) && J(extending({ start: { row: 5, column: 4 }, end: { row: 5, column: 8 } }, { row: 5, column: 6 })) === J({ start: { row: 5, column: 4 }, end: { row: 5, column: 8 } }));
  is('movingEnd: crossing the start swaps the ends', J(movingEnd({ start: { row: 5, column: 4 }, end: { row: 5, column: 8 } }, { row: 3, column: 2 })) === J({ start: { row: 3, column: 2 }, end: { row: 5, column: 4 } }));
  is('canon: key order does not matter, values do', canon({ b: 1, a: { d: [1], c: 2 } }) === canon({ a: { c: 2, d: [1] }, b: 1 }) && canon({ a: 1 }) !== canon({ a: 2 }));
  is('forbiddenIn: the system\'s spellings caught, a row\'s sentence not', J(forbiddenIn({ items: [{ label: 'Share...' }], labels: ['Look Up', 'select all', 'Paste the code', 'Copy', 'Cutoff'] })) === J(['Share...', 'Look Up', 'select all']));

  // The committed sample.
  let sample = null;
  try {
    sample = JSON.parse(readFileSync(SAMPLE_FILE, 'utf8'));
  } catch (err) {
    is('the committed sample reads', false, String(err?.message ?? err));
  }
  if (sample !== null) {
    const world = sampleWorld(sample);
    const plan = buildPlan(sample);
    is('the sample: sample-1 opens at its first variant, 80 columns, history from 0, live rows at its depth', world.variant === 'waiting' && world.columns === 80 && world.histFrom === 0 && world.depth === world.histFrom + world.histCount, `${world.variant} ${String(world.columns)}x${String(world.liveCount)}, depth ${String(world.depth)}, ${String(world.histCount)} rows of history`);
    is('the sample: live row 0 is index depth, its label the picture\'s own', labelOf(world.runsAt(absOf(world, { kind: 'live', n: 0 }))) === labelOf(sample.screen[SESSION].waiting.answer.screen.lines[0]));
    is('the sample: a row of history is its own index', labelOf(world.runsAt(absOf(world, { kind: 'history', n: 59 }))) === labelOf(sample.history[SESSION].rows[59]));
    const armsWithWords = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10', 'G5'];
    is('the plan: every arm that presses has candidates', armsWithWords.every((a) => plan.arms[a].candidates.length > 0), armsWithWords.map((a) => `${a} ${String(plan.arms[a].candidates.length)}`).join(', '));
    is('the plan: every candidate\'s rows are the sample\'s', Object.values(plan.arms).every((a) => a.candidates.every((c) => ['start', 'to', 'outside', 'hold', 'up'].every((k) => (k === 'start' ? c : c[k]) === undefined || world.runsAt(absOf(world, k === 'start' ? c : c[k])) !== null))));
    is('the plan: N8 starts live, its start handle up onto history, its caret the word\'s start', plan.arms.N8.candidates.every((c) => c.kind === 'live' && c.to.kind === 'history' && c.startCaret === wordAt(cellsOf(world.runsAt(world.depth + c.n)), c.col).start));
    is('the plan: N9 rests on the end three then five rows down and the start two up', plan.arms.N9.candidates.every((c) => c.to.n === c.n + 3 && c.hold.n === c.n + 5 && c.up.n === c.n - 2 && c.startCaret < c.endCaret));
    is('the plan: N10 reaches the third row of history above live row 0', plan.arms.N10.candidates.every((c) => c.kind === 'live' && world.depth + c.n - c.above === world.depth - 3 && world.runsAt(world.depth - 3) !== null));
    is('the plan: N8, N9 and N10 copy texts of their own', new Set(['N8', 'N9', 'N10', 'N3', 'N4'].map((a) => expectedText(a, world, plan.arms[a].candidates[0]))).size === 5, ['N8', 'N9', 'N10'].map((a) => J(expectedText(a, world, plan.arms[a].candidates[0])).slice(0, 30)).join(' | '));
    {
      const reader = 'func scrollback() async throws -> PocketScrollbackAnswer {\n' + SLOW_ANCHOR + '    }\n';
      const planted = slowSample(reader);
      is('slowSample: the wait planted once, before the page read it returns', planted !== null && planted.includes(`Task.sleep(nanoseconds: ${String(SLOW_PAGE_SECONDS)}_000_000_000)`) && planted.includes('return try await world.page(') && !planted.includes(SLOW_ANCHOR));
      is('slowSample: no page read, or two, plants nothing', slowSample('func scrollback() {}\n') === null && slowSample(reader + SLOW_ANCHOR) === null);
      let committed = null;
      try {
        committed = readFileSync(join(ROOT, 'ios', 'Tortie', 'Sample', 'SampleReader.swift'), 'utf8');
      } catch {}
      is("slowSample: the committed SampleReader.swift takes the wait", committed !== null && slowSample(committed) !== null);
    }
    is('the plan: N4 starts in history and ends live; N3 three rows down', plan.arms.N4.candidates.every((c) => c.kind === 'history' && c.to.kind === 'live') && plan.arms.N3.candidates.every((c) => c.to.n === c.n + 3));
    const firsts = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'].map((a) => expectedText(a, world, plan.arms[a].candidates[0]));
    is('the plan: the arms\' first choices copy six different texts', new Set(firsts).size === 6 && firsts.every((t) => typeof t === 'string' && t.length > 0), firsts.map((t) => J(t).slice(0, 30)).join(' | '));
    is('the plan: N1\'s first word is a path, whole (a slash, no blank)', /^\S*\/\S*$/u.test(expectedText('N1', world, plan.arms.N1.candidates[0])), J(expectedText('N1', world, plan.arms.N1.candidates[0])));
    is('the plan: N4 copies the history row then the live rows', expectedText('N4', world, plan.arms.N4.candidates[0]).split('\n').length === 4, J(expectedText('N4', world, plan.arms.N4.candidates[0])));

    // Honest readings for each arm, written here as the UI test prints them.
    const frame = (y) => [0, y, 402, 10];
    const reading = (extra = {}) => ({ live: [{ n: 0, label: '', frame: frame(300) }], history: [{ i: 50, label: '', frame: frame(200) }], grid: [0, 150, 402, 500], toLive: null, line: null, scrollbackLine: null, keyBar: null, keyboard: null, window: [402, 874], orientation: 1, ...extra });
    const labelsFor = (c) => {
      const out = { start: labelOf(world.runsAt(absOf(world, c))) };
      for (const k of ['to', 'outside', 'hold', 'up']) if (c[k] !== undefined) out[k] = labelOf(world.runsAt(absOf(world, c[k])));
      return out;
    };
    const menu = (tag, extra = {}) => ({ step: 'menu', tag, items: [{ label: 'Copy', id: 'screen-copy', frame: [60, 540, 67, 47], hittable: true }], labels: ['Copy', 'Terminal', 'fix-login-redirect'], copies: [{ type: 41, menuItem: true, button: false }], reading: reading(), ...extra });
    const honest = (arm) => {
      const c = plan.arms[arm].candidates[0];
      const events = [];
      const pb = new Map();
      let seq = 0;
      const push = (o) => {
        seq += 1;
        events.push({ arm, seq, ...o });
        return seq;
      };
      push({ step: 'open', ok: true, reading: reading() });
      if (arm !== 'N7') pb.set(`${arm}-${String(push({ step: 'pasteboard', when: 'before' }))}`, { code: 0, text: '', reads: 1 });
      if (arm === 'N4' || arm === 'N8' || arm === 'N10') push({ step: 'scrolled', reading: reading({ toLive: [340, 700, 44, 44] }) });
      if (arm === 'N5') push({ step: 'keyboard', up: true, reading: reading({ keyboard: [0, 560, 402, 314], keyBar: [0, 516, 402, 44] }) });
      if (arm === 'N6') push({ step: 'rotated', copies: [], reading: reading({ orientation: 3, window: [874, 402] }) });
      push({ step: 'chose', candidate: c, labels: labelsFor(c), reading: reading() });
      const up = () => (arm === 'N5' ? { reading: reading({ keyboard: [0, 560, 402, 314], keyBar: [0, 516, 402, 44] }) } : {});
      push(menu('pressed', up()));
      if (arm === 'N3' || arm === 'N4' || arm === 'N8' || arm === 'N9') push(menu('dragged'));
      if (arm === 'N9') {
        push(menu('end-rested'));
        push(menu('start-rested'));
      }
      if (arm === 'N10') {
        push({ step: 'lifted', menuItems: 0, targets: [world.depth - 3, world.depth - 2, world.depth - 1], drawnAtLift: [], reading: reading() });
        push({ step: 'appeared', after: 7.5 });
        push(menu('came'));
      }
      if (arm === 'N7') {
        push(menu('inside'));
        push(menu('outside', { items: [], copies: [] }));
        push(menu('again', { items: [], copies: [], reading: reading({ keyboard: [0, 560, 402, 314], keyBar: [0, 516, 402, 44] }) }));
      } else {
        push({ step: 'copy', pressed: true, via: 'id' });
        pb.set(`${arm}-${String(push({ step: 'pasteboard', when: 'after' }))}`, { code: 0, text: expectedText(arm, world, c), reads: 1 });
        if (arm === 'N5') push(menu('after-copy', { items: [], copies: [], ...up() }));
      }
      push({ step: 'done', stopped: false });
      return { events, pb, c };
    };
    const ctx = { plan, world };
    const grade = (arm, h) => gradeN(readArm(arm, h.events, h.pb), ctx);
    /** One honest reading with `edit` applied to the line `pick` names. */
    const broken = (arm, pick, edit) => {
      const h = honest(arm);
      const e = h.events.find(pick);
      if (e !== undefined) edit(e, h);
      return h;
    };
    const pbAfter = (h) => {
      const line = h.events.find((e) => e.step === 'pasteboard' && e.when === 'after');
      return `${h.events[0].arm}-${String(line.seq)}`;
    };
    const pbBefore = (h) => {
      const line = h.events.find((e) => e.step === 'pasteboard' && e.when === 'before');
      return `${h.events[0].arm}-${String(line.seq)}`;
    };
    const isMenu = (tag) => (e) => e.step === 'menu' && e.tag === tag;
    for (const arm of ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10']) check(`${arm} honest`, grade(arm, honest(arm)), true);
    // The fix round's arms and clause.
    check('N1 a screen-copy BUTTON upright beside the menu', grade('N1', broken('N1', isMenu('pressed'), (e) => e.copies.push({ type: 9, menuItem: false, button: true }))), false);
    check('N3 a screen-copy BUTTON beside the menu after the handle', grade('N3', broken('N3', isMenu('dragged'), (e) => e.copies.push({ type: 9, menuItem: false, button: true }))), false);
    {
      const h = honest('N8');
      h.pb.set(pbAfter(h), { code: 0, text: expectedText('N1', world, h.c), reads: 1 });
      check('N8 the pasteboard holds the word alone, the start handle moved nothing', grade('N8', h), false);
      check('N8 the drag into history drew no history', grade('N8', broken('N8', (e) => e.step === 'scrolled', (e) => (e.reading.history = []))), false);
      check('N8 the history row the drive aimed at reads another index (UNREADABLE)', grade('N8', broken('N8', (e) => e.step === 'chose', (e) => (e.labels.to = 'x'))), null);
      const r9 = honest('N9');
      const c9 = r9.c;
      // What the build before the fix copied: each rest replaced the
      // selection by the word under the finger and grew it from there, so
      // the last one, on the start, left the word at the start caret grown
      // up to where the finger went.
      const w9 = wordAt(cellsOf(world.runsAt(absOf(world, c9))), c9.startCaret);
      const lost = extending({ start: { row: absOf(world, c9), column: w9.start }, end: { row: absOf(world, c9), column: w9.end } }, { row: absOf(world, c9.up), column: Number(c9.up.col) });
      r9.pb.set(pbAfter(r9), { code: 0, text: selectionText(lost, world.columns, cellsAtOf(world)), reads: 1 });
      check("N9 a rest on a handle replaced the selection (the verifier's V8b)", grade('N9', r9), false);
      const k9 = honest('N9');
      const kept = movingEnd(movingEnd({ start: { row: absOf(world, c9), column: c9.startCaret }, end: { row: absOf(world, c9), column: c9.endCaret - 1 } }, { row: absOf(world, c9.to), column: Number(c9.to.col) }), { row: absOf(world, c9.hold), column: Number(c9.hold.col) });
      k9.pb.set(pbAfter(k9), { code: 0, text: selectionText(kept, world.columns, cellsAtOf(world)), reads: 1 });
      check('N9 the rested start handle moved nothing', grade('N9', k9), false);
      check('N9 the menu after the rest offers Look Up', grade('N9', broken('N9', isMenu('end-rested'), (e) => e.items.push({ label: 'Look Up', id: '', frame: [0, 0, 1, 1], hittable: true }))), false);
      check('N9 the menu after the start rest never read (UNREADABLE)', grade('N9', broken('N9', isMenu('start-rested'), (e) => (e.tag = 'x'))), null);
      check('N9 the held row reads another index (UNREADABLE)', grade('N9', broken('N9', (e) => e.step === 'chose', (e) => (e.labels.hold = 'x'))), null);
      check('N10 Copy offered at the lift over rows not yet fetched', grade('N10', broken('N10', (e) => e.step === 'lifted', (e) => (e.menuItems = 1))), false);
      check('N10 the rows were drawn already at the lift (UNREADABLE)', grade('N10', broken('N10', (e) => e.step === 'lifted', (e) => (e.drawnAtLift = [world.depth - 3]))), null);
      check('N10 the menu never came by itself', grade('N10', broken('N10', (e) => e.step === 'appeared', (e) => (e.after = null))), false);
      check('N10 the lift never read (UNREADABLE)', grade('N10', broken('N10', (e) => e.step === 'lifted', (e) => (e.step = 'x'))), null);
      check('N10 the menu that came offers Share…', grade('N10', broken('N10', isMenu('came'), (e) => e.items.push({ label: 'Share…', id: '', frame: [0, 0, 1, 1], hittable: true }))), false);
      const b10 = honest('N10');
      const blank = expectedText('N10', world, b10.c).split('\n').map((l, i) => (i < 3 ? '' : l)).join('\n');
      b10.pb.set(pbAfter(b10), { code: 0, text: blank, reads: 1 });
      check('N10 Copy wrote blank lines where the rows not yet fetched were', grade('N10', b10), false);
      check('N10 the drag over the rows not yet fetched never read (UNREADABLE)', grade('N10', broken('N10', (e) => e.step === 'scrolled', (e) => (e.step = 'x'))), null);
    }
    // Clauses every arm that copies holds, broken on N1.
    check('N1 the menu offers Share… beside Copy', grade('N1', broken('N1', isMenu('pressed'), (e) => e.items.push({ label: 'Share…', id: '', frame: [0, 0, 1, 1], hittable: true }))), false);
    check('N1 the menu offers Select All beside Copy', grade('N1', broken('N1', isMenu('pressed'), (e) => e.items.unshift({ label: 'Select All', id: '', frame: [0, 0, 1, 1], hittable: true }))), false);
    check('N1 the app draws Translate with the menu up', grade('N1', broken('N1', isMenu('pressed'), (e) => e.labels.push('Translate'))), false);
    check('N1 the app draws Writing Tools with the menu up', grade('N1', broken('N1', isMenu('pressed'), (e) => e.labels.push('Writing Tools'))), false);
    check('N1 no menu after the long press', grade('N1', broken('N1', isMenu('pressed'), (e) => (e.items = []))), false);
    check("N1 the menu's Copy cannot be pressed", grade('N1', broken('N1', isMenu('pressed'), (e) => (e.items[0].hittable = false))), false);
    check('N1 the menu never read (UNREADABLE)', grade('N1', broken('N1', isMenu('pressed'), (e) => (e.tag = 'other'))), null);
    check('N1 Copy not pressed', grade('N1', broken('N1', (e) => e.step === 'copy', (e) => (e.pressed = false))), false);
    {
      const h = honest('N1');
      h.pb.set(pbAfter(h), { code: 0, text: 'Read', reads: 1 });
      check('N1 the pasteboard holds part of the word', grade('N1', h), false);
      const e = honest('N1');
      e.pb.set(pbAfter(e), { code: 0, text: '', reads: 3 });
      check('N1 the pasteboard reads empty after Copy (UNREADABLE)', grade('N1', e), null);
      const s = honest('N1');
      s.pb.set(pbBefore(s), { code: 0, text: expectedText('N1', world, s.c), reads: 1 });
      // The integrator (Phase 348): the committed sample takes a paste since its regeneration (D34), so build 11's
      // sample, which took none, is named here; with a sample that takes one, the word on the clipboard admits Paste.
      check('N1 the pasteboard held the word before the arm (UNREADABLE)', gradeN(readArm('N1', s.events, s.pb), { ...ctx, world: { ...world, pastes: false } }), null);
      const m = honest('N1');
      m.pb.delete(pbAfter(m));
      check('N1 the pasteboard never read after Copy (UNREADABLE)', grade('N1', m), null);
    }
    check('N1 the pressed row is not the sample\'s row (UNREADABLE)', grade('N1', broken('N1', (e) => e.step === 'chose', (e) => (e.labels.start = 'something else'))), null);
    check('N1 a candidate the plan did not name (UNREADABLE)', grade('N1', broken('N1', (e) => e.step === 'chose', (e) => (e.candidate = { ...e.candidate, col: e.candidate.col + 1 }))), null);
    check('N1 no candidate in view (UNREADABLE)', grade('N1', broken('N1', (e) => e.step === 'chose', (e) => (e.candidate = null))), null);
    check('N1 the Terminal never drew (UNREADABLE)', grade('N1', broken('N1', (e) => e.step === 'open', (e) => ((e.step = 'missing'), (e.at = 'terminal')))), null);
    check('N1 no line at all (UNREADABLE)', gradeN(readArm('N1', [], new Map()), ctx), null);
    // N2, N3, N4: their own texts.
    {
      const h = honest('N2');
      h.pb.set(pbAfter(h), { code: 0, text: expectedText('N1', world, { ...h.c }), reads: 1 });
      check('N2 the pasteboard holds the word alone, not the slide', grade('N2', h), false);
      const t = honest('N3');
      t.pb.set(pbAfter(t), { code: 0, text: expectedText('N1', world, t.c), reads: 1 });
      check('N3 the pasteboard holds the word alone, the handle moved nothing', grade('N3', t), false);
      const f = honest('N4');
      f.pb.set(pbAfter(f), { code: 0, text: expectedText('N4', world, f.c).split('\n').slice(1).join('\n'), reads: 1 });
      check('N4 the pasteboard lost the history row', grade('N4', f), false);
    }
    check('N3 the menu after the handle offers Look Up', grade('N3', broken('N3', isMenu('dragged'), (e) => e.items.push({ label: 'Look Up', id: '', frame: [0, 0, 1, 1], hittable: true }))), false);
    check('N3 the menu after the handle never read (UNREADABLE)', grade('N3', broken('N3', isMenu('dragged'), (e) => (e.tag = 'x'))), null);
    check('N4 the drag into history drew no history', grade('N4', broken('N4', (e) => e.step === 'scrolled', (e) => (e.reading.history = []))), false);
    check('N4 the drag into history never read (UNREADABLE)', grade('N4', broken('N4', (e) => e.step === 'scrolled', (e) => (e.step = 'x'))), null);
    check('N4 the history row the drive pressed is another index (UNREADABLE)', grade('N4', broken('N4', (e) => e.step === 'chose', (e) => (e.labels.start = labelOf(world.runsAt(e.candidate.n - 1)) + 'x'))), null);
    // N5.
    check('N5 the keyboard never rose (UNREADABLE)', grade('N5', broken('N5', (e) => e.step === 'keyboard', (e) => (e.up = false))), null);
    check('N5 the long press put the keyboard away', grade('N5', broken('N5', isMenu('pressed'), (e) => (e.reading.keyboard = null))), false);
    check('N5 the long press put the key bar away', grade('N5', broken('N5', isMenu('pressed'), (e) => (e.reading.keyBar = null))), false);
    check('N5 the key bar went after Copy', grade('N5', broken('N5', isMenu('after-copy'), (e) => (e.reading.keyBar = null))), false);
    // N6.
    check('N6 the device did not turn (UNREADABLE)', grade('N6', broken('N6', (e) => e.step === 'rotated', (e) => ((e.reading.orientation = 1), (e.reading.window = [402, 874])))), null);
    check('N6 a Copy drawn sideways with no selection', grade('N6', broken('N6', (e) => e.step === 'rotated', (e) => e.copies.push({ type: 9, button: true }))), false);
    check('N6 a screen-copy BUTTON beside the menu', grade('N6', broken('N6', isMenu('pressed'), (e) => e.copies.push({ type: 9, menuItem: false, button: true }))), false);
    {
      const v = grade('N6', broken('N6', isMenu('pressed'), (e) => e.items.push({ label: 'Share…', id: '', frame: [0, 0, 1, 1], hittable: true })));
      check('N6 the menu sideways offers Share… (Tier 3)', v, false);
      is('N6 a sideways menu that is not Copy alone says TIER 3 first', v.said.startsWith('TIER 3'), v.said.slice(0, 60));
    }
    check('N6 screen-copy drawn as another kind of element', grade('N6', broken('N6', isMenu('pressed'), (e) => e.copies.push({ type: 1, menuItem: false, button: false }))), false);
    check("N1 the menu's Copy is not identified screen-copy", grade('N1', broken('N1', isMenu('pressed'), (e) => (e.items[0].id = ''))), false);
    // PHASE 348 (build/p348/SPEC.md §6, D39 to D42): Paste ADMITTED beside Copy
    // where the sample takes a paste and the clipboard held text before the
    // arm, and nowhere else. The committed sample's own answer is read below;
    // these readings plant a sample that takes one.
    {
      const pctx = { plan, world: { ...world, pastes: true } };
      const pgrade = (arm, h) => gradeN(readArm(arm, h.events, h.pb), pctx);
      const pasteItem = () => ({ label: 'Paste', id: PASTE_ID, frame: [127, 540, 72, 47], hittable: true });
      /** Every menu that drew items gains the admitted Paste after Copy, its element a menu item. */
      const withPaste = (h, edit = () => undefined) => {
        for (const e of h.events) {
          if (e.step !== 'menu' || e.items.length === 0) continue;
          e.items = [...e.items, pasteItem()];
          e.labels = [...e.labels, 'Paste'];
          e.pastes = [{ type: 41, menuItem: true, button: false }];
          edit(e);
        }
        return h;
      };
      const textBefore = (h, text = 'text another app copied') => {
        h.pb.set(pbBefore(h), { code: 0, text, reads: 1 });
        return h;
      };
      check('N1 [Copy, Paste] where the sample takes a paste and the clipboard holds text', pgrade('N1', withPaste(textBefore(honest('N1')))), true);
      check('N1 [Copy] over an empty clipboard, the sample taking a paste', pgrade('N1', honest('N1')), true);
      check('N1 Copy alone where Paste is admitted', pgrade('N1', textBefore(honest('N1'))), false);
      check('N1 Paste offered over an empty clipboard', pgrade('N1', withPaste(honest('N1'))), false);
      // The integrator (Phase 348): build 11's sample is named, because the committed one takes a paste since its regeneration (D34).
      check('N1 Paste offered where the sample takes no paste (build 11\'s sample)', gradeN(readArm('N1', ...((h) => [h.events, h.pb])(withPaste(textBefore(honest('N1'))))), { ...pctx, world: { ...world, pastes: false } }), false);
      check('N1 Paste before Copy', pgrade('N1', withPaste(textBefore(honest('N1')), (e) => e.items.reverse())), false);
      check('N1 Paste not identified screen-paste', pgrade('N1', withPaste(textBefore(honest('N1')), (e) => (e.items[1].id = ''))), false);
      check('N1 Paste drawn as a button beside the menu (a Paste key)', pgrade('N1', withPaste(textBefore(honest('N1')), (e) => e.pastes.push({ type: 9, menuItem: false, button: true }))), false);
      check('N1 Share… beside Copy and Paste', pgrade('N1', withPaste(textBefore(honest('N1')), (e) => e.items.push({ label: 'Share…', id: '', frame: [0, 0, 1, 1], hittable: true }))), false);
      check('N1 Cut drawn while Paste is admitted', pgrade('N1', withPaste(textBefore(honest('N1')), (e) => e.labels.push('Cut'))), false);
      check('N3 [Copy, Paste] after the handle too', pgrade('N3', withPaste(textBefore(honest('N3')))), true);
      check('N3 the menu after the handle drops Paste where it is admitted', pgrade('N3', withPaste(textBefore(honest('N3')), (e) => (e.tag === 'dragged' ? (e.items = e.items.slice(0, 1)) : undefined))), false);
      check('N6 sideways [Copy, Paste] where admitted', pgrade('N6', withPaste(textBefore(honest('N6')))), true);
      check('N7 reads the pasteboard before nothing: [Copy, Paste] admitted', pgrade('N7', withPaste(honest('N7'))), true);
      check('N7 reads the pasteboard before nothing: [Copy] admitted', pgrade('N7', honest('N7')), true);
      check('N7 a menu of Paste alone', pgrade('N7', broken('N7', isMenu('inside'), (e) => (e.items = [pasteItem()]))), false);
      const admittedNow = pgrade('N1', withPaste(textBefore(honest('N1'))));
      is("N1's pass says Copy then Paste where admitted", /Copy then Paste/.test(admittedNow.said), admittedNow.said.slice(0, 80));
      is('forbiddenIn: Paste admitted beside Copy is not forbidden, anything else still is', J(forbiddenIn({ items: [{ label: 'Copy' }, { label: 'Paste' }], labels: ['Copy', 'Paste', 'Cut'] }, { pasteAdmitted: true })) === J(['Cut']) && J(forbiddenIn({ items: [{ label: 'Copy' }], labels: ['Paste'] })) === J(['Paste']));
      is('pasteAdmitted: true over text with a sample that pastes, false over an empty clipboard or a sample that does not, null with no read', pasteAdmitted({ before: { text: 'x' } }, { pastes: true }) === true && pasteAdmitted({ before: { text: '' } }, { pastes: true }) === false && pasteAdmitted({ before: { text: 'x' } }, { pastes: false }) === false && pasteAdmitted({ before: null }, { pastes: true }) === null);
      is('samplePastes: the phone\'s pasteOffered, paste true and typable', samplePastes({ paste: true, typable: true }) === true && samplePastes({ paste: true, typable: false }) === false && samplePastes({ typable: true }) === false && samplePastes(null) === false);
      is(`the committed sample's Terminal ${world.pastes ? 'takes' : 'takes no'} paste (its picture's paste ${J(sample.screen?.[SESSION]?.[world.variant]?.answer?.screen?.paste ?? null)})`, typeof world.pastes === 'boolean');
    }
    // N7.
    check('N7 a tap on the selection showed no menu', grade('N7', broken('N7', isMenu('inside'), (e) => (e.items = []))), false);
    check('N7 a tap elsewhere left the menu up', grade('N7', broken('N7', isMenu('outside'), (e) => (e.items = [{ label: 'Copy', hittable: true }]))), false);
    check('N7 a tap elsewhere raised the keyboard', grade('N7', broken('N7', isMenu('outside'), (e) => (e.reading.keyboard = [0, 560, 402, 314]))), false);
    check('N7 the selection still held: the menu again', grade('N7', broken('N7', isMenu('again'), (e) => (e.items = [{ label: 'Copy', hittable: true }]))), false);
    check('N7 the selection still held: no keyboard', grade('N7', broken('N7', isMenu('again'), (e) => (e.reading.keyboard = null))), false);
    check('N7 the tap elsewhere never read (UNREADABLE)', grade('N7', broken('N7', isMenu('outside'), (e) => (e.tag = 'x'))), null);

    // G1 to G5: HEAD against the parent.
    const tr = (extra = {}) => reading(extra);
    const rowsAt = (ns, is0) => ({ live: ns.map((n, k) => ({ n, label: labelOf(world.runsAt(world.depth + n)), frame: frame(300 + 10 * k) })), history: is0.map((i, k) => ({ i, label: labelOf(world.runsAt(i)), frame: frame(250 + 10 * k) })) });
    const gHonest = {
      G0: { read: true, textViews: 0, longestValue: 0, kinds: { 1: 3, 48: 40 }, reading: tr(rowsAt([0, 1, 2], [58, 59])) },
      G1: { up: true, before: tr(), after: tr({ keyBar: [0, 516, 402, 44], keyboard: [0, 560, 402, 314], grid: [0, 150, 402, 500] }) },
      G2: { before: [5.0, 10.0], zoomed: [10.0, 20.0], back: [5.0, 10.0] },
      G3: { before: [5.0, 10.0], pinched: [10.0, 20.0], back: [5.0, 10.0] },
      G4: { before: tr(), swiped: tr({ history: [{ i: 20, label: '', frame: frame(160) }], live: [], toLive: [340, 700, 44, 44] }), toLiveFound: true, back: tr() },
      G5: { held: { copy: true, menu: true, keyboard: false, keyBar: false }, cleared: { copy: false, menu: false, keyboard: false, keyBar: false }, again: { copy: false, menu: false, keyboard: true, keyBar: true } }
    };
    const gRead = (arm, g) => readArm(arm, [{ arm, seq: 1, step: 'open', ok: true, reading: tr() }, { arm, seq: 2, step: arm.toLowerCase(), ...clone(g) }, { arm, seq: 3, step: 'done' }], new Map());
    const gctx = { plan, world, parentNamed: true };
    const gEdit = (arm, fn) => {
      const g = clone(gHonest[arm]);
      fn(g);
      return gRead(arm, g);
    };
    for (const arm of PARENT_ARMS) check(`${arm} honest, HEAD equal to the parent`, gradeG(arm, gRead(arm, gHonest[arm]), gRead(arm, gHonest[arm]), gctx), true);
    for (const arm of PARENT_ARMS) check(`${arm} no parent named (UNREADABLE)`, gradeG(arm, gRead(arm, gHonest[arm]), null, { plan, world, parentNamed: false }), null);
    check('G1 the parent was not driven (UNREADABLE)', gradeG('G1', gRead('G1', gHonest.G1), null, gctx), null);
    check("G0 HEAD: the Terminal a text view over the rows (the verifier's D20)", gradeG('G0', gEdit('G0', (g) => ((g.textViews = 1), (g.reading.live = []), (g.reading.history = []))), gRead('G0', gHonest.G0), gctx), false);
    check('G0 HEAD: a text view beside the rows', gradeG('G0', gEdit('G0', (g) => (g.textViews = 1)), gRead('G0', gHonest.G0), gctx), false);
    check('G0 HEAD: an element carrying every row as its value', gradeG('G0', gEdit('G0', (g) => (g.longestValue = 2600)), gRead('G0', gHonest.G0), gctx), false);
    check('G0 HEAD: a row element reading another row', gradeG('G0', gEdit('G0', (g) => (g.reading.live[1].label = 'x')), gRead('G0', gHonest.G0), gctx), false);
    check('G0 HEAD: a live row the parent shows is no element', gradeG('G0', gEdit('G0', (g) => g.reading.live.pop()), gRead('G0', gHonest.G0), gctx), false);
    check('G0 HEAD: a history row element a point off the parent', gradeG('G0', gEdit('G0', (g) => (g.reading.history[0].frame[1] += 1)), gRead('G0', gHonest.G0), gctx), false);
    check('G0 the grid never read (UNREADABLE)', gradeG('G0', gEdit('G0', (g) => (g.read = false)), gRead('G0', gHonest.G0), gctx), null);
    {
      // The parent's one more row, wholly above the grid (the fix round's 26.3 reading: 185.0 to 194.67 over a grid from 200).
      const parentAbove = gEdit('G0', (g) => g.reading.history.unshift({ i: 57, label: labelOf(world.runsAt(57)), frame: [0, 140, 402, 10] }));
      const v = gradeG('G0', gRead('G0', gHonest.G0), parentAbove, gctx);
      check('G0 a row the parent exposes wholly above the grid is not graded', v, true);
      is('G0 that row is said beside the pass', v.said.includes('the parent ["history 57"]'), v.said.slice(-90));
      check('G0 HEAD: a row the parent shows inside the grid is no element', gradeG('G0', gEdit('G0', (g) => g.reading.history.shift()), gRead('G0', gHonest.G0), gctx), false);
      check('G0 HEAD: a row the parent shows across the grid\'s top edge is no element', gradeG('G0', gRead('G0', gHonest.G0), gEdit('G0', (g) => g.reading.history.unshift({ i: 57, label: labelOf(world.runsAt(57)), frame: [0, 145, 402, 10] })), gctx), false);
    }
    check("G0 the parent's own grid a text view (UNREADABLE)", gradeG('G0', gRead('G0', gHonest.G0), gEdit('G0', (g) => (g.textViews = 1)), gctx), null);
    check('G1 HEAD never reached the Terminal (UNREADABLE)', gradeG('G1', readArm('G1', [], new Map()), gRead('G1', gHonest.G1), gctx), null);
    check('G1 HEAD: a tap raised no key bar', gradeG('G1', gEdit('G1', (g) => (g.after.keyBar = null)), gRead('G1', gHonest.G1), gctx), false);
    check('G1 the key bar half a point off the parent', gradeG('G1', gEdit('G1', (g) => (g.after.keyBar[1] += 0.5)), gRead('G1', gHonest.G1), gctx), false);
    check('G1 the key bar a fifth of a point off (within a pixel)', gradeG('G1', gEdit('G1', (g) => (g.after.keyBar[1] += 0.2)), gRead('G1', gHonest.G1), gctx), true);
    check('G1 the grid at rest a point off the parent', gradeG('G1', gEdit('G1', (g) => (g.before.grid[3] -= 1)), gRead('G1', gHonest.G1), gctx), false);
    check('G2 HEAD: a double tap did not zoom', gradeG('G2', gEdit('G2', (g) => (g.zoomed = [5.0, 10.0])), gRead('G2', gHonest.G2), gctx), false);
    check('G2 HEAD: the second double tap did not zoom back', gradeG('G2', gEdit('G2', (g) => (g.back = [10.0, 20.0])), gRead('G2', gHonest.G2), gctx), false);
    check('G2 the zoomed cell a point off the parent', gradeG('G2', gEdit('G2', (g) => (g.zoomed[1] += 1)), gRead('G2', gHonest.G2), gctx), false);
    check('G2 a cell never read (UNREADABLE)', gradeG('G2', gEdit('G2', (g) => (g.back = null)), gRead('G2', gHonest.G2), gctx), null);
    check('G3 HEAD: a pinch did not widen the cells', gradeG('G3', gEdit('G3', (g) => (g.pinched = [5.0, 10.0])), gRead('G3', gHonest.G3), gctx), false);
    check('G3 the pinched cell a point off the parent', gradeG('G3', gEdit('G3', (g) => (g.pinched[0] += 1)), gRead('G3', gHonest.G3), gctx), false);
    check('G4 HEAD: the swipe drew no history', gradeG('G4', gEdit('G4', (g) => (g.swiped.history = [])), gRead('G4', gHonest.G4), gctx), false);
    check('G4 HEAD: the swipe did not scroll up', gradeG('G4', gEdit('G4', (g) => (g.swiped = tr({ toLive: [340, 700, 44, 44] }))), gRead('G4', gHonest.G4), gctx), false);
    check('G4 HEAD: no button back to live', gradeG('G4', gEdit('G4', (g) => ((g.toLiveFound = false), (g.swiped.toLive = null))), gRead('G4', gHonest.G4), gctx), false);
    check('G4 HEAD: the button did not return to live', gradeG('G4', gEdit('G4', (g) => (g.back.toLive = [340, 700, 44, 44])), gRead('G4', gHonest.G4), gctx), false);
    check('G4 the button a point off the parent', gradeG('G4', gEdit('G4', (g) => (g.swiped.toLive[0] += 1)), gRead('G4', gHonest.G4), gctx), false);
    check('G4 live row 0 a point off the parent after the return', gradeG('G4', gEdit('G4', (g) => (g.back.live[0].frame[1] += 1)), gRead('G4', gHonest.G4), gctx), false);
    check('G5 HEAD: a long press drew no Copy', gradeG('G5', gEdit('G5', (g) => (g.held.copy = false)), gRead('G5', gEdit('G5', (g) => (g.held.copy = false)).g), gctx), false);
    check('G5 HEAD: the tap left the selection', gradeG('G5', gEdit('G5', (g) => (g.cleared.menu = true)), gRead('G5', gHonest.G5), gctx), false);
    check('G5 HEAD: the tap raised the keyboard', gradeG('G5', gEdit('G5', (g) => (g.cleared.keyboard = true)), gRead('G5', gHonest.G5), gctx), false);
    check('G5 HEAD: the next tap raised no keyboard', gradeG('G5', gEdit('G5', (g) => (g.again.keyboard = false)), gRead('G5', gHonest.G5), gctx), false);
    check("G5 the parent's own reading broken (UNREADABLE)", gradeG('G5', gRead('G5', gHonest.G5), gEdit('G5', (g) => (g.cleared.copy = true)), gctx), null);
    check("G2 the parent's cell never read (UNREADABLE)", gradeG('G2', gRead('G2', gHonest.G2), gEdit('G2', (g) => (g.zoomed = null)), gctx), null);
    check('G1 the keyboard a point off the parent', gradeG('G1', gEdit('G1', (g) => (g.after.keyboard[1] -= 1)), gRead('G1', gHonest.G1), gctx), false);
    check('G3 the cell back a point off the parent', gradeG('G3', gEdit('G3', (g) => (g.back[0] += 1)), gRead('G3', gHonest.G3), gctx), false);
    check('G4 a different set of live rows after the return', gradeG('G4', gEdit('G4', (g) => g.back.live.push({ n: 1, label: '', frame: frame(310) })), gRead('G4', gHonest.G4), gctx), false);

    // RUN.
    const runOk = { devices: { named: 0, booted: 0 }, history: { moved: false }, pasteboardReads: 24 };
    check('RUN honest', gradeRun(runOk), true);
    check('RUN a device of this run left', gradeRun({ ...runOk, devices: { named: 1, booted: 0 } }), false);
    check('RUN a device of this run still booted', gradeRun({ ...runOk, devices: { named: 1, booted: 1 } }), false);
    check('RUN his history moved', gradeRun({ ...runOk, history: { moved: true, before: [[1, 1]], after: [[2, 2]] } }), false);
    check('RUN the Simulator list unreadable (UNREADABLE)', gradeRun({ ...runOk, devices: null }), null);
    check("RUN his history not stat'd (UNREADABLE)", gradeRun({ ...runOk, history: null }), null);
    is('outcomesOf: both spellings of a case\'s end, another class left out', J(outcomesOf("Test Case '-[TortieUITests.P3375SelectUITests testN1WordPress]' passed (1.0 seconds).\nTest case 'P3375SelectUITests.testG2DoubleTapZoom()' skipped on 'Clone 1'\nTest Case '-[TortieUITests.P316DriveUITests testDrive]' failed")) === J({ testN1WordPress: 'passed', testG2DoubleTapZoom: 'skipped' }));
    is('ungradedArms: an arm asked on 18.3 and never graded is named', J(ungradedArms([RUNTIME_CURRENT, RUNTIME_FLOOR], new Set(['N1', 'G1']), { [RUNTIME_CURRENT]: new Set(['N1', 'G1']), [RUNTIME_FLOOR]: new Set(['N1']) })) === J([{ rt: RUNTIME_FLOOR, id: 'G1' }]));
  }

  const bad = results.filter((x) => !x).length;
  console.log(bad === 0 ? `${TAG} grader self-test PASS: ${String(results.length)} cases, every clause red on its own break and green on the honest reading; nothing booted.` : `${TAG} grader self-test FAIL: ${String(bad)} of ${String(results.length)}.`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes('--grader-self-test')) selfTest();

// ---------------------------------------------------------------------------
// The preflight, asked once before anything is built or booted
// ---------------------------------------------------------------------------

const PROJECT = join(ROOT, 'ios', 'Tortie.xcodeproj');
const SCHEME = 'Tortie';
const PARENT_IOS = (process.env['P3375_PARENT_IOS'] ?? '').trim();
const ARMS = new Set(((process.env['P3375_ARMS'] ?? '').trim() || HEAD_ARMS.join(',')).split(',').map((s) => s.trim()).filter((s) => s !== ''));
const RUNTIMES = ((process.env['P3375_RUNTIMES'] ?? '').trim() || `${RUNTIME_CURRENT},${RUNTIME_FLOOR}`).split(',').map((s) => s.trim()).filter((s) => s !== '');
const KEEP = (process.env['P3375_KEEP'] ?? '') === '1';
/** The run's own folder, made fresh inside P3375_RUN_DIR (or /private/tmp) and removed at the end unless kept. */
const RUN = join(resolve((process.env['P3375_RUN_DIR'] ?? '').trim() || '/private/tmp'), `p3375-probe-${PID}`);
const DD = resolve((process.env['P3375_DERIVED_DATA'] ?? '').trim() || join(RUN, 'dd'));
const PARENT_DD = resolve((process.env['P3375_PARENT_DERIVED_DATA'] ?? '').trim() || join(RUN, 'dd-parent'));
const SLOW_DD = resolve((process.env['P3375_SLOW_DERIVED_DATA'] ?? '').trim() || join(RUN, 'dd-slow'));

function preflight() {
  if (!existsSync(PROJECT)) {
    console.error(`${TAG} there is no ios/Tortie.xcodeproj, so there is no app to drive.`);
    process.exit(2);
  }
  const missing = simulatorHarnessMissing({ runtimes: RUNTIMES.length > 0 ? RUNTIMES : [RUNTIME_CURRENT] });
  if (missing !== null) {
    console.error(`${TAG} ${missing}`);
    process.exit(2);
  }
  const unknown = [...ARMS].filter((a) => !HEAD_ARMS.includes(a));
  if (unknown.length > 0 || ARMS.size === 0) {
    console.error(`${TAG} P3375_ARMS names ${J(unknown)}; the arms are ${HEAD_ARMS.join(', ')}.`);
    process.exit(2);
  }
  const strange = RUNTIMES.filter((r) => r !== RUNTIME_CURRENT && r !== RUNTIME_FLOOR);
  if (strange.length > 0 || RUNTIMES.length === 0) {
    console.error(`${TAG} P3375_RUNTIMES names ${J(strange)}; the runtimes are ${RUNTIME_CURRENT} and ${RUNTIME_FLOOR}.`);
    process.exit(2);
  }
  for (const dir of [RUN, DD, PARENT_DD, SLOW_DD]) {
    const why = refuseScratchReason(dir);
    if (why !== null) {
      console.error(`${TAG} ${why}`);
      process.exit(2);
    }
  }
  if (PARENT_IOS !== '' && !existsSync(join(resolve(PARENT_IOS), 'ios', 'Tortie.xcodeproj'))) {
    console.error(`${TAG} P3375_PARENT_IOS names ${PARENT_IOS}, which holds no ios/Tortie.xcodeproj.`);
    process.exit(2);
  }
  if (!existsSync(UI_TEST_FILE)) {
    console.error(`${TAG} there is no ios/TortieUITests/P3375SelectUITests.swift to drive the app with.`);
    process.exit(2);
  }
  try {
    buildPlan(JSON.parse(readFileSync(SAMPLE_FILE, 'utf8')));
  } catch (err) {
    console.error(`${TAG} the sample could not be read into a plan: ${String(err?.message ?? err)}`);
    process.exit(2);
  }
}
preflight();
if (process.argv.includes('--preflight')) {
  say('preflight passed: Xcode, the runtimes, the device type, the UI test and the sample are here');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** His shell history's size and time, the only thing ever read of it. */
function historyStat() {
  const out = [];
  for (const f of ['.zsh_history', '.bash_history']) {
    try {
      const st = statSync(join(homedir(), f));
      out.push([st.size, Math.floor(st.mtimeMs / 1000)]);
    } catch {
      out.push(null);
    }
  }
  return out;
}

const report = { arms: [], readings: { drives: [] }, runtimes: RUNTIMES, parent: PARENT_IOS === '' ? null : PARENT_IOS, modelTurns: 0 };
let failures = 0;
const graded = {};
const arm = (rt, id, v) => {
  (graded[rt] ??= new Set()).add(id);
  const name = `${id} (iOS ${rt}) ${ARM_TITLES[id] ?? ''}`.trim();
  report.arms.push({ id, runtime: rt, ok: v.ok, said: v.said });
  if (v.ok === false) failures += 1;
  say(`${v.ok === null ? 'UNREADABLE' : v.ok ? 'PASS' : 'FAIL'} ${name}: ${v.said}`);
};
let pasteboardReads = 0;
let runCounter = 0;

/** What the handle reads of THIS device's pasteboard; an empty read after Copy is asked twice more. */
async function readPasteboard(sim, retry) {
  let last = { code: -1, text: '' };
  let reads = 0;
  for (let i = 0; i < (retry ? 3 : 1); i += 1) {
    if (i > 0) await sleep(1_000);
    const r = await sim.pasteboard().catch((err) => ({ code: -1, stdout: '', stderr: String(err?.message ?? err) }));
    reads += 1;
    pasteboardReads += 1;
    last = { code: r.code, text: r.code === 0 ? String(r.stdout ?? '') : '' };
    if (last.text !== '') break;
  }
  return { ...last, reads };
}

/**
 * One run of the UI test class on `sim`, with the methods of `arms`, its
 * lines read from stdout and from the file it appends to; every `pasteboard`
 * line answered by a read of the handle and the file the drive waits for.
 */
async function drive(sim, { label, project, dd, arms, planFile }) {
  runCounter += 1;
  const run = `${PID}-${String(runCounter)}`;
  const marker = `P3375|${run}|`;
  const acks = join(RUN, `acks-${run}`);
  mkdirSync(acks, { recursive: true });
  const linesFile = join(RUN, `lines-${run}.txt`);
  rmSync(linesFile, { force: true });
  const events = [];
  const seen = new Set();
  const pb = new Map();
  const pending = [];
  const errors = [];
  const react = async (event) => {
    const key = `${String(event.arm)}-${String(event.seq)}`;
    try {
      pb.set(key, await readPasteboard(sim, event.when === 'after'));
    } finally {
      writeFileSync(join(acks, `pb-${key}`), 'ok\n');
    }
  };
  const take = (line) => {
    const at = line.indexOf(marker);
    if (at === -1) return;
    let event;
    try {
      event = JSON.parse(line.slice(at + marker.length).trim());
    } catch {
      return;
    }
    if (event === null || typeof event !== 'object') return;
    const key = `${String(event.arm)}-${String(event.seq)}`;
    if (seen.has(key)) return;
    seen.add(key);
    event.receivedAt = Date.now();
    events.push(event);
    if (event.step === 'pasteboard') pending.push(react(event).catch((err) => errors.push(String(err?.message ?? err))));
  };
  let offset = 0;
  let partial = '';
  const readNew = async () => {
    let buf;
    try {
      buf = await readFileAsync(linesFile);
    } catch {
      return;
    }
    if (buf.length <= offset) return;
    partial += buf.subarray(offset).toString('utf8');
    offset = buf.length;
    let nl;
    while ((nl = partial.indexOf('\n')) !== -1) {
      take(partial.slice(0, nl));
      partial = partial.slice(nl + 1);
    }
  };
  let tailing = true;
  const tail = (async () => {
    while (tailing) {
      await readNew();
      await sleep(200);
    }
    await readNew();
  })();
  let r;
  try {
    r = await sim.xcodebuild(['test-without-building', '-project', project, '-scheme', SCHEME, ...arms.map((a) => `-only-testing:${UI_CLASS}/${ARM_METHODS[a]}`)], {
      label,
      timeoutMs: 3_600_000,
      derivedDataPath: dd,
      testEnv: { P3375_RUN: run, P3375_LINES: linesFile, P3375_ACKS: acks, P3375_PLAN: planFile },
      onLine: take
    });
  } finally {
    tailing = false;
    await tail;
  }
  await Promise.all(pending);
  const outcomes = outcomesOf(r.stdout);
  report.readings.drives.push({ label, code: r.code, ms: r.ms, timedOut: r.timedOut, lines: events.length, outcomes, errors, logFile: r.logFile, events, pasteboard: Object.fromEntries(pb) });
  say(`drive ${label}: exited ${String(r.code)} in ${String(r.ms)} ms, ${String(events.length)} line(s), ${String(pb.size)} pasteboard read(s)`);
  return { label, code: r.code, events, pb, outcomes };
}

const historyBefore = historyStat();
let ran = false;
let plan = null;
let world = null;
let parentBuilt = false;
let parentWhy = PARENT_IOS === '' ? 'P3375_PARENT_IOS is not set' : null;
let slowBuilt = false;
let slowWhy = null;

// No shell this run starts may write a history: xcodebuild and simctl are
// handed this environment, and nothing here starts a shell of its own.
process.env['HISTFILE'] = '/dev/null';
delete process.env['TERM_SESSION_ID'];

try {
  // The folder carries this process's pid, so nothing else is in it.
  rmSync(RUN, { recursive: true, force: true });
  mkdirSync(join(RUN, 'zdotdir'), { recursive: true });
  say(`the run's folder: ${RUN}${KEEP ? ' (kept)' : ''}`);
  process.env['ZDOTDIR'] = join(RUN, 'zdotdir');
  const sample = JSON.parse(readFileSync(SAMPLE_FILE, 'utf8'));
  world = sampleWorld(sample);
  plan = buildPlan(sample);
  const planFile = join(RUN, 'plan.json');
  writeFileSync(planFile, `${J(plan, null, 1)}\n`);
  report.readings.plan = { session: plan.session, variant: plan.variant, columns: plan.columns, depth: plan.depth, candidates: Object.fromEntries(Object.entries(plan.arms).map(([k, v]) => [k, v.candidates.length])) };
  report.readings.headHasTextInput = existsSync(join(ROOT, 'ios', 'Tortie', 'Screens', 'ScreenTextInput.swift'));

  // ---- the builds, before anything boots --------------------------------
  const head = await xcodebuildRun({ label: 'p3375-head', scratch: join(RUN, 'xcode'), derivedDataPath: DD, args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator'] });
  report.readings.builds = { head: { code: head.code, ms: head.ms, log: head.logFile } };
  if (head.code !== 0) throw new Error(`HEAD's app did not build (exit ${String(head.code)}; ${head.logFile})`);
  const parentProject = join(RUN, 'parent', 'ios', 'Tortie.xcodeproj');
  if (PARENT_IOS !== '') {
    const from = join(resolve(PARENT_IOS), 'ios');
    mkdirSync(join(RUN, 'parent'), { recursive: true });
    const cp = spawnSync('cp', ['-Rc', from, join(RUN, 'parent', 'ios')], { encoding: 'utf8', timeout: 120_000 });
    if (cp.status !== 0) parentWhy = `the parent's ios/ did not copy (${String(cp.stderr ?? '').trim().slice(0, 200)})`;
    else if (existsSync(join(RUN, 'parent', 'ios', 'Tortie', 'Screens', 'ScreenTextInput.swift'))) parentWhy = "P3375_PARENT_IOS holds Screens/ScreenTextInput.swift, so it is this phase's tree and not its parent";
    else {
      writeFileSync(join(RUN, 'parent', 'ios', 'TortieUITests', 'P3375SelectUITests.swift'), readFileSync(UI_TEST_FILE));
      const pb = await xcodebuildRun({ label: 'p3375-parent', scratch: join(RUN, 'xcode'), derivedDataPath: PARENT_DD, args: ['build-for-testing', '-project', parentProject, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator'] });
      report.readings.builds.parent = { code: pb.code, ms: pb.ms, log: pb.logFile };
      parentBuilt = pb.code === 0;
      if (!parentBuilt) parentWhy = `the parent did not build (exit ${String(pb.code)}; ${pb.logFile})`;
    }
    if (parentWhy !== null) say(parentWhy);
  }
  // N10's copy: HEAD's ios/ with every sample page SLOW_PAGE_SECONDS late,
  // planted in the copy alone (the app ships no seam for it), so a handle
  // can reach rows not yet fetched (SPEC D10, the fix round).
  const slowProject = join(RUN, 'slow', 'ios', 'Tortie.xcodeproj');
  if (SLOW_ARMS.some((a) => ARMS.has(a))) {
    mkdirSync(join(RUN, 'slow'), { recursive: true });
    const cp = spawnSync('cp', ['-Rc', join(ROOT, 'ios'), join(RUN, 'slow', 'ios')], { encoding: 'utf8', timeout: 120_000 });
    const reader = join(RUN, 'slow', 'ios', 'Tortie', 'Sample', 'SampleReader.swift');
    const planted = cp.status === 0 && existsSync(reader) ? slowSample(readFileSync(reader, 'utf8')) : null;
    if (cp.status !== 0) slowWhy = `HEAD's ios/ did not copy for the slow pages (${String(cp.stderr ?? '').trim().slice(0, 200)})`;
    else if (planted === null) slowWhy = "the copy's SampleReader.swift holds its one page read other than exactly once, so no wait could be planted";
    else {
      writeFileSync(reader, planted);
      const sb = await xcodebuildRun({ label: 'p3375-slow', scratch: join(RUN, 'xcode'), derivedDataPath: SLOW_DD, args: ['build-for-testing', '-project', slowProject, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator'] });
      report.readings.builds.slow = { code: sb.code, ms: sb.ms, log: sb.logFile, pageSeconds: SLOW_PAGE_SECONDS };
      slowBuilt = sb.code === 0;
      if (!slowBuilt) slowWhy = `the slow copy did not build (exit ${String(sb.code)}; ${sb.logFile})`;
    }
    if (slowWhy !== null) say(slowWhy);
  }

  // ---- the devices, one at a time ---------------------------------------
  ran = true;
  for (const [i, rt] of RUNTIMES.entries()) {
    await withSimulator({ label: `p3375-${rt}`, runtime: rt, runId: `p3375-${PID}-${String(i + 1)}`, scratch: join(RUN, `sim-${String(i + 1)}`), derivedDataPath: DD, keep: KEEP }, async (sim) => {
      report.readings[`device-${rt}`] = { name: sim.name, runtime: sim.runtime, deviceType: sim.deviceType };
      const headArms = HEAD_ARMS.filter((a) => ARMS.has(a) && !SLOW_ARMS.includes(a));
      const h = await drive(sim, { label: `head-${rt}`, project: PROJECT, dd: DD, arms: headArms, planFile });
      const skipped = Object.entries(h.outcomes).filter(([, o]) => o === 'skipped').map(([m]) => m);
      if (skipped.length > 0) say(`skipped on ${rt}: ${skipped.join(', ')} (P3375_RUN did not reach the runner)`);
      for (const id of headArms.filter((a) => a.startsWith('N'))) arm(rt, id, gradeN(readArm(id, h.events, h.pb), { plan, world }));
      const slowArms = SLOW_ARMS.filter((a) => ARMS.has(a));
      if (slowArms.length > 0) {
        if (!slowBuilt) for (const id of slowArms) arm(rt, id, verdict(null, `the slow copy was not driven (${String(slowWhy)})`));
        else {
          const sl = await drive(sim, { label: `slow-${rt}`, project: slowProject, dd: SLOW_DD, arms: slowArms, planFile });
          for (const id of slowArms) arm(rt, id, gradeN(readArm(id, sl.events, sl.pb), { plan, world }));
        }
      }
      const gArms = PARENT_ARMS.filter((a) => ARMS.has(a));
      let q = null;
      if (parentBuilt && gArms.length > 0) q = await drive(sim, { label: `parent-${rt}`, project: parentProject, dd: PARENT_DD, arms: gArms, planFile });
      for (const id of gArms) {
        arm(rt, id, gradeG(id, readArm(id, h.events, h.pb), q === null ? null : readArm(id, q.events, q.pb), { plan, world, parentNamed: PARENT_IOS !== '', parentWhy }));
      }
    });
  }
} catch (err) {
  say(`the run stopped: ${String(err?.stack ?? err)}`);
  report.readings.stopped = String(err?.message ?? err);
}

// ---- RUN: counted once, at the end -------------------------------------------
{
  const devices = countDevicesNamed(`p316-p3375-${PID}-`);
  const historyAfter = historyStat();
  arm('all', 'RUN', gradeRun({ devices: devices.readable ? devices : null, history: { moved: J(historyBefore) !== J(historyAfter), before: historyBefore, after: historyAfter }, pasteboardReads }));
}
for (const { rt, id } of ungradedArms(RUNTIMES, ARMS, graded)) {
  arm(rt, id, verdict(null, `never graded: the run stopped before it${report.readings.stopped === undefined ? '' : ` (${String(report.readings.stopped).slice(0, 200)})`}`));
}
if (!KEEP) rmSync(RUN, { recursive: true, force: true });
const OUT = join(ROOT, 'out', 'p3375');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'probe-p3375.json'), `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-p3375.json')}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (failures === 0 && unreadable > 0) {
  say(`probe:p3375 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(failures > 0 ? `probe:p3375 FAILED ${String(failures)} arm(s)` : !ran ? 'probe:p3375 did not complete' : 'probe:p3375 OK');
process.exit(failures > 0 ? 1 : ran ? 0 : 2);
