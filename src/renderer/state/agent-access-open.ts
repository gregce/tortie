/**
 * Phase 359, Builder C2 — the renderer's arrival for one agent-access open.
 *
 * WHAT THIS MODULE OWNS. `handleAgentAccessOpen`: the one typed subscription
 * to the agent-access open event, called once from the lifecycle owner
 * (`subscriptions.ts`). For each event:
 *   1. look the exact project id up in `useApp.getState().projects`;
 *   2. when it differs from the active project, call the existing
 *      `setActiveProject` — and nothing else — before emitting;
 *   3. emit the canonical `OpenFileRequest` on the renderer-internal
 *      `gmux:open-file` bus with `mode: 'file'`, `source: 'quickopen'`,
 *      `preview: false`, the validated paths, the computed selection, and
 *      the event's `focus` carried as `OpenFileRequest.focus`;
 *   4. invoke `agent-access:openComplete` with the echoed `requestId` and
 *      the outcome. `project-missing` when the project id is not in the
 *      list, `failed` when the send throws, `accepted` otherwise.
 *
 * WHAT IT DOES NOT DO. Compose a second request shape, reach the editor
 * store, decide policy, or hold state between events: this is arrival, not
 * policy.
 */

import type { StoreApi } from 'zustand';
// No `InstalledGmuxApi` import here: the arrival reads the one assembled
// member structurally, so NO source text reaches for the whole installed
// surface and no extra contract key is recorded.
interface AgentAccessSurface {
  onOpen(cb: (input: AgentAccessRendererOpen) => void): () => void;
  complete(input: AgentAccessOpenCompletion): Promise<void>;
}
import type {
  AgentAccessRendererOpen,
  AgentAccessOpenCompletion
} from '@shared/ipc/agent-access';

import type { AppState } from './app-state';
import { requestOpenFile } from './open-file';
import { gmuxBridge } from '../bridge';

type AppStore = StoreApi<AppState>;

/** Read the one assembled member structurally: no whole-bridge import. */
function agentAccessOf(
  gmux: { agentAccess?: unknown } | undefined
): AgentAccessSurface | undefined {
  const surface = (gmux as unknown as { agentAccess?: unknown } | undefined)
    ?.agentAccess;
  if (surface === null || typeof surface !== 'object') return undefined;
  const { onOpen, complete } = surface as Partial<AgentAccessSurface>;
  if (typeof onOpen !== 'function' || typeof complete !== 'function') {
    return undefined;
  }
  return { onOpen, complete } as AgentAccessSurface;
}

function appStateOf(store: AppStore): AppState {
  return store.getState();
}

/**
 * Handle one agent-access open event. Exported for the lifecycle owner and
 * for tests; subscribing twice would double-emit, so the owner calls
 * `subscribeAgentAccessOpen` once.
 */
export async function handleAgentAccessOpen(
  store: AppStore,
  input: AgentAccessRendererOpen
): Promise<void> {
  const gmux = gmuxBridge();
  const state = appStateOf(store);
  const project = state.projects.find((one) => one.id === input.projectId);
  const complete = async (
    outcome: AgentAccessOpenCompletion['outcome']
  ): Promise<void> => {
    try {
      const surface = agentAccessOf(gmux);
      await surface?.complete({ requestId: input.requestId, outcome });
    } catch {
      /* a completion that cannot be sent is the completion lost, not a tab */
    }
  };
  if (project === undefined) {
    await complete('project-missing');
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
  try {
    requestOpenFile({
      repoPath: input.request.repoPath,
      relPath: input.request.relPath,
      path: input.request.path,
      mode: 'file',
      source: 'quickopen',
      preview: false,
      focus: input.focus,
      selection: {
        line: input.request.selection.line,
        column: input.request.selection.column,
        endLine: input.request.selection.endLine,
        endColumn: input.request.selection.endColumn,
        highlight: true
      }
    });
  } catch {
    await complete('failed');
    return;
  }
  await complete('accepted');
}

/**
 * Subscribe once to the typed open event. Returns the unsubscribe function;
 * the lifecycle owner keeps it with the other bridge handlers.
 */
export function subscribeAgentAccessOpen(store: AppStore): () => void {
  const gmux = gmuxBridge();
  const surface = agentAccessOf(gmux);
  if (surface === undefined) {
    return () => undefined;
  }
  return surface.onOpen((input: AgentAccessRendererOpen) => {
    void handleAgentAccessOpen(store, input);
  });
}
