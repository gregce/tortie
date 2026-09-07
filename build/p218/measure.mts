/**
 * Phase 218 measure step. Runs the SHIPPING derivation over the offered
 * region on both bases and reports what --status-idle / --status-exited read
 * on --bg-active. Spawns nothing, launches no Electron, reads nothing under
 * the person's home.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse, wcagContrast, differenceEuclidean } from 'culori';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const toOklab = converter('oklab');

function readDeclarations(css: string): Map<string, string> {
  const decls = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) {
    const name = m[1]; const value = m[2];
    if (name === undefined || value === undefined) continue;
    decls.set(name, value.replace(/\s+/g, ' ').trim());
  }
  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    for (const [name, value] of decls) {
      const next = value.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r: string) => decls.get(r) ?? w);
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
const tokensPath = resolve(repoRoot, 'src', 'renderer', 'styles', 'tokens.css');
const tokensCss = readFileSync(tokensPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function declarationsFor(scheme: 'dark' | 'light'): Map<string, string> {
  if (scheme === 'dark') return readDeclarations(schemeBlock(tokensCss, 'dark'));
  return readDeclarations(`${schemeBlock(tokensCss, 'dark')}\n${schemeBlock(tokensCss, 'light')}`);
}

const derive = await import(resolve(repoRoot, 'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot, 'src/renderer/theme/presets.ts'));
const deriveOverrides = derive.deriveOverrides as (
  a: { highlightScheme: string; contrastLevel: string; chromeHue: number; chromeShade?: number; chromeDepth?: number },
  base: Record<string, string>
) => Record<string, string>;
const frameRegionFor = presets.frameRegionFor as (s: string) => { shade: number; minDepth: number; maxDepth: number }[];
const ALL = presets.ALL_THEME_TOKENS as string[];

const EXTRA = ['--status-idle', '--status-exited', '--status-working', '--status-attention',
  '--status-failed', '--status-attention-badge-bg', '--status-attention-badge-fg',
  '--text-muted', '--text-secondary', '--bg-active', '--bg-raised', '--bg-surface',
  '--bg-canvas', '--bg-sidebar'];

function baseFor(scheme: 'dark' | 'light'): Record<string, string> {
  const d = declarationsFor(scheme);
  const base: Record<string, string> = {};
  for (const t of [...ALL, ...EXTRA]) { const v = d.get(t); if (v !== undefined) base[t] = v; }
  return base;
}

const lumCache = new Map<string, number>();
function ratio(fg: string, bg: string): number {
  const key = `${fg}|${bg}`;
  let v = lumCache.get(key);
  if (v === undefined) { v = wcagContrast(parse(fg)!, parse(bg)!); lumCache.set(key, v); }
  return v;
}

const CONTRASTS = ['normal', 'raised', 'high'] as const;
const SCHEMES = ['blue', 'teal', 'purple', 'slate'] as const;

interface Cell { shade: number; depth: number; worst: number; worstHue: number; worstContrast: string; worstScheme: string; underAt: string[] }

function walk(scheme: 'dark' | 'light', token: string, ground: string, schemes: readonly string[] = ['blue']) {
  const base = baseFor(scheme);
  const region = frameRegionFor(scheme);
  const cells: Cell[] = [];
  for (const row of region) {
    for (let depth = row.minDepth; depth <= row.maxDepth; depth += 1) {
      const cell: Cell = { shade: row.shade, depth, worst: Infinity, worstHue: -1, worstContrast: '', worstScheme: '', underAt: [] };
      const under = new Set<string>();
      for (const hs of schemes) for (const contrast of CONTRASTS) {
        let cWorst = Infinity;
        for (let h = 0; h < 360; h += 1) {
          const o = deriveOverrides({ highlightScheme: hs, contrastLevel: contrast, chromeHue: h, chromeShade: row.shade, chromeDepth: depth }, base);
          const fg = o[token] ?? base[token]!;
          const bg = o[ground] ?? base[ground]!;
          const r = ratio(fg, bg);
          if (r < cWorst) cWorst = r;
          if (r < cell.worst) { cell.worst = r; cell.worstHue = h; cell.worstContrast = contrast; cell.worstScheme = hs; }
        }
        if (cWorst < 3) under.add(contrast);
      }
      cell.underAt = [...under];
      cells.push(cell);
    }
  }
  return cells;
}

function report(title: string, cells: Cell[]) {
  console.log(`\n=== ${title} ===`);
  console.log('shade depth  worst   at hue / level / scheme   under3-at');
  for (const c of cells) {
    console.log(
      `${String(c.shade).padStart(5)} ${String(c.depth).padStart(5)}  ${c.worst.toFixed(3)}  ` +
      `hue ${String(c.worstHue).padStart(3)} ${c.worstContrast.padEnd(6)} ${c.worstScheme.padEnd(7)} ` +
      `${c.worst < 3 ? 'UNDER' : '  ok '} ${c.underAt.join(',')}`
    );
  }
  const total = cells.length;
  const underNormal = cells.filter((c) => c.underAt.includes('normal')).length;
  const underAny = cells.filter((c) => c.underAt.length > 0).length;
  const worst = cells.reduce((a, b) => (b.worst < a.worst ? b : a));
  console.log(`cells=${total} underNormal=${underNormal} underAny=${underAny}`);
  console.log(`WORST overall ${worst.worst.toFixed(3)} at shade ${worst.shade} depth ${worst.depth} hue ${worst.worstHue} ${worst.worstContrast} ${worst.worstScheme}`);
  // worst at normal specifically
  return { total, underNormal, underAny, worst };
}

const args = process.argv.slice(2);
const mode = args[0] ?? 'all';

if (mode === 'all' || mode === 'dark') {
  const baseDark = baseFor('dark');
  console.log('shipped dark --status-idle', baseDark['--status-idle'], 'on --bg-active', baseDark['--bg-active'],
    '=>', ratio(baseDark['--status-idle']!, baseDark['--bg-active']!).toFixed(4));
  console.log('shipped dark --status-exited', baseDark['--status-exited'], '=>',
    ratio(baseDark['--status-exited']!, baseDark['--bg-active']!).toFixed(4));
  const cells = walk('dark', '--status-idle', '--bg-active');
  report('DARK, --status-idle on --bg-active, blue scheme, whole degrees, 3 levels', cells);
  // per-level worst
  for (const level of CONTRASTS) {
    let w = Infinity, ws = 0, wd = 0, wh = -1;
    const base = baseFor('dark');
    for (const row of frameRegionFor('dark')) for (let depth = row.minDepth; depth <= row.maxDepth; depth += 1)
      for (let h = 0; h < 360; h += 1) {
        const o = deriveOverrides({ highlightScheme: 'blue', contrastLevel: level, chromeHue: h, chromeShade: row.shade, chromeDepth: depth }, base);
        const r = ratio(o['--status-idle'] ?? base['--status-idle']!, o['--bg-active'] ?? base['--bg-active']!);
        if (r < w) { w = r; ws = row.shade; wd = depth; wh = h; }
      }
    console.log(`  worst at ${level}: ${w.toFixed(3)} shade ${ws} depth ${wd} hue ${wh}`);
  }
}

if (mode === 'all' || mode === 'light') {
  const baseLight = baseFor('light');
  console.log('\nshipped light --status-idle', baseLight['--status-idle'], 'on --bg-active', baseLight['--bg-active'],
    '=>', ratio(baseLight['--status-idle']!, baseLight['--bg-active']!).toFixed(4));
  console.log('shipped light --status-exited', baseLight['--status-exited'], '=>',
    ratio(baseLight['--status-exited']!, baseLight['--bg-active']!).toFixed(4));
  const cells = walk('light', '--status-idle', '--bg-active');
  report('LIGHT, --status-idle on --bg-active, blue scheme', cells);
}
