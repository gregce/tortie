/**
 * Vocabulary shared by the activity signal modules (Phase 13).
 *
 * Kept deliberately tiny: one enum every tier speaks, plus the projection
 * onto the frozen `SessionStatus` contract. Everything else lives with the
 * signal that owns it (pane facts in panes.ts, process facts in process.ts…).
 */

import type { SessionStatus } from '@shared/types';

/**
 * What a session is really doing, before it is projected onto the frozen
 * five-value `SessionStatus`.
 *
 *  - `starting`    pane exists, no tier has resolved yet (agent boot, and
 *                  claude's ≤35 s workspace-trust gate before it registers
 *                  its pid file). Reported as `running`.
 *  - `working`     turn in flight, tool running, or streaming.
 *  - `needs_input` blocked on the user.
 *  - `idle`        alive and quiet.
 */
export type ActivityState = 'starting' | 'working' | 'needs_input' | 'idle';

/** Projection onto the frozen contract (src/shared/types.ts). */
export function toSessionStatus(state: ActivityState): SessionStatus {
  switch (state) {
    case 'needs_input':
      return 'needs_input';
    case 'idle':
      return 'idle';
    default:
      return 'running';
  }
}

/**
 * Which channel produced a verdict. Tier 0 is agent-native truth and commits
 * instantly in both directions; tiers 1–3 are inferred and pass through the
 * hysteresis rules in monitor.ts.
 */
export type ActivityTier = 'native' | 'inferred';

export interface ActivityVerdict {
  state: ActivityState;
  tier: ActivityTier;
  /** Free text from the agent (claude's `waitingFor`) — diagnostics only. */
  reason?: string;
}
