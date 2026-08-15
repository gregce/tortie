/**
 * Direct tests for the pure reconcile decisions (Phase 42 stage 5).
 *
 * restoredStatus, claimStrengthOf and snapshotFailureNotice moved here with
 * their existing suites intact (restore-status.test.ts and
 * session-history-core.test.ts still import them through core.ts). What this
 * file pins is the judgements that were inline in identify() and refresh()
 * until this stage: the identity probe, the retained bindings for skipped
 * rows, the stale-create sweep and the status-flip actions.
 */

import { describe, expect, it } from 'vitest';
import {
  identityProbeNeeded,
  identityProbeVerdict,
  retainedBindings,
  staleCreateIds,
  statusFlipActions
} from '../reconcile-plan';

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
