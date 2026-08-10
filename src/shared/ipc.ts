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

export type InvokeReq<C extends InvokeChannel> = InvokeChannelMap[C]['req'];
export type InvokeRes<C extends InvokeChannel> = InvokeChannelMap[C]['res'];

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

export type EventChannel = keyof EventPayloadMap;

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
// APPENDED by the Phase-4 integrator — new types only, nothing above was
// modified. The optional channel maps appended by the Phase-3 streams
// (Shell/Scm/Tree) become registrable through one combined map, so main-side
// modules can write typed ipcMain.handle wrappers for the extension channels
// exactly like the frozen ones.
// ---------------------------------------------------------------------------

/** Frozen channels + every appended optional extension channel. */
export type ExtendedInvokeChannelMap = InvokeChannelMap &
  ShellInvokeChannelMap &
  ScmInvokeChannelMap &
  TreeInvokeChannelMap;

export type ExtendedInvokeChannel = keyof ExtendedInvokeChannelMap;

export type ExtendedInvokeReq<C extends ExtendedInvokeChannel> =
  ExtendedInvokeChannelMap[C]['req'];
export type ExtendedInvokeRes<C extends ExtendedInvokeChannel> =
  ExtendedInvokeChannelMap[C]['res'];

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

/** OPTIONAL top-level extra on window.gmux, feature-detected by the shell. */
export interface GmuxMenuExtras {
  /** Subscribe to native app-menu actions. */
  onMenuAction?(cb: (action: MenuActionId) => void): Unsubscribe;
}

/** Every channel this build's preload can invoke (frozen + all appends). */
export type AllInvokeChannelMap = ExtendedInvokeChannelMap &
  RestoreInvokeChannelMap;

export type AllInvokeChannel = keyof AllInvokeChannelMap;

export type AllInvokeReq<C extends AllInvokeChannel> =
  AllInvokeChannelMap[C]['req'];
export type AllInvokeRes<C extends AllInvokeChannel> =
  AllInvokeChannelMap[C]['res'];

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

/** AllInvokeChannelMap + the Phase-8 appends (superset alias, same pattern). */
export type FullInvokeChannelMap = AllInvokeChannelMap &
  HardeningInvokeChannelMap;

export type FullInvokeChannel = keyof FullInvokeChannelMap;

export type FullInvokeReq<C extends FullInvokeChannel> =
  FullInvokeChannelMap[C]['req'];
export type FullInvokeRes<C extends FullInvokeChannel> =
  FullInvokeChannelMap[C]['res'];

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

/** FullInvokeChannelMap + the Phase-8.2 appends (superset alias). */
export type CompleteInvokeChannelMap = FullInvokeChannelMap &
  QuitInvokeChannelMap;

export type CompleteInvokeChannel = keyof CompleteInvokeChannelMap;

export type CompleteInvokeReq<C extends CompleteInvokeChannel> =
  CompleteInvokeChannelMap[C]['req'];
export type CompleteInvokeRes<C extends CompleteInvokeChannel> =
  CompleteInvokeChannelMap[C]['res'];

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

/** CompleteInvokeChannelMap + the git-depth appends (superset alias). */
export type DepthInvokeChannelMap = CompleteInvokeChannelMap &
  GitDepthInvokeChannelMap;

export type DepthInvokeChannel = keyof DepthInvokeChannelMap;

export type DepthInvokeReq<C extends DepthInvokeChannel> =
  DepthInvokeChannelMap[C]['req'];
export type DepthInvokeRes<C extends DepthInvokeChannel> =
  DepthInvokeChannelMap[C]['res'];

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
