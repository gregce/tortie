/**
 * The body of a `context:<id>` tab — the detail card, wired to the view's own
 * scan.
 *
 * The editor panel owns tabs and file bodies and knows nothing about agent
 * configuration. `ContextDetail` owns the card and knows nothing about tabs. This
 * component is the thirty lines between them: it takes the entry off the tab, it
 * reads the live-reload answers out of the scan the sidebar already holds, and
 * it hands the file's own rendered body down through the card's `renderBody`
 * slot.
 *
 * ## Where the live-reload table comes from, and where it does not
 *
 * From `ContextScanResult.agents[].reload`, which is registry data the reader
 * copied out of the per-agent context block. It is never prose written in a
 * component. Hooks moved from needing a restart to reloading live during the
 * research, so any sentence typed into a component here would already be wrong,
 * and the next such move would leave the wrong sentence on screen with nothing
 * to catch it.
 *
 * Only the agents that will actually LOAD this entry are listed, which is
 * `entry.agents`. An agent that can see the file but will not load it has no
 * reload answer to give about it.
 *
 * ## Why the card can render with an empty table
 *
 * A tab survives a project switch and a refresh, and during both the store's
 * scan is briefly null. The card handles an empty `agentReload` on its own, so
 * this component renders one shape rather than a loading state that would flash
 * on every refresh.
 */

import React, { useMemo } from 'react';
import type { ContextEntry } from './model';
import { ContextDetail } from './surface';
import type { AgentPrecedenceNote, AgentReload } from './surface';
import { useContext } from './store';
import { openFileAt } from './open-detail';
// The one reveal-in-Finder helper the renderer already owns (tree/fs-bridge),
// reused per the guardrail rather than a second window.gmux cast.
import { canReveal, reveal } from '../tree/fs-bridge';

/**
 * The models that name no winner. `resolve.ts` returns two rows for each of
 * them, and this is the sentence those two rows were promised.
 */
const SILENT_MODELS = new Set(['no-override', 'cli-reported', 'unknown']);

export interface ContextDetailTabProps {
  entry: ContextEntry;
  /** The project the tab belongs to, for opening paths out of the card. */
  repoPath: string;
  /**
   * PHASE 235's FIX ROUND. True when the tab's file lives on another machine.
   *
   * TODAY IT IS ALWAYS FALSE, and that is a measurement rather than a hope:
   * `ContextView` opens a detail tab from `onActivate` alone, which returns on
   * `cwd === null`, and `cwd` is null for exactly the remote targets. So no
   * detail tab can currently be opened for a machine. The guard is here rather
   * than resting on that, because the fact lives on the TAB — `EditorTab.remote`
   * has carried it since Phase 73 — and a later round that opens this tab from
   * a remote row would otherwise hand a far-side folder to Finder on this Mac,
   * which is the door `problemRevealDir` closed in the sidebar.
   */
  remote?: boolean;
  /** The file's own content, rendered by the editor that owns that renderer. */
  renderBody?: () => React.ReactNode;
}

export function ContextDetailTab({
  entry,
  repoPath,
  remote = false,
  renderBody
}: ContextDetailTabProps): React.JSX.Element {
  const scan = useContext((s) => s.scan);

  const agentReload = useMemo<AgentReload[]>(() => {
    if (scan === null) return [];
    const loads = new Set<string>(entry.agents);
    const rows: AgentReload[] = [];
    for (const readout of scan.agents) {
      if (!loads.has(readout.agent)) continue;
      const cell = readout.reload[entry.category];
      if (cell === undefined) continue;
      rows.push({
        agentId: readout.agent,
        agentName: readout.displayName,
        cell
      });
    }
    return rows;
  }, [scan, entry]);

  // Only the agents that will load this entry, and only where their model
  // resolves nothing. An agent whose model picks a winner already explains
  // itself through the shadow line, so repeating it here would say the same
  // thing twice on the rows where the panel was already right.
  const precedenceNotes = useMemo<AgentPrecedenceNote[]>(() => {
    if (scan === null) return [];
    const loads = new Set<string>(entry.agents);
    const rows: AgentPrecedenceNote[] = [];
    for (const readout of scan.agents) {
      if (!loads.has(readout.agent)) continue;
      const cell = readout.precedence?.[entry.category];
      if (cell === undefined || !SILENT_MODELS.has(cell.model)) continue;
      rows.push({
        agentId: readout.agent,
        agentName: readout.displayName,
        model: cell.model,
        note: cell.note
      });
    }
    return rows;
  }, [scan, entry]);

  return (
    <ContextDetail
      mode="browse"
      entry={entry}
      agentReload={agentReload}
      precedenceNotes={precedenceNotes}
      onOpenPath={(path, line) => {
        openFileAt(path, repoPath, {
          preview: false,
          ...(line !== undefined ? { line } : {})
        });
      }}
      {...(!remote && canReveal()
        ? {
            onRevealPath: (path: string) => {
              void reveal(path).catch(() => undefined);
            }
          }
        : {})}
      {...(renderBody !== undefined ? { renderBody } : {})}
    />
  );
}
