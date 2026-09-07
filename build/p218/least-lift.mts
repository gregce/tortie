/** Phase 218's FIX ROUND. The true minimum lift, re-derived. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, formatHex, parse, differenceCiede2000 } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
const toRgb = converter('rgb'), toOklch = converter('oklch');
const dE = differenceCiede2000();
function relLum(css: string) { const c = toRgb(parse(css)!)!; const f = (v: number) => { const s = Math.round(v * 255) / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
function ratio(a: string, b: string) { const x = relLum(a), y = relLum(b); return x > y ? (x + 0.05) / (y + 0.05) : (y + 0.05) / (x + 0.05); }
function rd(css: string) { const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; } return d; }
function block(css: string) { const i = css.indexOf(':root {'); const c = css.indexOf('}', i + 7); return css.slice(i + 7, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const decls = rd(block(css));
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const stops = await import(resolve(repoRoot, 'src/renderer/theme/frame-stops.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const base: Record<string, string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), '--status-idle', '--status-exited', '--text-muted', '--bg-active']) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
const region = presets.FRAME_REGION as { shade: number; minDepth: number; maxDepth: number }[];

// Every distinct --bg-active over the 35 offered cells, all levels, all schemes, every degree.
const grounds = new Set<string>();
for (const row of region) for (let d = row.minDepth; d <= row.maxDepth; d += 1)
  for (const lv of ['normal', 'raised', 'high']) for (const hs of ['blue', 'teal', 'purple', 'slate'])
    for (let h = 0; h < 360; h += 1) {
      const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: row.shade, chromeDepth: d }, base);
      grounds.add(o['--bg-active'] ?? base['--bg-active']!);
    }
const G = [...grounds];
let lightest = G[0]!; for (const g of G) if (relLum(g) > relLum(lightest)) lightest = g;
console.log(`${G.length} distinct --bg-active over the region; LIGHTEST ${lightest} Y=${relLum(lightest).toFixed(5)}`);
console.log(`minimum passing dot luminance = 3*(Y+0.05)-0.05 = ${(3 * (relLum(lightest) + 0.05) - 0.05).toFixed(5)}`);

const shipped = base['--status-idle']!, muted = base['--text-muted']!;
const sh = toOklch(parse(shipped)!)!;
const worstOf = (hex: string) => { let w = Infinity; for (const g of G) { const r = ratio(hex, g); if (r < w) w = r; } return w; };

// bisect on OKLCH L at the shipped chroma and hue
let lo = 0.5613, hi = 0.6613;
for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; if (worstOf(formatHex({ mode: 'oklch', l: mid, c: sh.c!, h: sh.h! })!) >= 3) hi = mid; else lo = mid; }
const minHex = formatHex({ mode: 'oklch', l: hi, c: sh.c!, h: sh.h! })!;
console.log(`\nTRUE MINIMUM  L ${hi.toFixed(4)}  ${minHex}  worst ${worstOf(minHex).toFixed(4)}  dE2000 vs --text-muted(${muted}) ${dE(parse(minHex)!, parse(muted)!).toFixed(2)}`);
console.log(`SHIPPED       L ${sh.l!.toFixed(4)}  ${shipped}  worst ${worstOf(shipped).toFixed(4)}  dE2000 vs --text-muted ${dE(parse(shipped)!, parse(muted)!).toFixed(2)}`);

// one eight-bit level of headroom: what does +1/255 on the dot buy in ratio?
const near: string[] = [];
for (let l = hi; l <= sh.l! + 1e-9; l += 0.0005) { const h2 = formatHex({ mode: 'oklch', l, c: sh.c!, h: sh.h! })!; if (!near.includes(h2)) near.push(h2); }
console.log('\nevery distinct hex from the minimum to the shipped, with its worst reading and its dE2000 from --text-muted:');
for (const h2 of near) console.log(`  ${h2}  worst ${worstOf(h2).toFixed(4)}  dE ${dE(parse(h2)!, parse(muted)!).toFixed(2)}  L ${toOklch(parse(h2)!)!.l!.toFixed(4)}`);

// What is one eight bit level of the GROUND worth, in ratio, at the binding fill?
// This is the number the "slack a rounding cannot eat" clause was reaching for.
const bindFill = lightest;
const toRgb2 = converter('rgb');
const c0 = toRgb2(parse(bindFill)!)!;
const step = formatHex({ mode: 'rgb', r: Math.min(1, c0.r + 1 / 255), g: Math.min(1, c0.g + 1 / 255), b: Math.min(1, c0.b + 1 / 255) })!;
console.log(`\none eight bit level lighter than the binding fill ${bindFill} is ${step}:`);
console.log(`  the minimum ${minHex} reads ${ratio(minHex, bindFill).toFixed(4)} on ${bindFill} and ${ratio(minHex, step).toFixed(4)} on ${step}  (loses ${(ratio(minHex, bindFill) - ratio(minHex, step)).toFixed(4)})`);
console.log(`  the shipped ${shipped} reads ${ratio(shipped, bindFill).toFixed(4)} on ${bindFill} and ${ratio(shipped, step).toFixed(4)} on ${step}  (loses ${(ratio(shipped, bindFill) - ratio(shipped, step)).toFixed(4)})`);
console.log(`  so the minimum's ${(worstOf(minHex) - 3).toFixed(4)} of slack is smaller than one level of the ground, and the shipped's ${(worstOf(shipped) - 3).toFixed(4)} is about ${Math.round((worstOf(shipped) - 3) / (ratio(minHex, bindFill) - ratio(minHex, step)))} of them.`);
