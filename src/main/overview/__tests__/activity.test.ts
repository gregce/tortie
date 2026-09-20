/**
 * `overview:activity`, the orchestration (Phase 293, spec section 3.4).
 *
 * The reader and git are faked at their seams, exactly as service.test.ts
 * fakes them, and the STORE IS REAL: a scratch SQLite file, so the aggregate
 * that answers here is the shipping statement and not a fake's arithmetic.
 *
 * What this pins down:
 * - one row per asked id, in the asked order, a repeated id once;
 * - the refusals: no list, and more ids than the cap, both INVALID_INPUT;
 * - a REMOVED session is answered, while the page's read still skips it;
 * - the rows that need no read reach neither the resolver nor the store;
 * - the refresh is not optional: an empty store is filled by the call;
 * - one row whose resolve THROWS leaves every other row answered;
 * - rows are read one at a time with the event loop given a turn between;
 * - two calls never read at once, and a rejected call does not stop the next;
 * - no git command is ever run.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OVERVIEW_ACTIVITY_MAX_IDS } from '@shared/overview';
import { gmuxErrorPayloadOf } from '../../errors';
import type { ManifestSessionRecord, ManifestStore } from '../../manifest';
import type { ReadResult, ReadTurn } from '../reader';
import { openOverviewStore, type OverviewStore } from '../store';

const seams = vi.hoisted(() => ({
  readSessionLog: vi.fn(),
  resolveSessionLog: vi.fn(),
  providerVersion: vi.fn(() => 1),
  keepMapHash: vi.fn(() => 'map-hash'),
  providerMap: vi.fn(() => null),
  readGitEvidence: vi.fn(),
  markTurn: vi.fn()
}));

vi.mock('../reader', () => ({
  readSessionLog: seams.readSessionLog,
  resolveSessionLog: seams.resolveSessionLog,
  providerVersion: seams.providerVersion,
  keepMapHash: seams.keepMapHash,
  providerMap: seams.providerMap
}));

vi.mock('../git-mark', () => ({
  readGitEvidence: seams.readGitEvidence,
  markTurn: seams.markTurn
}));

const { sessionActivity } = await import('../activity');
const { projectOverview } = await import('../service');

const PROJECT = '/repo/demo';
const NOW = 1_756_000_000_000;
const ASK_AT = '2026-08-20T10:00:00.000Z';
const ANSWER_AT = '2026-08-20T10:05:00.000Z';

const BASE_ROW = {
  id: 'S1',
  name: 'claude-6',
  tmuxName: 'claude-6',
  projectPath: PROJECT,
  cwd: PROJECT,
  agent: 'claude',
  agentSessionId: 'aaaa',
  status: 'running',
  createdAt: 1_755_000_000_000,
  argv: ['claude'],
  lastSeen: 1_755_000_000_000,
  machineId: 'local'
};

function row(over: Record<string, unknown>): ManifestSessionRecord {
  return { ...BASE_ROW, ...over } as unknown as ManifestSessionRecord;
}

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

function readResult(over: Partial<ReadResult> = {}): ReadResult {
  return {
    provider: 'claude',
    work: 'full',
    turns: [],
    watermark: null,
    join: { sessionId: null, cwd: null, threadSource: null },
    meta: { model: null, branch: null },
    lastTouchedAt: null,
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

let dir: string;
let store: OverviewStore;
let storeOpens: number;
let manifestCalls: string[];

interface DepsOptions {
  /** Called at the top of every `manifest()`. */
  onManifest?: () => void;
}

function makeDeps(rows: ManifestSessionRecord[], options: DepsOptions = {}) {
  return {
    manifest: () => {
      options.onManifest?.();
      return Promise.resolve({
        // BY ID. `listSessions` is here only for the page's read below, and
        // the activity read is pinned never to call it.
        getSession: (id: string) => {
          manifestCalls.push(`get:${id}`);
          return rows.find((r) => r.id === id);
        },
        listSessions: () => {
          manifestCalls.push('list');
          return rows;
        }
      } as unknown as ManifestStore);
    },
    store: () => {
      storeOpens += 1;
      return store;
    },
    now: () => NOW
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-activity-'));
  store = openOverviewStore(join(dir, 'overview.db'));
  storeOpens = 0;
  manifestCalls = [];
  seams.readSessionLog.mockReset();
  seams.resolveSessionLog.mockReset();
  seams.providerVersion.mockReset();
  seams.providerVersion.mockReturnValue(1);
  seams.keepMapHash.mockReset();
  seams.keepMapHash.mockReturnValue('map-hash');
  seams.readGitEvidence.mockReset();
  seams.readGitEvidence.mockResolvedValue({
    isGitRepo: true,
    committedAtMs: new Map(),
    workingTree: new Set()
  });
  seams.markTurn.mockReset();
  seams.markTurn.mockReturnValue({ git: 'agrees', namedOnlyOutside: false });
  seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) => ({
    state: 'resolved',
    provider: 'claude',
    file: `/scratch-home/${String(input.agentSessionId)}.jsonl`,
    sessionId: null
  }));
  seams.readSessionLog.mockReturnValue(
    readResult({ turns: [turn(0), turn(1)], lastTouchedAt: ANSWER_AT })
  );
});

afterEach(() => {
  try {
    store.close();
  } catch {
    // Already closed.
  }
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('the answer', () => {
  it('is one row per asked id, in the ASKED order, whatever order the manifest holds them in', async () => {
    const rows = [
      row({ id: 'A', agentSessionId: 'a' }),
      row({ id: 'B', agent: 'shell', agentSessionId: undefined }),
      row({ id: 'C', agentSessionId: 'c' })
    ];
    const out = await sessionActivity(makeDeps(rows), {
      sessionIds: ['C', 'nobody', 'B', 'A']
    });
    expect(out.readAt).toBe(NOW);
    expect(out.sessions.map((s) => s.sessionId)).toEqual(['C', 'nobody', 'B', 'A']);
    expect(out.sessions.map((s) => s.coverage)).toEqual([
      'complete',
      'unavailable',
      'not-applicable',
      'complete'
    ]);
    expect(out.sessions[1]?.reason).toBe('unknown-session');
  });

  it('counts through the real store: two turns read are two asks and two replies, with the reply’s own clock', async () => {
    const out = await sessionActivity(makeDeps([row({ id: 'A' })]), {
      sessionIds: ['A']
    });
    expect(out.sessions[0]).toEqual({
      sessionId: 'A',
      coverage: 'complete',
      reason: null,
      userMessages: 2,
      agentMessages: 2,
      lastMessageAt: Date.parse(ANSWER_AT),
      lastMessageBy: 'agent',
      lastMessageClock: 'message',
      readAt: NOW
    });
  });

  it('answers a repeated id once, at its first position, and drops a member that is no string', async () => {
    const out = await sessionActivity(makeDeps([row({ id: 'A' }), row({ id: 'B' })]), {
      sessionIds: ['B', 7, 'A', null, 'B', { id: 'A' }] as unknown as string[]
    });
    expect(out.sessions.map((s) => s.sessionId)).toEqual(['B', 'A']);
    expect(seams.resolveSessionLog).toHaveBeenCalledTimes(2);
  });

  it('answers an empty list with no rows, and asks nobody anything', async () => {
    const out = await sessionActivity(makeDeps([row({ id: 'A' })]), { sessionIds: [] });
    expect(out).toEqual({ readAt: NOW, sessions: [] });
    expect(manifestCalls).toEqual([]);
    expect(storeOpens).toBe(0);
  });

  it('asks the manifest BY ID, one row per asked id, and never lists every session', async () => {
    await sessionActivity(makeDeps([row({ id: 'A' }), row({ id: 'B' })]), {
      sessionIds: ['A', 'B']
    });
    expect(manifestCalls).toEqual(['get:A', 'get:B']);
  });

  it('runs no git command, ever', async () => {
    await sessionActivity(makeDeps([row({ id: 'A' })]), { sessionIds: ['A'] });
    expect(seams.readGitEvidence).not.toHaveBeenCalled();
    expect(seams.markTurn).not.toHaveBeenCalled();
  });
});

describe('the refusals', () => {
  async function codeOf(input: unknown): Promise<string | undefined> {
    try {
      await sessionActivity(makeDeps([row({ id: 'A' })]), input as never);
      return 'resolved';
    } catch (err) {
      return gmuxErrorPayloadOf(err)?.code;
    }
  }

  it('refuses more ids than the cap, whole, as INVALID_INPUT', async () => {
    const over = Array.from({ length: OVERVIEW_ACTIVITY_MAX_IDS + 1 }, (_, i) => `S${i}`);
    expect(await codeOf({ sessionIds: over })).toBe('INVALID_INPUT');
    expect(manifestCalls).toEqual([]);
    expect(storeOpens).toBe(0);
  });

  it('answers exactly the cap', async () => {
    const at = Array.from({ length: OVERVIEW_ACTIVITY_MAX_IDS }, (_, i) => `S${i}`);
    const out = await sessionActivity(makeDeps([]), { sessionIds: at });
    expect(out.sessions).toHaveLength(OVERVIEW_ACTIVITY_MAX_IDS);
    expect(new Set(out.sessions.map((s) => s.reason))).toEqual(new Set(['unknown-session']));
  });

  it.each([
    ['no input', undefined],
    ['null', null],
    ['a string', 'A'],
    ['no list', {}],
    ['a list that is a string', { sessionIds: 'A' }],
    ['a list that is an object', { sessionIds: { 0: 'A', length: 1 } }]
  ])('refuses %s as INVALID_INPUT', async (_name, input) => {
    expect(await codeOf(input)).toBe('INVALID_INPUT');
  });

  it('rejects as a promise and never throws at the call', () => {
    let returned: Promise<unknown> | undefined;
    expect(() => {
      returned = sessionActivity(makeDeps([]), null as never);
    }).not.toThrow();
    return expect(returned).rejects.toBeDefined();
  });
});

describe('the rows that need no read', () => {
  it('a session on another machine, a shell, a row with no conversation id and an unknown id reach NEITHER the resolver NOR the store', async () => {
    const rows = [
      // `machineId` and NO `machine`: the shape every real record has.
      row({ id: 'R', machineId: 'm1' }),
      row({ id: 'SH', agent: 'shell', agentSessionId: undefined }),
      row({ id: 'N', agentSessionId: undefined })
    ];
    const out = await sessionActivity(makeDeps(rows), {
      sessionIds: ['R', 'SH', 'N', 'nobody']
    });
    expect(out.sessions.map((s) => [s.coverage, s.reason])).toEqual([
      ['unavailable', 'remote'],
      ['not-applicable', 'shell'],
      ['unavailable', 'no-id'],
      ['unavailable', 'unknown-session']
    ]);
    for (const s of out.sessions) {
      expect(s.userMessages).toBeNull();
      expect(s.agentMessages).toBeNull();
      expect(s.lastMessageAt).toBeNull();
    }
    expect(seams.resolveSessionLog).not.toHaveBeenCalled();
    expect(seams.readSessionLog).not.toHaveBeenCalled();
    expect(storeOpens).toBe(0);
    expect(store.getSession('R')).toBeNull();
  });
});

describe('a removed session', () => {
  it('IS answered here, while the page’s read of the same project still skips it', async () => {
    const rows = [row({ id: 'A' }), row({ id: 'D', status: 'discarded', agentSessionId: 'd' })];
    const deps = makeDeps(rows);
    const out = await sessionActivity(deps, { sessionIds: ['D'] });
    expect(out.sessions[0]?.coverage).toBe('complete');
    expect(out.sessions[0]?.userMessages).toBe(2);
    // The store gained a row for the removed session. That is the stated cost.
    expect(store.getSession('D')?.readState).toBe('ok');

    const page = await projectOverview(deps, { projectPath: PROJECT });
    expect(Object.keys(page.reads)).toEqual(['A']);
    expect(page.sessions.map((s) => s.sessionId)).toEqual(['A']);
  });
});

describe('the refresh', () => {
  it('is not optional: an EMPTY store is filled by the call, so a closed project’s row is never stale', async () => {
    expect(store.getSession('A')).toBeNull();
    await sessionActivity(makeDeps([row({ id: 'A' })]), { sessionIds: ['A'] });
    expect(store.getSession('A')?.readState).toBe('ok');
    expect(store.countTurns('A')).toBe(2);
  });

  it('reads with the row’s OWN project path, because the sheet spans every project', async () => {
    await sessionActivity(
      makeDeps([row({ id: 'A', projectPath: '/somewhere/else', cwd: '/somewhere/else/pkg' })]),
      { sessionIds: ['A'] }
    );
    expect(seams.readSessionLog.mock.calls[0]?.[0]?.projectPath).toBe('/somewhere/else');
  });

  it('picks up what changed since the last call: a third turn moves the counts', async () => {
    const deps = makeDeps([row({ id: 'A' })]);
    await sessionActivity(deps, { sessionIds: ['A'] });
    seams.readSessionLog.mockReturnValue(
      readResult({ work: 'tail', turns: [turn(2, { answer: null })] })
    );
    const out = await sessionActivity(deps, { sessionIds: ['A'] });
    expect(out.sessions[0]?.userMessages).toBe(3);
    expect(out.sessions[0]?.agentMessages).toBe(2);
    expect(out.sessions[0]?.lastMessageBy).toBe('you');
    expect(out.sessions[0]?.lastMessageAt).toBe(Date.parse(ASK_AT));
  });

  it('a record with nothing on disk is a dash with a reason, never a zero', async () => {
    seams.resolveSessionLog.mockReturnValue({ state: 'no-file', provider: 'claude' });
    const out = await sessionActivity(makeDeps([row({ id: 'A' })]), { sessionIds: ['A'] });
    expect(out.sessions[0]?.coverage).toBe('unavailable');
    expect(out.sessions[0]?.reason).toBe('not-yet');
    expect(out.sessions[0]?.userMessages).toBeNull();
  });

  it('a record read `ok` that held nothing IS the zero', async () => {
    seams.readSessionLog.mockReturnValue(readResult({ turns: [] }));
    const out = await sessionActivity(makeDeps([row({ id: 'A' })]), { sessionIds: ['A'] });
    expect(out.sessions[0]?.coverage).toBe('complete');
    expect(out.sessions[0]?.userMessages).toBe(0);
    expect(out.sessions[0]?.agentMessages).toBe(0);
    expect(out.sessions[0]?.lastMessageAt).toBeNull();
  });

  it('a record that has gone from disk keeps its stored counts, as partial', async () => {
    const deps = makeDeps([row({ id: 'A' })]);
    await sessionActivity(deps, { sessionIds: ['A'] });
    seams.resolveSessionLog.mockReturnValue({ state: 'no-file', provider: 'claude' });
    const out = await sessionActivity(deps, { sessionIds: ['A'] });
    expect(out.sessions[0]?.coverage).toBe('partial');
    expect(out.sessions[0]?.reason).toBe('record-gone');
    expect(out.sessions[0]?.userMessages).toBe(2);
    expect(out.sessions[0]?.agentMessages).toBe(2);
  });
});

describe('one bad row', () => {
  beforeEach(() => {
    seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) => {
      if (input.agentSessionId === 'bad') throw new Error('the index would not open');
      return {
        state: 'resolved',
        provider: 'claude',
        file: `/scratch-home/${String(input.agentSessionId)}.jsonl`,
        sessionId: null
      };
    });
  });

  it('whose RESOLVE throws leaves every other row answered, and is itself unavailable, unreadable', async () => {
    const rows = [
      row({ id: 'A', agentSessionId: 'a' }),
      row({ id: 'BAD', agentSessionId: 'bad' }),
      row({ id: 'C', agentSessionId: 'c' })
    ];
    const out = await sessionActivity(makeDeps(rows), { sessionIds: ['A', 'BAD', 'C'] });
    expect(out.sessions.map((s) => s.coverage)).toEqual([
      'complete',
      'unavailable',
      'complete'
    ]);
    const bad = out.sessions[1];
    expect(bad?.reason).toBe('unreadable');
    expect(bad?.userMessages).toBeNull();
    expect(bad?.agentMessages).toBeNull();
    expect(bad?.lastMessageAt).toBeNull();
    expect(bad?.lastMessageBy).toBeNull();
    expect(bad?.lastMessageClock).toBeNull();
    // It wrote nothing.
    expect(store.getSession('BAD')).toBeNull();
  });

  it('whose READ throws is the read path’s own `unreadable` line, and the others are answered', async () => {
    seams.resolveSessionLog.mockReset();
    seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) => ({
      state: 'resolved',
      provider: 'claude',
      file: `/scratch-home/${String(input.agentSessionId)}.jsonl`,
      sessionId: null
    }));
    seams.readSessionLog.mockImplementation((input: { file: string }) => {
      if (input.file.endsWith('/bad.jsonl')) throw new Error('permission denied');
      return readResult({ turns: [turn(0)] });
    });
    const out = await sessionActivity(
      makeDeps([row({ id: 'A', agentSessionId: 'a' }), row({ id: 'BAD', agentSessionId: 'bad' })]),
      { sessionIds: ['BAD', 'A'] }
    );
    expect(out.sessions[0]?.coverage).toBe('unavailable');
    expect(out.sessions[0]?.reason).toBe('unreadable');
    expect(out.sessions[1]?.coverage).toBe('complete');
  });

  it('that throws AFTER an earlier good read maps by what the store still holds', async () => {
    seams.resolveSessionLog.mockReset();
    seams.resolveSessionLog.mockReturnValue({
      state: 'resolved',
      provider: 'claude',
      file: '/scratch-home/a.jsonl',
      sessionId: null
    });
    const deps = makeDeps([row({ id: 'A', agentSessionId: 'a' })]);
    await sessionActivity(deps, { sessionIds: ['A'] });
    seams.resolveSessionLog.mockImplementation(() => {
      throw new Error('the index would not open');
    });
    const out = await sessionActivity(deps, { sessionIds: ['A'] });
    expect(out.sessions[0]?.coverage).toBe('complete');
    expect(out.sessions[0]?.userMessages).toBe(2);
  });
});

describe('one row at a time', () => {
  it('gives the event loop a turn BETWEEN rows, and none before the first', async () => {
    const events: string[] = [];
    seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) => {
      events.push(`row:${String(input.agentSessionId)}`);
      // Something else main has to do, queued while this row is being read.
      setImmediate(() => events.push(`other-after:${String(input.agentSessionId)}`));
      return { state: 'no-file', provider: 'claude' };
    });
    const rows = ['a', 'b', 'c'].map((k) => row({ id: k.toUpperCase(), agentSessionId: k }));
    await sessionActivity(makeDeps(rows), { sessionIds: ['A', 'B', 'C'] });
    expect(events.slice(0, 5)).toEqual([
      'row:a',
      'other-after:a',
      'row:b',
      'other-after:b',
      'row:c'
    ]);
  });
});

describe('two calls', () => {
  it('never read at once: the second starts after the first has answered', async () => {
    // A counting fake. `inFlight` goes up when a call reaches the manifest and
    // down when the call has made its one read of the store, which is the end
    // of its read work. The rows yield between reads, so without the queue
    // both calls would be in flight together and their rows would interleave.
    let inFlight = 0;
    let peak = 0;
    const order: string[] = [];
    seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) => {
      order.push(String(input.agentSessionId));
      return { state: 'no-file', provider: 'claude' };
    });
    const rows = ['a1', 'a2', 'b1', 'b2'].map((k) => row({ id: k, agentSessionId: k }));
    const deps = makeDeps(rows, {
      onManifest: () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
      }
    });
    const realList = store.listActivity.bind(store);
    vi.spyOn(store, 'listActivity').mockImplementation((ids) => {
      const out = realList(ids);
      inFlight -= 1;
      return out;
    });
    const [first, second] = await Promise.all([
      sessionActivity(deps, { sessionIds: ['a1', 'a2'] }),
      sessionActivity(deps, { sessionIds: ['b1', 'b2'] })
    ]);
    expect(peak).toBe(1);
    expect(order).toEqual(['a1', 'a2', 'b1', 'b2']);
    expect(first.sessions.map((s) => s.sessionId)).toEqual(['a1', 'a2']);
    expect(second.sessions.map((s) => s.sessionId)).toEqual(['b1', 'b2']);
  });

  it('a call that REJECTS does not stop the next one', async () => {
    const failing = {
      manifest: () => Promise.reject(new Error('the manifest is not open yet')),
      store: () => store,
      now: () => NOW
    };
    const bad = sessionActivity(failing, { sessionIds: ['A'] });
    const good = sessionActivity(makeDeps([row({ id: 'A' })]), { sessionIds: ['A'] });
    await expect(bad).rejects.toThrow('the manifest is not open yet');
    expect((await good).sessions[0]?.coverage).toBe('complete');
  });

  it('a refused call does not wait its turn, because it reads nothing', async () => {
    let release: (() => void) | undefined;
    const slow = {
      manifest: () =>
        new Promise<ManifestStore>((resolve) => {
          release = () =>
            resolve({ getSession: () => undefined } as unknown as ManifestStore);
        }),
      store: () => store,
      now: () => NOW
    };
    const held = sessionActivity(slow, { sessionIds: ['A'] });
    await expect(sessionActivity(slow, null as never)).rejects.toBeDefined();
    release?.();
    expect((await held).sessions[0]?.reason).toBe('unknown-session');
  });
});
