/**
 * Every sentence the aiming verb says to a person, in one file (Phase 64).
 *
 * It is a sibling of ./copy.ts rather than an addition to it for one reason
 * only, being that Phase 64 was built by three people at once and ./copy.ts
 * was in another pair of hands. The rule ./copy.ts states is unchanged and
 * this file obeys it: no surface says the machine word, a promise HOLDS,
 * BROKE, IS MISSING or CANNOT BE CHECKED, age is a number of commits, and
 * there is no yellow and no count that rises on its own.
 *
 * NO TMUX VOCABULARY. A session has a NAME. Nothing here says pane, window or
 * prefix, and the verb is "put it into the session's prompt" rather than
 * anything about how the bytes get there.
 *
 * THE VERB NEVER PRESSES RETURN, and two of these sentences say so out loud.
 * The person reads what landed and sends it themselves, which is the whole
 * difference between handing an agent a scope and starting a turn for them.
 */

/** The Session menu row, and the picker's own title. */
export const AIM_MENU_LABEL = 'Aim at a Promise…';

/** The picker's heading row, disabled, so the menu says what it is for. */
export const AIM_PICKER_TITLE = 'Put a scope into this session';

/** The line under the picker's first row. It promises exactly what happens. */
export const AIM_PICKER_SUBLABEL =
  'The text lands in the prompt. Nothing is sent until you press Return.';

/** Every refusal a person can meet, each naming what would fix it. */
export const AIM_NO_SESSION =
  'Open a session first. The scope goes into the prompt of the session you are looking at.';

export const AIM_SESSION_NOT_RUNNING =
  'This session is not running, so nothing can be put into its prompt.';

export const AIM_SESSION_UNKNOWN =
  'Tortie cannot currently tell what this session is doing, so it will not type into it.';

export const AIM_SHELL_SESSION =
  'This session is a shell rather than an agent Tortie started, so there is no prompt to aim.';

export const AIM_NOT_AN_AGENT =
  'The agent table no longer offers this agent, so Tortie will not type into its prompt.';

export const AIM_FOREIGN_SESSION =
  'Tortie did not start this session, so it will not type into it.';

export const AIM_NO_CONTRACT =
  'This project has no contract to aim at yet. Open Architecture to write one.';

export const AIM_NOTHING_SELECTED =
  'Nothing is selected. Pick a part, a promise or a gap first.';

/** What the picker's own rows are grouped under. */
export const AIM_GROUP_PARTS = 'Parts';
export const AIM_GROUP_BROKEN = 'Promises that did not hold';
export const AIM_GROUP_GAPS = 'Known gaps';

/** Said once, after the block is in the prompt. */
export function aimLanded(sessionName: string, subjects: number): string {
  const what = subjects === 1 ? 'The scope' : `The ${String(subjects)}-part scope`;
  return `${what} is in ${sessionName}'s prompt. Read it, then press Return.`;
}

/** Said when the composer could not be reached at all. */
export const AIM_NO_COMPOSER =
  'This build cannot compose a scope. Everything else in Tortie works as it always did.';

/** Said when the composer was reachable and the composition itself failed. */
export const AIM_COMPOSE_FAILED =
  'The scope could not be composed from this contract, so nothing was put into the prompt.';

/** Said when the paste itself did not land. */
export const AIM_NOT_DELIVERED =
  'The scope was composed but it did not reach the prompt. Nothing was sent.';

/**
 * THE BROKEN TARGET CONFIRMATION, which is the one check typing a scope by
 * hand can never perform.
 *
 * A contract can name files that were deleted or moved a hundred commits ago,
 * and a scope built out of it then points an agent at nothing. Tortie knows,
 * because it resolved the anchors against `git ls-files` at HEAD, so it asks
 * once rather than handing over a scope it can see is empty.
 */
export function aimBrokenTargetTitle(count: number): string {
  return count === 1
    ? 'One selected part matches no files'
    : `${String(count)} selected parts match no files`;
}

export const AIM_BROKEN_TARGET_BODY =
  'The contract says where these live, and nothing is there at the moment. The scope will name paths the agent will not find.';

export const AIM_BROKEN_TARGET_SEND = 'Put it in the prompt anyway';
export const AIM_BROKEN_TARGET_CANCEL = 'Cancel';
