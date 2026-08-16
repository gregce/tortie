/**
 * The one `updates:*` registrar (Phase 24, extended in Phase 58).
 *
 * `updates:state` answers what is true right now: the running version, what
 * is staged, when the last check completed, and what the activity bar ring
 * should draw. The Settings window reads it when the section mounts; the
 * ring reads it once at mount and then follows the push below.
 *
 * Phase 58 added the ring's three actions and the one push:
 *
 *  - `updates:restartNow` calls the one existing quitAndInstall wrapper
 *    (installStagedUpdateNow, a no-op unless staged) and adds no relaunch
 *    logic of its own.
 *  - `updates:whyFailed` shows the fixed-copy failure dialog, because
 *    dialogs are owned by main.
 *  - `updates:repair` reuses the Phase 43 repair flow (offerUpdaterRepair).
 *  - `updates:changed` broadcasts the whole UpdateUiState whenever the ring
 *    state changes, throttled inside the engine, so a listener never has to
 *    follow up with a read.
 *
 * Every handler body is wrapped so it never rejects into the renderer;
 * failures go to logUpdateEvent. The update engine still lives in main and
 * never depends on a renderer being open: the ring is a mirror, not a part.
 */

import type { IpcMain } from 'electron';
import { EVT_UPDATES_CHANGED } from '@shared/ipc';
import { handle } from '../typed-ipc';
import { broadcastEvent } from '../typed-events';
import { logUpdateEvent } from './log';
import {
  getUpdateUiState,
  installStagedUpdateNow,
  onUpdateRingChanged
} from './updater';
import { explainRingFailure, offerUpdaterRepair } from './ui';

/** Run one handler body; a failure is a log line, never a rejection. */
async function neverRejects(
  what: string,
  body: () => void | Promise<void>
): Promise<void> {
  try {
    await body();
  } catch (err) {
    logUpdateEvent('warn', `${what} did not finish: ${(err as Error).message}`);
  }
}

export function registerUpdatesIpc(ipc: IpcMain): void {
  handle(ipc, 'updates:state', () => getUpdateUiState());

  handle(ipc, 'updates:restartNow', () =>
    neverRejects('restart and update now', () => {
      // The log records the choice before the app goes away, so the
      // rehearsal can assert where the install request came from.
      logUpdateEvent(
        'info',
        'restart and update now was chosen from the update ring'
      );
      installStagedUpdateNow();
    })
  );

  handle(ipc, 'updates:whyFailed', () =>
    neverRejects('the why it failed dialog', () => explainRingFailure())
  );

  handle(ipc, 'updates:repair', () =>
    neverRejects('the repair from the update ring', () => offerUpdaterRepair())
  );

  // The one push (Phase 58). The engine throttles progress ticks to at most
  // one per 250 ms and fires stage changes immediately; this side only
  // mirrors the current state to every window.
  onUpdateRingChanged(() => {
    broadcastEvent(EVT_UPDATES_CHANGED, getUpdateUiState());
  });
}
