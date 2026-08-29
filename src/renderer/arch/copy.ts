/**
 * Every sentence the Architecture view says to a person, in one file.
 *
 * The precedent is `src/renderer/machines/editor.ts`, which holds every
 * sentence that view says about a machine so a vocabulary audit reads one file
 * rather than nine components. The same reason applies here twice over,
 * because this view's whole job is telling a person something is wrong and the
 * difference between "broke" and "cannot be checked" is the feature.
 *
 * THE COPY RULING (the operator, 2026-08-28): the panel carries just enough
 * words to say what is happening. Short labels, one line sentences and
 * visual state on the resting face; a longer explanation lives behind a
 * hover title or one collapsed disclosure, never on the face. The unit
 * suite counts the words on every resting sentence, so a later round that
 * grows one back into a paragraph fails before it ships.
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

/** What the control does, on the hover title only (the copy ruling). */
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
  'A contract adds your names and checked promises to this map.';

/** The demoted teaching section's heading. */
export const ARCH_CONTRACT_OFFER_TITLE = 'Add a contract';

/** No `docs/arch/` at all, which is every repository until somebody writes one. */
export const ARCH_EMPTY_TITLE = 'No contract in this repository yet';

/** The offer's one resting line. The paragraph moved behind the disclosure. */

export const ARCH_EMPTY_BODY =
  'Promises about how the parts of this project may touch, checked against the code.';

/** The collapsed disclosure's label. The teaching lives behind it. */
export const ARCH_EMPTY_MORE = 'What a contract is';

/**
 * The teaching, behind the disclosure (the copy ruling, 2026-08-28). This
 * is the paragraph that used to sit on the resting face; the face now says
 * the one line above and this opens on a click.
 */
export const ARCH_EMPTY_LONG =
  'A contract is a small set of promises about how the parts of this project are allowed to touch. Tortie checks them against the code and says which ones hold, which ones broke and at which line, and which ones it cannot check.';

/**
 * The promise-set guidance, and it is a number for a reason. Research 49
 * section 9.6 read thirty architecture documents the operator wrote by hand
 * and none of them opened with more than nine boxes. A set of three says
 * nothing and a set of forty is a second codebase to maintain.
 */
export const ARCH_PROMISE_GUIDANCE =
  'A healthy set is 5 to 10 promises. Fewer says nothing, and more is a second codebase to keep current.';

/** What the one control does, said before it is pressed (Phase 158). */
export const ARCH_DRAFT_TITLE = 'Draft the contract';

/**
 * IT SAYS THE WRITE OUT LOUD, and that sentence is load bearing.
 *
 * Phase 158 replaced the unsaved buffers with a direct write, on the
 * operator's own amendment: the gesture asks main to write the deterministic
 * skeleton under `docs/arch/`, so the result lands as an ordinary
 * uncommitted change a person reviews in Source Control, never as buffers
 * they must save one by one. The sentence names the write before the button
 * is pressed, because the earlier version of this surface once promised the
 * opposite of what it did. Since the copy ruling it rides the button's hover
 * title rather than its face.
 */
export const ARCH_DRAFT_BODY =
  'Writes a small deterministic skeleton into docs/arch, drawn from the code alone. It lands as an ordinary uncommitted change, so Source Control shows every line and you commit it or throw it away.';

/**
 * THE ONE QUIET SENTENCE ABOUT THE PASS, with its Settings pointer.
 *
 * There is one way a contract starts. A model improves it afterwards, where
 * a model is the right tool, and only under the agent the person confirmed
 * in Settings. These two sentences are the whole story the offer tells; the
 * run face below tells the rest while it happens.
 */
export const ARCH_PASS_QUIET =
  'The agent you picked in Settings then fills it in.';

/** The pass is off. Said plainly, so off never reads as broken. */
export const ARCH_PASS_OFF = 'No agent fills this in yet. Pick one in Settings.';

/** The one sentence the prose panel carries under every description. */
export const ARCH_PROSE_UNVERIFIED =
  'The author\'s own words. Tortie never checks them.';

/** What a behavioural promise with evidence actually bought. */
export const ARCH_PARTLY_CHECKED_NOTE =
  'The quoted code is still there. What it does when run is unproven.';

/** The gap strip's own heading, first class because the corpus makes it so. */
export const ARCH_GAPS_TITLE = 'Known gaps';

/**
 * The accepted-divergence rule, said on the face of the strip.
 *
 * PHASE 158 CHANGED THE SECOND SENTENCE. Accepting a divergence became a
 * button on the failing row, on the operator's own amendment, so "Tortie
 * never writes that file" stopped being true. What stays true, and what the
 * sentence now says, is the part that matters: the decision and the reason
 * are the person's, the button is the one way the file is ever written, and
 * every accepted row still shows here in the person's own words so an agent
 * cannot quietly accept its own violation. Since the copy ruling the strip
 * says the count and the rows, and this sentence rides the hover title.
 */
export const ARCH_ACCEPTED_NOTE =
  'Accepted divergences are counted here with the reason the person gave. The accept control on a failing row is the one way Tortie ever writes that file.';

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

/**
 * PHASE 158, the run face and the accept verb.
 *
 * The pass is visible while it runs, the way a session row says written and
 * the time. Every state below is one sentence a person can act on, and a
 * refused run says so with the refusal named rather than pretending nothing
 * happened.
 */

/** The run face's own heading. */
export const ARCH_PASS_TITLE = 'Filling in';

/** The control that runs the pass over an existing contract. */
export const ARCH_ENRICH_TITLE = 'Fill in the contract';

/** What the run control does, on the hover title only (the copy ruling). */
export const ARCH_ENRICH_BODY =
  'Runs the agent you confirmed in Settings once over this repository. Its answer is checked whole before anything is written, and what it writes lands as an ordinary uncommitted change.';

/** The pass is running right now. */
export const ARCH_PASS_RUNNING =
  'Running. Nothing is written until the whole answer passes the checks.';

/** The last answer was refused whole. The refusal name follows this lead. */
export const ARCH_PASS_REFUSED =
  'The last answer was refused whole and nothing was written.';

/** The last run failed for a reason that is not a refusal. */
export const ARCH_PASS_FAILED = 'The last run failed and nothing was written.';

/** Repeated failures parked the pass, the fold's own discipline. */
export const ARCH_PASS_SUSPENDED =
  'Paused after repeated failures. Run it again when you want another try.';

/** The heading over the answer's regroup suggestions, when it made any. */
export const ARCH_PASS_SUGGESTIONS = 'Suggested regroupings';

/** The rule the suggestions live under, said on their face. */
export const ARCH_PASS_SUGGESTIONS_NOTE = 'Listed only, never written.';

/**
 * The sentence for a gesture main refused before any spawn. The tokens are
 * main's, the fold options convention: main decides, the renderer writes the
 * words, and an unknown token still gets an honest sentence with the token
 * named rather than a blank face.
 */
export function enrichRefusalSentence(token: string): string {
  switch (token) {
    case 'no-choice':
      return ARCH_PASS_OFF;
    case 'not-confirmed':
      return 'The picked agent is not confirmed in Settings right now, so nothing was started.';
    case 'no-recipe':
      return 'The picked agent has no measured recipe yet, so nothing was started.';
    case 'in-flight':
      return 'A pass is already running for this repository.';
    case 'suspended':
      return ARCH_PASS_SUSPENDED;
    default:
      return `Nothing was started. The reason is named ${token}.`;
  }
}

/** The accept control on a failing row. One word, the decision is the click. */
export const ARCH_ACCEPT_TITLE = 'Accept';

/** An offence a baseline row already covers. One word; the reason rides hover. */
export const ARCH_OFFENCE_ACCEPTED = 'accepted';

/** What pressing it does, said before it is pressed. */
export const ARCH_ACCEPT_BODY =
  'Writes this divergence into docs/arch/baseline.json with your reason. The decision and the reason are yours, and the typing is not.';

/** The reason field, which the write refuses to go without. */
export const ARCH_ACCEPT_REASON_LABEL = 'Why this divergence is fine';

/** The confirm control inside the open accept form. */
export const ARCH_ACCEPT_WRITE = 'Write it down';
