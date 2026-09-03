/**
 * The frame's own lightness (Phase 210). The one ramp transform BOTH
 * processes run, beside the hue rotation in ./chrome-hue.ts and for the same
 * reason: `BrowserWindow` paints its `backgroundColor` before any renderer
 * exists, so a shade main could not compute would be a graphite frame on
 * every launch and every resize.
 *
 * WHAT IT DOES, in one line. The hue turns the ramp; this moves it. Two
 * numbers: WHERE the ramp sits, which slides every neutral together, and HOW
 * FAR it spreads, which scales each neutral's distance from the canvas.
 *
 *     L' = anchor + (L - canvasL) * factor
 *
 * THE SPREAD IS A MULTIPLIER AND NOT A NEW RAMP, and that is the whole reason
 * the order can never invert. The map above is affine in L with a POSITIVE
 * slope for every factor this module offers, and an affine map with a positive
 * slope is strictly increasing, so `--bg-sidebar` stays below `--bg-canvas`
 * and the two hairlines stay above `--bg-active` at every shade and every
 * depth. There are exactly three caveats and the gate walks all three:
 * `clamp01` at the ends can bring two rungs together, eight bit rounding can
 * bring two rungs onto the same byte, and OKLCH lightness is not WCAG
 * luminance, so the order is asserted in the space the design pins it in
 * rather than in the one the arithmetic runs in.
 *
 * THE ANCHOR IS THE CANVAS IN EFFECT, turned or shipped, so this composes
 * with the hue in either order: the rotation moves perceived lightness by at
 * most 0.002, so the ramp lands where the shade asked whatever the hue is.
 *
 * NOTHING HERE IS TASTE. The ends of both axes were measured over every whole
 * degree and all three contrast levels and are recorded on the constants in
 * ./settings.ts. At the shipped pair every function here is the identity,
 * which is what keeps an untouched install byte identical.
 */

import {
  clampChroma,
  converter,
  formatHex,
  formatRgb,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeRgb,
  parse,
  useMode
} from 'culori/fn';
import {
  CHROME_DEPTH_FACTORS,
  CHROME_DEPTH_MIN,
  CHROME_SHADE_STEP,
  DEFAULT_CHROME_DEPTH,
  DEFAULT_CHROME_SHADE,
  sanitizeChromeDepth,
  sanitizeChromeShade
} from './settings';

// The four spaces this module walks. `useMode` is idempotent, so a process
// that also registers them in chrome-hue.ts or derive.ts pays nothing.
useMode(modeRgb);
useMode(modeLrgb);
useMode(modeOklab);
useMode(modeOklch);

const toOklch = converter('oklch');
const toRgb = converter('rgb');

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Is this pair the shipped ramp? Every function below is the identity here,
 * and derive.ts skips the whole stage, which is the zero override guarantee.
 */
export function rampIsShipped(shade: number, depth: number): boolean {
  return (
    sanitizeChromeShade(shade) === DEFAULT_CHROME_SHADE &&
    sanitizeChromeDepth(depth) === DEFAULT_CHROME_DEPTH
  );
}

/** The multiplier this depth stop names. 1 at the shipped stop. */
export function depthFactorFor(depth: number): number {
  const stop = sanitizeChromeDepth(depth);
  return CHROME_DEPTH_FACTORS[stop - CHROME_DEPTH_MIN] ?? 1;
}

/**
 * The OKLCH lightness the canvas takes at this shade, given the canvas in
 * effect. Clamped to the unit range, which is the first of the three caveats
 * in the header: at the ends the ramp can stop being a ramp, and that is what
 * the control refuses rather than what the arithmetic hides.
 */
export function anchorLightnessFor(canvasLightness: number, shade: number): number {
  return clamp01(canvasLightness + sanitizeChromeShade(shade) * CHROME_SHADE_STEP);
}

/**
 * One neutral of the ramp, moved. The input is any CSS colour text; the
 * output is a six digit lowercase hex, or rgba() when the input carried
 * alpha. A value that does not parse comes back unchanged, so a malformed
 * token can never crash a paint. Hue and chroma are never touched here.
 */
export function rampNeutral(
  css: string,
  canvasLightness: number,
  anchorLightness: number,
  factor: number
): string {
  const parsed = parse(css.trim());
  if (parsed === undefined) return css;
  const ok = toOklch(parsed);
  if (ok === undefined) return css;
  const moved = clampChroma(
    { ...ok, l: clamp01(anchorLightness + (ok.l - canvasLightness) * factor) },
    'oklch'
  );
  const rgb = toRgb(moved);
  const safe = {
    ...rgb,
    r: clamp01(rgb.r),
    g: clamp01(rgb.g),
    b: clamp01(rgb.b)
  };
  // A value that carries alpha keeps it exactly, the Phase 62 contract.
  if (safe.alpha !== undefined && safe.alpha < 1) return formatRgb(safe);
  return formatHex(safe);
}

/**
 * The whole ramp at one shade and depth, token to value, over the neutrals
 * given. `canvasCss` is the canvas in effect, which is the anchor every other
 * rung is measured from. An empty map at the shipped pair.
 */
export function rampOverrides(
  neutrals: readonly string[],
  valueOf: (token: string) => string | undefined,
  canvasCss: string | undefined,
  shade: number,
  depth: number
): Record<string, string> {
  const out: Record<string, string> = {};
  if (rampIsShipped(shade, depth)) return out;
  if (canvasCss === undefined) return out;
  const parsedCanvas = parse(canvasCss.trim());
  const canvas = parsedCanvas === undefined ? undefined : toOklch(parsedCanvas);
  // No anchor, no ramp. A canvas that does not parse is skipped rather than
  // moved about a guessed anchor, the same rule the contrast spread follows.
  if (canvas === undefined) return out;
  const anchor = anchorLightnessFor(canvas.l, shade);
  const factor = depthFactorFor(depth);
  for (const token of neutrals) {
    const raw = valueOf(token);
    if (raw === undefined) continue;
    out[token] = rampNeutral(raw, canvas.l, anchor, factor);
  }
  return out;
}
