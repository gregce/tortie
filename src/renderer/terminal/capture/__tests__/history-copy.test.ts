/**
 * Phase 209, the copy composed from the history is what xterm's own path
 * would have produced for the same cells.
 *
 * The terminal here is the SHIPPING xterm, unopened, which is exactly what
 * the composer builds in the app, and the expectations are the bytes the
 * in-screen path put on the pasteboard at the parent (a87a826, measured
 * 2026-09-03 in the running app over the same two rows): a wrapped row joined
 * with no newline, and a drag over 日本語 that starts on the second half of a
 * wide character. A composer that joined the pane's rows with newlines, or
 * counted a wide character as one cell, goes red here.
 */

import { describe, expect, it, vi } from 'vitest';
import type { IBufferRange } from '@xterm/xterm';

// xterm's browser bundle touches window at import; nothing else in this
// lane does.
vi.stubGlobal('window', globalThis);
vi.stubGlobal('navigator', { userAgent: 'node', platform: 'MacIntel' });

const {
  bufferRangeFor,
  bufferTerminal,
  composeHistorySelection,
  composeText,
  splitRows
} = await import('../history-copy');

/** The rows as `capture-pane -e -J` prints them, one logical line each. */
const ROWS = [
  'one',
  'ABCDEFGHIJ'.repeat(15),
  '\u001b[31m日本語テキ\u001b[39m abc 😀 end   ',
  'x y   ',
  '',
  'last'
];
const COLS = 40;

describe('splitRows', () => {
  it('drops the one newline capture-pane puts after the last row, and no other', () => {
    expect(splitRows('a\nb\n\nc\n')).toEqual(['a', 'b', '', 'c']);
    expect(splitRows('a\nb')).toEqual(['a', 'b']);
    expect(splitRows('\n')).toEqual(['']);
    expect(splitRows('')).toEqual([]);
  });
});

describe('composeText over an unopened terminal', () => {
  it('re-wraps a joined line at the pane width and joins its rows without a newline', async () => {
    const term = await bufferTerminal(ROWS, COLS);
    const line = term.buffer.active;
    expect(line.getLine(1)?.isWrapped).toBe(false);
    expect(line.getLine(2)?.isWrapped).toBe(true);
    expect(line.getLine(3)?.isWrapped).toBe(true);
    expect(line.getLine(4)?.isWrapped).toBe(true);
    // The parent's in-screen bytes for a drag from column 0 of the first
    // wrapped row to column 4 of the next: 144 cells at the app's width. At
    // this width the same drag reads across one 40 cell row.
    const sel: IBufferRange = { start: { x: 1, y: 1 }, end: { x: 5, y: 2 } };
    expect(composeText(term, sel)).toBe(
      'BCDEFGHIJ' + 'ABCDEFGHIJ'.repeat(3) + 'ABCDE'
    );
    expect(composeText(term, sel)).not.toContain('\n');
    term.dispose();
  });

  it('takes a wide character as two cells and never a leading space', async () => {
    const term = await bufferTerminal(ROWS, COLS);
    // Row 5 is the wide row: 日本語テキ are cells 0..9, the space is 10, a b c
    // are 11 12 13. The drag started on cell 3, the second half of 本, and
    // the controller moved it to 4 the way xterm moves its own start; the
    // end on cell 12 is inclusive, so exclusive 13. The parent copied
    // "語テキ ab" for exactly this drag.
    const sel: IBufferRange = { start: { x: 4, y: 5 }, end: { x: 13, y: 5 } };
    expect(composeText(term, sel)).toBe('語テキ ab');
    // An end on the FIRST half of a wide character takes the whole one.
    expect(
      composeText(term, { start: { x: 0, y: 5 }, end: { x: 3, y: 5 } })
    ).toBe('日本');
    term.dispose();
  });

  it('puts every unwrapped row on a line of its own and keeps the spaces a program wrote', async () => {
    // xterm trims cells nothing was ever written to and keeps a space a
    // program printed, and `capture-pane -J` keeps the same spaces, so the
    // three after "end" survive on both paths. A blank row is a blank line.
    const term = await bufferTerminal(ROWS, COLS);
    const sel: IBufferRange = { start: { x: 1, y: 0 }, end: { x: 2, y: 8 } };
    expect(composeText(term, sel)).toBe(
      [
        'ne',
        'ABCDEFGHIJ'.repeat(15),
        '日本語テキ abc 😀 end   ',
        'x y   ',
        '',
        'la'
      ].join('\n')
    );
    term.dispose();
  });

  it('makes a non breaking space plain, as xterm does', async () => {
    const term = await bufferTerminal(['a\u00a0b'], COLS);
    expect(
      composeText(term, { start: { x: 0, y: 0 }, end: { x: 3, y: 0 } })
    ).toBe('a b');
    term.dispose();
  });
});

describe('bufferRangeFor', () => {
  const range = {
    start: { line: 536, col: 7 },
    end: { line: 577, col: 3 },
    cols: 144
  };

  it('maps history lines to rows of the answer, end exclusive as xterm counts', () => {
    expect(bufferRangeFor(range, 536, 42)).toEqual({
      start: { x: 7, y: 0 },
      end: { x: 4, y: 41 }
    });
  });

  it('starts at the first cell when the start line is gone', () => {
    // Main clamped the start to the oldest line, 540, so the first four
    // lines and the start column are no longer anybody's.
    expect(bufferRangeFor(range, 540, 38)).toEqual({
      start: { x: 0, y: 0 },
      end: { x: 4, y: 37 }
    });
  });

  it('ends at the last cell of the last row when the end is past the answer', () => {
    expect(bufferRangeFor(range, 536, 30)).toEqual({
      start: { x: 7, y: 0 },
      end: { x: 144, y: 29 }
    });
  });

  it('never lets a column past the width through', () => {
    expect(
      bufferRangeFor({ ...range, end: { line: 577, col: 200 } }, 536, 42).end
    ).toEqual({ x: 144, y: 41 });
  });
});

describe('composeHistorySelection', () => {
  it('asks main for the joined rows between the two lines and composes both flavours', async () => {
    const calls: unknown[] = [];
    const bridge = {
      pane: async (input: unknown) => {
        calls.push(input);
        return { ansi: `${ROWS.join('\n')}\n`, firstLine: 100 };
      }
    } as never;
    const range = {
      start: { line: 101, col: 1 },
      end: { line: 105, col: 12 },
      cols: COLS
    };
    const plain = await composeHistorySelection(bridge, 'gmux-1', range, null);
    expect(calls).toEqual([
      {
        tmuxName: 'gmux-1',
        historyLines: 0,
        range: { start: 101, end: 105 },
        join: true
      }
    ]);
    // Line 101 is 150 cells and wraps into rows 1 to 4 at this width, in
    // the answer exactly as on the pane, so line 105 is row 5, the wide row,
    // taken from its first cell because it is the last row of the range.
    expect(plain.text).toBe(
      'BCDEFGHIJ' + 'ABCDEFGHIJ'.repeat(14) + '\n' + '日本語テキ ab'
    );
    expect(plain.html).toBe('');
    const rich = await composeHistorySelection(bridge, 'gmux-1', range, {
      theme: { foreground: '#ffffff', background: '#000000' },
      fontFamily: 'Menlo',
      fontSizePx: 13
    });
    expect(rich.text).toBe(plain.text);
    expect(rich.html).toContain('語テキ');
    expect(rich.html).toContain('<div');
  });

  it('answers nothing for a range the server no longer holds', async () => {
    const bridge = {
      pane: async () => ({ ansi: '', firstLine: 0 })
    } as never;
    const out = await composeHistorySelection(
      bridge,
      'gmux-1',
      { start: { line: 0, col: 0 }, end: { line: 3, col: 0 }, cols: COLS },
      null
    );
    expect(out).toEqual({ text: '', html: '' });
  });
});
