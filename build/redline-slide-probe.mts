/**
 * redline-slide-probe.mts — rule 25 of `npm run conformance:redline` (Phase
 * 246), run under node over the SHIPPING redline document module.
 *
 * It prints one JSON object and judges nothing; `build/conformance-redline.mjs`
 * judges it, and re-runs this probe over ablated copies of the chain so an arm
 * that cannot fail is not mistaken for one that passed.
 *
 * `SLIDE_DIR` names the directory the chain is imported from, which is
 * `src/renderer/editor` for the shipping reading and a copy with one clause
 * removed for an ablation.
 *
 * It launches no Electron, opens no window, starts no tmux server, spawns
 * nothing, makes no request and reads nothing under the person's home. The
 * only files it reads are the four fixtures under build/fixtures/redline-p246,
 * which are the operator's own bytes recovered read-only on 2026-09-09.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { diffLines } from 'diff';

const DIR = process.env.SLIDE_DIR ?? 'src/renderer/editor';
const url = (name: string): string =>
  pathToFileURL(join(process.cwd(), DIR, name)).href;

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const mod = (await import(url('redline-document.ts'))) as {
  composeRedlineDocument: (a: string, b: string) => {
    runs: { kind: string; text: string }[];
    blocks: number;
    slid: number;
    whole: Record<string, number>;
    approximate: boolean;
  };
  slideBoundaries: (blocks: readonly Block[]) => { blocks: Block[]; slid: number };
  resemblance: (a: string, b: string) => number;
  REDLINE_SLIDE_RESEMBLANCE: number;
  REDLINE_SLIDE_MARGIN: number;
};

interface Block {
  kind: 'same' | 'change';
  oldText: string;
  newText: string;
}
interface Run {
  kind: string;
  text: string;
}

const FIX = join(process.cwd(), 'build/fixtures/redline-p246');
const fixture = (name: string): string => readFileSync(join(FIX, name), 'utf8');

const marked = (runs: readonly Run[]): Run[] => runs.filter((r) => r.kind !== 'same');
const oldSide = (runs: readonly Run[]): string =>
  runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const newSide = (runs: readonly Run[]): string =>
  runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

/**
 * The line partition, re-derived here rather than imported, so the "before"
 * side of the tie is taken by a second spelling of the same thing.
 */
function partition(oldText: string, newText: string): Block[] {
  const parts = diffLines(oldText, newText, { maxEditLength: 1_000 });
  if (parts === undefined) return [];
  const blocks: Block[] = [];
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

/** Line operations an alignment spends: every line of a change block. */
function lineCost(blocks: readonly Block[]): number {
  const lines = (text: string): number => {
    if (text === '') return 0;
    const whole = text.split('\n').length - 1;
    return text.endsWith('\n') ? whole : whole + 1;
  };
  let n = 0;
  for (const b of blocks) {
    if (b.kind !== 'change') continue;
    n += lines(b.oldText) + lines(b.newText);
  }
  return n;
}

/* ---------------------------------------------------------------- */
/* The corpus: his own bytes, research 110 §6's synthetic files, and */
/* the shapes that stress the tie.                                    */
/* ---------------------------------------------------------------- */

const PARA = (k: number): string =>
  `Paragraph ${String(k)} carries a simple sentence about the work and the way it is done, ` +
  `with enough ordinary words in it that a word diff has something to hold on to.`;
const INSERT =
  'A newly written paragraph that shares almost nothing with any of the others above or below it.';

function syntheticPair(k: number, where: 'above' | 'below'): [string, string] {
  const oldLines: string[] = [];
  for (let i = 0; i < 8; i++) oldLines.push(PARA(i), '');
  const newLines: string[] = [];
  for (let i = 0; i < 8; i++) {
    const body = i === k ? PARA(i).replace('simple ', '') : PARA(i);
    if (i === k && where === 'above') newLines.push(INSERT, '');
    newLines.push(body, '');
    if (i === k && where === 'below') newLines.push(INSERT, '');
  }
  return [oldLines.join('\n'), newLines.join('\n')];
}

const CORPUS: { name: string; oldText: string; newText: string }[] = [
  { name: 'his good picture', oldText: fixture('old.md'), newText: fixture('new-good.md') },
  { name: 'his bad picture', oldText: fixture('old.md'), newText: fixture('new-bad.md') },
  { name: 'his baselines 11 -> 12', oldText: fixture('new-good.md'), newText: fixture('new-insert-only.md') },
  { name: 'his bad picture, backwards', oldText: fixture('new-bad.md'), newText: fixture('old.md') },
  // The shapes that stress the tie: an insertion of ONE terminated line
  // across a blank line, which the whole-lines clause must refuse, and the
  // same thing with the blank line under it, which it must take.
  {
    name: 'one terminated line, no blank under it',
    oldText: 'head\n\nRed lorry stands here.\n\nfoot\n',
    newText: 'head\n\nQuite another thing.\n\nRed lorry waits here.\nfoot\n'
  },
  {
    name: 'the same with the blank line under it',
    oldText: 'head\n\nRed lorry stands here.\n\nfoot\n',
    newText: 'head\n\nQuite another thing.\n\nRed lorry waits here.\n\nfoot\n'
  },
  {
    name: 'the last paragraph of the file',
    oldText: 'head\n\nRed lorry stands here.\n',
    newText: 'head\n\nQuite another thing.\n\nRed lorry waits here.\n'
  },
  { name: 'an unchanged file', oldText: 'a\nb\n', newText: 'a\nb\n' },
  { name: 'an empty old side', oldText: '', newText: 'a\n\nb\n' }
];
for (let k = 0; k < 8; k++) {
  const [a, b] = syntheticPair(k, 'above');
  CORPUS.push({ name: `synthetic ${String(k)} above`, oldText: a, newText: b });
  const [c, d] = syntheticPair(k, 'below');
  CORPUS.push({ name: `synthetic ${String(k)} below`, oldText: c, newText: d });
}

/* ---------------------------------------------------------------- */
/* Arm: his two pictures                                             */
/* ---------------------------------------------------------------- */

const badDoc = mod.composeRedlineDocument(fixture('old.md'), fixture('new-bad.md'));
const badMarked = marked(badDoc.runs);
const bad = {
  markedCount: badMarked.length,
  marks: badMarked.map((r) => `${r.kind}:${r.text.slice(0, 32)}`),
  slid: badDoc.slid,
  whole: badDoc.whole,
  oldOk: oldSide(badDoc.runs) === fixture('old.md'),
  newOk: newSide(badDoc.runs) === fixture('new-bad.md')
};

const goodDoc = mod.composeRedlineDocument(fixture('old.md'), fixture('new-good.md'));
const good = {
  digest: digest(goodDoc.runs),
  markedCount: marked(goodDoc.runs).length,
  marks: marked(goodDoc.runs).map((r) => `${r.kind}:${r.text}`),
  slid: goodDoc.slid,
  whole: goodDoc.whole
};

/* ---------------------------------------------------------------- */
/* Arm: the tie, and the projections, over the whole corpus          */
/* ---------------------------------------------------------------- */

let costEqual = 0;
let costMoved = 0;
const costMovedNames: string[] = [];
let oldOk = 0;
let newOk = 0;
let slidTotal = 0;
let whitespaceOnlyMarked = 0;
let sharedSpacePairs = 0;
const spaceAt = (s: string, at: number): boolean => /\s/.test(s.charAt(at));
for (const item of CORPUS) {
  const before = partition(item.oldText, item.newText);
  const after = mod.slideBoundaries(before);
  if (lineCost(after.blocks) === lineCost(before)) costEqual += 1;
  else {
    costMoved += 1;
    costMovedNames.push(`${item.name} ${String(lineCost(before))}->${String(lineCost(after.blocks))}`);
  }
  const doc = mod.composeRedlineDocument(item.oldText, item.newText);
  slidTotal += doc.slid;
  if (oldSide(doc.runs) === item.oldText) oldOk += 1;
  if (newSide(doc.runs) === item.newText) newOk += 1;
  // Research 74 §6.5: a strikethrough over an invisible newline. A marked run
  // that is nothing but whitespace is that picture, and an adjacent deletion
  // and insertion sharing whitespace at either end is how one is made.
  for (const run of doc.runs) {
    if (run.kind !== 'same' && run.text.trim() === '' && run.text.includes('\n')) {
      whitespaceOnlyMarked += 1;
    }
  }
  for (let i = 0; i + 1 < doc.runs.length; i++) {
    const a = doc.runs[i];
    const b = doc.runs[i + 1];
    if (a === undefined || b === undefined) continue;
    if (a.kind === 'same' || b.kind === 'same' || a.kind === b.kind) continue;
    if (a.text === '' || b.text === '') continue;
    if (spaceAt(a.text, 0) && a.text.charAt(0) === b.text.charAt(0)) sharedSpacePairs += 1;
    if (
      spaceAt(a.text, a.text.length - 1) &&
      a.text.charAt(a.text.length - 1) === b.text.charAt(b.text.length - 1)
    ) {
      sharedSpacePairs += 1;
    }
  }
}
const tie = { documents: CORPUS.length, costEqual, costMoved, costMovedNames };
const exact = {
  documents: CORPUS.length,
  oldOk,
  newOk,
  slidTotal,
  whitespaceOnlyMarked,
  sharedSpacePairs
};

/* ---------------------------------------------------------------- */
/* Arm: research 110 §6's corpus, and what a reader can see          */
/* ---------------------------------------------------------------- */

function readable(where: 'above' | 'below'): { readable: number; slid: number } {
  let ok = 0;
  let slid = 0;
  for (let k = 0; k < 8; k++) {
    const [a, b] = syntheticPair(k, where);
    const doc = mod.composeRedlineDocument(a, b);
    slid += doc.slid;
    const m = marked(doc.runs);
    if (
      m.length === 2 &&
      m.some((r) => r.kind === 'ins' && r.text.includes('newly written')) &&
      m.some((r) => r.kind === 'del' && r.text.trim() === 'simple')
    ) {
      ok += 1;
    }
  }
  return { readable: ok, slid };
}
const corpus = { above: readable('above'), below: readable('below') };

/* ---------------------------------------------------------------- */
/* Arms: the refusals that keep the slide narrow                     */
/* ---------------------------------------------------------------- */

const shape = (): Block[] => [
  { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
  { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Quite another thing.\n' },
  { kind: 'same', oldText: '\n', newText: '\n' },
  { kind: 'change', oldText: '', newText: 'Red lorry waits here.\n\n' }
];
const withBlock = (i: number, block: Block): Block[] => {
  const bs = shape();
  bs[i] = block;
  return bs;
};

const control = mod.slideBoundaries(shape()).slid;

const narrowBridge = {
  control,
  // A bridge that is prose rather than a blank line is not a bridge.
  prose: mod.slideBoundaries(
    withBlock(2, { kind: 'same', oldText: 'a sentence of context\n', newText: 'a sentence of context\n' })
  ).slid,
  // The same, but with an insertion that really does end with that prose, so
  // the whitespace clause is the ONLY thing refusing it. Without that shape
  // the clause is masked by the one under it and could be deleted in silence.
  proseThatMatches: mod.slideBoundaries([
    { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
    { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Quite another thing.\n' },
    { kind: 'same', oldText: 'shared context line\n', newText: 'shared context line\n' },
    { kind: 'change', oldText: '', newText: 'Red lorry waits here.\nshared context line\n' }
  ]).slid,
  // A partner that is not a PURE insertion is not a partner.
  notPure: mod.slideBoundaries(
    withBlock(3, { kind: 'change', oldText: 'x\n', newText: 'Red lorry waits here.\n\n' })
  ).slid,
  // Backwards. Only the forward case was measured, so only it is repaired.
  backwards: mod.slideBoundaries([
    { kind: 'change', oldText: '', newText: 'Red lorry waits here.\n\n' },
    { kind: 'same', oldText: '\n', newText: '\n' },
    { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Quite another thing.\n' }
  ]).slid
};

// A doubtful pairing at 0.40 whose candidate reads 0.60: better, and by less
// than the margin, which is the 0.47-against-0.51 shape research 110's corpus
// found and which is the only one the margin refuses on its own.
const TEN = 'one two three four five six seven eight nine ten\n';
const narrowMargin = {
  control,
  sameReadingTwice: mod.slideBoundaries([
    { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
    { kind: 'change', oldText: TEN, newText: 'one two three four aa bb cc dd ee ff\n' },
    { kind: 'same', oldText: '\n', newText: '\n' },
    { kind: 'change', oldText: '', newText: 'one two three four five six gg hh ii jj\n\n' }
  ]).slid,
  sameReadingTwiceReads: [
    Number(mod.resemblance(TEN, 'one two three four aa bb cc dd ee ff\n').toFixed(2)),
    Number(mod.resemblance(TEN, 'one two three four five six gg hh ii jj\n').toFixed(2))
  ],
  // A candidate that does not resemble the removed side at all.
  unrelated: mod.slideBoundaries(
    withBlock(3, { kind: 'change', oldText: '', newText: 'Something else entirely different.\n\n' })
  ).slid,
  // A pairing the two sides already agree on is believed.
  believed: mod.slideBoundaries(
    withBlock(1, { kind: 'change', oldText: 'Red lorry waits there.\n', newText: 'Red lorry waits here.\n' })
  ).slid
};

/* ---------------------------------------------------------------- */
/* The two readings the constants are pinned by                      */
/* ---------------------------------------------------------------- */

const oldLines = fixture('old.md').split('\n');
const badLines = fixture('new-bad.md').split('\n');
const constants = {
  resemblance: mod.REDLINE_SLIDE_RESEMBLANCE,
  margin: mod.REDLINE_SLIDE_MARGIN,
  wronglyPaired: Number(mod.resemblance(oldLines[5] ?? '', badLines[5] ?? '').toFixed(2)),
  realPartner: Number(mod.resemblance(oldLines[5] ?? '', badLines[7] ?? '').toFixed(2))
};

process.stdout.write(
  `${JSON.stringify({ bad, good, tie, exact, corpus, narrowBridge, narrowMargin, constants })}\n`
);
