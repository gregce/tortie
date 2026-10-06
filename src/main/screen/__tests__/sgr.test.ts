/**
 * The one reader of tmux's styles (Phase 337, build/p337/SPEC.md §5.3.4, D11):
 * every attribute and colour form tmux writes, the pen carried across rows,
 * `basic` and `index` kept apart, and what makes a row unreadable. Control
 * characters are built from code points at run time.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_PEN, readStyledRows, type Pen } from '../sgr';

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
const csi = (params: string): string => `${ESC}[${params}m`;

/** The pen of the first cell of the first row. */
function penOf(styled: string): Pen {
  const cell = readStyledRows(styled)[0]?.cells[0];
  expect(cell).toBeDefined();
  return cell?.pen ?? DEFAULT_PEN;
}

describe('readStyledRows: the forms tmux writes', () => {
  it('reads every attribute on and off', () => {
    const on = penOf(`${csi('1;2;3;4;5;7;8;9;53')}x`);
    expect(on).toMatchObject({ bold: true, dim: true, italic: true, underline: true, blink: true, inverse: true, hidden: true, strike: true, overline: true });
    expect(penOf(`${csi('6')}x`).blink).toBe(true);
    expect(penOf(`${csi('21')}x`).underline).toBe(true);
    const off = penOf(`${csi('1;2;3;4;5;7;8;9;53')}${csi('22;23;24;25;27;28;29;55')}x`);
    expect(off).toMatchObject({ bold: false, dim: false, italic: false, underline: false, blink: false, inverse: false, hidden: false, strike: false, overline: false });
    expect(penOf(`${csi('1;7;38;5;1')}${csi('0')}x`)).toEqual(DEFAULT_PEN);
    expect(penOf(`${csi('1;7')}${csi('')}x`)).toEqual(DEFAULT_PEN);
  });

  it('reads an underline’s style, 4:0 off and 4:1 to 4:5 on', () => {
    expect(penOf(`${csi('4:3')}x`).underline).toBe(true);
    expect(penOf(`${csi('4')}${csi('4:0')}x`).underline).toBe(false);
  });

  it('reads the basic colours as `basic`, 30 to 37 and 90 to 97, and their grounds', () => {
    expect(penOf(`${csi('31')}x`).fg).toEqual({ kind: 'basic', n: 1 });
    expect(penOf(`${csi('90')}x`).fg).toEqual({ kind: 'basic', n: 8 });
    expect(penOf(`${csi('97')}x`).fg).toEqual({ kind: 'basic', n: 15 });
    expect(penOf(`${csi('44')}x`).bg).toEqual({ kind: 'basic', n: 4 });
    expect(penOf(`${csi('107')}x`).bg).toEqual({ kind: 'basic', n: 15 });
    expect(penOf(`${csi('31;44')}${csi('39;49')}x`)).toMatchObject({ fg: null, bg: null });
  });

  it('reads 256 colours as `index` in both spellings, never as `basic`', () => {
    expect(penOf(`${csi('38;5;246')}x`).fg).toEqual({ kind: 'index', n: 246 });
    expect(penOf(`${csi('38:5:246')}x`).fg).toEqual({ kind: 'index', n: 246 });
    expect(penOf(`${csi('48;5;237')}x`).bg).toEqual({ kind: 'index', n: 237 });
    expect(penOf(`${csi('38;5;8')}x`).fg).toEqual({ kind: 'index', n: 8 });
  });

  it('reads 24-bit colours in all three spellings', () => {
    const want = { kind: 'rgb', r: 255, g: 100, b: 0 };
    expect(penOf(`${csi('38;2;255;100;0')}x`).fg).toEqual(want);
    expect(penOf(`${csi('38:2::255:100:0')}x`).fg).toEqual(want);
    expect(penOf(`${csi('38:2:255:100:0')}x`).fg).toEqual(want);
    expect(penOf(`${csi('48;2;30;60;90')}x`).bg).toEqual({ kind: 'rgb', r: 30, g: 60, b: 90 });
  });

  it('reads an underline colour (58) as a colour and consumes its arguments', () => {
    const p = penOf(`${csi('58;5;2')}x`);
    expect(p.ul).toEqual({ kind: 'index', n: 2 });
    // The parent reader read this `2` as dim; this reader reads the colour it is.
    expect(p.dim).toBe(false);
    const q = penOf(`${csi('58;2;7;8;9')}x`);
    expect(q.ul).toEqual({ kind: 'rgb', r: 7, g: 8, b: 9 });
    expect(q.inverse).toBe(false);
    expect(q.hidden).toBe(false);
    expect(penOf(`${csi('58:5:196')}${csi('59')}x`).ul).toBeNull();
  });

  it('an arguments list after an extended colour is read as the next codes', () => {
    expect(penOf(`${csi('38;5;196;1')}x`)).toMatchObject({ fg: { kind: 'index', n: 196 }, bold: true });
    expect(penOf(`${csi('48;2;1;2;3;7')}x`)).toMatchObject({ bg: { kind: 'rgb', r: 1, g: 2, b: 3 }, inverse: true });
  });

  it('an index or a component that is not a byte is the default colour, and the row stays readable', () => {
    for (const params of ['38;5;300', '38;5', '38:5', '38;2;1;2', '38:2', '38;2;256;0;0']) {
      const rows = readStyledRows(`${csi('31')}${csi(params)}x`);
      expect(rows[0]?.readable, params).toBe(true);
      expect(rows[0]?.cells[0]?.pen.fg, params).toBeNull();
    }
  });

  it('a parameter with no meaning here is ignored, and the row stays readable', () => {
    const rows = readStyledRows(`${csi('10;51;73;200')}x`);
    expect(rows[0]?.readable).toBe(true);
    expect(rows[0]?.cells[0]?.pen).toEqual(DEFAULT_PEN);
  });
});

describe('readStyledRows: rows', () => {
  it('carries the pen across rows: tmux does not reset at a row’s end', () => {
    const rows = readStyledRows(`${csi('2;38;5;244')}a\nb\n${csi('0')}c`);
    expect(rows).toHaveLength(3);
    expect(rows[1]?.cells[0]?.pen).toMatchObject({ dim: true, fg: { kind: 'index', n: 244 } });
    expect(rows[2]?.cells[0]?.pen).toEqual(DEFAULT_PEN);
  });

  it('one row per line, empty rows kept', () => {
    expect(readStyledRows('a\n\n\nb').map((r) => r.cells.map((c) => c.ch).join(''))).toEqual(['a', '', '', 'b']);
    expect(readStyledRows('')).toHaveLength(1);
  });

  it('one cell per code point, astral included', () => {
    const text = String.fromCodePoint(0x1f44d, 0x6f22, 0x41);
    expect(readStyledRows(text)[0]?.cells.map((c) => c.ch)).toEqual([String.fromCodePoint(0x1f44d), String.fromCodePoint(0x6f22), 'A']);
  });

  it('skips an OSC to BEL or ST, drawing no cell, and the row stays readable', () => {
    const link = `${ESC}]8;;https://example.invalid${BEL}link${ESC}]8;;${ESC}\\`;
    const rows = readStyledRows(`a${link}b`);
    expect(rows[0]?.readable).toBe(true);
    expect(rows[0]?.cells.map((c) => c.ch).join('')).toBe('alinkb');
  });

  it('an OSC with no terminator before the row ends makes the row unreadable and keeps the next row', () => {
    const rows = readStyledRows(`a${ESC}]8;;x\nb`);
    expect(rows[0]?.readable).toBe(false);
    expect(rows[1]?.cells.map((c) => c.ch).join('')).toBe('b');
  });

  it('keeps a tab as a cell and the row readable (tmux 3.7b prints a tab as one tab)', () => {
    const rows = readStyledRows('a\tb');
    expect(rows[0]?.readable).toBe(true);
    expect(rows[0]?.cells.map((c) => c.ch)).toEqual(['a', '\t', 'b']);
  });
});

describe('readStyledRows: what makes a row unreadable', () => {
  it('an escape other than an SGR or an OSC', () => {
    for (const seq of [`${ESC}[2K`, `${ESC}[1;2H`, `${ESC}(B`, `${ESC}7`]) {
      const rows = readStyledRows(`a${seq}b`);
      expect(rows[0]?.readable, JSON.stringify(seq)).toBe(false);
    }
  });

  it('an SGR with intermediate bytes, a non-numeric parameter, or a colour mode other than 5 and 2', () => {
    for (const seq of [`${ESC}[1 m`, `${ESC}[?25m`, `${ESC}[<1m`, csi('38;7;1'), csi('38:9:1'), csi('38'), csi('48;9')]) {
      const rows = readStyledRows(`a${seq}b`);
      expect(rows[0]?.readable, JSON.stringify(seq)).toBe(false);
    }
  });

  it('the parameters before one it cannot follow still apply, as in the parent reader', () => {
    const rows = readStyledRows(`${csi('2;7;38;7;1')}x\ny`);
    expect(rows[0]?.readable).toBe(false);
    expect(rows[0]?.cells[0]?.pen).toMatchObject({ dim: true, inverse: true });
    expect(rows[1]?.readable).toBe(true);
    expect(rows[1]?.cells[0]?.pen).toMatchObject({ dim: true, inverse: true });
  });

  it('a control cell (C0 but a tab, DEL, C1) is not kept and makes the row unreadable', () => {
    for (const code of [0x00, 0x07, 0x0d, 0x1f, 0x7f, 0x80, 0x9b, 0x9f]) {
      const rows = readStyledRows(`a${String.fromCharCode(code)}b`);
      expect(rows[0]?.readable, code.toString(16)).toBe(false);
      expect(rows[0]?.cells.map((c) => c.ch).join(''), code.toString(16)).toBe('ab');
    }
  });

  it('a bare ESC takes the next character with it, exactly as the parent reader did', () => {
    const rows = readStyledRows(`a${ESC}\nb`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.readable).toBe(false);
    expect(rows[0]?.cells.map((c) => c.ch).join('')).toBe('ab');
  });

  it('a cell holds a frozen pen: nothing can change a drawn cell’s style after it', () => {
    const rows = readStyledRows(`${csi('1')}a${csi('22')}b`);
    const first = rows[0]?.cells[0]?.pen;
    expect(Object.isFrozen(first)).toBe(true);
    expect(first?.bold).toBe(true);
    expect(rows[0]?.cells[1]?.pen.bold).toBe(false);
  });
});
