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
  readTurnRange,
  type PocketFacts,
  type PocketRoute
} from '../routes';
import { POCKET_AGE_HONESTY, POCKET_OTHERS_MAX } from '@shared/ipc/pocket';
import { OUTCOME_REMOTE } from '@shared/overview-copy';
import type { OverviewSessionActivity } from '@shared/overview';

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
    wakes: () => [],
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
          notice: null,
          absence: null
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

  // PHASE 316. A limit that is not a number still falls back to the default,
  // because a smaller or larger page is still the page asked for. An INDEX that
  // is not a turn index is refused instead: a fallback would answer a page the
  // phone did not ask for, and the phone would stitch it in as if it had. This
  // test was "refuses nonsense by falling back" until Phase 316, and `-5` and
  // 2^53 went straight through to the store.
  it('passes a range through, falls back on a bad limit, and refuses a bad index', async () => {
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
    await routes.turns('a', { limit: 'lots', to: null });
    await routes.turns('a', { limit: '-3' });
    await routes.turns('a', { to: '7' });
    await routes.turns('a', { from: '3' });
    expect(seen).toEqual([
      { limit: 5, from: 10, to: 20 },
      { limit: POCKET_DEFAULT_TURN_LIMIT, from: null, to: null },
      { limit: POCKET_DEFAULT_TURN_LIMIT, from: null, to: null },
      { limit: POCKET_DEFAULT_TURN_LIMIT, from: null, to: 7 },
      { limit: POCKET_DEFAULT_TURN_LIMIT, from: 3, to: null }
    ]);
    const before = seen.length;
    for (const bad of [
      { from: 'x' },
      { to: '-1' },
      { from: '-5', to: '3' },
      { to: '1.5' },
      { to: '1e3' },
      { to: '0x10' },
      { to: ' 7' },
      { to: '07' },
      { to: String(2 ** 53) },
      { to: '99999999999999999999' },
      { from: '10', to: '9' }
    ]) {
      expect(await routes.turns('a', bad), JSON.stringify(bad)).toBeNull();
    }
    // Refused BEFORE anything is read.
    expect(seen).toHaveLength(before);
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

// ---------------------------------------------------------------------------

/**
 * Phase 314. The door answers `seenAtWake` from the ONE age function, so the
 * push alert, which reads the same row, cannot disagree with it. The fixture's
 * stamps are 1,000 to 4,000; a wake resumed at 2,500 gathers `c` (3,000) and
 * `d` (4,000) and not `a` or `b`, which were stamped before it.
 */
describe('seen at the wake', () => {
  it('is false on every row when there has been no wake', () => {
    const rows = createPocketRoutes(facts()).blocked().rows;
    expect(rows.every((r) => r.seenAtWake === false)).toBe(true);
  });

  it('marks exactly the rows first seen inside the window after a resume', () => {
    const rows = createPocketRoutes(
      facts({ wakes: () => [{ suspendedAt: 100, resumedAt: 2_500 }] })
    ).blocked().rows;
    expect(Object.fromEntries(rows.map((r) => [r.sessionId, r.seenAtWake]))).toEqual({
      d: true,
      c: true,
      b: false,
      a: false
    });
    // `blockedSince` is untouched: the row still carries the stamp itself.
    expect(rows.find((r) => r.sessionId === 'd')?.blockedSince).toBe(4_000);
  });

  it('stops at the window’s edge, fifteen seconds after the resume', () => {
    const rows = createPocketRoutes(
      facts({ wakes: () => [{ suspendedAt: null, resumedAt: 4_000 - 15_001 }] })
    ).blocked().rows;
    expect(rows.find((r) => r.sessionId === 'd')?.seenAtWake).toBe(false);
    const edge = createPocketRoutes(
      facts({ wakes: () => [{ suspendedAt: null, resumedAt: 4_000 - 15_000 }] })
    ).blocked().rows;
    expect(edge.find((r) => r.sessionId === 'd')?.seenAtWake).toBe(true);
  });

  it('carries it on one session too', async () => {
    const answer = await createPocketRoutes(
      facts({ wakes: () => [{ suspendedAt: 100, resumedAt: 900 }] })
    ).session('a');
    expect(answer?.session.seenAtWake).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 316: every session, the words main draws, and fresh before read
// ---------------------------------------------------------------------------

const MIN = 60_000;

describe('others: every listed session that is not waiting (Phase 316)', () => {
  it('is exactly the complement of the blocked rows, by id', () => {
    const answer = createPocketRoutes(facts()).blocked();
    const blocked = answer.rows.map((r) => r.sessionId);
    const others = answer.others.map((r) => r.sessionId);
    // RE-DERIVED here, with this test's own filter.
    const mine = SESSIONS.filter((s) => s.status !== 'needs_input').map((s) => s.id);
    expect([...others].sort()).toEqual([...mine].sort());
    expect(blocked.filter((id) => others.includes(id))).toEqual([]);
    expect(blocked.length + others.length).toBe(SESSIONS.length);
    expect(answer.othersOmitted).toBe(0);
  });

  it('orders newest output first, then the unseen newest created, the id breaking ties', () => {
    const sessions: Session[] = [
      session({ id: 'z-old-seen', name: 'one', status: 'idle', createdAt: 900 }),
      session({ id: 'y-new-seen', name: 'two', status: 'running', createdAt: 100 }),
      session({ id: 'x-unseen-new', name: 'three', status: 'exited', createdAt: 800 }),
      session({ id: 'w-unseen-old', name: 'four', status: 'idle', createdAt: 200 }),
      session({ id: 'b-tie', name: 'five', status: 'idle', createdAt: 500 }),
      session({ id: 'a-tie', name: 'six', status: 'idle', createdAt: 500 }),
      session({ id: 'blocked', name: 'seven', status: 'needs_input', createdAt: 50 })
    ];
    const lastOutput = new Map([
      ['z-old-seen', 1_000],
      ['y-new-seen', 5_000]
    ]);
    const answer = createPocketRoutes(
      facts({
        sessions: () => sessions,
        activity: (id) =>
          lastOutput.has(id) ? { lastActivityAt: lastOutput.get(id) as number } : undefined
      })
    ).blocked();
    expect(answer.rows.map((r) => r.sessionId)).toEqual(['blocked']);
    expect(answer.others.map((r) => r.sessionId)).toEqual([
      'y-new-seen',
      'z-old-seen',
      'x-unseen-new',
      'a-tie',
      'b-tie',
      'w-unseen-old'
    ]);
  });

  it('holds at most POCKET_OTHERS_MAX and says how many it left out', () => {
    const many: Session[] = [];
    for (let i = 0; i < POCKET_OTHERS_MAX + 7; i += 1) {
      many.push(session({ id: `s${String(i).padStart(4, '0')}`, name: `n${i}`, status: 'idle', createdAt: i }));
    }
    const answer = createPocketRoutes(facts({ sessions: () => many })).blocked();
    expect(POCKET_OTHERS_MAX).toBe(200);
    expect(answer.others).toHaveLength(POCKET_OTHERS_MAX);
    expect(answer.othersOmitted).toBe(7);
    // Newest created first, so the seven left out are the seven oldest.
    expect(answer.others[0]?.sessionId).toBe(`s${String(POCKET_OTHERS_MAX + 6).padStart(4, '0')}`);
    expect(answer.others.some((r) => r.sessionId === 's0000')).toBe(false);
  });

  it('hands over the age sentence Phase 314 spelled, never a second spelling', () => {
    expect(createPocketRoutes(facts()).blocked().ageNote).toBe(POCKET_AGE_HONESTY);
  });
});

describe('the words main draws (Phase 316)', () => {
  it('raises the status word into a title with the one shared rule', () => {
    const answer = createPocketRoutes(
      facts({
        statusWord: (s) =>
          s.status === 'needs_input'
            ? { dot: 'attention', label: 'needs input' }
            : { dot: 'failed', label: 'failed (exit 1)' }
      })
    ).blocked();
    expect(answer.rows[0]?.statusTitle).toBe('Needs input');
    expect(answer.others[0]?.statusTitle).toBe('Failed (exit 1)');
    // The lowercase word is still on the row, untouched.
    expect(answer.others[0]?.statusLabel).toBe('failed (exit 1)');
  });

  it('ages a waiting row from its wait and any other row from its last output', () => {
    const at = 10 * 60 * MIN;
    const answer = createPocketRoutes(
      facts({
        now: () => at,
        blockedSince: () => new Map([['a', at - 4 * MIN], ['b', at - 30_000], ['c', at - 3 * 60 * MIN], ['d', at - 2 * 24 * 60 * MIN]]),
        activity: (id) => (id === 'e' ? { lastActivityAt: at - 9 * MIN } : undefined)
      })
    ).blocked();
    const age = (id: string): string | undefined =>
      [...answer.rows, ...answer.others].find((r) => r.sessionId === id)?.ageText;
    expect(age('a')).toBe('4m');
    expect(age('b')).toBe('now');
    expect(age('c')).toBe('3h');
    expect(age('d')).toBe('2d');
    // `e` is running: its last output. `f` has none: its creation, at 60 ms,
    // which is 60 ms short of ten hours before `at`, so one unit, floored.
    expect(age('e')).toBe('9m');
    expect(age('f')).toBe('9h');
    expect(answer.at).toBe(at);
  });

  it('marks only a WAITING row as seen at the wake', () => {
    // `f` was created (60) inside a wake window that also covers `a` (1,000).
    const rows = createPocketRoutes(
      facts({ wakes: () => [{ suspendedAt: null, resumedAt: 50 }] })
    ).blocked();
    expect(rows.rows.find((r) => r.sessionId === 'a')?.seenAtWake).toBe(true);
    expect(rows.others.find((r) => r.sessionId === 'f')?.seenAtWake).toBe(false);
    expect(rows.others.find((r) => r.sessionId === 'e')?.seenAtWake).toBe(false);
  });
});

describe('the turn range, read before anything is read (Phase 316)', () => {
  it('names why a page is refused', () => {
    expect(readTurnRange({})).toEqual({ ok: true, from: null, to: null });
    expect(readTurnRange({ from: '', to: '' })).toEqual({ ok: true, from: null, to: null });
    expect(readTurnRange({ from: '0', to: String(Number.MAX_SAFE_INTEGER) })).toEqual({
      ok: true,
      from: 0,
      to: Number.MAX_SAFE_INTEGER
    });
    expect(readTurnRange({ from: '4', to: '4' })).toEqual({ ok: true, from: 4, to: 4 });
    expect(readTurnRange({ to: '-1' })).toEqual({ ok: false, reason: 'index' });
    expect(readTurnRange({ to: String(2 ** 53) })).toEqual({ ok: false, reason: 'index' });
    expect(readTurnRange({ from: '5', to: '4' })).toEqual({ ok: false, reason: 'backwards' });
  });
});

describe('fresh before read (Phase 316)', () => {
  const ACTIVITY: OverviewSessionActivity = {
    sessionId: 'a',
    coverage: 'complete',
    reason: null,
    userMessages: 20,
    agentMessages: 21,
    lastMessageAt: 123_456 - 2 * MIN,
    lastMessageBy: 'you',
    lastMessageClock: 'message',
    readAt: 123_456
  };

  it('refreshes before every read of the conversation, and carries the counts', async () => {
    const log: string[] = [];
    const routes = createPocketRoutes(
      facts({
        refresh: async (id) => {
          log.push(`refresh:${id}`);
          return ACTIVITY;
        },
        catchUp: async (id) => {
          log.push(`catchUp:${id}`);
          return null;
        },
        lastTurn: async (id) => {
          log.push(`lastTurn:${id}`);
          return { answerText: null, turnCount: 0 };
        },
        turns: async (id) => {
          log.push(`turns:${id}`);
          return { turns: [], more: false };
        }
      })
    );
    const answer = await routes.session('a');
    await routes.turns('a', {});
    expect(log).toEqual(['refresh:a', 'catchUp:a', 'lastTurn:a', 'refresh:a', 'turns:a']);
    expect(answer?.session.activity).toEqual(ACTIVITY);
    expect(answer?.session.lastMessageText).toBe('2m');
  });

  it('draws no last-message age when the counts carry no time, never a zero', async () => {
    const answer = await createPocketRoutes(
      facts({
        refresh: async () => ({ ...ACTIVITY, lastMessageAt: null, lastMessageBy: null, lastMessageClock: null })
      })
    ).session('a');
    expect(answer?.session.lastMessageText).toBeNull();
    const none = await createPocketRoutes(facts()).session('a');
    expect(none?.session.activity).toBeNull();
    expect(none?.session.lastMessageText).toBeNull();
  });

  it('answers a session removed while the refresh ran as an id nobody has', async () => {
    let live = SESSIONS;
    const read: string[] = [];
    const routes = createPocketRoutes(
      facts({
        sessions: () => live,
        refresh: async () => {
          live = SESSIONS.filter((s) => s.id !== 'a');
          await Promise.resolve();
          return null;
        },
        catchUp: async () => {
          read.push('catchUp');
          return null;
        },
        turns: async () => {
          read.push('turns');
          return { turns: [], more: false };
        }
      })
    );
    expect(await routes.session('a')).toBeNull();
    live = SESSIONS;
    expect(await routes.turns('a', {})).toBeNull();
    expect(read).toEqual([]);
  });

  it('answers a refresh that throws, rather than leaving the phone waiting', async () => {
    const answer = await createPocketRoutes(
      facts({
        refresh: async () => {
          throw new Error('the manifest is not open');
        }
      })
    ).session('a');
    expect(answer?.session.activity).toBeNull();
    expect(answer?.session.name).toBe('aardvark');
  });

  it('answers null, never a hang, when a read throws', async () => {
    const broken = createPocketRoutes(
      facts({
        lastTurn: async () => {
          throw new Error('store will not open');
        },
        turns: async () => {
          throw new Error('store will not open');
        }
      })
    );
    expect(await broken.session('a')).toBeNull();
    expect(await broken.turns('a', {})).toBeNull();
  });

  it('answers a remote session’s turns with main’s sentence, and reads nothing', async () => {
    const log: string[] = [];
    const remote = session({
      id: 'r',
      name: 'far',
      status: 'running',
      machine: { id: 'studio', label: 'Mac Pro', color: 'blue', answering: true, canRestore: false } as unknown as Session['machine']
    });
    const answer = await createPocketRoutes(
      facts({
        sessions: () => [...SESSIONS, remote],
        refresh: async () => {
          log.push('refresh');
          return null;
        },
        turns: async () => {
          log.push('turns');
          return { turns: [], more: true };
        }
      })
    ).turns('r', {});
    expect(answer).toEqual({ sessionId: 'r', turns: [], more: false, at: 123_456, note: OUTCOME_REMOTE });
    expect(log).toEqual([]);
  });

  it('never says more on a page that added nothing, whatever a composer says', async () => {
    const answer = await createPocketRoutes(
      facts({ turns: async () => ({ turns: [], more: true }) })
    ).turns('a', {});
    expect(answer?.more).toBe(false);
    expect(answer?.note).toBeNull();
  });

  it('answers every session with no hand-off', async () => {
    for (const s of SESSIONS) {
      expect((await createPocketRoutes(facts()).session(s.id))?.session.handoff).toBeNull();
    }
  });
});
