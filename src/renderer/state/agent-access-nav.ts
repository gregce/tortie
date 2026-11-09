/**
 * PHASE 362 — the renderer's arrival for one agent-access navigation.
 *
 * WHAT THIS MODULE OWNS. `handleAgentAccessNav`: the one typed subscription to
 * the agent-access navigation event, called once from the lifecycle owner
 * (`subscriptions.ts`). For each event:
 *   1. look the exact project id up in `useApp.getState().projects`; a missing
 *      one completes `project-missing` and moves nothing;
 *   2. `project`: select that project's tab through the existing
 *      `setActiveProject` when it differs, and complete `accepted`;
 *   3. `focus` with a session: call the EXISTING `jumpToSession`, which
 *      switches the tab, selects the session and hands its terminal the
 *      keyboard — this module never re-implements that ordering;
 *   4. `focus` with no session: select the project's tab and complete
 *      `accepted`.
 *
 * WHAT IT DOES NOT DO. Compose a second navigation rule, raise or focus the
 * window (main does that, and only for an explicit focus), create a session,
 * rename one, or end one. This is arrival, not policy.
 */

import type { StoreApi } from 'zustand';
import type {
  AgentAccessNavCompletion,
  AgentAccessRendererNav
} from '@shared/ipc/agent-access';

import type { AppState } from './app-state';
import { shellOps } from './shell-ops';
import { gmuxBridge } from '../bridge';

type AppStore = StoreApi<AppState>;

/** The bridge members this arrival needs, read structurally. */
interface AgentAccessNavSurface {
  onNavigate(cb: (input: AgentAccessRendererNav) => void): () => void;
  completeNav(input: AgentAccessNavCompletion): Promise<void>;
}

function agentAccessOf(
  gmux: { agentAccess?: unknown } | undefined
): AgentAccessNavSurface | undefined {
  const surface = (gmux as unknown as { agentAccess?: unknown } | undefined)
    ?.agentAccess;
  if (surface === null || typeof surface !== 'object') return undefined;
  const { onNavigate, completeNav } = surface as Partial<AgentAccessNavSurface>;
  if (typeof onNavigate !== 'function' || typeof completeNav !== 'function') {
    return undefined;
  }
  return surface as AgentAccessNavSurface;
}

/** Handle one navigation event. Exported for the lifecycle owner and tests. */
export async function handleAgentAccessNav(
  store: AppStore,
  input: AgentAccessRendererNav
): Promise<void> {
  const surface = agentAccessOf(gmuxBridge());
  const complete = async (
    outcome: AgentAccessNavCompletion['outcome']
  ): Promise<void> => {
    try {
      await surface?.completeNav({ requestId: input.requestId, outcome });
    } catch {
      /* a completion that cannot be sent is the completion lost, not a tab */
    }
  };
  let state = store.getState();
  let project = state.projects.find((one) => one.id === input.projectId);
  if (project === undefined) {
    // A project main just added is not in this window's list yet.
    try {
      const projects = await gmuxBridge()?.projects.list();
      if (projects !== undefined) store.setState({ projects });
    } catch {
      /* fall through to project-missing */
    }
    state = store.getState();
    project = state.projects.find((one) => one.id === input.projectId);
  }
  if (project === undefined) {
    await complete('project-missing');
    return;
  }
  if (input.kind === 'focus' && input.sessionId !== undefined) {
    const result = await shellOps().jumpToSession(input.sessionId);
    await complete(result.ok ? 'accepted' : 'session-missing');
    return;
  }
  if (state.activeProjectId !== project.id) {
    try {
      state.setActiveProject(project.id);
    } catch {
      await complete('failed');
      return;
    }
  }
  await complete('accepted');
}

/** Subscribe once to the typed navigation event. */
export function subscribeAgentAccessNav(store: AppStore): () => void {
  const surface = agentAccessOf(gmuxBridge());
  if (surface === undefined) return () => undefined;
  return surface.onNavigate((input: AgentAccessRendererNav) => {
    void handleAgentAccessNav(store, input);
  });
}
