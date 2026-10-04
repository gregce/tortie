/**
 * Which sessions the phone may reply to, before anything is read (Phase 318,
 * build/p318/SPEC.md §5.4.1): the remote and agent arm first, then the status
 * each kind needs, then a live tmux id.
 */

import { describe, expect, it } from 'vitest';
import type { Session, SessionStatus } from '@shared/types';
import { REPLY_AGENTS, replyAgentOf, replyGate } from '../gate';

const STATUSES: SessionStatus[] = ['running', 'idle', 'needs_input', 'exited', 'restorable', 'unknown'];

function session(over: Partial<Session> = {}): Session {
  return {
    id: 's1',
    name: 'one',
    tmuxName: 'proj--one',
    projectPath: '/work/proj',
    cwd: '/work/proj',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1,
    ...over
  } as Session;
}

const REMOTE = { id: 'popos', label: 'pop-os' } as unknown as Session['machine'];

describe('replyGate', () => {
  it('an absent session is gone, for both kinds', () => {
    expect(replyGate(undefined, 'press', '$1')).toBe('gone');
    expect(replyGate(undefined, 'say', '$1')).toBe('gone');
  });

  it('a session on another machine is refused before anything else, whatever its status', () => {
    for (const status of STATUSES) {
      const remote = session({ machine: REMOTE, status });
      expect(replyGate(remote, 'press', '$1')).toBe('unpressable');
      expect(replyGate(remote, 'say', '$1')).toBe('unsayable');
      expect(replyGate(remote, 'press', null)).toBe('unpressable');
    }
  });

  it('every agent but Claude Code and Codex is refused, a shell included', () => {
    expect([...REPLY_AGENTS]).toEqual(['claude', 'codex']);
    expect(Object.isFrozen(REPLY_AGENTS)).toBe(true);
    for (const agent of ['shell', 'gemini', 'qwen', 'grok', 'cursor', 'antigravity', '']) {
      const row = session({ agent: agent as Session['agent'] });
      expect(replyGate(row, 'press', '$1'), agent).toBe('unpressable');
      expect(replyGate({ ...row, status: 'idle' }, 'say', '$1'), agent).toBe('unsayable');
      expect(replyAgentOf(row), agent).toBeNull();
    }
  });

  it('a press needs a session waiting on a question', () => {
    for (const agent of ['claude', 'codex'] as const) {
      for (const status of STATUSES) {
        const verdict = replyGate(session({ agent, status }), 'press', '$1');
        expect(verdict, `${agent} ${status}`).toBe(status === 'needs_input' ? null : 'changed');
      }
    }
  });

  it('a message needs a session that is running or idle, never one that waits', () => {
    for (const agent of ['claude', 'codex'] as const) {
      for (const status of STATUSES) {
        const verdict = replyGate(session({ agent, status }), 'say', '$1');
        expect(verdict, `${agent} ${status}`).toBe(status === 'running' || status === 'idle' ? null : 'unsayable');
      }
    }
  });

  it('no live tmux id: a press reads changed and a message unsayable', () => {
    expect(replyGate(session(), 'press', null)).toBe('changed');
    expect(replyGate(session({ status: 'idle' }), 'say', null)).toBe('unsayable');
  });

  it('names the two agents it may reach', () => {
    expect(replyAgentOf(session({ agent: 'claude' }))).toBe('claude');
    expect(replyAgentOf(session({ agent: 'codex' }))).toBe('codex');
  });
});
