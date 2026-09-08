/**
 * PHASE 227, item 3. The pure press: mix, identity resolution and the
 * decision, over the eight change fixture and all 256 subsets.
 *
 * Research 83 B.3 measured the rule and B.7 measured the family; this pins the
 * SHIPPING rewind.ts against those numbers. mix(∅) is the baseline, mix(all)
 * is the file, rewinding E4 gives the 465 byte string B.3 printed, and for
 * every one of the 2^8 subsets the composed runs still project to the two
 * sides and mix(T) is what the take says. Then the decision's four answers:
 * one (write the rewound bytes with the arriving work intact, B.4d ARM 3),
 * none-already-back and none-moved (E.7's last two rows), and ambiguous
 * (E.7, driven through resolvePress with a hand built list because a real
 * compose never produces two identical offsets). And undo, B.6, byte for byte.
 */

import { describe, expect, it } from 'vitest';
import { composeRedlineDocument } from '../redline-document';
import {
  changesOf,
  mix,
  planRewind,
  resolvePress
} from '../rewind';
import type { RewindInput } from '../rewind';

// Research 83 B.1, the real paragraph.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';
// B.3: rewinding E4, "throwaway viewer" back to "disposable client".
const REWOUND_E4 =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

const doc = composeRedlineDocument(BASELINE, CURRENT);
const changes = changesOf(doc.runs);
const ALL = new Set(changes.map((_, i) => i));
const NONE = new Set<number>();

const base = (over: Partial<RewindInput>): RewindInput => ({
  baseline: BASELINE,
  baselineGeneration: 3,
  drawnGeneration: 3,
  fresh: CURRENT,
  truncated: false,
  pressed: { off: 0, del: '', ins: '' },
  kind: 'rewind',
  ...over
});

describe('mix over the eight change fixture', () => {
  it('has eight changes at the offsets B.3 measured', () => {
    expect(changes.map((c) => c.off)).toEqual([7, 27, 62, 74, 183, 244, 322, 450]);
  });

  it('mix(none) is the baseline and mix(all) is the file', () => {
    expect(mix(doc.runs, changes, NONE)).toBe(BASELINE);
    expect(mix(doc.runs, changes, ALL)).toBe(CURRENT);
  });

  it('rewinding E4 gives the 465 byte string B.3 printed, and every other change stands', () => {
    const take = new Set(ALL);
    take.delete(4);
    const out = mix(doc.runs, changes, take);
    expect(out).toBe(REWOUND_E4);
    expect(out.length).toBe(465);
    expect(out).toContain('disposable client');
    expect(out).toContain('quitting the app');
    expect(out).toContain('rebuilt from memory');
  });
});

describe('all 256 subsets (B.7)', () => {
  it('each is distinct and projects to the two sides', () => {
    const seen = new Set<string>();
    for (let bits = 0; bits < 256; bits++) {
      const take = new Set<number>();
      for (let i = 0; i < 8; i++) if (bits & (1 << i)) take.add(i);
      const out = mix(doc.runs, changes, take);
      seen.add(out);
      // Recompose the baseline against this mix: it is the endpoint of the
      // family with exactly |take| changes remaining.
      const sub = composeRedlineDocument(BASELINE, out);
      const subChanges = changesOf(sub.runs);
      expect(subChanges.length).toBe(take.size);
      // The two projections hold at every subset.
      expect(sub.runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).toBe(BASELINE);
      expect(sub.runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(out);
    }
    expect(seen.size).toBe(256);
  });

  it('rewinding one change is mix minus that change, for all eight', () => {
    changes.forEach((c, i) => {
      const plan = planRewind(base({ pressed: { off: c.off, del: c.del, ins: c.ins } }));
      expect(plan.outcome).toBe('write');
      const take = new Set(ALL);
      take.delete(i);
      if (plan.outcome === 'write') expect(plan.contents).toBe(mix(doc.runs, changes, take));
    });
  });
});

describe('resolvePress', () => {
  it('resolves each drawn identity to exactly one, by offset', () => {
    changes.forEach((c, i) => {
      expect(resolvePress(changes, { off: c.off, del: c.del, ins: c.ins })).toEqual({ kind: 'one', index: i });
    });
  });

  it('two identical phrases resolve to distinct changes by offset', () => {
    const two = composeRedlineDocument(
      'The disposable client is small. A disposable client is replaceable.\n',
      'The throwaway viewer is small. A throwaway viewer is replaceable.\n'
    );
    const tc = changesOf(two.runs);
    expect(tc.length).toBe(2);
    expect(tc[0]?.del).toBe(tc[1]?.del);
    expect(resolvePress(tc, { off: tc[0]!.off, del: tc[0]!.del, ins: tc[0]!.ins })).toEqual({ kind: 'one', index: 0 });
    expect(resolvePress(tc, { off: tc[1]!.off, del: tc[1]!.del, ins: tc[1]!.ins })).toEqual({ kind: 'one', index: 1 });
  });

  it('answers many for a hand built list with two identical offsets (the defensive branch)', () => {
    const twin = [
      { off: 5, del: 'a', ins: 'b', runs: [1] },
      { off: 5, del: 'a', ins: 'b', runs: [3] }
    ];
    expect(resolvePress(twin, { off: 5, del: 'a', ins: 'b' })).toEqual({ kind: 'many' });
  });

  it('answers none when nothing matches', () => {
    expect(resolvePress(changes, { off: 999, del: 'x', ins: 'y' })).toEqual({ kind: 'none' });
  });
});

describe('the decision, B.4d ARM 3: re-derive at press time against the fresh file', () => {
  it('an agent appended a paragraph meanwhile: the rewind lands and the arrival stays', () => {
    const arrived = CURRENT + '\nEvery session carries its own name, so a crash is an interruption.\n';
    const e4 = changes[4]!;
    const plan = planRewind(base({ fresh: arrived, pressed: { off: e4.off, del: e4.del, ins: e4.ins } }));
    expect(plan.outcome).toBe('write');
    if (plan.outcome === 'write') {
      expect(plan.contents).toContain('disposable client');
      expect(plan.contents).toContain('Every session carries its own name');
      expect(plan.contents).toContain('quitting the app');
    }
  });

  it('the agent re-edited the same phrase: refuse, no longer in the file', () => {
    const e4 = changes[4]!;
    // The file now holds a THIRD thing where the pressed change was.
    const moved = CURRENT.replace('throwaway viewer', 'single-use terminal');
    const plan = planRewind(base({ fresh: moved, pressed: { off: e4.off, del: e4.del, ins: e4.ins } }));
    expect(plan).toEqual({ outcome: 'refused', why: 'phraseMoved' });
  });

  it('the phrase is already back to the baseline: refuse, already back', () => {
    const e4 = changes[4]!;
    // The file put "disposable client" back itself.
    const plan = planRewind(base({ fresh: REWOUND_E4, pressed: { off: e4.off, del: e4.del, ins: e4.ins } }));
    expect(plan).toEqual({ outcome: 'refused', why: 'alreadyBack' });
  });
});

describe('the before-read refusals, in press order', () => {
  const e4 = () => changes[4]!;
  const pressed = () => ({ off: e4().off, del: e4().del, ins: e4().ins });

  it('a moved baseline generation refuses first, before decodeLoss or the compose', () => {
    expect(planRewind(base({ drawnGeneration: 2, baselineGeneration: 3, pressed: pressed() }))).toEqual({
      outcome: 'refused',
      why: 'baselineMoved'
    });
    // Even with a truncated, U+FFFD-bearing fresh: generation still wins.
    expect(
      planRewind(base({ drawnGeneration: 2, baselineGeneration: 3, truncated: true, fresh: 'x�y', pressed: pressed() }))
    ).toEqual({ outcome: 'refused', why: 'baselineMoved' });
  });

  it('a truncated read refuses as too large, before the compose', () => {
    expect(planRewind(base({ truncated: true, pressed: pressed() }))).toEqual({
      outcome: 'refused',
      why: 'fileTooLarge'
    });
  });

  it('a decode that produced U+FFFD refuses as a decode loss', () => {
    const latin = CURRENT.replace('throwaway viewer', 'throwaway �viewer');
    expect(planRewind(base({ fresh: latin, pressed: pressed() }))).toEqual({
      outcome: 'refused',
      why: 'decodeLoss'
    });
  });
});

describe('undo, B.6', () => {
  const e4 = () => changes[4]!;
  it('puts a rewound change back byte for byte', () => {
    const p = { off: e4().off, del: e4().del, ins: e4().ins };
    // The file was rewound: it now holds the baseline text at that place.
    const plan = planRewind(base({ fresh: REWOUND_E4, pressed: p, kind: 'undo' }));
    expect(plan.outcome).toBe('write');
    if (plan.outcome === 'write') expect(plan.contents).toBe(CURRENT);
  });

  it('undo of a lone insertion re-inserts the word', () => {
    const b = 'one two three\n';
    const c = 'one inserted two three\n';
    const dd = composeRedlineDocument(b, c);
    const ins = changesOf(dd.runs);
    expect(ins.length).toBe(1);
    const p = { off: ins[0]!.off, del: ins[0]!.del, ins: ins[0]!.ins };
    // Rewound: the inserted word is gone, the file is back to the baseline.
    const rewound = planRewind({ baseline: b, baselineGeneration: 1, drawnGeneration: 1, fresh: c, truncated: false, pressed: p, kind: 'rewind' });
    expect(rewound.outcome).toBe('write');
    if (rewound.outcome !== 'write') return;
    expect(rewound.contents).toBe(b);
    // Undo against the rewound file re-inserts it.
    const undo = planRewind({ baseline: b, baselineGeneration: 1, drawnGeneration: 1, fresh: rewound.contents, truncated: false, pressed: p, kind: 'undo' });
    expect(undo.outcome).toBe('write');
    if (undo.outcome === 'write') expect(undo.contents).toBe(c);
  });

  it('undo refuses when the rewound span has since changed', () => {
    const p = { off: e4().off, del: e4().del, ins: e4().ins };
    // The file was rewound and then that region was edited to a third thing.
    const changed = REWOUND_E4.replace('disposable client', 'a rented laptop');
    expect(planRewind(base({ fresh: changed, pressed: p, kind: 'undo' }))).toEqual({
      outcome: 'refused',
      why: 'phraseMoved'
    });
  });
});
