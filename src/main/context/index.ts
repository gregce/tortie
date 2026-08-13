/**
 * The Context substrate reader (Phase 22 — research 29 §2 and §12).
 *
 * Everything the Context view knows about what an agent will load comes
 * through here. The export surface is deliberately small: one scan, one
 * standalone executable-content scan for the install path, and the registry
 * data the view needs to explain itself.
 *
 * WHAT THIS MODULE DOES NOT DO, and must not grow into:
 *  - It never writes. Every mutation goes through the agent's own verb or
 *    through the bundled skills CLI, which is a different module.
 *  - It never spawns a process and never opens a socket. Reading files is
 *    11.1 ms; `claude mcp list` is 2.5 seconds and connects to remote services
 *    to produce its answer.
 *  - It never returns a credential. MCP `env` values are not read into the
 *    model at all, and every free-text field is masked on the way out.
 */

export { scanContext, type ScanDeps } from './scan';
export { scanExecutableContent, scanBodyCommands, executableSummary } from './executes';
export {
  CONTEXT_AGENT_IDS,
  displayName,
  locationsFor,
  precedenceFor,
  readsSkillFrontmatterHooks,
  reloadFor,
  reloadSentence,
  skillsCliNameFor,
  skillsCliTargets,
  supportedCategories,
  type AgentContextBlock,
  type ContextLocation,
  type ContextPrecedence,
  type ContextReader
} from './agent-context';
export { resolveHomes, globalSkillLockPath, type ContextEnv, type ContextHomes } from './env';
export {
  createNodeContextFs,
  createMemoryContextFs,
  type ContextFs,
  type MemoryFsSpec
} from './port';
export { HASH_ALGORITHM, hashDirectory } from './hash';
export {
  countSections,
  mergeAcrossAgents,
  resolveForAgent,
  shadowSentence,
  sortEntries,
  type AgentResolution
} from './resolve';
export { isSecretKey, maskArgs, maskInline, maskUrl, MASK, SECRET_KEY_PATTERN } from './secrets';
export { firstClause, triggerSentence } from './read/skills';
export { commandLeaf, scriptPathOf } from './read/hooks';
export { firstMeaningfulLine } from './read/instructions';
export type { Candidate, ReadContext } from './candidate';
