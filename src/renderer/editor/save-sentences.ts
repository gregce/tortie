/**
 * What a save says when it does not happen, and what it asks when the file
 * moved underneath it (Phase 240, issue 16).
 *
 * A sibling of ./redline-sentences.ts and written to the same rule: the write
 * channel answers a WORD (`FsGuardedWriteRefusal` in @shared/fs-ops) and this
 * turns the word into one plain sentence for a person, naming the file and
 * saying what to do rather than what went wrong in machine terms. Just enough
 * words: one or two short sentences each, no paragraph, no jargon.
 *
 * IT MATCHES THE REMOTE SAVE'S VOCABULARY ON PURPOSE (charter item 5).
 * `saveOnMachine` has carried a precondition through `machines:putFile` since
 * Phase 101 and says "Tortie did not save this file, because it changed on
 * {machine} after Tortie read it. Nothing was written." — the shape is
 * `../machines/editor.ts` and it is deliberately reused here so a person meets
 * one idea rather than two. Every refusal ends with what did or did not happen
 * to the file, and none of them ends with a stack.
 *
 * THE MAP IS TOTAL over the words a local save can surface, so a word added to
 * the channel without a sentence here does not compile. `link` is excluded and
 * that is a decision rather than an omission: see {@link SaveRefusalWord}.
 *
 * It names no bridge, reads no file and writes nothing.
 */

import type { FsGuardedWriteRefusal } from '@shared/fs-ops';

/**
 * The refusal words a LOCAL save can put in front of a person.
 *
 * `link` is excluded, and the reason is the one thing this phase had to decide
 * that the charter left open. A file inside a project that is a symbolic link
 * saves perfectly well today: `fs:writeFile` follows the link and replaces
 * what it points at, which is what a person who made that link expects, and
 * nothing is lost by it. The guarded channel refuses it because it will not
 * turn a link into a regular file, which is right for a REWIND — nobody typed
 * those bytes — and would be a save a person has today taken away from them.
 * So ./tab-io saves a link through the old door instead, unguarded, exactly as
 * it does now, and the stated limit is that a symlinked file gets no staleness
 * check. It is the ONE fallback, it is named at its call site, and there is no
 * sentence for it because nothing went wrong.
 */
export type SaveRefusalWord = Exclude<FsGuardedWriteRefusal, 'link'>;

/** The sentence for each refusal word, `{name}` filled with the file's name. */
const SENTENCES: Record<SaveRefusalWord, string> = {
  outside:
    'Tortie did not save {name}, because it is not inside an open project. Nothing was written.',
  missing:
    'Tortie did not save {name}, because it is no longer on disk. Nothing was written.',
  readOnly:
    'Tortie did not save {name}, because it is read-only. Nothing was written.',
  tooLarge:
    'Tortie did not save {name}, because it is larger than Tortie can write. Nothing was written.',
  notUtf8:
    'Tortie did not save {name}, because it is not UTF-8 text and writing it whole would damage it. Nothing was written.',
  raced:
    'Something wrote to {name} as you saved, so nothing was written. Press Save again.',
  input:
    'Tortie could not work out where to save {name}. Nothing was written.',
  io: 'Tortie could not save {name}. Nothing was written.'
};

/** One plain sentence for a refusal word, with the file's name filled in. */
export function saveRefusalSentence(why: SaveRefusalWord, name: string): string {
  return SENTENCES[why].replace('{name}', name);
}

// -- the choice (charter item 2) ---------------------------------------------

/**
 * The title of the dialog a `stale` answer opens.
 *
 * It is a STATEMENT rather than a question, because the question is on the
 * three buttons and a title that led with one of them would be choosing for
 * the person. Nothing has been written when this is read.
 */
export function staleSaveTitle(name: string): string {
  return `'${name}' changed on disk`;
}

/**
 * The body. Two sentences: what happened, and what to press to see it.
 *
 * It says "nothing was saved" rather than leaving it to be inferred, which is
 * the remote family's own rule, and it points at Compare rather than at
 * Overwrite because the default is not overwrite.
 */
export const STALE_SAVE_BODY =
  'Something wrote to it after Tortie read it, so nothing was saved. Compare to see what your version would replace.';

/**
 * The two labels. Compare is the CONFIRM and Overwrite is the ALT, and the
 * order is forced by `ConfirmDialog`: it focuses the confirm button on open and
 * a bare Return runs it, so whichever action is `confirmLabel` is the default.
 * The charter says the default is not overwrite, so Overwrite is the alt,
 * drawn leading-left away from the primary, and Cancel sits between them.
 */
export const SAVE_COMPARE_LABEL = 'Compare';
export const SAVE_OVERWRITE_LABEL = 'Overwrite';

// -- the Compare tab ---------------------------------------------------------

/**
 * What the strip calls the Compare tab.
 *
 * It cannot be the file's own name: the tab it opens beside is that file, and
 * two tabs reading `notes.md` would be a puzzle. It names both sides in the
 * order they are drawn, left then right.
 */
export function compareTabName(name: string): string {
  return `${name} — disk vs yours`;
}

/** The tooltip, which says the two things the name has no room for. */
export function compareTabTooltip(name: string): string {
  return `What ${name} says on disk, against your unsaved version. Nothing here is saved and nothing refreshes it.`;
}

/** The read-only band over the Compare tab, saying which side is which. */
export const COMPARE_BAND_SENTENCE =
  'What is on disk now, on the left. Your unsaved version, on the right.';
