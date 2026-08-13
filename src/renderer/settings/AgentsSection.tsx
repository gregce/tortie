/**
 * Settings → Agents (S13): one row per launchable registry agent from the
 * agents:list detection scan — icon · name · path (mono, middle-truncated) ·
 * version chip; missing → "Not installed" (+ install command with copy where
 * one is known). Header: "Last scanned Xm ago" + [Re-scan].
 *
 * §6.14: zero agents detected → one line + [Re-scan], nothing else.
 */

import React, { useState } from 'react';
import type { DetectedAgent } from '@shared/types';
import { formatAge, truncateMiddle, useNow, displayPath } from '../app/format';
import { AgentIcon, Codicon } from '../icons';
import { ConfiguredAgents } from './ConfiguredAgents';
import { useSettingsStore } from './settings-store';

/**
 * Install commands we can state with confidence (§6.5 pattern). Agents
 * without a verified command render "Not installed" alone — never a
 * guessed curl.
 */
const INSTALL_COMMANDS: Readonly<Partial<Record<string, string>>> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
  gemini: 'npm install -g @google/gemini-cli',
  qwen: 'npm install -g @qwen-code/qwen-code'
};

function CopyButton({ text, label }: { text: string; label: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn set-copy"
      aria-label={label}
      title={copied ? 'Copied' : label}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Codicon name={copied ? 'check' : 'copy'} size={12} />
    </button>
  );
}

function AgentRow({ agent }: { agent: DetectedAgent }): React.JSX.Element {
  const install = INSTALL_COMMANDS[agent.id];
  return (
    <div className="set-agent-row" data-agent-id={agent.id}>
      <span
        className={`set-agent-icon${agent.installed ? '' : ' missing'}`}
        aria-hidden="true"
      >
        <AgentIcon agent={agent.iconKey} size={16} />
      </span>
      <div className="set-agent-text">
        <span className="set-agent-name">{agent.displayName}</span>
        {agent.installed ? (
          <span className="set-agent-detail">
            <span className="set-agent-path" title={agent.binPath ?? undefined}>
              {truncateMiddle(displayPath(agent.binPath ?? ''), 48)}
            </span>
            {agent.version !== null ? (
              <span className="set-chip num">{agent.version}</span>
            ) : null}
            {agent.storeDetected ? (
              <span
                className="set-agent-inuse"
                title="Session history found — this agent is in use on this Mac"
              >
                in use
              </span>
            ) : null}
          </span>
        ) : (
          <span className="set-agent-detail">
            <span className="set-agent-missing">Not installed</span>
            {install !== undefined ? (
              <>
                <code className="set-agent-cmd">{install}</code>
                <CopyButton
                  text={install}
                  label={`Copy install command for ${agent.displayName}`}
                />
              </>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}

export function AgentsSection(): React.JSX.Element {
  const scan = useSettingsStore((s) => s.scan);
  const scanning = useSettingsStore((s) => s.scanning);
  const rescan = useSettingsStore((s) => s.rescan);
  const now = useNow();

  const launchable = (scan?.agents ?? []).filter((a) => a.launchable);
  const anyInstalled = launchable.some((a) => a.installed);

  const rescanButton = (
    <button
      type="button"
      className="btn btn-secondary set-rescan"
      disabled={scanning}
      onClick={() => void rescan()}
    >
      {scanning ? (
        <>
          <span className="set-spinner" aria-hidden="true" />
          Scanning…
        </>
      ) : (
        'Re-scan'
      )}
    </button>
  );

  return (
    <section aria-label="Agents">
      <h1 className="set-title">Agents</h1>

      <div className="set-section-toolbar">
        <span className="set-scan-age">
          {scan !== null
            ? `Last scanned ${formatAge(scan.scannedAt, now)}${
                formatAge(scan.scannedAt, now) === 'now' ? '' : ' ago'
              }`
            : scanning
              ? 'Scanning…'
              : ''}
        </span>
        {rescanButton}
      </div>

      {scan !== null && !anyInstalled ? (
        // §6.14 — the friendly zero state, nothing else.
        <div className="set-card">
          <div className="set-empty-line">
            No agent CLIs found. Install one and re-scan — sessions can always
            run a plain shell.
          </div>
        </div>
      ) : (
        <div className="set-card">
          {launchable.map((a) => (
            <AgentRow key={a.id} agent={a} />
          ))}
          {scan === null ? (
            <div className="set-empty-line">
              {scanning ? 'Scanning for installed agents…' : 'Scan unavailable.'}
            </div>
          ) : null}
        </div>
      )}

      {/* Phase 23. The confirm gate's only surface. It draws nothing at all on
          a machine with no configuration file, which is almost every machine,
          so the section above is unchanged for the ordinary user. */}
      <ConfiguredAgents />
    </section>
  );
}
