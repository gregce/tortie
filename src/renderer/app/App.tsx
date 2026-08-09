/**
 * App shell — Phase 2 FUNCTIONAL HARNESS (temporary until Phase 3).
 *
 * Proves the durable session core end-to-end in dev: add a project, create a
 * named session (shell / claude / codex), see its live terminal, rename it,
 * kill it. The Phase 3 app stream replaces this file with the real shell
 * (zustand store, ⌘T modal, project tabs) — keep the frozen data-slot mount
 * regions when doing so.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentKind, GmuxErrorPayload, Project, Session } from '@shared/types';
import { TerminalHost } from '../terminal';

/** Extract friendly copy from a main-process GmuxErrorPayload rejection. */
function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const start = raw.indexOf('{');
  if (start !== -1) {
    try {
      const payload = JSON.parse(raw.slice(start)) as GmuxErrorPayload;
      if (payload && typeof payload.message === 'string') {
        return payload.detail
          ? `${payload.message} (${payload.detail})`
          : payload.message;
      }
    } catch {
      /* unclassified error — fall through to the raw message */
    }
  }
  return raw;
}

const AGENTS: AgentKind[] = ['shell', 'claude', 'codex'];

export function App(): React.JSX.Element {
  const gmux = window.gmux;

  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create-session form.
  const [newName, setNewName] = useState('');
  const [newAgent, setNewAgent] = useState<AgentKind>('shell');
  const [creating, setCreating] = useState(false);

  // Inline rename (F2 / double-click).
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fail = useCallback((err: unknown) => setError(errorText(err)), []);

  // ---- initial load + live updates ----------------------------------------
  useEffect(() => {
    if (!gmux) return undefined;
    let alive = true;
    Promise.all([gmux.projects.list(), gmux.sessions.list()])
      .then(([p, s]) => {
        if (!alive) return;
        setProjects(p);
        setSessions(s);
        setActiveProjectId((cur) => cur ?? p[0]?.id ?? null);
        setActiveSessionId((cur) => cur ?? s[0]?.id ?? null);
      })
      .catch(fail);
    const unsub = gmux.sessions.onChanged((s) => {
      setSessions(s);
      setActiveSessionId((cur) =>
        cur !== null && s.some((x) => x.id === cur) ? cur : (s[0]?.id ?? null)
      );
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [gmux, fail]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () =>
      activeProject
        ? sessions.filter((s) => s.projectPath === activeProject.path)
        : sessions,
    [sessions, activeProject]
  );

  // ---- actions -------------------------------------------------------------
  const addProject = useCallback(async () => {
    if (!gmux) return;
    setError(null);
    try {
      const dir = await gmux.projects.pickDirectory();
      if (dir === null) return;
      const project = await gmux.projects.add(dir);
      const list = await gmux.projects.list();
      setProjects(list);
      setActiveProjectId(project.id);
    } catch (err) {
      fail(err);
    }
  }, [gmux, fail]);

  const createSession = useCallback(async () => {
    if (!gmux || !activeProject || creating) return;
    const name = newName.trim();
    if (name.length === 0) return;
    setError(null);
    setCreating(true);
    try {
      const session = await gmux.sessions.create({
        name,
        projectPath: activeProject.path,
        agent: newAgent
      });
      setNewName('');
      setActiveSessionId(session.id);
    } catch (err) {
      fail(err);
    } finally {
      setCreating(false);
    }
  }, [gmux, activeProject, creating, newName, newAgent, fail]);

  const killSession = useCallback(
    async (sessionId: string) => {
      if (!gmux) return;
      setError(null);
      try {
        await gmux.sessions.kill(sessionId);
      } catch (err) {
        fail(err);
      }
    },
    [gmux, fail]
  );

  const startRename = useCallback((session: Session) => {
    setRenamingId(session.id);
    setRenameValue(session.name);
  }, []);

  const commitRename = useCallback(async () => {
    if (!gmux || renamingId === null) return;
    const name = renameValue.trim();
    setRenamingId(null);
    if (name.length === 0) return;
    setError(null);
    try {
      await gmux.sessions.rename({ sessionId: renamingId, name });
    } catch (err) {
      fail(err);
    }
  }, [gmux, renamingId, renameValue, fail]);

  // ---- render --------------------------------------------------------------
  if (!gmux) {
    return (
      <div className="app-shell">
        <div className="pane-placeholder">
          <h2>gmux</h2>
          <p>window.gmux bridge NOT available — preload failed to load.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="tab-spine" data-slot="project-tabs">
        <span className="wordmark">gmux</span>
        {projects.map((p) => (
          <span
            key={p.id}
            className={`tab project-tab${p.id === activeProjectId ? ' active' : ''}`}
            onClick={() => setActiveProjectId(p.id)}
            title={p.path}
          >
            {p.name}
          </span>
        ))}
        <span className="tab add-tab" onClick={() => void addProject()}>
          + project
        </span>
      </header>

      {error !== null ? (
        <div className="error-banner" onClick={() => setError(null)}>
          {error}
        </div>
      ) : null}

      <div className="app-body">
        <aside className="sidebar" data-slot="sidebar">
          <div className="harness-section">
            <h2>Sessions</h2>
            {activeProject === null ? (
              <p className="harness-hint">
                Add a project (top bar) to create sessions.
              </p>
            ) : (
              <div className="session-create">
                <input
                  type="text"
                  placeholder="new session name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void createSession();
                  }}
                />
                <select
                  value={newAgent}
                  onChange={(e) => setNewAgent(e.target.value as AgentKind)}
                >
                  {AGENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={creating || newName.trim().length === 0}
                  onClick={() => void createSession()}
                >
                  {creating ? 'creating…' : 'create'}
                </button>
              </div>
            )}

            <ul className="session-list">
              {projectSessions.map((s) => (
                <li
                  key={s.id}
                  className={`session-row${s.id === activeSessionId ? ' active' : ''}`}
                  onClick={() => setActiveSessionId(s.id)}
                >
                  {renamingId === s.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void commitRename()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <>
                      <span
                        className={`status-dot status-${s.status}`}
                        title={s.status}
                      />
                      <span
                        className="session-name"
                        onDoubleClick={() => startRename(s)}
                        title={`${s.agent} · ${s.cwd}`}
                      >
                        {s.name}
                      </span>
                      <span className="session-agent">{s.agent}</span>
                      <button
                        type="button"
                        className="session-kill"
                        title="Kill session"
                        onClick={(e) => {
                          e.stopPropagation();
                          void killSession(s.id);
                        }}
                      >
                        ×
                      </button>
                    </>
                  )}
                </li>
              ))}
              {projectSessions.length === 0 && activeProject !== null ? (
                <li className="harness-hint">No sessions yet.</li>
              ) : null}
            </ul>
          </div>
        </aside>

        <main className="center" data-slot="editor">
          <div className="pane-placeholder">
            <h2>Editor</h2>
            <p>Monaco (diff-vs-HEAD on file click) lands here in Phase 3.</p>
          </div>
        </main>

        <section className="terminals" data-slot="terminal-stack">
          <TerminalHost
            sessions={sessions}
            visibleSessionIds={activeSessionId !== null ? [activeSessionId] : []}
            focusedSessionId={activeSessionId}
          />
        </section>
      </div>
    </div>
  );
}
