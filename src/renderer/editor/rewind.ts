/**
 * Rewind, phrase by phrase: the pure half (Phase 227).
 *
 * Research 83 section B measured the rule and this module is that rule ported
 * as it was proved, from `.p222/fix/mix.ts` and the fix round scripts beside
 * it, keyed on the GROUP and nothing added. It takes strings and run lists and
 * answers strings and words. It names no bridge, opens no file, reads no tab
 * and writes nothing, so `npm run conformance:redline` can run every clause
 * under node over two strings and ablate it one clause at a time.
 *
 * ## The unit, research 83 B.2
 *
 * A CHANGE is a maximal stretch of consecutive non-`same` runs. A `same` run
 * can never be empty, because ./redline-document's `push` refuses `''`, so
 * consecutive non-`same` runs really are one place in the document, and the
 * eight things a person would point at in the B.1 fixture are exactly its
 * eight groups. The largest group seen over 3,999 fuzz pairs held three runs,
 * every one the whitespace repair's `del "\nclient" / ins " "` shape (B.4a).
 * A pure spacing change is a change with invisible bytes and it gets the same
 * control, because the control is keyed on the group and the face names
 * neither an author nor a kind (the operator's first ruling).
 *
 * ## The identity, research 83 B.4d
 *
 * A change is `(baseline offset, deleted text, inserted text)`, never a run
 * index and never the drawn bytes. The offset is into the BASELINE, advanced
 * by `same` and `del` text only, because the baseline is the one thing that
 * does not move while a person reads (B.8, with B.8a's generation guard in
 * front of it in ./RedlineDocument). Text alone is not an identity: two
 * identical phrases resolve to two edits by offset and to one by text. Offsets
 * are strictly increasing across one draw (2,998 draws, 0 non-increasing
 * pairs), so an offset names at most one change.
 */

import type { RedlineRun } from './redline';

/** One change: a maximal group of non-`same` runs, with its identity. */
export interface RedlineChange {
  /** Offset into the BASELINE where the group starts. */
  off: number;
  /** The deleted text, being every `del` run of the group in order. */
  del: string;
  /** The inserted text, being every `ins` run of the group in order. */
  ins: string;
  /** Indexes into the run list, consecutive, in order. */
  runs: number[];
}

/**
 * Group consecutive non-`same` runs into changes, each carrying the baseline
 * offset it starts at. `.p222/fix/mix.ts` `editsOf`, ported as it was proved.
 */
export function changesOf(runs: readonly RedlineRun[]): RedlineChange[] {
  const out: RedlineChange[] = [];
  let off = 0;
  let i = 0;
  while (i < runs.length) {
    const run = runs[i];
    if (run === undefined) break;
    if (run.kind === 'same') {
      off += run.text.length;
      i += 1;
      continue;
    }
    const start = off;
    let del = '';
    let ins = '';
    const indexes: number[] = [];
    while (i < runs.length) {
      const q = runs[i];
      if (q === undefined || q.kind === 'same') break;
      indexes.push(i);
      if (q.kind === 'del') {
        del += q.text;
        off += q.text.length;
      } else {
        ins += q.text;
      }
      i += 1;
    }
    out.push({ off: start, del, ins, runs: indexes });
  }
  return out;
}
