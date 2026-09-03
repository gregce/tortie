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
import { TERMINAL_BACKGROUND, terminalTextFor, terminalTheme } from '../theme';

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
});
