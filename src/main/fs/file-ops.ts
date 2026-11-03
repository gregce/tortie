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
 *  - PHASE 154. `importPaths` is the one verb whose SOURCE is deliberately
 *    outside the root, and it obeys every rule above: the destination goes
 *    through the same unchanged guard, collisions are found before a byte is
 *    written, and a confirmed overwrite trashes the displaced entry first. It
 *    COPIES, so the original stays where it was.
 *  - PHASE 274. **An answer is spelled under the root the CALLER named.** See
 *    the section below; it is the one rule in this list that is about the
 *    reply rather than about the disk.
 *
 * Nothing here writes file CONTENT — created files are empty, which is what
 * the tree's inline-rename-on-create flow wants.
 *
 * ## PHASE 274 — WHICH SPELLING THIS MODULE ANSWERS IN
 *
 * THE DEFECT, MEASURED IN THE RUNNING APP. Two kinds of channel serve one
 * file tree and they did not agree about what a file is called. `fs:readDir`
 * ECHOES the caller's spelling — it resolves `dirPath` and composes each child
 * onto the string it was handed (`./ipc.ts:208`) — while every mutation verb
 * in this module composed its answer from `realRoot`, which is `realpath`'d.
 * On a project whose stored spelling is not the disk's, those are two
 * different strings for one file, and on a case-insensitive volume (the APFS
 * default, which both the reporter's Mac and the operator's run) that happens
 * to anybody who opens `~/source/proj` while the disk says `~/Source/proj`.
 *
 * What it cost, driven over a real case-mismatched folder: **6 of 23 tree
 * steps passed on the person's spelling against 23 of 23 on the disk's, and
 * all 17 failures were silent** — no toast, no console error. A file created
 * from the tree opened no tab, a rename did not follow an open tab, a move
 * that would have clobbered raised no confirmation, a `.git` drop was not
 * refused, and one folder was drawn twice. The same split sent ⌘S out of the
 * compare-and-swap door, because `fileInRepo` is a prefix test of the tab's
 * path against the project's and the two no longer shared a prefix — which is
 * the shape issue 16 exists to prevent.
 *
 * THE RULE. `entry()` composes `path` from the root the caller named and
 * `relPath` from `realRoot`. Nothing else moves. Containment is unchanged:
 * `resolveOpenProjectRoot` and `resolveInsideRoot` are called in the same
 * order with the same arguments, `realRoot` is still the value every guard is
 * asked about, and the string this hands back is re-proved by both of them the
 * next time it is used — Phase 273 already made the caller-spelled absolute
 * form admissible on re-entry. So this is a decision about the REPLY and not a
 * weakening of the gate.
 *
 * AND THE DESTRUCTIVE ACTS STILL USE THE RESOLVED PATH. A confirmed overwrite
 * trashes the displaced entry by `destAbs`, the value `resolveInsideRoot`
 * proved, rather than by the re-spelled `path` on the answer beside it. On a
 * folding volume the two name one file and it would not matter; the rule is
 * that what acts is what the guard measured, and it costs nothing to keep.
 */

import { cp, lstat, mkdir, open, rename } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import type {
  FsCreateInput,
  FsDuplicateInput,
  FsImportConflict,
  FsImportInput,
  FsImportPair,
  FsImportResult,
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
import { MAX_IMPORT_SOURCES } from '@shared/fs-ops';
import { visibleName } from '@shared/visible-name';
import { gmuxError } from '../errors';
import { fsOpError, fsOpMessage } from './errors';
import type { ResolvedFsPath } from './paths';
import {
  assertBasename,
  assertIncomingBasename,
  resolveIncomingSource,
  resolveInsideRoot,
  resolveOpenProjectRoot
} from './paths';

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
  importPaths(input: FsImportInput): Promise<FsImportResult>;
  trash(input: FsTrashInput): Promise<FsTrashResult>;
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/**
 * PHASE 274. The two spellings of one project root, carried together so the
 * answer can be composed under one and every guard asked about the other.
 *
 * They are the same string for every project whose stored spelling matches the
 * disk, which is nine of the operator's nine today, so `underCallerRoot` below
 * short-circuits on identity and this costs those callers nothing at all.
 */
interface OpRoot {
  /**
   * The root every guard is asked about: absolute, existing, symlinks
   * collapsed, and proved to be a folder Tortie has open. `resolveInsideRoot`,
   * `relative()` and the containment refusals all read THIS and only this.
   */
  readonly real: string;
  /**
   * The root the CALLER named, `path.resolve`d and never `realpath`ed, so a
   * trailing separator, a `.` and a `..` are gone and the case, the Unicode
   * normalisation form and any symlinked ancestor are exactly as the caller
   * spelled them.
   */
  readonly asAsked: string;
}

/**
 * The caller's own spelling of a root, or the resolved one when it cannot be
 * used.
 *
 * `path.resolve` is pure string arithmetic and makes no call, so it removes a
 * trailing separator, a doubled one, a `.` and a `..` without ever touching the
 * disk. That is what we want for every shape except ONE.
 *
 * **A `..` SEGMENT IS REFUSED, and it is the only shape where the caller's
 * spelling and the disk's walk do not describe the same folder.** `resolve`
 * applies `..` LEXICALLY and `realpath` applies it PHYSICALLY, so for a root
 * spelled `/a/link/../b`, with `link` a symlink to `/x/y`, `resolve` answers
 * `/a/b` while `realpath` answers `/x/b`. Those are two different directories,
 * and re-spelling an answer from one under the other would name a file that is
 * not the file the verb just acted on. Every other shape is safe by
 * construction: a symlinked ancestor, a case difference and a normalisation
 * difference are all spellings the walk really passes through, which is why
 * `/a/link/b/f.txt` IS a spelling of the file at `/x/y/b/f.txt`.
 *
 * The fallback is the resolved root, which is exactly what this module
 * answered in before Phase 274, so a caller that spells a root this way is
 * left where it already was rather than given a wrong answer.
 *
 * **AND IT CANNOT FIRE TODAY, which was measured rather than assumed.**
 * `resolveProjectRoot` (`./paths.ts:381`) is `realpath(resolve(root))` — it
 * resolves the `..` LEXICALLY first and hands `realpath` the already-resolved
 * string — so `real` is by construction the canonical form of the very
 * spelling this composes under, and the `/a/link/../b` shape is refused by
 * that gate before it reaches here. `p274-caller-spelling.test.ts` pins that
 * refusal. The clause stays because the ordering it depends on lives in
 * ANOTHER module: a later round that realpathed the raw string instead would
 * make `underCallerRoot` silently wrong, and one `split` is a cheap thing to
 * be wrong about.
 */
function spellingAsAsked(input: unknown, real: string): string {
  if (typeof input !== 'string') return real;
  if (input.split('/').includes('..')) return real;
  return resolve(input);
}

/**
 * One absolute path, re-spelled under the root the caller named.
 *
 * THREE ANSWERS AND WHY EACH IS RIGHT.
 *
 *  1. The two roots are the same string — the overwhelmingly common case —
 *     so there is nothing to re-spell and `abs` is handed back untouched.
 *  2. `abs` is not under `real` at all. That is `importPaths`, whose SOURCE is
 *     deliberately outside the project (Phase 154), and a path outside the
 *     root has no spelling under it. It is handed back untouched too.
 *  3. Otherwise the tail beneath `real` is kept BYTE FOR BYTE and only the
 *     root part is replaced. The tail is what the disk itself just told us the
 *     file is called, through `resolveInsideRoot` and `readdir`; only the root
 *     is the part the caller and the disk disagree about. Nothing here compares
 *     two spellings for equality, lowercases anything or normalises anything —
 *     it is one slice at a known offset.
 */
function underCallerRoot(root: OpRoot, abs: string): string {
  if (root.asAsked === root.real) return abs;
  if (!isAtOrUnder(root.real, abs)) return abs;
  return root.asAsked + abs.slice(root.real.length);
}

/**
 * PHASE 274. `path` is spelled under the root the caller named; `relPath` is
 * measured from `realRoot`.
 *
 * `relPath` does NOT move, and that is deliberate rather than an omission. It
 * was already right in every verb — measured `sub/new.md` on the mis-spelled
 * root before this phase — because it is the tail beneath the root and the
 * tail is the half both spellings agree about. Keeping it measured from the
 * resolved root is also what keeps it honest when a caller names the project
 * through a symlink: the relative path is a fact about the tree, and it is the
 * absolute one a person's tab, project membership and save door are keyed by.
 */
function entry(root: OpRoot, abs: string, kind: FsOpEntry['kind']): FsOpEntry {
  return {
    path: underCallerRoot(root, abs),
    relPath: relative(root.real, abs),
    kind
  };
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
  /**
   * Resolve + authorize a project root before any path is interpreted. The
   * gate itself lives in paths.ts since Phase 39, so Open With runs the same
   * one rather than a second copy.
   *
   * PHASE 274 made it answer BOTH spellings. The gate call is byte for byte
   * the one that already shipped — same function, same arguments, same order,
   * same thrown refusals — and `asAsked` is read off the input it just proved,
   * by `spellingAsAsked`, which carries the one shape it refuses and why.
   */
  async function root(input: unknown): Promise<OpRoot> {
    const real = await resolveOpenProjectRoot(input, () =>
      deps.listProjectRoots()
    );
    return { real, asAsked: spellingAsAsked(input, real) };
  }

  async function createEntry(
    input: FsCreateInput,
    kind: FsOpEntry['kind']
  ): Promise<FsOpEntry> {
    const roots = await root(input.root);
    // PHASE 274. Every guard below reads this, unchanged and under its old
    // name; only `entry()` is handed the pair.
    const realRoot = roots.real;
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
    return entry(roots, target.abs, kind);
  }

  return {
    createFile: (input) => createEntry(input, 'file'),

    createFolder: (input) => createEntry(input, 'dir'),

    async rename(input: FsRenameInput): Promise<FsRenameResult> {
      const roots = await root(input.root);
      // PHASE 274. Every guard below reads this, unchanged and under its old
      // name; only `entry()` is handed the pair.
      const realRoot = roots.real;
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
        const unchanged = entry(roots, from.abs, kind);
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
        from: entry(roots, from.abs, kind),
        to: entry(roots, to.abs, kind)
      };
    },

    async duplicate(input: FsDuplicateInput): Promise<FsOpEntry> {
      const roots = await root(input.root);
      // PHASE 274. Every guard below reads this, unchanged and under its old
      // name; only `entry()` is handed the pair.
      const realRoot = roots.real;
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
          `There are already too many copies of "${visibleName(name)}".`,
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
      return entry(roots, destAbs, kind);
    },

    async move(input: FsMoveInput): Promise<FsMoveResult> {
      const roots = await root(input.root);
      // PHASE 274. Every guard below reads this, unchanged and under its old
      // name; only `entry()` is handed the pair.
      const realRoot = roots.real;
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
            `"${visibleName(basename(source.abs))}" cannot be moved inside itself.`,
            source.rel
          );
        }
        if (dirname(source.abs) === destDir.abs) {
          skipped.push(entry(roots, source.abs, kind));
          continue;
        }

        const destAbs = (
          await resolveInsideRoot(realRoot, join(destDir.abs, basename(source.abs)))
        ).abs;
        const destLeaf = await statLeaf(destAbs);
        const displaced =
          destLeaf !== null && !sameEntry(sourceStats, destLeaf)
            ? entry(roots, destAbs, kindOf(destLeaf))
            : null;
        if (displaced !== null) {
          conflicts.push({
            from: entry(roots, source.abs, kind),
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
            // PHASE 274. By `destAbs`, which is the value `resolveInsideRoot`
            // proved, and NOT by `item.displaced.path`, which is now spelled
            // under the root the caller named. On a case-folding volume the
            // two name one file either way; the rule is that what acts is
            // what the guard measured, and here it costs one word.
            await deps.trashItem(item.destAbs);
          }
          await rename(item.source.abs, item.destAbs);
        } catch (err) {
          throw fsOpError(err, 'move', basename(item.source.abs));
        }
        moved.push({
          from: entry(roots, item.source.abs, item.kind),
          to: entry(roots, item.destAbs, item.kind)
        });
      }
      return { status: 'moved', moved, skipped };
    },

    /**
     * PHASE 154. Copy entries from anywhere on this Mac into one folder of
     * the project.
     *
     * It is `move` with three differences and no fourth: the source guard is
     * `resolveIncomingSource` rather than `resolveInsideRoot`, the write is
     * `cp` rather than `rename`, and a source ALREADY sitting in the
     * destination is skipped instead of being a no-op rename.
     *
     * That last one is not a nicety. A row dragged out of Tortie to Finder
     * and dropped straight back onto the folder it came from arrives here as
     * a source whose parent IS the destination. Copying it would be `cp` from
     * a path to itself, and with a confirmed overwrite the displaced entry
     * would be trashed FIRST, so the file would be destroyed and nothing
     * would replace it. The check is two lines and it is the reason this
     * comment is long.
     */
    async importPaths(input: FsImportInput): Promise<FsImportResult> {
      const roots = await root(input.root);
      // PHASE 274. Every guard below reads this, unchanged and under its old
      // name; only `entry()` is handed the pair.
      const realRoot = roots.real;
      const destDir = await resolveInsideRoot(realRoot, input.destDir, {
        allowRoot: true
      });
      const destStats = await statLeaf(destDir.abs);
      if (destStats === null || !destStats.isDirectory()) {
        throw fsOpError(
          Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' }),
          'copy',
          basename(destDir.abs)
        );
      }

      if (!Array.isArray(input.sources) || input.sources.length === 0) {
        throw gmuxError('INVALID_INPUT', 'Nothing was dropped.');
      }
      if (input.sources.length > MAX_IMPORT_SOURCES) {
        throw gmuxError(
          'INVALID_INPUT',
          `One drop can bring in ${String(MAX_IMPORT_SOURCES)} items at most.`,
          String(input.sources.length)
        );
      }

      // ---- plan first; not one byte is written until every source is known
      interface PlannedImport {
        sourceAbs: string;
        kind: FsOpEntry['kind'];
        destAbs: string;
        displaced: FsOpEntry | null;
      }
      const planned: PlannedImport[] = [];
      const skipped: FsOpEntry[] = [];
      const conflicts: FsImportConflict[] = [];

      for (const raw of input.sources) {
        const sourceAbs = await resolveIncomingSource(raw);
        const sourceStats = await statLeaf(sourceAbs);
        if (sourceStats === null) {
          throw fsOpError(
            Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
            'copy',
            basename(sourceAbs)
          );
        }
        const kind = kindOf(sourceStats);

        // A folder can never be copied into itself or into anything under
        // it. Both spellings are already real paths, so a symlink cannot
        // make this comparison lie. Without it `cp` would either refuse with
        // a raw errno or, on a shape it does not catch, recurse forever.
        if (kind === 'dir' && isAtOrUnder(sourceAbs, destDir.abs)) {
          throw gmuxError(
            'INVALID_INPUT',
            `"${visibleName(basename(sourceAbs))}" cannot be copied inside itself.`,
            sourceAbs
          );
        }

        // ALREADY HERE. See the comment above this function: this is the
        // drag-out-and-back-in case and copying would destroy the file.
        if (dirname(sourceAbs) === destDir.abs) {
          skipped.push(entry(roots, sourceAbs, kind));
          continue;
        }

        // The leaf is validated on its own, so a dropped folder called
        // ".git" is refused by the same predicate that refuses it as a
        // destination. It is validated by the INCOMING rule rather than the
        // typed-name one: this name is already on disk, so it is checked and
        // handed back byte for byte. See `assertIncomingBasename`, which
        // carries the two measurements that made the difference matter.
        const name = assertIncomingBasename(basename(sourceAbs));
        const dest = await resolveInsideRoot(realRoot, join(destDir.abs, name));
        const destLeaf = await statLeaf(dest.abs);
        // The destination IS the source under another spelling — a
        // case-insensitive volume, or a link resolved to the same inode.
        if (sameEntry(sourceStats, destLeaf)) {
          skipped.push(entry(roots, sourceAbs, kind));
          continue;
        }
        const displaced =
          destLeaf !== null ? entry(roots, dest.abs, kindOf(destLeaf)) : null;
        if (displaced !== null) conflicts.push({ name, to: displaced });
        planned.push({ sourceAbs, kind, destAbs: dest.abs, displaced });
      }

      if (conflicts.length > 0 && input.overwrite !== true) {
        return { status: 'would-overwrite', conflicts };
      }

      // ---- apply
      const imported: FsImportPair[] = [];
      for (const item of planned) {
        try {
          if (item.displaced !== null) {
            // Even a confirmed overwrite goes to the Trash, never away.
            // PHASE 274. By `destAbs`, which is the value `resolveInsideRoot`
            // proved, and NOT by `item.displaced.path`, which is now spelled
            // under the root the caller named. On a case-folding volume the
            // two name one file either way; the rule is that what acts is
            // what the guard measured, and here it costs one word.
            await deps.trashItem(item.destAbs);
          }
          // `errorOnExist` stays true even on a confirmed overwrite: the
          // displaced entry went to the Trash a line ago, so the name is
          // free, and anything still standing there is a race worth failing
          // on rather than silently clobbering.
          await cp(item.sourceAbs, item.destAbs, {
            recursive: item.kind === 'dir',
            force: false,
            errorOnExist: true,
            preserveTimestamps: true,
            verbatimSymlinks: true
          });
        } catch (err) {
          throw fsOpError(err, 'copy', basename(item.sourceAbs));
        }
        imported.push({
          source: item.sourceAbs,
          to: entry(roots, item.destAbs, item.kind)
        });
      }
      return { status: 'imported', imported, skipped };
    },

    async trash(input: FsTrashInput): Promise<FsTrashResult> {
      const roots = await root(input.root);
      // PHASE 274. Every guard below reads this, unchanged and under its old
      // name; only `entry()` is handed the pair.
      const realRoot = roots.real;
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
          trashed.push(entry(roots, resolved.abs, kind));
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
