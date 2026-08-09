/**
 * Git status source for tree decorations.
 *
 * INTEGRATOR NOTE — this is deliberately a thin, replaceable fetcher. The
 * DESIGN intent is that decorations come from THE SCM STORE's status map so
 * tree and Changes section never disagree. When the SCM stream's store
 * lands, either:
 *   (a) pass its `GitFileStatus[]` through `<FilesSection statusFiles={…}>`
 *       (preferred — this store then never fetches), or
 *   (b) replace the fetch below with a subscription to that store.
 * Until then this store pulls git:status itself and FilesSection refreshes
 * it on git:changed, so the tree is fully functional standalone.
 */

import { create } from 'zustand';
import type { GitFileStatus } from '@shared/types';
import { buildStatusIndex, EMPTY_STATUS_INDEX } from './decorations';
import type { StatusIndex } from './decorations';

interface TreeGitStatusState {
  /** Repo the current index belongs to (active project path). */
  repoPath: string | null;
  /** False when the folder is not a git repository (tree renders plain). */
  isRepo: boolean;
  index: StatusIndex;

  /** Point at a new repo (clears immediately, then fetches). */
  setRepo(repoPath: string | null): Promise<void>;
  /** Re-pull git:status for the current repo (git:changed / manual refresh). */
  refresh(): Promise<void>;
  /** Feed statuses from an external source (the SCM store), no fetch. */
  applyExternal(repoPath: string, files: readonly GitFileStatus[]): void;
}

export const useTreeGitStatus = create<TreeGitStatusState>((set, get) => {
  let fetchSeq = 0;

  const fetchFor = async (repoPath: string): Promise<void> => {
    const gmux = window.gmux as typeof window.gmux | undefined;
    if (!gmux) return;
    const seq = ++fetchSeq;
    try {
      const result = await gmux.git.status(repoPath);
      if (seq !== fetchSeq || get().repoPath !== repoPath) return; // stale
      set({
        isRepo: result.isRepo,
        index: result.isRepo
          ? buildStatusIndex(result.files)
          : EMPTY_STATUS_INDEX
      });
    } catch {
      // Decorations are an enhancement — a failed status read must never
      // break file browsing. Render undecorated instead.
      if (seq !== fetchSeq || get().repoPath !== repoPath) return;
      set({ isRepo: false, index: EMPTY_STATUS_INDEX });
    }
  };

  return {
    repoPath: null,
    isRepo: false,
    index: EMPTY_STATUS_INDEX,

    async setRepo(repoPath) {
      if (get().repoPath === repoPath) return;
      set({ repoPath, isRepo: false, index: EMPTY_STATUS_INDEX });
      if (repoPath !== null) await fetchFor(repoPath);
    },

    async refresh() {
      const { repoPath } = get();
      if (repoPath !== null) await fetchFor(repoPath);
    },

    applyExternal(repoPath, files) {
      fetchSeq++; // invalidate any in-flight fetch
      set({ repoPath, isRepo: true, index: buildStatusIndex(files) });
    }
  };
});
