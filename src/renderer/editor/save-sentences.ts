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
 * saves today: `fs:writeFile` follows the link and replaces what it points at,
 * which is what a person who made that link expects. The guarded channel
 * refuses it because it will not turn a link into a regular file, which is
 * right for a REWIND — nobody typed those bytes — and would be a save a person
 * has today taken away from them. So ./tab-io saves a link through the plain
 * door instead, and there is no sentence for it because nothing went wrong.
 *
 * THE FIX ROUND REFUTED THIS PARAGRAPH'S OWN SENTENCE, and the correction is
 * the point rather than the footnote. It read "and nothing is lost by it", and
 * that was measured in the running app and is false: typed into a symlinked
 * file inside a project, a `/bin/sh` wrote 17 bytes into the link's target,
 * ⌘S — and the outside write was gone, with no dialog, no toast and a clean
 * tab. That is issue 16 exactly, on a file that happens to be a link, so a
 * fallback with no check at all could not stand. The plain door in ./tab-io
 * now READS the file and compares it to what the buffer was built from before
 * it writes, and offers the same three answers when they differ.
 *
 * THE COMMITTER'S ROUND CLOSED TWO MORE HOLES IN THAT SAME DOOR, and both were
 * this phase's own subject line unmet. Its Overwrite was UNCONDITIONAL, so a
 * third writer arriving while the question was on screen was written over — 38
 * characters destroyed in the running app, against the guarded door re-asking
 * in the same run; it now carries the text it showed, reads the file at the
 * press, and writes only if the file still says it. And it wrote a lossy decode
 * back whole, so a latin-1 file reached through a link went 49 B to 58 B with
 * four U+FFFD in it and nothing said; it now refuses a text carrying U+FFFD
 * with the `notUtf8` sentence below, which is the same word the guarded channel
 * answers for the same file. THE STATED LIMIT IS THE WINDOW between the reading
 * and the write, which is one IPC round trip rather than the guarded channel's
 * two system calls, and it stays open because closing it means giving the
 * channel a mode for a link, which is a change to the channel this phase does
 * not make.
 */
export type SaveRefusalWord = Exclude<FsGuardedWriteRefusal, 'link'>;

/** The sentence for each refusal word, `{name}` filled with the file's name. */
const SENTENCES: Record<SaveRefusalWord, string> = {
  // PHASE 240 FIX ROUND. `outside` reaches a person in exactly one shape, and
  // the first sentence did not name it. A file outside every project takes the
  // plain door and never asks the channel at all, so the only way to hear this
  // is a tab whose PROJECT WAS CLOSED under it: closing a project does not
  // close its tabs, the path is still inside its old root, and the channel
  // asks the open list. So the sentence names that cause and the remedy, in
  // the same two sentences the family uses.
  //
  // THE CHANNEL HAS A SECOND ROUTE TO THIS WORD AND NOTHING CAN REACH IT.
  // `resolveInsideRoot` also refuses a path holding the segment `.git` at any
  // depth, and `guarded-write.ts` turns every throw from that block into
  // `outside`, so a tab on a file under `.git` would read this sentence and it
  // would be false. No gesture in this product opens one: the Explorer refuses
  // the segment in `tree-paths.ts`, and search and quick open walk with
  // ripgrep, which skips `.git` on its own. If a later round ever opens one,
  // this sentence is what has to move, and the renderer already knows the open
  // projects, so telling the two apart is a lookup rather than a new channel.
  outside:
    'Tortie did not save {name}, because its project is not open — open it again and save. Nothing was written.',
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
