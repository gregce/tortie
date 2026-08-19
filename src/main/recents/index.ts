/**
 * src/main/recents. The recent projects domain, and nothing else.
 *
 * Three channels, one broadcast and one menu item. The rules and the file are
 * in ./store.ts, which rows a person may see is in ./visible.ts, the native
 * `File > Open Recent` shape is in ./open-recent-menu.ts, and this file is
 * wiring. Register it from main boot alongside the other registrars:
 *
 *     import { registerRecentsIpc } from './recents';
 *     registerRecentsIpc(ipcMain);
 *
 * WHAT WRITES THE FILE. Three call sites, all in the projects handlers in
 * src/main/ipc.ts, all calling `rememberProject`. A project is remembered
 * when it is opened and again when it is closed. Main is the funnel every
 * route already goes through, which is the folder picker, a window drop, New
 * Project, Clone, Open Folder on a Machine… and the recents rows themselves, so
 * no route can be added later that forgets to record itself.
 *
 * PHASE 92: FORGETTING A MACHINE MOVES BOTH SURFACES AT ONCE. This registrar
 * subscribes to the machines file as well as to the recents file, and
 * re-broadcasts the visible list on either change. So removing a machine in
 * Settings takes its rows off a home screen that is already open, with no
 * relaunch, no polling and no new channel. The native menu already rebuilds on
 * the same machines change, in src/main/menu.ts.
 *
 * Ownership: src/main/recents/**.
 */

import type { IpcMain } from 'electron';
import { EVT_RECENTS_CHANGED } from '@shared/ipc';
import { broadcastEvent } from '../typed-events';
import { handle } from '../typed-ipc';
// Direct module import, NOT the ../machines barrel, for the reason
// src/main/menu.ts records at its own import: the barrel re-exports the whole
// remote layer and would pull the session feed into this registrar's graph.
import { onMachinesChanged } from '../machines/store';
import { missingRecents, onRecentsChanged, removeRecent } from './store';
import { visibleRecents } from './visible';

export {
  clearRecents,
  listRecents,
  missingRecents,
  onRecentsChanged,
  rememberProject,
  removeRecent,
  RECENTS_FILE_MAX
} from './store';

export {
  knownMachineIds,
  recentMachineLabel,
  visibleRecents
} from './visible';

export {
  OPEN_RECENT_MENU_MAX,
  openRecentActionId,
  openRecentMenuItem,
  type OpenRecentHandlers
} from './open-recent-menu';

/** True once the broadcast subscription exists, so a second call is a no-op. */
let broadcasting = false;

/**
 * Register the three `recents:*` channels and start broadcasting changes.
 * Call once during main-process boot.
 */
export function registerRecentsIpc(ipc: IpcMain): void {
  // Phase 92: the list a person may see, not the raw file. A row naming a
  // machine that has been forgotten is dropped here and in the native menu by
  // the same function, so the two surfaces cannot disagree.
  handle(ipc, 'recents:list', () => visibleRecents());
  handle(ipc, 'recents:missing', () => missingRecents());
  handle(ipc, 'recents:remove', (_e, path, machineId) => {
    removeRecent(path, machineId);
    return visibleRecents();
  });

  if (broadcasting) return;
  broadcasting = true;
  // Every write reaches every window. The home screen is the only reader
  // today, and it is on screen exactly when a close has just happened, so it
  // would otherwise be showing a list that is one row out of date.
  onRecentsChanged(() => {
    broadcastEvent(EVT_RECENTS_CHANGED, visibleRecents());
  });
  // Phase 92: the machines file decides which rows exist, so a change to it
  // changes the list even though the recents file did not move. Removing a
  // machine in Settings takes its rows off an open home screen at the moment
  // the person presses the button.
  onMachinesChanged(() => {
    broadcastEvent(EVT_RECENTS_CHANGED, visibleRecents());
  });
}
