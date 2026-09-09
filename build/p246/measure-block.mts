/**
 * measure-block.mts. Phase 246's MEASURE step, run under node over the
 * SHIPPING redline modules (docs/research/110-phase-246-the-block-that-gave-up.md).
 *
 * It answers one question with numbers: why does inserting a paragraph above
 * an edited paragraph turn a word-level redline into a whole-paragraph red
 * followed by a whole-paragraph green.
 *
 * It imports `src/renderer/editor/redline.ts` and
 * `src/renderer/editor/redline-document.ts` rather than a copy, so what it
 * prints is what the app draws. It launches no Electron, opens no window,
 * starts no tmux server, spawns nothing, makes no request and writes nothing
 * outside its own stdout. The fixtures under build/fixtures/redline-p246 are
 * the operator's own bytes, copied out of his baseline record on 2026-09-09
 * and never written back.
 *
 *   node_modules/.bin/tsx --tsconfig tsconfig.node.json build/p246/measure-block.mts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { diffLines, diffWords } from 'diff';
import { parseDiffFromFile } from '@pierre/diffs';
import type { FileDiffMetadata } from '@pierre/diffs';
import {
  normalizeBlockText,
  redlineBlocks,
  redlineRuns,
  redlineSkipNote,
  REDLINE_MAX_BLOCK_CHARS,
  REDLINE_MAX_BLOCKS,
  REDLINE_MAX_EDIT_LENGTH
} from '../../src/renderer/editor/redline';
import {
  composeRedlineDocument,
  redlineDocumentNote,
  exactRuns,
  REDLINE_DOC_MAX_LINE_EDITS
} from '../../src/renderer/editor/redline-document';

const FIX = join(process.cwd(), 'build/fixtures/redline-p246');
const read = (name: string): string => readFileSync(join(FIX, name), 'utf8');

/** The one segmenter `redlineRuns` uses, so a distance is measured its way. */
function seg(): Intl.Segmenter | null {
  try {
    return new Intl.Segmenter(undefined, { granularity: 'word' });
  } catch {
    return null;
  }
}
const SEG = seg();

/**
 * The REAL edit distance of a word diff, taken from the shipping tokenizer
 * rather than counted by hand: the smallest `maxEditLength` at which jsdiff
 * still answers. jsdiff returns undefined exactly when the shortest edit
 * script is longer than the cap, so the smallest cap that answers IS the
 * distance.
 */
function wordEditDistance(oldText: string, newText: string, ceiling = 40_000): number | null {
  const ok = (cap: number): boolean =>
    diffWords(oldText, newText, {
      maxEditLength: cap,
      ...(SEG !== null ? { intlSegmenter: SEG } : {})
    }) !== undefined;
  if (!ok(ceiling)) return null;
  let lo = 0;
  let hi = ceiling;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** The same, for the LINE partition's own guard. */
function lineEditDistance(oldText: string, newText: string, ceiling = 40_000): number | null {
  const ok = (cap: number): boolean =>
    diffLines(oldText, newText, { maxEditLength: cap }) !== undefined;
  if (!ok(ceiling)) return null;
  let lo = 0;
  let hi = ceiling;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

const cut = (s: string, n = 96): string =>
  JSON.stringify(s.length > n ? `${s.slice(0, n)}…(${String(s.length)})` : s);

function meta(oldText: string, newText: string): FileDiffMetadata {
  const parsed = parseDiffFromFile(
    { name: 'test2.md', contents: oldText, cacheKey: 'p246:old' },
    { name: 'test2.md', contents: newText, cacheKey: 'p246:new' }
  );
  if (parsed === null || parsed === undefined) throw new Error('no metadata');
  return parsed;
}

/* ------------------------------------------------------------------ */
/* A. Pierre's `hunkContent` path — `redlineBlocks`, the charter's (a)/(c) */
/* ------------------------------------------------------------------ */

function pierrePath(label: string, oldText: string, newText: string): void {
  console.log(`\n### A. ${label} — Pierre hunkContent path (redlineBlocks)`);
  const m = meta(oldText, newText);
  let n = 0;
  for (const hunk of m.hunks) {
    for (const content of hunk.hunkContent) {
      if (content.type !== 'change') {
        console.log(
          `  content #${String(n++)} type=${content.type} ` +
            `del=${String(content.deletions)} add=${String(content.additions)}  (no redline block)`
        );
        continue;
      }
      const oldLines: string[] = [];
      for (let i = content.deletionLineIndex; i < content.deletionLineIndex + content.deletions; i++) {
        const line = m.deletionLines[i];
        if (line !== undefined) oldLines.push(line);
      }
      const newLines: string[] = [];
      for (let i = content.additionLineIndex; i < content.additionLineIndex + content.additions; i++) {
        const line = m.additionLines[i];
        if (line !== undefined) newLines.push(line);
      }
      const o = normalizeBlockText(oldLines);
      const w = normalizeBlockText(newLines);
      const runs = redlineRuns(o, w);
      const d = wordEditDistance(o, w);
      console.log(
        `  content #${String(n++)} type=change del=${String(content.deletions)} add=${String(content.additions)}`
      );
      console.log(`    old  ${String(o.length).padStart(5)} chars  ${cut(o)}`);
      console.log(`    new  ${String(w.length).padStart(5)} chars  ${cut(w)}`);
      console.log(
        `    edit distance ${d === null ? 'over ceiling' : String(d)}  ` +
          `cap ${String(REDLINE_MAX_EDIT_LENGTH)}  ` +
          `diffWords ${runs === null ? 'UNDEFINED (gave up)' : `${String(runs.length)} runs`}  ` +
          `charBudget ${String(REDLINE_MAX_BLOCK_CHARS)} ${
            o.length > REDLINE_MAX_BLOCK_CHARS || w.length > REDLINE_MAX_BLOCK_CHARS ? 'EXCEEDED' : 'ok'
          }`
      );
    }
  }
  const result = redlineBlocks(m);
  console.log(
    `  redlineBlocks: ${String(result.blocks.length)} rows, skipped ${JSON.stringify(result.skipped)}`
  );
  console.log(`  redlineSkipNote: ${JSON.stringify(redlineSkipNote(result))}`);
  for (const b of result.blocks) {
    console.log(
      `    row ${b.side}:${String(b.lineNumber)} whitespaceOnly=${String(b.whitespaceOnly)} ` +
        `runs=${JSON.stringify(b.runs.map((r) => `${r.kind}:${r.text}`))}`
    );
  }
}

/* ------------------------------------------------------------------ */
/* B. The SHIPPING view — composeRedlineDocument's own line partition   */
/* ------------------------------------------------------------------ */

/** `linePartition` is not exported; this is the same walk, re-derived here. */
function partition(oldText: string, newText: string): { kind: string; oldText: string; newText: string }[] {
  const parts = diffLines(oldText, newText, { maxEditLength: REDLINE_DOC_MAX_LINE_EDITS });
  if (parts === undefined) return [{ kind: 'approximate', oldText, newText }];
  const blocks: { kind: string; oldText: string; newText: string }[] = [];
  let po = '';
  let pn = '';
  let inChange = false;
  const flush = (): void => {
    if (inChange) {
      blocks.push({ kind: 'change', oldText: po, newText: pn });
      po = '';
      pn = '';
      inChange = false;
    }
  };
  for (const part of parts) {
    if (part.added === true) {
      inChange = true;
      pn += part.value;
    } else if (part.removed === true) {
      inChange = true;
      po += part.value;
    } else {
      flush();
      if (part.value !== '') blocks.push({ kind: 'same', oldText: part.value, newText: part.value });
    }
  }
  flush();
  return blocks;
}

function documentPath(label: string, oldText: string, newText: string): void {
  console.log(`\n### B. ${label} — the shipping view (composeRedlineDocument)`);
  console.log(
    `  line edit distance ${String(lineEditDistance(oldText, newText))} ` +
      `against REDLINE_DOC_MAX_LINE_EDITS ${String(REDLINE_DOC_MAX_LINE_EDITS)}`
  );
  const blocks = partition(oldText, newText);
  let n = 0;
  for (const b of blocks) {
    if (b.kind === 'same') continue;
    const o = b.oldText;
    const w = b.newText;
    const runs = o === '' || w === '' ? null : redlineRuns(o, w);
    const d = o === '' || w === '' ? null : wordEditDistance(o, w);
    const exact = runs === null ? null : exactRuns(runs, o, w);
    console.log(`  change block #${String(n++)}`);
    console.log(`    old  ${String(o.length).padStart(5)} chars  ${cut(o)}`);
    console.log(`    new  ${String(w.length).padStart(5)} chars  ${cut(w)}`);
    if (o === '' || w === '') {
      console.log('    one side empty: drawn whole, counted against no cap and named in no note');
      continue;
    }
    console.log(
      `    edit distance ${d === null ? 'over ceiling' : String(d)}  ` +
        `cap ${String(REDLINE_MAX_EDIT_LENGTH)}  ` +
        `diffWords ${runs === null ? 'UNDEFINED (gave up)' : `${String(runs.length)} runs`}  ` +
        `exactRuns ${runs === null ? 'n/a' : exact === null ? 'REFUSED (unaligned)' : `${String(exact.length)} runs`}  ` +
        `charBudget ${
          o.length > REDLINE_MAX_BLOCK_CHARS || w.length > REDLINE_MAX_BLOCK_CHARS ? 'EXCEEDED' : 'ok'
        }  blockCap ${String(REDLINE_MAX_BLOCKS)}`
    );
  }
  const doc = composeRedlineDocument(oldText, newText);
  console.log(
    `  composeRedlineDocument: blocks=${String(doc.blocks)} approximate=${String(doc.approximate)} ` +
      `whole=${JSON.stringify(doc.whole)}`
  );
  console.log(`  redlineDocumentNote: ${JSON.stringify(redlineDocumentNote(doc))}`);
  const marked = doc.runs.filter((r) => r.kind !== 'same');
  console.log(`  marked runs (${String(marked.length)}):`);
  for (const r of marked) console.log(`    ${r.kind.padEnd(3)} ${cut(r.text, 200)}`);
}


/* ------------------------------------------------------------------ */
/* D. The raw line partition, and the alignment that was available      */
/* ------------------------------------------------------------------ */

function rawLines(label: string, oldText: string, newText: string): void {
  console.log(`\n### D. ${label} — jsdiff diffLines, part by part`);
  const parts = diffLines(oldText, newText, { maxEditLength: REDLINE_DOC_MAX_LINE_EDITS });
  if (parts === undefined) {
    console.log('  gave up');
    return;
  }
  let ops = 0;
  for (const part of parts) {
    const kind = part.added === true ? 'add' : part.removed === true ? 'del' : 'same';
    if (kind !== 'same') ops += part.count ?? 0;
    console.log(
      `  ${kind} ${String(part.count ?? 0).padStart(2)} line(s)  ${cut(part.value, 70)}`
    );
  }
  console.log(`  line edit operations: ${String(ops)}`);
}

/**
 * THE ALTERNATIVE ALIGNMENT, PRICED. jsdiff's line partition is one shortest
 * edit script among several of the SAME length, and it picked one whose two
 * sides are different paragraphs. This arm takes each change block the
 * partition produced, pairs each removed line with the added line it most
 * resembles, and prints what that would have drawn and what it would have
 * cost in line operations. It changes no product file; it prices the proposal.
 */
function similarity(a: string, b: string): number {
  const A = a.toLowerCase().split(/\s+/).filter((w) => w !== '');
  const B = new Set(b.toLowerCase().split(/\s+/).filter((w) => w !== ''));
  if (A.length === 0) return B.size === 0 ? 1 : 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit += 1;
  return hit / Math.max(A.length, B.size);
}

function alignments(label: string, oldText: string, newText: string): void {
  console.log(`\n### E. ${label} — the alignment that was available, priced`);
  for (const b of partition(oldText, newText)) {
    if (b.kind !== 'change') continue;
    const O = b.oldText === '' ? [] : b.oldText.replace(/\n$/, '').split('\n');
    const N = b.newText === '' ? [] : b.newText.replace(/\n$/, '').split('\n');
    if (O.length === 0 || N.length === 0) continue;
    console.log(`  block: ${String(O.length)} removed line(s), ${String(N.length)} added line(s)`);
    console.log(`    jsdiff cost here: ${String(O.length + N.length)} line operations`);
    for (const o of O) {
      let best = -1;
      let score = -1;
      for (let i = 0; i < N.length; i++) {
        const sc = similarity(o, N[i] ?? '');
        if (sc > score) {
          score = sc;
          best = i;
        }
      }
      const partner = N[best] ?? '';
      const d = wordEditDistance(o, partner);
      const runs = redlineRuns(o, partner);
      console.log(
        `    removed line ${cut(o, 60)}\n      best added line #${String(best)} ` +
          `similarity ${score.toFixed(2)} ${cut(partner, 60)}`
      );
      console.log(
        `      paired: edit distance ${d === null ? 'over ceiling' : String(d)}, ` +
          `${runs === null ? 'diffWords gave up' : `${String(runs.filter((r) => r.kind !== 'same').length)} marked runs`}`
      );
      if (runs !== null) {
        for (const r of runs.filter((x) => x.kind !== 'same')) {
          console.log(`        ${r.kind.padEnd(3)} ${cut(r.text, 90)}`);
        }
      }
    }
  }
}

/**
 * THE SLIDE. The block whose two sides are unrelated is not repairable from
 * inside itself: its partner sits in a LATER block, on the far side of a
 * whitespace-only `same` block. This arm looks for it there and prices the
 * boundary slide, which is what the proposal in the document rests on.
 */
function slide(label: string, oldText: string, newText: string): void {
  console.log(`\n### F. ${label} — the partner across the blank line`);
  const blocks = partition(oldText, newText);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b === undefined || b.kind !== 'change') continue;
    if (b.oldText === '' || b.newText === '') continue;
    const O = b.oldText.replace(/\n$/, '').split('\n');
    const N = b.newText.replace(/\n$/, '').split('\n');
    const inside = Math.max(...O.map((o) => Math.max(...N.map((n) => similarity(o, n)))));
    if (inside >= 0.5) {
      console.log(`  block ${String(i)}: sides resemble each other (${inside.toFixed(2)}), nothing to slide`);
      continue;
    }
    console.log(`  block ${String(i)}: the two sides resemble each other by ${inside.toFixed(2)}`);
    // Walk forward over whitespace-only `same` blocks looking for a pure
    // insertion holding a line that DOES resemble a removed line.
    let j = i + 1;
    let crossed = 0;
    while (j < blocks.length) {
      const nxt = blocks[j];
      if (nxt === undefined) break;
      if (nxt.kind === 'same') {
        if (nxt.oldText.trim() !== '') break;
        crossed += nxt.oldText.length;
        j += 1;
        continue;
      }
      break;
    }
    const partner = blocks[j];
    if (partner === undefined || partner.kind !== 'change' || partner.oldText !== '') {
      console.log('    no pure insertion follows it');
      continue;
    }
    const P = partner.newText.replace(/\n$/, '').split('\n');
    for (const o of O) {
      let best = -1;
      let score = -1;
      for (let k = 0; k < P.length; k++) {
        const sc = similarity(o, P[k] ?? '');
        if (sc > score) {
          score = sc;
          best = k;
        }
      }
      const line = P[best] ?? '';
      const d = wordEditDistance(o, line);
      const runs = redlineRuns(o, line);
      console.log(
        `    removed line ${cut(o, 55)}\n      matches added line #${String(best)} of the ` +
          `insertion ${String(crossed)} byte(s) later, similarity ${score.toFixed(2)}`
      );
      console.log(
        `      paired: edit distance ${d === null ? 'over ceiling' : String(d)} against cap ` +
          `${String(REDLINE_MAX_EDIT_LENGTH)}, ` +
          `${runs === null ? 'diffWords gave up' : `${String(runs.filter((r) => r.kind !== 'same').length)} marked run(s)`}`
      );
      if (runs !== null) {
        for (const r of runs.filter((x) => x.kind !== 'same')) {
          console.log(`        ${r.kind.padEnd(3)} ${cut(r.text, 90)}`);
        }
      }
    }
    // BOTH alignments move the same lines: the slide only changes WHICH
    // added line the removed line is paired with, so the two edit scripts are
    // the same length and jsdiff is not choosing a longer one. It is a tie,
    // and it picked the half of the tie that reads as a rewrite.
    console.log(
      `    jsdiff's alignment costs ${String(O.length + N.length + P.length)} line operations; ` +
        `the slid one costs ${String(O.length + N.length + P.length)}. A TIE.`
    );
  }
}

/**
 * HOW GENERAL IS IT. The operator saw it once, on one file. This arm asks the
 * same question of a synthetic document at every paragraph, both ways round,
 * so the answer is a RATE rather than an anecdote. A block is called
 * mis-aligned when its two sides resemble each other by less than half while
 * some line elsewhere in the same file's added set resembles the removed line
 * by more.
 */
function generality(): void {
  console.log('\n### G. how often the partition mis-slides, over a synthetic corpus');
  const para = (i: number): string =>
    `Paragraph ${String(i)} of the draft. It carries a simple sentence about the ` +
    `subject at hand, and the marker word for this one is w${String(i)}, which is ` +
    `what a person would change when they edit it.`;
  const NEW_PARA =
    'A paragraph that was not here before, added above the one below it, with its ' +
    'own sentences and nothing in common with them.';
  const rows: string[] = [];
  for (const where of ['above', 'below'] as const) {
    let mis = 0;
    let seen = 0;
    for (let k = 0; k < 8; k++) {
      const oldLines: string[] = [];
      for (let i = 0; i < 8; i++) {
        oldLines.push(para(i));
        oldLines.push('');
      }
      const newLines = oldLines.slice();
      // The one word edit in paragraph k.
      newLines[k * 2] = para(k).replace('a simple sentence', 'a  sentence');
      // The inserted paragraph, above it or below it.
      const at = where === 'above' ? k * 2 : k * 2 + 2;
      newLines.splice(at, 0, NEW_PARA, '');
      const oldText = `${oldLines.join('\n')}\n`;
      const newText = `${newLines.join('\n')}\n`;
      seen += 1;
      let bad = false;
      for (const b of partition(oldText, newText)) {
        if (b.kind !== 'change' || b.oldText === '' || b.newText === '') continue;
        const O = b.oldText.replace(/\n$/, '').split('\n');
        const N = b.newText.replace(/\n$/, '').split('\n');
        const inside = Math.max(...O.map((o) => Math.max(...N.map((n) => similarity(o, n)))));
        if (inside < 0.5) bad = true;
      }
      if (bad) mis += 1;
    }
    rows.push(`  a paragraph inserted ${where} the edited one: ${String(mis)} of ${String(seen)} mis-aligned`);
  }
  for (const r of rows) console.log(r);
}

/* ------------------------------------------------------------------ */
/* C. Ruling 4's timing, re-derived rather than quoted                  */
/* ------------------------------------------------------------------ */

function words(count: number, seedIn: number): string {
  const out: string[] = [];
  let x = seedIn;
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(`w${String(x % 500)}`);
  }
  return out.join(' ');
}

function timing(): void {
  console.log('\n### C. ruling 4 timing, re-derived on this machine today');
  const perSide = Math.round(REDLINE_MAX_BLOCK_CHARS / 4.8);
  const pairs: [string, string][] = [];
  for (let i = 0; i < REDLINE_MAX_BLOCKS; i++) {
    pairs.push([words(perSide, i * 2 + 1), words(perSide, i * 2 + 2)]);
  }
  console.log(
    `  the pathological file: ${String(REDLINE_MAX_BLOCKS)} blocks, ` +
      `${String(perSide)} words a side, ${String(pairs[0]?.[0].length ?? 0)} chars a side`
  );
  for (const cap of [200, 400]) {
    // Three runs; the median is reported so one scheduling hiccup is not the number.
    const runs: number[] = [];
    let gaveUp = 0;
    for (let r = 0; r < 3; r++) {
      gaveUp = 0;
      const t0 = process.hrtime.bigint();
      for (const [a, b] of pairs) {
        const parts = diffWords(a, b, {
          maxEditLength: cap,
          ...(SEG !== null ? { intlSegmenter: SEG } : {})
        });
        if (parts === undefined) gaveUp += 1;
      }
      runs.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    runs.sort((a, b) => a - b);
    console.log(
      `  maxEditLength ${String(cap)}: ${runs.map((v) => v.toFixed(1)).join(' / ')} ms ` +
        `(median ${(runs[1] ?? 0).toFixed(1)} ms), ${String(gaveUp)} of ${String(pairs.length)} gave up`
    );
  }
  // The realistic case ruling 4 measured at 1.9 ms.
  const base = words(830, 4242).split(' ');
  const edited = base.slice();
  for (let i = 0; i < 40; i++) edited[i * 20] = `x${String(i)}`;
  const oldText = base.join(' ');
  const newText = edited.join(' ');
  const runs: number[] = [];
  for (let r = 0; r < 5; r++) {
    const t0 = process.hrtime.bigint();
    diffWords(oldText, newText, {
      maxEditLength: REDLINE_MAX_EDIT_LENGTH,
      ...(SEG !== null ? { intlSegmenter: SEG } : {})
    });
    runs.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  runs.sort((a, b) => a - b);
  console.log(
    `  a 40-word edit inside an 830-word block at cap ${String(REDLINE_MAX_EDIT_LENGTH)}: ` +
      `median ${(runs[2] ?? 0).toFixed(2)} ms, distance ${String(wordEditDistance(oldText, newText))}`
  );
}

/* ------------------------------------------------------------------ */

const OLD = read('old.md');
const GOOD = read('new-good.md');
const BAD = read('new-bad.md');

console.log('# Phase 246 measure step');
console.log(
  `fixtures: old.md ${String(OLD.length)} chars, new-good.md ${String(GOOD.length)} chars, ` +
    `new-bad.md ${String(BAD.length)} chars`
);
console.log(
  `caps: REDLINE_MAX_EDIT_LENGTH=${String(REDLINE_MAX_EDIT_LENGTH)} ` +
    `REDLINE_MAX_BLOCK_CHARS=${String(REDLINE_MAX_BLOCK_CHARS)} ` +
    `REDLINE_MAX_BLOCKS=${String(REDLINE_MAX_BLOCKS)} ` +
    `REDLINE_DOC_MAX_LINE_EDITS=${String(REDLINE_DOC_MAX_LINE_EDITS)}`
);

const INSERT_ONLY = read('new-insert-only.md');

pierrePath('THE GOOD PICTURE (one word deleted)', OLD, GOOD);
documentPath('THE GOOD PICTURE (one word deleted)', OLD, GOOD);
pierrePath('THE BAD PICTURE (a paragraph inserted above)', OLD, BAD);
documentPath('THE BAD PICTURE (a paragraph inserted above)', OLD, BAD);
rawLines('THE BAD PICTURE', OLD, BAD);
alignments('THE BAD PICTURE', OLD, BAD);
slide('THE BAD PICTURE', OLD, BAD);
// His own two recorded baselines, generation 11 against generation 12, which
// differ by the inserted paragraph and by nothing else.
documentPath('HIS BASELINES 11 -> 12 (the paragraph inserted, nothing else)', GOOD, INSERT_ONLY);
rawLines('HIS BASELINES 11 -> 12', GOOD, INSERT_ONLY);
generality();
timing();
