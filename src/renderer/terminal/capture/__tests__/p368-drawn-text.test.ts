/**
 * Phase 368, item 6 (issue 44): a copy holds what is drawn
 * (build/p368/SPEC.md §4.4, D11).
 *
 * The terminals here are the SHIPPING xterm 6.0.0, unopened, which is what a
 * copy reads in the app: a buffer filled by the same parser, read through the
 * same public line API. What is proved:
 *
 *   - THE PROPERTY. Over random buffers whose rows fit the pane and whose
 *     lines end in no space, `drawnSelectionText` is xterm's own selection
 *     text byte for byte, so the two changes it makes move nothing else;
 *   - a pane narrowed from 140 to 96 columns copies no cell past 96, where
 *     xterm's text carries Chinese text after 80 spaces, which is research
 *     145 §4.3's measured defect;
 *   - the spaces a line ends in go, and a space a wrapped row ends in stays,
 *     with the spec's own rows G6 and G7 (§2.6).
 *
 * THE REFERENCE, AND WHY IT IS A TRANSCRIPTION. An unopened xterm cannot
 * select: its `select` needs the renderer `open` builds, and called here it
 * throws (measured on this package). This lane runs under node with no DOM,
 * so xterm's own `getSelection` cannot run. The reference is therefore
 * xterm's `selectionText` in normal mode transcribed statement for statement
 * over the public buffer API, which is the same `translateToString` the
 * private one calls (BufferLineApiView.ts), and a drift test reads xterm's
 * source as text, so an xterm whose selection text changes turns this file
 * red before anyone trusts the property against the old shape.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { IBufferRange, Terminal as XTerm } from '@xterm/xterm';

// xterm's browser bundle touches window at import; nothing else here does.
vi.stubGlobal('window', globalThis);
vi.stubGlobal('navigator', { userAgent: 'node', platform: 'MacIntel' });

const { Terminal } = await import('@xterm/xterm');
const { drawnSelectionText } = await import('../drawn-text');

function write(term: XTerm, data: string): Promise<void> {
  return new Promise((resolve) => term.write(data, resolve));
}

/**
 * xterm 6.0.0's `selectionText`, normal mode (SelectionService.ts, lines 203
 * to 262), statement for statement over the public buffer API. The drift test
 * at the bottom of this file holds the source it was transcribed from.
 */
function xtermSelectionText(term: XTerm, range: IBufferRange): string {
  const buffer = term.buffer.active;
  const start = [range.start.x, range.start.y] as const;
  const end = [range.end.x, range.end.y] as const;
  const result: string[] = [];
  const startRowEndCol = start[1] === end[1] ? end[0] : undefined;
  result.push(
    buffer.getLine(start[1])?.translateToString(true, start[0], startRowEndCol) ?? ''
  );
  for (let i = start[1] + 1; i <= end[1] - 1; i++) {
    const bufferLine = buffer.getLine(i);
    const lineText = bufferLine?.translateToString(true) ?? '';
    if (bufferLine?.isWrapped) result[result.length - 1] += lineText;
    else result.push(lineText);
  }
  if (start[1] !== end[1]) {
    const bufferLine = buffer.getLine(end[1]);
    const lineText = bufferLine?.translateToString(true, 0, end[0]) ?? '';
    if (bufferLine && bufferLine.isWrapped) result[result.length - 1] += lineText;
    else result.push(lineText);
  }
  return result.map((line) => line.replace(/\u00a0/g, ' ')).join('\n');
}

/** A small seeded generator, so a failing case names its seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = [
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123456789-_/.:=@#',
  ' ',
  ' ',
  ' ',
  '\u00a0',
  '日',
  '本',
  '語'
];

/** A random line that ends in neither a space nor a non breaking space. */
function randomLine(rand: () => number, cols: number): string {
  const length = Math.floor(rand() * cols * 3);
  let line = '';
  for (let i = 0; i < length; i += 1) {
    line += ALPHABET[Math.floor(rand() * ALPHABET.length)] ?? 'x';
  }
  return `${line.replace(/[ \u00a0]+$/, '')}z`;
}

describe('drawnSelectionText is xterm\'s selection text wherever nothing is past the edge and no line ends in a space', () => {
  it('agrees byte for byte over 400 random buffers and ranges', async () => {
    let compared = 0;
    let wrappedRowsSeen = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const rand = mulberry32(seed);
      const cols = 8 + Math.floor(rand() * 52);
      const rows = 3 + Math.floor(rand() * 10);
      const term = new Terminal({ cols, rows, scrollback: 400, allowProposedApi: true });
      const lines: string[] = [];
      const count = 1 + Math.floor(rand() * 10);
      for (let i = 0; i < count; i += 1) lines.push(randomLine(rand, cols));
      await write(term, lines.join('\r\n'));
      const buffer = term.buffer.active;
      for (let y = 0; y < buffer.length; y += 1) {
        // The property's precondition: every row fits the pane.
        expect(buffer.getLine(y)?.length).toBe(cols);
        if (buffer.getLine(y)?.isWrapped === true) wrappedRowsSeen += 1;
      }
      const y0 = Math.floor(rand() * buffer.length);
      const y1 = y0 + Math.floor(rand() * (buffer.length - y0));
      const x0 = Math.floor(rand() * cols);
      const x1 = y1 === y0 ? x0 + 1 + Math.floor(rand() * (cols - x0)) : 1 + Math.floor(rand() * cols);
      const range: IBufferRange = { start: { x: x0, y: y0 }, end: { x: x1, y: y1 } };
      const theirs = xtermSelectionText(term, range);
      // The other precondition, read on xterm's own answer: no line of it ends
      // in a space. A range can end on a space inside a line, and that case
      // belongs to the trim, which the blocks below prove on their own.
      if (!theirs.split('\n').some((line) => line.endsWith(' '))) {
        compared += 1;
        expect(drawnSelectionText(term, range), `seed ${seed}`).toBe(theirs);
        // And with no range, from the terminal's own selection, the same.
        const selecting = {
          cols: term.cols,
          buffer: term.buffer,
          getSelectionPosition: () => range
        };
        expect(drawnSelectionText(selecting), `seed ${seed}, no range`).toBe(theirs);
      }
      term.dispose();
    }
    // The property is only worth something if it was asked often, over rows
    // that wrap, wide characters and spaces inside lines.
    expect(compared).toBeGreaterThan(250);
    expect(wrappedRowsSeen).toBeGreaterThan(500);
  });
});

describe('a copy holds no cell past the right edge (research 145 §4.3)', () => {
  /**
   * The pane as tmux drew it at 140 columns, in the attach client's alternate
   * buffer, then narrowed to 96 with two rows redrawn at the new width the way
   * tmux redraws them, by writing and erasing to the end of the line. xterm
   * bounds that erase by the new width, so cells 96 to 139 stay in every row.
   */
  async function narrowed(): Promise<XTerm> {
    const term = new Terminal({ cols: 140, rows: 6, allowProposedApi: true });
    await write(term, '\u001b[?1049h');
    for (let r = 0; r < 6; r += 1) {
      await write(term, `\u001b[${r + 1};1H${`row ${r}`.padEnd(96, '.')}${'界'.repeat(22)}`);
    }
    term.resize(96, 6);
    await write(
      term,
      '\u001b[1;1Hrsync -avz /a /b\u001b[K\u001b[2;1H  --delete /c\u001b[K'
    );
    return term;
  }

  it('reads every row only up to the pane\'s width', async () => {
    const term = await narrowed();
    const range: IBufferRange = { start: { x: 0, y: 0 }, end: { x: 96, y: 5 } };
    // The defect's precondition, so this test cannot pass on a buffer that
    // happens to be trimmed: the row kept its 140 cells.
    expect(term.cols).toBe(96);
    expect(term.buffer.active.getLine(0)?.length).toBe(140);
    const theirs = xtermSelectionText(term, range);
    expect(theirs.split('\n')[0]).toBe(`rsync -avz /a /b${' '.repeat(80)}${'界'.repeat(22)}`);
    const ours = drawnSelectionText(term, range);
    expect(ours).not.toContain('界');
    expect(ours.split('\n')).toEqual([
      'rsync -avz /a /b',
      '  --delete /c',
      'row 2'.padEnd(96, '.'),
      'row 3'.padEnd(96, '.'),
      'row 4'.padEnd(96, '.'),
      'row 5'.padEnd(96, '.')
    ]);
    term.dispose();
  });

  it('bounds the first row and a range whose end lies past the edge', async () => {
    const term = await narrowed();
    // A selection made before the narrowing can still name column 140.
    expect(drawnSelectionText(term, { start: { x: 90, y: 2 }, end: { x: 140, y: 2 } })).toBe(
      '......'
    );
    // A start past the edge reads nothing of its row.
    expect(drawnSelectionText(term, { start: { x: 120, y: 2 }, end: { x: 6, y: 3 } })).toBe(
      '\nrow 3.'
    );
    term.dispose();
  });
});

describe('a copied line ends at its last drawn cell, and only a line', () => {
  it('drops the spaces tmux drew at a line\'s end, which xterm\'s own text kept', async () => {
    const term = new Terminal({ cols: 40, rows: 6 });
    // tmux paints a run of fewer than ten blanks as real spaces.
    await write(term, 'x y   \r\nfoo    \r\nbar');
    const range: IBufferRange = { start: { x: 0, y: 0 }, end: { x: 3, y: 2 } };
    expect(xtermSelectionText(term, range)).toBe('x y   \nfoo    \nbar');
    expect(drawnSelectionText(term, range)).toBe('x y\nfoo\nbar');
    term.dispose();
  });

  it('keeps a space a wrapped row ends in, which is G6 (build/p368/SPEC.md §2.6)', async () => {
    const term = new Terminal({ cols: 40, rows: 4 });
    // 39 a, a written space in the 40th column, then ten b on the next row.
    await write(term, `${'a'.repeat(39)} ${'b'.repeat(10)}`);
    expect(term.buffer.active.getLine(1)?.isWrapped).toBe(true);
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 10, y: 1 } })).toBe(
      `${'a'.repeat(39)} ${'b'.repeat(10)}`
    );
    // Trimming each ROW instead would have glued the two words.
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 10, y: 1 } })).not.toBe(
      `${'a'.repeat(39)}${'b'.repeat(10)}`
    );
    // The selection's last row ends its last line, wherever the line goes on.
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } })).toBe(
      'a'.repeat(39)
    );
    term.dispose();
  });

  it('joins a wide character pushed to the next row, which is G7', async () => {
    const term = new Terminal({ cols: 40, rows: 4 });
    // 39 a, then 日 does not fit the last column: xterm leaves that cell empty
    // and wraps, as tmux's mark says.
    await write(term, `${'a'.repeat(39)}日本ccccc`);
    expect(term.buffer.active.getLine(1)?.isWrapped).toBe(true);
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 40, y: 1 } })).toBe(
      `${'a'.repeat(39)}日本ccccc`
    );
    term.dispose();
  });

  it('trims a line that ends in spaces after a row it wrapped from', async () => {
    const term = new Terminal({ cols: 10, rows: 4 });
    await write(term, `${'abcdefghij'}kl   \r\nnext`);
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 4, y: 2 } })).toBe(
      'abcdefghijkl\nnext'
    );
    term.dispose();
  });

  it('ends a line at its last non-blank cell when the blank is a non breaking space, and keeps one inside', async () => {
    const term = new Terminal({ cols: 20, rows: 4 });
    // Claude Code draws its empty prompt row as ❯ and a non breaking space.
    await write(term, '❯\u00a0\r\nnext \u00a0 \r\nin\u00a0side');
    expect(xtermSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 20, y: 2 } })).toBe(
      '❯ \nnext   \nin side'
    );
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 20, y: 2 } })).toBe(
      '❯\nnext\nin side'
    );
    term.dispose();
  });

  it('answers an empty string when nothing is selected, and a blank line as one', async () => {
    const term = new Terminal({ cols: 20, rows: 4 });
    await write(term, 'one\r\n   \r\nthree');
    const none = {
      cols: term.cols,
      buffer: term.buffer,
      getSelectionPosition: () => undefined
    };
    expect(drawnSelectionText(none)).toBe('');
    expect(drawnSelectionText(term, { start: { x: 0, y: 0 }, end: { x: 5, y: 2 } })).toBe(
      'one\n\nthree'
    );
    term.dispose();
  });
});

describe('the reference is xterm\'s own text, held against the installed source', () => {
  it('still reads the statements the transcription above was made from', () => {
    const require = createRequire(import.meta.url);
    const root = dirname(require.resolve('@xterm/xterm/package.json'));
    const service = readFileSync(
      join(root, 'src', 'browser', 'services', 'SelectionService.ts'),
      'utf8'
    );
    for (const statement of [
      'const startRowEndCol = start[1] === end[1] ? end[0] : undefined;',
      'result.push(buffer.translateBufferLineToString(start[1], true, start[0], startRowEndCol));',
      'for (let i = start[1] + 1; i <= end[1] - 1; i++) {',
      'const lineText = buffer.translateBufferLineToString(i, true);',
      'if (bufferLine?.isWrapped) {',
      'const lineText = buffer.translateBufferLineToString(end[1], true, 0, end[0]);',
      'if (bufferLine && bufferLine!.isWrapped) {',
      "return line.replace(ALL_NON_BREAKING_SPACE_REGEX, ' ');",
      "}).join(Browser.isWindows ? '\\r\\n' : '\\n');"
    ]) {
      expect(service, statement).toContain(statement);
    }
    const buffer = readFileSync(join(root, 'src', 'common', 'buffer', 'Buffer.ts'), 'utf8');
    expect(buffer).toContain('return line.translateToString(trimRight, startCol, endCol);');
    const view = readFileSync(
      join(root, 'src', 'common', 'public', 'BufferLineApiView.ts'),
      'utf8'
    );
    expect(view).toContain('return this._line.translateToString(trimRight, startColumn, endColumn);');
  });
});
