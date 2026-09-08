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
