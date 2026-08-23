/**
 * The first-quit toast, lifted out of App.tsx in Phase 127.
 *
 * The banner below is the one App.tsx carried, kept word for word because it
 * is the reasoning for the hold rather than a description of the code.
 */

import { useEffect } from 'react';
import { useApp } from '../state/store';
// Phase 12.4/12.6: "show this once, ever" lives in exactly one place. The
// first-quit toast below is one of its catalog entries, not a second copy.
import { showOneTimeTip } from './one-time-tip';
import { gmuxBridge } from '../bridge';

// ---------------------------------------------------------------------------
// First-quit toast (DESIGN.md §4: "⌘Q | Quit — sessions keep running; first
// quit shows a one-time toast saying so"). The native Quit menu item forwards
// here instead of quitting; the FIRST ⌘Q with ≥1 live session shows the toast
// for ~1.5s before proceeding, every later quit is immediate. Main arms a
// fallback timer, so a broken renderer can never block quitting.
//
// The flag-then-toast dance is NOT inline here: it is the shared one-time-tip
// mechanism (./one-time-tip.ts), which this toast is the original of. The
// hold below is armed by showOneTimeTip's return value, so unreadable or
// unwritable storage — which counts as already-shown — quits immediately
// instead of pausing in front of a toast that never appeared.
// ---------------------------------------------------------------------------

const QUIT_TOAST_MS = 1_500;

export function useQuitRequests(): void {
  useEffect(() => {
    const bridge = gmuxBridge();
    if (
      typeof bridge?.onQuitRequested !== 'function' ||
      typeof bridge.quit !== 'function'
    ) {
      return;
    }
    const quit = bridge.quit.bind(bridge);
    return bridge.onQuitRequested(() => {
      const hasLiveSession = useApp
        .getState()
        .sessions.some(
          (x) => x.status !== 'exited' && x.status !== 'restorable'
        );
      // Order matters: with nothing running there is nothing to reassure the
      // user about, and burning the one-time flag on that quit would spend
      // the tip where it says nothing.
      if (!hasLiveSession || !showOneTimeTip('quit-hold')) {
        void quit();
        return;
      }
      window.setTimeout(() => void quit(), QUIT_TOAST_MS);
    });
  }, []);
}
