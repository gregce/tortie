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
 *
 * PHASE 19 ITEM 6 CHANGED WHAT THIS MODULE RETURNS, and it is the point of
 * the change rather than a detail of it. Steps 2 and 3 can each fail on their
 * own, and both used to be reported as a boolean and a nullable string that
 * the caller was free to ignore. It did ignore them, on one line, and every
 * failed restore was stored as a healthy running session. The return type is
 * now a union whose failure arm carries no tmux session at all, so the caller
 * cannot read the session without first handling the failure. See
 * {@link RestoreOutcome}.
 */

import { existsSync } from 'node:fs';
import type { LaunchableAgentId, SessionRestore } from '@shared/types';
import { getLaunchableEntry } from '../agents/registry';
import { faultPoint } from '../fault/inject';
import type { ManifestSessionRecord } from '../manifest';
import * as tmux from '../tmux';
import { gmuxError } from '../errors';
import {
  isWrappedArgv,
  resolveSpecstory,
  unwrapArgv,
  wrapWithRecord
} from '../specstory';
import { buildArmedCommand, buildSnapshotReplayCommand } from './command';
import { resolveSnapshot } from './snapshots';
import { postDurabilityNotice } from '../notice';

/**
 * What a restore attempt achieved (Phase 19 item 6).
 *
 * THE SHAPE IS THE FIX. This used to be one interface with three fields, and
 * the caller wrote `const { info } = outcome;` and then `status: 'running'`.
 * Both stage results were computed and then dropped on that line, so a restore
 * whose scrollback replay AND resume arming had both thrown was stored and
 * broadcast as a healthy working session.
 *
 * A discriminated union whose failure arm carries no `info` makes that same
 * line fail to compile. The caller cannot reach the tmux session without first
 * saying what it intends to do about the failure. No runtime library fixes a
 * typing defect, which is why this is four type declarations and not a state
 * machine dependency (research 34 §3.5).
 *
 * The `failed` arm carries the original error rather than a message, so the
 * caller can rethrow the exact `GmuxError` the renderer already knows how to
 * show. Failures are RETURNED rather than thrown for one reason: a thrown
 * failure is a value the caller can forget to record, and the journal entry
 * for this attempt has to be closed either way.
 */
export type RestoreOutcome =
  | {
      kind: 'failed';
      /** Where it stopped. `preflight` means no side effect was taken. */
      stage: 'preflight' | 'create';
      /** One plain sentence, safe to store and to show. */
      reason: string;
      /** The original error. Rethrow this; do not rebuild it. */
      error: unknown;
    }
  | {
      kind: 'shell_only';
      info: tmux.TmuxSessionInfo;
      /**
       * Why the scrollback did not come back. UNDEFINED means there was no
       * snapshot to replay, which is not a failure — it is a session that had
       * nothing saved yet.
       */
      replayFailure?: string;
      /** Why the resume was not armed. Undefined means there was none. */
      armFailure?: string;
    }
  | {
      kind: 'transcript';
      info: tmux.TmuxSessionInfo;
      /** Why the resume was not armed. Undefined means there was none. */
      armFailure?: string;
    }
  | {
      kind: 'armed';
      info: tmux.TmuxSessionInfo;
      /** The armed (typed, unexecuted) command line. */
      armedCommand: string;
      /**
       * Why the scrollback did not come back, on the session whose resume WAS
       * armed. The two stages are independent, so the best case for the
       * conversation and the worst case for the history can happen together.
       */
      replayFailure?: string;
    };

/** The three arms that created a tmux session. */
export type RestoreSuccess = Extract<
  RestoreOutcome,
  { info: tmux.TmuxSessionInfo }
>;

/** Options for {@link restoreSessionInTmux}. */
export interface RestoreSessionOptions {
  /**
   * Called with the tmux session the INSTANT `new-session` returns, before
   * anything else is done to it.
   *
   * This exists for the restore journal (Phase 19 item 7): the window between
   * a session existing and the manifest knowing it exists is exactly the
   * window where a crash leaves Tortie holding a session it has no record of
   * creating. Kept as a callback so that this module stays pure tmux side
   * effects with no manifest writes of its own.
   *
   * A throwing hook does not fail the restore. The session is already there,
   * and losing the restore over a bookkeeping error would be the larger loss.
   */
  onCreated?: (info: tmux.TmuxSessionInfo) => void;
}

/**
 * The record to store for a restore outcome.
 *
 * The liveness status that goes with it is derived by `restoredStatus` in
 * sessions/core.ts and is deliberately NOT computed here. One question gets
 * one answer in one place, and that one is the caller's, because the caller is
 * what owns the row.
 */
export function restoreRecordOf(
  outcome: RestoreOutcome,
  at: number = Date.now()
): SessionRestore {
  switch (outcome.kind) {
    case 'failed':
      return {
        kind: 'failed',
        at,
        stage: outcome.stage,
        reason: outcome.reason
      };
    case 'shell_only':
      return {
        kind: 'shell_only',
        at,
        ...(outcome.replayFailure !== undefined
          ? { replayFailure: outcome.replayFailure }
          : {}),
        ...(outcome.armFailure !== undefined
          ? { armFailure: outcome.armFailure }
          : {})
      };
    case 'transcript':
      return {
        kind: 'transcript',
        at,
        ...(outcome.armFailure !== undefined
          ? { armFailure: outcome.armFailure }
          : {})
      };
    case 'armed':
      return {
        kind: 'armed',
        at,
        ...(outcome.replayFailure !== undefined
          ? { replayFailure: outcome.replayFailure }
          : {})
      };
  }
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
 * The resume argv to ARM, with a captured session's dead SpecStory binary
 * healed first.
 *
 * WHY THIS EXISTS. A captured session records its resume argv wrapped in the
 * ABSOLUTE path of the specstory binary it launched under
 * (`specstory.bin`), and restore types that argv verbatim. The path is a
 * promise about the future that gmux cannot keep:
 *
 *  - renaming the app (Phase 16.5, gmux.app → Tortie.app) invalidates the
 *    recorded `/Applications/gmux.app/Contents/Resources/bin/specstory` for
 *    EVERY captured session at once;
 *  - a `git clean` removes `build/vendor/specstory`, which is the bin every
 *    dev-created row recorded;
 *  - an uninstalled Homebrew copy does the same for anyone who resolved to
 *    `installed`.
 *
 * Measured, the armed line then answers `…/specstory: No such file or
 * directory` and exits 127, so the user presses Enter on their restored
 * session and their conversation does not come back. That is the one thing a
 * restore may not do, and it is worth healing rather than reporting.
 *
 * The ladder, in order of how much it preserves:
 *
 *  1. bin still there → the recorded argv, untouched (the normal path).
 *  2. bin gone, a specstory resolvable now → RE-WRAP the same inner resume
 *     command with today's binary. Capture continues, under the session's own
 *     recorded provider and no-cloud choice — never a freshly re-read one.
 *  3. no specstory at all → arm the BARE agent resume. The conversation comes
 *     back, capture does not continue, and the log says so.
 *
 * The inner command comes from {@link unwrapArgv} because the resume argv is
 * composed after the fact (the harvest arms it once the agent's id exists) and
 * the manifest's verbatim copy — `specstory.agentArgv` — is the LAUNCH argv,
 * not this one. Re-splitting is the lossy direction (see specstory/wrap.ts),
 * but every alternative here is "the resume does not run at all".
 *
 * Exported so the rename migration's harness can PROVE the first bullet
 * (`GMUX_SMOKE=migrate`, Phase 16.5a) against a row recorded under the old
 * bundle path, rather than asserting that it is handled.
 */
export async function armableResumeArgv(
  rec: ManifestSessionRecord
): Promise<string[]> {
  const recorded = [...(rec.resumeArgv ?? [])];
  const capture = rec.specstory;
  if (
    recorded.length === 0 ||
    capture?.enabled !== true ||
    !isWrappedArgv(recorded) ||
    existsSync(capture.bin)
  ) {
    return recorded;
  }

  const inner = unwrapArgv(recorded);
  if (inner.length === 0) {
    // Not a shape this function can take apart; arming the recorded line at
    // least fails loudly in the pane rather than silently arming nothing.
    console.warn(
      `[gmux] "${rec.name}": recorded SpecStory binary is gone (${capture.bin}) ` +
        'and its resume command could not be unwrapped — arming it as recorded'
    );
    return recorded;
  }

  const { active } = await resolveSpecstory();
  if (active !== null) {
    const rewrapped = wrapWithRecord({ ...capture, bin: active.path }, inner);
    if (rewrapped !== null) {
      console.warn(
        `[gmux] "${rec.name}": recorded SpecStory binary is gone ` +
          `(${capture.bin}) — re-armed under ${active.path}, capture continues`
      );
      return rewrapped;
    }
  }

  console.warn(
    `[gmux] "${rec.name}": recorded SpecStory binary is gone (${capture.bin}) ` +
      'and no SpecStory CLI is available — armed the agent directly, so this ' +
      'session resumes but is no longer captured'
  );
  return inner;
}

/**
 * Recreate one manifested session in tmux with replayed scrollback and an
 * armed resume command. Pure tmux side effects — no manifest writes here.
 *
 * NEVER THROWS FOR A RESTORE THAT FAILED. It returns the `failed` arm carrying
 * the original error, and the caller rethrows it after recording the attempt.
 * The `GmuxError` the renderer shows is the same object it was before, so the
 * friendly "that folder is gone" state is unchanged.
 */
export async function restoreSessionInTmux(
  rec: ManifestSessionRecord,
  options: RestoreSessionOptions = {}
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
    const reason =
      `"${rec.name}" was in ${rec.cwd}, and that folder is gone. ` +
      `${agentDisplayName(rec.agent)} can only find this conversation from ` +
      'its original folder, so restoring it somewhere else would open an ' +
      'empty session that looks resumed. Put the folder back and restore ' +
      'again, or start a new session.';
    return {
      kind: 'failed',
      stage: 'preflight',
      reason,
      error: gmuxError('INVALID_INPUT', reason, rec.cwd)
    };
  }

  const cwd = !originalCwdGone
    ? rec.cwd
    : existsSync(rec.projectPath)
      ? rec.projectPath
      : null;
  if (cwd === null) {
    const reason = `The folder for "${rec.name}" no longer exists.`;
    return {
      kind: 'failed',
      stage: 'preflight',
      reason,
      error: gmuxError('INVALID_INPUT', reason, rec.cwd)
    };
  }

  // GUI-launched Electron inherits a minimal env; SHELL may be unset.
  const shell = process.env['SHELL'] ?? '/bin/zsh';

  faultPoint('restore.before-spawn');
  let info: tmux.TmuxSessionInfo;
  try {
    info = await tmux.createSession({
      displayName: rec.name,
      cwd,
      argv: [shell],
      // Same markers a fresh create stamps (Phase 12.7 F3): a restored session
      // is just as managed, and identity must survive the round trip.
      env: { ...rec.env, ...tmux.managedPaneEnv(rec.id) }
    });
  } catch (err) {
    return {
      kind: 'failed',
      stage: 'create',
      reason: `"${rec.name}" could not be recreated: ${(err as Error).message}`,
      error: err
    };
  }

  // The journal's second write, before anything else touches the pane. A
  // failure here is logged and swallowed: the session exists, and the restore
  // is worth more than the bookkeeping.
  try {
    options.onCreated?.(info);
  } catch (err) {
    console.warn(
      `[gmux] could not record the restore of "${rec.name}": ${(err as Error).message}`
    );
  }

  faultPoint('restore.after-spawn');

  // From here on, target the immutable $-id (rename-proof addressing).
  const target = info.sessionId;

  // Step 2 — replay the snapshot as inert history (executed).
  let replayed = false;
  let replayFailure: string | undefined;
  const resolved = resolveSnapshot(rec.id);
  const snapshot = resolved?.path ?? null;
  if (resolved !== null && resolved.rejected > 0) {
    // Items 3 and 9. The newest capture did not prove out and the ring gave
    // an earlier one instead. The restore succeeds, so nothing else on this
    // path would say a word, and the user is about to look at scrollback that
    // stops earlier than the one they remember.
    console.warn(
      `[gmux] "${rec.name}" restored from an earlier snapshot: ` +
        `${String(resolved.rejected)} newer generation(s) did not verify`
    );
    postDurabilityNotice({ kind: 'snapshot-repaired', sessionName: rec.name });
  }
  if (snapshot !== null) {
    try {
      await typeIntoPane(target, buildSnapshotReplayCommand(snapshot), true);
      replayed = true;
    } catch (err) {
      // A failed replay must not lose the restore itself. It must not be
      // forgotten either, which is what used to happen one line below this
      // one: the boolean was dropped and the session was stored as 'running'.
      replayFailure = (err as Error).message;
      console.warn(
        `[gmux] snapshot replay failed for "${rec.name}": ${replayFailure}`
      );
    }
  }

  faultPoint('restore.after-replay');

  // Step 3 — arm the resume command (typed, NOT executed).
  let armedCommand: string | null = null;
  let armFailure: string | undefined;
  const armed = buildArmedCommand(await armableResumeArgv(rec));
  if (armed.length > 0) {
    try {
      await typeIntoPane(target, armed, false);
      armedCommand = armed;
    } catch (err) {
      armFailure = (err as Error).message;
      console.warn(
        `[gmux] could not arm resume for "${rec.name}": ${armFailure}`
      );
    }
  }

  faultPoint('restore.after-arm');

  // The kind names the BEST thing that came back, and the two failure fields
  // say what did not. The two stages are independent: a session with no saved
  // snapshot can still arm its resume perfectly, and reporting that one as
  // `shell_only` would hide the one thing the user cares about most.
  if (armedCommand !== null) {
    return {
      kind: 'armed',
      info,
      armedCommand,
      ...(replayFailure !== undefined ? { replayFailure } : {})
    };
  }
  if (replayed) {
    return {
      kind: 'transcript',
      info,
      ...(armFailure !== undefined ? { armFailure } : {})
    };
  }
  return {
    kind: 'shell_only',
    info,
    ...(replayFailure !== undefined ? { replayFailure } : {}),
    ...(armFailure !== undefined ? { armFailure } : {})
  };
}
