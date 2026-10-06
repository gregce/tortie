/**
 * The Screen's palette is the Mac's own dark terminal palette (Phase 337,
 * build/p337/SPEC.md §5.3.4, D12): every value of `SCREEN_PALETTE` is read
 * AS TEXT from src/renderer/terminal/theme.ts, which main may not import, and
 * held equal case-folded; `xterm256` answers xterm's own values for the cube
 * and the greys.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCREEN_PALETTE, xterm256 } from '../palette';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const THEME = readFileSync(join(ROOT, 'src', 'renderer', 'terminal', 'theme.ts'), 'utf8');

/** The dark `terminalTheme` literal's body, and nothing of the light one. */
function darkThemeBody(): string {
  const start = THEME.indexOf('export const terminalTheme: ITheme = {');
  expect(start).toBeGreaterThan(-1);
  const end = THEME.indexOf('};', start);
  return THEME.slice(start, end);
}

/** A `name: '#hex'` field of the dark theme, or a const it names. */
function field(name: string): string {
  const body = darkThemeBody();
  const found = new RegExp(`\\b${name}: (?:'(#[0-9A-Fa-f]{6})'|([A-Z_]+))`).exec(body);
  expect(found, name).not.toBeNull();
  if (found?.[1] !== undefined) return found[1].toLowerCase();
  const constant = new RegExp(`export const ${found?.[2] ?? ''} = '(#[0-9A-Fa-f]{6})'`).exec(THEME);
  expect(constant, found?.[2]).not.toBeNull();
  return (constant?.[1] ?? '').toLowerCase();
}

const SLOTS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
];

describe('SCREEN_PALETTE is the Mac’s dark terminal palette', () => {
  it('the sixteen slots, in xterm’s order, equal theme.ts’s dark values', () => {
    expect(SCREEN_PALETTE.ansi).toHaveLength(16);
    SLOTS.forEach((slot, i) => {
      expect(SCREEN_PALETTE.ansi[i], slot).toBe(field(slot));
    });
  });

  it('the ground, the ink and the caret equal TERMINAL_BACKGROUND, TERMINAL_FOREGROUND and cursor', () => {
    expect(SCREEN_PALETTE.ground).toBe(field('background'));
    expect(SCREEN_PALETTE.ink).toBe(field('foreground'));
    expect(SCREEN_PALETTE.caret).toBe(field('cursor'));
  });

  it('every value is lower case #rrggbb, and the literal is frozen', () => {
    for (const v of [SCREEN_PALETTE.ground, SCREEN_PALETTE.ink, SCREEN_PALETTE.caret, ...SCREEN_PALETTE.ansi]) {
      expect(v).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(Object.isFrozen(SCREEN_PALETTE)).toBe(true);
    expect(Object.isFrozen(SCREEN_PALETTE.ansi)).toBe(true);
  });
});

describe('xterm256', () => {
  it('answers xterm’s own values at the cube’s and the greys’ edges', () => {
    expect(xterm256(16)).toBe('#000000');
    expect(xterm256(17)).toBe('#00005f');
    expect(xterm256(21)).toBe('#0000ff');
    expect(xterm256(52)).toBe('#5f0000');
    expect(xterm256(174)).toBe('#d78787');
    expect(xterm256(211)).toBe('#ff87af');
    expect(xterm256(231)).toBe('#ffffff');
    expect(xterm256(232)).toBe('#080808');
    expect(xterm256(237)).toBe('#3a3a3a');
    expect(xterm256(244)).toBe('#808080');
    expect(xterm256(246)).toBe('#949494');
    expect(xterm256(255)).toBe('#eeeeee');
  });

  it('answers the palette’s own slots for 0 to 15', () => {
    for (let n = 0; n < 16; n += 1) expect(xterm256(n)).toBe(SCREEN_PALETTE.ansi[n]);
  });

  it('answers null for anything that is not a whole number from 0 to 255', () => {
    for (const n of [-1, 256, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(xterm256(n)).toBeNull();
  });
});
