/**
 * The computed evidence ladder (Phase 258, research 118 §7.2).
 *
 * `npm run conformance:evidence` pins the ladder over committed fixtures and
 * ablates every clause. These prove the decisions on the smallest graphs
 * that reach them: the seven planted graphs of `build/p256/det/ladder.mts
 * --self-test`, one per rung and the two `composed` shapes, so a rung that
 * CANNOT fire is told apart from one that never did; rule G's seeds over a
 * two unit tree; that a manifest file is never a seed; and that nothing a
 * person wrote can reach a rung, because the decision takes no string at all.
 */

import { describe, expect, it } from 'vitest';
import { ARCH_EVIDENCE_RUNGS, type ArchFact } from '@shared/arch';
import {
  buildImportGraph,
  declaredEntries,
  deepestUnitOf,
  entrypointFilesOf,
  namedByManifestOf,
  reachFrom,
  rungOf,
  seedsFor,
  seedsOfPart,
  type ArchEvidenceContext
} from '../evidence';

const graph = (pairs: [string, string][]) =>
  buildImportGraph(pairs.map(([fromPath, toPath]) => ({ fromPath, toPath, resolution: 'first-party' })));

const tracked = new Set(['main.ts', 'mid.ts', 'leaf.ts', 'lonely.ts', 'named.ts', 'leaf.test.ts']);

function ctx(over: Partial<ArchEvidenceContext> = {}): ArchEvidenceContext {
  return {
    tracked,
    graph: graph([]),
    seeds: new Set(['main.ts']),
    testFiles: new Set(),
    namedByManifest: new Set(),
    parseable: () => true,
    ...over
  };
}

describe('the five rungs, each proved to fire on a planted graph', () => {
  it('off-repo: an anchor nothing in the repository tracks', () => {
    expect(rungOf(['vendor/other.ts'], ctx()).rung).toBe('off-repo');
  });

  it('declared: here, imported by nothing, named by no manifest', () => {
    expect(rungOf(['lonely.ts'], ctx()).rung).toBe('declared');
  });

  it('composed: imported, but by nothing that starts', () => {
    expect(rungOf(['leaf.ts'], ctx({ graph: graph([['mid.ts', 'leaf.ts']]) })).rung).toBe('composed');
  });

  it('composed: named by a manifest and imported by nothing', () => {
    expect(rungOf(['named.ts'], ctx({ namedByManifest: new Set(['named.ts']) })).rung).toBe('composed');
  });

  it('reached: on a path from something that starts', () => {
    const g = graph([
      ['main.ts', 'mid.ts'],
      ['mid.ts', 'leaf.ts']
    ]);
    expect(rungOf(['leaf.ts'], ctx({ graph: g })).rung).toBe('reached');
  });

  it('tested: reached, and a test file imports it', () => {
    const g = graph([
      ['main.ts', 'mid.ts'],
      ['mid.ts', 'leaf.ts'],
      ['leaf.test.ts', 'leaf.ts']
    ]);
    expect(rungOf(['leaf.ts'], ctx({ graph: g, testFiles: new Set(['leaf.test.ts']) })).rung).toBe('tested');
  });

  it('composed, not tested: a test imports it but nothing starts it, the order of the ladder', () => {
    const g = graph([['leaf.test.ts', 'leaf.ts']]);
    expect(rungOf(['leaf.ts'], ctx({ graph: g, testFiles: new Set(['leaf.test.ts']) })).rung).toBe('composed');
  });

  it('every one of the five words fires across the seven, and there is no sixth', () => {
    expect([...ARCH_EVIDENCE_RUNGS]).toEqual(['off-repo', 'declared', 'composed', 'reached', 'tested']);
    const fired = new Set([
      rungOf(['vendor/other.ts'], ctx()).rung,
      rungOf(['lonely.ts'], ctx()).rung,
      rungOf(['leaf.ts'], ctx({ graph: graph([['mid.ts', 'leaf.ts']]) })).rung,
      rungOf(['leaf.ts'], ctx({ graph: graph([['main.ts', 'leaf.ts']]) })).rung,
      rungOf(
        ['leaf.ts'],
        ctx({ graph: graph([['main.ts', 'leaf.ts'], ['leaf.test.ts', 'leaf.ts']]), testFiles: new Set(['leaf.test.ts']) })
      ).rung
    ]);
    expect(fired.size).toBe(5);
    for (const word of fired) expect(ARCH_EVIDENCE_RUNGS).toContain(word);
  });
});

describe('the counts behind the rung', () => {
  it('counts the parsed anchors reached and the parsed anchors a test imports, and the tracked seeds', () => {
    const g = graph([
      ['main.ts', 'mid.ts'],
      ['leaf.test.ts', 'leaf.ts']
    ]);
    const reading = rungOf(
      ['main.ts', 'mid.ts', 'leaf.ts', 'lonely.ts', 'gone.ts'],
      ctx({ graph: g, testFiles: new Set(['leaf.test.ts']), seeds: new Set(['main.ts', 'built/out.js']) })
    );
    // gone.ts is not tracked and built/out.js is not tracked: neither counts.
    expect(reading).toEqual({ rung: 'tested', anchors: 4, parsed: 4, reached: 2, tested: 1, seeds: 1 });
  });

  it('counts only what this build parses, so a prose file is an anchor and not a parsed one', () => {
    const reading = rungOf(['main.ts', 'lonely.ts'], ctx({ parseable: (p) => p === 'main.ts' }));
    expect(reading.anchors).toBe(2);
    expect(reading.parsed).toBe(1);
    expect(reading.reached).toBe(1);
  });

  it('a seed inside the anchors is reached by definition, and the walk includes the seeds', () => {
    expect(reachFrom(graph([['main.ts', 'mid.ts']]), new Set(['main.ts', 'nowhere.ts']), tracked)).toEqual(
      new Set(['main.ts', 'mid.ts'])
    );
    expect(rungOf(['main.ts'], ctx()).rung).toBe('reached');
  });
});

describe('the graph', () => {
  it('keeps first-party edges with a target, drops self edges and everything unresolved', () => {
    const g = buildImportGraph([
      { fromPath: 'a.ts', toPath: 'b.ts', resolution: 'first-party' },
      { fromPath: 'a.ts', toPath: 'b.ts', resolution: 'first-party' },
      { fromPath: 'a.ts', toPath: 'a.ts', resolution: 'first-party' },
      { fromPath: 'a.ts', toPath: null, resolution: 'external' },
      { fromPath: 'a.ts', toPath: 'c.ts', resolution: 'unresolved' }
    ]);
    expect(g.edges).toBe(1);
    expect([...(g.out.get('a.ts') ?? [])]).toEqual(['b.ts']);
    expect([...(g.into.get('b.ts') ?? [])]).toEqual(['a.ts']);
  });
});

// ---------------------------------------------------------------------------
// Rule G, the seeds (SPEC §2)
// ---------------------------------------------------------------------------

function fact(over: Partial<ArchFact> & Pick<ArchFact, 'category' | 'kind' | 'file'>): ArchFact {
  return { subject: '', line: 1, rule: '', evidence: '', viaWrapper: false, ...over };
}

const twoUnitTracked = new Set([
  'package.json',
  'a/package.json',
  'a/src/main.ts',
  'a/src/index.ts',
  'b/package.json',
  'b/src/index.ts',
  'b/src/x.ts',
  'b/src/x.test.ts',
  '.github/workflows/ci.yml'
]);

const twoUnitFacts: ArchFact[] = [
  fact({ category: 'boundary', kind: 'workspace', file: 'package.json', subject: 'npm workspaces declared', rule: 'boundary.pkg.workspaces' }),
  fact({ category: 'entrypoint', kind: 'package-main', file: 'a/package.json', subject: 'node entry ./out/index.js', rule: 'entrypoint.pkg.main' }),
  fact({ category: 'entrypoint', kind: 'script', file: 'a/package.json', subject: 'npm run build', rule: 'entrypoint.pkg.script' }),
  fact({ category: 'entrypoint', kind: 'composition-root', file: 'a/src/main.ts', subject: 'composes express', rule: 'entrypoint.composition' }),
  fact({ category: 'entrypoint', kind: 'package-main', file: 'b/package.json', subject: 'node entry ./src/index.ts', rule: 'entrypoint.pkg.main' }),
  fact({ category: 'entrypoint', kind: 'ci-job', file: '.github/workflows/ci.yml', subject: 'CI job test', rule: 'entrypoint.ci.job' }),
  fact({ category: 'boundary', kind: 'worker', file: 'b/src/x.ts', subject: 'starts a Worker', rule: 'boundary.worker' }),
  fact({ category: 'test', kind: 'test-case', file: 'b/src/x.test.ts', subject: 'it x', rule: 'test.vitest' })
];

const units = [
  { id: 'unit:a', dir: 'a' },
  { id: 'unit:b', dir: 'b' }
];

describe('rule G, the seeds', () => {
  it('reads the file a manifest DECLARES, only when tracked, and never the manifest itself', () => {
    const declared = declaredEntries(twoUnitFacts, twoUnitTracked);
    // a's entry is a built artefact and declares no seed; b's is tracked.
    expect([...declared]).toEqual(['b/src/index.ts']);
  });

  it('gives each unit its own source starts and declared entries and nothing else', () => {
    const seeds = seedsFor(units, entrypointFilesOf(twoUnitFacts), declaredEntries(twoUnitFacts, twoUnitTracked), twoUnitTracked);
    expect([...(seeds.get('unit:a') ?? [])]).toEqual(['a/src/main.ts']);
    expect([...(seeds.get('unit:b') ?? [])]).toEqual(['b/src/index.ts']);
    // A CI job, an npm script, a worker start and the manifest files themselves seed nothing.
    const all = new Set([...(seeds.get('unit:a') ?? []), ...(seeds.get('unit:b') ?? [])]);
    for (const never of ['.github/workflows/ci.yml', 'a/package.json', 'b/package.json', 'package.json', 'b/src/x.ts']) {
      expect(all.has(never)).toBe(false);
    }
  });

  it('reaches a part only from what ITS OWN unit starts, and across a unit it reads composed', () => {
    const g = graph([
      ['a/src/main.ts', 'b/src/x.ts'],
      ['a/src/main.ts', 'a/src/index.ts'],
      ['b/src/x.test.ts', 'b/src/x.ts']
    ]);
    const seeds = seedsFor(units, entrypointFilesOf(twoUnitFacts), declaredEntries(twoUnitFacts, twoUnitTracked), twoUnitTracked);
    const unitOf = deepestUnitOf(units);
    const of = (files: string[]) =>
      rungOf(
        files,
        ctx({
          tracked: twoUnitTracked,
          graph: g,
          seeds: seedsOfPart(files, unitOf, seeds),
          testFiles: new Set(['b/src/x.test.ts']),
          namedByManifest: namedByManifestOf(twoUnitFacts)
        })
      ).rung;
    // b/src/x.ts is reached from a's main and imported by a test, but b starts
    // nothing that reaches it: composed, never tested.
    expect(of(['b/src/x.ts'])).toBe('composed');
    // b/src/index.ts is what b's manifest declares: reached.
    expect(of(['b/src/index.ts'])).toBe('reached');
    // a's main is a's own seed.
    expect(of(['a/src/index.ts'])).toBe('reached');
    // The manifest file is named by a fact and imported by nothing: composed.
    expect(of(['a/package.json'])).toBe('composed');
  });

  it('a part under no unit has no seeds and its hover can say so', () => {
    const seeds = seedsFor(units, entrypointFilesOf(twoUnitFacts), new Set(), twoUnitTracked);
    const reading = rungOf(['package.json'], ctx({ tracked: twoUnitTracked, seeds: seedsOfPart(['package.json'], deepestUnitOf(units), seeds) }));
    expect(reading.seeds).toBe(0);
    expect(reading.rung).toBe('declared');
  });

  it('owns a path by the deepest unit whose directory is a prefix, the root matching everything', () => {
    const owner = deepestUnitOf([{ dir: '' }, { dir: 'a' }, { dir: 'a/b' }]);
    expect(owner('a/b/c.ts')?.dir).toBe('a/b');
    expect(owner('a/x.ts')?.dir).toBe('a');
    expect(owner('ab/x.ts')?.dir).toBe('');
    expect(deepestUnitOf([{ dir: 'a' }])('docs/x.md')).toBeNull();
  });
});

describe('nothing a person wrote can reach a rung', () => {
  it('takes sets of paths and a graph and nothing else, so a description saying tested moves nothing', () => {
    const before = rungOf(['lonely.ts'], ctx());
    // There is no field to plant "tested" into: the context has no string.
    const keys = Object.keys(ctx()).sort();
    expect(keys).toEqual(['graph', 'namedByManifest', 'parseable', 'seeds', 'testFiles', 'tracked']);
    expect(before.rung).toBe('declared');
  });
});
