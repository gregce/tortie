/**
 * Agents domain barrel (Phase 10) — registry, detection service, and the
 * Phase-8 availability probe, plus the one IPC registration point.
 *
 * src/main/index.ts keeps calling registerAgentsIpc exactly as before the
 * domain grew from a single file into this directory.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import { getAgentAvailability } from './availability';
import { listDetectedAgents, rescanAgents } from './detection';
import { multilineKeyTable } from './registry';

export { getAgentAvailability } from './availability';
export {
  expandDirs,
  expandPath,
  extractVersion,
  listDetectedAgents,
  rescanAgents,
  resetDetectionCache,
  stripAnsi,
  VERSION_PROBE_TIMEOUT_MS
} from './detection';
export {
  AGENT_IDS,
  AGENT_REGISTRY,
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
  type AgentLaunchInfo,
  type AgentRegistryEntry,
  type AgentResumeInfo,
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
export function registerAgentsIpc(ipc: IpcMain): void {
  handle(ipc, 'agents:availability', () => getAgentAvailability());
  handle(ipc, 'agents:list', () => listDetectedAgents());
  handle(ipc, 'agents:rescan', () => rescanAgents());
  handle(ipc, 'agents:multilineKeys', () => multilineKeyTable());
}
