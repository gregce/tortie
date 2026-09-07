/** Phase 218 builder's own re-derivation. Independent of the measure step:
 * hand-written WCAG luminance, all four highlight schemes, both bases, all
 * three contrast levels, every whole degree. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
const toRgb = converter('rgb');
function relLum(css: string): number {
  const c = toRgb(parse(css)!)!;
  const f = (v: number) => { const s = Math.round(v * 255) / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
const ratio = (a: string, b: string) => { const x = relLum(a), y = relLum(b); return x > y ? (x + 0.05) / (y + 0.05) : (y + 0.05) / (x + 0.05); };
function rd(css: string) {
  const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; }
  return d;
}
function block(css: string, s: 'dark' | 'light') { const head = s === 'light' ? ":root[data-scheme='light'] {" : ':root {'; const i = css.indexOf(head); if (i === -1) return ''; const c = css.indexOf('}', i + head.length); return c === -1 ? '' : css.slice(i + head.length, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const floors = await import(resolve(repoRoot, 'src/renderer/theme/floors.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const fff = floors.firstFloorFailure as any;
const SHADES = [-4, -3, -2, -1, 0, 1, 2], DEPTHS = [-3, -2, -1, 0, 1, 2, 3];
const LEVELS = ['normal', 'raised', 'high'];
const SCHEMES = ['blue', 'teal', 'purple', 'slate'];
const DOTS = ['--status-idle', '--status-exited'];

function baseFor(scheme: 'dark' | 'light', dot: string | null) {
  const decls = scheme === 'dark' ? rd(block(css, 'dark')) : rd(`${block(css, 'dark')}\n${block(css, 'light')}`);
  const base: Record<string, string> = {};
  for (const t of [...(presets.ALL_THEME_TOKENS as string[]), ...DOTS, '--status-failed', '--text-muted', '--bg-active']) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
  if (dot !== null) { base['--status-idle'] = dot; base['--status-exited'] = dot; }
  return base;
}

/** The region by the shipping predicate alone (no dot floor), all four schemes. */
function region(scheme: 'dark' | 'light', dot: string | null) {
  const base = baseFor(scheme, dot);
  const cells: [number, number][] = [];
  for (const s of SHADES) for (const d of DEPTHS) {
    let ok = true;
    outer: for (const hs of SCHEMES) for (const lv of LEVELS) for (let h = 0; h < 360; h += 1) {
      const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: s, chromeDepth: d }, base);
      if (fff((t: string) => o[t] ?? base[t], scheme) !== null) { ok = false; break outer; }
    }
    if (ok) cells.push([s, d]);
  }
  return cells;
}
const rows = (cells: [number, number][]) => SHADES.map((s) => { const ds = cells.filter((c) => c[0] === s).map((c) => c[1]).sort((a, b) => a - b); return ds.length ? `${s}:[${ds[0]}..${ds[ds.length - 1]}]` : `${s}:[]`; }).join(' ');

/** The dot's worst reading over a set of cells. */
function worst(scheme: 'dark' | 'light', dot: string | null, cells: [number, number][], levels = LEVELS) {
  const base = baseFor(scheme, dot);
  let lo = Infinity, at = '';
  const under = new Set<string>();
  for (const [s, d] of cells) for (const hs of SCHEMES) for (const lv of levels) for (let h = 0; h < 360; h += 1) {
    const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: s, chromeDepth: d }, base);
    const r = ratio(o['--status-idle'] ?? base['--status-idle']!, o['--bg-active'] ?? base['--bg-active']!);
    if (r < lo) { lo = r; at = `shade ${s} depth ${d} hue ${h} ${lv}/${hs}`; }
    if (r < 3) under.add(`${s},${d}`);
  }
  return { lo, at, under };
}

console.log('== A. the parent commit, dark ==');
const darkShipped = region('dark', null);
console.log(`region ${darkShipped.length} cells: ${rows(darkShipped)}   default(0,0) ${darkShipped.some(([s, d]) => s === 0 && d === 0) ? 'IN' : 'OUT'}`);
const b = baseFor('dark', null);
console.log(`shipped dot on shipped active fill: ${ratio(b['--status-idle']!, b['--bg-active']!).toFixed(4)}  (${b['--status-idle']} on ${b['--bg-active']})`);
const wN = worst('dark', null, darkShipped, ['normal']);
const wH = worst('dark', null, darkShipped, ['high']);
const wR = worst('dark', null, darkShipped, ['raised']);
const wAll = worst('dark', null, darkShipped);
console.log(`worst Normal ${wN.lo.toFixed(3)} at ${wN.at};  under at Normal: ${wN.under.size} of ${darkShipped.length}`);
console.log(`worst Raised ${wR.lo.toFixed(3)} at ${wR.at}`);
console.log(`worst High   ${wH.lo.toFixed(3)} at ${wH.at}`);
console.log(`under at SOME level: ${wAll.under.size} of ${darkShipped.length}`);
const shade0 = worst('dark', null, [[0, 0]]);
console.log(`fact 1: at shade 0 depth 0 the worst is ${shade0.lo.toFixed(3)} at ${shade0.at}`);
const s0d1 = worst('dark', null, [[0, 1]], ['normal']);
console.log(`shade 0 depth 1 at Normal: ${s0d1.lo.toFixed(3)}`);

console.log('\n== B. the parent commit, light ==');
const lightShipped = region('light', null);
console.log(`region ${lightShipped.length} cells: ${rows(lightShipped)}`);
const lw = worst('light', null, lightShipped);
console.log(`light dot worst ${lw.lo.toFixed(3)} at ${lw.at}; under: ${lw.under.size}`);

const CAND = process.env['P218_DOT'] ?? '#8b93a1';
console.log(`\n== C. answer A at ${CAND}, dark ==`);
const darkA = region('dark', CAND);
console.log(`region ${darkA.length} cells: ${rows(darkA)}   default(0,0) ${darkA.some(([s, d]) => s === 0 && d === 0) ? 'IN' : 'OUT'}`);
const aw = worst('dark', CAND, darkA);
console.log(`dot worst ${aw.lo.toFixed(3)} at ${aw.at}; under: ${aw.under.size}`);
const ab = baseFor('dark', CAND);
console.log(`on the shipped active fill ${ratio(CAND, ab['--bg-active']!).toFixed(3)}; on the canvas ${ratio(CAND, ab['--bg-canvas']!).toFixed(3)}; --text-muted on the canvas ${ratio(ab['--text-muted']!, ab['--bg-canvas']!).toFixed(3)}`);
