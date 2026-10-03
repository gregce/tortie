/**
 * Everything a pane sends ABOUT ITSELF on the event a keystroke arrives on, as
 * ONE predicate both processes ask (Phase 292; moved here from
 * src/renderer/terminal/keys/ by Phase 320.1's second build).
 *
 * xterm answers tmux's questions on `term.onData`, the event a keystroke
 * arrives on. Three kinds of answer were once sent down the keystroke's road
 * and each threw a reader who had scrolled back to live output with nobody at
 * the keyboard: the focus reports (Phase 205), the colour reports a late
 * resize draws, and the device-attribute answers every return to a session
 * draws. The measurement behind each shape is in the renderer file that still
 * names it: ../renderer/terminal/keys/focus-report.ts, color-report.ts and
 * device-report.ts.
 *
 * WHY IT IS SHARED. The renderer sends a report with `sendReport`, which
 * leaves copy mode alone, and a keystroke with `sendInput`, which does not.
 * Both reach main on the same input channel. Since Phase 320.1's second build
 * main chooses the road of every keystroke to a session on ANOTHER machine
 * (`routeKey` in src/main/machines/scroll-order.ts), and a keystroke over a
 * scrolled-back pane there goes on that machine's control connection behind a
 * `cancel`. A report taken for a keystroke there would do on the far side
 * exactly what these files exist to stop: the `cancel` would throw the reader
 * to live, and the report's bytes would be TYPED into the program, where tmux
 * would have taken them off the attach before any key table saw them. So main
 * asks the same question, of the same shapes, and sends a report down the
 * attach, as today.
 *
 * Each comparison is the WHOLE chunk against the one shape xterm composes, so
 * nothing a person types or pastes is ever taken for one.
 */

const ESC = '\u001b';

/** DECSET 1004 focus in. */
export const FOCUS_IN_REPORT = '\u001b[I';
/** DECSET 1004 focus out. */
export const FOCUS_OUT_REPORT = '\u001b[O';

/** True when these bytes are the pane reporting its own focus, not input. */
export function isFocusReport(data: string): boolean {
  return data === FOCUS_IN_REPORT || data === FOCUS_OUT_REPORT;
}

/** OSC 10 (foreground) or OSC 11 (background), answered the way xterm does. */
const COLOR_REPORT = new RegExp(
  `^${ESC}\\](?:10|11);rgb:[0-9a-f]{4}/[0-9a-f]{4}/[0-9a-f]{4}${ESC}\\\\$`
);

/** True when these bytes are the pane reporting its own colours, not input. */
export function isColorReport(data: string): boolean {
  return COLOR_REPORT.test(data);
}

/** DA1, `CSI ? Ps ; Ps c`, and DA2, `CSI > Ps ; Ps ; Ps c`. */
const DEVICE_REPORT = new RegExp(`^${ESC}\\[[?>][0-9;]*c$`);

/** True when these bytes are the pane saying what terminal it is, not input. */
export function isDeviceReport(data: string): boolean {
  return DEVICE_REPORT.test(data);
}

/** True when these bytes are a report, to be forwarded and never typed. */
export function isPaneReport(data: string): boolean {
  return isFocusReport(data) || isColorReport(data) || isDeviceReport(data);
}
