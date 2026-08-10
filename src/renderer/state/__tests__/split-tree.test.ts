/**
 * Split-tree model tests (S4A): split/remove/prune keep the binary tree
 * sound, geometry matches the flex renderer's math, and ⌘⌥-arrow focus
 * navigation picks the geometrically nearest leaf.
 */

import { describe, expect, it } from 'vitest';
import {
  armedEdge,
  countLeaves,
  leaf,
  leafIds,
  leafRects,
  nearestLeaf,
  pruneLeaves,
  removeLeaf,
  setRatioAt,
  splitLeaf
} from '../split-tree';
import type { SplitNode } from '../split-tree';

describe('splitLeaf', () => {
  it('left/top put the new session in the first slot', () => {
    const l = splitLeaf(leaf('a'), 'a', 'left', 'b');
    expect(l).toEqual({
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: leaf('b'),
      b: leaf('a')
    });
    const t = splitLeaf(leaf('a'), 'a', 'top', 'b');
    expect(t.type).toBe('branch');
    if (t.type === 'branch') {
      expect(t.dir).toBe('column');
      expect(leafIds(t)).toEqual(['b', 'a']);
    }
  });

  it('right/bottom keep the target first', () => {
    const r = splitLeaf(leaf('a'), 'a', 'right', 'b');
    expect(leafIds(r)).toEqual(['a', 'b']);
    const b = splitLeaf(leaf('a'), 'a', 'bottom', 'b');
    expect(leafIds(b)).toEqual(['a', 'b']);
  });

  it('splits a nested target only', () => {
    let tree: SplitNode = splitLeaf(leaf('a'), 'a', 'right', 'b');
    tree = splitLeaf(tree, 'b', 'bottom', 'c');
    expect(leafIds(tree)).toEqual(['a', 'b', 'c']);
    expect(countLeaves(tree)).toBe(3);
    // 'a' untouched: still a bare leaf on the left.
    if (tree.type === 'branch') expect(tree.a).toEqual(leaf('a'));
  });
});

describe('removeLeaf / pruneLeaves', () => {
  const grid = (): SplitNode =>
    splitLeaf(splitLeaf(leaf('a'), 'a', 'right', 'b'), 'b', 'bottom', 'c');

  it('sibling absorbs the removed leaf', () => {
    const out = removeLeaf(grid(), 'c');
    expect(out).not.toBeNull();
    expect(leafIds(out as SplitNode)).toEqual(['a', 'b']);
  });

  it('removing the last leaf yields null', () => {
    expect(removeLeaf(leaf('a'), 'a')).toBeNull();
  });

  it('prune collapses dead sessions cleanly', () => {
    const out = pruneLeaves(grid(), (id) => id !== 'a' && id !== 'b');
    expect(out).toEqual(leaf('c'));
    expect(pruneLeaves(grid(), () => false)).toBeNull();
  });
});

describe('setRatioAt', () => {
  it('addresses branches by a/b path and clamps', () => {
    const tree = splitLeaf(
      splitLeaf(leaf('a'), 'a', 'right', 'b'),
      'b',
      'bottom',
      'c'
    );
    const out = setRatioAt(tree, 'b', 0.99);
    expect(out.type).toBe('branch');
    if (out.type === 'branch' && out.b.type === 'branch') {
      expect(out.b.ratio).toBe(0.9); // clamped
      expect(out.ratio).toBe(0.5); // root untouched
    }
  });
});

describe('leafRects', () => {
  it('matches the flex math for a 2x2 grid', () => {
    const grid: SplitNode = {
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: { type: 'branch', dir: 'column', ratio: 0.5, a: leaf('a'), b: leaf('c') },
      b: { type: 'branch', dir: 'column', ratio: 0.5, a: leaf('b'), b: leaf('d') }
    };
    const rects = leafRects(grid, { x: 0, y: 0, w: 100, h: 80 });
    expect(rects.get('a')).toEqual({ x: 0, y: 0, w: 50, h: 40 });
    expect(rects.get('b')).toEqual({ x: 50, y: 0, w: 50, h: 40 });
    expect(rects.get('c')).toEqual({ x: 0, y: 40, w: 50, h: 40 });
    expect(rects.get('d')).toEqual({ x: 50, y: 40, w: 50, h: 40 });
  });
});

describe('armedEdge', () => {
  it('the diagonals cut the four zones', () => {
    expect(armedEdge(0.1, 0.5)).toBe('left');
    expect(armedEdge(0.9, 0.5)).toBe('right');
    expect(armedEdge(0.5, 0.1)).toBe('top');
    expect(armedEdge(0.5, 0.9)).toBe('bottom');
  });
});

describe('nearestLeaf', () => {
  const grid: SplitNode = {
    type: 'branch',
    dir: 'row',
    ratio: 0.5,
    a: { type: 'branch', dir: 'column', ratio: 0.5, a: leaf('a'), b: leaf('c') },
    b: { type: 'branch', dir: 'column', ratio: 0.5, a: leaf('b'), b: leaf('d') }
  };
  const rects = leafRects(grid, { x: 0, y: 0, w: 1, h: 1 });

  it('moves along rows and columns', () => {
    expect(nearestLeaf(rects, 'a', 'right')).toBe('b');
    expect(nearestLeaf(rects, 'b', 'left')).toBe('a');
    expect(nearestLeaf(rects, 'a', 'down')).toBe('c');
    expect(nearestLeaf(rects, 'd', 'up')).toBe('b');
  });

  it('returns null at the surface edge', () => {
    expect(nearestLeaf(rects, 'a', 'left')).toBeNull();
    expect(nearestLeaf(rects, 'a', 'up')).toBeNull();
    expect(nearestLeaf(rects, 'd', 'right')).toBeNull();
    expect(nearestLeaf(rects, 'd', 'down')).toBeNull();
  });

  it('prefers greatest edge overlap; ties go topmost', () => {
    // Left column split 30/70; right column full height.
    const tree: SplitNode = {
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: {
        type: 'branch',
        dir: 'column',
        ratio: 0.3,
        a: leaf('a'),
        b: leaf('c')
      },
      b: leaf('b')
    };
    const r = leafRects(tree, { x: 0, y: 0, w: 1, h: 1 });
    // From b going left: c overlaps 0.7 vs a's 0.3 → c wins.
    expect(nearestLeaf(r, 'b', 'left')).toBe('c');
    // 50/50 tie → topmost.
    expect(nearestLeaf(rects, 'b', 'left')).toBe('a');
  });
});
