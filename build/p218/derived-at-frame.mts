/** Phase 218's FIX ROUND. What is PAINTED for --status-failed at the idle's binding frame, and at (2,0)? */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
const toRgb = converter('rgb');
function relLum(css: string) { const c = toRgb(parse(css)!)!; const f = (v: number) => { const s = Math.round(v * 255) / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
const ratio = (a: string, b: string) => { const x = relLum(a), y = relLum(b); return x > y ? (x + 0.05) / (y + 0.05) : (y + 0.05) / (x + 0.05); };
function rd(css: string) { const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; } return d; }
function block(css: string) { const i = css.indexOf(':root {'); const c = css.indexOf('}', i + 7); return css.slice(i + 7, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const decls = rd(block(css));
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const base: Record<string, string> = {};
for (const t of presets.ALL_THEME_TOKENS as string[]) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
for (const [s, d, h] of [[-2, 3, 63], [2, 0, 63], [2, 0, 65]] as const) {
  const o = deriveOverrides({ highlightScheme: 'blue', contrastLevel: 'high', chromeHue: h, chromeShade: s, chromeDepth: d }, base);
  const fill = o['--bg-active'] ?? base['--bg-active']!;
  const failedPainted = o['--status-failed'] ?? base['--status-failed']!;
  console.log(`shade ${String(s).padStart(2)} depth ${d} high hue ${h}  fill ${fill}  --status-failed base ${base['--status-failed']} PAINTED ${failedPainted}  ratio(base) ${ratio(base['--status-failed']!, fill).toFixed(3)}  ratio(PAINTED) ${ratio(failedPainted, fill).toFixed(3)}  idle ${ratio(o['--status-idle'] ?? base['--status-idle']!, fill).toFixed(3)}`);
}
