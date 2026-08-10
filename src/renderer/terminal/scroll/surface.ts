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
import type { GmuxScrollExtras, TerminalScrollState } from '@shared/ipc';
import { measureCells, screenElement } from '../capture/metrics';

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
}

const EMPTY: TerminalScrollState = {
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
export function scrollBridge(): NonNullable<GmuxScrollExtras['scroll']> | null {
  return (window.gmux as (Window['gmux'] & GmuxScrollExtras) | undefined)
    ?.scroll ?? null;
}

function viewOf(state: TerminalScrollState): ScrollView {
  return {
    position: state.position,
    history: state.history,
    rows: state.rows,
    atLive: state.position === 0,
    owned: !state.innerAlt && !state.innerMouse
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
  }

  // -- wheel ----------------------------------------------------------------

  /**
   * xterm's `attachCustomWheelEventHandler`. Returning false cancels xterm's
   * own handling — including the alternate-scroll cursor keys that are the
   * whole bug; returning true hands the event to the app inside the pane.
   */
  handleWheel(event: WheelEvent): boolean {
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
    const api = scrollBridge();
    if (api === null || lines === 0) return;
    this.enqueue(() => api.by({ sessionId: this.sessionId, lines }));
  }

  /** One screen, the ⇧PageUp/⇧PageDown step. */
  scrollPages(pages: number): void {
    const rows = Math.max(1, this.state.rows || this.term.rows);
    this.scrollBy(Math.round(pages * Math.max(1, rows - 1)));
  }

  /** Scrollbar drag: scrub to an absolute offset above the live bottom. */
  scrollTo(position: number): void {
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
    if (api === null || (this.state.position === 0 && !this.state.inMode)) {
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

  /** Re-read the pane, holding the reader's place under new output. */
  refresh(): void {
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
      state.position !== this.state.position ||
      state.history !== this.state.history ||
      state.rows !== this.state.rows ||
      state.innerAlt !== this.state.innerAlt ||
      state.innerMouse !== this.state.innerMouse;
    this.state = state;
    if (changed) {
      const view = this.view;
      for (const listener of this.listeners) listener(view);
    }
    this.schedule();
  }

  private schedule(): void {
    if (this.disposed) return;
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
