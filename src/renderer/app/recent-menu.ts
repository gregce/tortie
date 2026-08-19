/**
 * The context menu on a recent project row (research 35 §1.9).
 *
 * A separate module for the same reason ./project-menu.ts is one: the shape
 * of a menu is the part that regresses silently, and a pure builder is the
 * part a test can hold. HomeScreen hands it the row and four callbacks, and
 * it decides which items exist.
 *
 * Native, through the ui:popupMenu bridge (DESIGN.md §3). Tortie never draws
 * a menu in the DOM, so nothing here renders anything. Labels are Title Case,
 * matching every other native menu in the app.
 */

import type { MenuItemSpec } from '../state/store';

/** The row the menu was opened on. */
export interface RecentMenuTarget {
  path: string;
  /** True once the existence check has found the folder gone. */
  missing?: boolean;
  /**
   * PHASE 92. True when the folder is on another machine.
   *
   * It is a separate field from `missing` because the two answer different
   * questions. `missing` says Tortie looked here and found nothing. `remote`
   * says the folder is not on this Mac at all, so nothing here ever looked.
   */
  remote?: boolean;
}

export interface RecentMenuActions {
  open(): void;
  reveal(): void;
  copyPath(): void;
  remove(): void;
}

/**
 * `canReveal` is the fs bridge's own capability, so an older preload with no
 * fs.reveal hides the item rather than offering one that throws on click.
 * A missing folder hides it too, because there is nothing to reveal. Remove
 * from Recent always stays, because a row pointing at a folder that is gone
 * is the row the user most wants to be rid of.
 *
 * PHASE 92 ADDED THE THIRD REASON TO HIDE IT. A folder on another machine is
 * not on this Mac, so Finder has nothing to show. Copy Path stays, and it
 * copies the path exactly as that machine states it. Open stays, and it asks
 * that machine. Remove from Recent stays for the reason above.
 */
export function recentMenuItems(
  target: RecentMenuTarget,
  actions: RecentMenuActions,
  canReveal: boolean
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [
    { label: 'Open', run: () => actions.open() }
  ];
  if (target.missing !== true && target.remote !== true && canReveal) {
    items.push({ label: 'Reveal in Finder', run: () => actions.reveal() });
  }
  items.push({ label: 'Copy Path', run: () => actions.copyPath() });
  items.push('sep');
  items.push({ label: 'Remove from Recent', run: () => actions.remove() });
  return items;
}
