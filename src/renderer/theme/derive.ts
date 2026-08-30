/**
 * deriveOverrides (Phase 62). The one pure function that turns an appearance
 * choice into CSS custom property overrides for the document root.
 *
 * The contract, and the tests assert every line of it:
 * - The default appearance (blue scheme, normal contrast) returns an EMPTY
 *   object. Zero overrides is the byte-identity guarantee for an untouched
 *   install.
 * - Every other combination returns only keys from the token lists declared
 *   in presets.ts. `--bg-canvas` is never a key.
 * - The scheme applies first and the contrast lift second, so the chroma
 *   lift acts on the scheme-rotated accent.
 * - Values that carry alpha keep their alpha exactly.
 * - Every derived value fits sRGB. An out-of-gamut result is clamped by
 *   reducing chroma while keeping lightness and hue (culori's clampChroma
 *   in oklch mode).
 *
 * The function is pure and synchronous. apply.ts calls it once per settings
 *  change and never per frame. The perceptual math is culori (MIT, chosen
 * over colorjs.io in the Phase 62 spec, section 1).
 */

// PHASE 165. The tree shakeable entry, with the four colour spaces this file
// walks registered by hand, plus hsl for a token a later round might write.
// The default `culori` entry registers every one of its 30 or so spaces at
// module scope, and because that registration is a side effect nothing can
// shake it: it was 84,596 bytes of the shared eager chunk for a file that
// converts hex and rgb into OKLCH and back. `useMode` here is the same call
// the default entry makes for each space, so every function below runs the
// same code over the same tables; src/renderer/theme/__tests__/
// p165-derive-fn.test.ts proves that against a vector the full library wrote.
import {
  clampChroma,
  converter,
  formatHex,
  formatRgb,
  modeHsl,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeRgb,
  parse,
  useMode
} from 'culori/fn';
import type { Oklch } from 'culori/fn';
import type { ContrastLevel, HighlightScheme } from '@shared/settings';
import {
  CANVAS_TOKEN,
  CONTRAST_BG,
  CONTRAST_BORDER,
  CONTRAST_CHROMA,
  CONTRAST_FACTORS,
  CONTRAST_TEXT,
  SCHEME_PRESETS,
  SCHEME_TOKENS,
  ALL_THEME_TOKENS
} from './presets';
import type { SchemeTransform } from './presets';

export interface Appearance {
  highlightScheme: HighlightScheme;
  contrastLevel: ContrastLevel;
}

// Registration order matters only in that a space must be registered before
// a converter to it is made. rgb parses hex, rgb(), legacy rgb, named colours
// and `transparent`; lrgb and oklab are the two steps between rgb and oklch.
useMode(modeRgb);
useMode(modeLrgb);
useMode(modeOklab);
useMode(modeOklch);
useMode(modeHsl);

const toOklch = converter('oklch');
const toRgb = converter('rgb');

/**
 * Matches the one color inside a compound value such as `--focus-ring`
 * (`0 0 0 2px rgba(77, 157, 232, 0.6)`). The color is transformed and the
 * rest of the string is reassembled byte for byte.
 */
const EMBEDDED_COLOR = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/;

const SCHEME_SET: ReadonlySet<string> = new Set(SCHEME_TOKENS);
const SPREAD_SET: ReadonlySet<string> = new Set([
  ...CONTRAST_BG,
  ...CONTRAST_BORDER
]);
const TEXT_SET: ReadonlySet<string> = new Set(CONTRAST_TEXT);
const CHROMA_SET: ReadonlySet<string> = new Set(CONTRAST_CHROMA);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Parse any CSS color text into OKLCH, or null when it is not a color. */
function parseOklch(text: string): Oklch | null {
  const parsed = parse(text.trim());
  if (parsed === undefined) return null;
  const ok = toOklch(parsed);
  return ok === undefined ? null : ok;
}

/** Format back to CSS, keeping alpha exactly when the color carries one. */
function formatColor(color: Oklch): string {
  const rgb = toRgb(clampChroma(color, 'oklch'));
  const safe = {
    ...rgb,
    r: clamp01(rgb.r),
    g: clamp01(rgb.g),
    b: clamp01(rgb.b)
  };
  if (safe.alpha !== undefined && safe.alpha < 1) return formatRgb(safe);
  return formatHex(safe);
}

/** The scheme step: rotate hue or scale chroma. Lightness and alpha stay. */
function applyScheme(color: Oklch, transform: SchemeTransform): Oklch {
  const next: Oklch = { ...color };
  if (transform.hue !== undefined) next.h = transform.hue;
  if (transform.chromaScale !== undefined) next.c = color.c * transform.chromaScale;
  return clampChroma(next, 'oklch');
}

/**
 * Derive the override map for one appearance from the captured base values.
 *
 * `base` maps token name to the SHIPPED CSS value, captured once by apply.ts
 * before any write (or built from tokens.css in tests). A token missing from
 * `base`, or whose value does not parse as a color, is skipped rather than
 * guessed. `--focus-ring` is the one compound value and is reassembled
 * around its transformed color.
 */
export function deriveOverrides(
  appearance: Appearance,
  base: Readonly<Record<string, string>>
): Record<string, string> {
  const { highlightScheme, contrastLevel } = appearance;
  if (highlightScheme === 'blue' && contrastLevel === 'normal') return {};

  const preset = SCHEME_PRESETS.find((p) => p.id === highlightScheme);
  const schemeTransform = preset?.transform ?? null;
  const factors = CONTRAST_FACTORS[contrastLevel];
  const liftOn = contrastLevel !== 'normal';

  // The anchor: the lightness of the shipped canvas. The canvas itself is
  // never written. Without it no background or border can spread, so those
  // tokens are skipped rather than moved about a guessed anchor.
  const canvas = base[CANVAS_TOKEN] !== undefined ? parseOklch(base[CANVAS_TOKEN]) : null;

  const out: Record<string, string> = {};

  for (const token of ALL_THEME_TOKENS) {
    if (token === CANVAS_TOKEN) continue;

    const schemed = schemeTransform !== null && SCHEME_SET.has(token);
    const spread = liftOn && SPREAD_SET.has(token) && canvas !== null;
    const textLift = liftOn && TEXT_SET.has(token);
    const chromaLift = liftOn && CHROMA_SET.has(token);
    if (!schemed && !spread && !textLift && !chromaLift) continue;

    const raw = base[token];
    if (raw === undefined) continue;

    // Compound values keep everything around the color untouched.
    const match = EMBEDDED_COLOR.exec(raw);
    const colorText = match !== null ? match[0] : raw;
    let color = parseOklch(colorText);
    if (color === null) continue;

    if (schemed && schemeTransform !== null) {
      color = applyScheme(color, schemeTransform);
    }
    if (spread && canvas !== null) {
      color = { ...color, l: clamp01(canvas.l + (color.l - canvas.l) * factors.k) };
    }
    if (textLift) {
      color = { ...color, l: clamp01(color.l + (1 - color.l) * factors.t) };
    }
    if (chromaLift) {
      color = { ...color, c: color.c * factors.c };
    }

    const formatted = formatColor(color);
    out[token] =
      match !== null
        ? raw.slice(0, match.index) + formatted + raw.slice(match.index + match[0].length)
        : formatted;
  }

  return out;
}
