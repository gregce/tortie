/**
 * Phase 47 item 1. The rules that keep `git check-ignore` cheap and keep the
 * dimming honest, tested without a tree, a shadow root or a git process.
 */

import { describe, expect, it } from 'vitest';
import {
  ignoredDotSuppressionCss,
  ignoredOnlyAncestors,
  isUnderIgnored,
  pathsToAsk
} from '../ignored';
import { treeGitLane } from '../decorations';
import type { GitFileStatus } from '@shared/types';

const IGNORED = new Set(['node_modules/', 'dist/', 'packages/app/dist/']);

function status(
  path: string,
  indexState: string,
  worktreeState: string
): GitFileStatus {
  return { path, indexState, worktreeState } as GitFileStatus;
}

describe('isUnderIgnored', () => {
  it('covers every descendant of an ignored directory', () => {
    expect(isUnderIgnored('node_modules/react/index.js', IGNORED)).toBe(true);
    expect(isUnderIgnored('node_modules/react/', IGNORED)).toBe(true);
    expect(isUnderIgnored('packages/app/dist/main.js', IGNORED)).toBe(true);
  });

  it('does not cover the directory itself, nor a sibling', () => {
    // The directory's own answer is already in the set; this predicate is
    // about descendants, and pathsToAsk checks membership separately.
    expect(isUnderIgnored('node_modules/', IGNORED)).toBe(false);
    expect(isUnderIgnored('packages/app/src/main.ts', IGNORED)).toBe(false);
    expect(isUnderIgnored('distant/file.ts', IGNORED)).toBe(false);
  });

  it('is false for everything when nothing is ignored yet', () => {
    expect(isUnderIgnored('anything/at/all.ts', new Set())).toBe(false);
  });
});

describe('pathsToAsk', () => {
  it('never asks inside a directory already known ignored', () => {
    const ask = pathsToAsk(
      [
        'src/',
        'node_modules/',
        'node_modules/react/',
        'node_modules/react/index.js'
      ],
      IGNORED,
      new Set()
    );
    expect(ask).toEqual(['src/']);
  });

  it('never re-asks a path git has already answered for', () => {
    const ask = pathsToAsk(
      ['src/', 'README.md', 'LICENSE'],
      new Set(),
      new Set(['src/', 'README.md'])
    );
    expect(ask).toEqual(['LICENSE']);
  });

  it('asks the outermost paths first, so the cap keeps the useful ones', () => {
    const ask = pathsToAsk(
      ['a/b/c/deep.ts', 'a/', 'a/b/', 'z.ts'],
      new Set(),
      new Set(),
      3
    );
    expect(ask).toEqual(['a/', 'a/b/', 'z.ts']);
  });

  it('drops the empty string rather than sending it to git', () => {
    expect(pathsToAsk(['', 'a.ts'], new Set(), new Set())).toEqual(['a.ts']);
  });
});

describe('ignoredOnlyAncestors', () => {
  it('names the directories that would get a dot for ignored content alone', () => {
    // @pierre/trees counts EVERY status against each ancestor directory,
    // ignored included, so docs/ would show the amber dirty-descendant dot
    // because docs/.DS_Store is ignored. It has no real change under it.
    expect(
      ignoredOnlyAncestors(['docs/.DS_Store', 'build/vendor/'], [])
    ).toEqual(['build/', 'docs/']);
  });

  it('leaves a directory that also holds a real change alone', () => {
    expect(
      ignoredOnlyAncestors(['docs/.DS_Store'], ['docs/DESIGN.md'])
    ).toEqual([]);
  });

  it('is empty for a top-level ignored entry, which has no ancestors', () => {
    expect(ignoredOnlyAncestors(['node_modules/', '.DS_Store'], [])).toEqual(
      []
    );
  });

  it('suppresses the whole chain above a nested ignored directory', () => {
    expect(
      ignoredOnlyAncestors(['packages/app/dist/'], ['other/main.ts'])
    ).toEqual(['packages/', 'packages/app/']);
  });

  it('keeps every dot on a chain that also carries a real change', () => {
    // packages/ and packages/app/ genuinely contain a modified file, so both
    // keep the dot even though an ignored directory sits under them too.
    expect(
      ignoredOnlyAncestors(
        ['packages/app/dist/'],
        ['packages/app/src/main.ts']
      )
    ).toEqual([]);
  });
});

describe('ignoredDotSuppressionCss', () => {
  it('is empty when there is nothing to suppress', () => {
    expect(ignoredDotSuppressionCss([])).toBe('');
  });

  it('targets the dot alone, so a real badge on that row would still show', () => {
    const css = ignoredDotSuppressionCss(['docs/']);
    expect(css).toContain('[data-item-path="docs/"]');
    expect(css).toContain('[data-icon-name="file-tree-icon-dot"]');
    expect(css).toContain('display: none');
  });

  it('escapes a quote in a path instead of ending the selector early', () => {
    const css = ignoredDotSuppressionCss(['od"d/']);
    expect(css).toContain('[data-item-path="od\\"d/"]');
  });
});

describe('treeGitLane', () => {
  it('gives ignored directories the trailing slash the library needs', () => {
    const lane = treeGitLane([], ['dist/', 'notes.log']);
    expect(lane.entries).toEqual([
      { path: 'dist/', status: 'ignored' },
      { path: 'notes.log', status: 'ignored' }
    ]);
  });

  it('lets porcelain win a collision', () => {
    const lane = treeGitLane([status('a.ts', '.', 'M')], ['a.ts']);
    expect(lane.entries).toEqual([{ path: 'a.ts', status: 'modified' }]);
  });

  it('counts only real changes towards the dirty-descendant dot', () => {
    const lane = treeGitLane(
      [status('src/a.ts', '.', 'M'), status('src/b.ts', '.', '.')],
      ['dist/']
    );
    expect(lane.changed).toEqual(['src/a.ts']);
  });

  it('keeps the conflict overlay set unchanged', () => {
    const lane = treeGitLane([status('c.ts', 'U', 'U')], ['dist/']);
    expect([...lane.conflicts]).toEqual(['c.ts']);
  });
});
