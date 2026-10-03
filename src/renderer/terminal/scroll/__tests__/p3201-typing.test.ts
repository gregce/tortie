/**
 * Phase 320.1 — typing while a pane scrolls, on this Mac.
 *
 * THIS MAC'S TYPING HALF ONLY, since the second build (build/p3201/SPEC.md
 * D5). The model pane below answers the way a pane on this Mac does, with no
 * `keysOrderedInMain`, so every clause here runs. A pane on another machine
 * answers with it, and its surface holds, fences and drains nothing:
 * ./p3201-remote-surface.test.ts pins that. The in-app measure kept these
 * clauses: 0 of 440 characters lost through a flick against 15 of 440 at the
 * parent.
 *
 * THE FAULTS THIS FILE PINS, with where each was measured.
 *
 *   P1. The parent decided where a keystroke goes from the LAST answer, while
 *       a notch's `copy-mode` lands half a round trip after it is sent, so a
 *       key typed in that window went into copy mode and was eaten
 *       (docs/research/130-remote-scrollback.md section 6 item 3: 2 to 4 of 11
 *       characters at a 50 ms round trip).
 *   P2. Phase 320's attempt dropped the travel not yet sent when a key was
 *       typed, which moved the re-entering scroll to the worst moment: 114 of
 *       770 characters lost against 24 of 550 at its parent (b28d0eb4). Its
 *       swallow before that ate a swipe begun right after a key, 0 of 30 lines
 *       in 10 of 10 (arm G). The rebuilt P2 is a 32 ms fence that only delays.
 *   P3. The parent stranded held keys when the call that returns the pane to
 *       live threw, and dropped keys held when the session was left; Phase
 *       320's attempt dropped even the ones the parent delivered (X, 0 of 10
 *       against 10 of 10) and cost a third answer in clock, tree and options
 *       mode. The rebuilt P3 retries a thrown call and makes one final call at
 *       dispose.
 *
 * THE FAKE IS A PANE, NOT A LIST OF ANSWERS. Each call lands on a small model
 * of a tmux pane a fixed time after it is made and answers from it a fixed
 * time after that, and a keystroke lands on it on a path of its own. A key
 * that lands while the model is in copy mode is EATEN, which is the loss the
 * probes read with a recorder. A kind can be held, so a test decides exactly
 * when a call is answered and what with.
 *
 * Each clause has a case that goes red when its method in ../surface.ts is
 * broken alone, which build/p3201/SPEC.md section 6.2 runs as an ablation.
 * WHAT THIS FILE IS NOT: the app run. `probe:p320`'s T1 to T5 and
 * `probe:p320:rig` are.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import type { TerminalScrollState } from '@shared/ipc';

type Kind = 'state' | 'by' | 'to' | 'live';

/** An answer a held call can be given instead of the model's own. */
type Override = 'throw' | 'unreachable';

interface HeldCall {
  kind: Kind;
  arg: number;
}

/**
 * A pane with 500 lines of history. `latency` is each way on the scroll
 * channel; `keyLatency` is the attach's own path, which is independent of it.
 */
class Pane {
  position = 0;
  inMode = false;
  history = 500;
  /** What reached the program, in order. */
  received = '';
  /** What landed while the pane was in copy mode. */
  eaten = '';
  /** Every call, in the order and at the fake time it was made. */
  readonly calls: { kind: Kind; arg: number; at: number }[] = [];
  /** Every string handed to `term.sendInput`, in order. */
  readonly typed: string[] = [];
  /** What happened, in order: `by:3`, `live`, `type:x`. */
  readonly log: string[] = [];
  latency = 0;
  keyLatency = 0;
  readonly held = new Set<Kind>();
  private readonly waiting: {
    call: HeldCall;
    resolve: (s: TerminalScrollState) => void;
    reject: (e: Error) => void;
  }[] = [];

  answer(): TerminalScrollState {
    return {
      hasPane: true,
      position: this.position,
      history: this.history,
      rows: 40,
      cols: 120,
      frameHistory: null,
      inMode: this.inMode,
      innerAlt: false,
      innerMouse: false
    };
  }

  /** What a command does to the pane when it lands there. */
  land(call: HeldCall): void {
    if (call.kind === 'by') {
      if (call.arg > 0) {
        this.inMode = true;
        this.position = Math.min(this.history, this.position + call.arg);
      } else if (this.inMode) {
        this.position = Math.max(0, this.position + call.arg);
        if (this.position === 0) this.inMode = false;
      }
    } else if (call.kind === 'to') {
      if (call.arg === 0) {
        this.inMode = false;
        this.position = 0;
      } else {
        this.inMode = true;
        this.position = Math.min(this.history, call.arg);
      }
    } else if (call.kind === 'live') {
      this.inMode = false;
      this.position = 0;
    }
  }

  call(kind: Kind, arg: number): Promise<TerminalScrollState> {
    this.calls.push({ kind, arg, at: performance.now() });
    this.log.push(kind === 'by' || kind === 'to' ? `${kind}:${arg}` : kind);
    const call = { kind, arg };
    if (this.held.has(kind)) {
      return new Promise((resolve, reject) => {
        this.waiting.push({ call, resolve, reject });
      });
    }
    if (this.latency === 0) {
      this.land(call);
      return Promise.resolve(this.answer());
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        this.land(call);
        const answer = this.answer();
        setTimeout(() => resolve(answer), this.latency);
      }, this.latency);
    });
  }

  /** The oldest held call of this kind, taken off the list. */
  private take(kind: Kind): (typeof this.waiting)[number] {
    const at = this.waiting.findIndex((w) => w.call.kind === kind);
    const w = at < 0 ? undefined : this.waiting.splice(at, 1)[0];
    if (w === undefined) throw new Error(`no held ${kind} call`);
    return w;
  }

  /** Answer the oldest held call of this kind, from the model or as told. */
  release(kind: Kind, how?: Override): void {
    const w = this.take(kind);
    if (how === 'throw') {
      w.reject(new Error('p3201 call failed'));
      return;
    }
    if (how === 'unreachable') {
      w.resolve({ ...NO_PANE, unreachable: true });
      return;
    }
    this.land(w.call);
    w.resolve(this.answer());
  }

  /** Answer the oldest held call of this kind with `state`, landing nothing. */
  answerWith(kind: Kind, state: TerminalScrollState): void {
    this.take(kind).resolve(state);
  }

  heldCount(kind: Kind): number {
    return this.waiting.filter((w) => w.call.kind === kind).length;
  }

  count(kind: Kind): number {
    return this.calls.filter((c) => c.kind === kind).length;
  }

  key(data: string): void {
    this.typed.push(data);
    this.log.push(`type:${data}`);
    const land = (): void => {
      if (this.inMode) this.eaten += data;
      else this.received += data;
    };
    if (this.keyLatency === 0) land();
    else setTimeout(land, this.keyLatency);
  }
}

const NO_PANE: TerminalScrollState = {
  hasPane: false,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

function stand(pane: Pane): Pane {
  vi.stubGlobal('window', {
    gmux: {
      scroll: {
        state: () => pane.call('state', 0),
        by: (input: { lines: number }) => pane.call('by', input.lines),
        to: (input: { position: number }) => pane.call('to', input.position),
        live: () => pane.call('live', 0)
      },
      term: {
        sendInput: (_id: string, data: string) => pane.key(data)
      }
    }
  });
  return pane;
}

const TERM = {
  rows: 40,
  modes: { mouseTrackingMode: 'none' }
} as unknown as Terminal;

const { ScrollSurface, forgetParkedFramesForTests } = await import('../surface');
type Surface = InstanceType<typeof ScrollSurface>;

async function settle(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

/** One wheel event of whole lines; negative deltaY is back in time. */
function notch(lines = 1): WheelEvent {
  return { deltaY: -lines, deltaMode: 1 } as unknown as WheelEvent;
}

async function started(pane: Pane): Promise<Surface> {
  stand(pane);
  const surface = new ScrollSurface('p3201-session', TERM);
  surface.start();
  await vi.advanceTimersByTimeAsync(2 * pane.latency);
  await settle();
  return surface;
}

/** Run `fn` at `ms` of fake time from now. */
function at(ms: number, fn: () => void): void {
  setTimeout(fn, ms);
}

function linesSent(pane: Pane): number {
  let total = 0;
  for (const c of pane.calls) if (c.kind === 'by') total += c.arg;
  return total;
}

beforeEach(() => {
  vi.useFakeTimers();
  forgetParkedFramesForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// P1: never decide a key from an answer a scroll in flight will overturn
// ---------------------------------------------------------------------------

describe('P1, the hold (mustHold)', () => {
  it('holds a key behind an unanswered notch, then delivers it after the cancel', async () => {
    const pane = new Pane();
    pane.held.add('by');
    pane.held.add('live');
    const surface = await started(pane);

    expect(surface.handleWheel(notch())).toBe(false);
    await vi.advanceTimersByTimeAsync(16);
    expect(pane.heldCount('by')).toBe(1);

    // The last answer says live, and the notch is still on its way.
    surface.sendInput('f');
    await settle();
    expect(pane.typed).toEqual([]);

    pane.release('by');
    await settle();
    expect(pane.inMode).toBe(true);
    expect(pane.heldCount('live')).toBe(1);
    expect(pane.typed).toEqual([]);

    pane.release('live');
    await settle();
    expect(pane.typed).toEqual(['f']);
    expect(pane.received).toBe('f');
    expect(pane.log).toEqual(['state', 'by:1', 'live', 'type:f']);
    surface.dispose();
  });

  it('lets wheel travel not yet sent go AFTER the key rather than hold it', async () => {
    const pane = new Pane();
    const surface = await started(pane);

    surface.handleWheel(notch(3));
    // The travel waits on the 16 ms window; the key does not wait for it.
    surface.sendInput('x');
    expect(pane.typed).toEqual(['x']);
    await vi.advanceTimersByTimeAsync(100);
    expect(pane.log).toEqual(['state', 'type:x', 'by:3']);
    expect(pane.received).toBe('x');
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// P2 rebuilt: a fence, never a drop and never a swallow
// ---------------------------------------------------------------------------

describe('P2, the key fence (awaitKeyFence)', () => {
  it('delays the scroll after a key by 32 ms and drops none of its travel', async () => {
    const pane = new Pane();
    const surface = await started(pane);

    surface.sendInput('x');
    surface.handleWheel(notch());
    surface.handleWheel(notch());
    await vi.advanceTimersByTimeAsync(16);
    // The window has flushed and the scroll is at the head of the chain.
    expect(pane.count('by')).toBe(0);
    surface.handleWheel(notch(3));
    await vi.advanceTimersByTimeAsync(15);
    expect(pane.count('by')).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(pane.count('by')).toBeGreaterThan(0);
    expect(pane.calls.find((c) => c.kind === 'by')?.at).toBe(32);

    await vi.advanceTimersByTimeAsync(100);
    expect(linesSent(pane)).toBe(5);
    expect(pane.position).toBe(5);
    expect(pane.received).toBe('x');
    surface.dispose();
  });

  it('is not re-armed by a key: the wheel window already open still flushes on time', async () => {
    const pane = new Pane();
    const surface = await started(pane);

    surface.handleWheel(notch(2));
    await vi.advanceTimersByTimeAsync(5);
    surface.sendInput('a');
    await vi.advanceTimersByTimeAsync(11);
    // The window flushed at 16; the scroll waits for the fence, 5 + 32.
    await vi.advanceTimersByTimeAsync(20);
    expect(pane.count('by')).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(pane.calls.find((c) => c.kind === 'by')).toEqual({
      kind: 'by',
      arg: 2,
      at: 37
    });
    surface.dispose();
  });

  it('is set by a keystroke and never by a report the pane composed', async () => {
    const pane = new Pane();
    const surface = await started(pane);
    surface.sendReport('\x1b[I');
    surface.handleWheel(notch());
    await vi.advanceTimersByTimeAsync(16);
    expect(pane.calls.find((c) => c.kind === 'by')?.at).toBe(16);
    surface.dispose();
  });

  it.each([0, 40, 100])(
    "moves every line of a swipe begun %i ms after a key (arm G's shape)",
    async (gap) => {
      const pane = new Pane();
      pane.latency = 3;
      pane.keyLatency = 1;
      const surface = await started(pane);
      const handled: boolean[] = [];

      surface.sendInput('x');
      for (let i = 0; i < 30; i += 1) {
        at(gap + i * 16, () => handled.push(surface.handleWheel(notch())));
      }
      await vi.advanceTimersByTimeAsync(gap + 30 * 16 + 1_000);

      expect(handled).toHaveLength(30);
      expect(handled.every((h) => !h)).toBe(true);
      expect(linesSent(pane)).toBe(30);
      expect(pane.position).toBe(30);
      expect(pane.received).toBe('x');
      surface.dispose();
    }
  );
});

// ---------------------------------------------------------------------------
// The ruler's shape: typing through a flick
// ---------------------------------------------------------------------------

describe("M3's shape, typing through a one-line flick", () => {
  const TYPED = 'fix the bug';

  /**
   * 50 one-line wheel events 16 ms apart, and the words typed from 100 ms at
   * 35 ms a key: the reverifier's M3, which read 114 of 770 lost at Phase
   * 320's build and 24 of 550 at its parent in the app.
   */
  async function flick(latency: number, keyLatency: number): Promise<Pane> {
    const pane = new Pane();
    pane.latency = latency;
    pane.keyLatency = keyLatency;
    const surface = await started(pane);
    for (let i = 0; i < 50; i += 1) {
      at(i * 16, () => surface.handleWheel(notch()));
    }
    [...TYPED].forEach((ch, i) => {
      at(100 + i * 35, () => surface.sendInput(ch));
    });
    await vi.advanceTimersByTimeAsync(3_000);
    surface.dispose();
    return pane;
  }

  it.each([
    [0, 0],
    [3, 1],
    [3, 5],
    [25, 5],
    [60, 20]
  ])(
    'loses no key and keeps their order, %i ms each way on the scroll channel and %i on the keys',
    async (latency, keyLatency) => {
      const pane = await flick(latency, keyLatency);
      expect(pane.eaten).toBe('');
      expect(pane.received).toBe(TYPED);
      // Every notch still moved the view: the fence delays and never drops.
      expect(linesSent(pane)).toBeGreaterThan(0);
    }
  );
});

// ---------------------------------------------------------------------------
// The drain: one call, whatever mode; a throw retried; dispose
// ---------------------------------------------------------------------------

describe('the drain (drainHeld)', () => {
  it('delivers after ONE answer in clock, tree or options mode', async () => {
    // A mode at the bottom answers position 0 and in a mode, and `cancel`
    // does not leave it. The parent delivered after one answer; Phase 320's
    // removed P3 asked a second time and took three.
    const pane = new Pane();
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);

    surface.sendInput('b');
    surface.sendInput('c');
    await settle();
    expect(pane.typed).toEqual([]);
    pane.release('live');
    // `live` cancels copy mode; a clock stays a clock.
    pane.inMode = true;
    await settle();
    expect(pane.typed).toEqual(['b', 'c']);
    expect(pane.count('live')).toBe(1);
    surface.dispose();
  });

  it('asks once more at once when the answer is still scrolled back, then waits', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);
    surface.sendInput('q');
    await settle();

    // Something scrolled it back again between the cancel and the read.
    pane.answerWith('live', pane.answer());
    await settle();
    expect(pane.count('live')).toBe(2);
    expect(pane.typed).toEqual([]);
    pane.answerWith('live', pane.answer());
    await settle();
    // The second answer above 0 waits 100 ms before the third ask.
    await vi.advanceTimersByTimeAsync(99);
    expect(pane.count('live')).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(pane.count('live')).toBe(3);
    pane.release('live');
    await settle();
    expect(pane.typed).toEqual(['q']);
    surface.dispose();
  });

  it('asks again after a call that THREW, 100 then 200 ms later (retryAfterThrow)', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);
    const t0 = performance.now();

    surface.sendInput('x');
    await settle();
    pane.release('live', 'throw');
    await settle();
    expect(pane.typed).toEqual([]);

    await vi.advanceTimersByTimeAsync(99);
    expect(pane.count('live')).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(pane.count('live')).toBe(2);
    pane.release('live', 'throw');
    await vi.advanceTimersByTimeAsync(200);
    expect(pane.count('live')).toBe(3);
    pane.release('live');
    await settle();

    expect(pane.typed).toEqual(['x']);
    expect(pane.received).toBe('x');
    expect(
      pane.calls.filter((c) => c.kind === 'live').map((c) => c.at - t0)
    ).toEqual([0, 100, 300]);
    surface.dispose();
  });

  it('keeps later keys behind held ones, so they arrive in the order typed', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);
    surface.sendInput('a');
    surface.sendInput('b');
    await settle();
    surface.sendInput('c');
    pane.release('live');
    await settle();
    surface.sendInput('d');
    expect(pane.typed).toEqual(['a', 'b', 'c', 'd']);
    expect(pane.count('live')).toBe(1);
    surface.dispose();
  });
});

describe('dispose', () => {
  it('still delivers on the answer of a call in flight at dispose', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);
    surface.sendInput('x');
    await settle();
    expect(pane.heldCount('live')).toBe(1);

    surface.dispose();
    pane.release('live');
    await settle();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(pane.typed).toEqual(['x']);
    expect(pane.count('live')).toBe(1);
  });

  it.each(['throw', 'unreachable'] as const)(
    'delivers nothing and asks nothing more when the call in flight answers %s after dispose',
    async (how) => {
      const pane = new Pane();
      pane.position = 100;
      pane.inMode = true;
      pane.held.add('live');
      const surface = await started(pane);
      surface.sendInput('x');
      await settle();

      surface.dispose();
      pane.release('live', how);
      await settle();
      await vi.advanceTimersByTimeAsync(10_000);

      expect(pane.typed).toEqual([]);
      expect(pane.count('live')).toBe(1);
    }
  );

  it('ends a wait in progress and makes ONE final call, no retry (settleHeldOnDispose)', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);
    surface.sendInput('x');
    await settle();
    // The machine's connection is down: the drain waits 100 ms to ask again.
    pane.release('live', 'unreachable');
    await vi.advanceTimersByTimeAsync(50);
    expect(pane.count('live')).toBe(1);

    surface.dispose();
    await settle();
    expect(pane.count('live')).toBe(2);
    pane.release('live');
    await settle();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(pane.typed).toEqual(['x']);
    expect(pane.count('live')).toBe(2);
  });

  it('makes the one final call for keys held behind a scroll when the session is left', async () => {
    // Lens 1's X: a key over a parked session, the session left while the
    // pane is still being answered. The parent delivered 10 of 10.
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('by');
    pane.held.add('live');
    const surface = await started(pane);
    surface.scrollBy(3);
    await settle();
    surface.sendInput('x');
    surface.dispose();
    pane.release('by');
    await settle();

    expect(pane.count('live')).toBe(1);
    pane.release('live');
    await settle();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pane.typed).toEqual(['x']);
    expect(pane.count('live')).toBe(1);
  });

  it('delivers a key typed in the same tick the session is left', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    const surface = await started(pane);
    surface.sendInput('x');
    surface.dispose();
    await settle();
    expect(pane.typed).toEqual(['x']);
    expect(pane.count('live')).toBe(1);
  });

  it('delivers nothing when the one final call is not answered at the bottom, and asks no more', async () => {
    const pane = new Pane();
    pane.position = 100;
    pane.inMode = true;
    pane.held.add('live');
    const surface = await started(pane);
    surface.sendInput('x');
    await settle();
    pane.release('live', 'unreachable');
    await vi.advanceTimersByTimeAsync(10);
    surface.dispose();
    await settle();
    pane.release('live', 'unreachable');
    await settle();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pane.typed).toEqual([]);
    expect(pane.count('live')).toBe(2);
  });
});
