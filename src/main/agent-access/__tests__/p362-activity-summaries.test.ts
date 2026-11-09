/**
 * Phase 362 — the activity board and the stored summaries.
 *
 * Asked of the SHIPPED dispatch, not of `facts.ts` directly: the wiring —
 * the operation registry, the caller rule, the `sessions` member validation —
 * is the thing this file proves. The shapes themselves are already asserted
 * in the gate's driven arms over the same fixture sessions.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  dispatchAgentAccessRequest,
  type AgentAccessDispatchDeps
} from '../dispatch';
import type {
  AgentAccessActivityValue,
  AgentAccessSessionsValue,
  AgentAccessSummariesValue
} from '@shared/agent-access';

function summariesOf(value: unknown): AgentAccessSummariesValue {
  return value as AgentAccessSummariesValue;
}
import type { Project, Session } from '@shared/types';

function session(over: Partial<Session>): Session {
  return {
    id: over.id ?? 'caller-1',
    name: over.name ?? 's',
    tmuxName: 's',
    projectPath: over.projectPath ?? '/tmp/p',
    cwd: '/tmp/p',
    agent: (over.agent as Session['agent']) ?? 'pi',
    status: over.status ?? 'running',
    createdAt: 1,
    argv: [],
    ...over
  } as Session;
}

const PROJECTS: Project[] = [
  { id: 'p', name: 'P', path: '/tmp/p' }
] as unknown as Project[];

function deps(over: Partial<AgentAccessDispatchDeps> = {}): AgentAccessDispatchDeps {
  return {
    isEnabled: () => true,
    listSessions: async () => [session({})],
    listProjects: async () => PROJECTS,
    tortieVersion: () => '9.9.9-test',
    open: async () => ({ state: 'not-found', matches: 0 }),
    openProject: async () => ({ state: 'refused', reason: 'project-missing' }),
    create: async () => ({ state: 'refused', reason: 'failed' }),
    rename: async () => ({ state: 'refused', reason: 'failed' }),
    focus: async () => ({ state: 'refused', reason: 'renderer-unavailable' }),
    readSummary: () => null,
    report: vi.fn(),
    ...over
  };
}

function lineOf(body: unknown): string {
  return `${JSON.stringify(body)}\n`;
}

describe('activity', () => {
  const rows = () => [
    session({ id: 'caller-1', status: 'running' }),
    session({ id: 'w-1', status: 'needs_input' }),
    session({ id: 'f-1', status: 'restorable' }),
    session({ id: 'q-1', status: 'unknown' })
  ];
  const d = () =>
    deps({ listSessions: async () => rows() });
  it('counts the board and puts waiting first', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'activity', session: 'caller-1' }),
      d()
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'activity') throw new Error('no reading');
    const value = r.value as unknown as AgentAccessActivityValue;
    expect(value.counts).toEqual({ working: 1, idle: 0, waiting: 1, finished: 1 });
    expect(value.waiting.map((one) => one.id)).toEqual(['w-1']);
    expect(value.sessions.map((one) => one.doing)).toEqual([
      'waiting',
      'working',
      'finished',
      'other'
    ]);
    expect(value.omitted).toBe(0);
  });
  it('refuses a fake caller with nothing learned', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'activity', session: 'ffff0000-0000-4000-8000-000000000009' }),
      d()
    );
    expect(r.ok).toBe(false);
  });
  it('refuses a member only summaries may carry', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'activity', session: 'caller-1', sessions: ['caller-1'] }),
      d()
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('accepted');
    expect(r.error.code).toBe('bad-request');
  });
});

describe('summaries', () => {
  const d = (readSummary: AgentAccessDispatchDeps['readSummary']) =>
    deps({
      listSessions: async () => [
        session({ id: 'caller-1' }),
        session({ id: 'long-1' })
      ],
      readSummary
    });
  it('answers kept text with its freshness and honest none', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'summaries', session: 'caller-1' }),
      d((id) =>
        id === 'caller-1'
          ? { kept: true, text: 'Did a thing.', fromTurn: 1, toTurn: 3, writtenAt: 99, newestTurn: 3 }
          : null
      )
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'summaries') throw new Error('no reading');
    const value = summariesOf(r.value as AgentAccessSummariesValue);
    expect(value.summaries).toEqual([
      {
        sessionId: 'caller-1',
        state: 'kept',
        text: 'Did a thing.',
        fromTurn: 1,
        toTurn: 3,
        writtenAt: 99,
        staleTurns: 0
      },
      { sessionId: 'long-1', state: 'none' }
    ]);
  });
  it('answers none when a row was refused, not its text', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'summaries', session: 'caller-1' }),
      d(() => ({ kept: false, text: null, fromTurn: 1, toTurn: 2, writtenAt: 9, newestTurn: 4 }))
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'summaries') throw new Error('no reading');
    const value = summariesOf(r.value as AgentAccessSummariesValue);
    expect(value.summaries[0]).toEqual({ sessionId: 'caller-1', state: 'none' });
  });
  it('clips a long sentence at the shared bound', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'summaries',
        session: 'caller-1',
        sessions: ['caller-1']
      }),
      d(() => ({ kept: true, text: 'x'.repeat(500), fromTurn: 1, toTurn: 1, writtenAt: 1, newestTurn: 1 }))
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'summaries') throw new Error('no reading');
    const value = summariesOf(r.value as AgentAccessSummariesValue);
    const first = value.summaries[0];
    if (first === undefined || first.state !== 'kept') throw new Error('not kept');
    expect(first.text).toHaveLength(400);
  });
  it('caps the named set beside the unknown-shape refusal', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'summaries',
        session: 'caller-1',
        sessions: Array.from({ length: 51 }, (_, i) => `caller-${i}`)
      }),
      d(() => null)
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('accepted');
    expect(r.error.code).toBe('bad-request');
  });
});

describe('project filter and new verbs', () => {
  const projectsOf = (): Project[] =>
    [
      { id: 'pa', name: 'A', path: '/tmp/a' },
      { id: 'pb', name: 'B', path: '/tmp/b' }
    ] as unknown as Project[];
  const rows = () => [
    session({ id: 'caller-1', projectPath: '/tmp/a' }),
    session({ id: 's-b', projectPath: '/tmp/b' })
  ];
  const d = (over: Partial<AgentAccessDispatchDeps> = {}) =>
    deps({ listSessions: async () => rows(), listProjects: async () => projectsOf(), ...over });
  it('sessions filters by project, and an unknown project reads empty', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'sessions', session: 'caller-1', project: 'pb' }),
      d()
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'sessions') throw new Error('no reading');
    expect((r.value as AgentAccessSessionsValue).sessions.map((one) => one.id)).toEqual(['s-b']);
    const unknownR = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'sessions', session: 'caller-1', project: 'pz' }),
      d()
    );
    expect(unknownR.ok).toBe(true);
    if (!unknownR.ok || unknownR.operation !== 'sessions') throw new Error('no reading');
    expect((unknownR.value as AgentAccessSessionsValue).sessions).toEqual([]);
    expect((unknownR.value as AgentAccessSessionsValue).omitted).toBe(0);
  });
  it('activity filters by project', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'activity', session: 'caller-1', project: 'pb' }),
      d()
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'activity') throw new Error('no reading');
    const value = r.value as unknown as AgentAccessActivityValue;
    expect(value.counts.working).toBe(1);
    expect(value.counts.finished + value.counts.waiting + value.counts.idle).toBe(0);
  });
  it('no resurrection: a refused newest row reads none', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'summaries', session: 'caller-1' }),
      d({
        readSummary: () => ({
          kept: false,
          text: 'An older kept sentence that must never be carried.',
          fromTurn: 1,
          toTurn: 2,
          writtenAt: 9,
          newestTurn: 5
        })
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'summaries') throw new Error('no reading');
    for (const row of summariesOf(r.value as AgentAccessSummariesValue).summaries) {
      expect(row).toEqual({ sessionId: row.sessionId, state: 'none' });
    }
  });
  it('a stale kept row carries its exact staleTurns, never countTurns', async () => {
    const r = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'summaries', session: 'caller-1', sessions: ['s-b'] }),
      d({
        readSummary: (id) =>
          id === 's-b'
            ? { kept: true, text: 'Did things.', fromTurn: 1, toTurn: 2, writtenAt: 9, newestTurn: 6 }
            : null
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.operation !== 'summaries') throw new Error('no reading');
    expect(summariesOf(r.value as AgentAccessSummariesValue).summaries).toEqual([
      {
        sessionId: 's-b',
        state: 'kept',
        text: 'Did things.',
        fromTurn: 1,
        toTurn: 2,
        writtenAt: 9,
        staleTurns: 4
      }
    ]);
  });
  it('summaries refuses a member only a verb takes, and verbs refuse a fake caller', async () => {
    const member = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'summaries', session: 'caller-1', target: 's-b' }),
      d()
    );
    expect(member.ok).toBe(false);
    const fake = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'rename', session: 'nobody-here', target: 'caller-1', name: 'New name' }),
      d()
    );
    expect(fake.ok).toBe(false);
    if (fake.ok) throw new Error('accepted');
    expect(fake.error.code).toBe('unavailable');
  });
  it('verbs reach their seams with the asked ids', async () => {
    const seen: string[] = [];
    const openProject = async (inv: { caller: string; projectId?: string }) => {
      seen.push(`openProject:${inv.caller}:${inv.projectId}`);
      return { state: 'opened' as const, project: { id: inv.projectId ?? '', name: 'B', path: '/tmp/b' } };
    };
    const opened = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'open-project', session: 'caller-1', project: 'pb' }),
      d({ openProject })
    );
    expect(opened.ok).toBe(true);
    expect(seen).toEqual(['openProject:caller-1:pb']);

    const create = async (inv: { caller: string; projectId: string; name: string; agent: string | null }) => {
      seen.push(`create:${inv.name}:${inv.agent ?? 'default'}`);
      return { state: 'refused' as const, reason: 'agent-unknown' as const };
    };
    const created = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'create', session: 'caller-1', project: 'pa', name: 'n', agent: 'made-up' }),
      d({ create })
    );
    expect(created.ok).toBe(true);
    if (!created.ok || created.operation !== 'create') throw new Error('no reading');
    expect(created.value).toEqual({ state: 'refused', reason: 'agent-unknown' });
  });
});
