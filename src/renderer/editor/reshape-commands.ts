/**
 * The three reshapes, reachable from the native app menu (Phase 241).
 *
 * The reshapes are DYNAMIC — each applies to what is under the cursor, and the
 * cursor moves many times a second — so the Edit menu's three rows cannot be
 * enabled from a pushed cache the way Phase 236 enables the Redline rows
 * without a push per keystroke, and the entry refuses a new IPC channel by
 * name. The rows are therefore always enabled and always ANSWER: with the
 * reshape, or with one sentence naming what they needed. That is the shape
 * `save-file` already has, except that this one says why instead of being
 * silent.
 *
 * It is a leaf on purpose, and it is the shape ./redline-commands.ts already
 * has. It imports nothing at runtime, so ../app/menu-actions.ts, which runs on
 * every launch, reaches the reshapes without loading the editor panel or the
 * markdown parser behind them. The Monaco host installs its handler on mount
 * and removes it on unmount; a command that arrives with no host mounted does
 * nothing and says so to the caller.
 */

import type { ReshapeRowId } from './editor-menu';

export type ReshapeCommandHandler = (id: ReshapeRowId) => void;

let installed: ReshapeCommandHandler | null = null;

/** Install the mounted host's handler. Returns the uninstall for its effect. */
export function installReshapeCommands(
  handler: ReshapeCommandHandler
): () => void {
  installed = handler;
  return () => {
    if (installed === handler) installed = null;
  };
}

/** Run one reshape against the mounted host. False when none is mounted. */
export function runReshapeCommand(id: ReshapeRowId): boolean {
  if (installed === null) return false;
  installed(id);
  return true;
}
