/**
 * Phase 256 prototype — WHAT A COIN WOULD SCORE.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 *   tsx build/p256/semantic/null-model.mts <facts.json> <repo> [pass.json]
 *
 * `check.mts` prints a backing rate. A rate means nothing without its floor,
 * and the floor here is large: a citation is BACKED when SOME fact sits within
 * three lines of it, so the question "what share of lines in these files are
 * within three lines of some fact" is the share a writer would score by
 * pointing at random inside the files they had open.
 *
 * It prints that share three ways: over every file carrying a fact, over the
 * files one pass actually cites, and per fact CATEGORY, because a shaped
 * question — rule 7's gate, say — has a much smaller floor than the
 * shape-agnostic one and the design's chips should say which they are.
 *
 * It spawns nothing, reads only the repository it is pointed at, and writes
 * nothing at all.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Fact {
  category: string;
  file: string;
  line: number;
}

/** The same slack `check.mts` applies. Kept here rather than imported so the two can be ablated apart. */
const LINE_SLACK = 3;

function main(): void {
  const [, , factsPath, repo, passPath] = process.argv;
  if (!factsPath || !repo) {
    console.error('usage: tsx build/p256/semantic/null-model.mts <facts.json> <repo> [pass.json]');
    process.exit(2);
  }
  const facts = (JSON.parse(readFileSync(factsPath, 'utf8')) as { facts: Fact[] }).facts;

  const lineCache = new Map<string, number>();
  const linesOf = (rel: string): number => {
    const had = lineCache.get(rel);
    if (had !== undefined) return had;
    let n = -1;
    try {
      n = readFileSync(join(repo, rel), 'utf8').split('\n').length;
    } catch {
      n = -1;
    }
    lineCache.set(rel, n);
    return n;
  };

  /** Lines within the slack of a fact this filter admits, over these files. */
  const share = (files: readonly string[], keep: (f: Fact) => boolean): [number, number] => {
    const byFile = new Map<string, number[]>();
    for (const f of facts) {
      if (!keep(f)) continue;
      const a = byFile.get(f.file) ?? [];
      a.push(f.line);
      byFile.set(f.file, a);
    }
    let within = 0;
    let total = 0;
    for (const rel of files) {
      const n = linesOf(rel);
      if (n < 1) continue;
      const marks = new Set<number>();
      for (const l of byFile.get(rel) ?? []) {
        for (let d = -LINE_SLACK; d <= LINE_SLACK; d += 1) {
          const x = l + d;
          if (x >= 1 && x <= n) marks.add(x);
        }
      }
      within += marks.size;
      total += n;
    }
    return [within, total];
  };

  const pct = (w: number, t: number): string => (t === 0 ? 'n/a' : `${((100 * w) / t).toFixed(1)}%`);

  const factFiles = [...new Set(facts.map((f) => f.file))];
  const [aw, at] = share(factFiles, () => true);
  console.log(`THE FLOOR UNDER RULE 2, at a slack of ${LINE_SLACK} lines\n`);
  console.log(`every file carrying a fact (${factFiles.length}): ${aw} of ${at} lines = ${pct(aw, at)}`);

  let cited: string[] = [];
  if (passPath !== undefined) {
    const pass = JSON.parse(readFileSync(passPath, 'utf8')) as {
      components: { facts: { at: string }[] }[];
      journeys: { steps: { facts: { at: string }[] }[] }[];
      gates: { facts: { at: string }[] }[];
    };
    const set = new Set<string>();
    const take = (list: readonly { at: string }[] | undefined): void => {
      for (const c of list ?? []) set.add(c.at.replace(/:\d+$/, ''));
    };
    for (const c of pass.components) take(c.facts);
    for (const j of pass.journeys) for (const s of j.steps) take(s.facts);
    for (const g of pass.gates) take(g.facts);
    cited = [...set];
    const [cw, ct] = share(cited, () => true);
    console.log(`the files that pass actually cites (${cited.length}): ${cw} of ${ct} lines = ${pct(cw, ct)}`);
    console.log(`\n  ^ THAT is the number a backing rate has to beat. A writer who had these files open\n    and pointed at random inside them scores it.`);
  }

  const cats = [...new Set(facts.map((f) => f.category))].sort();
  console.log(`\nPER CATEGORY, which is the floor under a SHAPED question such as rule 7's gate\n`);
  const where = cited.length > 0 ? cited : factFiles;
  const label = cited.length > 0 ? 'over the cited files' : 'over every fact-carrying file';
  console.log(`${label}:`);
  for (const cat of cats) {
    const [w, t] = share(where, (f) => f.category === cat);
    console.log(`  ${cat.padEnd(12)} ${String(w).padStart(7)} of ${t} = ${pct(w, t)}`);
  }
}

main();
