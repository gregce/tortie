import { readFileSync } from 'node:fs';
import { solveLanes, reportLanes } from './lane-solve.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { differenceCiede2000, converter, parse } = require('culori');
const dE = differenceCiede2000();
const toOklch = converter('oklch');

const css = readFileSync('/private/tmp/wt-p214/src/renderer/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blockOf = (h) => { const s = css.indexOf(h); const e = css.indexOf('\n}', s); return css.slice(s + h.length, e); };
function decls(t, into = new Map()) { const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g; for (let m = re.exec(t); m; m = re.exec(t)) into.set(m[1], m[2].trim()); return into; }
function resolveVars(map) { for (let i = 0; i < 6; i += 1) { let ch = false; for (const [k, v] of map) { const n = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r) => map.get(r) ?? w); if (n !== v) { map.set(k, n); ch = true; } } if (!ch) break; } return map; }
const light = resolveVars(decls(blockOf(":root[data-scheme='light'] {"), decls(blockOf(':root {'))));
const SHIPPED = ['--graph-lane-1', '--graph-lane-2', '--graph-lane-3', '--graph-lane-4', '--graph-lane-5', '--graph-lane-6'].map((t) => light.get(t));
const SHIPPED_GROUNDS = ['#edeff3', '#e5e7ed', '#d9dce3'];
// The accent value each candidate row solve produced, from run-solve.
const ACCENT = { '0': '#2175bd', '-1': '#1b70b8', '-2': '#116ab2', '-3': '#0464ab', '-4': '#005ea2' };
const DARKEST_ACTIVE = { '0': '#d5cdd1', '-1': '#cdc5c9', '-2': '#c5bdc1', '-3': '#bdb5b9', '-4': '#b5adb1' };

for (const target of ['0', '-1', '-2', '-3', '-4']) {
  const start = [ACCENT[target], ...SHIPPED.slice(1)];
  const grounds = [...SHIPPED_GROUNDS, DARKEST_ACTIVE[target]];
  // Lane 1 is the accent, already fixed by the headroom solve, so it is frozen.
  // Lanes 2, 4 and 6 alias git decorations a person reads in the file tree, so
  // they move least; lanes 3 and 5 are literals of the graph alone.
  const r = solveLanes(start, grounds, {
    hueSpan: 12,
    perLaneIdentity: [0, 9, 22, 9, 22, 9],
    frozen: [0],
    floor: 3.06,
    ceiling: 8,
    shippedActive: '#d9dce3'
  });
  console.log(`\n\n======== shade ${target}: accent ${ACCENT[target]}, darkest selected row ${DARKEST_ACTIVE[target]} ========`);
  console.log(`candidates per lane: ${r.options.join(' ')}`);
  reportLanes(`solved`, r.lanes, grounds);
  console.log('lane  shipped  solved   dE2000  OKLCH');
  for (let i = 0; i < 6; i += 1) {
    const o = toOklch(parse(r.lanes[i]));
    const s0 = toOklch(parse(SHIPPED[i]));
    console.log(`  ${i + 1}   ${SHIPPED[i]}  ${r.lanes[i]}  ${dE(SHIPPED[i], r.lanes[i]).toFixed(1).padStart(5)}   L ${s0.l.toFixed(3)}->${o.l.toFixed(3)} C ${s0.c.toFixed(3)}->${o.c.toFixed(3)} H ${(s0.h ?? 0).toFixed(0)}->${(o.h ?? 0).toFixed(0)}`);
  }
}
