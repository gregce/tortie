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
import type { AgentKind } from '@shared/types';

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

export function isAgentAvailable(
  avail: AgentAvailability,
  agent: AgentKind
): boolean {
  return agent === 'shell' ? true : avail[agent];
}

/** Best default agent for ⌘T: claude → codex → shell. */
export function firstAvailableAgent(avail: AgentAvailability): AgentKind {
  if (avail.claude) return 'claude';
  if (avail.codex) return 'codex';
  return 'shell';
}
