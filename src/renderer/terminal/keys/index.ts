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
 *
 * ⇧PageUp/⇧PageDown (Phase 12.3) are the keyboard half of the wheel: they
 * scroll the session's tmux history, and plain PageUp still goes to the app.
 *
 * ⇧↩ (Phase 12.5) inserts a newline in the agent's prompt instead of
 * submitting. The bytes are registry data (src/main/agents/registry.ts
 * `multilineKey`, whose header records WHY they are those bytes);
 * ./multiline.ts is only the renderer-side cache in front of it.
 */

import type { Terminal } from '@xterm/xterm';
import { clearSession, copySelection, selectAll } from '../capture';
import type { ScrollSurface } from '../scroll/surface';

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
  tmuxName: () => string,
  surface: ScrollSurface,
  multiline: () => string | null
): (event: KeyboardEvent) => boolean {
  return (event: KeyboardEvent): boolean => {
    if (event.type !== 'keydown') return true;

    // ⇧↩ — a newline in the prompt, not a submit (Phase 12.5).
    //
    // Delivery is `term.input()`, NOT gmux.term.sendInput: that puts the byte
    // in the same onData queue as every typed character, so it cannot
    // interleave around the user's own text, it feeds noteTerminalInput, and —
    // the hard dependency — it travels TerminalPane's scroll.sendInput path,
    // which cancels tmux copy-mode first. MEASURED: with the pane scrolled,
    // LF is swallowed by copy-mode's key table and never reaches the agent,
    // via a real attach client AND via `send-keys -H` (research 20 §4). A
    // Shift+Enter that silently does nothing while scrolled would be the bug.
    if (
      event.key === 'Enter' &&
      event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const sequence = multiline();
      // This agent has no multiline input: hand the key back to xterm
      // WITHOUT preventDefault, so it sends its usual CR and submit is never
      // broken. gmux does not invent a sequence it has not measured.
      if (sequence === null) return true;
      event.preventDefault();
      term.input(sequence);
      return false;
    }

    // ⇧PageUp / ⇧PageDown — the terminal convention for "scroll the
    // scrollback", and the keyboard half of the wheel. Plain PageUp still
    // belongs to the app inside the pane.
    if (
      event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      (event.key === 'PageUp' || event.key === 'PageDown')
    ) {
      if (!surface.view.owned) return true;
      event.preventDefault();
      surface.scrollPages(event.key === 'PageUp' ? 1 : -1);
      return false;
    }

    if (!isPlainMeta(event)) return true;

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
