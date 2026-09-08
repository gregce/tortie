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
 * PHASE 107 DREW SEVEN SENTENCES UNDER THE GROUP SAYING WHAT IS NOT TRUE, and
 * PHASE 228 TOOK SIX OF THEM OFF, on the operator's rule of 2026-09-07 that a
 * remote tab feels almost identical to a local one. The band saying who was
 * asked, the line saying nothing refreshes, the line saying older commits
 * exist beside the Load more button that already says it, the line about a
 * page being read fresh, the line about what the ref marks are, the line
 * saying the group writes nothing, and the line saying the files one commit
 * changed are not read: every one of them was true, and every one of them
 * was a paragraph the local History does not carry. A verb the group does
 * not offer is drawn as absent, a row that does not expand is a row that does
 * not expand, and the clock under the group stays until Phase 230 removes it.
 *
 * TWO THINGS STAY, because they say a list ON SCREEN is incomplete, and a
 * cut list drawn as a whole one is the Phase 99 defect while a local list is
 * never cut. The far end, where Tortie has read every commit it will read
 * from another machine and older ones remain, is the Load more control drawn
 * disabled with a label of a few words as its hover title. And the marks cut
 * sentence stays as it was, drawn only when the mark read came back at its
 * own cap.
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

/**
 * PHASE 233. The machine did not answer when a row was expanded, or answered
 * something this end cannot read.
 *
 * It is a toast rather than a sentence on the face, which is where the local
 * History puts the same failure. The row keeps the waiting shape it has
 * locally, and expanding it again asks again.
 */
export function historyFilesNoAnswer(label: string): string {
  return `${label} did not answer, so Tortie could not read what that commit changed.`;
}

/** An older preload has no way to ask a machine anything. */
export const HISTORY_NO_BRIDGE =
  'This build cannot read the history for a folder on another machine.';

/** The one control under the rows. The number is the page and it is fixed. */
export const HISTORY_LOAD_MORE = 'Load 50 more';

/**
 * THE FAR END, as the hover title of the Load more control drawn disabled.
 * Every commit Tortie will read from another machine has been read and older
 * ones are still there. PHASE 228 MADE IT A LABEL: it was a three sentence
 * paragraph under the group, and a limit that is genuinely different is a
 * disabled control with at most one short label. The number comes from the
 * answer rather than from this file, so the label cannot drift away from the
 * rule main applies.
 */
export function historyCeiling(ceiling: number): string {
  return `Tortie reads at most ${ceiling.toLocaleString()} commits from another machine`;
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

