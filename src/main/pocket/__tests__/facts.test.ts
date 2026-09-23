/**
 * The door's production facts (Phase 316, S1 mechanisms 1 to 3), driven
 * through the SHIPPING routes over a REAL overview store.
 *
 * The store is a scratch SQLite file, so every turn, count and `more` here is
 * the shipping statement's answer and not a fake's arithmetic. The reader and
 * git are faked at their seams exactly as `../../overview/__tests__/activity.test.ts`
 * fakes them, which is what lets this file APPEND a turn to a session's record
 * between two reads and watch the door answer it.
 *
 * What each block would catch if its clause were removed:
 *
 *  - "fresh before read": the refresh call in `../routes.ts` (session, turns)
 *    or `refresh` in `../facts.ts`. Without it the store is never written and
 *    the first read answers no turns, and the appended turn never appears.
 *  - "the turns reader": the `more` rule, the `from`/`to` arms, and the ONE
 *    pass through `toTurnView` (a 5,000-character ask comes back clipped).
 *  - "absence": `answerAbsence` from src/shared/overview-copy.ts, all three
 *    arms, and null beside an answer.
 *  - "the Catch Me Up line": `buildProjectLine` over the STORED git verdict,
 *    with no git command run, and the honest line for each read state.
 *  - "the words": the shared status table, the blocked feed installed by the
 *    facts, the activity map read through the core.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session } from '@shared/types';
import {
  ANSWER_NOT_IN_RECORD,
  NOT_ANSWERED_YET,
  OUTCOME_DONE_GIT_AGREES,
  OUTCOME_NO_ANSWER,
  OUTCOME_REMOTE,
  OUTCOME_SHELL,
  OUTCOME_WAITING,
  STOPPED_BEFORE_ANSWER,
  outcomeUnreadable
} from '@shared/overview-copy';
import type { ManifestSessionRecord, ManifestStore } from '../../manifest';
import type { ReadResult, ReadTurn } from '../../overview/reader';
import { openOverviewStore, type OverviewStore } from '../../overview/store';
import { resetBlockedFeedForTests } from '../../tray/blocked-feed';

const seams = vi.hoisted(() => ({
  readSessionLog: vi.fn(),
  resolveSessionLog: vi.fn(),
  providerVersion: vi.fn(() => 1),
  keepMapHash: vi.fn(() => 'map-hash'),
  providerMap: vi.fn(() => null),
  readGitEvidence: vi.fn(),
  markTurn: vi.fn()
}));

vi.mock('../../overview/reader', () => ({
  readSessionLog: seams.readSessionLog,
  resolveSessionLog: seams.resolveSessionLog,
  providerVersion: seams.providerVersion,
  keepMapHash: seams.keepMapHash,
  providerMap: seams.providerMap
}));

vi.mock('../../overview/git-mark', () => ({
  readGitEvidence: seams.readGitEvidence,
  markTurn: seams.markTurn
}));

const { createPocketFacts, pocketLineKind, readPocketTurns } = await import('../facts');
const { createPocketRoutes } = await import('../routes');

const PROJECT = '/repo/demo';
const NOW = 1_756_000_000_000;
const ASK_AT = '2026-08-20T10:00:00.000Z';
const ANSWER_AT = '2026-08-20T10:05:00.000Z';

function turn(index: number, over: Partial<ReadTurn> = {}): ReadTurn {
  return {
    index,
    ask: { text: `ask ${index}`, at: ASK_AT, queued: 1 },
    answer: { text: `answer ${index}`, at: ANSWER_AT },
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: null,
    durationMs: 1_000,
    paths: [],
    pathSource: 'tool-calls',
    ...over
  };
}

function turns(n: number): ReadTurn[] {
  return Array.from({ length: n }, (_, i) => turn(i));
}

function readResult(over: Partial<ReadResult> = {}): ReadResult {
  return {
    provider: 'claude',
    work: 'full',
    turns: [],
    watermark: null,
    join: { sessionId: null, cwd: null, threadSource: null },
    meta: { model: null, branch: null },
    lastTouchedAt: ANSWER_AT,
    honest: null,
    acct: {
      bytesRead: 0,
      bytesParsed: 0,
      lines: 0,
      linesParsed: 0,
      size: 0,
      peakLineBuffer: 0,
      prefilter: 'head',
      turnMode: 'markers'
    },
    ...over
  };
}

function session(over: Partial<Session> & Pick<Session, 'id'>): Session {
  return {
    name: over.id,
    tmuxName: over.id,
    projectPath: PROJECT,
    cwd: PROJECT,
    agent: 'claude',
    status: 'running',
    createdAt: 1_000,
    ...over
  } as Session;
}

function record(s: Session): ManifestSessionRecord {
  return {
    id: s.id,
    name: s.name,
    tmuxName: s.tmuxName,
    projectPath: s.projectPath,
    cwd: s.cwd,
    agent: s.agent,
    agentSessionId: `conv-${s.id}`,
    status: s.status,
    createdAt: s.createdAt,
    argv: ['claude'],
    lastSeen: s.createdAt,
    machineId: s.machine === undefined ? 'local' : s.machine.id
  } as unknown as ManifestSessionRecord;
}

const REMOTE_MACHINE = {
  id: 'studio',
  label: 'Mac Pro',
  color: 'blue',
  answering: true,
  canRestore: false,
  reason: null
} as unknown as NonNullable<Session['machine']>;

let dir: string;
let store: OverviewStore;
let live: Session[];
let activityNow: Map<string, { question?: string; lastActivityAt?: number }>;

/** The core, as far as the facts read it. The broadcast slot is the feed's. */
const core = {
  onSessionsBroadcast: null as ((s: Session[]) => void) | null,
  listSessions: (): Session[] => live,
  listProjects: (): Project[] => [{ id: 'p', path: PROJECT, name: 'demo' }],
  activityOf: (id: string) => activityNow.get(id)
};

function facts(options: { onManifest?: () => void } = {}) {
  return createPocketFacts({
    core: () => core,
    overview: {
      manifest: () => {
        options.onManifest?.();
        return Promise.resolve({
          getSession: (id: string) => {
            const s = live.find((x) => x.id === id);
            return s === undefined ? undefined : record(s);
          },
          listSessions: () => live.map(record)
        } as unknown as ManifestStore);
      },
      store: () => store,
      now: () => NOW
    },
    wakes: () => [],
    now: () => NOW
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-pocket-facts-'));
  store = openOverviewStore(join(dir, 'overview.db'));
  live = [session({ id: 'S1' })];
  activityNow = new Map();
  core.onSessionsBroadcast = null;
  resetBlockedFeedForTests();
  for (const seam of Object.values(seams)) seam.mockReset();
  seams.providerVersion.mockReturnValue(1);
  seams.keepMapHash.mockReturnValue('map-hash');
  seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) => ({
    state: 'resolved',
    provider: 'claude',
    file: `/scratch-home/${String(input.agentSessionId)}.jsonl`,
    sessionId: null
  }));
  seams.readSessionLog.mockReturnValue(readResult({ turns: turns(3) }));
});

afterEach(() => {
  resetBlockedFeedForTests();
  try {
    store.close();
  } catch {
    // Already closed.
  }
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('fresh before read', () => {
  it('fills an EMPTY store before the first read, so the door never answers stale', async () => {
    expect(store.countTurns('S1')).toBe(0);
    const answer = await createPocketRoutes(facts()).turns('S1', {});
    expect(answer?.turns.map((t) => t.index)).toEqual([0, 1, 2]);
    expect(answer?.more).toBe(false);
    expect(answer?.note).toBeNull();
  });

  it('shows a turn appended to the record on the very next read', async () => {
    const routes = createPocketRoutes(facts());
    expect((await routes.turns('S1', {}))?.turns).toHaveLength(3);
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [...turns(3), turn(3, { ask: { text: 'the new one', at: ASK_AT, queued: 1 } })] })
    );
    const next = await routes.turns('S1', {});
    expect(next?.turns.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(next?.turns[3]?.askText).toBe('the new one');
  });

  it('carries the session manager’s counts from the SAME refresh, and the last answer and count', async () => {
    const answer = await createPocketRoutes(facts()).session('S1');
    expect(answer?.session.activity).toMatchObject({
      sessionId: 'S1',
      coverage: 'complete',
      userMessages: 3,
      agentMessages: 3,
      lastMessageBy: 'agent'
    });
    expect(answer?.session.lastMessageText).not.toBeNull();
    expect(answer?.session.lastAnswer).toBe('answer 2');
    expect(answer?.session.turnCount).toBe(3);
    expect(answer?.session.turnCount).toBe(store.countTurns('S1'));
  });

  it('runs no git command, whatever it answers', async () => {
    const routes = createPocketRoutes(facts());
    await routes.session('S1');
    await routes.turns('S1', {});
    expect(seams.readGitEvidence).not.toHaveBeenCalled();
    expect(seams.markTurn).not.toHaveBeenCalled();
  });

  it('answers a session removed during the refresh as an id nobody has', async () => {
    const routes = createPocketRoutes(
      facts({
        onManifest: () => {
          live = [];
        }
      })
    );
    expect(await routes.turns('S1', {})).toBeNull();
    live = [session({ id: 'S1' })];
    const again = createPocketRoutes(facts({ onManifest: () => (live = []) }));
    expect(await again.session('S1')).toBeNull();
  });

  it('answers a remote session’s turns with OUTCOME_REMOTE and reads nothing for it', async () => {
    live = [session({ id: 'R1', machine: REMOTE_MACHINE })];
    const answer = await createPocketRoutes(facts()).turns('R1', {});
    expect(answer?.turns).toEqual([]);
    expect(answer?.note).toBe(OUTCOME_REMOTE);
    expect(seams.resolveSessionLog).not.toHaveBeenCalled();
    expect(seams.readSessionLog).not.toHaveBeenCalled();
  });
});

describe('the turns reader', () => {
  beforeEach(() => {
    seams.readSessionLog.mockReturnValue(readResult({ turns: turns(50) }));
  });

  it('pages back from the newest turn to the first, and the pages add up to countTurns', async () => {
    const routes = createPocketRoutes(facts());
    const seen: number[] = [];
    let page = await routes.turns('S1', { limit: '20' });
    let pages = 0;
    for (;;) {
      pages += 1;
      const indexes = page?.turns.map((t) => t.index) ?? [];
      // Every page is ascending and strictly OLDER than the one before it.
      expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
      if (seen.length > 0) expect(Math.max(...indexes)).toBeLessThan(Math.min(...seen));
      seen.push(...indexes);
      if (page?.more !== true) break;
      const first = indexes[0] ?? 0;
      page = await routes.turns('S1', { limit: '20', to: String(first - 1) });
    }
    expect(pages).toBe(3);
    expect(seen.length).toBe(store.countTurns('S1'));
    expect(new Set(seen).size).toBe(50);
    expect(Math.min(...seen)).toBe(0);
  });

  it('answers the newest page first, and more exactly when an older turn exists', async () => {
    const routes = createPocketRoutes(facts());
    const newest = await routes.turns('S1', { limit: '20' });
    expect(newest?.turns[0]?.index).toBe(30);
    expect(newest?.turns.at(-1)?.index).toBe(49);
    expect(newest?.more).toBe(true);
    const oldest = await routes.turns('S1', { limit: '20', to: '9' });
    expect(oldest?.turns.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(oldest?.more).toBe(false);
    const between = await routes.turns('S1', { limit: '5', from: '10', to: '19' });
    expect(between?.turns.map((t) => t.index)).toEqual([15, 16, 17, 18, 19]);
    expect(between?.more).toBe(true);
    const fromOnly = await routes.turns('S1', { limit: '3', from: '45' });
    expect(fromOnly?.turns.map((t) => t.index)).toEqual([47, 48, 49]);
  });

  it('answers an empty page past the end with more false', async () => {
    const answer = await createPocketRoutes(facts()).turns('S1', { from: '60', to: '70' });
    expect(answer?.turns).toEqual([]);
    expect(answer?.more).toBe(false);
  });

  it('holds a hostile limit to the ceiling', async () => {
    const answer = await createPocketRoutes(facts()).turns('S1', { limit: '999999999' });
    expect(answer?.turns).toHaveLength(50);
  });

  it('passes every turn ONCE through the one clip, and carries no git mark', async () => {
    const long = 'x'.repeat(5_000);
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0, { ask: { text: long, at: ASK_AT, queued: 1 } })] })
    );
    const answer = await createPocketRoutes(facts()).turns('S1', {});
    const first = answer?.turns[0];
    expect(first?.askText.length).toBe(4_000);
    expect(first?.askClipped).toBe(true);
    expect(Object.keys(first ?? {}).sort()).toEqual(
      [
        'absence',
        'answerAt',
        'answerClipped',
        'answerText',
        'askAt',
        'askClipped',
        'askText',
        'closed',
        'index',
        'interrupted',
        'notice'
      ].sort()
    );
  });

  it('reads a 4,000-character one-word ask back byte for byte', async () => {
    const word = 'y'.repeat(4_000);
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0, { ask: { text: word, at: ASK_AT, queued: 1 } })] })
    );
    const answer = await createPocketRoutes(facts()).turns('S1', {});
    expect(answer?.turns[0]?.askText).toBe(word);
    expect(answer?.turns[0]?.askClipped).toBe(false);
  });

  it('is the store’s own two readers and no SQL of its own (readPocketTurns over a counting store)', () => {
    const calls: string[] = [];
    const fake = {
      listTurns: (id: string, limit?: number) => {
        calls.push(`listTurns ${id} ${String(limit)}`);
        return [];
      },
      listTurnsBetween: (id: string, from: number, to: number, limit?: number) => {
        calls.push(`between ${id} ${from} ${to} ${String(limit)}`);
        return [];
      }
    };
    readPocketTurns(fake, 'S1', { limit: 20, from: null, to: null }, 'running');
    readPocketTurns(fake, 'S1', { limit: 20, from: null, to: 9 }, 'running');
    readPocketTurns(fake, 'S1', { limit: 20, from: 4, to: null }, 'running');
    expect(calls).toEqual([
      'listTurns S1 20',
      'between S1 0 9 20',
      `between S1 4 ${Number.MAX_SAFE_INTEGER} 20`
    ]);
  });
});

describe('absence', () => {
  it('draws the three honest sentences from the turn and the session, and none beside an answer', async () => {
    live = [session({ id: 'S1', status: 'running' })];
    seams.readSessionLog.mockReturnValue(
      readResult({
        turns: [
          turn(0),
          turn(1, { answer: null, closed: true, interrupted: true }),
          turn(2, { answer: null, closed: true }),
          turn(3, { answer: null, closed: false })
        ]
      })
    );
    const answer = await createPocketRoutes(facts()).turns('S1', {});
    expect(answer?.turns.map((t) => t.absence)).toEqual([
      null,
      STOPPED_BEFORE_ANSWER,
      ANSWER_NOT_IN_RECORD,
      NOT_ANSWERED_YET
    ]);
    // The SAME open turn of a session that has ended was never answered.
    live = [session({ id: 'S1', status: 'exited' })];
    const ended = await createPocketRoutes(facts()).turns('S1', {});
    expect(ended?.turns[3]?.absence).toBe(ANSWER_NOT_IN_RECORD);
  });
});

describe('the Catch Me Up line', () => {
  it('is buildProjectLine over the STORED git verdict, with the first clause of the ask', async () => {
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0, { ask: { text: 'wire the door. Then test it', at: ASK_AT, queued: 1 } })] })
    );
    const routes = createPocketRoutes(facts());
    // Before anything is stored as a verdict the mark is "nothing to check",
    // so an answered turn reads as answered.
    const first = await routes.session('S1');
    expect(first?.session.catchUp).toEqual({ ask: 'wire the door', outcome: 'Answered' });
    // The page stores its verdict; the record has not moved since, so the
    // next refresh reads nothing new and rewrites no turn.
    store.setGitVerdict('S1', 0, 'agrees', NOW);
    seams.readSessionLog.mockReturnValue(readResult({ work: 'none', turns: [] }));
    const second = await routes.session('S1');
    expect(second?.session.catchUp).toEqual({ ask: 'wire the door', outcome: OUTCOME_DONE_GIT_AGREES });
  });

  it('says the agent is waiting for a waiting session with an open turn', async () => {
    live = [session({ id: 'S1', status: 'needs_input' })];
    seams.readSessionLog.mockReturnValue(readResult({ turns: [turn(0, { answer: null, closed: false })] }));
    const answer = await createPocketRoutes(facts()).session('S1');
    expect(answer?.session.catchUp?.outcome).toBe(OUTCOME_WAITING);
  });

  it('draws the honest line for a shell, a remote row and an unreadable record', async () => {
    live = [
      session({ id: 'SH', agent: 'shell' }),
      session({ id: 'R1', machine: REMOTE_MACHINE }),
      session({ id: 'U1' })
    ];
    seams.readSessionLog.mockImplementation(() => {
      throw new Error('The file is locked.');
    });
    const routes = createPocketRoutes(facts());
    expect((await routes.session('SH'))?.session.catchUp?.outcome).toBe(OUTCOME_SHELL);
    expect((await routes.session('R1'))?.session.catchUp?.outcome).toBe(OUTCOME_REMOTE);
    expect((await routes.session('U1'))?.session.catchUp?.outcome).toBe(
      outcomeUnreadable('The file is locked.')
    );
    expect((await routes.session('U1'))?.session.lastAnswer).toBeNull();
  });

  it('maps every read state the store records', () => {
    const local = { agent: 'claude' as const, machine: undefined };
    expect(pocketLineKind(local, null, false)).toBe('no-turns');
    expect(pocketLineKind(local, { readState: 'ok' }, true)).toBe('turns');
    expect(pocketLineKind(local, { readState: 'ok' }, false)).toBe('no-turns');
    expect(pocketLineKind(local, { readState: 'no-file' }, true)).toBe('no-turns');
    expect(pocketLineKind(local, { readState: 'no-store' }, true)).toBe('no-store');
    expect(pocketLineKind(local, { readState: 'unreadable' }, true)).toBe('unreadable');
    expect(pocketLineKind(local, { readState: 'wrong-conversation' }, true)).toBe('wrong-conversation');
    expect(pocketLineKind(local, { readState: 'shell' }, true)).toBe('shell');
    expect(pocketLineKind(local, { readState: 'remote' }, true)).toBe('remote');
    expect(pocketLineKind({ agent: 'shell', machine: undefined }, { readState: 'ok' }, true)).toBe('shell');
    expect(pocketLineKind({ agent: 'claude', machine: REMOTE_MACHINE }, { readState: 'ok' }, true)).toBe('remote');
  });

  it('never claims an answer the record does not hold', async () => {
    live = [session({ id: 'S1', status: 'idle' })];
    seams.readSessionLog.mockReturnValue(readResult({ turns: [turn(0, { answer: null, closed: false })] }));
    const answer = await createPocketRoutes(facts()).session('S1');
    expect(answer?.session.catchUp?.outcome).toBe(OUTCOME_NO_ANSWER);
  });
});

describe('the words and the stamps', () => {
  it('draws the status from the ONE shared table, raised by the shared rule', () => {
    live = [
      session({ id: 'EXIT1', status: 'exited', exitCode: 1 }),
      session({ id: 'K1', status: 'exited', exitSignal: 'term' }),
      session({ id: 'N1', status: 'needs_input' })
    ];
    const answer = createPocketRoutes(facts()).blocked();
    const byId = new Map([...answer.rows, ...answer.others].map((r) => [r.sessionId, r]));
    expect(byId.get('EXIT1')).toMatchObject({ statusLabel: 'failed (exit 1)', statusTitle: 'Failed (exit 1)', statusDot: 'failed' });
    expect(byId.get('K1')).toMatchObject({ statusLabel: 'killed (SIGTERM)', statusTitle: 'Killed (SIGTERM)' });
    expect(byId.get('N1')).toMatchObject({ statusLabel: 'needs input', statusTitle: 'Needs input', statusDot: 'attention' });
    expect(byId.get('N1')?.agentLabel).toBe('Claude Code');
    expect(answer.emptyLine).toBe('Nothing needs you');
  });

  it('installs the blocked feed, so a wait is stamped when it is first seen and not at creation', () => {
    live = [session({ id: 'N1', status: 'needs_input', createdAt: 1_000 })];
    const answer = createPocketRoutes(facts()).blocked();
    // A missing stamp would fall back to createdAt (1,000). The feed stamps
    // with the wall clock at its first pass, which is long after it.
    expect(answer.rows[0]?.blockedSince).toBeGreaterThan(1_000);
    expect(core.onSessionsBroadcast).not.toBeNull();
  });

  it('reads the question and the last output from the core’s activity map', () => {
    live = [session({ id: 'N1', status: 'needs_input' }), session({ id: 'W1', status: 'running' })];
    activityNow.set('N1', { question: 'May I edit src/auth/session.ts?' });
    activityNow.set('W1', { lastActivityAt: NOW - 120_000 });
    const answer = createPocketRoutes(facts()).blocked();
    expect(answer.rows[0]?.question).toBe('May I edit src/auth/session.ts?');
    expect(answer.others[0]?.ageText).toBe('2m');
  });

  it('answers empty, and installs nothing, while the core has not booted', () => {
    const early = createPocketFacts({
      core: () => null,
      overview: { manifest: () => Promise.reject(new Error('not yet')), store: () => store },
      wakes: () => []
    });
    expect(early.sessions()).toEqual([]);
    expect(early.projects()).toEqual([]);
    expect(core.onSessionsBroadcast).toBeNull();
    expect(createPocketRoutes(early).blocked().rows).toEqual([]);
  });

  it('offers no hand-off for any session', () => {
    expect(facts().handoff(session({ id: 'S1' }))).toBeNull();
  });
});
