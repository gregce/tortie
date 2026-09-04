// Colour arithmetic for research 80, on the repository's own culori (read, not installed).
import { createRequire } from 'node:module';
const require = createRequire('/private/tmp/wt-p213/package.json');
export const culori = require('culori');
const { converter, clampChroma, formatHex, parse, wcagContrast, wcagLuminance, differenceCiede2000 } = culori;
export const toOklch = converter('oklch');
export const toRgb = converter('rgb');
export const de2000 = differenceCiede2000();
const clamp01 = (n) => Math.min(1, Math.max(0, n));
export function hexOf(color) {
  const rgb = toRgb(clampChroma(color, 'oklch'));
  return formatHex({ mode: 'rgb', r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) });
}
export function hex(css) { const p = parse(String(css).trim()); return p === undefined ? null : formatHex(p); }
/** Alpha colour composited over an opaque ground, as the screen shows it. */
export function over(css, groundCss) {
  const c = toRgb(parse(css)); const g = toRgb(parse(groundCss)); const a = c.alpha ?? 1;
  return formatHex({ mode: 'rgb', r: c.r * a + g.r * (1 - a), g: c.g * a + g.g * (1 - a), b: c.b * a + g.b * (1 - a) });
}
export function ratio(fg, bg) { const a = parse(String(fg).trim()); const b = parse(String(bg).trim()); if (!a || !b) return 1; return wcagContrast(a, b); }
export function Y(css) { return wcagLuminance(parse(css)); }
export function L(css) { return toOklch(parse(css)).l; }
export function oklch(css) { const o = toOklch(parse(css)); return { l: o.l, c: o.c ?? 0, h: o.h ?? 0 }; }
export const r3 = (n) => Math.round(n * 1000) / 1000;
export const r2 = (n) => Math.round(n * 100) / 100;
/**
 * The colour with the hue and chroma of `css` whose contrast on `ground` is `target`,
 * searched over OKLCH lightness on the dark side (dark=true) or the light side, over the
 * eight bit result. Same shape as src/renderer/theme/hue.ts solveForRatio.
 */
export function solve(css, ground, target, dark = true) {
  const ok = toOklch(parse(css)); const gL = toOklch(parse(ground)).l;
  let lo = dark ? 0 : gL, hi = dark ? gL : 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2; const clears = ratio(hexOf({ ...ok, l: mid }), ground) >= target;
    if (dark) { if (clears) lo = mid; else hi = mid; } else if (clears) hi = mid; else lo = mid;
  }
  return hexOf({ ...ok, l: dark ? lo : hi });
}
/** A colour with the given hue, chroma and lightness. */
export function mk(l, c, h) { return hexOf({ mode: 'oklch', l, c, h }); }
export function rgbOf(css) { const c = toRgb(parse(css)); return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]; }
export function step(a, b) { const x = rgbOf(a), y = rgbOf(b); return Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1]), Math.abs(x[2] - y[2])); }
