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

/**
 * PHASE 160, the map's own sentences.
 *
 * The map is the product and the contract is annotation on it, in the
 * operator's own ruling. So the pane's first control opens the map, the map
 * needs no contract, and the sentence about contracts says what one ADDS
 * rather than what is missing.
 */

/** The control in the pane that opens or focuses the map tab. */
export const ARCH_MAP_OPEN_TITLE = 'Open the map';

export const ARCH_MAP_OPEN_BODY =
  'Draws this repository as a small map in a full size tab. No contract is needed and nothing is written.';

/** The map tab while main is still reading the code the first time. */
export const ARCH_MAP_LOADING =
  'Tortie is reading the code. The map draws the moment the reading lands, and every later open reuses it.';

/** A map read that failed outright, when there is no earlier picture to keep. */
export const ARCH_MAP_ERROR = 'The map could not be drawn.';

/** The reading finished and found nothing to draw. Honest, never a spinner. */
export const ARCH_MAP_EMPTY_REPO =
  'There is nothing to draw. No tracked source files were found in this repository.';

/**
 * The reading finished, tracked files exist, and still nothing draws: every
 * one of them sits at the top level of the repository, and the grouping draws
 * folders (Phase 63's rule, which the map inherits). Saying no tracked files
 * were found here would be false, which the Phase 160 fix round measured on a
 * one file repository.
 *
 * The second fix round made this sentence exact: the grouping now composes
 * zero groups ONLY when no tracked file sits inside a folder, so a small
 * nested repository draws its real folders instead of being called flat.
 */
export const ARCH_MAP_FLAT_REPO =
  'There is nothing to draw yet. Every tracked file sits at the top level of this repository, and the map draws the folders a codebase grows into.';

/** An older preload with no map channel. One sentence, and the tab still renders. */
export const ARCH_MAP_NO_BRIDGE =
  'This build cannot draw the map. Everything else in Tortie works as it always did.';

/** A newer read failed and the picture on screen is the read before it. */
export const ARCH_MAP_STALE =
  'The newest reading failed, so this picture is the one before it.';

/** The cockpit's heading over the computed parts, when there is no contract. */
export const ARCH_COMPUTED_TITLE = 'Computed parts';

/**
 * The quiet line under the cockpit when there is no contract. It says what a
 * contract ADDS, because the map already exists without one.
 */
export const ARCH_CONTRACT_ADDS =
  'The map is drawn from the code alone. A contract adds your own names for its parts and promises Tortie checks, and the same map then wears them.';

/** The demoted teaching section's heading. */
export const ARCH_CONTRACT_OFFER_TITLE = 'Add a contract';

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

/**
 * PHASE 161, the drill's own sentences.
 *
 * The ladder is the navigation: the whole map, one part, one module. The
 * breadcrumb names where a person is and one click returns to the whole. The
 * pane's strip and failure list scope with the drill, and every scoped state
 * below says what it means in one sentence rather than drawing zero filled
 * lanes about nothing.
 */

/** The breadcrumb's own name, for the reader that cannot see it. */
export const ARCH_DRILL_CRUMB_LABEL = 'Where you are in the map';

/** The first breadcrumb segment when the model has no better name yet. */
export const ARCH_DRILL_WHOLE = 'Whole map';

/** An older preload with no scoped read. One sentence, and the map still draws. */
export const ARCH_DRILL_NO_BRIDGE =
  'This build cannot look inside a part. Everything else in Tortie works as it always did.';

/** A scoped read that failed outright, with no earlier picture to keep. */
export const ARCH_DRILL_PART_ERROR = 'The inside of this part could not be read.';

/** The pane's strip while the scoped answer is on its way. */
export const ARCH_SCOPED_LOADING = 'Reading the promises for this part.';

/**
 * A contract whose promises do not touch the drilled part. The sentence is
 * the honest face here: zero filled lanes would be a reassuring number about
 * nothing, which is the exact thing the unscoped strip refuses.
 */
export const ARCH_SCOPED_NO_PROMISES =
  'No promise in the contract touches this part, so there is nothing to check inside it.';

/** The scoped failure list when everything checkable in the part holds. */
export const ARCH_SCOPED_NO_FAILURES =
  'Every promise Tortie can check in this part holds.';
