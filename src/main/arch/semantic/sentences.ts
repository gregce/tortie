/**
 * One sentence per refusal (Phase 259; SPEC §2.4).
 *
 * The redline's precedent: a refusal token says WHICH rule and a sentence says
 * what a person can do about it. Every sentence here is derived from the union
 * with `Record`, so a new refusal word does not compile without one.
 *
 * NOTHING HERE SAYS A SENTENCE WAS WRONG. A refusal is about the SHAPE of an
 * answer — a citation that does not resolve, a word the model may not write, a
 * number the facts do not carry — and never about whether what the model said
 * is true. Research 118 §6.4 measured the checker catching two of seven
 * deliberate lies, so a sentence claiming more than shape here would be the
 * face over-reading its own instrument.
 */

import type { ArchSemanticRefusal } from './types';

/** What a person reads when a whole answer was thrown away. */
export const ARCH_SEMANTIC_REFUSAL_REASONS: Readonly<
  Record<ArchSemanticRefusal, string>
> = {
  'too-large': 'The answer is larger than a reading of one part could honestly be.',
  'bad-shape': 'The answer is not the one JSON object that was asked for.',
  'wrong-part': 'The answer is about a different part from the one that was asked about.',
  'claim-fields':
    'The answer does not carry exactly one claim for each of the seven fields.',
  'claim-invalid': 'A claim is not a bounded plain sentence with its citations.',
  'gate-invalid': 'A gate is not a bounded question with one of the four answers.',
  'journey-invalid': 'A journey step names a part this repository does not hold.',
  'level-written':
    'The answer says how far something is proven, and Tortie computes that itself.',
  'invented-number':
    'The answer carries a number that is not in the facts it was given.',
  'no-row-stood':
    'Every sentence in the answer cited a line that is not there, so none of it was kept.'
};

/**
 * Why one citation could not stand. `unresolved` is R2's own reason, being a
 * line the repository does not have; `not-handed` is R4's, being a file the
 * FACTS block never named, which is a location the answer cannot have copied
 * and must therefore have composed.
 */
export type DroppedCiteWhy = 'unresolved' | 'not-handed';

/** The sentence for one dropped ROW, naming the citation that broke it. */
export function droppedRowSentence(
  where: string,
  at: string,
  why: DroppedCiteWhy = 'unresolved'
): string {
  const because =
    why === 'not-handed'
      ? 'which is not a file the facts named'
      : 'which is not a line of this repository';
  return `${where} cites ${at}, ${because}, so that sentence was not kept.`;
}
