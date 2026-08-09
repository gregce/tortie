/**
 * File-tree data store: lazy per-directory listings for the active project.
 *
 * Directories are listed on first expand (fs:readDir) and cached in
 * `entriesByDir` keyed by absolute path. `refreshLoaded()` re-lists every
 * cached directory (git:changed / manual refresh) so open folders track
 * branch flips, agent writes, etc., while never touching unexpanded ones.
 * `.git` is hidden at every level; dotfiles stay visible.
 */

import { create } from 'zustand';
import type { FsDirEntry } from '@shared/types';
import { errorText } from '../state/store';
import { canReadDir, readDir } from './fs-bridge';

/** Sort: directories first, then case-insensitive by name (dotfiles mixed in). */
export function sortEntries(entries: readonly FsDirEntry[]): FsDirEntry[] {
  return [...entries].sort((a, b) => {
    const aDir = a.kind === 'dir' ? 0 : 1;
    const bDir = b.kind === 'dir' ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function prepare(entries: readonly FsDirEntry[]): FsDirEntry[] {
  return sortEntries(entries.filter((e) => e.name !== '.git'));
}

interface FileTreeState {
  /** Active project root (absolute) — the tree's subject. */
  rootPath: string | null;
  /** Loaded directory (absolute path) → filtered, sorted entries. */
  entriesByDir: Record<string, FsDirEntry[]>;
  /** Root listing finished at least once for the current rootPath. */
  rootLoaded: boolean;
  /** Friendly one-liner when the ROOT listing failed (child errors toast). */
  rootError: string | null;
  /** True when the preload lacks fs.readDir (integration pending). */
  bridgeMissing: boolean;

  /** Point the tree at a project root (clears cache, lists the root). */
  setRoot(rootPath: string | null): Promise<void>;
  /** List one directory into the cache (expand / lazy load). */
  loadDir(dirPath: string): Promise<void>;
  /** Re-list the root and every cached directory (refresh). */
  refreshLoaded(): Promise<void>;
}

export const useFileTree = create<FileTreeState>((set, get) => {
  /** Guards against out-of-order async results after a root switch. */
  let rootSeq = 0;
  const inFlight = new Set<string>();

  const listInto = async (dirPath: string, seq: number): Promise<void> => {
    if (inFlight.has(dirPath)) return;
    inFlight.add(dirPath);
    try {
      const result = await readDir(dirPath);
      if (seq !== rootSeq) return; // root switched while listing
      set((s) => ({
        entriesByDir: { ...s.entriesByDir, [dirPath]: prepare(result.entries) }
      }));
    } catch (err) {
      if (seq !== rootSeq) return;
      if (dirPath === get().rootPath) {
        set({ rootError: errorText(err) });
      } else {
        // A child dir vanished (branch flip, rm -rf): drop it quietly.
        set((s) => {
          const next = { ...s.entriesByDir };
          delete next[dirPath];
          return { entriesByDir: next };
        });
      }
    } finally {
      inFlight.delete(dirPath);
    }
  };

  return {
    rootPath: null,
    entriesByDir: {},
    rootLoaded: false,
    rootError: null,
    bridgeMissing: !canReadDir(),

    async setRoot(rootPath) {
      if (get().rootPath === rootPath) return;
      const seq = ++rootSeq;
      inFlight.clear();
      const bridgeMissing = !canReadDir();
      set({
        rootPath,
        entriesByDir: {},
        rootLoaded: false,
        rootError: null,
        bridgeMissing
      });
      if (rootPath === null || bridgeMissing) return;
      await listInto(rootPath, seq);
      if (seq === rootSeq) set({ rootLoaded: true });
    },

    async loadDir(dirPath) {
      const { rootPath, bridgeMissing, entriesByDir } = get();
      if (rootPath === null || bridgeMissing) return;
      if (entriesByDir[dirPath] !== undefined) return; // already cached
      await listInto(dirPath, rootSeq);
    },

    async refreshLoaded() {
      const { rootPath, bridgeMissing } = get();
      if (rootPath === null) return;
      const bridgeNow = !canReadDir();
      if (bridgeNow !== bridgeMissing) set({ bridgeMissing: bridgeNow });
      if (bridgeNow) return;
      const seq = rootSeq;
      set({ rootError: null });
      const dirs = new Set(Object.keys(get().entriesByDir));
      dirs.add(rootPath);
      await Promise.all([...dirs].map((d) => listInto(d, seq)));
      if (seq === rootSeq && !get().rootLoaded && get().rootError === null) {
        set({ rootLoaded: true });
      }
    }
  };
});
