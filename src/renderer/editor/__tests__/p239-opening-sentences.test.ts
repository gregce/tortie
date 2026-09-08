/**
 * PHASE 239 item 5. WHAT THE REDLINE SAYS WHEN THERE IS NOTHING TO SHOW.
 *
 * The operator asked on 2026-09-08: *"there should be clarity in the redline
 * view about what it is showing you if you open a new file (since the last
 * time it was loaded)."* Research 99 section 6.2 read all three opening faces
 * off the running app and quoted them character for character. All three drew
 * a document with no marks in it, all three said one sentence, and **two of
 * them were the same 67 characters** — the untracked file and the file an
 * agent created before it was ever opened differed nowhere on the face except
 * the filename inside an `aria-label`.
 *
 * This file pins the answer character for character, so a later round cannot
 * quietly reword it, and it pins the three things research 99 section 6.4
 * measured as missing:
 *
 *   1. THE PICTURE IS EMPTY AND THE FACE SAYS SO. `Nothing has changed` is a
 *      statement about what is drawn; `Marked since …` was a promise about the
 *      future, and a person could not tell it from "nothing is being compared".
 *   2. IT SAYS WHEN. `takenAt` is the one field this phase added, and the
 *      untracked face carries its clock time, so a tab opened this morning and
 *      a tab opened a minute ago no longer read identically.
 *   3. THE UNTRACKED FILE AND THE AGENT-CREATED FILE SAY THE SAME THING, on
 *      purpose and with the reason in ../baseline: Tortie holds no fact that
 *      separates them, and the extra claim is the one research 83 A4.2 ruling
 *      1 forbids this view from making. What differs is the TIME, which is
 *      exactly the fact that explains why an agent-created file draws nothing:
 *      it was finished before the moment the marking starts from.
 *
 * The ablations are here too: the sentence with a mark in the picture is
 * unchanged, so the phase is proved not to have moved the face it was not
 * asked about.
 */

import { describe, expect, it } from 'vitest';
import {
  NO_BASELINE,
  baselineDetail,
  baselineSentence,
  clockTime,
  nextBaseline
} from '../baseline';

/** 2026-09-08 at 14:02 local, built from local parts so no zone can move it. */
const OPENED_AT = new Date(2026, 8, 8, 14, 2, 30).getTime();
/** The same day at 09:07 local, which is "this morning" in the charter. */
const MORNING = new Date(2026, 8, 8, 9, 7, 0).getTime();

/** A, a file with a HEAD version: the baseline is the commit. */
const commitBaseline = nextBaseline(
  NO_BASELINE,
  { kind: 'head', contents: 'the committed text\n' },
  OPENED_AT
);
/** B and C, a file with no HEAD version: the baseline is the first read. */
const readBaseline = nextBaseline(
  NO_BASELINE,
  { kind: 'read', contents: 'the text on disk\n' },
  OPENED_AT
);

describe('the three opening sentences, character for character', () => {
  it('A. a file with a HEAD version, opened cold and unchanged', () => {
    expect(baselineSentence(commitBaseline, false, { empty: true })).toBe(
      'Nothing has changed since the last commit.'
    );
  });

  it('B. a file with no HEAD version, opened cold', () => {
    expect(baselineSentence(readBaseline, false, { empty: true })).toBe(
      'Nothing has changed since you opened this file at 14:02.'
    );
  });

  it('C. a file an agent created before it was ever opened, the same sentence', () => {
    // Mechanically identical to B: `loadContents` runs when the PERSON opens
    // the file, so the agent's final bytes ARE the baseline (research 83 A1.2
    // property 2). ../baseline says why the face may not claim more.
    const created = nextBaseline(
      NO_BASELINE,
      { kind: 'read', contents: 'what the agent wrote\n' },
      OPENED_AT
    );
    expect(baselineSentence(created, false, { empty: true })).toBe(
      baselineSentence(readBaseline, false, { empty: true })
    );
  });

  it('AND THE DEFECT IS GONE: a morning tab and a minute-old tab no longer read alike', () => {
    const morning = nextBaseline(
      NO_BASELINE,
      { kind: 'read', contents: 'x\n' },
      MORNING
    );
    const now = baselineSentence(readBaseline, false, { empty: true });
    const then = baselineSentence(morning, false, { empty: true });
    expect(then).toBe('Nothing has changed since you opened this file at 09:07.');
    expect(then).not.toBe(now);
    // Research 99 section 6.2 measured them at the SAME 67 characters, which
    // is the reading this rule refuses.
    const wasSaid = 'Marked since you opened this file, for as long as this tab is open.';
    expect(wasSaid).toHaveLength(67);
    expect(now).not.toBe(wasSaid);
  });
});

describe('what did NOT move', () => {
  it('a picture WITH a mark in it says exactly what it said before', () => {
    expect(baselineSentence(readBaseline, false)).toBe(
      'Marked since you opened this file, for as long as this tab is open.'
    );
    expect(baselineSentence(commitBaseline, false)).toBe(
      'Marked since the last commit, for as long as this tab is open.'
    );
    expect(baselineSentence(commitBaseline, false, { empty: false })).toBe(
      'Marked since the last commit, for as long as this tab is open.'
    );
  });

  it('the dirty limit is still said, empty picture or not', () => {
    expect(baselineSentence(commitBaseline, true, { empty: true })).toBe(
      'Nothing has changed since the last commit. Not refreshed from disk while there are unsaved edits.'
    );
    expect(baselineSentence(commitBaseline, true)).toBe(
      'Marked since the last commit, for as long as this tab is open. Not refreshed from disk while there are unsaved edits.'
    );
  });

  it('no baseline still says nothing at all', () => {
    expect(baselineSentence(undefined, false, { empty: true })).toBeNull();
    expect(baselineSentence(NO_BASELINE, false, { empty: true })).toBeNull();
    expect(baselineDetail(undefined, { empty: true })).toBeNull();
    expect(baselineDetail(NO_BASELINE, { empty: true })).toBeNull();
  });

  it('never says the old text is kept anywhere (A3.4)', () => {
    const said = [
      baselineSentence(readBaseline, false, { empty: true }),
      baselineSentence(commitBaseline, false, { empty: true }),
      baselineDetail(readBaseline, { empty: true }),
      baselineDetail(commitBaseline, { empty: true }),
      baselineDetail(readBaseline, {}),
      baselineDetail(commitBaseline, {})
    ];
    for (const s of said) {
      expect(s).not.toMatch(/\b(kept|saved|backup|copy|history)\b/i);
      // Research 83 A4.2 ruling 1: the view never says an agent did it.
      expect(s).not.toMatch(/\bagent\b/i);
    }
  });
});

describe('the time, and the one place it may be missing', () => {
  it('is HH:MM on the twenty four hour clock, so no locale can move it', () => {
    expect(clockTime(new Date(2026, 8, 8, 0, 0).getTime())).toBe('00:00');
    expect(clockTime(new Date(2026, 8, 8, 9, 7).getTime())).toBe('09:07');
    expect(clockTime(new Date(2026, 8, 8, 14, 2).getTime())).toBe('14:02');
    expect(clockTime(new Date(2026, 8, 8, 23, 59).getTime())).toBe('23:59');
  });

  it('moves with the generation and never otherwise', () => {
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a' }, 100);
    expect(seeded.takenAt).toBe(100);
    // A later read never re-seeds, so the clock must not move either.
    expect(nextBaseline(seeded, { kind: 'read', contents: 'b' }, 900).takenAt).toBe(100);
    // An empty HEAD answer seeds nothing, so it carries the clock through.
    expect(nextBaseline(seeded, { kind: 'head', contents: '' }, 900).takenAt).toBe(100);
    // A HEAD version not seen before DOES re-seed, so the clock moves with it.
    const head = nextBaseline(seeded, { kind: 'head', contents: 'H' }, 900);
    expect(head.generation).toBe(2);
    expect(head.takenAt).toBe(900);
  });

  it('degrades to the words without a time rather than printing a wrong one', () => {
    const noClock = { ...readBaseline, takenAt: null };
    expect(baselineSentence(noClock, false, { empty: true })).toBe(
      'Nothing has changed since you opened this file.'
    );
  });
});

describe('the longer explanation is behind the hover and never on the face', () => {
  it('the untracked empty face is told WHY it has nothing to compare against', () => {
    expect(baselineDetail(readBaseline, { empty: true })).toBe(
      'There is no committed version to compare against, so the marking starts from the bytes that were on disk when this tab opened. Anything written before then is not marked. The marking lasts for as long as this tab is open.'
    );
  });

  it('the committed empty face says the file matches its commit', () => {
    expect(baselineDetail(commitBaseline, { empty: true })).toBe(
      'This file is the same as its last committed version. The marking lasts for as long as this tab is open.'
    );
  });

  it('JUST ENOUGH WORDS: every visible sentence is one line and the detail is longer', () => {
    for (const [state, empty] of [
      [commitBaseline, true],
      [readBaseline, true],
      [commitBaseline, false],
      [readBaseline, false]
    ] as const) {
      const line = baselineSentence(state, false, { empty });
      const detail = baselineDetail(state, { empty });
      expect(line).not.toBeNull();
      expect(detail).not.toBeNull();
      // One sentence on the face for the empty case, at most two when the tab
      // is dirty, and never a paragraph.
      expect((line as string).length).toBeLessThanOrEqual(70);
      expect(line).not.toContain('\n');
      // The explanation is the longer half, which is what "behind the hover"
      // means in numbers.
      expect((detail as string).length).toBeGreaterThan((line as string).length);
    }
  });
});
