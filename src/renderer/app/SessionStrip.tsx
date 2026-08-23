/**
 * S4 — the session tab strip ("top" orientation): the app's PRIMARY
 * navigation, one tab per surface (a session, or a split group of up to 6).
 *
 * Phase 18 item 3 moved this out of TerminalRegion, unchanged. It used to
 * render as the terminal region's own header band, which made it a flex
 * SIBLING of the editor panel — so opening a file subtracted the editor's
 * whole width from the strip's, and a project with ten sessions showed three
 * tabs and an overflow chevron (the reported bug). It now sits one level up,
 * spanning the work area above BOTH the terminal and the editor, so a file
 * can never cost sessions their room. The band is at the same y, wears the
 * same `.term-header` classes and draws the same S1 hairline; the terminal's
 * box is unchanged, because the 36px it gives up is consumed by this strip
 * one level up.
 *
 * Everything else here is as it was: tabs reorder by pointer drag within the
 * strip, single tabs dragged into the terminal split it, and the overflow
 * chevron opens a native menu of every surface (src/renderer/app/split/).
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import type { Session } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
import { effectiveStatusOf, useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { useLayout } from '../state/layout';
import type { Surface } from '../state/layout';
import { rollupDot, statusVisual } from './status';
import { useNow } from '../format';
import {
  ReadLastLinesButton,
  RenameInput,
  ResumeMark,
  EndSessionButton,
  SavedMark,
  isOutsideProject,
  sessionAriaLabel,
  sessionTooltip,
  useRenameDraft
} from './session-actions';
import { MachineBadge } from './MachineBadge';
import { AgentIcon, Codicon } from '../icons';
import {
  pressBlocksSurfaceDrag,
  sessionGestureProps,
  startSurfaceDrag
} from './split/surface-dnd';
import { groupMenuItems, groupTooltip } from './split/split-menu';
import { useQuickCreateMenu } from './new-session-menu';
import { SessionsPositionButton } from './SessionsPositionButton';
import { useProjectSurfaces } from './surfaces';
import { useTermFocused } from './term-focus';

// ---------------------------------------------------------------------------
// Shared: quick-create split button (＋ opens ⌘T; ˅ native quick-create menu,
// every registry agent — src/renderer/app/new-session-menu.ts)
// ---------------------------------------------------------------------------

function NewSessionSplitButton(): React.JSX.Element {
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const openQuickCreateMenu = useQuickCreateMenu();

  return (
    <div className="strip-new">
      {/* Phase 12.12 item 2 — same control the right dock's toolbar carries
          (./SessionsPositionButton.tsx), so the way back exists in BOTH
          orientations rather than only in the View menu. */}
      <SessionsPositionButton />
      <button
        type="button"
        className="icon-btn strip-new-main"
        aria-label={`New session (${keyDisplay('session.new')})`}
        title={`New session (${keyDisplay('session.new')})`}
        onClick={() => setCreateOpen(true)}
      >
        <Codicon name="add" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn strip-new-menu"
        aria-label="New session options"
        title="New session options"
        onClick={(e) => openQuickCreateMenu(e.currentTarget)}
      >
        <Codicon name="chevron-down" size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function SessionTab({
  session,
  surface,
  projectPath,
  activeSurface,
  activeLeafId,
  active,
  now
}: {
  session: Session;
  surface: Surface;
  projectPath: string;
  activeSurface: Surface | null;
  activeLeafId: string;
  active: boolean;
  now: number;
}): React.JSX.Element {
  const lastActivity = useApp((s) => s.lastActivity);
  const setActiveSession = useApp((s) => s.setActiveSession);

  const status = effectiveStatusOf(session);
  const visual = statusVisual(status, session);
  const rename = useRenameDraft(session);
  const renaming = rename.renaming;

  const tooltip = sessionTooltip(
    session,
    visual,
    lastActivity[session.id],
    now
  );
  const ended = status === 'exited' || status === 'restorable';

  return (
    <div
      role="tab"
      aria-selected={active}
      aria-label={sessionAriaLabel(session, visual)}
      tabIndex={active ? 0 : -1}
      data-session-id={session.id}
      data-surface-id={surface.id}
      title={renaming ? undefined : tooltip}
      className={[
        'stab',
        active ? 'active' : '',
        status === 'needs_input' ? 'attention' : '',
        ended ? 'ended' : '',
        // Phase 67: tabs on an unreachable server dim as one condition.
        status === 'unknown' ? 'session-unreachable' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      {...sessionGestureProps({
        session,
        surface,
        projectPath,
        home: 'strip',
        renaming,
        activeSurface,
        activeLeafId
      })}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveSession(session.id);
          document
            .querySelector<HTMLTextAreaElement>(
              '.gmux-terminal-mount textarea'
            )
            ?.focus();
        }
      }}
    >
      <AgentIcon agent={session.agent} size={16} className="stab-agent" />
      {renaming ? (
        <RenameInput rename={rename} className="stab-rename-input" />
      ) : (
        <span className="stab-name">{session.name}</span>
      )}
      {/* Phase 70: the tab says which machine the session runs on when that
          machine is not this Mac. */}
      <MachineBadge machine={session.machine} className="stab-machine" />
      {isOutsideProject(session) ? (
        <span className="stab-wt" title={session.cwd}>
          <Codicon name="git-branch" size={12} />
        </span>
      ) : null}
      <ResumeMark session={session} />
      <span className={`dot dot-${visual.dot}`} />
      {status === 'restorable' ? <SavedMark className="stab-saved" /> : null}
      <EndSessionButton session={session} ended={ended} className="stab-close" />
    </div>
  );
}

/**
 * Group tab (S4A): a surface holding ≥2 splits. split-horizontal icon ·
 * focused leaf's name · "+n" pill · roll-up dot · no × (sessions end only
 * from split headers). Reorders by drag but never re-enters split mode.
 */
function GroupTab({
  surface,
  members,
  projectPath,
  focusedLeafId,
  active
}: {
  surface: Surface;
  members: Session[];
  projectPath: string;
  focusedLeafId: string;
  active: boolean;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);
  const selectLeaf = useLayout((s) => s.selectLeaf);

  const statuses = members.map((m) => effectiveStatusOf(m));
  const dot = rollupDot(statuses);
  const attention = statuses.includes('needs_input');
  const focused = members.find((m) => m.id === focusedLeafId) ?? members[0];
  const tooltip = groupTooltip(
    members.map((m, i) => ({
      name: m.name,
      label: statusVisual(statuses[i] ?? 'idle', m).label
    }))
  );

  return (
    <div
      role="tab"
      aria-selected={active}
      aria-label={`${focused?.name ?? 'splits'} and ${members.length - 1} more`}
      tabIndex={active ? 0 : -1}
      data-session-id={focusedLeafId}
      data-surface-id={surface.id}
      title={tooltip}
      className={[
        'stab',
        'stab-group',
        active ? 'active' : '',
        attention ? 'attention' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => selectLeaf(projectPath, focusedLeafId)}
      onPointerDown={(e) => {
        // Phase 12.2 parity: group tabs refuse a drag on exactly the same
        // terms as single-session tabs.
        const anyRename = useApp.getState().renamingSessionId !== null;
        if (pressBlocksSurfaceDrag(e, anyRename)) return;
        startSurfaceDrag(
          e.nativeEvent,
          e.currentTarget,
          surface,
          projectPath,
          'strip'
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectLeaf(projectPath, focusedLeafId);
          document
            .querySelector<HTMLTextAreaElement>(
              '.gmux-terminal-mount textarea'
            )
            ?.focus();
        }
      }}
    >
      <Codicon name="split-horizontal" size={16} className="stab-agent" />
      <span className="stab-name">{focused?.name ?? ''}</span>
      <span className="stab-plus num">+{members.length - 1}</span>
      <span className={`dot dot-${dot === 'none' ? 'idle' : dot}`} />
    </div>
  );
}

/** 2px accent insertion indicator between tabs (S2 spec, strip flavor). */
function StripIndicator({
  index,
  listRef
}: {
  index: number;
  listRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element | null {
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      setLeft(null);
      return;
    }
    const items = Array.from(
      list.querySelectorAll<HTMLElement>('[data-surface-id]')
    );
    if (items.length === 0) {
      setLeft(null);
      return;
    }
    const at = items[index];
    const last = items[items.length - 1];
    setLeft(
      at !== undefined
        ? at.offsetLeft - 1
        : (last?.offsetLeft ?? 0) + (last?.offsetWidth ?? 0) - 1
    );
  }, [index, listRef]);

  if (left === null) return null;
  return <div className="drop-indicator-v" style={{ left }} />;
}

// ---------------------------------------------------------------------------
// The strip
// ---------------------------------------------------------------------------

function SessionTabStrip({
  surfaces,
  sessionsById,
  projectPath,
  activeSurface,
  activeLeafId,
  termFocused
}: {
  surfaces: Surface[];
  sessionsById: Map<string, Session>;
  projectPath: string;
  activeSurface: Surface | null;
  activeLeafId: string;
  termFocused: boolean;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);
  const selectLeaf = useLayout((s) => s.selectLeaf);
  const stripDrop = useLayout((s) => s.stripDrop);
  const now = useNow();

  // Phase 95. The session the terminal below is showing, which is the one the
  // scrollback note would be about. In a split group it is the focused leaf,
  // which is the same session ./TerminalRegion.tsx hands its identity strip.
  const shownSession =
    activeSurface === null
      ? undefined
      : sessionsById.get(
          activeSurface.leafIds.includes(activeLeafId)
            ? activeLeafId
            : (activeSurface.leafIds[0] ?? '')
        );

  const listRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState<{
    has: boolean;
    hiddenAttention: number;
  }>({ has: false, hiddenAttention: 0 });

  // Measure horizontal overflow (» button + amber pill for scrolled-out
  // needs-input tabs). Re-measured on scroll, resize, and session changes.
  const measure = useCallback((): void => {
    const list = listRef.current;
    if (!list) return;
    const has = list.scrollWidth > list.clientWidth + 1;
    let hiddenAttention = 0;
    if (has) {
      const left = list.scrollLeft;
      const right = left + list.clientWidth;
      for (const el of Array.from(
        list.querySelectorAll<HTMLElement>('[data-session-id]')
      )) {
        const visible =
          el.offsetLeft + el.offsetWidth > left + 8 &&
          el.offsetLeft < right - 8;
        if (!visible && el.classList.contains('attention')) {
          hiddenAttention++;
        }
      }
    }
    setOverflow((prev) =>
      prev.has === has && prev.hiddenAttention === hiddenAttention
        ? prev
        : { has, hiddenAttention }
    );
  }, []);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    list.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', measure);
    };
  }, [measure]);

  // Keep the active tab scrolled into view when selection moves.
  const activeSurfaceId = activeSurface?.id ?? null;
  useEffect(() => {
    if (activeSurfaceId === null) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-surface-id="${CSS.escape(activeSurfaceId)}"]`
    );
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeSurfaceId]);

  const openOverflowMenu = (x: number, y: number): void => {
    const items: MenuItemSpec[] = surfaces.map((surf) => {
      const leafId = surf.leafIds.includes(activeLeafId)
        ? activeLeafId
        : (surf.leafIds[0] ?? '');
      const sess = sessionsById.get(leafId);
      const label = surf.isGroup
        ? `${sess?.name ?? ''} +${surf.leafIds.length - 1}`
        : (sess?.name ?? '');
      const visual = sess
        ? statusVisual(effectiveStatusOf(sess), sess)
        : null;
      return {
        label: `${surf.id === activeSurfaceId ? '✓ ' : ''}${label}`,
        ...(visual ? { hint: visual.label } : {}),
        run: () => selectLeaf(projectPath, leafId)
      };
    });
    setMenu({ x, y, items });
  };

  return (
    <div
      className={`term-header strip-tabs${termFocused ? ' term-focused' : ''}`}
      data-slot="session-strip"
    >
      <div
        ref={listRef}
        className="stab-list"
        role="tablist"
        aria-label="Sessions"
        onKeyDown={(e) => {
          // Roving arrows across tabs (tablist convention).
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          const tabs = Array.from(
            listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ??
              []
          );
          const cur = tabs.indexOf(document.activeElement as HTMLElement);
          if (cur === -1) return;
          e.preventDefault();
          const next =
            tabs[
              (cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
                tabs.length
            ];
          next?.focus();
        }}
      >
        {surfaces.map((surf) => {
          if (surf.isGroup) {
            const members = surf.leafIds
              .map((id) => sessionsById.get(id))
              .filter((x): x is Session => x !== undefined);
            return (
              <GroupTab
                key={surf.id}
                surface={surf}
                members={members}
                projectPath={projectPath}
                focusedLeafId={
                  surf.leafIds.includes(activeLeafId)
                    ? activeLeafId
                    : (surf.leafIds[0] ?? '')
                }
                active={surf.id === activeSurfaceId}
              />
            );
          }
          const session = sessionsById.get(surf.id);
          if (!session) return null;
          return (
            <SessionTab
              key={surf.id}
              session={session}
              surface={surf}
              projectPath={projectPath}
              activeSurface={activeSurface}
              activeLeafId={activeLeafId}
              active={surf.id === activeSurfaceId}
              now={now}
            />
          );
        })}
        <div className="stab-filler" />
        {stripDrop !== null ? (
          <StripIndicator index={stripDrop} listRef={listRef} />
        ) : null}
      </div>
      {/* Phase 100. The same button the identity strip draws in the "right"
          orientation, in the band a person actually has by default. It acts on
          the session on screen, so it sits outside the scrolling tab list
          rather than inside a tab. The tabs are too narrow for words, and one
          button per remote tab would offer the same verb several times over.
          Phase 95 put a note here that said scrolling back was not available.
          It is available now, so the note is gone and this opens the panel. */}
      {shownSession !== undefined ? (
        <ReadLastLinesButton
          session={shownSession}
          className="strip-readback"
        />
      ) : null}
      {overflow.has ? (
        <div className="strip-cell">
          <button
            type="button"
            className="icon-btn strip-overflow"
            aria-label="All sessions"
            title="All sessions"
            onClick={(e) => {
              const r = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              openOverflowMenu(r.left, r.bottom + 4);
            }}
          >
            <Codicon name="chevron-right" size={14} />
            {overflow.hiddenAttention > 0 ? (
              <span className="badge-attention num">
                {overflow.hiddenAttention}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
      <NewSessionSplitButton />
    </div>
  );
}

/**
 * The strip as App mounts it: top of the work area, above the terminal and
 * the editor both. Renders nothing when no project is selected — exactly what
 * the terminal region did with its band in that state.
 */
export function SessionStrip(): React.JSX.Element | null {
  const { project, surfaces, sessionsById, activeSurface, activeLeafId } =
    useProjectSurfaces();
  const termFocused = useTermFocused();

  if (!project) return null;

  return (
    <SessionTabStrip
      surfaces={surfaces}
      sessionsById={sessionsById}
      projectPath={project.path}
      activeSurface={activeSurface}
      activeLeafId={activeLeafId}
      termFocused={termFocused}
    />
  );
}
