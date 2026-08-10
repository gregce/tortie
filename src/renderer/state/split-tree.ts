/**
 * Split-tree model (S4A) — pure, immutable operations on the binary split
 * tree that backs a session SURFACE. A surface is one session (a bare leaf)
 * or a drag-built group of up to MAX_LEAVES sessions. The tree is app-side
 * presentation state only: every leaf remains its own tmux-backed session
 * and the manifest/tmux layer never learns about splits.
 *
 * No imports, no store, no DOM — unit-testable in a node environment.
 */

/** 'row' = side-by-side (vertical divider); 'column' = stacked. */
export type SplitDir = 'row' | 'column';

export interface SplitLeaf {
  type: 'leaf';
  sessionId: string;
}

export interface SplitBranch {
  type: 'branch';
  dir: SplitDir;
  /** Fraction of the box given to `a` (0.1–0.9 clamped by callers). */
  ratio: number;
  a: SplitNode;
  b: SplitNode;
}

export type SplitNode = SplitLeaf | SplitBranch;

/** Which half of a leaf a drop arms (quadrant hit-testing). */
export type SplitEdge = 'left' | 'right' | 'top' | 'bottom';

/** Focus-navigation directions (⌘⌥ arrows). */
export type NavDir = 'left' | 'right' | 'up' | 'down';

export const MAX_LEAVES = 6;
export const MIN_PANE_WIDTH = 200;
export const MIN_PANE_HEIGHT = 120;

export function leaf(sessionId: string): SplitLeaf {
  return { type: 'leaf', sessionId };
}

/** Leaf session ids in layout order (a before b, depth-first). */
export function leafIds(node: SplitNode): string[] {
  if (node.type === 'leaf') return [node.sessionId];
  return [...leafIds(node.a), ...leafIds(node.b)];
}

export function countLeaves(node: SplitNode): number {
  return leafIds(node).length;
}

export function hasLeaf(node: SplitNode, sessionId: string): boolean {
  if (node.type === 'leaf') return node.sessionId === sessionId;
  return hasLeaf(node.a, sessionId) || hasLeaf(node.b, sessionId);
}

/**
 * Divide `targetId`'s box 50/50 on the armed edge; the new session takes
 * the lit half (S4A). Returns a NEW tree; the original is untouched.
 * Unknown target → tree returned unchanged (callers guard).
 */
export function splitLeaf(
  node: SplitNode,
  targetId: string,
  edge: SplitEdge,
  newId: string
): SplitNode {
  if (node.type === 'leaf') {
    if (node.sessionId !== targetId) return node;
    const dir: SplitDir = edge === 'left' || edge === 'right' ? 'row' : 'column';
    const first = edge === 'left' || edge === 'top';
    return {
      type: 'branch',
      dir,
      ratio: 0.5,
      a: first ? leaf(newId) : node,
      b: first ? node : leaf(newId)
    };
  }
  return {
    ...node,
    a: splitLeaf(node.a, targetId, edge, newId),
    b: splitLeaf(node.b, targetId, edge, newId)
  };
}

/**
 * Remove a leaf; its sibling absorbs the space (the parent branch collapses
 * into the sibling). Returns null when the removed leaf was the whole tree.
 */
export function removeLeaf(
  node: SplitNode,
  sessionId: string
): SplitNode | null {
  if (node.type === 'leaf') {
    return node.sessionId === sessionId ? null : node;
  }
  const a = removeLeaf(node.a, sessionId);
  const b = removeLeaf(node.b, sessionId);
  if (a === null) return b;
  if (b === null) return a;
  if (a === node.a && b === node.b) return node;
  return { ...node, a, b };
}

/**
 * Keep only leaves whose session id passes `keep` — dead sessions collapse
 * cleanly, siblings absorbing their space. Null when nothing survives.
 */
export function pruneLeaves(
  node: SplitNode,
  keep: (sessionId: string) => boolean
): SplitNode | null {
  if (node.type === 'leaf') return keep(node.sessionId) ? node : null;
  const a = pruneLeaves(node.a, keep);
  const b = pruneLeaves(node.b, keep);
  if (a === null) return b;
  if (b === null) return a;
  if (a === node.a && b === node.b) return node;
  return { ...node, a, b };
}

/**
 * Branch path from the root: '' is the root, 'a'/'b' its children, 'ab' the
 * b-child of the a-child, … Paths address dividers for ratio updates.
 */
export function setRatioAt(
  node: SplitNode,
  path: string,
  ratio: number
): SplitNode {
  if (node.type === 'leaf') return node;
  if (path === '') {
    return { ...node, ratio: Math.min(0.9, Math.max(0.1, ratio)) };
  }
  const head = path[0];
  const rest = path.slice(1);
  if (head === 'a') return { ...node, a: setRatioAt(node.a, rest, ratio) };
  return { ...node, b: setRatioAt(node.b, rest, ratio) };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Geometry of every leaf inside `box` (any unit — normalized or pixels),
 * in tree order. The same math the renderer's flex layout produces.
 */
export function leafRects(node: SplitNode, box: Rect): Map<string, Rect> {
  const out = new Map<string, Rect>();
  const walk = (n: SplitNode, r: Rect): void => {
    if (n.type === 'leaf') {
      out.set(n.sessionId, r);
      return;
    }
    if (n.dir === 'row') {
      const aw = r.w * n.ratio;
      walk(n.a, { x: r.x, y: r.y, w: aw, h: r.h });
      walk(n.b, { x: r.x + aw, y: r.y, w: r.w - aw, h: r.h });
    } else {
      const ah = r.h * n.ratio;
      walk(n.a, { x: r.x, y: r.y, w: r.w, h: ah });
      walk(n.b, { x: r.x, y: r.y + ah, w: r.w, h: r.h - ah });
    }
  };
  walk(node, box);
  return out;
}

/**
 * Quadrant hit-testing (S4A): for normalized pointer position (u, v) in a
 * leaf's box, the armed edge is min(u, 1−u, v, 1−v) — the box's diagonals
 * cut the four zones.
 */
export function armedEdge(u: number, v: number): SplitEdge {
  const min = Math.min(u, 1 - u, v, 1 - v);
  if (min === u) return 'left';
  if (min === 1 - u) return 'right';
  if (min === v) return 'top';
  return 'bottom';
}

/**
 * ⌘⌥-arrow focus move (S4A): the geometrically nearest leaf in `dir` —
 * closest along the axis first, then greatest edge overlap with the from
 * leaf's projection; ties → topmost/leftmost. Null at the surface's edge.
 */
export function nearestLeaf(
  rects: Map<string, Rect>,
  fromId: string,
  dir: NavDir
): string | null {
  const from = rects.get(fromId);
  if (!from) return null;
  const eps = 1e-6;

  interface Candidate {
    id: string;
    distance: number;
    overlap: number;
    tie: number;
  }
  const candidates: Candidate[] = [];
  for (const [id, r] of rects) {
    if (id === fromId) continue;
    let distance: number;
    let overlap: number;
    let tie: number;
    if (dir === 'left' || dir === 'right') {
      distance =
        dir === 'right' ? r.x - (from.x + from.w) : from.x - (r.x + r.w);
      overlap =
        Math.min(from.y + from.h, r.y + r.h) - Math.max(from.y, r.y);
      tie = r.y;
    } else {
      distance =
        dir === 'down' ? r.y - (from.y + from.h) : from.y - (r.y + r.h);
      overlap =
        Math.min(from.x + from.w, r.x + r.w) - Math.max(from.x, r.x);
      tie = r.x;
    }
    if (distance < -eps || overlap <= eps) continue;
    candidates.push({ id, distance, overlap, tie });
  }
  if (candidates.length === 0) return null;
  const nearest = Math.min(...candidates.map((c) => c.distance));
  const band = candidates.filter((c) => c.distance <= nearest + eps);
  band.sort((x, y) => y.overlap - x.overlap || x.tie - y.tie);
  return band[0]?.id ?? null;
}
