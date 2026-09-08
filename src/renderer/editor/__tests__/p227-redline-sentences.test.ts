/**
 * PHASE 227, item 6. The refusal sentences.
 *
 * One plain sentence per refusal word, the file's name filled in, just enough
 * words. Pinned: every word in the RewindRefusal union has a sentence (the
 * map is total, so a word without one would not compile, but this proves it
 * at run time too over the twelve), the name is substituted, each is one
 * sentence, and the two that a person can act on say what to do.
 */

import { describe, expect, it } from 'vitest';
import { redlineRefusalSentence } from '../redline-sentences';
import type { RewindRefusal } from '../rewind';

const ALL: RewindRefusal[] = [
  'dirty',
  'baselineMoved',
  'fileTooLarge',
  'decodeLoss',
  'phraseMoved',
  'alreadyBack',
  'ambiguous',
  'stale',
  'raced',
  'readOnly',
  'outsideRoot',
  'io'
];

describe('the refusal sentences', () => {
  it('answers one non-empty sentence for every refusal word', () => {
    for (const why of ALL) {
      const s = redlineRefusalSentence(why, 'notes.txt');
      expect(s.length, why).toBeGreaterThan(0);
      // One sentence: no line break, ends on a full stop.
      expect(s.includes('\n'), why).toBe(false);
      expect(s.endsWith('.'), why).toBe(true);
      // No leftover placeholder.
      expect(s.includes('{name}'), why).toBe(false);
    }
  });

  it('names the file where the sentence is about the file', () => {
    for (const why of ['dirty', 'fileTooLarge', 'decodeLoss', 'phraseMoved', 'stale', 'raced', 'readOnly', 'outsideRoot', 'io'] as RewindRefusal[]) {
      expect(redlineRefusalSentence(why, 'report.md'), why).toContain('report.md');
    }
  });

  it('distinguishes the two that E.7 says need different meanings', () => {
    expect(redlineRefusalSentence('phraseMoved', 'a.txt')).toContain('no longer in');
    expect(redlineRefusalSentence('alreadyBack', 'a.txt')).toContain('already back');
  });

  it('tells the person what to do for the ones they can act on', () => {
    expect(redlineRefusalSentence('dirty', 'a.txt')).toContain('then rewind');
    expect(redlineRefusalSentence('baselineMoved', 'a.txt')).toContain('Look again');
    expect(redlineRefusalSentence('stale', 'a.txt')).toContain('Look again');
  });
});
