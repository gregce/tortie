/**
 * The two device-attribute answers a pane sends ABOUT ITSELF, and never
 * because anyone typed — Phase 292, the third report of the class
 * ./focus-report.ts (Phase 205 item 1) and ./color-report.ts belong to.
 *
 * THE DEFECT, measured 2026-09-18 by the phase's attack verifier at
 * origin/main 739a9109 and on this branch alike, on tmux 3.6a and 3.7b. Scroll
 * a session back, go to another session, come back, and the pane is at live
 * output about 100 ms after it is drawn again (top line 462 to 763). Nobody
 * typed. tmux had kept the pane scrolled back the whole time the reader was
 * away, position 100 and in copy mode. A listener beside the app's own recorded
 * what xterm handed it at the return, 38 to 45 ms after the select:
 *
 *     ESC [ ? 1 ; 2 c          primary device attributes (DA1)
 *     ESC [ > 0 ; 276 ; 0 c    secondary device attributes (DA2)
 *
 * then the two colour reports and a focus report. Handed to a pane parked
 * afresh ONE AT A TIME, the colour report and the focus report left the reader
 * where they were, and each of these two alone threw them to live.
 *
 * WHY EVERY RETURN SENDS THEM. Coming back to a session mounts its pane again,
 * which is a new `tmux attach`, and tmux asks a terminal that has just attached
 * what it is. xterm answers on `term.onData`, the event a keystroke arrives on,
 * and `ScrollSurface.sendInput` returns a scrolled pane to live output before
 * it sends a keystroke. That is right for a keystroke. A device report is not
 * one.
 *
 * The report is still FORWARDED, unchanged, because tmux asked for it. READ in
 * tmux 3.7b's source: every terminal that attaches is sent `ESC [ c` and
 * `ESC [ > c` (`tty_send_requests`, tty.c), and a primary or secondary
 * device attributes response is taken off the client's input before any key
 * table sees it (`tty_keys_device_attributes` and `..._attributes2` in
 * tty-keys.c answer KEYC_UNKNOWN and the bytes are dropped). MEASURED
 * 2026-09-19 with this file in the build, probe:p292 arm f and the attack
 * verifier's `switch` arm, tmux 3.7b and 3.6a: at the return the pane was
 * still in copy mode at position 100, the top line was the one the reader
 * left (462 and 462), and the thumb was 0 px from where the reader was.
 *
 * The comparison is the WHOLE chunk against the two shapes, a CSI that opens
 * with `?` or `>`, carries digits and semicolons and nothing else, and closes
 * with `c`. No key a person can press composes either, and a paste arrives
 * inside bracketed-paste markers, so it is never the whole chunk. A paste into
 * a program that turned bracketed paste off, whose entire content is one of
 * these and nothing else, would be forwarded without leaving copy mode; typing
 * after it still returns to the bottom, because the next keystroke goes down
 * the ordinary path.
 */

const ESC = '\u001b';

/** DA1, `CSI ? Ps ; Ps c`, and DA2, `CSI > Ps ; Ps ; Ps c`. */
const DEVICE_REPORT = new RegExp(`^${ESC}\\[[?>][0-9;]*c$`);

/** True when these bytes are the pane saying what terminal it is, not input. */
export function isDeviceReport(data: string): boolean {
  return DEVICE_REPORT.test(data);
}
