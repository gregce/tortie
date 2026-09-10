/**
 * walk-marks.mts — PHASE 249's answer to the one thing research 113 §7.4
 * named and neither step measured: what `--error` and `--success` really read
 * over the frames the Appearance sliders offer.
 *
 * It imports the SHIPPING `deriveOverrides` and the SHIPPING region tables
 * rather than a copy, reads `src/renderer/styles/tokens.css` the way
 * build/hue-conformance-probe.mts reads it, and computes every ratio here
 * with culori's full entry rather than asking a shipping module.
 *
 * It launches no Electron, starts no tmux server, spawns nothing, opens no
 * keychain, makes no request and reads nothing under the person's home.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse, wcagLuminance } from 'culori';
import { deriveOverrides } from '../../src/renderer/theme/derive.ts';
import { frameRegionFor } from '../../src/renderer/theme/presets.ts';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const toRgb = converter('rgb');

function readDeclarations(css: string): Map<string, string> {
  const decls = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) {
    const name = m[1];
    const value = m[2];
    if (name === undefined || value === undefined) continue;
    decls.set(name, value.replace(/\s+/g, ' ').trim());
  }
  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    for (const [name, value] of decls) {
      const next = value.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (whole, ref: string) => decls.get(ref) ?? whole);
      if (next !== value) { decls.set(name, next); changed = true; }
    }
    if (!changed) break;
  }
  return decls;
}
function schemeBlock(css: string, scheme: 'dark' | 'light'): string {
  const head = scheme === 'light' ? ":root[data-scheme='light'] {" : ':root {';
  const start = css.indexOf(head);
  if (start === -1) return '';
  const close = css.indexOf('}', start + head.length);
  return close === -1 ? '' : css.slice(start + head.length, close);
}
const cssPath = resolve(repoRoot, 'src', 'renderer', 'styles', 'tokens.css');
if (!existsSync(cssPath)) throw new Error('no tokens.css');
const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function baseFor(scheme: 'dark' | 'light'): Record<string, string> {
  const map = scheme === 'dark'
    ? readDeclarations(schemeBlock(css, 'dark'))
    : readDeclarations(`${schemeBlock(css, 'dark')}\n${schemeBlock(css, 'light')}`);
  return Object.fromEntries(map);
}

type Rgb = [number, number, number];
function rgbOf(value: string): Rgb {
  const p = parse(value);
  if (p === undefined) throw new Error(`unparseable ${value}`);
  const c = toRgb(p);
  return [c.r, c.g, c.b];
}
function alphaOf(value: string): number {
  const p = parse(value);
  return p === undefined ? 1 : (p.alpha ?? 1);
}
function over(fg: Rgb, a: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)) as Rgb;
}
function lum(c: Rgb): number {
  return wcagLuminance({ mode: 'rgb', r: c[0], g: c[1], b: c[2] });
}
function ratio(a: Rgb, b: Rgb): number {
  const la = lum(a); const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const SCHEMES = ['blue', 'teal', 'violet', 'amber'] as const;
const LEVELS = ['normal', 'raised', 'high'] as const;

interface Bad { base: string; token: string; on: string; hue: number; shade: number; depth: number; level: string; scheme: string; ratio: number; canvas: string }

const worst: Record<string, { r: number; where: Bad | null }> = {};
const bad: Bad[] = [];
let readings = 0;
const failingCells = new Set<string>();
const failingCellsNormal = new Set<string>();

for (const baseName of ['dark', 'light'] as const) {
  const base = baseFor(baseName);
  const region = frameRegionFor(baseName);
  for (const row of region) {
    for (let depth = row.minDepth; depth <= row.maxDepth; depth += 1) {
      for (const level of LEVELS) {
        for (const scheme of SCHEMES) {
          // Every whole degree at blue (the shipped scheme); every fifteenth
          // at the other three, which is the gate's own posture.
          const step = scheme === 'blue' ? 1 : 15;
          for (let hue = 0; hue < 360; hue += step) {
            const appearance = {
              baseScheme: baseName, highlightScheme: scheme, contrastLevel: level,
              chromeHue: hue, chromeShade: row.shade, chromeDepth: depth
            } as never;
            const ov = deriveOverrides(appearance, base);
            const canvas = rgbOf(ov['--bg-canvas'] ?? base['--bg-canvas']!);
            for (const token of ['--error', '--success'] as const) {
              const fg = rgbOf(ov[token] ?? base[token]!);
              const washRaw = base[`${token}-wash`]!;
              const washGround = over(rgbOf(washRaw), alphaOf(washRaw), canvas);
              for (const [on, ground] of [['canvas', canvas], ['wash', washGround]] as const) {
                const r = ratio(fg, ground);
                readings += 1;
                const key = `${baseName}|${token}|${on}`;
                if (worst[key] === undefined || r < worst[key]!.r) {
                  worst[key] = { r, where: { base: baseName, token, on, hue, shade: row.shade, depth, level, scheme, ratio: r, canvas: ov['--bg-canvas'] ?? base['--bg-canvas']! } };
                }
                if (r < 4.5) {
                  bad.push({ base: baseName, token, on, hue, shade: row.shade, depth, level, scheme, ratio: r, canvas: ov['--bg-canvas'] ?? base['--bg-canvas']! });
                  failingCells.add(`${baseName}|${row.shade}|${depth}`);
                  if (level === 'normal' && scheme === 'blue') failingCellsNormal.add(`${baseName}|${row.shade}|${depth}`);
                }
              }
            }
          }
        }
      }
    }
  }
}

console.log(`readings ${readings}`);
console.log(`under 4.5: ${bad.length}`);
for (const [k, v] of Object.entries(worst)) {
  const w = v.where!;
  console.log(`worst ${k}: ${v.r.toFixed(3)} at hue ${w.hue} shade ${w.shade} depth ${w.depth} ${w.level} ${w.scheme} canvas ${w.canvas}`);
}
console.log(`offered cells with at least one failure: ${failingCells.size} (${[...failingCells].sort().join(', ')})`);
console.log(`  of those at NORMAL, blue: ${failingCellsNormal.size} (${[...failingCellsNormal].sort().join(', ')})`);
const byToken: Record<string, number> = {};
for (const b of bad) byToken[`${b.base}|${b.token}|${b.on}`] = (byToken[`${b.base}|${b.token}|${b.on}`] ?? 0) + 1;
console.log('failures by token:', JSON.stringify(byToken));

// Per contrast level, dark, --error on its own wash: the worst reading and
// how many offered cells hold at least one hue under 4.5.
for (const level of LEVELS) {
  const rows = bad.filter((b) => b.base === 'dark' && b.token === '--error' && b.on === 'wash' && b.level === level && b.scheme === 'blue');
  const cells = new Set(rows.map((b) => `${b.shade}/${b.depth}`));
  const w = rows.length === 0 ? null : rows.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  console.log(`${level}: ${rows.length} readings under 4.5, ${cells.size} of 35 cells` +
    (w === null ? '' : `, worst ${w.ratio.toFixed(3)} at hue ${w.hue} shade ${w.shade} depth ${w.depth} canvas ${w.canvas}`) +
    ` [${[...cells].sort().join(' ')}]`);
}
