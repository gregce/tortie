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
 * PHASE 34 ADDED THE SECOND HALF OF THE SAME DEFECT (T7 to T10). Phase 32
 * decided claim strength from the grace timer alone, so every non grace
 * acceptance was claimed 'confirmed' and nothing could ever correct it. A cwd
 * match is not proof of ownership: two CodeWhale panes in one folder both
 * confirm the same record, and the first one to see it used to take an
 * immovable claim on a record that may be the other pane's. Strength now
 * follows the KEY. An identity key ('tmux-pane', 'pid', 'fd-owner') claims
 * 'confirmed', a folder key claims 'matched', and a grace timer claims
 * 'provisional'. The cases below are the four this changed.
 *
 * DETERMINISTIC BY CONSTRUCTION. @parcel/watcher is mocked so event delivery
 * is the test's choice. The agy ownership probe is mocked whole — that is why
 * it lives in its own module — so process truth is scripted per pane and per
 * moment. setTimeout and Date are faked, so the grace clock advances only
 * when the script says so. Real fs promises (readdir, stat) resolve on the
 * thread pool, not on timers, so the script flushes them with real
 * setImmediate turns between steps. There are no wall-clock sleeps anywhere.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

const { deriveResumeConfidence, harvestProvenance, SESSION_CONTRACT_VERSION } =
  await import('../agents');
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
/** A SECOND launch folder, for the cases that turn on whose folder it is. */
let otherCwd = '';
/** Holds the symlink T12 makes. Its own directory, so removing it is safe. */
let linkHome = '';

/**
 * A second SPELLING of `cwd`, being a symlink that points at it.
 *
 * Made on demand rather than in `beforeEach`, because only the two T12 cases
 * need it and every case in this file pays for what the setup does.
 */
function cwdSpelledThroughALink(): string {
  linkHome = mkdtempSync(join(tmpdir(), 'gmux-claim-race-link-'));
  const link = join(linkHome, 'proj');
  symlinkSync(cwd, link);
  return link;
}

const X = 'aaaaaaaa-1111-4111-8111-111111111111';
const Y = 'bbbbbbbb-2222-4222-8222-222222222222';

/** The watcher options every case uses; the fake clock makes them free. */
const OPTS = {
  graceMs: 5_000,
  pollIntervalMs: 1_000,
  timeoutMs: 60_000
} as const;

function brainDir(): string {
  return join(home, '.gemini', 'antigravity-cli', 'brain');
}

/** CodeWhale's store. The legacy `.deepseek` root is left absent on purpose. */
function whaleDir(): string {
  return join(home, '.codewhale', 'sessions');
}

/** codex's date shard. The year is in the future, so the walk always enters. */
function codexDir(): string {
  return join(home, '.codex', 'sessions', '2099', '01', '01');
}

function startWatch(claimant: string, panePid: number, timeoutMs?: number) {
  return watchForSessionId(
    'antigravity',
    { cwd, sinceTs: Date.now() - 500, panePid },
    { home, claimant, ...OPTS, ...(timeoutMs !== undefined ? { timeoutMs } : {}) }
  );
}

/**
 * `sinceTs` is settable because the fake clock can be advanced past the real
 * one, and a record's mtime comes from the REAL clock. A watch started after
 * an advance would judge every file on disk as older than its own spawn and
 * consider nothing at all, which is a test passing for the wrong reason.
 */
function startWhaleWatch(
  claimant: string,
  folder: string,
  extra: { timeoutMs?: number; sinceTs?: number } = {}
) {
  return watchForSessionId(
    'deepseek',
    { cwd: folder, sinceTs: extra.sinceTs ?? Date.now() - 500 },
    {
      home,
      claimant,
      ...OPTS,
      ...(extra.timeoutMs !== undefined ? { timeoutMs: extra.timeoutMs } : {})
    }
  );
}

function startCodexWatch(claimant: string, folder: string, timeoutMs?: number) {
  return watchForSessionId(
    'codex',
    { cwd: folder, sinceTs: Date.now() - 500 },
    { home, claimant, ...OPTS, ...(timeoutMs !== undefined ? { timeoutMs } : {}) }
  );
}

/**
 * One CodeWhale session record. `workspace: null` writes a truncated file,
 * which is the real window this store has: the file is there and its
 * `metadata.workspace` cannot be read yet, so `confirm()` says 'unknown' and
 * only the grace timer can take it.
 */
function writeWhaleRecord(id: string, workspace: string | null): string {
  const path = join(whaleDir(), `${id}.json`);
  writeFileSync(
    path,
    workspace === null ? '{"metadata": ' : JSON.stringify({ metadata: { workspace } })
  );
  return path;
}

/** One codex rollout whose line 1 carries `folder`, so `confirm()` matches. */
function writeRollout(id: string, stamp: string, folder: string): string {
  const path = join(codexDir(), `rollout-${stamp}-${id}.jsonl`);
  writeFileSync(path, `${JSON.stringify({ payload: { cwd: folder } })}\n`);
  return path;
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
  otherCwd = mkdtempSync(join(tmpdir(), 'gmux-claim-race-cwd2-'));
  linkHome = '';
  mkdirSync(brainDir(), { recursive: true });
  mkdirSync(whaleDir(), { recursive: true });
  mkdirSync(codexDir(), { recursive: true });
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
  rmSync(otherCwd, { recursive: true, force: true });
  // Removes the symlink, never the folder it points at: fs.rm does not
  // follow a link.
  if (linkHome !== '') rmSync(linkHome, { recursive: true, force: true });
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

describe('a folder match is not an identity (T7)', () => {
  it('two codewhale panes in one folder: matched, not confirmed, each on its own record', async () => {
    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      // Two panes of the same agent in ONE folder. Neither has taken a turn,
      // so neither store record exists yet.
      const a = startWhaleWatch('s-A', cwd);
      const b = startWhaleWatch('s-B', cwd);
      await flushIo();
      expect(subscribers.length).toBe(2);

      // The first record appears. It carries the folder the two panes share,
      // so BOTH watches would confirm it, and A sees it first.
      writeWhaleRecord(X, cwd);
      fireEventAt(0, join(whaleDir(), `${X}.json`));
      await flushIo();

      const ra = await a.promise;
      expect(ra.sessionId).toBe(X);
      expect(ra.key).toBe('cwd-newest');
      expect(ra.viaGraceTimer).toBe(false);
      // One other watch of this agent was looking in the same folder when A
      // accepted, which is the fact that makes the answer a timing guess.
      expect(ra.sameCwdWatches).toBe(1);
      expect(conversationClaimant(X)).toBe('s-A');
      // THE CHANGE. A folder is not an identity, so the claim is takeable by
      // an identity proof rather than frozen for the whole six hour window.
      expect(conversationClaimStrength(X)).toBe('matched');

      // The second record appears. B is not starved: X is held at a rank B
      // cannot beat, so B waited, and its own record is the one it takes.
      writeWhaleRecord(Y, cwd);
      fireEventAt(1, join(whaleDir(), `${Y}.json`));
      await flushIo();

      const rb = await b.promise;
      expect(rb.sessionId).toBe(Y);
      expect(conversationClaimant(Y)).toBe('s-B');
      expect(conversationClaimStrength(Y)).toBe('matched');
      // Nothing was taken from anybody: both ended on their own record.
      expect(reclaims).toEqual([]);
    } finally {
      off();
    }
  });
});

describe('a match in the folder the record names takes back a grace guess (T8)', () => {
  it('the session the record names wins it from a session in another folder', async () => {
    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      const a = startWhaleWatch('s-A', cwd); // folder P
      const b = startWhaleWatch('s-B', otherCwd); // folder Q
      await flushIo();

      // B's first turn writes the record, and it is half written: the
      // workspace field cannot be read, so nothing can confirm it yet.
      writeWhaleRecord(X, null);
      fireEventAt(0, join(whaleDir(), `${X}.json`));
      await flushIo();
      await vi.advanceTimersByTimeAsync(5_100);
      await flushIo();

      const ra = await a.promise;
      expect(ra.sessionId).toBe(X);
      expect(ra.viaGraceTimer).toBe(true);
      expect(conversationClaimant(X)).toBe('s-A');
      expect(conversationClaimStrength(X)).toBe('provisional');

      // The file completes, and it names B's folder. That is evidence about
      // A too: A's folder is not the one in the record, so A cannot own it.
      writeWhaleRecord(X, otherCwd);
      fireEventAt(1, join(whaleDir(), `${X}.json`));
      await flushIo();

      const rb = await b.promise;
      expect(rb.sessionId).toBe(X);
      expect(rb.viaGraceTimer).toBe(false);
      expect(rb.reclaimedFrom).toBe('s-A');
      expect(reclaims).toEqual([
        {
          agent: 'deepseek',
          conversationId: X,
          from: 's-A',
          to: 's-B',
          at: expect.any(Number) as unknown as number
        }
      ]);
      expect(conversationClaimant(X)).toBe('s-B');
      // Still not an identity key, so the winner's own claim is takeable too.
      expect(conversationClaimStrength(X)).toBe('matched');
    } finally {
      off();
    }
  });
});

describe('a match in the SAME folder never takes a grace guess (T9)', () => {
  it('a neighbour in the same folder proves nothing, so the claim does not move', async () => {
    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      // Both panes were started at this moment. B's watch is armed later in
      // the script, and it is given the same spawn time so the record on disk
      // is still fresh for it.
      const spawnedAt = Date.now() - 500;
      // A alone, with a record it cannot read yet. Its grace timer takes it.
      const a = startWhaleWatch('s-A', cwd, { sinceTs: spawnedAt });
      await flushIo();
      writeWhaleRecord(X, null);
      fireEventAt(0, join(whaleDir(), `${X}.json`));
      await flushIo();
      await vi.advanceTimersByTimeAsync(5_100);
      await flushIo();
      const ra = await a.promise;
      expect(ra.viaGraceTimer).toBe(true);
      expect(conversationClaimStrength(X)).toBe('provisional');

      // A second pane starts in the SAME folder, and the record completes
      // carrying that folder. B matches it, and the match says nothing about
      // which of the two panes wrote it: both are in the folder the record
      // names. Taking the id here would steal a correct guess half the time.
      const b = startWhaleWatch('s-B', cwd, {
        sinceTs: spawnedAt,
        timeoutMs: 20_000
      });
      const rejected = expect(b.promise).rejects.toThrow(/Timed out/);
      await flushIo();
      writeWhaleRecord(X, cwd);
      fireEventAt(1, join(whaleDir(), `${X}.json`));
      await flushIo();
      expect(conversationClaimant(X)).toBe('s-A');
      expect(conversationClaimStrength(X)).toBe('provisional');
      expect(reclaims).toEqual([]);

      // B waits for its own record instead, and says so honestly when the
      // window ends. A timeout is the right answer; theft is not.
      await vi.advanceTimersByTimeAsync(21_000);
      await rejected;
      expect(conversationClaimant(X)).toBe('s-A');
    } finally {
      off();
    }
  });
});

describe('one folder with two spellings is still one folder (T12)', () => {
  it('a symlinked launch path cannot walk around the same folder refusal', async () => {
    const reclaims: ConversationReclaim[] = [];
    const off = onConversationReclaimed((ev) => reclaims.push(ev));
    try {
      // T9 with one thing changed. Both panes are in ONE physical folder, and
      // they spell it differently: A carries the path itself, B carries a
      // symlink that points at it. That is the ordinary macOS case, where
      // /tmp is a symlink to /private/tmp, so two panes the user thinks of as
      // being in one folder arrive with two strings.
      //
      // MEASURED before the fix, through the real watcher: B took the claim
      // and the final claimant was s-B. The rank 2 rule compares the two
      // folders as strings, the strings were not equal, and the refusal that
      // exists to stop exactly this steal did not fire.
      const spawnedAt = Date.now() - 500;
      const a = startWhaleWatch('s-A', cwd, { sinceTs: spawnedAt });
      await flushIo();
      writeWhaleRecord(X, null);
      fireEventAt(0, join(whaleDir(), `${X}.json`));
      await flushIo();
      await vi.advanceTimersByTimeAsync(5_100);
      await flushIo();
      const ra = await a.promise;
      expect(ra.viaGraceTimer).toBe(true);
      expect(conversationClaimant(X)).toBe('s-A');

      const b = startWhaleWatch('s-B', cwdSpelledThroughALink(), {
        sinceTs: spawnedAt,
        timeoutMs: 20_000
      });
      const rejected = expect(b.promise).rejects.toThrow(/Timed out/);
      await flushIo();
      // The record completes naming the folder. B confirms it, because
      // `samePath` resolves both sides, and B's match still proves nothing
      // about which of the two panes wrote it.
      writeWhaleRecord(X, cwd);
      fireEventAt(1, join(whaleDir(), `${X}.json`));
      await flushIo();
      expect(conversationClaimant(X)).toBe('s-A');
      expect(conversationClaimStrength(X)).toBe('provisional');
      expect(reclaims).toEqual([]);

      // And B ends the way T9's loser ends, by waiting for its own record and
      // timing out honestly when it never writes one.
      await vi.advanceTimersByTimeAsync(21_000);
      await rejected;
      expect(conversationClaimant(X)).toBe('s-A');
    } finally {
      off();
    }
  });

  it('a neighbour reached through a symlink still counts as the same folder', async () => {
    // The same string compare decides `sameCwdWatches`, so an unresolved
    // spelling also hid the neighbour and let the row record 'exact'. Two
    // codex panes, one physical folder, two spellings of it.
    const a = startCodexWatch('s-A', cwd);
    const b = startCodexWatch('s-B', cwdSpelledThroughALink(), 20_000);
    const rejected = expect(b.promise).rejects.toThrow(/Timed out/);
    await flushIo();

    writeRollout(X, '2099-01-01T00-00-00', cwd);
    fireEventAt(0, join(codexDir(), `rollout-2099-01-01T00-00-00-${X}.jsonl`));
    await flushIo();

    const ra = await a.promise;
    expect(ra.sessionId).toBe(X);
    expect(ra.sameCwdWatches).toBe(1);
    expect(
      deriveResumeConfidence({
        key: ra.key,
        keyConfidence: ra.confidence,
        viaGraceTimer: ra.viaGraceTimer,
        rivals: ra.rivals,
        sameCwdWatches: ra.sameCwdWatches
      })
    ).toBe('weak');

    await vi.advanceTimersByTimeAsync(21_000);
    await rejected;
  });
});

describe('the same folder residual is recorded, not hidden (T10)', () => {
  it('a codex winner with a neighbour in its folder records weak, not exact', async () => {
    const a = startCodexWatch('s-A', cwd);
    const b = startCodexWatch('s-B', cwd);
    await flushIo();
    expect(subscribers.length).toBe(2);

    // ONE rollout, so `rivals` is 1 and the old rule called this exact. The
    // second pane of the same agent was looking in the same folder at that
    // moment, and that is what makes 1 rival misleading.
    writeRollout(X, '2099-01-01T00-00-01', cwd);
    fireEventAt(0, join(codexDir(), `rollout-2099-01-01T00-00-01-${X}.jsonl`));
    await flushIo();

    const ra = await a.promise;
    expect(ra.sessionId).toBe(X);
    expect(ra.rivals).toBe(1);
    expect(ra.sameCwdWatches).toBe(1);
    expect(
      harvestProvenance(ra, { cwd, agentVersion: null, atCreate: true }).confidence
    ).toBe('weak');
    expect(conversationClaimStrength(X)).toBe('matched');

    // B's own rollout lands, and B takes that one rather than A's.
    writeRollout(Y, '2099-01-01T00-00-09', cwd);
    fireEventAt(1, join(codexDir(), `rollout-2099-01-01T00-00-09-${Y}.jsonl`));
    await flushIo();

    const rb = await b.promise;
    expect(rb.sessionId).toBe(Y);
    // A has settled, so no other watch was in the folder when B accepted.
    expect(rb.sameCwdWatches).toBeUndefined();
    expect(
      harvestProvenance(rb, { cwd, agentVersion: null, atCreate: true }).confidence
    ).toBe('exact');
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
