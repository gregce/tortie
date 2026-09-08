/**
 * PHASE 238's FIX ROUND. THE UNDO OF A REWIND, AFTER AN ACCEPT.
 *
 * The verifier drove this in the app: rewind a change, so the file is written
 * and the face draws *"Undo the last rewind with ⌥⇧⌫. It lasts for this
 * session."*; accept a DIFFERENT change; press ⌥⇧⌫. The undo refused and the
 * file did not move, which is correct — the journal entry's offset is into a
 * baseline the accept replaced, which is research 83 B.8a — but the promise
 * was still on the face at the moment of the press, the chip still drew the
 * button, and the sentence a person got was the rewind map's *"Look again,
 * then rewind"*, which tells whoever pressed the recovery to press the
 * destructive one.
 *
 * IT WAS ALREADY REACHABLE BEFORE PHASE 238, through a commit or a branch
 * switch, which re-seed the baseline and move the generation exactly as an
 * accept does; ./redline-journal's header has said so since Phase 227. What
 * this phase changed is that a person now moves the baseline deliberately,
 * several times an afternoon, so a rare lie became the ordinary one.
 *
 * Four things are pinned, each written so it CAN fail:
 *
 *   1. `undoableRewind` is the depth AND the generation, and the ablation is
 *      the same stack read at the generation it was recorded at.
 *   2. THE FACE STOPS PROMISING. The shipping view draws the undo sentence at
 *      a matching generation and draws NOTHING once an accept has moved it,
 *      with the baseline moved by the SHIPPING `nextBaseline` on a real
 *      accept event rather than by a hand-set integer.
 *   3. THE CHIP'S BUTTON IS THE SAME ONE ANSWER. The chip draws Undo for
 *      `canUndo` and not otherwise, and the view hands it the same binding the
 *      sentence is drawn from, read off the shipping source.
 *   4. THE SENTENCE IS THE VERB'S OWN. The undo map is total over the words an
 *      undo can produce, none of them tells a person to rewind, and
 *      `baselineMoved` differs from the rewind's and from the accept's.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { keyDisplay } from '@shared/keymap';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { recordRewind, undoableRewind, rewindJournalDepth, forgetRewindJournal } =
  await import('../redline-journal');
const { RedlineDocument } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
const {
  redlineRefusalSentence,
  redlineAcceptRefusalSentence,
  redlineUndoRefusalSentence,
  isUndoRefusal
} = await import('../redline-sentences');
type EditorTab = import('../tab-types').EditorTab;
type BaselineState = import('../baseline').BaselineState;
type RewindRefusal = import('../rewind').RewindRefusal;

const OPENED = 'The quick brown fox jumps over the lazy dog.\n';
const WRITTEN = 'The quick red fox leaps over the lazy dog.\n';

/** The baseline a tab holds after git answered once. */
const SEEDED = nextBaseline(NO_BASELINE, { kind: 'head', contents: OPENED });
/** And after the person accepted one change, through the shipping rule. */
const ACCEPTED = nextBaseline(SEEDED, {
  kind: 'accept',
  contents: 'The quick red fox jumps over the lazy dog.\n',
  at: 0
});

const tab = (baseline: BaselineState): EditorTab =>
  ({
    id: 't1',
    path: '/repo/notes.txt',
    relPath: 'notes.txt',
    origRelPath: null,
    repoPath: '/repo',
    name: 'notes.txt',
    mode: 'redline',
    canDiff: true,
    commit: null,
    dirty: false,
    loading: false,
    savedContents: WRITTEN,
    headContents: OPENED,
    baseline
  }) as Partial<EditorTab> as EditorTab;

const render = (t: EditorTab): string =>
  renderToStaticMarkup(createElement(RedlineDocument, { tab: t }));

afterEach(() => {
  forgetRewindJournal('t1');
});

// ---------------------------------------------------------------------------
// 1. The predicate.
// ---------------------------------------------------------------------------

describe('undoableRewind is the depth AND the generation', () => {
  it('answers the entry at the generation it was recorded at', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: 1 });
    expect(undoableRewind('t1', 1)).toEqual({
      off: 10,
      del: 'brown',
      ins: 'red',
      generation: 1
    });
  });

  it('answers nothing once the baseline has moved, with the entry still kept', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: 1 });
    expect(undoableRewind('t1', 2)).toBeUndefined();
    // Nothing is deleted: the depth is what it was, so a stack cannot lose an
    // undo by a second mechanism.
    expect(rewindJournalDepth('t1')).toBe(1);
  });

  it('answers nothing for a tab with no rewind at all', () => {
    expect(undoableRewind('t1', 1)).toBeUndefined();
  });

  it('reads the SHIPPING generations: a seed is 1 and an accept moves it', () => {
    expect(SEEDED.generation).toBe(1);
    expect(ACCEPTED.generation).toBe(2);
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: SEEDED.generation });
    expect(undoableRewind('t1', SEEDED.generation)).toBeDefined();
    expect(undoableRewind('t1', ACCEPTED.generation)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. The face stops promising.
// ---------------------------------------------------------------------------

describe('the face offers an undo only while there is one to do', () => {
  it('draws the sentence while the rewind is still undoable', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: SEEDED.generation });
    const html = render(tab(SEEDED));
    expect(html).toContain('ed-redline-undo');
    expect(html).toContain(
      `Undo the last rewind with ${keyDisplay('redline.undo')}. It lasts for this session.`
    );
  });

  it('AND THE DEFECT: draws NOTHING once an accept has moved the baseline', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: SEEDED.generation });
    const html = render(tab(ACCEPTED));
    expect(html).not.toContain('ed-redline-undo');
    expect(html).not.toContain('Undo the last rewind');
    // And the face says what it IS marking against, so the accept is not
    // silent: the since line names the moment (Phase 238 item 5).
    expect(html).toContain('Marked since you accepted');
  });

  it('draws nothing with no rewind at either generation, which is the resting face', () => {
    expect(render(tab(SEEDED))).not.toContain('ed-redline-undo');
    expect(render(tab(ACCEPTED))).not.toContain('ed-redline-undo');
  });
});

// ---------------------------------------------------------------------------
// 3. The note row's button, and the one binding behind both.
//
// PHASE 239 MOVED UNDO OFF THE CHIP into the note row, where the sentence that
// says what it does already is, so this section asks the row rather than the
// chip. The binding is unchanged and it is the point of this phase's fix: one
// answer, `undoableRewind`, drawn from by the sentence and by the button.
// ---------------------------------------------------------------------------

describe("the row's Undo is the same one answer", () => {
  it('draws the button while the rewind is still undoable, and not after an accept', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: SEEDED.generation });
    expect(render(tab(SEEDED))).toContain('ed-redline-note-button');
    expect(render(tab(ACCEPTED))).not.toContain('ed-redline-note-button');
  });

  it('the view computes it from undoableRewind and the row draws from that', () => {
    const source = readFileSync(
      new URL('../RedlineDocument.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('const canUndo = undoableRewind(tab.id, generation) !== undefined;');
    expect(source).toContain('redlineUndoNote(canUndo, typing.canUndoTyping)');
    // The depth alone is what the defect read, and nothing reads it here now.
    expect(source).not.toContain('rewindJournalDepth(tab.id) > 0');
  });
});

// ---------------------------------------------------------------------------
// 4. The sentence is the verb's own.
// ---------------------------------------------------------------------------

const UNDO_WORDS: RewindRefusal[] = [
  'dirty',
  'baselineMoved',
  'fileTooLarge',
  'decodeLoss',
  'phraseMoved',
  'stale',
  'raced',
  'readOnly',
  'outsideRoot',
  'io'
];

describe('an undo says undo, and never tells a person to rewind', () => {
  it('is total over every word an undo can produce, and over nothing else', () => {
    for (const why of UNDO_WORDS) expect(isUndoRefusal(why)).toBe(true);
    // The two an undo cannot produce: its identity comes from the journal, so
    // it never calls resolvePress and can be neither ambiguous nor already
    // back. They fall back to the rewind map rather than answering nothing.
    for (const why of ['alreadyBack', 'ambiguous'] as RewindRefusal[]) {
      expect(isUndoRefusal(why)).toBe(false);
      expect(redlineUndoRefusalSentence(why, 'notes.txt')).toBe(
        redlineRefusalSentence(why, 'notes.txt')
      );
    }
  });

  it('names the file, ends in a full stop, and never says "then rewind"', () => {
    for (const why of UNDO_WORDS) {
      const said = redlineUndoRefusalSentence(why, 'notes.txt');
      expect(said).toContain('notes.txt');
      expect(said.endsWith('.')).toBe(true);
      expect(said).not.toContain('then rewind');
      expect(said).not.toContain('then accept');
    }
  });

  it('THE ONE THAT CHANGED MEANING: a moved baseline is not "look again"', () => {
    const said = redlineUndoRefusalSentence('baselineMoved', 'notes.txt');
    expect(said).toBe(
      'The marking moved, so the last rewind of notes.txt can no longer be undone.'
    );
    // It is the rewind's and the accept's own sentence that says "look again",
    // and those two are unchanged.
    expect(redlineRefusalSentence('baselineMoved', 'notes.txt')).toContain(
      'Look again, then rewind.'
    );
    expect(redlineAcceptRefusalSentence('baselineMoved', 'notes.txt')).toContain(
      'Look again, then accept.'
    );
    expect(said).not.toBe(redlineRefusalSentence('baselineMoved', 'notes.txt'));
    expect(said).not.toBe(redlineAcceptRefusalSentence('baselineMoved', 'notes.txt'));
  });

  it('the view picks the map by the verb, so an undo can never get the rewind words', () => {
    const source = readFileSync(
      new URL('../RedlineDocument.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain("kind === 'undo'");
    expect(source).toContain('redlineUndoRefusalSentence(why, live.name)');
  });
});
