/**
 * P214 measure ONE: the binding table for the LIGHT base.
 *
 * For every shade row the region walk would consider, and every depth in it,
 * this walks every whole degree of the circle at all three contrast levels,
 * plus every fifteenth degree over all four highlight schemes, derives the
 * override map with the SHIPPING deriveOverrides, and records the minimum
 * SLACK of every floor the design pins: which token binds first, by how much,
 * and at which hue, contrast and scheme.
 *
 * Contrast is re-derived here with culori's full entry rather than read from
 * the modules, the same posture the gate uses.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse, wcagContrast, wcagLuminance } from 'culori';

const repoRoot = '/private/tmp/wt-p214';
const toRgb = converter('rgb');

const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);
function blockOf(head: string): string {
  const start = css.indexOf(head);
  if (start === -1) return '';
  const close = css.indexOf('\n}', start);
  return close === -1 ? '' : css.slice(start + head.length, close);
}
function readDecls(text: string, into = new Map<string, string>()): Map<string, string> {
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    into.set(m[1] as string, (m[2] as string).replace(/\s+/g, ' ').trim());
  }
  return into;
}
function resolveVars(map: Map<string, string>): Map<string, string> {
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false;
    for (const [k, v] of map) {
      const next = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => map.get(r) ?? w);
      if (next !== v) {
        map.set(k, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return map;
}
export const LIGHT_BASE = Object.fromEntries(
  resolveVars(readDecls(blockOf(":root[data-scheme='light'] {"), readDecls(blockOf(':root {'))))
);

const { deriveOverrides } = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const terminalMod = await import(resolve(repoRoot, 'src/renderer/terminal/theme.ts'));
const hueMod = await import(resolve(repoRoot, 'src/renderer/theme/hue.ts'));

const RAMP = presets.rampOrderFor('light') as string[];
const HAIR = presets.hairlineOrderFor('light') as string[];
const PAIRS = presets.RENDERED_STEP_PAIRS as (readonly [string, string])[];
const STEP_MIN = presets.RENDERED_STEP_MIN as number;
const TEXT_PINS = presets.TEXT_PINS as {
  token: string;
  ground: string;
  grounds: string[];
  floor: number | null;
}[];
const CHROM = presets.chromaticPinsFor('light') as { token: string; ground: string; floor: number }[];

// Memoised, because the walk asks the same hex tens of thousands of times.
const LUM = new Map<string, number>();
function lum(a: string): number {
  let v = LUM.get(a);
  if (v === undefined) {
    v = wcagLuminance(a);
    LUM.set(a, v);
  }
  return v;
}
function ratio(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const TERM = new Map<string, Record<string, string>>();
function terminalFor(canvas: string): Record<string, string> {
  let p = TERM.get(canvas);
  if (p === undefined) {
    p = terminalMod.terminalTextFor(canvas, hueMod.textIsDarkOn(canvas), 'light') as Record<string, string>;
    TERM.set(canvas, p);
  }
  return p;
}
const STEPC = new Map<string, number>();
function step(a: string, b: string): number {
  const key = `${a}|${b}`;
  let v = STEPC.get(key);
  if (v === undefined) {
    const p = toRgb(parse(a) as never) as { r: number; g: number; b: number };
    const q = toRgb(parse(b) as never) as { r: number; g: number; b: number };
    v = Math.round(Math.max(Math.abs(p.r - q.r), Math.abs(p.g - q.g), Math.abs(p.b - q.b)) * 255);
    STEPC.set(key, v);
  }
  return v;
}

export interface Slack {
  key: string;
  family: string;
  slack: number;
  hue: number;
  contrast: string;
  scheme: string;
  got: number;
  need: number;
}

/** Every floor's slack at one derived frame. Positive holds. */
export function slacksAt(valueOf: (t: string) => string | undefined): {
  key: string;
  family: string;
  slack: number;
  got: number;
  need: number;
}[] {
  const out: { key: string; family: string; slack: number; got: number; need: number }[] = [];
  for (const run of [RAMP, HAIR]) {
    for (let i = 1; i < run.length; i += 1) {
      const lo = valueOf(run[i - 1] as string);
      const hi = valueOf(run[i] as string);
      if (lo === undefined || hi === undefined) continue;
      const gap = lum(hi) - lum(lo);
      out.push({
        key: `order ${run[i]}>${run[i - 1]}`,
        family: 'order',
        slack: gap * 1000,
        got: gap,
        need: 0
      });
    }
  }
  for (const [a, b] of PAIRS) {
    const one = valueOf(a);
    const other = valueOf(b);
    if (one === undefined || other === undefined) continue;
    const s = step(one, other);
    out.push({ key: `step ${a}/${b}`, family: 'step', slack: s - STEP_MIN, got: s, need: STEP_MIN });
  }
  for (const pin of TEXT_PINS) {
    if (pin.floor === null) continue;
    const fg = valueOf(pin.token);
    if (fg === undefined) continue;
    for (const g of pin.grounds) {
      const bg = valueOf(g);
      if (bg === undefined) continue;
      const got = ratio(fg, bg);
      out.push({
        key: `${pin.token} on ${g}`,
        family: 'text',
        slack: got - pin.floor,
        got,
        need: pin.floor
      });
    }
  }
  const canvas = valueOf('--bg-canvas');
  if (canvas !== undefined) {
    const palette = terminalFor(canvas);
    for (const [key, hex] of Object.entries(palette)) {
      if (key === 'black' || key === 'brightBlack') continue;
      const need = key === 'foreground' ? 4.5 : 3;
      const got = ratio(hex, canvas);
      out.push({ key: `terminal ${key}`, family: 'terminal', slack: got - need, got, need });
    }
  }
  for (const pin of CHROM) {
    const fg = valueOf(pin.token);
    const bg = valueOf(pin.ground);
    if (fg === undefined || bg === undefined) continue;
    const got = ratio(fg, bg);
    out.push({
      key: `${pin.token} on ${pin.ground}`,
      family: 'chromatic',
      slack: got - pin.floor,
      got,
      need: pin.floor
    });
  }
  return out;
}

const CONTRASTS = ['normal', 'raised', 'high'];
const SCHEMES = ['blue', 'teal', 'purple', 'slate'];

export interface CellReading {
  shade: number;
  depth: number;
  worst: Slack;
  /** Every key's own minimum over the walk, worst first. */
  perKey: Map<string, Slack>;
}

export function walkCell(
  shade: number,
  depth: number,
  base: Record<string, string>,
  hueStep = 1,
  schemeStep = 15
): CellReading {
  const perKey = new Map<string, Slack>();
  const record = (s: Slack): void => {
    const seen = perKey.get(s.key);
    if (seen === undefined || s.slack < seen.slack) perKey.set(s.key, s);
  };
  const one = (hue: number, contrastLevel: string, highlightScheme: string): void => {
    const overrides = deriveOverrides(
      { highlightScheme, contrastLevel, chromeHue: hue, chromeShade: shade, chromeDepth: depth },
      base
    ) as Record<string, string>;
    const valueOf = (t: string): string | undefined => overrides[t] ?? base[t];
    for (const s of slacksAt(valueOf)) {
      record({ ...s, hue, contrast: contrastLevel, scheme: highlightScheme });
    }
  };
  for (let hue = 0; hue < 360; hue += hueStep) {
    for (const c of CONTRASTS) one(hue, c, 'blue');
  }
  for (let hue = 0; hue < 360; hue += schemeStep) {
    for (const c of CONTRASTS) for (const s of SCHEMES) if (s !== 'blue') one(hue, c, s);
  }
  let worst: Slack | null = null;
  for (const s of perKey.values()) if (worst === null || s.slack < worst.slack) worst = s;
  return { shade, depth, worst: worst as Slack, perKey };
}
