/**
 * Phase 256 prototype — the score. RESEARCH PROTOTYPE, ships nothing.
 *
 *   tsx build/p256/det/score.mts <sample.json> <hand-precision.json>
 *
 * Prints precision per repository and per category from the hand judgments,
 * and the same number again with the two commonest false-positive families
 * removed, so what a filter would buy is a measurement rather than a promise.
 */
import { readFileSync } from 'node:fs';

const sample = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { id: string; repo: string; cat: string; rule: string }[];
const hand = JSON.parse(readFileSync(process.argv[3], 'utf8')).judgments as Record<string, number | string>;

type Cell = { n: number; t: number; v: number; tst: number; mis: number };
const byRepoCat = new Map<string, Cell>();
const byCat = new Map<string, Cell>();
const byRepo = new Map<string, Cell>();
const byRule = new Map<string, Cell>();
const bump = (m: Map<string, Cell>, k: string, j: number | string) => {
  const c = m.get(k) ?? { n: 0, t: 0, v: 0, tst: 0, mis: 0 };
  c.n += 1;
  if (j === 1) c.t += 1;
  else if (j === 'v') c.v += 1;
  else if (j === 't') c.tst += 1;
  else c.mis += 1;
  m.set(k, c);
};
for (const row of sample) {
  const j = hand[row.id];
  bump(byRepoCat, `${row.repo}|${row.cat}`, j);
  bump(byCat, row.cat, j);
  bump(byRepo, row.repo, j);
  bump(byRule, row.rule, j);
}
const pct = (c: Cell) => (c.n === 0 ? '—' : `${((100 * c.t) / c.n).toFixed(0)}%`);
const pctNoVendor = (c: Cell) => (c.n - c.v === 0 ? '—' : `${((100 * c.t) / (c.n - c.v)).toFixed(0)}%`);

const cats = ['entrypoint', 'boundary', 'surface', 'store', 'effect', 'test', 'gate'];
const repos = [...new Set(sample.map((r) => r.repo))].sort();
console.log('PRECISION by repository x category (judged / sampled)\n');
console.log(['repo', ...cats, 'all'].join(' | '));
for (const r of repos) {
  const cells = cats.map((c) => {
    const x = byRepoCat.get(`${r}|${c}`);
    return x ? `${x.t}/${x.n}` : '—';
  });
  const all = byRepo.get(r)!;
  console.log([r, ...cells, `${all.t}/${all.n} ${pct(all)}`].join(' | '));
}
console.log('\nPRECISION by category, whole corpus\n');
console.log('category | sampled | true | precision | vendored-FP | fixture/assertion-FP | misclassified-FP | precision excluding vendored files');
for (const c of cats) {
  const x = byCat.get(c);
  if (!x) continue;
  console.log([c, x.n, x.t, pct(x), x.v, x.tst, x.mis, pctNoVendor(x)].join(' | '));
}
const tot = [...byCat.values()].reduce((a, b) => ({ n: a.n + b.n, t: a.t + b.t, v: a.v + b.v, tst: a.tst + b.tst, mis: a.mis + b.mis }), { n: 0, t: 0, v: 0, tst: 0, mis: 0 });
console.log(['ALL', tot.n, tot.t, pct(tot), tot.v, tot.tst, tot.mis, pctNoVendor(tot)].join(' | '));

console.log('\nWORST RULES (sampled >= 3)\n');
console.log('rule | sampled | true | precision');
for (const [k, c] of [...byRule].sort((a, b) => a[1].t / a[1].n - b[1].t / b[1].n)) {
  if (c.n < 3) continue;
  if (c.t === c.n) continue;
  console.log([k, c.n, c.t, pct(c)].join(' | '));
}
