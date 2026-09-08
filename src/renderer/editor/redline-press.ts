/**
 * The press (Phase 227): what happens between a chord and the one call site.
 *
 * A rewind or an undo is one function, pure of React and of the DOM. It takes
 * the change under focus as a FUNCTION so the view can hand it the live
 * `activeElement`, the one call site (./redline-write) as a function so this
 * module names no bridge, and the refusal as a function so the sentence
 * (./redline-sentences) stays the view's. What it owns is the ORDER, and one
 * rule of that order is why the module exists:
 *
 * THE JOURNAL RECORDS THE IDENTITY THAT WAS PRESSED, NEVER THE ONE UNDER
 * FOCUS WHEN THE WRITE RETURNS. As first shipped the view read
 * `focusedChange(host)` a second time after `await applyRewind(...)` to build
 * the journal entry. A press is two IPC round trips, and the Phase 227
 * verifier moved the focus inside that window with ⌥↓ and drove it through
 * the real chord: E0 was rewound on disk and the journal held E1, so undo
 * answered "no longer in the file" and E0's rewind was recoverable from
 * nothing Tortie keeps, which is the exact A8a loss the journal exists to
 * guard; and with the focus moved onto a pure insertion, undo WROTE that
 * insertion a second time, bytes never in the file. So `pressed` is read once,
 * before any await, and the entry the journal takes after the write is that
 * same object. `npm run conformance:redline` rule 8's seventh arm runs this
 * module under node with a fake call site that moves the focus while it is
 * awaited, and its ablation is the first shape put back.
 *
 * Undo pops the ENTRY it wrote back, by reference, and never "the top",
 * because a rewind pressed while an undo is in flight would otherwise have
 * its own entry popped by the undo that did not write it.
 *
 * It names no bridge and writes nothing, so it is scanned by rule 9 with the
 * other redline modules.
 */

import { lastRewind, popRewind, recordRewind } from './redline-journal';
import type { RewindJournalEntry } from './redline-journal';
import type { RewindRefusal } from './rewind';
import type { RewindContext, RewindOutcome } from './redline-write';

/**
 * What a press carries, read off the focused wrapper's own attributes rather
 * than off any list in memory, so a press is bound to exactly the picture
 * the person is looking at, generation included (research 83 B.8a).
 */
export interface PressedChange {
  off: number;
  del: string;
  ins: string;
  generation: number;
}

/** The live tab's fields the press needs, read fresh at the press. */
export interface PressTab {
  /** The tab id, which keys the journal. */
  id: string;
  /** The open project root, absolute. */
  root: string;
  /** The file, absolute. */
  path: string;
  /** The shadow baseline the view draws against. */
  baseline: string;
  /** The baseline generation now. */
  generation: number;
  /** Unsaved edits in the buffer (research 83 E.6). */
  dirty: boolean;
}

export interface PressDeps {
  /** The change under focus NOW. Called once, before any await. */
  focused: () => PressedChange | null;
  /** The one call site, injected so this module names no bridge. */
  apply: (ctx: RewindContext) => Promise<RewindOutcome>;
  /** Say the refusal. The view turns the word into a sentence. */
  refuse: (why: RewindRefusal) => void;
}

export type PressResult =
  /** Nothing was under focus, or nothing to undo: no read, no write, no word. */
  | { outcome: 'nothing' }
  | { outcome: 'refused'; why: RewindRefusal }
  /** The write landed; `entry` is the identity it was made from. */
  | { outcome: 'wrote'; sha256: string; entry: RewindJournalEntry };

/**
 * One rewind or undo, in press order: the dirty refusal, the identity read
 * ONCE, the one call site awaited, then the journal moved with that same
 * identity. The generation guard and the re-read are the call site's own.
 */
export async function pressRedline(
  kind: 'rewind' | 'undo',
  tab: PressTab,
  deps: PressDeps
): Promise<PressResult> {
  // E.6. A rewind written while the tab is dirty is undone by the next save,
  // so the press is refused with a sentence instead.
  if (tab.dirty) {
    deps.refuse('dirty');
    return { outcome: 'refused', why: 'dirty' };
  }
  // The identity, read exactly once and before any await: a rewind takes the
  // change under focus, an undo takes the last rewind of this tab.
  const pressed: RewindJournalEntry | null =
    kind === 'undo' ? (lastRewind(tab.id) ?? null) : deps.focused();
  if (pressed === null) return { outcome: 'nothing' };
  const outcome = await deps.apply({
    root: tab.root,
    path: tab.path,
    baseline: tab.baseline,
    generation: tab.generation,
    drawnGeneration: pressed.generation,
    pressed: { off: pressed.off, del: pressed.del, ins: pressed.ins },
    kind
  });
  if ('refused' in outcome) {
    deps.refuse(outcome.refused);
    return { outcome: 'refused', why: outcome.refused };
  }
  // The journal takes the identity the write was made from. The focus may
  // have moved while the write was awaited; that change was not rewound.
  if (kind === 'rewind') recordRewind(tab.id, pressed);
  else popRewind(tab.id, pressed);
  return { outcome: 'wrote', sha256: outcome.wrote, entry: pressed };
}
