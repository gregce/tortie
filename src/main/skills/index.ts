/**
 * src/main/skills — the skills CLI wrapper.
 *
 * Every skill operation that CHANGES STATE goes through the bundled `skills`
 * CLI, with no exceptions. Tortie never creates a skill directory, never
 * creates or removes a symlink in an agent directory, and never edits a lock
 * file by hand. This module is the whole of that boundary.
 *
 * **The local list is not here, and its absence is the design.** Tortie reads
 * the installed set straight from disk. `skills list --json` returns seven
 * fields and carries neither the description the sidebar shows nor the content
 * hash the re-check needs, and it is about 120 times slower, at 0.3 s against
 * 2.3 ms. That departure creates no second source of truth, because
 * `skills list` is itself a filesystem walk that reads no lock file. Every
 * operation that could make two views disagree is a write, and every write is
 * in here.
 *
 * The five files, and one sentence each:
 *
 * - `resolve.ts` — which copy of the CLI runs, and the one environment every
 *   spawn of it gets.
 * - `commands.ts` — the exact argv for every operation, with the three parser
 *   traps and the single-agent refusal encoded rather than remembered.
 * - `lock.ts` — the lock files, the guard that stops a write from discarding
 *   them, and the local content hash the pin-and-re-check needs.
 * - `run.ts` — plan, confirm, execute, and the five failure rows.
 * - `index.ts` — this, the export surface and the capability summary.
 *
 * ## What this module deliberately does not own
 *
 * Search (`GET skills.sh/api/search`) and the safety scan
 * (`GET add-skill.vercel.sh/audit`) are HTTP, not CLI, and they belong to the
 * source layer. `skills find` is not used for search because it has no `--json`
 * and it sends the user's query string to a third party.
 *
 * MCP servers, plugins, hooks and instructions are out of this CLI's scope
 * entirely. There is no MCP management anywhere in it, and this decision does
 * not widen to the other four categories.
 */

export {
  RELOCATING_ENV_VARS,
  CREDENTIAL_ENV_VARS,
  bundledSkillsDir,
  bundledSkillsEntry,
  bundledSkillsMeta,
  parseSkillsVersionOutput,
  resetSkillsResolutionCache,
  resolveSkillsCli,
  skillsEnv,
  skillsUnavailableMessage,
  withinCompatBand,
  type BundledSkillsMeta,
  type SkillsCliCopy,
  type SkillsCliResolution,
  type SkillsCliSource,
  type SkillsCompatBand,
  type SkillsEnvOptions,
  type SkillsInvocation
} from './resolve';

export {
  LIST_JSON_FIELDS,
  OPERATION_TRAITS,
  SKILLS_CLI_AGENTS,
  SkillsCommandError,
  assertNoEqualsForm,
  commandFor,
  enumerateCommand,
  installCommand,
  isKnownSkillsAgent,
  listProbeCommand,
  parseSkillsListJson,
  removeCommand,
  restoreProjectCommand,
  updateCommand,
  versionCommand,
  type InstallRequest,
  type SkillsListProbe,
  type SkillsOperation,
  type SkillsOperationKind
} from './commands';

export {
  GLOBAL_LOCK_VERSION,
  PROJECT_LOCK_VERSION,
  checkLockGuard,
  checkLocksBeforeWrite,
  computeSkillFolderHash,
  globalLockPath,
  projectLockPath,
  readProjectSkillPins,
  readSkillLockFile,
  readSkillPins,
  type LockGuardOptions,
  type LockGuardVerdict,
  type SkillLockEntry,
  type SkillLockRead,
  type SkillsScope
} from './lock';

export {
  executeSkillsPlan,
  planSkillsCommand,
  probeListShape,
  runSkillsOperation,
  type SkillsPlan,
  type SkillsPlanResult,
  type SkillsRefusal,
  type SkillsRunContext,
  type SkillsRunResult
} from './run';

import { resolveSkillsCli, skillsUnavailableMessage } from './resolve';
import type { SkillsCapability } from '@shared/skills';

/**
 * `SkillsCapability` is DECLARED IN `src/shared/skills.ts` and re-exported here,
 * because the panel reads it over the bridge to decide whether its write
 * controls are live and what one line to show when they are not.
 *
 * The list is never gated on it. The list is a filesystem read, so the Skills
 * section renders in full whatever this says. Only the write controls change.
 */
export type { SkillsCapability } from '@shared/skills';

export async function skillsCapability(): Promise<SkillsCapability> {
  const resolution = await resolveSkillsCli();
  if (resolution.active !== null) {
    return {
      available: true,
      copy: resolution.active,
      bundledEntryPath: resolution.bundledEntryPath,
      copies: resolution.copies,
      unavailableMessage: null
    };
  }
  return {
    available: false,
    copy: null,
    bundledEntryPath: resolution.bundledEntryPath,
    copies: resolution.copies,
    unavailableMessage: skillsUnavailableMessage(resolution)
  };
}
