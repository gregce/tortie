/**
 * Every sentence the Catch Me Up views draw (Phase 137).
 *
 * Two rules bind every string here, and copy-rules.test.ts reads this file
 * to hold them. The person is always "you" and the agent is always
 * "the agent". Neither is ever a pronoun. Where a sentence would need a
 * second reference to the agent, the sentence is written around the outcome
 * instead. And no string here carries a digit, because the only integers the
 * page may show are a clock time, a date and an elapsed time, and those come
 * from the formatters in ./overview-clock.ts and ./age.ts alone.
 *
 * MOVED TO SHARED IN PHASE 316, byte for byte, from
 * `src/renderer/overview/copy.ts`, together with `answerAbsence`, which lived
 * privately in `TurnBlock.tsx`. The phone's door answers every turn's absence
 * sentence from main (`PocketTurn.absence`), and main cannot read a renderer
 * module, so the three sentences and the rule that chooses between them now
 * live where both processes read them. Every importer was re-pointed; nothing
 * re-exports this module.
 */

import type { SessionStatus } from './types';

/** The label over each ask. */
export const YOU_LABEL = 'you';

/** The label over each answer. */
export const AGENT_LABEL = 'the agent';

// ---------------------------------------------------------------------------
// The turn block
// ---------------------------------------------------------------------------

/** An open turn while the session is running or waiting on you. */
export const NOT_ANSWERED_YET = 'the agent has not answered yet';

/** An interrupted turn. */
export const STOPPED_BEFORE_ANSWER = 'stopped before the agent answered';

/** A turn whose closing answer never reached the record, which is gemini's usual line. */
export const ANSWER_NOT_IN_RECORD = 'the agent’s answer is not in the record';

/**
 * The sentence for a turn with no answer on record (Phase 137, moved here in
 * Phase 316 so the desktop's turn block and the phone's door choose it with
 * ONE rule).
 *
 * An open turn of a session that is running or waiting on you has not been
 * answered YET. An interrupted turn was stopped first. Anything else closed
 * without its answer reaching the record. It reads only the turn's two flags
 * and the session's own status, and it never reads the answer text, because it
 * is asked only where there is none.
 */
export function answerAbsence(
  turn: { readonly closed: boolean; readonly interrupted: boolean },
  status: SessionStatus
): string {
  if (!turn.closed && (status === 'running' || status === 'needs_input')) {
    return NOT_ANSWERED_YET;
  }
  if (turn.interrupted) return STOPPED_BEFORE_ANSWER;
  return ANSWER_NOT_IN_RECORD;
}

/** The three git marks, right aligned under an answer. */
export const MARK_AGREES = '✓ git agrees';
export const MARK_NO_RECORD = '⚠ git has no record';
export const MARK_NOTHING_TO_CHECK = 'nothing to check';

/** Drawn after a clipped ask or answer. */
export const REST_NOT_SHOWN = 'The rest of this message is not shown.';

/** The CLI's own notice for a turn, drawn under the answer slot. */
export function sessionStoppedNotice(notice: string): string {
  return `the session stopped: ${notice}`;
}

/** Added to the session header when the turns carry no clock. */
export const NO_CLOCK_NOTE = 'no clock on these turns';

// ---------------------------------------------------------------------------
// The project line outcomes
// ---------------------------------------------------------------------------

export const OUTCOME_DONE_GIT_AGREES = 'Done, and git agrees';
export const OUTCOME_DONE_NO_RECORD =
  'The agent says it is done. git has no record of it';
export const OUTCOME_DONE_OUTSIDE = 'Done, outside this project';
export const OUTCOME_ANSWERED = 'Answered';
export const OUTCOME_STILL_WORKING = 'The agent is still working';
export const OUTCOME_STOPPED = 'Stopped before the agent answered';
export const OUTCOME_NO_ANSWER = 'The agent’s answer is not in the record';

/**
 * Phase 311. A session that is waiting on the person.
 *
 * `OUTCOME_NO_ANSWER` above was drawn for this row until this phase, because
 * the still working arm asks for `running` and a waiting session is not
 * running. "The agent's answer is not in the record" is false of a session
 * whose agent is standing at a question, and this is the one row the phone
 * exists for. What is being asked is drawn under the line, from the activity
 * channel, and never composed into this sentence.
 */
export const OUTCOME_WAITING = 'The agent is waiting for you.';

/** A session with nothing asked yet. The clock comes from ./clock.ts. */
export function outcomeNothingAsked(clock: string): string {
  return `started ${clock}, nothing asked yet`;
}

export const OUTCOME_SHELL = 'no agent here';
export const OUTCOME_NO_STORE =
  'This agent keeps no record on this Mac that Tortie can read';

/** The detail is main's own sentence, shown verbatim after this one. */
export function outcomeUnreadable(detail: string | null): string {
  const lead = 'Tortie could not read this session’s record.';
  return detail === null || detail === '' ? lead : `${lead} ${detail}`;
}

export const OUTCOME_WRONG_CONVERSATION =
  'The record Tortie has for this session names a different folder';
export const OUTCOME_REMOTE =
  'This session runs on another machine. Its record is there';

/** The lead of a project line whose session has turns. The ask follows in quotes. */
export const YOU_ASKED_LEAD = 'you asked ';

/**
 * The lead of the clock beside a line a MODEL wrote (Phase 138.1).
 *
 * A line Tortie built carries nothing at all, because a built line is the
 * default and silence is right for a default. The clock itself comes from
 * formatTurnClock in ./clock.ts, so a line written yesterday says its date
 * rather than claiming a today that is not true.
 */
export const WRITTEN_LEAD = 'written ';

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

/** The right side of the project header. The clock comes from ./clock.ts. */
export function readAtHeader(clock: string): string {
  return `read ${clock}`;
}

/** A project with no sessions at all. */
export const EMPTY_PROJECT =
  'Nothing here yet. Start a session and ask for something.';

/** The chord was pressed with no project open. */
export const OPEN_A_PROJECT_FIRST = 'Open a project first.';

/** The four footers. The spacing is kept by white-space in the stylesheet. */
export const FOOTER_PROJECT =
  '↑↓ move   ⏎ open this session’s conversation   esc back';
export const FOOTER_SESSION =
  '↑↓ move   ⏎ go to this session   ⇥ your asks   esc back';
export const FOOTER_COLUMNS = 'esc back';

/**
 * Phase 143. While a story is open the footer says the story's own keys,
 * because the keys behind the panel are not the ones a press reaches. Since
 * Phase 147 the panel opens under a project row rather than inside the one
 * session view, and the sentence holds either way.
 */
export const FOOTER_STORY =
  '↑↓ move   ⏎ open the conversation behind this sentence   esc back';

// ---------------------------------------------------------------------------
// The story of what a model wrote about one session (Phase 143, moved onto
// the project rows in Phase 147, because the project view is the only view a
// model writes on and the story is the history of that one line)
// ---------------------------------------------------------------------------

/**
 * The press target on each project row, one word at the far right of every
 * row (his refinement of 2026-08-24). The word never changes with the panel:
 * aria-expanded carries the open state, read from the same condition that
 * mounts the panel, so no surface announces what is not on screen.
 */
export const STORY_WORD = 'story';

/**
 * The first line of the panel. Always drawn, above everything else, because a
 * person must never mistake these sentences for the conversation.
 */
export const STORY_LEAD =
  'You are reading the sentences a model wrote about this session, ' +
  'not the conversation itself, which is the real record.';

/** The second line. The clock on a row belongs to the writing, not to a turn. */
export const STORY_CLOCK_NOTE =
  'Each time below is when that sentence was written, ' +
  'and not when you asked for anything.';

/** No agent and model are chosen, so nothing is being written at all. */
export const STORY_NO_MODEL =
  'No model is writing these sentences, so there is no story to read. ' +
  'You can choose one in Settings, under Catch Me Up.';

/** A model is chosen and nothing has been written for this session yet. */
export const STORY_NOTHING_YET =
  'Nothing has been written for this session yet. A sentence is written ' +
  'after the agent has finished a piece of work.';

/** The lead of the model line, drawn only when the rows do not agree. */
export const STORY_MODEL_LEAD = 'written by ';

/** A row whose stretch of the conversation no sentence covers. */
export const STORY_GAP =
  'Some of the conversation before this point is not part of the story.';

/** A pressed row whose turns could not be read. */
export const STORY_TURNS_UNREADABLE =
  'Tortie could not read the turns behind this sentence.';

/** A pressed row whose turns have left the record. */
export const STORY_TURNS_GONE =
  'The turns behind this sentence are no longer on record.';

/** A pressed row over a wide stretch, where only the newest turns are shown. */
export const STORY_TURNS_CLIPPED =
  'Only the newest turns of this stretch are shown.';

/** A build whose bridge has no reader for the story. */
export const STORY_BRIDGE_MISSING =
  'This build cannot read what has been written about this session.';
