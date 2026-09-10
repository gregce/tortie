/**
 * PHASE 247 — the span grammar, and refusal 8.
 *
 * The grammar is research 107's detector B ported into the product. These
 * pins are the families research 107 section 3.2 named as the false positives
 * a shape-only detector cannot tell from a path, plus refusal 8 — which
 * PHASE 250 narrowed from "the span ends its row" to "the span runs off the
 * pane's last column", after the operator found an absolute, existing README
 * printed on a line of its own and not clickable.
 */

import { describe, expect, it } from 'vitest';
import type { RowEdges } from '../path-spans';
import {
  bareFileShaped,
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
    // A bare WORD — no separator and no extension — stays refused. PHASE 253
    // admits a bare FILENAME (`README.md`), which has its own block below.
    expect(looksLikePath('nothing')).toBe(false);
    expect(looksLikePath('1.2.3')).toBe(false);
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
    expect(stripDecoration('/a/b.ts:42')).toEqual({
      target: '/a/b.ts',
      line: 42,
      visible: 10
    });
    expect(stripDecoration('/a/b.ts:42:7')).toEqual({
      target: '/a/b.ts',
      line: 42,
      visible: 12
    });
    expect(stripDecoration('file:///a/b.ts')).toEqual({
      target: '/a/b.ts',
      visible: 14
    });
  });

  it('leaves a leading ~ alone, because only main has a home directory', () => {
    expect(stripDecoration('~/.claude/CLAUDE.md')).toEqual({
      target: '~/.claude/CLAUDE.md',
      visible: 19
    });
  });

  it('strips brackets and sentence punctuation, and moves the column with them', () => {
    const [, span] = tokensInRow('see (/a/b.md).');
    expect(span).toMatchObject({ text: '/a/b.md', start: 5, end: 12 });
  });
});

/**
 * PHASE 253 — the suffix spellings VS Code taught us, narrowed to the
 * delimited clauses (research 115 §7.1), the bracketed segment (§7.2), and
 * the bare filename resolved by lift two's own join (§7.3). Ported and
 * narrowed from microsoft/vscode 770a9bced0e6eff10342b2d95d7cfd98c33b85ed
 * terminalLinkParsing.ts; the exhaustive ported rows live in
 * `build/p247/path-door-probe.mts` under `conformance:pathdoors` rule 16.
 */
describe('the suffixes VS Code taught us (Phase 253)', () => {
  it('reads a grep suffix with the match text attached, and the line survives', () => {
    expect(stripDecoration('src/x.mdx:12:the match text')).toEqual({
      target: 'src/x.mdx',
      line: 12,
      visible: 12
    });
  });

  it('reads a line range as its first line', () => {
    expect(stripDecoration('src/x.go:12-14')).toEqual({
      target: 'src/x.go',
      line: 12,
      visible: 14
    });
  });

  it('reads the tsc and bracket families', () => {
    expect(stripDecoration('src/x.ts(12,34)')).toEqual({
      target: 'src/x.ts',
      line: 12,
      visible: 15
    });
    expect(stripDecoration('src/x.ts[12]')).toEqual({
      target: 'src/x.ts',
      line: 12,
      visible: 12
    });
  });

  it('never reads a numeric git-diff prefix as a suffix (upstream’s 1/ rule)', () => {
    expect(stripDecoration('1/foo')).toEqual({ target: '1/foo', visible: 5 });
  });

  it('never reads a timestamp as a path with a line', () => {
    expect(stripDecoration('14:23:07')).toEqual({
      target: '14:23:07',
      visible: 8
    });
    expect(looksLikePath('14:23:07')).toBe(false);
  });

  it('keeps a trailing closer an opener inside the token matches', () => {
    const row = 'src/x.ts(9,2): error TS2304';
    expect(tokensInRow(row)[0]?.text).toBe('src/x.ts(9,2)');
    // ...while a wrapping pair is still shed, because OPEN took the `(` first.
    expect(tokensInRow('(docs/x.md)')[0]?.text).toBe('docs/x.md');
  });

  it('admits [ and ] in a segment, kept when the bracket pair is the path’s own', () => {
    expect(looksLikePath('/foo/[bar].baz')).toBe(true);
    expect(tokensInRow('read /foo/[bar] now')[1]?.text).toBe('/foo/[bar]');
  });

  it('trims the underline to the drawn suffix and never to the grep remainder', () => {
    const row = 'see /a/b.ts:12:match here';
    const edges = {
      width: 120,
      columns: [...row].map((_, i) => i).concat([row.length]),
      above: null,
      aboveEnd: 0
    };
    expect(pathSpansInRow(row, edges)).toEqual([
      { text: '/a/b.ts:12', start: 4, end: 14, target: '/a/b.ts', line: 12 }
    ]);
  });

  it('admits a bare FILE-SHAPED name and refuses a word, a version and a dotfile', () => {
    expect(looksLikePath('README.md')).toBe(true);
    expect(looksLikePath('Makefile')).toBe(true);
    expect(stripDecoration('README.md:12')).toEqual({
      target: 'README.md',
      line: 12,
      visible: 12
    });
    expect(bareFileShaped('funnel.mts')).toBe(true);
    expect(bareFileShaped('nothing')).toBe(false);
    expect(bareFileShaped('v0.102.0')).toBe(false);
    expect(bareFileShaped('.env')).toBe(false);
    // Domain-shaped tokens pass the shape test on purpose: measured at 92
    // occurrences and 0 project files, the join's lstat is the filter.
    expect(bareFileShaped('github.com')).toBe(true);
  });
});

/**
 * PHASE 250 narrowed refusal 8 to the shape a wrap can actually take, so every
 * pin below is about a COLUMN rather than about a row's last glyph.
 *
 * `edges` builds the two things a real pane hands the grammar. Every row here
 * is pure ASCII, where a string index and a cell column are the same number —
 * which is what makes the identity map honest rather than a shortcut; the
 * non-ASCII half is `cellColumns`'s own describe block below.
 */
const edges = (
  width: number,
  row: string,
  above: string | null = null
): RowEdges => ({
  width,
  columns: [...row].map((_, i) => i).concat([row.length]),
  above,
  aboveEnd: above === null ? 0 : above.length
});

describe('refusal 8 — a span that RUNS OFF the edge of its row', () => {
  /**
   * THE LIFT ITSELF, and it is the operator's own first screenshot: an
   * absolute, existing path printed at the end of an ordinary sentence, in a
   * pane far wider than the row.
   */
  it('offers a span that merely ENDS its row, far short of the pane’s width', () => {
    const text = 'wrote /a/b.md';
    expect(pathSpansInRow(text, edges(80, text)).map((s) => s.target)).toEqual([
      '/a/b.md'
    ]);
  });

  it('refuses the same span when its last cell IS the pane’s last column', () => {
    const text = 'wrote /a/b.md';
    expect(pathSpansInRow(text, edges(text.length, text))).toEqual([]);
  });

  it('refuses a span that runs PAST the width, which a resize can make true', () => {
    const text = 'wrote /a/b.md';
    expect(pathSpansInRow(text, edges(text.length - 3, text))).toEqual([]);
  });

  it('offers a span with anything after it', () => {
    const text = 'wrote /a/b.md for you';
    expect(pathSpansInRow(text, edges(80, text)).map((s) => s.target)).toEqual([
      '/a/b.md'
    ]);
  });

  it('refuses the HEAD span below a predecessor that filled its own last column', () => {
    const above = 'wrote /Users/gdc/gmux/src/renderer/terminal/Term';
    const text = '/inal.tsx and /a/b.md there';
    // The head span is the wrap tail and is refused; the one with text either
    // side of it is not, because only the head can have been carried over.
    expect(
      pathSpansInRow(text, edges(above.length, text, above)).map((s) => s.target)
    ).toEqual(['/a/b.md']);
  });

  it('offers the same head span when the predecessor stopped SHORT of the width', () => {
    const above = 'wrote /Users/gdc/gmux/src/renderer/terminal/Term';
    const text = '/inal.tsx and /a/b.md there';
    expect(
      pathSpansInRow(text, edges(above.length + 20, text, above)).map(
        (s) => s.target
      )
    ).toEqual(['/inal.tsx', '/a/b.md']);
  });

  /**
   * THE PADDING, which is why this is not research 111 section 4.1's spelling.
   * A predecessor whose DRAWN text stops short of the width did not wrap, even
   * though its buffer row runs out to the width in spaces.
   */
  it('does not read a padded predecessor as a wrap', () => {
    const above = 'wrote /a';
    const text = '/b.md and more text';
    // 80 columns wide, the row above padded out to all 80 with spaces, its
    // drawn text stopping at column 8.
    expect(
      pathSpansInRow(text, {
        width: 80,
        columns: [...text].map((_, i) => i).concat([text.length]),
        above,
        aboveEnd: above.length
      }).map((s) => s.target)
    ).toEqual(['/b.md']);
  });

  it('offers a span at the row’s head when the row above does NOT continue', () => {
    const above = 'all done!';
    const text = '/a/b.md was written';
    expect(pathSpansInRow(text, edges(above.length, text, above)).map((s) => s.target)).toEqual(
      ['/a/b.md']
    );
  });

  it('reads past a TUI gutter to find the row’s head', () => {
    const above = 'wrote /Users/gdc/gmux/src/rendere';
    const row = '  │ /a b';
    expect(
      edgeRefusal(
        { text: '/a', start: 4, end: 6, target: '/a' },
        row,
        edges(above.length, row, above)
      )
    ).toBe(true);
    // ...and the same span with a row above that cannot have continued is fine.
    expect(
      edgeRefusal(
        { text: '/a', start: 4, end: 6, target: '/a' },
        row,
        edges(above.length, row, 'done!')
      )
    ).toBe(false);
  });

  /** A map that does not cover the span cannot say where the span ends. */
  it('refuses a span whose end column the map does not reach', () => {
    const row = 'wrote /a/b.md here';
    expect(
      edgeRefusal({ text: '/a/b.md', start: 6, end: 13, target: '/a/b.md' }, row, {
        width: 80,
        columns: [0, 1, 2],
        above: null,
        aboveEnd: 0
      })
    ).toBe(true);
  });

  /**
   * THE OTHER UNKNOWN, AND BOTH HALVES NOW FALL THE SAME WAY (the fix round).
   *
   * The head clause reads the PREDECESSOR's own drawn end column out of that
   * row's map, and the call site used to hand a missing one over as 0 — which
   * is smaller than every width, so a row nothing could be read from was
   * treated as one that stopped short and the span was offered, while the
   * clause above refused on the same kind of unknown. Removing the null
   * refusal does not skip the comparison either: `null < 80` is `0 < 80` in
   * JavaScript, so the arithmetic itself falls open.
   */
  it('refuses a span at the head of a row whose predecessor’s end cannot be read', () => {
    const row = '/b.md and more text';
    const span = { text: '/b.md', start: 0, end: 5, target: '/b.md' };
    const columns = [...row].map((_, i) => i).concat([row.length]);
    expect(
      edgeRefusal(span, row, { width: 80, columns, above: 'wrote /a', aboveEnd: null })
    ).toBe(true);
    // ...and the control, which is the same predecessor with an end column
    // that CAN be read and stops short, so a rule refusing everything would
    // not read as a pass here.
    expect(
      edgeRefusal(span, row, { width: 80, columns, above: 'wrote /a', aboveEnd: 8 })
    ).toBe(false);
  });
});

describe('a whole row', () => {
  it('offers every candidate and nothing else', () => {
    const text =
      'read /Users/gdc/gmux/README.md and src/main.ts and https://x.dev/a here';
    expect(pathSpansInRow(text, edges(120, text)).map((s) => s.target)).toEqual([
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
