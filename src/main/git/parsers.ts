/**
 * The git parsers, and the one door onto them (Phase 126).
 *
 * ## Why this file exists
 *
 * Four files under `src/main/machines/` wanted a pure parser and imported
 * `../git` to get one. That barrel exports `GitService`, `registerGitIpc`,
 * `getGitService`, `unwatchGitRepo`, `runGit` and `registerGitDepthIpc`, so a
 * remote read module that wanted `parseGraphLog` received the whole git
 * service and the git IPC registrar in its runtime graph. A fifth file reached
 * past the barrel into `../git/parse`, which is private.
 *
 * This file is the door. It holds NO function bodies and NO effects. It
 * re-exports from `./parse` and `./graph-parse` and it imports nothing else,
 * so a file that imports it gets the parsers and nothing that spawns.
 *
 * `./index.ts` re-exports these same names from here rather than from the two
 * files directly, so the barrel's exported name set did not change by one name
 * and every local caller compiles unchanged.
 *
 * A file under `src/main/machines/` may import `./parsers` and `./exec` and
 * nothing else in this directory. `src/main/actions/__tests__/p126-boundary.test.ts`
 * asserts it, and it asserts that this file stays a pure door.
 */

export {
  BRANCH_FORMAT,
  COMMIT_META_FORMAT,
  STATUS_LIMIT,
  mergeCommitFiles,
  normalizeGitHubRemote,
  parseCommitMeta,
  parseForEachRefBranches,
  parseNameStatusZ,
  parseNumstatZ,
  parsePorcelainV2Status,
  parseUpstreamTrack,
  type NameStatusEntry,
  type NumstatEntry,
  type ParsedCommitMeta,
  type ParsedNumstat,
  type ParsedStatus,
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
