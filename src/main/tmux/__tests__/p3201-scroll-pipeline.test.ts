/**
 * Phase 320.1, what `scroll.ts` does with a runner that says it is ordered or
 * names a server (build/p3201/SPEC.md D7, D8; research 130 §6 items 7 and 9).
 *
 *  - An ORDERED runner writes a whole sequence before the first answer, which is
 *    about one round trip a notch instead of four over a machine's connection.
 *  - It keeps the serial code's error semantics exactly: the same argvs in the
 *    same order when nothing fails, the same error thrown when something does,
 *    and the same "not in a mode" tolerated where the serial code tolerates it.
 *    Every scenario below is run through BOTH and compared.
 *  - An answer it stops waiting for is never an unhandled rejection.
 *  - The `goto-line` latch is this Mac's: a runner with a `server` never reads
 *    or writes it, and this Mac's runner still latches exactly as it did.
 *  - A runner with a `server` reads with `REMOTE_STATE_FORMAT` (a space between
 *    the fields, Phase 320.1's fix round) and this Mac's with `STATE_FORMAT`,
 *    so the comparisons below read every `-F` value as the one word "READ"
 *    and each runner is answered in its own format.
 *  - Since Phase 342 a runner with a `server` enters copy mode with `-e -H`
 *    and this Mac's with `-e` alone (build/p342/SPEC.md D11), so the
 *    comparisons read copy mode's entry without the `-H` and hold each runner
 *    to its own spelling.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  exitPaneScroll,
  readPaneScroll,
  resetSeekSupportForTests,
  scrollPaneBy,
  scrollPaneTo,
  type PaneScrollState,
  type TmuxScrollRunner
} from '../scroll';

beforeEach(() => resetSeekSupportForTests());
afterEach(() => resetSeekSupportForTests());

/** A `display-message` answer's eight fields. */
function stateLine(inMode: string, position: string, history: string): string[] {
  return [inMode, position, history, '40', '0', '0', '120', ''];
}

/** The fields as this Mac's read answers them. */
const tabbed = (fields: readonly string[]): string => `${fields.join('\t')}\n`;

/** The fields as a machine's read answers them (`REMOTE_STATE_FORMAT`). */
const spaced = (fields: readonly string[]): string => `${fields.join(' ')}\n`;

/**
 * Every argv with its `-F` value read as one word, and copy mode's entry read
 * without the `-H` a runner with a `server` adds (Phase 342, build/p342/SPEC.md
 * D11), so two readers' writes compare. Each runner's own entry is held to its
 * own spelling in the scenarios below, so nothing is lost by the reading.
 */
function shapeOf(calls: readonly (readonly string[])[]): string[][] {
  return calls.map((args) => {
    if (args[0] === 'display-message') return [...args.slice(0, -1), 'READ'];
    if (args[0] === 'copy-mode') return args.filter((arg) => arg !== '-H');
    return [...args];
  });
}

/** Which argv fails, and with what, for one scenario. */
type FailRule = (args: readonly string[]) => Error | null;

interface Recorded {
  run: TmuxScrollRunner;
  calls: string[][];
}

/**
 * A runner that answers reads with `answer` and fails where `fail` says, either
 * serial (this Mac's shape) or ordered with a server (a machine's shape).
 */
function runner(flavour: 'serial' | 'ordered', answer: string[], fail: FailRule): Recorded {
  const calls: string[][] = [];
  const fn = (args: readonly string[]): Promise<string> => {
    calls.push([...args]);
    const err = fail(args);
    if (err !== null) return Promise.reject(err);
    return Promise.resolve(
      args[0] === 'display-message' ? (flavour === 'ordered' ? spaced(answer) : tabbed(answer)) : ''
    );
  };
  const run: TmuxScrollRunner =
    flavour === 'ordered' ? Object.assign(fn, { ordered: true, server: 'machine:rig' }) : fn;
  return { run, calls };
}

type Outcome = { ok: PaneScrollState } | { thrown: string };

async function outcome(op: Promise<PaneScrollState>): Promise<Outcome> {
  try {
    return { ok: await op };
  } catch (err) {
    return { thrown: (err as Error).message };
  }
}

const NOT_IN_A_MODE = (): Error => new Error('not in a mode');
const failWhen =
  (pred: (args: readonly string[]) => boolean, make: () => Error): FailRule =>
  (args) =>
    pred(args) ? make() : null;
const never: FailRule = () => null;

/** The scenarios, each an operation, a server answer and a failure rule. */
const SCENARIOS: {
  name: string;
  answer: string[];
  fail: FailRule;
  op: (run: TmuxScrollRunner) => Promise<PaneScrollState>;
}[] = [
  { name: 'up 7, nothing fails', answer: stateLine('1', '7', '900'), fail: never, op: (r) => scrollPaneBy(r, '$3', 7) },
  { name: 'down 4, nothing fails', answer: stateLine('1', '3', '900'), fail: never, op: (r) => scrollPaneBy(r, '$3', -4) },
  {
    name: 'down 4 on a live pane: the scroll and the cursor answer "not in a mode"',
    answer: stateLine('0', '', '900'),
    fail: failWhen((a) => a[0] === 'send-keys', NOT_IN_A_MODE),
    op: (r) => scrollPaneBy(r, '$3', -4)
  },
  {
    name: 'down 400 leaves copy mode: only the cursor answers "not in a mode"',
    answer: stateLine('0', '', '900'),
    fail: failWhen((a) => a.includes('top-line'), NOT_IN_A_MODE),
    op: (r) => scrollPaneBy(r, '$3', -400)
  },
  {
    name: 'up 7 and copy-mode fails: that error is thrown',
    answer: stateLine('1', '7', '900'),
    fail: failWhen((a) => a[0] === 'copy-mode', () => new Error("can't find pane: $3")),
    op: (r) => scrollPaneBy(r, '$3', 7)
  },
  {
    name: 'up 7 and the scroll fails: that error is thrown',
    answer: stateLine('1', '7', '900'),
    fail: failWhen((a) => a.includes('scroll-up'), () => new Error('scroll refused')),
    op: (r) => scrollPaneBy(r, '$3', 7)
  },
  {
    name: 'up 7 and the cursor fails: tolerated',
    answer: stateLine('1', '7', '900'),
    fail: failWhen((a) => a.includes('top-line'), NOT_IN_A_MODE),
    op: (r) => scrollPaneBy(r, '$3', 7)
  },
  {
    name: 'up 7 and the read fails: that error is thrown',
    answer: stateLine('1', '7', '900'),
    fail: failWhen((a) => a[0] === 'display-message', () => new Error('read refused')),
    op: (r) => scrollPaneBy(r, '$3', 7)
  },
  {
    name: 'every command fails: the FIRST failure is the one thrown',
    answer: stateLine('1', '7', '900'),
    fail: (a) => new Error(`failed ${a[0] ?? ''} ${a[a.length - 1] ?? ''}`),
    op: (r) => scrollPaneBy(r, '$3', 7)
  },
  { name: 'a zero delta only reads', answer: stateLine('0', '', '900'), fail: never, op: (r) => scrollPaneBy(r, '$3', 0) },
  {
    name: 'a relative scroll above one slice reads, then seeks',
    answer: stateLine('1', '100', '90000'),
    fail: never,
    op: (r) => scrollPaneBy(r, '$3', 40_000)
  },
  { name: 'the drag seeks', answer: stateLine('1', '20', '300'), fail: never, op: (r) => scrollPaneTo(r, '$3', 50) },
  { name: 'the drag to 0 cancels', answer: stateLine('0', '', '300'), fail: never, op: (r) => scrollPaneTo(r, '$3', 0) },
  {
    name: 'the drag and the copy-mode fails',
    answer: stateLine('1', '20', '300'),
    fail: failWhen((a) => a[0] === 'copy-mode', () => new Error('gone')),
    op: (r) => scrollPaneTo(r, '$3', 50)
  },
  {
    name: 'the drag re-sends where it is: one read',
    answer: stateLine('1', '50', '300'),
    fail: never,
    op: (r) => scrollPaneTo(r, '$3', 50)
  },
  { name: 'back to live', answer: stateLine('0', '', '300'), fail: never, op: (r) => exitPaneScroll(r, '$3') },
  {
    name: 'back to live on a live pane: the cancel answers "not in a mode"',
    answer: stateLine('0', '', '300'),
    fail: failWhen((a) => a.includes('cancel'), NOT_IN_A_MODE),
    op: (r) => exitPaneScroll(r, '$3')
  },
  {
    name: 'back to live and the read fails',
    answer: stateLine('0', '', '300'),
    fail: failWhen((a) => a[0] === 'display-message', () => new Error('read refused')),
    op: (r) => exitPaneScroll(r, '$3')
  }
];

describe('an ordered runner keeps the serial code\'s answers and errors', () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, async () => {
      resetSeekSupportForTests();
      const serial = runner('serial', scenario.answer, scenario.fail);
      const serialOutcome = await outcome(scenario.op(serial.run));
      resetSeekSupportForTests();
      const ordered = runner('ordered', scenario.answer, scenario.fail);
      const orderedOutcome = await outcome(scenario.op(ordered.run));
      expect(orderedOutcome).toEqual(serialOutcome);
      // Each runner enters copy mode in its own spelling: this Mac's `-e`
      // alone, byte for byte as before, and a machine's `-e -H` (Phase 342 D11).
      for (const call of serial.calls.filter((args) => args[0] === 'copy-mode')) {
        expect(call).toEqual(['copy-mode', '-e', '-t', '$3']);
      }
      for (const call of ordered.calls.filter((args) => args[0] === 'copy-mode')) {
        expect(call).toEqual(['copy-mode', '-e', '-H', '-t', '$3']);
      }
      // What the pipeline writes is exactly what the serial code writes when
      // NOTHING fails, whatever fails here: it writes before it knows. So the
      // serial code's commands, which stop or skip on a failure, are an ordered
      // subsequence of it, and nothing is written that the serial code would
      // not have sent on the same pane had every answer been ordinary (the price
      // of one round trip, research 130 §6 item 7).
      resetSeekSupportForTests();
      const clean = runner('serial', scenario.answer, never);
      await outcome(scenario.op(clean.run));
      expect(shapeOf(ordered.calls)).toEqual(shapeOf(clean.calls));
      let at = 0;
      const serialShape = shapeOf(serial.calls);
      for (const call of shapeOf(ordered.calls)) {
        if (at < serialShape.length && JSON.stringify(call) === JSON.stringify(serialShape[at])) at += 1;
      }
      expect(at).toBe(serialShape.length);
    });
  }
});

describe('an ordered runner writes the whole sequence before the first answer', () => {
  function deferred(): {
    run: TmuxScrollRunner;
    calls: string[][];
    answerAll: (read: string[]) => void;
    fail: (index: number, err: Error) => void;
  } {
    const calls: string[][] = [];
    const settles: { resolve: (v: string) => void; reject: (e: Error) => void }[] = [];
    const fn = (args: readonly string[]): Promise<string> => {
      calls.push([...args]);
      return new Promise<string>((resolve, reject) => {
        settles.push({ resolve, reject });
      });
    };
    return {
      run: Object.assign(fn, { ordered: true, server: 'machine:rig' }),
      calls,
      answerAll: (read) => {
        settles.forEach((one, i) => one.resolve(calls[i]?.[0] === 'display-message' ? spaced(read) : ''));
      },
      fail: (index, err) => settles[index]?.reject(err)
    };
  }

  it('up: copy-mode, scroll, cursor, read, all written with no answer yet', async () => {
    const d = deferred();
    const op = scrollPaneBy(d.run, '$3', 5);
    await Promise.resolve();
    expect(d.calls.map((a) => a[0] === 'send-keys' ? a[a.length - 1] : a[0])).toEqual([
      'copy-mode',
      'scroll-up',
      'top-line',
      'display-message'
    ]);
    d.answerAll(stateLine('1', '5', '900'));
    expect((await op).position).toBe(5);
  });

  it('the drag: copy-mode, seek, cursor, read, after the one read it needs first', async () => {
    const d = deferred();
    const op = scrollPaneTo(d.run, '$3', 50);
    await Promise.resolve();
    expect(d.calls).toHaveLength(1);
    d.answerAll(stateLine('1', '20', '300'));
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(d.calls.slice(1).map((a) => (a[0] === 'send-keys' ? a[4] : a[0]))).toEqual([
      'copy-mode',
      'goto-line',
      'top-line',
      'display-message'
    ]);
    d.answerAll(stateLine('1', '50', '300'));
    expect((await op).position).toBe(50);
  });

  it('a failure early leaves no unhandled rejection from the answers after it', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const d = deferred();
      const op = scrollPaneBy(d.run, '$3', 5).catch((err: unknown) => (err as Error).message);
      await Promise.resolve();
      d.fail(0, new Error('first'));
      expect(await op).toBe('first');
      // The three answers after it now fail too, after the caller has gone.
      d.fail(1, new Error('second'));
      d.fail(2, new Error('third'));
      d.fail(3, new Error('fourth'));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('this Mac\'s runner, which says nothing, still waits for each answer', async () => {
    const calls: string[][] = [];
    let release: () => void = () => undefined;
    const run: TmuxScrollRunner = (args) => {
      calls.push([...args]);
      return new Promise<string>((resolve) => {
        release = () => resolve(args[0] === 'display-message' ? tabbed(stateLine('1', '5', '900')) : '');
      });
    };
    const op = scrollPaneBy(run, '$3', 5);
    await Promise.resolve();
    expect(calls).toHaveLength(1);
    for (let i = 0; i < 4; i += 1) {
      release();
      for (let j = 0; j < 5; j += 1) await Promise.resolve();
    }
    expect((await op).position).toBe(5);
    expect(calls).toHaveLength(4);
  });
});

describe('the goto-line latch is this Mac\'s alone', () => {
  it('a runner with a server that fails goto-line throws and latches nothing', async () => {
    const remote = runner(
      'ordered',
      stateLine('1', '0', '9000'),
      failWhen((a) => a.includes('goto-line'), () => new Error('dropped'))
    );
    const failed = await outcome(scrollPaneTo(remote.run, '$3', 3000));
    expect(failed).toEqual({ thrown: 'dropped' });
    expect(remote.calls.some((a) => a.includes('-N'))).toBe(false);
    // This Mac's next seek still sends goto-line: nothing was latched.
    const local = runner('serial', stateLine('1', '0', '9000'), never);
    await scrollPaneTo(local.run, '$3', 3000);
    expect(local.calls.filter((a) => a.includes('goto-line'))).toHaveLength(1);
    expect(local.calls.some((a) => a.includes('scroll-up'))).toBe(false);
  });

  it('an unordered runner with a server throws too, and never takes the chunked walk', async () => {
    const calls: string[][] = [];
    const fn = (args: readonly string[]): Promise<string> => {
      calls.push([...args]);
      if (args.includes('goto-line')) return Promise.reject(new Error('unknown command'));
      return Promise.resolve(args[0] === 'display-message' ? spaced(stateLine('1', '0', '9000')) : '');
    };
    const run: TmuxScrollRunner = Object.assign(fn, { server: 'machine:rig' });
    expect(await outcome(scrollPaneTo(run, '$3', 5000))).toEqual({ thrown: 'unknown command' });
    expect(calls.some((a) => a.includes('scroll-up'))).toBe(false);
    const local = runner('serial', stateLine('1', '0', '9000'), never);
    await scrollPaneTo(local.run, '$3', 3000);
    expect(local.calls.filter((a) => a.includes('goto-line'))).toHaveLength(1);
  });

  it('an ordered runner that names NO server is this Mac\'s by the rule: its seek waits and may latch', async () => {
    const calls: string[][] = [];
    const fn = (args: readonly string[]): Promise<string> => {
      calls.push([...args]);
      if (args.includes('goto-line')) return Promise.reject(new Error('unknown command'));
      return Promise.resolve(args[0] === 'display-message' ? tabbed(stateLine('1', '0', '9000')) : '');
    };
    const run: TmuxScrollRunner = Object.assign(fn, { ordered: true });
    // No throw: the first failed probe latches and the chunked walk carries it.
    expect('ok' in (await outcome(scrollPaneTo(run, '$3', 3000)))).toBe(true);
    expect(calls.filter((a) => a.includes('scroll-up')).length).toBeGreaterThan(0);
  });

  it('this Mac\'s runner still probes once and latches the chunked fallback, as before', async () => {
    const local = runner(
      'serial',
      stateLine('1', '0', '9000'),
      failWhen((a) => a.includes('goto-line'), () => new Error('unknown command'))
    );
    await scrollPaneTo(local.run, '$3', 3000);
    await scrollPaneTo(local.run, '$3', 6000);
    expect(local.calls.filter((a) => a.includes('goto-line'))).toHaveLength(1);
    expect(local.calls.filter((a) => a.includes('scroll-up')).length).toBeGreaterThan(0);
  });

  it('a read alone is one command on either runner', async () => {
    for (const flavour of ['serial', 'ordered'] as const) {
      const r = runner(flavour, stateLine('0', '', '10'), never);
      await readPaneScroll(r.run, '$3');
      expect(r.calls).toHaveLength(1);
    }
  });
});
