/**
 * PHASE 240. Every answer a save can give has its own sentence, and none of
 * them is the generic one (issue 16).
 *
 * Before this phase, `save` was `await gmux.fs.writeFile(tab.path, value)` and
 * every failure path was an unhandled throw wearing
 * `Could not save this file. ${errorSentence(err, 'The write failed.')}`.
 * Research 100 §3.2 measured what a person read when their file was read-only:
 * "Could not save this file. Could not save notes.txt." — the same sentence
 * twice, naming no cause and no remedy. And research 100 §3.1 measured that
 * six of the eight cases did not fail at all: they wrote, and five of those
 * destroyed something with nothing said.
 *
 * So each word gets its own sentence, and this pins them. Ablating any one of
 * them, or collapsing two words onto one string, turns this file red.
 */

import { describe, expect, it } from 'vitest';
import {
  COMPARE_BAND_SENTENCE,
  SAVE_COMPARE_LABEL,
  SAVE_OVERWRITE_LABEL,
  STALE_SAVE_BODY,
  compareTabName,
  autoSaveStopSentence,
  compareTabTooltip,
  saveRefusalSentence,
  staleSaveTitle
} from '../save-sentences';
import type { SaveRefusalWord } from '../save-sentences';
import { saveRefusalWord } from '../save-write';

const NAME = 'notes.md';

/** Every word, and the sentence a person reads for it. */
const PINNED: Record<SaveRefusalWord, string> = {
  // PHASE 240 FIX ROUND. `outside` reaches a person in one shape only, being a
  // tab whose project was closed under it, so the sentence names that cause and
  // the remedy rather than a containment rule nobody can act on.
  //
  // PHASE 273 REFUTED "IN ONE SHAPE ONLY" AND MOVED THE SENTENCE. At least six
  // causes reached `outside` and this sentence was said to all of them. Issue
  // 25 is the person who met it: his project was open, reached through a
  // symlink, so containment refused the PATH and he read that his project was
  // closed, on every file he ever tried to save. The sentence keeps its bytes
  // under `projectClosed`, which is the one cause it describes, and the four
  // words below it are the causes it used to speak for.
  projectClosed:
    'Tortie did not save notes.md, because its project is not open — open it again and save. Nothing was written.',
  outside:
    'Tortie did not save notes.md, because it is not inside the project it was opened from. Nothing was written.',
  unreadable:
    'Tortie did not save notes.md, because a folder on the way to it could not be read — check that the folder is still there. Nothing was written.',
  protected:
    'Tortie did not save notes.md, because it is inside a .git folder and Tortie never writes there. Nothing was written.',
  projectsUnknown:
    'Tortie could not check which projects are open, so it did not save notes.md — restart Tortie and try again. Nothing was written.',
  missing:
    'Tortie did not save notes.md, because it is no longer on disk. Nothing was written.',
  readOnly:
    'Tortie did not save notes.md, because it is read-only. Nothing was written.',
  tooLarge:
    'Tortie did not save notes.md, because it is larger than Tortie can write. Nothing was written.',
  notUtf8:
    'Tortie did not save notes.md, because it is not UTF-8 text and writing it whole would damage it. Nothing was written.',
  raced:
    'Something wrote to notes.md as you saved, so nothing was written. Press Save again.',
  input: 'Tortie could not work out where to save notes.md. Nothing was written.',
  io: 'Tortie could not save notes.md. Nothing was written.'
};

describe('the save says which answer it got', () => {
  for (const [why, sentence] of Object.entries(PINNED)) {
    it(`${why} reads as its own sentence`, () => {
      expect(saveRefusalSentence(why as SaveRefusalWord, NAME)).toBe(sentence);
    });
  }

  it('says something different for every word', () => {
    const said = Object.values(PINNED);
    expect(new Set(said).size).toBe(said.length);
  });

  it('never says the generic sentence it replaced', () => {
    for (const sentence of Object.values(PINNED)) {
      expect(sentence).not.toContain('Could not save this file');
      expect(sentence).not.toContain('The write failed');
    }
  });

  it('names the file in every one of them', () => {
    for (const sentence of Object.values(PINNED)) expect(sentence).toContain(NAME);
  });

  it('says what happened to the file in every one of them', () => {
    for (const sentence of Object.values(PINNED)) {
      expect(sentence).toMatch(/Nothing was written\.|Press Save again\./);
    }
  });
});

describe('the choice a stale answer opens', () => {
  it('states what happened rather than asking a leading question', () => {
    expect(staleSaveTitle(NAME)).toBe("'notes.md' changed on disk");
  });

  it('says nothing was saved, and points at Compare', () => {
    expect(STALE_SAVE_BODY).toBe(
      'Something wrote to it after Tortie read it, so nothing was saved. Compare to see what your version would replace.'
    );
  });

  // ConfirmDialog focuses the confirm button on open and a bare Return runs
  // it, so whichever label is the confirm IS the default. The charter says the
  // default is not overwrite.
  it('offers Compare and Overwrite, and Overwrite is not the default', () => {
    expect(SAVE_COMPARE_LABEL).toBe('Compare');
    expect(SAVE_OVERWRITE_LABEL).toBe('Overwrite');
    expect(STALE_SAVE_BODY).toContain(SAVE_COMPARE_LABEL);
  });
});

describe('the Compare tab', () => {
  it('does not wear the file’s own name', () => {
    expect(compareTabName(NAME)).toBe('notes.md — disk vs yours');
    expect(compareTabName(NAME)).not.toBe(NAME);
  });

  it('says which side is which, and that nothing here is saved', () => {
    expect(compareTabTooltip(NAME)).toBe(
      'What notes.md says on disk, against your unsaved version. Nothing here is saved and nothing refreshes it.'
    );
    expect(COMPARE_BAND_SENTENCE).toBe(
      'What is on disk now, on the left. Your unsaved version, on the right.'
    );
  });
});

describe('link is the one word a save never says', () => {
  // A file inside a project that is a symbolic link saves today and loses
  // nothing by saving; refusing it would take a save away. ./tab-io sends it
  // through the old door instead, so there is no sentence for it and there
  // must not be one.
  it('maps to null so the caller falls back rather than refusing', () => {
    expect(saveRefusalWord({ outcome: 'refused', why: 'link', reason: 'x' })).toBeNull();
  });

  it('every other word is passed through as itself', () => {
    for (const why of Object.keys(PINNED) as SaveRefusalWord[]) {
      expect(saveRefusalWord({ outcome: 'refused', why, reason: 'x' })).toBe(why);
    }
  });
});

describe('the name is quoted as it is (Phase 274.3)', () => {
  // A string replacement reads `$'`, `$&`, `` $` `` and `$$` in the NAME as
  // patterns. Measured at the parent (build/p352/SPEC.md §2.4): `a$'b.md`
  // printed the sentence's tail twice, `a$&b.md` printed `{name}`, `` a$`b.md ``
  // printed the sentence's head and `a$$b.md` lost a dollar.
  const DOLLARS = ["a$'b.md", 'a$&b.md', 'a$`b.md', 'a$$b.md'];

  it('every refusal sentence quotes a name holding a $ pattern exactly as written', () => {
    for (const name of DOLLARS) {
      for (const [why, sentence] of Object.entries(PINNED)) {
        expect(saveRefusalSentence(why as SaveRefusalWord, name)).toBe(
          sentence.split(NAME).join(name)
        );
      }
    }
  });

  it('reads the four shapes the parent mangled, as written', () => {
    const tail =
      ', because its project is not open — open it again and save. Nothing was written.';
    expect(saveRefusalSentence('projectClosed', "a$'b.md")).toBe(
      `Tortie did not save a$'b.md${tail}`
    );
    expect(saveRefusalSentence('projectClosed', 'a$&b.md')).toBe(
      `Tortie did not save a$&b.md${tail}`
    );
    expect(saveRefusalSentence('projectClosed', 'a$`b.md')).toBe(
      `Tortie did not save a$\`b.md${tail}`
    );
    expect(saveRefusalSentence('projectClosed', 'a$$b.md')).toBe(
      `Tortie did not save a$$b.md${tail}`
    );
  });

  it('the stale title quotes them as written too', () => {
    for (const name of DOLLARS) {
      expect(staleSaveTitle(name)).toBe(`'${name}' changed on disk`);
    }
  });

  it('writes out what cannot be seen, in a refusal and in the stale title', () => {
    expect(saveRefusalSentence('missing', 'no\u200Bte.md')).toBe(
      'Tortie did not save no<U+200B>te.md, because it is no longer on disk. Nothing was written.'
    );
    expect(saveRefusalSentence('raced', 'my\u00A0notes.md')).toBe(
      'Something wrote to my<U+00A0>notes.md as you saved, so nothing was written. Press Save again.'
    );
    expect(staleSaveTitle('no\u200Bte.md')).toBe("'no<U+200B>te.md' changed on disk");
    expect(staleSaveTitle('invoice\u202Edm.exe')).toBe(
      "'invoice<U+202E>dm.exe' changed on disk"
    );
  });

  it('the auto save stop for a link writes out what cannot be seen too (the fix round of Phase 352)', () => {
    const said = autoSaveStopSentence({ kind: 'link' }, 'no\u200Bte.md');
    expect(said.startsWith('Tortie does not save no<U+200B>te.md on its own, because it is a link.')).toBe(true);
    expect(said.includes('\u200B')).toBe(false);
    expect(autoSaveStopSentence({ kind: 'link' }, 'notes.md').startsWith('Tortie does not save notes.md on its own')).toBe(true);
    expect(autoSaveStopSentence({ kind: 'link' }, 'no\u200Bte.md')).not.toBe(
      autoSaveStopSentence({ kind: 'link' }, 'note.md')
    );
  });
});
