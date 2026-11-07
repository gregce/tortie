/**
 * Phase 359 — the agent-access row on Settings → Agents.
 *
 * ONE SWITCH, drawn on this Mac's Agents page only. Off by default; on means
 * new Claude Code, Pi, and omp sessions receive Tortie's first-party `tortie`
 * skill for their launch. Turning it off closes the door immediately, and a
 * session already running keeps the skill state it started with.
 *
 * Just enough words (the operator's rule): a label, a one-line note, and a
 * switch. No paragraph, no socket path, no gate names.
 */

import React from 'react';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';

/** Exact label, pinned by the phase spec and by the conformance gate. */
export const AGENT_ACCESS_LABEL = 'Allow agents to use Tortie';

/**
 * Exact one-line note, pinned by the phase spec and by the conformance
 * gate.
 */
export const AGENT_ACCESS_NOTE =
  'New Claude Code, Pi, and omp sessions get Tortie’s skill; a session already running keeps what it started with.';

/** The pure row, exported for its test: the store's boolean decides it. */
export function AgentAccessRowView({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{AGENT_ACCESS_LABEL}</span>
        <span className="set-row-caption">{AGENT_ACCESS_NOTE}</span>
      </div>
      <Switch
        checked={checked}
        label={AGENT_ACCESS_LABEL}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * The live row. `update` is optimistic and main's answer is authoritative.
 *
 * PHASE 360: the switch is a plain settings boolean, not a sealed one, so a
 * write no longer fails closed on a keychain refusal. Main still answers with
 * whatever the file ended up holding, and the next broadcast is what the row
 * draws.
 */
export function AgentAccessSetting(): React.JSX.Element {
  const checked = useSettingsStore((s) => s.settings.agentAccess);
  const update = useSettingsStore((s) => s.update);
  return (
    <div className="set-card">
      <AgentAccessRowView
        checked={checked}
        onChange={(next) => {
          void update({ agentAccess: next });
        }}
      />
    </div>
  );
}
