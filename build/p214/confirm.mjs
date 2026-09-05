// P214 measure step 0: confirm every number the Phase 214 entry quotes,
// against THIS tree, with arithmetic written here rather than read.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { converter, parse, wcagContrast, wcagLuminance, differenceCiede2000 } = require('culori');
const toOklch = converter('oklch');
const dE = differenceCiede2000();

const css = readFileSync('/private/tmp/wt-p214/src/renderer/styles/tokens.css', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
function block(head) {
  const start = css.indexOf(head);
  if (start === -1) return '';
  const close = css.indexOf('\n}', start);
  return css.slice(start + head.length, close);
}
function decls(text, into = new Map()) {
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) into.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  return into;
}
function resolveVars(map) {
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false;
    for (const [k, v] of map) {
      const next = v.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (w, r) => map.get(r) ?? w);
      if (next !== v) { map.set(k, next); changed = true; }
    }
    if (!changed) break;
  }
  return map;
}
const dark = resolveVars(decls(block(':root {')));
const light = resolveVars(decls(block(":root[data-scheme='light'] {"), decls(block(':root {'))));

const r = (a, b) => wcagContrast(a, b);
const rows = [
  ['--accent-text on --bg-sidebar', r(light.get('--accent-text'), light.get('--bg-sidebar')), 4.69, 4.5],
  ['--accent-text on --bg-canvas', r(light.get('--accent-text'), light.get('--bg-canvas')), 5.03, 4.5],
  ['--status-idle on --bg-active', r(light.get('--status-idle'), light.get('--bg-active')), 3.41, 3.0],
  ['--status-exited on --bg-active', r(light.get('--status-exited'), light.get('--bg-active')), 3.41, 3.0],
  ['--status-failed on --bg-active', r(light.get('--status-failed'), light.get('--bg-active')), 3.40, 3.0],
  ['--status-working on --bg-active', r(light.get('--status-working'), light.get('--bg-active')), 3.52, 3.0],
  ['--status-attention on --bg-active', r(light.get('--status-attention'), light.get('--bg-active')), 3.53, 3.0],
  ['--git-deleted on --bg-active', r(light.get('--git-deleted'), light.get('--bg-active')), 4.43, 3.0],
  ['--git-modified on --bg-active', r(light.get('--git-modified'), light.get('--bg-active')), 5.49, 3.0],
  ['--git-added on --bg-active', r(light.get('--git-added'), light.get('--bg-active')), 6.82, 3.0],
  ['--git-renamed on --bg-active', r(light.get('--git-renamed'), light.get('--bg-active')), 6.85, 3.0],
  ['--git-conflict on --bg-active', r(light.get('--git-conflict'), light.get('--bg-active')), 5.76, 3.0],
  ['--graph-lane-3 on --bg-active', r(light.get('--graph-lane-3'), light.get('--bg-active')), 6.86, 3.0],
  ['--graph-lane-5 on --bg-active', r(light.get('--graph-lane-5'), light.get('--bg-active')), 6.85, 3.0],
  ['--accent on --bg-canvas', r(light.get('--accent'), light.get('--bg-canvas')), 4.5, 3.0],
  ['--text-primary on --bg-canvas', r(light.get('--text-primary'), light.get('--bg-canvas')), 11.26, 4.5],
  ['--text-secondary on --bg-canvas', r(light.get('--text-secondary'), light.get('--bg-canvas')), 7.18, 4.5],
  ['--text-muted on --bg-sidebar', r(light.get('--text-muted'), light.get('--bg-sidebar')), 4.91, 4.5],
  ['--status-attention-badge-fg on bg', r(light.get('--status-attention-badge-fg'), light.get('--status-attention-badge-bg')), 4.51, 4.5]
];
console.log('token/ground                          measured  quoted  floor  headroom');
for (const [name, got, quoted, floor] of rows) {
  const flag = Math.abs(got - quoted) > 0.011 ? '  <-- DRIFT' : '';
  console.log(`${name.padEnd(38)}${got.toFixed(2).padStart(6)}  ${quoted.toFixed(2).padStart(6)} ${floor.toFixed(1).padStart(6)}  ${(got - floor).toFixed(2).padStart(6)}${flag}`);
}
const canvas = light.get('--bg-canvas');
const okc = toOklch(parse(canvas));
console.log(`\n--bg-canvas ${canvas} OKLCH L ${okc.l.toFixed(4)} C ${okc.c.toFixed(4)} H ${(okc.h ?? 0).toFixed(1)}  (quoted L 0.975)`);
for (const t of ['--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-active', '--border', '--border-active', '--border-strong']) {
  const o = toOklch(parse(light.get(t)));
  console.log(`${t.padEnd(16)} ${light.get(t)} L ${o.l.toFixed(4)} C ${o.c.toFixed(4)} H ${(o.h ?? 0).toFixed(1)} Y ${wcagLuminance(light.get(t)).toFixed(4)}`);
}
const lanes = ['--graph-lane-1','--graph-lane-2','--graph-lane-3','--graph-lane-4','--graph-lane-5','--graph-lane-6'];
console.log('\nlanes light:', lanes.map((l) => `${l.slice(-1)}=${light.get(l)}`).join(' '));
console.log('lanes dark :', lanes.map((l) => `${l.slice(-1)}=${dark.get(l)}`).join(' '));
let minc = Infinity, pair = '';
for (let i = 1; i < lanes.length; i += 1) {
  const d = dE(light.get(lanes[i - 1]), light.get(lanes[i]));
  if (d < minc) { minc = d; pair = `${i}-${i + 1}`; }
}
console.log(`min consecutive dE2000 light lanes ${minc.toFixed(1)} at ${pair} (quoted 39.2)`);
