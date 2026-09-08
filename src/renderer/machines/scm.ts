/**
 * What Source Control says about a folder on another machine, and what the
 * commit box says there (Phase 104).
 *
 * The doctrine that binds these sentences is in ./presentation.ts, and the tab
 * they are drawn in is described in ./project-tab.ts.
 */

import type { MachineGitIdentity } from '@shared/ipc';

// -- Source Control ----------------------------------------------------------

/*
 * PHASE 228 TOOK THE BAND OFF. `remoteChangesBand` sat under the Source
 * Control header on a tab whose folder is on a machine and said the changes
 * are there, that Tortie can stage, unstage and commit them there, and that
 * it cannot undo a change there. The tab spine and the project header already
 * name the machine, the three verbs are the verbs the rows offer, and the
 * refusal is drawn the way an absent local verb is drawn, which is not at all.
 * The operator's rule of 2026-09-07 is the reason: a remote view says what
 * the local view says and nothing more. The refusal itself is permanent and
 * `build/conformance-machines.mjs` condition 83 still checks it against every
 * command Tortie can send; only the sentence is gone.
 */

/**
 * Saving is not turned on for that machine, so nothing was sent (Phase 103).
 *
 * It names the two steps rather than the one, because Settings holds several
 * pages and a person who is told only to open Settings has to hunt. Main
 * decides this against the record on disk, so the sentence is what a person
 * reads after the refusal rather than a prediction made before it.
 */
export function remoteWritesNotConfirmed(label: string): string {
  return (
    `Tortie has not been given permission to write on ${label}. Open ` +
    `Settings, then Machines, and confirm that machine. Nothing was sent.`
  );
}

/**
 * The repository over there is outside the folder a person confirmed
 * (Phase 103).
 *
 * It does not name either folder. The tab already names the folder it is
 * about, and the confirmed folder is in Settings under the machine's own row.
 * Naming both here would put two absolute paths in one sentence in a column
 * that is 300 px wide.
 */
export function remoteStageOutsideRoot(label: string): string {
  return (
    `That folder on ${label} is outside the folder Tortie was given ` +
    `permission to write in. Nothing was sent.`
  );
}

/**
 * The machine did not confirm the write, and this never says nothing changed
 * (Phase 103).
 *
 * ONE FUNCTION FOR BOTH VERBS. The two sentences differ by one word, and two
 * near identical sentences in one file drift apart over a few rounds. The
 * verb word is a parameter for that reason.
 *
 * WHY IT DOES NOT SAY NOTHING HAPPENED. A connection killed in the middle of a
 * write was measured in Phase 101 finishing the far side write, with only the
 * answer lost. So the honest sentence is that Tortie cannot tell, and it names
 * the one thing a person can do, which is read that folder again.
 */
export function remoteIndexWriteUnsure(
  label: string,
  verb: 'stage' | 'unstage'
): string {
  const did = verb === 'stage' ? 'stage' : 'unstage';
  return (
    `Tortie asked ${label} to ${did} those files and it did not say it had. ` +
    `Press Refresh to read what really changed there.`
  );
}

/**
 * git over there refused part of the list, and Tortie stopped (Phase 103).
 *
 * IT NAMES NO COUNT ON PURPOSE. One command carries a whole chunk and git
 * reports one status for that chunk, so a count of the files that landed would
 * be invented rather than read. The list under the sentence is re-read from
 * that machine straight after the failure, so the rows are what really changed
 * there, and the sentence points at them.
 *
 * PHASE 103 FIX ROUND REWROTE IT. The first wording read "Tortie staged some of
 * those files and then stopped", and it was false twice over. Main did not stop,
 * it sent every remaining chunk, and when the only chunk failed nothing was
 * staged at all. Main now stops at the first chunk git refuses, and this
 * sentence claims nothing about how many files landed. The backlog's copy table
 * carries the old wording and this deviation is recorded in the commit body.
 */
export function remoteIndexWritePartial(
  label: string,
  verb: 'stage' | 'unstage'
): string {
  const did = verb === 'stage' ? 'stage' : 'unstage';
  return (
    `git on ${label} did not ${did} all of those files, and Tortie stopped ` +
    `there. The list below is what really changed there.`
  );
}

/**
 * A conflicted file on another machine carries neither verb (Phase 103).
 *
 * Locally, staging a conflicted file is a different verb with a different
 * label, reading `Mark resolved (stage)`, so a person never presses `Stage` on
 * one. Shipping a plain `Stage` here would mark a conflict resolved on a
 * computer nobody is watching, under a label that says something else. This
 * sentence is the row's tooltip and it names where the work belongs.
 */
export function remoteConflictNoVerb(label: string): string {
  return (
    `Tortie will not stage a conflicted file on another machine. Open a ` +
    `session on ${label} and finish the merge there.`
  );
}

/**
 * Nothing in that folder differs from its last commit and nothing is new.
 *
 * PHASE 97 WIDENED THIS SENTENCE. Until this phase the list held tracked files
 * only, so the old wording was true about the half it could see and silent
 * about the other half. The list now holds both halves, so the sentence says
 * both.
 */
export function remoteChangesNone(label: string): string {
  return (
    `Nothing has changed in that folder on ${label}, and it holds no ` +
    `untracked files.`
  );
}

/** The machine did not answer the Source Control read. */
export function remoteChangesUnreachable(label: string): string {
  return `${label} did not answer, so Tortie could not read what changed.`;
}

/** The folder is there and git does not track it. */
export function remoteChangesNotRepo(label: string): string {
  return `That folder on ${label} is not a git repository.`;
}

/*
 * PHASE 228 TOOK THE SECTIONS NOTE OFF. `REMOTE_SCM_SECTIONS_NOTE` was 49
 * words under the four groups saying what the view shows for a folder on
 * another machine, that it does not show the files one commit changed there,
 * and what it can change there. It was `REMOTE_SCM_SECTIONS_ABSENT` until
 * Phase 107 and a refusal of three sections until Phases 105 to 107 shipped
 * them one by one. The absence of a File history section is a section that
 * is not there, the way a folder that is not a repository has no Source
 * control sections locally, and the local view carries no sentence saying
 * what it shows. The operator's rule of 2026-09-07 is the reason.
 */

// -- Source Control, the commit box on a machine tab (Phase 104) -------------
//
// EVERY SENTENCE IN THIS BLOCK IS ABOUT WHAT A PERSON CAN DO BEFORE ANYTHING
// IS SENT, or about a read this renderer ran itself. The sentences about what
// happened over there are composed in src/main/machines/remote-copy.ts and
// travel in `MachineCommitResult.sentences`, because only main knows which of
// the ten answers it decided and it decides several of them without sending
// anything. The panel draws main's sentences as main sent them.

/**
 * The hooks and signing line, which is the Commit button's hover title.
 *
 * IT IS THE ONE VISIBLE ANSWER TO THE SIGNING HAZARD. Research 57 section 5.6
 * names it: the prompt guards stop a credential prompt, and neither of them
 * stops a signing program from asking for a passphrase on a computer nobody is
 * looking at. Tortie does not answer a signing passphrase, ever. No prompt is
 * forwarded here, no passphrase is read here and none is cached here. So the
 * honest thing is to say so before the press rather than after it.
 *
 * PHASE 228 MOVED IT OFF THE RESTING FACE. Phase 104 drew it as standing text
 * under the box, and the local commit box carries no such paragraph. It has
 * to survive somewhere, so it is the hover title of the button that runs the
 * commit, in every state the button can be in, composed by
 * `remoteCommitTitle` below.
 *
 * The commit's standard input is /dev/null, so a program that reads a terminal
 * fails at once. A signing program with a window of its own opens that window
 * on THAT machine's screen and waits there, and the deadline is what ends it.
 */
export function remoteCommitStanding(label: string): string {
  return (
    `Hooks and signing run on ${label}. If a key there needs a passphrase ` +
    `typed, Tortie cannot answer it and the commit will wait until it gives up.`
  );
}

/**
 * The Commit button's hover title, one sentence per state (Phase 228).
 *
 * THE FIX ROUND MADE IT ONE THING AT A TIME. As first moved, the title
 * carried the disabled reason AND the hooks and signing line together, 52
 * words in five sentences on a hover, with the same reason drawn again as a
 * caption under the button. The local box's title is its reason when it is
 * disabled and its verb when it is not, and this title is the same shape: a
 * disabled button says why it cannot be pressed, and a pressable button
 * carries the hooks and signing line, which is the one moment that hazard
 * matters, being the moment before the press. The line is still the one
 * visible answer to research 57 section 5.6, and it is on the button in
 * exactly the state a press can happen.
 */
export function remoteCommitTitle(
  label: string,
  disabledReason: string | null
): string {
  return disabledReason ?? remoteCommitStanding(label);
}

/** The words on the commit button, which name the machine rather than "here". */
export function remoteCommitButton(label: string): string {
  return `Commit on ${label}`;
}

/**
 * PHASE 229. The disclosure in front of git's own words after a failed commit.
 *
 * Tortie's sentence about what happened stays on the face. git's raw stderr,
 * which on his Mac Pro was thirteen lines beginning "Author identity unknown"
 * drawn on the resting face, goes behind this control, the way the clone
 * dialog on this Mac already keeps git's text behind Show details. The two
 * labels are that dialog's own words, so the remote face carries nothing the
 * local one does not.
 */
export function remoteCommitDetailsToggle(open: boolean): string {
  return open ? 'Hide details' : 'Show details';
}

/**
 * Nothing is staged over there yet, so there is nothing to commit.
 *
 * IT SAYS "yet" NOWHERE AND THE FUNCTION NAME DOES. The name carries the fact
 * that this is a state a person can leave by pressing Stage, and the sentence
 * itself stays short because it is a button tooltip in a column 300 px wide.
 */
export function remoteCommitNothingStagedYet(label: string): string {
  return `Nothing is staged on ${label}`;
}

/** A conflicted file over there, which this view will not resolve for anyone. */
export function remoteCommitConflicts(label: string): string {
  return `Resolve the conflicts on ${label} first`;
}

/** The link is down, so nothing can be asked of that machine at all. */
export function remoteCommitNotConnected(label: string): string {
  return `Tortie is not connected to ${label} right now`;
}

/**
 * PHASE 229. git on that machine has no name or no address to commit as.
 *
 * ONE SENTENCE NAMING THE TWO SETTINGS, and it is a caption in a column 300 px
 * wide, so it names them and stops. It is drawn BEFORE the press: every commit
 * on his Mac Pro failed after the press with git's own "Author identity
 * unknown" on the resting face, because nothing had asked (research 85
 * section 3.5). The branch read asks now, in the same script that reads the
 * branch, and this is what the button says while the answer is `missing`.
 * Tortie never writes `~/.gitconfig` on either machine; a person sets them.
 */
export function remoteCommitIdentityMissing(label: string): string {
  return `Set user.name and user.email in git on ${label} first`;
}

/**
 * The link failed before main answered at all, which is rarer than a lost
 * commit and is not the same thing.
 *
 * WHY THIS SENTENCE EXISTS AT ALL, and it is a departure from the spec's copy
 * table worth naming. Every outcome main decides carries main's own sentence,
 * including the two that mean the answer was lost. This one covers the case
 * where the call itself rejected, so main composed nothing and there is no
 * sentence to draw. It never says nothing was committed, because a rejection
 * on this Mac says nothing about what that machine did.
 */
export function remoteCommitCallFailed(label: string): string {
  return (
    `Tortie could not finish asking ${label} to commit, so it cannot say ` +
    `whether anything was committed. Press Check what happened.`
  );
}

/**
 * The three sentences the CHECK leaves, and the renderer composes them because
 * the renderer runs the check.
 *
 * The check is one read of that folder, being the same `review-list` the panel
 * already runs, and its whole question is whether that machine's HEAD is still
 * the sha the commit was sent with. A sha that moved means the commit ran. A
 * sha that did not move means it did not. No answer means Tortie still cannot
 * say, and the sentence says exactly that rather than guessing.
 *
 * BOTH SHAS ARE SHORTENED BY THE VIEW, to the first 7 characters, which is what
 * a person reads in the History group beside them.
 *
 * AN EMPTY STRING IS NOT A SHA AND IS NEVER DRAWN AS ONE. A repository with no
 * commit yet has no sha to name, and a person can stage in one with the Phase
 * 103 verbs and then commit, so this is a state these sentences reach rather
 * than a state nobody can get to. Both sentences say "has no commit yet" in
 * that case. The first build of this phase read `That folder on Mac Pro is
 * still at , so the commit did not run` on screen.
 */
export function remoteCommitCheckRan(
  label: string,
  now: string,
  was: string
): string {
  const after =
    now.length === 0
      ? `That folder on ${label} has no commit yet`
      : `That folder on ${label} is at ${now} now`;
  const before = was.length === 0 ? 'it had none' : `it was at ${was}`;
  return `${after} and ${before} when Tortie asked, so the commit ran.`;
}

/** The check found HEAD where Tortie left it, so nothing was committed. */
export function remoteCommitCheckDidNot(label: string, was: string): string {
  const where =
    was.length === 0
      ? `That folder on ${label} still has no commit yet`
      : `That folder on ${label} is still at ${was}`;
  return `${where}, so the commit did not run and nothing was committed.`;
}

/** The check itself did not land, so the question is still open. */
export function remoteCommitCheckNoAnswer(label: string): string {
  return `${label} did not answer, so Tortie cannot say whether the commit ran.`;
}

/** What the commit button knows before it is pressed. */
export interface RemoteCommitFacts {
  /** True while a commit for this folder is in flight. */
  committing: boolean;
  /** True when a person has given Tortie permission to write on that machine. */
  writesConfirmed: boolean;
  /** True when that machine is answering right now. */
  connected: boolean;
  /**
   * PHASE 229. Whether git there has a name and an address to commit as.
   *
   * `missing` is the branch read's answer that one or both are unset. A read
   * that has not landed, or did not ask, is composed as `known`, so a press is
   * never disabled by a question nobody answered.
   */
  identity: 'known' | 'missing';
  /** True when that folder holds a conflicted file. */
  conflicted: boolean;
  /** How many paths the panel drew in its Staged group. */
  staged: number;
  /** The text in the box, untrimmed. */
  message: string;
}

/**
 * The identity fact the commit box hands `remoteCommitDisabledReason`, from
 * the branch read's answer (Phase 229).
 *
 * `missing` is the one answer that disables a press. `known` is known, and
 * `unknown`, being a read that did not ask or has not landed, is composed as
 * `known` on purpose: a press is never disabled by a question nobody
 * answered. So is `undefined`, which is what a target with no store entry
 * reads. This is a function rather than a ternary in the box so the rule is
 * pinned by a test and not only by the app run.
 */
export function commitIdentityFact(
  identity: MachineGitIdentity | undefined
): RemoteCommitFacts['identity'] {
  return identity === 'missing' ? 'missing' : 'known';
}

/**
 * Why the commit button is disabled, or null when it is not.
 *
 * THE ORDER IS THE DESIGN AND IT IS NOT THE LOCAL BOX'S ORDER. The facts about
 * the machine come first, then the facts about the folder, then the one thing
 * a person can fix inside the box. A person whose machine has no permission to
 * be written on should not be told to type a message first, because typing one
 * would change nothing.
 *
 *  1. A commit is already running.
 *  2. Tortie has no permission to write on that machine.
 *  3. That machine is not answering.
 *  4. git on that machine has no name or no email address to commit as
 *     (Phase 229). It sits with the machine facts and ABOVE the staged and
 *     message checks, because staging and typing would change nothing until
 *     the person sets the two settings over there.
 *  5. That folder holds a conflicted file.
 *  6. Nothing is staged over there.
 *  7. The box is empty.
 *
 * THE PERMISSION READ HERE IS PRESENTATIONAL AND IT IS NEVER THE SAFEGUARD.
 * Main reads the confirmed folder off the record on disk at call time and
 * refuses there, with a sentence of its own. This decides whether a button is
 * pressable, and nothing more. The identity read is presentational the same
 * way: the commit script is unchanged and git's own refusal still stands
 * behind a press that lands.
 */
export function remoteCommitDisabledReason(
  facts: RemoteCommitFacts,
  label: string
): string | null {
  if (facts.committing) return 'Committing…';
  if (!facts.writesConfirmed) return remoteWritesNotConfirmed(label);
  if (!facts.connected) return remoteCommitNotConnected(label);
  if (facts.identity === 'missing') return remoteCommitIdentityMissing(label);
  if (facts.conflicted) return remoteCommitConflicts(label);
  if (facts.staged === 0) return remoteCommitNothingStagedYet(label);
  if (facts.message.trim().length === 0) return 'Enter a commit message';
  return null;
}
