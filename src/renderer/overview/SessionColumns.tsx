/**
 * Several sessions side by side (Phase 137, scrolling since Phase 137.2).
 *
 * One column per session, equal width. The label sits on its own two lines
 * rather than eating the column, then the session's whole conversation,
 * newest last, in the column's own scroller. Each column opens scrolled to
 * its end the way the one session view opens, and each scrolls on its own,
 * so moving one column never moves its neighbour. A session the reader
 * could not give turns for draws its one honest line instead.
 *
 * The keyboard reaches the columns through the layer. ArrowLeft and
 * ArrowRight move focus between columns, ArrowUp and ArrowDown scroll the
 * focused column by a fixed step, and the focused column wears a quiet
 * token colored edge. The focus lives in this component's own React state.
 * The layer calls handleColumnsLevelKey below, which hands the press to the
 * mounted component, so the slice gains no field for any of this.
 */

import React, { useEffect, useRef, useState } from 'react';
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

/** The structural shape of the press the layer hands over. */
interface ColumnsKeyEvent {
  key: string;
  preventDefault(): void;
  stopPropagation(): void;
}

/** How far one ArrowUp or ArrowDown moves the focused column, in pixels. */
const SCROLL_STEP = 96;

/**
 * The mounted component's own handler, or null while no columns are on
 * screen. The layer cannot hold a ref into a component another branch of
 * its render owns, so the component registers itself here on mount.
 */
let mounted: ((e: ColumnsKeyEvent) => boolean) | null = null;

/**
 * Called by OverviewLayer's onKeyDown at the 'several' level, before its
 * generic branches. True means the press was consumed here.
 */
export function handleColumnsLevelKey(e: ColumnsKeyEvent): boolean {
  return mounted === null ? false : mounted(e);
}

function Column(props: {
  session: OverviewSessionView;
  status: SessionStatus;
  now: number;
  focused: boolean;
  bodyRef: (el: HTMLDivElement | null) => void;
  onOwnScroll: () => void;
}): React.JSX.Element {
  const { session, status, now, focused, bodyRef, onOwnScroll } = props;
  return (
    <div className={`overview-column${focused ? ' focused' : ''}`}>
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
      <div
        className="overview-column-body"
        ref={bodyRef}
        onWheel={onOwnScroll}
        onMouseDown={onOwnScroll}
      >
        {session.line !== 'turns' || session.turns.length === 0 ? (
          <div
            className="overview-honest"
            data-clock={honestLineHasClock(session) ? true : undefined}
          >
            {honestLineFor(session, now)}
          </div>
        ) : (
          session.turns.map((turn) => (
            <TurnBlock key={turn.index} turn={turn} status={status} now={now} />
          ))
        )}
      </div>
    </div>
  );
}

export function SessionColumns(props: SessionColumnsProps): React.JSX.Element {
  const { sessions, statuses, now } = props;
  const [focused, setFocused] = useState(0);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const countRef = useRef(sessions.length);
  countRef.current = sessions.length;

  // The identity of the drawn conversations. When it changes, each column
  // opens at its end again, because the newest turn is what you came for.
  const drawnKey = sessions
    .map((s) => `${s.sessionId}:${String(s.turns.length)}`)
    .join(' ');

  // A column stays PINNED to its end until you scroll it yourself. The pin
  // exists because an answer's markdown renders through a lazily loaded
  // chunk, so the turns grow taller a moment after the first paint, and a
  // column that scrolled to its end once would then sit a little above the
  // newest turn. The observer below re-lands a pinned column when its turns
  // change size, and the first wheel, press of the scrollbar, or arrow
  // scroll of that column takes the pin off.
  const pinned = useRef<boolean[]>([]);

  useEffect(() => {
    pinned.current = sessions.map(() => true);
    for (const el of bodies.current) {
      if (el !== null && el !== undefined) el.scrollTop = el.scrollHeight;
    }
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      bodies.current.forEach((el, i) => {
        if (el !== null && el !== undefined && pinned.current[i] === true) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
    for (const el of bodies.current) {
      if (el === null || el === undefined) continue;
      for (const child of Array.from(el.children)) observer.observe(child);
    }
    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnKey]);

  // The layer's key delegation. Registered on mount, gone on unmount, so a
  // press can never reach a component that is no longer on screen.
  useEffect(() => {
    mounted = (e: ColumnsKeyEvent): boolean => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        setFocused((i) =>
          Math.min(countRef.current - 1, Math.max(0, i + delta))
        );
        return true;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const at = focusedRef.current;
        const el = bodies.current[at];
        if (el !== null && el !== undefined) {
          pinned.current[at] = false;
          el.scrollTop += e.key === 'ArrowDown' ? SCROLL_STEP : -SCROLL_STEP;
        }
        return true;
      }
      return false;
    };
    return () => {
      mounted = null;
    };
  }, []);

  // Fewer columns than the focus index means the focus walks back in.
  useEffect(() => {
    if (focused > sessions.length - 1) {
      setFocused(Math.max(0, sessions.length - 1));
    }
  }, [focused, sessions.length]);

  return (
    <div className="overview-columns">
      {sessions.map((session, i) => (
        <Column
          key={session.sessionId}
          session={session}
          status={statuses[session.sessionId] ?? 'idle'}
          now={now}
          focused={i === focused}
          bodyRef={(el) => {
            bodies.current[i] = el;
          }}
          onOwnScroll={() => {
            pinned.current[i] = false;
          }}
        />
      ))}
    </div>
  );
}
