/**
 * src/main/watcher — repo file watching that drives `git:changed` events.
 *
 * The git IPC layer (src/main/git/ipc.ts) starts one RepoWatcher per repo
 * lazily on first `git:status`. Since Phase 14 that watcher's single callback
 * feeds the FAN-OUT in bus.ts rather than git alone: git subscribes and
 * broadcasts EVT_GIT_CHANGED, quick open subscribes and refreshes its path
 * index. One FSEvents subscription per repo, two consumers — see bus.ts for
 * why a second subscription was not an option.
 */

export {
  RepoWatcher,
  isRelevantDotGitPath,
  isRescanRequired,
  readGitdirPointer,
  type RepoWatcherOptions
} from './repo-watcher';
export {
  EXCLUSION_PATH_BUDGET,
  parseIgnoredRoots,
  planWorktreeIgnore,
  rankIgnoredRoots,
  readIgnoredRoots,
  type WorktreeIgnorePlan
} from './ignored-roots';
export {
  emitRepoChanged,
  onRepoChanged,
  resetRepoChangedListeners
} from './bus';
