/**
 * Phase 95 — the scroll poll stops when there is nothing here to poll.
 *
 * THE FAULT THIS FILE PINS. `ScrollSurface` asked main for a session's scroll
 * geometry once a second for as long as the session was on screen. For a
 * session that runs on another machine, and for a session on this Mac that is
 * not running, main had nothing to read and threw. Electron's handler wrapper
 * printed the whole stack trace before the promise rejected, and the surface's
 * catch rescheduled, so one session produced about 61 stack traces a minute and
 * the operator's two produced about 120.
 *
 * WHAT THE FIX IS, IN THIS FILE'S HALF. Main now answers with `hasPane: false`
 * instead of throwing. The surface keeps that answer, stops the poll, and stays
 * stopped for the life of the mount. A restore builds a new surface, so a pane
 * that comes back starts polling again.
 *
 * THE NUMBERS ARE ASSERTED, NOT DESCRIBED. The first two tests drive the same
 * 60,000 ms of fake time against the two answers and state both counts, being
 * 1 and 61. Asserting only the small number would pass just as well if the
 * surface were broken outright, so the old shape's count is asserted beside it.
 *
 * WHAT THIS FILE IS NOT. It is not a screenshot and it is not a live drive.
 * What a person sees, and what the real app's console prints, is the
 * verifier's build/probe-p95-scroll.mjs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import type { TerminalScrollState } from '@shared/ipc';

// ---------------------------------------------------------------------------
// The fake bridge and the fake window
// ---------------------------------------------------------------------------

/** Every call the surface made, by name. */
interface Counts {
  state: number;
  by: number;
  to: number;
  live: number;
  sendInput: number;
}

interface Harness {
  counts: Counts;
  /** Everything handed to `gmux.term.sendInput`, in arrival order. */
  typed: string[];
}

function stateOf(over: Partial<TerminalScrollState> = {}): TerminalScrollState {
  return {
    hasPane: true,
    position: 0,
    history: 0,
    rows: 0,
    inMode: false,
    innerAlt: false,
    innerMouse: false,
    ...over
  };
}

/**
 * Stand up `window.gmux` with a scroll bridge whose four verbs all resolve the
 * same answer, or all reject when `answer` is the string 'reject'.
 */
function harness(answer: TerminalScrollState | 'reject'): Harness {
  const counts: Counts = { state: 0, by: 0, to: 0, live: 0, sendInput: 0 };
  const typed: string[] = [];
  const reply = async (): Promise<TerminalScrollState> => {
    if (answer === 'reject') throw new Error('p95 transient failure');
    return answer;
  };
  vi.stubGlobal('window', {
    gmux: {
      scroll: {
        state: () => {
          counts.state += 1;
          return reply();
        },
        by: () => {
          counts.by += 1;
          return reply();
        },
        to: () => {
          counts.to += 1;
          return reply();
        },
        live: () => {
          counts.live += 1;
          return reply();
        }
      },
      term: {
        sendInput: (_id: string, data: string) => {
          counts.sendInput += 1;
          typed.push(data);
        }
      }
    }
  });
  return { counts, typed };
}

/**
 * A bridge that answers `hasPane: false` once and then fails every call after
 * it. That is the ordering the guard in `schedule()` exists for: two reads can
 * already be on the chain when the first one comes back with no session here,
 * and the second one's failure runs the catch that reschedules.
 */
function answerThenFail(): Harness {
  const counts: Counts = { state: 0, by: 0, to: 0, live: 0, sendInput: 0 };
  const typed: string[] = [];
  const reply = async (): Promise<TerminalScrollState> => {
    if (counts.state > 1) throw new Error('p95 failure after the answer');
    return stateOf({ hasPane: false });
  };
  vi.stubGlobal('window', {
    gmux: {
      scroll: {
        state: () => {
          counts.state += 1;
          return reply();
        },
        by: () => {
          counts.by += 1;
          return reply();
        },
        to: () => {
          counts.to += 1;
          return reply();
        },
        live: () => {
          counts.live += 1;
          return reply();
        }
      },
      term: {
        sendInput: (_id: string, data: string) => {
          counts.sendInput += 1;
          typed.push(data);
        }
      }
    }
  });
  return { counts, typed };
}

/** Only `rows` is read off the terminal by anything under test here. */
const TERM = { rows: 30 } as unknown as Terminal;

const { ScrollSurface } = await import('../surface');

/** Let the promise chain settle without moving the clock. */
async function settle(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

/**
 * Build a surface, start it, and let its first answer land. Returns the
 * surface so each test drives it further.
 */
async function started(): Promise<InstanceType<typeof ScrollSurface>> {
  const surface = new ScrollSurface('p95-session', TERM);
  surface.start();
  await settle();
  return surface;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// The count, both ways round
// ---------------------------------------------------------------------------

describe('the poll stops for a session with nothing to poll', () => {
  it('asks exactly once when the answer is hasPane false', async () => {
    const h = harness(stateOf({ hasPane: false }));
    const surface = await started();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(h.counts.state).toBe(1);
    surface.dispose();
  });

  it('asks 61 times in the same 60 seconds when a session answers', async () => {
    // This is the number the fix removes. It is asserted so the test above
    // cannot pass by the surface having stopped working altogether.
    const h = harness(stateOf({ hasPane: true }));
    const surface = await started();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(h.counts.state).toBe(61);
    surface.dispose();
  });

  it('keeps retrying when a call fails, because a failure is not an answer', async () => {
    // The catch in `enqueue` reschedules. Phase 95 must not turn a transient
    // tmux hiccup on a live local session into a permanent stop, and this is
    // the line that says so.
    const h = harness('reject');
    const surface = await started();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(h.counts.state).toBe(61);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The verbs after the answer
// ---------------------------------------------------------------------------

describe('after hasPane false the surface is quiet', () => {
  it('makes no call for scrollBy, scrollTo, scrollPages or the resize hold', async () => {
    const h = harness(stateOf({ hasPane: false }));
    const surface = await started();
    const before = h.counts.state;

    surface.scrollBy(5);
    surface.scrollTo(10);
    surface.scrollPages(1);
    surface.holdPositionAcrossResize();
    await vi.advanceTimersByTimeAsync(2_000);
    await settle();

    expect(h.counts.by).toBe(0);
    expect(h.counts.to).toBe(0);
    expect(h.counts.state).toBe(before);
    surface.dispose();
  });

  it('still types straight through, so a session over there stays usable', async () => {
    const h = harness(stateOf({ hasPane: false }));
    const surface = await started();

    surface.sendInput('x');
    await settle();

    expect(h.counts.sendInput).toBe(1);
    expect(h.typed).toEqual(['x']);
    expect(h.counts.live).toBe(0);
    surface.dispose();
  });

  it('swallows the wheel rather than handing it to xterm', async () => {
    // False cancels xterm's own handling. True would take xterm's
    // alternate-scroll branch, which emits `ESC O A` and `ESC O B`, and claude
    // and codex read those as prompt-history navigation.
    const h = harness(stateOf({ hasPane: false }));
    const surface = await started();
    const before = { ...h.counts };

    const handled = surface.handleWheel({
      deltaY: 120,
      deltaMode: 0
    } as unknown as WheelEvent);
    await vi.advanceTimersByTimeAsync(2_000);
    await settle();

    expect(handled).toBe(false);
    expect(h.counts).toEqual(before);
    surface.dispose();
  });

  it('arms no timer when a failure lands after the answer', async () => {
    // Two reads are on the chain. The first says there is no session here and
    // the second fails, which runs the catch in `enqueue`, which reschedules.
    // Without the guard in `schedule()` that catch would arm a timer and the
    // surface would be back on a clock it has no reason to be on. The count of
    // live timers is what says so, because the guard in `refresh()` would eat
    // the call that timer produced and hide it from a call count.
    const h = answerThenFail();
    const surface = new ScrollSurface('p95-session', TERM);
    surface.start();
    surface.refresh();
    await settle();

    expect(h.counts.state).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
    surface.dispose();
  });

  it('tells a subscriber once, and never again', async () => {
    const h = harness(stateOf({ hasPane: false }));
    const surface = new ScrollSurface('p95-session', TERM);
    const seen: boolean[] = [];
    surface.subscribe((view) => seen.push(view.hasPane));

    // The state before the first answer says true, so nothing is disabled
    // while that first call is still in flight.
    expect(seen).toEqual([true]);

    surface.start();
    await settle();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();

    expect(seen).toEqual([true, false]);
    expect(h.counts.state).toBe(1);
    surface.dispose();
  });
});
