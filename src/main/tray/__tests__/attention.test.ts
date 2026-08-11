/**
 * The menu-bar sentinel's data (Phase 12.85).
 *
 * The status item is allowed to say exactly one thing — which sessions are
 * blocked on a human, across every project, newest first — so these tests pin
 * that: nothing else gets in, the ordering matches what ⌘J shows, and the
 * "since" stamp survives the once-a-second refresh instead of resetting the
 * order every tick.
 */

import { describe, expect, it } from 'vitest';
import type { Project, Session, SessionStatus } from '@shared/types';
import { attentionRows, blockedSince } from '../attention';

function session(
  id: string,
  name: string,
  projectPath: string,
  status: SessionStatus,
  createdAt = 1_000
): Session {
  return {
    id,
    name,
    tmuxName: name,
    projectPath,
    cwd: projectPath,
    agent: 'claude',
    status,
    createdAt
  };
}

const projects: Project[] = [
  { id: 'p1', path: '/repos/tortie', name: 'tortie' },
  { id: 'p2', path: '/repos/other', name: 'other' }
];

describe('blockedSince', () => {
  it('stamps a newly blocked session and keeps the stamp on later ticks', () => {
    const s = [session('a', 'impl', '/repos/tortie', 'needs_input')];
    const first = blockedSince(new Map(), s, 100);
    expect(first.get('a')).toBe(100);
    // Same session, one second later: the stamp must NOT move, or the menu
    // would reshuffle under the pointer every tick.
    expect(blockedSince(first, s, 1_100).get('a')).toBe(100);
  });

  it('forgets a session that stopped needing input, and re-stamps a relapse', () => {
    const blocked = [session('a', 'impl', '/repos/tortie', 'needs_input')];
    const working = [session('a', 'impl', '/repos/tortie', 'running')];
    const first = blockedSince(new Map(), blocked, 100);
    const cleared = blockedSince(first, working, 200);
    expect(cleared.has('a')).toBe(false);
    expect(blockedSince(cleared, blocked, 300).get('a')).toBe(300);
  });
});

describe('attentionRows', () => {
  const sessions = [
    session('a', 'impl', '/repos/tortie', 'needs_input'),
    session('b', 'tests', '/repos/tortie', 'running'),
    session('c', 'review', '/repos/other', 'needs_input'),
    session('d', 'old', '/repos/other', 'idle'),
    session('e', 'dead', '/repos/other', 'exited')
  ];

  it('lists only blocked sessions, across every project, newest first', () => {
    const since = new Map([
      ['a', 500],
      ['c', 900]
    ]);
    expect(attentionRows(sessions, projects, since)).toEqual([
      { sessionId: 'c', label: 'review — other', since: 900 },
      { sessionId: 'a', label: 'impl — tortie', since: 500 }
    ]);
  });

  it('falls back to createdAt when a session has no stamp yet', () => {
    const rows = attentionRows(
      [session('a', 'impl', '/repos/tortie', 'needs_input', 4_242)],
      projects,
      new Map()
    );
    expect(rows[0]?.since).toBe(4_242);
  });

  it('names the project even when its tab is closed', () => {
    const rows = attentionRows(
      [session('a', 'impl', '/repos/closed-tab', 'needs_input')],
      projects,
      new Map()
    );
    expect(rows[0]?.label).toBe('impl — closed-tab');
  });

  it('says nothing at all when nothing is blocked', () => {
    expect(attentionRows([sessions[1]!], projects, new Map())).toEqual([]);
  });
});
