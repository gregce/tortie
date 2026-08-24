/**
 * The ONE `overview:*` registrar (Phase 137), called once from main process
 * boot:
 *
 *     import { registerOverviewIpc } from './overview/ipc';
 *     registerOverviewIpc(ipcMain, async () => (await getGmuxCore()).manifest);
 *
 * Three channels, and all three READ. Each one lists the project's manifest rows
 * read only, opens the agent logs through the keep map, writes the redacted
 * slice into Tortie's own overview store, and answers from store rows.
 * No channel here spawns a process, writes the manifest, touches tmux or
 * sets a session's status. The third channel, `fold:options`, answers what
 * Settings offers for the fold, and building that list is a read of the agent
 * table and the confirm gate. Choosing a harness in Settings does not start
 * anything either: a fold runs only when a session finishes a turn.
 *
 * The store opens on the first call, at `<userData>/gmux/overview.db`, inside
 * the protected inner `gmux/` directory beside the manifest. It never opens
 * at registration, so a person who never presses the chord never pays for it.
 * The store is disposable with a stated cost. Deleting it loses turns whose
 * provider has since deleted them from disk.
 */

import { join } from 'node:path';
import { app } from 'electron';
import type { IpcMain } from 'electron';
import type { ManifestStore } from '../manifest';
import { handle } from '../typed-ipc';
import {
  projectOverview,
  sessionsOverview,
  type OverviewServiceDeps
} from './service';
import { foldOptions } from './fold';
import { openOverviewStore, type OverviewStore } from './store';

let store: OverviewStore | null = null;

/**
 * The one open of the overview store, lazy, shared by the three channels and
 * by the fold. Exported since Phase 138, because the fold reads and writes the
 * same file and a second open of one SQLite file is a second answer.
 */
export function overviewStore(): OverviewStore {
  if (store === null) {
    store = openOverviewStore(
      join(app.getPath('userData'), 'gmux', 'overview.db')
    );
  }
  return store;
}

/**
 * Registers the three channels exactly once. It takes a manifest getter
 * rather than a manifest, because the manifest is opened during boot and the
 * registrars are installed before that finishes.
 *
 * `suspended` is the fold scheduler's own sentence, handed in rather than
 * imported, because the scheduler is built by the session core and this
 * registrar must not reach into it.
 *
 * `foldChosen` is the person's choice, handed in for the same reason. The
 * project channel asks it before it draws any sentence a model wrote, so
 * picking None brings Phase 137's built line back on the next read. It
 * defaults to false, which is the shipped answer.
 */
export function registerOverviewIpc(
  ipc: IpcMain,
  getManifest: () => Promise<ManifestStore>,
  suspended: () => string | null = () => null,
  foldChosen: () => boolean = () => false
): void {
  const deps: OverviewServiceDeps = {
    manifest: getManifest,
    store: overviewStore,
    foldChosen
  };
  handle(ipc, 'overview:project', (_event, input) =>
    projectOverview(deps, input)
  );
  handle(ipc, 'overview:sessions', (_event, input) =>
    sessionsOverview(deps, input)
  );
  handle(ipc, 'fold:options', () => foldOptions({ suspended }));
}

/**
 * Closes the overview store. Safe before any open, and safe to call twice.
 * It never throws, because it runs inside the ordered disposer and a close
 * that fails on a quitting process leaves nothing to do.
 */
export function disposeOverviewIpc(): void {
  const open = store;
  store = null;
  if (open === null) return;
  try {
    open.close();
  } catch {
    // Nothing to do. The process is on its way out.
  }
}
