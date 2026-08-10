/**
 * S6 — New session modal (⌘T). w:480, top 20vh, scrim; Enter creates from
 * any field; Esc cancels. Total happy path: ⌘T ↩ = two keys.
 *
 * Phase 10 (create-modal stream): the 3-option segmented control became a
 * wrapping chip grid over EVERY launchable registry agent (agents:list-driven
 * when the bridge has it, static registry mirror otherwise) + Shell last.
 * Missing CLIs render disabled with a "not found" caption; the selected
 * agent's launch-flag presets render as Options toggles (danger-styled per
 * DESIGN-SPEC S6, pre-seeded from Settings launch defaults) whose tokens ride
 * CreateSessionInput.extraArgs into BOTH argv and resume_argv. A disabled
 * SpecStory capture row holds the Phase-12 layout slot.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LaunchableAgentKind } from '@shared/types';
import {
  presetArgvTokens,
  type AgentFlagCatalogView,
  type AgentFlagPresetView,
  type GmuxSettings
} from '@shared/settings';
import {
  AGENT_INSTALL_COMMANDS,
  buildAgentOptions,
  defaultAgentChoice,
  useAgentAvailability,
  type AgentPickerOption
} from '../state/agents';
import { useSettingsStore } from '../settings/settings-store';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { trapTabKey } from './focus-trap';
import { AgentIcon, Codicon } from '../icons';

/** Install command for the caption row, when one is known. */
function installCommandFor(id: string): string | null {
  return id === 'claude' || id === 'codex'
    ? AGENT_INSTALL_COMMANDS[id]
    : null;
}

/**
 * Two DIFFERENT presets sharing the same leading token are alternative
 * values of one value-taking flag (--sandbox workspace-write vs
 * danger-full-access): checking one must uncheck the other, or the argv
 * carries contradictions.
 */
function presetsConflict(
  a: AgentFlagPresetView,
  b: AgentFlagPresetView
): boolean {
  if (a.flag === b.flag) return false;
  return a.flag.split(' ')[0] === b.flag.split(' ')[0];
}

/**
 * Settings → Launch defaults for one agent, filtered to the presets the
 * modal actually offers (verified). Danger defaults pre-check too — the
 * warning styling still renders (S6).
 */
function seededFlags(
  agent: string,
  settings: Pick<GmuxSettings, 'launchDefaults'>,
  presets: readonly AgentFlagPresetView[]
): readonly string[] {
  const enabled =
    (settings.launchDefaults as Record<string, string[] | undefined>)[
      agent
    ] ?? [];
  if (enabled.length === 0) return [];
  const offered = new Set(presets.map((p) => p.flag));
  return enabled.filter((f) => offered.has(f));
}

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

  const avail = useAgentAvailability();
  // One settings truth across windows: persisted settings (default agent +
  // launch defaults), flag catalogs, and the agents:list scan all come from
  // the shared store (src/renderer/settings/settings-store.ts).
  const initSettings = useSettingsStore((s) => s.init);
  const settings = useSettingsStore((s) => s.settings);
  const catalogs = useSettingsStore((s) => s.catalogs);
  const scan = useSettingsStore((s) => s.scan);
  useEffect(() => {
    initSettings();
  }, [initSettings]);
  const options = useMemo(
    () => buildAgentOptions(scan, avail),
    [scan, avail]
  );

  const [agent, setAgent] = useState<LaunchableAgentKind>('claude');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [cwd, setCwd] = useState('');
  const [dirError, setDirError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  // Agent whose binary create-time resolution POSITIVELY reported missing
  // (AGENT_NOT_FOUND) — pins the caption row, because the boot-time scan can
  // be stale (e.g. CLI uninstalled since).
  const [notFoundAgent, setNotFoundAgent] = useState<string | null>(null);
  // Last disabled chip the user hovered/focused — drives the caption row.
  const [hintAgent, setHintAgent] = useState<string | null>(null);
  // Per-agent checked preset flags for THIS modal opening; agents absent from
  // the map show their Settings launch defaults (per-session, never written
  // back to Settings).
  const [flagSel, setFlagSel] = useState<Record<string, readonly string[]>>(
    {}
  );
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const toast = useApp((s) => s.toast);

  // Reset on open; prefill name `<agent>-<n>` and cwd = project root.
  // Default agent: Settings default → claude → first installed → shell.
  useEffect(() => {
    if (!open) return;
    const initial = defaultAgentChoice(options, settings.defaultAgent);
    setAgent(initial);
    setNameTouched(false);
    setName(`${initial}-${nextOrdinal(projectSessions, initial)}`);
    setCwd(project?.path ?? '');
    setDirError(null);
    setGenericError(null);
    setNotFoundAgent(null);
    setHintAgent(null);
    setFlagSel({});
    setCreating(false);
    requestAnimationFrame(() => nameRef.current?.select());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If detection settles AFTER open and the selected agent turned out to be
  // missing, hop to the best installed one.
  useEffect(() => {
    if (!open) return;
    const current = options.find((o) => o.id === agent);
    if (current !== undefined && current.installed) return;
    setAgent(defaultAgentChoice(options, settings.defaultAgent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options]);

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

  // Only VERIFIED presets are offered as toggles (flags seen in the installed
  // CLI's --help — src/main/agents/flags.ts provenance discipline).
  const catalog = (
    catalogs as Record<string, AgentFlagCatalogView | undefined>
  )[agent];
  const presets = catalog?.presets.filter((p) => p.verified) ?? [];
  const checkedFlags = flagSel[agent] ?? seededFlags(agent, settings, presets);
  const selectedOption = options.find((o) => o.id === agent);

  const togglePreset = (preset: AgentFlagPresetView): void => {
    const isOn = checkedFlags.includes(preset.flag);
    let next: string[];
    if (isOn) {
      next = checkedFlags.filter((f) => f !== preset.flag);
    } else {
      // Checking one value of a value-taking flag unchecks its rivals
      // (--sandbox workspace-write vs --sandbox danger-full-access).
      next = checkedFlags.filter((f) => {
        const rival = presets.find((p) => p.flag === f);
        return rival === undefined || !presetsConflict(rival, preset);
      });
      next.push(preset.flag);
    }
    setFlagSel({ ...flagSel, [agent]: next });
  };

  const selectAgent = (opt: AgentPickerOption): void => {
    if (!opt.installed) {
      setHintAgent(opt.id);
      return;
    }
    setAgent(opt.id);
  };

  /** Arrow-key radio semantics over the ENABLED chips (roving tabindex). */
  const onGridKeyDown = (e: React.KeyboardEvent): void => {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!forward && !backward) return;
    e.preventDefault();
    const enabled = options.filter((o) => o.installed);
    if (enabled.length === 0) return;
    const at = Math.max(
      0,
      enabled.findIndex((o) => o.id === agent)
    );
    const next =
      enabled[(at + (forward ? 1 : enabled.length - 1)) % enabled.length];
    if (next === undefined) return;
    setAgent(next.id);
    chipRefs.current.get(next.id)?.focus();
  };

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
    const extraArgs = presets
      .filter((p) => checkedFlags.includes(p.flag))
      .flatMap((p) => presetArgvTokens(p.flag));
    void createSession({
      name: trimmed,
      agent,
      ...(cwd.trim().length > 0 ? { cwd: cwd.trim() } : {}),
      ...(extraArgs.length > 0 ? { extraArgs } : {})
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
        } else if (payload?.code === 'AGENT_NOT_FOUND') {
          // Friendly state, never a dead pane (Bug A): name the problem and
          // hand over the recovery in the caption row below the grid.
          if (agent !== 'shell') setNotFoundAgent(agent);
          setGenericError(payload.message);
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

  // Caption row: a create-time AGENT_NOT_FOUND pins it; otherwise it echoes
  // the last hovered/focused disabled chip. One row, 11px muted (S6).
  const captionId = notFoundAgent ?? hintAgent;
  const captionOption = options.find((o) => o.id === captionId);
  const captionCmd = captionId !== null ? installCommandFor(captionId) : null;

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
            // Enter on [Cancel] (or Choose…/chips) would create a session.
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
          <div
            className="agent-grid"
            role="radiogroup"
            aria-labelledby="agent-label"
            onKeyDown={onGridKeyDown}
          >
            {options.map((opt) => {
              const selected = agent === opt.id;
              return (
                <button
                  key={opt.id}
                  ref={(el) => {
                    if (el !== null) chipRefs.current.set(opt.id, el);
                    else chipRefs.current.delete(opt.id);
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={!opt.installed}
                  tabIndex={selected ? 0 : -1}
                  title={
                    opt.installed ? undefined : `${opt.label} not found`
                  }
                  className={`agent-chip${selected ? ' selected' : ''}${
                    opt.installed ? '' : ' missing'
                  }`}
                  onClick={() => selectAgent(opt)}
                  onMouseEnter={() => {
                    if (!opt.installed) setHintAgent(opt.id);
                  }}
                  onFocus={() => {
                    if (!opt.installed) setHintAgent(opt.id);
                  }}
                >
                  <AgentIcon agent={opt.iconKey} size={16} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {captionOption !== undefined ? (
            <div className="agent-missing">
              <span className="agent-missing-text">
                {captionOption.label} not found
              </span>
              {captionCmd !== null ? (
                <>
                  <code className="agent-missing-cmd">{captionCmd}</code>
                  <button
                    type="button"
                    className="icon-btn agent-missing-copy"
                    aria-label={`Copy install command for ${captionOption.label}`}
                    title="Copy install command"
                    onClick={() => {
                      void navigator.clipboard.writeText(captionCmd).then(
                        () => toast('info', 'Install command copied'),
                        () => toast('error', 'Could not copy the command')
                      );
                    }}
                  >
                    <Codicon name="copy" size={12} />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {selectedOption?.unverified === true ? (
            <div className="field-caption">
              {selectedOption.label} support is early — resume may not work
              yet.
            </div>
          ) : null}
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

        {presets.length > 0 ? (
          <div className="field">
            <span className="field-label" id="options-label">
              Options
            </span>
            <div role="group" aria-labelledby="options-label">
              {presets.map((preset) => {
                const on = checkedFlags.includes(preset.flag);
                return (
                  <label
                    key={preset.flag}
                    className={`preset-row${preset.danger ? ' danger' : ''}`}
                    title={preset.description}
                  >
                    <input
                      type="checkbox"
                      className="preset-check"
                      checked={on}
                      onChange={() => togglePreset(preset)}
                    />
                    {preset.danger ? (
                      <Codicon
                        name="warning"
                        size={14}
                        className="preset-warning"
                      />
                    ) : null}
                    <span className="preset-label">{preset.label}</span>
                    <code className="preset-flag">{preset.flag}</code>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Phase-12 layout slot: SpecStory capture ships with the bundling
            round; the row is a disabled placeholder so the S6 layout is
            already settled when it arrives. */}
        <div className="field">
          <span className="field-label" id="capture-label">
            Capture
          </span>
          <label
            className="preset-row capture-placeholder"
            title="Coming in Phase 12"
          >
            <input type="checkbox" className="preset-check" disabled />
            <span className="preset-label">
              Save session history with SpecStory
            </span>
            <span className="capture-soon">soon</span>
          </label>
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
