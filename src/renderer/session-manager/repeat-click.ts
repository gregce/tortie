/**
 * The second click of a double click, inside the session manager, presses
 * nothing (Phase 293, the fix round; the batch attack's P1, major).
 *
 * WHAT WENT WRONG. A person double clicked `End 2 sessions`. The first click
 * ran the batch, a few local targets ended in under 150 ms, the panel closed
 * by itself because everything ended, and the grid moved up by the panel's
 * height. The second click of the same double click then landed on whatever
 * had slid under the pointer, which was an ended row's Restore, and restored
 * a session the person never named: in four of four reproductions, at 153 to
 * 350 ms. A single row's End panel closes the same way when its End succeeds.
 * For an agent row, Restore resumes the conversation and starts the agent.
 *
 * THE RULE. A click whose `detail` is above 1 is the second (or third) click
 * of one gesture. macOS counts it by time and distance, never by target, so it
 * still says 2 when the target under the pointer has changed. On a button, an
 * input or a label it is swallowed at the sheet root in the CAPTURE phase:
 * `preventDefault` so a checkbox does not toggle and a label does not activate
 * its control, and `stopPropagation`, which React passes to the native event
 * while it is still at the root, so the target's own handlers, and React's
 * change event for a checkbox, never run. Every control in the sheet acts on
 * the FIRST click, so a double click still does exactly one thing, and a key
 * press (`detail` 0) is never touched.
 */

/** The controls a repeated click must not reach. */
const CONTROL = 'button, input, label';

/** What this reads off a click: the plain DOM shape, so a test needs no DOM. */
export interface RepeatClickEvent {
  detail: number;
  target: unknown;
  preventDefault(): void;
  stopPropagation(): void;
}

/** True when the click is a second or later click that lands on a control. */
export function isRepeatClickOnControl(e: Pick<RepeatClickEvent, 'detail' | 'target'>): boolean {
  if (!(e.detail > 1)) return false;
  const target = e.target as { closest?: (selector: string) => unknown } | null;
  if (target === null || typeof target !== 'object') return false;
  if (typeof target.closest !== 'function') return false;
  const control = target.closest(CONTROL);
  return control !== null && control !== undefined;
}

/** The sheet root's `onClickCapture`. */
export function swallowRepeatClick(e: RepeatClickEvent): void {
  if (!isRepeatClickOnControl(e)) return;
  e.preventDefault();
  e.stopPropagation();
}
