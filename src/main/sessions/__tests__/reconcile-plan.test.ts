/**
 * Direct tests for the pure reconcile decisions (Phase 42 stage 5).
 *
 * restoredStatus, claimStrengthOf and snapshotFailureNotice moved here with
 * their existing suites intact (restore-status.test.ts and
 * session-history-core.test.ts still import them through core.ts). What this
 * file pins is the judgements that were inline in identify() and refresh()
 * until this stage: the identity probe, the retained bindings for skipped
 * rows, the stale-create sweep and the status-flip actions.
 *
 * Phase 67 added the listAttemptOutcome and unreachableFlips suites at the
 * bottom. Together they pin the per-machine reconcile boundary: what a failed
 * list is allowed to prove, and the whole status table that follows from it.
 */

import { describe, expect, it } from 'vitest';
import {
  identityProbeNeeded,
  identityProbeVerdict,
  listAttemptOutcome,
  retainedBindings,
  staleCreateIds,
  statusFlipActions,
  unreachableFlips
} from '../reconcile-plan';
import type { SessionStatus } from '@shared/types';

describe('identityProbeNeeded', () => {
  const known = new Set(['row-1']);
  const foreign = new Set(['$9']);

  it('trusts a stamped id the manifest knows — no exec spent', () => {
    expect(
      identityProbeNeeded({ sessionId: '$1', gmuxId: 'row-1' }, known, foreign)
    ).toBe(false);
  });

  it('probes a session with no stamp at all', () => {
    expect(identityProbeNeeded({ sessionId: '$2' }, known, foreign)).toBe(true);
  });

  it('probes a stamp that names no manifest row', () => {
    expect(
      identityProbeNeeded({ sessionId: '$3', gmuxId: 'gone' }, known, foreign)
    ).toBe(true);
  });

  it('never re-probes a session already proven foreign', () => {
    expect(identityProbeNeeded({ sessionId: '$9' }, known, foreign)).toBe(
      false
    );
  });
});

describe('identityProbeVerdict', () => {
  const known = new Set(['row-1']);

  it('adopts only an env stamp the manifest knows', () => {
    expect(identityProbeVerdict('row-1', known)).toEqual({
      kind: 'adopted',
      gmuxId: 'row-1'
    });
  });

  it('judges an unknown stamp foreign — never adopt what is not ours', () => {
    expect(identityProbeVerdict('stranger', known)).toEqual({
      kind: 'foreign'
    });
  });

  it('judges a missing stamp foreign', () => {
    expect(identityProbeVerdict(null, known)).toEqual({ kind: 'foreign' });
  });
});

describe('retainedBindings', () => {
  const previous = new Map([
    ['row-a', '$1'],
    ['row-b', '$2'],
    ['row-c', '$2']
  ]);

  it('keeps the binding a skipped row already had', () => {
    expect(retainedBindings(['row-a'], previous, new Set())).toEqual([
      ['row-a', '$1']
    ]);
  });

  it('drops a row with no previous binding', () => {
    expect(retainedBindings(['row-x'], previous, new Set())).toEqual([]);
  });

  it('never binds a tmux id the reconcile already bound', () => {
    expect(retainedBindings(['row-a'], previous, new Set(['$1']))).toEqual([]);
  });

  it('never hands one tmux id to two skipped rows', () => {
    expect(retainedBindings(['row-b', 'row-c'], previous, new Set())).toEqual([
      ['row-b', '$2']
    ]);
  });
});

describe('staleCreateIds', () => {
  const MAX = 60_000;

  it('forgets a create older than the window', () => {
    const inFlight = new Map([['old', 0]]);
    expect(staleCreateIds(inFlight, 100_000, MAX)).toEqual(['old']);
  });

  it('keeps a create still inside the window, including the boundary', () => {
    const inFlight = new Map([
      ['fresh', 90_000],
      ['boundary', 40_000] // exactly now - MAX: not yet stale (strict <)
    ]);
    expect(staleCreateIds(inFlight, 100_000, MAX)).toEqual([]);
  });
});

describe('statusFlipActions', () => {
  it('does nothing for a row that did not flip', () => {
    expect(statusFlipActions('running', 'running')).toEqual({
      broadcast: false,
      captureSync: false
    });
  });

  it('does nothing for a row the snapshot never saw', () => {
    expect(statusFlipActions(undefined, 'restorable')).toEqual({
      broadcast: false,
      captureSync: false
    });
  });

  it('broadcasts an ordinary flip without a capture sync', () => {
    expect(statusFlipActions('running', 'idle')).toEqual({
      broadcast: true,
      captureSync: false
    });
  });

  it('syncs the capture when a live session died unwatched', () => {
    expect(statusFlipActions('running', 'restorable')).toEqual({
      broadcast: true,
      captureSync: true
    });
    expect(statusFlipActions('idle', 'restorable')).toEqual({
      broadcast: true,
      captureSync: true
    });
  });

  it('an exited session going restorable is not a death — it already ended', () => {
    expect(statusFlipActions('exited', 'restorable')).toEqual({
      broadcast: true,
      captureSync: false
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 67 — the unreachable boundary
// ---------------------------------------------------------------------------

/**
 * The three-way answer is the whole fix. Before Phase 67 a failed list had one
 * branch, and "the exec failed" and "the server is dead" were the same fact.
 */
describe('listAttemptOutcome', () => {
  it('a list that ran is listed, whatever it returned', () => {
    expect(listAttemptOutcome(null)).toEqual({ kind: 'listed' });
  });

  it('only a completed probe reports no-server', () => {
    expect(listAttemptOutcome('no-server')).toEqual({ kind: 'no-server' });
  });

  it('everything a failed exec did not prove is unreachable', () => {
    expect(listAttemptOutcome('not-confirmed')).toEqual({
      kind: 'unreachable'
    });
  });
});

/**
 * The status table this suite pins, in full. `snapshotAt` is the instant the
 * failed list was taken, so a row whose own evidence is newer than that is
 * left alone whichever column it is in.
 *
 * | Prior status | On 'unreachable' | Why                                   |
 * | ------------ | ---------------- | ------------------------------------- |
 * | running      | unknown          | the claim of liveness lost its backing |
 * | idle         | unknown          | same claim, quieter                    |
 * | needs_input  | unknown          | same claim, and the gap is not queued  |
 * | unknown      | unknown          | already honest, so no rewrite          |
 * | restorable   | restorable       | its death was already confirmed        |
 * | exited       | exited           | a terminal record, not a claim         |
 * | discarded    | discarded        | a tombstone, never revived             |
 * | in flight    | unchanged        | newer than the evidence                |
 * | newer row    | unchanged        | newer than the evidence                |
 */
describe('unreachableFlips', () => {
  const SNAPSHOT = 1_000_000;

  /** One row, old enough that only its status decides the answer. */
  function row(
    id: string,
    status: SessionStatus,
    times: { createdAt?: number; lastSeen?: number } = {}
  ) {
    return {
      id,
      status,
      createdAt: times.createdAt ?? SNAPSHOT - 60_000,
      lastSeen: times.lastSeen ?? SNAPSHOT - 5_000
    };
  }

  const NONE: ReadonlySet<string> = new Set();

  it('downgrades every status that claims the session is alive', () => {
    const rows = [
      row('r-running', 'running'),
      row('r-idle', 'idle'),
      row('r-needs', 'needs_input')
    ];
    expect(unreachableFlips(rows, SNAPSHOT, NONE)).toEqual([
      'r-running',
      'r-idle',
      'r-needs'
    ]);
  });

  /**
   * No rewrite and no event, so a 2 s retry cadence does not turn into a 2 s
   * broadcast cadence for as long as the link stays down.
   */
  it('leaves a row that already reads unknown alone', () => {
    expect(unreachableFlips([row('r', 'unknown')], SNAPSHOT, NONE)).toEqual([]);
  });

  /**
   * A confirmed death is not un-confirmed by a later ambiguity. The offer of
   * Restore stays honest, and a Restore pressed against an ambiguous socket
   * fails cleanly and keeps the row's status.
   */
  it('never regresses a confirmed death back to unknown', () => {
    expect(unreachableFlips([row('r', 'restorable')], SNAPSHOT, NONE)).toEqual(
      []
    );
  });

  it('leaves the two terminal records alone', () => {
    const rows = [row('r-exited', 'exited'), row('r-discarded', 'discarded')];
    expect(unreachableFlips(rows, SNAPSHOT, NONE)).toEqual([]);
  });

  it('leaves a create or a restore that is still in flight alone', () => {
    const rows = [row('r-busy', 'running'), row('r-free', 'running')];
    expect(unreachableFlips(rows, SNAPSHOT, new Set(['r-busy']))).toEqual([
      'r-free'
    ]);
  });

  /**
   * The failed exec is evidence taken at `snapshotAt`. It proves nothing about
   * a row born after that instant, and the tie goes to the row, the same `>=`
   * rule skipReason uses in ../../manifest/reconciliation.ts.
   */
  it('leaves a row created at or after the snapshot alone', () => {
    const rows = [
      row('r-after', 'running', { createdAt: SNAPSHOT + 1 }),
      row('r-tie', 'running', { createdAt: SNAPSHOT }),
      row('r-before', 'running', { createdAt: SNAPSHOT - 1 })
    ];
    expect(unreachableFlips(rows, SNAPSHOT, NONE)).toEqual(['r-before']);
  });

  it('leaves a row seen alive at or after the snapshot alone', () => {
    const rows = [
      row('r-after', 'running', { lastSeen: SNAPSHOT + 1 }),
      row('r-tie', 'running', { lastSeen: SNAPSHOT }),
      row('r-before', 'running', { lastSeen: SNAPSHOT - 1 })
    ];
    expect(unreachableFlips(rows, SNAPSHOT, NONE)).toEqual(['r-before']);
  });

  it('returns nothing for an empty manifest', () => {
    expect(unreachableFlips([], SNAPSHOT, NONE)).toEqual([]);
  });
});
