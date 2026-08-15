/**
 * The git half of the bridge. Moved verbatim from the single preload file
 * (Phase 42 stage 2).
 */

import type { InstalledGitApi } from '../shared/ipc';
import { EVT_GIT_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

/**
 * git surface = frozen GmuxApi['git'] + the appended optional git:init
 * (the SCM UI feature-detects it for the §6.3 [Initialize repository] state)
 * + the git-depth extras (branch switching, commit context menu, hover card)
 * + the branch-management extras (remotes, fetch, tracking checkout, delete)
 * + the Phase-12 sync extras (historical commit diffs, remotes list, push /
 * pull / sync) + the Phase-14.5 history graph read (git:graphLog — one
 * ref-scoped, topologically ordered page with its divergence and last-fetch
 * age attached), all feature-detected by the renderer.
 */
export const git: InstalledGitApi = {
  status: (repoPath) => invoke('git:status', repoPath),
  stage: (input) => invoke('git:stage', input),
  unstage: (input) => invoke('git:unstage', input),
  commit: (input) => invoke('git:commit', input),
  discard: (input) => invoke('git:discard', input),
  log: (input) => invoke('git:log', input),
  showHead: (input) => invoke('git:showHead', input),
  onChanged: (cb) => on(EVT_GIT_CHANGED, cb),
  init: (repoPath) => invoke('git:init', repoPath),
  branches: (repoPath) => invoke('git:branches', repoPath),
  checkout: (input) => invoke('git:checkout', input),
  createBranch: (input) => invoke('git:createBranch', input),
  createTag: (input) => invoke('git:createTag', input),
  cherryPick: (input) => invoke('git:cherryPick', input),
  commitDetail: (input) => invoke('git:commitDetail', input),
  remoteUrl: (repoPath) => invoke('git:remoteUrl', repoPath),
  checkoutDetached: (input) => invoke('git:checkoutDetached', input),
  remoteBranches: (repoPath) => invoke('git:remoteBranches', repoPath),
  fetch: (repoPath) => invoke('git:fetch', repoPath),
  checkoutTracking: (input) => invoke('git:checkoutTracking', input),
  deleteBranch: (input) => invoke('git:deleteBranch', input),
  commitFileDiff: (input) => invoke('git:commitFileDiff', input),
  remotes: (repoPath) => invoke('git:remotes', repoPath),
  push: (input) => invoke('git:push', input),
  pull: (input) => invoke('git:pull', input),
  sync: (input) => invoke('git:sync', input),
  graphLog: (input) => invoke('git:graphLog', input)
};
