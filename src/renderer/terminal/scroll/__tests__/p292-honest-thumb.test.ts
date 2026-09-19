/**
 * Phase 292 — the thumb says how far from live the reader is.
 *
 * THE FAULT THIS FILE PINS. Once the poll stopped re-scrolling a parked pane,
 * the text held still and the scrollbar began to lie about it. tmux answers
 * `#{scroll_position}` counted from the bottom AS IT WAS when the pane entered
 * copy mode, and `#{history_size}` live. The thumb was drawn from the first
 * over the second, a frozen number over a growing one, so with nothing moving
 * on screen the thumb crept DOWN toward live (531 to 601 px of an 810 px lane
 * in eight seconds, and 390.8 to 410.2 px under a stationary pointer during a
 * drag) while the reader was in fact getting FURTHER from live.
 *
 * THE MEASURED EXAMPLE EVERY NUMBER BELOW COMES FROM. A pane parked at
 * position 100 when the history read 375, held there while the agent printed
 * 140 lines and the history went to 515. The reader's distance from live went
 * 100 to 240, and tmux's position never moved.
 *
 * WHAT THIS FILE IS NOT. It is not the app run. What a person sees, on both
 * tmux binaries, with real wheel events and the screen as the ruler, is
 * `probe:p292`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import type { TerminalScrollState } from '@shared/ipc';
import {
  distanceFromLive,
  positionAtOffset,
  positionForDistance,
  thumbOffset
} from '../live-distance';

// ---------------------------------------------------------------------------
// The fake bridge: one answer every verb gives, and the test moves it
// ---------------------------------------------------------------------------

function stateOf(over: Partial<TerminalScrollState> = {}): TerminalScrollState {
  return {
    hasPane: true,
    position: 0,
    history: 0,
    rows: 40,
    // Phase 292. The size an answer was taken at; a resize test changes it.
    cols: 120,
    // Phase 292. What tmux 3.6a answers: it does not say the frame's depth,
    // so the surface infers it. The describe for a tmux that says (3.7b) sets it.
    frameHistory: null,
    inMode: false,
    innerAlt: false,
    innerMouse: false,
    ...over
  };
}

interface Bridge {
  /** What the next call answers. A test assigns it between gestures. */
  answer: TerminalScrollState;
  /** Every position handed to `scroll.to`, in order. */
  sentTo: number[];
  /** Every string handed to `term.sendInput`, in order. */
  typed: string[];
  calls: { state: number; by: number; to: number; live: number };
}

function bridge(first: TerminalScrollState): Bridge {
  const b: Bridge = {
    answer: first,
    sentTo: [],
    typed: [],
    calls: { state: 0, by: 0, to: 0, live: 0 }
  };
  vi.stubGlobal('window', {
    gmux: {
      scroll: {
        state: async () => {
          b.calls.state += 1;
          return b.answer;
        },
        by: async () => {
          b.calls.by += 1;
          return b.answer;
        },
        to: async (input: { position: number }) => {
          b.calls.to += 1;
          b.sentTo.push(input.position);
          return b.answer;
        },
        live: async () => {
          b.calls.live += 1;
          return b.answer;
        }
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

const TERM = { rows: 40 } as unknown as Terminal;

const { ScrollSurface, forgetParkedFramesForTests } = await import('../surface');

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

async function started(): Promise<InstanceType<typeof ScrollSurface>> {
  const surface = new ScrollSurface('p292-session', TERM);
  surface.start();
  await settle();
  return surface;
}

beforeEach(() => {
  vi.useFakeTimers();
  // A surface disposed while parked leaves its frame for the next mount of
  // the same session (`leftParked`), and every test here uses one session.
  forgetParkedFramesForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// The number
// ---------------------------------------------------------------------------

describe('distanceFromLive', () => {
  it('is 0 for a live pane, whatever the history says', () => {
    expect(
      distanceFromLive({ position: 0, history: 515, historyAtEntry: null })
    ).toBe(0);
    // A stale entry number on a live pane changes nothing either.
    expect(
      distanceFromLive({ position: 0, history: 515, historyAtEntry: 375 })
    ).toBe(0);
  });

  it('is the position alone while nothing has been printed since the park', () => {
    expect(
      distanceFromLive({ position: 100, history: 375, historyAtEntry: 375 })
    ).toBe(100);
  });

  it('adds what was printed since: 100 becomes 240 as 375 becomes 515', () => {
    expect(
      distanceFromLive({ position: 100, history: 515, historyAtEntry: 375 })
    ).toBe(240);
  });

  it('falls back to the position when the entry was never seen', () => {
    expect(
      distanceFromLive({ position: 100, history: 515, historyAtEntry: null })
    ).toBe(100);
  });

  it('never goes under the position when the history shrank after a trim', () => {
    expect(
      distanceFromLive({ position: 100, history: 300, historyAtEntry: 375 })
    ).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// The surface keeps the entry number, from every kind of answer
// ---------------------------------------------------------------------------

describe('the surface records the history the pane was parked at', () => {
  it('is null while live', async () => {
    bridge(stateOf({ history: 375 }));
    const surface = await started();
    expect(surface.view.historyAtEntry).toBeNull();
    surface.dispose();
  });

  it('takes it from a WHEEL answer on the 0 to >0 transition', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();

    b.answer = stateOf({ position: 5, history: 375, inMode: true });
    surface.scrollBy(5);
    await settle();

    expect(b.calls.by).toBe(1);
    expect(surface.view.historyAtEntry).toBe(375);
    surface.dispose();
  });

  it('takes it from a DRAG answer on the 0 to >0 transition', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();

    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    surface.scrollTo(100);
    await settle();

    expect(b.calls.to).toBe(1);
    expect(surface.view.historyAtEntry).toBe(375);
    surface.dispose();
  });

  it('takes it from a POLL answer on the 0 to >0 transition', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    const before = b.calls.state;

    // Nothing this surface did parked the pane. The next poll finds it so.
    b.answer = stateOf({ position: 100, history: 380, inMode: true });
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();

    expect(b.calls.state).toBe(before + 1);
    expect(b.calls.by + b.calls.to).toBe(0);
    expect(surface.view.historyAtEntry).toBe(380);
    surface.dispose();
  });

  it('keeps it while parked, so the growth is what the view reports', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    surface.scrollTo(100);
    await settle();

    // The measured example: position held at 100, history 375 to 515.
    b.answer = stateOf({ position: 100, history: 515, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();

    expect(surface.view.position).toBe(100);
    expect(surface.view.history).toBe(515);
    expect(surface.view.historyAtEntry).toBe(375);
    expect(distanceFromLive(surface.view)).toBe(240);
    surface.dispose();
  });

  it('tells a subscriber the entry number with the view that carries it', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    const seen: (number | null | undefined)[] = [];
    surface.subscribe((view) => seen.push(view.historyAtEntry));

    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    surface.scrollTo(100);
    await settle();

    expect(seen).toEqual([null, 375]);
    surface.dispose();
  });

  it('clears it when the position returns to 0', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    surface.scrollTo(100);
    await settle();
    expect(surface.view.historyAtEntry).toBe(375);

    b.answer = stateOf({ position: 0, history: 515 });
    surface.scrollTo(0);
    await settle();
    expect(surface.view.historyAtEntry).toBeNull();

    // And the next park is a new frame with its own number.
    b.answer = stateOf({ position: 20, history: 515, inMode: true });
    surface.scrollBy(20);
    await settle();
    expect(surface.view.historyAtEntry).toBe(515);
    expect(distanceFromLive(surface.view)).toBe(20);
    surface.dispose();
  });

  it('does not take the entry from an alternate-screen answer, whose history is 0 by design', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();

    b.answer = stateOf({
      position: 100,
      history: 0,
      inMode: true,
      innerAlt: true
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    expect(surface.view.historyAtEntry).toBeNull();

    b.answer = stateOf({ position: 100, history: 400, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(surface.view.historyAtEntry).toBe(400);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The thumb
// ---------------------------------------------------------------------------

describe('the thumb', () => {
  const parked = { position: 100, history: 375, historyAtEntry: 375 };
  const later = { position: 100, history: 515, historyAtEntry: 375 };
  const TRAVEL = 700;

  it('moves UP, away from live, when only the history grows', () => {
    const before = thumbOffset(parked, TRAVEL);
    const after = thumbOffset(later, TRAVEL);
    // The measured lie went the other way: 531 px to 601 px, toward live,
    // which is what `1 - position / history` does as the history grows.
    const theLieBefore = (1 - parked.position / parked.history) * TRAVEL;
    const theLieAfter = (1 - later.position / later.history) * TRAVEL;
    expect(theLieAfter).toBeGreaterThan(theLieBefore);

    expect(after).toBeLessThan(before);
    expect(before).toBeCloseTo((1 - 100 / 375) * TRAVEL, 6);
    expect(after).toBeCloseTo((1 - 240 / 515) * TRAVEL, 6);
  });

  it('moves by the growth and by nothing else', () => {
    expect(distanceFromLive(later) - distanceFromLive(parked)).toBe(
      later.history - parked.history
    );
  });

  it('parks at the bottom of the lane while live and with nothing to scroll', () => {
    expect(
      thumbOffset({ position: 0, history: 515, historyAtEntry: null }, TRAVEL)
    ).toBe(TRAVEL);
    expect(
      thumbOffset({ position: 0, history: 0, historyAtEntry: null }, TRAVEL)
    ).toBe(TRAVEL);
  });

  it('stops at the top of the lane when the distance passes what the history holds', () => {
    // A full history stops growing while lines still print, and a trim can
    // leave the frozen frame longer than the live one.
    expect(
      thumbOffset({ position: 400, history: 300, historyAtEntry: 375 }, TRAVEL)
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The drag
// ---------------------------------------------------------------------------

describe('a drag maps a pixel to a distance from live, then to tmux', () => {
  const later = { position: 100, history: 515, historyAtEntry: 375 };
  const SPAN = 700;

  it('sends the position the thumb is drawn at when dropped on the thumb', () => {
    const top = thumbOffset(later, SPAN);
    expect(positionAtOffset(later, top, SPAN)).toBe(100);
  });

  it('takes the growth off: distance 240 is tmux position 100', () => {
    expect(positionForDistance(later, 240)).toBe(100);
    expect(positionForDistance(later, 300)).toBe(160);
  });

  it('sends the top of the FROZEN frame for the top of the lane, never the live history', () => {
    // The old map sent 515 and tmux clamped it to 375 without saying so.
    expect(positionAtOffset(later, 0, SPAN)).toBe(375);
    expect(positionForDistance(later, 9_999)).toBe(375);
  });

  it('still sends 0 for the very bottom, which leaves copy mode', () => {
    expect(positionAtOffset(later, SPAN, SPAN)).toBe(0);
    expect(positionForDistance(later, 0)).toBe(0);
  });

  it('holds at the bottom of the frozen frame for lines printed since the park', () => {
    // Distances 1 to 140 are lines the frozen frame does not contain. Only
    // the very bottom leaves copy mode, so these stay at position 1.
    expect(positionForDistance(later, 1)).toBe(1);
    expect(positionForDistance(later, 140)).toBe(1);
    expect(positionForDistance(later, 141)).toBe(1);
    expect(positionForDistance(later, 142)).toBe(2);
    expect(positionAtOffset(later, SPAN - 1, SPAN)).toBe(1);
  });

  it('is the old map exactly while there is no growth and while live', () => {
    const fresh = { position: 100, history: 375, historyAtEntry: 375 };
    const live = { position: 0, history: 375, historyAtEntry: null };
    for (const top of [0, 1, 123.4, 350, 699, 700]) {
      const old = Math.round((1 - top / SPAN) * 375);
      expect(positionAtOffset(fresh, top, SPAN)).toBe(old);
      expect(positionAtOffset(live, top, SPAN)).toBe(old);
    }
  });

  it('sends what the surface was handed, end to end', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    surface.scrollTo(100);
    await settle();
    b.answer = stateOf({ position: 100, history: 515, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();

    // The scrollbar's own two lines: a pixel, then the surface.
    surface.scrollTo(positionAtOffset(surface.view, 0, SPAN));
    await settle();
    expect(b.sentTo).toEqual([100, 375]);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The poll is for the thumb now, at the cadence it had before
// ---------------------------------------------------------------------------

describe('the poll while parked', () => {
  it('asks 41 times in 10 seconds, which is 250 ms and not 100', async () => {
    const b = bridge(stateOf({ position: 100, history: 375, inMode: true }));
    const surface = await started();
    await vi.advanceTimersByTimeAsync(10_000);
    await settle();
    // 1 at the start and 40 ticks. At 100 ms this reads 101.
    expect(b.calls.state).toBe(41);
    // And it is a bare read: nothing is scrolled by the poll.
    expect(b.calls.by + b.calls.to + b.calls.live).toBe(0);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// A resize rewraps the history without a line being printed
// ---------------------------------------------------------------------------

/**
 * THE RULE THESE PIN, and the two the fix round replaced.
 *
 * A change of width rewraps the history and a change of height moves rows
 * between the screen and the history, so `history` moves without a line being
 * printed. The entry is re-based across an answer pair whose SIZE differs, and
 * only there; two answers at one size are growth, however soon after a resize.
 *
 * Replaced: the surface re-sent the pre-resize position 300 ms after every
 * resize (`holdPositionAcrossResize`, Phase 12.11). `#{scroll_position}` counts
 * ROWS, so over soft-wrapped lines the same number is a different place, and
 * that re-send threw a reader parked 720 rows back 127 lines on every change of
 * width (the attack verifier's `wrapq` arm), where tmux alone had the line
 * exactly right. main now keeps tmux's copy cursor on the top row and tmux
 * keeps that line itself (src/main/tmux/scroll.ts, `cursorToTopRow`).
 * And replaced: the entry was re-based on EVERY answer until 300 ms after the
 * last resize, which dropped 8 lines from the distance on one step and 84 on a
 * five second window drag (the re-derive verifier's P2).
 */
describe('a resize while parked', () => {
  async function parkedWithGrowth(): Promise<{
    b: Bridge;
    surface: InstanceType<typeof ScrollSurface>;
  }> {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    surface.scrollTo(100);
    await settle();
    b.answer = stateOf({ position: 100, history: 515, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(distanceFromLive(surface.view)).toBe(240);
    return { b, surface };
  }

  it('carries the growth across a rewrap, so the thumb does not jump by it', async () => {
    const { b, surface } = await parkedWithGrowth();

    // The window narrows, 120 to 100 columns: 515 lines rewrap to 560 and
    // tmux re-counts the rows below the reader, 100 to 58, without a line
    // being printed.
    b.answer = stateOf({ position: 58, history: 560, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    // Read as growth this would be 58 + 185. It is a rewrap, so 58 + 140.
    expect(surface.view.historyAtEntry).toBe(420);
    expect(distanceFromLive(surface.view)).toBe(198);
    surface.dispose();
  });

  it('sends tmux nothing on a resize: the park is the only position ever sent', async () => {
    const { b, surface } = await parkedWithGrowth();
    b.answer = stateOf({ position: 58, history: 560, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(2_000);
    await settle();
    expect(b.sentTo).toEqual([100]);
    expect(b.calls.by).toBe(0);
    expect(b.calls.live).toBe(0);
    surface.dispose();
  });

  it('counts two answers at the new size as growth, from the very next poll', async () => {
    const { b, surface } = await parkedWithGrowth();
    b.answer = stateOf({ position: 58, history: 560, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(distanceFromLive(surface.view)).toBe(198);

    // 250 ms after the resize, four lines printed at the new width. The rule
    // this replaced re-based on every answer for 300 ms after a resize and
    // dropped these; they are the reader's distance and they count.
    b.answer = stateOf({ position: 58, history: 564, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(surface.view.historyAtEntry).toBe(420);
    expect(distanceFromLive(surface.view)).toBe(202);
    surface.dispose();
  });

  it('re-bases on a change of height alone, which moves rows into the history', async () => {
    const { b, surface } = await parkedWithGrowth();
    // 40 rows become 33: seven rows of the screen join the history.
    b.answer = stateOf({ position: 107, history: 522, rows: 33, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(surface.view.historyAtEntry).toBe(382);
    expect(distanceFromLive(surface.view)).toBe(247);
    surface.dispose();
  });

  it('loses AT MOST what printed between the last answer at one size and the first at the next, the stated limit', async () => {
    const { b, surface } = await parkedWithGrowth();
    // Five lines printed across the resize, beside a rewrap of forty. One
    // answer pair cannot tell the two apart, so all 45 are read as rewrap
    // and the five are lost for the rest of this park, as the comment on
    // `noteEntry` says.
    b.answer = stateOf({ position: 58, history: 560, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(distanceFromLive(surface.view)).toBe(198);
    // Whatever the next answers say, the loss does not grow: this is one
    // change of size, and it cost one pair.
    for (const history of [570, 590, 640]) {
      b.answer = stateOf({ position: 58, history, cols: 100, inMode: true });
      await vi.advanceTimersByTimeAsync(250);
      await settle();
      expect(distanceFromLive(surface.view)).toBe(58 + (history - 420));
    }
    surface.dispose();
  });

  it('keeps the frame when tmux itself walks the view to 0 and stays in copy mode', async () => {
    const { b, surface } = await parkedWithGrowth();

    b.answer = stateOf({ position: 0, history: 515, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(surface.view.historyAtEntry).toBe(375);

    // The next ordinary answer is at the new size, and the growth the last
    // ordinary answer carried (140) comes across with it. At position 0 the
    // poll is on its live cadence, a second.
    b.answer = stateOf({ position: 100, history: 515, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    expect(distanceFromLive(surface.view)).toBe(240);
    surface.dispose();
  });

  it('starts a NEW frame after a reader went live on purpose, and counts its growth', async () => {
    const { b, surface } = await parkedWithGrowth();

    b.answer = stateOf({ position: 0, history: 515, cols: 100, inMode: false });
    surface.sendInput('x');
    await settle();
    expect(surface.view.historyAtEntry).toBeNull();

    // Parked again at the new size. Nothing of the old frame is carried.
    b.answer = stateOf({ position: 20, history: 530, cols: 100, inMode: true });
    surface.scrollBy(20);
    await settle();
    expect(surface.view.historyAtEntry).toBe(530);
    b.answer = stateOf({ position: 20, history: 545, cols: 100, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(distanceFromLive(surface.view)).toBe(35);
    expect(b.sentTo).toEqual([100]);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// A tmux that SAYS the frame's depth (3.7 and later, the bundled 3.7b)
// ---------------------------------------------------------------------------

/**
 * Everything above infers the entry, because tmux 3.6a does not say it. tmux
 * 3.7b answers `#{copy_position_limit}`, the depth of the frame copy mode
 * froze, and main hands it over as `frameHistory`. Then the entry is that
 * number, exactly, and none of the inference's limits apply.
 */
describe('on a tmux that says how deep the frozen frame is', () => {
  it('takes the frame, not the history of the answer, even when a burst landed in between', async () => {
    // Measured on a scratch server printing in bursts of 50: the history read
    // right after the park was 50 lines deeper than the frame.
    const b = bridge(stateOf({ history: 2781 }));
    const surface = await started();
    b.answer = stateOf({ position: 40, history: 2881, frameHistory: 2831, inMode: true });
    surface.scrollBy(40);
    await settle();
    expect(surface.view.historyAtEntry).toBe(2831);
    expect(distanceFromLive(surface.view)).toBe(90);
    surface.dispose();
  });

  it('follows tmux across a rewrap and loses nothing printed across it', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    b.answer = stateOf({ position: 100, history: 375, frameHistory: 375, inMode: true });
    surface.scrollTo(100);
    await settle();
    // Narrowed, and five lines printed across it: tmux re-counts both.
    b.answer = stateOf({
      position: 180,
      history: 675,
      frameHistory: 670,
      cols: 60,
      inMode: true
    });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(surface.view.historyAtEntry).toBe(670);
    expect(distanceFromLive(surface.view)).toBe(185);
    surface.dispose();
  });

  it('needs nothing handed over by an unmounted surface, so a relaunch is exact too', async () => {
    const b = bridge(stateOf({ position: 100, history: 900, frameHistory: 375, inMode: true }));
    const surface = await started();
    expect(b.calls.state).toBe(1);
    expect(surface.view.historyAtEntry).toBe(375);
    expect(distanceFromLive(surface.view)).toBe(625);
    surface.dispose();
  });

  it('is still null once the pane is live', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const surface = await started();
    b.answer = stateOf({ position: 100, history: 375, frameHistory: 375, inMode: true });
    surface.scrollTo(100);
    await settle();
    b.answer = stateOf({ position: 0, history: 400 });
    surface.scrollTo(0);
    await settle();
    expect(surface.view.historyAtEntry).toBeNull();
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// A pane left parked by a surface that unmounted (going to another session)
// ---------------------------------------------------------------------------

/**
 * Going to another session unmounts the pane and tmux keeps it scrolled back.
 * MEASURED 2026-09-19 in the app (the attack verifier's `switch` arm, tmux
 * 3.7b and 3.6a): parked 100 back, five seconds away while 20 lines a second
 * printed, and back: top line 462 at both ends, and the thumb 0 px from where
 * the reader is, 313 lines from live. The new surface adopts the frame the
 * old one left, which is what these pin.
 */
describe('a surface that mounts over a pane another surface left parked', () => {
  it('keeps the frame, so everything printed while away counts', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const first = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    first.scrollTo(100);
    await settle();
    b.answer = stateOf({ position: 100, history: 515, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    first.dispose();

    // Away for a while: 125 more lines. The new surface's first answer.
    b.answer = stateOf({ position: 100, history: 640, inMode: true });
    const second = await started();
    expect(second.view.historyAtEntry).toBe(375);
    expect(distanceFromLive(second.view)).toBe(365);
    second.dispose();
  });

  it('carries a change of size made while away as a rewrap, not as output', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const first = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    first.scrollTo(100);
    await settle();
    b.answer = stateOf({ position: 100, history: 515, inMode: true });
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    first.dispose();

    b.answer = stateOf({ position: 58, history: 560, cols: 100, inMode: true });
    const second = await started();
    expect(second.view.historyAtEntry).toBe(420);
    expect(distanceFromLive(second.view)).toBe(198);
    second.dispose();
  });

  it('drops the frame the moment an answer says the pane is live', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const first = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    first.scrollTo(100);
    await settle();
    first.dispose();

    b.answer = stateOf({ position: 0, history: 700 });
    const second = await started();
    expect(second.view.historyAtEntry).toBeNull();
    second.dispose();

    // A later park is a frame of its own, not the one left behind.
    b.answer = stateOf({ position: 10, history: 700, inMode: true });
    const third = await started();
    expect(third.view.historyAtEntry).toBe(700);
    third.dispose();
  });

  it('leaves nothing behind for a surface disposed while live', async () => {
    bridge(stateOf({ history: 375 }));
    const first = await started();
    first.dispose();
    const b = bridge(stateOf({ position: 30, history: 900, inMode: true }));
    const second = await started();
    expect(b.calls.state).toBe(1);
    expect(second.view.historyAtEntry).toBe(900);
    second.dispose();
  });

  it('is kept per session', async () => {
    const b = bridge(stateOf({ history: 375 }));
    const first = await started();
    b.answer = stateOf({ position: 100, history: 375, inMode: true });
    first.scrollTo(100);
    await settle();
    first.dispose();

    b.answer = stateOf({ position: 100, history: 640, inMode: true });
    const other = new ScrollSurface('p292-other-session', TERM);
    other.start();
    await settle();
    expect(other.view.historyAtEntry).toBe(640);
    other.dispose();
  });
});

// ---------------------------------------------------------------------------
// A report the pane sends about itself is not a keystroke
// ---------------------------------------------------------------------------

describe('sendReport and sendInput on a parked pane', () => {
  const FOREGROUND = '\u001b]10;rgb:d8d8/dbdb/e2e2\u001b\\';
  const DA1 = '\u001b[?1;2c';

  it('a report is forwarded and the reader stays where they are', async () => {
    const b = bridge(stateOf({ position: 100, history: 375, inMode: true }));
    const surface = await started();
    surface.sendReport(FOREGROUND);
    surface.sendReport(DA1);
    await settle();
    expect(b.typed).toEqual([FOREGROUND, DA1]);
    expect(b.calls.live).toBe(0);
    surface.dispose();
  });

  it('a keystroke still takes the reader to live first, then goes', async () => {
    const b = bridge(stateOf({ position: 100, history: 375, inMode: true }));
    const surface = await started();
    b.answer = stateOf({ position: 0, history: 380 });
    surface.sendInput('x');
    await settle();
    expect(b.calls.live).toBe(1);
    expect(b.typed).toEqual(['x']);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The wheel of a pane parked BEFORE its program opened the alternate screen
// ---------------------------------------------------------------------------

describe('the wheel over a program on its alternate screen', () => {
  const NOTCH = { deltaY: -5, deltaMode: 1 } as unknown as WheelEvent;

  it('is the program\'s while the pane is live', async () => {
    const b = bridge(stateOf({ history: 0, innerAlt: true }));
    const surface = await started();
    expect(surface.handleWheel(NOTCH)).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(b.calls.by).toBe(0);
    surface.dispose();
  });

  it('stays the reader\'s once the pane is parked, and scrolls the frozen frame', async () => {
    // Main keeps reporting the frame's history for a parked pane
    // (src/main/tmux/scroll.ts, `parseState`), so the thumb stays drawn.
    const b = bridge(
      stateOf({ position: 100, history: 434, inMode: true, innerAlt: true })
    );
    const surface = await started();
    expect(surface.view.history).toBe(434);
    // False is "handled here": xterm does not turn it into ESC O A, which
    // would leave copy mode and hand the program an arrow key.
    expect(surface.handleWheel(NOTCH)).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(b.calls.by).toBe(1);
    expect(b.calls.live).toBe(0);
    surface.dispose();
  });
});

// ---------------------------------------------------------------------------
// The call sites, read as text
// ---------------------------------------------------------------------------

describe('where the numbers are used', () => {
  const HERE = join(__dirname, '..');

  it('the scrollbar draws and drags through the helper, and names neither old formula', () => {
    const text = readFileSync(join(HERE, 'TerminalScrollbar.tsx'), 'utf8');
    expect(text).toContain('thumbOffset(');
    expect(text).toContain('positionAtOffset(');
    expect(text).not.toMatch(/view\.position\s*\/\s*view\.history/);
    expect(text).not.toMatch(/\*\s*view\.history\)/);
    // What a screen reader is told is the same distance the thumb draws.
    expect(text).toContain('aria-valuenow={Math.max(0, view.history - distance)}');
  });

  it('nothing in the renderer re-sends a position after a resize', async () => {
    // The hold that did is deleted and must stay deleted: see this file's
    // resize describe. The method is gone from the surface...
    bridge(stateOf({ history: 375 }));
    const surface = await started();
    expect('holdPositionAcrossResize' in surface).toBe(false);
    surface.dispose();
    // ...and no source that could call it names it in code.
    for (const file of [
      join(HERE, 'surface.ts'),
      join(HERE, 'TerminalScrollbar.tsx'),
      join(HERE, '..', 'TerminalPane.tsx')
    ]) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      expect([file, code.includes('holdPositionAcrossResize')]).toEqual([file, false]);
      expect([file, /RESIZE_SETTLE_MS/.test(code)]).toEqual([file, false]);
    }
  });

  it('the resize handler sends the resize and nothing that scrolls', () => {
    const text = readFileSync(join(HERE, '..', 'TerminalPane.tsx'), 'utf8');
    const at = text.indexOf('term.onResize(');
    expect(at).toBeGreaterThan(-1);
    const open = text.indexOf('{', text.indexOf('=>', at));
    let depth = 0;
    let end = open;
    for (let i = open; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      if (text[i] === '}') depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    const body = text.slice(open, end + 1);
    expect(body).toContain('gmux.sessions.resize(');
    expect(body).not.toMatch(/scroll\.(?:scrollTo|scrollBy|scrollPages)\(/);
  });
});

// ---------------------------------------------------------------------------
// The seam: probe:p292's ruler and the shipped helper are ONE formula
// ---------------------------------------------------------------------------

/**
 * The integrator's pin. `build/p292/probe-p292.mjs` restates the formula BY
 * VALUE, on purpose, so that the app run does not judge the helper with the
 * helper. That is two spellings of one rule, and two spellings drift. The
 * probe cannot be imported (it runs, and exits, at the top level), so its two
 * functions are read out of its text by matching braces and asked the same
 * questions as the shipped ones.
 */
describe("probe:p292's ruler is the shipped formula", () => {
  const probe = readFileSync(
    join(__dirname, '..', '..', '..', '..', '..', 'build', 'p292', 'probe-p292.mjs'),
    'utf8'
  );

  function probeFunction<T>(name: string): T {
    const at = probe.indexOf(`export function ${name}(`);
    expect(at).toBeGreaterThan(-1);
    const open = probe.indexOf('{', probe.indexOf(')', at));
    let depth = 0;
    for (let i = open; i < probe.length; i += 1) {
      if (probe[i] === '{') depth += 1;
      else if (probe[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          const source = probe.slice(at + 'export '.length, i + 1);
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          return new Function(`${source}; return ${name};`)() as T;
        }
      }
    }
    throw new Error(`${name} has no closing brace in the probe`);
  }

  type View = { position: number; history: number; historyAtEntry: number | null };
  const probeDistance = probeFunction<(view: View) => number>('distanceFromLive');
  const probeThumbTop = probeFunction<
    (distance: number, history: number, thumbH: number, laneH: number) => number
  >('honestThumbTop');

  const LANE = 810;
  const THUMB = 58.9;
  const views: View[] = [];
  for (const position of [0, 1, 100, 363, 375, 400, 30_000]) {
    for (const history of [0, 1, 300, 375, 515, 25_000]) {
      for (const historyAtEntry of [null, 0, 363, 375, 600]) {
        views.push({ position, history, historyAtEntry });
      }
    }
  }

  it('answers the same distance at every point of the table, the limits included', () => {
    for (const view of views) {
      expect([view, distanceFromLive(view)]).toEqual([view, probeDistance(view)]);
    }
  });

  it('draws the thumb where the probe expects it, to a billionth of a pixel', () => {
    for (const view of views) {
      const expected = probeThumbTop(probeDistance(view), view.history, THUMB, LANE);
      expect(thumbOffset(view, LANE - THUMB)).toBeCloseTo(expected, 9);
    }
  });

  it('a drop on the drawn thumb sends the position it was drawn from, so the drag round-trips', () => {
    // Inside the frozen frame, which is 1 to the history at entry, with a
    // history that did not shrink. Outside it the map clamps, and those
    // clamps are pinned one by one in the drag's own describe above.
    let asked = 0;
    for (const historyAtEntry of [50, 375, 5_000]) {
      for (const growth of [0, 1, 140, 20_000]) {
        for (const position of [1, 2, Math.floor(historyAtEntry / 2), historyAtEntry - 1, historyAtEntry]) {
          for (const span of [97.3, 700, 751.1]) {
            const view = { position, history: historyAtEntry + growth, historyAtEntry };
            expect([view, span, positionAtOffset(view, thumbOffset(view, span), span)]).toEqual([
              view,
              span,
              position
            ]);
            asked += 1;
          }
        }
      }
    }
    expect(asked).toBe(180);
  });
});
