/**
 * Phase 368, item 4 (build/p368/SPEC.md §4.2, D7 and D8; research 145 §3.3):
 * tmux's widths in Tortie's terminal.
 *
 * THE CLAIM IS ABOUT XTERM ITSELF. An unopened xterm, made as the pane makes
 * it with `allowProposedApi`, is handed the provider and written to, and the
 * cursor's advance is read back: for every one of the 281 committed sequences
 * and a code point of every class of research 145's width table, on BOTH
 * measured builds, it must equal what tmux measured (build/fixtures/screen/),
 * read here from the fixture and never from the module under test. Beside it,
 * the same terminal with no table still answers xterm's Unicode 6, as before
 * this phase, and disagrees with tmux where research 145 said it did.
 *
 * Also here, because they decide which table a session gets: the version this
 * Mac's server answered is recorded on BOTH of ensureServer's reads (the warm
 * server's gate and the cold path's own read), and only 3.7b and 3.6a name a
 * table (D7).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Terminal } from '@xterm/xterm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CellWidthTable } from '@shared/cell-widths';
import { clusterCells, nextCell, NO_CELL, type CellState } from '@shared/cells';
import {
  assertServerVersionUsable,
  lastLocalServerVersion,
  localCellWidths,
  logCreatedServerVersion,
  resetTmuxVersionState,
  type TmuxExec
} from '../../../main/tmux/version';
import { registerTmuxWidths, tmuxWidthsProvider } from '../tmux-widths';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const FIXTURES = join(ROOT, 'build', 'fixtures', 'screen');

interface WidthsFixture {
  builds: Record<CellWidthTable, { ranges: [number, number, number][] }>;
}
interface SequencesFixture {
  cases: Record<string, Record<CellWidthTable, number | string>>;
}

const WIDTHS = JSON.parse(readFileSync(join(FIXTURES, 'tmux-widths.json'), 'utf8')) as WidthsFixture;
const SEQUENCES = JSON.parse(readFileSync(join(FIXTURES, 'tmux-sequences.json'), 'utf8')) as SequencesFixture;
const BUILDS: readonly CellWidthTable[] = ['3.7b', '3.6a'];
const ESC = String.fromCharCode(0x1b);
const cp = (...points: number[]): string => String.fromCodePoint(...points);

/** A build's measured width of one code point, from the fixture alone; plane 14's three measured zero ranges, and 1 past the scan. */
function measured(build: CellWidthTable): (point: number) => number {
  const widths = new Map<number, number>();
  for (const [start, end, width] of WIDTHS.builds[build].ranges) for (let c = start; c <= end; c += 1) widths.set(c, width);
  return (c) => widths.get(c) ?? (c === 0xe0001 || (c >= 0xe0020 && c <= 0xe007f) || (c >= 0xe0100 && c <= 0xe01ef) ? 0 : 1);
}
const MEASURED = { '3.7b': measured('3.7b'), '3.6a': measured('3.6a') } as const;

/** The committed sequence labels as code points, spelled as build/p337's check-seq.mjs spelled them. */
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

/**
 * How many cells tmux measured a sequence to take: the number it recorded, or,
 * for `?[...]` (tmux drew the code points as separate cells, one a line in the
 * two-column pane), the sum of each drawn cell's own measured width.
 */
function measuredSequence(label: string, build: CellWidthTable): number {
  const want = SEQUENCES.cases[label]?.[build];
  if (typeof want === 'number') return want;
  if (typeof want !== 'string') throw new Error(`no measurement for ${label}`);
  const drawn = (JSON.parse(want.slice(1)) as string[]).slice(0, -1);
  return drawn.reduce((n, cell) => {
    const points = [...cell];
    if (points.length !== 1) throw new Error(`${label}: a drawn cell of ${String(points.length)} code points`);
    return n + MEASURED[build](points[0]?.codePointAt(0) ?? 0);
  }, 0);
}

/** A terminal as the pane makes it, with the given table registered (null: none). */
function terminal(table: CellWidthTable | null, cols = 200): Terminal {
  const term = new Terminal({ cols, rows: 8, allowProposedApi: true, scrollback: 0 });
  registerTmuxWidths(term, table);
  return term;
}

function write(term: Terminal, data: string): Promise<void> {
  return new Promise((done) => {
    term.write(data, done);
  });
}

/** The cursor's advance over `text`, written at the start of a cleared row after `before`. */
async function advance(term: Terminal, text: string, before = ''): Promise<number> {
  // CSI H and CSI 2K: home and clear, and both end any join, as tmux's own escapes do.
  await write(term, `${ESC}[H${ESC}[2K${before}`);
  const start = term.buffer.active.cursorX;
  await write(term, text);
  return term.buffer.active.cursorX - start;
}

/**
 * One code point of every class of research 145's width table (build/p368/
 * SPEC.md §2.4: Unicode 6, then 3.6a, then 3.7b), the emoji it names, and the
 * agents' own glyphs, which every one of the three draws as one cell.
 */
const CLASSES: readonly { name: string; point: number }[] = [
  { name: '2,2,2 Hangul lead', point: 0x1100 },
  { name: '1,1,1 space', point: 0x20 },
  { name: '2,1,1 unassigned in a wide block', point: 0x2e9a },
  { name: '1,2,2 watch', point: 0x231a },
  { name: '1,2,2 check mark', point: 0x2705 },
  { name: '1,2,2 cross mark', point: 0x274c },
  { name: '1,2,2 high voltage', point: 0x26a1 },
  { name: '1,2,2 sparkles', point: 0x2728 },
  { name: '1,2,2 rocket', point: 0x1f680 },
  { name: '1,2,2 memo', point: 0x1f4dd },
  { name: '1,2,2 wrench', point: 0x1f527 },
  { name: '1,2,2 brain', point: 0x1f9e0 },
  { name: '2,2,1 CJK assigned in Unicode 16 or 17', point: 0x2b73a },
  { name: '1,0,0 combining cyrillic', point: 0x487 },
  { name: '0,0,0 combining grave', point: 0x300 },
  { name: '0,1,1 Hangul filler', point: 0x1160 },
  { name: '1,2,1', point: 0x16ff2 },
  { name: '1,0,1', point: 0x1acf },
  { name: '0,2,2', point: 0x302e },
  { name: '0,2,2', point: 0x302f },
  { name: '2,0,0 Hangul filler U+3164', point: 0x3164 },
  ...[0x23fa, 0x273b, 0x23bf, 0x276f, 0x25cf, 0x2500, 0x2502, 0x203a, 0x26a0, 0x2139, 0x2714, 0x2699].map((point) => ({
    name: `agent glyph U+${point.toString(16)}`,
    point
  }))
];

describe('the provider, in an unopened xterm, advances the cursor by tmux’s measured width', () => {
  it.each(BUILDS)('every one of the 281 committed sequences, on %s', async (build) => {
    const term = terminal(build);
    try {
      expect(term.unicode.activeVersion).toBe(`tmux-${build}`);
      const wrong: string[] = [];
      for (const label of Object.keys(SEQUENCES.cases)) {
        const got = await advance(term, sequenceOf(label));
        const want = measuredSequence(label, build);
        if (got !== want) wrong.push(`${label}: ${String(got)} against ${String(want)}`);
        // A sequence tmux drew as ONE cell is one cell in the terminal too, holding every code point.
        if (typeof SEQUENCES.cases[label]?.[build] === 'number' && label !== 'devanagari' && label !== 'thai') {
          const cell = term.buffer.active.getLine(term.buffer.active.cursorY)?.getCell(0);
          if (cell?.getChars() !== sequenceOf(label) || cell.getWidth() !== want) wrong.push(`${label}: not one cell of ${String(want)}`);
        }
      }
      expect(Object.keys(SEQUENCES.cases)).toHaveLength(281);
      expect(wrong).toEqual([]);
    } finally {
      term.dispose();
    }
  });

  it.each(BUILDS)('a code point of every class of the width table, alone and after a letter, on %s', async (build) => {
    const term = terminal(build);
    try {
      const wrong: string[] = [];
      for (const { name, point } of CLASSES) {
        const want = MEASURED[build](point);
        // A code point tmux measures at 0 is never drawn alone; after a cell it joins and moves nothing.
        if (want > 0) {
          const alone = await advance(term, cp(point));
          if (alone !== want) wrong.push(`${name} alone: ${String(alone)} against ${String(want)}`);
        }
        const after = await advance(term, cp(point), 'a');
        if (after !== want) wrong.push(`${name} after a: ${String(after)} against ${String(want)}`);
      }
      expect(wrong).toEqual([]);
    } finally {
      term.dispose();
    }
  });

  it.each(BUILDS)('a row of mixed text keeps every later cell where tmux puts it, on %s', async (build) => {
    // Research 145's own row: an emoji early, letters after it, and a stale
    // letter at the end when the terminal and tmux disagree.
    const term = terminal(build, 60);
    try {
      const row = `6. ${cp(0x1f4dd)} Jot down trail notes: what worked ${cp(0x2705)} ${cp(0x2764, 0xfe0f)} done`;
      const want = [...row].reduce((n, ch, i, all) => {
        const c = ch.codePointAt(0) ?? 0;
        // The heart's VS16 widens the heart to two: the one join in this row.
        if (c === 0xfe0f) return n + (MEASURED[build](all[i - 1]?.codePointAt(0) ?? 0) === 1 ? 1 : 0);
        return n + MEASURED[build](c);
      }, 0);
      expect(await advance(term, row)).toBe(want);
      // The last letter sits at the column tmux gave it.
      const line = term.buffer.active.getLine(term.buffer.active.cursorY);
      expect(line?.getCell(want - 1)?.getChars()).toBe('e');
    } finally {
      term.dispose();
    }
  });
});

describe('the Unicode 6 default still answers when the table is null (D7: another machine’s sessions)', () => {
  it('null registers nothing, and the terminal draws an emoji in one cell as before this phase', async () => {
    const term = terminal(null);
    try {
      expect(term.unicode.activeVersion).toBe('6');
      expect(term.unicode.versions).toEqual(['6']);
      expect(await advance(term, cp(0x1f680))).toBe(1);
      expect(await advance(term, cp(0x2764, 0xfe0f))).toBe(1);
    } finally {
      term.dispose();
    }
  });

  it('and disagrees with tmux where research 145 said it did, on sequences the provider draws exactly', async () => {
    const today = terminal(null);
    const now = terminal('3.7b');
    /** The row's cells after the advance, each as its text and width. */
    const cellsOf = (term: Terminal): string => {
      const line = term.buffer.active.getLine(term.buffer.active.cursorY);
      const cells: string[] = [];
      for (let x = 0; x < term.buffer.active.cursorX; x += 1) {
        const cell = line?.getCell(x);
        if (cell !== undefined && cell.getWidth() !== 0) cells.push(`${cell.getChars()}:${String(cell.getWidth())}`);
      }
      return cells.join('|');
    };
    try {
      const byAdvance: string[] = [];
      const byCells: string[] = [];
      for (const label of Object.keys(SEQUENCES.cases)) {
        const before = await advance(today, sequenceOf(label));
        const after = await advance(now, sequenceOf(label));
        expect(after, label).toBe(measuredSequence(label, '3.7b'));
        if (before !== after) byAdvance.push(label);
        if (before !== after || cellsOf(today) !== cellsOf(now)) byCells.push(label);
      }
      // Every VS16 sequence moves the cursor one cell short today; a flag, a
      // skin tone and a ZWJ sequence move it as far but split it into two cells
      // of one, so a later write over them lands on half a picture.
      expect(byAdvance).toContain('2764+fe0f');
      expect(byAdvance).toContain('zwj family');
      expect(byAdvance).not.toContain('flag us');
      expect(byCells).toContain('flag us');
      expect(byCells).toContain('1f44d+1f3fb');
      expect(byCells).toContain('zwj tech');
      // Measured here on 2026-11-16 with xterm 6.0.0; research 145 §3.3 counted
      // 94 of 281 with a rig of its own.
      expect(byAdvance.length).toBe(85);
      expect(byCells.length).toBe(96);
    } finally {
      today.dispose();
      now.dispose();
    }
  });
});

describe('registerTmuxWidths', () => {
  it('makes the provider the active one, and registering twice changes nothing', () => {
    const term = terminal('3.6a');
    try {
      registerTmuxWidths(term, '3.6a');
      expect(term.unicode.activeVersion).toBe('tmux-3.6a');
      expect([...term.unicode.versions].sort()).toEqual(['6', 'tmux-3.6a']);
    } finally {
      term.dispose();
    }
  });

  it('a terminal made without allowProposedApi is left at Unicode 6, throws nothing, and is said once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const plain = [new Terminal({ cols: 80, rows: 4 }), new Terminal({ cols: 80, rows: 4 })];
    try {
      for (const term of plain) expect(() => registerTmuxWidths(term, '3.7b')).not.toThrow();
      // The proposed API is still closed: asking for it throws, so nothing could have been registered.
      expect(() => plain[0]?.unicode).toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      for (const term of plain) term.dispose();
      warn.mockRestore();
    }
  });

  it('one provider object per build, with the version xterm keys it by', () => {
    expect(tmuxWidthsProvider('3.7b')).toBe(tmuxWidthsProvider('3.7b'));
    expect(tmuxWidthsProvider('3.7b').version).toBe('tmux-3.7b');
    expect(tmuxWidthsProvider('3.6a').version).toBe('tmux-3.6a');
  });
});

describe('the provider answers each measured code point as tmux measured it, every one, both builds', () => {
  it.each(BUILDS)('wcwidth, and charProperties with no cell open, over all 260,031 code points of %s', (build) => {
    const provider = tmuxWidthsProvider(build);
    const wrong: string[] = [];
    let checked = 0;
    for (const [start, end, width] of WIDTHS.builds[build].ranges) {
      for (let c = start; c <= end; c += 1) {
        checked += 1;
        if (provider.wcwidth(c) !== width) wrong.push(`wcwidth U+${c.toString(16)}`);
        const props = provider.charProperties(c, 0);
        const join = (props & 1) === 1;
        const cells = (props >> 1) & 3;
        // A width-0 code point takes no cell; anything else opens one of its measured width.
        if (width === 0 ? !join || cells !== 0 : join || cells !== width) wrong.push(`charProperties U+${c.toString(16)}`);
      }
    }
    expect(checked).toBe(260_031);
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it('charProperties is nextCell in xterm’s own encoding, and the state survives the round trip', () => {
    let props = 0;
    let state: CellState = NO_CELL;
    for (const ch of [...sequenceOf('zwj rainbow flag'), 'a', ...sequenceOf('flag us'), '\t', ...sequenceOf('hangul jamo seq')]) {
      const c = ch.codePointAt(0) ?? 0;
      const step = nextCell(state, c, '3.7b');
      props = tmuxWidthsProvider('3.7b').charProperties(c, props);
      expect(props).toBe((step.state << 3) | (step.width << 1) | (step.join ? 1 : 0));
      expect(props >> 3).toBe(step.state);
      state = step.state;
    }
  });
});

describe('nextCell driven over the committed sequences cuts what clusterCells cuts', () => {
  it.each(BUILDS)('every one of the 281, on %s', (build) => {
    for (const label of Object.keys(SEQUENCES.cases)) {
      const cells: { text: string; w: number }[] = [];
      let state: CellState = NO_CELL;
      for (const ch of sequenceOf(label)) {
        const step = nextCell(state, ch.codePointAt(0) ?? 0, build);
        state = step.state;
        const open = cells[cells.length - 1];
        if (!step.join) cells.push({ text: ch, w: step.width });
        else if (open !== undefined && step.width !== 0) {
          open.text += ch;
          open.w = step.width;
        }
      }
      const cut = clusterCells([...sequenceOf(label)].map((ch) => ({ ch, tag: null })), build).map(({ text, w }) => ({ text, w }));
      expect(cells, `${build} ${label}`).toEqual(cut);
    }
  });
});

describe('the table is chosen by THIS MAC’s server, on both of ensureServer’s reads (D7)', () => {
  /** A server answering one version to `display-message`, or nothing. */
  const server =
    (version: string | null): TmuxExec =>
    (args) =>
      args[0] === 'display-message'
        ? version === null
          ? Promise.reject(new Error('no answer'))
          : Promise.resolve(`${version}\n`)
        : Promise.resolve('');
  // A path that is no binary, so `-V` cannot answer and spawns nothing; packaged, so the client is the bundled 3.7b.
  const bin = '/definitely/not/a/tmux/binary';

  beforeEach(() => {
    resetTmuxVersionState();
  });
  afterEach(() => {
    resetTmuxVersionState();
  });

  it('nothing is known before a read', () => {
    expect(lastLocalServerVersion()).toBe(null);
    expect(localCellWidths()).toBe(null);
  });

  it('the warm server’s gate records the version it let through: 3.6a, the tested pair', async () => {
    const gate = await assertServerVersionUsable({ exec: server('3.6a'), bin, socket: 'gmux-p368-unit', packaged: true });
    expect(gate.kind).toBe('tested-pair');
    expect(lastLocalServerVersion()).toBe('3.6a');
    expect(localCellWidths()).toBe('3.6a');
  });

  it('the warm server’s gate records 3.7b, the bundled build', async () => {
    await assertServerVersionUsable({ exec: server('3.7b'), bin, socket: 'gmux-p368-unit', packaged: true });
    expect(localCellWidths()).toBe('3.7b');
  });

  it('a refused server records nothing', async () => {
    await expect(assertServerVersionUsable({ exec: server('3.5a'), bin, socket: 'gmux-p368-unit', packaged: true })).rejects.toThrow();
    expect(lastLocalServerVersion()).toBe(null);
    expect(localCellWidths()).toBe(null);
  });

  it('the cold path’s own read records the server this process created, which no gate reads', async () => {
    await logCreatedServerVersion({ exec: server('3.7b'), bin, source: 'bundled' });
    expect(lastLocalServerVersion()).toBe('3.7b');
    expect(localCellWidths()).toBe('3.7b');
  });

  it('a server of any other version, or one that answers nothing, names no table', async () => {
    await logCreatedServerVersion({ exec: server('3.4'), bin, source: 'dev-override' });
    expect(lastLocalServerVersion()).toBe('3.4');
    expect(localCellWidths()).toBe(null);
    await logCreatedServerVersion({ exec: server(null), bin, source: 'dev-override' });
    expect(lastLocalServerVersion()).toBe(null);
    expect(localCellWidths()).toBe(null);
  });

  it('a reset forgets it, as it forgets the gate’s pass', async () => {
    await logCreatedServerVersion({ exec: server('3.6a'), bin, source: 'dev-override' });
    expect(localCellWidths()).toBe('3.6a');
    resetTmuxVersionState();
    expect(localCellWidths()).toBe(null);
  });
});
