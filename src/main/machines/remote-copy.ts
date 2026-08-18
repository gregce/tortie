/**
 * Every sentence main prints about a session on another machine (Phase 70, M3,
 * then Phase 72, M5).
 *
 * They are in one module for two reasons. The vocabulary audit in the renderer
 * reads one file rather than hunting through the verb implementations, and
 * `build/assert-bundle-refusals.mjs` pins six of them so a later rollup cannot
 * delete a refusal that production reaches rarely.
 *
 * The writing rules apply to every string here. Simple words, complete
 * sentences, no dashes of any kind, a colon only before a list, and no tmux
 * vocabulary at all. A person reading one of these should learn what Tortie did
 * not do and what is still true of their work.
 *
 * ## What Phase 72 changed
 *
 * `RESTORE_REFUSED` is GONE. It said that bringing a session back on another
 * machine was coming in a later release, and this is that release. Four
 * sentences take its place, one per condition the restore gate can fail, plus
 * one that says what a restore does not bring back. Each of them names a
 * condition a person can act on rather than a date nobody promised.
 */

/**
 * Restore, refused because Tortie cannot see the machine right now.
 *
 * PINNED as `machine.restore-unseen`. It covers two of the gate's arms, being a
 * machine that is not answering and a machine no completed list has been read
 * from in this run. Both are the same fact to a person: Tortie has lost sight of
 * the machine, so it cannot tell a session that ended from one that is still
 * working, and starting the session again would be a guess.
 *
 * This is the sentence that stands in front of the one failure research 28
 * ranked as destroying work.
 */
export const RESTORE_UNSEEN =
  'Tortie cannot see that machine right now, so it will not try to bring this ' +
  'session back. Bringing a session back while the machine is out of sight can ' +
  'start a second agent on the same conversation. Nothing was started.';

/**
 * Restore, refused because the row was created on a different machine.
 *
 * PINNED as `machine.restore-wrong-machine`. The program path on the row was
 * read on the machine that created the session, with that machine's own list of
 * places it looks for programs. It names nothing on any other computer, so using
 * it elsewhere would start the wrong program or none at all.
 */
export const RESTORE_WRONG_MACHINE =
  'This session was created on a different machine. The program path Tortie ' +
  'recorded for it only means something there, so Tortie will not use it here. ' +
  'Nothing was started.';

/**
 * Restore, refused because the machine was removed in Settings.
 *
 * PINNED as `machine.restore-forgotten`. The row survives a removal as a record
 * of what Tortie last knew, which is what the tombstone is for, and the record
 * is not a route back to the machine.
 */
export const RESTORE_FORGOTTEN =
  'You removed this machine from Tortie. This row is a record of what Tortie ' +
  'last knew about the session, and Tortie can no longer reach the machine to ' +
  'bring it back. Nothing was started.';

/**
 * Restore, refused because the machine's own last list still holds the session.
 *
 * The double run guard, and it is not decoration. A restore reads the machine's
 * last completed list first. If that list holds a session carrying this id, the
 * session is running and starting it again would put two agents on one
 * conversation.
 *
 * It is not pinned, because it is reached on every ordinary attempt to restore a
 * live row and a bundler cannot prove that branch dead.
 */
export const RESTORE_STILL_RUNNING =
  'That machine still lists this session, so it is already running. Tortie did ' +
  'not start a second one.';

/**
 * What a restore on another machine does NOT bring back.
 *
 * PINNED as `machine.resume-not-collected`. Tortie reads no agent's own files on
 * another machine in this release, so it never obtained a conversation id for a
 * session there. The session comes back. The conversation does not, and the
 * person is told so at the moment it happens rather than discovering it in an
 * empty pane.
 */
export const RESUME_NOT_COLLECTED =
  "Tortie has no conversation id for this session, because it does not read an " +
  "agent's own files on another machine yet. The session comes back with its " +
  'folder and its program. The conversation does not come back.';

/**
 * A verb aimed at a session no completed list from that machine reported.
 *
 * PINNED as `machine.remote-target-unbound`. This is the refusal that stops
 * Tortie ending somebody else's work. A remote kill or rename is composed only
 * against an identifier a completed poll of that machine reported, on a row
 * whose stamp equals the session being acted on. With no such row, nothing is
 * sent.
 */
export const TARGET_UNBOUND =
  'Tortie will not send that command, because it has not seen this session in ' +
  'a list from that machine. Acting on a session it cannot account for is how ' +
  'work on somebody else’s machine gets ended. Nothing was sent.';

/**
 * The machine has not been prepared in this run of Tortie.
 *
 * Preparing is where the sign in happens, where the version is read and where
 * the machine's own list of places it looks for programs is captured. A create
 * before that would run the wrong copy of a program, or none at all. Phase 72
 * gave it a second reader, being the restore gate's `not-ready` arm, for the
 * same reason.
 */
export const MACHINE_NOT_READY =
  'Tortie has not signed in to that machine yet, so it cannot start a session ' +
  'there. Open Settings and then Machines, and prepare it. Nothing was started.';

/** The folder named for the new session is not on that machine. */
export const REMOTE_DIR_MISSING =
  'That machine has no folder at the path you gave, so nothing was started ' +
  'there.';

/** A create that ran and then could not be found again by name. */
export function noRemoteRowFor(name: string): string {
  return (
    `Tortie could not find a session called ${name} on that machine after it ` +
    `created one. Nothing was changed.`
  );
}

/**
 * Why the saved output is not put back into the recreated session (Phase 72).
 *
 * MOVED HERE IN THE FIX ROUND, from `./remote-restore.ts`. It is a sentence a
 * person reads, and every sentence main prints about a session on another
 * machine lives in this file, under the renderer's vocabulary audit. The module
 * that composes the restore holds log lines as well as copy, and a file holding
 * both cannot be audited by reading its strings.
 *
 * There are three mechanisms that could put the output back and every one of
 * them is refused. This is the honest half of the capsule work, written out so
 * that no later round reads the silence as an oversight.
 *
 * | Mechanism | Why it is refused |
 * | --- | --- |
 * | Write the body to the far side and print it | It is a write to another person's disk. Research 51 section 4.5 defers the one write of that kind to M6 |
 * | Put the bytes into the session as if they were typed | They arrive as input, and a shell runs them. Making that safe needs a holder command and a raw terminal, which is a new failure mode on the one path that must not have one |
 * | Print it into the local terminal ahead of the connection's bytes | The far side redraws the screen when Tortie opens it and the text is gone. It would look like it worked and sometimes not be there |
 *
 * So the copy stays on this Mac, Tortie shows it there with the instant it was
 * taken, and the restore result says plainly that it was not put back.
 */
export const REPLAY_IS_NOT_ATTEMPTED =
  'The output Tortie saved for this session is kept on this Mac and was not ' +
  'put back on that machine. You can open it from the session menu.';

/**
 * A row with no record on this Mac (Phase 72).
 *
 * MOVED HERE IN THE FIX ROUND, for the reason above.
 *
 * Not pinned in the bundle, because it is reachable in ordinary use: every
 * session created on a machine by 0.34 or 0.35 is one of these, and a person
 * upgrading with such a session running will meet it.
 */
export const RESTORE_NO_RECORD =
  'Tortie has no record of how this session was started, because it was ' +
  'created by an older version that kept none for a session on another ' +
  'machine. It cannot be brought back. Nothing was started.';

/**
 * The machine has no program of that name (Phase 72).
 *
 * A refusal rather than a guess, for the same reason `noRemotePathRefusal` is
 * one. A program Tortie cannot find on that machine is a program that will not
 * start there, and composing a path from what this Mac holds would run nothing
 * or run something nobody chose.
 */
export function noRemoteProgramRefusal(bare: string, label: string): string {
  return (
    `Tortie could not find ${bare} on ${label}, so it did not start the ` +
    `session there. Install it there, or start the session on a machine that ` +
    `has it.`
  );
}
