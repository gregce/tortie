/**
 * PHASE 362 — the acting adapters: create/rename/open-project/focus over the
 * app's ONE verb each, and .
 *
 * These run against the REAL composers where a composer is pure
 * (`composeStartInput`) and against small recorded cores otherwise. No
 * Electron, no tmux, no window, no manifest: the person is a `confirm` stub.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAgentAccessCreate,
  buildAgentAccessFocus,
  buildAgentAccessRename
} from '../verbs';
import { composeStartInput } from '../../sessions/pocket-start';
import { sessionNameRefusal } from '@shared/session-names';
import type { Project, Session } from '@shared/types';

function sessionOf(over: Partial<Session>): Session {
  return {
    id: over.id ?? 's-1',
    name: over.name ?? 's',
    tmuxName: 's',
    projectPath: over.projectPath ?? '/tmp/a',
    cwd: '/tmp/a',
    agent: (over.agent as Session['agent']) ?? 'pi',
    status: over.status ?? 'running',
    createdAt: 1,
    argv: [],
    ...over
  } as Session;
}

const PROJECTS = [
  { id: 'pa', name: 'A', path: '/tmp/a' },
  { id: 'pb', name: 'B', path: '/tmp/b' }
] as unknown as Project[];

describe('explicit focus brings either target forward', () => {
  it.each([null, 'caller-1'])('raises for target %s', async (target) => {
    const sent: { raise: boolean; sessionId?: string }[] = [];
    const focus = buildAgentAccessFocus(async (input) => {
      sent.push(input);
      return 'accepted';
    }, {
      listSessions: async () => [sessionOf({ id: 'caller-1' })],
      listProjects: async () => PROJECTS
    });
    const result = await focus({ caller: 'caller-1', projectId: 'pa', target });
    expect(result.state).toBe('focused');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.raise).toBe(true);
    expect(sent[0]?.sessionId).toBe(target ?? undefined);
  });
});

describe('shared name rule owns every refusal word', () => {
  it('empty before long before character', () => {
    expect(sessionNameRefusal('   ')?.reason).toBe('empty');
    expect(sessionNameRefusal(`x`.repeat(121))?.reason).toBe('long');
    expect(sessionNameRefusal('has\ttab')?.reason).toBe('character');
    expect(sessionNameRefusal('Fine name 2')).toBeNull();
  });
});

describe('create/rename refuse before any verb runs', () => {
  const rows = () => [
    sessionOf({ id: 'caller-1', projectPath: '/tmp/a' }),
    sessionOf({ id: 'w-1', projectPath: '/tmp/a' })
  ];
  it('empty, long and character names read the rule words', async () => {
    let runs = 0;
    const create = buildAgentAccessCreate({
      listSessions: async () => rows(),
      listProjects: async () => PROJECTS,
      createSession: async () => {
        runs += 1;
        return sessionOf({ id: 'new-1' });
      },
      defaultAgentId: () => 'claude',
      isLaunchableAgent: () => true
    });
    for (const name of ['   ', 'x'.repeat(121), 'has\ttab']) {
      const expected = sessionNameRefusal(name);
      const r = await create({
        caller: 'caller-1',
        projectId: 'pa',
        name,
        agent: null
      });
      expect(r).toEqual({ state: 'refused', reason: expected?.reason });
    }
    expect(runs).toBe(0);
  });
  it('an unknown project never makes a session', async () => {
    let runs = 0;
    const create = buildAgentAccessCreate({
      listSessions: async () => rows(),
      listProjects: async () => PROJECTS,
      createSession: async () => {
        runs += 1;
        return sessionOf({ id: 'new-1' });
      },
      defaultAgentId: () => 'claude',
      isLaunchableAgent: () => true
    });
    const r = await create({
      caller: 'caller-1',
      projectId: 'pz',
      name: 'n',
      agent: null
    });
    expect(r).toEqual({ state: 'refused', reason: 'project-missing' });
    expect(runs).toBe(0);
  });
  it('a gone target is refused by id, never by name', async () => {
    let runs = 0;
    const rename = buildAgentAccessRename({
      listSessions: async () => rows(),
      listProjects: async () => PROJECTS,
      renameSession: async () => {
        runs += 1;
        return sessionOf({ id: 'w-1', name: 'renamed' });
      }
    });
    const r = await rename({ caller: 'caller-1', target: 'gone-9', name: 'n' });
    expect(r).toEqual({ state: 'refused', reason: 'session-missing' });
    expect(runs).toBe(0);
  });
  it('a removed row is refused, never renamed', async () => {
    let runs = 0;
    const rename = buildAgentAccessRename({
      listSessions: async () => [
        ...rows(),
        sessionOf({ id: 'r-1', status: 'discarded', projectPath: '/tmp/a' })
      ],
      listProjects: async () => PROJECTS,
      renameSession: async () => {
        runs += 1;
        return sessionOf({ id: 'r-1' });
      }
    });
    const r = await rename({ caller: 'caller-1', target: 'r-1', name: 'n' });
    expect(r).toEqual({ state: 'refused', reason: 'gone' });
    expect(runs).toBe(0);
  });
});

describe('pocket input carries a named create through the same defaults', () => {
  it('a named create still carries the launch defaults and capture', () => {
    const input = composeStartInput({
      project: PROJECTS[0]!,
      agent: 'claude',
      sessions: [],
      settings: { launchDefaults: {}, captureDefaults: {} },
      catalogs: { agents: {} } as never,
      name: 'My session'
    });
    expect(input.name).toBe('My session');
    expect(input.projectPath).toBe('/tmp/a');
    const ordinal = composeStartInput({
      project: PROJECTS[0]!,
      agent: 'claude',
      sessions: [],
      settings: { launchDefaults: {}, captureDefaults: {} },
      catalogs: { agents: {} } as never
    });
    expect(ordinal.name).toBe('claude-1');
  });
});

describe('open-project by path (finish round)', () => {
  it('adds a real folder through addProject and selects it, and refuses a file or a relative path', async () => {
    const { buildAgentAccessOpenProject } = await import('../verbs');
    const added: string[] = [];
    const sent: unknown[] = [];
    const handler = buildAgentAccessOpenProject(
      async (input) => {
        sent.push(input);
        return 'accepted';
      },
      {
        listProjects: async () => [],
        addProject: async (path) => {
          added.push(path);
          return { id: 'p-new', name: 'tmp', path } as never;
        }
      }
    );
    const opened = await handler({ caller: 'c', path: '/tmp' });
    expect(opened.state).toBe('opened');
    expect(added).toEqual(['/tmp']);
    expect(sent).toEqual([{ kind: 'project', projectId: 'p-new', raise: false }]);
    expect((await handler({ caller: 'c', path: '/etc/hosts' })).state).toBe('refused');
    expect((await handler({ caller: 'c', path: 'relative' })).state).toBe('refused');
    expect(added).toEqual(['/tmp']);
  });
});
