/**
 * Live xterm instances, by session id.
 *
 * A drop lands on whatever leaf is under the pointer — which is usually not
 * the pane whose React tree is running the handler — so the drop feature
 * needs to reach any visible terminal. TerminalPane owns the instance and
 * registers it for its lifetime; nothing else may keep a reference.
 *
 * Why this and not `gmux.term.sendInput`: only `term.paste()` / `term.input()`
 * fire xterm's onData, and onData is where TerminalPane calls
 * `noteTerminalInput`, which tells main the session's question has an answer
 * (research 16 §1.5; Phase 13 moved the verdict itself into main).
 * Writing to the pty directly would skip it.
 */

import type { Terminal } from '@xterm/xterm';

const live = new Map<string, Terminal>();

/**
 * Register a session's terminal; returns the unregister function (safe to
 * call twice, and a no-op if a newer terminal has since claimed the id).
 */
export function registerTerminal(sessionId: string, term: Terminal): () => void {
  live.set(sessionId, term);
  return () => {
    if (live.get(sessionId) === term) live.delete(sessionId);
  };
}

/** The live terminal for a session; null for exited, restorable or hidden panes. */
export function getTerminal(sessionId: string): Terminal | null {
  return live.get(sessionId) ?? null;
}
