/**
 * Highlight runs. The ranker reports offsets into the WHOLE relative path;
 * the palette renders the filename and the folder as two separate elements.
 * Getting the join wrong shifts every highlight by one character — visible on
 * screen, invisible in review.
 */

import { describe, expect, it } from 'vitest';
import { highlightRuns, splitRelPath } from '../highlight';

describe('splitRelPath', () => {
  it('reports where the filename starts in the whole string', () => {
    const rel = 'src/renderer/state/open-file.ts';
    expect(splitRelPath(rel)).toEqual({
      name: 'open-file.ts',
      dir: 'src/renderer/state',
      nameOffset: 19
    });
    expect(rel.slice(19)).toBe('open-file.ts');
  });

  it('handles a root-level file', () => {
    expect(splitRelPath('README.md')).toEqual({
      name: 'README.md',
      dir: '',
      nameOffset: 0
    });
  });
});

describe('highlightRuns', () => {
  it('returns one plain run when nothing matched', () => {
    expect(highlightRuns('store.ts', [])).toEqual([
      { text: 'store.ts', hit: false }
    ]);
  });

  it('coalesces adjacent matches into one run', () => {
    expect(highlightRuns('store.ts', [0, 1, 2, 3, 4])).toEqual([
      { text: 'store', hit: true },
      { text: '.ts', hit: false }
    ]);
  });

  it('alternates for a scattered match', () => {
    expect(highlightRuns('open-file.ts', [0, 5, 6])).toEqual([
      { text: 'o', hit: true },
      { text: 'pen-', hit: false },
      { text: 'fi', hit: true },
      { text: 'le.ts', hit: false }
    ]);
  });

  it('ignores positions outside this slice', () => {
    const rel = 'src/state/store.ts';
    const { name, nameOffset } = splitRelPath(rel);
    // Positions covering 'st' in 'state' AND 'store' — only the second is ours.
    const positions = [4, 5, 10, 11];
    expect(highlightRuns(name, positions, nameOffset)).toEqual([
      { text: 'st', hit: true },
      { text: 'ore.ts', hit: false }
    ]);
  });

  it('renders the folder half from the same position list', () => {
    const rel = 'src/state/store.ts';
    const { dir } = splitRelPath(rel);
    expect(highlightRuns(dir, [4, 5, 10, 11], 0)).toEqual([
      { text: 'src/', hit: false },
      { text: 'st', hit: true },
      { text: 'ate', hit: false }
    ]);
  });

  it('reassembles to the original text, always', () => {
    const text = 'src/renderer/quickopen/QuickOpenPalette.tsx';
    const positions = [0, 4, 13, 14, 30, 41];
    expect(
      highlightRuns(text, positions)
        .map((r) => r.text)
        .join('')
    ).toBe(text);
  });

  it('handles an empty string', () => {
    expect(highlightRuns('', [0])).toEqual([]);
  });
});
