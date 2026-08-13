/**
 * gmux IPC contract — FROZEN.
 *
 * Channel names, payload shapes, and the `window.gmux` bridge surface.
 * Existing declarations must not be changed; new channels/types may be
 * APPENDED. Note conflicts for the integrator instead of editing.
 */

import type {
  CreateSessionInput,
  GitCommitInput,
  GitLogEntry,
  GitLogInput,
  GitPathsInput,
  GitShowHeadInput,
  GitStatusResult,
  Project,
  ReadFileResult,
  RenameSessionInput,
  ResizeInput,
  Session,
  SessionStatus
} from './types';

// ---------------------------------------------------------------------------
// Invoke channels (renderer → main, request/response via ipcRenderer.invoke)
// ---------------------------------------------------------------------------

/**
 * Channel → { req: argument tuple, res: resolved value }.
 * Main registers with `ipcMain.handle(channel, ...)`; the preload bridge is
 * the only caller.
 */
export interface InvokeChannelMap {
  'sessions:create': { req: [input: CreateSessionInput]; res: Session };
  'sessions:list': { req: []; res: Session[] };
  'sessions:rename': { req: [input: RenameSessionInput]; res: Session };
  'sessions:kill': { req: [sessionId: string]; res: void };
  /** Start streaming term:data:<id> for this session (visible pane). */
  'sessions:attach': { req: [sessionId: string]; res: void };
  /** Stop streaming; the tmux-side session keeps running. */
  'sessions:detach': { req: [sessionId: string]; res: void };
  'sessions:resize': { req: [input: ResizeInput]; res: void };

  'projects:add': { req: [path: string]; res: Project };
  'projects:list': { req: []; res: Project[] };
  'projects:remove': { req: [projectId: string]; res: void };
  /** Native directory picker; null when the user cancels. */
  'projects:pickDirectory': { req: []; res: string | null };

  'git:status': { req: [repoPath: string]; res: GitStatusResult };
  'git:stage': { req: [input: GitPathsInput]; res: void };
  'git:unstage': { req: [input: GitPathsInput]; res: void };
  /** Resolves to the new commit hash. */
  'git:commit': { req: [input: GitCommitInput]; res: string };
  'git:discard': { req: [input: GitPathsInput]; res: void };
  'git:log': { req: [input: GitLogInput]; res: GitLogEntry[] };
  /** Contents of the file at HEAD (empty string for files new since HEAD). */
  'git:showHead': { req: [input: GitShowHeadInput]; res: string };

  'fs:readFile': { req: [path: string]; res: ReadFileResult };
  'fs:writeFile': { req: [path: string, contents: string]; res: void };
}

export type InvokeChannel = keyof InvokeChannelMap;


// ---------------------------------------------------------------------------
// Event channels (main → renderer, via webContents.send)
// ---------------------------------------------------------------------------

export const EVT_SESSIONS_CHANGED = 'sessions:changed' as const;
export const EVT_GIT_CHANGED = 'git:changed' as const;
export const EVT_STATUS_CHANGED = 'status:changed' as const;

/** Static event channel → payload tuple delivered to listeners. */
export interface EventPayloadMap {
  /** Full refreshed session list after any add/rename/kill/status change. */
  'sessions:changed': [sessions: Session[]];
  /** A repo's working tree / index / HEAD changed; re-pull git:status. */
  'git:changed': [repoPath: string];
  /** One session's status flipped (cheap, no full list). */
  'status:changed': [sessionId: string, status: SessionStatus];
}

/**
 * Per-session terminal output stream (main → renderer).
 * Payload: a single Uint8Array chunk of raw PTY bytes.
 */
export const termDataChannel = (sessionId: string): string =>
  `term:data:${sessionId}`;

/**
 * Per-session terminal input (renderer → main, fire-and-forget send).
 * Payload: string (keystrokes/paste) — main writes it to the attach PTY.
 */
export const termInputChannel = (sessionId: string): string =>
  `term:input:${sessionId}`;

// ---------------------------------------------------------------------------
// The window.gmux bridge surface (implemented in src/preload/index.ts)
// ---------------------------------------------------------------------------

/** Returned by every subscription; call to unsubscribe. */
export type Unsubscribe = () => void;

export interface GmuxApi {
  sessions: {
    create(input: CreateSessionInput): Promise<Session>;
    list(): Promise<Session[]>;
    rename(input: RenameSessionInput): Promise<Session>;
    kill(sessionId: string): Promise<void>;
    attach(sessionId: string): Promise<void>;
    detach(sessionId: string): Promise<void>;
    resize(input: ResizeInput): Promise<void>;
    onChanged(cb: (sessions: Session[]) => void): Unsubscribe;
    onStatusChanged(
      cb: (sessionId: string, status: SessionStatus) => void
    ): Unsubscribe;
  };
  projects: {
    add(path: string): Promise<Project>;
    list(): Promise<Project[]>;
    remove(projectId: string): Promise<void>;
    pickDirectory(): Promise<string | null>;
  };
  git: {
    status(repoPath: string): Promise<GitStatusResult>;
    stage(input: GitPathsInput): Promise<void>;
    unstage(input: GitPathsInput): Promise<void>;
    commit(input: GitCommitInput): Promise<string>;
    discard(input: GitPathsInput): Promise<void>;
    log(input: GitLogInput): Promise<GitLogEntry[]>;
    showHead(input: GitShowHeadInput): Promise<string>;
    onChanged(cb: (repoPath: string) => void): Unsubscribe;
  };
  fs: {
    readFile(path: string): Promise<ReadFileResult>;
    writeFile(path: string, contents: string): Promise<void>;
  };
  term: {
    /** Subscribe to raw output bytes for a session (after sessions.attach). */
    onData(sessionId: string, cb: (data: Uint8Array) => void): Unsubscribe;
    /** Send keystrokes/paste to the session's PTY. */
    sendInput(sessionId: string, data: string): void;
  };
  /** App/platform facts safe to expose to the renderer. */
  meta: {
    platform: NodeJS.Platform;
    versions: { electron: string; chrome: string; node: string };
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the attach/terminal stream (new channels/types only — nothing
// above this line was modified).
// ---------------------------------------------------------------------------

/**
 * Per-session flow-control ack (renderer → main, fire-and-forget send).
 * Payload: number — bytes of term:data the renderer has finished writing
 * into xterm. The attach host pauses the PTY when > 256 KB are in flight
 * unacked and resumes once acks bring the window back under 64 KB. If no
 * ack ever arrives (bridge method not wired), the attach host disables flow
 * control for that client after a grace period rather than deadlock.
 */
export const termAckChannel = (sessionId: string): string =>
  `term:ack:${sessionId}`;

/**
 * Per-session attach-client exit notice (main → renderer).
 * Sent ONLY for unexpected exits — the tmux session was killed elsewhere or
 * the tmux server went away. A clean sessions:detach never fires this.
 */
export const termExitChannel = (sessionId: string): string =>
  `term:exit:${sessionId}`;

/** Payload of termExitChannel. */
export interface TermExitPayload {
  sessionId: string;
  /** Exit code of the `tmux attach` client process. */
  exitCode: number;
  /** Signal number when the client died from a signal. */
  signal?: number;
}

/**
 * OPTIONAL extensions to GmuxApi['term'], feature-detected by the terminal
 * renderer (`typeof window.gmux.term.ack === 'function'`). INTEGRATOR: add
 * these two methods to the `term` object in src/preload/index.ts:
 *
 *   ack: (sessionId, bytes) =>
 *     ipcRenderer.send(termAckChannel(sessionId), bytes),
 *   onExit: (sessionId, cb) => {
 *     const ch = termExitChannel(sessionId);
 *     const l = (_e: IpcRendererEvent, p: TermExitPayload) => cb(p);
 *     ipcRenderer.on(ch, l);
 *     return () => ipcRenderer.removeListener(ch, l);
 *   }
 *
 * The renderer degrades gracefully when they are absent (no backpressure
 * acks → attach host's grace-period valve; exit notices → falls back to
 * sessions.onStatusChanged('exited')).
 */
export interface GmuxTermStreamExtras {
  /** Ack `bytes` of received term:data as consumed (flow control). */
  ack?(sessionId: string, bytes: number): void;
  /** Subscribe to unexpected attach-client exits for a session. */
  onExit?(
    sessionId: string,
    cb: (payload: TermExitPayload) => void
  ): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by the app-shell stream (Phase 3) — new channels/types only,
// nothing above was modified. All of these are OPTIONAL bridge extensions:
// the shell feature-detects each method (`typeof fn === 'function'`) and
// hides the corresponding affordance when absent, so the app works against
// the frozen Phase-2 preload unchanged.
//
// INTEGRATOR wiring (main handler exists where noted):
//   'sessions:discard' → core.discardSession(id) + broadcastSessions()
//                        (src/main/ipc.ts already implements discardSession)
//   'projects:rename'  → new manifest update (no core method yet)
//   'app:setBadgeCount'→ app.setBadgeCount / dock.setBadge in main
// Preload: add the matching methods per the GmuxApi pattern.
// ---------------------------------------------------------------------------

/** New invoke channels appended by the shell stream (see InvokeChannelMap). */
export interface ShellInvokeChannelMap {
  /**
   * Remove an exited/restorable session row entirely (manifest delete).
   * The §6.6 "Remove" affordance. Never valid for a live session.
   */
  'sessions:discard': { req: [sessionId: string]; res: void };
  /** Rename a project tab (F2 on tab). */
  'projects:rename': { req: [projectId: string, name: string]; res: Project };
  /** Mirror the global NEEDS_INPUT count onto the Dock badge. */
  'app:setBadgeCount': { req: [count: number]; res: void };
}

/**
 * OPTIONAL extensions to GmuxApi['sessions'], feature-detected by the shell
 * (`typeof window.gmux.sessions.discard === 'function'`).
 */
export interface GmuxSessionExtras {
  /** Remove an exited/restorable session row (manifest delete). */
  discard?(sessionId: string): Promise<void>;
}

/** OPTIONAL extensions to GmuxApi['projects'], feature-detected. */
export interface GmuxProjectExtras {
  /** Rename a project tab. */
  rename?(projectId: string, name: string): Promise<Project>;
}

/** OPTIONAL app-level extras (Dock badge), feature-detected. */
export interface GmuxAppExtras {
  /** Set the Dock badge to the global needs-input count (0 clears). */
  setBadgeCount?(count: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the SCM stream (Phase 3) — new channels/types only, nothing
// above was modified. OPTIONAL bridge extension: the SCM UI feature-detects
// `typeof window.gmux.git.init === 'function'` and hides the §6.3
// [Initialize repository] button when absent, so it works against the
// frozen Phase-2 preload unchanged.
//
// INTEGRATOR wiring:
//   'git:init' → main: spawn `git init` in repoPath (reject with GIT_FAILED
//                on nonzero exit), then emit EVT_GIT_CHANGED for repoPath.
//   preload:     init: (repoPath) => invoke('git:init', repoPath)
// ---------------------------------------------------------------------------

/** New invoke channel appended by the SCM stream (see InvokeChannelMap). */
export interface ScmInvokeChannelMap {
  /** `git init` in a non-repo project folder (§6.3 friendly state). */
  'git:init': { req: [repoPath: string]; res: void };
}

/** OPTIONAL extensions to GmuxApi['git'], feature-detected by the SCM UI. */
export interface GmuxGitExtras {
  /** Initialize a repository in a non-git project folder. */
  init?(repoPath: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the file-tree stream (Phase 3) — new channels/types only,
// nothing above was modified. Both channels are OPTIONAL bridge extensions:
// the tree feature-detects each (`typeof window.gmux.fs.readDir ===
// 'function'`) and shows a friendly stub / hides the menu item when absent,
// so the app works against the frozen Phase-2 preload unchanged.
//
// INTEGRATOR wiring (no main handler exists yet — both are new):
//   'fs:readDir' → main: fs.promises.readdir(dirPath, { withFileTypes: true })
//                  mapped to FsDirEntry[] with kind =
//                    isDirectory() ? 'dir'
//                    : isSymbolicLink() ? 'symlink'
//                    : isFile() ? 'file' : 'other';
//                  return ALL entries unfiltered/unsorted (the renderer hides
//                  .git, keeps dotfiles, and sorts). Reject paths outside
//                  known project roots if you add validation. Errors throw
//                  GmuxErrorPayload code 'FS_FAILED' (message: "Could not
//                  read <basename>").
//   'fs:reveal'  → main: electron shell.showItemInFolder(path) (void).
// Preload: add to the `fs` object per the GmuxApi pattern:
//   readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
//   reveal:  (path)    => ipcRenderer.invoke('fs:reveal', path)
// ---------------------------------------------------------------------------

import type { ReadDirResult } from './types';

/** New invoke channels appended by the file-tree stream. */
export interface TreeInvokeChannelMap {
  /** List one directory (lazy tree loading; renderer filters + sorts). */
  'fs:readDir': { req: [dirPath: string]; res: ReadDirResult };
  /** Reveal a file/folder in Finder (tree context menu). */
  'fs:reveal': { req: [path: string]; res: void };
}

/**
 * OPTIONAL extensions to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.readDir === 'function'`).
 */
export interface GmuxFsExtras {
  /** List a directory for the file tree. */
  readDir?(dirPath: string): Promise<ReadDirResult>;
  /** Reveal a path in Finder. */
  reveal?(path: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the restore stream (Phase 6) — new channels/types only, nothing
// above was modified. All OPTIONAL bridge extensions, feature-detected by the
// renderer (`typeof window.gmux.sessions.restore === 'function'`), so the app
// still works against older preloads.
//
// Wiring (done by this phase): main registers the channels in
// src/main/restore/ipc.ts; preload adds the methods per the GmuxApi pattern.
// ---------------------------------------------------------------------------

import type { Session as RestoreSession } from './types';

/** New invoke channels appended by the restore stream. */
export interface RestoreInvokeChannelMap {
  /**
   * Recreate a 'restorable' session (FINAL-REPORT §2.4 Step 3): fresh tmux
   * session in the recorded cwd running $SHELL, prior scrollback snapshot
   * cat-ed as inert history, and the recorded resume command TYPED but not
   * executed (armed). Resolves to the refreshed Session (status 'running').
   * Idempotent for already-live sessions.
   */
  'sessions:restore': { req: [sessionId: string]; res: RestoreSession };
  /** Read the 'Launch gmux at login' state (app.getLoginItemSettings). */
  'app:getLoginItem': { req: []; res: { openAtLogin: boolean } };
  /**
   * Toggle 'Launch gmux at login' (app.setLoginItemSettings) and return the
   * OS-read-back state — the UI must render the readback, not the request.
   */
  'app:setLoginItem': { req: [openAtLogin: boolean]; res: { openAtLogin: boolean } };
}

/**
 * OPTIONAL extension to GmuxApi['sessions'], feature-detected by the shell
 * (`typeof window.gmux.sessions.restore === 'function'`).
 */
export interface GmuxSessionRestoreExtras {
  /** Restore a 'restorable' session with an armed resume command. */
  restore?(sessionId: string): Promise<RestoreSession>;
}

/** OPTIONAL top-level extras on window.gmux (login item), feature-detected. */
export interface GmuxLoginItemExtras {
  getLoginItem?(): Promise<{ openAtLogin: boolean }>;
  setLoginItem?(openAtLogin: boolean): Promise<{ openAtLogin: boolean }>;
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

/** OPTIONAL top-level extra on window.gmux, feature-detected by the shell. */
export interface GmuxMenuExtras {
  /** Subscribe to native app-menu actions. */
  onMenuAction?(cb: (action: MenuActionWithFind) => void): Unsubscribe;
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
 * OPTIONAL top-level extras on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.agentAvailability === 'function'`).
 */
export interface GmuxAgentExtras {
  /** Which agent CLIs are installed (cached in main for the app's lifetime). */
  agentAvailability?(): Promise<AgentAvailability>;
}

/** OPTIONAL native-menu extra (unimplemented until the integrator wires it). */
export interface GmuxPopupMenuExtras {
  popupMenu?(input: PopupMenuInput): Promise<string | null>;
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

/** OPTIONAL top-level extras on window.gmux, feature-detected by the shell. */
export interface GmuxQuitExtras {
  /** Subscribe to native quit requests (⌘Q / Quit gmux menu item). */
  onQuitRequested?(cb: () => void): Unsubscribe;
  /** Proceed with quitting (after the one-time §4 toast, or immediately). */
  quit?(): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by the git-depth stream (dogfood round 1) — new channels/types
// only, nothing above was modified. Powers the VS Code-bar git history:
// branch switching from the SCM header, the per-commit context menu
// (Checkout (Detached) / Create Branch… / Create Tag… / Cherry Pick /
// Open on GitHub), and the rich commit hover card.
//
// Wiring (done by this stream): main registers the channels in
// src/main/git/depth-ipc.ts via registerGitDepthIpc, called from
// registerGitIpc (the existing git registration point); preload appends the
// methods to the `git` object. All OPTIONAL bridge extensions — the renderer
// feature-detects each (`typeof window.gmux.git.branches === 'function'`).
// ---------------------------------------------------------------------------

import type {
  GitBranchInfo,
  GitCheckoutDetachedInput,
  GitCheckoutInput,
  GitCherryPickInput,
  GitCherryPickResult,
  GitCommitDetail,
  GitCommitDetailInput,
  GitCreateBranchInput,
  GitCreateTagInput
} from './types';

/** New invoke channels appended by the git-depth stream. */
export interface GitDepthInvokeChannelMap {
  /** Local branches with current/upstream/ahead/behind (for-each-ref). */
  'git:branches': { req: [repoPath: string]; res: GitBranchInfo[] };
  /** Switch to a local branch (`git checkout <branch>`). */
  'git:checkout': { req: [input: GitCheckoutInput]; res: void };
  /** Create a branch (and switch to it), optionally from a start ref. */
  'git:createBranch': { req: [input: GitCreateBranchInput]; res: void };
  /** Create a lightweight tag at a commit. */
  'git:createTag': { req: [input: GitCreateTagInput]; res: void };
  /**
   * Cherry-pick a commit onto HEAD. Conflicts resolve (not reject!) with a
   * typed `{status:'conflict'}` result after an automatic abort — the repo
   * is never left mid-cherry-pick.
   */
  'git:cherryPick': { req: [input: GitCherryPickInput]; res: GitCherryPickResult };
  /** Everything the rich hover card needs (message, files, +/− counts). */
  'git:commitDetail': { req: [input: GitCommitDetailInput]; res: GitCommitDetail };
  /**
   * https://github.com/... URL for origin when it is a GitHub remote (ssh
   * forms normalized); null for non-GitHub or missing origin ("Open on
   * GitHub" hides itself).
   */
  'git:remoteUrl': { req: [repoPath: string]; res: string | null };
  /** Check out a commit detached (`git checkout --detach <sha>`). */
  'git:checkoutDetached': { req: [input: GitCheckoutDetachedInput]; res: void };
}

/**
 * OPTIONAL extensions to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.branches === 'function'`, etc.).
 */
export interface GmuxGitDepthExtras {
  branches?(repoPath: string): Promise<GitBranchInfo[]>;
  checkout?(input: GitCheckoutInput): Promise<void>;
  createBranch?(input: GitCreateBranchInput): Promise<void>;
  createTag?(input: GitCreateTagInput): Promise<void>;
  cherryPick?(input: GitCherryPickInput): Promise<GitCherryPickResult>;
  commitDetail?(input: GitCommitDetailInput): Promise<GitCommitDetail>;
  remoteUrl?(repoPath: string): Promise<string | null>;
  checkoutDetached?(input: GitCheckoutDetachedInput): Promise<void>;
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
// APPENDED by the Phase-10 registry+detection stream — new channels/types
// only, nothing above was modified.
//
// agents:list   — full 12-agent detection result (registry ids, resolved
//                 absolute binPath, version from each entry's versionCmd,
//                 store-dir presence). Scanned once on first call, cached.
// agents:rescan — drop the cache and re-probe (Settings "Re-scan" button);
//                 resolves the fresh result.
//
// Main handlers are registered by src/main/agents (registerAgentsIpc — same
// entry point that already registers agents:availability, so no main/index.ts
// change was needed).
//
// INTEGRATOR wiring (preload; per standing guardrail 1 fold these into the
// single typed bridge instead of adding a new wrapper generation):
//   agentsList:   () => invoke('agents:list'),
//   agentsRescan: () => invoke('agents:rescan')
// Renderer feature-detects `typeof window.gmux.agentsList === 'function'`.
// ---------------------------------------------------------------------------

import type { AgentsScanResult } from './types';

/** New invoke channels appended by the registry+detection stream. */
export interface AgentsInvokeChannelMap {
  /** Cached full-registry detection scan (12 agents, path+version+store). */
  'agents:list': { req: []; res: AgentsScanResult };
  /** Clear the detection cache and re-probe everything. */
  'agents:rescan': { req: []; res: AgentsScanResult };
}

/**
 * OPTIONAL top-level extras on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.agentsList === 'function'`).
 */
export interface GmuxAgentRegistryExtras {
  /** Detection scan over the full agent registry (cached in main). */
  agentsList?(): Promise<AgentsScanResult>;
  /** Re-probe (Settings re-scan button); resolves the fresh result. */
  agentsRescan?(): Promise<AgentsScanResult>;
}

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
} from './settings';
import type { LaunchableAgentId } from './types';

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
 * OPTIONAL top-level extras on window.gmux, feature-detected by renderers
 * (`typeof window.gmux.settingsGet === 'function'`).
 */
export interface GmuxSettingsExtras {
  settingsGet?(): Promise<GmuxSettings>;
  settingsSet?(patch: GmuxSettingsPatch): Promise<GmuxSettings>;
  /** Open/focus the Settings window (activity-bar gear; menu uses main). */
  openSettings?(): Promise<void>;
  agentFlagPresets?(): Promise<AgentFlagCatalogs>;
  /** Fires in EVERY window whenever the persisted settings change. */
  onSettingsChanged?(cb: (settings: GmuxSettings) => void): Unsubscribe;
}

/**
 * Menu actions for user-recorded per-agent hotkeys (S13): the native menu
 * registers "New <agent> session" items whose accelerators come from
 * GmuxSettings.hotkeys; each forwards `launch-agent:<id>` to the MAIN
 * window's renderer, which creates `<agent>-<n>` in the active project
 * (§6.2 quick-create path). Older renderers ignore unknown ids.
 */
export type AgentLaunchActionId = `launch-agent:${LaunchableAgentId}`;

/**
 * THE preload bridge map (standing guardrail 1): every channel this build's
 * preload can invoke, as ONE flat intersection of per-domain maps.
 *
 * Phase 16 (G9) flattened it. Fifteen phases of parallel streams had each
 * appended a channel map AND a new superset alias over the previous superset —
 * Extended ⊂ All ⊂ Full ⊂ Complete ⊂ Depth ⊂ Registry ⊂ Branches ⊂ Gmux, nine
 * levels, each with its own `<X>InvokeChannel` / `Req` / `Res` trio. Every one
 * of those aliases was referenced only by the next alias in the chain (the
 * `Req`/`Res` trios were referenced by nothing at all), so reading the bridge
 * meant walking eight indirections to learn a set union. The set is unchanged
 * — the same 77 channels, verified key-for-key before and after — and it is
 * now readable in one screen.
 *
 * A future stream adds ONE line here: its own `<Domain>InvokeChannelMap`. It
 * does not alias a new superset. (Type declarations hoist, so intersecting a
 * map declared further down this file is sound.)
 */
export type GmuxInvokeChannelMap = InvokeChannelMap &
  ShellInvokeChannelMap &
  ScmInvokeChannelMap &
  TreeInvokeChannelMap &
  RestoreInvokeChannelMap &
  HardeningInvokeChannelMap &
  QuitInvokeChannelMap &
  GitDepthInvokeChannelMap &
  AgentsInvokeChannelMap &
  SettingsInvokeChannelMap &
  GitBranchesInvokeChannelMap &
  GitSyncInvokeChannelMap &
  DropInvokeChannelMap &
  TerminalCaptureInvokeChannelMap &
  TerminalScrollInvokeChannelMap &
  ActivityInvokeChannelMap &
  MultilineInvokeChannelMap &
  FileOpsInvokeChannelMap &
  ImageProjectInvokeChannelMap &
  FsDuplicateInvokeChannelMap &
  ViewMenuInvokeChannelMap &
  SearchInvokeChannelMap &
  QuickOpenInvokeChannelMap &
  SymbolsInvokeChannelMap &
  ScrollbackInvokeChannelMap &
  GitGraphInvokeChannelMap &
  SpecStoryStatusInvokeChannelMap &
  CloneInvokeChannelMap &
  RecentsInvokeChannelMap &
  DurabilityInvokeChannelMap &
  PreviewInvokeChannelMap;

export type GmuxInvokeChannel = keyof GmuxInvokeChannelMap;

export type GmuxInvokeReq<C extends GmuxInvokeChannel> =
  GmuxInvokeChannelMap[C]['req'];
export type GmuxInvokeRes<C extends GmuxInvokeChannel> =
  GmuxInvokeChannelMap[C]['res'];

// ---------------------------------------------------------------------------
// APPENDED by the branch-management stream (Phase 10 #7) — new channels/types
// only, nothing above was modified. Powers the BRANCHES sidebar section:
// remote refs, fetch, tracking checkout, and local branch deletion.
//
// Main handlers are registered by registerGitDepthIpc (src/main/git/
// depth-ipc.ts — the existing git-depth registration point), sharing the
// per-repo GitService + watcher registries.
//
// INTEGRATOR wiring (preload; per standing guardrail 1 fold these into the
// single typed bridge instead of adding a new wrapper generation — append to
// the existing `git` object):
//   remoteBranches:   (repoPath) => invoke('git:remoteBranches', repoPath),
//   fetch:            (repoPath) => invoke('git:fetch', repoPath),
//   checkoutTracking: (input)    => invoke('git:checkoutTracking', input),
//   deleteBranch:     (input)    => invoke('git:deleteBranch', input)
// Renderer feature-detects `typeof window.gmux.git.remoteBranches ===
// 'function'` (older preloads keep the local-only branch list).
// ---------------------------------------------------------------------------

import type {
  GitCheckoutTrackingInput,
  GitDeleteBranchInput,
  GitDeleteBranchResult,
  GitRemoteBranchesResult
} from './types';

/** New invoke channels appended by the branch-management stream. */
export interface GitBranchesInvokeChannelMap {
  /** Remote-tracking branches + last-fetch time (for-each-ref refs/remotes). */
  'git:remoteBranches': {
    req: [repoPath: string];
    res: GitRemoteBranchesResult;
  };
  /** `git fetch --all --prune` (network; long timeout, never interactive). */
  'git:fetch': { req: [repoPath: string]; res: void };
  /**
   * Check out a remote branch: existing local with the same short name →
   * plain checkout; otherwise create a tracking local and switch to it.
   */
  'git:checkoutTracking': { req: [input: GitCheckoutTrackingInput]; res: void };
  /**
   * Delete a local branch. "Not fully merged" resolves (not rejects!) with a
   * typed `{status:'unmerged'}` so the UI offers force exactly when needed.
   */
  'git:deleteBranch': {
    req: [input: GitDeleteBranchInput];
    res: GitDeleteBranchResult;
  };
}

/**
 * OPTIONAL extensions to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.remoteBranches === 'function'`, etc.).
 */
export interface GmuxGitBranchExtras {
  remoteBranches?(repoPath: string): Promise<GitRemoteBranchesResult>;
  fetch?(repoPath: string): Promise<void>;
  checkoutTracking?(input: GitCheckoutTrackingInput): Promise<void>;
  deleteBranch?(input: GitDeleteBranchInput): Promise<GitDeleteBranchResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-12 git stream — new channels/types only, nothing
// above was modified. Two capabilities:
//
//   git:commitFileDiff — BACKLOG 12 item 4: the `<sha>^ → <sha>` content pair
//     for one file of one commit (read-only, never broadcasts).
//   git:remotes / git:push / git:pull / git:sync — BACKLOG 12 item 3.
//
// Main handlers are registered by registerGitDepthIpc (src/main/git/
// depth-ipc.ts — the existing git registration point), sharing the per-repo
// GitService + watcher registries. No new superset alias and no new preload
// wrapper generation (standing guardrail 1): this map is intersected straight
// into GmuxInvokeChannelMap above (declarations hoist, same forward reference
// the branch-management stream already uses), so the ONE typed invoke in
// src/preload/index.ts spans it, and the renderer feature-detects each method
// (`typeof window.gmux.git.commitFileDiff === 'function'`).
// ---------------------------------------------------------------------------

import type {
  GitCommitFileDiff,
  GitCommitFileDiffInput,
  GitPullInput,
  GitPullResult,
  GitPushInput,
  GitPushResult,
  GitRemotesResult,
  GitSyncInput,
  GitSyncResult
} from './types';

/** New invoke channels appended by the Phase-12 git stream. */
export interface GitSyncInvokeChannelMap {
  /**
   * Parent→commit content pair for ONE file of ONE commit. A null side means
   * the file does not exist there (added / deleted); the caller renders that
   * as an all-green / all-red diff rather than an error.
   */
  'git:commitFileDiff': {
    req: [input: GitCommitFileDiffInput];
    res: GitCommitFileDiff;
  };
  /** Configured remotes (name + fetch/push URL) + the tracking context. */
  'git:remotes': { req: [repoPath: string]; res: GitRemotesResult };
  /**
   * `git push` (optionally `-u <remote> <branch>` to publish). A branch with
   * no upstream resolves (not rejects!) with `{status:'no-upstream'}` so the
   * UI offers Publish instead of inventing a remote.
   */
  'git:push': { req: [input: GitPushInput]; res: GitPushResult };
  /** `git pull` honouring the user's pull.rebase; conflicts are typed. */
  'git:pull': { req: [input: GitPullInput]; res: GitPullResult };
  /** Sync = pull, then push (VS Code's Sync Changes). */
  'git:sync': { req: [input: GitSyncInput]; res: GitSyncResult };
}

/**
 * OPTIONAL extensions to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.sync === 'function'`, etc.).
 */
export interface GmuxGitSyncExtras {
  commitFileDiff?(input: GitCommitFileDiffInput): Promise<GitCommitFileDiff>;
  remotes?(repoPath: string): Promise<GitRemotesResult>;
  push?(input: GitPushInput): Promise<GitPushResult>;
  pull?(input: GitPullInput): Promise<GitPullResult>;
  sync?(input: GitSyncInput): Promise<GitSyncResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by the image-drop stream (Phase 12 item 8, research 16) — new
// channels/types only. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as its own comment prescribes
// ("future streams intersect their appended map here").
//
// drop:strategies — the per-agent file-reference table, read straight off the
//   main-process agent registry (the table exists ONCE, guardrail 3). Static
//   per build; the renderer primes it at mount and caches it.
// drop:prepare    — stat + classify absolute paths the renderer resolved with
//   webUtils. Directories are branched HERE, not guessed in the renderer, and
//   a filename carrying a newline is copied to a safe name in the drop store.
// drop:persist    — write bytes that have no path of their own (⌘V of raw
//   image data, browser drags) to <userData>/gmux/dropped-images and hand
//   back the absolute path.
//
// PRELOAD (already wired in src/preload/index.ts, guardrail 1 — appended to
// the single typed bridge, no new wrapper generation):
//   pathForFile: (file) => webUtils.getPathForFile(file)   // '' when pathless
//   drop: { strategies, prepare, persist }
// `webUtils` is renderer-side only (it does not exist in main), so
// pathForFile MUST live in the preload. Renderers feature-detect
// `typeof window.gmux.pathForFile === 'function'`.
// ---------------------------------------------------------------------------

import type {
  DropPersistInput,
  DropPersistResult,
  DropPrepareResult,
  ImageDropTable
} from './types';

export interface DropInvokeChannelMap {
  /** Per-agent image/file drop strategies from the agent registry. */
  'drop:strategies': { req: []; res: ImageDropTable };
  /** Classify dropped absolute paths (dir vs file, image sniff, safe copy). */
  'drop:prepare': { req: [paths: string[]]; res: DropPrepareResult };
  /** Persist pathless bytes to the drop store; resolves the absolute path. */
  'drop:persist': { req: [input: DropPersistInput]; res: DropPersistResult };
}

/**
 * OPTIONAL top-level extras on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.pathForFile === 'function'`).
 */
export interface GmuxDropExtras {
  /**
   * Absolute path of a dropped/pasted File via Electron's webUtils; '' when
   * the File has no filesystem path (browser drag, synthesized File) or the
   * lookup throws. NEVER copy, wrap, or re-`new File()` a dropped File before
   * calling this — that is what breaks path resolution (research 16 §4.2).
   */
  pathForFile?(file: File): string;
  drop?: {
    strategies(): Promise<ImageDropTable>;
    prepare(paths: string[]): Promise<DropPrepareResult>;
    persist(input: DropPersistInput): Promise<DropPersistResult>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the terminal stream (Phase 12 items 1 + 2) — new channels/types
// only, nothing above was modified. Powers the terminal context menu's copy
// surface and CleanShot-style capture (docs/research/17-terminal-capture.md).
//
// Division of labour: the RENDERER owns pixels and markup (it is the only
// side that can measure xterm's real cell box and serialize a buffer); MAIN
// owns the clipboard, the save dialog and tmux. Bytes cross as `Uint8Array`,
// never as a data URL — a 2,000-line capture measured 47 MB of PNG and 79 MB
// as a data-URL string (research 17 §5.6).
//
// Main handlers: registerCaptureIpc() (src/main/capture/ipc.ts).
// INTEGRATOR wiring (preload; guardrail 1 — fold into the ONE typed bridge,
// no new wrapper generation):
//   capture: {
//     viewport: (input) => invoke('capture:viewport', input),
//     image:    (input) => invoke('capture:image', input),
//     saveLast: ()      => invoke('capture:saveLast'),
//     pane:     (input) => invoke('capture:pane', input),
//     writeRich:(input) => invoke('clipboard:writeRich', input),
//     clearHistory: (tmuxName) => invoke('terminal:clearHistory', tmuxName)
//   }
// Renderer feature-detects `window.gmux.capture` and hides the capture items
// when it is absent (older preload / non-Electron test environments).
// ---------------------------------------------------------------------------

/** A CSS-pixel rectangle in window/page coordinates (what capturePage takes). */
export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureViewportInput {
  /** Rect to grab — measured from the live `.xterm-screen` bounding box. */
  rect: CaptureRect;
  /** Basename without extension, proposed by a later Save… */
  suggestedName: string;
}

export interface CaptureImageInput {
  /** Already-rasterized PNG bytes from the renderer. */
  png: Uint8Array;
  suggestedName: string;
}

/** What landed on the clipboard (CSS-pixel size; the PNG itself is @2x). */
export interface CaptureResult {
  width: number;
  height: number;
  bytes: number;
}

export interface CaptureSaveResult {
  /** Absolute path written, or null when the user cancelled the dialog. */
  path: string | null;
}

export interface CapturePaneInput {
  /** tmux-side session name (`Session.tmuxName`); main resolves it to a $-id. */
  tmuxName: string;
  /**
   * Lines of HISTORY to take from above the visible screen. The capture always
   * runs to the bottom of the screen (no `-E`), so "last N lines" is
   * `Math.max(0, N - term.rows)` (research 17 §2.1: `-E -1` would *exclude*
   * the visible screen).
   */
  historyLines: number;
}

export interface CapturePaneResult {
  /** Raw pane text with SGR escapes intact (`capture-pane -e`, never `-J`). */
  ansi: string;
}

export interface ClipboardRichInput {
  /** Plain-text flavor (what a terminal or editor pastes). */
  text: string;
  /**
   * HTML flavor (what Notion/Slack/Word pastes). Empty string = text only —
   * plain Copy goes through this same channel rather than a second one, and
   * an empty flavor must never be written (it would blank the rich paste).
   */
  html: string;
}

/** New invoke channels appended by the terminal capture stream. */
export interface TerminalCaptureInvokeChannelMap {
  /** Grab a rect of the live window; writes a PNG to the clipboard. */
  'capture:viewport': { req: [input: CaptureViewportInput]; res: CaptureResult };
  /** Take renderer-rasterized PNG bytes; writes them to the clipboard. */
  'capture:image': { req: [input: CaptureImageInput]; res: CaptureResult };
  /** Save the most recent capture to disk (Save… action on the toast). */
  'capture:saveLast': { req: []; res: CaptureSaveResult };
  /** `tmux capture-pane -e` for scrollback beyond the visible screen. */
  'capture:pane': { req: [input: CapturePaneInput]; res: CapturePaneResult };
  /** Write text + HTML flavors together (Copy as HTML). */
  'clipboard:writeRich': { req: [input: ClipboardRichInput]; res: void };
  /**
   * Run the browser paste command in the calling window — the same path the
   * Edit menu's `role:'paste'` takes, so xterm's own paste handler applies
   * bracketed paste instead of us re-implementing it.
   */
  'clipboard:paste': { req: []; res: void };
  /** Drop a session's server-side history so Clear means cleared. */
  'terminal:clearHistory': { req: [tmuxName: string]; res: void };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the terminal
 * renderer (`window.gmux.capture !== undefined`).
 */
export interface GmuxCaptureExtras {
  capture?: {
    viewport(input: CaptureViewportInput): Promise<CaptureResult>;
    image(input: CaptureImageInput): Promise<CaptureResult>;
    saveLast(): Promise<CaptureSaveResult>;
    pane(input: CapturePaneInput): Promise<CapturePaneResult>;
    writeRich(input: ClipboardRichInput): Promise<void>;
    paste(): Promise<void>;
    clearHistory(tmuxName: string): Promise<void>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the scrollback stream (Phase 12.3) — new channels/types only,
// nothing above was modified.
//
// `tmux attach` puts the CLIENT in the alternate buffer, so xterm.js has no
// scrollback of its own for ANY gmux pane and its wheel handler degrades to
// emitting cursor keys. The real 50k-line history lives server-side, so the
// scroll surface is tmux copy-mode and the renderer drives it from here.
// Everything is by sessionId; main resolves the tmux target.
//
// Main handlers: registerScrollIpc-equivalent block in src/main/ipc.ts,
// backed by src/main/tmux/scroll.ts over the long-lived control client
// (~1 ms per command; a `tmux` process spawn would be ~20 ms).
// ---------------------------------------------------------------------------

/** Live scroll geometry for one pane; drives both the wheel and the bar. */
export interface TerminalScrollState {
  /** Lines scrolled above the live bottom. 0 = live output. */
  position: number;
  /** Scrollback lines tmux holds above the screen. */
  history: number;
  /** Visible rows. */
  rows: number;
  /** tmux copy-mode is active on this pane. */
  inMode: boolean;
  /**
   * The app INSIDE the pane owns the alternate screen (vim, a picker). Its
   * drawing never enters tmux history, so `history` is reported as 0 and the
   * renderer must leave the wheel to the app.
   */
  innerAlt: boolean;
  /** The app INSIDE the pane asked for mouse reporting. */
  innerMouse: boolean;
}

export interface TerminalScrollPollInput {
  sessionId: string;
  /**
   * History the caller last rendered. New output pushes a scrolled pane
   * forward (`scroll_position` is relative to the LIVE bottom), so main adds
   * the growth back to the offset and the reader keeps their place.
   */
  anchorFrom?: number;
}

export interface TerminalScrollByInput {
  sessionId: string;
  /** Whole lines; positive scrolls back in time, negative toward live. */
  lines: number;
}

export interface TerminalScrollToInput {
  sessionId: string;
  /** Absolute offset above the live bottom; 0 returns to live output. */
  position: number;
}

/** New invoke channels appended by the scrollback stream. */
export interface TerminalScrollInvokeChannelMap {
  /** Read the pane's scroll geometry (optionally re-anchoring it). */
  'terminal:scrollState': {
    req: [input: TerminalScrollPollInput];
    res: TerminalScrollState;
  };
  /** Wheel / keyboard scrolling, in whole lines. */
  'terminal:scrollBy': {
    req: [input: TerminalScrollByInput];
    res: TerminalScrollState;
  };
  /** Scrollbar drag: scrub to an absolute offset. */
  'terminal:scrollTo': {
    req: [input: TerminalScrollToInput];
    res: TerminalScrollState;
  };
  /** Return to live output — what typing does. */
  'terminal:scrollLive': {
    req: [sessionId: string];
    res: TerminalScrollState;
  };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the terminal
 * renderer (`window.gmux.scroll !== undefined`). Without it the pane simply
 * has no gmux scroll surface — nothing else regresses.
 */
export interface GmuxScrollExtras {
  scroll?: {
    state(input: TerminalScrollPollInput): Promise<TerminalScrollState>;
    by(input: TerminalScrollByInput): Promise<TerminalScrollState>;
    to(input: TerminalScrollToInput): Promise<TerminalScrollState>;
    live(sessionId: string): Promise<TerminalScrollState>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the activity stream (Phase 13, research 18) — new channels and
// types only, plus the one existing line the GmuxInvokeChannelMap comment
// invites streams to intersect into.
//
// Activity detection moved ENTIRELY into the main process. The renderer used
// to derive working / needs-input / idle from the `term:data:<id>` byte
// stream, which only exists for the VISIBLE pane, and then pinned that value
// through a sticky override that outranked main — a session could read
// "working" for hours after going quiet. Main now reads agent-native oracles
// and tmux formats for EVERY session, attached or not, and these two channels
// carry the two things the byte stream used to supply on the side:
//
//   activity:changed  (main → renderer)  ⌘J excerpt + last-output timestamp,
//     batched to at most one message per poll tick. Status itself still
//     travels on the existing EVT_STATUS_CHANGED.
//   activity:noteInput (renderer → main) the user typed into a session, so
//     whatever it was blocked on has an answer — clears needs_input without
//     waiting for echo (the Phase 9.2 self-inflicted-input rule).
// ---------------------------------------------------------------------------

/** Main → renderer: per-session activity facts that are not the status. */
export const EVT_ACTIVITY_CHANGED = 'activity:changed' as const;

export interface SessionActivityInfo {
  sessionId: string;
  /** Last non-empty line of the session's screen (⌘J excerpt). */
  excerpt?: string;
  /** Epoch ms of the last output tmux saw in that pane. */
  lastActivityAt?: number;
}

/** New event channel appended by the activity stream. */
export interface ActivityEventPayloadMap {
  'activity:changed': [updates: SessionActivityInfo[]];
}

/** New invoke channel appended by the activity stream. */
export interface ActivityInvokeChannelMap {
  /** The user sent input to this session (clears needs_input immediately). */
  'activity:noteInput': { req: [sessionId: string]; res: void };
}

/**
 * OPTIONAL top-level extras on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.onActivityChanged === 'function'`). Without them the
 * shell simply shows no excerpts and no ages — status is unaffected.
 */
export interface GmuxActivityExtras {
  onActivityChanged?(cb: (updates: SessionActivityInfo[]) => void): Unsubscribe;
  noteTerminalInput?(sessionId: string): Promise<void>;
}

/**
 * Every event channel main can broadcast: the frozen three plus the appends.
 * Event channels added after the freeze (menu actions, quit requests,
 * settings changes) are wired bespoke in the preload, exactly as this one is
 * — EventPayloadMap itself is never edited.
 */
export type AllEventPayloadMap = EventPayloadMap &
  ActivityEventPayloadMap &
  ScrollbackEventPayloadMap &
  CaptureEventPayloadMap &
  SymbolsEventPayloadMap &
  MenuEventPayloadMap &
  QuitEventPayloadMap &
  SettingsEventPayloadMap &
  RecentsEventPayloadMap &
  PowerEventPayloadMap;

export type AllEventChannel = keyof AllEventPayloadMap;

// ---------------------------------------------------------------------------
// APPENDED by the Shift+Enter stream (Phase 12.6 — the registry fold Phase
// 12.5 could not make while Phase 13 owned the registry) — new channels/types
// only. The one existing line touched above is the GmuxInvokeChannelMap
// intersection, exactly as its own comment prescribes.
//
// agents:multilineKeys — the per-agent Shift+Enter table, read straight off
//   the main-process agent registry (`AgentRegistryEntry.multilineKey`, so
//   the table exists ONCE, guardrail 3 — the same shape as drop:strategies).
//   Static per build; the renderer primes it when a terminal mounts and
//   caches it, because the lookup happens inside a keystroke handler.
//
// PRELOAD (guardrail 1 — folded into the single typed bridge, no new wrapper
// generation): `agentMultilineKeys: () => invoke('agents:multilineKeys')`.
// Renderers feature-detect `typeof window.gmux.agentMultilineKeys ===
// 'function'`; without it every agent takes the LF default, which is what
// every measured agent takes anyway.
// ---------------------------------------------------------------------------

import type { MultilineKeyTable } from './types';

/** New invoke channel appended by the Shift+Enter stream. */
export interface MultilineInvokeChannelMap {
  /** Per-agent Shift+Enter sequences from the agent registry. */
  'agents:multilineKeys': { req: []; res: MultilineKeyTable };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.agentMultilineKeys === 'function'`).
 */
export interface GmuxMultilineExtras {
  agentMultilineKeys?(): Promise<MultilineKeyTable>;
}

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

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.9 (file operations in the explorer) — new channels and
// types only. The one existing line touched above is the GmuxInvokeChannelMap
// intersection, exactly as that declaration's own comment prescribes.
//
// The request/response SHAPES live in src/shared/fs-ops.ts (a new file, so
// this contract stays append-only) together with `isProtectedFsPath` — the
// single `.git` rule the tree's canDrag guard and the main-process guard both
// call, so the two can never drift.
//
// Contract summary the builders need:
//   - Every input carries `root`, the absolute project root. Main refuses a
//     root that is not an OPEN PROJECT (PROJECT_NOT_FOUND), and refuses any
//     path that leaves it — '..', an absolute path outside, or an escape
//     through a directory symlink (INVALID_INPUT, message already friendly).
//   - `.git` is refused at any depth, as source and as destination.
//   - fs:trash is the ONLY deletion, and it is `shell.trashItem` — recoverable
//     from Finder. It reports per entry (`trashed` / `failed`) instead of
//     throwing, because a partial trash cannot be rolled back.
//   - fs:move detects every collision BEFORE moving anything and resolves
//     `{ status: 'would-overwrite', conflicts }`; the UI prompts and re-sends
//     with `overwrite: true`, which trashes each displaced entry before the
//     rename. fs:rename never overwrites at all (VS Code's rule).
//   - Real errno failures reject with GmuxErrorPayload code 'FS_FAILED',
//     `message` already written for a toast, and `detail` set to the bare
//     errno token (FsOpErrno) so the UI can branch without parsing prose.
//   - Moves/renames are plain fs.rename: git infers the rename.
//
// MAIN: registered in src/main/fs/ipc.ts (rules in fs/file-ops.ts + fs/paths.ts).
// PRELOAD: five methods appended to the existing `fs` object per the GmuxApi
// pattern — feature-detected by the tree (`typeof window.gmux.fs.trash ===
// 'function'`), so an older preload simply hides the mutation menu items.
// ---------------------------------------------------------------------------

import type {
  FsCreateInput,
  FsMoveInput,
  FsMoveResult,
  FsOpEntry,
  FsRenameInput,
  FsRenameResult,
  FsTrashInput,
  FsTrashResult
} from './fs-ops';

/** New invoke channels appended by the file-operations stream (Phase 12.9). */
export interface FileOpsInvokeChannelMap {
  /** Create an empty file (parents created as needed); EEXIST is refused. */
  'fs:createFile': { req: [input: FsCreateInput]; res: FsOpEntry };
  /** Create a folder; an existing folder is refused rather than reused. */
  'fs:createFolder': { req: [input: FsCreateInput]; res: FsOpEntry };
  /** Rename in place. `name` is a basename; never overwrites. */
  'fs:rename': { req: [input: FsRenameInput]; res: FsRenameResult };
  /** Move entries into a folder; may resolve 'would-overwrite'. */
  'fs:move': { req: [input: FsMoveInput]; res: FsMoveResult };
  /** Send entries to the macOS Trash. Reports per entry. */
  'fs:trash': { req: [input: FsTrashInput]; res: FsTrashResult };
}

/**
 * OPTIONAL extensions to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.trash === 'function'`).
 */
export interface GmuxFsOpsExtras {
  createFile?(input: FsCreateInput): Promise<FsOpEntry>;
  createFolder?(input: FsCreateInput): Promise<FsOpEntry>;
  rename?(input: FsRenameInput): Promise<FsRenameResult>;
  move?(input: FsMoveInput): Promise<FsMoveResult>;
  trash?(input: FsTrashInput): Promise<FsTrashResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.10 item 1 (image preview) and Phase 12.9 item 1 (new
// projects) — new channels and types only. The one existing line touched is
// the GmuxInvokeChannelMap intersection, exactly as that declaration's own
// comment prescribes.
//
// fs:readImage — the image path, deliberately separate from fs:readFile.
//   That channel is UTF-8-only and refuses binary content, which is why an
//   image tab used to read "gmux edits text files only"; nothing about an
//   image ever goes through it again. The full rationale (including why the
//   working copy comes back as a `gmux-asset:` URL while the HEAD side comes
//   back as a data URL) lives in src/shared/image-types.ts, together with the
//   extension allowlist that the viewer, this channel and the asset protocol
//   all share.
//   MAIN: src/main/fs/image-ipc.ts (rules in src/main/fs/image.ts).
//
// projects:create — make a NEW project folder, optionally `git init` it, and
//   add it as a project, as one main-side operation. It cannot be assembled
//   from the Phase 12.9 fs:* channels: those all prove their target is inside
//   an ALREADY-OPEN project root, and a folder that does not exist yet is by
//   definition outside every one of them.
//   MAIN: src/main/projects/index.ts (rules in src/main/projects/create.ts).
//
// PRELOAD: `readImage` joins the existing `fs` object, `create` the existing
// `projects` object — both feature-detected by their callers, so an older
// preload degrades to "no image viewer" / "no New Project…" instead of
// throwing.
// ---------------------------------------------------------------------------

import type { ImageReadInput, ImageReadResult } from './image-types';

/** How a new project folder should be created (projects:create). */
export interface CreateProjectInput {
  /** Absolute path of the EXISTING parent directory. */
  parentDir: string;
  /** Name of the folder to create inside it (one path segment). */
  name: string;
  /** Run `git init` in the new folder. The dialog defaults this on. */
  gitInit: boolean;
}

/** What `projects:create` made. */
export interface CreateProjectResult {
  project: Project;
  /** Absolute path of the created folder. */
  path: string;
  /**
   * Whether the folder ended up a git repository. False when `gitInit` was
   * off, and false (with `gitError` set) when git itself failed — the
   * project is still created and opened, because a folder without a repo is
   * a perfectly good project (DESIGN.md §6.3).
   */
  isRepo: boolean;
  /** Why `git init` did not run, when it was asked for and failed. */
  gitError?: string;
}

/** New invoke channels appended by the image + new-project stream. */
export interface ImageProjectInvokeChannelMap {
  /** One image, by revision, capped — never the text path. */
  'fs:readImage': { req: [input: ImageReadInput]; res: ImageReadResult };
  /** Create a project folder (optionally a repo) and open it as a tab. */
  'projects:create': {
    req: [input: CreateProjectInput];
    res: CreateProjectResult;
  };
}

/**
 * OPTIONAL extension to GmuxApi['fs'], feature-detected by the editor
 * (`typeof window.gmux.fs.readImage === 'function'`).
 */
export interface GmuxImageExtras {
  /** Read one image for the viewer (worktree or HEAD). */
  readImage?(input: ImageReadInput): Promise<ImageReadResult>;
}

/**
 * OPTIONAL extension to GmuxApi['projects'], feature-detected by the shell
 * (`typeof window.gmux.projects.create === 'function'` hides New Project…).
 */
export interface GmuxProjectCreateExtras {
  create?(input: CreateProjectInput): Promise<CreateProjectResult>;
}

/**
 * The native File menu gained "New Project…" (⇧⌘N). Appended as its own id
 * union rather than edited into MenuActionId, so nothing above changes.
 */
export type ProjectMenuActionId = 'new-project';

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
  | CloneMenuActionId;

// ---------------------------------------------------------------------------
// APPENDED by Phase 12.9 items 2-4 (the explorer's file management) — one new
// channel only. The foundations commit shipped create/rename/move/trash; the
// context menu's DUPLICATE verb is the one it has no primitive for, and a
// renderer-side read-then-write would corrupt every binary and could not copy
// a folder at all.
//
// fs:duplicate — recursive `fs.cp` beside the original, under a name main
//   picks by statting the directory (Finder's "notes copy.md", then "notes
//   copy 2.md"). It goes through the same `resolveInsideRoot` guard as every
//   other mutation, so `.git`, '..' and symlink escapes are refused
//   identically, and it never overwrites: the free name is found first.
//   MAIN: src/main/fs/ipc.ts → src/main/fs/file-ops.ts.
// ---------------------------------------------------------------------------

import type { FsDuplicateInput } from './fs-ops';

/** New invoke channel appended by Phase 12.9's context menu. */
export interface FsDuplicateInvokeChannelMap {
  /** Copy an entry beside itself under the first free "copy" name. */
  'fs:duplicate': { req: [input: FsDuplicateInput]; res: FsOpEntry };
}

/**
 * OPTIONAL extension to GmuxApi['fs'], feature-detected by the tree
 * (`typeof window.gmux.fs.duplicate === 'function'` hides the menu item).
 */
export interface GmuxFsDuplicateExtras {
  duplicate?(input: FsDuplicateInput): Promise<FsOpEntry>;
}

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

/** New invoke channel appended by Phase 12.12's sessions-position toggle. */
export interface ViewMenuInvokeChannelMap {
  /** The store moved the session surface; move the View-menu radios to match. */
  'ui:sessionsPosition': { req: [position: SessionsPosition]; res: void };
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
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14 — project-wide CONTENT search (⌘⇧F). Spec:
// docs/research/19-search.md §2.4. New channels and types only; nothing above
// was modified except the one `& SearchInvokeChannelMap` in
// GmuxInvokeChannelMap (interfaces hoist, so the forward reference is sound —
// the same shape GitBranchesInvokeChannelMap already uses).
//
// THE STREAM, and why it is shaped like this:
//
//   ripgrep's time-to-first-result is ~3 ms on every corpus measured (312
//   files to 107k), while TOTAL time varies 400x with the number of MATCHES.
//   So the only honest contract is a streaming one: `search:start` resolves
//   as soon as the child is spawned, and results arrive on a per-search emit
//   channel until a frame says `done`. The renderer never waits for
//   completion, and a big repo is not a frozen window.
//
//   searchResultsChannel(searchId) follows the termDataChannel(sessionId)
//   precedent already in this file.
//
// SUBSCRIBE FIRST. `ContentSearchInput.searchId` exists so the caller can mint
// the id, subscribe to the channel, and only then invoke — closing the window
// between "main starts emitting" and "the renderer is listening". Main mints
// one when it is omitted (and holds the first frame back a tick), but the
// race-free order is the supported one.
//
// ONE LIVE SEARCH PER WINDOW. Starting a search SIGKILLs any other search
// still running for the same window and closes its stream with
// `{done:true, cancelled:true}`. A superseded query therefore cannot paint
// over a newer one's results even if the renderer's debounce misbehaves — the
// guarantee is structural, not a matter of the caller remembering to cancel.
//
// TWO THINGS ARE NEVER SEARCHED, and the UI must say so rather than let the
// user infer a clean zero: files larger than `maxFilesizeBytes` (echoed on the
// final frame so the copy can name the number), and BINARY files — ripgrep
// quits at the first NUL byte. When the NUL comes late enough that matches
// were already reported, the file group carries `binary: true`; when it is in
// the first buffer the file never appears at all, which no engine flag can
// change. Both are policies to state, not counts we can report.
//
// MAIN: src/main/search/{resolve,args,parser,engine,context,ipc}.ts.
// ---------------------------------------------------------------------------

/**
 * The shared defaults. Both ends read these so "20,000" is written once —
 * main clamps to them, the UI states them ("Showing the first 20,000
 * results"), and neither can drift from the other.
 */
export const SEARCH_LIMITS = {
  /** Matches DELIVERED before the search stops and reports `capped`. */
  maxResults: 20_000,
  /** Matches kept per file before the group reports `clipped`. */
  maxPerFile: 1_000,
  /**
   * UTF-16 units of a single result line kept, windowed around the first
   * match. MANDATORY: ripgrep's --json printer ignores --max-columns, and a
   * minified bundle produces 7 MB lines (measured 6,952,086 bytes).
   */
  maxLineChars: 2_000,
  /** Files bigger than this are not searched at all (ripgrep --max-filesize). */
  maxFilesizeBytes: 10 * 1024 * 1024
} as const;

/** One ⌘⇧F query. Everything the engine needs; no hidden state in main. */
export interface ContentSearchInput {
  /** Absolute project root. Searched with cwd = this path. */
  repoPath: string;
  /** The pattern. Empty is refused — it would match every line of every file. */
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
  /** Comma-separated globs, VS Code syntax ("src/**, *.ts"). Empty = all. */
  includes: string;
  /** Comma-separated globs to skip ("**\/dist/**, *.min.js"). Empty = none. */
  excludes: string;
  /** false → --no-ignore: .gitignore/.ignore stop being respected. */
  useIgnoreFiles: boolean;
  /**
   * Context lines either side — DOCUMENTED AS UNUSED, on purpose. The stream
   * never carries context: measured, `-A1 -B1` costs 214 ms → 394 ms and
   * 47 MB → 84 MB for lines nobody sees until a group is expanded. Expanding
   * reads them from disk through `search:context` instead. The field is kept
   * so this decision has somewhere to live, not so it can be set.
   */
  contextLines: number;
  /** Caller-minted stream id — see "SUBSCRIBE FIRST" above. */
  searchId?: string;
  /**
   * Set to stream a REPLACE PREVIEW alongside the results: ripgrep emits the
   * original and the replacement per submatch in the same pass, so the
   * preview costs nothing extra. Capture groups are whatever `rg -r` already
   * supports ($1, ${name}). This previews only — nothing is written.
   */
  replace?: string;
  /** Override SEARCH_LIMITS.maxResults (the "Show more" affordance). */
  maxResults?: number;
  /** Override SEARCH_LIMITS.maxPerFile. */
  maxPerFile?: number;
  /** Override SEARCH_LIMITS.maxLineChars. */
  maxLineChars?: number;
  /** Override SEARCH_LIMITS.maxFilesizeBytes. */
  maxFilesizeBytes?: number;
  /**
   * Force multiline matching. Omitted = auto (on when a regex can match a
   * newline), which is what a user typing `foo\nbar` expects.
   */
  multiline?: boolean;
  /**
   * Delay the spawn by this many ms; a newer search from the same window
   * cancels a still-pending one before any process exists. 0 = spawn now
   * (the renderer owns its own debounce).
   */
  debounceMs?: number;
}

/** One matching line, ready to render — no post-processing in the renderer. */
export interface SearchMatch {
  /** 1-based, matching OpenFileSelection.line and Monaco. */
  line: number;
  /**
   * The line, newline stripped, leading whitespace removed and ALREADY
   * clamped to maxLineChars. Never trust it to be the whole line.
   */
  text: string;
  /**
   * The TOTAL number of ORIGINAL-line UTF-16 units that precede `text[0]` —
   * the stripped indentation PLUS, when `truncated`, the window's own left
   * edge (less the one-character ellipsis head standing in for it).
   *
   * `ranges` index into `text`; `range + trimmed` is the column in the FILE.
   * That is the only sum an editor can navigate by, so nothing may be left
   * out of it: reporting the indentation alone once selected column ~1,875
   * for a match that lives at column 4,880 of a 5,006-character line.
   */
  trimmed: number;
  /**
   * Highlight spans as [start, end) UTF-16 offsets into `text` — ripgrep's
   * BYTE offsets are converted in main, once, before the row crosses IPC.
   */
  ranges: [number, number][];
  /** One per range, present only when `replace` preview was requested. */
  replacements?: string[];
  /** Byte offset of the line start in the file (the replace path needs it). */
  byteOffset: number;
  /** The line was longer than maxLineChars and `text` is a window of it. */
  truncated?: boolean;
}

/**
 * Matches for one file, in one frame.
 *
 * EVERYTHING HERE IS INCREMENTAL and frames may repeat a relPath (a file with
 * many hits spans several). The merge rule is uniform, which is why it is
 * safe: append `matches`, SUM `matchCount`, OR `clipped` and `binary`. A
 * group with an empty `matches` array is a flag-only update (a file that
 * turned out to be binary after its matches were already sent).
 */
export interface SearchFileResult {
  /** Relative to repoPath, forward slashes, no leading "./". */
  relPath: string;
  /** Matches FOUND in this frame — exceeds matches.length when clipped. */
  matchCount: number;
  matches: SearchMatch[];
  /** maxPerFile cut this group: matchCount is real, matches is not all of it. */
  clipped: boolean;
  /**
   * ripgrep stopped early because the file is binary (non-null binary_offset).
   * Anything after that offset was NOT searched — say so, never imply a clean
   * zero-result tail.
   */
  binary?: boolean;
}

/** One streamed frame. `files` is INCREMENTAL; the totals are cumulative. */
export interface SearchProgress {
  searchId: string;
  /** Monotonic per search, from 0. Drop any frame older than the last seen. */
  seq: number;
  /** New matches since the previous frame. Merge by relPath. */
  files: SearchFileResult[];
  /** Matches delivered so far (what maxResults counts). */
  totalMatches: number;
  /** Files with at least one match so far. */
  totalFiles: number;
  /** Last frame for this searchId. Nothing follows it. */
  done: boolean;
  /** maxResults stopped the search — results are the FIRST N, not all of them. */
  capped: boolean;
  /** The search was superseded or cancelled: do not paint, do not "finish". */
  cancelled?: boolean;
  /** Showable failure (bad regex, unreadable root). Only ever on the last frame. */
  error?: string;
  /** Wall time from spawn to the last frame, ms. Set on the final frame. */
  elapsedMs?: number;
  /**
   * DIAGNOSTIC: ms from spawn to the first match ripgrep produced, set on the
   * frame that carries it. This is the number the research promises stays at
   * ~3 ms on every corpus, and the reason it is on the wire is that a claim
   * nobody can measure in the shipped code is not a claim.
   */
  ttfrMs?: number;
  /**
   * The size ceiling that was in force, echoed so the UI can state the policy
   * ("files over 10 MB were not searched"). ripgrep cannot tell us WHICH files
   * it skipped, so the honest surface is the rule, not a count.
   */
  maxFilesizeBytes?: number;
}

/** Lazily fetched context around one match (the expand gesture). */
export interface SearchContextInput {
  repoPath: string;
  relPath: string;
  /** 1-based line the match is on. */
  line: number;
  /** Lines wanted before / after it. */
  before: number;
  after: number;
  /** Clamp each returned line. Defaults to SEARCH_LIMITS.maxLineChars. */
  maxLineChars?: number;
}

export interface SearchContextResult {
  /** 1-based line numbers, in order, excluding the match line itself. */
  lines: { line: number; text: string }[];
}

/** What `search:start` resolves with once the child is spawned (or queued). */
export interface SearchStarted {
  /** The stream id — the caller's when it supplied one. */
  searchId: string;
}

/** New invoke channels appended by Phase 14's content search. */
export interface SearchInvokeChannelMap {
  /** Begin streaming; results arrive on searchResultsChannel(searchId). */
  'search:start': { req: [input: ContentSearchInput]; res: SearchStarted };
  /** SIGKILL the child and close the stream with cancelled:true. */
  'search:cancel': { req: [searchId: string]; res: void };
  /** Context lines around one hit, read on expand (never streamed). */
  'search:context': {
    req: [input: SearchContextInput];
    res: SearchContextResult;
  };
}

/**
 * Per-search result stream (main → the window that started it), following the
 * termDataChannel(sessionId) precedent above. Payload: one SearchProgress.
 */
export const searchResultsChannel = (searchId: string): string =>
  `search:results:${searchId}`;

/**
 * OPTIONAL `search` surface on window.gmux, feature-detected by the Search
 * view (`typeof window.gmux.search?.start === 'function'`) so an older preload
 * degrades to "no Search view" instead of throwing.
 */
export interface GmuxSearchExtras {
  search?: {
    /** Subscribe BEFORE calling start(), with an id you minted. */
    onResults(searchId: string, cb: (p: SearchProgress) => void): Unsubscribe;
    start(input: ContentSearchInput): Promise<SearchStarted>;
    cancel(searchId: string): Promise<void>;
    context(input: SearchContextInput): Promise<SearchContextResult>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14 — SYMBOLS (⌘⇧O, and `@` / `#` in the palette). Spec:
// docs/research/19-search.md §2.1/§5.3 and 19-d3 §2.5-2.8. New channels and
// types only; the payload shapes live in src/shared/symbols.ts.
//
// WHY THIS IS A SECOND SURFACE AND NOT PART OF search:*  — they are different
// machines with different failure modes, and conflating them would hide both:
//
//   Content search is STATELESS and instant: spawn ripgrep, stream, done in
//   ~3 ms to first result on any corpus. There is nothing to warm up.
//
//   Symbols are an INDEX. The first `#` query on a project starts a
//   tree-sitter build that takes 300-800 ms on the repos here and ~23 s on a
//   50k-file monorepo. That build outlives the invoke that started it, so the
//   contract has to carry `indexing / indexed / total / cold` on every reply
//   AND push progress on its own channel — the user is typing throughout, and
//   an empty list during a build is a lie the palette must never tell.
//
// LIFECYCLE, and where the "no daemon that burns battery" constraint is kept:
//   1. NEVER on project open. Building an index nobody asked for is exactly
//      the burn the guardrail forbids — so `symbols:query` alone never starts
//      one, and reports `cold: true` instead.
//   2. `symbols:ensure` is the ONLY starter. The palette calls it when the
//      user actually asks for symbols.
//   3. Persisted per (repoPath, relPath, mtimeMs, size), so relaunching a
//      project re-parses only the files that drifted.
//   4. Incremental from the repo watcher bus, 300 ms debounce — 1.25 ms/file.
//   5. Evicted from memory after 30 idle minutes; the SQLite copy survives.
//
// MAIN: src/main/symbols/{ipc,service,pool,worker,store,persist,queries}.ts.
// ---------------------------------------------------------------------------

import type {
  SymbolEnsureResult,
  SymbolIndexProgress,
  SymbolQueryInput,
  SymbolQueryResult
} from './symbols';

/** Main → renderer: how far this project's symbol index has got. */
export const EVT_SYMBOLS_PROGRESS = 'symbols:progress' as const;

/** New event channel appended by Phase 14's symbol index. */
export interface SymbolsEventPayloadMap {
  'symbols:progress': [progress: SymbolIndexProgress];
}

/** New invoke channels appended by Phase 14's symbol index. */
export interface SymbolsInvokeChannelMap {
  /** Answer from whatever is indexed NOW. Never starts a build (see above). */
  'symbols:query': { req: [input: SymbolQueryInput]; res: SymbolQueryResult };
  /** Build (or resume building) this project's index in the background. */
  'symbols:ensure': { req: [repoPath: string]; res: SymbolEnsureResult };
  /** Drop the in-memory table for a project whose tab just closed. */
  'symbols:release': { req: [repoPath: string]; res: void };
}

/**
 * OPTIONAL `symbols` surface on window.gmux, feature-detected by the palette
 * (`typeof window.gmux.symbols?.query === 'function'`) so an older preload
 * degrades to "no Go to Symbol" instead of throwing.
 */
export interface GmuxSymbolsExtras {
  symbols?: {
    query(input: SymbolQueryInput): Promise<SymbolQueryResult>;
    ensure(repoPath: string): Promise<SymbolEnsureResult>;
    release(repoPath: string): Promise<void>;
    onProgress(cb: (progress: SymbolIndexProgress) => void): Unsubscribe;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14's QUICK OPEN stream (⌘P) — new channels and types
// only. Nothing above was modified except the one `& QuickOpenInvokeChannelMap`
// in GmuxInvokeChannelMap, which is how every stream since Phase 10 has joined
// the single typed bridge.
//
// SHAPE OF THE FEATURE (research 19 §2.1, §3.2 — all measured):
//   main owns ONE resident worker_threads Worker per window. The worker spawns
//   its own `rg --files` and keeps the path list, a `fuzzysort` snapshot and
//   the VS Code fuzzy reranker entirely inside itself, so 50k-270k path
//   strings never cross a thread boundary and a keystroke costs the UI
//   nothing. Renderer → main → worker → back is p50 4-13 ms at 50,000 files,
//   which is why quickopen:query is a plain request/response with a sequence
//   number rather than a stream: there is nothing to stream.
//
// THE RENDERER OWNS THE SCOPE. gmux is multi-project, and main has no opinion
// about which projects are open — so every query carries its own roots and
// its own recents. Closing a project simply stops sending its path; the
// worker evicts an index nobody has queried for a while on its own.
// ---------------------------------------------------------------------------

/** One ranked path from quick open. */
export interface QuickOpenHit {
  /** Which project root it came from (a query may span several). */
  repoPath: string;
  /** Path relative to `repoPath`, POSIX separators, as ripgrep printed it. */
  relPath: string;
  /**
   * Matched character indices as offsets into `relPath` — REQUIRED, because
   * a picker that cannot show WHY a row matched makes the user re-read every
   * row. Ascending, no duplicates. Empty for the recents list (nothing was
   * typed, so nothing matched).
   */
  positions: number[];
  /** Reranker score. Comparable across roots; not meaningful in isolation. */
  score: number;
  /** This path is in the renderer's recently-opened list. */
  recent: boolean;
}

export interface QuickOpenQueryInput {
  /**
   * Every root to search, most important first (the active project first).
   * Roots the worker has not indexed yet are indexed on arrival; the answer
   * comes back immediately either way with `ready: false`.
   */
  roots: string[];
  /** What the user typed, already stripped of any `:line` suffix. */
  query: string;
  /** Latest-wins ordering — the renderer drops any answer older than its own. */
  seq: number;
  /** How many hits to render. 50 is the VS Code number and this build's. */
  limit: number;
  /**
   * `repoPath relPath` keys of recently opened files, most recent first.
   * Used ONLY as a tiebreaker between equally-scored paths and to answer the
   * empty query — never as a score bonus, which would float a bad match over
   * a good one just because it was opened once.
   */
  recents?: string[];
}

export interface QuickOpenResult {
  /** Echo of the request's `seq`. */
  seq: number;
  hits: QuickOpenHit[];
  /** Candidates that matched before the render limit was applied. */
  total: number;
  /** Every queried root has a complete, authoritative path list. */
  ready: boolean;
  /** Paths currently indexed across the queried roots (honest progress). */
  indexed: number;
  /** An enumeration is in flight — `indexed` is still climbing. */
  refreshing: boolean;
  /** A root hit the 200,000-path cap; its list is incomplete by design. */
  capped: boolean;
  /**
   * Quick open cannot run at all — the vendored ripgrep is missing from this
   * build, or the ranking worker refused to start. Present ONLY for failures
   * the user should be told about, never for "still indexing": a palette that
   * says "indexing 0 files" forever is the worst of both answers.
   */
  error?: string;
}

/** New invoke channels appended by the quick-open stream. */
export interface QuickOpenInvokeChannelMap {
  /** Rank paths across one or more roots. Cheap enough to call per keystroke. */
  'quickopen:query': {
    req: [input: QuickOpenQueryInput];
    res: QuickOpenResult;
  };
  /**
   * Index a project now, before anything is typed. Called when a project
   * opens and again when the palette opens: fuzzysort's per-target cost is
   * lazy and lands on the FIRST `go()` (322-384 ms at 272k paths), so without
   * a prewarm the user pays for the whole index on their first keystroke.
   * Resolves as soon as the work is queued — never blocks the palette.
   */
  'quickopen:warm': { req: [repoPath: string]; res: void };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the palette
 * (`typeof window.gmux.quickOpen?.query === 'function'`) — an older preload
 * leaves ⌘P showing "Quick open is unavailable in this build" rather than
 * throwing.
 */
export interface GmuxQuickOpenExtras {
  quickOpen?: {
    query(input: QuickOpenQueryInput): Promise<QuickOpenResult>;
    warm(repoPath: string): Promise<void>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14 — the FIND MENU's action ids.
//
// gmux's native menu is the discoverability surface for every chord (the
// pattern src/main/menu.ts already follows for ⌘⇧E and ⌃⇧G), so ⌘⇧F and ⌘⇧O
// need menu items, and menu items need ids to forward. They are a NEW union
// rather than edits to LayoutMenuActionId, exactly as ProjectMenuActionId was.
//
// The one existing line changed is the AnyMenuActionWithProjects alias below,
// which is what the renderer's dispatcher is typed against — the same kind of
// one-line fold GmuxInvokeChannelMap already documents for its intersections.
// ---------------------------------------------------------------------------

/** Find-menu actions added by Phase 14. */
export type FindMenuActionId = 'quick-open' | 'show-search' | 'go-to-symbol';

// ---------------------------------------------------------------------------
// APPENDED by Phase 18 (chrome layout constraints) — one new id, folded into
// AnyMenuActionWithProjects above by the same one-line edit FindMenuActionId
// documents. The View menu is where ⌘B already lives, so its mnemonic pair
// ⇧⌘B belongs beside it rather than in a mode of its own.
// ---------------------------------------------------------------------------

/** View-menu action added by Phase 18: fill the chrome with the open file. */
export type ChromeMenuActionId = 'toggle-editor-fill';

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
  | OpenRecentActionId;

// ---------------------------------------------------------------------------
// APPENDED by Phase 13.7 (scrollback limits + understated diagnostics) — new
// channels and one new event only; nothing above was edited except the
// GmuxInvokeChannelMap intersection and AllEventPayloadMap, exactly as their
// own comments prescribe.
//
// EVERY READ HERE IS ON DEMAND. There is deliberately no "scrollback:watch"
// subscription and no periodic payload: ZEN-OF-TORTIE forbids a number that
// rises on its own, so the only thing that travels unasked is the notice
// below, which fires on a crossed threshold and speaks once.
// ---------------------------------------------------------------------------

import type { ScrollbackStats, SessionScrollbackFacts } from './scrollback';
import type { DurabilityNotice, GmuxNotice } from './notice';

/** Main → renderers: a scrollback threshold was crossed. Rare by design. */
export const EVT_SCROLLBACK_NOTICE = 'scrollback:notice' as const;

// WIDENED by Phase 19 item 9. The payload is now GmuxNotice, which is the
// three scrollback events plus one kind per degraded durability state
// (src/shared/notice.ts). ScrollbackNotice is a member of that union, so every
// existing emitter and every existing test still type-checks unchanged. The
// channel name is deliberately left alone: it is a live wire string, and the
// only thing renaming it would produce is churn.
export interface ScrollbackEventPayloadMap {
  'scrollback:notice': [notice: GmuxNotice];
}

/** New invoke channels appended by the scrollback-limits stream. */
export interface ScrollbackInvokeChannelMap {
  /**
   * The evidence the Settings card shows: one `list-panes`, one directory
   * stat, one `statfs`. Called when Settings opens and after a depth change,
   * never on a timer.
   */
  'scrollback:stats': { req: []; res: ScrollbackStats };
  /**
   * What ONE session is holding. Read when its context menu is opened, so
   * the number exists in the renderer only while the menu that shows it does.
   * Null when the session is not running.
   */
  'scrollback:session': {
    req: [sessionId: string];
    res: SessionScrollbackFacts | null;
  };
  /** Copy details: a plain-text block for a bug report. */
  'scrollback:report': { req: []; res: string };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by both renderers
 * (`typeof window.gmux.scrollback?.stats === 'function'`). Without it the
 * Settings card renders its controls with no estimate rather than dead rows,
 * and the session menu simply has no information item.
 */
export interface GmuxScrollbackExtras {
  scrollback?: {
    stats(): Promise<ScrollbackStats>;
    session(sessionId: string): Promise<SessionScrollbackFacts | null>;
    report(): Promise<string>;
    /**
     * WIDENED by Phase 19 item 9 — see ScrollbackEventPayloadMap above. The
     * renderer switches on `kind`, and `ScrollbackNotice` is still one of the
     * shapes that arrives.
     */
    onNotice(cb: (notice: GmuxNotice) => void): Unsubscribe;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-14.5 git-graph data stream (docs/research/24-git-graph.md)
// — one new channel and its optional preload extra. The one existing line
// touched above is the GmuxInvokeChannelMap intersection, exactly as that
// declaration's own comment prescribes.
//
// WHY A NEW CHANNEL RATHER THAN A WIDER `git:log`: `git:log` is a frozen
// channel whose response is `GitLogEntry[]` — a bare array with nowhere to put
// the divergence numbers, the ref set the walk used, or the last-fetch age.
// The graph needs all three in the SAME round trip as the commits, because
// they must describe the same instant: ahead/behind read a beat after the log
// is how a UI ends up drawing "0 unpushed" above a row it is also shading as
// unpushed. `git:log` keeps working unchanged (its handler now serves the
// richer entries, which are a structural superset).
//
// Main handler: registerGitDepthIpc (src/main/git/depth-ipc.ts), sharing the
// existing per-repo GitService + watcher registries. No new preload wrapper
// generation (standing guardrail 1).
// ---------------------------------------------------------------------------

import type { GitGraphLogInput, GitGraphLogResult } from './types';

/** New invoke channel appended by the Phase-14.5 git-graph data stream. */
export interface GitGraphInvokeChannelMap {
  /**
   * ONE ref-scoped, topologically ordered history page — commits with typed
   * decorations, the ref set that produced them, the current branch's
   * divergence from its upstream, and how stale that comparison is.
   *
   * Non-repo folders and unborn branches resolve to the empty result
   * (`isRepo:false` / no entries), never a rejection — the same friendly-read
   * discipline as `git:status` and `git:log`.
   */
  'git:graphLog': {
    req: [input: GitGraphLogInput];
    res: GitGraphLogResult;
  };
}

/**
 * OPTIONAL extension to GmuxApi['git'], feature-detected by the renderer
 * (`typeof window.gmux.git.graphLog === 'function'`) — an older preload leaves
 * the history pane on its flat single-column render rather than throwing.
 */
export interface GmuxGitGraphExtras {
  graphLog?(input: GitGraphLogInput): Promise<GitGraphLogResult>;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-15 SpecStory settings+status stream (research
// docs/research/13-specstory-integration.md §3.4) — new channels/types only.
// The one existing line touched above is the GmuxInvokeChannelMap
// intersection, exactly as that declaration's own comment prescribes.
//
// FOUR CHANNELS, ALL PULLS OR ACTIONS, NONE OF THEM A FEED. There is no
// `specstory:changed` event and no timer: Settings reads the status when the
// section mounts, when its window regains focus, and after an action it just
// took. ZEN-OF-TORTIE forbids a dashboard, and an account line that re-renders
// on its own is one.
//
// Main handler: registerSpecStoryStatusIpc, called by registerSettingsIpc
// (src/main/settings/ipc.ts) — the Settings window is the only consumer today.
// ---------------------------------------------------------------------------

import type {
  SpecStoryAuthActionResult,
  SpecStoryLoginStart,
  SpecStoryStatus
} from './specstory-status';

/** New invoke channels appended by the SpecStory settings+status stream. */
export interface SpecStoryStatusInvokeChannelMap {
  /**
   * Binary + account + capturable agents, in one round trip. `refresh: true`
   * drops main's cached binary resolution (the only part that can cost a
   * spawn); the account is always re-read from auth.json, which is one stat
   * and, when the file moved, one small parse.
   */
  'specstory:status': { req: [refresh?: boolean]; res: SpecStoryStatus };
  /**
   * Start the device flow: ONE `specstory login`, which opens the login page
   * itself and then waits on its stdin. `opened: false` means that child could
   * not be started at all, and the URL is shown so the user is never stuck.
   * gmux deliberately does not open the page as well — see
   * src/main/specstory/login.ts for the double-tab that avoids.
   */
  'specstory:beginLogin': { req: []; res: SpecStoryLoginStart };
  /** Abandon a sign-in in progress, killing the waiting CLI. */
  'specstory:cancelLogin': { req: []; res: void };
  /**
   * Finish the device flow: write the 6-character code to the stdin of the
   * `specstory login` already waiting for it (the CLI reads with
   * `bufio.NewReader(os.Stdin)`, so a pipe is as good as a terminal) and
   * return the re-read status. A rejected code leaves that CLI at its next
   * prompt, so the user can simply retype.
   */
  'specstory:submitCode': {
    req: [code: string];
    res: SpecStoryAuthActionResult;
  };
  /** `specstory logout` — server-side revoke, then auth.json is deleted. */
  'specstory:signOut': { req: []; res: SpecStoryAuthActionResult };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by both renderers
 * (`typeof window.gmux.specstory?.status === 'function'`). Without it the
 * Settings section renders one honest line instead of dead controls.
 */
export interface GmuxSpecStoryExtras {
  specstory?: {
    status(refresh?: boolean): Promise<SpecStoryStatus>;
    beginLogin(): Promise<SpecStoryLoginStart>;
    cancelLogin(): Promise<void>;
    submitCode(code: string): Promise<SpecStoryAuthActionResult>;
    signOut(): Promise<SpecStoryAuthActionResult>;
    /**
     * APPENDED by the Phase-15 capture+sync stream. The one thing on this
     * surface that is pushed rather than pulled: a session-end capture flush
     * that did NOT work, or a capture the user asked for at create and did
     * not get. Failures only — a healthy capture says nothing, ever.
     */
    onNotice?(cb: (notice: SessionCaptureNotice) => void): () => void;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-15 capture+sync stream — ONE event, no channels.
// The one existing line touched above is the AllEventPayloadMap intersection,
// exactly as its own comment prescribes.
//
// WHY AN EVENT AT ALL, when the sibling SpecStory block above deliberately has
// none: this one is not a reading and not a status, it is a FAILURE that
// happened while nobody was looking. A session ended, gmux ran the SpecStory
// flush that recovers the tail of the conversation (research 13 §1.2), and it
// did not work. The user opted into capture; being told once, in a sentence,
// is the difference between "saved" and "silently not saved". Success emits
// nothing — there is no counterpart that reports a healthy sync, by design.
// ---------------------------------------------------------------------------

import type { SessionCaptureNotice } from './types';

/** Main → renderers: a session-end SpecStory sync did not succeed. */
export const EVT_CAPTURE_NOTICE = 'capture:notice' as const;

export interface CaptureEventPayloadMap {
  'capture:notice': [notice: SessionCaptureNotice];
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6. Cloning a repository from the home screen.
//
// Shaped like search:* above and for the same reason. A clone runs for 0.6 s
// on a five object repository and 101 s on microsoft/TypeScript, so the only
// honest contract is a streaming one. `projects:clone` resolves as soon as
// the clone has an id, frames arrive on cloneProgressChannel(cloneId), and
// the last frame carries either the created Project or the failure.
//
// SUBSCRIBE FIRST, same rule as search:start.
//
// The channels are named projects:* and not git:* or clone:*. The operation
// ends in a project tab, which is the projects:* family, and git:* is per
// repository and normalises an existing repository path, which a clone by
// definition does not have. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as its own comment prescribes.
// ---------------------------------------------------------------------------

/** What the preflight learned about a pasted string, before anything is created. */
export interface ClonePreflight {
  /** The https URL Tortie will actually clone. Never carries a password. */
  url: string;
  /** Host, for the copy in error messages, e.g. "github.com". */
  host: string;
  owner?: string;
  repo?: string;
  /** Suggested folder name, which is the last path segment without `.git`. */
  suggestedName: string;
  /** From `git ls-remote --symref`, e.g. "main". Absent when the server did not say. */
  defaultBranch?: string;
  /** Set when the input was rewritten to https from an scp or ssh form. */
  rewrittenFromSsh?: boolean;
  /** Set when a user:password was removed from the pasted URL. */
  strippedCredential?: boolean;
}

export interface ClonePreflightInput {
  /** Exactly what the user pasted or typed. */
  raw: string;
}

export interface CloneStartInput {
  /** Mint this in the renderer and subscribe before calling clone. */
  cloneId: string;
  /** The url from ClonePreflight, not the raw paste. */
  url: string;
  /** Absolute path of the EXISTING parent directory, from the native picker. */
  parentDir: string;
  /** Folder name to create inside it, one path segment. */
  name: string;
}

/** The named steps of a clone, in the order git performs them. Any may be skipped. */
export type ClonePhase =
  | 'starting' // spawned, nothing parsed yet
  | 'enumerating' // remote: Enumerating objects: N, done.
  | 'counting' // remote: Counting objects: P% (n/t)
  | 'compressing' // remote: Compressing objects: P% (n/t)
  | 'receiving' // Receiving objects: P% (n/t), X MiB | Y MiB/s
  | 'resolving' // Resolving deltas: P% (n/t)
  | 'checkingOut'; // Updating files: P% (n/t)

/**
 * One progress frame. `percent` is HONEST ONLY WITHIN `phase`. There is no
 * overall percentage and the renderer must not synthesize one (research 35
 * §3.10): git prints a percentage per phase and never an overall one, so a
 * single monotonic bar is a number nothing produced. The bar shows this
 * phase's own number and resets when `phase` changes.
 */
export interface CloneProgress {
  cloneId: string;
  phase: ClonePhase;
  /** 0 to 100 within this phase. Absent for 'starting' and 'enumerating'. */
  percent?: number;
  done?: number;
  total?: number;
  /** Receiving only, e.g. "18.25 MiB". Straight from git, in git's own unit. */
  bytes?: string;
}

/**
 * The last frame on the stream. Exactly one of `project` or `error` is set.
 *
 * DISCRIMINATE WITH `frame.done === true`, never with `'done' in frame`. A
 * progress frame carries a `done` COUNT of objects, so the key is present on
 * both members of the union and only the value tells them apart. This was
 * got wrong once already, in the driver written to verify it.
 */
export interface CloneDone {
  cloneId: string;
  done: true;
  /** True when the user cancelled. Not an error state. */
  cancelled?: boolean;
  /**
   * Cancel only. What main actually did on disk, because the renderer must
   * not assert a cleanup it did not perform (research 35 §3.11). Absent when
   * the temporary directory was removed; set to the path that is still there
   * when the removal failed.
   */
  leftoverPath?: string;
  /** Present on success. Already added to the manifest, ready to open. */
  project?: Project;
  /** Absolute path of the cloned folder, on success. */
  path?: string;
  /** Branch git checked out, for the line under the address. */
  defaultBranch?: string | null;
  /**
   * Present on failure. `kind` picks the copy and `detail` is git's own
   * text, which belongs behind `Show details` rather than in the user's
   * face. `message` may contain a newline: the unauthenticated case adds a
   * second line about `gh`, and the unknown case prints git's own last line
   * under a generic heading rather than inventing a diagnosis. Render each
   * line as its own line.
   */
  error?: {
    kind: CloneFailureKind;
    message: string;
    detail?: string;
  };
}

/**
 * Which failure happened, so the renderer picks copy rather than parsing
 * text. Main classifies by matching stable substrings of git's stderr
 * (research 35 §3.12). Anything unmatched becomes 'unknown', and the message
 * then carries git's own last line rather than a guess.
 */
export type CloneFailureKind =
  | 'badUrl'
  | 'network' // Could not resolve host
  | 'unreachable' // Failed to connect
  | 'notFound' // Repository not found, or private; the host will not say which
  | 'unauthenticated' // could not read Username
  | 'authRejected' // Authentication failed
  | 'destinationExists'
  | 'permission'
  | 'diskFull'
  | 'interrupted' // early EOF, invalid index-pack output, or our stall timeout
  | 'gitMissing'
  | 'unknown';

export interface CloneInvokeChannelMap {
  /**
   * Normalise a pasted string and ask the server about it, which takes about
   * 0.23 s. NEVER call this when the dialog opens: the Repository field is
   * prefilled from the clipboard, and a preflight on open would send a
   * request, with whatever credential the keychain offers for that host, to
   * whatever address happened to be on the clipboard (research 35 §3.5).
   */
  'projects:clonePreflight': {
    req: [input: ClonePreflightInput];
    res: ClonePreflight;
  };
  /** Spawn git. Frames arrive on cloneProgressChannel(cloneId). */
  'projects:clone': { req: [input: CloneStartInput]; res: { cloneId: string } };
  /** SIGTERM the child and close the stream with cancelled:true. */
  'projects:cancelClone': { req: [cloneId: string]; res: void };
}

/** Per clone stream, following searchResultsChannel(searchId). */
export const cloneProgressChannel = (cloneId: string): string =>
  `projects:cloneProgress:${cloneId}`;

/**
 * OPTIONAL surface on window.gmux.projects, feature detected by the home
 * screen (`typeof window.gmux.projects.clone === 'function'`) so an older
 * preload hides the Clone row instead of throwing. Same pattern as the
 * create extras.
 */
export interface GmuxProjectCloneExtras {
  clonePreflight?(input: ClonePreflightInput): Promise<ClonePreflight>;
  clone?(input: CloneStartInput): Promise<{ cloneId: string }>;
  cancelClone?(cloneId: string): Promise<void>;
  /** Subscribe BEFORE calling clone(), with an id you minted. */
  onCloneProgress?(
    cloneId: string,
    cb: (p: CloneProgress | CloneDone) => void
  ): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6. The recent projects list on the home screen.
//
// Three calls and one event. Nothing here is polled and nothing rises on its
// own. The two existing lines touched above are the GmuxInvokeChannelMap
// intersection and the AllEventPayloadMap intersection, exactly as their own
// comments prescribe.
//
// WHERE THE DATA LIVES. A plain JSON file at <userData>/recents.json, owned by
// src/main/recents/store.ts. It is NOT in the manifest. The manifest holds
// session restore state, which is the product's promise, and a recents list is
// disposable convenience data that costs nothing to lose. Research 35 section
// 4.2 carries the whole argument, including the fact that the first reason
// given for rejecting localStorage was wrong. The real reason is that main
// builds the native File > Open Recent menu and main cannot read localStorage.
//
//   recents:list     the rows, newest first, at most 20. One small JSON read,
//                    already in memory after the first one.
//   recents:missing  the paths whose folder has been moved or deleted. The
//                    home screen calls this AFTER its first paint and never
//                    before it, so the screen never waits on the filesystem
//                    (research 35 section 1.9).
//   recents:remove   Remove from Recent, on one row. Resolves with the list
//                    that is left, so the caller needs no second round trip.
//   recents:changed  main wrote the file. Sent so a home screen that is
//                    already open stays honest when a project is opened or
//                    closed, or when the native menu's Clear Menu is used.
//
// PRELOAD (guardrail 1, folded into the one typed bridge, no new wrapper
// generation):
//
//   const recents: NonNullable<GmuxRecentsExtras['recents']> = {
//     list: () => invoke('recents:list'),
//     missing: () => invoke('recents:missing'),
//     remove: (path) => invoke('recents:remove', path),
//     onChanged: (cb) => on(EVT_RECENTS_CHANGED, cb)
//   };
//
// then add `recents,` to the api object and `GmuxRecentsExtras` to its type
// intersection. The renderer feature-detects
// `typeof window.gmux.recents?.list === 'function'` and draws no recents block
// at all without it, which is exactly the screen a first launch shows.
// ---------------------------------------------------------------------------

/** One remembered project. Newest first wherever a list of these appears. */
export interface RecentProject {
  /** Absolute path of the project folder. */
  path: string;
  /** What the project is called. The manifest's name, which a rename edits. */
  name: string;
  /** Epoch milliseconds of the last open or close. */
  lastOpenedAt: number;
}

/** New invoke channels appended by the recent projects stream. */
export interface RecentsInvokeChannelMap {
  /** Every remembered project, newest first, at most 20. */
  'recents:list': { req: []; res: RecentProject[] };
  /**
   * The paths whose folder is gone or is no longer a directory. One stat per
   * row. Called after the first paint, so a slow disk cannot delay the screen.
   */
  'recents:missing': { req: []; res: string[] };
  /** Forget one row. Resolves with the list that is left. */
  'recents:remove': { req: [path: string]; res: RecentProject[] };
}

/** Main to renderers: the recents file changed. Payload is the whole list. */
export const EVT_RECENTS_CHANGED = 'recents:changed' as const;

export interface RecentsEventPayloadMap {
  'recents:changed': [recents: RecentProject[]];
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.recents?.list === 'function'`). Without it the home
 * screen simply has no recents block, which is a state the screen already has
 * and already looks right in.
 */
export interface GmuxRecentsExtras {
  recents?: {
    list(): Promise<RecentProject[]>;
    missing(): Promise<string[]>;
    remove(path: string): Promise<RecentProject[]>;
    onChanged(cb: (recents: RecentProject[]) => void): Unsubscribe;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6 (the home screen) — two new menu action ids and
// nothing else. The one existing line touched above is the
// AnyMenuActionWithProjects alias, exactly the one-line fold ProjectMenuActionId
// and FindMenuActionId already document.
//
// Both are File-menu ids, and both exist because the File menu is built in
// MAIN from ids while the thing they do lives in the RENDERER: the clone
// dialog is a React modal, and opening a project is one store call that
// already handles the manifest row, the tab and the focus.
// ---------------------------------------------------------------------------

/**
 * File > Clone Repository…, the third project verb. No accelerator: every
 * built-in chord is one the user can no longer record as a per-agent hotkey,
 * and that is a bad trade for a weekly action (research 35 §0).
 */
export type CloneMenuActionId = 'clone-repository';

/**
 * File > Open Recent > a row. A TEMPLATE family, handled by prefix before the
 * dispatcher's switch ever sees it, the way `launch-agent:*` and
 * `focus-session:*` already are — a path cannot be a member of a union.
 *
 * The path is absolute and is passed through verbatim. A row whose folder has
 * gone is still listed (statting ten paths on every menu rebuild would put the
 * filesystem in the way of opening a menu), so the open can fail, and it fails
 * with the same "That folder does not exist." every other route to a missing
 * folder produces.
 */
export type OpenRecentActionId = `open-recent:${string}`;

/** The prefix above, so main and the renderer split the id the same way. */
export const OPEN_RECENT_PREFIX = 'open-recent:' as const;

// ---------------------------------------------------------------------------
// APPENDED by Phase 19 items 8 and 9 (durability) — two new channels and their
// preload extras. The existing lines touched above are the
// GmuxInvokeChannelMap intersection, the `scrollback:notice` payload and the
// `onNotice` callback signature, and each is annotated where it sits.
//
// WHY A PULL CHANNEL FOR NOTICES AT ALL: the loudest notice of the five fires
// while the manifest is being opened, which is BEFORE any window exists, so a
// broadcast at that instant reaches nobody. Main queues those and the renderer
// drains the queue once, immediately after it subscribes. Everything posted
// after that point is broadcast normally and is never queued, so a notice can
// never be shown twice.
// ---------------------------------------------------------------------------

/** New invoke channels appended by the durability stream. */
export interface DurabilityInvokeChannelMap {
  /**
   * Degraded-state notices that were posted before any renderer could hear
   * them. Called ONCE per renderer boot, right after `scrollback.onNotice` is
   * subscribed. Draining is destructive: the queue is empty afterwards.
   */
  'notice:pending': { req: []; res: DurabilityNotice[] };
  /**
   * Restart an ended session: create the replacement FIRST, and only then
   * remove the old row. Phase 19 item 8.
   *
   * This is one main-side call rather than the renderer's old
   * discard-then-create pair because the ordering is a durability invariant
   * and the renderer cannot hold it across a reload. It is also the only side
   * that can read the original launch flags, which live in the manifest row's
   * argv and are dropped by any caller that rebuilds the session from the
   * Session projection.
   *
   * Resolves to the replacement. Rejects with the create's own typed error and
   * nothing removed, which is the whole point.
   */
  'sessions:restart': { req: [sessionId: string]; res: RestoreSession };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.notice?.pending === 'function'`). Without it the app
 * simply never hears a notice that was posted before the window existed, which
 * is the behaviour every build before Phase 19 had.
 */
export interface GmuxNoticeExtras {
  notice?: {
    pending(): Promise<DurabilityNotice[]>;
  };
}

/**
 * OPTIONAL extension to GmuxApi['sessions'], feature-detected by the shell
 * (`typeof window.gmux.sessions.restart === 'function'`). Without it the
 * renderer falls back to its own create-then-discard sequence, which keeps the
 * ordering right but cannot carry the launch flags.
 */
export interface GmuxSessionRestartExtras {
  restart?(sessionId: string): Promise<RestoreSession>;
}

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
 * OPTIONAL top-level extra on window.gmux, feature-detected by the terminal
 * (`typeof window.gmux.onPowerResume === 'function'`). Without it the pane
 * keeps its stale atlas until the next resize, which is the behaviour before
 * Phase 19 and not a broken one.
 */
export interface GmuxPowerExtras {
  onPowerResume?(cb: () => void): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 20.5 (the HTML preview) — one new invoke channel and one
// optional preload extra. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as that declaration's own comment
// prescribes.
//
// preview:url — mint the frame URL for one HTML document, and start that
//   document's request budget. It is a GET-shaped call with no side effect the
//   user can see, and it is the ONLY thing the renderer may ask about a
//   preview.
//
//   WHY THE RENDERER DOES NOT BUILD THE URL. Containment is decided by
//   resolving the real path of the request and the real path of the project
//   root and comparing them, and only main can do that. A prefix check over
//   joined paths was measured serving the real /etc/passwd through a symlink
//   named docs/notes.html. If this process could spell its own preview URL
//   there would be two opinions about which bytes belong to a project.
//
//   WHAT DOES NOT EXIST HERE, and its absence is the point. There is no
//   channel that a previewed DOCUMENT can reach. An earlier draft of this
//   phase rewrote external links to a sentinel URL so main could open them in
//   a browser, and a one pixel nested iframe fired that on load, with no
//   script and no click, carrying an address the page author chose. Nothing
//   inside the frame can call anything: the frame is `sandbox=""`, it has no
//   preload, and its own response policy is `default-src 'none'`. Every call
//   on this channel comes from Tortie's own renderer, about a tab the user
//   opened.
//   MAIN: src/main/preview/ipc.ts (rules in src/main/preview/protocol.ts).
//
// PRELOAD: a new top-level `preview` object, feature-detected by the viewer
// (`typeof window.gmux.preview?.url === 'function'`). Without it the HTML tab
// shows "Preview is not available" and the Source pane is unaffected.
// ---------------------------------------------------------------------------

// preview:stats — read back what the handler refused while serving the
//   document this renderer opened. Added in the Phase 20.5 fix round, and it
//   is a correctness fix rather than a feature. The line under the frame is
//   the reader's only explanation for a page that renders wrong, and before
//   this channel the renderer wrote that line from patterns over the source
//   text. Three cases were measured in the app where it read "Nothing in this
//   page was blocked" while the handler had refused 501 requests, 12
//   subresources, or the whole document.
//
//   It is read only. It takes a token and a generation and returns six
//   numbers. It opens nothing, reads no file and acts on no address. As with
//   `preview:url`, nothing inside a previewed DOCUMENT can reach it, because
//   that frame is `sandbox=""` with an opaque origin, has no preload and
//   carries `default-src 'none'`.
//   MAIN: src/main/preview/ipc.ts (rules in src/main/preview/protocol.ts).

import type {
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from './preview-types';

/** The two channels the HTML preview needs. */
export interface PreviewInvokeChannelMap {
  /** Mint a `gmux-preview:` URL for one document, or say why not. */
  'preview:url': { req: [input: PreviewUrlInput]; res: PreviewUrlResult };
  /** What the handler refused for that document. Null once superseded. */
  'preview:stats': {
    req: [input: PreviewStatsInput];
    res: PreviewStats | null;
  };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the HTML
 * viewer. It is top-level rather than folded into `fs` on purpose: `fs` is the
 * text and file-management surface, and nothing about a preview is a file
 * operation.
 */
export interface GmuxPreviewExtras {
  preview?: {
    url(input: PreviewUrlInput): Promise<PreviewUrlResult>;
    stats(input: PreviewStatsInput): Promise<PreviewStats | null>;
  };
}
