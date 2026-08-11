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
  parsePorcelainV2Status,
  STATUS_LIMIT,
  type ParsedStatus
} from './parse';
export {
  registerGitDepthIpc,
  type GitDepthDeps
} from './depth-ipc';
export {
  BRANCH_FORMAT,
  COMMIT_META_FORMAT,
  parseForEachRefBranches,
  parseCommitMeta,
  parseNameStatusZ,
  parseNumstatZ,
  parseUpstreamTrack,
  mergeCommitFiles,
  normalizeGitHubRemote,
  type ParsedCommitMeta,
  type NameStatusEntry,
  type NumstatEntry,
  type ParsedNumstat,
  type UpstreamTrack
} from './parse';
// Phase 14.5 — the history graph's data layer (docs/research/24-git-graph.md).
export {
  GRAPH_LOG_FORMAT,
  LOCAL_REF_FORMAT,
  SCOPE_REF_FORMAT,
  annotateDivergence,
  parseDecoration,
  parseGraphLog,
  parseLeftRight,
  parseLocalRefs,
  parseScopeRefs,
  sanitizeRefNames,
  type ParseGraphLogOptions,
  type ParsedLocalRef
} from './graph-parse';
