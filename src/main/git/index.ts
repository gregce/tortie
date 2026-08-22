/**
 * src/main/git — VS Code-model git service (research 06): spawn the system
 * git CLI per project, parse porcelain v2 / NUL-delimited output, expose the
 * frozen git:* IPC surface, and drive git:changed via src/main/watcher.
 *
 * INTEGRATOR: call `registerGitIpc(ipcMain)` during main boot and
 * `await disposeGitIpc()` on quit. `unwatchGitRepo(path)` when a project
 * tab is removed. `getGitService(path)` for in-main consumers (e.g. a diff
 * provider wanting binary-safe showHeadBuffer / null-distinguishing
 * showHead).
 *
 * THE PARSERS COME FROM `./parsers` SINCE PHASE 126, and that file is the door
 * a caller who wants a parser and nothing that spawns should use. This barrel
 * still exports every one of them, so no local caller changed. It exports the
 * git service and the IPC registrars too, which is why the remote read modules
 * under src/main/machines take `./parsers` instead of this file.
 */

export { GitService } from './service';
export {
  registerGitIpc,
  disposeGitIpc,
  unwatchGitRepo,
  getGitService
} from './ipc';
export { runGit, runGitOrThrow, type GitResult } from './exec';
export {
  registerGitDepthIpc,
  type GitDepthDeps
} from './depth-ipc';
// The parsers, every one of them, from the one door that holds the list.
// Phase 126 wrote the names out here as well as in `./parsers`, which is the
// same list in two files. It lives in `./parsers` alone now. A star re-export
// of a file that names each of its own exports adds exactly those names, so
// this barrel's exported set is the thirty nine it has always had.
export * from './parsers';
