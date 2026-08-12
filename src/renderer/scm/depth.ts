/**
 * gmux git-depth store (zustand) — renderer state for the VS Code-bar git
 * history (dogfood round 1): branch list + switching, paged commit log,
 * per-commit detail cache (rich hover card), and the mutation verbs behind
 * the commit context menu (checkout detached / create branch / create tag /
 * cherry-pick).
 *
 * Owned by the SCM UI stream (src/renderer/scm/**). Sits BESIDE the frozen
 * useGit store: status/stage/commit stay there; everything the git-depth IPC
 * channels power lives here. Every bridge method is feature-detected
 * (`typeof git.branches === 'function'`) so the SCM view degrades to the
 * round-0 surface against an older preload.
 */

import { create } from 'zustand';
import type {
  GitBranchInfo,
  GitCherryPickResult,
  GitCommitDetail,
  GitDeleteBranchResult,
  GitDivergenceInfo,
  GitGraphLogEntry,
  GitLogEntry,
  GitLogScope,
  GitPushResult,
  GitRemoteBranchInfo,
  GitRemoteInfo
} from '@shared/types';
import type {
  GmuxGitBranchExtras,
  GmuxGitDepthExtras,
  GmuxGitGraphExtras,
  GmuxGitSyncExtras
} from '@shared/ipc';
import { gitErrorLine, useGit } from '../state/git';
import { useApp } from '../state/store';
import { onRepoChanged } from '../state/repo-changed';
import { shortSha } from './format';

// ---------------------------------------------------------------------------
// Bridge access (feature-detected)
// ---------------------------------------------------------------------------

type DepthBridge = GmuxGitDepthExtras &
  GmuxGitBranchExtras &
  GmuxGitSyncExtras &
  GmuxGitGraphExtras;

function depthBridge(): DepthBridge | null {
  const git = (window.gmux as typeof window.gmux | undefined)?.git;
  if (!git) return null;
  return git as typeof git & DepthBridge;
}

/** True when the git-depth bridge methods exist (branch menu, history bar). */
export function hasGitDepth(): boolean {
  return typeof depthBridge()?.branches === 'function';
}

/** True when the Phase-10 branch-management bridge methods exist (fetch,
 *  remote refs, tracking checkout, delete) — older preloads degrade to the
 *  local-only BRANCHES list. */
export function hasBranchManagement(): boolean {
  return typeof depthBridge()?.remoteBranches === 'function';
}

/** True when the Phase-12 sync bridge exists (push / pull / sync / remotes)
 *  — older preloads keep fetch-only, and the header hides what it can't do. */
export function hasGitSync(): boolean {
  return typeof depthBridge()?.sync === 'function';
}

/**
 * True when the Phase-14.5 graph read exists (`git:graphLog`).
 *
 * Without it the history pane keeps the flat `git:log` walk: HEAD-only, so no
 * commit you are behind by is in the payload, no typed decorations, and no
 * divergence block. The UI degrades to branch-tip badges rather than
 * pretending — see `badgesFromTips` in ref-badges.tsx.
 */
export function hasGitGraph(): boolean {
  return typeof depthBridge()?.graphLog === 'function';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** History page size (DESIGN-SPEC S3A: -n 50 + "Load 50 more"). */
export const HISTORY_PAGE = 50;

export interface RepoDepthState {
  /** Local branches (null = never loaded). */
  branches: GitBranchInfo[] | null;
  /**
   * Topo-ordered commits, newest first (null = never loaded).
   *
   * Phase 14.5: this is the REF-SCOPED walk, so it is no longer "ancestors of
   * HEAD". With the default scope it also contains the upstream's commits —
   * which is the whole point, and the reason `divergence.headSha` rather than
   * `log[0]` identifies the HEAD row.
   */
  log: GitGraphLogEntry[] | null;
  logLoading: boolean;
  /** Current page window (grows by HISTORY_PAGE via loadMore). */
  limit: number;
  /** True when at least one more commit exists past `limit`. */
  hasMore: boolean;
  /** Which refs the walk covers; chosen on the History header, per repo. */
  scope: GitLogScope;
  /**
   * The exact refnames the CURRENT page was walked with, echoed straight back
   * when paging deeper.
   *
   * This is the lane-stability contract (research 24 §4.5): a row's lanes are
   * a pure function of the commits above it, so "Load 50 more" reshuffles
   * nothing — provided the ref set is identical between pages. Re-resolving
   * the scope per page would break that silently the moment an agent creates
   * a branch or a background fetch lands mid-scroll. Null until the first
   * page; cleared whenever the scope changes, which IS a relayout.
   */
  logRefs: string[] | null;
  /**
   * Where the current branch stands against its upstream, measured in the
   * same round trip as the commits (so a row's shading and the header's count
   * can never describe two different instants), with the age of the remote
   * snapshot attached. Null until the first graph page, or on an older
   * preload with no `git:graphLog`.
   */
  divergence: GitDivergenceInfo | null;
  /** https://github.com/owner/repo for a GitHub origin; null otherwise. */
  remoteUrl: string | null;
  remoteChecked: boolean;
  /** Remote-tracking branches (null = never loaded / bridge missing). */
  remoteBranches: GitRemoteBranchInfo[] | null;
  /** .git/FETCH_HEAD mtime (epoch ms); null before any fetch. */
  lastFetchedAt: number | null;
  /** True while `git fetch --all --prune` runs (header spinner). */
  fetching: boolean;
  /** Branch name a checkout is in flight for (per-row spinner). */
  busyRef: string | null;
  /** Configured remotes with URLs (null = never loaded / bridge missing). */
  remotes: GitRemoteInfo[] | null;
  /** Upstream of the current branch ("origin/main"); null when it has none. */
  upstream: string | null;
  /**
   * The network operation in flight, if any — one at a time per repo, so the
   * header can show which one is running and disable the rest.
   */
  syncOp: 'push' | 'pull' | 'sync' | 'publish' | null;
}

interface DepthState {
  repos: Record<string, RepoDepthState>;
  /** Commit details keyed `${repoPath}\0${sha}` (hover card cache). */
  details: Record<string, GitCommitDetail>;

  /**
   * First load for a repo (log + branches + remote) — idempotent.
   *
   * `scope` seeds the history walk on FIRST registration, so the persisted
   * choice is applied by the opening read instead of costing a second one.
   * Omitted (BRANCHES, which does not own the choice) leaves the default.
   */
  ensure(repoPath: string, scope?: GitLogScope): void;
  /** Re-pull log + branches at the current limit (git:changed, refresh ↻). */
  refresh(repoPath: string): Promise<void>;
  /** Grow the history window by HISTORY_PAGE and refetch. */
  loadMore(repoPath: string): Promise<void>;
  /**
   * Change which refs the history walk covers.
   *
   * A full relayout, not an append: the window resets to one page and the
   * pinned ref set is dropped, because lanes are only stable while the ref
   * set is (research 24 §4.5). No-ops when the scope is already current.
   */
  setLogScope(repoPath: string, scope: GitLogScope): Promise<void>;
  /** Cached commit detail; resolves null on failure (toast already shown). */
  detail(repoPath: string, sha: string): Promise<GitCommitDetail | null>;

  /** `git checkout <branch>` with toast feedback + status refresh. */
  checkoutBranch(repoPath: string, branch: string): Promise<void>;
  /**
   * Remote-row checkout: existing local with the same short name → plain
   * checkout; otherwise create a tracking local and switch (git service
   * decides — single source of truth).
   */
  checkoutTracking(repoPath: string, remoteBranch: string): Promise<void>;
  /** `git fetch --all --prune` with the header spinner + full refresh. */
  fetchAll(repoPath: string): Promise<void>;
  /**
   * Delete a local branch. Resolves the typed result so the UI can chain
   * the force-confirm on 'unmerged'; null when the call failed (toasted).
   */
  deleteBranch(
    repoPath: string,
    name: string,
    force: boolean
  ): Promise<GitDeleteBranchResult | null>;
  /**
   * Create a branch (and switch to it), optionally from a commit.
   * Resolves an inline-error line for the mini-modal, or null on success.
   */
  createBranch(
    repoPath: string,
    name: string,
    fromRef?: string
  ): Promise<string | null>;
  /** Create a lightweight tag; same inline-error contract as createBranch. */
  createTag(repoPath: string, name: string, ref: string): Promise<string | null>;
  /** Cherry-pick with the typed conflict result → explanatory toast. */
  cherryPick(repoPath: string, sha: string): Promise<void>;
  /** `git checkout --detach <sha>` (callers confirm first). */
  checkoutDetached(repoPath: string, sha: string): Promise<void>;

  // -- Phase 12 item 3: push / pull / sync + remotes -------------------------

  /** Re-read `git remote -v` + the tracking context (cheap, no network). */
  loadRemotes(repoPath: string): Promise<void>;
  /**
   * Read when this clone last heard from a remote (.git/FETCH_HEAD mtime).
   *
   * The view header qualifies every ahead/behind claim with this age, and it
   * makes that claim whether or not any section is expanded — so it cannot
   * wait for HISTORY or BRANCHES to load it. No network, no history walk.
   */
  loadFetchAge(repoPath: string): Promise<void>;
  /**
   * `git push`. Resolves the typed result so a caller can react to
   * 'no-upstream' by offering Publish; null when the call failed (toasted).
   */
  push(repoPath: string): Promise<GitPushResult | null>;
  /** `git push -u <remote> <branch>` — publish a branch that has no upstream. */
  publish(repoPath: string, remote?: string): Promise<void>;
  /** `git pull` (honours the user's pull.rebase); conflicts get their own toast. */
  pull(repoPath: string): Promise<void>;
  /** Sync = pull, then push (VS Code's Sync Changes). */
  sync(repoPath: string): Promise<void>;
}

const emptyRepo: RepoDepthState = {
  branches: null,
  log: null,
  logLoading: false,
  limit: HISTORY_PAGE,
  hasMore: false,
  scope: 'branch',
  logRefs: null,
  divergence: null,
  remoteUrl: null,
  remoteChecked: false,
  remoteBranches: null,
  lastFetchedAt: null,
  fetching: false,
  busyRef: null,
  remotes: null,
  upstream: null,
  syncOp: null
};

export function depthRepoState(
  repos: Record<string, RepoDepthState>,
  repoPath: string | null | undefined
): RepoDepthState {
  if (repoPath === null || repoPath === undefined) return emptyRepo;
  return repos[repoPath] ?? emptyRepo;
}

/**
 * Widen a frozen `git:log` row into the graph shape (older-preload path).
 * Fields the flat walk never returned are derived from the ones it did;
 * `refs` is empty because that walk carries no decorations at all, which
 * lets every consumer read `entry.refs` unconditionally.
 */
function toGraphEntry(row: GitLogEntry): GitGraphLogEntry {
  const detailed = row as Partial<GitGraphLogEntry> & GitLogEntry;
  return {
    ...detailed,
    sha: detailed.sha ?? row.hash,
    shortSha: detailed.shortSha ?? row.hash.slice(0, 7),
    author: detailed.author ?? row.authorName,
    dateISO: detailed.dateISO ?? new Date(row.authorDate).toISOString(),
    refs: detailed.refs ?? []
  };
}

/**
 * Cache key for one commit's detail. NUL separates, because it is the one
 * byte a path cannot contain.
 *
 * Written as the ESCAPE `\0`, not as a literal control byte: the literal made
 * git classify this whole module as binary, so every diff of it read
 * `Bin 23594 -> 29814 bytes` and could not be reviewed. Same string, readable
 * history — do not paste the raw byte back.
 */
export const detailKey = (repoPath: string, sha: string): string =>
  `${repoPath}\0${sha}`;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let subscribed = false;

export const useGitDepth = create<DepthState>((set, get) => {
  const inflightDetails = new Map<string, Promise<GitCommitDetail | null>>();

  const patchRepo = (
    repoPath: string,
    patch: Partial<RepoDepthState>
  ): void => {
    set((s) => ({
      repos: {
        ...s.repos,
        [repoPath]: { ...(s.repos[repoPath] ?? emptyRepo), ...patch }
      }
    }));
  };

  const toast = (
    kind: 'info' | 'success' | 'error',
    text: string,
    sticky = false
  ): void => {
    useApp.getState().toast(kind, text, sticky ? { sticky: true } : undefined);
  };

  const subscribeOnce = (): void => {
    if (subscribed) return;
    const gmux = window.gmux as typeof window.gmux | undefined;
    if (!gmux) return;
    subscribed = true;
    // One debounce for every surface (state/repo-changed.ts) — this store's
    // own 250 ms window was why History reloaded 50 ms after Changes cleared.
    onRepoChanged((repoPath) => {
      // Only repos the history UI has ensured — unknown paths are free.
      if (get().repos[repoPath] === undefined) return;
      void get().refresh(repoPath);
    });
  };

  /**
   * One history page.
   *
   * `pinRefs` is the lane-stability lever, and only "Load 50 more" pulls it.
   * Paging deeper MUST reuse the exact ref set the shallower page was walked
   * with, or a branch an agent created mid-scroll would re-lane every row
   * above the fold (research 24 §4.5). A `git:changed` refresh is the
   * opposite case: the repository itself moved, so the ref set is re-resolved
   * and the graph is allowed to redraw — that is the new branch appearing,
   * not a reshuffle.
   */
  const fetchLog = async (repoPath: string, pinRefs = false): Promise<void> => {
    const gmux = window.gmux as typeof window.gmux | undefined;
    if (!gmux) return;
    const repo = get().repos[repoPath] ?? emptyRepo;
    const limit = repo.limit;
    const bridge = depthBridge();
    patchRepo(repoPath, { logLoading: true });

    // Phase 14.5 — one ref-scoped read carries the commits, the ref set that
    // produced them, the divergence and its freshness. `hasMore` comes from
    // the service's own limit+1 probe, so no slicing here.
    if (typeof bridge?.graphLog === 'function') {
      try {
        const result = await bridge.graphLog({
          repoPath,
          maxCount: limit,
          scope: repo.scope,
          ...(pinRefs && repo.logRefs !== null ? { refs: repo.logRefs } : {})
        });
        patchRepo(repoPath, {
          log: result.entries,
          hasMore: result.hasMore,
          logRefs: result.refs,
          divergence: result.divergence,
          lastFetchedAt: result.divergence.lastFetchedAt,
          logLoading: false
        });
        return;
      } catch {
        // Fall through to the flat walk rather than blanking the pane: a
        // history without lanes still beats no history.
      }
    }

    try {
      // One row past the window answers "is there more?" without a count.
      const rows = await gmux.git.log({ repoPath, maxCount: limit + 1 });
      patchRepo(repoPath, {
        // `git:log`'s frozen row type has no `refs`. Normalise rather than
        // cast: every consumer may then read `entry.refs` unconditionally,
        // and an empty array is the truth — this walk carries no decorations.
        log: rows.slice(0, limit).map(toGraphEntry),
        hasMore: rows.length > limit,
        logLoading: false
      });
    } catch {
      // Empty/non-git repos: an empty history is a state, not an error.
      patchRepo(repoPath, { log: [], hasMore: false, logLoading: false });
    }
  };

  const fetchBranches = async (repoPath: string): Promise<void> => {
    const bridge = depthBridge();
    if (typeof bridge?.branches !== 'function') return;
    try {
      const branches = await bridge.branches(repoPath);
      patchRepo(repoPath, { branches });
    } catch {
      /* keep the previous list — refs badges are decoration, not truth */
    }
  };

  const fetchRemoteBranches = async (repoPath: string): Promise<void> => {
    const bridge = depthBridge();
    if (typeof bridge?.remoteBranches !== 'function') return;
    try {
      const result = await bridge.remoteBranches(repoPath);
      patchRepo(repoPath, {
        remoteBranches: result.branches,
        lastFetchedAt: result.lastFetchedAt
      });
    } catch {
      /* keep the previous list — same decoration discipline as branches */
    }
  };

  const fetchRemotes = async (repoPath: string): Promise<void> => {
    const bridge = depthBridge();
    if (typeof bridge?.remotes !== 'function') return;
    try {
      const result = await bridge.remotes(repoPath);
      patchRepo(repoPath, {
        remotes: result.remotes,
        upstream: result.upstream
      });
    } catch {
      /* keep the previous list — the remotes panel is not load-bearing */
    }
  };

  /**
   * Run one network verb for a repo: single-flight per repo, always followed
   * by a status + refs refresh (success OR failure — a partial push may still
   * have moved a ref). Returns null when the bridge is missing or another
   * operation is already running, so callers can stay quiet.
   */
  const runSync = async <T>(
    repoPath: string,
    op: NonNullable<RepoDepthState['syncOp']>,
    call: () => Promise<T>,
    failure: string
  ): Promise<T | null> => {
    if ((get().repos[repoPath] ?? emptyRepo).syncOp !== null) return null;
    patchRepo(repoPath, { syncOp: op });
    let result: T | null = null;
    try {
      result = await call();
    } catch (err) {
      // §6.11 — sticky, and it carries git's own words (auth, network, …).
      toast('error', `${failure} — ${gitErrorLine(err)}`, true);
    } finally {
      patchRepo(repoPath, { syncOp: null });
    }
    void useGit.getState().refreshStatus(repoPath);
    void get().refresh(repoPath);
    void fetchRemotes(repoPath);
    return result;
  };

  const fetchRemote = async (repoPath: string): Promise<void> => {
    if (get().repos[repoPath]?.remoteChecked === true) return;
    const bridge = depthBridge();
    if (typeof bridge?.remoteUrl !== 'function') {
      patchRepo(repoPath, { remoteUrl: null, remoteChecked: true });
      return;
    }
    try {
      const url = await bridge.remoteUrl(repoPath);
      patchRepo(repoPath, { remoteUrl: url, remoteChecked: true });
    } catch {
      patchRepo(repoPath, { remoteUrl: null, remoteChecked: true });
    }
  };

  return {
    repos: {},
    details: {},

    ensure(repoPath, scope) {
      subscribeOnce();
      const repo = get().repos[repoPath];
      if (repo !== undefined && (repo.log !== null || repo.logLoading)) return;
      // Register the repo for git:changed, seeding the walk's scope so the
      // first read is already the one the header promises.
      patchRepo(repoPath, scope !== undefined ? { scope } : {});
      void fetchLog(repoPath);
      void fetchBranches(repoPath);
      void fetchRemote(repoPath);
      void fetchRemoteBranches(repoPath);
      void fetchRemotes(repoPath);
    },

    async refresh(repoPath) {
      if (get().repos[repoPath] === undefined) return;
      await Promise.all([
        fetchLog(repoPath),
        fetchBranches(repoPath),
        fetchRemoteBranches(repoPath),
        fetchRemotes(repoPath)
      ]);
    },

    async loadMore(repoPath) {
      const repo = get().repos[repoPath];
      if (repo === undefined || repo.logLoading) return;
      patchRepo(repoPath, { limit: repo.limit + HISTORY_PAGE });
      await fetchLog(repoPath, true);
    },

    async setLogScope(repoPath, scope) {
      const repo = get().repos[repoPath] ?? emptyRepo;
      if (repo.scope === scope) return;
      // Reset the window and DROP the pinned ref set: a different ref set is
      // a different graph, so this is a relayout rather than an append, and
      // pretending otherwise would reshuffle lanes under the user's eyes.
      patchRepo(repoPath, {
        scope,
        limit: HISTORY_PAGE,
        logRefs: null
      });
      await fetchLog(repoPath);
    },

    async detail(repoPath, sha) {
      const key = detailKey(repoPath, sha);
      const cached = get().details[key];
      if (cached !== undefined) return cached;
      const inflight = inflightDetails.get(key);
      if (inflight !== undefined) return inflight;
      const bridge = depthBridge();
      if (typeof bridge?.commitDetail !== 'function') return null;
      const run = bridge
        .commitDetail({ repoPath, sha })
        .then((detail) => {
          set((s) => ({ details: { ...s.details, [key]: detail } }));
          return detail;
        })
        .catch((err: unknown) => {
          toast('error', `Could not load the commit — ${gitErrorLine(err)}`);
          return null;
        })
        .finally(() => inflightDetails.delete(key));
      inflightDetails.set(key, run);
      return run;
    },

    async checkoutBranch(repoPath, branch) {
      const bridge = depthBridge();
      if (typeof bridge?.checkout !== 'function') return;
      patchRepo(repoPath, { busyRef: branch });
      try {
        await bridge.checkout({ repoPath, branch });
        toast('success', `Switched to '${branch}'`);
      } catch (err) {
        // §6.11 — sticky toast; the branch is unchanged.
        toast('error', `Checkout failed — ${gitErrorLine(err)}`, true);
      } finally {
        patchRepo(repoPath, { busyRef: null });
      }
      void useGit.getState().refreshStatus(repoPath);
      void get().refresh(repoPath);
    },

    async checkoutTracking(repoPath, remoteBranch) {
      const bridge = depthBridge();
      if (typeof bridge?.checkoutTracking !== 'function') return;
      const short = remoteBranch.slice(remoteBranch.indexOf('/') + 1);
      patchRepo(repoPath, { busyRef: remoteBranch });
      try {
        await bridge.checkoutTracking({ repoPath, remoteBranch });
        toast('success', `Switched to '${short}'`);
      } catch (err) {
        // §6.11 — sticky toast; nothing changed.
        toast('error', `Checkout failed — ${gitErrorLine(err)}`, true);
      } finally {
        patchRepo(repoPath, { busyRef: null });
      }
      void useGit.getState().refreshStatus(repoPath);
      void get().refresh(repoPath);
    },

    async fetchAll(repoPath) {
      const bridge = depthBridge();
      if (typeof bridge?.fetch !== 'function') return;
      if ((get().repos[repoPath] ?? emptyRepo).fetching) return;
      patchRepo(repoPath, { fetching: true });
      try {
        await bridge.fetch(repoPath);
      } catch (err) {
        toast('error', `Fetch failed — ${gitErrorLine(err)}`, true);
      } finally {
        patchRepo(repoPath, { fetching: false });
      }
      // Success or failure, re-read what we have (a partial --all fetch may
      // have updated some remotes before one failed).
      void useGit.getState().refreshStatus(repoPath);
      void get().refresh(repoPath);
    },

    async deleteBranch(repoPath, name, force) {
      const bridge = depthBridge();
      if (typeof bridge?.deleteBranch !== 'function') return null;
      let result: GitDeleteBranchResult;
      try {
        result = await bridge.deleteBranch({ repoPath, name, force });
      } catch (err) {
        toast('error', `Could not delete '${name}' — ${gitErrorLine(err)}`, true);
        return null;
      }
      if (result.status === 'deleted') {
        toast('success', `Branch '${name}' deleted`);
        void get().refresh(repoPath);
      }
      return result;
    },

    async createBranch(repoPath, name, fromRef) {
      const bridge = depthBridge();
      if (typeof bridge?.createBranch !== 'function') {
        return 'Branch creation needs a newer Tortie build';
      }
      try {
        await bridge.createBranch(
          fromRef !== undefined ? { repoPath, name, fromRef } : { repoPath, name }
        );
      } catch (err) {
        return gitErrorLine(err);
      }
      toast('success', `Branch '${name}' created`);
      void useGit.getState().refreshStatus(repoPath);
      void get().refresh(repoPath);
      return null;
    },

    async createTag(repoPath, name, ref) {
      const bridge = depthBridge();
      if (typeof bridge?.createTag !== 'function') {
        return 'Tag creation needs a newer Tortie build';
      }
      try {
        await bridge.createTag({ repoPath, name, ref });
      } catch (err) {
        return gitErrorLine(err);
      }
      toast('success', `Tag '${name}' created at ${shortSha(ref)}`);
      void get().refresh(repoPath);
      return null;
    },

    async cherryPick(repoPath, sha) {
      const bridge = depthBridge();
      if (typeof bridge?.cherryPick !== 'function') return;
      const short = shortSha(sha);
      let result: GitCherryPickResult;
      try {
        result = await bridge.cherryPick({ repoPath, sha });
      } catch (err) {
        toast('error', `Cherry-pick failed — ${gitErrorLine(err)}`, true);
        void useGit.getState().refreshStatus(repoPath);
        return;
      }
      if (result.status === 'applied') {
        toast('success', `Cherry-picked ${short}`);
      } else if (result.aborted) {
        toast(
          'error',
          `Cherry-picking ${short} hit conflicts — the pick was aborted and nothing changed.`,
          true
        );
      } else {
        toast(
          'error',
          `Cherry-picking ${short} hit conflicts and the automatic abort failed — ${
            result.detail ?? 'check the repository state'
          }`,
          true
        );
      }
      void useGit.getState().refreshStatus(repoPath);
      void get().refresh(repoPath);
    },

    async checkoutDetached(repoPath, sha) {
      const bridge = depthBridge();
      if (typeof bridge?.checkoutDetached !== 'function') return;
      try {
        await bridge.checkoutDetached({ repoPath, sha });
        toast('success', `Checked out ${shortSha(sha)} — HEAD is detached`);
      } catch (err) {
        toast('error', `Checkout failed — ${gitErrorLine(err)}`, true);
      }
      void useGit.getState().refreshStatus(repoPath);
      void get().refresh(repoPath);
    },

    // -- Phase 12 item 3 -------------------------------------------------------

    async loadRemotes(repoPath) {
      await fetchRemotes(repoPath);
    },

    async loadFetchAge(repoPath) {
      await fetchRemoteBranches(repoPath);
    },

    async push(repoPath) {
      const bridge = depthBridge();
      if (typeof bridge?.push !== 'function') return null;
      const result = await runSync(
        repoPath,
        'push',
        () => bridge.push!({ repoPath }),
        'Push failed'
      );
      if (result === null) return null;
      if (result.status === 'pushed') {
        toast('success', `Pushed ${result.branch} to ${result.remote}`);
      } else if (result.status === 'up-to-date') {
        toast('info', `${result.remote} already has everything`);
      }
      // 'no-upstream' is not a failure: the caller offers Publish instead.
      return result;
    },

    async publish(repoPath, remote) {
      const bridge = depthBridge();
      if (typeof bridge?.push !== 'function') return;
      const result = await runSync(
        repoPath,
        'publish',
        () =>
          bridge.push!(
            remote !== undefined
              ? { repoPath, setUpstream: true, remote }
              : { repoPath, setUpstream: true }
          ),
        'Publish failed'
      );
      if (result === null) return;
      if (result.status === 'no-upstream') {
        toast(
          'error',
          `Nothing to publish to — add a remote first (${result.branch} has no upstream).`,
          true
        );
        return;
      }
      toast(
        'success',
        `Published ${result.branch} to ${result.remote} — it now tracks ${result.remote}/${result.branch}`
      );
    },

    async pull(repoPath) {
      const bridge = depthBridge();
      if (typeof bridge?.pull !== 'function') return;
      const result = await runSync(
        repoPath,
        'pull',
        () => bridge.pull!({ repoPath }),
        'Pull failed'
      );
      if (result === null) return;
      if (result.status === 'pulled') {
        toast('success', `Pulled from ${result.upstream}`);
      } else if (result.status === 'up-to-date') {
        toast('info', `Already up to date with ${result.upstream}`);
      } else if (result.status === 'no-upstream') {
        toast('info', `'${result.branch}' has no upstream yet — publish it first`);
      } else {
        toast(
          'error',
          'Pull stopped at conflicts — resolve them in Changes, then commit the merge.',
          true
        );
      }
    },

    async sync(repoPath) {
      const bridge = depthBridge();
      if (typeof bridge?.sync !== 'function') return;
      const result = await runSync(
        repoPath,
        'sync',
        () => bridge.sync!({ repoPath }),
        'Sync failed'
      );
      if (result === null) return;
      const { pull, push } = result;
      if (pull.status === 'conflict') {
        toast(
          'error',
          'Sync stopped at conflicts — resolve them in Changes, then commit the merge.',
          true
        );
        return;
      }
      if (pull.status === 'no-upstream' || push?.status === 'no-upstream') {
        toast('info', 'This branch has no upstream yet — publish it first');
        return;
      }
      const pulled = pull.status === 'pulled';
      const pushed = push?.status === 'pushed';
      if (!pulled && !pushed) {
        toast('info', 'Already in sync');
        return;
      }
      const where =
        pull.status === 'pulled' || pull.status === 'up-to-date'
          ? pull.upstream
          : (push?.remote ?? 'the remote');
      toast(
        'success',
        pulled && pushed
          ? `Synced with ${where}`
          : pulled
            ? `Pulled from ${where}`
            : `Pushed to ${where}`
      );
    }
  };
});
