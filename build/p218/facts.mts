/** Phase 218: the prose numbers, measured. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse, differenceCiede2000 } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
const toRgb = converter('rgb'); const toOklch = converter('oklch');
const dE = differenceCiede2000();
function relLum(css: string): number { const c = toRgb(parse(css)!)!; const f = (v: number) => { const s = Math.round(v * 255) / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
const ratio = (a: string, b: string) => { const x = relLum(a), y = relLum(b); return x > y ? (x + 0.05) / (y + 0.05) : (y + 0.05) / (x + 0.05); };
function rd(css: string) { const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g; for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim()); for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; } return d; }
function block(css: string, s: 'dark' | 'light') { const head = s === 'light' ? ":root[data-scheme='light'] {" : ':root {'; const i = css.indexOf(head); if (i === -1) return ''; const c = css.indexOf('}', i + head.length); return c === -1 ? '' : css.slice(i + head.length, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const decls = rd(block(css, 'dark'));
const base: Record<string, string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), '--status-idle', '--status-exited', '--status-failed', '--status-working', '--status-attention', '--text-muted', '--text-secondary', '--bg-active', '--bg-canvas']) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
const dot = base['--status-idle']!;
const ok = toOklch(parse(dot)!)!;
const shipped = '#6e7583'; const so = toOklch(parse(shipped)!)!;
console.log(`dot ${dot} OKLCH L ${ok.l!.toFixed(4)} C ${ok.c!.toFixed(4)} H ${ok.h!.toFixed(1)}   was ${shipped} L ${so.l!.toFixed(4)} C ${so.c!.toFixed(4)} H ${so.h!.toFixed(1)}`);
console.log(`dE2000 from --text-muted ${dE(parse(dot)!, parse(base['--text-muted']!)!).toFixed(2)}, from --text-secondary ${dE(parse(dot)!, parse(base['--text-secondary']!)!).toFixed(2)}, from --status-working ${dE(parse(dot)!, parse(base['--status-working']!)!).toFixed(2)}`);
console.log(`Y dot ${relLum(dot).toFixed(5)}  Y --text-muted ${relLum(base['--text-muted']!).toFixed(5)}`);
console.log(`on canvas: dot ${ratio(dot, base['--bg-canvas']!).toFixed(3)}  muted ${ratio(base['--text-muted']!, base['--bg-canvas']!).toFixed(3)}`);

// The lightest offered active fill, and the Y a fixed colour needs on it.
const REG: Record<number, [number, number]> = { [-4]: [1, 3], [-3]: [-2, 3], [-2]: [-3, 3], [-1]: [-3, 2], 0: [-3, 1], 1: [-3, 0], 2: [-3, 0] };
let maxY = -1, maxHex = '', maxAt = '', minY = 2, minHex = '', minAt = '';
const worstOf: Record<string, { r: number; at: string }> = {};
for (const f of ['--status-idle', '--status-exited', '--status-working', '--status-attention', '--status-failed']) worstOf[f] = { r: Infinity, at: '' };
for (const s of Object.keys(REG).map(Number)) { const [lo, hi] = REG[s]!; for (let d = lo; d <= hi; d += 1) for (const hs of ['blue', 'teal', 'purple', 'slate']) for (const lv of ['normal', 'raised', 'high']) for (let h = 0; h < 360; h += 1) {
  const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: s, chromeDepth: d }, base);
  const bg = o['--bg-active'] ?? base['--bg-active']!;
  const y = relLum(bg);
  if (y > maxY) { maxY = y; maxHex = bg; maxAt = `shade ${s} depth ${d} hue ${h} ${lv}/${hs}`; }
  if (y < minY) { minY = y; minHex = bg; minAt = `shade ${s} depth ${d} hue ${h} ${lv}/${hs}`; }
  for (const f of Object.keys(worstOf)) { const r = ratio(o[f] ?? base[f]!, bg); if (r < worstOf[f]!.r) { worstOf[f] = { r, at: `shade ${s} depth ${d} hue ${h} ${lv}/${hs}` }; } }
} }
console.log(`lightest offered --bg-active ${maxHex} Y ${maxY.toFixed(5)} at ${maxAt}`);
console.log(`darkest  offered --bg-active ${minHex} Y ${minY.toFixed(5)} at ${minAt}`);
console.log(`a fixed colour needs Y >= ${(3 * (maxY + 0.05) - 0.05).toFixed(5)} to clear 3:1 on that lightest fill`);
for (const [f, w] of Object.entries(worstOf)) console.log(`worst ${f.padEnd(20)} ${w.r.toFixed(3)} at ${w.at}`);
