/**
 * P214 measure TWO, step one: the WORST ground each shade row reaches.
 *
 * A colour on paper is dark on a light fill, so the ground that binds it is
 * the DARKEST one the walk reaches at that row: the darkest --bg-active for
 * every mark drawn on a selected row, the darkest --bg-canvas and
 * --bg-sidebar for the accent as text. Those three numbers are what a
 * re-solve for headroom has to be solved against, and they are measured here
 * over every whole degree, all three contrast levels and all four highlight
 * schemes rather than assumed to be the shipped hue's.
 */
import { converter, parse, wcagLuminance } from 'culori';
import { LIGHT_BASE } from './region.mts';
const toOklch = converter('oklch');

const { deriveOverrides } = await import('/private/tmp/wt-p214/src/renderer/theme/derive.ts');

const GROUNDS = ['--bg-active', '--bg-canvas', '--bg-sidebar', '--bg-raised', '--bg-surface'];
const CONTRASTS = ['normal', 'raised', 'high'];
const SCHEMES = ['blue', 'teal', 'purple', 'slate'];

export function darkestGrounds(
  shade: number,
  depths: readonly number[],
  base: Record<string, string> = LIGHT_BASE
): Record<string, { hex: string; y: number; hue: number; contrast: string; depth: number }> {
  const out: Record<string, { hex: string; y: number; hue: number; contrast: string; depth: number }> = {};
  const consider = (
    token: string,
    hex: string,
    hue: number,
    contrast: string,
    depth: number
  ): void => {
    const y = wcagLuminance(hex);
    const seen = out[token];
    if (seen === undefined || y < seen.y) out[token] = { hex, y, hue, contrast, depth };
  };
  for (const depth of depths) {
    for (let hue = 0; hue < 360; hue += 1) {
      for (const contrastLevel of CONTRASTS) {
        const o = deriveOverrides(
          { highlightScheme: 'blue', contrastLevel, chromeHue: hue, chromeShade: shade, chromeDepth: depth },
          base
        ) as Record<string, string>;
        for (const g of GROUNDS) consider(g, o[g] ?? base[g], hue, contrastLevel, depth);
      }
    }
    for (let hue = 0; hue < 360; hue += 15) {
      for (const contrastLevel of CONTRASTS) {
        for (const highlightScheme of SCHEMES) {
          const o = deriveOverrides(
            { highlightScheme, contrastLevel, chromeHue: hue, chromeShade: shade, chromeDepth: depth },
            base
          ) as Record<string, string>;
          for (const g of GROUNDS) consider(g, o[g] ?? base[g], hue, contrastLevel, depth);
        }
      }
    }
  }
  return out;
}

if (process.env.P214_GROUNDS_MAIN === '1') {
  const depths = [-3, -2, -1, 0, 1, 2, 3];
  console.log('# the darkest ground each shade row reaches, over the whole walk');
  console.log('shade  token          hex      Y       OKLCH L   at hue/contrast/depth   cap for 3:1   cap for 4.5:1');
  for (const shade of [0, -1, -2, -3, -4]) {
    const g = darkestGrounds(shade, depths);
    for (const token of GROUNDS) {
      const r = g[token] as { hex: string; y: number; hue: number; contrast: string; depth: number };
      const cap3 = (r.y + 0.05) / 3 - 0.05;
      const cap45 = (r.y + 0.05) / 4.5 - 0.05;
      const l = toOklch(parse(r.hex) as never)?.l ?? 0;
      console.log(
        `${String(shade).padStart(5)}  ${token.padEnd(13)} ${r.hex}  ${r.y.toFixed(4)}  ${l.toFixed(4)}   ${String(r.hue).padStart(3)}/${r.contrast.padEnd(6)}/${String(r.depth).padStart(2)}   Y<=${cap3.toFixed(4)}   Y<=${cap45.toFixed(4)}`
      );
    }
    console.log('');
  }
}
