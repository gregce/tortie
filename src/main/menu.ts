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
 *
 * ICONS (Phase 156). Every row that has a mark wears the one its own part of
 * the product already draws, and every mark and every refusal carries its
 * reason at the row. The pixels come from ./menu-icons.generated.ts, produced
 * at build time from the ONE closed table in @shared/menu-codicons by
 * build/generate-menu-icons.mjs, because this menu is installed before any
 * window exists and there is no renderer to ask.
 *
 * NO ICON ON ANY TOP LEVEL TITLE, and the answer is no rather than unmentioned.
 * The app menu's own title, File, Edit, Find, Session, Project, View, Window
 * and Help all stay bare. Three reasons, in order of weight. First, nothing has
 * MEASURED that AppKit paints one: Phase 153's build/p153-appmenu-main.cjs
 * proved only that Electron 43.3.0 RETAINS a non empty NativeImage on a top
 * level item through setApplicationMenu and back out of getApplicationMenu, and
 * its own report field says so in those words. Shipping a top level icon would
 * be shipping an unmeasured pixel, which is the mistake Phase 60 made with the
 * full screen row and Phase 62.1 had to reverse. Second, the macOS menu bar is
 * the most conventional surface in the operating system and no Mac app puts a
 * glyph beside a menu bar title. Third, the bar has a hard width budget: on a
 * notched display the titles must fit to the left of the notch, and nine titles
 * each carrying an extra 16 points is how the rightmost ones get collapsed
 * away. The marks belong on the submenu rows, which is where a person is
 * looking for them and where Phase 153's measurement did cover the round trip.
 */

import { app, BrowserWindow, Menu } from 'electron';
import type { IpcMain, MenuItemConstructorOptions } from 'electron';
// Phase 163. The one invoke this file answers: the Settings window's door to
// the diagnostics report. It lands here rather than in ipc.ts because the
// answer IS a menu action forward, and the forwarder lives in this file.
import { handle } from './typed-ipc';
import {
  EVT_MENU_ACTION,
  EVT_QUIT_REQUESTED
} from '@shared/ipc';
import type { MenuActionWithFind } from '@shared/ipc';
// Every accelerator below comes from the ONE keymap (Phase 12.12). Do not
// type a chord string into this file — add it to src/shared/keymap.ts and
// read it back, or the menu and the ⌘/ overlay start drifting again.
import { accelerator as accel } from '@shared/keymap';
// PHASE 156. A row's mark, decoded once from the build time set in
// ./menu-icons.generated.ts. The names are the ONE closed table in
// @shared/menu-codicons, so a row here and a row in a right click menu cannot
// wear two different pictures for one verb. A name with no bitmap yields no
// `icon` key at all, so every menu composes exactly the rows it did before.
import { nativeMenuGlyph as glyph } from './native-menu-icon';
// The View-menu radio pair as DATA (ids, labels, actions) — shared with the
// renderer's controls so the three cannot name different things.
import {
  DEFAULT_SESSIONS_POSITION,
  SESSIONS_POSITION_RADIOS
} from '@shared/sessions-position';
import type { SessionsPosition } from '@shared/sessions-position';
// Phase 129. The projects radio pair, as DATA, from its own shared table —
// the sibling of the sessions one directly above.
import {
  DEFAULT_PROJECTS_POSITION,
  PROJECTS_POSITION_RADIOS
} from '@shared/projects-position';
import type { ProjectsPosition } from '@shared/projects-position';
import type { LaunchableAgentId } from '@shared/types';
import type { MenuCodicon } from '@shared/menu-codicons';
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
import {
  clearRecents,
  onRecentsChanged,
  openRecentActionId,
  openRecentMenuItem
} from './recents';
// Phase 90.3. Whether File > Open Folder on a Machine… has anything to open.
// Direct module imports, NOT the ./machines barrel, which re-exports the whole
// remote layer and would pull the session feed into the menu's import graph.
import { isMachineConfirmed } from './machines/confirm';
import {
  currentMachines,
  machineFieldsOf,
  onMachinesChanged
} from './machines/store';
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
  offerUpdaterRepair,
  runInteractiveUpdateCheck
} from './updates/ui';
import { getLog } from './log';

/**
 * Scope "menu" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const menuLog = getLog('menu');


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
    menuLog.warn(`"${action}" had no window to act on, so it was dropped`, {
      action
    });
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

/**
 * One forwarding row.
 *
 * PHASE 156 added the fourth argument. It is a `MenuCodicon`, so a chord of
 * letters that is not in the closed table will not compile, and it is spread so
 * a row given no mark, or a mark the generated set is missing, composes exactly
 * as it did before. Every mark passed here has its reason written at the call
 * site, which is the rule Phase 153 set and the reason its first re-verify
 * refused.
 */
function item(
  label: string,
  action: MenuActionWithFind,
  accelerator?: string,
  mark?: MenuCodicon
): MenuItemConstructorOptions {
  return {
    label,
    ...(accelerator !== undefined ? { accelerator } : {}),
    ...(mark !== undefined ? glyph(mark) : {}),
    click: () => sendMenuAction(action)
  };
}

/**
 * Is the Architecture surface on (Phase 175)? THREE menu rows read this:
 * Session then Aim at a Promise…, and View then Architecture and
 * Architecture Map. Each is PRESENT only while the switch in Settings then
 * Architecture is on, and the switch ships OFF. Hidden rather than
 * disabled, because a disabled row is a promise with no explanation beside
 * it and the way back in is the Settings page, which is visible always.
 * `rebuildAppMenu()` runs when settings:set flips the switch
 * (src/main/settings/ipc.ts), so the rows appear and vanish in the same
 * session with no relaunch.
 */
function archRowsOn(): boolean {
  try {
    return getSettings().arch.enabled;
  } catch {
    return false; // settings store unreadable — ship the default, which is off
  }
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
    // PHASE 156 LEFT THESE BARE ON PURPOSE. The mark a session row wears in
    // the app is its AGENT's, and agent art is SVG rather than a font glyph
    // (src/renderer/icons/agent-menu-icon.ts), so main holds no raster for it.
    // Generating a second set from that art roughly doubles the generator's
    // scope, and a user-configured agent's mark would not come from a closed
    // set at all. Giving every one of them one generic mark instead would say
    // less than the label already says. It is queued rather than guessed.
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

// ---------------------------------------------------------------------------
// Project-tab position: the same pair, for the project tabs (Phase 129).
//
// Written as a copy of the block above rather than as a shared helper over
// both, and that is deliberate. The two values are independent, their tables
// are separate, and a helper parameterised over "which position" would make
// the wrong one reachable by passing the wrong table. Two short blocks that
// each say what they do are cheaper to read than one clever one.
// ---------------------------------------------------------------------------

/** Last position the renderer store announced. A cache, never an authority. */
let projectsPosition: ProjectsPosition = DEFAULT_PROJECTS_POSITION;

/**
 * The renderer store moved the project tabs (View menu, the titlebar's own
 * position button, or the left rail's). Called from the ui:projectsPosition
 * handler in src/main/ipc.ts.
 */
export function setProjectsPositionRadios(position: ProjectsPosition): void {
  projectsPosition = position;
  const menu = Menu.getApplicationMenu();
  if (menu === null) return; // no menu yet — the next build reads the cache
  // MARK THE WINNER, NEVER UNMARK THE LOSER. The measurement is the one
  // recorded above for the sessions pair: on Electron 43, assigning
  // `checked = false` to a radio item CHECKS it. Marking one item of a radio
  // group unmarks its siblings, which is all we ever need.
  for (const radio of PROJECTS_POSITION_RADIOS) {
    if (radio.position !== position) continue;
    const item = menu.getMenuItemById(radio.id);
    if (item !== null) item.checked = true;
  }
}

/** The cached position the radios are drawn from (exported for tests). */
export function projectsPositionRadioState(): ProjectsPosition {
  return projectsPosition;
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
 * "Repair Updates…" (Phase 43) appears only while the launch found updater
 * state on disk that stops any install from happening. It is absent on
 * every ordinary launch. It exists so the offer is not a one shot dialog: a
 * user who answered "Not Now" can still reach the action, and so can a user
 * who quit before answering.
 *
 * The template reads `getUpdateUiState()` synchronously as it is built, the
 * same way the recents rows are read, so there is no second pass to race.
 * The try/catch is menu discipline rather than doubt about the contract: a
 * broken updater module must cost the user the staged item, never the menu
 * bar.
 */
function updateMenuItems(): MenuItemConstructorOptions[] {
  let staged: string | null = null;
  let needsRepair = false;
  try {
    const state = getUpdateUiState();
    staged = state.stagedVersion;
    needsRepair = state.needsUpdateRepair;
  } catch {
    staged = null;
    needsRepair = false;
  }
  const items: MenuItemConstructorOptions[] = [];
  if (staged !== null) {
    items.push({
      label: `Update to ${staged}, installs when you quit`,
      // A CHOSEN mark. It draws bytes coming down to THIS computer, which is
      // exactly the state this row announces: the download already happened
      // and the file is on disk waiting for the quit. `cloud-download` is in
      // the set and was refused here, because Phase 153 bound it to the
      // branches list's incoming arrow.
      ...glyph('desktop-download'),
      click: () => void confirmInstallStagedUpdate()
    });
  }
  items.push({
    label: 'Check for Updates…',
    // The sidebar's refresh button, the Context header's and the branch
    // header's all draw `refresh` for "ask again", and that is this row.
    ...glyph('refresh'),
    click: () => void runInteractiveUpdateCheck()
  });
  if (needsRepair) {
    items.push({
      label: 'Repair Updates…',
      // A CHOSEN mark. Nothing in Tortie draws a wrench, so it cannot be
      // misread as pointing at another surface, and fixing broken state on
      // disk is the whole of what this row does. `refresh` is two rows above
      // it and `debug-restart` would say the row starts something again.
      ...glyph('tools'),
      click: () => void offerUpdaterRepair()
    });
  }
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
          // The gear the activity bar draws at ActivityBar.tsx:171 and :238,
          // and the one Settings' own General section wears.
          ...glyph('settings-gear'),
          click: () => openSettingsWindow()
        },
        // Phase 23: the one affordance for the configuration folder. It sits
        // next to Settings because both answer "where do I change Tortie",
        // and it has no accelerator on purpose — a folder a person opens
        // twice a year does not earn a chord.
        {
          label: 'Open Configuration Folder',
          // `revealConfigFolder` hands the folder to Finder through
          // shell.openPath, and six rows across four menus already wear this
          // mark for exactly that journey off this app. `folder-opened` would
          // say Tortie opened it.
          ...glyph('link-external'),
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
        //
        // NO MARK, and the refusal is argued rather than an omission. The
        // obvious candidate is `refresh`, because this row surveys the live
        // tmux server and rewrites the list from it. It is refused twice over:
        // Check for Updates… two rows above already wears `refresh` in this
        // same submenu, and one picture on two different verbs inside one menu
        // is the defect build/assert-menu-glyphs.mjs exists to stop; and every
        // surface that draws `refresh` in Tortie is a button that re-reads
        // something cheaply and at once, which this row, sitting behind two
        // dialogs, is not.
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
        //
        // NO MARK, argued. This is the standard AppKit row at the foot of the
        // app menu and every Mac app draws it bare, so a glyph here would be
        // the one thing in this submenu that is not what a Mac user expects.
        // No Tortie surface draws a quit mark either, so there is nothing to
        // take by provenance.
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
        // The three project verbs wear the marks the + menu already gives
        // them for the same three labels, at project-menu.ts:58, :50 and :87.
        item('New Project…', 'new-project', accel('project.new'), 'new-folder'),
        item(
          'Open Project…',
          'open-project',
          accel('project.open'),
          'folder-opened'
        ),
        // PHASE 90.3. Directly under Open Project…, because it is the same
        // verb aimed at a different computer. No accelerator, for the reason
        // Clone Repository has none: every built in chord is one a person can
        // no longer record as a per agent hotkey.
        //
        // DISABLED when the machines file holds no confirmed machine, which is
        // the ordinary case for a person who has only this Mac. A row that
        // opens a sheet with an empty list would spend a person a click to
        // learn nothing.
        {
          // `vm` is what project-menu.ts:79 gives this same label.
          ...item('Open Folder on a Machine…', 'open-remote-project', undefined, 'vm'),
          enabled: anyConfirmedMachine()
        },
        // Phase 18.6. The third project verb, in the same order the + menu
        // lists them (src/renderer/app/project-menu.ts). No accelerator.
        item('Clone Repository…', 'clone-repository', undefined, 'repo-clone'),
        // Phase 18.6. Directly under the three verbs, which is where macOS
        // puts it. The rows are built from <userData>/recents.json at the
        // moment the menu is built, and `rebuildAppMenu()` runs on every
        // change to that file, so the submenu cannot go stale.
        // PHASE 92. A row can name another machine, and the two families are
        // separate ids rather than one id with a flag, because a menu action
        // id carries no structure of its own. The id itself is composed by
        // `openRecentActionId` in the recents domain, so a test can pin the
        // exact string without building a native menu, and this file keeps the
        // one decision it has always kept, which is how a click reaches the
        // renderer.
        openRecentMenuItem({
          open: (path, machineId) =>
            sendMenuAction(openRecentActionId(path, machineId)),
          clear: () => clearRecents()
        }),
        { type: 'separator' },
        // A CHOSEN mark. Nothing in Tortie draws a save button anywhere, so
        // it cannot be misread as pointing at another surface. `save-as` is a
        // different verb.
        item('Save', 'save-file', accel('editor.save'), 'save'),
        { type: 'separator' },
        // ⌘W closes an editor tab ONLY — never the main window, a session,
        // or a project (DESIGN.md §4). One exception (S13): when the
        // Settings window is focused, ⌘W closes the Settings window.
        {
          label: 'Close Editor Tab',
          accelerator: accel('editor.close'),
          // The × the tab itself draws, and the mark EditorTabs.tsx:40 gives
          // the row labelled Close.
          ...glyph('close'),
          click: () => {
            if (closeSettingsWindowIfFocused(BrowserWindow.getFocusedWindow())) {
              return;
            }
            sendMenuAction('close-editor-tab');
          }
        }
      ]
    },
    // NO MARKS ON ANY ROW OF THIS MENU, argued rather than omitted. All seven
    // are AppKit's own roles, every Mac app draws them bare, and the terminal's
    // own right click menu already carries the marked versions of Copy, Paste
    // and Select All at terminal-menu.ts:156, :176 and :183 for the surface
    // where those verbs are not the system's.
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
        // `go-to-file` is the mark the codicon set binds to this exact act,
        // and src/shared/keymap.ts calls this palette the go-to-file palette.
        item('Go to File…', 'quick-open', accel('view.quickOpen'), 'go-to-file'),
        { type: 'separator' },
        // The activity bar's Search mark, ActivityBar.tsx:313.
        item('Find in Project…', 'show-search', accel('view.search'), 'search'),
        // The mark the symbol palette this row opens draws in its own input
        // row, SymbolPalette.tsx:129.
        item(
          'Go to Symbol…',
          'go-to-symbol',
          accel('view.symbols'),
          'symbol-method'
        )
      ]
    },
    {
      label: 'Session',
      submenu: [
        // The + on the sessions header, which terminal-menu.ts:140 already
        // gives this identical label.
        item('New Session…', 'new-session', accel('session.new'), 'add'),
        // The pencil the session row's own Rename wears at
        // session-actions.tsx:803, and the tree's and the split group's.
        item('Rename Session', 'rename-session', accel('session.rename'), 'edit'),
        { type: 'separator' },
        // The keymap's own sentence for these two is that they move down and
        // up the session list, and the chords ARE the down and up arrows, so
        // each takes the arrow its own label states.
        item('Next Session', 'next-session', accel('session.next'), 'arrow-down'),
        item('Previous Session', 'prev-session', accel('session.prev'), 'arrow-up'),
        { type: 'separator' },
        // Deliberately unaccelerated: ending a session is menu-only and
        // always confirmed (DESIGN.md §4).
        // The × the session row draws for this verb, session-actions.tsx:926.
        item('End Session…', 'end-session', undefined, 'close'),
        // Phase 141. Sits with End Session and is unaccelerated for the same
        // reason: it acts on the live session the person is looking at, and
        // typing into that session deserves the same care as ending it.
        //
        // It is always present and never greyed. The menu bar template is
        // rebuilt for recents, updates, machines and hotkeys and for nothing
        // per session, so a row that greyed itself per session would need a
        // rebuild trigger this phase does not add. The renderer returns
        // silently when the active session's agent has not left, which is what
        // 'end-session' already does for a session that has exited.
        //
        // This is the only surface for the verb in session focus mode, where
        // the session list is hidden by design, so it is not optional.
        // `terminal`, the mark session-actions.tsx:891 wears on the same verb
        // in the row menu: it types into the session in front of the person,
        // and the terminal is the surface it acts on.
        item('Resume Conversation', 'resume-conversation', undefined, 'terminal'),
        // PHASE 64 PUT THE AIMING VERB HERE, and the placement is a decision
        // rather than an inheritance. It sits in the Session menu and not in
        // the View menu beside Architecture, because it opens no view and
        // changes none: it puts a block of text into the prompt of the session
        // in front of the person, which is exactly what Resume Conversation
        // above does. It is next to that row for that reason.
        //
        // It IS accelerated, unlike the two rows above it, because the whole
        // point of the verb is a chord that never leaves the terminal. The
        // accelerator comes from the shared keymap, so the row and the chord
        // cannot drift.
        //
        // The ellipsis is honest: it opens a list to choose from and puts
        // nothing anywhere until a row is picked.
        //
        // `circuit-board`, the mark the Architecture view wears in the activity bar
        // and in the View menu row. This submenu's rule is that a row wears the
        // icon of the surface it opens, and what this opens is that view's own
        // list of promises. The name is already in `MENU_CODICONS`, so the
        // generated set is unchanged and build/assert-menu-glyphs.mjs has
        // nothing new to weigh.
        //
        // PHASE 175 PUT THIS ROW BEHIND THE SAME SWITCH as the two View menu
        // rows below. It is a DOOR on to Architecture rather than a mention
        // of it: it reads the contract and writes a promise into the prompt.
        // A door on to a surface a person has not turned on does not belong
        // on a menu, and the renderer refuses the action as well, so a
        // queued `arch-aim` cannot get through either.
        ...(archRowsOn()
          ? [
              item(
                'Aim at a Promise…',
                'arch-aim',
                accel('session.aim'),
                'circuit-board'
              )
            ]
          : []),
        // User-recorded per-agent shortcuts (S13 Hotkeys) — present only
        // when assigned; rebuilt on every hotkey change.
        ...agentHotkeyItems(),
        { type: 'separator' },
        // Phase 29. Deliberately unaccelerated and at the bottom: restoring
        // starts a process, so the user reads a name first. No badge, no
        // count.
        // `history`, the mark session-actions.tsx:853 wears on Restore, which
        // is the verb this modal performs, and the one the SavedMark draws
        // under "Saved — ready to restore".
        item('Past Sessions…', 'past-sessions', undefined, 'history')
      ]
    },
    {
      label: 'Project',
      submenu: [
        // NO MARK ON THESE TWO, argued. The project tabs run across the top
        // in one position and down the left rail in the other, and the person
        // chooses which. No arrow in the set is true in both, and an icon that
        // is wrong half the time has no reason to be there.
        item('Next Project', 'next-project', accel('project.next')),
        item('Previous Project', 'prev-project', accel('project.prev')),
        { type: 'separator' },
        // The × the project rail draws for this verb, ProjectRail.tsx:207.
        item('Close Project…', 'close-project', undefined, 'close')
      ]
    },
    {
      label: 'View',
      submenu: [
        // Activity-bar views: the sidebar hosts one view at a time. Phase 60
        // made this list tell the truth, and Phase 63 kept it true by adding
        // Architecture. It lists all FIVE sidebar views in the activity bar's
        // own order. The shift+cmd+F chord therefore displays
        // here and on Find in Project…, which is deliberate. The renderer
        // keydown map runs first, so nothing fires twice.
        // Each row wears the mark the activity bar draws for the view it
        // opens, being the five ViewItem calls in ActivityBar.tsx.
        item('Explorer', 'show-explorer', accel('view.explorer'), 'files'),
        item('Search', 'show-search', accel('view.search'), 'search'),
        // `git-branch` RATHER THAN `source-control`, and this is not a
        // substitute. The shipped codicon font draws source-control at U+EA68
        // and git-branch at U+EC6F as ONE IDENTICAL OUTLINE, measured byte for
        // byte at 284 ink pixels each by build/generate-menu-icons.mjs. So this
        // row wears exactly the pixels ActivityBar.tsx:330 draws for the Source
        // Control view, under the name already in the closed set. Adding the
        // second name would have put one picture in the table twice, which is
        // the U+EC6F defect build/assert-menu-glyphs.mjs was written for, one
        // level deeper: the codepoints differ, so only the bitmaps say so.
        item('Source Control', 'show-scm', accel('view.scm'), 'git-branch'),
        item('Context', 'show-context', accel('view.context'), 'layers'),
        // PHASE 63 PUT ARCHITECTURE HERE, ABOVE CATCH ME UP, and the placement
        // is a decision this phase made rather than one it inherited.
        //
        // The rule this list already states two comments above is that it runs
        // in the ACTIVITY BAR'S OWN ORDER. Architecture is a sidebar view and
        // sits fifth on that rail, after Context. Catch Me Up is not a sidebar
        // view at all: Phase 137 put it under Context because both answer a
        // question about the whole project, and it opens a page rather than a
        // view. So the five sidebar views stay contiguous and in rail order,
        // and the one row that is not a sidebar view stays last. Putting
        // Architecture under Catch Me Up would have split the rail's own order
        // around a row that is not part of it.
        //
        // `circuit-board`, the mark ActivityBar.tsx draws for this view, which is
        // this submenu's rule: a row wears the icon of the surface it opens.
        // The name was added to `MENU_CODICONS` in the same commit and the
        // generated set was regenerated, because `build/assert-menu-glyphs.mjs`
        // fails the build for a name with no bitmap and for two names with the
        // same bitmap.
        //
        // PHASE 175 PUT BOTH ARCHITECTURE ROWS BEHIND THE SWITCH in Settings
        // then Architecture, present while on and absent while off, and the
        // spread below is that gate. The rail order rule above still holds
        // when they are present.
        ...(archRowsOn()
          ? [
              item(
                'Architecture',
                'show-arch',
                accel('view.arch'),
                'circuit-board'
              ),
              // PHASE 160. The architecture MAP, directly under the view that
              // opens it, and above Catch Me Up so the five sidebar views stay
              // contiguous in rail order and the two rows that open a page
              // rather than a view sit together at the end. It opens the
              // active project's map as a full size editor tab, or focuses the
              // one that is already open, through the same door the
              // Architecture pane's own control uses.
              //
              // `circuit-board` again, the Architecture surface's own mark.
              // The closed set has no map glyph, and a row may wear a name the
              // set already holds, the way `search` sits on Find in Project…
              // and on the Search view row. build/assert-menu-glyphs.mjs
              // forbids two NAMES with one bitmap, not one name on two rows.
              item(
                'Architecture Map',
                'show-arch-map',
                undefined,
                'circuit-board'
              )
            ]
          : []),
        // Phase 137: Catch Me Up sits LAST, under the sidebar views, because
        // it answers a question about the whole project rather than opening a
        // sidebar view. It sat directly under Context until Phase 63 added
        // Architecture as the fifth sidebar view above it; the rule it was
        // placed by is unchanged and the row it follows moved. The accelerator
        // comes from the shared keymap, so the row and the chord cannot drift.
        // `comment`, the mark Settings' own Catch Me Up section wears at
        // SettingsApp.tsx:106 and the session row menu wears at
        // session-actions.tsx:508 for this same feature.
        item('Catch Me Up', 'show-overview', accel('view.overview'), 'comment'),
        { type: 'separator' },
        // NO MARK ON ANY OF THE FOUR RADIOS BELOW, argued twice over. A macOS
        // radio item already draws a state mark, so an icon would sit beside a
        // check. More decisively, the closed set holds three layout marks,
        // being layout-menubar, layout-sidebar-left and layout-sidebar-right,
        // for two axes with two states each, so at least two of the four rows
        // would wear one identical picture inside one submenu. That is the
        // exact defect build/assert-menu-glyphs.mjs exists to stop.
        //
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
        // Phase 129. The project tabs' own pair, drawn the same way from the
        // same kind of cache, and sitting directly under the sessions pair
        // because the two answer the same question about two surfaces.
        ...PROJECTS_POSITION_RADIOS.map(
          (radio): MenuItemConstructorOptions => ({
            id: radio.id,
            label: radio.label,
            type: 'radio',
            checked: radio.position === projectsPosition,
            click: () => sendMenuAction(radio.action)
          })
        ),
        { type: 'separator' },
        // NO MARK ON TOGGLE SIDEBAR, argued. `layout-sidebar-left` is the
        // obvious candidate and it is refused: projects-position.ts:40 already
        // draws that picture as the destination of "Move projects to the left",
        // and a mark that means "move the project tabs to that edge" cannot
        // also mean "hide and show the sidebar" without one of the two being
        // wrong. Nothing else in Tortie draws a sidebar toggle at all, so there
        // is nothing to take by provenance either. The name is therefore not in
        // the closed set, because a name no row wears is a bitmap generated for
        // nothing.
        item('Toggle Sidebar', 'toggle-sidebar', accel('view.sidebar')),
        // `screen-full` is what EditorPanel.tsx:822 draws on the button whose
        // aria-label is the literal string "Fill the window", which is this
        // row's label.
        item(
          'Fill the Window',
          'toggle-editor-fill',
          accel('view.fillEditor'),
          'screen-full'
        ),
        // Phase 80.1. Session focus is fill's sibling, so it sits directly
        // under it. Fill gives the open file the window. Focus gives the
        // session surface the window. Nothing else in this menu moved when
        // this row was added.
        //
        // Phase 129 renamed the row rather than adding a second one. ⇧⌘↩ now
        // fills from an open file as well, and Electron gives one accelerator
        // per item, so the keys stay here and the label says both regions.
        // The renderer routes this action through the same router the chord
        // uses, so the row and the keys printed on it cannot drift.
        //
        // NO MARK ON THIS ROW, argued. Nothing in Tortie draws one for it, and
        // the only candidate is `screen-full`, which the row directly above
        // owns by provenance. Two adjacent rows in one submenu wearing one
        // picture is the case the glyph gate exists to prevent, and it is not
        // the Phase 153 `device-camera` case, where several rows were different
        // extents of ONE feature.
        item(
          'Focus the Session or File',
          'toggle-session-focus',
          accel('view.sessionFocus')
        ),
        // `code` is what EditorPanel.tsx:240 binds to the editor's Source
        // mode, which is the surface this row shows.
        item('Toggle Editor', 'toggle-editor', accel('editor.toggle'), 'code'),
        { type: 'separator' },
        // The bell in the titlebar, Titlebar.tsx:469, whose title string is
        // built from keyDisplay('session.attention') — the same chord and the
        // same verb as this row.
        item(
          'Sessions That Need Input',
          'attention',
          accel('session.attention'),
          'bell'
        ),
        // Full screen (Phase 60, corrected by measurement in Phase 62.1).
        // The app declares NO VISIBLE full screen row. macOS puts one there
        // by itself, named "Enter Full Screen" and bound to the globe key
        // plus F. What sits below is a HIDDEN item whose only job is to keep
        // control-command-F working, because that chord is what the operator
        // has been pressing since Phase 60 and macOS will not put it on a
        // visible row without also adding a second row.
        //
        // WHAT WENT WRONG BEFORE. Phase 60 shipped
        // `{ role: 'togglefullscreen' }` and wrote here that the packaged
        // View menu therefore held exactly one full screen row. The operator
        // had photographed two. He was right. Phase 60 counted through the
        // accessibility interface, and that interface is BLIND to the row
        // macOS adds next to a role item: it reported 15 rows and one full
        // screen row while 16 rows and two were on screen. Phase 62.1
        // photographed the open menu instead, and reproduced the doubling on
        // four launches across four fresh profiles.
        //
        // THE FOUR PACKAGED READINGS, all on macOS 15.7.9 with Electron 43
        // on 2026-08-17, each from a fresh isolated profile:
        //
        //   what the app declares        rows on screen   the rows
        //   role togglefullscreen              2          "Toggle Full Screen"
        //                                                 globe+F, and again
        //                                                 with control-cmd-F
        //   a plain visible item               2          "Toggle Full Screen"
        //                                                 control-cmd-F, plus
        //                                                 "Enter Full Screen"
        //                                                 globe+F
        //   nothing at all                     1          "Enter Full Screen"
        //                                                 globe+F
        //   a HIDDEN item, this one            1          "Enter Full Screen"
        //                                                 globe+F
        //
        // So there is no shape in which a visible row of ours carries
        // control-command-F and stays alone. macOS adds its own row whenever
        // no menu item carries the native `toggleFullScreen:` action, and it
        // adds a globe-key row next to one that does. The hidden item takes
        // neither path: macOS cannot see a use for it, so it adds exactly one
        // row, and the chord still fires because a hidden item keeps its
        // accelerator (`acceleratorWorksWhenHidden` defaults to true).
        //
        // PROVEN, not assumed. With this shape the packaged menu read one
        // full screen row on four launches, and control-command-F drove the
        // window into full screen and back out again, photographed both ways
        // (the menu bar disappears and returns).
        //
        // WHAT IS NOT TRUE. A DEV build gets no macOS row at all, so in dev
        // the View menu has no full screen row and only the chord works.
        // That difference is macOS's, not ours, and it is the whole reason
        // Phase 60 went wrong: a dev build is not evidence about this
        // question. Measure the packaged build or measure nothing.
        //
        // The chord is typed here rather than read from src/shared/keymap.ts
        // on purpose. It is the macOS platform chord that Electron's role
        // used to supply, it has never been a Tortie keymap entry and it has
        // never appeared in the shortcuts overlay, so there is nothing for it
        // to drift from.
        //
        // PHASE 156 RE-EXAMINED THAT AND KEPT IT RAW, because its charter
        // asked for a keymap row or a written reason. This is the reason, and
        // it is stronger than the one above. Adding this chord to KEYMAP would
        // put it into RESERVED_APP_CHORDS, because hasCommandModifier at
        // src/shared/keymap.ts:98 answers true for Ctrl, so the per agent
        // hotkey recorder would start refusing a chord macOS owns rather than
        // Tortie. And this item is `visible: false`, so no menu row would ever
        // display what the keymap held. That is a behaviour change to the
        // recorder's conflict table bought for nothing a person can see. It is
        // the ONE literal accelerator in this file, and
        // build/assert-menu-accelerators.mjs names it as the one exception so
        // no second one can be typed quietly.
        //
        // TWO THINGS KEEP THIS TRUE, and neither is enough alone.
        // build/probe-fullscreen-menu.mjs reads the live packaged menu and
        // asserts the one row it finds is macOS's own "Enter Full Screen" on
        // the globe key, which is the only row shape that comes with no
        // second row. src/main/__tests__/view-menu.test.ts forbids
        // `{ role: 'togglefullscreen' }` in this template, because that role
        // is the shape the probe cannot see through.
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Control+Command+F',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: (_menuItem, clickedWindow) => {
            const target = clickedWindow ?? BrowserWindow.getFocusedWindow();
            if (target === null || target === undefined) return;
            if (target.isDestroyed() || !target.isFullScreenable()) return;
            target.setFullScreen(!target.isFullScreen());
          }
        },
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
      submenu: [
        // The mark Settings' Keyboard section wears on its own rail,
        // SettingsApp.tsx:66.
        item('Keyboard Shortcuts', 'shortcuts', accel('app.shortcuts'), 'keyboard'),
        // PHASE 163. The diagnostics report: what Tortie is running right
        // now, its own processes apart from the sessions it supervises, one
        // capture taken when the row is pressed. It sits in Help because it
        // is the row a person reaches for when something is slow or large,
        // beside the other row that explains the app to them. No chord: it
        // is a question a person asks now and then, not a verb they repeat.
        // `output`, the mark the Diagnostics section of Settings wears on
        // its rail (SettingsApp.tsx), so the two doors to one page share one
        // picture. The closed set holds no memory or pulse glyph, and adding
        // one means running the generator, which starts an Electron.
        item('Diagnostics Report', 'show-diagnostics', undefined, 'output')
      ]
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

/**
 * Phase 90.3. Whether any machine in the file is confirmed.
 *
 * It reads memory and the sealed record and starts nothing, which is what makes
 * it safe to call while the menu template is being built. An unconfirmed row
 * would refuse every read anyway, so a menu item offering it would spend a
 * person a click to learn nothing.
 */
function anyConfirmedMachine(): boolean {
  return currentMachines().rows.some((row) =>
    isMachineConfirmed(row.id, machineFieldsOf(row))
  );
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

/** True once the machines subscription exists, so a second install is a no-op. */
let watchingMachines = false;

/**
 * Rebuild whenever the machines file changes (Phase 90.3), so File > Open
 * Folder on a Machine… becomes reachable the moment a person confirms their
 * first machine, and stops being reachable when they remove their last one.
 * Same mechanism as the two subscriptions above.
 */
function watchMachinesForMenu(): void {
  if (watchingMachines) return;
  watchingMachines = true;
  onMachinesChanged(() => applyMenu());
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
      // Phase 134: the copyright field is the only field of the native About
      // panel that holds more than one line, so all three lines live in it.
      // The third line is a licence obligation and not a courtesy. Codicons
      // are CC BY 4.0, which requires attribution wherever the work is
      // distributed. Material Icon Theme is MIT, which requires its copyright
      // notice to travel with the artwork, and a curated subset of that
      // artwork is embedded into src/renderer/icons/file-icons.generated.ts
      // at build time. NOTICE and src/renderer/icons/Codicon.tsx both state
      // that this credit is here, so deleting it makes those two files false.
      //
      // The native About panel renders plain strings only, so the repo URL
      // is text, not a hyperlink.
      copyright:
        '© 2026 Ita Vero, LLC. All rights reserved.\n' +
        'Source: github.com/gregce/tortie\n' +
        'Icons: codicons by Microsoft (CC BY 4.0) and Material Icon Theme by Material Extensions (MIT).'
    });
  } catch (err) {
    // Cosmetic: an About panel that falls back to the bundle's own strings is
    // a worse panel, not a broken app. Never let it cost us the menu bar.
    menuLog.warn(`About panel: ${(err as Error).message}`);
  }
  watchRecentsForMenu();
  watchUpdatesForMenu();
  watchMachinesForMenu();
  applyMenu();
}

/**
 * PHASE 163. The Settings window's door to the diagnostics report tab.
 *
 * The Settings window cannot be a menu action target (canReceiveMenuAction
 * above), so its Diagnostics section asks main over `ui:showDiagnostics` and
 * main forwards the Help menu's OWN action to the app window. Same action,
 * same dispatcher, one tab, so the two doors cannot drift. A window that is
 * not there is logged by sendMenuAction and nothing else happens.
 *
 * Registered from the composition root with the ipcMain it hands every
 * registrar, and not from installAppMenu, because the menu suites install the
 * menu against a fake electron that has no ipcMain and install it many times.
 */
export function installDiagnosticsDoor(ipc: IpcMain): void {
  handle(ipc, 'ui:showDiagnostics', () => {
    sendMenuAction('show-diagnostics');
  });
}
