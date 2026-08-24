/**
 * The runs for the branch checked out in a folder on another machine
 * (Phase 105).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

import { branchNoAnswer, branchNotConnected, branchReading } from './branch';
import { machineReadAt } from './presentation';

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
 * WHAT IS NOT TRUE, and four of the sentences below exist to say so. The list
 * is one read at one instant and nothing refreshes it, because main cannot see
 * a push made on another computer. The rows can be the newest few rather than
 * all of them. The branch over there can move after the read. The steps inside
 * a run are not read at all, so a row opens on GitHub instead of expanding.
 * Phase 99 carried a cut through main that the panel never drew, so a list that
 * had been cut was drawn as if it were whole. These four sentences are what
 * stops the same shape happening here.
 */

/** The band above the runs group. It says where each half of the answer came from. */
export function runsOnMachineBand(label: string): string {
  return (
    `Tortie asked ${label} which branch is checked out. It asked GitHub from ` +
    `this Mac, and it sent no sign in details to ${label}.`
  );
}

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

/**
 * Under the rows, whenever there is an answer.
 *
 * PHASE 106 MADE THIS A WRAPPER, over `machineReadAt` in ./presentation.ts, for
 * the reason
 * given on `runsReadingBranch` above. The sentence says nothing about runs, so
 * the neutral name is the primary and this one calls it.
 */
export function runsReadAt(label: string, at: number): string {
  return machineReadAt(label, at);
}

/** Under the rows, always, beside the sentence above. */
export const RUNS_NOT_LIVE =
  'This list does not refresh. Read it again to see anything that has run since.';

/** What is checked out over there, so a person can tell what the rows are for. */
export function runsBranchAt(
  branch: string,
  label: string,
  shortSha: string
): string {
  return `The branch checked out on ${label} is ${branch} at ${shortSha}.`;
}

/** The row limit was reached, so older runs exist and are not here. */
export function runsNewest(shown: number): string {
  return (
    `These are the newest ${shown.toLocaleString()} runs for that branch ` +
    `and its newest commit. There are older ones.`
  );
}

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

/** The repository has no github.com address. */
export function runsNotGitHub(label: string): string {
  return (
    `The repository in that folder on ${label} has no GitHub address for its ` +
    `origin, so there are no runs to show.`
  );
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

/** A row opens on GitHub and does not expand. Said once, under the rows. */
export const RUNS_STEPS_ELSEWHERE =
  'The steps inside a run are not shown for a folder on another machine. ' +
  'Open a run on GitHub to read them.';

/** An older preload has no way to ask a machine anything. */
export const RUNS_NO_BRIDGE =
  'This build cannot read the runs for a folder on another machine.';
