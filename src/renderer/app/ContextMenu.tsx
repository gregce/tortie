/**
 * Context menus — NATIVE ONLY (DESIGN.md §3: context menus are native macOS
 * menus via Electron `Menu.popup`, never DOM-drawn). This module is the one
 * thin helper over the `ui:popupMenu` bridge; every trigger surface (session
 * row, project tab, SCM row, tree row, session strip, settings gear) funnels
 * here through the store's setMenu. The former DOM-rendered fallback menu is
 * gone — when the bridge lacks popupMenu (older preload / non-Electron test
 * environments) the request is a silent no-op.
 */

import type { PopupMenuInput } from '@shared/ipc';
import type { MenuItemSpec, MenuSpec } from '../menus/spec';
import { gmuxBridge } from '../bridge';

/**
 * The menu vocabulary lives in src/renderer/menus/spec.ts (Phase 127). It
 * lived in the app store, which made this module import the store while the
 * store's overlays slice imported `showNativeMenu` back, being a production
 * import cycle. Phase 42 stage 8 moved it here, beside the bridge that
 * consumes it. Phase 127 moved it one step lower, because the store names
 * `MenuSpec` in the type of `setMenu` and the store may not name the app
 * shell. The store still re-exports both names, so every site that imports
 * them from the state store is unchanged.
 */

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
  const popup = gmuxBridge()?.popupMenu;
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
