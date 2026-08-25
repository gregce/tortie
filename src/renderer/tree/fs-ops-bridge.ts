/**
 * Feature-detected access to the Phase 12.9 mutation channels
 * (fs:createFile / fs:createFolder / fs:rename / fs:duplicate / fs:move /
 * fs:trash), in the same shape as the read-side `fs-bridge.ts`.
 *
 * Detection is not ceremony: the tree ships in builds whose preload predates
 * these channels (and in the vitest environment, where there is no
 * `window.gmux` at all). `canMutate()` is what hides the whole verb set from
 * the context menu rather than letting it throw on click.
 *
 * Nothing here interprets a result — the guards, the Trash rule and the
 * would-overwrite protocol all live in main (src/main/fs/file-ops.ts). This
 * module is the typed doorway.
 */

import type {
  FsCreateInput,
  FsDuplicateInput,
  FsImportInput,
  FsImportResult,
  FsMoveInput,
  FsMoveResult,
  FsOpEntry,
  FsRenameInput,
  FsRenameResult,
  FsStartDragInput,
  FsTrashInput,
  FsTrashResult
} from '@shared/fs-ops';
import type { InstalledFsApi } from '@shared/ipc';
import { gmuxBridge } from '../bridge';

type Ops = InstalledFsApi;

function ops(): Ops | undefined {
  return gmuxBridge()?.fs;
}

/**
 * True when the preload exposes the mutation channels. `trash` is the probe
 * because it is the one verb whose absence must hide the others too — a menu
 * that can create but not delete is worse than no menu.
 */
export function canMutate(): boolean {
  const api = ops();
  return (
    typeof api?.trash === 'function' &&
    typeof api.rename === 'function' &&
    typeof api.createFile === 'function' &&
    typeof api.createFolder === 'function' &&
    typeof api.move === 'function'
  );
}

/** True when this build can duplicate (a later append than the other four). */
export function canDuplicate(): boolean {
  return typeof ops()?.duplicate === 'function';
}

function missing(name: string): Promise<never> {
  return Promise.reject(new Error(`fs.${name} is not available`));
}

export function createFile(input: FsCreateInput): Promise<FsOpEntry> {
  const fn = ops()?.createFile;
  return typeof fn === 'function' ? fn(input) : missing('createFile');
}

export function createFolder(input: FsCreateInput): Promise<FsOpEntry> {
  const fn = ops()?.createFolder;
  return typeof fn === 'function' ? fn(input) : missing('createFolder');
}

export function rename(input: FsRenameInput): Promise<FsRenameResult> {
  const fn = ops()?.rename;
  return typeof fn === 'function' ? fn(input) : missing('rename');
}

export function duplicate(input: FsDuplicateInput): Promise<FsOpEntry> {
  const fn = ops()?.duplicate;
  return typeof fn === 'function' ? fn(input) : missing('duplicate');
}

export function move(input: FsMoveInput): Promise<FsMoveResult> {
  const fn = ops()?.move;
  return typeof fn === 'function' ? fn(input) : missing('move');
}

export function trash(input: FsTrashInput): Promise<FsTrashResult> {
  const fn = ops()?.trash;
  return typeof fn === 'function' ? fn(input) : missing('trash');
}

/**
 * PHASE 154. Copy entries from outside the project into one folder of it.
 *
 * Feature-detected like every member above, and separately from `canMutate`:
 * a build whose preload predates this channel keeps every menu verb it always
 * had, and a drop from outside says one sentence rather than throwing.
 */
export function canImport(): boolean {
  return typeof ops()?.importPaths === 'function';
}

export function importPaths(input: FsImportInput): Promise<FsImportResult> {
  const fn = ops()?.importPaths;
  return typeof fn === 'function' ? fn(input) : missing('importPaths');
}

/** PHASE 154. True when this build can begin the operating system's drag. */
export function canDragOut(): boolean {
  return typeof ops()?.startDrag === 'function';
}

export function startDrag(input: FsStartDragInput): Promise<void> {
  const fn = ops()?.startDrag;
  return typeof fn === 'function' ? fn(input) : missing('startDrag');
}
