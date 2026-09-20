/**
 * Phase 293 — batch End, every arm of build/p293/SPEC.md §4.9.
 *
 * A batch is the one new way this phase can be wrong about a target, so every
 * rule the loop keeps is driven here with plain functions and NO store: one
 * fresh read per target and before its call, the target found by session ID and
 * never by name or index, an absent id never ended, a failure recorded and the
 * next target still run, a stop honoured before the next call, and no
 * dependency ever handed a name.
 *
 * The fixtures are hostile on purpose. Two sessions SHARE a name, one session's
 * NAME is another session's ID, and the fresh list comes back in a different
 * order from the targets. A loop that looked a target up by name, or by its
 * place in a list, reads green over friendly fixtures and ends the wrong
 * session over these.
 *
 * `batchEligibility` is driven over literal gates here, so this file holds the
 * table of §2.10 by itself, and once more over the policy's own
 * `sessionActionGates`, so the two cannot drift.
 */

import { describe, expect, it } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';
import type { LifecycleResult, SessionActionGates } from '../../state/resume';
import { sessionActionGates } from '../../state/resume';
import { BATCH_LIST_FAILED } from '../copy';
import { batchEligibility, runBatchEnd } from '../batch-end';
import type { BatchEndDeps, BatchRowOutcome } from '../batch-end';

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: false,
  restoreReason: null
};

function sess(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    name: `name-of-${id}`,
    tmuxName: `tmux-of-${id}`,
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  };
}

/** Literal gates, so the table is held without the policy's help. */
function gates(over: Partial<SessionActionGates>): SessionActionGates {
  return {
    unknown: false,
    removed: false,
    ended: false,
    live: false,
    remote: false,
    canRename: false,
    offersRestore: false,
    canRestoreNow: false,
    canRestorePastNow: false,
    offersRestart: false,
    offersBare: false,
    offersResumeInPlace: false,
    canEnd: false,
    showsRemove: false,
    canRemove: false,
    ...over
  };
}

const LIVE = gates({ live: true, canEnd: true, canRename: true });

interface Harness {
  deps: BatchEndDeps;
  /** Every dependency call, in order: `list`, `eligibility:<id>`, `end:<id>`. */
  log: string[];
  /** The last outcome reported for each id. */
  outcomes: Record<string, BatchRowOutcome>;
  /** Every outcome reported for each id, in order. */
  reported: Record<string, BatchRowOutcome[]>;
  /** Every argument `end` and `report` were handed. */
  handed: unknown[];
}

function harness(options: {
  targetIds: readonly string[];
  /** What main holds. Re-read on every `list()`, so a test may mutate it. */
  sessions: () => readonly Session[] | null;
  end?: (id: string) => Promise<LifecycleResult>;
  stopRequested?: () => boolean;
  machineKnown?: (machineId: string) => boolean;
}): Harness {
  const log: string[] = [];
  const outcomes: Record<string, BatchRowOutcome> = {};
  const reported: Record<string, BatchRowOutcome[]> = {};
  const handed: unknown[] = [];
  const env = {
    canRestore: true,
    canDiscard: true,
    shellPathReady: true,
    handback: undefined
  };
  const deps: BatchEndDeps = {
    targetIds: options.targetIds,
    list: () => {
      log.push('list');
      return Promise.resolve(options.sessions());
    },
    eligibility: (session) => {
      log.push(`eligibility:${session.id}`);
      return batchEligibility(
        session,
        sessionActionGates(session, session.status, env),
        options.machineKnown ?? (() => true)
      );
    },
    end: (id) => {
      log.push(`end:${id}`);
      handed.push(id);
      return (options.end ?? (() => Promise.resolve({ ok: true })))(id);
    },
    stopRequested: options.stopRequested ?? (() => false),
    report: (id, outcome) => {
      handed.push(id);
      outcomes[id] = outcome;
      (reported[id] ??= []).push(outcome);
    }
  };
  return { deps, log, outcomes, reported, handed };
}

// ---------------------------------------------------------------------------
// Who is eligible: the table of §2.10, arm by arm and in its order
// ---------------------------------------------------------------------------

describe('batchEligibility', () => {
  const known = (): boolean => true;
  const unknownMachine = (): boolean => false;

  it('an unreachable row is unreachable, whatever else is true of it', () => {
    expect(
      batchEligibility(sess('a'), gates({ unknown: true, canEnd: true }), known)
    ).toBe('unreachable');
  });

  it('an ended row is already ended', () => {
    expect(batchEligibility(sess('a'), gates({ ended: true }), known)).toBe(
      'ended'
    );
  });

  it('a live row on a machine the list does not hold is unreachable', () => {
    expect(
      batchEligibility(sess('a', { machine: STUDIO }), LIVE, unknownMachine)
    ).toBe('unreachable');
  });

  it('asks about the machine by its ID and never by its label', () => {
    const asked: string[] = [];
    batchEligibility(sess('a', { machine: STUDIO }), LIVE, (id) => {
      asked.push(id);
      return true;
    });
    expect(asked).toEqual(['studio']);
  });

  it('a live row on a machine the list holds may be ended', () => {
    expect(batchEligibility(sess('a', { machine: STUDIO }), LIVE, known)).toBe(
      'yes'
    );
  });

  it('a live row on this Mac never asks about a machine', () => {
    expect(
      batchEligibility(sess('a'), LIVE, () => {
        throw new Error('a session on this Mac has no machine to ask about');
      })
    ).toBe('yes');
  });

  it('anything the policy would not end is no longer here', () => {
    expect(batchEligibility(sess('a'), gates({ removed: true }), known)).toBe(
      'gone'
    );
  });

  it('an ended row on an unknown machine is ended, because nothing is sent', () => {
    // The order of the table. `ended` is asked before the machine, so a row
    // that already ended reads `Already ended` and not `Unreachable`.
    expect(
      batchEligibility(
        sess('a', { machine: STUDIO }),
        gates({ ended: true }),
        unknownMachine
      )
    ).toBe('ended');
  });

  it('agrees with the policy over every status, on this Mac and on a machine', () => {
    const env = {
      canRestore: true,
      canDiscard: true,
      shellPathReady: true,
      handback: undefined
    };
    const want: Record<SessionStatus, 'yes' | 'ended' | 'unreachable' | 'gone'> = {
      running: 'yes',
      idle: 'yes',
      needs_input: 'yes',
      exited: 'ended',
      restorable: 'ended',
      unknown: 'unreachable',
      discarded: 'gone'
    };
    for (const status of Object.keys(want) as SessionStatus[]) {
      for (const machine of [undefined, STUDIO]) {
        const session = sess('a', {
          status,
          ...(machine !== undefined ? { machine } : {})
        });
        expect(
          batchEligibility(
            session,
            sessionActionGates(session, status, env),
            known
          ),
          `${status} ${machine === undefined ? 'local' : 'remote'}`
        ).toBe(want[status]);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

describe('runBatchEnd', () => {
  it('reads the list once per target, and BEFORE that target is ended', async () => {
    const all = [sess('a'), sess('b'), sess('c')];
    const h = harness({ targetIds: ['a', 'b', 'c'], sessions: () => all });
    const summary = await runBatchEnd(h.deps);
    expect(h.log).toEqual([
      'list',
      'eligibility:a',
      'end:a',
      'list',
      'eligibility:b',
      'end:b',
      'list',
      'eligibility:c',
      'end:c'
    ]);
    expect(summary).toEqual({ ended: 3, skipped: 0, failed: 0, notRun: 0 });
  });

  it('says a row is ending before its call and ended after it', async () => {
    const h = harness({ targetIds: ['a'], sessions: () => [sess('a')] });
    await runBatchEnd(h.deps);
    expect(h.reported.a).toEqual([{ state: 'ending' }, { state: 'ended' }]);
  });

  it('never ends a target that is absent from the fresh list', async () => {
    const h = harness({
      targetIds: ['a', 'gone-id', 'c'],
      sessions: () => [sess('a'), sess('c')]
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes['gone-id']).toEqual({ state: 'skipped', reason: 'gone' });
    expect(h.log).not.toContain('end:gone-id');
    expect(h.log.filter((x) => x.startsWith('end:'))).toEqual(['end:a', 'end:c']);
    expect(summary).toEqual({ ended: 2, skipped: 1, failed: 0, notRun: 0 });
  });

  it('finds the target by ID when two sessions share one name', async () => {
    const all = [
      sess('first', { name: 'twin', status: 'exited' }),
      sess('second', { name: 'twin' })
    ];
    const h = harness({ targetIds: ['second'], sessions: () => all });
    await runBatchEnd(h.deps);
    expect(h.log).toEqual(['list', 'eligibility:second', 'end:second']);
    expect(h.outcomes.second).toEqual({ state: 'ended' });
  });

  it('is not fooled by a session whose NAME is another session’s id', async () => {
    // `impostor` is ended and is NAMED `b`. A lookup by name finds it for the
    // target `b`, reads ended, and skips a session that is running.
    const all = [
      sess('impostor', { name: 'b', tmuxName: 'b', status: 'exited' }),
      sess('b', { name: 'something else' })
    ];
    const h = harness({ targetIds: ['b'], sessions: () => all });
    await runBatchEnd(h.deps);
    expect(h.log).toEqual(['list', 'eligibility:b', 'end:b']);
    expect(h.outcomes.b).toEqual({ state: 'ended' });
  });

  it('is not fooled by a fresh list in another order, or a shorter one', async () => {
    // An index kept from the confirmation would end `c` for the target `a`.
    const h = harness({
      targetIds: ['a', 'b'],
      sessions: () => [sess('c'), sess('b'), sess('a')]
    });
    await runBatchEnd(h.deps);
    expect(h.log.filter((x) => x.startsWith('end:'))).toEqual(['end:a', 'end:b']);
    expect(h.log).not.toContain('end:c');
  });

  it('skips a target that reads unreachable, and does not end it', async () => {
    const h = harness({
      targetIds: ['a'],
      sessions: () => [sess('a', { status: 'unknown' })]
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes.a).toEqual({ state: 'skipped', reason: 'unreachable' });
    expect(h.log).not.toContain('end:a');
    expect(summary.skipped).toBe(1);
  });

  it('skips a target on a machine the machines list does not hold', async () => {
    const h = harness({
      targetIds: ['a', 'b'],
      sessions: () => [sess('a', { machine: STUDIO }), sess('b')],
      machineKnown: () => false
    });
    await runBatchEnd(h.deps);
    expect(h.outcomes.a).toEqual({ state: 'skipped', reason: 'unreachable' });
    expect(h.log).not.toContain('end:a');
    // The session on this Mac is not held up by the one that was skipped.
    expect(h.outcomes.b).toEqual({ state: 'ended' });
  });

  it('records a target that ended by itself as already ended', async () => {
    let world = [sess('a'), sess('b')];
    const h = harness({
      targetIds: ['a', 'b'],
      sessions: () => world,
      end: (id) => {
        // While `a` is being ended, `b` ends by itself.
        if (id === 'a') world = [sess('a'), sess('b', { status: 'exited' })];
        return Promise.resolve({ ok: true });
      }
    });
    await runBatchEnd(h.deps);
    expect(h.outcomes.b).toEqual({ state: 'skipped', reason: 'ended' });
    expect(h.log).not.toContain('end:b');
  });

  it('records a refused End with main’s sentence and runs the NEXT target', async () => {
    const h = harness({
      targetIds: ['a', 'b'],
      sessions: () => [sess('a'), sess('b')],
      end: (id) =>
        Promise.resolve(
          id === 'a'
            ? { ok: false, message: 'Tortie is not connected to Studio.' }
            : { ok: true }
        )
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes.a).toEqual({
      state: 'failed',
      message: 'Tortie is not connected to Studio.'
    });
    expect(h.outcomes.b).toEqual({ state: 'ended' });
    expect(summary).toEqual({ ended: 1, skipped: 0, failed: 1, notRun: 0 });
  });

  it('records an End that REJECTS as failed and runs the next target', async () => {
    const h = harness({
      targetIds: ['a', 'b'],
      sessions: () => [sess('a'), sess('b')],
      end: (id) =>
        id === 'a'
          ? Promise.reject(new Error('the bridge went away'))
          : Promise.resolve({ ok: true })
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes.a).toEqual({
      state: 'failed',
      message: 'the bridge went away'
    });
    expect(h.outcomes.b).toEqual({ state: 'ended' });
    expect(summary.failed).toBe(1);
  });

  it('never throws, whichever dependency does', async () => {
    const h = harness({ targetIds: ['a', 'b'], sessions: () => [sess('a'), sess('b')] });
    const deps: BatchEndDeps = {
      ...h.deps,
      eligibility: (session) => {
        if (session.id === 'a') throw new Error('a gate blew up');
        return h.deps.eligibility(session);
      }
    };
    const summary = await runBatchEnd(deps);
    expect(h.outcomes.a).toEqual({ state: 'failed', message: 'a gate blew up' });
    expect(h.outcomes.b).toEqual({ state: 'ended' });
    expect(summary).toEqual({ ended: 1, skipped: 0, failed: 1, notRun: 0 });
  });

  it('does not end a target whose list could not be read, and goes on', async () => {
    let reads = 0;
    const h = harness({
      targetIds: ['a', 'b'],
      sessions: () => {
        reads += 1;
        return reads === 1 ? null : [sess('a'), sess('b')];
      }
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes.a).toEqual({ state: 'failed', message: BATCH_LIST_FAILED });
    expect(h.log).not.toContain('end:a');
    expect(h.outcomes.b).toEqual({ state: 'ended' });
    expect(summary).toEqual({ ended: 1, skipped: 0, failed: 1, notRun: 0 });
  });

  it('marks the rest not run once stop is requested, and ends nothing more', async () => {
    let stop = false;
    const h = harness({
      targetIds: ['a', 'b', 'c'],
      sessions: () => [sess('a'), sess('b'), sess('c')],
      stopRequested: () => stop,
      end: () => {
        // The stop lands while `a` is in flight. `a` finishes; the rest do not run.
        stop = true;
        return Promise.resolve({ ok: true });
      }
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes.a).toEqual({ state: 'ended' });
    expect(h.outcomes.b).toEqual({ state: 'not-run' });
    expect(h.outcomes.c).toEqual({ state: 'not-run' });
    expect(h.log.filter((x) => x.startsWith('end:'))).toEqual(['end:a']);
    // No read is spent on a target that will not run.
    expect(h.log.filter((x) => x === 'list').length).toBe(1);
    expect(summary).toEqual({ ended: 1, skipped: 0, failed: 0, notRun: 2 });
  });

  it('does not resume when the stop flag flips back mid-run', async () => {
    // A closed sheet reads stop. A sheet reopened with a NEW batch must never
    // wake the old loop. The binding in actions.ts compares run ids; this is
    // the loop's own half of that promise.
    const answers = [false, true, false];
    const h = harness({
      targetIds: ['a', 'b', 'c'],
      sessions: () => [sess('a'), sess('b'), sess('c')],
      stopRequested: () => answers.shift() ?? false
    });
    await runBatchEnd(h.deps);
    expect(h.log.filter((x) => x.startsWith('end:'))).toEqual(['end:a']);
    expect(h.outcomes.c).toEqual({ state: 'not-run' });
  });

  it('reads a stop flag that throws as a stop', async () => {
    const h = harness({
      targetIds: ['a'],
      sessions: () => [sess('a')],
      stopRequested: () => {
        throw new Error('the store is gone');
      }
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.log).toEqual([]);
    expect(summary.notRun).toBe(1);
  });

  it('hands no dependency a name: every id it passes is a target id', async () => {
    const all = [
      sess('a', { name: 'alpha', tmuxName: 'tmux-alpha' }),
      sess('b', { name: 'beta', tmuxName: 'tmux-beta', status: 'exited' }),
      sess('c', { name: 'gamma', tmuxName: 'tmux-gamma' })
    ];
    const h = harness({ targetIds: ['a', 'b', 'c', 'd'], sessions: () => all });
    await runBatchEnd(h.deps);
    expect(h.handed.length).toBeGreaterThan(0);
    const names = new Set(all.flatMap((one) => [one.name, one.tmuxName]));
    for (const value of h.handed) {
      expect(['a', 'b', 'c', 'd']).toContain(value);
      expect(names.has(value as string)).toBe(false);
    }
  });

  it('refuses an empty id without reading or ending anything', async () => {
    // Nothing without a session id is ever a target (SPEC 2.7, 8.2). An empty
    // id cannot occur by type, and the loop is the last place that refuses it,
    // WITHOUT spending a read on it, because no row in any list can answer it.
    const h = harness({
      targetIds: ['', 'a'],
      sessions: () => [sess('a'), sess('', { name: 'no-id' })]
    });
    const summary = await runBatchEnd(h.deps);
    expect(h.outcomes['']).toEqual({ state: 'skipped', reason: 'gone' });
    expect(h.log).toEqual(['list', 'eligibility:a', 'end:a']);
    expect(summary).toEqual({ ended: 1, skipped: 1, failed: 0, notRun: 0 });
  });

  it('ends nothing at all for no targets', async () => {
    const h = harness({ targetIds: [], sessions: () => [sess('a')] });
    expect(await runBatchEnd(h.deps)).toEqual({
      ended: 0,
      skipped: 0,
      failed: 0,
      notRun: 0
    });
    expect(h.log).toEqual([]);
  });

  it('names no lifecycle verb but End, in code or in comments', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(join(__dirname, '..', 'batch-end.ts'), 'utf8');
    expect(source).not.toMatch(/restart|remove|discard|restore/i);
    // Pure over what it is handed: no store, no bridge, no DOM.
    expect(source).not.toMatch(/state\/store|useApp|gmuxBridge|document\./);
  });
});
