/**
 * Git contract beyond the frozen base: init, the depth stream (branches,
 * commit menu, hover card), branch management, sync (push/pull/remotes,
 * commit file diffs), and the history graph read. Moved verbatim from
 * src/shared/ipc.ts (Phase 42 stage 2).
 */

// ---------------------------------------------------------------------------
// APPENDED by the SCM stream (Phase 3) — new channels/types only, nothing
// above was modified. OPTIONAL bridge extension: the SCM UI feature-detects
// `typeof window.gmux.git.init === 'function'` and hides the §6.3
// [Initialize repository] button when absent, so it works against the
// frozen Phase-2 preload unchanged.
//
// INTEGRATOR wiring:
//   'git:init' → main: spawn `git init` in repoPath (reject with GIT_FAILED
//                on nonzero exit), then emit EVT_GIT_CHANGED for repoPath.
//   preload:     init: (repoPath) => invoke('git:init', repoPath)
// ---------------------------------------------------------------------------

/** New invoke channel appended by the SCM stream (see InvokeChannelMap). */
export interface ScmInvokeChannelMap {
  /** `git init` in a non-repo project folder (§6.3 friendly state). */
  'git:init': { req: [repoPath: string]; res: void };
}

/** OPTIONAL extensions to GmuxApi['git'], feature-detected by the SCM UI. */
export interface GmuxGitExtras {
  /** Initialize a repository in a non-git project folder. */
  init?(repoPath: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the git-depth stream (dogfood round 1) — new channels/types
// only, nothing above was modified. Powers the VS Code-bar git history:
// branch switching from the SCM header, the per-commit context menu
// (Checkout (Detached) / Create Branch… / Create Tag… / Cherry Pick /
// Open on GitHub), and the rich commit hover card.
//
// Wiring (done by this stream): main registers the channels in
// src/main/git/depth-ipc.ts via registerGitDepthIpc, called from
// registerGitIpc (the existing git registration point); preload appends the
// methods to the `git` object. All OPTIONAL bridge extensions — the renderer
// feature-detects each (`typeof window.gmux.git.branches === 'function'`).
// ---------------------------------------------------------------------------

import type {
  GitBranchInfo,
  GitCheckoutDetachedInput,
  GitCheckoutInput,
  GitCherryPickInput,
  GitCherryPickResult,
  GitCommitDetail,
  GitCommitDetailInput,
  GitCreateBranchInput,
  GitCreateTagInput
} from '../types';

/** New invoke channels appended by the git-depth stream. */
export interface GitDepthInvokeChannelMap {
  /** Local branches with current/upstream/ahead/behind (for-each-ref). */
  'git:branches': { req: [repoPath: string]; res: GitBranchInfo[] };
  /** Switch to a local branch (`git checkout <branch>`). */
  'git:checkout': { req: [input: GitCheckoutInput]; res: void };
  /** Create a branch (and switch to it), optionally from a start ref. */
  'git:createBranch': { req: [input: GitCreateBranchInput]; res: void };
  /** Create a lightweight tag at a commit. */
  'git:createTag': { req: [input: GitCreateTagInput]; res: void };
  /**
   * Cherry-pick a commit onto HEAD. Conflicts resolve (not reject!) with a
   * typed `{status:'conflict'}` result after an automatic abort — the repo
   * is never left mid-cherry-pick.
   */
  'git:cherryPick': { req: [input: GitCherryPickInput]; res: GitCherryPickResult };
  /** Everything the rich hover card needs (message, files, +/− counts). */
  'git:commitDetail': { req: [input: GitCommitDetailInput]; res: GitCommitDetail };
  /**
   * https://github.com/... URL for origin when it is a GitHub remote (ssh
   * forms normalized); null for non-GitHub or missing origin ("Open on
   * GitHub" hides itself).
   */
  'git:remoteUrl': { req: [repoPath: string]; res: string | null };
  /** Check out a commit detached (`git checkout --detach <sha>`). */
  'git:checkoutDetached': { req: [input: GitCheckoutDetachedInput]; res: void };
}

/**
 * OPTIONAL extensions to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.branches === 'function'`, etc.).
 */
export interface GmuxGitDepthExtras {
  branches?(repoPath: string): Promise<GitBranchInfo[]>;
  checkout?(input: GitCheckoutInput): Promise<void>;
  createBranch?(input: GitCreateBranchInput): Promise<void>;
  createTag?(input: GitCreateTagInput): Promise<void>;
  cherryPick?(input: GitCherryPickInput): Promise<GitCherryPickResult>;
  commitDetail?(input: GitCommitDetailInput): Promise<GitCommitDetail>;
  remoteUrl?(repoPath: string): Promise<string | null>;
  checkoutDetached?(input: GitCheckoutDetachedInput): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the branch-management stream (Phase 10 #7) — new channels/types
// only, nothing above was modified. Powers the BRANCHES sidebar section:
// remote refs, fetch, tracking checkout, and local branch deletion.
//
// Main handlers are registered by registerGitDepthIpc (src/main/git/
// depth-ipc.ts — the existing git-depth registration point), sharing the
// per-repo GitService + watcher registries.
//
// INTEGRATOR wiring (preload; per standing guardrail 1 fold these into the
// single typed bridge instead of adding a new wrapper generation — append to
// the existing `git` object):
//   remoteBranches:   (repoPath) => invoke('git:remoteBranches', repoPath),
//   fetch:            (repoPath) => invoke('git:fetch', repoPath),
//   checkoutTracking: (input)    => invoke('git:checkoutTracking', input),
//   deleteBranch:     (input)    => invoke('git:deleteBranch', input)
// Renderer feature-detects `typeof window.gmux.git.remoteBranches ===
// 'function'` (older preloads keep the local-only branch list).
// ---------------------------------------------------------------------------

import type {
  GitCheckoutTrackingInput,
  GitDeleteBranchInput,
  GitDeleteBranchResult,
  GitRemoteBranchesResult
} from '../types';

/** New invoke channels appended by the branch-management stream. */
export interface GitBranchesInvokeChannelMap {
  /** Remote-tracking branches + last-fetch time (for-each-ref refs/remotes). */
  'git:remoteBranches': {
    req: [repoPath: string];
    res: GitRemoteBranchesResult;
  };
  /** `git fetch --all --prune` (network; long timeout, never interactive). */
  'git:fetch': { req: [repoPath: string]; res: void };
  /**
   * Check out a remote branch: existing local with the same short name →
   * plain checkout; otherwise create a tracking local and switch to it.
   */
  'git:checkoutTracking': { req: [input: GitCheckoutTrackingInput]; res: void };
  /**
   * Delete a local branch. "Not fully merged" resolves (not rejects!) with a
   * typed `{status:'unmerged'}` so the UI offers force exactly when needed.
   */
  'git:deleteBranch': {
    req: [input: GitDeleteBranchInput];
    res: GitDeleteBranchResult;
  };
}

/**
 * OPTIONAL extensions to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.remoteBranches === 'function'`, etc.).
 */
export interface GmuxGitBranchExtras {
  remoteBranches?(repoPath: string): Promise<GitRemoteBranchesResult>;
  fetch?(repoPath: string): Promise<void>;
  checkoutTracking?(input: GitCheckoutTrackingInput): Promise<void>;
  deleteBranch?(input: GitDeleteBranchInput): Promise<GitDeleteBranchResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-12 git stream — new channels/types only, nothing
// above was modified. Two capabilities:
//
//   git:commitFileDiff — BACKLOG 12 item 4: the `<sha>^ → <sha>` content pair
//     for one file of one commit (read-only, never broadcasts).
//   git:remotes / git:push / git:pull / git:sync — BACKLOG 12 item 3.
//
// Main handlers are registered by registerGitDepthIpc (src/main/git/
// depth-ipc.ts — the existing git registration point), sharing the per-repo
// GitService + watcher registries. No new superset alias and no new preload
// wrapper generation (standing guardrail 1): this map is intersected straight
// into GmuxInvokeChannelMap above (declarations hoist, same forward reference
// the branch-management stream already uses), so the ONE typed invoke in
// src/preload/index.ts spans it, and the renderer feature-detects each method
// (`typeof window.gmux.git.commitFileDiff === 'function'`).
// ---------------------------------------------------------------------------

import type {
  GitCommitFileDiff,
  GitCommitFileDiffInput,
  GitPullInput,
  GitPullResult,
  GitPushInput,
  GitPushResult,
  GitRemotesResult,
  GitSyncInput,
  GitSyncResult
} from '../types';

/** New invoke channels appended by the Phase-12 git stream. */
export interface GitSyncInvokeChannelMap {
  /**
   * Parent→commit content pair for ONE file of ONE commit. A null side means
   * the file does not exist there (added / deleted); the caller renders that
   * as an all-green / all-red diff rather than an error.
   */
  'git:commitFileDiff': {
    req: [input: GitCommitFileDiffInput];
    res: GitCommitFileDiff;
  };
  /** Configured remotes (name + fetch/push URL) + the tracking context. */
  'git:remotes': { req: [repoPath: string]; res: GitRemotesResult };
  /**
   * `git push` (optionally `-u <remote> <branch>` to publish). A branch with
   * no upstream resolves (not rejects!) with `{status:'no-upstream'}` so the
   * UI offers Publish instead of inventing a remote.
   */
  'git:push': { req: [input: GitPushInput]; res: GitPushResult };
  /** `git pull` honouring the user's pull.rebase; conflicts are typed. */
  'git:pull': { req: [input: GitPullInput]; res: GitPullResult };
  /** Sync = pull, then push (VS Code's Sync Changes). */
  'git:sync': { req: [input: GitSyncInput]; res: GitSyncResult };
}

/**
 * OPTIONAL extensions to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.sync === 'function'`, etc.).
 */
export interface GmuxGitSyncExtras {
  commitFileDiff?(input: GitCommitFileDiffInput): Promise<GitCommitFileDiff>;
  remotes?(repoPath: string): Promise<GitRemotesResult>;
  push?(input: GitPushInput): Promise<GitPushResult>;
  pull?(input: GitPullInput): Promise<GitPullResult>;
  sync?(input: GitSyncInput): Promise<GitSyncResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-14.5 git-graph data stream (docs/research/24-git-graph.md)
// — one new channel and its optional preload extra. The one existing line
// touched above is the GmuxInvokeChannelMap intersection, exactly as that
// declaration's own comment prescribes.
//
// WHY A NEW CHANNEL RATHER THAN A WIDER `git:log`: `git:log` is a frozen
// channel whose response is `GitLogEntry[]` — a bare array with nowhere to put
// the divergence numbers, the ref set the walk used, or the last-fetch age.
// The graph needs all three in the SAME round trip as the commits, because
// they must describe the same instant: ahead/behind read a beat after the log
// is how a UI ends up drawing "0 unpushed" above a row it is also shading as
// unpushed. `git:log` keeps working unchanged (its handler now serves the
// richer entries, which are a structural superset).
//
// Main handler: registerGitDepthIpc (src/main/git/depth-ipc.ts), sharing the
// existing per-repo GitService + watcher registries. No new preload wrapper
// generation (standing guardrail 1).
// ---------------------------------------------------------------------------

import type { GitGraphLogInput, GitGraphLogResult } from '../types';

/** New invoke channel appended by the Phase-14.5 git-graph data stream. */
export interface GitGraphInvokeChannelMap {
  /**
   * ONE ref-scoped, topologically ordered history page — commits with typed
   * decorations, the ref set that produced them, the current branch's
   * divergence from its upstream, and how stale that comparison is.
   *
   * Non-repo folders and unborn branches resolve to the empty result
   * (`isRepo:false` / no entries), never a rejection — the same friendly-read
   * discipline as `git:status` and `git:log`.
   */
  'git:graphLog': {
    req: [input: GitGraphLogInput];
    res: GitGraphLogResult;
  };
}

/**
 * OPTIONAL extension to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.graphLog === 'function'`) — an older preload leaves
 * the history pane on its flat single-column render rather than throwing.
 */
export interface GmuxGitGraphExtras {
  graphLog?(input: GitGraphLogInput): Promise<GitGraphLogResult>;
}
