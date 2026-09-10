/**
 * Phase 246. A paragraph inserted ABOVE an edited one used to rewrite the
 * paragraph below it (docs/research/110).
 *
 * `diffLines` had two shortest edit scripts of the same length and took the
 * one that pairs the removed paragraph with the INSERTED one. Every cap in the
 * feature passed, `diffWords` answered, and the picture was still a whole
 * paragraph in red followed by the whole paragraph in green. This pins the
 * tie-break that re-cuts it, the four refusals that keep it narrow, and the
 * two properties that make it a tie-break rather than a different diff.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  composeRedlineDocument,
  newTextOf,
  oldTextOf,
  resemblance,
  slideBoundaries,
  REDLINE_SLIDE_MARGIN,
  REDLINE_SLIDE_RESEMBLANCE
} from '../redline-document';
import type { LineBlock } from '../redline-document';
import type { RedlineRun } from '../redline';

const FIX = join(process.cwd(), 'build/fixtures/redline-p246');
const fixture = (name: string): string => readFileSync(join(FIX, name), 'utf8');

const marked = (runs: readonly RedlineRun[]): RedlineRun[] =>
  runs.filter((r) => r.kind !== 'same');

/** The line operations an alignment spends: every line that is not shared. */
function lineCost(blocks: readonly LineBlock[]): number {
  const lines = (text: string): number => (text === '' ? 0 : text.split('\n').length);
  let n = 0;
  for (const b of blocks) {
    if (b.kind !== 'change') continue;
    n += lines(b.oldText) + lines(b.newText);
  }
  return n;
}

describe("the operator's own two pictures, 2026-09-09", () => {
  it('the good picture is one struck word and nothing else', () => {
    const doc = composeRedlineDocument(fixture('old.md'), fixture('new-good.md'));
    expect(marked(doc.runs)).toEqual([{ kind: 'del', text: 'micro' }]);
    // Nothing slid, so this picture is the one the parent commit drew.
    expect(doc.slid).toBe(0);
    expect(doc.whole).toEqual({
      tooBig: 0,
      tooManyRows: 0,
      tooDifferent: 0,
      overCap: 0,
      unaligned: 0
    });
  });

  it('the bad picture draws the inserted paragraph and the one word that moved', () => {
    const doc = composeRedlineDocument(fixture('old.md'), fixture('new-bad.md'));
    const m = marked(doc.runs);
    // At the parent commit this read 15 runs: the paragraph below struck
    // through in pieces interleaved with a paragraph it has nothing to do
    // with, and then the whole paragraph again in green.
    expect(m).toHaveLength(3);
    expect(m[0]).toEqual({ kind: 'del', text: 'micro' });
    expect(m[1]?.kind).toBe('ins');
    expect(m[1]?.text.startsWith('What context do agents need?')).toBe(true);
    expect(m[2]).toEqual({ kind: 'del', text: 'simple' });
    expect(doc.slid).toBe(1);
    // No cap fired at the parent either, which is why there was nothing to say.
    expect(doc.whole).toEqual({
      tooBig: 0,
      tooManyRows: 0,
      tooDifferent: 0,
      overCap: 0,
      unaligned: 0
    });
  });

  it('both projections are exact over every fixture pair', () => {
    for (const [a, b] of [
      ['old.md', 'new-good.md'],
      ['old.md', 'new-bad.md'],
      ['new-good.md', 'new-insert-only.md'],
      ['new-bad.md', 'old.md']
    ] as const) {
      const doc = composeRedlineDocument(fixture(a), fixture(b));
      expect(oldTextOf(doc.runs)).toBe(fixture(a));
      expect(newTextOf(doc.runs)).toBe(fixture(b));
    }
  });
});

describe('slideBoundaries', () => {
  /** The measured shape: a doubtful pair, a blank line, the real partner. */
  const shape = (): LineBlock[] => [
    { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
    { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Quite another thing.\n' },
    { kind: 'same', oldText: '\n', newText: '\n' },
    { kind: 'change', oldText: '', newText: 'Red lorry waits here.\n\n' }
  ];

  it('re-cuts the block, keeps both projections and spends the same line cost', () => {
    const before = shape();
    const after = slideBoundaries(before);
    expect(after.slid).toBe(1);
    const joinOld = (bs: readonly LineBlock[]): string => bs.map((b) => b.oldText).join('');
    const joinNew = (bs: readonly LineBlock[]): string => bs.map((b) => b.newText).join('');
    expect(joinOld(after.blocks)).toBe(joinOld(before));
    expect(joinNew(after.blocks)).toBe(joinNew(before));
    // THE TIE. The same lines are removed and the same lines are added; only
    // their grouping moved, so this cannot buy a picture with edits jsdiff
    // refused to spend.
    expect(lineCost(after.blocks)).toBe(lineCost(before));
    expect(after.blocks).toEqual([
      { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
      { kind: 'change', oldText: '', newText: 'Quite another thing.\n\n' },
      { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Red lorry waits here.\n' },
      { kind: 'same', oldText: '\n', newText: '\n' }
    ]);
  });

  it('leaves a pairing the two sides already agree on', () => {
    const blocks = shape();
    blocks[1] = { kind: 'change', oldText: 'Red lorry waits there.\n', newText: 'Red lorry waits here.\n' };
    expect(slideBoundaries(blocks).slid).toBe(0);
  });

  it('refuses when there is no whitespace-only bridge to cross', () => {
    const blocks = shape();
    blocks[2] = { kind: 'same', oldText: 'a sentence of context\n', newText: 'a sentence of context\n' };
    expect(slideBoundaries(blocks).slid).toBe(0);
    // And with an insertion that really does end with that prose, so the
    // whitespace clause is the only thing refusing it rather than the clause
    // under it doing the work.
    expect(
      slideBoundaries([
        { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
        { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Quite another thing.\n' },
        { kind: 'same', oldText: 'shared context line\n', newText: 'shared context line\n' },
        { kind: 'change', oldText: '', newText: 'Red lorry waits here.\nshared context line\n' }
      ]).slid
    ).toBe(0);
  });

  it('refuses when the block behind the bridge is not a pure insertion', () => {
    const blocks = shape();
    blocks[3] = { kind: 'change', oldText: 'x\n', newText: 'Red lorry waits here.\n\n' };
    expect(slideBoundaries(blocks).slid).toBe(0);
  });

  it('refuses when the bridge is not whole lines of the insertion, so the cost would rise', () => {
    // One line with no blank under it: taking the bridge off leaves a line
    // with no terminator, which is still a line, so the rewrite would spend an
    // edit the partition did not.
    const blocks = shape();
    blocks[3] = { kind: 'change', oldText: '', newText: 'Red lorry waits here.\n' };
    expect(slideBoundaries(blocks).slid).toBe(0);
    // And at the end of the file, where there is no terminator at all.
    blocks[3] = { kind: 'change', oldText: '', newText: 'Red lorry waits here.' };
    expect(slideBoundaries(blocks).slid).toBe(0);
  });

  it('refuses a candidate that does not resemble the removed side', () => {
    const blocks = shape();
    blocks[3] = { kind: 'change', oldText: '', newText: 'Something else entirely different.\n\n' };
    expect(slideBoundaries(blocks).slid).toBe(0);
  });

  it('refuses a candidate that is better by less than the margin', () => {
    // The 0.47-against-0.51 shape research 110's corpus found: the candidate
    // really is better, and by so little that it is one reading twice.
    const ten = 'one two three four five six seven eight nine ten\n';
    const paired = 'one two three four aa bb cc dd ee ff\n';
    const candidate = 'one two three four five six gg hh ii jj\n';
    expect(resemblance(ten, paired)).toBeCloseTo(0.4, 5);
    expect(resemblance(ten, candidate)).toBeCloseTo(0.6, 5);
    expect(resemblance(ten, candidate)).toBeGreaterThanOrEqual(REDLINE_SLIDE_RESEMBLANCE);
    expect(resemblance(ten, candidate) - resemblance(ten, paired)).toBeLessThan(
      REDLINE_SLIDE_MARGIN
    );
    expect(
      slideBoundaries([
        { kind: 'same', oldText: 'head\n\n', newText: 'head\n\n' },
        { kind: 'change', oldText: ten, newText: paired },
        { kind: 'same', oldText: '\n', newText: '\n' },
        { kind: 'change', oldText: '', newText: `${candidate}\n` }
      ]).slid
    ).toBe(0);
  });

  it('looks forward only, because only the forward case was measured', () => {
    const blocks: LineBlock[] = [
      { kind: 'change', oldText: '', newText: 'Red lorry waits here.\n\n' },
      { kind: 'same', oldText: '\n', newText: '\n' },
      { kind: 'change', oldText: 'Red lorry stands here.\n', newText: 'Quite another thing.\n' }
    ];
    expect(slideBoundaries(blocks).slid).toBe(0);
  });
});

describe('resemblance', () => {
  it('is 1 for the same words and 0 for none in common', () => {
    expect(resemblance('a b c', 'c b a')).toBe(1);
    expect(resemblance('a b c', 'x y z')).toBe(0);
    expect(resemblance('', '')).toBe(1);
    expect(resemblance('a', '')).toBe(0);
  });

  it("reads the operator's own pair at 0.09 and its real partner at 0.98", () => {
    const bad = fixture('new-bad.md').split('\n');
    const old = fixture('old.md').split('\n');
    const removed = old[5] ?? '';
    const wronglyPaired = bad[5] ?? '';
    const realPartner = bad[7] ?? '';
    expect(Number(resemblance(removed, wronglyPaired).toFixed(2))).toBe(0.09);
    expect(Number(resemblance(removed, realPartner).toFixed(2))).toBe(0.98);
    expect(resemblance(removed, wronglyPaired)).toBeLessThan(REDLINE_SLIDE_RESEMBLANCE);
    expect(resemblance(removed, realPartner)).toBeGreaterThanOrEqual(REDLINE_SLIDE_RESEMBLANCE);
  });
});
