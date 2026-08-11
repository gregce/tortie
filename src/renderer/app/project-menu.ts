/**
 * The two ways to get a project (Phase 12.9 item 1), in one list.
 *
 * Both entry points — the + at the end of the tab strip and the native File
 * menu — offer exactly these two verbs, and this module is the only place
 * either is spelled. Before this phase the + went straight to the folder
 * picker, which is why "you can only open something that already exists" was
 * invisible rather than merely true.
 *
 * Native menu, per DESIGN.md §3: gmux never draws a menu in the DOM. Labels
 * are Title Case because that is what every other native menu in the app
 * uses (and what macOS expects); the BUTTONS on the empty state stay in
 * sentence case, which is DESIGN.md §7's rule for buttons.
 */

import { keyDisplay } from '@shared/keymap';
import type { MenuSpec } from '../state/store';
import { useApp } from '../state/store';

/**
 * Items for the + menu. `canCreate` false (an older preload with no
 * projects:create) hides New Project… rather than offering a verb that
 * cannot work.
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
