/**
 * S6 — New session modal (⌘T). w:480, top 20vh, scrim; Enter creates from
 * any field; Esc cancels. Total happy path: ⌘T ↩ = two keys.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentKind } from '@shared/types';
import {
  AGENT_INSTALL_COMMANDS,
  firstAvailableAgent,
  isAgentAvailable,
  useAgentAvailability
} from '../state/agents';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { trapTabKey } from './focus-trap';
import { CodeIcon, CopyIcon, SparkIcon, TerminalIcon } from './icons';

const AGENT_OPTIONS: {
  agent: AgentKind;
  label: string;
  Icon: React.FC<{ size?: number }>;
}[] = [
  { agent: 'claude', label: 'Claude Code', Icon: SparkIcon },
  { agent: 'codex', label: 'Codex', Icon: CodeIcon },
  { agent: 'shell', label: 'Shell', Icon: TerminalIcon }
];

export function CreateSessionModal(): React.JSX.Element | null {
  const open = useApp((s) => s.createOpen);
  const setOpen = useApp((s) => s.setCreateOpen);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const sessions = useApp((s) => s.sessions);
  const createSession = useApp((s) => s.createSession);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () => (project ? sessions.filter((x) => x.projectPath === project.path) : []),
    [sessions, project]
  );

  const [agent, setAgent] = useState<AgentKind>('claude');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [cwd, setCwd] = useState('');
  const [dirError, setDirError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const avail = useAgentAvailability();
  const toast = useApp((s) => s.toast);

  // Reset on open; prefill name `<agent>-<n>` and cwd = project root.
  // Default agent = first INSTALLED one (§6.5): claude → codex → shell.
  useEffect(() => {
    if (!open) return;
    const initial = firstAvailableAgent(avail);
    setAgent(initial);
    setNameTouched(false);
    setName(`${initial}-${nextOrdinal(projectSessions, initial)}`);
    setCwd(project?.path ?? '');
    setDirError(null);
    setGenericError(null);
    setCreating(false);
    requestAnimationFrame(() => nameRef.current?.select());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If the availability probe settles AFTER open and the selected agent
  // turned out to be missing, hop to the best installed one.
  useEffect(() => {
    if (!open || isAgentAvailable(avail, agent)) return;
    setAgent(firstAvailableAgent(avail));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, avail]);

  // Re-prefill the name when the agent changes and the user hasn't typed.
  useEffect(() => {
    if (!open || nameTouched) return;
    setName(`${agent}-${nextOrdinal(projectSessions, agent)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  // If the modal opened before projects finished loading, backfill the
  // directory once the project is known.
  useEffect(() => {
    if (open && cwd.length === 0 && project) setCwd(project.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  if (!open || !project) return null;

  const submit = (): void => {
    if (creating) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setGenericError('Give the session a name.');
      nameRef.current?.focus();
      return;
    }
    setCreating(true);
    setDirError(null);
    setGenericError(null);
    void createSession({
      name: trimmed,
      agent,
      ...(cwd.trim().length > 0 ? { cwd: cwd.trim() } : {})
    })
      .then((ok) => {
        if (ok) setOpen(false);
        else setCreating(false);
      })
      .catch((err: unknown) => {
        setCreating(false);
        const payload = errorPayload(err);
        if (
          payload?.code === 'INVALID_INPUT' &&
          payload.message.toLowerCase().includes('working directory')
        ) {
          setDirError('Directory not found');
        } else {
          setGenericError(errorText(err));
        }
      });
  };

  const chooseDirectory = (): void => {
    void window.gmux?.projects.pickDirectory().then((dir) => {
      if (dir !== null) {
        setCwd(dir);
        setDirError(null);
      }
    });
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New session"
        onKeyDown={(e) => {
          // aria-modal promises the shell behind the scrim is inert; make
          // the keyboard honor it (Tab cycles inside the dialog).
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            // Let a focused button run its NATIVE activation — otherwise
            // Enter on [Cancel] (or Choose…/radio) would create a session.
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <h2 className="modal-title">New session</h2>

        <div className="field">
          <span className="field-label" id="agent-label">
            Agent
          </span>
          <div className="seg" role="radiogroup" aria-labelledby="agent-label">
            {AGENT_OPTIONS.map(({ agent: a, label, Icon }) => {
              const available = isAgentAvailable(avail, a);
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={agent === a}
                  disabled={!available}
                  title={available ? undefined : `${a} is not installed`}
                  className={`seg-option${agent === a ? ' selected' : ''}`}
                  onClick={() => setAgent(a)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
          {/* §6.5 — a missing agent is a friendly state, not a spawn error:
              name the fact, hand over the install command, one-click copy. */}
          {(['claude', 'codex'] as const)
            .filter((a) => !avail[a])
            .map((a) => (
              <div key={a} className="agent-missing">
                <span className="agent-missing-text">
                  {a} is not installed
                </span>
                <code className="agent-missing-cmd">
                  {AGENT_INSTALL_COMMANDS[a]}
                </code>
                <button
                  type="button"
                  className="icon-btn agent-missing-copy"
                  aria-label={`Copy install command for ${a}`}
                  title="Copy install command"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(AGENT_INSTALL_COMMANDS[a])
                      .then(
                        () => toast('info', 'Install command copied'),
                        () => toast('error', 'Could not copy the command')
                      );
                  }}
                >
                  <CopyIcon size={12} />
                </button>
              </div>
            ))}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="session-name">
            Name
          </label>
          <input
            id="session-name"
            ref={nameRef}
            className="input"
            value={name}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="session-dir">
            Directory
          </label>
          <div className="field-row">
            <input
              id="session-dir"
              className={`input input-mono${dirError !== null ? ' input-error' : ''}`}
              value={cwd}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setCwd(e.target.value);
                setDirError(null);
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={chooseDirectory}
            >
              Choose…
            </button>
          </div>
          {dirError !== null ? (
            <div className="input-error-text">{dirError}</div>
          ) : null}
        </div>

        {genericError !== null ? (
          <div className="modal-error">{genericError}</div>
        ) : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating || dirError !== null}
            onClick={submit}
          >
            {creating ? 'Creating…' : 'Create'}
            {!creating ? <span aria-hidden="true">↩</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
