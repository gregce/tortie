/**
 * The project view's one line per session (Phase 137). Pure.
 *
 * MOVED TO SHARED IN PHASE 316, byte for byte, from
 * `src/renderer/overview/line.ts`. The phone's door answers a session's Catch
 * Me Up line from main (`PocketSessionDetail.catchUp`), built by
 * `buildProjectLine` below over main's own reading of the overview store, so
 * the line on the phone and the line on the Mac are one function's answer.
 * Every importer was re-pointed; nothing re-exports this module.
 *
 * The line is BUILT, never written by a model. The ask is the person's own
 * words clipped to their first clause, and the outcome is decided from git
 * and the path index. "the agent" appears only where the line reports a
 * claim rather than a fact, which is the one outcome where the agent said
 * done and git has no record of it.
 */

import type { OverviewSessionView } from './overview';
import type { SessionStatus } from './types';
import { formatTurnClock } from './overview-clock';
import {
  OUTCOME_ANSWERED,
  OUTCOME_DONE_GIT_AGREES,
  OUTCOME_DONE_NO_RECORD,
  OUTCOME_DONE_OUTSIDE,
  OUTCOME_NO_ANSWER,
  OUTCOME_NO_STORE,
  OUTCOME_REMOTE,
  OUTCOME_SHELL,
  OUTCOME_STILL_WORKING,
  OUTCOME_STOPPED,
  OUTCOME_WAITING,
  OUTCOME_WRONG_CONVERSATION,
  outcomeNothingAsked,
  outcomeUnreadable
} from './overview-copy';

export interface ProjectLine {
  ask: string | null;
  outcome: string;
}

/** The longest ask the line carries before the clip. */
const FIRST_CLAUSE_MAX = 72;

/**
 * The text up to the first sentence end or newline, then clipped at a word
 * boundary with an ellipsis when the clause is still too long.
 */
export function firstClause(text: string): string {
  const flat = text.trim();
  let end = flat.length;
  for (const stop of ['. ', '? ', '! ', '\n']) {
    const at = flat.indexOf(stop);
    if (at !== -1 && at < end) end = at;
  }
  const clause = flat.slice(0, end).trim();
  if (clause.length <= FIRST_CLAUSE_MAX) return clause;
  const cut = clause.slice(0, FIRST_CLAUSE_MAX);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * The honest sentence for a session the reader could not give turns for.
 * The columns and the conversation views draw the same sentence, so the
 * mapping lives once.
 */
export function honestLineFor(
  session: OverviewSessionView,
  nowMs: number
): string {
  switch (session.line) {
    case 'shell':
      return OUTCOME_SHELL;
    case 'no-store':
      return OUTCOME_NO_STORE;
    case 'unreadable':
      return outcomeUnreadable(session.lineDetail);
    case 'wrong-conversation':
      return OUTCOME_WRONG_CONVERSATION;
    case 'remote':
      return OUTCOME_REMOTE;
    case 'no-turns':
    case 'turns':
      return outcomeNothingAsked(
        formatTurnClock(session.startedAt, nowMs) ?? ''
      );
  }
}

/**
 * True when the honest sentence carries a clock time. The views wrap that
 * sentence in a data-clock span then, so the probe can prove every digit on
 * the page is a clock, a date or an age.
 */
export function honestLineHasClock(session: OverviewSessionView): boolean {
  return (
    session.line === 'no-turns' ||
    (session.line === 'turns' && session.turns.length === 0)
  );
}

/**
 * The whole line, as `you asked "<ask>". <outcome>` when the session has
 * turns and as the outcome alone otherwise. The table is section 10.3 of the
 * Phase 137 build spec.
 */
export function buildProjectLine(
  session: OverviewSessionView,
  status: SessionStatus,
  nowMs: number
): ProjectLine {
  const latest = session.turns[session.turns.length - 1];
  if (session.line !== 'turns' || latest === undefined) {
    return { ask: null, outcome: honestLineFor(session, nowMs) };
  }
  const ask = firstClause(latest.askText);
  if (latest.closed && latest.answerText !== null) {
    if (latest.git === 'agrees') {
      return { ask, outcome: OUTCOME_DONE_GIT_AGREES };
    }
    if (latest.git === 'no-record') {
      return { ask, outcome: OUTCOME_DONE_NO_RECORD };
    }
    return {
      ask,
      outcome: latest.namedOnlyOutside ? OUTCOME_DONE_OUTSIDE : OUTCOME_ANSWERED
    };
  }
  if (!latest.closed && !latest.interrupted && status === 'running') {
    return { ask, outcome: OUTCOME_STILL_WORKING };
  }
  if (latest.interrupted) {
    return { ask, outcome: OUTCOME_STOPPED };
  }
  // PHASE 311. The still working arm above asks for `running`, so a session
  // that is waiting on the person fell through to OUTCOME_NO_ANSWER, which
  // says the agent's answer is not in the record. That is false of a session
  // whose agent is standing at a question: the answer is not in the record
  // because the agent has not been allowed to write one yet.
  //
  // The arm is LAST, immediately before the fallback, so it moves exactly the
  // rows that read wrong and nothing else. A row whose newest turn closed with
  // an answer still says what it said, and an interrupted turn still says it
  // was stopped, because both of those are true of the record.
  if (status === 'needs_input') {
    return { ask, outcome: OUTCOME_WAITING };
  }
  return { ask, outcome: OUTCOME_NO_ANSWER };
}

/**
 * The line the project view draws (Phase 138).
 *
 * The written sentence when a model wrote one, and Phase 137's built line
 * when a model did not. The written sentence replaces the WHOLE line, lead
 * and all, because the model writes exactly one thing. So there is no
 * `you asked "…"` in front of a written sentence and no quotes around any
 * part of one.
 *
 * `buildProjectLine` above is untouched, which is what makes the fallback
 * provably identical to what Phase 137 shipped. With no harness chosen the
 * summary field is null for every session and this function is that function.
 *
 * `summary` is filled ONLY on the overview:project payload. The one session
 * view and the multiplexed view read overview:sessions, where the field is
 * null, so those two stay verbatim whether a model is chosen or not.
 */
export function projectLineFor(
  session: OverviewSessionView,
  status: SessionStatus,
  nowMs: number
): ProjectLine {
  const written = session.summary;
  if (written !== null && written !== '') return { ask: null, outcome: written };
  return buildProjectLine(session, status, nowMs);
}
