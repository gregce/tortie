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

import { rootKeyOf, targetOfProject } from '@shared/workspace-target';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { useArch } from './store';
import type { ArchMapInnerTab } from './store';
// Phase 175. The Architecture switch, read at the one door below.
import { archSurfacesOn, useSettingsStore } from '../settings/settings-store';

/**
 * Open the map tab for one repository, or focus it when it is already open.
 *
 * PHASE 234. The argument is the repository KEY, being `rootKeyOf` of the
 * project's target. A folder on this Mac keys as its own absolute path, so the
 * tab id, the request and the tooltip are byte for byte what they were; a
 * folder on a machine keys as `machine:<id>:<path>` and gets a tab of its own
 * that cannot collide with a same-named folder here.
 */
export function openArchMap(
  repoKey: string,
  // PHASE 258. Which of the map tab's three inner tabs to land on. The tab
  // is view state in the arch store, so the second ask focuses the ONE map
  // tab the editor already holds and the inner tab switches under it; the
  // request carries the same word so the intent is on the bus too.
  tab: ArchMapInnerTab = 'map'
): void {
  // Phase 175. The map refuses while Architecture is off in Settings. This
  // is the single door every gesture goes through, so the View menu row, a
  // queued `show-arch-map` and the pane's own control are all refused here
  // in one line.
  if (!archSurfacesOn()) return;
  useArch.getState().setMapTab(repoKey, tab);
  requestOpenFile({
    repoPath: repoKey,
    // The tab is a reading of the whole repository, not of a file in it. The
    // path is the repository root so the tab needs no invented file name, and
    // the relative path is empty because there is nothing it could name.
    relPath: '',
    path: repoKey,
    mode: 'file',
    source: 'tree',
    // For keeps, never the recycled preview slot: a person asked for the map
    // by name, and the next single click on a tree row must not replace it.
    preview: false,
    archMap: { repoPath: repoKey, tab }
  });
}

/**
 * The View menu row's body: the map of the ACTIVE project, on whichever
 * computer its folder is on (Phase 234), or nothing when there is no project.
 *
 * Until this phase it refused a folder on a machine, because the map could not
 * be drawn for one. It can, so the row does what it says on either computer.
 */
export function openArchMapForActiveProject(tab: ArchMapInnerTab = 'map'): void {
  const s = useApp.getState();
  const project = s.projects.find((p) => p.id === s.activeProjectId) ?? null;
  const target = targetOfProject(project);
  if (target !== null) openArchMap(rootKeyOf(target), tab);
}

/**
 * PHASE 175 FIX ROUND. Close every map tab that is already open.
 *
 * The opener refusing is only half the promise. A map tab opened while the
 * switch was ON is a full size Architecture surface with an Architecture tab
 * row, and before this it stayed on screen and stayed live after the person
 * turned Architecture off: the rail mark went, the three menu rows went, the
 * Architecture PANE went, and the tab did not. This is the tab's version of
 * what `effectiveSidebarView` does for the pane.
 *
 * `forceCloseTab` rather than `closeTab`, and there is no prompt to lose: a
 * map tab can never be dirty, because `markDirty` refuses it by name.
 */
export function closeArchMapTabs(): void {
  const editor = useEditor.getState();
  // The snapshot is taken first; every close replaces the array.
  for (const tab of editor.tabs) {
    if (tab.archMap !== undefined) editor.forceCloseTab(tab.id);
  }
}

/**
 * PHASE 175 FIX ROUND. Watch the switch and take the map tab away with
 * everything else the moment it goes off. Returns the unsubscribe.
 *
 * The shell installs this once at boot beside `watchSettings`, so the whole
 * surface appears and vanishes in one session, which is what the phase
 * claimed and what the tab made untrue. It also sweeps once at install, so a
 * map tab that ever reaches a window whose switch is already off cannot sit
 * there either.
 */
export function watchArchSurfaceOff(): () => void {
  let on = archSurfacesOn();
  if (!on) closeArchMapTabs();
  return useSettingsStore.subscribe((state) => {
    const next = state.settings.arch.enabled;
    if (next === on) return;
    on = next;
    if (!next) closeArchMapTabs();
  });
}
