/**
 * What a project surface draws, derived once (Phase 129).
 *
 * Two surfaces now show the same list of projects: the strip across the top of
 * the window (./Titlebar.tsx) and the rail down its left side
 * (./ProjectRail.tsx). Before this phase the derivation lived inside the
 * titlebar's own `useMemo`, and a second surface would have meant a second
 * copy of it. A second copy is how two surfaces come to disagree about which
 * sessions roll up into a project's dot, which is exactly the defect Phase
 * 90.3 fixed once already.
 *
 * So the derivation lives here, both surfaces call `useProjectTabs()`, and the
 * order it returns is the tab order — which is also the order ⌘1 to ⌘9 count
 * in (./project-shortcuts.ts).
 *
 * Nothing here reads or writes a session's status. It rolls statuses up for a
 * dot and counts the ones that need input, and that is all.
 */

import { useMemo } from 'react';
import type { Project, SessionStatus } from '@shared/types';
import { MACHINE_DEFAULT_COLOR } from '@shared/machines';
import {
  isLocalTarget,
  sameTarget,
  targetOfProject,
  targetOfSession
} from '@shared/workspace-target';
import { badgeMachineOf, effectiveStatusOf, sortProjects, useApp } from '../state/store';
import { remoteTabTooltip } from '../machines/presentation';
import { rollupDot } from './status';
import type { DotKind } from './status';

export interface TabData {
  project: Project;
  dot: DotKind | 'none';
  attentionCount: number;
  /** How many sessions roll up into this project, needing input or not. */
  sessionCount: number;
  /**
   * PHASE 90.3. The machine this tab's files are on, or null for this Mac.
   *
   * A tab on this Mac draws nothing, for the reason every other surface draws
   * nothing: the computer in front of the person is not a special case that
   * needs announcing. A tab for a folder on another machine says which one, in
   * that machine's own label and colour, because two tabs can otherwise carry
   * the same folder name and mean different computers.
   */
  machine: ReturnType<typeof badgeMachineOf> | null;
  /** The tooltip, composed once where the machine's label is in hand. */
  title: string;
}

/** The open projects, in tab order, with everything a row or a tab draws. */
export function useProjectTabs(): TabData[] {
  const projects = useApp((s) => s.projects);
  const tabOrder = useApp((s) => s.tabOrder);
  const sessions = useApp((s) => s.sessions);
  const machineStates = useApp((s) => s.machineStates);

  return useMemo<TabData[]>(() => {
    const ordered = sortProjects(projects, tabOrder);
    return ordered.map((project) => {
      // PHASE 90.3. The PAIR decides which sessions this tab rolls up. A bare
      // path comparison added another machine's sessions into a local tab's
      // dot and badge whenever the two folders had the same path.
      const target = targetOfProject(project);
      const statuses: SessionStatus[] = [];
      let attentionCount = 0;
      for (const sess of sessions) {
        if (!sameTarget(targetOfSession(sess), target)) continue;
        const status = effectiveStatusOf(sess);
        statuses.push(status);
        if (status === 'needs_input') attentionCount++;
      }
      const state = isLocalTarget(target)
        ? undefined
        : machineStates.find((one) => one.id === project.machineId);
      // A machine a person removed while its tab was still open has no state
      // row. The tab keeps its badge, drawn from the id, so a person can read
      // which tab to close rather than seeing the tab lose its only mark.
      const machine = isLocalTarget(target)
        ? null
        : state !== undefined
          ? badgeMachineOf(state)
          : {
              id: project.machineId ?? '',
              label: project.machineId ?? '',
              color: MACHINE_DEFAULT_COLOR,
              answering: false,
              canRestore: false,
              restoreReason: null
            };
      // Every sentence about a machine comes from ../machines/presentation.ts, which is
      // the one file the vocabulary audit reads.
      const title =
        machine === null
          ? project.path
          : remoteTabTooltip(project.name, project.path, machine.label);
      return {
        project,
        dot: rollupDot(statuses),
        attentionCount,
        sessionCount: statuses.length,
        machine,
        title
      };
    });
  }, [projects, tabOrder, sessions, machineStates]);
}
