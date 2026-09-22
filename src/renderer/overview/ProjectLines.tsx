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
 *
 * Phase 147 put the story here, because the story is the version history of
 * the very sentence this view draws, and this view is the only one a model
 * writes on. Every row carries the press target, since a session whose line
 * was never written still answers with one honest line rather than nothing,
 * and pressing it opens the panel in place under that row. One panel is open
 * at a time, which is the store's own rule.
 */

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import type { OverviewProject } from '@shared/overview';
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import type { SessionStatus } from '@shared/types';
// PHASE 312. The one block every Catch Me Up level draws for a session sitting
// at a numbered choice.
import { ChoiceBlock } from './ChoiceBlock';
// PHASES 311 AND 312, RECONCILED. The ONE spelling of "is this session at a
// numbered choice", asked here so this row and the block below it never draw the
// same sentence twice. It is the helper's own invitation — "the same condition,
// asked as a question instead of as a list" — and not a second copy of it.
import { atNumberedChoice } from '../choice';
import { statusVisual } from '../app/status';
import { formatAge } from '../format';
import { AgentIcon } from '../icons';
import { formatTurnClock } from './clock';
import { honestLineHasClock, projectLineFor } from './line';
import {
  EMPTY_PROJECT,
  STORY_WORD,
  WRITTEN_LEAD,
  YOU_ASKED_LEAD
} from './copy';
import { SessionStory } from './SessionStory';
import {
  closeStory,
  storySnapshot,
  subscribeStory,
  toggleStory
} from './story';
import './story.css';

export interface ProjectLinesProps {
  project: OverviewProject;
  statuses: Record<string, SessionStatus>;
  /**
   * Phase 311. What the agent in each session is asking, keyed by session id,
   * from the activity channel. It is drawn UNDER the line of a waiting row and
   * nowhere else, and a row main has no question for draws exactly what it drew
   * before this phase. It is the agent's own words, so it is quoted text for
   * the integer rule the same way a session's name is.
   */
  questions?: Record<string, string>;
  selected: number;
  onSelect(i: number): void;
  onActivate(sessionId: string): void;
  now: number;
  /**
   * PHASE 312. The option rows the agent drew, for the sessions at a numbered
   * choice, keyed by session id.
   *
   * A PROP rather than a store read, which is the rule this view already
   * follows for the statuses beside it: everything this view draws arrives as a
   * prop, so the markup a test reads in node is the markup a person sees. It is
   * optional so a caller that has nothing to say draws exactly what it drew
   * before this phase.
   */
  choices?: Record<string, SessionChoiceInfo>;
}

export function ProjectLines(props: ProjectLinesProps): React.JSX.Element {
  const { project, statuses, selected, onSelect, onActivate, now } = props;
  const choices = props.choices ?? {};
  const questions = props.questions ?? {};
  const listRef = useRef<HTMLDivElement | null>(null);

  // Phase 147. The story's own store, module scope and separate from the
  // page's slice. It is read here because this is now the view the panel
  // opens from, and the layer reads the same one for the footer.
  const story = useSyncExternalStore(
    subscribeStory,
    storySnapshot,
    storySnapshot
  );

  // Leaving the view closes the panel, so reopening the page always lands on
  // the rows rather than on a list read some time ago. And a panel must never
  // outlive its session: when the open session leaves the payload, the panel
  // goes with it.
  useEffect(() => {
    return () => {
      closeStory();
    };
  }, []);
  useEffect(() => {
    if (!story.open || story.sessionId === null) return;
    const there = project.sessions.some(
      (s) => s.sessionId === story.sessionId
    );
    if (!there) closeStory();
  }, [story.open, story.sessionId, project.sessions]);

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
        // Phase 147. Whether THIS row's story is open under it. The control
        // and everything that announces it read this one condition, so no
        // surface can say the panel is open when it is not.
        const storyOpen = story.open && story.sessionId === session.sessionId;
        return (
          <React.Fragment key={session.sessionId}>
            <div
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
                {/* Phase 311. What is being asked, under the line, on a row
                    that is waiting on the person and only there. The sentence
                    above says the row is waiting; this says what for, in the
                    agent's own words, which main redacted and clipped before it
                    sent them. Quoted text, because it is somebody's words
                    rather than anything this page composed, which is what
                    accounts for its digits under the integer rule. */}
                {/* PHASES 311 AND 312, RECONCILED. The block below draws the
                    same sentence as the SUBJECT of the rows it carries, and a
                    row that drew both said one thing twice — the one visible
                    collision the two phases had. The question is drawn ONCE:
                    here when there are no rows under it (a hook fires for tool
                    calls that draw no numbered choice at all, which is every
                    reason this cell exists), and by the block when there are,
                    where it belongs above the options it is the subject of. */}
                {status === 'needs_input' &&
                (questions[session.sessionId] ?? '') !== '' &&
                !atNumberedChoice(choices[session.sessionId]) ? (
                  // The fix round added the `title`. This line is about 1,109px
                  // at the shipped width, which draws roughly 155 of the 200
                  // characters main will send, and the tail is then the only
                  // place the rest of the sentence exists — the same repair the
                  // ⌘J row's own label got, for the same measured reason.
                  <div
                    className="overview-line-question"
                    data-quoted
                    title={questions[session.sessionId]}
                  >
                    {questions[session.sessionId]}
                  </div>
                ) : null}
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
                {/* PHASE 312. The choices the agent drew, and the question they
                    answer. ONE BLOCK, drawn the same way at all three Catch Me
                    Up levels — its refusals, and why they are in a component of
                    their own rather than in three copies of this JSX, are in
                    ChoiceBlock.tsx. */}
                <ChoiceBlock
                  choice={choices[session.sessionId]}
                  question={questions[session.sessionId]}
                />
              </div>
              {/* Phase 147. The story's press target, a real button so the
                  keyboard reaches it. It is its own cell at the far right of
                  the row, never inline with the sentence, so it sits at the
                  same x position on every row whatever the line's length
                  (his refinement of 2026-08-24). Every row carries one,
                  because a row with no written line still answers with one
                  honest line. The word is constant; aria-expanded carries the
                  open state from the same storyOpen that mounts the panel.
                  Its clicks and its keys stay its own: a press here must not
                  also open the session the row underneath would open, and
                  the keydown must not reach the layer's own Return. */}
              <button
                type="button"
                className="overview-story-toggle"
                data-session-name={session.name}
                aria-expanded={storyOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStory(session.sessionId);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              >
                {STORY_WORD}
              </button>
            </div>
            {/* Phase 147. The panel, in place under its row. It is a sibling
                of the row rather than a child, so a press on a story row can
                never bubble into the row's own jump to the session. */}
            {storyOpen ? (
              <div className="overview-line-story">
                <SessionStory state={story} status={status} now={now} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
