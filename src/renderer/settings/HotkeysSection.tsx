/**
 * Settings → Hotkeys (S13): reference rows (⌘T / ⌘,, non-editable) then one
 * recorder row per launchable agent. A committed chord persists instantly
 * and becomes a native Session-menu accelerator (main rebuilds the menu on
 * settings:set); pressing it creates `<agent>-<n>` in the active project.
 */

import React, { useState } from 'react';
import type { LaunchableAgentId } from '@shared/types';
import { AgentIcon } from '../icons';
import type { ChordContext } from './chords';
import { Recorder } from './Recorder';
import { useSettingsStore } from './settings-store';

/** Registry defaultHotkeyHint mnemonics (research 11 §2 — gmux proposals). */
const HINT_LETTER: Readonly<Partial<Record<string, string>>> = {
  claude: 'C',
  cursor: 'U',
  codex: 'X',
  gemini: 'G',
  droid: 'D',
  deepseek: 'K',
  antigravity: 'A',
  muse: 'M',
  qwen: 'Q'
};

export function HotkeysSection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const scan = useSettingsStore((s) => s.scan);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const launchable = (scan?.agents ?? []).filter((a) => a.launchable);
  const displayNames = Object.fromEntries(
    launchable.map((a) => [a.id, a.displayName])
  );

  const commit = (agentId: LaunchableAgentId, accel: string | undefined): void => {
    const next = { ...settings.hotkeys };
    if (accel === undefined) delete next[agentId];
    else next[agentId] = accel;
    void update({ hotkeys: next });
  };

  const setError = (agentId: string, reason: string | null): void => {
    setErrors((prev) => {
      const next = { ...prev };
      if (reason === null) delete next[agentId];
      else next[agentId] = reason;
      return next;
    });
  };

  return (
    <section aria-label="Hotkeys">
      <h1 className="set-title">Hotkeys</h1>

      <div className="set-group-label">Built in</div>
      <div className="set-card">
        <div className="set-row set-row-ref">
          <span className="set-row-label muted">New session</span>
          <span className="set-ref-chord num">⌘T</span>
        </div>
        <div className="set-row set-row-ref">
          <span className="set-row-label muted">Settings</span>
          <span className="set-ref-chord num">⌘,</span>
        </div>
      </div>

      <div className="set-group-label">New agent session</div>
      <div className="set-card">
        {launchable.length === 0 ? (
          <div className="set-empty-line">
            Agent list unavailable — re-scan from the Agents section.
          </div>
        ) : (
          launchable.map((a) => {
            const agentId = a.id as LaunchableAgentId;
            const hintLetter = HINT_LETTER[a.id];
            const context: ChordContext = {
              assigned: settings.hotkeys,
              displayNames,
              selfAgentId: a.id
            };
            const error = errors[a.id];
            return (
              <div key={a.id} className="set-hotkey-row-wrap">
                <div className="set-row set-hotkey-row">
                  <span className="set-agent-icon" aria-hidden="true">
                    <AgentIcon agent={a.iconKey} size={16} />
                  </span>
                  <span className="set-row-label">
                    New {a.displayName} session
                  </span>
                  <Recorder
                    value={settings.hotkeys[agentId]}
                    context={context}
                    onCommit={(accel) => commit(agentId, accel)}
                    onError={(reason) => setError(a.id, reason)}
                    {...(hintLetter !== undefined
                      ? { hint: `e.g. ⌘⇧${hintLetter}` }
                      : {})}
                  />
                </div>
                {error !== undefined ? (
                  <div className="set-row-error indent" role="alert">
                    {error}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
