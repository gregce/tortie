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

const { identityOf, indexOfChange, sameChange, stepChange, stepIndex } = current;

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
    // 5. The generation is NOT part of the identity, so a commit keeps your
    //    place; a different phrase at the same offset is a different change.
    identity: {
      acrossGenerations: sameChange(
        identityOf(wrapper(10, 'keeps', 'holds', 2)) as Identity,
        identityOf(wrapper(10, 'keeps', 'holds', 3)) as Identity
      ),
      differentInsertion: sameChange(
        identityOf(wrapper(10, 'keeps', 'holds')) as Identity,
        identityOf(wrapper(10, 'keeps', 'kept')) as Identity
      ),
      differentOffset: sameChange(
        identityOf(wrapper(10, 'keeps', 'holds')) as Identity,
        identityOf(wrapper(11, 'keeps', 'holds')) as Identity
      ),
      // A wrapper carrying no identity is never anybody's current change.
      noIdentity: identityOf({ dataset: {} } as unknown as HTMLElement)
    },
    // 6. The walk, from a fresh view: three presses, three changes.
    walk: walk(3)
  })
);
