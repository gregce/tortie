import { readFileSync } from 'node:fs';
import { solveLanes, reportLanes } from './lane-solve.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { differenceCiede2000 } = require('culori');
const dE = differenceCiede2000();

const css = readFileSync('/private/tmp/wt-p214/src/renderer/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blockOf = (h) => { const s = css.indexOf(h); const e = css.indexOf('\n}', s); return css.slice(s + h.length, e); };
function decls(t, into = new Map()) { const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g; for (let m = re.exec(t); m; m = re.exec(t)) into.set(m[1], m[2].trim()); return into; }
function resolveVars(map) { for (let i = 0; i < 6; i += 1) { let ch = false; for (const [k, v] of map) { const n = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r) => map.get(r) ?? w); if (n !== v) { map.set(k, n); ch = true; } } if (!ch) break; } return map; }
const light = resolveVars(decls(blockOf(":root[data-scheme='light'] {"), decls(blockOf(':root {'))));
const LANES = ['--graph-lane-1', '--graph-lane-2', '--graph-lane-3', '--graph-lane-4', '--graph-lane-5', '--graph-lane-6'].map((t) => light.get(t));
// The three row grounds AS THEY SHIP, and the DARKEST selected row each
// candidate region reaches, from build/p214/out-grounds-depth0.txt.
const SHIPPED_GROUNDS = ['#edeff3', '#e5e7ed', '#d9dce3'];
const DARKEST_ACTIVE = { 0: '#d5cdd1', '-1': '#cdc5c9', '-2': '#c5bdc1', '-3': '#bdb5b9', '-4': '#b5adb1' };

reportLanes('the shipped light lanes (the parent)', LANES, SHIPPED_GROUNDS);

for (const target of ['0', '-1', '-2', '-4']) {
  const grounds = [...SHIPPED_GROUNDS, DARKEST_ACTIVE[target]];
  for (const identity of [12, 18, 26]) {
    const r = solveLanes(LANES, grounds, { hueSpan: 10, identity, floor: 3.05 });
    console.log(`\n### solved for the region whose darkest selected row is ${DARKEST_ACTIVE[target]} (shade ${target}), identity cap dE2000 ${identity}`);
    console.log(`candidates per lane: ${r.options.join(' ')}`);
    reportLanes(`solved lanes, shade ${target}, identity ${identity}`, r.lanes, grounds);
    console.log(`moved: ${r.lanes.map((h, i) => `${i + 1}:${LANES[i]}->${h} dE${dE(LANES[i], h).toFixed(1)}`).join('  ')}`);
  }
}
