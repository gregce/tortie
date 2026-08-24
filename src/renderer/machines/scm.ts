/**
 * What Source Control says about a folder on another machine, and what the
 * commit box says there (Phase 104).
 *
 * The doctrine that binds these sentences is in ./presentation.ts, and the tab
 * they are drawn in is described in ./project-tab.ts.
 */

// -- Source Control ----------------------------------------------------------

/**
 * The band under the Source Control header, on a tab whose folder is there.
 *
 * PHASE 103 REWROTE IT AND PHASE 104 REWROTE IT AGAIN. Each rewrite is a
 * phase. The Phase 90.3 sentence said Tortie could show these changes and
 * could not change them, and Phase 103 made the second half false by adding
 * stage and unstage. The Phase 103 sentence named those two verbs, and Phase
 * 104 made it incomplete by adding a third, which is the commit. This sentence
 * names all three verbs and then names the one thing Tortie still cannot do
 * there, which is undoing a change. That refusal is permanent and
 * `build/conformance-machines.mjs` condition 83 checks it against every command
 * Tortie can send.
 */
export function remoteChangesBand(label: string): string {
  return (
    `These changes are on ${label}. Tortie can stage them, unstage them and ` +
    `commit them there. It cannot undo a change on that machine.`
  );
}

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

/**
 * What the Source Control view shows for a folder on another machine, and the
 * one thing it does not.
 *
 * PHASE 107 RENAMED THIS CONSTANT. It was `REMOTE_SCM_SECTIONS_ABSENT` and it
 * was a refusal. It named three sections that are not drawn, and each round
 * that shipped one of them made another clause false. Phase 105 shipped the
 * runs, Phase 106 shipped the branch and Phase 107 shipped the history, so
 * there is no section left to refuse and the name is now `_NOTE`.
 *
 * WHAT IT STILL REFUSES IS SMALLER AND IT IS NAMED. Tortie reads the commits
 * in that folder and it does not read the files one commit changed there. That
 * needs two more reads and this round shipped one. The second half says the
 * thing a person needs before they trust four groups about a computer they are
 * not sitting at, which is that nothing in the folder was changed.
 *
 * THE WORD BRANCH IS SINGULAR ON PURPOSE. Tortie shows the one branch that is
 * checked out over there. It does not list the other branches on that machine,
 * and `branchOnlyCurrent` in ./branch.ts says so inside the group itself.
 *
 * PHASE 103 REPLACED THE LAST CLAUSE AND PHASE 104 REPLACED IT AGAIN. It read
 * "and nothing in this view changes that folder", which Phase 103 made false by
 * adding stage and unstage. Phase 103 wrote that the only thing this view
 * changes is which files are staged, and Phase 104 made that false by adding
 * the commit. The clause now names both things this view can change on that
 * machine, being which files are staged and whether they are committed, and it
 * says that it changes nothing else. It is not a refusal any more and it is not
 * silent either.
 */
export const REMOTE_SCM_SECTIONS_NOTE =
  'Tortie shows the changed files, the history, the branch and the runs for ' +
  'a folder on another machine. It does not show the files one commit ' +
  'changed there. What this view can change on that machine is which files ' +
  'are staged and whether they are committed, and nothing else.';

// -- Source Control, the commit box on a machine tab (Phase 104) -------------
//
// EVERY SENTENCE IN THIS BLOCK IS ABOUT WHAT A PERSON CAN DO BEFORE ANYTHING
// IS SENT, or about a read this renderer ran itself. The sentences about what
// happened over there are composed in src/main/machines/remote-copy.ts and
// travel in `MachineCommitResult.sentences`, because only main knows which of
// the ten answers it decided and it decides several of them without sending
// anything. The panel draws main's sentences as main sent them.

/**
 * The standing line under the commit box, drawn BEFORE a person commits.
 *
 * IT IS THE ONE VISIBLE ANSWER TO THE SIGNING HAZARD. Research 57 section 5.6
 * names it: the prompt guards stop a credential prompt, and neither of them
 * stops a signing program from asking for a passphrase on a computer nobody is
 * looking at. Tortie does not answer a signing passphrase, ever. No prompt is
 * forwarded here, no passphrase is read here and none is cached here. So the
 * honest thing is to say so before the press rather than after it, which is why
 * this line is standing text and not a sentence about an outcome.
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

/** The words on the commit button, which name the machine rather than "here". */
export function remoteCommitButton(label: string): string {
  return `Commit on ${label}`;
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
  /** True when that folder holds a conflicted file. */
  conflicted: boolean;
  /** How many paths the panel drew in its Staged group. */
  staged: number;
  /** The text in the box, untrimmed. */
  message: string;
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
 *  4. That folder holds a conflicted file.
 *  5. Nothing is staged over there.
 *  6. The box is empty.
 *
 * THE PERMISSION READ HERE IS PRESENTATIONAL AND IT IS NEVER THE SAFEGUARD.
 * Main reads the confirmed folder off the record on disk at call time and
 * refuses there, with a sentence of its own. This decides whether a button is
 * pressable, and nothing more.
 */
export function remoteCommitDisabledReason(
  facts: RemoteCommitFacts,
  label: string
): string | null {
  if (facts.committing) return 'Committing…';
  if (!facts.writesConfirmed) return remoteWritesNotConfirmed(label);
  if (!facts.connected) return remoteCommitNotConnected(label);
  if (facts.conflicted) return remoteCommitConflicts(label);
  if (facts.staged === 0) return remoteCommitNothingStagedYet(label);
  if (facts.message.trim().length === 0) return 'Enter a commit message';
  return null;
}
