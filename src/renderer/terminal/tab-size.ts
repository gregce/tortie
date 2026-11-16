/**
 * The size a pane attaches at and the size a new session is made at
 * (Phase 368, build/p368/SPEC.md D2, D4, D6).
 *
 * ISSUE 44. A pane used to attach and only then push the size it had fitted,
 * and every session was made at tmux's 80 by 24, so the program in a session
 * was told a size it was not shown at and then the real one. Claude Code draws
 * a long reply by relative cursor moves over the cells it believes blank, so a
 * size change while it drew left rows duplicated, lost or overprinted
 * (research 145 section 3.2). This module answers two questions so that
 * neither happens:
 *
 *  - WHAT SIZE DOES A PANE ATTACH AT. Its own fitted size when its container
 *    has one. A pane whose container has no size yet waits for its first fit,
 *    at most {@link FIRST_FIT_WAIT_MS}, and then takes the last size this
 *    window fitted any pane at, its terminal put at that size first
 *    (`settleForAttach`); with none of those it attaches at its terminal's own
 *    size. It is never 80 by 24 when a size is known, and never a size its
 *    terminal is not at.
 *  - WHAT SIZE IS A NEW SESSION MADE AT. The one visible pane's own size, when
 *    exactly one pane of the active project is on screen, because a new
 *    session is drawn in the same area; otherwise the last size this window
 *    fitted a pane at; otherwise none, and main uses the last size it heard.
 *
 * Each window is its own renderer, so "this window" is this module's memory.
 * It imports no store: the store reads it, and a module that read the store
 * back would make a cycle.
 */

import type { Terminal } from '@xterm/xterm';
import { sanitizeTerminalSize, type TerminalSize } from '@shared/terminal-size';
import { getTerminal } from './drop/registry';

/**
 * How long a pane whose container has no size waits for its first fit before
 * it attaches anyway (D4). The census at the parent never met such a pane, and
 * a window behind others delivers no resize callback at all, so this bound is
 * what ends the wait there.
 */
export const FIRST_FIT_WAIT_MS = 500;

/** The last size any pane in this window was fitted at, or null. */
let windowFit: TerminalSize | null = null;

/**
 * A pane in this window was fitted at `cols` by `rows`. Called for every size
 * a pane pushes to its session while its container has a size, so a pane
 * squeezed to nothing by a layout in motion never becomes the window's size.
 */
export function noteFit(cols: number, rows: number): void {
  const size = sanitizeTerminalSize({ cols, rows });
  if (size !== null) windowFit = size;
}

/** The last size any pane in this window was fitted at, or null when none was. */
export function lastWindowFit(): TerminalSize | null {
  return windowFit;
}

/** Tests only: forget the window's fit, as a fresh window has none. */
export function resetWindowFitForTests(): void {
  windowFit = null;
}

/**
 * Whether a pane's container has a size: a laid out box, wider and taller than
 * nothing. A container inside a work area that is hidden, or one not laid out
 * yet, has none, and a fit there either proposes nothing or squeezes the
 * terminal to its 2 by 1 floor, neither of which is the size it will be shown.
 */
export function boxHasSize(
  box: { readonly clientWidth: number; readonly clientHeight: number } | null | undefined
): boolean {
  return box !== null && box !== undefined && box.clientWidth > 0 && box.clientHeight > 0;
}

/**
 * Settles the first time a pane's fit finds its container with a size, so an
 * attach that found none can wait for it (D4).
 */
export interface FirstFitLatch {
  /** The pane's fit found a size. The first call settles a waiting attach. */
  fitted(): void;
  /**
   * True at the first fit, false when the bound passes or the pane goes first.
   * Already settled, it answers at once.
   */
  wait(): Promise<boolean>;
  /** The pane went: a wait in flight answers false at once, and none starts. */
  close(): void;
}

export function firstFitLatch(boundMs: number = FIRST_FIT_WAIT_MS): FirstFitLatch {
  let settled: boolean | null = null;
  let waiting: ((fitted: boolean) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const settle = (fitted: boolean): void => {
    if (settled !== null) return;
    settled = fitted;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const resolve = waiting;
    waiting = null;
    resolve?.(fitted);
  };
  return {
    fitted: () => {
      settle(true);
    },
    close: () => {
      settle(false);
    },
    wait: () => {
      if (settled !== null) return Promise.resolve(settled);
      return new Promise<boolean>((resolve) => {
        waiting = resolve;
        timer = setTimeout(() => {
          settle(false);
        }, boundMs);
      });
    }
  };
}

/** What `sizeForAttach` reads off a pane. */
export interface AttachingPane {
  /**
   * Fit the pane now and answer the size it was fitted at, or null while its
   * container has no size.
   */
  fitNow(): TerminalSize | null;
  /** Settles at the pane's first fit with a size. */
  readonly latch: FirstFitLatch;
}

/**
 * The size a pane attaches at (D1, D4): its own when it has one; otherwise,
 * once its first fit has come or the bound has passed, its own if it has one
 * by then, else the last size this window fitted a pane at. Null when neither
 * is known; `settleForAttach` then answers the terminal's own size.
 */
export async function sizeForAttach(pane: AttachingPane): Promise<TerminalSize | null> {
  const now = pane.fitNow();
  if (now !== null) return now;
  await pane.latch.wait();
  return pane.fitNow() ?? lastWindowFit();
}

/** What `settleForAttach` reads and moves: the pane's own terminal. */
export interface SizedTerminal {
  readonly cols: number;
  readonly rows: number;
  resize(cols: number, rows: number): void;
}

/**
 * THE SIZE THE CLIENT IS SPAWNED AT IS THE SIZE THE TERMINAL IS AT (Phase 368's
 * fix round). tmux draws its whole screen for the client's size into whatever
 * terminal it is handed, so a client spawned at one size beside a terminal at
 * another leaves that terminal holding rows drawn for the wrong width, and the
 * pane's later fit to the same size changes nothing the program or tmux can
 * see, so nothing redraws them.
 *
 * That is what a pane mounted while the work area is hidden did: Catch Me Up
 * open, or the editor filling the row, and a session chosen from the menu
 * bar's row. Its container had no size, so the attach took the window's last
 * fitted size while xterm sat at its unfitted 80 by 24, and 34 of 39 rows
 * were left garbled until the window was resized (measured by the attack lens
 * at HEAD; the parent drew both clean).
 *
 * So the terminal is put at `wanted` first, the window's size when the pane
 * has none of its own, and the attach then names the terminal's own size.
 * With nothing known at all that is xterm's own 80 by 24, which is the size it
 * really is: the client spawns there, and the pane's first real fit is a size
 * change tmux redraws, exactly as before this phase. Main's own fallback, the
 * last size it heard, is never used for a pane, because it is a size this
 * pane's terminal was never put at.
 */
export function settleForAttach(
  term: SizedTerminal,
  wanted: TerminalSize | null
): TerminalSize | null {
  if (wanted !== null && (term.cols !== wanted.cols || term.rows !== wanted.rows)) {
    term.resize(wanted.cols, wanted.rows);
  }
  return sanitizeTerminalSize({ cols: term.cols, rows: term.rows });
}

/**
 * Wait for `work`, but never longer than the first fit's own bound, and never
 * fail: a bundled font face that will not load leaves the fallback on screen,
 * which is what a pane drew before this phase (D6).
 */
export async function withinFirstFitBound(
  work: Promise<unknown>,
  boundMs: number = FIRST_FIT_WAIT_MS
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      work.then(
        () => undefined,
        () => undefined
      ),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, boundMs);
      })
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/** A mounted terminal's own size, when its container has one. */
function shownSizeOf(term: Terminal | null): TerminalSize | null {
  if (term === null) return null;
  if (!boxHasSize(term.element?.parentElement)) return null;
  return sanitizeTerminalSize({ cols: term.cols, rows: term.rows });
}

/**
 * The size a new session, or a restored one, is made at (D2): the visible
 * pane's own size when exactly one pane is on screen and it belongs to the
 * active project, because the new session is drawn where it is; otherwise the
 * last size this window fitted a pane at; otherwise null. A split's create
 * takes the same answer, and its new half is fitted when it attaches, one size
 * as before this phase.
 *
 * The two lists are the store's: the panes on screen (`visibleSessionIds`) and
 * the active project's sessions.
 */
export function tabSizeForCreate(
  visibleSessionIds: readonly string[],
  projectSessionIds: readonly string[]
): TerminalSize | null {
  if (visibleSessionIds.length === 1) {
    const only = visibleSessionIds[0];
    if (only !== undefined && projectSessionIds.includes(only)) {
      const own = shownSizeOf(getTerminal(only));
      if (own !== null) return own;
    }
  }
  return lastWindowFit();
}
