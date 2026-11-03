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
// PHASE 268. The save chord is READ from the one place chords are spelled,
// never typed here: src/shared/__tests__/keymap-single-source.test.ts is blunt
// about it, and rightly — a sentence that names a chord the person has
// re-recorded is a sentence that lies.
import { keyDisplay } from '@shared/keymap';
// PHASE 274.3. The file's name in a refusal and in the stale title is written
// with every character that cannot be seen spelled out as its code, the rule
// main's fs refusals quote names by.
import { visibleName } from '@shared/visible-name';
// PHASE 268. Type only, deliberately: ./auto-save imports the composer at the
// foot of this file, so the two modules meet in the type graph and never in
// the value graph.
import type { AutoSaveStopWhy } from './auto-save';

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
  // PHASE 273 MOVED IT FROM `outside` TO `projectClosed`, BYTE FOR BYTE, AND
  // THE MOVE IS THE FIX. The paragraph above was right about its cause and
  // wrong about which word carried it. `guarded-write.ts` answered `outside`
  // for every throw the two path guards make — a root that is no open project,
  // a path that escapes, a `.git` segment, a realpath that threw, a malformed
  // path, and Tortie failing to read its own project list — and this sentence
  // asserted the first of them to all six. Issue 25 is the bill: belucid's
  // project was OPEN, reached through a symlink, so the containment check
  // refused the path and he read this sentence on every file he ever tried to
  // save. The sentence is not reworded, because for the cause it names it was
  // already right; it just stopped being said about the other five.
  //
  // THE SECOND ROUTE THE PARAGRAPH BELOW WORRIED ABOUT IS NOW ITS OWN WORD.
  // `.git` is `protected` and says so, so the argument about whether any
  // gesture can open one no longer has to hold this sentence up.
  projectClosed:
    'Tortie did not save {name}, because its project is not open — open it again and save. Nothing was written.',
  // PHASE 273. What is left on `outside` is containment alone: the path is not
  // inside the real root of the project it was opened from. THE SENTENCE NAMES
  // NO REMEDY BECAUSE THERE IS NONE — the renderer composed this path from a
  // root it also chose, so a person did nothing to cause it and can do nothing
  // to clear it. After the containment repair a person should never meet this
  // word at all; if one does, it is a bug report, and the `fs.save.refused`
  // log line in src/main/fs/ipc.ts carries the root, the path and the reason
  // that answers it. A sentence that cannot name a remedy is better than one
  // that guesses a cause, and this is the sentence that rule is written for.
  outside:
    'Tortie did not save {name}, because it is not inside the project it was opened from. Nothing was written.',
  // PHASE 273. One word for two throw sites, and they are one cause to a
  // person: something between Tortie and the file could not be read. It covers
  // a folder that is gone, a disk ejected, a permission changed, a TCC denial
  // and a mount that has stalled, and it asserts none of them — the errno is
  // in the log, where somebody can act on it, and not in the sentence, where
  // guessing wrong is the defect this phase exists to remove.
  unreadable:
    'Tortie did not save {name}, because a folder on the way to it could not be read — check that the folder is still there. Nothing was written.',
  // PHASE 273. It does NOT merge into `outside`, even though the remedy is the
  // same — none — because the merged sentence would be FALSE. A file under
  // `.git` IS inside its project, and telling a person it is not is exactly the
  // lie this split exists to stop. Same remedy merges, unless the merged
  // sentence would assert something that was not measured.
  protected:
    'Tortie did not save {name}, because it is inside a .git folder and Tortie never writes there. Nothing was written.',
  // PHASE 273, and it is the only sentence in this map that does not begin
  // "Tortie did not save {name}". That is the design. This word is answered
  // when Tortie could not read its OWN list of open projects — a lazy import
  // that failed, a core that never booted, a SQLite read that threw — so it
  // never got as far as asking whether this project is open. Saying it is not
  // open would be a lie about the person's world to cover a fault in Tortie's.
  // The meetable one is concrete: on a machine where tmux cannot be found the
  // core re-runs boot on every call and every save read "its project is not
  // open".
  projectsUnknown:
    'Tortie could not check which projects are open, so it did not save {name} — restart Tortie and try again. Nothing was written.',
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

/**
 * One plain sentence for a refusal word, with the file's name filled in.
 *
 * PHASE 274.3. The name is handed over by a FUNCTION, never as the replacement
 * string itself: a string replacement reads `$'`, `$&`, `` $` `` and `$$` as
 * patterns, so a file named `a$'b.md` printed the sentence's tail twice and
 * `a$&b.md` printed `{name}` (measured, build/p352/SPEC.md §2.4). A function's
 * answer is inserted as it is.
 */
export function saveRefusalSentence(why: SaveRefusalWord, name: string): string {
  return SENTENCES[why].replace('{name}', () => visibleName(name));
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
  return `'${visibleName(name)}' changed on disk`;
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

// -- auto save stopped (Phase 268) -------------------------------------------

/**
 * The clause every auto-save stop ends with. One sentence, and it names the
 * way back.
 *
 * AUTO SAVE INVENTS NO REFUSAL. Every sentence below is composed from the ones
 * above — the map a ⌘S already uses, and the dialog title a `stale` answer
 * already opens with — so a person meets one idea rather than two, which is
 * the rule this whole file was written to. `conformance:save` rule 13 is what
 * keeps it that way, and rule 8's reader stops at the SENTENCES block above,
 * so nothing here is a key in that map.
 */
function autoSaveStopped(): string {
  return `Tortie stopped saving it on its own — press ${keyDisplay(
    'editor.save'
  )} when you are ready.`;
}

/**
 * What a person reads when a timer's save was refused, said ONCE.
 *
 * `stale` is somebody else's write landing under the buffer, which is issue 16
 * itself, so it borrows the dialog's own title and says what a timer cannot
 * ask. `refused` is the ⌘S sentence, byte for byte, with one clause after it.
 * `link` is the one case with nothing wrong behind it: a symbolic link belongs
 * to the plain door and a timer may not take it, so it says so and points at
 * ⌘S, which still saves it exactly as it does today.
 */
export function autoSaveStopSentence(
  why: AutoSaveStopWhy,
  name: string
): string {
  if (why.kind === 'stale') {
    return `${staleSaveTitle(name)}, so nothing was written. ${autoSaveStopped()}`;
  }
  if (why.kind === 'link') {
    // PHASE 274.3, the fix round of Phase 352: this arm quoted the name raw
    // while every refusal beside it wrote out what cannot be seen.
    return `Tortie does not save ${visibleName(name)} on its own, because it is a link. Press ${keyDisplay(
      'editor.save'
    )} to save it.`;
  }
  return `${saveRefusalSentence(why.why, name)} ${autoSaveStopped()}`;
}
