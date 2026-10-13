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
 * accelerator, and these handlers get the final say. (This note used to end by
 * asking for src/main/menu.ts to be corrected, because that file claimed
 * accelerators pre-empt the renderer. It was corrected, and its header now
 * carries the same measurement. Phase 156 removed the request.)
 *
 * What that buys us, in order of importance:
 *  - **⌘C only copies (Phase 347, issue 41).** With a selection it copies;
 *    with none it does nothing: no byte reaches the session and the clipboard
 *    is untouched. It used to send the interrupt, and Claude Code, Codex and
 *    pi read that byte at their prompt as "clear what I typed", so one ⌘C
 *    with nothing selected threw a draft away. ⌃C is the interrupt and never
 *    reaches this switch (`isPlainMeta` is false for it, so xterm sends its
 *    own byte). The `preventDefault()` stays on BOTH branches, so the Edit
 *    menu's `role:'copy'` never acts on the chord in a focused session and
 *    "nothing" does not depend on that role having nothing to copy.
 *  - ⌘A selects the buffer once, not twice (xterm handles ⌘A itself but does
 *    not preventDefault, so `role:'selectAll'` fired straight after it).
 *  - ⌘K clears, and since Phase 96 only for a session on THIS Mac.
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
 *
 * ⇧⌘↩ (Phase 286) is Tortie's and never the session's. xterm turns key code
 * 13 into a carriage return whatever the modifiers, so the chord that enters
 * and leaves session focus also pressed Return in the session underneath it.
 * MEASURED on 2026-09-18 with real key events at a focused pane: one more
 * prompt line after the chord in, and after the chord out
 * `zsh: command not found: p286beforea`, the text typed inside the mode,
 * executed. In an agent that is a drafted prompt, submitted by leaving.
 */

import type { Terminal } from '@xterm/xterm';
import {
  clearSession,
  copySelection,
  hasSelection,
  selectAll
} from '../capture';
import type { ScrollSurface } from '../scroll/surface';

function isPlainMeta(event: KeyboardEvent): boolean {
  return event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}

/**
 * ⇧⌘↩, the keymap's `view.sessionFocus`, in the same words
 * src/renderer/app/keyboard.ts matches it with. Written out like every other
 * chord in this file, which runs once per keystroke, and held to the keymap
 * row by ./__tests__/multiline.test.ts, which builds its event from that
 * row's accelerator.
 */
function isSessionFocusChord(event: KeyboardEvent): boolean {
  return (
    event.key === 'Enter' &&
    event.metaKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey
  );
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
  multiline: () => string | null,
  // PHASE 96. Read per keystroke, like the two closures above it, because a
  // session row is replaced whenever main pushes its list again.
  onThisMac: () => boolean
): (event: KeyboardEvent) => boolean {
  return (event: KeyboardEvent): boolean => {
    if (event.type !== 'keydown') return true;

    // ⇧⌘↩ — session focus (Phase 286). xterm never sees it, so it never
    // becomes a carriage return in the session. The window's own ladder
    // (src/renderer/app/keyboard.ts) has already run, in the capture phase,
    // and is what acts on the chord; nothing here toggles anything. It has
    // also already called preventDefault, which is what keeps the keypress
    // from following, and the call is repeated here so this handler does not
    // lean on the order two listeners happen to run in.
    if (isSessionFocusChord(event)) {
      event.preventDefault();
      return false;
    }

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
        // A selection held in the history counts (Phase 209), even when the
        // person has scrolled every row of it off the screen.
        if (hasSelection(sessionId)) {
          void copySelection(sessionId);
        } else {
          // PHASE 347 (issue 41, his ruling "Nothing"). No selection → no byte. An agent reads
          // ⌃C's byte as "clear what I typed"; ⌃C is still the interrupt, handed to xterm above.
        }
        return false;
      case 'a':
        event.preventDefault();
        selectAll(sessionId);
        return false;
      case 'k':
        event.preventDefault();
        // PHASE 96. Clear drops the history in this Mac's own session server,
        // and that server does not hold a session that runs on another
        // machine. The menu refuses this for the same reason; this is the same
        // verb reached through the keyboard. preventDefault and the false stay
        // either way, so the application menu never acts on the chord instead.
        if (onThisMac()) void clearSession(sessionId, tmuxName());
        return false;
      default:
        return true;
    }
  };
}
