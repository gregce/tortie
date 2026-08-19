/**
 * How one subtree answer becomes the Explorer's per-directory cache, and which
 * cached directories that answer is allowed to replace (Phase 90.3). PURE.
 *
 * The tree's cache is keyed by absolute directory path, because that is what a
 * listing of one folder on this Mac produces. One `machines:listTree` answer is
 * a whole subtree instead, so it has to be cut into those keys before the tree
 * can read it. That cut is here rather than in the store so it can be tested
 * without a bridge, a machine or a tree.
 *
 * THE SECOND FUNCTION IS THE ONE THAT IS EASY TO GET WRONG. An answer rooted at
 * `R` walked `D` deep, so it knows the children of every directory at most
 * `D - 1` below `R`, and it knows nothing about anything deeper. A refresh that
 * replaced every cached key would empty the folders a person expanded past the
 * fetched depth. A refresh that replaced only the keys the answer names would
 * leave a folder that has since been emptied showing rows that are gone. So the
 * rule is by DEPTH: every covered key is replaced, with the empty list when the
 * answer names nothing for it, and every deeper key is left alone.
 */

import type { FsDirEntry } from '@shared/types';
import type { RemoteTreeEntry } from '@shared/ipc';

/** The directory one absolute path sits in, or null for a path with no slash. */
export function remoteParentOf(path: string): string | null {
  const at = path.lastIndexOf('/');
  if (at < 0) return null;
  return at === 0 ? '/' : path.slice(0, at);
}

/** The last segment of an absolute path. */
export function remoteNameOf(path: string): string {
  const at = path.lastIndexOf('/');
  return at < 0 ? path : path.slice(at + 1);
}

/**
 * How many path segments `path` sits below `root`, or null when it is not
 * under it. `root` itself is 0.
 */
export function depthUnder(root: string, path: string): number | null {
  if (path === root) return 0;
  const under = root === '/' ? '/' : root + '/';
  if (!path.startsWith(under)) return null;
  const rest = path.slice(under.length);
  if (rest.length === 0) return null;
  return rest.split('/').length;
}

/**
 * One subtree answer, cut into the per-directory lists the tree reads.
 *
 * Every directory the answer names gets a key, even when nothing is under it,
 * so an empty folder reads as empty rather than as never listed. The root
 * always gets one for the same reason.
 */
export function groupRemoteEntries(
  root: string,
  entries: readonly RemoteTreeEntry[]
): Record<string, FsDirEntry[]> {
  const groups: Record<string, FsDirEntry[]> = { [root]: [] };
  for (const entry of entries) {
    if (entry.kind === 'dir') groups[entry.path] ??= [];
  }
  for (const entry of entries) {
    const parent = remoteParentOf(entry.path);
    if (parent === null) continue;
    const list = groups[parent];
    if (list === undefined) continue;
    list.push({
      name: remoteNameOf(entry.path),
      path: entry.path,
      kind: entry.kind
    });
  }
  return groups;
}

/**
 * The cache after one answer lands.
 *
 * @param cache what the tree holds now.
 * @param root the folder the answer is about.
 * @param depth how deep the walk went, so the covered keys can be named.
 * @param groups the answer, already cut by {@link groupRemoteEntries}.
 */
export function mergeRemoteGroups(
  cache: Readonly<Record<string, readonly FsDirEntry[]>>,
  root: string,
  depth: number,
  groups: Readonly<Record<string, FsDirEntry[]>>
): Record<string, FsDirEntry[]> {
  const next: Record<string, FsDirEntry[]> = {};
  for (const [dir, entries] of Object.entries(cache)) {
    const under = depthUnder(root, dir);
    // Not under this answer at all, or deeper than the answer can speak for.
    if (under === null || under > depth - 1) {
      next[dir] = [...entries];
      continue;
    }
    next[dir] = groups[dir] ?? [];
  }
  for (const [dir, entries] of Object.entries(groups)) next[dir] = entries;
  return next;
}
