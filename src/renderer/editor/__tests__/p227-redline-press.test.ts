/**
 * PHASE 227 fix round. The press records the identity it was PRESSED with.
 *
 * The verifier drove the real chord with main's read held open and moved the
 * focus with ⌥↓ inside the wait: E0 was rewound and the journal held E1, so
 * undo said "no longer in the file" and E0's rewind was recoverable from
 * nothing Tortie keeps; with the focus moved onto a pure insertion, undo wrote
 * that insertion a second time. Pinned here under node over the SHIPPING
 * press with a call site that moves the focus while it is awaited: the
 * journal holds the pressed identity, the undo of it restores the file byte
 * for byte, and the undo pops the entry it wrote back and not a rewind that
 * landed while it was in flight. `conformance:redline` rule 8's seventh arm
 * drives the same shape with its ablation; this is the `npm test` half.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { pressRedline } from '../redline-press';
import type { PressedChange } from '../redline-press';
import { forgetRewindJournal, lastRewind, recordRewind, rewindJournalDepth } from '../redline-journal';
import { changesOf, planRewind } from '../rewind';
import type { RewindRefusal } from '../rewind';
import type { RewindContext, RewindOutcome } from '../redline-write';
import { composeRedlineDocument } from '../redline-document';

// Research 83 B.1, the real paragraph, eight changes.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

const GEN = 3;
const changes = changesOf(composeRedlineDocument(BASELINE, CURRENT).runs);
const wrapper = (n: number): PressedChange => {
  const c = changes[n];
  if (c === undefined) throw new Error(`no change ${String(n)}`);
  return { off: c.off, del: c.del, ins: c.ins, generation: GEN };
};
const tab = (dirty = false) => ({
  id: 't1',
  root: '/repo',
  path: '/repo/notes.txt',
  baseline: BASELINE,
  generation: GEN,
  dirty
});

/** A disk and a call site over the pure decision, with a hook inside the await. */
function fakeDisk(initial: string) {
  const disk = { text: initial, writes: 0, contexts: [] as RewindContext[] };
  const apply =
    (during: () => void) =>
    async (ctx: RewindContext): Promise<RewindOutcome> => {
      disk.contexts.push(ctx);
      // The focus moves while the press is awaited (the verifier's M1.h/M1.i).
      await Promise.resolve();
      during();
      const plan = planRewind({
        baseline: ctx.baseline,
        baselineGeneration: ctx.generation,
        drawnGeneration: ctx.drawnGeneration,
        fresh: disk.text,
        truncated: false,
        pressed: ctx.pressed,
        kind: ctx.kind
      });
      if (plan.outcome === 'refused') return { refused: plan.why };
      disk.text = plan.contents;
      disk.writes += 1;
      return { wrote: 'sha' };
    };
  return { disk, apply };
}

afterEach(() => {
  forgetRewindJournal('t1');
});

describe('the press records the identity it was pressed with', () => {
  it('E0 pressed, focus moved to E1 during the await: the journal holds E0 and undo restores the file', async () => {
    const { disk, apply } = fakeDisk(CURRENT);
    let focus = wrapper(0);
    const refusals: RewindRefusal[] = [];
    const deps = {
      focused: () => focus,
      apply: apply(() => {
        focus = wrapper(1);
      }),
      refuse: (why: RewindRefusal) => refusals.push(why)
    };
    const r = await pressRedline('rewind', tab(), deps);
    expect(r.outcome).toBe('wrote');
    expect(disk.text).toContain('Tortie keeps every session open');
    expect(refusals).toEqual([]);
    // The journal names E0, the change that was rewound, never E1.
    expect(lastRewind('t1')).toEqual(wrapper(0));
    // Undo, with the focus still on E1, restores CURRENT byte for byte.
    const u = await pressRedline('undo', tab(), deps);
    expect(u.outcome).toBe('wrote');
    expect(disk.text).toBe(CURRENT);
    expect(rewindJournalDepth('t1')).toBe(0);
    // The undo was made from E0's identity, not from what was under focus.
    expect(disk.contexts[1]?.pressed).toEqual({ off: wrapper(0).off, del: wrapper(0).del, ins: wrapper(0).ins });
  });

  it('E5 pressed, focus moved to the pure insertion E6: undo does not write the insertion twice', async () => {
    const { disk, apply } = fakeDisk(CURRENT);
    const e6 = wrapper(6);
    expect(e6.del).toBe('');
    expect(e6.ins).toBe('exactly ');
    let focus = wrapper(5);
    const deps = {
      focused: () => focus,
      apply: apply(() => {
        focus = e6;
      }),
      refuse: () => undefined
    };
    await pressRedline('rewind', tab(), deps);
    expect(lastRewind('t1')).toEqual(wrapper(5));
    await pressRedline('undo', tab(), deps);
    expect(disk.text).toBe(CURRENT);
    expect(disk.text).not.toContain('exactly exactly');
  });

  it('a refused press records nothing and a press with nothing under focus reads nothing', async () => {
    const { disk, apply } = fakeDisk(CURRENT.replace('throwaway viewer', 'disposable viewer'));
    const refusals: RewindRefusal[] = [];
    const deps = { focused: () => wrapper(4), apply: apply(() => undefined), refuse: (w: RewindRefusal) => refusals.push(w) };
    const r = await pressRedline('rewind', tab(), deps);
    expect(r).toEqual({ outcome: 'refused', why: 'phraseMoved' });
    expect(refusals).toEqual(['phraseMoved']);
    expect(rewindJournalDepth('t1')).toBe(0);
    const none = await pressRedline('rewind', tab(), { ...deps, focused: () => null });
    expect(none).toEqual({ outcome: 'nothing' });
    expect(disk.contexts.length).toBe(1);
    const dirty = await pressRedline('rewind', tab(true), deps);
    expect(dirty).toEqual({ outcome: 'refused', why: 'dirty' });
    expect(refusals).toEqual(['phraseMoved', 'dirty']);
    expect(disk.contexts.length).toBe(1);
  });

  it('an undo pops the entry it wrote back, not a rewind that landed while it was in flight', async () => {
    const { disk, apply } = fakeDisk(CURRENT);
    const quiet = { refuse: () => undefined };
    await pressRedline('rewind', tab(), { ...quiet, focused: () => wrapper(0), apply: apply(() => undefined) });
    const afterE0 = disk.text;
    // A rewind of E4 lands while the undo of E0 is awaited.
    const undo = pressRedline('undo', tab(), {
      ...quiet,
      focused: () => null,
      apply: apply(() => {
        recordRewind('t1', wrapper(4));
      })
    });
    await undo;
    // E0's entry is gone and E4's stays, so the journal still names what is rewound.
    expect(rewindJournalDepth('t1')).toBe(1);
    expect(lastRewind('t1')).toEqual(wrapper(4));
    expect(disk.text).toBe(CURRENT);
    expect(afterE0).not.toBe(CURRENT);
  });
});
