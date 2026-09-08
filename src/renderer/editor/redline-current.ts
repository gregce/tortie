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
 * **A CHANGE IS THE SPAN OF BASELINE IT COVERS**, being `off` and `del`, and
 * nothing else. Two clauses of the obvious answer are deliberately left out
 * and each one is a defect that was measured rather than reasoned about.
 *
 * THE GENERATION IS NOT COMPARED. A recompose caused by an agent's write does
 * not move the baseline (research 83 policy Z, ./baseline), so the same change
 * comes back with the same generation and comparing it would be trivially
 * true; but a COMMIT does move it, and a person looking at the same phrase
 * after a commit is still looking at the same phrase. What must never be stale
 * is the generation a PRESS carries, and that is read fresh off the drawn
 * wrapper at the press rather than out of this state, so a moved baseline is
 * refused by the guard in ./redline-write exactly as it was before.
 *
 * THE INSERTION IS NOT COMPARED EITHER, AND THAT IS PHASE 239'S FIX ROUND.
 * Phase 237 shipped typing into this document two commits before this one, and
 * every keystroke rewrites the inserted side. The verifier drew the controls
 * on a change, typed three characters into it and read the chip GONE and zero
 * changes marked, three runs of three, where the PARENT commit kept the
 * controls on that same change three of three — a regression this phase
 * introduced by choosing an identity the product's own typing moves:
 *
 * ```
 * sameChange({off: 78, del: 'quick brown foxes', ins: 'swift crimson hounds'},
 *            {off: 78, del: 'quick brown foxes', ins: 'swift crimszqxon hounds'})
 * ```
 *
 * read false, and the change was still drawn with the caret still in it.
 *
 * **The span is an identity and not a guess**, and the measurement is already
 * in this tree: ./rewind's own header records offsets strictly increasing
 * across one draw over 2,998 draws with 0 non-increasing pairs, so an offset
 * names at most one change in a picture, and `del` is the baseline text that
 * offset covers. A person typing into a phrase has not moved to another
 * phrase, and an agent rewriting the phrase has not moved the baseline under
 * it.
 *
 * **What still carries the whole triple is a PRESS**, which is the thing that
 * writes: ./redline-press reads the identity off the drawn wrapper once,
 * before any await, and `resolvePress` in ./rewind matches `off`, `del` AND
 * `ins`, so a rewind still acts on exactly the phrase that was drawn and
 * refuses a phrase that moved. This function decides where the CONTROLS are,
 * not what they do.
 */
export function sameChange(a: ChangeIdentity, b: ChangeIdentity): boolean {
  return a.off === b.off && a.del === b.del;
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

/**
 * The document element itself, which is what `.ed-redline-change` sits inside.
 * It is named here beside {@link CHANGE_SELECTOR} so the let-go rule below and
 * the view's own markup cannot drift apart.
 */
export const DOC_SELECTOR = '.ed-redline-doc';

/** The one thing {@link pressLetsGo} asks of a pressed element. */
export interface PressTarget {
  closest: (selector: string) => Element | null;
}

/**
 * DOES THIS PRESS LET GO OF THE CURRENT CHANGE?
 *
 * PHASE 239'S FIX ROUND, AND IT IS THE OTHER HALF OF THE PERSISTENCE THIS
 * PHASE IS FOR. Persistence means the controls survive a pointer leaving, a
 * recompose an agent caused and the keyboard going elsewhere. It does NOT mean
 * they cannot be put away, and as first built they could not: the verifier
 * clicked plain prose far from any change and read the chip still drawn on
 * change 0 with the mark still on it, where the PARENT commit read it gone,
 * and the only exit left was to leave the view. The chip is an out-of-flow
 * overlay at 0.00px of layout cost, which is the one placement research 83 D.3
 * accepted, and the price of out-of-flow is that it is drawn OVER the line
 * above or below the change — 171.60 x 30px of it, over the marked-up sentence
 * D.3 says the view exists to let a person read. A thing drawn over the prose
 * has to be dismissible.
 *
 * The rule is the narrowest one that can mean it: **a press on the document's
 * own prose, on no change, lets go.** A press on a change keeps it, because
 * that is the person arriving rather than leaving. A press on anything that is
 * not the document keeps it too — the chip itself, the note row's Undo, the
 * banner, the scrollbar — because Tortie's own chrome is not a place in the
 * text and pressing it is not the person saying they are done with a change.
 * That last clause is why the question is asked of BOTH selectors and not just
 * of the change: the chip lives outside `.ed-redline-doc` (Phase 236), so a
 * rule that only asked "not a change" would put the controls away every time
 * somebody reached for them.
 *
 * It is asked of a pointer press rather than of the caret because it must work
 * on a redline that has no caret at all: a commit tab is read only, so
 * ./redline-edits hands back nothing, and a rule written on the caret alone
 * would leave those tabs with no way out.
 */
export function pressLetsGo(target: PressTarget | null): boolean {
  if (target === null) return false;
  if (target.closest(CHANGE_SELECTOR) !== null) return false;
  return target.closest(DOC_SELECTOR) !== null;
}

/**
 * A caret move the PERSON made: the change it landed in, or null for a caret
 * that landed in the document and in no change at all.
 *
 * It is an object rather than a bare element so that every move is a new value
 * and the view's effect runs once per move rather than once per distinct
 * landing place.
 */
export interface CaretMove {
  change: HTMLElement | null;
}

/** Two current-side offsets, being ./redline-typing's `CurrentSelection`. */
export interface CaretOffsets {
  anchor: number;
  focus: number;
}

/**
 * WAS THIS `selectionchange` THE PERSON MOVING THE CARET, OR THE VIEW PUTTING
 * IT BACK?
 *
 * PHASE 239'S FIX ROUND, and the defect it closes was measured in the app.
 * The controls were held on `quick brown foxes… -> swift crimson hounds…` at
 * baseline offset 78; a plain `/bin/sh` prepended one line to the file; the
 * change was still drawn at index 2 with the same offset, the same deleted
 * text and the same inserted text — and the mark, the chip and therefore the
 * ⌥⌫ target had all moved to index 0, the change the shell had just made. The
 * press would have rewound `"" -> "A line the shell added at the very top."`
 * rather than the phrase the person was on.
 *
 * The mechanism is not the identity and not the recompose. It is that
 * ./redline-edits restores the caret after every recompose, by current-side
 * OFFSET (research 97 §2.3), and a write ABOVE the caret leaves that offset
 * pointing at different text; the `selectionchange` the restore causes is
 * indistinguishable from the person clicking there, so the view adopted it.
 *
 * So the restore is MARKED, and a `selectionchange` whose selection is exactly
 * what was just put back is not a move. Two clauses beside it, each one a real
 * shape rather than defensiveness:
 *
 *   - A selection that is NOT IN THIS DOCUMENT is silence, never a move out of
 *     a change. The chord focuses the change wrapper it steps to, which can
 *     take the selection out of the editing host altogether, and reading that
 *     as "the person left every change" would let go of the change they had
 *     just stepped to.
 *   - The mark is consumed whether it matched or not, so it can swallow at
 *     most the one event the restore caused. The stated limit is that a
 *     restore which moves nothing fires no event and leaves the mark standing,
 *     so a person whose very next act puts the caret at exactly those two
 *     offsets is not heard once — which is a caret landing where the caret
 *     already was, and looks like nothing on the face.
 */
export function caretMoveOf(args: {
  /** What the view last put back, or null when it has put nothing back. */
  restored: CaretOffsets | null;
  /** Where the selection is now, or null when it is not in this document. */
  now: CaretOffsets | null;
  /** The change the caret is in, from ./redline-caret `changeAtCaret`. */
  change: HTMLElement | null;
}): CaretMove | null {
  const { restored, now, change } = args;
  if (now === null) return null;
  if (restored !== null && restored.anchor === now.anchor && restored.focus === now.focus) {
    return null;
  }
  return { change };
}
