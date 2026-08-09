/**
 * fs:* IPC — file tree bridge (Phase 4) + editor file IO (Phase 5).
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
 */

import { shell } from 'electron';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { open as openFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve as resolvePath } from 'node:path';
import type {
  ExtendedInvokeChannel,
  ExtendedInvokeReq,
  ExtendedInvokeRes
} from '@shared/ipc';
import type { FsDirEntry, ReadFileResult } from '@shared/types';
import { gmuxError } from '../tmux/errors';

/** Typed ipcMain.handle wrapper over the combined (frozen + appended) map. */
function handle<C extends ExtendedInvokeChannel>(
  ipc: IpcMain,
  channel: C,
  fn: (
    event: IpcMainInvokeEvent,
    ...args: ExtendedInvokeReq<C>
  ) => Promise<ExtendedInvokeRes<C>> | ExtendedInvokeRes<C>
): void {
  ipc.handle(channel, (event, ...args) =>
    fn(event, ...(args as ExtendedInvokeReq<C>))
  );
}

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
        `${basename(abs)} is a binary file — gmux edits text files only.`
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
 * Register fs:readDir + fs:reveal (tree) and fs:readFile + fs:writeFile
 * (editor). Call once during main-process boot.
 */
export function registerFsIpc(ipc: IpcMain): void {
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
}
