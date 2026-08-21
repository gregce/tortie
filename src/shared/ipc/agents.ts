/**
 * Agent-layer contract: the registry detection scan, the per-agent
 * Shift+Enter table, and the Phase 23 configuration confirm gate. Moved
 * verbatim from src/shared/ipc.ts (Phase 42 stage 2).
 */

// ---------------------------------------------------------------------------
// APPENDED by the Phase-10 registry+detection stream — new channels/types
// only, nothing above was modified.
//
// agents:list   — full 12-agent detection result (registry ids, resolved
//                 absolute binPath, version from each entry's versionCmd,
//                 store-dir presence). Scanned once on first call, cached.
// agents:rescan — drop the cache and re-probe (Settings "Re-scan" button);
//                 resolves the fresh result.
//
// Main handlers are registered by src/main/agents (registerAgentsIpc — same
// entry point that already registers agents:availability, so no main/index.ts
// change was needed).
//
// INTEGRATOR wiring (preload; per standing guardrail 1 fold these into the
// single typed bridge instead of adding a new wrapper generation):
//   agentsList:   () => invoke('agents:list'),
//   agentsRescan: () => invoke('agents:rescan')
// Renderer feature-detects `typeof window.gmux.agentsList === 'function'`.
// ---------------------------------------------------------------------------

import type { AgentsScanResult } from '../types';

/** New invoke channels appended by the registry+detection stream. */
export interface AgentsInvokeChannelMap {
  /** Cached full-registry detection scan (12 agents, path+version+store). */
  'agents:list': { req: []; res: AgentsScanResult };
  /** Clear the detection cache and re-probe everything. */
  'agents:rescan': { req: []; res: AgentsScanResult };
}

/**
 * Top-level extras on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxAgentRegistryExtras {
  /** Detection scan over the full agent registry (cached in main). */
  agentsList(): Promise<AgentsScanResult>;
  /** Re-probe (Settings re-scan button); resolves the fresh result. */
  agentsRescan(): Promise<AgentsScanResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by the Shift+Enter stream (Phase 12.6 — the registry fold Phase
// 12.5 could not make while Phase 13 owned the registry) — new channels/types
// only. The one existing line touched above is the GmuxInvokeChannelMap
// intersection, exactly as its own comment prescribes.
//
// agents:multilineKeys — the per-agent Shift+Enter table, read straight off
//   the main-process agent registry (`AgentRegistryEntry.multilineKey`, so
//   the table exists ONCE, guardrail 3 — the same shape as drop:strategies).
//   Static per build; the renderer primes it when a terminal mounts and
//   caches it, because the lookup happens inside a keystroke handler.
//
// PRELOAD (guardrail 1 — folded into the single typed bridge, no new wrapper
// generation): `agentMultilineKeys: () => invoke('agents:multilineKeys')`.
// Renderers feature-detect `typeof window.gmux.agentMultilineKeys ===
// 'function'`; without it every agent takes the LF default, which is what
// every measured agent takes anyway.
// ---------------------------------------------------------------------------

import type { MultilineKeyTable } from '../types';

/** New invoke channel appended by the Shift+Enter stream. */
export interface MultilineInvokeChannelMap {
  /** Per-agent Shift+Enter sequences from the agent registry. */
  'agents:multilineKeys': { req: []; res: MultilineKeyTable };
}

/**
 * Top-level extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxMultilineExtras {
  agentMultilineKeys(): Promise<MultilineKeyTable>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 23 (Tortie Config, the confirm gate) — three invoke
// channels behind ONE optional preload extra, `window.gmux.config`. The one
// existing line touched above is the GmuxInvokeChannelMap intersection, exactly
// as that declaration's own comment prescribes.
//
// WHAT THESE ARE FOR. A configuration file can name a program. Before Tortie
// runs it, a person reads what it will run and agrees to it once, out of band
// of any agent turn, and the agreement is bound to a hash of the fields that
// decide what runs. Change one of those fields and it asks again.
//
// config:rows — what is in the file now, and what is on record for each row.
//   Reads two files. Starts nothing. This is what the list is drawn from.
//
// config:confirm — record that a person agreed to one row. It carries back the
//   hash the sheet was drawn from and the lines that were on it, and main
//   refuses if the row moved while the sheet was open, which is the guard
//   `executeSkillsPlan` already applies to a command line that changed after it
//   was shown. NOTHING IS SPAWNED BY THIS CHANNEL. It writes one record.
//
// config:forget — withdraw an agreement, so the row asks again.
//
// There is deliberately no channel that launches a configured row, and no
// channel that reloads the file and then does something. Launching goes through
// the ordinary session create path, which calls the gate in main.
//
// MAIN: src/main/config/ipc.ts, the one `config:*` registrar.
// ---------------------------------------------------------------------------

/** One row of the configuration file, as the list draws it. */
export interface ConfigRowView {
  /** The agent id the row supplies or patches. */
  id: string;
  /** The row's display name, or the id when it has none. */
  displayName: string;
  /**
   * 'confirmed' may launch. 'never' and 'changed' may not. 'unknown' means the
   * OS keystore could not be read yet, so the answer is not known and the row
   * is refused until it is.
   */
  state: 'confirmed' | 'never' | 'changed' | 'unknown';
  /** The hash of the execution bearing fields as the file has them now. */
  hash: string;
  /** The hash on record. Null when nothing is. */
  confirmedHash: string | null;
  confirmedAt: number | null;
  /** The lines the person read when they agreed. Empty when they never did. */
  confirmedLines: string[];
  /** The lines this row would show now. */
  lines: string[];
  /** One sentence saying why it cannot launch. Null when it can. */
  refusal: string | null;
  /** The sentence the confirm sheet must show. */
  warning: string;
}

/** Everything the configuration list needs in one read. */
export interface ConfigRowsResult {
  rows: ConfigRowView[];
  /**
   * Rows that were dropped whole because a field did not validate, each naming
   * the field and the reason. Never a partial merge and never a silent drop.
   */
  errors: { id: string; field: string; reason: string }[];
  /** Absolute path of the configuration directory, for the reveal affordance. */
  directory: string;
}

/** What the renderer sends back when a person presses the confirm button. */
export interface ConfigConfirmInput {
  id: string;
  /** The hash the sheet was drawn from. Main refuses a stale one. */
  hashRead: string;
  /** The lines that were on the sheet. Recorded verbatim. */
  linesRead: string[];
}

export interface ConfigInvokeChannelMap {
  'config:rows': { req: []; res: ConfigRowsResult };
  'config:confirm': { req: [input: ConfigConfirmInput]; res: ConfigRowView };
  'config:forget': { req: [id: string]; res: ConfigRowView };
}

/**
 * Extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 *
 * A build without it shows no configuration list, which is the ordinary case:
 * almost nobody has a configuration file, and the twelve compiled agents work
 * with none present.
 */
export interface GmuxConfigExtras {
  config: {
    rows(): Promise<ConfigRowsResult>;
    confirm(input: ConfigConfirmInput): Promise<ConfigRowView>;
    forget(id: string): Promise<ConfigRowView>;
  };
}
