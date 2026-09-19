/**
 * How far from live output the reader is, Phase 292.
 *
 * No DOM and no tmux, so every rule below is unit-testable on its own, the way
 * ./drag-math.ts is for the selection. The surface keeps the one number this
 * needs (./surface.ts, `historyAtEntry`) and the scrollbar is the only thing
 * that draws from it (./TerminalScrollbar.tsx).
 *
 * TWO NUMBERS FROM tmux THAT DO NOT SHARE A ZERO. tmux freezes a pane's
 * content when it enters copy mode and scrolls that frozen frame, which is why
 * a parked view holds still while the agent writes. `#{scroll_position}`
 * counts lines above the bottom OF THAT FRAME, so it stays put for as long as
 * the reader does. `#{history_size}` is the LIVE pane's and grows with every
 * line printed. MEASURED 2026-09-18 on tmux 3.6a and 3.7b, the screen as the
 * ruler: the top line on screen is (history when copy mode was entered) −
 * position − 2, to the line.
 *
 * Dividing the first by the second is what made the thumb lie once the text
 * held still: nothing moved on screen and the thumb crept DOWN toward live,
 * 531 to 601 px of an 810 px lane in eight seconds, while the reader was in
 * fact getting further from it.
 *
 * THE HONEST NUMBER is the reader's distance from live, in lines:
 *
 *     distance = position + (history now − history at entry)
 *
 * MEASURED EXAMPLE: parked at position 100 when the history read 375, held
 * while 140 lines printed and the history went to 515. tmux's position stayed
 * 100 throughout. The distance went 100 to 240, and that is what the thumb
 * draws, over the live history, so it moves UP by exactly what was printed.
 *
 * It is computed here from numbers every poll answer already carries: the
 * position, the live history, and the history at entry, which tmux 3.7 and
 * later name themselves (`frameHistory`, from `#{copy_position_limit}`) and
 * which the surface infers on 3.6a (./surface.ts, `noteEntry`).
 *
 * TWO LIMITS, stated rather than fixed.
 *
 * A HISTORY AT ITS DEPTH LIMIT, MEASURED 2026-09-18 in the app with the limit
 * at 1,000 lines, parked 720 back while 296 lines printed, and again on
 * 2026-09-19 with the frame's depth read from tmux (3.7b), the same band within
 * a pixel (155.1 to 155.8 px at the low end across runs). The reader's TEXT
 * held on one line at every sample. But tmux trims a full history a tenth of
 * its limit at a time (`grid_collect_history`, grid.c), so `#{history_size}`
 * stops growing and saws between 903 and 1,000, and
 * the growth read from it saws with it: the thumb wobbled in a band, 155.8 to
 * 195.9 px of an 810 px lane, and went on saying 720 to 741 lines from live
 * while the reader went from 729 to 1,025. Past the limit the thumb
 * UNDERSTATES, and the text on screen can be older than anything the live
 * history still holds. The default limit of 25,000 lines was not driven; by
 * the same rule its trim would be 2,500 lines at a time.
 *
 * ON A tmux THAT DOES NOT SAY THE FRAME'S DEPTH (3.6a), A PANE THAT WAS
 * ALREADY PARKED WHEN THE APP STARTED. No surface saw the entry, so the first
 * history read is taken for it and the distance starts from the position
 * alone. Going to another session and back is NOT this case: the surface
 * that unmounts hands the frame to the one that mounts (`leftParked` in
 * ./surface.ts). On 3.7b the first answer carries the frame and this limit
 * does not arise.
 */

/** What the arithmetic reads off a scroll view, and nothing else. */
export interface FrozenFrameView {
  /** `#{scroll_position}`: lines above the bottom of the frozen frame. */
  position: number;
  /** `#{history_size}`: the LIVE pane's scrollback, which keeps growing. */
  history: number;
  /**
   * The history when the pane entered copy mode; null while live and when
   * the entry was never seen.
   */
  historyAtEntry: number | null;
}

/**
 * Lines printed since the pane was parked. Never negative: a trim, a cleared
 * history or an alternate-screen answer can read a history below the entry.
 */
export function growthSinceEntry(view: FrozenFrameView): number {
  return Math.max(0, view.history - (view.historyAtEntry ?? view.history));
}

/**
 * The depth of the frame THE SCREEN IS SHOWING, which is what a screen row is
 * counted from: screen row `r` shows history line `depth − position + r`.
 *
 * Live, that is the live history. Scrolled back it is the history AT ENTRY,
 * because the screen shows the frame tmux froze and that frame does not grow.
 * The selection's row-to-line map (./drag-math.ts) stands on this number.
 * Counting from the LIVE history while parked put every row `growth` lines
 * too new: MEASURED 2026-09-18 against tmux's own `capture-pane` addressing,
 * on 3.6a and 3.7b, a row showing "line 154" was mapped to the lines holding
 * "line 161", "line 177", "line 210" and "line 259" as 7, 23, 56 and 105
 * lines printed.
 */
export function frameDepth(view: FrozenFrameView): number {
  return view.historyAtEntry ?? view.history;
}

/** The reader's distance from live output, in lines. 0 is live. */
export function distanceFromLive(view: FrozenFrameView): number {
  return view.position === 0 ? 0 : view.position + growthSinceEntry(view);
}

/**
 * The tmux position that puts the reader `distance` lines from live.
 *
 *     position = distance − growth        (240 − 140 = 100)
 *
 * clamped to what the frozen frame holds, which is 1 to the history at entry:
 *
 *  - 0 stays 0. It is the one value that means "leave copy mode", and only
 *    the very bottom of the lane sends it.
 *  - A distance inside the growth, being lines printed since the park, is not
 *    in the frozen frame at all. It holds at position 1, the frame's own
 *    bottom, rather than leaving copy mode in the middle of a drag: leaving
 *    throws the frame away, and a drag that then moved back up would land in
 *    a new frame somewhere else.
 *  - The top of the lane is the top of the frozen frame (375 above), never
 *    the live history (515), which tmux would clamp without saying so.
 */
export function positionForDistance(
  view: FrozenFrameView,
  distance: number
): number {
  const lines = Math.max(0, Math.round(distance));
  if (lines === 0) return 0;
  const reach = Math.max(1, view.historyAtEntry ?? view.history);
  return Math.min(reach, Math.max(1, lines - growthSinceEntry(view)));
}

/**
 * Where the thumb's top edge sits in a lane with `travel` px of free run.
 * Distance 0 parks it at the BOTTOM; a distance equal to the live history is
 * the top of the transcript. A distance past the history stops at the top.
 */
export function thumbOffset(view: FrozenFrameView, travel: number): number {
  if (view.history <= 0) return travel;
  const share = Math.min(1, distanceFromLive(view) / view.history);
  return (1 - share) * travel;
}

/**
 * The inverse, for a drag: a thumb whose top edge is at `top` of `span` px, as
 * the position tmux is sent.
 */
export function positionAtOffset(
  view: FrozenFrameView,
  top: number,
  span: number
): number {
  if (view.history <= 0) return 0;
  const share = 1 - Math.min(1, Math.max(0, top / Math.max(1, span)));
  return positionForDistance(view, Math.round(share * view.history));
}
