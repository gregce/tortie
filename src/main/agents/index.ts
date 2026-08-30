/**
 * Agents domain barrel (Phase 10) — registry, detection service, and the
 * Phase-8 availability probe, plus the one IPC registration point.
 *
 * src/main/index.ts keeps calling registerAgentsIpc exactly as before the
 * domain grew from a single file into this directory.
 */

import type { IpcMain } from 'electron';
import type { AgentsScanResult } from '@shared/types';
import { handle } from '../typed-ipc';
// PHASE 23. The scan says what is INSTALLED. The gate says what may START.
// They are different questions and the picker needs both, so the answer to the
// second is stamped onto each row here rather than inside detection, which is
// pure Node and has no keychain. A machine with no configuration file reads
// nothing extra: every row answers "nothing to confirm" before any file is
// opened.
import { withConfigState } from '../config/store';
import { getAgentAvailability } from './availability';
import { listDetectedAgents, rescanAgents } from './detection';
import { multilineKeyTable } from './registry';

export { getAgentAvailability } from './availability';
// PHASE 48. The structural preflight. It reads one file's first line and asks
// whether the interpreter that line names is on the PATH the pane will get.
// The create path is its only caller; see ../sessions/create-local.ts.
export {
  AGENT_HEALTH_TIMEOUT_MS,
  agentHealthCacheSize,
  checkAgentBinary,
  interpreterOf,
  resetAgentHealthCache,
  type AgentHealth,
  type AgentHealthAnswer,
  type AgentHealthInterpreterMissing,
  type AgentHealthOk,
  type AgentHealthUnknown,
  // Phase 49: what actually runs when the resolved file starts.
  type AgentRuntime
} from './health';
export {
  // Phase 49: the create path's synchronous read, and the two hooks that
  // keep "the version probe is unreachable from the create path" executable.
  detectionScanCount,
  expandDirs,
  expandPath,
  extractVersion,
  installKindOf,
  listDetectedAgents,
  peekDetectedAgents,
  rescanAgents,
  resetDetectionCache,
  signatureMatches,
  stripAnsi,
  VERSION_PROBE_TIMEOUT_MS,
  versionProbeCount,
  // Phase 164: the boot warm, kept only for a profile with nothing to show.
  warmDetectionAtBoot
} from './detection';
export {
  AGENT_IDS,
  AGENT_REGISTRY,
  agentBinaryCandidates,
  agentBinaryName,
  DEFAULT_AGENT_ID,
  DEFAULT_IMAGE_DROP,
  DEFAULT_MULTILINE_KEY,
  getLaunchableEntry,
  imageDropFor,
  imageDropTable,
  getRegistryEntry,
  LAUNCHABLE_AGENT_IDS,
  LF,
  multilineKeyFor,
  multilineKeyTable,
  preAssignFlag,
  registryLaunchArgv,
  registryResumeArgv,
  SESSION_ID_SLOT,
  type AgentFlagPreset,
  type AgentHarvestKey,
  type AgentIdCapture,
  // Phase 49: the install map. Display and clipboard material only.
  type AgentInstallInfo,
  type AgentLaunchInfo,
  type AgentRegistryEntry,
  type AgentResumeInfo,
  type InstallSignature,
  type ResumeStrategy,
  type VersionProbe
} from './registry';

/**
 * Register the agents invoke channels:
 *  - 'agents:availability'  (Phase 8, frozen claude/codex shape)
 *  - 'agents:list'          (Phase 10: cached 12-agent detection scan)
 *  - 'agents:rescan'        (Phase 10: drop cache + re-probe)
 *  - 'agents:multilineKeys' (Phase 12.5: per-agent Shift+Enter table, served
 *    off the registry exactly as drop:strategies serves `imageDrop`)
 */
/** One scan, with the confirm gate's answer stamped onto every row. */
function gated(scan: AgentsScanResult): AgentsScanResult {
  return { ...scan, agents: withConfigState(scan.agents) };
}

export function registerAgentsIpc(ipc: IpcMain): void {
  handle(ipc, 'agents:availability', () => getAgentAvailability());
  // Phase 164. This is the demand path. On a boot with sessions to show no
  // scan starts until a renderer surface that draws one asks here, and the
  // answer is the same memoised scan whoever asked first.
  handle(ipc, 'agents:list', async () => gated(await listDetectedAgents()));
  handle(ipc, 'agents:rescan', async () => gated(await rescanAgents()));
  handle(ipc, 'agents:multilineKeys', () => multilineKeyTable());
}
