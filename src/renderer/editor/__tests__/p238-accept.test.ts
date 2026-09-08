/**
 * PHASE 238, item 1. The pure accept: `acceptChange`, `acceptAll` and the
 * decision in front of them, over the same eight change fixture and all 256
 * subsets `p227-rewind.test.ts` pins the mix over.
 *
 * Research 83 B.3 stated the rule and B.5 drove it. Accepting change `e`
 * writes THE BASELINE as `mix(runs, {e})` and leaves the file; accepting
 * everything is `baseline := the bytes in front of you`. The property that
 * matters to a person is the one at the bottom of each block: after accepting
 * `e`, the redline recomposed against the SAME current text holds seven
 * changes instead of eight, the accepted phrase is gone from it, and the
 * current text is unmoved byte for byte, which is B.5's "not one byte of the
 * file changed" said in the only terms a pure module can say it.
 */

import { describe, expect, it } from 'vitest';
import { composeRedlineDocument } from '../redline-document';
import {
  acceptAll,
  acceptChange,
  changesOf,
  mix,
  planAccept
} from '../rewind';
import type { AcceptInput } from '../rewind';

// Research 83 B.1, the real paragraph — the same two strings Phase 227 pins.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

const doc = composeRedlineDocument(BASELINE, CURRENT);
const changes = changesOf(doc.runs);
const ALL = new Set(changes.map((_, i) => i));

const base = (over: Partial<AcceptInput>): AcceptInput => ({
  baseline: BASELINE,
  baselineGeneration: 4,
  drawnGeneration: 4,
  current: CURRENT,
  truncated: false,
  pressed: null,
  ...over
});

describe('acceptAll is baseline := the bytes you are looking at (B.5)', () => {
  it('answers the current text byte for byte', () => {
    expect(acceptAll(CURRENT)).toBe(CURRENT);
  });

  it('is the same answer mix over the whole take set gives, so it IS the same function', () => {
    expect(acceptAll(CURRENT)).toBe(mix(doc.runs, changes, ALL));
  });

  it('leaves a redline with zero changes', () => {
    const after = composeRedlineDocument(acceptAll(CURRENT), CURRENT);
    expect(changesOf(after.runs)).toEqual([]);
    expect(after.runs.every((r) => r.kind === 'same')).toBe(true);
  });
});

describe('acceptChange is mix over exactly that change (B.3)', () => {
  it('has the eight changes at the offsets B.3 measured', () => {
    expect(changes.map((c) => c.off)).toEqual([7, 27, 62, 74, 183, 244, 322, 450]);
  });

  it('accepting E4 gives a baseline holding "throwaway viewer" and nothing else new', () => {
    const next = acceptChange(doc.runs, changes, 4);
    expect(next).toContain('throwaway viewer');
    // Every OTHER change is still the baseline's side.
    expect(next).toContain('keeps every session alive');
    expect(next).toContain('closing the window');
    expect(next).toContain('reconstructed from memory');
  });

  it('for each of the eight: the redline loses exactly that change and the file is untouched', () => {
    changes.forEach((c, i) => {
      const next = acceptChange(doc.runs, changes, i);
      expect(next).toBe(mix(doc.runs, changes, new Set([i])));
      const after = composeRedlineDocument(next, CURRENT);
      const left = changesOf(after.runs);
      expect(left.length).toBe(changes.length - 1);
      // The accepted change is gone: no remaining change carries its bytes.
      expect(left.some((q) => q.del === c.del && q.ins === c.ins)).toBe(false);
      // B.5: not one byte of the CURRENT text moved. The projection says it.
      expect(after.runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(CURRENT);
      expect(after.runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).toBe(next);
    });
  });
});

describe('all 256 subsets', () => {
  it('accepting a subset is mix over that subset, and the redline keeps the rest', () => {
    const seen = new Set<string>();
    for (let bits = 0; bits < 256; bits++) {
      const take = new Set<number>();
      for (let i = 0; i < 8; i++) if (bits & (1 << i)) take.add(i);
      // Accept the subset one change at a time, in order, re-deriving the
      // picture after each one exactly as the view does. The end state must
      // be the single mix over the whole subset.
      let baseline = BASELINE;
      for (const i of [...take].sort((a, b) => a - b)) {
        const d = composeRedlineDocument(baseline, CURRENT);
        const cs = changesOf(d.runs);
        // The change to accept is the one carrying the original's bytes.
        const at = cs.findIndex(
          (q) => q.del === changes[i]?.del && q.ins === changes[i]?.ins
        );
        expect(at).toBeGreaterThanOrEqual(0);
        baseline = acceptChange(d.runs, cs, at);
      }
      expect(baseline).toBe(mix(doc.runs, changes, take));
      seen.add(baseline);
      const after = composeRedlineDocument(baseline, CURRENT);
      expect(changesOf(after.runs).length).toBe(8 - take.size);
      // And the current text never moved, at any subset.
      expect(after.runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(CURRENT);
    }
    expect(seen.size).toBe(256);
  });
});

describe('the decision, with the generation guard in front of it (B.8a)', () => {
  it('accepts one change by its drawn identity', () => {
    const c = changes[4]!;
    const plan = planAccept(base({ pressed: { off: c.off, del: c.del, ins: c.ins } }));
    expect(plan).toEqual({ outcome: 'accept', baseline: acceptChange(doc.runs, changes, 4) });
  });

  it('accepts everything when nothing is named', () => {
    expect(planAccept(base({}))).toEqual({ outcome: 'accept', baseline: CURRENT });
  });

  it('a moved baseline generation refuses FIRST, before the compose, for one and for all', () => {
    const c = changes[4]!;
    expect(
      planAccept(base({ drawnGeneration: 3, pressed: { off: c.off, del: c.del, ins: c.ins } }))
    ).toEqual({ outcome: 'refused', why: 'baselineMoved' });
    expect(planAccept(base({ drawnGeneration: 3 }))).toEqual({
      outcome: 'refused',
      why: 'baselineMoved'
    });
    // Even with a truncated read, which would otherwise decide: the guard wins.
    expect(planAccept(base({ drawnGeneration: 3, truncated: true }))).toEqual({
      outcome: 'refused',
      why: 'baselineMoved'
    });
  });

  it('a truncated tab refuses, because its right-hand side is not the file', () => {
    expect(planAccept(base({ truncated: true }))).toEqual({
      outcome: 'refused',
      why: 'fileTooLarge'
    });
  });

  it('a change that is no longer drawn refuses rather than accepting a neighbour', () => {
    const c = changes[4]!;
    const moved = CURRENT.replace('throwaway viewer', 'single-use terminal');
    expect(
      planAccept(base({ current: moved, pressed: { off: c.off, del: c.del, ins: c.ins } }))
    ).toEqual({ outcome: 'refused', why: 'phraseMoved' });
  });
});

describe('B.8a driven through the accept itself, which is what makes the generation move', () => {
  it('two accepts against ONE drawn picture: the second refuses rather than taking the wrong phrase', () => {
    // The document research 83 B.8a built: two identical phrases, and a
    // leading clause whose length is the gap between their baseline offsets.
    const left = 'The consignment note, filed on the Tuesday of that week, is here.\nThe first lorry was red on Monday.\nThe second lorry was red on Friday.\n';
    const right = 'The consignment note is here.\nThe first lorry was blue on Monday.\nThe second lorry was blue on Friday.\n';
    const drawn = changesOf(composeRedlineDocument(left, right).runs);
    expect(drawn.length).toBe(3);
    const heading = drawn[0]!;
    const firstLorry = drawn[1]!;
    // The person accepts the heading clause. The baseline moves.
    const afterHeading = planAccept({
      baseline: left,
      baselineGeneration: 1,
      drawnGeneration: 1,
      current: right,
      truncated: false,
      pressed: { off: heading.off, del: heading.del, ins: heading.ins }
    });
    expect(afterHeading.outcome).toBe('accept');
    // Now the press the person had already drawn, at generation 1, arrives.
    // The generation is 2, so it refuses; nothing resolves and nothing moves.
    const stale = planAccept({
      baseline: afterHeading.outcome === 'accept' ? afterHeading.baseline : left,
      baselineGeneration: 2,
      drawnGeneration: 1,
      current: right,
      truncated: false,
      pressed: { off: firstLorry.off, del: firstLorry.del, ins: firstLorry.ins }
    });
    expect(stale).toEqual({ outcome: 'refused', why: 'baselineMoved' });
    // AND THE ABLATION, so the pin is not vacuous: without the guard the SAME
    // identity resolves to exactly one change, and it is the SECOND lorry.
    const fresh = changesOf(
      composeRedlineDocument(
        afterHeading.outcome === 'accept' ? afterHeading.baseline : left,
        right
      ).runs
    );
    const hits = fresh.filter(
      (q) => q.off === firstLorry.off && q.del === firstLorry.del && q.ins === firstLorry.ins
    );
    expect(hits.length).toBe(1);
    expect(fresh.indexOf(hits[0]!)).toBe(1);
  });
});
