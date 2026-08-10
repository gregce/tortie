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
import { EVT_MENU_ACTION, EVT_QUIT_REQUESTED } from '@shared/ipc';
import type { AnyMenuActionId } from '@shared/ipc';

function sendAction(action: AnyMenuActionId): void {
  const win =
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  win?.webContents.send(EVT_MENU_ACTION, action);
}

/**
 * ⌘Q / Quit gmux — DESIGN.md §4: "first quit shows a one-time toast saying
 * so". The renderer owns the one-time flag (localStorage) and the toast, so
 * quit is FORWARDED: the renderer shows the toast when it's the first quit
 * with ≥1 live session, then invokes 'app:quit'. A fallback timer quits
 * anyway if the renderer is hung or running an older preload — quitting can
 * never be blocked by the toast flow.
 */
function requestQuit(): void {
  const win =
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  if (!win) {
    app.quit();
    return;
  }
  win.webContents.send(EVT_QUIT_REQUESTED);
  setTimeout(() => app.quit(), 3_000);
}

function item(
  label: string,
  action: AnyMenuActionId,
  accelerator?: string
): MenuItemConstructorOptions {
  return {
    label,
    ...(accelerator !== undefined ? { accelerator } : {}),
    click: () => sendAction(action)
  };
}

// ---------------------------------------------------------------------------
// Session-surface orientation (round 1): a View-menu radio pair. The renderer
// owns the persisted truth (localStorage 'gmux.sessionOrientation', written by
// the app store); Electron flips the radio check on click, and on every page
// load we read the persisted value back so the menu opens honest after a
// relaunch. There is no other writer — the menu is the only orientation
// control (DESIGN.md §4 View menu).
// ---------------------------------------------------------------------------

const MENU_ID_SESSIONS_TOP = 'view-sessions-top';
const MENU_ID_SESSIONS_RIGHT = 'view-sessions-right';
const LS_ORIENTATION = 'gmux.sessionOrientation';

function syncOrientationRadios(win: BrowserWindow): void {
  win.webContents
    .executeJavaScript(`localStorage.getItem(${JSON.stringify(LS_ORIENTATION)})`)
    .then((raw: unknown) => {
      // Store writes JSON — '"right"' / '"top"'; anything else means top.
      const right = typeof raw === 'string' && raw.includes('right');
      const menu = Menu.getApplicationMenu();
      const top = menu?.getMenuItemById(MENU_ID_SESSIONS_TOP);
      const rightItem = menu?.getMenuItemById(MENU_ID_SESSIONS_RIGHT);
      if (top && rightItem) {
        top.checked = !right;
        rightItem.checked = right;
      }
    })
    .catch(() => {
      /* menu keeps its default (top) — cosmetic only */
    });
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
        // Quitting is safe by design (sessions live on the tmux server).
        // Routed through the renderer for the one-time §4 first-quit toast
        // ("Quitting — your sessions keep running.") — see requestQuit().
        {
          label: 'Quit gmux',
          accelerator: 'Cmd+Q',
          click: () => requestQuit()
        }
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
        // Activity-bar views (round 1): the sidebar hosts one view at a time.
        item('Explorer', 'show-explorer', 'Cmd+Shift+E'),
        item('Source Control', 'show-scm', 'Ctrl+Shift+G'),
        { type: 'separator' },
        // Session-surface orientation — radio pair, persisted app-wide by the
        // renderer; initial checked state synced from localStorage on load.
        {
          id: MENU_ID_SESSIONS_TOP,
          label: 'Sessions on Top',
          type: 'radio',
          checked: true,
          click: () => sendAction('sessions-top')
        },
        {
          id: MENU_ID_SESSIONS_RIGHT,
          label: 'Sessions on Right',
          type: 'radio',
          checked: false,
          click: () => sendAction('sessions-right')
        },
        { type: 'separator' },
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

  // Keep the orientation radios honest across relaunches: whenever a window
  // finishes loading the app, read the renderer-persisted orientation back.
  // (Single-window app — the listener is cheap and window-count agnostic.)
  app.on('browser-window-created', (_event, win) => {
    win.webContents.on('did-finish-load', () => syncOrientationRadios(win));
  });
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && !win.webContents.isLoading()) {
      syncOrientationRadios(win);
    }
  }
}
