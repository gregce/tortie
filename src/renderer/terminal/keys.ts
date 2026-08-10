/**
 * The ⌘-chords that belong to a focused session.
 *
 * MEASURED on Electron 43.3.0 / macOS 15 in this workspace (probe: a window
 * with an Edit menu of native roles plus a Cmd+B item, driven by real
 * keystrokes through System Events):
 *
 *     PAGE  keydown Cmd+b     ← the renderer sees the key FIRST
 *     MENU  cmd+b fired       ← 5 ms later
 *     PAGE  keydown Cmd+d + preventDefault()  → the menu item NEVER fired
 *
 * So a page-side `preventDefault()` suppresses the application-menu
 * accelerator, and these handlers get the final say. (The comment in
 * src/main/menu.ts saying accelerators pre-empt the renderer is the opposite
 * of what this build does — worth correcting when that file is next touched.)
 *
 * What that buys us, in order of importance:
 *  - **⌘C keeps working as interrupt.** With a selection it copies; with no
 *    selection it must still send SIGINT, because that is the gesture people
 *    reach for when an agent runs away. Left to the Edit menu's `role:'copy'`
 *    the no-selection case would silently do nothing.
 *  - ⌘A selects the buffer once, not twice (xterm handles ⌘A itself but does
 *    not preventDefault, so `role:'selectAll'` fired straight after it).
 *  - ⌘K clears.
 *
 * ⌘V is deliberately NOT handled here: letting it fall through to
 * `role:'paste'` runs xterm's own paste handler, which applies bracketed
 * paste correctly for both shells and agents. Re-implementing that would be
 * a bug factory.
 */

import type { Terminal } from '@xterm/xterm';
import { clearSession, copySelection, selectAll } from './capture';

/** ASCII end-of-text — what ⌃C sends, and what SIGINT is made of. */
const ETX = '\u0003';

function isPlainMeta(event: KeyboardEvent): boolean {
  return event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}

/**
 * An xterm `attachCustomKeyEventHandler`. Returning false stops xterm from
 * processing the key; the explicit `preventDefault()` is what stops the
 * application menu from also acting on it.
 */
export function terminalKeyHandler(
  sessionId: string,
  term: Terminal,
  tmuxName: () => string
): (event: KeyboardEvent) => boolean {
  return (event: KeyboardEvent): boolean => {
    if (event.type !== 'keydown' || !isPlainMeta(event)) return true;

    switch (event.key) {
      case 'c':
        event.preventDefault();
        if (term.hasSelection()) {
          void copySelection(sessionId);
        } else {
          // No selection → this is an interrupt, not a copy.
          term.input(ETX);
        }
        return false;
      case 'a':
        event.preventDefault();
        selectAll(sessionId);
        return false;
      case 'k':
        event.preventDefault();
        void clearSession(sessionId, tmuxName());
        return false;
      default:
        return true;
    }
  };
}
