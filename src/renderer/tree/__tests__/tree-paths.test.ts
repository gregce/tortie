/**
 * Path arithmetic for the explorer's file operations.
 *
 * These are the rules a drop and a rename are BUILT from, and getting one
 * wrong does not throw — it silently feeds the model a path set that no
 * longer matches the disk, and the next watcher tick issues nonsense against
 * it. So the canonical/relative spelling, the subtree carry, and the
 * "already there" skip each get pinned here.
 */

import { describe, expect, it } from 'vitest';
import {
  absOf,
  baseNameOf,
  destinationFor,
  invertMoves,
  isDirPath,
  parentOf,
  planMoves,
  remapPath,
  remapPathSet,
  toCanonical,
  toRel,
  touchedDirs,
  uniqueName
} from '../tree-paths';

describe('the two spellings', () => {
  it('strips and restores the canonical directory slash', () => {
    expect(toRel('src/')).toBe('src');
    expect(toRel('src/app.tsx')).toBe('src/app.tsx');
    expect(toCanonical('src', true)).toBe('src/');
    expect(toCanonical('src/', true)).toBe('src/');
    expect(toCanonical('src/app.tsx', false)).toBe('src/app.tsx');
    expect(isDirPath('src/')).toBe(true);
    expect(isDirPath('src/app.tsx')).toBe(false);
  });

  it('names the leaf and the parent, root included', () => {
    expect(baseNameOf('src/deep/app.tsx')).toBe('app.tsx');
    expect(baseNameOf('src/deep/')).toBe('deep');
    expect(parentOf('src/deep/app.tsx')).toBe('src/deep/');
    expect(parentOf('src/deep/')).toBe('src/');
    // The root has no name, so '' is its only honest canonical form.
    expect(parentOf('README.md')).toBe('');
    expect(absOf('/proj', '')).toBe('/proj');
    expect(absOf('/proj', 'src/')).toBe('/proj/src');
  });
});

describe('planning a drop', () => {
  it('lands each entry inside the destination, keeping its kind', () => {
    expect(destinationFor('src/app.tsx', 'lib/')).toBe('lib/app.tsx');
    expect(destinationFor('src/deep/', 'lib/')).toBe('lib/deep/');
    // '' is the project root.
    expect(destinationFor('src/app.tsx', '')).toBe('app.tsx');
    expect(destinationFor('src/deep/', '')).toBe('deep/');
  });

  it('skips entries already sitting in the destination', () => {
    expect(planMoves(['lib/a.ts', 'src/b.ts'], 'lib/')).toEqual([
      { from: 'src/b.ts', to: 'lib/b.ts' }
    ]);
  });

  it('refuses to move a folder into itself or its own descendant', () => {
    expect(planMoves(['src/'], 'src/deep/')).toEqual([]);
    expect(planMoves(['src/'], 'src/')).toEqual([]);
  });

  it('lists the directories a move invalidates, absolute', () => {
    const dirs = touchedDirs('/proj', [{ from: 'src/a.ts', to: 'lib/a.ts' }]);
    expect(new Set(dirs)).toEqual(new Set(['/proj/src', '/proj/lib']));
  });
});

describe('rebasing the fed path set', () => {
  it('carries a folder move over its whole subtree', () => {
    const move = { from: 'src/', to: 'lib/' };
    expect(remapPath('src/', move)).toBe('lib/');
    expect(remapPath('src/deep/a.ts', move)).toBe('lib/deep/a.ts');
    expect(remapPath('srcs/a.ts', move)).toBe('srcs/a.ts');
  });

  it('leaves the neighbours of a file move alone', () => {
    const move = { from: 'a.ts', to: 'b.ts' };
    expect(remapPath('a.ts', move)).toBe('b.ts');
    expect(remapPath('a.ts.bak', move)).toBe('a.ts.bak');
  });

  it('rewrites the whole set in one pass', () => {
    const fed = new Set(['src/', 'src/a.ts', 'src/deep/', 'README.md']);
    const next = remapPathSet(fed, [{ from: 'src/', to: 'lib/' }]);
    expect([...next].sort()).toEqual(
      ['README.md', 'lib/', 'lib/a.ts', 'lib/deep/'].sort()
    );
  });

  it('inverts a move list for the revert path', () => {
    expect(invertMoves([{ from: 'a', to: 'b' }])).toEqual([
      { from: 'b', to: 'a' }
    ]);
  });
});

describe('the seed name for a new row', () => {
  it('takes the plain name when nothing is using it', () => {
    expect(uniqueName('untitled', new Set())).toBe('untitled');
  });

  it('counts up past every sibling that already has it', () => {
    expect(uniqueName('untitled', new Set(['untitled']))).toBe('untitled 2');
    expect(
      uniqueName('untitled folder', new Set(['untitled folder', 'untitled folder 2']))
    ).toBe('untitled folder 3');
  });
});
