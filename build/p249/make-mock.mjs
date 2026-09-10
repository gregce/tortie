#!/usr/bin/env node
/**
 * make-mock.mjs — PHASE 249's DESIGN STEP: the runs the mock draws.
 *
 * Phase 249 is RESEARCH ONLY and builds nothing. This script writes NOTHING
 * under src/. It reads two fixture versions of a note that this phase wrote
 * itself — no path of the operator's and no content of his — composes them the
 * way src/renderer/editor/redline-document.ts composes a document, and emits
 * build/p249/mock-runs.js for build/p249/mock-p249.html to draw.
 *
 * It launches nothing, spawns nothing, opens no socket and makes no request.
 *
 * THE ENGINE IS THE PRODUCT'S OWN: `diffLines` for the line partition and
 * `diffWords` with an `Intl.Segmenter` inside each change block, being
 * redline-document's two levels and redline.ts's `redlineRuns`. The two
 * PROJECTIONS are asserted here, because they are the whole meaning of a
 * redline and a mock that drew a picture failing them would be proposing a
 * design over a lie: the runs with every `ins` dropped must equal version A
 * byte for byte, and with every `del` dropped, version B.
 *
 * A CHANGE is research 83 B.2's unit, being a maximal run of adjacent
 * non-`same` runs, which is what src/renderer/editor/rewind.ts `changesOf`
 * computes and what Phase 227 wrapped in one element each.
 */
import { diffArrays, diffLines, diffWords } from 'diff';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const A = readFileSync(join(HERE, 'fixture-a.md'), 'utf8');
const B = readFileSync(join(HERE, 'fixture-b.md'), 'utf8');

let segmenter = null;
try {
  segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
} catch {
  segmenter = null;
}

/**
 * `exactRuns`, being redline-document.ts's own repair, re-implemented here so
 * the mock's runs are the product's runs rather than jsdiff's raw ones.
 *
 * `diffWords` does not round trip the OLD side: whitespace between words is
 * taken from the NEW side in every unchanged run. So each run is walked back
 * against both original strings and the real bytes are put in: a deletion
 * carries the old side's own spacing, and an unchanged run whose spacing
 * differs between the sides is SPLIT there into the old spacing struck through
 * and the new spacing inserted, which is the honest redline of a spacing
 * change. Anything that is not a whitespace disagreement throws rather than
 * guesses, exactly as the shipping module refuses rather than guesses.
 */
function exactRuns(parts, oldText, newText) {
  let io = 0;
  let iN = 0;
  const out = [];
  const push = (kind, text) => {
    if (text === '') return;
    const last = out[out.length - 1];
    if (last !== undefined && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  const ws = (s, i) => {
    let j = i;
    while (j < s.length && /\s/.test(s[j])) j += 1;
    return s.slice(i, j);
  };
  for (const part of parts) {
    const v = part.value;
    if (v === '') continue;
    const kind = part.added ? 'ins' : part.removed ? 'del' : 'same';
    let k = 0;
    let buf = '';
    while (k < v.length) {
      if (/\s/.test(v[k])) {
        while (k < v.length && /\s/.test(v[k])) k += 1;
        if (kind === 'same') {
          const a = ws(oldText, io);
          const b = ws(newText, iN);
          io += a.length;
          iN += b.length;
          if (a === b) {
            buf += a;
          } else {
            push('same', buf);
            buf = '';
            push('del', a);
            push('ins', b);
          }
        } else if (kind === 'del') {
          const a = ws(oldText, io);
          io += a.length;
          buf += a;
        } else {
          const b = ws(newText, iN);
          iN += b.length;
          buf += b;
        }
        continue;
      }
      const ch = v[k];
      // Spacing jsdiff dropped from a run: the original's own bytes are put
      // back before the character is matched, so the projections stay exact.
      // The shipping `exactRuns` refuses here instead and draws the block
      // whole; this reconstructs, which is the same bytes and one fewer
      // fallback, and it is a difference between the mock's generator and the
      // product that is written down rather than hidden.
      for (;;) {
        const needOld = kind !== 'ins' && oldText[io] !== ch && /\s/.test(oldText[io] ?? '');
        const needNew = kind !== 'del' && newText[iN] !== ch && /\s/.test(newText[iN] ?? '');
        if (!needOld && !needNew) break;
        if (needOld) {
          const a = ws(oldText, io);
          io += a.length;
          if (kind === 'same') { push('same', buf); buf = ''; push('del', a); } else buf += a;
        }
        if (needNew) {
          const b = ws(newText, iN);
          iN += b.length;
          if (kind === 'same') { push('same', buf); buf = ''; push('ins', b); } else buf += b;
        }
      }
      if (kind !== 'ins') {
        if (oldText[io] !== ch) throw new Error('the old side does not match at ' + String(io));
        io += 1;
      }
      if (kind !== 'del') {
        if (newText[iN] !== ch) throw new Error('the new side does not match at ' + String(iN));
        iN += 1;
      }
      buf += ch;
      k += 1;
    }
    push(kind, buf);
  }
  // Whatever spacing is left at either end belongs to the sides that have it.
  const tailO = oldText.slice(io);
  const tailN = newText.slice(iN);
  if (tailO === tailN) push('same', tailO);
  else {
    push('del', tailO);
    push('ins', tailN);
  }
  return out.filter((r) => r.text !== '');
}

/** The word-level runs for one block, redline.ts's `redlineRuns` verbatim. */
function wordRuns(oldText, newText) {
  const parts = diffWords(oldText, newText, {
    maxEditLength: 200,
    ...(segmenter !== null ? { intlSegmenter: segmenter } : {})
  });
  if (parts === undefined) return null;
  return exactRuns(parts, oldText, newText);
}

/** A markdown table line: the shape the composer keeps verbatim. */
const TABLE_LINE = /^\s*\|/;
/** A separator row: pipes, dashes, colons and spacing, and nothing else. */
const SEPARATOR_LINE = /^[\s|:-]+$/;

/**
 * FAULT 3, and it is the item with the largest measured cost.
 *
 * The composer diffs one FLAT character stream, so the word tokeniser pairs
 * words across row boundaries: research 113 §3 measured `Sessions` matched
 * against `Ledger` and `tmux` against `SQLite`, which are different rows of a
 * table whose rows were reordered. A reader is shown a word-level edit between
 * two cells that have nothing to do with each other.
 *
 * A TABLE BLOCK IS DIFFED ROW AGAINST ROW. The rows are aligned first, by
 * their own first cell, through `diffArrays`; then each PAIR is word-diffed on
 * its own, and an unpaired row is a whole deletion or a whole insertion. A
 * separator row pairs with a separator row. Every byte of both sides still
 * appears exactly once and in order, so BOTH PROJECTIONS ARE UNTOUCHED, which
 * is asserted below over the whole document either way.
 */
function firstCell(line) {
  const t = line.replace(/\n$/, '');
  if (SEPARATOR_LINE.test(t)) return '\u0000separator';
  const parts = t.split('|');
  return (parts[1] ?? t).trim().toLowerCase();
}

/** The lines of a block, each carrying its own newline when it had one. */
function rowsOf(text) {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function tableRuns(oldText, newText) {
  const oldRows = rowsOf(oldText);
  const newRows = rowsOf(newText);
  const aligned = diffArrays(oldRows.map(firstCell), newRows.map(firstCell));
  const out = [];
  let io = 0;
  let iN = 0;
  for (const part of aligned) {
    const n = part.count ?? part.value.length;
    if (part.added) {
      for (let k = 0; k < n; k += 1) { out.push({ kind: 'ins', text: newRows[iN] }); iN += 1; }
      continue;
    }
    if (part.removed) {
      for (let k = 0; k < n; k += 1) { out.push({ kind: 'del', text: oldRows[io] }); io += 1; }
      continue;
    }
    for (let k = 0; k < n; k += 1) {
      const a = oldRows[io];
      const b = newRows[iN];
      io += 1;
      iN += 1;
      if (a === b) { out.push({ kind: 'same', text: a }); continue; }
      // A SEPARATOR ROW IS NEVER WORD-DIFFED. Word-diffing `| --- | --- |`
      // against `| --- | --- | --- |` matches the dash groups and interleaves
      // the two rows, which is what draws the row twice with a fragment of it
      // stranded on a line of its own. The pair is a whole-row replacement,
      // and when both sides are plain dashes — no `:` alignment marker on
      // either — the DELETED copy is not drawn at all, because a separator
      // row's only content is the column count, which the header above it
      // already shows. An alignment marker on either side draws both.
      if (SEPARATOR_LINE.test(a.replace(/\n$/, '')) && SEPARATOR_LINE.test(b.replace(/\n$/, ''))) {
        const plain = !a.includes(':') && !b.includes(':');
        out.push({ kind: 'del', text: a, sepRow: true, drop: plain });
        out.push({ kind: 'ins', text: b, sepRow: true, drop: false });
        continue;
      }
      const parts = diffWords(a, b, {
        maxEditLength: 200,
        ...(segmenter !== null ? { intlSegmenter: segmenter } : {})
      });
      if (parts === undefined) { out.push({ kind: 'del', text: a }, { kind: 'ins', text: b }); continue; }
      out.push(...exactRuns(parts, a, b));
    }
  }
  return out;
}

/** The line partition, then the word partition inside each change block. */
function compose(a, b, tableMode) {
  const runs = [];
  const lines = diffLines(a, b);
  let i = 0;
  while (i < lines.length) {
    const part = lines[i];
    if (!part.added && !part.removed) {
      runs.push({ kind: 'same', text: part.value });
      i += 1;
      continue;
    }
    let oldText = '';
    let newText = '';
    while (i < lines.length && (lines[i].added || lines[i].removed)) {
      if (lines[i].removed) oldText += lines[i].value;
      else newText += lines[i].value;
      i += 1;
    }
    if (oldText === '') {
      runs.push({ kind: 'ins', text: newText });
      continue;
    }
    if (newText === '') {
      runs.push({ kind: 'del', text: oldText });
      continue;
    }
    const allTable =
      oldText.split('\n').filter((l) => l !== '').every((l) => TABLE_LINE.test(l)) &&
      newText.split('\n').filter((l) => l !== '').every((l) => TABLE_LINE.test(l));
    const w = tableMode === 'rows' && allTable
      ? tableRuns(oldText, newText)
      : wordRuns(oldText, newText);
    // A BLOCK THE CAPS REFUSE DRAWS WHOLE — redline-document's own fallback.
    if (w === null) {
      runs.push({ kind: 'del', text: oldText });
      runs.push({ kind: 'ins', text: newText });
      continue;
    }
    runs.push(...w);
  }
  return runs;
}

/** Where each side's table regions are, as [start, end) offsets. */
function tableRegions(text) {
  const out = [];
  let off = 0;
  let start = null;
  for (const line of text.split('\n')) {
    const isRow = line.trimStart().startsWith('|');
    if (isRow && start === null) start = off;
    if (!isRow && start !== null) {
      out.push([start, off]);
      start = null;
    }
    off += line.length + 1;
  }
  if (start !== null) out.push([start, off]);
  return out;
}

const tablesA = tableRegions(A);
const tablesB = tableRegions(B);
const hits = (regions, from, to) =>
  regions.some(([s, e]) => from < e && to > s);

/** A separator row: pipes, dashes, colons and spacing, and nothing else. */
const SEPARATOR = /^[\s|:-]+$/;
/** A run with nothing in it a reader can read: no letter and no digit. */
const WORDLESS = /^[^\p{L}\p{N}]*$/u;

/**
 * FAULT 5's OTHER HALF, and it is leaf level. A mark whose text ENDS in a
 * preserved space or newline paints that space, and `pre-wrap` paints it past
 * the last glyph at a wrap point — which is every one of the fifteen crossings
 * research 113 §5.3 measured. Splitting the leading and trailing whitespace off
 * into runs of the SAME KIND changes not one byte and no projection: the runs
 * still concatenate to exactly what they concatenated to. It costs leaves, and
 * how many is printed below rather than guessed at.
 */
function splitEnds(list) {
  const out = [];
  for (const run of list) {
    if (run.kind === 'same') {
      out.push(run);
      continue;
    }
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text);
    const [, lead, core, tail] = m;
    if (lead === '' && tail === '') {
      out.push(run);
      continue;
    }
    if (lead !== '') out.push({ ...run, text: lead });
    if (core !== '') out.push({ ...run, text: core });
    if (tail !== '') out.push({ ...run, text: tail });
  }
  return out;
}


function build(tableMode, split) {
  const runs = compose(A, B, tableMode);

// THE TWO PROJECTIONS. A mock whose picture fails these is proposing a design
// over a lie, so they are asserted rather than hoped for.
const oldSide = runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const newSide = runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
if (oldSide !== A) throw new Error('the non-ins projection is not version A');
if (newSide !== B) throw new Error('the non-del projection is not version B');

  /**
   * A RUN IS WHOLLY INSIDE THE TABLE OR WHOLLY OUTSIDE IT. An unchanged run
   * routinely spans the paragraph before a table, the blank line, and the
   * table's first row, and a wrapper drawn around such a run would put the
   * paragraph in the table's face. Cutting at the boundary changes no byte and
   * no projection; it is the same argument the ends split makes.
   */
  function cutAtTables(list) {
    const cut = [];
    let ao = 0;
    let bo = 0;
    for (const run of list) {
      const side = run.kind === 'ins' ? 'B' : 'A';
      const regions = side === 'A' ? tablesA : tablesB;
      const from = side === 'A' ? ao : bo;
      const to = from + run.text.length;
      const points = new Set([from, to]);
      for (const [s, e] of regions) {
        if (s > from && s < to) points.add(s);
        if (e > from && e < to) points.add(e);
      }
      const sorted = Array.from(points).sort((x, y) => x - y);
      for (let i = 0; i + 1 < sorted.length; i += 1) {
        cut.push({ ...run, text: run.text.slice(sorted[i] - from, sorted[i + 1] - from) });
      }
      if (run.kind !== 'ins') ao = to;
      if (run.kind !== 'del') bo += run.text.length;
    }
    return cut;
  }

  /**
   * A DELETION AND AN INSERTION OF THE SAME BYTES ARE NOT A CHANGE.
   *
   * `exactRuns` splits an unchanged run whose spacing differs into the old
   * spacing struck through and the new spacing inserted, which is right when
   * the two really differ — and a changed line's own trailing newline goes
   * through the same door, so `del "\n"` lands beside `ins "\n"` and the
   * document draws TWO line breaks where the file has one. Replacing such a
   * pair with one unchanged run is exactly equivalent on both projections: the
   * non-ins side loses `ins x` and gains `x` where it had `del x`, and the
   * non-del side the mirror. So it is a correction rather than a decoration,
   * and the assertions below still hold over the result.
   */
  function cancelPairs(list) {
    const out = [];
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      const b = list[i + 1];
      if (
        b !== undefined &&
        ((a.kind === 'del' && b.kind === 'ins') || (a.kind === 'ins' && b.kind === 'del')) &&
        a.text === b.text
      ) {
        out.push({ kind: 'same', text: a.text });
        i += 1;
        continue;
      }
      out.push(a);
    }
    return out;
  }

  const leavesBefore = runs.length;
  const leaves = split ? splitEnds(cutAtTables(cancelPairs(runs))) : runs;

let oa = 0;
let ob = 0;
const out = [];
for (const run of leaves) {
  const len = run.text.length;
  const oFrom = oa;
  const bFrom = ob;
  if (run.kind !== 'ins') oa += len;
  if (run.kind !== 'del') ob += len;
  const inTable =
    (run.kind !== 'ins' && hits(tablesA, oFrom, oa)) ||
    (run.kind !== 'del' && hits(tablesB, bFrom, ob));
  out.push({
    kind: run.kind,
    text: run.text,
    table: inTable,
    sepRow: run.sepRow === true,
    // NOT DRAWN, and drawn is not the same as absent: the bytes stay in the
    // markup, so both projections, the copy handler's clone and the shot
    // probe's leaf walk all read exactly what they read today.
    drop: run.drop === true,
    // Furniture: a table run that is only the separator's own glyphs.
    sep: inTable && /-/.test(run.text) && SEPARATOR.test(run.text),
    // Wordless: nothing in it a reader can use. A whitespace-only mark is
    // deliberately NOT in this set — redline.ts ruling 5 says a spacing change
    // must say so, and in a standalone document there are no Pierre rows above
    // it to say it instead, so the wash is the only thing left that can. The
    // price is the residual overhang §5 measures, and it is named rather than
    // traded away.
    wordless: WORDLESS.test(run.text) && run.text.trim() !== '',
    blank: run.text.trim() === ''
  });
}

/**
 * RULING 5, EXACTLY AND NO WIDER. A whitespace-only mark keeps its wash when
 * it is a real SPACING CHANGE, being the shape `exactRuns` makes when the two
 * sides space the same words differently: `del "   "` beside `ins " "`. That
 * is the case redline.ts ruling 5 is about, and in a standalone document the
 * wash is the only thing that can say it happened.
 *
 * A whitespace mark with no opposite-kind whitespace beside it is NOT a
 * spacing change — it is a deleted row's own trailing newline riding along
 * with the row — and washing it paints a coloured bar past the last glyph on
 * the line, which is what crosses the table's closing pipe. It gets no wash.
 */
for (let i = 0; i < out.length; i += 1) {
  const r = out[i];
  if (!r.blank || r.kind === 'same') { r.spacing = false; continue; }
  const a = out[i - 1];
  const b = out[i + 1];
  const opposite = (x) =>
    x !== undefined && x.blank === true && x.kind !== 'same' && x.kind !== r.kind;
  r.spacing = opposite(a) || opposite(b);
}

// Research 83 B.2's unit: a maximal run of adjacent non-`same` runs.
let changes = 0;
let open = false;
for (const r of out) {
  if (r.kind === 'same') {
    open = false;
    r.change = null;
    continue;
  }
  if (!open) {
    changes += 1;
    open = true;
  }
  r.change = changes - 1;
}

const marks = out.filter((r) => r.kind !== 'same');
const stats = {
  leavesBefore,
  leavesAfter: out.length,
  bytesA: A.length,
  bytesB: B.length,
  runs: out.length,
  marks: marks.length,
  changes,
  tableMarks: marks.filter((r) => r.table).length,
  separatorMarks: marks.filter((r) => r.sep).length,
  wordlessMarks: marks.filter((r) => r.wordless).length,
  droppedMarks: marks.filter((r) => r.drop).length,
  blankMarks: marks.filter((r) => r.blank).length,
  spacingMarks: marks.filter((r) => r.spacing).length,
  tableChanges: new Set(marks.filter((r) => r.table).map((r) => r.change)).size
};

const oldSide2 = out.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const newSide2 = out.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
if (oldSide2 !== A) throw new Error('the split broke the non-ins projection');
if (newSide2 !== B) throw new Error('the split broke the non-del projection');
  return { runs: out, stats };
}


const flat = build('flat', false);
const rows = build('rows', true);
writeFileSync(
  join(HERE, 'mock-runs.js'),
  `/* Generated by build/p249/make-mock.mjs — do not edit by hand. */\n` +
    `window.P249_DOCS = ${JSON.stringify({ flat, rows }, null, 0)};\n`
);

console.log('[p249] projections hold: non-ins === A, non-del === B');
console.log('[p249] TODAY   (one flat stream, no split): ' + JSON.stringify(flat.stats));
console.log('[p249] PROPOSED (table by row, ends split): ' + JSON.stringify(rows.stats));
