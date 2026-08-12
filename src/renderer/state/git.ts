/**
 * gmux git store (zustand) — renderer source of truth for SCM state.
 * Owned by the SCM UI stream (src/renderer/scm/**).
 *
 * Data flow: window.gmux.git (frozen IPC bridge) → this store → SCM
 * components. `git:changed` events invalidate a repo; refreshes are
 * debounced and coalesced so watcher bursts cost one `git status`.
 */

import { create } from 'zustand';
import type { GitLogEntry, GitStatusResult } from '@shared/types';
import { groupFiles } from '../scm/groups';
import { errorPayload, errorText, useApp } from './store';
import { onRepoChanged } from './repo-changed';

// Re-export the pure grouping module so SCM components can keep importing
// everything git-shaped from this store module.
export { dirtyCount, groupFiles, isConflict } from '../scm/groups';
export type { ScmGroups } from '../scm/groups';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A pending single-file operation (drives per-row busy states). */
export type PendingOp = 'stage' | 'unstage' | 'discard';

export interface RepoGitState {
  /** Last successful git:status result (null before first load). */
  status: GitStatusResult | null;
  /** True only while loading with no data yet (skeleton state). */
  loading: boolean;
  /** True during background refreshes (data stays on screen). */
  refreshing: boolean;
  /** Friendly one-line error when git:status itself failed. */
  error: string | null;

  /** Recent commits (null = never loaded; loaded lazily on expand). */
  log: GitLogEntry[] | null;
  logLoading: boolean;
}

interface GitState {
  /** Per-repo state, keyed by absolute repo path. */
  repos: Record<string, RepoGitState>;
  /** Per-repo commit-in-flight flag. */
  committing: Record<string, boolean>;
  /** repo → repo-relative path → op in flight (row busy states). */
  pending: Record<string, Record<string, PendingOp>>;
  /**
   * Draft commit message per repo — lives here (not component state) so it
   * survives section collapse, project switches, and failed commits
   * (§6.11: the box keeps its text). Cleared only by a successful commit.
   */
  messages: Record<string, string>;
  setMessage(repoPath: string, message: string): void;

  /** Subscribe to git:changed once (idempotent). */
  init(): void;
  /** Fetch git:status only when this repo has none yet (mount effects). */
  ensureStatus(repoPath: string): void;
  /** Fetch git:status now (deduped; coalesces re-requests). */
  refreshStatus(repoPath: string): Promise<void>;
  /** Fetch recent commits (History section). */
  refreshLog(repoPath: string): Promise<void>;
  /** Both, for the branch-header refresh affordance. */
  refreshAll(repoPath: string): Promise<void>;

  stage(repoPath: string, paths: string[]): Promise<void>;
  unstage(repoPath: string, paths: string[]): Promise<void>;
  /** No confirm here — callers confirm first (discard is irreversible). */
  discard(repoPath: string, paths: string[]): Promise<void>;
  /**
   * Commit staged changes with the repo's draft message; `stageAllFirst`
   * implements "Stage all & commit". Resolves true on success (the draft
   * clears itself); on failure the draft is kept (§6.11).
   */
  commit(repoPath: string, stageAllFirst: boolean): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Pure helpers (render-safe)
// ---------------------------------------------------------------------------

const emptyRepo: RepoGitState = {
  status: null,
  loading: false,
  refreshing: false,
  error: null,
  log: null,
  logLoading: false
};

export function repoState(
  repos: Record<string, RepoGitState>,
  repoPath: string | null | undefined
): RepoGitState {
  if (repoPath === null || repoPath === undefined) return emptyRepo;
  return repos[repoPath] ?? emptyRepo;
}

/** First line of the most useful error text (toasts stay one line). */
export function gitErrorLine(err: unknown): string {
  const payload = errorPayload(err);
  const raw =
    payload?.detail !== undefined && payload.detail.trim().length > 0
      ? payload.detail
      : errorText(err);
  const first = raw.split('\n').find((l) => l.trim().length > 0);
  return (first ?? 'git failed').trim();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let initialized = false;

export const useGit = create<GitState>((set, get) => {
  const gmux = window.gmux as typeof window.gmux | undefined;

  // Non-reactive bookkeeping (not in state: no renders on timer churn).
  const inflightStatus = new Map<string, Promise<void>>();
  const rerunAfter = new Set<string>();

  const patchRepo = (repoPath: string, patch: Partial<RepoGitState>): void => {
    set((s) => ({
      repos: {
        ...s.repos,
        [repoPath]: { ...(s.repos[repoPath] ?? emptyRepo), ...patch }
      }
    }));
  };

  const setPending = (
    repoPath: string,
    paths: string[],
    op: PendingOp | null
  ): void => {
    set((s) => {
      const forRepo = { ...(s.pending[repoPath] ?? {}) };
      for (const p of paths) {
        if (op === null) delete forRepo[p];
        else forRepo[p] = op;
      }
      return { pending: { ...s.pending, [repoPath]: forRepo } };
    });
  };

  const toastError = (text: string): void => {
    useApp.getState().toast('error', text, { sticky: true });
  };

  const doRefreshStatus = async (repoPath: string): Promise<void> => {
    if (!gmux) return;
    const prev = get().repos[repoPath];
    patchRepo(repoPath, {
      loading: prev?.status == null,
      refreshing: prev?.status != null
    });
    try {
      const status = await gmux.git.status(repoPath);
      patchRepo(repoPath, {
        status,
        loading: false,
        refreshing: false,
        error: null
      });
    } catch (err) {
      // Keep stale data (better than flashing empty); surface the failure.
      patchRepo(repoPath, {
        loading: false,
        refreshing: false,
        error: gitErrorLine(err)
      });
    }
  };

  return {
    repos: {},
    committing: {},
    pending: {},
    messages: {},

    setMessage(repoPath, message) {
      set((s) => ({ messages: { ...s.messages, [repoPath]: message } }));
    },

    init() {
      if (initialized || !gmux) return;
      initialized = true;
      // Debounced once for the whole renderer (state/repo-changed.ts): this
      // store used to keep its own 200 ms timer map, one of four windows that
      // made the sidebar contradict itself for 150 ms after every commit.
      onRepoChanged((repoPath) => {
        // Only repos something has looked at — ignore unknown paths.
        if (get().repos[repoPath] === undefined) return;
        void get().refreshStatus(repoPath);
        // HEAD may have moved (commit from a session terminal) — keep
        // History honest when it has been loaded.
        if (get().repos[repoPath]?.log !== null) {
          void get().refreshLog(repoPath);
        }
      });
    },

    ensureStatus(repoPath) {
      const repo = get().repos[repoPath];
      if (repo?.status != null || repo?.loading === true) return;
      if (inflightStatus.has(repoPath)) return;
      void get().refreshStatus(repoPath);
    },

    async refreshStatus(repoPath) {
      // Coalesce: one in flight; a request during flight queues exactly one
      // rerun (the working tree may have changed under the running status).
      const inflight = inflightStatus.get(repoPath);
      if (inflight !== undefined) {
        rerunAfter.add(repoPath);
        return inflight;
      }
      const run = (async () => {
        await doRefreshStatus(repoPath);
        while (rerunAfter.delete(repoPath)) {
          await doRefreshStatus(repoPath);
        }
      })().finally(() => inflightStatus.delete(repoPath));
      inflightStatus.set(repoPath, run);
      return run;
    },

    async refreshLog(repoPath) {
      if (!gmux) return;
      const repo = get().repos[repoPath];
      if (repo?.logLoading === true) return;
      patchRepo(repoPath, { logLoading: true });
      try {
        const log = await gmux.git.log({ repoPath, maxCount: 50 });
        patchRepo(repoPath, { log, logLoading: false });
      } catch (err) {
        // Non-git / empty repo: an empty history is a state, not an error.
        const code = errorPayload(err)?.code;
        patchRepo(repoPath, { log: [], logLoading: false });
        if (code !== 'NOT_A_GIT_REPO' && code !== 'GIT_FAILED') {
          toastError(`Could not load history — ${gitErrorLine(err)}`);
        }
      }
    },

    async refreshAll(repoPath) {
      const jobs = [get().refreshStatus(repoPath)];
      if (get().repos[repoPath]?.log !== null) {
        jobs.push(get().refreshLog(repoPath));
      }
      await Promise.all(jobs);
    },

    async stage(repoPath, paths) {
      if (!gmux || paths.length === 0) return;
      setPending(repoPath, paths, 'stage');
      try {
        await gmux.git.stage({ repoPath, paths });
        await get().refreshStatus(repoPath);
      } catch (err) {
        toastError(`Stage failed — ${gitErrorLine(err)}`);
      } finally {
        setPending(repoPath, paths, null);
      }
    },

    async unstage(repoPath, paths) {
      if (!gmux || paths.length === 0) return;
      setPending(repoPath, paths, 'unstage');
      try {
        await gmux.git.unstage({ repoPath, paths });
        await get().refreshStatus(repoPath);
      } catch (err) {
        toastError(`Unstage failed — ${gitErrorLine(err)}`);
      } finally {
        setPending(repoPath, paths, null);
      }
    },

    async discard(repoPath, paths) {
      if (!gmux || paths.length === 0) return;
      setPending(repoPath, paths, 'discard');
      try {
        await gmux.git.discard({ repoPath, paths });
        await get().refreshStatus(repoPath);
      } catch (err) {
        toastError(`Discard failed — ${gitErrorLine(err)}`);
      } finally {
        setPending(repoPath, paths, null);
      }
    },

    async commit(repoPath, stageAllFirst) {
      if (!gmux) return false;
      const trimmed = (get().messages[repoPath] ?? '').trim();
      if (trimmed.length === 0) return false;
      set((s) => ({ committing: { ...s.committing, [repoPath]: true } }));
      try {
        if (stageAllFirst) {
          const status = get().repos[repoPath]?.status;
          const groups = groupFiles(status?.files ?? []);
          const all = [...groups.changes, ...groups.untracked].map(
            (f) => f.path
          );
          if (all.length > 0) await gmux.git.stage({ repoPath, paths: all });
        }
        await gmux.git.commit({ repoPath, message: trimmed });
        set((s) => ({ messages: { ...s.messages, [repoPath]: '' } }));
        await get().refreshStatus(repoPath);
        if (get().repos[repoPath]?.log !== null) {
          void get().refreshLog(repoPath);
        }
        return true;
      } catch (err) {
        // §6.11 — sticky toast with git's first stderr line; the commit box
        // keeps its message (callers only clear on true).
        toastError(`Commit failed — ${gitErrorLine(err)}`);
        void get().refreshStatus(repoPath);
        return false;
      } finally {
        set((s) => ({ committing: { ...s.committing, [repoPath]: false } }));
      }
    }
  };
});
