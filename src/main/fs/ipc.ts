/**
 * fs:* IPC — file tree bridge (Phase 4) + editor file IO (Phase 5) + the
 * file-operations service (Phase 12.9).
 *
 * Registers:
 *   - fs:readDir   one directory listing, unfiltered/unsorted (the renderer
 *                  hides `.git`, keeps dotfiles, and sorts)      [tree]
 *   - fs:reveal    Finder reveal (tree context menu)             [tree]
 *   - fs:readFile  UTF-8 file read for the Monaco editor, capped at
 *                  READ_CAP_BYTES with `truncated` set when hit; binary
 *                  files (NUL byte in the head) are refused with a
 *                  friendly FS_FAILED                            [editor]
 *   - fs:writeFile ⌘S save from the editor                       [editor]
 *   - fs:createFile / fs:createFolder / fs:rename / fs:move / fs:trash
 *                  the tree's file operations (Phase 12.9). Every path is
 *                  proven to be inside an OPEN PROJECT root, `.git` is
 *                  refused at any depth, delete goes to the macOS Trash via
 *                  shell.trashItem, and a move that would overwrite resolves
 *                  with 'would-overwrite' instead of clobbering. The rules
 *                  live in file-ops.ts + paths.ts; this file is wiring.
 */

import { BrowserWindow, dialog, shell } from 'electron';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { open as openFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve as resolvePath } from 'node:path';
import type { FsDirEntry, ReadFileResult } from '@shared/types';
import { gmuxError } from '../errors';
import { handle } from '../typed-ipc';
import type { FileOpsDeps } from './file-ops';
import { createFileOps } from './file-ops';
import type { OpenWithDeps } from './open-with';
import { createOpenWith, defaultOpenWithDeps } from './open-with';


function entryKind(d: {
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  isFile(): boolean;
}): FsDirEntry['kind'] {
  // Order matters: symlinks first would misreport dir-symlinks — the tree
  // spec wants 'dir' ONLY for real directories (Dirent.isDirectory() is
  // false for symlinks, so this order is safe AND explicit).
  if (d.isDirectory()) return 'dir';
  if (d.isSymbolicLink()) return 'symlink';
  if (d.isFile()) return 'file';
  return 'other';
}

/**
 * Editor read cap: 5 MB is far beyond any file a human reviews in a diff,
 * and keeps a mis-click on a bundle/minified artifact from freezing the
 * renderer. Truncated reads open read-only in the editor.
 */
const READ_CAP_BYTES = 5 * 1024 * 1024;

/** Bytes sniffed for NUL to classify a file as binary (git's heuristic). */
const BINARY_SNIFF_BYTES = 8192;

/** Read up to READ_CAP_BYTES of a file as UTF-8, refusing binary content. */
async function readTextCapped(abs: string): Promise<ReadFileResult> {
  const fh = await openFile(abs, 'r');
  try {
    const { size } = await fh.stat();
    const toRead = Math.min(size, READ_CAP_BYTES);
    const buf = Buffer.alloc(toRead);
    let offset = 0;
    while (offset < toRead) {
      const { bytesRead } = await fh.read(buf, offset, toRead - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const head = buf.subarray(0, Math.min(offset, BINARY_SNIFF_BYTES));
    if (head.includes(0)) {
      throw gmuxError(
        'FS_FAILED',
        `${basename(abs)} is a binary file — Tortie edits text files only.`
      );
    }
    return {
      path: abs,
      contents: buf.subarray(0, offset).toString('utf8'),
      encoding: 'utf8',
      truncated: size > READ_CAP_BYTES
    };
  } finally {
    await fh.close();
  }
}

/**
 * Production dependencies for the file-operations service.
 *
 * `listProjectRoots` reads the manifest through the singleton core, so the
 * authority on "what is a project root" is the same list the tabs render
 * from. Imported lazily: the fs channels must not drag the tmux core into
 * the module graph at boot, and by the time a user renames a file the core
 * has long since resolved.
 */
function defaultFileOpsDeps(): FileOpsDeps {
  return {
    trashItem: (path) => shell.trashItem(path),
    listProjectRoots: async () => {
      const { getGmuxCore } = await import('../sessions');
      return (await getGmuxCore()).listProjects().map((p) => p.path);
    }
  };
}

/**
 * Raise the system's own application panel and hand back the picked bundle.
 *
 * `treatPackageAsDirectory` is deliberately absent: leaving it off is what
 * makes an .app bundle selectable rather than something the user browses
 * into. Parenting to the sender's window follows projects:pickDirectory in
 * src/main/ipc.ts, which is the existing precedent for a modal panel.
 */
async function chooseAppFor(event: IpcMainInvokeEvent): Promise<string | null> {
  const options = {
    properties: ['openFile'] as Array<'openFile'>,
    defaultPath: '/Applications',
    filters: [{ name: 'Applications', extensions: ['app'] }],
    message: 'Choose an app to open this file',
    buttonLabel: 'Open'
  };
  const win = BrowserWindow.fromWebContents(event.sender);
  const result =
    win !== null && !win.isDestroyed()
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
  if (result.canceled) return null;
  return result.filePaths[0] ?? null;
}

/**
 * Register fs:readDir + fs:reveal (tree), fs:readFile + fs:writeFile
 * (editor), the Phase 12.9 mutation channels and the Phase 39 Open With pair.
 * Call once during main-process boot. `deps` is for tests and for an
 * integrator that wants to hand in its own project-root source; production
 * passes nothing.
 */
export function registerFsIpc(
  ipc: IpcMain,
  deps?: FileOpsDeps,
  openWithDeps?: OpenWithDeps
): void {
  const fileOps = createFileOps(deps ?? defaultFileOpsDeps());

  handle(ipc, 'fs:readDir', async (_e, dirPath) => {
    if (typeof dirPath !== 'string' || dirPath.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'A directory path is required.');
    }
    const abs = resolvePath(dirPath);
    try {
      const dirents = await readdir(abs, { withFileTypes: true });
      const entries: FsDirEntry[] = dirents.map((d) => ({
        name: d.name,
        path: `${abs}/${d.name}`,
        kind: entryKind(d)
      }));
      return { path: abs, entries };
    } catch (err) {
      throw gmuxError(
        'FS_FAILED',
        `Could not read ${basename(abs)}`,
        (err as Error).message
      );
    }
  });

  handle(ipc, 'fs:reveal', (_e, path) => {
    if (typeof path !== 'string' || path.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'A path is required.');
    }
    shell.showItemInFolder(resolvePath(path));
  });

  handle(ipc, 'fs:readFile', async (_e, path) => {
    if (typeof path !== 'string' || path.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'A file path is required.');
    }
    const abs = resolvePath(path);
    try {
      return await readTextCapped(abs);
    } catch (err) {
      if (err instanceof Error && err.name === 'GmuxError') throw err;
      throw gmuxError(
        'FS_FAILED',
        `Could not open ${basename(abs)}`,
        (err as Error).message
      );
    }
  });

  handle(ipc, 'fs:writeFile', async (_e, path, contents) => {
    if (typeof path !== 'string' || path.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'A file path is required.');
    }
    if (typeof contents !== 'string') {
      throw gmuxError('INVALID_INPUT', 'File contents must be text.');
    }
    const abs = resolvePath(path);
    try {
      await writeFile(abs, contents, 'utf8');
    } catch (err) {
      throw gmuxError(
        'FS_FAILED',
        `Could not save ${basename(abs)}`,
        (err as Error).message
      );
    }
  });

  // ----- Phase 12.9 file operations --------------------------------------
  // Thin by design: each handler is one call into the service, which owns
  // the guards. Rejections already carry GmuxErrorPayload with the errno in
  // `detail` (see fs/errors.ts) — nothing is re-wrapped here.

  handle(ipc, 'fs:createFile', (_e, input) => fileOps.createFile(input));
  handle(ipc, 'fs:createFolder', (_e, input) => fileOps.createFolder(input));
  handle(ipc, 'fs:rename', (_e, input) => fileOps.rename(input));
  handle(ipc, 'fs:duplicate', (_e, input) => fileOps.duplicate(input));
  handle(ipc, 'fs:move', (_e, input) => fileOps.move(input));
  handle(ipc, 'fs:trash', (_e, input) => fileOps.trash(input));

  // ----- Phase 39 Open With ----------------------------------------------
  // Thin by design, like the block above: the deadline, the cache, the
  // dedupe rule and every refusal live in open-with.ts.

  const openWith = createOpenWith(openWithDeps ?? defaultOpenWithDeps());

  handle(ipc, 'fs:openWithApps', (_e, input) => openWith.apps(input));
  handle(ipc, 'fs:openWith', (e, input) =>
    openWith.open(input, () => chooseAppFor(e))
  );
}
