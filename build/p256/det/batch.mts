/**
 * Phase 256 prototype — run the deterministic pass over the whole corpus.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 *   tsx build/p256/det/batch.mts <scratch>/repos <outdir>
 *
 * One process per repository is deliberately NOT used: the grammars are loaded
 * once and every repository is read by the same reader, so the timings below
 * exclude the ~250 ms of wasm compile and are per-repository read costs.
 */

import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runOver } from './run.mts';

const root = process.argv[2];
const outDir = process.argv[3];
if (!root || !outDir) {
  console.error('usage: tsx build/p256/det/batch.mts <repos-dir> <out-dir>');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const repos = readdirSync(root).sort();
const rows: Record<string, unknown>[] = [];
for (const name of repos) {
  const repo = join(root, name);
  process.stderr.write(`[p256] ${name} … `);
  const res = await runOver(repo, Infinity, !process.argv.includes('--no-wrappers'));
  writeFileSync(join(outDir, process.argv.includes('--no-wrappers') ? `${name}.nowrap.json` : `${name}.json`), JSON.stringify(res, null, 1));
  const row = {
    repo: name,
    head: res.head.slice(0, 8),
    tracked: res.trackedFiles,
    parsed: res.parsedFiles,
    manifests: res.manifestFiles,
    unparsed: res.unparsedFiles,
    mb: +(res.bytesRead / 1048576).toFixed(1),
    ms: res.ms,
    wrapperMs: res.wrapperMs,
    wrappers: res.wrappers,
    wrapperFacts: res.wrapperFacts,
    facts: res.facts.length,
    ...res.byCategory
  };
  rows.push(row);
  process.stderr.write(`${res.facts.length} facts in ${res.ms} ms\n`);
}
writeFileSync(join(outDir, process.argv.includes('--no-wrappers') ? 'summary-nowrap.json' : 'summary.json'), JSON.stringify(rows, null, 1));
console.log(JSON.stringify(rows, null, 1));
