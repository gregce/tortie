/**
 * "Does a terminal own the keyboard?" — one boolean, read by every piece of
 * the 36px band that lights up for it.
 *
 * The band's hairline flips to `--accent` while the user is typing into a
 * session (S4, `--bandline`). That used to be local state inside
 * TerminalRegion, which worked only while the band was TerminalRegion's own
 * child. Phase 18 hoisted the session tab strip a level up so an open file
 * can no longer squeeze it (item 3), and the strip still has to draw the same
 * line — so the flag moved with it, to the one place both can read.
 *
 * Deliberately NOT in the app store: it changes on every focus move inside a
 * split, it is never persisted, and nothing outside the band cares. A
 * module-level subscription keeps that traffic out of the store's listeners.
 */

import type React from 'react';
import { useSyncExternalStore } from 'react';

/** The class every terminal's mount carries (src/renderer/terminal). */
const TERMINAL_MOUNT = '.gmux-terminal-mount';

let focused = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (next === focused) return;
  focused = next;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True while focus sits inside a terminal pane. */
export function useTermFocused(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => focused,
    () => false
  );
}

/**
 * Spread onto the element that contains BOTH the band and the terminals —
 * `.work-area` in App. Capture-phase, so a pane deep inside a split group
 * reports without every level in between having to.
 */
export const termFocusHandlers = {
  onFocusCapture(e: React.FocusEvent<HTMLElement>): void {
    set(
      e.target instanceof HTMLElement &&
        e.target.closest(TERMINAL_MOUNT) !== null
    );
  },
  onBlurCapture(e: React.FocusEvent<HTMLElement>): void {
    // Focus moving WITHIN the work area is settled by the focus event that
    // follows; only leaving it entirely puts the line back to `--border`.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) set(false);
  }
} as const;
