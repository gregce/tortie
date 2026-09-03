/**
 * The frame's own lightness (Phase 210), the pure half.
 *
 * What is pinned here is the property the whole phase rests on: the ramp
 * transform is affine in OKLCH lightness with a positive slope, so THE ORDER
 * OF THE EIGHT NEUTRALS CAN NEVER INVERT, at any shade and any depth. It is
 * asserted twice, once in the space the arithmetic runs in and once in the
 * space the design pins the order in, because those are not the same space
 * and only the second one is what a person sees.
 *
 * The shipped pair is pinned as the identity, which is the zero override
 * guarantee this phase inherits from Phase 62 and must not spend.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { converter, parse, wcagLuminance } from 'culori';
import {
  anchorLightnessFor,
  depthFactorFor,
  rampIsShipped,
  rampNeutral,
  rampOverrides
} from '../chrome-ramp';
import {
  CHROME_DEPTH_FACTORS,
  CHROME_DEPTH_MAX,
  CHROME_DEPTH_MIN,
  CHROME_SHADE_MAX,
  CHROME_SHADE_MIN,
  CHROME_SHADE_STEP,
  DEFAULT_CHROME_DEPTH,
  DEFAULT_CHROME_SHADE,
  sanitizeChromeDepth,
  sanitizeChromeShade
} from '../settings';

const toOklch = converter('oklch');

// The shipped ramp, read from the tree so the assertion tracks tokens.css
// rather than a copy (the source-scan pattern the other theme tests use).
const TOKENS_CSS = resolve(__dirname, '..', '..', 'renderer', 'styles', 'tokens.css');
const css = readFileSync(TOKENS_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function declaration(name: string): string {
  const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(css);
  const value = m?.[1];
  if (value === undefined) throw new Error(`tokens.css has no ${name}`);
  return value.trim();
}

/** The ramp in order, darkest first, exactly as presets.ts declares it. */
const RAMP = [
  '--bg-sidebar',
  '--bg-canvas',
  '--bg-surface',
  '--bg-raised',
  '--bg-active'
];
const HAIRLINES = ['--border', '--border-active', '--border-strong'];
const NEUTRALS = [...RAMP, ...HAIRLINES];

const shipped: Record<string, string> = {};
for (const token of NEUTRALS) shipped[token] = declaration(token);
const canvasCss = shipped['--bg-canvas'] ?? '';
function oklchL(css: string): number {
  const parsed = parse(css);
  return parsed === undefined ? 0 : (toOklch(parsed)?.l ?? 0);
}
const canvasL = oklchL(canvasCss);

const SHADES: number[] = [];
for (let s = CHROME_SHADE_MIN; s <= CHROME_SHADE_MAX; s += 1) SHADES.push(s);
const DEPTHS: number[] = [];
for (let d = CHROME_DEPTH_MIN; d <= CHROME_DEPTH_MAX; d += 1) DEPTHS.push(d);

function rampAt(shade: number, depth: number): Record<string, string> {
  const out = rampOverrides(
    NEUTRALS,
    (token) => shipped[token],
    canvasCss,
    shade,
    depth
  );
  const merged: Record<string, string> = { ...shipped };
  for (const [token, value] of Object.entries(out)) merged[token] = value;
  return merged;
}

describe('the shipped pair is the identity', () => {
  it('reads as shipped and writes nothing', () => {
    expect(rampIsShipped(DEFAULT_CHROME_SHADE, DEFAULT_CHROME_DEPTH)).toBe(true);
    expect(
      rampOverrides(NEUTRALS, (t) => shipped[t], canvasCss, 0, 0)
    ).toEqual({});
  });

  it('is the only pair that writes nothing', () => {
    let writing = 0;
    for (const shade of SHADES) {
      for (const depth of DEPTHS) {
        const out = rampOverrides(NEUTRALS, (t) => shipped[t], canvasCss, shade, depth);
        if (Object.keys(out).length > 0) writing += 1;
        else expect([shade, depth]).toEqual([0, 0]);
      }
    }
    expect(writing).toBe(SHADES.length * DEPTHS.length - 1);
  });

  it('leaves the canvas on its shipped byte at every depth', () => {
    // The canvas IS the anchor, so its distance term is zero and the depth
    // cannot move it. At the shipped shade that means the shipped byte comes
    // back through the OKLCH round trip, at all seven depth stops.
    for (const depth of DEPTHS) {
      expect(rampAt(0, depth)['--bg-canvas']).toBe(canvasCss);
    }
  });
});

describe('the stops', () => {
  it('names a factor for every depth stop, 1 at the shipped one', () => {
    expect(depthFactorFor(DEFAULT_CHROME_DEPTH)).toBe(1);
    expect(DEPTHS.map(depthFactorFor)).toEqual([...CHROME_DEPTH_FACTORS]);
  });

  it('moves the anchor by one step per shade stop', () => {
    for (const shade of SHADES) {
      expect(anchorLightnessFor(canvasL, shade)).toBeCloseTo(
        canvasL + shade * CHROME_SHADE_STEP,
        12
      );
    }
  });

  it('clamps rather than wraps, and falls to the shipped stop', () => {
    expect(sanitizeChromeShade(99)).toBe(CHROME_SHADE_MAX);
    expect(sanitizeChromeShade(-99)).toBe(CHROME_SHADE_MIN);
    expect(sanitizeChromeShade(0.4)).toBe(0);
    expect(sanitizeChromeShade(1e300)).toBe(CHROME_SHADE_MAX);
    expect(sanitizeChromeShade(Number.NaN)).toBe(DEFAULT_CHROME_SHADE);
    expect(sanitizeChromeShade('2')).toBe(DEFAULT_CHROME_SHADE);
    expect(sanitizeChromeShade([2])).toBe(DEFAULT_CHROME_SHADE);
    expect(sanitizeChromeShade(undefined)).toBe(DEFAULT_CHROME_SHADE);
    expect(sanitizeChromeDepth(99)).toBe(CHROME_DEPTH_MAX);
    expect(sanitizeChromeDepth(-99)).toBe(CHROME_DEPTH_MIN);
    expect(sanitizeChromeDepth(Number.NEGATIVE_INFINITY)).toBe(DEFAULT_CHROME_DEPTH);
    expect(depthFactorFor(Number.NaN)).toBe(1);
  });
});

describe('the order never inverts', () => {
  it('is strictly increasing in OKLCH lightness at every stop', () => {
    for (const shade of SHADES) {
      for (const depth of DEPTHS) {
        const at = rampAt(shade, depth);
        // Before the eight bit round trip: the map is affine with a positive
        // slope, so this is the arithmetic claim and it holds everywhere.
        const anchor = anchorLightnessFor(canvasL, shade);
        const factor = depthFactorFor(depth);
        const lightnessOf = (token: string): number =>
          anchor + (oklchL(shipped[token] ?? '') - canvasL) * factor;
        for (let i = 1; i < RAMP.length; i += 1) {
          expect(lightnessOf(RAMP[i] ?? '')).toBeGreaterThan(
            lightnessOf(RAMP[i - 1] ?? '')
          );
        }
        for (let i = 1; i < HAIRLINES.length; i += 1) {
          expect(lightnessOf(HAIRLINES[i] ?? '')).toBeGreaterThan(
            lightnessOf(HAIRLINES[i - 1] ?? '')
          );
        }
        // And the rendered answer parses and fits sRGB at every stop.
        for (const token of NEUTRALS) {
          expect(at[token]).toMatch(/^#[0-9a-f]{6}$|^rgba?\(/);
        }
      }
    }
  });

  it('never lets a later rung read darker than an earlier one', () => {
    // The claim a person sees, in WCAG luminance over the eight bit answer.
    // Ties are allowed here and only here: two rungs can land on one byte at
    // the ends of both axes, which is exactly what the control refuses.
    for (const shade of SHADES) {
      for (const depth of DEPTHS) {
        const at = rampAt(shade, depth);
        for (let i = 1; i < RAMP.length; i += 1) {
          expect(
            wcagLuminance(at[RAMP[i] ?? ''] ?? '')
          ).toBeGreaterThanOrEqual(wcagLuminance(at[RAMP[i - 1] ?? ''] ?? ''));
        }
        for (let i = 1; i < HAIRLINES.length; i += 1) {
          expect(
            wcagLuminance(at[HAIRLINES[i] ?? ''] ?? '')
          ).toBeGreaterThanOrEqual(
            wcagLuminance(at[HAIRLINES[i - 1] ?? ''] ?? '')
          );
        }
      }
    }
  });
});

describe('what it refuses to touch', () => {
  it('gives back a value it cannot parse', () => {
    expect(rampNeutral('not a colour', 0.19, 0.24, 1.25)).toBe('not a colour');
    expect(rampNeutral('', 0.19, 0.24, 1.25)).toBe('');
  });

  it('keeps alpha exactly', () => {
    const moved = rampNeutral('rgba(19, 20, 23, 0.4)', 0.19, 0.24, 1.25);
    expect(moved).toMatch(/^rgba\(/);
    expect(moved).toContain('0.4');
  });

  it('writes nothing without an anchor it can read', () => {
    expect(rampOverrides(NEUTRALS, (t) => shipped[t], undefined, 2, 0)).toEqual({});
    expect(rampOverrides(NEUTRALS, (t) => shipped[t], 'not a colour', 2, 0)).toEqual({});
  });
});
