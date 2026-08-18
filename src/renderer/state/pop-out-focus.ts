/**
 * Phase 86 — where the eye lands after a session is dragged out of a split.
 *
 * `popOut` used to end with an unconditional `setActiveSession`, so the view
 * always followed the leaf that left. This module holds the person's answer
 * instead. 'moved' is what the app has always done and it stays the default,
 * so nobody's habit changes under them.
 *
 * Why localStorage and not the settings file, stated once so a later round
 * does not "fix" it. The value decides which surface the eye lands on after a
 * layout gesture. It is presentation state and it belongs beside the layout
 * record it acts on, which is `gmux.splitLayouts` in the same store. Losing it
 * costs a glance and never a session.
 *
 * The main window and the Settings window are the same Electron session with
 * no partition and the same origin, so they share one storage area. `layout.ts`
 * reads the value at the moment of the pop out rather than caching it, so a
 * change made in Settings is in force in the main window on the very next drag
 * with no event, no broadcast and no restart.
 *
 * It imports `./local` and nothing else, so the Settings window can read and
 * write the preference without pulling the layout store, its zustand instance
 * and its pagehide listener into the Settings bundle.
 */

import { loadLocal, saveLocal } from './local';

/**
 * 'moved' shows the session that was dragged out. 'stayed' keeps the view on
 * the split it came from.
 */
export type PopOutFocus = 'moved' | 'stayed';

export const LS_POP_OUT_FOCUS = 'gmux.popOutFocus';

export const DEFAULT_POP_OUT_FOCUS: PopOutFocus = 'moved';

/** The stored answer. Anything that is not one of the two reads as 'moved'. */
export function readPopOutFocus(): PopOutFocus {
  const raw = loadLocal<unknown>(LS_POP_OUT_FOCUS, DEFAULT_POP_OUT_FOCUS);
  return raw === 'moved' || raw === 'stayed' ? raw : DEFAULT_POP_OUT_FOCUS;
}

export function writePopOutFocus(value: PopOutFocus): void {
  saveLocal(LS_POP_OUT_FOCUS, value);
}
