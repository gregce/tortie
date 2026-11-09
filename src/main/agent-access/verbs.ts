/**
 * PHASE 362, Builder B3 — the acting half's adapters: four typed operations
 * over the app's ONE existing verb each.
 *
 * WHAT THIS FILE OWNS. `buildAgentAccessOpenProject`, `buildAgentAccessCreate`,
 * `buildAgentAccessRename` and `buildAgentAccessFocus`: each takes the injected
 * app seams listed in {@link AgentAccessVerbDeps}, validates nothing itself
 * beyond the answers closed reasons need, calls the existing verb exactly
 * once, and translates the outcome to the closed socket value. The dispatcher
 * owns the request shape; this file owns the answer.
 *
 * WHAT IT NEVER DOES. Compose argv, touch the manifest directly, invent a
 * confirmation, invent a refusal reason, or invent a project lookup: the deps
 * do that, and the deps are the app's own code. A name is refused only by
 * `sessionNameRefusal`, in its own order and its own words.
 */

import {
  AGENT_ACCESS_FINISHED_STATUSES,
  type AgentAccessActionRefusal,
  type AgentAccessCreateHandler,
  type AgentAccessFocusHandler,
  type AgentAccessOpenProjectHandler,
  type AgentAccessRenameHandler
} from '@shared/agent-access';
import type { Project, Session, SessionStatus } from '@shared/types';
import { toAgentAccessProjectView } from './facts';
import {
  DOOR_RENAME_GATE_ENV,
  sessionActionGates
} from '@shared/session-gates';
import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';
import { AGENT_REGISTRY } from '../agents/registry';
import { sessionNameRefusal } from '@shared/session-names';

/** The one navigation sink; the broker mints the request id. */
export type AgentAccessNavSend = (input: {
  kind: 'project' | 'focus';
  projectId: string;
  sessionId?: string;
  raise: boolean;
}) => Promise<'accepted' | 'project-missing' | 'session-missing' | 'failed'>;

/** What the verbs need from the app. Nothing here starts anything. */
export interface AgentAccessVerbDeps {
  /** The current switch. Re-checked before an End's native sheet. */
  isEnabled: () => boolean;
  /** The app's current session list. */
  listSessions: () => Promise<Session[]>;
  /** The app's current project rows. */
  listProjects: () => Promise<Project[]>;
  /** The app's one create path (main's `sessions:create` target). */
  createSession: (input: {
    projectPath: string;
    cwd?: string;
    agent: string;
    name: string;
  }) => Promise<Session>;
  /** The app's one rename verb, by id. */
  renameSession: (input: {
    sessionId: string;
    name: string;
  }) => Promise<Session>;
  /** The default agent for a create naming none: the compiled default row. */
  defaultAgentId: () => string;
  /**
   * Whether main believes an agent id is a compiled LAUNCHABLE row. Never a
   * version probe, never a launch: the create names the id and the real path
   * probes and launches, once, through its own rules.
   */
  isLaunchableAgent: (agent: string) => boolean;
}

/** The rows a verb reads facts through. Never a manifest record. */
interface VerbSources {
  sessions: Session[];
  projects: Project[];
}

async function verbSources(deps: {
  listSessions: () => Promise<Session[]>;
  listProjects: () => Promise<Project[]>;
}): Promise<VerbSources> {
  return {
    sessions: await deps.listSessions(),
    projects: await deps.listProjects()
  };
}

/** The finished set, read from the shared contract rather than re-spelled. */
function isFinishedView(status: SessionStatus): boolean {
  return (AGENT_ACCESS_FINISHED_STATUSES as readonly string[]).includes(status);
}

/**
 * PHASE 362. THE SHARED GATE, `canRename` under {@link DOOR_RENAME_GATE_ENV}:
 * the same one the Mac's own Rename and the phone's Rename ask, in the same
 * order. A row it refuses (a removed one) is `gone` here: there is nothing
 * left to rename, and saying so is honest.
 */
function renameGateRefusal(session: Session): AgentAccessActionRefusal | null {
  const gate = sessionActionGates(session, session.status, DOOR_RENAME_GATE_ENV);
  return gate.canRename ? null : 'gone';
}

/**
 * The plain word of a refusal the shared gate already reads: a row Tortie
 * cannot see (status `unknown`) is a row the door answers nothing about.
 */
function sessionOf(
  sources: VerbSources,
  target: string
): Session | undefined {
  return sources.sessions.find((one) => one.id === target);
}

/** The row answers only when it runs on this Mac, never past a remote one. */
function isRowLocal(session: Session): boolean {
  return session.machine === undefined;
}

/**
 * The refusal a row that is gone, remote, unreachable or removed answers,
 * and nothing else. Reading it, the row is not there, it is another Mac's, it
 * is one Tortie cannot see, or the shared Rename gate refuses it.
 */
function rowGateRefusal(session: Session | undefined):
  | AgentAccessActionRefusal
  | null {
  if (session === undefined) return 'session-missing';
  if (!isRowLocal(session)) return 'session-not-in-project';
  if (session.status === 'unknown') return 'gone';
  return renameGateRefusal(session);
}

/** The shared name rule, answered in the door's closed words. */
function nameGateRefusal(name: string): AgentAccessActionRefusal | null {
  const refused = sessionNameRefusal(name);
  if (refused === null) return null;
  return refused.reason;
}

/**
 * `open-project`: the project's tab in front. The adapter answers in terms of
 * the project's id in the RENDERER's list; if that id is not there, the
 * project is missing. This calls nothing but the deps the broker already
 * reaches — the integrator hands in the real send.
 */
export function buildAgentAccessOpenProject(
  send: AgentAccessNavSend,
  deps: {
    listProjects: () => Promise<Project[]>;
    /** The app's real add: stats the folder, dedupes, clears a closed tab. */
    addProject: (path: string) => Promise<Project>;
  }
): AgentAccessOpenProjectHandler {
  return async (invocation) => {
    let row: Project | undefined;
    if (invocation.path !== undefined) {
      if (!isAbsolute(invocation.path)) {
        return { state: 'refused', reason: 'project-missing' };
      }
      try {
        if (!statSync(invocation.path).isDirectory()) {
          return { state: 'refused', reason: 'project-missing' };
        }
        row = await deps.addProject(invocation.path);
      } catch {
        return { state: 'refused', reason: 'project-missing' };
      }
    } else {
      const projects = await deps.listProjects();
      row = projects.find((one) => one.id === invocation.projectId);
    }
    if (row === undefined || row.machineId !== undefined && row.machineId !== LOCAL_MACHINE_ID) {
      return { state: 'refused', reason: 'project-missing' };
    }
    const outcome = await send({
      kind: 'project',
      projectId: row.id,
      raise: false
    });
    if (outcome === 'accepted') {
      return {
        state: 'opened',
        project: { id: row.id, name: row.name, path: row.path }
      };
    }
    if (outcome === 'project-missing') {
      return { state: 'refused', reason: 'project-missing' };
    }
    return { state: 'refused', reason: 'renderer-unavailable' };
  };
}

/**
 * `create`: a NAMED session through the app's one create path. The name goes
 * through the one shared rule first (empty → long → character), then the
 * agent is read against the COMPILED registry's launchable rows, because a
 * configured row the registry never read is not a row the real path can
 * start.
 */
export function buildAgentAccessCreate(core: {
  listSessions: () => Promise<Session[]>;
  listProjects: () => Promise<Project[]>;
  createSession: AgentAccessVerbDeps['createSession'];
  defaultAgentId: AgentAccessVerbDeps['defaultAgentId'];
  isLaunchableAgent: AgentAccessVerbDeps['isLaunchableAgent'];
}): AgentAccessCreateHandler {
  return async (invocation) => {
    const refusedName = nameGateRefusal(invocation.name);
    if (refusedName !== null) {
      return { state: 'refused', reason: refusedName };
    }
    const sources = await verbSources(core);
    const project = sources.projects.find(
      (one) => one.id === invocation.projectId
    );
    if (
      project !== undefined &&
      project.machineId !== undefined &&
      project.machineId !== LOCAL_MACHINE_ID
    ) {
      return { state: 'refused', reason: 'project-missing' };
    }
    if (project === undefined) {
      // A project the caller names is exact; no fallback to another tab,
      // because a session made in the wrong folder is a session in the wrong
      // folder.
      return { state: 'refused', reason: 'project-missing' };
    }
    const agent =
      invocation.agent === null ? core.defaultAgentId() : invocation.agent;
    if (!core.isLaunchableAgent(agent)) {
      // `agent-unknown` when the registry holds no such row, and
      // `agent-not-launchable` when it holds a capture-only IDE row.
      const row = AGENT_REGISTRY.find((one) => one.id === agent);
      return {
        state: 'refused',
        reason: row === undefined ? 'agent-unknown' : 'agent-not-launchable'
      };
    }
    let made: Session;
    try {
      made = await core.createSession({
        projectPath: project.path,
        cwd: project.path,
        agent,
        name: invocation.name.trim()
      });
    } catch {
      return { state: 'refused', reason: 'failed' };
    }
    return {
      state: 'created',
      session: {
        id: made.id,
        name: made.name,
        agent: made.agent,
        status: made.status,
        phase: isFinishedView(made.status) ? 'finished' : 'active',
        createdAt: made.createdAt,
        project: toAgentAccessProjectView(made, sources.projects),
        machine: { id: LOCAL_MACHINE_ID, label: 'This Mac' }
      }
    };
  };
}

/**
 * `rename`: by id only, through the app's one rename verb. The name goes
 * through the one shared rule in its own order, exactly as the Mac's own
 * rename does, and there is NO confirmation: a rename is reversible text, and
 * the operator's ruling says navigation and renames ask for nothing.
 */
export function buildAgentAccessRename(core: {
  listSessions: () => Promise<Session[]>;
  listProjects: () => Promise<Project[]>;
  renameSession: AgentAccessVerbDeps['renameSession'];
}): AgentAccessRenameHandler {
  return async (invocation) => {
    const sources = await verbSources(core);
    const row = sessionOf(sources, invocation.target);
    const gate = rowGateRefusal(row);
    if (gate !== null) return { state: 'refused', reason: gate };
    const refusedName = nameGateRefusal(invocation.name);
    if (refusedName !== null) {
      return { state: 'refused', reason: refusedName };
    }
    let renamed: Session;
    try {
      renamed = await core.renameSession({
        sessionId: invocation.target,
        name: invocation.name.trim()
      });
    } catch {
      return { state: 'refused', reason: 'failed' };
    }
    return {
      state: 'renamed',
      session: {
        id: renamed.id,
        name: renamed.name,
        agent: renamed.agent,
        status: renamed.status,
        phase: isFinishedView(renamed.status) ? 'finished' : 'active',
        createdAt: renamed.createdAt,
        project: toAgentAccessProjectView(renamed, sources.projects),
        machine: { id: LOCAL_MACHINE_ID, label: 'This Mac' }
      }
    };
  };
}

/**
 * `focus`: a project and optionally one of its sessions, through the ONE
 * navigation sink the renderer owns. An explicit focus request brings the
 * main window forward for a project-only landing as well as a session
 * landing. Opening a project without requesting focus remains separate.
 */
export function buildAgentAccessFocus(
  send: AgentAccessNavSend,
  core: {
    listSessions: () => Promise<Session[]>;
    listProjects: () => Promise<Project[]>;
  }
): AgentAccessFocusHandler {
  return async (invocation) => {
    const sources = await verbSources(core);
    const project = sources.projects.find(
      (one) => one.id === invocation.projectId
    );
    if (project === undefined) {
      return { state: 'refused', reason: 'project-missing' };
    }
    let session: Session | null = null;
    if (invocation.target !== null) {
      const row = sessionOf(sources, invocation.target);
      const gate = rowGateRefusal(row);
      if (gate !== null) return { state: 'refused', reason: gate };
      const inProject =
        row !== undefined &&
        toAgentAccessProjectView(row, sources.projects)?.id === project.id;
      if (!inProject) {
        return { state: 'refused', reason: 'session-not-in-project' };
      }
      session = row ?? null;
    }
    const outcome = await send({
      kind: 'focus',
      projectId: project.id,
      ...(session === null ? {} : { sessionId: session.id }),
      raise: true
    });
    if (outcome === 'accepted') {
      return {
        state: 'focused',
        project: { id: project.id, name: project.name, path: project.path },
        session:
          session === null
            ? null
            : {
                id: session.id,
                name: session.name,
                agent: session.agent,
                status: session.status,
                phase: isFinishedView(session.status) ? 'finished' : 'active',
                createdAt: session.createdAt,
                project: toAgentAccessProjectView(session, sources.projects),
                machine: { id: LOCAL_MACHINE_ID, label: 'This Mac' }
              }
      };
    }
    if (outcome === 'project-missing') {
      return { state: 'refused', reason: 'project-missing' };
    }
    if (outcome === 'session-missing') {
      return { state: 'refused', reason: 'session-missing' };
    }
    return { state: 'refused', reason: 'renderer-unavailable' };
  };
}
