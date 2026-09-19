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
 *     lines above the bottom AS IT WAS WHEN THE PANE ENTERED COPY MODE,
 *     scroll-up clamps at `#{history_size}`, and the `-e` flag makes tmux
 *     LEAVE copy-mode by itself the moment the user scrolls back to the
 *     bottom. (Phase 292 corrected this item. It said "lines above the live
 *     bottom" from Phase 12.3 on, and that one word is what a correction that
 *     dragged every reader's page was built on. `scrollPaneTo` below carries
 *     the account, and nothing else in this file retells it.)
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
  /**
   * `#{scroll_position}`: lines scrolled above the bottom AS IT WAS when the
   * pane entered copy mode. 0 = live output. It is a frozen-frame number and
   * `history` beside it is live, so while an agent writes under a parked view
   * this stays still and the reader's distance from live is this PLUS what
   * the history has grown by since entry (Phase 292, see `scrollPaneTo`).
   */
  position: number;
  /**
   * Lines of scrollback tmux holds above the LIVE screen (`#{history_size}`).
   * It keeps growing under a parked view; `position` does not follow it.
   */
  history: number;
  /** Visible rows (`#{pane_height}`). */
  rows: number;
  /**
   * Visible columns (`#{pane_width}`), Phase 292. Carried so a caller can tell
   * an answer taken at one size from an answer taken at another: a change of
   * width REWRAPS the history, so `history` moves without a line being printed,
   * and the renderer's thumb must not read that as output (`noteEntry` in
   * src/renderer/terminal/scroll/surface.ts).
   */
  cols: number;
  /**
   * The DEPTH OF THE FROZEN FRAME, Phase 292's fix round: how many lines of
   * history the pane held when it entered copy mode, re-counted by tmux itself
   * across a rewrap. `#{copy_position_limit}`, which tmux 3.7 added with its
   * copy mode line numbers; read in 3.7b's window-copy.c, it is
   * `screen_hsize(data->backing)`, the history of the clone copy mode reads,
   * for as long as `copy-mode-line-numbers` is not set to one of its
   * absolute modes, and resources/gmux-tmux.conf does not set it.
   *
   * WHY IT IS READ AND NOT INFERRED. The renderer used to take the history of
   * the first answer that showed the pane parked as this number, and that
   * answer is read after copy mode was entered and the view was scrolled, so
   * every line printed in between was counted into the frame. MEASURED
   * 2026-09-19 on a scratch server, 3.7b, a pane printing in bursts of 50:
   * the history read right after the park was 50 lines deeper than the frame
   * in 4 of 6 parks, while this format named the frame's top line exactly in
   * 6 of 6 (the copy cursor's line on the top row was the history line at
   * index frameHistory - position every time). In the app it put a scrolled
   * selection one line off at 20 lines a second.
   *
   * NULL when tmux does not say: outside copy mode, and on any tmux before
   * 3.7, where the format answers empty (3.6a, what `npm run dev` finds). The
   * renderer then falls back to the entry it infers (`noteEntry` in
   * src/renderer/terminal/scroll/surface.ts), with the limits it states.
   */
  frameHistory: number | null;
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
  '#{mouse_any_flag}',
  // Last, so the six fields before them keep the places they have always
  // had. Both Phase 292.
  '#{pane_width}',
  '#{copy_position_limit}'
].join('\t');

/** A pane with no history and no scroll — the safe answer when tmux is mute. */
const EMPTY_STATE: PaneScrollState = {
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

function parseState(out: string): PaneScrollState {
  const line = out.split('\n').find((l) => l.length > 0);
  if (line === undefined) return EMPTY_STATE;
  const [inMode, position, history, rows, alt, mouse, cols, frame] =
    line.split('\t');
  // `#{scroll_position}` is EMPTY outside copy-mode — Number('') is 0, but be
  // explicit so a future format change cannot silently produce NaN.
  const num = (v: string | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const innerAlt = alt === '1';
  const parked = inMode === '1';
  return {
    position: num(position),
    // An alt-screen app's own drawing never enters tmux history, and
    // copy-mode over it shows blank rows (measured with vim) — so there is
    // nothing to scroll, whatever history the shell underneath still holds.
    //
    // EXCEPT A PANE THAT WAS ALREADY SCROLLED BACK when the program opened its
    // alternate screen (Phase 292). Copy mode reads the frame it froze at
    // entry, which is the ordinary screen and its history, so the reader is
    // still looking at real lines and can still scroll them. MEASURED
    // 2026-09-18 on a scratch server, tmux 3.6a and 3.7b, an attached client's
    // row 0 as the ruler: parked 100 back, the program opened its alternate
    // screen, row 0 held "line 294", `scroll-up` 5 showed "line 289" and
    // `goto-line 300` showed "line 94", while `#{history_size}` stood still at
    // 434 for as long as the alternate screen was up. In the app the same park
    // held "line 362", and because this answered 0 the scrollbar drew no thumb
    // and the wheel went to the program as an arrow key, which threw the
    // reader to live.
    history: innerAlt && !parked ? 0 : num(history),
    rows: num(rows),
    cols: num(cols),
    // Only in copy mode, and only when tmux answered a number: empty is a tmux
    // without the format, and 0 is taken at its word.
    frameHistory:
      parked && frame !== undefined && /^\d+$/.test(frame) ? Number(frame) : null,
    inMode: parked,
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
 * Put tmux's copy cursor on the TOP ROW of the view, so that tmux keeps the
 * reader's top line across a resize BY ITSELF — Phase 292.
 *
 * WHAT tmux DOES ON A RESIZE, measured 2026-09-18 on a scratch server, 3.6a and
 * 3.7b alike, 900 soft-wrapped lines, parked 720 rows back, an attached
 * client's row 0 as the ruler. It keeps the line THE COPY CURSOR IS ON and puts
 * it on the top row. A wheel scroll leaves that cursor where the program's own
 * cursor was at entry, which for a full pane is the bottom row:
 *
 *     cursor where the scroll left it    124 -> 152 columns   top line 647 -> 662
 *     cursor on the top row (this)       124 -> 152 -> 124    top line 647, 647, 647
 *                                        44 -> 37 -> 44 rows  top line 647, 647, 647
 *
 * The first row is the "rows - 1 jump" a window resize used to make, and it is
 * the bottom line landing on top. The second is every resize this file's
 * author could think of, streaming and quiet, with `#{scroll_position}` going
 * 720 -> 466 -> 720 as the rows were re-counted. `scroll-up`, `scroll-down` and
 * `goto-line` all leave the cursor on the row it is on (`#{copy_cursor_y}` read
 * 0 after each), and `scroll-down` still leaves copy mode at the bottom.
 *
 * WHY THE APP DOES NOT PUT THE READER BACK ITSELF. It did, from Phase 12.11:
 * it re-sent the position it had read before the resize once the resize had
 * landed. `#{scroll_position}` counts ROWS of the frozen frame, and a rewrap
 * changes how many rows lie below the reader, so the same number is a
 * different place. Measured in the app over the same 900 lines: tmux alone had
 * the line exactly right 150 ms after a widening and the re-issue at 300 ms
 * threw it 127 lines, about eight screens. The renderer's hold is deleted and
 * this is what holds the line now.
 *
 * It runs after EVERY scroll that leaves the pane parked, not only the first,
 * so a pane parked by an older build heals on its next wheel notch. "not in a
 * mode" is the ordinary answer when a `scroll-down` has just reached the bottom
 * and left copy mode.
 *
 * PINNED at the tmux layer by `__tests__/scroll.integration.test.ts` (opt-in),
 * an attached client's row 0 over 900 soft-wrapped lines on 3.6a and 3.7b:
 * the park through `scrollPaneBy` held line 646 across 124 -> 152 -> 124 ->
 * 152 columns and 44 -> 37 -> 44 rows; a park that leaves the cursor where a
 * wheel scroll does moved to line 661 on the first widening; and re-sending
 * the pre-resize position, as the deleted hold did, moved a line tmux had
 * kept from 646 to 519.
 *
 * WHAT A PERSON SEES OF IT: tmux draws its cursor where the copy cursor is, so
 * while scrolled back the cursor sits in the top left corner rather than on
 * whichever row the program's cursor was on when the scroll began.
 */
async function cursorToTopRow(
  run: TmuxScrollRunner,
  target: string
): Promise<void> {
  await run(['send-keys', '-t', target, '-X', 'top-line']).catch(
    () => undefined
  );
}

/**
 * Put the copy-mode view at an ABSOLUTE offset above the bottom of the frame
 * copy mode froze at entry, which is the live bottom only for a pane that
 * entered this instant (Phase 292, see `scrollPaneTo`). `position` is clamped
 * by tmux itself, so callers do not have to know the history depth. Caller
 * must have entered copy-mode.
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
  await cursorToTopRow(run, target);
  return readPaneScroll(run, target);
}

/**
 * Scroll by whole lines: positive scrolls UP (back in time), negative DOWN.
 * Entering copy-mode is idempotent (verified: re-issuing `copy-mode -e`
 * preserves `#{scroll_position}`), and scrolling past the bottom exits it —
 * that is the `-e` flag, not something we have to detect.
 *
 * A delta larger than one slice is re-expressed as an absolute seek, so no
 * relative jump can walk the server line by line either. NO CALLER PRODUCES
 * ONE TODAY (Phase 292): the path that could, `anchorPaneScroll` after an
 * agent dumped tens of thousands of lines between polls, is deleted, and the
 * wheel and ⇧PageUp stay far under a slice. The guard stays because `lines`
 * arrives over IPC as any number, and a 3,958 ms freeze of every session is
 * not a cost to leave one refactor away (see the Phase 13.7 header).
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
    await cursorToTopRow(run, target);
  } else {
    // "not in a mode" is the expected answer when we are already live, and
    // then there is no copy cursor to place either.
    const scrolled = await run([
      'send-keys',
      '-t',
      target,
      '-X',
      '-N',
      String(-n),
      'scroll-down'
    ]).then(
      () => true,
      () => false
    );
    if (scrolled) await cursorToTopRow(run, target);
  }
  return readPaneScroll(run, target);
}

/**
 * Scrub to an absolute position (0 = live). Used by the scrollbar drag.
 *
 * The read up front is not bookkeeping the seek needs — tmux clamps
 * `goto-line` itself. It is the alt-screen guard (see `scrollFrom`), and it
 * also skips the round trip entirely when a drag re-sends the pixel the pane
 * is already parked on.
 *
 * ## NOTHING HERE HOLDS A PARKED VIEW AGAINST THE OUTPUT, AND THAT IS THE FIX
 *
 * (Pull request 30, John Berryman, opened 2026-09-18, on a measurement of his
 * dated 2026-09-16; Phase 292. THIS IS THE ONE ACCOUNT. The state handler in `sessions/core.ts`, the renderer's `refresh()`,
 * the header of this file and both test files point here and do not retell it.)
 *
 * WHAT PHASE 12.3 BELIEVED. Its comment stood on the function deleted from this
 * spot, `anchorPaneScroll`: "`#{scroll_position}` is relative to the LIVE
 * bottom, so while an agent keeps writing, a pane parked at position 10 slides
 * forward — the row on screen was LINE-272 and became LINE-280 after eight new
 * lines." So the renderer's 250 ms poll carried the history it had last drawn
 * (`anchorFrom`), and main scrolled UP by whatever had grown past it.
 *
 * THE VIEW DOES NOT SLIDE. tmux holds it still by itself. MEASURED on tmux
 * 3.7b, 2026-09-16, through a real terminal emulator fed the bytes an attached
 * client receives:
 *
 *     parked, transcript growing 187 -> 313 over seven seconds
 *     first visible line: "line 151" before and after, unchanged
 *
 * and again on 2026-09-18 in the app with real wheel events, on the bundled
 * 3.7b and the system 3.6a alike: with the correction gone the top line read
 * 261 at all 33 samples over eight seconds, and with it the top line fell 259
 * to 117, one line for every line printed. So every "correction" the product
 * applied was an extra scroll on top of a view that was already still, and it
 * dragged the reader backwards by exactly what the agent had written. The two
 * reports John Berryman's commit quotes in its own comment, dated 2026-09-16
 * there (neither is in GitHub issue 29's text or the pull request's): "that
 * message for some reason scrolls down whenever the session generates more
 * text", and "it's just moving down instead of staying anchored, but with the
 * same exact cadence of the lines being produced". The first was read as a
 * leak to be tightened, the second named it exactly.
 *
 * THE FOUNDING MEASUREMENT USED A RULER THAT CANNOT SEE THE VIEW. The founding
 * commit (`6ef60e00`) never names what it read "LINE-272 became LINE-280" with,
 * and its own numbers say: position 10 throughout, history 274 to 282, top row
 * LINE-272 to LINE-280. That is top row = history - 2 at both readings, and a
 * view parked 10 back under a history of 274 cannot show a line numbered above
 * 265 on its top row. So it was the LIVE screen, which is what `capture-pane
 * -p` answers, and never the scrolled-back view. Measured 2026-09-18: by
 * `capture-pane` the newest line went 414 to 554 while the screen a person was
 * looking at showed 259 to 302 throughout; and on a scratch server, both
 * versions, its top line went 308 to 362 in three seconds while row 0 of an
 * attached client read "line 163" at every sample. A live-screen read advances
 * with the output whatever the view does, and eight new lines moving it by
 * eight is that and nothing more.
 *
 * tmux's OWN FORMATS CANNOT SETTLE IT EITHER. Copy mode reads a CLONE of the
 * screen made when the pane entered it (`window_copy_clone_screen`, read in
 * 3.7b's source), so `#{scroll_position}` counts from the bottom AS IT WAS
 * FROZEN AT ENTRY while `#{history_size}` is live. Measured to the line in the
 * app's reproduction: on-screen top line = history at entry - position - 2,
 * the 2 being that fixture's own offset. `goto-line` counts in the same frame
 * (entered at 262, sought 100 once the history read 297, and row 0 showed line
 * 163, not 198). So on the BROKEN build, where the correction added every new
 * line to the position, `history_size - scroll_position` stayed constant and
 * LOOKED like a held view while the screen slid; on this one it grows while
 * the screen is still. A reading that looks right on the broken build and
 * wrong on the fixed one is not a ruler.
 *
 * THE ONLY HONEST RULER IS AN ATTACHED CLIENT'S SCREEN: row 0 of a terminal
 * emulator fed what a real client receives. `__tests__/scroll.integration.test.ts`
 * reads that, holds the still view and drives main's deleted rule as it shipped
 * to show it moving; the app probe reads the pane's own xterm rows.
 *
 * What was deleted from the tree is `anchorPaneScroll` here and the
 * `anchorFrom` field of the poll's input; `__tests__/scroll.test.ts` pins both
 * absent. A later round must not rebuild them. The ONLY things that move a
 * parked reader are the reader's own gestures and a keystroke (which leaves
 * copy-mode on purpose, see `sendInput`). A RESIZE does not: tmux keeps the
 * line its copy cursor is on, and `cursorToTopRow` above keeps that cursor on
 * the reader's top line, so nothing re-scrolls a parked pane after a resize
 * either. One consequence is left
 * for callers: `position` is a frozen-frame number beside a live `history`, so
 * the reader's distance from live is `position + (history - history at entry)`,
 * which is what the renderer's `distanceFromLive` draws the thumb from. On
 * tmux 3.7 and later the history at entry is tmux's own number,
 * `frameHistory` above; before 3.7 the renderer infers it.
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
