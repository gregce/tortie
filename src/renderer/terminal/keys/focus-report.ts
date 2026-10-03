/**
 * The two byte sequences a pane sends ABOUT ITSELF, and never because anyone
 * typed — Phase 205 item 1.
 *
 * THE DEFECT, measured at 57d9358 on 2026-09-02. Scroll a session up, press
 * command and tab away, come back, and the pane has jumped to the live
 * bottom. Read at the byte level: parked at `#{scroll_position}` 64 the pane
 * sends exactly `ESC [ O` on blur and the position becomes 0, then sends
 * `ESC [ I` on focus. Nothing about the pane's own focus effect or the attach
 * epoch is involved, and the control settles it: with the private server's
 * `focus-events` turned off and a fresh session, the identical gesture sends
 * zero bytes and the position holds at 64 across both.
 *
 * WHY EVERY PANE SENDS THEM. `resources/gmux-tmux.conf` sets
 * `focus-events on`, so tmux hands DECSET 1004 to every attach client, and
 * xterm answers it for the rest of that client's life. `sendFocus` read true
 * at the instant of the measurement, and it reads true for every pane.
 *
 * WHY THAT MOVED THE READER. Both sequences arrive on `term.onData`, the same
 * event a keystroke arrives on, and `ScrollSurface.sendInput` returns a
 * scrolled pane to live output before it sends a keystroke — which is right
 * for a keystroke, because tmux copy-mode has its own key table and would eat
 * the first character typed. A focus report is not a keystroke. Nobody
 * touched the keyboard, so nothing should leave copy-mode and nothing should
 * answer a session that was waiting for input.
 *
 * The report is still FORWARDED, unchanged, because tmux asked for it and an
 * application inside the pane may have asked tmux for it in turn. Only its
 * treatment as input is refused.
 *
 * The comparison is exact, and that is deliberate. A paste whose entire
 * content is one of these two sequences and nothing else would be forwarded
 * without leaving copy-mode; typing after it still returns to the bottom,
 * because the next keystroke goes down the ordinary path.
 */

// The predicate itself lives in src/shared/pane-report.ts since Phase 320.1's
// second build, because main's key router for a session on another machine
// asks the same question (see that file).
export {
  FOCUS_IN_REPORT,
  FOCUS_OUT_REPORT,
  isFocusReport
} from '@shared/pane-report';
