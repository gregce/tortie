/**
 * gmux native macOS application menu (DESIGN.md §2.1: the menu bar mirrors
 * every shortcut — shortcuts must exist in the menu to be native).
 *
 * Two hard requirements this menu exists to satisfy:
 *  - ⌘W must NEVER close the window (it would kill the single-window app);
 *    it means "close the focused editor tab", forwarded to the renderer.
 *  - A standard Edit menu (native roles) so ⌘C/⌘V/⌘X/⌘A work inside the
 *    terminal and every input.
 *
 * Menu accelerators fire before the renderer sees the keydown, so every
 * registered item forwards a MenuActionId over EVT_MENU_ACTION; the
 * renderer's own keydown map stays as fallback for chords not registered
 * here (⌘1…⌘9, ⌘⇧]/⌘⇧[, ⌘↩ commit — those stay renderer-side on purpose:
 * they are context-sensitive or would bloat the menu).
 */

import { app, BrowserWindow, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { EVT_MENU_ACTION } from '@shared/ipc';
import type { MenuActionId } from '@shared/ipc';

function sendAction(action: MenuActionId): void {
  const win =
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  win?.webContents.send(EVT_MENU_ACTION, action);
}

function item(
  label: string,
  action: MenuActionId,
  accelerator?: string
): MenuItemConstructorOptions {
  return {
    label,
    ...(accelerator !== undefined ? { accelerator } : {}),
    click: () => sendAction(action)
  };
}

export function installAppMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name, // "gmux"
      submenu: [
        { role: 'about', label: 'About gmux' },
        { type: 'separator' },
        item('Settings…', 'settings', 'Cmd+,'),
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide gmux' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        // Quitting is safe by design (sessions live on the tmux server) —
        // the standard role keeps ⌘Q native.
        { role: 'quit', label: 'Quit gmux' }
      ]
    },
    {
      label: 'File',
      submenu: [
        item('Open Project…', 'open-project', 'Cmd+O'),
        { type: 'separator' },
        item('Save', 'save-file', 'Cmd+S'),
        { type: 'separator' },
        // ⌘W closes an editor tab ONLY — never the window, a session, or a
        // project (DESIGN.md §4).
        item('Close Editor Tab', 'close-editor-tab', 'Cmd+W')
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Session',
      submenu: [
        item('New Session…', 'new-session', 'Cmd+T'),
        item('Rename Session', 'rename-session', 'F2'),
        { type: 'separator' },
        item('Next Session', 'next-session', 'Alt+Cmd+Down'),
        item('Previous Session', 'prev-session', 'Alt+Cmd+Up'),
        { type: 'separator' },
        // Deliberately unaccelerated: ending a session is menu-only and
        // always confirmed (DESIGN.md §4).
        item('End Session…', 'end-session')
      ]
    },
    {
      label: 'Project',
      submenu: [
        item('Next Project', 'next-project', 'Ctrl+Tab'),
        item('Previous Project', 'prev-project', 'Ctrl+Shift+Tab'),
        { type: 'separator' },
        item('Close Project…', 'close-project')
      ]
    },
    {
      label: 'View',
      submenu: [
        item('Toggle Sidebar', 'toggle-sidebar', 'Cmd+B'),
        item('Toggle Editor', 'toggle-editor', 'Cmd+E'),
        { type: 'separator' },
        item('Sessions That Need Input', 'attention', 'Cmd+J'),
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged
          ? []
          : ([
              { type: 'separator' },
              { role: 'reload' },
              { role: 'toggleDevTools' }
            ] as MenuItemConstructorOptions[]))
      ]
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [item('Keyboard Shortcuts', 'shortcuts', 'Cmd+/')]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
