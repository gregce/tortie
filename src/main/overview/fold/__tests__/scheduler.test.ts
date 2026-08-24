/**
 * The trigger, the debounce, the caps and the suspension (Phase 138).
 *
 * The three claims this file proves, and each one is the entry's own:
 * - an idle session costs nothing, because no boundary means no fold
 * - ten turns in a minute costs one fold rather than ten
 * - a session whose project is closed is never folded
 *
 * Every clock is fake, so the file runs in milliseconds and never sleeps.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FoldSettings } from '@shared/settings';
import type { ManifestSessionRecord } from '../../../manifest';
import type { NewFoldVersion, StoredTurn } from '../../store';
import {
  FoldScheduler,
  FOLD_MAX_IN_FLIGHT,
  FOLD_MIN_INTERVAL_MS,
  FOLD_SETTLE_MS,
  type FoldInput,
  type FoldSchedulerDeps
} from '../scheduler';
import type { FoldRun } from '../spawn';

const CHOSEN: FoldSettings = {
  agentId: 'claude',
  model: 'claude-haiku-4-5-20251001'
};
const NONE: FoldSettings = { agentId: null, model: null };

const PROJECT = '/work/tortie';

function record(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 's1',
    name: 'claude-1',
    tmuxName: 'claude-1',
    projectPath: PROJECT,
    cwd: PROJECT,
    agent: 'claude',
    status: 'live',
    createdAt: 1,
    argv: ['claude'],
    lastSeen: 1,
    ...over
  } as ManifestSessionRecord;
}

function storedTurn(index: number): StoredTurn {
  return {
    sessionId: 's1',
    index,
    askText: `ask ${index}`,
    askAt: null,
    answerText: `answer ${index}`,
    answerAt: null,
    queued: 1,
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: null,
    durationMs: null,
    paths: [],
    pathSource: 'text-only',
    gitVerdict: null,
    gitCheckedAt: null
  };
}

function goodRun(text = 'You asked and the agent answered.'): FoldRun {
  return {
    outcome: 'ok',
    text,
    reason: null,
    window: null,
    wallMs: 10,
    costUsd: 0.003
  };
}

interface Harness {
  scheduler: FoldScheduler;
  rows: NewFoldVersion[];
  runs: number;
  prepares: number;
}

function harness(over: Partial<FoldSchedulerDeps> = {}, choice = CHOSEN): Harness {
  const rows: NewFoldVersion[] = [];
  const state = { runs: 0, prepares: 0 };
  let turnCounter = 0;
  const deps: FoldSchedulerDeps = {
    choice: () => choice,
    session: () => record(),
    openProjectPaths: () => new Set([PROJECT]),
    prepare: (sessionId: string): Promise<FoldInput | null> => {
      state.prepares += 1;
      turnCounter += 1;
      return Promise.resolve({
        sessionId,
        previousSummary: null,
        previousVersion: null,
        newTurns: [storedTurn(turnCounter)],
        previousInputHash: null,
        providerMapVersion: 1
      });
    },
    run: () => {
      state.runs += 1;
      return Promise.resolve(goodRun());
    },
    append: (row) => {
      rows.push(row);
    },
    ...over
  };
  const scheduler = new FoldScheduler(deps);
  return {
    scheduler,
    rows,
    get runs() {
      return state.runs;
    },
    get prepares() {
      return state.prepares;
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Let the settle timer fire and every promise the fold chains settle. */
async function settle(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await Promise.resolve();
  await Promise.resolve();
}

describe('an idle session costs nothing', () => {
  it('spawns nothing at all when no boundary ever fires', async () => {
    const h = harness();
    await settle(60 * 60_000);
    expect(h.scheduler.counts().spawns).toBe(0);
    expect(h.runs).toBe(0);
    h.scheduler.dispose();
  });
});

describe('the settle timer', () => {
  it('waits before it folds', async () => {
    const h = harness();
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS - 500);
    expect(h.runs).toBe(0);
    await settle(600);
    expect(h.runs).toBe(1);
    h.scheduler.dispose();
  });

  it('folds ONCE for ten boundaries inside a minute', async () => {
    const h = harness();
    for (let i = 0; i < 10; i++) {
      h.scheduler.noteTurnBoundary('s1');
      await settle(1_000);
    }
    await settle(FOLD_SETTLE_MS + 1_000);
    expect(h.runs).toBe(1);
    expect(h.scheduler.counts().boundaries).toBe(10);
    expect(h.scheduler.counts().spawns).toBe(1);
    h.scheduler.dispose();
  });

  it('holds the next fold of a session to one a minute', async () => {
    const h = harness();
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.runs).toBe(1);
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.runs).toBe(1);
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(2);
    h.scheduler.dispose();
  });
});

describe('the cap on folds in flight', () => {
  it('never runs more than the cap at once, and drains the rest', async () => {
    let peak = 0;
    let live = 0;
    const releases: (() => void)[] = [];
    const h = harness({
      session: (id) => record({ id }),
      run: () =>
        new Promise<FoldRun>((resolve) => {
          live += 1;
          peak = Math.max(peak, live);
          releases.push(() => {
            live -= 1;
            resolve(goodRun());
          });
        })
    });
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      h.scheduler.noteTurnBoundary(id);
    }
    await settle(FOLD_SETTLE_MS + 100);
    expect(peak).toBe(FOLD_MAX_IN_FLIGHT);
    while (releases.length > 0) {
      releases.shift()?.();
      await settle(1);
    }
    expect(peak).toBe(FOLD_MAX_IN_FLIGHT);
    expect(h.rows.length).toBe(5);
    h.scheduler.dispose();
  });
});

describe('the skips, taken before anything is scheduled', () => {
  it('drops every boundary when the choice is None', async () => {
    const h = harness({}, NONE);
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
    expect(h.scheduler.counts().skipped).toBe(1);
    h.scheduler.dispose();
  });

  it('drops a session whose project is closed', async () => {
    const h = harness({ openProjectPaths: () => new Set<string>() });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
    h.scheduler.dispose();
  });

  it('drops a shell, because there is no conversation to fold', async () => {
    const h = harness({ session: () => record({ agent: 'shell' }) });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
    h.scheduler.dispose();
  });

  it('drops a remote session, whose record lives on the other machine', async () => {
    const h = harness({
      session: () =>
        record({
          machine: { id: 'm1', host: 'elsewhere' }
        } as unknown as Partial<ManifestSessionRecord>)
    });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
    h.scheduler.dispose();
  });

  it('drops a session the manifest does not have', async () => {
    const h = harness({ session: () => null });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
    h.scheduler.dispose();
  });

  it('drops a choice naming a model no recipe exposes', async () => {
    const h = harness({}, { agentId: 'claude', model: 'not-a-model' });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
    h.scheduler.dispose();
  });

  it('spends nothing when the prompt has not changed', async () => {
    const h = harness({
      prepare: (sessionId) =>
        Promise.resolve({
          sessionId,
          previousSummary: null,
          previousVersion: null,
          newTurns: [storedTurn(1)],
          // The hash the composer will produce for these exact inputs.
          previousInputHash: 'set below',
          providerMapVersion: 1
        })
    });
    // Run once to learn the hash, then feed it back.
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.rows.length).toBe(1);
    const hash = h.rows[0]?.inputHash ?? '';
    const second = harness({
      prepare: (sessionId) =>
        Promise.resolve({
          sessionId,
          previousSummary: null,
          previousVersion: null,
          newTurns: [storedTurn(1)],
          previousInputHash: hash,
          providerMapVersion: 1
        })
    });
    second.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(second.runs).toBe(0);
    expect(second.rows.length).toBe(0);
    h.scheduler.dispose();
    second.scheduler.dispose();
  });

  it('spends nothing when there is no new turn', async () => {
    const h = harness({ prepare: () => Promise.resolve(null) });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.runs).toBe(0);
    expect(h.rows.length).toBe(0);
    h.scheduler.dispose();
  });
});

describe('what is written', () => {
  it('keeps a sentence that passes every refusal', async () => {
    const h = harness();
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.rows[0]?.verdict).toBe('kept');
    expect(h.rows[0]?.text).toBe('You asked and the agent answered.');
    expect(h.rows[0]?.harness).toBe('claude');
    expect(h.rows[0]?.model).toBe('claude-haiku-4-5-20251001');
    h.scheduler.dispose();
  });

  it('records a refusal rather than discarding it', async () => {
    const h = harness({
      run: () => Promise.resolve(goodRun('The agent landed 9c41ab2 for you.'))
    });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.rows[0]?.verdict).toBe('refused');
    expect(h.rows[0]?.reason).toBe('git-mark');
    expect(h.rows[0]?.text).toBeNull();
    h.scheduler.dispose();
  });

  it('records a failure with the reason the run gave', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'timed-out',
          text: null,
          reason: 'timed-out',
          window: null,
          wallMs: 30_000,
          costUsd: null
        })
    });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.rows[0]?.verdict).toBe('failed');
    expect(h.rows[0]?.reason).toBe('timed-out');
    h.scheduler.dispose();
  });
});

describe('the suspension', () => {
  it('suspends when the window says the usage limit was reached', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'rate-limited',
          text: null,
          reason: 'rate-limited',
          window: {
            status: 'rejected',
            limitType: 'seven_day',
            utilization: 0.99,
            resetsAtMs: Date.now() + 3_600_000
          },
          wallMs: 100,
          costUsd: null
        })
    });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.scheduler.suspension()).not.toBeNull();
    // One row was written by the fold that hit the limit. A boundary arriving
    // while the suspension stands writes nothing more.
    expect(h.rows.length).toBe(1);
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS * 2);
    expect(h.rows.length).toBe(1);
    h.scheduler.dispose();
  });

  it('never suspends on an overloaded server, which is not a usage limit', async () => {
    const h = harness({
      session: (id) => record({ id }),
      run: () =>
        Promise.resolve({
          outcome: 'overloaded',
          text: null,
          reason: 'overloaded',
          window: null,
          wallMs: 100,
          costUsd: null
        })
    });
    for (const id of ['a', 'b', 'c', 'd']) {
      h.scheduler.noteTurnBoundary(id);
      await settle(FOLD_SETTLE_MS + 100);
    }
    expect(h.scheduler.suspension()).toBeNull();
    h.scheduler.dispose();
  });

  it('suspends after three failures in a row', async () => {
    const h = harness({
      session: (id) => record({ id }),
      run: () =>
        Promise.resolve({
          outcome: 'bad-output',
          text: null,
          reason: 'exit-1',
          window: null,
          wallMs: 5,
          costUsd: null
        })
    });
    for (const id of ['a', 'b', 'c']) {
      h.scheduler.noteTurnBoundary(id);
      await settle(FOLD_SETTLE_MS + 100);
    }
    expect(h.scheduler.suspension()).not.toBeNull();
    h.scheduler.dispose();
  });

  it('lifts the suspension once the reset time passes', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'rate-limited',
          text: null,
          reason: 'rate-limited',
          window: {
            status: 'rejected',
            limitType: 'five_hour',
            utilization: 0.99,
            resetsAtMs: Date.now() + 60_000
          },
          wallMs: 5,
          costUsd: null
        })
    });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    expect(h.scheduler.suspension()).not.toBeNull();
    await settle(120_000);
    expect(h.scheduler.suspension()).toBeNull();
    h.scheduler.dispose();
  });

  it('a suspension writes no row and draws nothing', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'rate-limited',
          text: null,
          reason: 'rate-limited',
          window: {
            status: 'rejected',
            limitType: 'seven_day',
            utilization: 0.99,
            resetsAtMs: null
          },
          wallMs: 5,
          costUsd: null
        })
    });
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_SETTLE_MS + 100);
    // The failed fold is on record, and nothing else was written.
    expect(h.rows.map((row) => row.verdict)).toEqual(['failed']);
    h.scheduler.dispose();
  });
});

describe('dispose', () => {
  it('cancels every armed settle timer, so nothing runs after teardown', async () => {
    const h = harness();
    h.scheduler.noteTurnBoundary('s1');
    h.scheduler.dispose();
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.runs).toBe(0);
  });

  it('ignores a boundary that arrives after teardown', async () => {
    const h = harness();
    h.scheduler.dispose();
    h.scheduler.noteTurnBoundary('s1');
    await settle(FOLD_MIN_INTERVAL_MS);
    expect(h.scheduler.counts().boundaries).toBe(0);
  });
});

describe('nothing here may set a session status', () => {
  it('noteTurnBoundary answers with nothing at all', () => {
    const h = harness();
    expect(h.scheduler.noteTurnBoundary('s1')).toBeUndefined();
    h.scheduler.dispose();
  });
});
