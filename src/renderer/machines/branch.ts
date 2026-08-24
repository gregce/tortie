/**
 * The branch checked out in a folder on another machine (Phase 106).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

import { commitCount } from './presentation';

/**
 * WHAT THIS BLOCK IS FOR. A tab whose folder is on another machine draws the
 * changed files and the workflow runs, and until this phase it never said which
 * branch is checked out over there. A person had to read the branch out of the
 * Runs group's own sentence, or open a session and type. This block holds every
 * sentence the Branch group draws.
 *
 * FOUR OF THESE ARE THE PRIMARY AND PHASE 105 NOW CALLS THEM. `branchReading`,
 * `branchNotConnected`, `branchNoAnswer` and `machineReadAt` say nothing about
 * runs, and the Runs group in ./runs.ts says exactly the same four things.
 * Writing a
 * second copy of one sentence is how the two go out of step, so the neutral
 * name is the primary here and `runsReadingBranch`, `runsNotConnected`,
 * `runsNoAnswer` and `runsReadAt` are wrappers over them. `machineReadAt` moved
 * to ./presentation.ts in Phase 142 for the same reason, being that every group
 * composes with it. One string, two names, no drift.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word, a branch name, two
 * commit strings, an upstream name, two counts and two flags. Every sentence a
 * person reads about them is here, which is the shape `machines:readRuns` and
 * `machines:readSessionLines` already use.
 *
 * FOUR SENTENCES SAY WHAT IS NOT TRUE, and each of them exists because a
 * person cannot see the mechanism. The answer is one read at one instant and
 * nothing refreshes it, because main cannot see a branch switched on another
 * computer. The two counts are measured against the copy of the followed
 * branch that machine last fetched, and Tortie never fetches over there, so
 * the answer can be stale at the moment it is read. Tortie changes nothing
 * over there. Only the checked out branch is read, and the other branches on
 * that machine are not listed.
 */

/** While the read of that machine's branch is in flight. */
export function branchReading(label: string): string {
  return `Tortie is reading the branch on ${label}.`;
}

/** Tortie is not signed in to that machine in this run. */
export function branchNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it could not read the branch.`;
}

/** The machine did not answer. */
export function branchNoAnswer(label: string): string {
  return `${label} did not answer, so Tortie could not read the branch.`;
}

/**
 * The band above the group. It says who was asked and what was changed.
 *
 * Both halves are past tense, so it is drawn only over an answer that machine
 * actually gave. The second half is the refusal a person needs before they
 * trust a group that names a branch on a computer they are not sitting at.
 */
export function branchOnMachineBand(label: string): string {
  return (
    `Tortie asked ${label} which branch is checked out in this folder. It ` +
    `read that machine's own answer and it changed nothing there.`
  );
}

/** The folder is there and git does not track it. */
export function branchNotRepo(label: string): string {
  return `That folder on ${label} is not a git repository, so it has no branch.`;
}

/** There is a repository and no branch name. Both causes are named. */
export function branchNone(label: string): string {
  return (
    `Tortie read no branch name for that folder on ${label}. That happens ` +
    `when a commit is checked out directly, and when the repository has no ` +
    `commits yet.`
  );
}

/**
 * The branch name was read and nothing else about it was.
 *
 * This is the answer an older git gives. The details Tortie asks for need a
 * git from 2.13 or newer, and an older one refuses the whole question rather
 * than answering part of it. Without this sentence that refusal would have
 * read as no branch at all, which names the wrong cause.
 */
export function branchNoDetails(label: string): string {
  return (
    `Tortie read the branch name on ${label} and could not read anything ` +
    `else about it. The git on that machine may be older than the answer ` +
    `Tortie asks for.`
  );
}

/** There is no folder at that path on that machine. */
export function branchFolderMissing(label: string): string {
  return `There is no folder at this path on ${label}, so there is no branch to show.`;
}

/** The folder is there and that account cannot read it. */
export function branchFolderDenied(label: string): string {
  return `Tortie cannot read that folder on ${label}, so it cannot read the branch.`;
}

/** The one fact this group exists for. */
export function branchNameOn(branch: string, label: string): string {
  return `The branch checked out on ${label} is ${branch}.`;
}

/** The commit that branch points at, shortened the way git shortens one. */
export function branchTip(shortSha: string): string {
  return `Its newest commit is ${shortSha}.`;
}

/**
 * The branch it follows and how far apart the two are.
 *
 * The counts are written out for every value, including zero, because a number
 * says more than the word level does.
 */
export function branchFollows(
  branch: string,
  upstream: string,
  ahead: number,
  behind: number
): string {
  return (
    `${branch} follows ${upstream}. It is ${commitCount(ahead)} ahead and ` +
    `${commitCount(behind)} behind.`
  );
}

/** The branch follows nothing, so there is no pair of counts to draw. */
export function branchNoUpstream(branch: string, label: string): string {
  return (
    `${branch} follows no other branch on ${label}, so there is nothing to ` +
    `count it against.`
  );
}

/** The branch follows one that machine no longer has. */
export function branchUpstreamGone(
  branch: string,
  upstream: string,
  label: string
): string {
  return (
    `${branch} is set to follow ${upstream}, and ${label} no longer has that ` +
    `branch. Tortie cannot count how far ahead or behind it is.`
  );
}

/**
 * An answer about the counts arrived and this end could not read it.
 *
 * THIS SENTENCE IS THE HONESTY FIELD ON SCREEN. Zero and zero is what a level
 * branch answers and it is also what an unread answer leaves behind, so the
 * two numbers alone cannot tell them apart. Phase 99 carried a flag through
 * main that the panel never drew and a list that had been cut was drawn as if
 * it were whole. This one is drawn.
 */
export function branchTrackUnreadable(branch: string, label: string): string {
  return (
    `Tortie could not read how far ahead or behind ${branch} is. ${label} ` +
    `answered in a form this version of Tortie does not read.`
  );
}

/** Under the group, always. Nothing polls that machine. */
export const BRANCH_NOT_LIVE =
  'This does not refresh. Read it again to see whether the branch over there ' +
  'has moved.';

/**
 * Under the group, wherever there is an upstream to count against.
 *
 * THIS IS THE SENTENCE THIS PHASE EXISTS TO GET RIGHT. The two counts are
 * measured against a copy of the followed branch that lives on that machine,
 * and that copy is only as fresh as the last fetch somebody ran over there.
 * Tortie never fetches on that machine, and `build/conformance-machines.mjs`
 * fails the build if the script ever names a verb that would. So the answer
 * can be stale at the moment it is read, which is a different kind of stale
 * from the group going out of date afterwards, and it gets its own sentence.
 */
export function branchCountsAreThatMachines(
  label: string,
  upstream: string
): string {
  return (
    `Tortie counted against the copy of ${upstream} that ${label} holds. ` +
    `Tortie does not fetch on ${label}, so that copy can be older than what ` +
    `is on the server, and the two counts can be wrong by that much.`
  );
}

/** Under the group, always. This group has no verb that writes. */
export function branchNoSwitch(label: string): string {
  return (
    `Tortie does not change what is checked out on ${label}. This group only ` +
    `reads.`
  );
}

/** Under the group, always. The header says Branch and it means one branch. */
export function branchOnlyCurrent(label: string): string {
  return (
    `Tortie reads only the branch that is checked out on ${label}. It does ` +
    `not list the other branches there.`
  );
}

/** An older preload has no way to ask a machine anything. */
export const BRANCH_NO_BRIDGE =
  'This build cannot read the branch for a folder on another machine.';
