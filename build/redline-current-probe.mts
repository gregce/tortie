/**
 * redline-current-probe.mts. The runtime half of Phase 239's arms on
 * `npm run conformance:redline` (rule 18).
 *
 * It runs the SHIPPING current-change module,
 * src/renderer/editor/redline-current.ts, under node over fixtures written
 * here, and prints ONE JSON line last. It launches no Electron, opens no
 * window, spawns nothing, makes no request and reads nothing under the
 * person's home.
 *
 * The module directory is `CURRENT_DIR` (default `src/renderer/editor`) so the
 * gate can point the same probe at a COPY with one clause ablated. The knob is
 * not `GMUX_` prefixed, because the contract inventory sweeps that prefix.
 *
 * THE COPY MAY LIVE ANYWHERE, unlike Phase 237's chain: this module's only
 * import is `import type`, which is erased, so it resolves nothing at runtime
 * and a copy in a scratch directory under the system temporary directory runs
 * exactly as the shipping one does. The gate's ablation directories are
 * therefore NOT inside `src/`.
 *
 * WHAT IT IS FOR. Research 99 sections 2.2 and 2.3 drove both defects in a
 * real Electron with real CDP key events. What decays after that is the
 * CLAUSES, so each arm below is one of those readings re-taken over the
 * shipping module, and the gate ablates the clause behind it.
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env['CURRENT_DIR'] ?? 'src/renderer/editor';
const current = (await import(
  pathToFileURL(resolve(DIR, 'redline-current.ts')).href
)) as typeof import('../src/renderer/editor/redline-current');

const {
  caretMoveOf,
  identityOf,
  indexOfChange,
  pressLetsGo,
  sameChange,
  stepChange,
  stepIndex
} = current;

type Identity = import('../src/renderer/editor/redline-current').ChangeIdentity;

/** A drawn wrapper, as far as the shipping `identityOf` is concerned. */
const wrapper = (
  off: number,
  del: string,
  ins: string,
  generation = 2
): HTMLElement =>
  ({
    dataset: {
      changeOff: String(off),
      changeDel: del,
      changeIns: ins,
      changeGen: String(generation)
    }
  }) as unknown as HTMLElement;

/** A host holding exactly these wrappers, for `stepChange`. */
const host = (items: HTMLElement[]): Element =>
  ({ querySelectorAll: () => items }) as unknown as Element;

/** Research 99 section 2.3's own nine changes, in the order they are drawn. */
const NINE = [
  wrapper(10, 'keeps', 'holds'),
  wrapper(80, 'quick brown foxes', 'swift crimson hounds'),
  wrapper(190, 'calm', 'serene'),
  wrapper(260, 'Wholly replaced paragraph', 'A different paragraph entirely'),
  wrapper(330, 'Eager purple herons', 'Weary amber cranes'),
  wrapper(410, 'noisy yellow beetles', 'quiet green mantises'),
  wrapper(480, 'patient silver otters', 'restless copper voles'),
  wrapper(550, 'guards', 'shields'),
  wrapper(620, '', 'A paragraph the agent added.\n\n')
];

/** The ten the recompose leaves behind: one change inserted, every wrapper new. */
const TEN = [
  ...NINE.slice(0, 3),
  wrapper(230, 'the shell wrote this', 'and this'),
  ...NINE.slice(3)
].map((el) => {
  const id = identityOf(el) as Identity;
  return wrapper(id.off, id.del, id.ins, id.generation);
});

const held = identityOf(NINE[6] as HTMLElement);

/** What the view last put the caret back at, in current-side offsets. */
const PUT = { anchor: 128, focus: 128 };

/** A move, as the name of the change it landed in, so the JSON is readable. */
const named = (move: { change: HTMLElement | null } | null): string =>
  move === null
    ? 'no move'
    : move.change === null
      ? 'moved, on no change'
      : `moved, on ${String(move.change.dataset['changeDel'])}`;

/**
 * A pressed element, as far as the shipping `pressLetsGo` is concerned: it
 * asks `closest` twice and nothing else. `[]` is the chip, which lives OUTSIDE
 * `.ed-redline-doc` and therefore answers neither.
 */
const target = (inside: string[]): { closest: (s: string) => Element | null } => ({
  closest: (s: string) => (inside.includes(s) ? ({} as Element) : null)
});

/**
 * THE SWALLOWED FIRST PRESS, as a number rather than a sentence.
 *
 * Research 99 section 2.2, reproduced in two runs: the first ⌥↓ of a fresh
 * view left `document.activeElement` on the editing host and drew no chip, and
 * only the SECOND press reached change 0. Here the walk is driven from the
 * held place, so three presses read 0, 1, 2. A rule that reads the position
 * from a focus that never arrived answers 0, 0, 0 — the chord repeating the
 * first change for ever, which is the ablation.
 */
function walk(presses: number): number[] {
  const items = NINE;
  let at: Identity | null = null;
  const seen: number[] = [];
  for (let i = 0; i < presses; i++) {
    const el = stepChange(host(items), at, 1);
    if (el === null) {
      seen.push(-1);
      continue;
    }
    at = identityOf(el);
    seen.push(indexOfChange(items, at) ?? -1);
  }
  return seen;
}

console.log(
  JSON.stringify({
    // 1. From nowhere, next is the first change and previous the last.
    fromNowhere: [stepIndex(9, null, 1), stepIndex(9, null, -1)],
    // 2. At either end the position stays where it is, and an empty document
    //    steps nowhere at all.
    ends: [stepIndex(9, 0, -1), stepIndex(9, 8, 1), stepIndex(0, null, 1)],
    // 3. Six positions, being the whole of the step's behaviour.
    six: [
      stepIndex(9, 0, 1),
      stepIndex(9, 0, -1),
      stepIndex(9, 4, 1),
      stepIndex(9, 4, -1),
      stepIndex(9, 8, 1),
      stepIndex(9, 8, -1)
    ],
    // 4. THE RECOMPOSE. 9 changes become 10, every wrapper is a new object,
    //    and the place is still found — one row further down.
    recompose: {
      before: indexOfChange(NINE, held),
      sameObject: TEN.includes(NINE[6] as HTMLElement),
      after: indexOfChange(TEN, held),
      // A change the picture no longer holds, which is what a rewind leaves.
      rewound: indexOfChange(NINE.slice(1), identityOf(NINE[0] as HTMLElement))
    },
    // 5. A CHANGE IS THE SPAN OF BASELINE IT COVERS. The generation is not
    //    part of it, so a commit keeps your place; the INSERTION is not part
    //    of it either, which is the fix round's finding 1, being that Phase
    //    237's typing rewrites `ins` on every keystroke and took the controls
    //    off the change the person was typing into, 3 runs of 3.
    identity: {
      acrossGenerations: sameChange(
        identityOf(wrapper(10, 'keeps', 'holds', 2)) as Identity,
        identityOf(wrapper(10, 'keeps', 'holds', 3)) as Identity
      ),
      // THE VERIFIER'S OWN KEYSTROKES, at the offset and on the phrase it
      // typed into: three characters landing mid-insertion are the same
      // change and the controls stay on it.
      typedInto: sameChange(
        identityOf(wrapper(78, 'quick brown foxes', 'swift crimson hounds')) as Identity,
        identityOf(wrapper(78, 'quick brown foxes', 'swift crimszqxon hounds')) as Identity
      ),
      // But a different span of the BASELINE at the same offset is a
      // different change, and so is the same phrase at another offset.
      differentBaselineSpan: sameChange(
        identityOf(wrapper(10, 'keeps', 'holds')) as Identity,
        identityOf(wrapper(10, 'kept', 'holds')) as Identity
      ),
      differentOffset: sameChange(
        identityOf(wrapper(10, 'keeps', 'holds')) as Identity,
        identityOf(wrapper(11, 'keeps', 'holds')) as Identity
      ),
      // A wrapper carrying no identity is never anybody's current change.
      noIdentity: identityOf({ dataset: {} } as unknown as HTMLElement)
    },
    // 6. The walk, from a fresh view: three presses, three changes.
    walk: walk(3),
    // 7. THE RESTORED CARET IS NOT A MOVE (the fix round's finding 2). The
    //    view puts the caret back at two current-side offsets after every
    //    recompose; a write ABOVE it leaves those offsets on different text,
    //    and the `selectionchange` that follows was being read as the person
    //    walking to the change the shell had just made.
    caret: {
      // The person clicked somewhere the restore did not put them.
      person: named(caretMoveOf({ restored: PUT, now: { anchor: 400, focus: 400 }, change: NINE[2] as HTMLElement })),
      // The restore itself, byte for byte what was put back: silence.
      restore: named(caretMoveOf({ restored: PUT, now: PUT, change: NINE[0] as HTMLElement })),
      // A caret that is not in this document at all: silence, never a move
      // OUT of a change, because the chord's own focus can take it out.
      elsewhere: named(caretMoveOf({ restored: PUT, now: null, change: null })),
      // The person put the caret in plain prose. That IS a move, and it is
      // what lets the view let go.
      onProse: named(caretMoveOf({ restored: null, now: { anchor: 12, focus: 12 }, change: null })),
      // Nothing has been restored yet, so nothing can be mistaken for one.
      firstEver: named(caretMoveOf({ restored: null, now: { anchor: 1, focus: 1 }, change: NINE[1] as HTMLElement }))
    },
    // 8. WHICH PRESS LETS GO (the fix round's finding 3). A press on the
    //    document's own prose, on no change, puts the controls away; a press
    //    on a change or on any of Tortie's own chrome does not.
    letGo: {
      prose: pressLetsGo(target(['.ed-redline-doc'])),
      change: pressLetsGo(target(['.ed-redline-doc', '.ed-redline-change'])),
      chip: pressLetsGo(target([])),
      nothing: pressLetsGo(null)
    }
  })
);
