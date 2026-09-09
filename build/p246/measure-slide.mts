/**
 * measure-slide.mts. Phase 246's BUILD step measurement: what the tie-breaker
 * in `src/renderer/editor/redline-document.ts` does, over the operator's own
 * bytes, over the synthetic corpus research 110 §6 counted, and over REAL
 * prose edits taken out of this repository's own git history.
 *
 * It imports the SHIPPING module rather than a copy. It launches no Electron,
 * opens no window, starts no tmux server, spawns nothing but a read-only
 * `git`, makes no request, and writes nothing outside its own stdout.
 *
 *   node_modules/.bin/tsx --tsconfig tsconfig.node.json build/p246/measure-slide.mts
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { diffLines, diffWords } from 'diff';
import {
  composeRedlineDocument,
  resemblance,
  REDLINE_SLIDE_RESEMBLANCE
} from '../../src/renderer/editor/redline-document';
import type { RedlineRun } from '../../src/renderer/editor/redline';

const FIX = join(process.cwd(), 'build/fixtures/redline-p246');
const read = (name: string): string => readFileSync(join(FIX, name), 'utf8');
const cut = (s: string, n = 70): string =>
  JSON.stringify(s.length > n ? `${s.slice(0, n)}…(${String(s.length)})` : s);

function marked(runs: readonly RedlineRun[]): RedlineRun[] {
  return runs.filter((r) => r.kind !== 'same');
}

/* ------------------------------------------------------------------ */
/* 1. His own two pictures                                             */
/* ------------------------------------------------------------------ */

console.log('### 1. the operator\'s own bytes, through the shipping composer');
for (const [label, oldName, newName] of [
  ['THE GOOD PICTURE', 'old.md', 'new-good.md'],
  ['THE BAD PICTURE', 'old.md', 'new-bad.md'],
  ['HIS BASELINES 11 -> 12', 'new-good.md', 'new-insert-only.md']
] as const) {
  const doc = composeRedlineDocument(read(oldName), read(newName));
  console.log(
    `\n  ${label}: ${String(doc.blocks)} block(s), slid ${String(doc.slid)}, ` +
      `whole ${JSON.stringify(doc.whole)}, approximate ${String(doc.approximate)}`
  );
  console.log(`    projections: old ${String(
    doc.runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('') === read(oldName)
  )}, new ${String(
    doc.runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('') === read(newName)
  )}`);
  const m = marked(doc.runs);
  console.log(`    ${String(m.length)} marked run(s):`);
  for (const r of m) console.log(`      ${r.kind.padEnd(3)} ${cut(r.text, 90)}`);
}

/* ------------------------------------------------------------------ */
/* 2. The synthetic corpus of research 110 §6                          */
/* ------------------------------------------------------------------ */

console.log('\n### 2. research 110 §6\'s corpus, re-run through the shipping composer');
const PARA = (k: number): string =>
  `Paragraph ${String(k)} carries a simple sentence about the work and the way it is done, ` +
  `with enough ordinary words in it that a word diff has something to hold on to.`;
const INSERT = 'A newly written paragraph that shares almost nothing with any of the others above or below it.';

function synthetic(where: 'above' | 'below'): {
  total: number;
  slid: number;
  marked: number[];
  readable: number;
} {
  const slidCounts: number[] = [];
  let slid = 0;
  let readable = 0;
  for (let k = 0; k < 8; k++) {
    const oldLines: string[] = [];
    for (let i = 0; i < 8; i++) oldLines.push(PARA(i), '');
    const newLines: string[] = [];
    for (let i = 0; i < 8; i++) {
      const body = i === k ? PARA(i).replace('simple ', '') : PARA(i);
      if (i === k && where === 'above') newLines.push(INSERT, '');
      newLines.push(body, '');
      if (i === k && where === 'below') newLines.push(INSERT, '');
    }
    const doc = composeRedlineDocument(oldLines.join('\n'), newLines.join('\n'));
    slid += doc.slid;
    const m = marked(doc.runs);
    slidCounts.push(m.length);
    // The picture a reader wants: the inserted paragraph in green, and the one
    // word that moved struck through. Anything else, and in particular a
    // deletion the length of a whole paragraph, is the operator's bad picture.
    if (
      m.length === 2 &&
      m.some((r) => r.kind === 'ins' && r.text.includes('newly written')) &&
      m.some((r) => r.kind === 'del' && r.text.trim() === 'simple')
    ) {
      readable += 1;
    }
    const okOld = doc.runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('') === oldLines.join('\n');
    const okNew = doc.runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('') === newLines.join('\n');
    if (!okOld || !okNew) throw new Error(`projection broke at k=${String(k)} ${where}`);
  }
  return { total: 8, slid, marked: slidCounts, readable };
}
for (const where of ['above', 'below'] as const) {
  const r = synthetic(where);
  console.log(
    `  inserted ${where.toUpperCase().padEnd(5)}: ${String(r.readable)} of ${String(r.total)} draw the ` +
      `readable picture (the paragraph in green, the one word struck), ${String(r.slid)} of them ` +
      `needed the slide; marked runs per file ${JSON.stringify(r.marked)}`
  );
}

/* ------------------------------------------------------------------ */
/* 3. REAL prose edits out of this repository's history                */
/* ------------------------------------------------------------------ */

console.log('\n### 3. real prose pairs from this repository\'s git history');
const git = (args: string[]): string => {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : '';
};
const commits = git(['log', '--format=%H', '-n', '400', '--', 'docs', 'README.md', 'CHANGELOG.md'])
  .split('\n')
  .filter((c) => c !== '');

interface Reading {
  file: string;
  sim: number;
  slidHere: boolean;
}
const readings: Reading[] = [];
let pairs = 0;
let filesSlid = 0;
let blocksSlid = 0;
let blocksTotal = 0;
let projectionFailures = 0;
const wordDistance = (a: string, b: string): number | null => {
  const parts = diffWords(a, b, { maxEditLength: 200 });
  if (parts === undefined) return null;
  let d = 0;
  for (const p of parts) if (p.added === true || p.removed === true) d += 1;
  return d;
};

for (const sha of commits) {
  const names = git(['diff-tree', '--no-commit-id', '-r', '--name-only', '--diff-filter=M', sha])
    .split('\n')
    .filter((n) => /\.(md|txt)$/.test(n));
  for (const name of names) {
    const before = git(['show', `${sha}^:${name}`]);
    const after = git(['show', `${sha}:${name}`]);
    if (before === '' || after === '' || before === after) continue;
    if (before.length > 400_000 || after.length > 400_000) continue;
    pairs += 1;
    const doc = composeRedlineDocument(before, after);
    blocksTotal += doc.blocks;
    if (doc.runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('') !== before) projectionFailures += 1;
    if (doc.runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('') !== after) projectionFailures += 1;
    if (doc.slid > 0) {
      filesSlid += 1;
      blocksSlid += doc.slid;
      readings.push({ file: `${sha.slice(0, 8)} ${name}`, sim: 0, slidHere: true });
    }
  }
}
console.log(
  `  ${String(pairs)} real pairs over ${String(commits.length)} commits, ` +
    `${String(blocksTotal)} change blocks, ${String(blocksSlid)} slid in ${String(filesSlid)} file(s), ` +
    `${String(projectionFailures)} projection failure(s)`
);
for (const r of readings.slice(0, 25)) console.log(`    slid: ${r.file}`);

/* ------------------------------------------------------------------ */
/* 4. What the constant separates, over the same real corpus           */
/* ------------------------------------------------------------------ */

console.log('\n### 4. what the pairings really resemble, and where 0.5 falls');

/**
 * The line partition, re-derived here rather than imported, so the readings
 * below are taken by a second spelling of the same thing.
 */
function partition(oldText: string, newText: string): { kind: string; oldText: string; newText: string }[] {
  const parts = diffLines(oldText, newText, { maxEditLength: 1_000 });
  if (parts === undefined) return [];
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

const bins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let both = 0;
const candidates: {
  sim: number;
  partner: number;
  distance: number | null;
  wasDistance: number | null;
}[] = [];
for (const sha of commits) {
  const names = git(['diff-tree', '--no-commit-id', '-r', '--name-only', '--diff-filter=M', sha])
    .split('\n')
    .filter((n) => /\.(md|txt)$/.test(n));
  for (const name of names) {
    const before = git(['show', `${sha}^:${name}`]);
    const after = git(['show', `${sha}:${name}`]);
    if (before === '' || after === '' || before === after) continue;
    if (before.length > 400_000 || after.length > 400_000) continue;
    const blocks = partition(before, after);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b === undefined || b.kind !== 'change' || b.oldText === '' || b.newText === '') continue;
      both += 1;
      const sim = resemblance(b.oldText, b.newText);
      const bin = Math.min(9, Math.floor(sim * 10));
      bins[bin] = (bins[bin] ?? 0) + 1;
      if (sim >= REDLINE_SLIDE_RESEMBLANCE) continue;
      let j = i + 1;
      let bridge = '';
      while (j < blocks.length) {
        const step = blocks[j];
        if (step === undefined || step.kind !== 'same' || step.oldText.trim() !== '') break;
        bridge += step.oldText;
        j += 1;
      }
      const partner = blocks[j];
      if (bridge === '' || partner === undefined || partner.kind !== 'change' || partner.oldText !== '') continue;
      if (!partner.newText.endsWith(bridge)) continue;
      const paired = partner.newText.slice(0, partner.newText.length - bridge.length);
      if (paired === '') continue;
      candidates.push({
        sim,
        partner: resemblance(b.oldText, paired),
        distance: wordDistance(b.oldText, paired),
        wasDistance: wordDistance(b.oldText, b.newText)
      });
    }
  }
}
console.log(`  ${String(both)} change blocks with text on both sides; resemblance histogram by tenth:`);
console.log(`    ${bins.map((n, k) => `${String(k / 10)}:${String(n)}`).join('  ')}`);
console.log(
  `  ${String(candidates.length)} of them are doubtful AND have a reachable pure insertion behind a blank line:`
);
for (const c of candidates) {
  console.log(
    `    pairing resembles ${c.sim.toFixed(2)}, the candidate resembles ${c.partner.toFixed(2)}, ` +
      `margin ${(c.partner - c.sim).toFixed(2)}, ` +
      `word distance ${c.wasDistance === null ? 'over 200' : String(c.wasDistance)} -> ` +
      `${c.distance === null ? 'over 200' : String(c.distance)}`
  );
}
console.log(`  the constant in force is ${String(REDLINE_SLIDE_RESEMBLANCE)}`);
