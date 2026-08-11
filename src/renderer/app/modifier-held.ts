/**
 * "While ⌘ is held" — the Arc/Chrome gesture, as a hook (Phase 12.12 item 4).
 *
 * The problem it solves is discovery: ⌘1…⌘9 has existed since round 1 and the
 * user did not know, because nothing in the window ever mentions it. The
 * answer is not permanent numbers on the tabs — ZEN-OF-TORTIE's whole posture
 * is quiet-until-useful, and a number that is always there is furniture. It is
 * to show them exactly when the hand is already on the key.
 *
 * Three details are the difference between a nice gesture and an irritant:
 *
 * 1. A DWELL. Without it every ⌘S, ⌘C and ⌘⇧E strobes the tab strip. ⌘ must be
 *    pressed ALONE and stay down for `delayMs` before anything appears; the
 *    first other key cancels a pending reveal. (Once the numbers ARE up, ⌘1
 *    switching projects leaves them up — that is the gesture working, not a
 *    chord interrupting it.)
 * 2. RELEASE ON EVERY EXIT, not just keyup. If the window loses focus while ⌘
 *    is down — ⌘Tab away, a native menu, a modal file dialog — no keyup ever
 *    arrives and the numbers stick there forever. blur and visibilitychange
 *    are not belt-and-braces here, they are the common case.
 * 3. CAPTURE PHASE. The terminal owns the keyboard most of the time; listening
 *    on window in the capture phase means the gesture works from inside xterm.
 */

import { useEffect, useRef, useState } from 'react';

export interface CommandHeldOptions {
  /**
   * Hold the reveal back — a tab mid-drag or mid-rename must not sprout a
   * number under the pointer. The ONE place to add a new reason.
   */
  suppressed?: boolean;
  /** How long ⌘ must be down alone. 220ms clears every ordinary chord. */
  delayMs?: number;
}

export function useCommandHeld({
  suppressed = false,
  delayMs = 220
}: CommandHeldOptions = {}): boolean {
  const [held, setHeld] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const cancelPending = (): void => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
    const release = (): void => {
      cancelPending();
      setHeld(false);
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Meta') {
        // Auto-repeat is the same press; another modifier means a chord is
        // being built, not the reveal gesture.
        if (e.repeat || e.ctrlKey || e.altKey || e.shiftKey) return;
        if (timer.current !== null) return;
        timer.current = window.setTimeout(() => {
          timer.current = null;
          setHeld(true);
        }, delayMs);
        return;
      }
      // Any other key while the reveal is still pending: this was a chord.
      cancelPending();
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key === 'Meta' || !e.metaKey) release();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      cancelPending();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, [delayMs]);

  return held && !suppressed;
}
