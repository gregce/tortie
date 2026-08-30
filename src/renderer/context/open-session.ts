/**
 * The way in to the session readout (research 29 §8.3).
 *
 * ## Why this file exists
 *
 * Phase 22 shipped the readout with no entry point. `enterSessionMode` and
 * `exitSessionMode` were declared, tested at unit level and wired through IPC,
 * and had zero call sites in the whole tree. The launch snapshot was written at
 * every launch and stored in its own manifest column, and no user could reach
 * it. `state/context-session.ts` even said in a comment that the readout "is
 * opened from the session context menu", which was not true of that tree.
 *
 * So the gesture lives here, in one function, and the session menu calls it.
 * Putting it in the context module rather than in `app/session-actions.tsx`
 * keeps the knowledge of what a readout needs — the sidebar view, the mode, the
 * agent filter and the session's name — in the module that owns the readout.
 *
 * ## What it does, in order
 *
 * 1. Show the Context view, which also un-hides the sidebar and drops out of
 *    editor fill, because `showSidebarView` is the app's one gesture for
 *    "reach for a view".
 * 2. Pin the store to that session, with the agent it was launched with
 *    preselected, so the readout answers about the agent that is running rather
 *    than about all ten.
 *
 * It does NOT fetch anything. `state/context-session.ts` reads the snapshot
 * when the mode turns on, once, and nothing here polls or subscribes (§8.4).
 */

import { useApp } from '../state/store';
import type { AgentRegistryId } from '@shared/types';
import { useContext } from './store';

/** Everything the readout needs off a session row. */
export interface ReadoutTarget {
  id: string;
  name: string;
  /** `shell` has no configuration to read, so it preselects no agent. */
  agent: string;
}

/**
 * Registry agents only. A session's `agent` is an `AgentKind`, which includes
 * `shell`, and a shell has no context block. Filtering to a registry id here is
 * what stops the band's selector being pinned to an agent the scan never read.
 */
const REGISTRY_AGENTS: ReadonlySet<string> = new Set<AgentRegistryId>([
  'claude',
  'cursor',
  'codex',
  'gemini',
  'droid',
  'deepseek',
  'antigravity',
  'muse',
  'qwen',
  'pi',
  'omp',
  'cursoride',
  'copilotide'
]);

/** Open the Context view pinned to one session's launch snapshot. */
export function openSessionContext(session: ReadoutTarget): void {
  const agentId = REGISTRY_AGENTS.has(session.agent) ? session.agent : null;
  useApp.getState().showSidebarView('context');
  useContext.getState().enterSessionMode(session.id, agentId, session.name);
}

/** Back to the plain list. The rows do not change; the marks come off. */
export function closeSessionContext(): void {
  useContext.getState().exitSessionMode();
}
