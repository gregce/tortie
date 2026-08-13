/**
 * Two ways a harvest can record a claim that is not true, both found by the
 * Phase 21 verifiers and both fixed in the fix round.
 *
 * 1. THE COUNT CAME FROM AN EVENT BATCH. `decide()` accepted a confirmed
 *    candidate the moment one existed. One FSEvents callback carrying one of
 *    two records that were both already on disk therefore settled the watch
 *    with `rivals: 1`, and `deriveResumeConfidence` turned that into 'exact'
 *    for a session with a rival in the same folder. Verifier B measured it at
 *    3 of 150 under load, and 2 of 5 full test suite runs.
 *
 * 2. TWO PANES TOOK THE SAME CONVERSATION. Two sessions started 150 ms apart
 *    in one folder both settled on the first record, both recorded 'exact',
 *    and two manifest rows pointed at one conversation.
 *
 * The FSEvents channel is mocked here on purpose. The defect in case 1 is a
 * race between two channels, and a test that waits for the real one to lose
 * is a test that passes for the wrong reason. Driving the callback directly
 * makes the ordering the test's choice rather than the machine's.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Every FSEvents callback the watcher subscribed, by directory. */
const subscribers: { dir: string; cb: (err: Error | null, events: unknown[]) => void }[] =
  [];

vi.mock('@parcel/watcher', () => ({
  subscribe: (dir: string, cb: (err: Error | null, events: unknown[]) => void) => {
    subscribers.push({ dir, cb });
    return Promise.resolve({ unsubscribe: () => Promise.resolve() });
  }
}));

const { harvestProvenance } = await import('../agents');
const { forgetConversationClaims, watchForSessionId } = await import('../harvest');

let home = '';
let cwd = '';

/**
 * A poll interval long enough that the scheduled readdir cannot rescue any of
 * these tests. Anything they get right, they get right because of the fix.
 */
const NO_POLL = { pollIntervalMs: 600_000, timeoutMs: 5_000, graceMs: 200 } as const;
/** The same, with a poll, for the tests that are about two watches racing. */
const FAST = { pollIntervalMs: 20, timeoutMs: 5_000, graceMs: 200 } as const;

const EARLIER = 'aaaaaaaa-1111-4111-8111-111111111111';
const LATER = 'bbbbbbbb-2222-4222-8222-222222222222';

function storeDir(): string {
  return join(home, '.codex', 'sessions', '2099', '01', '01');
}

/** A codex rollout that confirms: line 1 carries the cwd the watch was given. */
function writeRollout(uuid: string, stamp: string): string {
  const path = join(storeDir(), `rollout-${stamp}-${uuid}.jsonl`);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ payload: { cwd } })}\n`);
  return path;
}

/** Hand the watcher one create event, the way FSEvents would. */
function fireEvent(path: string): void {
  for (const s of subscribers) s.cb(null, [{ type: 'create', path }]);
}

/** Let the watcher's own promises run. */
async function settleTicks(n = 8): Promise<void> {
  for (let i = 0; i < n; i += 1) await new Promise((r) => setTimeout(r, 5));
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'gmux-own-home-'));
  cwd = mkdtempSync(join(tmpdir(), 'gmux-own-cwd-'));
  mkdirSync(storeDir(), { recursive: true });
  subscribers.length = 0;
  forgetConversationClaims();
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
  forgetConversationClaims();
});

// ---------------------------------------------------------------------------
// 1. The count is a fact about the directory, not about one event
// ---------------------------------------------------------------------------

describe('an event batch cannot decide how many rivals there were', () => {
  it('counts the record the batch did not mention', async () => {
    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...NO_POLL, claimant: 'pane-1' }
    );
    // The first readdir runs at construction against an empty directory.
    await settleTicks(2);
    expect(subscribers.length).toBeGreaterThan(0);

    // Both records are written in the same instant, and the fast channel
    // reports ONE of them. This is the shape verifier B measured.
    const earlier = writeRollout(EARLIER, '2099-01-01T00-00-01');
    writeRollout(LATER, '2099-01-01T00-00-09');
    fireEvent(earlier);

    const harvested = await watch.promise;
    expect(harvested.sessionId).toBe(EARLIER);
    // The pick is unchanged. The claim about it is not.
    expect(harvested.rivals).toBe(2);
    expect(
      harvestProvenance(harvested, { cwd, agentVersion: null, atCreate: true })
        .confidence
    ).toBe('weak');
  });

  it('waits for a listing that is still running rather than counting a prefix', async () => {
    // THE THIRD HOLE, and the one that survived the first fix. An event that
    // arrives while the first readdir is PART WAY THROUGH sees a candidate
    // map holding whatever that readdir has registered so far. Deciding on it
    // reported one rival for a directory that held two, which is how the
    // project's own G6 test kept failing about one run in eight.
    //
    // The listing is made slow the honest way, with a directory that takes
    // time to walk: 400 rollouts of other people's sessions, each of which
    // costs a read to rule out.
    for (let i = 0; i < 400; i += 1) {
      const uuid = `cccccccc-0000-4000-8000-${String(i).padStart(12, '0')}`;
      const path = join(storeDir(), `rollout-2099-01-01T00-00-05-${uuid}.jsonl`);
      writeFileSync(path, `${JSON.stringify({ payload: { cwd: '/elsewhere' } })}\n`);
    }
    const earlier = writeRollout(EARLIER, '2099-01-01T00-00-01');
    writeRollout(LATER, '2099-01-01T00-00-09');

    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...NO_POLL, claimant: 'pane-1' }
    );
    // One tick, so the subscription exists and the first listing is under way.
    await settleTicks(1);
    fireEvent(earlier);

    const harvested = await watch.promise;
    expect(harvested.sessionId).toBe(EARLIER);
    expect(harvested.rivals).toBe(2);
  });

  it('still says 1 when the directory really does hold one record', async () => {
    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...NO_POLL, claimant: 'pane-1' }
    );
    await settleTicks(2);
    fireEvent(writeRollout(EARLIER, '2099-01-01T00-00-01'));

    const harvested = await watch.promise;
    expect(harvested.rivals).toBe(1);
    expect(
      harvestProvenance(harvested, { cwd, agentVersion: null, atCreate: true })
        .confidence
    ).toBe('exact');
  });
});

// ---------------------------------------------------------------------------
// 2. One conversation belongs to one session
// ---------------------------------------------------------------------------

describe('a conversation another session already has is not a candidate', () => {
  it('two panes 150 ms apart in one folder end up on different records', async () => {
    // Verifier B's measurement, run as a test: two watches open, record A
    // written, record B written 150 ms later. Both used to settle on A.
    const a = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST, claimant: 'pane-a' }
    );
    const b = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST, claimant: 'pane-b' }
    );
    writeRollout(EARLIER, '2099-01-01T00-00-01');
    setTimeout(() => writeRollout(LATER, '2099-01-01T00-00-09'), 150);

    const [ra, rb] = await Promise.all([a.promise, b.promise]);
    expect(ra.sessionId).not.toBe(rb.sessionId);
    expect([ra.sessionId, rb.sessionId].sort()).toEqual([EARLIER, LATER].sort());
  });

  it('the same session may retake the id it already had', async () => {
    // The boot rescue starts a second watch for a row that already harvested.
    // The claim is keyed by claimant precisely so that is not theft.
    writeRollout(EARLIER, '2099-01-01T00-00-01');
    const first = await watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST, claimant: 'pane-a' }
    ).promise;
    const again = await watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST, claimant: 'pane-a' }
    ).promise;
    expect(again.sessionId).toBe(first.sessionId);
  });

  it('a watch that can only see a taken record waits rather than steal it', async () => {
    writeRollout(EARLIER, '2099-01-01T00-00-01');
    const mine = await watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST, claimant: 'pane-a' }
    ).promise;
    expect(mine.sessionId).toBe(EARLIER);

    // A second pane, one record, and it is not this pane's. A timeout here is
    // the honest answer: the session runs fine and no id was recorded. Handing
    // it the other pane's conversation is the failure this replaces.
    const second = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST, timeoutMs: 700, claimant: 'pane-b' }
    );
    await expect(second.promise).rejects.toThrow(/Timed out/);
  });
});
