/**
 * What the Search view says about a project on another machine (Phase 98), and
 * what the symbol palette says there.
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

/**
 * WHAT THIS BLOCK REPLACES. Phase 90.1 gave the Search view two sentences that
 * said it does not reach another machine. Phase 98 makes it reach one, so those
 * two are gone and these take their place. The pair that was deleted is
 * described in ./context.ts.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a status word and a set of counts
 * for one search, and this file holds every sentence a person reads about it.
 * That is the shape `machines:listDir` and `machines:reviewFiles` already use,
 * and it keeps every sentence about a machine inside the one file the
 * vocabulary audit reads.
 *
 * WHAT THEY MAY CLAIM. A search on this Mac and a search on another machine are
 * not the same search, and what a person reads about it is what happened,
 * being which folder was read, which cap cut the list and which of the four
 * words meant no rows. PHASE 228 TOOK THE TWO EXPLANATIONS OFF THE FACE. The
 * idle body said which three filters do not go there and how the folder is
 * searched instead, and a line under every result said the far side used that
 * machine's own grep and a pattern can behave differently there. The local
 * Search view carries no such paragraph, and the operator's rule of
 * 2026-09-07 is that a remote tab feels almost identical to a local one. The
 * three filters are drawn OFF with one short title each, below, and the grep
 * line is gone: a pattern that machine refuses is still answered by
 * `searchPatternRefused`, which is the one place that difference is read.
 */

/**
 * The folder searched is not a git repository.
 *
 * Both halves are needed. Nothing was skipped, which is the good news, and the
 * results can hold build output, which is the cost of it.
 */
export const SEARCH_NOT_A_REPOSITORY =
  'This folder is not a git repository, so Tortie searched every file in it. ' +
  'Nothing was skipped, and the results can include build output.';

/** There is no folder at that path on that machine. */
export function searchFolderMissing(label: string): string {
  return `There is no folder at this path on ${label}, so nothing was searched.`;
}

/** That machine's grep refused the pattern. */
export function searchPatternRefused(label: string): string {
  return (
    `The grep on ${label} did not accept this pattern. A search on another ` +
    `machine uses that machine's own program, and it does not read every ` +
    `pattern the search on this Mac reads.`
  );
}

/** Tortie is not signed in to that machine. */
export function searchNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it searched nothing.`;
}

/** The machine did not answer. */
export function searchNoAnswer(label: string): string {
  return `${label} did not answer, so there are no results to show.`;
}

/** The match cap cut the list. */
export function searchFirstMatches(shown: number): string {
  return `Tortie is showing the first ${shown.toLocaleString()} matching lines. There are more.`;
}

/** The size ceiling on one answer cut the list. */
export const SEARCH_ANSWER_TOO_LARGE =
  'That machine had more to send than Tortie reads in one answer, so this ' +
  'list stops early. Narrow the search to see the rest.';

/**
 * The three filters that do not reach a machine, as three hover titles.
 *
 * PHASE 228. Include, exclude and the ignore files toggle work on this Mac and
 * do not go to a machine, because a search over there has no glob machinery
 * and its file list comes from git. Until this phase that was a 34 word
 * paragraph drawn as the idle body of the view, `SEARCH_FILTERS_ON_THIS_MAC`,
 * read before a person typed anything. A limit that is genuinely different is
 * a disabled control with at most one short label, so each control is drawn
 * OFF by src/renderer/search/QueryBlock.tsx with its own title, and the
 * paragraph is gone. They are labels rather than sentences, the way
 * `SEARCH_STOP_WAITING` is, so they carry no full stop.
 */
export const SEARCH_INCLUDE_ON_THIS_MAC = 'Include filters work on this Mac only';

/** The exclude field's title while its folder is on a machine. */
export const SEARCH_EXCLUDE_ON_THIS_MAC = 'Exclude filters work on this Mac only';

/** The ignore files toggle's title while its folder is on a machine. */
export const SEARCH_IGNORE_ON_THIS_MAC =
  'The ignore files toggle works on this Mac only';

/**
 * The Stop control while a machine is being waited on.
 *
 * It says what the control does. Nothing here can stop the scan on that
 * machine, and a label reading "Stop this search" would claim that it can.
 */
export const SEARCH_STOP_WAITING = 'Stop waiting for this search';

/** An older preload has no way to ask a machine anything. */
export const SEARCH_NO_BRIDGE =
  'This build cannot search a folder on another machine.';

// -- the symbol palette ------------------------------------------------------
//
// One pair, and it is a refusal. It says what does not reach that machine, then
// what Tortie does read. PHASE 99 TOOK THE QUICK OPEN PAIR OUT OF THIS BLOCK,
// because Quick Open reaches a folder on a machine now and the refusal had
// become false. The symbol palette still reads this Mac only, so this pair is
// still true and it stays.

/** The symbol palette, in place of its rows. */
export function symbolsElsewhereTitle(label: string): string {
  return `Symbols do not reach ${label}.`;
}

/** The symbol palette's second line. */
export const SYMBOLS_ELSEWHERE_BODY =
  'Tortie reads symbols from files on this Mac only.';
