/**
 * gmux preload — the ONLY bridge between renderer and main.
 * Exposes the typed `window.gmux` API (contract: src/shared/ipc).
 * contextIsolation is ON; nothing else reaches the renderer.
 *
 * STANDING GUARDRAIL 1 (BACKLOG): one typed invoke bridge. The historical
 * base/full/complete/depth wrapper generations were collapsed by the Phase-10
 * settings+hotkeys stream into the single `invoke` in ./bridge, typed over
 * GmuxInvokeChannelMap — the one superset map in src/shared/ipc. Phase 42
 * stage 2 then split the implementation by domain: ./bridge owns the raw IPC
 * primitives, the domain files beside it own their surfaces, and this file is
 * the ONE assembly and the ONE `contextBridge.exposeInMainWorld` call.
 *
 * The `api` const is annotated `InstalledGmuxApi`, the same type
 * src/renderer/env.d.ts declares for `Window.gmux` — the declared surface and
 * the installed one can no longer drift.
 */

import { contextBridge } from 'electron';
import type { InstalledGmuxApi } from '../shared/ipc';
import {
  EVT_ACTIVITY_CHANGED,
  EVT_CAPTURE_NOTICE,
  EVT_MENU_ACTION,
  EVT_POWER_RESUME,
  EVT_QUIT_REQUESTED,
  EVT_SETTINGS_CHANGED,
  EVT_UPDATES_CHANGED
} from '../shared/ipc';
import { actions } from './actions';
import { arch } from './arch';
import { invoke, on } from './bridge';
import { config, context, contextSnapshot } from './context';
import { fs, preview } from './files';
import { git } from './git';
import { log } from './log';
import { machines } from './machines';
import { overview } from './overview';
import { projects, recents } from './projects';
import { notice, sessions } from './sessions';
import { quickOpen, search, symbols } from './search';
import { shell } from './shell';
import {
  capture,
  drop,
  pathForFile,
  scroll,
  scrollback,
  term
} from './terminal';

/**
 * specstory surface (Phase 15) — the Settings section's status pull and the
 * two auth actions. Four calls, no event channel: signing in or out is a thing
 * the user does about twice a year, so there is nothing here to subscribe to.
 */
const specstory: InstalledGmuxApi['specstory'] = {
  status: (refresh) => invoke('specstory:status', refresh),
  beginLogin: () => invoke('specstory:beginLogin'),
  cancelLogin: () => invoke('specstory:cancelLogin'),
  submitCode: (code) => invoke('specstory:submitCode', code),
  signOut: () => invoke('specstory:signOut'),
  // The capture stream's one push: a session-end sync that failed, or a
  // capture that was requested at create and declined. Nothing is emitted
  // when capture is working.
  onNotice: (cb) => on(EVT_CAPTURE_NOTICE, cb)
};

const api: InstalledGmuxApi = {
  sessions,
  projects,
  recents,
  specstory,
  git,
  fs,
  term,
  drop,
  capture,
  scroll,
  search,
  context,
  config,
  symbols,
  quickOpen,
  scrollback,
  // Phase 68 optional extra: the Machines section in Settings. Ten calls and
  // one subscription. Two of them start a process, and both are a button a
  // person presses. Nothing here opens a session on a machine.
  machines,
  notice,
  preview,
  // Phase 137 extra: the Catch Me Up page's two reads. Both read agent logs
  // through main and write only Tortie's own overview store. The page
  // feature-detects the object, so a build without it says one sentence.
  overview,
  // Phase 63 optional extra, widened by Phase 158: the arch view's reads plus
  // the seed, enrich and accept asks. Main owns every write under docs/arch,
  // and enrich is the one method that can start an agent, refused in main
  // unless the person confirmed that agent in Settings. The view
  // feature-detects the object, so a build without it says one sentence
  // instead of breaking.
  arch,
  // Phase 46 optional extra: the SCM view's Runs section. Read only, and the
  // renderer feature-detects it, so a build without it simply has no section.
  actions,
  // Phase 35 optional extra: the log surface. Renderer error capture writes
  // over `append`, and the Settings Diagnostics section owns the other four.
  // Both renderers feature-detect it.
  log,
  // Phase 24 optional extra: the Settings row's one read. The update engine
  // and every dialog live in main. Phase 58 added the ring's four members on
  // the same object and the same typed bridge: the two failed-menu actions,
  // the one install action, and the push that animates the ring.
  updates: {
    state: () => invoke('updates:state'),
    restartNow: () => invoke('updates:restartNow'),
    whyFailed: () => invoke('updates:whyFailed'),
    repair: () => invoke('updates:repair'),
    onChanged: (cb) => on(EVT_UPDATES_CHANGED, cb)
  },
  pathForFile,
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
  // Phase 129 required extra, the sibling of the line above: the store tells
  // main where the project tabs just moved, so the View-menu radios cannot go
  // stale when the titlebar's own button (not the menu) is what moved them.
  setProjectsPosition: (position) => invoke('ui:projectsPosition', position),
  // Phase 8.2 optional extras: first-quit toast flow (DESIGN.md §4 ⌘Q).
  onQuitRequested: (cb) => on(EVT_QUIT_REQUESTED, cb),
  quit: () => invoke('app:quit'),
  // Phase 6 optional extras (top-level, feature-detected): login item.
  getLoginItem: () => invoke('app:getLoginItem'),
  setLoginItem: (openAtLogin) => invoke('app:setLoginItem', openAtLogin),
  // Native app-menu actions (top-level, feature-detected by the shell).
  onMenuAction: (cb) => on(EVT_MENU_ACTION, cb),
  // Phase 13 optional extras: per-session activity facts that are not the
  // status (⌘J excerpt, last-output time) now that detection lives in main,
  // plus the self-inflicted-input notice that clears needs_input.
  onActivityChanged: (cb) => on(EVT_ACTIVITY_CHANGED, cb),
  noteTerminalInput: (sessionId) => invoke('activity:noteInput', sessionId),
  // Phase 10 (S13) optional extras: persisted settings + Settings window +
  // per-agent launch-flag catalogs, feature-detected by both renderers.
  settingsGet: () => invoke('settings:get'),
  settingsSet: (patch) => invoke('settings:set', patch),
  openSettings: () => invoke('settings:openWindow'),
  agentFlagPresets: () => invoke('agents:flagPresets'),
  onSettingsChanged: (cb) => on(EVT_SETTINGS_CHANGED, cb),
  // Phase 19 item 11 optional extra: the machine woke up. The terminal clears
  // its WebGL glyph atlas on this, because a texture atlas does not survive
  // the GPU process losing its context across a sleep. Nothing else
  // subscribes, and nothing is sent at any other time.
  onPowerResume: (cb) => on(EVT_POWER_RESUME, cb),
  // Phase 22 optional extra: the launch context snapshot read (see
  // ./context for why the comparison happens in the renderer).
  contextSnapshot,
  // Phase 51 optional extras: the `tortie` shim row in Settings and the
  // pending-open pull. Four invokes, no arguments, no event channel.
  ...shell
};

contextBridge.exposeInMainWorld('gmux', api);
