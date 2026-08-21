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
 *
 * Phase 11: state is the raw porcelain list — PierreFileTree maps it onto
 * @pierre/trees GitStatusEntry[] itself (folder aggregation is built in).
 *
 * PHASE 90.1: the subject is a `WorkspaceTarget` rather than a path. Two
 * machines can hold the same path, so a path alone could not tell one project
 * tab from another, and switching between two such tabs left this Mac's
 * decorations on screen under the other machine's badge.
 */

import { create } from 'zustand';
import type { GitFileStatus } from '@shared/types';
import {
  localPathOf,
  sameTarget,
  type WorkspaceTarget
} from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';

const NO_FILES: readonly GitFileStatus[] = [];

interface TreeGitStatusState {
  /** The folder the current list belongs to, being one path on one computer. */
  repo: WorkspaceTarget | null;
  /** False when the folder is not a git repository (tree renders plain). */
  isRepo: boolean;
  /** Porcelain-v2 status list (empty when not a repo / fetch failed). */
  files: readonly GitFileStatus[];

  /**
   * Point at a new repo (clears immediately, then fetches).
   *
   * A target on another machine clears and fetches nothing. There is no git
   * call in this product that can reach another machine's worktree.
   */
  setRepo(target: WorkspaceTarget | null): Promise<void>;
  /** Re-pull git:status for the current repo (git:changed / manual refresh). */
  refresh(): Promise<void>;
  /**
   * Feed statuses from an external source (the SCM store), no fetch.
   *
   * A target that is not local is IGNORED and performs no `set`. The SCM store
   * that feeds this reads this Mac and nothing else, so a list it produced can
   * only ever describe a local folder.
   */
  applyExternal(target: WorkspaceTarget, files: readonly GitFileStatus[]): void;
}

export const useTreeGitStatus = create<TreeGitStatusState>((set, get) => {
  let fetchSeq = 0;

  /**
   * `target` is what the staleness guards compare, and `repoPath` is the path
   * on this Mac that the bridge is actually given. They are two arguments so
   * that no caller can build the second one from the first by hand.
   */
  const fetchFor = async (
    target: WorkspaceTarget,
    repoPath: string
  ): Promise<void> => {
    const gmux = gmuxBridge();
    if (!gmux) return;
    const seq = ++fetchSeq;
    try {
      const result = await gmux.git.status(repoPath);
      if (seq !== fetchSeq || !sameTarget(get().repo, target)) return; // stale
      set({
        isRepo: result.isRepo,
        files: result.isRepo ? result.files : NO_FILES
      });
    } catch {
      // Decorations are an enhancement — a failed status read must never
      // break file browsing. Render undecorated instead.
      if (seq !== fetchSeq || !sameTarget(get().repo, target)) return;
      set({ isRepo: false, files: NO_FILES });
    }
  };

  return {
    repo: null,
    isRepo: false,
    files: NO_FILES,

    async setRepo(target) {
      // BY VALUE. FilesSection composes a fresh target on every render, so a
      // comparison by reference would refetch the status on every frame.
      if (sameTarget(get().repo, target)) return;
      set({ repo: target, isRepo: false, files: NO_FILES });
      const repoPath = localPathOf(target);
      if (target === null || repoPath === null) return;
      await fetchFor(target, repoPath);
    },

    async refresh() {
      const { repo } = get();
      const repoPath = localPathOf(repo);
      if (repo === null || repoPath === null) return;
      await fetchFor(repo, repoPath);
    },

    applyExternal(target, files) {
      if (localPathOf(target) === null) return;
      fetchSeq++; // invalidate any in-flight fetch
      set({ repo: target, isRepo: true, files });
    }
  };
});
