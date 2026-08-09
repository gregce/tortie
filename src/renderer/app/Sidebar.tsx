/**
 * S3 — Sidebar: stacked sections. Branch header + Changes/History are the
 * SCM stream's components; Files is the tree stream's. Sessions lives here.
 * Tree decorations are fed FROM the SCM store's status list so the tree and
 * the Changes section can never disagree (Phase 4 integration).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { useGit } from '../state/git';
import { BranchHeader, ScmSection } from '../scm';
import { FilesSection } from '../tree';
import { statusVisual } from './status';
import { displayPath, formatAge, useNow } from './format';
import { ChevronDownIcon, MoreIcon, PlusIcon, RotateCcwIcon } from './icons';

// ---------------------------------------------------------------------------
// Session row
// ---------------------------------------------------------------------------

function SessionRow({
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
  const endSession = useApp((s) => s.endSession);
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);
  const toast = useApp((s) => s.toast);

  const status = effectiveStatusOf(session, overrides);
  const visual = statusVisual(status);
  const renaming = renamingSessionId === session.id;
  const [draft, setDraft] = useState(session.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(session.name);
      // Select-all after mount (S3 rename spec).
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [renaming, session.name]);

  const openMenu = (x: number, y: number): void => {
    const ended = status === 'exited' || status === 'restorable';
    setMenu({
      x,
      y,
      items: [
        { label: 'Rename', hint: 'F2', run: () => setRenaming(session.id) },
        ...(ended
          ? [
              {
                label: 'Restart',
                run: () => void restartSession(session.id)
              }
            ]
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
  };

  const age = formatAge(lastActivity[session.id] ?? session.createdAt, now);

  return (
    <li>
      <div
        role="option"
        aria-selected={selected}
        aria-label={`${session.name}, ${visual.label}`}
        className={[
          'session-row',
          selected ? 'selected' : '',
          status === 'needs_input' ? 'attention' : '',
          status === 'exited' ? 'ended' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => setActiveSession(session.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
      >
        <span className={`dot dot-${visual.dot}`} />
        {renaming ? (
          <input
            ref={inputRef}
            className="session-rename-input"
            value={draft}
            autoFocus
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                setRenaming(null);
                if (draft.trim().length > 0 && draft.trim() !== session.name) {
                  void renameSession(session.id, draft);
                }
              }
              if (e.key === 'Escape') setRenaming(null);
            }}
            onBlur={() => {
              setRenaming(null);
              if (draft.trim().length > 0 && draft.trim() !== session.name) {
                void renameSession(session.id, draft);
              }
            }}
          />
        ) : (
          <>
            <span
              className="session-name"
              onDoubleClick={() => setRenaming(session.id)}
              title={`${session.name} · ${session.agent} · ${displayPath(session.cwd)}`}
            >
              {session.name}
            </span>
            {status === 'restorable' ? (
              <span className="chip chip-sm" title="Saved — ready to restore">
                <RotateCcwIcon size={10} />
                &nbsp;saved
              </span>
            ) : null}
            <span className="session-row-space" />
            <span className="session-age num">{age}</span>
            <button
              type="button"
              className="icon-btn session-more"
              aria-label={`Session actions for ${session.name}`}
              onClick={(e) => {
                e.stopPropagation();
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                openMenu(r.left, r.bottom + 4);
              }}
            >
              <MoreIcon size={16} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar(): React.JSX.Element {
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const activeSessionByProject = useApp((s) => s.activeSessionByProject);
  const sessionsCollapsed = useApp((s) => s.sessionsCollapsed);
  const toggleSessionsCollapsed = useApp((s) => s.toggleSessionsCollapsed);
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const setActiveSession = useApp((s) => s.setActiveSession);
  const sidebarWidth = useApp((s) => s.sidebarWidth);
  const setSidebarWidth = useApp((s) => s.setSidebarWidth);
  const now = useNow();

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () =>
      project
        ? sessions.filter((x) => x.projectPath === project.path)
        : [],
    [sessions, project]
  );

  const selectedId =
    (activeProjectId !== null
      ? activeSessionByProject[activeProjectId]
      : undefined) ?? projectSessions[projectSessions.length - 1]?.id;

  // One status source for the whole sidebar: the SCM store's list feeds the
  // tree's decorations (null → the tree fetches for itself, e.g. non-repo).
  const scmStatusFiles = useGit((s) => {
    if (!project) return null;
    const status = s.repos[project.path]?.status;
    return status?.isRepo === true ? status.files : null;
  });

  const [dragging, setDragging] = useState(false);

  const listRef = useRef<HTMLUListElement | null>(null);

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (projectSessions.length === 0) return;
    const idx = projectSessions.findIndex((x) => x.id === selectedId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = projectSessions[Math.min(idx + 1, projectSessions.length - 1)];
      if (next) setActiveSession(next.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = projectSessions[Math.max(idx - 1, 0)];
      if (prev) setActiveSession(prev.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter activates: hand the keyboard to the terminal (S3).
      const term = document.querySelector<HTMLTextAreaElement>(
        '.gmux-terminal-mount textarea'
      );
      term?.focus();
    }
  };

  return (
    <aside
      className="sidebar"
      data-slot="sidebar"
      style={{ width: sidebarWidth, flexBasis: sidebarWidth }}
    >
      {/* Branch header [h:36] — ⎇ branch · ↑↓ ahead/behind · dirty count. */}
      <BranchHeader />

      <section
        className={`section-sessions${sessionsCollapsed ? ' collapsed' : ''}`}
      >
        <div
          className={`section-header${sessionsCollapsed ? ' collapsed' : ''}`}
        >
          <button
            type="button"
            className="section-toggle"
            aria-expanded={!sessionsCollapsed}
            onClick={toggleSessionsCollapsed}
          >
            <span className="section-chevron">
              <ChevronDownIcon size={12} />
            </span>
            Sessions
            <span className="section-count num">
              {projectSessions.length > 0 ? projectSessions.length : ''}
            </span>
          </button>
          <span className="section-spacer" />
          <button
            type="button"
            className="icon-btn"
            aria-label="New session (⌘T)"
            title="New session (⌘T)"
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon size={14} />
          </button>
        </div>
        {!sessionsCollapsed ? (
          <div className="section-body">
            {projectSessions.length === 0 ? (
              <div className="section-stub">
                {project
                  ? 'No sessions yet — press ⌘T.'
                  : 'Open a project to start sessions.'}
              </div>
            ) : (
              <ul
                ref={listRef}
                className="session-list session-listbox"
                role="listbox"
                aria-label="Sessions"
                tabIndex={0}
                onKeyDown={onListKeyDown}
              >
                {projectSessions.map((sess) => (
                  <SessionRow
                    key={sess.id}
                    session={sess}
                    selected={sess.id === selectedId}
                    now={now}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      <div className="sidebar-rest">
        {/* Changes + History (SCM). */}
        <ScmSection />
        {/* Files — decorations fed from the SCM store's status list. */}
        <FilesSection
          {...(scmStatusFiles !== null ? { statusFiles: scmStatusFiles } : {})}
        />
      </div>

      <div
        className={`sidebar-resizer${dragging ? ' dragging' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
          const startX = e.clientX;
          const startW = sidebarWidth;
          const onMove = (ev: MouseEvent): void => {
            setSidebarWidth(startW + (ev.clientX - startX));
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
    </aside>
  );
}
