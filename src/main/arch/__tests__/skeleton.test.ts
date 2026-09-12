/**
 * The deterministic skeleton (Phase 63).
 *
 * The gate proves the bytes repeat over the fixture. These prove the parts of
 * the generator that decide what the draft says: the grouping, the ranking that
 * chooses what folds when the count runs over, the classifier that fills only
 * what is computable, and the promise it deliberately does not make.
 */

import { describe, expect, it } from 'vitest';
import {
  SKELETON_TARGET,
  aggregateGroupEdges,
  bandOf,
  classify,
  draftSkeleton,
  groupId,
  groupOwners,
  groupTree,
  mergeToTarget,
  rankGroups
} from '../skeleton';

const tree = [
  'src/app/main.ts',
  'src/app/view.ts',
  'src/core/engine.ts',
  'src/core/util.ts',
  'src/store/db.ts',
  'src/net/http.ts',
  'src/log/log.ts',
  'vendor/lib/thing.ts',
  'package.json'
];

const imports = [
  { fromPath: 'src/app/main.ts', toPath: 'src/core/engine.ts' },
  { fromPath: 'src/app/view.ts', toPath: 'src/core/engine.ts' },
  { fromPath: 'src/core/engine.ts', toPath: 'src/store/db.ts' },
  { fromPath: 'src/net/http.ts', toPath: 'src/core/util.ts' }
];

describe('the grouping', () => {
  it('goes deeper until there are enough parts to be worth drawing', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    expect(groups.length).toBeGreaterThanOrEqual(SKELETON_TARGET.min);
    expect(groups.map((g) => g.id)).toContain('src-app');
  });

  it('draws a small nested repository as its real folders, never as nothing', () => {
    // The Phase 160 second fix. Descending past depth 1 used to drop every
    // file shallower than the current depth, so a repository of just src/ and
    // test/ composed zero groups and the map tab called it flat, which was
    // false. Fewer than SKELETON_TARGET.min true boxes beat one false
    // sentence.
    const young = ['src/main.ts', 'src/util.ts', 'test/main.test.ts'];
    const groups = groupTree({ subject: 's', trackedFiles: young, imports: [] });
    expect(groups.map((g) => g.dir)).toEqual(['src', 'test']);
    expect(groups.flatMap((g) => g.files).sort()).toEqual([...young].sort());
  });

  it('never loses a foldered file when the loop descends past its depth', () => {
    const mixed = [
      'README.md',
      'src/index.ts',
      'src/main/a.ts',
      'src/renderer/b.ts',
      'src/shared/c.ts'
    ];
    const groups = groupTree({ subject: 's', trackedFiles: mixed, imports: [] });
    // src/index.ts keeps its deepest available prefix instead of vanishing.
    expect(groups.map((g) => g.dir)).toEqual([
      'src',
      'src/main',
      'src/renderer',
      'src/shared'
    ]);
    // The top level file is the only one outside every group.
    expect(groups.flatMap((g) => g.files).sort()).toEqual(
      mixed.filter((p) => p.includes('/')).sort()
    );
  });

  it('composes zero groups only when no tracked file sits inside a folder', () => {
    // This is the one shape the map tab may call flat, so the sentence about
    // every file sitting at the top level stays exactly true.
    const flat = ['a.ts', 'b.ts', 'README.md'];
    expect(groupTree({ subject: 's', trackedFiles: flat, imports: [] })).toEqual([]);
  });

  it('draws the declared packages when a repository declares any', () => {
    const groups = groupTree({
      subject: 's',
      trackedFiles: ['packages/a/x.ts', 'packages/b/y.ts'],
      imports: [],
      workspaces: ['packages/a', 'packages/b', 'packages/c', 'packages/d', 'packages/e']
    });
    expect(groups.map((g) => g.dir)).toEqual([
      'packages/a',
      'packages/b',
      'packages/c',
      'packages/d',
      'packages/e'
    ]);
  });

  it('makes an id out of a directory the same way every time', () => {
    expect(groupId('src/main/arch')).toBe('src-main-arch');
    expect(groupId('')).toBe('root');
  });
});

describe('the ranking and the fold', () => {
  it('ranks a part the rest of the tree leans on above one nothing names', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    const rank = rankGroups(groups, imports);
    const core = rank.get('src-core') ?? 0;
    const log = rank.get('src-log') ?? 0;
    expect(core).toBeGreaterThan(log);
  });

  it('never leaves more parts than a first draft can hold', () => {
    const wide = Array.from({ length: 30 }, (_, i) => `src/p${i}/file.ts`);
    const groups = groupTree({ subject: 's', trackedFiles: wide, imports: [] });
    const merged = mergeToTarget(groups, rankGroups(groups, []));
    expect(merged.length).toBeLessThanOrEqual(SKELETON_TARGET.max);
    const kept = merged.flatMap((g) => g.files).sort();
    expect(kept).toEqual([...wide].sort());
  });
});

describe('the classifier and the bands', () => {
  it('fills only what is computable', () => {
    expect(classify({ id: 'v', dir: 'vendor/lib', files: [] })).toBe('vendored');
    expect(classify({ id: 'o', dir: 'out/main', files: [] })).toBe('generated');
    expect(classify({ id: 'n', dir: 'src/native', files: ['src/native/build.rs'] })).toBe(
      'native'
    );
    expect(classify({ id: 'a', dir: 'src/app', files: ['src/app/main.ts'] })).toBe(
      'first-party'
    );
  });

  it('reads the band off the import graph rather than off a directory name', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    const app = groups.find((g) => g.id === 'src-app');
    const store = groups.find((g) => g.id === 'src-store');
    expect(app === undefined ? '' : bandOf(app, groups, imports)).toBe('surface');
    expect(store === undefined ? '' : bandOf(store, groups, imports)).toBe('foundation');
  });
});

describe('the draft itself', () => {
  const input = { subject: 'A test repository', trackedFiles: tree, imports };

  it('gives the same bytes twice', () => {
    expect(JSON.stringify(draftSkeleton(input))).toBe(
      JSON.stringify(draftSkeleton(input))
    );
  });

  it('opens one buffer per file, and one per part', () => {
    const buffers = draftSkeleton(input);
    expect(buffers[0]?.path).toBe('docs/arch/contract.json');
    expect(buffers.some((b) => b.path === 'docs/arch/edges.json')).toBe(true);
    expect(buffers.some((b) => b.path === 'docs/arch/baseline.json')).toBe(true);
    expect(
      buffers.filter((b) => b.path.startsWith('docs/arch/components/')).length
    ).toBeGreaterThanOrEqual(SKELETON_TARGET.min);
  });

  it('writes every observed import as a permission and never as a promise', () => {
    const edgesBuffer = draftSkeleton(input).find(
      (b) => b.path === 'docs/arch/edges.json'
    );
    const parsed = JSON.parse(edgesBuffer?.text ?? '{}') as {
      edges: { rule: string; note: string }[];
    };
    expect(parsed.edges.length).toBeGreaterThan(0);
    for (const edge of parsed.edges) {
      expect(edge.rule).toBe('may');
      expect(edge.note).toContain('not as a promise');
      expect(edge.note).toContain('5 to 10');
    }
  });

  it('starts the baseline empty, because Tortie never accepts anything for a person', () => {
    const baseline = draftSkeleton(input).find(
      (b) => b.path === 'docs/arch/baseline.json'
    );
    expect(JSON.parse(baseline?.text ?? '{}')).toEqual({ accepted: [] });
  });
});

describe('the shared rollup (Phase 160)', () => {
  it('says which group owns each path, and nothing owns a stray', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    const owner = groupOwners(groups);
    expect(owner.get('src/app/main.ts')).toBe('src-app');
    expect(owner.get('vendor/lib/thing.ts')).toBe('vendor-lib');
    expect(owner.get('nowhere/else.ts')).toBeUndefined();
  });

  it('rolls file imports up to group edges with counts, heaviest first', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    const edges = aggregateGroupEdges(groups, imports);
    expect(edges[0]).toEqual({ from: 'src-app', to: 'src-core', count: 2 });
    expect(edges).toContainEqual({ from: 'src-core', to: 'src-store', count: 1 });
    expect(edges).toContainEqual({ from: 'src-net', to: 'src-core', count: 1 });
    expect(edges.length).toBe(3);
  });

  it('drops interior imports and imports with an unowned end', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    const edges = aggregateGroupEdges(groups, [
      { fromPath: 'src/core/engine.ts', toPath: 'src/core/util.ts' },
      { fromPath: 'nowhere/else.ts', toPath: 'src/core/util.ts' },
      { fromPath: 'src/core/engine.ts', toPath: 'nowhere/else.ts' }
    ]);
    expect(edges).toEqual([]);
  });

  it('gives the same edges whatever order the imports arrive in', () => {
    const groups = groupTree({ subject: 's', trackedFiles: tree, imports });
    const shuffled = [...imports].reverse();
    expect(JSON.stringify(aggregateGroupEdges(groups, shuffled))).toBe(
      JSON.stringify(aggregateGroupEdges(groups, imports))
    );
  });
});

describe('the classifier majority rule (Phase 160)', () => {
  it('no longer lets one generated file flip a whole group', () => {
    const files = [
      'src/icons.generated.ts',
      'src/a.ts',
      'src/b.ts',
      'src/c.ts'
    ];
    expect(classify({ id: 's', dir: 'src', files })).toBe('first-party');
  });

  it('still calls a group generated when most of it is', () => {
    const files = ['src/a.generated.ts', 'src/b.generated.ts', 'src/c.ts'];
    expect(classify({ id: 's', dir: 'src', files })).toBe('generated');
  });

  it('keeps the directory name tests whole, however few files', () => {
    expect(
      classify({ id: 'v', dir: 'vendor/lib', files: ['vendor/lib/one.ts'] })
    ).toBe('vendored');
  });
});

// ---------------------------------------------------------------------------
// Rule Q, the units and the regions, and the draft over rule P (Phase 258)
// ---------------------------------------------------------------------------

import type { ArchFact } from '@shared/arch';
import {
  READING_ELSEWHERE_SUB,
  READING_FOLD_ID,
  READING_ONE_THING_SUB,
  readingPartition,
  regionCut,
  unitsOf
} from '../skeleton';

const parseable = (p: string): boolean => /\.(ts|tsx|js|mjs|rs|py|swift)$/.test(p);

function fact(over: Partial<ArchFact> & Pick<ArchFact, 'category' | 'kind' | 'file'>): ArchFact {
  return { subject: '', line: 1, rule: '', evidence: '', viaWrapper: false, ...over };
}

/** One thing: a root package whose main is tracked, a worker, a fixture crate under build/. */
const oneUnitTree = [
  'package.json',
  'README.md',
  'src/index.ts',
  'src/app.ts',
  'src/worker.ts',
  'src/pool.ts',
  'build/probe.mjs',
  'build/fixtures/x/Cargo.toml',
  'build/fixtures/x/src/lib.rs'
];
const oneUnitFacts: ArchFact[] = [
  fact({ category: 'entrypoint', kind: 'package-main', file: 'package.json', subject: 'node entry ./src/index.ts', line: 3, rule: 'entrypoint.pkg.main' }),
  fact({ category: 'boundary', kind: 'worker', file: 'src/pool.ts', subject: 'starts a Worker', line: 9, rule: 'boundary.worker' }),
  fact({ category: 'boundary', kind: 'worker', file: 'src/app.ts', subject: 'starts a Worker', line: 4, rule: 'boundary.worker' }),
  fact({ category: 'boundary', kind: 'library', file: 'build/fixtures/x/Cargo.toml', subject: 'cargo library target', line: 6, rule: 'boundary.cargo.lib' }),
  fact({ category: 'effect', kind: 'spawn', file: 'src/app.ts', subject: 'runs git', line: 12, rule: 'effect.spawn.node' })
];

/** Two units: npm workspaces a and b, and a docs box under no unit. */
const twoUnitTree = [
  'package.json',
  'a/package.json',
  'a/src/main.ts',
  'a/src/index.ts',
  'a/src/lib.ts',
  'b/package.json',
  'b/src/index.ts',
  'b/src/x.ts',
  'b/src/y.ts',
  ...Array.from({ length: 25 }, (_, i) => `docs/p${String(i).padStart(2, '0')}.md`)
];
const twoUnitFacts: ArchFact[] = [
  fact({ category: 'boundary', kind: 'workspace', file: 'package.json', subject: 'npm workspaces declared', rule: 'boundary.pkg.workspaces' }),
  fact({ category: 'entrypoint', kind: 'package-main', file: 'a/package.json', subject: 'node entry ./src/index.ts', rule: 'entrypoint.pkg.main' }),
  fact({ category: 'entrypoint', kind: 'package-main', file: 'b/package.json', subject: 'node entry ./src/index.ts', rule: 'entrypoint.pkg.main' }),
  fact({ category: 'boundary', kind: 'worker', file: 'b/src/x.ts', subject: 'starts a Worker', line: 2, rule: 'boundary.worker' })
];

describe('rule Q, the units', () => {
  it('makes a unit of what a manifest declares and a program starts, never of a module root', () => {
    const units = unitsOf({
      subject: 'one',
      trackedFiles: oneUnitTree,
      facts: [
        ...oneUnitFacts,
        fact({ category: 'boundary', kind: 'module-root', file: 'src/index.ts', subject: 'module root', rule: 'boundary.path.module-root' })
      ]
    });
    expect(units.map((u) => [u.id, u.dir, u.kind, u.sub])).toEqual([
      ['unit:', '', 'package', 'npm package'],
      ['unit:build/fixtures/x', 'build/fixtures/x', 'library', 'cargo library']
    ]);
    expect(units[0]?.label).toBe('one');
    expect(units[1]?.label).toBe('x');
  });

  it('labels a unit by its declared name, else its last segment', () => {
    const units = unitsOf({
      subject: 'two',
      trackedFiles: twoUnitTree,
      facts: twoUnitFacts,
      workspaces: ['a', 'b'],
      names: new Map([['a', '@two/alpha']])
    });
    expect(units.map((u) => u.label)).toEqual(['@two/alpha', 'b']);
  });

  it('puts a source main in the nearest manifest directory of its OWN family, never any manifest', () => {
    const files = ['package.json', 'docs/pen/attack.py', 'tools/go.mod', 'tools/cmd/main.go'];
    const units = unitsOf({
      subject: 's',
      trackedFiles: files,
      facts: [
        fact({ category: 'entrypoint', kind: 'main', file: 'docs/pen/attack.py', subject: '__main__', rule: 'entrypoint.python.dunder-main' }),
        fact({ category: 'entrypoint', kind: 'main', file: 'tools/cmd/main.go', subject: 'func main', rule: 'entrypoint.go.main' })
      ]
    });
    expect(units.map((u) => [u.dir, u.sub])).toEqual([
      ['docs/pen', 'python program'],
      ['tools', 'go program']
    ]);
  });

  it('never makes a unit of a worker, a thread, a service or the workspace root', () => {
    const units = unitsOf({ subject: 's', trackedFiles: twoUnitTree, facts: twoUnitFacts, workspaces: ['a', 'b'] });
    expect(units.map((u) => u.dir)).toEqual(['a', 'b']);
  });
});

describe('rule Q, the regions', () => {
  function cutOf(tree: string[], facts: ArchFact[], extra: { workspaces?: string[] } = {}, subject = 's') {
    const boxes = readingPartition({ subject, trackedFiles: tree, imports: [], parseable, ...extra }).boxes;
    const units = unitsOf({ subject, trackedFiles: tree, facts, ...extra });
    return regionCut({ boxes, units, facts, parseable });
  }

  it('Q4: a repository that builds one thing draws one region, with its starts on one line', () => {
    const cut = cutOf(oneUnitTree, oneUnitFacts);
    expect(cut.oneThing).toBe(true);
    expect(cut.regions.map((r) => r.id)).toEqual(['unit:', 'outside']);
    const one = cut.regions[0];
    expect(one?.sub).toBe(READING_ONE_THING_SUB);
    expect(one?.groupIds.sort()).toEqual(['build', 'other', 'src']);
    // Two worker starts, then the boxless fixture crate as a start of the region owning it.
    expect(one?.starts.map((s) => `${s.kind}:${s.label}:${s.file}:${String(s.line)}`)).toEqual([
      'worker:starts a Worker:src/app.ts:4',
      'worker:starts a Worker:src/pool.ts:9',
      'unit:cargo library:build/fixtures/x/Cargo.toml:6'
    ]);
    expect(one?.files).toBe(oneUnitTree.length);
    expect(one?.parsed).toBe(6);
  });

  it('Q2 and Q3: a box belongs to the deepest unit above it, and one under no unit goes to Elsewhere', () => {
    const cut = cutOf(twoUnitTree, twoUnitFacts, { workspaces: ['a', 'b'] });
    expect(cut.oneThing).toBe(false);
    expect(cut.regions.map((r) => [r.id, r.groupIds])).toEqual([
      ['unit:a', ['a']],
      ['unit:b', ['b']],
      ['elsewhere', ['docs', 'other']]
    ]);
    const elsewhere = cut.regions.find((r) => r.id === 'elsewhere');
    expect(elsewhere?.sub).toBe(READING_ELSEWHERE_SUB);
    expect(elsewhere?.starts).toEqual([]);
    const b = cut.regions.find((r) => r.id === 'unit:b');
    expect(b?.starts.map((s) => s.file)).toEqual(['b/src/x.ts']);
  });

  it('Q6: the outside band is drawn only when a spawn, a network fact or a port exists', () => {
    expect(cutOf(twoUnitTree, twoUnitFacts, { workspaces: ['a', 'b'] }).regions.some((r) => r.id === 'outside')).toBe(false);
    const withPort = [...twoUnitFacts, fact({ category: 'surface', kind: 'port', file: 'a/src/main.ts', subject: 'exposes port 80', rule: 'surface.docker.expose' })];
    const regions = cutOf(twoUnitTree, withPort, { workspaces: ['a', 'b'] }).regions;
    expect(regions[regions.length - 1]?.id).toBe('outside');
    expect(regions[regions.length - 1]?.groupIds).toEqual([]);
  });

  it('Q1: seventy-five module roots make no region and move nothing', () => {
    const plant = Array.from({ length: 75 }, (_, i) =>
      fact({ category: 'boundary', kind: 'module-root', file: `docs/p${String(i % 25).padStart(2, '0')}.md`, subject: 'module root', line: i + 1, rule: 'boundary.path.module-root' })
    );
    const clean = cutOf(twoUnitTree, twoUnitFacts, { workspaces: ['a', 'b'] });
    const planted = cutOf(twoUnitTree, [...twoUnitFacts, ...plant], { workspaces: ['a', 'b'] });
    expect(JSON.stringify(planted.regions)).toBe(JSON.stringify(clean.regions));
  });

  it('Q7: units with boxes come first by parsed files, then Elsewhere, then Outside', () => {
    const facts = [...twoUnitFacts, fact({ category: 'network', kind: 'client', file: 'a/src/main.ts', subject: 'fetches', rule: 'network.fetch' })];
    const cut = cutOf(twoUnitTree, facts, { workspaces: ['a', 'b'] });
    expect(cut.regions.map((r) => r.id)).toEqual(['unit:a', 'unit:b', 'elsewhere', 'outside']);
  });
});

describe('the draft over rule P (F1 closed, Phase 258)', () => {
  const draftInput = { subject: 'A test repository', trackedFiles: tree, imports, parseable };

  it('writes one component per rule P box, with the box id, so the map can paint it', () => {
    const cut = readingPartition(draftInput);
    const buffers = draftSkeleton(draftInput);
    const ids = buffers
      .filter((b) => b.path.startsWith('docs/arch/components/'))
      .map((b) => (JSON.parse(b.text) as { id: string; anchors: string[] }))
      .map((c) => c.id)
      .sort();
    const boxIds = cut.boxes.map((b) => b.id).sort();
    // The fold here holds only root files and one small vendored directory.
    expect(ids).toEqual(boxIds.filter((id) => id !== READING_FOLD_ID || cut.folded.length > 0));
  });

  it('anchors every non fold box at its directory and the fold at the folded directories', () => {
    const cut = readingPartition(draftInput);
    const components = draftSkeleton(draftInput)
      .filter((b) => b.path.startsWith('docs/arch/components/'))
      .map((b) => JSON.parse(b.text) as { id: string; name: string; anchors: string[]; description: string });
    for (const c of components) {
      const box = cut.boxes.find((b) => b.id === c.id);
      expect(box).toBeDefined();
      if (c.id === READING_FOLD_ID) {
        expect(c.anchors).toEqual(cut.folded);
        expect(c.name).toBe('everything else');
        expect(c.description).toContain('anchored nowhere');
      } else {
        expect(c.anchors).toEqual([box?.dir]);
        expect(c.name).toBe(box?.dir);
      }
    }
  });

  it('anchors a box with another nested under it one level deep, so a majority lands in exactly that box', () => {
    // P2 splits src and leaves its loose files as `src-loose` with dir `src`.
    const files = [
      'src/index.ts',
      'src/util.ts',
      ...Array.from({ length: 6 }, (_, i) => `src/main/m${String(i)}.ts`),
      ...Array.from({ length: 6 }, (_, i) => `src/renderer/r${String(i)}.ts`),
      'README.md'
    ];
    const cut = readingPartition({ subject: 's', trackedFiles: files, imports: [], parseable });
    expect(cut.boxes.map((b) => b.id)).toContain('src-loose');
    const loose = draftSkeleton({ subject: 's', trackedFiles: files, imports: [], parseable })
      .map((b) => JSON.parse(b.text) as { id?: string; anchors?: string[] })
      .find((c) => c.id === 'src-loose');
    expect(loose?.anchors).toEqual(['src/*']);
  });

  it('gives the same bytes twice over rule P too', () => {
    expect(JSON.stringify(draftSkeleton(draftInput))).toBe(JSON.stringify(draftSkeleton(draftInput)));
  });
});
