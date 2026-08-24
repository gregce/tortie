/**
 * App-shell contract: the shell extras (discard/rename/badge), native
 * menus and their action-id unions, the popup menu, quit, settings, the
 * sessions-position notification, power resume, and the updates read.
 * Moved verbatim from src/shared/ipc.ts (Phase 42 stage 2).
 */

import type { Unsubscribe } from './base';
import type { Project } from '../types';
import type {
  CloneMenuActionId,
  OpenRecentActionId,
  OpenRecentOnMachineActionId,
  ProjectMenuActionId,
  RemoteProjectMenuActionId
} from './projects';
import type { FindMenuActionId } from './search';
import type { PastSessionsMenuActionId } from './sessions';
import type { ContextMenuActionId } from './context';
import type { OverviewMenuActionId } from './overview';
import type { ShellOpenMenuActionId } from './shell';

// ---------------------------------------------------------------------------
// APPENDED by the app-shell stream (Phase 3) — new channels/types only,
// nothing above was modified. All of these were declared OPTIONAL bridge
// extensions at the time, so the shell feature-detected each method and hid
// the corresponding affordance when it was absent. Phase 122 made every
// installed member required. The shell's checks are still there and they now
// ask whether there is a bridge at all.
//
// INTEGRATOR wiring (main handler exists where noted):
//   'sessions:discard' → core.discardSession(id) + broadcastSessions()
//                        (src/main/ipc.ts already implements discardSession)
// Preload: add the matching methods per the GmuxApi pattern.
//
// Phase 77 removed two channels from the map below, 'projects:rename' and
// 'app:setBadgeCount'. Neither was ever implemented. Neither had a main
// handler and neither had a preload method, so both counted toward the app's
// capability surface without adding anything to it.
// ---------------------------------------------------------------------------

/** New invoke channels appended by the shell stream (see InvokeChannelMap). */
export interface ShellInvokeChannelMap {
  /**
   * Remove an exited/restorable session row entirely (manifest delete).
   * The §6.6 "Remove" affordance. Never valid for a live session.
   */
  'sessions:discard': { req: [sessionId: string]; res: void };
}

/**
 * Extensions to GmuxApi['sessions'].
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxSessionExtras {
  /** Remove an exited/restorable session row (manifest delete). */
  discard(sessionId: string): Promise<void>;
}

/**
 * Extensions to GmuxApi['projects'] that are DECLARED and never installed.
 *
 * The channel behind `rename`, 'projects:rename', never existed. Phase 77
 * removed it from ShellInvokeChannelMap. Anyone who implements renaming later
 * has to declare the channel again before wiring a preload method to it.
 *
 * `rename` STAYS OPTIONAL, and Phase 122 left it that way on purpose. This
 * interface is not joined into `InstalledGmuxApi` and the preload does not
 * install it, so making it required would make the installed type a lie in
 * the other direction. A later round must not finish it off.
 */
export interface GmuxProjectExtras {
  /** Rename a project tab. */
  rename?(projectId: string, name: string): Promise<Project>;
}

/**
 * App-level extras (Dock badge) that are DECLARED and never installed.
 *
 * The channel behind `setBadgeCount`, 'app:setBadgeCount', never existed.
 * Phase 77 removed it from ShellInvokeChannelMap. Anyone who implements the
 * Dock badge later has to declare the channel again before wiring a preload
 * method to it.
 *
 * `setBadgeCount` STAYS OPTIONAL for the reason `GmuxProjectExtras.rename`
 * above gives. Nothing imports this interface and nothing installs it.
 */
export interface GmuxAppExtras {
  /** Set the Dock badge to the global needs-input count (0 clears). */
  setBadgeCount?(count: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the polish stream (native app menu) — new channel/types only,
// nothing above was modified. The native macOS menu (src/main/menu.ts) owns
// the ⌘-chord accelerators it registers (menu accelerators fire before the
// renderer sees the keydown), so every registered item forwards its action to
// the renderer over this event channel; the renderer's own keydown handlers
// stay as the fallback when a chord is not menu-registered.
// ---------------------------------------------------------------------------

/** Main → renderer: a native menu item was activated. */
export const EVT_MENU_ACTION = 'ui:menuAction' as const;

/** Actions the native app menu can forward to the renderer. */
export type MenuActionId =
  | 'new-session'
  | 'rename-session'
  | 'end-session'
  // Phase 141. Put the command that continues the active session's
  // conversation back on its own prompt. It sits with 'end-session' and is
  // unaccelerated for the same reason: it acts on a live session the person is
  // looking at. It is not a status and it sets none. The renderer returns
  // silently when the active session's agent has not left, exactly as
  // 'end-session' returns silently for a session that has already exited.
  | 'resume-conversation'
  | 'next-session'
  | 'prev-session'
  | 'open-project'
  | 'close-project'
  | 'next-project'
  | 'prev-project'
  | 'save-file'
  | 'close-editor-tab'
  | 'toggle-editor'
  | 'toggle-sidebar'
  | 'attention'
  | 'shortcuts'
  | 'settings';

/**
 * Payload of EVT_MENU_ACTION, folded into AllEventPayloadMap (Phase 16, G1c).
 *
 * The tuple is typed `MenuActionWithFind` — the union `sendMenuAction` in
 * src/main/menu.ts actually sends — NOT the `MenuActionId` sixteen this
 * channel was born with. Both subscribers had been annotating the narrow type
 * and widening it back with a cast; the channel now states the truth once.
 */
export interface MenuEventPayloadMap {
  'ui:menuAction': [action: MenuActionWithFind];
}

/**
 * Top-level extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxMenuExtras {
  /** Subscribe to native app-menu actions. */
  onMenuAction(cb: (action: MenuActionWithFind) => void): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-8 hardening pass — new channels/types only, nothing
// above was modified.
//
// 1) agents:availability — main probes PATH (plus the usual install dirs) for
//    the agent CLIs once per boot and caches the result. The renderer
//    feature-detects `window.gmux.agentAvailability` and renders unavailable
//    agents as disabled options with install guidance (§6.5 / DESIGN-SPEC S6)
//    instead of letting create fail with a spawn error.
// 2) ui:popupMenu — CONTRACT ONLY for the native Menu.popup swap scheduled
//    for src/renderer/app/ContextMenu.tsx (DESIGN.md §3: context menus are
//    native, never DOM-drawn). INTEGRATOR wiring:
//      main:    ipcMain.handle('ui:popupMenu', …) → Menu.buildFromTemplate +
//               menu.popup({window, x, y}); resolve the clicked item id, or
//               null when dismissed.
//      preload: popupMenu: (input) => invoke('ui:popupMenu', input)
//      renderer: ContextMenu.tsx feature-detects popupMenu and prefers it;
//               the DOM menu remains the fallback for older preloads.
// ---------------------------------------------------------------------------

/** Which agent CLIs are installed on this machine (probed once per boot). */
export interface AgentAvailability {
  claude: boolean;
  codex: boolean;
}

/**
 * Leading icon for a native menu item (Phase 12.8 — the SESSIONS quick-create
 * menu wears the same AgentIcon the ⌘T picker does).
 *
 * The renderer rasterizes its own inline SVG, because main has no DOM: a
 * 32×32 PNG data URL that main hands to nativeImage at scaleFactor 2, so it
 * occupies 16pt and stays crisp on Retina.
 */
export interface PopupMenuIcon {
  /** `data:image/png;base64,…`, 32×32 physical pixels. */
  dataUrl: string;
  /**
   * True for `currentColor` marks: macOS then tints the alpha channel for the
   * menu's appearance and for the disabled/highlighted states. False for
   * inherently multi-tone art (droid's disc), which must keep its own colors.
   */
  template: boolean;
}

/** One item of a native context menu (ui:popupMenu). */
export interface PopupMenuItem {
  /** Returned by the invoke when clicked. */
  id: string;
  label: string;
  enabled?: boolean;
  /** Render with the destructive (error) treatment where supported. */
  destructive?: boolean;
  /** Display-only shortcut hint (e.g. "F2"). */
  hint?: string;
  /**
   * Grey second line under the label (macOS 14.4+; silently ignored below).
   * For prose the accelerator slot cannot carry — "not installed".
   */
  sublabel?: string;
  /** Leading icon, rendered at 16pt. */
  icon?: PopupMenuIcon;
  /** 'separator' items need no id/label. */
  type?: 'item' | 'separator';
  /**
   * Nested items (Phase 39). An item that carries a submenu has no click of
   * its own and its `id` is never returned: the id that comes back is always
   * a leaf's. Optional, so every existing menu site is unchanged.
   */
  submenu?: PopupMenuItem[];
}

export interface PopupMenuInput {
  /** Screen position (CSS pixels, window-relative). */
  x: number;
  y: number;
  items: PopupMenuItem[];
}

/** New invoke channels appended by the Phase-8 hardening pass. */
export interface HardeningInvokeChannelMap {
  /** Cached per-boot probe: which agent CLIs exist on this machine. */
  'agents:availability': { req: []; res: AgentAvailability };
  /** Native context menu; resolves the clicked item id (null = dismissed). */
  'ui:popupMenu': { req: [input: PopupMenuInput]; res: string | null };
}

/**
 * Top-level extras on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxAgentExtras {
  /** Which agent CLIs are installed (cached in main for the app's lifetime). */
  agentAvailability(): Promise<AgentAvailability>;
}

/**
 * Native-menu extra (unimplemented until the integrator wires it).
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxPopupMenuExtras {
  popupMenu(input: PopupMenuInput): Promise<string | null>;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-8.2 hardening pass — first-quit toast (DESIGN.md §4:
// "⌘Q | Quit — sessions keep running; first quit shows a one-time toast
// saying so"). New channels/types only, nothing above was modified.
//
// Flow: the native Quit menu item (src/main/menu.ts) does NOT quit directly;
// it sends EVT_QUIT_REQUESTED to the renderer. The renderer shows the
// one-time toast (localStorage gmux.quitToastShown) when ≥1 session is live,
// then invokes 'app:quit' (immediately on every later quit). Main arms a
// fallback timer so a hung/old renderer can never block quitting.
// ---------------------------------------------------------------------------

/** Main → renderer: the user asked to quit (⌘Q / Quit menu item). */
export const EVT_QUIT_REQUESTED = 'app:quitRequested' as const;

/** Payload of EVT_QUIT_REQUESTED: none — the event IS the message. */
export interface QuitEventPayloadMap {
  'app:quitRequested': [];
}

/** New invoke channel appended by the quit-toast flow. */
export interface QuitInvokeChannelMap {
  /** Renderer-confirmed quit — main calls app.quit(). */
  'app:quit': { req: []; res: void };
}

/**
 * Top-level extras on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxQuitExtras {
  /** Subscribe to native quit requests (⌘Q / Quit gmux menu item). */
  onQuitRequested(cb: () => void): Unsubscribe;
  /** Proceed with quitting (after the one-time §4 toast, or immediately). */
  quit(): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the round-1 layout stream (Phase 9) — new types only, nothing
// above was modified.
//
// The View menu grew four items: the activity-bar views (Explorer ⌘⇧E /
// Source Control ⌃⇧G) and the session-surface orientation radio pair
// ("Sessions on Top" / "Sessions on Right", persisted app-wide in the
// renderer's localStorage). They ride the existing EVT_MENU_ACTION channel;
// older renderers simply ignore ids they don't know.
// ---------------------------------------------------------------------------

/** View-menu actions added in round 1 (activity bar + orientation). */
export type LayoutMenuActionId =
  | 'show-explorer'
  | 'show-scm'
  | 'sessions-top'
  | 'sessions-right';

/** Every action the native menu can forward after the round-1 additions. */
export type AnyMenuActionId = MenuActionId | LayoutMenuActionId;

// ---------------------------------------------------------------------------
// APPENDED by the Phase-10 settings+hotkeys stream (S13) — new channels/types
// only, nothing above was modified.
//
// settings:get / settings:set — the persisted user settings (main-side JSON
//   store in userData, src/main/settings/store.ts). `set` takes a shallow
//   patch, persists, applies side effects (menu accelerator rebuild on hotkey
//   change), broadcasts EVT_SETTINGS_CHANGED to every window, and resolves
//   the full post-patch settings.
// settings:openWindow — open/focus the single-instance Settings window
//   (S13: dedicated BrowserWindow; ⌘, opens it straight from the native
//   menu, this channel serves the activity-bar gear).
// agents:flagPresets — the per-agent launch-flag catalogs
//   (src/main/agents/flags.ts) as renderer-safe views. Static per build;
//   renderers cache it.
//
// PRELOAD: per standing guardrail 1 this stream COLLAPSED the base/full/
// complete/depth wrapper generations in src/preload/index.ts into the single
// typed invoke over GmuxInvokeChannelMap below. Future streams append their
// channel map into a new superset alias and the one wrapper picks it up.
// ---------------------------------------------------------------------------

import type {
  AgentFlagCatalogs,
  GmuxSettings,
  GmuxSettingsPatch
} from '../settings';
import type { LaunchableAgentId } from '../types';

/** Main → renderers (ALL windows): the persisted settings changed. */
export const EVT_SETTINGS_CHANGED = 'settings:changed' as const;

/** Payload of EVT_SETTINGS_CHANGED (broadcast to EVERY window). */
export interface SettingsEventPayloadMap {
  'settings:changed': [settings: GmuxSettings];
}

/** New invoke channels appended by the settings+hotkeys stream. */
export interface SettingsInvokeChannelMap {
  /** Current persisted settings (defaults on first run). */
  'settings:get': { req: []; res: GmuxSettings };
  /** Shallow patch; resolves the full post-patch settings. */
  'settings:set': { req: [patch: GmuxSettingsPatch]; res: GmuxSettings };
  /** Open/focus the single-instance Settings window. */
  'settings:openWindow': { req: []; res: void };
  /** Launch-flag preset catalogs per launchable agent (static per build). */
  'agents:flagPresets': { req: []; res: AgentFlagCatalogs };
}

/**
 * Top-level extras on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxSettingsExtras {
  settingsGet(): Promise<GmuxSettings>;
  settingsSet(patch: GmuxSettingsPatch): Promise<GmuxSettings>;
  /** Open/focus the Settings window (activity-bar gear; menu uses main). */
  openSettings(): Promise<void>;
  agentFlagPresets(): Promise<AgentFlagCatalogs>;
  /** Fires in EVERY window whenever the persisted settings change. */
  onSettingsChanged(cb: (settings: GmuxSettings) => void): Unsubscribe;
}

/**
 * Menu actions for user-recorded per-agent hotkeys (S13): the native menu
 * registers "New <agent> session" items whose accelerators come from
 * GmuxSettings.hotkeys; each forwards `launch-agent:<id>` to the MAIN
 * window's renderer, which creates `<agent>-<n>` in the active project
 * (§6.2 quick-create path). Older renderers ignore unknown ids.
 */
export type AgentLaunchActionId = `launch-agent:${LaunchableAgentId}`;

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.85 (menu-bar sentinel) — one new action id shape on the
// EXISTING ui:menuAction channel; no new channel, no new preload wrapper.
//
// The status item lists the sessions that need input across every project.
// Choosing one has to land the user IN that session, which is a renderer act
// (project tab + session selection + terminal focus — the same jump ⌘J makes),
// so main forwards `focus-session:<sessionId>` exactly as the per-agent
// hotkeys forward `launch-agent:<id>`. Older renderers ignore unknown ids.
// ---------------------------------------------------------------------------

/** Menu action: reveal one specific session, wherever it lives. */
export type FocusSessionActionId = `focus-session:${string}`;

/**
 * Every action the renderer's menu dispatcher handles.
 *
 * Phase 14 folded `FindMenuActionId` in here (declared at the foot of this
 * file — type aliases hoist, so the forward reference is sound). One line, the
 * same shape as the GmuxInvokeChannelMap intersections above.
 */
export type AnyMenuActionWithProjects =
  | AnyMenuActionId
  | ProjectMenuActionId
  | FindMenuActionId
  | ChromeMenuActionId
  | CloneMenuActionId
  | PastSessionsMenuActionId
  // Phase 60. The View menu gained "Context", the same one-line fold.
  | ContextMenuActionId
  // Phase 137. The View menu gained "Catch Me Up", the same one-line fold.
  | OverviewMenuActionId
  // Phase 51. The payload-free nudge that a shell open is pending.
  | ShellOpenMenuActionId
  // Phase 90.3. File > Open Folder on a Machine…, the same one-line fold.
  | RemoteProjectMenuActionId
  // Phase 129. The View menu's projects radio pair, the same one-line fold.
  | ProjectsPositionMenuActionId;

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.12 item 2 (the inline sessions-position toggle) — one
// new channel, and it exists to preserve a guarantee rather than to add a
// feature.
//
// The session surface's position has exactly ONE truth: the renderer store's
// `sessionOrientation` (persisted to localStorage 'gmux.sessionOrientation').
// Until now the View menu was also its only CONTROL, so main could get away
// with reading that value back once per page load to set its radio checks.
// The moment the header carries an inline toggle, a position can change with
// no page load in sight — and a stale ✓ in the View menu is a second, wrong
// answer to "where are my sessions".
//
// ui:sessionsPosition is therefore a notification, not a setter: the store
// tells main which way it just went, main moves the radio marks to match. The
// renderer never asks main what the position is, so there is still one writer
// and one truth. MAIN: src/main/menu.ts → setSessionsPositionRadios().
//
// PHASE 14.7 made this channel the ONLY path. Main's page-load read-back
// (executeJavaScript against localStorage) is deleted: it raced this push,
// string-sniffed raw JSON for 'right', and fell back to top whenever it
// failed. The store now pushes on every change AND once as it loads, and main
// caches the last value so rebuilding the menu cannot reset the radios. The
// radio pair's ids, labels and actions live in src/shared/sessions-position.ts
// so main's radios and the renderer's controls read one table.
// ---------------------------------------------------------------------------

/** Where the session surface lives — mirrors the renderer's store type. */
export type SessionsPosition = 'top' | 'right';

/**
 * Where the project tabs live — mirrors the renderer's store type
 * (Phase 129). The same shape as the line above it, and for the same reason:
 * the tabs can now be a row across the top of the window or a rail down its
 * left side, and the View menu draws a radio pair that has to render the
 * store's answer rather than hold a second one.
 */
export type ProjectsPosition = 'top' | 'left';

/** New invoke channel appended by Phase 12.12's sessions-position toggle. */
export interface ViewMenuInvokeChannelMap {
  /** The store moved the session surface; move the View-menu radios to match. */
  'ui:sessionsPosition': { req: [position: SessionsPosition]; res: void };
  /**
   * Phase 129. The store moved the project tabs; move the View-menu radios to
   * match. One direction only, exactly like the line above. Main never asks
   * where the tabs are, so there is still one writer and one truth.
   */
  'ui:projectsPosition': { req: [position: ProjectsPosition]; res: void };
}

/**
 * Top-level extra on window.gmux — REQUIRED, unlike the older optional
 * extras (Phase 14.7). It was feature-detected, and "an older preload keeps
 * the once-per-load sync it always had" was a fiction: the preload ships in
 * the same asar as the store, so a missing method is our own bug, and
 * degrading silently to a menu that lies is worse than a loud failure. Making
 * it required means the compiler proves the preload wires it.
 */
export interface GmuxViewMenuExtras {
  setSessionsPosition(position: SessionsPosition): Promise<void>;
  /**
   * Phase 129, and required for the same reason as the line above it. A
   * missing method here is our own bug, not an older preload, because the
   * preload ships in the same asar as the store that calls it.
   */
  setProjectsPosition(position: ProjectsPosition): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 18 (chrome layout constraints) — one new id, folded into
// AnyMenuActionWithProjects above by the same one-line edit FindMenuActionId
// documents. The View menu is where ⌘B already lives, so its mnemonic pair
// ⇧⌘B belongs beside it rather than in a mode of its own.
// ---------------------------------------------------------------------------

/**
 * View-menu actions that hand one region the whole window.
 *
 * `toggle-editor-fill` came from Phase 18 and belongs to the open file.
 * `toggle-session-focus` came from Phase 80.1 and belongs to the session
 * surface. They sit in one union because they are the same kind of thing, and
 * both ride the existing EVT_MENU_ACTION event. Neither is an invoke channel,
 * so the contract inventory does not move.
 */
export type ChromeMenuActionId = 'toggle-editor-fill' | 'toggle-session-focus';

// ---------------------------------------------------------------------------
// APPENDED by Phase 129 (the project tabs can be a left rail) — one new id
// pair, folded into AnyMenuActionWithProjects above by the same one-line edit
// FindMenuActionId documents.
//
// The pair rides the existing EVT_MENU_ACTION event. Clicking a radio does not
// mark it: the action is forwarded to the renderer store, the store moves the
// tabs, and the store pushes the new position back over ui:projectsPosition,
// which is what moves the mark. One writer, three controls.
// ---------------------------------------------------------------------------

/**
 * View-menu actions that ASK for a project-tab position.
 *
 * The literals are repeated from src/shared/projects-position.ts rather than
 * imported, because that module imports this one for `ProjectsPosition` and a
 * type-level cycle between the contract and a table built on it is a cycle a
 * later reader has to unpick. The table's own `ProjectsPositionMenuAction` is
 * the same two strings, and projects-position.test.ts holds them equal.
 */
export type ProjectsPositionMenuActionId = 'projects-top' | 'projects-left';

/**
 * Every action the native menus (app menu + status item) can forward — the
 * payload type of EVT_MENU_ACTION, and what `sendMenuAction` accepts.
 *
 * Phase 16 (G10) made it DERIVED rather than parallel. There were two ladders
 * over the same ids: `MenuActionId → AnyMenuActionId → …WithProjects` (what
 * the renderer's dispatcher is typed against) and `…WithHotkeys →
 * …WithTray → …WithProjects → …WithFind` (what main sends), and they could
 * drift — a new id folded into one and not the other would type-check on both
 * sides and simply never be handled. There is now one union of dispatchable
 * ids plus the two TEMPLATE families that are handled by prefix before the
 * dispatcher ever sees them: `launch-agent:*` (Settings, which launches an
 * agent) and `focus-session:*` (the shell, which jumps to a session).
 *
 * Same set as the four-alias chain it replaces, member for member.
 */
export type MenuActionWithFind =
  | AnyMenuActionWithProjects
  | AgentLaunchActionId
  | FocusSessionActionId
  // Phase 18.6. The third template family, alongside the two above: File >
  // Open Recent carries a path, which cannot be a union member.
  | OpenRecentActionId
  // Phase 92. The fourth template family. A recent row whose folder is on
  // another machine carries the machine and the path, which is one more thing
  // than a union member can hold.
  | OpenRecentOnMachineActionId;

// ---------------------------------------------------------------------------
// APPENDED by Phase 19 item 11 (sleep and wake) — one new EVENT channel, its
// payload map, and one optional preload extra. The one existing line touched
// above is the AllEventPayloadMap intersection, exactly the one-line fold that
// declaration's own comment prescribes.
//
// WHY MAIN HAS TO ASK THE RENDERER. A WebGL texture atlas is a GPU resource
// owned by the renderer, and it does not survive the GPU process losing its
// context across a machine sleep. What the user sees on wake is a pane of
// wrong or blank glyphs that only a resize repairs. Main is the only process
// that receives `powerMonitor`'s resume event, and the renderer is the only
// process that can call `clearTextureAtlas()`. So the event exists to carry
// one fact across that gap, and it carries nothing else.
//
// This is the same handler VS Code wires in `terminalNativeContribution.ts`,
// to the same event, calling the same public function from `@xterm/xterm@6`.
// ---------------------------------------------------------------------------

/** Main → renderers: the machine woke up. Rare by definition. */
export const EVT_POWER_RESUME = 'power:resume' as const;

export interface PowerEventPayloadMap {
  /** No payload. The event IS the message, like `app:quitRequested`. */
  'power:resume': [];
}

/**
 * Top-level extra on window.gmux. Without it the pane keeps its stale atlas
 * until the next resize, which is the behaviour before Phase 19 and not a
 * broken one.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxPowerExtras {
  onPowerResume(cb: () => void): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 24 (self update). One invoke channel behind ONE optional
// preload extra, `window.gmux.updates`. The one existing line touched above is
// the GmuxInvokeChannelMap intersection, exactly as that declaration's own
// comment prescribes.
//
// updates:state is a READ and it is the only updates channel. The renderer
// asks what is true right now and draws one Settings caption from it. The
// menu, the dialogs, the timers and the install call all live in main
// (src/main/updates), because the update engine must never depend on a
// renderer being open. There is deliberately no channel that starts a check,
// no channel that installs, and no event stream that pushes update state at
// the renderer. The announcement surface is one native menu item.
//
// MAIN: src/main/updates/ipc.ts, the one `updates:*` registrar.
// ---------------------------------------------------------------------------

/**
 * What the activity bar ring draws (Phase 58). 'hidden' is the state almost
 * all of the time. The five visible stages carry the manual update journey.
 * VISIBILITY IS DECIDED IN MAIN: the renderer draws exactly what this field
 * says and holds no policy of its own, so the rule "the ring never animates
 * for a check the user did not start" lives in one unit-tested place
 * (src/main/updates/journey.ts).
 */
export type UpdateRingStage =
  | 'hidden'
  | 'checking'
  | 'downloading'
  | 'staging'
  | 'ready'
  | 'failed';

/**
 * What the Settings row reads. `stagedVersion` is non null only when the OS
 * updater has finished staging the update, so a quit from that moment really
 * installs it. Phase 31 moved the flip from the library's downloaded event
 * to the native staged event, because about 1.6 seconds separate the two and
 * a quit inside that gap installs nothing. `lastCheckedAt` is epoch ms of
 * the last completed check, or null when no check has run yet on this
 * install.
 *
 * Phase 58 added the four ring fields. They are additive, so the Settings
 * row compiles and behaves unchanged.
 */
export interface UpdateUiState {
  currentVersion: string;
  stagedVersion: string | null;
  lastCheckedAt: number | null;
  /**
   * True when the launch found updater state that stops any install from
   * happening, so the Tortie menu offers the repair item. False on every
   * ordinary launch. Added in Phase 43.
   */
  needsUpdateRepair: boolean;
  /** Phase 58. What the activity bar ring draws. Visibility is decided in main. */
  ring: UpdateRingStage;
  /** The version the ring concerns. Null when ring is hidden or checking. */
  ringVersion: string | null;
  /** Whole number 0 to 100 while downloading. Null in every other state. */
  ringPercent: number | null;
  /** Which stage failed, for the failed hover and the Why it failed dialog. */
  failedDuring: 'checking' | 'downloading' | 'staging' | null;
}

export interface UpdatesInvokeChannelMap {
  'updates:state': { req: []; res: UpdateUiState };
  /**
   * Phase 58. The ring's ready menu needs an install action reachable from
   * the renderer. It calls the one existing quitAndInstall wrapper
   * (installStagedUpdateNow, a no-op unless staged) and adds no relaunch
   * logic.
   */
  'updates:restartNow': { req: []; res: void };
  /**
   * Phase 58. The failed menu item must show a native dialog, and dialogs
   * are owned by main.
   */
  'updates:whyFailed': { req: []; res: void };
  /**
   * Phase 58. The failed menu item reuses the Phase 43 repair flow
   * (offerUpdaterRepair), which lives in main.
   */
  'updates:repair': { req: []; res: void };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 58 (the update ring). One event channel, because the
// renderer needs a push to animate the ring, and the backlog entry sanctions
// the minimal event. The payload is the whole UpdateUiState so a listener
// never has to follow up with a read. Folded into AllEventPayloadMap by the
// one-line edit index.ts prescribes.
// ---------------------------------------------------------------------------

/** Main → renderers: the update state changed (ring stage or progress). */
export const EVT_UPDATES_CHANGED = 'updates:changed' as const;

/** Payload of EVT_UPDATES_CHANGED (broadcast to EVERY window). */
export interface UpdatesEventPayloadMap {
  'updates:changed': [state: UpdateUiState];
}

/**
 * Extra on window.gmux. A build without it shows no Updates row rather than
 * a row that throws, and no ring at all. The four Phase 58 members are
 * optional one by one, so an older preload without them simply has no ring.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxUpdatesExtras {
  updates: {
    state(): Promise<UpdateUiState>;
    restartNow(): Promise<void>;
    whyFailed(): Promise<void>;
    repair(): Promise<void>;
    onChanged(cb: (state: UpdateUiState) => void): Unsubscribe;
  };
}
