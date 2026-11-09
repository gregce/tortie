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
  AGENT_ACCESS_MAX_LISTED_ROWS,
  AGENT_ACCESS_MAX_SESSION_ROWS,
  AGENT_ACCESS_MAX_SUMMARY_CHARS,
  AGENT_ACCESS_OPERATIONS,
  AGENT_ACCESS_PROTOCOL,
  isAgentAccessFinishedStatus,
  type AgentAccessActivityDoing,
  type AgentAccessActivityRow,
  type AgentAccessActivityValue,
  type AgentAccessCapabilitiesValue,
  type AgentAccessMachineView,
  type AgentAccessProjectView,
  type AgentAccessSessionsValue,
  type AgentAccessSessionView,
  type AgentAccessSummariesValue,
  type AgentAccessSummaryRow,
  type AgentAccessWhoAmIValue
} from '@shared/agent-access';
import type { Project, Session, SessionStatus } from '@shared/types';
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
 * PHASE 362. The project filter: one extra member on the list reads.
 * Undefined means every row. A KNOWN project id keeps only rows in that
 * project (matching the project's row for the session, by id). An UNKNOWN id
 * answers the empty list, never an error: the agent asked about a folder
 * Tortie does not know, and there is nothing to act on in it.
 */
export function filterSessionsByProjectId(
  views: AgentAccessSessionView[],
  projectId: string | undefined
): AgentAccessSessionView[] {
  if (projectId === undefined) return views;
  return views.filter((view) => view.project !== null && view.project.id === projectId);
}

/**
 * The newest-first bounded list, or null when the caller is not a currently
 * listed local session. Local and remote rows are all projected; only the
 * CALLER must be local. `omitted` is the exact count the cap cut, never a
 * guess.
 */
export function buildAgentAccessSessions(
  sources: AgentAccessFactSources,
  callerId: string,
  projectId?: string
): AgentAccessSessionsValue | null {
  if (findLocalCaller(sources.sessions, callerId) === null) return null;
  const rows = filterSessionsByProjectId(
    sources.sessions
      .map((session) => toAgentAccessSessionView(session, sources.projects))
      .sort(compareAgentAccessSessions),
    projectId
  );
  const kept = rows.slice(0, AGENT_ACCESS_MAX_SESSION_ROWS);
  return { sessions: kept, omitted: rows.length - kept.length };
}

/**
 * PHASE 362. `activity`: what every listed session is doing, in the words a
 * person would use, with the blocked ones first because they are the ones a
 * person must act on.
 *
 * The word is DERIVED from the session's own status and never written back:
 * this operation is a read, and a door that could set a status would be a
 * second owner of the most important word in the product.
 */
export function buildAgentAccessActivity(
  sources: AgentAccessFactSources,
  callerId: string,
  projectId?: string
): AgentAccessActivityValue | null {
  if (findLocalCaller(sources.sessions, callerId) === null) return null;
  const counts = { working: 0, idle: 0, waiting: 0, finished: 0 };
  const rows: AgentAccessActivityRow[] = [];
  for (const session of filterSessionsByProjectId(
    sources.sessions.map((one) => toAgentAccessSessionView(one, sources.projects)),
    projectId
  )) {
    const view = session;
    const doing = doingOf(liveStatusOf(sources.sessions, session.id));
    if (doing === 'working') counts.working += 1;
    else if (doing === 'idle') counts.idle += 1;
    else if (doing === 'waiting') counts.waiting += 1;
    else if (doing === 'finished') counts.finished += 1;
    rows.push({ ...view, doing });
  }
  rows.sort((a, b) => {
    const rank = activityRank(a.doing) - activityRank(b.doing);
    if (rank !== 0) return rank;
    return compareAgentAccessSessions(a, b);
  });
  const kept = rows.slice(0, AGENT_ACCESS_MAX_LISTED_ROWS);
  return {
    counts,
    waiting: kept.filter((row) => row.doing === 'waiting'),
    sessions: kept,
    omitted: rows.length - kept.length
  };
}

/** The status of the live row a projected view came from, by id. Never the view's own. */
function liveStatusOf(sessions: Session[], id: string): SessionStatus {
  const row = sessions.find((one) => one.id === id);
  return row === undefined ? 'unknown' : row.status;
}

/** Waiting first: a blocked session outranks anything merely running. */
function activityRank(doing: AgentAccessActivityDoing): number {
  if (doing === 'waiting') return 0;
  if (doing === 'working') return 1;
  if (doing === 'idle') return 2;
  if (doing === 'finished') return 3;
  return 4;
}

/**
 * The one place a status becomes an activity word.
 *
 * `needs_input` is the only status this door ever calls `waiting`, which is
 * the fact a person most needs from an agent that is summarising the board.
 * `unknown` is `other` rather than `finished`: a session Tortie could not
 * reach is not a session that is over.
 */
export function doingOf(status: SessionStatus): AgentAccessActivityDoing {
  switch (status) {
    case 'running':
      return 'working';
    case 'needs_input':
      return 'waiting';
    case 'idle':
      return 'idle';
    case 'exited':
    case 'restorable':
    case 'discarded':
      return 'finished';
    default:
      return 'other';
  }
}

/**
 * PHASE 362. `summaries`: the sentence Tortie already wrote for a session, or
 * the honest absence of one.
 *
 * The reader is INJECTED (`readSummary`) so this module never opens the
 * overview store, never starts a fold and never spends a token. A summary is
 * carried only when the store says the row was KEPT: a refused row is a
 * refusal the page itself does not draw, so the door does not carry it either.
 */
export function buildAgentAccessSummaries(
  sources: AgentAccessFactSources,
  callerId: string,
  wanted: readonly string[] | null,
  projectId: string | undefined,
  readSummary: (sessionId: string) => AgentAccessStoredSummary | null
): AgentAccessSummariesValue | null {
  if (findLocalCaller(sources.sessions, callerId) === null) return null;
  const views = filterSessionsByProjectId(
    sources.sessions.map((session) => toAgentAccessSessionView(session, sources.projects)),
    projectId
  );
  const listed = views
    .map((view) => view.id)
    .filter((id) => wanted === null || wanted.includes(id));
  const rows: AgentAccessSummaryRow[] = [];
  for (const sessionId of listed.slice(0, AGENT_ACCESS_MAX_LISTED_ROWS)) {
    const stored = readSummary(sessionId);
    // The page's own rule (`writtenLineFor`): the NEWEST stored row is read,
    // whatever its verdict, and a refused newest row is a refusal the page
    // does not draw — never skipped over for an older kept one. The seam
    // answers a refused newest row as `verdict: 'refused'` with no text.
    if (stored === null || stored.text === null || stored.kept === false) {
      rows.push({ sessionId, state: 'none' });
      continue;
    }
    rows.push({
      sessionId,
      state: 'kept',
      text:
        stored.text.length > AGENT_ACCESS_MAX_SUMMARY_CHARS
          ? stored.text.slice(0, AGENT_ACCESS_MAX_SUMMARY_CHARS)
          : stored.text,
      fromTurn: stored.fromTurn,
      toTurn: stored.toTurn,
      writtenAt: stored.writtenAt,
      staleTurns: Math.max(0, stored.newestTurn - stored.toTurn)
    });
  }
  return { summaries: rows, omitted: Math.max(0, listed.length - rows.length) };
}

/**
 * PHASE 362, corrected per the operator's ruling. The store holds rows with
 * verdicts; the door carries a KEPT sentence and nothing else. `kept` is
 * false exactly when the newest stored row is refused or failed, which is
 * why a session with an older kept sentence AND a newer refusal answers
 * `none`: the refusal is the news, and an old sentence would mislead.
 *
 * `newestTurn` is the newest STORED turn's index (the tail of `listTurns`),
 * never `COUNT(*)`: a turn in flight counts, like the page says.
 */
export interface AgentAccessStoredSummary {
  text: string | null;
  /** True only when the newest stored row is kept and `text` is its sentence. */
  kept: boolean;
  fromTurn: number;
  toTurn: number;
  writtenAt: number;
  /** The newest stored turn's index, so `staleTurns` is derived here. */
  newestTurn: number;
}
