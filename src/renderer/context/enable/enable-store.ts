/**
 * The "Enable for…" flow, as state (Phase 26 item 3).
 *
 * WHY THIS SURFACE EXISTS. The row verb "Enable for…" used to open the install
 * SEARCH sheet on the skill's name as a query, and the operator called that
 * the wrong surface: the question is "which of my agents get this skill", not
 * "find me a skill". This store holds the picker that asks that question
 * directly — the detected fleet as checkboxes, pre-checked from what is on
 * disk, with the same disabled-with-reason treatment the install sheet has.
 * There is no search field anywhere in it.
 *
 * WHAT IT DOES NOT OWN. The command. Confirming hands the widened agent set to
 * `useInstallFlow.requestEnable`, which builds the plan in main, opens the one
 * confirm dialog every skills write goes through, and spawns through the one
 * `runConfirmed` path. This store never sees an argv.
 *
 * THE SOURCE PROBLEM, stated rather than papered over. `skills add` needs a
 * source, and a skill on disk does not record where it came from. The one
 * place Tortie knows a source is its own pin, written when an install was
 * approved here. So:
 *
 *  - pin present  → the picker confirms directly, from the pinned source.
 *  - no pin       → the picker says Tortie does not know the source, and its
 *    primary control becomes "Find its source…", which opens the existing
 *    sheet on the skill's name with the on-disk agents pre-checked. That is
 *    the old behavior, now an explicit fallback instead of the default.
 */

import { create } from 'zustand';
import type { ContextEntry } from '../model';
import { useInstallFlow } from '../install/install-store';
import type { AgentChoice } from '../install/install-store';
import {
  addedTargets,
  buildEnableTargets,
  sendableTargets,
  toggleEnableTarget
} from './enable-model';
import type { EnableTarget } from './enable-model';

export interface EnableFlowState {
  open: boolean;
  /** The skill being widened. */
  name: string | null;
  /** Where the re-run will land. From the entry's own scope. */
  scope: 'global' | 'project';
  /** The pinned source, or null when Tortie did not install this skill. */
  source: string | null;
  projectRoot: string | null;
  targets: EnableTarget[];
  /** Kept for the no-pin fallback, which reopens the sheet. */
  fleet: AgentChoice[];
  /** The on-disk agent ids, for the fallback's preselect. */
  onDisk: string[];

  openFor(input: {
    entry: ContextEntry;
    agents: readonly AgentChoice[];
    source: string | null;
    projectRoot: string | null;
  }): void;
  toggle(agentId: string): void;
  close(): void;
  /** Hand the widened set to the install store's confirm. Runs nothing. */
  confirmEnable(): Promise<void>;
  /** The no-pin fallback: the existing sheet, on the name, preselected. */
  findSource(): void;
}

export const useEnableFlow = create<EnableFlowState>((set, get) => ({
  open: false,
  name: null,
  scope: 'global',
  source: null,
  projectRoot: null,
  targets: [],
  fleet: [],
  onDisk: [],

  openFor(input) {
    set({
      open: true,
      name: input.entry.name,
      scope: input.entry.scope === 'project' ? 'project' : 'global',
      source: input.source,
      projectRoot: input.projectRoot,
      targets: buildEnableTargets(input.agents, input.entry.agents),
      fleet: [...input.agents],
      onDisk: [...input.entry.agents]
    });
  },

  toggle(agentId) {
    set({ targets: toggleEnableTarget(get().targets, agentId) });
  },

  close() {
    set({ open: false, name: null, source: null, targets: [] });
  },

  async confirmEnable() {
    const { name, source, scope, projectRoot, targets } = get();
    if (name === null || source === null) return;
    const sendable = sendableTargets(targets);
    const added = addedTargets(targets);
    if (added.length === 0 || sendable.length < 2) return;
    // The picker closes and the confirm opens: two surfaces, one decision
    // each, the same shape the sheet-then-confirm flow already has.
    set({ open: false });
    await useInstallFlow.getState().requestEnable({
      name,
      source,
      scope,
      projectRoot,
      agents: sendable.map((t) => ({
        id: t.agentId,
        cliName: t.cliName as string
      })),
      addedNames: added.map((t) => t.agentName)
    });
  },

  findSource() {
    const { name, projectRoot, fleet, onDisk } = get();
    if (name === null) return;
    set({ open: false });
    useInstallFlow.getState().openSheet({
      query: name,
      projectRoot,
      agents: fleet,
      preselect: onDisk
    });
  }
}));
