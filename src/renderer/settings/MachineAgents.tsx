/**
 * Phase 110. Settings → Agents → "On your other machines".
 *
 * WHAT THIS DRAWS, and what it does not add. Phase 109 already holds the whole
 * mechanism, being the `machines:agents` channel, the `agents` and
 * `onAgentsChanged` methods on the preload, and `scanMachineAgents` in main.
 * This file adds none of the three. It draws one block per machine, with one
 * Rescan button on each, and it says how old the answer under it is.
 *
 * IT IS ONE BLOCK PER MACHINE AND NOT A MATRIX. The settings content column is
 * capped at 560 px and a person may configure up to 32 machines against up to
 * 43 agents, which is 17.5 px per column. A tick that narrow cannot carry the
 * path, and the path is the field a person wants when two copies of an agent
 * exist on one machine.
 *
 * IT IS A READ AND IT NEVER BECOMES AN INSTALL SURFACE. The local agent row
 * draws the provider's install command beside a copy button, and one of those
 * strings is a piped shell one liner. The same string beside a machine Tortie
 * holds an open connection to is one button from being sent. Every row this
 * file composes sets `install: null`, so `InstallSourceNote`, `InstallKindNote`
 * and `ShadowedNote` all draw nothing without a guard anywhere. That is the
 * refusal made mechanical rather than remembered, and a test asserts it.
 *
 * NOTHING HERE RUNS ON A CLOCK. There is no scan on opening the pane, none on a
 * re-render and none on a timer. There is no button that rescans every machine,
 * because one press of it would open up to 32 connections. A rescan is one
 * button one person pressed.
 *
 * WHY THERE ARE TWO EXPORTS. `MachineAgentsPanel` draws and takes everything it
 * draws as a prop. `MachineAgentsSection` reads the two stores and hands it
 * over. The vitest environment is node and zustand serves its INITIAL state to
 * a server render, so a test that seeded a store and rendered the connected
 * component would read defaults and assert nothing. `MachinesSection.tsx`
 * carries the same split for the same reason.
 */

import React, { useEffect } from 'react';
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import type {
  MachineAgentReading,
  MachineAgentsView,
  MachineRowView
} from '@shared/ipc';
import { machineNotSignedInOption } from '../app/machine-copy';
import { formatAge, useNow } from '../app/format';
import { AgentRow } from './AgentsSection';
import {
  AGENTS_NEVER_ASKED,
  AGENTS_NOT_SIGNED_IN,
  AGENTS_ON_MACHINES_CAPTION,
  AGENTS_ON_MACHINES_TITLE,
  AGENT_ABSENT,
  AGENT_UNKNOWN,
  BTN_RESCAN_AGENTS,
  RESCAN_AGENTS_RUNNING,
  agentsAskedLine,
  rescanAgentsLabel
} from './machines-copy';
import { useMachinesStore } from './machines-store';
import { useSettingsStore } from './settings-store';
import './machines.css';

export interface MachineAgentsPanelProps {
  /** The machines in the file, in file order. */
  rows: readonly MachineRowView[];
  /** False when this build's preload has no machines surface. */
  supported: boolean;
  /** Phase 109's answer, keyed by machine id. */
  views: Readonly<Record<string, MachineAgentsView>>;
  /** This Mac's own scan, for the display name and the icon of an agent id. */
  scan: AgentsScanResult | null;
  /** The machines a Rescan is in flight for. */
  rescanning: Readonly<Record<string, true>>;
  /** Main's sentence for a Rescan that failed, per machine id. */
  errors: Readonly<Record<string, string>>;
  /** The clock reading the age sentence is measured against. */
  nowMs: number;
  onRescan(id: string): void;
}

/**
 * One reading, as an agent row.
 *
 * The reading carries an agent id and nothing else. `machineAgentsView` in main
 * walks the same merged agent table this Mac's own scan walks, so the ids match
 * and the name and the icon can be taken from the local scan. When the local
 * scan has not landed yet the id itself is drawn, which is a short word such as
 * `claude`, and the icon falls back to the terminal glyph. No sentence is
 * invented for that moment and no row is hidden.
 */
function composeRow(
  reading: MachineAgentReading,
  byId: ReadonlyMap<string, DetectedAgent>
): DetectedAgent {
  const local = byId.get(reading.agentId) ?? null;
  return {
    id: reading.agentId,
    displayName: local?.displayName ?? reading.agentId,
    kind: 'cli',
    launchable: true,
    installed: reading.presence === 'present',
    binPath: reading.path,
    // Tortie asked whether the file is there. It did not ask its version.
    version: null,
    // That signal is about this Mac's own session store, so it is never true
    // of a file on another machine.
    storeDetected: false,
    iconKey: local?.iconKey ?? reading.agentId,
    unverified: false,
    // THE REFUSAL, made mechanical. Nothing this panel draws can hold an
    // install command, so nothing beside it can send one.
    install: null
  };
}

export function MachineAgentsPanel({
  rows,
  supported,
  views,
  scan,
  rescanning,
  errors,
  nowMs,
  onRescan
}: MachineAgentsPanelProps): React.JSX.Element | null {
  // A build whose preload has no machines surface, and a person who has added
  // no machine, both see the Agents tab exactly as it looks today. There is no
  // heading, no caption and no empty card. The configured agents block above
  // returns null on the same shape of question and this copies its rule.
  if (!supported) return null;
  if (rows.length === 0) return null;

  const byId = new Map((scan?.agents ?? []).map((a) => [a.id, a]));

  return (
    <>
      <h2 className="set-group-label">{AGENTS_ON_MACHINES_TITLE}</h2>
      <div className="set-section-caption">{AGENTS_ON_MACHINES_CAPTION}</div>

      {rows.map((row) => {
        const view = views[row.id] ?? null;
        const askedAt = view?.askedAt ?? null;
        const ready = row.ready === true;
        const busy = rescanning[row.id] === true;
        const error = errors[row.id];
        const age = askedAt === null ? null : formatAge(askedAt, nowMs);

        return (
          <div className="set-card mach-agents" data-machine-id={row.id} key={row.id}>
            <div className="mach-row">
              <div className="mach-head">
                <span
                  className="mach-dot"
                  data-machine-color={row.color}
                  aria-hidden="true"
                />
                <div className="mach-text">
                  <span className="set-agent-name">{row.label}</span>
                  <span className="set-agent-detail">
                    <span className="mach-host">{row.host}</span>
                    <span className="set-config-id">{row.id}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary set-rescan"
                  data-machines-action="rescan-agents"
                  aria-label={rescanAgentsLabel(row.label)}
                  title={ready ? undefined : machineNotSignedInOption(row.label)}
                  // The real gate is in main. `scanMachineAgents` refuses a
                  // machine with no context and one that is not answering. This
                  // is a courtesy so a person does not press a button that has
                  // already decided to refuse them.
                  disabled={busy || !ready}
                  onClick={() => onRescan(row.id)}
                >
                  {busy ? (
                    <>
                      <span className="set-spinner" aria-hidden="true" />
                      {RESCAN_AGENTS_RUNNING}
                    </>
                  ) : (
                    BTN_RESCAN_AGENTS
                  )}
                </button>
              </div>

              <div className="set-scan-age mach-agents-age">
                {age === null ? AGENTS_NEVER_ASKED : agentsAskedLine(age)}
              </div>

              {ready ? null : (
                <div className="set-config-caption">{AGENTS_NOT_SIGNED_IN}</div>
              )}

              {error !== undefined ? (
                <div className="set-row-error">{error}</div>
              ) : null}
            </div>

            {/* A machine that has never answered lists nothing, because there
                is nothing to list. Every other state keeps its rows, including
                the one where a rescan just failed. */}
            {view !== null && askedAt !== null
              ? view.agents.map((reading) => (
                  <AgentRow
                    key={reading.agentId}
                    agent={composeRow(reading, byId)}
                    machineId={row.id}
                    missingLabel={
                      reading.presence === 'absent' ? AGENT_ABSENT : AGENT_UNKNOWN
                    }
                  />
                ))
              : null}
          </div>
        );
      })}
    </>
  );
}

export function MachineAgentsSection(): React.JSX.Element | null {
  const init = useMachinesStore((s) => s.init);
  const machines = useMachinesStore((s) => s.machines);
  const supported = useMachinesStore((s) => s.supported);
  const agentsByMachine = useMachinesStore((s) => s.agentsByMachine);
  const rescanning = useMachinesStore((s) => s.rescanning);
  const rescanErrors = useMachinesStore((s) => s.rescanErrors);
  const rescanAgents = useMachinesStore((s) => s.rescanAgents);
  const scan = useSettingsStore((s) => s.scan);
  const now = useNow();

  // `init` is idempotent behind a module flag, it reads memory in main and it
  // starts nothing, so calling it from a second section is safe. It is also
  // required: a person who opens Settings on Agents and never visits Machines
  // would otherwise have no rows at all.
  useEffect(() => init(), [init]);

  return (
    <MachineAgentsPanel
      rows={machines?.rows ?? []}
      supported={supported}
      views={agentsByMachine}
      scan={scan}
      rescanning={rescanning}
      errors={rescanErrors}
      nowMs={now}
      onRescan={(id) => void rescanAgents(id)}
    />
  );
}
