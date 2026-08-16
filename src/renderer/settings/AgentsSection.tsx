/**
 * Settings → Agents (S13): one row per launchable registry agent from the
 * agents:list detection scan — icon · name · path (mono, middle-truncated) ·
 * version chip; missing → "Not installed" (+ the provider's own install
 * command with copy where one is published). Header: "Last scanned Xm ago"
 * + [Re-scan].
 *
 * §6.14: zero agents detected → one line + [Re-scan], nothing else.
 *
 * PHASE 49. The hand-typed INSTALL_COMMANDS table that lived here is deleted.
 * It was the same table src/renderer/state/agents.ts carried under another
 * name, and it still printed npm lines for gemini and qwen after the
 * providers moved on. The command now rides the scan row as `agent.install`,
 * straight from the install map in src/main/agents/registry.ts, with the
 * page it was read from and the date it was read. Nothing in it is ever run.
 *
 * Two passive lines join the installed row (research 47 §7 state C and §9):
 * how a package-manager install reached the disk and what it runs on, and
 * which other copies of the same binary name are shadowed on the PATH. No
 * badge, no toast, no count. An install that works is not a problem.
 */

import React, { useState } from 'react';
import type { DetectedAgent } from '@shared/types';
import { formatAge, truncateMiddle, useNow, displayPath } from '../app/format';
import { AgentIcon, Codicon } from '../icons';
import {
  installKindLine,
  installReadIsStale,
  installSourceSentence,
  nativeRecommendSentence,
  shadowedLine,
  STALE_INSTALL_LINE,
  type InstallCopySegment
} from '../state/agents';
import { ConfiguredAgents } from './ConfiguredAgents';
import { useSettingsStore } from './settings-store';

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

/** A composed sentence: plain text with paths and names in code font. */
function Segments({ line }: { line: InstallCopySegment[] }): React.JSX.Element {
  return (
    <>
      {line.map((seg, i) =>
        seg.code ? (
          // Index keys are correct here: the list is recomputed whole from
          // the scan row and never reordered in place.
          <code key={i} className="set-agent-note-code">
            {seg.text}
          </code>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * PHASE 49. The source line for a not-installed row: where the command was
 * read from and when, plus the staleness sentence when the read date is more
 * than 180 days old. `nowMs` is a parameter so the boundary is testable.
 */
export function InstallSourceNote({
  install,
  nowMs = Date.now()
}: {
  install: NonNullable<DetectedAgent['install']>;
  nowMs?: number;
}): React.JSX.Element {
  return (
    <>
      <div className="set-agent-note">
        {installSourceSentence(install.readOn)}{' '}
        <a className="set-agent-link" href={install.docUrl}>
          Open that page
        </a>
      </div>
      {installReadIsStale(install.readOn, nowMs) ? (
        <div className="set-agent-note">{STALE_INSTALL_LINE}</div>
      ) : null}
    </>
  );
}

/**
 * PHASE 49. State C (research 47 §7): one passive line under the path,
 * drawn ONLY when the scan judged the install `package-manager`. A canonical
 * or unknown install draws nothing, because an install that works is not a
 * problem. When the provider's own first choice is not a package manager,
 * one more sentence names the native route, with the page link beside it.
 */
export function InstallKindNote({
  agent
}: {
  agent: DetectedAgent;
}): React.JSX.Element | null {
  const line = installKindLine(agent);
  if (line === null) return null;
  const recommend = nativeRecommendSentence(agent);
  const install = agent.install ?? null;
  return (
    <div className="set-agent-note">
      <Segments line={line} />
      {recommend !== null ? (
        <>
          {' '}
          {recommend}
          {install !== null ? (
            <>
              {' '}
              <a className="set-agent-link" href={install.docUrl}>
                Read the install page
              </a>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * PHASE 49. The shadowed-copies sentence (research 47 §9): every other copy
 * of the same binary name found later on the walk, each with the version its
 * scan probe answered. Renders nothing for the ordinary agent with one copy.
 */
export function ShadowedNote({
  agent
}: {
  agent: DetectedAgent;
}): React.JSX.Element | null {
  const line = shadowedLine(agent);
  if (line === null) return null;
  return (
    <div className="set-agent-note">
      <Segments line={line} />
    </div>
  );
}

export function AgentRow({ agent }: { agent: DetectedAgent }): React.JSX.Element {
  const install = agent.install ?? null;
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
          <>
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
            <InstallKindNote agent={agent} />
            <ShadowedNote agent={agent} />
          </>
        ) : (
          <>
            <span className="set-agent-detail">
              <span className="set-agent-missing">Not installed</span>
              {install !== null ? (
                <>
                  <code className="set-agent-cmd">{install.command}</code>
                  <CopyButton
                    text={install.command}
                    label={`Copy install command for ${agent.displayName}`}
                  />
                </>
              ) : null}
            </span>
            {install !== null ? <InstallSourceNote install={install} /> : null}
          </>
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
