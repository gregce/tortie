/**
 * Runs store (Phase 46). The renderer's whole state for GitHub Actions.
 *
 * It sits beside useGitDepth for the same reason that store sits beside
 * useGit: one domain, one store, one place a bridge answer lands. Main owns
 * every fact in here. This store holds only what the section needs to draw,
 * which rows are expanded, and the jobs already read for them.
 *
 * WHAT IT NEVER DOES. It never polls. Reads happen on exactly three triggers,
 * being the user's refresh button, a debounced `git:changed` for a repository
 * the user has already expanded, and an `actions:changed` main pushed while a
 * watch of its own is running. A repository nobody has expanded is never
 * observed, and an unobserved repository spawns nothing anywhere.
 *
 * The bridge is feature-detected on every call (`hasActions()`), so a build
 * whose preload predates this phase renders no section instead of throwing.
 */

import { create } from 'zustand';
import type { ActionsJobsResult, ActionsRun, ActionsUpdate } from '@shared/actions';
import type { GmuxActionsExtras } from '@shared/ipc';
import { onRepoChanged } from '../state/repo-changed';

// ---------------------------------------------------------------------------
// Bridge access (feature-detected)
// ---------------------------------------------------------------------------

type ActionsBridge = NonNullable<GmuxActionsExtras['actions']>;

function actionsBridge(): ActionsBridge | null {
  const gmux = window.gmux as
    | (typeof window.gmux & GmuxActionsExtras)
    | undefined;
  const actions = gmux?.actions;
  return typeof actions?.runs === 'function' ? actions : null;
}

/** True when the preload carries the Phase-46 actions bridge. */
export function hasActions(): boolean {
  return actionsBridge() !== null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One run's jobs, as far as this renderer has got with reading them. */
export interface RunJobsRecord {
  loading: boolean;
  result: ActionsJobsResult | null;
  /**
   * The last read threw at the bridge. Nothing re-reads on its own after
   * this, so a broken channel cannot turn into a read every 5 seconds.
   * Collapsing and expanding the row again clears it and retries.
   */
  failed: boolean;
}

export interface RepoRunsRecord {
  /** `actions:observe` has been sent, so pushes to this repo are noticed. */
  observed: boolean;
  /** A runs read is in flight for this repository. */
  loading: boolean;
  /** The last answer main gave, whether asked for or pushed. */
  update: ActionsUpdate | null;
  /** Jobs by run id, for the rows the user has expanded. */
  jobs: Record<number, RunJobsRecord>;
  /** Expanded run ids, in the order the user opened them. */
  expanded: number[];
}

const emptyJobs: RunJobsRecord = { loading: false, result: null, failed: false };

export const emptyRunsRecord: RepoRunsRecord = {
  observed: false,
  loading: false,
  update: null,
  jobs: {},
  expanded: []
};

/** The record for a repo, or the empty one. Never undefined at a call site. */
/**
 * One repository's runs record, or the empty one.
 *
 * PHASE 105 REWROTE THIS PARAGRAPH. It used to say that the Runs section is not
 * rendered at all for a tab whose folder is on another machine. A Runs group is
 * drawn on such a tab now, and it is a different section reading a different
 * store, being ./RemoteRunsSection.tsx over ./remote-runs.ts. THIS store is
 * still never used there, and the reason is unchanged: it is keyed by a path on
 * THIS Mac, and a path from another computer would name a different repository
 * here or none at all. The null case below is the second answer to the same
 * question.
 */
export function runsRepoState(
  repos: Record<string, RepoRunsRecord>,
  repoPath: string | null | undefined
): RepoRunsRecord {
  if (repoPath === null || repoPath === undefined) return emptyRunsRecord;
  return repos[repoPath] ?? emptyRunsRecord;
}

export interface RunsState {
  repos: Record<string, RepoRunsRecord>;

  /**
   * Start noticing pushes for this repository and read its runs once.
   * Idempotent, and called on the FIRST expand of the section and never
   * before. Nothing spawns for a repository nobody has looked at.
   */
  observe(repoPath: string): void;
  /** Re-read the run list (the refresh button, and `git:changed`). */
  refresh(repoPath: string): Promise<void>;
  /** Open or close one run's jobs. Opening reads them. */
  toggleRun(repoPath: string, runId: number): void;
  /** Read one run's jobs. `force` retries a read that previously threw. */
  loadJobs(repoPath: string, runId: number, force?: boolean): Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let subscribed = false;

export const useRuns = create<RunsState>((set, get) => {
  const patchRepo = (repoPath: string, patch: Partial<RepoRunsRecord>): void => {
    set((s) => ({
      repos: {
        ...s.repos,
        [repoPath]: { ...(s.repos[repoPath] ?? emptyRunsRecord), ...patch }
      }
    }));
  };

  const patchJobs = (
    repoPath: string,
    runId: number,
    patch: Partial<RunJobsRecord>
  ): void => {
    set((s) => {
      const repo = s.repos[repoPath] ?? emptyRunsRecord;
      return {
        repos: {
          ...s.repos,
          [repoPath]: {
            ...repo,
            jobs: {
              ...repo.jobs,
              [runId]: { ...(repo.jobs[runId] ?? emptyJobs), ...patch }
            }
          }
        }
      };
    });
  };

  /**
   * Whether an expanded run's jobs should be re-read now.
   *
   * This is the whole cost rule for step progress. A run still going is
   * re-read on every update, which is one gh process every 5 seconds on
   * main's read lane while the row is open. A finished run is re-read exactly
   * once more, because the jobs on screen are still the mid-run ones, and
   * then never again.
   */
  const shouldReloadJobs = (
    run: ActionsRun | undefined,
    cached: RunJobsRecord | undefined
  ): boolean => {
    if (cached === undefined) return true;
    if (cached.loading || cached.failed) return false;
    if (cached.result === null) return false;
    if (run === undefined) return false;
    if (run.status !== 'completed') return true;
    return cached.result.jobs.some((j) => j.status !== 'completed');
  };

  const applyUpdate = (update: ActionsUpdate): void => {
    patchRepo(update.repoPath, { update });
    const repo = get().repos[update.repoPath];
    if (repo === undefined) return;
    for (const runId of repo.expanded) {
      const run = update.runs.find((r) => r.id === runId);
      if (shouldReloadJobs(run, repo.jobs[runId])) {
        void get().loadJobs(update.repoPath, runId);
      }
    }
  };

  /**
   * Attach the two event sources, once for the app's lifetime.
   *
   * `actions:changed` is main pushing a watch's progress. `git:changed` is the
   * shared debounced bus every SCM surface already listens to, and it covers
   * the ordinary case of the repository moving under the panel. Only observed
   * repositories answer either one.
   */
  const subscribeOnce = (): void => {
    if (subscribed) return;
    const bridge = actionsBridge();
    if (bridge === null) return;
    subscribed = true;
    bridge.onChanged((update) => {
      if (get().repos[update.repoPath] === undefined) return;
      applyUpdate(update);
    });
    onRepoChanged((repoPath) => {
      if (get().repos[repoPath]?.observed !== true) return;
      void get().refresh(repoPath);
    });
  };

  return {
    repos: {},

    observe(repoPath) {
      subscribeOnce();
      if (get().repos[repoPath]?.observed === true) return;
      patchRepo(repoPath, { observed: true });
      const bridge = actionsBridge();
      if (bridge === null) return;
      // Observing is free on its own: it only tells main to watch this
      // repository's pushes. The read on the next line is the first spawn.
      void bridge.observe(repoPath).catch(() => undefined);
      void get().refresh(repoPath);
    },

    async refresh(repoPath) {
      const bridge = actionsBridge();
      if (bridge === null) return;
      if ((get().repos[repoPath] ?? emptyRunsRecord).loading) return;
      patchRepo(repoPath, { loading: true });
      try {
        applyUpdate(await bridge.runs({ repoPath }));
      } catch {
        // Everything gh itself refused arrives as a health rung inside a
        // normal answer, so reaching here means the channel failed. The rows
        // on screen keep their age and the panel says nothing new.
      } finally {
        patchRepo(repoPath, { loading: false });
      }
    },

    toggleRun(repoPath, runId) {
      const repo = get().repos[repoPath] ?? emptyRunsRecord;
      const open = repo.expanded.includes(runId);
      patchRepo(repoPath, {
        expanded: open
          ? repo.expanded.filter((id) => id !== runId)
          : [...repo.expanded, runId]
      });
      if (!open) void get().loadJobs(repoPath, runId, true);
    },

    async loadJobs(repoPath, runId, force = false) {
      const bridge = actionsBridge();
      if (bridge === null) return;
      const cached = (get().repos[repoPath] ?? emptyRunsRecord).jobs[runId];
      if (cached?.loading === true) return;
      if (!force && cached?.failed === true) return;
      patchJobs(repoPath, runId, { loading: true, failed: false });
      try {
        const result = await bridge.jobs({ repoPath, runId });
        patchJobs(repoPath, runId, { loading: false, result, failed: false });
      } catch {
        patchJobs(repoPath, runId, { loading: false, failed: true });
      }
    }
  };
});
