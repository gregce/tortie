/**
 * PHASE 347.1 — the governing rule's facts, pure (build/p3471/SPEC.md D2,
 * §4.1, §5.1, U1 to U4).
 *
 * `rowSpansAt` must be what the provider draws on a row TODAY, or "a join
 * never takes a cell from a row span the door accepts" judges the wrong
 * spans. So U1 drives it against `PathLinkProvider.provideLinks`' own
 * derivation, written out here from that method's text over fake xterm lines
 * (cells, `translateToString(true)` and the SHIPPING `cellColumns`), on every
 * row of a table that holds every edge refusal 8 reads. `spansUnderJoin` is
 * then the cell test over those spans on every row a join covers (U2), and a
 * row it cannot read refuses the join (U3). U4 is the cell test from its new
 * home, with one declaration under `src/`. U5 is J9, the fix round's (the
 * app lens's narrowed pane) as his ruled round made it: a join is refused
 * WHOLE when a boundary it crosses or stops at reads a cell past the pane's
 * width, never cut there into a shorter join that opens another file.
 *
 * Every assertion that something equals something is paired with a reading
 * that shows the comparison can fail, so a clause taken out of the source
 * reads red here rather than passing quietly.
 */

import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DrawnRow, JoinedSpan, PathSpan, RowCells } from '../path-spans';
import {
  cellColumns,
  joinedPathAt,
  looksLikePath,
  pathSpansInRow,
  rowSpansAt,
  sharesCellWithJoin,
  spansUnderJoin
} from '../path-spans';
import { relPath, SRC, sourceFiles, stripComments } from './source-scan';

/** A fake `IBufferLine`: cells as xterm draws them, padded with spaces to `padTo`. */
interface FakeLine extends RowCells {
  translateToString(trimRight?: boolean): string;
}

/**
 * Cells the way xterm draws them: one per code point, a variation selector or
 * a combining mark JOINING the cell before it (so `⚠️` is one cell holding two
 * UTF-16 units), width 2 in the wide ranges, and `cellsAnswered` cells
 * answered by `getCell` before it stops (the map a row cannot finish).
 */
function fakeLine(text: string, opts: { padTo?: number; cellsAnswered?: number } = {}): FakeLine {
  const cells: { chars: string; width: number }[] = [];
  for (const chars of text) {
    const cp = chars.codePointAt(0) ?? 0;
    const joins =
      (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x0300 && cp <= 0x036f) || cp === 0x200d;
    const last = cells[cells.length - 1];
    if (joins && last !== undefined) {
      last.chars += chars;
      continue;
    }
    const wide = (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3);
    cells.push({ chars, width: wide ? 2 : 1 });
  }
  const at: { chars: string; width: number }[] = [];
  for (const cell of cells) {
    at.push(cell);
    for (let i = 1; i < cell.width; i += 1) at.push({ chars: '', width: 0 });
  }
  while (opts.padTo !== undefined && at.length < opts.padTo) at.push({ chars: ' ', width: 1 });
  const answered = opts.cellsAnswered ?? at.length;
  return {
    length: at.length,
    getCell: (x) => {
      const cell = x < answered ? at[x] : undefined;
      return cell === undefined
        ? undefined
        : { getChars: () => cell.chars, getWidth: () => cell.width };
    },
    translateToString: (trimRight) => {
      const whole = at.map((c) => (c.width === 0 ? '' : c.chars)).join('');
      return trimRight === true ? whole.replace(/\s+$/, '') : whole;
    }
  };
}

/** The reader the provider hands `joinedPathAt` and `spansUnderJoin`. */
function readerOf(lines: FakeLine[]): (i: number) => DrawnRow | null {
  return (i) => {
    const line = lines[i];
    return line === undefined
      ? null
      : { text: line.translateToString(true), columns: cellColumns(line) };
  };
}

/**
 * `provideLinks`' own derivation of a hovered row's spans, written from that
 * method's text: the row as drawn, its own map, `Terminal.cols`, the row
 * above as drawn, and its own end column, 0 with no row above and null when
 * its map cannot answer.
 */
function providerSpans(lines: FakeLine[], y: number, width: number): PathSpan[] {
  const line = lines[y];
  if (line === undefined) return [];
  const row = line.translateToString(true);
  const columns = cellColumns(line);
  const lineAbove = y > 0 ? lines[y - 1] : undefined;
  const above = lineAbove?.translateToString(true) ?? null;
  return pathSpansInRow(row, {
    width,
    columns,
    above,
    aboveEnd:
      lineAbove === undefined || above === null
        ? 0
        : (cellColumns(lineAbove)[above.length] ?? null)
  });
}

/** The same with no row above, which is the reading U1 must tell apart. */
function spansWithoutAbove(lines: FakeLine[], y: number, width: number): PathSpan[] {
  const line = lines[y];
  if (line === undefined) return [];
  return pathSpansInRow(line.translateToString(true), {
    width,
    columns: cellColumns(line),
    above: null,
    aboveEnd: 0
  });
}

// Issue 40's own rows (gh issue view 40): 45, 42 and 30 columns.
const PATH =
  '/Users/johnberryman/projects/github/arcturus-labs/rook/.agents/skills/software-factory/.planning/brainstorming.md:134';
const FILE = PATH.replace(/:134$/, '');
const TOP = '/Users/johnberryman/projects/github/arcturus-';
const MIDDLE = 'labs/rook/.agents/skills/software-factory/';
const BOTTOM = '.planning/brainstorming.md:134';
const ISSUE = ['The plan is written down at', TOP, MIDDLE, BOTTOM, '', '> '];

interface Table {
  name: string;
  lines: FakeLine[];
  width: number;
}

const TABLE: Table[] = [
  ...[45, 46, 47, 48, 49, 50, 51, 52].map(
    (width): Table => ({ name: `issue 40 at ${String(width)}`, lines: ISSUE.map((r) => fakeLine(r)), width })
  ),
  {
    name: 'a row ending on the last column',
    lines: ['x', 'see /Users/me/proj/c.md', 'y'].map((r) => fakeLine(r)),
    width: 23
  },
  {
    name: 'a row-head span below a full row ending on a path character (refusal 8 head clause)',
    lines: ['/Users/me/proj/aaaa', 'bbb.md and more', ''].map((r) => fakeLine(r)),
    width: 19
  },
  {
    name: 'a padded predecessor, whose drawn end is short of the width',
    lines: [fakeLine('/Users/me/proj', { padTo: 19 }), fakeLine('bbb.md and more'), fakeLine('')],
    width: 19
  },
  {
    name: 'a ⚠️-decorated row, whose string index is not its column',
    lines: ['x', '⚠️ see /Users/me/proj/wide.md now', '├ 中文 /Users/me/proj/b.md'].map((r) =>
      fakeLine(r)
    ),
    width: 40
  },
  {
    name: 'row 0',
    lines: ['/Users/me/proj/first.md is here', 'second'].map((r) => fakeLine(r)),
    width: 40
  },
  {
    name: 'a predecessor whose map stops short (aboveEnd null)',
    lines: [fakeLine('/Users/me/proj/aaaa', { cellsAnswered: 10 }), fakeLine('bbb.md and more')],
    width: 40
  }
];

describe('U1 rowSpansAt is the provider’s own derivation of a hovered row', () => {
  for (const t of TABLE) {
    it(`agrees on every row: ${t.name}`, () => {
      const rows = readerOf(t.lines);
      for (let y = 0; y < t.lines.length; y += 1) {
        expect(rowSpansAt(rows, y, t.width), `row ${String(y)}`).toEqual(
          providerSpans(t.lines, y, t.width)
        );
      }
    });
  }

  it('is not vacuous: the table draws spans, and a decorated row’s columns are not its indices', () => {
    let spans = 0;
    for (const t of TABLE) {
      for (let y = 0; y < t.lines.length; y += 1) spans += rowSpansAt(readerOf(t.lines), y, t.width).length;
    }
    expect(spans).toBeGreaterThanOrEqual(20);
    const decorated = TABLE.find((t) => t.name.startsWith('a ⚠️'));
    if (decorated === undefined) throw new Error('the table lost its decorated row');
    const rows = readerOf(decorated.lines);
    const [wide] = rowSpansAt(rows, 1, decorated.width);
    expect(wide?.target).toBe('/Users/me/proj/wide.md');
    const columns = rows(1)?.columns ?? [];
    expect(columns[wide?.start ?? 0]).toBe((wide?.start ?? 0) - 1);
    const [cjk] = rowSpansAt(rows, 2, decorated.width);
    expect(cjk?.target).toBe('/Users/me/proj/b.md');
    expect(rows(2)?.columns[cjk?.start ?? 0]).toBe((cjk?.start ?? 0) + 2);
  });

  it('reads no row above row 0, even from a reader that answers one', () => {
    // xterm's `CircularList.get` does no bounds check: once the scrollback
    // ring has wrapped, `getLine(-1)` answers a REAL row (the slot before
    // the ring's start), so a full row ending on a path character would
    // refuse row 0's head span by refusal 8. The provider passes 0 for row 0.
    const lines = ['bbb.md and more', 'x'].map((r) => fakeLine(r));
    const ring = fakeLine('/Users/me/proj/aaaaaaaaaaaaaaaaaaaaaaaaa');
    const rows = (i: number): DrawnRow | null =>
      i === -1 ? { text: ring.translateToString(true), columns: cellColumns(ring) } : readerOf(lines)(i);
    expect(rowSpansAt(rows, 0, 40).map((s) => s.target)).toEqual(['bbb.md']);
    expect(rowSpansAt(rows, 0, 40)).toEqual(providerSpans(lines, 0, 40));
  });

  it('answers nothing for a row the reader cannot read', () => {
    expect(rowSpansAt(readerOf([fakeLine('/a/b.md')]), 3, 40)).toEqual([]);
  });

  it('really reads the row above: the same table with `above` dropped reads differently', () => {
    const differ: string[] = [];
    for (const t of TABLE) {
      for (let y = 0; y < t.lines.length; y += 1) {
        const got = rowSpansAt(readerOf(t.lines), y, t.width);
        if (JSON.stringify(got) !== JSON.stringify(spansWithoutAbove(t.lines, y, t.width))) {
          differ.push(`${t.name} row ${String(y)}`);
        }
      }
    }
    // Refusal 8's head clause (issue 40 at 45, the full predecessor) and the
    // unreadable predecessor are the rows the predecessor decides.
    expect(differ).toContain('issue 40 at 45 row 2');
    expect(differ).toContain(
      'a row-head span below a full row ending on a path character (refusal 8 head clause) row 1'
    );
    expect(differ).toContain('a predecessor whose map stops short (aboveEnd null) row 1');
    expect(differ).not.toContain('a padded predecessor, whose drawn end is short of the width row 1');
  });

  it('really reads the width: the last column refuses, one column wider offers', () => {
    const lines = ['x', 'see /Users/me/proj/c.md', 'y'].map((r) => fakeLine(r));
    expect(rowSpansAt(readerOf(lines), 1, 23)).toEqual([]);
    expect(rowSpansAt(readerOf(lines), 1, 24).map((s) => s.target)).toEqual(['/Users/me/proj/c.md']);
  });
});

/** Issue 40's rows with a second path beside the bottom piece. */
const BESIDE = ['The plan is written down at', TOP, MIDDLE, `${BOTTOM} and /a/other.md`, '', '> '];

function candidate(lines: FakeLine[], y: number, width: number): JoinedSpan {
  const join = joinedPathAt(readerOf(lines), y, lines.length - 1, width);
  if (join === null) throw new Error('the fixture must join');
  return join;
}

describe('U2 spansUnderJoin answers the spans the join covers, and nothing beside it', () => {
  it('returns the three pieces of issue 40 and never /a/other.md', () => {
    const lines = BESIDE.map((r) => fakeLine(r));
    const join = candidate(lines, 2, 47);
    expect(join).toMatchObject({ target: FILE, top: 1, bottom: 3, startColumn: 0, endColumn: 30 });
    const under = spansUnderJoin(readerOf(lines), join, 47);
    expect(under).toEqual([
      { row: 1, target: TOP, range: { start: 1, end: 45 } },
      { row: 2, target: MIDDLE, range: { start: 1, end: 42 } },
      { row: 3, target: '.planning/brainstorming.md', range: { start: 1, end: 30 } }
    ]);
    expect(under?.map((u) => u.target)).not.toContain('/a/other.md');
    // ...which IS a span of that row, so the cell test, not the grammar, left it out.
    expect(rowSpansAt(readerOf(lines), 3, 47).map((s) => s.target)).toContain('/a/other.md');
  });

  it('judges each row as the provider does: at 45 the top and middle pieces drew nothing today', () => {
    // BESIDE's bottom row is 46 cells, which no 45-column pane draws, and J9
    // (his ruled round) refuses a chain whose bottom row reads past the
    // width; the second path plays no part here, so it is shortened to fit.
    const lines = BESIDE.map((r) => fakeLine(r.replace(' and /a/other.md', ' and /a/o.md')));
    expect(lines[3]?.translateToString(true).length).toBe(42);
    const under = spansUnderJoin(readerOf(lines), candidate(lines, 2, 45), 45);
    // The top piece ends on the last column, and the middle starts a row below
    // a full row ending on `-`: refusal 8 takes both, so neither is a link
    // today and neither can be taken from.
    expect(under?.map((u) => u.row)).toEqual([3]);
  });

  it('cells after the top piece and a continuation row’s gutter are inside the join and hold no span', () => {
    const rows = ['The plan is written down at', `│ ${TOP}`, `│ ${MIDDLE}`, `│ ${BOTTOM}`, '', '> '];
    const lines = rows.map((r) => fakeLine(r));
    const join = candidate(lines, 2, 49);
    expect(join).toMatchObject({ target: FILE, top: 1, bottom: 3, startColumn: 2, endColumn: 32 });
    const under = spansUnderJoin(readerOf(lines), join, 49) ?? [];
    // Cells 48 and 49 on the top row follow its piece; the gutter is cells 1
    // and 2 of the rows below. All of them are inside the join's range...
    expect(sharesCellWithJoin({ start: 48, end: 49 }, 1, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 1, end: 2 }, 3, join)).toBe(true);
    // ...and none of them holds a span the rule would ask about.
    const touches = (row: number, from: number, to: number): boolean =>
      under.some((u) => u.row === row && u.range.start <= to && u.range.end >= from);
    expect(touches(1, 48, 49)).toBe(false);
    expect(touches(2, 1, 2)).toBe(false);
    expect(touches(3, 1, 2)).toBe(false);
    expect(under.map((u) => u.range)).toEqual([
      { start: 3, end: 47 },
      { start: 3, end: 44 },
      { start: 3, end: 32 }
    ]);
  });

  it('answers every span that shares a cell, not only the first on a row', () => {
    // A row strictly inside a join holds one token; the TOP row may hold
    // words before its piece, and those words are outside the join.
    const rows = ['x', 'see /a/b.md and /Users/me/proj/aaa-', 'bbb.md', '', '> '];
    const lines = rows.map((r) => fakeLine(r));
    const join = candidate(lines, 1, 35);
    expect(join.target).toBe('/Users/me/proj/aaa-bbb.md');
    const under = spansUnderJoin(readerOf(lines), join, 35) ?? [];
    expect(under.map((u) => u.target)).not.toContain('/a/b.md');
    expect(rowSpansAt(readerOf(lines), 1, 35).map((s) => s.target)).toContain('/a/b.md');
  });
});

describe('U3 a row the join covers that cannot be read refuses it', () => {
  /** Answers every row, but `flaky` only `times` times. */
  function onceReader(lines: FakeLine[], flaky: number, times: number): (i: number) => DrawnRow | null {
    const all = readerOf(lines);
    let reads = 0;
    return (i) => {
      if (i === flaky) {
        reads += 1;
        if (reads > times) return null;
      }
      return all(i);
    };
  }

  for (const flaky of [1, 2, 3]) {
    it(`answers null when row ${String(flaky)} reads null on its second read`, () => {
      const lines = ISSUE.map((r) => fakeLine(r));
      const rows = onceReader(lines, flaky, 1);
      const join = joinedPathAt(rows, 2, lines.length - 1, 47);
      expect(join?.target).toBe(FILE);
      if (join === null) return;
      expect(spansUnderJoin(rows, join, 47)).toBeNull();
    });
  }

  it('answers the spans when the same rows keep answering (the control)', () => {
    const lines = ISSUE.map((r) => fakeLine(r));
    const rows = onceReader(lines, 2, Number.POSITIVE_INFINITY);
    const join = joinedPathAt(rows, 2, lines.length - 1, 47);
    expect(join).not.toBeNull();
    if (join === null) return;
    expect(spansUnderJoin(rows, join, 47)).toHaveLength(3);
  });

  it('a row OUTSIDE the join that cannot be read does not refuse it (only R(J) is read)', () => {
    const lines = ISSUE.map((r) => fakeLine(r));
    const rows = onceReader(lines, 4, 1);
    const join = joinedPathAt(rows, 2, lines.length - 1, 47);
    expect(join).not.toBeNull();
    if (join === null) return;
    expect(spansUnderJoin(rows, join, 47)).toHaveLength(3);
  });
});

describe('U4 the cell test, from its new home', () => {
  const join = { top: 1, bottom: 3, startColumn: 4, endColumn: 10 };
  it('covers the top row from the first cell, the middle whole and the bottom to the last cell', () => {
    expect(sharesCellWithJoin({ start: 1, end: 4 }, 1, join)).toBe(false);
    expect(sharesCellWithJoin({ start: 5, end: 9 }, 1, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 1, end: 200 }, 2, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 1, end: 10 }, 3, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 11, end: 20 }, 3, join)).toBe(false);
    expect(sharesCellWithJoin({ start: 1, end: 9 }, 0, join)).toBe(false);
    expect(sharesCellWithJoin({ start: 1, end: 9 }, 4, join)).toBe(false);
  });

  it('is declared once under src/, in src/shared/path-spans.ts, and never in path-links.ts', () => {
    const declaration = (): RegExp => /\bfunction\s+sharesCellWithJoin\s*\(/g;
    const where: string[] = [];
    // A dot directory is a gate's staged copy (conformance:pathdoors rule 9
    // stages `src/main/fs/.p247-ablation-*` while it runs), never the tree.
    const files = sourceFiles(SRC).filter((f) => !relPath(f).split('/').some((seg) => seg.startsWith('.')));
    for (const file of files) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const _ of code.matchAll(declaration())) where.push(relPath(file));
    }
    expect(where).toEqual(['shared/path-spans.ts']);
    const links = stripComments(
      readFileSync(joinPath(SRC, 'renderer/terminal/path-links.ts'), 'utf8')
    );
    expect(declaration().test(links)).toBe(false);
    expect(links).toMatch(/import \{[^}]*\bsharesCellWithJoin\b[^}]*\} from '@shared\/path-spans'/);
    // The scan can see a declaration when there is one (spelled in two parts
    // here, so this file is not itself a declaration to any scan of src/).
    expect(['export function', 'sharesCellWithJoin('].join(' ')).toMatch(declaration());
  });
});

describe('U5 J9: a join that reads a cell past the pane’s width is refused whole', () => {
  // A 47-column repaint's row ending on `src/deep/` (12 + 25 + 10 cells), and
  // the same row as a 49-column pane left it on xterm's alternate buffer,
  // which keeps the cells past a narrowed edge: its stale `de` in columns 48
  // and 49, still answered by `translateToString(true)`. The app lens pressed
  // the join and opened src/deep/defolder/one.ts, a name the screen does not
  // show, where the parent opened nothing.
  //
  // His absolute-only round (build/p3471/SPEC.md §5.4): those rows are
  // RELATIVE, so J10 now refuses every one of them whatever J9 says, and each
  // is asserted to join from no row. The control each carried moves to an
  // ABSOLUTE twin under `/p/`, one `z` longer so every cell sits where it sat,
  // and the twin is what J9 alone decides.
  const fresh = `Please open ${'z'.repeat(25)} src/deep/`;
  const stale = `${fresh}de`;
  const freshAbs = `Please open ${'z'.repeat(26)} /p/deep/`;
  const staleAbs = `${freshAbs}de`;
  const below = 'folder/one.ts:5 now open it';
  const fill = `folder/${'k'.repeat(37)}.md`;
  const at = (rows: string[], y: number, width: number): JoinedSpan | null => {
    const lines = rows.map((r) => fakeLine(r));
    return joinedPathAt(readerOf(lines), y, lines.length - 1, width);
  };
  /** No join from any row of `rows`. */
  const none = (rows: string[], width: number): void => {
    for (let y = 0; y < rows.length; y += 1) expect(at(rows, y, width), `row ${String(y)}`).toBeNull();
  };

  it('the rows are what the fixture says: 47 cells drawn, 49 read', () => {
    expect([fresh.length, stale.length, freshAbs.length, staleAbs.length, fill.length]).toEqual([
      47, 49, 47, 49, 47
    ]);
  });

  it('refuses an upper piece past the width, from either row', () => {
    const rows = ['x', staleAbs, below, 'y'];
    expect(at(rows, 1, 47)).toBeNull();
    expect(at(rows, 2, 47)).toBeNull();
    // ...the same rows as a 47-column repaint draws them join...
    expect(at(['x', freshAbs, below, 'y'], 2, 47)).toMatchObject({
      target: '/p/deep/folder/one.ts',
      line: 5,
      top: 1,
      startColumn: 39,
      bottom: 2,
      endColumn: 15
    });
    // ...and so does the stale row at the 49 columns it was drawn at, so the
    // width is what refuses it, not the text.
    expect(at(rows, 2, 49)?.target).toBe('/p/deep/defolder/one.ts');
    // The relative rows, stale or drawn fresh, at either width: J10, from no row.
    for (const width of [47, 49]) {
      none(['x', stale, below, 'y'], width);
      none(['x', fresh, below, 'y'], width);
    }
  });

  it('lens B’s own G-stale-midwrap: the stale row is the buffer’s first, and no row joins', () => {
    const lower = 'folder/one.ts:5 now and check the import.';
    for (const y of [0, 1]) expect(at([staleAbs, lower, 'P3471>'], y, 47), `row ${String(y)}`).toBeNull();
    // The same rows as a 47-column repaint draws them (G-clean-midwrap) join from either row.
    for (const y of [0, 1]) {
      expect(at([freshAbs, lower, 'P3471>'], y, 47)).toMatchObject({
        target: '/p/deep/folder/one.ts',
        line: 5,
        top: 0,
        startColumn: 39,
        bottom: 1,
        endColumn: 15
      });
    }
    // Lens B's own rows are relative: stale or clean, no row joins (J10).
    none([stale, lower, 'P3471>'], 47);
    none([fresh, lower, 'P3471>'], 47);
  });

  it('refuses a lower piece that runs into the stale cells, beside its control', () => {
    for (const y of [1, 2]) expect(at(['x', freshAbs, `${fill}de`, '', 'y'], y, 47), `row ${String(y)}`).toBeNull();
    expect(at(['x', freshAbs, fill, '', 'y'], 1, 47)?.target).toBe(`/p/deep/${fill}`);
    none(['x', fresh, `${fill}de`, '', 'y'], 47);
    none(['x', fresh, fill, '', 'y'], 47);
  });

  it('refuses a join whose bottom row reads past the width, even AFTER its piece (his ruled round)', () => {
    // The fix round kept this join, because the joined name never reads the
    // cells after the piece. His ruled round refuses it: a token left past
    // the width makes the bottom row read as two tokens, which ENDS a chain
    // that may have gone on (the prefix case below), and nothing tells the
    // two apart from the drawn rows.
    const after = `folder/one.ts:5${' '.repeat(32)}zz`;
    expect(after.length).toBe(49);
    for (const y of [1, 2]) expect(at(['x', freshAbs, after, 'y'], y, 47)).toBeNull();
    // The same rows drawn fresh, with nothing past the width, join: the
    // leftover cells are the only difference.
    expect(at(['x', freshAbs, 'folder/one.ts:5', 'y'], 1, 47)).toMatchObject({
      target: '/p/deep/folder/one.ts',
      line: 5,
      endColumn: 15
    });
    none(['x', fresh, after, 'y'], 47);
    none(['x', fresh, 'folder/one.ts:5', 'y'], 47);
  });

  // THE REVERIFY'S F1 (his ruled round): a path in ANOTHER folder broken over
  // three rows at 38 columns, whose top row carries leftover cells past the
  // edge, glued (X2) or a blank cell away (X3). The fix round's J9 refused
  // only that one boundary, so the two rows below joined on their own as a
  // RELATIVE path, which the door resolves against the project and opens
  // `<project>/build/fixtures/facts/manifests/package.json` at line 134, a
  // file the screen does not name; the parent opened nothing. Refused whole,
  // from every row.
  const F1 = (top: string): string[] => ['', top, 'build/fixtures/facts/manifests/package', '.json:134 and the rest follows.', '', '>'];
  const X1 = F1('The plan is written down at /q/tortie/');

  it('F1: the clean rows join the whole path in the other folder, from every row', () => {
    expect([X1[1]?.length, X1[2]?.length]).toEqual([38, 38]);
    for (const y of [1, 2, 3]) {
      expect(at(X1, y, 38)).toMatchObject({
        target: '/q/tortie/build/fixtures/facts/manifests/package.json',
        line: 134,
        top: 1,
        startColumn: 28,
        bottom: 3,
        endColumn: 9
      });
    }
  });

  for (const [name, top] of [
    ['X2, leftover cells glued onto the top row', 'The plan is written down at /q/tortie/e/A'],
    ['X3, leftover cells a blank cell past the top row', 'The plan is written down at /q/tortie/ zz']
  ] as const) {
    it(`F1 ${name}: no row joins, and the rows below are never joined on their own`, () => {
      const rows = F1(top);
      none(rows, 38);
      // The rows below by themselves, with nothing above them, are RELATIVE,
      // so they join from no row either (J10, his absolute-only round): the
      // row-above clause's control is the absolute twin below.
      none(['x', ...rows.slice(2)], 38);
    });
  }

  it('the row above: an absolute chain below a row that reads past the width is refused whole, beside its clean twin', () => {
    // His absolute-only round's twin of F1's control (rule 17's
    // `j9a-row-above`): `/r/aaa-` above `bbb.md now` at 10 columns, below a
    // row whose leftover `zz` sits past the width. Nothing joins; with
    // `Plan:` alone above, the same two rows join from both.
    const stale = ['x', 'Plan:' + ' '.repeat(5) + ' zz', '/r/aaa-', 'bbb.md now', 'y'];
    expect(stale[1]?.length).toBe(13);
    none(stale, 10);
    const clean = ['x', 'Plan:', '/r/aaa-', 'bbb.md now', 'y'];
    for (const y of [2, 3]) {
      expect(at(clean, y, 10), `row ${String(y)}`).toMatchObject({
        target: '/r/aaa-bbb.md',
        top: 2,
        startColumn: 0,
        bottom: 3,
        endColumn: 6
      });
    }
  });

  it('the row above alone decides a top row holding more than its piece (the fix round of his absolute-only round)', () => {
    // J11's top half now refuses a lone top piece below any row reaching
    // past the widest row, so the case above is J11's too; with `at ` before
    // the piece on its row J11 reads nothing there, and the row-above clause
    // alone refuses it (rule 17's `j9a-row-above-tokens`).
    const stale = ['x', 'Plan:' + ' '.repeat(5) + ' zz', 'at /r/aaa-', 'bbb.md now', 'y'];
    none(stale, 10);
    const clean = ['x', 'Plan:', 'at /r/aaa-', 'bbb.md now', 'y'];
    for (const y of [2, 3]) {
      expect(at(clean, y, 10), `row ${String(y)}`).toMatchObject({
        target: '/r/aaa-bbb.md',
        top: 2,
        startColumn: 3,
        bottom: 3,
        endColumn: 6
      });
    }
  });

  it('refuses a chain that a token left past the width cut at a prefix of its path', () => {
    // `fixtures/parent-record-b-` went on to `first.json` on a fresh screen;
    // the leftover `ests_` makes its row read as two tokens, so the walk
    // stops there and, cut, the chain would offer the folder's prefix.
    const clean = ['', 'I updated /q/tortie/build/p336/', 'fixtures/parent-record-b-', 'first.json to fix the race.', '', '>'];
    const stale = clean.map((r, k) => (k === 2 ? `${r}      ests_` : r));
    expect(stale[2]?.length).toBe(36);
    for (const y of [1, 2, 3]) {
      expect(at(clean, y, 31)?.target).toBe('/q/tortie/build/p336/fixtures/parent-record-b-first.json');
    }
    for (const y of [1, 2, 3]) expect(at(stale, y, 31), `row ${String(y)}`).toBeNull();
  });

  it('refuses a chain whose row below has a first piece reaching past the width, whatever stopped the walk', () => {
    // The chain's bottom row ends the path itself (it holds two tokens), so
    // the row below is not read for the name; a boundary the chain stops at
    // is still read in both its places, and the lower one reads a cell past
    // the width. The candidate's clause, kept as measured (his ruled round).
    const rows = ['x', 'see /q/tortie/aaa-', 'bbb.md to fix it', `${'c'.repeat(22)}zz`, 'y'];
    expect(at(rows.map((r, k) => (k === 3 ? 'c'.repeat(22) : r)), 1, 22)?.target).toBe('/q/tortie/aaa-bbb.md');
    for (const y of [1, 2]) expect(at(rows, y, 22), `row ${String(y)}`).toBeNull();
  });

  it('reads the width in CELLS: a wide glyph that ends on the last column is not past it', () => {
    // `中文` is four cells in two characters, so this row is 47 cells and 45
    // characters, and its piece ends on the last column.
    const wide = `中文 open ${'z'.repeat(28)} /p/deep/`;
    expect([wide.length, cellColumns(fakeLine(wide))[wide.length]]).toEqual([45, 47]);
    expect(at(['x', wide, below, 'y'], 2, 47)?.target).toBe('/p/deep/folder/one.ts');
    expect(at(['x', `${wide}de`, below, 'y'], 2, 47)).toBeNull();
    // Its relative spelling joins from no row (J10).
    const relative = `中文 open ${'z'.repeat(27)} src/deep/`;
    expect(cellColumns(fakeLine(relative))[relative.length]).toBe(47);
    none(['x', relative, below, 'y'], 47);
  });
});

/** The opening brackets the grammar strips at a token's head (`OPEN` in path-spans.ts). */
const OPENERS = new Set(["'", '"', '`', '(', '[', '{', '<', '‘', '“', '«']);
/** The gutter the join strips at a row's head (`GUTTER` in path-spans.ts). */
const ROW_GUTTER = /^(?:\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;

/** The join through row `y` of ASCII-celled `rows`, or null. */
function joinOf(rows: string[], y: number, width: number): JoinedSpan | null {
  const lines = rows.map((r) => fakeLine(r));
  return joinedPathAt(readerOf(lines), y, lines.length - 1, width);
}

/** No join from any row of `rows`. */
function noRowJoins(rows: string[], width: number): void {
  for (let y = 0; y < rows.length; y += 1) expect(joinOf(rows, y, width), `row ${String(y)}`).toBeNull();
}

// The reverify's E1 (his absolute-only round): an agent printed a path into
// ANOTHER worktree of this repository and its breaker cut it at 46 columns.
const E1 = [
  '',
  '⏺ Updated /private/tmp/wt-p3471-parent-rv2/',
  '  src/main/__tests__/menu-popup-',
  '  template.test.ts:38 and ran the tests.',
  '',
  '>'
];
const E1_FILE = '/private/tmp/wt-p3471-parent-rv2/src/main/__tests__/menu-popup-template.test.ts';
// Its 40-cell row, cut at 38 by a breaker that also cut `othe` from `r/`.
const X40 = [
  '',
  'Plan at /private/tmp/p3471rv2-app/othe',
  'r/',
  'build/fixtures/facts/manifests/package',
  '.json:134 and the rest follows.',
  '',
  '>'
];
/** One spelling's top piece above `bar.md now`, one cell short of the edge. */
const spelled = (piece: string): { rows: string[]; width: number } => {
  const top = piece.startsWith('•') ? piece : `see ${piece}`;
  return { rows: ['x', top, 'bar.md now', 'y'], width: top.length + 1 };
};
const JOINING_SPELLINGS: [string, string][] = [
  ['(/abs/foo-', '/abs/foo-bar.md'],
  ['`~/abs/foo-', '~/abs/foo-bar.md'],
  ['file:///abs/foo-', '/abs/foo-bar.md'],
  ['•/abs/foo-', '/abs/foo-bar.md']
];
/** Every one is spelled like a path to the grammar, so J10 is what refuses it. */
const RELATIVE_SPELLINGS = ['~me/foo-', './foo-', '../foo-', 'foo-', '$HOME/abs/foo-'];

describe('U6 J10: a chain is offered only when its joined target starts with / or ~/ (his ruling of 2026-10-14)', () => {
  it('issue 40’s rows still join from rows 1, 2 and 3 at 45 to 49 columns', () => {
    for (const width of [45, 46, 47, 48, 49]) {
      for (const y of [1, 2, 3]) {
        expect(joinOf(ISSUE, y, width), `${String(width)} row ${String(y)}`).toMatchObject({
          target: FILE,
          line: 134,
          top: 1,
          startColumn: 0,
          bottom: 3,
          endColumn: 30
        });
      }
    }
  });

  it('E1: the whole absolute path joins at 46, and at 47 to 50 its relative tail joins from no row', () => {
    for (const y of [1, 2, 3]) {
      expect(joinOf(E1, y, 46), `row ${String(y)}`).toEqual({
        target: E1_FILE,
        line: 38,
        text: `${E1_FILE}:38`,
        top: 1,
        bottom: 3,
        startColumn: 10,
        endColumn: 21
      });
    }
    // At 47 J3 stops the walk above `src/` (43 + 4 fits), and the two rows
    // below are `src/main/__tests__/menu-popup-template.test.ts:38`, which
    // resolves against THIS project and opened its own copy at HEAD.
    for (const width of [47, 48, 49, 50]) noRowJoins(E1, width);
  });

  it('E1’s 40-cell row at 38: the relative rows below join from no row; the folder above stays a folder', () => {
    expect([X40[1]?.length, X40[3]?.length]).toEqual([38, 38]);
    for (const y of [3, 4]) expect(joinOf(X40, y, 38), `row ${String(y)}`).toBeNull();
    for (const y of [1, 2]) {
      expect(joinOf(X40, y, 38), `row ${String(y)}`).toMatchObject({
        target: '/private/tmp/p3471rv2-app/other/',
        top: 1,
        bottom: 2
      });
    }
  });

  it('issue 40 with its leading / taken off joins from no row', () => {
    const relative = ISSUE.map((r) => (r === TOP ? TOP.slice(1) : r));
    expect(relative[1]).toBe('Users/johnberryman/projects/github/arcturus-');
    for (const width of [45, 46, 47, 48, 49]) noRowJoins(relative, width);
  });

  for (const [piece, target] of JOINING_SPELLINGS) {
    it(`${JSON.stringify(piece)} above bar.md joins ${target} from both rows`, () => {
      const { rows, width } = spelled(piece);
      for (const y of [1, 2]) expect(joinOf(rows, y, width)?.target, `row ${String(y)}`).toBe(target);
    });
  }

  for (const piece of RELATIVE_SPELLINGS) {
    it(`${JSON.stringify(piece)} above bar.md joins from no row`, () => {
      const { rows, width } = spelled(piece);
      noRowJoins(rows, width);
    });
  }

  // A prefix glued onto an absolute path is refused by the GRAMMAR before J10
  // reads it: `=` and `:` are no path segment's characters (`looksLikePath`).
  // J10 is the second wall there, and the first for a glued prefix the
  // grammar takes (`$HOME/abs/foo-` above).
  for (const piece of ['x=/abs/foo-', '--file=/abs/foo-', 'foo:/abs/foo-']) {
    it(`${JSON.stringify(piece)} above bar.md joins from no row (the grammar refuses it first)`, () => {
      const { rows, width } = spelled(piece);
      noRowJoins(rows, width);
      expect(looksLikePath(`${piece}bar.md`)).toBe(false);
    });
  }

  it('the top piece is its row’s last token, and the target starts where that piece does, past its opening brackets', () => {
    const fixtures: { rows: string[]; width: number }[] = [
      ...[45, 46, 47, 48, 49].map((width) => ({ rows: ISSUE, width })),
      { rows: E1, width: 46 },
      { rows: X40, width: 38 },
      ...JOINING_SPELLINGS.map(([piece]) => spelled(piece))
    ];
    let chains = 0;
    for (const { rows, width } of fixtures) {
      for (let y = 0; y < rows.length; y += 1) {
        const join = joinOf(rows, y, width);
        if (join === null) continue;
        chains += 1;
        // Every row here is ASCII or one-cell glyphs, so a column is an index.
        const topRow = (rows[join.top] ?? '').replace(/\s+$/, '');
        const fromStart = topRow.slice(join.startColumn);
        expect(fromStart, `${topRow} at ${String(width)}`).toMatch(/^\S+$/);
        const content = topRow.replace(ROW_GUTTER, '');
        let piece = content.split(/\s+/).pop() ?? '';
        while (piece.length > 0 && OPENERS.has(piece[0] ?? '')) piece = piece.slice(1);
        if (piece.startsWith('file://')) piece = piece.slice('file://'.length);
        expect(piece[0], `${topRow} at ${String(width)}`).toBe(join.target[0]);
        expect(join.target.startsWith('/') || join.target.startsWith('~/')).toBe(true);
      }
    }
    expect(chains).toBeGreaterThanOrEqual(25);
  });
});

describe('U7 J11: a chain a breaker that cuts anywhere left at either end is refused whole', () => {
  // wrap-ansi's hard mode, which Ink draws an agent's text with, cuts every
  // row it cuts at ONE column, short of the pane's edge once the pane is
  // wider than its limit (build/p3471/SPEC.md D15). Every expectation below
  // was read on the spec's prototype.
  const TOP_CUT = ['', 'I saved it to /Users/me/proj', '/tmp/run-logs/nightly-build-', 'output.log today.', '', '>'];
  const BOTTOM_CUT = ['', 'I updated /Users/me/proj/dist/', 'assets/vendor-chunk-a/index.js', '.map today.', '', '>'];
  const NIT = [
    '',
    'I updated the test in /private',
    '/tmp/wt-p3471-parent-rv2/docs/',
    'research/assets/58/answer.hard',
    '13:60 today.',
    '',
    '>'
  ];
  const PRICE = [
    '',
    'Two files changed: ~/tortie/',
    '.claude/scheduled_tasks.lock',
    'and ~/tortie/docs/audits/',
    'contract-baseline.txt.',
    '',
    '>'
  ];

  it('the top half: a lone piece starting on `/` below a row cut at the same column joins from no row', () => {
    expect([TOP_CUT[1]?.length, TOP_CUT[2]?.length]).toEqual([28, 28]);
    noRowJoins(TOP_CUT, 32);
    // The control (the fix round of his absolute-only round): the first row
    // ends five cells short of the widest row, so `/tmp` (four cells) would
    // have fitted on it and no breaker of any limit the chain allows cut
    // there. The column decides, not the text. One cell short is U8's: a
    // breaker that breaks before a `/` may have cut there.
    const control = TOP_CUT.map((r, k) => (k === 1 ? 'I saved it to /Users/me' : r));
    for (const y of [2, 3]) {
      expect(joinOf(control, y, 32), `row ${String(y)}`).toMatchObject({
        target: '/tmp/run-logs/nightly-build-output.log',
        top: 2,
        startColumn: 0,
        bottom: 3,
        endColumn: 10
      });
    }
  });

  it('the bottom half: a lone piece cut mid-name at the column of the row above joins from no row', () => {
    expect([BOTTOM_CUT[1]?.length, BOTTOM_CUT[2]?.length]).toEqual([30, 30]);
    noRowJoins(BOTTOM_CUT, 33);
    // The control (the fix round of his absolute-only round): the bottom
    // piece two cells SHORTER than the row above, so it is not at the limit
    // of any breaker that drew the row above, and a cut inside a name lands
    // only there. One cell longer is U8's: refused, because a breaker that
    // breaks after a `-` ends the row above short of its limit.
    const control = BOTTOM_CUT.map((r, k) => (k === 2 ? 'assets/vendor-chunk/index.js' : r));
    for (const y of [1, 2]) {
      expect(joinOf(control, y, 33), `row ${String(y)}`).toMatchObject({
        target: '/Users/me/proj/dist/assets/vendor-chunk/index.js',
        top: 1,
        startColumn: 10,
        bottom: 2,
        endColumn: 28
      });
    }
  });

  it('both halves: the reverify’s nit at 38 joins from no row', () => {
    expect(NIT.slice(1, 4).map((r) => r.length)).toEqual([30, 30, 30]);
    noRowJoins(NIT, 38);
  });

  it('the price (L9): a whole path two of whose rows end at one column joins from no row', () => {
    expect([PRICE[1]?.length, PRICE[2]?.length]).toEqual([28, 28]);
    // `~/tortie/.claude/scheduled_tasks.lock` is whole, and J11's bottom half
    // refuses it; the second path below it is a folder short of the edge above
    // a bare name, which J5 stops. Nothing joins, as today.
    noRowJoins(PRICE, 31);
  });

  /** A line as a terminal soft-wraps it: rows of exactly `width` cells. */
  const softWrapped = (line: string, width: number): string[] => {
    const out = [''];
    for (let i = 0; i < line.length; i += width) out.push(line.slice(i, i + width));
    return [...out, '', '>'];
  };

  for (const [line, width, want] of [
    [
      'I saved it to /Users/me/proj/tmp/run-logs/nightly-build-output.log today.',
      32,
      '/Users/me/proj/tmp/run-logs/nightly-build-output.log'
    ],
    [
      'I updated /Users/me/proj/dist/assets/vendor-chunk-a/index.js.map today.',
      33,
      '/Users/me/proj/dist/assets/vendor-chunk-a/index.js.map'
    ],
    [
      'I updated the test in /private/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard13:60 today.',
      38,
      '/private/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard13'
    ],
    [
      'Two files changed: ~/tortie/.claude/scheduled_tasks.lock and ~/tortie/docs/audits/contract-baseline.txt.',
      31,
      '~/tortie/.claude/scheduled_tasks.lock'
    ]
  ] as const) {
    it(`the same path soft-wrapped at ${String(width)} joins whole: ${want}`, () => {
      const rows = softWrapped(line, width);
      // Every row but the last is full: J11 reads only rows short of the edge.
      for (const row of rows.slice(1, -3)) expect(row).toHaveLength(width);
      const join = joinOf(rows, 1, width);
      expect(join?.target).toBe(want);
      if (join === null) return;
      expect(join.bottom).toBeGreaterThan(join.top);
      for (let y = join.top; y <= join.bottom; y += 1) {
        expect(joinOf(rows, y, width)?.target, `row ${String(y)}`).toBe(want);
      }
    });
  }
});

describe('U8 J11 as the fix round widened it: any breaker, any limit the chain allows', () => {
  // The attack lens of his absolute-only round (2026-10-14): J11 read ONE
  // column for every row a breaker cut, which is wrap-ansi's hard mode alone.
  // Each case below is refused whole, and each names the clause that refuses
  // it; every expectation was read with that clause taken out of the source,
  // where the case joins (conformance:pathdoors rule 17 holds the ablations).
  const framed = (...rows: string[]): string[] => ['', ...rows, '', '>'];

  it('a hyphen-aware cutter (Rust textwrap) cut a name mid-name: the bottom row reaches the widest row above it', () => {
    // `cmd.hard` beside `cmd.hard13`; the row above ends after `-`, short.
    const rows = framed(
      '⏺ Updated /private/tmp/wt-p3471-parent-',
      '  attack/docs/research/assets/58/cmd.hard',
      '  13:62 and ran the tests.'
    );
    expect(rows.slice(1, 3).map((r) => r.length)).toEqual([39, 41]);
    noRowJoins(rows, 45);
  });

  it('the bottom row one cell longer than the row above is refused too (U7’s old control)', () => {
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/vendor-chunk-ab/index.js', '.map today.'), 33);
  });

  it('Ink with one emoji, which Tortie’s xterm draws one cell narrower than Ink counts, cut just before `/tmp`', () => {
    const rows = framed(
      `⏺ ✅ Updated ~/h/${'b'.repeat(30)}`,
      '  /tmp/p3471atk/run-logs/nightly-build-output-f',
      '  or-the-release-candidate.log today.'
    );
    noRowJoins(rows, 47);
  });

  it('a breaker that breaks before a `/`: the row above ends within `/tmp` of the widest row (U7’s old top control)', () => {
    noRowJoins(framed('I saved it to /Users/me/pro', '/tmp/run-logs/nightly-build-', 'output.log today.'), 32);
    // The edge: 25 cells and `/tmp`'s four reach one cell past the widest
    // row (28), so a breaker of limit 28 may have cut there.
    noRowJoins(framed('I saved it to /Users/me/p', '/tmp/run-logs/nightly-build-', 'output.log today.'), 32);
  });

  it('the cells a breaker may count past what xterm drew: two emoji on the row above', () => {
    // 27 drawn cells, 30 as Ink counts them; `/tmp` is four.
    noRowJoins(framed('🚀 ✅ Shipped ~/h/abcdefghijk', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log today.'), 34);
  });

  it('a gutter is the program’s own drawing and is not counted: `⏺ ` above a row that ends a fragment short joins', () => {
    const rows = framed('⏺ Saved to /Users/me/pro', '/tmp/run-logs/nightly-build-', 'output.log today.');
    for (const y of [2, 3]) {
      expect(joinOf(rows, y, 32), `row ${String(y)}`).toMatchObject({
        target: '/tmp/run-logs/nightly-build-output.log',
        top: 2,
        bottom: 3
      });
    }
  });

  for (const [name, above, width] of [
    ['a home alone, `~`', 'I wrote the build log to ~', 34],
    ['a variable alone, `$HOME`', 'I copied it to $HOME', 34],
    ['a URL’s host', 'See https://example.com', 34]
  ] as const) {
    it(`the row above ends in a root a path goes on from: ${name}`, () => {
      const rows = framed(above, '/tmp/p3471atk/run-logs/nightly-', 'build-output.log today.');
      noRowJoins(rows, width);
    });
  }

  it('a terminal soft wrap whose row ends in `]` right before `/`', () => {
    noRowJoins(framed('Edited ~/h/pages/[slug]', '/tmp/p3471atk/run-logs/', 'nightly-build-output.lo', 'g now'), 23);
  });

  it('a wide glyph xterm draws in two cells is counted as one by a breaker that counts code points', () => {
    // The top: CJK prose after the bottom piece makes that row the widest as
    // drawn (33) and not as counted (25).
    noRowJoins(framed('I saved it to /Users/me/proj', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log 中文中文中文中文'), 36);
    // The bottom: CJK prose before the top piece (29 drawn, 25 counted).
    noRowJoins(framed('中文中文 /Users/me/proj/dist/', 'assets/vendor-chunk/index.js', '.map today.'), 33);
  });

  it('a top or bottom row holding more than its piece has a space beside it, and joins', () => {
    const top = framed('(the note is in the docs folder)', 'at /tmp/run-logs/nightly-build-', 'output.log today.');
    for (const y of [2, 3]) {
      expect(joinOf(top, y, 32), `row ${String(y)}`).toMatchObject({
        target: '/tmp/run-logs/nightly-build-output.log',
        top: 2,
        startColumn: 3,
        bottom: 3
      });
    }
    const bottom = framed('I updated /Users/me/proj/dist/', 'assets/vendor-chunk-a/index.js and', 'the map today.');
    for (const y of [1, 2]) {
      expect(joinOf(bottom, y, 36), `row ${String(y)}`).toMatchObject({
        target: '/Users/me/proj/dist/assets/vendor-chunk-a/index.js',
        top: 1,
        bottom: 2,
        endColumn: 30
      });
    }
  });

  it('a cut at a break opportunity at the bottom: the bottom row plus the next fragment reaches past the widest row above', () => {
    // Before a `/` (a bundle the Mac door would open), after a `/`, after a `-`.
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/MyApplication.app', '/Contents/Info.plist today.'), 33);
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/MyApplication.app/', 'Contents/Info.plist today.'), 36);
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/nightly-build-', 'output.log today.'), 36);
    // Each break kind's fragment as its breaker measures it: after a `-` the
    // whole next token, `build/output.log` (15 + 16 past 30), and at the top
    // `/tmp/…` below a row ending in `-` (23 + 28 past 28); after a `/` through
    // the next `/` or `-` no digit follows, `Contents/` (22 + 9 past 30) and
    // `dollar-3.4.json:50` whole after `p342/` (21 + 18 past 30: UAX #14 does
    // not break before the digit, so `dollar-`, 7, would not be enough).
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/nightly-', 'build/output.log today.'), 36);
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/MyApplicat.app/', 'Contents/Info.plist today.'), 36);
    noRowJoins(framed('I updated /Users/me/proj/dist/', 'assets/fixtures/p342/', 'dollar-3.4.json:50 today.'), 36);
    noRowJoins(framed('I saved to /Users/me/a-', '/tmp/run-logs/nightly-build-', 'output.log today.'), 32);
    // Short enough that `/Contents` would have fitted on the bottom row: joins.
    const short = framed('I updated /Users/me/proj/dist/', 'assets/Foo.app', '/Contents/Info.plist today.');
    for (const y of [1, 2]) {
      expect(joinOf(short, y, 33), `row ${String(y)}`).toMatchObject({
        target: '/Users/me/proj/dist/assets/Foo.app',
        top: 1,
        bottom: 2,
        endColumn: 14
      });
    }
  });

  it('the bottom row widest, but the row below starts with a character no name goes on with, or the piece ends in a line suffix: joins', () => {
    const name = framed('• Edited /private/tmp/wt-p3471/', '  .github/actions/setup/action.yml', '  (+3 -1)');
    expect(joinOf(name, 1, 38)?.target).toBe('/private/tmp/wt-p3471/.github/actions/setup/action.yml');
    const line = framed('⏺ Updated /private/tmp/wt-p3471/', '  .claude/scheduled_tasks.lock:10', '  and ran the tests.');
    expect(joinOf(line, 1, 38)).toMatchObject({ target: '/private/tmp/wt-p3471/.claude/scheduled_tasks.lock', line: 10 });
  });

  it('issue 40’s rows still join from every row at 45 to 49 columns', () => {
    for (const width of [45, 46, 47, 48, 49]) {
      for (const y of [1, 2, 3]) {
        expect(joinOf(ISSUE, y, width)?.target, `${String(width)} row ${String(y)}`).toBe(FILE);
      }
    }
  });
});

describe('U9 J11 reads Python’s break before `--` (the reverify of 2026-10-15)', () => {
  // Python's own textwrap breaks BEFORE a run of two or more `-` that a word
  // character precedes and a word character follows (its `wordsep_re` holds
  // `(?<=[\w!"'&.,?])(?=-{2,}\w)`), and the run is a chunk of its own. So a
  // bottom row ending mid-name just before `--` may have been left with room
  // for one cell and not for the run, and J11 read that break as a cut at the
  // limit, one cell: `…/pi-sessions` opened a file named `pi-sessions` beside
  // `pi-sessions--Users-…/…jsonl`, where the parent opened nothing. Every
  // refused row below is Python's own `textwrap.wrap` output, read with
  // `/usr/bin/python3 -I`. The first two cut their path AT the pane's width,
  // so the overflow refusal (U10) refuses them too; the two after them were
  // wrapped one cell or more narrower than the pane, so no row fills it and
  // the run clause in `movedFragmentCells` alone refuses them: with it taken
  // out each joins the name before the run (conformance:pathdoors rule 17
  // holds the ablations, `j11-dashes-alone` and `j11-dashes-alone-run`).
  const framed = (...rows: string[]): string[] => ['', ...rows, '', '>'];

  it('the pi-sessions shape: a bottom row one cell short of the widest row above `--Users-…` joins from no row', () => {
    const rows = framed(
      'I updated the test in /Users/me/proj/docs',
      '/research/assets/63-fixtures/pi-sessions',
      '--Users-example-rookery--/2026-06-12T04-5',
      '7-36-108Z.jsonl:10 today.'
    );
    expect(rows.slice(1, 4).map((r) => r.length)).toEqual([41, 40, 41]);
    noRowJoins(rows, 41);
  });

  it('the plan.md--old.md shape: `plan.md` one cell short above `--old.md` joins from no row', () => {
    const rows = framed('Wrote /Users/me/project', 's/tortie/notes/plan.md', '--old.md');
    expect(rows.slice(1, 3).map((r) => r.length)).toEqual([23, 22]);
    noRowJoins(rows, 23);
  });

  it('the run alone refuses Python’s rows wrapped narrower than the pane, where no row fills it', () => {
    // textwrap.wrap('xxx I updated the test in /Users/me/projects/tortie/notes/plan.md--old.md:12 today.', 33)
    // in a 34-column pane: 32 cells and `--` reach past the widest row above (33).
    const plan = framed('xxx I updated the test in /Users/', 'me/projects/tortie/notes/plan.md', '--old.md:12 today.');
    expect(plan.slice(1, 3).map((r) => r.length)).toEqual([33, 32]);
    noRowJoins(plan, 34);
    // textwrap.wrap('I updated the test in /Users/me/projects/tortie/c/report---final.txt:12 today.', 29)
    // in a 30-column pane: 27 cells and `---` (three) reach past 29, where two would not.
    const report = framed('I updated the test in /Users/', 'me/projects/tortie/c/report', '---final.txt:12 today.');
    expect(report.slice(1, 3).map((r) => r.length)).toEqual([29, 27]);
    noRowJoins(report, 30);
  });

  it('the run is counted in cells: room for the whole run joins, and a longer run is refused', () => {
    // 25 cells and `---` (three) reach 28, short of the widest row above
    // (29), so Python's textwrap would have put the run on that row and no
    // modelled breaker cut there: the name joins, as a single cell did. No
    // row fills the 30-column pane, so the overflow refusal (U10) does not
    // read it. The row above it ends at its `/`, an agent's break.
    const room = framed('I updated the test in /Users/', 'me/projects/tortie/c/repo', '---final.txt:12 today.');
    for (const y of [1, 2]) {
      expect(joinOf(room, y, 30), `row ${String(y)}`).toMatchObject({
        target: '/Users/me/projects/tortie/c/repo',
        top: 1,
        startColumn: 22,
        bottom: 2,
        endColumn: 25
      });
    }
    // Two cells longer, 27 and `---` reach past 29, so it is refused.
    noRowJoins(framed('I updated the test in /Users/', 'me/projects/tortie/c/report', '---final.txt:12 today.'), 30);
  });

  it('issue 40’s rows still join from every row at 45 to 49 columns', () => {
    for (const width of [45, 46, 47, 48, 49]) {
      for (const y of [1, 2, 3]) {
        expect(joinOf(ISSUE, y, width)?.target, `${String(width)} row ${String(y)}`).toBe(FILE);
      }
    }
  });
});

describe('U10 J11 refuses an overflow Python’s textwrap left above a run of `--` (his ruling of 2026-10-15)', () => {
  // `textwrap.wrap(text, width, break_long_words=False)` never cuts a chunk
  // longer than its row: it puts the chunk on a line of its own, overflowing
  // it, and the terminal soft-wraps the overflow at the pane's edge. Its
  // `wordsep_re` makes the run of `--` a chunk of its own, so the next line
  // starts with the run, and the chain's bottom row is the overflow's
  // remainder, as short as it happens to be. The arithmetic of U8 and U9 read
  // that remainder as no cut, and the join opened a regular file named exactly
  // the text before `--` (X-nolong-planw-19 and X-nolong-plan2s-50, live, 5 of
  // 5 presses). Every line below is Python's own output, read with
  // `/usr/bin/python3 -I`, and the rows are those lines as the terminal
  // draws them in a pane of the width given. Each refused case joins the name
  // before `--` with the overflow refusal taken out of the source, and each
  // control is refused with one of its conjuncts taken out
  // (conformance:pathdoors rule 17 holds the ablations, `j11-overflow-*`).

  /** Python's lines as the terminal draws them: a line wider than the pane soft-wrapped at its edge. */
  const drawnAt = (lines: readonly string[], width: number): string[] => {
    const rows = [''];
    for (const line of lines) {
      const cps = [...line];
      for (let i = 0; i < cps.length; i += width) rows.push(cps.slice(i, i + width).join(''));
      if (cps.length === 0) rows.push('');
    }
    return [...rows, '', '>'];
  };

  it('the planw shape at 19: `plan.md` overflowed above `--old.md` joins from no row', () => {
    // textwrap.wrap('Wrote /Users/me/projects/tortie/notes/plan.md--old.md', 19, break_long_words=False)
    const rows = drawnAt(['Wrote', '/Users/me/projects/tortie/notes/plan.md', '--old.md'], 19);
    expect(rows.slice(1, 6)).toEqual(['Wrote', '/Users/me/projects/', 'tortie/notes/plan.m', 'd', '--old.md']);
    noRowJoins(rows, 19);
  });

  it('the plan2s shape at 50: a quoted path overflowed above `--old.md"` joins from no row', () => {
    // textwrap.wrap('Saved the report to "/Users/me/projects/tortie/docs/research/assets/63-fixtures/plan.md--old.md" for review.', 50, break_long_words=False)
    const rows = drawnAt(
      [
        'Saved the report to',
        '"/Users/me/projects/tortie/docs/research/assets/63-fixtures/plan.md',
        '--old.md" for review.'
      ],
      50
    );
    expect(rows.slice(2, 5).map((r) => r.length)).toEqual([50, 17, 21]);
    noRowJoins(rows, 50);
  });

  it('the price (L9): a path a soft wrap left above a flag joins from no row, as at the parent', () => {
    // textwrap.wrap('Run /Users/me/projects/tortie/bin/deploy.sh --dry-run first.', 30, break_long_words=False)
    noRowJoins(drawnAt(['Run', '/Users/me/projects/tortie/bin/deploy.sh', '--dry-run first.'], 30), 30);
    // textwrap.wrap('Then run /Users/me/projects/tortie/bin/deploy.sh --force --yes to finish.', 30, break_long_words=False)
    noRowJoins(drawnAt(['Then run', '/Users/me/projects/tortie/bin/deploy.sh', '--force --yes to finish.'], 30), 30);
  });

  it('a name that itself holds `--` joins whole, from every row it covers', () => {
    // textwrap.wrap('I updated the test in /Users/me/proj/docs/research/assets/63-fixtures/pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z.jsonl:12 today.', 27, break_long_words=False)
    const rows = drawnAt(
      [
        'I updated the test in',
        '/Users/me/proj/docs/research/assets/63-fixtures/pi-',
        'sessions--Users-example-',
        'rookery--/2026-06-12T04-57-36-108Z.jsonl:12',
        'today.'
      ],
      27
    );
    const want = '/Users/me/proj/docs/research/assets/63-fixtures/pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z.jsonl';
    for (let y = 2; y <= 6; y += 1) {
      expect(joinOf(rows, y, 27), `row ${String(y)}`).toMatchObject({ target: want, line: 12, top: 2, bottom: 6, startColumn: 0 });
    }
  });

  it('each conjunct, its control: an overflow above a word, above a bare `--`, ending in `+`, below no full row, beside other words', () => {
    // The row below starts with no run: an ordinary soft wrap of a long path.
    // textwrap.wrap('Wrote /Users/me/projects/tortie/notes/plan.md today.', 19, break_long_words=False)
    const word = drawnAt(['Wrote', '/Users/me/projects/tortie/notes/plan.md', 'today.'], 19);
    expect(joinOf(word, 3, 19)?.target).toBe('/Users/me/projects/tortie/notes/plan.md');
    // A run with no word character after it.
    // textwrap.wrap('Call /Users/me/projects/tortie/bin/deploy.sh -- --help for usage.', 30, break_long_words=False)
    const bare = drawnAt(['Call', '/Users/me/projects/tortie/bin/deploy.sh', '-- --help for usage.'], 30);
    expect(joinOf(bare, 3, 30)?.target).toBe('/Users/me/projects/tortie/bin/deploy.sh');
    // A bottom piece ending in a character Python's textwrap never breaks after.
    // textwrap.wrap('Build it with /Users/me/projects/tortie/bin/g++ --std=c++17 now.', 30, break_long_words=False)
    const gpp = drawnAt(['Build it with', '/Users/me/projects/tortie/bin/g++', '--std=c++17 now.'], 30);
    expect(joinOf(gpp, 3, 30)?.target).toBe('/Users/me/projects/tortie/bin/g++');
    // No row of the chain fills the pane (U9's room): no overflow was soft-wrapped there.
    const room = ['', 'I updated the test in /Users/', 'me/projects/tortie/c/repo', '---final.txt:12 today.', '', '>'];
    expect(joinOf(room, 2, 30)?.target).toBe('/Users/me/projects/tortie/c/repo');
    // A bottom row holding more than its piece: the piece is whole there.
    const tokens = ['', 'I updated the tests in /Users/me', '/projects/tortie/c/report.md v2', '--final today.', '', '>'];
    expect(tokens[1]).toHaveLength(32);
    expect(joinOf(tokens, 2, 32)?.target).toBe('/Users/me/projects/tortie/c/report.md');
  });

  it('a word character after the run is Python’s, Unicode’s: `--été.md` below is a run too', () => {
    // textwrap.wrap('Wrote /Users/me/projects/tortie/notes/plan.md--été.md today.', 19, break_long_words=False)
    const rows = drawnAt(['Wrote', '/Users/me/projects/tortie/notes/plan.md', '--été.md today.'], 19);
    noRowJoins(rows, 19);
  });

  it('issue 40’s rows still join from every row at 45 to 49 columns', () => {
    for (const width of [45, 46, 47, 48, 49]) {
      for (const y of [1, 2, 3]) {
        expect(joinOf(ISSUE, y, width)?.target, `${String(width)} row ${String(y)}`).toBe(FILE);
      }
    }
  });
});
