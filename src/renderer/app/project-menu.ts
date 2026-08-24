/**
 * The four ways to get a project (Phase 12.9 item 1, third verb Phase 18.6,
 * fourth verb Phase 90.3), in one list and in one order.
 *
 * This module is the only place the + at the end of the tab strip spells them.
 * Before Phase 12.9 the + went straight to the folder picker, which is why
 * "you can only open something that already exists" was invisible rather than
 * merely true.
 *
 * THE FILE MENU IS NOT FED FROM HERE, and research 35 §1.8 is wrong about the
 * tree when it says it is. The native menu is built in main (src/main/menu.ts)
 * from ids, because main owns the accelerators and the renderer is not running
 * when the menu is first installed. So the ORDER below is the contract those
 * two surfaces share, and File carries the same four verbs in the same order
 * by matching it. If a fifth verb is ever added, add it in both.
 *
 * PHASE 90.3 FIX ROUND added the fourth. Phase 90.3 put Open Folder on a
 * Machine… in the File menu and not here, so the + at the end of the tab strip
 * offered three verbs while File offered four, and the only route to a folder
 * on another machine was the menu bar.
 *
 * Native menu, per DESIGN.md §3: gmux never draws a menu in the DOM. Labels
 * are Title Case because that is what every other native menu in the app
 * uses (and what macOS expects); the BUTTONS on the empty state stay in
 * sentence case, which is DESIGN.md §7's rule for buttons.
 */

import { keyDisplay } from '@shared/keymap';
import { cloneAction } from '../state/clone';
import { OPEN_REMOTE_FOLDER_MENU_ITEM } from '../machines/project-tab';
import type { MenuSpec } from '../state/store';
import { useApp } from '../state/store';

/**
 * Items for the + menu. `canCreate` false (an older preload with no
 * projects:create) hides New Project… rather than offering a verb that
 * cannot work, and `cloneAction()` returning undefined hides Clone the same
 * way for a preload with no projects:clone.
 *
 * Clone carries no hint because it has no chord, and it never gets one: every
 * built-in chord is one the user can no longer record as a per-agent hotkey,
 * which is a bad trade for a weekly action (research 35 §0).
 */
export function projectMenuItems(canCreate: boolean): MenuSpec['items'] {
  const s = useApp.getState();
  const items: MenuSpec['items'] = [
    {
      label: 'Open Project…',
      hint: keyDisplay('project.open'),
      run: () => void s.openProject()
    }
  ];
  if (canCreate) {
    items.push({
      label: 'New Project…',
      hint: keyDisplay('project.new'),
      run: () => s.setNewProjectOpen(true)
    });
  }
  // PHASE 90.3 FIX ROUND. The fourth verb. It sits after the two verbs that
  // reach a folder on this Mac and before Clone Repository…, which is the
  // position the File menu gives it. The label is the one constant both
  // surfaces read, so the two cannot drift.
  //
  // TWO CONDITIONS, and they are the two the File menu already applies. The
  // preload has to carry `projects:addRemote`, and at least one machine has to
  // be confirmed. A row that opens a sheet with an empty list would spend a
  // person a click to learn nothing. `refused` is main's word for a machine
  // nobody has confirmed, so a list holding only those rows counts as none.
  if (
    s.canAddRemoteProject() &&
    s.machineStates.some((one) => one.link !== 'refused')
  ) {
    items.push({
      label: OPEN_REMOTE_FOLDER_MENU_ITEM,
      run: () => s.setRemoteProjectOpen(true)
    });
  }
  const clone = cloneAction();
  if (clone !== undefined) {
    items.push({ label: 'Clone Repository…', run: clone });
  }
  return items;
}

/** Show the + menu at a screen position (the button's bottom-left corner). */
export function showProjectMenu(x: number, y: number): void {
  const s = useApp.getState();
  const items = projectMenuItems(s.canCreateProject());
  // One verb is not a menu: with projects:create missing, + keeps its
  // original behavior and opens the picker directly.
  if (items.length < 2) {
    void s.openProject();
    return;
  }
  s.setMenu({ x, y, items });
}
