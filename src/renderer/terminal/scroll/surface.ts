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
 * The real scrollback is tmux's 50k-line server-side history, so this
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
 */

import type { Terminal } from '@xterm/xterm';
import type { InstalledGmuxApi, TerminalScrollState } from '@shared/ipc';
import { measureCells, screenElement } from '../capture/metrics';
import { gmuxBridge } from '../../bridge';

/** Poll cadence while the pane shows live output — keeps the thumb honest. */
const LIVE_POLL_MS = 1000;
/**
 * Poll cadence while scrolled. Faster because this is also the re-anchor
 * tick: `#{scroll_position}` is relative to the live bottom, so a streaming
 * agent slides the reader's page away unless we add its growth back.
 */
const SCROLLED_POLL_MS = 250;
/** Wheel deltas are batched over this window into ONE tmux scroll command. */
const WHEEL_COALESCE_MS = 16;
/**
 * How long a pane resize needs to land before the reader's place can be
 * re-asserted (renderer fit → IPC → pty.resize → tmux reflow). Generous by
 * design: re-scrolling too early would scrub against the OLD geometry.
 */
const RESIZE_SETTLE_MS = 300;

/** What the scrollbar and the wheel router need to know. */
export interface ScrollView {
  /** Lines above the live bottom; 0 = live output. */
  position: number;
  /** Scrollback lines above the screen. */
  history: number;
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

function viewOf(state: TerminalScrollState): ScrollView {
  return {
    position: state.position,
    history: state.history,
    rows: state.rows,
    atLive: state.position === 0,
    owned: !state.innerAlt && !state.innerMouse,
    hasPane: state.hasPane
  };
}

export class ScrollSurface {
  private state: TerminalScrollState = EMPTY;
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
  /** Reader's place before the current burst of resizes — see the hold below. */
  private holdPosition = 0;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly term: Terminal
  ) {}

  get view(): ScrollView {
    return viewOf(this.state);
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
    if (this.holdTimer !== null) clearTimeout(this.holdTimer);
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
    if (!this.view.owned || scrollBridge() === null) return true;
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

  /** Scrollbar drag: scrub to an absolute offset above the live bottom. */
  scrollTo(position: number): void {
    if (this.noPane) return;
    const api = scrollBridge();
    if (api === null) return;
    this.enqueue(() => api.to({ sessionId: this.sessionId, position }));
  }

  /** Whether a drag is in progress — the poll must not re-anchor under it. */
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
   * measurement and for the control that isolated the cause.
   *
   * The bytes still go, because tmux asked for them.
   */
  sendReport(data: string): void {
    window.gmux?.term.sendInput(this.sessionId, data);
  }

  /**
   * The pane's geometry changed (Phase 12.11 zoom): put the reader back.
   *
   * MEASURED A/B, this build, 2026-08-11 (three ⌘+ presses on a pane parked
   * 40 lines back; 13px → 19.5px took it from 118×42 to 77×27 and reflowed
   * the history from 362 to 378 lines):
   *
   *     without this hold   position 40 → 30   drift 10 lines
   *     with it             position 40 → 40   drift  0
   *
   * The anchor in `refresh()` covers history GROWTH under a streaming agent;
   * it cannot cover tmux moving the copy-mode view because the pane rewrapped
   * under it. Re-issuing the position once the resize has landed does.
   *
   * THE BURST IS WHY THIS IS NOT THREE LINES. ⌘+ pressed three times is three
   * resizes ~60 ms apart and the 250 ms poll lands in the middle of them, so
   * a naive "capture the position on every call" would re-capture the
   * ALREADY-MOVED value on the third press and faithfully restore the
   * corruption. The position is captured once, on the first resize of a
   * burst; the rest only debounce the settle timer.
   *
   * A live pane (position 0) has nothing to preserve and is left alone, which
   * is also what keeps this off the hot path for every ordinary re-fit.
   */
  holdPositionAcrossResize(): void {
    if (this.disposed || this.noPane) return;
    if (this.holdTimer === null) {
      if (this.state.position === 0) return;
      this.holdPosition = this.state.position;
    } else {
      clearTimeout(this.holdTimer);
    }
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      if (this.disposed) return;
      this.scrollTo(this.holdPosition);
    }, RESIZE_SETTLE_MS);
  }

  /** Re-read the pane, holding the reader's place under new output. */
  refresh(): void {
    if (this.noPane) return;
    const api = scrollBridge();
    if (api === null) return;
    const anchorFrom =
      this.dragging || this.state.position === 0
        ? undefined
        : this.state.history;
    this.enqueue(() =>
      api.state({
        sessionId: this.sessionId,
        ...(anchorFrom !== undefined ? { anchorFrom } : {})
      })
    );
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

  private apply(state: TerminalScrollState): void {
    if (this.disposed) return;
    const changed =
      state.hasPane !== this.state.hasPane ||
      state.position !== this.state.position ||
      state.history !== this.state.history ||
      state.rows !== this.state.rows ||
      state.innerAlt !== this.state.innerAlt ||
      state.innerMouse !== this.state.innerMouse;
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
