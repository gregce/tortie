/**
 * PHASE 247 — the span grammar, and refusal 8.
 *
 * The grammar is research 107's detector B ported into the product. These
 * pins are the families research 107 section 3.2 named as the false positives
 * a shape-only detector cannot tell from a path, plus refusal 8 spelled the
 * way research 111 section 4.1 measured it.
 */

import { describe, expect, it } from 'vitest';
import {
  cellColumns,
  edgeRefusal,
  looksLikePath,
  pathSpansInRow,
  spanColumns,
  stripDecoration,
  tokensInRow
} from '../path-spans';
import { couldBeAbsolute } from '../path-doors';

describe('what looks like a path', () => {
  it('accepts an absolute path and a relative one', () => {
    expect(looksLikePath('/Users/gdc/gmux/README.md')).toBe(true);
    expect(looksLikePath('src/main/fs/ipc.ts')).toBe(true);
  });

  it('refuses the families research 107 section 3.2 measured', () => {
    // A URL of some scheme — WebLinksAddon is registered first and owns those.
    expect(looksLikePath('https://example.com/a/b')).toBe(false);
    // A fraction out of a progress meter.
    expect(looksLikePath('171/383')).toBe(false);
    // Markup, which is not a path by the segment grammar.
    expect(looksLikePath('</p>')).toBe(false);
    // A token with no separator at all.
    expect(looksLikePath('README.md')).toBe(false);
  });

  it('accepts the shapes that ARE paths and that the door then judges', () => {
    // A slash command and a git ref look like paths to any shape detector.
    // The grammar says so; `lstat` is what refuses them, which is why the
    // offer condition is existence and not spelling.
    expect(looksLikePath('/login')).toBe(true);
    expect(looksLikePath('origin/main')).toBe(true);
    expect(looksLikePath('America/Chicago')).toBe(true);
  });
});

describe('the decoration a person’s eye strips', () => {
  it('strips a file:// prefix and a :line[:col] suffix, keeping the line', () => {
    expect(stripDecoration('/a/b.ts:42')).toEqual({ target: '/a/b.ts', line: 42 });
    expect(stripDecoration('/a/b.ts:42:7')).toEqual({
      target: '/a/b.ts',
      line: 42
    });
    expect(stripDecoration('file:///a/b.ts')).toEqual({ target: '/a/b.ts' });
  });

  it('leaves a leading ~ alone, because only main has a home directory', () => {
    expect(stripDecoration('~/.claude/CLAUDE.md')).toEqual({
      target: '~/.claude/CLAUDE.md'
    });
  });

  it('strips brackets and sentence punctuation, and moves the column with them', () => {
    const [, span] = tokensInRow('see (/a/b.md).');
    expect(span).toMatchObject({ text: '/a/b.md', start: 5, end: 12 });
  });
});

describe('refusal 8 — a span that touches either end of its row', () => {
  it('refuses a span that ends where the row’s drawn text ends', () => {
    const text = 'wrote /Users/gdc/gmux/src/renderer/terminal/Terminal';
    const [span] = pathSpansInRow(text, null);
    expect(span).toBeUndefined();
  });

  it('offers a span with anything after it', () => {
    const text = 'wrote /a/b.md for you';
    const spans = pathSpansInRow(text, null);
    expect(spans.map((s) => s.target)).toEqual(['/a/b.md']);
  });

  it('refuses a span at the row’s head when the row above ends in a path character', () => {
    const above = 'wrote /Users/gdc/gmux/src/renderer/terminal/Terminal';
    const text = 'Pane.tsx and /a/b.md';
    // The head span is the wrap tail; the one with text after it survives...
    // except that /a/b.md ends this row, so both are refused here.
    expect(pathSpansInRow(text, above)).toEqual([]);
  });

  it('offers a span at the row’s head when the row above does NOT continue', () => {
    const spans = pathSpansInRow('/a/b.md was written', 'all done!');
    expect(spans.map((s) => s.target)).toEqual(['/a/b.md']);
  });

  it('reads past a TUI gutter to find the row’s head', () => {
    const above = 'wrote /Users/gdc/gmux/src/rendere';
    expect(edgeRefusal({ text: '/a', start: 4, end: 6, target: '/a' }, '  │ /a b', above)).toBe(
      true
    );
    // ...and the same span with a row above that cannot have continued is fine.
    expect(edgeRefusal({ text: '/a', start: 4, end: 6, target: '/a' }, '  │ /a b', 'done!')).toBe(
      false
    );
  });
});

describe('a whole row', () => {
  it('offers every candidate and nothing else', () => {
    const text =
      'read /Users/gdc/gmux/README.md and src/main.ts and https://x.dev/a here';
    expect(pathSpansInRow(text, null).map((s) => s.target)).toEqual([
      '/Users/gdc/gmux/README.md',
      'src/main.ts'
    ]);
  });
});

/**
 * THE PHASE 247 FIX ROUND. A row's string indices are not its cell columns,
 * and the map is what stands between an underline and the wrong text.
 */
describe('the column map', () => {
  /**
   * A row given as cells, one per COLUMN, which is how xterm holds one: a wide
   * character is a cell of width 2 followed by a placeholder of width 0, and
   * the line's `length` is the number of columns rather than of characters.
   */
  const line = (cells: [string, number][]) => ({
    length: cells.length,
    getCell: (x: number) => {
      const cell = cells[x];
      return cell === undefined
        ? undefined
        : { getChars: () => cell[0], getWidth: () => cell[1] };
    }
  });

  it('is the identity on an ASCII row', () => {
    const cells = [...'ab/c'].map((c): [string, number] => [c, 1]);
    expect(cellColumns(line(cells))).toEqual([0, 1, 2, 3, 4]);
  });

  it('gives one cell holding two units the same column twice', () => {
    // `⚠️` is U+26A0 U+FE0F in ONE cell of width 1, which is the shape that
    // made the underline sit one cell to the left of an agent's path.
    const cells: [string, number][] = [['⚠️', 1], ['x', 1]];
    expect(cellColumns(line(cells))).toEqual([0, 0, 1, 2]);
  });

  it('skips the column a wide character takes and never lands on its placeholder', () => {
    const cells: [string, number][] = [['你', 2], ['', 0], ['x', 1]];
    expect(cellColumns(line(cells))).toEqual([0, 2, 3]);
  });

  it('counts a null cell as one whitespace character, the way translateToString does', () => {
    const cells: [string, number][] = [['a', 1], ['', 1], ['b', 1]];
    expect(cellColumns(line(cells))).toEqual([0, 1, 2, 3]);
  });

  it('turns a span into xterm’s 1-based inclusive columns', () => {
    const columns = [0, 0, 1, 2, 3, 4];
    expect(spanColumns({ start: 1, end: 4 }, columns)).toEqual({ start: 1, end: 3 });
  });

  it('answers null rather than a wrong range when the map does not reach the span', () => {
    expect(spanColumns({ start: 0, end: 9 }, [0, 1, 2])).toBeNull();
  });
});

describe('what could never be absolute', () => {
  it('refuses a relative spelling and admits both absolute shapes', () => {
    expect(couldBeAbsolute('src/main/fs/ipc.ts')).toBe(false);
    expect(couldBeAbsolute('./a/b.md')).toBe(false);
    expect(couldBeAbsolute('origin/main')).toBe(false);
    expect(couldBeAbsolute('$HOME/a.md')).toBe(false);
    expect(couldBeAbsolute('/etc/hosts')).toBe(true);
    expect(couldBeAbsolute('~/notes.md')).toBe(true);
  });

  it('is WIDER than main’s answer, which is the only safe direction', () => {
    // main expands `~/` and `~` and nothing else, so `~somebody/x` is refused
    // there. Admitting it here costs a round trip; refusing it here would drop
    // a link in silence if main ever learned to expand it.
    expect(couldBeAbsolute('~somebody/notes.md')).toBe(true);
  });
});
