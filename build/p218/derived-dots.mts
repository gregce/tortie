/** Phase 218's FIX ROUND. Does the derivation MOVE any status token, and at which settings? */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const repoRoot = '/private/tmp/wt-p218';
function rd(css: string) { const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; } return d; }
function block(css: string) { const i = css.indexOf(':root {'); const c = css.indexOf('}', i + 7); return css.slice(i + 7, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const decls = rd(block(css));
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const deriveOverrides = derive.deriveOverrides as any;
const MARKS = ['--status-idle', '--status-exited', '--status-working', '--status-attention', '--status-failed'];
const base: Record<string, string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), ...MARKS]) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
const seen = new Map<string, Set<string>>(); for (const m of MARKS) seen.set(m, new Set());
const region = presets.FRAME_REGION as { shade: number; minDepth: number; maxDepth: number }[];
for (const row of region) for (let d = row.minDepth; d <= row.maxDepth; d += 1)
  for (const lv of ['normal', 'raised', 'high']) for (const hs of ['blue', 'teal', 'purple', 'slate'])
    for (let h = 0; h < 360; h += 1) {
      const o = deriveOverrides({ highlightScheme: hs, contrastLevel: lv, chromeHue: h, chromeShade: row.shade, chromeDepth: d }, base);
      for (const m of MARKS) seen.get(m)!.add(o[m] ?? base[m]!);
    }
for (const m of MARKS) { const s = [...seen.get(m)!]; console.log(`${m.padEnd(20)} base ${base[m]}  ->  ${s.length} distinct derived value${s.length === 1 ? '' : 's'}: ${s.slice(0, 6).join(' ')}${s.length > 6 ? ' …' : ''}`); }
// is --status-idle in ALL_THEME_TOKENS at all?
console.log(`\nin ALL_THEME_TOKENS: ${MARKS.map((m) => `${m}=${(presets.ALL_THEME_TOKENS as string[]).includes(m)}`).join(' ')}`);
