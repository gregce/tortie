/**
 * Phase 207. The terminal's text colours follow the ground.
 *
 * On the shipped canvas the eighteen colours are the DESIGN.md section 1.6
 * constants, byte for byte, so nothing the capture path or the workers read
 * has moved. On a light canvas every one is darker than the ground and keeps
 * the ratio it ships with where that ratio is reachable.
 */

import { describe, expect, it } from 'vitest';
import { converter, parse, wcagContrast } from 'culori';
import {
  TERMINAL_BACKGROUND,
  TERMINAL_BACKGROUND_LIGHT,
  terminalContrastFloorFor,
  terminalTextFor,
  terminalTheme,
  terminalThemeLight
} from '../theme';
import { wcagContrast as ratio } from 'culori';

const toOklch = converter('oklch');
const L = (hex: string): number => toOklch(parse(hex))?.l ?? -1;

describe('terminalTextFor', () => {
  it('is the section 1.6 constant on the shipped canvas', () => {
    const text = terminalTextFor(TERMINAL_BACKGROUND, false);
    expect(Object.keys(text)).toHaveLength(18);
    for (const [key, value] of Object.entries(text)) {
      expect(value, key).toBe(terminalTheme[key as keyof typeof terminalTheme]);
    }
  });

  it('is still the constant on any rotated dark canvas', () => {
    for (const canvas of ['#171314', '#141511', '#111514', '#121517']) {
      const text = terminalTextFor(canvas, false);
      for (const [key, value] of Object.entries(text)) {
        expect(value, `${key} on ${canvas}`).toBe(terminalTheme[key as keyof typeof terminalTheme]);
      }
    }
  });

  it('goes dark on a light canvas, keeping the shipped ratios where reachable', () => {
    const canvas = '#d9dbdf';
    const text = terminalTextFor(canvas, true);
    for (const [key, value] of Object.entries(text)) {
      expect(L(value), key).toBeLessThan(L(canvas));
      const shipped = String(terminalTheme[key as keyof typeof terminalTheme] ?? '');
      const want = wcagContrast(shipped, TERMINAL_BACKGROUND);
      const got = wcagContrast(value, canvas);
      expect(got + 0.15 >= want || value === '#000000', `${key} ${String(got)} vs ${String(want)}`).toBe(true);
    }
  });

  it('lifts the foreground to the text floor before the flip, the palette to its own', () => {
    // A ground under the flip where the shipped foreground reads about
    // 3.3:1: over the palette floor, under the text floor. The foreground
    // lifts to 4.5:1 and no more; an ANSI colour that still clears 3:1
    // stays the constant, and one that does not lifts to 3:1 and no more.
    const canvas = '#787571';
    const text = terminalTextFor(canvas, false);
    expect(text.foreground).not.toBe(terminalTheme.foreground);
    expect(wcagContrast(text.foreground, canvas)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(text.foreground, canvas)).toBeLessThan(4.7);
    expect(L(text.foreground)).toBeGreaterThan(L(canvas));
    for (const key of ['brightWhite'] as const) {
      expect(wcagContrast(String(terminalTheme[key]), canvas), key).toBeGreaterThanOrEqual(3);
      expect(text[key], key).toBe(terminalTheme[key]);
    }
    expect(wcagContrast(String(terminalTheme.green), canvas)).toBeLessThan(3);
    expect(text.green).not.toBe(terminalTheme.green);
    expect(wcagContrast(text.green, canvas)).toBeGreaterThanOrEqual(3);
    expect(wcagContrast(text.green, canvas)).toBeLessThan(3.2);
  });

  it('is the section 1.6b constant on the paper under the light scheme, and darker text on a moved paper (Phase 213)', () => {
    const text = terminalTextFor(TERMINAL_BACKGROUND_LIGHT, true, 'light');
    expect(Object.keys(text)).toHaveLength(18);
    for (const [key, value] of Object.entries(text)) {
      expect(value, key).toBe(terminalThemeLight[key as keyof typeof terminalThemeLight]);
    }
    // Every slot but the two exempt ones clears its floor on the paper, the
    // normal eight at 6.5 and the bright eight at 4.5, bold being text.
    for (const [key, value] of Object.entries(text)) {
      if (key === 'black' || key === 'brightBlack' || key === 'cursor') continue;
      const floor = key === 'foreground' ? 13 : key === 'white' ? 7 : /^bright/.test(key) ? 4.5 : 6.5;
      expect(ratio(value, TERMINAL_BACKGROUND_LIGHT), key).toBeGreaterThanOrEqual(floor - 0.01);
    }
    // A paper turned or moved keeps the shipped ratio in its own hue.
    const moved = terminalTextFor('#e8ecf2', true, 'light');
    for (const [key, value] of Object.entries(moved)) {
      expect(L(value), key).toBeLessThan(L('#e8ecf2'));
    }
    // The dark scheme answers what it always did, whatever the third argument.
    expect(terminalTextFor(TERMINAL_BACKGROUND, false, 'dark')).toEqual(terminalTextFor(TERMINAL_BACKGROUND, false));
    expect(terminalContrastFloorFor('light')).toBe(4.5);
    expect(terminalContrastFloorFor('dark')).toBe(1);
  });
});
