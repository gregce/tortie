/**
 * The commit history of a folder on another machine (Phase 107).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

import { commitCount } from './presentation';

/**
 * WHAT THIS BLOCK IS FOR. A tab whose folder is on another machine draws the
 * changed files, the branch and the workflow runs. Until this phase it drew no
 * history at all, and the sentence above said so. Tortie now reads the newest
 * commits over there and draws them with the same picture the local History
 * draws. This block holds every sentence that group says.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word, a set of commit rows,
 * three commit strings, two counts and three flags. Every sentence a person
 * reads about them is here, which is the shape `machines:readBranch` and
 * `machines:readRuns` already use.
 *
 * SIX SENTENCES SAY WHAT IS NOT TRUE, and each of them exists because a person
 * cannot see the mechanism.
 *
 * 1. The answer is one read at one instant and nothing refreshes it, because
 *    main cannot see a commit made on another computer.
 * 2. The page holds the newest commits and older ones exist behind it.
 * 3. Tortie reads at most a fixed number of commits from another machine, and
 *    a person who needs more opens a session over there.
 * 4. The unpushed and unpulled marks are read for the page and no further, so
 *    an older row can be drawn without a mark whether it has one or not.
 * 5. Every page is read fresh, so the lines on the left can be drawn
 *    differently after Load more.
 * 6. The files one commit changed are not read at all.
 *
 * A SEVENTH SENTENCE IS ABOUT THE MARKS ON A ROW, and Phase 107 added it after
 * reading what the pill's own tooltip says. `remoteRefTitle` in
 * ../scm/freshness.ts ends every branch mark with when this clone last fetched,
 * and Tortie does not read that on another machine. So the group says once, in
 * words, that the marks are that machine's own copies and that Tortie did not
 * read when it last fetched.
 */

/** While the read of that machine's commits is in flight. */
export function historyReading(label: string): string {
  return `Tortie is reading the history on ${label}.`;
}

/**
 * The walk came back with no commits, and both causes are named.
 *
 * One word covers two states over there, being a repository nobody has
 * committed in and a repository with no branch, tag or remote branch to walk
 * from. A person cannot tell those apart from the outside, so the sentence
 * names both rather than picking one.
 */
export function historyNoCommits(label: string): string {
  return (
    `Tortie found no commits in that folder on ${label}. That happens when ` +
    `the repository has no commits yet, and when it has no branches, tags or ` +
    `remote branches to read from.`
  );
}

/** The folder is there and git does not track it. */
export function historyNotRepo(label: string): string {
  return `That folder on ${label} is not a git repository, so it has no history.`;
}

/** There is no folder at that path on that machine. */
export function historyFolderMissing(label: string): string {
  return `There is no folder at this path on ${label}, so there is no history to show.`;
}

/** The folder is there and that account cannot read it. */
export function historyFolderDenied(label: string): string {
  return `Tortie cannot read that folder on ${label}, so it cannot read the history.`;
}

/** Tortie is not signed in to that machine in this run. Nothing was asked. */
export function historyNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it could not read the history.`;
}

/** The machine did not answer, or answered something this end cannot read. */
export function historyNoAnswer(label: string): string {
  return `${label} did not answer, so Tortie could not read the history.`;
}

/** An older preload has no way to ask a machine anything. */
export const HISTORY_NO_BRIDGE =
  'This build cannot read the history for a folder on another machine.';

/**
 * The band above the group. It says who was asked and what was changed.
 *
 * Both halves are past tense, so it is drawn only over an answer that carried
 * commits. The second half is the refusal a person needs before they trust a
 * picture of somebody else's repository.
 */
export function historyOnMachineBand(label: string): string {
  return (
    `Tortie asked ${label} for the commits in this folder. It read that ` +
    `machine's own answer and it changed nothing there.`
  );
}

/** The one control under the rows. The number is the page and it is fixed. */
export const HISTORY_LOAD_MORE = 'Load 50 more';

/** Under the group, always, over an answer. Nothing polls that machine. */
export function historyNotLive(label: string): string {
  return (
    `This does not refresh. Read it again to see anything committed on ` +
    `${label} since.`
  );
}

/**
 * THE FIRST CUT, ON SCREEN. The walk found more commits than the page holds.
 *
 * Drawn whenever there are older commits and the ceiling has not been reached,
 * which is also exactly when the Load more button is drawn. The count is never
 * one, because the page is fifty and it grows by fifty.
 */
export function historyOlderExist(shown: number): string {
  return (
    `These are the newest ${shown.toLocaleString()} commits in that folder. ` +
    `There are older ones.`
  );
}

/**
 * THE FAR END, ON SCREEN. Every commit Tortie will read from another machine
 * has been read and older ones are still there.
 *
 * The number comes from the answer rather than from this file, so the sentence
 * cannot drift away from the rule main applies. It names the one thing a person
 * can do instead, which is to open a session on that machine.
 */
export function historyCeiling(ceiling: number, label: string): string {
  return (
    `Tortie reads at most ${ceiling.toLocaleString()} commits from another ` +
    `machine and it has read them all. There are older commits in that folder ` +
    `and Tortie does not read them here. Open a session on ${label} to read ` +
    `further.`
  );
}

/**
 * THE SECOND CUT, ON SCREEN. The unpushed and unpulled marks were read for the
 * page and no further.
 *
 * A row with no mark then means one of two things, being a commit both sides
 * hold and a commit the mark read never reached. The two cannot be told apart
 * from the picture, so the sentence says so. Phase 99 carried a cut through
 * main that the panel never drew and a list that had been cut was drawn as if
 * it were whole. This one is drawn.
 */
export function historyMarksCut(marked: number, label: string): string {
  return (
    `Tortie marked ${commitCount(marked)} as ahead of the followed branch or ` +
    `behind it. It asked ${label} for that many and no more, so an older ` +
    `commit is drawn without a mark whether it has one or not.`
  );
}

/**
 * THE THIRD THING THAT IS NOT TRUE, ON SCREEN. A page is read fresh.
 *
 * The far side resolves its own branches, tags and remote branches on every
 * read. The layout the picture is drawn from asks its caller to hold the ref
 * set still between pages, and this door cannot. The whole list is replaced
 * rather than added to, so no row tears, and the lines on the left can still
 * move after Load more.
 */
export function historyPagesAreFresh(label: string): string {
  return (
    `Tortie reads the branches on ${label} again for every page. If a branch ` +
    `there changed in between, the lines on the left can be drawn differently ` +
    `after Load more.`
  );
}

/**
 * What the marks on a row are, and the one thing Tortie did not read.
 *
 * A mark naming a branch on a server is that machine's own copy of it, and it
 * is only as fresh as the last fetch somebody ran over there. Tortie does not
 * fetch on that machine and it does not read when that machine last did, so
 * this sentence says both rather than leaving the pill's own tooltip to be the
 * only place a person meets the question.
 */
export function historyRefsAreThatMachines(label: string): string {
  return (
    `The marks on a row name branches and tags as ${label} holds them. ` +
    `Tortie did not read when that machine last fetched from a server.`
  );
}

/** Under the group, always, over an answer. This group has no verb that writes. */
export function historyNoWrite(label: string): string {
  return (
    `Tortie does not change anything in that folder on ${label}. This group ` +
    `only reads, so it offers no checkout, no branch and no cherry pick.`
  );
}

/**
 * THE GAP THIS PHASE LEAVES OPEN, ON SCREEN.
 *
 * The local History expands a row into the files that commit changed. Reading
 * those on another machine is a second read for the list and a third for the
 * two sides of a file, and this round shipped one read. So a row does not
 * expand, clicking one opens nothing, and the sentence says where to go
 * instead rather than leaving a person clicking a row that never answers.
 */
export function historyFilesElsewhere(label: string): string {
  return (
    `The files one commit changed are not read for a folder on another ` +
    `machine. Open a session on ${label} to read them.`
  );
}
