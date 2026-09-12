/**
 * Phase 258 — THE SEED RULE FOR `reached`, MEASURED (spec §2).
 *
 *   tsx --tsconfig tsconfig.node.json build/p258/seed-measure.mts <repo> <facts.json> [pass.json]
 *
 * Research 118 §7.2 measured the UNSEEDED walk (every entrypoint fact at once)
 * answering `tested` for eight of nine hand-named parts on this repository and
 * left the seed rule as the one Phase 2 design question. This runs the SAME
 * rung decision (`rungOf` out of build/p256/det/ladder.mts, unchanged) over the
 * same first-party import graph (Tortie's own resolver, via `importGraph`) with
 * SIX candidate seed rules, over THREE part sets, and prints the rung
 * distribution each gives, so the spec picks with the numbers attached.
 *
 * Parts:  P  rule P's own boxes (what the map draws), via the shipping
 *            `readingPartition`;
 *         T  the top-two-segment path parts of §7.2 (comparability);
 *         H  the hand pass's components when a pass file is given.
 *
 * Seed rules (S is the set of files the walk starts from, per part):
 *   A  all-entrypoints   every file carrying ANY entrypoint fact (§7.2 baseline)
 *   B  source-starts     entrypoint facts whose kind is `composition-root` or
 *                        `main` (a manifest file has no imports, so this is
 *                        what A really walks from; printed to prove it)
 *   C  composition-only  kind `composition-root` alone
 *   D  manifest-declared the FILE a manifest names: package.json main/bin,
 *                        cargo [[bin]] → src/main.rs, swift executableTarget →
 *                        Sources/<name>/main.swift; only when tracked
 *   E  unit-own          B, restricted to the entrypoints inside the part's
 *                        own UNIT (rule Q's region), so a part is reached only
 *                        by something its own unit starts
 *   F  outside-harness   B minus entrypoints in test paths and under build/
 *                        (the product's own isTestPath plus the one directory
 *                        this repository keeps its harness mains in)
 *
 * It spawns exactly one program, `git`, with a fixed argv. No Electron, no
 * tmux, no agent, no request, nothing under the person's home.
 *
 * WHAT IT READ ON 2026-09-11, pinned here so the pick in SPEC §2.4 stays a
 * measurement rather than a memory (git clone --local copies of this worktree
 * at 88165be1 and of /Users/gdc/stoa at dc942342, fact files out of
 * build/p257/facts-corpus.mts, edges out of Tortie's own resolver):
 *
 *   tortie  3,330 tracked, 8,140 first-party edges, 37 entrypoint files, 875
 *           test files, ONE unit (the root package.json). Seed set sizes A 37,
 *           B 18, C 15, D 3 (all three fixture or prototype mains under
 *           build/), F 8. Files reached over the whole graph: A 686, B 667,
 *           C 664, D 3, F 657. Rule P's 8 boxes read, per rule,
 *           off-repo/declared/composed/reached/tested:
 *             A 0/0/4/1/3   B 0/0/5/0/3   C 0/0/5/0/3   D 0/0/7/0/1
 *             E 0/0/5/0/3   F 0/0/6/0/2   G 0/0/5/0/3
 *           A's one `reached` is the fold `other`, which holds package.json,
 *           and it is the manifest-file artefact G removes. The nine
 *           hand-named components read composed 1, tested 8 under every rule
 *           but D (composed 9): §7.2's refutation is structural and stands.
 *           Per-file share under G: build 10 reached / 1 tested of 455
 *           parsed; src-main 583 / 395 of 1,068; src-shared 73 / 39 of 99;
 *           src-renderer 0 / 336 of 968, because the closed table recognises
 *           no renderer root (the stated limit in SPEC §7).
 *   stoa    4,593 tracked, 1,023 edges, 44 entrypoint files, 267 test files,
 *           12 units. Seed set sizes A 44, B 17, C 0, D 3, F 17. Rule P's 22
 *           boxes:
 *             A 0/1/7/10/4  B 0/1/15/6/0  C 0/1/21/0/0  D 0/1/18/1/2
 *             E 0/1/15/6/0  F 0/1/15/6/0  G 0/1/12/7/2
 *           G is the only rule using 4 of 5 rungs with no manifest-file
 *           artefact; packages-agent-sandbox and packages-testing-core read
 *           `tested` only under D and G, because their package.json declares
 *           ./src/index.ts and that file is tracked.
 *
 * The pick is G. The product's `seedsOfPart` (src/main/arch/evidence.ts)
 * unions the seeds of every unit that owns one of a part's files, which is
 * exactly the `us` set the E and G rules below are computed with.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { importGraph, rungOf, type Rung } from '../p256/det/ladder.mts';
import { readingPartition } from '../../src/main/arch/skeleton';
import { readArchManifests } from '../../src/main/arch/resolver/manifest';
import { grammarFor } from '../../src/main/symbols/languages';

interface Fact { category: string; kind: string; subject: string; file: string; line: number; rule: string }

const ORDER: Rung[] = ['off-repo', 'declared', 'composed', 'reached', 'tested'];
const TEST_PATH = /(^|\/)(test|tests|__tests__|spec|specs|e2e|fixtures?)(\/|$)|\.(test|spec)\.[a-z]+$|_test\.go$|_spec\.rb$/i;
const dirOf = (p: string): string => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const under = (dir: string, p: string): boolean => dir === '' || p === dir || p.startsWith(`${dir}/`);

const [repo, factsPath, passPath] = process.argv.slice(2);
if (!repo || !factsPath) {
  console.error('usage: tsx build/p258/seed-measure.mts <repo> <facts.json> [pass.json]');
  process.exit(2);
}
const t0 = Date.now();
const tracked = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { maxBuffer: 512 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  .toString('utf8').split('\0').filter((p) => p.length > 0);
const trackedSet = new Set(tracked);
const facts = (JSON.parse(readFileSync(factsPath, 'utf8')) as { facts: Fact[] }).facts;
const graph = await importGraph(repo, tracked);
const testFiles = new Set(facts.filter((f) => f.category === 'test').map((f) => f.file));
const namedByManifest = new Set(facts.filter((f) => f.category === 'boundary' || f.category === 'entrypoint').map((f) => f.file));
const entry = facts.filter((f) => f.category === 'entrypoint');

// ---- rule Q, the units (spec §3) — enough of it to measure seed rule E ----
const manifests = readArchManifests(repo);
const unitDirs = new Set<string>();
for (const w of manifests.workspaces.values()) unitDirs.add(w.dir);
if (manifests.cargo !== null) for (const c of manifests.cargo.crates.values()) if (c.dir !== '') unitDirs.add(c.dir);
for (const f of facts) {
  if (f.category === 'boundary' && (f.kind === 'library')) unitDirs.add(dirOf(f.file));
  if (f.category === 'entrypoint' && (f.kind === 'package-main' || f.kind === 'bin' || f.kind === 'container' || f.kind === 'process')) unitDirs.add(dirOf(f.file));
  if (f.category === 'entrypoint' && f.kind === 'main') {
    // nearest manifest directory above the main, else its own directory
    let d = dirOf(f.file);
    let found: string | null = null;
    for (;;) {
      for (const m of ['package.json', 'Cargo.toml', 'go.mod', 'Package.swift', 'pyproject.toml', 'setup.py']) {
        if (trackedSet.has(d === '' ? m : `${d}/${m}`)) { found = d; break; }
      }
      if (found !== null || d === '') break;
      d = dirOf(d);
    }
    unitDirs.add(found ?? dirOf(f.file));
  }
}
const units = [...unitDirs].sort((a, b) => b.split('/').length - a.split('/').length || (a < b ? -1 : 1));
const unitOf = (path: string): string | null => units.find((u) => under(u, path)) ?? null;

// ---- the seed rules ----
const isSource = (f: Fact): boolean => f.kind === 'composition-root' || f.kind === 'main';
const A = new Set(entry.map((f) => f.file));
const B = new Set(entry.filter(isSource).map((f) => f.file));
const C = new Set(entry.filter((f) => f.kind === 'composition-root').map((f) => f.file));
const D = new Set<string>();
for (const f of entry) {
  const dir = dirOf(f.file);
  const at = (rel: string): string => (dir === '' ? rel : `${dir}/${rel}`).replace(/^\.\//, '').replace(/\/\.\//g, '/');
  if (f.kind === 'package-main') { const m = /node entry (.+)$/.exec(f.subject); if (m && trackedSet.has(at(m[1]!))) D.add(at(m[1]!)); }
  if (f.kind === 'bin' && f.rule === 'entrypoint.pkg.bin') { const m = /→ (.+)$/.exec(f.subject); if (m && trackedSet.has(at(m[1]!))) D.add(at(m[1]!)); }
  if (f.kind === 'bin' && f.rule === 'entrypoint.cargo.bin') { if (trackedSet.has(at('src/main.rs'))) D.add(at('src/main.rs')); }
  if (f.kind === 'bin' && f.rule === 'entrypoint.swiftpm.target') { const m = /executableTarget (.+)$/.exec(f.subject); if (m && trackedSet.has(at(`Sources/${m[1]}/main.swift`))) D.add(at(`Sources/${m[1]}/main.swift`)); }
}
const F = new Set([...B].filter((p) => !TEST_PATH.test(p) && !p.startsWith('build/')));

type SeedRule = { id: string; seedsFor: (anchors: ReadonlySet<string>) => ReadonlySet<string> };
const RULES: SeedRule[] = [
  { id: 'A all-entrypoints', seedsFor: () => A },
  { id: 'B source-starts', seedsFor: () => B },
  { id: 'C composition-only', seedsFor: () => C },
  { id: 'D manifest-declared', seedsFor: () => D },
  { id: 'E unit-own', seedsFor: (anchors) => {
      const us = new Set([...anchors].map(unitOf));
      return new Set([...B].filter((s) => us.has(unitOf(s))));
    } },
  { id: 'F outside-harness', seedsFor: () => F },
  // G is E over B ∪ D: the unit's own source starts AND the file its manifest
  // declares, never the manifest file itself, never a CI job or an npm script.
  { id: 'G unit-own+declared', seedsFor: (anchors) => {
      const us = new Set([...anchors].map(unitOf));
      return new Set([...B, ...D].filter((s) => us.has(unitOf(s))));
    } }
];

/** Per-file: how many of a part's PARSED files a walk from `seeds` reaches, and how many a test imports. */
function share(anchors: ReadonlySet<string>, seeds: ReadonlySet<string>): { parsed: number; reached: number; tested: number } {
  const seen = new Set<string>(); const q = [...seeds].filter((s) => trackedSet.has(s)); for (const s of q) seen.add(s);
  while (q.length) { const at = q.shift()!; for (const n of graph.out.get(at) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
  let parsed = 0, reached = 0, tested = 0;
  for (const a of anchors) {
    if (grammarFor(a) === null) continue;
    parsed += 1;
    if (seen.has(a)) reached += 1;
    if ([...(graph.into.get(a) ?? [])].some((f) => testFiles.has(f))) tested += 1;
  }
  return { parsed, reached, tested };
}

// ---- the part sets ----
const parseable = (p: string): boolean => grammarFor(p) !== null;
const resolved: { fromPath: string; toPath: string }[] = [];
for (const [from, tos] of graph.out) for (const to of tos) resolved.push({ fromPath: from, toPath: to });
const cut = readingPartition({
  subject: 'x', trackedFiles: tracked, imports: resolved, parseable,
  workspaces: [...manifests.workspaces.values()].map((w) => w.dir),
  crates: manifests.cargo === null ? [] : [...manifests.cargo.crates.values()].map((c) => c.dir).filter((d) => d !== '')
});
const P = cut.boxes.map((b) => ({ id: b.id, anchors: new Set(b.files) }));
const T: { id: string; anchors: Set<string> }[] = [];
{
  const parts = new Map<string, Set<string>>();
  for (const rel of tracked) {
    const bits = rel.split('/');
    const key = bits.length === 1 ? '(root)' : bits.slice(0, Math.min(2, bits.length - 1)).join('/');
    (parts.get(key) ?? parts.set(key, new Set()).get(key))!.add(rel);
  }
  for (const [id, anchors] of parts) if (anchors.size >= 3) T.push({ id, anchors });
}
const H: { id: string; anchors: Set<string> }[] = [];
if (passPath && existsSync(passPath)) {
  const pass = JSON.parse(readFileSync(passPath, 'utf8')) as { components: { id: string; facts: { at: string }[] }[] };
  for (const c of pass.components) H.push({ id: c.id, anchors: new Set(c.facts.map((x) => x.at.replace(/:\d+$/, ''))) });
}

console.log(`SEED MEASUREMENT over ${repo}`);
console.log(`tracked ${tracked.length}, first-party import edges ${graph.edges}, entrypoint files ${A.size}, test files ${testFiles.size}`);
console.log(`units (rule Q draft): ${units.length} → ${units.map((u) => u === '' ? '(root)' : u).join(', ')}`);
console.log(`seed set sizes: A ${A.size}, B ${B.size}, C ${C.size}, D ${D.size} [${[...D].join(', ')}], F ${F.size}`);
console.log(`files reached from each seed set (whole graph): ` + RULES.filter((r) => r.id[0] !== 'E').map((r) => {
  const seen = new Set<string>(); const q = [...r.seedsFor(new Set())].filter((s) => trackedSet.has(s)); for (const s of q) seen.add(s);
  while (q.length) { const at = q.shift()!; for (const n of graph.out.get(at) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
  return `${r.id.slice(0, 1)} ${seen.size}`;
}).join(', '));

function table(name: string, parts: { id: string; anchors: Set<string> }[], perPart: boolean): void {
  if (parts.length === 0) return;
  console.log(`\n=== ${name}: ${parts.length} parts ===`);
  const head = ['part'.padEnd(26), ...RULES.map((r) => r.id.slice(0, 1).padEnd(9))].join(' | ');
  if (perPart) console.log(head);
  const tally = new Map<string, Record<string, number>>(RULES.map((r) => [r.id, {}]));
  for (const p of parts) {
    const row: string[] = [];
    for (const r of RULES) {
      const rung = rungOf(p.anchors, trackedSet, graph, r.seedsFor(p.anchors), testFiles, namedByManifest);
      tally.get(r.id)![rung] = (tally.get(r.id)![rung] ?? 0) + 1;
      row.push(rung.padEnd(9));
    }
    if (perPart) console.log([p.id.padEnd(26), ...row].join(' | '));
  }
  console.log('rule'.padEnd(22) + ' | ' + ORDER.map((o) => o.padEnd(9)).join(' | ') + ' | rungs used');
  for (const r of RULES) {
    const t = tally.get(r.id)!;
    console.log(r.id.padEnd(22) + ' | ' + ORDER.map((o) => String(t[o] ?? 0).padEnd(9)).join(' | ') + ' | ' + String(ORDER.filter((o) => (t[o] ?? 0) > 0).length) + ' of 5');
  }
}
table('P rule P boxes', P, true);
console.log('\n=== per-file share per rule P box, walked under G (unit-own+declared) ===');
console.log('part'.padEnd(34) + ' | parsed | reached | tested');
for (const p of P) {
  const s = share(p.anchors, RULES[RULES.length - 1]!.seedsFor(p.anchors));
  console.log(p.id.padEnd(34) + ' | ' + String(s.parsed).padStart(6) + ' | ' + String(s.reached).padStart(7) + ' | ' + String(s.tested).padStart(6));
}
table('T top-two-segment parts (§7.2)', T, false);
table('H hand pass components', H, true);
console.log(`\n${Date.now() - t0} ms`);
