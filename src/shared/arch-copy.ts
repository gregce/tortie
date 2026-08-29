/**
 * The words the architecture surfaces say, in ONE file both processes read
 * (Phase 64).
 *
 * ## Why this file exists rather than a second copy of three functions
 *
 * Phase 63 put the vocabulary in `src/renderer/arch/copy.ts`, which was right
 * while only the sidebar said any of it. Phase 64 composes a text block in the
 * MAIN process and hands it to a running agent, and that block has to say
 * "broke" and "cannot be checked" and it has to carry the same freshness
 * sentence the ribbon draws. Two copies of a sentence a person reads in two
 * places is how the two drift, and the drift is invisible because nothing
 * compares them.
 *
 * The precedent is `src/shared/agent-defaults.ts`, whose own header makes the
 * argument for exactly this move. So the four functions below live here,
 * `src/renderer/arch/copy.ts` re-exports them under the names it already used,
 * and `src/main/arch/payload.ts` imports them directly.
 *
 * ## What is NOT here
 *
 * The sentences that only the sidebar says stay in `src/renderer/arch/copy.ts`,
 * because moving them would make this file a dumping ground rather than a
 * seam. Only what BOTH processes say lives here.
 *
 * The per component freshness sentence in
 * `src/main/arch/checkers/freshness.ts` is a DIFFERENT sentence with a
 * similar name. It says one part's two numbers and it is the reason line of a
 * freshness verdict. {@link archFreshnessRibbon} says one sentence about a SET
 * of parts and names the worst one. Both are pinned word for word by
 * `npm run conformance:arch`, and neither is a substitute for the other.
 *
 * ## The vocabulary, fixed here so nothing invents a second word for it
 *
 *  - A promise HOLDS, BROKE, IS MISSING, or CANNOT BE CHECKED. Those four
 *    words are `convergent`, `divergent`, `absent` and `unverifiable`, and no
 *    surface and no payload says the machine word.
 *  - Coverage is CHECKED, PARTLY CHECKED or NOT CHECKABLE.
 *  - Nothing here says "stale", "drift" or "out of date" as a verdict. Age is
 *    a number of commits and it is stated as one.
 */

import type { ArchFreshness } from './arch';

// ---------------------------------------------------------------------------
// The two grade rule (Phase 64, research 49 section 4.9)
// ---------------------------------------------------------------------------

/**
 * How many commits may land under a part before the payload stops quoting the
 * prose a person wrote about it.
 *
 * THE NUMBER IS MEASURED RATHER THAN CHOSEN. On 2026-08-26, over the fourteen
 * full days before it, `git log --format=%ad --date=short -- src/main` on this
 * repository gave a median of 9 commits per day landing under one part of
 * roughly a component's size, and a mean of 8.9. So 20 is a little over two
 * working days of an agent paced rewrite landing under one part. Under that, a
 * hand written description is very probably still true and quoting it helps.
 * Over it, the prose has outlived two full days of work on the thing it
 * describes and the honest answer is to say so instead of quoting it.
 *
 * The other end of the same scale is measured too. Research 49 section 9.1 read
 * thirty architecture documents the operator wrote by hand and found 8 of them
 * more than 250 commits behind their repositories, one of them 583 behind. That
 * is where a document is certainly fiction, and a warning that only fires there
 * fires far too late, so this threshold sits an order of magnitude below it.
 *
 * It bounds QUOTING and never checking. Every deterministic fact composed at
 * HEAD ships whatever this number says, which is the first half of the two
 * grade rule.
 */
export const ARCH_PROSE_MAX_COMMITS_BEHIND = 20;

/**
 * The mark every line quoted out of `docs/arch/` carries.
 *
 * `docs/arch/` is written by a person or by that person's own agent. Tortie
 * never checks a word of it, and a payload that presented it as something
 * Tortie verified would be the one lie this feature could tell that a reader
 * could not catch. So the mark travels with the quote, in the same line,
 * always.
 */
export const ARCH_UNVERIFIED_MARK = 'from docs/arch, unverified';

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

/** The four verdict words, and nothing else says them. */
export function archVerdictWord(status: string): string {
  switch (status) {
    case 'convergent':
      return 'holds';
    case 'divergent':
      return 'broke';
    case 'absent':
      return 'missing';
    default:
      return 'cannot be checked';
  }
}

/** The three coverage words. */
export function archCoverageWord(coverage: string): string {
  switch (coverage) {
    case 'checked':
      return 'checked';
    case 'partly-checked':
      return 'partly checked';
    default:
      return 'not checkable';
  }
}

/**
 * The freshness ribbon, in one sentence, over a set of parts.
 *
 * It is commits rather than days on purpose. A calendar date says how long ago
 * somebody typed, and the question a person is asking is how much code moved
 * under the promise since then. Research 49 section 9.1 replaced the corpus's
 * own "Last Updated" stamp with this arithmetic for exactly that reason,
 * because git cannot lie about it and a hand typed date can.
 *
 * IT NAMES THE WORST PART RATHER THAN A TOTAL, and that is deliberate. Adding
 * the per component commit counts together would double count every commit
 * that touched two parts, and the number a person can act on is which part has
 * moved furthest from what the contract says about it.
 *
 * THE UNCOMMITTED CLAUSE IS NOT DECORATION. A verdict computed while a worktree
 * is dirty is a different claim from one computed at HEAD, and agents work
 * uncommitted for hours at a time, so a commit only count reads zero in the
 * middle of exactly the rewrite this ribbon exists to catch.
 */
export function archFreshnessRibbon(
  rows: readonly ArchFreshness[],
  /** Component id to display name, so the sentence says a name and not a slug. */
  nameOf: (componentId: string) => string
): string {
  if (rows.length === 0) {
    return 'Nothing has landed under these promises since the contract last changed.';
  }
  const moved = rows.filter((r) => r.commitsBehind > 0);
  const worst = rows.reduce((a, b) => (b.commitsBehind > a.commitsBehind ? b : a));
  const uncommitted = rows.reduce((m, r) => Math.max(m, r.uncommittedFiles), 0);

  const head =
    moved.length === 0
      ? 'Nothing has landed under these promises since the contract last changed'
      : `${String(moved.length)} of ${String(rows.length)} parts have had code land under them since the contract last changed, ${nameOf(worst.componentId)} by ${String(worst.commitsBehind)}`;

  if (uncommitted === 0) return `${head}.`;
  const files =
    uncommitted === 1
      ? '1 changed file is'
      : `${String(uncommitted)} changed files are`;
  return `${head}, and ${files} not committed yet, so those are checked against what is on disk rather than against HEAD.`;
}

/**
 * The unresolved count, which is what stops a resolver miss reading as green.
 *
 * This is the conservative verdict rule made visible. An import the resolver
 * could not follow is indistinguishable from an import that is genuinely
 * absent, and a false green on a `must-not` promise is the single most
 * damaging thing this feature could produce. So the number is on screen and in
 * the payload alike.
 */
export function archUnresolvedSentence(
  unresolved: number,
  total: number
): string | null {
  if (unresolved === 0 || total === 0) return null;
  return `${String(unresolved)} of ${String(total)} imports could not be resolved, so nothing here claims they are absent.`;
}
