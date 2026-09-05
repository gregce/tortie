/**
 * The SMALLEST change that fixes it: among lane sets whose worst pair over
 * six models clears TARGET, the one with the least total dE2000 from the
 * shipped light lanes. A palette change is a cost a person pays in
 * recognition, so the phase should pay the least that buys the property.
 */
import { readFileSync } from 'node:fs';
import { optionsFor, pairSep } from './lane-solve2.mjs';
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

function minSep(set) {
  let w = Infinity;
  for (let i = 0; i < set.length; i += 1) for (let j = i + 1; j < set.length; j += 1) {
    const s = pairSep(set[i], set[j]);
    if (s < w) w = s;
  }
  return w;
}
function cost(set) { return set.reduce((sum, h, i) => sum + dE(SHIPPED[i], h), 0); }

function leastChange(start, optionSets, target, restarts = 40, seed = 11) {
  let rng = seed;
  const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
  let best = null;
  for (let r = 0; r < restarts; r += 1) {
    const cur = start.map((h, i) => (r === 0 || optionSets[i].length === 0 ? h : optionSets[i][Math.floor(rand() * optionSets[i].length)]));
    // Phase one: reach the target at all.
    for (let pass = 0; pass < 20; pass += 1) {
      let moved = false;
      for (let i = 0; i < cur.length; i += 1) {
        if (minSep(cur) >= target) break;
        let bh = cur[i], bs = minSep(cur);
        for (const c of optionSets[i]) {
          const t = [...cur]; t[i] = c;
          const s = minSep(t);
          if (s > bs + 1e-9) { bs = s; bh = c; }
        }
        if (bh !== cur[i]) { cur[i] = bh; moved = true; }
      }
      if (!moved || minSep(cur) >= target) break;
    }
    if (minSep(cur) < target) continue;
    // Phase two: walk back toward the shipped colours while staying feasible.
    for (let pass = 0; pass < 20; pass += 1) {
      let moved = false;
      for (let i = 0; i < cur.length; i += 1) {
        let bh = cur[i], bc = dE(SHIPPED[i], cur[i]);
        for (const c of optionSets[i]) {
          const d = dE(SHIPPED[i], c);
          if (d >= bc - 1e-9) continue;
          const t = [...cur]; t[i] = c;
          if (minSep(t) >= target) { bc = d; bh = c; }
        }
        if (bh !== cur[i]) { cur[i] = bh; moved = true; }
      }
      if (!moved) break;
    }
    if (best === null || cost(cur) < cost(best)) best = [...cur];
  }
  return best;
}

for (const target of ['0', '-1', '-2', '-3']) {
  const grounds = [...G, ACTIVE[target]];
  const start = [ACCENT[target], ...SHIPPED.slice(1)];
  const caps = [0, 14, 26, 14, 26, 14];
  const opts = start.map((hex, i) => (i === 0 ? [hex] : optionsFor(hex, {
    hueSpan: 16, grounds, floor: 3.06, ceiling: 7.5, shippedActive: '#d9dce3', identity: caps[i]
  })));
  for (const bar of [36, 40]) {
    const set = leastChange(start, opts, bar);
    if (set === null) { console.log(`\n## shade ${target}, bar ${bar}: NO SET FOUND inside the identity caps`); continue; }
    console.log(`\n## shade ${target}, worst pair must clear ${bar} over six models`);
    console.log(`   lanes ${set.join(' ')}`);
    console.log(`   worst pair ${minSep(set).toFixed(1)}, total dE2000 moved ${cost(set).toFixed(1)}`);
    console.log(`   WCAG per lane on its grounds: ${set.map((h) => Math.min(...grounds.map((g) => wcagContrast(h, g))).toFixed(2)).join(' ')}`);
    for (let i = 0; i < 6; i += 1) {
      const a = toOklch(parse(SHIPPED[i])), b = toOklch(parse(set[i]));
      console.log(`     lane ${i + 1} ${SHIPPED[i]} -> ${set[i]}  dE ${dE(SHIPPED[i], set[i]).toFixed(1).padStart(4)}  L ${a.l.toFixed(3)}->${b.l.toFixed(3)} C ${a.c.toFixed(3)}->${b.c.toFixed(3)} H ${(a.h ?? 0).toFixed(0)}->${(b.h ?? 0).toFixed(0)}`);
    }
  }
}
