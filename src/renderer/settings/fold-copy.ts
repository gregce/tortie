/**
 * Every sentence Settings then Project line draws (Phase 138).
 *
 * The same two copy rules the Catch Me Up page carries bind these strings.
 * The person is always "you". The agent is always "the agent", and a
 * particular harness is named rather than called "it". No string here holds a
 * digit, and the one place a number reaches the section is the measured date,
 * which arrives from main as data and is drawn through `foldMeasuredOn`.
 *
 * `__tests__/fold-copy-rules.test.ts` reads this file and holds all of that.
 */

/** The rail entry and the page heading. */
export const FOLD_TITLE = 'Project line';

/** The one group on the page. */
export const FOLD_GROUP = 'Who writes the line';

export const FOLD_AGENT_LABEL = 'The agent that writes the line';

export const FOLD_AGENT_CAPTION =
  'Catch Me Up shows one line for each session in this project. Pick an ' +
  'agent here and a small model writes that line for you after a session ' +
  'finishes a turn. Pick None and Tortie writes the line itself, from your ' +
  'own ask and from what git recorded.';

export const FOLD_MODEL_LABEL = 'Model';

export const FOLD_MODEL_CAPTION =
  'The model that writes the sentence. A small fast model is enough, ' +
  'because each sentence is short and Tortie sends the previous sentence ' +
  'along with the new turns.';

/** The absence of a choice, and the shipped answer. */
export const FOLD_NONE_OPTION = 'None';

/** Marks the row Tortie suggests. Nothing is applied until you pick a row. */
export const FOLD_SUGGESTED_MARK = ' (suggested)';

export const FOLD_NONE_NOTE =
  'None is what Tortie ships with. Nothing runs and nothing leaves this Mac ' +
  'until you pick an agent here. Picking None again later brings the built ' +
  'line straight back and deletes nothing.';

export const FOLD_SEAL_NOTE =
  'This choice decides that a program runs, so Tortie accepts the choice ' +
  'from this window and from nowhere else. A choice written into the ' +
  'settings file by anything else is dropped whole and the line goes back ' +
  'to None.';

export const FOLD_SPAWN_NOTE =
  'Tortie holds no key and sends nothing to a server of its own. The agent ' +
  'you pick here is run as a separate one shot program, the same way every ' +
  'other agent on this Mac is run.';

/** The write did not stick. Main dropped the pair rather than merging half of one. */
export const FOLD_CHOICE_DROPPED =
  'Tortie did not keep that choice, so the line is back to None. Try again ' +
  'from this window.';

/** No preload, so the section has nothing to offer. */
export const FOLD_BRIDGE_MISSING =
  'This build cannot write the project line. Quit and reopen Tortie, and if ' +
  'this keeps happening, reinstall Tortie.';

/** Main answered with an empty list. */
export const FOLD_NO_HARNESSES =
  'No agent on this Mac can write the line yet, so the line stays the one ' +
  'Tortie builds.';

/** Still reading the list from main. */
export const FOLD_LOADING = 'Reading which agents can write the line.';

/** A harness Tortie cannot offer. The reason is main's own sentence. */
export function foldUnavailable(label: string, reason: string): string {
  return `${label}. ${reason}`;
}

/** The chosen harness stopped being available while Tortie was running. */
export function foldChosenUnavailable(label: string): string {
  return (
    `${label} cannot write the line right now. Confirm ${label} under ` +
    `Agents, or pick another agent here.`
  );
}

/** When the flags behind a row were measured. The date arrives from main. */
export function foldMeasuredOn(date: string): string {
  return `The flags behind this agent were measured on ${date}.`;
}
