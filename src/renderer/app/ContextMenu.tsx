/**
 * Context menus — NATIVE ONLY (DESIGN.md §3: context menus are native macOS
 * menus via Electron `Menu.popup`, never DOM-drawn). This module is the one
 * thin helper over the `ui:popupMenu` bridge; every trigger surface (session
 * row, project tab, SCM row, tree row, session strip, settings gear) funnels
 * here through the store's setMenu. The former DOM-rendered fallback menu is
 * gone — when the bridge lacks popupMenu (older preload / non-Electron test
 * environments) the request is a silent no-op.
 */

import type {
  GmuxPopupMenuExtras,
  PopupMenuIcon,
  PopupMenuInput
} from '@shared/ipc';

/**
 * The menu vocabulary lives HERE, with the bridge that consumes it (Phase 42
 * stage 8). It lived in the app store, which made this module import the
 * store while the store's overlays slice imported `showNativeMenu` back — a
 * production import cycle. The store re-exports both types, so every site
 * that imports these names from the state store still works.
 */
export interface MenuItemSpec {
  label: string;
  hint?: string;
  /** Grey second line under the label — prose the hint slot cannot carry. */
  sublabel?: string;
  /** Leading icon; see src/renderer/icons/agent-menu-icon.ts. */
  icon?: PopupMenuIcon;
  destructive?: boolean;
  disabled?: boolean;
  /**
   * Nested items (Phase 39, the explorer's Open With). An item that carries
   * a submenu never fires its own `run`, so give it one that does nothing.
   * Optional, so every existing menu site is unchanged.
   */
  submenu?: (MenuItemSpec | 'sep')[];
  run: () => void;
}

export interface MenuSpec {
  x: number;
  y: number;
  items: (MenuItemSpec | 'sep')[];
}

/**
 * One level of the item array → the bridge's wire shape.
 *
 * `prefix` is what makes a nested id resolvable: a top-level item is
 * `item-3`, and the second entry of its submenu is `item-3-1`. The id that
 * comes back is always a LEAF's, because main gives a parent item no click.
 */
function toPopupItems(
  items: readonly (MenuItemSpec | 'sep')[],
  prefix: string
): PopupMenuInput['items'] {
  return items.map((item, i) =>
    item === 'sep'
      ? { type: 'separator' as const, id: `sep-${prefix}${i}`, label: '' }
      : {
          id: `item-${prefix}${i}`,
          label: item.label,
          enabled: !(item.disabled ?? false),
          ...(item.destructive === true ? { destructive: true } : {}),
          ...(item.hint !== undefined ? { hint: item.hint } : {}),
          ...(item.sublabel !== undefined ? { sublabel: item.sublabel } : {}),
          ...(item.icon !== undefined ? { icon: item.icon } : {}),
          ...(item.submenu !== undefined
            ? { submenu: toPopupItems(item.submenu, `${prefix}${i}-`) }
            : {})
        }
  );
}

/** Walk `item-3-1` back to the spec whose `run()` the user asked for. */
function resolvePicked(
  items: readonly (MenuItemSpec | 'sep')[],
  id: string
): MenuItemSpec | null {
  let level: readonly (MenuItemSpec | 'sep')[] = items;
  let picked: MenuItemSpec | null = null;
  for (const part of id.slice('item-'.length).split('-')) {
    const found = level[Number(part)];
    if (found === undefined || found === 'sep') return null;
    picked = found;
    level = found.submenu ?? [];
  }
  return picked;
}

/**
 * Show a native context menu for `menu` and run the picked item's callback.
 * Resolves after the menu closes (dismissal runs nothing).
 */
export function showNativeMenu(menu: MenuSpec): void {
  const popup = (
    window.gmux as unknown as GmuxPopupMenuExtras | undefined
  )?.popupMenu;
  if (typeof popup !== 'function') return;

  const input: PopupMenuInput = {
    x: Math.round(menu.x),
    y: Math.round(menu.y),
    items: toPopupItems(menu.items, '')
  };

  void popup(input).then(
    (id) => {
      if (id === null || !id.startsWith('item-')) return;
      resolvePicked(menu.items, id)?.run();
    },
    () => {
      // Popup failed in main — treat as dismissed; menus never DOM-render.
    }
  );
}
