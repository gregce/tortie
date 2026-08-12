/**
 * `File > Open Recent`, built from the recents store.
 *
 * WHY THIS IS THE ONLY "VIEW ALL" (research 35 section 1.9). The home screen
 * shows five rows and has no "View all" control. A second list surface would
 * be new UI for a rare need. The native menu is where a Mac user already looks
 * for the rest of the list, and it works from inside a project as well, where
 * the home screen is not on screen at all.
 *
 * THIS MODULE RETURNS DATA AND NOTHING ELSE. It does not know how the
 * application opens a project and it does not import the menu. `src/main/menu.
 * ts` passes in what to do, splices the one item this returns into the File
 * submenu, and keeps every decision about how a menu click reaches the
 * renderer in the one file that already makes it.
 *
 * A ROW WHOSE FOLDER IS GONE IS STILL LISTED. The menu is built in one
 * synchronous pass and statting ten paths on every rebuild would put the
 * filesystem in the way of opening a menu. Choosing a folder that has gone
 * fails at `projects:add` with "That folder does not exist.", which is the
 * message the user would get from any other route to the same folder. The home
 * screen is the surface that marks the row before it is clicked.
 *
 * Ownership: src/main/recents/**.
 */

import { homedir } from 'node:os';
import { dirname } from 'node:path';
import type { MenuItemConstructorOptions } from 'electron';
import { listRecents } from './store';

/**
 * How many rows the menu shows. Five on the home screen, ten here. The menu is
 * the longer list because it is the one place the older rows can be reached.
 */
export const OPEN_RECENT_MENU_MAX = 10;

/** What the menu should do, supplied by src/main/menu.ts. */
export interface OpenRecentHandlers {
  /** The user chose a row. The path is absolute. */
  open(path: string): void;
  /** The user chose Clear Menu. */
  clear(): void;
}

/** Home-relative parent folder, e.g. "~/src" for "/Users/me/src/webapp". */
function parentForDisplay(path: string): string {
  const parent = dirname(path);
  const home = homedir();
  if (parent === home) return '~';
  if (parent.startsWith(`${home}/`)) return `~${parent.slice(home.length)}`;
  return parent;
}

/**
 * The `Open Recent` item, ready to splice into the File submenu.
 *
 * Titles are Title Case here and sentence case on the home screen. That is not
 * an inconsistency. macOS menu titles are Title Case, and every other item in
 * this application's menus already follows that, so `Clear Menu` is the string
 * a Mac user expects to read.
 *
 * An empty list renders the macOS shape, which is a submenu holding one
 * disabled `Clear Menu`. There is no "No recent projects" row, because macOS
 * does not write one and the disabled item already says the list is empty.
 */
export function openRecentMenuItem(
  handlers: OpenRecentHandlers
): MenuItemConstructorOptions {
  const rows = listRecents().slice(0, OPEN_RECENT_MENU_MAX);
  const submenu: MenuItemConstructorOptions[] = rows.map((row) => ({
    label: row.name,
    // Two projects can share a name, and the parent is what tells them apart.
    sublabel: parentForDisplay(row.path),
    toolTip: row.path,
    click: () => handlers.open(row.path)
  }));
  if (submenu.length > 0) submenu.push({ type: 'separator' });
  submenu.push({
    label: 'Clear Menu',
    enabled: rows.length > 0,
    click: () => handlers.clear()
  });
  return { label: 'Open Recent', submenu };
}
