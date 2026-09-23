/**
 * One turn of the conversation (Phase 137). Shared by the session view and
 * the columns view.
 *
 * At most four parts. The clock, the label "you" with the ask, the label
 * "the agent" with the answer or the honest sentence for its absence, and
 * the git mark quiet at the right edge. The quoted text is wrapped in
 * data-quoted and the clock in data-clock, which is what the probe reads to
 * prove the page draws no other digit.
 *
 * Phase 137.1: the ANSWER renders as markdown through AnswerBody, because
 * agents answer in markdown and drawing it plain turned lists and fences
 * into punctuation. The ASK stays plain text on purpose — the person types
 * prose, and rendering a person's words would change what they wrote.
 */

import React from 'react';
import type { OverviewGitMark, OverviewTurnView } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { formatTurnClock } from '@shared/overview-clock';
import {
  AGENT_LABEL,
  MARK_AGREES,
  MARK_NOTHING_TO_CHECK,
  MARK_NO_RECORD,
  REST_NOT_SHOWN,
  YOU_LABEL,
  answerAbsence,
  sessionStoppedNotice
} from '@shared/overview-copy';
import { AnswerBody } from './AnswerBody';

export interface TurnBlockProps {
  turn: OverviewTurnView;
  status: SessionStatus;
  now: number;
  selected?: boolean;
  onSelect?: () => void;
}

// The sentence for a turn with no answer on record is `answerAbsence` in
// src/shared/overview-copy.ts (moved there in Phase 316), because the phone's
// door answers the same sentence from main and the two must be one rule.

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
      {/* Phase 148. The you section carries the accent wash and a soft glow,
          because that is where the eyes naturally go. Both values are the
          §1.2 accent tokens, so a future accent choice recolors this without
          touching this file. The agent's answer below stays as it is. */}
      <div className="overview-you">
        <div className="overview-label">{YOU_LABEL}</div>
        <div className="overview-ask">
          <span data-quoted>{turn.askText}</span>
          {turn.askClipped ? (
            <div className="overview-clip-note">{REST_NOT_SHOWN}</div>
          ) : null}
        </div>
      </div>
      <div className="overview-label">{AGENT_LABEL}</div>
      {turn.answerText !== null ? (
        <div className="overview-answer">
          <AnswerBody text={turn.answerText} />
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
