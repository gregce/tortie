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
 * ORDER (measured on Electron 43, real keystrokes — this file used to claim
 * the opposite): the RENDERER's keydown runs FIRST and an accelerator fires
 * ~5 ms later; a renderer `preventDefault()` suppresses the accelerator
 * entirely. So the renderer's own keydown map is not a fallback — for any
 * chord it handles, it is the path that runs, and the menu item is what
 * makes the shortcut discoverable and what fires when focus is outside the
 * app's own handlers. Every registered item still forwards a MenuActionId
 * over EVT_MENU_ACTION so both routes end in the same action.
 *
 * This ordering is load-bearing for the terminal: ⌘C with no selection must
 * send SIGINT, which only works because src/renderer/terminal/keys.ts sees
 * the key before the Edit menu's `role:'copy'` and can suppress it.
 * Renderer-only chords (⌘1…⌘9, ⌘⇧]/⌘⇧[, ⌘↩ commit) stay off the menu on
 * purpose: they are context-sensitive or would bloat it.
 */

import { app, BrowserWindow, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { EVT_MENU_ACTION, EVT_QUIT_REQUESTED } from '@shared/ipc';
import type { MenuActionWithHotkeys } from '@shared/ipc';
import type { LaunchableAgentId } from '@shared/types';
// Direct module imports (NOT the ./settings barrel): settings/ipc.ts imports
// rebuildAppMenu from this file — the barrel would close a require cycle.
import { getSettings } from './settings/store';
import {
  closeSettingsWindowIfFocused,
  isSettingsWindow,
  openSettingsWindow
} from './settings/window';
import { getRegistryEntry } from './agents/registry';

/**
 * Forward a menu action to the APP window's renderer. The Settings window
 * (S13) is a sibling BrowserWindow with no app shell, so it is never a
 * forwarding target — while it is focused, app actions (⌘T, per-agent
 * hotkeys, …) still land in the main window.
 */
function sendAction(action: MenuActionWithHotkeys): void {
  const focused = BrowserWindow.getFocusedWindow();
  const win =
    (focused !== null && !isSettingsWindow(focused) ? focused : null) ??
    BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && !isSettingsWindow(w)
    );
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
  action: MenuActionWithHotkeys,
  accelerator?: string
): MenuItemConstructorOptions {
  return {
    label,
    ...(accelerator !== undefined ? { accelerator } : {}),
    click: () => sendAction(action)
  };
}

/**
 * User-recorded per-agent hotkey items (S13 Hotkeys): one Session-menu item
 * per ASSIGNED chord — "the menu stays the source of nativeness". Pressing
 * one forwards `launch-agent:<id>` to the main window, which creates
 * `<agent>-<n>` in the active project (§6.2 quick-create path). Rebuilt via
 * rebuildAppMenu() whenever settings:set changes the hotkey map.
 */
function agentHotkeyItems(): MenuItemConstructorOptions[] {
  let hotkeys: Partial<Record<LaunchableAgentId, string>>;
  try {
    hotkeys = getSettings().hotkeys;
  } catch {
    return []; // settings store unreadable — menu simply has no hotkey items
  }
  const items: MenuItemConstructorOptions[] = [];
  for (const [id, accelerator] of Object.entries(hotkeys)) {
    if (typeof accelerator !== 'string' || accelerator.length === 0) continue;
    let displayName = id;
    try {
      displayName = getRegistryEntry(id as LaunchableAgentId).displayName;
    } catch {
      continue; // unknown id survived in the file — skip, never throw
    }
    items.push({
      label: `New ${displayName} Session`,
      accelerator,
      click: () => sendAction(`launch-agent:${id as LaunchableAgentId}`)
    });
  }
  return items.length > 0
    ? [{ type: 'separator' }, ...items]
    : [];
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

function buildTemplate(): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name, // "gmux"
      submenu: [
        { role: 'about', label: 'About gmux' },
        { type: 'separator' },
        // S13: ⌘, opens the dedicated single-instance Settings window
        // straight from main — no renderer detour, works from any window.
        {
          label: 'Settings…',
          accelerator: 'Cmd+,',
          click: () => openSettingsWindow()
        },
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
        // ⌘W closes an editor tab ONLY — never the main window, a session,
        // or a project (DESIGN.md §4). One exception (S13): when the
        // Settings window is focused, ⌘W closes the Settings window.
        {
          label: 'Close Editor Tab',
          accelerator: 'Cmd+W',
          click: () => {
            if (closeSettingsWindowIfFocused(BrowserWindow.getFocusedWindow())) {
              return;
            }
            sendAction('close-editor-tab');
          }
        }
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
        item('End Session…', 'end-session'),
        // User-recorded per-agent shortcuts (S13 Hotkeys) — present only
        // when assigned; rebuilt on every hotkey change.
        ...agentHotkeyItems()
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
  return template;
}

/** Apply the current template + re-read the orientation radio truth. */
function applyMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildTemplate()));
  for (const win of BrowserWindow.getAllWindows()) {
    // The Settings window has no orientation store — never read it back.
    if (!win.isDestroyed() && !win.webContents.isLoading() && !isSettingsWindow(win)) {
      syncOrientationRadios(win);
    }
  }
}

/**
 * Rebuild the application menu in place — called by settings:set whenever
 * the per-agent hotkey map changes (S13), so recorded chords become native
 * Session-menu accelerators without a relaunch.
 */
export function rebuildAppMenu(): void {
  applyMenu();
}

export function installAppMenu(): void {
  applyMenu();

  // Keep the orientation radios honest across relaunches: whenever a window
  // finishes loading the app, read the renderer-persisted orientation back.
  // (The Settings window is excluded — it has no orientation store.)
  app.on('browser-window-created', (_event, win) => {
    win.webContents.on('did-finish-load', () => {
      if (!isSettingsWindow(win)) syncOrientationRadios(win);
    });
  });
}
