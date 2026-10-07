/**
 * The composer (Phase 337, build/p337/SPEC.md §5.3.4, D9, D12, D15, D16),
 * over every committed capture: the composed text of every row equals the
 * capture's own text with trailing blanks dropped; every run's style is what
 * an SGR reader OF THIS TEST'S OWN (it imports nothing of src/main/screen but
 * the palette's sixteen slots, which palette.test.ts holds to the Mac's) says
 * of every code point in it; a wide cell and a tab are each their own run; the
 * caps answer `large`; and `asking` and `dialog` over Claude's and Codex's
 * committed question screens. Control characters are built at run time.
 *
 * Phase 337.1 (build/p3371/SPEC.md D3, D11, §5.3.4, §7.2): `depth` and `space`
 * set together and null together (alternate, unsteady, past the deepest
 * index); `spaceOf` the watcher's own construction, one value a pane; and
 * `composePage`, which reads every pen of the whole capture before it cuts,
 * builds runs for the asked rows alone (counted through `clusterCells`), keeps
 * the end the phone names past each cap, keeps a single row whatever it holds,
 * and gives the page a style table of its own.
 */

import { readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  POCKET_SCREEN_MAX_BYTES,
  POCKET_SCREEN_MAX_RUNS,
  POCKET_SCREEN_MAX_STYLES,
  POCKET_SCROLLBACK_MAX_INDEX,
  type PocketScreenStyle
} from '@shared/ipc/pocket';
import { detectDialogRows, hashScreen, normalizeCapture } from '../../activity/screen';
import { readBackWindowOf } from '../../reply/reader';
import {
  ACTIVITY_FIXTURES,
  activityFixture,
  plainFixture,
  REPLY_FIXTURES,
  styledFixture
} from '../../reply/__tests__/fixtures';
import {
  askingOf,
  composePage,
  composePageSteps,
  composeScreen,
  PAGE_STEP_ROWS,
  plainOf,
  questionOf,
  spaceOf,
  windowMarkOf,
  type ComposedScreen
} from '../compose';
import { SCREEN_PALETTE } from '../palette';
import type { ScreenDisplay, ScreenReading } from '../read';
import { screenRevisionOf } from '../watch';

/** How many rows the composer has cut into cells: a page builds runs for the rows it was asked for, and no others. */
const clustered = vi.hoisted(() => ({ rows: 0 }));

vi.mock('../cells', async (original) => {
  const real = await original<typeof import('../cells')>();
  return {
    ...real,
    clusterCells: (...args: Parameters<typeof real.clusterCells>) => {
      clustered.rows += 1;
      return real.clusterCells(...args);
    }
  };
});

const ESC = String.fromCharCode(0x1b);
const TAB = String.fromCharCode(0x09);
const cp = (...points: number[]): string => String.fromCodePoint(...points);

function display(cols: number, rows: number, extra: Partial<ScreenDisplay> = {}): ScreenDisplay {
  return { paneId: '%1', cols, rows, cursorX: 0, cursorY: 0, cursorVisible: true, alternate: false, history: 0, ...extra };
}

function reading(styled: string, cols = 120, rows = 40, extra: Partial<ScreenDisplay> = {}, steady = true): ScreenReading {
  return {
    styled,
    display: display(cols, rows, extra),
    displayLine: `%1\t${String(cols)}\t${String(rows)}\t0\t0\t1\t0\t0`,
    steady
  };
}

const IDLE = { turn: '0000000000000000-0', status: 'idle', typable: true } as const;

function composed(r: ScreenReading, extra: Parameters<typeof composeScreen>[1] = IDLE): ComposedScreen {
  const c = composeScreen(r, extra);
  if (c === 'large') throw new Error('large');
  return c;
}

/** A row's composed text. */
function rowText(c: ComposedScreen, row: number): string {
  return (c.screen.lines[row] ?? []).map((run) => run.text).join('');
}

/** The capture's rows, as tmux printed them (a final empty line after the last row dropped). */
function captureRows(text: string): string[] {
  const rows = text.split('\n');
  if (rows[rows.length - 1] === '') rows.pop();
  return rows;
}

// ---------------------------------------------------------------------------
// THE TEST'S OWN READER: a second, independent reading of a styled capture.
// It tokenizes with one regular expression, normalizes the colon forms to the
// semicolon form, and resolves colours with its own cube and greys.
// ---------------------------------------------------------------------------

interface OwnPen {
  fg: string | null;
  bg: string | null;
  fgSlot: number | null;
  /** A background in slots 0 to 7, kept as its slot: under inverse it is the ink, and bold brightens it (the fix round of 2026-10-06). */
  bgSlot: number | null;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  inverse: boolean;
  hidden: boolean;
  strike: boolean;
}

const TOKEN = new RegExp(`${ESC}\\[([0-9;:]*)m|${ESC}\\][^${String.fromCharCode(7)}]*${String.fromCharCode(7)}|([^${ESC}])`, 'gsu');

function own256(n: number): string {
  if (n < 16) return SCREEN_PALETTE.ansi[n] ?? '';
  const h = (v: number): string => v.toString(16).padStart(2, '0');
  if (n >= 232) {
    const g = 8 + (n - 232) * 10;
    return `#${h(g)}${h(g)}${h(g)}`;
  }
  const level = [0, 95, 135, 175, 215, 255];
  const i = n - 16;
  return `#${h(level[Math.floor(i / 36)] ?? 0)}${h(level[Math.floor((i % 36) / 6)] ?? 0)}${h(level[i % 6] ?? 0)}`;
}

/** Every code point of a styled capture with the style this test resolves for it, row by row. */
function ownStyles(styled: string): { ch: string; style: PocketScreenStyle }[][] {
  const fresh = (): OwnPen => ({ fg: null, bg: null, fgSlot: null, bgSlot: null, bold: false, dim: false, italic: false, underline: false, inverse: false, hidden: false, strike: false });
  let pen = fresh();
  const rows: { ch: string; style: PocketScreenStyle }[][] = [[]];
  for (const m of styled.matchAll(TOKEN)) {
    if (m[1] !== undefined) {
      const nums = (m[1] === '' ? '0' : m[1]).replace(/:/g, ';').split(';');
      for (let k = 0; k < nums.length; k += 1) {
        const n = nums[k] === '' ? 0 : Number(nums[k]);
        if (n === 0) pen = fresh();
        else if (n === 1) pen.bold = true;
        else if (n === 2) pen.dim = true;
        else if (n === 3) pen.italic = true;
        else if (n === 4) pen.underline = true;
        else if (n === 7) pen.inverse = true;
        else if (n === 8) pen.hidden = true;
        else if (n === 9) pen.strike = true;
        else if (n === 22) pen.bold = pen.dim = false;
        else if (n === 23) pen.italic = false;
        else if (n === 24) pen.underline = false;
        else if (n === 27) pen.inverse = false;
        else if (n === 39) pen.fg = pen.fgSlot = null;
        else if (n === 49) pen.bg = pen.bgSlot = null;
        else if (n >= 30 && n <= 37) [pen.fg, pen.fgSlot] = [null, n - 30];
        else if (n >= 90 && n <= 97) [pen.fg, pen.fgSlot] = [null, n - 82];
        else if (n >= 40 && n <= 47) [pen.bg, pen.bgSlot] = [null, n - 40];
        else if (n >= 100 && n <= 107) [pen.bg, pen.bgSlot] = [own256(n - 92), null];
        else if (n === 38 || n === 48) {
          // After normalization `38;2;;r;g;b` may carry an empty colour space.
          let colour: string;
          let slot: number | null = null;
          if (nums[k + 1] === '5') {
            slot = Number(nums[k + 2]);
            colour = own256(slot);
            k += 2;
          } else {
            const rest = nums.slice(k + 2).filter((x, i) => !(i === 0 && x === ''));
            const [r, g, b] = rest.map(Number);
            colour = `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')}`;
            k += 1 + (nums[k + 2] === '' ? 4 : 3);
          }
          if (n === 38) [pen.fg, pen.fgSlot] = slot !== null && slot < 8 ? [null, slot] : [colour, null];
          else [pen.bg, pen.bgSlot] = slot !== null && slot < 8 ? [null, slot] : [colour, null];
        }
      }
      continue;
    }
    if (m[2] === undefined) continue;
    if (m[2] === '\n') {
      rows.push([]);
      continue;
    }
    // xterm's order: inverse swaps the two first, then bold brightens the ink's slot alone.
    const inkSlot = pen.inverse ? pen.bgSlot : pen.fgSlot;
    const inkColour = pen.inverse ? pen.bg : pen.fg;
    const groundSlot = pen.inverse ? pen.fgSlot : pen.bgSlot;
    const groundColour = pen.inverse ? pen.fg : pen.bg;
    let fg = inkSlot !== null ? own256(pen.bold ? inkSlot + 8 : inkSlot) : (inkColour ?? (pen.inverse ? SCREEN_PALETTE.ground : SCREEN_PALETTE.ink));
    const bg = groundSlot !== null ? own256(groundSlot) : (groundColour ?? (pen.inverse ? SCREEN_PALETTE.ink : null));
    if (pen.hidden) fg = bg ?? SCREEN_PALETTE.ground;
    rows[rows.length - 1]?.push({
      ch: m[2],
      style: { fg, bg, bold: pen.bold, dim: pen.dim, italic: pen.italic, underline: pen.underline, strike: pen.strike }
    });
  }
  return rows;
}

const ANSI = readdirSync(REPLY_FIXTURES).filter((f) => f.endsWith('.ansi')).sort();
/** Every plain capture, with the width of the pane it was captured from: Phase 318's at 120, the activity ones at up to 160. */
const TXT: { name: string; text: string; width: number }[] = [
  ...readdirSync(REPLY_FIXTURES)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => ({ name: f, text: plainFixture(f), width: 120 })),
  ...readdirSync(ACTIVITY_FIXTURES)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => ({ name: f, text: activityFixture(f), width: 160 }))
];

describe('the composed text equals the capture’s, over every committed capture', () => {
  it('the 16 styled captures: every row’s text, by the test’s own reader, trailing blanks dropped', () => {
    expect(ANSI).toHaveLength(16);
    let rows = 0;
    for (const file of ANSI) {
      const styled = styledFixture(file);
      const c = composed(reading(styled));
      expect(c.screen.lines).toHaveLength(40);
      const own = ownStyles(styled);
      for (let r = 0; r < 40; r += 1) {
        const want = (own[r] ?? []).map((x) => x.ch).join('').replace(/ +$/, '');
        expect(rowText(c, r).replace(/ +$/, ''), `${file} row ${String(r)}`).toBe(want);
        rows += 1;
      }
    }
    expect(rows).toBe(640);
  });

  it('the 40 plain captures: every row’s text, trailing blanks dropped, and no row wider than the pane it was captured from', () => {
    expect(TXT).toHaveLength(40);
    let rows = 0;
    for (const { name, text, width } of TXT) {
      const lines = captureRows(text);
      const c = composed(reading(text, 512, lines.length));
      lines.forEach((line, r) => {
        expect(rowText(c, r), `${name} row ${String(r)}`).toBe(line.replace(/ +$/, ''));
        const cells = (c.screen.lines[r] ?? []).reduce((n, run) => n + run.cells, 0);
        expect(cells, `${name} row ${String(r)}`).toBeLessThanOrEqual(width);
        rows += 1;
      });
    }
    expect(rows).toBeGreaterThan(1500);
  });

  it('plainOf is the composed rows’ text, one row a line', () => {
    for (const file of ANSI) {
      const r = reading(styledFixture(file));
      const c = composed(r);
      expect(plainOf(r)).toBe(c.plain);
      expect(c.plain.split('\n')).toHaveLength(40);
      expect(c.plain.split('\n').map((t, i) => t === rowText(c, i)).every(Boolean)).toBe(true);
    }
  });
});

describe('every run’s style is what the test’s own reader resolves', () => {
  it('over the 16 styled captures, code point for code point', () => {
    let checked = 0;
    const indices = new Set<string>();
    for (const file of ANSI) {
      const styled = styledFixture(file);
      const c = composed(reading(styled));
      const own = ownStyles(styled);
      for (let r = 0; r < 40; r += 1) {
        const points = own[r] ?? [];
        let at = 0;
        for (const run of c.screen.lines[r] ?? []) {
          const style = c.screen.styles[run.style];
          for (const ch of run.text) {
            const mine = points[at];
            expect(mine?.ch, `${file} ${String(r)}:${String(at)}`).toBe(ch);
            expect(style, `${file} ${String(r)}:${String(at)}`).toEqual(mine?.style);
            indices.add(style?.fg ?? '');
            at += 1;
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(5_000);
    // The captures' 256-colour indices resolve through the cube and the greys, not to sixteen slots.
    expect(indices.has('#d78787')).toBe(true);
    expect(indices.has('#949494')).toBe(true);
  });

  it('resolution: inverse swaps, then bold brightens slots 0 to 7 of the ink only, hidden takes its ground', () => {
    const style = (sgr: string): PocketScreenStyle | undefined => {
      const c = composed(reading(`${ESC}[${sgr}mx`, 10, 1));
      return c.screen.styles[c.screen.lines[0]?.[0]?.style ?? -1];
    };
    expect(style('1;31')?.fg).toBe(SCREEN_PALETTE.ansi[9]);
    expect(style('1;38;5;3')?.fg).toBe(SCREEN_PALETTE.ansi[11]);
    expect(style('1;38;5;100')?.fg).toBe('#878700');
    expect(style('1;41')?.bg).toBe(SCREEN_PALETTE.ansi[1]);
    expect(style('38;2;1;2;3')?.fg).toBe('#010203');
    expect(style('7')).toMatchObject({ fg: SCREEN_PALETTE.ground, bg: SCREEN_PALETTE.ink });
    expect(style('7;31;42')).toMatchObject({ fg: SCREEN_PALETTE.ansi[2], bg: SCREEN_PALETTE.ansi[1] });
    expect(style('8')).toMatchObject({ fg: SCREEN_PALETTE.ground, bg: null });
    expect(style('8;44')).toMatchObject({ fg: SCREEN_PALETTE.ansi[4], bg: SCREEN_PALETTE.ansi[4] });
    // The fix round of 2026-10-06: inverse swaps FIRST and bold brightens the
    // ink after, as @xterm/addon-webgl draws it: the ground is the pen's
    // foreground slot as written, never brightened, and the ink is its
    // background, brightened by bold. The verify measured bold inverse red
    // drawn on #f07e78 by the door and on #e5655e by the Mac.
    expect(style('1;7;31')).toMatchObject({ fg: SCREEN_PALETTE.ground, bg: SCREEN_PALETTE.ansi[1] });
    expect(style('1;7;31')?.bg).not.toBe(SCREEN_PALETTE.ansi[9]);
    expect(style('1;7;31;44')).toMatchObject({ fg: SCREEN_PALETTE.ansi[12], bg: SCREEN_PALETTE.ansi[1] });
    expect(style('1;7;38;5;2;48;5;3')).toMatchObject({ fg: SCREEN_PALETTE.ansi[11], bg: SCREEN_PALETTE.ansi[2] });
    expect(style('1;7;38;2;1;2;3;41')).toMatchObject({ fg: SCREEN_PALETTE.ansi[9], bg: '#010203' });
    expect(style('1;7')).toMatchObject({ fg: SCREEN_PALETTE.ground, bg: SCREEN_PALETTE.ink });
    // Every slot 0 to 7, bold and inverse, as foreground and as background.
    for (let n = 0; n < 8; n += 1) {
      expect(style(`1;7;${String(30 + n)}`)?.bg).toBe(SCREEN_PALETTE.ansi[n]);
      expect(style(`1;7;${String(40 + n)}`)?.fg).toBe(SCREEN_PALETTE.ansi[n + 8]);
    }
    expect(style('0')).toEqual({ fg: SCREEN_PALETTE.ink, bg: null, bold: false, dim: false, italic: false, underline: false, strike: false });
  });

  it('the style table holds each style once', () => {
    const c = composed(reading(`${ESC}[31ma${ESC}[32mb${ESC}[31mc\n${ESC}[32md`, 10, 2));
    expect(c.screen.styles.map((s) => s.fg)).toEqual([SCREEN_PALETTE.ansi[1], SCREEN_PALETTE.ansi[2]]);
  });
});

describe('runs', () => {
  it('width-1 cells of one style run together; a wide cell is always its own run', () => {
    const wide = cp(0x6f22);
    const c = composed(reading(`ab${wide}${cp(0x1f44d)}cd`, 20, 1));
    expect(c.screen.lines[0]).toEqual([
      { text: 'ab', style: 0, cells: 2 },
      { text: wide, style: 0, cells: 2 },
      { text: cp(0x1f44d), style: 0, cells: 2 },
      { text: 'cd', style: 0, cells: 2 }
    ]);
  });

  it('a tab is its own run, spanning to the next multiple of eight, and its text is the tab tmux printed', () => {
    const c = composed(reading(`a${TAB}b${TAB}12345678${TAB}z|`, 40, 1));
    expect(c.screen.lines[0]).toEqual([
      { text: 'a', style: 0, cells: 1 },
      { text: TAB, style: 0, cells: 7 },
      { text: 'b', style: 0, cells: 1 },
      { text: TAB, style: 0, cells: 7 },
      { text: '12345678', style: 0, cells: 8 },
      { text: TAB, style: 0, cells: 8 },
      { text: 'z|', style: 0, cells: 2 }
    ]);
  });

  it('a row never covers more columns than the pane: a wide cell that does not fit is not drawn', () => {
    const c = composed(reading(`abc${cp(0x6f22)}`, 4, 1));
    expect(c.screen.lines[0]).toEqual([{ text: 'abc', style: 0, cells: 3 }]);
    const t = composed(reading(`abcdef${TAB}x`, 8, 1));
    expect(t.screen.lines[0]?.reduce((n, run) => n + run.cells, 0)).toBe(8);
  });

  it('trailing blanks in the ground are dropped; a blank with a ground, an underline or a strike is kept', () => {
    expect(composed(reading('ab   ', 10, 1)).screen.lines[0]).toEqual([{ text: 'ab', style: 0, cells: 2 }]);
    expect(rowText(composed(reading(`ab${ESC}[44m  `, 10, 1)), 0)).toBe('ab  ');
    expect(rowText(composed(reading(`ab${ESC}[4m  `, 10, 1)), 0)).toBe('ab  ');
    expect(rowText(composed(reading(`ab${ESC}[9m `, 10, 1)), 0)).toBe('ab ');
    expect(rowText(composed(reading(`ab${ESC}[53m `, 10, 1)), 0)).toBe('ab ');
    expect(rowText(composed(reading(`ab${ESC}[7m `, 10, 1)), 0)).toBe('ab ');
    expect(composed(reading('   ', 10, 1)).screen.lines[0]).toEqual([]);
  });

  it('a row the reader could not follow is drawn as its text in the default style', () => {
    const c = composed(reading(`${ESC}[31mred${ESC}[2Kafter`, 20, 1));
    expect(c.screen.lines[0]).toEqual([{ text: 'redafter', style: 0, cells: 8 }]);
    expect(c.screen.styles[0]).toMatchObject({ fg: SCREEN_PALETTE.ink, bg: null });
  });

  it('exactly `rows` rows: fewer are padded with empty rows, more are cut', () => {
    expect(composed(reading('a\nb', 10, 5)).screen.lines).toEqual([
      [{ text: 'a', style: 0, cells: 1 }],
      [{ text: 'b', style: 0, cells: 1 }],
      [],
      [],
      []
    ]);
    expect(composed(reading('a\nb\nc', 10, 2)).screen.lines).toHaveLength(2);
  });
});

describe('the envelope', () => {
  it('carries the display, the Mac’s colours, the turn and typable', () => {
    const c = composed(reading('x', 80, 24, { cursorX: 5, cursorY: 7, cursorVisible: false, alternate: true }), {
      turn: '0123456789abcdef-7',
      status: 'running',
      typable: true
    });
    expect(c.screen).toMatchObject({
      cols: 80,
      rows: 24,
      cursor: { x: 5, y: 7, visible: false },
      alternate: true,
      ground: SCREEN_PALETTE.ground,
      ink: SCREEN_PALETTE.ink,
      caret: SCREEN_PALETTE.caret,
      turn: '0123456789abcdef-7',
      typable: true
    });
  });

  it('the cursor is held inside the screen the phone will check it against', () => {
    const c = composed(reading('x', 80, 24, { cursorX: 90, cursorY: 30 }));
    expect(c.screen.cursor).toMatchObject({ x: 80, y: 23 });
  });
});

describe('the caps (D15)', () => {
  it('513 columns or 201 rows is `large`; 512 and 200 are not', () => {
    expect(composeScreen(reading('x', 513, 10), IDLE)).toBe('large');
    expect(composeScreen(reading('x', 10, 201), IDLE)).toBe('large');
    expect(composeScreen(reading('x', 512, 200), IDLE)).not.toBe('large');
  });

  it('1,025 styles is `large`; 1,024 is not', () => {
    const screen = (n: number): string => {
      let text = '';
      for (let i = 0; i < n; i += 1) text += `${ESC}[38;2;${String(i >> 8)};${String(i & 255)};1mx${i % 100 === 99 ? '\n' : ''}`;
      return text;
    };
    expect(composeScreen(reading(screen(1025), 120, 20), IDLE)).toBe('large');
    const fits = composeScreen(reading(screen(1024), 120, 20), IDLE);
    expect(fits).not.toBe('large');
    expect(fits === 'large' ? 0 : fits.screen.styles.length).toBe(1024);
  });

  it('16,385 runs is `large`; 16,384 is not', () => {
    const screen = (runs: number): string => {
      const rows: string[] = [];
      let made = 0;
      while (made < runs) {
        let row = '';
        for (let col = 0; col < 100 && made < runs; col += 1, made += 1) row += `${ESC}[3${String(col % 2)}mx`;
        rows.push(row);
      }
      return rows.join('\n');
    };
    expect(composeScreen(reading(screen(16_385), 100, 200), IDLE)).toBe('large');
    const fits = composeScreen(reading(screen(16_384), 100, 200), IDLE);
    expect(fits).not.toBe('large');
  });

  it('an answer over 1 MiB is `large`, under every other cap', () => {
    // Each cell a base and twenty combining marks: one column, 41 bytes.
    const cell = `e${cp(0x301).repeat(20)}`;
    const row = cell.repeat(512);
    const big = Array.from({ length: 60 }, () => row).join('\n');
    expect(composeScreen(reading(big, 512, 60), IDLE)).toBe('large');
    const small = Array.from({ length: 40 }, () => row).join('\n');
    const fits = composeScreen(reading(small, 512, 40), IDLE);
    expect(fits).not.toBe('large');
    expect(fits === 'large' ? 0 : fits.bytes).toBeGreaterThan(800_000);
    expect(fits === 'large' ? Infinity : fits.bytes).toBeLessThanOrEqual(1_048_576);
  });
});

describe('asking and dialog (D16)', () => {
  const QUESTIONS: { name: string; text: string }[] = [
    { name: 'claude-bash-2.1.287.txt', text: plainFixture('claude-bash-2.1.287.txt') },
    { name: 'codex-approval-0.160.0.txt', text: plainFixture('codex-approval-0.160.0.txt') },
    { name: 'claude-permission-prompt.txt', text: activityFixture('claude-permission-prompt.txt') }
  ];

  it('a numbered question drawn is asking, and dialog is the window’s mark of the same text', () => {
    for (const { name, text } of QUESTIONS) {
      expect(detectDialogRows(normalizeCapture(text)).atChoice, name).toBe(true);
      const lines = captureRows(text);
      const c = composed(reading(text, 512, lines.length), { turn: 'aaaaaaaaaaaaaaaa-3', status: 'running', typable: true });
      expect(c.screen.asking, name).toBe(true);
      expect(c.screen.dialog, name).toMatch(/^[0-9a-f]{12}$/);
      expect(c.screen.dialog, name).toBe(hashScreen(readBackWindowOf(text)));
      expect(c.mark, name).toBe(c.screen.dialog);
    }
  });

  it('a screen with no question is not asking, and dialog is null, unless the session waits on him', () => {
    for (const name of ['claude-idle.txt', 'codex-idle.txt', 'shell-idle.txt']) {
      const text = activityFixture(name);
      const lines = captureRows(text);
      const r = reading(text, 512, lines.length);
      const idle = composed(r);
      expect(idle.screen.asking, name).toBe(false);
      expect(idle.screen.dialog, name).toBeNull();
      expect(idle.mark, name).toBe(windowMarkOf(idle.plain));
      const waiting = composed(r, { turn: 'aaaaaaaaaaaaaaaa-3', status: 'needs_input', typable: true });
      expect(waiting.screen.asking, name).toBe(true);
      expect(waiting.screen.dialog, name).toBe(windowMarkOf(waiting.plain));
    }
  });

  it('windowMarkOf is the press’s own read-back window, hashed: one spelling', () => {
    const text = plainFixture('codex-approval-0.160.0.txt');
    expect(windowMarkOf(text)).toBe(hashScreen(readBackWindowOf(text)));
    // Trailing blanks and blank rows below do not move it.
    expect(windowMarkOf(`${text}   \n\n\n`)).toBe(windowMarkOf(text));
  });

  it('questionOf and askingOf answer what the composed screen answers', () => {
    const text = plainFixture('claude-bash-2.1.287.txt');
    const lines = captureRows(text);
    const r = reading(text, 512, lines.length);
    const c = composed(r);
    const q = questionOf(r, 'idle');
    expect(q).toEqual({ plain: c.plain, asking: c.screen.asking, dialog: c.screen.dialog, mark: c.mark });
    expect(askingOf(c.plain, 'idle')).toBe(true);
    expect(askingOf('nothing here', 'idle')).toBe(false);
    expect(askingOf('nothing here', 'needs_input')).toBe(true);
  });
});

describe('where the picture sits in the history (Phase 337.1 D3)', () => {
  const at = (extra: Partial<ScreenDisplay>, steady = true): ComposedScreen =>
    composed(reading('x', 80, 24, { history: 2961, ...extra }, steady));

  it('a steady read of the normal screen carries the history size and the pane’s space, together', () => {
    const c = at({ paneId: '%7' });
    expect(c.screen.depth).toBe(2961);
    expect(c.screen.space).toBe(spaceOf('%7'));
    expect(c.screen.space).toMatch(/^[0-9a-f]{12}$/);
  });

  it('both null together: the alternate screen, a read whose displays disagreed, a history past the deepest index', () => {
    for (const [why, c] of [
      ['alternate', at({ alternate: true })],
      ['unsteady', at({}, false)],
      ['past the deepest index', at({ history: POCKET_SCROLLBACK_MAX_INDEX + 1 })],
      ['nine digits', at({ history: 999_999_999 })]
    ] as const) {
      expect(c.screen.depth, why).toBeNull();
      expect(c.screen.space, why).toBeNull();
    }
    // The deepest index itself is still a place.
    expect(at({ history: POCKET_SCROLLBACK_MAX_INDEX }).screen.depth).toBe(POCKET_SCROLLBACK_MAX_INDEX);
    // A history of nothing is a place: 0.
    expect(at({ history: 0 }).screen.depth).toBe(0);
  });

  it('spaceOf is the watcher’s own construction over `space` and the pane: one value a pane, another for another', () => {
    expect(spaceOf('%7')).toBe(screenRevisionOf(['space', '%7']));
    expect(spaceOf('%7')).toBe(spaceOf('%7'));
    expect(spaceOf('%7')).not.toBe(spaceOf('%8'));
    expect(spaceOf('%70')).not.toBe(spaceOf('%7'));
    // No tmux id crosses the wire: the space is a hash, never the id.
    expect(spaceOf('%7')).not.toContain('%');
  });
});

/** Numbered history lines as tmux prints them: `L000001` is index 0. */
function numbered(first: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `L${String(first + i + 1).padStart(6, '0')}`);
}

/** A page's row texts. */
function pageTexts(rows: readonly (readonly { text: string }[])[]): string[] {
  return rows.map((runs) => runs.map((run) => run.text).join(''));
}

describe('composePage (Phase 337.1 D11): composed whole, then cut', () => {
  it('the rows asked, by index, from a capture that starts in the overscan', () => {
    // The capture holds lines 72 to 299; the page is lines 200 to 299.
    const lines = numbered(72, 228);
    const page = composePage(lines.join('\n'), 72, 120, { from: 200, count: 100, keep: 'bottom' });
    expect(page.from).toBe(200);
    expect(pageTexts(page.rows)).toEqual(numbered(200, 100));
    expect(page.styles).toHaveLength(1);
    expect(page.bytes).toBe(Buffer.byteLength(JSON.stringify({ styles: page.styles, rows: page.rows }), 'utf8'));
  });

  it('reads every pen before it cuts: a pen opened in the overscan is carried into the first kept row', () => {
    // tmux writes each cell's style as a change from the cell before it,
    // ACROSS rows, so the kept row carries no SGR of its own.
    const capture = [`${ESC}[31mred above`, 'still red', `${ESC}[1mbold too`, 'kept'].join('\n');
    const page = composePage(capture, 10, 40, { from: 13, count: 1, keep: 'top' });
    expect(pageTexts(page.rows)).toEqual(['kept']);
    expect(page.styles).toHaveLength(1);
    expect(page.styles[0]).toMatchObject({ fg: SCREEN_PALETTE.ansi[9], bold: true });
    // Cut BEFORE composing, the same row would have lost its pen.
    const cut = composePage('kept', 13, 40, { from: 13, count: 1, keep: 'top' });
    expect(cut.styles[0]).toMatchObject({ fg: SCREEN_PALETTE.ink, bold: false });
  });

  it('builds runs for the asked rows alone, never for the overscan it read (§Attack B10)', () => {
    const lines = numbered(0, 236);
    clustered.rows = 0;
    composePage(lines.join('\n'), 0, 120, { from: 128, count: 108, keep: 'bottom' });
    expect(clustered.rows).toBe(108);
  });

  it('a step at a time (the fix round): a stop after every PAGE_STEP_ROWS rows read and built, and the same page', () => {
    // A pen opened in the overscan, carried into the kept rows across the steps.
    const lines = [`${ESC}[1;35mL000001`, ...numbered(1, 235)];
    const want = { from: 128, count: 108, keep: 'bottom' } as const;
    const steps = composePageSteps(lines.join('\n'), 0, 120, want);
    let stops = 0;
    let step = steps.next();
    while (step.done !== true) {
      stops += 1;
      step = steps.next();
    }
    expect(PAGE_STEP_ROWS).toBe(4);
    expect(stops).toBe(Math.floor(236 / PAGE_STEP_ROWS) + Math.floor(108 / PAGE_STEP_ROWS));
    expect(step.value).toEqual(composePage(lines.join('\n'), 0, 120, want));
    expect(step.value.styles[0]).toMatchObject({ fg: SCREEN_PALETTE.ansi[13], bold: true });
  });

  it('a row the capture does not hold is empty', () => {
    const page = composePage(numbered(0, 3).join('\n'), 0, 40, { from: 2, count: 3, keep: 'top' });
    expect(pageTexts(page.rows)).toEqual(['L000003', '', '']);
  });

  it('a page’s own style table: only the kept rows’ styles, numbered in their order from 0', () => {
    const capture = [`${ESC}[32mgreen`, `${ESC}[33myellow`, `${ESC}[34mblue`].join('\n');
    const page = composePage(capture, 0, 40, { from: 1, count: 2, keep: 'top' });
    expect(page.styles.map((st) => st.fg)).toEqual([SCREEN_PALETTE.ansi[3], SCREEN_PALETTE.ansi[4]]);
    expect(page.rows.map((runs) => runs.map((run) => run.style))).toEqual([[0], [1]]);
  });

  /** One row of `cols` cells, each its own 24-bit colour, unique across the whole capture. */
  const colourRows = (rows: number, cols: number): string =>
    Array.from({ length: rows }, (_, r) => {
      let row = '';
      for (let c = 0; c < cols; c += 1) {
        const n = r * cols + c;
        row += `${ESC}[38;2;${String(n >> 16)};${String((n >> 8) & 255)};${String(n & 255)}mx`;
      }
      return row;
    }).join('\n');

  it('past the style cap it keeps the longest run of rows from the end it is told, bottom or top', () => {
    // 120 styles a row: 8 rows are 960 styles, 9 are 1,080.
    const capture = colourRows(20, 120);
    const bottom = composePage(capture, 500, 120, { from: 500, count: 20, keep: 'bottom' });
    expect(bottom.rows).toHaveLength(8);
    expect(bottom.from).toBe(512);
    expect(bottom.styles).toHaveLength(960);
    const top = composePage(capture, 500, 120, { from: 500, count: 20, keep: 'top' });
    expect(top.rows).toHaveLength(8);
    expect(top.from).toBe(500);
    expect(top.styles.length).toBeLessThanOrEqual(POCKET_SCREEN_MAX_STYLES);
    // The kept rows are the asked rows nearest that end, whole.
    expect(bottom.rows[7]?.length).toBe(120);
  });

  it('the cut is decided from the end it keeps: plain rows above heavy ones keep only heavy rows that fit', () => {
    // Ten plain rows, then ten rows of 120 styles each.
    const capture = [...numbered(0, 10), colourRows(10, 120)].join('\n');
    const bottom = composePage(capture, 0, 120, { from: 0, count: 20, keep: 'bottom' });
    expect(bottom.rows).toHaveLength(8);
    expect(bottom.from).toBe(12);
    expect(bottom.styles.length).toBeLessThanOrEqual(POCKET_SCREEN_MAX_STYLES);
    const top = composePage(capture, 0, 120, { from: 0, count: 20, keep: 'top' });
    expect(top.from).toBe(0);
    expect(top.rows).toHaveLength(18);
    expect(top.styles.length).toBeLessThanOrEqual(POCKET_SCREEN_MAX_STYLES);
    expect(pageTexts(top.rows).slice(0, 10)).toEqual(numbered(0, 10));
  });

  it('past the run cap it keeps what fits from the end it is told', () => {
    // 512 runs a row (two colours alternating): 32 rows are 16,384.
    const row = Array.from({ length: 512 }, (_, c) => `${ESC}[3${String(c % 2)}mx`).join('');
    const capture = Array.from({ length: 40 }, () => row).join('\n');
    const bottom = composePage(capture, 0, 512, { from: 0, count: 40, keep: 'bottom' });
    expect(bottom.rows).toHaveLength(32);
    expect(bottom.from).toBe(8);
    expect(bottom.rows.reduce((n, runs) => n + runs.length, 0)).toBe(POCKET_SCREEN_MAX_RUNS);
    const top = composePage(capture, 0, 512, { from: 0, count: 40, keep: 'top' });
    expect(top.rows).toHaveLength(32);
    expect(top.from).toBe(0);
  });

  it('past 1 MiB it keeps what fits, with room left for the answer’s envelope', () => {
    // Each cell a base and twenty combining marks: one column, 41 bytes.
    const cell = `e${cp(0x301).repeat(20)}`;
    const capture = Array.from({ length: 60 }, () => cell.repeat(512)).join('\n');
    const bottom = composePage(capture, 0, 512, { from: 0, count: 60, keep: 'bottom' });
    expect(bottom.rows.length).toBeGreaterThan(20);
    expect(bottom.rows.length).toBeLessThan(60);
    expect(bottom.from).toBe(60 - bottom.rows.length);
    expect(bottom.bytes).toBeLessThanOrEqual(POCKET_SCREEN_MAX_BYTES - 1_024);
    // One more row would not have fitted.
    const more = composePage(capture, 0, 512, { from: bottom.from - 1, count: bottom.rows.length + 1, keep: 'top' });
    expect(more.rows.length).toBe(bottom.rows.length);
    const top = composePage(capture, 0, 512, { from: 0, count: 60, keep: 'top' });
    expect(top.from).toBe(0);
    expect(top.rows.length).toBe(bottom.rows.length);
  });

  it('a single row always fits: 512 cells of 512 styles is kept whole', () => {
    const page = composePage(colourRows(1, 512), 0, 512, { from: 0, count: 1, keep: 'bottom' });
    expect(page.rows).toHaveLength(1);
    expect(page.styles).toHaveLength(512);
    // Two such rows are exactly 1,024 styles, which fits; a third passes the
    // cap, and the end asked for is the one kept, its table numbered from 0.
    const three = composePage(colourRows(3, 512), 0, 512, { from: 0, count: 3, keep: 'bottom' });
    expect(three.rows).toHaveLength(2);
    expect(three.from).toBe(1);
    expect(three.styles).toHaveLength(POCKET_SCREEN_MAX_STYLES);
    expect(three.rows[0]?.[0]?.style).toBe(0);
  });

  it('every row’s cells stop at the width, as the live screen’s do', () => {
    const page = composePage(`${'abcdefghij'.repeat(10)}`, 0, 40, { from: 0, count: 1, keep: 'top' });
    expect(page.rows[0]?.reduce((n, run) => n + run.cells, 0)).toBe(40);
  });
});
