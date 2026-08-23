/**
 * Past Sessions row truth (Phase 29, research 39 §10).
 *
 * The promise line is the reason design B won the adversarial round: the
 * user reads BEFORE the click whether Restore continues the conversation or
 * starts fresh. These tests hold the predicate to the research's two-field
 * rule, hold the date label to `removed_at` (never `last_seen`), and hold
 * the search to a case-folded substring over name and project path that
 * never re-orders main's newest-first sort.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';
import { pastSessionPromise } from '../../state/resume';

// PastSessionsModal imports the app store, which reads window/localStorage
// as the module loads, stub the three globals first, then import (the same
// pattern src/renderer/state/__tests__/restart.test.ts uses).
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {}
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { filterPastSessions, removedDateLabel } = await import(
  '../PastSessionsModal'
);

const as = (id: string): Session['agent'] => id as Session['agent'];

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'sid',
    name: 'fix-auth',
    tmuxName: 'fix-auth',
    projectPath: '/Users/dev/gmux',
    cwd: '/Users/dev/gmux',
    agent: as('claude'),
    status: 'discarded' as Session['status'],
    createdAt: 0,
    ...over
  };
}

describe('pastSessionPromise: the before-the-click disclosure', () => {
  it('continues only when BOTH the conversation id and the armed argv exist', () => {
    expect(
      pastSessionPromise({
        agentSessionId: 'uuid-1',
        resumeArgv: ['/usr/local/bin/claude', '--resume', 'uuid-1']
      })
    ).toBe('continues');
  });

  it('an id with no argv starts fresh, nothing exists to type', () => {
    expect(pastSessionPromise({ agentSessionId: 'uuid-1' })).toBe('fresh');
  });

  it('an id with an EMPTY argv starts fresh', () => {
    expect(
      pastSessionPromise({ agentSessionId: 'uuid-1', resumeArgv: [] })
    ).toBe('fresh');
  });

  it('an argv with no id starts fresh, the two-field rule is a conjunction', () => {
    expect(
      pastSessionPromise({ resumeArgv: ['/usr/local/bin/claude'] })
    ).toBe('fresh');
  });

  it('a shell (neither field) starts fresh', () => {
    expect(pastSessionPromise({})).toBe('fresh');
  });
});

describe('removedDateLabel, from removed_at, never last_seen', () => {
  const now = new Date(2026, 7, 14).getTime();

  it('this year reads "removed Aug 12"', () => {
    expect(removedDateLabel(new Date(2026, 7, 12).getTime(), now)).toBe(
      'removed Aug 12'
    );
  });

  it('an earlier year keeps the year: "removed Aug 12, 2025"', () => {
    expect(removedDateLabel(new Date(2025, 7, 12).getTime(), now)).toBe(
      'removed Aug 12, 2025'
    );
  });

  it('no leading zero on the day', () => {
    expect(removedDateLabel(new Date(2026, 0, 3).getTime(), now)).toBe(
      'removed Jan 3'
    );
  });
});

describe('filterPastSessions, name or project path, case folded', () => {
  const rows = [
    session({ id: 'a', name: 'fix-auth', projectPath: '/Users/dev/gmux' }),
    session({ id: 'b', name: 'Migrate-Postgres', projectPath: '/Users/dev/billing' }),
    session({ id: 'c', name: 'scratch', projectPath: '/Users/dev/gmux' })
  ];

  it('an empty query returns every row in the incoming order', () => {
    expect(filterPastSessions(rows, '').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c'
    ]);
  });

  it('matches the name, case folded', () => {
    expect(filterPastSessions(rows, 'POSTGRES').map((s) => s.id)).toEqual([
      'b'
    ]);
  });

  it('matches the project path', () => {
    expect(filterPastSessions(rows, 'gmux').map((s) => s.id)).toEqual([
      'a',
      'c'
    ]);
  });

  it('never re-sorts what main sorted', () => {
    // Both rows match; the incoming (newest-removal-first) order survives.
    expect(filterPastSessions(rows, 'dev').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c'
    ]);
  });

  it('no match is an empty list, not an error', () => {
    expect(filterPastSessions(rows, 'zebra')).toEqual([]);
  });
});
