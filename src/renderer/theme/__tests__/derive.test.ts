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
import { deriveOverrides } from '../derive';
import type { Appearance } from '../derive';
import {
  ALL_THEME_TOKENS,
  CANVAS_TOKEN,
  CONTRAST_BG,
  CONTRAST_BORDER,
  CONTRAST_CHROMA,
  CONTRAST_TEXT,
  SCHEME_PRESETS,
  SCHEME_TOKENS
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
    NON_DEFAULT.push({ highlightScheme, contrastLevel });
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
  it('blue plus normal returns an empty object', () => {
    expect(
      deriveOverrides({ highlightScheme: 'blue', contrastLevel: 'normal' }, base)
    ).toEqual({});
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
      { highlightScheme: 'teal', contrastLevel: 'normal' },
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
      { highlightScheme: 'purple', contrastLevel: 'normal' },
      base
    );
    const derived = toOklch(parse(must(overrides['--accent'], 'purple accent')));
    expect(Math.abs((derived?.h ?? 0) - 300)).toBeLessThan(1);
  });

  it('slate scales chroma to 0.30 of shipped, hue unchanged', () => {
    const overrides = deriveOverrides(
      { highlightScheme: 'slate', contrastLevel: 'normal' },
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
    const o = deriveOverrides({ highlightScheme: 'blue', contrastLevel }, base);
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
        const overrides = deriveOverrides({ highlightScheme, contrastLevel }, base);
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
      { highlightScheme: 'teal', contrastLevel: 'normal' },
      base
    );
    expect(alphaOf(overrides['--drop-wash'], 'drop-wash')).toBeCloseTo(0.25, 5);
    expect(alphaOf(overrides['--accent-soft'], 'accent-soft')).toBeCloseTo(0.6, 5);
  });
});
