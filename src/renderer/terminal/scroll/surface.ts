/**
 * The scroll surface of one session — Phase 12.3.
 *
 * MEASURED (2026-08-10, tmux 3.6a + @xterm/xterm 6):
 * `tmux attach` opens with `ESC[?1049h`, so xterm.js is in its ALTERNATE
 * buffer for every gmux pane and `buffer.hasScrollback` is false. xterm's own
 * wheel listener then takes its alternate-scroll branch and emits `ESC O A` /
 * `ESC O B` — which claude and codex read as prompt-history navigation ("it
 * thinks I'm focused in the input box") and a shell reads as command history.
 * No pane in gmux has ever had a working wheel; the shell only LOOKED better
 * because its cursor keys are harmless.
 *
 * The real scrollback is tmux's server-side history, 25,000 lines by default
 * and up to 100,000 by the Scrollback depth setting, so this
 * controller drives tmux copy-mode over IPC and reports the geometry the
 * scrollbar draws. Three wheel routes, decided from the state of the app
 * INSIDE the pane (never from the attach client's own alt-buffer flag, which
 * is always on):
 *
 *   innerMouse  the app asked for mouse reporting (a picker, `vim -c 'set
 *               mouse=a'`)              → let xterm send the SGR report
 *   innerAlt    alternate screen, no mouse (plain vim)  → let xterm send its
 *               cursor keys, which is what scrolls that app's own buffer.
 *               copy-mode there shows blank `~` rows — measured — because an
 *               alt screen never enters tmux history
 *   otherwise   normal buffer: shells, claude, codex → gmux scrolls tmux
 *               history and the wheel finally means "show me what scrolled by"
 *
 * The first two routes are `view.owned === false`, and the rule is the WHEEL's
 * only by accident of which gesture came first. ./drag-select.ts reads the
 * same flag for the same reason, so a drag held at the edge of a pane whose
 * program asked for the mouse scrolls nothing either.
 *
 * ONE EXCEPTION, Phase 292: A PANE THAT IS ALREADY SCROLLED BACK keeps its
 * wheel whatever the program inside it does next. What is on screen then is
 * the frame tmux froze when the reader scrolled, not the program's screen, so
 * the wheel scrolls that frame. MEASURED 2026-09-18: parked 100 back, the
 * program opened its alternate screen, the text held at "line 362", and one
 * wheel notch was handed to xterm, which sent `ESC O A`, which left copy mode
 * and gave the program an arrow key nobody pressed. `handleWheel` reads
 * `inMode` for this, and main keeps reporting the frame's history while the
 * pane is parked (src/main/tmux/scroll.ts, `parseState`), so the thumb stays.
 */

import type { Terminal } from '@xterm/xterm';
import type { InstalledGmuxApi, TerminalScrollState } from '@shared/ipc';
import { measureCells, screenElement } from '../capture/metrics';
import { gmuxBridge } from '../../bridge';
import { growthSinceEntry } from './live-distance';

/** Poll cadence while the pane shows live output — keeps the thumb honest. */
const LIVE_POLL_MS = 1000;
/**
 * Poll cadence while the pane is scrolled back, and during a scrollbar drag.
 *
 * Phase 292. THIS POLL CORRECTS NOTHING. It used to be the tick that
 * re-scrolled a parked pane, and that correction was the defect: tmux holds a
 * parked view still by itself, so the text stays where the reader put it
 * whatever this number is. The top line read 261 at all 33 samples over eight
 * seconds with the correction gone, on tmux 3.6a and 3.7b.
 *
 * What the poll is for now is two things. It FEEDS THE THUMB: the live
 * history grows under a parked reader, and the scrollbar draws their distance
 * from live out of that growth (./live-distance.ts). And it NOTICES THE PANE
 * LEAVING COPY MODE by a road that did not pass through this surface, so the
 * thumb drops to the bottom and typing stops being held back for a cancel.
 *
 * A quarter of a second is a thumb that moves four times a second, which is
 * plenty for something nobody is reading closely, at one `display-message` a
 * tick. The 100 ms this briefly carried was tuned for the deleted correction,
 * where the interval was the wobble, and buys nothing a person can see.
 */
const SCROLLED_POLL_MS = 250;
/** Wheel deltas are batched over this window into ONE tmux scroll command. */
const WHEEL_COALESCE_MS = 16;

/** What the scrollbar and the wheel router need to know. */
export interface ScrollView {
  /**
   * tmux's `#{scroll_position}`; 0 = live output.
   *
   * Phase 292. While parked this counts from the bottom of the frame tmux
   * FROZE when the pane entered copy mode, not from the live bottom, so it
   * holds still while the agent writes. How far from live the reader really
   * is comes from `distanceFromLive` in ./live-distance.ts.
   */
  position: number;
  /** Scrollback lines above the LIVE screen. It grows under a parked reader. */
  history: number;
  /**
   * Phase 292. `history` as the first answer reported it when `position` went
   * from 0 to above 0, which is the frozen frame's own depth. Null while live,
   * and null again when the position returns to 0.
   */
  historyAtEntry: number | null;
  /** Visible rows. */
  rows: number;
  /** The pane is showing live output. */
  atLive: boolean;
  /** gmux owns this pane's wheel (normal buffer, no inner mouse tracking). */
  owned: boolean;
  /**
   * A session on THIS Mac answered the last poll (Phase 95).
   *
   * True before the first answer arrives, so nothing is disabled while the
   * first call is in flight. It goes false once and stays false for the life
   * of this surface, which is what stops the poll.
   */
  hasPane: boolean;
}

const EMPTY: TerminalScrollState = {
  // Phase 95. The state before the first answer. True, because the surface
  // must not disable itself while its first call is still in flight.
  hasPane: true,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

/**
 * The optional scroll bridge, or null on a preload that predates it (the
 * pane then simply has no gmux scroll surface). Exported because the
 * screenshot harness reads the same surface to assert the wheel moved
 * history — one accessor, not a second cast.
 */
export function scrollBridge(): NonNullable<InstalledGmuxApi['scroll']> | null {
  return gmuxBridge()?.scroll ?? null;
}

/**
 * The last ordinary answer about a parked pane: the numbers the NEXT answer is
 * compared with to tell lines printed from a rewrap. See `noteEntry`.
 */
interface SeenFrame {
  history: number;
  cols: number;
  rows: number;
}

/**
 * What a surface knew about a pane it left PARKED — Phase 292.
 *
 * A surface is built per mount, and going to another session and back unmounts
 * the pane while tmux keeps it scrolled back. The new surface never saw the
 * park, so it would take the first history it reads as the entry and draw the
 * reader closer to live than they are, by everything printed since the park
 * and while they were away. MEASURED 2026-09-18 with the pane printing 20
 * lines a second: five seconds away is a hundred lines the thumb never knew.
 *
 * Kept per session, written at `dispose` when the pane is parked, adopted by
 * the first parked answer the next surface hears, and dropped the moment an
 * answer says the pane is live. It is renderer memory and nothing else: it
 * does not survive a relaunch, where the limit in ./live-distance.ts stands.
 * All of this is for a tmux that does not say the frame's depth (3.6a): on
 * one that does, the first answer the new surface hears carries the frame and
 * nothing handed over is needed.
 */
const leftParked = new Map<string, { historyAtEntry: number; seen: SeenFrame }>();

/** Test seam: forget every pane a disposed surface left parked. */
export function forgetParkedFramesForTests(): void {
  leftParked.clear();
}

function viewOf(
  state: TerminalScrollState,
  historyAtEntry: number | null
): ScrollView {
  return {
    position: state.position,
    history: state.history,
    historyAtEntry,
    rows: state.rows,
    atLive: state.position === 0,
    owned: !state.innerAlt && !state.innerMouse,
    hasPane: state.hasPane
  };
}

export class ScrollSurface {
  private state: TerminalScrollState = EMPTY;
  /**
   * Phase 292. The depth of the frame tmux froze when this pane was parked,
   * which is the history at that moment. Null while live.
   *
   * On a tmux that says it (3.7 and later, the bundled 3.7b) it is tmux's own
   * number, `frameHistory` on every answer. On one that does not (3.6a) it is
   * inferred from the history the answers carry, with the limits `noteEntry`
   * states. `noteEntry` is the one place it is written, because every answer
   * there is, from the wheel, a drag or the poll, lands in `apply`.
   */
  private historyAtEntry: number | null = null;
  private readonly listeners = new Set<(view: ScrollView) => void>();
  /** Serializes IPC so two scrolls can never land out of order. */
  private chain: Promise<void> = Promise.resolve();
  /** Sub-line wheel travel carried between frames (trackpads are fractional). */
  private pendingLines = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pollMs = 0;
  /** Keystrokes held while copy-mode is being cancelled, in arrival order. */
  private readonly inputQueue: string[] = [];
  private dragging = false;
  private disposed = false;
  /**
   * Main answered that there is no session for this row on this Mac (Phase 95).
   *
   * Two ordinary states produce that answer, being a session that runs on
   * another machine and a session on this Mac that is not running. Neither is
   * an error and neither changes while this surface is mounted, so the answer
   * is kept and the poll stops. Before this field the surface asked again
   * every second for as long as the session was on screen, and main threw
   * every time, which printed a stack trace every second.
   *
   * A surface is built per mount, so a restore that brings a pane back builds
   * a new one and the poll starts again.
   */
  private noPane = false;
  /**
   * Phase 292. The last ordinary answer heard while parked, null while live.
   * `noteEntry` compares the next answer's size with it.
   */
  private seen: SeenFrame | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly term: Terminal
  ) {}

  get view(): ScrollView {
    return viewOf(this.state, this.historyAtEntry);
  }

  subscribe(listener: (view: ScrollView) => void): () => void {
    this.listeners.add(listener);
    listener(this.view);
    return () => this.listeners.delete(listener);
  }

  /** Begin polling. Safe to call once per mount. */
  start(): void {
    if (this.disposed) return;
    this.refresh();
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    // Phase 292. The pane stays scrolled back in tmux while this surface is
    // gone; the next one picks the frame up from here. See `leftParked`.
    if (this.historyAtEntry !== null && this.seen !== null) {
      leftParked.set(this.sessionId, {
        historyAtEntry: this.historyAtEntry,
        seen: this.seen
      });
    }
  }

  // -- wheel ----------------------------------------------------------------

  /**
   * xterm's `attachCustomWheelEventHandler`. Returning false cancels xterm's
   * own handling — including the alternate-scroll cursor keys that are the
   * whole bug; returning true hands the event to the app inside the pane.
   */
  handleWheel(event: WheelEvent): boolean {
    // Phase 95. There is nothing here to scroll, so the wheel does nothing at
    // all. False, not true: true hands the event to xterm, whose
    // alternate-scroll branch emits `ESC O A` and `ESC O B`, and claude and
    // codex read those as prompt-history navigation. Doing nothing is honest.
    // Sending the wrong keys is not.
    if (this.noPane) return false;
    if (scrollBridge() === null) return true;
    // Phase 292. A pane already scrolled back shows tmux's frozen frame, not
    // the program's screen, so the wheel is ours whatever the program has
    // asked for since. See the exception in this file's header.
    if (!this.view.owned && !this.state.inMode) return true;
    if (event.deltaY === 0) return false;
    this.pendingLines -= this.wheelLines(event);
    if (this.flushTimer === null) {
      // A TIMER, not requestAnimationFrame. The visible result of a scroll is
      // painted by tmux redrawing the pane over the PTY, not by us, so frame
      // alignment buys nothing — and MEASURED in the screenshot harness, rAF
      // callbacks do not run at all while the window is not producing frames:
      // 22 wheel notches accumulated and fired as one 142-line jump after the
      // run finished. A wheel that silently does nothing is the bug we are
      // here to fix, so it must not depend on the compositor.
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        const whole = Math.trunc(this.pendingLines);
        if (whole === 0) return;
        this.pendingLines -= whole;
        this.scrollBy(whole);
      }, WHEEL_COALESCE_MS);
    }
    return false;
  }

  /** Wheel travel in terminal lines. Read the cell box, never compute it. */
  private wheelLines(event: WheelEvent): number {
    if (event.deltaMode === 1) return event.deltaY;
    if (event.deltaMode === 2) {
      return event.deltaY * Math.max(1, this.state.rows || this.term.rows);
    }
    const screen = screenElement(this.sessionId);
    const cell =
      screen === null ? 0 : measureCells(this.term, screen).cellHeight;
    return event.deltaY / (cell > 0 ? cell : 18);
  }

  // -- commands -------------------------------------------------------------

  /** Positive scrolls back in time; negative toward live output. */
  scrollBy(lines: number): void {
    if (this.noPane) return;
    const api = scrollBridge();
    if (api === null || lines === 0) return;
    this.enqueue(() => api.by({ sessionId: this.sessionId, lines }));
  }

  /** One screen, the ⇧PageUp/⇧PageDown step. */
  scrollPages(pages: number): void {
    if (this.noPane) return;
    const rows = Math.max(1, this.state.rows || this.term.rows);
    this.scrollBy(Math.round(pages * Math.max(1, rows - 1)));
  }

  /**
   * Scrollbar drag: scrub to an absolute tmux position, which counts from the
   * bottom of the frozen frame (Phase 292). The scrollbar turns the reader's
   * distance from live into that number in ./live-distance.ts before it calls.
   */
  scrollTo(position: number): void {
    if (this.noPane) return;
    const api = scrollBridge();
    if (api === null) return;
    this.enqueue(() => api.to({ sessionId: this.sessionId, position }));
  }

  /**
   * Whether a scrollbar drag is in progress.
   *
   * Phase 292. It used to suspend the poll's correction. There is no
   * correction now, and what is left is the cadence: a drag that starts from
   * live polls at the scrolled rate from the press rather than from the first
   * answer, and the release re-reads at once so the thumb settles where the
   * pane is.
   */
  setDragging(dragging: boolean): void {
    this.dragging = dragging;
    if (!dragging) this.refresh();
  }

  /**
   * Send a keystroke, returning to live output first when the pane is
   * scrolled. tmux copy-mode has its OWN key table: without this, the first
   * character the user types after scrolling would be eaten by it instead of
   * reaching the agent. Held keystrokes flush in arrival order.
   */
  sendInput(data: string): void {
    const api = scrollBridge();
    const gmux = window.gmux;
    if (gmux === undefined) return;
    // Phase 95. `this.noPane` first: there is no copy-mode here to leave, so
    // the keystroke goes straight through. Typing into a session on another
    // machine has to keep working, and this is the line that decides it.
    if (
      this.noPane ||
      api === null ||
      (this.state.position === 0 && !this.state.inMode)
    ) {
      gmux.term.sendInput(this.sessionId, data);
      return;
    }
    const alreadyDraining = this.inputQueue.length > 0;
    this.inputQueue.push(data);
    if (alreadyDraining) return;
    this.enqueue(async () => {
      const state = await api.live(this.sessionId);
      while (this.inputQueue.length > 0) {
        gmux.term.sendInput(this.sessionId, this.inputQueue.shift() ?? '');
      }
      return state;
    });
  }

  /**
   * Send bytes the PANE composed about itself, leaving the reader's place
   * alone — Phase 205 item 1.
   *
   * `sendInput` above returns a scrolled pane to live output first, because a
   * keystroke would otherwise be eaten by tmux copy-mode's own key table.
   * That is right for a keystroke and wrong for a report: the DECSET 1004
   * focus reports arrive on the same `onData` event, nobody typed them, and
   * cancelling copy-mode for one threw away where the reader was every time
   * the window lost or regained focus. See ../keys/focus-report.ts for the
   * measurement and for the control that isolated the cause. Phase 292 found
   * two more of the class, the colour reports a late resize draws and the
   * device-attribute answers every return to a session draws;
   * ../keys/pane-report.ts is the one question that names all three.
   *
   * The bytes still go, because tmux asked for them. NOTHING ELSE MAY HAPPEN
   * HERE: no `live`, no queue, no read. A report that reaches `sendInput` by
   * any road leaves copy mode, which is the whole defect.
   */
  sendReport(data: string): void {
    window.gmux?.term.sendInput(this.sessionId, data);
  }

  /**
   * Re-read the pane. NOTHING IS RE-SCROLLED HERE, AND THAT IS THE WHOLE FIX.
   *
   * A parked copy-mode view holds the reader's content by itself as the agent
   * writes; the correcting scroll this used to run was the only thing moving
   * it. src/main/tmux/scroll.ts's `scrollPaneTo` carries the measurement,
   * including how the founding one came to say otherwise.
   *
   * It is still polled while the pane is scrolled, because the scrollbar's
   * thumb is drawn from the same read and tmux's history grows under it.
   */
  refresh(): void {
    if (this.noPane) return;
    const api = scrollBridge();
    if (api === null) return;
    this.enqueue(() => api.state({ sessionId: this.sessionId }));
  }

  // -- internals ------------------------------------------------------------

  private enqueue(op: () => Promise<TerminalScrollState>): void {
    this.chain = this.chain.then(async () => {
      if (this.disposed) return;
      try {
        this.apply(await op());
      } catch {
        // Pane died, session ended, tmux hiccup — the next tick retries.
        // Rescheduling here (not only on success) is what keeps the poll
        // alive across a transient failure.
        this.schedule();
      }
    });
  }

  /**
   * Keep `historyAtEntry` true to the answer that just arrived — Phase 292.
   *
   * WHEN tmux SAYS, IT IS TAKEN AND NOTHING BELOW RUNS. tmux 3.7 and later
   * answer the depth of the frame copy mode froze (`frameHistory`, read from
   * `#{copy_position_limit}`), re-counted by tmux across a rewrap, so the
   * entry is exact on the park, across a resize, across a remount and across
   * a relaunch. It is what the bundled tmux answers. The rules below are the
   * INFERENCE for a tmux that does not say (3.6a, what `npm run dev` finds),
   * and each of their limits is a limit of that tmux alone.
   *
   *   position 0, out of copy mode   live, so there is no frozen frame: null
   *   0 → above 0                    the pane was just parked: this history
   *   above 0, and staying           the frame is the same frame: leave it
   *
   * THE INFERENCE'S FIRST LIMIT is the park itself. The first parked answer is
   * read after copy mode was entered and the view scrolled, so every line
   * printed in between is counted into the frame: measured on a scratch
   * server printing in bursts of 50, that was 50 lines in 4 of 6 parks, and
   * in the app at 20 lines a second it put a scrolled selection one line off.
   *
   * Three exceptions, each measured or read from a real path.
   *
   * A CHANGE OF SIZE. A different width rewraps the history and a different
   * height moves rows between the screen and the history, so `history` moves
   * without a line being printed. Every answer carries the size it was taken
   * at, and when it differs from the last answer's the entry is re-based to
   * keep the growth what it was. NOTHING ELSE HAPPENS ON A RESIZE. This file
   * used to re-send the position 300 ms after one (`holdPositionAcrossResize`,
   * Phase 12.11), and that is deleted: `#{scroll_position}` counts ROWS, a
   * rewrap changes how many rows lie below the reader, and re-sending the old
   * number threw a reader parked 720 rows back over soft-wrapped lines 127
   * lines on every change of width, where tmux by itself had the line exactly
   * right. tmux holds the line now, because main keeps its copy cursor on the
   * top row (`cursorToTopRow` in src/main/tmux/scroll.ts carries the
   * measurement).
   * THE LIMIT, stated: lines printed between two answers of different sizes
   * are read as rewrap, so the thumb understates the distance by what printed
   * across that one pair, about a poll interval's worth, per change of size,
   * for the rest of that park. MEASURED 2026-09-19 with probe:p292 arm d on
   * 3.6a at 17 lines a second: 4 lines short after one resize and 9 after two
   * (on 3.7b, which says the frame's depth, 0 and 0). It adds up for as long
   * as a window edge is held and dragged. The rule it replaces re-based on
   * EVERY answer until 300 ms after the last resize and lost 8 lines to a
   * single step, 16 to two, and 84 to a five second drag.
   *
   * POSITION 0 STILL IN COPY MODE. tmux's own resize can walk a view parked
   * near the bottom to position 0 without leaving copy mode, and the frame is
   * still the frame, so the entry is kept until copy mode is really left.
   *
   * AN ALTERNATE-SCREEN ANSWER with no history. Main reports `history: 0` for
   * a pane that is not parked over one, and an entry of 0 would turn the whole
   * transcript into growth; the entry waits for the next ordinary answer.
   *
   * AND A SURFACE THAT MOUNTS OVER A PANE LEFT PARKED adopts what the last one
   * knew (`leftParked` above), then falls under the rules here like any other
   * answer, a change of size while it was away included.
   */
  private noteEntry(state: TerminalScrollState): void {
    if (state.inMode && state.frameHistory !== null) {
      this.historyAtEntry = state.frameHistory;
      this.seen = { history: state.history, cols: state.cols, rows: state.rows };
      return;
    }
    if (state.position === 0) {
      if (!state.inMode) {
        this.historyAtEntry = null;
        this.seen = null;
        leftParked.delete(this.sessionId);
      }
      return;
    }
    if (state.innerAlt && state.history === 0) return;
    if (this.historyAtEntry === null) {
      const left = leftParked.get(this.sessionId);
      if (left !== undefined) {
        this.historyAtEntry = left.historyAtEntry;
        this.seen = left.seen;
      }
    }
    const seen = this.seen;
    if (this.historyAtEntry === null || seen === null) {
      this.historyAtEntry = state.history;
    } else if (seen.cols !== state.cols || seen.rows !== state.rows) {
      const growth = growthSinceEntry({
        position: state.position,
        history: seen.history,
        historyAtEntry: this.historyAtEntry
      });
      this.historyAtEntry = Math.max(0, state.history - growth);
    }
    this.seen = { history: state.history, cols: state.cols, rows: state.rows };
  }

  private apply(state: TerminalScrollState): void {
    if (this.disposed) return;
    const entryBefore = this.historyAtEntry;
    this.noteEntry(state);
    const changed =
      state.hasPane !== this.state.hasPane ||
      state.position !== this.state.position ||
      state.history !== this.state.history ||
      state.rows !== this.state.rows ||
      state.innerAlt !== this.state.innerAlt ||
      state.innerMouse !== this.state.innerMouse ||
      this.historyAtEntry !== entryBefore;
    this.state = state;
    // Phase 95. Main says there is no session for this row on this Mac. That
    // is a fact rather than a failure and it does not change under this
    // surface, so the answer is kept, the armed timer is dropped, the
    // subscribers are told once, and no new timer is armed.
    if (!state.hasPane) {
      this.noPane = true;
      if (this.timer !== null) {
        clearTimeout(this.timer);
        this.timer = null;
        this.pollMs = 0;
      }
    }
    if (changed) {
      const view = this.view;
      for (const listener of this.listeners) listener(view);
    }
    if (this.noPane) return;
    this.schedule();
  }

  private schedule(): void {
    // Phase 95. The brace to the belt in `apply` above. Every path that could
    // arm a timer runs through here, so one test makes the stop permanent.
    if (this.disposed || this.noPane) return;
    const wanted =
      this.state.position > 0 || this.dragging
        ? SCROLLED_POLL_MS
        : LIVE_POLL_MS;
    if (this.timer !== null && this.pollMs === wanted) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.pollMs = wanted;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refresh();
    }, wanted);
  }
}
