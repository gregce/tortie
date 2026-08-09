/**
 * Restore mechanics — recreate a 'restorable' session in tmux
 * (FINAL-REPORT §2.4 Step 3, research 09 §B.4 / §E.3):
 *
 *   1. `tmux new-session -d -c <cwd>` running $SHELL (fresh interactive
 *      shell — the honest baseline; env/venvs are documented as lost)
 *   2. send-keys the snapshot replay — `cat <snapshot>; printf <separator>`
 *      executed with Enter, so prior scrollback becomes inert history above
 *      a fresh prompt (tmux-resurrect's trick, stolen per the report)
 *   3. TYPE the recorded resume command (claude --resume <uuid> /
 *      codex resume <id>) WITHOUT Enter — ARMED, never auto-fired.
 *      Plain shells and never-harvested codex sessions arm nothing.
 *
 * The caller (GmuxCore.restoreSession) owns manifest/status bookkeeping.
 */

import { existsSync } from 'node:fs';
import type { ManifestSessionRecord } from '../manifest';
import * as tmux from '../tmux';
import { gmuxError } from '../tmux';
import { buildArmedCommand, buildSnapshotReplayCommand } from './command';
import { existingSnapshotPath } from './snapshots';

export interface RestoreOutcome {
  /** The freshly created tmux session (immutable $-id + applied name). */
  info: tmux.TmuxSessionInfo;
  /** True when a scrollback snapshot was replayed into the pane. */
  replayed: boolean;
  /** The armed (typed, unexecuted) command line, or null when none. */
  armedCommand: string | null;
}

/**
 * Type literal text into a session's active pane. `-l` sends the string
 * verbatim (no key-name lookup); the trailing named `Enter` is sent only
 * when `pressEnter` — the armed resume command is typed WITHOUT it.
 */
async function typeIntoPane(
  target: string,
  text: string,
  pressEnter: boolean
): Promise<void> {
  await tmux.execTmux(['send-keys', '-t', target, '-l', text]);
  if (pressEnter) {
    await tmux.execTmux(['send-keys', '-t', target, 'Enter']);
  }
}

/**
 * Recreate one manifested session in tmux with replayed scrollback and an
 * armed resume command. Pure tmux side effects — no manifest writes here.
 *
 * @throws GmuxError INVALID_INPUT when the recorded cwd no longer exists
 *         (surfaced as a friendly UI state, not a crash).
 */
export async function restoreSessionInTmux(
  rec: ManifestSessionRecord
): Promise<RestoreOutcome> {
  const cwd = existsSync(rec.cwd)
    ? rec.cwd
    : existsSync(rec.projectPath)
      ? rec.projectPath
      : null;
  if (cwd === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `The folder for "${rec.name}" no longer exists.`,
      rec.cwd
    );
  }

  // GUI-launched Electron inherits a minimal env; SHELL may be unset.
  const shell = process.env['SHELL'] ?? '/bin/zsh';

  const info = await tmux.createSession({
    displayName: rec.name,
    cwd,
    argv: [shell],
    ...(rec.env !== undefined ? { env: rec.env } : {})
  });

  // From here on, target the immutable $-id (rename-proof addressing).
  const target = info.sessionId;

  // Step 2 — replay the snapshot as inert history (executed).
  let replayed = false;
  const snapshot = existingSnapshotPath(rec.id);
  if (snapshot !== null) {
    try {
      await typeIntoPane(target, buildSnapshotReplayCommand(snapshot), true);
      replayed = true;
    } catch (err) {
      // A failed replay must not lose the restore itself.
      console.warn(
        `[gmux] snapshot replay failed for "${rec.name}": ${(err as Error).message}`
      );
    }
  }

  // Step 3 — arm the resume command (typed, NOT executed).
  let armedCommand: string | null = null;
  const armed = buildArmedCommand(rec.resumeArgv ?? []);
  if (armed.length > 0) {
    try {
      await typeIntoPane(target, armed, false);
      armedCommand = armed;
    } catch (err) {
      console.warn(
        `[gmux] could not arm resume for "${rec.name}": ${(err as Error).message}`
      );
    }
  }

  return { info, replayed, armedCommand };
}
