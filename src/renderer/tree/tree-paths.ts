/**
 * Path arithmetic for the explorer, in @pierre/trees' own spelling.
 *
 * Two spellings meet in this stream and mixing them is the whole bug class:
 *
 *   CANONICAL  what Pierre's model speaks — root-relative, and a DIRECTORY
 *              always ends with '/'  ("src/", "src/app.tsx")
 *   REL        what the fs:* channels and git decorations speak — the same
 *              string with no trailing slash ("src", "src/app.tsx")
 *
 * Everything here is pure so the reconciliation rules (what a move does to
 * the set of paths the model has been fed) can be tested without a DOM, a
 * model, or a disk. That set — `fedRef` in FileTree.tsx — is the baseline the
 * listing diff is computed against, so if a move leaves it stale the next
 * watcher tick issues nonsense operations against the model.
 */

/** Strip the canonical directory slash: 'src/' → 'src'. */
export function toRel(canonical: string): string {
  return canonical.endsWith('/') ? canonical.slice(0, -1) : canonical;
}

/** Add it back: ('src', true) → 'src/'. */
export function toCanonical(rel: string, isDir: boolean): string {
  if (!isDir) return rel;
  return rel.endsWith('/') ? rel : rel + '/';
}

/** True for the canonical spelling of a directory. */
export function isDirPath(canonical: string): boolean {
  return canonical.endsWith('/');
}

/** Absolute path of a root-relative path. '' means the root itself. */
export function absOf(rootPath: string, rel: string): string {
  const trimmed = toRel(rel);
  return trimmed.length === 0 ? rootPath : `${rootPath}/${trimmed}`;
}

/** Last segment, without the canonical directory slash. */
export function baseNameOf(path: string): string {
  const trimmed = toRel(path);
  const slash = trimmed.lastIndexOf('/');
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

/**
 * The containing directory, canonically. '' for a top-level entry, which is
 * also how the ROOT is spelled everywhere in this module — the root has no
 * name, so an empty string is the only honest canonical form for it.
 */
export function parentOf(path: string): string {
  const trimmed = toRel(path);
  const slash = trimmed.lastIndexOf('/');
  return slash === -1 ? '' : trimmed.slice(0, slash + 1);
}

/**
 * Where `sourceCanonical` lands when dropped into `destDirCanonical`
 * ('' = the project root). Keeps the source's own directory slash, because
 * Pierre's store refuses a move whose spelling changes kind.
 */
export function destinationFor(
  sourceCanonical: string,
  destDirCanonical: string
): string {
  const name = baseNameOf(sourceCanonical);
  const leaf = isDirPath(sourceCanonical) ? name + '/' : name;
  return destDirCanonical.length === 0 ? leaf : destDirCanonical + leaf;
}

export interface PathMove {
  from: string;
  to: string;
}

/**
 * Plan a drop: one move per dragged path, skipping the ones already sitting
 * in the destination (Pierre allows the gesture; the disk would be a no-op)
 * and the impossible ones (a folder into itself or its own descendant).
 *
 * Returns the moves in the order given, so the caller can pair them with the
 * `FsMovePair`s main reports back.
 */
export function planMoves(
  draggedCanonical: readonly string[],
  destDirCanonical: string
): PathMove[] {
  const moves: PathMove[] = [];
  for (const from of draggedCanonical) {
    if (parentOf(from) === destDirCanonical) continue;
    if (isDirPath(from) && destDirCanonical.startsWith(from)) continue;
    moves.push({ from, to: destinationFor(from, destDirCanonical) });
  }
  return moves;
}

/**
 * Rewrite one path under a move. A directory move carries its whole subtree,
 * which is why this is prefix arithmetic and not an equality check.
 */
export function remapPath(path: string, move: PathMove): string {
  if (path === move.from) return move.to;
  if (isDirPath(move.from) && path.startsWith(move.from)) {
    return move.to + path.slice(move.from.length);
  }
  return path;
}

/**
 * Apply a set of moves to the path set the model has been fed, so the next
 * listing diff compares like with like. Pierre has already applied the same
 * moves to its own store (it mutates optimistically on drop and on rename
 * commit) — this keeps our record of that in step.
 */
export function remapPathSet(
  paths: ReadonlySet<string>,
  moves: readonly PathMove[]
): Set<string> {
  if (moves.length === 0) return new Set(paths);
  const next = new Set<string>();
  for (const path of paths) {
    let mapped = path;
    for (const move of moves) mapped = remapPath(mapped, move);
    next.add(mapped);
  }
  return next;
}

/** The inverse of a move list, for reverting an optimistic mutation. */
export function invertMoves(moves: readonly PathMove[]): PathMove[] {
  return moves.map((m) => ({ from: m.to, to: m.from }));
}

/**
 * Every directory whose LISTING a set of moves invalidates: each source's
 * old parent and the destination. Absolute, because that is what the
 * listing cache is keyed by.
 */
export function touchedDirs(
  rootPath: string,
  moves: readonly PathMove[]
): string[] {
  const dirs = new Set<string>();
  for (const move of moves) {
    dirs.add(absOf(rootPath, parentOf(move.from)));
    dirs.add(absOf(rootPath, parentOf(move.to)));
  }
  return [...dirs];
}

/**
 * A name no sibling is using, in Finder's spelling: "untitled",
 * "untitled 2". The seed for a New File / New Folder row, which is born in
 * rename mode with this text selected — so it has to be a name you would not
 * mind if you just pressed ↩, and one that never collides.
 */
export function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
