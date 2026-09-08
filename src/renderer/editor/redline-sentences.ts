/**
 * The rewind's refusal sentences (Phase 227), a sibling of ./redline-copy.
 *
 * A rewind or an undo answers a word (./rewind RewindRefusal); this turns the
 * word into one plain sentence for a person, naming the file and saying what
 * to do rather than what went wrong in machine terms. Just enough words: one
 * sentence each, no paragraph, no jargon. It names no bridge and writes
 * nothing, so it is scanned by `npm run conformance:redline` rule 9 with the
 * other redline modules.
 *
 * The map is a total Record over the union, so a refusal word added to
 * ./rewind without a sentence here does not compile.
 */

import { keyDisplay } from '@shared/keymap';
import type { RewindRefusal } from './rewind';

/** The sentence for each refusal word, `{name}` filled with the file's name. */
const SENTENCES: Record<RewindRefusal, string> = {
  // The view's own, before the channel (research 83 E.6, B.8a, E.7a, E.7b).
  dirty: 'Save or undo your edits to {name} first, then rewind.',
  baselineMoved: 'The marking moved while you were reading {name}. Look again, then rewind.',
  fileTooLarge: '{name} is too large for Tortie to rewind.',
  decodeLoss: '{name} is not UTF-8 text, and rewriting it whole would damage it.',
  // The identity resolution (research 83 E.7's last rows).
  phraseMoved: 'That change is no longer in {name}.',
  alreadyBack: 'That change is already back to what it was.',
  ambiguous: 'That change appears more than once in {name}, so it is not clear which to rewind.',
  // The channel's own answers (research 83 E.5), surfaced by the view.
  stale: '{name} changed as you pressed, so nothing was written. Look again, then rewind.',
  raced: 'Something wrote to {name} as you pressed, so nothing was written. Look again, then rewind.',
  readOnly: '{name} is read-only, so it cannot be rewound.',
  outsideRoot: '{name} is not in an open project, so it cannot be rewound.',
  io: '{name} could not be rewound.'
};

/** One plain sentence for a refusal word, with the file's name filled in. */
export function redlineRefusalSentence(why: RewindRefusal, name: string): string {
  return SENTENCES[why].replace('{name}', name);
}

/**
 * THE TWO UNDOS, KEPT APART AND SAID SO (Phase 237 item 4).
 *
 * ⌘Z is monaco's undo of the buffer, being the person's own typing. ⌥⇧⌫ is
 * the journal's undo of a REWIND, which is a write of the file. They do not
 * merge in this phase, and while both are available the face has to say which
 * is which or a person reaches for one and gets the other.
 *
 * The line only ever appears while there IS a rewind to undo, which is what
 * Phase 227 shipped and what `p227-redline-journal.test.tsx` pins; the second
 * form is the one this phase adds, for the moment the person also has typing
 * of their own. It is truthful about the order as well as the keys: a rewind
 * written while the tab is dirty would be undone by the next save, so
 * ./redline-press refuses one with the `dirty` sentence above, and this line
 * says the same thing in the same breath rather than leaving it to be
 * discovered.
 *
 * BOTH chords come from `keyDisplay`, because src/shared/keymap.ts is the only
 * place a chord is spelled in this tree and its own test enforces that. ⌘Z
 * gained a row of its own for exactly this sentence; it carries no menu action,
 * because the Edit menu's `{ role: 'undo' }` already draws that row.
 */
export function redlineUndoNote(
  canUndoRewind: boolean,
  canUndoTyping: boolean
): string | null {
  if (!canUndoRewind) return null;
  const chord = keyDisplay('redline.undo');
  return canUndoTyping
    ? `${keyDisplay('redline.undoTyping')} undoes your typing. ${chord} undoes the last rewind, once your edits are saved.`
    : `Undo the last rewind with ${chord}. It lasts for this session.`;
}

/**
 * PHASE 238. The accept's own refusals, which are a NARROWER union than a
 * rewind's and need their own words.
 *
 * An accept reaches no file, so nine of the twelve words above cannot arise
 * from one: there is no channel to answer `stale`, `raced`, `readOnly`,
 * `outsideRoot` or `io`, nothing is decoded so there is no `decodeLoss`,
 * nothing is written so `dirty` is not a hazard (research 83 E.6 refuses a
 * rewind on a dirty tab because the next save would undo it, and an accept has
 * no write for a save to undo), and a change that is already back is simply a
 * change that is no longer drawn. What is left is four, and they are typed as
 * a union of their own so a word this gesture cannot produce cannot be handed
 * to this map.
 *
 * The sentences say "accept" and not "rewind", which is the whole reason they
 * are here rather than shared: the two verbs go in opposite directions and a
 * person told to "look again, then rewind" after an accept was told to do the
 * destructive one.
 */
export type AcceptRefusal = Extract<
  RewindRefusal,
  'baselineMoved' | 'fileTooLarge' | 'phraseMoved' | 'ambiguous'
>;

const ACCEPT_SENTENCES: Record<AcceptRefusal, string> = {
  baselineMoved: 'The marking moved while you were reading {name}. Look again, then accept.',
  fileTooLarge: '{name} is too large for Tortie to mark all of, so it cannot be accepted.',
  phraseMoved: 'That change is no longer in {name}.',
  ambiguous: 'That change appears more than once in {name}, so it is not clear which to accept.'
};

/** True when this refusal word is one an accept can produce. */
export function isAcceptRefusal(why: RewindRefusal): why is AcceptRefusal {
  return why in ACCEPT_SENTENCES;
}

/**
 * One plain sentence for an accept's refusal, with the file's name filled in.
 * A word an accept cannot produce falls back to the rewind map rather than
 * answering nothing, because a refusal is never silent.
 */
export function redlineAcceptRefusalSentence(
  why: RewindRefusal,
  name: string
): string {
  return isAcceptRefusal(why)
    ? ACCEPT_SENTENCES[why].replace('{name}', name)
    : redlineRefusalSentence(why, name);
}
