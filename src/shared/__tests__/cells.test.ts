/**
 * tmux's own cells (Phase 337, build/p337/SPEC.md §5.3.4, D10, §14 M5 and M6):
 * the generated width table IS the committed measurement of tmux 3.7b, range
 * for range and code point for code point (all 260,031); the 4,515 code points
 * Homebrew's 3.6a draws differently are pinned, run by run; plane 14's three
 * zero ranges, which the screen builder measured, hold; and the seven sequence
 * rules agree with tmux 3.7b on every one of the 281 committed sequences.
 * Every test text is built from code points at run time.
 *
 * Phase 368 (build/p368/SPEC.md §4.2, D7 to D9) moved the two modules to
 * src/shared and this file with them, and adds: the second literal,
 * `SCANNED_36A`, IS the committed measurement of Homebrew's 3.6a the same way;
 * `cellWidthIn` answers each build's own width for every measured code point;
 * `cellWidthsForServer` names a table for those two versions and no other;
 * the sequence rules agree with 3.6a's measurement too; and `nextCell`, the
 * one spelling of the seven rules, cuts every row exactly as the Phase 337
 * loop it replaced did. That loop is kept below as the ORACLE, word for word
 * but for its width, which it reads from the fixture rather than from the
 * module, so it is a second reading of both the rules and the table.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CELL_WIDTH_TABLES,
  cellWidthIn,
  cellWidthOf,
  cellWidthsForServer,
  SCANNED_LAST,
  type CellWidthTable
} from '../cell-widths';
import { cellsOf, clusterCells, nextCell, NO_CELL, type CellState, type TaggedCell, type TaggedPoint } from '../cells';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FIXTURES = join(ROOT, 'build', 'fixtures', 'screen');

interface WidthsFixture {
  codePoints: number;
  builds: Record<CellWidthTable, { tally: Record<string, number>; ranges: [number, number, number][] }>;
}
interface SequencesFixture {
  cases: Record<string, Record<CellWidthTable, number | string>>;
}

const WIDTHS = JSON.parse(readFileSync(join(FIXTURES, 'tmux-widths.json'), 'utf8')) as WidthsFixture;
const SEQUENCES = JSON.parse(readFileSync(join(FIXTURES, 'tmux-sequences.json'), 'utf8')) as SequencesFixture;
const BUILDS: readonly CellWidthTable[] = ['3.7b', '3.6a'];

const cp = (...points: number[]): string => String.fromCodePoint(...points);

/** The 22 runs where 3.6a disagrees with 3.7b: [first, last, 3.7b, 3.6a] (§14 M6). */
const DIFFERENCES_36A: [number, number, number, number][] = [
  [0x1acf, 0x1add, 1, 0],
  [0x1ae0, 0x1aeb, 1, 0],
  [0x10efa, 0x10efb, 1, 0],
  [0x11b60, 0x11b67, 1, 0],
  [0x16ff2, 0x16ff6, 1, 2],
  [0x187f8, 0x187ff, 1, 2],
  [0x18d09, 0x18d1e, 1, 2],
  [0x18d80, 0x18df2, 1, 2],
  [0x1e6e3, 0x1e6e3, 1, 0],
  [0x1e6e6, 0x1e6e6, 1, 0],
  [0x1e6ee, 0x1e6ef, 1, 0],
  [0x1e6f5, 0x1e6f5, 1, 0],
  [0x1f6d8, 0x1f6d8, 1, 2],
  [0x1fa8a, 0x1fa8a, 1, 2],
  [0x1fa8e, 0x1fa8e, 1, 2],
  [0x1fac8, 0x1fac8, 1, 2],
  [0x1facd, 0x1facd, 1, 2],
  [0x1faea, 0x1faea, 1, 2],
  [0x1faef, 0x1faef, 1, 2],
  [0x2b73a, 0x2b73f, 1, 2],
  [0x2cea2, 0x2cead, 1, 2],
  [0x323b0, 0x33479, 1, 2]
];

describe('the spec step’s three measurements, copied verbatim (build/p337/SPEC.md §7.4)', () => {
  it('each file is byte for byte the one the spec step wrote, by its sha256', () => {
    const sha = (name: string): string => createHash('sha256').update(readFileSync(join(FIXTURES, name))).digest('hex');
    expect(sha('tmux-widths.json')).toBe('ae96c8ec2e189e5786445ee8f16ca8c18fbcbcba43a964627598ae9ccdaed2e2');
    expect(sha('tmux-sequences.json')).toBe('e4857e6e3a0b7601efca519477fbf461600e46845d87af5360dc2feb5eed239e');
    expect(sha('keys-encoding.json')).toBe('5ca195b198602f2ac3dc9b2ce895fbd50909ee830caa5a01844e4b6bf7bb627d');
  });
});

describe('the width table is tmux 3.7b’s, measured', () => {
  it('the generated literal is the fixture’s 925 ranges, flattened, in order', () => {
    const ranges = WIDTHS.builds['3.7b'].ranges;
    expect(ranges).toHaveLength(925);
    expect([...CELL_WIDTH_TABLES.scanned]).toEqual(ranges.flat());
    expect(Object.isFrozen(CELL_WIDTH_TABLES.scanned)).toBe(true);
    expect(Object.isFrozen(CELL_WIDTH_TABLES.plane14Zero)).toBe(true);
  });

  it('cellWidthOf answers 3.7b’s width for every one of the 260,031 measured code points', () => {
    let checked = 0;
    let wrong = 0;
    const tally: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    for (const [start, end, width] of WIDTHS.builds['3.7b'].ranges) {
      for (let c = start; c <= end; c += 1) {
        const got = cellWidthOf(c);
        if (got !== width) wrong += 1;
        tally[got] = (tally[got] ?? 0) + 1;
        checked += 1;
      }
    }
    expect(checked).toBe(WIDTHS.codePoints);
    expect(checked).toBe(260_031);
    expect(wrong).toBe(0);
    expect(tally).toEqual({ 0: 2332, 1: 135461, 2: 122238 });
  });

  it('3.6a differs on exactly 4,515 code points, in the 22 runs pinned here and nowhere else', () => {
    const b = new Map<number, number>();
    for (const [start, end, width] of WIDTHS.builds['3.6a'].ranges) for (let c = start; c <= end; c += 1) b.set(c, width);
    const runs: [number, number, number, number][] = [];
    let count = 0;
    for (const [start, end, width] of WIDTHS.builds['3.7b'].ranges) {
      for (let c = start; c <= end; c += 1) {
        const other = b.get(c);
        if (other === width) continue;
        count += 1;
        const last = runs[runs.length - 1];
        if (last !== undefined && last[1] === c - 1 && last[2] === width && last[3] === other) last[1] = c;
        else runs.push([c, c, width, other ?? -1]);
        // The composer draws 3.7b's width: the one Tortie runs.
        expect(cellWidthOf(c)).toBe(width);
      }
    }
    expect(count).toBe(4_515);
    expect(runs).toEqual(DIFFERENCES_36A);
  });

  it('plane 14: the language tag, the tag block and VS17 to VS256 are zero, everything else measured is 1', () => {
    expect(SCANNED_LAST).toBe(0x3ffff);
    for (const c of [0xe0001, 0xe0020, 0xe0041, 0xe007f, 0xe0100, 0xe0150, 0xe01ef]) expect(cellWidthOf(c), c.toString(16)).toBe(0);
    for (const c of [0xe0000, 0xe0002, 0xe001f, 0xe0080, 0xe00ff, 0xe01f0, 0xe0fff]) expect(cellWidthOf(c), c.toString(16)).toBe(1);
    // Past the scan and outside plane 14's zero ranges: 1 (207 sampled code points measured 1).
    for (const c of [0x40000, 0x7ffff, 0xf0000, 0x10ffff]) expect(cellWidthOf(c), c.toString(16)).toBe(1);
  });

  it('a code point no range holds answers 1: the controls and the surrogates the scan left out', () => {
    for (const c of [0x00, 0x1f, 0x7f, 0x9f, 0xd800, 0xdfff]) expect(cellWidthOf(c)).toBe(1);
  });
});

describe('Phase 368: the second build, Homebrew’s 3.6a, measured the same way (D7)', () => {
  it('the second generated literal is the fixture’s 937 ranges, flattened, in order, and frozen', () => {
    const ranges = WIDTHS.builds['3.6a'].ranges;
    expect(ranges).toHaveLength(937);
    expect([...CELL_WIDTH_TABLES.scanned36a]).toEqual(ranges.flat());
    expect(Object.isFrozen(CELL_WIDTH_TABLES.scanned36a)).toBe(true);
    expect(Object.isFrozen(CELL_WIDTH_TABLES)).toBe(true);
  });

  it('cellWidthIn answers each build’s own width for every one of the 260,031 measured code points', () => {
    for (const build of BUILDS) {
      let checked = 0;
      let wrong = 0;
      const tally: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
      for (const [start, end, width] of WIDTHS.builds[build].ranges) {
        for (let c = start; c <= end; c += 1) {
          const got = cellWidthIn(build, c);
          if (got !== width) wrong += 1;
          tally[got] = (tally[got] ?? 0) + 1;
          checked += 1;
        }
      }
      expect(checked, build).toBe(260_031);
      expect(wrong, build).toBe(0);
      expect(tally, build).toEqual(Object.fromEntries(Object.entries(WIDTHS.builds[build].tally).map(([k, v]) => [Number(k), v])));
    }
    expect(WIDTHS.builds['3.6a'].tally).toEqual({ 0: 2374, 1: 130946, 2: 126711 });
  });

  it('cellWidthOf IS cellWidthIn of 3.7b, so the phone reads the table it read before (D9)', () => {
    const differ: string[] = [];
    for (let c = 0; c <= 0x10ffff; c += c < 0x40000 ? 1 : 97) if (cellWidthOf(c) !== cellWidthIn('3.7b', c)) differ.push(c.toString(16));
    expect(differ).toEqual([]);
  });

  it('plane 14 and every code point no range holds answer the same in both builds', () => {
    for (const c of [0xe0001, 0xe0020, 0xe007f, 0xe0100, 0xe01ef]) expect(cellWidthIn('3.6a', c), c.toString(16)).toBe(0);
    for (const c of [0x00, 0x1f, 0x7f, 0x9f, 0xd800, 0xdfff, 0xe0000, 0xe0080, 0x40000, 0x10ffff]) {
      expect(cellWidthIn('3.6a', c), c.toString(16)).toBe(1);
    }
  });

  it('cellWidthsForServer names a table for exactly the two measured versions and none for any other', () => {
    expect(cellWidthsForServer('3.7b')).toBe('3.7b');
    expect(cellWidthsForServer('3.6a')).toBe('3.6a');
    for (const other of [null, '', '3.7', '3.7c', '3.6', '3.6b', '3.5a', '3.4', '3.2a', 'next-3.8', ' 3.7b', '3.7b ', '3.7B', 'tmux 3.7b']) {
      expect(cellWidthsForServer(other), String(other)).toBe(null);
    }
  });
});

/** The committed sequence labels, as code points (the spec step's check-seq.mjs spelled them so). */
function sequenceOf(label: string): string {
  const named: Record<string, string> = {
    'zwj family': cp(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467, 0x200d, 0x1f466),
    'zwj tech': cp(0x1f9d1, 0x200d, 0x1f4bb),
    'zwj rainbow flag': cp(0x1f3f3, 0xfe0f, 0x200d, 0x1f308),
    'zwj heart fire': cp(0x2764, 0xfe0f, 0x200d, 0x1f525),
    'flag us': cp(0x1f1fa, 0x1f1f8),
    'flag gb': cp(0x1f1ec, 0x1f1e7),
    'lone RI': cp(0x1f1fa),
    'keycap 1': cp(0x31, 0xfe0f, 0x20e3),
    'keycap #': cp(0x23, 0xfe0f, 0x20e3),
    'tag flag scotland': cp(0x1f3f4, 0xe0067, 0xe0062, 0xe0073, 0xe0063, 0xe0074, 0xe007f),
    'hangul jamo seq': cp(0x1100, 0x1161, 0x11a8),
    devanagari: cp(0x915, 0x94d, 0x937),
    thai: cp(0xe01, 0xe33)
  };
  const known = named[label];
  if (known !== undefined) return known;
  const combining = /^e\+([0-9a-f]+)$/.exec(label);
  if (combining !== null) return cp(0x65, parseInt(combining[1] ?? '', 16));
  const pair = /^([0-9a-f]+)\+([0-9a-f]+)$/.exec(label);
  if (pair !== null) return cp(parseInt(pair[1] ?? '', 16), parseInt(pair[2] ?? '', 16));
  throw new Error(`no spelling for ${label}`);
}

/** The labels whose cells disagree with one build's measurement. */
function disagreements(build: CellWidthTable): string[] {
  const disagree: string[] = [];
  for (const label of Object.keys(SEQUENCES.cases)) {
    const want = SEQUENCES.cases[label]?.[build];
    const text = sequenceOf(label);
    const cells = cellsOf(text, build);
    // Nothing is lost: every code point is in some cell.
    if (cells.map((c) => c.text).join('') !== text) disagree.push(`${label}:lost`);
    if (typeof want === 'string') {
      // `?[...]`: tmux drew them as separate cells, which the two-column pane printed one a line.
      const drawn = JSON.parse(want.slice(1)) as string[];
      if (JSON.stringify(cells.map((c) => c.text)) !== JSON.stringify(drawn.slice(0, -1))) disagree.push(label);
      continue;
    }
    if (label === 'devanagari' || label === 'thai') {
      if (cells.reduce((n, c) => n + c.w, 0) !== want) disagree.push(label);
      continue;
    }
    if (cells.length !== 1 || cells[0]?.w !== want) disagree.push(`${label}:${JSON.stringify(cells.map((c) => c.w))}`);
  }
  return disagree;
}

describe('the seven sequence rules agree with tmux 3.7b', () => {
  it('on every one of the 281 committed sequences', () => {
    expect(Object.keys(SEQUENCES.cases)).toHaveLength(281);
    expect(disagreements('3.7b')).toEqual([]);
  });

  it('and, on 3.6a’s table, with 3.6a’s own measurement of every one of them (Phase 368)', () => {
    expect(disagreements('3.6a')).toEqual([]);
  });

  it('each rule by itself', () => {
    // 1. VS16 widens; 2. VS15 keeps the base's width.
    expect(cellsOf(cp(0x2764, 0xfe0f))).toEqual([{ text: cp(0x2764, 0xfe0f), w: 2 }]);
    expect(cellsOf(cp(0x2764, 0xfe0e))).toEqual([{ text: cp(0x2764, 0xfe0e), w: 1 }]);
    // 3. A ZWJ joins the next code point, whatever it is.
    expect(cellsOf(cp(0x1f9d1, 0x200d, 0x41))).toEqual([{ text: cp(0x1f9d1, 0x200d, 0x41), w: 2 }]);
    // 4. A pair of regional indicators is one cell of 2; a lone one a cell of 1; a third starts a new one.
    expect(cellsOf(cp(0x1f1fa, 0x1f1f8, 0x1f1ec))).toEqual([
      { text: cp(0x1f1fa, 0x1f1f8), w: 2 },
      { text: cp(0x1f1ec), w: 1 }
    ]);
    // 5. A skin tone joins an emoji-presentation base, and is its own cell after another.
    expect(cellsOf(cp(0x1f44d, 0x1f3fd))).toEqual([{ text: cp(0x1f44d, 0x1f3fd), w: 2 }]);
    expect(cellsOf(cp(0x41, 0x1f3fd))).toEqual([
      { text: 'A', w: 1 },
      { text: cp(0x1f3fd), w: 2 }
    ]);
    // 6. A keycap is 2.
    expect(cellsOf(cp(0x31, 0xfe0f, 0x20e3))).toEqual([{ text: cp(0x31, 0xfe0f, 0x20e3), w: 2 }]);
    // 7. Width 0 joins; Hangul medial and final jamo join a lead whatever their width.
    expect(cellsOf(cp(0x65, 0x301))).toEqual([{ text: cp(0x65, 0x301), w: 1 }]);
    expect(cellWidthOf(0x1161)).toBe(1);
    expect(cellsOf(cp(0x1100, 0x1161))).toEqual([{ text: cp(0x1100, 0x1161), w: 2 }]);
    expect(cellsOf(cp(0x41, 0x1161))).toEqual([
      { text: 'A', w: 1 },
      { text: cp(0x1161), w: 1 }
    ]);
  });

  it('a zero-width code point with no cell before it is not drawn, as tmux draws none (§14 M1)', () => {
    expect(cellsOf(cp(0xfe0f))).toEqual([]);
    expect(cellsOf(cp(0x200b, 0x41))).toEqual([{ text: 'A', w: 1 }]);
    expect(cellsOf(cp(0x200d, 0x41))).toEqual([{ text: 'A', w: 1 }]);
  });

  it('a tab is its own cell, ends a join, and keeps the tag of its own code point', () => {
    const cells = clusterCells([
      { ch: 'a', tag: 1 },
      { ch: cp(0x200d), tag: 2 },
      { ch: '\t', tag: 3 },
      { ch: 'b', tag: 4 },
      { ch: 'c', tag: 5 },
      { ch: cp(0x301), tag: 6 }
    ]);
    // The ZWJ before the tab joins nothing after it: `b` and `c` are cells of their own.
    expect(cells).toEqual([
      { text: cp(0x61, 0x200d), w: 1, tag: 1, tab: false },
      { text: '\t', w: 1, tag: 3, tab: true },
      { text: 'b', w: 1, tag: 4, tab: false },
      { text: cp(0x63, 0x301), w: 1, tag: 5, tab: false }
    ]);
  });
});

// ---------------------------------------------------------------------------
// THE ORACLE: the Phase 337 loop `nextCell` replaced, word for word but for
// its width, which it reads from the fixture (and plane 14's measured zero
// ranges) rather than from ../cell-widths. Two readings of the rules and the
// table that share nothing but the fixture: if they ever disagree, one of
// them moved.
// ---------------------------------------------------------------------------

/** A build's measured width, read from the fixture alone. */
function fixtureWidth(build: CellWidthTable): (point: number) => number {
  const widths = new Map<number, number>();
  for (const [start, end, width] of WIDTHS.builds[build].ranges) for (let c = start; c <= end; c += 1) widths.set(c, width);
  const plane14Zero = (c: number): boolean => c === 0xe0001 || (c >= 0xe0020 && c <= 0xe007f) || (c >= 0xe0100 && c <= 0xe01ef);
  return (c) => widths.get(c) ?? (plane14Zero(c) ? 0 : 1);
}

function oracleCells<T>(points: Iterable<TaggedPoint<T>>, widthOf: (point: number) => number): TaggedCell<T>[] {
  interface Building extends TaggedCell<T> {
    ri: 0 | 1 | 2;
    hangul: boolean;
  }
  const isRI = (c: number): boolean => c >= 0x1f1e6 && c <= 0x1f1ff;
  const isSkin = (c: number): boolean => c >= 0x1f3fb && c <= 0x1f3ff;
  const isLead = (c: number): boolean => (c >= 0x1100 && c <= 0x115f) || (c >= 0xa960 && c <= 0xa97f) || (c >= 0xac00 && c <= 0xd7a3);
  const isTrail = (c: number): boolean => (c >= 0x1160 && c <= 0x11ff) || (c >= 0xd7b0 && c <= 0xd7ff);
  const emoji = /^\p{Emoji_Presentation}$/u;
  const cells: Building[] = [];
  let joinNext = false;
  for (const point of points) {
    const ch = point.ch;
    const c = ch.codePointAt(0) ?? 0;
    if (ch === '\t') {
      cells.push({ text: '\t', w: 1, tag: point.tag, tab: true, ri: 0, hangul: false });
      joinNext = false;
      continue;
    }
    const last = cells[cells.length - 1];
    const open = last !== undefined && !last.tab ? last : undefined;
    if (open !== undefined) {
      if (joinNext) {
        open.text += ch;
        joinNext = false;
        continue;
      }
      if (c === 0x200d) {
        open.text += ch;
        joinNext = true;
        continue;
      }
      if (c === 0xfe0f) {
        open.text += ch;
        open.w = 2;
        continue;
      }
      if (c === 0xfe0e) {
        open.text += ch;
        continue;
      }
      if (isRI(c) && open.ri === 1) {
        open.text += ch;
        open.w = 2;
        open.ri = 2;
        continue;
      }
      if (isSkin(c) && emoji.test(String.fromCodePoint(open.text.codePointAt(0) ?? 0))) {
        open.text += ch;
        continue;
      }
      if (isTrail(c) && open.hangul) {
        open.text += ch;
        continue;
      }
    }
    const w = widthOf(c);
    if (w === 0) {
      if (open !== undefined) open.text += ch;
      continue;
    }
    const ri = isRI(c);
    cells.push({ text: ch, w: ri ? 1 : w === 2 ? 2 : 1, tag: point.tag, tab: false, ri: ri ? 1 : 0, hangul: isLead(c) });
  }
  return cells.map(({ text, w, tag, tab }) => ({ text, w, tag, tab }));
}

/** mulberry32: a seeded, repeatable stream, so a disagreement names the row that showed it. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The alphabet the random rows are drawn from: every shape a rule asks about
 * (joiners, both selectors, regional indicators, skin tones after both kinds of
 * base, Hangul leads and trails, keycaps, tags, a tab, a control, the filler),
 * the code points the two builds draw differently, and plain text between.
 */
const ALPHABET: readonly number[] = [
  0x41, 0x61, 0x20, 0x31, 0x23, 0x09, 0x1b, 0x7f, 0xa0, 0xe9, 0x300, 0x301, 0x36f, 0x487, 0x94d, 0x915, 0x937, 0xe01,
  0xe33, 0x1100, 0x115f, 0x1160, 0x1161, 0x11a8, 0x11ff, 0x200b, 0x200d, 0x20e3, 0x231a, 0x2764, 0x261d, 0x270c,
  0x2e9a, 0x3164, 0x4e00, 0xa960, 0xac00, 0xd7a3, 0xd7b0, 0xd7ff, 0xfe0e, 0xfe0f, 0x1acf, 0x16ff2, 0x1f1e6, 0x1f1fa,
  0x1f1f8, 0x1f1ff, 0x1f308, 0x1f3f3, 0x1f3f4, 0x1f3fb, 0x1f3fd, 0x1f3ff, 0x1f44d, 0x1f468, 0x1f469, 0x1f4bb,
  0x1f525, 0x1f680, 0x1f9d1, 0x2b73a, 0xe0001, 0xe0067, 0xe007f, 0xe0100, 0xe0fff, 0x10ffff
];

describe('nextCell is the seven rules, one spelling, and cuts every row as the Phase 337 loop did (Phase 368, D8)', () => {
  const widthsOf = { '3.7b': fixtureWidth('3.7b'), '3.6a': fixtureWidth('3.6a') } as const;

  it('the 281 committed sequences, on both tables, cell for cell and tag for tag', () => {
    for (const build of BUILDS) {
      for (const label of Object.keys(SEQUENCES.cases)) {
        const points = [...sequenceOf(label)].map((ch, i) => ({ ch, tag: i }));
        expect(clusterCells(points, build), `${build} ${label}`).toEqual(oracleCells(points, widthsOf[build]));
      }
    }
  });

  it('20,000 random rows from an alphabet of every shape a rule asks about, on both tables', () => {
    const next = seeded(368);
    let rows = 0;
    for (let n = 0; n < 20_000; n += 1) {
      const length = Math.floor(next() * 24);
      const points: TaggedPoint<number>[] = [];
      for (let i = 0; i < length; i += 1) points.push({ ch: String.fromCodePoint(ALPHABET[Math.floor(next() * ALPHABET.length)] ?? 0x41), tag: i });
      for (const build of BUILDS) {
        const got = clusterCells(points, build);
        const want = oracleCells(points, widthsOf[build]);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          expect(got, `${build} ${points.map((p) => (p.ch.codePointAt(0) ?? 0).toString(16)).join(' ')}`).toEqual(want);
        }
      }
      rows += 1;
    }
    expect(rows).toBe(20_000);
  });

  it('every measured code point with no cell open, after a plain cell and after an emoji, on both tables', () => {
    const same = (a: TaggedCell<number>[], b: TaggedCell<number>[]): boolean =>
      a.length === b.length && a.every((x, i) => x.text === b[i]?.text && x.w === b[i]?.w && x.tag === b[i]?.tag && x.tab === b[i]?.tab);
    let compared = 0;
    for (const build of BUILDS) {
      for (const [start, end] of WIDTHS.builds[build].ranges) {
        for (let c = start; c <= end; c += 1) {
          const ch = String.fromCodePoint(c);
          for (const before of ['', 'a', cp(0x1f44d)]) {
            const points = before === '' ? [{ ch, tag: 1 }] : [{ ch: before, tag: 0 }, { ch, tag: 1 }];
            const got = clusterCells(points, build);
            const want = oracleCells(points, widthsOf[build]);
            if (!same(got, want)) expect(got, `${build} ${before} U+${c.toString(16)}`).toEqual(want);
            compared += 1;
          }
        }
      }
    }
    expect(compared).toBe(2 * 3 * 260_031);
  });

  it('cellsOf and clusterCells default to 3.7b, the phone’s table', () => {
    // U+2B73A is 1 in 3.7b and 2 in 3.6a.
    expect(cellsOf(cp(0x2b73a))).toEqual([{ text: cp(0x2b73a), w: 1 }]);
    expect(cellsOf(cp(0x2b73a), '3.6a')).toEqual([{ text: cp(0x2b73a), w: 2 }]);
    expect(clusterCells([{ ch: cp(0x16ff2), tag: 0 }])).toEqual([{ text: cp(0x16ff2), w: 1, tag: 0, tab: false }]);
  });

  it('the state fits xterm’s property encoding: zero is no open cell, and every state is at most six bits', () => {
    expect(NO_CELL).toBe(0);
    const seen = new Set<CellState>([NO_CELL]);
    const queue: CellState[] = [NO_CELL];
    // Every state the rules can reach from no open cell, through the alphabet, on both tables.
    while (queue.length > 0) {
      const state = queue.shift() ?? NO_CELL;
      for (const build of BUILDS) {
        for (const c of ALPHABET) {
          const s = nextCell(state, c, build);
          expect(s.state).toBeGreaterThanOrEqual(0);
          expect(s.state).toBeLessThan(64);
          expect(s.state & 3, 'the open width is 0, 1 or 2').not.toBe(3);
          if (c === 0x09) {
            // A tab is a cell of 1 that nothing joins: it leaves no cell open.
            expect(s).toEqual({ join: false, width: 1, state: NO_CELL });
          } else {
            // Anything else answers the width of the cell it leaves open, which is what xterm reads back as the
            // next code point's `oldWidth` when that one joins.
            expect(s.width).toBe(s.state & 3);
          }
          if (!seen.has(s.state)) {
            seen.add(s.state);
            queue.push(s.state);
          }
        }
      }
    }
    expect(seen.size).toBeGreaterThan(8);
  });

  it('a step allocates nothing: the same step object answers the same question twice', () => {
    const a = nextCell(NO_CELL, 0x41, '3.7b');
    expect(nextCell(NO_CELL, 0x41, '3.7b')).toBe(a);
    expect(Object.isFrozen(a)).toBe(true);
    expect(nextCell(a.state, 0x1f600, '3.7b')).toBe(nextCell(a.state, 0x1f680, '3.7b'));
  });

  it('no code point below U+007F has emoji presentation, so a cell opened by one carries no emoji flag', () => {
    for (let c = 0; c < 0x7f; c += 1) expect(/^\p{Emoji_Presentation}$/u.test(String.fromCodePoint(c)), c.toString(16)).toBe(false);
    // A skin tone after `#` is its own cell, as after any base without emoji presentation.
    expect(cellsOf(cp(0x23, 0x1f3fd))).toEqual([
      { text: '#', w: 1 },
      { text: cp(0x1f3fd), w: 2 }
    ]);
  });
});
