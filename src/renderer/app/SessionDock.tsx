/**
 * S4 — Orientation "right": the VS Code-terminal-style session list docked
 * at the window's right edge (w:200 persisted, drag 160–320). Toolbar is
 * this region's slice of the 36px HEADER BAND; rows are 24px, same store,
 * states, menus, and shortcuts as the tab strip. Rendered by App only when
 * orientation === 'right' and a project is open.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { statusVisual } from './status';
import { useNow } from './format';
import {
  closeSession,
  isOutsideProject,
  sessionMenuItems,
  sessionTooltip
} from './session-actions';
import { AgentIcon, Codicon } from '../icons';
import { isAgentAvailable, useAgentAvailability } from '../state/agents';
import type { AgentKind } from '@shared/types';
import type { MenuItemSpec } from '../state/store';

const QUICK_AGENTS: { agent: AgentKind; label: string }[] = [
  { agent: 'claude', label: 'Claude Code' },
  { agent: 'codex', label: 'Codex' },
  { agent: 'shell', label: 'Shell' }
];

function DockRow({
  session,
  selected,
  now
}: {
  session: Session;
  selected: boolean;
  now: number;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const lastActivity = useApp((s) => s.lastActivity);
  const renamingSessionId = useApp((s) => s.renamingSessionId);
  const setRenaming = useApp((s) => s.setRenaming);
  const setActiveSession = useApp((s) => s.setActiveSession);
  const renameSession = useApp((s) => s.renameSession);
  const setMenu = useApp((s) => s.setMenu);

  const status = effectiveStatusOf(session, overrides);
  const visual = statusVisual(status, session.exitCode);
  const renaming = renamingSessionId === session.id;
  const [draft, setDraft] = useState(session.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(session.name);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [renaming, session.name]);

  const commit = (): void => {
    setRenaming(null);
    if (draft.trim().length > 0 && draft.trim() !== session.name) {
      void renameSession(session.id, draft);
    }
  };

  const ended = status === 'exited' || status === 'restorable';

  return (
    <li>
      <div
        role="option"
        aria-selected={selected}
        aria-label={`${session.name}, ${visual.label}`}
        data-session-id={session.id}
        title={
          renaming
            ? undefined
            : sessionTooltip(session, visual, lastActivity[session.id], now)
        }
        className={[
          'srow',
          selected ? 'selected' : '',
          status === 'needs_input' ? 'attention' : '',
          ended ? 'ended' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => setActiveSession(session.id)}
        onDoubleClick={() => setRenaming(session.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            items: sessionMenuItems(session, session.id)
          });
        }}
      >
        <AgentIcon agent={session.agent} size={16} className="srow-agent" />
        {renaming ? (
          <input
            ref={inputRef}
            className="srow-rename-input"
            value={draft}
            autoFocus
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setRenaming(null);
            }}
            onBlur={commit}
          />
        ) : (
          <span className="srow-name">{session.name}</span>
        )}
        {isOutsideProject(session) ? (
          <span className="srow-wt chip chip-sm" title={session.cwd}>
            ⎇wt
          </span>
        ) : null}
        <span className="srow-space" />
        <span className={`dot dot-${visual.dot}`} />
        {status === 'restorable' ? (
          <span className="srow-saved" title="Saved — ready to restore">
            <Codicon name="history" size={12} />
          </span>
        ) : null}
        <button
          type="button"
          className="srow-close"
          tabIndex={-1}
          aria-label={
            ended ? `Remove ${session.name}` : `End ${session.name}`
          }
          title={ended ? 'Remove session' : 'End session…'}
          onClick={(e) => {
            e.stopPropagation();
            closeSession(session);
          }}
        >
          <Codicon name="close" size={14} />
        </button>
      </div>
    </li>
  );
}

export function SessionDock(): React.JSX.Element | null {
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const activeSessionByProject = useApp((s) => s.activeSessionByProject);
  const setActiveSession = useApp((s) => s.setActiveSession);
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const quickCreate = useApp((s) => s.quickCreate);
  const setMenu = useApp((s) => s.setMenu);
  const width = useApp((s) => s.rightListWidth);
  const setWidth = useApp((s) => s.setRightListWidth);
  const avail = useAgentAvailability();
  const now = useNow();

  const [dragging, setDragging] = useState(false);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () =>
      project ? sessions.filter((x) => x.projectPath === project.path) : [],
    [sessions, project]
  );

  const selectedId =
    (activeProjectId !== null
      ? activeSessionByProject[activeProjectId]
      : undefined) ?? projectSessions[projectSessions.length - 1]?.id;

  if (!project) return null;

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (projectSessions.length === 0) return;
    const idx = projectSessions.findIndex((x) => x.id === selectedId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next =
        projectSessions[Math.min(idx + 1, projectSessions.length - 1)];
      if (next) setActiveSession(next.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = projectSessions[Math.max(idx - 1, 0)];
      if (prev) setActiveSession(prev.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter activates: hand the keyboard to the terminal (S4).
      document
        .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
        ?.focus();
    }
  };

  return (
    <aside
      className="session-dock"
      data-slot="session-dock"
      style={{ width, flexBasis: width }}
    >
      <div
        className={`dock-resizer${dragging ? ' dragging' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
          const startX = e.clientX;
          const startW = width;
          const onMove = (ev: MouseEvent): void => {
            setWidth(startW - (ev.clientX - startX));
          };
          const onUp = (): void => {
            setDragging(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      />
      {/* Band slice: SESSIONS n · spacer · ＋ ˅ ([h:36], S4). */}
      <div className="dock-toolbar">
        <span className="dock-title">Sessions</span>
        {projectSessions.length > 0 ? (
          <span className="dock-count num">{projectSessions.length}</span>
        ) : null}
        <span className="dock-spacer" />
        <button
          type="button"
          className="icon-btn"
          aria-label="New session (⌘T)"
          title="New session (⌘T)"
          onClick={() => setCreateOpen(true)}
        >
          <Codicon name="add" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="New session options"
          title="New session options"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const items: MenuItemSpec[] = QUICK_AGENTS.map(
              ({ agent, label }) => {
                const available = isAgentAvailable(avail, agent);
                return {
                  label,
                  disabled: !available,
                  ...(available ? {} : { hint: 'not installed' }),
                  run: () => void quickCreate(agent)
                };
              }
            );
            setMenu({ x: r.left, y: r.bottom + 4, items });
          }}
        >
          <Codicon name="chevron-down" size={14} />
        </button>
      </div>
      {projectSessions.length === 0 ? (
        <div className="dock-stub">No sessions yet — press ⌘T.</div>
      ) : (
        <ul
          className="dock-list"
          role="listbox"
          aria-label="Sessions"
          tabIndex={0}
          onKeyDown={onListKeyDown}
        >
          {projectSessions.map((sess) => (
            <DockRow
              key={sess.id}
              session={sess}
              selected={sess.id === selectedId}
              now={now}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}
