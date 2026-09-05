import { readFileSync } from 'node:fs';
import { optionsFor, solve, pairSep, worstOf, sims } from './lane-solve2.mjs';
import { hexToRgb, simulateVienot3, simulateMachado, sep } from './cvd.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { differenceCiede2000, converter, parse, wcagContrast } = require('culori');
const dE = differenceCiede2000();
const toOklch = converter('oklch');

const css = readFileSync('/private/tmp/wt-p214/src/renderer/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blockOf = (h) => { const s = css.indexOf(h); const e = css.indexOf('\n}', s); return css.slice(s + h.length, e); };
function decls(t, into = new Map()) { const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g; for (let m = re.exec(t); m; m = re.exec(t)) into.set(m[1], m[2].trim()); return into; }
function resolveVars(map) { for (let i = 0; i < 6; i += 1) { let ch = false; for (const [k, v] of map) { const n = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r) => map.get(r) ?? w); if (n !== v) { map.set(k, n); ch = true; } } if (!ch) break; } return map; }
const light = resolveVars(decls(blockOf(":root[data-scheme='light'] {"), decls(blockOf(':root {'))));
const SHIPPED = ['--graph-lane-1','--graph-lane-2','--graph-lane-3','--graph-lane-4','--graph-lane-5','--graph-lane-6'].map((t) => light.get(t));
const G = ['#edeff3', '#e5e7ed', '#d9dce3'];
const ACCENT = { '0': '#2175bd', '-1': '#1b70b8', '-2': '#116ab2', '-3': '#0464ab', '-4': '#005ea2' };
const ACTIVE = { '0': '#d5cdd1', '-1': '#cdc5c9', '-2': '#c5bdc1', '-3': '#bdb5b9', '-4': '#b5adb1' };

function show(tag, lanes, grounds) {
  const rows = [];
  for (let i = 0; i < 6; i += 1) for (let j = i + 1; j < 6; j += 1) {
    const a = hexToRgb(lanes[i]), b = hexToRgb(lanes[j]);
    rows.push({
      pair: `${i + 1}-${j + 1}`,
      p: sep(a, b, simulateVienot3, 'protan'), d: sep(a, b, simulateVienot3, 'deutan'), t: sep(a, b, simulateVienot3, 'tritan'),
      mp: sep(a, b, simulateMachado, 'protan'), md: sep(a, b, simulateMachado, 'deutan'), mt: sep(a, b, simulateMachado, 'tritan'),
      all: pairSep(lanes[i], lanes[j])
    });
  }
  rows.sort((x, y) => x.all - y.all);
  const wp = rows.slice().sort((x, y) => x.p - y.p)[0];
  const wpd = rows.slice().sort((x, y) => Math.min(x.p, x.d) - Math.min(y.p, y.d))[0];
  console.log(`${tag}`);
  console.log(`  lanes ${lanes.join(' ')}`);
  console.log(`  WCAG worst per lane on its grounds: ${lanes.map((h) => Math.min(...grounds.map((g) => wcagContrast(h, g))).toFixed(2)).join(' ')}`);
  console.log(`  worst pair protanopia only        ${wp.pair} at ${wp.p.toFixed(1)}`);
  console.log(`  worst pair protan+deutan (tree)   ${wpd.pair} at ${Math.min(wpd.p, wpd.d).toFixed(1)}`);
  console.log(`  worst pair over six models        ${rows[0].pair} at ${rows[0].all.toFixed(1)}  (Vienot p ${rows[0].p.toFixed(1)} d ${rows[0].d.toFixed(1)} t ${rows[0].t.toFixed(1)}; Machado ${rows[0].mp.toFixed(1)} ${rows[0].md.toFixed(1)} ${rows[0].mt.toFixed(1)})`);
  console.log(`  three tightest pairs: ${rows.slice(0, 3).map((r) => `${r.pair}=${r.all.toFixed(1)}`).join(', ')}`);
  console.log(`  moved: ${lanes.map((h, i) => `${i + 1}:dE${dE(SHIPPED[i], h).toFixed(1)}`).join(' ')}`);
}

show('## the shipped light lanes (the parent, c49a57d)', SHIPPED, G);
console.log('');
for (const target of ['0', '-1', '-2', '-3', '-4']) {
  const grounds = [...G, ACTIVE[target]];
  const start = [ACCENT[target], ...SHIPPED.slice(1)];
  const caps = [0, 9, 22, 9, 22, 9];
  const opts = start.map((hex, i) => (i === 0 ? [hex] : optionsFor(hex, {
    hueSpan: 14, grounds, floor: 3.06, ceiling: 8, shippedActive: '#d9dce3', identity: caps[i]
  })));
  const r = solve(start, opts, 24);
  show(`## darkest offered shade ${target} (accent ${ACCENT[target]}, darkest selected row ${ACTIVE[target]}), option counts ${opts.map((o) => o.length).join('/')}`, r.lanes, grounds);
  // And with the identity caps relaxed, to say whether the wall is the caps
  // or the paper.
  const caps2 = [0, 18, 34, 18, 34, 18];
  const opts2 = start.map((hex, i) => (i === 0 ? [hex] : optionsFor(hex, {
    hueSpan: 22, grounds, floor: 3.06, ceiling: 9, shippedActive: '#d9dce3', identity: caps2[i]
  })));
  const r2 = solve(start, opts2, 24);
  show(`   with the identity caps relaxed to dE ${caps2.slice(1).join('/')} and hue span 22`, r2.lanes, grounds);
  console.log('');
}
