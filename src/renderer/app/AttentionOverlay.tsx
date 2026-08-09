/**
 * S7 — Attention overlay (⌘J / 🔔): every NEEDS_INPUT session across all
 * projects, newest-blocked first. Non-modal: click-away closes, no scrim.
 * ↑↓ + ↩ jumps to project tab + session + terminal focus.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { formatAge, useNow } from './format';

export function AttentionOverlay(): React.JSX.Element | null {
  const open = useApp((s) => s.attentionOpen);
  const setOpen = useApp((s) => s.setAttentionOpen);
  const sessions = useApp((s) => s.sessions);
  const overrides = useApp((s) => s.statusOverrides);
  const attentionSince = useApp((s) => s.attentionSince);
  const excerpts = useApp((s) => s.excerpts);
  const projects = useApp((s) => s.projects);
  const setActiveProject = useApp((s) => s.setActiveProject);
  const setActiveSession = useApp((s) => s.setActiveSession);
  const now = useNow(10_000);

  const rows = useMemo<Session[]>(
    () =>
      sessions
        .filter((x) => effectiveStatusOf(x, overrides) === 'needs_input')
        .sort(
          (a, b) =>
            (attentionSince[b.id] ?? b.createdAt) -
            (attentionSince[a.id] ?? a.createdAt)
        ),
    [sessions, overrides, attentionSince]
  );

  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) setSelected(0);
  }, [open]);

  if (!open) return null;

  const jump = (session: Session): void => {
    const project = projects.find((p) => p.path === session.projectPath);
    if (project) setActiveProject(project.id);
    setActiveSession(session.id);
    setOpen(false);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
        ?.focus();
    });
  };

  const projectNameFor = (session: Session): string =>
    projects.find((p) => p.path === session.projectPath)?.name ?? '';

  return (
    <>
      <div className="attention-backdrop" onMouseDown={() => setOpen(false)} />
      <div
        className="attention-panel"
        role="dialog"
        aria-label="Sessions that need input"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected((i) => Math.min(i + 1, rows.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const row = rows[selected];
            if (row) jump(row);
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        {rows.length === 0 ? (
          <div className="attention-empty">
            Nothing needs you — all agents are working or idle.
          </div>
        ) : (
          <>
            <div className="attention-header">
              Needs your input ({rows.length})
            </div>
            <div role="listbox" aria-label="Sessions">
              {rows.map((session, i) => (
                <button
                  key={session.id}
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  className={`attention-row${i === selected ? ' selected' : ''}`}
                  autoFocus={i === 0}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => jump(session)}
                >
                  <span className="dot dot-attention" />
                  <span className="attention-session">{session.name}</span>
                  <span className="attention-project">
                    {projectNameFor(session)}
                  </span>
                  <span className="attention-excerpt">
                    {excerpts[session.id] ?? ''}
                  </span>
                  <span className="attention-age num">
                    {formatAge(
                      attentionSince[session.id] ?? session.createdAt,
                      now
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="attention-footer">
              <span className="key">↩</span> jump to session
              <span className="key">Esc</span> close
            </div>
          </>
        )}
      </div>
    </>
  );
}
