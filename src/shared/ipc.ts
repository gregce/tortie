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

/** DepthInvokeChannelMap + the Phase-10 agent appends (superset alias). */
export type RegistryInvokeChannelMap = DepthInvokeChannelMap &
  AgentsInvokeChannelMap;

export type RegistryInvokeChannel = keyof RegistryInvokeChannelMap;

export type RegistryInvokeReq<C extends RegistryInvokeChannel> =
  RegistryInvokeChannelMap[C]['req'];
export type RegistryInvokeRes<C extends RegistryInvokeChannel> =
  RegistryInvokeChannelMap[C]['res'];

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

/** Every action the native menu can forward after the settings stream. */
export type MenuActionWithHotkeys = AnyMenuActionId | AgentLaunchActionId;

/**
 * THE preload bridge map (standing guardrail 1): every channel this build's
 * preload can invoke. Future streams intersect their appended map here (or
 * alias a new superset) — the single typed wrapper in src/preload/index.ts
 * spans whatever this resolves to. (GitBranchesInvokeChannelMap is declared
 * by the parallel branch-management stream further down this file — type
 * declarations hoist, so the forward reference is sound.)
 */
export type GmuxInvokeChannelMap = RegistryInvokeChannelMap &
  SettingsInvokeChannelMap &
  GitBranchesInvokeChannelMap &
  GitSyncInvokeChannelMap &
  DropInvokeChannelMap &
  TerminalCaptureInvokeChannelMap &
  TerminalScrollInvokeChannelMap &
  ActivityInvokeChannelMap &
  MultilineInvokeChannelMap;

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

/** RegistryInvokeChannelMap + the branch-management appends (superset alias). */
export type BranchesInvokeChannelMap = RegistryInvokeChannelMap &
  GitBranchesInvokeChannelMap;

export type BranchesInvokeChannel = keyof BranchesInvokeChannelMap;

export type BranchesInvokeReq<C extends BranchesInvokeChannel> =
  BranchesInvokeChannelMap[C]['req'];
export type BranchesInvokeRes<C extends BranchesInvokeChannel> =
  BranchesInvokeChannelMap[C]['res'];

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
export type AllEventPayloadMap = EventPayloadMap & ActivityEventPayloadMap;

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
