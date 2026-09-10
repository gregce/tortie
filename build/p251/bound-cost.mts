/**
 * bound-cost.mts — what `REDLINE_MAX_TABLE_ROWS` costs at its bound, measured
 * over the SHIPPING composer rather than asserted (Phase 251, committer's
 * round).
 *
 * It exists because the fix round published a cost sentence for the shape
 * research 114 §6.3's argument is built on, being 60 rows that pair nothing,
 * that was measured against the code BEFORE the same round's own `pairs === 0`
 * fall-through: with that fall-through in place those rows never reach the
 * table path's merged answer at all, they take the flat path, and two of the
 * three quantities the sentence named moved. This script is what makes the
 * corrected sentence re-runnable instead of a second unchecked measurement.
 *
 * It launches no Electron, opens no window, starts no tmux server, spawns
 * nothing, makes no request and reads nothing under the person's home. It
 * builds every shape itself.
 *
 *   node_modules/.bin/tsx --tsconfig tsconfig.node.json build/p251/bound-cost.mts
 */

import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const url = (name: string): string =>
  pathToFileURL(join(process.cwd(), 'src/renderer/editor', name)).href;

interface Run { kind: 'same' | 'del' | 'ins'; text: string }

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const doc = (await import(url('redline-document.ts'))) as {
  composeRedlineDocument: (a: string, b: string) => {
    runs: Run[];
    whole: Record<string, number>;
  };
  tableRuns: (a: string, b: string) => { runs: Run[]; pairs: number; spent: number } | null;
  isTableBlock: (a: string, b: string) => boolean;
};
const engine = (await import(url('redline.ts'))) as { REDLINE_MAX_TABLE_ROWS: number };
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

const N = engine.REDLINE_MAX_TABLE_ROWS;

/** A whole file, so the composer really partitions it into one change block. */
const file = (rows: string[]): string => `intro\n\n${rows.join('\n')}\n\ntail\n`;

/**
 * SHAPE 1a — 60 rows that pair NOTHING and that the FLAT path can still draw
 * word by word. One token a row and that token replaced, so `rowResemblance`
 * reads 0 at every cell of the DP and the flat path spends 120 of its 200.
 * This is the shape the fall-through was built for.
 */
const loneOld = Array.from({ length: N }, (_, i) => `| alpha${i} |`);
const loneNew = Array.from({ length: N }, (_, i) => `| xray${i} |`);

/**
 * SHAPE 1b — 60 rows that pair nothing and that the flat path ALSO gives up on,
 * so the whole-block fallback draws it. Two tokens a row, both replaced, which
 * is 240 word edits against a cap of 200.
 */
const unpairedOld = Array.from({ length: N }, (_, i) => `| alpha${i} | bravo${i} |`);
const unpairedNew = Array.from({ length: N }, (_, i) => `| xray${i} | yankee${i} |`);

/**
 * SHAPE 2 — 60 rows that pair and are word-diffed inside the shared budget.
 * Each row keeps most of its words and changes one, so resemblance clears 0.5
 * and each pair spends a little of `REDLINE_MAX_EDIT_LENGTH`.
 */
const pairedOld = Array.from(
  { length: N },
  (_, i) => `| session ${i} | the tab order holds here |`
);
const pairedNew = Array.from(
  { length: N },
  (_, i) => `| ledger ${i} | the tab order holds here |`
);

/**
 * SHAPE 3 — 60 rows of pure spacing churn at 21 words a row, both sides inside
 * `REDLINE_MAX_BLOCK_CHARS`. `diffWords` ignores whitespace, so a spacing split
 * is charged to no budget at all; this is the worst the row bound admits and it
 * is not this path's, because the flat path draws the same picture for it.
 */
const words = Array.from({ length: 21 }, (_, w) => String.fromCharCode(97 + w));
const churnOld = Array.from({ length: N }, () => `| ${words.join(' ')} |`);
const churnNew = Array.from({ length: N }, () => `| ${words.join('  ')} |`);

interface Reading {
  name: string;
  rows: number;
  bytes: [number, number];
  table: boolean;
  pairs: number;
  raw: number;
  docRuns: number;
  ms: number;
  /** The discarded row alignment alone, when `pairs === 0`. */
  tableMs: number;
  /** At `pairs === 0`, is the merged table answer byte identical to drawWhole's? */
  mergesToWhole: boolean | null;
  whole: Record<string, number>;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};

const read = (name: string, oldRows: string[], newRows: string[]): Reading => {
  const a = file(oldRows);
  const b = file(newRows);
  const blockA = `${oldRows.join('\n')}\n`;
  const blockB = `${newRows.join('\n')}\n`;
  const table = doc.isTableBlock(blockA, blockB);
  const t = table ? doc.tableRuns(blockA, blockB) : null;
  let tableMs = 0;
  if (t !== null) {
    for (let i = 0; i < 3; i += 1) doc.tableRuns(blockA, blockB);
    const ts: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const t0 = performance.now();
      doc.tableRuns(blockA, blockB);
      ts.push(performance.now() - t0);
    }
    tableMs = Math.round(median(ts) * 10) / 10;
  }
  // At `pairs === 0`, merge this path's own runs the way the document would and
  // compare with the whole-block fallback's two runs, which is the claim
  // `tableRuns`'s header rests the fall-through on.
  let mergesToWhole: boolean | null = null;
  if (t !== null && t.pairs === 0) {
    const merged: Run[] = [];
    for (const r of t.runs) {
      const last = merged[merged.length - 1];
      if (last !== undefined && last.kind === r.kind) last.text += r.text;
      else merged.push({ kind: r.kind, text: r.text });
    }
    const whole: Run[] = [
      { kind: 'del', text: blockA },
      { kind: 'ins', text: blockB }
    ];
    mergesToWhole = JSON.stringify(merged) === JSON.stringify(whole);
  }
  // Warm, then the median of five, so a first-call compile is not the reading.
  for (let i = 0; i < 3; i += 1) doc.composeRedlineDocument(a, b);
  const times: number[] = [];
  let out = doc.composeRedlineDocument(a, b);
  for (let i = 0; i < 5; i += 1) {
    const t0 = performance.now();
    out = doc.composeRedlineDocument(a, b);
    times.push(performance.now() - t0);
  }
  return {
    name,
    rows: oldRows.length,
    bytes: [blockA.length, blockB.length],
    table,
    pairs: t?.pairs ?? -1,
    raw: t?.runs.length ?? -1,
    docRuns: out.runs.length,
    ms: Math.round(median(times) * 10) / 10,
    tableMs,
    mergesToWhole,
    whole: out.whole
  };
};

const readings = [
  read('unpaired, flat draws it', loneOld, loneNew),
  read('unpaired, flat gives up', unpairedOld, unpairedNew),
  read('paired', pairedOld, pairedNew),
  read('spacing churn', churnOld, churnNew)
];

console.log(JSON.stringify({ bound: N, readings }, null, 2));
