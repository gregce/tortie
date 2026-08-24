/**
 * The Catch Me Up service (Phase 137, spec section 7.2).
 *
 * The reader and the git mark are faked at their seams and the store is an in
 * memory fake that stamps every stored text, so these tests prove the walk:
 * which rows are read, how the watermark is reused and refused, that one
 * unreadable file never rejects the channel, that the payload is built from
 * STORE rows and never from reader output, the turn limits, the order, the
 * clip, and the provider map record.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord, ManifestStore } from '../../manifest';
import type { ReadResult, ReadTurn, Watermark } from '../reader';
import type {
  NewFoldVersion,
  OverviewStore,
  StoredSession,
  StoredSummary,
  StoredTurn
} from '../store';

const seams = vi.hoisted(() => ({
  readSessionLog: vi.fn(),
  resolveSessionLog: vi.fn(),
  providerVersion: vi.fn(() => 1),
  keepMapHash: vi.fn(() => 'map-hash'),
  providerMap: vi.fn((provider: string) =>
    provider === 'droid'
      ? { honest: 'droid keeps no record on this Mac.' }
      : null
  ),
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

const { projectOverview, sessionsOverview } = await import('../service');

const PROJECT = '/repo/demo';
const NOW = 1_756_000_000_000;
const LOG_FILE = '/scratch-home/.claude/projects/-repo-demo/aaaa.jsonl';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

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
  lastSeen: 1_755_000_000_000
};

function row(over: Record<string, unknown>): ManifestSessionRecord {
  return { ...BASE_ROW, ...over } as unknown as ManifestSessionRecord;
}

function turn(index: number, over: Partial<ReadTurn> = {}): ReadTurn {
  return {
    index,
    ask: { text: `ask ${index}`, at: '2026-08-20T10:00:00.000Z', queued: 1 },
    answer: { text: `answer ${index}`, at: '2026-08-20T10:05:00.000Z' },
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

function byteWatermark(turnIndex: number): Watermark {
  return {
    kind: 'byte-offset',
    file: LOG_FILE,
    size: '100',
    mtimeNs: '1',
    headHash: 'head',
    tailHash: 'tail',
    offset: 90,
    open: false,
    turnIndex
  };
}

function resolved(file = LOG_FILE, provider = 'claude'): unknown {
  return { state: 'resolved', provider, file, sessionId: null };
}

/**
 * An in memory store. Every stored text is stamped `STORED:` so a payload
 * built from reader output instead of store rows fails the assertion.
 */
class FakeStore {
  readonly path = ':memory:';
  readonly sessions = new Map<string, StoredSession>();
  readonly turnRows = new Map<string, StoredTurn[]>();
  readonly verdicts: Array<{ sessionId: string; index: number; verdict: string }> = [];
  readonly providerMaps: Array<{ provider: string; version: number; hash: string }> = [];
  readonly replaceCalls: Array<{
    sessionId: string;
    fromIndex: number;
    watermark: Watermark | null;
    mapVersion: number;
  }> = [];
  readonly listLimits: Array<number | undefined> = [];

  getSession(sessionId: string): StoredSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  upsertSession(rowIn: StoredSession): void {
    this.sessions.set(rowIn.sessionId, { ...rowIn });
  }

  replaceTurnsFrom(
    sessionId: string,
    fromIndex: number,
    turns: ReadTurn[],
    watermark: Watermark | null,
    mapVersion: number,
    readAt: number
  ): void {
    this.replaceCalls.push({ sessionId, fromIndex, watermark, mapVersion });
    const kept = (this.turnRows.get(sessionId) ?? []).filter(
      (t) => t.index < fromIndex
    );
    for (const t of turns) {
      kept.push({
        sessionId,
        index: t.index,
        askText: `STORED:${t.ask.text}`,
        askAt: t.ask.at,
        answerText: t.answer === null ? null : `STORED:${t.answer.text}`,
        answerAt: t.answer === null ? null : t.answer.at,
        queued: t.ask.queued,
        closed: t.closed,
        interrupted: t.interrupted,
        notice: t.notice,
        stopReason: t.stopReason,
        durationMs: t.durationMs,
        paths: t.paths,
        pathSource: t.pathSource,
        gitVerdict: null,
        gitCheckedAt: null
      });
    }
    this.turnRows.set(sessionId, kept);
    const session = this.sessions.get(sessionId);
    if (session !== undefined) {
      session.watermark = watermark;
      session.mapVersionAtLastRead = mapVersion;
      session.lastReadAt = readAt;
    }
  }

  listTurns(sessionId: string, limit?: number): StoredTurn[] {
    this.listLimits.push(limit);
    const all = [...(this.turnRows.get(sessionId) ?? [])].sort(
      (a, b) => a.index - b.index
    );
    return limit === undefined ? all : all.slice(-limit);
  }

  countTurns(sessionId: string): number {
    return (this.turnRows.get(sessionId) ?? []).length;
  }

  setGitVerdict(sessionId: string, index: number, verdict: string): void {
    this.verdicts.push({ sessionId, index, verdict });
  }

  recordProviderMap(provider: string, version: number, hash: string): void {
    this.providerMaps.push({ provider, version, hash });
  }

  providerMapVersion(): number | null {
    return null;
  }

  // Phase 138. The fold's chain. The fake holds one row per session, which is
  // all the service ever reads.
  readonly summaries = new Map<string, StoredSummary>();

  appendSummary(rowIn: NewFoldVersion): StoredSummary {
    const written: StoredSummary = {
      ...rowIn,
      version: 1,
      parentVersion: null
    };
    this.summaries.set(rowIn.sessionId, written);
    return written;
  }

  latestSummary(sessionId: string): StoredSummary | null {
    return this.summaries.get(sessionId) ?? null;
  }

  latestKeptSummary(sessionId: string): StoredSummary | null {
    const found = this.summaries.get(sessionId);
    return found !== undefined && found.verdict === 'kept' ? found : null;
  }

  close(): void {}
}

function makeDeps(
  rows: ManifestSessionRecord[],
  store: FakeStore,
  foldChosen = false
) {
  return {
    manifest: () =>
      Promise.resolve({
        listSessions: () => rows
      } as unknown as ManifestStore),
    store: () => store as unknown as OverviewStore,
    // Phase 138. False by default, which is what the product ships with, so
    // every test above this one reads the page as a person with no agent
    // chosen reads it.
    foldChosen: () => foldChosen,
    now: () => NOW
  };
}

beforeEach(() => {
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
  seams.resolveSessionLog.mockReturnValue(resolved());
});

// ---------------------------------------------------------------------------

describe('projectOverview', () => {
  it('reads only what has a log: shells, remote rows and discarded rows are not read', async () => {
    const store = new FakeStore();
    const rows = [
      row({ id: 'A', agent: 'claude' }),
      row({ id: 'B', agent: 'shell', agentSessionId: undefined }),
      row({ id: 'C', machine: { machineId: 'm1' } }),
      row({ id: 'D', status: 'discarded' }),
      row({ id: 'E', projectPath: '/elsewhere' })
    ];
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    const payload = await projectOverview(makeDeps(rows, store), {
      projectPath: PROJECT
    });
    expect(seams.readSessionLog).toHaveBeenCalledTimes(1);
    expect(payload.reads).toEqual({ A: 'full', B: 'skipped', C: 'skipped' });
    const lines = new Map(payload.sessions.map((s) => [s.sessionId, s.line]));
    expect(lines.get('A')).toBe('turns');
    expect(lines.get('B')).toBe('shell');
    expect(lines.get('C')).toBe('remote');
    expect(store.sessions.get('B')?.readState).toBe('shell');
    expect(store.sessions.get('C')?.readState).toBe('remote');
  });

  it('builds the payload from store rows, never from reader output', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({
        turns: [turn(0)],
        watermark: byteWatermark(1),
        meta: { model: 'opus', branch: 'main' },
        lastTouchedAt: '2026-08-20T10:05:00.000Z'
      })
    );
    const payload = await projectOverview(
      makeDeps([row({ id: 'A' })], store),
      { projectPath: PROJECT }
    );
    const session = payload.sessions[0];
    expect(session?.turns[0]?.askText).toBe('STORED:ask 0');
    expect(session?.turns[0]?.answerText).toBe('STORED:answer 0');
    expect(session?.model).toBe('opus');
    expect(session?.branch).toBe('main');
    expect(session?.lastTouchedAt).toBe(Date.parse('2026-08-20T10:05:00.000Z'));
    expect(store.sessions.get('A')?.readState).toBe('ok');
    expect(store.sessions.get('A')?.logPath).toBe(LOG_FILE);
  });

  it('reuses the stored watermark only for the same map version and the same file', async () => {
    const store = new FakeStore();
    const mark = byteWatermark(3);
    const stored: StoredSession = {
      sessionId: 'A',
      agent: 'claude',
      provider: 'claude',
      agentSessionId: 'aaaa',
      logPath: LOG_FILE,
      watermark: mark,
      mapVersionAtLastRead: 1,
      lastReadAt: NOW - 1_000,
      readState: 'ok',
      readDetail: null,
      lastTouchedAt: null,
      model: null,
      branch: null,
      honest: null
    };
    store.upsertSession(stored);
    seams.readSessionLog.mockReturnValue(readResult({ work: 'none' }));

    await projectOverview(makeDeps([row({ id: 'A' })], store), {
      projectPath: PROJECT
    });
    expect(seams.readSessionLog.mock.calls[0]?.[0]?.watermark).toEqual(mark);

    seams.readSessionLog.mockClear();
    store.upsertSession({ ...stored, mapVersionAtLastRead: 2 });
    await projectOverview(makeDeps([row({ id: 'A' })], store), {
      projectPath: PROJECT
    });
    expect(seams.readSessionLog.mock.calls[0]?.[0]?.watermark).toBeNull();

    seams.readSessionLog.mockClear();
    store.upsertSession({ ...stored, logPath: '/moved.jsonl' });
    await projectOverview(makeDeps([row({ id: 'A' })], store), {
      projectPath: PROJECT
    });
    expect(seams.readSessionLog.mock.calls[0]?.[0]?.watermark).toBeNull();
  });

  it('keeps stored turns and skips the rewrite when nothing changed', async () => {
    const store = new FakeStore();
    store.upsertSession({
      sessionId: 'A',
      agent: 'claude',
      provider: 'claude',
      agentSessionId: 'aaaa',
      logPath: LOG_FILE,
      watermark: byteWatermark(1),
      mapVersionAtLastRead: 1,
      lastReadAt: NOW - 1_000,
      readState: 'ok',
      readDetail: null,
      lastTouchedAt: '2026-08-20T10:05:00.000Z',
      model: 'opus',
      branch: null,
      honest: null
    });
    store.replaceTurnsFrom('A', 0, [turn(0)], byteWatermark(1), 1, NOW - 1_000);
    store.replaceCalls.length = 0;
    seams.readSessionLog.mockReturnValue(readResult({ work: 'none' }));
    const payload = await projectOverview(
      makeDeps([row({ id: 'A' })], store),
      { projectPath: PROJECT }
    );
    expect(store.replaceCalls).toEqual([]);
    expect(payload.reads['A']).toBe('none');
    expect(payload.sessions[0]?.line).toBe('turns');
    expect(payload.sessions[0]?.model).toBe('opus');
  });

  it('turns one unreadable file into one line and still answers', async () => {
    const store = new FakeStore();
    seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) =>
      input.agentSessionId === 'bad'
        ? resolved('/bad.jsonl')
        : resolved()
    );
    seams.readSessionLog.mockImplementation((input: { file: string }) => {
      if (input.file === '/bad.jsonl') throw new Error('permission denied');
      return readResult({ turns: [turn(0)], watermark: byteWatermark(1) });
    });
    const payload = await projectOverview(
      makeDeps(
        [row({ id: 'A' }), row({ id: 'B', agentSessionId: 'bad' })],
        store
      ),
      { projectPath: PROJECT }
    );
    const bad = payload.sessions.find((s) => s.sessionId === 'B');
    expect(bad?.line).toBe('unreadable');
    expect(bad?.lineDetail).toBe('permission denied');
    expect(store.sessions.get('B')?.readState).toBe('unreadable');
    expect(payload.sessions.find((s) => s.sessionId === 'A')?.line).toBe('turns');
    expect(payload.reads).toEqual({ A: 'full', B: 'skipped' });
  });

  it('records the provider map once per provider per call', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    await projectOverview(
      makeDeps([row({ id: 'A' }), row({ id: 'B' })], store),
      { projectPath: PROJECT }
    );
    expect(store.providerMaps).toEqual([
      { provider: 'claude', version: 1, hash: 'map-hash' }
    ]);
  });

  it('shows one turn per session and asks git once with the oldest ask', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({
        turns: [
          turn(0, { ask: { text: 'first', at: '2026-08-19T08:00:00.000Z', queued: 1 } }),
          turn(1)
        ],
        watermark: byteWatermark(2)
      })
    );
    const payload = await projectOverview(
      makeDeps([row({ id: 'A' })], store),
      { projectPath: PROJECT }
    );
    expect(store.listLimits).toEqual([1]);
    expect(payload.sessions[0]?.turns).toHaveLength(1);
    expect(payload.sessions[0]?.turns[0]?.index).toBe(1);
    expect(seams.readGitEvidence).toHaveBeenCalledTimes(1);
    // One turn is shown, so the git floor is that turn's own ask.
    expect(seams.readGitEvidence).toHaveBeenCalledWith(
      PROJECT,
      Date.parse('2026-08-20T10:00:00.000Z')
    );
    expect(payload.isGitRepo).toBe(true);
  });

  it('writes the git verdict back for every turn shown', async () => {
    const store = new FakeStore();
    seams.markTurn.mockReturnValue({ git: 'no-record', namedOnlyOutside: true });
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    const payload = await projectOverview(
      makeDeps([row({ id: 'A' })], store),
      { projectPath: PROJECT }
    );
    expect(store.verdicts).toEqual([
      { sessionId: 'A', index: 0, verdict: 'no-record' }
    ]);
    expect(payload.sessions[0]?.turns[0]?.git).toBe('no-record');
    expect(payload.sessions[0]?.turns[0]?.namedOnlyOutside).toBe(true);
  });

  it('orders talked sessions first, quiet rows next and shells last', async () => {
    const store = new FakeStore();
    seams.resolveSessionLog.mockImplementation((input: { agentSessionId: string | null }) =>
      input.agentSessionId === null
        ? { state: 'no-file', provider: 'claude' }
        : resolved()
    );
    seams.readSessionLog.mockReturnValue(
      readResult({
        turns: [turn(0)],
        watermark: byteWatermark(1),
        lastTouchedAt: '2026-08-20T10:05:00.000Z'
      })
    );
    const payload = await projectOverview(
      makeDeps(
        [
          row({ id: 'SHELL', agent: 'shell', createdAt: 9 }),
          row({ id: 'QUIET', agentSessionId: null, createdAt: 5 }),
          row({ id: 'TALKED', createdAt: 1 })
        ],
        store
      ),
      { projectPath: PROJECT }
    );
    expect(payload.sessions.map((s) => s.sessionId)).toEqual([
      'TALKED',
      'QUIET',
      'SHELL'
    ]);
  });

  it('clips the payload text at 4,000 characters and says so', async () => {
    const store = new FakeStore();
    const long = 'a'.repeat(5_000);
    seams.readSessionLog.mockReturnValue(
      readResult({
        turns: [turn(0, { ask: { text: long, at: null, queued: 1 } })],
        watermark: byteWatermark(1)
      })
    );
    const payload = await projectOverview(
      makeDeps([row({ id: 'A' })], store),
      { projectPath: PROJECT }
    );
    const shown = payload.sessions[0]?.turns[0];
    expect(shown?.askText).toHaveLength(4_000);
    expect(shown?.askClipped).toBe(true);
    expect(shown?.answerClipped).toBe(false);
    // The store keeps the full text. Only the payload clips.
    expect(store.turnRows.get('A')?.[0]?.askText).toHaveLength(
      'STORED:'.length + 5_000
    );
  });

  it('draws the honest line for a provider that keeps no store', async () => {
    const store = new FakeStore();
    seams.resolveSessionLog.mockReturnValue({ state: 'no-store', provider: 'droid' });
    const payload = await projectOverview(
      makeDeps([row({ id: 'A', agent: 'droid' })], store),
      { projectPath: PROJECT }
    );
    expect(payload.sessions[0]?.line).toBe('no-store');
    expect(payload.sessions[0]?.lineDetail).toBe(
      'droid keeps no record on this Mac.'
    );
    expect(seams.readSessionLog).not.toHaveBeenCalled();
  });

  it('passes the wrong conversation detail through verbatim', async () => {
    const store = new FakeStore();
    seams.resolveSessionLog.mockReturnValue({
      state: 'wrong-conversation',
      provider: 'antigravity',
      file: '/brain/x.jsonl',
      detail: 'The record names /somewhere/else.'
    });
    const payload = await projectOverview(
      makeDeps([row({ id: 'A', agent: 'antigravity' })], store),
      { projectPath: PROJECT }
    );
    expect(payload.sessions[0]?.line).toBe('wrong-conversation');
    expect(payload.sessions[0]?.lineDetail).toBe('The record names /somewhere/else.');
  });

  it('names gemini ask only and deepseek clockless', async () => {
    const store = new FakeStore();
    seams.resolveSessionLog.mockImplementation((input: { agent: string }) =>
      resolved(`/log-${input.agent}`, input.agent)
    );
    seams.readSessionLog.mockReturnValue(readResult({ turns: [], work: 'full' }));
    const payload = await projectOverview(
      makeDeps(
        [row({ id: 'G', agent: 'gemini' }), row({ id: 'D', agent: 'deepseek' })],
        store
      ),
      { projectPath: PROJECT }
    );
    const gemini = payload.sessions.find((s) => s.sessionId === 'G');
    const deepseek = payload.sessions.find((s) => s.sessionId === 'D');
    expect(gemini?.askOnly).toBe(true);
    expect(gemini?.noTurnClock).toBe(false);
    expect(deepseek?.askOnly).toBe(false);
    expect(deepseek?.noTurnClock).toBe(true);
  });
});

describe('sessionsOverview', () => {
  it('filters to the named sessions and defaults to 50 turns', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    const payload = await sessionsOverview(
      makeDeps([row({ id: 'A' }), row({ id: 'B' })], store),
      { projectPath: PROJECT, sessionIds: ['A'] }
    );
    expect(payload.sessions.map((s) => s.sessionId)).toEqual(['A']);
    expect(store.listLimits).toEqual([50]);
  });

  it('caps the turn limit at 200', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    await sessionsOverview(makeDeps([row({ id: 'A' })], store), {
      projectPath: PROJECT,
      sessionIds: ['A'],
      turnLimit: 5_000
    });
    expect(store.listLimits).toEqual([200]);
  });
});

// ---------------------------------------------------------------------------
// The fold's one line (Phase 138)
// ---------------------------------------------------------------------------

describe('the written line reaches ONE payload and no other', () => {
  const SENTENCE = 'You asked the agent to settle the rail and it did.';

  function withSummary(
    verdict: 'kept' | 'refused' | 'failed',
    options: { toTurn?: number; turns?: number; chosen?: boolean } = {}
  ): {
    store: FakeStore;
    deps: ReturnType<typeof makeDeps>;
  } {
    const store = new FakeStore();
    const rows = [row({ id: 'A' })];
    const count = options.turns ?? 1;
    const turns = Array.from({ length: count }, (_, i) => turn(i));
    seams.readSessionLog.mockReturnValue(
      readResult({ turns, watermark: byteWatermark(count) })
    );
    const toTurn = options.toTurn ?? count - 1;
    store.appendSummary({
      sessionId: 'A',
      fromTurn: toTurn,
      toTurn,
      text: verdict === 'kept' ? SENTENCE : null,
      verdict,
      reason: verdict === 'kept' ? null : 'digit',
      harness: 'claude',
      model: 'claude-haiku-4-5-20251001',
      providerMapVersion: 1,
      inputHash: 'a'.repeat(64),
      writtenAt: NOW
    });
    return { store, deps: makeDeps(rows, store, options.chosen ?? true) };
  }

  it('fills the sentence on the project payload', async () => {
    const { deps } = withSummary('kept');
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBe(SENTENCE);
  });

  it('fills NOTHING on the sessions payload, whatever the store holds', async () => {
    const { deps } = withSummary('kept');
    const out = await sessionsOverview(deps, {
      projectPath: PROJECT,
      sessionIds: ['A']
    });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('draws nothing when the newest row was refused', async () => {
    const { deps } = withSummary('refused');
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('draws nothing when the newest row failed', async () => {
    const { deps } = withSummary('failed');
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('draws nothing at all when no model has written one', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    const out = await projectOverview(makeDeps([row({ id: 'A' })], store), {
      projectPath: PROJECT
    });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('changes nothing else on the payload when a sentence is present', async () => {
    const off = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    const before = await projectOverview(makeDeps([row({ id: 'A' })], off), {
      projectPath: PROJECT
    });
    const { deps } = withSummary('kept');
    const after = await projectOverview(deps, { projectPath: PROJECT });
    // Phase 138.1 added `summaryWrittenAt`, which is filled by the same call
    // as `summary`, so both are blanked here and both are checked below.
    expect({
      ...after.sessions[0],
      summary: null,
      summaryWrittenAt: null
    }).toEqual({
      ...before.sessions[0],
      summary: null,
      summaryWrittenAt: null
    });
  });

  // Phase 138.1. The operator turned folding on and could not tell whether
  // anything had happened. The project view answers that with the moment the
  // sentence was written, and the two fields come from one call so they can
  // never disagree.
  it('carries the moment the sentence was written', async () => {
    const { deps } = withSummary('kept');
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summaryWrittenAt).toBe(NOW);
  });

  it('carries no moment when no model wrote the line', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    const out = await projectOverview(makeDeps([row({ id: 'A' })], store), {
      projectPath: PROJECT
    });
    expect(out.sessions[0]?.summary).toBeNull();
    expect(out.sessions[0]?.summaryWrittenAt).toBeNull();
  });

  it('carries no moment when the newest row was refused', async () => {
    const { deps } = withSummary('refused');
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summaryWrittenAt).toBeNull();
  });

  it('carries no moment on the sessions payload', async () => {
    const { deps } = withSummary('kept');
    const out = await sessionsOverview(deps, {
      projectPath: PROJECT,
      sessionIds: ['A']
    });
    expect(out.sessions[0]?.summaryWrittenAt).toBeNull();
  });

  // -------------------------------------------------------------------------
  // The freshness rule. A sentence is drawn only beside the turn it was
  // written for.
  // -------------------------------------------------------------------------

  it('draws a sentence written for the newest turn', async () => {
    const { deps } = withSummary('kept', { turns: 6, toTurn: 5 });
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBe(SENTENCE);
  });

  it('drops a sentence written for an older turn', async () => {
    const { deps } = withSummary('kept', { turns: 6, toTurn: 0 });
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('falls back to the built line when the sentence is behind', async () => {
    // The built line needs the ask, and the ask is only on the payload when
    // the written sentence is not drawn. This is the fallback being current.
    const { deps } = withSummary('kept', { turns: 6, toTurn: 0 });
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.turns.at(-1)?.index).toBe(5);
    expect(out.sessions[0]?.summary).toBeNull();
  });

  // -------------------------------------------------------------------------
  // The choice rule. None brings Phase 137's built line straight back.
  // -------------------------------------------------------------------------

  it('draws nothing when the person has picked None', async () => {
    const { deps } = withSummary('kept', { chosen: false });
    const out = await projectOverview(deps, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('draws nothing when the caller passes no choice at all', async () => {
    const store = new FakeStore();
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    store.appendSummary({
      sessionId: 'A',
      fromTurn: 0,
      toTurn: 0,
      text: SENTENCE,
      verdict: 'kept',
      reason: null,
      harness: 'claude',
      model: 'claude-haiku-4-5-20251001',
      providerMapVersion: 1,
      inputHash: 'a'.repeat(64),
      writtenAt: NOW
    });
    const bare = {
      manifest: () =>
        Promise.resolve({
          listSessions: () => [row({ id: 'A' })]
        } as unknown as ManifestStore),
      store: () => store as unknown as OverviewStore,
      now: () => NOW
    };
    const out = await projectOverview(bare, { projectPath: PROJECT });
    expect(out.sessions[0]?.summary).toBeNull();
  });

  it('brings the sentence back when the person picks the agent again', async () => {
    const store = new FakeStore();
    const rows = [row({ id: 'A' })];
    seams.readSessionLog.mockReturnValue(
      readResult({ turns: [turn(0)], watermark: byteWatermark(1) })
    );
    store.appendSummary({
      sessionId: 'A',
      fromTurn: 0,
      toTurn: 0,
      text: SENTENCE,
      verdict: 'kept',
      reason: null,
      harness: 'claude',
      model: 'claude-haiku-4-5-20251001',
      providerMapVersion: 1,
      inputHash: 'a'.repeat(64),
      writtenAt: NOW
    });
    let chosen = true;
    const deps = {
      manifest: () =>
        Promise.resolve({
          listSessions: () => rows
        } as unknown as ManifestStore),
      store: () => store as unknown as OverviewStore,
      foldChosen: () => chosen,
      now: () => NOW
    };
    expect((await projectOverview(deps, { projectPath: PROJECT })).sessions[0]?.summary).toBe(
      SENTENCE
    );
    chosen = false;
    expect(
      (await projectOverview(deps, { projectPath: PROJECT })).sessions[0]?.summary
    ).toBeNull();
    chosen = true;
    expect((await projectOverview(deps, { projectPath: PROJECT })).sessions[0]?.summary).toBe(
      SENTENCE
    );
  });
});
