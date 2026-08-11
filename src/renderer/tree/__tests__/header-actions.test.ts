/**
 * The Explorer header's two decisions (Phase 14.2 item 3), pinned as rules
 * rather than as a picture of a tree.
 *
 * Both regress silently: a create that lands in the wrong folder still looks
 * like it worked, and a Collapse All that walks only the VISIBLE rows leaves
 * folders open underneath — invisible until the user re-opens a parent and
 * the whole subtree spills out.
 */

import { describe, expect, it } from 'vitest';
import { expandedDirs, headerDestDir } from '../header-actions';

describe('headerDestDir', () => {
  it('lands at the project root when nothing is selected', () => {
    expect(headerDestDir([])).toBe('');
  });

  it('lands INSIDE a selected folder', () => {
    expect(headerDestDir(['src/components/'])).toBe('src/components/');
  });

  it('lands BESIDE a selected file, in its parent folder', () => {
    expect(headerDestDir(['src/components/Button.tsx'])).toBe(
      'src/components/'
    );
  });

  it('puts a top-level file at the root, not at "/"', () => {
    expect(headerDestDir(['README.md'])).toBe('');
  });

  it('follows the FIRST row of a multi-row selection', () => {
    expect(headerDestDir(['docs/', 'src/index.ts'])).toBe('docs/');
  });

  it('treats an empty first entry as the root', () => {
    expect(headerDestDir([''])).toBe('');
  });
});

describe('expandedDirs', () => {
  const paths = [
    'src/',
    'src/components/',
    'src/components/Button.tsx',
    'src/lib/',
    'docs/',
    'README.md'
  ];

  it('returns only directories, and only the open ones', () => {
    const open = new Set(['src/', 'src/components/']);
    expect(expandedDirs(paths, (p) => open.has(p))).toEqual([
      'src/',
      'src/components/'
    ]);
  });

  it('never returns a file, even one the predicate would say yes to', () => {
    expect(expandedDirs(paths, () => true)).toEqual([
      'src/',
      'src/components/',
      'src/lib/',
      'docs/'
    ]);
  });

  it('is empty when nothing is open — the header disables on this', () => {
    expect(expandedDirs(paths, () => false)).toEqual([]);
  });

  it('reports a folder that is open under a COLLAPSED ancestor', () => {
    // The row is not visible, but it is still expanded, and Collapse All has
    // to close it or re-opening src/ spills components/ straight back open.
    const open = new Set(['src/components/']);
    expect(expandedDirs(paths, (p) => open.has(p))).toEqual([
      'src/components/'
    ]);
  });

  it('accepts any iterable — the tree hands it a Set', () => {
    expect(expandedDirs(new Set(['a/', 'b.txt']), () => true)).toEqual(['a/']);
  });
});
