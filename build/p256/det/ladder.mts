/**
 * Phase 256 prototype — THE COMPUTED EVIDENCE LADDER.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 *   tsx build/p256/det/ladder.mts <repo> <facts.json> [pass.json]
 *
 * §2.4 of research 118 measures the skill's advisory ladder decaying in a
 * single writing: five prose rungs went in, three renamed, two dropped and one
 * invented came out. The design's answer is that the level is COMPUTED and no
 * model may write one. The first draft of that design stated five rungs and
 * computed none of them on any repository, which is the same defect one level
 * up, so this is the rungs run rather than written.
 *
 * The five, exactly as §7.2 states them, over one component's ANCHOR SET:
 *
 *   off-repo   no anchor is a tracked file of this repository
 *   declared   anchors are here; no first-party import edge reaches one and no
 *              entrypoint or manifest fact names one
 *   composed   some first-party import edge reaches an anchor, OR an
 *              entrypoint / boundary fact names one
 *   reached    a path exists in the first-party import graph from a file
 *              carrying an entrypoint fact to an anchor
 *   tested     `reached`, and a file carrying a test fact imports an anchor
 *
 * It uses TORTIE'S OWN shipped resolver (`src/main/arch/resolver`) and its own
 * `SymbolExtractor`, which is the point: four of the five rungs are meant to be
 * computable from data the product already holds, and that claim is only worth
 * anything if it is computed with the product's own parts.
 *
 * Anchors come from a semantic pass's citations when one is given, and
 * otherwise from the top two path segments of the tree, which is a stand-in for
 * `docs/arch/` globs and is what makes the number comparable across a corpus
 * where nobody has written a contract.
 *
 * It spawns exactly one program, `git`, with a fixed argv, and no field of any
 * repository reaches any argv.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { archResolveContext, resolveImport, type ArchResolverLanguage } from '../../../src/main/arch/resolver';
import { readArchManifests } from '../../../src/main/arch/resolver/manifest';
import { SymbolExtractor } from '../../../src/main/symbols/extract';
import { grammarFor } from '../../../src/main/symbols/languages';
import { grammarPath, runtimeWasmPath } from '../../../src/main/symbols/paths';

export type Rung = 'off-repo' | 'declared' | 'composed' | 'reached' | 'tested';

interface Fact {
  category: string;
  kind: string;
  subject: string;
  file: string;
  line: number;
  rule: string;
}

/** The extension arm, copied from `src/main/arch/scan.ts`'s own table. */
const ARM: Readonly<Record<string, ArchResolverLanguage>> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.go': 'go', '.py': 'python', '.pyi': 'python', '.rs': 'rust', '.rb': 'ruby',
  '.swift': 'swift', '.kt': 'kotlin', '.kts': 'kotlin', '.java': 'java', '.php': 'php',
  '.c': 'c', '.h': 'c', '.cc': 'cpp', '.cpp': 'cpp', '.hpp': 'cpp', '.m': 'objc', '.mm': 'objc',
  '.cs': 'csharp'
};

const armOf = (rel: string): ArchResolverLanguage | null => {
  const cut = rel.lastIndexOf('.');
  return cut < 0 ? null : (ARM[rel.slice(cut).toLowerCase()] ?? null);
};

const MAX_BYTES = 4 * 1024 * 1024;

/** The first-party import graph, built with the product's own resolver. */
export async function importGraph(
  repo: string,
  tracked: readonly string[]
): Promise<{ out: Map<string, Set<string>>; into: Map<string, Set<string>>; edges: number }> {
  const manifests = readArchManifests(repo);
  const ctx = archResolveContext(manifests, tracked as string[]);
  const symbols = await SymbolExtractor.create({ runtimeWasm: runtimeWasmPath(), grammarPath });
  const out = new Map<string, Set<string>>();
  const into = new Map<string, Set<string>>();
  let edges = 0;
  try {
    for (const rel of tracked) {
      const lang = armOf(rel);
      if (lang === null || grammarFor(rel) === null) continue;
      let text: string;
      try {
        const abs = join(repo, rel);
        if (statSync(abs).size > MAX_BYTES) continue;
        text = readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      const found = await symbols.extractAll(rel, text);
      for (const imp of found.imports) {
        const answer = resolveImport(imp.specifier, rel, lang, ctx, imp.form);
        if (answer.resolution !== 'first-party') continue;
        const to = answer.toPath;
        if (to === undefined || to === null || to === rel) continue;
        const a = out.get(rel) ?? new Set<string>();
        if (!a.has(to)) edges += 1;
        a.add(to);
        out.set(rel, a);
        const b = into.get(to) ?? new Set<string>();
        b.add(rel);
        into.set(to, b);
      }
    }
  } finally {
    symbols.dispose();
  }
  return { out, into, edges };
}

/** The one decision, given the graph and the fact base. */
export function rungOf(
  anchors: ReadonlySet<string>,
  tracked: ReadonlySet<string>,
  graph: { out: Map<string, Set<string>>; into: Map<string, Set<string>> },
  seeds: ReadonlySet<string>,
  testFiles: ReadonlySet<string>,
  namedByManifest: ReadonlySet<string>
): Rung {
  const here = [...anchors].filter((a) => tracked.has(a));
  if (here.length === 0) return 'off-repo';
  const hereSet = new Set(here);
  // reached: a walk from any entrypoint file.
  const seen = new Set<string>();
  const queue = [...seeds].filter((s) => tracked.has(s));
  for (const s of queue) seen.add(s);
  let reached = queue.some((s) => hereSet.has(s));
  while (queue.length > 0 && !reached) {
    const at = queue.shift() as string;
    for (const next of graph.out.get(at) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      if (hereSet.has(next)) { reached = true; break; }
      queue.push(next);
    }
  }
  if (reached) {
    const tested = here.some((a) => [...(graph.into.get(a) ?? [])].some((f) => testFiles.has(f)));
    return tested ? 'tested' : 'reached';
  }
  const composed =
    here.some((a) => (graph.into.get(a) ?? new Set()).size > 0) ||
    here.some((a) => namedByManifest.has(a));
  return composed ? 'composed' : 'declared';
}

const ORDER: Rung[] = ['off-repo', 'declared', 'composed', 'reached', 'tested'];

/**
 * The five rungs proved to FIRE, on planted graphs rather than on a corpus.
 *
 * Every repository in the corpus tracks every anchor it names, so `off-repo`
 * is 0 everywhere and a reader has no way to tell a rung that cannot happen
 * from a rung that never happened. This turns each one on in turn.
 */
function selfTest(): void {
  const mk = (pairs: [string, string][]) => {
    const out = new Map<string, Set<string>>();
    const into = new Map<string, Set<string>>();
    for (const [a, b] of pairs) {
      (out.get(a) ?? out.set(a, new Set()).get(a))!.add(b);
      (into.get(b) ?? into.set(b, new Set()).get(b))!.add(a);
    }
    return { out, into };
  };
  const tracked = new Set(['main.ts', 'mid.ts', 'leaf.ts', 'lonely.ts', 'named.ts', 'leaf.test.ts']);
  const cases: [string, Rung, () => Rung][] = [
    ['an anchor nothing in the repository tracks', 'off-repo', () =>
      rungOf(new Set(['vendor/other.ts']), tracked, mk([]), new Set(), new Set(), new Set())],
    ['here, imported by nothing, named by no manifest', 'declared', () =>
      rungOf(new Set(['lonely.ts']), tracked, mk([]), new Set(['main.ts']), new Set(), new Set())],
    ['imported, but by nothing that starts', 'composed', () =>
      rungOf(new Set(['leaf.ts']), tracked, mk([['mid.ts', 'leaf.ts']]), new Set(['main.ts']), new Set(), new Set())],
    ['named by a manifest and imported by nothing', 'composed', () =>
      rungOf(new Set(['named.ts']), tracked, mk([]), new Set(['main.ts']), new Set(), new Set(['named.ts']))],
    ['on a path from something that starts', 'reached', () =>
      rungOf(new Set(['leaf.ts']), tracked, mk([['main.ts', 'mid.ts'], ['mid.ts', 'leaf.ts']]), new Set(['main.ts']), new Set(), new Set())],
    ['reached, and a test file imports it', 'tested', () =>
      rungOf(new Set(['leaf.ts']), tracked, mk([['main.ts', 'mid.ts'], ['mid.ts', 'leaf.ts'], ['leaf.test.ts', 'leaf.ts']]), new Set(['main.ts']), new Set(['leaf.test.ts']), new Set())],
    ['a test imports it but nothing starts it', 'composed', () =>
      rungOf(new Set(['leaf.ts']), tracked, mk([['leaf.test.ts', 'leaf.ts']]), new Set(['main.ts']), new Set(['leaf.test.ts']), new Set())]
  ];
  let bad = 0;
  for (const [what, want, run] of cases) {
    const got = run();
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${want.padEnd(9)} <- ${what}${ok ? '' : `  (read ${got})`}`);
  }
  const fired = new Set(cases.map(([, w]) => w));
  console.log(`\n${cases.length - bad} of ${cases.length} fixtures behave; rungs proved to fire: ${fired.size} of 5`);
  process.exitCode = bad === 0 && fired.size === 5 ? 0 : 1;
}

async function main(): Promise<void> {
  const [, , repo, factsPath, passPath] = process.argv;
  if (repo === '--self-test') {
    selfTest();
    return;
  }
  if (!repo || !factsPath) {
    console.error('usage: tsx build/p256/det/ladder.mts <repo> <facts.json> [pass.json]  |  --self-test');
    process.exit(2);
  }
  const t0 = Date.now();
  const tracked = execFileSync('git', ['-C', repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
  })
    .toString('utf8')
    .split('\0')
    .filter((p) => p.length > 0);
  const trackedSet = new Set(tracked);

  const facts = (JSON.parse(readFileSync(factsPath, 'utf8')) as { facts: Fact[] }).facts;
  const seeds = new Set(facts.filter((f) => f.category === 'entrypoint').map((f) => f.file));
  const testFiles = new Set(facts.filter((f) => f.category === 'test').map((f) => f.file));
  // A manifest or boundary fact NAMES a file when it sits in a manifest; the
  // file it names is the manifest's own directory root, which is the honest
  // reading of "a manifest fact names one" over a path-anchored component.
  const namedByManifest = new Set(
    facts.filter((f) => f.category === 'boundary' || f.category === 'entrypoint').map((f) => f.file)
  );

  const graph = await importGraph(repo, tracked);
  console.log(`LADDER over ${repo}`);
  console.log(`tracked ${tracked.length}, first-party import edges ${graph.edges}, entrypoint files ${seeds.size}, test files ${testFiles.size}\n`);

  let groups: { id: string; anchors: Set<string> }[];
  if (passPath !== undefined) {
    const pass = JSON.parse(readFileSync(passPath, 'utf8')) as {
      components: { id: string; evidence: string; facts: { at: string }[] }[];
    };
    groups = pass.components.map((c) => ({
      id: c.id,
      anchors: new Set(c.facts.map((x) => x.at.replace(/:\d+$/, '')))
    }));
    const written = new Map(pass.components.map((c) => [c.id, c.evidence]));
    console.log('component                 | written by hand        | COMPUTED   | anchors');
    console.log('--------------------------+-----------------------+------------+--------');
    const tally: Record<string, number> = {};
    for (const g of groups) {
      const r = rungOf(g.anchors, trackedSet, graph, seeds, testFiles, namedByManifest);
      tally[r] = (tally[r] ?? 0) + 1;
      console.log(`${g.id.padEnd(25)} | ${String(written.get(g.id) ?? '').padEnd(21)} | ${r.padEnd(10)} | ${g.anchors.size}`);
    }
    console.log(`\ncomputed: ${ORDER.filter((r) => tally[r]).map((r) => `${r} ${tally[r]}`).join(', ')}`);
  } else {
    const parts = new Map<string, Set<string>>();
    for (const rel of tracked) {
      const bits = rel.split('/');
      const key = bits.length === 1 ? '(root)' : bits.slice(0, Math.min(2, bits.length - 1)).join('/');
      const a = parts.get(key) ?? new Set<string>();
      a.add(rel);
      parts.set(key, a);
    }
    groups = [...parts]
      .filter(([, a]) => a.size >= 3)
      .map(([id, anchors]) => ({ id, anchors }));
    const tally: Record<string, number> = {};
    for (const g of groups) {
      const r = rungOf(g.anchors, trackedSet, graph, seeds, testFiles, namedByManifest);
      tally[r] = (tally[r] ?? 0) + 1;
    }
    console.log(`${groups.length} path-anchored parts (>= 3 files, the top two segments):`);
    for (const r of ORDER) console.log(`  ${r.padEnd(10)} ${String(tally[r] ?? 0).padStart(4)}`);
    const spread = ORDER.filter((r) => (tally[r] ?? 0) > 0).length;
    console.log(`\nrungs actually used: ${spread} of 5${spread <= 1 ? '  <-- A LADDER WITH ONE RUNG IS NOT A LADDER' : ''}`);
  }
  console.log(`\n${Date.now() - t0} ms`);
}

// `build/p256/mock/build-mock.mts` imports `importGraph` and `rungOf` from here,
// so the driver runs only when this file IS the program.
const invokedDirectly = (process.argv[1] ?? '').endsWith('ladder.mts');
if (invokedDirectly) {
  main().catch((err) => {
    console.error(String(err));
    process.exit(1);
  });
}
