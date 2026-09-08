/**
 * The runs for the branch checked out in a folder on another machine
 * (Phase 105).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

import { branchNoAnswer, branchNotConnected, branchReading } from './branch';

/**
 * WHAT THIS BLOCK REPLACES. Phase 90.3 wrote one sentence saying that Tortie
 * does not show runs for a folder on another machine. Phase 105 shows them, so
 * that half of the sentence became false. `REMOTE_SCM_SECTIONS_NOTE` in
 * ./scm.ts is
 * rewritten in this phase. PHASE 107 RENAMED IT and rewrote it again, and it
 * now refuses one read rather than three sections.
 *
 * WHERE EACH HALF OF THE ANSWER COMES FROM, because a person cannot see it and
 * it is the whole design. Tortie asks the machine two things, being which
 * branch is checked out and which repository the folder is. It then asks GitHub
 * from this Mac with the gh this Mac already has. No token, no sign in details
 * and no GitHub host name is sent to the machine. The band below is where a
 * person reads that, and it is the reason the band exists at all.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word, a branch, a commit
 * and a set of rows, and this file holds every sentence a person reads about
 * them. That is the shape `machines:listFiles` and `machines:readSessionLines`
 * already use, and it keeps every sentence about a machine inside the one file
 * the vocabulary audit reads.
 *
 * PHASE 105 DREW A BAND AND FOUR SENTENCES UNDER THE ROWS SAYING WHAT IS NOT
 * TRUE, and PHASE 228 TOOK THEM OFF, on the operator's rule of 2026-09-07
 * that a remote tab feels almost identical to a local one. The band saying
 * where each half of the answer came from, the line saying the list does not
 * refresh, the line saying the rows are the newest few, the line naming the
 * branch and its commit, and the line saying a run opens on GitHub rather
 * than expanding: every one was true and every one was a paragraph the local
 * Runs section does not carry. The local list is cut the same way and says
 * nothing, the Branch group beside this one names the branch, a row that
 * opens on GitHub says so in its own label, and the clock under the rows
 * stays until Phase 230 removes it. What still crosses the link is unchanged:
 * Tortie asks the machine which branch is checked out and which repository
 * the folder is, asks GitHub from this Mac, and sends no sign in details to
 * the machine.
 *
 * A REPOSITORY WITH NO GITHUB ORIGIN DRAWS NO RUNS GROUP AT ALL, which is
 * what the local section does for the same repository: the sentence that
 * stood in place of rows there is gone with the group.
 */

/**
 * While the read of that machine's branch is in flight.
 *
 * PHASE 106 MADE THIS A WRAPPER. The Branch group says the same thing while its
 * own read is in flight, and a second copy of one sentence is how the two go
 * out of step. `branchReading` in ./branch.ts is the one string and this name
 * is kept so
 * nothing that already reads it has to move.
 */
export function runsReadingBranch(label: string): string {
  return branchReading(label);
}

// PHASE 230 TOOK `runsReadAt` OFF, the wrapper over the read-at clock in
// ./presentation.ts. The record is on that file's header.

/** There is a repository and no branch name. Both causes are named. */
export function runsNoBranch(label: string): string {
  return (
    `Tortie read no branch name for that folder on ${label}. That happens ` +
    `when a commit is checked out directly, and when the repository has no ` +
    `commits yet. Either way there is no branch to ask GitHub about.`
  );
}

/** The folder is there and git does not track it. */
export function runsNotRepo(label: string): string {
  return `That folder on ${label} is not a git repository, so it has no runs.`;
}

/** There is no folder at that path on that machine. */
export function runsFolderMissing(label: string): string {
  return `There is no folder at this path on ${label}, so there are no runs to show.`;
}

/** The folder is there and that account cannot read it. */
export function runsFolderDenied(label: string): string {
  return `Tortie cannot read that folder on ${label}, so it has no runs to show.`;
}

/**
 * Tortie is not signed in to that machine in this run.
 *
 * PHASE 106 MADE THIS A WRAPPER over `branchNotConnected` in ./branch.ts. Both
 * groups
 * fail on the same read of the same branch, so both say the same sentence.
 */
export function runsNotConnected(label: string): string {
  return branchNotConnected(label);
}

/**
 * The machine did not answer.
 *
 * PHASE 106 MADE THIS A WRAPPER over `branchNoAnswer` in ./branch.ts, for the
 * reason
 * given on `runsNotConnected` above.
 */
export function runsNoAnswer(label: string): string {
  return branchNoAnswer(label);
}

/** An older preload has no way to ask a machine anything. */
export const RUNS_NO_BRIDGE =
  'This build cannot read the runs for a folder on another machine.';
