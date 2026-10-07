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

import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Project, Session } from '@shared/types';
import { POCKET_ROUTE_IDS } from '@shared/ipc/pocket';
import { MAX_TURN_LIMIT } from '../../overview/turn-view';
import {
  POCKET_DEFAULT_TURN_LIMIT,
  POCKET_ROUTES,
  clipSessionText,
  createPocketRoutes,
  isSessionsId,
  matchPocketRoute,
  pocketRouteIds,
  pocketRouteIdsAgree,
  pocketWriteRouteIds,
  readScreenQuery,
  readSessionsQuery,
  readTurnRange,
  screenLive,
  screenOf,
  type PocketFacts,
  type PocketRoute
} from '../routes';
import {
  POCKET_SESSIONS_BUDGET_BYTES,
  POCKET_SESSIONS_CHOICES_MAX,
  POCKET_SESSIONS_CLIP_CHARS,
  POCKET_SESSIONS_MAX,
  type PocketSessionsAnswer,
  type PocketSessionsRow
} from '@shared/ipc/pocket';

/**
 * PHASE 316.7. The Sessions tab's two caps, SHORTENED BY INJECTION for the
 * tests that need a cut of a few rows (build/p3167/SPEC.md §9.2, §15 F2). The
 * contract module is the real one with the two numbers read through getters,
 * so a test sets `caps.rows` or `caps.bytes` and puts it back, and every other
 * test reads the contract's own numbers. Nothing in the shipping module is a
 * seam for it: the route imports the numbers and reads each once.
 */
const caps = vi.hoisted(() => ({ rows: null as number | null, bytes: null as number | null }));
vi.mock('@shared/ipc/pocket', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shared/ipc/pocket')>();
  return {
    ...real,
    get POCKET_SESSIONS_MAX(): number {
      return caps.rows ?? real.POCKET_SESSIONS_MAX;
    },
    get POCKET_SESSIONS_BUDGET_BYTES(): number {
      return caps.bytes ?? real.POCKET_SESSIONS_BUDGET_BYTES;
    }
  };
});
import { POCKET_NO_REPLY, POCKET_WRITE_ROUTE_IDS, type PocketEndOffer, type PocketReplyOffer } from '@shared/ipc/pocket';
import type { PocketReplyDrawn } from '../routes';
import { endSessionConfirm } from '@shared/lifecycle-words';
import { POCKET_AGE_HONESTY, POCKET_OTHERS_MAX } from '@shared/ipc/pocket';
import * as DOOR_TABLE from '../door/table';
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
  // PHASE 330: the table moved to the door process's own module so it can
  // refuse a path before main is told anything. This module re-exports it, and
  // the two must be ONE table, not two that agree today.
  it('is the door process’s own table, re-exported rather than copied', () => {
    expect(POCKET_ROUTES).toBe(DOOR_TABLE.POCKET_ROUTES);
    expect(matchPocketRoute).toBe(DOOR_TABLE.matchPocketRoute);
  });

  it('holds exactly the ids the contract names, and no more', () => {
    expect(pocketRouteIdsAgree()).toBe(true);
    expect([...pocketRouteIds()].sort()).toEqual([...POCKET_ROUTE_IDS].sort());
    // Eleven since Phase 337.1's `GET /v1/scrollback`, after Phase 337's
    // `GET /v1/screen` and `POST /v1/keys`, Phase 318's `choose` and `say` and
    // Phase 316.7's `GET /v1/sessions`.
    expect(POCKET_ROUTES).toHaveLength(11);
  });

  it('cannot be pushed onto at run time', () => {
    expect(Object.isFrozen(POCKET_ROUTES)).toBe(true);
    expect(() =>
      (POCKET_ROUTES as PocketRoute[]).push({
        id: 'blocked',
        method: 'POST',
        path: '/v1/type',
        reads: false,
        windowOnly: false,
        signed: true
      })
    ).toThrow();
    // Eleven since Phase 337.1's read.
    expect(POCKET_ROUTES).toHaveLength(11);
    expect(matchPocketRoute('POST', '/v1/type')).toBeNull();
  });

  // PHASE 317 (SPEC §5.3.1, §14 finding 18) replaced the Phase 313 test "holds
  // NO write route in this phase"; PHASE 318 (build/p318/SPEC.md §5.1.1) widens
  // it to the reply's two writes, on the same door and no second family.
  // PHASE 337 (build/p337/SPEC.md §5.1, D1) adds `keys`, the fourth.
  it('holds EXACTLY four write routes, end, choose, say and keys, each a signed POST alive outside a window', () => {
    expect(pocketWriteRouteIds()).toEqual(['end', 'choose', 'say', 'keys']);
    expect([...pocketWriteRouteIds()]).toEqual([...POCKET_WRITE_ROUTE_IDS]);
    for (const route of POCKET_ROUTES) {
      if (route.reads) continue;
      expect(route.method, route.id).toBe('POST');
      expect(route.signed, route.id).toBe(true);
      expect(route.windowOnly, route.id).toBe(false);
    }
    expect(POCKET_ROUTES.filter((r) => !r.reads).map((r) => r.path)).toEqual(['/v1/end', '/v1/choose', '/v1/say', '/v1/keys']);
    // Every other row is still a read.
    expect(POCKET_ROUTES.filter((r) => r.reads).map((r) => r.id).sort()).toEqual([
      'blocked',
      'pair',
      'screen',
      'scrollback',
      'session',
      'sessions',
      'turns'
    ]);
  });

  it('matches a write only as a POST to its exact path', () => {
    expect(matchPocketRoute('POST', '/v1/end')?.id).toBe('end');
    expect(matchPocketRoute('POST', '/v1/choose')?.id).toBe('choose');
    expect(matchPocketRoute('POST', '/v1/say')?.id).toBe('say');
    expect(matchPocketRoute('POST', '/v1/keys')?.id).toBe('keys');
    for (const method of ['GET', 'PUT', 'DELETE', 'post']) {
      expect(matchPocketRoute(method, '/v1/end')).toBeNull();
      expect(matchPocketRoute(method, '/v1/choose')).toBeNull();
      expect(matchPocketRoute(method, '/v1/say')).toBeNull();
      expect(matchPocketRoute(method, '/v1/keys')).toBeNull();
    }
    for (const near of ['/v1/keys/', '/v1/Keys', '/v1/key', '/v1/keys?x', '/v1/type', '/v1/screen', '/v1/scrollback']) {
      expect(matchPocketRoute('POST', near), near).toBeNull();
    }
    for (const near of ['/v1/choose/', '/v1/Choose', '/v1/chooses', '/v1/say/', '/v1/Say', '/v1/says', '/v1/say?x', '/v1/reply']) {
      expect(matchPocketRoute('POST', near), near).toBeNull();
    }
    // The write the fix round removed is no route at all (build/p317/SPEC.md "§Fix round").
    for (const method of ['POST', 'GET']) expect(matchPocketRoute(method, '/v1/unpair')).toBeNull();
    for (const near of ['/v1/end/', '/v1/End', '/v1/end/abc', '/v1/ends', '/v1/unpair/', '/v1/unpairs']) {
      expect(matchPocketRoute('POST', near), near).toBeNull();
    }
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

  it('marks the pairing route window-only and unsigned, and the reads and writes signed', () => {
    const pair = POCKET_ROUTES.find((r) => r.id === 'pair');
    expect(pair?.windowOnly).toBe(true);
    expect(pair?.signed).toBe(false);
    for (const id of ['blocked', 'session', 'turns', 'sessions', 'screen', 'scrollback', 'keys'] as const) {
      const route = POCKET_ROUTES.find((r) => r.id === id);
      expect(route?.windowOnly).toBe(false);
      expect(route?.signed).toBe(true);
    }
  });

  // PHASE 337 (build/p337/SPEC.md §5.1, D1, D2): the Screen's read is a GET
  // to its exact path and nothing else.
  it('matches the Screen read only as a GET to its exact path', () => {
    expect(matchPocketRoute('GET', '/v1/screen')).toEqual({
      id: 'screen',
      method: 'GET',
      path: '/v1/screen',
      reads: true,
      windowOnly: false,
      signed: true
    });
    expect(matchPocketRoute('POST', '/v1/keys')).toEqual({
      id: 'keys',
      method: 'POST',
      path: '/v1/keys',
      reads: false,
      windowOnly: false,
      signed: true
    });
    for (const method of ['POST', 'PUT', 'get']) expect(matchPocketRoute(method, '/v1/screen')).toBeNull();
    for (const near of ['/v1/screen/', '/v1/Screen', '/v1/screens', '/v1/screen?id=a', '/v1/terminal']) {
      expect(matchPocketRoute('GET', near), near).toBeNull();
    }
  });

  // PHASE 337.1 (build/p3371/SPEC.md §5.1, D1): one page of the Screen's
  // history is its own signed GET read, after `screen`, alive outside any
  // window, and nothing else at that path.
  it('matches the history read only as a GET to its exact path, the row after the Screen', () => {
    expect(matchPocketRoute('GET', '/v1/scrollback')).toEqual({
      id: 'scrollback',
      method: 'GET',
      path: '/v1/scrollback',
      reads: true,
      windowOnly: false,
      signed: true
    });
    const ids = POCKET_ROUTES.map((r) => r.id);
    expect(ids.indexOf('scrollback')).toBe(ids.indexOf('screen') + 1);
    for (const method of ['POST', 'PUT', 'DELETE', 'get']) expect(matchPocketRoute(method, '/v1/scrollback')).toBeNull();
    for (const near of ['/v1/scrollback/', '/v1/Scrollback', '/v1/scrollbacks', '/v1/scrollback?id=a', '/v1/screen/scrollback', '/v1/history']) {
      expect(matchPocketRoute('GET', near), near).toBeNull();
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

// ---------------------------------------------------------------------------

describe('End on the rows (Phase 317, SPEC §5.4)', () => {
  /** An offer per session id, so each row's offer is told apart by its id. */
  const OFFERS: Record<string, PocketEndOffer> = {
    a: { state: 'offered', batch: true },
    b: { state: 'offered', batch: false },
    c: { state: 'unreachable', title: 'Tortie cannot see whether this session is running, so it cannot end it.' },
    d: { state: 'none' },
    e: { state: 'offered', batch: true },
    f: { state: 'none' }
  };
  const offering = (): Partial<PocketFacts> => ({
    endOffer: (s) => OFFERS[s.id] ?? { state: 'none' }
  });

  it('puts the handed-in offer on EVERY row, blocked and others alike', () => {
    const answer = createPocketRoutes(facts(offering())).blocked();
    const rows = [...answer.rows, ...answer.others];
    expect(rows).toHaveLength(SESSIONS.length);
    for (const row of rows) expect(row.end, row.sessionId).toEqual(OFFERS[row.sessionId]);
  });

  // §14 finding 8: the member is OPTIONAL, and absent means what an absent
  // dep always meant.
  it('reads { state: none } on every row when no offer was handed in', () => {
    const answer = createPocketRoutes(facts()).blocked();
    for (const row of [...answer.rows, ...answer.others]) {
      expect(row.end, row.sessionId).toEqual({ state: 'none' });
    }
  });

  it('carries the Mac’s own End confirmation, word for word, exactly when End is offered', async () => {
    const routes = createPocketRoutes(facts(offering()));
    for (const id of ['a', 'b', 'e']) {
      const answer = await routes.session(id);
      const row = SESSIONS.find((s) => s.id === id) as Session;
      const mac = endSessionConfirm(row);
      expect(answer?.session.end, id).toEqual(OFFERS[id]);
      expect(answer?.session.endConfirm, id).toEqual({
        title: mac.title,
        body: mac.body,
        confirmLabel: mac.confirmLabel
      });
      expect(answer?.session.endConfirm?.title).toBe(`End '${row.name}'?`);
      expect(answer?.session.endConfirm?.confirmLabel).toBe('End session');
    }
    for (const id of ['c', 'd', 'f']) {
      const answer = await routes.session(id);
      expect(answer?.session.end, id).toEqual(OFFERS[id]);
      expect(answer?.session.endConfirm, id).toBeNull();
    }
  });

  it('draws no confirmation at all when no offer was handed in', async () => {
    const answer = await createPocketRoutes(facts()).session('a');
    expect(answer?.session.end).toEqual({ state: 'none' });
    expect(answer?.session.endConfirm).toBeNull();
  });

  it('composes the remote body for a session on another machine', async () => {
    const remote = session({
      id: 'r',
      name: 'far',
      status: 'running',
      machine: { id: 'm1', label: 'Mac Pro', color: 'blue', answering: true, canRestore: false, restoreReason: null }
    } as Partial<Session> & Pick<Session, 'id' | 'name'>);
    const answer = await createPocketRoutes(
      facts({ sessions: () => [remote], endOffer: () => ({ state: 'offered', batch: true }) })
    ).session('r');
    expect(answer?.session.endConfirm?.body).toBe(endSessionConfirm(remote).body);
    expect(answer?.session.endConfirm?.body).toContain('on Mac Pro');
  });
});

// ---------------------------------------------------------------------------

describe('the reply offer on one session (Phase 318, build/p318/SPEC.md §5.2, D18)', () => {
  const OFFER: PocketReplyOffer = {
    question: '0123456789abcdef-7',
    mark: 'a1b2c3d4e5f6',
    pressable: ['1', '2'],
    command: null,
    canSay: false
  };

  it('reads the empty offer, a fresh object every time, when no reader was handed in', async () => {
    const routes = createPocketRoutes(facts());
    const one = await routes.session('a');
    const two = await routes.session('a');
    expect(one?.session.reply).toEqual({ question: null, mark: null, pressable: [], command: null, canSay: false });
    expect(one?.session.reply).toEqual(POCKET_NO_REPLY);
    expect(one?.session.reply).not.toBe(POCKET_NO_REPLY);
    expect(one?.session.reply?.pressable).not.toBe(two?.session.reply?.pressable);
  });

  it('holds the empty offer frozen, its pressable list too, so no composer can push onto it', () => {
    expect(Object.isFrozen(POCKET_NO_REPLY)).toBe(true);
    expect(Object.isFrozen(POCKET_NO_REPLY.pressable)).toBe(true);
    expect(() => (POCKET_NO_REPLY.pressable as string[]).push('1')).toThrow();
  });

  it('hands the reader EXACTLY the question and options this answer draws (§Revision R1), once, after the refresh', async () => {
    const log: string[] = [];
    const handed: { session: string; drawn: PocketReplyDrawn }[] = [];
    const routes = createPocketRoutes(
      facts({
        refresh: async (id) => {
          log.push(`refresh:${id}`);
          return null;
        },
        replyOffer: async (s, drawn) => {
          log.push(`reply:${s.id}`);
          handed.push({ session: s.id, drawn });
          return OFFER;
        }
      })
    );
    const answer = await routes.session('a');
    expect(log).toEqual(['refresh:a', 'reply:a']);
    expect(handed).toHaveLength(1);
    expect(handed[0]?.session).toBe('a');
    expect(handed[0]?.drawn.question).toBe(answer?.session.question);
    expect(handed[0]?.drawn.question).toBe('May I run the tests?');
    expect(handed[0]?.drawn.choices).toEqual(answer?.session.choices);
    expect(answer?.session.reply).toEqual(OFFER);
    // A session with no question hands null and no options.
    await routes.session('e');
    expect(handed[1]?.drawn).toEqual({ question: null, choices: [] });
  });

  it('never asks the reader for /v1/blocked, and no blocked or other row carries a reply', async () => {
    let asked = 0;
    const routes = createPocketRoutes(
      facts({
        replyOffer: async () => {
          asked += 1;
          return OFFER;
        }
      })
    );
    const list = routes.blocked();
    expect(asked).toBe(0);
    for (const row of [...list.rows, ...list.others]) expect('reply' in row, row.sessionId).toBe(false);
    await routes.turns('a', {});
    expect(asked).toBe(0);
  });

  it('never asks the reader for a session removed while the refresh ran', async () => {
    let live = SESSIONS;
    let asked = 0;
    const routes = createPocketRoutes(
      facts({
        sessions: () => live,
        refresh: async () => {
          live = SESSIONS.filter((s) => s.id !== 'a');
          return null;
        },
        replyOffer: async () => {
          asked += 1;
          return OFFER;
        }
      })
    );
    expect(await routes.session('a')).toBeNull();
    expect(asked).toBe(0);
  });

  it('composes the offer FIELD BY FIELD: nothing else on the reader’s object leaves, and pressable is a fresh array', async () => {
    const fromReader = { ...OFFER, pressable: ['1', '2'], secret: 'CANARY', hookAsk: 'Bash rm -rf ~' } as PocketReplyOffer;
    const answer = await createPocketRoutes(facts({ replyOffer: async () => fromReader })).session('a');
    expect(Object.keys(answer?.session.reply ?? {})).toEqual(['question', 'mark', 'pressable', 'command', 'canSay']);
    expect(JSON.stringify(answer)).not.toContain('CANARY');
    expect(answer?.session.reply?.pressable).not.toBe(fromReader.pressable);
    fromReader.pressable.push('9');
    expect(answer?.session.reply?.pressable).toEqual(['1', '2']);
  });

  it('keeps only markers of the options THIS answer draws, in drawn order, each once', async () => {
    const offer = (pressable: string[]) =>
      createPocketRoutes(facts({ replyOffer: async () => ({ ...OFFER, pressable }) })).session('a');
    expect((await offer(['2', '1']))?.session.reply?.pressable).toEqual(['1', '2']);
    expect((await offer(['1', '1', '2']))?.session.reply?.pressable).toEqual(['1', '2']);
    expect((await offer(['2', '3', '9']))?.session.reply?.pressable).toEqual(['2']);
    // A marker the answer does not draw alone offers nothing at all.
    expect((await offer(['3']))?.session.reply).toEqual(POCKET_NO_REPLY);
    // A session that draws no options can be offered no press, whatever the reader says.
    const none = await createPocketRoutes(facts({ replyOffer: async () => OFFER })).session('e');
    expect(none?.session.reply).toEqual(POCKET_NO_REPLY);
  });

  it('holds the press half all or nothing: no question id, no mark or nothing pressable offers no press and no command', async () => {
    const offer = (over: Partial<PocketReplyOffer>) =>
      createPocketRoutes(facts({ replyOffer: async () => ({ ...OFFER, command: 'ls -la', ...over }) })).session('a');
    expect((await offer({}))?.session.reply).toEqual({ ...OFFER, command: 'ls -la' });
    for (const over of [{ question: null }, { question: '' }, { mark: null }, { mark: '' }, { pressable: [] }] as Partial<PocketReplyOffer>[]) {
      expect((await offer(over))?.session.reply, JSON.stringify(over)).toEqual(POCKET_NO_REPLY);
    }
    // A message offer stands on its own.
    expect((await offer({ question: null, canSay: true }))?.session.reply).toEqual({ ...POCKET_NO_REPLY, canSay: true });
  });

  it('offers a message only when the reader said exactly true', async () => {
    for (const [canSay, want] of [[true, true], [false, false], ['true', false], [1, false], [undefined, false]] as const) {
      const answer = await createPocketRoutes(
        facts({ replyOffer: async () => ({ ...POCKET_NO_REPLY, canSay } as unknown as PocketReplyOffer) })
      ).session('f');
      expect(answer?.session.reply?.canSay, String(canSay)).toBe(want);
    }
  });

  it('reads the empty offer, and still answers the session, when the reader rejects, throws or answers nothing', async () => {
    const readers: Array<PocketFacts['replyOffer']> = [
      async () => {
        throw new Error('CANARY tmux capture-pane failed');
      },
      () => {
        throw new Error('CANARY sync');
      },
      async () => null as unknown as PocketReplyOffer,
      async () => ({}) as unknown as PocketReplyOffer
    ];
    for (const [i, replyOffer] of readers.entries()) {
      const answer = await createPocketRoutes(facts({ replyOffer })).session('a');
      expect(answer?.session.name, String(i)).toBe('aardvark');
      expect(answer?.session.catchUp, String(i)).toEqual({ ask: 'wire the door', outcome: 'Done, and git agrees' });
      expect(answer?.session.reply, String(i)).toEqual(POCKET_NO_REPLY);
      expect(JSON.stringify(answer)).not.toContain('CANARY');
    }
  });

  it('asks the reader beside the conversation reads, not after them', async () => {
    const order: string[] = [];
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const routes = createPocketRoutes(
      facts({
        replyOffer: async () => {
          order.push('reply:start');
          await held;
          order.push('reply:end');
          return OFFER;
        },
        catchUp: async () => {
          order.push('catchUp');
          return null;
        },
        lastTurn: async () => {
          order.push('lastTurn');
          return { answerText: null, turnCount: 0 };
        }
      })
    );
    const pending = routes.session('a');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['reply:start', 'catchUp', 'lastTurn']);
    release();
    expect((await pending)?.session.reply).toEqual(OFFER);
  });
});

// ===========================================================================
// THE SESSIONS TAB (Phase 316.7, build/p3167/SPEC.md §6.2, §9.2, §15)
//
// Every expected value below is written by hand from the SPEC, never computed
// by the module under test: the membership table, the group keys, labels,
// order and folders, every age, and the three orders. The matrix walks every
// Show × Group × Sort with and without each filter.
// ===========================================================================

const NOW = Date.UTC(2026, 9, 2, 12, 0, 0);
// `MIN`, one minute, is the wake section's above.
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function machineOf(id: string, label: string): NonNullable<Session['machine']> {
  return {
    id,
    label,
    color: 'blue',
    answering: true,
    canRestore: false,
    restoreReason: null
  } as NonNullable<Session['machine']>;
}

function listed(over: Partial<Session> & { id: string }): Session {
  return {
    name: over.id,
    tmuxName: over.id,
    projectPath: '/Users/x/work/app',
    cwd: '/Users/x/work/app',
    agent: 'claude',
    status: 'idle',
    createdAt: NOW - DAY,
    ...over
  } as Session;
}

/**
 * 300 UTF-16 units ending in a surrogate pair, whose 199th unit (index 198) is
 * the HIGH half of a pair: the clip keeps 199 units, and the one surrogate-safe
 * step backs off to 198 so no character is cut in two.
 */
const LONG_NAME = `${'n'.repeat(198)}😀${'x'.repeat(98)}😀`;

/**
 * The world: waiting (stamped, unstamped, unstamped at epoch 0), running,
 * idle, unknown, exited and restorable rows; a remote machine; THREE folders
 * named `app` (two on this Mac, one on the machine); an open project; a closed
 * tab whose name is on its SECOND member; an agent id the query would refuse;
 * a machine whose id is `local`; a `createdAt` of 0; a 300-unit name.
 */
const WORLD: Session[] = [
  listed({ id: 'w1', name: 'wait stamped', status: 'needs_input', projectPath: '/Users/x/work/zeta', createdAt: NOW - 6 * DAY }),
  listed({ id: 'w2', name: 'wait unstamped', status: 'needs_input', projectPath: '/Users/x/work/app', createdAt: NOW - 3 * DAY }),
  listed({ id: 'w3', name: 'wait epoch', status: 'needs_input', projectPath: '/Users/y/app', createdAt: 0 }),
  listed({ id: 'r1', name: 'runner', status: 'running', projectPath: '/Users/x/work/app', createdAt: NOW - 4 * DAY }),
  listed({ id: 'i1', name: 'idler', status: 'idle', projectPath: '/Users/y/app', createdAt: NOW - 5 * DAY }),
  listed({ id: 'u1', name: 'unreached', status: 'unknown', projectPath: '/srv/app', machine: machineOf('devbox', 'Dev Box'), createdAt: NOW - DAY }),
  listed({ id: 'x1', name: 'ended a', status: 'exited', projectPath: '/Users/x/work/old', createdAt: NOW - 10 * DAY }),
  listed({ id: 'x2', name: 'ended b', status: 'restorable', projectPath: '/Users/x/work/old', createdAt: 0 }),
  listed({ id: 'n1', name: LONG_NAME, agent: 'codex', projectPath: '/Users/x/work/beta', createdAt: NOW - 2 * DAY }),
  listed({ id: 'c0', name: 'closed first', projectPath: '/Users/x/work/shut', createdAt: NOW - 7 * DAY }),
  listed({
    id: 'c1',
    name: 'closed second',
    projectPath: '/Users/x/work/shut',
    createdAt: NOW - 8 * DAY,
    closedProject: { name: 'Shut Tab', path: '/Users/x/work/shut', closedAt: 1 }
  }),
  // An agent id the manifest can store (codecs.ts) and the query cannot name.
  listed({ id: 'b1', name: 'bad agent', agent: 'Bad_Id' as Session['agent'], projectPath: '/Users/x/work/zeta', createdAt: NOW - 9 * DAY }),
  listed({ id: 'k1', name: 'local id', projectPath: '/Users/x/work/zeta', machine: machineOf('local', 'Local'), createdAt: NOW - 11 * DAY }),
  listed({ id: 'd1', name: 'remote idle', projectPath: '/srv/app', machine: machineOf('devbox', 'Dev Box'), createdAt: NOW - 12 * DAY })
];

const WORLD_STAMPS = new Map<string, number>([['w1', NOW - 4 * MIN]]);
const WORLD_ACTIVITY: Record<string, { question?: string; lastActivityAt?: number }> = {
  w1: { question: 'May I run the tests?' },
  // Waiting with output but NO stamp: aged by its creation, never its output.
  w2: { lastActivityAt: NOW - MIN, question: '' },
  r1: { lastActivityAt: NOW - 2 * HOUR, question: 'not waiting, so never drawn' },
  x1: { lastActivityAt: NOW - 9 * DAY }
};
const WORLD_PROJECTS: Project[] = [{ id: 'p1', path: '/Users/x/work/beta', name: 'Beta Renamed' }];

function sessionsFacts(
  list: readonly Session[],
  over: Partial<PocketFacts> & {
    stamps?: ReadonlyMap<string, number>;
    feed?: Record<string, { question?: string; lastActivityAt?: number }>;
  } = {}
): PocketFacts {
  const { stamps, feed, ...rest } = over;
  return {
    sessions: () => list,
    projects: () => [],
    blockedSince: () => stamps ?? new Map(),
    wakes: () => [],
    activity: (id) => feed?.[id],
    statusWord: (s) =>
      s.status === 'needs_input'
        ? { dot: 'attention', label: 'needs input' }
        : s.status === 'running'
          ? { dot: 'working', label: 'working' }
          : s.status === 'exited' || s.status === 'restorable'
            ? { dot: 'ended', label: 'ended' }
            : s.status === 'unknown'
              ? { dot: 'unknown', label: 'unreachable' }
              : { dot: 'idle', label: 'idle' },
    agentLabel: (id) => (id === 'claude' ? 'Claude Code' : id === 'codex' ? 'Codex' : id),
    machineLabel: (s) => s.machine?.label ?? null,
    emptyLine: 'Nothing needs you',
    catchUp: async () => null,
    lastTurn: async () => ({ answerText: null, turnCount: 0 }),
    turns: async () => ({ turns: [], more: false }),
    handoff: () => null,
    now: () => NOW,
    ...rest
  };
}

const worldFacts = (over: Partial<PocketFacts> = {}): PocketFacts =>
  sessionsFacts(WORLD, { stamps: WORLD_STAMPS, feed: WORLD_ACTIVITY, projects: () => WORLD_PROJECTS, ...over });

function ask(routes: ReturnType<typeof createPocketRoutes>, query: string): PocketSessionsAnswer {
  const answer = routes.sessions(new URLSearchParams(query));
  if (answer === null) throw new Error(`refused: ${query}`);
  return answer;
}

/** By hand: what Show keeps. */
const SHOW_KEEPS: Record<'active' | 'ended' | 'all', readonly string[]> = {
  active: ['running', 'idle', 'needs_input', 'unknown'],
  ended: ['exited', 'restorable'],
  all: ['running', 'idle', 'needs_input', 'unknown', 'exited', 'restorable']
};
/** By hand: the machine each row is on, `local` for this Mac and for the machine whose id is `local`. */
const MACHINE_OF: Record<string, string> = Object.fromEntries(
  WORLD.map((s) => [s.id, s.id === 'u1' || s.id === 'd1' ? 'devbox' : 'local'])
);
/** By hand: each row's group key. */
const KEY_OF: Record<string, string> = {
  w1: '/Users/x/work/zeta', b1: '/Users/x/work/zeta', k1: '/Users/x/work/zeta',
  w2: '/Users/x/work/app', r1: '/Users/x/work/app',
  w3: '/Users/y/app', i1: '/Users/y/app',
  u1: 'devbox:/srv/app', d1: 'devbox:/srv/app',
  x1: '/Users/x/work/old', x2: '/Users/x/work/old',
  n1: '/Users/x/work/beta',
  c0: '/Users/x/work/shut', c1: '/Users/x/work/shut'
};
/** By hand: the groups in order (label, then key), with their drawn fields. */
const GROUPS_BY_HAND: { key: string; label: string; machine: string | null; folder: string | null }[] = [
  { key: '/Users/x/work/app', label: 'app', machine: null, folder: '~/work/app' },
  { key: '/Users/y/app', label: 'app', machine: null, folder: '~/app' },
  { key: 'devbox:/srv/app', label: 'app', machine: 'Dev Box', folder: null },
  { key: '/Users/x/work/beta', label: 'Beta Renamed', machine: null, folder: null },
  { key: '/Users/x/work/old', label: 'old', machine: null, folder: null },
  { key: '/Users/x/work/shut', label: 'Shut Tab', machine: null, folder: null },
  { key: '/Users/x/work/zeta', label: 'zeta', machine: 'Local', folder: null }
];
/** By hand: every age under Recent activity and Name, and under Oldest first. */
const AGE_RECENT: Record<string, string | null> = {
  w1: '4m', w2: '3d old', w3: null, r1: '2h', i1: '5d old', u1: '1d old', x1: '9d', x2: null,
  n1: '2d old', c0: '7d old', c1: '8d old', b1: '9d old', k1: '11d old', d1: '12d old'
};
const AGE_OLDEST: Record<string, string | null> = {
  w1: '6d old', w2: '3d old', w3: null, r1: '4d old', i1: '5d old', u1: '1d old', x1: '10d old', x2: null,
  n1: '2d old', c0: '7d old', c1: '8d old', b1: '9d old', k1: '11d old', d1: '12d old'
};
/**
 * By hand: Recent activity over the whole world. Waiting first, newest since
 * first (the stamp, else creation, which ORDERS and never labels); then output
 * newest first; then no output, newest created first.
 */
const RECENT_BY_HAND = ['w1', 'w2', 'w3', 'r1', 'x1', 'u1', 'n1', 'i1', 'c0', 'c1', 'b1', 'k1', 'd1', 'x2'];
/** By hand: Name (localeCompare), then id. */
const NAME_BY_HAND = ['b1', 'c0', 'c1', 'x1', 'x2', 'i1', 'k1', 'n1', 'd1', 'r1', 'u1', 'w3', 'w1', 'w2'];
/** By hand: creation ascending, a clock of 0 last, then id. */
const OLDEST_BY_HAND = ['d1', 'k1', 'x1', 'b1', 'c1', 'c0', 'w1', 'i1', 'r1', 'w2', 'n1', 'u1', 'w3', 'x2'];

const idOfKey = (key: string): string => createHash('sha256').update(key).digest('base64url').slice(0, 16);

describe('the Sessions tab: every Show × Group × Sort, with and without each filter (Phase 316.7)', () => {
  const routes = createPocketRoutes(worldFacts());
  const orders = { recent: RECENT_BY_HAND, name: NAME_BY_HAND, oldest: OLDEST_BY_HAND } as const;
  let combinations = 0;
  for (const show of ['active', 'ended', 'all'] as const) {
    for (const group of ['project', 'none'] as const) {
      for (const sort of ['recent', 'name', 'oldest'] as const) {
        for (const agent of [null, 'claude', 'codex', 'nobody'] as const) {
          for (const machine of [null, 'local', 'devbox', 'nowhere'] as const) {
            combinations += 1;
            const query = [
              `show=${show}`,
              `group=${group}`,
              `sort=${sort}`,
              ...(agent === null ? [] : [`agent=${agent}`]),
              ...(machine === null ? [] : [`machine=${machine}`])
            ].join('&');
            it(query, () => {
              const answer = ask(routes, query);
              expect(answer.asked).toEqual({ show, group, sort, agent, machine });
              // MEMBERSHIP, by the hand table.
              const keptIds = WORLD.filter(
                (s) =>
                  SHOW_KEEPS[show].includes(s.status) &&
                  (agent === null || s.agent === agent) &&
                  (machine === null || MACHINE_OF[s.id] === machine)
              ).map((s) => s.id);
              const ids = answer.rows.map((r) => r.sessionId);
              expect(new Set(ids).size).toBe(ids.length);
              expect([...ids].sort()).toEqual([...keptIds].sort());
              // ORDER: the hand order, partitioned by the hand group order under Project.
              const sorted = orders[sort].filter((id) => keptIds.includes(id));
              const expected =
                group === 'none'
                  ? sorted
                  : GROUPS_BY_HAND.flatMap((g) => sorted.filter((id) => KEY_OF[id] === g.key));
              expect(ids).toEqual(expected);
              // GROUPS: exactly the ones the rows name, each once, in first-emitted order.
              const firstSeen: string[] = [];
              for (const id of ids) {
                const key = KEY_OF[id] ?? '';
                if (!firstSeen.includes(key)) firstSeen.push(key);
              }
              expect(answer.groups.map((g) => g.id)).toEqual(firstSeen.map(idOfKey));
              for (const row of answer.rows) {
                expect(answer.groups[row.group]?.id, row.sessionId).toBe(idOfKey(KEY_OF[row.sessionId] ?? ''));
              }
              if (group === 'project') {
                // Contiguous: a group's rows are one run.
                const runs = answer.rows.map((r) => r.group).filter((g, i, all) => i === 0 || all[i - 1] !== g);
                expect(new Set(runs).size).toBe(runs.length);
              }
              for (const g of answer.groups) {
                const hand = GROUPS_BY_HAND.find((h) => idOfKey(h.key) === g.id);
                const members = keptIds.filter((id) => KEY_OF[id] === hand?.key);
                expect(g.label).toBe(hand?.label);
                expect(g.machine).toBe(hand?.machine);
                expect(g.folder).toBe(hand?.folder);
                expect(g.count).toBe(members.length);
                expect(g.omitted).toBe(0);
                expect(g.waiting).toBe(members.some((id) => WORLD.find((s) => s.id === id)?.status === 'needs_input'));
                expect(g.collapsed).toBe(
                  show === 'all' &&
                    !members.some((id) => SHOW_KEEPS.active.includes(WORLD.find((s) => s.id === id)?.status ?? ''))
                );
              }
              // THE ROWS' WORDS.
              for (const row of answer.rows) {
                const id = row.sessionId;
                expect(row.ageText, id).toBe((sort === 'oldest' ? AGE_OLDEST : AGE_RECENT)[id]);
                expect(row.waiting).toBe(['w1', 'w2', 'w3'].includes(id));
                expect(row.question).toBe(id === 'w1' ? 'May I run the tests?' : null);
                expect(row.machine).toBe(id === 'k1' ? 'Local' : id === 'u1' || id === 'd1' ? 'Dev Box' : null);
                expect(row.end).toEqual({ state: 'none' });
              }
              // THE CHOICES: over what Show keeps, before the filters.
              const shown = WORLD.filter((s) => SHOW_KEEPS[show].includes(s.status));
              const agents: string[] = [...new Set(shown.map((s) => String(s.agent)))].filter((a) => a !== 'Bad_Id');
              expect(answer.agents).toEqual(
                [
                  { id: 'claude', label: 'Claude Code' },
                  { id: 'codex', label: 'Codex' }
                ].filter((c) => agents.includes(c.id))
              );
              expect(answer.machines).toEqual(
                [
                  { id: 'local', label: null },
                  { id: 'devbox', label: 'Dev Box' }
                ].filter((c) => shown.some((s) => MACHINE_OF[s.id] === c.id))
              );
              expect(answer.total).toBe(WORLD.length);
              expect(answer.omitted).toBe(0);
              expect(answer.at).toBe(NOW);
              expect(answer.ageNote).toBe(POCKET_AGE_HONESTY);
            });
          }
        }
      }
    }
  }
  it('walked every combination', () => {
    expect(combinations).toBe(3 * 2 * 3 * 4 * 4);
  });
});

describe('the Sessions tab: the words, the defaults and the refusals (Phase 316.7, D3)', () => {
  it('reads absent words as the contract’s defaults, and no filter', () => {
    expect(readSessionsQuery(new URLSearchParams(''))).toEqual({
      ok: true,
      asked: { show: 'active', group: 'project', sort: 'recent', agent: null, machine: null }
    });
  });

  it('refuses every malformed query whole, with its reason word', () => {
    const table: [string, string][] = [
      ['limit=1', 'parameter'],
      ['limit=1&show=bogus', 'parameter'],
      ['search=app', 'parameter'],
      ['Show=active', 'parameter'],
      ['show=active&show=ended', 'repeated'],
      ['agent=claude&agent=codex', 'repeated'],
      ['show=Active', 'word'],
      ['show=', 'word'],
      ['show', 'word'],
      ['show=%41ctive', 'word'],
      ['show=act%00ive', 'word'],
      ['show=active%20', 'word'],
      ['show=act+ive', 'word'],
      ['group=folder', 'word'],
      ['sort=newest', 'word'],
      ['agent=', 'id'],
      ['agent=Claude', 'id'],
      ['agent=Bad_Id', 'id'],
      ['agent=9x', 'id'],
      ['agent=-a', 'id'],
      [`agent=${'a'.repeat(33)}`, 'id'],
      ['agent=a/b', 'id'],
      ['agent=..', 'id'],
      ['agent=a%00', 'id'],
      ['agent=%C3%A9', 'id'],
      ['machine=LOCAL', 'id'],
      ['machine=', 'id']
    ];
    const routes = createPocketRoutes(worldFacts());
    for (const [query, reason] of table) {
      expect(readSessionsQuery(new URLSearchParams(query)), query).toEqual({ ok: false, reason });
      expect(routes.sessions(new URLSearchParams(query)), query).toBeNull();
    }
  });

  it('answers a percent-escaped closed word as that word, and a well-formed id that names nothing with no rows', () => {
    const routes = createPocketRoutes(worldFacts());
    expect(ask(routes, 'show=%61ctive').asked.show).toBe('active');
    const nobody = ask(routes, 'show=all&agent=nobody');
    expect(nobody.rows).toEqual([]);
    expect(nobody.groups).toEqual([]);
    expect(nobody.omitted).toBe(0);
    expect(nobody.total).toBe(WORLD.length);
    expect(ask(routes, `agent=${'a'.repeat(32)}`).rows).toEqual([]);
    expect(ask(routes, 'agent=a-').rows).toEqual([]);
    expect(ask(routes, 'machine=local').asked.machine).toBe('local');
  });

  it('reads an id one character at a time: a letter, then letters, digits or a dash, 1 to 32', () => {
    for (const ok of ['a', 'claude', 'web-1', 'a9', 'local', 'a'.repeat(32), 'z-']) expect(isSessionsId(ok), ok).toBe(true);
    for (const no of ['', 'A', '9', '-', 'a_b', 'a b', 'a.b', 'a/b', 'é', 'a'.repeat(33), 'aZ', 'a\u0000']) {
      expect(isSessionsId(no), JSON.stringify(no)).toBe(false);
    }
  });
});

describe('the Sessions tab: the one clip (Phase 316.7, D5)', () => {
  it('keeps 200 units whole and clips past it with …, never between the halves of a pair', () => {
    const cap = POCKET_SESSIONS_CLIP_CHARS;
    expect(cap).toBe(200);
    expect(clipSessionText('a'.repeat(cap))).toBe('a'.repeat(cap));
    expect(clipSessionText('a'.repeat(cap + 1))).toBe(`${'a'.repeat(cap - 1)}…`);
    // The last unit kept is a HIGH surrogate: step back one.
    expect(clipSessionText(LONG_NAME)).toBe(`${'n'.repeat(198)}…`);
    // The last unit kept is a LOW surrogate: the pair is whole, keep it.
    const pairWhole = `${'n'.repeat(197)}😀${'x'.repeat(50)}`;
    expect(clipSessionText(pairWhole)).toBe(`${'n'.repeat(197)}😀…`);
    for (const text of [LONG_NAME, pairWhole]) {
      const clipped = clipSessionText(text);
      expect(clipped.length).toBeLessThanOrEqual(cap);
      const last = clipped.charCodeAt(clipped.length - 2);
      expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
    }
  });

  it('clips the name, the label, the folder and the choices’ labels, and never the question', () => {
    const longPath = `/Users/x/${'p'.repeat(300)}`;
    const long = 'q'.repeat(300);
    const routes = createPocketRoutes(
      sessionsFacts(
        [
          listed({ id: 'a', name: LONG_NAME, status: 'needs_input', projectPath: longPath, agent: 'claude', machine: machineOf('devbox', 'M'.repeat(300)) }),
          listed({ id: 'b', projectPath: `/Users/y/${'p'.repeat(300)}`, machine: machineOf('devbox', 'M'.repeat(300)) })
        ],
        { feed: { a: { question: long } }, agentLabel: () => 'A'.repeat(300) }
      )
    );
    const answer = ask(routes, 'show=all');
    const row = answer.rows.find((r) => r.sessionId === 'a');
    expect(row?.name).toBe(`${'n'.repeat(198)}…`);
    expect(row?.machine).toBe(`${'M'.repeat(199)}…`);
    expect(row?.question).toBe(long);
    for (const g of answer.groups) {
      expect(g.label).toBe(`${'p'.repeat(199)}…`);
      expect(g.machine).toBe(`${'M'.repeat(199)}…`);
      expect(g.folder?.length).toBe(200);
      expect(g.folder?.endsWith('…')).toBe(true);
    }
    expect(answer.agents).toEqual([{ id: 'claude', label: `${'A'.repeat(199)}…` }]);
    expect(answer.machines).toEqual([{ id: 'devbox', label: `${'M'.repeat(199)}…` }]);
  });
});

describe('the Sessions tab: today’s list, and the rules the revision added (Phase 316.7, §15)', () => {
  it('Show All · None · Recent is blocked()’s rows then others, id for id', () => {
    const world = worldFacts();
    const blocked = createPocketRoutes(world).blocked();
    const all = ask(createPocketRoutes(world), 'show=all&group=none&sort=recent');
    expect(all.rows.map((r) => r.sessionId)).toEqual([...blocked.rows, ...blocked.others].map((r) => r.sessionId));
    // And over the route-test world of the blocked list too.
    const other = facts();
    const today = createPocketRoutes(other).blocked();
    expect(ask(createPocketRoutes(other), 'show=all&group=none').rows.map((r) => r.sessionId)).toEqual(
      [...today.rows, ...today.others].map((r) => r.sessionId)
    );
  });

  it('F1: a waiting row is aged by its stamp ALONE; with none it is aged by creation, or not at all — never 20728d', () => {
    const answer = ask(createPocketRoutes(worldFacts()), 'show=active&group=none');
    const age = (id: string): string | null | undefined => answer.rows.find((r) => r.sessionId === id)?.ageText;
    expect(age('w1')).toBe('4m');
    expect(age('w2')).toBe('3d old');
    expect(age('w3')).toBeNull();
    // The shape the adversary measured through today's blocked(): a feed row
    // with createdAt 0 that waits with no stamp.
    const epoch = listed({ id: 'e', status: 'needs_input', createdAt: 0, machine: machineOf('devbox', 'Dev Box') });
    const one = ask(createPocketRoutes(sessionsFacts([epoch])), '');
    expect(one.rows[0]?.ageText).toBeNull();
    for (const row of answer.rows) expect(row.ageText ?? '', row.sessionId).not.toMatch(/^\d{4,}d/);
  });

  it('F3: a group holding a waiting row reads waiting under every choice that keeps the row', () => {
    const routes = createPocketRoutes(worldFacts());
    for (const group of ['project', 'none']) {
      for (const sort of ['recent', 'name', 'oldest']) {
        for (const show of ['active', 'all']) {
          const answer = ask(routes, `show=${show}&group=${group}&sort=${sort}`);
          for (const id of ['w1', 'w2', 'w3']) {
            const row = answer.rows.find((r) => r.sessionId === id);
            expect(answer.groups[row?.group ?? -1]?.waiting, `${id} ${group} ${sort} ${show}`).toBe(true);
          }
        }
      }
    }
    // A group with no waiting row says so.
    const ended = ask(routes, 'show=all');
    expect(ended.groups.find((g) => g.id === idOfKey('/Users/x/work/old'))?.waiting).toBe(false);
  });

  it('F8: an agent the query could not name is never offered, and its row is still listed', () => {
    const answer = ask(createPocketRoutes(worldFacts()), 'show=all');
    expect(answer.agents.map((a) => a.id)).not.toContain('Bad_Id');
    expect(answer.rows.map((r) => r.sessionId)).toContain('b1');
  });

  it('F9: a machine whose id is local is this Mac: its group, its filter, and named once', () => {
    const routes = createPocketRoutes(worldFacts());
    const answer = ask(routes, 'show=all');
    const k1 = answer.rows.find((r) => r.sessionId === 'k1');
    const w1 = answer.rows.find((r) => r.sessionId === 'w1');
    expect(k1?.group).toBe(w1?.group);
    expect(answer.machines.filter((m) => m.id === 'local')).toEqual([{ id: 'local', label: null }]);
    expect(answer.machines[0]).toEqual({ id: 'local', label: null });
    expect(ask(routes, 'show=all&machine=local').rows.map((r) => r.sessionId)).toContain('k1');
    expect(ask(routes, 'show=all&machine=devbox').rows.map((r) => r.sessionId).sort()).toEqual(['d1', 'u1']);
  });

  it('F12: a closed-tab name on the SECOND member labels the group', () => {
    const answer = ask(createPocketRoutes(worldFacts()), 'show=all');
    expect(answer.groups.find((g) => g.id === idOfKey('/Users/x/work/shut'))?.label).toBe('Shut Tab');
  });

  it('D7: a group’s id is the same under every choice, and is never the path', () => {
    const routes = createPocketRoutes(worldFacts());
    const zeta = idOfKey('/Users/x/work/zeta');
    for (const query of ['show=all', 'show=active&sort=name', 'group=none&sort=oldest', 'agent=claude']) {
      const answer = ask(routes, query);
      const w1 = answer.rows.find((r) => r.sessionId === 'w1');
      expect(answer.groups[w1?.group ?? -1]?.id, query).toBe(zeta);
    }
    expect(zeta).toHaveLength(16);
    expect(zeta).not.toContain('/');
  });

  it('is synchronous, reads the session list once, and reads no conversation', () => {
    let lists = 0;
    const never = (): never => {
      throw new Error('read a conversation');
    };
    const counted = worldFacts({
      sessions: () => {
        lists += 1;
        return WORLD;
      },
      refresh: never,
      catchUp: never,
      lastTurn: never,
      turns: never
    });
    const answer = createPocketRoutes(counted).sessions(new URLSearchParams('show=all'));
    expect(answer).not.toBeInstanceOf(Promise);
    expect(answer?.rows).toHaveLength(WORLD.length);
    expect(lists).toBe(1);
  });

  it('puts the handed-in End offer on every row', () => {
    const answer = ask(
      createPocketRoutes(worldFacts({ endOffer: (s) => (s.status === 'running' ? { state: 'offered', batch: true } : { state: 'none' }) })),
      'show=all'
    );
    for (const row of answer.rows) {
      expect(row.end, row.sessionId).toEqual(row.sessionId === 'r1' ? { state: 'offered', batch: true } : { state: 'none' });
    }
  });

  it('breaks a Name tie and a creation tie by id, where the sheet keeps the incoming order (§15 F17)', () => {
    // Listed against id order, so only the id tie-break draws them a, b, c.
    const list = [
      listed({ id: 'c', name: 'same', createdAt: NOW - DAY }),
      listed({ id: 'b', name: 'same', createdAt: NOW - DAY }),
      listed({ id: 'a', name: 'same', createdAt: NOW - DAY })
    ];
    const routes = createPocketRoutes(sessionsFacts(list));
    expect(ask(routes, 'sort=name&group=none').rows.map((r) => r.sessionId)).toEqual(['a', 'b', 'c']);
    expect(ask(routes, 'sort=oldest&group=none').rows.map((r) => r.sessionId)).toEqual(['a', 'b', 'c']);
    // Recent activity's own tie is `othersOrder`'s, the id too.
    expect(ask(routes, 'sort=recent&group=none').rows.map((r) => r.sessionId)).toEqual(['a', 'b', 'c']);
  });

  it('orders the agents and the machines by their drawn label, then id, whatever order the rows came in', () => {
    const list = [
      listed({ id: 's1', agent: 'zed' as Session['agent'], machine: machineOf('zz', 'Zulu'), createdAt: NOW - MIN }),
      // The tied pair comes in AGAINST id order, so only the id tie-break puts it right.
      listed({ id: 's2', agent: 'mid' as Session['agent'], machine: machineOf('mm', 'Alpha'), createdAt: NOW - 2 * MIN }),
      listed({ id: 's3', agent: 'amp' as Session['agent'], machine: machineOf('aa', 'Alpha'), createdAt: NOW - 3 * MIN }),
      listed({ id: 's4', agent: 'claude', createdAt: NOW - 4 * MIN })
    ];
    const labels: Record<string, string> = { zed: 'Zed', amp: 'Amp', mid: 'Amp', claude: 'Claude Code' };
    const answer = ask(
      createPocketRoutes(sessionsFacts(list, { agentLabel: (id) => labels[id] ?? id })),
      'show=all'
    );
    expect(answer.agents).toEqual([
      { id: 'amp', label: 'Amp' },
      { id: 'mid', label: 'Amp' },
      { id: 'claude', label: 'Claude Code' },
      { id: 'zed', label: 'Zed' }
    ]);
    // This Mac first, then by label, then id.
    expect(answer.machines).toEqual([
      { id: 'local', label: null },
      { id: 'aa', label: 'Alpha' },
      { id: 'mm', label: 'Alpha' },
      { id: 'zz', label: 'Zulu' }
    ]);
  });

  it('names a machine by the first label a row on it draws, and by its id when none does', () => {
    const list = [
      listed({ id: 'q1', machine: machineOf('quiet', 'unused'), createdAt: NOW - MIN }),
      listed({ id: 'q2', machine: machineOf('quiet', 'unused'), createdAt: NOW - 2 * MIN }),
      listed({ id: 'n1', machine: machineOf('nameless', 'unused'), createdAt: NOW - 3 * MIN })
    ];
    // The first row on `quiet` draws no label, the second does; nothing on
    // `nameless` draws one.
    const labels: Record<string, string | null> = { q1: null, q2: 'Quiet Box', n1: null };
    const answer = ask(
      createPocketRoutes(sessionsFacts(list, { machineLabel: (s) => labels[s.id] ?? null })),
      'show=all'
    );
    expect(answer.machines).toEqual([
      { id: 'nameless', label: 'nameless' },
      { id: 'quiet', label: 'Quiet Box' }
    ]);
  });

  it('cuts the agents and the machines at the contract’s number', () => {
    const many = Array.from({ length: POCKET_SESSIONS_CHOICES_MAX + 6 }, (_, i) =>
      listed({ id: `s${String(i)}`, agent: `agent-${String(i).padStart(3, '0')}` as Session['agent'], machine: machineOf(`m-${String(i).padStart(3, '0')}`, `M ${String(i).padStart(3, '0')}`) })
    );
    const answer = ask(createPocketRoutes(sessionsFacts(many)), 'show=all');
    expect(answer.agents).toHaveLength(POCKET_SESSIONS_CHOICES_MAX);
    expect(answer.machines).toHaveLength(POCKET_SESSIONS_CHOICES_MAX);
    expect(answer.agents[0]?.id).toBe('agent-000');
    expect(answer.machines[0]?.id).toBe('m-000');
    expect(answer.rows).toHaveLength(many.length);
  });
});

describe('the Sessions tab: the caps choose by Recent activity and the answer says what they left out (§15 F2, F4)', () => {
  /** Run `body` with the caps shortened, and put them back whatever happens. */
  function withCaps<T>(rows: number | null, bytes: number | null, body: () => T): T {
    caps.rows = rows;
    caps.bytes = bytes;
    try {
      return body();
    } finally {
      caps.rows = null;
      caps.bytes = null;
    }
  }

  /** Every group's count is its drawn rows plus its omitted, and nothing is drawn twice. */
  function holdsTogether(answer: PocketSessionsAnswer): void {
    const ids = answer.rows.map((r) => r.sessionId);
    expect(new Set(ids).size).toBe(ids.length);
    answer.groups.forEach((g, index) => {
      const drawn = answer.rows.filter((r) => r.group === index).length;
      expect(drawn, g.id).toBeGreaterThan(0);
      expect(g.count, g.id).toBe(drawn + g.omitted);
    });
    expect(answer.total).toBeGreaterThanOrEqual(answer.rows.length + answer.omitted);
  }

  // The adversary's attack A3: three groups by label, the waiting row in the
  // group whose label sorts LAST, a cap of 4.
  const LATE = [
    listed({ id: 'a1', projectPath: '/w/alpha', createdAt: NOW - MIN }),
    listed({ id: 'a2', projectPath: '/w/alpha', createdAt: NOW - 2 * MIN }),
    listed({ id: 'm1', projectPath: '/w/mid', createdAt: NOW - 3 * MIN }),
    listed({ id: 'm2', projectPath: '/w/mid', createdAt: NOW - 4 * MIN }),
    listed({ id: 'z1', projectPath: '/w/zeta', status: 'needs_input', createdAt: NOW - DAY })
  ];
  const LATE_STAMPS = new Map([['z1', NOW - 30 * MIN]]);

  it('F2: a waiting row in a late group is never cut while a row that is not waiting is drawn', () => {
    for (const query of ['group=project&sort=recent', 'group=project&sort=name', 'group=none&sort=oldest', 'group=project&sort=oldest', 'group=none&sort=name']) {
      const answer = withCaps(4, null, () => ask(createPocketRoutes(sessionsFacts(LATE, { stamps: LATE_STAMPS })), query));
      const ids = answer.rows.map((r) => r.sessionId);
      expect(ids, query).toContain('z1');
      expect(ids, query).not.toContain('m2');
      expect(ids).toHaveLength(4);
      holdsTogether(answer);
      // F4: the group the cut reached says so, on its own line.
      const mid = answer.groups.find((g) => g.id === idOfKey('/w/mid'));
      expect(mid?.count).toBe(2);
      expect(mid?.omitted).toBe(1);
      expect(answer.omitted).toBe(1);
      expect(answer.groups.reduce((sum, g) => sum + g.omitted, 0)).toBe(answer.omitted);
    }
    // Under Project · Name the rows still come out in the order drawn.
    const drawn = withCaps(4, null, () => ask(createPocketRoutes(sessionsFacts(LATE, { stamps: LATE_STAMPS })), 'group=project&sort=name'));
    expect(drawn.rows.map((r) => r.sessionId)).toEqual(['a1', 'a2', 'm1', 'z1']);
  });

  it('cuts at the contract’s 2,000 rows, a prefix of Recent activity, with every omitted exact', () => {
    const over = POCKET_SESSIONS_MAX + 50;
    let offers = 0;
    const many = Array.from({ length: over }, (_, i) =>
      listed({ id: `s${String(i).padStart(5, '0')}`, projectPath: i % 2 === 0 ? '/w/even' : '/w/odd', createdAt: NOW - i * MIN })
    );
    const answer = ask(
      createPocketRoutes(
        sessionsFacts(many, {
          endOffer: () => {
            offers += 1;
            return { state: 'none' };
          }
        })
      ),
      'show=all&group=project&sort=name'
    );
    expect(POCKET_SESSIONS_MAX).toBe(2000);
    expect(answer.rows).toHaveLength(POCKET_SESSIONS_MAX);
    expect(answer.omitted).toBe(50);
    expect(answer.total).toBe(over);
    // The chosen set is the NEWEST 2,000, whatever order they are drawn in.
    expect(new Set(answer.rows.map((r) => r.sessionId))).toEqual(new Set(many.slice(0, POCKET_SESSIONS_MAX).map((s) => s.id)));
    for (const g of answer.groups) {
      expect(g.count).toBe(over / 2);
      expect(g.omitted).toBe(25);
    }
    expect(answer.groups.reduce((sum, g) => sum + g.omitted, 0)).toBe(answer.omitted);
    holdsTogether(answer);
    // The End offers are asked of the rows walked, never of the whole list.
    expect(offers).toBeLessThanOrEqual(POCKET_SESSIONS_MAX + 1);
  });

  it('cuts at the contract’s byte budget, waiting rows first, and the answer stays under it', () => {
    const big = 'q'.repeat(40_000);
    const many = Array.from({ length: 60 }, (_, i) =>
      listed({ id: `w${String(i).padStart(3, '0')}`, status: i < 40 ? 'needs_input' : 'idle', projectPath: `/w/p${String(i % 3)}`, createdAt: NOW - i * MIN })
    );
    const stamps = new Map(many.filter((s) => s.status === 'needs_input').map((s, i) => [s.id, NOW - i * MIN]));
    const feed = Object.fromEntries(many.map((s) => [s.id, { question: big }]));
    const answer = ask(createPocketRoutes(sessionsFacts(many, { stamps, feed })), 'show=all&sort=name');
    expect(POCKET_SESSIONS_BUDGET_BYTES).toBe(1_048_576);
    const bytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value));
    const used =
      answer.rows.reduce((sum, row: PocketSessionsRow) => sum + bytes(row), 0) +
      answer.groups.reduce((sum, g) => sum + bytes(g), 0);
    expect(used).toBeLessThanOrEqual(POCKET_SESSIONS_BUDGET_BYTES);
    expect(answer.rows.length).toBeGreaterThan(0);
    expect(answer.rows.length).toBeLessThan(40);
    // A prefix of the priority: the newest-stamped waiting rows.
    const chosen = new Set(answer.rows.map((r) => r.sessionId));
    expect(chosen).toEqual(new Set(many.slice(0, answer.rows.length).map((s) => s.id)));
    expect(answer.omitted).toBe(many.length - answer.rows.length);
    expect(answer.groups.reduce((sum, g) => sum + g.omitted, 0)).toBe(answer.omitted);
    holdsTogether(answer);
  });

  it('a shortened byte budget cuts the same way, and one more row would not have fitted', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      listed({ id: `s${String(i).padStart(2, '0')}`, projectPath: i % 2 === 0 ? '/w/a' : '/w/b', createdAt: NOW - i * MIN })
    );
    const full = ask(createPocketRoutes(sessionsFacts(many)), 'show=all&group=none');
    const bytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value));
    // Room for exactly ten rows and the two groups, as the route measures them.
    const budget =
      full.rows.slice(0, 10).reduce((sum, r) => sum + bytes(r), 0) + full.groups.reduce((sum, g) => sum + bytes(g), 0) + 40;
    const cut = withCaps(null, budget, () => ask(createPocketRoutes(sessionsFacts(many)), 'show=all&group=none'));
    expect(cut.rows.length).toBeGreaterThanOrEqual(9);
    expect(cut.rows.length).toBeLessThanOrEqual(10);
    expect(cut.rows.map((r) => r.sessionId)).toEqual(full.rows.slice(0, cut.rows.length).map((r) => r.sessionId));
    expect(cut.omitted).toBe(30 - cut.rows.length);
    holdsTogether(cut);
  });

  /**
   * THE SPEC'S OWN EDGE, NAMED RATHER THAN HIDDEN. §6.1 says `groups` is
   * exactly the groups `rows` name AND that the top-level `omitted` is the sum
   * of the groups' `omitted`. Both cannot hold when the caps leave out EVERY row
   * of a group: no row names it, so it is in no group, and its rows are counted
   * in the top-level `omitted` alone (`kept − rows`, §6.2 step 9, O2(e)). Held
   * here so a later round that settles it changes this test on purpose.
   */
  it('a group whose every row the caps left out is in no row’s group, and the top-level omitted still counts its rows', () => {
    const list = [
      listed({ id: 'a1', projectPath: '/w/a', createdAt: NOW - MIN }),
      listed({ id: 'a2', projectPath: '/w/a', createdAt: NOW - 2 * MIN }),
      listed({ id: 'b1', projectPath: '/w/b', createdAt: NOW - DAY })
    ];
    const answer = withCaps(2, null, () => ask(createPocketRoutes(sessionsFacts(list)), 'show=all'));
    expect(answer.rows.map((r) => r.sessionId)).toEqual(['a1', 'a2']);
    expect(answer.groups.map((g) => g.id)).toEqual([idOfKey('/w/a')]);
    expect(answer.omitted).toBe(1);
    expect(answer.groups.reduce((sum, g) => sum + g.omitted, 0)).toBe(0);
    holdsTogether(answer);
  });
});

// ---------------------------------------------------------------------------
// PHASE 337 (build/p337/SPEC.md §5.2, §5.3.1): one session's screen
// ---------------------------------------------------------------------------

describe('the Screen (Phase 337, build/p337/SPEC.md §5.3.1)', () => {
  type ScreenAnswer = import('@shared/ipc/pocket').PocketScreenAnswer;
  type Screen = import('@shared/ipc/pocket').PocketScreen;
  const copy = import('@shared/screen-copy');
  const contract = import('@shared/ipc/pocket');

  const REV = '0123456789ab';
  const MARK = 'a1b2c3d4e5f6';

  /** A small honest screen, two rows, two styles. */
  function screenOfSize(cols = 4, rows = 2, over: Partial<Screen> = {}): Screen {
    const lines = Array.from({ length: rows }, (_, y) => (y === 0 ? [{ text: 'ab', style: 0, cells: 2 }, { text: String.fromCodePoint(0x6f22), style: 1, cells: 2 }] : []));
    return {
      cols,
      rows,
      cursor: { x: 1, y: 0, visible: true },
      alternate: false,
      ground: '#131417',
      ink: '#d8dbe2',
      caret: '#e8eaed',
      styles: [
        { fg: '#d8dbe2', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false },
        { fg: '#ff8800', bg: '#000000', bold: true, dim: false, italic: true, underline: true, strike: false }
      ],
      lines,
      turn: '0123456789abcdef-7',
      asking: false,
      dialog: null,
      typable: true,
      // PHASE 337.1 (build/p3371/SPEC.md D3): required, null together.
      depth: 1_234,
      space: 'feedc0ffee01',
      ...over
    };
  }

  function answerOf(over: Partial<ScreenAnswer> = {}): ScreenAnswer {
    return { sessionId: 'a', revision: REV, at: 99, unchanged: false, screen: screenOfSize(), why: null, sentence: null, ...over };
  }

  describe('the query (D2)', () => {
    it('reads id exactly once and since at most once, 12 lowercase hex', () => {
      expect(readScreenQuery(new URLSearchParams('id=3f2a1b4c-0000-4000-8000-000000000001'))).toEqual({
        ok: true,
        id: '3f2a1b4c-0000-4000-8000-000000000001',
        since: null
      });
      expect(readScreenQuery(new URLSearchParams(`id=a&since=${REV}`))).toEqual({ ok: true, id: 'a', since: REV });
      expect(readScreenQuery(new URLSearchParams(`since=${REV}&id=a`))).toEqual({ ok: true, id: 'a', since: REV });
    });

    it('takes a UUID, which is the id Tortie mints, and an id of 128 characters', () => {
      expect(readScreenQuery(new URLSearchParams('id=9e6c0d6a-1a51-4b33-8d0f-2a1b3c4d5e6f')).ok).toBe(true);
      expect(readScreenQuery(new URLSearchParams(`id=${'a'.repeat(128)}`)).ok).toBe(true);
    });

    const refused: [string, string, string][] = [
      ['no id', `since=${REV}`, 'id'],
      ['an empty id', 'id=', 'id'],
      ['an id of 129', `id=${'a'.repeat(129)}`, 'id'],
      ['a since of 11 hex', `id=a&since=${REV.slice(1)}`, 'since'],
      ['a since of 13 hex', `id=a&since=${REV}0`, 'since'],
      ['a since in upper case', 'id=a&since=0123456789AB', 'since'],
      ['a since that is not hex', 'id=a&since=0123456789ag', 'since'],
      ['an empty since', 'id=a&since=', 'since'],
      ['id twice', 'id=a&id=b', 'repeated'],
      ['since twice', `id=a&since=${REV}&since=${REV}`, 'repeated'],
      ['a size', 'id=a&cols=80', 'parameter'],
      ['rows', 'id=a&rows=24', 'parameter'],
      ['an unknown name', 'id=a&x=1', 'parameter']
    ];
    for (const [name, query, reason] of refused) {
      it(`refuses ${name} with ${reason}`, () => {
        expect(readScreenQuery(new URLSearchParams(query))).toEqual({ ok: false, reason });
      });
    }
  });

  describe('the route', () => {
    it('hands the watcher the session, since and the very closing, and answers what it composed', async () => {
      const asked: unknown[] = [];
      const closing = (): boolean => false;
      const routes = createPocketRoutes(
        facts({
          screen: async (session, since, handed) => {
            asked.push([session.id, since, handed]);
            return answerOf();
          }
        })
      );
      const got = await routes.screen(new URLSearchParams(`id=e&since=${REV}`), closing);
      expect(asked).toEqual([['e', REV, closing]]);
      expect(got).toEqual({ ...answerOf(), sessionId: 'e' });
    });

    it('answers null, and asks no watcher, for a refused query or an id nobody has', async () => {
      let asked = 0;
      const routes = createPocketRoutes(
        facts({
          screen: async () => {
            asked += 1;
            return answerOf();
          }
        })
      );
      for (const query of ['', 'id=nobody', 'id=a&since=nope', 'id=a&cols=80', 'id=a&id=a']) {
        expect(await routes.screen(new URLSearchParams(query), () => false), query).toBeNull();
      }
      expect(asked).toBe(0);
    });

    it('answers null when this Mac has no watcher: the route does not exist (404)', async () => {
      const routes = createPocketRoutes(facts());
      expect(await routes.screen(new URLSearchParams('id=a'), () => false)).toBeNull();
    });

    it('answers null, never a hang, when the watcher rejects or throws', async () => {
      const rejects = createPocketRoutes(facts({ screen: () => Promise.reject(new Error('read failed')) }));
      expect(await rejects.screen(new URLSearchParams('id=a'), () => false)).toBeNull();
      const throws = createPocketRoutes(
        facts({
          screen: () => {
            throw new Error('before the promise');
          }
        })
      );
      expect(await throws.screen(new URLSearchParams('id=a'), () => false)).toBeNull();
    });

    it('answers a session removed while the poll was held as an id nobody has, and nothing of it leaves', async () => {
      let listed: Session[] = SESSIONS;
      const routes = createPocketRoutes(
        facts({
          sessions: () => listed,
          screen: async () => {
            listed = SESSIONS.filter((s) => s.id !== 'a');
            return answerOf();
          }
        })
      );
      expect(await routes.screen(new URLSearchParams('id=a'), () => false)).toBeNull();
    });
  });

  describe('the answer, composed field by field (screenOf, D13)', () => {
    it('copies every field and nothing else, with fresh arrays, and the session the query named', () => {
      const from = answerOf({ sessionId: 'someone-else' });
      const extra = { ...from, secret: 'x', screen: { ...(from.screen as Screen), raw: 'styled bytes' } } as unknown as ScreenAnswer;
      (extra.screen as unknown as { styles: unknown[] }).styles = [
        { ...(from.screen as Screen).styles[0], colourSpace: 'p3' },
        (from.screen as Screen).styles[1]
      ];
      const got = screenOf(extra, 'a', 5);
      expect(got).toEqual({ ...from, sessionId: 'a' });
      expect(Object.keys(got ?? {})).toEqual(['sessionId', 'revision', 'at', 'unchanged', 'screen', 'why', 'sentence']);
      expect(Object.keys(got?.screen ?? {}).sort()).toEqual(
        [
          'alternate',
          'caret',
          'cols',
          'cursor',
          'dialog',
          'ground',
          'ink',
          'lines',
          'rows',
          'styles',
          'turn',
          'typable',
          'asking',
          'depth',
          'space'
        ].sort()
      );
      expect(got?.screen?.lines).not.toBe(from.screen?.lines);
      expect(got?.screen?.lines[0]).not.toBe(from.screen?.lines[0]);
      expect(got?.screen?.styles).not.toBe(from.screen?.styles);
      expect(Object.keys(got?.screen?.styles[0] ?? {}).sort()).toEqual(['bg', 'bold', 'dim', 'fg', 'italic', 'strike', 'underline']);
    });

    it('carries unchanged and nothing else', () => {
      expect(screenOf(answerOf({ unchanged: true }), 'a', 5)).toEqual({
        sessionId: 'a',
        revision: REV,
        at: 99,
        unchanged: true,
        screen: null,
        why: null,
        sentence: null
      });
    });

    it('answers each absence with main’s own sentence for its word, whatever the watcher said', async () => {
      const words = await copy;
      expect(screenOf(answerOf({ screen: null, why: 'ended', sentence: 'anything' }), 'a', 5)).toMatchObject({
        why: 'ended',
        screen: null,
        sentence: words.SCREEN_ENDED
      });
      expect(screenOf(answerOf({ screen: null, why: 'unreachable', sentence: null }), 'a', 5)?.sentence).toBe(words.SCREEN_UNREACHABLE);
      expect(screenOf(answerOf({ screen: null, why: 'large', sentence: null }), 'a', 5)?.sentence).toBe(words.SCREEN_TOO_LARGE);
      expect(screenOf(answerOf({ screen: null, why: 'gone' as never }), 'a', 5)).toBeNull();
    });

    it('answers null for a revision that is not 12 lowercase hex, or an unchanged that is not a boolean', () => {
      for (const revision of ['', REV.slice(1), `${REV}0`, '0123456789AB', 7 as unknown as string]) {
        expect(screenOf(answerOf({ revision }), 'a', 5), String(revision)).toBeNull();
      }
      expect(screenOf(answerOf({ unchanged: 'no' as unknown as boolean }), 'a', 5)).toBeNull();
      expect(screenOf(null as unknown as ScreenAnswer, 'a', 5)).toBeNull();
    });

    it('stamps the time it was handed when the watcher carried none', () => {
      expect(screenOf(answerOf({ at: Number.NaN }), 'a', 5)?.at).toBe(5);
    });

    it('answers large past each cap, read from the contract (D15)', async () => {
      const c = await contract;
      const words = await copy;
      const large = (screen: Screen): void => {
        expect(screenOf(answerOf({ screen }), 'a', 5)).toMatchObject({ why: 'large', screen: null, sentence: words.SCREEN_TOO_LARGE });
      };
      large(screenOfSize(c.POCKET_SCREEN_MAX_COLS + 1, 2));
      large(screenOfSize(4, c.POCKET_SCREEN_MAX_ROWS + 1));
      const style = screenOfSize().styles[0];
      large(screenOfSize(4, 2, { styles: Array.from({ length: c.POCKET_SCREEN_MAX_STYLES + 1 }, () => ({ ...style })) as Screen['styles'] }));
      // Runs: 200 rows of 82 one-cell runs is 16,400, past 16,384.
      const many = Array.from({ length: 200 }, () => Array.from({ length: 82 }, () => ({ text: 'x', style: 0, cells: 1 })));
      large(screenOfSize(82, 200, { lines: many }));
      // Bytes: 200 rows of 512 cells, each a letter under nine combining
      // accents (19 bytes a cell), is about 1.9 MB as JSON: within every other
      // cap and over the answer's.
      const cell = `a${String.fromCodePoint(0x301).repeat(9)}`;
      const heavy = Array.from({ length: 200 }, () => [{ text: cell.repeat(512), style: 0, cells: 512 }]);
      large(screenOfSize(512, 200, { lines: heavy }));
      // And one row of the same is drawn: the byte cap reads the whole answer, not a row.
      const light = [[{ text: cell.repeat(512), style: 0, cells: 512 }], []];
      expect(screenOf(answerOf({ screen: screenOfSize(512, 2, { lines: light }) }), 'a', 5)?.screen?.cols).toBe(512);
      // And exactly at the caps it is drawn.
      const atCols = screenOf(answerOf({ screen: screenOfSize(c.POCKET_SCREEN_MAX_COLS, c.POCKET_SCREEN_MAX_ROWS) }), 'a', 5);
      expect(atCols?.screen?.cols).toBe(512);
    });

    const malformed: [string, Partial<Screen>][] = [
      ['cols of 0', { cols: 0 }],
      ['cols that is not whole', { cols: 4.5 }],
      ['a cursor past the columns', { cursor: { x: 5, y: 0, visible: true } }],
      ['a cursor on the row past the last', { cursor: { x: 0, y: 2, visible: true } }],
      ['a cursor visible that is not a boolean', { cursor: { x: 0, y: 0, visible: 1 as unknown as boolean } }],
      ['a ground that is not #rrggbb', { ground: '#13141' }],
      ['an ink in upper case', { ink: '#D8DBE2' }],
      ['a caret with no #', { caret: 'e8eaed0' }],
      ['a dialog of 11 hex', { dialog: MARK.slice(1) }],
      ['an empty turn', { turn: '' }],
      ['asking that is not a boolean', { asking: 'yes' as unknown as boolean }],
      ['lines one short of rows', { lines: [[]] }],
      ['a run whose style is out of range', { lines: [[{ text: 'a', style: 2, cells: 1 }], []] }],
      ['a run of no cells', { lines: [[{ text: 'a', style: 0, cells: 0 }], []] }],
      ['a run wider than cols', { lines: [[{ text: 'abcde', style: 0, cells: 5 }], []] }],
      [
        'a row whose runs together pass cols',
        { lines: [[{ text: 'abc', style: 0, cells: 3 }, { text: 'de', style: 0, cells: 2 }], []] }
      ],
      ['a run whose text is not a string', { lines: [[{ text: 7 as unknown as string, style: 0, cells: 1 }], []] }],
      [
        'a style whose fg is not a colour',
        { styles: [{ fg: 'red', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }] }
      ],
      // PHASE 337.1 (build/p3371/SPEC.md D3): `depth` and `space` are null
      // TOGETHER, or a whole number in the index bound beside 12 lowercase hex.
      ['a depth with no space', { space: null }],
      ['a space with no depth', { depth: null }],
      ['a depth that is not whole', { depth: 12.5 }],
      ['a negative depth', { depth: -1 }],
      ['a depth past the index bound', { depth: 100_001 }],
      ['a depth that is a string', { depth: '12' as unknown as number }],
      ['a depth that is absent', { depth: undefined as unknown as number }],
      ['a space of 11 hex', { space: 'feedc0ffee0' }],
      ['a space in upper case', { space: 'FEEDC0FFEE01' }],
      ['a space that is not hex', { space: 'feedc0ffee0g' }],
      ['a space that is absent', { space: undefined as unknown as string }]
    ];
    for (const [name, over] of malformed) {
      it(`answers null, never a malformed screen, for ${name}`, () => {
        expect(screenOf(answerOf({ screen: screenOfSize(4, 2, over) }), 'a', 5)).toBeNull();
      });
    }

    it('carries depth and space as the watcher composed them, and both null together', () => {
      expect(screenOf(answerOf(), 'a', 5)?.screen).toMatchObject({ depth: 1_234, space: 'feedc0ffee01' });
      expect(screenOf(answerOf({ screen: screenOfSize(4, 2, { depth: 0 }) }), 'a', 5)?.screen?.depth).toBe(0);
      expect(screenOf(answerOf({ screen: screenOfSize(4, 2, { depth: 100_000 }) }), 'a', 5)?.screen?.depth).toBe(100_000);
      const none = screenOf(answerOf({ screen: screenOfSize(4, 2, { depth: null, space: null }) }), 'a', 5);
      expect(none?.screen).toMatchObject({ depth: null, space: null });
      expect(Object.keys(none?.screen ?? {})).toContain('depth');
      expect(Object.keys(none?.screen ?? {})).toContain('space');
    });

    it('takes a dialog mark while asking, and a cursor at the last column', () => {
      const got = screenOf(answerOf({ screen: screenOfSize(4, 2, { asking: true, dialog: MARK, cursor: { x: 4, y: 1, visible: false } }) }), 'a', 5);
      expect(got?.screen).toMatchObject({ asking: true, dialog: MARK, cursor: { x: 4, y: 1, visible: false } });
    });
  });

  describe('`screen` on one session (D32)', () => {
    it('is true exactly for a running, idle or waiting session when this Mac answers the Screen', async () => {
      const statuses = ['running', 'idle', 'needs_input', 'exited', 'restorable', 'unknown', 'discarded'] as const;
      const rows = statuses.map((status) => session({ id: `s-${status}`, name: status, status }));
      // The one live partition, read off the gates and never listed (T23).
      for (const row of rows) expect(screenLive(row), row.status).toBe(row.status === 'running' || row.status === 'idle' || row.status === 'needs_input');
      const routes = createPocketRoutes(facts({ sessions: () => rows, screen: async () => answerOf() }));
      for (const status of statuses) {
        const got = await routes.session(`s-${status}`);
        expect(got?.session.screen, status).toBe(status === 'running' || status === 'idle' || status === 'needs_input');
      }
    });

    it('is false on every session when this Mac has no watcher, and always present', async () => {
      const routes = createPocketRoutes(facts());
      for (const id of ['a', 'e', 'f']) {
        const got = await routes.session(id);
        expect(got?.session.screen, id).toBe(false);
        expect(Object.keys(got?.session ?? {})).toContain('screen');
      }
    });

    it('never asks the watcher to answer /v1/session, and no blocked or other row carries it', async () => {
      let asked = 0;
      const routes = createPocketRoutes(
        facts({
          screen: async () => {
            asked += 1;
            return answerOf();
          }
        })
      );
      await routes.session('a');
      const blocked = routes.blocked();
      expect(asked).toBe(0);
      for (const row of [...blocked.rows, ...blocked.others]) expect('screen' in row, row.sessionId).toBe(false);
    });
  });
});
