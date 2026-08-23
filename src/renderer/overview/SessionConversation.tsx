/**
 * One session's conversation, full width (Phase 137).
 *
 * The header names the session, then its state and age in the product's own
 * status words. Under it the last turns are listed newest last, each as
 * "you" then "the agent" with the time, and the git mark quiet at the right
 * edge of the answer. The view scrolls to the end on open, because the
 * newest turn is the one the person came for.
 */

import React, { useEffect, useRef } from 'react';
import type { OverviewSessionView } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { statusVisual } from '../app/status';
import { formatAge } from '../format';
import { honestLineFor, honestLineHasClock } from './line';
import { NO_CLOCK_NOTE } from './copy';
import { TurnBlock } from './TurnBlock';

export interface SessionConversationProps {
  session: OverviewSessionView;
  status: SessionStatus;
  selected: number;
  onSelect(i: number): void;
  onActivate(): void;
  now: number;
}

/** True when the header owes the reader a word about the missing clocks. */
function noClocks(session: OverviewSessionView): boolean {
  if (session.noTurnClock) return true;
  return (
    session.turns.length > 0 && session.turns.every((t) => t.askAt === null)
  );
}

export function SessionConversation(
  props: SessionConversationProps
): React.JSX.Element {
  // onActivate stays on the props contract for the layer's Return key. The
  // rows themselves only select, so a click can never tear the page down by
  // accident, and the layer is the one caller of the jump.
  const { session, status, selected, onSelect, now } = props;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // The end is where the newest turn is, so the view opens there.
  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [session.sessionId, session.turns.length]);

  const title = [
    session.name,
    session.model ?? '',
    session.branch !== null ? `@${session.branch}` : ''
  ]
    .filter((part) => part !== '')
    .join(' · ');
  const sub = [
    statusVisual(status).label,
    formatAge(session.lastTouchedAt ?? session.startedAt, now)
  ];

  return (
    <div className="overview-session">
      <div className="overview-session-head">
        {/* The name, the model and the branch are outside words, so their
            digits are accounted for as quoted text. */}
        <div className="overview-session-title" data-quoted>
          {title}
        </div>
        <div className="overview-session-sub">
          {sub[0]}
          {' · '}
          <span data-age>{sub[1]}</span>
          {noClocks(session) ? ` · ${NO_CLOCK_NOTE}` : ''}
        </div>
      </div>
      <div className="overview-scroll" ref={scrollRef}>
        {session.line !== 'turns' || session.turns.length === 0 ? (
          <div
            className="overview-honest"
            data-clock={honestLineHasClock(session) ? true : undefined}
          >
            {honestLineFor(session, now)}
          </div>
        ) : (
          session.turns.map((turn, i) => (
            <TurnBlock
              key={turn.index}
              turn={turn}
              status={status}
              now={now}
              selected={i === selected}
              onSelect={() => {
                onSelect(i);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
