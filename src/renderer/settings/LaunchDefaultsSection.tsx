/**
 * Settings → Launch defaults (S13): one group card per launchable agent,
 * detected agents first; VERIFIED presets render as switches (danger presets
 * warning-styled). First enable of a danger preset opens the confirm-once
 * modal; disabling never confirms, later re-enables don't re-confirm.
 *
 * Enabled defaults pre-check the ⌘T Options rows (shared selector in
 * ./presets.ts) and apply to quick-create + hotkey launches.
 */

import React, { useState } from 'react';
import type { AgentFlagPresetView } from '@shared/settings';
import { dangerKey } from '@shared/settings';
import type { DetectedAgent, LaunchableAgentId } from '@shared/types';
import { AgentIcon, Codicon } from '../icons';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';

interface PendingConfirm {
  agentId: LaunchableAgentId;
  agentName: string;
  binary: string;
  preset: AgentFlagPresetView;
}

function PresetRow({
  agentId,
  agentName,
  binary,
  preset,
  enabled,
  disabled,
  onToggle
}: {
  agentId: string;
  agentName: string;
  binary: string;
  preset: AgentFlagPresetView;
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <div
      className={`set-preset-row${preset.danger ? ' danger' : ''}`}
      data-agent-id={agentId}
      data-flag={preset.flag}
    >
      <Switch
        checked={enabled}
        disabled={disabled}
        danger={preset.danger}
        label={`${preset.label} for ${agentName}`}
        onChange={onToggle}
      />
      <div className="set-preset-text">
        <span className="set-preset-head">
          {preset.danger ? (
            <span className="set-preset-warn" aria-label="Danger" title={`Skips protections — ${binary} sessions will run with fewer safeguards`}>
              <Codicon name="warning" size={14} />
            </span>
          ) : null}
          <span className="set-preset-label">{preset.label}</span>
          <code className={`set-chip flag${preset.danger ? ' danger' : ''}`}>
            {preset.flag}
          </code>
        </span>
        <span className="set-preset-desc">{preset.description}</span>
      </div>
    </div>
  );
}

function ConfirmDangerModal({
  pending,
  onCancel,
  onEnable
}: {
  pending: PendingConfirm;
  onCancel: () => void;
  onEnable: () => void;
}): React.JSX.Element {
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal set-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label={`Enable ${pending.preset.label} for ${pending.agentName}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
      >
        <h2 className="modal-title">
          {pending.preset.label} for every new {pending.agentName} session?
        </h2>
        <p className="set-confirm-body">
          <code className="set-agent-cmd">
            {pending.binary} {pending.preset.flag}
          </code>{' '}
          {pending.preset.description}
        </p>
        <p className="set-confirm-body">
          Every new {pending.agentName} session will start this way. You can
          still turn it off per session in the create dialog.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-destructive"
            onClick={onEnable}
            autoFocus
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentDefaultsCard({
  agent,
  onRequestDanger
}: {
  agent: DetectedAgent;
  onRequestDanger: (p: PendingConfirm) => void;
}): React.JSX.Element | null {
  const settings = useSettingsStore((s) => s.settings);
  const catalogs = useSettingsStore((s) => s.catalogs);
  const update = useSettingsStore((s) => s.update);

  const agentId = agent.id as LaunchableAgentId;
  const catalog = catalogs[agentId];
  const presets = (catalog?.presets ?? []).filter((p) => p.verified);
  const enabled = new Set(settings.launchDefaults[agentId] ?? []);

  const setEnabled = (flag: string, next: boolean): void => {
    const flags = new Set(settings.launchDefaults[agentId] ?? []);
    if (next) flags.add(flag);
    else flags.delete(flag);
    void update({
      launchDefaults: {
        ...settings.launchDefaults,
        [agentId]: [...flags]
      }
    });
  };

  const toggle = (preset: AgentFlagPresetView, next: boolean): void => {
    if (
      next &&
      preset.danger &&
      !settings.dangerAcknowledged.includes(dangerKey(agentId, preset.flag))
    ) {
      onRequestDanger({
        agentId,
        agentName: agent.displayName,
        binary: catalog?.binary ?? agentId,
        preset
      });
      return;
    }
    setEnabled(preset.flag, next);
  };

  return (
    <div className={`set-defaults-card${agent.installed ? '' : ' uninstalled'}`}>
      <div className="set-defaults-head">
        <span className="set-agent-icon" aria-hidden="true">
          <AgentIcon agent={agent.iconKey} size={16} />
        </span>
        <span className="set-defaults-name">{agent.displayName}</span>
        {!agent.installed ? (
          <span className="set-agent-missing">not installed</span>
        ) : null}
      </div>
      {agent.installed ? (
        presets.length > 0 ? (
          <div className="set-defaults-body">
            {presets.map((p) => (
              <PresetRow
                key={p.flag}
                agentId={agentId}
                agentName={agent.displayName}
                binary={catalog?.binary ?? agentId}
                preset={p}
                enabled={enabled.has(p.flag)}
                disabled={false}
                onToggle={(next) => toggle(p, next)}
              />
            ))}
          </div>
        ) : (
          <div className="set-empty-line">
            No launch options cataloged for this agent yet.
          </div>
        )
      ) : null}
    </div>
  );
}

export function LaunchDefaultsSection(): React.JSX.Element {
  const scan = useSettingsStore((s) => s.scan);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const launchable = (scan?.agents ?? []).filter((a) => a.launchable);
  // Detected agents first (S13), registry order within each half.
  const ordered = [
    ...launchable.filter((a) => a.installed),
    ...launchable.filter((a) => !a.installed)
  ];

  const confirmEnable = (): void => {
    if (pending === null) return;
    const key = dangerKey(pending.agentId, pending.preset.flag);
    const flags = new Set(settings.launchDefaults[pending.agentId] ?? []);
    flags.add(pending.preset.flag);
    void update({
      launchDefaults: {
        ...settings.launchDefaults,
        [pending.agentId]: [...flags]
      },
      dangerAcknowledged: settings.dangerAcknowledged.includes(key)
        ? settings.dangerAcknowledged
        : [...settings.dangerAcknowledged, key]
    });
    setPending(null);
  };

  return (
    <section aria-label="Launch defaults">
      <h1 className="set-title">Launch defaults</h1>
      <p className="set-section-caption">
        Flags applied to every new session of an agent. Sessions created from
        ⌘T show these pre-checked — turning one off there affects that session
        only.
      </p>

      {ordered.length === 0 ? (
        <div className="set-card">
          <div className="set-empty-line">
            Agent list unavailable — re-scan from the Agents section.
          </div>
        </div>
      ) : (
        ordered.map((a) => (
          <AgentDefaultsCard
            key={a.id}
            agent={a}
            onRequestDanger={setPending}
          />
        ))
      )}

      {pending !== null ? (
        <ConfirmDangerModal
          pending={pending}
          onCancel={() => setPending(null)}
          onEnable={confirmEnable}
        />
      ) : null}
    </section>
  );
}
