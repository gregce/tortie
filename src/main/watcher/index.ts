/**
 * src/main/watcher — repo file watching that drives `git:changed` events.
 *
 * The git IPC layer (src/main/git/ipc.ts) starts one RepoWatcher per repo
 * lazily on first `git:status` and broadcasts EVT_GIT_CHANGED on each
 * debounced change. See repo-watcher.ts for the VS Code-recipe details.
 */

export {
  RepoWatcher,
  isRelevantDotGitPath,
  readGitdirPointer,
  type RepoWatcherOptions
} from './repo-watcher';
