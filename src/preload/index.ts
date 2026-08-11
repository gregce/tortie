/**
 * gmux preload — the ONLY bridge between renderer and main.
 * Exposes the typed `window.gmux` API (contract: src/shared/ipc.ts).
 * contextIsolation is ON; nothing else reaches the renderer.
 *
 * STANDING GUARDRAIL 1 (BACKLOG): one typed invoke bridge. The historical
 * base/full/complete/depth wrapper generations were collapsed by the Phase-10
 * settings+hotkeys stream into the single `invoke` below, typed over
 * GmuxInvokeChannelMap — the one superset map in src/shared/ipc.ts. Future
 * streams append channels to that map (or alias a new superset) and add
 * methods here; they never add another wrapper generation.
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  EventChannel,
  EventPayloadMap,
  GmuxActivityExtras,
  GmuxAgentExtras,
  GmuxAgentRegistryExtras,
  GmuxApi,
  GmuxCaptureExtras,
  GmuxDropExtras,
  GmuxFsExtras,
  GmuxFsDuplicateExtras,
  GmuxFsOpsExtras,
  GmuxGitBranchExtras,
  GmuxGitDepthExtras,
  GmuxGitExtras,
  GmuxGitGraphExtras,
  GmuxGitSyncExtras,
  GmuxImageExtras,
  GmuxInvokeChannel,
  GmuxInvokeReq,
  GmuxInvokeRes,
  GmuxLoginItemExtras,
  GmuxMenuExtras,
  GmuxMultilineExtras,
  GmuxPopupMenuExtras,
  GmuxProjectCreateExtras,
  GmuxQuickOpenExtras,
  GmuxQuitExtras,
  GmuxScrollbackExtras,
  GmuxScrollExtras,
  GmuxSearchExtras,
  GmuxSymbolsExtras,
  GmuxSessionExtras,
  GmuxSessionRestoreExtras,
  GmuxSettingsExtras,
  GmuxSpecStoryExtras,
  GmuxTermStreamExtras,
  GmuxViewMenuExtras,
  MenuActionId,
  SearchProgress,
  SessionActivityInfo,
  TermExitPayload,
  Unsubscribe
} from '../shared/ipc';
import {
  searchResultsChannel,
  EVT_SYMBOLS_PROGRESS,
  EVT_ACTIVITY_CHANGED,
  EVT_CAPTURE_NOTICE,
  EVT_GIT_CHANGED,
  EVT_MENU_ACTION,
  EVT_QUIT_REQUESTED,
  EVT_SCROLLBACK_NOTICE,
  EVT_SESSIONS_CHANGED,
  EVT_SETTINGS_CHANGED,
  EVT_STATUS_CHANGED,
  termAckChannel,
  termDataChannel,
  termExitChannel,
  termInputChannel
} from '../shared/ipc';
import type { SymbolIndexProgress } from '../shared/symbols';
import type { GmuxSettings } from '../shared/settings';
import type { ScrollbackNotice } from '../shared/scrollback';
import type { SessionCaptureNotice } from '../shared/types';

/**
 * THE typed wrapper over ipcRenderer.invoke — spans every channel in
 * GmuxInvokeChannelMap (frozen + all appended extensions).
 */
function invoke<C extends GmuxInvokeChannel>(
  channel: C,
  ...args: GmuxInvokeReq<C>
): Promise<GmuxInvokeRes<C>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<GmuxInvokeRes<C>>;
}

/** Typed wrapper over ipcRenderer.on with unsubscribe. */
function on<C extends EventChannel>(
  channel: C,
  cb: (...payload: EventPayloadMap[C]) => void
): Unsubscribe {
  const listener = (_e: IpcRendererEvent, ...payload: unknown[]): void => {
    cb(...(payload as EventPayloadMap[C]));
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

/**
 * term surface = frozen GmuxApi['term'] + the appended optional stream
 * extras (flow-control acks, unexpected-exit notices) that the terminal
 * renderer feature-detects.
 */
const term: GmuxApi['term'] & GmuxTermStreamExtras = {
  onData: (sessionId, cb) => {
    const channel = termDataChannel(sessionId);
    const listener = (_e: IpcRendererEvent, data: Uint8Array): void => {
      cb(data);
    };
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  sendInput: (sessionId, data) => {
    ipcRenderer.send(termInputChannel(sessionId), data);
  },
  ack: (sessionId, bytes) => {
    ipcRenderer.send(termAckChannel(sessionId), bytes);
  },
  onExit: (sessionId, cb) => {
    const channel = termExitChannel(sessionId);
    const listener = (_e: IpcRendererEvent, payload: TermExitPayload): void => {
      cb(payload);
    };
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
};

/**
 * git surface = frozen GmuxApi['git'] + the appended optional git:init
 * (the SCM UI feature-detects it for the §6.3 [Initialize repository] state)
 * + the git-depth extras (branch switching, commit context menu, hover card)
 * + the branch-management extras (remotes, fetch, tracking checkout, delete)
 * + the Phase-12 sync extras (historical commit diffs, remotes list, push /
 * pull / sync) + the Phase-14.5 history graph read (git:graphLog — one
 * ref-scoped, topologically ordered page with its divergence and last-fetch
 * age attached), all feature-detected by the renderer.
 */
const git: GmuxApi['git'] &
  GmuxGitExtras &
  GmuxGitDepthExtras &
  GmuxGitBranchExtras &
  GmuxGitSyncExtras &
  GmuxGitGraphExtras = {
  status: (repoPath) => invoke('git:status', repoPath),
  stage: (input) => invoke('git:stage', input),
  unstage: (input) => invoke('git:unstage', input),
  commit: (input) => invoke('git:commit', input),
  discard: (input) => invoke('git:discard', input),
  log: (input) => invoke('git:log', input),
  showHead: (input) => invoke('git:showHead', input),
  onChanged: (cb) => on(EVT_GIT_CHANGED, cb),
  init: (repoPath) => invoke('git:init', repoPath),
  branches: (repoPath) => invoke('git:branches', repoPath),
  checkout: (input) => invoke('git:checkout', input),
  createBranch: (input) => invoke('git:createBranch', input),
  createTag: (input) => invoke('git:createTag', input),
  cherryPick: (input) => invoke('git:cherryPick', input),
  commitDetail: (input) => invoke('git:commitDetail', input),
  remoteUrl: (repoPath) => invoke('git:remoteUrl', repoPath),
  checkoutDetached: (input) => invoke('git:checkoutDetached', input),
  remoteBranches: (repoPath) => invoke('git:remoteBranches', repoPath),
  fetch: (repoPath) => invoke('git:fetch', repoPath),
  checkoutTracking: (input) => invoke('git:checkoutTracking', input),
  deleteBranch: (input) => invoke('git:deleteBranch', input),
  commitFileDiff: (input) => invoke('git:commitFileDiff', input),
  remotes: (repoPath) => invoke('git:remotes', repoPath),
  push: (input) => invoke('git:push', input),
  pull: (input) => invoke('git:pull', input),
  sync: (input) => invoke('git:sync', input),
  graphLog: (input) => invoke('git:graphLog', input)
};

/**
 * fs surface = frozen GmuxApi['fs'] + the appended optional tree extensions
 * (fs:readDir / fs:reveal), feature-detected by the file tree, plus the
 * Phase 12.9 file operations (create/rename/move/trash), feature-detected the
 * same way (`typeof window.gmux.fs.trash === 'function'`), plus the Phase
 * 12.10 image read — a separate channel from readFile precisely because that
 * one is UTF-8-only and refuses binary content.
 */
const fs: GmuxApi['fs'] &
  GmuxFsExtras &
  GmuxFsOpsExtras &
  GmuxFsDuplicateExtras &
  GmuxImageExtras = {
  readFile: (path) => invoke('fs:readFile', path),
  writeFile: (path, contents) => invoke('fs:writeFile', path, contents),
  readDir: (dirPath) => invoke('fs:readDir', dirPath),
  reveal: (path) => invoke('fs:reveal', path),
  createFile: (input) => invoke('fs:createFile', input),
  createFolder: (input) => invoke('fs:createFolder', input),
  rename: (input) => invoke('fs:rename', input),
  duplicate: (input) => invoke('fs:duplicate', input),
  move: (input) => invoke('fs:move', input),
  trash: (input) => invoke('fs:trash', input),
  readImage: (input) => invoke('fs:readImage', input)
};

/**
 * sessions surface = frozen GmuxApi['sessions'] + the appended optional
 * extensions: discard (shell stream, §6.6 Remove) and restore (Phase 6,
 * §2.4 Step 3 armed restore). Both feature-detected by the renderer.
 */
const sessions: GmuxApi['sessions'] &
  GmuxSessionExtras &
  GmuxSessionRestoreExtras = {
  create: (input) => invoke('sessions:create', input),
  list: () => invoke('sessions:list'),
  rename: (input) => invoke('sessions:rename', input),
  kill: (sessionId) => invoke('sessions:kill', sessionId),
  attach: (sessionId) => invoke('sessions:attach', sessionId),
  detach: (sessionId) => invoke('sessions:detach', sessionId),
  resize: (input) => invoke('sessions:resize', input),
  onChanged: (cb) => on(EVT_SESSIONS_CHANGED, cb),
  onStatusChanged: (cb) => on(EVT_STATUS_CHANGED, cb),
  discard: (sessionId) => invoke('sessions:discard', sessionId),
  restore: (sessionId) => invoke('sessions:restore', sessionId)
};

/**
 * drop surface (Phase 12 item 8) — file/image drop + ⌘V.
 *
 * `pathForFile` MUST live here: `webUtils` is a renderer-side module and does
 * not exist in main. It returns '' (never throws) for a File with no
 * filesystem path — a browser drag or a synthesized File — which is exactly
 * the discriminator the renderer's acquisition ladder branches on.
 * Never copy/wrap/re-`new File()` a dropped File before calling this.
 */
const drop: NonNullable<GmuxDropExtras['drop']> = {
  strategies: () => invoke('drop:strategies'),
  prepare: (paths) => invoke('drop:prepare', paths),
  persist: (input) => invoke('drop:persist', input)
};

/**
 * capture surface (Phase 12 items 1 + 2) — terminal screenshots, the rich
 * clipboard behind Copy as HTML, and the server-side half of Clear. Pixels
 * cross as `Uint8Array`; a data URL of a long capture measured 79 MB.
 */
const capture: NonNullable<GmuxCaptureExtras['capture']> = {
  viewport: (input) => invoke('capture:viewport', input),
  image: (input) => invoke('capture:image', input),
  saveLast: () => invoke('capture:saveLast'),
  pane: (input) => invoke('capture:pane', input),
  writeRich: (input) => invoke('clipboard:writeRich', input),
  paste: () => invoke('clipboard:paste'),
  clearHistory: (tmuxName) => invoke('terminal:clearHistory', tmuxName)
};

/**
 * scroll surface (Phase 12.3) — tmux copy-mode over the session's real
 * history. `tmux attach` parks xterm.js in its alternate buffer, where it has
 * no scrollback of its own, so this is the ONLY scroll surface a pane has.
 */
const scroll: NonNullable<GmuxScrollExtras['scroll']> = {
  state: (input) => invoke('terminal:scrollState', input),
  by: (input) => invoke('terminal:scrollBy', input),
  to: (input) => invoke('terminal:scrollTo', input),
  live: (sessionId) => invoke('terminal:scrollLive', sessionId)
};

/**
 * scrollback surface (Phase 13.7). Three PULLS and one rare event — there is
 * no poll and no subscription to a figure, because ZEN-OF-TORTIE forbids a
 * number that rises on its own. `onNotice` carries only crossed thresholds.
 */
const scrollback: NonNullable<GmuxScrollbackExtras['scrollback']> = {
  stats: () => invoke('scrollback:stats'),
  session: (sessionId) => invoke('scrollback:session', sessionId),
  report: () => invoke('scrollback:report'),
  onNotice: (cb) => {
    const listener = (_e: IpcRendererEvent, notice: ScrollbackNotice): void => {
      cb(notice);
    };
    ipcRenderer.on(EVT_SCROLLBACK_NOTICE, listener);
    return () => ipcRenderer.removeListener(EVT_SCROLLBACK_NOTICE, listener);
  }
};

/**
 * search surface (Phase 14) — streaming ⌘⇧F.
 *
 * `onResults` takes the searchId the CALLER minted and is meant to be called
 * BEFORE `start()`, which is why the id is an input rather than something you
 * learn from the response: ripgrep produces its first result in ~3 ms, and a
 * subscription set up after the invoke resolves can miss the first frame.
 * Passing the same id in `start({ searchId })` closes the window entirely.
 */
const search: NonNullable<GmuxSearchExtras['search']> = {
  onResults: (searchId, cb) => {
    const channel = searchResultsChannel(searchId);
    const listener = (_e: IpcRendererEvent, progress: SearchProgress): void => {
      cb(progress);
    };
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  start: (input) => invoke('search:start', input),
  cancel: (searchId) => invoke('search:cancel', searchId),
  context: (input) => invoke('search:context', input)
};

/**
 * symbols surface (Phase 14) — ⌘⇧O and the palette's `@` / `#` modes.
 *
 * `query` deliberately does NOT build an index; `ensure` is the only thing
 * that does, and the palette calls it when the user actually asks for
 * symbols. That split is what keeps "never build an index nobody asked for"
 * a property of the contract rather than a habit of the caller.
 *
 * `onProgress` exists because a build outlives the invoke that started it: on
 * a large repo the user is typing for seconds while it runs, and the palette
 * has to be able to say how far it has got.
 */
const symbols: NonNullable<GmuxSymbolsExtras['symbols']> = {
  query: (input) => invoke('symbols:query', input),
  ensure: (repoPath) => invoke('symbols:ensure', repoPath),
  release: (repoPath) => invoke('symbols:release', repoPath),
  onProgress: (cb) => {
    const listener = (
      _e: IpcRendererEvent,
      progress: SymbolIndexProgress
    ): void => {
      cb(progress);
    };
    ipcRenderer.on(EVT_SYMBOLS_PROGRESS, listener);
    return () => ipcRenderer.removeListener(EVT_SYMBOLS_PROGRESS, listener);
  }
};

/**
 * quickOpen surface (Phase 14) — ⌘P.
 *
 * Two calls and no event channel: the ranking round trip is p50 2 ms at
 * 60,000 files, so there is nothing to stream. `warm` is fire-and-forget
 * indexing — the palette calls it at first idle and again each time it opens,
 * because fuzzysort's per-path cost is lazy and would otherwise land on the
 * user's first keystroke.
 */
const quickOpen: NonNullable<GmuxQuickOpenExtras['quickOpen']> = {
  query: (input) => invoke('quickopen:query', input),
  warm: (repoPath) => invoke('quickopen:warm', repoPath)
};

/**
 * specstory surface (Phase 15) — the Settings section's status pull and the
 * two auth actions. Four calls, no event channel: signing in or out is a thing
 * the user does about twice a year, so there is nothing here to subscribe to.
 */
const specstory: NonNullable<GmuxSpecStoryExtras['specstory']> = {
  status: (refresh) => invoke('specstory:status', refresh),
  beginLogin: () => invoke('specstory:beginLogin'),
  cancelLogin: () => invoke('specstory:cancelLogin'),
  submitCode: (code) => invoke('specstory:submitCode', code),
  signOut: () => invoke('specstory:signOut'),
  // The capture stream's one push: a session-end sync that failed, or a
  // capture that was requested at create and declined. Nothing is emitted
  // when capture is working.
  onNotice: (cb) => {
    const listener = (_e: IpcRendererEvent, notice: SessionCaptureNotice): void => {
      cb(notice);
    };
    ipcRenderer.on(EVT_CAPTURE_NOTICE, listener);
    return () => ipcRenderer.removeListener(EVT_CAPTURE_NOTICE, listener);
  }
};

/**
 * projects surface = frozen GmuxApi['projects'] + the Phase 12.9 `create`
 * (feature-detected: without it the shell hides "New Project…" rather than
 * offering a button that throws).
 */
const projects: GmuxApi['projects'] & GmuxProjectCreateExtras = {
  add: (path) => invoke('projects:add', path),
  list: () => invoke('projects:list'),
  remove: (projectId) => invoke('projects:remove', projectId),
  pickDirectory: () => invoke('projects:pickDirectory'),
  create: (input) => invoke('projects:create', input)
};

const api: GmuxApi &
  GmuxLoginItemExtras &
  GmuxMenuExtras &
  GmuxAgentExtras &
  GmuxAgentRegistryExtras &
  GmuxPopupMenuExtras &
  GmuxQuitExtras &
  GmuxSettingsExtras &
  GmuxDropExtras &
  GmuxCaptureExtras &
  GmuxScrollExtras &
  GmuxActivityExtras &
  GmuxMultilineExtras &
  GmuxSearchExtras &
  GmuxSymbolsExtras &
  GmuxQuickOpenExtras &
  GmuxScrollbackExtras &
  GmuxSpecStoryExtras &
  GmuxViewMenuExtras = {
  sessions,
  projects,
  specstory,
  git,
  fs,
  term,
  drop,
  capture,
  scroll,
  search,
  symbols,
  quickOpen,
  scrollback,
  pathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  meta: {
    platform: process.platform,
    versions: {
      electron: process.versions.electron ?? 'unknown',
      chrome: process.versions.chrome ?? 'unknown',
      node: process.versions.node ?? 'unknown'
    }
  },
  // Phase 8 optional extra (top-level, feature-detected): agent CLI probe.
  agentAvailability: () => invoke('agents:availability'),
  // Phase 10 optional extras: full-registry detection scan (Settings Agents
  // section; cached in main, re-scan drops the cache).
  agentsList: () => invoke('agents:list'),
  agentsRescan: () => invoke('agents:rescan'),
  // Phase 12.5 optional extra: the per-agent Shift+Enter table off the
  // registry. The terminal primes it at mount because the lookup happens
  // inside a keystroke handler and cannot await.
  agentMultilineKeys: () => invoke('agents:multilineKeys'),
  // Phase 8.2 optional extra: native context menus (DESIGN.md §3 — the
  // renderer's store prefers this over the DOM fallback).
  popupMenu: (input) => invoke('ui:popupMenu', input),
  // Phase 12.12 optional extra: the store tells main where the session
  // surface just moved, so the View-menu radios cannot go stale when the
  // header's inline toggle (not the menu) is what moved it.
  setSessionsPosition: (position) => invoke('ui:sessionsPosition', position),
  // Phase 8.2 optional extras: first-quit toast flow (DESIGN.md §4 ⌘Q).
  onQuitRequested: (cb) => {
    const listener = (_e: IpcRendererEvent): void => {
      cb();
    };
    ipcRenderer.on(EVT_QUIT_REQUESTED, listener);
    return () => ipcRenderer.removeListener(EVT_QUIT_REQUESTED, listener);
  },
  quit: () => invoke('app:quit'),
  // Phase 6 optional extras (top-level, feature-detected): login item.
  getLoginItem: () => invoke('app:getLoginItem'),
  setLoginItem: (openAtLogin) => invoke('app:setLoginItem', openAtLogin),
  // Native app-menu actions (top-level, feature-detected by the shell).
  onMenuAction: (cb) => {
    const listener = (_e: IpcRendererEvent, action: MenuActionId): void => {
      cb(action);
    };
    ipcRenderer.on(EVT_MENU_ACTION, listener);
    return () => ipcRenderer.removeListener(EVT_MENU_ACTION, listener);
  },
  // Phase 10 (S13) optional extras: persisted settings + Settings window +
  // per-agent launch-flag catalogs, feature-detected by both renderers.
  // Phase 13 optional extras: per-session activity facts that are not the
  // status (⌘J excerpt, last-output time) now that detection lives in main,
  // plus the self-inflicted-input notice that clears needs_input.
  onActivityChanged: (cb) => {
    const listener = (
      _e: IpcRendererEvent,
      updates: SessionActivityInfo[]
    ): void => {
      cb(updates);
    };
    ipcRenderer.on(EVT_ACTIVITY_CHANGED, listener);
    return () => ipcRenderer.removeListener(EVT_ACTIVITY_CHANGED, listener);
  },
  noteTerminalInput: (sessionId) => invoke('activity:noteInput', sessionId),
  settingsGet: () => invoke('settings:get'),
  settingsSet: (patch) => invoke('settings:set', patch),
  openSettings: () => invoke('settings:openWindow'),
  agentFlagPresets: () => invoke('agents:flagPresets'),
  onSettingsChanged: (cb) => {
    const listener = (_e: IpcRendererEvent, settings: GmuxSettings): void => {
      cb(settings);
    };
    ipcRenderer.on(EVT_SETTINGS_CHANGED, listener);
    return () => ipcRenderer.removeListener(EVT_SETTINGS_CHANGED, listener);
  }
};

contextBridge.exposeInMainWorld('gmux', api);
