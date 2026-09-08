/**
 * The bounded retry of the launch sign-in (Phase 232, items 3 and 5).
 *
 * NOTHING HERE OPENS A CONNECTION. `prepareMachine` is replaced by a function
 * that records what it was handed and answers what the test says; the store,
 * the confirm gate and the control plane are replaced by fakes whose listeners
 * the test can fire. That is the point: every property below is about WHEN the
 * retry asks and when it refuses to, and a test that reached a machine to find
 * out would be the defect it is testing for.
 *
 * The three refusals the charter names, each of which goes red when its clause
 * is taken out of `../sign-in-retry.ts`:
 *
 *  1. A FILE CHANGING IS NOT A TRIGGER. Every listener the store and the
 *     confirm gate hand out is fired, and the attempt count does not move;
 *     the module holds no such listener at all. Ablation: subscribe to
 *     `onMachinesChanged` and attempt on it.
 *  2. A ROW WHOSE CONFIRMATION MOVED IS SKIPPED, and the retry stops. Ablation:
 *     take out the `isMachineConfirmed` ask.
 *  3. THE BACKOFF STOPS AT THE CAP. 30, 60, 120, 240, 300 and then 300 again.
 *     Ablation: take out the `Math.min`.
 *
 * And the rest of the shape: the link answering is a trigger, prepared stops
 * it, a remove stops it, shutdown stops every one and refuses a new arm, an
 * attempt in flight at shutdown schedules nothing, the disposer's line is
 * synchronous and before its first await, and the module never imports the
 * two names a file moves.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineRowV1 } from '@shared/machines';
import type { MachinePrepareResult } from '@shared/ipc';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// The fakes
// ---------------------------------------------------------------------------

const ROW: MachineRowV1 = {
  id: 'studio',
  label: 'Studio',
  host: 'studio.tail1a2b.ts.net',
  user: null,
  port: null,
  color: 'orange',
  remoteTmuxPath: '/usr/bin/tmux'
} as unknown as MachineRowV1;

let rows: Map<string, MachineRowV1>;
let confirmed: Set<string>;
let confirmAsks: string[];
let link: Map<string, string>;
let linkListeners: (() => void)[];
let rowListeners: (() => void)[];
let confirmListeners: (() => void)[];
let prepareCalls: { machineId: string; label: string | null | undefined }[];
let prepareAnswers: (MachinePrepareResult | Error)[];
let prepareHold: (() => void) | null;
let lines: string[];

function result(cls: MachinePrepareResult['class']): MachinePrepareResult {
  return {
    id: 'studio',
    class: cls,
    alarm: false,
    headline: 'h',
    detail: `answered ${cls}`,
    version: null,
    supported: [],
    serverBorn: false,
    options: [],
    pathCaptured: false,
    acceptSheet: null,
    durationMs: 1
  } as unknown as MachinePrepareResult;
}

vi.mock('../../log', () => ({
  getLog: () => ({
    info: (line: string) => lines.push(`info ${line}`),
    warn: (line: string) => lines.push(`warn ${line}`),
    error: (line: string) => lines.push(`error ${line}`),
    debug: () => undefined
  })
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => rows.get(id) ?? null,
  machineFieldsOf: (row: MachineRowV1) => ({ host: row.host }),
  machineLabelOf: (row: MachineRowV1) => row.label ?? row.host,
  machineHostKeysPath: () => '/t/known-machines',
  onMachinesChanged: (cb: () => void) => {
    rowListeners.push(cb);
    return () => undefined;
  }
}));

vi.mock('../confirm', () => ({
  isMachineConfirmed: (id: string) => {
    confirmAsks.push(id);
    return confirmed.has(id);
  },
  onMachineConfirmationsChanged: (cb: () => void) => {
    confirmListeners.push(cb);
    return () => undefined;
  }
}));

vi.mock('../control-plane', () => ({
  machineLinkFacts: (id: string) => ({
    machineId: id,
    link: link.get(id) ?? 'quiet',
    everAnswered: false,
    lastAnsweredAt: null,
    reason: null
  }),
  onMachineLinkChanged: (cb: () => void) => {
    linkListeners.push(cb);
    return () => {
      linkListeners = linkListeners.filter((one) => one !== cb);
    };
  }
}));

vi.mock('../prepare', () => ({
  prepareMachine: (input: { machineId: string; label?: string | null }) => {
    prepareCalls.push({ machineId: input.machineId, label: input.label });
    const answer = prepareAnswers.shift() ?? result('unreachable');
    return new Promise<MachinePrepareResult>((resolve, reject) => {
      const settle = (): void => {
        if (answer instanceof Error) reject(answer);
        else resolve(answer);
      };
      if (prepareHold === null) settle();
      else {
        const held = prepareHold;
        prepareHold = () => {
          held();
          settle();
        };
      }
    });
  }
}));

const retry = await import('../sign-in-retry');

function fireLink(): void {
  for (const one of [...linkListeners]) one();
}

/** Advance the fake clock and let the attempt's microtasks settle. */
async function pass(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  rows = new Map([['studio', ROW]]);
  confirmed = new Set(['studio']);
  confirmAsks = [];
  link = new Map([['studio', 'quiet']]);
  linkListeners = [];
  rowListeners = [];
  confirmListeners = [];
  prepareCalls = [];
  prepareAnswers = [];
  prepareHold = null;
  lines = [];
  retry.resetSignInRetryForTests();
});

afterEach(() => {
  retry.resetSignInRetryForTests();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

describe('the backoff', () => {
  it('starts at 30 s, doubles, and stops growing at five minutes', async () => {
    retry.armSignInRetry('studio');
    expect(retry.signInRetryFacts('studio')?.delayMs).toBe(30_000);
    expect(prepareCalls).toHaveLength(0);
    await pass(29_999);
    expect(prepareCalls).toHaveLength(0);
    await pass(1);
    expect(prepareCalls).toHaveLength(1);
    const delays: number[] = [retry.signInRetryFacts('studio')!.delayMs];
    for (const expected of [60_000, 120_000, 240_000, 300_000, 300_000, 300_000]) {
      expect(retry.signInRetryFacts('studio')?.delayMs).toBe(expected);
      await pass(expected - 1);
      const before = prepareCalls.length;
      await pass(1);
      expect(prepareCalls).toHaveLength(before + 1);
      delays.push(retry.signInRetryFacts('studio')!.delayMs);
    }
    // The delay after the sixth attempt is still the cap, and the seventh
    // attempt happened, so the retry did not stop at the cap; its delay did.
    expect(delays).toEqual([
      60_000, 120_000, 240_000, 300_000, 300_000, 300_000, 300_000
    ]);
    expect(delays.every((one) => one <= retry.SIGN_IN_RETRY_CAP_MS)).toBe(true);
    expect(prepareCalls).toHaveLength(7);
  });

  it('logs every attempt with its number, its trigger and the delay it waited, and the next delay', async () => {
    retry.armSignInRetry('studio');
    await pass(30_000);
    await pass(60_000);
    expect(lines).toContain(
      'info studio did not prepare at launch; sign-in retry 1 in 30 s'
    );
    expect(lines).toContain('info studio sign-in retry 1 (time, after 30 s)');
    expect(lines).toContain(
      'warn studio answered unreachable: answered unreachable; sign-in retry 2 in 60 s'
    );
    expect(lines).toContain('info studio sign-in retry 2 (time, after 60 s)');
    expect(lines).toContain(
      'warn studio answered unreachable: answered unreachable; sign-in retry 3 in 120 s'
    );
  });

  it('hands prepareMachine the same four inputs the launch sign-in does', async () => {
    retry.armSignInRetry('studio');
    await pass(30_000);
    expect(prepareCalls).toEqual([{ machineId: 'studio', label: 'Studio' }]);
  });

  it('arms one retry per machine, whatever the launch sign-in calls it twice', async () => {
    retry.armSignInRetry('studio');
    retry.armSignInRetry('studio');
    await pass(30_000);
    expect(prepareCalls).toHaveLength(1);
  });

  it('carries on after an attempt that throws', async () => {
    prepareAnswers.push(new Error('the transport died'));
    retry.armSignInRetry('studio');
    await pass(30_000);
    expect(retry.signInRetryFacts('studio')?.delayMs).toBe(60_000);
    expect(lines).toContain(
      'warn studio failed: the transport died; sign-in retry 2 in 60 s'
    );
    await pass(60_000);
    expect(prepareCalls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Reachable
// ---------------------------------------------------------------------------

describe('the link answering', () => {
  it('is an attempt now rather than at the next tick', async () => {
    retry.armSignInRetry('studio');
    await pass(10_000);
    link.set('studio', 'polling');
    fireLink();
    await pass(0);
    expect(prepareCalls).toHaveLength(1);
    expect(lines).toContain(
      'info studio sign-in retry 1 (reachable, after 30 s)'
    );
    // The timer that was pending at 30 s was cancelled by that attempt; the
    // next one is on the new delay.
    await pass(20_000);
    expect(prepareCalls).toHaveLength(1);
    expect(retry.signInRetryFacts('studio')?.delayMs).toBe(60_000);
  });

  it('is not an attempt while the link is still quiet, and not twice for one crossing', async () => {
    retry.armSignInRetry('studio');
    fireLink();
    fireLink();
    await pass(0);
    expect(prepareCalls).toHaveLength(0);
    link.set('studio', 'connected');
    fireLink();
    fireLink();
    await pass(0);
    expect(prepareCalls).toHaveLength(1);
  });

  it('ignores the link of a machine with no retry armed', async () => {
    retry.armSignInRetry('studio');
    link.set('loft', 'connected');
    fireLink();
    await pass(0);
    expect(prepareCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// The three refusals
// ---------------------------------------------------------------------------

describe('refusal: a file changing is never a trigger', () => {
  it('holds no listener on the rows or the confirmations, and an edit fires nothing', async () => {
    retry.armSignInRetry('studio');
    // The module subscribed to the link and to nothing a file moves.
    expect(rowListeners).toHaveLength(0);
    expect(confirmListeners).toHaveLength(0);
    // Even a listener some other module holds, fired now, moves nothing here.
    for (const one of rowListeners) one();
    for (const one of confirmListeners) one();
    await pass(29_000);
    expect(prepareCalls).toHaveLength(0);
    // Time is what fires it.
    await pass(1_000);
    expect(prepareCalls).toHaveLength(1);
  });

  it('never imports the two names a file moves', () => {
    const src = readFileSync(join(HERE, '..', 'sign-in-retry.ts'), 'utf8');
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(code).not.toContain('onMachinesChanged');
    expect(code).not.toContain('onMachineConfirmationsChanged');
    expect(code).not.toContain('onMachineStateChanged');
    expect(code).toContain('onMachineLinkChanged');
  });
});

describe('refusal: a row whose confirmation does not hold is skipped', () => {
  it('asks the gate immediately before each attempt and never caches it', async () => {
    retry.armSignInRetry('studio');
    expect(confirmAsks).toHaveLength(0);
    await pass(30_000);
    expect(confirmAsks).toEqual(['studio']);
    await pass(60_000);
    expect(confirmAsks).toEqual(['studio', 'studio']);
    expect(prepareCalls).toHaveLength(2);
  });

  it('stops rather than asks when the confirmation moved while it was armed', async () => {
    retry.armSignInRetry('studio');
    await pass(30_000);
    expect(prepareCalls).toHaveLength(1);
    // An execution bearing field was rewritten on disk; the record no longer
    // matches the row.
    confirmed.delete('studio');
    await pass(60_000);
    expect(prepareCalls).toHaveLength(1);
    expect(retry.signInRetryFacts('studio')).toBeNull();
    expect(lines).toContain(
      'info studio sign-in retry stopped after 1 attempt(s): confirmation-moved'
    );
    // And nothing later, however long the clock runs.
    await pass(60 * 60_000);
    expect(prepareCalls).toHaveLength(1);
  });

  it('stops when the row is gone from the file', async () => {
    retry.armSignInRetry('studio');
    rows.delete('studio');
    await pass(30_000);
    expect(prepareCalls).toHaveLength(0);
    expect(retry.signInRetryFacts('studio')).toBeNull();
    expect(lines).toContain(
      'info studio sign-in retry stopped after 0 attempt(s): row-gone'
    );
  });
});

describe('refusal: the backoff is capped', () => {
  it('never arms a delay over five minutes', async () => {
    retry.armSignInRetry('studio');
    for (let i = 0; i < 12; i += 1) {
      const delay = retry.signInRetryFacts('studio')!.delayMs;
      expect(delay).toBeLessThanOrEqual(retry.SIGN_IN_RETRY_CAP_MS);
      await pass(delay);
    }
    expect(retry.signInRetryFacts('studio')?.delayMs).toBe(
      retry.SIGN_IN_RETRY_CAP_MS
    );
    expect(prepareCalls).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// The stops
// ---------------------------------------------------------------------------

describe('what stops it', () => {
  it('prepared, by its own attempt', async () => {
    prepareAnswers.push(result('unreachable'), result('prepared'));
    retry.armSignInRetry('studio');
    await pass(30_000);
    await pass(60_000);
    expect(prepareCalls).toHaveLength(2);
    expect(retry.signInRetryFacts('studio')).toBeNull();
    expect(lines).toContain('info studio prepared on sign-in retry 2');
    await pass(60 * 60_000);
    expect(prepareCalls).toHaveLength(2);
  });

  it('prepared, by a press in Settings', async () => {
    retry.armSignInRetry('studio');
    retry.stopSignInRetry('studio', 'prepared');
    await pass(60 * 60_000);
    expect(prepareCalls).toHaveLength(0);
    expect(retry.armedSignInRetries()).toEqual([]);
  });

  it('removed', async () => {
    retry.armSignInRetry('studio');
    retry.stopSignInRetry('studio', 'removed');
    await pass(60 * 60_000);
    expect(prepareCalls).toHaveLength(0);
  });

  it('shutdown stops every retry, releases the link and refuses a new arm', async () => {
    rows.set('loft', { ...ROW, id: 'loft', label: 'Loft' });
    confirmed.add('loft');
    retry.armSignInRetry('studio');
    retry.armSignInRetry('loft');
    expect(linkListeners).toHaveLength(1);
    retry.stopSignInRetries();
    expect(retry.armedSignInRetries()).toEqual([]);
    expect(linkListeners).toHaveLength(0);
    retry.armSignInRetry('studio');
    expect(retry.armedSignInRetries()).toEqual([]);
    await pass(60 * 60_000);
    expect(prepareCalls).toHaveLength(0);
  });

  it('an attempt in flight at shutdown schedules nothing after its answer', async () => {
    let release: () => void = () => undefined;
    prepareHold = () => undefined;
    retry.armSignInRetry('studio');
    await pass(30_000);
    expect(prepareCalls).toHaveLength(1);
    expect(retry.signInRetryFacts('studio')?.inFlight).toBe(true);
    release = prepareHold;
    retry.stopSignInRetries();
    release();
    await pass(0);
    await pass(60 * 60_000);
    expect(prepareCalls).toHaveLength(1);
    expect(retry.armedSignInRetries()).toEqual([]);
  });

  it('is stopped by the ordered disposer, synchronously and before its first await', () => {
    const src = readFileSync(join(HERE, '..', '..', 'capabilities.ts'), 'utf8');
    const start = src.indexOf('export async function disposeMainCapabilities(');
    expect(start).toBeGreaterThan(-1);
    const body = src
      .slice(start, src.indexOf('\n}', start))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const stop = body.indexOf('stopSignInRetries();');
    const firstAwait = body.indexOf('await ');
    expect(stop).toBeGreaterThan(-1);
    expect(firstAwait).toBeGreaterThan(-1);
    expect(stop).toBeLessThan(firstAwait);
  });

  it('is armed by the launch sign-in at both of its quiet marks, and by nothing else', () => {
    const core = readFileSync(
      join(HERE, '..', '..', 'sessions', 'core.ts'),
      'utf8'
    );
    const start = core.indexOf('private async signInToConfirmedMachines()');
    const body = core.slice(start, core.indexOf('\n  }', start));
    expect(body.split('armSignInRetry(row.id);').length - 1).toBe(2);
    expect(core.split('armSignInRetry(').length - 1).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The reasoning, which the charter says must be stated
// ---------------------------------------------------------------------------

describe('the header states why this is not refusal 8', () => {
  it('in the charter\'s words', () => {
    const src = readFileSync(join(HERE, '..', 'sign-in-retry.ts'), 'utf8');
    expect(src).toContain(
      '`prepareMachine` can boot a tmux server on that machine, so a retry does\n * start a process.'
    );
    expect(src).toContain(
      'Phase 23 refusal 8 forbids a process starting on a\n * configuration change alone.'
    );
    expect(src).toContain(
      'A retry of a launch sign-in is NOT a\n * configuration change: it is the same act the person authorised when they\n * confirmed the machine, which the launch already performs unprompted'
    );
  });
});
