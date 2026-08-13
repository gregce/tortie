/**
 * The restore journal, read side (Phase 19 item 7).
 *
 * THE DEFECT THIS CLOSES. A restore has four stages and the manifest used to
 * learn about it only at the end. If Tortie stopped part way through, the next
 * launch had no way to tell these three situations apart:
 *
 *   1. the restore never started, and the row is simply restorable;
 *   2. the restore created a tmux session and Tortie died before recording
 *      it, so a session exists that the manifest does not know about;
 *   3. the restore finished and the status write was the thing that was lost.
 *
 * In all three the row read `restorable`, so "Restore all" would happily start
 * a SECOND agent in a worktree that already had one running. The journal makes
 * the three distinguishable, and this module is the part that decides what to
 * do about each.
 *
 * WHY THE POLICY IS A PURE FUNCTION. Resolution compares two independent
 * sources: what the journal says was attempted, and what tmux actually has on
 * the socket right now. That comparison is the whole value of the journal, so
 * it is written where it can be tested against every combination of the two
 * without a tmux server, an app, or a clock.
 *
 * WHAT THIS MODULE DOES NOT DO. It never writes a status. A session that is
 * alive on the socket is reconcile's to claim, by identity, exactly as it
 * claims every other live session — there is no second adoption path here, and
 * adding one would give Tortie two answers to "is this session mine".
 */

import type { RestoreAttemptRecord } from '../manifest';
import type { SessionRestore } from '@shared/types';

/** What tmux says about one session id, as far as the resolver needs it. */
export interface LiveIdentity {
  /** The manifest session id stamped on a live tmux session. */
  gmuxId: string;
  /** Its immutable `$-id` on the private socket. */
  tmuxId: string;
}

/**
 * One decision about one unfinished attempt.
 *
 * `record` is what to store on the session row. `note` is one plain sentence
 * for the log, written so that a person reading it at three in the morning
 * learns what happened without opening the source.
 */
export interface JournalResolution {
  attemptId: number;
  sessionId: string;
  /**
   * - `nothing-came-back`: the journal has no tmux id and tmux has no session
   *   carrying this row's identity. Two sources agree, so the attempt is
   *   closed as failed and the row stays restorable.
   * - `came-back`: a live session carries this row's identity. What it
   *   contains is not known, because the crash could have landed before or
   *   after the scrollback replay.
   * - `session-lost`: the journal recorded a tmux session and tmux does not
   *   have it any more, e.g. the machine rebooted after the crash. Nothing to
   *   adopt and nothing to kill.
   * - `unrecorded-session`: the journal has no tmux id and yet a live session
   *   carries this row's identity. This is the disagreement the journal was
   *   built to detect: Tortie stopped in the window between `new-session`
   *   returning and the id being written.
   * - `already-recorded`: the row carries a restore record from this attempt,
   *   so the restore had finished and reported itself, and only the journal
   *   close was lost. The attempt closes with what the row already says and
   *   the row is not touched.
   */
  kind:
    | 'nothing-came-back'
    | 'came-back'
    | 'session-lost'
    | 'unrecorded-session'
    | 'already-recorded';
  /** The live tmux `$-id` when one was found. */
  tmuxId?: string;
  /** What to store on the session row. */
  record: SessionRestore;
  /**
   * False when `record` is what the row ALREADY says and must not be written
   * over. The caller still closes the attempt.
   */
  write: boolean;
  note: string;
}

/**
 * Decide what to do about every attempt that never finished.
 *
 * @param attempts unfinished attempts, oldest first
 * @param live     every session tmux has on the private socket that carries a
 *                 gmux identity
 * @param existing what each session row already says about its last restore
 * @param at       epoch ms stamped on the records, injectable for tests
 */
export function resolveRestoreJournal(
  attempts: readonly RestoreAttemptRecord[],
  live: readonly LiveIdentity[],
  existing: ReadonlyMap<string, SessionRestore> = new Map(),
  at: number = Date.now()
): JournalResolution[] {
  const byGmuxId = new Map(live.map((s) => [s.gmuxId, s.tmuxId]));
  const byTmuxId = new Set(live.map((s) => s.tmuxId));

  return attempts.map((attempt) => {
    const liveTmuxId = byGmuxId.get(attempt.sessionId);
    const base = { attemptId: attempt.id, sessionId: attempt.sessionId };

    // The restore reported itself and only the journal close was lost. The
    // row's own record is better evidence than anything this function can
    // work out, so it is kept. Writing "not known" over an accurate "armed"
    // would be the app telling the user less than it knows, which is the same
    // failure as item 6 pointed the other way.
    const already = existing.get(attempt.sessionId);
    if (already !== undefined && already.at >= attempt.startedAt) {
      return {
        ...base,
        kind: 'already-recorded' as const,
        ...(liveTmuxId !== undefined ? { tmuxId: liveTmuxId } : {}),
        record: already,
        write: false,
        note: `restore of ${attempt.sessionId} had already recorded "${already.kind}" before Tortie stopped`
      };
    }

    if (liveTmuxId !== undefined) {
      // The session is there. Whether its scrollback replayed and whether its
      // resume is armed are both unknowable from here: the crash could have
      // landed on either side of those two stages, and photographing the pane
      // to guess would be reading tea leaves. Say so.
      const recorded = attempt.tmuxId !== null;
      return {
        ...base,
        kind: recorded ? ('came-back' as const) : ('unrecorded-session' as const),
        tmuxId: liveTmuxId,
        record: {
          kind: 'interrupted' as const,
          at,
          reason:
            'Tortie stopped during this restore. The session came back, and ' +
            'whether its scrollback and its resume command came with it is ' +
            'not known.'
        },
        write: true,
        note: recorded
          ? `restore of ${attempt.sessionId} was interrupted; its session ${liveTmuxId} is still there`
          : `restore of ${attempt.sessionId} created session ${liveTmuxId} and stopped before recording it`
      };
    }

    if (attempt.tmuxId !== null) {
      const stillThere = byTmuxId.has(attempt.tmuxId);
      return {
        ...base,
        kind: 'session-lost' as const,
        record: {
          kind: 'failed' as const,
          at,
          stage: 'create' as const,
          reason:
            'Tortie stopped during this restore and the session it had ' +
            'created is gone. Nothing came back. Restore it again.'
        },
        write: true,
        note: stillThere
          ? // The id is on the socket but carries a different identity, which
            // means tmux reused the number for somebody else's session. Never
            // touch it. This is the same rule that stops reconcile adopting a
            // stranger that took a freed name.
            `restore of ${attempt.sessionId} recorded session ${attempt.tmuxId}, and that id now belongs to another session — left alone`
          : `restore of ${attempt.sessionId} recorded session ${attempt.tmuxId}, which is gone`
      };
    }

    return {
      ...base,
      kind: 'nothing-came-back' as const,
      record: {
        kind: 'failed' as const,
        at,
        stage: 'create' as const,
        reason:
          'Tortie stopped during this restore before anything was created. ' +
          'Nothing came back. Restore it again.'
      },
      write: true,
      note: `restore of ${attempt.sessionId} left nothing behind`
    };
  });
}

/**
 * True when a resolution found a live session the manifest had no record of.
 *
 * This is the one resolution that is evidence of a defect rather than of a
 * crash, and the harness in Phase 19 item 1 asserts on it, so it is named
 * rather than left to a string comparison at the call site.
 */
export function isUnrecordedSession(r: JournalResolution): boolean {
  return r.kind === 'unrecorded-session';
}
