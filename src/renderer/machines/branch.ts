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
 * PHASE 106 DREW FOUR SENTENCES UNDER THE GROUP SAYING WHAT IS NOT TRUE, and
 * a band above it, and three fact sentences inside it. PHASE 228 TOOK THEM
 * ALL OFF, on the operator's rule of 2026-09-07 that a remote tab feels
 * almost identical to a local one. The local branch header draws the branch
 * as a name with its arrows, so the group draws the branch as ONE ROW, being
 * its name, its short commit and, when it follows a branch, the local
 * header's own arrows, with the follows sentence as the row's hover title.
 * A branch that follows nothing draws no counts and says nothing, the way
 * the local header draws no arrows for one. The two READ FAILURES stay as
 * one line each under the row, because zero and zero is what a level branch
 * answers and also what an unread answer leaves behind, and the two cannot
 * be told apart from the picture. The clock under the group stays until
 * Phase 230 removes it.
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

/**
 * The branch it follows and how far apart the two are, which since Phase 228
 * is the hover title of the row that draws the name, the commit and the
 * arrows, rather than a sentence on the face.
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

/*
 * PHASE 228 DELETED FOUR SENTENCES HERE: the line saying nothing refreshes,
 * the line saying the counts were measured against the copy of the followed
 * branch that machine holds, the line saying the group changes nothing, and
 * the line saying only the checked out branch is read. Tortie still never
 * fetches on that machine, and `build/conformance-machines.mjs` still fails
 * the build if the script ever names a verb that would; the counts on the row
 * are that machine's own, the way the local header's arrows are this Mac's
 * own, and neither face says so in a paragraph.
 */

/** An older preload has no way to ask a machine anything. */
export const BRANCH_NO_BRIDGE =
  'This build cannot read the branch for a folder on another machine.';
