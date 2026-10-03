/**
 * Phase 320.1 — the surface over a pane on another machine.
 *
 * Main answers the four scroll calls for such a pane over that machine's own
 * live connection. While that connection is opening, reconnecting or dropped,
 * it answers a VALUE that says so, `unreachable`, with every other field
 * NO_PANE_HERE's. And since the second build every answer it gives for such a
 * pane, that one included, carries `keysOrderedInMain` (build/p3201/SPEC.md
 * D5): main orders the pane's keystrokes against its scrolls, so the surface
 * sends every key straight and holds, fences and drains nothing. This file
 * pins what the surface does with those answers.
 *
 *   - An unreachable answer is noted and NOTHING of it is applied: no number,
 *     no listener told, no "no pane" latch, and the poll asks again at the
 *     live cadence (`noteUnreachable`). A throw here would bring back Phase
 *     95's stack trace a second, and a latch would stop scrolling for the rest
 *     of the mount, which is what a restored pane mounted before its machine
 *     connects would hit.
 *   - While it lasts the wheel takes Phase 320's route (`wheelReachesProgram`)
 *     and no scroll is sent.
 *   - One relative scroll on the chain at a time, the rest coalesced
 *     (`sendTravel`), and a drag is latest wins (`sendLatestTo`).
 *   - THE SECOND BUILD. A surface that has heard `keysOrderedInMain` never
 *     holds a key, never puts the key fence in front of a scroll and never
 *     starts a drain, and a key typed in the same tick as the unmount is
 *     still sent. The first build held keys here, and they died with the
 *     mount when the person chose another session at once (0 of 20 at the
 *     first build, every one at the parent), and its 32 ms fence lost keys
 *     over his Tailscale link. Keys held before the first answer (a notch,
 *     then a key, before the surface had heard anything) go at once, in
 *     order, when the latch arrives.
 *   - The drain through an outage (`drainHeld`) is still this file's too,
 *     driven with answers that do NOT carry the latch. Main no longer gives
 *     such an answer for a pane on another machine, so those cases pin the
 *     mechanism the SPEC keeps unchanged rather than a scenario a person meets.
 *
 * The bridge here is a list of calls, each answered when a test says and
 * with what it says. WHAT THIS FILE IS NOT: the app run over a real machine,
 * which is `probe:p292:remote` and `probe:p320`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IModes, Terminal } from '@xterm/xterm';
import type { TerminalScrollState } from '@shared/ipc';

type Verb = 'state' | 'by' | 'to' | 'live';

interface Asked {
  verb: Verb;
  /** `lines` for by, `position` for to, nothing for the other two. */
  value: number | null;
  at: number;
  settle: (answer: TerminalScrollState | Error) => void;
  done: boolean;
}

/** What main answers for a pane on another machine that it reached. */
const reading = (over: Partial<TerminalScrollState> = {}): TerminalScrollState => ({
  hasPane: true,
  position: 0,
  history: 900,
  rows: 40,
  cols: 120,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false,
  keysOrderedInMain: true,
  ...over
});

/**
 * What main answers while the machine's live connection is down. It carries
 * the latch too: main orders the keys whether or not it can read the pane.
 */
const DOWN: TerminalScrollState = {
  hasPane: false,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false,
  unreachable: true,
  keysOrderedInMain: true
};

/**
 * What main answers for a machine with no live connection this run. No
 * latch: there is no carriage to order anything on, and every key goes to the
 * attach as it did before Phase 320.1.
 */
const NO_PANE_HERE: TerminalScrollState = {
  ...DOWN,
  unreachable: undefined,
  keysOrderedInMain: undefined
};

/** The same answer without the latch, which drives the drain's own clauses. */
const unlatched = (state: TerminalScrollState): TerminalScrollState => ({
  ...state,
  keysOrderedInMain: undefined
});

const PARKED = reading({ position: 30, inMode: true });

let asked: Asked[] = [];
let typed: string[] = [];
let order: string[] = [];

function install(): void {
  asked = [];
  typed = [];
  order = [];
  const ask =
    (verb: Verb, pick: (input: Record<string, unknown>) => number | null) =>
    (input: unknown): Promise<TerminalScrollState> =>
      new Promise((resolve, reject) => {
        const value =
          typeof input === 'object' && input !== null
            ? pick(input as Record<string, unknown>)
            : null;
        const one: Asked = {
          verb,
          value,
          at: performance.now(),
          done: false,
          settle: (answer) => {
            one.done = true;
            if (answer instanceof Error) reject(answer);
            else resolve(answer);
          }
        };
        asked.push(one);
        order.push(value === null ? verb : `${verb} ${value}`);
      });
  vi.stubGlobal('window', {
    gmux: {
      scroll: {
        state: ask('state', () => null),
        by: ask('by', (i) => i.lines as number),
        to: ask('to', (i) => i.position as number),
        live: ask('live', () => null)
      },
      term: {
        sendInput: (_id: string, data: string) => {
          typed.push(data);
          order.push(`key ${data}`);
        }
      }
    }
  });
}

/** The calls of one verb not yet answered, oldest first. */
function open(verb: Verb): Asked[] {
  return asked.filter((a) => a.verb === verb && !a.done);
}

/** Answer the oldest open call of `verb`. */
async function reply(verb: Verb, answer: TerminalScrollState | Error): Promise<void> {
  // A call reaches the bridge a microtask after the chain takes it.
  await settle();
  const next = open(verb)[0];
  if (next === undefined) throw new Error(`no open ${verb} call`);
  next.settle(answer);
  await settle();
}

/** Answer every open poll with `answer`. */
async function replyPolls(answer: TerminalScrollState): Promise<void> {
  await settle();
  for (const one of open('state')) one.settle(answer);
  await settle();
}

function count(verb: Verb): number {
  return asked.filter((a) => a.verb === verb).length;
}

const MODES: { mouseTrackingMode: IModes['mouseTrackingMode'] } = {
  mouseTrackingMode: 'none'
};
const TERM = { rows: 40, modes: MODES } as unknown as Terminal;

const { ScrollSurface, forgetParkedFramesForTests } = await import('../surface');
type Surface = InstanceType<typeof ScrollSurface>;

async function settle(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

const notch = { deltaY: -1, deltaMode: 1 } as unknown as WheelEvent;

/** A mounted surface whose first poll was answered `first`. */
async function mounted(first: TerminalScrollState): Promise<Surface> {
  install();
  const surface = new ScrollSurface('p3201-remote', TERM);
  surface.start();
  await reply('state', first);
  return surface;
}

beforeEach(() => {
  vi.useFakeTimers();
  forgetParkedFramesForTests();
  MODES.mouseTrackingMode = 'none';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// The answer that says the machine is not reachable now (noteUnreachable)
// ---------------------------------------------------------------------------

describe('an unreachable answer', () => {
  it('is not applied, tells no listener and does not latch "no pane"', async () => {
    install();
    const surface = new ScrollSurface('p3201-remote', TERM);
    const seen: boolean[] = [];
    surface.subscribe((view) => seen.push(view.hasPane));
    surface.start();
    await reply('state', DOWN);

    expect(seen).toEqual([true]);
    expect(surface.view.hasPane).toBe(true);
    expect(surface.view.history).toBe(0);

    // The poll goes on at the live cadence, where a latch would have stopped it.
    await vi.advanceTimersByTimeAsync(999);
    expect(count('state')).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(count('state')).toBe(2);
    await reply('state', DOWN);
    for (let i = 0; i < 58; i += 1) {
      await vi.advanceTimersByTimeAsync(1_000);
      await replyPolls(DOWN);
    }
    expect(count('state')).toBe(60);
    expect(seen).toEqual([true]);
    surface.dispose();
  });

  it('lets the pane start scrolling when its machine connects, with no remount', async () => {
    // The launch path: a restored pane mounts before its machine greets.
    const surface = await mounted(DOWN);
    for (let i = 0; i < 3; i += 1) {
      await vi.advanceTimersByTimeAsync(1_000);
      await replyPolls(DOWN);
    }
    await vi.advanceTimersByTimeAsync(1_000);
    await replyPolls(reading({ history: 900 }));
    expect(surface.view.history).toBe(900);

    expect(surface.handleWheel(notch)).toBe(false);
    await vi.advanceTimersByTimeAsync(16);
    expect(open('by').map((a) => a.value)).toEqual([1]);
    await reply('by', reading({ position: 1, inMode: true }));
    expect(surface.view.position).toBe(1);
    surface.dispose();
  });

  it('keeps the numbers of the last answer that reached the pane, and polls at the live cadence', async () => {
    const surface = await mounted(PARKED);
    expect(surface.view.position).toBe(30);
    await vi.advanceTimersByTimeAsync(250);
    await reply('state', DOWN);
    expect(surface.view.position).toBe(30);
    // Parked, the cadence was 250 ms. The connection is down, so it is a second.
    await vi.advanceTimersByTimeAsync(999);
    expect(count('state')).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(count('state')).toBe(3);
    surface.dispose();
  });

  it.each(['none', 'x10'] as const)(
    'swallows the wheel while it lasts when the program asked for no wheel report (%s)',
    async (mode) => {
      const surface = await mounted(DOWN);
      MODES.mouseTrackingMode = mode;
      expect(surface.handleWheel(notch)).toBe(false);
      await vi.advanceTimersByTimeAsync(100);
      expect(count('by')).toBe(0);
      surface.dispose();
    }
  );

  it.each(['vt200', 'drag', 'any'] as const)(
    'hands the wheel to xterm while it lasts when the program asked for the mouse (%s)',
    async (mode) => {
      const surface = await mounted(DOWN);
      MODES.mouseTrackingMode = mode;
      expect(surface.handleWheel(notch)).toBe(true);
      await vi.advanceTimersByTimeAsync(100);
      expect(count('by')).toBe(0);
      surface.dispose();
    }
  );

  it('sends no scroll while it lasts, from the wheel, a page key or a drag', async () => {
    const surface = await mounted(PARKED);
    await vi.advanceTimersByTimeAsync(250);
    await reply('state', DOWN);
    surface.scrollBy(5);
    surface.scrollPages(1);
    surface.scrollTo(100);
    await vi.advanceTimersByTimeAsync(100);
    expect(count('by') + count('to')).toBe(0);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// Keys through an outage (drainHeld), on answers WITHOUT the latch
// ---------------------------------------------------------------------------

describe('keys held while the pane may be parked, on answers that do not say main orders them', () => {
  // Every answer in this describe has the latch taken off (`unlatched`).
  // Main gives no such answer for a pane on another machine since the
  // second build, so these pin `drainHeld`'s own clauses, which the SPEC
  // keeps as they were, and nothing a person meets on another machine.
  const down = unlatched(DOWN);
  const live = (over: Partial<TerminalScrollState> = {}): TerminalScrollState =>
    unlatched(reading(over));

  /** A notch whose scroll came back unreachable: the pane may be parked. */
  async function mayBeParked(): Promise<Surface> {
    const surface = await mounted(live());
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    await reply('by', down);
    return surface;
  }

  it('survive the outage and arrive in order after it', async () => {
    const surface = await mayBeParked();
    const t0 = performance.now();

    surface.sendInput('f');
    surface.sendInput('i');
    await settle();
    surface.sendInput('x');
    await settle();
    expect(typed).toEqual([]);
    expect(open('live')).toHaveLength(1);

    // The connection is still down: nothing is delivered, and it is asked
    // again 100, 200, 400, 800 and then every 1000 ms.
    for (const wait of [100, 200, 400, 800, 1_000, 1_000]) {
      const before = count('live');
      await reply('live', down);
      expect(typed).toEqual([]);
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(count('live')).toBe(before);
      await vi.advanceTimersByTimeAsync(1);
      expect(count('live')).toBe(before + 1);
    }
    expect(
      asked.filter((a) => a.verb === 'live').map((a) => a.at - t0)
    ).toEqual([0, 100, 300, 700, 1_500, 2_500, 3_500]);

    // It is back. The cancel ran, the pane is at the bottom.
    await reply('live', live());
    expect(typed).toEqual(['f', 'i', 'x']);
    surface.sendInput('!');
    expect(typed).toEqual(['f', 'i', 'x', '!']);
    surface.dispose();
  });

  it('are held for a scroll that THREW too, since it may have run', async () => {
    const surface = await mounted(live());
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    await reply('by', new Error('the 5 s deadline'));

    surface.sendInput('a');
    await settle();
    expect(typed).toEqual([]);
    await reply('live', live());
    expect(typed).toEqual(['a']);
    surface.dispose();
  });

  it('are not re-read by the poll while they drain, and the poll outlives the drain', async () => {
    const surface = await mayBeParked();
    await replyPolls(down);
    const polls = count('state');
    surface.sendInput('a');
    await settle();
    for (let i = 0; i < 5; i += 1) {
      await reply('live', down);
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(count('state')).toBe(polls);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    await reply('live', live());
    expect(typed).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(count('state')).toBe(polls + 1);
    surface.dispose();
  });

  it('go straight, in order, when the answer latches "no pane" under them', async () => {
    const surface = await mounted(live());
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    surface.sendInput('a');
    surface.sendInput('b');
    await settle();
    expect(typed).toEqual([]);

    // The machine has no live connection this run after all.
    await reply('by', NO_PANE_HERE);
    expect(typed).toEqual(['a', 'b']);
    surface.sendInput('c');
    expect(typed).toEqual(['a', 'b', 'c']);
    expect(count('live')).toBe(0);
    surface.dispose();
  });

  it('go straight when nothing says the pane may be parked, even while unreachable', async () => {
    const surface = await mounted(down);
    surface.sendInput('z');
    expect(typed).toEqual(['z']);
    expect(count('live')).toBe(0);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// One scroll at a time (sendTravel, sendLatestTo)
// ---------------------------------------------------------------------------

describe('scrolls over a slow link', () => {
  it('coalesce relative travel behind the one in flight into one call', async () => {
    const surface = await mounted(reading());
    surface.scrollBy(1);
    await settle();
    surface.scrollBy(2);
    surface.scrollBy(3);
    surface.scrollBy(-1);
    await settle();
    expect(asked.filter((a) => a.verb === 'by').map((a) => a.value)).toEqual([1]);

    await reply('by', reading({ position: 1, inMode: true }));
    expect(asked.filter((a) => a.verb === 'by').map((a) => a.value)).toEqual([1, 4]);
    await reply('by', reading({ position: 5, inMode: true }));
    await vi.advanceTimersByTimeAsync(100);
    expect(count('by')).toBe(2);
    surface.dispose();
  });

  it('send the latest drag position and skip the ones it replaced', async () => {
    const surface = await mounted(reading());
    surface.scrollTo(100);
    await settle();
    surface.scrollTo(200);
    surface.scrollTo(300);
    surface.scrollTo(50);
    await settle();
    await reply('to', reading({ position: 100, inMode: true }));
    await reply('to', reading({ position: 50, inMode: true }));
    await vi.advanceTimersByTimeAsync(100);
    expect(asked.filter((a) => a.verb === 'to').map((a) => a.value)).toEqual([100, 50]);
    expect(surface.view.position).toBe(50);
    surface.dispose();
  });

  it('keep a drag and the wheel in the order they came, a drag replacing travel before it', async () => {
    const surface = await mounted(reading());
    surface.scrollBy(5);
    await settle();
    surface.scrollBy(3);
    surface.scrollTo(100);
    surface.scrollBy(-2);
    await settle();
    await reply('by', reading({ position: 5, inMode: true }));
    await reply('to', reading({ position: 100, inMode: true }));
    await reply('by', reading({ position: 98, inMode: true }));
    expect(order.filter((o) => o !== 'state')).toEqual(['by 5', 'to 100', 'by -2']);
    surface.dispose();
  });

  it('send a key straight past a coalesced scroll, and the travel made after the key with no fence', async () => {
    // The first build held this key behind the scroll and then fenced the
    // travel 32 ms behind the key. Main orders the two now: the key leaves
    // at once, and the travel that waited leaves the moment the scroll
    // before it has settled. THE RULED ROUND (the O row): only travel made
    // AFTER the key waits and leaves; the 2 lines made before it are the
    // key's to drop (see "a key wins over travel made before it" below).
    const surface = await mounted(reading());
    surface.scrollBy(1);
    await settle();
    surface.scrollBy(2);
    surface.sendInput('k');
    surface.scrollBy(4);
    expect(typed).toEqual(['k']);
    await reply('by', reading({ position: 1, inMode: true }));
    // The read the key asked for (see `followKey` below): main's `cancel`
    // ran after the park, so the pane is live again.
    await reply('state', reading());
    expect(open('by').map((a) => a.value)).toEqual([4]);
    expect(count('live')).toBe(0);
    expect(order.filter((o) => o !== 'state')).toEqual(['by 1', 'key k', 'by 4']);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The second build: main orders the keys (keysOrderedInMain, D5 to D8)
// ---------------------------------------------------------------------------

describe('a surface whose answers say main orders its keys', () => {
  it('never holds a key: behind an unanswered notch, over a parked pane, or after a scroll that came back unreachable', async () => {
    // Each of the three is a hold at the first build and on this Mac.
    const surface = await mounted(reading());
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    expect(open('by')).toHaveLength(1);
    surface.sendInput('a');
    expect(typed).toEqual(['a']);

    await reply('by', reading({ position: 1, inMode: true }));
    surface.sendInput('b');
    expect(typed).toEqual(['a', 'b']);

    await reply('state', reading());
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    await reply('by', DOWN);
    surface.sendInput('c');
    expect(typed).toEqual(['a', 'b', 'c']);

    // Nothing was drained: no call returned the pane to live from here.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(count('live')).toBe(0);
    surface.dispose();
  });

  it('never fences a scroll behind a key, even one delivered before the latch', async () => {
    install();
    const surface = new ScrollSurface('p3201-remote', TERM);
    surface.start();
    // Before the first answer the surface does not know where the pane is,
    // so this key is delivered the way this Mac delivers one, which arms
    // this Mac's 32 ms fence.
    surface.sendInput('x');
    expect(typed).toEqual(['x']);
    await reply('state', reading());
    const t0 = performance.now();

    surface.scrollBy(3);
    await settle();
    expect(open('by').map((a) => [a.value, a.at - t0])).toEqual([[3, 0]]);
    await reply('by', reading({ position: 3, inMode: true }));

    // And a key sent straight arms nothing either. It asks one read, since
    // the pane was parked; the scroll after it leaves the moment that read
    // is answered, with no fake time passed at all.
    surface.sendInput('y');
    surface.scrollBy(2);
    await reply('state', reading({ position: 3, inMode: true }));
    expect(open('by').map((a) => [a.value, a.at - t0])).toEqual([[2, 0]]);
    surface.dispose();
  });

  it('sends a key typed in the same tick as the unmount, and asks nothing after', async () => {
    const surface = await mounted(PARKED);
    surface.sendInput('x');
    surface.dispose();
    expect(typed).toEqual(['x']);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(count('live')).toBe(0);
    expect(typed).toEqual(['x']);
  });

  it('sends a key that arrives in the same tick just after the unmount', async () => {
    const surface = await mounted(PARKED);
    surface.dispose();
    surface.sendInput('x');
    expect(typed).toEqual(['x']);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(count('live') + count('state')).toBe(1);
  });

  it('the fix round: a pane on another machine says so at mount, so a key typed after a notch before any answer goes at once and survives an immediate switch', async () => {
    install();
    const surface = new ScrollSurface('p3201-remote', TERM, { onAnotherMachine: true });
    surface.start();
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    // No answer has come back to anything yet.
    expect(asked.every((one) => !one.done)).toBe(true);
    surface.sendInput('a');
    expect(typed).toEqual(['a']);
    // The person chooses another session in the same tick.
    surface.sendInput('b');
    surface.dispose();
    expect(typed).toEqual(['a', 'b']);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(count('live')).toBe(0);
    expect(typed).toEqual(['a', 'b']);
  });

  it('sends keys held before the first answer at once, in order, when it arrives', async () => {
    install();
    const surface = new ScrollSurface('p3201-remote', TERM);
    surface.start();
    // A notch and two keys, all before the first answer: this Mac's rule
    // holds the keys behind the notch.
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    surface.sendInput('a');
    surface.sendInput('b');
    await settle();
    expect(typed).toEqual([]);

    await reply('state', reading());
    // Before the notch's own call is made: the latch is read first.
    expect(typed).toEqual(['a', 'b']);
    expect(order.filter((o) => o !== 'state')).toEqual(['key a', 'key b', 'by 1']);
    surface.sendInput('c');
    expect(typed).toEqual(['a', 'b', 'c']);

    await reply('by', reading({ position: 1, inMode: true }));
    await vi.advanceTimersByTimeAsync(5_000);
    await replyPolls(reading({ position: 1, inMode: true }));
    expect(count('live')).toBe(0);
    expect(typed).toEqual(['a', 'b', 'c']);
    surface.dispose();
  });

  it('sends them on the not-reachable-now answer too, which carries the latch', async () => {
    install();
    const surface = new ScrollSurface('p3201-remote', TERM);
    surface.start();
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    surface.sendInput('a');
    await settle();
    expect(typed).toEqual([]);
    await reply('state', DOWN);
    expect(typed).toEqual(['a']);
    surface.dispose();
  });

  it('sends them when the latch arrives after the surface was unmounted', async () => {
    install();
    const surface = new ScrollSurface('p3201-remote', TERM);
    surface.start();
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    surface.sendInput('a');
    await settle();
    surface.dispose();
    await reply('state', reading());
    expect(typed).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(count('live')).toBe(0);
  });

  it('ends a drain the moment its own answer carries the latch, with no wait after it', async () => {
    // A surface that held a key on answers without the latch, then hears it
    // on the drain's own call while the machine is still down.
    const surface = await mounted(unlatched(reading()));
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    await reply('by', unlatched(DOWN));
    surface.sendInput('a');
    await settle();
    await reply('live', unlatched(DOWN));
    expect(typed).toEqual([]);
    await vi.advanceTimersByTimeAsync(100);
    expect(open('live')).toHaveLength(1);

    await reply('live', DOWN);
    expect(typed).toEqual(['a']);
    // The drain is over at once: it starts no 200 ms wait, so a read goes
    // onto the chain now rather than being put off behind it.
    const reads = count('state');
    surface.refresh();
    await settle();
    expect(count('state')).toBe(reads + 1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(count('live')).toBe(2);
    surface.dispose();
  });

  it('sends held keys on the one final call at unmount when its answer carries the latch', async () => {
    // P3's last word (`settleHeldOnDispose`) delivers only on a reached
    // answer at the bottom. An answer carrying the latch sends the keys
    // whatever else it says, since main orders them, the not-reachable-now
    // answer included.
    const surface = await mounted(unlatched(reading()));
    surface.handleWheel(notch);
    await vi.advanceTimersByTimeAsync(16);
    await reply('by', unlatched(DOWN));
    surface.sendInput('a');
    await settle();
    await reply('live', unlatched(DOWN));
    // The drain is waiting to ask again, with no call in flight. Unmount.
    surface.dispose();
    await settle();
    expect(open('live')).toHaveLength(1);
    await reply('live', DOWN);
    expect(typed).toEqual(['a']);
  });

  it('keeps the latch: an answer without it later does not bring the hold back', async () => {
    const surface = await mounted(reading());
    await vi.advanceTimersByTimeAsync(1_000);
    await replyPolls(unlatched(PARKED));
    surface.sendInput('q');
    expect(typed).toEqual(['q']);
    expect(count('live')).toBe(0);
    surface.dispose();
  });

  describe('the read after a key (followKey)', () => {
    it('asks once after keys over a parked pane, so the thumb follows the pane to live', async () => {
      const surface = await mounted(PARKED);
      const before = count('state');
      surface.sendInput('a');
      surface.sendInput('b');
      surface.sendInput('c');
      await settle();
      expect(typed).toEqual(['a', 'b', 'c']);
      expect(count('state')).toBe(before + 1);

      await reply('state', reading());
      expect(surface.view.position).toBe(0);
      // Live now: another key asks nothing.
      surface.sendInput('d');
      await settle();
      expect(count('state')).toBe(before + 1);
      surface.dispose();
    });

    it('asks behind a notch still in flight, whose answer the key has made stale', async () => {
      const surface = await mounted(reading());
      surface.scrollBy(3);
      await settle();
      const before = count('state');
      surface.sendInput('k');
      await settle();
      // Queued behind the scroll on the chain, so it reads after it.
      expect(count('state')).toBe(before);
      await reply('by', reading({ position: 3, inMode: true }));
      expect(count('state')).toBe(before + 1);
      await reply('state', reading());
      expect(surface.view.position).toBe(0);
      surface.dispose();
    });

    it('asks nothing after a key to a live pane with nothing in flight', async () => {
      const surface = await mounted(reading());
      const before = count('state');
      surface.sendInput('a');
      await settle();
      expect(count('state')).toBe(before);
      surface.dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// The ruled round (the O row): a key wins over wheel travel made before it
// ---------------------------------------------------------------------------

describe('a key wins over travel made before it (the ruled round, O)', () => {
  // The reverifier, on his Mac Pro: 31 keys 35 ms apart with 25 one-line
  // wheel events from 300 ms. Travel made during the typing was queued behind
  // a scroll whose park the typing had dropped, and sent to main AFTER the
  // last key; main counts a scroll's keys from the moment it receives it, so
  // that scroll waited out the quiet and parked the pane 200 ms after the
  // typing stopped, 2 to 4 lines back, in 4 of 20 runs, against 0 of 20 today.
  // Each case below is one place travel made before a key could wait.

  it('travel queued behind a scroll on the chain is dropped by a key, and nothing of it is sent', async () => {
    const surface = await mounted(reading());
    surface.scrollBy(1);
    await settle();
    surface.scrollBy(2);
    surface.scrollBy(1);
    surface.sendInput('k');
    await reply('by', reading());
    // The read the key asked for behind that scroll (followKey), answered so
    // anything still queued would leave now.
    await reply('state', reading());
    await vi.advanceTimersByTimeAsync(100);
    expect(asked.filter((a) => a.verb === 'by').map((a) => a.value)).toEqual([1]);
    expect(order.filter((o) => o !== 'state')).toEqual(['by 1', 'key k']);
    surface.dispose();
  });

  it('wheel travel still coalescing when the key is typed is dropped, and no scroll leaves', async () => {
    const surface = await mounted(reading());
    expect(surface.handleWheel(notch)).toBe(false);
    expect(surface.handleWheel(notch)).toBe(false);
    surface.sendInput('k');
    await vi.advanceTimersByTimeAsync(100);
    expect(count('by')).toBe(0);
    expect(typed).toEqual(['k']);
    surface.dispose();
  });

  it('a scroll handed to the chain but not yet sent when the key is typed is not sent', async () => {
    const surface = await mounted(reading());
    // A poll is on the chain and unanswered, so the scroll waits behind it.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(open('state')).toHaveLength(1);
    surface.scrollBy(3);
    surface.sendInput('k');
    await reply('state', reading());
    await vi.advanceTimersByTimeAsync(100);
    expect(count('by')).toBe(0);
    expect(order.filter((o) => o !== 'state')).toEqual(['key k']);
    // The read the key asked for while that scroll was counted (followKey).
    await reply('state', reading());
    // Nothing was sent, so nothing may have parked the pane: travel made after
    // the key goes as one scroll.
    surface.scrollBy(2);
    await settle();
    expect(open('by').map((a) => a.value)).toEqual([2]);
    surface.dispose();
  });

  it('travel made AFTER the key is kept and sent, in the order it came', async () => {
    const surface = await mounted(reading());
    surface.sendInput('k');
    expect(surface.handleWheel(notch)).toBe(false);
    await vi.advanceTimersByTimeAsync(16);
    expect(order.filter((o) => o !== 'state')).toEqual(['key k', 'by 1']);
    surface.dispose();
  });

  it('a drag\'s latest place is left alone by a key', async () => {
    const surface = await mounted(reading());
    surface.scrollTo(100);
    await settle();
    surface.scrollTo(200);
    surface.sendInput('k');
    await reply('to', reading({ position: 100, inMode: true }));
    // The read the key asked for, behind the drag on the chain (followKey).
    await reply('state', reading({ position: 100, inMode: true }));
    expect(open('to').map((a) => a.value)).toEqual([200]);
    surface.dispose();
  });

  it('on THIS Mac a key drops nothing: the travel queued before it still goes (P4 unchanged)', async () => {
    const surface = await mounted(unlatched(reading()));
    surface.scrollBy(1);
    await settle();
    surface.scrollBy(2);
    surface.sendInput('k');
    // P1 holds the key behind the unanswered notch; its drain returns the pane
    // to live, and the travel queued before the key leaves after it, fenced.
    expect(typed).toEqual([]);
    await reply('by', unlatched(reading({ position: 1, inMode: true })));
    await reply('live', unlatched(reading()));
    await vi.advanceTimersByTimeAsync(100);
    expect(typed).toEqual(['k']);
    expect(asked.filter((a) => a.verb === 'by').map((a) => a.value)).toEqual([1, 2]);
    surface.dispose();
  });
});
