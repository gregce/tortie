/**
 * deriveOverrides (Phase 62) — the contract tests, including the charter's
 * drift test.
 *
 * What is pinned here:
 * - The default appearance derives ZERO overrides. That empty object is the
 *   byte-identity guarantee for an untouched install.
 * - Every non-default combination writes only tokens the preset and contrast
 *   lists declare, and never `--bg-canvas`.
 * - Drift: every token the lists claim exists in tokens.css. A token renamed
 *   or removed there without updating presets.ts fails HERE, not in a user's
 *   window.
 * - The lift direction is real: measured WCAG contrast rises monotonically
 *   from Normal to Raised to High.
 * - Every derived value fits sRGB, and alpha survives exactly.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { converter, parse, wcagContrast } from 'culori';
import { rotateChromeNeutral } from '@shared/chrome-hue';
import { deriveOverrides } from '../derive';
import type { Appearance } from '../derive';
import {
  ALL_THEME_TOKENS,
  CANVAS_TOKEN,
  CONTRAST_BG,
  CONTRAST_BORDER,
  CONTRAST_CHROMA,
  CONTRAST_TEXT,
  HUE_TOKENS,
  SCHEME_PRESETS,
  SCHEME_TOKENS,
  TEXT_PINS
} from '../presets';
import type { ContrastLevel, HighlightScheme } from '@shared/settings';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

// ---------------------------------------------------------------------------
// Read the shipped tokens from disk (the source-scan pattern: tests may read
// source files so the assertion tracks the tree, not a copy).
// ---------------------------------------------------------------------------

const TOKENS_CSS_PATH = resolve(__dirname, '..', '..', 'styles', 'tokens.css');
const tokensCss = readFileSync(TOKENS_CSS_PATH, 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

/** Every `--name: value;` declaration in tokens.css, one level flattened. */
function readDeclarations(css: string): Map<string, string> {
  const decls = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) {
    const name = m[1];
    const value = m[2];
    if (name === undefined || value === undefined) continue;
    decls.set(name, value.replace(/\s+/g, ' ').trim());
  }
  // Resolve var() references (e.g. --graph-lane-1: var(--accent)) so the
  // base map holds concrete values, the way getComputedStyle would.
  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    for (const [name, value] of decls) {
      const next = value.replace(
        /var\((--[a-zA-Z0-9-]+)\)/g,
        (whole, ref: string) => decls.get(ref) ?? whole
      );
      if (next !== value) {
        decls.set(name, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return decls;
}

const declarations = readDeclarations(tokensCss);

/**
 * The base map deriveOverrides sees. Built from the shipped file. Builder B
 * adds `--terminal-selection` to tokens.css in this same phase; until that
 * edit is merged the spec value stands in, so these tests exercise the full
 * highlight family either way. After the merge the file value wins.
 */
const base: Record<string, string> = {};
for (const token of ALL_THEME_TOKENS) {
  const value = declarations.get(token);
  if (value !== undefined) base[token] = value;
}
if (base['--terminal-selection'] === undefined) {
  base['--terminal-selection'] = 'rgba(77, 157, 232, 0.3)';
}

const ALL_LEVELS: readonly ContrastLevel[] = ['normal', 'raised', 'high'];
const ALL_SCHEMES: readonly HighlightScheme[] = SCHEME_PRESETS.map((p) => p.id);

/** Every combination except the default. */
const NON_DEFAULT: Appearance[] = [];
for (const highlightScheme of ALL_SCHEMES) {
  for (const contrastLevel of ALL_LEVELS) {
    if (highlightScheme === 'blue' && contrastLevel === 'normal') continue;
    NON_DEFAULT.push({ highlightScheme, contrastLevel, chromeHue: 222 });
  }
}

/** The color inside a possibly compound value (the --focus-ring case). */
function colorPart(value: string): string {
  const m = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/.exec(value);
  return m !== null ? m[0] : value;
}

/** Indexed access that fails the test loudly instead of typing undefined. */
function must(value: string | undefined, what: string): string {
  if (value === undefined) throw new Error(`missing value: ${what}`);
  return value;
}

/** The alpha channel of a CSS value, 1 when the color carries none. */
function alphaOf(value: string | undefined, what: string): number {
  const parsed = parse(colorPart(must(value, what)));
  if (parsed === undefined) throw new Error(`unparseable color: ${what}`);
  return parsed.alpha ?? 1;
}

describe('drift against tokens.css', () => {
  it('every claimed token is declared in tokens.css', () => {
    const missing = ALL_THEME_TOKENS.filter((t) => !declarations.has(t));
    // `--terminal-selection` is Builder B's one tokens.css addition in this
    // phase. Every token, including that one, must exist in the shipped file.
    expect(missing).toEqual([]);
  });

  it('the token lists overlap only where the spec says they do', () => {
    // The scheme family and the lift lists share exactly the accent trio.
    const schemeSet = new Set(SCHEME_TOKENS);
    const shared = CONTRAST_CHROMA.filter((t) => schemeSet.has(t));
    expect(shared).toEqual(['--accent', '--accent-hover', '--accent-text']);
    // Background, border and text lists never name a scheme token.
    for (const t of [...CONTRAST_BG, ...CONTRAST_BORDER, ...CONTRAST_TEXT]) {
      expect(schemeSet.has(t)).toBe(false);
    }
    // The canvas anchor appears in no override list.
    for (const list of [
      SCHEME_TOKENS,
      CONTRAST_BG,
      CONTRAST_BORDER,
      CONTRAST_TEXT,
      CONTRAST_CHROMA
    ]) {
      expect(list.includes(CANVAS_TOKEN)).toBe(false);
    }
  });
});

describe('the zero-override guarantee', () => {
  it('blue plus normal plus hue 222 returns an empty object', () => {
    expect(
      deriveOverrides({ highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 222 }, base)
    ).toEqual({});
  });

  it('a hue that sanitizes to 222 is the default too', () => {
    for (const chromeHue of [222.4, 582, -138, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        deriveOverrides({ highlightScheme: 'blue', contrastLevel: 'normal', chromeHue }, base)
      ).toEqual({});
    }
  });
});

describe('the frame hue (Phase 207)', () => {
  const at = (chromeHue: number, contrastLevel: ContrastLevel = 'normal'): Record<string, string> =>
    deriveOverrides({ highlightScheme: 'blue', contrastLevel, chromeHue }, base);

  it('writes exactly the eight neutrals, the canvas among them, and no text', () => {
    const overrides = at(0);
    expect(new Set(Object.keys(overrides))).toEqual(new Set(HUE_TOKENS));
    expect(overrides[CANVAS_TOKEN]).toBeDefined();
    for (const pin of TEXT_PINS) expect(overrides[pin.token]).toBeUndefined();
  });

  it('turns every neutral through the shared rotation, lightness held', () => {
    for (const chromeHue of [0, 90, 180, 300]) {
      const overrides = at(chromeHue);
      for (const token of HUE_TOKENS) {
        // The derivation IS the shared rotation, byte for byte. The offset
        // property itself is pinned in hue.test.ts on a colour with enough
        // chroma for a hue to be read back; at 0.006 eight bit rounding
        // moves a read hue by up to fifteen degrees.
        expect(overrides[token], `${token} at ${String(chromeHue)}`).toBe(
          rotateChromeNeutral(must(base[token], token), chromeHue)
        );
        const shipped = toOklch(parse(must(base[token], token)));
        const turned = toOklch(parse(must(overrides[token], token)));
        if (shipped === undefined || turned === undefined) throw new Error(token);
        expect(Math.abs(turned.l - shipped.l), `${token} lightness`).toBeLessThan(0.005);
      }
    }
  });

  it('360 is 0 and a fractional hue is its nearest degree', () => {
    expect(at(360)).toEqual(at(0));
    expect(at(0.4)).toEqual(at(0));
    expect(at(-1)).toEqual(at(359));
  });

  it('composes with the contrast lift in one order whatever the input order', () => {
    const overrides = at(40, 'high');
    // The spread anchors on the TURNED canvas, so the canvas written is the
    // rotation alone and every spread token is lighter than it.
    expect(overrides[CANVAS_TOKEN]).toBe(at(40)[CANVAS_TOKEN]);
    const canvas = toOklch(parse(must(overrides[CANVAS_TOKEN], 'canvas')));
    for (const token of [...CONTRAST_BG, ...CONTRAST_BORDER]) {
      if (token === '--bg-sidebar') continue;
      const value = toOklch(parse(must(overrides[token], token)));
      expect((value?.l ?? 0) > (canvas?.l ?? 1), token).toBe(true);
    }
    // And the text lift is still the Phase 62 one: the three lifted tokens
    // are written and the disabled one is not.
    for (const token of CONTRAST_TEXT) expect(overrides[token]).toBeDefined();
    expect(overrides['--text-disabled']).toBeUndefined();
  });

  it('keeps every text token at its floor on every ground at every hue', () => {
    for (let chromeHue = 0; chromeHue < 360; chromeHue += 1) {
      const overrides = at(chromeHue);
      const value = (token: string): string => must(overrides[token] ?? base[token], token);
      for (const pin of TEXT_PINS) {
        if (pin.floor === null) continue;
        const ratio = wcagContrast(value(pin.token), value(pin.ground));
        expect(ratio, `${pin.token} on ${pin.ground} at ${String(chromeHue)}`).toBeGreaterThanOrEqual(pin.floor);
      }
    }
  });

  it('flips the text dark on a light canvas, keeping the shipped ratios', () => {
    // The synthetic ground: the whole ramp lifted 0.6 in OKLCH lightness,
    // which puts the canvas near Y 0.5. No setting reaches this parameter.
    const overrides = deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 222 },
      base,
      0.6
    );
    for (const token of HUE_TOKENS) expect(overrides[token]).toBeDefined();
    for (const pin of TEXT_PINS) {
      const value = must(overrides[pin.token], pin.token);
      const ground = must(overrides[pin.ground], pin.ground);
      const shippedRatio = wcagContrast(must(base[pin.token], pin.token), must(base[pin.ground], pin.ground));
      const got = wcagContrast(value, ground);
      const text = toOklch(parse(value));
      const groundL = toOklch(parse(ground))?.l ?? 0;
      expect((text?.l ?? 1) < groundL, `${pin.token} is darker than its ground`).toBe(true);
      // The ratio it ships with, more when a darker ground it also sits on
      // needs it (muted on the sidebar), or black when it is out of reach.
      expect(got + 0.15 >= shippedRatio || value === '#000000', `${pin.token} ${String(got)} vs ${String(shippedRatio)}`).toBe(true);
    }
  });

  it('lifts a text token toward white before the flip when its floor gives', () => {
    // A fifth of the way up the flip has not happened, and text-muted has
    // fallen under 4.5:1 on its surface, so it moves, toward white, to its
    // floor; the disabled token has no floor and never moves before a flip.
    const overrides = deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 222 },
      base,
      0.2
    );
    const muted = must(overrides['--text-muted'], 'muted');
    const surface = must(overrides['--bg-surface'], 'surface');
    expect(wcagContrast(muted, surface)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(muted, surface)).toBeLessThan(4.7);
    expect(toOklch(parse(muted))?.l ?? 0).toBeGreaterThan(toOklch(parse(must(base['--text-muted'], 'm')))?.l ?? 1);
    expect(overrides['--text-disabled']).toBeUndefined();
    // Every text token still clears its floor on every ground it sits on.
    const value = (token: string): string => must(overrides[token] ?? base[token], token);
    for (const pin of TEXT_PINS) {
      if (pin.floor === null) continue;
      for (const ground of pin.grounds) {
        expect(wcagContrast(value(pin.token), value(ground)), `${pin.token} on ${ground}`).toBeGreaterThanOrEqual(pin.floor);
      }
    }
  });
});

describe('key containment', () => {
  const contrastKeys = new Set([
    ...CONTRAST_BG,
    ...CONTRAST_BORDER,
    ...CONTRAST_TEXT,
    ...CONTRAST_CHROMA
  ]);

  it.each(NON_DEFAULT.map((a) => [a.highlightScheme, a.contrastLevel, a] as const))(
    '%s + %s writes exactly the declared tokens and never the canvas',
    (_scheme, _level, appearance) => {
      const overrides = deriveOverrides(appearance, base);
      const expected = new Set<string>();
      if (appearance.highlightScheme !== 'blue') {
        for (const t of SCHEME_TOKENS) expected.add(t);
      }
      if (appearance.contrastLevel !== 'normal') {
        for (const t of contrastKeys) expected.add(t);
      }
      expect(new Set(Object.keys(overrides))).toEqual(expected);
      expect(overrides[CANVAS_TOKEN]).toBeUndefined();
    }
  );
});

describe('the scheme transform', () => {
  it('teal rotates the accent to hue 185 keeping lightness', () => {
    const overrides = deriveOverrides(
      { highlightScheme: 'teal', contrastLevel: 'normal', chromeHue: 222 },
      base
    );
    const derived = toOklch(parse(must(overrides['--accent'], 'teal accent')));
    const shipped = toOklch(parse(must(base['--accent'], 'shipped accent')));
    expect(derived).toBeDefined();
    expect(Math.abs((derived?.h ?? 0) - 185)).toBeLessThan(1);
    expect(Math.abs((derived?.l ?? 0) - (shipped?.l ?? 0))).toBeLessThan(0.01);
    expect(overrides['--accent']).not.toBe(base['--accent']);
  });

  it('purple rotates the accent to hue 300', () => {
    const overrides = deriveOverrides(
      { highlightScheme: 'purple', contrastLevel: 'normal', chromeHue: 222 },
      base
    );
    const derived = toOklch(parse(must(overrides['--accent'], 'purple accent')));
    expect(Math.abs((derived?.h ?? 0) - 300)).toBeLessThan(1);
  });

  it('slate scales chroma to 0.30 of shipped, hue unchanged', () => {
    const overrides = deriveOverrides(
      { highlightScheme: 'slate', contrastLevel: 'normal', chromeHue: 222 },
      base
    );
    const derived = toOklch(parse(must(overrides['--accent'], 'slate accent')));
    const shipped = toOklch(parse(must(base['--accent'], 'shipped accent')));
    expect(derived).toBeDefined();
    if (derived === undefined || shipped === undefined) return;
    expect(Math.abs(derived.c - shipped.c * 0.3)).toBeLessThan(0.005);
    expect(Math.abs((derived.h ?? 0) - (shipped.h ?? 0))).toBeLessThan(1);
  });
});

describe('the lift direction, measured', () => {
  function value(token: string, overrides: Record<string, string>): string {
    return must(overrides[token] ?? base[token], token);
  }

  function ratioAt(
    contrastLevel: ContrastLevel,
    fg: string,
    bg: string
  ): number {
    const o = deriveOverrides({ highlightScheme: 'blue', contrastLevel, chromeHue: 222 }, base);
    return wcagContrast(value(fg, o), value(bg, o));
  }

  it('text-muted on bg-surface rises monotonically across the steps', () => {
    const normal = ratioAt('normal', '--text-muted', '--bg-surface');
    const raised = ratioAt('raised', '--text-muted', '--bg-surface');
    const high = ratioAt('high', '--text-muted', '--bg-surface');
    expect(raised).toBeGreaterThan(normal);
    expect(high).toBeGreaterThan(raised);
  });

  it('bg-active against bg-sidebar rises monotonically across the steps', () => {
    const normal = ratioAt('normal', '--bg-active', '--bg-sidebar');
    const raised = ratioAt('raised', '--bg-active', '--bg-sidebar');
    const high = ratioAt('high', '--bg-active', '--bg-sidebar');
    expect(raised).toBeGreaterThan(normal);
    expect(high).toBeGreaterThan(raised);
  });
});

describe('gamut and alpha', () => {
  it('every derived value in every combination parses and fits sRGB', () => {
    for (const appearance of NON_DEFAULT) {
      const overrides = deriveOverrides(appearance, base);
      for (const [token, cssValue] of Object.entries(overrides)) {
        const parsed = parse(colorPart(cssValue));
        expect(parsed, `${token} in ${JSON.stringify(appearance)}`).toBeDefined();
        if (parsed === undefined) continue;
        const rgb = toRgb(parsed);
        expect(rgb).toBeDefined();
        if (rgb === undefined) continue;
        for (const ch of [rgb.r, rgb.g, rgb.b]) {
          expect(ch).toBeGreaterThanOrEqual(-0.001);
          expect(ch).toBeLessThanOrEqual(1.001);
        }
      }
    }
  });

  it('accent-wash keeps alpha 0.14 in every scheme', () => {
    for (const highlightScheme of ALL_SCHEMES) {
      if (highlightScheme === 'blue') continue;
      for (const contrastLevel of ALL_LEVELS) {
        const overrides = deriveOverrides({ highlightScheme, contrastLevel, chromeHue: 222 }, base);
        expect(
          alphaOf(overrides['--accent-wash'], 'accent-wash'),
          `${highlightScheme} + ${contrastLevel}`
        ).toBeCloseTo(0.14, 5);
      }
    }
  });

  it('focus-ring output still begins with the shadow geometry', () => {
    for (const appearance of NON_DEFAULT) {
      if (appearance.highlightScheme === 'blue') continue;
      const overrides = deriveOverrides(appearance, base);
      const ring = must(overrides['--focus-ring'], 'focus-ring');
      expect(ring.startsWith('0 0 0 2px ')).toBe(true);
    }
  });

  it('scheme rotation preserves the wash alphas of drop-wash and accent-soft', () => {
    const overrides = deriveOverrides(
      { highlightScheme: 'teal', contrastLevel: 'normal', chromeHue: 222 },
      base
    );
    expect(alphaOf(overrides['--drop-wash'], 'drop-wash')).toBeCloseTo(0.25, 5);
    expect(alphaOf(overrides['--accent-soft'], 'accent-soft')).toBeCloseTo(0.6, 5);
  });
});
