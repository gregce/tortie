/**
 * Every sentence the Architecture view says to a person, in one file.
 *
 * The precedent is `src/renderer/machines/editor.ts`, which holds every
 * sentence that view says about a machine so a vocabulary audit reads one file
 * rather than nine components. The same reason applies here twice over,
 * because this view's whole job is telling a person something is wrong and the
 * difference between "broke" and "cannot be checked" is the feature.
 *
 * THE VOCABULARY, fixed here so no component invents a second word for it:
 *
 *  - A promise HOLDS, BROKE, IS MISSING, or CANNOT BE CHECKED. Those four
 *    words are `convergent`, `divergent`, `absent` and `unverifiable`, and no
 *    surface says the machine word.
 *  - Coverage is CHECKED, PARTLY CHECKED or NOT CHECKABLE. A behavioural
 *    promise with evidence is partly checked, and the panel says what that
 *    bought in one sentence rather than leaving a person to guess.
 *  - Nothing here says "stale", "drift" or "out of date" as a verdict. Age is
 *    a number of commits and it is stated as one.
 *
 * NO TMUX VOCABULARY, NO COUNT THAT RISES ON ITS OWN, and no yellow anywhere:
 * amber belongs to "an agent needs you" and nothing on this surface is that.
 */

import type { ArchFreshness } from '@shared/arch';

/** The view's own name, as a person reads it. */
export const ARCH_VIEW_TITLE = 'Architecture';

/** No preload method at all. One sentence, and the view still renders. */
export const ARCH_NO_BRIDGE =
  'This build cannot read a contract. Everything else in Tortie works as it always did.';

/** A project that is not a folder on this computer. */
export const ARCH_ELSEWHERE =
  'A contract is read on the computer its repository is on, and this build cannot ask that computer anything.';

/** No `docs/arch/` at all, which is every repository until somebody writes one. */
export const ARCH_EMPTY_TITLE = 'No contract in this repository yet';

export const ARCH_EMPTY_BODY =
  'A contract is a small set of promises about how the parts of this project are allowed to touch. Tortie checks them against the code and says which ones hold, which ones broke and at which line, and which ones it cannot check.';

/**
 * The promise-set guidance, and it is a number for a reason. Research 49
 * section 9.6 read thirty architecture documents the operator wrote by hand
 * and none of them opened with more than nine boxes. A set of three says
 * nothing and a set of forty is a second codebase to maintain.
 */
export const ARCH_PROMISE_GUIDANCE =
  'A healthy set is 5 to 10 promises. Fewer says nothing, and more is a second codebase to keep current.';

/** What the Draft control does, said before it is pressed. */
export const ARCH_DRAFT_TITLE = 'Draft a contract';

/**
 * IT SAYS THE FOLDER OUT LOUD, and that sentence is load bearing.
 *
 * The gesture creates `docs/arch` and `docs/arch/components`, because without
 * them the person's first Save fails on a folder that has never existed. That
 * is the only thing it writes, and every byte of the drafts themselves lands in
 * an unsaved editor buffer. The first version of this string said Tortie writes
 * nothing at all, which was not true of the folders, and this phase is the one
 * that lands the Zen line saying checking a promise is Tortie reading files.
 */
export const ARCH_DRAFT_BODY =
  'Opens the files as drafts you have not saved. Tortie creates the two folders they would be saved into, docs/arch and docs/arch/components, and writes nothing else until you press Save on each one.';

/** What the seeding control does, said before it is pressed. */
export const ARCH_SEED_TITLE = 'Ask an agent to draft it';

export const ARCH_SEED_BODY =
  'Copies a prompt for you and opens the ordinary new session sheet. You choose the agent and start it, exactly as you would for any other session.';

/** Said once, after the prompt is on the clipboard. */
export const ARCH_SEED_COPIED =
  'The prompt is on your clipboard. Start a session and paste it in.';

/** The one sentence the prose panel carries under every description. */
export const ARCH_PROSE_UNVERIFIED =
  'Tortie never checks this text. It is what the author wrote.';

/** What a behavioural promise with evidence actually bought. */
export const ARCH_PARTLY_CHECKED_NOTE =
  'Tortie proved the quoted code is still where the author said it is. It did not prove what happens when it runs.';

/** The gap strip's own heading, first class because the corpus makes it so. */
export const ARCH_GAPS_TITLE = 'Known gaps';

/** The accepted-divergence rule, said on the face of the strip. */
export const ARCH_ACCEPTED_NOTE =
  'Accepted divergences are counted here with the reason the author gave. Tortie reads that file and never writes it.';

/** The four verdict words, and nothing else says them. */
export function verdictWord(status: string): string {
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
export function coverageWord(coverage: string): string {
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
 * The freshness ribbon, in one sentence.
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
export function freshnessSentence(
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
    uncommitted === 1 ? '1 changed file' : `${String(uncommitted)} changed files`;
  return `${head}, and ${files} are not committed yet, so those are checked against what is on disk rather than against HEAD.`;
}

/**
 * The unresolved count, which is what stops a resolver miss reading as green.
 *
 * This is the conservative verdict rule made visible. An import the resolver
 * could not follow is indistinguishable from an import that is genuinely
 * absent, and a false green on a `must-not` promise is the single most
 * damaging thing this feature could produce. So the number is on screen: a
 * person reading "nothing imports the tmux layer" can see how much of the
 * search actually returned a definite answer.
 */
export function unresolvedSentence(
  unresolved: number,
  total: number
): string | null {
  if (unresolved === 0 || total === 0) return null;
  return `${String(unresolved)} of ${String(total)} imports could not be resolved, so nothing here claims they are absent.`;
}

/** A run that has not finished yet. Never a stale verdict wearing a fresh face. */
export const ARCH_FIRST_CHECK = 'Not checked yet';

/** The failure list's own heading, and the empty case reads as an answer. */
export const ARCH_NO_FAILURES = 'Every promise Tortie can check holds.';

/**
 * A read that failed on the bytes, showing the last good rows instead.
 *
 * It exists because an agent rewriting `edges.json` writes it in stages, and a
 * view that blanked on every half written save would be unusable for the exact
 * minute a person most wants to look at it. So the rows on screen are the
 * previous good read and the banner says so, rather than the view pretending
 * they are current or pretending there is nothing there.
 */
export const ARCH_LAST_VALID =
  'These are the last rows that loaded. The files on disk did not, so what is on screen may be behind them.';
