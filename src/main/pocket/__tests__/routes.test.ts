/**
 * The closed route table and the answers it composes (Phase 313).
 *
 * Two things are proved here that reading the module cannot prove.
 *
 * THE TABLE IS CLOSED. Every shape that is nearly a route — a trailing slash, a
 * different case, a longer path with the same prefix, the right path with the
 * wrong method — is driven and must answer null. A table with a default arm or
 * a prefix match passes none of these.
 *
 * THE ORDER IS RE-DERIVED. The blocked list is composed a second time by this
 * file, with its own filter and its own sort over the same sessions, and held
 * equal to the route's rows INCLUDING THE ORDER. And the expected disagreement
 * is asserted as one: the fixture is built so that newest-blocked-first and a
 * naive name sort give DIFFERENT answers, so a route that had quietly stopped
 * sorting could not pass by accident.
 *
 * Nothing here opens a socket, reads a file or touches Electron.
 */

import { describe, expect, it } from 'vitest';
import type { Project, Session } from '@shared/types';
import { POCKET_ROUTE_IDS } from '@shared/ipc/pocket';
import { MAX_TURN_LIMIT } from '../../overview/turn-view';
import {
  POCKET_DEFAULT_TURN_LIMIT,
  POCKET_ROUTES,
  createPocketRoutes,
  matchPocketRoute,
  pocketRouteIds,
  pocketRouteIdsAgree,
  pocketTableIsReadOnly,
  type PocketFacts,
  type PocketRoute
} from '../routes';

function session(over: Partial<Session> & Pick<Session, 'id' | 'name'>): Session {
  return {
    tmuxName: over.name.toLowerCase().replace(/\s+/g, '-'),
    projectPath: '/Users/x/work/alpha',
    cwd: '/Users/x/work/alpha',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1,
    ...over
  } as Session;
}

const PROJECTS: Project[] = [
  { id: 'p1', path: '/Users/x/work/alpha', name: 'alpha' },
  { id: 'p2', path: '/Users/x/work/beta', name: 'Beta Renamed' }
];

/**
 * Four blocked sessions and two that are not.
 *
 * The blocked four are named so that "newest blocked first" and "sorted by
 * name" are DIFFERENT orders. That difference is what makes the re-derivation
 * below mean something.
 */
const SESSIONS: Session[] = [
  session({ id: 'a', name: 'aardvark', createdAt: 10 }),
  session({ id: 'b', name: 'bison', projectPath: '/Users/x/work/beta', createdAt: 20 }),
  session({ id: 'c', name: 'cheetah', createdAt: 30 }),
  session({ id: 'd', name: 'dingo', projectPath: '/Users/x/work/gamma', createdAt: 40 }),
  session({ id: 'e', name: 'elk', status: 'running', createdAt: 50 }),
  session({ id: 'f', name: 'fox', status: 'idle', createdAt: 60 })
];

/**
 * `d` is the NEWEST blocked and `a` the oldest, which is the exact inverse of
 * the name sort. That inversion is deliberate: it is what makes the
 * re-derivation below able to fail.
 */
const BLOCKED_SINCE = new Map<string, number>([
  ['a', 1_000],
  ['b', 2_000],
  ['c', 3_000],
  ['d', 4_000]
]);

function facts(over: Partial<PocketFacts> = {}): PocketFacts {
  return {
    sessions: () => SESSIONS,
    projects: () => PROJECTS,
    blockedSince: () => BLOCKED_SINCE,
    activity: (id) =>
      id === 'a'
        ? {
            question: 'May I run the tests?',
            choice: {
              atChoice: true,
              options: [
                { marker: '1', text: 'Yes' },
                { marker: '2', text: 'No, and tell Claude what to do' }
              ]
            }
          }
        : undefined,
    statusWord: (s) =>
      s.status === 'needs_input'
        ? { dot: 'attention', label: 'needs input' }
        : s.status === 'running'
          ? { dot: 'working', label: 'working' }
          : { dot: 'idle', label: 'idle' },
    agentLabel: (id) => (id === 'claude' ? 'Claude Code' : id),
    machineLabel: () => null,
    emptyLine: 'Nothing needs you',
    catchUp: async () => ({ ask: 'wire the door', outcome: 'Done, and git agrees' }),
    lastTurn: async () => ({ answerText: 'the door is wired', turnCount: 7 }),
    turns: async () => ({
      turns: [
        {
          index: 1,
          askText: 'wire the door',
          askClipped: false,
          askAt: null,
          answerText: 'done',
          answerClipped: false,
          answerAt: null,
          closed: true,
          interrupted: false,
          notice: null
        }
      ],
      more: false
    }),
    handoff: () => null,
    now: () => 123_456,
    ...over
  };
}

// ---------------------------------------------------------------------------

describe('the table is closed', () => {
  it('holds exactly the ids the contract names, and no more', () => {
    expect(pocketRouteIdsAgree()).toBe(true);
    expect([...pocketRouteIds()].sort()).toEqual([...POCKET_ROUTE_IDS].sort());
    expect(POCKET_ROUTES).toHaveLength(4);
  });

  it('cannot be pushed onto at run time', () => {
    expect(Object.isFrozen(POCKET_ROUTES)).toBe(true);
    expect(() =>
      (POCKET_ROUTES as PocketRoute[]).push({
        id: 'blocked',
        method: 'POST',
        path: '/v1/end',
        reads: false,
        windowOnly: false,
        signed: true
      })
    ).toThrow();
    expect(POCKET_ROUTES).toHaveLength(4);
    expect(matchPocketRoute('POST', '/v1/end')).toBeNull();
  });

  it('holds NO write route in this phase', () => {
    expect(pocketTableIsReadOnly()).toBe(true);
    expect(POCKET_ROUTES.every((r) => r.reads)).toBe(true);
  });

  it('matches only on exact equality of method AND path', () => {
    expect(matchPocketRoute('GET', '/v1/blocked')?.id).toBe('blocked');
    for (const near of [
      '/v1/blocked/',
      '/v1/Blocked',
      '/v1/blocked/extra',
      '/v1',
      '/v1/blockedx',
      '//v1/blocked',
      '/',
      '',
      '/pair/',
      '/v1/turns/1'
    ]) {
      expect(matchPocketRoute('GET', near)).toBeNull();
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'get']) {
      expect(matchPocketRoute(method, '/v1/blocked')).toBeNull();
    }
    // The pairing route is a POST and only a POST.
    expect(matchPocketRoute('POST', '/pair')?.id).toBe('pair');
    expect(matchPocketRoute('GET', '/pair')).toBeNull();
  });

  it('marks the pairing route window-only and unsigned, and the reads signed', () => {
    const pair = POCKET_ROUTES.find((r) => r.id === 'pair');
    expect(pair?.windowOnly).toBe(true);
    expect(pair?.signed).toBe(false);
    for (const id of ['blocked', 'session', 'turns'] as const) {
      const route = POCKET_ROUTES.find((r) => r.id === id);
      expect(route?.windowOnly).toBe(false);
      expect(route?.signed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe('the blocked list', () => {
  it('holds exactly the blocked sessions, newest blocked first', () => {
    const answer = createPocketRoutes(facts()).blocked();
    expect(answer.rows.map((r) => r.sessionId)).toEqual(['d', 'c', 'b', 'a']);
    expect(answer.at).toBe(123_456);
  });

  it('agrees with a list this test composed itself, order included', () => {
    // The re-derivation: a second filter and a second sort, written here.
    const mine = SESSIONS.filter((s) => s.status === 'needs_input')
      .map((s) => ({ id: s.id, since: BLOCKED_SINCE.get(s.id) ?? s.createdAt }))
      .sort((x, y) => y.since - x.since)
      .map((r) => r.id);
    const theirs = createPocketRoutes(facts())
      .blocked()
      .rows.map((r) => r.sessionId);
    expect(theirs).toEqual(mine);
    // And the expected DISAGREEMENT, asserted as one: a naive name sort gives
    // a different answer, so this test cannot pass by reading nothing.
    const byName = SESSIONS.filter((s) => s.status === 'needs_input')
      .slice()
      .sort((x, y) => (x.name < y.name ? -1 : 1))
      .map((s) => s.id);
    expect(byName).not.toEqual(theirs);
  });

  it('names the project by its drawn name, and falls back to the folder', () => {
    const rows = createPocketRoutes(facts()).blocked().rows;
    expect(rows.find((r) => r.sessionId === 'b')?.project).toBe('Beta Renamed');
    // `gamma` has no project row: the session is still blocked and still gets
    // a name, which is the folder the path points at.
    expect(rows.find((r) => r.sessionId === 'd')?.project).toBe('gamma');
  });

  it('carries the drawn status word and the agent label, never a raw id', () => {
    const row = createPocketRoutes(facts()).blocked().rows[0];
    expect(row?.sessionId).toBe('d');
    expect(row?.statusLabel).toBe('needs input');
    expect(row?.statusDot).toBe('attention');
    expect(row?.agent).toBe('claude');
    expect(row?.agentLabel).toBe('Claude Code');
  });

  it('carries the question and the agent own markers, not indexes', () => {
    const rows = createPocketRoutes(facts()).blocked().rows;
    const row = rows.find((r) => r.sessionId === 'a');
    expect(row?.question).toBe('May I run the tests?');
    expect(row?.choices.map((c) => c.marker)).toEqual(['1', '2']);
    expect(row?.choices[1]?.text).toBe('No, and tell Claude what to do');
    // A row with no question reads null rather than an empty string.
    const other = rows.find((r) => r.sessionId === 'b');
    expect(other?.question).toBeNull();
    expect(other?.choices).toEqual([]);
  });

  it('reads the feed EMPTY STRING clear as no question', () => {
    const answer = createPocketRoutes(
      facts({ activity: () => ({ question: '' }) })
    ).blocked();
    expect(answer.rows.every((r) => r.question === null)).toBe(true);
  });

  it('draws no options while the row is not at a choice', () => {
    const answer = createPocketRoutes(
      facts({ activity: () => ({ question: 'q', choice: { atChoice: false } }) })
    ).blocked();
    expect(answer.rows.every((r) => r.choices.length === 0)).toBe(true);
  });

  it('carries the empty line it was handed, and never spells its own', () => {
    const answer = createPocketRoutes(
      facts({ sessions: () => [], emptyLine: 'Nothing needs you' })
    ).blocked();
    expect(answer.rows).toEqual([]);
    expect(answer.emptyLine).toBe('Nothing needs you');
  });
});

// ---------------------------------------------------------------------------

describe('one session', () => {
  it('answers null for a session id nobody has', async () => {
    expect(await createPocketRoutes(facts()).session('nope')).toBeNull();
  });

  it('carries the row, the Catch Me Up line and the last answer', async () => {
    const answer = await createPocketRoutes(facts()).session('a');
    expect(answer?.session.name).toBe('aardvark');
    expect(answer?.session.catchUp).toEqual({
      ask: 'wire the door',
      outcome: 'Done, and git agrees'
    });
    expect(answer?.session.lastAnswer).toBe('the door is wired');
    expect(answer?.session.turnCount).toBe(7);
    expect(answer?.session.handoff).toBeNull();
  });

  it('answers about a session that is NOT blocked', async () => {
    const answer = await createPocketRoutes(facts()).session('e');
    expect(answer?.session.statusLabel).toBe('working');
    // It has never been blocked, so its stamp is its own creation clock.
    expect(answer?.session.blockedSince).toBe(50);
  });
});

// ---------------------------------------------------------------------------

describe('the turns', () => {
  it('answers null for a session id nobody has', async () => {
    expect(
      await createPocketRoutes(facts()).turns('nope', {})
    ).toBeNull();
  });

  it('asks for the default when no limit is given', async () => {
    let asked: { limit: number; from: number | null; to: number | null } | null =
      null;
    await createPocketRoutes(
      facts({
        turns: async (_id, range) => {
          asked = range;
          return { turns: [], more: false };
        }
      })
    ).turns('a', {});
    expect(asked).toEqual({
      limit: POCKET_DEFAULT_TURN_LIMIT,
      from: null,
      to: null
    });
  });

  it('passes a range through, and refuses nonsense by falling back', async () => {
    const seen: unknown[] = [];
    const routes = createPocketRoutes(
      facts({
        turns: async (_id, range) => {
          seen.push(range);
          return { turns: [], more: false };
        }
      })
    );
    await routes.turns('a', { limit: '5', from: '10', to: '20' });
    await routes.turns('a', { limit: 'lots', from: 'x', to: null });
    await routes.turns('a', { limit: '-3' });
    expect(seen[0]).toEqual({ limit: 5, from: 10, to: 20 });
    expect(seen[1]).toEqual({
      limit: POCKET_DEFAULT_TURN_LIMIT,
      from: null,
      to: null
    });
    expect(seen[2]).toEqual({
      limit: POCKET_DEFAULT_TURN_LIMIT,
      from: null,
      to: null
    });
  });

  // THE CLAMP, AND IT IS AT THE DOOR. The fix round measured that nothing
  // clamped it anywhere: the door handed `Math.floor(asked)` on, and the store's
  // `listTurns` puts its limit into a SQL `LIMIT ?` with no clamp of its own —
  // `MAX_TURN_LIMIT` is applied in `../../overview/service.ts` and
  // `timeline.ts`, neither of which this door goes through. So `?limit=1e9` on
  // the one route that answers a person's own conversation read the whole thing.
  it('clamps the limit to the store’s own ceiling, whatever was asked for', async () => {
    const seen: { limit: number }[] = [];
    const routes = createPocketRoutes(
      facts({
        turns: async (_id, range) => {
          seen.push({ limit: range.limit });
          return { turns: [], more: false };
        }
      })
    );
    for (const asked of ['201', '1e9', '999999999', '9007199254740993', '200']) {
      await routes.turns('a', { limit: asked });
    }
    expect(seen.map((s) => s.limit)).toEqual([
      MAX_TURN_LIMIT,
      MAX_TURN_LIMIT,
      MAX_TURN_LIMIT,
      MAX_TURN_LIMIT,
      MAX_TURN_LIMIT
    ]);
    expect(MAX_TURN_LIMIT).toBe(200);
  });

  it('falls back to the default for everything that is not a positive number', async () => {
    const seen: number[] = [];
    const routes = createPocketRoutes(
      facts({
        turns: async (_id, range) => {
          seen.push(range.limit);
          return { turns: [], more: false };
        }
      })
    );
    for (const asked of ['-5', 'Infinity', 'NaN', '', '0']) {
      await routes.turns('a', { limit: asked });
    }
    await routes.turns('a', {});
    expect(seen).toEqual(new Array(6).fill(POCKET_DEFAULT_TURN_LIMIT));
  });

  it('hands the store rows over unchanged, and never clips them again', async () => {
    const answer = await createPocketRoutes(facts()).turns('a', {});
    expect(answer?.turns).toHaveLength(1);
    expect(answer?.turns[0]?.askText).toBe('wire the door');
    expect(answer?.more).toBe(false);
  });
});
