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
 *     ARE in tmux's history, 25,000 lines by default and up to 100,000 by
 *     the Scrollback depth setting, and `capture-pane -p -S -` returns them
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
 *
 * ---------------------------------------------------------------------------
 * PHASE 13.7 — THE SCROLLBAR DRAG USED TO FREEZE THE WHOLE FLEET
 *
 * `scrollPaneTo` reduced to ONE `send-keys -X -N <delta> scroll-up`, and
 * tmux implements that as a literal `for (; np != 0; np--) cursor_up()` loop
 * — dead linear at ~21 µs per line, and the tmux server is single-threaded,
 * so nothing else on the socket runs while it spins. Dragging the scrollbar
 * to the top of a deep session stalled every OTHER session's traffic,
 * including the 1 Hz activity poll that decides which agent needs the user.
 *
 * MEASURED 2026-08-11, own socket `-L zz137seek`, real gmux-tmux.conf, one
 * 162×42 pane holding 199,960 lines / 170 MB. "concurrent" is the worst round
 * trip a SECOND client saw — the same `display-message` call the poll makes —
 * sampled at 20 Hz across the whole operation:
 *
 *   send-keys -X -N 200000 scroll-up   3,958 ms   concurrent stall 3,895 ms
 *   send-keys -X goto-line 200000         28 ms   concurrent stall    25 ms
 *   send-keys -X goto-line 100000         33 ms   concurrent stall    30 ms
 *   send-keys -X goto-line 0              25 ms   concurrent stall    19 ms
 *
 * `goto-line` is an ABSOLUTE SEEK: tmux's `window_copy_goto_line` assigns
 * `data->oy = lineno` and redraws the visible rows. It is O(screen), not
 * O(history), it clamps to `history_size` server-side, and at 200,000 lines
 * it costs the same as at 200. So the fix is not to chunk the loop — it is to
 * stop looping. 141× faster, and the poll is never starved (§ scroll.test.ts
 * and docs/research/23-scrollback-limits.md §1.4, which recorded the defect).
 *
 * Two consequences the code below depends on:
 *  - `goto-line 0` does NOT leave copy-mode (verified: `#{pane_in_mode}` = 1
 *    afterwards). The `-e` auto-exit lives in the scroll-DOWN commands only,
 *    so "scrub back to live" must still go through `exitPaneScroll`.
 *  - a chunked relative scroll survives as the FALLBACK for any tmux without
 *    the verb: same total work, but sliced so the server gets a service
 *    window between slices instead of one multi-second freeze.
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
 * Lines per slice of the FALLBACK relative scroll, and the delta above which
 * a relative scroll is re-expressed as an absolute seek.
 *
 * 2,000 lines is ~42 ms of tmux at the measured 21 µs/line — one slice is
 * about two frames, which is short enough that a client waiting behind it
 * cannot perceive the wait, and long enough that the per-command overhead
 * stays negligible. It is also the wheel/page ceiling by a wide margin: a
 * page is `rows - 1` (~41 lines), so nothing the user does with the wheel or
 * ⇧PageUp ever reaches this path.
 */
const SCROLL_CHUNK_LINES = 2_000;

/**
 * Does this tmux implement `send-keys -X goto-line`? Probed once per process
 * by using it; a failure on the FIRST attempt is read as "verb missing" and
 * latches the chunked fallback, while a failure after one success is a real
 * error (dead pane, ended session) and propagates like any other.
 */
let seekSupport: 'unknown' | 'yes' | 'no' = 'unknown';

/** Test seam: forget what was probed about `goto-line`. */
export function resetSeekSupportForTests(): void {
  seekSupport = 'unknown';
}

/** Hand the tmux server a service window between slices. */
function yieldToServer(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * The fallback for a tmux without `goto-line`: the same total work, sliced.
 * One 3,958 ms freeze becomes 100 × ~42 ms with the server free in between,
 * so the activity poll and every other session keep breathing.
 */
async function chunkedScrollBy(
  run: TmuxScrollRunner,
  target: string,
  lines: number
): Promise<void> {
  const command = lines > 0 ? 'scroll-up' : 'scroll-down';
  let left = Math.abs(lines);
  while (left > 0) {
    const chunk = Math.min(left, SCROLL_CHUNK_LINES);
    await run([
      'send-keys',
      '-t',
      target,
      '-X',
      '-N',
      String(chunk),
      command
    ]);
    left -= chunk;
    if (left > 0) await yieldToServer();
  }
}

/**
 * Put the copy-mode view at an ABSOLUTE offset above the live bottom.
 * `position` is clamped by tmux itself, so callers do not have to know the
 * history depth. Caller must have entered copy-mode.
 */
async function seekPaneTo(
  run: TmuxScrollRunner,
  target: string,
  position: number,
  from: number
): Promise<void> {
  if (seekSupport !== 'no') {
    try {
      await run([
        'send-keys',
        '-t',
        target,
        '-X',
        'goto-line',
        String(position)
      ]);
      seekSupport = 'yes';
      return;
    } catch (err) {
      // Already proven present on this server — this is a real failure.
      if (seekSupport === 'yes') throw err;
      seekSupport = 'no';
    }
  }
  await chunkedScrollBy(run, target, position - from);
}

/**
 * Move a pane whose state has ALREADY been read to an absolute offset.
 * Shared by the scrollbar drag and by any relative scroll too big to walk.
 *
 * Clamping to the state's `history` is the ALT-SCREEN guard: `parseState`
 * reports `history: 0` for a pane whose inner app owns the alternate screen,
 * because copy-mode over vim shows blank `~` rows rather than the shell's
 * transcript, so there is nothing there to seek to.
 */
async function scrollFrom(
  run: TmuxScrollRunner,
  target: string,
  now: PaneScrollState,
  position: number
): Promise<PaneScrollState> {
  const clamped = Math.min(Math.max(0, Math.trunc(position)), now.history);
  if (clamped === now.position) return now;
  // The `-e` auto-exit lives in tmux's scroll-DOWN commands, and `goto-line`
  // is not one of them, so "back to live" is still an explicit cancel.
  if (clamped === 0) return exitPaneScroll(run, target);
  await run(['copy-mode', '-e', '-t', target]);
  await seekPaneTo(run, target, clamped, now.position);
  return readPaneScroll(run, target);
}

/**
 * Scroll by whole lines: positive scrolls UP (back in time), negative DOWN.
 * Entering copy-mode is idempotent (verified: re-issuing `copy-mode -e`
 * preserves `#{scroll_position}`), and scrolling past the bottom exits it —
 * that is the `-e` flag, not something we have to detect.
 *
 * A delta larger than one slice is re-expressed as an absolute seek, so the
 * one path that can produce a huge relative jump — `anchorPaneScroll` after
 * an agent dumped tens of thousands of lines between polls — cannot walk the
 * server line by line either.
 */
export async function scrollPaneBy(
  run: TmuxScrollRunner,
  target: string,
  lines: number
): Promise<PaneScrollState> {
  const n = Math.trunc(lines);
  if (n === 0) return readPaneScroll(run, target);
  if (Math.abs(n) > SCROLL_CHUNK_LINES) {
    const now = await readPaneScroll(run, target);
    return scrollFrom(run, target, now, now.position + n);
  }
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

/**
 * Scrub to an absolute position (0 = live). Used by the scrollbar drag.
 *
 * The read up front is not bookkeeping the seek needs — tmux clamps
 * `goto-line` itself. It is the alt-screen guard (see `scrollFrom`), and it
 * also skips the round trip entirely when a drag re-sends the pixel the pane
 * is already parked on.
 */
export async function scrollPaneTo(
  run: TmuxScrollRunner,
  target: string,
  position: number
): Promise<PaneScrollState> {
  const want = Math.max(0, Math.trunc(position));
  if (want === 0) return exitPaneScroll(run, target);
  return scrollFrom(run, target, await readPaneScroll(run, target), want);
}

/** Return the pane to live output. Safe to call when it already is. */
export async function exitPaneScroll(
  run: TmuxScrollRunner,
  target: string
): Promise<PaneScrollState> {
  await run(['send-keys', '-t', target, '-X', 'cancel']).catch(() => undefined);
  return readPaneScroll(run, target);
}
