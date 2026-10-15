/**
 * PHASE 347 (issue 40) — a path broken over rows, read as one.
 *
 * `joinedPathAt` and `joinBoundary` are pure, so every clause of the join
 * (J1, J2, J3, J5, J6, J7, J8 and both caps; J4 is the provider's door; J9,
 * J10 and J11 are pinned in `p3471-spans-under-join.test.ts`) is pinned here
 * by a fixture that turns the join OFF beside a control that turns it ON, so
 * a clause taken out of the source reads red on its own fixture rather than
 * passing quietly. Rows are handed in as DRAWN, the way
 * `translateToString(true)` answers them, each with its own cell column map,
 * and the map is built through the shipping `cellColumns` over fake cells, so
 * a decorated row moves the column exactly as xterm does.
 *
 * build/p347/SPEC.md §4.2, D5 to D10, §5.2 (PJ1 to PJ6; PJ6 is J7, the fix
 * round's, from the app lens's word-wrap fixture).
 *
 * PHASE 347.1, HIS ABSOLUTE-ONLY ROUND (2026-10-14, build/p3471/SPEC.md D14,
 * D16, §5.4): J10 refuses every chain whose joined target is relative, so
 * every case here that read a RELATIVE join now reads none from any row, and
 * its clause gains an ABSOLUTE twin that carries the control the relative
 * case carried. J8 at the chain's top went with that round (measured
 * redundant under J10); J8 in `joinBoundary` stays, and `b8-tilde-below`
 * pinned the one absolute shape it still decided, which the fix round of that
 * round's J11 refuses too (a row above ending in `/`).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DrawnRow, JoinedSpan } from '../path-spans';
import {
  cellColumns,
  joinBoundary,
  joinedPathAt,
  MAX_JOIN_CHARS,
  MAX_JOIN_ROWS
} from '../path-spans';
import { SRC, stripComments } from './source-scan';

/**
 * Cells the way xterm draws them: one per code point, a variation selector or
 * a combining mark JOINING the cell before it (so `⚠️` is one cell holding two
 * UTF-16 units), width 2 in the wide ranges. Then the SHIPPING `cellColumns`.
 */
function drawn(text: string): DrawnRow {
  const cells: { chars: string; width: number }[] = [];
  for (const chars of text) {
    const cp = chars.codePointAt(0) ?? 0;
    const joins =
      (cp >= 0xfe00 && cp <= 0xfe0f) ||
      (cp >= 0x0300 && cp <= 0x036f) ||
      cp === 0x200d;
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
  const columns = cellColumns({
    length: at.length,
    getCell: (x) => {
      const cell = at[x];
      return cell === undefined
        ? undefined
        : { getChars: () => cell.chars, getWidth: () => cell.width };
    }
  });
  return { text, columns };
}

/** A screen of rows; `last` is its last index unless a test says otherwise. */
function screen(rows: string[]): {
  read: (i: number) => DrawnRow | null;
  asked: number[];
  last: number;
} {
  const asked: number[] = [];
  return {
    asked,
    last: rows.length - 1,
    read: (i) => {
      asked.push(i);
      const row = rows[i];
      return row === undefined ? null : drawn(row);
    }
  };
}

function joinAt(rows: string[], y: number, width: number, last?: number): JoinedSpan | null {
  const s = screen(rows);
  return joinedPathAt(s.read, y, last ?? s.last, width);
}

/** A soft wrap: the path cut into rows of exactly `width`. */
function softWrap(path: string, width: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < path.length; i += width) out.push(path.slice(i, i + width));
  return out;
}

// Issue 40's own path and rows (gh issue view 40): 45, 42 and 30 columns.
const PATH =
  '/Users/johnberryman/projects/github/arcturus-labs/rook/.agents/skills/software-factory/.planning/brainstorming.md:134';
const FILE = PATH.replace(/:134$/, '');
const ISSUE = [
  'The plan is written down at',
  '/Users/johnberryman/projects/github/arcturus-',
  'labs/rook/.agents/skills/software-factory/',
  '.planning/brainstorming.md:134',
  '',
  '> '
];

describe('PJ1 issue 40’s own rows, the agent’s break before the last column', () => {
  it('reads the rows as they were reported', () => {
    expect(ISSUE.slice(1, 4).map((r) => r.length)).toEqual([45, 42, 30]);
  });

  for (const width of [45, 46, 47, 48, 49]) {
    it(`joins to the whole path at line 134 from each of its three rows at ${String(width)} columns`, () => {
      for (const y of [1, 2, 3]) {
        expect(joinAt(ISSUE, y, width)).toEqual({
          target: FILE,
          line: 134,
          text: PATH,
          top: 1,
          bottom: 3,
          startColumn: 0,
          endColumn: 30
        });
      }
    });
  }

  it('offers no join that names the file at 50 and 52 columns', () => {
    for (const width of [50, 52]) {
      for (const y of [1, 2, 3]) {
        expect(joinAt(ISSUE, y, width)?.target).not.toBe(FILE);
      }
    }
    // At 50 the first boundary fails J3 (45 + `labs/` is not more than 50),
    // and the last two rows' chain starts with a RELATIVE folder, which J10
    // refuses (his absolute-only round; J8 at the chain's top refused it
    // before): no fragment is offered.
    expect(joinAt(ISSUE, 2, 50)).toBeNull();
    expect(joinAt(ISSUE, 3, 50)).toBeNull();
    expect(joinAt(ISSUE, 1, 50)).toBeNull();
    for (const y of [1, 2, 3]) expect(joinAt(ISSUE, y, 52)).toBeNull();
  });

  it('answers nothing for a row the path is not on', () => {
    for (const y of [0, 4, 5]) expect(joinAt(ISSUE, y, 45)).toBeNull();
  });
});

describe('PJ2 a soft wrap of the same path', () => {
  for (const width of [30, 47, 60, 80]) {
    it(`joins from every row at ${String(width)} columns`, () => {
      const pieces = softWrap(PATH, width);
      const rows = ['wrote it:', ...pieces, ''];
      const bottom = pieces.length;
      for (let y = 1; y <= bottom; y += 1) {
        expect(joinAt(rows, y, width)).toEqual({
          target: FILE,
          line: 134,
          text: PATH,
          top: 1,
          bottom,
          startColumn: 0,
          endColumn: (pieces[pieces.length - 1] ?? '').length
        });
      }
    });
  }
});

describe('PJ3 the two agents’ own continuation shapes', () => {
  it('joins a Codex break: a `-` on the last column above a five-space indent', () => {
    const top = '  2. Yes, and open /Users/me/project/src/renderer/terminal/path-';
    const width = top.length;
    const rows = ['› 1. Yes, proceed (y)', top, '     links.ts:12 for this session (p)', ''];
    const want = {
      target: '/Users/me/project/src/renderer/terminal/path-links.ts',
      line: 12,
      text: '/Users/me/project/src/renderer/terminal/path-links.ts:12',
      top: 1,
      bottom: 2,
      startColumn: top.indexOf('/'),
      endColumn: '     links.ts:12'.length
    };
    expect(joinAt(rows, 1, width)).toEqual(want);
    expect(joinAt(rows, 2, width)).toEqual(want);
  });

  it('joins under a Claude Code `⎿` gutter on the continuation row', () => {
    const top = '⏺ Wrote the notes to /Users/me/project/docs/a-very-long-';
    const width = top.length;
    const rows = ['', top, '  ⎿  name.md', ''];
    const got = joinAt(rows, 2, width);
    expect(got?.target).toBe('/Users/me/project/docs/a-very-long-name.md');
    expect(got?.top).toBe(1);
    expect(got?.bottom).toBe(2);
    expect(got?.endColumn).toBe('  ⎿  name.md'.length);
  });
});

describe('PJ4 every clause turns the join off, beside a control that turns it on', () => {
  it('J1: an upper row ending on a character a path cannot continue with', () => {
    const above = 'see /Users/me/a/b-c/d,';
    expect(joinBoundary(drawn(above), drawn('e.md'), above.length)).toBe(false);
    expect(joinBoundary(drawn(above.slice(0, -1)), drawn('e.md'), above.length - 1)).toBe(true);
    // ...and the whole join, through the same rows.
    const rows = ['x', 'see /Users/me/proj/aa:', '12', 'y'];
    expect(joinAt(rows, 1, rows[1]?.length ?? 0)).toBeNull();
    expect(joinAt(['x', 'see /Users/me/proj/aa', 'bb.md', 'y'], 1, 'see /Users/me/proj/aa'.length)?.target).toBe(
      '/Users/me/proj/aabb.md'
    );
  });

  it('J2 head: a continuation row whose content does not start with a path character', () => {
    const above = 'see /Users/me/proj/notes-';
    expect(joinBoundary(drawn(above), drawn('  — written at noon'), above.length)).toBe(false);
    expect(joinBoundary(drawn(above), drawn('  written at noon'), above.length)).toBe(true);
    // Past a gutter the head is where the content starts, not column 0.
    expect(joinBoundary(drawn(above), drawn('│ (see below)'), above.length)).toBe(false);
    expect(joinBoundary(drawn(above), drawn('│ draft.md'), above.length)).toBe(true);
  });

  it('J2 middle: a row strictly inside the join holds exactly one token', () => {
    const width = 20;
    const one = 'go /Users/me/aaaaaa-';
    // (His absolute-only round: the middle row's second token is an ABSOLUTE
    // folder, so the chain the bottom row starts is one J10 offers. Its
    // relative spelling is read below: offered from no row.)
    const two = 'bbbbbb/cccccc- /ddd/';
    const three = 'eeee.md';
    expect([one, two].map((r) => r.length)).toEqual([width, width]);
    const rows = ['x', one, two, three, 'y'];
    // The middle row holds two tokens, so no join runs from row 1 to row 3:
    // from the top it stops at the middle row's FIRST token...
    expect(joinAt(rows, 1, width)).toMatchObject({ top: 1, bottom: 2, target: '/Users/me/aaaaaa-bbbbbb/cccccc-' });
    // ...and from the bottom it starts at the middle row's LAST token.
    expect(joinAt(rows, 3, width)).toMatchObject({ top: 2, bottom: 3, target: '/ddd/eeee.md' });
    // The relative spelling of the same rows: the bottom row's chain would
    // start at `dddd/`, relative, so J10 refuses it whole, and no row answers
    // it; the top chain, absolute, still joins.
    const relative = ['x', one, 'bbbbbb/cccccc- dddd/', three, 'y'];
    expect(joinAt(relative, 3, width)).toBeNull();
    for (let y = 0; y < relative.length; y += 1) {
      expect(joinAt(relative, y, width)?.target, `row ${String(y)}`).not.toBe('dddd/eeee.md');
    }
    expect(joinAt(relative, 1, width)).toMatchObject({ top: 1, bottom: 2, target: '/Users/me/aaaaaa-bbbbbb/cccccc-' });
    // The control: the same rows with the middle row's second token gone,
    // the middle row still on the last column. (Phase 347.1's fix round: it
    // read this at `width - 1`, where the top row is one cell wider than the
    // pane, which no repaint draws and J9 refuses.)
    const control = ['x', one, 'bbbbbb/cccccc-ddddd/', three, 'y'];
    expect(joinAt(control, 3, width)?.top).toBe(1);
  });

  it('J3: an upper row short enough that the next unit would have fitted on it', () => {
    const rows = ['x', 'see /a/b-', 'cde/f.md', 'y'];
    // 9 + `cde/` (4) is 13, which fits in 40: a breaker would have put it above.
    expect(joinBoundary(drawn(rows[1] ?? ''), drawn(rows[2] ?? ''), 40)).toBe(false);
    expect(joinAt(rows, 2, 40)).toBeNull();
    // ...and does not fit in 12: the break was forced.
    expect(joinBoundary(drawn(rows[1] ?? ''), drawn(rows[2] ?? ''), 12)).toBe(true);
    expect(joinAt(rows, 2, 12)?.target).toBe('/a/b-cde/f.md');
  });

  it('J5: a folder’s `/` above a bare name joins only on the last column', () => {
    const above = 'the notes live in /Users/me/proj/docs/';
    const rows = ['x', above, 'README.md is the index', 'y'];
    // A word wrap: the row stops short of the edge, and J3 alone would pass.
    expect(joinAt(rows, 2, above.length + 5)).toBeNull();
    expect(joinBoundary(drawn(above), drawn('README.md is the index'), above.length + 5)).toBe(false);
    // The same split exactly at the last column is a soft wrap, and joins.
    expect(joinAt(rows, 2, above.length)?.target).toBe('/Users/me/proj/docs/README.md');
    // A name that still holds a `/` is not J5's shape at all.
    expect(joinBoundary(drawn(above), drawn('guides/README.md is'), above.length + 5)).toBe(true);
  });

  it('J7: a row short of the last column joins only after a `/` or a `-` (PJ6)', () => {
    // The app lens's word wrap (the fix round): a path that ends two cells
    // short of the edge, above a row whose first word is path-shaped. J1, J2,
    // J3 and J5 all admit it; only J7 tells it from an agent's break.
    const above = 'I kept a copy of /r/projects/app/src/README.md';
    const below = '.bak beside it, just in case.';
    const rows = ['x', above, below, 'y'];
    expect(above.length).toBe(46);
    for (const width of [47, 48, 49]) {
      expect(joinBoundary(drawn(above), drawn(below), width)).toBe(false);
      expect(joinAt(rows, 1, width)).toBeNull();
      expect(joinAt(rows, 2, width)).toBeNull();
    }
    // From 50 J3 refuses it too, and it stays refused.
    for (const width of [50, 51, 52]) {
      expect(joinAt(rows, 1, width)).toBeNull();
    }
    // The same split ON the last column is what a terminal wrap draws, and
    // joins (SPEC L12: refusal 8 left that row's path unlinked at the parent).
    expect(joinAt(rows, 1, 46)?.target).toBe('/r/projects/app/src/README.md.bak');
    // Short of the edge, every other path character ends the chain...
    for (const end of ['.', '_', '7', 'd', '~', '@']) {
      const top = `see /a/bbbbbbbbbbbb${end}`;
      expect(joinBoundary(drawn(top), drawn('cde.md is'), top.length + 2)).toBe(false);
    }
    // ...and a `-` or a `/` is an agent's break, as issue 40's rows are.
    expect(joinBoundary(drawn('see /a/bbbbbbbbbbbb-'), drawn('cde.md is'), 22)).toBe(true);
    expect(joinBoundary(drawn('see /a/bbbbbbbbbbbb/'), drawn('cde/f.md is'), 22)).toBe(true);
    expect(joinAt(ISSUE, 2, 47)?.target).toBe(FILE);
    // SPEC L4, the trade J7 keeps: a folder short of the edge above a row
    // that starts with a relative path is an agent's break after `/` to this
    // rule, whether or not the text meant it as one.
    expect(joinAt(['x', 'moved /r/app/src/', 'lib/util.ts today', 'y'], 2, 19)?.target).toBe(
      '/r/app/src/lib/util.ts'
    );
  });

  it('J8: a relative folder after other words, short of the last column, starts no join', () => {
    // The reverify's corpus shape: "src/" two cells short of the edge above a
    // row that starts with a relative path. The parent opened lib/util.ts on
    // the lower row; joining would open src/lib/util.ts instead. (His
    // absolute-only round: J10 refuses these relative rows whatever J8 does;
    // J8 still lives in the BOUNDARY, which is what these assertions read.)
    const relative = ['x', 'moved src/', 'lib/util.ts today', 'y'];
    for (const width of [11, 12, 13]) {
      expect(joinBoundary(drawn('moved src/'), drawn('lib/util.ts today'), width)).toBe(false);
      expect(joinAt(relative, 1, width)).toBeNull();
      expect(joinAt(relative, 2, width)).toBeNull();
    }
    // ON the last column it is a terminal wrap, and the boundary holds.
    // (Phase 347.1's fix round: at 10 columns `lib/util.ts` is 11 cells,
    // wider than the pane, which no repaint draws and J9 refuses, so the
    // lower row is one a 10-column pane can draw.) The chain it gives is
    // relative, so J10 offers it from no row...
    expect(joinBoundary(drawn('moved src/'), drawn('lib/a.ts'), 10)).toBe(true);
    for (const y of [1, 2]) expect(joinAt(['x', 'moved src/', 'lib/a.ts', 'y'], y, 10)).toBeNull();
    // ...and its absolute twin on the last column joins.
    expect(joinAt(['x', 'moved /r/src/', 'lib/a.ts', 'y'], 1, 13)?.target).toBe('/r/src/lib/a.ts');
    // An absolute folder, or ~/, in the same place still joins (J7's control).
    expect(joinAt(['x', 'moved /r/app/src/', 'lib/util.ts today', 'y'], 2, 19)?.target).toBe('/r/app/src/lib/util.ts');
    expect(joinBoundary(drawn('moved ~/app/src/'), drawn('lib/util.ts today'), 18)).toBe(true);
    expect(joinBoundary(drawn('moved `/r/app/src/'), drawn('lib/util.ts today'), 20)).toBe(true);
    // A relative folder that starts its row still passes the BOUNDARY (issue
    // 40's middle rows do)...
    // (A lower piece that fits the pane, as every drawn one does: J9.)
    expect(joinBoundary(drawn('src/'), drawn('lib/a.c'), 7)).toBe(true);
  });

  it('J8 in the boundary, b8-tilde-below: a `~/` path below a relative folder, which J11 refuses too', () => {
    // His absolute-only round (build/p3471/SPEC.md D16): the one absolute
    // shape J8 decided. `moved src/` stops one cell short of the edge;
    // `~/proj/xxx-` below it is on the last column, and J3 counts `~/` as two
    // cells, so every other clause admits the boundary, and J8 stops the walk
    // there. Since that round's fix round J11's top half refuses the `~/`
    // chain below it as well: the row above ends in `/`, where a breaker that
    // breaks after a `/` may have cut `src/~/proj/xxx-y.md`, and the whole of
    // `~/proj/xxx-` would not have fitted beside it. Without J8 the walk
    // glues `src/` on top, and J10 refuses the three rows whole: no row joins
    // either way, and J8 keeps its boundary.
    const rows = ['x', 'moved src/', '~/proj/xxx-', 'y.md now', 'z'];
    const width = 11;
    expect(joinBoundary(drawn('moved src/'), drawn('~/proj/xxx-'), width)).toBe(false);
    for (const y of [0, 1, 2, 3, 4]) expect(joinAt(rows, y, width), `row ${String(y)}`).toBeNull();
    // With the row above ending in a word instead, the `~/` path joins.
    const word = ['x', 'moved src', '~/proj/xxx-', 'y.md now', 'z'];
    for (const y of [2, 3]) {
      expect(joinAt(word, y, width), `row ${String(y)}`).toEqual({
        target: '~/proj/xxx-y.md',
        text: '~/proj/xxx-y.md',
        top: 2,
        bottom: 3,
        startColumn: 0,
        endColumn: 4
      });
    }
  });

  it('J10 at the chain top: a relative chain top is refused, wherever its folder sits and however it was broken', () => {
    // The second reverify's list shape: the folder heads its row after a
    // bullet, after indentation, or alone, ends short of the edge, and the
    // parent opened the folder itself. The lower row holds a `/`, so J5 (a
    // folder above a BARE name) does not decide it. J8 at the chain's top
    // refused it until his absolute-only round; J10 does now, short of the
    // edge AND on it, because the joined target is relative.
    for (const top of ['• docs/research/', '  docs/research/', 'docs/research/']) {
      const lower = top.startsWith('•') ? '• notes/a.md' : 'notes/a.md';
      const rows = ['x', top, lower, 'y'];
      expect(joinBoundary(drawn(top), drawn(lower), top.length + 1)).toBe(true);
      for (const width of [top.length + 1, top.length + 2]) {
        expect(joinAt(rows, 1, width)).toBeNull();
        expect(joinAt(rows, 2, width)).toBeNull();
      }
      // The absolute twin, the same folder under `/r/` in the same place,
      // joins from both rows.
      const abs = top.replace('docs/', '/r/docs/');
      const twin = ['x', abs, lower, 'y'];
      for (const width of [abs.length + 1, abs.length + 2]) {
        for (const y of [1, 2]) {
          expect(joinAt(twin, y, width)?.target, `${abs} at ${String(width)} row ${String(y)}`).toBe(
            '/r/docs/research/notes/a.md'
          );
        }
      }
    }
    // On the last column, a terminal wrap, the relative chain is refused too...
    for (const y of [1, 2]) expect(joinAt(['x', 'docs/research/', 'notes.md', 'y'], y, 14)).toBeNull();
    // ...and its absolute twin joins.
    expect(joinAt(['x', '/r/docs/research/', 'notes.md', 'y'], 1, 17)?.target).toBe('/r/docs/research/notes.md');
    // An absolute chain top short of the edge still joins (issue 40's shape).
    expect(joinAt(['x', '/r/docs/research/', 'notes/a.md', 'y'], 1, 18)?.target).toBe('/r/docs/research/notes/a.md');
  });

  it('J6 top: a join whose top row is buffer row 0 with its piece at the row’s head', () => {
    const rows = ['/Users/me/proj/aaa-', 'bbb.md', 'y'];
    const width = 19;
    expect(joinAt(rows, 1, width)).toBeNull();
    expect(joinAt(rows, 0, width)).toBeNull();
    // A row above it, and the same join opens.
    expect(joinAt(['x', ...rows], 2, width)?.target).toBe('/Users/me/proj/aaa-bbb.md');
    // Row 0 whose piece is NOT at its head: the path starts there.
    expect(joinAt(['see /Users/me/a-', 'bbb.md', 'y'], 1, 16)?.target).toBe('/Users/me/a-bbb.md');
  });

  it('J6 bottom: a join whose bottom row is the last row with its piece reaching its drawn end', () => {
    const rows = ['x', 'see /Users/me/proj/aaa-', 'bbb.md'];
    const width = rows[1]?.length ?? 0;
    expect(joinAt(rows, 1, width)).toBeNull();
    expect(joinAt(rows, 2, width)).toBeNull();
    // The same rows with one more below them, and the join opens.
    expect(joinAt([...rows, ''], 2, width)?.target).toBe('/Users/me/proj/aaa-bbb.md');
    // ...and on the last row with more after the piece.
    expect(joinAt(['x', rows[1] ?? '', 'bbb.md is done'], 2, width)?.target).toBe('/Users/me/proj/aaa-bbb.md');
  });

  it(`the row cap: ${String(MAX_JOIN_ROWS)} rows join, ${String(MAX_JOIN_ROWS + 1)} are refused whole and never cut short`, () => {
    expect(MAX_JOIN_ROWS).toBe(8);
    const width = 10;
    const nine = softWrap(`/u/${'abcdefghi/'.repeat(8)}z.md`, width);
    expect(nine).toHaveLength(MAX_JOIN_ROWS + 1);
    const rows = ['x', ...nine, ''];
    for (let y = 1; y <= nine.length; y += 1) expect(joinAt(rows, y, width)).toBeNull();
    const eight = softWrap(`/u/${'abcdefghi/'.repeat(7)}z.md`, width);
    expect(eight).toHaveLength(MAX_JOIN_ROWS);
    const control = ['x', ...eight, ''];
    for (let y = 1; y <= eight.length; y += 1) {
      expect(joinAt(control, y, width)).toMatchObject({ top: 1, bottom: MAX_JOIN_ROWS });
    }
  });

  it(`the character cap: ${String(MAX_JOIN_CHARS)} characters join, one more is refused`, () => {
    expect(MAX_JOIN_CHARS).toBe(1024);
    const width = 130;
    const pathOf = (n: number): string => {
      const body = '/u/' + 'abcdefghi/'.repeat(Math.floor((n - 3) / 10));
      return body + 'x'.repeat(n - body.length);
    };
    const over = pathOf(MAX_JOIN_CHARS + 1);
    const at = pathOf(MAX_JOIN_CHARS);
    expect([over.length, at.length]).toEqual([1025, 1024]);
    expect(softWrap(over, width).length).toBeLessThanOrEqual(MAX_JOIN_ROWS);
    expect(joinAt(['x', ...softWrap(over, width), ''], 1, width)).toBeNull();
    expect(joinAt(['x', ...softWrap(at, width), ''], 1, width)?.target).toBe(at);
  });
});

describe('the joined token meets the SAME grammar a row span meets', () => {
  it('refuses a join every boundary admits when the joined token is not spelled like a path', () => {
    const rows = ['x', 'see /Users/me/proj/aaa-', 'b:c d', 'y'];
    const width = rows[1]?.length ?? 0;
    expect(joinBoundary(drawn(rows[1] ?? ''), drawn(rows[2] ?? ''), width)).toBe(true);
    expect(joinAt(rows, 1, width)).toBeNull();
    expect(joinAt(rows, 2, width)).toBeNull();
    // The control: the same rows with a lower piece the grammar takes.
    expect(joinAt(['x', rows[1] ?? '', 'bc d', 'y'], 1, width)?.target).toBe('/Users/me/proj/aaa-bc');
  });

  it('answers no join when the strip leaves the token on one row, which is that row’s own span', () => {
    // `.` is a path character, so every boundary holds, and then the
    // sentence's full stop is stripped and nothing of the lower row is left.
    const rows = ['x', 'see /Users/me/proj/aaa', '.', 'y'];
    const width = rows[1]?.length ?? 0;
    expect(joinBoundary(drawn(rows[1] ?? ''), drawn('.'), width)).toBe(true);
    expect(joinAt(rows, 1, width)).toBeNull();
    expect(joinAt(rows, 2, width)).toBeNull();
    expect(joinAt(['x', rows[1] ?? '', '.md', 'y'], 1, width)?.target).toBe('/Users/me/proj/aaa.md');
  });
});

describe('PJ5 the range is in CELLS, not string indices', () => {
  it('draws a join under `⚠️ ` and under a wide glyph from the cells the path occupies', () => {
    // `⚠️` is one cell holding two units, so from it on the string index runs
    // one AHEAD of the column; `你` is two columns holding one unit, so it
    // runs one BEHIND.
    for (const [lead, shift] of [
      ['⚠️ ', -1],
      ['你 ', 1],
      ['xy ', 0]
    ] as const) {
      const top = `${lead}see /Users/me/proj/aaa-`;
      const row = drawn(top);
      const width = row.columns[top.length] ?? 0;
      const rows = ['x', top, 'bbb.md', 'y'];
      const got = joinAt(rows, 2, width);
      expect(got?.target).toBe('/Users/me/proj/aaa-bbb.md');
      expect(got?.startColumn).toBe(top.indexOf('/') + shift);
      expect(got?.endColumn).toBe(6);
    }
  });

  it('measures J3 from the upper row’s own map, so a decorated full row still reads as full', () => {
    const top = '⚠️ see /Users/me/proj/aaa-';
    const width = top.length - 1;
    expect(drawn(top).columns[top.length]).toBe(width);
    expect(joinBoundary(drawn(top), drawn('bbb.md'), width)).toBe(true);
  });

  it('fails closed on a row whose map does not reach its end', () => {
    const top = 'see /Users/me/proj/aaa-';
    const short: DrawnRow = { text: top, columns: [0, 1, 2] };
    expect(joinBoundary(short, drawn('bbb.md'), top.length)).toBe(false);
  });
});

describe('what the join reads, and what it never reads', () => {
  it('asks only for rows inside the buffer and within the caps of the hovered row', () => {
    const pieces = softWrap(PATH, 30);
    const rows = ['wrote it:', ...pieces, '', 'a', 'b', 'c'];
    const s = screen(rows);
    joinedPathAt(s.read, 2, s.last, 30);
    for (const i of s.asked) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(s.last);
      expect(Math.abs(i - 2)).toBeLessThanOrEqual(MAX_JOIN_ROWS + 1);
    }
  });

  it('answers the join ENDING on a row that also begins another, and the other from below', () => {
    // Both rows reach the last column. (Phase 347.1's fix round: the first
    // row was one cell wider than the pane, which no repaint draws and J9
    // refuses, so it is one `a` shorter.)
    const w = 19;
    const rows = ['x', 'go /Users/me/aaaaa-', 'bb.md go /Users/cc-', 'dd.md', 'y'];
    expect([rows[1]?.length, rows[2]?.length]).toEqual([w, w]);
    expect(joinAt(rows, 2, w)?.target).toBe('/Users/me/aaaaa-bb.md');
    expect(joinAt(rows, 3, w)?.target).toBe('/Users/cc-dd.md');
  });

  it('fails closed with no width at all', () => {
    expect(joinAt(ISSUE, 2, Number.NaN)).toBeNull();
  });

  it('never reads `isWrapped`, which research 115 §4 measured wrong after a repaint', () => {
    for (const rel of ['shared/path-spans.ts', 'renderer/terminal/path-links.ts']) {
      const code = stripComments(readFileSync(join(SRC, rel), 'utf8'));
      expect(code.includes('isWrapped'), rel).toBe(false);
    }
    // ...and the scan can see a read when there is one.
    expect(stripComments('const w = line.isWrapped;').includes('isWrapped')).toBe(true);
    expect(stripComments('// isWrapped is never read\nconst w = 1;').includes('isWrapped')).toBe(false);
  });
});
