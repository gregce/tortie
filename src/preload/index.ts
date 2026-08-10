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

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  EventChannel,
  EventPayloadMap,
  GmuxAgentExtras,
  GmuxAgentRegistryExtras,
  GmuxApi,
  GmuxFsExtras,
  GmuxGitBranchExtras,
  GmuxGitDepthExtras,
  GmuxGitExtras,
  GmuxInvokeChannel,
  GmuxInvokeReq,
  GmuxInvokeRes,
  GmuxLoginItemExtras,
  GmuxMenuExtras,
  GmuxPopupMenuExtras,
  GmuxQuitExtras,
  GmuxSessionExtras,
  GmuxSessionRestoreExtras,
  GmuxSettingsExtras,
  GmuxTermStreamExtras,
  MenuActionId,
  TermExitPayload,
  Unsubscribe
} from '../shared/ipc';
import {
  EVT_GIT_CHANGED,
  EVT_MENU_ACTION,
  EVT_QUIT_REQUESTED,
  EVT_SESSIONS_CHANGED,
  EVT_SETTINGS_CHANGED,
  EVT_STATUS_CHANGED,
  termAckChannel,
  termDataChannel,
  termExitChannel,
  termInputChannel
} from '../shared/ipc';
import type { GmuxSettings } from '../shared/settings';

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
 * + the branch-management extras (remotes, fetch, tracking checkout, delete),
 * all feature-detected by the renderer.
 */
const git: GmuxApi['git'] &
  GmuxGitExtras &
  GmuxGitDepthExtras &
  GmuxGitBranchExtras = {
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
  deleteBranch: (input) => invoke('git:deleteBranch', input)
};

/**
 * fs surface = frozen GmuxApi['fs'] + the appended optional tree extensions
 * (fs:readDir / fs:reveal), feature-detected by the file tree.
 */
const fs: GmuxApi['fs'] & GmuxFsExtras = {
  readFile: (path) => invoke('fs:readFile', path),
  writeFile: (path, contents) => invoke('fs:writeFile', path, contents),
  readDir: (dirPath) => invoke('fs:readDir', dirPath),
  reveal: (path) => invoke('fs:reveal', path)
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

const api: GmuxApi &
  GmuxLoginItemExtras &
  GmuxMenuExtras &
  GmuxAgentExtras &
  GmuxAgentRegistryExtras &
  GmuxPopupMenuExtras &
  GmuxQuitExtras &
  GmuxSettingsExtras = {
  sessions,
  projects: {
    add: (path) => invoke('projects:add', path),
    list: () => invoke('projects:list'),
    remove: (projectId) => invoke('projects:remove', projectId),
    pickDirectory: () => invoke('projects:pickDirectory')
  },
  git,
  fs,
  term,
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
  // Phase 8.2 optional extra: native context menus (DESIGN.md §3 — the
  // renderer's store prefers this over the DOM fallback).
  popupMenu: (input) => invoke('ui:popupMenu', input),
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
