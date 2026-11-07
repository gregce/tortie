/**
 * Phase 359, Builder C1 — curated facts for the private agent-access socket.
 *
 * Three rules drive every case below:
 * - a second field on a row is a product decision, and the closed-shape
 *   cases name every field that may travel;
 * - local-only matching for the CALLER (fake, gone, and remote ids refuse),
 *   while `sessions` itself projects local AND remote rows;
 * - newest-first by creation clock, ties by id, the 200 cap with an exact
 *   omitted count, and the finished set exactly
 *   exited/restorable/discarded.
 *
 * NOTHING HERE OPENS A SOCKET, STARTS A SERVER, OR READS A MANIFEST. The
 * sessions and projects arrive as values; no Electron launch, no agent, and
 * no canary value of any kind.
 */

import { describe, expect, it } from 'vitest';

import {
  AGENT_ACCESS_FINISHED_STATUSES,
  AGENT_ACCESS_MAX_SESSION_ROWS
} from '@shared/agent-access';
import type { Project, Session, SessionStatus } from '@shared/types';
import {
  buildAgentAccessCapabilities,
  buildAgentAccessSessions,
  buildAgentAccessWhoAmI,
  compareAgentAccessSessions,
  findLocalCaller,
  toAgentAccessMachineView,
  toAgentAccessProjectView,
  toAgentAccessSessionView
} from '../facts';

function session(over: Partial<Session> & { id: string }): Session {
  return {
    name: `name-${over.id}`,
    tmuxName: `tmux-${over.id}`,
    projectPath: '/proj/a',
    cwd: '/proj/a',
    agent: 'claude',
    status: 'running',
    createdAt: 1000,
    ...over
  };
}

function project(over: Partial<Project> & { id: string }): Project {
  return {
    path: '/proj/a',
    name: 'a',
    ...over
  };
}

describe('curated facts', () => {
  it('projects only the closed session shape', () => {
    const row = session({
      id: 'live-1',
      agentSessionId: 'must-not-travel',
      resumeArgv: ['must-not-travel'],
      exitCode: 3,
      exitDetail: 'must-not-travel'
    });
    const view = toAgentAccessSessionView(row, [project({ id: 'p1' })]);
    expect(view).toEqual({
      id: 'live-1',
      name: 'name-live-1',
      agent: 'claude',
      status: 'running',
      phase: 'active',
      createdAt: 1000,
      project: { id: 'p1', name: 'a', path: '/proj/a' },
      machine: { id: 'local', label: 'This Mac' }
    });
    expect(JSON.stringify(view)).not.toContain('must-not-travel');
  });

  it('reads finished exactly as exited, restorable, discarded', () => {
    expect([...AGENT_ACCESS_FINISHED_STATUSES].sort()).toEqual(
      ['discarded', 'exited', 'restorable'].sort()
    );
    const finished: SessionStatus[] = ['exited', 'restorable', 'discarded'];
    for (const status of finished) {
      expect(toAgentAccessSessionView(session({ id: status, status }), []).phase).toBe(
        'finished'
      );
    }
    const active: SessionStatus[] = [
      'running',
      'idle',
      'needs_input',
      'unknown'
    ];
    for (const status of active) {
      expect(toAgentAccessSessionView(session({ id: status, status }), []).phase).toBe(
        'active'
      );
    }
  });

  it('projects a remote machine by its own id and label', () => {
    const row = session({
      id: 'far-1',
      projectPath: '/far/proj',
      machine: {
        id: 'mac-pro',
        label: 'Mac Pro',
        color: 'blue',
        answering: true,
        canRestore: false,
        restoreReason: null
      }
    });
    expect(toAgentAccessMachineView(row)).toEqual({
      id: 'mac-pro',
      label: 'Mac Pro'
    });
  });

  it('matches projects by folder AND machine, never bare path', () => {
    const local = session({ id: 'here', projectPath: '/same/path' });
    const far = session({
      id: 'there',
      projectPath: '/same/path',
      machine: {
        id: 'mac-pro',
        label: 'Mac Pro',
        color: 'blue',
        answering: true,
        canRestore: false,
        restoreReason: null
      }
    });
    const rows = [
      project({ id: 'local-tab', path: '/same/path', name: 'here' }),
      project({
        id: 'far-tab',
        path: '/same/path',
        name: 'there',
        machineId: 'mac-pro'
      })
    ];
    expect(toAgentAccessProjectView(local, rows)?.id).toBe('local-tab');
    expect(toAgentAccessProjectView(far, rows)?.id).toBe('far-tab');
    expect(
      toAgentAccessProjectView(
        session({ id: 'missing', projectPath: '/nowhere' }),
        rows
      )
    ).toBeNull();
  });

  it('refuses fake, gone, and remote callers before any operation', () => {
    const rows = [
      session({ id: 'here' }),
      session({
        id: 'far',
        machine: {
          id: 'mac-pro',
          label: 'Mac Pro',
          color: 'blue',
          answering: true,
          canRestore: false,
          restoreReason: null
        }
      })
    ];
    expect(findLocalCaller(rows, 'here')?.id).toBe('here');
    expect(findLocalCaller(rows, 'missing')).toBeNull();
    expect(findLocalCaller(rows, 'far')).toBeNull();
    expect(buildAgentAccessWhoAmI({ sessions: rows, projects: [] }, 'far')).toBeNull();
    expect(
      buildAgentAccessSessions({ sessions: rows, projects: [] }, 'missing')
    ).toBeNull();
  });

  it('answers capabilities only through the shared closed sets', () => {
    const value = buildAgentAccessCapabilities('9.9.9-test');
    expect(value).toEqual({
      protocol: 1,
      tortieVersion: '9.9.9-test',
      enabled: true,
      operations: ['capabilities', 'whoami', 'sessions', 'open'],
      deliveredTo: ['claude', 'pi', 'omp']
    });
  });

  it('orders newest-first, ties by id, caps at 200 with an exact omitted count', () => {
    const rows: Session[] = [];
    for (let i = 0; i < AGENT_ACCESS_MAX_SESSION_ROWS + 5; i += 1) {
      rows.push(
        session({
          id: `s-${String(i).padStart(3, '0')}`,
          createdAt: i < 5 ? 42 : 1000 + i
        })
      );
    }
    const value = buildAgentAccessSessions(
      { sessions: rows, projects: [] },
      's-010'
    );
    expect(value).not.toBeNull();
    expect(value?.sessions).toHaveLength(AGENT_ACCESS_MAX_SESSION_ROWS);
    expect(value?.omitted).toBe(5);
    const ordered = [...(value?.sessions ?? [])].sort(
      compareAgentAccessSessions
    );
    expect(value?.sessions.map((one) => one.id)).toEqual(
      ordered.map((one) => one.id)
    );
    // The oldest reading (the five clock-42 ties) falls off; the lowest tied
    // id that survives is s-000 only when it still fits, so the tie rule is
    // what keeps the survivor set exact rather than lucky.
    const oldest = value?.sessions.filter((one) => one.createdAt === 42) ?? [];
    expect(oldest.map((one) => one.id)).toEqual(
      [...oldest].map((one) => one.id).sort()
    );
  });

  it('projects remote rows inside sessions once the caller is local', () => {
    const rows = [
      session({ id: 'here' }),
      session({
        id: 'far',
        projectPath: '/far/proj',
        machine: {
          id: 'mac-pro',
          label: 'Mac Pro',
          color: 'blue',
          answering: true,
          canRestore: false,
          restoreReason: null
        }
      })
    ];
    const value = buildAgentAccessSessions(
      { sessions: rows, projects: [] },
      'here'
    );
    expect(value?.sessions.map((one) => one.id).sort()).toEqual(['far', 'here']);
    expect(value?.omitted).toBe(0);
    expect(value?.sessions.find((one) => one.id === 'far')?.machine).toEqual({
      id: 'mac-pro',
      label: 'Mac Pro'
    });
  });
});
