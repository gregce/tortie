/**
 * S6 — New session modal (⌘T). w:480, top 20vh, scrim; Enter creates from
 * any field; Esc cancels. Total happy path: ⌘T ↩ = two keys.
 *
 * Phase 10 (create-modal stream): the 3-option segmented control became a
 * grid over EVERY launchable registry agent (agents:list-driven when the
 * bridge has it, static registry mirror otherwise) + Shell last. The selected
 * agent's launch-flag presets render as Options toggles (danger-styled per
 * DESIGN-SPEC S6, pre-seeded from Settings launch defaults) whose tokens ride
 * CreateSessionInput.extraArgs into BOTH argv and resume_argv.
 *
 * Phase 15 replaced the disabled capture placeholder with the real thing: one
 * checkbox that runs the agent under SpecStory, drawn only when this machine
 * can honour it, remembered per agent, and captioned with where the transcript
 * actually goes.
 *
 * Phase 12.12 item 1: the picker itself is no longer written here. It is the
 * SHARED AgentGrid (./AgentGrid.tsx) — the same board §6.2's empty state
 * shows, in select mode. What this sheet keeps is what only it has: the name
 * field, the directory picker, the flag presets, and the one recovery the
 * empty state does not offer — a copyable install command for a missing CLI.
 * Per-agent status ("not installed", "early") is on the tiles now, so the row
 * under the grid stopped being a caption about whichever agent the pointer
 * touched last and became purely that recovery.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgentGrid } from './AgentGrid';
import type { LaunchableAgentKind } from '@shared/types';
import {
  captureDefaultFor,
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
import { captureAvailableFor, useSpecStoryStatus } from '../state/specstory';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { modalKeyDown } from './focus-trap';
import { Codicon } from '../icons';

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
  const updateSettings = useSettingsStore((s) => s.update);
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
  /**
   * SpecStory capture for THIS session. null = the user has not touched the
   * switch, so the per-agent sticky default answers — which is what makes
   * changing agent mid-sheet pick up that agent's remembered choice instead
   * of carrying the previous agent's over.
   */
  const [captureChoice, setCaptureChoice] = useState<boolean | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const toast = useApp((s) => s.toast);
  const specstory = useSpecStoryStatus(open);

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
    setCaptureChoice(null);
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

  // SpecStory capture (Phase 15). Offered only where it would actually work:
  // a resolved binary AND a provider for this agent (shells never).
  const captureOffered = captureAvailableFor(specstory, agent);
  const capture =
    captureChoice ?? captureDefaultFor(settings, agent);
  const setCapture = (on: boolean): void => setCaptureChoice(on);
  // Where the transcript goes, in the two states that differ. Signed out says
  // only what IS true — no "sign in to also…" pitch in a create sheet.
  const captureCaption = specstory?.auth.signedIn === true
    ? specstory.auth.email !== null
      ? `Saved under .specstory/history and synced to SpecStory Cloud as ${specstory.auth.email}.`
      : 'Saved under .specstory/history and synced to SpecStory Cloud.'
    : 'Saved in this folder under .specstory/history.';

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
    // Remember the capture answer per agent, but only when this sheet could
    // actually ask the question and the user actually answered it — a sheet
    // that never showed the row must not write a default, and a cancelled
    // sheet writes nothing at all (this runs on submit, not on the flip).
    if (captureOffered && captureChoice !== null && agent !== 'shell') {
      const stored = captureDefaultFor(settings, agent);
      if (stored !== captureChoice) {
        void updateSettings({
          captureDefaults: {
            ...settings.captureDefaults,
            [agent]: captureChoice
          }
        });
      }
    }
    void createSession({
      name: trimmed,
      agent,
      ...(cwd.trim().length > 0 ? { cwd: cwd.trim() } : {}),
      ...(extraArgs.length > 0 ? { extraArgs } : {}),
      ...(captureOffered && capture ? { capture: true } : {})
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

  // Install row: a create-time AGENT_NOT_FOUND pins it; otherwise it echoes
  // the last hovered/focused missing tile. It renders ONLY when there is a
  // command to hand over — the tile already said "not installed", so a row
  // that just repeats that in a sentence is noise (Phase 12.12 item 1).
  const captionId = notFoundAgent ?? hintAgent;
  const captionOption = options.find((o) => o.id === captionId);
  const captionCmd = captionId !== null ? installCommandFor(captionId) : null;
  // Reserve the row's height only when this machine could actually show it,
  // so the sheet never jumps as the pointer sweeps the board — and never
  // carries 24px of dead space on the usual machine, where every agent gmux
  // knows an install command for is already installed.
  const reserveInstallRow = options.some(
    (o) => !o.installed && installCommandFor(o.id) !== null
  );

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
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            submit,
            close: () => setOpen(false)
          })
        }
      >
        <h2 className="modal-title">New session</h2>

        <div className="field">
          <span className="field-label" id="agent-label">
            Agent
          </span>
          <AgentGrid
            mode="select"
            options={options}
            primaryId={agent}
            onActivate={selectAgent}
            onHint={setHintAgent}
            ariaLabelledBy="agent-label"
          />
          {reserveInstallRow ? (
            <div className="agent-missing" aria-live="polite">
              {captionOption !== undefined && captionCmd !== null ? (
                <>
                  <span className="agent-missing-text">
                    Install {captionOption.label}:
                  </span>
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

        {/* Phase 15 — SpecStory capture. The row exists only when this
            machine can actually do it: a resolved SpecStory binary AND a
            provider for the selected agent. An offer that would be declined
            at spawn is worse than no offer. */}
        {captureOffered ? (
          <div className="field">
            <span className="field-label" id="capture-label">
              Capture
            </span>
            <label className="preset-row">
              <input
                type="checkbox"
                className="preset-check"
                checked={capture}
                onChange={() => setCapture(!capture)}
              />
              <span className="preset-label">
                Save this session&rsquo;s history with SpecStory
              </span>
            </label>
            <p className="field-caption">{captureCaption}</p>
          </div>
        ) : null}

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
