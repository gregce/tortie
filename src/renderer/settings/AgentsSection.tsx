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
 * read before.
 *
 * PHASE 181.1. The usage meters join this tab as a group at the foot of this
 * Mac's page. They had a page of their own on the rail for one day. The
 * operator moved them here, because a person deciding what an agent is and
 * does is already on this tab. The switches, their default off and their
 * guarantees are untouched; only where they are drawn changed.
 *
 * PHASE 123. `AgentRow` and the three notes it renders moved to AgentRow.tsx.
 * This file and MachineAgents.tsx both draw the row, so the row is owned by
 * neither of them. That import cycle is gone and nothing on the page changed.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { formatAge, useNow } from '../format';
import {
  AgentPages,
  agentPagePanelId,
  agentPageTabId,
  type AgentPage
} from './AgentPages';
import { AgentRow } from './AgentRow';
import { ConfiguredAgents } from './ConfiguredAgents';
import { MachineAgentsSection } from './MachineAgents';
import { AGENTS_PAGE_THIS_MAC } from './machines-copy';
import { useMachinesStore } from './machines-store';
import { useSettingsStore } from './settings-store';
import { UsageGroup } from './UsageGroup';

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

      {/* PHASE 181.1. The usage meters, which Phase 181 gave a page of their
          own on the rail. They live here now, because deciding whether a
          meter is drawn for an agent is the same decision this tab is for.
          This Mac's page only: what a meter reads is the login stored on this
          Mac. */}
      <UsageGroup />
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
