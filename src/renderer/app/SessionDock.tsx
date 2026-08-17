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
 *
 * Phase 18 item 4: the dock COLLAPSES to a 48px rail of agent icons
 * (./SessionRail.tsx) — the width complaint answered without hiding the
 * status glance. `dockCollapsed` is the one truth for that state; the band's
 * chevron and a drag past `DOCK_SNAP` both write it, and the stored width is
 * left alone so expanding restores it exactly.
 */

import React, { useRef } from 'react';
import type { Session } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
import { effectiveStatusOf, useApp } from '../state/store';
import {
  DOCK_MIN,
  DOCK_RAIL_W,
  DOCK_SNAP,
  clampDockWidth,
  dockMaxWidth,
  useWindowWidth
} from '../state/chrome-geometry';
import { useLayout } from '../state/layout';
import type { Surface } from '../state/layout';
import { rollupDot, statusVisual } from './status';
import { useNow } from './format';
import {
  RenameInput,
  ResumeMark,
  EndSessionButton,
  SavedMark,
  isOutsideProject,
  sessionAriaLabel,
  sessionTooltip,
  useRenameDraft
} from './session-actions';
import { AgentIcon, Codicon } from '../icons';
import { useResizeHandle } from '../controls';
import {
  pressBlocksSurfaceDrag,
  sessionGestureProps,
  startSurfaceDrag
} from './split/surface-dnd';
import { groupMenuItems, groupTooltip } from './split/split-menu';
import { useQuickCreateMenu } from './new-session-menu';
// The insertion indicator is shared with the collapsed rail (Phase 60);
// importing it from a third module avoids a SessionDock <-> SessionRail
// import cycle.
import { DockIndicator } from './DockIndicator';
import { SessionsPositionButton } from './SessionsPositionButton';
import { SessionRail } from './SessionRail';
import { useProjectSurfaces } from './surfaces';

function DockRow({
  session,
  surface,
  projectPath,
  activeSurface,
  activeLeafId,
  selected,
  now
}: {
  session: Session;
  surface: Surface;
  projectPath: string;
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
        aria-label={sessionAriaLabel(session, visual)}
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
          ended ? 'ended' : '',
          // Phase 67: rows on an unreachable server dim as one condition.
          status === 'unknown' ? 'session-unreachable' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        {...sessionGestureProps({
          session,
          surface,
          projectPath,
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
        <ResumeMark session={session} />
        <span className={`dot dot-${visual.dot}`} />
        {status === 'restorable' ? <SavedMark className="srow-saved" /> : null}
        <EndSessionButton session={session} ended={ended} className="srow-close" />
      </div>
    </li>
  );
}

/** Group row (S4A): split-horizontal icon · focused name · +n · dot; no ×. */
function GroupDockRow({
  surface,
  members,
  projectPath,
  focusedLeafId,
  selected
}: {
  surface: Surface;
  members: Session[];
  projectPath: string;
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
        onClick={() => selectLeaf(projectPath, focusedLeafId)}
        onPointerDown={(e) => {
          // Phase 12.2 parity: group rows refuse a drag on exactly the same
          // terms as single-session rows.
          const anyRename = useApp.getState().renamingSessionId !== null;
          if (pressBlocksSurfaceDrag(e, anyRename)) return;
          startSurfaceDrag(
            e.nativeEvent,
            e.currentTarget,
            surface,
            projectPath,
            'dock'
          );
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            items: groupMenuItems(projectPath, surface, members, focusedLeafId)
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

export function SessionDock(): React.JSX.Element | null {
  const setActiveSession = useApp((s) => s.setActiveSession);
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const storedWidth = useApp((s) => s.rightListWidth);
  const setWidth = useApp((s) => s.setRightListWidth);
  const collapsed = useApp((s) => s.dockCollapsed);
  const setDockCollapsed = useApp((s) => s.setDockCollapsed);
  const dockDrop = useLayout((s) => s.dockDrop);
  const openQuickCreateMenu = useQuickCreateMenu();
  const now = useNow();

  const asideRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // One derivation for the strip, the terminal region and this dock
  // (./surfaces.ts) — the copy that used to live here had already drifted.
  const {
    project,
    projectSessions,
    surfaces,
    sessionsById,
    activeSurface,
    activeLeafId
  } = useProjectSurfaces();

  // Persist intent, clamp presentation (state/chrome-geometry.ts): the store
  // keeps the width the user chose and this renders what fits today.
  const windowWidth = useWindowWidth();
  const expandedWidth = clampDockWidth(storedWidth, windowWidth);
  const width = collapsed ? DOCK_RAIL_W : expandedWidth;

  const handle = useResizeHandle({
    anchor: 'right',
    panelRef: asideRef,
    width,
    // Collapsed, the handle is the way back OUT of the rail, so its floor is
    // the rail itself; the first width past DOCK_SNAP expands the dock.
    min: collapsed ? DOCK_RAIL_W : DOCK_MIN,
    max: () => dockMaxWidth(),
    onWidth: (px) => {
      if (!collapsed) {
        setWidth(px);
        return;
      }
      if (px >= DOCK_SNAP) {
        setDockCollapsed(false);
        setWidth(px);
      }
    },
    ...(collapsed
      ? {}
      : { snapAt: DOCK_SNAP, onSnap: () => setDockCollapsed(true) }),
    // On the rail the divider is a pointer-only affordance: at 48px there is
    // nothing to resize, and the band's chevron is the keyboard path (a real
    // tab stop, one Tab away from the list itself).
    keyboard: !collapsed,
    // Distinct from the band chevron's "Show session names": two controls with
    // the SAME accessible name reads as one control announced twice. This one
    // is the drag edge, so it is named for the drag.
    label: collapsed ? 'Expand session list' : 'Resize session list'
  });

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

  /**
   * The collapse toggle: one button, two directions, spatial rather than
   * verbal. Expanded it is the first action in the toolbar cluster; collapsed
   * it is the rail's entire band slice.
   */
  const collapseButton = (
    <button
      type="button"
      className="icon-btn"
      aria-label={collapsed ? 'Show session names' : 'Collapse session list'}
      aria-expanded={!collapsed}
      title={collapsed ? 'Show session names' : 'Collapse session list'}
      onClick={() => setDockCollapsed(!collapsed)}
    >
      <Codicon name={collapsed ? 'chevron-left' : 'chevron-right'} size={16} />
    </button>
  );

  if (collapsed) {
    return (
      <aside
        ref={asideRef}
        className="session-dock collapsed"
        data-slot="session-dock"
        style={{ width, flexBasis: width }}
      >
        <div
          className={`dock-resizer${handle.dragging ? ' dragging' : ''}`}
          {...handle.props}
        />
        <div className="dock-toolbar">{collapseButton}</div>
        <SessionRail
          surfaces={surfaces}
          sessionsById={sessionsById}
          projectPath={project.path}
          activeSurfaceId={activeSurface?.id ?? null}
          activeLeafId={activeLeafId}
          onListKeyDown={onListKeyDown}
        />
        {/* Pinned at the rail's foot, exactly where the activity bar pins its
            gear — the two 48px bookends now answer their own placement the
            same way. It is here rather than in the 36px band because two 24px
            buttons at 48px wide would touch both edges and each other; and it
            is here rather than nowhere because "ONE STORE VALUE, three
            controls" (SessionsPositionButton) stops being true the moment
            collapsing the dock is the thing that hides the third control. */}
        <div className="rail-footer">
          <SessionsPositionButton />
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      className="session-dock"
      data-slot="session-dock"
      style={{ width, flexBasis: width }}
    >
      <div
        className={`dock-resizer${handle.dragging ? ' dragging' : ''}`}
        {...handle.props}
      />
      {/* Band slice: SESSIONS n · spacer · ＜ ＋ ˅ ([h:36], S4). */}
      <div className="dock-toolbar">
        <span className="dock-title">Sessions</span>
        {projectSessions.length > 0 ? (
          <span className="dock-count num">{projectSessions.length}</span>
        ) : null}
        <span className="dock-spacer" />
        {collapseButton}
        {/* Phase 12.12 item 2 — the position toggle sits before the ＋˅ pair
            so that pair stays one object; same component, same slot, in the
            top strip (src/renderer/app/SessionStrip.tsx). */}
        <SessionsPositionButton />
        <button
          type="button"
          className="icon-btn"
          aria-label={`New session (${keyDisplay('session.new')})`}
          title={`New session (${keyDisplay('session.new')})`}
          onClick={() => setCreateOpen(true)}
        >
          <Codicon name="add" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="New session options"
          title="New session options"
          onClick={(e) => openQuickCreateMenu(e.currentTarget)}
        >
          <Codicon name="chevron-down" size={14} />
        </button>
      </div>
      {projectSessions.length === 0 ? (
        <div className="dock-stub">
          No sessions yet — press {keyDisplay('session.new')}.
        </div>
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
                  projectPath={project.path}
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
                projectPath={project.path}
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
