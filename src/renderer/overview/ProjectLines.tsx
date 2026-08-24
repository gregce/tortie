/**
 * The whole project, one line per session (Phase 137).
 *
 * The left of a line is the session's name with its state and age. The
 * right is one sentence about that session.
 *
 * Phase 137 built that sentence, being your ask leading and the outcome
 * following without a pronoun, where the outcome comes from git and the path
 * index through ./line.ts. Phase 138 lets a small model write the sentence
 * instead, when a person has picked a harness under Settings then Project
 * line. The built sentence is what is drawn whenever no model wrote one, so
 * this view is complete with no model at all.
 *
 * THIS IS THE ONLY VIEW A MODEL WRITES ANYTHING ON. The one session view and
 * the multiplexed view are re-read from the store and stay verbatim.
 *
 * Phase 138.1 added the quiet clock at the end of a written sentence. The
 * operator turned the fold on and could not tell whether anything had
 * happened, because a fold is silent by design and reading his database was
 * the only way to find out. A line a model wrote now says when the model
 * wrote it. A line Tortie built says nothing, because a built line is the
 * default and silence is right for a default.
 */

import React, { useEffect, useRef } from 'react';
import type { OverviewProject } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { statusVisual } from '../app/status';
import { formatAge } from '../format';
import { AgentIcon } from '../icons';
import { formatTurnClock } from './clock';
import { honestLineHasClock, projectLineFor } from './line';
import { EMPTY_PROJECT, WRITTEN_LEAD, YOU_ASKED_LEAD } from './copy';

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
        // Phase 138. The written sentence when a model wrote one for this
        // session, and Phase 137's built line when a model did not. Nothing
        // else on this view changes, and no other view reads the field.
        const line = projectLineFor(session, status, now);
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
              {/* Phase 137.2. The agent's mark beside the name, through the
                  same component the session rail draws. A shell row draws NO
                  icon element at all. The guard is explicit because
                  AgentIcon's fallback for 'shell' is a terminal glyph, and a
                  placeholder is refused here. A name is the person's own
                  words, so its digits are accounted for as quoted text
                  rather than as a count. */}
              <div className="overview-line-name">
                {session.agent !== 'shell' ? (
                  <AgentIcon agent={session.agent} size={16} />
                ) : null}
                <span className="overview-line-name-text" data-quoted>
                  {session.name}
                </span>
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
                data-clock={
                  // Phase 138. A written sentence carries no clock, so the
                  // attribute is only for the built line.
                  session.summary === null && honestLineHasClock(session)
                    ? true
                    : undefined
                }
              >
                {line.outcome}
              </span>
              {/* Phase 138.1. The clock beside a sentence a MODEL wrote, and
                  nothing at all beside a line Tortie built. `summary` and
                  `summaryWrittenAt` are filled by one function in main, so
                  this can never draw a clock on a built line. The clock
                  carries its date when the day differs, and its digits sit
                  inside data-clock, which is what the integer rule allows. */}
              {session.summaryWrittenAt !== null ? (
                <span className="overview-line-written">
                  {' '}
                  {WRITTEN_LEAD}
                  <span data-clock>
                    {formatTurnClock(session.summaryWrittenAt, now)}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
