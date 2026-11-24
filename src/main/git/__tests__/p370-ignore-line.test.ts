/**
 * Phase 370, item 5: main's line for `git check-ignore`, over fake jobs. No
 * git and no process. The rows are build/p370/SPEC.md §7.2.
 *
 *   L1  a second call for a key starts only when the first has SETTLED, and
 *       never are two running over 2,000 mixed calls
 *   L2  with one running, of three more only the last runs, and the two before
 *       it reject as superseded at once, while the first still runs
 *   L3  the running job is never ended: it is handed nothing, and it resolves
 *       with its own answer after later calls came
 *   L4  another key is not held; a failed job and a job that throws at once
 *       free the line; an idle key holds nothing
 */

import { describe, expect, it } from 'vitest';
import { createIgnoreLine, type IgnoreLine } from '../ignore-line';

const IDLE = { running: false, waiting: false };

interface Job {
  settle(value: string): void;
  fail(message: string): void;
}

/** Jobs that end when a row says so, counted while they run. */
function harness(): {
  line: IgnoreLine;
  call(key: string, name: string): Promise<string>;
  job(name: string): Job;
  started: string[];
  most(): number;
  handed: number[];
} {
  const line = createIgnoreLine(() => new Error('superseded'));
  const jobs = new Map<string, Job>();
  const started: string[] = [];
  const handed: number[] = [];
  let running = 0;
  let most = 0;
  const body =
    (name: string) =>
    (...args: unknown[]): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        handed.push(args.length);
        started.push(name);
        running += 1;
        most = Math.max(most, running);
        jobs.set(name, {
          settle: (value) => {
            running -= 1;
            resolve(value);
          },
          fail: (message) => {
            running -= 1;
            reject(new Error(message));
          }
        });
      });
  return {
    line,
    call: (key, name) =>
      line.run(key, body(name)).then(
        (value) => `ok:${value}`,
        (err: Error) => `no:${err.message}`
      ),
    job: (name) => {
      const job = jobs.get(name);
      if (job === undefined) throw new Error(`${name} has not started`);
      return job;
    },
    started,
    most: () => most,
    handed
  };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

/** What a promise has come to by now, or null while it is still out. */
async function now(promise: Promise<string>): Promise<string | null> {
  await flush();
  return Promise.race([promise, Promise.resolve(null)]);
}

describe('L1: one at a time for a key', () => {
  it('starts the second call only when the first has settled', async () => {
    const h = harness();
    const a = h.call('/repo', 'a');
    const b = h.call('/repo', 'b');
    await flush();
    expect(h.started).toEqual(['a']);
    expect(h.line.observe('/repo')).toEqual({ running: true, waiting: true });
    expect(await now(b)).toBeNull();

    h.job('a').settle('A');
    await flush();
    expect(h.started).toEqual(['a', 'b']);
    expect(h.line.observe('/repo')).toEqual({ running: true, waiting: false });

    // A call that comes while the second runs waits for the second.
    const c = h.call('/repo', 'c');
    await flush();
    expect(h.started).toEqual(['a', 'b']);
    h.job('b').settle('B');
    await flush();
    expect(h.started).toEqual(['a', 'b', 'c']);
    h.job('c').settle('C');
    expect([await a, await b, await c]).toEqual(['ok:A', 'ok:B', 'ok:C']);
    expect(h.most()).toBe(1);
    expect(h.line.observe('/repo')).toEqual(IDLE);
  });

  it('never has two running over 2,000 mixed calls', async () => {
    const line = createIgnoreLine(() => new Error('superseded'));
    let running = 0;
    let most = 0;
    let began = 0;
    let answered = 0;
    let failed = 0;
    let superseded = 0;
    let seed = 12_345;
    const rand = (): number => {
      seed = (seed * 1_103_515_245 + 12_345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pending: Promise<void>[] = [];
    for (let i = 0; i < 2_000; i += 1) {
      pending.push(
        line
          .run('/repo', async () => {
            began += 1;
            running += 1;
            most = Math.max(most, running);
            const hops = Math.floor(rand() * 4);
            for (let k = 0; k < hops; k += 1) await Promise.resolve();
            running -= 1;
            if (rand() < 0.2) throw new Error('failed');
            return 'x';
          })
          .then(
            () => {
              answered += 1;
            },
            (err: Error) => {
              if (err.message === 'superseded') superseded += 1;
              else failed += 1;
            }
          )
      );
      if (rand() < 0.5) await Promise.resolve();
    }
    await Promise.all(pending);
    expect(most).toBe(1);
    // Every call came to one end, and every end was met.
    expect(answered + failed).toBe(began);
    expect(answered + failed + superseded).toBe(2_000);
    expect(Math.min(answered, failed, superseded)).toBeGreaterThan(0);
    expect(line.observe('/repo')).toEqual(IDLE);
  });
});

describe('L2: at most one waits, and it is the newest', () => {
  it('rejects the two before the last at once, and runs only the last', async () => {
    const h = harness();
    const a = h.call('/repo', 'a');
    const b = h.call('/repo', 'b');
    const c = h.call('/repo', 'c');
    const d = h.call('/repo', 'd');
    // While the first still runs.
    expect(await now(b)).toBe('no:superseded');
    expect(await now(c)).toBe('no:superseded');
    expect(await now(d)).toBeNull();
    expect(h.started).toEqual(['a']);

    h.job('a').settle('A');
    await flush();
    expect(h.started).toEqual(['a', 'd']);
    h.job('d').settle('D');
    expect([await a, await d]).toEqual(['ok:A', 'ok:D']);
    await flush();
    expect(h.started).toEqual(['a', 'd']);
    expect(h.line.observe('/repo')).toEqual(IDLE);
  });
});

describe('L3: the running job is never ended for a newer call', () => {
  it('is handed nothing, and answers after later calls came', async () => {
    const h = harness();
    const a = h.call('/repo', 'a');
    for (let i = 0; i < 50; i += 1) void h.call('/repo', `later-${String(i)}`);
    expect(await now(a)).toBeNull();
    h.job('a').settle('A');
    expect(await a).toBe('ok:A');
    await flush();
    expect(h.started).toEqual(['a', 'later-49']);
    h.job('later-49').settle('last');
    await flush();
    // No signal, no controller, nothing a job could be ended by.
    expect(h.handed).toEqual([0, 0]);
  });
});

describe('L4: what the line never holds', () => {
  it('does not hold another repository', async () => {
    const h = harness();
    const a = h.call('/a', 'a1');
    const b = h.call('/b', 'b1');
    await flush();
    expect(h.started).toEqual(['a1', 'b1']);
    h.job('b1').settle('B');
    expect(await b).toBe('ok:B');
    expect(h.line.observe('/a')).toEqual({ running: true, waiting: false });
    expect(h.line.observe('/b')).toEqual(IDLE);
    h.job('a1').settle('A');
    expect(await a).toBe('ok:A');
  });

  it('is freed by a job that failed, and the call behind it runs', async () => {
    const h = harness();
    const a = h.call('/repo', 'a');
    const b = h.call('/repo', 'b');
    h.job('a').fail('git failed');
    expect(await a).toBe('no:git failed');
    await flush();
    expect(h.started).toEqual(['a', 'b']);
    h.job('b').fail('git failed again');
    expect(await b).toBe('no:git failed again');
    expect(h.line.observe('/repo')).toEqual(IDLE);
  });

  it('is freed by a job that throws at once, running or waiting', async () => {
    const h = harness();
    const thrown = h.line.run('/repo', () => {
      throw new Error('spawn threw');
    });
    await expect(thrown).rejects.toThrow('spawn threw');
    expect(h.line.observe('/repo')).toEqual(IDLE);

    const a = h.call('/repo', 'a');
    const behind = h.line.run('/repo', () => {
      throw new Error('spawn threw behind');
    });
    h.job('a').settle('A');
    await expect(behind).rejects.toThrow('spawn threw behind');
    expect(await a).toBe('ok:A');
    expect(h.line.observe('/repo')).toEqual(IDLE);
  });

  it('holds nothing for a key that has settled, and runs the next at once', async () => {
    const h = harness();
    expect(h.line.observe('/repo')).toEqual(IDLE);
    const a = h.call('/repo', 'a');
    h.job('a').settle('A');
    await a;
    expect(h.line.observe('/repo')).toEqual(IDLE);
    const b = h.call('/repo', 'b');
    expect(h.started).toEqual(['a', 'b']);
    h.job('b').settle('B');
    expect(await b).toBe('ok:B');
  });
});
