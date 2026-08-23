/**
 * The ask rail (Phase 137.2). One row per exchange, your words leading.
 *
 * Every row is the ask's first words, verbatim and clipped by the
 * stylesheet, with its clock time at the right. Nothing here renders
 * markdown, summarises, or rewrites. The row whose exchange is selected
 * carries a quiet left edge tick, and while the keyboard is in the rail the
 * cursor row carries the row highlight.
 *
 * The rail reads the SAME turns the conversation already holds and the SAME
 * selection the arrows move, so the two surfaces agree by construction.
 * Hover follows ProjectRail.tsx's rules. Nothing here calls focus(), no row
 * is focusable, and hovering the rail never takes the keyboard from the
 * conversation.
 */

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import type { OverviewSessionView } from '@shared/overview';
import { formatTurnClock } from './clock';
import { jumpToAsk, railSnapshot, subscribeRail } from './session-keys';
import './ask-rail.css';

export interface AskRailProps {
  session: OverviewSessionView;
  /** The selected exchange, the same index the conversation highlights. */
  selected: number;
  now: number;
}

export function AskRail(props: AskRailProps): React.JSX.Element {
  const { session, selected, now } = props;
  const rail = useSyncExternalStore(subscribeRail, railSnapshot);
  const listRef = useRef<HTMLDivElement | null>(null);

  // The rail scrolls itself so the row the person is on stays visible. The
  // cursor row leads while the keyboard is in the rail, the marked row
  // otherwise, and the conversation's own scroller is never touched here.
  useEffect(() => {
    const follow = rail.active ? rail.cursor : selected;
    listRef.current
      ?.querySelectorAll('.overview-ask-rail-row')
      [follow]?.scrollIntoView({ block: 'nearest' });
  }, [selected, rail]);

  return (
    <div
      className={`overview-ask-rail${rail.active ? ' active' : ''}`}
      ref={listRef}
    >
      {session.turns.map((turn, i) => {
        const clock = formatTurnClock(turn.askAt, now);
        const marks = [
          i === selected ? ' current' : '',
          rail.active && i === rail.cursor ? ' cursor' : ''
        ].join('');
        return (
          <div
            key={turn.index}
            className={`overview-ask-rail-row${marks}`}
            onClick={() => {
              jumpToAsk(i);
            }}
          >
            <span className="overview-ask-rail-ask" data-quoted>
              {turn.askText}
            </span>
            {clock !== null ? (
              <span className="overview-ask-rail-clock" data-clock>
                {clock}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
