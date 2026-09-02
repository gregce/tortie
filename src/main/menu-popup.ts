/**
 * The native macOS context-menu bridge, moved VERBATIM out of `src/main/ipc.ts`
 * by Phase 16 (L1). Only the imports, the `export` on the registrar and its one
 * call site — `handle(ipcMain, …)`, THE typed wrapper, where the file it came
 * from used its own ipcMain-bound shorthand over the same function — are new.
 * The section banner below is the original.
 */

import { BrowserWindow, ipcMain, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import type { PopupMenuItem } from '@shared/ipc';
// PHASE 156. The decode used to live in this file. The menu bar and the tray
// now need the same ten lines, so it moved to the one module all three read.
import { menuIcon } from './native-menu-icon';
import { handle } from './typed-ipc';

// ---------------------------------------------------------------------------
// ui:popupMenu — native macOS context menus (DESIGN.md §3: context menus are
// native Menu.popup, never DOM-drawn). The renderer's store translates its
// MenuSpec into PopupMenuInput; the resolved item id (null when dismissed)
// maps back to the item's run() callback renderer-side.
// ---------------------------------------------------------------------------

/**
 * Display-only shortcut hint → Electron accelerator (e.g. "F2", "⌘W" →
 * "Cmd+W"). Popup-menu accelerators are never registered globally — they
 * only render the keycap and fire while the menu is open, which matches the
 * native context-menu convention. Unmappable hints are simply dropped.
 */
function hintToAccelerator(hint: string | undefined): string | null {
  if (hint === undefined || hint.length === 0) return null;
  const acc = hint
    .replace(/⌘/g, 'Cmd+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌥/g, 'Alt+')
    .replace(/⌃/g, 'Ctrl+')
    .replace(/↩|⏎/g, 'Return');
  return /^([A-Za-z]+\+)*[A-Za-z0-9]+$/.test(acc) ? acc : null;
}

/**
 * The item array → Electron's menu template. Extracted from the handler in
 * Phase 39 and kept PURE (its only outside contact is `onClick`, which it
 * merely stores) so a unit test can prove the nesting: `Menu.popup` opens an
 * OS-owned window that `capturePage` cannot photograph, so the template is
 * the only place the submenu's shape can be read back.
 *
 * An item that carries a submenu recurses and gets NO click of its own: on
 * macOS a parent item does not fire, and giving it one would let a stray id
 * come back that maps to no leaf.
 */
export function toMenuTemplate(
  items: readonly PopupMenuItem[],
  onClick: (id: string) => void
): MenuItemConstructorOptions[] {
  return items.map((item) => {
    if (item.type === 'separator') {
      return { type: 'separator' as const };
    }
    const accelerator = hintToAccelerator(item.hint);
    const icon = menuIcon(item.icon);
    const base = {
      label: item.label,
      enabled: item.enabled ?? true,
      // `destructive` has no native Electron menu treatment; the
      // confirm dialogs behind those items carry the red styling.
      ...(accelerator !== null ? { accelerator } : {}),
      ...(item.sublabel !== undefined ? { sublabel: item.sublabel } : {}),
      ...(icon !== null ? { icon } : {})
    };
    if (item.submenu !== undefined) {
      return { ...base, submenu: toMenuTemplate(item.submenu, onClick) };
    }
    return {
      ...base,
      click: (): void => {
        onClick(item.id);
      }
    };
  });
}

/**
 * PHASE 198 harness knob, shot mode only. `Menu.popup` opens an OS owned
 * window that no drive can click and `capturePage` cannot photograph, so a
 * probe that must run a context menu row on the shipped path had no way to
 * choose one. Under GMUX_SHOT with GMUX_SHOT_POPUP_PICK=<label>, a popup is
 * answered with the id of the row wearing that label instead of being
 * raised, and every label the menu carried is printed on one line, so the
 * script that set the knob can read that the row it picked was OFFERED and
 * not only run. A normal launch has no GMUX_SHOT and reads none of this;
 * `undefined` means the popup is raised as it always was.
 */
function harnessPick(items: readonly PopupMenuItem[]): string | null | undefined {
  const pick = process.env['GMUX_SHOT_POPUP_PICK'];
  if (pick === undefined || pick === '') return undefined;
  if (process.env['GMUX_SHOT'] === undefined) return undefined;
  const labels: string[] = [];
  let id: string | null = null;
  const walk = (list: readonly PopupMenuItem[]): void => {
    for (const item of list) {
      if (item.type === 'separator') continue;
      labels.push(item.label);
      if (item.submenu !== undefined) {
        walk(item.submenu);
        continue;
      }
      if (id === null && item.label === pick) id = item.id;
    }
  };
  walk(items);
  console.log(`[gmux-shot] popup-pick ${JSON.stringify({ pick, id, labels })}`);
  return id;
}

export function registerPopupMenuHandler(): void {
  handle(
    ipcMain,
    'ui:popupMenu',
    (event, input): Promise<string | null> =>
      new Promise((resolve) => {
        const picked = harnessPick(input.items);
        if (picked !== undefined) {
          resolve(picked);
          return;
        }
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) {
          resolve(null);
          return;
        }
        let clicked: string | null = null;
        const template = toMenuTemplate(input.items, (id) => {
          clicked = id;
        });
        Menu.buildFromTemplate(template).popup({
          window: win,
          x: Math.round(input.x),
          y: Math.round(input.y),
          // close-callback can fire before a queued click handler — give the
          // click one macrotask to land before resolving.
          callback: () => {
            setImmediate(() => resolve(clicked));
          }
        });
      })
  );
}
