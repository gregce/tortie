/**
 * One turn of the conversation (Phase 137). Shared by the session view and
 * the columns view.
 *
 * At most four parts. The clock, the label "you" with the ask, the label
 * "the agent" with the answer or the honest sentence for its absence, and
 * the git mark quiet at the right edge. The quoted text is wrapped in
 * data-quoted and the clock in data-clock, which is what the probe reads to
 * prove the page draws no other digit.
 */

import React from 'react';
import type { OverviewGitMark, OverviewTurnView } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { formatTurnClock } from './clock';
import {
  AGENT_LABEL,
  ANSWER_NOT_IN_RECORD,
  MARK_AGREES,
  MARK_NOTHING_TO_CHECK,
  MARK_NO_RECORD,
  NOT_ANSWERED_YET,
  REST_NOT_SHOWN,
  STOPPED_BEFORE_ANSWER,
  YOU_LABEL,
  sessionStoppedNotice
} from './copy';

export interface TurnBlockProps {
  turn: OverviewTurnView;
  status: SessionStatus;
  now: number;
  selected?: boolean;
  onSelect?: () => void;
}

/** The sentence for a turn with no answer on record. */
function answerAbsence(turn: OverviewTurnView, status: SessionStatus): string {
  if (!turn.closed && (status === 'running' || status === 'needs_input')) {
    return NOT_ANSWERED_YET;
  }
  if (turn.interrupted) return STOPPED_BEFORE_ANSWER;
  return ANSWER_NOT_IN_RECORD;
}

function markText(mark: OverviewGitMark): string {
  if (mark === 'agrees') return MARK_AGREES;
  if (mark === 'no-record') return MARK_NO_RECORD;
  return MARK_NOTHING_TO_CHECK;
}

export function TurnBlock(props: TurnBlockProps): React.JSX.Element {
  const { turn, status, now, selected, onSelect } = props;
  const clock = formatTurnClock(turn.askAt, now);
  return (
    <div
      className={`overview-turn${selected === true ? ' selected' : ''}`}
      data-turn={turn.index}
      onClick={onSelect}
    >
      {clock !== null ? (
        <div className="overview-turn-clock">
          <span data-clock>{clock}</span>
        </div>
      ) : null}
      <div className="overview-label">{YOU_LABEL}</div>
      <div className="overview-ask">
        <span data-quoted>{turn.askText}</span>
        {turn.askClipped ? (
          <div className="overview-clip-note">{REST_NOT_SHOWN}</div>
        ) : null}
      </div>
      <div className="overview-label">{AGENT_LABEL}</div>
      {turn.answerText !== null ? (
        <div className="overview-answer">
          <span data-quoted>{turn.answerText}</span>
          {turn.answerClipped ? (
            <div className="overview-clip-note">{REST_NOT_SHOWN}</div>
          ) : null}
        </div>
      ) : (
        <div className="overview-answer overview-answer-absent">
          {answerAbsence(turn, status)}
        </div>
      )}
      {turn.notice !== null ? (
        <div className="overview-notice" data-quoted>
          {sessionStoppedNotice(turn.notice)}
        </div>
      ) : null}
      <div className="overview-mark" data-mark={turn.git}>
        {markText(turn.git)}
      </div>
    </div>
  );
}
