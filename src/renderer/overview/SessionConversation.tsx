/**
 * One session's conversation, full width (Phase 137).
 *
 * The header names the session, then its state and age in the product's own
 * status words. Under it the last turns are listed newest last, each as
 * "you" then "the agent" with the time, and the git mark quiet at the right
 * edge of the answer. The view scrolls to the end on open, because the
 * newest turn is the one the person came for.
 *
 * Phase 143. The sub line carries one press target that swaps the body for
 * the story of what a model wrote about this session. The header itself never
 * moves, so the name of the session being read stays on screen either way,
 * and the conversation comes back with its selection untouched.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore
} from 'react';
import type { OverviewSessionView } from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { statusVisual } from '../app/status';
import { formatAge } from '../format';
import { AgentIcon } from '../icons';
import { honestLineFor, honestLineHasClock } from './line';
import { NO_CLOCK_NOTE, STORY_CLOSE, STORY_OPEN } from './copy';
import { AskRail } from './AskRail';
import { registerConversation, scrollTurnIntoView } from './session-keys';
import { SessionStory } from './SessionStory';
import {
  closeStory,
  noteStorySession,
  storySnapshot,
  subscribeStory,
  toggleStory
} from './story';
import { TurnBlock } from './TurnBlock';
import './story.css';

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
  const hasTurns = session.line === 'turns' && session.turns.length > 0;

  // Phase 143. The story's own store, which is module scope and separate from
  // the page's slice. The third reader is the same one, so the panel renders
  // the same way on both sides of a render.
  const story = useSyncExternalStore(
    subscribeStory,
    storySnapshot,
    storySnapshot
  );
  const storyOpen = story.open && story.sessionId === session.sessionId;

  // A different session clears the story, because a story belongs to exactly
  // one session and a cursor must never outlive the rows it was counting.
  // Leaving the page clears it too, so reopening the page always lands on the
  // conversation rather than on a list read some time ago.
  useEffect(() => {
    noteStorySession(session.sessionId);
    return () => {
      closeStory();
    };
  }, [session.sessionId]);

  // The rail and the layer's key seam read the mounted conversation through
  // this registration (Phase 137.2). The refs keep the hooks current without
  // re-registering on every selection change.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    registerConversation({
      scroller: scrollRef.current,
      turnCount: hasTurns && !storyOpen ? session.turns.length : 0,
      selected: () => selectedRef.current,
      select: (i) => {
        onSelectRef.current(i);
      }
    });
    return () => {
      registerConversation(null);
    };
  }, [session.sessionId, session.turns.length, hasTurns, storyOpen]);

  // The end is where the newest turn is, so the view opens there.
  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [session.sessionId, session.turns.length]);

  // The arrows track (Phase 137.2). When the selection moves, the newly
  // selected exchange is put on screen before the selection paint lands.
  // This is the same landing function jumpToAsk uses, so the keyboard, a
  // rail press and the rail's Return cannot drift apart. No scroll or wheel
  // listener writes the selection back, so plain scrolling moves nothing.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el !== null) scrollTurnIntoView(el, selected);
  }, [selected]);

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
          {/* The agent's mark, the same component the session rail draws.
              A shell session draws no icon at all, because AgentIcon's
              fallback for a shell is a terminal glyph and a placeholder is
              refused here. */}
          {session.agent !== 'shell' ? (
            <AgentIcon agent={session.agent} size={16} />
          ) : null}
          {title}
        </div>
        <div className="overview-session-sub">
          {sub[0]}
          {' · '}
          <span data-age>{sub[1]}</span>
          {noClocks(session) ? ` · ${NO_CLOCK_NOTE}` : ''}
          {' · '}
          {/* Phase 143. A real button, so the keyboard reaches it, and no
              icon, because the sub line is words. */}
          <button
            type="button"
            className="overview-story-toggle"
            onClick={() => {
              toggleStory(session.sessionId);
            }}
          >
            {storyOpen ? STORY_CLOSE : STORY_OPEN}
          </button>
        </div>
      </div>
      <div className="overview-session-body">
        {/* Phase 143. The story stands in for the whole body, being the
            scroller and the rail together, and the header above is
            untouched. */}
        {storyOpen ? (
          <SessionStory state={story} status={status} now={now} />
        ) : (
          <>
            <div className="overview-scroll" ref={scrollRef}>
              {!hasTurns ? (
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
            {/* The rail (Phase 137.2). Session level only, and only when
                there are exchanges to list. An honest line session has no
                asks, and a rail with nothing in it would be furniture. */}
            {hasTurns ? (
              <AskRail session={session} selected={selected} now={now} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
