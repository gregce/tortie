/**
 * src/main/actions — the Runs section's engine room (Phase 46).
 *
 * Public surface, deliberately small, and it names three things:
 *  - `registerActionsIpc` / `disposeActionsIpc` — the four actions:* channels.
 *  - `readMergedRuns` — the read only merged runs read, shared with the remote
 *    Runs section under src/main/machines. Phase 126 promoted it, because that
 *    path was importing four private files of this directory to compose the
 *    same read by hand.
 *
 * Everything else (the argv allowlist, the gh spawn, the parser, the merge
 * fold, the watch machine, the service) is an implementation detail of this
 * directory and is imported directly by its tests.
 *
 * `src/main/machines/remote-runs.ts` imports `./runs-read` directly rather
 * than through this barrel, because this barrel pulls `./ipc` and `./service`
 * into the graph and `./service` pulls `../watcher` and `../typed-events`
 * after it. `__tests__/p126-boundary.test.ts` asserts that no other file
 * under src/main/machines reaches into this directory at all.
 *
 * Nothing in here imports the sessions domain, so nothing in here can reach
 * the status path. A workflow run is not session behavior, and the frozen
 * rule that only session behavior may raise "needs input" is untouched.
 */

export { registerActionsIpc, disposeActionsIpc } from './ipc';
export {
  readMergedRuns,
  RUNS_READ_LIMITS,
  type MergedRunsInput,
  type MergedRunsRead,
  type MergedRunsSeam
} from './runs-read';
