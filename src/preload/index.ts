/**
 * gmux preload — the ONLY bridge between renderer and main.
 * Exposes the typed `window.gmux` API (contract: src/shared/ipc.ts).
 * contextIsolation is ON; nothing else reaches the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  EventChannel,
  EventPayloadMap,
  ExtendedInvokeChannel,
  ExtendedInvokeReq,
  ExtendedInvokeRes,
  GmuxApi,
  GmuxFsExtras,
  GmuxGitExtras,
  GmuxTermStreamExtras,
  TermExitPayload,
  Unsubscribe
} from '../shared/ipc';
import {
  EVT_GIT_CHANGED,
  EVT_SESSIONS_CHANGED,
  EVT_STATUS_CHANGED,
  termAckChannel,
  termDataChannel,
  termExitChannel,
  termInputChannel
} from '../shared/ipc';

/**
 * Typed wrapper over ipcRenderer.invoke — spans the frozen channels plus the
 * appended optional extensions (git:init, fs:readDir, fs:reveal, …).
 */
function invoke<C extends ExtendedInvokeChannel>(
  channel: C,
  ...args: ExtendedInvokeReq<C>
): Promise<ExtendedInvokeRes<C>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<ExtendedInvokeRes<C>>;
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
 * (the SCM UI feature-detects it for the §6.3 [Initialize repository] state).
 */
const git: GmuxApi['git'] & GmuxGitExtras = {
  status: (repoPath) => invoke('git:status', repoPath),
  stage: (input) => invoke('git:stage', input),
  unstage: (input) => invoke('git:unstage', input),
  commit: (input) => invoke('git:commit', input),
  discard: (input) => invoke('git:discard', input),
  log: (input) => invoke('git:log', input),
  showHead: (input) => invoke('git:showHead', input),
  onChanged: (cb) => on(EVT_GIT_CHANGED, cb),
  init: (repoPath) => invoke('git:init', repoPath)
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

const api: GmuxApi = {
  sessions: {
    create: (input) => invoke('sessions:create', input),
    list: () => invoke('sessions:list'),
    rename: (input) => invoke('sessions:rename', input),
    kill: (sessionId) => invoke('sessions:kill', sessionId),
    attach: (sessionId) => invoke('sessions:attach', sessionId),
    detach: (sessionId) => invoke('sessions:detach', sessionId),
    resize: (input) => invoke('sessions:resize', input),
    onChanged: (cb) => on(EVT_SESSIONS_CHANGED, cb),
    onStatusChanged: (cb) => on(EVT_STATUS_CHANGED, cb)
  },
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
  }
};

contextBridge.exposeInMainWorld('gmux', api);
