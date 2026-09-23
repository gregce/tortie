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
import {
  NEEDS_YOUR_INPUT,
  NOTHING_NEEDS_YOU,
  WAKE_WINDOW_MS,
  attentionRows,
  blockedAge,
  blockedSince,
  type WakeWindow
} from '../attention';

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

/**
 * THE ONE AGE FUNCTION (Phase 314).
 *
 * The poll does not run while the Mac sleeps, so a wait first seen on the wake
 * tick is stamped then, and its age is the wake's rather than its own. Every
 * surface that draws an age reads `blockedAge`, so these pin both edges of the
 * window, the stamp from before a sleep, and a second sleep. Each `it` below
 * goes red if the comparison it names is moved: `>=` to `>` fails the first
 * edge, `<=` to `<` fails the second, and a window that ignored `resumedAt`
 * fails the stamp from before the sleep.
 */
describe('blockedAge', () => {
  const EIGHT_HOURS = 8 * 60 * 60_000;
  const suspendedAt = 1_700_000_000_000;
  const resumedAt = suspendedAt + EIGHT_HOURS;
  const wake: WakeWindow = { suspendedAt, resumedAt };

  it('is fifteen seconds, chosen and stated', () => {
    expect(WAKE_WINDOW_MS).toBe(15_000);
  });

  it('reads a stamp at the resume, and at exactly resume + 15,000 ms, as seen at the wake', () => {
    expect(blockedAge(resumedAt, [wake]).seenAtWake).toBe(true);
    expect(blockedAge(resumedAt + 4_000, [wake]).seenAtWake).toBe(true);
    expect(blockedAge(resumedAt + WAKE_WINDOW_MS, [wake]).seenAtWake).toBe(true);
  });

  it('reads a stamp at resume + 15,001 ms as an ordinary wait', () => {
    expect(blockedAge(resumedAt + WAKE_WINDOW_MS + 1, [wake]).seenAtWake).toBe(false);
  });

  it('keeps the true age of a wait stamped before the sleep', () => {
    // Stamped two seconds before the suspend: the process did not restart, so
    // the stamp is true and it is NOT one the wake gathered.
    expect(blockedAge(suspendedAt - 2_000, [wake])).toEqual({
      since: suspendedAt - 2_000,
      seenAtWake: false
    });
    // And one millisecond before the resume, which is still before it.
    expect(blockedAge(resumedAt - 1, [wake]).seenAtWake).toBe(false);
  });

  it('answers the stamp itself as `since`, never a wake time', () => {
    expect(blockedAge(resumedAt + 7, [wake]).since).toBe(resumedAt + 7);
  });

  it('reads nothing as seen at a wake when there has been no wake', () => {
    expect(blockedAge(resumedAt, []).seenAtWake).toBe(false);
  });

  it('asks every remembered wake, not only the last', () => {
    const first: WakeWindow = { suspendedAt: 1_000, resumedAt: 100_000 };
    const second: WakeWindow = { suspendedAt: 200_000, resumedAt: 900_000 };
    expect(blockedAge(100_000 + 3_000, [first, second]).seenAtWake).toBe(true);
    expect(blockedAge(900_000 + 3_000, [first, second]).seenAtWake).toBe(true);
    expect(blockedAge(500_000, [first, second]).seenAtWake).toBe(false);
  });

  it('takes a resume whose suspend was never heard', () => {
    expect(blockedAge(5_000, [{ suspendedAt: null, resumedAt: 5_000 }]).seenAtWake).toBe(true);
  });
});

describe('the words main says about the blocked set', () => {
  it('are spelled once, in the sentinel’s own words', () => {
    expect(NEEDS_YOUR_INPUT).toBe('Needs your input');
    expect(NOTHING_NEEDS_YOU).toBe('Nothing needs you');
  });
});
