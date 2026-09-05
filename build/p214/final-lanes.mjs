import { hexToRgb, simulateVienot3, simulateMachado, sep } from './cvd.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { wcagContrast, differenceCiede2000 } = require('culori');
const dE = differenceCiede2000();
const SHIPPED = ['#2175bd', '#b23534', '#004f4e', '#833e00', '#613374', '#00530e'];
const SETS = {
  'shipped (parent c49a57d)': SHIPPED,
  'candidate solved at shade 0 (two-row option)': ['#2175bd', '#b62926', '#004f4e', '#823c00', '#5b3274', '#2c6a3b'],
  'candidate solved at shade -2 (RECOMMENDED)': ['#116ab2', '#c01f20', '#004f4e', '#743100', '#59377b', '#286b32'],
  'candidate solved at shade -3': ['#0464ab', '#bc1827', '#02504e', '#823c00', '#5b3274', '#316938']
};
const G_SHIPPED = ['#edeff3', '#e5e7ed', '#d9dce3'];
const G_DEEP = { 'candidate solved at shade -2 (RECOMMENDED)': '#c5bdc1', 'candidate solved at shade -3': '#bdb5b9', 'candidate solved at shade 0 (two-row option)': '#d5cdd1', 'shipped (parent c49a57d)': '#d5cdd1' };
for (const [name, lanes] of Object.entries(SETS)) {
  const grounds = [...G_SHIPPED, G_DEEP[name]];
  const rows = [];
  for (let i = 0; i < 6; i += 1) for (let j = i + 1; j < 6; j += 1) {
    const a = hexToRgb(lanes[i]), b = hexToRgb(lanes[j]);
    const r = {
      pair: `${i + 1}-${j + 1}`,
      p: sep(a, b, simulateVienot3, 'protan'), d: sep(a, b, simulateVienot3, 'deutan'), t: sep(a, b, simulateVienot3, 'tritan'),
      mp: sep(a, b, simulateMachado, 'protan'), md: sep(a, b, simulateMachado, 'deutan'), mt: sep(a, b, simulateMachado, 'tritan')
    };
    r.all = Math.min(r.p, r.d, r.t, r.mp, r.md, r.mt);
    rows.push(r);
  }
  const byP = rows.slice().sort((x, y) => x.p - y.p);
  const byD = rows.slice().sort((x, y) => x.d - y.d);
  const byT = rows.slice().sort((x, y) => x.t - y.t);
  const byAll = rows.slice().sort((x, y) => x.all - y.all);
  console.log(`\n## ${name}`);
  console.log(`   ${lanes.join(' ')}`);
  console.log(`   moved from shipped, dE2000: ${lanes.map((h, i) => dE(SHIPPED[i], h).toFixed(1)).join(' ')}`);
  console.log(`   WCAG on the shipped three row grounds: ${lanes.map((h) => Math.min(...G_SHIPPED.map((g) => wcagContrast(h, g))).toFixed(2)).join(' ')}`);
  console.log(`   WCAG on the deepest selected row the region reaches (${G_DEEP[name]}): ${lanes.map((h) => wcagContrast(h, G_DEEP[name]).toFixed(2)).join(' ')}`);
  console.log(`   worst pair PROTANOPIA  ${byP[0].pair} at ${byP[0].p.toFixed(1)}`);
  console.log(`   worst pair DEUTERANOPIA ${byD[0].pair} at ${byD[0].d.toFixed(1)}`);
  console.log(`   worst pair TRITANOPIA  ${byT[0].pair} at ${byT[0].t.toFixed(1)}`);
  console.log(`   worst pair over six models ${byAll[0].pair} at ${byAll[0].all.toFixed(1)}`);
  console.log(`   pairs under 32 in the tree metric (min of Vienot protan and deutan): ${rows.filter((r) => Math.min(r.p, r.d) < 32).map((r) => `${r.pair}=${Math.min(r.p, r.d).toFixed(1)}`).join(', ') || 'none'}`);
}
