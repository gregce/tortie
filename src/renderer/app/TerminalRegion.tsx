/**
 * S4 — Terminal region (round 2): the 36px HEADER BAND on top (session tab
 * strip by default; identity strip in "right" orientation), the restore-all
 * bar when saved sessions await, then the active SURFACE — one session
 * full-bleed, or a drag-built split group of up to 6 (S4A). Exactly one
 * surface is visible per project tab; switching swaps the region with no
 * animation (terminal region never animates, §5).
 *
 * The band shares one hairline with the sidebar/editor/right-list headers
 * (S1). The single sanctioned interruption is the gap under the ACTIVE
 * session tab, where --bg-canvas runs through into the terminal.
 *
 * Drag round: tabs reorder by pointer drag within the strip; single tabs
 * dragged into the terminal split it (quadrant hit-testing, --drop-wash
 * overlay); split headers drag back to pop out. All persisted per project
 * in the layout slice (src/renderer/state/layout.ts).
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { AgentKind, Session } from '@shared/types';
import { TerminalHost } from '../terminal';
import {
  AGENT_INSTALL_COMMANDS,
  isAgentAvailable,
  useAgentAvailability
} from '../state/agents';
import { effectiveStatusOf, useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
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
  sessionMenuItems,
  sessionTooltip,
  useRenameDraft
} from './session-actions';
import { AgentIcon, Codicon } from '../icons';
// §6.2 lives with the other full-window empty states (./EmptyStates).
import { NoSessions } from './EmptyStates';
import { SplitDropOverlay, SplitSurfaceView } from './split/SplitSurface';
import { sessionGestureProps, startSurfaceDrag } from './split/surface-dnd';
import { groupMenuItems, groupTooltip } from './split/split-menu';

// ---------------------------------------------------------------------------
// Shared: quick-create split button (＋ opens ⌘T; ˅ native quick-create menu)
// ---------------------------------------------------------------------------

const QUICK_AGENTS: { agent: AgentKind; label: string }[] = [
  { agent: 'claude', label: 'Claude Code' },
  { agent: 'codex', label: 'Codex' },
  { agent: 'shell', label: 'Shell' }
];

function NewSessionSplitButton(): React.JSX.Element {
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const quickCreate = useApp((s) => s.quickCreate);
  const setMenu = useApp((s) => s.setMenu);
  const avail = useAgentAvailability();

  return (
    <div className="strip-new">
      <button
        type="button"
        className="icon-btn strip-new-main"
        aria-label="New session (⌘T)"
        title="New session (⌘T)"
        onClick={() => setCreateOpen(true)}
      >
        <Codicon name="add" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn strip-new-menu"
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
  );
}

// ---------------------------------------------------------------------------
// Orientation "top": session tab strip in the band
// ---------------------------------------------------------------------------

function SessionTab({
  session,
  surface,
  projectId,
  activeSurface,
  activeLeafId,
  active,
  now
}: {
  session: Session;
  surface: Surface;
  projectId: string;
  activeSurface: Surface | null;
  activeLeafId: string;
  active: boolean;
  now: number;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const lastActivity = useApp((s) => s.lastActivity);
  const setActiveSession = useApp((s) => s.setActiveSession);

  const status = effectiveStatusOf(session, overrides);
  const visual = statusVisual(status, session.exitCode);
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
      aria-label={`${session.name}, ${visual.label}`}
      tabIndex={active ? 0 : -1}
      data-session-id={session.id}
      data-surface-id={surface.id}
      title={renaming ? undefined : tooltip}
      className={[
        'stab',
        active ? 'active' : '',
        status === 'needs_input' ? 'attention' : '',
        ended ? 'ended' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      {...sessionGestureProps({
        session,
        surface,
        projectId,
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
      {isOutsideProject(session) ? (
        <span className="stab-wt" title={session.cwd}>
          <Codicon name="git-branch" size={12} />
        </span>
      ) : null}
      <span className={`dot dot-${visual.dot}`} />
      {status === 'restorable' ? (
        <span className="stab-saved" title="Saved — ready to restore">
          <Codicon name="history" size={12} />
        </span>
      ) : null}
      <button
        type="button"
        className="stab-close"
        tabIndex={-1}
        aria-label={ended ? `Remove ${session.name}` : `End ${session.name}`}
        title={ended ? 'Remove session' : 'End session…'}
        onClick={(e) => {
          e.stopPropagation();
          closeSession(session);
        }}
      >
        <Codicon name="close" size={14} />
      </button>
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
  projectId,
  focusedLeafId,
  active
}: {
  surface: Surface;
  members: Session[];
  projectId: string;
  focusedLeafId: string;
  active: boolean;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const setMenu = useApp((s) => s.setMenu);
  const selectLeaf = useLayout((s) => s.selectLeaf);

  const statuses = members.map((m) => effectiveStatusOf(m, overrides));
  const dot = rollupDot(statuses);
  const attention = statuses.includes('needs_input');
  const focused = members.find((m) => m.id === focusedLeafId) ?? members[0];
  const tooltip = groupTooltip(
    members.map((m, i) => ({
      name: m.name,
      label: statusVisual(statuses[i] ?? 'idle', m.exitCode).label
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
      onClick={() => selectLeaf(projectId, focusedLeafId)}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button, input') !== null) {
          return;
        }
        startSurfaceDrag(
          e.nativeEvent,
          e.currentTarget,
          surface,
          projectId,
          'strip'
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectLeaf(projectId, focusedLeafId);
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

function SessionTabStrip({
  surfaces,
  sessionsById,
  projectId,
  activeSurface,
  activeLeafId,
  termFocused
}: {
  surfaces: Surface[];
  sessionsById: Map<string, Session>;
  projectId: string;
  activeSurface: Surface | null;
  activeLeafId: string;
  termFocused: boolean;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const setMenu = useApp((s) => s.setMenu);
  const selectLeaf = useLayout((s) => s.selectLeaf);
  const stripDrop = useLayout((s) => s.stripDrop);
  const now = useNow();

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
        ? statusVisual(effectiveStatusOf(sess, overrides), sess.exitCode)
        : null;
      return {
        label: `${surf.id === activeSurfaceId ? '✓ ' : ''}${label}`,
        ...(visual ? { hint: visual.label } : {}),
        run: () => selectLeaf(projectId, leafId)
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
                projectId={projectId}
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
              projectId={projectId}
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

// ---------------------------------------------------------------------------
// Orientation "right": identity strip in the band (list lives in SessionDock)
// ---------------------------------------------------------------------------

function IdentityStrip({
  session,
  grouped,
  termFocused
}: {
  session: Session;
  /** The session is the focused leaf of a split group (S4A). */
  grouped: boolean;
  termFocused: boolean;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const setRenaming = useApp((s) => s.setRenaming);
  const setMenu = useApp((s) => s.setMenu);

  const status = effectiveStatusOf(session, overrides);
  const visual = statusVisual(status, session.exitCode);
  // Marker suffix so the dock row's rename input (plain id) never doubles up.
  const rename = useRenameDraft(session, `strip:${session.id}`);
  const renaming = rename.renaming;

  return (
    <div
      className={`term-header identity-strip${termFocused ? ' term-focused' : ''}`}
      data-session-id={session.id}
    >
      {grouped ? (
        <Codicon name="split-horizontal" size={16} className="identity-agent" />
      ) : (
        <AgentIcon agent={session.agent} size={16} className="identity-agent" />
      )}
      {renaming ? (
        <RenameInput rename={rename} className="strip-rename-input" />
      ) : (
        <span
          className="identity-name"
          onDoubleClick={() => setRenaming(`strip:${session.id}`)}
          title={session.name}
        >
          {session.name}
        </span>
      )}
      <span
        className={`strip-status${status === 'needs_input' ? ' attention' : ''}`}
      >
        {visual.label}
      </span>
      <span className="strip-spacer" />
      <button
        type="button"
        className="icon-btn"
        aria-label={`Session actions for ${session.name}`}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setMenu({
            x: r.right - 180,
            y: r.bottom + 4,
            items: sessionMenuItems(session, `strip:${session.id}`)
          });
        }}
      >
        <Codicon name="ellipsis" size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restore-all bar (moved from the removed sidebar Sessions section — S4)
// ---------------------------------------------------------------------------

function RestoreAllBar({
  sessions
}: {
  sessions: Session[];
}): React.JSX.Element | null {
  const canRestore = useApp((s) => s.canRestore);
  const restoreAllSessions = useApp((s) => s.restoreAllSessions);
  const restoringIds = useApp((s) => s.restoringIds);

  const restorable = sessions.filter((x) => x.status === 'restorable');
  if (restorable.length < 2 || !canRestore()) return null;
  const busy = restorable.some((x) => restoringIds[x.id] === true);

  return (
    <div className="restore-strip" role="status">
      <span className="restore-strip-text">
        {restorable.length} saved sessions
      </span>
      <button
        type="button"
        className="btn-restore"
        disabled={busy}
        onClick={() => void restoreAllSessions()}
      >
        <Codicon name="history" size={12} />
        &nbsp;{busy ? 'Restoring…' : 'Restore all'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Terminal region
// ---------------------------------------------------------------------------

export function TerminalRegion(): React.JSX.Element {
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const activeSessionByProject = useApp((s) => s.activeSessionByProject);
  const overrides = useApp((s) => s.statusOverrides);
  const orientation = useApp((s) => s.sessionOrientation);
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);
  const canRestore = useApp((s) => s.canRestore);
  const restoreSession = useApp((s) => s.restoreSession);
  const restoringIds = useApp((s) => s.restoringIds);
  const setVisibleSessions = useApp((s) => s.setVisibleSessions);
  const layouts = useLayout((s) => s.layouts);
  const reconcile = useLayout((s) => s.reconcile);

  const [termFocused, setTermFocused] = useState(false);
  const surfaceRootRef = useRef<HTMLDivElement | null>(null);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () => (project ? sessions.filter((x) => x.projectPath === project.path) : []),
    [sessions, project]
  );

  const active = useMemo(() => {
    const selected =
      activeProjectId !== null
        ? activeSessionByProject[activeProjectId]
        : undefined;
    return (
      projectSessions.find((x) => x.id === selected) ??
      projectSessions[projectSessions.length - 1] ??
      null
    );
  }, [projectSessions, activeProjectId, activeSessionByProject]);

  // ---- surfaces (layout slice, S4A) ---------------------------------------
  const sessionIdsKey = projectSessions.map((x) => x.id).join(',');
  const surfaces = useMemo(
    () =>
      deriveSurfaces(
        project ? layouts[project.id] : undefined,
        projectSessions.map((x) => x.id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layouts, project, sessionIdsKey]
  );
  const activeSurface = surfaceOf(surfaces, active?.id ?? null);
  const focusedLeafId = activeSurface
    ? focusedLeafOf(
        activeSurface,
        active?.id ?? null,
        project ? layouts[project.id] : undefined
      )
    : '';
  const sessionsById = useMemo(
    () => new Map(projectSessions.map((x) => [x.id, x])),
    [projectSessions]
  );

  // Prune persisted layout when sessions come and go (dead leaves collapse,
  // one-leaf groups dissolve back to plain tabs).
  const projectId = project?.id ?? null;
  useEffect(() => {
    if (projectId !== null) {
      reconcile(projectId, sessionIdsKey === '' ? [] : sessionIdsKey.split(','));
    }
  }, [projectId, sessionIdsKey, reconcile]);

  // Report the mounted panes (active surface's leaves) so the status
  // detector watches every visible terminal, not just the focused one.
  const visibleKey = (activeSurface?.leafIds ?? []).join(',');
  useEffect(() => {
    setVisibleSessions(visibleKey === '' ? [] : visibleKey.split(','));
  }, [visibleKey, setVisibleSessions]);

  if (!project) {
    // First-run state is rendered by App (full window, §6.1).
    return <main className="center" data-slot="terminal-stack" />;
  }

  const status = active ? effectiveStatusOf(active, overrides) : null;
  const exited = active !== null && status === 'exited';
  const restorable = active !== null && status === 'restorable';
  // §6.6 exit-code truth: a recorded non-zero exit renders the failed state.
  const failedExit =
    exited && active.exitCode !== undefined && active.exitCode !== 0
      ? active.exitCode
      : null;
  // Bug A (Phase 9.2): exit 127 on an agent session = its command wasn't
  // found. Explain and hand over the recovery instead of a bare exit code.
  const commandNotFound =
    failedExit === 127 && active !== null && active.agent !== 'shell'
      ? active.agent
      : null;

  const grouped = activeSurface !== null && activeSurface.isGroup;

  // The band renders in EVERY state (zero sessions included) so the S1
  // header hairline never breaks: top → tab strip (just ＋˅ when empty);
  // right → identity strip (empty band slice when no session).
  const band =
    orientation === 'top' ? (
      <SessionTabStrip
        surfaces={surfaces}
        sessionsById={sessionsById}
        projectId={project.id}
        activeSurface={activeSurface}
        activeLeafId={focusedLeafId}
        termFocused={termFocused}
      />
    ) : active ? (
      <IdentityStrip
        session={active}
        grouped={grouped}
        termFocused={termFocused}
      />
    ) : (
      <div className="term-header identity-strip" />
    );

  return (
    <main
      className="center"
      data-slot="terminal-stack"
      onFocusCapture={(e) => {
        setTermFocused(
          e.target instanceof HTMLElement &&
            e.target.closest('.gmux-terminal-mount') !== null
        );
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setTermFocused(false);
        }
      }}
    >
      {band}
      <RestoreAllBar sessions={projectSessions} />
      {projectSessions.length === 0 ? (
        <NoSessions />
      ) : grouped && activeSurface ? (
        // S4A: split group — every leaf its own session, panes side by side.
        <div
          ref={surfaceRootRef}
          className="term-body surface-root"
          data-surface-leaves
          data-surface-id={activeSurface.id}
          data-leaf-count={activeSurface.leafIds.length}
        >
          <SplitSurfaceView
            surface={activeSurface}
            projectId={project.id}
            sessions={projectSessions}
            focusedLeafId={focusedLeafId}
          />
          <SplitDropOverlay rootRef={surfaceRootRef} />
        </div>
      ) : active && (exited || restorable) ? (
        // §6.6 / §6.8 — the tmux-side session is gone, so there is no
        // scrollback to keep under a banner; a quiet state carries the
        // same copy and actions instead. Restorable sessions (Phase 6)
        // offer the real §2.4 Step 3 restore: saved scrollback replayed,
        // resume command armed — you press Enter.
        <div className={`empty${failedExit !== null ? ' empty-failed' : ''}`}>
          {/* onb-inner: one rhythm across every full-window state (§6.2/§6.6
              share the type scale and action spacing — app/empty-states.css). */}
          <div className="empty-inner onb-inner">
            <h2 className="empty-title">
              {commandNotFound !== null
                ? `${commandNotFound} could not be found`
                : failedExit !== null
                  ? `Session ended unexpectedly (exit ${failedExit})`
                  : exited
                    ? 'Session ended'
                    : 'Ready to restore'}
            </h2>
            <p className="empty-body">
              {commandNotFound !== null
                ? `The session ended right away because the ${commandNotFound} ` +
                  'command is not installed (or not where your shell expects ' +
                  'it). Install it, then restart the session.'
                : exited
                  ? 'Restarting opens a fresh session with the same name and directory.'
                  : canRestore()
                  ? (active.resumeArgv?.length ?? 0) > 0
                    ? 'Restore brings back its saved scrollback and types the resume command for you — nothing runs until you press Enter.'
                    : 'Restore reopens it in the same directory with its saved scrollback above a fresh prompt.'
                  : 'This session is saved but not running — restart it to pick up in the same directory.'}
            </p>
            {commandNotFound !== null ? (
              <code className="agent-missing-cmd">
                {AGENT_INSTALL_COMMANDS[commandNotFound]}
              </code>
            ) : null}
            <div className="empty-actions">
              {restorable && canRestore() ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={restoringIds[active.id] === true}
                  onClick={() => void restoreSession(active.id)}
                >
                  {restoringIds[active.id] === true ? 'Restoring…' : 'Restore'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void restartSession(active.id)}
                >
                  Restart
                </button>
              )}
              {canDiscard() ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void removeSession(active.id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={surfaceRootRef}
          className="term-body surface-root"
          data-surface-leaves
          data-surface-id={activeSurface?.id ?? ''}
          data-leaf-count={1}
        >
          <div
            className="surface-single"
            data-split-leaf={active?.id ?? ''}
          >
            <TerminalHost
              sessions={sessions}
              visibleSessionIds={active ? [active.id] : []}
              focusedSessionId={active?.id ?? null}
            />
          </div>
          <SplitDropOverlay rootRef={surfaceRootRef} />
        </div>
      )}
      {/* Editor stream mounts here (S5); hidden while empty. */}
      <div className="editor-slot" data-slot="editor" />
    </main>
  );
}
