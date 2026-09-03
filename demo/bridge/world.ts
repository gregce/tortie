/**
 * The demo's world: the one mutable model every bridge surface answers from.
 *
 * Three projects (see ./repo), each with sessions in the states the sidebar
 * is proudest of: agents mid-run, idle shells, and one 'restorable' session
 * that survived a "reboot" — restoring it replays saved scrollback and arms
 * the resume command, exactly the story the product tells.
 */
import type { Project, Session, SessionStatus } from '@shared/types';
import { knownRepo, registerGenericRepo, SPARE_PROJECT_PATH } from './repo';
import {
  AGENT_DEFAULT_REPLY,
  AGENT_SCRIPT,
  CODEX_SCRIPT,
  newAgentScript,
  restoredScript,
  SHELL_COMMANDS,
  shellPrompt
} from './scripts';
import { DemoTerminal } from './term-engine';

export const DEMO_PROJECT_PATH = '/Users/you/rookery';

const now = Date.now();

/** How each fixture session's terminal behaves when it is attached. */
function terminalConfig(session: Session): ConstructorParameters<typeof DemoTerminal>[0] {
  const dir = `~/${session.projectPath.split('/').pop() ?? 'rookery'}`;
  const prompt = shellPrompt(dir);
  switch (session.id) {
    case 'demo-session-agent':
      return { script: AGENT_SCRIPT, prompt, commands: SHELL_COMMANDS };
    case 'demo-session-codex':
      return {
        script: CODEX_SCRIPT,
        prompt,
        commands: {},
        defaultReply: AGENT_DEFAULT_REPLY
      };
    case 'demo-session-restorable':
      return {
        script: restoredScript(prompt, 'claude --resume 7f3d2a1e'),
        prompt,
        noPromptAfterScript: true,
        seedLine: 'claude --resume 7f3d2a1e',
        commands: {
          'claude --resume 7f3d2a1e': [
            '',
            '\x1b[35m✳\x1b[0m \x1b[1mResumed.\x1b[0m Picking the conversation back up:',
            '',
            "  We left off choosing the opening line. My favorite of the working",
            '  titles is still "Close the window. The work keeps going." —',
            '  want me to draft the first section around it?'
          ].join('\n')
        },
        defaultReply: AGENT_DEFAULT_REPLY
      };
    default:
      if (session.agent === 'shell')
        return { prompt, commands: SHELL_COMMANDS };
      return {
        script: newAgentScript(session.agent, dir),
        prompt,
        commands: {},
        defaultReply: AGENT_DEFAULT_REPLY
      };
  }
}

export interface DemoWorld {
  projects: Project[];
  sessions: Session[];
  terminals: Map<string, DemoTerminal>;
  listeners: {
    sessionsChanged: Set<(sessions: Session[]) => void>;
    statusChanged: Set<(id: string, status: SessionStatus) => void>;
  };
  emitSessions(): void;
  setStatus(id: string, status: SessionStatus): void;
  terminalFor(id: string): DemoTerminal;
  addSession(input: {
    name: string;
    agent: Session['agent'];
    projectPath?: string;
    cwd?: string;
  }): Session;
  restoreSession(id: string): Session | undefined;
  addProject(path: string, opts?: { cloneUrl?: string }): Project;
  removeProject(projectId: string): void;
  /** What the "native" folder picker picks: sylva first, then fresh dirs. */
  pickProjectDir(): string;
}

function session(
  partial: Pick<Session, 'id' | 'name' | 'agent' | 'status' | 'projectPath'> &
    Partial<Session>
): Session {
  return {
    tmuxName: partial.name.replaceAll(/[.:]/g, '-'),
    cwd: partial.projectPath,
    createdAt: now - 1000 * 60 * 47,
    ...partial
  };
}

export function createWorld(): DemoWorld {
  const projects: Project[] = [
    { id: 'demo-project-rookery', path: '/Users/you/rookery', name: 'rookery' },
    { id: 'demo-project-heron', path: '/Users/you/heron', name: 'heron' },
    { id: 'demo-project-tern', path: '/Users/you/tern-docs', name: 'tern-docs' }
  ];

  const sessions: Session[] = [
    session({
      id: 'demo-session-agent',
      name: 'fix flaky retry test',
      agent: 'claude',
      status: 'running',
      projectPath: '/Users/you/rookery'
    }),
    session({
      id: 'demo-session-shell',
      name: 'scratch shell',
      agent: 'shell',
      status: 'idle',
      projectPath: '/Users/you/rookery',
      createdAt: now - 1000 * 60 * 12
    }),
    session({
      id: 'demo-session-codex',
      name: 'day-3 check-in email',
      agent: 'codex',
      status: 'needs_input',
      projectPath: '/Users/you/heron',
      createdAt: now - 1000 * 60 * 95
    }),
    session({
      id: 'demo-session-heron-shell',
      name: 'dev server',
      agent: 'shell',
      status: 'idle',
      projectPath: '/Users/you/heron',
      createdAt: now - 1000 * 60 * 130
    }),
    session({
      id: 'demo-session-restorable',
      name: 'draft launch post',
      agent: 'claude',
      status: 'restorable',
      projectPath: '/Users/you/tern-docs',
      createdAt: now - 1000 * 60 * 60 * 26,
      agentSessionId: '7f3d2a1e',
      resumeArgv: ['claude', '--resume', '7f3d2a1e'],
      resumeCapture: 'armed'
    })
  ];

  const terminals = new Map<string, DemoTerminal>();

  const world: DemoWorld = {
    projects,
    sessions,
    terminals,
    listeners: {
      sessionsChanged: new Set(),
      statusChanged: new Set()
    },
    emitSessions() {
      const snapshot = [...world.sessions];
      for (const cb of world.listeners.sessionsChanged) cb(snapshot);
    },
    setStatus(id, status) {
      const row = world.sessions.find((s) => s.id === id);
      if (!row || row.status === status) return;
      row.status = status;
      for (const cb of world.listeners.statusChanged) cb(id, status);
      world.emitSessions();
    },
    terminalFor(id) {
      let term = terminals.get(id);
      if (!term) {
        const row = world.sessions.find((s) => s.id === id);
        term = new DemoTerminal(
          row
            ? terminalConfig(row)
            : { prompt: shellPrompt('~'), commands: SHELL_COMMANDS }
        );
        terminals.set(id, term);
      }
      return term;
    },
    addSession({ name, agent, projectPath, cwd }) {
      const root = projectPath ?? DEMO_PROJECT_PATH;
      const row = session({
        id: `demo-session-${Math.random().toString(36).slice(2, 10)}`,
        name,
        agent,
        status: agent === 'shell' ? 'idle' : 'running',
        projectPath: root,
        cwd: cwd ?? root,
        createdAt: Date.now()
      });
      world.sessions.push(row);
      world.emitSessions();
      return row;
    },
    restoreSession(id) {
      const row = world.sessions.find((s) => s.id === id);
      if (!row) return undefined;
      if (row.status === 'restorable') {
        row.status = 'running';
        row.restore = { kind: 'armed', at: Date.now() };
        for (const cb of world.listeners.statusChanged) cb(id, 'running');
        world.emitSessions();
      }
      return row;
    },
    addProject(path, opts) {
      const existing = world.projects.find((p) => p.path === path);
      if (existing) return existing;
      if (!knownRepo(path)) registerGenericRepo(path, opts);
      const name = path.split('/').pop() ?? 'project';
      const project: Project = {
        id: `demo-project-${name}-${world.projects.length}`,
        path,
        name
      };
      world.projects.push(project);
      return project;
    },
    removeProject(projectId) {
      const project = world.projects.find((p) => p.id === projectId);
      if (!project) return;
      world.projects = world.projects.filter((p) => p.id !== projectId);
      const doomed = world.sessions.filter(
        (s) => s.projectPath === project.path
      );
      world.sessions = world.sessions.filter(
        (s) => s.projectPath !== project.path
      );
      for (const s of doomed) {
        terminals.get(s.id)?.dispose();
        terminals.delete(s.id);
      }
      world.emitSessions();
    },
    pickProjectDir() {
      if (!world.projects.some((p) => p.path === SPARE_PROJECT_PATH))
        return SPARE_PROJECT_PATH;
      const n = world.projects.length - 2;
      return `/Users/you/aviary-${n}`;
    }
  };

  return world;
}
