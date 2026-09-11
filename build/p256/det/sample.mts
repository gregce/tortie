/**
 * Phase 256 prototype — the PRECISION SAMPLER.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 * Deterministic: facts are sorted by (file, line, rule) and then taken at an
 * even stride, so the same corpus gives the same sample and a later reader can
 * re-derive the rows the hand reading judged.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const per = Number(process.argv[3] ?? 6);
const out: Record<string, unknown>[] = [];
for (const f of readdirSync(dir).sort()) {
  if (!f.endsWith('.json') || f.startsWith('summary') || f.includes('.nowrap.')) continue;
  const repo = f.replace(/\.json$/, '');
  const d = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { facts: Record<string, string>[] };
  const byCat = new Map<string, Record<string, string>[]>();
  for (const x of d.facts) {
    const a = byCat.get(x.category) ?? [];
    a.push(x);
    byCat.set(x.category, a);
  }
  for (const [cat, xs] of [...byCat].sort()) {
    xs.sort((a, b) => (a.file + a.line.toString().padStart(6, '0') + a.rule).localeCompare(b.file + b.line.toString().padStart(6, '0') + b.rule));
    const step = Math.max(1, Math.floor(xs.length / per));
    let taken = 0;
    for (let i = 0; i < xs.length && taken < per; i += step) {
      out.push({ id: `${repo}/${cat}/${taken}`, repo, cat, rule: xs[i].rule, at: `${xs[i].file}:${xs[i].line}`, subject: xs[i].subject, evidence: xs[i].evidence });
      taken += 1;
    }
  }
}
writeFileSync(process.argv[4] ?? '/dev/stdout', JSON.stringify(out, null, 1));
console.error(`${out.length} rows`);
