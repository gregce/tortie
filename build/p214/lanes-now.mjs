/**
 * P214 measure THREE, part two: the SHIPPED lanes of both bases under three
 * deficiencies, at six live lanes in one row, which is all fifteen pairs.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { hexToRgb, simulateVienot3, simulateMachado, sep, luminance } from './cvd.mjs';
const require = createRequire(import.meta.url);
const { wcagContrast, differenceCiede2000, converter, parse } = require('culori');
const dE = differenceCiede2000();
const toOklch = converter('oklch');

const css = readFileSync('/private/tmp/wt-p214/src/renderer/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blockOf = (h) => { const s = css.indexOf(h); const e = css.indexOf('\n}', s); return css.slice(s + h.length, e); };
function decls(t, into = new Map()) { const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g; for (let m = re.exec(t); m; m = re.exec(t)) into.set(m[1], m[2].trim()); return into; }
function resolveVars(map) { for (let i = 0; i < 6; i += 1) { let ch = false; for (const [k, v] of map) { const n = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r) => map.get(r) ?? w); if (n !== v) { map.set(k, n); ch = true; } } if (!ch) break; } return map; }
const dark = resolveVars(decls(blockOf(':root {')));
const light = resolveVars(decls(blockOf(":root[data-scheme='light'] {"), decls(blockOf(':root {'))));
const LANES = ['--graph-lane-1', '--graph-lane-2', '--graph-lane-3', '--graph-lane-4', '--graph-lane-5', '--graph-lane-6'];
const NAMES = ['1 blue/accent', '2 red/deleted', '3 cyan', '4 orange/conflict', '5 violet', '6 green/added'];
const GROUNDS = { dark: ['#0e0f13', '#202329', '#252931'], light: ['#edeff3', '#e5e7ed', '#d9dce3'] };

export function report(name, hexes, grounds) {
  console.log(`\n## ${name}`);
  console.log('lane                 hex      Y      OKLCH L  C     H     worst ratio on its three row grounds');
  for (const [i, hex] of hexes.entries()) {
    const o = toOklch(parse(hex));
    const worst = Math.min(...grounds.map((g) => wcagContrast(hex, g)));
    console.log(`${NAMES[i].padEnd(20)} ${hex}  ${luminance(hexToRgb(hex)).toFixed(4)}  ${o.l.toFixed(3)}  ${o.c.toFixed(3)} ${(o.h ?? 0).toFixed(0).padStart(3)}   ${worst.toFixed(2)}`);
  }
  const rows = [];
  for (let i = 0; i < hexes.length; i += 1) {
    for (let j = i + 1; j < hexes.length; j += 1) {
      const a = hexToRgb(hexes[i]);
      const b = hexToRgb(hexes[j]);
      rows.push({
        pair: `${i + 1}-${j + 1}`,
        p: sep(a, b, simulateVienot3, 'protan'),
        d: sep(a, b, simulateVienot3, 'deutan'),
        t: sep(a, b, simulateVienot3, 'tritan'),
        mp: sep(a, b, simulateMachado, 'protan'),
        md: sep(a, b, simulateMachado, 'deutan'),
        mt: sep(a, b, simulateMachado, 'tritan'),
        e: dE(hexes[i], hexes[j])
      });
    }
  }
  rows.sort((x, y) => Math.min(x.p, x.d, x.t) - Math.min(y.p, y.d, y.t));
  console.log('\npair  protan deutan tritan | Machado p/d/t      dE2000   (threshold 32)');
  for (const r of rows) {
    const w = Math.min(r.p, r.d, r.t);
    console.log(
      `${r.pair.padEnd(5)} ${r.p.toFixed(1).padStart(6)} ${r.d.toFixed(1).padStart(6)} ${r.t.toFixed(1).padStart(6)} | ${r.mp.toFixed(1).padStart(5)} ${r.md.toFixed(1).padStart(5)} ${r.mt.toFixed(1).padStart(5)}   ${r.e.toFixed(1).padStart(5)}  ${w < 32 ? '  WEAK' : ''}`
    );
  }
  const worst = rows[0];
  console.log(`worst pair ${worst.pair} at ${Math.min(worst.p, worst.d, worst.t).toFixed(1)} (protan ${worst.p.toFixed(1)}, deutan ${worst.d.toFixed(1)}, tritan ${worst.t.toFixed(1)})`);
  const worstP = rows.slice().sort((x, y) => x.p - y.p)[0];
  console.log(`worst under protanopia alone: ${worstP.pair} at ${worstP.p.toFixed(1)}`);
  return rows;
}

report('the LIGHT base as it ships (the parent, c49a57d)', LANES.map((l) => light.get(l)), GROUNDS.light);
report('the DARK base as it ships, for the comparison', LANES.map((l) => dark.get(l)), GROUNDS.dark);
