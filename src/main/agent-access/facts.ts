/**
 * Phase 359, Builder C1 — curated session/capability facts for the private
 * agent-access socket.
 *
 * WHAT THIS FILE OWNS. The projection from Tortie's live session list to the
 * closed {@link AgentAccessSessionView} rows the socket may answer, plus the
 * `capabilities` value and the caller-eligibility rule. It reads facts and
 * returns values; it opens nothing, listens on nothing, logs nothing, and
 * decides no filesystem or UI policy.
 *
 * WHAT IT NEVER EXPOSES. Manifest records, argv, resume argv, capture
 * records, environment, conversation ids, terminal bytes, login names, or
 * paths outside the project/session projection. A second field here is a
 * product decision, not a tidy-up.
 *
 * LOCAL means `session.machine === undefined`. A row whose machine was
 * removed is drawn by `listSessions` without a machine only when Tortie
 * re-homed it; whatever `listSessions` answers is what this file projects.
 */

import {
  AGENT_ACCESS_DELIVERY_AGENTS,
  AGENT_ACCESS_MAX_SESSION_ROWS,
  AGENT_ACCESS_OPERATIONS,
  AGENT_ACCESS_PROTOCOL,
  isAgentAccessFinishedStatus,
  type AgentAccessCapabilitiesValue,
  type AgentAccessMachineView,
  type AgentAccessProjectView,
  type AgentAccessSessionsValue,
  type AgentAccessSessionView,
  type AgentAccessWhoAmIValue
} from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';

/** The live rows facts are projected from, plus the project rows that name them. */
export interface AgentAccessFactSources {
  sessions: Session[];
  projects: Project[];
}

/**
 * The caller behind a claimed id, or null.
 *
 * Eligible exactly when the id names a currently listed session that runs on
 * this Mac. A fake id, a gone id, and a session on another machine all read
 * null, and the transport answers `unavailable` for every operation. The id
 * is same-user claimed, never a token; the operations that survive this check
 * are read-only or show-only.
 */
export function findLocalCaller(
  sessions: Session[],
  callerId: string
): Session | null {
  const row = sessions.find((one) => one.id === callerId);
  if (row === undefined) return null;
  if (row.machine !== undefined) return null;
  return row;
}

/** The machine projection: `local` for this Mac, the row's own id/label otherwise. */
export function toAgentAccessMachineView(
  session: Session
): AgentAccessMachineView {
  const machine = session.machine;
  if (machine === undefined) return { id: LOCAL_MACHINE_ID, label: 'This Mac' };
  return { id: machine.id, label: machine.label };
}

/**
 * The project projection, or null when no open project row names the
 * session's folder.
 *
 * A local session matches a local project row only, and a session on another
 * machine matches a project row on that same machine only: the same absolute
 * path on two computers is two folders, so a bare path match across machines
 * would name the wrong computer's tab.
 */
export function toAgentAccessProjectView(
  session: Session,
  projects: Project[]
): AgentAccessProjectView | null {
  const wantMachine = session.machine?.id ?? LOCAL_MACHINE_ID;
  const row = projects.find(
    (one) =>
      one.path === session.projectPath &&
      (one.machineId ?? LOCAL_MACHINE_ID) === wantMachine
  );
  if (row === undefined) return null;
  return { id: row.id, name: row.name, path: row.path };
}

/** One curated row. Never argv, environment, capture, or conversation ids. */
export function toAgentAccessSessionView(
  session: Session,
  projects: Project[]
): AgentAccessSessionView {
  return {
    id: session.id,
    name: session.name,
    agent: session.agent,
    status: session.status,
    phase: isAgentAccessFinishedStatus(session.status) ? 'finished' : 'active',
    createdAt: session.createdAt,
    project: toAgentAccessProjectView(session, projects),
    machine: toAgentAccessMachineView(session)
  };
}

/** Newest first by creation clock, ties by id ascending. */
export function compareAgentAccessSessions(
  a: AgentAccessSessionView,
  b: AgentAccessSessionView
): number {
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** What this door is and what it answers. Answered only while enabled. */
export function buildAgentAccessCapabilities(
  tortieVersion: string
): AgentAccessCapabilitiesValue {
  return {
    protocol: AGENT_ACCESS_PROTOCOL,
    tortieVersion,
    enabled: true,
    operations: [...AGENT_ACCESS_OPERATIONS],
    deliveredTo: [...AGENT_ACCESS_DELIVERY_AGENTS]
  };
}

/**
 * The caller's own curated row, or null when the caller is not a currently
 * listed local session. Null reads as transport `unavailable`.
 */
export function buildAgentAccessWhoAmI(
  sources: AgentAccessFactSources,
  callerId: string
): AgentAccessWhoAmIValue | null {
  const caller = findLocalCaller(sources.sessions, callerId);
  if (caller === null) return null;
  return { session: toAgentAccessSessionView(caller, sources.projects) };
}

/**
 * The newest-first bounded list, or null when the caller is not a currently
 * listed local session. Local and remote rows are all projected; only the
 * CALLER must be local. `omitted` is the exact count the cap cut, never a
 * guess.
 */
export function buildAgentAccessSessions(
  sources: AgentAccessFactSources,
  callerId: string
): AgentAccessSessionsValue | null {
  if (findLocalCaller(sources.sessions, callerId) === null) return null;
  const rows = sources.sessions
    .map((session) => toAgentAccessSessionView(session, sources.projects))
    .sort(compareAgentAccessSessions);
  const kept = rows.slice(0, AGENT_ACCESS_MAX_SESSION_ROWS);
  return { sessions: kept, omitted: rows.length - kept.length };
}
