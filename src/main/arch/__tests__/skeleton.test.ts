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
