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
 * PHASE 92: A ROW CAN NAME ANOTHER MACHINE. The rows come from
 * `visibleRecents()`, which is the same function `recents:list` answers with,
 * so this menu and the home screen always list the same set. A row on another
 * machine says which machine in its sublabel and its tooltip, and its click
 * carries the machine as well as the path.
 *
 * A REMOTE ROW'S PATH IS NEVER REWRITTEN TO `~`. The tilde here would be THIS
 * Mac's home directory, and `/Users/gdc` on another machine may be another
 * person's account. So the shortening runs for a local row only, which is what
 * the second argument to `parentForDisplay` decides.
 *
 * Ownership: src/main/recents/**.
 */

import { homedir } from 'node:os';
import { dirname } from 'node:path';
import type { MenuItemConstructorOptions } from 'electron';
import type { MenuActionWithFind } from '@shared/ipc';
import { OPEN_RECENT_ON_PREFIX, OPEN_RECENT_PREFIX } from '@shared/ipc';
import { isLocalRecent, recentMachineOf } from './store';
import { recentMachineLabel, visibleRecents } from './visible';

/**
 * How many rows the menu shows. Five on the home screen, ten here. The menu is
 * the longer list because it is the one place the older rows can be reached.
 */
export const OPEN_RECENT_MENU_MAX = 10;

/** What the menu should do, supplied by src/main/menu.ts. */
export interface OpenRecentHandlers {
  /**
   * The user chose a row. The path is absolute, on the machine named second.
   *
   * PHASE 92: `machineId` is omitted for a folder on this Mac, which is every
   * row a build before this release could write, so the local case reads the
   * same as it always did.
   */
  open(path: string, machineId?: string): void;
  /** The user chose Clear Menu. */
  clear(): void;
}

/**
 * Home-relative parent folder, e.g. "~/src" for "/Users/me/src/webapp".
 *
 * The shortening runs for a folder on THIS Mac only. `homedir()` is this Mac's
 * home directory, so rewriting another machine's path with it would print a
 * tilde that stands for the wrong account on the wrong computer.
 */
function parentForDisplay(path: string, local: boolean): string {
  const parent = dirname(path);
  if (!local) return parent;
  const home = homedir();
  if (parent === home) return '~';
  if (parent.startsWith(`${home}/`)) return `~${parent.slice(home.length)}`;
  return parent;
}

/**
 * The menu action id for one recent row, which is the whole payload.
 *
 * It is HERE and not in src/main/menu.ts so a test can pin the exact string
 * without building a native menu. The renderer splits the remote form at the
 * FIRST colon, and it can do that safely because a machine id can never hold
 * one.
 */
export function openRecentActionId(
  path: string,
  machineId?: string
): MenuActionWithFind {
  return machineId === undefined
    ? `${OPEN_RECENT_PREFIX}${path}`
    : `${OPEN_RECENT_ON_PREFIX}${machineId}:${path}`;
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
  const rows = visibleRecents().slice(0, OPEN_RECENT_MENU_MAX);
  const submenu: MenuItemConstructorOptions[] = rows.map((row) => {
    const local = isLocalRecent(row);
    const parent = parentForDisplay(row.path, local);
    // `visibleRecents` has already dropped every row whose machine has gone, so
    // a label is there for every remote row that reaches this line. The null
    // branch exists because a lookup can answer null, and it falls back to the
    // local shape rather than printing an id a person never chose.
    const label = local ? null : recentMachineLabel(recentMachineOf(row));
    return {
      label: row.name,
      // Two projects can share a name, and the parent is what tells them apart.
      // A row on another machine says which machine as well, because two
      // machines can hold the same path under the same parent.
      sublabel: label === null ? parent : `${parent} on ${label}`,
      toolTip: label === null ? row.path : `${row.path} on ${label}`,
      click: () => {
        if (local) handlers.open(row.path);
        else handlers.open(row.path, recentMachineOf(row));
      }
    };
  });
  if (submenu.length > 0) submenu.push({ type: 'separator' });
  submenu.push({
    label: 'Clear Menu',
    enabled: rows.length > 0,
    click: () => handlers.clear()
  });
  return { label: 'Open Recent', submenu };
}
