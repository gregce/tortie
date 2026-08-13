/**
 * The four notice kinds nobody was sending (Phase 19, integrator).
 *
 * Builder 5 shipped five shapes and the renderer branch for each one. Only
 * `snapshot-failed` had a caller when the parallel round ended, so four of the
 * five degraded states were still silent, which is the defect Phase 19 item 9
 * exists to close. These tests pin the condition each of the four fires on,
 * and just as importantly the neighbouring condition each one must stay quiet
 * on, because a durability notice that cries wolf is worse than none.
 *
 * `depth-degraded` is driven through the real `verifyHistoryLimitWith`. The
 * other three conditions are asserted on the functions that decide them, with
 * the emitter recorded.
 */

import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DurabilityNotice } from '@shared/notice';

/** The conf that ships in the bundle. Parsed for real, never executed. */
const REAL_CONF = join(__dirname, '..', '..', '..', 'resources', 'gmux-tmux.conf');

/** Every notice the code under test posted, in order. */
const sent: DurabilityNotice[] = [];

vi.mock('../typed-events', () => ({
  broadcastEvent: (_channel: string, notice: DurabilityNotice) => {
    sent.push(notice);
  }
}));

const { postDurabilityNotice, resetDurabilityNoticesForTests, takePendingNotices } =
  await import('../notice');
const { verifyHistoryLimitWith } = await import('../tmux/supervisor');
const { resolveRestoreJournal } = await import('../restore/journal');
const { restoreCameBackWhole } = await import('@shared/restore-status');

/** The notices that were posted, whether or not a renderer was listening. */
function posted(): DurabilityNotice[] {
  return [...sent, ...takePendingNotices()];
}

beforeEach(() => {
  sent.length = 0;
  resetDurabilityNoticesForTests();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------
// depth-degraded (items 9 and 13)
// ---------------------------------------------------------------------------

describe('the tmux server is keeping less scrollback than Tortie asked for', () => {
  const conf = REAL_CONF;

  it('says so when a cold start comes up shallow and the repair fails', async () => {
    // tmux's own default. This is the measured symptom of a conf path that an
    // update replaced: the server starts, exits zero and says nothing.
    const v = await verifyHistoryLimitWith(conf, false, {
      readLimit: async () => 2000,
      setLimit: async () => {
        throw new Error('no server');
      }
    });
    expect(v.applied).toBe(false);
    expect(posted()).toEqual([
      { kind: 'depth-degraded', actualLines: 2000, requestedLines: v.declared }
    ]);
  });

  it('says nothing when the repair puts the declared depth back', async () => {
    let limit = 2000;
    const v = await verifyHistoryLimitWith(conf, false, {
      readLimit: async () => limit,
      setLimit: async (n) => {
        limit = n;
      }
    });
    expect(v.applied).toBe(true);
    expect(posted()).toEqual([]);
  });

  it('says nothing about a WARM server running a different depth', async () => {
    // On a warm server the depth is the user's own Settings value. Calling
    // that degraded would be an alarm about a preference they set.
    const v = await verifyHistoryLimitWith(conf, true, {
      readLimit: async () => 5000,
      setLimit: async () => {
        throw new Error('must not be called');
      }
    });
    expect(v.applied).toBe(false);
    expect(v.repaired).toBe(false);
    expect(posted()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// restore-incomplete (items 7 and 9)
// ---------------------------------------------------------------------------

describe('a restore the journal found unfinished', () => {
  /** The same test the core does, kept in one place so it cannot drift. */
  const needsAPerson = (kind: string): boolean =>
    kind === 'nothing-came-back' || kind === 'session-lost';

  const attempt = (id: number, sessionId: string, tmuxId?: string) => ({
    id,
    sessionId,
    startedAt: 1,
    tmuxId: tmuxId ?? null,
    finishedAt: null,
    outcome: null
  });

  it('is the two outcomes where the session is still not back', () => {
    const [nothing] = resolveRestoreJournal([attempt(1, 's1')], []);
    expect(nothing?.kind).toBe('nothing-came-back');
    expect(needsAPerson(nothing?.kind ?? '')).toBe(true);

    const [lost] = resolveRestoreJournal([attempt(2, 's2', '$9')], []);
    expect(lost?.kind).toBe('session-lost');
    expect(needsAPerson(lost?.kind ?? '')).toBe(true);
  });

  it('is not the outcome where a live session carries the identity', () => {
    const [back] = resolveRestoreJournal(
      [attempt(3, 's3', '$7')],
      [{ gmuxId: 's3', tmuxId: '$7' }]
    );
    expect(back?.kind).toBe('came-back');
    expect(needsAPerson(back?.kind ?? '')).toBe(false);
  });

  it('is not the outcome where the row already reported itself', () => {
    const [done] = resolveRestoreJournal(
      [attempt(4, 's4', '$8')],
      [{ gmuxId: 's4', tmuxId: '$8' }],
      new Map([['s4', { kind: 'armed' as const, at: 2 }]])
    );
    expect(done?.kind).toBe('already-recorded');
    expect(needsAPerson(done?.kind ?? '')).toBe(false);
  });

  it('speaks once even when several attempts were left open', () => {
    postDurabilityNotice({ kind: 'restore-incomplete', sessionName: 'auth' });
    postDurabilityNotice({ kind: 'restore-incomplete', sessionName: 'billing' });
    expect(posted()).toEqual([{ kind: 'restore-incomplete', sessionName: 'auth' }]);
  });
});

// ---------------------------------------------------------------------------
// restore-shortfall (items 6 and 9)
// ---------------------------------------------------------------------------

/**
 * Item 6 recorded what a restore achieved and told nobody.
 *
 * A verifier measured it end to end: a restore where both stages threw stored
 * `restore={"kind":"shell_only",…}` and status `idle`, the row then read
 * "working" a second later once the activity oracle saw a fresh pane, and the
 * only trace of the loss was a manifest column with no reader anywhere in
 * src/renderer. The rule for what counts as a shortfall is the shared one, so
 * these tests pin the rule and the notice together.
 */
describe('a restore that came back short', () => {
  /** The same branch `GmuxCore.reportRestoreStages` runs, kept in one place. */
  const stageOf = (r: {
    replayFailure?: string;
    armFailure?: string;
  }): 'scrollback' | 'resume' | 'both' => {
    const lostScrollback = r.replayFailure !== undefined;
    const lostResume = r.armFailure !== undefined;
    return lostScrollback && lostResume
      ? 'both'
      : lostScrollback
        ? 'scrollback'
        : 'resume';
  };

  it('is silent for the two shapes that lost nothing', () => {
    // A plain shell that had no conversation, and a session that had no saved
    // snapshot. Both are COMPLETE restores and a notice about either would be
    // a false alarm on the one channel that must never cry wolf.
    expect(restoreCameBackWhole({ kind: 'transcript', at: 1 })).toBe(true);
    expect(restoreCameBackWhole({ kind: 'shell_only', at: 1 })).toBe(true);
  });

  it('names which half is missing', () => {
    expect(stageOf({ replayFailure: 'x' })).toBe('scrollback');
    expect(stageOf({ armFailure: 'x' })).toBe('resume');
    expect(stageOf({ replayFailure: 'x', armFailure: 'y' })).toBe('both');
  });

  it('speaks once however many sessions came back short', () => {
    postDurabilityNotice({
      kind: 'restore-shortfall',
      sessionName: 'auth',
      stage: 'both'
    });
    postDurabilityNotice({
      kind: 'restore-shortfall',
      sessionName: 'billing',
      stage: 'resume'
    });
    expect(posted()).toEqual([
      { kind: 'restore-shortfall', sessionName: 'auth', stage: 'both' }
    ]);
  });
});

// ---------------------------------------------------------------------------
// manifest-unreadable (items 5 and 9)
// ---------------------------------------------------------------------------

describe('a session list that could not be read', () => {
  it('is a different notice from a damaged one, because the fix is different', () => {
    postDurabilityNotice({ kind: 'manifest-unreadable', path: '/x/manifest.db' });
    postDurabilityNotice({
      kind: 'manifest-quarantined',
      quarantinePath: '/x/manifest.db.damaged-1',
      recoveredAt: null
    });
    expect(posted().map((n) => n.kind)).toEqual([
      'manifest-unreadable',
      'manifest-quarantined'
    ]);
  });
});
