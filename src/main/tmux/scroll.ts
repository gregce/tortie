/**
 * Scrollback for tmux-attached panes (Phase 12.3).
 *
 * WHY THIS EXISTS — measured on tmux 3.6a + @xterm/xterm 6, 2026-08-10:
 *
 *  1. `tmux attach` opens with `ESC[?1049h`, so gmux's xterm.js client lives
 *     in its ALTERNATE buffer for EVERY session. xterm's alternate buffer has
 *     no scrollback by construction (`buffer.hasScrollback === false`), so
 *     xterm's wheel handler falls through to its alternate-scroll branch and
 *     emits `ESC O A` / `ESC O B` — cursor keys. That is the whole bug the
 *     user reported as "it thinks I'm focused in the input box": every wheel
 *     notch walked the agent's PROMPT HISTORY. It applies to shells too.
 *  2. claude (2.1.226) and codex both draw in the NORMAL buffer
 *     (`#{alternate_on}` = 0) with mouse tracking OFF, so their transcripts
 *     ARE in tmux's 50k-line history — `capture-pane -p -S -` returns them
 *     and `copy-mode -e` scrolls them. BACKLOG's "agents are alt-screen apps"
 *     premise was measured false; case (b) of the spec is the real world.
 *  3. `copy-mode -e` is the exact primitive we want: `#{scroll_position}` is
 *     lines above the live bottom, scroll-up clamps at `#{history_size}`, and
 *     the `-e` flag makes tmux LEAVE copy-mode by itself the moment the user
 *     scrolls back to the bottom.
 *  4. A REAL alt-screen app inside the pane (vim: `alternate_on` = 1) has no
 *     history to reach — copy-mode over it shows blank `~` rows — so the
 *     wheel must go to the app there instead. That decision is the renderer's
 *     (it owns the wheel event); this module just reports the two flags.
 *
 * Commands go over the long-lived control client, so a wheel notch costs
 * ~1 ms round trip instead of ~20 ms for a `tmux` process spawn (measured:
 * 20 sequential scroll+query batches in 22 ms).
 */

/** Runs one tmux command and resolves its stdout. */
export type TmuxScrollRunner = (args: readonly string[]) => Promise<string>;

export interface PaneScrollState {
  /** Lines scrolled above the live bottom. 0 = live output. */
  position: number;
  /** Lines of scrollback tmux holds above the screen (`#{history_size}`). */
  history: number;
  /** Visible rows (`#{pane_height}`). */
  rows: number;
  /** tmux copy-mode is active on this pane. */
  inMode: boolean;
  /** The app INSIDE the pane is on the alternate screen (vim, a picker). */
  innerAlt: boolean;
  /** The app INSIDE the pane asked for mouse reporting. */
  innerMouse: boolean;
}

/** Everything one round trip needs to answer, tab-separated. */
const STATE_FORMAT = [
  '#{pane_in_mode}',
  '#{scroll_position}',
  '#{history_size}',
  '#{pane_height}',
  '#{alternate_on}',
  '#{mouse_any_flag}'
].join('\t');

/** A pane with no history and no scroll — the safe answer when tmux is mute. */
const EMPTY_STATE: PaneScrollState = {
  position: 0,
  history: 0,
  rows: 0,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

function parseState(out: string): PaneScrollState {
  const line = out.split('\n').find((l) => l.length > 0);
  if (line === undefined) return EMPTY_STATE;
  const [inMode, position, history, rows, alt, mouse] = line.split('\t');
  // `#{scroll_position}` is EMPTY outside copy-mode — Number('') is 0, but be
  // explicit so a future format change cannot silently produce NaN.
  const num = (v: string | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const innerAlt = alt === '1';
  return {
    position: num(position),
    // An alt-screen app's own drawing never enters tmux history, and
    // copy-mode over it shows blank rows (measured with vim) — so there is
    // nothing to scroll, whatever history the shell underneath still holds.
    history: innerAlt ? 0 : num(history),
    rows: num(rows),
    inMode: inMode === '1',
    innerAlt,
    innerMouse: mouse === '1'
  };
}

/** Read the pane's scroll + inner-app state in one round trip. */
export async function readPaneScroll(
  run: TmuxScrollRunner,
  target: string
): Promise<PaneScrollState> {
  return parseState(
    await run(['display-message', '-p', '-t', target, '-F', STATE_FORMAT])
  );
}

/**
 * Scroll by whole lines: positive scrolls UP (back in time), negative DOWN.
 * Entering copy-mode is idempotent (verified: re-issuing `copy-mode -e`
 * preserves `#{scroll_position}`), and scrolling past the bottom exits it —
 * that is the `-e` flag, not something we have to detect.
 */
export async function scrollPaneBy(
  run: TmuxScrollRunner,
  target: string,
  lines: number
): Promise<PaneScrollState> {
  const n = Math.trunc(lines);
  if (n === 0) return readPaneScroll(run, target);
  if (n > 0) {
    await run(['copy-mode', '-e', '-t', target]);
    await run(['send-keys', '-t', target, '-X', '-N', String(n), 'scroll-up']);
  } else {
    // "not in a mode" is the expected answer when we are already live.
    await run([
      'send-keys',
      '-t',
      target,
      '-X',
      '-N',
      String(-n),
      'scroll-down'
    ]).catch(() => undefined);
  }
  return readPaneScroll(run, target);
}

/**
 * Poll the state, holding the reader's place under new output.
 *
 * MEASURED: `#{scroll_position}` is relative to the LIVE bottom, so while an
 * agent keeps writing, a pane parked at position 10 slides forward — the row
 * on screen was LINE-272 and became LINE-280 after eight new lines. Reading
 * back through a working agent's transcript is the whole point of this
 * feature, so the poll compensates: `seenHistory` is the history the caller
 * last rendered, and anything past it is added to the offset.
 */
export async function anchorPaneScroll(
  run: TmuxScrollRunner,
  target: string,
  seenHistory: number
): Promise<PaneScrollState> {
  const state = await readPaneScroll(run, target);
  const grew = state.history - Math.max(0, Math.trunc(seenHistory));
  if (!state.inMode || state.position === 0 || grew <= 0) return state;
  const room = state.history - state.position;
  return scrollPaneBy(run, target, Math.min(grew, room));
}

/** Scrub to an absolute position (0 = live). Used by the scrollbar drag. */
export async function scrollPaneTo(
  run: TmuxScrollRunner,
  target: string,
  position: number
): Promise<PaneScrollState> {
  const want = Math.max(0, Math.trunc(position));
  if (want === 0) return exitPaneScroll(run, target);
  const now = await readPaneScroll(run, target);
  const clamped = Math.min(want, now.history);
  if (clamped === now.position) return now;
  return scrollPaneBy(run, target, clamped - now.position);
}

/** Return the pane to live output. Safe to call when it already is. */
export async function exitPaneScroll(
  run: TmuxScrollRunner,
  target: string
): Promise<PaneScrollState> {
  await run(['send-keys', '-t', target, '-X', 'cancel']).catch(() => undefined);
  return readPaneScroll(run, target);
}
