/**
 * src/main/recents. The recent projects domain, and nothing else.
 *
 * Three channels, one broadcast and one menu item. The rules and the file are
 * in ./store.ts, the native `File > Open Recent` shape is in
 * ./open-recent-menu.ts, and this file is wiring. Register it from main boot
 * alongside the other registrars:
 *
 *     import { registerRecentsIpc } from './recents';
 *     registerRecentsIpc(ipcMain);
 *
 * WHAT WRITES THE FILE. Two call sites, both in the projects handlers in
 * src/main/ipc.ts, both calling `rememberProject`. A project is remembered
 * when it is opened and again when it is closed. Main is the funnel every
 * route already goes through, which is the folder picker, a window drop, New
 * Project, Clone and the recents rows themselves, so no route can be added
 * later that forgets to record itself.
 *
 * Ownership: src/main/recents/**.
 */

import type { IpcMain } from 'electron';
import { EVT_RECENTS_CHANGED } from '@shared/ipc';
import { broadcastEvent } from '../typed-events';
import { handle } from '../typed-ipc';
import { listRecents, missingRecents, onRecentsChanged, removeRecent } from './store';

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
  OPEN_RECENT_MENU_MAX,
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
  handle(ipc, 'recents:list', () => listRecents());
  handle(ipc, 'recents:missing', () => missingRecents());
  handle(ipc, 'recents:remove', (_e, path) => removeRecent(path));

  if (broadcasting) return;
  broadcasting = true;
  // Every write reaches every window. The home screen is the only reader
  // today, and it is on screen exactly when a close has just happened, so it
  // would otherwise be showing a list that is one row out of date.
  onRecentsChanged((recents) => {
    broadcastEvent(EVT_RECENTS_CHANGED, recents);
  });
}
