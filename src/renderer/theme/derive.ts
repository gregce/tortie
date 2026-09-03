/**
 * deriveOverrides (Phase 62). The one pure function that turns an appearance
 * choice into CSS custom property overrides for the document root.
 *
 * The contract, and the tests assert every line of it:
 * - The default appearance (blue scheme, normal contrast, hue 222) returns
 *   an EMPTY object over the shipped base. Zero overrides is the
 *   byte-identity guarantee for an untouched install. It is a property of
 *   the stages rather than an early return, so the text stage still answers
 *   over a base whose ground is light.
 * - Every other combination returns only keys from the token lists declared
 *   in presets.ts. `--bg-canvas` is a key only when the hue is not 222.
 * - The stages run in one order whatever the settings were set in, so the
 *   three settings compose the same way in any order: the hue turns the
 *   ramp first, the contrast lift spreads the turned ramp about its canvas,
 *   the text then follows the ground it lands on, and the scheme and the
 *   chroma lift act last on the accent family. The chroma lift therefore
 *   still acts on the scheme-rotated accent, as in Phase 62.
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
import { rotateChromeNeutral } from '@shared/chrome-hue';
import { DEFAULT_CHROME_HUE, sanitizeChromeHue } from '@shared/settings';
import type { ContrastLevel, HighlightScheme } from '@shared/settings';
import { followGround, solveForRatio, contrastOf, textIsDarkOn } from './hue';
import {
  CANVAS_TOKEN,
  CONTRAST_BG,
  CONTRAST_BORDER,
  CONTRAST_CHROMA,
  CONTRAST_FACTORS,
  CONTRAST_TEXT,
  HUE_TOKENS,
  SCHEME_PRESETS,
  SCHEME_TOKENS,
  TEXT_PINS,
  ALL_THEME_TOKENS
} from './presets';
import type { SchemeTransform } from './presets';

export interface Appearance {
  highlightScheme: HighlightScheme;
  contrastLevel: ContrastLevel;
  /** The frame's hue, a whole degree (Phase 207). 222 is the shipped ramp. */
  chromeHue: number;
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
const HUE_SET: ReadonlySet<string> = new Set(HUE_TOKENS);
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
 *
 * `groundLift` is the SYNTHETIC GROUND (Phase 207): an OKLCH lightness added
 * to every neutral of the ramp after the hue has turned it, canvas included.
 * It is 0 in every real launch and no setting reaches it. It exists because
 * the text rule below cannot be reached by any hue, and a rule nothing can
 * reach is a rule nothing can prove: `npm run conformance:hue` walks it from
 * the shipped ramp to white, and `npm run probe:p207` drives it in the app
 * through a harness knob in apply.ts. The pinned ratios are read from `base`
 * either way, which is what keeps them the shipped ones.
 */
export function deriveOverrides(
  appearance: Appearance,
  base: Readonly<Record<string, string>>,
  groundLift = 0
): Record<string, string> {
  const { highlightScheme, contrastLevel } = appearance;
  const hue = sanitizeChromeHue(appearance.chromeHue);
  const hueOn = hue !== DEFAULT_CHROME_HUE;
  // There is no early return for the default appearance any more. Each stage
  // below writes nothing at its own default, so the shipped base still
  // derives an empty map (the zero-override test proves it), while a base
  // whose canvas is light still flips its text at the default settings,
  // which the probe drives through a synthetic ground.

  const preset = SCHEME_PRESETS.find((p) => p.id === highlightScheme);
  const schemeTransform = preset?.transform ?? null;
  const factors = CONTRAST_FACTORS[contrastLevel];
  const liftOn = contrastLevel !== 'normal';

  const out: Record<string, string> = {};
  /** The value in effect for a token: the override so far, else the base. */
  const current = (token: string): string | undefined => out[token] ?? base[token];

  // STAGE ONE, THE HUE. Every neutral in the ramp turns by the same offset
  // from its own hue, the canvas included, in OKLCH (src/shared/chrome-hue.ts
  // says why that space). Lightness and chroma stay. At 222 this stage
  // writes nothing.
  if (hueOn) {
    for (const token of HUE_TOKENS) {
      const raw = base[token];
      if (raw === undefined || parseOklch(raw) === null) continue;
      out[token] = rotateChromeNeutral(raw, hue);
    }
  }
  if (groundLift !== 0) {
    for (const token of HUE_TOKENS) {
      const raw = current(token);
      const color = raw === undefined ? null : parseOklch(raw);
      if (color === null) continue;
      out[token] = formatColor({ ...color, l: clamp01(color.l + groundLift) });
    }
  }

  // STAGE TWO, THE SPREAD. The anchor is the lightness of the canvas in
  // effect, turned or shipped. The canvas itself is never spread. Without an
  // anchor no background or border can spread, so those tokens are skipped
  // rather than moved about a guessed anchor.
  const canvasCss = current(CANVAS_TOKEN);
  const canvas = canvasCss !== undefined ? parseOklch(canvasCss) : null;
  if (liftOn && canvas !== null) {
    for (const token of ALL_THEME_TOKENS) {
      if (!SPREAD_SET.has(token)) continue;
      const raw = current(token);
      if (raw === undefined) continue;
      const color = parseOklch(raw);
      if (color === null) continue;
      out[token] = formatColor({
        ...color,
        l: clamp01(canvas.l + (color.l - canvas.l) * factors.k)
      });
    }
  }

  // STAGE THREE, THE TEXT FOLLOWS THE GROUND (Phase 207, ./hue.ts). One
  // threshold on the canvas decides whether the family is light or dark. On
  // the light side a token is left alone unless its ground has lifted it
  // under its floor; on the dark side it keeps the ratio it ships with.
  // The contrast lift then moves text lightness toward the far end of its
  // own side, white for light text and black for dark, so Raised and High
  // still mean more contrast after a flip.
  const dark = canvasCss !== undefined && textIsDarkOn(canvasCss);
  for (const pin of TEXT_PINS) {
    const shipped = base[pin.token];
    const shippedGround = base[pin.ground];
    const ground = current(pin.ground);
    if (shipped === undefined || shippedGround === undefined || ground === undefined) {
      continue;
    }
    if (parseOklch(shipped) === null) continue;
    let value: string;
    if (pin.floor === null) {
      value = dark
        ? solveForRatio(shipped, ground, contrastOf(shipped, shippedGround), true)
        : shipped;
    } else {
      value = followGround(shipped, shippedGround, ground, pin.floor, dark);
    }
    if (liftOn && TEXT_SET.has(pin.token)) {
      const color = parseOklch(value);
      if (color !== null) {
        value = formatColor({
          ...color,
          l: dark
            ? clamp01(color.l - color.l * factors.t)
            : clamp01(color.l + (1 - color.l) * factors.t)
        });
      }
    }
    if (value !== shipped) out[pin.token] = value;
  }

  // STAGE FOUR, THE SCHEME AND THE CHROMA LIFT, on the accent family and the
  // chromatic list. Exactly Phase 62, acting after the hue and the spread so
  // nothing here ever sees a neutral.
  for (const token of ALL_THEME_TOKENS) {
    if (HUE_SET.has(token) || TEXT_SET.has(token)) continue;
    const schemed = schemeTransform !== null && SCHEME_SET.has(token);
    const chromaLift = liftOn && CHROMA_SET.has(token);
    if (!schemed && !chromaLift) continue;

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
