/**
 * The Catch Me Up page (Phase 137).
 *
 * The layer sits over the work area, under the title band, and renders null
 * while the store's `overview` is null. It draws one of three views. One
 * session focused opens that session's conversation full width. A split on
 * screen opens the sessions as columns. Anywhere else opens one line per
 * session for the whole project.
 *
 * Status comes from the renderer's own store through effectiveStatusOf, for
 * the session with the same id. The payload carries no status and nothing on
 * this surface sets one.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { OverviewProject, OverviewSessionView } from '@shared/overview';
import type { OverviewState } from '../state/overview-slice';
import type { SessionStatus } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { useNow } from '../format';
import {
  leaveOverviewAndJump,
  showOverviewSession
} from './open-overview';
import { formatReadClock } from './clock';
import { FOOTER_COLUMNS, FOOTER_PROJECT, FOOTER_SESSION } from './copy';
import { SessionConversation } from './SessionConversation';
import { SessionColumns } from './SessionColumns';
import { ProjectLines } from './ProjectLines';
import './overview.css';

/** The rows the arrow keys walk at each level. */
function rowCount(state: OverviewState): number {
  if (state.data === null) return 0;
  if (state.level === 'project') return state.data.sessions.length;
  if (state.level === 'session') {
    return sessionOf(state)?.turns.length ?? 0;
  }
  return 0;
}

/** The one session the session level draws. */
function sessionOf(state: OverviewState): OverviewSessionView | null {
  if (state.data === null) return null;
  const wanted = state.sessionIds[0];
  return (
    state.data.sessions.find((s) => s.sessionId === wanted) ??
    state.data.sessions[0] ??
    null
  );
}

/** The columns, in the order the request named them. */
function columnsOf(state: OverviewState): OverviewSessionView[] {
  const data = state.data;
  if (data === null) return [];
  if (state.sessionIds.length === 0) return data.sessions;
  const byId = new Map(data.sessions.map((s) => [s.sessionId, s]));
  const named = state.sessionIds.flatMap((id) => {
    const one = byId.get(id);
    return one === undefined ? [] : [one];
  });
  return named.length > 0 ? named : data.sessions;
}

export function OverviewLayer(): React.JSX.Element | null {
  const overview = useApp((s) => s.overview);
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const now = useNow(30_000);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const open = overview !== null;

  // The page takes the keyboard when it opens, so the arrows work at once.
  useEffect(() => {
    if (open) rootRef.current?.focus();
  }, [open, overview?.level]);

  const statuses = useMemo(() => {
    const out: Record<string, SessionStatus> = {};
    for (const session of sessions) out[session.id] = effectiveStatusOf(session);
    return out;
  }, [sessions]);

  if (overview === null) return null;

  const data: OverviewProject | null = overview.data;
  const projectName =
    data?.projectName ??
    projects.find((p) => p.path === overview.projectPath)?.name ??
    overview.projectPath.split('/').pop() ??
    overview.projectPath;

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const state = useApp.getState().overview;
    if (state === null) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const count = rowCount(state);
      if (count === 0) return;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const next = Math.min(count - 1, Math.max(0, state.selected + delta));
      useApp.getState().setOverviewSelected(next);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (state.level === 'project') {
        const id = state.data?.sessions[state.selected]?.sessionId;
        if (id !== undefined) void showOverviewSession(id);
        return;
      }
      if (state.level === 'session') {
        const id = state.sessionIds[0] ?? sessionOf(state)?.sessionId;
        if (id !== undefined) void leaveOverviewAndJump(id);
      }
    }
  };

  const one = overview.level === 'session' ? sessionOf(overview) : null;
  const footer =
    overview.level === 'project'
      ? FOOTER_PROJECT
      : overview.level === 'session'
        ? FOOTER_SESSION
        : FOOTER_COLUMNS;

  return (
    <div
      className="overview-layer"
      ref={rootRef}
      tabIndex={-1}
      role="region"
      aria-label="Catch me up"
      onKeyDown={onKeyDown}
    >
      {overview.level !== 'session' ? (
        <div className="overview-header">
          {/* A name is the person's own words, so its digits are accounted
              for as quoted text rather than as a count. */}
          <span className="overview-project-name" data-quoted>
            {projectName}
          </span>
          {data !== null ? (
            <span className="overview-read-at">
              {'read '}
              <span data-clock>{formatReadClock(data.readAt)}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {overview.error !== null ? (
        <div className="overview-error" data-quoted>
          {overview.error}
        </div>
      ) : null}

      {data !== null && overview.error === null ? (
        overview.level === 'session' && one !== null ? (
          <SessionConversation
            session={one}
            status={statuses[one.sessionId] ?? 'idle'}
            selected={overview.selected}
            onSelect={(i) => {
              useApp.getState().setOverviewSelected(i);
            }}
            onActivate={() => {
              void leaveOverviewAndJump(one.sessionId);
            }}
            now={now}
          />
        ) : overview.level === 'several' ? (
          <SessionColumns
            sessions={columnsOf(overview)}
            statuses={statuses}
            now={now}
          />
        ) : (
          <ProjectLines
            project={data}
            statuses={statuses}
            selected={overview.selected}
            onSelect={(i) => {
              useApp.getState().setOverviewSelected(i);
            }}
            onActivate={(sessionId) => {
              void showOverviewSession(sessionId);
            }}
            now={now}
          />
        )
      ) : null}

      <div className="overview-footer">{footer}</div>
    </div>
  );
}
