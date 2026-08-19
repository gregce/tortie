/**
 * How one subtree answer becomes the Explorer's per-directory cache
 * (Phase 90.3).
 *
 * The cut is the part that matters. Get it wrong and a folder a person expanded
 * past the fetched depth empties itself on the next Refresh, or a folder that
 * was emptied over there keeps showing rows that are gone.
 */

import { describe, expect, it } from 'vitest';
import {
  depthUnder,
  groupRemoteEntries,
  mergeRemoteGroups,
  remoteNameOf,
  remoteParentOf
} from '../remote-plan';

const ROOT = '/Users/gdc/gmux';

describe('path arithmetic on the other machine', () => {
  it('names the parent and the last segment', () => {
    expect(remoteParentOf('/a/b/c')).toBe('/a/b');
    expect(remoteParentOf('/a')).toBe('/');
    expect(remoteParentOf('a')).toBeNull();
    expect(remoteNameOf('/a/b/c.ts')).toBe('c.ts');
  });

  it('counts how far under the root a path sits', () => {
    expect(depthUnder(ROOT, ROOT)).toBe(0);
    expect(depthUnder(ROOT, `${ROOT}/src`)).toBe(1);
    expect(depthUnder(ROOT, `${ROOT}/src/app/main.ts`)).toBe(3);
    expect(depthUnder(ROOT, '/elsewhere/src')).toBeNull();
    // A path that merely starts with the same characters is not under it.
    expect(depthUnder(ROOT, `${ROOT}-other/src`)).toBeNull();
  });
});

describe('one answer, cut into the cache the tree reads', () => {
  it('gives every directory a key, including one holding nothing', () => {
    const groups = groupRemoteEntries(ROOT, [
      { path: `${ROOT}/src`, kind: 'dir' },
      { path: `${ROOT}/src/a.ts`, kind: 'file' },
      { path: `${ROOT}/empty`, kind: 'dir' },
      { path: `${ROOT}/README.md`, kind: 'file' }
    ]);
    expect(Object.keys(groups).sort()).toEqual(
      [ROOT, `${ROOT}/empty`, `${ROOT}/src`].sort()
    );
    expect(groups[`${ROOT}/empty`]).toEqual([]);
    expect(groups[`${ROOT}/src`]).toEqual([
      { name: 'a.ts', path: `${ROOT}/src/a.ts`, kind: 'file' }
    ]);
    expect(groups[ROOT]?.map((one) => one.name).sort()).toEqual([
      'README.md',
      'empty',
      'src'
    ]);
  });

  it('drops an entry whose parent is not in the answer', () => {
    const groups = groupRemoteEntries(ROOT, [
      { path: '/somewhere/else/a.ts', kind: 'file' }
    ]);
    expect(groups[ROOT]).toEqual([]);
    expect(Object.keys(groups)).toEqual([ROOT]);
  });
});

describe('what a second answer is allowed to replace', () => {
  const cache = {
    [ROOT]: [{ name: 'src', path: `${ROOT}/src`, kind: 'dir' as const }],
    [`${ROOT}/src`]: [
      { name: 'gone.ts', path: `${ROOT}/src/gone.ts`, kind: 'file' as const }
    ],
    // Expanded PAST the fetched depth by a person, so this answer cannot
    // speak for it.
    [`${ROOT}/src/deep/deeper`]: [
      { name: 'kept.ts', path: `${ROOT}/src/deep/deeper/kept.ts`, kind: 'file' as const }
    ],
    // A different tab's folder, which nothing about this answer touches.
    '/elsewhere': [
      { name: 'other.ts', path: '/elsewhere/other.ts', kind: 'file' as const }
    ]
  };

  it('empties a covered directory the answer no longer names', () => {
    const next = mergeRemoteGroups(cache, ROOT, 3, {
      [ROOT]: [{ name: 'src', path: `${ROOT}/src`, kind: 'dir' }]
    });
    expect(next[`${ROOT}/src`]).toEqual([]);
  });

  it('leaves a directory deeper than the answer can speak for', () => {
    const next = mergeRemoteGroups(cache, ROOT, 3, { [ROOT]: [] });
    expect(next[`${ROOT}/src/deep/deeper`]).toEqual(
      cache[`${ROOT}/src/deep/deeper`]
    );
  });

  it('leaves a directory that is not under this answer at all', () => {
    const next = mergeRemoteGroups(cache, ROOT, 3, { [ROOT]: [] });
    expect(next['/elsewhere']).toEqual(cache['/elsewhere']);
  });

  it('adds every key the answer names', () => {
    const next = mergeRemoteGroups(cache, ROOT, 3, {
      [ROOT]: [],
      [`${ROOT}/fresh`]: [
        { name: 'new.ts', path: `${ROOT}/fresh/new.ts`, kind: 'file' }
      ]
    });
    expect(next[`${ROOT}/fresh`]).toEqual([
      { name: 'new.ts', path: `${ROOT}/fresh/new.ts`, kind: 'file' }
    ]);
  });
});
