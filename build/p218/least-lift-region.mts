/** Phase 218's FIX ROUND. Does the region survive at the TRUE minimum lift? */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const repoRoot = '/private/tmp/wt-p218';
function rd(css: string) { const d = new Map<string, string>(); const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim());
  for (let p = 0; p < 5; p += 1) { let ch = false; for (const [n, v] of d) { const nx = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => d.get(r) ?? w); if (nx !== v) { d.set(n, nx); ch = true; } } if (!ch) break; } return d; }
function block(css: string) { const i = css.indexOf(':root {'); const c = css.indexOf('}', i + 7); return css.slice(i + 7, c); }
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const decls = rd(block(css));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const stops = await import(resolve(repoRoot, 'src/renderer/theme/frame-stops.ts'));
const frameFailure = stops.frameFailure as any;

const dot = process.argv[2] ?? '#858c9a';
const base: Record<string, string> = {};
for (const t of presets.ALL_THEME_TOKENS as string[]) { const v = decls.get(t); if (v !== undefined) base[t] = v; }
base['--status-idle'] = dot; base['--status-exited'] = dot;

const rows: string[] = [];
let cells = 0;
for (let shade = -4; shade <= 2; shade += 1) {
  const ok: number[] = [];
  for (let depth = -3; depth <= 3; depth += 1) {
    let good = true;
    outer: for (const lv of ['normal', 'raised', 'high'] as const) {
      for (let h = 0; h < 360 && good; h += 1) {
        if (frameFailure({ highlightScheme: 'blue', contrastLevel: lv, scheme: 'dark' }, base, { chromeHue: h, chromeShade: shade, chromeDepth: depth }) !== null) { good = false; break outer; }
      }
      for (const hs of ['teal', 'purple', 'slate'] as const) {
        for (let h = 0; h < 360 && good; h += 15) {
          if (frameFailure({ highlightScheme: hs, contrastLevel: lv, scheme: 'dark' }, base, { chromeHue: h, chromeShade: shade, chromeDepth: depth }) !== null) { good = false; break outer; }
        }
      }
    }
    if (good) { ok.push(depth); cells += 1; }
  }
  if (ok.length > 0) rows.push(`${shade}:[${ok[0]}..${ok[ok.length - 1]}]${ok.length === ok[ok.length - 1]! - ok[0]! + 1 ? '' : ' NONCONTIGUOUS'}`);
}
console.log(`dot ${dot}  ->  ${cells} cells   ${rows.join('  ')}`);
console.log(`pinned FRAME_REGION: ${(presets.FRAME_REGION as any[]).map((r) => `${r.shade}:[${r.minDepth}..${r.maxDepth}]`).join('  ')}`);
