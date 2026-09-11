/** Phase 256 prototype — read a fact file. RESEARCH PROTOTYPE, ships nothing. */
import { readFileSync } from 'node:fs';
const [, , file, category, nRaw, ruleFilter] = process.argv;
const d = JSON.parse(readFileSync(file, 'utf8')) as { facts: Record<string, string>[] };
const n = nRaw ? Number(nRaw) : 40;
const xs = d.facts.filter(
  (f) => (category === 'all' || f.category === category) && (!ruleFilter || String(f.rule).includes(ruleFilter))
);
console.log(`${xs.length} facts`);
const step = Math.max(1, Math.floor(xs.length / n));
for (let i = 0; i < xs.length && i / step < n; i += step) {
  const f = xs[i];
  console.log(`${f.rule} | ${f.file}:${f.line} | ${f.subject} | ${f.evidence.slice(0, 100)}`);
}
