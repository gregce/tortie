/**
 * fs:* IPC — the file-tree bridge (Phase 4 integration).
 *
 * Registers the two OPTIONAL extension channels the tree stream appended to
 * the contract (src/shared/ipc.ts, TreeInvokeChannelMap):
 *   - fs:readDir  one directory listing, unfiltered/unsorted (the renderer
 *                 hides `.git`, keeps dotfiles, and sorts)
 *   - fs:reveal   Finder reveal (tree context menu)
 *
 * The frozen fs:readFile / fs:writeFile channels stay UNREGISTERED here —
 * they belong to the Phase-5 editor stream.
 */

import { shell } from 'electron';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { readdir } from 'node:fs/promises';
import { basename, resolve as resolvePath } from 'node:path';
import type {
  ExtendedInvokeChannel,
  ExtendedInvokeReq,
  ExtendedInvokeRes
} from '@shared/ipc';
import type { FsDirEntry } from '@shared/types';
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

/** Register fs:readDir + fs:reveal. Call once during main-process boot. */
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
}
