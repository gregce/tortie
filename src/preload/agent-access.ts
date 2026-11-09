/**
 * Phase 359, integrator assembly — the agent-access half of the preload
 * bridge.
 *
 * One subscription and one receipt, through the existing `on`/`invoke`
 * primitives in `./bridge`: `agent-access:open` (main → renderer) and
 * `agent-access:openComplete` (renderer → main). This file is the one
 * assembly the facade (`./index.ts`) exposes as `agentAccess`; no parallel
 * bridge generation.
 */

import type { GmuxAgentAccessExtras } from '../shared/ipc';
import {
  EVT_AGENT_ACCESS_NAV,
  EVT_AGENT_ACCESS_OPEN
} from '../shared/ipc/agent-access';
import { invoke, on } from './bridge';

export const agentAccess: GmuxAgentAccessExtras['agentAccess'] = {
  onOpen: (cb) => on(EVT_AGENT_ACCESS_OPEN, cb),
  complete: (input) => invoke('agent-access:openComplete', input),
  // PHASE 362. The navigation handoff: the project's tab, a session landing
  // and its keyboard are the renderer's to move.
  onNavigate: (cb) => on(EVT_AGENT_ACCESS_NAV, cb),
  completeNav: (input) => invoke('agent-access:navComplete', input)
};
