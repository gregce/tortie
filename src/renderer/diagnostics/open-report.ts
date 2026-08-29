/**
 * The one way the DIAGNOSTICS REPORT TAB opens (Phase 163).
 *
 * Two doors, one mechanism. Help > Diagnostics Report sends the action to
 * the app window; the row in Settings asks main to send that same action.
 * Both land in the menu dispatcher, which calls this. The request goes over
 * the ordinary open file bus with a `diagnostics` field, which the editor
 * keys `diagnostics:report`, so the whole app has one report tab and a
 * second ask FOCUSES it. That focus is the editor store's own existing id
 * path and nothing here re-implements it.
 *
 * NOTHING HERE STARTS A PROCESS AND NOTHING HERE READS A FILE. The tab body
 * asks main for one capture when it mounts, and asks again only when a
 * person presses the button.
 */

import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';

/** Open the report tab, or focus it when it is already open. */
export function openDiagnosticsReport(): void {
  // The tab is not a reading of any repository, but every tab carries a
  // repository root, and the panel shows the tabs of the ACTIVE project. So
  // the tab is filed under the project a person is looking at, and an app
  // with no local project open files it under an empty root, which the
  // panel shows under its own catch all.
  const s = useApp.getState();
  const project = s.projects.find((p) => p.id === s.activeProjectId) ?? null;
  const repoPath = localPathOf(targetOfProject(project)) ?? '';
  requestOpenFile({
    repoPath,
    relPath: '',
    path: repoPath,
    mode: 'file',
    source: 'tree',
    // For keeps, never the recycled preview slot: a person asked for the
    // report by name, and the next single click on a tree row must not
    // replace it.
    preview: false,
    diagnostics: { kind: 'report' }
  });
}
