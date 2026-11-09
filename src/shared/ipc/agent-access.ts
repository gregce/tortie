/**
 * Phase 359 — the agent-access renderer handoff contract (Builder C2).
 *
 * ONE module owns the two names a validated socket `open` needs to reach
 * the ready main renderer and hear back: the typed event
 * `agent-access:open` (main → renderer) and the invoke
 * `agent-access:openComplete` (renderer → main). The integrator folds this
 * domain once into `GmuxInvokeChannelMap`, `AllEventPayloadMap` and
 * `InstalledGmuxApi`; `src/preload/agent-access.ts` implements the two
 * typed functions through the existing `on`/`invoke`.
 */

import type { Unsubscribe } from './base';

/**
 * WHERE the open lands, in the renderer's coordinate contract (see
 * `src/renderer/state/open-file.ts`): lines 1-based, columns 0-based
 * UTF-16, `endColumn` exclusive. Re-spelled here, never imported, because
 * shared compiles into main, which may not name the renderer layer.
 */
export interface AgentAccessOpenSelection {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  highlight?: boolean;
}

/**
 * The canonical request composed at the arrival site. Kept structural (not
 * imported from the renderer) because shared compiles into main, which may
 * not name the renderer layer.
 */
export interface AgentAccessOpenFileRequest {
  repoPath: string;
  relPath: string;
  path: string;
  mode: 'diff' | 'file';
  source: 'quickopen';
  preview: false;
  selection: AgentAccessOpenSelection;
}

/**
 * The one request id shape. Main mints it, the renderer echoes it, and the
 * broker accepts it only from the exact `webContents` sent the event.
 */
export type AgentAccessOpenRequestId = string;

/**
 * What main asks the ready main renderer to do: switch to the containing
 * project, then emit the canonical `gmux:open-file` request below with
 * `mode: 'file'`, `source: 'quickopen'`, `preview: false` and the validated
 * paths/selection.
 */
export interface AgentAccessRendererOpen {
  /** Broker-minted id the renderer echoes in its completion. */
  requestId: AgentAccessOpenRequestId;
  /** The validated absolute path of the file. */
  path: string;
  /** The path relative to the project root, when the project holds it. */
  relPath: string;
  /** Absolute path of the containing project root. */
  repoPath: string;
  /** Id of the containing project row in the renderer's list. */
  projectId: string;
  /**
   * The canonical request, minus the focus predicate (kept separate so the
   * editor rule reads one field rather than a composed fragment).
   */
  request: AgentAccessOpenFileRequest;
  /**
   * Whether main believes the editor may take keyboard focus. True only
   * when the window was already focused AND the target project is the
   * caller's project. Cross-project/background opens carry false and never
   * steal a terminal's focus or activate Tortie.
   */
  focus: boolean;
}

/**
 * The renderer's single arrival receipt. `accepted` means the canonical
 * editor open was accepted, not that Monaco finished every asynchronous
 * file/model read.
 */
export interface AgentAccessOpenCompletion {
  /** The `requestId` the renderer is answering. */
  requestId: AgentAccessOpenRequestId;
  /** What the arrival did with the request. */
  outcome: 'accepted' | 'project-missing' | 'failed';
}

/**
 * PHASE 362. ONE navigation handoff for the two acting operations the
 * renderer owns, because the project's tab, the selected session and the
 * keyboard are the renderer's to move: `project` puts a project's tab in
 * front, `focus` does that and then lands on a session with its terminal
 * holding the keyboard.
 */
export interface AgentAccessRendererNav {
  /** Broker-minted id the renderer echoes in its completion. */
  requestId: AgentAccessOpenRequestId;
  kind: 'project' | 'focus';
  /** The project row's id in the renderer's own list. */
  projectId: string;
  /** The session to land on, for `focus` with a session. */
  sessionId?: string;
  /**
   * True only when the caller asked to FOCUS, which is the one case where
   * Tortie may raise and focus its own window. A `project` arrival never does.
   */
  raise: boolean;
}

/** The renderer's one receipt for a navigation. */
export interface AgentAccessNavCompletion {
  requestId: AgentAccessOpenRequestId;
  outcome: 'accepted' | 'project-missing' | 'session-missing' | 'failed';
}

/** The typed main→renderer event channel owned by this domain. */
export const EVT_AGENT_ACCESS_OPEN = 'agent-access:open' as const;

/** PHASE 362. The typed main→renderer navigation channel. */
export const EVT_AGENT_ACCESS_NAV = 'agent-access:navigate' as const;

/** Static event payload for `agent-access:open`. */
export interface AgentAccessOpenEventPayloadMap {
  'agent-access:open': [input: AgentAccessRendererOpen];
  'agent-access:navigate': [input: AgentAccessRendererNav];
}

/** Invoke map entry for the renderer→main completion. */
export interface AgentAccessInvokeChannelMap {
  /**
   * The renderer's arrival receipt for one open event. Main resolves only
   * receipts from the exact `webContents` sent the event and only for a
   * pending id; a five-second timeout, a destroyed renderer, a wrong sender,
   * or a non-accepted outcome maps to `renderer-unavailable`.
   */
  'agent-access:openComplete': {
    req: [input: AgentAccessOpenCompletion];
    res: void;
  };
  /**
   * PHASE 362. The renderer's receipt for one navigation. Same acceptance
   * rule: only the exact `webContents` sent the event, only for a pending id.
   */
  'agent-access:navComplete': {
    req: [input: AgentAccessNavCompletion];
    res: void;
  };
}

/** The `agentAccess` member of the installed bridge. */
export interface GmuxAgentAccessExtras {
  agentAccess: {
    onOpen(cb: (input: AgentAccessRendererOpen) => void): Unsubscribe;
    complete(input: AgentAccessOpenCompletion): Promise<void>;
    /** PHASE 362. The navigation event, and its receipt. */
    onNavigate(cb: (input: AgentAccessRendererNav) => void): Unsubscribe;
    completeNav(input: AgentAccessNavCompletion): Promise<void>;
  };
}
