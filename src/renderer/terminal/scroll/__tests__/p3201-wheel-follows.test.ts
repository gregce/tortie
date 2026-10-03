/**
 * Phase 320.1, the second build — the wheel follows the program as it is at
 * that moment (build/p3201/SPEC.md D1 and D2, `wheelFollowsProgram`).
 *
 * THE FAULT THIS FILE PINS. The first build decided every wheel event over a
 * pane main can read from main's last read, which is this surface's own poll
 * and up to a second old. For that second after a far full screen program
 * asked for the mouse, the wheel went to tmux copy mode and parked the pane,
 * and Phase 292's exception (a parked pane keeps its wheel) then kept every
 * later notch there. The reporter's own case read 0 of 20 at the first build
 * and 20 of 20 at its parent, on tmux 3.6a, 3.7b and his Mac Pro's 3.7c, and
 * the pane was still in copy mode three seconds later. The same race was on
 * this Mac at the parent (0 of 60), which is why the rule here has no idea
 * which machine a pane is on, and why every row below is asked twice: once
 * with answers from this Mac and once with answers from another machine,
 * which carry `keysOrderedInMain`.
 *
 * THE RULE, in the order it is asked:
 *   1. the pane is scrolled back (`inMode`)            → ours
 *   2. xterm says the program asked for a wheel report → the program's
 *   3. the read says the program asked for the mouse   → nothing, and main
 *      is asked again, at most once per second
 *   4. the read says alternate screen with no mouse    → the program's on
 *      this Mac; NOTHING on another machine (the fix round: the program's
 *      route there typed ESC O A into Codex 0.158's full screen view, 25 of
 *      25 notches, where the parent typed none)
 *   5. otherwise                                       → ours
 * "Ours" is a `by` call 16 ms later and false to xterm; "the program's" is
 * true to xterm and no call; "nothing" is false to xterm and no call.
 *
 * THE TWO DIRECTIONS OF THE RACE. The program asks for the mouse and the read
 * has not seen it: xterm has (within 0.1 ms, SPEC section 4, M1), so the wheel
 * is the program's from the first notch. The program lets go and the read has
 * not seen it: xterm has, so the wheel sends nothing rather than `ESC O A`
 * (Phase 95's defect), and a read is asked for so the next notch is decided
 * from the truth. And the one where main's read learns first, which a loaded
 * link can do (main's own read before a park, D3): nothing parks either.
 *
 * Each clause has a case that goes red when it alone is removed; the builder
 * proved it once per clause in a scratch copy. WHAT THIS FILE IS NOT: the app
 * run over a real far program, which is `probe:p320`'s R1 and R7.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IModes, Terminal } from '@xterm/xterm';
import type { TerminalScrollState } from '@shared/ipc';

type Mode = IModes['mouseTrackingMode'];

interface Bridge {
  /** What the next call answers. A test moves it between gestures. */
  answer: TerminalScrollState;
  calls: { state: number; by: number; to: number; live: number };
  /** Every string handed to `term.sendInput`. The wheel must type nothing. */
  typed: string[];
}

function bridge(first: TerminalScrollState): Bridge {
  const b: Bridge = {
    answer: first,
    calls: { state: 0, by: 0, to: 0, live: 0 },
    typed: []
  };
  const verb = (name: keyof Bridge['calls']) => async () => {
    b.calls[name] += 1;
    return b.answer;
  };
  vi.stubGlobal('window', {
    gmux: {
      scroll: {
        state: verb('state'),
        by: verb('by'),
        to: verb('to'),
        live: verb('live')
      },
      term: {
        sendInput: (_id: string, data: string) => {
          b.typed.push(data);
        }
      }
    }
  });
  return b;
}

const MODES: { mouseTrackingMode: Mode } = { mouseTrackingMode: 'none' };
const TERM = { rows: 40, modes: MODES } as unknown as Terminal;

const { ScrollSurface, forgetParkedFramesForTests } = await import('../surface');
type Surface = InstanceType<typeof ScrollSurface>;

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

const NOTCH = { deltaY: -1, deltaMode: 1 } as unknown as WheelEvent;

/** Where the answers come from. Another machine's carry the latch. */
const WHERE = [
  ['this Mac', {}],
  ['another machine', { keysOrderedInMain: true }]
] as const;

type Read = 'plain' | 'innerAlt' | 'innerMouse' | 'innerAlt+innerMouse';

const READS: Record<Read, Partial<TerminalScrollState>> = {
  plain: {},
  innerAlt: { innerAlt: true },
  innerMouse: { innerMouse: true },
  'innerAlt+innerMouse': { innerAlt: true, innerMouse: true }
};

const MODE_NAMES: readonly Mode[] = ['none', 'x10', 'vt200', 'drag', 'any'];

function reading(
  where: Partial<TerminalScrollState>,
  over: Partial<TerminalScrollState> = {}
): TerminalScrollState {
  return {
    hasPane: true,
    position: 0,
    history: 500,
    rows: 40,
    cols: 120,
    frameHistory: null,
    inMode: false,
    innerAlt: false,
    innerMouse: false,
    ...where,
    ...over
  };
}

/** A mounted surface whose first read was `first`. */
async function mounted(first: TerminalScrollState): Promise<{ surface: Surface; b: Bridge }> {
  const b = bridge(first);
  const surface = new ScrollSurface('p3201-wheel', TERM);
  surface.start();
  await settle();
  return { surface, b };
}

type Route = 'ours' | 'program' | 'nothing';

/**
 * What the rule says, written out from the SPEC, not from the code. Rule 4 is
 * the one place the two machines differ (the fix round): on another machine a
 * read that says alternate screen with no mouse sends NOTHING, today's swallow,
 * because handing it to xterm typed `ESC O A` into Codex's full screen view.
 */
function expected(parked: boolean, read: Read, mode: Mode, remote: boolean): Route {
  if (parked) return 'ours';
  if (mode === 'vt200' || mode === 'drag' || mode === 'any') return 'program';
  if (read === 'innerMouse' || read === 'innerAlt+innerMouse') return 'nothing';
  if (read === 'innerAlt') return remote ? 'nothing' : 'program';
  return 'ours';
}

/** Only rule 3's nothing asks main again; rule 4's is today's swallow and asks nothing. */
function asksAgain(parked: boolean, read: Read, mode: Mode): boolean {
  return (
    !parked &&
    !(mode === 'vt200' || mode === 'drag' || mode === 'any') &&
    (read === 'innerMouse' || read === 'innerAlt+innerMouse')
  );
}

/**
 * One notch, then what it did: the answer xterm got, whether a scroll left,
 * and how many reads it asked for beyond the ones already made.
 */
async function oneNotch(
  surface: Surface,
  b: Bridge
): Promise<{ handed: boolean; by: number; reads: number }> {
  const before = { ...b.calls };
  const handed = surface.handleWheel(NOTCH);
  await vi.advanceTimersByTimeAsync(16);
  await settle();
  return {
    handed,
    by: b.calls.by - before.by,
    reads: b.calls.state - before.state
  };
}

function routeOf(o: { handed: boolean; by: number }): Route {
  if (o.handed) return 'program';
  return o.by > 0 ? 'ours' : 'nothing';
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
// The whole table: xterm's five modes × four reads × parked or not
// ---------------------------------------------------------------------------

describe.each(WHERE)('the route table, answers from %s', (_name, where) => {
  const rows: [boolean, Read, Mode][] = [];
  for (const parked of [false, true]) {
    for (const read of Object.keys(READS) as Read[]) {
      for (const mode of MODE_NAMES) rows.push([parked, read, mode]);
    }
  }

  it.each(rows)('parked %s, read %s, xterm %s', async (parked, read, mode) => {
    const over = parked
      ? { position: 30, inMode: true, ...READS[read] }
      : READS[read];
    const { surface, b } = await mounted(reading(where, over));
    MODES.mouseTrackingMode = mode;

    const got = await oneNotch(surface, b);
    const want = expected(parked, read, mode, where !== WHERE[0][1]);

    expect([parked, read, mode, routeOf(got)]).toEqual([parked, read, mode, want]);
    // Only rule 3's "nothing" asks main again, and it asks once.
    expect(got.reads).toBe(asksAgain(parked, read, mode) ? 1 : 0);
    // The wheel never types. A report is xterm's, on true.
    expect(b.typed).toEqual([]);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The program asks for the mouse, and the read has not seen it (D1)
// ---------------------------------------------------------------------------

describe.each(WHERE)('a program that has just asked for the mouse, answers from %s', (_name, where) => {
  it.each(['vt200', 'drag', 'any'] as const)(
    'gets every notch of a flick from the first, and nothing parks (%s)',
    async (mode) => {
      // The read still says the normal buffer: it is the poll's, and the
      // program asked since. xterm already knows.
      const { surface, b } = await mounted(reading(where));
      MODES.mouseTrackingMode = mode;

      const handed: boolean[] = [];
      for (let i = 0; i < 20; i += 1) {
        handed.push(surface.handleWheel(NOTCH));
        await vi.advanceTimersByTimeAsync(16);
      }
      await settle();

      expect(handed).toEqual(Array.from({ length: 20 }, () => true));
      expect(b.calls.by + b.calls.to + b.calls.live).toBe(0);
      expect(surface.view.position).toBe(0);
      surface.dispose();
    }
  );

  it('still gets them when the read catches up', async () => {
    const { surface, b } = await mounted(reading(where));
    MODES.mouseTrackingMode = 'any';
    expect(surface.handleWheel(NOTCH)).toBe(true);
    b.answer = reading(where, { innerAlt: true, innerMouse: true, history: 0 });
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    expect(surface.view.owned).toBe(false);
    expect(surface.handleWheel(NOTCH)).toBe(true);
    expect(b.calls.by).toBe(0);
    surface.dispose();
  });

  it('does not take the wheel of a pane the reader had already scrolled back (Phase 292)', async () => {
    // Parked 30 back on ordinary lines, and then the program took the
    // screen. The reader is reading real lines, so the wheel stays theirs.
    const { surface, b } = await mounted(
      reading(where, { position: 30, inMode: true, innerAlt: true, innerMouse: true })
    );
    MODES.mouseTrackingMode = 'any';
    const got = await oneNotch(surface, b);
    expect(routeOf(got)).toBe('ours');
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The program lets go of the mouse, and the read has not seen it (D2)
// ---------------------------------------------------------------------------

describe.each(WHERE)('a program that has just let go of the mouse, answers from %s', (_name, where) => {
  it('sends nothing, asks once a second at most, and is ours once the read says so', async () => {
    const { surface, b } = await mounted(
      reading(where, { innerAlt: true, innerMouse: true, history: 0 })
    );
    MODES.mouseTrackingMode = 'none';
    // The program is gone: the next read is the shell's normal buffer. It
    // is kept from the surface until a test lets the read land, so the
    // throttle is what is measured.
    b.answer = reading(where, { innerAlt: true, innerMouse: true, history: 0 });
    const reads0 = b.calls.state;

    // A fling of 20 events over 320 ms: every one is swallowed, none is
    // handed to xterm (which would type ESC O A), none scrolls, and ONE
    // read is asked, not twenty.
    const handed: boolean[] = [];
    for (let i = 0; i < 20; i += 1) {
      handed.push(surface.handleWheel(NOTCH));
      await vi.advanceTimersByTimeAsync(16);
    }
    await settle();
    expect(handed.every((h) => !h)).toBe(true);
    expect(b.calls.by).toBe(0);
    expect(b.calls.state - reads0).toBe(1);

    // Still inside the second: no second read from the wheel.
    await vi.advanceTimersByTimeAsync(600);
    const reads1 = b.calls.state;
    surface.handleWheel(NOTCH);
    await settle();
    expect(b.calls.state).toBe(reads1);

    // A second after the first ask, the wheel may ask again.
    await vi.advanceTimersByTimeAsync(400);
    const reads2 = b.calls.state;
    surface.handleWheel(NOTCH);
    await settle();
    expect(b.calls.state).toBe(reads2 + 1);

    // The read now says the shell. The next notch is ours.
    b.answer = reading(where, { history: 520 });
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    const got = await oneNotch(surface, b);
    expect(routeOf(got)).toBe('ours');
    expect(b.typed).toEqual([]);
    surface.dispose();
  });

  it('asks at once, not on the next poll', async () => {
    const { surface, b } = await mounted(reading(where, { innerMouse: true }));
    MODES.mouseTrackingMode = 'none';
    const reads = b.calls.state;
    surface.handleWheel(NOTCH);
    await settle();
    // The poll would be a second away.
    expect(b.calls.state).toBe(reads + 1);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// Main's read learns first (a loaded link; main's own read before a park)
// ---------------------------------------------------------------------------

describe('when main learns before xterm does', () => {
  it('parks nothing: the answer that refused a park is read, and the next notch sends nothing', async () => {
    // On another machine main reads the far pane before it parks it and
    // writes nothing when the program has taken the mouse (SPEC D3). The
    // renderer hears that read as the answer to its `by`. xterm has not yet
    // had the attach's bytes, so it still says none.
    const where = { keysOrderedInMain: true };
    const { surface, b } = await mounted(reading(where));
    MODES.mouseTrackingMode = 'none';
    b.answer = reading(where, { innerAlt: true, innerMouse: true, history: 0 });

    const first = await oneNotch(surface, b);
    expect(routeOf(first)).toBe('ours');
    expect(surface.view.position).toBe(0);

    const next = await oneNotch(surface, b);
    expect(routeOf(next)).toBe('nothing');

    // The attach's bytes land: xterm says any. Now it is the program's.
    MODES.mouseTrackingMode = 'any';
    expect(surface.handleWheel(NOTCH)).toBe(true);
    expect(b.calls.by).toBe(1);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The fix round: rule 4 on another machine, and a pane that says so at mount
// ---------------------------------------------------------------------------

describe('rule 4 on another machine (the fix round)', () => {
  it('a remote program on its alternate screen with no mouse (Codex 0.158\'s full screen view) gets no cursor key from a flick', async () => {
    const remote = { keysOrderedInMain: true };
    const { surface, b } = await mounted(reading(remote, { innerAlt: true, history: 0 }));
    MODES.mouseTrackingMode = 'none';
    const handed: boolean[] = [];
    for (let i = 0; i < 15; i += 1) {
      handed.push(surface.handleWheel(NOTCH));
      await vi.advanceTimersByTimeAsync(16);
    }
    await settle();
    // False to xterm every time: xterm types nothing, and nothing scrolls.
    expect(handed.every((h) => !h)).toBe(true);
    expect(b.calls.by + b.calls.to + b.calls.live).toBe(0);
    expect(b.typed).toEqual([]);
    surface.dispose();
  });

  it('the same program on this Mac keeps the program\'s route, as before', async () => {
    const { surface } = await mounted(reading({}, { innerAlt: true, history: 0 }));
    MODES.mouseTrackingMode = 'none';
    expect(surface.handleWheel(NOTCH)).toBe(true);
    surface.dispose();
  });

  it('a pane that says it is on another machine at mount takes the remote route from its first answer, which need not say so', async () => {
    const b = bridge(reading({}, { innerAlt: true, history: 0 }));
    const surface = new ScrollSurface('p3201-wheel', TERM, { onAnotherMachine: true });
    surface.start();
    await settle();
    MODES.mouseTrackingMode = 'none';
    expect(surface.handleWheel(NOTCH)).toBe(false);
    expect(b.calls.by).toBe(0);
    surface.dispose();
  });
});
