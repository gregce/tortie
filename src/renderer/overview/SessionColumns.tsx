/**
 * Several sessions side by side (Phase 137).
 *
 * One column per session, equal width. The label sits on its own two lines
 * rather than eating the column, then the latest exchange, clipped to the
 * column with a quiet fade at the bottom. A session the reader could not
 * give turns for draws its one honest line instead.
 */

import React from 'react';
import type { OverviewSessionView } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { statusVisual } from '../app/status';
import { formatAge } from '../format';
import { honestLineFor, honestLineHasClock } from './line';
import { TurnBlock } from './TurnBlock';

export interface SessionColumnsProps {
  sessions: OverviewSessionView[];
  statuses: Record<string, SessionStatus>;
  now: number;
}

function Column(props: {
  session: OverviewSessionView;
  status: SessionStatus;
  now: number;
}): React.JSX.Element {
  const { session, status, now } = props;
  const latest = session.turns[session.turns.length - 1];
  return (
    <div className="overview-column">
      {/* A name is the person's own words, so its digits are accounted
          for as quoted text rather than as a count. */}
      <div className="overview-column-name" data-quoted>
        {session.name}
      </div>
      <div className="overview-column-state">
        {statusVisual(status).label}
        {' · '}
        <span data-age>
          {formatAge(session.lastTouchedAt ?? session.startedAt, now)}
        </span>
      </div>
      <div className="overview-column-body">
        {session.line !== 'turns' || latest === undefined ? (
          <div
            className="overview-honest"
            data-clock={honestLineHasClock(session) ? true : undefined}
          >
            {honestLineFor(session, now)}
          </div>
        ) : (
          <TurnBlock turn={latest} status={status} now={now} />
        )}
      </div>
    </div>
  );
}

export function SessionColumns(props: SessionColumnsProps): React.JSX.Element {
  const { sessions, statuses, now } = props;
  return (
    <div className="overview-columns">
      {sessions.map((session) => (
        <Column
          key={session.sessionId}
          session={session}
          status={statuses[session.sessionId] ?? 'idle'}
          now={now}
        />
      ))}
    </div>
  );
}
