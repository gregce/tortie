/**
 * The file-operations contract (Phase 12.9) — shared by main, preload and the
 * renderer, so the tree's `canDrag` guard and the main-process guard are the
 * SAME rule rather than two rules that drift.
 *
 * Shape rules that the whole surface obeys:
 *  - Every request carries `root`, the ABSOLUTE project root. Main resolves
 *    each path against it and refuses anything that lands outside — including
 *    via `..` and via symlinks that point out of the tree.
 *  - `.git` is refused at any depth, as a source and as a destination, for
 *    mutation AND for dragging (isProtectedFsPath below is the one rule).
 *  - Deletion goes to the macOS Trash (`shell.trashItem`). Nothing in this
 *    contract can unlink a file, so "delete" is recoverable by construction.
 *  - A move that would overwrite RESOLVES with `status: 'would-overwrite'`
 *    instead of clobbering. The UI prompts, then re-sends with
 *    `overwrite: true`; main trashes the displaced entry before renaming, so
 *    even a confirmed overwrite is recoverable.
 *  - Real errno failures reject with the standard GmuxErrorPayload whose
 *    `detail` is exactly the errno token (FsOpErrno) and whose `message` is
 *    already written for a toast.
 */

/** Path segment that is never mutated, never dragged, at any depth. */
export const PROTECTED_FS_SEGMENT = '.git';

/**
 * True when a project-relative path touches `.git` at any depth (the repo's
 * own directory, or a nested submodule's). Accepts Pierre's canonical
 * spelling (directories end with '/') and plain relative paths alike.
 *
 * The tree's `canDrag` and the main-process guard both call this; a path that
 * fails here never becomes a drag source, a drop target, or a mutation.
 *
 * THE COMPARISON IS CASE FOLDED, AND THAT IS THE WHOLE POINT OF IT.
 *
 * It used to be `segment === '.git'`, which is the right rule on a volume that
 * tells `.GIT` and `.git` apart and is a hole on the volume this product
 * actually runs on. The default macOS volume is case insensitive APFS, so
 * `<root>/.GIT` and `<root>/.git` are ONE directory, and the exact comparison
 * let a name that reads as `.GIT` walk straight past a guard whose entire job
 * is to keep the repository out of reach.
 *
 * It was measured end to end rather than reasoned about. A folder named `.GIT`
 * dropped onto the project root from Finder resolved to a destination the guard
 * allowed, `lstat` reported the REAL `.git` sitting there, so the drop came back
 * as a conflict named `.GIT`, which is a name the person really did drag and so
 * a confirm they would plausibly give. Confirming trashed `<root>/.GIT`, which
 * is the repository, and copied the dropped folder into its place. The whole
 * history went in one gesture, and the sheet never said the word `.git`.
 *
 * Folding costs one false refusal, being a genuinely separate `.GIT` folder on
 * a case sensitive volume, and nobody has one. It matches what the incoming
 * name rule beside it already decided, which is that a name is refused on how
 * it READS rather than on what it is.
 */
export function isProtectedFsPath(relPath: string): boolean {
  if (relPath.length === 0) return false;
  return relPath
    .split('/')
    .some((segment) => segment.toLowerCase() === PROTECTED_FS_SEGMENT);
}

/** errno tokens a file operation can surface; carried in `payload.detail`. */
export type FsOpErrno =
  | 'EACCES'
  | 'EBUSY'
  | 'EEXIST'
  | 'EINVAL'
  | 'EISDIR'
  | 'ELOOP'
  | 'ENAMETOOLONG'
  | 'ENOENT'
  | 'ENOSPC'
  | 'ENOTDIR'
  | 'ENOTEMPTY'
  | 'EPERM'
  | 'EROFS'
  | 'EXDEV';

/** One entry, in both spellings the UI needs. */
export interface FsOpEntry {
  /** Absolute path on disk (symlink-safe: parents resolved, leaf not). */
  path: string;
  /** Path relative to the project root — '/'-separated, no leading slash. */
  relPath: string;
  kind: 'file' | 'dir';
}

/** Create a file or a folder. Missing parent directories are created too. */
export interface FsCreateInput {
  /** Absolute project root; must be a folder gmux has open as a project. */
  root: string;
  /** Target path: absolute inside `root`, or relative to it. */
  path: string;
}

/**
 * Copy an entry beside itself. Main picks the free name (Finder's spelling:
 * "notes copy.md", then "notes copy 2.md") rather than the renderer, because
 * only main can stat the directory — the tree's listing cache is a snapshot
 * and an agent may have written a colliding name a moment ago.
 */
export interface FsDuplicateInput {
  root: string;
  /** The entry to copy: absolute inside `root`, or relative to it. */
  path: string;
}

/** Rename in place — `name` is a basename; separators are refused. */
export interface FsRenameInput {
  root: string;
  path: string;
  name: string;
}

export interface FsRenameResult {
  from: FsOpEntry;
  to: FsOpEntry;
}

/** Move one or more entries into a destination directory. */
export interface FsMoveInput {
  root: string;
  paths: readonly string[];
  /** Destination DIRECTORY. The project root itself is allowed. */
  destDir: string;
  /**
   * Replace entries already at the destination. Each displaced entry is sent
   * to the Trash first, so a confirmed overwrite is still recoverable.
   * Omitted/false: main resolves with 'would-overwrite' and moves NOTHING.
   */
  overwrite?: boolean;
}

export interface FsMovePair {
  from: FsOpEntry;
  to: FsOpEntry;
}

export interface FsMoveConflict {
  /** The entry that cannot land. */
  from: FsOpEntry;
  /** What already occupies its destination. */
  to: FsOpEntry;
}

/**
 * All-or-nothing by design: conflicts are detected before anything moves, so
 * the prompt can name every collision at once and a cancel leaves the tree
 * exactly as it was.
 */
export type FsMoveResult =
  | {
      status: 'moved';
      moved: readonly FsMovePair[];
      /** Sources already living in `destDir` — nothing to do. */
      skipped: readonly FsOpEntry[];
    }
  | { status: 'would-overwrite'; conflicts: readonly FsMoveConflict[] };

/** Send entries to the macOS Trash. */
export interface FsTrashInput {
  root: string;
  paths: readonly string[];
}

export interface FsTrashFailure {
  path: string;
  relPath: string;
  /** errno when the platform gave one. */
  errno: FsOpErrno | null;
  /** Already written for a toast. */
  message: string;
}

/**
 * Trash reports per entry rather than throwing: a partial trash cannot be
 * rolled back, so the UI must be told exactly what did and did not move.
 */
export interface FsTrashResult {
  trashed: readonly FsOpEntry[];
  failed: readonly FsTrashFailure[];
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 154 (a drop from outside the app, and a drag out to
// Finder) — new types only, nothing above was modified.
//
// TWO NEW SHAPES AND WHY NEITHER IS A WIDENING OF AN EXISTING ONE.
//
// `fs:importPaths` copies entries that live OUTSIDE the project into it.
// Every other mutation above runs each of its paths through the one guard
// that refuses anything not under the root, and that refusal is what the
// whole surface rests on. Widening `fs:move` to take an outside source would
// put it behind a flag. So the import is its own verb with its own source
// guard, and the destination still goes through the same unchanged one.
//
// `fs:startDrag` is the opposite direction and is not a file operation at
// all: it hands paths to the operating system's own drag, which only the main
// process can start. It refuses everything the mutation channels refuse, plus
// a path that is not on disk, because a drag that produces nothing is worse
// than no drag.
// ---------------------------------------------------------------------------

/**
 * How many top level entries one drop may bring in.
 *
 * A drop is a deliberate gesture and a person rarely aims more than a handful
 * of items at a folder, so this is a bound on a runaway rather than a limit
 * anybody meets. A folder counts as ONE, whatever it holds.
 */
export const MAX_IMPORT_SOURCES = 64;

/** How many rows one gesture may hand to the operating system's drag. */
export const MAX_DRAG_OUT_PATHS = 64;

/**
 * Copy entries from anywhere on this Mac into one folder of the project.
 *
 * `sources` are ABSOLUTE paths and they are the only input in the whole fs
 * contract that is allowed to name something outside the root. They are
 * copied and never moved, so a drop from Finder leaves the original where it
 * was, which is what every file manager on the machine does.
 */
export interface FsImportInput {
  root: string;
  /** Absolute paths, anywhere on this Mac. Copied, never moved. */
  sources: readonly string[];
  /** Destination DIRECTORY inside the root. '' is the root itself. */
  destDir: string;
  /**
   * Replace entries already at the destination. Each displaced entry is sent
   * to the Trash first, exactly as a confirmed move does, so a confirmed
   * overwrite is still recoverable. Omitted or false: main resolves with
   * 'would-overwrite' and copies NOTHING.
   */
  overwrite?: boolean;
}

/** One incoming name that something at the destination already holds. */
export interface FsImportConflict {
  /** Basename of the entry being brought in. */
  name: string;
  /** What already occupies its destination. */
  to: FsOpEntry;
}

export interface FsImportPair {
  /** Where it came from, absolute, with every symlink resolved. */
  source: string;
  /** Where it landed. */
  to: FsOpEntry;
}

/**
 * All-or-nothing by design, exactly like a move: collisions are found before
 * a single byte is written, so the prompt names every one of them at once and
 * a cancel leaves the disk untouched.
 */
export type FsImportResult =
  | {
      status: 'imported';
      imported: readonly FsImportPair[];
      /**
       * Sources that were ALREADY sitting in the destination folder. This is
       * not a corner: it is what a row dragged out of Tortie and dropped
       * straight back in produces, and copying a file over itself would
       * destroy it.
       */
      skipped: readonly FsOpEntry[];
    }
  | { status: 'would-overwrite'; conflicts: readonly FsImportConflict[] };

/**
 * Hand rows to the operating system's own drag.
 *
 * `paths` are inside `root` and are proven so in main before anything is
 * handed over: a renderer bug must never be able to turn this into "give me
 * any file on the disk".
 */
export interface FsStartDragInput {
  root: string;
  /** Absolute inside `root`, or relative to it. */
  paths: readonly string[];
}
