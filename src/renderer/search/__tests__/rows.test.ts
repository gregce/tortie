/**
 * The pure half of the Search view: frame merging, row flattening and
 * highlight splitting.
 *
 * These are the cases clicking around will not find — a file that arrives in
 * two frames, a highlight range that runs past the end of a clamped line, a
 * group collapsed while its context rows are open. Each one is a real
 * consequence of the streaming protocol rather than a hypothetical.
 */

import { describe, expect, it } from 'vitest';
import type { SearchFileResult, SearchMatch } from '@shared/ipc';
import {
  ROW_HEIGHT,
  flattenRows,
  matchKey,
  mergeFrame,
  rowKey,
  splitHighlights,
  splitPath
} from '../rows';

function match(line: number, text = 'const MAX_TABS = 10;'): SearchMatch {
  return {
    line,
    text,
    trimmed: 0,
    ranges: [[6, 14]],
    byteOffset: 0
  };
}

function file(
  relPath: string,
  lines: number[],
  extra: Partial<SearchFileResult> = {}
): SearchFileResult {
  return {
    relPath,
    matchCount: lines.length,
    matches: lines.map((l) => match(l)),
    clipped: false,
    ...extra
  };
}

describe('mergeFrame', () => {
  it('appends a file it has not seen', () => {
    const merged = mergeFrame([], [file('a.ts', [1, 2])]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.matches.map((m) => m.line)).toEqual([1, 2]);
  });

  it('leaves the accumulator alone for an empty frame', () => {
    const current = [file('a.ts', [1])];
    expect(mergeFrame(current, [])).toBe(current);
  });

  it('APPENDS to an existing group rather than replacing it', () => {
    // A big file straddles two flushes. Replacing would make its first
    // matches flicker away mid-search.
    const first = mergeFrame([], [file('a.ts', [1, 2])]);
    const second = mergeFrame(first, [file('a.ts', [7, 9])]);
    expect(second).toHaveLength(1);
    expect(second[0]?.matches.map((m) => m.line)).toEqual([1, 2, 7, 9]);
  });

  it('drops a line it already has, and keeps line order', () => {
    const first = mergeFrame([], [file('a.ts', [5, 9])]);
    const second = mergeFrame(first, [file('a.ts', [9, 2])]);
    expect(second[0]?.matches.map((m) => m.line)).toEqual([2, 5, 9]);
  });

  it('takes the newest matchCount and never un-sets clipped or binary', () => {
    const first = mergeFrame(
      [],
      [file('a.ts', [1], { clipped: true, binary: true, matchCount: 900 })]
    );
    const second = mergeFrame(first, [file('a.ts', [2], { matchCount: 1200 })]);
    expect(second[0]?.matchCount).toBe(1200);
    expect(second[0]?.clipped).toBe(true);
    expect(second[0]?.binary).toBe(true);
  });

  it('returns a NEW array so React re-renders once per frame', () => {
    const current = [file('a.ts', [1])];
    const merged = mergeFrame(current, [file('b.ts', [1])]);
    expect(merged).not.toBe(current);
    expect(current).toHaveLength(1);
  });
});

describe('flattenRows', () => {
  const empty = {
    collapsed: new Set<string>(),
    expanded: new Set<string>(),
    context: new Map<string, { line: number; text: string }[]>()
  };

  it('emits a file row followed by its matches', () => {
    const rows = flattenRows({ files: [file('a.ts', [3, 8])], ...empty });
    expect(rows.map((r) => r.kind)).toEqual(['file', 'match', 'match']);
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2]);
  });

  it('hides the matches of a collapsed group but keeps its header', () => {
    const rows = flattenRows({
      files: [file('a.ts', [3, 8]), file('b.ts', [1])],
      ...empty,
      collapsed: new Set(['a.ts'])
    });
    expect(rows.map((r) => r.kind)).toEqual(['file', 'file', 'match']);
  });

  it('marks an expanded match as loading until its context arrives', () => {
    const rows = flattenRows({
      files: [file('a.ts', [3])],
      ...empty,
      expanded: new Set([matchKey('a.ts', 3)])
    });
    const m = rows[1];
    expect(m?.kind).toBe('match');
    expect(m?.kind === 'match' && m.loading).toBe(true);
    // No context rows yet — a spinner, not a gap.
    expect(rows).toHaveLength(2);
  });

  it('emits context rows once they arrive, anchored to their match', () => {
    const key = matchKey('a.ts', 3);
    const rows = flattenRows({
      files: [file('a.ts', [3])],
      ...empty,
      expanded: new Set([key]),
      context: new Map([
        [
          key,
          [
            { line: 2, text: 'before' },
            { line: 4, text: 'after' }
          ]
        ]
      ])
    });
    // Context BEFORE the match renders above it — code has an order, and a
    // line 2 shown under line 3 reads as a bug in the search.
    expect(rows.map((r) => r.kind)).toEqual([
      'file',
      'context',
      'match',
      'context'
    ]);
    const above = rows[1];
    expect(above?.kind === 'context' && above.context.line).toBe(2);
    expect(above?.kind === 'context' && above.anchorLine).toBe(3);
    const below = rows[3];
    expect(below?.kind === 'context' && below.context.line).toBe(4);
  });

  it('keeps the match row visible while its context is still loading', () => {
    const rows = flattenRows({
      files: [file('a.ts', [3])],
      ...empty,
      expanded: new Set([matchKey('a.ts', 3)])
    });
    expect(rows.map((r) => r.kind)).toEqual(['file', 'match']);
  });

  it('collapsing a group hides its context rows too', () => {
    const key = matchKey('a.ts', 3);
    const rows = flattenRows({
      files: [file('a.ts', [3])],
      collapsed: new Set(['a.ts']),
      expanded: new Set([key]),
      context: new Map([[key, [{ line: 2, text: 'before' }]]])
    });
    expect(rows.map((r) => r.kind)).toEqual(['file']);
  });

  it('adds a clipped row only when matches were actually cut', () => {
    const shown = file('a.ts', [1, 2], { clipped: true, matchCount: 900 });
    const rows = flattenRows({ files: [shown], ...empty });
    const last = rows[rows.length - 1];
    expect(last?.kind).toBe('clipped');
    expect(last?.kind === 'clipped' && last.hidden).toBe(898);

    // clipped, but nothing is actually hidden → no row.
    const exact = file('a.ts', [1, 2], { clipped: true, matchCount: 2 });
    expect(
      flattenRows({ files: [exact], ...empty }).map((r) => r.kind)
    ).toEqual(['file', 'match', 'match']);
  });

  it('gives every row a stable, distinct key', () => {
    const key = matchKey('a.ts', 3);
    const rows = flattenRows({
      files: [file('a.ts', [3]), file('b.ts', [3])],
      ...empty,
      expanded: new Set([key]),
      context: new Map([[key, [{ line: 2, text: 'x' }]]])
    });
    const keys = rows.map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every row the same height, which is what makes windowing safe', () => {
    expect(ROW_HEIGHT).toBe(22);
  });
});

describe('splitHighlights', () => {
  it('splits around one range', () => {
    expect(splitHighlights('const MAX = 1;', [[6, 9]])).toEqual([
      { text: 'const ', hit: false },
      { text: 'MAX', hit: true },
      { text: ' = 1;', hit: false }
    ]);
  });

  it('handles a match at the very start and the very end', () => {
    expect(splitHighlights('abc', [[0, 3]])).toEqual([
      { text: 'abc', hit: true }
    ]);
    expect(splitHighlights('xabc', [[1, 4]])).toEqual([
      { text: 'x', hit: false },
      { text: 'abc', hit: true }
    ]);
  });

  it('splits around several ranges in order', () => {
    expect(splitHighlights('a b a b', [[0, 1], [4, 5]])).toEqual([
      { text: 'a', hit: true },
      { text: ' b ', hit: false },
      { text: 'a', hit: true },
      { text: ' b', hit: false }
    ]);
  });

  it('returns the whole line unhighlighted when there are no ranges', () => {
    expect(splitHighlights('plain', [])).toEqual([{ text: 'plain', hit: false }]);
  });

  it('degrades to a readable line rather than scrambling it', () => {
    // A range past the end of a CLAMPED line must not produce garbage — main
    // windows long lines, and a future engine change could get the shift
    // wrong. The line still reads; only the highlight is lost.
    expect(splitHighlights('short', [[2, 999]]).map((p) => p.text).join('')).toBe(
      'short'
    );
    expect(splitHighlights('short', [[99, 120]]).map((p) => p.text).join('')).toBe(
      'short'
    );
    // Out-of-order ranges cannot duplicate text either.
    expect(
      splitHighlights('abcdef', [[4, 6], [0, 2]]).map((p) => p.text).join('')
    ).toBe('abcdef');
  });
});

describe('splitPath', () => {
  it('splits a nested path into leaf and directory', () => {
    expect(splitPath('src/renderer/editor/store.ts')).toEqual({
      name: 'store.ts',
      dir: 'src/renderer/editor'
    });
  });

  it('handles a root-level file', () => {
    expect(splitPath('README.md')).toEqual({ name: 'README.md', dir: '' });
  });
});
