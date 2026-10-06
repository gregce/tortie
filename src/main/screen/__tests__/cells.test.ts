/**
 * tmux's own cells (Phase 337, build/p337/SPEC.md §5.3.4, D10, §14 M5 and M6):
 * the generated width table IS the committed measurement of tmux 3.7b, range
 * for range and code point for code point (all 260,031); the 4,515 code points
 * Homebrew's 3.6a draws differently are pinned, run by run; plane 14's three
 * zero ranges, which the screen builder measured, hold; and the seven sequence
 * rules agree with tmux 3.7b on every one of the 281 committed sequences.
 * Every test text is built from code points at run time.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CELL_WIDTH_TABLES, cellWidthOf, SCANNED_LAST } from '../cell-widths';
import { cellsOf, clusterCells } from '../cells';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const FIXTURES = join(ROOT, 'build', 'fixtures', 'screen');

interface WidthsFixture {
  codePoints: number;
  builds: Record<'3.7b' | '3.6a', { tally: Record<string, number>; ranges: [number, number, number][] }>;
}
interface SequencesFixture {
  cases: Record<string, { '3.7b': number | string; '3.6a': number | string }>;
}

const WIDTHS = JSON.parse(readFileSync(join(FIXTURES, 'tmux-widths.json'), 'utf8')) as WidthsFixture;
const SEQUENCES = JSON.parse(readFileSync(join(FIXTURES, 'tmux-sequences.json'), 'utf8')) as SequencesFixture;

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

describe('the seven sequence rules agree with tmux 3.7b', () => {
  it('on every one of the 281 committed sequences', () => {
    const labels = Object.keys(SEQUENCES.cases);
    expect(labels).toHaveLength(281);
    const disagree: string[] = [];
    for (const label of labels) {
      const want = SEQUENCES.cases[label]?.['3.7b'];
      const text = sequenceOf(label);
      const cells = cellsOf(text);
      // Nothing is lost: every code point is in some cell.
      expect(cells.map((c) => c.text).join(''), label).toBe(text);
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
    expect(disagree).toEqual([]);
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
