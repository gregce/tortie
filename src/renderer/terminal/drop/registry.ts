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

/**
 * Visit every live terminal (Phase 62: the appearance layer re-resolves each
 * terminal's theme after a highlight change, so the selection color follows
 * the scheme without a remount). The callback runs once per terminal and
 * must not keep the reference. TerminalPane owns the instance, which is this
 * file's rule from the header.
 */
export function forEachTerminal(fn: (term: Terminal) => void): void {
  for (const term of live.values()) fn(term);
}

/**
 * How many terminals are mounted right now (Phase 163). Read on demand by
 * the diagnostics capture and by nothing else. It is the renderer's own
 * proof that a hidden session keeps no surface: TerminalHost mounts a pane
 * for a visible session only, and this map holds one entry per mounted
 * pane. A count, read when asked, never a number that rises on its own.
 */
export function liveTerminalCount(): number {
  return live.size;
}
