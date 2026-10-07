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

import { isProtectedFsPath } from '@shared/fs-ops';
import type { FsDirEntry } from '@shared/types';

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
 * Every directory that contains `path`, outermost first, canonically
 * ('src/', then 'src/app/'). The root is not in the list, because the root is
 * spelled '' and no rule in this module treats it as a containing directory.
 *
 * @pierre/trees computes the same chain internally for its git lane, which is
 * why the ignored store's "is this already covered" test has to agree with it
 * exactly: a directory answers for its whole subtree.
 */
export function ancestorDirsOf(path: string): string[] {
  const trimmed = toRel(path);
  const dirs: string[] = [];
  let from = 0;
  for (;;) {
    const slash = trimmed.indexOf('/', from);
    if (slash === -1) break;
    dirs.push(trimmed.slice(0, slash + 1));
    from = slash + 1;
  }
  return dirs;
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

/**
 * Where a drop from OUTSIDE the app lands, given the row under the pointer
 * (Phase 154). Null means the tree refuses this spot and paints nothing.
 *
 * The rule is the internal move's rule, said once more for a drag that has no
 * source inside the project:
 *
 *   a folder row        →  inside that folder
 *   a file row          →  that file's own folder, which is what "put it here"
 *                          means when you aim at a neighbour
 *   the empty space     →  the project root, spelled ''
 *   `.git`, or anything under it, or a row that is not on disk yet  →  null
 *   (PHASE 343) a link row drawn as a folder  →  the folder holding the link,
 *                          as for a file row, which is today's answer
 *   (PHASE 343) a row under a link  →  null
 *
 * It is a pure function of the row so the whole rule can be tested without a
 * DOM, a model or a disk, which is the only way the FILTERED case can be
 * proved: a filter changes which rows are mounted and never changes a mounted
 * row's own path, so the answer comes from the row and cannot drift.
 */
export function importTargetFor(
  row: { rel: string; isFolder: boolean } | null,
  pendingPath: string | null,
  links: TreeLinks
): string | null {
  if (row === null) return '';
  const canonical = toCanonical(toRel(row.rel), row.isFolder);
  // The pending create's row is not on disk yet, so it is neither a folder
  // you can drop into nor a neighbour whose folder you can name.
  if (pendingPath !== null && canonical === pendingPath) return null;
  // PHASE 343 (its fix round). A LINK ROW drawn as a folder is aimed at the
  // way a file row is, being the folder that holds it, so a drop from Finder
  // over it lands BESIDE the link exactly where it landed before this phase,
  // when the link was drawn as a leaf. Nothing ever lands INTO a link.
  const linkRow = row.isFolder && links.folders.has(canonical);
  const dir = row.isFolder && !linkRow ? canonical : parentOf(canonical);
  if (dir.length > 0 && isProtectedFsPath(dir)) return null;
  if (isProtectedFsPath(canonical)) return null;
  if (pendingPath !== null && dir === pendingPath) return null;
  // PHASE 343. Every row UNDER a link is a destination the Explorer never
  // writes into, so a drop from Finder over one paints nothing (today such a
  // row was never drawn). A link row under another link lands under that
  // outer link, so it is refused here too.
  if (isAtOrUnderLink(dir, links)) return null;
  return dir;
}

/**
 * PHASE 343's folded-row fix (2026-10-07, his ruling "Tiny fix + recheck that
 * case"). The folder a drop at one point of a row is aimed at, for the link
 * rule: the library's own answer, with ONE correction.
 *
 *   `dirUnderPointer`  the folder the library aims at (`dropDirFromEvent`:
 *                      the segment, then a folder row, then a file row's
 *                      folder), or null over no row
 *   `chain`            the chain row's segments and the one under the pointer
 *                      (`chainFromEvent`), or null for a row that is not one
 *
 * Once a link holding exactly one folder is opened, @pierre/trees folds the
 * link and that folder into ONE chain row (`.claude / skills / only`) whose
 * path is its deepest folder, under the link. On a segment the answer is that
 * segment's folder, as the library's: the link's own segment is the link row,
 * a segment above it is that folder, a segment under it stays refused. OFF
 * every segment (the row's icon, its padding, its marks) the library aims at
 * the deepest folder, which is under the link and refused; before this phase
 * that same point was the link's row, so there the answer is the OUTERMOST link
 * the row folds, and the link row's answer (beside the link) follows from it.
 * A row that folds no link keeps the library's answer.
 */
export function linkAimOf(
  dirUnderPointer: string | null,
  chain: { readonly segments: readonly string[]; readonly on: string | null } | null,
  links: TreeLinks
): string | null {
  if (dirUnderPointer === null || chain === null || chain.on !== null) {
    return dirUnderPointer;
  }
  for (const segment of chain.segments) {
    const dir = toCanonical(toRel(segment), true);
    if (links.folders.has(dir)) return dir;
  }
  return dirUnderPointer;
}

/**
 * PHASE 343's folded-row fix. The row a drop from Finder is aimed at, handed
 * to `importTargetFor`: a FOLDER row at or under a link is read as the folder
 * the drop is aimed at (`linkAimOf`), the way a move is aimed, so a drop on the
 * link's own segment or off every segment of a row that folds the link lands
 * beside the link, a drop on a segment above it lands in that folder, and a
 * segment under it stays refused. Every other row is today's: a file row, and
 * a folder row no link touches (an ordinary chain row keeps Phase 154's
 * reading, its deepest folder, wherever the pointer is on it).
 */
export function importRowFor(
  row: { rel: string; isFolder: boolean } | null,
  aimed: string | null,
  links: TreeLinks
): { rel: string; isFolder: boolean } | null {
  if (row === null || !row.isFolder || aimed === null || aimed.length === 0) {
    return row;
  }
  if (!isAtOrUnderLink(toCanonical(toRel(row.rel), true), links)) return row;
  return { rel: toCanonical(toRel(aimed), true), isFolder: true };
}

/**
 * PHASE 343 (its fix round). Where a MOVE dragged inside the tree lands when it
 * is dropped over a link row, or null when this rule has nothing to say.
 *
 * The library aims a drop over a folder row INTO that folder, and `canDrop`
 * refuses every folder at or under a link, so over a link row the library
 * moves nothing and draws no ring. Before this phase that row was a leaf and
 * the library aimed the same drop at the folder holding it. This answer is that
 * folder, so the tree's host can carry the drop there itself, and it is asked
 * ONLY when the folder under the pointer, read the library's own way
 * (`dropDirFromEvent`), is EXACTLY a link row: the library has then refused the
 * drop, and the two can never both move the same rows.
 *
 *   `dirUnderPointer`  the folder the library resolved under the pointer, or
 *                      null; '' is the project root, never a link row (since
 *                      the folded-row fix, read through `linkAimOf`, so the
 *                      area off every segment of a row that folds a link is
 *                      that link's row)
 *   `rowUnderPointer`  the row the pointer is over, as `rowFromEvent` reads it
 *                      (a chain row's segment carries no path of its own, so a
 *                      chain row reads as its row), or null
 *   null               not a link row, a link row under another link, a FILE
 *                      row under a link, a protected destination, a dragged
 *                      row under a link, or a dragged folder the destination is
 *                      inside of (the library's own self or descendant refusal)
 *
 * PHASE 343's NARROW FIX (2026-10-07, his ruling). Everything under a link is
 * read only, so a move dropped over ANY row under a link is refused, with no
 * ring, as the folder rows under it always were; only the link row ITSELF
 * (its folder row, or its segment of a chain row) carries the drop beside it.
 * A folder row or a segment under a link is refused by the folder test below,
 * because the library aims a drop over it at that very folder. A FILE row is
 * the one row the library aims at the folder HOLDING it, and a file directly
 * inside a linked folder names the LINK as that folder, so without the file
 * test a move over `.claude/skills/notes.md` was carried beside the link, into
 * `.claude/`. The file test reads the row by its own path, never by the
 * library's folder, and is asked of a file row alone: a chain row's path is
 * its deepest folder, which may sit under a link while the pointer is on the
 * link's own segment, and that drop is the link row's.
 */
export function besideLinkDrop(
  dragged: readonly string[],
  dirUnderPointer: string | null,
  links: TreeLinks,
  rowUnderPointer: { rel: string; type: 'file' | 'folder' } | null
): string | null {
  if (dirUnderPointer === null || dirUnderPointer.length === 0) return null;
  if (
    rowUnderPointer !== null &&
    rowUnderPointer.type === 'file' &&
    isUnderLink(toCanonical(toRel(rowUnderPointer.rel), false), links)
  ) {
    return null;
  }
  const dir = toCanonical(toRel(dirUnderPointer), true);
  if (!links.folders.has(dir) || isUnderLink(dir, links)) return null;
  const dest = parentOf(dir);
  if (dest.length > 0 && isProtectedFsPath(dest)) return null;
  if (dragged.length === 0) return null;
  for (const path of dragged) {
    if (isProtectedFsPath(path) || isUnderLink(path, links)) return null;
    if (isDirPath(path) && dest.startsWith(path)) return null;
  }
  return dest;
}

// ---------------------------------------------------------------------------
// PHASE 343. Links, asked everywhere `.git` is asked.
// ---------------------------------------------------------------------------
//
// From the Explorer, through a link, Tortie READS and never writes, on both
// computers. A link to a folder is drawn as a folder and opens one level per
// click; nothing under it can be created, renamed, moved, duplicated, deleted
// or saved from here. The link row ITSELF keeps today's verbs, because each of
// them acts on the link and never on what it points at (main's SYMLINK RULE
// and `verbatimSymlinks`, measured in the phase entry).
//
// TWO QUESTIONS, and which one a door asks is the whole rule:
//
//   SOURCES ask "is this row UNDER a link" (strictly below a link row). A
//   rename, a drag, a duplicate, a trash and a save start FROM a path, and the
//   link row itself is still a path the Explorer may act on.
//   DESTINATIONS ask "is this folder AT OR UNDER a link". A create, a drop and
//   an import land IN a folder, and the link row is such a folder now.
//
// Both read `TreeLinks`, built from the rows the loaded listings drew UNDER
// THE TAB'S ROOT and nothing else, so a link ABOVE the root (issue 25's
// project opened through a link) is never a row and never counts: that project
// still saves.

/**
 * The link rows the loaded listings drew, in canonical spelling.
 *
 * `folders` holds every link row drawn as a folder ('a/link/'). `rows` holds
 * every link row at all, being those folders and every link drawn as a leaf
 * ('a/linkFile'), which is what the row mark and the Trash sentence ask about.
 */
export interface TreeLinks {
  readonly folders: ReadonlySet<string>;
  readonly rows: ReadonlySet<string>;
}

/** A tree with no link rows, which is every tree before its first listing. */
export const NO_TREE_LINKS: TreeLinks = {
  folders: new Set<string>(),
  rows: new Set<string>()
};

/**
 * True when `canonical` sits STRICTLY below a link drawn as a folder. The link
 * row itself answers false: it is the link, not a path through it.
 */
export function isUnderLink(canonical: string, links: TreeLinks): boolean {
  if (links.folders.size === 0) return false;
  for (const dir of ancestorDirsOf(canonical)) {
    if (links.folders.has(dir)) return true;
  }
  return false;
}

/**
 * True when the FOLDER `dirCanonical` is a link drawn as a folder, or sits
 * under one. '' is the project root, which is never a link row.
 */
export function isAtOrUnderLink(
  dirCanonical: string,
  links: TreeLinks
): boolean {
  if (dirCanonical.length === 0 || links.folders.size === 0) return false;
  if (links.folders.has(toCanonical(toRel(dirCanonical), true))) return true;
  return isUnderLink(dirCanonical, links);
}

/**
 * Where a create aimed at `dirCanonical` lands (D7): the folder holding the
 * OUTERMOST link at or above it, or `dirCanonical` itself when no link is.
 *
 * Outermost, because a link under a link is still inside the first link, and
 * the first folder above every link is the only one the Explorer writes into.
 * For the link row itself this is the folder that holds the link, which is
 * exactly where New File… landed on it before this phase, when it was a leaf.
 */
export function outsideLinks(dirCanonical: string, links: TreeLinks): string {
  if (dirCanonical.length === 0 || links.folders.size === 0) {
    return dirCanonical;
  }
  const dir = toCanonical(toRel(dirCanonical), true);
  for (const candidate of [...ancestorDirsOf(dir), dir]) {
    if (links.folders.has(candidate)) return parentOf(candidate);
  }
  return dirCanonical;
}

/** True when a link row points at a folder, the one shape drawn as a folder. */
export function drawsAsFolder(entry: FsDirEntry): boolean {
  return (
    entry.kind === 'dir' || (entry.kind === 'symlink' && entry.link === 'dir')
  );
}

/**
 * True for a row a click must never open: a socket, a FIFO or a device, and
 * (PHASE 343) a link to one. Reading through a link to a FIFO waits for a
 * writer, holding one of main's file threads (measured, A5), so such a link is
 * inert by the rule a real FIFO has always had.
 */
export function isInertEntry(entry: FsDirEntry): boolean {
  return (
    entry.kind === 'other' ||
    (entry.kind === 'symlink' && entry.link === 'other')
  );
}

/** What the tree is fed from the listing cache, built in one place. */
export interface TreeInput {
  /** Every row's canonical spelling. */
  paths: Set<string>;
  /** The listing's kind per REL spelling. */
  kinds: Map<string, FsDirEntry['kind']>;
  /** REL spellings a click opens nothing for (see `isInertEntry`). */
  inert: Set<string>;
  /** PHASE 343. The link rows, for the two questions above. */
  links: TreeLinks;
}

/**
 * The listing cache, as the rows the tree draws. Only folders at or under
 * `rootPath` are read, so a link above the root is never a row.
 */
export function treeInputOf(
  entriesByDir: Readonly<Record<string, readonly FsDirEntry[]>>,
  rootPath: string
): TreeInput {
  const paths = new Set<string>();
  const kinds = new Map<string, FsDirEntry['kind']>();
  const inert = new Set<string>();
  const folders = new Set<string>();
  const rows = new Set<string>();
  for (const [dirAbs, entries] of Object.entries(entriesByDir)) {
    if (dirAbs !== rootPath && !dirAbs.startsWith(rootPath + '/')) continue;
    for (const entry of entries) {
      const rel = entry.path.slice(rootPath.length + 1);
      if (rel.length === 0) continue;
      kinds.set(rel, entry.kind);
      const canonical = toCanonical(rel, drawsAsFolder(entry));
      paths.add(canonical);
      if (isInertEntry(entry)) inert.add(rel);
      if (entry.kind !== 'symlink') continue;
      rows.add(canonical);
      if (isDirPath(canonical)) folders.add(canonical);
    }
  }
  return { paths, kinds, inert, links: { folders, rows } };
}
