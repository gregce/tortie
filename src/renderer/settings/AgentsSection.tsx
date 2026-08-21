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
 *
 * PHASE 79. The copy button that sits beside the install command moved to
 * CopyButton.tsx. The machines surface needed the same control, and one copy
 * of it is the rule. Nothing else here changed.
 *
 * PHASE 129. THE TAB IS PAGES. The three blocks above used to be stacked on
 * one scrolling page. Now this Mac has a page and every machine has a page,
 * and one page is drawn at a time. Nothing is read that was not read before:
 * switching pages sends no message, starts no scan and opens no connection.
 * A person with no machine has one page, so the tab list is not drawn at all
 * and this section is exactly the section it was.
 *
 * PHASE 110. A third sub-block joins the tab, being which agents each machine
 * has. It lives in MachineAgents.tsx and it draws nothing at all for a person
 * with no machine. `AgentRow` gained two optional props so that block can use
 * it, and the call site here passes neither, so this card reads exactly what it
 * read before. The two files import each other, which is deliberate: the row
 * belongs to this file and the block belongs to that one, and both are only
 * read at render time.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { DetectedAgent } from '@shared/types';
import { formatAge, truncateMiddle, useNow, displayPath } from '../app/format';
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
import {
  AgentPages,
  agentPagePanelId,
  agentPageTabId,
  type AgentPage
} from './AgentPages';
import { ConfiguredAgents } from './ConfiguredAgents';
import { CopyButton } from './CopyButton';
import { MachineAgentsSection } from './MachineAgents';
import { AGENTS_PAGE_THIS_MAC } from './machines-copy';
import { useMachinesStore } from './machines-store';
import { useSettingsStore } from './settings-store';

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

/** The page for the Mac Tortie is running on. Never a machine id. */
const THIS_MAC = 'local';

export function AgentsSection(): React.JSX.Element {
  const scan = useSettingsStore((s) => s.scan);
  const scanning = useSettingsStore((s) => s.scanning);
  const rescan = useSettingsStore((s) => s.rescan);
  const now = useNow();

  // The machines are read for the tab labels and the colours only. `init` is
  // idempotent behind a module flag, it reads memory in main and it starts
  // nothing. `MachineAgentsSection` used to make this same call from further
  // down the page, and it still makes it on a machine page.
  const initMachines = useMachinesStore((s) => s.init);
  const machines = useMachinesStore((s) => s.machines);
  const machinesSupported = useMachinesStore((s) => s.supported);
  useEffect(() => initMachines(), [initMachines]);

  const machineRows = useMemo(
    () => (machinesSupported ? (machines?.rows ?? []) : []),
    [machines, machinesSupported]
  );

  const pages = useMemo<AgentPage[]>(
    () => [
      { id: THIS_MAC, label: AGENTS_PAGE_THIS_MAC },
      ...machineRows.map((row) => ({
        id: row.id,
        label: row.label,
        color: row.color
      }))
    ],
    [machineRows]
  );

  // The page is not remembered between openings. A remembered page would hide
  // this Mac's own agents behind a tab the person did not choose this time.
  const [pageId, setPageId] = useState<string>(THIS_MAC);
  useEffect(() => {
    if (pageId !== THIS_MAC && !machineRows.some((row) => row.id === pageId)) {
      setPageId(THIS_MAC);
    }
  }, [machineRows, pageId]);
  const activeId = pages.some((page) => page.id === pageId) ? pageId : THIS_MAC;
  const onThisMac = activeId === THIS_MAC;

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

  const thisMacPage = (
    <>
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
    </>
  );

  // Phase 110. Which agents one machine has. It reads, and there is no install
  // action anywhere in it.
  const machinePage = <MachineAgentsSection machineId={activeId} />;

  // PHASE 129. A person with one page gets the page and nothing around it. No
  // tab list, no panel wrapper and no margin that was not there before, so the
  // Agents tab for somebody with no machine is what it always was.
  const body = onThisMac ? thisMacPage : machinePage;

  return (
    <section aria-label="Agents">
      <h1 className="set-title">Agents</h1>

      <AgentPages pages={pages} activeId={activeId} onSelect={setPageId} />

      {pages.length > 1 ? (
        // The panel takes the keyboard because a machine page can hold no
        // focusable control at all: a machine Tortie has not signed in to has
        // one disabled button and nothing else, and without this stop a person
        // on the keyboard could not reach or scroll what it says.
        <div
          role="tabpanel"
          id={agentPagePanelId(activeId)}
          aria-labelledby={agentPageTabId(activeId)}
          data-agents-page={activeId}
          tabIndex={0}
          className="set-agent-page-panel"
        >
          {body}
        </div>
      ) : (
        body
      )}
    </section>
  );
}
