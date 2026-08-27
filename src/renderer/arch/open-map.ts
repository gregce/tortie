/**
 * The one way the ARCHITECTURE MAP TAB opens (Phase 160).
 *
 * The operator's surface ruling is the whole design here: the map does not
 * live in the sidebar. It opens as a full size tab in the editor area, the
 * pane is the cockpit that opens it, and this module is the single door both
 * the cockpit control and the View menu row go through, so the two gestures
 * cannot drift.
 *
 * It goes over the ordinary open file bus with an `archMap` request, which the
 * editor keys `arch-map:<repoPath>`. One repository has one map tab, so the
 * second press of either gesture FOCUSES the tab that is already open rather
 * than opening a twin. That focus behaviour is the editor store's own
 * existing-id path and nothing here re-implements it.
 *
 * NOTHING HERE STARTS A PROCESS AND NOTHING HERE READS A FILE. The request
 * carries a repository path and the map body asks main for the model when it
 * mounts.
 */

import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';

/** Open the map tab for one repository, or focus it when it is already open. */
export function openArchMap(repoPath: string): void {
  requestOpenFile({
    repoPath,
    // The tab is a reading of the whole repository, not of a file in it. The
    // path is the repository root so the tab needs no invented file name, and
    // the relative path is empty because there is nothing it could name.
    relPath: '',
    path: repoPath,
    mode: 'file',
    source: 'tree',
    // For keeps, never the recycled preview slot: a person asked for the map
    // by name, and the next single click on a tree row must not replace it.
    preview: false,
    archMap: { repoPath }
  });
}

/**
 * The View menu row's body: the map of the ACTIVE project, or nothing when
 * the active project is not a folder on this computer. A menu click with no
 * local repository has nowhere to draw, and doing nothing is honest where
 * inventing a toast for an edge the pane already explains would not be.
 */
export function openArchMapForActiveProject(): void {
  const s = useApp.getState();
  const project = s.projects.find((p) => p.id === s.activeProjectId) ?? null;
  const repoPath = localPathOf(targetOfProject(project));
  if (repoPath !== null) openArchMap(repoPath);
}
