/**
 * redline-table-probe.mts — rules 26 to 31 of `npm run conformance:redline`
 * (Phase 251), run under node over the SHIPPING redline document module.
 *
 * It prints one JSON object and judges nothing; `build/conformance-redline.mjs`
 * judges it, and re-runs this probe over ablated copies of the chain so an arm
 * that cannot fail is not mistaken for one that passed.
 *
 * `TABLE_DIR` names the directory the chain is imported from, which is
 * `src/renderer/editor` for the shipping reading and a copy with one clause
 * removed for an ablation.
 *
 * It launches no Electron, opens no window, starts no tmux server, spawns
 * nothing, makes no request and reads nothing under the person's home. The two
 * files it reads are build/p249/fixture-a.md and fixture-b.md, which are the
 * mock's own committed fixture.
 *
 * THE CHANGE GROUPING IS RE-DERIVED HERE rather than imported from ./rewind,
 * so the arm about changes is not asking the shipping code to confirm itself.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env.TABLE_DIR ?? 'src/renderer/editor';
const url = (name: string): string => pathToFileURL(join(process.cwd(), DIR, name)).href;

interface Run {
  kind: 'same' | 'del' | 'ins';
  text: string;
}
interface Leaf {
  wordless: boolean;
  blank: boolean;
  spacing: boolean;
  lone: boolean;
  drop: boolean;
}
interface TableResult {
  runs: Run[];
  paired: number;
  wholeRows: number;
  identical: number;
  separators: number;
  unpaired: number;
  spent: number;
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const doc = (await import(url('redline-document.ts'))) as {
  composeRedlineDocument: (a: string, b: string) => {
    runs: Run[];
    blocks: number;
    whole: Record<string, number>;
    approximate: boolean;
    slid: number;
  };
  tableRuns: (a: string, b: string) => TableResult | null;
  isTableBlock: (a: string, b: string) => boolean;
  cancelPairs: (runs: readonly Run[]) => Run[];
  redlineLeaves: (runs: readonly Run[]) => Leaf[];
  rowResemblance: (a: string, b: string) => number;
  redlineDocumentNote: (d: unknown) => string | null;
  exactRuns: (runs: readonly Run[], a: string, b: string) => Run[] | null;
  REDLINE_ROW_RESEMBLANCE: number;
};
const engine = (await import(url('redline.ts'))) as {
  redlineRuns: (a: string, b: string) => Run[] | null;
  REDLINE_MAX_EDIT_LENGTH: number;
  REDLINE_MAX_BLOCK_CHARS: number;
  REDLINE_MAX_TABLE_ROWS: number;
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

const oldSide = (runs: readonly Run[]): string =>
  runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const newSide = (runs: readonly Run[]): string =>
  runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
const rowsOf = (text: string): string[] => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

/** Research 83 B.2's unit, re-derived here: a maximal run of non-`same` runs. */
function groups(runs: readonly Run[]): number[][] {
  const out: number[][] = [];
  let i = 0;
  while (i < runs.length) {
    if (runs[i]?.kind === 'same') {
      i += 1;
      continue;
    }
    const one: number[] = [];
    while (i < runs.length && runs[i]?.kind !== 'same') {
      one.push(i);
      i += 1;
    }
    out.push(one);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The corpus, and the fuzz.
// ---------------------------------------------------------------------------

const FIXTURE_A = readFileSync(join(process.cwd(), 'build/p249/fixture-a.md'), 'utf8');
const FIXTURE_B = readFileSync(join(process.cwd(), 'build/p249/fixture-b.md'), 'utf8');

/** A table with its header, its separator and its rows, as a document. */
const table = (rows: string[][]): string =>
  rows.map((cells) => `| ${cells.join(' | ')} |`).join('\n') + '\n';

const RENAMED_OLD = table([
  ['surface', 'holds', 'reader'],
  ['-------', '-----', '------'],
  ['Sessions', 'the tab order', 'the window'],
  ['Manifest', 'argv and resume argv', 'restore'],
  ['Server', 'the live pane', 'attach host']
]);
const RENAMED_NEW = table([
  ['surface', 'holds', 'reader'],
  ['-------', '-----', '------'],
  ['Ledger', 'the tab order', 'the window'],
  ['Record', 'argv and resume argv', 'restore'],
  ['Daemon', 'the live pane', 'attach host']
]);

const REORDERED_OLD = table([
  ['surface', 'holds', 'reader'],
  ['-------', '-----', '------'],
  ['tmux server', 'the live pane', 'attach host'],
  ['manifest', 'argv and resume argv', 'restore'],
  ['Sessions', 'the tab order', 'the window']
]);
const REORDERED_NEW = table([
  ['surface', 'holds', 'reader'],
  ['-------', '-----', '------'],
  ['manifest', 'argv and resume argv', 'restore'],
  ['tmux server', 'the live pane', 'attach host'],
  ['Ledger', 'the tab order', 'the window']
]);

const SEP_PLAIN_OLD = table([
  ['surface', 'holds'],
  ['-------', '-----'],
  ['manifest', 'argv']
]);
const SEP_PLAIN_NEW = table([
  ['surface', 'holds', 'reader'],
  ['-------', '-----', '------'],
  ['manifest', 'argv', 'restore']
]);
const SEP_ALIGNED_OLD = table([
  ['surface', 'holds'],
  [':------', '-----'],
  ['manifest', 'argv']
]);
const SEP_ALIGNED_NEW = table([
  ['surface', 'holds', 'reader'],
  [':------', '-----', '------'],
  ['manifest', 'argv', 'restore']
]);

/** A blank line removed: one run, no other mark beside it, nothing readable. */
const BLANK_OLD = 'One paragraph.\n\nAnother paragraph.\n';
const BLANK_NEW = 'One paragraph.\nAnother paragraph.\n';

const CORPUS: { name: string; old: string; next: string }[] = [
  { name: 'the mock fixture', old: FIXTURE_A, next: FIXTURE_B },
  { name: 'a renamed first column', old: RENAMED_OLD, next: RENAMED_NEW },
  { name: 'reordered rows', old: REORDERED_OLD, next: REORDERED_NEW },
  { name: 'a plain separator gaining a column', old: SEP_PLAIN_OLD, next: SEP_PLAIN_NEW },
  { name: 'an aligned separator gaining a column', old: SEP_ALIGNED_OLD, next: SEP_ALIGNED_NEW },
  { name: 'a blank line removed', old: BLANK_OLD, next: BLANK_NEW },
  { name: 'a blank line added', old: BLANK_NEW, next: BLANK_OLD },
  {
    name: 'a table with no header',
    old: '| a | b |\n| c | d |\n',
    next: '| a | b |\n| c | e |\n'
  },
  {
    name: 'duplicate rows',
    old: table([['x', 'y'], ['x', 'y'], ['x', 'y']]),
    next: table([['x', 'y'], ['x', 'z'], ['x', 'y']])
  },
  {
    name: 'a table becoming a paragraph',
    old: table([['a', 'b'], ['c', 'd']]),
    next: 'A paragraph instead.\n'
  },
  {
    name: 'a paragraph becoming a table',
    old: 'A paragraph instead.\n',
    next: table([['a', 'b'], ['c', 'd']])
  },
  {
    name: 'a table with a trailing row and no final newline',
    old: '| a | b |\n| c | d |',
    next: '| a | b |\n| c | e |'
  },
  {
    name: 'cells that changed AND moved',
    old: table([['one', 'alpha'], ['two', 'bravo'], ['three', 'charlie']]),
    next: table([['three', 'delta'], ['one', 'alpha'], ['two', 'bravo echo']])
  },
  {
    name: 'a table of emoji with a zero width joiner',
    old: '| 👨‍👩‍👧 | family |\n| 🚀 | rocket |\n',
    next: '| 👨‍👩‍👧 | household |\n| 🚀 | rocket |\n'
  },
  {
    name: 'a right to left run in a cell',
    old: '| שלום עולם | greeting |\n',
    next: '| שלום חבר | greeting |\n'
  }
];

/** A deterministic little generator, so the fuzz is the same on every machine. */
function rng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x * 1103515245 + 12345) >>> 0;
    return x / 4294967296;
  };
}

const WORDS = [
  'manifest', 'session', 'restore', 'pane', 'window', 'order', 'argv',
  'reader', 'server', 'ledger', 'resume', 'tab', 'live', 'yes', 'no'
];

/** 420 pairs of table documents, mutated the ways a person mutates a table. */
function fuzzPairs(count: number): { old: string; next: string }[] {
  const rand = rng(20260909);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
  const cell = (): string => {
    const n = 1 + Math.floor(rand() * 3);
    return Array.from({ length: n }, () => pick(WORDS)).join(' ');
  };
  const out: { old: string; next: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const cols = 2 + Math.floor(rand() * 4);
    const rows = 1 + Math.floor(rand() * 12);
    const grid: string[][] = [Array.from({ length: cols }, () => cell())];
    grid.push(Array.from({ length: cols }, () => (rand() < 0.3 ? ':----' : '-----')));
    for (let r = 0; r < rows; r += 1) grid.push(Array.from({ length: cols }, () => cell()));
    const next = grid.map((r) => r.slice());
    // Between one and four mutations, of the kinds a person really makes.
    const edits = 1 + Math.floor(rand() * 4);
    for (let e = 0; e < edits; e += 1) {
      const what = Math.floor(rand() * 6);
      if (what === 0 && next.length > 3) {
        // A cell rewritten, first column included.
        const r = 2 + Math.floor(rand() * (next.length - 2));
        const c = Math.floor(rand() * cols);
        (next[r] as string[])[c] = cell();
      } else if (what === 1 && next.length > 3) {
        // Two rows swapped.
        const a = 2 + Math.floor(rand() * (next.length - 2));
        const b = 2 + Math.floor(rand() * (next.length - 2));
        const tmp = next[a] as string[];
        next[a] = next[b] as string[];
        next[b] = tmp;
      } else if (what === 2 && next.length > 3) {
        next.splice(2 + Math.floor(rand() * (next.length - 2)), 1);
      } else if (what === 3) {
        next.splice(2 + Math.floor(rand() * Math.max(1, next.length - 2)), 0,
          Array.from({ length: cols }, () => cell()));
      } else if (what === 4) {
        // A column added on the new side, separator and all.
        for (const [k, row] of next.entries()) row.push(k === 1 ? '-----' : cell());
      } else {
        // The separator's own dashes, and sometimes an alignment marker.
        next[1] = Array.from({ length: (next[1] as string[]).length }, () =>
          rand() < 0.5 ? '---' : ':---:'
        );
      }
    }
    const lead = rand() < 0.4 ? 'A paragraph above.\n\n' : '';
    const tail = rand() < 0.4 ? '\nA paragraph below.\n' : '';
    out.push({ old: lead + table(grid) + tail, next: lead + table(next) + tail });
  }
  return out;
}

const FUZZ = fuzzPairs(420);

// ---------------------------------------------------------------------------
// 26. BOTH PROJECTIONS, over the corpus and the fuzz.
// ---------------------------------------------------------------------------

let oldOk = 0;
let newOk = 0;
let tableBlocks = 0;
const failures: string[] = [];
for (const [i, pair] of [...CORPUS, ...FUZZ].entries()) {
  const d = doc.composeRedlineDocument(pair.old, (pair as { next: string }).next);
  if (oldSide(d.runs) === pair.old) oldOk += 1;
  else failures.push(`old ${String(i)}`);
  if (newSide(d.runs) === (pair as { next: string }).next) newOk += 1;
  else failures.push(`new ${String(i)}`);
}
for (const pair of CORPUS) {
  if (doc.isTableBlock(pair.old, pair.next)) tableBlocks += 1;
}
const projections = {
  documents: CORPUS.length + FUZZ.length,
  corpus: CORPUS.length,
  fuzz: FUZZ.length,
  oldOk,
  newOk,
  failures: failures.slice(0, 5)
};

// ---------------------------------------------------------------------------
// 27. NO WORD LEVEL PAIRING ACROSS TABLE ROWS.
//
// Every run `tableRuns` emits lies wholly inside ONE row of the side it
// belongs to. The flat path is the control: it is measured over the same block
// and it crosses.
// ---------------------------------------------------------------------------

function crossings(runs: readonly Run[], a: string, b: string): number {
  const bounds = (text: string): number[] => {
    const out: number[] = [0];
    let off = 0;
    for (const row of rowsOf(text)) {
      off += row.length;
      out.push(off);
    }
    return out;
  };
  const inside = (edges: readonly number[], from: number, to: number): boolean =>
    edges.some((s, k) => s <= from && to <= (edges[k + 1] ?? Infinity) && k + 1 < edges.length);
  const oldEdges = bounds(a);
  const newEdges = bounds(b);
  let o = 0;
  let n = 0;
  let crossed = 0;
  for (const run of runs) {
    const len = run.text.length;
    if (run.kind !== 'ins' && !inside(oldEdges, o, o + len)) crossed += 1;
    else if (run.kind === 'ins' && !inside(newEdges, n, n + len)) crossed += 1;
    if (run.kind !== 'ins') o += len;
    if (run.kind !== 'del') n += len;
  }
  return crossed;
}

const reorderedTable = doc.tableRuns(REORDERED_OLD, REORDERED_NEW);
const flatWords = engine.redlineRuns(REORDERED_OLD, REORDERED_NEW);
const flatExact = flatWords === null ? null : doc.exactRuns(flatWords, REORDERED_OLD, REORDERED_NEW);
const rowsNotCrossed = {
  rowRuns: reorderedTable?.runs.length ?? -1,
  rowCrossings: reorderedTable === null ? -1 : crossings(reorderedTable.runs, REORDERED_OLD, REORDERED_NEW),
  flatRuns: flatExact?.length ?? -1,
  flatCrossings: flatExact === null ? -1 : crossings(flatExact, REORDERED_OLD, REORDERED_NEW),
  paired: reorderedTable?.paired ?? -1,
  unpaired: reorderedTable?.unpaired ?? -1
};

// ---------------------------------------------------------------------------
// 28. THE ROW ALIGNMENT SURVIVES A RENAMED FIRST COLUMN.
// ---------------------------------------------------------------------------

const renamed = doc.tableRuns(RENAMED_OLD, RENAMED_NEW);
const renamedMarks = (renamed?.runs ?? [])
  .filter((r) => r.kind !== 'same')
  .map((r) => `${r.kind}:${r.text}`);
const oneRow = doc.composeRedlineDocument(
  '| Sessions | the tab order |\n',
  '| Ledger | the tab order |\n'
);
const renamedColumn = {
  paired: renamed?.paired ?? -1,
  wholeRows: renamed?.wholeRows ?? -1,
  unpaired: renamed?.unpaired ?? -1,
  marks: renamedMarks,
  oneRow: oneRow.runs.map((r) => `${r.kind}:${r.text}`),
  resemblance: doc.REDLINE_ROW_RESEMBLANCE
};

// ---------------------------------------------------------------------------
// 29. THE THREE CAPS, ASKED AS THREE QUESTIONS.
// ---------------------------------------------------------------------------

// (a) The word budget is the BLOCK's.
const budgetOld = Array.from({ length: 60 }, (_, i) => `| r${String(i)} | alpha bravo charlie delta |\n`).join('');
const budgetNew = Array.from({ length: 60 }, (_, i) => `| r${String(i)} | alpha zulu cobalt delta |\n`).join('');
const budgetTable = doc.tableRuns(budgetOld, budgetNew);
const budgetDoc = doc.composeRedlineDocument(budgetOld, budgetNew);
const flatBudget = engine.redlineRuns(budgetOld, budgetNew);

// (b) The table path is INSIDE the character cap.
const wideRow = (i: number): string => `| row ${String(i)} | ${'x'.repeat(60)} |\n`;
let overOld = '';
let overNew = '';
for (let i = 0; overOld.length <= engine.REDLINE_MAX_BLOCK_CHARS; i += 1) {
  overOld += wideRow(i);
  overNew += wideRow(i).replace('x', 'y');
}
const underOld = overOld.slice(0, overOld.lastIndexOf('\n', overOld.length - 2) + 1);
const underNew = overNew.slice(0, overNew.lastIndexOf('\n', overNew.length - 2) + 1);
const over = doc.composeRedlineDocument(overOld, overNew);
const under = doc.composeRedlineDocument(underOld, underNew);

// (c) `tableRuns` has a refusal of its own.
const narrow = (cell: string, n: number): string => Array.from({ length: n }, () => `|${cell}|\n`).join('');
const at666 = doc.tableRuns(narrow('ab', 666), narrow('cd', 666));
const at61 = doc.tableRuns(narrow('ab', 61), narrow('cd', 61));
const at60 = doc.tableRuns(narrow('ab', 60), narrow('cd', 60));
const doc666 = doc.composeRedlineDocument(narrow('ab', 666), narrow('cd', 666));

const caps = {
  budget: {
    spent: budgetTable?.spent ?? -1,
    limit: engine.REDLINE_MAX_EDIT_LENGTH,
    paired: budgetTable?.paired ?? -1,
    wholeRows: budgetTable?.wholeRows ?? -1,
    changes: groups(budgetDoc.runs).length,
    flatCollapsed: flatBudget === null
  },
  charCap: {
    limit: engine.REDLINE_MAX_BLOCK_CHARS,
    overBytes: overOld.length,
    overRuns: over.runs.length,
    overTooBig: over.whole.tooBig,
    underBytes: underOld.length,
    underRuns: under.runs.length,
    underTooBig: under.whole.tooBig
  },
  rowCap: {
    limit: engine.REDLINE_MAX_TABLE_ROWS,
    at666: at666 === null ? null : at666.runs.length,
    at666Bytes: narrow('ab', 666).length,
    at61: at61 === null ? null : at61.runs.length,
    at60: at60 === null ? null : at60.runs.length,
    documentRunsAt666: doc666.runs.length,
    // THE ROW CAP HAS ITS OWN COUNTER AND ITS OWN SENTENCE (the fix round).
    // `tooBig` reads `N too long` and 666 rows of five bytes is 3,330
    // characters, a fifth of `REDLINE_MAX_BLOCK_CHARS`, so that sentence would
    // be false about the only quantity it names. Both are read, so a round that
    // folds them back together turns this arm red.
    documentTooBigAt666: doc666.whole.tooBig,
    documentTooManyRowsAt666: doc666.whole.tooManyRows,
    noteAt666: (doc.redlineDocumentNote(doc666) ?? '')
  }
};

// ---------------------------------------------------------------------------
// 29d. THE FOURTH REFUSAL, WHICH IS THE FIX ROUND'S: an alignment that aligned
// NO row has drawn nothing, so the block falls through to the flat path.
//
// The block is the shape the verifier of this phase found in this repository's
// own prose history, `docs/research/107` at `9e0f57a6`: ONE table row whose
// second and third cells were rewritten. `rowResemblance` reads under the
// threshold, the row does not pair, and at the parent of this fix it drew as a
// whole deletion beside a whole insertion — research 114 §6.3's own condemned
// picture, reached through the resemblance door instead of the first-cell one.
//
// TWO READINGS, because a fall-through that fires on everything is as wrong as
// one that fires on nothing: the refused block must be drawn word by word, and
// a block in which even one row pairs must still take the row alignment.
// ---------------------------------------------------------------------------

const FALL_OLD =
  '| a **symlink** | **nothing in version one** | ' +
  'the root rule already removes them and no separate rule is needed |\n';
const FALL_NEW =
  '| a **symlink** | **the file it points at, when it is inside a root** | ' +
  'the root rule does NOT remove them on its own and one is a correction |\n';
const fallTable = doc.tableRuns(FALL_OLD, FALL_NEW);
const fallDoc = doc.composeRedlineDocument(FALL_OLD, FALL_NEW);
// THE CONTROL: even one pair keeps the row alignment, and the unchanged row
// stays one unchanged run rather than being re-diffed against its neighbour.
const KEEP_OLD = '| alpha | one |\n| beta | two |\n';
const KEEP_NEW = '| alpha | one |\n| zulu | nine |\n';
const keepTable = doc.tableRuns(KEEP_OLD, KEEP_NEW);
const keepDoc = doc.composeRedlineDocument(KEEP_OLD, KEEP_NEW);
// THE PROPERTY THAT MAKES THE FALL-THROUGH FREE: with no pair at all the table
// path's own runs merge to exactly the two runs the whole-block fallback draws,
// so the flat path is asked in place of a picture and never in place of one.
const MERGE_OLD = '| alpha | one |\n| beta | two |\n';
const MERGE_NEW = '| zulu | nine |\n| yankee | eight |\n';
const mergeTable = doc.tableRuns(MERGE_OLD, MERGE_NEW);
const mergedKinds: string[] = [];
let mergedOld = '';
let mergedNew = '';
for (const run of mergeTable?.runs ?? []) {
  if (mergedKinds[mergedKinds.length - 1] !== run.kind) mergedKinds.push(run.kind);
  if (run.kind !== 'ins') mergedOld += run.text;
  if (run.kind !== 'del') mergedNew += run.text;
}
const fallThrough = {
  refusedPairs: fallTable?.pairs ?? -1,
  refusedResemblance: Number(doc.rowResemblance(FALL_OLD, FALL_NEW).toFixed(2)),
  threshold: doc.REDLINE_ROW_RESEMBLANCE,
  drawnSame: fallDoc.runs.filter((r) => r.kind === 'same').length,
  drawnMarks: fallDoc.runs.filter((r) => r.kind !== 'same').length,
  drawnWhole:
    fallDoc.whole.tooBig +
    fallDoc.whole.tooManyRows +
    fallDoc.whole.tooDifferent +
    fallDoc.whole.overCap +
    fallDoc.whole.unaligned,
  oldOk: oldSide(fallDoc.runs) === FALL_OLD,
  newOk: newSide(fallDoc.runs) === FALL_NEW,
  keepPairs: keepTable?.pairs ?? -1,
  keepFirstRunIsWholeRow: (keepDoc.runs[0]?.text ?? '').startsWith('| alpha | one |\n'),
  mergedKinds: mergedKinds.join('|'),
  mergedIsWholeBlock: mergedOld === MERGE_OLD && mergedNew === MERGE_NEW
};

// ---------------------------------------------------------------------------
// 30. THE CANCEL PASS IS AN IDENTITY ON BOTH PROJECTIONS.
// ---------------------------------------------------------------------------

let cancelHeld = 0;
let cancelFired = 0;
for (const pair of [...CORPUS, ...FUZZ]) {
  const d = doc.composeRedlineDocument(pair.old, pair.next);
  const again = doc.cancelPairs(d.runs);
  if (oldSide(again) === oldSide(d.runs) && newSide(again) === newSide(d.runs)) cancelHeld += 1;
  if (again.length !== d.runs.length) cancelFired += 1;
}
const planted: Run[] = [
  { kind: 'same', text: 'a' },
  { kind: 'del', text: 'x' },
  { kind: 'ins', text: 'x' },
  { kind: 'same', text: 'b' }
];
const plantedDiffer: Run[] = [
  { kind: 'same', text: 'a' },
  { kind: 'del', text: 'x' },
  { kind: 'ins', text: 'y' },
  { kind: 'same', text: 'b' }
];
const cancel = {
  documents: CORPUS.length + FUZZ.length,
  held: cancelHeld,
  firedInThePipeline: cancelFired,
  planted: doc.cancelPairs(planted).map((r) => `${r.kind}:${r.text}`),
  plantedDiffer: doc.cancelPairs(plantedDiffer).map((r) => `${r.kind}:${r.text}`)
};

// ---------------------------------------------------------------------------
// 31. THE DROPPED SEPARATOR.
// ---------------------------------------------------------------------------

function dropReading(a: string, b: string): {
  drops: string[];
  kinds: string[];
  oldOk: boolean;
  newOk: boolean;
} {
  const d = doc.composeRedlineDocument(a, b);
  const leaves = doc.redlineLeaves(d.runs);
  const drops: string[] = [];
  const kinds: string[] = [];
  for (const [i, run] of d.runs.entries()) {
    if (leaves[i]?.drop === true) {
      drops.push(run.text);
      kinds.push(run.kind);
    }
  }
  return { drops, kinds, oldOk: oldSide(d.runs) === a, newOk: newSide(d.runs) === b };
}
const separator = {
  plain: dropReading(SEP_PLAIN_OLD, SEP_PLAIN_NEW),
  aligned: dropReading(SEP_ALIGNED_OLD, SEP_ALIGNED_NEW),
  fixture: dropReading(FIXTURE_A, FIXTURE_B)
};

// ---------------------------------------------------------------------------
// 32. NO CHANGE IS EVER ENTIRELY UNDRAWN, and the property is INK.
// ---------------------------------------------------------------------------

const INK = /[\p{L}\p{N}]/u;
/**
 * What a person can SEE of one mark, re-derived here from the leaf facts and
 * the shipping stylesheet's own rules rather than asked of the module: a mark
 * with ink draws its glyphs, a wordless mark draws its own glyphs too, a
 * spacing mark keeps its wash and a lone mark gets its bar. Anything else
 * paints nothing.
 */
const paints = (run: Run, leaf: Leaf): boolean =>
  INK.test(run.text) || leaf.wordless || leaf.spacing || leaf.lone;

let changesSeen = 0;
let inkless = 0;
let loneMarks = 0;
const inklessNames: string[] = [];
for (const pair of [...CORPUS, ...FUZZ]) {
  const d = doc.composeRedlineDocument(pair.old, pair.next);
  const leaves = doc.redlineLeaves(d.runs);
  for (const group of groups(d.runs)) {
    changesSeen += 1;
    let drawn = false;
    for (const k of group) {
      const run = d.runs[k] as Run;
      const leaf = leaves[k] as Leaf;
      if (leaf.lone) loneMarks += 1;
      if (paints(run, leaf)) drawn = true;
    }
    if (!drawn) {
      inkless += 1;
      if (inklessNames.length < 4) {
        inklessNames.push(group.map((k) => JSON.stringify((d.runs[k] as Run).text)).join('+'));
      }
    }
  }
}
const blankDoc = doc.composeRedlineDocument(BLANK_OLD, BLANK_NEW);
const blankLeaves = doc.redlineLeaves(blankDoc.runs);
const ink = {
  changes: changesSeen,
  inkless,
  inklessNames,
  loneMarks,
  blankLineMarks: blankDoc.runs
    .map((r, i) => ({ r, leaf: blankLeaves[i] as Leaf }))
    .filter(({ r }) => r.kind !== 'same')
    .map(({ r, leaf }) => `${r.kind}:${JSON.stringify(r.text)}:${leaf.lone ? 'lone' : leaf.spacing ? 'spacing' : 'plain'}`)
};

// ---------------------------------------------------------------------------
// RULING 5, BOTH WAYS: a spacing-change mark is washed, a structural one is not.
// ---------------------------------------------------------------------------

const spacingDoc = doc.composeRedlineDocument(
  'Spacing   here   was   uneven.\n',
  'Spacing here was uneven.\n'
);
const spacingLeaves = doc.redlineLeaves(spacingDoc.runs);
const ruling5 = {
  spacing: spacingDoc.runs
    .map((r, i) => ({ r, leaf: spacingLeaves[i] as Leaf }))
    .filter(({ r }) => r.kind !== 'same')
    .map(({ r, leaf }) => `${r.kind}:${JSON.stringify(r.text)}:${leaf.spacing ? 'washed' : 'not washed'}`),
  structural: ink.blankLineMarks
};

process.stdout.write(
  `${JSON.stringify({
    projections,
    tableBlocks,
    rowsNotCrossed,
    renamedColumn,
    caps,
    fallThrough,
    cancel,
    separator,
    ink,
    ruling5
  })}\n`
);
