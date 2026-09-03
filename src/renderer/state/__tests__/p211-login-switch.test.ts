/**
 * Phase 211, fix round. Which sessions a login switch reached, and what the
 * control beside the sentence does to them.
 */

import { describe, expect, it } from 'vitest';
import type { Session } from '@shared/types';
import {
  offerRestartNow,
  sessionsReachedBySwitch,
  switchedLine
} from '../login-switch';

function session(over: Partial<Session>): Session {
  return {
    id: over.id ?? 'id',
    name: 'x',
    tmuxName: 'x',
    projectPath: '/p',
    cwd: '/p',
    agent: 'codex',
    status: 'idle',
    createdAt: 0,
    ...over
  };
}

describe('sessionsReachedBySwitch', () => {
  const all: Session[] = [
    session({ id: 'idle-default', status: 'idle' }),
    session({ id: 'running-default', status: 'running' }),
    session({ id: 'needs-default', status: 'needs_input' }),
    session({ id: 'named-default', login: 'Default' }),
    session({ id: 'on-chosen', login: 'work' }),
    session({ id: 'on-other', login: 'home' }),
    session({ id: 'exited', status: 'exited' }),
    session({ id: 'restorable', status: 'restorable' }),
    session({ id: 'other-agent', agent: 'claude' }),
    session({ id: 'elsewhere', machine: { id: 'm1', label: 'box' } as unknown as Session['machine'] })
  ];

  it('is every live session under the default or the chosen login, on this Mac', () => {
    const ids = sessionsReachedBySwitch(all, 'codex', 'work').map((s) => s.id);
    expect(ids).toEqual(['idle-default', 'running-default', 'needs-default', 'named-default', 'on-chosen']);
  });

  it('includes a session idle at its prompt, which is the one a person restarts', () => {
    const ids = sessionsReachedBySwitch(all, 'codex', 'work').map((s) => s.id);
    expect(ids).toContain('idle-default');
  });

  it('leaves a session on some other login alone, because its store was not written', () => {
    const ids = sessionsReachedBySwitch(all, 'codex', 'work').map((s) => s.id);
    expect(ids).not.toContain('on-other');
  });

  it('matches the chosen name without regard to case', () => {
    const ids = sessionsReachedBySwitch(all, 'codex', 'WORK').map((s) => s.id);
    expect(ids).toContain('on-chosen');
  });
});

describe('offerRestartNow', () => {
  it('says the switch landed and restarts each reached session under the chosen login', () => {
    const toasts: { text: string; action?: { label: string; run: () => void } }[] = [];
    const restarted: [string, unknown][] = [];
    offerRestartNow(
      {
        sessions: [session({ id: 'a' }), session({ id: 'b', login: 'work' }), session({ id: 'c', login: 'home' })],
        toast: (_kind, text, opts) => {
          toasts.push({ text, ...(opts?.action !== undefined ? { action: opts.action } : {}) });
        },
        restartSession: async (id, options) => {
          restarted.push([id, options]);
        }
      },
      'codex',
      'work'
    );
    expect(toasts.length).toBe(1);
    expect(toasts[0]?.text).toBe(switchedLine('work'));
    expect(toasts[0]?.action?.label).toBe('Restart now');
    toasts[0]?.action?.run();
    expect(restarted).toEqual([
      ['a', { underChosenLogin: true }],
      ['b', { underChosenLogin: true }]
    ]);
  });

  it('says nothing when no session was reached', () => {
    let said = 0;
    offerRestartNow(
      {
        sessions: [session({ id: 'c', login: 'home' })],
        toast: () => {
          said += 1;
        },
        restartSession: async () => undefined
      },
      'codex',
      'work'
    );
    expect(said).toBe(0);
  });

  it('names the timing for the platform in the sentence', () => {
    expect(switchedLine('work', true)).toContain('about half a minute');
    expect(switchedLine('work', false)).toContain('next message');
  });
});
