/**
 * S4 — Orientation "right": the VS Code-terminal-style session list docked
 * at the window's right edge (w:200 persisted, drag 160–320). Toolbar is
 * this region's slice of the 36px HEADER BAND; rows are 24px, same store,
 * states, menus, and shortcuts as the tab strip. Rendered by App only when
 * orientation === 'right' and a project is open.
 *
 * Round 2: rows are SURFACES — single sessions or split groups (S4A).
 * Pointer drag reorders rows (2px accent line between rows); dragging a
 * single row across into the terminal splits it; split headers drag back
 * here to pop out at the indicated index.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import {
  deriveSurfaces,
  focusedLeafOf,
  surfaceOf,
  useLayout
} from '../state/layout';
import type { Surface } from '../state/layout';
import { rollupDot, statusVisual } from './status';
import { useNow } from './format';
import {
  RenameInput,
  closeSession,
  isOutsideProject,
  sessionTooltip,
  useRenameDraft
} from './session-actions';
import { AgentIcon, Codicon } from '../icons';
import { isAgentAvailable, useAgentAvailability } from '../state/agents';
import type { AgentKind } from '@shared/types';
import type { MenuItemSpec } from '../state/store';
import {
  pressBlocksSurfaceDrag,
  sessionGestureProps,
  startSurfaceDrag
} from './split/surface-dnd';
import { groupMenuItems, groupTooltip } from './split/split-menu';

const QUICK_AGENTS: { agent: AgentKind; label: string }[] = [
  { agent: 'claude', label: 'Claude Code' },
  { agent: 'codex', label: 'Codex' },
  { agent: 'shell', label: 'Shell' }
];

function DockRow({
  session,
  surface,
  projectId,
  activeSurface,
  activeLeafId,
  selected,
  now
}: {
  session: Session;
  surface: Surface;
  projectId: string;
  activeSurface: Surface | null;
  activeLeafId: string;
  selected: boolean;
  now: number;
}): React.JSX.Element {
  const lastActivity = useApp((s) => s.lastActivity);
  const status = effectiveStatusOf(session);
  const visual = statusVisual(status, session);
  const rename = useRenameDraft(session);
  const renaming = rename.renaming;

  const ended = status === 'exited' || status === 'restorable';

  return (
    <li>
      <div
        role="option"
        aria-selected={selected}
        aria-label={`${session.name}, ${visual.label}`}
        data-session-id={session.id}
        data-surface-id={surface.id}
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
        {...sessionGestureProps({
          session,
          surface,
          projectId,
          home: 'dock',
          renaming,
          activeSurface,
          activeLeafId
        })}
      >
        <AgentIcon agent={session.agent} size={16} className="srow-agent" />
        {renaming ? (
          <RenameInput rename={rename} className="srow-rename-input" />
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

/** Group row (S4A): split-horizontal icon · focused name · +n · dot; no ×. */
function GroupDockRow({
  surface,
  members,
  projectId,
  focusedLeafId,
  selected
}: {
  surface: Surface;
  members: Session[];
  projectId: string;
  focusedLeafId: string;
  selected: boolean;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);
  const selectLeaf = useLayout((s) => s.selectLeaf);

  const statuses = members.map((m) => effectiveStatusOf(m));
  const dot = rollupDot(statuses);
  const attention = statuses.includes('needs_input');
  const focused = members.find((m) => m.id === focusedLeafId) ?? members[0];

  return (
    <li>
      <div
        role="option"
        aria-selected={selected}
        aria-label={`${focused?.name ?? 'splits'} and ${members.length - 1} more`}
        data-session-id={focusedLeafId}
        data-surface-id={surface.id}
        title={groupTooltip(
          members.map((m, i) => ({
            name: m.name,
            label: statusVisual(statuses[i] ?? 'idle', m).label
          }))
        )}
        className={[
          'srow',
          'srow-group',
          selected ? 'selected' : '',
          attention ? 'attention' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => selectLeaf(projectId, focusedLeafId)}
        onPointerDown={(e) => {
          // Phase 12.2 parity: group rows refuse a drag on exactly the same
          // terms as single-session rows.
          const anyRename = useApp.getState().renamingSessionId !== null;
          if (pressBlocksSurfaceDrag(e, anyRename)) return;
          startSurfaceDrag(
            e.nativeEvent,
            e.currentTarget,
            surface,
            projectId,
            'dock'
          );
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            items: groupMenuItems(projectId, surface, members, focusedLeafId)
          });
        }}
      >
        <Codicon name="split-horizontal" size={16} className="srow-agent" />
        <span className="srow-name">{focused?.name ?? ''}</span>
        <span className="srow-plus num">+{members.length - 1}</span>
        <span className="srow-space" />
        <span className={`dot dot-${dot === 'none' ? 'idle' : dot}`} />
      </div>
    </li>
  );
}

/** 2px accent insertion line between rows (S4 drag spec, dock flavor). */
function DockIndicator({
  index,
  listRef
}: {
  index: number;
  listRef: React.RefObject<HTMLUListElement | null>;
}): React.JSX.Element | null {
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      setTop(null);
      return;
    }
    const items = Array.from(
      list.querySelectorAll<HTMLElement>('[data-surface-id]')
    );
    if (items.length === 0) {
      setTop(null);
      return;
    }
    const at = items[index];
    const last = items[items.length - 1];
    const offsetOf = (el: HTMLElement): number => {
      // Rows nest inside <li>; measure against the list's box.
      const listRect = list.getBoundingClientRect();
      return el.getBoundingClientRect().top - listRect.top + list.scrollTop;
    };
    setTop(
      at !== undefined
        ? offsetOf(at) - 1
        : last !== undefined
          ? offsetOf(last) + last.offsetHeight - 1
          : null
    );
  }, [index, listRef]);

  if (top === null) return null;
  return <div className="drop-indicator-h" style={{ top }} />;
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
  const layouts = useLayout((s) => s.layouts);
  const dockDrop = useLayout((s) => s.dockDrop);
  const avail = useAgentAvailability();
  const now = useNow();

  const [dragging, setDragging] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

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

  const surfaces = useMemo(
    () =>
      deriveSurfaces(
        project ? layouts[project.id] : undefined,
        projectSessions.map((x) => x.id)
      ),
    [layouts, project, projectSessions]
  );
  const sessionsById = useMemo(
    () => new Map(projectSessions.map((x) => [x.id, x])),
    [projectSessions]
  );
  const activeSurface = surfaceOf(surfaces, selectedId ?? null);
  const activeLeafId = activeSurface
    ? focusedLeafOf(
        activeSurface,
        selectedId ?? null,
        project ? layouts[project.id] : undefined
      )
    : '';

  if (!project) return null;

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (surfaces.length === 0) return;
    const idx = surfaces.findIndex((x) => x.id === activeSurface?.id);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next =
        e.key === 'ArrowDown'
          ? surfaces[Math.min(idx + 1, surfaces.length - 1)]
          : surfaces[Math.max(idx - 1, 0)];
      if (next) {
        const leafId = next.leafIds[0];
        if (leafId !== undefined) setActiveSession(leafId);
      }
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
          ref={listRef}
          className="dock-list"
          role="listbox"
          aria-label="Sessions"
          tabIndex={0}
          onKeyDown={onListKeyDown}
        >
          {surfaces.map((surf) => {
            if (surf.isGroup) {
              const members = surf.leafIds
                .map((id) => sessionsById.get(id))
                .filter((x): x is Session => x !== undefined);
              return (
                <GroupDockRow
                  key={surf.id}
                  surface={surf}
                  members={members}
                  projectId={project.id}
                  focusedLeafId={
                    surf.leafIds.includes(activeLeafId)
                      ? activeLeafId
                      : (surf.leafIds[0] ?? '')
                  }
                  selected={surf.id === activeSurface?.id}
                />
              );
            }
            const sess = sessionsById.get(surf.id);
            if (!sess) return null;
            return (
              <DockRow
                key={surf.id}
                session={sess}
                surface={surf}
                projectId={project.id}
                activeSurface={activeSurface}
                activeLeafId={activeLeafId}
                selected={surf.id === activeSurface?.id}
                now={now}
              />
            );
          })}
          {dockDrop !== null ? (
            <DockIndicator index={dockDrop} listRef={listRef} />
          ) : null}
        </ul>
      )}
    </aside>
  );
}
