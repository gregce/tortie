/**
 * THE WRAP MARKS (Phase 348, build/p348/SPEC.md §4.6 steps 15 and 16, D43 to
 * D46), driven against the SHIPPING src/main/screen/compose.ts, read.ts,
 * watch.ts and src/main/machines/remote-screen.ts.
 *
 * THE FIXTURES ARE REAL. {@link CAPTURES} is what scratch servers of the
 * vendored tmux 3.7b and Homebrew's 3.6a printed for §2.4's cases, drawn by a
 * program that writes one file's bytes into a 40 by 8 pane (G4b: 150 `L`s at
 * 60 columns, narrowed to 30, then redrawn; `history`: eight 33-character
 * lines at 20 by 4, read as a page with `-S - -E -`), captured on 2026-10-19
 * by the mac builder's scratch script (every server a `-L p348mac-…` socket
 * under its own directory, killed in a `finally`): `eF` is 3.7b's
 * `capture-pane -p -e -F`; `e`, `tn` and `j` are `-p -e`, `-p -T -N` and `-p
 * -J`, which 3.7b and 3.6a printed byte for byte alike in every case, and
 * `eF` with each prefix stripped is `e` in every case (§2.4's M4b, measured
 * again). 3.6a answered `-F` with `command capture-pane: unknown flag -F`.
 *
 * What each case must mark, by D45 (the ink guard, CORRECTED), and why:
 *   G1a 100 `A`s: rows 0 and 1, the line wrapped twice.
 *   G1b the same, row 0 rewritten `status: ok` and cleared to its end: row 1
 *       only; tmux keeps row 0's mark and its used cells, and the ink guard
 *       keeps a cleared tail off the next row (the width guard joined it).
 *   G2  a full-width overwrite with no erase: rows 0 and 1, the stale mark
 *       joined (stated, D46).
 *   G3  a whole-line clear of row 0: row 1 only.
 *   G5  60 `P`s, then a carriage return, up a row and `progress 50%`: row 0.
 *   atSpace 39 `x`, a written space in column 40, then text: NOTHING; tmux
 *       cannot tell a written space from a cleared cell, so the break is kept
 *       (today's Copy; stated, D46).
 *   alt the alternate screen: nothing, though tmux marks it.
 *   colourEnd a red space in the last column: nothing, a space is no ink.
 *   wideFits a wide character's right half in the last column: row 0.
 *   wideSpills a wide character that did not fit, the last column empty:
 *       nothing (a kept break, never a wrong join).
 *   G4b narrowed and redrawn short: nothing (the width guard joined three).
 *   history the page: every even row, its line's first half.
 *
 * And: `marksRoadOf` by version; the one prefix reader; the composer stripping
 * the prefix so the picture, the plain text and the window's mark are today's
 * byte for byte; the reads' argv on each road over the control client and a
 * spawned list, split by count from both ends; a marked read refused taken
 * once more without marks, with the owner told only when that one answered;
 * the owner's version read, once and again at a reconnect; the revision moving
 * on the marks alone and not at all for a read with none; and the far argv and
 * split. Nothing here starts a process.
 */

import { describe, expect, it } from 'vitest';
import type { PocketScreenRun } from '@shared/ipc/pocket';
import { remoteScreenArgv, remoteScrollbackArgv, splitRemoteRead } from '../../machines/remote-screen';
import {
  composePage,
  composeScreen,
  flaggedLineOf,
  MARKS_FALLBACK_SINCE,
  MARKS_FLAGS_SINCE,
  marksKeyOf,
  marksRoadOf,
  plainOf,
  windowMarkOf,
  wrapsOf
} from '../compose';
import {
  readScreenLocal,
  SCREEN_FORMAT,
  spawnedReadArgs,
  splitScrollbackMarkedRead,
  splitSpawnedMarkedRead,
  type MarksRoad,
  type ScreenCore,
  type ScreenDisplay,
  type ScreenMarks,
  type ScreenReading
} from '../read';
import { createScreenMarksRoads, NO_MARKS_ROADS, readingRevisionOf, SCREEN_MARKS_RETRY_MS } from '../watch';

// ---------------------------------------------------------------------------
// The real captures (see the header)
// ---------------------------------------------------------------------------

const CAPTURES = {
  G1a: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","W AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","- AAAAAAAAAAAAAAAAAAAA","- ","- ","- ","- ","- "],
    e: ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    tn: ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    j: ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","","","","",""]
  },
  G1b: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W status: ok","W AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","- AAAAAAAAAAAAAAAAAAAA","- ","- ","- ","- ","- "],
    e: ["status: ok","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    tn: ["status: ok                              ","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    j: ["status: ok                              AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","","","","",""]
  },
  G2: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","W short line twoAAAAAAAAAAAAAAAAAAAAAAAAAA","- AAAAAAAAAAAAAAAAAAAA","- ","- ","- ","- ","- "],
    e: ["BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","short line twoAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    tn: ["BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","short line twoAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    j: ["BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBshort line twoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","","","","",""]
  },
  G3: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["- status: ok","W AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","- AAAAAAAAAAAAAAAAAAAA","- ","- ","- ","- ","- "],
    e: ["status: ok","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    tn: ["status: ok","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    j: ["status: ok","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","","","","",""]
  },
  G5: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W progress 50%PPPPPPPPPPPPPPPPPPPPPPPPPPPP","- PPPPPPPPPPPPPPPPPPPP","- ","- ","- ","- ","- ","- "],
    e: ["progress 50%PPPPPPPPPPPPPPPPPPPPPPPPPPPP","PPPPPPPPPPPPPPPPPPPP","","","","","",""],
    tn: ["progress 50%PPPPPPPPPPPPPPPPPPPPPPPPPPPP","PPPPPPPPPPPPPPPPPPPP","","","","","",""],
    j: ["progress 50%PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP","","","","","",""]
  },
  atSpace: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","- after-the-space","- ","- ","- ","- ","- ","- "],
    e: ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","after-the-space","","","","","",""],
    tn: ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ","after-the-space","","","","","",""],
    j: ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx after-the-space","","","","","",""]
  },
  alt: {
    cols: 40, rows: 8, alternate: true, history: 0,
    eF: ["W AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","W AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","- AAAAAAAAAAAAAAAAAAAA","- ","- ","- ","- ","- "],
    e: ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    tn: ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAA","","","","",""],
    j: ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","","","","",""]
  },
  colourEnd: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W ccccccccccccccccccccccccccccccccccccccc\u001b[41m","- \u001b[49mnext","- ","- ","- ","- ","- ","- "],
    e: ["ccccccccccccccccccccccccccccccccccccccc\u001b[41m","\u001b[49mnext","","","","","",""],
    tn: ["ccccccccccccccccccccccccccccccccccccccc ","next","","","","","",""],
    j: ["ccccccccccccccccccccccccccccccccccccccc next","","","","","",""]
  },
  wideFits: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["WX wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww中","- tail","- ","- ","- ","- ","- ","- "],
    e: ["wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww中","tail","","","","","",""],
    tn: ["wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww中","tail","","","","","",""],
    j: ["wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww中tail","","","","","",""]
  },
  wideSpills: {
    cols: 40, rows: 8, alternate: false, history: 0,
    eF: ["W wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww","X 中tail","- ","- ","- ","- ","- ","- "],
    e: ["wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww","中tail","","","","","",""],
    tn: ["wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww","中tail","","","","","",""],
    j: ["wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww中tail","","","","","",""]
  },
  G4b: {
    cols: 30, rows: 8, alternate: false, history: 2,
    eF: ["W line 1","W line 2","- line 3","- line 4","- line 5","- line 6","- ","- "],
    e: ["line 1","line 2","line 3","line 4","line 5","line 6","",""],
    tn: ["line 1                        ","line 2                        ","line 3                        ","line 4","line 5","line 6","",""],
    j: ["line 1                        line 2                        line 3                        ","line 4","line 5","line 6","",""]
  },
  history: {
    cols: 20, rows: 4, alternate: false, history: 12,
    eF: ["W h0-abcdefghijklmnopq","- rstuvwxyz","W h1-abcdefghijklmnopq","- rstuvwxyz","W h2-abcdefghijklmnopq","- rstuvwxyz","W h3-abcdefghijklmnopq","- rstuvwxyz","W h4-abcdefghijklmnopq","- rstuvwxyz","W h5-abcdefghijklmnopq","- rstuvwxyz","W h6-abcdefghijklmnopq","- rstuvwxyz","W h7-abcdefghijklmnopq","- rstuvwxyz"],
    e: ["h0-abcdefghijklmnopq","rstuvwxyz","h1-abcdefghijklmnopq","rstuvwxyz","h2-abcdefghijklmnopq","rstuvwxyz","h3-abcdefghijklmnopq","rstuvwxyz","h4-abcdefghijklmnopq","rstuvwxyz","h5-abcdefghijklmnopq","rstuvwxyz","h6-abcdefghijklmnopq","rstuvwxyz","h7-abcdefghijklmnopq","rstuvwxyz"],
    tn: ["h0-abcdefghijklmnopq","rstuvwxyz","h1-abcdefghijklmnopq","rstuvwxyz","h2-abcdefghijklmnopq","rstuvwxyz","h3-abcdefghijklmnopq","rstuvwxyz","h4-abcdefghijklmnopq","rstuvwxyz","h5-abcdefghijklmnopq","rstuvwxyz","h6-abcdefghijklmnopq","rstuvwxyz","h7-abcdefghijklmnopq","rstuvwxyz"],
    j: ["h0-abcdefghijklmnopqrstuvwxyz","h1-abcdefghijklmnopqrstuvwxyz","h2-abcdefghijklmnopqrstuvwxyz","h3-abcdefghijklmnopqrstuvwxyz","h4-abcdefghijklmnopqrstuvwxyz","h5-abcdefghijklmnopqrstuvwxyz","h6-abcdefghijklmnopqrstuvwxyz","h7-abcdefghijklmnopqrstuvwxyz"]
  }
} as const;

type CaseName = keyof typeof CAPTURES;

/** What each case must mark, by D45 (the header says why). */
const EXPECTED: Readonly<Record<Exclude<CaseName, 'history'>, readonly number[]>> = {
  G1a: [0, 1],
  G1b: [1],
  G2: [0, 1],
  G3: [1],
  G5: [0],
  atSpace: [],
  alt: [],
  colourEnd: [],
  wideFits: [0],
  wideSpills: [],
  G4b: []
};

const LIVE = Object.keys(EXPECTED) as Exclude<CaseName, 'history'>[];

function displayOf(name: CaseName): ScreenDisplay {
  const c = CAPTURES[name];
  return {
    paneId: '%4',
    cols: c.cols,
    rows: c.rows,
    cursorX: 0,
    cursorY: 0,
    cursorVisible: true,
    alternate: c.alternate,
    history: c.history
  };
}

/** A reading of the case on one road, as the shipping reads build one. */
function readingOf(name: CaseName, road: MarksRoad): ScreenReading {
  const c = CAPTURES[name];
  const display = displayOf(name);
  const base = {
    display,
    displayLine: `%4\t${String(c.cols)}\t${String(c.rows)}\t0\t0\t1\t${c.alternate ? '1' : '0'}\t${String(c.history)}`,
    steady: true
  };
  if (road === 'flags') return { ...base, styled: c.eF.join('\n'), marks: { road: 'flags' } };
  if (road === 'fallback') return { ...base, styled: c.e.join('\n'), marks: { road: 'fallback', rows: [...c.tn], joined: [...c.j] } };
  return { ...base, styled: c.e.join('\n') };
}

const EXTRA = { turn: '0123456789abcdef-1', status: 'running', typable: true } as const;

function screenOf(r: ScreenReading, local = true): NonNullable<Exclude<ReturnType<typeof composeScreen>, 'large'>>['screen'] {
  const composed = composeScreen(r, { ...EXTRA, local });
  if (composed === 'large') throw new Error('large');
  return composed.screen;
}

// ---------------------------------------------------------------------------

describe('which captures carry the marks, by the running server’s version (D44)', () => {
  it('is flags from 3.7b, the fallback from 3.4, and none below or for any other spelling', () => {
    expect(MARKS_FLAGS_SINCE).toBe('3.7b');
    expect(MARKS_FALLBACK_SINCE).toBe('3.4');
    const table: [string | null, MarksRoad][] = [
      ['3.7b', 'flags'],
      ['3.7c', 'flags'],
      ['3.8', 'flags'],
      ['3.10', 'flags'],
      ['4.0', 'flags'],
      ['3.7a', 'fallback'],
      ['3.7', 'fallback'],
      ['3.6a', 'fallback'],
      ['3.5a', 'fallback'],
      ['3.4', 'fallback'],
      ['3.3a', 'none'],
      ['3.2a', 'none'],
      ['2.9', 'none'],
      [null, 'none'],
      ['', 'none'],
      ['next-3.8', 'none'],
      ['master', 'none'],
      ['3.7b ', 'none'],
      ['3.7B', 'none'],
      ['tmux 3.7b', 'none']
    ];
    for (const [version, road] of table) expect(marksRoadOf(version), String(version)).toBe(road);
  });
});

describe('the one reader of -F’s prefix', () => {
  it('reads the run of letters, or a dash, then one space, and nothing else', () => {
    expect(flaggedLineOf('- ')).toEqual({ letters: '-', text: '' });
    expect(flaggedLineOf('W abc')).toEqual({ letters: 'W', text: 'abc' });
    expect(flaggedLineOf('WX 中tail')).toEqual({ letters: 'WX', text: '中tail' });
    expect(flaggedLineOf('PW $ ls')).toEqual({ letters: 'PW', text: '$ ls' });
    expect(flaggedLineOf('DHOPWX  two spaces')).toEqual({ letters: 'DHOPWX', text: ' two spaces' });
    for (const line of ['abc', 'W', 'w abc', 'Q abc', '-abc', '', ' W x']) expect(flaggedLineOf(line), line).toBeNull();
  });
});

describe('the marks over the real captures (§2.4, D45 CORRECTED)', () => {
  for (const name of LIVE) {
    it(`${name}: ${JSON.stringify(EXPECTED[name])} on the flags road (3.7b) and on the fallback (3.6a, and 3.7b's own)`, () => {
      const flagged = screenOf(readingOf(name, 'flags'));
      const folded = screenOf(readingOf(name, 'fallback'));
      expect(flagged.wraps ?? [], 'flags').toEqual(EXPECTED[name]);
      expect(folded.wraps ?? [], 'fallback').toEqual(EXPECTED[name]);
      // An empty list is no key at all, so a screen with no marks is today's bytes.
      if (EXPECTED[name].length === 0) {
        expect('wraps' in flagged).toBe(false);
        expect('wraps' in folded).toBe(false);
      }
    });
  }

  it('the flags road composes today’s picture byte for byte: the prefix is stripped before anything reads the rows', () => {
    for (const name of LIVE) {
      const plain = readingOf(name, 'none');
      const flagged = readingOf(name, 'flags');
      const today = screenOf(plain);
      const marked = screenOf(flagged);
      expect(marked.lines, name).toEqual(today.lines);
      expect(marked.styles, name).toEqual(today.styles);
      expect(plainOf(flagged), name).toBe(plainOf(plain));
      expect(windowMarkOf(plainOf(flagged)), name).toBe(windowMarkOf(plainOf(plain)));
      expect(marked.dialog, name).toBe(today.dialog);
      expect(marked.asking, name).toBe(today.asking);
    }
  });

  it('marks nothing on the alternate screen, though tmux marks it there too', () => {
    expect(CAPTURES.alt.eF.slice(0, 2).every((line) => line.startsWith('W '))).toBe(true);
    expect(screenOf(readingOf('alt', 'flags')).wraps).toBeUndefined();
    expect(screenOf(readingOf('alt', 'fallback')).wraps).toBeUndefined();
  });

  it('marks nothing with no road, or with a reading that says none', () => {
    for (const name of LIVE) {
      expect(screenOf(readingOf(name, 'none')).wraps, name).toBeUndefined();
      expect(screenOf({ ...readingOf(name, 'none'), marks: { road: 'none' } }).wraps, name).toBeUndefined();
    }
  });

  it('the page: every even row of the history, its line’s first half, and never the page’s last row', () => {
    const c = CAPTURES.history;
    expect(c.eF).toHaveLength(16);
    const want = { from: 0, count: 16, keep: 'top' as const };
    const flags = composePage(c.eF.join('\n'), 0, c.cols, want, { road: 'flags' });
    const folded = composePage(c.e.join('\n'), 0, c.cols, want, { road: 'fallback', rows: [...c.tn], joined: [...c.j] });
    const plain = composePage(c.e.join('\n'), 0, c.cols, want);
    expect(flags.wraps).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(folded.wraps).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(plain.wraps).toEqual([]);
    expect(flags.rows).toEqual(plain.rows);
    // A page cut to rows 5 to 9: indices into ITS rows, its last row (index 4,
    // row 9, which tmux did not mark) never listed whatever it held.
    const cut = composePage(c.eF.join('\n'), 0, c.cols, { from: 5, count: 5, keep: 'top' }, { road: 'flags' });
    expect(cut.from).toBe(5);
    expect(cut.wraps).toEqual([1, 3]);
    // Rows 4 to 8: row 8's mark is the page's last row, and is not listed.
    const ending = composePage(c.eF.join('\n'), 0, c.cols, { from: 4, count: 5, keep: 'top' }, { road: 'flags' });
    expect(ending.wraps).toEqual([0, 2]);
    // A capture that starts mid-history: the page's first line is index 2.
    const later = composePage(c.eF.slice(2).join('\n'), 2, c.cols, { from: 2, count: 6, keep: 'top' }, { road: 'flags' });
    expect(later.wraps).toEqual([0, 2, 4]);
  });
});

describe('wrapsOf, clause by clause', () => {
  const run = (text: string, cells = Array.from(text).length): PocketScreenRun => ({ text, style: 0, cells });
  const rowsOf = (n: number, fill: (k: number) => PocketScreenRun[]): PocketScreenRun[][] =>
    Array.from({ length: n }, (_, k) => fill(k));

  it('reads ink in the last column off the composed cells: a space, a tab and a short row are not ink', () => {
    const marks: ScreenMarks = { road: 'flags' };
    const captured = ['W a', 'W b', 'W c', 'W d', 'W e', '- f'];
    const lines = [
      [run('abcd')], // ink
      [run('abc '), run(' ', 1)], // a space in the last column
      [run('ab'), run('\t', 2)], // a tab spanning to the end
      [run('abc')], // short of the last column
      [run('ab'), run('中', 2)], // a wide character's right half
      [run('zzzz')] // the last row
    ];
    expect(wrapsOf({ marks, captured, lines }, 4, false)).toEqual([0, 4]);
  });

  it('never marks the last row, and reads the first composed row as the captured line `first`', () => {
    const marks: ScreenMarks = { road: 'flags' };
    const captured = ['W aaaa', 'W bbbb', 'W cccc', 'W dddd'];
    const full = rowsOf(4, (k) => [run('abcd'.charAt(k).repeat(4))]);
    expect(wrapsOf({ marks, captured, lines: full }, 4, false)).toEqual([0, 1, 2]);
    expect(wrapsOf({ marks, captured, lines: full.slice(0, 2), first: 2 }, 4, false)).toEqual([0]);
    expect(wrapsOf({ marks, captured, lines: full }, 4, true)).toEqual([]);
  });

  it('marks nothing when a line of the flags road has no prefix: the capture is not what the road says', () => {
    const lines = rowsOf(3, () => [run('abcd')]);
    expect(wrapsOf({ marks: { road: 'flags' }, captured: ['W abcd', 'abcd', '- abcd'], lines }, 4, false)).toEqual([]);
    expect(wrapsOf({ marks: undefined, captured: ['W abcd', 'W abcd', '- abcd'], lines }, 4, false)).toEqual([]);
  });

  it('on the fallback, a line its rows do not consume exactly marks none of its rows, and the walk goes on', () => {
    const lines = rowsOf(6, () => [run('abcd')]);
    // Line 1 disagrees with its rows (the screen moved between the captures):
    // row 2, taken for it, is not marked; the walk goes on at line 2 from where
    // it stood (row 3), and line 3 aligns again and marks row 4.
    const marks: ScreenMarks = {
      road: 'fallback',
      rows: ['abcd', 'efgh', 'ijkl', 'mnop', 'qrst', 'uvwx'],
      joined: ['abcdefgh', 'ijklZZZZ', 'mnop', 'qrstuvwx']
    };
    expect(wrapsOf({ marks, captured: ['', '', '', '', '', ''], lines }, 4, false)).toEqual([0, 4]);
    // The rows must be as many as the styled capture's lines, or nothing is marked.
    const short: ScreenMarks = { road: 'fallback', rows: ['abcd', 'efgh'], joined: ['abcdefgh'] };
    expect(wrapsOf({ marks: short, captured: ['', '', '', '', '', ''], lines }, 4, false)).toEqual([]);
    // A row with no text continues no line.
    const empty: ScreenMarks = { road: 'fallback', rows: ['', 'abcd'], joined: ['abcd'] };
    expect(wrapsOf({ marks: empty, captured: ['', ''], lines: rowsOf(2, () => [run('abcd')]) }, 4, false)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The reads on each road
// ---------------------------------------------------------------------------

const DLINE = (rows = 3, history = 0): string => ['%3', '4', String(rows), '0', '0', '1', '0', String(history)].join('\t');

/** A control client that answers each command by its verb and records each line. */
function control(answer: (command: string) => string[] | Error, connected = true) {
  const written: string[] = [];
  return {
    written,
    control: {
      connected,
      sendCommand(command: string): Promise<string[]> {
        written.push(command);
        const value = answer(command);
        return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
      }
    }
  };
}

function coreOf(c: ScreenCore['control']): ScreenCore {
  return {
    listSessions: () => [],
    tmuxIdOf: () => '$7',
    manifest: { getSession: () => undefined },
    control: c,
    activity: { noteUserInput: () => undefined }
  };
}

const DISPLAY = `display-message -p -t $7 '${SCREEN_FORMAT}'`;

describe('the live read on each road, over the control client (D44)', () => {
  it('flags: the styled capture takes -F, nothing else moves, and the reading says its lines carry the letters', async () => {
    const c = control((cmd) => (cmd.startsWith('display') ? [DLINE()] : ['W abcd', '- ef', '- ']));
    const reading = await readScreenLocal(coreOf(c.control), '$7', { road: 'flags' });
    expect(c.written).toEqual([DISPLAY, 'capture-pane -p -e -F -t $7', DISPLAY]);
    expect(reading?.marks).toEqual({ road: 'flags' });
    expect(reading?.styled).toBe('W abcd\n- ef\n- ');
  });

  it('fallback: -T -N and -J ride the same statement between the capture and the second display', async () => {
    const c = control((cmd) => {
      if (cmd.startsWith('display')) return [DLINE()];
      if (cmd.includes('-T -N')) return ['abcd', 'ef', ''];
      if (cmd.includes('-J')) return ['abcdef', ''];
      return ['abcd', 'ef', ''];
    });
    const reading = await readScreenLocal(coreOf(c.control), '$7', { road: 'fallback' });
    expect(c.written).toEqual([DISPLAY, 'capture-pane -p -e -t $7', 'capture-pane -p -T -N -t $7', 'capture-pane -p -J -t $7', DISPLAY]);
    expect(reading?.marks).toEqual({ road: 'fallback', rows: ['abcd', 'ef', ''], joined: ['abcdef', ''] });
    expect(reading?.styled).toBe('abcd\nef\n');
  });

  it('none: today’s three lines, and a reading with no marks key at all', async () => {
    const c = control((cmd) => (cmd.startsWith('display') ? [DLINE()] : ['abcd', 'ef', '']));
    const reading = await readScreenLocal(coreOf(c.control), '$7');
    expect(c.written).toEqual([DISPLAY, 'capture-pane -p -e -t $7', DISPLAY]);
    expect(reading).not.toBeNull();
    expect('marks' in (reading ?? {})).toBe(false);
  });

  it('a fallback line refused drops only the marks, keeps the picture, and tells the owner', async () => {
    let told = 0;
    const c = control((cmd) => {
      if (cmd.startsWith('display')) return [DLINE()];
      if (cmd.includes('-J')) return new Error('%error');
      return ['abcd', 'ef', ''];
    });
    const reading = await readScreenLocal(coreOf(c.control), '$7', { road: 'fallback', onRoadRefused: () => (told += 1) });
    expect(reading?.styled).toBe('abcd\nef\n');
    expect(reading?.marks).toBeUndefined();
    expect(told).toBe(1);
  });

  it('a -F capture refused is taken once more without marks, and the owner is told only when that one answers', async () => {
    let told = 0;
    const c = control((cmd) => {
      if (cmd.startsWith('display')) return [DLINE()];
      if (cmd.includes('-F')) return new Error('%error unknown flag');
      return ['abcd', 'ef', ''];
    });
    const reading = await readScreenLocal(coreOf(c.control), '$7', { road: 'flags', onRoadRefused: () => (told += 1) });
    expect(c.written).toEqual([
      DISPLAY,
      'capture-pane -p -e -F -t $7',
      DISPLAY,
      DISPLAY,
      'capture-pane -p -e -t $7',
      DISPLAY
    ]);
    expect(reading?.styled).toBe('abcd\nef\n');
    expect(reading?.marks).toBeUndefined();
    expect(told).toBe(1);
    // Both refused: nothing answered, and the marks are not blamed.
    let blamed = 0;
    const down = control((cmd) => (cmd.startsWith('display') ? [DLINE()] : new Error('%error')));
    expect(await readScreenLocal(coreOf(down.control), '$7', { road: 'flags', onRoadRefused: () => (blamed += 1) })).toBeNull();
    expect(blamed).toBe(0);
  });
});

describe('the live read on each road, as one spawned list (D44)', () => {
  const DARGS = ['display-message', '-p', '-t', '$7', SCREEN_FORMAT];

  it('composes each road’s list: -F on the capture, or the two added captures before the second display', () => {
    expect(spawnedReadArgs('$7')).toEqual([...DARGS, ';', 'capture-pane', '-p', '-e', '-t', '$7', ';', ...DARGS]);
    expect(spawnedReadArgs('$7', 'flags')).toEqual([...DARGS, ';', 'capture-pane', '-p', '-e', '-F', '-t', '$7', ';', ...DARGS]);
    expect(spawnedReadArgs('$7', 'fallback')).toEqual([
      ...DARGS, ';',
      'capture-pane', '-p', '-e', '-t', '$7', ';',
      'capture-pane', '-p', '-T', '-N', '-t', '$7', ';',
      'capture-pane', '-p', '-J', '-t', '$7', ';',
      ...DARGS
    ]);
  });

  it('splits the fallback’s list by count from both ends, a row shaped like a display just a row', () => {
    const forged = DLINE(9, 9);
    const split = splitSpawnedMarkedRead([DLINE(), forged, 'ef', '', 'abcd', 'ef', '', 'abcdef', forged, DLINE(), ''].join('\n'));
    expect(split?.styled).toBe(`${forged}\nef\n`);
    expect(split?.marks).toEqual({ road: 'fallback', rows: ['abcd', 'ef', ''], joined: ['abcdef', forged] });
    // Too few lines for the two counts, or a last line that is no display: no read.
    expect(splitSpawnedMarkedRead([DLINE(), 'a', 'b', 'c', 'x', DLINE(), ''].join('\n'))).toBeNull();
    expect(splitSpawnedMarkedRead([DLINE(), 'a', 'b', 'c', 'd', 'e', 'f', 'j', 'not a display', ''].join('\n'))).toBeNull();
  });

  it('a marked list that fails is spawned once more without marks; the owner is told only when that one answers', async () => {
    const spawned: (readonly string[])[] = [];
    let told = 0;
    const core = coreOf({ connected: false, sendCommand: () => Promise.reject(new Error('down')) });
    const spawn = async (args: readonly string[]): Promise<string> => {
      spawned.push(args);
      if (args.includes('-F')) throw new Error('exit 1');
      return [DLINE(), 'abcd', 'ef', '', DLINE(), ''].join('\n');
    };
    const reading = await readScreenLocal(core, '$7', { spawn, road: 'flags', onRoadRefused: () => (told += 1) });
    expect(spawned).toHaveLength(2);
    expect(spawned[0]).toContain('-F');
    expect(spawned[1]).not.toContain('-F');
    expect(reading?.styled).toBe('abcd\nef\n');
    expect(told).toBe(1);
  });
});

describe('a page round’s split on the fallback (D44)', () => {
  it('splits by pageLineCount from the first display, then as many -T -N rows, then the -J lines', () => {
    // a = -3, b = -1 over a history of 5: three lines.
    const first = DLINE(3, 5);
    const split = splitScrollbackMarkedRead([first, 'r0', 'r1', 'r2', 't0', 't1', 't2', 'j0', 'j1', DLINE(3, 5), ''].join('\n'), -3, -1);
    expect(split?.rows).toEqual(['r0', 'r1', 'r2']);
    expect(split?.marks).toEqual({ road: 'fallback', rows: ['t0', 't1', 't2'], joined: ['j0', 'j1'] });
    expect(splitScrollbackMarkedRead([first, 'r0', 'r1', 'r2', 't0', DLINE(3, 5), ''].join('\n'), -3, -1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The owner, and the revision
// ---------------------------------------------------------------------------

describe('the marks’ owner (D44)', () => {
  function emitter() {
    const listeners: (() => void)[] = [];
    return {
      connected: true,
      sendCommand: (): Promise<string[]> => Promise.resolve([]),
      on(event: 'connected', listener: () => void): unknown {
        if (event === 'connected') listeners.push(listener);
        return this;
      },
      fire(): void {
        for (const l of listeners) l();
      },
      count: (): number => listeners.length
    };
  }

  it('reads this Mac’s version ONCE, answers none until it lands, and reads again at a reconnect', async () => {
    const versions = ['3.7b', '3.6a'];
    let reads = 0;
    const owner = createScreenMarksRoads({
      readVersion: async () => {
        reads += 1;
        return versions[reads - 1] ?? null;
      },
      farVersion: () => null
    });
    const c = emitter();
    const core = coreOf(c);
    expect(owner.local(core)).toBe('none');
    expect(owner.local(core)).toBe('none');
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(core)).toBe('flags');
    expect(reads).toBe(1);
    expect(c.count()).toBe(1);
    c.fire();
    expect(owner.local(core)).toBe('none');
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(core)).toBe('fallback');
    expect(reads).toBe(2);
    // One listener per control client, however often it is asked.
    expect(c.count()).toBe(1);
  });

  it('a refusal holds this Mac’s road at none until the version is read again', async () => {
    const owner = createScreenMarksRoads({ readVersion: async () => '3.7b' });
    const c = emitter();
    owner.local(coreOf(c));
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('flags');
    owner.localRefused();
    expect(owner.local(coreOf(c))).toBe('none');
    c.fire();
    owner.local(coreOf(c));
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('flags');
  });

  it('a version read that fails reads no marks, and a read from before a reconnect lands on nothing', async () => {
    let release: (v: string | null) => void = () => undefined;
    const owner = createScreenMarksRoads({
      readVersion: () =>
        new Promise<string | null>((resolve) => {
          release = resolve;
        })
    });
    const c = emitter();
    expect(owner.local(coreOf(c))).toBe('none');
    const stale = release;
    c.fire();
    expect(owner.local(coreOf(c))).toBe('none');
    const fresh = release;
    stale('3.7b');
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('none');
    fresh(null);
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('none');
    const failing = createScreenMarksRoads({ readVersion: async () => Promise.reject(new Error('no server')) });
    failing.local(coreOf(emitter()));
    await Promise.resolve();
    await Promise.resolve();
    expect(failing.local(coreOf(emitter()))).toBe('none');
  });

  it('reads a machine’s road from the version noted for it, a refusal held while it reports that version', () => {
    const noted = new Map<string, string | null>([['m1', '3.7b'], ['m2', '3.4']]);
    const owner = createScreenMarksRoads({ readVersion: async () => null, farVersion: (id) => noted.get(id) ?? null });
    expect(owner.far('m1')).toBe('flags');
    expect(owner.far('m2')).toBe('fallback');
    expect(owner.far('m3')).toBe('none');
    owner.farRefused('m1');
    expect(owner.far('m1')).toBe('none');
    expect(owner.far('m2')).toBe('fallback');
    noted.set('m1', '3.7c');
    expect(owner.far('m1')).toBe('flags');
  });

  // THE FIX ROUND (2026-10-19): nothing transient turns the marks off for good. The fixer's live run measured one
  // marked read failing under a load average near 600, the plain read answering, and the marks staying off for the
  // rest of the run, so Copy's join was lost; a refusal is now held for SCREEN_MARKS_RETRY_MS, and a version read that
  // named nothing is asked again after it.
  it('a refusal on this Mac is held for SCREEN_MARKS_RETRY_MS, then the road is tried again', async () => {
    let clock = 1_000;
    const owner = createScreenMarksRoads({ readVersion: async () => '3.7b', now: () => clock });
    const c = emitter();
    owner.local(coreOf(c));
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('flags');
    owner.localRefused();
    expect(owner.local(coreOf(c))).toBe('none');
    clock += SCREEN_MARKS_RETRY_MS - 1;
    expect(owner.local(coreOf(c))).toBe('none');
    clock += 1;
    expect(owner.local(coreOf(c))).toBe('flags');
    // A second refusal holds it again, from its own moment.
    owner.localRefused();
    clock += SCREEN_MARKS_RETRY_MS / 2;
    expect(owner.local(coreOf(c))).toBe('none');
    clock += SCREEN_MARKS_RETRY_MS / 2;
    expect(owner.local(coreOf(c))).toBe('flags');
  });

  it('a version read that named nothing is asked again after SCREEN_MARKS_RETRY_MS, and one in flight is never doubled', async () => {
    let clock = 0;
    let reads = 0;
    const owner = createScreenMarksRoads({
      // The first read names no version; every later one names 3.7b.
      readVersion: async () => {
        reads += 1;
        return reads === 1 ? null : '3.7b';
      },
      now: () => clock
    });
    const c = emitter();
    expect(owner.local(coreOf(c))).toBe('none');
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('none');
    expect(reads).toBe(1);
    clock += SCREEN_MARKS_RETRY_MS - 1;
    expect(owner.local(coreOf(c))).toBe('none');
    expect(reads).toBe(1);
    clock += 1;
    // The hold is over: ONE read is asked again, and none more while it is in flight.
    expect(owner.local(coreOf(c))).toBe('none');
    expect(owner.local(coreOf(c))).toBe('none');
    expect(reads).toBe(2);
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('flags');
    expect(reads).toBe(2);
  });

  it('a version read that failed (rejected) is asked again after the hold too', async () => {
    let clock = 0;
    let reads = 0;
    const owner = createScreenMarksRoads({
      readVersion: () => {
        reads += 1;
        return reads === 1 ? Promise.reject(new Error('busy')) : Promise.resolve('3.6a');
      },
      now: () => clock
    });
    const c = emitter();
    owner.local(coreOf(c));
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('none');
    clock += SCREEN_MARKS_RETRY_MS;
    owner.local(coreOf(c));
    await Promise.resolve();
    await Promise.resolve();
    expect(owner.local(coreOf(c))).toBe('fallback');
    expect(reads).toBe(2);
  });

  it('a machine\'s refusal is held for SCREEN_MARKS_RETRY_MS while it reports that version, then its road is tried again', () => {
    let clock = 5;
    const noted = new Map<string, string | null>([['m1', '3.7b']]);
    const owner = createScreenMarksRoads({ readVersion: async () => null, farVersion: (id) => noted.get(id) ?? null, now: () => clock });
    owner.farRefused('m1');
    expect(owner.far('m1')).toBe('none');
    clock += SCREEN_MARKS_RETRY_MS - 1;
    expect(owner.far('m1')).toBe('none');
    clock += 1;
    expect(owner.far('m1')).toBe('flags');
  });

  it('the owner with nothing handed reads no marks anywhere and reads no version', () => {
    expect(NO_MARKS_ROADS.local(coreOf(emitter()))).toBe('none');
    expect(NO_MARKS_ROADS.far('m1')).toBe('none');
    expect(Object.isFrozen(NO_MARKS_ROADS)).toBe(true);
  });
});

describe('the revision hashes the marks the read carried (D43)', () => {
  it('a read with no marks hashes exactly as before this phase; the marks alone move it', () => {
    const plain = readingOf('G1a', 'none');
    const same = readingRevisionOf('s', plain, 't', false, true);
    expect(readingRevisionOf('s', { ...plain, marks: { road: 'none' } }, 't', false, true)).toBe(same);
    expect(marksKeyOf(plain)).toBe('');
    // The fallback's -J alone moved: the styled capture is the same, the marks are not.
    const folded = readingOf('G1a', 'fallback');
    const moved: ScreenReading = {
      ...folded,
      marks: { road: 'fallback', rows: [...CAPTURES.G1a.tn], joined: [CAPTURES.G1a.tn[0] ?? '', CAPTURES.G1a.tn[1] ?? '', CAPTURES.G1a.tn[2] ?? '', '', '', '', '', ''] }
    };
    expect(folded.styled).toBe(moved.styled);
    expect(readingRevisionOf('s', folded, 't', false, true)).not.toBe(readingRevisionOf('s', moved, 't', false, true));
    expect(readingRevisionOf('s', folded, 't', false, true)).not.toBe(same);
    expect(marksKeyOf(folded)).toBe('fallback:0,1');
    expect(marksKeyOf(readingOf('G1a', 'flags'))).toBe('flags:0,1');
  });
});

describe('the far reads on each road (D44)', () => {
  const D = ['display-message', '-p', '-t', '$3', SCREEN_FORMAT];

  it('the live read: -F on the capture, or the two added captures, in ONE argv', () => {
    expect(remoteScreenArgv('$3')).toEqual([...D, ';', 'capture-pane', '-p', '-e', '-t', '$3', ';', ...D]);
    expect(remoteScreenArgv('$3', 'flags')).toEqual([...D, ';', 'capture-pane', '-p', '-e', '-F', '-t', '$3', ';', ...D]);
    expect(remoteScreenArgv('$3', 'fallback')).toEqual([
      ...D, ';',
      'capture-pane', '-p', '-e', '-t', '$3', ';',
      'capture-pane', '-p', '-T', '-N', '-t', '$3', ';',
      'capture-pane', '-p', '-J', '-t', '$3', ';',
      ...D
    ]);
    expect(() => remoteScreenArgv('%3', 'flags')).toThrow();
  });

  it('the page: -F on the capture, or the range’s two added captures', () => {
    const range = ['-S', '-10', '-E', '-1'];
    expect(remoteScrollbackArgv('$3', -10, -1, 'flags')).toEqual([...D, ';', 'capture-pane', '-p', '-e', '-F', '-t', '$3', ...range, ';', ...D]);
    expect(remoteScrollbackArgv('$3', -10, -1, 'fallback')).toEqual([
      ...D, ';',
      'capture-pane', '-p', '-e', '-t', '$3', ...range, ';',
      'capture-pane', '-p', '-T', '-N', '-t', '$3', ...range, ';',
      'capture-pane', '-p', '-J', '-t', '$3', ...range, ';',
      ...D
    ]);
    expect(() => remoteScrollbackArgv('$3', 0.5, -1, 'flags')).toThrow();
  });

  it('splits the far answer by its road: flags as today with its letters, the fallback from both ends', () => {
    const stdout = [DLINE(), 'W abcd', '- ef', '- ', DLINE(), ''].join('\n');
    expect(splitRemoteRead(stdout, 'flags')?.marks).toEqual({ road: 'flags' });
    expect(splitRemoteRead(stdout)?.marks).toBeUndefined();
    const folded = splitRemoteRead([DLINE(), 'abcd', 'ef', '', 'abcd', 'ef', '', 'abcdef', '', DLINE(), ''].join('\n'), 'fallback');
    expect(folded?.styled).toBe('abcd\nef\n');
    expect(folded?.marks).toEqual({ road: 'fallback', rows: ['abcd', 'ef', ''], joined: ['abcdef', ''] });
    expect(splitRemoteRead([DLINE(), 'abcd', DLINE(), ''].join('\n'), 'fallback')).toBeNull();
  });
});
