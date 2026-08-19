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
 * ## What Phase 89 changed
 *
 * `RESUME_NOT_TYPED_HERE` is GONE. It said that continuing a conversation on
 * another machine is something this release does not do, and after Phase 89
 * that is false: a restore of a row the arming gate proves types the command
 * into the session on that machine and stops without pressing Enter. Five
 * sentences take its place, being one per landing the read back can report and
 * one for a command Tortie did not compose itself. It was deleted rather than
 * reworded, the way Phase 72 deleted `RESTORE_REFUSED` when it became false.
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
 * PINNED as `machine.resume-not-collected`. It is printed for a row whose
 * provenance says nothing was ever collected for it. The session comes back.
 * The conversation does not, and the person is told so at the moment it happens
 * rather than discovering it in an empty pane.
 *
 * PHASE 73 FIX ROUND changed the reason clause, because the old one became
 * false. It said Tortie does not read an agent's own files on another machine
 * yet. It does now, while it is connected, for the agents whose keys can be
 * checked over a connection. What is true for a row carrying this sentence is
 * narrower and is what the sentence now says: no id was got for THIS session.
 */
/**
 * The command was typed into the session on that machine, and nothing ran.
 *
 * NOT PINNED, because every successful remote agent restore reaches it and a
 * bundler cannot fold away a branch production takes. It is the answer for a
 * landing of `armed`, being a screen that showed the command exactly once after
 * the send.
 *
 * The second sentence is an instruction rather than a description, because the
 * one thing left to do belongs to the person and nothing else says so. It is
 * the same promise the local restore has always made: Tortie types the command
 * and the person presses Enter.
 */
export const RESUME_ARMED_NOT_PRESSED =
  'Tortie typed the command that continues this conversation into this ' +
  'session on that machine, and it did not press Enter. Press Enter in this ' +
  'session to continue the conversation.';

/**
 * The screen showed the command twice after one send.
 *
 * PINNED as `machine.resume-typed-twice`. `send-keys` is the first verb on the
 * remote ledger that is not safe to run twice, and this sentence is what the
 * guard named on that row produces when it finds the second copy. A machine can
 * take a command and lose the reply on the way back, so a send Tortie believes
 * failed can have landed.
 *
 * Nothing ran, and the sentence says so before it asks for anything, because a
 * person reading about two copies of a command will assume one of them ran.
 */
export const RESUME_TYPED_TWICE =
  'This session on that machine shows two copies of the command that ' +
  'continues this conversation. Tortie sent it once and the machine took it ' +
  'twice, which can happen when a reply is lost on the way back. Nothing ran, ' +
  'because Tortie never presses Enter. Clear the line before you press Enter.';

/**
 * Tortie read the screen and the command is not on it.
 *
 * PINNED as `machine.resume-not-landed`. It is a screen Tortie READ. The
 * separate sentence below is for a screen Tortie could not read, and the two
 * are kept apart for the reason the restore gate keeps `no-route` and `unseen`
 * apart: telling a person a thing is not there when nobody looked is a
 * different claim from telling them it is not there.
 */
export const RESUME_NOT_LANDED =
  'Tortie sent the command that continues this conversation and this session ' +
  'on that machine does not show it. Nothing ran on that machine. The session ' +
  'came back with its folder, and the conversation did not come back.';

/**
 * Tortie could not read the screen after the send.
 *
 * PINNED as `machine.resume-arm-unreadable`. The honest answer when the read
 * back itself failed. Tortie does not know whether the command is there, and
 * the sentence says that rather than guessing either way.
 */
export const RESUME_ARM_UNREADABLE =
  'Tortie sent the command that continues this conversation and then could ' +
  'not read the screen of that session, so it cannot say whether the command ' +
  'is there. Nothing ran, because Tortie never presses Enter. Look at the ' +
  'session before you press Enter.';

/**
 * One word of the command did not come from Tortie's own compiled lists.
 *
 * PINNED as `machine.resume-not-composed`. This is the sentence behind rule 1
 * of Phase 89, being that the bytes typed on another machine are composed by
 * Tortie from the agent registry and never by a person. Every element after the
 * program path has to be a token the compiled build already holds, or the row's
 * own conversation id. One element outside that set refuses the whole thing and
 * nothing is sent.
 *
 * An agent a person added in Settings is refused here, because its flags come
 * from the overlay rather than from the compiled catalogue. That session comes
 * back with its folder and its program.
 */
export const RESUME_NOT_COMPOSED =
  'Tortie will not type this command on another machine, because one word in ' +
  'it did not come from the list of programs and flags Tortie was built with. ' +
  'Tortie only types commands it composed itself. The session comes back with ' +
  'its folder and its program, and the conversation does not come back.';

export const RESUME_NOT_COLLECTED =
  "Tortie has no conversation id for this session. It reads an agent's own " +
  'files on a machine only while it is connected to that machine, and it did ' +
  'not get one for this session. The session comes back with its folder and ' +
  'its program. The conversation does not come back.';

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

/**
 * The folder named for the new session is not on that machine.
 *
 * PHASE 84 GAVE IT ITS FIRST LIVE CALLER. Until this phase it was matched
 * against the text a failed create THREW, and a create against a folder that is
 * not there does not throw. MEASURED 2026-08-18 on tmux 3.6a over a scratch
 * socket: `new-session -c /a-path-that-is-not-there` exits 0, prints `$0`,
 * makes a live session and puts the pane in the home directory. So the folder
 * is now asked about with the `dir-list` script BEFORE the create line is
 * composed, and this sentence is what a person reads when the answer is that
 * there is nothing there.
 */
export const REMOTE_DIR_MISSING =
  'That machine has no folder at the path you gave, so nothing was started ' +
  'there.';

/** The path named for the new session is on that machine and is not a folder. */
export const REMOTE_DIR_NOT_A_FOLDER =
  'That path is on that machine and it is not a folder, so nothing was ' +
  'started there.';

/** The account on that machine cannot read the folder that was named. */
export const REMOTE_DIR_DENIED =
  'That account cannot read that folder on that machine, so Tortie did not ' +
  'start anything there.';

/**
 * The machine did not answer the folder question, so nothing was listed.
 *
 * It is the picker's own version of {@link MACHINE_NOT_CONNECTED}, written with
 * the machine's label in it because the picker draws a whole panel about one
 * machine and a sentence with no name in it reads as being about all of them.
 */
export function dirListUnreachable(label: string): string {
  return `${label} did not answer, so there is nothing to show.`;
}

/**
 * Restart, refused because the session runs on another machine (Phase 84).
 *
 * PINNED as `machine.restart-on-machine`. Restart composes a create out of the
 * old row and drops the machine on the floor, so before this phase a restart of
 * a row on a machine started the session on THIS Mac and hard deleted the
 * remote record. Between two Macs whose folder shapes agree, the result was a
 * local session wearing the remote one's name while the agent kept running over
 * there, with no undo.
 *
 * Main refuses BEFORE `createSession` is called, so nothing is created and
 * nothing is discarded. The sentence says what a person can do instead.
 */
export const RESTART_ON_MACHINE =
  'Tortie will not restart this session, because it runs on another machine ' +
  'and restarting it here would start it on this Mac instead. End it, then ' +
  'start a new session on that machine. Nothing was changed.';

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
 * The machine has no program of that name (Phase 72, widened in Phase 84).
 *
 * A refusal rather than a guess, for the same reason `noRemotePathRefusal` is
 * one. A program Tortie cannot find on that machine is a program that will not
 * start there, and composing a path from what this Mac holds would run nothing
 * or run something nobody chose.
 *
 * PHASE 84 ADDED THE COUNT, because the old sentence was refusing on a machine
 * where the program was installed. It said Tortie could not find claude on the
 * operator's Mac Pro while claude sat at `~/.local/bin/claude` and two of
 * Tortie's own claude sessions ran there. The count is how many folders were
 * actually searched, so a person reading it can tell "Tortie looked in 17
 * folders" from "Tortie asked one question and gave up". The list of folders
 * itself goes to the log and to the error detail rather than on screen.
 */
export function noRemoteProgramRefusal(
  bare: string,
  label: string,
  searched: number
): string {
  return (
    `Tortie could not find ${bare} on ${label}. It looked in ` +
    `${String(searched)} folders, being the ones that machine lists for ` +
    `programs and the ones programs are usually kept in. Nothing was started ` +
    `there. Install it on ${label}, or start the session on a machine that ` +
    `has it.`
  );
}

// ---------------------------------------------------------------------------
// PHASE 73, M6. Every sentence the second door, the image upload, the review
// and the conversation copy print.
//
// They are here rather than in the four modules that print them, for the reason
// the header gives: the vocabulary audit reads one file, and
// `build/assert-bundle-refusals.mjs` pins the ones production reaches rarely so
// a later rollup cannot delete a refusal it can prove unreachable.
//
// BUILDER A wrote all of them, for all three builders, so that one person held
// the writing rules for the whole rung.
// ---------------------------------------------------------------------------

/**
 * A script name nobody wrote down.
 *
 * PINNED as `machine.script-not-in-catalogue`. It is a programming error rather
 * than a state a person can reach by using the product, and it is a sentence
 * anyway, because the alternative is a stack trace in a place where a person is
 * owed an answer about their machine.
 */
export const SCRIPT_NOT_IN_CATALOGUE =
  'Tortie will not run that on another machine. Only the commands Tortie has ' +
  'written down may cross to a machine, and this one is not on that list. ' +
  'Nothing was sent.';

/**
 * A write reached through the read door, or a read through the write door.
 *
 * PINNED as `machine.write-through-read-door`. One script in the whole
 * catalogue writes anything, and it is reachable through one function. This is
 * the sentence that fires when something tries to reach it through the other
 * one.
 */
export const WRITE_THROUGH_READ_DOOR =
  'Tortie will not run that on another machine, because a command that only ' +
  'reads and a command that writes go through different doors and this one ' +
  'came through the wrong door. Nothing was sent.';

/**
 * The machine is not answering, so nothing was asked of it.
 *
 * PINNED as `machine.not-connected`. This is where connected only lives for
 * every caller at once. It fires before anything is composed, and it fires
 * again when the connection was replaced while a command was in flight, because
 * an answer from a connection Tortie no longer has is not an answer about the
 * machine Tortie has now.
 */
export const MACHINE_NOT_CONNECTED =
  'Tortie is not connected to that machine right now, so it did not ask it ' +
  'for anything. What Tortie already knows about that machine is as old as ' +
  'the last time it answered. Nothing was sent.';

/**
 * An environment value Tortie will not put on a session on another machine.
 *
 * PINNED as `machine.env-passthrough-refused`. The trace is in
 * docs/research/52-remote-env-and-review.md. A value sent this way is one
 * element of the argv of the local ssh process and one element of the argv of
 * that machine's own tmux, so it is in two process tables at once for the life
 * of the create. On this Mac an account cannot read another account's
 * arguments. On a Linux machine the usual default is that any account can. No
 * Linux machine was measured here, so the passthrough is refused rather than
 * offered with a warning.
 */
export const REMOTE_ENV_PASSTHROUGH_REFUSED =
  'Tortie will not put that value on a session on another machine. A value ' +
  'sent this way is part of a command line that other accounts on that ' +
  'machine can read, and Tortie has not measured which accounts can read it ' +
  'there. Nothing was started.';

/**
 * An image bigger than the cap. The number is the cap, in kilobytes.
 *
 * PHASE 73 FIX ROUND. It took megabytes and printed "0.09 MB", which is a
 * number nobody says out loud and which reads as a rounding error rather than
 * as a limit. The cap is 90,000 bytes, so the unit a person can use is
 * kilobytes and the sentence says 90 KB.
 */
export function imageTooLargeRefusal(kilobytes: number): string {
  return (
    `That image is larger than ${String(kilobytes)} KB, so Tortie did not ` +
    `copy it to the machine. Nothing was sent.`
  );
}

/**
 * A file whose first bytes are not an image.
 *
 * The claimed name decides nothing here, which is the rule the local drop store
 * already follows. A text file renamed to end in `.png` is refused by this
 * sentence.
 */
export const IMAGE_NOT_AN_IMAGE =
  'That file is not an image, so Tortie did not copy it to the machine. ' +
  'Tortie reads the first bytes of a file rather than its name, and these ' +
  'bytes are not any image it knows. Nothing was sent.';

/**
 * The far side wrote something of a different size or a different checksum.
 *
 * PINNED as `machine.image-not-written`. Nothing is inserted into the session
 * when this fires, because a path to bytes that did not land is worse than no
 * path at all.
 */
export const IMAGE_NOT_WRITTEN =
  'The image did not arrive on that machine in one piece, so Tortie did not ' +
  'give the session a path to it. You can try again.';

/**
 * Something other than an image dropped on a session on another machine.
 *
 * THIS STRING EXISTS TWICE ON PURPOSE, and it is the one duplication this rung
 * accepts. Main refuses the upload and the renderer refuses the drop, and
 * neither may import the other. The copy in
 * `src/renderer/terminal/drop/remote.ts` is byte identical, and
 * `build/conformance-machines.mjs` compares the two.
 */
export const REMOTE_DROP_IMAGES_ONLY =
  'That session runs on another machine, so Tortie can only attach images to ' +
  'it. The other files stayed on this Mac, because their paths mean nothing ' +
  'on that machine.';

/**
 * The folder named for a review is not inside a repository.
 *
 * PINNED as `machine.review-not-a-repository`. The last sentence is a promise
 * about both machines, and it is true by construction: every script the review
 * uses is a read, and the conformance gate reads their text to prove it.
 */
export const REVIEW_NOT_A_REPOSITORY =
  'That folder on the machine is not inside a repository, so there are no ' +
  'changes for Tortie to show. Nothing was changed on either machine.';

/** A file whose two sides are over the cap. The number is the cap, in megabytes. */
export function reviewTooLargeNote(megabytes: number): string {
  return (
    `This file is larger than ${String(megabytes)} MB on that machine, so ` +
    `Tortie is showing the first ${String(megabytes)} MB of each side. The ` +
    `rest is not shown.`
  );
}

/** A review that found nothing changed. */
export const REVIEW_NOTHING_CHANGED =
  'Nothing has changed in that folder on the machine since its last commit.';

/** More changed files than the menu lists. */
export function reviewMoreFiles(shown: number, total: number): string {
  return (
    `Showing ${String(shown)} of ${String(total)} changed files. The rest are ` +
    `not listed here.`
  );
}

// ---------------------------------------------------------------------------
// PHASE 90.2. Finding this project on a machine, and offering to put it there
// ---------------------------------------------------------------------------
//
// Two rules run through every sentence below.
//
// TORTIE NEVER COMPARES THE CONTENTS OF THE TWO FOLDERS, and the sentences say
// so rather than leaving a person to assume it. A shared git remote means two
// folders were cloned from one place. It does not mean they hold the same work,
// and Microsoft's own `microsoft/vscode` issue 190566 is seven steps of what
// happens when a product quietly assumes it does.
//
// A MATCH IS A SUGGESTION. Nothing here is written by a match. The Directory
// field is filled and stays editable, and the one write in this block happens
// only after a person reads the address and the destination and presses a
// button.

/** Exactly one folder over there has this project's git remote. */
export function counterpartFound(label: string, path: string): string {
  return (
    `Found at ${path} on ${label}. That folder has the same git remote as ` +
    `this project. Tortie has not compared what is in the two folders.`
  );
}

/** Two or more folders over there have it, so nothing is filled in. */
export function counterpartSeveral(label: string, total: number): string {
  return (
    `${String(total)} folders on ${label} have the same git remote as this ` +
    `project. They may hold different work, so Tortie filled nothing in. Pick ` +
    `one below, or type the folder yourself.`
  );
}

/** The remote is known and nothing over there matches it. */
export function counterpartAbsent(label: string, searched: number): string {
  return (
    `No folder on ${label} has this project's git remote. Tortie read ` +
    `${String(searched)} git folders under your home folder there.`
  );
}

/** The project has no git remote, so no machine was contacted. */
export function counterpartNoRemote(label: string): string {
  return (
    `This project has no git remote, so Tortie has nothing to look for on ` +
    `${label}. Type the folder, or press Browse.`
  );
}

/** The remote is a folder on this Mac, so that machine cannot reach it. */
export function counterpartLocalRemote(label: string): string {
  return (
    `This project's remote is a folder on this Mac. ${label} cannot reach it, ` +
    `so there is nothing to copy from.`
  );
}

/** The machine did not answer the one read. */
export function counterpartUnreachable(label: string): string {
  return (
    `${label} did not answer, so Tortie could not look for this project ` +
    `there. Type the folder, or press Browse.`
  );
}

/** What was searched, in the person's own terms. `depth` is folders deep. */
export function counterpartSearchRule(label: string, depth: number): string {
  return (
    `Tortie looked under your home folder on ${label}, ${String(depth)} ` +
    `folders deep, for a folder with the same git remote. It read nothing else.`
  );
}

/**
 * The address was rewritten before anything crossed, and both are shown.
 *
 * MEASURED on the operator's Mac Pro on 2026-08-18. Its `~/.ssh` holds only
 * `authorized_keys` and no key of its own, so an address written for a sign in
 * key cannot authenticate from there and the web address can. The sentence
 * names neither transport, because the word teaches a person nothing and the
 * vocabulary audit forbids it.
 */
export function counterpartTranslated(
  origin: string,
  https: string,
  label: string
): string {
  return (
    `This project's remote address is written for a sign in key, and ${label} ` +
    `has no key of its own. Tortie will use the web address instead. The ` +
    `address here is ${origin}. The address Tortie will use is ${https}.`
  );
}

/** The copy finished. */
export function cloneDone(label: string, path: string): string {
  return `Copied into ${path} on ${label}. Nothing on this Mac changed.`;
}

/** Something is already at the destination, so nothing was written. */
export function cloneExists(label: string, path: string): string {
  return (
    `There is already something at ${path} on ${label}. Tortie never writes ` +
    `into a folder that is already there. Choose another folder.`
  );
}

/**
 * The destination already holds this same project, so the folder is used.
 *
 * It exists because a lost answer is not a failed copy. A link that dies after
 * the far side finished leaves a good copy Tortie never heard about, and the
 * next attempt would then read `exists` for a folder Tortie itself made.
 */
export function cloneExistsSame(label: string, path: string): string {
  return (
    `There is already a copy of this project at ${path} on ${label}. Tortie ` +
    `used that folder and copied nothing.`
  );
}

/** The machine could not sign in to the address, and wrote nothing. */
export function cloneUnreachable(label: string, url: string): string {
  return (
    `${label} could not reach ${url}. It signs in with what it already has, ` +
    `and Tortie sends no password and no key from this Mac. Nothing was ` +
    `written on ${label}.`
  );
}

/** git refused, and what it printed is drawn under this line. */
export function cloneFailed(label: string, url: string): string {
  return `${label} could not copy ${url}. What it reported is under this line.`;
}

/** The deadline was hit on this Mac. The copy may still be running there. */
export function cloneTimedOut(
  label: string,
  path: string,
  minutes: number
): string {
  return (
    `The copy did not finish within ${String(minutes)} minutes, so Tortie ` +
    `stopped waiting. It may still be running on ${label}, and part of the ` +
    `project may be left at ${path}. Look there before you try again.`
  );
}

/**
 * Main's own read of the remote disagreed with the address the sheet drew.
 *
 * This is the sentence behind the rule that the renderer never chooses the
 * address. Main re-reads the origin at the project folder, translates it again
 * and compares. A disagreement copies nothing.
 */
export const CLONE_CHANGED =
  "This project's git remote changed while this sheet was open, so Tortie " +
  'copied nothing. Close this sheet and open it again.';

/** Tortie is not connected to that machine, so nothing was sent. */
export function cloneOffline(label: string): string {
  return (
    `Tortie is not connected to ${label} right now, so it copied nothing.`
  );
}

/**
 * The address is not a web address, so nothing was sent.
 *
 * PINNED as `machine.clone-not-web-address`. A correct caller never reaches it,
 * because the button that opens the confirm is drawn only for a project whose
 * remote already translated to a web address. That is exactly the shape a
 * bundler can prove dead and fold away, which is what this pin exists for.
 */
export const CLONE_NOT_WEB_ADDRESS =
  'Tortie only copies a project from a web address. This project\'s remote ' +
  'is not one, so nothing was sent to that machine.';

/**
 * The destination is not a full path on that machine, so nothing was sent.
 *
 * PINNED as `machine.clone-path-not-absolute`, for the reason above. The field
 * is filled with a full path composed from that machine's own home directory,
 * so a person reaches this only by editing it into something else.
 */
export const CLONE_PATH_NOT_ABSOLUTE =
  'That folder has to be a full path on the other machine, starting with a ' +
  'slash. Nothing was sent.';
