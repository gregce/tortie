/**
 * The two spellings of a gap, and the one translation between them (Phase 64).
 *
 * ## Why this file exists
 *
 * A gap has no id of its own in `docs/arch/`. It is a line of prose in a
 * part's `gaps` array, so it is named by the part it belongs to and its
 * position in that array. Phase 63 and Phase 64 each needed such a name and
 * each spelled it differently, for reasons that are both good:
 *
 *  - THE VIEW SPELLING, `gap:<componentId>:<index>`, is Phase 63's. It sits in
 *    the same one-string vocabulary as `component:<id>` and `edge:<id>`, which
 *    is what the Architecture view keys every selectable row on and what the
 *    prose panel parses back. One opaque string is what lets a selection be a
 *    list of strings rather than a list of tagged unions.
 *  - THE CHANNEL SPELLING, `component:<id>#gap:<index>`, is Phase 64's. It is
 *    the shape the checkers already stamp on a subject id, where a `#` suffix
 *    names a part of a part, so the composer reads a gap id with the same
 *    split it reads `component:<id>#anchor:<n>` and `component:<id>#boundary`
 *    with.
 *
 * Neither is wrong and neither is going away. What was wrong is that the
 * format was written out by hand in five places across two processes, so the
 * integrator moved all four functions here, which is the file both processes
 * can name. `src/shared/arch-copy.ts` is the sibling that did the same thing
 * for the words, and its header makes the same argument.
 *
 * ## Why not `src/shared/arch.ts`
 *
 * That file's own header says it is pure data and pure patterns and holds no
 * logic, and these are four functions. It does hold {@link ARCH_ID_PATTERN},
 * which is the one pattern a part's id must match, and the parsers below build
 * their regular expressions out of it so there is still exactly one statement
 * of what an id may contain.
 *
 * ## The bound on an index, and why there is one
 *
 * A gap index is at most four digits. It is a position in an array a person
 * typed by hand, `ARCH_LIMITS` already bounds that array far below ten
 * thousand, and an unbounded `\d+` in a regular expression that runs over a
 * string a repository supplied is a cost nobody needs to pay.
 */

import { ARCH_ID_PATTERN } from './arch';

/** The body of {@link ARCH_ID_PATTERN}, with its anchors taken off. */
const ID_BODY = ARCH_ID_PATTERN.replace(/^\^/, '').replace(/\$$/, '');

/** At most four digits, per the header. */
const INDEX_BODY = '\\d{1,4}';

const CHANNEL_GAP = new RegExp(`^component:(${ID_BODY})#gap:(${INDEX_BODY})$`);
const VIEW_GAP = new RegExp(`^gap:(${ID_BODY}):(${INDEX_BODY})$`);

/**
 * The channel spelling: what `arch:composePayload` takes in its `gapIds` list
 * and what `src/main/arch/payload.ts` composes with.
 */
export function archGapId(componentId: string, index: number): string {
  return `component:${componentId}#gap:${String(index)}`;
}

/** The two halves of a channel gap id, or null when the string is not one. */
export function parseArchGapId(
  id: string
): { componentId: string; index: number } | null {
  const match = CHANNEL_GAP.exec(id);
  if (match === null) return null;
  return { componentId: match[1] ?? '', index: Number(match[2]) };
}

/**
 * The view spelling: what the Architecture view puts on a gap row and what a
 * selection carries.
 */
export function archViewGapId(componentId: string, index: number): string {
  return `gap:${componentId}:${String(index)}`;
}

/** The two halves of a view gap id, or null when the string is not one. */
export function parseArchViewGapId(
  id: string
): { componentId: string; index: number } | null {
  const match = VIEW_GAP.exec(id);
  if (match === null) return null;
  return { componentId: match[1] ?? '', index: Number(match[2]) };
}

/**
 * One view gap id as the channel spells it, or null when it is not one.
 *
 * THIS IS THE ONLY TRANSLATION, and it is here rather than in the renderer so
 * that a later round which wants one spelling has one file to change instead
 * of five call sites to find. A string that is not a view gap id answers null
 * and is dropped by its caller rather than sent as something the composer
 * would have to guess at.
 */
export function archViewGapIdToChannel(id: string): string | null {
  const parsed = parseArchViewGapId(id);
  return parsed === null ? null : archGapId(parsed.componentId, parsed.index);
}
