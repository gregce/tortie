/**
 * The project view's one line per session (Phase 137). Pure.
 *
 * The line is BUILT, never written by a model. The ask is the person's own
 * words clipped to their first clause, and the outcome is decided from git
 * and the path index. "the agent" appears only where the line reports a
 * claim rather than a fact, which is the one outcome where the agent said
 * done and git has no record of it.
 */

import type { OverviewSessionView } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { formatTurnClock } from './clock';
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
  OUTCOME_WRONG_CONVERSATION,
  outcomeNothingAsked,
  outcomeUnreadable
} from './copy';

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
