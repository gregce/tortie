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
 */
export function isProtectedFsPath(relPath: string): boolean {
  if (relPath.length === 0) return false;
  return relPath
    .split('/')
    .some((segment) => segment === PROTECTED_FS_SEGMENT);
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
