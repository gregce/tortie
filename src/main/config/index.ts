/**
 * Tortie Config — the configuration directory domain (Phase 23).
 *
 * One door, and it takes data rather than code. Research 31 sections 6 and 7
 * carry the reasoning and the refusals. The two sentences that matter here:
 *
 *   > Tortie never loads third party code into any of its processes.
 *   > Configuration selects from choices the compiled world already contains,
 *   > or names an executable the user has personally confirmed.
 *
 * The pieces are deliberately separate.
 *
 *  - `overlay.ts` validates and merges, and is pure. No disk, no Electron.
 *  - `store.ts` owns every read, the cache, the reload and the watcher.
 *  - `paths.ts` decides where the directory is, once.
 *  - `confirm.ts` owns the execution hash, the sealed record and the refusals.
 *  - `seal.ts` is the Phase 18.5 danger seal with its prefix passed in.
 *  - `guide.ts` seeds the folder and opens it.
 *  - `ipc.ts` is the one `config:*` registrar.
 */

export {
  agentOverlayPath,
  agentOverlaySchemaPath,
  configDir,
  configExamplesDir,
  ensureConfigDir
} from './paths';

export {
  executionFieldsOf,
  mergeAgentOverlay,
  parseAgentOverlay,
  validateAgentOverlayFile,
  type AgentEntrySource,
  type AgentOverlayMerge,
  type AgentOverlayValidation,
  type MergedAgentEntry
} from './overlay';

export {
  agentEntry,
  agentOverlayDiskReads,
  agentOverlayRowSource,
  currentAgentOverlay,
  currentAgentTable,
  initAgentOverlay,
  launchableAgentEntry,
  loadAgentOverlay,
  onAgentOverlayChanged,
  reloadAgentOverlay,
  resetAgentOverlayStoreForTests,
  startAgentOverlayWatch,
  stopAgentOverlayWatch,
  type AgentOverlayLoadReason,
  type AgentOverlaySnapshot
} from './store';

export {
  assertConfigRowMayLaunch,
  configRowStatus,
  confirmConfigRow,
  executionHash,
  forgetConfigRow,
  isConfigRowConfirmed,
  listConfigConfirmations,
  whileReadingConfig,
  CONFIG_CONFIRM_ACKNOWLEDGEMENT,
  CONFIG_CONFIRM_WARNING,
  EMPTY_EXECUTION_FIELDS,
  type ConfigConfirmState,
  type ConfigExecutionFields,
  type ConfigRowStatus
} from './confirm';

export {
  bundledConfigTemplateDir,
  ensureConfigDirSeeded,
  revealConfigFolder,
  USER_OWNED_CONFIG_FILES,
  type ConfigSeedResult
} from './guide';

export {
  registerConfigIpc,
  setConfigRowSource,
  type ConfigRowSource,
  type ConfigSourceError,
  type ConfigSourceRow
} from './ipc';
