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
  peelSharedSpace,
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
    // Three spaces became one: the one they share stays plain and the two
    // that went are struck, so nothing is drawn as inserted. Before the peel
    // this drew del "   " then ins " ", a space struck and a space inserted.
    expect(doc.runs).toEqual([
      { kind: 'same', text: 'Spaced ' },
      { kind: 'del', text: '  ' },
      { kind: 'same', text: 'out ' },
      { kind: 'del', text: '    ' },
      { kind: 'same', text: 'words ' },
      { kind: 'del', text: '  ' },
      { kind: 'same', text: 'here.\n' }
    ]);
    // Four spaces becoming a tab share nothing, so both are drawn.
    const tab = composeRedlineDocument('    indented\n', '\tindented\n');
    expect(tab.runs).toEqual([
      { kind: 'del', text: '    ' },
      { kind: 'ins', text: '\t' },
      { kind: 'same', text: 'indented\n' }
    ]);
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

describe('a change to the last word of a line', () => {
  // The verifier of Phase 194 found del "Monday\n" then ins "Friday\n": the
  // deletion carried the line break and the insertion landed on the next
  // line. The shared whitespace now moves into the plain run after the pair.
  it('keeps the insertion on the line, with the line break in the plain run after', () => {
    const oldText = 'We ship on Monday\nNext line.\n';
    const newText = 'We ship on Friday\nNext line.\n';
    projections(oldText, newText);
    expect(composeRedlineDocument(oldText, newText).runs).toEqual([
      { kind: 'same', text: 'We ship on ' },
      { kind: 'del', text: 'Monday' },
      { kind: 'ins', text: 'Friday' },
      { kind: 'same', text: '\nNext line.\n' }
    ]);
  });

  it('holds at the end of the file, a list item, and before a blank line', () => {
    const cases: [string, string, string, string][] = [
      ['- item one\n- item two\n', '- item one\n- item three\n', 'two', 'three'],
      ['first\nsecond word\nthird\n', 'first\nsecond term\nthird\n', 'word', 'term'],
      ['A paragraph ends here\n\nNext paragraph.\n', 'A paragraph ends there\n\nNext paragraph.\n', 'here', 'there'],
      ['one\r\ntwo\r\nthree\r\n', 'one\r\n2\r\nthree\r\n', 'two', '2']
    ];
    for (const [oldText, newText, del, ins] of cases) {
      projections(oldText, newText);
      const runs = composeRedlineDocument(oldText, newText).runs;
      const at = runs.findIndex((r) => r.kind === 'del');
      expect(runs[at]).toEqual({ kind: 'del', text: del });
      expect(runs[at + 1]).toEqual({ kind: 'ins', text: ins });
      expect(runs[at + 2]?.kind).toBe('same');
      expect(runs[at + 2]?.text.startsWith('\n') || runs[at + 2]?.text.startsWith('\r\n')).toBe(true);
    }
  });

  it('indentation the two sides share stays plain before the pair', () => {
    const oldText = 'list:\n    old item\n';
    const newText = 'list:\n    new item\n';
    projections(oldText, newText);
    const runs = composeRedlineDocument(oldText, newText).runs;
    expect(runs[0]).toEqual({ kind: 'same', text: 'list:\n    ' });
    expect(runs[1]).toEqual({ kind: 'del', text: 'old' });
    expect(runs[2]).toEqual({ kind: 'ins', text: 'new' });
  });

  it('a block drawn whole is peeled the same way', () => {
    const words = (seed: number, count: number): string => {
      const out: string[] = [];
      let x = seed;
      for (let i = 0; i < count; i++) {
        x = (x * 1103515245 + 12345) % 2147483648;
        out.push(`w${String(x % 500)}`);
      }
      return out.join(' ');
    };
    const oldText = `head\n${words(77, 300)}\ntail\n`;
    const newText = `head\n${words(78, 300)}\ntail\n`;
    projections(oldText, newText);
    const runs = composeRedlineDocument(oldText, newText).runs;
    expect(runs.map((r) => r.kind)).toEqual(['same', 'del', 'ins', 'same']);
    expect(runs[1]?.text.endsWith('\n')).toBe(false);
    expect(runs[2]?.text.endsWith('\n')).toBe(false);
    expect(runs[3]?.text).toBe('\ntail\n');
  });

  it('a lone deletion or insertion keeps its own line break, which is the change', () => {
    expect(composeRedlineDocument('a\nb\nc\n', 'a\nc\n').runs).toEqual([
      { kind: 'same', text: 'a\n' },
      { kind: 'del', text: 'b\n' },
      { kind: 'same', text: 'c\n' }
    ]);
  });

  it('never moves a word, only whitespace, in either order of the pair', () => {
    expect(peelSharedSpace([{ kind: 'del', text: 'Monday' }, { kind: 'ins', text: 'Friday' }])).toEqual([
      { kind: 'del', text: 'Monday' },
      { kind: 'ins', text: 'Friday' }
    ]);
    expect(peelSharedSpace([{ kind: 'ins', text: '  new\n' }, { kind: 'del', text: '  old\n' }, { kind: 'same', text: 'x' }])).toEqual([
      { kind: 'same', text: '  ' },
      { kind: 'ins', text: 'new' },
      { kind: 'del', text: 'old' },
      { kind: 'same', text: '\nx' }
    ]);
    // One side becomes empty: what is left is the honest whitespace change.
    expect(peelSharedSpace([{ kind: 'del', text: '  \n' }, { kind: 'ins', text: '\n' }])).toEqual([
      { kind: 'del', text: '  ' },
      { kind: 'same', text: '\n' }
    ]);
    // Not a pair: nothing moves.
    expect(peelSharedSpace([{ kind: 'del', text: 'a\n' }, { kind: 'same', text: 'b\n' }, { kind: 'ins', text: 'c\n' }])).toEqual([
      { kind: 'del', text: 'a\n' },
      { kind: 'same', text: 'b\n' },
      { kind: 'ins', text: 'c\n' }
    ]);
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
      for (let k = 1; k < doc.runs.length; k++) {
        const p = doc.runs[k - 1];
        const q = doc.runs[k];
        if (p === undefined || q === undefined || p.kind === 'same' || q.kind === 'same') continue;
        const sharesEnd = /\s$/.test(p.text) && /\s$/.test(q.text) && p.text.slice(-1) === q.text.slice(-1);
        const sharesStart = /^\s/.test(p.text) && /^\s/.test(q.text) && p.text.charAt(0) === q.text.charAt(0);
        expect(sharesEnd || sharesStart).toBe(false);
      }
    }
    expect(unaligned).toBe(0);
  });
});
