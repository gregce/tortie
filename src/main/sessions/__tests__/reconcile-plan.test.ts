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
 *
 * Phase 71 gave `unreachableFlips` its machine filter and added the suite that
 * proves it, being the last one in this file. The property it holds is short:
 * one machine's lost link never moves another machine's rows.
 *
 * Phase 111 added the `snapshotPassLine` suite. It pins the sentence a capture
 * pass writes about itself, which is the line a red durability lane is meant to
 * be readable from.
 */

import { describe, expect, it } from 'vitest';
import {
  LOCAL_MACHINE,
  identityProbeNeeded,
  identityProbeVerdict,
  listAttemptOutcome,
  retainedBindings,
  snapshotPassLine,
  staleCreateIds,
  statusFlipActions,
  unreachableFlips,
  type SnapshotPassResult
} from '../reconcile-plan';
import { LOCAL_MACHINE_ID } from '../../machines/context';
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
    times: { createdAt?: number; lastSeen?: number; machineId?: string } = {}
  ) {
    return {
      id,
      status,
      createdAt: times.createdAt ?? SNAPSHOT - 60_000,
      lastSeen: times.lastSeen ?? SNAPSHOT - 5_000,
      ...(times.machineId !== undefined ? { machineId: times.machineId } : {})
    };
  }

  const NONE: ReadonlySet<string> = new Set();

  it('downgrades every status that claims the session is alive', () => {
    const rows = [
      row('r-running', 'running'),
      row('r-idle', 'idle'),
      row('r-needs', 'needs_input')
    ];
    expect(unreachableFlips(rows, LOCAL_MACHINE, SNAPSHOT, NONE)).toEqual([
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
    expect(
      unreachableFlips([row('r', 'unknown')], LOCAL_MACHINE, SNAPSHOT, NONE)
    ).toEqual([]);
  });

  /**
   * A confirmed death is not un-confirmed by a later ambiguity. The offer of
   * Restore stays honest, and a Restore pressed against an ambiguous socket
   * fails cleanly and keeps the row's status.
   */
  it('never regresses a confirmed death back to unknown', () => {
    expect(
      unreachableFlips([row('r', 'restorable')], LOCAL_MACHINE, SNAPSHOT, NONE)
    ).toEqual([]);
  });

  it('leaves the two terminal records alone', () => {
    const rows = [row('r-exited', 'exited'), row('r-discarded', 'discarded')];
    expect(unreachableFlips(rows, LOCAL_MACHINE, SNAPSHOT, NONE)).toEqual([]);
  });

  it('leaves a create or a restore that is still in flight alone', () => {
    const rows = [row('r-busy', 'running'), row('r-free', 'running')];
    expect(
      unreachableFlips(rows, LOCAL_MACHINE, SNAPSHOT, new Set(['r-busy']))
    ).toEqual(['r-free']);
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
    expect(unreachableFlips(rows, LOCAL_MACHINE, SNAPSHOT, NONE)).toEqual([
      'r-before'
    ]);
  });

  it('leaves a row seen alive at or after the snapshot alone', () => {
    const rows = [
      row('r-after', 'running', { lastSeen: SNAPSHOT + 1 }),
      row('r-tie', 'running', { lastSeen: SNAPSHOT }),
      row('r-before', 'running', { lastSeen: SNAPSHOT - 1 })
    ];
    expect(unreachableFlips(rows, LOCAL_MACHINE, SNAPSHOT, NONE)).toEqual([
      'r-before'
    ]);
  });

  it('returns nothing for an empty manifest', () => {
    expect(unreachableFlips([], LOCAL_MACHINE, SNAPSHOT, NONE)).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Phase 71 — the machine filter
  // -------------------------------------------------------------------------

  /**
   * The property, stated the way the test asserts it: a manifest holding one
   * row on this Mac and one row on a machine called `studio`, given a local
   * transport failure, flips exactly the local row and leaves the other one
   * byte for byte. Given a `studio` transport failure it flips exactly the
   * `studio` row. The local machine cannot be moved by any remote machine and
   * no remote machine can be moved by another.
   *
   * This release writes only 'local' into the column, so nothing in production
   * exercises the second half yet. It is tested now because the rung that
   * starts writing other values must not also be the rung that discovers the
   * boundary was missing.
   */
  describe('the machine filter', () => {
    const mixed = [
      row('r-local', 'running', { machineId: 'local' }),
      row('r-studio', 'running', { machineId: 'studio' }),
      row('r-attic', 'running', { machineId: 'attic' })
    ];

    it('a local failure moves the local row and nothing else', () => {
      expect(unreachableFlips(mixed, 'local', SNAPSHOT, NONE)).toEqual([
        'r-local'
      ]);
    });

    it('one machine failing moves that machine and no other', () => {
      expect(unreachableFlips(mixed, 'studio', SNAPSHOT, NONE)).toEqual([
        'r-studio'
      ]);
      expect(unreachableFlips(mixed, 'attic', SNAPSHOT, NONE)).toEqual([
        'r-attic'
      ]);
    });

    it('a machine with no rows moves nothing at all', () => {
      expect(unreachableFlips(mixed, 'nobody', SNAPSHOT, NONE)).toEqual([]);
    });

    /**
     * Every row written before migration 013 has no value in the column, and
     * every one of those rows is a session on this Mac. Reading them as local
     * is what keeps an old manifest reconciling exactly as it did.
     */
    it('reads a row with no machine recorded as this Mac', () => {
      const old = [row('r-old', 'running')];
      expect(unreachableFlips(old, LOCAL_MACHINE, SNAPSHOT, NONE)).toEqual([
        'r-old'
      ]);
      expect(unreachableFlips(old, 'studio', SNAPSHOT, NONE)).toEqual([]);
    });

    /** One definition of the word, checked rather than assumed. */
    it('LOCAL_MACHINE is the id the machine registry uses', () => {
      expect(LOCAL_MACHINE).toBe(LOCAL_MACHINE_ID);
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 111 — the line a capture pass writes about itself
// ---------------------------------------------------------------------------

describe('snapshotPassLine', () => {
  /** `n` rows of one outcome, named `<prefix>0` upward. */
  const rows = (
    n: number,
    outcome: SnapshotPassResult['outcome'],
    prefix: string
  ): SnapshotPassResult[] =>
    Array.from({ length: n }, (_, i) => ({ name: `${prefix}${i}`, outcome }));

  it('says nothing more than the count when everything was written', () => {
    expect(snapshotPassLine('app-quit', rows(6, 'written', 'live'))).toBe(
      'scrollback pass (app-quit) over 6 sessions: 6 written, 0 had nothing ' +
        'on screen, 0 were not running, 0 had no pane on this Mac, 0 could ' +
        'not be written.'
    );
  });

  it('is the sentence in the spec for a mixed pass', () => {
    const results: SnapshotPassResult[] = [
      ...rows(6, 'written', 'live'),
      { name: 'smoke-t3-agent', outcome: 'nothingOnScreen' },
      ...rows(2, 'notRunning', 'old-run-')
    ];
    expect(snapshotPassLine('app-quit', results)).toBe(
      'scrollback pass (app-quit) over 9 sessions: 6 written, 1 had nothing ' +
        'on screen, 2 were not running, 0 had no pane on this Mac, 0 could ' +
        'not be written. Not written: "smoke-t3-agent" (nothing on screen).'
    );
  });

  /** One session is one session. A line that reads "1 sessions" is sloppy. */
  it('writes the singular when the pass saw one row', () => {
    expect(snapshotPassLine('session-close', rows(1, 'written', 'one'))).toBe(
      'scrollback pass (session-close) over 1 session: 1 written, 0 had ' +
        'nothing on screen, 0 were not running, 0 had no pane on this Mac, ' +
        '0 could not be written.'
    );
  });

  // -------------------------------------------------------------------------
  // The naming rule. These four are the whole point of the line, because a
  // count with the wrong names beside it is harder to read than no names.
  // -------------------------------------------------------------------------

  /**
   * The regression the fix round was called for. A manifest holds every
   * session the person ever ran, in created_at order, so the finished ones
   * come first and there are many of them. Naming those spent all eight slots
   * and the one session that actually failed to write was never printed.
   */
  it('names the one write failure behind twenty finished sessions', () => {
    const results: SnapshotPassResult[] = [
      ...rows(20, 'notRunning', 'old-'),
      ...rows(3, 'written', 'live'),
      { name: 'the-one-that-failed', outcome: 'failed' }
    ];
    expect(snapshotPassLine('app-quit', results)).toBe(
      'scrollback pass (app-quit) over 24 sessions: 3 written, 0 had nothing ' +
        'on screen, 20 were not running, 0 had no pane on this Mac, 1 could ' +
        'not be written. Not written: "the-one-that-failed" ' +
        '(could not be written).'
    );
  });

  /**
   * A session running fine on another Mac is not a loss and must never be
   * listed as one. This pass holds no binding for it because the pane is on
   * the other machine, which is the ordinary state for a remote row.
   */
  it('never names a session that is live on another machine', () => {
    const line = snapshotPassLine('app-quit', [
      { name: 'here', outcome: 'written' },
      { name: 'on-the-mini', outcome: 'noPaneHere' }
    ]);
    expect(line).toBe(
      'scrollback pass (app-quit) over 2 sessions: 1 written, 0 had nothing ' +
        'on screen, 0 were not running, 1 had no pane on this Mac, 0 could ' +
        'not be written.'
    );
    expect(line).not.toContain('on-the-mini');
    expect(line).not.toContain('Not written');
  });

  /** A written row is a success. It is counted and never named. */
  it('never names a session it wrote', () => {
    const line = snapshotPassLine('app-quit', [
      { name: 'saved-fine', outcome: 'written' },
      { name: 'empty-pane', outcome: 'nothingOnScreen' }
    ]);
    expect(line).toContain('Not written: "empty-pane" (nothing on screen).');
    expect(line).not.toContain('saved-fine');
  });

  it('prints eight names and counts the rest', () => {
    const line = snapshotPassLine(
      'server-exit',
      rows(11, 'nothingOnScreen', 's')
    );
    expect(line).toContain('"s0" (nothing on screen)');
    expect(line).toContain('"s7" (nothing on screen)');
    expect(line).not.toContain('"s8" (nothing on screen)');
    expect(line.endsWith(', and 3 more.')).toBe(true);
  });

  it('names all eight when eight is all there is', () => {
    const line = snapshotPassLine(
      'system-sleep',
      rows(8, 'nothingOnScreen', 's')
    );
    expect(line).toContain('"s7" (nothing on screen)');
    expect(line).not.toContain('more');
  });

  /** The reason word is the capsule's own, so the two vocabularies cannot drift. */
  it('carries each reason word through unchanged', () => {
    for (const reason of [
      'app-quit',
      'session-close',
      'session-death',
      'server-exit',
      'system-sleep'
    ] as const) {
      expect(snapshotPassLine(reason, [])).toContain(
        `scrollback pass (${reason}) over 0 sessions:`
      );
    }
  });
});
