/**
 * THE CURRENT CHANGE (Phase 239): the one the controls belong to, held as an
 * IDENTITY rather than as `document.activeElement`.
 *
 * The operator asked on 2026-09-08, with a photograph of Cursor beside it:
 * *"i also want the controls to work more like cursor ide.. today the they
 * sort of just hover, did / does and sort of show near the line they are for
 * the actual actions you can take."*
 *
 * Research 83 E.9 read Cursor on 2026-09-07 and measured what to take and what
 * to leave. **Take the PLACE and the PERSISTENCE. Leave the grain and the
 * ownership.** Cursor's controls are per LINE and owned by an agent TURN over
 * a workspace checkpoint, and three of its dated forum threads are people
 * losing them at a boundary. Tortie stays per PHRASE and stays owned by the
 * FILE, which is the axis it deliberately differs on. What changes is that the
 * controls stop being something a pointer summons.
 *
 * ## The defect this module exists to fix, measured rather than reasoned
 *
 * Research 99 section 2.3 stepped to a change with the chord and then had a
 * plain `/bin/sh` write to the file:
 *
 * | | before the write | after the write |
 * | --- | --- | --- |
 * | changes drawn | 9 | 10 |
 * | the chip | drawn at (971.09, 120.45) | **none** |
 * | `activeElement` | the change wrapper, offset 80 | **the document** |
 * | the change the person was on | offset 80, generation 2 | **still drawn, same identity, same offset, same generation** |
 *
 * **The change survived the recompose and the person's place in it did not.**
 * React replaces the wrapper element, focus goes with it, and the chip goes
 * with the focus — while the identity the change is addressed by was there to
 * be found the whole time. So the current change is state keyed on that
 * identity, re-found after every recompose, and nothing about it is a
 * rectangle: the layout number for the whole of it is **0.00px**, because it
 * draws nothing new.
 *
 * ## And the first ⌥↓ of a view was swallowed
 *
 * Research 99 section 2.2, reproduced in two independent runs: the first press
 * in a fresh view left `document.activeElement` on the editing HOST with a
 * caret in it and drew no chip, and only the second press reached change 0.
 * `moveFocus` computed its position from `activeElement`, which a
 * `contenteditable` host takes for itself. `stepIndex` here computes from the
 * HELD identity instead, so the state moves on the first press whatever the
 * focus does. The wrapper is still focused, for the ring and for the
 * scroll-into-view research 83 D.3 measured, but nothing depends on it landing.
 *
 * ## What is NOT here
 *
 * No control in the flow of the prose: research 83 D.2 measured that at
 * 45.12px of sideways displacement at every change, D.3 refused it, Phase
 * 236's verifier re-measured the same plant at 172.63px and +591.33px, and
 * research 99 section 1.1 drove it again at up to 249.05px and +130.22px in
 * this phase's own run. No line grain. No ownership by a turn. This module
 * names no bridge and writes nothing, so `npm run conformance:redline` rule 9
 * scans it with the other redline modules.
 */

import type { PressedChange } from './redline-press';

/**
 * What a change is addressed by: the baseline offset, the deleted text, the
 * inserted text and the generation the picture was drawn against. It is
 * exactly `PressedChange`, because the thing the controls point at and the
 * thing a press acts on must be the same thing or the face lies.
 */
export type ChangeIdentity = PressedChange;

/** Every change wrapper in a host, in document order. */
export const CHANGE_SELECTOR = '.ed-redline-change';

/**
 * The identity a drawn wrapper carries, read off its own attributes rather
 * than off any list in memory, so it is bound to exactly the picture the
 * person is looking at, generation included (research 83 B.8a).
 */
export function identityOf(el: HTMLElement): ChangeIdentity | null {
  const off = Number(el.dataset['changeOff']);
  const generation = Number(el.dataset['changeGen']);
  if (!Number.isInteger(off) || !Number.isInteger(generation)) return null;
  return {
    off,
    del: el.dataset['changeDel'] ?? '',
    ins: el.dataset['changeIns'] ?? '',
    generation
  };
}

/**
 * Are these the same change?
 *
 * THE GENERATION IS DELIBERATELY NOT COMPARED, and that is the whole point of
 * the rule. A recompose caused by an agent's write does not move the baseline
 * (research 83 policy Z, ./baseline), so the same change comes back with the
 * same generation and this is trivially true; but a COMMIT does move it, and a
 * person looking at the same phrase after a commit is still looking at the
 * same phrase. What must never be stale is the generation a PRESS carries, and
 * that is read fresh off the drawn wrapper at the press rather than out of
 * this state, so a moved baseline is refused by the guard in ./redline-write
 * exactly as it was before.
 */
export function sameChange(a: ChangeIdentity, b: ChangeIdentity): boolean {
  return a.off === b.off && a.del === b.del && a.ins === b.ins;
}

/** Every change wrapper drawn inside `host`, in document order. */
export function changeElements(host: Element): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(CHANGE_SELECTOR));
}

/**
 * Where an identity sits in a drawn list, or null when the picture no longer
 * holds it — which is the ordinary answer after a rewind, because a rewind
 * writes the baseline's bytes back and the change stops being a change.
 */
export function indexOfChange(
  items: readonly HTMLElement[],
  id: ChangeIdentity | null
): number | null {
  if (id === null) return null;
  for (const [at, el] of items.entries()) {
    const drawn = identityOf(el);
    if (drawn !== null && sameChange(drawn, id)) return at;
  }
  return null;
}

/**
 * The next index a step lands on, pure and without a DOM.
 *
 * From nowhere, next is the first change and previous the last; at either end
 * the position stays where it is, which is what Phase 227 shipped and what the
 * app run reads. Null only when the document holds no change at all.
 *
 * IT TAKES THE HELD POSITION AND NEVER `document.activeElement`, which is the
 * fix for the swallowed first press (research 99 section 2.2).
 */
export function stepIndex(
  count: number,
  at: number | null,
  delta: 1 | -1
): number | null {
  if (count <= 0) return null;
  if (at === null) return delta === 1 ? 0 : count - 1;
  return Math.min(count - 1, Math.max(0, at + delta));
}

/** The wrapper a step lands on, or null when there is nothing to step to. */
export function stepChange(
  host: Element,
  id: ChangeIdentity | null,
  delta: 1 | -1
): HTMLElement | null {
  const items = changeElements(host);
  const next = stepIndex(items.length, indexOfChange(items, id), delta);
  return next === null ? null : (items[next] ?? null);
}

/**
 * The attribute the current change wears, so the mark and the anchor are the
 * SAME element and cannot disagree. It is set by the view's own render from
 * `sameChange`, so it comes back on its own after a recompose; nothing mutates
 * the DOM to place it.
 *
 * Research 99 section 5 priced six decorations on both rulers: an outline, a
 * background tint, an underline rule and a `box-shadow` rail are each free at
 * 0.00px on the change rects AND on all 34 line edges, and the one form a
 * person reaches for first, `border-left`, costs 2.00px of real reflow that
 * only the line-edge reading names. The stylesheet draws the free one.
 */
export const CURRENT_ATTRIBUTE = 'data-current';

/** The drawn wrapper wearing the mark, or null when the picture lost it. */
export function currentElement(host: Element): HTMLElement | null {
  return host.querySelector<HTMLElement>(`${CHANGE_SELECTOR}[${CURRENT_ATTRIBUTE}]`);
}
