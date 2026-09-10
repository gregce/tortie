/**
 * one-block.mts — one change block through the SHIPPING table path and the
 * SHIPPING flat path side by side, so a claim about which draws the better
 * picture is a reading rather than an assertion (Phase 251, committer's round).
 *
 * It is the instrument behind the stated limit in `tableRuns`'s own header,
 * being that a block in which SOME rows pair can still be louder and coarser
 * than the flat stream it replaces. The two sides come in as `OLD_TEXT` and
 * `NEW_TEXT`, which is what lets a caller feed it a real revision out of this
 * repository's history without this file naming one.
 *
 * It launches no Electron, spawns nothing, makes no request and reads nothing
 * under the person's home.
 *
 *   OLD_TEXT=… NEW_TEXT=… \
 *     node_modules/.bin/tsx --tsconfig tsconfig.node.json build/p251/one-block.mts
 */

import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const url = (n: string): string =>
  pathToFileURL(join(process.cwd(), 'src/renderer/editor', n)).href;

interface Run { kind: 'same' | 'del' | 'ins'; text: string }

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const doc = (await import(url('redline-document.ts'))) as {
  tableRuns: (a: string, b: string) => { runs: Run[]; pairs: number; unpaired: number } | null;
  isTableBlock: (a: string, b: string) => boolean;
  exactRuns: (runs: readonly Run[], a: string, b: string) => Run[] | null;
  peelSharedSpace: (runs: readonly Run[]) => Run[];
  cancelPairs: (runs: readonly Run[]) => Run[];
};
const eng = (await import(url('redline.ts'))) as {
  redlineRuns: (a: string, b: string) => Run[] | null;
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

const oldText = process.env.OLD_TEXT ?? '';
const newText = process.env.NEW_TEXT ?? '';

const marked = (runs: readonly Run[]): number =>
  runs.filter((r) => r.kind !== 'same').reduce((n, r) => n + r.text.length, 0);
/** A mark whose own text carries a newline, which is a run crossing a row. */
const crossing = (runs: readonly Run[]): number =>
  runs.filter((r) => r.kind !== 'same' && r.text.includes('\n')).length;
/** The change unit, re-derived here rather than imported from ./rewind. */
const changes = (runs: readonly Run[]): number => {
  let n = 0;
  let open = false;
  for (const r of runs) {
    if (r.kind === 'same') open = false;
    else if (!open) {
      n += 1;
      open = true;
    }
  }
  return n;
};
/** What `composeRedlineDocument` does to a block's runs on the way in. */
const push = (runs: readonly Run[]): Run[] => {
  const out: Run[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last !== undefined && last.kind === r.kind) last.text += r.text;
    else out.push({ kind: r.kind, text: r.text });
  }
  return out;
};
const asDrawn = (runs: readonly Run[]): Run[] => doc.cancelPairs(doc.peelSharedSpace(push(runs)));
const shape = (runs: readonly Run[] | null): unknown =>
  runs === null
    ? null
    : { runs: runs.length, marked: marked(runs), changes: changes(runs), crossing: crossing(runs) };

const table = doc.tableRuns(oldText, newText);
const words = eng.redlineRuns(oldText, newText);
const flat = words === null ? null : doc.exactRuns(words, oldText, newText);

console.log(
  JSON.stringify(
    {
      isTable: doc.isTableBlock(oldText, newText),
      pairs: table?.pairs ?? -1,
      unpaired: table?.unpaired ?? -1,
      table: shape(table === null ? null : asDrawn(table.runs)),
      flat: shape(flat === null ? null : asDrawn(flat))
    },
    null,
    2
  )
);
