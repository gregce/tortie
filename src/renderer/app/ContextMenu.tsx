/**
 * Context menus — NATIVE ONLY (DESIGN.md §3: context menus are native macOS
 * menus via Electron `Menu.popup`, never DOM-drawn). This module is the one
 * thin helper over the `ui:popupMenu` bridge; every trigger surface (session
 * row, project tab, SCM row, tree row, session strip, settings gear) funnels
 * here through the store's setMenu. The former DOM-rendered fallback menu is
 * gone — when the bridge lacks popupMenu (older preload / non-Electron test
 * environments) the request is a silent no-op.
 */

import type { GmuxPopupMenuExtras, PopupMenuInput } from '@shared/ipc';
import type { MenuSpec } from '../state/store';

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
    items: menu.items.map((item, i) =>
      item === 'sep'
        ? { type: 'separator' as const, id: `sep-${i}`, label: '' }
        : {
            id: `item-${i}`,
            label: item.label,
            enabled: !(item.disabled ?? false),
            ...(item.destructive === true ? { destructive: true } : {}),
            ...(item.hint !== undefined ? { hint: item.hint } : {})
          }
    )
  };

  void popup(input).then(
    (id) => {
      if (id === null || !id.startsWith('item-')) return;
      const picked = menu.items[Number(id.slice('item-'.length))];
      if (picked !== undefined && picked !== 'sep') picked.run();
    },
    () => {
      // Popup failed in main — treat as dismissed; menus never DOM-render.
    }
  );
}
