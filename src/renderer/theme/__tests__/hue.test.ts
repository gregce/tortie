/**
 * Phase 207. The two pure halves of the frame hue, pinned on their own:
 * the rotation in src/shared/chrome-hue.ts and the text rule in ../hue.ts.
 *
 * What is held here:
 * - The sanitizer: whole degrees on the circle, anything else the default.
 * - The rotation is the identity at 222 for every shipped neutral, byte for
 *   byte, and an OFFSET from each token's own hue rather than an absolute.
 * - Lightness and chroma survive a rotation; alpha survives exactly.
 * - The flip threshold is the one derived number, and it is where black and
 *   white text tie.
 * - The solve keeps a ratio on the side asked for and ends at black or white
 *   when the ratio is out of reach.
 * - A palette follows a ground the same way the text tokens do.
 *
 * The walk over all 360 degrees with every pinned ratio is the gate's job
 * (`npm run conformance:hue`), not this file's.
 */

import { describe, expect, it } from 'vitest';
import { converter, parse, wcagContrast, wcagLuminance } from 'culori';
import {
  rotateChromeNeutral,
  windowBackgroundFor
} from '@shared/chrome-hue';
import { DEFAULT_CHROME_HUE, sanitizeChromeHue } from '@shared/settings';
import { WINDOW_BACKGROUND } from '@shared/window-chrome';
import {
  TEXT_FLIP_CANVAS_LUMINANCE,
  contrastOf,
  followGround,
  followPalette,
  solveForRatio,
  textIsDarkOn
} from '../hue';

const toOklch = converter('oklch');

/** The shipped ramp, as tokens.css section 1.1 declares it. */
const RAMP = [
  '#131417',
  '#0e0f13',
  '#191b20',
  '#202329',
  '#252931',
  '#25282e',
  '#2d3038',
  '#353943'
];

function oklch(css: string): { l: number; c: number; h: number } {
  const ok = toOklch(parse(css));
  if (ok === undefined) throw new Error(`unparseable: ${css}`);
  return { l: ok.l, c: ok.c, h: ok.h ?? 0 };
}

describe('sanitizeChromeHue', () => {
  it('answers the default for anything that is not a finite number', () => {
    for (const bad of [undefined, null, 'red', '222', Number.NaN, Number.POSITIVE_INFINITY, {}]) {
      expect(sanitizeChromeHue(bad)).toBe(DEFAULT_CHROME_HUE);
    }
  });

  it('wraps onto the circle and rounds to a whole degree', () => {
    expect(sanitizeChromeHue(360)).toBe(0);
    expect(sanitizeChromeHue(361)).toBe(1);
    expect(sanitizeChromeHue(-1)).toBe(359);
    expect(sanitizeChromeHue(222.4)).toBe(222);
    expect(sanitizeChromeHue(222.6)).toBe(223);
    expect(sanitizeChromeHue(719.7)).toBe(0);
  });
});

describe('rotateChromeNeutral', () => {
  it('is the identity at 222 for every shipped neutral, byte for byte', () => {
    for (const hex of RAMP) {
      expect(rotateChromeNeutral(hex, 222)).toBe(hex);
      expect(rotateChromeNeutral(hex, 582)).toBe(hex);
    }
    expect(windowBackgroundFor(222)).toBe(WINDOW_BACKGROUND);
  });

  it('turns by an offset from the colour\'s own hue, not to an absolute', () => {
    // A saturated colour, so the hue reads back cleanly after rounding.
    const blue = '#3050c0';
    const own = oklch(blue).h;
    for (const hue of [0, 60, 150, 300]) {
      const got = oklch(rotateChromeNeutral(blue, hue)).h;
      const want = (((own + hue - 222) % 360) + 360) % 360;
      const diff = Math.min(Math.abs(got - want), 360 - Math.abs(got - want));
      expect(diff, `at ${String(hue)}`).toBeLessThan(1.5);
    }
  });

  it('holds lightness and chroma across the circle', () => {
    for (const hex of RAMP) {
      const shipped = oklch(hex);
      for (let hue = 0; hue < 360; hue += 15) {
        const turned = oklch(rotateChromeNeutral(hex, hue));
        expect(Math.abs(turned.l - shipped.l), `${hex} L at ${String(hue)}`).toBeLessThan(0.005);
        expect(Math.abs(turned.c - shipped.c), `${hex} C at ${String(hue)}`).toBeLessThan(0.006);
      }
    }
  });

  it('keeps alpha exactly and leaves a non colour alone', () => {
    expect(rotateChromeNeutral('rgba(37, 40, 46, 0.5)', 90)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/);
    expect(rotateChromeNeutral('0 0 0 2px', 90)).toBe('0 0 0 2px');
  });

  it('answers a six digit lowercase hex for an opaque neutral', () => {
    for (const hex of RAMP) {
      expect(rotateChromeNeutral(hex, 40)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('the flip threshold', () => {
  it('is where black and white text tie, and nothing else', () => {
    const y = TEXT_FLIP_CANVAS_LUMINANCE;
    const white = (1 + 0.05) / (y + 0.05);
    const black = (y + 0.05) / (0 + 0.05);
    expect(Math.abs(white - black)).toBeLessThan(1e-9);
    expect(y).toBeCloseTo(0.1791, 4);
  });

  it('reads the shipped canvas as dark and a light grey as light', () => {
    expect(textIsDarkOn('#131417')).toBe(false);
    expect(textIsDarkOn('#757575')).toBe(false);
    expect(textIsDarkOn('#767676')).toBe(true);
    expect(textIsDarkOn('#ffffff')).toBe(true);
    expect(textIsDarkOn('not a colour')).toBe(false);
    // The two greys straddle the threshold on the WCAG scale.
    expect(wcagLuminance('#757575')).toBeLessThanOrEqual(TEXT_FLIP_CANVAS_LUMINANCE);
    expect(wcagLuminance('#767676')).toBeGreaterThan(TEXT_FLIP_CANVAS_LUMINANCE);
  });
});

describe('solveForRatio', () => {
  it('reaches the asked ratio on the asked side, in the colour\'s own hue', () => {
    const ground = '#d9dbdf';
    const dark = solveForRatio('#c9cacd', ground, 7, true);
    expect(wcagContrast(dark, ground)).toBeGreaterThanOrEqual(7);
    expect(wcagContrast(dark, ground)).toBeLessThan(7.3);
    const light = solveForRatio('#838996', '#1b1d22', 6, false);
    expect(wcagContrast(light, '#1b1d22')).toBeGreaterThanOrEqual(6);
    expect(wcagContrast(light, '#1b1d22')).toBeLessThan(6.3);
    // A chromatic colour keeps its hue.
    const green = solveForRatio('#6bc46d', '#eeeeee', 5, true);
    const diff = Math.abs(oklch(green).h - oklch('#6bc46d').h);
    expect(Math.min(diff, 360 - diff)).toBeLessThan(6);
  });

  it('ends at black or white when the ratio is out of reach', () => {
    expect(solveForRatio('#c9cacd', '#808080', 20, true)).toBe('#000000');
    expect(solveForRatio('#c9cacd', '#808080', 20, false)).toBe('#ffffff');
  });

  it('never answers from the wrong side of the ground, however small the ratio', () => {
    // A ratio any colour far from the ground clears. The search is bounded
    // to the side asked for, so the dark answer is darker than the ground.
    const dark = solveForRatio('#1b1d22', '#75767a', 1.07, true);
    expect(oklch(dark).l).toBeLessThan(oklch('#75767a').l);
    const light = solveForRatio('#1b1d22', '#75767a', 1.07, false);
    expect(oklch(light).l).toBeGreaterThan(oklch('#75767a').l);
  });
});

describe('followGround', () => {
  it('leaves the shipped colour alone while it clears its floor', () => {
    expect(followGround('#c9cacd', '#131417', ['#131417'], 4.5, false)).toBe('#c9cacd');
    expect(followGround('#c9cacd', '#131417', ['#2a2c2f', '#131417'], 4.5, false)).toBe('#c9cacd');
  });

  it('lifts toward white once the ground puts it under the floor', () => {
    const lifted = followGround('#838996', '#191b20', ['#5f6164'], 4.5, false);
    expect(lifted).not.toBe('#838996');
    expect(wcagContrast(lifted, '#5f6164')).toBeGreaterThanOrEqual(4.5);
    expect(oklch(lifted).l).toBeGreaterThan(oklch('#838996').l);
  });

  it('pushes darker still when a darker ground it also sits on is under the floor', () => {
    // Solved to the shipped 4.91:1 against the surface alone, muted would
    // read under 4.5:1 on the sidebar beside it; the answer clears both.
    const value = followGround('#838996', '#191b20', ['#e0e2e6', '#c8cacd'], 4.5, true);
    expect(wcagContrast(value, '#e0e2e6')).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(value, '#c8cacd')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the shipped ratio on the dark side', () => {
    const shippedRatio = contrastOf('#9ca1ab', '#131417');
    const dark = followGround('#9ca1ab', '#131417', ['#d9dbdf'], 4.5, true);
    expect(Math.abs(wcagContrast(dark, '#d9dbdf') - shippedRatio)).toBeLessThan(0.15);
    expect(oklch(dark).l).toBeLessThan(oklch('#d9dbdf').l);
  });
});

describe('followPalette', () => {
  const palette: Record<'fg' | 'red' | 'brightBlack', string> = {
    fg: '#D8DBE2',
    red: '#E5655E',
    brightBlack: '#4A505C'
  };

  it('is the identity on the shipped canvas', () => {
    expect(followPalette(palette, '#131417', '#131417', false, ['brightBlack'])).toEqual(palette);
  });

  it('exempts the named keys from the floor on the light side only', () => {
    const lifted = followPalette(palette, '#131417', '#3a3d44', false, ['brightBlack']);
    expect(lifted.brightBlack).toBe('#4A505C');
    expect(wcagContrast(lifted.fg, '#3a3d44')).toBeGreaterThanOrEqual(3);
    const dark = followPalette(palette, '#131417', '#e0e0e0', true, ['brightBlack']);
    expect(dark.brightBlack).not.toBe('#4A505C');
    for (const [key, value] of Object.entries(dark)) {
      expect(oklch(value).l, key).toBeLessThan(oklch('#e0e0e0').l);
    }
  });
});
