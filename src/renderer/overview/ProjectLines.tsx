/**
 * The whole project, one line per session (Phase 137).
 *
 * The left of a line is the session's name with its state and age. The
 * right is the built sentence, your ask leading and the outcome following
 * without a pronoun. No model writes any of it. The outcome comes from git
 * and the path index through ./line.ts, and "the agent" appears only where
 * the line reports a claim rather than a fact.
 */

import React, { useEffect, useRef } from 'react';
import type { OverviewProject } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { statusVisual } from '../app/status';
import { formatAge } from '../format';
import { buildProjectLine, honestLineHasClock } from './line';
import { EMPTY_PROJECT, YOU_ASKED_LEAD } from './copy';

export interface ProjectLinesProps {
  project: OverviewProject;
  statuses: Record<string, SessionStatus>;
  selected: number;
  onSelect(i: number): void;
  onActivate(sessionId: string): void;
  now: number;
}

export function ProjectLines(props: ProjectLinesProps): React.JSX.Element {
  const { project, statuses, selected, onSelect, onActivate, now } = props;
  const listRef = useRef<HTMLDivElement | null>(null);

  // The arrows move the selection, so the selection stays on screen.
  useEffect(() => {
    listRef.current
      ?.querySelector('.overview-line.selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (project.sessions.length === 0) {
    return <div className="overview-empty">{EMPTY_PROJECT}</div>;
  }

  return (
    <div className="overview-lines" ref={listRef}>
      {project.sessions.map((session, i) => {
        const status = statuses[session.sessionId] ?? 'idle';
        const line = buildProjectLine(session, status, now);
        return (
          <div
            key={session.sessionId}
            className={`overview-line${i === selected ? ' selected' : ''}`}
            onClick={() => {
              onSelect(i);
              onActivate(session.sessionId);
            }}
          >
            <div className="overview-line-left">
              {/* A name is the person's own words, so its digits are
                  accounted for as quoted text rather than as a count. */}
              <div className="overview-line-name" data-quoted>
                {session.name}
              </div>
              <div className="overview-line-state">
                {statusVisual(status).label}
                {' · '}
                <span data-age>
                  {formatAge(
                    session.lastTouchedAt ?? session.startedAt,
                    now
                  )}
                </span>
              </div>
            </div>
            <div className="overview-line-right">
              {line.ask !== null ? (
                <>
                  <span className="overview-line-lead">{YOU_ASKED_LEAD}</span>
                  {'“'}
                  <span data-quoted>{line.ask}</span>
                  {'”. '}
                </>
              ) : null}
              {/* A no-turns outcome carries its started clock, so the span
                  says so and the probe can account for the digits. */}
              <span
                className="overview-line-outcome"
                data-clock={honestLineHasClock(session) ? true : undefined}
              >
                {line.outcome}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
