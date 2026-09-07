/** Phase 218's FIX ROUND. Where do the unpinned status colours read their worst, and what do they read at the idle's binding frame? */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
const toRgb = converter('rgb');
function relLum(css: string) { const c = toRgb(parse(css)!)!; const f = (v: number) => { const s = Math.round(v * 255) / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
function ratio(a: string, b: string) { const x = relLum(a), y = relLum(b); return x > y ? (x + 0.05) / (y + 0.05) : (y + 0.05) / (x + 0.05); }
function rd(css: string) { const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; } return d; }
function block(css: string, which: number) { let i = -1; for (let k = 0; k <= which; k += 1) i = css.indexOf(':root', i + 1); const o = css.indexOf('{', i); const c = css.indexOf('}', o); return css.slice(o + 1, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const decls = rd(block(css, 0));
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const base: Record<string, string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), '--status-idle', '--status-exited', '--status-failed', '--status-working', '--status-attention']) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
const region = presets.FRAME_REGION as { shade: number; minDepth: number; maxDepth: number }[];
const marks = ['--status-idle', '--status-failed', '--status-working', '--status-attention'] as const;
type Best = { r: number; shade: number; depth: number; lv: string; hs: string; hue: number; fill: string };
const worst = new Map<string, Best>();
const AT: Record<string, number> = {};
for (const row of region) for (let d = row.minDepth; d <= row.maxDepth; d += 1)
  for (const lv of ['normal', 'raised', 'high']) for (const hs of ['blue', 'teal', 'purple', 'slate'])
    for (let h = 0; h < 360; h += 1) {

      const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: row.shade, chromeDepth: d }, base);
      const fill = o['--bg-active'] ?? base['--bg-active']!;
      for (const m of marks) {
        const r = ratio(o[m] ?? base[m]!, fill);
        const cur = worst.get(m);
        if (cur === undefined || r < cur.r) worst.set(m, { r, shade: row.shade, depth: d, lv, hs, hue: h, fill });
        if (row.shade === -2 && d === 3 && lv === 'high' && hs === 'blue' && h === 63) AT[m] = r;
      }
    }
console.log('token                worst   at (shade,depth,level,scheme,hue)         fill      | at the idle binding frame (-2,3,high,blue,63)');
for (const m of marks) { const w = worst.get(m)!; console.log(`${m.padEnd(20)} ${w.r.toFixed(3)}   (${w.shade},${w.depth},${w.lv},${w.hs},${w.hue})`.padEnd(64) + `${w.fill}  | ${AT[m]!.toFixed(3)}`); }
// every offered frame whose fill IS the idle's binding fill, for --status-failed
const idle = worst.get('--status-idle')!;
const same: string[] = [];
for (const row of region) for (let d = row.minDepth; d <= row.maxDepth; d += 1)
  for (const lv of ['normal', 'raised', 'high']) for (let h = 0; h < 360; h += 1) {
    const o = deriveOverrides({ highlightScheme: 'blue', contrastLevel: lv, chromeHue: h, chromeShade: row.shade, chromeDepth: d }, base);
    if ((o['--bg-active'] ?? base['--bg-active']) === idle.fill) same.push(`(${row.shade},${d},${lv},${h})`);
  }
console.log(`\nthe idle's binding fill ${idle.fill} is reached by ${same.length} offered frames: ${same.slice(0, 8).join(' ')}${same.length > 8 ? ' …' : ''}`);
const wf = worst.get('--status-failed')!;
console.log(`--status-failed's own worst fill is ${wf.fill}${wf.fill === idle.fill ? ' (THE SAME FILL)' : ' (a DIFFERENT fill)'} at a ${wf.shade === idle.shade && wf.depth === idle.depth && wf.lv === idle.lv && wf.hue === idle.hue ? 'same' : 'DIFFERENT'} frame`);
