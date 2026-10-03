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
 *     Since Phase 331 (research 133 and 134) that holds BECAUSE TORTIE SAYS
 *     SO: it launches and resumes Codex in its Scrollback mode
 *     (`-c tui.fullscreen_transcript=false`) and Claude Code with
 *     `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`. Codex 0.158's own default is
 *     a fullscreen view that, under Tortie's `mouse off`, asks for no mouse,
 *     which turned the wheel back into item 1's prompt-history walk.
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

/**
 * Runs one tmux command and resolves its stdout.
 *
 * PHASE 320.1 (build/p3201/SPEC.md D7 and D8). A runner may state two facts
 * about itself, and this Mac's runner (`runScrollCommand` in
 * src/main/sessions/core.ts) states neither, so every sequence it runs is the
 * serial code below, byte for byte as before.
 *
 *  - `ordered`: every command this runner is handed is written, in the order
 *    it was handed, to ONE connection that answers in that order. A session
 *    on another machine's runner is, being one control connection per
 *    machine. Such a runner PIPELINES a sequence: it writes every command back
 *    to back and then reads the answers in order, which is about one round
 *    trip a notch instead of four (research 130 §6 item 7). This Mac's runner
 *    is NOT ordered, because it falls back to one `tmux` process per command
 *    when its control client is down, and two processes started without
 *    waiting for each other can land in either order.
 *  - `server`: which tmux server the runner reaches, when it is not this
 *    Mac's. It exists for the `goto-line` latch alone, which is this Mac's
 *    (see `seekSupport`).
 */
export interface TmuxScrollRunner {
  (args: readonly string[]): Promise<string>;
  readonly ordered?: boolean;
  readonly server?: string;
}

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

/** The eight fields one read asks for, in the places they have always had. */
const STATE_FIELDS: readonly string[] = [
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
];

/**
 * Everything one round trip needs to answer, tab-separated. THIS MAC'S READ,
 * byte for byte what it has been since Phase 292.
 *
 * It holds no `#(`, which on a long-lived control connection would run a
 * program on the far machine (research 130 §4). A session on another machine
 * is read with {@link REMOTE_STATE_FORMAT} instead, and the reason is there.
 */
export const STATE_FORMAT = STATE_FIELDS.join('\t');

/**
 * The same eight fields for a runner that reaches ANOTHER machine, with ONE
 * SPACE between them (Phase 320.1's fix round).
 *
 * WHY NOT THE TAB. tmux hands a format's answer to a client it does not
 * classify as UTF-8 through `utf8_sanitize`, which turns every byte below
 * 0x20 into `_`, the tab among them. tmux classifies a client by scanning
 * LC_ALL, LC_CTYPE and LANG for "UTF-8", and a machine's control client runs
 * with whatever locale that machine's sshd hands it, which is none at all
 * unless both ends were configured to forward one. MEASURED by the Phase 320.1
 * attack verifier on 2026-09-30, over the loopback machine's own sshd (no
 * `AcceptEnv`), tmux 3.6a and 3.7b alike: the tab format answered
 * `0__1971_30_0_0_100_`, and the lenient reader below read that as a live pane
 * with no history while the far pane sat parked in copy mode 10 lines back.
 * Keys then went straight into copy mode, 115 of 330 characters were lost in
 * the typing rig, and the same run with a UTF-8 control client lost none. The
 * list format in src/main/machines/remote-sessions.ts chose a space for the
 * same measured reason, and this follows it.
 *
 * Every field is a number or empty, so a space can never be a field's own
 * byte, and a space is printable ASCII, which every client passes through
 * whatever its locale. It is read by {@link parseRemoteState}, which refuses
 * any answer that is not exactly eight such fields rather than reading it as
 * a live pane.
 *
 * The closed table of what may cross a machine's control connection
 * (src/main/machines/scroll-shapes.ts) admits a read only when its format is
 * THIS constant, compared with `===`, so there is one spelling of it and no
 * caller's string reaches the far side. It holds no `#(`.
 */
export const REMOTE_STATE_FORMAT = STATE_FIELDS.join(' ');

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

/** This Mac's reader: lenient, byte for byte the reading it has always made. */
function parseState(out: string): PaneScrollState {
  const line = out.split('\n').find((l) => l.length > 0);
  if (line === undefined) return EMPTY_STATE;
  return stateOfFields(line.split('\t'));
}

/**
 * What each of {@link REMOTE_STATE_FORMAT}'s eight fields may be: a whole
 * number, or, for `#{scroll_position}` and `#{copy_position_limit}`, empty
 * (both are empty outside copy mode, and the second on any tmux before 3.7).
 */
const REMOTE_FIELD_SHAPES: readonly RegExp[] = [
  /^[0-9]+$/,
  /^[0-9]*$/,
  /^[0-9]+$/,
  /^[0-9]+$/,
  /^[0-9]+$/,
  /^[0-9]+$/,
  /^[0-9]+$/,
  /^[0-9]*$/
];

/**
 * A machine answered a scroll read in a shape Tortie does not read (Phase
 * 320.1's fix round). It carries how many fields it found and nothing of what
 * they said, because a far answer is that machine's text.
 */
export class UnreadableScrollAnswer extends Error {
  constructor(readonly fields: number) {
    super(
      `a machine answered a scroll read in ${String(fields)} field(s) that are ` +
        'not the eight whole numbers Tortie reads'
    );
    this.name = 'UnreadableScrollAnswer';
  }
}

/** True for {@link UnreadableScrollAnswer}, by name, so a second copy of this module still agrees. */
export function isUnreadableScrollAnswer(err: unknown): boolean {
  return err instanceof Error && err.name === 'UnreadableScrollAnswer';
}

/**
 * ANOTHER MACHINE'S reader (Phase 320.1's fix round): exactly one line of
 * exactly eight space-separated fields, each the shape
 * {@link REMOTE_FIELD_SHAPES} names, or it THROWS.
 *
 * IT FAILS CLOSED. This Mac's reader turns anything it cannot read into
 * zeros, which is "live, no history", and on another machine that reading is
 * the one that loses keystrokes: a sequence that has just written `copy-mode`
 * and a scroll to the far pane must never come back saying the pane is live.
 * So an answer this cannot read is an error, which the session core turns
 * into the not-reachable-now value (build/p3201/SPEC.md D10), and a machine
 * whose FIRST read on a connection cannot be read is never parked at all
 * (`remoteScroll` in src/main/sessions/core.ts).
 */
function parseRemoteState(out: string): PaneScrollState {
  const lines = out.split('\n').filter((l) => l.length > 0);
  const fields = lines.length === 1 ? (lines[0] ?? '').split(' ') : [];
  if (
    fields.length !== REMOTE_FIELD_SHAPES.length ||
    !fields.every((field, i) => REMOTE_FIELD_SHAPES[i]?.test(field) === true)
  ) {
    throw new UnreadableScrollAnswer(lines.length === 1 ? fields.length : 0);
  }
  return stateOfFields(fields);
}

/** The read format for this runner: another machine's has its own (see {@link REMOTE_STATE_FORMAT}). */
function readFormatFor(run: TmuxScrollRunner): string {
  return run.server === undefined ? STATE_FORMAT : REMOTE_STATE_FORMAT;
}

/** Read one answer with the reader that matches the format {@link readFormatFor} asked for. */
function parseFor(run: TmuxScrollRunner, out: string): PaneScrollState {
  return run.server === undefined ? parseState(out) : parseRemoteState(out);
}

/** The eight fields, in {@link STATE_FIELDS}' order, read into a state. Both readers share it. */
function stateOfFields(
  fields: readonly (string | undefined)[]
): PaneScrollState {
  const [inMode, position, history, rows, alt, mouse, cols, frame] = fields;
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

/**
 * Read the pane's scroll + inner-app state in one round trip. A runner that
 * reaches another machine reads with {@link REMOTE_STATE_FORMAT} and THROWS
 * {@link UnreadableScrollAnswer} on an answer it cannot read; this Mac's reads
 * as it always has.
 */
export async function readPaneScroll(
  run: TmuxScrollRunner,
  target: string
): Promise<PaneScrollState> {
  return parseFor(
    run,
    await run(['display-message', '-p', '-t', target, '-F', readFormatFor(run)])
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
export const SCROLL_CHUNK_LINES = 2_000;

/**
 * Does this tmux implement `send-keys -X goto-line`? Probed once per process
 * by using it; a failure on the FIRST attempt is read as "verb missing" and
 * latches the chunked fallback, while a failure after one success is a real
 * error (dead pane, ended session) and propagates like any other.
 *
 * THIS MAC'S SERVER ALONE (Phase 320.1, D8). It is read and written only for a
 * runner that names no `server`. A runner for another machine never probes and
 * never latches: `goto-line` exists at every tmux from 3.2a, and a copy mode
 * command a server lacks exits 0 anyway (research 131 §3.3 and §9 item 12), so
 * a failed `goto-line` there is a real failure. Before this rule one failed
 * `goto-line` through a dropped carriage would have put this Mac on the slow
 * path for the rest of the run (research 130 §6 item 9).
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

/** One command of a pipelined sequence (Phase 320.1, D7). */
interface PipelineStep {
  readonly args: readonly string[];
  /**
   * Its failure is an ordinary answer rather than an error, exactly where the
   * serial code catches it: `top-line`, `cancel`, and a `scroll-down` that
   * found the pane already live, each of which answers "not in a mode".
   */
  readonly tolerated?: boolean;
}

/**
 * Write every command of one sequence back to back, then read the answers in
 * order, for an ORDERED runner only (see `TmuxScrollRunner`).
 *
 * THE SERIAL CODE'S ERROR SEMANTICS, KEPT. The first failure that the serial
 * code would have thrown is the one thrown, and a tolerated failure answers
 * null where the serial code swallowed it. What changes is only that the
 * commands after a failure were already written, which on an ordered carriage
 * is the price of one round trip instead of four: each of them is one of the
 * closed table's shapes, and after a failure on the same `$N` each fails the
 * same way or types nothing (research 130 §4).
 *
 * NO UNHANDLED REJECTION. Every answer gets a handler the moment it is asked
 * for, so an answer this function stops waiting for, after an earlier failure
 * was thrown, settles into that handler rather than into the process.
 */
async function pipelined(
  run: TmuxScrollRunner,
  steps: readonly PipelineStep[]
): Promise<(string | null)[]> {
  const answers = steps.map((step) => {
    let answer: Promise<string>;
    try {
      answer = run(step.args);
    } catch (err) {
      answer = Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
    answer.catch(() => undefined);
    return answer;
  });
  const out: (string | null)[] = [];
  for (const [index, step] of steps.entries()) {
    try {
      out.push(await (answers[index] as Promise<string>));
    } catch (err) {
      if (step.tolerated !== true) throw err;
      out.push(null);
    }
  }
  return out;
}

/** The answer a pipelined sequence's last step, always the read, gave. */
function lastAnswer(answers: readonly (string | null)[]): string {
  return answers[answers.length - 1] ?? '';
}

/** The read that closes every sequence, as a pipelined step, in this runner's format. */
function readStep(run: TmuxScrollRunner, target: string): PipelineStep {
  return { args: ['display-message', '-p', '-t', target, '-F', readFormatFor(run)] };
}

/** `cursorToTopRow`'s command, as a pipelined step. */
function topLineStep(target: string): PipelineStep {
  return { args: ['send-keys', '-t', target, '-X', 'top-line'], tolerated: true };
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
  if (run.server !== undefined) {
    // Another machine's server: no probe, no latch, and a failure is thrown
    // like any other (D8, see `seekSupport`).
    await run(['send-keys', '-t', target, '-X', 'goto-line', String(position)]);
    return;
  }
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
  // Pipelined only when the seek cannot latch (D8): a runner with no `server`
  // is this Mac's, whose seek may fall back on the probe's answer, so it has
  // to wait for that answer before it knows what to send next.
  if (run.ordered === true && run.server !== undefined) {
    const answers = await pipelined(run, [
      { args: ['copy-mode', '-e', '-t', target] },
      { args: ['send-keys', '-t', target, '-X', 'goto-line', String(clamped)] },
      topLineStep(target),
      readStep(run, target)
    ]);
    return parseFor(run, lastAnswer(answers));
  }
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
  if (run.ordered === true) {
    // The same commands as the serial branches below, written back to back.
    // Toward live the cursor step is written without waiting to learn whether
    // the scroll found copy mode, and on a live pane it answers "not in a
    // mode" and types nothing (research 130 §4), which is tolerated here as
    // the serial code tolerates it.
    const answers = await pipelined(
      run,
      n > 0
        ? [
            { args: ['copy-mode', '-e', '-t', target] },
            { args: ['send-keys', '-t', target, '-X', '-N', String(n), 'scroll-up'] },
            topLineStep(target),
            readStep(run, target)
          ]
        : [
            {
              args: ['send-keys', '-t', target, '-X', '-N', String(-n), 'scroll-down'],
              tolerated: true
            },
            topLineStep(target),
            readStep(run, target)
          ]
    );
    return parseFor(run, lastAnswer(answers));
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
  if (run.ordered === true) {
    const answers = await pipelined(run, [
      { args: ['send-keys', '-t', target, '-X', 'cancel'], tolerated: true },
      readStep(run, target)
    ]);
    return parseFor(run, lastAnswer(answers));
  }
  await run(['send-keys', '-t', target, '-X', 'cancel']).catch(() => undefined);
  return readPaneScroll(run, target);
}

/**
 * Where a range of history lines falls in `capture-pane`'s own numbering, or
 * that nothing of it is left, Phase 209's clamp, extracted by Phase 320.1 so
 * this Mac's copy (src/main/capture/service.ts) and a machine's copy
 * (src/main/machines/remote-pane-history.ts) apply ONE rule.
 *
 * The renderer numbers lines from the oldest the server holds and
 * `capture-pane` numbers them from the top of the live screen, so the
 * conversion needs `#{history_size}` and `#{pane_height}` read at the instant
 * of the capture. THE CLAMP IS OURS, not tmux's: tmux moves a range above the
 * top to the oldest line and answers one row for it (measured 2026-09-03), so a
 * range that is entirely gone answers nothing (`paneRange` null), and one that
 * starts above the top starts at the oldest line and says so in `firstLine`. A
 * range that reaches below the screen is cut at the last row.
 *
 * The arithmetic is the service's own, unchanged: a value that is not a finite
 * number passes through as it always did, and the machine's composer refuses
 * anything that is not a whole number before a byte is sent.
 */
export function clampHistoryRange(
  range: { readonly start: number; readonly end: number },
  extent: { readonly history: number; readonly rows: number }
): { firstLine: number; paneRange: { start: number; end: number } | null } {
  const last = extent.history + extent.rows - 1;
  const start = Math.max(0, Math.floor(range.start));
  const end = Math.min(last, Math.floor(range.end));
  if (end < start) return { firstLine: start, paneRange: null };
  return {
    firstLine: start,
    paneRange: { start: start - extent.history, end: end - extent.history }
  };
}
