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
  bandOf,
  classify,
  draftSkeleton,
  groupId,
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
