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
 * Step 1 has a precondition Phase 13.5.1 added: the recorded cwd may be gone,
 * and quietly restoring into the project folder instead is only safe for the
 * agents whose conversation lookup is global. See the guard below.
 *
 * The caller (GmuxCore.restoreSession) owns manifest/status bookkeeping.
 */

import { existsSync } from 'node:fs';
import type { LaunchableAgentId } from '@shared/types';
import { getLaunchableEntry } from '../agents/registry';
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
 * Whether this agent can only find its conversation from the ORIGINAL
 * directory — registry data (`resume.requiresOriginalCwd`), not a list kept
 * here. True for qwen ("No saved session found with ID", loud) and pi (a
 * SILENT new empty session under the same id). Research 22 §3.5.
 *
 * The manifest cannot answer this: `AgentLaunchSpec.requiresOriginalCwd` is
 * set at launch and never persisted, so restore has to ask the registry.
 */
function resumeNeedsOriginalCwd(agent: ManifestSessionRecord['agent']): boolean {
  if (agent === 'shell') return false;
  try {
    return (
      getLaunchableEntry(agent as LaunchableAgentId).resume.requiresOriginalCwd ===
      true
    );
  } catch {
    // An id the registry does not launch has no armed resume to protect.
    return false;
  }
}

/** Human name for the agent in an error the user reads. */
function agentDisplayName(agent: ManifestSessionRecord['agent']): string {
  if (agent === 'shell') return 'This session';
  try {
    return getLaunchableEntry(agent as LaunchableAgentId).displayName;
  } catch {
    return agent;
  }
}

/**
 * Recreate one manifested session in tmux with replayed scrollback and an
 * armed resume command. Pure tmux side effects — no manifest writes here.
 *
 * @throws GmuxError INVALID_INPUT when the recorded cwd no longer exists
 *         (surfaced as a friendly UI state, not a crash), and when
 *         substituting the project folder would arm a resume that quietly
 *         opens the WRONG (empty) conversation — see below.
 */
export async function restoreSessionInTmux(
  rec: ManifestSessionRecord
): Promise<RestoreOutcome> {
  const originalCwdGone = !existsSync(rec.cwd);

  // THE SUBSTITUTION IS NOT ALWAYS SAFE (research 22 §3.5, unimplemented
  // until Phase 13.5.1). Falling back rec.cwd -> projectPath is fine for the
  // agents whose lookup is global (claude, muse), and it is the failure this
  // whole phase exists to prevent for the cwd-scoped ones: `pi --session-id
  // <id>` run from the wrong project does not error, it starts an EMPTY
  // session under the same id, so the pane LOOKS resumed and the conversation
  // is not there. Refuse instead, and say what to do about it.
  //
  // Only when a resume is actually armed: with nothing to type into the pane
  // there is no false resume to prevent, and the user should still get their
  // directory and scrollback back rather than a refusal.
  if (
    originalCwdGone &&
    (rec.resumeArgv?.length ?? 0) > 0 &&
    resumeNeedsOriginalCwd(rec.agent)
  ) {
    throw gmuxError(
      'INVALID_INPUT',
      `"${rec.name}" was in ${rec.cwd}, and that folder is gone. ` +
        `${agentDisplayName(rec.agent)} can only find this conversation from ` +
        'its original folder, so restoring it somewhere else would open an ' +
        'empty session that looks resumed. Put the folder back and restore ' +
        'again, or start a new session.',
      rec.cwd
    );
  }

  const cwd = !originalCwdGone
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
    // Same markers a fresh create stamps (Phase 12.7 F3): a restored session
    // is just as managed, and identity must survive the round trip.
    env: { ...rec.env, ...tmux.managedPaneEnv(rec.id) }
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
