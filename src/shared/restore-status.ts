/**
 * Reading a {@link SessionRestore} — the pure evaluators behind "did this
 * session actually come back" (Phase 19 item 6).
 *
 * NEW FILE appended to src/shared (shared/* is append-only during parallel
 * builds — nothing existing was edited to add it). The shapes live in
 * types.ts because `Session.restore` is one of them; the rules live here
 * because three surfaces need the same answer and must not each invent one:
 * main derives the stored status from a restore, the notice channel decides
 * whether the user is told anything, and the renderer decides what a restored
 * session's row says.
 *
 * THE RULE THESE FUNCTIONS EXIST TO HOLD. Three of the five kinds are each two
 * different situations, and only the failure strings tell them apart.
 *
 *  - `transcript` with no `armFailure` is a plain shell that had no
 *    conversation to resume. That is a complete restore, and saying "the
 *    resume did not come back" about it would be a false alarm.
 *  - `transcript` WITH `armFailure` is a session whose conversation exists and
 *    could not be armed. That is a shortfall and the user needs to hear it.
 *  - `shell_only` with no `replayFailure` is a session that had no saved
 *    snapshot. Nothing was lost in the restore, because there was nothing to
 *    replay.
 *  - `shell_only` WITH `replayFailure` lost scrollback that was on disk.
 *  - `armed` WITH `replayFailure` is the conversation coming back and the
 *    history not. The two stages are independent.
 */

import type { SessionRestore } from './types';

/**
 * True when the restore delivered everything that was available to deliver.
 *
 * Deliberately not "kind === 'armed'". A shell session has no conversation, so
 * demanding an armed resume from it would report every shell restore as a
 * partial one.
 */
export function restoreCameBackWhole(r: SessionRestore | undefined): boolean {
  if (r === undefined) return true;
  if (r.kind === 'failed' || r.kind === 'interrupted') return false;
  return r.replayFailure === undefined && r.armFailure === undefined;
}

/**
 * One plain sentence naming what did not come back, or null when nothing is
 * owed to the user.
 *
 * The sentence is written to be readable on its own, because the notice
 * channel shows it next to a session name and nothing else.
 */
export function restoreShortfall(r: SessionRestore | undefined): string | null {
  if (r === undefined || restoreCameBackWhole(r)) return null;

  if (r.kind === 'failed') {
    return r.reason ?? 'This session could not be restored.';
  }
  if (r.kind === 'interrupted') {
    return (
      r.reason ??
      'Tortie stopped during this restore, so what came back is not known.'
    );
  }

  const lostScrollback = r.replayFailure !== undefined;
  const lostResume = r.armFailure !== undefined;
  if (lostScrollback && lostResume) {
    return 'The folder came back. The saved scrollback and the resume command did not.';
  }
  if (lostScrollback) {
    return r.kind === 'armed'
      ? 'The resume command is waiting. The saved scrollback did not come back.'
      : 'The folder came back. The saved scrollback did not.';
  }
  return 'The scrollback came back. The resume command could not be typed, so start the agent yourself.';
}

/**
 * A short label for a restore result, for a row or a tooltip. Present tense,
 * sentence case, no trailing full stop — the same shape as the status labels
 * in the renderer.
 */
export function restoreLabel(r: SessionRestore): string {
  switch (r.kind) {
    case 'failed':
      return 'restore failed';
    case 'interrupted':
      return 'restore interrupted';
    case 'shell_only':
      return r.replayFailure === undefined
        ? 'restored, no saved scrollback'
        : 'restored without its scrollback';
    case 'transcript':
      return r.armFailure === undefined
        ? 'restored'
        : 'restored without its resume command';
    case 'armed':
      return r.replayFailure === undefined
        ? 'restored, resume armed'
        : 'resume armed, scrollback lost';
  }
}
