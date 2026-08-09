/**
 * Feature-detected access to the OPTIONAL fs bridge extensions
 * (fs:readDir / fs:reveal — see the file-tree append in src/shared/ipc.ts).
 * The tree degrades to a friendly stub when the preload hasn't wired them.
 */

import type { GmuxFsExtras } from '@shared/ipc';
import type { ReadDirResult } from '@shared/types';

function extras(): GmuxFsExtras {
  return (window.gmux?.fs ?? {}) as GmuxFsExtras;
}

/** True when the preload exposes fs.readDir (integrator wiring landed). */
export function canReadDir(): boolean {
  return typeof extras().readDir === 'function';
}

export function readDir(dirPath: string): Promise<ReadDirResult> {
  const fn = extras().readDir;
  if (typeof fn !== 'function') {
    return Promise.reject(new Error('fs.readDir is not available'));
  }
  return fn(dirPath);
}

/** True when the preload exposes fs.reveal (Finder context-menu item). */
export function canReveal(): boolean {
  return typeof extras().reveal === 'function';
}

export function reveal(path: string): Promise<void> {
  const fn = extras().reveal;
  if (typeof fn !== 'function') {
    return Promise.reject(new Error('fs.reveal is not available'));
  }
  return fn(path);
}
