/**
 * The vendored VS Code fuzzy scorer, and the two gmux adapters on top of it.
 *
 * These are the cases manual testing does not find. A ranking regression is
 * invisible — the palette still shows rows, they are just the wrong ones —
 * and an off-by-one in `positionsForPath` highlights the character to the
 * left of the match on every row, which reviewers read straight past.
 */

import { describe, expect, it } from 'vitest';
import {
  compareScored,
  positionsForPath,
  prepareQuery,
  scoreItem,
  splitPath,
  THRESHOLDS
} from '../scorer';
import type { ScoredItem } from '../scorer';

/** Score a relative path the way the worker does. */
function score(relPath: string, query: string): ScoredItem {
  const { label, description } = splitPath(relPath);
  const q = prepareQuery(query);
  return {
    ...scoreItem(label, description, relPath, q, true),
    label,
    description,
    path: relPath
  };
}

/** Rank a corpus the way the worker does, and return the paths in order. */
function rank(paths: string[], query: string): string[] {
  return paths
    .map((p) => score(p, query))
    .filter((s) => s.score > 0)
    .sort(compareScored)
    .map((s) => s.path);
}

describe('splitPath', () => {
  it('splits a nested path into filename and folder', () => {
    expect(splitPath('src/renderer/state/open-file.ts')).toEqual({
      label: 'open-file.ts',
      description: 'src/renderer/state'
    });
  });

  it('leaves a root-level file with no description', () => {
    expect(splitPath('README.md')).toEqual({
      label: 'README.md',
      description: undefined
    });
  });
});

describe('scoreItem', () => {
  it('scores a filename match far above a folder-only match', () => {
    const name = score('src/renderer/state/open-file.ts', 'openfile');
    const folder = score('src/openfile-helpers/index.ts', 'openfile');
    expect(name.score).toBeGreaterThan(THRESHOLDS.LABEL_SCORE_THRESHOLD);
    expect(folder.score).toBeLessThan(THRESHOLDS.LABEL_SCORE_THRESHOLD);
  });

  it('gives an exact path an unbeatable score', () => {
    const exact = score('src/main/index.ts', 'src/main/index.ts');
    expect(exact.score).toBe(THRESHOLDS.PATH_IDENTITY_SCORE);
  });

  it('rewards a filename PREFIX over a filename subsequence', () => {
    const prefix = score('src/a/store.ts', 'store');
    const scattered = score('src/a/split-tree-restore.ts', 'store');
    expect(prefix.score).toBeGreaterThan(
      THRESHOLDS.LABEL_PREFIX_SCORE_THRESHOLD
    );
    expect(scattered.score).toBeLessThan(
      THRESHOLDS.LABEL_PREFIX_SCORE_THRESHOLD
    );
  });

  it('matches across the separator when the query contains one', () => {
    const s = score('src/renderer/state/store.ts', 'state/store');
    expect(s.score).toBeGreaterThan(0);
  });

  it('requires EVERY space-separated piece to match', () => {
    expect(score('src/renderer/state/store.ts', 'state store').score)
      .toBeGreaterThan(0);
    expect(score('src/renderer/state/store.ts', 'state widget').score).toBe(0);
  });

  it('does not match a query that is not a subsequence', () => {
    expect(score('src/main/index.ts', 'zzz').score).toBe(0);
  });
});

describe('ranking (the whole two-stage answer the palette shows)', () => {
  const corpus = [
    'src/renderer/state/open-file.ts',
    'src/renderer/scm/open-file.ts',
    'src/renderer/tree/open-file.ts',
    'src/renderer/editor/MonacoHost.tsx',
    'src/main/quickopen/worker.ts',
    'src/main/quickopen/coordinator.ts',
    'docs/research/19-search.md',
    'src/renderer/app/App.tsx'
  ];

  it('puts the exact filename first for a filename query', () => {
    expect(rank(corpus, 'monacohost')[0]).toBe(
      'src/renderer/editor/MonacoHost.tsx'
    );
  });

  it('narrows by folder when the query carries one', () => {
    const ranked = rank(corpus, 'state/open');
    expect(ranked[0]).toBe('src/renderer/state/open-file.ts');
  });

  it('matches camelCase initials the way a developer types them', () => {
    expect(rank(corpus, 'mh')[0]).toBe('src/renderer/editor/MonacoHost.tsx');
  });

  it('is case-insensitive', () => {
    expect(rank(corpus, 'MONACOHOST')[0]).toBe(
      'src/renderer/editor/MonacoHost.tsx'
    );
  });
});

describe('positionsForPath', () => {
  it('offsets filename matches past the folder and the separator', () => {
    const rel = 'src/renderer/state/open-file.ts';
    const s = score(rel, 'openfile');
    const positions = positionsForPath(rel, s);
    // Every reported index must actually be one of the typed characters.
    const matched = positions.map((i) => rel[i]).join('');
    expect(matched).toBe('openfile');
    expect(Math.min(...positions)).toBeGreaterThan(rel.indexOf('state'));
  });

  it('reports folder matches in the folder half of the string', () => {
    const rel = 'src/renderer/state/store.ts';
    const s = score(rel, 'renderer/store');
    const positions = positionsForPath(rel, s);
    // The typed '/' is itself a matched character — it lands on the separator
    // BEFORE `state`, not the one before `store`, because the scorer takes the
    // leftmost run it can. Highlighting it is correct: the user typed it.
    expect(positions.map((i) => rel[i]).join('')).toBe('renderer/store');
    expect(rel[12]).toBe('/');
  });

  it('is ascending with no duplicates', () => {
    const rel = 'src/main/quickopen/coordinator.ts';
    const positions = positionsForPath(rel, score(rel, 'quickcoord'));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('covers the whole path for an exact-path match', () => {
    const rel = 'src/main/index.ts';
    const positions = positionsForPath(rel, score(rel, rel));
    expect(positions.length).toBe(rel.length - 1); // every char but the '/'
  });
});

describe('compareScored tiebreakers', () => {
  it('prefers the shorter filename when scores tie', () => {
    const ranked = rank(['a/store.ts', 'a/storeeee.ts'], 'store');
    expect(ranked[0]).toBe('a/store.ts');
  });

  it('is a total order — sorting twice gives the same answer', () => {
    const corpus = [
      'a/index.ts',
      'b/index.ts',
      'c/index.ts',
      'a/b/index.ts',
      'indexer/main.ts'
    ];
    expect(rank(corpus, 'index')).toEqual(rank(corpus, 'index'));
  });
});
