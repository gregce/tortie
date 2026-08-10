/**
 * S4 — Terminal region (round 1): the 36px HEADER BAND on top (session tab
 * strip by default; identity strip in "right" orientation), the restore-all
 * bar when saved sessions await, then the xterm host. Exactly one session's
 * terminal is visible per project tab; switching swaps the pane with no
 * animation (terminal region never animates, §5).
 *
 * The band shares one hairline with the sidebar/editor/right-list headers
 * (S1). The single sanctioned interruption is the gap under the ACTIVE
 * session tab, where --bg-canvas runs through into the terminal.
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
import { isAgentAvailable, useAgentAvailability } from '../state/agents';
import { effectiveStatusOf, useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { statusVisual } from './status';
import { useNow } from './format';
import {
  closeSession,
  isOutsideProject,
  sessionMenuItems,
  sessionTooltip
} from './session-actions';
import { AgentIcon, Codicon } from '../icons';

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
  active,
  now
}: {
  session: Session;
  active: boolean;
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
      title={renaming ? undefined : tooltip}
      className={[
        'stab',
        active ? 'active' : '',
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
        <input
          ref={inputRef}
          className="stab-rename-input"
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

function SessionTabStrip({
  sessions,
  activeId,
  termFocused
}: {
  sessions: Session[];
  activeId: string | null;
  termFocused: boolean;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const setActiveSession = useApp((s) => s.setActiveSession);
  const setMenu = useApp((s) => s.setMenu);
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
  useEffect(() => {
    if (activeId === null) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-session-id="${CSS.escape(activeId)}"]`
    );
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  const openOverflowMenu = (x: number, y: number): void => {
    const items: MenuItemSpec[] = sessions.map((sess) => {
      const visual = statusVisual(
        effectiveStatusOf(sess, overrides),
        sess.exitCode
      );
      return {
        label: `${sess.id === activeId ? '✓ ' : ''}${sess.name}`,
        hint: visual.label,
        run: () => setActiveSession(sess.id)
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
        {sessions.map((sess) => (
          <SessionTab
            key={sess.id}
            session={sess}
            active={sess.id === activeId}
            now={now}
          />
        ))}
        <div className="stab-filler" />
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
  termFocused
}: {
  session: Session;
  termFocused: boolean;
}): React.JSX.Element {
  const overrides = useApp((s) => s.statusOverrides);
  const renamingSessionId = useApp((s) => s.renamingSessionId);
  const setRenaming = useApp((s) => s.setRenaming);
  const renameSession = useApp((s) => s.renameSession);
  const setMenu = useApp((s) => s.setMenu);

  const status = effectiveStatusOf(session, overrides);
  const visual = statusVisual(status, session.exitCode);
  // Marker suffix so the dock row's rename input (plain id) never doubles up.
  const renaming = renamingSessionId === `strip:${session.id}`;
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

  return (
    <div
      className={`term-header identity-strip${termFocused ? ' term-focused' : ''}`}
      data-session-id={session.id}
    >
      <AgentIcon agent={session.agent} size={16} className="identity-agent" />
      {renaming ? (
        <input
          ref={inputRef}
          className="strip-rename-input"
          value={draft}
          autoFocus
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setRenaming(null);
          }}
          onBlur={commit}
        />
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
// §6.2 — project with no sessions
// ---------------------------------------------------------------------------

function NoSessions(): React.JSX.Element {
  const quickCreate = useApp((s) => s.quickCreate);
  const avail = useAgentAvailability();
  return (
    <div className="empty">
      <div className="empty-inner">
        <h2 className="empty-title">No sessions yet</h2>
        <p className="empty-body">
          A session is a named terminal that survives quits, crashes, and
          restarts.
        </p>
        <div className="empty-actions">
          {QUICK_AGENTS.map(({ agent, label }) => {
            const available = isAgentAvailable(avail, agent);
            return (
              <div key={agent} className="quick-create-item">
                <button
                  type="button"
                  className="btn btn-secondary quick-create"
                  disabled={!available}
                  title={available ? undefined : `${agent} is not installed`}
                  onClick={() => void quickCreate(agent)}
                >
                  <AgentIcon agent={agent} size={16} />
                  {label}
                </button>
                {!available ? (
                  <span className="quick-create-note">not installed</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="empty-hint">
          or press <span className="key">⌘T</span> to customize
        </div>
      </div>
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

  const [termFocused, setTermFocused] = useState(false);

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

  // The band renders in EVERY state (zero sessions included) so the S1
  // header hairline never breaks: top → tab strip (just ＋˅ when empty);
  // right → identity strip (empty band slice when no session).
  const band =
    orientation === 'top' ? (
      <SessionTabStrip
        sessions={projectSessions}
        activeId={active?.id ?? null}
        termFocused={termFocused}
      />
    ) : active ? (
      <IdentityStrip session={active} termFocused={termFocused} />
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
      ) : active && (exited || restorable) ? (
        // §6.6 / §6.8 — the tmux-side session is gone, so there is no
        // scrollback to keep under a banner; a quiet state carries the
        // same copy and actions instead. Restorable sessions (Phase 6)
        // offer the real §2.4 Step 3 restore: saved scrollback replayed,
        // resume command armed — you press Enter.
        <div className={`empty${failedExit !== null ? ' empty-failed' : ''}`}>
          <div className="empty-inner">
            <h2 className="empty-title">
              {failedExit !== null
                ? `Session ended unexpectedly (exit ${failedExit})`
                : exited
                  ? 'Session ended'
                  : 'Ready to restore'}
            </h2>
            <p className="empty-body">
              {exited
                ? 'Restarting opens a fresh session with the same name and directory.'
                : canRestore()
                  ? (active.resumeArgv?.length ?? 0) > 0
                    ? 'Restore brings back its saved scrollback and types the resume command for you — nothing runs until you press Enter.'
                    : 'Restore reopens it in the same directory with its saved scrollback above a fresh prompt.'
                  : 'This session is saved but not running — restart it to pick up in the same directory.'}
            </p>
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
        <div className="term-body">
          <TerminalHost
            sessions={sessions}
            visibleSessionIds={active ? [active.id] : []}
            focusedSessionId={active?.id ?? null}
          />
        </div>
      )}
      {/* Editor stream mounts here (S5); hidden while empty. */}
      <div className="editor-slot" data-slot="editor" />
    </main>
  );
}
