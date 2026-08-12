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
 * send SIGINT, which only works because src/renderer/terminal/keys/ sees
 * the key before the Edit menu's `role:'copy'` and can suppress it.
 * Renderer-only chords (⌘1…⌘9, ⌘⇧]/⌘⇧[, ⌘↩ commit) stay off the menu on
 * purpose: they are context-sensitive or would bloat it.
 */

import { app, BrowserWindow, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { EVT_MENU_ACTION, EVT_QUIT_REQUESTED } from '@shared/ipc';
import type { MenuActionWithFind } from '@shared/ipc';
// Every accelerator below comes from the ONE keymap (Phase 12.12). Do not
// type a chord string into this file — add it to src/shared/keymap.ts and
// read it back, or the menu and the ⌘/ overlay start drifting again.
import { accelerator as accel } from '@shared/keymap';
// The View-menu radio pair as DATA (ids, labels, actions) — shared with the
// renderer's controls so the three cannot name different things.
import {
  DEFAULT_SESSIONS_POSITION,
  SESSIONS_POSITION_RADIOS
} from '@shared/sessions-position';
import type { SessionsPosition } from '@shared/sessions-position';
import type { LaunchableAgentId } from '@shared/types';
// Direct module imports (NOT the ./settings barrel): settings/ipc.ts imports
// rebuildAppMenu from this file — the barrel would close a require cycle.
import { getSettings } from './settings/store';
import { sendEvent } from './typed-events';
import {
  closeSettingsWindowIfFocused,
  isSettingsWindow,
  openSettingsWindow
} from './settings/window';
import { getRegistryEntry } from './agents/registry';

/**
 * Can this window act on a menu action? The Settings window (S13) is a
 * sibling BrowserWindow with no app shell, so it is never a forwarding
 * target — while it is focused, app actions (⌘T, per-agent hotkeys, …) still
 * land in the main window. A torn-down window is not a target either: its
 * webContents can outlive `isDestroyed()` being false for the window itself
 * during teardown, and `send()` on it throws.
 */
function canReceiveMenuAction(win: BrowserWindow | null): win is BrowserWindow {
  return (
    win !== null &&
    !win.isDestroyed() &&
    !win.webContents.isDestroyed() &&
    !isSettingsWindow(win)
  );
}

/**
 * The window a menu action goes to: the focused one when it is eligible,
 * otherwise the app window itself. Phase 14.7: the old version took the FIRST
 * eligible window, which is fine today (the main window is created first) but
 * silently prefers the smoke harness's hidden BrowserWindow if window order
 * ever changes. Visible windows win.
 */
function menuActionTarget(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (canReceiveMenuAction(focused)) return focused;
  const eligible = BrowserWindow.getAllWindows().filter(canReceiveMenuAction);
  return eligible.find((w) => w.isVisible()) ?? eligible[0] ?? null;
}

/**
 * Forward a menu action to the APP window's renderer.
 *
 * Returns whether it was delivered, and says so out loud when it was not: a
 * menu item that quietly does nothing (Phase 14.7, the "doesn't always work"
 * half) is the one failure mode a menu must never have.
 *
 * Exported as sendMenuAction for the Phase 12.85 status item, which is a
 * second native menu over the same channel — never a second mechanism.
 */
export function sendMenuAction(action: MenuActionWithFind): boolean {
  const win = menuActionTarget();
  if (win === null) {
    console.warn(`[menu] "${action}" had no window to act on — dropped`);
    return false;
  }
  sendEvent(win.webContents, EVT_MENU_ACTION, action);
  return true;
}

/**
 * ⌘Q / Quit gmux — DESIGN.md §4: "first quit shows a one-time toast saying
 * so". The renderer owns the one-time flag (localStorage) and the toast, so
 * quit is FORWARDED: the renderer shows the toast when it's the first quit
 * with ≥1 live session, then invokes 'app:quit'. A fallback timer quits
 * anyway if the renderer is hung or running an older preload — quitting can
 * never be blocked by the toast flow.
 *
 * Exported for the Phase 12.85 status item: Quit means the same thing from
 * the menu bar as it does from ⌘Q, toast and all.
 */
export function requestQuit(): void {
  const win =
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  if (!win) {
    app.quit();
    return;
  }
  sendEvent(win.webContents, EVT_QUIT_REQUESTED);
  setTimeout(() => app.quit(), 3_000);
}

function item(
  label: string,
  action: MenuActionWithFind,
  accelerator?: string
): MenuItemConstructorOptions {
  return {
    label,
    ...(accelerator !== undefined ? { accelerator } : {}),
    click: () => sendMenuAction(action)
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
      click: () => sendMenuAction(`launch-agent:${id as LaunchableAgentId}`)
    });
  }
  return items.length > 0
    ? [{ type: 'separator' }, ...items]
    : [];
}

// ---------------------------------------------------------------------------
// Session-surface position: a View-menu radio pair that RENDERS the renderer
// store's `sessionOrientation` and nothing else.
//
// ONE direction only (Phase 14.7). The store pushes over `ui:sessionsPosition`
// on every change and once as the app loads; main caches that value below and
// builds the template FROM it. Main never reads localStorage, never runs
// executeJavaScript, and never sniffs a string to guess the position.
//
// The cache is what makes a rebuild safe. `rebuildAppMenu()` runs on every
// hotkey change (settings:set), and the template used to hardcode
// `checked: true` on Top — so recording a hotkey silently moved the checkmark
// to Top while the sessions stayed on the right. Now a rebuild reproduces the
// last known truth, and there is nothing asynchronous to lose a race with.
// ---------------------------------------------------------------------------

/** Last position the renderer store announced. A cache, never an authority. */
let sessionsPosition: SessionsPosition = DEFAULT_SESSIONS_POSITION;

/**
 * The renderer store moved the session surface (View menu, the SESSIONS
 * header's inline toggle, or its ˅ menu — all one store setter). Called from
 * the ui:sessionsPosition handler in src/main/ipc.ts.
 */
export function setSessionsPositionRadios(position: SessionsPosition): void {
  sessionsPosition = position;
  const menu = Menu.getApplicationMenu();
  if (menu === null) return; // no menu yet — the next build reads the cache
  // MARK THE WINNER, NEVER UNMARK THE LOSER. Measured on Electron 43
  // (scratchpad radio probe, both the AX mark char and the JS getter agree):
  // assigning `checked = false` to a radio item that is ALREADY unchecked
  // CHECKS it. The previous code did `top.checked = !right; right.checked =
  // right`, so every sync to Top ended with Right marked — the whole "the
  // menu does not reflect the toggle" symptom, hiding behind a line that
  // reads as obviously correct. Marking one item of a radio group unmarks
  // its siblings, which is all we ever need.
  for (const radio of SESSIONS_POSITION_RADIOS) {
    if (radio.position !== position) continue;
    const item = menu.getMenuItemById(radio.id);
    if (item !== null) item.checked = true;
  }
}

/** The cached position the radios are drawn from (exported for tests). */
export function sessionsPositionRadioState(): SessionsPosition {
  return sessionsPosition;
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
          accelerator: accel('app.settings'),
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
          accelerator: accel('app.quit'),
          click: () => requestQuit()
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        // Phase 12.9 item 1: until now the File menu could only OPEN. New
        // first, the way every Mac app orders them.
        item('New Project…', 'new-project', accel('project.new')),
        item('Open Project…', 'open-project', accel('project.open')),
        { type: 'separator' },
        item('Save', 'save-file', accel('editor.save')),
        { type: 'separator' },
        // ⌘W closes an editor tab ONLY — never the main window, a session,
        // or a project (DESIGN.md §4). One exception (S13): when the
        // Settings window is focused, ⌘W closes the Settings window.
        {
          label: 'Close Editor Tab',
          accelerator: accel('editor.close'),
          click: () => {
            if (closeSettingsWindowIfFocused(BrowserWindow.getFocusedWindow())) {
              return;
            }
            sendMenuAction('close-editor-tab');
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
    // Phase 14. Between Edit and Session, which is where a macOS app puts
    // Find and where the muscle memory already is. The menu is the
    // discoverability half of ⌘⇧F / ⌘⇧O: the renderer's capture-phase handler
    // is what actually runs (it precedes the accelerator by ~5 ms and calls
    // preventDefault), so each item must perform its action EXACTLY ONCE —
    // the same discipline show-explorer / show-scm already follow.
    {
      label: 'Find',
      submenu: [
        // ⌘P first: it is the one people reach for constantly, and it is the
        // only way anybody discovers the chord exists.
        item('Go to File…', 'quick-open', accel('view.quickOpen')),
        { type: 'separator' },
        item('Find in Project…', 'show-search', accel('view.search')),
        item('Go to Symbol…', 'go-to-symbol', accel('view.symbols'))
      ]
    },
    {
      label: 'Session',
      submenu: [
        item('New Session…', 'new-session', accel('session.new')),
        item('Rename Session', 'rename-session', accel('session.rename')),
        { type: 'separator' },
        item('Next Session', 'next-session', accel('session.next')),
        item('Previous Session', 'prev-session', accel('session.prev')),
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
        item('Next Project', 'next-project', accel('project.next')),
        item('Previous Project', 'prev-project', accel('project.prev')),
        { type: 'separator' },
        item('Close Project…', 'close-project')
      ]
    },
    {
      label: 'View',
      submenu: [
        // Activity-bar views (round 1): the sidebar hosts one view at a time.
        item('Explorer', 'show-explorer', accel('view.explorer')),
        item('Source Control', 'show-scm', accel('view.scm')),
        { type: 'separator' },
        // Session-surface orientation — a radio pair drawn from the cached
        // store value, so a rebuild reproduces the truth instead of resetting
        // it. Clicking one does NOT set the mark: it forwards to the store,
        // which moves the surface and pushes the new position back here.
        ...SESSIONS_POSITION_RADIOS.map(
          (radio): MenuItemConstructorOptions => ({
            id: radio.id,
            label: radio.label,
            type: 'radio',
            checked: radio.position === sessionsPosition,
            click: () => sendMenuAction(radio.action)
          })
        ),
        { type: 'separator' },
        item('Toggle Sidebar', 'toggle-sidebar', accel('view.sidebar')),
        item('Toggle Editor', 'toggle-editor', accel('editor.toggle')),
        { type: 'separator' },
        item('Sessions That Need Input', 'attention', accel('session.attention')),
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
      submenu: [item('Keyboard Shortcuts', 'shortcuts', accel('app.shortcuts'))]
    }
  ];
  return template;
}

/**
 * Build and install the menu. Synchronous and complete: the template already
 * carries the orientation radios' state, so there is no follow-up sync — and
 * therefore no window in which the menu is lying, and nothing for a per-window
 * pass to race or overwrite.
 */
function applyMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildTemplate()));
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
}
