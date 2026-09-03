/**
 * The frame's hue (Phase 207). The one colour transform BOTH processes run.
 *
 * tokens.css section 1.1 declares the neutral ramp as a cool graphite at
 * about 222 degrees. The Appearance slider moves that hue around the whole
 * circle, and this module is the arithmetic: one neutral in, the same neutral
 * with its hue turned, out. It lives in src/shared because main needs the
 * answer for the canvas as well as the renderer. `BrowserWindow` paints its
 * `backgroundColor` before any renderer exists, so a hue main could not
 * compute would be a graphite frame on every launch and every resize.
 *
 * THE SPACE IS OKLCH, AND THE REASON IS MEASURED. Rotating hue at a fixed HSL
 * lightness does not keep the appearance fixed: HSL lightness is arithmetic
 * over the channels, not what the eye reads, so a yellow ground at l 0.08
 * reads far lighter than a blue one. Over the shipped ramp an HSL rotation
 * moves perceived lightness (OKLCH L of the result) by up to 0.034, at the
 * yellows, and moves the hairline ratio `--border` on `--bg-sidebar` from
 * 1.268 to 1.361. The same rotation in OKLCH moves L by at most 0.002 and
 * keeps every pinned ratio at all 360 degrees. `npm run conformance:hue`
 * carries an ablation that rotates in HSL so that failure is seen rather
 * than argued.
 *
 * THE ROTATION IS AN OFFSET, NOT AN ABSOLUTE. The ramp is not one hue. Its
 * eight neutrals sit between 264 and 274 degrees in OKLCH (the 222 in
 * tokens.css is the HSL reading of the same colours), and the accent of each
 * rung is part of how the ramp was tuned. So the slider's number is a
 * position on the same circle the design named, 222 by default, and every
 * neutral turns by `hue - 222` from its OWN hue. At 222 the offset is zero
 * and every neutral round trips to its shipped bytes, which is what keeps an
 * untouched install byte identical.
 *
 * Lightness and chroma are never touched here. A rotation moves nothing else,
 * and the chroma of the ramp is so low (0.006 on the canvas) that no hue can
 * make a ground lighter. The text rule that handles a lighter ground is in
 * src/renderer/theme/hue.ts and is proved on synthetic grounds.
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
import { DEFAULT_CHROME_HUE, sanitizeChromeHue } from './settings';
import { WINDOW_BACKGROUND } from './window-chrome';

// The four spaces this module walks. `useMode` is idempotent, so a renderer
// that also registers them in derive.ts pays nothing for the repeat.
useMode(modeRgb);
useMode(modeLrgb);
useMode(modeOklab);
useMode(modeOklch);

const toOklch = converter('oklch');
const toRgb = converter('rgb');

/**
 * One neutral, turned to the chosen hue. The input is any CSS colour text;
 * the output is a six digit lowercase hex, or rgba() when the input carried
 * alpha. A value that does not parse comes
 * back unchanged, so a malformed token can never crash a paint.
 *
 * At the default hue this is the identity, byte for byte, for every neutral
 * in the shipped ramp: the offset is zero and culori's hex round trip is
 * exact at these values (proved by the unit tests and by the gate).
 */
export function rotateChromeNeutral(css: string, hue: number): string {
  const offset = sanitizeChromeHue(hue) - DEFAULT_CHROME_HUE;
  if (offset === 0) return css;
  const parsed = parse(css.trim());
  if (parsed === undefined) return css;
  const ok = toOklch(parsed);
  if (ok === undefined) return css;
  const turned = clampChroma(
    { ...ok, h: (((ok.h ?? 0) + offset) % 360 + 360) % 360 },
    'oklch'
  );
  const rgb = toRgb(turned);
  const safe = {
    ...rgb,
    r: Math.min(1, Math.max(0, rgb.r)),
    g: Math.min(1, Math.max(0, rgb.g)),
    b: Math.min(1, Math.max(0, rgb.b))
  };
  // A value that carries alpha keeps it exactly, the Phase 62 contract.
  if (safe.alpha !== undefined && safe.alpha < 1) return formatRgb(safe);
  return formatHex(safe);
}

/**
 * The colour the compositor paints a window before any renderer exists, at
 * this hue. `WINDOW_BACKGROUND` exactly at the default, so an untouched
 * install keeps the constant the canvas single source test pins; the rotated
 * canvas otherwise, which is the same value the renderer writes into
 * `--bg-canvas` once the settings read lands.
 */
export function windowBackgroundFor(hue: number): string {
  return rotateChromeNeutral(WINDOW_BACKGROUND, hue);
}
