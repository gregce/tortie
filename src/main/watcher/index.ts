/**
 * src/main/watcher — repo file watching that drives `git:changed` events.
 *
 * The git IPC layer (src/main/git/ipc.ts) starts one RepoWatcher per repo
 * lazily on first `git:status`. Since Phase 14 that watcher's single callback
 * feeds the FAN-OUT in bus.ts rather than git alone: git subscribes and
 * broadcasts EVT_GIT_CHANGED, quick open subscribes and refreshes its path
 * index. One FSEvents subscription per repo, two consumers — see bus.ts for
 * why a second subscription was not an option.
 *
 * Phase 63 added a THIRD consumer, being the arch checker, on the same terms.
 * It subscribes to the bus and it starts nothing: no new FSEvents subscription,
 * no new exclusion path, and therefore no change to the eight path budget
 * `npm run conformance:watcher` exists to protect.
 */

export {
  DEFAULT_DEBOUNCE_MS,
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
