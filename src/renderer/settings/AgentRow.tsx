/**
 * One agent row, plus the three passive notes that only it renders.
 *
 * PHASE 123. These five pieces used to live in AgentsSection.tsx, and
 * MachineAgents.tsx imported `AgentRow` back from there while AgentsSection.tsx
 * imported `MachineAgentsSection` from it. That was a runtime import cycle of
 * two modules, and the new graph gate refuses it. The row is drawn by both a
 * page and a section on that page, so it belongs to neither of them.
 *
 * Nothing here changed except the file it sits in. The markup, the class names,
 * the prop names and the words are the bytes they were.
 */

import React from 'react';
import type { DetectedAgent } from '@shared/types';
import { truncateMiddle, displayPath } from '../format';
import { AgentIcon } from '../icons';
import {
  installKindLine,
  installReadIsStale,
  installSourceSentence,
  nativeRecommendSentence,
  shadowedLine,
  STALE_INSTALL_LINE,
  type InstallCopySegment
} from '../state/agents';
import { CopyButton } from './CopyButton';

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

/**
 * One agent, on this Mac or on another machine.
 *
 * PHASE 110 GAVE IT TWO OPTIONAL PROPS, and the existing call site passes
 * neither, so the local card reads exactly what it read before.
 *
 *  1. `machineId` is required rather than tidy. `displayPath` rewrites
 *     `/Users/<someone>/…` to `~/…`, and Phase 90.3 gave it a second argument
 *     because a tilde is a claim about whose home folder a path is in. Without
 *     it, `/Users/gdc/.local/bin/claude` read from another machine would be
 *     drawn as `~/.local/bin/claude`, which says something Tortie does not
 *     know.
 *  2. `missingLabel` exists because `MachineAgentPresence` has three values and
 *     this row has two. A machine that answered it does not have an agent reads
 *     `Not found`. A machine nobody has asked reads `Not known yet`, and it
 *     must never read as absent.
 */
export function AgentRow({
  agent,
  machineId,
  missingLabel = 'Not installed'
}: {
  agent: DetectedAgent;
  /** The machine the path is on. Omitted means this Mac. */
  machineId?: string;
  /** The words for a row whose agent was not found. */
  missingLabel?: string;
}): React.JSX.Element {
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
                {truncateMiddle(displayPath(agent.binPath ?? '', machineId), 48)}
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
              <span className="set-agent-missing">{missingLabel}</span>
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
