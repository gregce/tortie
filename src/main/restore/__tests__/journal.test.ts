/**
 * The restore journal's resolution policy (Phase 19 item 7).
 *
 * The journal exists to make three situations distinguishable that all used to
 * read as `restorable` at the next launch: a restore that never started, a
 * restore that created a tmux session Tortie never recorded, and a restore
 * that finished with only the status write lost. Getting them wrong has one
 * concrete cost, which is "Restore all" starting a SECOND agent in a worktree
 * that already has one running.
 *
 * Resolution compares two independent sources, the journal and the live tmux
 * server, so the whole matrix of the two is written out here. That is the
 * whole value of the journal and it should be readable as a table.
 */

import { describe, expect, it } from 'vitest';
import type { RestoreAttemptRecord } from '../../manifest';
import { isUnrecordedSession, resolveRestoreJournal } from '../journal';

const AT = 1_000;

function attempt(over: Partial<RestoreAttemptRecord> = {}): RestoreAttemptRecord {
  return {
    id: 1,
    sessionId: 'sess-1',
    startedAt: 10,
    tmuxId: null,
    outcome: null,
    finishedAt: null,
    ...over
  };
}

describe('resolveRestoreJournal — the four cells of the matrix', () => {
  it('no tmux id recorded, nothing live: nothing came back', () => {
    const [r] = resolveRestoreJournal([attempt()], [], new Map(), AT);
    expect(r?.kind).toBe('nothing-came-back');
    expect(r?.record).toEqual({
      kind: 'failed',
      at: AT,
      stage: 'create',
      reason:
        'Tortie stopped during this restore before anything was created. ' +
        'Nothing came back. Restore it again.'
    });
    // The row keeps `restorable`, so the user can simply try again.
    expect(r?.tmuxId).toBeUndefined();
  });

  it('tmux id recorded and the session is live: interrupted, and it came back', () => {
    const [r] = resolveRestoreJournal(
      [attempt({ tmuxId: '$5' })],
      [{ gmuxId: 'sess-1', tmuxId: '$5' }],
      new Map(),
      AT
    );
    expect(r?.kind).toBe('came-back');
    expect(r?.tmuxId).toBe('$5');
    // What it CONTAINS is not knowable: the crash could have landed on either
    // side of the scrollback replay. Saying so is the honest answer, and it is
    // why `interrupted` exists as its own kind rather than being folded into
    // shell_only.
    expect(r?.record.kind).toBe('interrupted');
  });

  it('tmux id recorded and the session is gone: nothing to adopt', () => {
    const [r] = resolveRestoreJournal([attempt({ tmuxId: '$5' })], [], new Map(), AT);
    expect(r?.kind).toBe('session-lost');
    expect(r?.record.kind).toBe('failed');
    expect(r?.record.stage).toBe('create');
  });

  it('no tmux id recorded and yet the session is live: the disagreement', () => {
    // Tortie stopped in the window between new-session returning and the id
    // being written. This is the case the journal was built to detect, and
    // the one a journal-free build reads as a plain restorable row while a
    // real agent runs in the worktree.
    const [r] = resolveRestoreJournal(
      [attempt()],
      [{ gmuxId: 'sess-1', tmuxId: '$9' }],
      new Map(),
      AT
    );
    expect(r?.kind).toBe('unrecorded-session');
    expect(isUnrecordedSession(r!)).toBe(true);
    expect(r?.tmuxId).toBe('$9');
    expect(r?.record.kind).toBe('interrupted');
    expect(r?.note).toMatch(/stopped before recording it/);
  });
});

describe('resolveRestoreJournal — the rules that stop it doing harm', () => {
  it('identity decides, never the tmux id on its own', () => {
    // The recorded $-id is on the socket, and it belongs to somebody else now:
    // tmux reused the number. Adopting it would be the name-collision bug of
    // Phase 12.7 wearing a different key.
    const [r] = resolveRestoreJournal(
      [attempt({ tmuxId: '$5' })],
      [{ gmuxId: 'a-different-session', tmuxId: '$5' }],
      new Map(),
      AT
    );
    expect(r?.kind).toBe('session-lost');
    expect(r?.tmuxId).toBeUndefined();
    expect(r?.note).toMatch(/belongs to another session/);
  });

  it('never produces a session status, for any cell of the matrix', () => {
    // Claiming a live session is reconcile's job, by identity, and there must
    // not be a second adoption path: two answers to "is this session mine" is
    // the one class of bug the durability layer cannot afford. Every
    // resolution carries a record and a note and nothing that could be
    // written to `sessions.status`.
    const rs = resolveRestoreJournal(
      [
        attempt({ id: 1, sessionId: 'a' }),
        attempt({ id: 2, sessionId: 'b', tmuxId: '$5' }),
        attempt({ id: 3, sessionId: 'c' }),
        attempt({ id: 4, sessionId: 'd', tmuxId: '$6' })
      ],
      [
        { gmuxId: 'c', tmuxId: '$7' },
        { gmuxId: 'd', tmuxId: '$6' }
      ],
      new Map(),
      AT
    );
    expect(rs).toHaveLength(4);
    for (const r of rs) {
      expect(Object.keys(r)).not.toContain('status');
      // The only two records the journal may write. It never claims a
      // session came back whole, because it cannot know that.
      expect(['failed', 'interrupted']).toContain(r.record.kind);
    }
  });

  it('resolves every unfinished attempt, in the order it was given them', () => {
    const rs = resolveRestoreJournal(
      [
        attempt({ id: 1, sessionId: 'a' }),
        attempt({ id: 2, sessionId: 'b', tmuxId: '$2' }),
        attempt({ id: 3, sessionId: 'c' })
      ],
      [{ gmuxId: 'c', tmuxId: '$3' }],
      new Map(),
      AT
    );
    expect(rs.map((r) => [r.attemptId, r.kind])).toEqual([
      [1, 'nothing-came-back'],
      [2, 'session-lost'],
      [3, 'unrecorded-session']
    ]);
  });

  it('two attempts for the same session both resolve against the same evidence', () => {
    // A double-click on Restore that crashed twice leaves two open rows. They
    // must not disagree with each other, or the next launch has two answers.
    const rs = resolveRestoreJournal(
      [attempt({ id: 1 }), attempt({ id: 2 })],
      [{ gmuxId: 'sess-1', tmuxId: '$4' }],
      new Map(),
      AT
    );
    expect(rs.map((r) => r.kind)).toEqual([
      'unrecorded-session',
      'unrecorded-session'
    ]);
  });

  it('an empty journal resolves to nothing at all', () => {
    expect(
      resolveRestoreJournal([], [{ gmuxId: 'x', tmuxId: '$1' }], new Map(), AT)
    ).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // The fifth cell. `restore.after-status-write` is a real kill point in the
  // fault harness, and it lands here: the restore had finished and written
  // its record, and only the journal close was lost.
  // -----------------------------------------------------------------------

  it('keeps a record the restore already wrote, rather than replacing it', () => {
    const existing = new Map([
      ['sess-1', { kind: 'armed' as const, at: 50 }] // after startedAt: 10
    ]);
    const [r] = resolveRestoreJournal(
      [attempt({ tmuxId: '$5' })],
      [{ gmuxId: 'sess-1', tmuxId: '$5' }],
      existing,
      AT
    );
    expect(r?.kind).toBe('already-recorded');
    expect(r?.write).toBe(false);
    // Writing "not known" over an accurate "armed" would tell the user less
    // than the app knows, which is item 6's defect pointed the other way.
    expect(r?.record).toEqual({ kind: 'armed', at: 50 });
  });

  it('ignores a record from a PREVIOUS restore of the same session', () => {
    const existing = new Map([
      ['sess-1', { kind: 'armed' as const, at: 5 }] // before startedAt: 10
    ]);
    const [r] = resolveRestoreJournal([attempt()], [], existing, AT);
    expect(r?.kind).toBe('nothing-came-back');
    expect(r?.write).toBe(true);
    expect(r?.record.kind).toBe('failed');
  });

  it('every other cell asks the caller to write', () => {
    const rs = resolveRestoreJournal(
      [
        attempt({ id: 1, sessionId: 'a' }),
        attempt({ id: 2, sessionId: 'b', tmuxId: '$5' }),
        attempt({ id: 3, sessionId: 'c' })
      ],
      [{ gmuxId: 'c', tmuxId: '$7' }],
      new Map(),
      AT
    );
    expect(rs.map((r) => r.write)).toEqual([true, true, true]);
  });
});
