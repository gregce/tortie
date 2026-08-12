/**
 * The file-operations service behind fs:createFile / fs:createFolder /
 * fs:rename / fs:move / fs:trash (Phase 12.9).
 *
 * Rules this module exists to enforce, all of them in one place:
 *  - Every path goes through `resolveInsideRoot` (paths.ts) before the disk
 *    is touched: no `..`, no absolute path outside the project, no escape
 *    through a directory symlink, no `.git` at any depth.
 *  - DELETE MEANS TRASH. Nothing here calls unlink or rm — `trashItem` is
 *    injected (Electron's `shell.trashItem` in production) so a delete is
 *    recoverable from Finder by construction, and so the guards can be unit
 *    tested without Electron.
 *  - A move that would overwrite resolves with `status: 'would-overwrite'`
 *    and moves NOTHING, so the UI can prompt naming every collision at once.
 *    A confirmed overwrite trashes the displaced entry before renaming — an
 *    overwrite is still not a destruction.
 *  - Moves and renames are plain `fs.rename`: git infers the rename, so a
 *    tracked file keeps its history and `git status` stays sane.
 *
 * Nothing here writes file CONTENT — created files are empty, which is what
 * the tree's inline-rename-on-create flow wants.
 */

import { cp, lstat, mkdir, open, rename } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import type {
  FsCreateInput,
  FsDuplicateInput,
  FsMoveConflict,
  FsMoveInput,
  FsMovePair,
  FsMoveResult,
  FsOpEntry,
  FsRenameInput,
  FsRenameResult,
  FsTrashFailure,
  FsTrashInput,
  FsTrashResult
} from '@shared/fs-ops';
import { gmuxError } from '../errors';
import { fsOpError, fsOpMessage } from './errors';
import type { ResolvedFsPath } from './paths';
import { assertBasename, resolveInsideRoot, resolveProjectRoot } from './paths';

/** Injected so `shell.trashItem` (Electron-only) stays out of the unit tests. */
export interface FileOpsDeps {
  /** macOS Trash. The ONLY deletion path in gmux. */
  trashItem(path: string): Promise<void>;
  /**
   * Absolute paths of the folders gmux currently has open as projects.
   * A `root` that is not one of them is refused — a renderer bug must not be
   * able to turn "/" into a project root and make the whole disk writable.
   */
  listProjectRoots(): Promise<readonly string[]>;
}

export interface FileOpsService {
  createFile(input: FsCreateInput): Promise<FsOpEntry>;
  createFolder(input: FsCreateInput): Promise<FsOpEntry>;
  rename(input: FsRenameInput): Promise<FsRenameResult>;
  duplicate(input: FsDuplicateInput): Promise<FsOpEntry>;
  move(input: FsMoveInput): Promise<FsMoveResult>;
  trash(input: FsTrashInput): Promise<FsTrashResult>;
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

function entry(
  realRoot: string,
  abs: string,
  kind: FsOpEntry['kind']
): FsOpEntry {
  return { path: abs, relPath: relative(realRoot, abs), kind };
}

/** lstat without following the leaf; null when the entry is not there. */
async function statLeaf(abs: string): Promise<Stats | null> {
  try {
    return await lstat(abs);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

function kindOf(stats: Stats): FsOpEntry['kind'] {
  return stats.isDirectory() ? 'dir' : 'file';
}

/**
 * Same on-disk entry? Case-insensitive volumes (the macOS default) report a
 * `Foo.txt` destination as EXISTING when the source is `foo.txt` — that is a
 * case-only rename, not a collision.
 */
function sameEntry(left: Stats | null, right: Stats | null): boolean {
  if (left === null || right === null) return false;
  return left.dev === right.dev && left.ino === right.ino;
}

/**
 * Finder's copy naming: "notes.md" → "notes copy.md" → "notes copy 2.md".
 * A leading dot is part of the name, not an extension separator, so
 * ".gitignore" duplicates to ".gitignore copy" and never to " copy.gitignore".
 */
export function copyNameFor(name: string, n: number): string {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return n < 2 ? `${stem} copy${ext}` : `${stem} copy ${n}${ext}`;
}

/** True when `candidate` is `dir` itself or lives underneath it. */
function isAtOrUnder(dir: string, candidate: string): boolean {
  if (candidate === dir) return true;
  return candidate.startsWith(dir.endsWith(sep) ? dir : dir + sep);
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

export function createFileOps(deps: FileOpsDeps): FileOpsService {
  /** Resolve + authorize a project root before any path is interpreted. */
  async function root(input: unknown): Promise<string> {
    const realRoot = await resolveProjectRoot(input);
    const known = await deps.listProjectRoots();
    for (const candidate of known) {
      let realCandidate: string;
      try {
        realCandidate = await resolveProjectRoot(candidate);
      } catch {
        continue; // a project folder that has since gone away
      }
      if (realCandidate === realRoot) return realRoot;
    }
    throw gmuxError(
      'PROJECT_NOT_FOUND',
      'That folder is not an open project.',
      realRoot
    );
  }

  async function createEntry(
    input: FsCreateInput,
    kind: FsOpEntry['kind']
  ): Promise<FsOpEntry> {
    const realRoot = await root(input.root);
    const target = await resolveInsideRoot(realRoot, input.path);
    // The leaf is validated on its own so "New File" cannot smuggle in a
    // name like ".git" or ".." through the path string.
    assertBasename(basename(target.abs));
    try {
      await mkdir(dirname(target.abs), { recursive: true });
      if (kind === 'dir') {
        // Non-recursive on the leaf: an existing folder must surface EEXIST
        // rather than silently "succeeding".
        await mkdir(target.abs);
      } else {
        // 'wx' = create exclusively; never truncates an existing file.
        const handle = await open(target.abs, 'wx');
        await handle.close();
      }
    } catch (err) {
      throw fsOpError(err, 'create', basename(target.abs));
    }
    return entry(realRoot, target.abs, kind);
  }

  return {
    createFile: (input) => createEntry(input, 'file'),

    createFolder: (input) => createEntry(input, 'dir'),

    async rename(input: FsRenameInput): Promise<FsRenameResult> {
      const realRoot = await root(input.root);
      const from = await resolveInsideRoot(realRoot, input.path);
      const name = assertBasename(input.name);
      const to = await resolveInsideRoot(
        realRoot,
        join(dirname(from.abs), name)
      );

      const fromStats = await statLeaf(from.abs);
      if (fromStats === null) {
        throw fsOpError(
          Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
          'rename',
          basename(from.abs)
        );
      }
      const kind = kindOf(fromStats);
      if (from.abs === to.abs) {
        const unchanged = entry(realRoot, from.abs, kind);
        return { from: unchanged, to: unchanged };
      }

      const toStats = await statLeaf(to.abs);
      // A rename never overwrites: VS Code refuses the same way, and the one
      // "collision" that is not a collision is a case-only rename of the very
      // same inode on a case-insensitive volume.
      if (toStats !== null && !sameEntry(fromStats, toStats)) {
        throw fsOpError(
          Object.assign(new Error('EEXIST'), { code: 'EEXIST' }),
          'rename',
          name
        );
      }

      try {
        await rename(from.abs, to.abs);
      } catch (err) {
        throw fsOpError(err, 'rename', basename(from.abs));
      }
      return {
        from: entry(realRoot, from.abs, kind),
        to: entry(realRoot, to.abs, kind)
      };
    },

    async duplicate(input: FsDuplicateInput): Promise<FsOpEntry> {
      const realRoot = await root(input.root);
      const source = await resolveInsideRoot(realRoot, input.path);
      const sourceStats = await statLeaf(source.abs);
      if (sourceStats === null) {
        throw fsOpError(
          Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
          'duplicate',
          basename(source.abs)
        );
      }
      const kind = kindOf(sourceStats);

      // Find the free name by STATTING, not by trusting a listing: an agent
      // may have written "notes copy.md" a second ago. Bounded so a directory
      // full of copies cannot spin here.
      const dir = dirname(source.abs);
      const name = basename(source.abs);
      let destAbs: string | null = null;
      for (let n = 1; n <= 200; n += 1) {
        const candidate = await resolveInsideRoot(
          realRoot,
          join(dir, copyNameFor(name, n))
        );
        if ((await statLeaf(candidate.abs)) === null) {
          destAbs = candidate.abs;
          break;
        }
      }
      if (destAbs === null) {
        throw gmuxError(
          'FS_FAILED',
          `There are already too many copies of "${name}".`,
          'EEXIST'
        );
      }

      try {
        // Recursive so a folder duplicates whole; `force: false` +
        // `errorOnExist` keeps the "never overwrite" rule true even if
        // something lands on the name between the stat and the copy.
        await cp(source.abs, destAbs, {
          recursive: kind === 'dir',
          force: false,
          errorOnExist: true,
          preserveTimestamps: true,
          verbatimSymlinks: true
        });
      } catch (err) {
        throw fsOpError(err, 'duplicate', name);
      }
      return entry(realRoot, destAbs, kind);
    },

    async move(input: FsMoveInput): Promise<FsMoveResult> {
      const realRoot = await root(input.root);
      const destDir = await resolveInsideRoot(realRoot, input.destDir, {
        allowRoot: true
      });
      const destStats = await statLeaf(destDir.abs);
      if (destStats === null || !destStats.isDirectory()) {
        throw fsOpError(
          Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' }),
          'move',
          basename(destDir.abs)
        );
      }

      if (!Array.isArray(input.paths) || input.paths.length === 0) {
        throw gmuxError('INVALID_INPUT', 'Nothing was selected to move.');
      }

      // ---- plan first; the disk is not touched until every source is known
      interface Planned {
        source: ResolvedFsPath;
        kind: FsOpEntry['kind'];
        destAbs: string;
        displaced: FsOpEntry | null;
      }
      const planned: Planned[] = [];
      const skipped: FsOpEntry[] = [];
      const conflicts: FsMoveConflict[] = [];

      for (const raw of input.paths) {
        const source = await resolveInsideRoot(realRoot, raw);
        const sourceStats = await statLeaf(source.abs);
        if (sourceStats === null) {
          throw fsOpError(
            Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
            'move',
            basename(source.abs)
          );
        }
        const kind = kindOf(sourceStats);

        if (kind === 'dir' && isAtOrUnder(source.abs, destDir.abs)) {
          throw gmuxError(
            'INVALID_INPUT',
            `"${basename(source.abs)}" cannot be moved inside itself.`,
            source.rel
          );
        }
        if (dirname(source.abs) === destDir.abs) {
          skipped.push(entry(realRoot, source.abs, kind));
          continue;
        }

        const destAbs = (
          await resolveInsideRoot(realRoot, join(destDir.abs, basename(source.abs)))
        ).abs;
        const destLeaf = await statLeaf(destAbs);
        const displaced =
          destLeaf !== null && !sameEntry(sourceStats, destLeaf)
            ? entry(realRoot, destAbs, kindOf(destLeaf))
            : null;
        if (displaced !== null) {
          conflicts.push({
            from: entry(realRoot, source.abs, kind),
            to: displaced
          });
        }
        planned.push({ source, kind, destAbs, displaced });
      }

      if (conflicts.length > 0 && input.overwrite !== true) {
        return { status: 'would-overwrite', conflicts };
      }

      // ---- apply
      const moved: FsMovePair[] = [];
      for (const item of planned) {
        try {
          if (item.displaced !== null) {
            // Even a confirmed overwrite goes to the Trash, never away.
            await deps.trashItem(item.displaced.path);
          }
          await rename(item.source.abs, item.destAbs);
        } catch (err) {
          throw fsOpError(err, 'move', basename(item.source.abs));
        }
        moved.push({
          from: entry(realRoot, item.source.abs, item.kind),
          to: entry(realRoot, item.destAbs, item.kind)
        });
      }
      return { status: 'moved', moved, skipped };
    },

    async trash(input: FsTrashInput): Promise<FsTrashResult> {
      const realRoot = await root(input.root);
      if (!Array.isArray(input.paths) || input.paths.length === 0) {
        throw gmuxError('INVALID_INPUT', 'Nothing was selected to delete.');
      }

      const trashed: FsOpEntry[] = [];
      const failed: FsTrashFailure[] = [];
      for (const raw of input.paths) {
        const label = typeof raw === 'string' ? basename(raw) : String(raw);
        let resolved: ResolvedFsPath | null = null;
        try {
          resolved = await resolveInsideRoot(realRoot, raw);
          const stats = await statLeaf(resolved.abs);
          if (stats === null) {
            throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          }
          const kind = kindOf(stats);
          await deps.trashItem(resolved.abs);
          trashed.push(entry(realRoot, resolved.abs, kind));
        } catch (err) {
          // Per-entry, never all-or-nothing: a trash cannot be rolled back,
          // so the UI has to be told exactly what did and did not go.
          const { errno, message } = fsOpMessage(err, 'delete', label);
          failed.push({
            path: resolved?.abs ?? label,
            relPath: resolved?.rel ?? label,
            errno,
            message
          });
        }
      }
      return { trashed, failed };
    }
  };
}
