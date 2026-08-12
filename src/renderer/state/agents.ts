/**
 * Agent CLI availability (Phase 8 — §6.5 / DESIGN-SPEC S6).
 *
 * Main probes for the agent CLIs once per boot (agents:availability); this
 * module caches the answer for the renderer's lifetime and exposes it as a
 * hook. Feature-detected: an older preload without the bridge method (or a
 * failed probe) resolves OPTIMISTIC — the UI never blocks creation on an
 * unknown answer, it only disables agents main POSITIVELY reported missing.
 */

import { useEffect, useState } from 'react';
import type { AgentAvailability, GmuxAgentExtras } from '@shared/ipc';
import type {
  AgentsScanResult,
  LaunchableAgentKind
} from '@shared/types';

/** Install commands surfaced next to a disabled agent option. */
export const AGENT_INSTALL_COMMANDS: Record<'claude' | 'codex', string> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex'
};

const OPTIMISTIC: AgentAvailability = { claude: true, codex: true };

let cached: AgentAvailability | null = null;
let inflight: Promise<AgentAvailability> | null = null;

function agentExtras(): GmuxAgentExtras {
  return (window.gmux ?? {}) as unknown as GmuxAgentExtras;
}

export function fetchAgentAvailability(): Promise<AgentAvailability> {
  if (cached !== null) return Promise.resolve(cached);
  if (inflight !== null) return inflight;
  const probe = agentExtras().agentAvailability;
  if (typeof probe !== 'function') {
    cached = OPTIMISTIC;
    return Promise.resolve(cached);
  }
  inflight = probe()
    .then((res) => {
      cached = res;
      return res;
    })
    .catch(() => {
      // A failed probe must never block session creation.
      cached = OPTIMISTIC;
      return OPTIMISTIC;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Current availability; starts optimistic and settles once probed. */
export function useAgentAvailability(): AgentAvailability {
  const [avail, setAvail] = useState<AgentAvailability>(cached ?? OPTIMISTIC);
  useEffect(() => {
    let alive = true;
    void fetchAgentAvailability().then((res) => {
      if (alive) setAvail(res);
    });
    return () => {
      alive = false;
    };
  }, []);
  return avail;
}

// ---------------------------------------------------------------------------
// APPENDED — Phase 10 (create-modal stream): the ⌘T agent-picker helpers.
//
// The agents:list scan itself lives in the shared settings store
// (src/renderer/settings/settings-store.ts — one truth for the Settings
// window AND the main window); these are the PURE helpers that turn a scan
// (or its absence) into picker options. Same doctrine as availability:
// OPTIMISTIC — only a POSITIVE "not installed" answer disables an agent chip
// (create-time AGENT_NOT_FOUND stays the friendly backstop).
// ---------------------------------------------------------------------------

/** One ⌘T agent-picker option (chip grid, DESIGN-SPEC S6 round 2). */
export interface AgentPickerOption {
  id: LaunchableAgentKind;
  /** Short chip label (S6 sketch vocabulary, not the long registry name). */
  label: string;
  /** AgentIcon key (unknown keys render the terminal-glyph fallback). */
  iconKey: string;
  /** False only when detection POSITIVELY reported the CLI missing. */
  installed: boolean;
  /** Registry marks the mechanics unverified upstream (pi). */
  unverified: boolean;
}

/**
 * Static mirror of the launchable registry (src/main/agents/registry.ts) in
 * registry order — the picker's shape when the scan hasn't settled, and the
 * short-label map when it has. Shell is appended by buildAgentOptions.
 */
const LAUNCHABLE_OPTIONS: readonly {
  id: LaunchableAgentKind;
  label: string;
}[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'codex', label: 'Codex' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'droid', label: 'Droid' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'antigravity', label: 'Antigravity' },
  { id: 'muse', label: 'Muse' },
  { id: 'qwen', label: 'Qwen' },
  { id: 'pi', label: 'Pi' }
];

const SHORT_LABELS: Record<string, string> = Object.fromEntries(
  LAUNCHABLE_OPTIONS.map((o) => [o.id, o.label])
);

/**
 * The registry's short display label for an agent id ("pi" → "Pi"), for copy
 * that puts the agent's name in a sentence. Unknown ids pass through, so a
 * newly registered agent reads as itself rather than disappearing.
 */
export function agentShortLabel(id: string): string {
  return SHORT_LABELS[id] ?? (id === 'shell' ? 'Shell' : id);
}

/**
 * The ⌘T picker options: every launchable agent (scan-driven when available,
 * static registry mirror otherwise) + Shell last. Installed is optimistic —
 * false only on a positive miss (scan row, or the Phase-8 probe for
 * claude/codex when no scan exists).
 */
export function buildAgentOptions(
  scan: AgentsScanResult | null,
  avail: AgentAvailability
): AgentPickerOption[] {
  const options: AgentPickerOption[] =
    scan !== null
      ? scan.agents
          .filter((a) => a.launchable)
          .map((a) => ({
            id: a.id as LaunchableAgentKind,
            label: SHORT_LABELS[a.id] ?? a.displayName,
            iconKey: a.iconKey,
            installed: a.installed,
            unverified: a.unverified
          }))
      : LAUNCHABLE_OPTIONS.map(({ id, label }) => ({
          id,
          label,
          iconKey: id,
          installed:
            id === 'claude' || id === 'codex' ? avail[id] : true,
          unverified: id === 'pi'
        }));
  options.push({
    id: 'shell',
    label: 'Shell',
    iconKey: 'shell',
    installed: true,
    unverified: false
  });
  return options;
}

/**
 * Default ⌘T selection: the Settings default agent (GmuxSettings.defaultAgent,
 * 'claude' when Settings hasn't answered) when installed → claude → first
 * installed launchable in registry order → shell. Explicit, never
 * alphabetical (research 11 rule 8).
 */
export function defaultAgentChoice(
  options: readonly AgentPickerOption[],
  preferredId: string
): LaunchableAgentKind {
  const installed = (id: string): AgentPickerOption | undefined =>
    options.find((o) => o.id === id && o.installed);
  const preferred = installed(preferredId) ?? installed('claude');
  if (preferred !== undefined) return preferred.id;
  return options.find((o) => o.installed)?.id ?? 'shell';
}
