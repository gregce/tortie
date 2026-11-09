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
 *
 * Phase 347 added the one thing in this directory that is NOT a consumer of the
 * bus: ./open-files.ts watches, one file each, the open files the bus cannot
 * see because the running watcher's own plan excludes them. It is `node:fs`'s
 * watch on a file, so it adds no subscription and no exclusion path either.
 *
 * Phase 365 moved `@parcel/watcher` out of main. It runs only in the watcher
 * process (./watcher-process.ts), behind ONE queue that makes one native call
 * at a time and never subscribes to a folder that is not there
 * (./process/queue.ts), and every site that watches a folder asks
 * `watchFolder` in ./host.ts, which forwards to that process.
 */

export {
  DEFAULT_DEBOUNCE_MS,
  RepoWatcher,
  excludedBy,
  exclusionViewOf,
  isRelevantDotGitPath,
  isRescanRequired,
  readGitdirPointer,
  type ExclusionView,
  type RepoWatcherOptions
} from './repo-watcher';
export {
  ARM_RECHECKS,
  OPEN_FILE_DECLARE_MAX,
  OPEN_FILE_WATCH_CAP,
  OPEN_FILE_WATCH_OFF_ENV,
  afterKernelSees,
  armFileByDescriptor,
  createOpenFileWatches,
  fileIdentity,
  parseOpenFileEntries,
  type ArmedFile,
  type FileIdentity,
  type OpenFileEntry,
  type OpenFileEventKind,
  type OpenFilePlan,
  type OpenFileWatchDeps,
  type OpenFileWatches
} from './open-files';
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
export {
  WATCHER_GIVE_UP_EXITS,
  WATCHER_GIVE_UP_WINDOW_MS,
  WATCHER_RESTART_BACKOFF_MS,
  WATCHER_RESTART_ERROR,
  WATCH_CLOSE_REPLY_MS,
  WATCH_START_REPLY_MS,
  watchFolder,
  watcherProcessObservation,
  type FolderEvent,
  type FolderEvents,
  type FolderWatch
} from './host';
