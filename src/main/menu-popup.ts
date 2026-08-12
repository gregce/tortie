/**
 * The native macOS context-menu bridge, moved VERBATIM out of `src/main/ipc.ts`
 * by Phase 16 (L1). Only the imports, the `export` on the registrar and its one
 * call site — `handle(ipcMain, …)`, THE typed wrapper, where the file it came
 * from used its own ipcMain-bound shorthand over the same function — are new.
 * The section banner below is the original.
 */

import { BrowserWindow, ipcMain, Menu, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import type { PopupMenuIcon } from '@shared/ipc';
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
 * A renderer-rasterized menu icon → NativeImage at 16pt.
 *
 * The PNG arrives at 32×32 physical pixels; scaleFactor 2 is what makes it a
 * 16pt image rather than a 32pt one. Template images let macOS tint the alpha
 * for light/dark, highlight and disabled — which is the whole reason the
 * monochrome marks look right greyed out.
 */
function menuIcon(icon: PopupMenuIcon | undefined): Electron.NativeImage | null {
  if (icon === undefined) return null;
  const comma = icon.dataUrl.indexOf(',');
  if (!icon.dataUrl.startsWith('data:image/png;base64,') || comma < 0) return null;
  try {
    const img = nativeImage.createFromBuffer(
      Buffer.from(icon.dataUrl.slice(comma + 1), 'base64'),
      { scaleFactor: 2 }
    );
    if (img.isEmpty()) return null;
    if (icon.template) img.setTemplateImage(true);
    return img;
  } catch {
    // A bad icon must never cost the user their menu.
    return null;
  }
}

export function registerPopupMenuHandler(): void {
  handle(
    ipcMain,
    'ui:popupMenu',
    (event, input): Promise<string | null> =>
      new Promise((resolve) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) {
          resolve(null);
          return;
        }
        let clicked: string | null = null;
        const template: MenuItemConstructorOptions[] = input.items.map(
          (item) => {
            if (item.type === 'separator') {
              return { type: 'separator' as const };
            }
            const accelerator = hintToAccelerator(item.hint);
            const icon = menuIcon(item.icon);
            return {
              label: item.label,
              enabled: item.enabled ?? true,
              // `destructive` has no native Electron menu treatment; the
              // confirm dialogs behind those items carry the red styling.
              ...(accelerator !== null ? { accelerator } : {}),
              ...(item.sublabel !== undefined ? { sublabel: item.sublabel } : {}),
              ...(icon !== null ? { icon } : {}),
              click: (): void => {
                clicked = item.id;
              }
            };
          }
        );
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
