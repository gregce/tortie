/**
 * Every sentence Settings then Catch Me Up draws (Phase 138, cut down in
 * Phase 138.1).
 *
 * THE PAGE SAYS WHAT YOU NEED TO CONFIGURE THE THING AND NOTHING ELSE. The
 * operator photographed the Phase 138 page and said the extra text was crap.
 * He was right, and the count said so: with Claude Code chosen the page drew
 * twenty three sentences, ten of which were the same sentence with a different
 * agent's name in it. A sentence lives here only when a person cannot use the
 * two pickers without reading the sentence, or when something has gone wrong
 * and the page has to say so.
 *
 * The one block of prose that survives is at the bottom, under the pickers,
 * and it says what Catch Me Up is. The operator asked for that block by name.
 * Someone who came to change a dropdown reaches the dropdown first, and
 * someone who came to find out what this feature is reads four sentences at
 * the end.
 *
 * The same two copy rules the Catch Me Up page carries bind these strings.
 * The person is always "you". The agent is always "the agent", and a
 * particular harness is named rather than called "it". No string here holds a
 * digit. Two numbers reach the section as data: the measured date, drawn
 * through `foldMeasuredOn`, and the chord, read from the shared keymap and
 * drawn through `foldAboutOpen`.
 *
 * `__tests__/p138-fold-copy.test.ts` reads this file and holds all of that.
 */

/** The rail entry and the page heading. It matches the View menu row. */
export const FOLD_TITLE = 'Catch Me Up';

/** The one group of controls on the page. */
export const FOLD_GROUP = 'Who writes the line';

export const FOLD_AGENT_LABEL = 'Agent';

export const FOLD_AGENT_CAPTION =
  'The agent you pick writes one line for each session in a project, after ' +
  'that session finishes a turn. None is the default, and picking None ' +
  'again brings the built line straight back.';

export const FOLD_MODEL_LABEL = 'Model';

export const FOLD_MODEL_CAPTION =
  'A small fast model is enough, because each line is one short sentence.';

/** The absence of a choice, and the shipped answer. */
export const FOLD_NONE_OPTION = 'None';

/** Marks the row Tortie suggests. Nothing is applied until you pick a row. */
export const FOLD_SUGGESTED_MARK = ' (suggested)';

/** When the flags behind the chosen agent were measured. The date is main's. */
export function foldMeasuredOn(date: string): string {
  return `Tortie measured these flags on ${date}.`;
}

/**
 * Every agent with no measured recipe, named together on one line.
 *
 * The colon introduces a list, which is the one job a colon has in this
 * product's copy. Phase 138 drew one paragraph per agent here instead.
 */
export function foldNotMeasured(names: string): string {
  return `Not measured yet: ${names}.`;
}

/** Every measured agent you have not confirmed, named together on one line. */
export function foldNotConfirmed(names: string): string {
  return `Not confirmed yet: ${names}. Confirm what each one runs under Agents.`;
}

/** The write did not stick. Main dropped the pair rather than merging half of one. */
export const FOLD_CHOICE_DROPPED =
  'Tortie did not keep that choice, so the line is back to None. Try again ' +
  'from this window.';

/** The chosen harness stopped being available while Tortie was running. */
export function foldChosenUnavailable(label: string): string {
  return `${label} cannot write the line right now. Pick another agent here.`;
}

/** No preload, so the section has nothing to offer. */
export const FOLD_BRIDGE_MISSING =
  'This build cannot write the project line. Quit and reopen Tortie, and if ' +
  'this keeps happening, reinstall Tortie.';

/** Main answered with an empty list. */
export const FOLD_NO_HARNESSES = 'No agent on this Mac can write the line yet.';

/** Still reading the list from main. */
export const FOLD_LOADING = 'Reading which agents can write the line.';

// ---------------------------------------------------------------------------
// The one block of prose, at the bottom, under the pickers
// ---------------------------------------------------------------------------

/** The heading over the block that says what this feature is. */
export const FOLD_ABOUT_GROUP = 'What Catch Me Up is';

export const FOLD_ABOUT_WHAT =
  'Catch Me Up shows the conversation you have been having with each session ' +
  'in a project. Every ask and every closing answer comes from the agent’s ' +
  'own log, word for word.';

/**
 * How to open the page. The chord is read from the shared keymap by the
 * caller rather than typed here, so this sentence cannot drift from the keys
 * the app answers. There is one menu row and this names that one.
 */
export function foldAboutOpen(chord: string): string {
  return (
    `Open this page with ${chord}, or from the View menu, then Catch Me Up. ` +
    'Press the same keys again, or Escape, to go back.'
  );
}

export const FOLD_ABOUT_LEVELS =
  'What opens depends on what has focus. With the keyboard in one session ' +
  'you get that session on its own. With a split on screen you get the ' +
  'sessions in that split side by side. Anywhere else you get one line for ' +
  'every session in the project.';

export const FOLD_ABOUT_BOUNDARY =
  'The agent you pick above writes only that one line per session on the ' +
  'project view. The conversation you read is never written by a model.';
