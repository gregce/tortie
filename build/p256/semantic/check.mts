/**
 * Phase 256 prototype — THE CHECKER.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 *   tsx build/p256/semantic/check.mts <pass.json> <facts.json> <repo>
 *
 * It asks of a semantic pass exactly the three things the charter says a
 * deterministic half must be able to ask, and nothing a model could argue with:
 *
 *   1. Every source link resolves. The file is tracked and the line exists.
 *   2. Every citation is a FACT the deterministic pass actually emitted at that
 *      place, not merely a line that happens to exist.
 *   3. Every evidence level is justified by a detected call site or test.
 *
 * Plus four structural rules that cost nothing and catch the failures a
 * hand-written or model-written record really makes: a component with no fact
 * at all, a journey step naming a component that does not exist, a gate with no
 * gate-shaped fact behind it, and a number in prose that no fact carries —
 * which is the rule `src/main/arch/enrich/validate.ts` already applies to the
 * shipped drafting pass and the one rule here that is copied rather than
 * invented.
 *
 * Every finding names the claim, the rule and the reason. A finding is never a
 * crash: a pass that cannot be checked at all is reported as such.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface Fact {
  category: string;
  kind: string;
  subject: string;
  file: string;
  line: number;
  rule: string;
}
interface Claim {
  at: string;
  why: string;
}
interface Component {
  id: string;
  name: string;
  job: string;
  input: string;
  output: string;
  runsIn: string;
  state: string;
  limit: string;
  evidence: string;
  facts: Claim[];
}
interface Pass {
  components: Component[];
  journeys: { id: string; name: string; steps: { componentId: string; label: string; facts: Claim[] }[] }[];
  gates: { id: string; question: string; answer: string; because: string; facts: Claim[] }[];
}

interface Finding {
  rule: string;
  where: string;
  why: string;
}

const EVIDENCE_LEVELS = new Set([
  'composed',
  'component-tested',
  'accepted-live',
  'implemented-not-shipped',
  'outside-this-repo'
]);

const CONTRACT_FIELDS = ['job', 'input', 'output', 'runsIn', 'state', 'limit'] as const;

/** How close a citation may be to a fact and still count as naming it. */
const LINE_SLACK = 3;

function main(): void {
  const [, , passPath, factsPath, repo] = process.argv;
  if (!passPath || !factsPath || !repo) {
    console.error('usage: tsx build/p256/semantic/check.mts <pass.json> <facts.json> <repo>');
    process.exit(2);
  }
  const pass = JSON.parse(readFileSync(passPath, 'utf8')) as Pass;
  const facts = (JSON.parse(readFileSync(factsPath, 'utf8')) as { facts: Fact[] }).facts;

  const tracked = new Set(
    execFileSync('git', ['-C', repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
    })
      .toString('utf8')
      .split('\0')
      .filter((p) => p.length > 0)
  );

  const byFile = new Map<string, Fact[]>();
  for (const f of facts) {
    const a = byFile.get(f.file) ?? [];
    a.push(f);
    byFile.set(f.file, a);
  }
  const lineCount = new Map<string, number>();
  const linesOf = (file: string): number => {
    const had = lineCount.get(file);
    if (had !== undefined) return had;
    let n = -1;
    try {
      const abs = join(repo, file);
      if (statSync(abs).isFile()) n = readFileSync(abs, 'utf8').split('\n').length;
    } catch {
      n = -1;
    }
    lineCount.set(file, n);
    return n;
  };

  const findings: Finding[] = [];
  let claims = 0;
  let resolved = 0;
  let backed = 0;
  const claimRows: { where: string; at: string; resolves: boolean; backedBy: string | null }[] = [];

  const checkClaim = (where: string, c: Claim, want: (f: Fact) => boolean, wantWhat: string): Fact | null => {
    claims += 1;
    const m = /^(.+):(\d+)$/.exec(c.at);
    if (m === null) {
      findings.push({ rule: '1-link-resolves', where, why: `the citation "${c.at}" is not file:line` });
      claimRows.push({ where, at: c.at, resolves: false, backedBy: null });
      return null;
    }
    const [, file, lineRaw] = m;
    const line = Number(lineRaw);
    if (!tracked.has(file)) {
      findings.push({ rule: '1-link-resolves', where, why: `${file} is not a tracked file of this repository` });
      claimRows.push({ where, at: c.at, resolves: false, backedBy: null });
      return null;
    }
    const n = linesOf(file);
    if (n < 0 || line < 1 || line > n) {
      findings.push({ rule: '1-link-resolves', where, why: `${file} has ${n} lines and the citation names line ${line}` });
      claimRows.push({ where, at: c.at, resolves: false, backedBy: null });
      return null;
    }
    resolved += 1;
    const near = (byFile.get(file) ?? []).filter((f) => Math.abs(f.line - line) <= LINE_SLACK);
    const hit = near.find(want) ?? null;
    if (hit === null) {
      const what = near.length === 0 ? 'the deterministic pass emitted no fact there at all' : `the facts there are ${[...new Set(near.map((f) => f.kind))].join(', ')}`;
      findings.push({ rule: '2-citation-is-a-fact', where, why: `${c.at} is cited for ${wantWhat} and ${what}` });
      claimRows.push({ where, at: c.at, resolves: true, backedBy: null });
      return null;
    }
    backed += 1;
    claimRows.push({ where, at: c.at, resolves: true, backedBy: `${hit.category}/${hit.kind} (${hit.rule})` });
    return hit;
  };

  const ids = new Set<string>();
  for (const comp of pass.components) {
    const where = `component ${comp.id}`;
    if (ids.has(comp.id)) findings.push({ rule: '4-structure', where, why: 'the id is used twice' });
    ids.add(comp.id);
    for (const f of CONTRACT_FIELDS) {
      if (typeof comp[f] !== 'string' || comp[f].trim() === '') {
        findings.push({ rule: '4-structure', where, why: `the contract field "${f}" is missing or empty` });
      }
    }
    if (!EVIDENCE_LEVELS.has(comp.evidence)) {
      findings.push({ rule: '3-evidence-justified', where, why: `"${comp.evidence}" is not one of the five levels` });
    }
    if (comp.facts.length === 0) {
      findings.push({ rule: '5-component-names-a-fact', where, why: 'the component names no fact at all' });
    }
    const hits = comp.facts.map((c) => checkClaim(where, c, () => true, 'any fact')).filter((h): h is Fact => h !== null);
    // Rule 3. What each level needs from the deterministic half.
    if (comp.evidence === 'composed' && hits.length === 0) {
      findings.push({ rule: '3-evidence-justified', where, why: '"composed" needs at least one detected fact and none of its citations is one' });
    }
    if (comp.evidence === 'component-tested' && !hits.some((h) => h.category === 'test')) {
      const named = testsNaming(facts, comp);
      if (named === 0) {
        findings.push({
          rule: '3-evidence-justified',
          where,
          why: '"component-tested" needs a detected test and no citation is a test fact, nor does any test name a file this component cites'
        });
      } else {
        findings.push({
          rule: '3-evidence-justified-weak',
          where,
          why: `"component-tested" is justified only INDIRECTLY: ${named} test facts sit in files under the same directories this component cites, and no citation is a test fact`
        });
      }
    }
    if (comp.evidence === 'accepted-live') {
      findings.push({
        rule: '3-evidence-justified',
        where,
        why: '"accepted-live" cannot be justified by anything the deterministic half can see; it is a claim about a running system and needs a person'
      });
    }
    if (comp.evidence === 'implemented-not-shipped') {
      const reachable = hits.some((h) => h.category === 'entrypoint');
      if (reachable) {
        findings.push({ rule: '3-evidence-justified', where, why: '"implemented-not-shipped" is contradicted by an entrypoint fact among its own citations' });
      }
    }
    // Rule 6. A digit run in prose that no fact carries.
    for (const f of CONTRACT_FIELDS) {
      for (const d of String(comp[f] ?? '').matchAll(/\d[\d,.]*/g)) {
        const run = d[0];
        if (run.length < 2) continue;
        const anywhere = comp.facts.some((c) => c.at.includes(run)) || facts.some((x) => x.subject.includes(run));
        if (!anywhere) {
          findings.push({ rule: '6-numbers-come-from-facts', where, why: `the ${f} says "${run}" and no fact carries that number` });
        }
      }
    }
  }

  for (const j of pass.journeys) {
    for (const [i, s] of j.steps.entries()) {
      const where = `journey ${j.id} step ${i + 1}`;
      if (!ids.has(s.componentId)) {
        findings.push({ rule: '4-structure', where, why: `names component "${s.componentId}", which the pass does not define` });
      }
      if (s.facts.length === 0) findings.push({ rule: '5-component-names-a-fact', where, why: 'the step names no fact' });
      for (const c of s.facts) checkClaim(where, c, () => true, 'any fact');
    }
  }

  for (const g of pass.gates) {
    const where = `gate ${g.id}`;
    if (!['proceeds', 'stops', 'uncertain', 'detected'].includes(g.answer)) {
      findings.push({ rule: '4-structure', where, why: `the answer "${g.answer}" is not one of the four` });
    }
    if (g.facts.length === 0) findings.push({ rule: '7-gate-names-a-gate-fact', where, why: 'the gate names no fact' });
    for (const c of g.facts) {
      const hit = checkClaim(where, c, () => true, 'any fact');
      if (hit !== null && hit.category !== 'gate') {
        findings.push({
          rule: '7-gate-names-a-gate-fact',
          where,
          why: `${c.at} is a ${hit.category}/${hit.kind} fact, and this gate cites nothing the gate rules found`
        });
      }
    }
  }

  console.log(`CHECKER over ${passPath}\n`);
  console.log(`claims: ${claims}`);
  console.log(`rule 1, the link resolves to a tracked line: ${resolved}/${claims} = ${((100 * resolved) / claims).toFixed(1)}%`);
  console.log(`rule 2, the citation names a fact the deterministic pass emitted: ${backed}/${claims} = ${((100 * backed) / claims).toFixed(1)}%`);
  console.log(`findings: ${findings.length}\n`);
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) {
    const a = byRule.get(f.rule) ?? [];
    a.push(f);
    byRule.set(f.rule, a);
  }
  for (const [rule, fs] of [...byRule].sort()) {
    console.log(`${rule} — ${fs.length}`);
    for (const f of fs) console.log(`  ${f.where}: ${f.why}`);
  }
  console.log('\nCLAIM LEDGER\n');
  for (const r of claimRows) {
    console.log(`${r.resolves ? (r.backedBy === null ? 'RESOLVES, UNBACKED' : 'BACKED') : 'BROKEN'} | ${r.at} | ${r.where} | ${r.backedBy ?? ''}`);
  }
  process.exitCode = findings.length === 0 ? 0 : 1;
}

/** Test facts in files that share a directory with something the component cites. */
function testsNaming(facts: readonly Fact[], comp: Component): number {
  const dirs = new Set(comp.facts.map((c) => c.at.replace(/:\d+$/, '').split('/').slice(0, -1).join('/')));
  return facts.filter((f) => f.category === 'test' && [...dirs].some((d) => d !== '' && f.file.startsWith(d))).length;
}

main();
