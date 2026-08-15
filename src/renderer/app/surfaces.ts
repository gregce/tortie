/**
 * The active project's SURFACES, derived once for every session surface that
 * renders them.
 *
 * Three components need the same answer to the same question — "what does this
 * project show, and which of it is selected?": the hoisted session tab strip
 * (top orientation), the terminal region, and the right-hand dock. Until
 * Phase 18 two of them carried a verbatim copy of the derivation, and the
 * copies had already drifted in one place: the dock resolved its selection
 * straight out of `activeSessionByProject`, so a remembered id belonging to a
 * session that had since ended left the dock with nothing selected while the
 * terminal happily fell back to the last session. One derivation, one answer.
 *
 * Nothing here reconciles or persists — the layout store owns that, and
 * TerminalRegion is the single caller that prunes (a hook called by three
 * components must not have three chances to write).
 */

import { useMemo } from 'react';
import type { Project, Session } from '@shared/types';
import { useApp } from '../state/store';
import {
  deriveSurfaces,
  focusedLeafOf,
  surfaceOf,
  useLayout
} from '../state/layout';
import type { Surface } from '../state/layout';

export interface ProjectSurfaces {
  /** The active project, or null when no tab is selected. */
  project: Project | null;
  /** Its sessions, in store order. */
  projectSessions: Session[];
  /** Tabs / rows: one per single session or split group, in layout order. */
  surfaces: Surface[];
  sessionsById: Map<string, Session>;
  /** The surface holding the selection (falls back to the last surface). */
  activeSurface: Surface | null;
  /** The focused leaf inside `activeSurface` ('' when there is none). */
  activeLeafId: string;
  /**
   * The selected session's id, ALWAYS resolved against sessions that exist —
   * a remembered id for a session that has gone falls back to the last one.
   */
  selectedId: string | null;
}

export function useProjectSurfaces(): ProjectSurfaces {
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const activeSessionByProject = useApp((s) => s.activeSessionByProject);
  const layouts = useLayout((s) => s.layouts);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () =>
      project ? sessions.filter((x) => x.projectPath === project.path) : [],
    [sessions, project]
  );

  const remembered =
    activeProjectId !== null
      ? activeSessionByProject[activeProjectId]
      : undefined;
  const selected =
    projectSessions.find((x) => x.id === remembered) ??
    projectSessions[projectSessions.length - 1] ??
    null;

  // Session ids as a stable string: the array identity changes on every store
  // update (status ticks, activity), the ID LIST is what the derivation
  // actually depends on.
  const sessionIdsKey = projectSessions.map((x) => x.id).join(',');
  const surfaces = useMemo(
    () =>
      deriveSurfaces(
        // Phase 38: layouts key by the project's path, which survives a
        // close and reopen. The project row's UUID does not.
        project ? layouts[project.path] : undefined,
        sessionIdsKey === '' ? [] : sessionIdsKey.split(',')
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layouts, project, sessionIdsKey]
  );

  const sessionsById = useMemo(
    () => new Map(projectSessions.map((x) => [x.id, x])),
    [projectSessions]
  );

  const activeSurface = surfaceOf(surfaces, selected?.id ?? null);
  const activeLeafId =
    activeSurface === null
      ? ''
      : focusedLeafOf(
          activeSurface,
          selected?.id ?? null,
          project ? layouts[project.path] : undefined
        );

  return {
    project,
    projectSessions,
    surfaces,
    sessionsById,
    activeSurface,
    activeLeafId,
    selectedId: selected?.id ?? null
  };
}
