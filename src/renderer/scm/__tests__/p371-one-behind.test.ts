/**
 * Phase 371. One call in flight per key and one behind it: the rule the reads
 * a repository change causes run on (build/p371/SPEC.md D9, §4.4).
 */

import { describe, expect, it } from 'vitest';
import { oneBehind } from '../one-behind';

interface Held {
  key: string;
  end(): void;
  fail(err: Error): void;
}

/** A `run` whose every call is held until the test ends it. */
function held() {
  const calls: Held[] = [];
  const out = new Map<string, number>();
  let most = 0;
  const run = (key: string): Promise<void> => {
    const n = (out.get(key) ?? 0) + 1;
    out.set(key, n);
    most = Math.max(most, n);
    const over = (): void => void out.set(key, (out.get(key) ?? 1) - 1);
    return new Promise<void>((resolve, reject) => {
      calls.push({
        key,
        end: () => (over(), resolve()),
        fail: (err) => (over(), reject(err))
      });
    });
  };
  return { calls, run, most: () => most };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
};

describe('oneBehind', () => {
  it('L1 starts at once, holds one in flight and one behind for any number of calls', async () => {
    const h = held();
    const line = oneBehind(h.run);
    void line('a');
    // The same step: a quiet line is never a tick later than a direct call.
    expect(h.calls).toHaveLength(1);
    for (let i = 0; i < 40; i++) void line('a');
    await flush();
    expect(h.calls).toHaveLength(1);

    h.calls[0]!.end();
    await flush();
    expect(h.calls).toHaveLength(2);
    h.calls[1]!.end();
    await flush();
    expect(h.calls).toHaveLength(2);
    expect(h.most()).toBe(1);

    // The line closed: the next call starts at once.
    void line('a');
    expect(h.calls).toHaveLength(3);
    h.calls[2]!.end();
    await flush();
  });

  it('L2 never loses a call made as the last one ends', async () => {
    // Every microtask after the answer, one offset per round, so whichever one
    // reads "nothing behind" and whichever one closes the line is covered.
    for (let offset = 0; offset < 12; offset++) {
      const h = held();
      const line = oneBehind(h.run);
      void line('a');
      let asked = false;
      h.calls[0]!.end();
      for (let i = 0; i < offset; i++) await Promise.resolve();
      void line('a').then(() => {
        asked = true;
      });
      await flush();
      expect(h.calls, `offset ${offset}`).toHaveLength(2);
      h.calls[1]!.end();
      await flush();
      expect(asked, `offset ${offset}`).toBe(true);
    }
  });

  it('L2 a call made from inside the run that is ending is the one behind', async () => {
    let runs = 0;
    const line = oneBehind(async (key) => {
      runs += 1;
      if (runs === 1) {
        await Promise.resolve();
        void line(key);
      }
    });
    await line('a');
    await flush();
    expect(runs).toBe(2);
  });

  it('L3 a throwing run clears the line, and the call behind it still runs', async () => {
    const h = held();
    const line = oneBehind(h.run);
    const first = line('a');
    const second = line('a');
    h.calls[0]!.fail(new Error('git said no'));
    await expect(first).rejects.toThrow('git said no');
    await flush();
    expect(h.calls).toHaveLength(2);
    h.calls[1]!.end();
    await expect(second).resolves.toBeUndefined();

    const third = line('a');
    expect(h.calls).toHaveLength(3);
    h.calls[2]!.fail(new Error('again'));
    await expect(third).rejects.toThrow('again');
    await flush();
    void line('a');
    expect(h.calls).toHaveLength(4);
    h.calls[3]!.end();

    // A run that throws before it returns a promise is the same failure.
    let thrown = 0;
    const sync = oneBehind(() => {
      thrown += 1;
      throw new Error('not even a promise');
    });
    await expect(sync('a')).rejects.toThrow('not even a promise');
    await expect(sync('a')).rejects.toThrow('not even a promise');
    expect(thrown).toBe(2);
  });

  it('L6 two keys are two lines', async () => {
    const h = held();
    const line = oneBehind(h.run);
    void line('a');
    void line('b');
    void line('b');
    expect(h.calls.map((c) => c.key)).toEqual(['a', 'b']);
    h.calls[1]!.end();
    await flush();
    expect(h.calls.map((c) => c.key)).toEqual(['a', 'b', 'b']);
    h.calls[0]!.end();
    h.calls[2]!.end();
    await flush();
    expect(h.calls).toHaveLength(3);
  });

  it('L7 each caller waits for the last call it needs', async () => {
    const h = held();
    const line = oneBehind(h.run);
    const done: string[] = [];
    void line('a').then(() => done.push('first'));
    void line('a').then(() => done.push('second'));
    void line('a').then(() => done.push('third'));
    h.calls[0]!.end();
    await flush();
    // The first caller's read is over. The two that came while it ran need the
    // read after it, whose answer they have not had.
    expect(done).toEqual(['first']);
    void line('a').then(() => done.push('fourth'));
    h.calls[1]!.end();
    await flush();
    expect(done).toEqual(['first', 'second', 'third']);
    h.calls[2]!.end();
    await flush();
    expect(done).toEqual(['first', 'second', 'third', 'fourth']);
    expect(h.calls).toHaveLength(3);
  });
});
