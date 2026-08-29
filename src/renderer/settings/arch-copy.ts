/**
 * Every sentence Settings then Architecture draws (Phase 158).
 *
 * The section is the arch twin of the Catch Me Up one, and the same copy
 * rules bind these strings, because a person reads the two pages on the same
 * afternoon. The person is always "you". The agent is always "the agent",
 * and a particular harness is named rather than called "it". No sentence
 * holds a dash of any kind, and a colon only introduces a list. No string
 * here holds a digit. The one number that reaches the section is the
 * measured date, which arrives from main as data through `archMeasuredOn`.
 *
 * JUST ENOUGH WORDS (the operator's rule, 2026-08-28, set on this very
 * surface): the resting face carries short labels and one liners only, and
 * every sentence a person needs once rather than on every visit lives
 * behind a shut disclosure at the bottom of the page. A caption here is ONE
 * sentence. The paragraphs that say what the enrichment is and where the
 * boundary sits are the disclosure's, and they never render open on their
 * own.
 *
 * `__tests__/p158-arch-copy.test.ts` reads this file and holds all of that.
 */

/** The rail entry and the page heading. It matches the View menu row. */
export const ARCH_TITLE = 'Architecture';

/** The one group of controls on the page. */
export const ARCH_GROUP = 'Who fills in the contract';

export const ARCH_AGENT_LABEL = 'Agent';

/** One line. None is the default, and the skeleton stands without an agent. */
export const ARCH_AGENT_CAPTION =
  'None is the default, and every project keeps the drafted skeleton.';

export const ARCH_MODEL_LABEL = 'Model';

/** One line. The answer is a handful of short files. */
export const ARCH_MODEL_CAPTION = 'A small fast model is enough.';

/** The absence of a choice, and the shipped answer. */
export const ARCH_NONE_OPTION = 'None';

/** Marks the row Tortie suggests. Nothing is applied until you pick a row. */
export const ARCH_SUGGESTED_MARK = ' (suggested)';

/** When the flags behind the chosen agent were measured. The date is main's. */
export function archMeasuredOn(date: string): string {
  return `Tortie measured these flags on ${date}.`;
}

/**
 * Every agent with no measured arch recipe, named together on one line.
 *
 * The colon introduces a list, which is the one job a colon has in this
 * product's copy.
 */
export function archNotMeasured(names: string): string {
  return `Not measured yet: ${names}.`;
}

/** Every measured agent you have not confirmed, named together on one line. */
export function archNotConfirmed(names: string): string {
  return `Not confirmed yet: ${names}. Confirm under Agents.`;
}

/** The write did not stick. Main dropped the pair rather than merging half of one. */
export const ARCH_CHOICE_DROPPED =
  'Tortie did not keep that choice, so the contract is back to None. Try ' +
  'again from this window.';

/** The chosen harness stopped being available while Tortie was running. */
export function archChosenUnavailable(label: string): string {
  return `${label} cannot fill in the contract right now. Pick another agent here.`;
}

/** No preload, so the section has nothing to offer. */
export const ARCH_BRIDGE_MISSING =
  'This build cannot fill in the contract. Quit and reopen Tortie, and if ' +
  'this keeps happening, reinstall Tortie.';

/** Main answered with an empty list. */
export const ARCH_NO_HARNESSES =
  'No agent on this Mac can fill in the contract yet.';

/** Still reading the list from main. */
export const ARCH_LOADING = 'Reading which agents can fill in the contract.';

// ---------------------------------------------------------------------------
// The disclosure at the bottom, shut by default
// ---------------------------------------------------------------------------

/** The summary line, and the only words of the block on the resting face. */
export const ARCH_ABOUT_GROUP = 'What the agent does';

export const ARCH_ABOUT_WHAT =
  'The skeleton is drafted from what the imports prove, and the agent ' +
  'fills in what each part is for, which promises must hold, and what is ' +
  'missing.';

export const ARCH_ABOUT_WRITES =
  'The agent writes the contract files in your repository, and the changes ' +
  'wait in Source Control for your review.';

export const ARCH_ABOUT_BOUNDARY =
  'The agent runs only when you ask from the Architecture view, under your ' +
  'own account, and never because a file changed or a check failed.';
