/**
 * `fs:readImage` registration — wiring only; the rules live in ./image.ts.
 *
 * Registered separately from registerFsIpc rather than folded into it: that
 * registrar owns the TEXT surface (readFile/writeFile) and the Phase 12.9
 * mutations, and the whole point of this channel is that images never share
 * a door with text.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import type { ImageReaderDeps } from './image';
import { createImageReader, defaultImageReaderDeps } from './image';

/**
 * Register the image channel. Call once during main-process boot. `deps` is
 * for tests; production passes nothing.
 */
export function registerImageIpc(ipc: IpcMain, deps?: ImageReaderDeps): void {
  const reader = createImageReader(deps ?? defaultImageReaderDeps());
  handle(ipc, 'fs:readImage', (_e, input) => reader.read(input));
}
