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

/**
 * THE FOUR VERDICT WORDS, THE THREE COVERAGE WORDS, THE FRESHNESS RIBBON AND
 * THE UNRESOLVED SENTENCE NOW LIVE IN `src/shared/arch-copy.ts` (Phase 64).
 *
 * They moved because the main process composes a text block for a running
 * agent, and that block says "broke" and carries the same freshness sentence
 * this ribbon draws. Two copies of a sentence a person reads in two places is
 * how the two drift, and nothing compares them. The names below are what this
 * view already called them, so every caller in this directory is unchanged.
 */
export {
  archCoverageWord as coverageWord,
  archFreshnessRibbon as freshnessSentence,
  archUnresolvedSentence as unresolvedSentence,
  archVerdictWord as verdictWord
} from '@shared/arch-copy';

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
