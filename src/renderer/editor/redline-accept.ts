/**
 * The accept press (Phase 238): what happens between a control and the one
 * place the baseline moves.
 *
 * It is ./redline-press's sibling and it is deliberately the same shape: pure
 * of React and of the DOM, taking the change under focus as a FUNCTION so the
 * view can hand it the live `activeElement`, the advance as a FUNCTION so this
 * module names neither the store nor a bridge, and the refusal as a function
 * so the sentence (./redline-sentences) stays the view's.
 *
 * ## Why this one is SYNCHRONOUS, and why that is the interesting half
 *
 * A rewind is two IPC round trips: a re-read and a guarded write. Every hazard
 * ./redline-press exists to own — the identity read once, the journal moved
 * with the object the write was made from — comes from the awaits between
 * them. An accept has none. It writes no file (research 83 B.5: the file's md5
 * is unchanged across a per-phrase accept), so there is nothing to read and
 * nothing to write, and the whole gesture is a string computation and one
 * patch of the tab. There is no window for the focus to move in, no journal to
 * record and no order to get wrong.
 *
 * ## What it DOES own, and it is the reason this phase is Tier 3
 *
 * THE ACCEPT IS THE FIRST THING IN THIS PRODUCT THAT MOVES THE BASELINE OFTEN.
 * Every drawn rewind identity is an offset INTO the baseline, so a baseline
 * that moved under a drawn picture moved that picture's coordinate system;
 * research 83 B.8a measured what happens without a guard, being that the
 * pressed identity resolves to exactly one edit that is the WRONG one and the
 * write answers success with nothing said. Phase 227 shipped the guard and
 * nothing until now made it fire from a real gesture.
 *
 * So this module asks the SAME guard for its own presses, through
 * ./rewind's `planAccept`, and it asks it before anything is composed: an
 * accept drawn against generation 4 that arrives after another accept took the
 * baseline to generation 5 refuses and the view redraws. It never
 * special-cases, weakens or reorders the guard ./redline-write asks for a
 * rewind; the two are the same integer compared the same way.
 *
 * It names no bridge and writes no file, so it is scanned by
 * `npm run conformance:redline` rule 9 with the other redline modules.
 */

import { planAccept } from './rewind';
import type { RewindRefusal } from './rewind';
import type { PressedChange } from './redline-press';

/** The live tab's fields an accept needs, read fresh at the press. */
export interface AcceptTab {
  /** The tab id, which the advance patches. */
  id: string;
  /** The shadow baseline the view draws against. */
  baseline: string;
  /** The baseline generation now. */
  generation: number;
  /** The text in front of the person: the live buffer, never savedContents. */
  current: string;
  /** Whether the tab's read was cut by the read cap. */
  truncated: boolean;
}

export interface AcceptDeps {
  /** The change under focus NOW. Asked once, and only for a per-change accept. */
  focused: () => PressedChange | null;
  /** Move this tab's baseline to these bytes at this moment. */
  advance: (contents: string, at: number) => void;
  /** Say the refusal. The view turns the word into a sentence. */
  refuse: (why: RewindRefusal) => void;
  /** The clock, injected so a gate can pin the sentence rather than read one. */
  now: () => number;
}

export type AcceptResult =
  /** Nothing was under focus: no compose, no advance, no word. */
  | { outcome: 'nothing' }
  | { outcome: 'refused'; why: RewindRefusal }
  /** The baseline moved; `baseline` is the bytes it moved to. */
  | { outcome: 'accepted'; baseline: string };

/**
 * One accept, of the change under focus (`kind: 'one'`) or of everything
 * (`kind: 'all'`).
 *
 * ACCEPT-ALL NAMES NO CHANGE, which is why it does not ask `focused()` at
 * all: it is a document verb, so it means "the baseline is the bytes I am
 * looking at" whether or not the keyboard happens to be on a change, and a
 * version that required focus would be a control that silently did nothing
 * from the resting face. It still asks the generation guard, because the
 * bytes it takes are the bytes of a picture drawn at a generation.
 *
 * A per-change accept with nothing under focus answers `nothing`, exactly as a
 * rewind does, so the chord from an empty document is a no-op rather than a
 * sentence about a change that was never named.
 */
export function pressAccept(
  kind: 'one' | 'all',
  tab: AcceptTab,
  deps: AcceptDeps
): AcceptResult {
  const pressed = kind === 'all' ? null : deps.focused();
  if (kind === 'one' && pressed === null) return { outcome: 'nothing' };
  const plan = planAccept({
    baseline: tab.baseline,
    baselineGeneration: tab.generation,
    // An accept-all is bound to the picture in front of the person, which is
    // this tab's own generation by definition; a per-change accept carries
    // the generation off the wrapper it was drawn on.
    drawnGeneration: pressed === null ? tab.generation : pressed.generation,
    current: tab.current,
    truncated: tab.truncated,
    pressed: pressed === null ? null : { off: pressed.off, del: pressed.del, ins: pressed.ins }
  });
  if (plan.outcome === 'refused') {
    deps.refuse(plan.why);
    return { outcome: 'refused', why: plan.why };
  }
  deps.advance(plan.baseline, deps.now());
  return { outcome: 'accepted', baseline: plan.baseline };
}
