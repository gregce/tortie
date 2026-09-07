/** Phase 218: re-derive the offered region myself, at several hue steps and
 * arm sets, and count the dot failures over each, to find which shape gives
 * 40 cells / 11 under at Normal. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, wcagContrast } from 'culori';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
function readDeclarations(css: string): Map<string, string> {
  const d = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false;
    for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } }
    if (!ch) break; }
  return d;
}
function block(css: string, s: 'dark' | 'light'): string {
  const head = s === 'light' ? ":root[data-scheme='light'] {" : ':root {';
  const i = css.indexOf(head); if (i === -1) return '';
  const c = css.indexOf('}', i + head.length); return c === -1 ? '' : css.slice(i + head.length, c);
}
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const decls = readDeclarations(block(css, 'dark'));

const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const floors = await import(resolve(repoRoot, 'src/renderer/theme/floors.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const firstFloorFailure = floors.firstFloorFailure as any;
const ALL = presets.ALL_THEME_TOKENS as string[];
const EXTRA = ['--status-idle', '--status-exited', '--bg-active'];
const base: Record<string, string> = {};
for (const t of [...ALL, ...EXTRA]) { const v = decls.get(t); if (v !== undefined) base[t] = v; }

const SHADES = [-4, -3, -2, -1, 0, 1, 2];
const DEPTHS = [-3, -2, -1, 0, 1, 2, 3];
const LEVELS = ['normal', 'raised', 'high'];

function feasible(shade: number, depth: number, step: number, schemes: string[], levels: string[]): boolean {
  for (const hs of schemes) for (const lv of levels) for (let h = 0; h < 360; h += step) {
    const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: shade, chromeDepth: depth }, base);
    if (firstFloorFailure((t: string) => o[t] ?? base[t], 'dark') !== null) return false;
  }
  return true;
}
function dotUnder(shade: number, depth: number, level: string): boolean {
  for (let h = 0; h < 360; h += 1) {
    const o = deriveOverrides({ highlightScheme: 'blue', contrastLevel: level, chromeHue: h, chromeShade: shade, chromeDepth: depth }, base);
    if (wcagContrast(parse(o['--status-idle'] ?? base['--status-idle']!)!, parse(o['--bg-active'] ?? base['--bg-active']!)!) < 3) return true;
  }
  return false;
}

const variants: { name: string; step: number; schemes: string[]; levels: string[] }[] = [
  { name: 'step1 blue 3levels (shipping)', step: 1, schemes: ['blue'], levels: LEVELS },
  { name: 'step1 4schemes 3levels', step: 1, schemes: ['blue', 'teal', 'purple', 'slate'], levels: LEVELS },
  { name: 'step5 blue 3levels', step: 5, schemes: ['blue'], levels: LEVELS },
  { name: 'step10 blue 3levels', step: 10, schemes: ['blue'], levels: LEVELS },
  { name: 'step15 blue 3levels', step: 15, schemes: ['blue'], levels: LEVELS },
  { name: 'step30 blue 3levels', step: 30, schemes: ['blue'], levels: LEVELS },
  { name: 'step45 blue 3levels', step: 45, schemes: ['blue'], levels: LEVELS },
  { name: 'step1 blue NORMAL only', step: 1, schemes: ['blue'], levels: ['normal'] }
];
for (const v of variants) {
  const cells: [number, number][] = [];
  for (const s of SHADES) for (const d of DEPTHS) if (feasible(s, d, v.step, v.schemes, v.levels)) cells.push([s, d]);
  const un = cells.filter(([s, d]) => dotUnder(s, d, 'normal')).length;
  const ua = cells.filter(([s, d]) => LEVELS.some((l) => dotUnder(s, d, l))).length;
  // contiguity per shade
  const rows = SHADES.map((s) => { const ds = cells.filter((c) => c[0] === s).map((c) => c[1]).sort((a, b) => a - b); return ds.length ? `${s}:[${ds[0]}..${ds[ds.length-1]}]${ds.length === ds[ds.length-1]! - ds[0]! + 1 ? '' : '!GAP'}` : `${s}:[]`; });
  console.log(`${v.name.padEnd(34)} cells=${String(cells.length).padStart(2)} underNormal=${String(un).padStart(2)} underAny=${String(ua).padStart(2)}  ${rows.join(' ')}`);
}
