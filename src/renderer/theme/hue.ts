/**
 * The text follows the ground (Phase 207). THEME CONSTANT FILE under the
 * CLAUDE.md UI rules, beside presets.ts and derive.ts.
 *
 * The rotation itself is in src/shared/chrome-hue.ts, because main paints the
 * canvas before any renderer exists. This file is the other half of the
 * operator's request, his second sentence: if a hue ever makes the ground
 * much lighter than the near black it ships with, the text must do the right
 * thing. Two rules, and both are pure functions the gate runs under node.
 *
 * RULE ONE, THE FLIP, has exactly one threshold. Text is light on a dark
 * ground and dark on a light one, and the ground that decides is the canvas,
 * because the canvas is the anchor every other ground spreads from. The
 * threshold is the WCAG relative luminance at which pure black and pure
 * white have the SAME contrast against the ground, sqrt(0.05 x 1.05) - 0.05,
 * about 0.179. Below it white is the better text, above it black is, so the
 * flip happens where it can never make the text worse. It is one number and
 * it is derived rather than tuned, which is what lets a verifier re-derive
 * it with its own arithmetic.
 *
 * RULE TWO, THE RATIO. On the light side the shipped text is left alone and
 * is lifted toward white only when a ground lifts it under its floor, which
 * is 4.5:1 for the text tokens (WCAG AA, and the bar DESIGN.md pins) and
 * 3:1 for the terminal's colours (the non text floor the design uses for the
 * graph lanes). So a hue, which moves no ground by more than 0.002 in
 * perceived lightness, writes no text at all. Above the threshold every text
 * colour is solved DARK to keep the ratio it ships with against the ground
 * it sits on, in its own hue and chroma, or black when that ratio is out of
 * reach. The pinned ratio for each token is measured from the shipped values
 * rather than typed here, so it cannot drift from tokens.css.
 *
 * WHY THE GROUND IS NEVER CLAMPED INSTEAD. Clamping the ramp would silently
 * refuse the hue the person asked for and show them a different colour with
 * no word about it. Moving the text keeps the hue honest.
 *
 * NOTHING HERE FIRES BY ROTATION. The ramp's chroma is 0.006 on the canvas,
 * so no hue can lift it anywhere near the threshold. The rule exists for the
 * general case the operator named, and `npm run conformance:hue` proves it on
 * synthetic grounds that lift the whole ramp to white, because a rule that
 * is only argued is a rule a later round removes.
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
  useMode,
  wcagContrast,
  wcagLuminance
} from 'culori/fn';
import type { Oklch } from 'culori/fn';

useMode(modeRgb);
useMode(modeLrgb);
useMode(modeOklab);
useMode(modeOklch);

const toOklch = converter('oklch');
const toRgb = converter('rgb');

/**
 * The canvas luminance at which black and white text have equal contrast.
 * Above it the text family is dark. sqrt(0.05 * 1.05) - 0.05.
 */
export const TEXT_FLIP_CANVAS_LUMINANCE = Math.sqrt(0.05 * 1.05) - 0.05;

/** The floor a text token is lifted to on the light side. WCAG AA. */
export const TEXT_FLOOR = 4.5;

/** The floor a terminal colour is lifted to on the light side. */
export const TERMINAL_FLOOR = 3;

/** Is the text family dark on this canvas? One threshold, stated above. */
export function textIsDarkOn(canvasCss: string): boolean {
  const parsed = parse(canvasCss.trim());
  if (parsed === undefined) return false;
  return wcagLuminance(parsed) > TEXT_FLIP_CANVAS_LUMINANCE;
}

/** WCAG contrast of two CSS colours, 1 when either does not parse. */
export function contrastOf(fg: string, bg: string): number {
  const a = parse(fg.trim());
  const b = parse(bg.trim());
  if (a === undefined || b === undefined) return 1;
  return wcagContrast(a, b);
}

function hexOf(color: Oklch): string {
  const rgb = toRgb(clampChroma(color, 'oklch'));
  const safe = {
    ...rgb,
    r: Math.min(1, Math.max(0, rgb.r)),
    g: Math.min(1, Math.max(0, rgb.g)),
    b: Math.min(1, Math.max(0, rgb.b))
  };
  if (safe.alpha !== undefined && safe.alpha < 1) return formatRgb(safe);
  return formatHex(safe);
}

/**
 * The colour with this one's hue and chroma whose contrast against `ground`
 * is `ratio`, searched over OKLCH lightness on the side asked for. The search
 * runs over the 8 bit result, so the answer is what the screen shows rather
 * than a real number the screen rounds away from. When the ratio is out of
 * reach on that side the answer is the end of the range, black or white.
 */
export function solveForRatio(
  css: string,
  ground: string,
  ratio: number,
  dark: boolean
): string {
  const parsed = parse(css.trim());
  if (parsed === undefined) return css;
  const ok = toOklch(parsed);
  if (ok === undefined) return css;
  const groundL = toOklch(parse(ground.trim()) ?? { mode: 'rgb', r: 0, g: 0, b: 0 })?.l ?? 0;
  // The search is BOUNDED TO THE SIDE ASKED FOR, from the ground's own
  // lightness to black or to white. Contrast is monotone in lightness on
  // each side of the ground, so within the bound the bisection is sound; a
  // search over the whole range would be answered by a colour on the wrong
  // side whenever the asked ratio is small, because a colour far from the
  // ground on either side clears it. On the dark side the ratio rises as L
  // falls, so `lo` holds the best L that still clears the ratio; on the
  // light side the roles swap.
  let lo = dark ? 0 : groundL;
  let hi = dark ? groundL : 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const clears = contrastOf(hexOf({ ...ok, l: mid }), ground) >= ratio;
    if (dark) {
      if (clears) lo = mid;
      else hi = mid;
    } else if (clears) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return hexOf({ ...ok, l: dark ? lo : hi });
}

/** The ground in `grounds` this colour reads worst against. */
function worstGround(css: string, grounds: readonly string[]): string {
  let worst = grounds[0] ?? '';
  let ratio = Number.POSITIVE_INFINITY;
  for (const ground of grounds) {
    const r = contrastOf(css, ground);
    if (r < ratio) {
      ratio = r;
      worst = ground;
    }
  }
  return worst;
}

/**
 * One text colour, following the grounds it sits on.
 *
 * `shipped` and `shippedGround` are the values tokens.css ships, which is
 * where the pinned ratio is read from. `grounds` are the grounds in effect
 * that this colour is allowed on, the pinned one first. On the light side
 * the shipped colour is kept unless it fails `floor` on any of them, and is
 * then lifted to the floor against the one it reads worst on, which lifts
 * it past the floor on every other. On the dark side it is solved to the
 * shipped ratio against the pinned ground, and pushed darker still when
 * that leaves it under the floor on a darker ground it also sits on.
 */
export function followGround(
  shipped: string,
  shippedGround: string,
  grounds: readonly string[],
  floor: number,
  dark: boolean
): string {
  const pinned = grounds[0] ?? shippedGround;
  if (dark) {
    const kept = solveForRatio(shipped, pinned, contrastOf(shipped, shippedGround), true);
    const worst = worstGround(kept, grounds);
    if (contrastOf(kept, worst) >= floor) return kept;
    const floored = solveForRatio(shipped, worst, floor, true);
    return lightnessOf(floored) < lightnessOf(kept) ? floored : kept;
  }
  const worst = worstGround(shipped, grounds);
  if (contrastOf(shipped, worst) >= floor) return shipped;
  return solveForRatio(shipped, worst, floor, false);
}

function lightnessOf(css: string): number {
  const parsed = parse(css.trim());
  if (parsed === undefined) return 0;
  return toOklch(parsed)?.l ?? 0;
}

/**
 * A whole palette following one ground: the terminal's foreground, cursor
 * and sixteen ANSI colours, or Monaco's syntax ramp. Every entry keeps the
 * ratio it ships with against the shipped canvas once the text is dark, and
 * is otherwise kept unless it falls under its floor, the terminal floor
 * unless `floorOf` says otherwise for a key (the foreground is text and
 * takes the text floor). `black` and `brightBlack` are exempt from the
 * floor, because they are near the ground by design and lifting them to
 * 3:1 would invent a colour.
 */
export function followPalette<K extends string>(
  palette: Readonly<Record<K, string>>,
  shippedCanvas: string,
  canvas: string,
  dark: boolean,
  exempt: readonly string[] = [],
  floorOf: (key: K) => number = () => TERMINAL_FLOOR
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(palette) as K[]) {
    const shipped = palette[key];
    if (!dark && exempt.includes(key)) {
      out[key] = shipped;
      continue;
    }
    out[key] = followGround(shipped, shippedCanvas, [canvas], floorOf(key), dark);
  }
  return out;
}
