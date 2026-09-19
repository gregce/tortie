/**
 * Everything a pane sends ABOUT ITSELF on the event a keystroke arrives on —
 * Phase 292.
 *
 * xterm answers tmux's questions on `term.onData`, and `TerminalPane` treats
 * what arrives there as typing: it answers a session that was waiting for
 * input, and it returns a scrolled pane to live output, because a keystroke
 * would otherwise be eaten by copy mode's own key table. Each of the three
 * kinds below was once sent down that road and each threw a reader who had
 * scrolled back to the bottom with nobody at the keyboard:
 *
 *   focus     the window lost or regained focus         ./focus-report.ts
 *   colour    a resize half a minute after the attach   ./color-report.ts
 *   device    coming back to a session                  ./device-report.ts
 *
 * Each file carries its own measurement. This one is the single question the
 * pane asks, so that a fourth kind is one line here and not a fourth clause
 * in a component, and so that the question is a function a unit test can call
 * rather than a condition only an app run can reach.
 */

import { isColorReport } from './color-report';
import { isDeviceReport } from './device-report';
import { isFocusReport } from './focus-report';

/** True when these bytes are a report, to be forwarded and never typed. */
export function isPaneReport(data: string): boolean {
  return isFocusReport(data) || isColorReport(data) || isDeviceReport(data);
}
