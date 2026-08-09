/**
 * S4 — Terminal region: 28px session strip + xterm host + bottom banners.
 * Exactly one session's terminal is visible per project tab; switching swaps
 * the pane with no animation (terminal region never animates, §5).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentKind, Session } from '@shared/types';
import { TerminalHost } from '../terminal';
import { effectiveStatusOf, useApp } from '../state/store';
import { statusVisual } from './status';
import { MoreIcon } from './icons';

// ---------------------------------------------------------------------------
// Session strip
// ---------------------------------------------------------------------------

function SessionStrip({
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
  const endSession = useApp((s) => s.endSession);
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);
  const toast = useApp((s) => s.toast);

  const status = effectiveStatusOf(session, overrides);
  const visual = statusVisual(status);
  // The strip rename is a second surface for the same inline pattern; only
  // one rename is active at a time (store keeps the id). Renaming from the
  // strip uses a marker suffix to not collide with the sidebar's input.
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

  const ended = status === 'exited' || status === 'restorable';

  return (
    <div className={`strip${termFocused ? ' term-focused' : ''}`}>
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
          className="strip-name"
          onDoubleClick={() => setRenaming(`strip:${session.id}`)}
          title={session.name}
        >
          {session.name}
        </span>
      )}
      <span className="chip">{session.agent}</span>
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
            items: [
              {
                label: 'Rename',
                hint: 'F2',
                run: () => setRenaming(`strip:${session.id}`)
              },
              ...(ended
                ? [{ label: 'Restart', run: () => void restartSession(session.id) }]
                : []),
              {
                label: 'Copy directory path',
                run: () => {
                  void navigator.clipboard.writeText(session.cwd).then(
                    () => toast('info', 'Directory path copied'),
                    () => toast('error', 'Could not copy the path')
                  );
                }
              },
              'sep',
              ...(ended
                ? [
                    {
                      label: 'Remove',
                      destructive: true,
                      disabled: !canDiscard(),
                      run: () => void removeSession(session.id)
                    }
                  ]
                : [
                    {
                      label: 'End session…',
                      destructive: true,
                      run: () => endSession(session.id)
                    }
                  ])
            ]
          });
        }}
      >
        <MoreIcon size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// §6.2 — project with no sessions
// ---------------------------------------------------------------------------

const QUICK_AGENTS: { agent: AgentKind; label: string }[] = [
  { agent: 'claude', label: 'Claude Code' },
  { agent: 'codex', label: 'Codex' },
  { agent: 'shell', label: 'Shell' }
];

function NoSessions(): React.JSX.Element {
  const quickCreate = useApp((s) => s.quickCreate);
  return (
    <div className="empty">
      <div className="empty-inner">
        <h2 className="empty-title">No sessions yet</h2>
        <p className="empty-body">
          A session is a named terminal that survives quits, crashes, and
          restarts.
        </p>
        <div className="empty-actions">
          {QUICK_AGENTS.map(({ agent, label }) => (
            <button
              key={agent}
              type="button"
              className="btn btn-secondary quick-create"
              onClick={() => void quickCreate(agent)}
            >
              {label}
            </button>
          ))}
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
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);

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

  if (projectSessions.length === 0) {
    return (
      <main className="center" data-slot="terminal-stack">
        <NoSessions />
      </main>
    );
  }

  const status = active ? effectiveStatusOf(active, overrides) : null;
  const exited = active !== null && status === 'exited';
  const restorable = active !== null && status === 'restorable';

  return (
    <main
      className="center"
      data-slot="terminal-stack"
      onFocusCapture={() => setTermFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setTermFocused(false);
        }
      }}
    >
      {active ? (
        <SessionStrip session={active} termFocused={termFocused} />
      ) : null}
      {active && (exited || restorable) ? (
        // §6.6 / §6.8 — the tmux-side session is gone, so there is no
        // scrollback to keep under a banner; a quiet state carries the
        // same copy and actions instead.
        <div className="empty">
          <div className="empty-inner">
            <h2 className="empty-title">
              {exited ? 'Session ended' : 'Ready to restore'}
            </h2>
            <p className="empty-body">
              {exited
                ? 'Restarting opens a fresh session with the same name and directory.'
                : 'This session is saved but not running — restart it to pick up in the same directory.'}
            </p>
            <div className="empty-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void restartSession(active.id)}
              >
                Restart
              </button>
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
