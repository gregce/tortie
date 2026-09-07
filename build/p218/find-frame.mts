/**
 * Phase 218, the app run's diagnostic. Which frame gives the `--bg-active`
 * the probe read? Runs the SHIPPING derivation and nothing else. Spawns
 * nothing, launches no Electron, reads nothing under the person's home.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const css = readFileSync(resolve(repoRoot, 'src/renderer/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function block(head: string): Record<string, string> {
  const i = css.indexOf(head);
  const seg = css.slice(i + head.length, css.indexOf('}', i));
  const out: Record<string, string> = {};
  for (const m of seg.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}
const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const deriveOverrides = derive.deriveOverrides as (a: Record<string, unknown>, b: Record<string, string>) => Record<string, string>;
const base = block(':root {');
const want = (process.argv[2] ?? '#2a2f37').toLowerCase();
console.log('shipped --bg-active =', base['--bg-active']);
for (const hue of [222]) for (const shade of [-4,-3,-2,-1,0,1,2]) for (const depth of [-3,-2,-1,0,1,2,3])
for (const contrastLevel of ['normal','raised','high']) for (const highlightScheme of ['blue','teal','purple','slate']) {
  const o = deriveOverrides({ chromeHue: hue, chromeShade: shade, chromeDepth: depth, contrastLevel, highlightScheme }, base);
  if ((o['--bg-active'] ?? base['--bg-active']!).toLowerCase() === want) console.log('MATCH', { hue, shade, depth, contrastLevel, highlightScheme });
}
