/**
 * Phase 359, Builder B — launch/restore delivery of the first-party skill.
 *
 * WHAT THIS FILE OWNS. The one composition of "does this launch get the
 * bundled `tortie` skill, and if so which argv pair and which pane env", plus
 * the one wrapper-aware argv applier. The three call sites (create,
 * restore, resume-in-place) converge here so the measured pairs cannot drift
 * between them.
 *
 * WHAT IT NEVER DOES. Read the sealed setting itself (callers pass the
 * already-seal-checked `enabled`); reach the manifest, a record, the
 * registry confirm hash, or the filesystem; log argv, paths, or session ids.
 * Delivery is persisted nowhere: the manifest keeps the pre-delivery
 * `spec`/record at every call site.
 *
 * THE MEASURED PAIRS, from `SCRATCH/skill-injection-spike/RESULTS.md:17-19`
 * at fixed versions:
 * - Claude Code 2.1.312: `--plugin-dir <Resources>/agent-skills/tortie`
 * - Pi 1.5.0: `--skill <Resources>/agent-skills/tortie/skills/tortie`
 * - omp 18.10.4: `--plugin-dir <Resources>/agent-skills/tortie`
 */

import {
  AGENT_ACCESS_DELIVERY_AGENTS,
  AGENT_ACCESS_SOCKET_ENV,
  type AgentAccessDeliveryAgent
} from '@shared/agent-access';
import type { LaunchableAgentKind } from '@shared/types';
import type { SpecstoryCaptureRecord } from '../specstory/capture';
import { getLog } from '../log';

const deliveryLog = getLog('agent-access');

/** Which delivery agent an id names, or null. Shell is never deliverable. */
function deliveryAgentFor(agent: string): AgentAccessDeliveryAgent | null {
  return (AGENT_ACCESS_DELIVERY_AGENTS as readonly string[]).includes(agent)
    ? (agent as AgentAccessDeliveryAgent)
    : null;
}

/**
 * The exact measured pair appended after the agent's own args, or null when
 * the caller must receive nothing. `bundleRoot` is the launch-visible root:
 * `<Resources>/agent-skills/tortie` in a packaged app, the development
 * mirror otherwise (resolved by the caller from its own app-path root).
 */
export function agentAccessArgvPair(
  agent: AgentAccessDeliveryAgent,
  bundleRoot: string
): string[] {
  switch (agent) {
    case 'claude':
    case 'omp':
      return ['--plugin-dir', bundleRoot];
    case 'pi':
      return ['--skill', `${bundleRoot}/skills/tortie`];
  }
}

/**
 * Whether this launch is eligible for delivery. Pure and exported so the
 * three call sites and the unit tests ask the same question.
 *
 * - `enabled` is the seal-checked `getSettings().agentAccess`. A forged or
 *   old-schema settings file never reaches here as true.
 * - `local` is false for a session on another machine: a remote agent gets
 *   neither the bundle argument nor the socket path.
 * - `socketPath` must be a non-empty address that fits macOS `sun_path`
 *   (≤ 103 UTF-8 bytes); a longer address is refused, never truncated.
 * - `bundleRoot` must be non-empty. Bundle completeness (the exact five
 *   files) is the integrator's packaged assertion; this seam refuses an
 *   empty root rather than composing a pair that points nowhere.
 */
export function agentAccessEligible(
  agent: LaunchableAgentKind,
  enabled: boolean,
  local: boolean,
  socketPath: string,
  bundleRoot: string
): agent is AgentAccessDeliveryAgent {
  if (!enabled || !local) return false;
  if (deliveryAgentFor(agent) === null) return false;
  if (socketPath.length === 0) return false;
  if (Buffer.byteLength(socketPath, 'utf8') > 103) return false;
  if (bundleRoot.length === 0) return false;
  return true;
}

/**
 * The delivery for one launch: the exact measured argv pair plus the socket
 * env. Returns null when this launch receives nothing, in which case the
 * caller composes byte-for-byte what it composed before this phase.
 */
export interface AgentAccessDelivery {
  /** The exact pair appended after the agent's own args. A fresh array. */
  argv: string[];
  /** `{ GMUX_AGENT_SOCKET: socketPath }`. Merged AFTER `paneEnvFor`. */
  env: Record<typeof AGENT_ACCESS_SOCKET_ENV, string>;
}

/**
 * The one delivery composer for all three launch seams. Callers pass the
 * seal-checked switch (`settings.agentAccess === true`) and whether the
 * pane is local; this helper reads the current profile socket path and the
 * packaged-or-development bundle root and returns the delivery or null.
 *
 * The socket path is read at composition time so an overlong profile path
 * refuses without any caller caching a stale truth. The bundle root follows
 * the packaged/development resource pattern: packaged builds use
 * `process.resourcesPath` only; development falls back to the app path then
 * the working directory. The packaged resolver never reaches the source
 * checkout.
 */
export function composeAgentAccessDelivery(input: {
  agent: LaunchableAgentKind;
  enabled: boolean;
  local: boolean;
  socketPath?: string;
  bundleRoot?: string;
}): AgentAccessDelivery | null {
  const socketPath = input.socketPath ?? agentAccessSocketPathDefault();
  const bundleRoot = input.bundleRoot ?? agentAccessBundleRootDefault();
  return agentAccessDelivery(
    input.agent,
    input.enabled,
    input.local,
    socketPath,
    bundleRoot
  );
}

/** This profile's exact socket address. Empty when Electron is absent. */
export function agentAccessSocketPathDefault(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    if (typeof app?.getPath !== 'function') return '';
    const { join } = require('node:path') as typeof import('node:path');
    return join(app.getPath('userData'), 'gmux', 'agent.sock');
  } catch {
    return '';
  }
}

/**
 * The launch-visible bundle root. Packaged: `<Resources>/agent-skills/tortie`.
 * Development: the same tree under the source root or working directory.
 */
export function agentAccessBundleRootDefault(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    const { join } = require('node:path') as typeof import('node:path');
    if (typeof app?.getAppPath === 'function' && app.isPackaged === true) {
      return join(process.resourcesPath, 'agent-skills', 'tortie');
    }
    const root =
      typeof app?.getAppPath === 'function' ? app.getAppPath() : process.cwd();
    return join(root, 'resources', 'agent-skills', 'tortie');
  } catch {
    return '';
  }
}

export function agentAccessDelivery(
  agent: LaunchableAgentKind,
  enabled: boolean,
  local: boolean,
  socketPath: string,
  bundleRoot: string
): AgentAccessDelivery | null {
  const deliverable = deliveryAgentFor(agent);
  if (deliverable === null) return null;
  if (!agentAccessEligible(agent, enabled, local, socketPath, bundleRoot)) {
    return null;
  }
  return {
    argv: agentAccessArgvPair(deliverable, bundleRoot),
    env: { [AGENT_ACCESS_SOCKET_ENV]: socketPath }
  };
}

/**
 * Append the delivery pair to an argv, wrapper-aware. Returns the composed
 * argv, or the ORIGINAL argv unchanged when there is no delivery.
 *
 * - The pair is appended after the agent's existing args; every existing
 *   byte/order is preserved. When the exact pair is already present it is
 *   not added again. Other user plugin/skill flags remain.
 * - When `argv` is SpecStory-wrapped, the pair goes INSIDE `-c` and the
 *   recorded wrapper is rebuilt with `wrapWithRecord`. When the rewrap
 *   unexpectedly fails the original argv is kept and the caller must treat
 *   the launch as undelivered rather than breaking it.
 * - Returns copies, never mutating `argv`, the record, or the registry row.
 * - Logs no argv, path, or session detail: the one line names only whether
 *   delivery was applied and why not.
 */
export function applyAgentAccessArgv(
  argv: readonly string[],
  capture: SpecstoryCaptureRecord | undefined,
  delivery: AgentAccessDelivery | null,
  isWrappedArgv: (candidate: readonly string[]) => boolean,
  unwrapArgv: (wrapped: readonly string[]) => string[],
  wrapWithRecord: (
    record: SpecstoryCaptureRecord,
    inner: readonly string[]
  ) => string[] | null
): string[] {
  if (delivery === null) return [...argv];
  const pair = delivery.argv;
  if (pair.length === 0) return [...argv];
  if (capture !== undefined && isWrappedArgv(argv)) {
    const inner = unwrapArgv(argv);
    if (inner.length === 0) {
      deliveryLog.warn('agent access delivery skipped: wrapper would not open');
      return [...argv];
    }
    const composed = [...inner, ...pairUnlessPresent(inner, pair)];
    const rewrapped = wrapWithRecord(capture, composed);
    if (rewrapped === null) {
      deliveryLog.warn(
        'agent access delivery skipped: wrapper would not rebuild'
      );
      return [...argv];
    }
    return rewrapped;
  }
  return [...argv, ...pairUnlessPresent(argv, pair)];
}

/**
 * The pair's tokens that are not already present as the exact adjacent pair.
 * When the exact pair is already in the argv — a retry, a composed resume,
 * a row that recorded one — nothing is appended.
 */
function pairUnlessPresent(
  argv: readonly string[],
  pair: readonly string[]
): string[] {
  for (let i = 0; i + pair.length <= argv.length; i += 1) {
    let found = true;
    for (let j = 0; j < pair.length; j += 1) {
      if (argv[i + j] !== pair[j]) {
        found = false;
        break;
      }
    }
    if (found) return [];
  }
  return [...pair];
}
