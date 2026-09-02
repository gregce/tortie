/**
 * Rule P, the reading partition (Phase 201, research 77 section 4.2).
 *
 * The gate `npm run conformance:reading` pins the box set over three committed
 * fixtures. These prove each clause on the smallest tree that reaches it, and
 * the one floor the research did not write.
 */

import { describe, expect, it } from 'vitest';
import {
  READING_FOLD_ID,
  READING_MAX,
  aggregateGroupEdges,
  bandOf,
  groupOwnerWithDirs,
  readingPartition,
  type Group
} from '../skeleton';

const parseable = (p: string): boolean => /\.(ts|tsx|js|mjs|rs|swift|kt|py)$/.test(p);

/** `n` parsed files under `dir`, named so a sort is stable. */
function source(dir: string, n: number, ext = 'ts'): string[] {
  return Array.from({ length: n }, (_, i) => `${dir}/f${String(i).padStart(2, '0')}.${ext}`);
}
function prose(dir: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${dir}/p${String(i).padStart(2, '0')}.md`);
}

function cut(files: string[], extra: Partial<Parameters<typeof readingPartition>[0]> = {}) {
  return readingPartition({ subject: 's', trackedFiles: files, imports: [], parseable, ...extra });
}
const ids = (boxes: Group[]): string[] => boxes.map((b) => b.id);

describe('P1, the seeds', () => {
  it('makes each declared workspace a box and folds the root files', () => {
    const files = [
      'package.json',
      'README.md',
      ...source('packages/a', 4),
      ...source('packages/b', 4),
      ...source('packages/c', 4),
      ...source('packages/d', 4),
      ...source('packages/e', 4),
      'packages/README.md'
    ];
    const cutting = cut(files, { workspaces: ['packages/a', 'packages/b', 'packages/c', 'packages/d', 'packages/e'] });
    expect(cutting.seeded).toBe('npm workspaces');
    expect(ids(cutting.boxes)).toEqual(['other', 'packages-a', 'packages-b', 'packages-c', 'packages-d', 'packages-e']);
    // The leftover `packages/README.md` and the two root files are the fold.
    const other = cutting.boxes.find((b) => b.id === READING_FOLD_ID);
    expect(other?.files).toEqual(['README.md', 'package.json', 'packages/README.md']);
    expect(cutting.rootFiles).toBe(2);
    expect(cutting.folded).toEqual(['packages']);
  });

  it('never folds a seed, even one of a single file', () => {
    const files = [
      ...source('crates/big', 30, 'rs'),
      ...source('crates/one', 1, 'rs'),
      'crates/one/Cargo.toml',
      ...source('crates/two', 1, 'rs'),
      ...source('crates/three', 6, 'rs'),
      ...source('crates/four', 6, 'rs'),
      ...source('crates/five', 6, 'rs')
    ];
    const cutting = cut(files, { crates: ['crates/big', 'crates/one', 'crates/two', 'crates/three', 'crates/four', 'crates/five'] });
    expect(cutting.seeded).toBe('cargo crates');
    expect(ids(cutting.boxes)).toContain('crates-one');
    expect(ids(cutting.boxes)).toContain('crates-two');
    expect(cutting.folded).toEqual([]);
  });

  it('takes one seed alone as no seed at all', () => {
    const files = [...source('packages/a', 4), ...source('src', 4), ...source('lib', 4), ...source('app', 4), ...source('tool', 4)];
    const cutting = cut(files, { workspaces: ['packages/a'] });
    expect(cutting.seeded).toBe('directories');
    expect(ids(cutting.boxes)).toContain('packages-a');
  });
});

describe('P2, the split', () => {
  it('replaces a box holding more than half the parsed files with its children', () => {
    const files = [
      ...source('src/main', 10),
      ...source('src/renderer', 10),
      ...source('src/shared', 5),
      'src/index.ts',
      ...source('build', 6, 'mjs'),
      ...source('tools', 6, 'mjs'),
      ...source('docs', 3, 'mjs'),
      ...prose('docs', 30)
    ];
    const cutting = cut(files);
    // The one loose file under src is a box of its own for a moment and then
    // folds under P3, so the cut reads as the research measured it on gmux.
    expect(ids(cutting.boxes)).toEqual(['build', 'docs', 'other', 'src-main', 'src-renderer', 'src-shared', 'tools']);
    expect(cutting.folded).toEqual(['src']);
    expect(cutting.boxes.find((b) => b.id === READING_FOLD_ID)?.files).toEqual(['src/index.ts']);
  });

  it('keeps the loose files of a split box as a box when there are enough of them', () => {
    const files = [...source('src/main', 10), ...source('src/renderer', 10), ...source('src', 3), ...source('build', 6, 'mjs'), ...source('tools', 6, 'mjs'), ...source('lib', 6, 'mjs')];
    const cutting = cut(files);
    expect(ids(cutting.boxes)).toContain('src-loose');
    expect(cutting.boxes.find((b) => b.id === 'src-loose')?.dir).toBe('src');
  });

  it('stops at depth three whatever the share', () => {
    const files = [
      ...source('a/b/c/d', 40),
      ...source('a/b/c/e', 40),
      ...source('x', 4),
      ...source('y', 4),
      ...source('z', 4),
      ...source('w', 4)
    ];
    const cutting = cut(files);
    // a splits to a/b, a/b splits to a/b/c, and a/b/c is depth three: it stays
    // whole even though it holds most of the tree.
    expect(ids(cutting.boxes)).toContain('a-b-c');
    expect(ids(cutting.boxes)).not.toContain('a-b-c-d');
  });
});

describe('P3, the fold', () => {
  const six = [
    ...source('one', 5),
    ...source('two', 5),
    ...source('three', 5),
    ...source('four', 5),
    ...source('five', 5),
    ...source('six', 5)
  ];

  it('folds a box with no source and fewer than twenty files, and keeps one with twenty', () => {
    const cutting = cut([...six, ...prose('notes', 19), ...prose('research', 20)]);
    expect(cutting.folded).toEqual(['notes']);
    expect(ids(cutting.boxes)).toContain('research');
    expect(cutting.boxes.find((b) => b.id === READING_FOLD_ID)?.files.length).toBe(19);
  });

  it('raises the no-source threshold to five percent of a large tree', () => {
    const big = [...six, ...prose('huge', 600), ...prose('notes', 25)];
    // 655 files, five percent is 32: twenty five prose files fold now.
    const cutting = cut(big);
    expect(cutting.folded).toEqual(['notes']);
  });

  it('folds a box with fewer than three parsed files when enough source boxes remain', () => {
    const cutting = cut([...six, ...source('scripts', 2, 'mjs'), 'README.md']);
    expect(cutting.folded).toEqual(['scripts']);
    expect(cutting.boxes.find((b) => b.id === READING_FOLD_ID)?.files).toEqual([
      'README.md',
      'scripts/f00.mjs',
      'scripts/f01.mjs'
    ]);
  });

  it('keeps every folder of source in a tree so small that the fold would leave fewer than five', () => {
    // The floor: nine files across five folders draw five boxes, the Phase
    // 160 second fix round's rule, rather than one box called everything else.
    const young = ['src/app/main.ts', 'src/app/view.ts', 'src/core/engine.ts', 'src/core/util.ts', 'src/store/db.ts', 'src/net/http.ts', 'src/log/log.ts', 'vendor/lib/thing.ts', 'package.json'];
    const cutting = cut(young);
    expect(ids(cutting.boxes)).toEqual(['other', 'src-app', 'src-core', 'src-log', 'src-net', 'src-store', 'vendor-lib']);
    expect(cutting.folded).toEqual([]);
  });
});

describe('P4, the cap', () => {
  it('folds boxes with no source, smallest first, and never folds a box of source for the count', () => {
    const files: string[] = [];
    for (let i = 0; i < 13; i += 1) files.push(...source(`crate${String(i).padStart(2, '0')}`, 3, 'rs'));
    files.push(...prose('notesa', 22), ...prose('notesb', 24), ...prose('notesc', 26));
    const cutting = cut(files);
    // 13 source boxes stay whatever the cap says. Every prose box goes,
    // smallest first, and with the fold that is still 14: over the cap,
    // honestly, because a box of source is never folded for the count.
    expect(cutting.folded).toEqual(['notesa', 'notesb', 'notesc']);
    expect(cutting.boxes.length).toBe(14);
    expect(cutting.boxes.length).toBeGreaterThan(READING_MAX);
    // With ten crates the cap is met by folding only the two smallest.
    const fewer = cut(files.filter((f) => !f.startsWith('crate1')));
    expect(fewer.folded).toEqual(['notesa', 'notesb']);
    expect(ids(fewer.boxes)).toContain('notesc');
    expect(fewer.boxes.length).toBe(READING_MAX);
  });
});

describe('P5, the label', () => {
  it('names a box for the deepest directory all of its files share', () => {
    const files = [
      ...source('packages/a', 4),
      ...source('packages/b', 4),
      ...source('vendor/lib/thing', 4),
      ...source('x', 4),
      ...source('y', 4)
    ];
    const cutting = cut(files);
    const vendor = cutting.boxes.find((b) => b.dir.startsWith('vendor'));
    expect(vendor?.dir).toBe('vendor/lib/thing');
    expect(vendor?.id).toBe('vendor-lib-thing');
  });
});

describe('P6, the owner fallback', () => {
  const groups: Group[] = [
    { id: 'clients-mac', dir: 'clients/mac', files: ['clients/mac/App.swift'] },
    { id: 'clients-rookkit', dir: 'clients/RookKit', files: ['clients/RookKit/Package.swift'] }
  ];
  const imports = [
    // A Swift import resolved at target grain: the target is a directory.
    { fromPath: 'clients/mac/App.swift', toPath: 'clients/RookKit/Sources/RookKit' }
  ];

  it('puts a target that is not a tracked file in the box whose directory is its longest prefix', () => {
    const ownerOf = groupOwnerWithDirs(groups);
    expect(ownerOf('clients/RookKit/Sources/RookKit')).toBe('clients-rookkit');
    expect(ownerOf('clients/mac/App.swift')).toBe('clients-mac');
    expect(ownerOf('server/src/index.ts')).toBeUndefined();
  });

  it('draws the edge the plain owner map drops, and bands by it', () => {
    expect(aggregateGroupEdges(groups, imports)).toEqual([]);
    const ownerOf = groupOwnerWithDirs(groups);
    expect(aggregateGroupEdges(groups, imports, ownerOf)).toEqual([
      { from: 'clients-mac', to: 'clients-rookkit', count: 1 }
    ]);
    expect(bandOf(groups[1] as Group, groups, imports)).toBe('surface');
    expect(bandOf(groups[1] as Group, groups, imports, ownerOf)).toBe('foundation');
  });
});

describe('the whole rule', () => {
  it('gives the same boxes whatever order the files arrive in', () => {
    const files = [
      ...source('src/main', 10),
      ...source('src/renderer', 10),
      ...source('src/shared', 5),
      ...source('build', 6, 'mjs'),
      ...source('tools', 6, 'mjs'),
      ...prose('docs', 30),
      'package.json'
    ];
    const one = cut(files);
    const two = cut([...files].reverse());
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });
});
