/**
 * Colour measurement for the lane palette — test-only, so nothing ships.
 *
 * Two questions, both of which a palette tweak can silently break:
 *
 *  - **Can you see the stroke?** WCAG 1.4.11 asks 3:1 for non-text UI. A 1.5 px
 *    lane is non-text UI, and the worst background is the SELECTED row, which
 *    is the state nobody screenshots.
 *  - **Can you tell two lanes apart?** Lane colour is identity: if two
 *    concurrent lanes read as one hue, the graph says two branches are one.
 *
 * The dichromat simulation is Viénot, Brettel & Mollon (1999) — the same model
 * research 24 §7 measured with. Reproduced to the decimal: this file returns
 * 84.8 / 82.8 for `--accent` vs the chosen pink where the research published
 * 85 / 83, and 24.1 / 30.9 for `--accent` vs a VS Code-like violet where it
 * published 24 / 31. Matching those is what makes the thresholds below
 * comparable to the numbers in the research doc.
 */

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function encode(linear: number): number {
  const v = Math.min(1, Math.max(0, linear));
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type Dichromacy = 'protan' | 'deutan';

/** Viénot 1999 dichromat simulation. */
export function simulate(rgb: Rgb, kind: Dichromacy): Rgb {
  const [r, g, b] = rgb.map(toLinear) as unknown as Rgb;
  const l = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const m = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const s = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  const l2 = kind === 'protan' ? 2.02344 * m - 2.52581 * s : l;
  const m2 = kind === 'deutan' ? 0.494207 * l + 1.24827 * s : m;
  return [
    encode(0.0809444479 * l2 - 0.130504409 * m2 + 0.116721066 * s),
    encode(-0.0102485335 * l2 + 0.0540193266 * m2 - 0.113614708 * s),
    encode(-0.000365296938 * l2 - 0.00412161469 * m2 + 0.693511405 * s)
  ];
}

/** Euclidean RGB distance after simulating `kind`. Higher is safer. */
export function separation(a: Rgb, b: Rgb, kind: Dichromacy): number {
  const [ar, ag, ab] = simulate(a, kind);
  const [br, bg, bb] = simulate(b, kind);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

/** Worst of the two dichromacies, which is the number that has to clear. */
export function worstSeparation(a: Rgb, b: Rgb): number {
  return Math.min(separation(a, b, 'protan'), separation(a, b, 'deutan'));
}

/**
 * Pull `--name: #hex;` declarations out of a stylesheet. Deliberately dumb —
 * a regex over the file, not a CSS parser — because the only job is to notice
 * that a token's VALUE changed.
 */
export function readCssTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const pattern = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  for (const match of css.matchAll(pattern)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) tokens.set(name, value);
  }
  return tokens;
}
