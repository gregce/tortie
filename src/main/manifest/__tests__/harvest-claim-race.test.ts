/**
 * The two-watch claim race — the permanent cheap gate for the defect the
 * operator hit live on 2026-08-14 (Phase 32,
 * docs/research/40-antigravity-claim-race.md; research 22 §6 row 8 named the
 * race untested, and conformance cannot reproduce it because it drives one
 * session at a time).
 *
 * THE RACE. Session A is created with no turn, so its watch stays hungry.
 * Session B is created later and takes the first turn, and its conversation
 * directory brain/<id> appears. Both watches see it. Before Phase 32, A's
 * grace timer fired first and claimed the id, B was then permanently starved
 * because claimed ids were filtered from its candidates, and A sat armed to
 * resume B's conversation. The fix has two halves, both asserted here: an
 * exact confirm (the pane's own agy holds the directory open) beats a grace
 * guess and moves the claim, and a grace guess can never win a candidate
 * another session holds, not even provisionally.
 *
 * DETERMINISTIC BY CONSTRUCTION. @parcel/watcher is mocked so event delivery
 * is the test's choice. The agy ownership probe is mocked whole — that is why
 * it lives in its own module — so process truth is scripted per pane and per
 * moment. setTimeout and Date are faked, so the grace clock advances only
 * when the script says so. Real fs promises (readdir, stat) resolve on the
 * thread pool, not on timers, so the script flushes them with real
 * setImmediate turns between steps. There are no wall-clock sleeps anywhere.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentKind } from '@shared/types';
import type { ConversationReclaim } from '../harvest/watch';

/** Every FSEvents callback the watcher subscribed, in subscription order. */
const subscribers: {
  dir: string;
  cb: (err: Error | null, events: unknown[]) => void;
}[] = [];

vi.mock('@parcel/watcher', () => ({
  subscribe: (dir: string, cb: (err: Error | null, events: unknown[]) => void) => {
    subscribers.push({ dir, cb });
    return Promise.resolve({ unsubscribe: () => Promise.resolve() });
  }
}));

/**
 * The scripted ownership probe. `ok: false` is "lsof/ps could not answer";
 * with `ok: true` each pane pid owns exactly the ids the script gave it.
 */
const probe = vi.hoisted(() => ({
  ok: false,
  owned: new Map<number, Set<string>>()
}));

vi.mock('../harvest/agy-owner', () => ({
  agyOwnedConversations: (_brainRoot: string, panePid: number) =>
    Promise.resolve(
      probe.ok
        ? { ok: true, ownedIds: new Set(probe.owned.get(panePid) ?? []) }
        : { ok: false, ownedIds: new Set<string>() }
    ),
  resetAgyOwnershipCache: () => undefined
}));

const { deriveResumeConfidence, SESSION_CONTRACT_VERSION } = await import(
  '../agents'
);
const {
  claimConversationId,
  conversationClaimant,
  conversationClaimStrength,
  forgetConversationClaims,
  onConversationReclaimed,
  resetPendingWatches,
  watchForSessionId
} = await import('../harvest');
const { ManifestStore } = await import('../store');

let home = '';
let cwd = '';

const X = 'aaaaaaaa-1111-4111-8111-111111111111';

/** The watcher options every case uses; the fake clock makes them free. */
const OPTS = {
  graceMs: 5_000,
  pollIntervalMs: 1_000,
  timeoutMs: 60_000
} as const;

function brainDir(): string {
  return join(home, '.gemini', 'antigravity-cli', 'brain');
}

function startWatch(claimant: string, panePid: number, timeoutMs?: number) {
  return watchForSessionId(
    'antigravity',
    { cwd, sinceTs: Date.now() - 500, panePid },
    { home, claimant, ...OPTS, ...(timeoutMs !== undefined ? { timeoutMs } : {}) }
  );
}

/** Hand ONE subscriber one create event, the way FSEvents would. */
function fireEventAt(index: number, path: string): void {
  subscribers[index]?.cb(null, [{ type: 'create', path }]);
}

/**
 * Let thread-pool fs completions and the promise chains behind them run.
 * setImmediate is deliberately NOT faked, so each round is a real event-loop
 * turn; timers stay exactly where the script left them.
 */
async function flushIo(rounds = 24): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise((r) => {
      setImmediate(r);
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
  home = mkdtempSync(join(tmpdir(), 'gmux-claim-race-home-'));
  cwd = mkdtempSync(join(tmpdir(), 'gmux-claim-race-cwd-'));
  mkdirSync(brainDir(), { recursive: true });
  subscribers.length = 0;
  probe.ok = false;
  probe.owned.clear();
  forgetConversationClaims();
  resetPendingWatches();
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(home, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
  forgetConversationClaims();
  resetPendingWatches();
});

describe('exact beats grace — the operator race, corrected (T1)', () => {
  it('moves a grace claim to the session whose agy proves ownership', async () => {
    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      // Session A first (hungry, no turn), session B second (about to take
      // the first turn). Both watch the same brain directory.
      const a = startWatch('s-A', 111);
      const b = startWatch('s-B', 222);
      await flushIo();
      expect(subscribers.length).toBe(2);

      // B's first turn writes brain/X. A's fast channel reports it — the
      // hungry earlier watch sees the later session's record. The probe
      // cannot answer yet, so nothing can confirm.
      mkdirSync(join(brainDir(), X), { recursive: true });
      fireEventAt(0, join(brainDir(), X));
      await flushIo();

      // 5 s of silence: A's grace timer takes the guess, and records that
      // one other watch was still pending when it did.
      await vi.advanceTimersByTimeAsync(5_100);
      await flushIo();
      const ra = await a.promise;
      expect(ra.sessionId).toBe(X);
      expect(ra.viaGraceTimer).toBe(true);
      expect(ra.contestedByWatches).toBe(1);
      expect(conversationClaimant(X)).toBe('s-A');
      expect(conversationClaimStrength(X)).toBe('provisional');

      // Now the truth becomes visible: B's own agy holds brain/X open.
      probe.ok = true;
      probe.owned.set(222, new Set([X]));
      fireEventAt(1, join(brainDir(), X));
      await flushIo();

      const rb = await b.promise;
      expect(rb.sessionId).toBe(X);
      expect(rb.viaGraceTimer).toBe(false);
      expect(rb.key).toBe('fd-owner');
      expect(rb.reclaimedFrom).toBe('s-A');
      expect(reclaims).toEqual([
        {
          agent: 'antigravity',
          conversationId: X,
          from: 's-A',
          to: 's-B',
          at: expect.any(Number) as unknown as number
        }
      ]);
      expect(conversationClaimant(X)).toBe('s-B');
      expect(conversationClaimStrength(X)).toBe('confirmed');
    } finally {
      off();
    }
  });
});

describe('grace never steals (T2)', () => {
  it('a watch whose only candidate is provisionally claimed waits, then times out', async () => {
    // What core's boot pass writes for a grace-accepted row.
    expect(claimConversationId(X, 's-A', 'provisional')).toBe(true);
    mkdirSync(join(brainDir(), X), { recursive: true });

    const c = startWatch('s-C', 333, 20_000);
    const rejected = expect(c.promise).rejects.toThrow(/Timed out/);
    await flushIo();
    // Far past C's own graceMs: the timer must never take the candidate.
    await vi.advanceTimersByTimeAsync(15_000);
    await flushIo();
    expect(conversationClaimant(X)).toBe('s-A');
    // ...and past C's timeout: rejection is the honest end of the watch.
    await vi.advanceTimersByTimeAsync(6_000);
    await rejected;
    expect(conversationClaimant(X)).toBe('s-A');
    expect(conversationClaimStrength(X)).toBe('provisional');
  });
});

describe('confirmed claims are immovable (T3)', () => {
  it('a probe that lies cannot take a confirmed claim', async () => {
    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      probe.ok = true;
      probe.owned.set(111, new Set([X]));
      mkdirSync(join(brainDir(), X), { recursive: true });

      const a = startWatch('s-A', 111);
      await flushIo();
      const ra = await a.promise;
      expect(ra.viaGraceTimer).toBe(false);
      expect(conversationClaimStrength(X)).toBe('confirmed');

      // A lying probe: pid 222 also "owns" X. The confirmed claim filters X
      // out of B's candidate list before the verdict could even matter.
      probe.owned.set(222, new Set([X]));
      const b = startWatch('s-B', 222, 5_000);
      await flushIo();
      await vi.advanceTimersByTimeAsync(5_100);
      await expect(b.promise).rejects.toThrow(/Timed out/);
      expect(reclaims).toEqual([]);
      expect(conversationClaimant(X)).toBe('s-A');
      expect(conversationClaimStrength(X)).toBe('confirmed');
    } finally {
      off();
    }
  });
});

describe('a boot claim of a grace row is reclaimable (T4)', () => {
  it('an exact confirm displaces the persisted grace guess of a manifest row', async () => {
    // Exactly what resumeIdHarvests() claims at boot for a row whose
    // provenance says the grace timer accepted its id.
    expect(claimConversationId(X, 'row-a', 'provisional')).toBe(true);
    probe.ok = true;
    probe.owned.set(222, new Set([X]));
    mkdirSync(join(brainDir(), X), { recursive: true });

    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      const b = startWatch('s-B', 222);
      await flushIo();
      const rb = await b.promise;
      expect(rb.reclaimedFrom).toBe('row-a');
      expect(reclaims).toEqual([
        {
          agent: 'antigravity',
          conversationId: X,
          from: 'row-a',
          to: 's-B',
          at: expect.any(Number) as unknown as number
        }
      ]);
      expect(conversationClaimant(X)).toBe('s-B');
      expect(conversationClaimStrength(X)).toBe('confirmed');
    } finally {
      off();
    }
  });
});

describe('the confidence math (T5)', () => {
  it('fd-owner is an identity key: rivals do not weaken it', () => {
    expect(
      deriveResumeConfidence({
        key: 'fd-owner',
        keyConfidence: 'exact',
        viaGraceTimer: false,
        rivals: 2
      })
    ).toBe('exact');
  });

  it('a grace acceptance is grace-accepted whatever the key is worth', () => {
    expect(
      deriveResumeConfidence({
        key: 'fd-owner',
        keyConfidence: 'exact',
        viaGraceTimer: true,
        rivals: 1
      })
    ).toBe('grace-accepted');
  });
});

describe('the loser correction plumbing (T6)', () => {
  it('clearAgentSessionId clears the arm durably and records the correction', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-claim-race-db-'));
    const dbPath = join(dir, 'manifest.db');
    const store = new ManifestStore(dbPath);
    try {
      const now = Date.now();
      store.insertSession({
        id: 'loser',
        name: 'loser',
        tmuxName: 'loser',
        projectPath: '/p',
        cwd: '/p',
        // The widened runtime path every registry agent after claude and
        // codex takes; see the standing AgentKind note in src/shared/types.ts.
        agent: 'antigravity' as AgentKind,
        status: 'running',
        createdAt: now,
        lastSeen: now,
        argv: ['/usr/local/bin/agy']
      });
      store.setAgentSessionId('loser', X, ['/usr/local/bin/agy', '--conversation', X]);
      expect(store.getSession('loser')?.agentSessionId).toBe(X);

      const rec = store.clearAgentSessionId('loser', 'capturing', {
        v: SESSION_CONTRACT_VERSION,
        source: 'store-harvest',
        confidence: 'none',
        at: now,
        cwd: '/p',
        key: 'fd-owner',
        keyConfidence: 'exact',
        viaGraceTimer: true,
        rivals: 1,
        contestedByWatches: 1,
        reclaimedBy: 'winner',
        reclaimedAt: now
      });
      expect(rec.agentSessionId).toBeUndefined();
      expect(rec.resumeArgv).toBeUndefined();
      expect(rec.resumeCapture).toBe('capturing');
      store.close();

      // The write must survive a reopen of the database file: losing it
      // leaves a row armed to resume somebody else's conversation.
      const reopened = new ManifestStore(dbPath);
      const back = reopened.getSession('loser');
      expect(back?.agentSessionId).toBeUndefined();
      expect(back?.resumeArgv).toBeUndefined();
      expect(back?.resumeCapture).toBe('capturing');
      expect(back?.resumeProvenance?.confidence).toBe('none');
      expect(back?.resumeProvenance?.reclaimedBy).toBe('winner');
      expect(back?.resumeProvenance?.reclaimedAt).toBe(now);
      expect(back?.resumeProvenance?.viaGraceTimer).toBe(true);
      reopened.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('clearAgentSessionId refuses a row that does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-claim-race-db2-'));
    const store = new ManifestStore(join(dir, 'manifest.db'));
    try {
      expect(() =>
        store.clearAgentSessionId('ghost', 'unavailable', {
          v: SESSION_CONTRACT_VERSION,
          source: 'store-harvest',
          confidence: 'none',
          at: Date.now(),
          cwd: '/p'
        })
      ).toThrow(/No manifest row/);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
