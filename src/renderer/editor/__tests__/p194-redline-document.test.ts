/**
 * Phase 194. The redline document: every byte of both files accounted for.
 *
 * The one claim, checked here over hand written shapes and a seeded fuzz:
 * the runs with every `ins` removed equal the OLD text byte for byte, and
 * with every `del` removed they equal the NEW text byte for byte.
 */

import { describe, expect, it } from 'vitest';
import {
  composeRedlineDocument,
  exactRuns,
  newTextOf,
  oldTextOf,
  redlineDocumentNote,
  REDLINE_DOC_MAX_LINE_EDITS
} from '../redline-document';
import {
  redlineRuns,
  REDLINE_MAX_BLOCK_CHARS,
  REDLINE_MAX_BLOCKS
} from '../redline';

function projections(oldText: string, newText: string): void {
  const doc = composeRedlineDocument(oldText, newText);
  expect(oldTextOf(doc.runs)).toBe(oldText);
  expect(newTextOf(doc.runs)).toBe(newText);
  // Adjacent runs never share a kind, and no run is empty.
  for (let i = 0; i < doc.runs.length; i++) {
    expect(doc.runs[i]?.text).not.toBe('');
    if (i > 0) expect(doc.runs[i]?.kind).not.toBe(doc.runs[i - 1]?.kind);
  }
  expect(doc.whole.unaligned).toBe(0);
}

describe('composeRedlineDocument', () => {
  it('an unchanged file is one plain run', () => {
    const doc = composeRedlineDocument('a\nb\n', 'a\nb\n');
    expect(doc.runs).toEqual([{ kind: 'same', text: 'a\nb\n' }]);
    expect(doc.blocks).toBe(0);
    expect(redlineDocumentNote(doc)).toBeNull();
  });

  it('two empty files are no runs at all', () => {
    expect(composeRedlineDocument('', '').runs).toEqual([]);
  });

  it('a replacement keeps the words around it and marks the words inside', () => {
    const oldText = 'Intro.\n\nThe quick brown fox jumped over the lazy dog.\n\nOutro.\n';
    const newText = 'Intro.\n\nThe quick red fox leapt over the sleepy dog.\n\nOutro.\n';
    const doc = composeRedlineDocument(oldText, newText);
    projections(oldText, newText);
    expect(doc.blocks).toBe(1);
    expect(doc.runs[0]).toEqual({ kind: 'same', text: 'Intro.\n\nThe quick ' });
    expect(doc.runs.filter((r) => r.kind === 'del').map((r) => r.text)).toEqual([
      'brown',
      'jumped',
      'lazy'
    ]);
    expect(doc.runs.filter((r) => r.kind === 'ins').map((r) => r.text)).toEqual([
      'red',
      'leapt',
      'sleepy'
    ]);
  });

  it('a pure deletion and a pure insertion are one run each', () => {
    const base = 'One.\nTwo.\nThree.\n';
    const del = composeRedlineDocument(base, 'One.\nThree.\n');
    expect(del.runs).toEqual([
      { kind: 'same', text: 'One.\n' },
      { kind: 'del', text: 'Two.\n' },
      { kind: 'same', text: 'Three.\n' }
    ]);
    const ins = composeRedlineDocument('One.\nThree.\n', base);
    expect(ins.runs).toEqual([
      { kind: 'same', text: 'One.\n' },
      { kind: 'ins', text: 'Two.\n' },
      { kind: 'same', text: 'Three.\n' }
    ]);
  });

  it('a whitespace only change is drawn rather than hidden', () => {
    const oldText = 'Spaced   out     words   here.\n';
    const newText = 'Spaced out words here.\n';
    const doc = composeRedlineDocument(oldText, newText);
    projections(oldText, newText);
    expect(doc.runs.some((r) => r.kind === 'del' && r.text === '   ')).toBe(true);
    expect(doc.runs.some((r) => r.kind === 'ins' && r.text === ' ')).toBe(true);
  });

  it('a block the word guard refuses draws whole and is counted', () => {
    const words = (seed: number, count: number): string => {
      const out: string[] = [];
      let x = seed;
      for (let i = 0; i < count; i++) {
        x = (x * 1103515245 + 12345) % 2147483648;
        out.push(`w${String(x % 500)}`);
      }
      return out.join(' ');
    };
    const oldText = `head\n\n${words(77, 300)}\n\ntail\n`;
    const newText = `head\n\n${words(78, 300)}\n\ntail\n`;
    const doc = composeRedlineDocument(oldText, newText);
    projections(oldText, newText);
    expect(doc.whole.tooDifferent).toBe(1);
    expect(doc.runs.map((r) => r.kind)).toEqual(['same', 'del', 'ins', 'same']);
    expect(redlineDocumentNote(doc)).toContain('1 change drawn whole');
    expect(redlineDocumentNote(doc)).toContain('1 rewritten');
  });

  it('a block past the character budget draws whole and is counted', () => {
    const big = 'x'.repeat(REDLINE_MAX_BLOCK_CHARS + 10);
    const oldText = `head\n${big}\ntail\n`;
    const newText = `head\n${big}y\ntail\n`;
    const doc = composeRedlineDocument(oldText, newText);
    projections(oldText, newText);
    expect(doc.whole.tooBig).toBe(1);
  });

  it('blocks past the block cap draw whole and are counted', () => {
    const oldLines: string[] = [];
    const newLines: string[] = [];
    for (let i = 0; i < REDLINE_MAX_BLOCKS + 5; i++) {
      oldLines.push(`line ${String(i)} says alpha`, '');
      newLines.push(`line ${String(i)} says beta`, '');
    }
    const oldText = oldLines.join('\n');
    const newText = newLines.join('\n');
    const doc = composeRedlineDocument(oldText, newText);
    projections(oldText, newText);
    expect(doc.blocks).toBe(REDLINE_MAX_BLOCKS + 5);
    expect(doc.whole.overCap).toBe(5);
    expect(redlineDocumentNote(doc)).toContain(`5 past the first ${String(REDLINE_MAX_BLOCKS)}`);
  });

  it('a file rewritten past the line guard falls back to one coarse block, still exact', () => {
    const mk = (w: string): string =>
      Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 200 }, (_, i) => `${w} ${String(i)}`).join('\n');
    const oldText = `same head\n${mk('old')}\nsame tail\n`;
    const newText = `same head\n${mk('new')}\nsame tail\n`;
    const doc = composeRedlineDocument(oldText, newText);
    projections(oldText, newText);
    expect(doc.approximate).toBe(true);
    expect(doc.runs[0]).toEqual({ kind: 'same', text: 'same head\n' });
    expect(doc.runs[doc.runs.length - 1]).toEqual({ kind: 'same', text: '\nsame tail\n' });
    expect(redlineDocumentNote(doc)).toContain('one block');
  });

  it('the coarse fallback is exact when one side of the middle is empty', () => {
    // Driven straight at exactRuns' caller by shapes the guard would give up
    // on is not possible cheaply, so this pins the snapping arithmetic on the
    // partition through the public function over a giant pure insertion.
    const filler = Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 50 }, (_, i) => `n ${String(i)}`).join('\n');
    projections('a\nc', `a\n${filler}\nc`);
    projections(`a\n${filler}\nc`, 'a\nc');
    projections('a\nc\n', `a\n${filler}\nc\n`);
  });

  it('a change at the very start and the very end, with and without a final newline', () => {
    projections('first\nmiddle\nlast', 'FIRST\nmiddle\nLAST');
    projections('first\nmiddle\nlast\n', 'first\nmiddle\nlast');
    projections('first\nmiddle\nlast', 'first\nmiddle\nlast\n');
    projections('', 'brand new\n');
    projections('gone\n', '');
  });

  it('emoji with a joiner, combining marks and a right to left run', () => {
    projections(
      'The team shipped 👩‍💻 café naïve résumé today.\n',
      'The team shipped 👨‍🚀 café naive résumé tomorrow.\n'
    );
    projections(
      'The sign read مرحبا بالعالم before the change.\n',
      'The sign read مرحبا بالجميع after the change.\n'
    );
    projections('今日は良い天気ですね。\n', '明日は良い天気ですね。\n');
  });
});

describe('exactRuns', () => {
  it('puts the old side spacing back where jsdiff took the new side', () => {
    const oldText = 'private so it';
    const newText = 'private, so it';
    const words = redlineRuns(oldText, newText);
    expect(words).not.toBeNull();
    const exact = exactRuns(words ?? [], oldText, newText);
    expect(exact).not.toBeNull();
    expect(oldTextOf(exact ?? [])).toBe(oldText);
    expect(newTextOf(exact ?? [])).toBe(newText);
  });

  it('refuses runs that are not this pair', () => {
    expect(exactRuns([{ kind: 'same', text: 'other' }], 'old', 'new')).toBeNull();
  });
});

describe('the seeded fuzz', () => {
  it('both projections hold over 2,000 random pairs', () => {
    const alphabet = [
      'a',
      'b',
      'word',
      ' ',
      '  ',
      '\t',
      '\n',
      '\n\n',
      ',',
      '.',
      'é',
      'naïve',
      '👨‍👩‍👧',
      'مرحبا',
      '天気',
      '\r\n'
    ];
    let x = 20260901;
    const rnd = (): number => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return x;
    };
    const text = (len: number): string => {
      let s = '';
      for (let i = 0; i < len; i++) s += alphabet[rnd() % alphabet.length] ?? '';
      return s;
    };
    let unaligned = 0;
    for (let i = 0; i < 2000; i++) {
      const a = text(rnd() % 40);
      // Half the pairs are edits of the same text, so blocks have words in
      // common and the repair actually runs rather than the whole path.
      const b =
        rnd() % 2 === 0
          ? text(rnd() % 40)
          : a.slice(0, rnd() % (a.length + 1)) + text(rnd() % 8) + a.slice(rnd() % (a.length + 1));
      const doc = composeRedlineDocument(a, b);
      expect(oldTextOf(doc.runs)).toBe(a);
      expect(newTextOf(doc.runs)).toBe(b);
      unaligned += doc.whole.unaligned;
    }
    expect(unaligned).toBe(0);
  });
});
