/**
 * The two colour reports a pane sends ABOUT ITSELF, and never because anyone
 * typed — Phase 292, the same class of defect as ./focus-report.ts (Phase 205
 * item 1) reached by a different road.
 *
 * THE DEFECT, measured with probe:p292 on 2026-09-18 at origin/main 739a9109
 * and on pull request 30's branch, on tmux 3.6a and 3.7b. Scroll a session
 * back, wait half a minute, narrow the window, and the pane is at live output
 * within 150 ms: on the branch the top line went 205 to 563 and the pane had
 * left copy mode. Nobody typed. A listener beside the app's own recorded what
 * xterm handed it, 33 ms after the resize and in two chunks:
 *
 *     ESC ] 10 ; rgb:d8d8/dbdb/e2e2 ESC \
 *     ESC ] 11 ; rgb:1313/1414/1717 ESC \
 *
 * Every resize made 32 s or more after the attach did this, 4 of 4 and 1 of 1
 * at the parent. Every resize at 28 s, or within 3 s of the one before, sent
 * nothing and the reader stayed. tmux alone on a scratch socket never drops a
 * parked view on a resize.
 *
 * WHY HALF A MINUTE. READ in tmux 3.7b's source, not measured: on a client
 * resize `server-client.c` calls `tty_repeat_requests`, which asks the
 * terminal for its foreground and background again, `ESC ] 10 ; ? ESC \` and
 * `ESC ] 11 ; ? ESC \`, unless it asked within `TTY_REQUEST_LIMIT`, which is
 * 30 seconds (`tty.c`). The attach is the first asking, so a pane is safe for
 * its first half minute and for half a minute after each answer, which is
 * why the phase's own reproduction, resizing 26 s after its attach, saw only
 * tmux's jump and never this.
 *
 * WHY THAT MOVED THE READER. xterm answers on `term.onData`, the event a
 * keystroke arrives on, and `ScrollSurface.sendInput` returns a scrolled pane
 * to live output before it sends a keystroke. That is right for a keystroke.
 * A colour report is not one. (It also defeated the window-resize hold this
 * phase first added, which read "position 0 and out of copy mode" as a reader
 * who went live on purpose and gave up. The fix round deleted that hold: tmux
 * keeps the reader's line across a resize by itself, see `cursorToTopRow` in
 * src/main/tmux/scroll.ts.)
 *
 * The report is still FORWARDED, unchanged, because tmux asked for it. tmux
 * takes the answer off the client's input before any key table sees it
 * (`tty_keys_colours` in `tty-keys.c`), so sending it while the pane is in
 * copy mode costs the reader nothing. Only its treatment as input is refused.
 *
 * The comparison is the WHOLE chunk against the one shape xterm composes
 * (`rgb:` and three four-digit hex channels, closed with ESC \, read in
 * @xterm/xterm 6.0.0), for the two colours tmux asks for. A paste that is
 * exactly one of these and nothing else would be forwarded without leaving
 * copy mode; typing after it still returns to the bottom, because the next
 * keystroke goes down the ordinary path.
 */

const ESC = '\u001b';

/** OSC 10 (foreground) or OSC 11 (background), answered the way xterm does. */
const COLOR_REPORT = new RegExp(
  `^${ESC}\\](?:10|11);rgb:[0-9a-f]{4}/[0-9a-f]{4}/[0-9a-f]{4}${ESC}\\\\$`
);

/** True when these bytes are the pane reporting its own colours, not input. */
export function isColorReport(data: string): boolean {
  return COLOR_REPORT.test(data);
}
