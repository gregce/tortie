/**
 * Tortie's native macOS application menu (DESIGN.md §2.1: the menu bar mirrors
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
import {
  EVT_MENU_ACTION,
  EVT_QUIT_REQUESTED,
  OPEN_RECENT_PREFIX
} from '@shared/ipc';
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
import { BUILD_COMMIT } from './build-info';
// Phase 18.6. The recents domain hands over the whole `Open Recent` item as
// DATA and knows nothing about how a click reaches the renderer, which is the
// one decision this file keeps.
import { clearRecents, onRecentsChanged, openRecentMenuItem } from './recents';
// Phase 20 fix round. Reconstruction had no door: no menu item, no channel, no
// flag. This is the door, and it runs entirely in main behind two native
// dialogs, so there is no renderer surface to keep in step with it.
import { runOperatorReconstruction } from './manifest/reconstruct-operator';
// Phase 23. The whole of Tortie's configuration interface is the one item this
// import serves. It creates the folder if it is not there, writes the guide,
// the schema and the examples into it, and opens it. There is no configuration
// editor and no onboarding flow, because the file is one click away and the
// user's agents are already here.
import { revealConfigFolder } from './config/guide';
// Phase 24. The two update surfaces this menu owns: the staged item that
// appears only once an update is downloaded, and the check a person can run.
// The state comes from ./updates/updater and the words come from ./updates/ui.
// The menu is the WHOLE announcement: no toast, no modal, no badge.
import { getUpdateUiState, onUpdateStateChanged } from './updates/updater';
import {
  confirmInstallStagedUpdate,
  runInteractiveUpdateCheck
} from './updates/ui';

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
 * ⌘Q / Quit — DESIGN.md §4: "first quit shows a one-time toast saying
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

/**
 * The Tortie submenu's update items (Phase 24).
 *
 * The staged item exists only while an update is downloaded and staged,
 * never on update-available: an announcement about bytes that are not on
 * disk yet is a promise the quit cannot keep. Its label is one comma joined
 * sentence, never a dash. Clicking it opens the one sanctioned install
 * prompt (./updates/ui).
 *
 * "Check for Updates…" is always present, including in dev, where the
 * result dialog says plainly that a development build does not update
 * itself.
 *
 * The template reads `getUpdateUiState()` synchronously as it is built, the
 * same way the recents rows are read, so there is no second pass to race.
 * The try/catch is menu discipline rather than doubt about the contract: a
 * broken updater module must cost the user the staged item, never the menu
 * bar.
 */
function updateMenuItems(): MenuItemConstructorOptions[] {
  let staged: string | null = null;
  try {
    staged = getUpdateUiState().stagedVersion;
  } catch {
    staged = null;
  }
  const items: MenuItemConstructorOptions[] = [];
  if (staged !== null) {
    items.push({
      label: `Update to ${staged}, installs when you quit`,
      click: () => void confirmInstallStagedUpdate()
    });
  }
  items.push({
    label: 'Check for Updates…',
    click: () => void runInteractiveUpdateCheck()
  });
  return items;
}

function buildTemplate(): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name, // "Tortie" — set in proc/identity.ts
      submenu: [
        { role: 'about', label: `About ${app.name}` },
        // Phase 24: the staged update announcement (one menu item and
        // nothing else) and the user initiated check.
        ...updateMenuItems(),
        { type: 'separator' },
        // S13: ⌘, opens the dedicated single-instance Settings window
        // straight from main — no renderer detour, works from any window.
        {
          label: 'Settings…',
          accelerator: accel('app.settings'),
          click: () => openSettingsWindow()
        },
        // Phase 23: the one affordance for the configuration folder. It sits
        // next to Settings because both answer "where do I change Tortie",
        // and it has no accelerator on purpose — a folder a person opens
        // twice a year does not earn a chord.
        {
          label: 'Open Configuration Folder',
          click: () => void revealConfigFolder()
        },
        { type: 'separator' },
        // Phase 20 fix round: the one way a person can reach reconstruction.
        // It surveys, shows the plan, and writes only after the person says
        // yes. It never writes over the session list they have now, and it
        // never adopts a running session that is not Tortie's. It is in this
        // menu rather than behind a flag because the day it is needed is the
        // day the session list is gone, and a person looking for a way out
        // opens menus.
        {
          label: 'Rebuild the Session List…',
          click: () => void runOperatorReconstruction()
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: `Hide ${app.name}` },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        // Quitting is safe by design (sessions live on the tmux server).
        // Routed through the renderer for the one-time §4 first-quit toast
        // ("Quitting — your sessions keep running.") — see requestQuit().
        {
          label: `Quit ${app.name}`,
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
        // Phase 18.6. The third project verb, in the same order the + menu
        // lists them (src/renderer/app/project-menu.ts). No accelerator.
        item('Clone Repository…', 'clone-repository'),
        // Phase 18.6. Directly under the three verbs, which is where macOS
        // puts it. The rows are built from <userData>/recents.json at the
        // moment the menu is built, and `rebuildAppMenu()` runs on every
        // change to that file, so the submenu cannot go stale.
        openRecentMenuItem({
          open: (path) => sendMenuAction(`${OPEN_RECENT_PREFIX}${path}`),
          clear: () => clearRecents()
        }),
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
        item('Fill the Window', 'toggle-editor-fill', accel('view.fillEditor')),
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

/** True once the recents subscription exists, so a second install is a no-op. */
let watchingRecents = false;

/**
 * Rebuild whenever the recents file changes, so `File > Open Recent` is never
 * a list of where the user used to be. The template reads the rows
 * synchronously as it is built, which is what makes this the whole mechanism:
 * there is no second pass to race and no cached submenu to invalidate.
 */
function watchRecentsForMenu(): void {
  if (watchingRecents) return;
  watchingRecents = true;
  onRecentsChanged(() => applyMenu());
}

/** True once the update subscription exists, so a second install is a no-op. */
let watchingUpdates = false;

/**
 * Rebuild whenever the update state changes (Phase 24), which is when an
 * update finishes downloading and when a check completes. Same mechanism as
 * the recents subscription above: the template reads the state synchronously
 * as it is built, so the staged item can never disagree with the engine.
 */
function watchUpdatesForMenu(): void {
  if (watchingUpdates) return;
  watchingUpdates = true;
  onUpdateStateChanged(() => applyMenu());
}

export function installAppMenu(): void {
  // The About panel reads CFBundleName/CFBundleShortVersionString from the
  // bundle in a packaged build and Electron's own values in dev, so a dev run
  // would otherwise open an "About Electron" panel. State it once instead.
  //
  // Phase 17: `version` is macOS's BUILD version — the part in parentheses
  // after the marketing version — so About reads "Version 0.0.1 (09b216e)".
  // Now that Tortie is the installed daily driver, that line is how the user
  // (or an agent) answers "is what I am running what is in git?" without a
  // build log.
  try {
    app.setAboutPanelOptions({
      applicationName: app.name,
      applicationVersion: app.getVersion(),
      version: BUILD_COMMIT,
      copyright: 'SpecStory'
    });
  } catch (err) {
    // Cosmetic: an About panel that falls back to the bundle's own strings is
    // a worse panel, not a broken app. Never let it cost us the menu bar.
    console.warn(`[gmux] About panel: ${(err as Error).message}`);
  }
  watchRecentsForMenu();
  watchUpdatesForMenu();
  applyMenu();
}
